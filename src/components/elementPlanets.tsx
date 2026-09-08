import { useId } from 'react';

/* =====================================================================
   元素星球（火/风/冰/水）：立体渐变球 + 中央元素 emoji + 高光暗边
   既有“球”的立体感，又能一眼认出元素，与火箭/飞碟情绪统一
   ===================================================================== */

export type ElementKind = 'fire' | 'wind' | 'ice' | 'water';

const EMOJI: Record<ElementKind, string> = {
  fire: '🔥',
  wind: '🌪️',
  ice: '❄️',
  water: '💧',
};

const PALETTES: Record<ElementKind, { a: string; b: string; c: string; ring: string }> = {
  fire: { a: '#FFEA9A', b: '#F2804E', c: '#B3261E', ring: 'rgba(255,160,100,0.7)' },
  wind: { a: '#E9FCF7', b: '#8FD9CE', c: '#2E8E8A', ring: 'rgba(200,246,238,0.75)' },
  ice: { a: '#F2FAFF', b: '#A9DCF4', c: '#3E7FB8', ring: 'rgba(214,240,255,0.85)' },
  water: { a: '#CBE6FA', b: '#5E9BD6', c: '#1F4A82', ring: 'rgba(170,215,248,0.75)' },
};

export function ElementPlanet({ kind }: { kind: ElementKind }) {
  const u = useId();
  const p = PALETTES[kind];
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" className={`element-planet e-${kind}`} aria-hidden="true">
      <defs>
        <radialGradient id={`${u}-s`} cx="0.42" cy="0.5" r="0.7">
          <stop offset="0" stopColor={p.a} />
          <stop offset="0.55" stopColor={p.b} />
          <stop offset="1" stopColor={p.c} />
        </radialGradient>
        <radialGradient id={`${u}-ball`} cx="0.36" cy="0.32" r="0.86">
          <stop offset="0" stopColor={p.a} />
          <stop offset="0.5" stopColor={p.b} />
          <stop offset="1" stopColor={p.c} />
        </radialGradient>
      </defs>

      {/* 星环 */}
      <ellipse
        className="planet-ring"
        cx="50" cy="52" rx="46" ry="14"
        fill="none" stroke={p.ring} strokeWidth="3.2"
        transform="rotate(-16 50 52)" opacity="0.9"
      />

      {/* 色光晕（模糊） */}
      <circle className="planet-halo" cx="50" cy="52" r="44" fill={`url(#${u}-s)`} />

      {/* 立体球体 */}
      <circle className="planet-ball" cx="50" cy="52" r="30" fill={`url(#${u}-ball)`} />
      <ellipse className="planet-limb-l" cx="36" cy="42" rx="20" ry="14" fill="#fff" opacity="0.42" />
      <path className="planet-limb-d" d="M50 22 a30 30 0 1 0 0.01 0 z" fill="none" stroke={p.c} strokeWidth="6" opacity="0.35" />

      {/* 中央元素 emoji */}
      <text className="planet-emoji" x="50" y="63" textAnchor="middle" fontSize="34">
        {EMOJI[kind]}
      </text>

      {/* 球面反光 */}
      <ellipse className="planet-glint" cx="40" cy="44" rx="6" ry="4" fill="#fff" opacity="0.7" />

      {/* kind 点缀 */}
      {kind === 'fire' && (
        <>
          <text className="spark s1" x="24" y="30" fontSize="15">✨</text>
          <text className="spark s2" x="78" y="28" fontSize="13">✨</text>
          <text className="spark s3" x="76" y="70" fontSize="15">✨</text>
        </>
      )}
      {kind === 'ice' && (
        <>
          {/* 雪花在球外围闪耀（彩色雪花 + 白色兜底，避免深色球上发黑） */}
          <text className="snow p1" x="25" y="32" fontSize="14" fill="#fff">❄️</text>
          <text className="snow p2" x="74" y="28" fontSize="12" fill="#fff">❄️</text>
          <text className="snow p3" x="72" y="66" fontSize="15" fill="#fff">❄️</text>
          <text className="snow p4" x="29" y="66" fontSize="13" fill="#fff">❄️</text>
          <text className="snow p5" x="52" y="78" fontSize="14" fill="#fff">❄️</text>
        </>
      )}
      {kind === 'water' && (
        <>
          {/* 水滴在球外围闪耀 */}
          <text className="bubble b1" x="27" y="34" fontSize="14">💧</text>
          <text className="bubble b2" x="74" y="30" fontSize="13">💧</text>
          <text className="bubble b3" x="71" y="68" fontSize="15">💧</text>
        </>
      )}
      {kind === 'wind' && (
        <>
          {/* 环绕气流：几条弧线绕球旋转 */}
          <g className="wind-orbit">
            <path d="M12 50 A 38 38 0 0 1 50 12" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.75" />
            <path d="M88 50 A 38 38 0 0 1 50 88" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5" />
          </g>
          <g className="wind-orbit w2">
            <path d="M18 52 A 32 32 0 0 1 52 18" stroke="#BFF2E6" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
            <path d="M82 48 A 32 32 0 0 1 48 82" stroke="#BFF2E6" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.45" />
          </g>
        </>
      )}
    </svg>
  );
}
