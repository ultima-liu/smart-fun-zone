import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { sfx } from '../sfx';
import './breakout.css';

export interface BreakoutOutcome {
  score: number;
  stages: number; // 已通关的关卡数
  bricks: number; // 敲碎的星砖数
  difficulty: 'easy' | 'normal' | 'hard';
  durationSec: number;
}

interface BreakoutGameProps {
  headerAction?: ReactNode;
  lang: 'zh' | 'en';
  playerName: string;
  onComplete: (outcome: BreakoutOutcome) => void;
}

type Diff = 'easy' | 'normal' | 'hard';
type Phase = 'ready' | 'playing' | 'paused' | 'clear' | 'over';
type PowerKind = 'wide' | 'multi' | 'slow' | 'life';

/* ---------- 场地几何（逻辑单位，渲染时换算成百分比） ---------- */
const FW = 90;  // 场地宽
const FH = 120; // 场地高
const COLS = 8;
const BRICK_W = 9.2;
const BRICK_H = 4.4;
const GAP_X = 1.2;
const GAP_Y = 1.6;
const BRICK_TOP = 7;
const BALL_R = 1.7;
const PADDLE_Y = FH - 9;
const PADDLE_H = 3.4;
const MAX_LIVES = 5;
const MAX_BALLS = 6;
const WIDE_MS = 20000;
const SLOW_MS = 12000;
const SLOW_FACTOR = 0.72;
const PADDLE_KEY_SPEED = 96;
const DROP_FALL = 24;
const TRAIL_N = 6;
const SPARK_COLORS = ['#ffd9e2', '#ffe9a8', '#9be7ff', '#cfaaff', '#ffffff'];

const brickX = (col: number) => 4 + col * (BRICK_W + GAP_X);
const brickY = (row: number) => BRICK_TOP + row * (BRICK_H + GAP_Y);

const DIFF: Record<Diff, { speed: number; lives: number; padW: number }> = {
  easy: { speed: 46, lives: 4, padW: 18 },
  normal: { speed: 55, lives: 3, padW: 16 },
  hard: { speed: 64, lives: 2, padW: 14.5 },
};

const diffText: Record<Diff, { zh: string; en: string }> = {
  easy: { zh: '轻松', en: 'Breeze' },
  normal: { zh: '认真', en: 'Focus' },
  hard: { zh: '高手', en: 'Master' },
};

const powerText: Record<PowerKind, { zh: string; en: string; glyph: string }> = {
  wide: { zh: '云舟加宽', en: 'Wide paddle', glyph: '↔' },
  multi: { zh: '星弹分裂', en: 'Multi ball', glyph: '✦' },
  slow: { zh: '云絮减速', en: 'Slow ball', glyph: '❄' },
  life: { zh: '补充云力', en: 'Extra life', glyph: '♥' },
};

/* 关卡砖阵模板：'.'空 '1'普通 '2'硬砖(2击) '3'铁砖(3击) */
const PATTERNS: string[][] = [
  ['11111111', '11111111', '11111111', '11111111'],
  ['1.1.1.1.', '.1.1.1.1', '1.1.1.1.', '.1.1.1.1', '1.1.1.1.'],
  ['..1111..', '.111111.', '11111111', '111..111', '11....11'],
  ['...11...', '..1111..', '.111111.', '11111111', '.1....1.'],
  ['22222222', '21111112', '21.11.12', '21111112', '22222222'],
  ['11.22.11', '11.22.11', '11.22.11', '11.22.11', '1..11..1'],
];

interface Brick {
  id: number;
  col: number;
  row: number;
  hp: number;
  maxHp: number;
  power: PowerKind | null;
  alive: boolean;
}

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  stuck: boolean;
  trail: Array<{ x: number; y: number }>;
}

interface Drop {
  id: number;
  x: number;
  y: number;
  kind: PowerKind;
}

interface Engine {
  diff: Diff;
  stage: number;
  bricks: Brick[];
  aliveCount: number;
  balls: Ball[];
  drops: Drop[];
  paddleX: number;
  basePadW: number;
  padW: number;
  wideUntil: number;
  slowUntil: number;
  lives: number;
  score: number;
  bricksBroken: number;
  stagesCleared: number;
  combo: number;
  activeMs: number;
  keys: { left: boolean; right: boolean };
  seq: number;
  over: boolean;
}

type Ev =
  | { k: 'brick'; killed: boolean; hard: boolean; gained: number; combo: number; col: number; row: number; power: PowerKind | null; x: number; y: number }
  | { k: 'paddle'; combo: number }
  | { k: 'wall' }
  | { k: 'power'; kind: PowerKind }
  | { k: 'powerEnd'; kind: PowerKind }
  | { k: 'life'; lives: number }
  | { k: 'stage' }
  | { k: 'over' }
  | { k: 'launch' };

function pickPower(): PowerKind {
  const r = Math.random();
  if (r < 0.3) return 'wide';
  if (r < 0.58) return 'multi';
  if (r < 0.85) return 'slow';
  return 'life';
}

function buildStage(stage: number, seq: number): { bricks: Brick[]; alive: number } {
  const pattern = PATTERNS[(stage - 1) % PATTERNS.length] ?? PATTERNS[0]!;
  const bricks: Brick[] = [];
  let id = seq;
  let alive = 0;
  for (let row = 0; row < pattern.length; row++) {
    const line = pattern[row] ?? '';
    for (let col = 0; col < COLS; col++) {
      const ch = line[col] ?? '.';
      if (ch === '.') continue;
      let hp = ch === '2' ? 2 : ch === '3' ? 3 : 1;
      // 关卡越高，普通砖越容易升级成硬砖
      if (hp === 1 && stage >= 4 && Math.random() < Math.min(0.1 * (stage - 3), 0.45)) hp = 2;
      bricks.push({ id: ++id, col, row, hp, maxHp: hp, power: null, alive: true });
      alive += 1;
    }
  }
  // 随机指定星辉砖（掉落道具），保底 2 块
  const carriers = bricks.filter(() => Math.random() < 0.15);
  while (carriers.length < 2 && bricks.length >= 2) {
    const pick = bricks[Math.floor(Math.random() * bricks.length)]!;
    if (!carriers.includes(pick)) carriers.push(pick);
  }
  carriers.forEach((b) => { b.power = pickPower(); });
  return { bricks, alive };
}

function currentSpeed(e: Engine): number {
  const base = DIFF[e.diff].speed * (1 + Math.min(e.stage - 1, 8) * 0.07);
  return e.activeMs < e.slowUntil ? base * SLOW_FACTOR : base;
}

function freshBall(e: Engine, id: number): Ball {
  return { id, x: e.paddleX, y: PADDLE_Y - BALL_R - 0.3, vx: 0, vy: 0, stuck: true, trail: [] };
}

function freshEngine(diff: Diff): Engine {
  const e: Engine = {
    diff,
    stage: 1,
    bricks: [],
    aliveCount: 0,
    balls: [],
    drops: [],
    paddleX: FW / 2,
    basePadW: DIFF[diff].padW,
    padW: DIFF[diff].padW,
    wideUntil: 0,
    slowUntil: 0,
    lives: DIFF[diff].lives,
    score: 0,
    bricksBroken: 0,
    stagesCleared: 0,
    combo: 0,
    activeMs: 0,
    keys: { left: false, right: false },
    seq: 0,
    over: false,
  };
  const st = buildStage(1, 0);
  e.bricks = st.bricks;
  e.aliveCount = st.alive;
  e.seq = st.bricks.length;
  e.balls = [freshBall(e, ++e.seq)];
  return e;
}

function launchBalls(e: Engine): Ev[] {
  const evs: Ev[] = [];
  for (const b of e.balls) {
    if (!b.stuck) continue;
    const a = (Math.random() - 0.5) * 0.9; // 与竖直方向的最大夹角约 ±26°
    const sp = currentSpeed(e);
    b.vx = sp * Math.sin(a);
    b.vy = -sp * Math.cos(a);
    b.stuck = false;
    evs.push({ k: 'launch' });
  }
  return evs;
}

/** 圆与砖的碰撞：返回命中的砖，并顺手完成反弹与位置修正 */
function collideBrick(ball: Ball, b: Brick): boolean {
  const bx0 = brickX(b.col);
  const by0 = brickY(b.row);
  const bx1 = bx0 + BRICK_W;
  const by1 = by0 + BRICK_H;
  const cx = Math.min(Math.max(ball.x, bx0), bx1);
  const cy = Math.min(Math.max(ball.y, by0), by1);
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  if (dx * dx + dy * dy >= BALL_R * BALL_R) return false;
  if (dx === 0 && dy === 0) {
    // 球心已进入砖内（罕见）：按速度主轴弹开
    if (Math.abs(ball.vx) > Math.abs(ball.vy)) ball.vx = -ball.vx;
    else ball.vy = -ball.vy;
    return true;
  }
  const px = BALL_R - Math.abs(dx);
  const py = BALL_R - Math.abs(dy);
  if (px < py) {
    ball.vx = dx > 0 ? Math.abs(ball.vx) : -Math.abs(ball.vx);
    ball.x = dx > 0 ? bx1 + BALL_R : bx0 - BALL_R;
  } else {
    ball.vy = dy > 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy);
    ball.y = dy > 0 ? by1 + BALL_R : by0 - BALL_R;
  }
  return true;
}

function damageBrick(e: Engine, b: Brick, ball: Ball): Ev[] {
  b.hp -= 1;
  e.combo += 1;
  const evs: Ev[] = [];
  if (b.hp <= 0) {
    b.alive = false;
    e.aliveCount -= 1;
    e.bricksBroken += 1;
    const gained = 10 + 5 * Math.min(e.combo - 1, 10);
    e.score += gained;
    if (b.power) e.drops.push({ id: ++e.seq, x: brickX(b.col) + BRICK_W / 2, y: brickY(b.row) + BRICK_H / 2, kind: b.power });
    evs.push({ k: 'brick', killed: true, hard: b.maxHp > 1, gained, combo: e.combo, col: b.col, row: b.row, power: b.power, x: ball.x, y: ball.y });
    if (e.aliveCount === 0) {
      e.stagesCleared += 1;
      e.score += 300;
      e.combo = 0;
      evs.push({ k: 'stage' });
    }
  } else {
    evs.push({ k: 'brick', killed: false, hard: true, gained: 0, combo: e.combo, col: b.col, row: b.row, power: null, x: ball.x, y: ball.y });
  }
  return evs;
}

function applyPower(e: Engine, kind: PowerKind): Ev[] {
  if (kind === 'wide') {
    e.wideUntil = e.activeMs + WIDE_MS;
    e.padW = e.basePadW * 1.55;
  } else if (kind === 'slow') {
    e.slowUntil = e.activeMs + SLOW_MS;
  } else if (kind === 'life') {
    e.lives = Math.min(e.lives + 1, MAX_LIVES);
  } else {
    const src = e.balls[0];
    if (src && e.balls.length < MAX_BALLS) {
      // 星弹还停在云舟上时先给出向上初速，避免克隆出零速球
      if (src.stuck) {
        const sp0 = currentSpeed(e);
        src.vx = 0;
        src.vy = -sp0;
        src.stuck = false;
      }
      for (const da of [-0.6, 0.6]) {
        const m = Math.hypot(src.vx, src.vy) || 1;
        const ca = Math.cos(da);
        const sa = Math.sin(da);
        e.balls.push({
          id: ++e.seq,
          x: src.x,
          y: src.y,
          vx: (src.vx / m) * ca - (src.vy / m) * sa,
          vy: (src.vx / m) * sa + (src.vy / m) * ca,
          stuck: false,
          trail: [],
        });
        if (e.balls.length >= MAX_BALLS) break;
      }
    }
  }
  return [{ k: 'power', kind }];
}

function loseLife(e: Engine): Ev[] {
  e.lives -= 1;
  e.combo = 0;
  e.wideUntil = 0;
  e.slowUntil = 0;
  e.padW = e.basePadW;
  e.drops = [];
  if (e.lives <= 0) {
    // over 标记由 gameOver() 统一置位（那里的防重入判断会挡掉二次调用）
    return [{ k: 'life', lives: 0 }, { k: 'over' }];
  }
  e.balls = [freshBall(e, ++e.seq)];
  return [{ k: 'life', lives: e.lives }];
}

function tick(e: Engine, dt: number): Ev[] {
  e.activeMs += dt;
  const evs: Ev[] = [];

  // 道具失效检测
  if (e.wideUntil > 0 && e.activeMs >= e.wideUntil) {
    e.wideUntil = 0;
    e.padW = e.basePadW;
    evs.push({ k: 'powerEnd', kind: 'wide' });
  }
  if (e.slowUntil > 0 && e.activeMs >= e.slowUntil) {
    e.slowUntil = 0;
    evs.push({ k: 'powerEnd', kind: 'slow' });
  }

  // 云舟：键盘连续移动
  const dir = (e.keys.right ? 1 : 0) - (e.keys.left ? 1 : 0);
  if (dir !== 0) {
    e.paddleX += dir * PADDLE_KEY_SPEED * (dt / 1000);
  }
  const half0 = e.padW / 2;
  e.paddleX = Math.min(Math.max(e.paddleX, half0 + 0.5), FW - half0 - 0.5);

  // 下落的星辉道具
  for (let i = e.drops.length - 1; i >= 0; i--) {
    const d = e.drops[i]!;
    d.y += (DROP_FALL * dt) / 1000;
    if (d.y >= PADDLE_Y - 1 && d.y <= PADDLE_Y + PADDLE_H + 2 && Math.abs(d.x - e.paddleX) <= half0 + 2) {
      e.drops.splice(i, 1);
      evs.push(...applyPower(e, d.kind));
    } else if (d.y > FH + 3) {
      e.drops.splice(i, 1);
    }
  }

  const sp = currentSpeed(e);
  const sec = dt / 1000;
  let lostBall: Ball | null = null;
  // 道具可能改变云舟宽度，碰撞用最新半宽
  const half = e.padW / 2;

  for (const ball of e.balls) {
    if (ball.stuck) {
      ball.x = e.paddleX;
      ball.y = PADDLE_Y - BALL_R - 0.3;
    } else {
      // 子步进防穿透：单步位移不超过 0.8 个单位
      const dist = sp * sec;
      const steps = Math.max(1, Math.ceil(dist / 0.8));
      const sub = dist / steps;
      for (let s = 0; s < steps && !ball.stuck; s++) {
        ball.x += (ball.vx / sp) * sub;
        ball.y += (ball.vy / sp) * sub;
        // 云壁
        if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); evs.push({ k: 'wall' }); }
        if (ball.x > FW - BALL_R) { ball.x = FW - BALL_R; ball.vx = -Math.abs(ball.vx); evs.push({ k: 'wall' }); }
        if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); evs.push({ k: 'wall' }); }
        // 云舟：圆-矩形精确碰撞。落到船面按落点控角反弹；擦到船首（顶角外沿）
        // 也按 60° 弹开（宽容边沿）；从侧面或船底碰到则沿穿透轴弹开，
        // 星弹不会在船边的“空气里”弹起、也不会滑进云舟底下。
        const bx0 = e.paddleX - half;
        const bx1 = e.paddleX + half;
        const cx = Math.min(Math.max(ball.x, bx0), bx1);
        const cy = Math.min(Math.max(ball.y, PADDLE_Y), PADDLE_Y + PADDLE_H);
        const pdx = ball.x - cx;
        const pdy = ball.y - cy;
        const overlaps = pdx * pdx + pdy * pdy < BALL_R * BALL_R;
        const inSpan = Math.abs(ball.x - e.paddleX) <= half;
        // 云舟兜底捞起：下落中的星弹只要还在船的横向跨度内、已滑到船底以下但未入云海，一律弹回
        const scoop = ball.vy > 0 && inSpan && ball.y > PADDLE_Y + PADDLE_H && ball.y < FH - BALL_R;
        if (overlaps || scoop) {
          if (ball.vy > 0 && (pdy < 0 || inSpan)) {
            // 自上方压到船面/船首，或云舟滑到下落星弹下方（捞起）：落点控制反弹角（边缘最陡约 60°）
            const off = Math.min(Math.max((ball.x - e.paddleX) / half, -1), 1);
            const a = off * 1.05;
            ball.vx = sp * Math.sin(a);
            ball.vy = -sp * Math.cos(a);
            ball.y = PADDLE_Y - BALL_R;
          } else if (overlaps && pdx === 0 && pdy === 0) {
            // 球心已进入船体（云舟瞬移压到星弹等）：直接向上弹出
            ball.vy = -Math.abs(ball.vy);
            ball.y = PADDLE_Y - BALL_R;
          } else if (overlaps) {
            // 上升中擦到船侧/船底：按较小穿透轴弹开并推出，避免视觉穿模
            const px = BALL_R - Math.abs(pdx);
            const py = BALL_R - Math.abs(pdy);
            if (px < py) {
              ball.vx = pdx > 0 ? Math.abs(ball.vx) : -Math.abs(ball.vx);
              ball.x = pdx > 0 ? bx1 + BALL_R : bx0 - BALL_R;
            } else {
              ball.vy = pdy > 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy);
              ball.y = pdy > 0 ? PADDLE_Y + PADDLE_H + BALL_R : PADDLE_Y - BALL_R;
            }
          }
          e.combo = 0;
          evs.push({ k: 'paddle', combo: 0 });
        }
        // 星砖
        for (const b of e.bricks) {
          if (!b.alive) continue;
          if (collideBrick(ball, b)) {
            evs.push(...damageBrick(e, b, ball));
            break;
          }
        }
        if (e.over || e.aliveCount === 0) break;
      }
      // 拖尾采样
      ball.trail.unshift({ x: ball.x, y: ball.y });
      if (ball.trail.length > TRAIL_N) ball.trail.length = TRAIL_N;
    }
    // 星弹坠海
    if (!ball.stuck && ball.y - BALL_R > FH) lostBall = ball;
  }

  if (lostBall) {
    e.balls = e.balls.filter((b) => b !== lostBall);
    if (e.balls.length === 0 && !e.over) evs.push(...loseLife(e));
  }
  if (e.over || e.aliveCount === 0) return evs;

  // 归一化速度 + 防水平死循环
  for (const ball of e.balls) {
    if (ball.stuck) continue;
    const m = Math.hypot(ball.vx, ball.vy) || 1;
    ball.vx = (ball.vx / m) * sp;
    ball.vy = (ball.vy / m) * sp;
    if (Math.abs(ball.vy) < sp * 0.18) {
      ball.vy = (ball.vy >= 0 ? 1 : -1) * sp * 0.18;
      const rem = Math.sqrt(Math.max(sp * sp - ball.vy * ball.vy, 0));
      ball.vx = (ball.vx >= 0 ? 1 : -1) * rem;
    }
  }
  return evs;
}

function nextStage(e: Engine): void {
  e.stage += 1;
  e.combo = 0;
  e.drops = [];
  const st = buildStage(e.stage, e.seq);
  e.bricks = st.bricks;
  e.aliveCount = st.alive;
  e.seq += st.bricks.length;
  e.balls = [freshBall(e, ++e.seq)];
}

/* ---------- React 快照：只包含离散变化的信息（球/云舟/拖尾走命令式 DOM） ---------- */
interface Snapshot {
  bricks: Brick[];
  score: number;
  lives: number;
  stage: number;
  stagesCleared: number;
  bricksBroken: number;
  combo: number;
  aliveCount: number;
  bricksTotal: number;
  wide: boolean;
  slow: boolean;
}

function buildSnapshot(e: Engine): Snapshot {
  return {
    bricks: e.bricks.filter((b) => b.alive),
    score: e.score,
    lives: e.lives,
    stage: e.stage,
    stagesCleared: e.stagesCleared,
    bricksBroken: e.bricksBroken,
    combo: e.combo,
    aliveCount: e.aliveCount,
    bricksTotal: e.bricks.length,
    wide: e.wideUntil > e.activeMs,
    slow: e.slowUntil > e.activeMs,
  };
}

const pct = (v: number, whole: number) => `${(v / whole) * 100}%`;

interface FloatItem { id: number; text: string; top: number; left: number; big: boolean }
interface SparkItem { id: number; x: number; y: number; dx: number; dy: number; color: string }
interface ShardItem { id: number; row: number; left: number; top: number; width: number; height: number }

export default function BreakoutGame({ lang, playerName, onComplete, headerAction }: BreakoutGameProps) {
  const isZh = lang === 'zh';
  const sound = useStore((s) => s.sound);
  const [phase, setPhase] = useState<Phase>('ready');
  const [difficulty, setDifficulty] = useState<Diff>('normal');
  const [snap, setSnap] = useState<Snapshot>(() => buildSnapshot(freshEngine('normal')));
  const [best, setBest] = useState({ score: 0, stage: 0 });
  const [toast, setToast] = useState<string | null>(null);
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const [sparks, setSparks] = useState<SparkItem[]>([]);
  const [shards, setShards] = useState<ShardItem[]>([]);
  const [lastResult, setLastResult] = useState<{ score: number; stage: number; bricks: number; record: boolean } | null>(null);
  const engRef = useRef<Engine>(freshEngine('normal'));
  const phaseRef = useRef<Phase>('ready');
  const handleRef = useRef<(evs: Ev[]) => void>(() => {});
  const boardRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const paddleElRef = useRef<HTMLDivElement>(null);
  const tipElRef = useRef<HTMLDivElement>(null);
  const ballElsRef = useRef<Map<number, { el: HTMLDivElement; trail: HTMLElement[] }>>(new Map());
  const dropElsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const flashTimerRef = useRef(0);
  const floatSeq = useRef(0);
  const floatTimers = useRef<number[]>([]);
  phaseRef.current = phase;

  /* ---------- 命令式渲染层：星弹 / 拖尾 / 云舟 / 道具每帧直写 DOM，绕过 React ---------- */
  const paintLive = useCallback(() => {
    const e = engRef.current;
    const live = liveRef.current;
    if (!live) return;

    // 星弹与拖尾
    const seen = new Set<number>();
    for (const ball of e.balls) {
      seen.add(ball.id);
      let entry = ballElsRef.current.get(ball.id);
      if (!entry) {
        const el = document.createElement('div');
        el.className = 'bk-ball';
        const trail: HTMLElement[] = [];
        for (let i = 0; i < TRAIL_N; i++) {
          const t = document.createElement('i');
          t.className = `bk-dot t${i}`;
          live.appendChild(t);
          trail.push(t);
        }
        live.appendChild(el);
        entry = { el, trail };
        ballElsRef.current.set(ball.id, entry);
      }
      const { el, trail } = entry;
      el.style.left = pct(ball.x, FW);
      el.style.top = pct(ball.y, FH);
      el.setAttribute('data-x', String(Math.round(ball.x * 10) / 10));
      el.setAttribute('data-y', String(Math.round(ball.y * 10) / 10));
      for (let i = 0; i < trail.length; i++) {
        const t = trail[i]!;
        const p = ball.trail[i];
        if (!p) { t.style.opacity = '0'; continue; }
        t.style.left = pct(p.x, FW);
        t.style.top = pct(p.y, FH);
      }
    }
    for (const [id, entry] of ballElsRef.current) {
      if (!seen.has(id)) {
        entry.el.remove();
        entry.trail.forEach((t) => t.remove());
        ballElsRef.current.delete(id);
      }
    }

    // 云舟
    const pad = paddleElRef.current;
    if (pad) {
      pad.style.left = pct(e.paddleX - e.padW / 2, FW);
      pad.style.width = pct(e.padW, FW);
      pad.classList.toggle('wide', e.wideUntil > e.activeMs);
      pad.setAttribute('data-x', String(Math.round(e.paddleX * 10) / 10));
    }
    const tip = tipElRef.current;
    if (tip) {
      const anyStuck = e.balls.some((b) => b.stuck);
      tip.style.opacity = anyStuck ? '' : '0';
      tip.style.left = pct(e.paddleX, FW);
    }

    // 下落道具
    const seenDrops = new Set<number>();
    for (const d of e.drops) {
      seenDrops.add(d.id);
      let el = dropElsRef.current.get(d.id);
      if (!el) {
        el = document.createElement('div');
        el.className = `bk-drop ${d.kind}`;
        el.innerHTML = `<span>${powerText[d.kind].glyph}</span>`;
        live.appendChild(el);
        dropElsRef.current.set(d.id, el);
      }
      el.style.left = pct(d.x, FW);
      el.style.top = pct(d.y, FH);
    }
    for (const [id, el] of dropElsRef.current) {
      if (!seenDrops.has(id)) {
        el.remove();
        dropElsRef.current.delete(id);
      }
    }
  }, []);

  const publish = useCallback(() => setSnap(buildSnapshot(engRef.current)), []);

  const gameOver = useCallback(() => {
    const e = engRef.current;
    if (e.over) return;
    e.over = true;
    e.keys.left = false;
    e.keys.right = false;
    const sec = Math.max(1, Math.round(e.activeMs / 1000));
    const record = e.score > 0 && e.score >= best.score && e.stage >= best.stage;
    setLastResult({ score: e.score, stage: e.stage, bricks: e.bricksBroken, record });
    setBest((cur) => ({ score: Math.max(cur.score, e.score), stage: Math.max(cur.stage, e.stage) }));
    phaseRef.current = 'over';
    setPhase('over');
    sfx.brkOver();
    onComplete({ score: e.score, stages: e.stagesCleared, bricks: e.bricksBroken, difficulty: e.diff, durationSec: sec });
    publish();
  }, [best.score, best.stage, onComplete, publish]);

  const addFloat = (text: string, x: number, y: number, big: boolean) => {
    const item = { id: ++floatSeq.current, text, top: y / FH, left: x / FW, big };
    setFloats((cur) => [...cur.slice(-3), item]);
    floatTimers.current.push(window.setTimeout(() => {
      setFloats((cur) => cur.filter((f) => f.id !== item.id));
    }, 900));
  };

  const burstSparks = (x: number, y: number, count: number) => {
    const burst: SparkItem[] = [];
    for (let i = 0; i < count; i++) {
      burst.push({
        id: ++floatSeq.current,
        x: (x / FW) * 100,
        y: (y / FH) * 100,
        dx: Math.round(-80 + Math.random() * 160),
        dy: Math.round(-90 + Math.random() * 120),
        color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)]!,
      });
    }
    setSparks((cur) => [...cur.slice(-48), ...burst]);
    floatTimers.current.push(window.setTimeout(() => {
      setSparks((cur) => cur.filter((s) => !burst.some((b) => b.id === s.id)));
    }, 800));
  };

  const flashPaddle = () => {
    const pad = paddleElRef.current;
    if (!pad) return;
    pad.classList.add('flash');
    window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => pad.classList.remove('flash'), 180);
  };

  const handleEvents = (evs: Ev[]) => {
    let dirty = false;
    for (const ev of evs) {
      if (ev.k === 'brick') {
        dirty = true;
        if (ev.killed) {
          sfx.brkBreak(ev.combo);
          addFloat(`+${ev.gained}`, ev.x, ev.y, ev.combo >= 5);
          burstSparks(ev.x, ev.y, ev.hard ? 12 : 8);
          const shard: ShardItem = {
            id: ++floatSeq.current,
            row: ev.row,
            left: (brickX(ev.col) / FW) * 100,
            top: (brickY(ev.row) / FH) * 100,
            width: (BRICK_W / FW) * 100,
            height: (BRICK_H / FH) * 100,
          };
          setShards((cur) => [...cur.slice(-6), shard]);
          floatTimers.current.push(window.setTimeout(() => {
            setShards((cur) => cur.filter((s) => s.id !== shard.id));
          }, 520));
          if (ev.combo >= 4) setToast(isZh ? `连击 ×${ev.combo}！` : `Combo ×${ev.combo}!`);
        } else {
          sfx.brkChip();
          burstSparks(ev.x, ev.y, 3);
        }
      } else if (ev.k === 'paddle') {
        dirty = true;
        sfx.brkBounce();
        flashPaddle();
      } else if (ev.k === 'wall') {
        sfx.brkWall();
      } else if (ev.k === 'power') {
        dirty = true;
        sfx.brkPower();
        const info = powerText[ev.kind];
        setToast(isZh ? `${info.glyph} ${info.zh}！` : `${info.glyph} ${info.en}!`);
        if (ev.kind === 'life') addFloat(isZh ? '+1 ♥' : '+1 ♥', engRef.current.paddleX, PADDLE_Y - 6, true);
      } else if (ev.k === 'powerEnd') {
        dirty = true;
      } else if (ev.k === 'life') {
        dirty = true;
        sfx.brkLife();
        setToast(isZh ? `星弹坠海…剩余 ${ev.lives} 次云力` : `Ball lost… ${ev.lives} left`);
      } else if (ev.k === 'stage') {
        dirty = true;
        sfx.brkStage();
        phaseRef.current = 'clear';
        setPhase('clear');
      } else if (ev.k === 'launch') {
        sfx.brkLaunch();
      } else if (ev.k === 'over') {
        gameOver();
        return;
      }
    }
    if (dirty) publish();
  };
  handleRef.current = handleEvents;

  /* ---------- 主循环 ---------- */
  // 挂载即绘制一次：待开始阶段也能看到停在云舟上的星弹
  useEffect(() => {
    paintLive();
  }, [paintLive]);

  useEffect(() => {
    if (phase !== 'playing') return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      const e = engRef.current;
      const evs = tick(e, dt);
      paintLive();
      if (evs.length) handleRef.current(evs);
      if (!engRef.current.over && engRef.current.aliveCount > 0 && phaseRef.current === 'playing') {
        raf = requestAnimationFrame(loop);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, paintLive]);

  const startGame = useCallback((diff: Diff) => {
    engRef.current = freshEngine(diff);
    floatTimers.current.forEach((id) => window.clearTimeout(id));
    floatTimers.current = [];
    setDifficulty(diff);
    setLastResult(null);
    setToast(null);
    setFloats([]);
    setSparks([]);
    setShards([]);
    phaseRef.current = 'playing';
    setPhase('playing');
    publish();
    // 等快照渲染完成后重绘命令式层
    window.requestAnimationFrame(() => paintLive());
  }, [paintLive, publish]);

  const goNextStage = useCallback(() => {
    if (phaseRef.current !== 'clear') return;
    nextStage(engRef.current);
    setToast(isZh ? `第 ${engRef.current.stage} 关，出发！` : `Stage ${engRef.current.stage}, go!`);
    phaseRef.current = 'playing';
    setPhase('playing');
    publish();
    window.requestAnimationFrame(() => paintLive());
  }, [isZh, paintLive, publish]);

  const togglePause = useCallback(() => {
    if (phaseRef.current === 'playing') {
      engRef.current.keys.left = false;
      engRef.current.keys.right = false;
      phaseRef.current = 'paused';
      setPhase('paused');
    } else if (phaseRef.current === 'paused') {
      phaseRef.current = 'playing';
      setPhase('playing');
    }
  }, []);

  const launch = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const evs = launchBalls(engRef.current);
    if (evs.length) handleRef.current(evs);
  }, []);

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
      if (ph === 'clear') {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          goNextStage();
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
        case 'ArrowLeft': case 'a': case 'A': ev.preventDefault(); engRef.current.keys.left = true; break;
        case 'ArrowRight': case 'd': case 'D': ev.preventDefault(); engRef.current.keys.right = true; break;
        case ' ': case 'ArrowUp': case 'w': case 'W': ev.preventDefault(); launch(); break;
        default: break;
      }
    };
    const onKeyUp = (ev: KeyboardEvent) => {
      const e = engRef.current;
      if (ev.key === 'ArrowLeft' || ev.key === 'a' || ev.key === 'A') e.keys.left = false;
      if (ev.key === 'ArrowRight' || ev.key === 'd' || ev.key === 'D') e.keys.right = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [difficulty, goNextStage, launch, startGame, togglePause]);

  /* ---------- 指针 / 触屏：悬停或拖动直接驾驶云舟，点按发射 ---------- */
  const fieldXFromPointer = (clientX: number): number | null => {
    const board = boardRef.current;
    if (!board) return null;
    const rect = board.getBoundingClientRect();
    if (rect.width === 0) return null;
    return ((clientX - rect.left) / rect.width) * FW;
  };
  const steerTo = (clientX: number) => {
    if (phaseRef.current !== 'playing') return;
    const x = fieldXFromPointer(clientX);
    if (x == null) return;
    const e = engRef.current;
    const half = e.padW / 2;
    e.paddleX = Math.min(Math.max(x, half + 0.5), FW - half - 0.5);
  };
  const onPointerMove = (ev: React.PointerEvent) => {
    steerTo(ev.clientX);
  };
  const onPointerDown = (ev: React.PointerEvent) => {
    steerTo(ev.clientX);
    launch();
  };
  const guardPointer = (ev: React.SyntheticEvent) => {
    ev.preventDefault();
  };

  // 触屏长按左右移动按钮
  const holdKey = (side: 'left' | 'right', on: boolean) => {
    engRef.current.keys[side] = on;
  };

  /* ---------- 切后台自动暂停 ---------- */
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
    window.clearTimeout(flashTimerRef.current);
  }, []);

  /* ---------- 「云海跃光」背景音乐 ---------- */
  useEffect(() => {
    if (!sound) return;
    sfx.breakoutBgmStart();
    return () => sfx.breakoutBgmStop();
  }, [sound]);

  const bestScoreView = Math.max(best.score, snap.score);
  const bestStageView = Math.max(best.stage, snap.stage);
  const clearProgress = snap.bricksTotal > 0 ? ((snap.bricksTotal - snap.aliveCount) / snap.bricksTotal) * 100 : 0;
  const phaseLabel = phase === 'playing' ? (isZh ? '进行中' : 'RUNNING') : phase === 'paused' ? (isZh ? '暂停' : 'PAUSED') : phase === 'clear' ? (isZh ? '通关' : 'CLEAR') : phase === 'over' ? (isZh ? '已结束' : 'ENDED') : (isZh ? '待开始' : 'READY');
  const hint = phase === 'playing'
    ? (isZh ? '移动云舟接住星弹，把它弹向星砖；别让星弹坠入云海！' : 'Steer the cloud boat to keep the star ball up and smash every brick!')
    : phase === 'paused'
      ? (isZh ? '休息一下，点「继续」接着弹。' : 'Take a break, press resume to keep bouncing.')
      : phase === 'clear'
        ? (isZh ? '漂亮！这片云海的星砖全部清空啦。' : 'Great job! You cleared every brick in this cloud sea.')
        : phase === 'over'
          ? (isZh ? '本局结束，再战一局冲更高分吧！' : 'Round over — bounce back for a higher score!')
          : (isZh ? '选好云力档位，点「开始游戏」起航。' : 'Pick a start level and press start.');

  const boardLabel = isZh
    ? `云舟弹星棋盘，第 ${snap.stage} 关，分数 ${snap.score}，剩余星砖 ${snap.aliveCount} 块，云力 ${snap.lives} 点`
    : `Star Bounce board, stage ${snap.stage}, score ${snap.score}, ${snap.aliveCount} bricks left, ${snap.lives} lives`;

  return (
    <section className="bk-starhop" aria-labelledby="bk-title">
      <header className="bk-heading">
        {headerAction ?? (<div className="bk-title-seal arcade-art" aria-hidden="true" />)}
        <div>
          <span>{isZh ? '敏捷 · 云海弹星' : 'REFLEX · CLOUD BOUNCE'}</span>
          <h2 id="bk-title">{isZh ? '云舟弹星' : 'Star Bounce'}</h2>
          <p>{isZh ? '驾驶云舟接住星弹，把云海上的星砖一一敲碎：连击加分、道具助力，一关比一关快！' : 'Pilot the cloud boat, bounce the star ball and clear the sky bricks — combos and power-ups help you go faster stage by stage!'}</p>
        </div>
        <div className="bk-session" aria-label={isZh ? '本次访问最佳' : 'Session best'}>
          <span>{isZh ? '最高分' : 'Best score'} <b>{bestScoreView || '--'}</b></span>
          <em aria-hidden="true">·</em>
          <span>{isZh ? '最远' : 'Best stage'} <b>{bestStageView > 0 ? `Lv.${bestStageView}` : '--'}</b></span>
        </div>
      </header>

      <div className="bk-table">
        <div className="bk-stage">
          <div className="bk-board-wrap">
            <div
              ref={boardRef}
              className={`bk-board${phase === 'over' ? ' dead' : ''}`}
              role="application"
              aria-label={boardLabel}
              onPointerMove={onPointerMove}
              onPointerDown={onPointerDown}
              onContextMenu={guardPointer}
            >
              <div className="bk-field" aria-hidden="true">
                {snap.bricks.map((b) => (
                  <span
                    key={b.id}
                    className={`bk-brick r${Math.min(b.row, 6)}${b.maxHp >= 3 ? ' armored' : b.maxHp === 2 ? ' hard' : ''}${b.hp < b.maxHp ? ' hurt' : ''}${b.power ? ' power' : ''}`}
                    style={{ left: pct(brickX(b.col), FW), top: pct(brickY(b.row), FH), width: pct(BRICK_W, FW), height: pct(BRICK_H, FH) }}
                  >
                    {b.power && <i>{powerText[b.power].glyph}</i>}
                  </span>
                ))}

                {shards.map((s) => (
                  <span key={s.id} className={`bk-shard r${Math.min(s.row, 6)}`} style={{ left: `${s.left}%`, top: `${s.top}%`, width: `${s.width}%`, height: `${s.height}%` }} />
                ))}

                {/* 命令式渲染层：星弹/拖尾/云舟/道具（每帧直写 DOM） */}
                <div ref={liveRef} className="bk-live" />
                <div ref={paddleElRef} className="bk-paddle" data-x={String(Math.round(engRef.current.paddleX * 10) / 10)}>
                  <i aria-hidden="true" />
                </div>
                <div ref={tipElRef} className="bk-launch-tip">{isZh ? '空格 / 点按 发射' : 'SPACE / TAP'}</div>

                {sparks.map((s) => (
                  <i
                    key={s.id}
                    className="bk-spark"
                    style={{ left: `${s.x}%`, top: `${s.y}%`, '--dx': `${s.dx}px`, '--dy': `${s.dy}px`, '--sp': s.color } as React.CSSProperties}
                  />
                ))}

                {floats.map((f) => (
                  <span key={f.id} className={`bk-float${f.big ? ' big' : ''}`} style={{ top: `${Math.round(f.top * 100)}%`, left: `${Math.round(f.left * 100)}%` }}>{f.text}</span>
                ))}
              </div>

              {phase === 'ready' && (
                <div className="bk-overlay">
                  <b>{isZh ? '准备弹星' : 'Ready to bounce'}</b>
                  <p>{isZh ? `${playerName}，云海上飘来了星砖阵！驾驶云舟接住星弹，把它们全部敲碎就能过关。` : `${playerName}, star bricks are drifting in! Keep the ball bouncing to clear them all.`}</p>
                  <button type="button" className="bk-overlay-btn" onClick={() => startGame(difficulty)}>
                    <span aria-hidden="true">✦</span>{isZh ? '开始游戏' : 'Start'}
                  </button>
                  <small>{isZh ? '键盘：← → / AD 移动 · 空格发射 · P 暂停；也可直接滑动棋盘驾驶云舟' : 'Keys: arrows / A D move · Space launch · P pause; or just slide on the board'}</small>
                </div>
              )}
              {phase === 'paused' && (
                <div className="bk-overlay dim">
                  <b>{isZh ? '暂停中' : 'Paused'}</b>
                  <div className="bk-overlay-row">
                    <button type="button" className="bk-overlay-btn" onClick={togglePause}>{isZh ? '继续 (P)' : 'Resume'}</button>
                    <button type="button" className="bk-overlay-btn ghost" onClick={() => startGame(difficulty)}>{isZh ? '重新开局' : 'Restart'}</button>
                  </div>
                </div>
              )}
              {phase === 'clear' && (
                <div className="bk-overlay clear">
                  <b>{isZh ? `第 ${snap.stage} 关告捷！` : `Stage ${snap.stage} cleared!`}</b>
                  <div className="bk-final">
                    <span>{isZh ? '分数' : 'Score'}<b>{snap.score}</b></span>
                    <span>{isZh ? '敲碎' : 'Bricks'}<b>{snap.bricksBroken}</b></span>
                    <span>{isZh ? '云力' : 'Lives'}<b>{snap.lives}</b></span>
                  </div>
                  <button type="button" className="bk-overlay-btn" onClick={goNextStage}>
                    <span aria-hidden="true">→</span>{isZh ? `进入第 ${snap.stage + 1} 关` : 'Next stage'}
                  </button>
                  <small>{isZh ? '每一关星弹都会更快一点，云力会在过关后保留。' : 'The ball speeds up each stage; leftover lives are kept.'}</small>
                </div>
              )}
              {phase === 'over' && lastResult && (
                <div className="bk-overlay over">
                  <b>{isZh ? '本局结束！' : 'Round over!'}</b>
                  {lastResult.record && <em className="bk-record">{isZh ? '★ 新纪录！' : '★ New best!'}</em>}
                  <div className="bk-final">
                    <span>{isZh ? '分数' : 'Score'}<b>{lastResult.score}</b></span>
                    <span>{isZh ? '关卡' : 'Stage'}<b>Lv.{lastResult.stage}</b></span>
                    <span>{isZh ? '敲碎' : 'Bricks'}<b>{lastResult.bricks}</b></span>
                  </div>
                  <button type="button" className="bk-overlay-btn" onClick={() => startGame(difficulty)}>
                    <span aria-hidden="true">↻</span>{isZh ? '再来一局' : 'Play again'}
                  </button>
                </div>
              )}
            </div>

            {toast && <div className="bk-toast" role="status">{toast}</div>}

            <div className="bk-touchpad" aria-label={isZh ? '云舟操作按钮' : 'Boat controls'}>
              <div className="bk-move">
                <button
                  type="button"
                  aria-label={isZh ? '向左移动' : 'Move left'}
                  disabled={phase !== 'playing'}
                  onPointerDown={(e) => { guardPointer(e); holdKey('left', true); }}
                  onPointerUp={() => holdKey('left', false)}
                  onPointerLeave={() => holdKey('left', false)}
                  onPointerCancel={() => holdKey('left', false)}
                  onContextMenu={guardPointer}
                >
                  <span aria-hidden="true">◀</span>
                </button>
                <button
                  type="button"
                  aria-label={isZh ? '向右移动' : 'Move right'}
                  disabled={phase !== 'playing'}
                  onPointerDown={(e) => { guardPointer(e); holdKey('right', true); }}
                  onPointerUp={() => holdKey('right', false)}
                  onPointerLeave={() => holdKey('right', false)}
                  onPointerCancel={() => holdKey('right', false)}
                  onContextMenu={guardPointer}
                >
                  <span aria-hidden="true">▶</span>
                </button>
              </div>
              <button
                type="button"
                className="bk-launch-btn"
                aria-label={isZh ? '发射星弹' : 'Launch ball'}
                disabled={phase !== 'playing'}
                onClick={launch}
              >
                <span aria-hidden="true">✦</span>{isZh ? '发射' : 'Launch'}
              </button>
            </div>
          </div>
        </div>

        <aside className="bk-console">
          <div className="bk-status-box" aria-live="polite">
            <span className="bk-status-orbit" aria-hidden="true"><i /><i /><i /></span>
            <small>{isZh ? `本局 · ${phaseLabel}` : `ROUND · ${phaseLabel}`}</small>
            <div className="bk-score-row">
              <span>{isZh ? '分数' : 'Score'}</span>
              <b>{snap.score}</b>
            </div>
            <div className="bk-stats" aria-label={isZh ? '本局数据' : 'Round stats'}>
              <span>{isZh ? '关卡' : 'Stage'} <b>Lv.{snap.stage}</b></span>
              <span className="bk-lives" aria-label={isZh ? `剩余云力 ${snap.lives} 点` : `${snap.lives} lives left`}>
                {isZh ? '云力' : 'Lives'}
                <i className="bk-lives-row" aria-hidden="true">
                  {Array.from({ length: MAX_LIVES }).map((_, i) => (
                    <u key={i} className={i < snap.lives ? 'on' : ''}>♥</u>
                  ))}
                </i>
              </span>
              <span className={snap.combo >= 2 ? 'hot' : ''}>{isZh ? '连击' : 'Combo'} <b>{snap.combo >= 2 ? `×${snap.combo}` : '--'}</b></span>
            </div>
            {(snap.wide || snap.slow) && (
              <div className="bk-power-chips" aria-label={isZh ? '生效中的道具' : 'Active power-ups'}>
                {snap.wide && <span className="wide">↔ {isZh ? '云舟加宽' : 'Wide'}</span>}
                {snap.slow && <span className="slow">❄ {isZh ? '云絮减速' : 'Slow'}</span>}
              </div>
            )}
            <div className="bk-levelbar" aria-hidden="true">
              <i style={{ width: `${clearProgress}%` }} />
              <small>{isZh ? `剩余星砖 ${snap.aliveCount} 块` : `${snap.aliveCount} bricks left`}</small>
            </div>
            <p>{hint}</p>
          </div>

          <div className="bk-power-note">
            <span className="bk-power-glyph" aria-hidden="true">✦</span>
            <div>
              <b>{isZh ? '星辉砖与道具' : 'Glowing bricks'}</b>
              <p>{isZh ? '带星标的星砖敲碎后会掉落道具：↔ 云舟加宽、✦ 星弹分裂、❄ 云絮减速、♥ 补充云力，用云舟接住即可生效。' : 'Star-marked bricks drop power-ups: wide paddle, multi ball, slow ball or extra life — catch them with the boat.'}</p>
            </div>
          </div>

          <div className="bk-difficulty">
            <span>{isZh ? '起步云力' : 'START LEVEL'}</span>
            <div role="group" aria-label={isZh ? '选择起步云力' : 'Choose start level'}>
              {(Object.keys(diffText) as Diff[]).map((item) => (
                <button
                  type="button"
                  key={item}
                  className={difficulty === item ? 'active' : ''}
                  aria-pressed={difficulty === item}
                  disabled={phase === 'playing' || phase === 'clear'}
                  aria-label={isZh ? `起步云力 ${diffText[item].zh}（${DIFF[item].lives} 点云力）${phase === 'playing' ? '，进行中不可切换' : ''}` : `Start level ${diffText[item].en}`}
                  onClick={() => {
                    if (phase === 'ready') setDifficulty(item);
                    else startGame(item);
                  }}
                >
                  <i aria-hidden="true" />{diffText[item][lang]}
                </button>
              ))}
            </div>
            <small>{isZh ? `轻松 ${DIFF.easy.lives} 云力 · 认真 ${DIFF.normal.lives} 云力 · 高手 ${DIFF.hard.lives} 云力；${phase === 'playing' || phase === 'clear' ? '进行中不可切换' : '切换会开启新一局'}` : 'More lives on easier levels'}</small>
          </div>

          <div className="bk-actions">
            {(phase === 'playing' || phase === 'paused') && (
              <button type="button" onClick={togglePause}>
                <span aria-hidden="true">{phase === 'playing' ? '⏸' : '▶'}</span>
                {phase === 'playing' ? (isZh ? '暂停 (P)' : 'Pause') : (isZh ? '继续 (P)' : 'Resume')}
              </button>
            )}
            <button type="button" className="bk-primary" onClick={() => startGame(difficulty)}>
              <span aria-hidden="true">↻</span>
              {phase === 'ready' ? (isZh ? '开始游戏' : 'Start') : phase === 'over' ? (isZh ? '再来一局' : 'Play again') : phase === 'clear' ? (isZh ? '重新开局' : 'Restart') : (isZh ? '重新开局' : 'Restart')}
            </button>
          </div>

          <div className="bk-rule-note">
            <span aria-hidden="true">8 × N</span>
            <p>{isZh ? '敲碎全部星砖过关 · 星弹坠海扣 1 点云力 · 连续敲砖叠连击加分' : 'Clear all bricks to advance · each lost ball costs a life · chained breaks build combos'}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
