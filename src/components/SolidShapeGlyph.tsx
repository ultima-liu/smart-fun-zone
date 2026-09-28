import { useId } from 'react';

/** 教材里的四种立体图形，用斜投影画出可见的三个面，供先猜观察图、任务一连线和器材检测台共用。 */
export type SolidShapeKind = 'cuboid' | 'cube' | 'cylinder' | 'ball';

export const solidKindByName = (name: string): SolidShapeKind =>
  name === '长方体' ? 'cuboid' : name === '正方体' ? 'cube' : name === '圆柱' ? 'cylinder' : 'ball';

export function SolidShapeGlyph({ kind, size = 48, className, ariaLabel }: { kind: SolidShapeKind; size?: number; className?: string; ariaLabel?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const common = {
    viewBox: '0 0 100 100',
    width: size,
    height: size,
    className,
    role: ariaLabel ? 'img' : undefined,
    ariaLabel,
    'aria-hidden': ariaLabel ? undefined : true,
  };
  const face = {
    strokeWidth: 2.5,
    strokeLinejoin: 'round' as const,
  };
  if (kind === 'ball') {
    return <svg {...common}>
      <defs>
        <radialGradient id={`mt-ball-${uid}`} cx="34%" cy="27%" r="78%">
          <stop offset="0%" stopColor="#fff3ee" />
          <stop offset="24%" stopColor="#f7a68e" />
          <stop offset="62%" stopColor="#dd5f45" />
          <stop offset="100%" stopColor="#93321f" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="51" r="33" fill={`url(#mt-ball-${uid})`} stroke="#8e2f22" {...face} />
    </svg>;
  }
  if (kind === 'cylinder') {
    return <svg {...common}>
      <defs>
        <linearGradient id={`mt-cyl-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3f9570" />
          <stop offset="45%" stopColor="#93ddba" />
          <stop offset="100%" stopColor="#3f9570" />
        </linearGradient>
      </defs>
      <path d="M20 32 V80 A30 10 0 0 0 80 80 V32 Z" fill={`url(#mt-cyl-${uid})`} stroke="#2e7a55" {...face} />
      <ellipse cx="50" cy="32" rx="30" ry="10" fill="#c2f0d9" stroke="#2e7a55" {...face} />
    </svg>;
  }
  if (kind === 'cuboid') {
    return <svg {...common}>
      <polygon points="8,56 28,42 92,42 72,56" fill="#b3dcf0" stroke="#2e6386" {...face} />
      <polygon points="72,56 92,42 92,74 72,88" fill="#4a86ad" stroke="#2e6386" {...face} />
      <polygon points="8,56 72,56 72,88 8,88" fill="#6fb1d8" stroke="#2e6386" {...face} />
    </svg>;
  }
  return <svg {...common}>
    <polygon points="22,46 42,30 84,30 64,46" fill="#f9dd9e" stroke="#96691c" {...face} />
    <polygon points="64,46 84,30 84,72 64,88" fill="#cf9032" stroke="#96691c" {...face} />
    <polygon points="22,46 64,46 64,88 22,88" fill="#f2b94f" stroke="#96691c" {...face} />
  </svg>;
}
