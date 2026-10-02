import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { sfx } from '../sfx';
import './solitaire.css';

export interface SolitaireOutcome {
  difficulty: 'easy' | 'normal' | 'hard';
  durationSec: number;
}

interface SolitaireGameProps {
  headerAction?: ReactNode;
  lang: 'zh' | 'en';
  playerName: string;
  onComplete: (outcome: SolitaireOutcome) => void;
}

type Diff = 'easy' | 'normal' | 'hard';
type Phase = 'ready' | 'playing' | 'paused' | 'over';
type Suit = 0 | 1 | 2 | 3; // 0 ♠ · 1 ♥ · 2 ♣ · 3 ♦（1、3 为红色）

const LEVELS: Record<Diff, { draw: 1 | 3; redeals: number; zh: string; en: string; noteZh: string; noteEn: string }> = {
  easy: { draw: 1, redeals: Number.POSITIVE_INFINITY, zh: '轻松', en: 'Breeze', noteZh: '每次翻 1 张', noteEn: 'Draw 1' },
  normal: { draw: 3, redeals: Number.POSITIVE_INFINITY, zh: '认真', en: 'Focus', noteZh: '每次翻 3 张', noteEn: 'Draw 3' },
  hard: { draw: 3, redeals: 3, zh: '高手', en: 'Master', noteZh: '每次翻 3 张 · 限重翻 3 轮', noteEn: 'Draw 3 · 3 redeals' },
};

const SUIT_GLYPH = ['♠', '♥', '♣', '♦'];
const SUIT_ZH = ['黑桃', '红心', '梅花', '方块'];
const SUIT_EN = ['spades', 'hearts', 'clubs', 'diamonds'];
const RANK_LABEL = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

interface PlayCard {
  id: number;
  suit: Suit;
  rank: number; // 1=A … 13=K
  up: boolean;
}

interface Layout {
  stock: PlayCard[];
  waste: PlayCard[];
  found: PlayCard[][]; // 基础堆按花色固定：0♠ 1♥ 2♣ 3♦
  tab: PlayCard[][]; // 7 列牌桌
}

interface Engine {
  diff: Diff;
  layout: Layout;
  moves: number;
  redeals: number; // 已重翻轮数（高手档封顶 3）
  started: boolean;
  over: boolean;
  won: boolean;
  activeMs: number;
  hintUsed: boolean;
}

function cardLabel(c: PlayCard, isZh: boolean) {
  return isZh ? `${SUIT_ZH[c.suit]}${RANK_LABEL[c.rank - 1]}` : `${RANK_LABEL[c.rank - 1]} of ${SUIT_EN[c.suit]}`;
}

function freshDeck(): PlayCard[] {
  const deck: PlayCard[] = [];
  let id = 0;
  for (let s = 0 as Suit; s <= 3; s = (s + 1) as Suit) {
    for (let r = 1; r <= 13; r++) deck.push({ id: id++, suit: s, rank: r, up: false });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const k = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[k]] = [deck[k], deck[i]];
  }
  return deck;
}

/** 经典 Klondike 发牌：第 i 列 i+1 张、末张亮面，其余 24 张进牌堆 */
function freshEngine(diff: Diff): Engine {
  const deck = freshDeck();
  const tab: PlayCard[][] = [];
  let cursor = 0;
  for (let p = 0; p < 7; p++) {
    const pile = deck.slice(cursor, cursor + p + 1);
    pile[pile.length - 1]!.up = true;
    tab.push(pile);
    cursor += p + 1;
  }
  return {
    diff,
    layout: { stock: deck.slice(cursor), waste: [], found: [[], [], [], []], tab },
    moves: 0,
    redeals: 0,
    started: false,
    over: false,
    won: false,
    activeMs: 0,
    hintUsed: false,
  };
}

const isRed = (c: PlayCard) => c.suit === 1 || c.suit === 3;

/** 单张牌能否收到基础堆：花色堆按序收 A→K */
function canFound(l: Layout, c: PlayCard): boolean {
  return l.found[c.suit]!.length === c.rank - 1;
}

/** 牌或牌序列的头一张能否落到某牌桌列 */
function canStackOnTab(l: Layout, head: PlayCard, p: number): boolean {
  const pile = l.tab[p]!;
  if (!pile.length) return head.rank === 13;
  const top = pile[pile.length - 1]!;
  return top.up && isRed(top) !== isRed(head) && top.rank === head.rank + 1;
}

/** 从牌桌某列的 idx 起是否是可整体移动的合法连续序列（亮面 + 降序 + 红黑相间） */
function canPickRun(pile: PlayCard[], idx: number): boolean {
  if (idx < 0 || idx >= pile.length || !pile[idx]!.up) return false;
  for (let i = idx; i < pile.length - 1; i++) {
    const a = pile[i]!;
    const b = pile[i + 1]!;
    if (!b.up || a.rank !== b.rank + 1 || isRed(a) === isRed(b)) return false;
  }
  return true;
}

function cloneCard(c: PlayCard): PlayCard { return { ...c }; }
function cloneLayout(l: Layout): Layout {
  return {
    stock: l.stock.map(cloneCard),
    waste: l.waste.map(cloneCard),
    found: l.found.map((p) => p.map(cloneCard)),
    tab: l.tab.map((p) => p.map(cloneCard)),
  };
}

interface Snapshot {
  layout: Layout;
  moves: number;
  redeals: number;
  over: boolean;
  won: boolean;
  hintUsed: boolean;
}

function buildSnapshot(e: Engine): Snapshot {
  return {
    layout: cloneLayout(e.layout),
    moves: e.moves,
    redeals: e.redeals,
    over: e.over,
    won: e.won,
    hintUsed: e.hintUsed,
  };
}

const foundTotal = (l: Layout) => l.found.reduce((n, p) => n + p.length, 0);

/** 找一步可走的提示：优先上基础堆 > 翻开暗牌 > 弃牌入列 > 其他移动 > 翻牌堆 */
function findHintMove(e: Engine): { src: string; dst: string } | null {
  const l = e.layout;
  for (let p = 0; p < 7; p++) {
    const pile = l.tab[p]!;
    const top = pile[pile.length - 1];
    if (top && top.up && canFound(l, top)) return { src: `t${p}`, dst: `f${top.suit}` };
  }
  const wTop = l.waste[l.waste.length - 1];
  if (wTop && canFound(l, wTop)) return { src: 'waste', dst: `f${wTop.suit}` };
  for (let sp = 0; sp < 7; sp++) {
    const pile = l.tab[sp]!;
    for (let idx = 0; idx < pile.length; idx++) {
      if (!canPickRun(pile, idx)) continue;
      const head = pile[idx]!;
      for (let dp = 0; dp < 7; dp++) {
        if (dp === sp || !canStackOnTab(l, head, dp)) continue;
        const uncovers = idx > 0 && !pile[idx - 1]!.up;
        const freesKing = idx === 0 && head.rank === 13 && l.tab[dp]!.length > 0;
        if (uncovers || freesKing) return { src: `t${sp}`, dst: `t${dp}` };
      }
    }
  }
  if (wTop) {
    for (let dp = 0; dp < 7; dp++) {
      if (canStackOnTab(l, wTop, dp)) return { src: 'waste', dst: `t${dp}` };
    }
  }
  for (let sp = 0; sp < 7; sp++) {
    const pile = l.tab[sp]!;
    for (let idx = 0; idx < pile.length; idx++) {
      if (!canPickRun(pile, idx)) continue;
      const head = pile[idx]!;
      for (let dp = 0; dp < 7; dp++) {
        if (dp !== sp && canStackOnTab(l, head, dp)) return { src: `t${sp}`, dst: `t${dp}` };
      }
    }
  }
  if (l.stock.length > 0 || (l.waste.length > 0 && e.redeals < LEVELS[e.diff].redeals)) return { src: 'stock', dst: 'stock' };
  return null;
}

const fmtClock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function SolitaireGame({ lang, playerName, onComplete, headerAction }: SolitaireGameProps) {
  const isZh = lang === 'zh';
  const sound = useStore((s) => s.sound);
  const [phase, setPhase] = useState<Phase>('ready');
  const [difficulty, setDifficulty] = useState<Diff>('easy');
  const [snap, setSnap] = useState<Snapshot>(() => buildSnapshot(freshEngine('easy')));
  const [elapsed, setElapsed] = useState(0);
  const [bests, setBests] = useState<Record<Diff, number | null>>({ easy: null, normal: null, hard: null });
  const [toast, setToast] = useState<string | null>(null);
  const [sel, setSel] = useState<{ zone: 'waste' | 'tab' | 'found'; pile: number; idx: number } | null>(null);
  const [hintFlash, setHintFlash] = useState<{ src: string; dst: string } | null>(null);
  const [autoRun, setAutoRun] = useState(false);
  const [lastResult, setLastResult] = useState<{ sec: number; moves: number; record: boolean } | null>(null);
  const engRef = useRef<Engine>(freshEngine('easy'));
  const historyRef = useRef<Snapshot[]>([]);
  const phaseRef = useRef<Phase>('ready');
  const hintTimer = useRef(0);
  phaseRef.current = phase;

  const level = LEVELS[difficulty];
  const collected = foundTotal(snap.layout);
  const progress = Math.min(100, (collected / 52) * 100);

  const publish = useCallback(() => setSnap(buildSnapshot(engRef.current)), []);

  const finish = useCallback(() => {
    const cur = engRef.current;
    cur.over = true;
    cur.won = true;
    const sec = Math.max(1, Math.round(cur.activeMs / 1000));
    const record = bests[cur.diff] == null || sec < (bests[cur.diff] as number);
    if (record) setBests((prev) => ({ ...prev, [cur.diff]: sec }));
    setLastResult({ sec, moves: cur.moves, record });
    phaseRef.current = 'over';
    setPhase('over');
    setAutoRun(false);
    sfx.solWin();
    onComplete({ difficulty: cur.diff, durationSec: sec });
    publish();
  }, [bests, onComplete, publish]);

  const pushHistory = useCallback(() => {
    historyRef.current.push(buildSnapshot(engRef.current));
    if (historyRef.current.length > 80) historyRef.current.shift();
  }, []);

  /** 把牌桌某列新露出的顶牌翻面（移动后调用） */
  const flipExposed = (l: Layout) => {
    for (const pile of l.tab) {
      const top = pile[pile.length - 1];
      if (top && !top.up) top.up = true;
    }
  };

  const drawStock = useCallback(() => {
    const cur = engRef.current;
    if (phaseRef.current !== 'playing' || cur.over) return;
    const l = cur.layout;
    setSel(null);
    if (l.stock.length > 0) {
      pushHistory();
      cur.started = true;
      const n = Math.min(LEVELS[cur.diff].draw, l.stock.length);
      for (let i = 0; i < n; i++) {
        const c = l.stock.pop()!;
        c.up = true;
        l.waste.push(c);
      }
      cur.moves += 1;
      sfx.solDraw();
      publish();
      return;
    }
    if (l.waste.length > 0) {
      if (cur.redeals >= LEVELS[cur.diff].redeals) {
        sfx.solBlocked();
        setToast(isZh ? '重翻次数用完啦，试试挪动牌桌上的牌' : 'No redeals left — try moving cards on the table');
        return;
      }
      pushHistory();
      cur.started = true;
      cur.redeals += 1;
      while (l.waste.length) {
        const c = l.waste.pop()!;
        c.up = false;
        l.stock.push(c);
      }
      cur.moves += 1;
      sfx.solRecycle();
      publish();
      return;
    }
    sfx.solBlocked();
  }, [isZh, publish, pushHistory]);

  /** 当前选中牌（单张或序列头）落到牌桌某列 */
  const moveSelectionToTab = useCallback(
    (p: number) => {
      const cur = engRef.current;
      if (phaseRef.current !== 'playing' || cur.over || !sel) return;
      const l = cur.layout;
      let seq: PlayCard[] = [];
      let ok = false;
      if (sel.zone === 'waste') {
        const top = l.waste[l.waste.length - 1];
        ok = !!top && sel.idx === l.waste.length - 1;
        if (ok) seq = [top!];
      } else if (sel.zone === 'tab') {
        const pile = l.tab[sel.pile]!;
        ok = canPickRun(pile, sel.idx);
        if (ok) seq = pile.slice(sel.idx);
      } else if (sel.zone === 'found') {
        const pile = l.found[sel.pile]!;
        const top = pile[pile.length - 1];
        ok = !!top && sel.idx === pile.length - 1;
        if (ok) seq = [top!];
      }
      if (!ok) {
        setSel(null);
        return;
      }
      const head = seq[0]!;
      if (!canStackOnTab(l, head, p)) {
        sfx.solBlocked();
        setToast(isZh ? '这里放不下：要接颜色相反、小 1 点的牌' : "Can't drop here: needs opposite color, one lower");
        return;
      }
      pushHistory();
      cur.started = true;
      if (sel.zone === 'waste') l.waste.pop();
      else if (sel.zone === 'tab') l.tab[sel.pile]!.splice(sel.idx);
      else l.found[sel.pile]!.pop();
      l.tab[p]!.push(...seq);
      flipExposed(l);
      cur.moves += 1;
      setSel(null);
      sfx.solMove();
      publish();
    },
    [isZh, publish, pushHistory, sel],
  );

  /** 单张牌（牌桌顶牌或弃牌堆顶）自动上基础堆 */
  const autoToFound = useCallback(
    (zone: 'waste' | 'tab' | 'found', pileIdx: number) => {
      const cur = engRef.current;
      if (phaseRef.current !== 'playing' || cur.over) return false;
      const l = cur.layout;
      let card: PlayCard | undefined;
      if (zone === 'waste') card = l.waste[l.waste.length - 1];
      else if (zone === 'tab') card = l.tab[pileIdx]![l.tab[pileIdx]!.length - 1];
      if (!card || !card.up) return false;
      if (!canFound(l, card)) return false;
      pushHistory();
      cur.started = true;
      if (zone === 'waste') l.waste.pop();
      else l.tab[pileIdx]!.pop();
      l.found[card.suit]!.push(card);
      flipExposed(l);
      cur.moves += 1;
      setSel(null);
      sfx.solFound(l.found[card.suit]!.length);
      publish();
      if (foundTotal(l) === 52) finish();
      return true;
    },
    [finish, publish, pushHistory],
  );

  const onTabCardClick = (p: number, idx: number) => {
    const cur = engRef.current;
    if (phaseRef.current !== 'playing' || cur.over) return;
    const pile = cur.layout.tab[p] ?? [];
    const card = pile[idx];
    if (!card || !card.up) return;
    if (sel && sel.zone === 'tab' && sel.pile === p && sel.idx === idx) {
      // 再点一次选中牌：顶牌直接试上基础堆，否则取消选中
      if (idx === pile.length - 1) {
        if (!autoToFound('tab', p)) {
          setSel(null);
          sfx.solSelect();
        }
      } else setSel(null);
      return;
    }
    if (sel) {
      // 已有选中：先尝试移动到本列，不行则改选这张
      const l = cur.layout;
      let head: PlayCard | null;
      let movable: boolean;
      if (sel.zone === 'waste') {
        const top = l.waste[l.waste.length - 1];
        movable = !!top && sel.idx === l.waste.length - 1;
        head = top ?? null;
      } else if (sel.zone === 'tab') {
        const src = l.tab[sel.pile]!;
        movable = canPickRun(src, sel.idx);
        head = movable ? src[sel.idx] ?? null : null;
      } else {
        const fp = l.found[sel.pile]!;
        const top = fp[fp.length - 1];
        movable = !!top;
        head = top ?? null;
      }
      if (movable && head && canStackOnTab(l, head, p)) {
        moveSelectionToTab(p);
        return;
      }
    }
    if (!canPickRun(pile, idx)) {
      sfx.solBlocked();
      setToast(isZh ? '从这张到列尾不是连着的序列' : 'These cards do not form a run');
      return;
    }
    setSel({ zone: 'tab', pile: p, idx });
    sfx.solSelect();
  };

  const onTabBaseClick = (p: number) => {
    if (sel) moveSelectionToTab(p);
  };

  const onWasteClick = () => {
    const cur = engRef.current;
    if (phaseRef.current !== 'playing' || cur.over) return;
    const topIdx = cur.layout.waste.length - 1;
    if (topIdx < 0) return;
    if (sel && sel.zone === 'waste') {
      if (!autoToFound('waste', 0)) setSel(null);
      return;
    }
    setSel({ zone: 'waste', pile: 0, idx: topIdx });
    sfx.solSelect();
  };

  const onFoundClick = (f: number) => {
    const cur = engRef.current;
    if (phaseRef.current !== 'playing' || cur.over) return;
    const l = cur.layout;
    // 已选中单张顶牌 / 弃牌堆顶：尝试收入本堆
    if (sel) {
      let card: PlayCard | null = null;
      if (sel.zone === 'waste') card = l.waste[l.waste.length - 1] ?? null;
      else if (sel.zone === 'tab') {
        const pile = l.tab[sel.pile]!;
        if (sel.idx === pile.length - 1) card = pile[pile.length - 1] ?? null;
      }
      if (card && card.up && canFound(l, card)) {
        const ok = card.suit === f && (sel.zone === 'waste' ? autoToFound('waste', 0) : autoToFound('tab', sel.pile));
        if (ok) return;
      }
      if (card && card.suit !== f) {
        sfx.solBlocked();
        setToast(isZh ? `${SUIT_ZH[f]}基础堆只收${SUIT_ZH[f]}，按 A→K 顺序` : `${SUIT_EN[f]} pile takes ${SUIT_EN[f]} only, A→K`);
        return;
      }
    }
    const fp = l.found[f]!;
    if (fp.length) {
      setSel({ zone: 'found', pile: f, idx: fp.length - 1 });
      sfx.solSelect();
    }
  };

  const onUndo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev || phaseRef.current !== 'playing') return;
    const cur = engRef.current;
    cur.layout = cloneLayout(prev.layout);
    cur.moves = prev.moves;
    cur.redeals = prev.redeals;
    cur.hintUsed = prev.hintUsed;
    setSel(null);
    setAutoRun(false);
    sfx.solUndo();
    publish();
  }, [publish]);

  const onHint = () => {
    const cur = engRef.current;
    if (phaseRef.current !== 'playing' || cur.over) return;
    if (cur.hintUsed) {
      setToast(isZh ? '本局的提示已经用过啦' : 'Hint already used this round');
      return;
    }
    const mv = findHintMove(cur);
    if (!mv) {
      setToast(isZh ? '这一局没有可行的移动了，重新开一局吧' : 'No moves left — start a new deal');
      return;
    }
    cur.hintUsed = true;
    sfx.solHint();
    setHintFlash(mv);
    setToast(mv.src === 'stock'
      ? (isZh ? '小提示：去翻一下牌堆' : 'Hint: flip the stock pile')
      : (isZh ? '小提示：把发光的牌挪到发光的位置' : 'Hint: move the glowing card to the glowing spot'));
    publish();
    window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHintFlash(null), 1900);
  };

  const togglePause = useCallback(() => {
    if (phaseRef.current === 'playing') {
      phaseRef.current = 'paused';
      setPhase('paused');
    } else if (phaseRef.current === 'paused') {
      phaseRef.current = 'playing';
      setPhase('playing');
    }
  }, []);

  const startGame = useCallback(
    (diff: Diff) => {
      engRef.current = freshEngine(diff);
      historyRef.current = [];
      window.clearTimeout(hintTimer.current);
      setDifficulty(diff);
      setLastResult(null);
      setToast(null);
      setSel(null);
      setHintFlash(null);
      setAutoRun(false);
      setElapsed(0);
      phaseRef.current = 'playing';
      setPhase('playing');
      publish();
    },
    [publish],
  );

  // 一键收牌：牌堆与弃牌堆已空且桌面全亮时，逐张自动上基础堆
  useEffect(() => {
    if (!autoRun || phase !== 'playing') return;
    const timer = window.setInterval(() => {
      const cur = engRef.current;
      if (cur.over) {
        setAutoRun(false);
        return;
      }
      const l = cur.layout;
      let moved = false;
      for (let p = 0; p < 7 && !moved; p++) {
        const top = l.tab[p]![l.tab[p]!.length - 1];
        if (top && top.up && canFound(l, top)) moved = autoToFound('tab', p);
      }
      if (!moved) setAutoRun(false);
    }, 260);
    return () => window.clearInterval(timer);
  }, [autoRun, autoToFound, phase]);

  // 计时：首次操作后每 250ms 累加（暂停时冻结）
  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = window.setInterval(() => {
      const cur = engRef.current;
      if (cur.started && !cur.over) {
        cur.activeMs += 250;
        setElapsed(cur.activeMs);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [phase]);

  // 键盘：Tab/方向键在牌堆间移动焦点，回车/空格等同点击，U 撤销，H 提示，P/Esc 暂停
  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
    };
    const onKeyDown = (ev: KeyboardEvent) => {
      if (isTyping(ev.target)) return;
      const ph = phaseRef.current;
      if (ph === 'ready' || ph === 'over') {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          startGame(difficulty);
        }
        return;
      }
      if (ev.key === 'p' || ev.key === 'P' || ev.key === 'Escape') {
        ev.preventDefault();
        togglePause();
        return;
      }
      if (ph !== 'playing') return;
      if (ev.key === 'u' || ev.key === 'U') {
        ev.preventDefault();
        onUndo();
        return;
      }
      if (ev.key === 'h' || ev.key === 'H') {
        ev.preventDefault();
        onHint();
        return;
      }
      if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight' && ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
      const active = document.activeElement as HTMLElement | null;
      const zoneEl = active?.closest?.('[data-zone]') as HTMLElement | null;
      if (!zoneEl) return;
      ev.preventDefault();
      const zone = zoneEl.getAttribute('data-zone') ?? '';
      const zones = ['stock', 'waste', 'f0', 'f1', 'f2', 'f3', 't0', 't1', 't2', 't3', 't4', 't5', 't6'];
      const curIdx = zones.indexOf(zone);
      const nextZone = (d: number) => {
        const n = Math.min(zones.length - 1, Math.max(0, curIdx + d));
        const z = zones[n]!;
        const target = document.querySelector(`[data-zone="${z}"] button:not(:disabled), [data-zone="${z}"] [tabindex]:not([tabindex="-1"])`) as HTMLElement | null;
        const btn = target ?? document.querySelector(`[data-zone="${z}"] button`) as HTMLElement | null;
        btn?.focus();
      };
      if (ev.key === 'ArrowLeft') nextZone(-1);
      else if (ev.key === 'ArrowRight') nextZone(1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [difficulty, onUndo, startGame, togglePause]);

  // 切到后台自动暂停
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && phaseRef.current === 'playing') togglePause();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [togglePause]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(
    () => () => {
      window.clearTimeout(hintTimer.current);
    },
    [],
  );

  // 「云阶夜曲」背景音乐：随游戏挂载/卸载启停，跟随全局声音开关
  useEffect(() => {
    if (!sound) return;
    sfx.solitaireBgmStart();
    return () => sfx.solitaireBgmStop();
  }, [sound]);

  const allFaceUp = snap.layout.tab.every((pile) => pile.every((c) => c.up));
  const autoReady = phase === 'playing' && !autoRun && snap.layout.stock.length === 0 && snap.layout.waste.length === 0 && allFaceUp && collected < 52;

  const phaseLabel =
    phase === 'playing' ? (isZh ? '进行中' : 'RUNNING') : phase === 'paused' ? (isZh ? '暂停' : 'PAUSED') : phase === 'over' ? (isZh ? '已完成' : 'ENDED') : isZh ? '待开始' : 'READY';
  const hint = phase === 'playing'
    ? (isZh ? '同花色按 A→K 收进上方基础堆；牌桌上红黑相间、大数压小数接力，四堆收满 52 张就赢！' : 'Build each suit A→K on the foundations. On the table stack opposite colors in descending order — collect all 52 to win!')
    : phase === 'paused'
      ? (isZh ? '先歇一歇，点「继续」再回来接龙。' : 'Take a break, press resume to keep building.')
      : phase === 'over'
        ? (isZh ? '太棒了！52 张星牌全部归位。' : 'Amazing! All 52 cards are home.')
        : (isZh ? '选好难度，点「开始游戏」发牌。' : 'Pick a level and press start to deal.');
  const bestSec = bests[difficulty];
  const stockLeft = snap.layout.stock.length;
  const redealsLeft = Number.isFinite(level.redeals) ? Math.max(0, level.redeals - snap.redeals) : null;

  // 牌桌列内每张牌的纵向位置（cqw）：亮牌露牌点 3.4，暗牌 1.7，超高压缩
  const tabTops = (pile: PlayCard[]) => {
    const offs: number[] = [0];
    let total = 0;
    for (let i = 0; i < pile.length - 1; i++) {
      total += pile[i]!.up ? 3.4 : 1.7;
      offs.push(total);
    }
    const factor = total > 56 ? 56 / total : 1;
    return offs.map((o) => o * factor);
  };

  const cardCls = (c: PlayCard, extra: string) => `sl-card${c.up ? ' up' : ''}${isRed(c) ? ' red' : ''} ${extra}`;
  const hintCls = (zone: string) => (hintFlash && (hintFlash.src === zone || hintFlash.dst === zone) ? ' sl-hinting' : '');
  const selOn = (zone: string) => {
    if (!sel) return false;
    if (sel.zone === 'waste' && zone === 'waste') return true;
    if (sel.zone === 'found' && zone === `f${sel.pile}`) return true;
    return false;
  };

  const cardAria = (c: PlayCard, where: string) => c.up
    ? `${cardLabel(c, isZh)}，${where}${hintFlash && (hintFlash.src === where || hintFlash.dst === where) ? (isZh ? '，提示高亮' : ', hinted') : ''}`
    : `${isZh ? '背面朝上的牌' : 'face-down card'}，${where}`;

  return (
    <section className="sl-cloud" aria-labelledby="sl-title">
      <header className="sl-heading">
        {headerAction ?? (<div className="sl-title-seal classic-art" aria-hidden="true" />)}
        <div>
          <span>{isZh ? '牌类 · 单人接龙' : 'CARDS · SOLITAIRE'}</span>
          <h2 id="sl-title">{isZh ? '云阶接龙' : 'Cloud Cascade'}</h2>
          <p>{isZh ? '把云阶上的星牌一张张接回四座星光宝座：同花色从 A 排到 K，四堆收满就胜利！' : 'Guide the cards up four star thrones — build each suit from A to K and collect all 52 to win!'}</p>
        </div>
        <div className="sl-session" aria-label={isZh ? '本次访问最快纪录' : 'Session best time'}>
          <span>{isZh ? `${level.zh}难度最快` : `${level.en} best`} <b>{bestSec != null ? fmtClock(bestSec * 1000) : '--'}</b></span>
        </div>
      </header>

      <div className="sl-table">
        <div className="sl-stage">
          <div className="sl-board-wrap">
            <div
              className="sl-board"
              role="group"
              aria-label={isZh
                ? `云阶接龙牌桌，已收 ${collected} / 52 张，牌堆剩 ${stockLeft} 张`
                : `Cloud Cascade table, ${collected} of 52 collected, ${stockLeft} in stock`}
            >
              <div className="sl-top">
                <div className="sl-stockzone" data-zone="stock">
                  <button
                    type="button"
                    className={`sl-slot sl-stock${hintCls('stock')}`}
                    onClick={drawStock}
                    aria-label={
                      stockLeft > 0
                        ? (isZh ? `翻牌堆，剩 ${stockLeft} 张，点击翻 ${LEVELS[difficulty].draw === 1 ? '一' : '三'}张` : `Stock, ${stockLeft} left`)
                        : snap.layout.waste.length > 0 && (redealsLeft == null || redealsLeft > 0)
                          ? (isZh ? '牌堆已空，点击把弃牌堆翻回牌堆' : 'Stock empty — tap to recycle waste')
                          : (isZh ? '牌堆已空' : 'Stock empty')
                    }
                  >
                    {stockLeft > 0 ? (
                      <>
                        <span className="sl-card back stock-top" aria-hidden="true"><i>✦</i></span>
                        <b className="sl-stock-count">{stockLeft}</b>
                      </>
                    ) : (
                      <span className="sl-recycle" aria-hidden="true">↻</span>
                    )}
                  </button>
                  {redealsLeft != null && <small className="sl-redeals">{isZh ? `可重翻 ${redealsLeft} 轮` : `${redealsLeft} redeals`}</small>}
                </div>

                <div className="sl-wastezone" data-zone="waste">
                  {snap.layout.waste.length === 0 ? (
                    <span className="sl-slot sl-empty" aria-hidden="true" />
                  ) : (
                    snap.layout.waste.slice(-3).map((c, k, arr) => {
                      const realIdx = snap.layout.waste.length - arr.length + k;
                      const isTop = realIdx === snap.layout.waste.length - 1;
                      return (
                        <span
                          key={c.id}
                          className={cardCls(c, `sl-waste-card w${k}${isTop && selOn('waste') ? ' sl-sel' : ''}${isTop ? hintCls('waste') : ''}`)}
                          style={{ left: `${k * 3.2}cqw` }}
                          aria-hidden={!isTop}
                        >
                          <b className="sl-corner">{RANK_LABEL[c.rank - 1]}<i>{SUIT_GLYPH[c.suit]}</i></b>
                          <em className="sl-pip">{SUIT_GLYPH[c.suit]}</em>
                          {isTop && (
                            <button
                              type="button"
                              className="sl-card-btn"
                              onClick={onWasteClick}
                              onDoubleClick={() => autoToFound('waste', 0)}
                              aria-label={`${cardAria(c, isZh ? '弃牌堆顶' : 'waste top')}${sel?.zone === 'waste' ? (isZh ? '，已选中' : ', selected') : ''}`}
                            />
                          )}
                        </span>
                      );
                    })
                  )}
                </div>

                <div className="sl-founds">
                  {snap.layout.found.map((pile, f) => (
                    <div className="sl-foundzone" data-zone={`f${f}`} key={f}>
                      <button
                        type="button"
                        className={`sl-slot sl-found${hintCls(`f${f}`)}${selOn(`f${f}`) ? ' sl-sel' : ''}`}
                        onClick={() => onFoundClick(f)}
                        aria-label={isZh
                          ? `${SUIT_ZH[f]}基础堆，已收 ${pile.length} 张${pile.length ? `，顶牌${RANK_LABEL[pile[pile.length - 1]!.rank - 1]}` : ''}`
                          : `${SUIT_EN[f]} foundation, ${pile.length} cards`}
                      >
                        <span className={`sl-found-ghost ${f === 1 || f === 3 ? 'red' : ''}`} aria-hidden="true">{SUIT_GLYPH[f]}</span>
                        {pile.length > 0 && (
                          <span className={cardCls(pile[pile.length - 1]!, 'sl-found-top')}>
                            <b className="sl-corner">{RANK_LABEL[pile[pile.length - 1]!.rank - 1]}<i>{SUIT_GLYPH[f]}</i></b>
                            <em className="sl-pip">{SUIT_GLYPH[f]}</em>
                          </span>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sl-tableau">
                {snap.layout.tab.map((pile, p) => {
                  const tops = tabTops(pile);
                  return (
                    <div className="sl-tabzone" data-zone={`t${p}`} key={p}>
                      <button
                        type="button"
                        className={`sl-slot sl-tabbase${hintCls(`t${p}`)}`}
                        onClick={() => onTabBaseClick(p)}
                        aria-label={isZh ? `牌桌第 ${p + 1} 列${pile.length ? '' : '，空位，只放 K'}` : `Tableau column ${p + 1}${pile.length ? '' : ', empty (K only)'}`}
                      />
                      {pile.map((c, i) => {
                        const zone = `t${p}`;
                        const seqSel = sel?.zone === 'tab' && sel.pile === p && i >= sel.idx;
                        return (
                          <span
                            key={c.id}
                            className={cardCls(c, `sl-tab-card${seqSel ? ' sl-sel' : ''}${c.up ? hintCls(zone) : ''}`)}
                            style={{ top: `${tops[i] ?? 0}cqw` }}
                          >
                            {c.up && (
                              <>
                                <b className="sl-corner">{RANK_LABEL[c.rank - 1]}<i>{SUIT_GLYPH[c.suit]}</i></b>
                                <em className="sl-pip">{SUIT_GLYPH[c.suit]}</em>
                              </>
                            )}
                            {!c.up && <i className="sl-back-mark" aria-hidden="true">✦</i>}
                            {c.up && (
                              <button
                                type="button"
                                className="sl-card-btn"
                                onClick={() => onTabCardClick(p, i)}
                                onDoubleClick={() => i === pile.length - 1 && autoToFound('tab', p)}
                                aria-label={`${cardAria(c, isZh ? `牌桌第 ${p + 1} 列` : `tableau column ${p + 1}`)}${seqSel ? (isZh ? '，已选中' : ', selected') : ''}`}
                              />
                            )}
                          </span>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {phase === 'ready' && (
                <div className="sl-overlay">
                  <b>{isZh ? '准备发牌' : 'Ready to deal'}</b>
                  <p>{isZh ? `${playerName}，经典单人纸牌接龙：把每种花色从 A 到 K 依次收进上方基础堆。牌桌上按红黑相间、从大到小接龙，K 可以放到空列。${level.noteZh}。` : `${playerName}, classic Klondike: build each suit A→K on the foundations. Stack opposite colors in descending order on the table; empty columns take only Kings. ${level.noteEn}.`}</p>
                  <button type="button" className="sl-overlay-btn" onClick={() => startGame(difficulty)}>
                    <span aria-hidden="true">🎴</span>{isZh ? '开始游戏' : 'Start'}
                  </button>
                  <small>{isZh ? '键盘：Tab/方向键移动 · 回车操作 · U 撤销 · H 提示 · P 暂停' : 'Keys: Tab/arrows move · Enter act · U undo · H hint · P pause'}</small>
                </div>
              )}
              {phase === 'paused' && (
                <div className="sl-overlay dim">
                  <b>{isZh ? '暂停中' : 'Paused'}</b>
                  <div className="sl-overlay-row">
                    <button type="button" className="sl-overlay-btn" onClick={togglePause}>{isZh ? '继续 (P)' : 'Resume'}</button>
                    <button type="button" className="sl-overlay-btn ghost" onClick={() => startGame(difficulty)}>{isZh ? '重新开局' : 'Restart'}</button>
                  </div>
                </div>
              )}
              {phase === 'over' && lastResult && (
                <div className="sl-overlay over">
                  <b>{isZh ? '接龙完成！' : 'Cascade complete!'}</b>
                  {lastResult.record && <em className="sl-record">{isZh ? '★ 最快新纪录！' : '★ New best time!'}</em>}
                  <div className="sl-final">
                    <span>{isZh ? '用时' : 'Time'}<b>{fmtClock(lastResult.sec * 1000)}</b></span>
                    <span>{isZh ? '步数' : 'Moves'}<b>{lastResult.moves}</b></span>
                    <span>{isZh ? '难度' : 'Level'}<b>{level[lang]}</b></span>
                  </div>
                  <button type="button" className="sl-overlay-btn" onClick={() => startGame(difficulty)}>
                    <span aria-hidden="true">↻</span>{isZh ? '再来一局' : 'Play again'}
                  </button>
                </div>
              )}
            </div>

            {toast && <div className="sl-toast" role="status">{toast}</div>}
          </div>

          <div className="sl-touchbar" aria-label={isZh ? '接龙操作' : 'Solitaire controls'}>
            <button type="button" onClick={() => drawStock()} disabled={phase !== 'playing'}>
              <span aria-hidden="true">🎴</span>{isZh ? (stockLeft > 0 ? '翻牌' : '重翻') : (stockLeft > 0 ? 'Draw' : 'Recycle')}
            </button>
            <button type="button" className="sl-hint-btn" onClick={onHint} disabled={phase !== 'playing' || snap.hintUsed} aria-label={isZh ? `接龙提示，本局${snap.hintUsed ? '已用完' : '还剩 1 次'}` : 'Solitaire hint, once per round'}>
              <span aria-hidden="true">✦</span>{isZh ? '接龙提示' : 'Hint'}
            </button>
            {autoReady && (
              <button type="button" className="sl-auto-btn" onClick={() => { setAutoRun(true); }} disabled={autoRun}>
                <span aria-hidden="true">✧</span>{isZh ? '一键收牌' : 'Auto-finish'}
              </button>
            )}
          </div>
        </div>

        <aside className="sl-console">
          <div className="sl-status-box" aria-live="polite">
            <small>{isZh ? `本局 · ${phaseLabel}` : `ROUND · ${phaseLabel}`}</small>
            <div className="sl-collect-row">
              <span>{isZh ? '已收星牌' : 'Collected'}</span>
              <b>{collected}<i>/52</i></b>
            </div>
            <div className="sl-stats" aria-label={isZh ? '本局数据' : 'Round stats'}>
              <span>{isZh ? '用时' : 'Time'} <b>{fmtClock(elapsed)}</b></span>
              <span>{isZh ? '步数' : 'Moves'} <b>{snap.moves}</b></span>
              <span>{isZh ? '牌堆' : 'Stock'} <b>{stockLeft}</b></span>
            </div>
            <div className="sl-progress" aria-hidden="true">
              <i style={{ width: `${progress}%` }} />
              <small>{isZh ? `再收 ${52 - collected} 张获胜` : `${52 - collected} to win`}</small>
            </div>
            <p>{hint}</p>
          </div>

          <div className="sl-difficulty">
            <span>{isZh ? '接龙难度' : 'DEAL STYLE'}</span>
            <div role="group" aria-label={isZh ? '选择难度' : 'Choose difficulty'}>
              {(Object.keys(LEVELS) as Diff[]).map((item) => (
                <button
                  type="button"
                  key={item}
                  className={difficulty === item ? 'active' : ''}
                  aria-pressed={difficulty === item}
                  disabled={phase === 'playing'}
                  aria-label={isZh
                    ? `${LEVELS[item].zh}：${LEVELS[item].noteZh}${phase === 'playing' ? '，进行中不可切换' : ''}`
                    : `${LEVELS[item].en}: ${LEVELS[item].noteEn}`}
                  onClick={() => {
                    if (phase === 'ready') setDifficulty(item);
                    else startGame(item);
                  }}
                >
                  <i aria-hidden="true" />{isZh ? LEVELS[item].zh : LEVELS[item].en}
                </button>
              ))}
            </div>
            <small>{isZh ? `轻松翻 1 张 · 认真翻 3 张 · 高手限重翻 3 轮；${phase === 'playing' ? '进行中不可切换' : '切换会重新发牌'}` : 'Draw 1 / Draw 3 / Draw 3 with 3 redeals'}</small>
          </div>

          <div className="sl-actions">
            {(phase === 'playing' || phase === 'paused') && (
              <button type="button" onClick={togglePause}>
                <span aria-hidden="true">{phase === 'playing' ? '⏸' : '▶'}</span>
                {phase === 'playing' ? (isZh ? '暂停 (P)' : 'Pause') : (isZh ? '继续 (P)' : 'Resume')}
              </button>
            )}
            <button type="button" onClick={onUndo} disabled={phase !== 'playing' || historyRef.current.length === 0}>
              <span aria-hidden="true">↶</span>{isZh ? '撤销 (U)' : 'Undo'}
            </button>
            <button type="button" className="sl-primary" onClick={() => startGame(difficulty)}>
              <span aria-hidden="true">↻</span>
              {phase === 'ready' ? (isZh ? '开始游戏' : 'Start') : phase === 'over' ? (isZh ? '再来一局' : 'Play again') : (isZh ? '重新开局' : 'Restart')}
            </button>
          </div>

          <div className="sl-rule-note">
            <span aria-hidden="true">♠♥♣♦</span>
            <p>{isZh ? '基础堆：同花色 A→K · 牌桌：红黑相间大压小 · 空位只收 K · 点两张牌完成移动 · 双击顶牌直接上堆' : 'Foundations: same suit A→K · Tableau: opposite colors descending · Kings on empty · Tap two cards to move · Double-tap tops to send home'}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
