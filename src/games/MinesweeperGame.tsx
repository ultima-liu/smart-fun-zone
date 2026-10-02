import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { sfx } from '../sfx';
import './minesweeper.css';

export interface MinesweeperOutcome {
  result: 'win' | 'lose';
  difficulty: 'easy' | 'normal' | 'hard';
  durationSec: number;
}

interface MinesweeperGameProps {
  headerAction?: ReactNode;
  lang: 'zh' | 'en';
  playerName: string;
  onComplete: (outcome: MinesweeperOutcome) => void;
}

type Diff = 'easy' | 'normal' | 'hard';
type Phase = 'ready' | 'playing' | 'paused' | 'over';
type Mode = 'dig' | 'flag';

const LEVELS: Record<Diff, { cols: number; rows: number; mines: number; zh: string; en: string }> = {
  easy: { cols: 8, rows: 8, mines: 8, zh: '轻松', en: 'Breeze' },
  normal: { cols: 10, rows: 10, mines: 14, zh: '认真', en: 'Focus' },
  hard: { cols: 12, rows: 12, mines: 22, zh: '高手', en: 'Master' },
};

const HIDDEN = 0;
const OPEN = 1;
const FLAG = 2;

interface Engine {
  diff: Diff;
  cols: number;
  rows: number;
  mines: number;
  mine: boolean[];
  adj: number[];
  state: number[];
  planted: boolean; // 首次翻格后才布雷（保证首格及周围安全）
  started: boolean; // 已翻开首格，开始计时
  opened: number;
  flags: number;
  over: boolean;
  won: boolean;
  boomAt: number;
  wrongFlags: number[]; // 结束时误插的旗（旗在非雷格）
  hintUsed: boolean;
  activeMs: number;
  wave: Record<number, number>; // 新翻开/亮相的格子 → 涟漪深度，供级联动画延迟
}

interface DigResult {
  boom: boolean;
  maxDepth: number;
  opened: number;
}

function freshEngine(diff: Diff): Engine {
  const { cols, rows, mines } = LEVELS[diff];
  const total = cols * rows;
  return {
    diff,
    cols,
    rows,
    mines,
    mine: new Array<boolean>(total).fill(false),
    adj: new Array<number>(total).fill(0),
    state: new Array<number>(total).fill(HIDDEN),
    planted: false,
    started: false,
    opened: 0,
    flags: 0,
    over: false,
    won: false,
    boomAt: -1,
    wrongFlags: [],
    hintUsed: false,
    activeMs: 0,
    wave: {},
  };
}

function neighbors(e: Engine, i: number): number[] {
  const x = i % e.cols;
  const y = Math.floor(i / e.cols);
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= e.cols || ny < 0 || ny >= e.rows) continue;
      out.push(ny * e.cols + nx);
    }
  }
  return out;
}

/** 布雷：首格及其周围八格不放雷；小盘兜底时只保护首格本身 */
function plantMines(e: Engine, safe: number) {
  const total = e.cols * e.rows;
  const forbidden = new Set<number>([safe, ...neighbors(e, safe)]);
  let pool: number[] = [];
  for (let i = 0; i < total; i++) if (!forbidden.has(i)) pool.push(i);
  if (pool.length < e.mines) pool = Array.from({ length: total }, (_, i) => i).filter((i) => i !== safe);
  for (let n = 0; n < e.mines && n < pool.length; n++) {
    const k = n + Math.floor(Math.random() * (pool.length - n));
    [pool[n], pool[k]] = [pool[k], pool[n]];
    e.mine[pool[n]] = true;
  }
  for (let i = 0; i < total; i++) e.adj[i] = neighbors(e, i).filter((j) => e.mine[j]).length;
  e.planted = true;
}

/** 翻开一格：安全格按 BFS 涟漪展开（空白格自动连开），雷格引爆 */
function digCells(e: Engine, start: number): DigResult {
  if (!e.planted) plantMines(e, start);
  e.started = true;
  if (e.mine[start]) {
    e.over = true;
    e.boomAt = start;
    e.wrongFlags = [];
    for (let i = 0; i < e.state.length; i++) {
      if (e.state[i] === FLAG && !e.mine[i]) e.wrongFlags.push(i);
    }
    // 所有雷以爆点为中心逐圈亮相
    const bx = start % e.cols;
    const by = Math.floor(start / e.cols);
    for (let i = 0; i < e.mine.length; i++) {
      if (!e.mine[i] || i === start) continue;
      const d = Math.max(Math.abs((i % e.cols) - bx), Math.abs(Math.floor(i / e.cols) - by));
      e.wave[i] = d;
    }
    return { boom: true, maxDepth: 0, opened: 0 };
  }
  const queue: Array<{ i: number; d: number }> = [{ i: start, d: 0 }];
  const queued = new Set<number>([start]);
  let maxDepth = 0;
  while (queue.length) {
    const step = queue.shift()!;
    const { i, d } = step;
    if (e.state[i] !== HIDDEN) continue;
    e.state[i] = OPEN;
    e.opened += 1;
    e.wave[i] = d;
    maxDepth = Math.max(maxDepth, d);
    if (e.adj[i] === 0) {
      for (const j of neighbors(e, i)) {
        if (!queued.has(j) && e.state[j] === HIDDEN) {
          queued.add(j);
          queue.push({ i: j, d: d + 1 });
        }
      }
    }
  }
  if (e.opened === e.cols * e.rows - e.mines) {
    e.over = true;
    e.won = true;
  }
  return { boom: false, maxDepth, opened: 1 };
}

/** 快开：点已翻开的数字，周围旗数足够时翻开其余邻居 */
function chordCells(e: Engine, i: number): DigResult | null {
  if (e.state[i] !== OPEN || e.adj[i] === 0) return null;
  const ns = neighbors(e, i);
  const flagged = ns.filter((j) => e.state[j] === FLAG).length;
  if (flagged !== e.adj[i]) return null;
  const merged: DigResult = { boom: false, maxDepth: 0, opened: 0 };
  for (const j of ns) {
    if (e.state[j] !== HIDDEN || merged.boom) continue;
    const r = digCells(e, j);
    merged.boom = merged.boom || r.boom;
    merged.maxDepth = Math.max(merged.maxDepth, r.maxDepth);
    merged.opened += r.opened;
  }
  return merged;
}

function toggleFlag(e: Engine, i: number): 'flag' | 'unflag' | 'none' {
  if (e.over || e.state[i] === OPEN) return 'none';
  if (e.state[i] === HIDDEN) {
    e.state[i] = FLAG;
    e.flags += 1;
    return 'flag';
  }
  e.state[i] = HIDDEN;
  e.flags -= 1;
  return 'unflag';
}

/** 排雷提示：随机为一颗未插旗的星雷补上旗子 */
function applyHint(e: Engine): number {
  if (!e.planted) return -1;
  const cands: number[] = [];
  for (let i = 0; i < e.mine.length; i++) if (e.mine[i] && e.state[i] === HIDDEN) cands.push(i);
  if (!cands.length) return -1;
  const pick = cands[Math.floor(Math.random() * cands.length)] ?? -1;
  if (pick < 0) return -1;
  e.state[pick] = FLAG;
  e.flags += 1;
  e.hintUsed = true;
  return pick;
}

interface Snapshot {
  cells: number[];
  flags: number;
  opened: number;
  over: boolean;
  won: boolean;
  boomAt: number;
  wrongFlags: number[];
  mineIdx: number[]; // 仅结束时填充
  wave: Record<number, number>;
  hintUsed: boolean;
}

function buildSnapshot(e: Engine): Snapshot {
  const mineIdx: number[] = [];
  if (e.over) {
    for (let i = 0; i < e.mine.length; i++) if (e.mine[i]) mineIdx.push(i);
  }
  return {
    cells: [...e.state],
    flags: e.flags,
    opened: e.opened,
    over: e.over,
    won: e.won,
    boomAt: e.boomAt,
    wrongFlags: [...e.wrongFlags],
    mineIdx,
    wave: e.wave,
    hintUsed: e.hintUsed,
  };
}

const fmtClock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function MinesweeperGame({ lang, playerName, onComplete, headerAction }: MinesweeperGameProps) {
  const isZh = lang === 'zh';
  const sound = useStore((s) => s.sound);
  const [phase, setPhase] = useState<Phase>('ready');
  const [difficulty, setDifficulty] = useState<Diff>('normal');
  const [mode, setMode] = useState<Mode>('dig');
  const [snap, setSnap] = useState<Snapshot>(() => buildSnapshot(freshEngine('normal')));
  const [elapsed, setElapsed] = useState(0);
  const [bests, setBests] = useState<Record<Diff, number | null>>({ easy: null, normal: null, hard: null });
  const [toast, setToast] = useState<string | null>(null);
  const [boardShake, setBoardShake] = useState(false);
  const [lastResult, setLastResult] = useState<{ won: boolean; sec: number; record: boolean } | null>(null);
  const engRef = useRef<Engine>(freshEngine('normal'));
  const phaseRef = useRef<Phase>('ready');
  const modeRef = useRef<Mode>('dig');
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const shakeTimer = useRef(0);
  phaseRef.current = phase;
  modeRef.current = mode;

  const eng = engRef.current;
  const total = eng.cols * eng.rows;
  const safeTotal = total - eng.mines;
  const progress = Math.min(100, (snap.opened / safeTotal) * 100);
  const remaining = Math.max(0, eng.mines - snap.flags);

  const publish = useCallback(() => setSnap(buildSnapshot(engRef.current)), []);

  const finish = useCallback(() => {
    const cur = engRef.current;
    const sec = Math.max(1, Math.round(cur.activeMs / 1000));
    const record = cur.won && (bests[cur.diff] == null || sec < (bests[cur.diff] as number));
    if (record) setBests((prev) => ({ ...prev, [cur.diff]: sec }));
    setLastResult({ won: cur.won, sec, record });
    phaseRef.current = 'over';
    setPhase('over');
    if (cur.won) {
      sfx.msWin();
    } else {
      sfx.msBoom();
      setBoardShake(true);
      window.clearTimeout(shakeTimer.current);
      shakeTimer.current = window.setTimeout(() => setBoardShake(false), 420);
    }
    onComplete({ result: cur.won ? 'win' : 'lose', difficulty: cur.diff, durationSec: sec });
    publish();
  }, [bests, onComplete, publish]);

  const doDig = useCallback(
    (i: number) => {
      const cur = engRef.current;
      if (phaseRef.current !== 'playing' || cur.over || cur.state[i] === FLAG) return;
      const r = cur.state[i] === OPEN ? chordCells(cur, i) : digCells(cur, i);
      if (!r) return;
      if (r.boom) {
        finish();
        return;
      }
      if (r.opened > 0) {
        // 涟漪音：按展开深度叠一声更亮的铃（至多 4 声）
        for (let d = 0; d <= Math.min(r.maxDepth, 3); d++) sfx.msOpen(d);
      }
      if (cur.over) finish();
      else publish();
    },
    [finish, publish],
  );

  const doFlag = useCallback(
    (i: number) => {
      const cur = engRef.current;
      if (phaseRef.current !== 'playing' || cur.over) return;
      const r = toggleFlag(cur, i);
      if (r === 'flag') sfx.msFlag();
      else if (r === 'unflag') sfx.msUnflag();
      if (r !== 'none') publish();
    },
    [publish],
  );

  const onCellClick = (i: number) => {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    if (modeRef.current === 'flag') doFlag(i);
    else doDig(i);
  };

  // 长按插旗（触屏）；松开或移出取消
  const onCellDown = (i: number) => {
    if (phaseRef.current !== 'playing') return;
    longPressed.current = false;
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      doFlag(i);
      if (navigator.vibrate) navigator.vibrate(28);
    }, 420);
  };
  const onCellUp = () => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };
  const onCellContext = (ev: React.MouseEvent, i: number) => {
    ev.preventDefault();
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    doFlag(i);
  };

  const onHint = () => {
    const cur = engRef.current;
    if (phaseRef.current !== 'playing' || cur.over) return;
    if (!cur.planted) {
      setToast(isZh ? '先翻开一格，我再帮你标雷' : 'Open one tile first, then ask me');
      return;
    }
    if (cur.hintUsed) {
      setToast(isZh ? '本局的提示已经用过啦' : 'Hint already used this round');
      return;
    }
    const at = applyHint(cur);
    if (at < 0) {
      setToast(isZh ? '剩下的星雷都已经插旗了' : 'Every mine is already flagged');
      return;
    }
    sfx.msHint();
    setToast(isZh ? '小提示：这一格埋着星雷 ⚑' : 'Hint: a mine hides under this tile ⚑');
    publish();
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
      window.clearTimeout(shakeTimer.current);
      setDifficulty(diff);
      setLastResult(null);
      setToast(null);
      setElapsed(0);
      setBoardShake(false);
      setMode('dig');
      phaseRef.current = 'playing';
      setPhase('playing');
      publish();
    },
    [publish],
  );

  // 计时：首格翻开后每 250ms 累加（暂停时冻结）
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

  // 键盘：方向键移动焦点，空格/回车按当前模式操作，F 插旗，P/Esc 暂停
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
      const active = document.activeElement as HTMLElement | null;
      const cell = active?.closest?.('.ms-cell') as HTMLElement | null;
      const cur = cell ? Number(cell.getAttribute('data-i')) : 0;
      const cur2 = Number.isFinite(cur) ? cur : 0;
      const cur3 = engRef.current;
      const move = (next: number) => {
        ev.preventDefault();
        if (next < 0 || next >= cur3.cols * cur3.rows) return;
        cellRefs.current[next]?.focus();
      };
      switch (ev.key) {
        case 'ArrowLeft': move(cur2 - 1); break;
        case 'ArrowRight': move(cur2 + 1); break;
        case 'ArrowUp': move(cur2 - cur3.cols); break;
        case 'ArrowDown': move(cur2 + cur3.cols); break;
        case 'f': case 'F': ev.preventDefault(); doFlag(cur2); break;
        case ' ': case 'Enter':
          ev.preventDefault();
          if (modeRef.current === 'flag') doFlag(cur2);
          else doDig(cur2);
          break;
        default: break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [difficulty, doDig, doFlag, startGame, togglePause]);

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
      if (pressTimer.current) window.clearTimeout(pressTimer.current);
      window.clearTimeout(shakeTimer.current);
    },
    [],
  );

  // 「星屿谜航」背景音乐：随游戏挂载/卸载启停，跟随全局声音开关
  useEffect(() => {
    if (!sound) return;
    sfx.minesBgmStart();
    return () => sfx.minesBgmStop();
  }, [sound]);

  const wrongSet = new Set(snap.wrongFlags);
  const mineSet = new Set(snap.mineIdx);

  const cellAria = (i: number) => {
    const cur = engRef.current;
    const pos = isZh ? `第${Math.floor(i / cur.cols) + 1}行第${(i % cur.cols) + 1}列` : `Row ${Math.floor(i / cur.cols) + 1}, column ${(i % cur.cols) + 1}`;
    const st = snap.cells[i];
    if (snap.over && snap.won && mineSet.has(i)) return `${pos}，${isZh ? '星雷，已插旗' : 'mine, flagged'}`;
    if (st === OPEN) {
      if (cur.adj[i] > 0) return `${pos}，${isZh ? `已翻开，周围 ${cur.adj[i]} 颗雷` : `open, ${cur.adj[i]} mines nearby`}`;
      return `${pos}，${isZh ? '已翻开，安全' : 'open, safe'}`;
    }
    if (st === FLAG) return `${pos}，${isZh ? '已插旗' : 'flagged'}`;
    if (snap.over && mineSet.has(i)) return `${pos}，${isZh ? '星雷' : 'mine'}`;
    return `${pos}，${isZh ? '未翻开' : 'hidden'}`;
  };

  const cellClass = (i: number) => {
    const st = snap.cells[i];
    let cls = 'ms-cell';
    if (st === OPEN) cls += ' open';
    else if (st === FLAG) cls += ' flag';
    if (snap.over && mineSet.has(i)) {
      cls += snap.won && st !== FLAG ? ' flag auto' : st !== FLAG ? ' mine' : '';
      if (snap.boomAt === i) cls += ' boom';
    }
    if (wrongSet.has(i)) cls += ' wrong';
    return cls;
  };

  const level = LEVELS[difficulty];
  const phaseLabel =
    phase === 'playing' ? (isZh ? '进行中' : 'RUNNING') : phase === 'paused' ? (isZh ? '暂停' : 'PAUSED') : phase === 'over' ? (isZh ? '已结束' : 'ENDED') : isZh ? '待开始' : 'READY';
  const hint = phase === 'playing'
    ? (isZh ? '数字告诉它周围一圈埋着几颗星雷，把所有安全格翻开就赢！' : 'Numbers count mines around — open every safe tile to win!')
    : phase === 'paused'
      ? (isZh ? '休息一下，点「继续」再回来排雷。' : 'Take a break, press resume to keep sweeping.')
      : phase === 'over'
        ? snap.won
          ? (isZh ? '漂亮！所有星雷都被你找出来了。' : 'Great job! Every mine found.')
          : (isZh ? '差一点点！看清数字再来一次吧。' : 'So close! Read the numbers and try again.')
        : (isZh ? '选好棋盘大小，点「开始游戏」。第一次翻格一定安全。' : 'Pick a board size and press start. The first tap is always safe.');
  const bestSec = bests[difficulty];

  return (
    <section className="ms-isles" aria-labelledby="ms-title">
      <header className="ms-heading">
        {headerAction ?? (<div className="ms-title-seal" aria-hidden="true"><i /><b>雷</b><i /></div>)}
        <div>
          <span>{isZh ? '益智 · 星屿排雷' : 'PUZZLE · MINE ISLES'}</span>
          <h2 id="ms-title">{isZh ? '星屿扫雷' : 'Star Isle Mines'}</h2>
          <p>{isZh ? '星屿下埋着淘气的星雷：数字会提示周围有几颗，翻开所有安全格、给雷插上旗子就能赢！' : 'Naughty mines hide under the isles. Numbers count them — open every safe tile and flag the rest to win!'}</p>
        </div>
        <div className="ms-session" aria-label={isZh ? '本次访问最快纪录' : 'Session best time'}>
          <span>{isZh ? `${level.zh}棋盘最快` : `${level.en} best`} <b>{bestSec != null ? fmtClock(bestSec * 1000) : '--'}</b></span>
        </div>
      </header>

      <div className="ms-table">
        <div className="ms-stage">
          <div className="ms-board-wrap">
            <div
              className={`ms-board${boardShake ? ' shake' : ''}`}
              role="group"
              aria-label={isZh
                ? `星屿扫雷棋盘，${eng.cols} 列 ${eng.rows} 行，${eng.mines} 颗星雷，已插旗 ${snap.flags}，剩余 ${remaining}`
                : `Star Isle Mines board, ${eng.cols} by ${eng.rows}, ${eng.mines} mines, ${snap.flags} flagged, ${remaining} left`}
            >
              <div className="ms-grid" style={{ '--cols': eng.cols } as React.CSSProperties}>
                {snap.cells.map((st, i) => {
                  const wd = snap.wave[i];
                  const adj = engRef.current.adj[i] ?? 0;
                  return (
                    <button
                      key={i}
                      ref={(el) => { cellRefs.current[i] = el; }}
                      type="button"
                      className={cellClass(i)}
                      data-i={i}
                      aria-label={cellAria(i)}
                      style={wd != null ? ({ '--wd': String(wd) } as React.CSSProperties) : undefined}
                      onClick={() => onCellClick(i)}
                      onContextMenu={(ev) => onCellContext(ev, i)}
                      onPointerDown={() => onCellDown(i)}
                      onPointerUp={onCellUp}
                      onPointerLeave={onCellUp}
                      onPointerCancel={onCellUp}
                    >
                      {st === OPEN && adj > 0 && <b className={`n${adj}`}>{adj}</b>}
                      {(st === FLAG || (snap.over && snap.won && mineSet.has(i))) && <i className="ms-sprite flag-art" aria-hidden="true" />}
                      {snap.over && !snap.won && mineSet.has(i) && st !== FLAG && (
                        <i className={`ms-sprite ${snap.boomAt === i ? 'boom-art' : 'mine-art'}`} aria-hidden="true" />
                      )}
                      {wrongSet.has(i) && <em aria-hidden="true">✕</em>}
                    </button>
                  );
                })}
              </div>

              {phase === 'ready' && (
                <div className="ms-overlay">
                  <b>{isZh ? '准备排雷' : 'Ready to sweep'}</b>
                  <p>{isZh ? `${playerName}，星屿间埋着 ${eng.mines} 颗星雷。翻开的数字是线索，右键或长按可以插旗。第一次翻格一定安全！` : `${playerName}, ${eng.mines} mines hide here. Numbers are clues; right-click or long-press to flag. Your first tap is always safe!`}</p>
                  <button type="button" className="ms-overlay-btn" onClick={() => startGame(difficulty)}>
                    <span aria-hidden="true">⛏</span>{isZh ? '开始游戏' : 'Start'}
                  </button>
                  <small>{isZh ? '键盘：方向键移动 · 空格挖开 · F 插旗 · P 暂停' : 'Keys: arrows move · Space dig · F flag · P pause'}</small>
                </div>
              )}
              {phase === 'paused' && (
                <div className="ms-overlay dim">
                  <b>{isZh ? '暂停中' : 'Paused'}</b>
                  <div className="ms-overlay-row">
                    <button type="button" className="ms-overlay-btn" onClick={togglePause}>{isZh ? '继续 (P)' : 'Resume'}</button>
                    <button type="button" className="ms-overlay-btn ghost" onClick={() => startGame(difficulty)}>{isZh ? '重新开局' : 'Restart'}</button>
                  </div>
                </div>
              )}
              {phase === 'over' && lastResult && (
                <div className="ms-overlay over">
                  <b>{lastResult.won ? (isZh ? '排雷成功！' : 'All clear!') : (isZh ? '踩到星雷了！' : 'Boom! Mine hit')}</b>
                  {lastResult.record && <em className="ms-record">{isZh ? '★ 最快新纪录！' : '★ New best time!'}</em>}
                  <div className="ms-final">
                    <span>{isZh ? '用时' : 'Time'}<b>{fmtClock(lastResult.sec * 1000)}</b></span>
                    <span>{isZh ? '翻开' : 'Opened'}<b>{snap.opened}/{safeTotal}</b></span>
                    <span>{isZh ? '难度' : 'Level'}<b>{level[lang]}</b></span>
                  </div>
                  <button type="button" className="ms-overlay-btn" onClick={() => startGame(difficulty)}>
                    <span aria-hidden="true">↻</span>{isZh ? '再来一局' : 'Play again'}
                  </button>
                </div>
              )}
            </div>

            {toast && <div className="ms-toast" role="status">{toast}</div>}
          </div>

          <div className="ms-touchbar" aria-label={isZh ? '排雷操作' : 'Sweep controls'}>
            <div className="ms-mode" role="group" aria-label={isZh ? '选择点击行为' : 'Choose tap action'}>
              <button
                type="button"
                className={mode === 'dig' ? 'active' : ''}
                aria-pressed={mode === 'dig'}
                aria-label={isZh ? '挖开模式：点击翻开格子' : 'Dig mode: tap to open tiles'}
                onClick={() => setMode('dig')}
              >
                <span aria-hidden="true">⛏</span>{isZh ? '挖开' : 'Dig'}
              </button>
              <button
                type="button"
                className={mode === 'flag' ? 'active' : ''}
                aria-pressed={mode === 'flag'}
                aria-label={isZh ? '插旗模式：点击放置或收起旗子' : 'Flag mode: tap to place or remove flags'}
                onClick={() => setMode('flag')}
              >
                <span aria-hidden="true">⚑</span>{isZh ? '插旗' : 'Flag'}
              </button>
            </div>
            <button
              type="button"
              className="ms-hint-btn"
              onClick={onHint}
              disabled={phase !== 'playing' || snap.hintUsed}
              aria-label={isZh ? `排雷提示，本局${snap.hintUsed ? '已用完' : '还剩 1 次'}` : 'Mine hint, once per round'}
            >
              <span aria-hidden="true">✦</span>{isZh ? '排雷提示' : 'Hint'}
            </button>
          </div>
        </div>

        <aside className="ms-console">
          <div className="ms-status-box" aria-live="polite">
            <small>{isZh ? `本局 · ${phaseLabel}` : `ROUND · ${phaseLabel}`}</small>
            <div className="ms-mine-row">
              <span>{isZh ? '剩余星雷' : 'Mines left'}</span>
              <b>{remaining}</b>
            </div>
            <div className="ms-stats" aria-label={isZh ? '本局数据' : 'Round stats'}>
              <span>{isZh ? '用时' : 'Time'} <b>{fmtClock(elapsed)}</b></span>
              <span>{isZh ? '翻开' : 'Opened'} <b>{snap.opened}/{safeTotal}</b></span>
              <span>{isZh ? '插旗' : 'Flags'} <b>{snap.flags}</b></span>
            </div>
            <div className="ms-progress" aria-hidden="true">
              <i style={{ width: `${progress}%` }} />
              <small>{isZh ? `再翻开 ${Math.max(0, safeTotal - snap.opened)} 格获胜` : `${Math.max(0, safeTotal - snap.opened)} tiles to win`}</small>
            </div>
            <p>{hint}</p>
          </div>

          <div className="ms-difficulty">
            <span>{isZh ? '棋盘大小' : 'BOARD SIZE'}</span>
            <div role="group" aria-label={isZh ? '选择棋盘大小' : 'Choose board size'}>
              {(Object.keys(LEVELS) as Diff[]).map((item) => (
                <button
                  type="button"
                  key={item}
                  className={difficulty === item ? 'active' : ''}
                  aria-pressed={difficulty === item}
                  disabled={phase === 'playing'}
                  aria-label={isZh
                    ? `${LEVELS[item].zh}棋盘 ${LEVELS[item].cols}×${LEVELS[item].rows}，${LEVELS[item].mines} 颗雷${phase === 'playing' ? '，进行中不可切换' : ''}`
                    : `${LEVELS[item].en} board ${LEVELS[item].cols} by ${LEVELS[item].rows}, ${LEVELS[item].mines} mines`}
                  onClick={() => {
                    if (phase === 'ready') setDifficulty(item);
                    else startGame(item);
                  }}
                >
                  <i aria-hidden="true" />{isZh ? LEVELS[item].zh : LEVELS[item].en}
                </button>
              ))}
            </div>
            <small>{isZh ? `轻松 8×8 · 认真 10×10 · 高手 12×12；${phase === 'playing' ? '进行中不可切换' : '切换会开启新一局'}` : '8×8 · 10×10 · 12×12 with 8 / 14 / 22 mines'}</small>
          </div>

          <div className="ms-actions">
            {(phase === 'playing' || phase === 'paused') && (
              <button type="button" onClick={togglePause}>
                <span aria-hidden="true">{phase === 'playing' ? '⏸' : '▶'}</span>
                {phase === 'playing' ? (isZh ? '暂停 (P)' : 'Pause') : (isZh ? '继续 (P)' : 'Resume')}
              </button>
            )}
            <button type="button" className="ms-primary" onClick={() => startGame(difficulty)}>
              <span aria-hidden="true">↻</span>
              {phase === 'ready' ? (isZh ? '开始游戏' : 'Start') : phase === 'over' ? (isZh ? '再来一局' : 'Play again') : (isZh ? '重新开局' : 'Restart')}
            </button>
          </div>

          <div className="ms-rule-note">
            <span aria-hidden="true">⚑{eng.mines}</span>
            <p>{isZh ? '数字 = 周围一圈的雷数 · 空白会自动连开 · 点已翻开的数字可快开 · 长按或右键插旗' : 'Numbers count nearby mines · blanks chain-open · tap a number to chord · long-press or right-click to flag'}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
