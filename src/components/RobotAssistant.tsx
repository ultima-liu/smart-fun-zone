type RobotAssistantProps = {
  size?: number;
  state?: 'idle' | 'happy' | 'thinking' | 'listening';
  className?: string;
};

/** 小卷学习助手机器人：纯 SVG，可复用，并通过 CSS 实现自然眨眼。 */
export default function RobotAssistant({ size = 64, state = 'idle', className = '' }: RobotAssistantProps) {
  return (
    <svg
      className={`robot-assistant state-${state} ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 96 96"
      role="img"
      aria-label="小卷机器人助手"
    >
      <defs>
        <linearGradient id="robot-shell" x1="20" y1="12" x2="78" y2="86" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" />
          <stop offset=".42" stopColor="#dcd4ff" />
          <stop offset="1" stopColor="#8d7af0" />
        </linearGradient>
        <linearGradient id="robot-face" x1="28" y1="31" x2="72" y2="68" gradientUnits="userSpaceOnUse">
          <stop stopColor="#20204d" />
          <stop offset="1" stopColor="#0d1232" />
        </linearGradient>
        <radialGradient id="robot-eye">
          <stop stopColor="#fff" />
          <stop offset=".28" stopColor="#8df4ff" />
          <stop offset="1" stopColor="#49bfe7" />
        </radialGradient>
      </defs>
      <g className="robot-float">
        <path d="M48 17V10" stroke="#bcaeff" strokeWidth="4" strokeLinecap="round" />
        <circle className="robot-antenna" cx="48" cy="8" r="5" fill="#ffe08a" stroke="#fff4cf" strokeWidth="2" />
        <path d="M21 49c-8 1-11 8-8 16 2 5 7 8 13 7M75 49c8 1 11 8 8 16-2 5-7 8-13 7" fill="#8170dc" stroke="#dcd4ff" strokeWidth="3" />
        <rect x="19" y="18" width="58" height="65" rx="25" fill="url(#robot-shell)" stroke="#fff" strokeOpacity=".78" strokeWidth="2.5" />
        <rect x="25" y="29" width="46" height="39" rx="18" fill="url(#robot-face)" stroke="#b9afff" strokeWidth="2" />
        <g className="robot-eyes">
          <ellipse cx="39" cy="47" rx="6" ry="8" fill="url(#robot-eye)" />
          <ellipse cx="57" cy="47" rx="6" ry="8" fill="url(#robot-eye)" />
          <circle cx="37" cy="44" r="1.8" fill="#fff" />
          <circle cx="55" cy="44" r="1.8" fill="#fff" />
        </g>
        <path className="robot-mouth" d="M40 58q8 7 16 0" fill="none" stroke="#8df4ff" strokeWidth="2.7" strokeLinecap="round" />
        <circle cx="48" cy="76" r="4" fill="#ffe08a" stroke="#fff" strokeWidth="1.5" />
        <path d="M35 82l-5 7M61 82l5 7" stroke="#8d7af0" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
