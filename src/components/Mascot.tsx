import { useId } from 'react';

export type Pose = 'idle' | 'happy' | 'sad' | 'celebrate';

interface MascotProps {
  pose?: Pose;
  size?: number;
  className?: string;
}

/**
 * 吉祥物：「卷卷星」——卷卷星球的本体星球小精灵
 * 圆形星球脸 + 卷卷呆毛 + 星环 + 星点，纯 SVG 手绘。
 * pose 控制表情；动画交给 CSS class（沿用 .mascot.pose-* 约定）。
 */
export default function Mascot({ pose = 'idle', size = 120, className = '' }: MascotProps) {
  const uid = useId();
  const happyEyes = pose === 'happy' || pose === 'celebrate';
  const celebrate = pose === 'celebrate';
  const sad = pose === 'sad';

  return (
    <svg
      viewBox="0 0 200 172"
      width={size}
      height={size}
      className={`mascot pose-${pose} ${className}`}
      role="img"
      aria-label="mascot juansing"
    >
      <defs>
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#A78BFA" />
          <stop offset="0.55" stopColor="#7C6AF0" />
          <stop offset="1" stopColor="#5B4AD0" />
        </linearGradient>
        <linearGradient id={`${uid}-ring`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#F2A65A" />
          <stop offset="0.5" stopColor="#F6C24B" />
          <stop offset="1" stopColor="#C986E8" />
        </linearGradient>
      </defs>

      {/* 星环（卷卷星带） */}
      <ellipse
        cx="100"
        cy="96"
        rx="82"
        ry="24"
        fill="none"
        stroke={`url(#${uid}-ring)`}
        strokeWidth="9"
        strokeLinecap="round"
        transform="rotate(-16 100 96)"
        opacity="0.95"
      />
      <ellipse
        cx="100"
        cy="96"
        rx="70"
        ry="17"
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="2.5"
        transform="rotate(-16 100 96)"
      />

      {/* 星球身体 */}
      <circle cx="100" cy="98" r="58" fill={`url(#${uid}-body)`} />
      <ellipse cx="88" cy="86" rx="34" ry="22" fill="#B8A6FF" opacity="0.5" transform="rotate(-20 88 86)" />
      <ellipse cx="108" cy="142" rx="30" ry="14" fill="#43349E" opacity="0.35" />

      {/* 卷卷呆毛（螺旋卷） */}
      <path
        d="M100 40 C 92 26, 72 22, 68 34 C 64 46, 78 50, 86 42 C 90 38, 90 33, 87 30"
        fill="none"
        stroke="#F2A65A"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* 脸颊星星点 */}
      <path d="M52 78 l 2.4 5.2 5.6 0.6 -4.2 3.8 1.2 5.6 -5 -2.8 -5 2.8 1.2 -5.6 -4.2 -3.8 5.6 -0.6 Z" fill="#F6C24B" />
      <path d="M148 58 l 1.8 4 4.2 0.4 -3.1 2.9 0.9 4.2 -3.8 -2.1 -3.8 2.1 0.9 -4.2 -3.1 -2.9 4.2 -0.4 Z" fill="#F6C24B" opacity="0.9" />

      {/* 小手 */}
      {celebrate ? (
        <>
          <circle cx="56" cy="78" r="10" fill="#5B4AD0" />
          <circle cx="144" cy="78" r="10" fill="#5B4AD0" />
          <circle cx="52" cy="72" r="4" fill="#F2A65A" />
          <circle cx="148" cy="72" r="4" fill="#F2A65A" />
        </>
      ) : (
        <ellipse cx="54" cy="104" rx="11" ry="8" fill="#5B4AD0" transform="rotate(18 54 104)" />
      )}

      {/* 眼睛 */}
      {happyEyes ? (
        <>
          <path d="M74 88 q 7 -8, 14 0" stroke="#2A1F66" strokeWidth="4.4" fill="none" strokeLinecap="round" />
          <path d="M112 88 q 7 -8, 14 0" stroke="#2A1F66" strokeWidth="4.4" fill="none" strokeLinecap="round" />
        </>
      ) : sad ? (
        <>
          <path d="M74 92 q 7 7, 14 0" stroke="#2A1F66" strokeWidth="4.4" fill="none" strokeLinecap="round" />
          <path d="M112 92 q 7 7, 14 0" stroke="#2A1F66" strokeWidth="4.4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="81" cy="88" r="8.5" fill="#fff" />
          <circle cx="119" cy="88" r="8.5" fill="#fff" />
          <circle cx="84" cy="89" r="4.4" fill="#2A1F66" />
          <circle cx="122" cy="89" r="4.4" fill="#2A1F66" />
          <circle cx="85.6" cy="87.4" r="1.7" fill="#fff" />
          <circle cx="123.6" cy="87.4" r="1.7" fill="#fff" />
        </>
      )}

      {/* 嘴巴 */}
      {sad ? (
        <path d="M88 122 Q 100 112, 112 122" stroke="#2A1F66" strokeWidth="4" fill="none" strokeLinecap="round" />
      ) : celebrate ? (
        <ellipse cx="100" cy="122" rx="10" ry="8" fill="#2A1F66" />
      ) : (
        <path d="M86 118 Q 100 132, 114 118" stroke="#2A1F66" strokeWidth="4" fill="none" strokeLinecap="round" />
      )}

      {/* 腮红 */}
      <ellipse cx="66" cy="106" rx="9" ry="6" fill="#FFB3C7" opacity="0.8" />
      <ellipse cx="134" cy="106" rx="9" ry="6" fill="#FFB3C7" opacity="0.8" />

      {/* 地面小阴影 */}
      <ellipse cx="100" cy="158" rx="34" ry="7" fill="#2A1F66" opacity="0.25" />
    </svg>
  );
}
