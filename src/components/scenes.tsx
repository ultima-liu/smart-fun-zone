import type { ComponentType } from 'react';
import type { SubjectId } from '../types';

/* ============ 六大主题场景插画（纯 SVG 手绘风） ============ */

function Sun({ cx = 690, cy = 46 }: { cx?: number; cy?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={26} fill="#FFE082" />
      <g stroke="#FFE082" strokeWidth="5" strokeLinecap="round">
        <path d={`M${cx} ${cy - 36} v-8`} />
        <path d={`M${cx} ${cy + 36} v8`} />
        <path d={`M${cx - 36} ${cy} h-8`} />
        <path d={`M${cx + 36} ${cy} h8`} />
        <path d={`M${cx - 26} ${cy - 26} l-6 -6`} />
        <path d={`M${cx + 26} ${cy + 26} l6 6`} />
        <path d={`M${cx + 26} ${cy - 26} l6 -6`} />
        <path d={`M${cx - 26} ${cy + 26} l-6 6`} />
      </g>
    </g>
  );
}

function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity="0.9">
      <ellipse cx="0" cy="0" rx="26" ry="15" fill="#fff" />
      <ellipse cx="20" cy="-9" rx="20" ry="13" fill="#fff" />
      <ellipse cx="-22" cy="-6" rx="18" ry="11" fill="#fff" />
    </g>
  );
}

export function FarmScene() {
  return (
    <svg className="scene" viewBox="0 0 800 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="farmSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#BDEBFF" />
          <stop offset="1" stopColor="#E3F9FF" />
        </linearGradient>
      </defs>
      <rect width="800" height="220" fill="url(#farmSky)" />
      <Sun cx={120} cy={52} />
      <Cloud x={300} y={46} />
      <Cloud x={560} y={70} s={0.8} />
      <ellipse cx="180" cy="196" rx="240" ry="66" fill="#A8E6A0" />
      <ellipse cx="620" cy="200" rx="280" ry="72" fill="#8FD98A" />
      {/* 谷仓 */}
      <g transform="translate(560 96)">
        <rect x="0" y="30" width="110" height="80" rx="6" fill="#F2706D" />
        <polygon points="-12,32 55,-14 122,32" fill="#C94F4C" />
        <rect x="34" y="58" width="42" height="52" rx="18" fill="#FFF3E0" />
        <rect x="10" y="46" width="16" height="16" rx="4" fill="#FFF3E0" />
        <rect x="84" y="46" width="16" height="16" rx="4" fill="#FFF3E0" />
      </g>
      {/* 围栏 */}
      <g stroke="#C9A063" strokeWidth="6" strokeLinecap="round">
        <path d="M60 168 h230" />
        <path d="M60 182 h230" />
      </g>
      {[70, 110, 150, 190, 230, 270].map((x) => (
        <rect key={x} x={x} y={158} width="8" height="30" rx="3" fill="#C9A063" />
      ))}
      {/* 干草垛 */}
      <ellipse cx="420" cy="182" rx="34" ry="24" fill="#FFD54F" />
      <path d="M392 176 q28 -20 56 0" stroke="#E6B63A" strokeWidth="4" fill="none" />
    </svg>
  );
}

export function LetterCityScene() {
  return (
    <svg className="scene" viewBox="0 0 800 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="citySky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9FD8FF" />
          <stop offset="1" stopColor="#EAF7FF" />
        </linearGradient>
      </defs>
      <rect width="800" height="220" fill="url(#citySky)" />
      <Sun cx={700} cy={54} />
      <Cloud x={180} y={52} />
      <Cloud x={430} y={76} s={0.75} />
      <rect x="0" y="176" width="800" height="44" fill="#B8C4CE" />
      {/* 字母楼 */}
      <g transform="translate(120 40)">
        <rect x="0" y="40" width="90" height="136" rx="8" fill="#FFB74D" />
        <rect x="10" y="58" width="26" height="30" rx="6" fill="#FFF3E0" />
        <rect x="54" y="58" width="26" height="30" rx="6" fill="#FFF3E0" />
        <rect x="10" y="104" width="26" height="30" rx="6" fill="#FFF3E0" />
        <rect x="54" y="104" width="26" height="30" rx="6" fill="#FFF3E0" />
        <text x="45" y="160" textAnchor="middle" fontSize="30" fontWeight="bold" fill="#FFF3E0" fontFamily="Comic Sans MS, sans-serif">A</text>
      </g>
      <g transform="translate(260 20)">
        <rect x="0" y="30" width="100" height="146" rx="8" fill="#4FC3F7" />
        <rect x="12" y="48" width="32" height="36" rx="6" fill="#E1F5FE" />
        <rect x="56" y="48" width="32" height="36" rx="6" fill="#E1F5FE" />
        <rect x="12" y="98" width="32" height="36" rx="6" fill="#E1F5FE" />
        <rect x="56" y="98" width="32" height="36" rx="6" fill="#E1F5FE" />
        <text x="50" y="160" textAnchor="middle" fontSize="30" fontWeight="bold" fill="#E1F5FE" fontFamily="Comic Sans MS, sans-serif">B</text>
      </g>
      <g transform="translate(420 52)">
        <rect x="0" y="30" width="84" height="124" rx="8" fill="#BA68C8" />
        <rect x="10" y="48" width="28" height="32" rx="6" fill="#F3E5F5" />
        <rect x="46" y="48" width="28" height="32" rx="6" fill="#F3E5F5" />
        <rect x="10" y="96" width="28" height="32" rx="6" fill="#F3E5F5" />
        <rect x="46" y="96" width="28" height="32" rx="6" fill="#F3E5F5" />
        <text x="42" y="140" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#F3E5F5" fontFamily="Comic Sans MS, sans-serif">C</text>
      </g>
      {/* 路灯 */}
      <g>
        <rect x="590" y="120" width="8" height="56" rx="3" fill="#90A4AE" />
        <circle cx="594" cy="116" r="14" fill="#FFE082" />
      </g>
    </svg>
  );
}

export function LogicForestScene() {
  return (
    <svg className="scene" viewBox="0 0 800 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="forestSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B2E8C8" />
          <stop offset="1" stopColor="#E4F8EC" />
        </linearGradient>
      </defs>
      <rect width="800" height="220" fill="url(#forestSky)" />
      <Sun cx={690} cy={50} />
      <Cloud x={160} y={48} />
      <ellipse cx="140" cy="196" rx="220" ry="60" fill="#9CD98C" />
      <ellipse cx="620" cy="200" rx="260" ry="66" fill="#8ACC7E" />
      {/* 圆树 */}
      <g transform="translate(90 60)">
        <rect x="26" y="70" width="18" height="66" rx="8" fill="#B8865B" />
        <circle cx="35" cy="52" r="40" fill="#66BB6A" />
        <circle cx="58" cy="70" r="26" fill="#81C784" />
      </g>
      {/* 三角树 */}
      <g transform="translate(240 66)">
        <rect x="34" y="72" width="16" height="58" rx="8" fill="#A97C50" />
        <polygon points="42,0 88,44 4,44" fill="#43A047" />
        <polygon points="42,26 74,58 12,58" fill="#66BB6A" />
      </g>
      {/* 圆树2 */}
      <g transform="translate(420 54)">
        <rect x="26" y="74" width="18" height="62" rx="8" fill="#B8865B" />
        <circle cx="35" cy="54" r="42" fill="#81C784" />
        <circle cx="14" cy="76" r="20" fill="#A5D6A7" />
      </g>
      {/* 蘑菇 */}
      <g transform="translate(330 150)">
        <rect x="10" y="14" width="10" height="18" rx="4" fill="#F5E6D3" />
        <path d="M0 14 h30 q-3 -16 -15 -16 q-12 0 -15 16z" fill="#EF5350" />
        <circle cx="9" cy="6" r="2.6" fill="#fff" />
        <circle cx="21" cy="4" r="2.6" fill="#fff" />
      </g>
      <g transform="translate(560 130)">
        <rect x="10" y="14" width="10" height="18" rx="4" fill="#F5E6D3" />
        <path d="M0 14 h30 q-3 -16 -15 -16 q-12 0 -15 16z" fill="#FF8A65" />
        <circle cx="9" cy="6" r="2.6" fill="#fff" />
        <circle cx="21" cy="4" r="2.6" fill="#fff" />
      </g>
      {/* 小鸟 */}
      <path d="M660 60 q10 -12 20 0 q10 -12 20 0" stroke="#5C6BC0" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function MemorySkyScene() {
  return (
    <svg className="scene" viewBox="0 0 800 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2E3A8C" />
          <stop offset="1" stopColor="#7B6FC4" />
        </linearGradient>
      </defs>
      <rect width="800" height="220" fill="url(#nightSky)" />
      {/* 星星 */}
      {[
        [60, 40], [140, 90], [220, 34], [300, 120], [380, 50], [470, 100],
        [560, 36], [640, 110], [720, 60], [90, 150], [250, 150], [500, 160],
      ].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y - 7} l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z`} fill="#FFE082" />
      ))}
      {/* 月亮 */}
      <g transform="translate(640 60)">
        <circle cx="0" cy="0" r="34" fill="#FFF9C4" />
        <circle cx="14" cy="-8" r="28" fill="#2E3A8C" />
        <circle cx="-12" cy="8" r="4" fill="#F0E68C" opacity="0.7" />
        <circle cx="6" cy="14" r="3" fill="#F0E68C" opacity="0.7" />
      </g>
      {/* 行星 */}
      <g transform="translate(200 130)">
        <circle cx="0" cy="0" r="20" fill="#FF8A80" />
        <ellipse cx="0" cy="0" rx="34" ry="9" fill="none" stroke="#FFCCBC" strokeWidth="4" transform="rotate(-18)" />
      </g>
      {/* 流星 */}
      <path d="M620 20 l-46 34" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
      <path d="M610 24 l-30 22" stroke="#E1BEE7" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      {/* 火箭 */}
      <g transform="translate(90 40)">
        <path d="M0 40 L12 4 L24 40 Q12 48 0 40z" fill="#FF8A80" />
        <rect x="6" y="34" width="12" height="14" rx="5" fill="#4FC3F7" />
        <circle cx="12" cy="30" r="6" fill="#FFF9C4" />
        <path d="M0 52 l6 12 M24 52 l-6 12" stroke="#FFE082" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function NatureGardenScene() {
  return (
    <svg className="scene" viewBox="0 0 800 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="gardenSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A5E3FF" />
          <stop offset="1" stopColor="#EAF9FF" />
        </linearGradient>
      </defs>
      <rect width="800" height="220" fill="url(#gardenSky)" />
      <Sun cx={110} cy={52} />
      <Cloud x={560} y={52} />
      {/* 彩虹 */}
      <g transform="translate(420 60)">
        <path d="M-90 90 A 90 90 0 0 1 90 90" stroke="#EF5350" strokeWidth="10" fill="none" />
        <path d="M-76 90 A 76 76 0 0 1 76 90" stroke="#FFA726" strokeWidth="10" fill="none" />
        <path d="M-62 90 A 62 62 0 0 1 62 90" stroke="#FFEE58" strokeWidth="10" fill="none" />
        <path d="M-48 90 A 48 48 0 0 1 48 90" stroke="#66BB6A" strokeWidth="10" fill="none" />
        <path d="M-34 90 A 34 34 0 0 1 34 90" stroke="#42A5F5" strokeWidth="10" fill="none" />
      </g>
      <ellipse cx="200" cy="196" rx="260" ry="60" fill="#A5D6A7" />
      {/* 苹果树 */}
      <g transform="translate(120 60)">
        <rect x="34" y="66" width="18" height="70" rx="8" fill="#A97C50" />
        <circle cx="43" cy="48" r="42" fill="#66BB6A" />
        <circle cx="18" cy="64" r="22" fill="#81C784" />
        <circle cx="66" cy="62" r="20" fill="#81C784" />
        <circle cx="34" cy="38" r="7" fill="#EF5350" />
        <circle cx="58" cy="52" r="7" fill="#EF5350" />
        <circle cx="24" cy="60" r="6" fill="#FF7043" />
      </g>
      {/* 花 */}
      {[
        [320, 168], [360, 176], [640, 172], [700, 180],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <line x1="0" y1="0" x2="0" y2="16" stroke="#66BB6A" strokeWidth="4" />
          <circle cx="0" cy="-4" r="8" fill={i % 2 ? '#F48FB1' : '#CE93D8'} />
          <circle cx="0" cy="-4" r="3.4" fill="#FFF59D" />
        </g>
      ))}
      {/* 蝴蝶 */}
      <g transform="translate(560 120)">
        <path d="M0 0 Q -16 -10 -12 -24 Q -4 -14 0 0z" fill="#FF8A80" />
        <path d="M0 0 Q 16 -10 12 -24 Q 4 -14 0 0z" fill="#FFAB91" />
        <path d="M0 0 Q -12 8 -8 18 Q -2 10 0 0z" fill="#FF8A80" />
        <path d="M0 0 Q 12 8 8 18 Q 2 10 0 0z" fill="#FFAB91" />
        <rect x="-1.4" y="-4" width="2.8" height="10" rx="1.4" fill="#5D4037" />
      </g>
    </svg>
  );
}

export function SafetyTownScene() {
  return (
    <svg className="scene" viewBox="0 0 800 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="townSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#BFE4FF" />
          <stop offset="1" stopColor="#EFFAFF" />
        </linearGradient>
      </defs>
      <rect width="800" height="220" fill="url(#townSky)" />
      <Sun cx={700} cy={52} />
      <Cloud x={140} y={50} />
      {/* 建筑 */}
      <rect x="40" y="70" width="90" height="86" rx="8" fill="#FFCC80" />
      <rect x="52" y="84" width="22" height="24" rx="5" fill="#FFF3E0" />
      <rect x="90" y="84" width="22" height="24" rx="5" fill="#FFF3E0" />
      <rect x="52" y="118" width="22" height="24" rx="5" fill="#FFF3E0" />
      <rect x="640" y="60" width="100" height="96" rx="8" fill="#90CAF9" />
      <rect x="654" y="76" width="26" height="26" rx="5" fill="#E3F2FD" />
      <rect x="696" y="76" width="26" height="26" rx="5" fill="#E3F2FD" />
      <rect x="654" y="112" width="26" height="26" rx="5" fill="#E3F2FD" />
      {/* 道路 */}
      <rect x="0" y="156" width="800" height="64" fill="#78909C" />
      <g stroke="#fff" strokeWidth="8" strokeDasharray="26 22">
        <line x1="0" y1="188" x2="800" y2="188" />
      </g>
      {/* 斑马线 */}
      <g fill="#fff">
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={330 + i * 24} y="160" width="14" height="40" rx="3" />
        ))}
      </g>
      {/* 红绿灯 */}
      <g transform="translate(470 96)">
        <rect x="-22" y="-34" width="44" height="92" rx="12" fill="#455A64" />
        <circle cx="0" cy="-18" r="11" fill="#EF5350" />
        <circle cx="0" cy="6" r="11" fill="#FFEE58" />
        <circle cx="0" cy="30" r="11" fill="#66BB6A" />
        <rect x="-7" y="60" width="14" height="18" rx="4" fill="#455A64" />
      </g>
      {/* 小车 */}
      <g transform="translate(200 168)">
        <rect x="0" y="6" width="70" height="20" rx="8" fill="#42A5F5" />
        <path d="M14 6 L24 -8 L46 -8 L58 6z" fill="#64B5F6" />
        <circle cx="16" cy="28" r="8" fill="#37474F" />
        <circle cx="54" cy="28" r="8" fill="#37474F" />
        <circle cx="16" cy="27" r="3" fill="#90A4AE" />
        <circle cx="54" cy="27" r="3" fill="#90A4AE" />
      </g>
    </svg>
  );
}

export const SCENES: Record<SubjectId, ComponentType> = {
  math: FarmScene,
  chinese: LetterCityScene,
  english: MemorySkyScene,
  thinking: LogicForestScene,
  science: NatureGardenScene,
  life: SafetyTownScene,
};

/** 场景横幅（用于大厅/地图的学科头） */
export function SceneBanner({ kind, height = 96 }: { kind: SubjectId; height?: number }) {
  const Scene = SCENES[kind];
  return (
    <div className="scene-banner" style={{ height }}>
      <Scene />
    </div>
  );
}
