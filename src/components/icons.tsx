import type { SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 26, ...props }: IconProps): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
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
    <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
    <path d="M16.5 8.5a5 5 0 010 7" />
    <path d="M19 6a9 9 0 010 12" />
  </svg>
);

export const IconSpeakerOff = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
    <path d="M16 9l6 6M22 9l-6 6" />
  </svg>
);

export const IconLock = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="5" y="10" width="14" height="10" rx="3" fill="currentColor" stroke="none" />
    <path d="M8 10V7a4 4 0 018 0v3" />
    <circle cx="12" cy="15" r="1.6" fill="#fff" stroke="none" />
  </svg>
);

export const IconStar = (p: IconProps) => (
  <svg {...base({ ...p, stroke: 'none' })} fill="currentColor">
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
  <svg {...base({ ...p, fill: 'currentColor', stroke: 'none' })}>
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
    <rect x="6" y="11" width="3.4" height="7" rx="1" fill="currentColor" stroke="none" />
    <rect x="10.8" y="6" width="3.4" height="12" rx="1" fill="currentColor" stroke="none" />
    <rect x="15.6" y="9" width="3.4" height="9" rx="1" fill="currentColor" stroke="none" />
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
  <svg {...base(p)}>
    <path d="M4 11l8-7 8 7" />
    <path d="M6 9.5V20h12V9.5" />
    <path d="M10 20v-5h4v5" />
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
  <svg {...base({ ...p, fill: 'currentColor', stroke: 'none' })}>
    <path d="M12 20.5S3.5 15.4 3.5 9.6A4.6 4.6 0 0112 6.7a4.6 4.6 0 018.5 2.9c0 5.8-8.5 10.9-8.5 10.9z" />
  </svg>
);

export const IconUser = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20c1.2-3.6 4-5 7.5-5s6.3 1.4 7.5 5" />
  </svg>
);
