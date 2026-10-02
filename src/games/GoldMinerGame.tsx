import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { sfx } from '../sfx';
import './gold-miner.css';

export interface GoldMinerOutcome {
  score: number;
  level: number;
  treasures: number;
  result: 'win' | 'lose';
  difficulty: 'easy' | 'normal' | 'hard';
  durationSec: number;
}

interface GoldMinerGameProps {
  headerAction?: ReactNode;
  lang: 'zh' | 'en';
  playerName: string;
  onComplete: (outcome: GoldMinerOutcome) => void;
}

type Diff = GoldMinerOutcome['difficulty'];
type Phase = 'ready' | 'playing' | 'paused' | 'shop' | 'over' | 'victory';
type HookMode = 'swing' | 'extending' | 'retracting';
type TreasureType = 'gold-s' | 'gold-m' | 'gold-l' | 'diamond' | 'rock' | 'bag';
type ShopItemId = 'dynamite' | 'strength' | 'luck' | 'time';

interface ShopBuffs {
  strength: boolean;
  luck: boolean;
  time: boolean;
}

interface Treasure {
  id: number;
  type: TreasureType;
  x: number;
  y: number;
  r: number;
  value: number;
  weight: number;
  taken: boolean;
}

interface Engine {
  difficulty: Diff;
  level: number;
  score: number;
  target: number;
  timeLeft: number;
  angle: number;
  swingDir: 1 | -1;
  hookLength: number;
  hookMode: HookMode;
  grabbedId: number | null;
  treasures: Treasure[];
  dynamites: number;
  caught: number;
  reelBoost: number;
  lucky: boolean;
}

interface Snapshot extends Engine {
  hookX: number;
  hookY: number;
}

const FIELD_W = 100;
const FIELD_H = 70;
const PIVOT_X = 50;
const PIVOT_Y = 7.4;
const REST_LENGTH = 8;
const LAST_LEVEL = 5;
const BASE_TARGETS = [650, 1600, 2850, 4400, 6300];

const DIFF: Record<Diff, { time: number; target: number; swing: number }> = {
  easy: { time: 72, target: .84, swing: 1.02 },
  normal: { time: 60, target: 1, swing: 1.16 },
  hard: { time: 50, target: 1.16, swing: 1.32 },
};

const diffText: Record<Diff, { zh: string; en: string; hintZh: string; hintEn: string }> = {
  easy: { zh: '轻松', en: 'Breeze', hintZh: '72 秒 · 目标更轻松', hintEn: '72 sec · gentle goals' },
  normal: { zh: '探险', en: 'Explorer', hintZh: '60 秒 · 标准航程', hintEn: '60 sec · classic run' },
  hard: { zh: '高手', en: 'Master', hintZh: '50 秒 · 摆钩更快', hintEn: '50 sec · faster swing' },
};

const treasureMeta: Record<TreasureType, { labelZh: string; labelEn: string }> = {
  'gold-s': { labelZh: '小金块', labelEn: 'small gold' },
  'gold-m': { labelZh: '金块', labelEn: 'gold nugget' },
  'gold-l': { labelZh: '大金块', labelEn: 'giant gold' },
  diamond: { labelZh: '星钻', labelEn: 'star diamond' },
  rock: { labelZh: '云岩', labelEn: 'cloud rock' },
  bag: { labelZh: '神秘袋', labelEn: 'mystery bag' },
};

const SHOP_ITEMS: Array<{ id: ShopItemId; nameZh: string; nameEn: string; descZh: string; descEn: string }> = [
  { id: 'dynamite', nameZh: '星火炸药', nameEn: 'Star Dynamite', descZh: '立刻补充 1 枚炸药', descEn: '+1 dynamite now' },
  { id: 'strength', nameZh: '大力药水', nameEn: 'Strength Tonic', descZh: '下一层回收速度 +55%', descEn: '+55% reel speed next level' },
  { id: 'luck', nameZh: '幸运云草', nameEn: 'Lucky Clover', descZh: '下一层星钻与福袋更值钱', descEn: 'Richer gems and bags next level' },
  { id: 'time', nameZh: '时光沙漏', nameEn: 'Time Hourglass', descZh: '下一层增加 15 秒', descEn: '+15 seconds next level' },
];

const EMPTY_BUFFS: ShopBuffs = { strength: false, luck: false, time: false };

function hookPoint(angle: number, length: number) {
  return {
    x: PIVOT_X + Math.sin(angle) * length,
    y: PIVOT_Y + Math.cos(angle) * length,
  };
}

function targetFor(level: number, diff: Diff) {
  return Math.round((BASE_TARGETS[level - 1] ?? BASE_TARGETS[BASE_TARGETS.length - 1]!) * DIFF[diff].target / 50) * 50;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function createTreasures(level: number, lucky = false): Treasure[] {
  const specs: Array<[TreasureType, number, number, number, number]> = [
    ['diamond', 2 + Math.floor(level / 3), 2.1, lucky ? 800 : 600, .55],
    ['gold-l', 3, 4.7, 500, 3.1],
    ['gold-m', 4, 3.5, 250, 1.75],
    ['gold-s', 5, 2.45, 100, 1],
    ['bag', 2, 3, 0, 1.2],
    ['rock', 3 + Math.min(level, 2), 3.8, 25, 3.7],
  ];
  const result: Treasure[] = [];
  let id = 0;
  for (const [type, count, r, value, weight] of specs) {
    for (let i = 0; i < count; i++) {
      let placed: Treasure | null = null;
      for (let tries = 0; tries < 160 && !placed; tries++) {
        const x = randomBetween(r + 4, FIELD_W - r - 4);
        const y = randomBetween(23 + r, FIELD_H - r - 2);
        if (result.some((item) => Math.hypot(item.x - x, item.y - y) < item.r + r + 1.35)) continue;
        placed = { id: ++id, type, x, y, r, value, weight, taken: false };
      }
      if (placed) result.push(placed);
    }
  }
  return result;
}

function makeEngine(diff: Diff, level = 1, score = 0, dynamites = 3, caught = 0, buffs: ShopBuffs = EMPTY_BUFFS): Engine {
  return {
    difficulty: diff,
    level,
    score,
    target: targetFor(level, diff),
    timeLeft: DIFF[diff].time + (buffs.time ? 15 : 0),
    angle: -.78,
    swingDir: 1,
    hookLength: REST_LENGTH,
    hookMode: 'swing',
    grabbedId: null,
    treasures: createTreasures(level, buffs.luck),
    dynamites,
    caught,
    reelBoost: buffs.strength ? 1.55 : 1,
    lucky: buffs.luck,
  };
}

function shopPrice(item: ShopItemId, level: number) {
  const base: Record<ShopItemId, number> = { dynamite: 180, strength: 300, luck: 360, time: 260 };
  return Math.round((base[item] + level * 45) / 10) * 10;
}

function snapshot(e: Engine): Snapshot {
  const p = hookPoint(e.angle, e.hookLength);
  return { ...e, treasures: e.treasures.map((item) => ({ ...item })), hookX: p.x, hookY: p.y };
}

function formatMoney(value: number) {
  return `$${Math.max(0, Math.round(value)).toLocaleString('en-US')}`;
}

export default function GoldMinerGame({ lang, playerName, onComplete, headerAction }: GoldMinerGameProps) {
  const isZh = lang === 'zh';
  const sound = useStore((state) => state.sound);
  const [difficulty, setDifficulty] = useState<Diff>('normal');
  const [phase, setPhase] = useState<Phase>('ready');
  const phaseRef = useRef<Phase>('ready');
  const engineRef = useRef<Engine>(makeEngine('normal'));
  const [snap, setSnap] = useState<Snapshot>(() => snapshot(engineRef.current));
  const [toast, setToast] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [explosion, setExplosion] = useState<{ id: number; x: number; y: number } | null>(null);
  const [best, setBest] = useState({ score: 0, level: 0 });
  const [shopBuffs, setShopBuffs] = useState<ShopBuffs>(EMPTY_BUFFS);
  const [boughtItems, setBoughtItems] = useState<ShopItemId[]>([]);
  const activeSeconds = useRef(0);
  const completedRef = useRef(false);
  const toastTimer = useRef<number | null>(null);
  const effectTimer = useRef<number | null>(null);

  const publish = useCallback(() => setSnap(snapshot(engineRef.current)), []);

  const say = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2100);
  }, []);

  const reportComplete = useCallback((result: 'win' | 'lose', e: Engine) => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete({
      score: e.score,
      level: e.level,
      treasures: e.caught,
      result,
      difficulty: e.difficulty,
      durationSec: Math.max(1, Math.round(activeSeconds.current)),
    });
  }, [onComplete]);

  const finishLevel = useCallback((e: Engine) => {
    if (e.score >= e.target) {
      if (e.level >= LAST_LEVEL) {
        phaseRef.current = 'victory';
        setPhase('victory');
        setBest((old) => ({ score: Math.max(old.score, e.score), level: Math.max(old.level, e.level) }));
        sfx.minerWin();
        reportComplete('win', e);
      } else {
        setBoughtItems([]);
        setShopBuffs(EMPTY_BUFFS);
        phaseRef.current = 'shop';
        setPhase('shop');
        setBest((old) => ({ score: Math.max(old.score, e.score), level: Math.max(old.level, e.level) }));
        sfx.minerStage();
      }
    } else {
      phaseRef.current = 'over';
      setPhase('over');
      setBest((old) => ({ score: Math.max(old.score, e.score), level: Math.max(old.level, e.level - 1) }));
      sfx.minerOver();
      reportComplete('lose', e);
    }
    publish();
  }, [publish, reportComplete]);

  const startGame = useCallback((diff: Diff) => {
    engineRef.current = makeEngine(diff);
    activeSeconds.current = 0;
    completedRef.current = false;
    setDifficulty(diff);
    setExplosion(null);
    setShake(false);
    setToast(null);
    setShopBuffs(EMPTY_BUFFS);
    setBoughtItems([]);
    phaseRef.current = 'playing';
    setPhase('playing');
    publish();
  }, [publish]);

  const nextLevel = useCallback(() => {
    const old = engineRef.current;
    engineRef.current = makeEngine(old.difficulty, old.level + 1, old.score, old.dynamites, old.caught, shopBuffs);
    phaseRef.current = 'playing';
    setPhase('playing');
    setExplosion(null);
    setShopBuffs(EMPTY_BUFFS);
    setBoughtItems([]);
    say(isZh ? '补给装车，新的矿层已开启！' : 'Supplies loaded — a new mine is open!');
    publish();
  }, [isZh, publish, say, shopBuffs]);

  const buyShopItem = useCallback((item: ShopItemId) => {
    if (phaseRef.current !== 'shop' || boughtItems.includes(item)) return;
    const e = engineRef.current;
    const price = shopPrice(item, e.level);
    if (e.score < price) {
      say(isZh ? '收获还不够，先把钱留给下一层吧' : 'Not enough haul — save it for the next level');
      return;
    }
    if (item === 'dynamite' && e.dynamites >= 5) {
      say(isZh ? '炸药袋已经装满啦' : 'Your dynamite pouch is full');
      return;
    }
    e.score -= price;
    if (item === 'dynamite') e.dynamites += 1;
    else setShopBuffs((old) => ({ ...old, [item]: true }));
    setBoughtItems((old) => [...old, item]);
    sfx.minerBag();
    say(isZh ? '购买成功，补给会在下一层生效' : 'Purchased — ready for the next level');
    publish();
  }, [boughtItems, isZh, publish, say]);

  const launchHook = useCallback(() => {
    const e = engineRef.current;
    if (phaseRef.current !== 'playing' || e.hookMode !== 'swing') return;
    e.hookMode = 'extending';
    sfx.minerLaunch();
    publish();
  }, [publish]);

  const blastCargo = useCallback(() => {
    const e = engineRef.current;
    if (phaseRef.current !== 'playing' || e.hookMode !== 'retracting' || e.grabbedId === null || e.dynamites <= 0) {
      if (phaseRef.current === 'playing') say(isZh ? '抓到东西后才能使用炸药' : 'Use dynamite after grabbing something');
      return;
    }
    const item = e.treasures.find((entry) => entry.id === e.grabbedId);
    if (!item) return;
    e.dynamites -= 1;
    e.grabbedId = null;
    setExplosion({ id: Date.now(), x: item.x, y: item.y });
    setShake(true);
    if (effectTimer.current) window.clearTimeout(effectTimer.current);
    effectTimer.current = window.setTimeout(() => { setExplosion(null); setShake(false); }, 620);
    sfx.minerBomb();
    say(isZh ? '轰！甩掉了沉重的负担' : 'Boom! Heavy cargo cleared');
    publish();
  }, [isZh, publish, say]);

  const togglePause = useCallback(() => {
    if (phaseRef.current === 'playing') {
      phaseRef.current = 'paused';
      setPhase('paused');
    } else if (phaseRef.current === 'paused') {
      phaseRef.current = 'playing';
      setPhase('playing');
    }
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    let raf = 0;
    let last = performance.now();
    let lastPublish = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, .05);
      last = now;
      const e = engineRef.current;
      activeSeconds.current += dt;
      e.timeLeft = Math.max(0, e.timeLeft - dt);

      if (e.hookMode === 'swing') {
        e.angle += e.swingDir * DIFF[e.difficulty].swing * dt;
        if (e.angle >= 1.12) { e.angle = 1.12; e.swingDir = -1; }
        if (e.angle <= -1.12) { e.angle = -1.12; e.swingDir = 1; }
      } else if (e.hookMode === 'extending') {
        e.hookLength += 42 * dt;
        const point = hookPoint(e.angle, e.hookLength);
        const hit = e.treasures.find((item) => !item.taken && Math.hypot(item.x - point.x, item.y - point.y) <= item.r + 1.35);
        if (hit) {
          hit.taken = true;
          e.grabbedId = hit.id;
          e.hookMode = 'retracting';
          sfx.minerCatch(hit.type === 'rock');
          say(isZh ? `抓住${treasureMeta[hit.type].labelZh}！` : `Caught ${treasureMeta[hit.type].labelEn}!`);
        } else if (point.x < 1.5 || point.x > FIELD_W - 1.5 || point.y > FIELD_H - 1) {
          e.hookMode = 'retracting';
        }
      } else {
        const grabbed = e.grabbedId === null ? null : e.treasures.find((item) => item.id === e.grabbedId);
        const speed = grabbed ? Math.max(8.5, 35 / grabbed.weight) * e.reelBoost : 54;
        e.hookLength = Math.max(REST_LENGTH, e.hookLength - speed * dt);
        if (grabbed) {
          const p = hookPoint(e.angle, e.hookLength);
          grabbed.x = p.x;
          grabbed.y = p.y;
        }
        if (e.hookLength <= REST_LENGTH + .01) {
          if (grabbed) {
            let gained = grabbed.value;
            if (grabbed.type === 'bag') {
              const roll = Math.random();
              if (roll < .25) {
                e.dynamites = Math.min(5, e.dynamites + 1);
                say(isZh ? '神秘袋里是一枚炸药！' : 'A dynamite was inside!');
                sfx.minerBag();
              } else {
                gained = e.lucky ? (roll < .6 ? 320 : 650) : (roll < .65 ? 180 : 420);
                say(isZh ? `神秘袋开出 ${formatMoney(gained)}！` : `Mystery bag: ${formatMoney(gained)}!`);
                sfx.minerGold(true);
              }
            } else {
              sfx.minerGold(grabbed.type === 'diamond' || grabbed.type === 'gold-l');
            }
            e.score += gained;
            e.caught += 1;
          }
          e.grabbedId = null;
          e.hookMode = 'swing';
          e.hookLength = REST_LENGTH;
        }
      }

      if (e.timeLeft <= 0) {
        finishLevel(e);
        return;
      }
      if (now - lastPublish > 28) {
        lastPublish = now;
        publish();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [finishLevel, isZh, phase, publish, say]);

  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      if ((event.key === 'Enter' || event.key === ' ') && (phaseRef.current === 'ready' || phaseRef.current === 'over' || phaseRef.current === 'victory')) {
        event.preventDefault();
        startGame(difficulty);
      } else if ((event.key === 'Enter' || event.key === ' ') && phaseRef.current === 'shop') {
        event.preventDefault();
        nextLevel();
      } else if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
        event.preventDefault();
        togglePause();
      } else if (event.key === 'd' || event.key === 'D') {
        event.preventDefault();
        blastCargo();
      } else if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        launchHook();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [blastCargo, difficulty, launchHook, nextLevel, startGame, togglePause]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && phaseRef.current === 'playing') togglePause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [togglePause]);

  useEffect(() => {
    if (!sound) return;
    sfx.minerBgmStart();
    return () => sfx.minerBgmStop();
  }, [sound]);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    if (effectTimer.current) window.clearTimeout(effectTimer.current);
  }, []);

  const grabbed = snap.grabbedId === null ? null : snap.treasures.find((item) => item.id === snap.grabbedId);
  const visibleTreasures = snap.treasures.filter((item) => !item.taken || item.id === snap.grabbedId);
  const progress = Math.min(100, snap.score / snap.target * 100);
  const timeDanger = snap.timeLeft <= 10;
  const phaseLabel = phase === 'playing' ? (isZh ? '采矿中' : 'MINING') : phase === 'paused' ? (isZh ? '暂停' : 'PAUSED') : phase === 'shop' ? (isZh ? '补给中' : 'SHOP') : phase === 'victory' ? (isZh ? '通关' : 'VICTORY') : phase === 'over' ? (isZh ? '结束' : 'ENDED') : (isZh ? '待出发' : 'READY');

  return (
    <section className="gm-expedition" aria-labelledby="gm-title">
      <header className="gm-heading">
        {headerAction ?? (<div className="gm-title-seal" aria-hidden="true"><i>✦</i><b>金</b><i>◆</i></div>)}
        <div>
          <span>{isZh ? '益智 · 云下寻宝' : 'PUZZLE · CLOUD PROSPECTING'}</span>
          <h2 id="gm-title">{isZh ? '云端黄金矿工' : 'Cloud Gold Miner'}</h2>
          <p>{isZh ? `${playerName}，看准摆钩的方向，放下飞爪，把云层深处的宝藏拉回来！` : `${playerName}, time the swinging claw and haul treasure up from beneath the clouds!`}</p>
        </div>
        <div className="gm-session" aria-label={isZh ? '本次访问最佳' : 'Session best'}>
          <span>{isZh ? '最高收获' : 'Best haul'} <b>{best.score ? formatMoney(Math.max(best.score, snap.score)) : '--'}</b></span>
          <em aria-hidden="true">·</em>
          <span>{isZh ? '最深矿层' : 'Deepest'} <b>{Math.max(best.level, snap.level)} / {LAST_LEVEL}</b></span>
        </div>
      </header>

      <div className="gm-table">
        <div className="gm-stage">
          <div
            className={`gm-mine${shake ? ' shake' : ''}${phase === 'shop' ? ' shopping' : ''}`}
            role="application"
            tabIndex={0}
            aria-label={isZh
              ? `黄金矿场，第 ${snap.level} 层，当前 ${formatMoney(snap.score)}，目标 ${formatMoney(snap.target)}，剩余 ${Math.ceil(snap.timeLeft)} 秒`
              : `Gold mine level ${snap.level}, ${formatMoney(snap.score)} of ${formatMoney(snap.target)}, ${Math.ceil(snap.timeLeft)} seconds left`}
            onPointerDown={(event) => { if ((event.target as HTMLElement).closest('button')) return; launchHook(); }}
          >
            <div className="gm-sky" aria-hidden="true"><i /><i /><span>✦</span></div>
            <div className="gm-rig" aria-hidden="true">
              <span className="gm-wheel"><i /><i /><i /></span>
              <span className="gm-cart"><i>◆</i><i>◆</i><b /><b /></span>
            </div>
            <img className="gm-miner-art" src="/assets/games/gold-miner/miner-hero-v1.webp" alt="" aria-hidden="true" draggable={false} />
            <div className="gm-ground" aria-hidden="true"><i /><i /><i /></div>

            <svg className="gm-hook-layer" viewBox={`0 0 ${FIELD_W} ${FIELD_H}`} preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="gm-rope" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ffe8ad" /><stop offset="1" stopColor="#b87831" /></linearGradient>
              </defs>
              <line className="gm-rope" x1={PIVOT_X} y1={PIVOT_Y} x2={snap.hookX} y2={snap.hookY} />
              <g className="gm-claw" transform={`translate(${snap.hookX} ${snap.hookY}) rotate(${(-snap.angle * 180 / Math.PI).toFixed(2)})`}>
                <circle cx="0" cy="0" r="1.15" />
                <path d="M -0.2 0.7 C -0.8 1.6 -2.1 1.8 -2.5 0.7 M 0.2 0.7 C 0.8 1.6 2.1 1.8 2.5 0.7" />
              </g>
            </svg>

            <div className="gm-treasures" aria-hidden="true">
              {visibleTreasures.map((item) => (
                <span
                  key={item.id}
                  className={`gm-treasure ${item.type}${item.id === snap.grabbedId ? ' grabbed' : ''}`}
                  style={{ left: `${item.x}%`, top: `${item.y / FIELD_H * 100}%`, width: `${item.r * 2}%`, '--rot': `${(item.id * 37) % 28 - 14}deg` } as React.CSSProperties}
                />
              ))}
            </div>

            {explosion && <span key={explosion.id} className="gm-explosion" style={{ left: `${explosion.x}%`, top: `${explosion.y / FIELD_H * 100}%` }} aria-hidden="true"><i /><i /><i /><b>BOOM!</b></span>}
            {toast && <div className="gm-toast" role="status">{toast}</div>}

            {phase !== 'playing' && (
              <div className={`gm-overlay ${phase}`}>
                {phase === 'ready' && <>
                  <span className="gm-overlay-mark">✦</span>
                  <b>{isZh ? '云下金矿正在闪光' : 'The cloud mine is sparkling'}</b>
                  <p>{isZh ? '摆钩对准宝藏时放下飞爪，越重的东西拉得越慢。' : 'Drop the claw when it points at treasure. Heavy finds reel in slowly.'}</p>
                  <small>{isZh ? '空格 / 回车 / 点击矿场：放钩' : 'Space / Enter / tap mine: drop claw'}</small>
                  <button type="button" className="gm-overlay-btn" onClick={() => startGame(difficulty)}>{isZh ? '开始寻金' : 'Start mining'}</button>
                </>}
                {phase === 'paused' && <>
                  <span className="gm-overlay-mark">Ⅱ</span><b>{isZh ? '矿车暂时停靠' : 'Mining paused'}</b><p>{isZh ? '计时已经停下，准备好再继续。' : 'The clock is frozen. Resume when ready.'}</p>
                  <div className="gm-overlay-actions"><button type="button" className="gm-overlay-btn" onClick={togglePause}>{isZh ? '继续采矿' : 'Resume'}</button><button type="button" className="gm-overlay-btn ghost" onClick={() => startGame(difficulty)}>{isZh ? '重新开始' : 'Restart'}</button></div>
                </>}
                {phase === 'shop' && <div className="gm-shop">
                  <div className="gm-shopkeeper">
                    <img src="/assets/games/gold-miner/shopkeeper-v1.webp" alt={isZh ? '补给商店老板洛奇' : 'Rocky the supply shopkeeper'} draggable={false} />
                    <span>{isZh ? '洛奇的云矿补给店' : "ROCKY'S CLOUD SUPPLY"}</span>
                    <b>{isZh ? `第 ${snap.level} 层完成得漂亮！` : `Great work on level ${snap.level}!`}</b>
                    <p>{isZh ? '花掉的收获会从总金额扣除。挑一件称手的补给，也可以直接出发。' : 'Purchases reduce your total haul. Pick a useful supply, or head out now.'}</p>
                    <em>{isZh ? '可用收获' : 'AVAILABLE'} <strong>{formatMoney(snap.score)}</strong></em>
                  </div>
                  <div className="gm-shop-main">
                    <div className="gm-shop-head"><span>{isZh ? '层间商店 · 每件限购一次' : 'BETWEEN-LEVEL SHOP · ONE EACH'}</span><b>{isZh ? '为下一层做好准备' : 'Gear up for the next mine'}</b></div>
                    <div className="gm-shop-grid">
                      {SHOP_ITEMS.map((item) => {
                        const price = shopPrice(item.id, snap.level);
                        const bought = boughtItems.includes(item.id);
                        const soldOut = item.id === 'dynamite' && snap.dynamites >= 5;
                        return <button key={item.id} type="button" className={`gm-shop-item ${item.id}${bought ? ' bought' : ''}`} disabled={bought || soldOut || snap.score < price} onClick={() => buyShopItem(item.id)}>
                          <i aria-hidden="true" />
                          <span><b>{isZh ? item.nameZh : item.nameEn}</b><small>{isZh ? item.descZh : item.descEn}</small></span>
                          <em>{bought ? (isZh ? '已购买' : 'BOUGHT') : soldOut ? (isZh ? '已装满' : 'FULL') : formatMoney(price)}</em>
                        </button>;
                      })}
                    </div>
                    <div className="gm-shop-footer">
                      <span>{isZh ? `下一层目标 ${formatMoney(targetFor(snap.level + 1, snap.difficulty))}` : `Next target ${formatMoney(targetFor(snap.level + 1, snap.difficulty))}`}</span>
                      <button type="button" className="gm-overlay-btn" onClick={nextLevel}>{isZh ? '装车，深入下一层 →' : 'Load up and go →'}</button>
                    </div>
                  </div>
                </div>}
                {phase === 'over' && <>
                  <span className="gm-overlay-mark">⌛</span><b>{isZh ? '矿灯熄灭，航程结束' : 'Mine lights out'}</b><p>{isZh ? `距离目标还差 ${formatMoney(snap.target - snap.score)}，挑轻的宝物会更快。` : `${formatMoney(snap.target - snap.score)} short. Lighter treasure reels in faster.`}</p>
                  <div className="gm-final"><span>{isZh ? '总收获' : 'Total'}<b>{formatMoney(snap.score)}</b></span><span>{isZh ? '到达' : 'Reached'}<b>{isZh ? `第 ${snap.level} 层` : `Level ${snap.level}`}</b></span></div>
                  <button type="button" className="gm-overlay-btn" onClick={() => startGame(difficulty)}>{isZh ? '再挖一趟' : 'Try again'}</button>
                </>}
                {phase === 'victory' && <>
                  <span className="gm-overlay-mark crown">◆</span><b>{isZh ? '五层金矿全部征服！' : 'All five mines conquered!'}</b><p>{isZh ? `${playerName} 成为了空中乐园的黄金矿王。` : `${playerName} is Sky Park's master prospector.`}</p>
                  <div className="gm-final"><span>{isZh ? '最终收获' : 'Final haul'}<b>{formatMoney(snap.score)}</b></span><span>{isZh ? '宝藏' : 'Treasures'}<b>{snap.caught}</b></span></div>
                  <button type="button" className="gm-overlay-btn" onClick={() => startGame(difficulty)}>{isZh ? '开启新航程' : 'New expedition'}</button>
                </>}
              </div>
            )}
          </div>

          <div className="gm-touch-actions">
            <button type="button" className="gm-drop-btn" onClick={launchHook} disabled={phase !== 'playing' || snap.hookMode !== 'swing'}><i>⌄</i><span>{isZh ? '放下飞爪' : 'DROP CLAW'}<small>{isZh ? '看准方向再出手' : 'Time your swing'}</small></span></button>
            <button type="button" className="gm-bomb-btn" onClick={blastCargo} disabled={phase !== 'playing' || !grabbed || snap.dynamites <= 0}><i>◉</i><span>{isZh ? '使用炸药' : 'DYNAMITE'}<small>{isZh ? `剩余 ${snap.dynamites} 枚` : `${snap.dynamites} left`}</small></span></button>
          </div>
        </div>

        <aside className="gm-console">
          <div className="gm-status-card" aria-live="polite">
            <div className="gm-status-top"><small>{isZh ? `第 ${snap.level} / ${LAST_LEVEL} 层` : `LEVEL ${snap.level} / ${LAST_LEVEL}`}</small><em>{phaseLabel}</em></div>
            <div className="gm-money"><span>{isZh ? '当前收获' : 'HAUL'}</span><b>{formatMoney(snap.score)}</b></div>
            <div className="gm-target"><span>{isZh ? '本层目标' : 'TARGET'} <b>{formatMoney(snap.target)}</b></span><span>{Math.round(progress)}%</span><i><b style={{ width: `${progress}%` }} /></i></div>
            <div className={`gm-clock${timeDanger ? ' danger' : ''}`}><span><i>◷</i>{isZh ? '剩余时间' : 'TIME LEFT'}</span><b>{Math.ceil(snap.timeLeft)}<small>s</small></b></div>
            <div className="gm-stats"><span>{isZh ? '已抓宝藏' : 'Treasures'}<b>{snap.caught}</b></span><span>{isZh ? '炸药补给' : 'Dynamite'}<b>{'●'.repeat(snap.dynamites) || '—'}</b></span></div>
            {(snap.reelBoost > 1 || snap.lucky || snap.timeLeft > DIFF[snap.difficulty].time) && <div className="gm-active-buffs">
              {snap.reelBoost > 1 && <span>💪 {isZh ? '大力' : 'Strong'}</span>}
              {snap.lucky && <span>☘ {isZh ? '幸运' : 'Lucky'}</span>}
              {snap.timeLeft > DIFF[snap.difficulty].time && <span>⌛ +15s</span>}
            </div>}
            <p>{grabbed
              ? (isZh ? `正在拉回${treasureMeta[grabbed.type].labelZh}${grabbed.weight > 2.5 ? '，很沉！' : '…'}` : `Reeling ${treasureMeta[grabbed.type].labelEn}${grabbed.weight > 2.5 ? ' — heavy!' : '…'}`)
              : snap.hookMode === 'extending'
                ? (isZh ? '飞爪正穿过云层…' : 'Claw descending…')
                : (isZh ? '轻宝物回收快，大金块分数高。' : 'Light loot is quick; giant gold pays big.')}</p>
          </div>

          <div className="gm-ledger">
            <span>{isZh ? '矿藏图鉴' : 'TREASURE LEDGER'}</span>
            <div><i className="gold">✦</i><b>{isZh ? '金块' : 'Gold'}</b><small>$100—$500</small></div>
            <div><i className="diamond">◆</i><b>{isZh ? '星钻' : 'Diamond'}</b><small>$600 · {isZh ? '轻' : 'light'}</small></div>
            <div><i className="bag">?</i><b>{isZh ? '神秘袋' : 'Mystery bag'}</b><small>{isZh ? '惊喜补给' : 'surprise'}</small></div>
            <div><i className="rock">●</i><b>{isZh ? '云岩' : 'Rock'}</b><small>$25 · {isZh ? '沉' : 'heavy'}</small></div>
          </div>

          <div className="gm-difficulty" role="group" aria-label={isZh ? '选择采矿难度' : 'Choose mining difficulty'}>
            <span>{isZh ? '航程难度' : 'DIFFICULTY'}</span>
            <div>{(['easy', 'normal', 'hard'] as Diff[]).map((item) => <button key={item} type="button" className={difficulty === item ? 'active' : ''} aria-pressed={difficulty === item} disabled={phase === 'playing' || phase === 'paused' || phase === 'shop'} onClick={() => { setDifficulty(item); engineRef.current = makeEngine(item); publish(); }}><i />{isZh ? diffText[item].zh : diffText[item].en}</button>)}</div>
            <small>{isZh ? diffText[difficulty].hintZh : diffText[difficulty].hintEn}</small>
          </div>

          <div className="gm-actions"><button type="button" onClick={togglePause} disabled={phase !== 'playing' && phase !== 'paused'}>{phase === 'paused' ? (isZh ? '▶ 继续' : '▶ Resume') : (isZh ? 'Ⅱ 暂停' : 'Ⅱ Pause')}</button><button type="button" onClick={() => startGame(difficulty)}>{isZh ? '↻ 重开' : '↻ Restart'}</button></div>

          <div className="gm-rule-note"><span>SPACE</span><p>{isZh ? '空格 / 点击放钩 · D 炸掉已抓物 · P 暂停 · 达成本层目标后继续深入，共 5 层' : 'Space / tap to drop · D blasts held cargo · P pauses · meet each target across 5 levels'}</p></div>
        </aside>
      </div>
    </section>
  );
}
