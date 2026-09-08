import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

/* =====================================================================
   卷卷星球 · 宇宙装饰组件库（纯 SVG + CSS 动画，无外部素材）
   - CosmosSky：全局星空层（星点/星云/远处行星/流星）
   - JuanHorizon：卷星地平线（星球表面曲率 + 卷卷丘陵 + 星环 + 星星湖）
   - BeanTree：卷星地表豆豆树
   ===================================================================== */

/** 固定种子伪随机（保证每次渲染星空一致，无 SSR 漂移） */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STAR_SEED = mulberry32(20240601);
const SHOOT_SEED = mulberry32(20240714);
// 流星雨：一轮 7 颗，同一起点附近错峰划过（各自独立周期 16~20s，会聚成雨）
const SHOWER = Array.from({ length: 7 }, () => ({
  left: +(76 + SHOOT_SEED() * 20).toFixed(1),
  top: +(4 + SHOOT_SEED() * 14).toFixed(1),
  delay: +(SHOOT_SEED() * 2.2).toFixed(1),
  dur: +(15 + SHOOT_SEED() * 5).toFixed(1),
}));
const STARS = Array.from({ length: 42 }, () => ({
  x: +(STAR_SEED() * 100).toFixed(1),
  y: +(STAR_SEED() * 72).toFixed(1),
  r: +(1.4 + STAR_SEED() * 1.9).toFixed(1),
  delay: +(STAR_SEED() * 6).toFixed(1),
  dur: +(2.6 + STAR_SEED() * 3.6).toFixed(1),
  op: +(0.3 + STAR_SEED() * 0.55).toFixed(2),
}));

/** 全站星空层：星点 + 星云弧光 + 两颗远星 + 周期性流星 */
export function CosmosSky({ className = '' }: { className?: string }) {
  return (
    <div className={`cosmos-sky ${className}`} aria-hidden="true">
      <span className="cos-nebula" />
      {STARS.map((s, i) => (
        <span
          key={i}
          className="cos-star"
          style={
            {
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.r}px`,
              height: `${s.r}px`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.dur}s`,
              opacity: s.op,
            } as CSSProperties
          }
        />
      ))}
      {/* 远处带环行星 + 薄荷卫星 */}
      <span className="cos-planet ringed" />
      <span className="cos-planet moon" />
      {/* 流星（单颗周期） + 流星雨（错峰成雨） */}
      <span className="cos-shoot" />
      {SHOWER.map((m, i) => (
        <span
          key={`sh-${i}`}
          className="cos-shoot shower"
          style={
            {
              left: `${m.left}%`,
              top: `${m.top}%`,
              animationDelay: `${m.delay}s`,
              animationDuration: `${m.dur}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/**
 * 卷星地平线：hero 场景背景
 * 星球表面曲率弧 + 卷卷丘陵 + 横贯星环 + 星星湖 + 环形山
 */
export function JuanHorizon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 190"
      className={`juan-horizon ${className}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="jh-surf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3D3574" />
          <stop offset="0.55" stopColor="#2A2358" />
          <stop offset="1" stopColor="#1B1642" />
        </linearGradient>
        <linearGradient id="jh-glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(157,140,255,0)" />
          <stop offset="1" stopColor="rgba(157,140,255,0.20)" />
        </linearGradient>
      </defs>

      {/* 天空光晕 */}
      <ellipse cx="200" cy="110" rx="185" ry="82" fill="url(#jh-glow)" />

      {/* 卷星星环（横贯天空） */}
      <ellipse cx="200" cy="158" rx="252" ry="54" fill="none" stroke="rgba(196,181,253,0.34)" strokeWidth="3" transform="rotate(-7 200 158)" />
      <ellipse cx="200" cy="158" rx="230" ry="46" fill="none" stroke="rgba(242,166,90,0.26)" strokeWidth="1.5" transform="rotate(-7 200 158)" />

      {/* 远处小行星带（三颗小点沿环） */}
      <circle cx="60" cy="126" r="2.4" fill="#F6C24B" opacity="0.85" />
      <circle cx="322" cy="118" r="2" fill="#C4B5FD" opacity="0.8" />
      <circle cx="356" cy="146" r="1.7" fill="#F6C24B" opacity="0.7" />

      {/* 卷星地表（巨大曲率弧） */}
      <path d="M0 190 L0 130 Q 200 50 400 130 L400 190 Z" fill="url(#jh-surf)" />

      {/* 卷卷丘陵（三层波浪） */}
      <path d="M0 152 Q 70 128 128 148 T 262 146 T 400 140 L400 190 L0 190 Z" fill="rgba(139,123,240,0.18)" />
      <path d="M0 168 Q 90 150 168 166 T 330 164 T 400 160 L400 190 L0 190 Z" fill="rgba(157,140,255,0.12)" />

      {/* 卷卷草坡（螺旋卷纹） */}
      <g fill="none" stroke="rgba(196,181,253,0.45)" strokeWidth="2.2" strokeLinecap="round">
        <path d="M30 178 q 16 -10 32 -2 q -14 10 -28 6 q -8 -1 -4 -4z" />
        <path d="M120 182 q 14 -9 28 -2 q -13 9 -26 6 z" />
        <path d="M250 178 q 16 -10 32 -2 q -14 10 -28 6 z" />
      </g>

      {/* 环形山 */}
      <ellipse cx="76" cy="152" rx="24" ry="8" fill="rgba(16,13,38,0.55)" stroke="rgba(196,181,253,0.22)" strokeWidth="1.4" />
      <ellipse cx="168" cy="166" rx="14" ry="5" fill="rgba(16,13,38,0.5)" />

      {/* 星星湖（湖面倒映星点） */}
      <ellipse cx="330" cy="162" rx="36" ry="10" fill="#221B4E" stroke="rgba(196,181,253,0.42)" strokeWidth="1.6" />
      <path d="M316 160 l1.4 2.8 3 0.4 -2.2 2 0.6 3 -2.8 -1.5 -2.8 1.5 0.6 -3 -2.2 -2 3 -0.4z" fill="#C4B5FD" opacity="0.9" />
      <circle cx="342" cy="163" r="1.2" fill="#F6C24B" opacity="0.9" />
      <circle cx="330" cy="160" r="1" fill="#C4B5FD" opacity="0.8" />
    </svg>
  );
}

/** 卷星地表豆豆树：卷卷树干 + 星云紫树冠 + 三颗卷卷豆 */
export function BeanTree({ size = 64, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 122"
      width={size}
      height={size * 1.22}
      className={`bean-tree ${className}`}
      aria-hidden="true"
    >
      {/* 卷卷树干 */}
      <path d="M50 120 Q 47 92 46 72" stroke="#7A5A3E" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M47 86 Q 34 82 30 90" stroke="#7A5A3E" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M48 66 Q 60 60 64 66" stroke="#7A5A3E" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      {/* 树冠（星云紫三团） */}
      <g className="bt-canopy">
        <circle cx="50" cy="48" r="31" fill="#8B7BF0" opacity="0.92" />
        <circle cx="30" cy="58" r="19" fill="#9D8CFF" opacity="0.9" />
        <circle cx="70" cy="58" r="19" fill="#6C5CE7" opacity="0.9" />
        <circle cx="50" cy="32" r="17" fill="#A78BFA" opacity="0.92" />
        <path d="M36 34 q8 -8 16 0" stroke="#C4B5FD" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
      </g>
      {/* 卷卷豆 */}
      <g className="bt-beans">
        <ellipse cx="34" cy="72" rx="5.5" ry="7" fill="#F6C24B" transform="rotate(-18 34 72)" />
        <ellipse cx="55" cy="76" rx="5.5" ry="7" fill="#F2A65A" transform="rotate(12 55 76)" />
        <ellipse cx="72" cy="68" rx="5" ry="6.5" fill="#F6C24B" transform="rotate(-10 72 68)" />
      </g>
    </svg>
  );
}

/** 各 tab 建筑身份（学校/空中乐园/总部/补给站） */
export type PlanetKind = 'academy' | 'funpark' | 'hut' | 'grocery';

const PLANET_META: Record<PlanetKind, { main: string; glow: string; ring: string; glyph: string }> = {
  academy: { main: '#A78BFA', glow: 'rgba(157,140,255,0.55)', ring: '#C4B5FD', glyph: '🏫' },
  funpark: { main: '#F2A65A', glow: 'rgba(246,194,75,0.55)', ring: '#F6C24B', glyph: '🎡' },
  hut: { main: '#7FD0B4', glow: 'rgba(127,208,180,0.5)', ring: '#A9E8CF', glyph: '🏛️' },
  grocery: { main: '#8FC5E8', glow: 'rgba(143,197,232,0.5)', ring: '#B8DFF4', glyph: '🏪' },
};

/** 单颗「星球身份」：主星 + 倾斜星环 + 中央图标，供各 tab 页头使用 */
export function SystemPlanet({ kind, size = 46 }: { kind: PlanetKind; size?: number }) {
  const m = PLANET_META[kind];
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={`system-planet kind-${kind}`} aria-hidden="true">
      <ellipse
        cx="32" cy="32" rx="30" ry="11"
        fill="none" stroke={m.ring} strokeWidth="3"
        transform="rotate(-16 32 32)" opacity="0.75"
      />
      <circle cx="32" cy="32" r="21" fill={m.main} />
      <ellipse cx="26" cy="27" rx="12" ry="7" fill="#fff" opacity="0.22" transform="rotate(-18 26 27)" />
      <circle cx="38" cy="37" r="3.4" fill="rgba(0,0,0,0.18)" />
      <circle cx="27" cy="36" r="2.2" fill="rgba(0,0,0,0.14)" />
      <text x="32" y="39" textAnchor="middle" fontSize="17">{m.glyph}</text>
    </svg>
  );
}

/** 卷星两侧宇宙舰队：飞碟/火箭/卫星/彗星/星尘
 *  交互：🚀 点击发射飞走（数秒后归位）；🛸 点击自旋一圈 */
export function CosmicFleet({ className = '' }: { className?: string }) {
  const [rocket, setRocket] = useState<'idle' | 'launch' | 'gone' | 'return'>('idle');
  const [spin, setSpin] = useState(false);
  const [ping, setPing] = useState(false);
  const [comet, setComet] = useState<'idle' | 'boost' | 'gone' | 'return'>('idle');
  const timers = useRef<number[]>([]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => {
    return () => timers.current.forEach((t) => window.clearTimeout(t));
  }, []);

  const launchRocket = () => {
    if (rocket !== 'idle') return;
    setRocket('launch');
  };
  const rocketAnimEnd = () => {
    if (rocket === 'launch') {
      setRocket('gone');
      later(() => setRocket('return'), 3200);
    } else if (rocket === 'return') {
      setRocket('idle');
    }
  };
  // 飞碟：水平绕小圈
  const spinUfo = () => {
    setSpin(false);
    requestAnimationFrame(() => setSpin(true));
    later(() => setSpin(false), 1500);
  };
  // 卫星：点一下放一波信号波纹
  const pingSat = () => {
    setPing(false);
    requestAnimationFrame(() => setPing(true));
    later(() => setPing(false), 1500);
  };
  // 彗星：平时停靠待命；点击向斜上飞出 → 数秒后归位
  const boostComet = () => {
    if (comet !== 'idle') return;
    setComet('boost');
  };
  const cometAnimEnd = () => {
    if (comet === 'boost') {
      setComet('gone');
      later(() => setComet('return'), 2600);
    } else if (comet === 'return') {
      setComet('idle');
    }
  };

  return (
    <div className={`cosmic-fleet ${className}`}>
      <button
        type="button"
        className={`cf-ufo ${spin ? 'spin' : ''}`}
        onClick={spinUfo}
        aria-label="飞碟绕个小圈"
      >
        🛸
      </button>
      <button
        type="button"
        className={`cf-rocket st-${rocket}`}
        onClick={launchRocket}
        onAnimationEnd={rocketAnimEnd}
        aria-label="发射火箭"
      >
        🚀
      </button>
      <button
        type="button"
        className={`cf-sat ${ping ? 'burst' : ''}`}
        onClick={pingSat}
        aria-label="卫星放信号"
      >
        <span className="cf-sat-emoji" aria-hidden="true">🛰️</span>
        {ping && (
          <>
            <i className="cw c1" />
            <i className="cw c2" />
            <i className="cw c3" />
          </>
        )}
      </button>
      <button
        type="button"
        className={`cf-comet st-${comet}`}
        onClick={boostComet}
        onAnimationEnd={cometAnimEnd}
        aria-label="彗星加速"
      >
        ☄️
      </button>
      <span className="cf-star s1" aria-hidden="true">✨</span>
      <span className="cf-star s2" aria-hidden="true">⭐</span>
      <span className="cf-star s3" aria-hidden="true">✨</span>
    </div>
  );
}
