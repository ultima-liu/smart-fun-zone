import { useEffect, useMemo, useRef, useState } from 'react';
import './lianliankan.css';

type Difficulty = 'easy' | 'normal' | 'hard';

interface Tile { id: number; symbol: number }
interface Pt { r: number; c: number }

interface LianliankanGameProps {
  lang: 'zh' | 'en';
  playerName: string;
  onComplete: (result: 'win', durationSec: number, difficulty: Difficulty) => void;
}

const LEVELS: Record<Difficulty, { rows: number; cols: number; kinds: number }> = {
  easy: { rows: 5, cols: 6, kinds: 8 },
  normal: { rows: 6, cols: 8, kinds: 12 },
  hard: { rows: 7, cols: 10, kinds: 16 },
};

const difficultyText: Record<Difficulty, { zh: string; en: string }> = {
  easy: { zh: '轻松', en: 'Breeze' },
  normal: { zh: '认真', en: 'Focus' },
  hard: { zh: '高手', en: 'Master' },
};

const SYMBOL_META: ReadonlyArray<readonly [string, string, string]> = [
  ['🎈', '气球', 'Balloon'],
  ['☁️', '云朵', 'Cloud'],
  ['⭐', '星星', 'Star'],
  ['🌙', '月亮', 'Moon'],
  ['🌈', '彩虹', 'Rainbow'],
  ['🚀', '火箭', 'Rocket'],
  ['🛸', '飞碟', 'UFO'],
  ['🎠', '旋转木马', 'Carousel'],
  ['🎡', '摩天轮', 'Ferris wheel'],
  ['🎪', '马戏棚', 'Circus tent'],
  ['🍭', '棒棒糖', 'Lollipop'],
  ['🍩', '甜甜圈', 'Donut'],
  ['🍦', '冰淇淋', 'Ice cream'],
  ['🧸', '泰迪熊', 'Teddy bear'],
  ['🐬', '海豚', 'Dolphin'],
  ['🦋', '蝴蝶', 'Butterfly'],
  ['🐋', '鲸鱼', 'Whale'],
  ['💫', '流星', 'Shooting star'],
];

const DIRS: Array<readonly [number, number]> = [[0, 1], [0, -1], [1, 0], [-1, 0]];

let tileSeq = 0;

const toPt = (index: number, cols: number): Pt => ({ r: Math.floor(index / cols) + 1, c: (index % cols) + 1 });

function shuffle<T>(list: T[]): T[] {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

// 行列使用带一圈虚拟边界的坐标：r/c 取 0..rows+1 / 0..cols+1，边界格视为永远空闲，
// 让折线可以绕到棋盘外侧连接。
function isFree(board: (Tile | null)[], rows: number, cols: number, r: number, c: number): boolean {
  if (r === 0 || c === 0 || r === rows + 1 || c === cols + 1) return true;
  return board[(r - 1) * cols + (c - 1)] === null;
}

function lineClear(board: (Tile | null)[], rows: number, cols: number, from: Pt, to: Pt): boolean {
  if (from.r === to.r) {
    const [c1, c2] = from.c < to.c ? [from.c, to.c] : [to.c, from.c];
    for (let c = c1 + 1; c < c2; c++) if (!isFree(board, rows, cols, from.r, c)) return false;
    return true;
  }
  if (from.c === to.c) {
    const [r1, r2] = from.r < to.r ? [from.r, to.r] : [to.r, from.r];
    for (let r = r1 + 1; r < r2; r++) if (!isFree(board, rows, cols, r, from.c)) return false;
    return true;
  }
  return false;
}

export function findPath(board: (Tile | null)[], rows: number, cols: number, a: Pt, b: Pt): Pt[] | null {
  if ((a.r === b.r || a.c === b.c) && lineClear(board, rows, cols, a, b)) return [a, b];
  const corners: Pt[] = [{ r: a.r, c: b.c }, { r: b.r, c: a.c }];
  for (const corner of corners) {
    if (isFree(board, rows, cols, corner.r, corner.c)
      && lineClear(board, rows, cols, a, corner)
      && lineClear(board, rows, cols, corner, b)) {
      return [a, corner, b];
    }
  }
  for (const [dr, dc] of DIRS) {
    let r = a.r + dr;
    let c = a.c + dc;
    while (r >= 0 && r <= rows + 1 && c >= 0 && c <= cols + 1 && isFree(board, rows, cols, r, c)) {
      const mid: Pt = { r, c };
      if (mid.r === b.r || mid.c === b.c) {
        if (lineClear(board, rows, cols, mid, b)) return [a, mid, b];
      } else {
        const turns: Pt[] = [{ r: mid.r, c: b.c }, { r: b.r, c: mid.c }];
        for (const corner of turns) {
          if (isFree(board, rows, cols, corner.r, corner.c)
            && lineClear(board, rows, cols, mid, corner)
            && lineClear(board, rows, cols, corner, b)) {
            return [a, mid, corner, b];
          }
        }
      }
      r += dr;
      c += dc;
    }
  }
  return null;
}

export function findMove(board: (Tile | null)[], rows: number, cols: number): { a: number; b: number } | null {
  const bySymbol = new Map<number, number[]>();
  board.forEach((tile, index) => {
    if (!tile) return;
    const list = bySymbol.get(tile.symbol);
    if (list) list.push(index);
    else bySymbol.set(tile.symbol, [index]);
  });
  for (const cells of bySymbol.values()) {
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        if (findPath(board, rows, cols, toPt(cells[i], cols), toPt(cells[j], cols))) return { a: cells[i], b: cells[j] };
      }
    }
  }
  return null;
}

// 逆序摆牌：按“最后被消除的对最先放下”的顺序逐对放置，放置时就检查这一对
// 在当前障碍下可连，保证整盘至少存在一条完整消除顺序。
function buildLayout(rows: number, cols: number, pairSymbols: number[], allowed: number[] | null): (Tile | null)[] {
  const board: (Tile | null)[] = Array(rows * cols).fill(null);
  const freeCells = shuffle(allowed ?? Array.from({ length: rows * cols }, (_, i) => i));
  for (const symbol of pairSymbols) {
    let placedA = -1;
    let placedB = -1;
    for (let i = 0; i < freeCells.length && placedA < 0; i++) {
      for (let j = i + 1; j < freeCells.length; j++) {
        const a = freeCells[i];
        const b = freeCells[j];
        board[a] = { id: ++tileSeq, symbol };
        board[b] = { id: ++tileSeq, symbol };
        if (findPath(board, rows, cols, toPt(a, cols), toPt(b, cols))) {
          placedA = a;
          placedB = b;
          break;
        }
        board[a] = null;
        board[b] = null;
      }
    }
    if (placedA < 0 && freeCells.length >= 2) {
      placedA = freeCells[0];
      placedB = freeCells[1];
      board[placedA] = { id: ++tileSeq, symbol };
      board[placedB] = { id: ++tileSeq, symbol };
    }
    if (placedA < 0) continue;
    freeCells.splice(freeCells.indexOf(placedA), 1);
    freeCells.splice(freeCells.indexOf(placedB), 1);
  }
  return board;
}

function relayout(rows: number, cols: number, pairSymbols: number[], allowed: number[] | null): (Tile | null)[] {
  let fallback: (Tile | null)[] = Array(rows * cols).fill(null);
  for (let attempt = 0; attempt < 12; attempt++) {
    const board = buildLayout(rows, cols, pairSymbols, allowed);
    if (!pairSymbols.length || findMove(board, rows, cols)) return board;
    fallback = board;
  }
  return fallback;
}

function pairSymbolsFor(cfg: { rows: number; cols: number; kinds: number }): number[] {
  const pairs = (cfg.rows * cfg.cols) / 2;
  return shuffle(Array.from({ length: pairs }, (_, i) => i % cfg.kinds));
}

function pairSymbolsFrom(tiles: Tile[]): number[] {
  const counts = new Map<number, number>();
  tiles.forEach((tile) => counts.set(tile.symbol, (counts.get(tile.symbol) ?? 0) + 1));
  const list: number[] = [];
  counts.forEach((count, symbol) => {
    for (let i = 0; i < count / 2; i++) list.push(symbol);
  });
  return shuffle(list);
}

function reshuffleBoard(board: (Tile | null)[], rows: number, cols: number, skip: Set<number>): (Tile | null)[] {
  const cells: number[] = [];
  const tiles: Tile[] = [];
  board.forEach((tile, index) => {
    if (skip.has(index)) return;
    if (tile) {
      cells.push(index);
      tiles.push(tile);
    }
  });
  const next = relayout(rows, cols, pairSymbolsFrom(tiles), cells);
  // 正在播放消除动画的方块原位保留，它们各自的超时回调仍会按 id 移除自己
  skip.forEach((index) => {
    const tile = board[index];
    if (tile) next[index] = tile;
  });
  return next;
}

const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

export default function LianliankanGame({ lang, playerName, onComplete }: LianliankanGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const { rows, cols } = LEVELS[difficulty];
  const [board, setBoard] = useState<(Tile | null)[]>(() => {
    const cfg = LEVELS.normal;
    return relayout(cfg.rows, cfg.cols, pairSymbolsFor(cfg), null);
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [clearing, setClearing] = useState<Set<number>>(() => new Set());
  const [hintCells, setHintCells] = useState<number[]>([]);
  const [link, setLink] = useState<{ key: number; path: Pt[] } | null>(null);
  const [result, setResult] = useState<'win' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
  const [tools, setTools] = useState({ hint: 3, shuffle: 3 });
  const [score, setScore] = useState({ wins: 0, bestSec: 0 });
  const [now, setNow] = useState(() => Date.now());
  const [finalSec, setFinalSec] = useState<number | null>(null);
  const startedAtRef = useRef(Date.now());
  const comboAtRef = useRef(0);
  const linkKeyRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const boardRef = useRef(board);
  const clearingRef = useRef(clearing);
  const resultRef = useRef<'win' | null>(null);
  boardRef.current = board;

  const setClearingNow = (next: Set<number>) => {
    clearingRef.current = next;
    setClearing(next);
  };

  const isZh = lang === 'zh';
  const logicBoard = useMemo(
    () => board.map((tile, index) => (clearing.has(index) ? null : tile)),
    [board, clearing],
  );
  const pairsLeft = Math.max(0, (board.filter((tile) => tile !== null).length - clearing.size) / 2);
  const elapsed = finalSec ?? Math.floor((now - startedAtRef.current) / 1000);

  useEffect(() => {
    if (result) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [result]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!hintCells.length) return;
    const timer = window.setTimeout(() => setHintCells([]), 4200);
    return () => window.clearTimeout(timer);
  }, [hintCells]);

  useEffect(() => () => timersRef.current.forEach((id) => window.clearTimeout(id)), []);

  const settle = (next: (Tile | null)[]) => {
    if (resultRef.current) return;
    // 正在消除动画中的方块不计入存活（它们注定被移除），也不阻塞寻路
    const live = next.map((tile, index) => (clearingRef.current.has(index) ? null : tile));
    if (live.every((tile) => tile === null)) {
      const sec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
      resultRef.current = 'win';
      setFinalSec(sec);
      setResult('win');
      setScore((cur) => ({ wins: cur.wins + 1, bestSec: cur.bestSec === 0 ? sec : Math.min(cur.bestSec, sec) }));
      onComplete('win', sec, difficulty);
      return;
    }
    if (!findMove(live, rows, cols)) {
      const reshuffled = reshuffleBoard(next, rows, cols, clearingRef.current);
      boardRef.current = reshuffled;
      setBoard(reshuffled);
      setToast(isZh ? '☁️ 云朵飘了过来，棋子重新排好啦' : 'The clouds drifted by — tiles rearranged');
    }
  };

  const startRound = (next: Difficulty = difficulty) => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    const cfg = LEVELS[next];
    const fresh = relayout(cfg.rows, cfg.cols, pairSymbolsFor(cfg), null);
    boardRef.current = fresh;
    setBoard(fresh);
    setDifficulty(next);
    setSelected(null);
    setClearingNow(new Set());
    setHintCells([]);
    setLink(null);
    resultRef.current = null;
    setResult(null);
    setToast(null);
    setCombo(0);
    comboAtRef.current = 0;
    setTools({ hint: 3, shuffle: 3 });
    setFinalSec(null);
    startedAtRef.current = Date.now();
    setNow(Date.now());
  };

  const tapTile = (index: number) => {
    if (result) return;
    const tile = board[index];
    if (!tile || clearing.has(index)) return;
    if (selected === index) {
      setSelected(null);
      return;
    }
    if (selected === null) {
      setSelected(index);
      return;
    }
    const first = board[selected];
    if (!first || clearing.has(selected)) {
      setSelected(index);
      return;
    }
    if (first.symbol !== tile.symbol) {
      setSelected(index);
      return;
    }
    const path = findPath(logicBoard, rows, cols, toPt(selected, cols), toPt(index, cols));
    if (!path) {
      setSelected(index);
      return;
    }
    const a = selected;
    const b = index;
    const stamp = Date.now();
    setCombo(stamp - comboAtRef.current <= 7000 ? combo + 1 : 1);
    comboAtRef.current = stamp;
    setSelected(null);
    setHintCells([]);
    const clearingNext = new Set(clearingRef.current);
    clearingNext.add(a);
    clearingNext.add(b);
    setClearingNow(clearingNext);
    linkKeyRef.current += 1;
    setLink({ key: linkKeyRef.current, path });
    const idA = first.id;
    const idB = tile.id;
    const timer = window.setTimeout(() => {
      const current = [...boardRef.current];
      if (current[a]?.id === idA) current[a] = null;
      if (current[b]?.id === idB) current[b] = null;
      boardRef.current = current;
      setBoard(current);
      const clearingAfter = new Set(clearingRef.current);
      clearingAfter.delete(a);
      clearingAfter.delete(b);
      setClearingNow(clearingAfter);
      settle(current);
    }, 430);
    timersRef.current.push(timer);
  };

  const useHint = () => {
    if (result || tools.hint <= 0) return;
    const move = findMove(logicBoard, rows, cols);
    if (!move) return;
    setHintCells([move.a, move.b]);
    setTools((cur) => ({ ...cur, hint: cur.hint - 1 }));
  };

  const doShuffle = () => {
    if (result || tools.shuffle <= 0) return;
    const next = reshuffleBoard(boardRef.current, rows, cols, clearingRef.current);
    boardRef.current = next;
    setBoard(next);
    setSelected(null);
    setHintCells([]);
    setTools((cur) => ({ ...cur, shuffle: cur.shuffle - 1 }));
    setToast(isZh ? '☁️ 云朵翻了个身，棋盘重排啦' : 'The clouds rolled over — board reshuffled');
  };

  const padCols = cols + 2;
  const padRows = rows + 2;
  const linkPoints = link ? link.path.map((p) => `${p.c + 0.5},${p.r + 0.5}`).join(' ') : '';

  const statusTitle = result === 'win'
    ? (isZh ? '云径全部点亮，通关！' : 'All paths lit — cleared!')
    : (isZh ? `${playerName}，点亮一对云间图案` : `${playerName}, link a matching pair`);
  const statusBody = result === 'win'
    ? (isZh ? '整片云海都被你连完啦，要不要换个更大的棋盘？' : 'You cleared the whole sky. Try a bigger board?')
    : (isZh ? '轻点两块相同的图案，它们之间的折线不能超过两个弯。' : 'Tap two matching tiles — their path may bend at most twice.');

  return (
    <section className="lk-skytrail" aria-labelledby="lk-title">
      <header className="lk-heading">
        <div className="lk-title-seal" aria-hidden="true"><i /><b>连</b><i /></div>
        <div>
          <span>{isZh ? '云上配对 · 今日开放' : 'SKY PAIRS · NOW OPEN'}</span>
          <h2 id="lk-title">{isZh ? '云径连连看' : 'Cloud Path Match'}</h2>
          <p>{isZh ? '把相同的云间图案用不超过两个弯的折线连在一起，全清棋盘即通关。' : 'Link matching sky tiles with a path of at most two bends and clear the whole board.'}</p>
        </div>
        <div className="lk-session" aria-label={isZh ? '本次成绩' : 'Session best'}>
          <span>{isZh ? '通关' : 'Won'} <b>{score.wins}</b></span>
          <em aria-hidden="true">·</em>
          <span>{isZh ? '最快' : 'Best'} <b>{score.bestSec ? mmss(score.bestSec) : '--:--'}</b></span>
        </div>
      </header>

      <div className="lk-table">
        <div className="lk-board-wrap">
          <div className="lk-board-glow" aria-hidden="true" />
          <div
            className="lk-board"
            role="grid"
            aria-label={isZh ? `${rows} 行 ${cols} 列连连看棋盘` : `${rows} by ${cols} matching board`}
            style={{ aspectRatio: `${padCols} / ${padRows}` }}
          >
            <div
              className="lk-grid"
              style={{ gridTemplateColumns: `repeat(${padCols}, 1fr)`, gridTemplateRows: `repeat(${padRows}, 1fr)` }}
            >
              {Array.from({ length: padCols * padRows }, (_, pi) => {
                const r = Math.floor(pi / padCols);
                const c = pi % padCols;
                if (r === 0 || c === 0 || r === padRows - 1 || c === padCols - 1) {
                  return <span key={pi} className="lk-gap" aria-hidden="true" />;
                }
                const inner = (r - 1) * cols + (c - 1);
                const tile = board[inner];
                if (!tile) {
                  return (
                    <span
                      key={pi}
                      role="gridcell"
                      className="lk-slot"
                      aria-label={isZh ? `第 ${r} 行第 ${c} 列，空位` : `Row ${r}, column ${c}, empty`}
                    />
                  );
                }
                const label = isZh
                  ? `第 ${r} 行第 ${c} 列，${SYMBOL_META[tile.symbol][1]}${selected === inner ? '，已选中' : ''}`
                  : `Row ${r}, column ${c}, ${SYMBOL_META[tile.symbol][2]}${selected === inner ? ', selected' : ''}`;
                return (
                  <button
                    type="button"
                    role="gridcell"
                    key={pi}
                    className={`lk-tile${selected === inner ? ' selected' : ''}${hintCells.includes(inner) ? ' hint' : ''}${clearing.has(inner) ? ' matched' : ''}`}
                    aria-label={label}
                    aria-disabled={!!result}
                    onClick={() => tapTile(inner)}
                  >
                    <span className={`lk-face k${tile.symbol}`} aria-hidden="true">{SYMBOL_META[tile.symbol][0]}</span>
                  </button>
                );
              })}
            </div>
            <svg className="lk-link-layer" viewBox={`0 0 ${padCols} ${padRows}`} aria-hidden="true">
              <defs>
                <linearGradient id="lk-link-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#ffe9a8" />
                  <stop offset="1" stopColor="#8ff3ff" />
                </linearGradient>
              </defs>
              {link && (
                <g className="lk-link" key={link.key}>
                  <polyline className="lk-link-glow" points={linkPoints} pathLength={1} />
                  <polyline className="lk-link-core" points={linkPoints} pathLength={1} />
                  {link.path.slice(1, -1).map((p, i) => (
                    <circle key={i} className="lk-link-dot" cx={p.c + 0.5} cy={p.r + 0.5} r={0.15} />
                  ))}
                </g>
              )}
            </svg>
            {result === 'win' && (
              <div className="lk-result-ribbon" aria-hidden="true">
                <span>{isZh ? '通关' : 'CLEARED'}</span>
              </div>
            )}
          </div>
          {toast && <div className="lk-toast" role="status">{toast}</div>}
        </div>

        <aside className="lk-console">
          <div className={`lk-status-card${result === 'win' ? ' result-win' : ''}`} aria-live="polite">
            <span className="lk-status-orbit" aria-hidden="true"><i /><i /><i /></span>
            <small>{isZh ? '本局进度' : 'ROUND PROGRESS'}</small>
            <strong>{statusTitle}</strong>
            <div className="lk-stats" aria-label={isZh ? '本局数据' : 'Round stats'}>
              <span>{isZh ? `剩余 ${pairsLeft} 对` : `${pairsLeft} pairs left`}</span>
              <span>{isZh ? `用时 ${mmss(elapsed)}` : `Time ${mmss(elapsed)}`}</span>
              {combo >= 2 && <span className="hot">{isZh ? `连击 ×${combo}` : `Combo ×${combo}`}</span>}
            </div>
            <p>{statusBody}</p>
          </div>

          <div className="lk-difficulty">
            <span>{isZh ? '棋盘大小' : 'BOARD SIZE'}</span>
            <div role="group" aria-label={isZh ? '选择棋盘' : 'Choose board'}>
              {(Object.keys(difficultyText) as Difficulty[]).map((item) => (
                <button
                  type="button"
                  key={item}
                  className={difficulty === item ? 'active' : ''}
                  aria-pressed={difficulty === item}
                  onClick={() => startRound(item)}
                >
                  <i aria-hidden="true" />{difficultyText[item][lang]}
                </button>
              ))}
            </div>
            <small>{isZh ? '切换棋盘会开启新一局' : 'Changing size starts a new round'}</small>
          </div>

          <div className="lk-actions">
            <button type="button" className="lk-primary" onClick={() => startRound()}>
              <span aria-hidden="true">↻</span>{result ? (isZh ? '再来一局' : 'Play again') : (isZh ? '重新开局' : 'New round')}
            </button>
            <button type="button" onClick={useHint} disabled={!!result || tools.hint <= 0}>
              <span aria-hidden="true">✧</span>{isZh ? `提示 ×${tools.hint}` : `Hint ×${tools.hint}`}
            </button>
            <button type="button" onClick={doShuffle} disabled={!!result || tools.shuffle <= 0}>
              <span aria-hidden="true">☁</span>{isZh ? `重排 ×${tools.shuffle}` : `Shuffle ×${tools.shuffle}`}
            </button>
          </div>

          <div className="lk-rule-note">
            <span aria-hidden="true">≤2</span>
            <p>{isZh ? '同款图案 · 折线相连 · 最多两个弯' : 'Same picture · Linked line · Two bends max'}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
