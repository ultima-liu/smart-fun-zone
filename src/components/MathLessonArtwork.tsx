/**
 * 数学目录课卡插画：每个单元一套手绘 SVG 场景（替代照片素材），
 * 自带天空/山丘/云朵构图，seed 用全册课号做云位与细节变化。
 * 场景是自包含的浅色画面（同语文教材图），深浅主题下都按"图片"呈现。
 */
const SKY: Record<string, [string, string]> = {
  sky: ['#d9effb', '#f4fbfe'],
  gold: ['#fdf0d0', '#fffbf1'],
  mint: ['#dcf3e4', '#f4fcf6'],
  violet: ['#eae3fc', '#f8f5ff'],
  coral: ['#fde4d8', '#fff6f1'],
  blue: ['#dceefb', '#f5fafe'],
  slate: ['#e8edf4', '#f8fafd'],
};
const HILL: Record<string, [string, string]> = {
  sky: ['#c3e4f7', '#a8d9f1'],
  gold: ['#f7e0a6', '#f0d188'],
  mint: ['#c1e9cf', '#a6ddba'],
  violet: ['#d9ccf9', '#c7b5f3'],
  coral: ['#f8ccb9', '#f3b89b'],
  blue: ['#c8def7', '#afd0f2'],
  slate: ['#cdd6e4', '#bac6d7'],
};

const CLOUD = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="#ffffff" opacity=".9">
    <ellipse cx="0" cy="0" rx="26" ry="12" />
    <ellipse cx="-16" cy="4" rx="15" ry="9" />
    <ellipse cx="17" cy="3" rx="17" ry="10" />
  </g>
);

/** 单元主题画（seed=全册课号，用于同单元内的逐课细节变化） */
function UnitMotif({ unit, seed }: { unit: string; seed: number }) {
  switch (unit) {
    case 'sky': // 校园找数学：教学楼+旗+树
      return <g>
        <rect x="146" y="116" width="124" height="88" rx="7" fill="#fdf7ee" stroke="#e5d5bc" strokeWidth="2" />
        <polygon points="140,118 208,80 276,118" fill="#ec8f6c" />
        {[163, 203, 243].map((x) => [133, 166].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width="26" height="22" rx="3.5" fill="#ffd979" stroke="#e9b45c" strokeWidth="1.5" />))}
        <rect x="196" y="172" width="24" height="32" rx="4" fill="#bb835d" />
        <line x1="288" y1="118" x2="288" y2="80" stroke="#9a8a72" strokeWidth="3" strokeLinecap="round" />
        <polygon points="288,80 316,87 288,95" fill="#e85a5a" />
        <circle cx="112" cy="176" r="20" fill="#8fce8f" /><rect x="108" y="190" width="8" height="16" rx="3" fill="#a9805a" />
        <circle cx="304" cy="182" r="15" fill="#9bd89b" /><rect x="301" y="192" width="7" height="13" rx="3" fill="#a9805a" />
      </g>;
    case 'gold': // 1～5：数字卡与苹果，当前课高亮一张数字卡
      return <g>
        <ellipse cx="200" cy="206" rx="130" ry="12" fill="#00000012" />
        <rect x="86" y="178" width="228" height="15" rx="7.5" fill="#dca666" />
        <rect x="102" y="193" width="12" height="22" rx="4" fill="#c78f4e" /><rect x="286" y="193" width="12" height="22" rx="4" fill="#c78f4e" />
        {[['1', -6], ['2', 4], ['3', -3], ['4', 6], ['5', -4]].map(([n], i) => {
          const hot = i === seed % 5;
          return <g key={n as string} transform={`translate(${112 + i * 44} ${hot ? 126 : 132})`}>
            <rect x={hot ? -21 : -17} y={hot ? -26 : -21} width={hot ? 42 : 34} height={hot ? 52 : 42} rx="7" fill="#fffdf8" stroke={hot ? '#e8a53c' : '#e3d3ae'} strokeWidth={hot ? 2.4 : 1.6} />
            <text x="0" y={hot ? 11 : 9} textAnchor="middle" fontFamily="system-ui" fontWeight="900" fontSize={hot ? 30 : 24} fill={hot ? '#c47f14' : '#8a641c'}>{n}</text>
          </g>;
        })}
        {[168, 204, 240].map((x, i) => <g key={x}><circle cx={x} cy={200 - (i === 1 ? 6 : 0)} r="13" fill="#ef6b6a" /><path d={`M${x} ${189 - (i === 1 ? 6 : 0)} q3 -7 9 -8`} stroke="#7c5b2e" strokeWidth="2.5" fill="none" strokeLinecap="round" /><ellipse cx={x + 8} cy={182 - (i === 1 ? 6 : 0)} rx="6" ry="3.4" fill="#7cc47c" transform={`rotate(-28 ${x + 8} ${182 - (i === 1 ? 6 : 0)})`} /></g>)}
      </g>;
    case 'mint': // 6～10：电线上的小鸟
      return <g>
        <path d="M46 118 Q200 158 354 118" stroke="#8a7a5c" strokeWidth="2.5" fill="none" />
        {[70, 122, 176, 230, 284, 330].map((x, i) => {
          const y = 128 + Math.round(Math.sin(((x - 46) / 308) * Math.PI) * 26);
          return <g key={x} transform={`translate(${x} ${y})`}>
            <ellipse cx="0" cy="2" rx="15" ry="11" fill={i % 2 ? '#5cbf9a' : '#7fd4b0'} />
            <circle cx="10" cy="-7" r="7.5" fill={i % 2 ? '#5cbf9a' : '#7fd4b0'} />
            <polygon points="16,-8 24,-6 16,-3" fill="#f2a23c" />
            <circle cx="12" cy="-9" r="1.6" fill="#2c3d33" />
            <path d="M-6 -2 Q2 -12 10 -4" stroke="#3f8a6d" strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>;
        })}
      </g>;
    case 'violet': // 立体图形货架
      return <g>
        <rect x="72" y="192" width="256" height="12" rx="6" fill="#cbb9f2" />
        <ellipse cx="200" cy="212" rx="140" ry="9" fill="#00000010" />
        {/* 圆柱 */}
        <rect x="98" y="128" width="44" height="64" fill="#9fd8f0" />
        <ellipse cx="120" cy="128" rx="22" ry="9" fill="#c3e8f8" /><ellipse cx="120" cy="192" rx="22" ry="9" fill="#7fc4e6" />
        {/* 正方体 */}
        <polygon points="176,150 206,138 236,150 206,162" fill="#c9b4fb" />
        <rect x="176" y="150" width="60" height="42" fill="#a98ef5" />
        <polygon points="236,150 236,192 206,204 206,162" fill="#8d6ff0" />
        {/* 球 */}
        <circle cx="288" cy="164" r="28" fill="#f2a2b6" /><ellipse cx="279" cy="154" rx="10" ry="6" fill="#fbd3de" />
        {/* 长方体 */}
        <polygon points="306,158 330,148 354,158 330,168" fill="#f8d98a" />
        <rect x="306" y="158" width="48" height="34" fill="#f0b949" />
        <polygon points="354,158 354,192 330,202 330,168" fill="#d99f2e" />
      </g>;
    case 'coral': // 11～20：1捆（10根）+5根
      return <g>
        <ellipse cx="200" cy="206" rx="130" ry="11" fill="#00000012" />
        {Array.from({ length: 10 }, (_, i) => <line key={i} x1={128 + i * 6} y1="196" x2={132 + i * 6} y2="112" stroke="#dd9a55" strokeWidth="5.5" strokeLinecap="round" transform={`rotate(${(i - 4.5) * 1.6} ${130 + i * 6} 154)`} />)}
        <rect x="118" y="146" width="66" height="14" rx="7" fill="#e85a5a" transform="rotate(-4 151 153)" />
        {[252, 268, 284, 300, 316].map((x, i) => <line key={x} x1={x} y1={198 - (i % 2) * 6} x2={x + 4} y2={124 - (i % 2) * 6} stroke="#f0a63c" strokeWidth="5.5" strokeLinecap="round" />)}
      </g>;
    case 'blue': // 进位加法：十格阵 9+4
      return <g>
        <ellipse cx="200" cy="206" rx="130" ry="11" fill="#00000010" />
        {[0, 1].map((f) => <g key={f} transform={`translate(${92 + f * 122} 116)`}>
          {Array.from({ length: 10 }, (_, i) => {
            const filled = f === 0 ? i < 9 : i < 4;
            return <rect key={i} x={(i % 5) * 20} y={Math.floor(i / 5) * 20} width="17" height="17" rx="4" fill={filled ? (f === 0 ? '#4d91cc' : '#f0a63c') : '#ffffff'} stroke={filled ? 'none' : '#b9cfe4'} strokeWidth="1.5" />;
          })}
          <rect x="-2" y="-2" width="102" height="42" rx="8" fill="none" stroke="#7ea8d4" strokeWidth="2" />
        </g>)}
        <text x="204" y="140" textAnchor="middle" fontFamily="system-ui" fontWeight="900" fontSize="22" fill="#4d91cc">＋</text>
        <text x="200" y="196" textAnchor="middle" fontFamily="system-ui" fontWeight="900" fontSize="19" fill="#5b7ea6">9 ＋ 4 ＝ 13</text>
      </g>;
    default: // slate 复习与关联：星图与符号
      return <g>
        <circle cx="200" cy="138" r="58" fill="none" stroke="#b7c1d4" strokeWidth="2" strokeDasharray="5 7" />
        <polygon points="200,92 212,124 246,124 219,145 229,178 200,158 171,178 181,145 154,124 188,124" fill="#f3c968" stroke="#dfa837" strokeWidth="2.5" strokeLinejoin="round" />
        {([['＋', 118, 110], ['－', 282, 108], ['＝', 112, 182], ['＜', 288, 180]] as const).map(([s, x, y]) => <g key={s}><rect x={x - 15} y={y - 15} width="30" height="30" rx="9" fill="#ffffff" stroke="#c3ccdb" strokeWidth="1.6" /><text x={x} y={y + 7} textAnchor="middle" fontFamily="system-ui" fontWeight="900" fontSize="18" fill="#5f6d85">{s}</text></g>)}
      </g>;
  }
}

export default function MathLessonArtwork({ unitColor, seed = 0 }: { unitColor: string; seed?: number }) {
  const [skyTop, skyBottom] = SKY[unitColor] ?? SKY.slate;
  const [hillFar, hillNear] = HILL[unitColor] ?? HILL.slate;
  const uid = `mla-${unitColor}`;
  const drift = (seed % 5) * 14;
  return (
    <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" role="presentation" focusable="false">
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skyTop} /><stop offset="1" stopColor={skyBottom} />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill={`url(#${uid}-sky)`} />
      <circle cx={330 - (seed % 3) * 18} cy="52" r="24" fill="#ffd77a" opacity=".95" />
      <circle cx={330 - (seed % 3) * 18} cy="52" r="34" fill="#ffd77a" opacity=".28" />
      <CLOUD x={70 + drift} y={58} s={1} />
      <CLOUD x={210 + drift * 0.6} y={34} s={0.72} />
      <path d="M0 190 Q110 148 230 186 T400 178 L400 260 L0 260 Z" fill={hillFar} opacity=".8" />
      <path d="M0 214 Q140 180 268 208 T400 202 L400 260 L0 260 Z" fill={hillNear} />
      <UnitMotif unit={unitColor} seed={seed} />
    </svg>
  );
}
