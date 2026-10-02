import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { sfx } from '../sfx';
import './memory.css';

export interface MemoryOutcome {
  difficulty: 'easy' | 'normal' | 'hard';
  durationSec: number;
}

interface MemoryGameProps {
  headerAction?: ReactNode;
  lang: 'zh' | 'en';
  playerName: string;
  onComplete: (outcome: MemoryOutcome) => void;
}

type Diff = 'easy' | 'normal' | 'hard';
type Phase = 'ready' | 'playing' | 'paused' | 'over';

const LEVELS: Record<Diff, { cols: number; rows: number; zh: string; en: string }> = {
  easy: { cols: 4, rows: 4, zh: '轻松', en: 'Breeze' },
  normal: { cols: 6, rows: 4, zh: '认真', en: 'Focus' },
  hard: { cols: 6, rows: 6, zh: '高手', en: 'Master' },
};

// 图案池：按难度取前 N 种（轻松 8 / 认真 12 / 高手 18）
const ICONS: Array<{ glyph: string; zh: string; en: string }> = [
  { glyph: '🎈', zh: '气球', en: 'balloon' },
  { glyph: '🌙', zh: '月亮', en: 'moon' },
  { glyph: '🍭', zh: '棒棒糖', en: 'lollipop' },
  { glyph: '🐬', zh: '海豚', en: 'dolphin' },
  { glyph: '🌈', zh: '彩虹', en: 'rainbow' },
  { glyph: '🚀', zh: '火箭', en: 'rocket' },
  { glyph: '🍩', zh: '甜甜圈', en: 'donut' },
  { glyph: '⭐', zh: '星星', en: 'star' },
  { glyph: '🪐', zh: '星球', en: 'planet' },
  { glyph: '🎠', zh: '旋转木马', en: 'carousel' },
  { glyph: '🎡', zh: '摩天轮', en: 'ferris wheel' },
  { glyph: '🎯', zh: '飞镖', en: 'dart' },
  { glyph: '🎨', zh: '画板', en: 'palette' },
  { glyph: '🧩', zh: '拼图', en: 'puzzle' },
  { glyph: '🐳', zh: '鲸鱼', en: 'whale' },
  { glyph: '🍕', zh: '披萨', en: 'pizza' },
  { glyph: '🎸', zh: '吉他', en: 'guitar' },
  { glyph: '🏆', zh: '奖杯', en: 'trophy' },
];

const DOWN = 0; // 背面朝上
const UP = 1; // 已翻开（未配对）
const DONE = 2; // 已配对

interface Engine {
  diff: Diff;
  cols: number;
  rows: number;
  pairs: number;
  faces: number[]; // 格子 → 图案编号
  state: number[];
  opened: number[]; // 当前翻起未判定的格子（0/1/2 张）
  matched: number; // 已配对对数
  moves: number; // 翻开的组数（每两张算一组）
  combo: number; // 连续配对成功次数
  miss: number; // 失手次数
  hintUsed: boolean;
  started: boolean;
  over: boolean;
  activeMs: number;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const k = Math.floor(Math.random() * (i + 1));
    [out[i], out[k]] = [out[k], out[i]];
  }
  return out;
}

function freshEngine(diff: Diff): Engine {
  const { cols, rows } = LEVELS[diff];
  const pairs = (cols * rows) / 2;
  const faces = shuffle(Array.from({ length: pairs }, (_, i) => i).flatMap((i) => [i, i]));
  return {
    diff,
    cols,
    rows,
    pairs,
    faces,
    state: new Array<number>(cols * rows).fill(DOWN),
    opened: [],
    matched: 0,
    moves: 0,
    combo: 0,
    miss: 0,
    hintUsed: false,
    started: false,
    over: false,
    activeMs: 0,
  };
}

interface Snapshot {
  cells: number[];
  opened: number[];
  matched: number;
  moves: number;
  combo: number;
  miss: number;
  over: boolean;
  hintUsed: boolean;
}

function buildSnapshot(e: Engine): Snapshot {
  return {
    cells: [...e.state],
    opened: [...e.opened],
    matched: e.matched,
    moves: e.moves,
    combo: e.combo,
    miss: e.miss,
    over: e.over,
    hintUsed: e.hintUsed,
  };
}

/** 记忆提示：随机挑一对未配对的相同图案 */
function findHintPair(e: Engine): [number, number] | null {
  const groups = new Map<number, number[]>();
  for (let i = 0; i < e.state.length; i++) {
    if (e.state[i] !== DOWN) continue;
    const f = e.faces[i];
    groups.set(f, [...(groups.get(f) ?? []), i]);
  }
  const cands: Array<[number, number]> = [];
  groups.forEach((idx) => {
    if (idx.length === 2) cands.push([idx[0]!, idx[1]!]);
  });
  if (!cands.length) return null;
  return cands[Math.floor(Math.random() * cands.length)] ?? null;
}

const fmtClock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function MemoryGame({ lang, playerName, onComplete, headerAction }: MemoryGameProps) {
  const isZh = lang === 'zh';
  const sound = useStore((s) => s.sound);
  const [phase, setPhase] = useState<Phase>('ready');
  const [difficulty, setDifficulty] = useState<Diff>('normal');
  const [snap, setSnap] = useState<Snapshot>(() => buildSnapshot(freshEngine('normal')));
  const [elapsed, setElapsed] = useState(0);
  const [bests, setBests] = useState<Record<Diff, number | null>>({ easy: null, normal: null, hard: null });
  const [toast, setToast] = useState<string | null>(null);
  const [peek, setPeek] = useState<number[]>([]); // 提示短暂亮相的两张牌
  const [lastResult, setLastResult] = useState<{ sec: number; moves: number; record: boolean } | null>(null);
  const engRef = useRef<Engine>(freshEngine('normal'));
  const phaseRef = useRef<Phase>('ready');
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const lockTimer = useRef(0);
  const peekTimer = useRef(0);
  phaseRef.current = phase;

  const eng = engRef.current;
  const progress = Math.min(100, (snap.matched / eng.pairs) * 100);

  const publish = useCallback(() => setSnap(buildSnapshot(engRef.current)), []);

  const finish = useCallback(() => {
    const cur = engRef.current;
    cur.over = true;
    const sec = Math.max(1, Math.round(cur.activeMs / 1000));
    const record = bests[cur.diff] == null || cur.moves < (bests[cur.diff] as number);
    if (record) setBests((prev) => ({ ...prev, [cur.diff]: cur.moves }));
    setLastResult({ sec, moves: cur.moves, record });
    phaseRef.current = 'over';
    setPhase('over');
    sfx.memWin();
    onComplete({ difficulty: cur.diff, durationSec: sec });
    publish();
  }, [bests, onComplete, publish]);

  const flip = useCallback(
    (i: number) => {
      const cur = engRef.current;
      if (phaseRef.current !== 'playing' || cur.over) return;
      if (cur.state[i] !== DOWN || cur.opened.length >= 2) return;
      cur.started = true;
      cur.state[i] = UP;
      cur.opened.push(i);
      sfx.memFlip();
      if (cur.opened.length === 2) {
        const [a, b] = cur.opened as [number, number];
        cur.moves += 1;
        if (cur.faces[a] === cur.faces[b]) {
          cur.state[a] = DONE;
          cur.state[b] = DONE;
          cur.opened = [];
          cur.matched += 1;
          cur.combo += 1;
          sfx.memMatch(cur.combo);
          if (cur.matched >= cur.pairs) finish();
          else publish();
        } else {
          cur.combo = 0;
          cur.miss += 1;
          sfx.memMiss();
          publish();
          window.clearTimeout(lockTimer.current);
          lockTimer.current = window.setTimeout(() => {
            const c2 = engRef.current;
            c2.opened.forEach((j) => {
              if (c2.state[j] === UP) c2.state[j] = DOWN;
            });
            c2.opened = [];
            if (phaseRef.current === 'playing') publish();
          }, 820);
        }
      } else {
        publish();
      }
    },
    [finish, publish],
  );

  const onHint = () => {
    const cur = engRef.current;
    if (phaseRef.current !== 'playing' || cur.over) return;
    if (cur.hintUsed) {
      setToast(isZh ? '本局的提示已经用过啦' : 'Hint already used this round');
      return;
    }
    if (cur.opened.length > 0) {
      setToast(isZh ? '先把翻开的牌看完，我再帮你' : 'Wait for the open cards to settle first');
      return;
    }
    const pair = findHintPair(cur);
    if (!pair) {
      setToast(isZh ? '剩下的牌都亮过相了，加油！' : 'Every pair has been shown — go for it!');
      return;
    }
    cur.hintUsed = true;
    sfx.memHint();
    setPeek(pair);
    setToast(isZh ? '看好了：这两张是一对！' : 'Look closely: these two are a pair!');
    publish();
    window.clearTimeout(peekTimer.current);
    peekTimer.current = window.setTimeout(() => {
      setPeek([]);
    }, 1500);
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
      window.clearTimeout(lockTimer.current);
      window.clearTimeout(peekTimer.current);
      setDifficulty(diff);
      setLastResult(null);
      setToast(null);
      setPeek([]);
      setElapsed(0);
      phaseRef.current = 'playing';
      setPhase('playing');
      publish();
    },
    [publish],
  );

  // 计时：首次翻牌后每 250ms 累加（暂停时冻结）
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

  // 键盘：方向键移动焦点，空格/回车翻牌，H 提示，P/Esc 暂停
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
      if (ev.key === 'h' || ev.key === 'H') {
        ev.preventDefault();
        onHint();
        return;
      }
      const active = document.activeElement as HTMLElement | null;
      const cell = active?.closest?.('.mm-cell') as HTMLElement | null;
      const curIdx = cell ? Number(cell.getAttribute('data-i')) : 0;
      const cur2 = Number.isFinite(curIdx) ? curIdx : 0;
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
        case ' ': case 'Enter':
          ev.preventDefault();
          flip(cur2);
          break;
        default: break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [difficulty, flip, startGame, togglePause]);

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
      window.clearTimeout(lockTimer.current);
      window.clearTimeout(peekTimer.current);
    },
    [],
  );

  // 「星牌摇篮曲」背景音乐：随游戏挂载/卸载启停，跟随全局声音开关
  useEffect(() => {
    if (!sound) return;
    sfx.memoryBgmStart();
    return () => sfx.memoryBgmStop();
  }, [sound]);

  const peekSet = new Set(peek);

  const cellAria = (i: number) => {
    const cur = engRef.current;
    const pos = isZh ? `第${Math.floor(i / cur.cols) + 1}行第${(i % cur.cols) + 1}列` : `Row ${Math.floor(i / cur.cols) + 1}, column ${(i % cur.cols) + 1}`;
    const st = snap.cells[i];
    if (st === DONE) return `${pos}，${isZh ? `已配对，${ICONS[cur.faces[i]]?.zh}` : `matched, ${ICONS[cur.faces[i]]?.en}`}`;
    if (st === UP || peekSet.has(i)) return `${pos}，${isZh ? `已翻开，${ICONS[cur.faces[i]]?.zh}` : `open, ${ICONS[cur.faces[i]]?.en}`}`;
    return `${pos}，${isZh ? '背面朝上' : 'face down'}`;
  };

  const cellClass = (i: number) => {
    const st = snap.cells[i];
    let cls = 'mm-cell';
    if (st === DONE) cls += ' done';
    else if (st === UP || peekSet.has(i)) cls += ' up';
    if (peekSet.has(i) && st !== DONE) cls += ' peek';
    return cls;
  };

  const level = LEVELS[difficulty];
  const phaseLabel =
    phase === 'playing' ? (isZh ? '进行中' : 'RUNNING') : phase === 'paused' ? (isZh ? '暂停' : 'PAUSED') : phase === 'over' ? (isZh ? '已结束' : 'ENDED') : isZh ? '待开始' : 'READY';
  const hint = phase === 'playing'
    ? (isZh ? '翻开两张相同的星牌就能配对，全部配对完成就获胜！' : 'Flip two matching cards to pair them up — clear the whole sky to win!')
    : phase === 'paused'
      ? (isZh ? '先歇一歇，点「继续」再回来记牌。' : 'Take a break, press resume to keep going.')
      : phase === 'over'
        ? (isZh ? '好记性！所有星牌都找到伙伴啦。' : 'What a memory! Every card found its buddy.')
        : (isZh ? '选好棋盘大小，点「开始游戏」翻开第一张牌。' : 'Pick a board size and press start to flip the first card.');
  const bestMoves = bests[difficulty];

  return (
    <section className="mm-sky" aria-labelledby="mm-title">
      <header className="mm-heading">
        {headerAction ?? (<div className="mm-title-seal" aria-hidden="true"><i /><b>翻</b><i /></div>)}
        <div>
          <span>{isZh ? '牌类 · 星牌配对' : 'CARDS · MEMORY PAIRS'}</span>
          <h2 id="mm-title">{isZh ? '星牌记忆' : 'Star Card Memory'}</h2>
          <p>{isZh ? '云桌上扣着一排星牌：翻开两张一样的就能配成一对，考考你的小脑瓜记得住几张！' : 'Cards lie face down on the cloud table — flip two alike to pair them. How many can you remember?'}</p>
        </div>
        <div className="mm-session" aria-label={isZh ? '本次访问最少步数纪录' : 'Session fewest moves'}>
          <span>{isZh ? `${level.zh}棋盘最少` : `${level.en} best`} <b>{bestMoves != null ? `${bestMoves}${isZh ? ' 步' : ' moves'}` : '--'}</b></span>
        </div>
      </header>

      <div className="mm-table">
        <div className="mm-stage">
          <div className="mm-board-wrap">
            <div
              className="mm-board"
              role="group"
              aria-label={isZh
                ? `星牌记忆棋盘，${eng.cols} 列 ${eng.rows} 行，${eng.pairs} 对星牌，已配对 ${snap.matched} 对`
                : `Star Card Memory board, ${eng.cols} by ${eng.rows}, ${eng.pairs} pairs, ${snap.matched} matched`}
            >
              <div className="mm-grid" style={{ '--cols': eng.cols } as React.CSSProperties}>
                {snap.cells.map((_st, i) => (
                  <button
                    key={i}
                    ref={(el) => { cellRefs.current[i] = el; }}
                    type="button"
                    className={cellClass(i)}
                    data-i={i}
                    aria-label={cellAria(i)}
                    onClick={() => flip(i)}
                  >
                    <span className="mm-face mm-face-back" aria-hidden="true"><i>✦</i></span>
                    <span className="mm-face mm-face-front" aria-hidden="true">
                      <b
                        className="mm-symbol-art"
                        style={{
                          backgroundPosition: `${(engRef.current.faces[i]! % 6) * 20}% ${Math.floor(engRef.current.faces[i]! / 6) * 50}%`,
                        }}
                      />
                    </span>
                  </button>
                ))}
              </div>

              {phase === 'ready' && (
                <div className="mm-overlay">
                  <b>{isZh ? '准备翻牌' : 'Ready to flip'}</b>
                  <p>{isZh ? `${playerName}，云桌上扣着 ${eng.pairs} 对星牌。翻开两张一样的就配对成功，全部配对完成就获胜。每局还有一次「记忆提示」帮你亮一对！` : `${playerName}, ${eng.pairs} pairs lie face down. Flip two alike to match them; clear them all to win. One memory hint per round!`}</p>
                  <button type="button" className="mm-overlay-btn" onClick={() => startGame(difficulty)}>
                    <span aria-hidden="true">🎴</span>{isZh ? '开始游戏' : 'Start'}
                  </button>
                  <small>{isZh ? '键盘：方向键移动 · 空格翻牌 · H 提示 · P 暂停' : 'Keys: arrows move · Space flip · H hint · P pause'}</small>
                </div>
              )}
              {phase === 'paused' && (
                <div className="mm-overlay dim">
                  <b>{isZh ? '暂停中' : 'Paused'}</b>
                  <div className="mm-overlay-row">
                    <button type="button" className="mm-overlay-btn" onClick={togglePause}>{isZh ? '继续 (P)' : 'Resume'}</button>
                    <button type="button" className="mm-overlay-btn ghost" onClick={() => startGame(difficulty)}>{isZh ? '重新开局' : 'Restart'}</button>
                  </div>
                </div>
              )}
              {phase === 'over' && lastResult && (
                <div className="mm-overlay over">
                  <b>{isZh ? '全部配对！' : 'All paired!'}</b>
                  {lastResult.record && <em className="mm-record">{isZh ? '★ 最少步数新纪录！' : '★ New fewest-moves record!'}</em>}
                  <div className="mm-final">
                    <span>{isZh ? '用时' : 'Time'}<b>{fmtClock(lastResult.sec * 1000)}</b></span>
                    <span>{isZh ? '步数' : 'Moves'}<b>{lastResult.moves}</b></span>
                    <span>{isZh ? '难度' : 'Level'}<b>{level[lang]}</b></span>
                  </div>
                  <button type="button" className="mm-overlay-btn" onClick={() => startGame(difficulty)}>
                    <span aria-hidden="true">↻</span>{isZh ? '再来一局' : 'Play again'}
                  </button>
                </div>
              )}
            </div>

            {toast && <div className="mm-toast" role="status">{toast}</div>}
          </div>

          <div className="mm-touchbar" aria-label={isZh ? '翻牌操作' : 'Flip controls'}>
            <button
              type="button"
              className="mm-hint-btn"
              onClick={onHint}
              disabled={phase !== 'playing' || snap.hintUsed}
              aria-label={isZh ? `记忆提示，本局${snap.hintUsed ? '已用完' : '还剩 1 次'}` : 'Memory hint, once per round'}
            >
              <span aria-hidden="true">✦</span>{isZh ? '记忆提示' : 'Hint'}
            </button>
          </div>
        </div>

        <aside className="mm-console">
          <div className="mm-status-box" aria-live="polite">
            <small>{isZh ? `本局 · ${phaseLabel}` : `ROUND · ${phaseLabel}`}</small>
            <div className="mm-pair-row">
              <span>{isZh ? '已配对' : 'Pairs'}</span>
              <b>{snap.matched}/{eng.pairs}</b>
            </div>
            <div className="mm-stats" aria-label={isZh ? '本局数据' : 'Round stats'}>
              <span>{isZh ? '用时' : 'Time'} <b>{fmtClock(elapsed)}</b></span>
              <span>{isZh ? '步数' : 'Moves'} <b>{snap.moves}</b></span>
              <span>{isZh ? '连击' : 'Combo'} <b>×{snap.combo}</b></span>
            </div>
            <div className="mm-progress" aria-hidden="true">
              <i style={{ width: `${progress}%` }} />
              <small>{isZh ? `再配对 ${Math.max(0, eng.pairs - snap.matched)} 对获胜` : `${Math.max(0, eng.pairs - snap.matched)} pairs to win`}</small>
            </div>
            <p>{hint}</p>
          </div>

          <div className="mm-difficulty">
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
                    ? `${LEVELS[item].zh}棋盘 ${LEVELS[item].cols}×${LEVELS[item].rows}，${LEVELS[item].cols * LEVELS[item].rows / 2} 对${phase === 'playing' ? '，进行中不可切换' : ''}`
                    : `${LEVELS[item].en} board ${LEVELS[item].cols} by ${LEVELS[item].rows}, ${LEVELS[item].cols * LEVELS[item].rows / 2} pairs`}
                  onClick={() => {
                    if (phase === 'ready') setDifficulty(item);
                    else startGame(item);
                  }}
                >
                  <i aria-hidden="true" />{isZh ? LEVELS[item].zh : LEVELS[item].en}
                </button>
              ))}
            </div>
            <small>{isZh ? `轻松 4×4 · 认真 6×4 · 高手 6×6；${phase === 'playing' ? '进行中不可切换' : '切换会开启新一局'}` : '4×4 · 6×4 · 6×6 with 8 / 12 / 18 pairs'}</small>
          </div>

          <div className="mm-actions">
            {(phase === 'playing' || phase === 'paused') && (
              <button type="button" onClick={togglePause}>
                <span aria-hidden="true">{phase === 'playing' ? '⏸' : '▶'}</span>
                {phase === 'playing' ? (isZh ? '暂停 (P)' : 'Pause') : (isZh ? '继续 (P)' : 'Resume')}
              </button>
            )}
            <button type="button" className="mm-primary" onClick={() => startGame(difficulty)}>
              <span aria-hidden="true">↻</span>
              {phase === 'ready' ? (isZh ? '开始游戏' : 'Start') : phase === 'over' ? (isZh ? '再来一局' : 'Play again') : (isZh ? '重新开局' : 'Restart')}
            </button>
          </div>

          <div className="mm-rule-note">
            <span aria-hidden="true">🎴{eng.pairs}</span>
            <p>{isZh ? '一次翻两张 · 相同图案配成对 · 连续配对叠连击 · 每局一次记忆提示' : 'Flip two at a time · match alike glyphs · chain matches for combos · one hint per round'}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
