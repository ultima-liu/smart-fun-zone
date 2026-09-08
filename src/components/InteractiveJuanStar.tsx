import { useEffect, useId, useRef, useState } from 'react';
import { SchoolBuilding, HqBuilding, SupplyStation, SkyPark, LibraryBuilding, ShipyardBuilding } from './buildings';
import { ElementPlanet, type ElementKind } from './elementPlanets';
import type { CSSProperties, PointerEvent, MouseEvent as ReactMouseEvent } from 'react';

/* =====================================================================
   InteractiveJuanStar · 首页大卷星（可拖拽旋转 + 点击交互 + 数据联动）
   - 拖拽旋转（带惯性，松手阻尼）
   - 点击弹跳 + 豆雨爆发
   - 3 颗普通星球绕行（纯装饰）
   - 星球表面建筑：学校 / 总部；悬浮建筑：补给站 / 空中乐园
   - 数据联动：绿化草皮(gardenPct) / 豆豆树(gardenStage) / 星环(stars) / 双环(streak) / 任务气泡(pending)
   ===================================================================== */

const SURFACE_W = 560; // 地表纹理带宽度（约 2 倍球径，可滚动）

const MOONS: { phase: number; kind: ElementKind }[] = [
  { phase: 0, kind: 'fire' },
  { phase: 90, kind: 'wind' },
  { phase: 180, kind: 'ice' },
  { phase: 270, kind: 'water' },
];

const SPOTS = [
  { node: <SchoolBuilding size={96} />, name: { zh: '学校', en: 'School' }, to: '/map', cls: 'school' },
  { node: <HqBuilding size={96} />, name: { zh: '总部', en: 'HQ' }, to: '/profile', cls: 'hq' },
  { node: <LibraryBuilding size={96} />, name: { zh: '星核档案库', en: 'Star Archive' }, to: '/archive', cls: 'archive' },
  { node: <ShipyardBuilding size={96} />, name: { zh: '船坞', en: 'Dock' }, to: '/dock', cls: 'dock' },
];

const FLOATERS = [
  { node: <SupplyStation size={128} />, name: { zh: '补给站', en: 'Supply' }, to: '/store', cls: 'fl-left' },
  { node: <SkyPark size={140} />, name: { zh: '空中乐园', en: 'Sky Park' }, to: '/lobby', cls: 'fl-right' },
];

const TREE_STAGE = ['🌱', '🌿', '🌸', '🌰', '🪐'];

/** 解锁特效：多颗粒子 + 上飘文字 */
function UnlockFx({ word }: { word: string }) {
  return (
    <span className="js-unfx" aria-hidden="true">
      <i className="unf-word">{word}</i>
      {Array.from({ length: 10 }).map((_, i) => (
        <i key={i} className={`unf-p p${(i % 6) + 1}`} />
      ))}
    </span>
  );
}

interface Props {
  stars: number;
  streak: number;
  gardenPct: number; // 0~1 花园进度 → 绿化面积
  gardenStage: number; // 1~5 豆豆树阶段
  pendingTasks: number;
  lang: 'zh' | 'en';
  onNav: (to: string) => void;
  /** 剧情封印：未解锁的建筑灰暗 + 锁（school/park/store） */
  sealed?: { school?: boolean; park?: boolean; store?: boolean };
  /** 刚解封的目标路径（'/map'|'/lobby'|'/store'|'/profile'|'core'），触发一次解封光效 */
  pulse?: string | null;
}

/** 星环亮度分级（总星星 0/6/16/30/60） */
function ringTier(stars: number): number {
  if (stars >= 60) return 5;
  if (stars >= 30) return 4;
  if (stars >= 16) return 3;
  if (stars >= 6) return 2;
  return 1;
}

export default function InteractiveJuanStar({
  stars,
  streak,
  gardenPct,
  gardenStage,
  pendingTasks,
  lang,
  onNav,
  sealed,
  pulse,
}: Props) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const surfaceFarRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const angle = useRef(0);
  const vel = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const moved = useRef(0);
  const orbit = useRef(0);
  const [bounce, setBounce] = useState(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  /** rAF：自转 + 惯性衰减 + 月球轨道，直接写 transform 避免重渲染 */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const orbitEl = orbitRef.current;
    let moons: NodeListOf<HTMLElement> | null = null;
    let R = 56;
    const measure = () => {
      if (!orbitEl) return;
      const sphereW = orbitEl.parentElement?.querySelector<HTMLElement>('.js-sphere')?.offsetWidth ?? 268;
      const gap = parseFloat(getComputedStyle(orbitEl).getPropertyValue('--orbit-gap')) || 52;
      R = sphereW / 2 + gap;
      moons = orbitEl.querySelectorAll<HTMLElement>('.js-moon');
    };
    measure();
    window.addEventListener('resize', measure);
    const apply = () => {
      const surf = surfaceRef.current;
      if (surf) surf.style.transform = `translateX(${-angle.current}px)`;
      const surfFar = surfaceFarRef.current;
      if (surfFar) surfFar.style.transform = `translateX(${-angle.current * 0.55}px)`;
      // 普通星球绕行（近大远小 + 前后穿插）；缓存 moons 与半径，避免每帧 getComputedStyle/querySelectorAll
      if (moons) {
        moons.forEach((el, i) => {
          const phase = MOONS[i]?.phase ?? i * 120;
          const deg = orbit.current + phase;
          const rad = (deg * Math.PI) / 180;
          const x = Math.cos(rad) * R;
          const y = Math.sin(rad) * R * 0.62;
          const depth = 1 + Math.sin(rad) * 0.05;
          el.style.transform = `translate(${x}px, ${y}px) scale(${depth.toFixed(3)})`;
          el.style.zIndex = Math.sin(rad) > 0 ? '30' : '10';
          // 远端变暗改为 opacity（合成器友好），避免每帧 filter 重栅格导致卡顿
          el.style.opacity = Math.sin(rad) < 0 ? '0.8' : '1';
        });
      }
    };
    const loop = (t: number) => {
      const dt = t - last;
      last = t;
      if (!reduced.current) {
        if (!dragging.current) {
          angle.current += dt * 0.005; // 空闲自转（降速）
          vel.current *= 0.94; // 惯性阻尼
          angle.current += vel.current;
          orbit.current += dt * 0.006; // 元素星球公转（降速）
        }
      }
      angle.current = ((angle.current % SURFACE_W) + SURFACE_W) % SURFACE_W;
      apply();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', measure); };
  }, []);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    dragging.current = true;
    lastX.current = e.clientX;
    moved.current = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastX.current;
    lastX.current = e.clientX;
    moved.current += Math.abs(dx);
    angle.current += dx * 0.45;
    vel.current = dx * 0.45;
  };
  const onUp = () => {
    dragging.current = false;
  };
  const onClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (moved.current >= 6) return;
    setBounce(true);
    window.setTimeout(() => setBounce(false), 560);
    const rect = e.currentTarget.getBoundingClientRect();
    window.dispatchEvent(new CustomEvent('sfz-beans-burst', { detail: { n: 8, rect } }));
  };

  const tier = ringTier(stars);
  const treeEmoji = TREE_STAGE[Math.max(0, Math.min(4, gardenStage - 1))];
  const pct = Math.max(0, Math.min(1, gardenPct));

  return (
    <div className="juan-star" style={{ '--ring-glow': 0.35 + tier * 0.12 } as CSSProperties}>
      {/* 光环（streak ≥7 第二圈） */}
      {streak >= 7 && <span className="js-halo" aria-hidden="true" />}

      {/* 大气层辉光 */}
      <span className="js-atmosphere" aria-hidden="true" />

      {/* 星环（在球体后方） */}
      <svg className="js-ring" viewBox="0 0 360 130" aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}-ring`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#F2A65A" />
            <stop offset="0.5" stopColor="#F6C24B" />
            <stop offset="1" stopColor="#C986E8" />
          </linearGradient>
        </defs>
        <ellipse cx="180" cy="65" rx="172" ry="46" fill="none" stroke={`url(#${uid}-ring)`} strokeWidth="11" opacity="0.92" />
        <ellipse cx="180" cy="65" rx="152" ry="36" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" />
        {Array.from({ length: tier * 2 }).map((_, i) => {
          const a = (i / (tier * 2)) * Math.PI * 2;
          return (
            <circle
              key={i}
              cx={180 + Math.cos(a) * 162}
              cy={65 + Math.sin(a) * 41}
              r={i % 2 ? 2.2 : 3}
              fill={i % 2 ? '#C4B5FD' : '#FFF3D6'}
            />
          );
        })}
      </svg>

      {/* 球体（可拖拽/点击） */}
      <div
        className={`js-sphere ${bounce ? 'is-bounce' : ''}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClick={onClick}
        role="button"
        aria-label={lang === 'zh' ? '卷星：拖拽旋转，点击弹跳' : 'Juan Star: drag to spin, tap to bounce'}
      >
        {/* 远景纹理带（视差慢速：远处丘陵，营造球面纵深） */}
        <div className="js-surface-far" ref={surfaceFarRef}>
          <svg viewBox={`0 0 ${SURFACE_W} 280`} preserveAspectRatio="none" aria-hidden="true">
            <g fill="none" stroke="rgba(157,140,255,0.28)" strokeWidth="4" strokeLinecap="round">
              <path d="M40 210 q 26 -22 52 -4 q -24 20 -48 8 q -6 -1 -4 -4z" />
              <path d="M170 232 q 30 -24 60 -4 q -28 22 -56 8 z" />
              <path d="M330 216 q 26 -20 52 -4 q -24 18 -48 8 z" />
              <path d="M470 236 q 30 -26 60 -4 q -28 24 -56 8 z" />
            </g>
          </svg>
        </div>

        {/* 近景纹理带（随旋转平移） */}
        <div className="js-surface" ref={surfaceRef}>
          <svg viewBox={`0 0 ${SURFACE_W} 280`} preserveAspectRatio="none" aria-hidden="true">
            <g>
              <ellipse cx="120" cy="60" rx="34" ry="13" fill="rgba(16,13,38,0.55)" />
              <path d="M86 60 a34 13 0 0 0 68 0" fill="none" stroke="rgba(196,181,253,0.35)" strokeWidth="2" />
              <path d="M90 56 a30 10 0 0 1 56 2" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
              <ellipse cx="300" cy="200" rx="26" ry="10" fill="rgba(16,13,38,0.5)" />
              <path d="M274 200 a26 10 0 0 0 52 0" fill="none" stroke="rgba(196,181,253,0.28)" strokeWidth="2" />
              <ellipse cx="470" cy="90" rx="30" ry="12" fill="rgba(16,13,38,0.55)" />
              <path d="M440 90 a30 12 0 0 0 60 0" fill="none" stroke="rgba(196,181,253,0.35)" strokeWidth="2" />
            </g>
            <ellipse cx="420" cy="200" rx="42" ry="12" fill="#221B4E" stroke="rgba(196,181,253,0.45)" strokeWidth="2" />
            <path d="M386 198 q 14 -5 28 0 M398 202 q 12 -4 24 0" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.6" />
            <path d="M406 198 l1.6 3.2 3.4 0.4 -2.6 2.3 0.7 3.4 -3.1 -1.7 -3.1 1.7 0.7 -3.4 -2.6 -2.3 3.4 -0.4z" fill="#C4B5FD" />
          </svg>
        </div>


        {/* 绿化草皮（gardenPct 决定覆盖） */}
        <div className="js-grass" style={{ width: `${20 + pct * 80}%` }} aria-hidden="true" />

        {/* 豆豆树（随花园阶段生长） */}
        <span className="js-tree" aria-hidden="true">
          {treeEmoji}
        </span>

        {/* 任务气泡 */}
        {pendingTasks > 0 && (
          <button className="js-task-bubble" onClick={() => onNav('#station')} aria-label="tasks">
            <span className="js-task-icon">🎯</span>
            <b>{pendingTasks}</b>
          </button>
        )}

        {/* 球体高光（左上受光） */}
        <span className="js-sheen" aria-hidden="true" />

        {/* 漂移高光（弧形光泽缓慢扫过，增强球体感） */}
        <span className="js-gleam" aria-hidden="true" />

        {/* 边缘压暗（球面明暗交界） */}
        <span className="js-limb" aria-hidden="true" />

        {/* 表面星光（随星球呼吸闪烁） */}
        <span className="js-stars" aria-hidden="true">
          <i className="s1">✦</i>
          <i className="s2">✧</i>
          <i className="s3">✦</i>
          <i className="s4">✧</i>
        </span>
      </div>

      {/* 星环前弧（压过球面下半，立体交叉感） */}
      <svg className="js-ring-front" viewBox="0 0 360 130" aria-hidden="true">
        <defs>
          <mask id={`${uid}-front`}>
            <rect x="0" y="0" width="360" height="65" fill="black" />
            <rect x="0" y="65" width="360" height="65" fill="white" />
          </mask>
        </defs>
        <ellipse
          cx="180" cy="65" rx="172" ry="46"
          fill="none"
          stroke={`url(#${uid}-ring)`}
          strokeWidth="11"
          opacity="0.95"
          mask={`url(#${uid}-front)`}
        />
        <ellipse
          cx="180" cy="65" rx="152" ry="36"
          fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5"
          mask={`url(#${uid}-front)`}
        />
      </svg>

      {/* 环绕星尘（沿外圈公转） */}
      <span className="js-orbiter o1" aria-hidden="true" />
      <span className="js-orbiter o2" aria-hidden="true" />

      {/* 普通星球（绕行装饰） */}
      <div className="js-orbit" ref={orbitRef}>
        <span className="js-orbit-track" aria-hidden="true" />
        {MOONS.map((m, i) => (
          <span key={i} className={`js-moon e-${m.kind}`} aria-hidden="true">
            <ElementPlanet kind={m.kind} />
          </span>
        ))}
      </div>

      {/* 球面建筑（学校 / 总部）：固定在星球顶部两侧，贴合地面 */}
      <div className="js-buildings">
        {SPOTS.map((sp) => {
          const locked = sp.to === '/map' ? !!sealed?.school : false; // 总部不锁
          const hot = !!pulse && pulse === sp.to;
          return (
            <button
              key={sp.to}
              className={`js-spot ${sp.cls}${locked ? ' sealed' : ''}${hot ? ' burst' : ''}`}
              onClick={() => onNav(sp.to)}
              aria-label={sp.name[lang]}
            >
              {locked && <i className="spot-lock" aria-hidden="true">🔒</i>}
              <span className="js-spot-art">{sp.node}</span>
              <span className="js-spot-label">{sp.name[lang]}</span>
              {hot && <UnlockFx word={lang === 'zh' ? `${sp.name[lang]} · 解锁！` : `${sp.name[lang]} unlocked!`} />}
            </button>
          );
        })}
      </div>

      {/* 悬浮建筑（补给站 / 空中乐园） */}
      {FLOATERS.map((f) => {
        const locked = f.to === '/lobby' ? !!sealed?.park : f.to === '/store' ? !!sealed?.store : false;
        const hot = !!pulse && pulse === f.to;
        return (
          <button
            key={f.to}
            className={`js-floater ${f.cls}${locked ? ' sealed' : ''}${hot ? ' burst' : ''}`}
            onClick={() => onNav(f.to)}
            aria-label={f.name[lang]}
          >
            {locked && <i className="spot-lock" aria-hidden="true">🔒</i>}
            <span className="js-floater-art">{f.node}</span>
            <span className="js-floater-label">{f.name[lang]}</span>
            {hot && <UnlockFx word={lang === 'zh' ? `${f.name[lang]} · 解锁！` : `${f.name[lang]} unlocked!`} />}
          </button>
        );
      })}

      {/* 卷星中心点灯（通用剧情完成反馈） */}
      {pulse === 'core' && (
        <span className="js-core-lamp" aria-hidden="true">
          <i className="core-word">{lang === 'zh' ? '任务完成！' : 'Quest done!'}</i>
        </span>
      )}
    </div>
  );
}
