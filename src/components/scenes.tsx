import type { ComponentType, ReactNode } from 'react';
import type { SubjectId } from '../types';

/* ============ 六大学科场景横幅 · 星夜科幻风（深空 + 星点 + 霓虹学科图形） ============ */

const STARS: Array<[number, number, number, number]> = [
  [60, 40, 1.6, 0.9], [140, 92, 1.2, 0.7], [240, 30, 1.8, 0.95], [330, 82, 1.2, 0.6],
  [430, 36, 1.6, 0.9], [520, 94, 1.1, 0.6], [610, 30, 1.9, 0.95], [700, 86, 1.3, 0.7],
  [760, 52, 1.1, 0.6], [90, 142, 1.2, 0.5], [480, 142, 1.4, 0.6], [640, 132, 1.2, 0.5],
];

const SPARKS: Array<[number, number, number]> = [[170, 52, 1], [400, 28, 1], [660, 58, 1], [300, 118, 1]];

function Spark({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <path
      d={`M${x} ${y} l${3 * s} ${7 * s} ${7 * s} ${3 * s} ${-7 * s} ${3 * s} ${-3 * s} ${7 * s} ${-3 * s} ${-7 * s} ${-7 * s} ${-3 * s} ${7 * s} ${-3 * s} z`}
      fill="#fff" opacity="0.85"
    />
  );
}

function Nebula({ color, cx, cy, r }: { color: string; cx: number; cy: number; r: number }) {
  return <circle cx={cx} cy={cy} r={r} fill={color} opacity="0.16" />;
}

/** 深空背景壳：深蓝紫渐变 + 星点/闪光 + 发光地平线 + 星云光斑 */
function SceneShell({ gid, tint, children }: { gid: string; tint: string; children?: ReactNode }) {
  return (
    <svg className="scene" viewBox="0 0 800 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#251c60" />
          <stop offset="0.5" stopColor="#341f74" />
          <stop offset="1" stopColor="#191238" />
        </linearGradient>
        <radialGradient id={`${gid}-h`} cx="0.5" cy="1" r="0.9">
          <stop offset="0" stopColor={tint} stopOpacity="0.55" />
          <stop offset="1" stopColor={tint} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="220" fill={`url(#${gid})`} />
      <Nebula color="#7fe0d6" cx={150} cy={52} r={84} />
      <Nebula color="#b39bff" cx={650} cy={62} r={92} />
      <Nebula color={tint} cx={420} cy={150} r={120} />
      <g fill="#fff">
        {STARS.map(([x, y, r, o], i) => (
          <circle key={i} cx={x} cy={y} r={r} opacity={o} />
        ))}
        {SPARKS.map(([x, y, s], i) => (
          <Spark key={i} x={x} y={y} s={s} />
        ))}
      </g>
      {/* 底部发光地平线 + 星云弧 */}
      <rect y="150" width="800" height="70" fill={`url(#${gid}-h)`} />
      <ellipse cx="400" cy="214" rx="540" ry="60" fill="#241a55" opacity="0.7" />
      {/* 主图形整体下移，避开 slice 顶部裁切，保持完整 */}
      <g transform="translate(0 24)">{children}</g>
    </svg>
  );
}

/** 数学：数字 + 几何形状 + 计数珠（霓虹） */
export function MathScene() {
  return (
    <SceneShell gid="mathSky" tint="#F6C26B">
      <g transform="translate(66 56)">
        <circle cx="0" cy="0" r="26" fill="#F2A6C4" />
        <rect x="46" y="-26" width="52" height="52" rx="6" fill="#7FE0D6" />
        <polygon points="142,26 172,-26 202,26" fill="#F6C26B" />
      </g>
      <g fontWeight="800" fontFamily="var(--font-latin), sans-serif">
        <text x="300" y="124" fontSize="72" fill="#fff">1</text>
        <text x="392" y="124" fontSize="72" fill="#F6C26B" opacity="0.62">2</text>
        <text x="484" y="124" fontSize="72" fill="#B39BFF" opacity="0.34">3</text>
      </g>
      <g transform="translate(596 112)">
        <rect x="-10" y="26" width="150" height="8" rx="4" fill="#c9a24e" opacity="0.9" />
        <circle cx="18" cy="21" r="13" fill="#F2A6C4" />
        <circle cx="58" cy="21" r="13" fill="#7FE0D6" />
        <circle cx="98" cy="21" r="13" fill="#F6C26B" />
      </g>
    </SceneShell>
  );
}

/** 语文：汉字 + 书卷 + 毛笔（霓虹） */
export function ChineseScene() {
  return (
    <SceneShell gid="zhSky" tint="#F2A6C4">
      <g fontWeight="800" fontFamily="'STKaiti','KaiTi',serif">
        <text x="220" y="126" fontSize="96" fill="#fff">文</text>
        <text x="356" y="126" fontSize="96" fill="#F2A6C4" opacity="0.62">诗</text>
      </g>
      <g transform="translate(560 106)">
        <rect x="0" y="0" width="94" height="52" rx="6" fill="#B39BFF" opacity="0.85" />
        <line x1="12" y1="0" x2="12" y2="52" stroke="#fff" strokeWidth="3" opacity="0.7" />
        <line x1="82" y1="0" x2="82" y2="52" stroke="#fff" strokeWidth="3" opacity="0.7" />
        <rect x="0" y="-3" width="94" height="6" rx="3" fill="#7FE0D6" />
      </g>
      <g transform="translate(690 56) rotate(24)">
        <rect x="0" y="0" width="8" height="70" rx="4" fill="#7FE0D6" opacity="0.9" />
        <polygon points="-2,70 10,70 4,92" fill="#fff" opacity="0.85" />
      </g>
    </SceneShell>
  );
}

/** 英语：字母块 + 单词（霓虹） */
export function EnglishScene() {
  return (
    <SceneShell gid="enSky" tint="#7FE0D6">
      <g fontFamily="'Helvetica Neue', Arial, sans-serif" fontWeight="800">
        <g transform="translate(140 74)">
          <rect x="-34" y="-30" width="68" height="60" rx="8" fill="#7FE0D6" />
          <text x="0" y="16" textAnchor="middle" fontSize="44" fill="#1c173f">A</text>
        </g>
        <g transform="translate(290 74)">
          <rect x="-34" y="-30" width="68" height="60" rx="8" fill="#B39BFF" />
          <text x="0" y="16" textAnchor="middle" fontSize="44" fill="#1c173f">B</text>
        </g>
        <g transform="translate(440 74)">
          <rect x="-34" y="-30" width="68" height="60" rx="8" fill="#F6C26B" />
          <text x="0" y="16" textAnchor="middle" fontSize="44" fill="#1c173f">C</text>
        </g>
      </g>
      <g fontWeight="700" fontFamily="'Helvetica Neue', Arial, sans-serif">
        <text x="582" y="128" fontSize="34" fill="#fff">cat</text>
        <text x="672" y="128" fontSize="34" fill="#7FE0D6" opacity="0.6">dog</text>
      </g>
    </SceneShell>
  );
}

/** 思维：拼图 + 齿轮 + 灯泡（霓虹） */
export function LogicScene() {
  return (
    <SceneShell gid="loSky" tint="#B39BFF">
      <g transform="translate(88 56)">
        <rect x="0" y="0" width="46" height="46" rx="6" fill="#B39BFF" />
        <rect x="56" y="0" width="46" height="46" rx="6" fill="#7FE0D6" />
        <rect x="0" y="54" width="46" height="46" rx="6" fill="#F2A6C4" />
      </g>
      <g transform="translate(330 90)">
        <circle cx="0" cy="0" r="34" fill="#B39BFF" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <rect key={a} x="-8" y="-46" width="16" height="20" rx="5" fill="#B39BFF" transform={`rotate(${a})`} />
        ))}
        <circle cx="0" cy="0" r="14" fill="#1c173f" />
      </g>
      <g transform="translate(560 72)">
        <path d="M0 30 C -34 2 -22 -34 0 -34 C 22 -34 34 2 0 30z" fill="#F6C26B" />
        <rect x="-10" y="34" width="20" height="10" rx="3" fill="#c9a24e" />
        <path d="M0 -20 v-10 M-16 -12 l-8 -6 M16 -12 l8 -6" stroke="#F6C26B" strokeWidth="5" strokeLinecap="round" />
      </g>
    </SceneShell>
  );
}

/** 科学：烧瓶 + 植物 + 原子（霓虹） */
export function ScienceScene() {
  return (
    <SceneShell gid="scSky" tint="#7FE0D6">
      <g transform="translate(110 72)">
        <path d="M30 0 h30 v40 l26 52 a20 20 0 0 1 -16 26 h-40 a20 20 0 0 1 -16 -26 l26 -52 z" fill="#7FE0D6" opacity="0.92" />
        <path d="M56 46 l20 40 h-64 l20 -40z" fill="#B39BFF" opacity="0.8" />
        <circle cx="44" cy="96" r="5" fill="#1c173f" />
      </g>
      <g transform="translate(360 104)">
        <path d="M0 0 Q -26 -20 -10 -44 Q 12 -26 0 0z" fill="#8fdc8f" />
        <path d="M0 0 Q -30 12 -22 36 Q 4 24 0 0z" fill="#7fae6c" />
        <rect x="-3" y="0" width="6" height="24" rx="3" fill="#c9a24e" />
      </g>
      <g transform="translate(620 82)">
        <circle cx="0" cy="0" r="16" fill="#F2A6C4" />
        <ellipse cx="0" cy="0" rx="44" ry="18" fill="none" stroke="#B39BFF" strokeWidth="4" transform="rotate(20)" />
        <circle cx="42" cy="-6" r="6" fill="#F6C26B" />
      </g>
    </SceneShell>
  );
}

/** 生活：小镇 + 道路 + 红绿灯（霓虹） */
export function LifeScene() {
  return (
    <SceneShell gid="liSky" tint="#F6C26B">
      <rect x="60" y="70" width="86" height="80" rx="8" fill="#F6C26B" opacity="0.92" />
      <rect x="72" y="84" width="20" height="22" rx="5" fill="#1c173f" />
      <rect x="112" y="84" width="20" height="22" rx="5" fill="#1c173f" />
      <rect x="640" y="62" width="96" height="88" rx="8" fill="#7FE0D6" opacity="0.92" />
      <rect x="654" y="76" width="24" height="24" rx="5" fill="#1c173f" />
      <rect x="696" y="76" width="24" height="24" rx="5" fill="#1c173f" />
      {/* 道路 */}
      <rect x="0" y="150" width="800" height="70" fill="#2c2258" />
      <g stroke="#7fe0d6" strokeWidth="8" strokeDasharray="26 22" opacity="0.5">
        <line x1="0" y1="184" x2="800" y2="184" />
      </g>
      {/* 红绿灯 */}
      <g transform="translate(470 96)">
        <rect x="-22" y="-34" width="44" height="90" rx="12" fill="#1c173f" stroke="#B39BFF" strokeWidth="2" />
        <circle cx="0" cy="-16" r="10" fill="#F2A6C4" />
        <circle cx="0" cy="8" r="10" fill="#F6C26B" />
        <circle cx="0" cy="32" r="10" fill="#8fdc8f" />
      </g>
      {/* 小车 */}
      <g transform="translate(250 166)">
        <rect x="0" y="6" width="66" height="18" rx="8" fill="#B39BFF" />
        <path d="M14 6 L24 -8 L44 -8 L56 6z" fill="#9a86c8" />
        <circle cx="16" cy="26" r="8" fill="#131032" />
        <circle cx="52" cy="26" r="8" fill="#131032" />
      </g>
    </SceneShell>
  );
}

export const SCENES: Record<SubjectId, ComponentType> = {
  math: MathScene,
  chinese: ChineseScene,
  english: EnglishScene,
  thinking: LogicScene,
  science: ScienceScene,
  life: LifeScene,
};

/** 场景横幅（用于学科/课程的头部横幅） */
export function SceneBanner({ kind, height = 96 }: { kind: SubjectId; height?: number }) {
  const Scene = SCENES[kind];
  return (
    <div className="scene-banner" style={{ height }}>
      <Scene />
    </div>
  );
}
