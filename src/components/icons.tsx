import type { SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement> & { size?: number; gradient?: string };

/* ---- 渐变配色（青→赭，随主题展开）。id 全局唯一，由 <IconGradientDefs/> 挂载一次 ---- */
const GRADS: Record<string, [string, string]> = {
  brand: ['#8b7bf0', '#f28b76'],
  teal: ['#a78bfa', '#6c5ce7'],
  coral: ['#e08a72', '#c75a3c'],
  gold: ['#e6b45c', '#c08a2f'],
  violet: ['#a186c4', '#7f6c94'],
};

export function IconGradientDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        {Object.entries(GRADS).map(([k, [a, b]]) => (
          <linearGradient key={k} id={`sfz-grad-${k}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={a} />
            <stop offset="1" stopColor={b} />
          </linearGradient>
        ))}
      </defs>
    </svg>
  );
}

/** 把 gradient 名称（如 'brand'）转成 url(#sfz-grad-xxx) 油漆；无则退回 currentColor */
function paint(gradient: string | undefined): string {
  if (gradient && GRADS[gradient]) return `url(#sfz-grad-${gradient})`;
  return 'currentColor';
}

/** 供 fill 类图标复用：把 gradient 转成渐变填充油漆 */
export function gradPaint(gradient?: string): string {
  return paint(gradient);
}

function base({ size = 26, gradient, ...props }: IconProps): SVGProps<SVGSVGElement> {
  const p = paint(gradient);
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: p,
    strokeWidth: 2.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
  };
}

export const IconBack = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const IconSpeakerOn = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 9v6h4l5 4V5L8 9H4z" fill={gradPaint(p.gradient)} stroke="none" />
    <path d="M16.5 8.5a5 5 0 010 7" />
    <path d="M19 6a9 9 0 010 12" />
  </svg>
);

export const IconSpeakerOff = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 9v6h4l5 4V5L8 9H4z" fill={gradPaint(p.gradient)} stroke="none" />
    <path d="M16 9l6 6M22 9l-6 6" />
  </svg>
);

export const IconLock = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="5" y="10" width="14" height="10" rx="3" fill={gradPaint(p.gradient)} stroke="none" />
    <path d="M8 10V7a4 4 0 018 0v3" />
    <circle cx="12" cy="15" r="1.6" fill="#fff" stroke="none" />
  </svg>
);

export const IconStar = (p: IconProps) => (
  <svg {...base({ ...p, stroke: 'none' })} fill={gradPaint(p.gradient)}>
    <path d="M12 2.6l2.8 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.5 6.3 20.4l1.1-6.4L2.7 9.4l6.5-.9z" />
  </svg>
);

export const IconTrophy = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 4h10v6a5 5 0 01-10 0V4z" />
    <path d="M7 5H4v2a3 3 0 003 3M17 5h3v2a3 3 0 01-3 3" />
    <path d="M12 15v3M8 20h8M9.5 18h5v2h-5z" />
  </svg>
);

export const IconClock = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const IconPlay = (p: IconProps) => (
  <svg {...base({ ...p, fill: gradPaint(p.gradient), stroke: 'none' })}>
    <path d="M8 5.5v13l11-6.5z" />
  </svg>
);

export const IconSettings = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1" />
  </svg>
);

export const IconChart = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 20h16" />
    <rect x="6" y="11" width="3.4" height="7" rx="1" fill={gradPaint(p.gradient)} stroke="none" />
    <rect x="10.8" y="6" width="3.4" height="12" rx="1" fill={gradPaint(p.gradient)} stroke="none" />
    <rect x="15.6" y="9" width="3.4" height="9" rx="1" fill={gradPaint(p.gradient)} stroke="none" />
  </svg>
);

export const IconTrash = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4.5 6.5h15M9.5 6V4.5h5V6M6.5 6.5l1 13h9l1-13" />
    <path d="M10 10v6M14 10v6" />
  </svg>
);

export const IconCheck = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4.5 12.5l5 5 10-11" />
  </svg>
);

export const IconClose = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const IconPlus = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconPencil = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 013 3L8 19l-4 1z" />
  </svg>
);

export const IconHome = (p: IconProps) => (
  <svg {...base({ ...p, stroke: 'none' })}>
    {/* 星环（后侧，倾斜） */}
    <ellipse cx="12" cy="12" rx="9.4" ry="3.7" fill="none" stroke={gradPaint(p.gradient)} strokeWidth="1.7" transform="rotate(-16 12 12)" opacity="0.7" />
    {/* 渐变星球 */}
    <circle cx="12" cy="12" r="6.8" fill={gradPaint(p.gradient)} />
    {/* 球面浅色大陆 */}
    <path d="M8.3 13.6 q1.3 -1.8 3.1 -1.3 q1.7 0.4 1.5 1.7 q-0.2 1.4 -2.1 1.3 q-1.8 -0.1 -2.5 -1.7 Z" fill="rgba(255,255,255,0.24)" />
    {/* 球体立体高光（左上） */}
    <path d="M7.9 9.3 C 9.4 6.5 13.5 5.7 16 7.4" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" strokeLinecap="round" />
    {/* 暗边（右下） */}
    <path d="M15 17.2 C 12.6 18.1 9.7 17.9 8.3 16.5" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="1.1" strokeLinecap="round" />
    {/* 星环（前侧） */}
    <path d="M4.6 13.9 q7 3.4 14.8 -0.4" fill="none" stroke={gradPaint(p.gradient)} strokeWidth="1.7" strokeLinecap="round" opacity="0.85" />
    {/* 小星光 */}
    <path d="M18.6 4.9 l0.5 1.2 1.2 0.5 -1.2 0.5 -0.5 1.2 -0.5 -1.2 -1.2 -0.5 1.2 -0.5 Z" fill="rgba(255,255,255,0.9)" />
  </svg>
);

export const IconMusic = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 18.5V6l10-2v12.5" />
    <circle cx="6.5" cy="18.5" r="2.5" />
    <circle cx="16.5" cy="16.5" r="2.5" />
  </svg>
);

export const IconMic = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" />
  </svg>
);

export const IconSun = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7" />
  </svg>
);

export const IconHeart = (p: IconProps) => (
  <svg {...base({ ...p, fill: gradPaint(p.gradient), stroke: 'none' })}>
    <path d="M12 20.5S3.5 15.4 3.5 9.6A4.6 4.6 0 0112 6.7a4.6 4.6 0 018.5 2.9c0 5.8-8.5 10.9-8.5 10.9z" />
  </svg>
);

export const IconUser = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20c1.2-3.6 4-5 7.5-5s6.3 1.4 7.5 5" />
  </svg>
);

export const IconGamepad = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="2.8" y="6.6" width="18.4" height="10.8" rx="5.4" />
    <path d="M7 10.2v3M5.5 11.7h3" />
    <circle cx="15.6" cy="10.8" r="1.1" fill={gradPaint(p.gradient)} stroke="none" />
    <circle cx="17.8" cy="13.2" r="1.1" fill={gradPaint(p.gradient)} stroke="none" />
  </svg>
);

/** 卷卷豆：积分货币（斜置豆身 + 卷卷纹理） */
export const IconBean = (p: IconProps) => (
  <svg {...base(p)}>
    <ellipse
      cx="12"
      cy="12"
      rx="7.4"
      ry="5.6"
      transform="rotate(-32 12 12)"
      fill={gradPaint(p.gradient)}
      stroke="none"
    />
    <path
      d="M10.4 11.2 C 12 10 13.8 10.4 14.6 12.6"
      stroke="rgba(255,255,255,0.8)"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);

/** 学校（教学楼 + 钟楼） */
export const IconSchool = (p: IconProps) => (
  <svg {...base({ ...p, stroke: 'none' })}>
    {/* 主楼圆润三角屋顶 */}
    <path d="M3.1 9.6 L10.9 4.4 A1.3 1.3 0 0 1 13.1 4.4 L20.9 9.6 Z" fill={gradPaint(p.gradient)} fillOpacity="0.95" />
    {/* 钟楼窗 */}
    <rect x="9.7" y="4.9" width="4.6" height="3.4" rx="1" fill="rgba(20,16,40,0.4)" />
    {/* 圆角主楼体 */}
    <path d="M3.6 9.7 V18.2 A1.5 1.5 0 0 0 5.1 19.7 H18.9 A1.5 1.5 0 0 0 20.4 18.2 V9.7 Z" fill={gradPaint(p.gradient)} fillOpacity="0.72" />
    {/* 大门 */}
    <rect x="10.4" y="13.2" width="3.2" height="6.5" rx="1.6" fill="rgba(20,16,40,0.45)" />
    {/* 双窗 */}
    <circle cx="7.1" cy="13.4" r="1.3" fill="rgba(255,255,255,0.9)" />
    <circle cx="16.9" cy="13.4" r="1.3" fill="rgba(255,255,255,0.9)" />
  </svg>
);

/** 空中乐园（摩天轮） */
export const IconFerris = (p: IconProps) => (
  <svg {...base({ ...p, stroke: 'none' })}>
    {/* 支架 A 形 */}
    <path d="M8.8 19.9 L12 16.9 15.2 19.9" fill="none" stroke="rgba(255,255,255,0.78)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    {/* 轮轴支柱 */}
    <path d="M12 16.9 V11.4" stroke="rgba(255,255,255,0.85)" strokeWidth="1.3" strokeLinecap="round" />
    {/* 外环（渐变描边圆环，空心） */}
    <circle cx="12" cy="10.6" r="6" fill="none" stroke={gradPaint(p.gradient)} strokeWidth="2.5" />
    {/* 环内细白内衬 */}
    <circle cx="12" cy="10.6" r="6" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
    {/* 8 向白色轮辐（中心到环） */}
    <g stroke="rgba(255,255,255,0.7)" strokeWidth="1.1" strokeLinecap="round">
      <path d="M12 10.6 L12 4.6 M12 10.6 L18 10.6 M12 10.6 L6 10.6 M12 10.6 L16.2 6.4 M12 10.6 L7.8 6.4 M12 10.6 L16.2 14.8 M12 10.6 L7.8 14.8 M12 10.6 L12 16.6" />
    </g>
    {/* 中心轴 */}
    <circle cx="12" cy="10.6" r="1.2" fill="rgba(255,255,255,0.95)" />
    {/* 沿环保留座舱（白点） */}
    <g fill="rgba(255,255,255,0.95)">
      <circle cx="12" cy="4.6" r="1.05" />
      <circle cx="18" cy="10.6" r="1.05" />
      <circle cx="6" cy="10.6" r="1.05" />
      <circle cx="16.2" cy="6.4" r="1.05" />
      <circle cx="7.8" cy="6.4" r="1.05" />
      <circle cx="16.2" cy="14.8" r="1.05" />
      <circle cx="7.8" cy="14.8" r="1.05" />
      <circle cx="12" cy="16.6" r="1.05" />
    </g>
  </svg>
);

/** 总部（塔楼建筑） */
export const IconTower = (p: IconProps) => (
  <svg {...base({ ...p, stroke: 'none' })}>
    {/* 底部起落腿 */}
    <path d="M9.6 19.7 L10.8 17.3 M14.4 19.7 L13.2 17.3" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" strokeLinecap="round" />
    {/* 飞碟星舰主体盘（渐变椭圆） */}
    <ellipse cx="12" cy="13.1" rx="9" ry="3.4" fill={gradPaint(p.gradient)} />
    {/* 盘上缘高光 */}
    <path d="M4 12.5 q8 -2.4 16 0" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1" strokeLinecap="round" />
    {/* 玻璃穹顶（抛物面） */}
    <path d="M6.9 12.2 Q12 4.7 17.1 12.2 Z" fill={gradPaint(p.gradient)} fillOpacity="0.72" stroke="rgba(255,255,255,0.6)" strokeWidth="1.1" strokeLinejoin="round" />
    {/* 穹顶内高光 */}
    <ellipse cx="10.7" cy="9.2" rx="1.6" ry="0.95" fill="rgba(255,255,255,0.5)" transform="rotate(-22 10.7 9.2)" />
    {/* 盘缘舷窗灯 */}
    <g fill="rgba(255,255,255,0.9)">
      <circle cx="5.6" cy="13.7" r="0.78" />
      <circle cx="8.4" cy="14.6" r="0.78" />
      <circle cx="12" cy="14.9" r="0.78" />
      <circle cx="15.6" cy="14.6" r="0.78" />
      <circle cx="18.4" cy="13.7" r="0.78" />
    </g>
    {/* 顶部天线 */}
    <rect x="11.5" y="4.7" width="1" height="2" rx="0.5" fill="rgba(255,255,255,0.9)" />
    <circle cx="12" cy="4.2" r="0.8" fill="rgba(255,255,255,0.95)" />
  </svg>
);

/* ---------- 学段图标：书包 / 打开的书 / 学士帽（精致 SVG，与导航图标同风格） ---------- */
export const IconStagePrimary = (p: IconProps) => (
  <svg {...base({ ...p, stroke: 'none' })}>
    <path d="M8.6 6.6 a3.4 3.4 0 0 1 6.8 0" fill="none" stroke={gradPaint(p.gradient)} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M6.2 7.2 H17.8 A1.7 1.7 0 0 1 19.5 8.9 V17.8 A1.7 1.7 0 0 1 17.8 19.5 H6.2 A1.7 1.7 0 0 1 4.5 17.8 V8.9 A1.7 1.7 0 0 1 6.2 7.2 Z" fill={gradPaint(p.gradient)} />
    <path d="M7 11.4 H17 V15.4 A1.2 1.2 0 0 1 15.8 16.6 H8.2 A1.2 1.2 0 0 1 7 15.4 Z" fill="rgba(255,255,255,0.3)" />
    <rect x="10.7" y="9.2" width="2.6" height="1.4" rx="0.7" fill="rgba(255,255,255,0.92)" />
    <path d="M6.2 7.2 H17.8 A1.7 1.7 0 0 1 19.5 8.9" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

export const IconStageJunior = (p: IconProps) => (
  <svg {...base({ ...p, stroke: 'none' })}>
    {/* 书身（圆角矩形，饱满） */}
    <path d="M5 6.6 H19 A1.5 1.5 0 0 1 20.5 8.1 V17.9 A1.5 1.5 0 0 1 19 19.4 H5 A1.5 1.5 0 0 1 3.5 17.9 V8.1 A1.5 1.5 0 0 1 5 6.6 Z" fill={gradPaint(p.gradient)} />
    {/* 书脊（左侧） */}
    <path d="M7.4 6.6 V19.4" stroke="rgba(20,16,40,0.35)" strokeWidth="2.4" />
    {/* 封面书签 */}
    <rect x="14.8" y="4.6" width="2.8" height="6" rx="0.9" fill="rgba(255,255,255,0.92)" />
    {/* 内页线 */}
    <g stroke="rgba(255,255,255,0.62)" strokeWidth="1.1" strokeLinecap="round">
      <path d="M9.6 9.8 H16.6 M9.6 12.1 H16.6 M9.6 14.4 H16.6" />
    </g>
    {/* 高光边 */}
    <path d="M5 8.1 V17.9" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

export const IconStageSenior = (p: IconProps) => (
  <svg {...base({ ...p, stroke: 'none' })}>
    {/* 帽身（下弧） */}
    <path d="M8.1 12.4 H15.9 C15.9 15 14.1 16.3 12 16.3 C9.9 16.3 8.1 15 8.1 12.4 Z" fill={gradPaint(p.gradient)} fillOpacity="0.78" />
    {/* 帽板（菱形） */}
    <path d="M3 8.8 L12 4.4 21 8.8 12 13.2 Z" fill={gradPaint(p.gradient)} />
    {/* 帽板描边 */}
    <path d="M3 8.8 L12 4.4 21 8.8 12 13.2 Z" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.1" strokeLinejoin="round" />
    {/* 流苏（垂线 + 球） */}
    <path d="M12 8.4 V15.3" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="15.7" r="1.1" fill="rgba(255,255,255,0.97)" />
  </svg>
);
