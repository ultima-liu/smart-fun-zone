import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { sfx } from '../sfx';
import './bubble-shooter.css';

export interface BubbleShooterOutcome {
  score: number;
  stages: number; // 已突破的云层数
  popped: number; // 消散的泡泡总数
  difficulty: 'easy' | 'normal' | 'hard';
  durationSec: number;
}

interface BubbleShooterGameProps {
  headerAction?: ReactNode;
  lang: 'zh' | 'en';
  playerName: string;
  onComplete: (outcome: BubbleShooterOutcome) => void;
}

type Diff = 'easy' | 'normal' | 'hard';
type Phase = 'ready' | 'playing' | 'paused' | 'clear' | 'over';

/* ---------- 六边形网格几何（单位 = 一颗泡泡的宽度） ---------- */
const COLS = 10;           // 偶数行 10 颗，奇数行 9 颗（右移半格）
const ROW_H = 0.8660254;   // 六边形错排的行距
const TOTAL_ROWS = 15;     // 棋盘可见行数（含底部炮台区）
const DANGER_ROW = 12;     // 泡泡沉降到该行即告负
const LAUNCH_ROW = 13.75;  // 炮台转轴所在行
const SPEED = 34;          // 泡泡飞行速度（格/秒）
const POP_MIN = 3;
const AIM_MIN = 18;        // 瞄准角范围（度，90 = 正上方）
const AIM_MAX = 162;
const AIM_STEP = 4;
const GUIDE_STEP = 0.34;   // 弹道采样步长
const GUIDE_GAP = 4;       // 每隔几个采样点画一个引导点
const GUIDE_MAX = 13;      // 引导点数量上限
// 飞行泡泡与场上泡泡的碰撞距离：接近两球相切（1.0）。若阈值偏小，泡泡会在
// 进入“下方开口、左右夹壁”的蜂窝通道前提前停下，导致这类空位永远打不进。
const HIT_DIST = 0.96;
const SUBSTEP = 0.12;      // 飞行子步长（远小于碰撞阈值，避免穿透）
const MUZZLE = 1.05;       // 炮口离转轴的距离（格），发射点与引导线从这里开始
const STAGE_BONUS = 300;
// 碎星深色：与各色泡泡 --b 一致，迸散时带着本体颜色
const SPARK_DEEP = ['#e13a63', '#f0700f', '#efad08', '#23b25a', '#1e9fe0', '#7a45ea'];
const SPARK_WHITE = '#ffffff';

const DIFF: Record<Diff, { rows: number; colors: number; dropAfter: number }> = {
  easy: { rows: 4, colors: 4, dropAfter: 10 },
  normal: { rows: 5, colors: 5, dropAfter: 8 },
  hard: { rows: 7, colors: 6, dropAfter: 6 },
};
const diffText: Record<Diff, { zh: string; en: string }> = {
  easy: { zh: '轻松', en: 'Breeze' },
  normal: { zh: '认真', en: 'Focus' },
  hard: { zh: '高手', en: 'Master' },
};

const stageRows = (diff: Diff, stage: number) => Math.min(DIFF[diff].rows + stage - 1, 8);
const stageColors = (diff: Diff, stage: number) => Math.min(DIFF[diff].colors + Math.floor((stage - 1) / 2), 6);

type Grid = Array<Array<number | null>>; // grid[r][c]：null 空，1..6 泡泡颜色

interface Projectile { x: number; y: number; vx: number; vy: number }

interface Engine {
  diff: Diff;
  stage: number;
  grid: Grid;
  parityBase: number; // 行奇偶基准：云层下降 +1，与行号错开抵消，保持旧行物理位置
  cur: number;
  next: number;
  score: number;
  popped: number;
  stagesCleared: number;
  combo: number;
  shots: number; // 距下次云层下降已发射的泡泡数
  activeMs: number;
  over: boolean;
}

type Ev =
  | { k: 'stick'; r: number; c: number; base: number; x: number; y: number }
  | { k: 'pop'; popped: number; fallen: number; gained: number; combo: number; cx: number; cy: number; cells: Array<{ x: number; y: number; color: number }>; drops: Array<{ x: number; y: number; color: number }> }
  | { k: 'dropRow' }
  | { k: 'over' };

const rowSlots = (r: number, base: number) => ((r + base) % 2 === 0 ? COLS : COLS - 1);
const rowOffset = (r: number, base: number) => ((r + base) % 2) * 0.5;
const cellX = (r: number, c: number, base: number) => c + rowOffset(r, base) + 0.5;
const cellY = (r: number) => (r + 0.5) * ROW_H;
const LAUNCH_Y = LAUNCH_ROW * ROW_H;

function neighborsOf(r: number, c: number, base: number): ReadonlyArray<readonly [number, number]> {
  const odd = (r + base) % 2 !== 0;
  return odd
    ? [[r, c - 1], [r, c + 1], [r - 1, c], [r - 1, c + 1], [r + 1, c], [r + 1, c + 1]]
    : [[r, c - 1], [r, c + 1], [r - 1, c - 1], [r - 1, c], [r + 1, c - 1], [r + 1, c]];
}

function colorAt(e: Engine, r: number, c: number): number | null {
  if (r < 0 || r >= e.grid.length || c < 0 || c >= rowSlots(r, e.parityBase)) return null;
  return e.grid[r]![c] ?? null;
}

/* 棋盘上仍存在的颜色（发泡不发“废泡”，只从场上颜色里挑） */
function colorsOnBoard(e: Engine): number[] {
  const set = new Set<number>();
  for (const row of e.grid) for (const v of row) if (v) set.add(v);
  return [...set];
}

function pickColor(e: Engine, total: number): number {
  const present = colorsOnBoard(e);
  if (present.length) return present[Math.floor(Math.random() * present.length)]!;
  return 1 + Math.floor(Math.random() * total);
}

/* 初始云层：带聚簇生成（大概率沿用左/左上邻居颜色），自然出现可消的组合 */
function buildGrid(rows: number, colors: number): Grid {
  const grid: Grid = [];
  for (let r = 0; r < rows; r++) {
    const slots = r % 2 === 0 ? COLS : COLS - 1;
    const row: Array<number | null> = [];
    const upper = grid[r - 1];
    for (let c = 0; c < slots; c++) {
      const inherit: number[] = [];
      const left = row[c - 1];
      if (left && left <= colors) inherit.push(left);
      if (upper) {
        const up = upper[c];
        const upSide = upper[c - 1 + (r % 2 === 0 ? 0 : 1)];
        if (up && up <= colors) inherit.push(up);
        if (upSide && upSide <= colors) inherit.push(upSide);
      }
      const v = inherit.length && Math.random() < 0.62
        ? inherit[Math.floor(Math.random() * inherit.length)]!
        : 1 + Math.floor(Math.random() * colors);
      row.push(v);
    }
    grid.push(row);
  }
  return grid;
}

function freshEngine(diff: Diff, stage = 1, keep?: Partial<Engine>): Engine {
  const e: Engine = {
    diff,
    stage,
    grid: buildGrid(stageRows(diff, stage), stageColors(diff, stage)),
    parityBase: 0,
    cur: 1,
    next: 1,
    score: keep?.score ?? 0,
    popped: keep?.popped ?? 0,
    stagesCleared: keep?.stagesCleared ?? 0,
    combo: 0,
    shots: 0,
    activeMs: keep?.activeMs ?? 0,
    over: false,
  };
  const total = stageColors(diff, stage);
  e.cur = pickColor(e, total);
  e.next = pickColor(e, total);
  return e;
}

/* 距离发射点最近的合法空位（贴着已有泡泡，或顶行任意空位） */
function snapCell(e: Engine, px: number, py: number): { r: number; c: number } | null {
  let best: { r: number; c: number } | null = null;
  let bestD = Infinity;
  const consider = (r: number, c: number) => {
    if (r < 0 || r > DANGER_ROW || c < 0 || c >= rowSlots(r, e.parityBase)) return;
    if (e.grid[r] === undefined) e.grid[r] = Array<number | null>(rowSlots(r, e.parityBase)).fill(null);
    if (e.grid[r]![c]) return;
    const dx = cellX(r, c, e.parityBase) - px;
    const dy = cellY(r) - py;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = { r, c }; }
  };
  const maxRow = Math.min(e.grid.length + 1, DANGER_ROW + 1);
  for (let r = 0; r < maxRow; r++) {
    for (let c = 0; c < rowSlots(r, e.parityBase); c++) {
      if (r !== 0 && colorAt(e, r, c) === null) continue; // 只沿已有泡泡找锚点
      for (const [nr, nc] of neighborsOf(r, c, e.parityBase)) {
        if (colorAt(e, nr, nc) === null) consider(nr, nc);
      }
    }
  }
  for (let c = 0; c < rowSlots(0, e.parityBase); c++) consider(0, c);
  return best;
}

/* 从炮台沿方向模拟弹道（含侧壁反弹），返回途经点与首个碰撞点 */
function tracePath(e: Engine, angleDeg: number): { pts: Array<{ x: number; y: number }>; hit: { x: number; y: number } | null } {
  const rad = (angleDeg * Math.PI) / 180;
  let x = COLS / 2 + Math.cos(rad) * MUZZLE;
  let y = LAUNCH_Y - Math.sin(rad) * MUZZLE;
  let dx = Math.cos(rad);
  const dy = -Math.sin(rad);
  const pts: Array<{ x: number; y: number }> = [{ x, y }];
  let hit: { x: number; y: number } | null = null;
  const occupied: Array<{ x: number; y: number }> = [];
  for (let r = 0; r < e.grid.length; r++) {
    for (let c = 0; c < rowSlots(r, e.parityBase); c++) {
      if (e.grid[r]![c]) occupied.push({ x: cellX(r, c, e.parityBase), y: cellY(r) });
    }
  }
  for (let i = 0; i < 160 && !hit; i++) {
    x += dx * GUIDE_STEP;
    y += dy * GUIDE_STEP;
    if (x < 0.5) { x = 1 - x; dx = -dx; }
    if (x > COLS - 0.5) { x = 2 * (COLS - 0.5) - x; dx = -dx; }
    pts.push({ x, y });
    if (y <= 0.5 + ROW_H * 0.2) {
      hit = { x, y };
      break;
    }
    for (const o of occupied) {
      const ddx = o.x - x;
      const ddy = o.y - y;
      if (ddx * ddx + ddy * ddy < HIT_DIST * HIT_DIST) { hit = { x, y }; break; }
    }
  }
  return { pts, hit };
}

/* 同色连通簇（含起点） */
function clusterOf(e: Engine, r: number, c: number): Array<[number, number]> {
  const color = colorAt(e, r, c);
  if (!color) return [];
  const seen = new Set<string>([`${r},${c}`]);
  const out: Array<[number, number]> = [[r, c]];
  for (let i = 0; i < out.length; i++) {
    const [cr, cc] = out[i]!;
    for (const [nr, nc] of neighborsOf(cr, cc, e.parityBase)) {
      const key = `${nr},${nc}`;
      if (seen.has(key) || colorAt(e, nr, nc) !== color) continue;
      seen.add(key);
      out.push([nr, nc]);
    }
  }
  return out;
}

/* 悬空泡泡：消散后与顶行不再连通的泡泡会整簇坠落 */
function floatingCells(e: Engine): Array<[number, number]> {
  const anchored = new Set<string>();
  const queue: Array<[number, number]> = [];
  for (let c = 0; c < rowSlots(0, e.parityBase); c++) {
    if (e.grid[0]![c]) { anchored.add(`0,${c}`); queue.push([0, c]); }
  }
  while (queue.length) {
    const [cr, cc] = queue.pop()!;
    for (const [nr, nc] of neighborsOf(cr, cc, e.parityBase)) {
      const key = `${nr},${nc}`;
      if (anchored.has(key) || colorAt(e, nr, nc) === null) continue;
      anchored.add(key);
      queue.push([nr, nc]);
    }
  }
  const out: Array<[number, number]> = [];
  for (let r = 0; r < e.grid.length; r++) {
    for (let c = 0; c < rowSlots(r, e.parityBase); c++) {
      if (e.grid[r]![c] && !anchored.has(`${r},${c}`)) out.push([r, c]);
    }
  }
  return out;
}

function boardEmpty(e: Engine): boolean {
  return colorsOnBoard(e).length === 0;
}

function maxOccupiedRow(e: Engine): number {
  for (let r = e.grid.length - 1; r >= 0; r--) {
    if (e.grid[r]!.some((v) => v)) return r;
  }
  return -1;
}

/* 云层下降：顶上长出新一行，旧行整体压低一行（奇偶基准同步 +1 保持物理位置） */
function dropRow(e: Engine, colors: number): boolean {
  const base = e.parityBase + 1;
  const slots = rowSlots(0, base);
  const row: Array<number | null> = [];
  for (let c = 0; c < slots; c++) row.push(1 + Math.floor(Math.random() * colors));
  e.grid = [row, ...e.grid];
  e.parityBase = base;
  return maxOccupiedRow(e) >= DANGER_ROW;
}

/* 泡泡沉降后的完整结算：粘连 → 三消 → 悬空坠落 → 云层下降 → 关卡清算 */
function settle(e: Engine, p: Projectile): Ev {
  const cell = snapCell(e, p.x, p.y);
  if (!cell) return { k: 'over' };
  const { r, c } = cell;
  e.grid[r]![c] = e.cur;
  e.cur = e.next;
  const colors = stageColors(e.diff, e.stage);
  e.next = pickColor(e, colors);

  const cluster = clusterOf(e, r, c);
  if (cluster.length >= POP_MIN) {
    e.combo += 1;
    const cells: Array<{ x: number; y: number; color: number }> = [];
    for (const [cr, cc] of cluster) {
      cells.push({ x: cellX(cr, cc, e.parityBase), y: cellY(cr), color: colorAt(e, cr, cc)! });
      e.grid[cr]![cc] = null;
    }
    const drops: Array<{ x: number; y: number; color: number }> = [];
    for (const [fr, fc] of floatingCells(e)) {
      drops.push({ x: cellX(fr, fc, e.parityBase), y: cellY(fr), color: colorAt(e, fr, fc)! });
      e.grid[fr]![fc] = null;
    }
    const popped = cluster.length;
    const fallen = drops.length;
    const gained = popped * 10 + fallen * 20 + (e.combo - 1) * 25;
    e.score += gained;
    e.popped += popped + fallen;
    const cx = cells.reduce((s, v) => s + v.x, 0) / cells.length;
    const cy = cells.reduce((s, v) => s + v.y, 0) / cells.length;
    // 场上颜色清空后，换掉手里已无用颜色的泡泡
    const present = new Set(colorsOnBoard(e));
    if (present.size) {
      if (!present.has(e.cur)) e.cur = pickColor(e, colors);
      if (!present.has(e.next)) e.next = pickColor(e, colors);
    }
    if (boardEmpty(e)) {
      e.stage += 1;
      e.stagesCleared += 1;
      e.score += STAGE_BONUS;
    }
    return { k: 'pop', popped, fallen, gained, combo: e.combo, cx, cy, cells, drops };
  }

  e.combo = 0;
  e.shots += 1;
  if (r >= DANGER_ROW) return { k: 'over' };
  if (e.shots >= DIFF[e.diff].dropAfter) {
    e.shots = 0;
    if (dropRow(e, colors)) return { k: 'over' };
    return { k: 'dropRow' };
  }
  return { k: 'stick', r, c, base: e.parityBase, x: cellX(r, c, e.parityBase), y: cellY(r) };
}

interface Snapshot {
  grid: Grid;
  parityBase: number;
  cur: number;
  next: number;
  score: number;
  stage: number;
  popped: number;
  combo: number;
  shots: number;
  dropAfter: number;
  danger: boolean;
}

function buildSnapshot(e: Engine): Snapshot {
  return {
    grid: e.grid.map((row) => [...row]),
    parityBase: e.parityBase,
    cur: e.cur,
    next: e.next,
    score: e.score,
    stage: e.stage,
    popped: e.popped,
    combo: e.combo,
    shots: e.shots,
    dropAfter: DIFF[e.diff].dropAfter,
    danger: maxOccupiedRow(e) >= DANGER_ROW - 2,
  };
}

interface Spark { id: number; x: number; y: number; dx: number; dy: number; color: string }

export default function BubbleShooterGame({ lang, playerName, onComplete, headerAction }: BubbleShooterGameProps) {
  const isZh = lang === 'zh';
  const sound = useStore((s) => s.sound);
  const [phase, setPhase] = useState<Phase>('ready');
  const [difficulty, setDifficulty] = useState<Diff>('normal');
  const [snap, setSnap] = useState<Snapshot>(() => buildSnapshot(freshEngine('normal')));
  const [angle, setAngle] = useState(90);
  const [flying, setFlying] = useState(false);
  const [best, setBest] = useState({ score: 0, stage: 1 });
  const [toast, setToast] = useState<string | null>(null);
  const [floats, setFloats] = useState<Array<{ id: number; text: string; x: number; y: number; big: boolean }>>([]);
  const [bursts, setBursts] = useState<Array<{ id: number; delay: number; x: number; y: number; color: number }>>([]);
  const [fallings, setFallings] = useState<Array<{ id: number; delay: number; sway: number; x: number; y: number; color: number }>>([]);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [boardShake, setBoardShake] = useState(false);
  const [cascading, setCascading] = useState(false); // 开局/换层时云阵瀑布式入场
  const [landCell, setLandCell] = useState<string | null>(null); // 刚粘附的泡泡（回弹动画）
  const [lastResult, setLastResult] = useState<{ score: number; stage: number; popped: number; record: boolean } | null>(null);
  const engRef = useRef<Engine>(freshEngine('normal'));
  const projRef = useRef<Projectile | null>(null);
  const projElRef = useRef<HTMLDivElement | null>(null);
  const boardElRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<Phase>('ready');
  const angleRef = useRef(90);
  const handleRef = useRef<(ev: Ev) => void>(() => {});
  const timersRef = useRef<number[]>([]);
  const seqRef = useRef(0);

  const pctX = useCallback((x: number) => `${(x / COLS) * 100}%`, []);
  const pctY = useCallback((y: number) => `${(y / (ROW_H * TOTAL_ROWS)) * 100}%`, []);
  const pctRow = useCallback((r: number) => `${((r + 0.5) / TOTAL_ROWS) * 100}%`, []);
  const later = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  }, []);

  const applyAngle = useCallback((deg: number) => {
    const clamped = Math.min(AIM_MAX, Math.max(AIM_MIN, deg));
    angleRef.current = clamped;
    setAngle(clamped);
  }, []);

  const publish = useCallback(() => setSnap(buildSnapshot(engRef.current)), []);

  const gameOver = useCallback(() => {
    const e = engRef.current;
    if (e.over) return;
    e.over = true;
    projRef.current = null;
    setFlying(false);
    const sec = Math.max(1, Math.round(e.activeMs / 1000));
    const record = e.score > 0 && e.score >= best.score;
    setLastResult({ score: e.score, stage: e.stage, popped: e.popped, record });
    setBest((cur) => ({ score: Math.max(cur.score, e.score), stage: Math.max(cur.stage, e.stage) }));
    phaseRef.current = 'over';
    setPhase('over');
    sfx.bubOver();
    onComplete({ score: e.score, stages: e.stagesCleared, popped: e.popped, difficulty: e.diff, durationSec: sec });
    publish();
  }, [best.score, onComplete, publish]);

  const handleEvent = (ev: Ev) => {
    switch (ev.k) {
      case 'stick': {
        sfx.bubStick();
        const landKey = `${ev.base}-${ev.r}-${ev.c}`;
        setLandCell(landKey);
        later(() => setLandCell((cur) => (cur === landKey ? null : cur)), 460);
        break;
      }
      case 'pop': {
        sfx.bubPop(ev.popped, ev.combo, ev.fallen);
        const big = ev.popped + ev.fallen >= 6 || ev.combo >= 3;
        const floatId = ++seqRef.current;
        setFloats((cur) => [...cur.slice(-2), { id: floatId, text: `+${ev.gained}`, x: ev.cx, y: ev.cy, big }]);
        later(() => setFloats((cur) => cur.filter((f) => f.id !== floatId)), 950);
        // 爆泡按离落点的涟漪顺序错峰炸开（与音效的逐颗“啵”声同步）
        const burstIds = ev.cells.map((c, i) => ({ id: ++seqRef.current, delay: Math.min(i * 55, 330), ...c }));
        const dropIds = ev.drops.map((c, i) => ({ id: ++seqRef.current, delay: 130 + (i % 4) * 70, sway: i % 2 ? 2.2 : -2.2, ...c }));
        setBursts((cur) => [...cur.slice(-40), ...burstIds]);
        setFallings((cur) => [...cur.slice(-24), ...dropIds]);
        later(() => setBursts((cur) => cur.filter((b) => !burstIds.some((n) => n.id === b.id))), 1150);
        later(() => setFallings((cur) => cur.filter((b) => !dropIds.some((n) => n.id === b.id))), 1300);
        // 爆泡碎星：每颗消散的泡泡迸出本色光斑与少量白星
        const spark: Spark[] = [];
        ev.cells.forEach((c) => {
          for (let i = 0; i < 4; i++) {
            spark.push({
              id: ++seqRef.current,
              x: c.x,
              y: c.y,
              dx: Math.round(-64 + Math.random() * 128),
              dy: Math.round(-76 + Math.random() * 118),
              color: Math.random() < 0.3 ? SPARK_WHITE : SPARK_DEEP[c.color - 1]!,
            });
          }
        });
        setSparks((cur) => [...cur.slice(-48), ...spark]);
        later(() => setSparks((cur) => cur.filter((s) => !spark.some((n) => n.id === s.id))), 860);
        if (ev.popped + ev.fallen >= 5) {
          setBoardShake(true);
          later(() => setBoardShake(false), 320);
        }
        const parts: string[] = [];
        if (ev.popped) parts.push(isZh ? `砰！消掉 ${ev.popped} 颗` : `${ev.popped} popped!`);
        if (ev.fallen) parts.push(isZh ? `救出 ${ev.fallen} 颗` : `${ev.fallen} saved!`);
        if (ev.combo >= 2) parts.push(isZh ? `连击 ×${ev.combo}` : `Combo ×${ev.combo}`);
        setToast(parts.join(' · '));
        if (boardEmpty(engRef.current)) {
          phaseRef.current = 'clear';
          setPhase('clear');
          later(() => sfx.bubStage(), 260);
        }
        break;
      }
      case 'dropRow':
        sfx.bubDrop();
        setBoardShake(true);
        later(() => setBoardShake(false), 340);
        setToast(isZh ? '云层下降啦！小心泡泡越过警戒线' : 'The clouds sink! Mind the danger line');
        break;
      case 'over':
        gameOver();
        return;
    }
    publish();
  };
  handleRef.current = handleEvent;

  /* ---------- 发射 ---------- */
  const [kick, setKick] = useState(false);
  const shoot = useCallback(() => {
    if (phaseRef.current !== 'playing' || projRef.current) return;
    const rad = (angleRef.current * Math.PI) / 180;
    projRef.current = {
      x: COLS / 2 + Math.cos(rad) * MUZZLE,
      y: LAUNCH_Y - Math.sin(rad) * MUZZLE,
      vx: Math.cos(rad) * SPEED,
      vy: -Math.sin(rad) * SPEED,
    };
    setFlying(true);
    setKick(true);
    later(() => setKick(false), 200);
    sfx.bubShoot();
  }, [later]);

  /* 主循环：计时时钟 + 飞行泡泡步进（飞行泡泡命令式直写 DOM，避免整帧 React 重渲染） */
  useEffect(() => {
    if (phase !== 'playing') return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      const e = engRef.current;
      e.activeMs += dt;
      const p = projRef.current;
      if (p) {
        let remain = (dt / 1000) * SPEED;
        let ev: Ev | null = null;
        while (remain > 0 && !ev) {
          const move = Math.min(remain, SUBSTEP);
          p.x += (p.vx / SPEED) * move;
          p.y += (p.vy / SPEED) * move;
          remain -= move;
          if (p.x < 0.5) { p.x = 1 - p.x; p.vx = -p.vx; }
          if (p.x > COLS - 0.5) { p.x = 2 * (COLS - 0.5) - p.x; p.vx = -p.vx; }
          if (p.y <= 0.5 + ROW_H * 0.2) { ev = settle(e, p); break; }
          let hit = false;
          for (let r = 0; !hit && r < e.grid.length; r++) {
            for (let c = 0; c < rowSlots(r, e.parityBase); c++) {
              if (!e.grid[r]![c]) continue;
              const dx = cellX(r, c, e.parityBase) - p.x;
              const dy = cellY(r) - p.y;
              if (dx * dx + dy * dy < HIT_DIST * HIT_DIST) { hit = true; break; }
            }
          }
          if (hit) ev = settle(e, p);
        }
        if (projElRef.current) {
          projElRef.current.style.left = pctX(p.x);
          projElRef.current.style.top = pctY(p.y);
        }
        if (ev) {
          projRef.current = null;
          setFlying(false);
          handleRef.current(ev);
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
     
  }, [phase]);

  const startGame = useCallback((diff: Diff) => {
    engRef.current = freshEngine(diff);
    projRef.current = null;
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    setDifficulty(diff);
    applyAngle(90);
    setFlying(false);
    setLastResult(null);
    setToast(null);
    setFloats([]);
    setBursts([]);
    setFallings([]);
    setSparks([]);
    setBoardShake(false);
    setLandCell(null);
    setKick(false);
    setCascading(true);
    later(() => setCascading(false), 820);
    phaseRef.current = 'playing';
    setPhase('playing');
    publish();
  }, [applyAngle, later, publish]);

  const nextStage = useCallback(() => {
    const e = engRef.current;
    engRef.current = freshEngine(e.diff, e.stage, { score: e.score, popped: e.popped, stagesCleared: e.stagesCleared, activeMs: e.activeMs });
    projRef.current = null;
    applyAngle(90);
    setFlying(false);
    setLandCell(null);
    setCascading(true);
    later(() => setCascading(false), 820);
    phaseRef.current = 'playing';
    setPhase('playing');
    publish();
  }, [applyAngle, later, publish]);

  const togglePause = useCallback(() => {
    if (phaseRef.current === 'playing') {
      phaseRef.current = 'paused';
      setPhase('paused');
    } else if (phaseRef.current === 'paused') {
      phaseRef.current = 'playing';
      setPhase('playing');
    }
  }, []);

  const swapBubble = useCallback(() => {
    if (phaseRef.current !== 'playing' || projRef.current) return;
    const e = engRef.current;
    const cur = e.cur;
    e.cur = e.next;
    e.next = cur;
    sfx.bubSwap();
    publish();
  }, [publish]);

  const aimBy = useCallback((delta: number) => {
    if (phaseRef.current !== 'playing' || projRef.current) return;
    applyAngle(angleRef.current + delta);
  }, [applyAngle]);

  // 触屏瞄准键：按下即转一格，长按连续转动
  const aimHoldRef = useRef<{ timer: number } | null>(null);
  const pressAim = (delta: number) => {
    aimBy(delta);
    if (aimHoldRef.current) window.clearInterval(aimHoldRef.current.timer);
    aimHoldRef.current = { timer: window.setInterval(() => aimBy(delta), 110) };
  };
  const releaseAim = () => {
    if (aimHoldRef.current) {
      window.clearInterval(aimHoldRef.current.timer);
      aimHoldRef.current = null;
    }
  };

  /* ---------- 指针瞄准：棋盘内按下拖动瞄准，松手发射 ---------- */
  const pointerAngle = (ev: React.PointerEvent<HTMLDivElement>): number => {
    const board = boardElRef.current;
    if (!board) return angleRef.current;
    const rect = board.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * COLS;
    const y = ((ev.clientY - rect.top) / rect.height) * ROW_H * TOTAL_ROWS;
    return (Math.atan2(LAUNCH_Y - y, x - COLS / 2) * 180) / Math.PI;
  };
  const onBoardPointerDown = (ev: React.PointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== 'playing' || projRef.current) return;
    ev.currentTarget.setPointerCapture(ev.pointerId);
    applyAngle(pointerAngle(ev));
  };
  const onBoardPointerMove = (ev: React.PointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== 'playing' || projRef.current) return;
    if (ev.pointerType === 'mouse' && ev.buttons === 0) return;
    applyAngle(pointerAngle(ev));
  };
  const onBoardPointerUp = (ev: React.PointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== 'playing' || projRef.current) return;
    applyAngle(pointerAngle(ev));
    shoot();
  };
  const guardPointer = (ev: React.SyntheticEvent) => ev.preventDefault();

  /* ---------- 键盘 ---------- */
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
        case 'ArrowLeft': ev.preventDefault(); aimBy(AIM_STEP); break;
        case 'ArrowRight': ev.preventDefault(); aimBy(-AIM_STEP); break;
        case ' ': ev.preventDefault(); shoot(); break;
        case 'x': case 'X': ev.preventDefault(); swapBubble(); break;
        default: break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [aimBy, difficulty, shoot, startGame, swapBubble, togglePause]);

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
    timersRef.current.forEach((id) => window.clearTimeout(id));
    if (aimHoldRef.current) window.clearInterval(aimHoldRef.current.timer);
  }, []);

  /* 「云泡圆舞曲」背景音乐：随游戏挂载/卸载启停，跟随全局声音开关 */
  useEffect(() => {
    if (!sound) return;
    sfx.bubblesBgmStart();
    return () => sfx.bubblesBgmStop();
  }, [sound]);

  // 通关面板 3 秒后自动飞往下一云层
  useEffect(() => {
    if (phase !== 'clear') return;
    const timer = window.setTimeout(() => nextStage(), 3000);
    return () => window.clearTimeout(timer);
  }, [phase, nextStage]);

  /* 引导点与落点预览 */
  const guide = useMemo(() => {
    if (phase !== 'playing' || flying) return { dots: [] as Array<{ x: number; y: number }>, ring: null as { x: number; y: number } | null };
    const e = engRef.current;
    const { pts, hit } = tracePath(e, angle);
    const dots = pts.filter((_, i) => i > 0 && i % GUIDE_GAP === 0).slice(0, GUIDE_MAX);
    let ring: { x: number; y: number } | null = null;
    if (hit) {
      const cell = snapCell(e, hit.x, hit.y);
      if (cell) ring = { x: cellX(cell.r, cell.c, e.parityBase), y: cellY(cell.r) };
    }
    return { dots, ring };
     
  }, [angle, flying, phase, snap]);

  const bubbles: Array<{ key: string; r: number; c: number; color: number; x: number }> = [];
  for (let r = 0; r < snap.grid.length; r++) {
    for (let c = 0; c < snap.grid[r]!.length; c++) {
      const color = snap.grid[r]![c];
      if (color) bubbles.push({ key: `${snap.parityBase}-${r}-${c}`, r, c, color, x: cellX(r, c, snap.parityBase) });
    }
  }
  // 开局/换层的瀑布入场按 (行+列) 错峰，呈对角波扫过云阵
  const entryDelay = (r: number, c: number) => `${(r + c) * 26}ms`;

  const bestScoreView = Math.max(best.score, snap.score);
  const bestStageView = Math.max(best.stage, snap.stage);
  const phaseLabel = phase === 'playing' ? (isZh ? '进行中' : 'RUNNING') : phase === 'paused' ? (isZh ? '暂停' : 'PAUSED') : phase === 'over' ? (isZh ? '已结束' : 'ENDED') : phase === 'clear' ? (isZh ? '云层突破' : 'CLEAR') : (isZh ? '待开始' : 'READY');
  const hint = phase === 'playing'
    ? (isZh ? `瞄准同色泡泡发射，三颗相连就会消散。还有 ${snap.dropAfter - snap.shots} 泡云层下降。` : `Match 3 colors to pop. Clouds sink in ${snap.dropAfter - snap.shots} bubbles.`)
    : phase === 'paused'
      ? (isZh ? '休息一下，点「继续」接着吹泡。' : 'Take a break, press resume to keep popping.')
      : phase === 'over'
        ? (isZh ? '泡泡越过警戒线啦，再来挑战更高的分数吧！' : 'Bubbles crossed the line — go for a higher score!')
        : phase === 'clear'
          ? (isZh ? '云层被清空啦！马上飞往更高一层。' : 'Layer cleared! Flying up to the next one.')
          : (isZh ? '选好云层浓度，点「开始游戏」出发。' : 'Pick a density and press start.');

  return (
    <section className="bb-bubbledragon" aria-labelledby="bb-title">
      <header className="bb-heading">
        {headerAction ?? (<div className="bb-title-seal arcade-art" aria-hidden="true" />)}
        <div>
          <span>{isZh ? '消除 · 泡泡龙' : 'MATCH · BUBBLE DRAGON'}</span>
          <h2 id="bb-title">{isZh ? '云海泡泡龙' : 'Cloud Bubble Dragon'}</h2>
          <p>{isZh ? '转动泡泡龙炮台瞄准发射，三颗同色泡泡碰在一起就会砰砰消散，悬空的小泡泡还会掉下来加分！' : 'Aim the dragon cannon and shoot bubbles — match 3 colors to pop them and free floating bubbles for bonus points!'}</p>
        </div>
        <div className="bb-session" aria-label={isZh ? '本次访问最佳' : 'Session best'}>
          <span>{isZh ? '最高分' : 'Best score'} <b>{bestScoreView || '--'}</b></span>
          <em aria-hidden="true">·</em>
          <span>{isZh ? '最高云层' : 'Best layer'} <b>{best.score ? `Lv.${bestStageView}` : '--'}</b></span>
        </div>
      </header>

      <div className="bb-table">
        <div className="bb-stage">
          <div className="bb-board-wrap">
            <div
              ref={boardElRef}
              className={`bb-board${boardShake ? ' shake' : ''}${snap.danger && phase === 'playing' ? ' danger' : ''}`}
              role="application"
              aria-label={isZh
                ? `云海泡泡龙棋盘，10 列蜂窝阵，当前分数 ${snap.score}，第 ${snap.stage} 云层，已消 ${snap.popped} 颗泡泡，距离云层下降还有 ${snap.dropAfter - snap.shots} 泡`
                : `Bubble dragon board, 10-column honeycomb, score ${snap.score}, layer ${snap.stage}, ${snap.popped} popped, ${snap.dropAfter - snap.shots} bubbles until the clouds sink`}
              onPointerDown={onBoardPointerDown}
              onPointerMove={onBoardPointerMove}
              onPointerUp={onBoardPointerUp}
              onPointerCancel={guardPointer}
              onContextMenu={guardPointer}
            >
              <div className="bb-ceiling" aria-hidden="true"><i /><i /><i /></div>
              <div className="bb-danger-line" aria-hidden="true"><span>{isZh ? '警戒线' : 'DANGER'}</span></div>

              {bubbles.map((b) => (
                <span
                  key={b.key}
                  className={`bb-bubble c${b.color}${cascading ? ' bb-in' : ''}${b.key === landCell ? ' land' : ''}`}
                  style={{ left: pctX(b.x), top: pctRow(b.r), animationDelay: cascading ? entryDelay(b.r, b.c) : undefined }}
                />
              ))}

              {bursts.map((b) => (
                <span key={`x${b.id}`} className={`bb-burst c${b.color}`} style={{ left: pctX(b.x), top: pctY(b.y), animationDelay: `${b.delay}ms` }} />
              ))}

              {fallings.map((b) => (
                <span key={`f${b.id}`} className={`bb-falling c${b.color}`} style={{ left: pctX(b.x), top: pctY(b.y), animationDelay: `${b.delay}ms`, '--sw': `${b.sway}cqw` } as React.CSSProperties} />
              ))}

              {sparks.map((s) => (
                <i
                  key={`s${s.id}`}
                  className="bb-spark"
                  style={{ left: pctX(s.x), top: pctY(s.y), '--dx': `${s.dx}px`, '--dy': `${s.dy}px`, '--sp': s.color } as React.CSSProperties}
                />
              ))}

              {guide.ring && (
                <span className="bb-snap-ring" style={{ left: pctX(guide.ring.x), top: pctY(guide.ring.y) }} aria-hidden="true"><i /></span>
              )}

              {guide.dots.map((d, i) => (
                <i key={i} className="bb-dot" style={{ left: pctX(d.x), top: pctY(d.y), opacity: Math.max(0.18, 0.72 - i * 0.045) }} aria-hidden="true" />
              ))}

              <div className="bb-launcher" aria-hidden="true">
                <div className="bb-launcher-dock" />
                <div className="bb-launcher-mount" />
                <div className="bb-aim-wrap" style={{ transform: `rotate(${-angle}deg)` }}>
                  <div className={`bb-barrel${kick ? ' kick' : ''}`} />
                  {!flying && <span className={`bb-loader bb-bubble c${snap.cur}`} />}
                </div>
              </div>

              {flying && (
                <div ref={projElRef} className={`bb-proj bb-bubble c${snap.cur}`} style={{ left: pctX(COLS / 2), top: pctRow(LAUNCH_ROW) }} />
              )}

              <button
                type="button"
                className="bb-next-cradle"
                aria-label={isZh ? '下一颗泡泡，点击与当前泡泡交换' : 'Next bubble, click to swap with current'}
                disabled={phase !== 'playing'}
                onClick={swapBubble}
              >
                <small>{isZh ? '下一颗' : 'Next'}</small>
                <span className={`bb-bubble c${snap.next}`} />
              </button>

              {floats.map((f) => (
                <span key={`t${f.id}`} className={`bb-float${f.big ? ' big' : ''}`} style={{ left: pctX(f.x), top: pctY(f.y) }}>{f.text}</span>
              ))}

              {phase === 'ready' && (
                <div className="bb-overlay">
                  <b>{isZh ? '准备吹泡' : 'Ready to pop'}</b>
                  <p>{isZh ? `${playerName}，云海上飘满了彩色泡泡。瞄准同色泡泡发射，三颗相连就会消散，别让泡泡越过警戒线！` : `${playerName}, the clouds are full of bubbles. Match 3 colors to pop them — don't let bubbles cross the danger line!`}</p>
                  <button type="button" className="bb-overlay-btn" onClick={() => startGame(difficulty)}>
                    <span aria-hidden="true">✦</span>{isZh ? '开始游戏' : 'Start'}
                  </button>
                  <small>{isZh ? '键盘：← → 瞄准 · 空格发射 · X 换泡泡 · P 暂停；也可在棋盘上拖动瞄准、松手发射' : 'Keys: ← → aim · Space shoot · X swap · P pause; or drag on the board to aim'}</small>
                </div>
              )}
              {phase === 'paused' && (
                <div className="bb-overlay dim">
                  <b>{isZh ? '暂停中' : 'Paused'}</b>
                  <div className="bb-overlay-row">
                    <button type="button" className="bb-overlay-btn" onClick={togglePause}>{isZh ? '继续 (P)' : 'Resume'}</button>
                    <button type="button" className="bb-overlay-btn ghost" onClick={() => startGame(difficulty)}>{isZh ? '重新开局' : 'Restart'}</button>
                  </div>
                </div>
              )}
              {phase === 'clear' && (
                <div className="bb-overlay clear">
                  <b>{isZh ? `第 ${snap.stage - 1} 云层突破！` : `Layer ${snap.stage - 1} cleared!`}</b>
                  <p>{isZh ? `奖励 +${STAGE_BONUS} 分，泡泡龙驮着你飞向第 ${snap.stage} 云层。` : `+${STAGE_BONUS} bonus — the dragon carries you up to layer ${snap.stage}.`}</p>
                  <div className="bb-overlay-row">
                    <button type="button" className="bb-overlay-btn" onClick={nextStage}>{isZh ? '下一云层' : 'Next layer'}</button>
                    <button type="button" className="bb-overlay-btn ghost" onClick={() => startGame(difficulty)}>{isZh ? '重新开局' : 'Restart'}</button>
                  </div>
                  <small>{isZh ? '3 秒后自动出发' : 'Auto-continue in 3s'}</small>
                </div>
              )}
              {phase === 'over' && lastResult && (
                <div className="bb-overlay over">
                  <b>{isZh ? '泡泡漫过警戒线！' : 'Bubbles overran the line!'}</b>
                  {lastResult.record && <em className="bb-record">{isZh ? '★ 新纪录！' : '★ New best!'}</em>}
                  <div className="bb-final">
                    <span>{isZh ? '分数' : 'Score'}<b>{lastResult.score}</b></span>
                    <span>{isZh ? '云层' : 'Layer'}<b>Lv.{lastResult.stage}</b></span>
                    <span>{isZh ? '消泡' : 'Popped'}<b>{lastResult.popped}</b></span>
                  </div>
                  <button type="button" className="bb-overlay-btn" onClick={() => startGame(difficulty)}>
                    <span aria-hidden="true">↻</span>{isZh ? '再来一局' : 'Play again'}
                  </button>
                </div>
              )}
            </div>

            {toast && <div className="bb-toast" role="status">{toast}</div>}

            <div className="bb-touchpad" aria-label={isZh ? '泡泡龙操作按钮' : 'Bubble controls'}>
              <button
                type="button"
                aria-label={isZh ? '向左瞄准，长按连续转动' : 'Aim left, hold to sweep'}
                disabled={phase !== 'playing'}
                onPointerDown={(e) => { guardPointer(e); pressAim(AIM_STEP); }}
                onPointerUp={releaseAim}
                onPointerLeave={releaseAim}
                onPointerCancel={releaseAim}
                onContextMenu={guardPointer}
              >
                <span aria-hidden="true">↺</span>
              </button>
              <button type="button" aria-label={isZh ? '发射泡泡' : 'Shoot bubble'} className="bb-shoot-btn" disabled={phase !== 'playing'} onClick={shoot}>
                <span aria-hidden="true">⬆</span>{isZh ? '发射' : 'Shoot'}
              </button>
              <button
                type="button"
                aria-label={isZh ? '向右瞄准，长按连续转动' : 'Aim right, hold to sweep'}
                disabled={phase !== 'playing'}
                onPointerDown={(e) => { guardPointer(e); pressAim(-AIM_STEP); }}
                onPointerUp={releaseAim}
                onPointerLeave={releaseAim}
                onPointerCancel={releaseAim}
                onContextMenu={guardPointer}
              >
                <span aria-hidden="true">↻</span>
              </button>
            </div>
          </div>
        </div>

        <aside className="bb-console">
          <div className="bb-status-box" aria-live="polite">
            <small>{isZh ? `本局 · ${phaseLabel}` : `ROUND · ${phaseLabel}`}</small>
            <div className="bb-score-row">
              <span>{isZh ? '分数' : 'Score'}</span>
              <b>{snap.score}</b>
            </div>
            <div className="bb-stats" aria-label={isZh ? '本局数据' : 'Round stats'}>
              <span>{isZh ? '云层' : 'Layer'} <b>Lv.{snap.stage}</b></span>
              <span>{isZh ? '消泡' : 'Popped'} <b>{snap.popped}</b></span>
              <span className={snap.combo >= 2 ? 'hot' : ''}>{isZh ? '连击' : 'Combo'} <b>{snap.combo >= 2 ? `×${snap.combo}` : '--'}</b></span>
            </div>
            <div className="bb-dropbar" aria-hidden="true">
              <i style={{ width: `${(snap.shots / snap.dropAfter) * 100}%` }} />
              <small>{isZh ? `再发 ${snap.dropAfter - snap.shots} 泡云层下降` : `${snap.dropAfter - snap.shots} until clouds sink`}</small>
            </div>
            <p>{hint}</p>
            <span className="bb-status-orbit" aria-hidden="true"><i /><i /><i /></span>
          </div>

          <div className="bb-ammo">
            <div className="bb-ammo-slot">
              <span>{isZh ? '当前 (空格)' : 'Current (Space)'}</span>
              <div className="bb-ammo-hold"><span className={`bb-bubble c${snap.cur}`} /></div>
            </div>
            <button type="button" className="bb-ammo-slot swap" onClick={swapBubble} disabled={phase !== 'playing'} aria-label={isZh ? '交换当前与下一颗泡泡' : 'Swap current and next bubble'}>
              <span>{isZh ? '下一颗 (X)' : 'Next (X)'}</span>
              <div className="bb-ammo-hold"><span className={`bb-bubble c${snap.next}`} /></div>
              <i aria-hidden="true">⇄</i>
            </button>
          </div>

          <div className="bb-difficulty">
            <span>{isZh ? '云层浓度' : 'CLOUD DENSITY'}</span>
            <div role="group" aria-label={isZh ? '选择云层浓度' : 'Choose density'}>
              {(Object.keys(diffText) as Diff[]).map((item) => (
                <button
                  type="button"
                  key={item}
                  className={difficulty === item ? 'active' : ''}
                  aria-pressed={difficulty === item}
                  disabled={phase === 'playing'}
                  aria-label={isZh ? `云层浓度 ${diffText[item].zh}（${DIFF[item].rows} 行泡泡 · ${DIFF[item].colors} 种颜色）${phase === 'playing' ? '，进行中不可切换' : ''}` : `Density ${diffText[item].en}`}
                  onClick={() => {
                    if (phase === 'ready') setDifficulty(item);
                    else startGame(item);
                  }}
                >
                  <i aria-hidden="true" />{diffText[item][lang]}
                </button>
              ))}
            </div>
            <small>{isZh ? `轻松 ${DIFF.easy.rows} 行 4 色 · 认真 ${DIFF.normal.rows} 行 5 色 · 高手 ${DIFF.hard.rows} 行 6 色；${phase === 'playing' ? '进行中不可切换' : '切换会开启新一局'}` : 'Breeze 4 rows/4 colors · Focus 5/5 · Master 7/6'}</small>
          </div>

          <div className="bb-actions">
            {(phase === 'playing' || phase === 'paused') && (
              <button type="button" onClick={togglePause}>
                <span aria-hidden="true">{phase === 'playing' ? '⏸' : '▶'}</span>
                {phase === 'playing' ? (isZh ? '暂停 (P)' : 'Pause') : (isZh ? '继续 (P)' : 'Resume')}
              </button>
            )}
            <button type="button" className="bb-primary" onClick={() => startGame(difficulty)}>
              <span aria-hidden="true">↻</span>
              {phase === 'ready' ? (isZh ? '开始游戏' : 'Start') : phase === 'over' ? (isZh ? '再来一局' : 'Play again') : (isZh ? '重新开局' : 'Restart')}
            </button>
          </div>

          <div className="bb-rule-note">
            <span aria-hidden="true">10×</span>
            <p>{isZh ? '三颗同色相连即消散 · 悬空泡泡全部掉落加分 · 连续消泡叠连击 · 清空云层飞向下一层' : 'Match 3 to pop · floating bubbles drop for bonus · chain pops combo · clear all to fly up'}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
