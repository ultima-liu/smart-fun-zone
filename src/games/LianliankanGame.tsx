import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { sfx } from '../sfx';
import './lianliankan.css';

type Difficulty = 'easy' | 'normal' | 'hard';
type PlayMode = 'free' | 'levels';

interface Tile { id: number; symbol: number }
interface Pt { r: number; c: number }

export interface LianliankanOutcome {
  result: 'win' | 'lose';
  durationSec: number;
  mode: PlayMode;
  difficulty: Difficulty;
  level: number;
  stars: number;
}

interface LianliankanGameProps {
  headerAction?: ReactNode;
  lang: 'zh' | 'en';
  playerName: string;
  onComplete: (outcome: LianliankanOutcome) => void;
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
const NO_WALLS = new Set<number>();
const LEVEL_COUNT = 20;

// 闯关难度曲线（刻意拉陡）：棋盘 4×4 → 12×10；云岩第 4 关登场、最多 18 个；
// 限时第 5 关登场，有效配对节奏（含返时折算）从 10 秒/对收紧到 3 秒/对；
// 资源 3+3 → 1+1 → 0+0；第 9 关起相近图案混淆；第 18 关起同对刻意远置。
// 云岩数量必须与 rows*cols 同奇偶，保证可用格数为偶。
interface StageCfg {
  rows: number; cols: number; kinds: number; walls: number;
  hint: number; shuffle: number; time: number; refund: number;
  near?: boolean; far?: boolean; mix?: boolean;
}

const LEVEL_STAGES: StageCfg[] = [
  { rows: 4, cols: 4, kinds: 4, walls: 0, hint: 3, shuffle: 3, time: 0, refund: 0, near: true },
  { rows: 4, cols: 5, kinds: 6, walls: 0, hint: 3, shuffle: 3, time: 0, refund: 0 },
  { rows: 5, cols: 6, kinds: 8, walls: 0, hint: 2, shuffle: 2, time: 0, refund: 0 },
  { rows: 6, cols: 6, kinds: 9, walls: 2, hint: 2, shuffle: 2, time: 0, refund: 0 },
  { rows: 6, cols: 8, kinds: 10, walls: 2, hint: 2, shuffle: 2, time: 144, refund: 4 },
  { rows: 6, cols: 8, kinds: 12, walls: 4, hint: 1, shuffle: 1, time: 132, refund: 3 },
  { rows: 7, cols: 8, kinds: 12, walls: 4, hint: 1, shuffle: 1, time: 126, refund: 3 },
  { rows: 7, cols: 10, kinds: 14, walls: 6, hint: 1, shuffle: 1, time: 122, refund: 3 },
  { rows: 7, cols: 10, kinds: 16, walls: 6, hint: 1, shuffle: 1, time: 105, refund: 3, mix: true },
  { rows: 8, cols: 10, kinds: 16, walls: 8, hint: 1, shuffle: 1, time: 140, refund: 2, mix: true },
  { rows: 8, cols: 10, kinds: 16, walls: 8, hint: 1, shuffle: 0, time: 120, refund: 2, mix: true },
  { rows: 8, cols: 10, kinds: 16, walls: 10, hint: 0, shuffle: 0, time: 104, refund: 2, mix: true },
  { rows: 8, cols: 11, kinds: 16, walls: 10, hint: 0, shuffle: 0, time: 106, refund: 2, mix: true },
  { rows: 8, cols: 11, kinds: 16, walls: 12, hint: 0, shuffle: 0, time: 97, refund: 2, mix: true },
  { rows: 8, cols: 12, kinds: 16, walls: 12, hint: 0, shuffle: 0, time: 96, refund: 2, mix: true },
  { rows: 9, cols: 12, kinds: 16, walls: 12, hint: 0, shuffle: 0, time: 146, refund: 1, mix: true },
  { rows: 9, cols: 12, kinds: 16, walls: 14, hint: 0, shuffle: 0, time: 135, refund: 1, mix: true },
  { rows: 10, cols: 12, kinds: 16, walls: 14, hint: 0, shuffle: 0, time: 138, refund: 1, mix: true, far: true },
  { rows: 10, cols: 12, kinds: 16, walls: 16, hint: 0, shuffle: 0, time: 126, refund: 1, mix: true, far: true },
  { rows: 10, cols: 12, kinds: 16, walls: 18, hint: 0, shuffle: 0, time: 180, refund: 0, mix: true, far: true },
];

// 相近图案混淆顺序：视觉易混的排前面（星/流星、海豚/鲸、游乐设施、甜点、云月）
const CONFUSABLE = [2, 17, 14, 16, 7, 8, 9, 10, 11, 12, 1, 3, 4, 0, 5, 6, 13, 15];

type Placement = 'near' | 'far' | 'normal';

interface RoundCfg {
  rows: number; cols: number; kindsList: number[]; walls: number;
  hint: number; shuffle: number; timeSec: number; refundSec: number; placement: Placement;
}

const freeCfg = (diff: Difficulty): RoundCfg => {
  const { rows, cols, kinds } = LEVELS[diff];
  return {
    rows, cols,
    kindsList: Array.from({ length: kinds }, (_, i) => i),
    walls: 0, hint: 3, shuffle: 3, timeSec: 0, refundSec: 0, placement: 'normal',
  };
};

const stageCfg = (level: number): RoundCfg => {
  const stage = LEVEL_STAGES[Math.min(Math.max(level, 1), LEVEL_COUNT) - 1];
  return {
    rows: stage.rows, cols: stage.cols,
    kindsList: stage.mix ? CONFUSABLE.slice(0, stage.kinds) : Array.from({ length: stage.kinds }, (_, i) => i),
    walls: stage.walls, hint: stage.hint, shuffle: stage.shuffle,
    timeSec: stage.time, refundSec: stage.refund,
    placement: stage.near ? 'near' : stage.far ? 'far' : 'normal',
  };
};

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
// 让折线可以绕到棋盘外侧连接；云岩（walls）是永不可穿越也不可放棋子的内格。
function isFree(board: (Tile | null)[], rows: number, cols: number, r: number, c: number, walls: Set<number>): boolean {
  if (r === 0 || c === 0 || r === rows + 1 || c === cols + 1) return true;
  const inner = (r - 1) * cols + (c - 1);
  if (walls.has(inner)) return false;
  return board[inner] === null;
}

function lineClear(board: (Tile | null)[], rows: number, cols: number, from: Pt, to: Pt, walls: Set<number>): boolean {
  if (from.r === to.r) {
    const [c1, c2] = from.c < to.c ? [from.c, to.c] : [to.c, from.c];
    for (let c = c1 + 1; c < c2; c++) if (!isFree(board, rows, cols, from.r, c, walls)) return false;
    return true;
  }
  if (from.c === to.c) {
    const [r1, r2] = from.r < to.r ? [from.r, to.r] : [to.r, from.r];
    for (let r = r1 + 1; r < r2; r++) if (!isFree(board, rows, cols, r, from.c, walls)) return false;
    return true;
  }
  return false;
}

export function findPath(board: (Tile | null)[], rows: number, cols: number, a: Pt, b: Pt, walls: Set<number> = NO_WALLS): Pt[] | null {
  if ((a.r === b.r || a.c === b.c) && lineClear(board, rows, cols, a, b, walls)) return [a, b];
  const corners: Pt[] = [{ r: a.r, c: b.c }, { r: b.r, c: a.c }];
  for (const corner of corners) {
    if (isFree(board, rows, cols, corner.r, corner.c, walls)
      && lineClear(board, rows, cols, a, corner, walls)
      && lineClear(board, rows, cols, corner, b, walls)) {
      return [a, corner, b];
    }
  }
  for (const [dr, dc] of DIRS) {
    let r = a.r + dr;
    let c = a.c + dc;
    while (r >= 0 && r <= rows + 1 && c >= 0 && c <= cols + 1 && isFree(board, rows, cols, r, c, walls)) {
      const mid: Pt = { r, c };
      if (mid.r === b.r || mid.c === b.c) {
        if (lineClear(board, rows, cols, mid, b, walls)) return [a, mid, b];
      } else {
        const turns: Pt[] = [{ r: mid.r, c: b.c }, { r: b.r, c: mid.c }];
        for (const corner of turns) {
          if (isFree(board, rows, cols, corner.r, corner.c, walls)
            && lineClear(board, rows, cols, mid, corner, walls)
            && lineClear(board, rows, cols, corner, b, walls)) {
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

export function findMove(board: (Tile | null)[], rows: number, cols: number, walls: Set<number> = NO_WALLS): { a: number; b: number } | null {
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
        if (findPath(board, rows, cols, toPt(cells[i], cols), toPt(cells[j], cols), walls)) return { a: cells[i], b: cells[j] };
      }
    }
  }
  return null;
}

// 逆序摆牌：按“最后被消除的对最先放下”的顺序逐对放置，放置时就检查这一对
// 在当前障碍（含云岩）下可连，保证整盘至少存在一条完整消除顺序。
// placement 决定同对的落位偏好：near 就近（教学关）、far 刻意远置（高压关）、normal 随机。
function buildLayout(rows: number, cols: number, pairSymbols: number[], allowed: number[], walls: Set<number>, placement: Placement): (Tile | null)[] {
  const board: (Tile | null)[] = Array(rows * cols).fill(null);
  const freeCells = shuffle(allowed);
  const cellRow = (i: number) => Math.floor(i / cols);
  const cellCol = (i: number) => i % cols;
  const tryPair = (a: number, b: number, symbol: number): boolean => {
    board[a] = { id: ++tileSeq, symbol };
    board[b] = { id: ++tileSeq, symbol };
    if (findPath(board, rows, cols, toPt(a, cols), toPt(b, cols), walls)) return true;
    board[a] = null;
    board[b] = null;
    return false;
  };
  for (const symbol of pairSymbols) {
    let placedA = -1;
    let placedB = -1;
    if (placement !== 'normal' && freeCells.length >= 2) {
      const anchor = freeCells[Math.floor(Math.random() * freeCells.length)];
      const dist = (cell: number) => Math.abs(cellRow(cell) - cellRow(anchor)) + Math.abs(cellCol(cell) - cellCol(anchor));
      const rest = freeCells.filter((cell) => cell !== anchor).sort((x, y) => (placement === 'near' ? dist(x) - dist(y) : dist(y) - dist(x)));
      for (const b of rest) {
        if (tryPair(anchor, b, symbol)) {
          placedA = anchor;
          placedB = b;
          break;
        }
      }
    } else {
      outer:
      for (let i = 0; i < freeCells.length && placedA < 0; i++) {
        for (let j = i + 1; j < freeCells.length; j++) {
          if (tryPair(freeCells[i], freeCells[j], symbol)) {
            placedA = freeCells[i];
            placedB = freeCells[j];
            break outer;
          }
        }
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

function relayout(rows: number, cols: number, pairSymbols: number[], allowed: number[], walls: Set<number>, placement: Placement = 'normal'): (Tile | null)[] {
  let fallback: (Tile | null)[] = Array(rows * cols).fill(null);
  for (let attempt = 0; attempt < 12; attempt++) {
    const board = buildLayout(rows, cols, pairSymbols, allowed, walls, placement);
    if (!pairSymbols.length || findMove(board, rows, cols, walls)) return board;
    fallback = board;
  }
  return fallback;
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

function reshuffleBoard(board: (Tile | null)[], rows: number, cols: number, skip: Set<number>, walls: Set<number>): (Tile | null)[] {
  const cells: number[] = [];
  const tiles: Tile[] = [];
  board.forEach((tile, index) => {
    if (skip.has(index)) return;
    if (tile) {
      cells.push(index);
      tiles.push(tile);
    }
  });
  const symbols = pairSymbolsFrom(tiles);
  let next = relayout(rows, cols, symbols, cells, walls);
  if (!findMove(next, rows, cols, walls)) {
    // 固定占位重排无解（残局可能被云岩围死，剩两块时甚至只有一种摆法）：
    // 放开占位，允许把剩余棋子迁移到任意非云岩空格重新布阵。
    const open: number[] = [];
    for (let i = 0; i < rows * cols; i++) if (!walls.has(i)) open.push(i);
    const moved = relayout(rows, cols, symbols, open, walls);
    if (findMove(moved, rows, cols, walls)) next = moved;
  }
  // 正在播放消除动画的方块原位保留，它们各自的超时回调仍会按 id 移除自己
  skip.forEach((index) => {
    const tile = board[index];
    if (tile) next[index] = tile;
  });
  return next;
}

function pickWalls(rows: number, cols: number, count: number): Set<number> {
  const cells = shuffle(Array.from({ length: rows * cols }, (_, i) => i));
  return new Set(cells.slice(0, count));
}

function buildRoundBoard(cfg: RoundCfg, walls: Set<number>): (Tile | null)[] {
  const open = Array.from({ length: cfg.rows * cfg.cols }, (_, i) => i).filter((i) => !walls.has(i));
  // 云岩之后若剩奇数格，随机留一个空位，保证棋子成对
  const usable = open.length % 2 === 1 ? shuffle(open).slice(1) : open;
  const pairs = usable.length / 2;
  const symbols = shuffle(Array.from({ length: pairs }, (_, i) => cfg.kindsList[i % cfg.kindsList.length]));
  return relayout(cfg.rows, cfg.cols, symbols, usable, walls, cfg.placement);
}

const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export default function LianliankanGame({ lang, playerName, onComplete, headerAction }: LianliankanGameProps) {
  const [mode, setMode] = useState<PlayMode>('free');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [level, setLevel] = useState(1);
  const [shape, setShape] = useState({ rows: LEVELS.normal.rows, cols: LEVELS.normal.cols });
  const [board, setBoard] = useState<(Tile | null)[]>(() => buildRoundBoard(freeCfg('normal'), NO_WALLS));
  const [walls, setWalls] = useState<Set<number>>(() => new Set());
  const [selected, setSelected] = useState<number | null>(null);
  const [clearing, setClearing] = useState<Set<number>>(() => new Set());
  const [hintCells, setHintCells] = useState<number[]>([]);
  const [link, setLink] = useState<{ key: number; path: Pt[] } | null>(null);
  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
  const [tools, setTools] = useState({ hint: 3, shuffle: 3 });
  const [score, setScore] = useState({ wins: 0, bestSec: 0 });
  const [now, setNow] = useState(() => Date.now());
  const [finalSec, setFinalSec] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [starsWon, setStarsWon] = useState(0);
  const startedAtRef = useRef(Date.now());
  const comboAtRef = useRef(0);
  const linkKeyRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const boardRef = useRef(board);
  const clearingRef = useRef(clearing);
  const resultRef = useRef<'win' | 'lose' | null>(null);
  const cfgRef = useRef<RoundCfg>(freeCfg('normal'));
  const deadlineRef = useRef(0);
  const budgetEndRef = useRef(0);
  const hintsUsedRef = useRef(0);
  boardRef.current = board;
  // 倒计时 tick 回调闭包可能跨回合存留，结算记录的模式/关卡从 ref 取最新值
  const metaRef = useRef({ mode, difficulty, level });
  metaRef.current = { mode, difficulty, level };

  const { rows, cols } = shape;
  const isZh = lang === 'zh';
  const sound = useStore((s) => s.sound);
  const records = useStore((s) => s.records);
  const childId = useStore((s) => s.activeChildId);
  const logicBoard = useMemo(
    () => board.map((tile, index) => (clearing.has(index) ? null : tile)),
    [board, clearing],
  );
  const pairsLeft = Math.max(0, (board.filter((tile) => tile !== null).length - clearing.size) / 2);
  const elapsed = finalSec ?? Math.floor((now - startedAtRef.current) / 1000);

  // 闯关进度完全从游玩记录推导，不新增持久化字段
  const levelProgress = useMemo(() => {
    const cleared = new Map<number, number>();
    records.forEach((r) => {
      if (r.childId !== childId || r.gameId !== 'sky-lianliankan-levels' || !r.correct) return;
      cleared.set(r.level, Math.max(cleared.get(r.level) ?? 0, r.stars));
    });
    let unlocked = 1;
    cleared.forEach((_, lv) => {
      unlocked = Math.max(unlocked, Math.min(LEVEL_COUNT, lv + 1));
    });
    return { unlocked, cleared };
  }, [records, childId]);

  const setClearingNow = (next: Set<number>) => {
    clearingRef.current = next;
    setClearing(next);
  };

  const liveEmpty = (source: (Tile | null)[]) => source.every((tile, index) => tile === null || clearingRef.current.has(index));

  const failRound = () => {
    if (resultRef.current) return;
    // 最后一对已在消除动画中：让结算流程按通关处理
    if (liveEmpty(boardRef.current)) return;
    const sec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    resultRef.current = 'lose';
    setFinalSec(sec);
    setResult('lose');
    setTimeLeft(0);
    sfx.lkFail();
    const meta = metaRef.current;
    onComplete({
      result: 'lose', durationSec: sec, mode: meta.mode, difficulty: meta.difficulty, level: meta.level, stars: 0,
    });
  };

  useEffect(() => {
    if (result) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
      if (deadlineRef.current > 0) {
        const left = (deadlineRef.current - Date.now()) / 1000;
        setTimeLeft(left);
        if (left <= 0) failRound();
      }
    }, 500);
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

  // 云端音乐盒背景音乐：随游戏挂载/卸载启停，也跟随全局声音开关
  useEffect(() => {
    if (!sound) return;
    sfx.lkBgmStart();
    return () => sfx.lkBgmStop();
  }, [sound]);

  const settle = (next: (Tile | null)[]) => {
    if (resultRef.current) return;
    // 正在消除动画中的方块不计入存活（它们注定被移除），也不阻塞寻路
    const live = next.map((tile, index) => (clearingRef.current.has(index) ? null : tile));
    if (live.every((tile) => tile === null)) {
      const sec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
      resultRef.current = 'win';
      setFinalSec(sec);
      setResult('win');
      // 星级（仅闯关模式）：1 星=通关；未用提示或速度达标得 2 星；两者兼得 3 星
      let stars = 0;
      if (mode === 'levels') {
        const cfg = cfgRef.current;
        const pairs = (cfg.rows * cfg.cols - cfg.walls) / 2;
        const speedOk = cfg.timeSec > 0
          ? (deadlineRef.current - Date.now()) / 1000 / cfg.timeSec >= 0.4
          : sec <= pairs * 5;
        const noHint = hintsUsedRef.current === 0;
        stars = 1 + (noHint || speedOk ? 1 : 0) + (noHint && speedOk ? 1 : 0);
      }
      setStarsWon(stars);
      if (mode === 'free') setScore((cur) => ({ wins: cur.wins + 1, bestSec: cur.bestSec === 0 ? sec : Math.min(cur.bestSec, sec) }));
      sfx.lkWin();
      onComplete({
        result: 'win', durationSec: sec, mode, difficulty, level, stars,
      });
      // 闯关通关后自动进入下一关（末关停留庆祝）；期间可点「下一关」立即推进或「再试一次」取消
      if (mode === 'levels' && level < LEVEL_COUNT) {
        setToast(isZh ? `✦ 即将进入第 ${level + 1} 关…` : `✦ Next: stage ${level + 1}…`);
        const timer = window.setTimeout(() => {
          if (resultRef.current !== 'win') return;
          beginRound(stageCfg(level + 1), 'levels', level + 1);
        }, 3200);
        timersRef.current.push(timer);
      }
      return;
    }
    if (!findMove(live, rows, cols, walls)) {
      const reshuffled = reshuffleBoard(next, rows, cols, clearingRef.current, walls);
      boardRef.current = reshuffled;
      setBoard(reshuffled);
      sfx.lkShuffle();
      setToast(isZh ? '☁️ 云朵飘了过来，棋子重新排好啦' : 'The clouds drifted by — tiles rearranged');
    }
  };

  const beginRound = (cfg: RoundCfg, nextMode: PlayMode, nextLevel: number) => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    const wallSet = pickWalls(cfg.rows, cfg.cols, cfg.walls);
    const fresh = buildRoundBoard(cfg, wallSet);
    cfgRef.current = cfg;
    boardRef.current = fresh;
    setBoard(fresh);
    setWalls(wallSet);
    setShape({ rows: cfg.rows, cols: cfg.cols });
    setMode(nextMode);
    setLevel(nextLevel);
    setSelected(null);
    setClearingNow(new Set());
    setHintCells([]);
    setLink(null);
    resultRef.current = null;
    setResult(null);
    setToast(null);
    setCombo(0);
    comboAtRef.current = 0;
    hintsUsedRef.current = 0;
    setTools({ hint: cfg.hint, shuffle: cfg.shuffle });
    setFinalSec(null);
    setStarsWon(0);
    startedAtRef.current = Date.now();
    setNow(Date.now());
    if (cfg.timeSec > 0) {
      deadlineRef.current = Date.now() + cfg.timeSec * 1000;
      budgetEndRef.current = deadlineRef.current;
      setTimeLeft(cfg.timeSec);
    } else {
      deadlineRef.current = 0;
      budgetEndRef.current = 0;
      setTimeLeft(null);
    }
  };

  const tapTile = (index: number) => {
    if (result) return;
    const tile = board[index];
    if (!tile || clearing.has(index)) return;
    if (selected === index) {
      setSelected(null);
      return;
    }
    if (selected === null || !board[selected] || clearing.has(selected)) {
      setSelected(index);
      sfx.lkSelect();
      return;
    }
    const first = board[selected];
    if (first.symbol !== tile.symbol) {
      setSelected(index);
      sfx.lkSelect();
      return;
    }
    const path = findPath(logicBoard, rows, cols, toPt(selected, cols), toPt(index, cols), walls);
    if (!path) {
      setSelected(index);
      sfx.lkBlocked();
      return;
    }
    const a = selected;
    const b = index;
    const stamp = Date.now();
    const nextCombo = stamp - comboAtRef.current <= 7000 ? combo + 1 : 1;
    setCombo(nextCombo);
    sfx.lkMatch(nextCombo);
    // 限时关：每消一对返还时间，封顶初始预算
    if (deadlineRef.current > 0) {
      deadlineRef.current = Math.min(deadlineRef.current + cfgRef.current.refundSec * 1000, budgetEndRef.current);
      setTimeLeft((deadlineRef.current - Date.now()) / 1000);
    }
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
    const move = findMove(logicBoard, rows, cols, walls);
    if (!move) return;
    setHintCells([move.a, move.b]);
    setTools((cur) => ({ ...cur, hint: cur.hint - 1 }));
    hintsUsedRef.current += 1;
    sfx.lkHint();
  };

  const doShuffle = () => {
    if (result || tools.shuffle <= 0) return;
    const next = reshuffleBoard(boardRef.current, rows, cols, clearingRef.current, walls);
    boardRef.current = next;
    setBoard(next);
    setSelected(null);
    setHintCells([]);
    setTools((cur) => ({ ...cur, shuffle: cur.shuffle - 1 }));
    sfx.lkShuffle();
    setToast(isZh ? '☁️ 云朵翻了个身，棋盘重排啦' : 'The clouds rolled over — board reshuffled');
  };

  const padCols = cols + 2;
  const padRows = rows + 2;
  const linkPoints = link ? link.path.map((p) => `${p.c + 0.5},${p.r + 0.5}`).join(' ') : '';
  const timed = mode === 'levels' && timeLeft !== null;
  const timeRatio = timed && cfgRef.current.timeSec > 0 ? Math.max(0, Math.min(1, timeLeft / cfgRef.current.timeSec)) : 1;
  const bestStars = levelProgress.cleared.get(level) ?? 0;
  const finalLevel = mode === 'levels' && level >= LEVEL_COUNT;

  let statusTitle: string;
  let statusBody: string;
  if (result === 'win') {
    statusTitle = mode === 'levels'
      ? (finalLevel ? (isZh ? '全部 20 关点亮！' : 'All 20 stages cleared!') : (isZh ? `第 ${level} 关通过！` : `Stage ${level} cleared!`))
      : (isZh ? '云径全部点亮，通关！' : 'All paths lit — cleared!');
    statusBody = mode === 'levels'
      ? (finalLevel
        ? (isZh ? '你是云径传奇！可以回到喜欢的关卡再刷三星哦。' : 'You are the legend of the sky path! Replay stages to earn more stars.')
        : (isZh ? `${'★'.repeat(starsWon)} 漂亮！下一关的云海已经在等你了。` : `${'★'.repeat(starsWon)} Great! The next stage is waiting.`))
      : (isZh ? '整片云海都被你连完啦，要不要换个更大的棋盘？' : 'You cleared the whole sky. Try a bigger board?');
  } else if (result === 'lose') {
    statusTitle = isZh ? '时间到，差一点点！' : "Time's up — so close!";
    statusBody = isZh ? '云朵还想再陪你玩一次，再试试这一关吧。' : 'The clouds want another try with you. Go again!';
  } else {
    statusTitle = isZh ? `${playerName}，点亮一对云间图案` : `${playerName}, link a matching pair`;
    statusBody = isZh ? '轻点两块相同的图案，它们之间的折线不能超过两个弯。' : 'Tap two matching tiles — their path may bend at most twice.';
  }

  return (
    <section className="lk-skytrail" aria-labelledby="lk-title">
      <header className="lk-heading">
        {headerAction ?? (<div className="lk-title-seal" aria-hidden="true"><i /><b>连</b><i /></div>)}
        <div>
          <span>{isZh ? '云上配对 · 今日开放' : 'SKY PAIRS · NOW OPEN'}</span>
          <h2 id="lk-title">{isZh ? '云径连连看' : 'Cloud Path Match'}</h2>
          <p>{isZh ? '把相同的云间图案用不超过两个弯的折线连在一起，全清棋盘即通关。' : 'Link matching sky tiles with a path of at most two bends and clear the whole board.'}</p>
        </div>
        {mode === 'levels' ? (
          <div className="lk-session" aria-label={isZh ? '闯关进度' : 'Stage progress'}>
            <span>{isZh ? '关卡' : 'Stage'} <b>{level}/{LEVEL_COUNT}</b></span>
            <em aria-hidden="true">·</em>
            <span>{isZh ? '本关最好' : 'Best'} <b className="lk-star-chip">{bestStars ? '★'.repeat(bestStars) : '--'}</b></span>
          </div>
        ) : (
          <div className="lk-session" aria-label={isZh ? '本次成绩' : 'Session best'}>
            <span>{isZh ? '通关' : 'Won'} <b>{score.wins}</b></span>
            <em aria-hidden="true">·</em>
            <span>{isZh ? '最快' : 'Best'} <b>{score.bestSec ? mmss(score.bestSec) : '--:--'}</b></span>
          </div>
        )}
      </header>

      <div className="lk-table">
        <div className="lk-board-wrap">
          {timed && (
            <div className={`lk-timebar${timeRatio <= 0.12 ? ' crit' : timeRatio <= 0.3 ? ' low' : ''}`} role="timer" aria-label={isZh ? '剩余时间' : 'Time left'}>
              <i style={{ width: `${timeRatio * 100}%` }} />
              <b>{mmss(Math.max(0, Math.ceil(timeLeft ?? 0)))}</b>
            </div>
          )}
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
                if (walls.has(inner)) {
                  return (
                    <span
                      key={pi}
                      role="gridcell"
                      className="lk-wall"
                      aria-label={isZh ? `第 ${r} 行第 ${c} 列，云岩` : `Row ${r}, column ${c}, cloud rock`}
                    />
                  );
                }
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
                const meta = SYMBOL_META[tile.symbol];
                const label = isZh
                  ? `第 ${r} 行第 ${c} 列，${meta[1]}${selected === inner ? '，已选中' : ''}`
                  : `Row ${r}, column ${c}, ${meta[2]}${selected === inner ? ', selected' : ''}`;
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
                    <span className={`lk-face k${tile.symbol}`} aria-hidden="true">
                      <i
                        className="lk-symbol-art"
                        style={{
                          backgroundPosition: `${(tile.symbol % 6) * 20}% ${Math.floor(tile.symbol / 6) * 50}%`,
                        }}
                      />
                    </span>
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
            {result && (
              <div className={`lk-result-ribbon ${result}`} aria-hidden="true">
                <div>
                  <span>{result === 'win' ? (isZh ? '通关' : 'CLEARED') : (isZh ? '时间到' : "TIME'S UP")}</span>
                  {result === 'win' && mode === 'levels' && (
                    <div className="lk-ribbon-stars">
                      {[0, 1, 2].map((i) => <i key={i} className={i < starsWon ? '' : 'off'} />)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {toast && <div className="lk-toast" role="status">{toast}</div>}
        </div>

        <aside className="lk-console">
          <div className={`lk-status-card${result === 'win' ? ' result-win' : ''}${result === 'lose' ? ' result-lose' : ''}`} aria-live="polite">
            <span className="lk-status-orbit" aria-hidden="true"><i /><i /><i /></span>
            <small>{mode === 'levels' ? (isZh ? `闯关 · 第 ${level} 关` : `LEVELS · STAGE ${level}`) : (isZh ? '本局进度' : 'ROUND PROGRESS')}</small>
            <strong>{statusTitle}</strong>
            <div className="lk-stats" aria-label={isZh ? '本局数据' : 'Round stats'}>
              <span>{isZh ? `剩余 ${pairsLeft} 对` : `${pairsLeft} pairs left`}</span>
              {timed
                ? <span className={timeRatio <= 0.3 ? 'hot' : ''}>{isZh ? `剩余 ${mmss(Math.max(0, Math.ceil(timeLeft ?? 0)))}` : `Left ${mmss(Math.max(0, Math.ceil(timeLeft ?? 0)))}`}</span>
                : <span>{isZh ? `用时 ${mmss(elapsed)}` : `Time ${mmss(elapsed)}`}</span>}
              {combo >= 2 && <span className="hot">{isZh ? `连击 ×${combo}` : `Combo ×${combo}`}</span>}
            </div>
            <p>{statusBody}</p>
          </div>

          <div className="lk-difficulty lk-mode">
            <span>{isZh ? '游戏模式' : 'GAME MODE'}</span>
            <div role="group" aria-label={isZh ? '选择模式' : 'Choose mode'}>
              <button type="button" className={mode === 'free' ? 'active' : ''} aria-pressed={mode === 'free'} onClick={() => beginRound(freeCfg(difficulty), 'free', level)}>
                <i aria-hidden="true" />{isZh ? '自由练习' : 'Free play'}
              </button>
              <button type="button" className={mode === 'levels' ? 'active' : ''} aria-pressed={mode === 'levels'} onClick={() => beginRound(stageCfg(levelProgress.unlocked), 'levels', levelProgress.unlocked)}>
                <i aria-hidden="true" />{isZh ? '闯关挑战' : 'Levels'}
              </button>
            </div>
            <small>{isZh ? '切换模式会开启新一局' : 'Switching mode starts a new round'}</small>
          </div>

          {mode === 'free' ? (
            <div className="lk-difficulty">
              <span>{isZh ? '棋盘大小' : 'BOARD SIZE'}</span>
              <div role="group" aria-label={isZh ? '选择棋盘' : 'Choose board'}>
                {(Object.keys(difficultyText) as Difficulty[]).map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={difficulty === item ? 'active' : ''}
                    aria-pressed={difficulty === item}
                    onClick={() => {
                      setDifficulty(item);
                      beginRound(freeCfg(item), 'free', level);
                    }}
                  >
                    <i aria-hidden="true" />{difficultyText[item][lang]}
                  </button>
                ))}
              </div>
              <small>{isZh ? '切换棋盘会开启新一局' : 'Changing size starts a new round'}</small>
            </div>
          ) : (
            <div className="lk-difficulty lk-levels">
              <span>{isZh ? `关卡 · 已解锁 ${levelProgress.unlocked}/${LEVEL_COUNT}` : `STAGES · ${levelProgress.unlocked}/${LEVEL_COUNT} unlocked`}</span>
              <div className="lk-level-grid" role="group" aria-label={isZh ? '选择关卡' : 'Choose stage'}>
                {Array.from({ length: LEVEL_COUNT }, (_, i) => i + 1).map((n) => (
                  <button
                    type="button"
                    key={n}
                    disabled={n > levelProgress.unlocked}
                    aria-pressed={n === level}
                    className={`${n === level ? 'active' : ''}${levelProgress.cleared.has(n) ? ' done' : ''}`}
                    aria-label={isZh ? `第 ${n} 关${n > levelProgress.unlocked ? '，未解锁' : ''}` : `Stage ${n}${n > levelProgress.unlocked ? ', locked' : ''}`}
                    onClick={() => beginRound(stageCfg(n), 'levels', n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <small>{isZh ? '通过当前关卡即可解锁下一关' : 'Clear a stage to unlock the next'}</small>
            </div>
          )}

          <div className="lk-actions">
            {result === 'win' && mode === 'levels' && !finalLevel ? (
              <>
                <button type="button" className="lk-primary" onClick={() => beginRound(stageCfg(level + 1), 'levels', level + 1)}>
                  <span aria-hidden="true">→</span>{isZh ? `下一关（${level + 1}）` : `Next (${level + 1})`}
                </button>
                <button type="button" onClick={() => beginRound(stageCfg(level), 'levels', level)}>
                  <span aria-hidden="true">↻</span>{isZh ? '再试一次' : 'Retry'}
                </button>
              </>
            ) : (
              <button type="button" className="lk-primary" onClick={() => beginRound(mode === 'free' ? freeCfg(difficulty) : stageCfg(level), mode, level)}>
                <span aria-hidden="true">↻</span>{result === 'lose' ? (isZh ? '再试一次' : 'Try again') : result === 'win' ? (isZh ? '再来一局' : 'Play again') : (isZh ? '重新开局' : 'New round')}
              </button>
            )}
            {!result && (
              <>
                <button type="button" onClick={useHint} disabled={tools.hint <= 0}>
                  <span aria-hidden="true">✧</span>{isZh ? `提示 ×${tools.hint}` : `Hint ×${tools.hint}`}
                </button>
                <button type="button" onClick={doShuffle} disabled={tools.shuffle <= 0}>
                  <span aria-hidden="true">☁</span>{isZh ? `重排 ×${tools.shuffle}` : `Shuffle ×${tools.shuffle}`}
                </button>
              </>
            )}
          </div>

          <div className="lk-rule-note">
            <span aria-hidden="true">≤2</span>
            <p>{isZh ? '同款图案 · 折线相连 · 最多两个弯 · 云岩不可穿越' : 'Same picture · Two bends max · Rocks block paths'}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
