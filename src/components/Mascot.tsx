export type Pose = 'idle' | 'happy' | 'sad' | 'celebrate';

interface MascotProps {
  pose?: Pose;
  size?: number;
  className?: string;
}

/**
 * 吉祥物：小恐龙 Dino
 * 纯 SVG 手绘风，无素材依赖；pose 控制表情，动画交给 CSS class。
 */
export default function Mascot({ pose = 'idle', size = 120, className = '' }: MascotProps) {
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
      aria-label="mascot dino"
    >
      {/* 尾巴 */}
      <path d="M40 108 C 16 112, 10 84, 24 66 C 34 82, 44 90, 48 98 Z" fill="#6CC98F" />
      {/* 身体 */}
      <ellipse cx="94" cy="100" rx="58" ry="44" fill="#7BD39A" />
      {/* 肚皮 */}
      <ellipse cx="100" cy="114" rx="40" ry="28" fill="#E3FBE9" />
      {/* 背刺 */}
      <path d="M58 60 l 9 -17 l 10 15 Z" fill="#58C07E" />
      <path d="M78 52 l 9 -17 l 10 15 Z" fill="#58C07E" />
      <path d="M98 56 l 8 -15 l 9 13 Z" fill="#58C07E" />
      {/* 手臂 */}
      {celebrate ? (
        <>
          <circle cx="72" cy="76" r="9" fill="#6CC98F" />
          <circle cx="118" cy="72" r="9" fill="#6CC98F" />
        </>
      ) : (
        <ellipse cx="112" cy="88" rx="10" ry="7" fill="#6CC98F" transform="rotate(-20 112 88)" />
      )}
      {/* 腿 */}
      <rect x="70" y="132" width="25" height="26" rx="11" fill="#6CC98F" />
      <rect x="102" y="134" width="25" height="26" rx="11" fill="#6CC98F" />
      <ellipse cx="83" cy="161" rx="17" ry="7.5" fill="#4FAE75" />
      <ellipse cx="115" cy="162" rx="17" ry="7.5" fill="#4FAE75" />
      {/* 脖子与头 */}
      <ellipse cx="138" cy="66" rx="22" ry="36" fill="#7BD39A" />
      <circle cx="158" cy="54" r="33" fill="#7BD39A" />
      {/* 嘴巴 */}
      {sad ? (
        <path d="M162 70 Q 170 62, 180 68" stroke="#2E7D52" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      ) : celebrate ? (
        <ellipse cx="172" cy="72" rx="9" ry="7" fill="#2E7D52" />
      ) : (
        <path d="M160 66 Q 170 78, 182 66" stroke="#2E7D52" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      )}
      {/* 腮红 */}
      <ellipse cx="142" cy="62" rx="7.5" ry="5" fill="#FFB3C7" opacity="0.75" />
      {/* 眼睛 */}
      {happyEyes ? (
        <path d="M146 49 q 5 -6, 10 0 M158 47 q 5 -6, 10 0" stroke="#2E7D52" strokeWidth="3.6" fill="none" strokeLinecap="round" />
      ) : (
        <>
          <circle cx="152" cy="47" r="10.5" fill="#fff" />
          <circle cx="155" cy="48" r="5.2" fill="#2E7D52" />
          <circle cx="157" cy="46" r="2" fill="#fff" />
        </>
      )}
      {/* 鼻孔 */}
      <circle cx="187" cy="58" r="1.9" fill="#2E7D52" opacity="0.5" />
    </svg>
  );
}
