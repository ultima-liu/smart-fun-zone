import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { sfx } from '../sfx';
import './snake.css';

export interface SnakeOutcome {
  score: number;
  stars: number;
  maxLevel: number;
  difficulty: 'easy' | 'normal' | 'hard';
  durationSec: number;
}

interface SnakeGameProps {
  headerAction?: ReactNode;
  lang: 'zh' | 'en';
  playerName: string;
  onComplete: (outcome: SnakeOutcome) => void;
}

type Diff = 'easy' | 'normal' | 'hard';
type Phase = 'ready' | 'playing' | 'paused' | 'over';

const COLS = 15;
const ROWS = 15;
const GOLD_EVERY = 5; // 每吃 5 颗星果出现一颗流星果
const GOLD_LIFE_MS = 6500;
const COMBO_MS = 6000;
const LEVEL_EVERY = 6; // 每吃 6 颗提速一档
const BOOST_FACTOR = 0.45;
const STEP_MIN = 70;
const BOOST_MIN = 42;
const SPARK_COLORS = ['#ffe9a8', '#7beedd', '#9db9ff', '#ffffff'];

const DIFF_START: Record<Diff, number> = { easy: 1, normal: 3, hard: 5 };
const diffText: Record<Diff, { zh: string; en: string }> = {
  easy: { zh: '轻松', en: 'Breeze' },
  normal: { zh: '认真', en: 'Focus' },
  hard: { zh: '高手', en: 'Master' },
};

const stepMs = (level: number) => Math.max(STEP_MIN, Math.round(250 * Math.pow(0.88, level - 1)));

interface Pt { x: number; y: number }

interface Engine {
  segs: Pt[]; // 蛇身，下标 0 为头
  dir: Pt;
  pending: Pt[]; // 转向输入缓冲（最多 2 个，一步只消费一个，防连按掉头）
  food: Pt;
  gold: { pos: Pt; id: number; bornAt: number } | null; // bornAt 用引擎 activeMs，暂停安全
  eaten: number; // 已吃星果数（不含流星果）
  score: number;
  stars: number; // 星果 + 流星果总数
  combo: number;
  lastEatAt: number;
  level: number;
  startLevel: number;
  maxLevel: number;
  grow: number; // 待生长节数
  diff: Diff;
  stepAcc: number;
  activeMs: number;
  boost: boolean;
  over: boolean;
  eatSeq: number;
  goldSeq: number;
}

type Ev =
  | { k: 'eat'; gold: boolean; gained: number; combo: number; pos: Pt }
  | { k: 'level'; to: number }
  | { k: 'step' }
  | { k: 'over' };

function emptyCells(e: Engine): Pt[] {
  const taken = new Set<number>();
  e.segs.forEach((s) => taken.add(s.y * COLS + s.x));
  taken.add(e.food.y * COLS + e.food.x);
  if (e.gold) taken.add(e.gold.pos.y * COLS + e.gold.pos.x);
  const free: Pt[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!taken.has(y * COLS + x)) free.push({ x, y });
    }
  }
  return free;
}

function spawnAt(e: Engine): Pt {
  const free = emptyCells(e);
  return free[Math.floor(Math.random() * free.length)] ?? { x: 0, y: 0 };
}

function queueTurn(e: Engine, dx: number, dy: number) {
  const last = e.pending.length ? e.pending[e.pending.length - 1] : e.dir;
  if (last.x === dx && last.y === dy) return; // 已是该方向
  if (last.x === -dx && last.y === -dy) return; // 不能原地掉头
  if (e.pending.length >= 2) return;
  e.pending.push({ x: dx, y: dy });
}

function applyEat(e: Engine, base: number, gold: boolean, pos: Pt): Ev[] {
  const now = e.activeMs;
  e.combo = e.lastEatAt > 0 && now - e.lastEatAt <= COMBO_MS ? e.combo + 1 : 1;
  e.lastEatAt = now;
  const gained = base + 5 * (e.combo - 1);
  e.score += gained;
  e.stars += 1;
  e.grow += gold ? 3 : 2;
  e.eatSeq += 1;
  const evs: Ev[] = [{ k: 'eat', gold, gained, combo: e.combo, pos }];
  if (!gold) {
    e.eaten += 1;
    e.food = spawnAt(e);
    if (e.eaten % GOLD_EVERY === 0 && !e.gold) {
      e.gold = { pos: spawnAt(e), id: ++e.goldSeq, bornAt: now };
    }
  } else {
    e.gold = null;
  }
  const levelTo = e.startLevel + Math.floor(e.eaten / LEVEL_EVERY);
  if (levelTo > e.level) {
    e.level = levelTo;
    e.maxLevel = Math.max(e.maxLevel, levelTo);
    evs.push({ k: 'level', to: levelTo });
  }
  return evs;
}

function stepEngine(e: Engine): Ev[] {
  if (e.pending.length) {
    const nd = e.pending.shift()!;
    const reverse = nd.x === -e.dir.x && nd.y === -e.dir.y;
    const same = nd.x === e.dir.x && nd.y === e.dir.y;
    if (!reverse && !same) e.dir = nd;
  }
  const head = e.segs[0];
  const nx = head.x + e.dir.x;
  const ny = head.y + e.dir.y;
  if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return [{ k: 'over' }];
  const tail = e.segs[e.segs.length - 1];
  const tailStays = e.grow > 0;
  for (let i = 0; i < e.segs.length; i++) {
    const s = e.segs[i];
    if (s === tail && !tailStays) continue; // 尾巴这一步会腾出格子
    if (s.x === nx && s.y === ny) return [{ k: 'over' }];
  }
  e.segs.unshift({ x: nx, y: ny });
  const evs: Ev[] = [];
  if (nx === e.food.x && ny === e.food.y) {
    evs.push(...applyEat(e, 10, false, { x: nx, y: ny }));
  } else if (e.gold && nx === e.gold.pos.x && ny === e.gold.pos.y) {
    evs.push(...applyEat(e, 50, true, { x: nx, y: ny }));
  } else if (e.grow > 0) {
    e.grow -= 1;
  } else {
    e.segs.pop();
  }
  if (e.boost) e.score += 1; // 冲刺按格补分，风险换回报
  return evs.length ? evs : [{ k: 'step' }];
}

function tick(e: Engine, dt: number): Ev[] {
  e.activeMs += dt;
  const evs: Ev[] = [];
  if (e.gold && e.activeMs - e.gold.bornAt >= GOLD_LIFE_MS) e.gold = null;
  const base = stepMs(e.level);
  const interval = e.boost ? Math.max(BOOST_MIN, Math.round(base * BOOST_FACTOR)) : base;
  e.stepAcc += dt;
  let steps = 0;
  while (e.stepAcc >= interval && steps < 4) {
    e.stepAcc -= interval;
    steps += 1;
    evs.push(...stepEngine(e));
    if (e.over) break;
  }
  return evs;
}

function freshEngine(diff: Diff): Engine {
  const e: Engine = {
    segs: [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }],
    dir: { x: 1, y: 0 },
    pending: [],
    food: { x: -1, y: -1 },
    gold: null,
    eaten: 0,
    score: 0,
    stars: 0,
    combo: 0,
    lastEatAt: 0,
    level: DIFF_START[diff],
    startLevel: DIFF_START[diff],
    maxLevel: DIFF_START[diff],
    grow: 0,
    diff,
    stepAcc: 0,
    activeMs: 0,
    boost: false,
    over: false,
    eatSeq: 0,
    goldSeq: 0,
  };
  e.food = spawnAt(e);
  return e;
}

interface Snapshot {
  segs: Pt[];
  dir: Pt;
  food: Pt;
  gold: { pos: Pt; id: number } | null;
  score: number;
  stars: number;
  level: number;
  combo: number;
  eatSeq: number;
}

function buildSnapshot(e: Engine): Snapshot {
  return {
    segs: e.segs.map((s) => ({ ...s })),
    dir: { ...e.dir },
    food: { ...e.food },
    gold: e.gold ? { pos: { ...e.gold.pos }, id: e.gold.id } : null,
    score: e.score,
    stars: e.stars,
    level: e.level,
    combo: e.combo,
    eatSeq: e.eatSeq,
  };
}

const cellPos = (p: Pt, scale = 1): React.CSSProperties => ({
  width: `${100 / COLS}%`,
  height: `${100 / ROWS}%`,
  transform: `translate(${p.x * 100}%, ${p.y * 100}%)${scale !== 1 ? ` scale(${scale})` : ''}`,
});

// 用 left/top 定位的格子样式（供自身要做 transform 动画的元素使用，如星环）
const cellInset = (p: Pt): React.CSSProperties => ({
  width: `${100 / COLS}%`,
  height: `${100 / ROWS}%`,
  left: `${(p.x * 100) / COLS}%`,
  top: `${(p.y * 100) / ROWS}%`,
});

export default function SnakeGame({ lang, playerName, onComplete, headerAction }: SnakeGameProps) {
  const isZh = lang === 'zh';
  const sound = useStore((s) => s.sound);
  const [phase, setPhase] = useState<Phase>('ready');
  const [difficulty, setDifficulty] = useState<Diff>('normal');
  const [snap, setSnap] = useState<Snapshot>(() => buildSnapshot(freshEngine('normal')));
  const [boosting, setBoosting] = useState(false);
  const [best, setBest] = useState({ score: 0, stars: 0 });
  const [toast, setToast] = useState<string | null>(null);
  const [floats, setFloats] = useState<Array<{ id: number; text: string; top: number; left: number; big: boolean }>>([]);
  const [sparks, setSparks] = useState<Array<{ id: number; x: number; y: number; dx: number; dy: number; color: string }>>([]);
  const [boardShake, setBoardShake] = useState(false);
  const [lastResult, setLastResult] = useState<{ score: number; stars: number; level: number; record: boolean } | null>(null);
  const engRef = useRef<Engine>(freshEngine('normal'));
  const phaseRef = useRef<Phase>('ready');
  const handleRef = useRef<(evs: Ev[]) => void>(() => {});
  const floatSeq = useRef(0);
  const floatTimers = useRef<number[]>([]);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  phaseRef.current = phase;

  const publish = useCallback(() => setSnap(buildSnapshot(engRef.current)), []);

  const gameOver = useCallback(() => {
    const e = engRef.current;
    if (e.over) return;
    e.over = true;
    e.boost = false;
    const sec = Math.max(1, Math.round(e.activeMs / 1000));
    const record = e.score > 0 && e.score >= best.score;
    setLastResult({ score: e.score, stars: e.stars, level: e.maxLevel, record });
    setBest((cur) => ({ score: Math.max(cur.score, e.score), stars: Math.max(cur.stars, e.stars) }));
    setBoosting(false);
    phaseRef.current = 'over';
    setPhase('over');
    sfx.snkOver();
    onComplete({ score: e.score, stars: e.stars, maxLevel: e.maxLevel, difficulty: e.diff, durationSec: sec });
    publish();
  }, [best.score, onComplete, publish]);

  const handleEvents = (evs: Ev[]) => {
    let dirty = false;
    for (const ev of evs) {
      dirty = true;
      if (ev.k === 'eat') {
        if (ev.gold) sfx.snkGold();
        else sfx.snkEat(ev.combo);
        const big = ev.gold || ev.combo >= 4;
        const float = { id: ++floatSeq.current, text: `+${ev.gained}`, top: ev.pos.y / ROWS, left: (ev.pos.x + 0.5) / COLS, big };
        setFloats((cur) => [...cur.slice(-2), float]);
        floatTimers.current.push(window.setTimeout(() => {
          setFloats((cur) => cur.filter((f) => f.id !== float.id));
        }, 900));
        // 吃到星星：迸出彩色光点
        const burst: typeof sparks = [];
        for (let i = 0; i < (ev.gold ? 12 : 7); i++) {
          burst.push({
            id: ++floatSeq.current,
            x: ((ev.pos.x + 0.5) / COLS) * 100,
            y: ((ev.pos.y + 0.5) / ROWS) * 100,
            dx: Math.round(-70 + Math.random() * 140),
            dy: Math.round(-80 + Math.random() * 70),
            color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
          });
        }
        setSparks((cur) => [...cur.slice(-48), ...burst]);
        floatTimers.current.push(window.setTimeout(() => {
          setSparks((cur) => cur.filter((s) => !burst.some((b) => b.id === s.id)));
        }, 800));
        if (ev.gold) {
          setToast(isZh ? '流星果 +50！' : 'Shooting star +50!');
          setBoardShake(true);
          floatTimers.current.push(window.setTimeout(() => setBoardShake(false), 340));
        } else if (ev.combo >= 3) {
          setToast(isZh ? `连击 ×${ev.combo}` : `Combo ×${ev.combo}`);
        }
      } else if (ev.k === 'level') {
        sfx.snkLevel();
        setToast(isZh ? `提速！Lv.${ev.to}` : `Speed up! · Lv.${ev.to}`);
      } else if (ev.k === 'over') {
        gameOver();
        return;
      }
    }
    if (dirty) publish();
  };
  handleRef.current = handleEvents;

  const turn = useCallback((dx: number, dy: number) => {
    if (phaseRef.current !== 'playing') return;
    queueTurn(engRef.current, dx, dy);
  }, []);

  const setBoost = useCallback((on: boolean) => {
    engRef.current.boost = on;
    setBoosting(on);
  }, []);

  const togglePause = useCallback(() => {
    if (phaseRef.current === 'playing') {
      engRef.current.boost = false;
      setBoosting(false);
      phaseRef.current = 'paused';
      setPhase('paused');
    } else if (phaseRef.current === 'paused') {
      phaseRef.current = 'playing';
      setPhase('playing');
    }
  }, []);

  const startGame = useCallback((diff: Diff) => {
    engRef.current = freshEngine(diff);
    floatTimers.current.forEach((id) => window.clearTimeout(id));
    floatTimers.current = [];
    setDifficulty(diff);
    setLastResult(null);
    setToast(null);
    setFloats([]);
    setSparks([]);
    setBoardShake(false);
    setBoosting(false);
    phaseRef.current = 'playing';
    setPhase('playing');
    publish();
  }, [publish]);

  // 主循环：requestAnimationFrame 驱动移动与流星果倒计时
  useEffect(() => {
    if (phase !== 'playing') return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      const evs = tick(engRef.current, dt);
      if (evs.length) handleRef.current(evs);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // 键盘操作（游戏进行中拦截方向键与空格滚动页面）
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
        case 'ArrowLeft': case 'a': case 'A': ev.preventDefault(); turn(-1, 0); break;
        case 'ArrowRight': case 'd': case 'D': ev.preventDefault(); turn(1, 0); break;
        case 'ArrowUp': case 'w': case 'W': ev.preventDefault(); turn(0, -1); break;
        case 'ArrowDown': case 's': case 'S': ev.preventDefault(); turn(0, 1); break;
        case ' ': ev.preventDefault(); setBoost(true); break;
        default: break;
      }
    };
    const onKeyUp = (ev: KeyboardEvent) => {
      if (ev.key === ' ') setBoost(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [difficulty, setBoost, startGame, togglePause, turn]);

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
  }, []);

  // 「云隙流光」背景音乐：随游戏挂载/卸载启停，也跟随全局声音开关
  useEffect(() => {
    if (!sound) return;
    sfx.snakeBgmStart();
    return () => sfx.snakeBgmStop();
  }, [sound]);

  // 棋盘滑动手势（触屏/鼠标拖动转向）
  const onSwipeStart = (ev: React.PointerEvent) => {
    swipeRef.current = { x: ev.clientX, y: ev.clientY };
  };
  const onSwipeEnd = (ev: React.PointerEvent) => {
    const from = swipeRef.current;
    swipeRef.current = null;
    if (!from) return;
    const dx = ev.clientX - from.x;
    const dy = ev.clientY - from.y;
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
    if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0);
    else turn(0, dy > 0 ? 1 : -1);
  };
  const guardPointer = (ev: React.SyntheticEvent) => {
    ev.preventDefault();
  };

  const bestScoreView = Math.max(best.score, snap.score);
  const bestStarsView = Math.max(best.stars, snap.stars);
  const levelProgress = ((snap.stars % LEVEL_EVERY) / LEVEL_EVERY) * 100;
  const goldIn = GOLD_EVERY - (engRef.current.eaten % GOLD_EVERY);
  const glideMs = boosting ? Math.max(BOOST_MIN, Math.round(stepMs(snap.level) * BOOST_FACTOR)) : stepMs(snap.level);

  const dirName = snap.dir.x === 1 ? 'right' : snap.dir.x === -1 ? 'left' : snap.dir.y === 1 ? 'down' : 'up';
  const phaseLabel = phase === 'playing' ? (isZh ? '进行中' : 'RUNNING') : phase === 'paused' ? (isZh ? '暂停' : 'PAUSED') : phase === 'over' ? (isZh ? '已结束' : 'ENDED') : (isZh ? '待开始' : 'READY');
  const hint = phase === 'playing'
    ? (isZh ? '吃星星会变长，小心别咬到自己或撞到云壁！' : 'You grow with every star — don\'t bite yourself or the walls!')
    : phase === 'paused'
      ? (isZh ? '休息一下，点「继续」接着追星。' : 'Take a break, press resume to keep chasing.')
      : phase === 'over'
        ? (isZh ? '本局结束，再来挑战更长的自己吧！' : 'Round over — try to grow even longer!')
        : (isZh ? '选好起步速度，点「开始游戏」。' : 'Pick a start speed and press start.');

  return (
    <section className="sn-chaser" aria-labelledby="sn-title">
      <header className="sn-heading">
        {headerAction ?? (<div className="sn-title-seal arcade-art" aria-hidden="true" />)}
        <div>
          <span>{isZh ? '敏捷 · 云间穿行' : 'REFLEX · SKY DASH'}</span>
          <h2 id="sn-title">{isZh ? '追星小蛇' : 'Star Chaser'}</h2>
          <p>{isZh ? '操控云隙间的小蛇追着星星跑，吃到的星星越多身子越长，手速也要越快！' : 'Steer the little snake through cloud lanes. Every star makes it longer — and faster!'}</p>
        </div>
        <div className="sn-session" aria-label={isZh ? '本次访问最佳' : 'Session best'}>
          <span>{isZh ? '最高分' : 'Best score'} <b>{bestScoreView || '--'}</b></span>
          <em aria-hidden="true">·</em>
          <span>{isZh ? '最多星星' : 'Best stars'} <b>{bestStarsView || '--'}</b></span>
        </div>
      </header>

      <div className="sn-table">
        <div className="sn-stage">
          <div className="sn-board-wrap">
            <div
              className={`sn-board${boardShake ? ' shake' : ''}${phase === 'over' ? ' dead' : ''}`}
              role="application"
              aria-label={isZh
                ? `追星小蛇棋盘，15 列 15 行，当前分数 ${snap.score}，已吃 ${snap.stars} 颗星星，长度 ${snap.segs.length}，速度等级 ${snap.level}`
                : `Star Chaser board, 15 by 15, score ${snap.score}, ${snap.stars} stars eaten, length ${snap.segs.length}, level ${snap.level}`}
              onPointerDown={onSwipeStart}
              onPointerUp={onSwipeEnd}
              onPointerCancel={() => { swipeRef.current = null; }}
            >
              <div className="sn-field" aria-hidden="true">
                {snap.segs.map((s, i) => {
                  const len = snap.segs.length;
                  const bucket = Math.min(4, Math.floor((i / Math.max(1, len - 1)) * 5));
                  const cls = i === 0 ? `head d-${dirName}` : i === len - 1 ? 'tail' : `mid b${bucket}`;
                  return (
                    <span
                      key={i}
                      className={`sn-seg ${cls}`}
                      style={{ ...cellPos(s, i === 0 ? 1.16 : 1.05), transitionDuration: `${glideMs}ms` }}
                      {...(i === 0 ? { 'data-x': s.x, 'data-y': s.y } : {})}
                    />
                  );
                })}

                <span className="sn-food" style={cellPos(snap.food)}><i>✦</i></span>
                {snap.gold && (
                  <span key={snap.gold.id} className="sn-gold" style={cellPos(snap.gold.pos)}>
                    <svg viewBox="0 0 36 36" aria-hidden="true">
                      <circle className="ring" cx="18" cy="18" r="16.5" pathLength={1} />
                    </svg>
                    <i>✦</i>
                  </span>
                )}
                {snap.eatSeq > 0 && (
                  <span key={snap.eatSeq} className="sn-pulse" style={cellInset(snap.segs[0])} />
                )}

                {sparks.map((s) => (
                  <i
                    key={s.id}
                    className="sn-spark"
                    style={{ left: `${s.x}%`, top: `${s.y}%`, '--dx': `${s.dx}px`, '--dy': `${s.dy}px`, '--sp': s.color } as React.CSSProperties}
                  />
                ))}

                {floats.map((f) => (
                  <span key={f.id} className={`sn-float${f.big ? ' big' : ''}`} style={{ top: `${Math.round(f.top * 100)}%`, left: `${Math.round(f.left * 100)}%` }}>{f.text}</span>
                ))}
              </div>

              {phase === 'ready' && (
                <div className="sn-overlay">
                  <b>{isZh ? '准备追星' : 'Ready to chase'}</b>
                  <p>{isZh ? `${playerName}，云隙里撒满了星星，带着小蛇去吃吧！撞到云壁或咬到自己就结束啦。` : `${playerName}, the cloud lanes are full of stars — chase them! Hitting a wall or yourself ends the run.`}</p>
                  <button type="button" className="sn-overlay-btn" onClick={() => startGame(difficulty)}>
                    <span aria-hidden="true">✦</span>{isZh ? '开始游戏' : 'Start'}
                  </button>
                  <small>{isZh ? '键盘：← ↑ → ↓ / WASD 转向 · 按住空格冲刺 · P 暂停' : 'Keys: arrows / WASD turn · hold Space to boost · P pause'}</small>
                </div>
              )}
              {phase === 'paused' && (
                <div className="sn-overlay dim">
                  <b>{isZh ? '暂停中' : 'Paused'}</b>
                  <div className="sn-overlay-row">
                    <button type="button" className="sn-overlay-btn" onClick={togglePause}>{isZh ? '继续 (P)' : 'Resume'}</button>
                    <button type="button" className="sn-overlay-btn ghost" onClick={() => startGame(difficulty)}>{isZh ? '重新开局' : 'Restart'}</button>
                  </div>
                </div>
              )}
              {phase === 'over' && lastResult && (
                <div className="sn-overlay over">
                  <b>{isZh ? '本局结束！' : 'Round over!'}</b>
                  {lastResult.record && <em className="sn-record">{isZh ? '★ 新纪录！' : '★ New best!'}</em>}
                  <div className="sn-final">
                    <span>{isZh ? '分数' : 'Score'}<b>{lastResult.score}</b></span>
                    <span>{isZh ? '星星' : 'Stars'}<b>{lastResult.stars}</b></span>
                    <span>{isZh ? '速度' : 'Level'}<b>Lv.{lastResult.level}</b></span>
                  </div>
                  <button type="button" className="sn-overlay-btn" onClick={() => startGame(difficulty)}>
                    <span aria-hidden="true">↻</span>{isZh ? '再来一局' : 'Play again'}
                  </button>
                </div>
              )}
            </div>

            {toast && <div className="sn-toast" role="status">{toast}</div>}

            <div className="sn-touchpad" aria-label={isZh ? '小蛇操作按钮' : 'Snake controls'}>
              <div className="sn-dpad">
                <button type="button" aria-label={isZh ? '向上转' : 'Turn up'} disabled={phase !== 'playing'} onClick={() => turn(0, -1)}>
                  <span aria-hidden="true">↑</span>
                </button>
                <button type="button" aria-label={isZh ? '向左转' : 'Turn left'} disabled={phase !== 'playing'} onClick={() => turn(-1, 0)}>
                  <span aria-hidden="true">←</span>
                </button>
                <button type="button" aria-label={isZh ? '向下转' : 'Turn down'} disabled={phase !== 'playing'} onClick={() => turn(0, 1)}>
                  <span aria-hidden="true">↓</span>
                </button>
                <button type="button" aria-label={isZh ? '向右转' : 'Turn right'} disabled={phase !== 'playing'} onClick={() => turn(1, 0)}>
                  <span aria-hidden="true">→</span>
                </button>
              </div>
              <button
                type="button"
                className={`sn-boost${boosting ? ' on' : ''}`}
                aria-label={isZh ? '按住冲刺加速' : 'Hold to boost'}
                disabled={phase !== 'playing'}
                onPointerDown={(e) => { guardPointer(e); setBoost(true); }}
                onPointerUp={() => setBoost(false)}
                onPointerLeave={() => setBoost(false)}
                onPointerCancel={() => setBoost(false)}
                onContextMenu={guardPointer}
              >
                <span aria-hidden="true">⏩</span>{isZh ? '冲刺' : 'Boost'}
              </button>
            </div>
          </div>
        </div>

        <aside className="sn-console">
          <div className="sn-status-box" aria-live="polite">
            <span className="sn-status-orbit" aria-hidden="true"><i /><i /><i /></span>
            <small>{isZh ? `本局 · ${phaseLabel}` : `ROUND · ${phaseLabel}`}</small>
            <div className="sn-score-row">
              <span>{isZh ? '分数' : 'Score'}</span>
              <b>{snap.score}</b>
            </div>
            <div className="sn-stats" aria-label={isZh ? '本局数据' : 'Round stats'}>
              <span>{isZh ? '星星' : 'Stars'} <b>{snap.stars}</b></span>
              <span>{isZh ? '长度' : 'Length'} <b>{snap.segs.length}</b></span>
              <span>{isZh ? '速度' : 'Level'} <b>Lv.{snap.level}</b></span>
              <span className={snap.combo >= 2 ? 'hot' : ''}>{isZh ? '连击' : 'Combo'} <b>{snap.combo >= 2 ? `×${snap.combo}` : '--'}</b></span>
            </div>
            <div className="sn-levelbar" aria-hidden="true">
              <i style={{ width: `${levelProgress}%` }} />
              <small>{isZh ? `再吃 ${LEVEL_EVERY - (snap.stars % LEVEL_EVERY)} 颗提速` : `${LEVEL_EVERY - (snap.stars % LEVEL_EVERY)} to level up`}</small>
            </div>
            <p>{hint}</p>
          </div>

          <div className="sn-gold-note">
            <span className="sn-gold-glyph" aria-hidden="true">✦</span>
            <div>
              <b>{isZh ? '流星果' : 'Shooting star'}</b>
              <p>{isZh ? `每吃 5 颗星星出现一颗，+50 分但 6.5 秒就飞走；现在还差 ${goldIn} 颗。` : `Appears every 5 stars for +50 — but flies away in 6.5s. ${goldIn} more to go.`}</p>
            </div>
          </div>

          <div className="sn-difficulty">
            <span>{isZh ? '起步速度' : 'START SPEED'}</span>
            <div role="group" aria-label={isZh ? '选择起步速度' : 'Choose start speed'}>
              {(Object.keys(diffText) as Diff[]).map((item) => (
                <button
                  type="button"
                  key={item}
                  className={difficulty === item ? 'active' : ''}
                  aria-pressed={difficulty === item}
                  disabled={phase === 'playing'}
                  aria-label={isZh ? `起步速度 ${diffText[item].zh}（Lv.${DIFF_START[item]}）${phase === 'playing' ? '，进行中不可切换' : ''}` : `Start speed ${diffText[item].en}`}
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

          <div className="sn-actions">
            {(phase === 'playing' || phase === 'paused') && (
              <button type="button" onClick={togglePause}>
                <span aria-hidden="true">{phase === 'playing' ? '⏸' : '▶'}</span>
                {phase === 'playing' ? (isZh ? '暂停 (P)' : 'Pause') : (isZh ? '继续 (P)' : 'Resume')}
              </button>
            )}
            <button type="button" className="sn-primary" onClick={() => startGame(difficulty)}>
              <span aria-hidden="true">↻</span>
              {phase === 'ready' ? (isZh ? '开始游戏' : 'Start') : phase === 'over' ? (isZh ? '再来一局' : 'Play again') : phase === 'paused' ? (isZh ? '重新开局' : 'Restart') : (isZh ? '重新开局' : 'Restart')}
            </button>
          </div>

          <div className="sn-rule-note">
            <span aria-hidden="true">15×15</span>
            <p>{isZh ? '吃星星变长 · 撞墙或咬到自己结束 · 按住空格冲刺 · 连续快吃叠连击加分' : 'Stars grow you · walls end the run · hold Space to boost · quick eats build combos'}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
