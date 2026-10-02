import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { sfx } from '../sfx';
import './tetris.css';

export interface TetrisOutcome {
  score: number;
  lines: number;
  maxLevel: number;
  difficulty: 'easy' | 'normal' | 'hard';
  durationSec: number;
}

interface TetrisGameProps {
  headerAction?: ReactNode;
  lang: 'zh' | 'en';
  playerName: string;
  onComplete: (outcome: TetrisOutcome) => void;
}

type Diff = 'easy' | 'normal' | 'hard';
type Phase = 'ready' | 'playing' | 'paused' | 'over';

const COLS = 10;
const ROWS = 20;
const LOCK_MS = 480;
const CLEAR_MS = 360;
const SOFT_MS = 45;
const MAX_LOCK_RESETS = 15;
const SPARK_COLORS = ['#ffe9a8', '#9df1ff', '#c9a8ff', '#ffffff'];

const DIFF_START: Record<Diff, number> = { easy: 1, normal: 3, hard: 5 };
const diffText: Record<Diff, { zh: string; en: string }> = {
  easy: { zh: '轻松', en: 'Breeze' },
  normal: { zh: '认真', en: 'Focus' },
  hard: { zh: '高手', en: 'Master' },
};

const LINE_SCORE = [0, 100, 300, 500, 800];
const gravMs = (level: number) => Math.max(50, Math.round(900 * Math.pow(0.85, level - 1)));

// 七种方块的基础格（rotation 0）；box 为旋转包围盒边长
const BASE: ReadonlyArray<{ box: number; cells: ReadonlyArray<readonly [number, number]> }> = [
  { box: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] }, // I 长条
  { box: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] }, // J 蓝折角
  { box: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] }, // L 橙折角
  { box: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] }, // O 方块
  { box: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] }, // S 绿折边
  { box: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] }, // T 紫丁字
  { box: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] }, // Z 红折边
];

const SHAPES = BASE.map(({ box, cells }) => {
  const rots: Array<Array<readonly [number, number]>> = [cells as Array<readonly [number, number]>];
  for (let r = 1; r < 4; r++) rots.push(rots[r - 1].map(([x, y]) => [box - 1 - y, x] as const));
  return rots;
});

// SRS 踢墙表（dy 已转换为屏幕坐标：向下为正）
const KICKS_JLSTZ: Record<string, ReadonlyArray<readonly [number, number]>> = {
  '0>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '1>0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '1>2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '2>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '2>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '3>2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '3>0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '0>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};
const KICKS_I: Record<string, ReadonlyArray<readonly [number, number]>> = {
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '1>0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  '2>1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '3>2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '0>3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
};

interface Piece { t: number; r: number; x: number; y: number }

interface Engine {
  board: number[]; // 0 空，1..7 = 方块种类 +1
  queue: number[];
  hold: number | null;
  holdUsed: boolean;
  piece: Piece | null;
  score: number;
  lines: number;
  level: number;
  startLevel: number;
  maxLevel: number;
  combo: number;
  diff: Diff;
  fallAcc: number;
  lockAcc: number;
  lockResets: number;
  grounded: boolean;
  softDrop: boolean;
  clearing: number[];
  clearAcc: number;
  activeMs: number;
  over: boolean;
}

type Ev =
  | { k: 'fx'; name: 'move' | 'rotate' | 'hold' | 'land' | 'hard' }
  | { k: 'fall' }
  | { k: 'clear'; rows: number[]; gained: number; combo: number; levelTo: number; levelFrom: number }
  | { k: 'spawn' }
  | { k: 'over' };

const at = (x: number, y: number) => y * COLS + x;

function collide(e: Engine, t: number, r: number, px: number, py: number): boolean {
  for (const [cx, cy] of SHAPES[t][r]) {
    const x = px + cx;
    const y = py + cy;
    if (x < 0 || x >= COLS || y >= ROWS) return true;
    if (y >= 0 && e.board[at(x, y)]) return true;
  }
  return false;
}

// 7-bag：每 7 块内七种方块各出现一次，手感公平不“卡块”
function refill(e: Engine) {
  while (e.queue.length < 8) {
    const bag = [0, 1, 2, 3, 4, 5, 6];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    e.queue.push(...bag);
  }
}

function spawnPiece(e: Engine, forced?: number): boolean {
  const type = forced ?? e.queue.shift();
  refill(e);
  if (type === undefined) return false;
  const x = BASE[type].box === 4 ? 3 : BASE[type].box === 2 ? 4 : 3;
  const y = type === 0 ? -1 : 0;
  if (collide(e, type, 0, x, y)) {
    e.piece = null;
    return false;
  }
  e.piece = { t: type, r: 0, x, y };
  e.fallAcc = 0;
  e.lockAcc = 0;
  e.lockResets = 0;
  e.grounded = false;
  e.softDrop = false;
  return true;
}

function tryMove(e: Engine, dx: number, dy: number): boolean {
  const p = e.piece;
  if (!p) return false;
  if (collide(e, p.t, p.r, p.x + dx, p.y + dy)) return false;
  p.x += dx;
  p.y += dy;
  // 触底后平移可刷新锁定缓冲（至多 MAX_LOCK_RESETS 次），方便从容微调
  if (dy === 0 && e.grounded && e.lockResets < MAX_LOCK_RESETS) {
    e.lockAcc = 0;
    e.lockResets += 1;
  }
  return true;
}

function tryRotate(e: Engine, dir: 1 | -1): boolean {
  const p = e.piece;
  if (!p) return false;
  if (p.t === 3) return true; // O 方块四向对称
  const to = (p.r + dir + 4) % 4;
  const table = p.t === 0 ? KICKS_I : KICKS_JLSTZ;
  for (const [dx, dy] of table[`${p.r}>${to}`]) {
    if (!collide(e, p.t, to, p.x + dx, p.y + dy)) {
      p.r = to;
      p.x += dx;
      p.y += dy;
      if (e.grounded && e.lockResets < MAX_LOCK_RESETS) {
        e.lockAcc = 0;
        e.lockResets += 1;
      }
      return true;
    }
  }
  return false;
}

function ghostY(e: Engine): number {
  const p = e.piece;
  if (!p) return -99;
  let y = p.y;
  while (!collide(e, p.t, p.r, p.x, y + 1)) y++;
  return y;
}

function lockNow(e: Engine): Ev {
  const p = e.piece!;
  let above = false;
  for (const [cx, cy] of SHAPES[p.t][p.r]) {
    const x = p.x + cx;
    const y = p.y + cy;
    if (y < 0) {
      above = true;
      continue;
    }
    e.board[at(x, y)] = p.t + 1;
  }
  e.piece = null;
  if (above) return { k: 'over' };
  const rows: number[] = [];
  for (let y = 0; y < ROWS; y++) {
    let full = true;
    for (let x = 0; x < COLS; x++) if (!e.board[at(x, y)]) { full = false; break; }
    if (full) rows.push(y);
  }
  if (rows.length) {
    e.combo += 1;
    const gained = LINE_SCORE[rows.length] * e.level + 50 * (e.combo - 1) * e.level;
    e.score += gained;
    e.lines += rows.length;
    e.clearing = rows;
    e.clearAcc = 0;
    const levelFrom = e.level;
    const levelTo = e.startLevel + Math.floor(e.lines / 10);
    if (levelTo > e.level) e.level = levelTo;
    e.maxLevel = Math.max(e.maxLevel, e.level);
    return { k: 'clear', rows, gained, combo: e.combo, levelTo: e.level, levelFrom };
  }
  e.combo = 0;
  return spawnPiece(e) ? { k: 'fx', name: 'land' } : { k: 'over' };
}

function finishClear(e: Engine): Ev | null {
  const keep: number[][] = [];
  for (let y = 0; y < ROWS; y++) {
    if (e.clearing.includes(y)) continue;
    keep.push(e.board.slice(at(0, y), at(0, y) + COLS));
  }
  while (keep.length < ROWS) keep.unshift(Array<number>(COLS).fill(0));
  e.board = keep.flat();
  e.clearing = [];
  return spawnPiece(e) ? { k: 'spawn' } : { k: 'over' };
}

function hardDrop(e: Engine): Ev {
  const p = e.piece!;
  let dist = 0;
  while (!collide(e, p.t, p.r, p.x, p.y + 1)) {
    p.y++;
    dist++;
  }
  e.score += dist * 2;
  const ev = lockNow(e);
  return ev.k === 'fx' ? { k: 'fx', name: 'hard' } : ev;
}

function doHold(e: Engine): Ev | null {
  if (!e.piece || e.holdUsed || e.clearing.length) return null;
  const cur = e.piece.t;
  const swap = e.hold;
  e.hold = cur;
  e.holdUsed = true;
  return spawnPiece(e, swap ?? undefined) ? { k: 'fx', name: 'hold' } : { k: 'over' };
}

function tick(e: Engine, dt: number): Ev | null {
  e.activeMs += dt;
  if (e.clearing.length) {
    e.clearAcc += dt;
    if (e.clearAcc >= CLEAR_MS) return finishClear(e);
    return null;
  }
  const p = e.piece;
  if (!p) return null;
  const step = e.softDrop ? Math.min(SOFT_MS, gravMs(e.level)) : gravMs(e.level);
  let moved = false;
  e.fallAcc += dt;
  while (e.fallAcc >= step && !collide(e, p.t, p.r, p.x, p.y + 1)) {
    p.y += 1;
    e.fallAcc -= step;
    moved = true;
    if (e.softDrop) e.score += 1;
  }
  if (collide(e, p.t, p.r, p.x, p.y + 1)) {
    if (!e.grounded) {
      e.grounded = true;
      e.lockAcc = 0;
    } else {
      e.lockAcc += dt;
      if (e.lockAcc >= LOCK_MS) return lockNow(e);
    }
  } else {
    e.grounded = false;
    e.lockAcc = 0;
  }
  return moved ? { k: 'fall' } : null;
}

function freshEngine(startLevel: number, diff: Diff): Engine {
  const e: Engine = {
    board: Array.from({ length: ROWS * COLS }, () => 0),
    queue: [],
    hold: null,
    holdUsed: false,
    piece: null,
    score: 0,
    lines: 0,
    level: startLevel,
    startLevel,
    maxLevel: startLevel,
    combo: 0,
    diff,
    fallAcc: 0,
    lockAcc: 0,
    lockResets: 0,
    grounded: false,
    softDrop: false,
    clearing: [],
    clearAcc: 0,
    activeMs: 0,
    over: false,
  };
  refill(e);
  return e;
}

interface Snapshot {
  cells: number[]; // 0 空；1..7 已锁定；10..16 虚影；20..26 当前方块
  clearing: number[];
  queue: number[];
  hold: number | null;
  holdUsed: boolean;
  score: number;
  lines: number;
  level: number;
  combo: number;
}

function buildSnapshot(e: Engine): Snapshot {
  const cells = [...e.board];
  const p = e.piece;
  if (p) {
    const gy = ghostY(e);
    if (gy !== p.y) {
      for (const [cx, cy] of SHAPES[p.t][p.r]) {
        const x = p.x + cx;
        const y = gy + cy;
        if (y >= 0 && y < ROWS && x >= 0 && x < COLS) cells[at(x, y)] = 10 + p.t;
      }
    }
    for (const [cx, cy] of SHAPES[p.t][p.r]) {
      const x = p.x + cx;
      const y = p.y + cy;
      if (y >= 0 && y < ROWS && x >= 0 && x < COLS) cells[at(x, y)] = 20 + p.t;
    }
  }
  return {
    cells,
    clearing: [...e.clearing],
    queue: e.queue.slice(0, 3),
    hold: e.hold,
    holdUsed: e.holdUsed,
    score: e.score,
    lines: e.lines,
    level: e.level,
    combo: e.combo,
  };
}

function MiniPiece({ t, dim }: { t: number; dim?: boolean }) {
  const cells = SHAPES[t][0];
  const xs = cells.map((c) => c[0]);
  const ys = cells.map((c) => c[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX + 1;
  const h = Math.max(...ys) - minY + 1;
  return (
    <div
      className={`tb-mini${dim ? ' dim' : ''}`}
      style={{ gridTemplateColumns: `repeat(${w}, 13px)`, gridTemplateRows: `repeat(${h}, 13px)` }}
      aria-hidden="true"
    >
      {cells.map(([cx, cy], i) => (
        <i key={i} className={`tb-mc m${t}`} style={{ gridColumn: cx - minX + 1, gridRow: cy - minY + 1 }} />
      ))}
    </div>
  );
}

export default function TetrisGame({ lang, playerName, onComplete, headerAction }: TetrisGameProps) {
  const isZh = lang === 'zh';
  const sound = useStore((s) => s.sound);
  const [phase, setPhase] = useState<Phase>('ready');
  const [difficulty, setDifficulty] = useState<Diff>('normal');
  const [snap, setSnap] = useState<Snapshot>(() => buildSnapshot(freshEngine(DIFF_START.normal, 'normal')));
  const [best, setBest] = useState({ score: 0, lines: 0 });
  const [toast, setToast] = useState<string | null>(null);
  const [floats, setFloats] = useState<Array<{ id: number; text: string; top: number; big: boolean }>>([]);
  const [sparks, setSparks] = useState<Array<{ id: number; x: number; y: number; dx: number; dy: number; color: string }>>([]);
  const [boardShake, setBoardShake] = useState(false);
  const [lastResult, setLastResult] = useState<{ score: number; lines: number; level: number; record: boolean } | null>(null);
  const engRef = useRef<Engine>(freshEngine(DIFF_START.normal, 'normal'));
  const phaseRef = useRef<Phase>('ready');
  const handleRef = useRef<(ev: Ev | null) => void>(() => {});
  const floatSeq = useRef(0);
  const floatTimers = useRef<number[]>([]);
  const repeatRef = useRef<{ dir: number; timer: number } | null>(null);
  phaseRef.current = phase;

  const publish = useCallback(() => setSnap(buildSnapshot(engRef.current)), []);

  const gameOver = useCallback(() => {
    const e = engRef.current;
    if (e.over) return;
    e.over = true;
    e.softDrop = false;
    const sec = Math.max(1, Math.round(e.activeMs / 1000));
    const record = e.score > 0 && e.score >= best.score;
    setLastResult({ score: e.score, lines: e.lines, level: e.maxLevel, record });
    setBest((cur) => ({ score: Math.max(cur.score, e.score), lines: Math.max(cur.lines, e.lines) }));
    phaseRef.current = 'over';
    setPhase('over');
    sfx.blkOver();
    onComplete({ score: e.score, lines: e.lines, maxLevel: e.maxLevel, difficulty: e.diff, durationSec: sec });
    publish();
  }, [best.score, onComplete, publish]);

  const handleEvent = (ev: Ev | null) => {
    if (!ev) return;
    switch (ev.k) {
      case 'fx':
        if (ev.name === 'move') sfx.blkMove();
        else if (ev.name === 'rotate') sfx.blkRotate();
        else if (ev.name === 'hold') sfx.blkHold();
        else if (ev.name === 'land') sfx.blkLand();
        else sfx.blkHard();
        break;
      case 'clear': {
        sfx.blkClear(ev.rows.length, ev.combo);
        const midRow = (ev.rows[0] + ev.rows[ev.rows.length - 1] + 1) / 2;
        const big = ev.rows.length >= 3 || ev.combo >= 3;
        const float = { id: ++floatSeq.current, text: `+${ev.gained}`, top: midRow / ROWS, big };
        setFloats((cur) => [...cur.slice(-2), float]);
        floatTimers.current.push(window.setTimeout(() => {
          setFloats((cur) => cur.filter((f) => f.id !== float.id));
        }, 900));
        // 消行碎星：沿每条被消的行迸出彩色光点
        const burst: typeof sparks = [];
        ev.rows.forEach((row) => {
          for (let i = 0; i < 7; i++) {
            burst.push({
              id: ++floatSeq.current,
              x: 6 + Math.random() * 88,
              y: (row + 0.5) / ROWS * 100,
              dx: Math.round(-70 + Math.random() * 140),
              dy: Math.round(-80 + Math.random() * 70),
              color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
            });
          }
        });
        setSparks((cur) => [...cur.slice(-48), ...burst]);
        floatTimers.current.push(window.setTimeout(() => {
          setSparks((cur) => cur.filter((s) => !burst.some((b) => b.id === s.id)));
        }, 800));
        if (ev.rows.length >= 2) {
          setBoardShake(true);
          floatTimers.current.push(window.setTimeout(() => setBoardShake(false), 340));
        }
        const names = isZh ? ['', '消除 1 行', '双消！', '三消！！', '四消！！！'] : ['', 'Single', 'Double!', 'Triple!!', 'TETRIS!!!'];
        const comboTxt = ev.combo >= 2 ? (isZh ? `连击 ×${ev.combo}` : `Combo ×${ev.combo}`) : '';
        setToast([names[ev.rows.length], comboTxt].filter(Boolean).join(' · '));
        if (ev.levelTo > ev.levelFrom) {
          floatTimers.current.push(window.setTimeout(() => {
            sfx.blkLevel();
            setToast(isZh ? `升级！速度加快 · Lv.${ev.levelTo}` : `Level up! · Lv.${ev.levelTo}`);
          }, 420));
        }
        break;
      }
      case 'over':
        gameOver();
        return;
      default:
        break;
    }
    publish();
  };
  handleRef.current = handleEvent;

  const runFn = useCallback((fn: (e: Engine) => Ev | null) => {
    if (phaseRef.current !== 'playing') return;
    handleRef.current(fn(engRef.current));
  }, []);

  const moveH = useCallback((dx: number) => {
    runFn((e) => (e.piece && !e.clearing.length && tryMove(e, dx, 0) ? { k: 'fx', name: 'move' } : null));
  }, [runFn]);

  const rotatePiece = useCallback((dir: 1 | -1) => {
    runFn((e) => (e.piece && !e.clearing.length && tryRotate(e, dir) ? { k: 'fx', name: 'rotate' } : null));
  }, [runFn]);

  const hardDropNow = useCallback(() => {
    runFn((e) => (e.piece && !e.clearing.length ? hardDrop(e) : null));
  }, [runFn]);

  const holdPiece = useCallback(() => {
    runFn(doHold);
  }, [runFn]);

  const setSoft = useCallback((on: boolean) => {
    engRef.current.softDrop = on;
  }, []);

  const togglePause = useCallback(() => {
    if (phaseRef.current === 'playing') {
      engRef.current.softDrop = false;
      phaseRef.current = 'paused';
      setPhase('paused');
    } else if (phaseRef.current === 'paused') {
      phaseRef.current = 'playing';
      setPhase('playing');
    }
  }, []);

  const startGame = useCallback((diff: Diff) => {
    const e = freshEngine(DIFF_START[diff], diff);
    spawnPiece(e);
    engRef.current = e;
    floatTimers.current.forEach((id) => window.clearTimeout(id));
    floatTimers.current = [];
    setDifficulty(diff);
    setLastResult(null);
    setToast(null);
    setFloats([]);
    setSparks([]);
    setBoardShake(false);
    phaseRef.current = 'playing';
    setPhase('playing');
    publish();
  }, [publish]);

  // 主循环：requestAnimationFrame 驱动下落 / 锁定 / 消行动画推进
  useEffect(() => {
    if (phase !== 'playing') return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      handleRef.current(tick(engRef.current, dt));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // 键盘操作（游戏进行中拦截方向键滚动页面）
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
      switch (ev.key) {
        case 'ArrowLeft': ev.preventDefault(); moveH(-1); break;
        case 'ArrowRight': ev.preventDefault(); moveH(1); break;
        case 'ArrowDown': ev.preventDefault(); setSoft(true); break;
        case 'ArrowUp': case 'x': case 'X': ev.preventDefault(); rotatePiece(1); break;
        case 'z': case 'Z': ev.preventDefault(); rotatePiece(-1); break;
        case ' ': ev.preventDefault(); hardDropNow(); break;
        case 'c': case 'C': ev.preventDefault(); holdPiece(); break;
        default: break;
      }
    };
    const onKeyUp = (ev: KeyboardEvent) => {
      if (ev.key === 'ArrowDown') setSoft(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [difficulty, hardDropNow, holdPiece, moveH, rotatePiece, setSoft, startGame, togglePause]);

  // 切到后台自动暂停，回来再手动继续
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

  useEffect(() => () => {
    floatTimers.current.forEach((id) => window.clearTimeout(id));
    if (repeatRef.current) window.clearInterval(repeatRef.current.timer);
  }, []);

  // 「星落之夜」背景音乐：随游戏挂载/卸载启停，也跟随全局声音开关
  useEffect(() => {
    if (!sound) return;
    sfx.blocksBgmStart();
    return () => sfx.blocksBgmStop();
  }, [sound]);

  // 触屏长按连发（左右移动）
  const pressMove = (dir: number) => {
    moveH(dir);
    if (repeatRef.current) window.clearInterval(repeatRef.current.timer);
    repeatRef.current = { dir, timer: window.setInterval(() => moveH(dir), 150) };
  };
  const releaseMove = () => {
    if (repeatRef.current) {
      window.clearInterval(repeatRef.current.timer);
      repeatRef.current = null;
    }
  };
  const guardPointer = (ev: React.SyntheticEvent) => {
    ev.preventDefault();
  };

  const bestScoreView = Math.max(best.score, snap.score);
  const bestLinesView = Math.max(best.lines, snap.lines);
  const levelProgress = (snap.lines % 10) * 10;

  const phaseLabel = phase === 'playing' ? (isZh ? '进行中' : 'RUNNING') : phase === 'paused' ? (isZh ? '暂停' : 'PAUSED') : phase === 'over' ? (isZh ? '已结束' : 'ENDED') : (isZh ? '待开始' : 'READY');
  const hint = phase === 'playing'
    ? (isZh ? '拼满一整行就会消除，给长条留好凹槽！' : 'Fill a full row to clear it — keep a slot for the long bar!')
    : phase === 'paused'
      ? (isZh ? '休息一下，点「继续」接着拼。' : 'Take a break, press resume to keep building.')
      : phase === 'over'
        ? (isZh ? '本局结束，再来挑战更高的分数吧！' : 'Round over — go for a higher score!')
        : (isZh ? '选好起始速度，点「开始游戏」。' : 'Pick a start speed and press start.');

  return (
    <section className="tb-starfall" aria-labelledby="tb-title">
      <header className="tb-heading">
        {headerAction ?? (<div className="tb-title-seal arcade-art" aria-hidden="true" />)}
        <div>
          <span>{isZh ? '消除 · 俄罗斯方块' : 'MATCH · BLOCKFALL'}</span>
          <h2 id="tb-title">{isZh ? '星落方块' : 'Starfall Blocks'}</h2>
          <p>{isZh ? '旋转飘落的方块，拼满一整行就能消除。一次消多行、连续消除都有加分！' : 'Rotate the falling blocks and fill full rows to clear them. Multi-row clears and combos score extra!'}</p>
        </div>
        <div className="tb-session" aria-label={isZh ? '本次访问最佳' : 'Session best'}>
          <span>{isZh ? '最高分' : 'Best score'} <b>{bestScoreView || '--'}</b></span>
          <em aria-hidden="true">·</em>
          <span>{isZh ? '最多消行' : 'Best lines'} <b>{bestLinesView || '--'}</b></span>
        </div>
      </header>

      <div className="tb-table">
        <div className="tb-stage">
          <div className="tb-board-wrap">
            <div
              className={`tb-board${boardShake ? ' shake' : ''}`}
              role="application"
              aria-label={isZh
                ? `星落方块棋盘，10 列 20 行，当前分数 ${snap.score}，已消 ${snap.lines} 行，速度等级 ${snap.level}`
                : `Starfall board, 10 by 20, score ${snap.score}, ${snap.lines} lines cleared, level ${snap.level}`}
            >
              <div className="tb-grid" aria-hidden="true">
                {snap.cells.map((code, i) => {
                  const row = Math.floor(i / COLS);
                  const cls = code >= 20 ? `tb-c f p${code - 20}` : code >= 10 ? `tb-c gh${code - 10}` : code > 0 ? `tb-c f c${code - 1}` : 'tb-c';
                  const clearing = code > 0 && snap.clearing.includes(row);
                  return <span key={i} className={cls + (clearing ? ' clr' : '')} />;
                })}
              </div>

              {snap.clearing.map((row) => (
                <span
                  key={`beam-${row}`}
                  className="tb-beam"
                  style={{ top: `${(row * 100) / ROWS}%`, height: `${100 / ROWS}%` }}
                />
              ))}

              {sparks.map((s) => (
                <i
                  key={s.id}
                  className="tb-spark"
                  style={{ left: `${s.x}%`, top: `${s.y}%`, '--dx': `${s.dx}px`, '--dy': `${s.dy}px`, '--sp': s.color } as React.CSSProperties}
                />
              ))}

              {floats.map((f) => (
                <span key={f.id} className={`tb-float${f.big ? ' big' : ''}`} style={{ top: `${Math.round(f.top * 100)}%` }}>{f.text}</span>
              ))}

              {phase === 'ready' && (
                <div className="tb-overlay">
                  <b>{isZh ? '准备拼搭' : 'Ready to build'}</b>
                  <p>{isZh ? `${playerName}，云间开始飘落七色方块，拼满一整行就能消除！` : `${playerName}, colorful blocks are drifting down — fill a full row to clear it!`}</p>
                  <button type="button" className="tb-overlay-btn" onClick={() => startGame(difficulty)}>
                    <span aria-hidden="true">✦</span>{isZh ? '开始游戏' : 'Start'}
                  </button>
                  <small>{isZh ? '键盘：← → 移动 · ↑/X 旋转 · Z 反转 · ↓ 加速 · 空格直落 · C 暂存 · P 暂停' : 'Keys: ← → move · ↑/X rotate · Z rotate back · ↓ soft drop · Space drop · C hold · P pause'}</small>
                </div>
              )}
              {phase === 'paused' && (
                <div className="tb-overlay dim">
                  <b>{isZh ? '暂停中' : 'Paused'}</b>
                  <div className="tb-overlay-row">
                    <button type="button" className="tb-overlay-btn" onClick={togglePause}>{isZh ? '继续 (P)' : 'Resume'}</button>
                    <button type="button" className="tb-overlay-btn ghost" onClick={() => startGame(difficulty)}>{isZh ? '重新开局' : 'Restart'}</button>
                  </div>
                </div>
              )}
              {phase === 'over' && lastResult && (
                <div className="tb-overlay over">
                  <b>{isZh ? '本局结束！' : 'Round over!'}</b>
                  {lastResult.record && <em className="tb-record">{isZh ? '★ 新纪录！' : '★ New best!'}</em>}
                  <div className="tb-final">
                    <span>{isZh ? '分数' : 'Score'}<b>{lastResult.score}</b></span>
                    <span>{isZh ? '消行' : 'Lines'}<b>{lastResult.lines}</b></span>
                    <span>{isZh ? '等级' : 'Level'}<b>Lv.{lastResult.level}</b></span>
                  </div>
                  <button type="button" className="tb-overlay-btn" onClick={() => startGame(difficulty)}>
                    <span aria-hidden="true">↻</span>{isZh ? '再来一局' : 'Play again'}
                  </button>
                </div>
              )}
            </div>

            {toast && <div className="tb-toast" role="status">{toast}</div>}

            <div className="tb-touchpad" aria-label={isZh ? '方块操作按钮' : 'Block controls'}>
              <button
                type="button"
                aria-label={isZh ? '向左移动' : 'Move left'}
                disabled={phase !== 'playing'}
                onPointerDown={(e) => { guardPointer(e); pressMove(-1); }}
                onPointerUp={releaseMove}
                onPointerLeave={releaseMove}
                onPointerCancel={releaseMove}
                onContextMenu={guardPointer}
              >
                <span aria-hidden="true">←</span>
              </button>
              <button
                type="button"
                aria-label={isZh ? '向右移动' : 'Move right'}
                disabled={phase !== 'playing'}
                onPointerDown={(e) => { guardPointer(e); pressMove(1); }}
                onPointerUp={releaseMove}
                onPointerLeave={releaseMove}
                onPointerCancel={releaseMove}
                onContextMenu={guardPointer}
              >
                <span aria-hidden="true">→</span>
              </button>
              <button type="button" aria-label={isZh ? '逆时针旋转' : 'Rotate counter-clockwise'} disabled={phase !== 'playing'} onClick={() => rotatePiece(-1)}>
                <span aria-hidden="true">⟲</span>
              </button>
              <button type="button" aria-label={isZh ? '顺时针旋转' : 'Rotate clockwise'} disabled={phase !== 'playing'} onClick={() => rotatePiece(1)}>
                <span aria-hidden="true">⟳</span>
              </button>
              <button
                type="button"
                aria-label={isZh ? '按住加速下落' : 'Hold to soft drop'}
                disabled={phase !== 'playing'}
                onPointerDown={(e) => { guardPointer(e); setSoft(true); }}
                onPointerUp={() => setSoft(false)}
                onPointerLeave={() => setSoft(false)}
                onPointerCancel={() => setSoft(false)}
                onContextMenu={guardPointer}
              >
                <span aria-hidden="true">↓</span>
              </button>
              <button type="button" aria-label={isZh ? '直接落到最底' : 'Hard drop'} disabled={phase !== 'playing'} onClick={hardDropNow}>
                <span aria-hidden="true">⤓</span>
              </button>
              <button type="button" aria-label={isZh ? '暂存当前方块' : 'Hold current block'} disabled={phase !== 'playing'} onClick={holdPiece}>
                <span aria-hidden="true">{isZh ? '存' : 'H'}</span>
              </button>
            </div>
          </div>
        </div>

        <aside className="tb-console">
          <div className="tb-status-card" aria-live="polite">
            <span className="tb-status-orbit" aria-hidden="true"><i /><i /><i /></span>
            <small>{isZh ? `本局 · ${phaseLabel}` : `ROUND · ${phaseLabel}`}</small>
            <div className="tb-score-row">
              <span>{isZh ? '分数' : 'Score'}</span>
              <b>{snap.score}</b>
            </div>
            <div className="tb-stats" aria-label={isZh ? '本局数据' : 'Round stats'}>
              <span>{isZh ? '消行' : 'Lines'} <b>{snap.lines}</b></span>
              <span>{isZh ? '速度' : 'Level'} <b>Lv.{snap.level}</b></span>
              <span className={snap.combo >= 2 ? 'hot' : ''}>{isZh ? '连击' : 'Combo'} <b>{snap.combo >= 2 ? `×${snap.combo}` : '--'}</b></span>
            </div>
            <div className="tb-levelbar" aria-hidden="true">
              <i style={{ width: `${levelProgress}%` }} />
              <small>{isZh ? `再消 ${10 - (snap.lines % 10)} 行升级` : `${10 - (snap.lines % 10)} to level up`}</small>
            </div>
            <p>{hint}</p>
          </div>

          <div className="tb-preview-row">
            <div className="tb-box">
              <span>{isZh ? '暂存 (C)' : 'Hold (C)'}</span>
              <div className="tb-box-slot">{snap.hold === null ? <i className="tb-mini-empty" aria-hidden="true" /> : <MiniPiece t={snap.hold} dim={snap.holdUsed} />}</div>
            </div>
            <div className="tb-box">
              <span>{isZh ? '接下来' : 'Next'}</span>
              <div className="tb-box-slot next">
                {snap.queue.map((t, i) => <MiniPiece key={i} t={t} dim={i > 0} />)}
              </div>
            </div>
          </div>

          <div className="tb-difficulty">
            <span>{isZh ? '起始速度' : 'START SPEED'}</span>
            <div role="group" aria-label={isZh ? '选择起始速度' : 'Choose start speed'}>
              {(Object.keys(diffText) as Diff[]).map((item) => (
                <button
                  type="button"
                  key={item}
                  className={difficulty === item ? 'active' : ''}
                  aria-pressed={difficulty === item}
                  disabled={phase === 'playing'}
                  aria-label={isZh ? `起始速度 ${diffText[item].zh}（Lv.${DIFF_START[item]}）${phase === 'playing' ? '，进行中不可切换' : ''}` : `Start speed ${diffText[item].en}`}
                  onClick={() => {
                    if (phase === 'ready') setDifficulty(item);
                    else startGame(item);
                  }}
                >
                  <i aria-hidden="true" />{diffText[item][lang]}
                </button>
              ))}
            </div>
            <small>{isZh ? `轻松 Lv.1 · 认真 Lv.3 · 高手 Lv.5；${phase === 'playing' ? '进行中不可切换' : '切换会开启新一局'}` : 'Breeze Lv.1 · Focus Lv.3 · Master Lv.5'}</small>
          </div>

          <div className="tb-actions">
            {(phase === 'playing' || phase === 'paused') && (
              <button type="button" onClick={togglePause}>
                <span aria-hidden="true">{phase === 'playing' ? '⏸' : '▶'}</span>
                {phase === 'playing' ? (isZh ? '暂停 (P)' : 'Pause') : (isZh ? '继续 (P)' : 'Resume')}
              </button>
            )}
            <button type="button" className="tb-primary" onClick={() => startGame(difficulty)}>
              <span aria-hidden="true">↻</span>
              {phase === 'ready' ? (isZh ? '开始游戏' : 'Start') : phase === 'over' ? (isZh ? '再来一局' : 'Play again') : phase === 'paused' ? (isZh ? '重新开局' : 'Restart') : (isZh ? '重新开局' : 'Restart')}
            </button>
          </div>

          <div className="tb-rule-note">
            <span aria-hidden="true">10×20</span>
            <p>{isZh ? '整行填满即消除 · 一次消多行分数翻倍 · 连续消行叠连击 · 每消 10 行提速一档' : 'Fill a row to clear · multi-clears score big · chain clears combo · every 10 lines speeds up'}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
