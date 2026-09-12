import type { StarCard, CardRarity } from '../content/starCards';
import { characterPortrait } from '../content/characterAssets';
import Mascot from './Mascot';
import { JingJingFigure } from './NpcFigure';

interface Props {
  card: StarCard;
  size?: number;
  className?: string;
}

const RARITY_COLOR: Record<CardRarity, string> = {
  R: '#3bd89e',
  SR: '#4fb3e8',
  SSR: '#d9537e',
  SP: '#f6cd72',
};

/** 稀有度字母流动渐变色环（首尾同色保证无缝循环） */
const RARITY_CYCLE: Record<CardRarity, string[]> = {
  R: ['#12a977', '#3bd89e', '#c9ffe8', '#f4fff8', '#c9ffe8', '#3bd89e', '#12a977'],
  SR: ['#1f7fc4', '#4fb3e8', '#bdeaff', '#f2fbff', '#bdeaff', '#4fb3e8', '#1f7fc4'],
  SSR: ['#8e1a49', '#e8559a', '#ffb48a', '#ffe9a8', '#ffb48a', '#e8559a', '#8e1a49'],
  SP: ['#ff4d6d', '#ff9d3c', '#ffd93d', '#5be08a', '#43c6ff', '#9d6bff', '#ff6ad5', '#ff4d6d'],
};

/** 生成跨文字区的稀有度渐变文字（跨度匹配字母宽度，保证字母内完整色环） */
function RarityGradient({ rarity, idBase }: { rarity: CardRarity; idBase: string }) {
  const cols = RARITY_CYCLE[rarity] ?? RARITY_CYCLE.R;
  const stops = [];
  for (let i = 0; i < cols.length; i++) {
    const off = Math.round((i / (cols.length - 1)) * 100 * 100) / 100;
    stops.push(<stop key={i} offset={`${off}%`} stopColor={cols[i]} />);
  }
  const x2 = rarity === 'R' ? 18 : rarity === 'SSR' ? 50 : 34;
  return (
    <linearGradient id={`rgrad-${idBase}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={x2} y2="0">
      {stops}
    </linearGradient>
  );
}

export default function CardPortrait({ card, size = 168, className = '' }: Props) {
  const rc = RARITY_COLOR[card.rarity];
  const [c1, c2, c3] = card.palette;
  const idBase = card.id.replace(/[^a-z0-9]/gi, '');

  return (
    <svg
      className={`ccard-portrait ${className}`}
      width={size}
      height={Math.round(size * 1.4)}
      viewBox="0 0 200 280"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={card.name.zh}
    >
      <style>{`
        /* 实心插画风：所有色块统一深色勾线，边缘利落 */
        .ink path, .ink circle, .ink ellipse, .ink rect, .ink polygon {
          stroke: #241a45;
          stroke-width: 2.6;
          stroke-linejoin: round;
          stroke-linecap: round;
          paint-order: stroke fill;
        }
        .ink .noink, .ink .noink path, .ink .noink circle, .ink .noink ellipse, .ink .noink rect, .ink .noink polygon {
          stroke: none !important;
        }
      `}</style>
      <defs>
        <radialGradient id={`bg-${idBase}`} cx="50%" cy="40%" r="80%">
          <stop offset="0%" stopColor={c1} stopOpacity="0.85" />
          <stop offset="60%" stopColor={c2} stopOpacity="0.45" />
          <stop offset="100%" stopColor="#0e0a2c" stopOpacity="1" />
        </radialGradient>
        <linearGradient id={`frame-${idBase}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c3} stopOpacity="0.9" />
          <stop offset="50%" stopColor={rc} stopOpacity="0.8" />
          <stop offset="100%" stopColor={c1} stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id={`gem-${idBase}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c3} />
          <stop offset="100%" stopColor={rc} />
        </linearGradient>
        <filter id={`glow-${idBase}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id={`portrait-clip-${idBase}`}>
          <path d="M22 42 Q22 32 32 32 H168 Q178 32 178 42 V246 Q178 256 168 256 H32 Q22 256 22 246 Z" />
        </clipPath>
        <linearGradient id={`stage-${idBase}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity=".12" />
          <stop offset="58%" stopColor={c1} stopOpacity=".08" />
          <stop offset="100%" stopColor="#09061f" stopOpacity=".76" />
        </linearGradient>
        {/* 稀有度字母流动渐变 */}
        <RarityGradient rarity={card.rarity} idBase={idBase} />
      </defs>

      {/* 背景 */}
      <rect x="0" y="0" width="200" height="280" rx="18" fill={`url(#bg-${idBase})`} />

      {/* 星光/噪点 */}
      <g opacity="0.5">
        {[...Array(18)].map((_, i) => (
          <circle
            key={i}
            cx={20 + (i * 37) % 170}
            cy={20 + (i * 53) % 240}
            r={1 + (i % 3)}
            fill="#fff"
            opacity={0.2 + (i % 5) / 10}
          />
        ))}
      </g>

      {/* 外框 */}
      <rect
        x="8"
        y="8"
        width="184"
        height="264"
        rx="14"
        fill="none"
        stroke={`url(#frame-${idBase})`}
        strokeWidth="2.5"
      />
      <rect
        x="14"
        y="14"
        width="172"
        height="252"
        rx="11"
        fill="none"
        stroke={rc}
        strokeOpacity="0.35"
        strokeWidth="1"
      />

      {/* 四角宝石 */}
      <Gem x={18} y={18} rc={rc} idBase={idBase} />
      <Gem x={182} y={18} rc={rc} idBase={idBase} rotate />
      <Gem x={18} y={262} rc={rc} idBase={idBase} rotate />
      <Gem x={182} y={262} rc={rc} idBase={idBase} />

      {/* 顶部三星饰：清晰呈现，不做模糊 */}
      <g transform="translate(100, 32)">
        <polygon points="0,-6 1.5,-1.5 6,0 1.5,1.5 0,6 -1.5,1.5 -6,0 -1.5,-1.5" fill={c3} />
        <circle cx="-14" cy="0" r="2" fill={c3} opacity="0.8" />
        <circle cx="14" cy="0" r="2" fill={c3} opacity="0.8" />
      </g>

      {/* 卷星人采用根据人物档案绘制的高精度全身立绘；其他套系继续使用轻量矢量插画。 */}
      {card.role === 'hanzi' && card.hanzi ? (
        <HanziPortrait card={card} />
      ) : card.id === 'npc-xiao-juan' ? (
        <GlobalXiaoJuanPortrait idBase={idBase} />
      ) : card.id === 'npc-jing-jing' ? (
        <JingJingCardPortrait idBase={idBase} />
      ) : card.setId === 'npc' && card.role === 'figure' ? (
        <RasterNpcPortrait card={card} idBase={idBase} />
      ) : (
        <g className="ink" transform="translate(100, 148)">
          {card.role === 'figure' && (card.setId === 'monster' ? <MonsterPortrait card={card} idBase={idBase} /> : <FigureArt card={card} />)}
          {card.role === 'item' && <ItemArt card={card} />}
          {card.role === 'scene' && <SceneArt card={card} />}
        </g>
      )}

      {/* 底部稀有度光晕 */}
      <ellipse cx="100" cy="245" rx="60" ry="10" fill={rc} opacity="0.25" filter={`url(#glow-${idBase})`} />

      {/* 稀有度字母（左上角，无底牌，渐变文字） */}
      <g transform="translate(30, 48)">
        <text
          x="0"
          y="0"
          fill={`url(#rgrad-${idBase})`}
          fontSize="26"
          fontWeight="400"
          style={{ letterSpacing: '0.4px' }}
        >
          {card.rarity}
        </text>
      </g>
    </svg>
  );
}

/** 汉字卡正面：田字格、大字、拼音与识字要点在缩略图状态也能读清。 */
function HanziPortrait({ card }: { card: StarCard }) {
  const h = card.hanzi!;
  return (
    <g className="ccard-hanzi-art">
      <rect x="32" y="53" width="136" height="136" rx="14" fill="#fffdf5" stroke="#f1d4a0" strokeWidth="2" />
      <g stroke="#d9b778" strokeWidth="1" strokeDasharray="5 4" opacity=".72">
        <line x1="100" y1="55" x2="100" y2="187" />
        <line x1="34" y1="121" x2="166" y2="121" />
        <line x1="36" y1="57" x2="164" y2="185" />
        <line x1="164" y1="57" x2="36" y2="185" />
      </g>
      <text x="100" y="154" textAnchor="middle" fill="#24213b" fontSize="86" fontWeight="800" fontFamily="KaiTi, STKaiti, serif">{h.character}</text>
      <rect x="65" y="43" width="70" height="25" rx="12.5" fill="#fff" stroke={card.palette[0]} strokeWidth="1.5" />
      <text x="100" y="61" textAnchor="middle" fill={card.palette[0]} fontSize="15" fontWeight="800">{h.pinyin}</text>
      <g transform="translate(31 201)">
        <rect width="138" height="40" rx="10" fill="#17122f" opacity=".86" />
        <text x="69" y="16" textAnchor="middle" fill="#fff4cb" fontSize="10" fontWeight="700">{h.structure.zh} · {h.strokes}画</text>
        <text x="69" y="32" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800">部首：{h.radical.zh}</text>
      </g>
    </g>
  );
}

/** 小卷与全局学习助手共用同一份卷卷星 SVG，而不是复制或导出一张独立卡牌贴图。 */
function GlobalXiaoJuanPortrait({ idBase }: { idBase: string }) {
  return (
    <g clipPath={`url(#portrait-clip-${idBase})`}>
      <ellipse cx="100" cy="228" rx="64" ry="25" fill="#8b7bf0" opacity=".22" filter={`url(#glow-${idBase})`} />
      <g transform="translate(20 46) scale(.8)">
        <Mascot pose="happy" size={200} className="ccard-xiao-juan-mascot" />
      </g>
    </g>
  );
}

/** 晶晶的图鉴卡与档案库 NPC 共用同一份晶簇档案员 SVG。 */
function JingJingCardPortrait({ idBase }: { idBase: string }) {
  return (
    <g clipPath={`url(#portrait-clip-${idBase})`}>
      <ellipse cx="100" cy="228" rx="67" ry="24" fill="#b99af6" opacity=".24" filter={`url(#glow-${idBase})`} />
      <g className="ccard-jing-jing-art" transform="translate(25 40) scale(1.5)">
        <JingJingFigure size={100} />
      </g>
      <rect x="22" y="32" width="156" height="224" fill={`url(#stage-${idBase})`} />
    </g>
  );
}

function RasterNpcPortrait({ card, idBase }: { card: StarCard; idBase: string }) {
  const asset = characterPortrait(card.id);
  if (!asset) {
    return <g className="ink" transform="translate(100, 148)"><NpcPortrait card={card} /></g>;
  }
  return (
    <g clipPath={`url(#portrait-clip-${idBase})`}>
      <ellipse cx="100" cy="230" rx="70" ry="26" fill={card.palette[0]} opacity=".22" filter={`url(#glow-${idBase})`} />
      <image
        href={asset}
        x="28"
        y="37"
        width="144"
        height="216"
        preserveAspectRatio="xMidYMid meet"
        className="ccard-npc-art"
      />
      <rect x="22" y="32" width="156" height="224" fill={`url(#stage-${idBase})`} />
    </g>
  );
}

function Gem({ x, y, rc, idBase, rotate }: { x: number; y: number; rc: string; idBase: string; rotate?: boolean }) {
  const transform = rotate ? `rotate(180 ${x} ${y})` : undefined;
  return (
    <g transform={transform}>
      <polygon points={`${x},${y - 7} ${x + 7},${y} ${x},${y + 7} ${x - 7},${y}`} fill={`url(#gem-${idBase})`} />
      <polygon points={`${x},${y - 4} ${x + 4},${y} ${x},${y + 4} ${x - 4},${y}`} fill={rc} opacity="0.5" />
    </g>
  );
}

/** NPC 专属立绘装饰（按卡牌 id 定制，提升辨识度与精美度） */
function npcDecor(card: StarCard, c1: string, c2: string, c3: string, rc: string): JSX.Element | null {
  switch (card.id) {
    /* 星校长·阿光：猫头鹰耳羽 + 圆眼镜 + 书卷 */
    case 'npc-a-guang':
      return (
        <g>
          {/* 猫头鹰耳羽 */}
          <path d="M-13,-42 L-19,-58 L-6,-48 Z" fill={c1} stroke="#1a1535" strokeWidth="1" />
          <path d="M13,-42 L19,-58 L6,-48 Z" fill={c1} stroke="#1a1535" strokeWidth="1" />
          <path d="M-13,-44 L-16,-52 L-9,-47 Z" fill={c3} opacity="0.9" />
          <path d="M13,-44 L16,-52 L9,-47 Z" fill={c3} opacity="0.9" />
          {/* 圆眼镜 */}
          <circle cx="-7" cy="-21" r="6.5" fill="none" stroke="#4a3f7a" strokeWidth="1.6" />
          <circle cx="7" cy="-21" r="6.5" fill="none" stroke="#4a3f7a" strokeWidth="1.6" />
          <line x1="-0.5" y1="-21" x2="0.5" y2="-21" stroke="#4a3f7a" strokeWidth="1.6" />
          <line x1="-13.5" y1="-21" x2="-17" y2="-20" stroke="#4a3f7a" strokeWidth="1.2" />
          <line x1="13.5" y1="-21" x2="17" y2="-20" stroke="#4a3f7a" strokeWidth="1.2" />
          {/* 微笑 + 温和胡子提示 */}
          <path d="M-6,-13 Q0,-9 6,-13" fill="none" stroke="#d48c8c" strokeWidth="1.6" strokeLinecap="round" />
          {/* 手持书卷 */}
          <rect x="20" y="8" width="16" height="22" rx="2" fill={c3} stroke="#1a1535" strokeWidth="1" />
          <line x1="23" y1="13" x2="33" y2="13" stroke={c1} strokeWidth="1.5" />
          <line x1="23" y1="17" x2="33" y2="17" stroke={c1} strokeWidth="1.5" />
          <line x1="23" y1="21" x2="31" y2="21" stroke={c1} strokeWidth="1.5" />
          <rect x="18" y="6" width="4" height="26" rx="2" fill={c2} stroke="#1a1535" strokeWidth="1" />
        </g>
      );
    /* 总指挥官·铁砣：军帽 + 肩章星 + 沉稳眉 */
    case 'npc-tie-tuo':
      return (
        <g>
          {/* 军帽 */}
          <path d="M-22,-36 Q-24,-52 0,-54 Q24,-52 22,-36 Q20,-30 14,-28 Q0,-32 -14,-28 Q-20,-30 -22,-36" fill={c1} stroke="#1a1535" strokeWidth="1" />
          <rect x="-24" y="-38" width="48" height="6" rx="3" fill={c2} stroke="#1a1535" strokeWidth="1" />
          <circle cx="0" cy="-40" r="5" fill={c3} stroke="#1a1535" strokeWidth="1" />
          <path d="M0,-44 L1.5,-40 L5,-39 L2,-37 L2.6,-33 L0,-35 L-2.6,-33 L-2,-37 L-5,-39 L-1.5,-40 Z" fill="#fff" />
          {/* 肩章星 */}
          <path d="M-24,6 L-22,4 L-18,4 L-20,6 L-21,9 L-23,9 Z" fill={c3} stroke="#1a1535" strokeWidth="0.8" />
          <path d="M24,6 L22,4 L18,4 L20,6 L21,9 L23,9 Z" fill={c3} stroke="#1a1535" strokeWidth="0.8" />
          {/* 沉稳眉（平直） */}
          <line x1="-11" y1="-28" x2="-3" y2="-28" stroke="#1a1535" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="3" y1="-28" x2="11" y2="-28" stroke="#1a1535" strokeWidth="1.6" strokeLinecap="round" />
          {/* 坚毅下巴 */}
          <path d="M-5,-12 L0,-11 L5,-12" fill="none" stroke="#c07a6a" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      );
    /* 补给站老板·铛铛：头巾 + 大篮子 + 围裙 */
    case 'npc-dang-dang':
      return (
        <g>
          {/* 头巾 */}
          <path d="M-22,-30 Q-24,-46 0,-48 Q24,-46 22,-30 Q12,-36 0,-36 Q-12,-36 -22,-30 Z" fill={c3} stroke="#1a1535" strokeWidth="1" />
          <circle cx="0" cy="-40" r="4" fill={c2} />
          {/* 大篮子 */}
          <ellipse cx="24" cy="34" rx="15" ry="11" fill="#c98a4a" stroke="#1a1535" strokeWidth="1.2" />
          <path d="M9,30 Q24,18 39,30" fill="none" stroke="#1a1535" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="24" cy="30" rx="13" ry="6" fill="#f3d9a8" />
          {/* 篮内好物 */}
          <circle cx="19" cy="27" r="4" fill={c1} />
          <circle cx="26" cy="25" r="4" fill={c2} />
          <circle cx="31" cy="28" r="3" fill={rc} />
          {/* 围裙 */}
          <path d="M-12,22 L-14,55 L14,55 L12,22 Q0,28 -12,22 Z" fill={c3} opacity="0.85" stroke="#1a1535" strokeWidth="0.8" />
          <rect x="-10" y="34" width="20" height="8" rx="2" fill={c2} opacity="0.9" />
        </g>
      );
    /* 乐园主·泡泡：双马尾气球 + 大笑脸 + 飘带 */
    case 'npc-pao-pao':
      return (
        <g>
          {/* 双马尾气球 */}
          <line x1="-20" y1="-32" x2="-26" y2="-22" stroke="#1a1535" strokeWidth="1.2" />
          <line x1="20" y1="-32" x2="26" y2="-22" stroke="#1a1535" strokeWidth="1.2" />
          <circle cx="-28" cy="-36" r="9" fill={c1} stroke="#1a1535" strokeWidth="1.2" />
          <circle cx="28" cy="-36" r="9" fill={c2} stroke="#1a1535" strokeWidth="1.2" />
          <polygon points="-28,-45 -30,-40 -26,-40" fill={c3} />
          <polygon points="28,-45 30,-40 26,-40" fill={c1} />
          <circle cx="-30" cy="-38" r="2" fill="#fff" opacity="0.8" />
          <circle cx="30" cy="-38" r="2" fill="#fff" opacity="0.8" />
          {/* 大笑嘴 */}
          <path d="M-7,-14 Q0,-6 7,-14 Q0,-10 -7,-14 Z" fill="#e07070" stroke="#1a1535" strokeWidth="0.8" />
          <path d="M-7,-14 Q0,-10 7,-14" fill="none" stroke="#fff" strokeWidth="1" />
          {/* 腮红 */}
          <circle cx="-13" cy="-14" r="3" fill="#ffb3c8" opacity="0.8" />
          <circle cx="13" cy="-14" r="3" fill="#ffb3c8" opacity="0.8" />
          {/* 胸前星飘带 */}
          <path d="M-8,24 Q0,30 8,24 L6,30 Q0,34 -6,30 Z" fill={rc} opacity="0.9" />
          <path d="M0,24 L1.2,27.5 L5,27.6 L2.2,29.6 L3.2,33 L0,31 L-3.2,33 L-2.2,29.6 L-5,27.6 L-1.2,27.5 Z" fill="#fff" />
        </g>
      );
    /* 守护精灵·小卷：头顶大星星发饰 + 星星耳环 + 闪亮眼 */
    case 'npc-xiao-juan':
      return (
        <g>
          {/* 头顶大星星发饰 */}
          <path d="M0,-52 L4,-40 L16,-40 L6,-32 L10,-20 L0,-28 L-10,-20 L-6,-32 L-16,-40 L-4,-40 Z" fill={c3} stroke="#1a1535" strokeWidth="1.2" />
          <path d="M0,-46 L2,-41 L8,-41 L3,-37 L5,-31 L0,-34 L-5,-31 L-3,-37 L-8,-41 L-2,-41 Z" fill="#fff" opacity="0.9" />
          {/* 星星耳环 */}
          <path d="M-17,-16 L-16,-14 L-14,-14 L-15.6,-12.4 L-15,-10 L-17,-11.5 L-19,-10 L-18.4,-12.4 L-20,-14 L-18,-14 Z" fill={rc} />
          <path d="M17,-16 L16,-14 L14,-14 L15.6,-12.4 L15,-10 L17,-11.5 L19,-10 L18.4,-12.4 L20,-14 L18,-14 Z" fill={rc} />
          {/* 闪亮眼（更大高光） */}
          <circle cx="-7" cy="-20" r="5.5" fill="#1a1535" />
          <circle cx="7" cy="-20" r="5.5" fill="#1a1535" />
          <circle cx="-8" cy="-22" r="2" fill="#fff" />
          <circle cx="8" cy="-22" r="2" fill="#fff" />
          <circle cx="-5" cy="-18" r="1" fill="#fff" opacity="0.8" />
          <circle cx="9" cy="-18" r="1" fill="#fff" opacity="0.8" />
          {/* 甜美笑 */}
          <path d="M-5,-13 Q0,-9 5,-13" fill="none" stroke="#e07070" strokeWidth="1.6" strokeLinecap="round" />
          {/* 环绕小星星 */}
          <path d="M-30,0 L-28.6,4 L-24,4.2 L-27.4,6.6 L-26.4,10.6 L-30,8.4 L-33.6,10.6 L-32.6,6.6 L-36,4.2 L-31.4,4 Z" fill={c3} opacity="0.85" />
          <path d="M30,6 L31.4,10 L35,10.2 L32.4,12.6 L33.4,16.6 L30,14.4 L26.6,16.6 L27.6,12.6 L24,10.2 L28.6,10 Z" fill={c3} opacity="0.85" />
        </g>
      );
    default:
      return null;
  }
}

/** NPC 专属半身立绘：按卡牌 id 完全定制（脸型/发型/表情/服饰/背景场景），避免雷同 */
function NpcPortrait({ card }: { card: StarCard }) {
  const [c1, c2, c3] = card.palette;
  const rc = RARITY_COLOR[card.rarity];

  switch (card.id) {
    /* ───────── 星校长·阿光（猫头鹰智者） ───────── */
    case 'npc-a-guang':
      return (
        <g>
          {/* 背景：星轨 + 打开的书 */}
          <ellipse className="noink" cx="0" cy="58" rx="58" ry="13" fill={c1} opacity="0.22" />
          <path d="M-58,20 Q0,-30 58,20" fill="none" stroke={c3} strokeWidth="1.6" strokeDasharray="5 5" opacity="0.5" />
          <circle cx="-52" cy="16" r="2.5" fill={c3} opacity="0.7" />
          <circle cx="52" cy="16" r="2.5" fill={c3} opacity="0.7" />
          <circle cx="0" cy="-24" r="2.5" fill={c3} opacity="0.7" />
          {/* 打开的书 */}
          <g transform="translate(-34,40) rotate(-10)">
            <path d="M0,0 L18,-4 L18,16 L0,20 Z" fill={c3} />
            <path d="M0,0 L-18,-4 L-18,16 L0,20 Z" fill={c2} opacity="0.9" />
            <line x1="0" y1="0" x2="0" y2="18" stroke={c1} strokeWidth="1.5" />
            <line x1="4" y1="3" x2="14" y2="1" stroke={c1} strokeWidth="1" />
            <line x1="4" y1="7" x2="14" y2="5" stroke={c1} strokeWidth="1" />
          </g>
          {/* 披风 */}
          <path d="M-30,58 Q-44,20 -26,-8 Q0,-24 26,-8 Q44,20 30,58 Z" fill={c2} opacity="0.9" />
          <path d="M-30,58 Q-38,30 -26,2 L-14,10 Q-24,30 -20,58 Z" fill={c1} opacity="0.5" />
          {/* 校长服 */}
          <path d="M-18,12 L-16,58 L16,58 L18,12 Q8,20 0,20 Q-8,20 -18,12 Z" fill={c1} />
          <rect x="-4" y="14" width="8" height="12" rx="2" fill={c3} />
          {/* 猫头鹰头 */}
          <ellipse cx="0" cy="-16" rx="22" ry="20" fill="#c98a4a" />
          <path d="M-15,-28 L-21,-46 L-7,-36 Z" fill="#c98a4a" />
          <path d="M15,-28 L21,-46 L7,-36 Z" fill="#c98a4a" />
          <path d="M-13,-30 L-16,-40 L-9,-34 Z" fill={c3} opacity="0.85" />
          <path d="M13,-30 L16,-40 L9,-34 Z" fill={c3} opacity="0.85" />
          {/* 眼镜大眼 */}
          <ellipse cx="-8" cy="-16" rx="7.5" ry="8.5" fill="#ffe8d6" />
          <ellipse cx="8" cy="-16" rx="7.5" ry="8.5" fill="#ffe8d6" />
          <ellipse cx="-8" cy="-16" rx="5" ry="5.5" fill="#1a1535" />
          <ellipse cx="8" cy="-16" rx="5" ry="5.5" fill="#1a1535" />
          <circle className="noink" cx="-9" cy="-18" r="1.8" fill="#fff" />
          <circle className="noink" cx="9" cy="-18" r="1.8" fill="#fff" />
          <circle cx="-8" cy="-16" r="7.5" fill="none" stroke="#4a3f7a" strokeWidth="1.8" />
          <circle cx="8" cy="-16" r="7.5" fill="none" stroke="#4a3f7a" strokeWidth="1.8" />
          <line x1="-1" y1="-16" x2="1" y2="-16" stroke="#4a3f7a" strokeWidth="1.8" />
          {/* 白眉 + 温和微笑 + 小胡子 */}
          <path d="M-13,-26 Q-8,-30 -4,-27" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <path d="M4,-27 Q8,-30 13,-26" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <path d="M-6,-8 Q0,-4 6,-8" fill="none" stroke="#d48c8c" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M-8,-4 Q0,0 8,-4" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
        </g>
      );

    /* ───────── 总指挥官·铁砣（沉稳军官） ───────── */
    case 'npc-tie-tuo':
      return (
        <g>
          {/* 背景：小舰船 + 勋章星 */}
          <g transform="translate(-40,26) rotate(-8)" opacity="0.85">
            <ellipse cx="0" cy="0" rx="16" ry="6" fill={c2} />
            <path d="M-14,0 L0,-14 L14,0 Z" fill={c2} opacity="0.9" />
            <circle cx="0" cy="-5" r="3" fill={c3} />
          </g>
          <g transform="translate(38,30)">
            <path d="M0,-10 L2.6,-3 L10,-3 L4,1.5 L6.4,9 L0,4.5 L-6.4,9 L-4,1.5 L-10,-3 L-2.6,-3 Z" fill={c3} />
            <circle cx="0" cy="0" r="2.5" fill="#fff" />
          </g>
          {/* 披风 */}
          <path d="M-32,58 Q-46,18 -28,-10 Q0,-26 28,-10 Q46,18 32,58 Z" fill="#2b3560" opacity="0.95" />
          {/* 军装 */}
          <path d="M-20,8 L-18,58 L18,58 L20,8 Q0,18 -20,8 Z" fill={c1} />
          <rect x="-20" y="14" width="40" height="6" fill={c2} opacity="0.7" />
          <rect x="-6" y="8" width="12" height="8" rx="1.5" fill={c3} />
          {/* 肩章 */}
          <path d="M-26,10 L-22,6 L-14,6 L-18,10 Z" fill={c3} />
          <path d="M26,10 L22,6 L14,6 L18,10 Z" fill={c3} />
          <circle cx="-20" cy="8" r="2" fill="#fff" />
          <circle cx="20" cy="8" r="2" fill="#fff" />
          {/* 方脸 + 短平发 */}
          <rect x="-17" y="-34" width="34" height="30" rx="8" fill="#ffd9b8" />
          <path d="M-18,-30 Q-20,-40 0,-42 Q20,-40 18,-30 Q10,-34 0,-34 Q-10,-34 -18,-30 Z" fill={c2} />
          {/* 军帽 */}
          <path d="M-20,-34 Q-22,-50 0,-52 Q22,-50 20,-34 Q12,-40 0,-40 Q-12,-40 -20,-34 Z" fill={c1} />
          <rect x="-22" y="-38" width="44" height="5" rx="2.5" fill={c2} />
          <path d="M0,-46 L1.6,-42.5 L5,-42.4 L2.4,-40.3 L3.3,-36.7 L0,-38.5 L-3.3,-36.7 L-2.4,-40.3 L-5,-42.4 L-1.6,-42.5 Z" fill={c3} />
          {/* 浓直眉 + 坚毅眼 */}
          <rect x="-13" y="-22" width="9" height="2.6" rx="1.3" fill="#1a1535" />
          <rect x="4" y="-22" width="9" height="2.6" rx="1.3" fill="#1a1535" />
          <ellipse cx="-8.5" cy="-16" rx="3.4" ry="3.8" fill="#1a1535" />
          <ellipse cx="8.5" cy="-16" rx="3.4" ry="3.8" fill="#1a1535" />
          <circle className="noink" cx="-9.5" cy="-17.5" r="1.1" fill="#fff" />
          <circle className="noink" cx="9.5" cy="-17.5" r="1.1" fill="#fff" />
          {/* 坚毅下巴 + 微抿嘴 */}
          <path d="M-6,-8 L0,-6.5 L6,-8" fill="none" stroke="#c07a6a" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M-8,-2 Q0,2 8,-2 L6,6 Q0,8 -6,6 Z" fill="#e8b48a" opacity="0.5" />
        </g>
      );

    /* ───────── 补给站老板·铛铛（活泼商人） ───────── */
    case 'npc-dang-dang':
      return (
        <g>
          {/* 背景：小货架 + 星星货币 */}
          <g transform="translate(-40,18)">
            <rect x="0" y="0" width="22" height="26" rx="2" fill={c2} opacity="0.7" />
            <rect x="2" y="4" width="18" height="5" fill={c3} opacity="0.8" />
            <rect x="2" y="13" width="18" height="5" fill={c3} opacity="0.8" />
            <circle cx="6" cy="8" r="2" fill={c1} />
            <circle cx="13" cy="8" r="2" fill={rc} />
          </g>
          <g transform="translate(40,12)">
            <circle cx="0" cy="0" r="6" fill={c3} />
            <text x="-2.5" y="2.5" fontSize="8" fill={c1}>★</text>
          </g>
          {/* 围裙身影 */}
          <path d="M-26,58 Q-38,26 -24,4 Q0,-12 24,4 Q38,26 26,58 Z" fill={c2} opacity="0.6" />
          {/* 衣服 + 围裙 */}
          <path d="M-18,10 L-16,58 L16,58 L18,10 Q0,18 -18,10 Z" fill={c1} />
          <path d="M-14,18 L-12,58 L12,58 L14,18 Q0,26 -14,18 Z" fill="#fff" opacity="0.92" />
          <rect x="-9" y="30" width="18" height="7" rx="2" fill={c3} />
          {/* 头巾扎发 */}
          <ellipse cx="0" cy="-14" rx="20" ry="18" fill="#ffd9b8" />
          <path d="M-20,-22 Q-24,-42 0,-46 Q24,-42 20,-22 Q10,-30 0,-30 Q-10,-30 -20,-22 Z" fill={c3} />
          <circle cx="0" cy="-38" r="4.5" fill={c2} />
          {/* 双麻花辫 */}
          <path d="M-18,-6 Q-26,4 -22,16 Q-18,22 -14,18 Q-18,10 -14,0 Z" fill={c3} />
          <path d="M18,-6 Q26,4 22,16 Q18,22 14,18 Q18,10 14,0 Z" fill={c3} />
          <circle cx="-18" cy="16" r="3.5" fill={c1} />
          <circle cx="18" cy="16" r="3.5" fill={c1} />
          {/* 大杏眼 + 弯月笑 + 露牙 */}
          <ellipse cx="-8" cy="-14" rx="4.5" ry="5.5" fill="#1a1535" />
          <ellipse cx="8" cy="-14" rx="4.5" ry="5.5" fill="#1a1535" />
          <circle className="noink" cx="-9.5" cy="-16.5" r="1.8" fill="#fff" />
          <circle className="noink" cx="9.5" cy="-16.5" r="1.8" fill="#fff" />
          <path d="M-13,-24 Q-8,-27 -4,-24" fill="none" stroke="#1a1535" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M4,-24 Q8,-27 13,-24" fill="none" stroke="#1a1535" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M-7,-6 Q0,2 7,-6 Q0,-1 -7,-6 Z" fill="#e07070" />
          <rect x="-3.5" y="-6" width="7" height="3.5" rx="1" fill="#fff" />
          <circle cx="-13" cy="-8" r="3" fill="#ffb3c8" opacity="0.8" />
          <circle cx="13" cy="-8" r="3" fill="#ffb3c8" opacity="0.8" />
          {/* 手提篮 */}
          <ellipse cx="24" cy="34" rx="14" ry="10" fill="#c98a4a" />
          <path d="M10,30 Q24,20 38,30" fill="none" stroke="#7a4a20" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="24" cy="30" rx="12" ry="5" fill="#f3d9a8" />
          <circle cx="20" cy="27" r="3.5" fill={c1} />
          <circle cx="27" cy="26" r="3.5" fill={rc} />
        </g>
      );

    /* ───────── 乐园主·泡泡（俏皮少女） ───────── */
    case 'npc-pao-pao':
      return (
        <g>
          {/* 背景：气球 + 彩灯串 */}
          <g transform="translate(-42,6)">
            <line x1="0" y1="0" x2="2" y2="26" stroke={c2} strokeWidth="1.5" />
            <ellipse cx="0" cy="-6" rx="9" ry="11" fill={c1} />
            <polygon points="0,5 -2.5,9 2.5,9" fill={c1} />
            <circle className="noink" cx="-3" cy="-9" r="2.5" fill="#fff" opacity="0.8" />
          </g>
          <path d="M-52,-6 Q0,10 52,-6" fill="none" stroke={c3} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />
          <circle cx="-30" cy="0" r="3" fill={c3} />
          <circle cx="0" cy="6" r="3" fill={c1} />
          <circle cx="30" cy="0" r="3" fill={rc} />
          {/* 粉色连衣裙 */}
          <path d="M-24,58 Q-34,24 -20,6 Q0,-6 20,6 Q34,24 24,58 Z" fill={c1} />
          <path d="M-20,34 Q0,42 20,34 L18,58 L-18,58 Z" fill={c2} opacity="0.85" />
          <path d="M-8,12 Q0,18 8,12 L6,18 Q0,22 -6,18 Z" fill={rc} opacity="0.9" />
          {/* 侧歪头圆脸 */}
          <g transform="rotate(-4 0 -14)">
            <ellipse cx="0" cy="-14" rx="20" ry="19" fill="#ffe3d0" />
            {/* 双马尾泡泡 */}
            <line x1="-18" y1="-26" x2="-26" y2="-18" stroke="#1a1535" strokeWidth="1.4" />
            <line x1="18" y1="-26" x2="26" y2="-18" stroke="#1a1535" strokeWidth="1.4" />
            <circle cx="-28" cy="-28" r="10" fill={c1} />
            <circle cx="28" cy="-28" r="10" fill={c2} />
            <circle className="noink" cx="-30" cy="-31" r="3" fill="#fff" opacity="0.8" />
            <circle className="noink" cx="30" cy="-31" r="3" fill="#fff" opacity="0.8" />
            <polygon points="-28,-38 -30,-33 -26,-33" fill={c3} />
            <polygon points="28,-38 30,-33 26,-33" fill={c3} />
            {/* 刘海 */}
            <path d="M-18,-24 Q-14,-34 0,-35 Q14,-34 18,-24 Q8,-28 0,-28 Q-8,-28 -18,-24 Z" fill={c2} />
            {/* 弯月笑眼 */}
            <path d="M-12,-14 Q-8,-18 -4,-14" fill="none" stroke="#1a1535" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M4,-14 Q8,-18 12,-14" fill="none" stroke="#1a1535" strokeWidth="1.8" strokeLinecap="round" />
            {/* 俏皮张嘴笑 */}
            <path d="M-7,-7 Q0,1 7,-7 Q0,-2 -7,-7 Z" fill="#e07070" />
            <rect x="-3" y="-7" width="6" height="3" rx="1" fill="#fff" />
            <circle cx="-13" cy="-8" r="3.5" fill="#ffb3c8" opacity="0.85" />
            <circle cx="13" cy="-8" r="3.5" fill="#ffb3c8" opacity="0.85" />
          </g>
          {/* 手举小彩球 */}
          <circle cx="30" cy="18" r="7" fill={rc} />
          <path d="M24,18 L30,10 L36,18 Z" fill={c3} />
        </g>
      );

    /* ───────── 守护精灵·小卷（可爱小精灵） ───────── */
    case 'npc-xiao-juan':
      return (
        <g>
          {/* 背景：大星星 + 任务路线点 */}
          <g transform="translate(-38,-4) rotate(-10)">
            <path d="M0,-12 L3.4,-3.6 L13,-3.4 L5.4,2.4 L8,11.6 L0,6.4 L-8,11.6 L-5.4,2.4 L-13,-3.4 L-3.4,-3.6 Z" fill={c3} />
            <circle className="noink" cx="0" cy="0" r="2.5" fill="#fff" opacity="0.8" />
          </g>
          <path d="M-30,30 Q0,46 30,30" fill="none" stroke={c2} strokeWidth="1.6" strokeDasharray="3 5" opacity="0.6" />
          <circle cx="-22" cy="34" r="2.5" fill={c1} />
          <circle cx="0" cy="41" r="2.5" fill={c2} />
          <circle cx="22" cy="34" r="2.5" fill={rc} />
          {/* 薄荷小裙 + 身后飘星尾 */}
          <path d="M-16,58 Q-26,30 -14,12 Q0,4 14,12 Q26,30 16,58 Z" fill={c1} />
          <path d="M-16,34 Q0,42 16,34 L14,58 L-14,58 Z" fill={c2} opacity="0.85" />
          <path d="M16,20 Q30,14 34,22 Q26,28 16,24 Z" fill={c3} opacity="0.7" />
          {/* 小巧圆头 */}
          <circle cx="0" cy="-12" r="19" fill="#ffe8d6" />
          {/* 头顶大星星发饰 */}
          <path d="M0,-38 L3.4,-27.6 L14,-27.4 L6,-20.6 L9.4,-10.4 L0,-16 L-9.4,-10.4 L-6,-20.6 L-14,-27.4 L-3.4,-27.6 Z" fill={c3} />
          <path d="M0,-33 L1.6,-28.5 L6,-28.4 L2.6,-25.5 L3.6,-20.8 L0,-23 L-3.6,-20.8 L-2.6,-25.5 L-6,-28.4 L-1.6,-28.5 Z" fill="#fff" opacity="0.9" />
          {/* 刘海 */}
          <path d="M-17,-20 Q-14,-32 0,-34 Q14,-32 17,-20 Q8,-26 0,-26 Q-8,-26 -17,-20 Z" fill={c1} />
          {/* 超大圆眼 + 双眼高光 */}
          <circle cx="-8" cy="-12" r="6" fill="#1a1535" />
          <circle cx="8" cy="-12" r="6" fill="#1a1535" />
          <circle className="noink" cx="-9.5" cy="-14.5" r="2.4" fill="#fff" />
          <circle className="noink" cx="9.5" cy="-14.5" r="2.4" fill="#fff" />
          <circle className="noink" cx="-6" cy="-10" r="1.1" fill="#fff" opacity="0.85" />
          <circle className="noink" cx="10" cy="-10" r="1.1" fill="#fff" opacity="0.85" />
          {/* 星星耳环 */}
          <path d="M-18,-8 L-16.6,-4.6 L-13,-4.4 L-15.6,-2 L-14.6,1.6 L-18,-0.6 L-21.4,1.6 L-20.4,-2 L-23,-4.4 L-19.4,-4.6 Z" fill={rc} />
          <path d="M18,-8 L16.6,-4.6 L13,-4.4 L15.6,-2 L14.6,1.6 L18,-0.6 L21.4,1.6 L20.4,-2 L23,-4.4 L19.4,-4.6 Z" fill={rc} />
          {/* 可爱张嘴笑 */}
          <path d="M-6,-3 Q0,4 6,-3 Q0,0 -6,-3 Z" fill="#e07070" />
          <rect x="-2.5" y="-3" width="5" height="2.8" rx="1" fill="#fff" />
          <circle cx="-14" cy="-4" r="3" fill="#ffb3c8" opacity="0.85" />
          <circle cx="14" cy="-4" r="3" fill="#ffb3c8" opacity="0.85" />
        </g>
      );

    default:
      return null;
  }
}

/** 乌乌怪专属立绘（怪物形态，按卡牌 id 定制） */
function MonsterPortrait({ card, idBase }: { card: StarCard; idBase: string }) {
  const [c1, c2, c3] = card.palette;
  const rc = RARITY_COLOR[card.rarity];
  const glow = `url(#glow-${idBase})`;

  switch (card.id) {
    /* ═════ 迷雾乌：雾团 + 滴珠 + 小乌云 ═════ */
    case 'mon-mist':
      return (
        <g>
          <ellipse className="noink" cx="0" cy="56" rx="52" ry="12" fill={c1} opacity="0.25" />
          {/* 雾团主体：多层重叠圆 */}
          <path
            d="M-44,20 Q-52,-6 -32,-18 Q-28,-40 -2,-42 Q26,-42 34,-20 Q52,-10 44,16 Q40,36 20,42 Q-2,50 -22,42 Q-42,36 -44,20 Z"
            fill={c1}
          />
          <path d="M-30,-6 Q-20,-20 -4,-20 Q10,-20 18,-8 Q10,4 -6,4 Q-22,4 -30,-6 Z" fill={c2} opacity="0.85" />
          <path d="M8,18 Q20,14 26,22 Q30,32 18,34 Q8,32 8,18 Z" fill={c2} opacity="0.6" />
          {/* 滴落水珠 */}
          <ellipse cx="-46" cy="30" rx="4" ry="6" fill={c2} />
          <ellipse cx="46" cy="34" rx="3.4" ry="5" fill={c2} />
          <ellipse cx="-38" cy="48" rx="2.6" ry="4" fill={c2} />
          {/* 头顶小乌云 */}
          <path d="M-16,-52 Q-16,-62 -6,-62 Q0,-68 8,-62 Q18,-62 18,-54 Q18,-48 8,-48 L-6,-48 Q-16,-48 -16,-52 Z" fill="#6f68a8" />
          <path d="M-8,-46 L-6,-38 M2,-46 L4,-38 M-2,-46 L-1,-39" fill="none" stroke={c3} strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
          {/* 一大小困倦眼 */}
          <ellipse cx="-12" cy="-6" rx="9" ry="9" fill="#fff" />
          <ellipse cx="14" cy="-4" rx="6" ry="6" fill="#fff" />
          <ellipse cx="-12" cy="-6" rx="5" ry="5.4" fill="#312a5c" />
          <ellipse cx="14" cy="-4" rx="3.4" ry="3.8" fill="#312a5c" />
          <circle className="noink" cx="-13.6" cy="-8" r="1.6" fill="#fff" />
          <circle className="noink" cx="12.8" cy="-5.6" r="1.1" fill="#fff" />
          {/* 困倦上眼睑 */}
          <path d="M-21,-10 Q-12,-14 -3,-10" fill={c1} stroke="#241a45" strokeWidth="2" strokeLinejoin="round" />
          <path d="M8,-8 Q14,-11 20,-8" fill={c1} stroke="#241a45" strokeWidth="2" strokeLinejoin="round" />
          {/* 下撇嘴 */}
          <path d="M-8,10 Q0,5 8,10" fill="none" stroke="#241a45" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      );

    /* ═════ 拖延乌：树懒抱枕 + 停摆闹钟 + “待会儿” ═════ */
    case 'mon-dawdle':
      return (
        <g>
          <ellipse className="noink" cx="0" cy="56" rx="50" ry="12" fill={c1} opacity="0.25" />
          {/* 抱枕身躯 */}
          <path d="M-36,50 Q-46,26 -34,4 Q-22,-12 0,-12 Q22,-12 34,4 Q46,26 36,50 Q20,60 0,60 Q-20,60 -36,50 Z" fill={c1} />
          <path d="M-26,44 Q-34,26 -24,10 Q-12,0 0,0 Q12,0 24,10 Q34,26 26,44 Q14,52 0,52 Q-14,52 -26,44 Z" fill={c2} />
          {/* 肚皮“待会儿” */}
          <rect x="-18" y="22" width="36" height="14" rx="7" fill={c3} opacity="0.9" />
          <text x="0" y="32.4" textAnchor="middle" fontSize="9" fontWeight="800" fill="#5b5478">待会儿</text>
          {/* 头（睡脸） */}
          <ellipse cx="0" cy="-26" rx="26" ry="22" fill={c2} />
          {/* 树懒面纹 */}
          <path d="M-16,-30 Q0,-22 16,-30" fill="none" stroke="#7b8296" strokeWidth="1.6" opacity="0.8" />
          {/* 闭眼打呼 */}
          <path d="M-16,-26 Q-10,-20 -4,-26" fill="none" stroke="#241a45" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M4,-26 Q10,-20 16,-26" fill="none" stroke="#241a45" strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="-16" cy="-20" rx="4" ry="2.4" fill="#f0b3b3" opacity="0.55" />
          <ellipse cx="16" cy="-20" rx="4" ry="2.4" fill="#f0b3b3" opacity="0.55" />
          {/* 鼾声泡泡 */}
          <circle cx="24" cy="-40" r="3" fill="none" stroke={c3} strokeWidth="1.4" />
          <circle cx="31" cy="-48" r="4.2" fill="none" stroke={c3} strokeWidth="1.4" />
          {/* 背上停摆闹钟 */}
          <g transform="translate(-38,-14) rotate(-14)">
            <circle cx="0" cy="0" r="13" fill="#f4f6fb" />
            <circle cx="0" cy="0" r="10" fill="#e6eaf2" />
            <path d="M-6,-14 L-3,-19 L0,-14 Z M6,-14 L3,-19 L0,-14 Z" fill="#9aa0b0" />
            <path d="M0,0 L0,-6 M0,0 L5,2" stroke="#3a3560" strokeWidth="2" strokeLinecap="round" />
            {/* 被按停的手指 */}
            <path d="M9,-4 Q14,-2 12,3" fill="none" stroke="#241a45" strokeWidth="2" strokeLinecap="round" />
          </g>
          {/* 软趴趴四腿 */}
          <path d="M-22,56 Q-30,62 -22,66" fill="none" stroke="#241a45" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M22,56 Q30,62 22,66" fill="none" stroke="#241a45" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      );

    /* ═════ 马虎乌：三只眼 + 错答案贴纸 + 问号尾巴 ═════ */
    case 'mon-sloppy':
      return (
        <g>
          <ellipse className="noink" cx="0" cy="56" rx="48" ry="12" fill={c1} opacity="0.25" />
          {/* 身体 */}
          <ellipse cx="0" cy="16" rx="34" ry="34" fill={c1} />
          {/* 错答案贴纸（斜贴） */}
          <g transform="translate(-22,20) rotate(-14)">
            <rect x="-13" y="-8" width="26" height="16" rx="2" fill="#fffdf7" />
            <path d="M-9,-2 L9,-2 M-9,3 L5,3" stroke="#c96a66" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M6,-4 L10,1" stroke="#c96a66" strokeWidth="1.8" strokeLinecap="round" />
          </g>
          <g transform="translate(20,26) rotate(12)">
            <rect x="-12" y="-7" width="24" height="14" rx="2" fill="#fffdf7" />
            <path d="M-8,-1 L8,-1 M-8,3 L2,3" stroke="#8f86c9" strokeWidth="1.6" strokeLinecap="round" />
          </g>
          {/* 橡皮屑 */}
          <circle cx="14" cy="4" r="2.4" fill="#f6c9c2" />
          <circle cx="-14" cy="42" r="2" fill="#f6c9c2" />
          <circle cx="18" cy="46" r="1.8" fill="#f6c9c2" />
          {/* 三只眼各看一边 */}
          <ellipse cx="-13" cy="-8" rx="8" ry="8" fill="#fff" />
          <ellipse cx="13" cy="-10" rx="7" ry="7" fill="#fff" />
          <ellipse cx="0" cy="-30" rx="6" ry="6" fill="#fff" />
          <ellipse cx="-15" cy="-8" rx="4" ry="4.4" fill="#4a2f2c" />
          <ellipse cx="15" cy="-10" rx="3.4" ry="3.8" fill="#4a2f2c" />
          <ellipse cx="-2" cy="-30" rx="3" ry="3.4" fill="#4a2f2c" />
          <circle className="noink" cx="-16.4" cy="-9.6" r="1.4" fill="#fff" />
          <circle className="noink" cx="13.8" cy="-11.4" r="1.2" fill="#fff" />
          <circle className="noink" cx="-3.2" cy="-31.2" r="1" fill="#fff" />
          {/* 坏笑嘴 */}
          <path d="M-10,20 Q0,28 10,20" fill="none" stroke="#241a45" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M-4,22 L-4,26 M4,22 L4,26" stroke="#241a45" strokeWidth="1.8" strokeLinecap="round" />
          {/* 问号尾巴 + 歪蝴蝶结 */}
          <path d="M32,30 Q44,26 42,14 Q40,6 32,8 Q26,10 28,16" fill="none" stroke="#241a45" strokeWidth="3" strokeLinecap="round" />
          <circle cx="28.6" cy="20.4" r="2.2" fill="#241a45" />
          <path d="M40,34 L46,28 L50,34 L44,38 Z" fill={rc} />
          <path d="M40,34 L34,30 L32,36 L38,38 Z" fill={rc} opacity="0.85" />
          {/* 细长乱擦的手 */}
          <path d="M-30,26 Q-42,30 -38,40" fill="none" stroke="#241a45" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M30,10 Q42,4 44,12" fill="none" stroke="#241a45" strokeWidth="2.6" strokeLinecap="round" />
        </g>
      );

    /* ═════ 分心乌：弹跳球 + 多手多脚 + 玩具 + 风车 ═════ */
    case 'mon-fidget':
      return (
        <g>
          <ellipse className="noink" cx="0" cy="56" rx="48" ry="12" fill={c1} opacity="0.25" />
          {/* 小手小脚（先画，压在下层） */}
          {[
            [-34, 6, -44, -6], [34, 6, 44, -6], [-38, 24, -52, 20], [38, 24, 52, 20],
            [-30, 44, -42, 52], [30, 44, 42, 52], [-14, 56, -18, 68], [14, 56, 18, 68],
            [-20, -10, -34, -22], [20, -10, 34, -22], [0, 58, 2, 70], [-8, -22, -14, -34],
          ].map(([x1, y1, x2, y2], i) => (
            <g key={i}>
              <path d={`M${x1},${y1} Q${(x1 + x2) / 2},${(y1 + y2) / 2} ${x2},${y2}`} fill="none" stroke="#241a45" strokeWidth="2.6" strokeLinecap="round" />
              <circle cx={x2} cy={y2} r="3.2" fill={c2} />
            </g>
          ))}
          {/* 弹跳球身 */}
          <circle cx="0" cy="20" r="36" fill={c1} />
          <circle className="noink" cx="-12" cy="6" r="14" fill="#fff" opacity="0.22" />
          {/* 手里玩具：陀螺 / 泡泡 / 小喇叭 */}
          <g transform="translate(-52,20)">
            <path d="M0,-8 L6,6 L-6,6 Z" fill="#f0f4ff" />
            <path d="M0,6 L2,12 L-2,12 Z" fill="#8f86c9" />
            <path d="M-6,6 L6,6" stroke="#241a45" strokeWidth="2" strokeLinecap="round" />
          </g>
          <g transform="translate(52,20)">
            <circle cx="0" cy="0" r="6" fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.9" />
            <circle cx="4" cy="-4" r="3" fill="none" stroke="#fff" strokeWidth="1.4" opacity="0.8" />
          </g>
          <g transform="translate(18,68)">
            <path d="M-6,0 L6,0 L10,-8 L-2,-8 Z" fill="#ffe0a8" />
            <path d="M10,-8 L16,-11" stroke="#241a45" strokeWidth="2" strokeLinecap="round" />
          </g>
          {/* 大眼睛（圆睁兴奋） */}
          <ellipse cx="-12" cy="14" rx="9" ry="9.5" fill="#fff" />
          <ellipse cx="12" cy="14" rx="9" ry="9.5" fill="#fff" />
          <ellipse cx="-12" cy="14" rx="5.4" ry="5.8" fill="#4a3208" />
          <ellipse cx="12" cy="14" rx="5.4" ry="5.8" fill="#4a3208" />
          <circle className="noink" cx="-13.8" cy="12" r="1.9" fill="#fff" />
          <circle className="noink" cx="10.2" cy="12" r="1.9" fill="#fff" />
          {/* 兴奋大笑 */}
          <path d="M-9,30 Q0,38 9,30 Q0,34 -9,30 Z" fill="#a8452f" />
          <path d="M-6,31 L6,31 L5,34 L-5,34 Z" fill="#fff" />
          {/* 头顶彩色风车 */}
          <g transform="translate(0,-26)">
            <path d="M0,0 L0,-10" stroke="#241a45" strokeWidth="2.4" strokeLinecap="round" />
            <g transform="translate(0,-14)">
              <path d="M0,0 L16,-8 L14,4 Z" fill="#ff9d9d" />
              <path d="M0,0 L16,8 L14,-4 Z" fill="#8fe8da" />
              <path d="M0,0 L-16,8 L-14,-4 Z" fill="#ffd77a" />
              <path d="M0,0 L-16,-8 L-14,4 Z" fill="#b3d6ff" />
              <circle cx="0" cy="0" r="3.4" fill="#fff" />
            </g>
          </g>
        </g>
      );

    /* ═════ 乌乌王：黑毛绒 + 破王冠 + 缝线 + 星形旧伤 ═════ */
    case 'mon-quitter':
      return (
        <g>
          <ellipse className="noink" cx="0" cy="58" rx="58" ry="13" fill={c3} opacity="0.25" filter={glow} />
          {/* 巨大毛绒身躯（波浪毛边） */}
          <path
            d="M-50,52 Q-58,26 -46,4 Q-40,-12 -28,-16 Q-30,-30 -14,-34 Q0,-44 14,-34 Q30,-30 28,-16 Q40,-12 46,4 Q58,26 50,52 Q40,62 26,58 Q14,66 0,62 Q-14,66 -26,58 Q-40,62 -50,52 Z"
            fill={c1}
          />
          <path className="noink" d="M-40,40 Q-34,10 -18,-6 Q0,-16 18,-6 Q34,10 40,40 Q20,52 0,52 Q-20,52 -40,40 Z" fill={c2} />
          {/* 拼缝线 */}
          <path d="M-30,-6 Q0,-18 30,-6 M-36,18 Q0,6 36,18 M-22,42 Q0,34 22,42" fill="none" stroke="#8f7bf0" strokeWidth="1.6" strokeDasharray="4 3" opacity="0.75" />
          {/* 幽紫缝隙光 */}
          <path className="noink" d="M-30,-6 Q0,-18 30,-6" fill="none" stroke={c3} strokeWidth="3" opacity="0.35" filter={glow} />
          {/* 胸口碎裂星形旧伤 */}
          <g transform="translate(0,20)">
            <path d="M0,-16 L4.6,-5.2 L18,-4.6 L7.6,3.4 L11.4,16.4 L0,9.2 L-11.4,16.4 L-7.6,3.4 L-18,-4.6 L-4.6,-5.2 Z" fill={c3} filter={glow} />
            <path className="noink" d="M0,-11 L2.6,-3 L9,-2.6 L4,2 L6,9 L0,5 L-6,9 L-4,2 L-9,-2.6 L-2.6,-3 Z" fill="#ffffff" opacity="0.9" />
            <path d="M-4,-2 L2,4 L-2,8" fill="none" stroke="#241a45" strokeWidth="1.6" opacity="0.8" />
          </g>
          {/* 头 */}
          <path d="M-24,-34 Q-26,-52 0,-54 Q26,-52 24,-34 Q14,-26 0,-26 Q-14,-26 -24,-34 Z" fill={c1} />
          <path className="noink" d="M-18,-38 Q0,-46 18,-38 Q0,-32 -18,-38 Z" fill={c2} opacity="0.7" />
          {/* 破王冠（缺角） */}
          <path d="M-22,-52 L-18,-66 L-10,-56 L-2,-70 L6,-56 L14,-66 L20,-52 Q0,-46 -22,-52 Z" fill={`url(#metal-${idBase})`} />
          <path d="M13,-62 L20,-52 L8,-55 Z" fill="none" stroke="#241a45" strokeWidth="1.4" />
          <circle className="noink" cx="-2" cy="-58" r="2.2" fill="#ffe9a8" filter={glow} />
          {/* 阴森发光眼 */}
          <ellipse cx="-10" cy="-40" rx="6.4" ry="5.6" fill="#0f0a24" />
          <ellipse cx="10" cy="-40" rx="6.4" ry="5.6" fill="#0f0a24" />
          <ellipse className="noink" cx="-10" cy="-40" rx="3.6" ry="3.2" fill={c3} filter={glow} />
          <ellipse className="noink" cx="10" cy="-40" rx="3.6" ry="3.2" fill={c3} filter={glow} />
          <circle className="noink" cx="-11" cy="-41" r="1.2" fill="#fff" />
          <circle className="noink" cx="9" cy="-41" r="1.2" fill="#fff" />
          {/* 低沉咧嘴 */}
          <path d="M-12,-30 Q0,-22 12,-30 Q0,-26 -12,-30 Z" fill="#0f0a24" />
          <path d="M-8,-29 L-6,-25 M-3,-28 L-2,-24 M2,-28 L3,-24 M7,-29 L6,-25" stroke="#f1efff" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      );

    default:
      return null;
  }
}

function FigureArt({ card }: { card: StarCard }) {
  const [c1, c2, c3] = card.palette;
  const rc = RARITY_COLOR[card.rarity];
  const isSP = card.rarity === 'SP';

  return (
    <g>
      {/* 光环/披风 */}
      <ellipse className="noink" cx="0" cy="55" rx="55" ry="14" fill={c1} opacity="0.25" />
      <path d="M-35,55 Q-45,10 -25,-20 Q0,-35 25,-20 Q45,10 35,55 Z" fill={c2} opacity="0.35" />

      {/* 身体 */}
      <path d="M-22,20 L-18,55 L18,55 L22,20 Z" fill={c1} />
      <path d="M-22,20 Q-26,-5 -16,-10 L16,-10 Q26,-5 22,20 Z" fill={c3} opacity="0.9" />

      {/* 头 */}
      <circle cx="0" cy="-22" r="20" fill="#ffe8d6" />
      <ellipse className="noink" cx="0" cy="-22" rx="21" ry="20" fill="url(#hair)" opacity="0.15" />
      <defs>
        <linearGradient id="hair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>

      {/* 头发 */}
      <path d="M-22,-28 Q-26,-45 0,-48 Q26,-45 22,-28 Q24,-15 14,-12 Q0,-16 -14,-12 Q-24,-15 -22,-28" fill={c1} />
      <path d="M-18,-25 Q-10,-38 0,-36 Q10,-38 18,-25" fill={c2} opacity="0.5" />

      {/* 眼睛 */}
      <ellipse cx="-7" cy="-20" rx="4" ry="5" fill="#1a1535" />
      <ellipse cx="7" cy="-20" rx="4" ry="5" fill="#1a1535" />
      <circle className="noink" cx="-6" cy="-22" r="1.5" fill="#fff" />
      <circle className="noink" cx="8" cy="-22" r="1.5" fill="#fff" />
      <path d="M-10,-30 Q0,-34 10,-30" fill="none" stroke="#1a1535" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M-4,-12 Q0,-10 4,-12" fill="none" stroke="#d48c8c" strokeWidth="1.5" strokeLinecap="round" />

      {/* 配饰：按套系 */}
      {card.setId === 'npc' && npcDecor(card, c1, c2, c3, rc)}
      {card.setId === 'ship' && (
        <g>
          {/* 飞行员护目镜 */}
          <circle cx="-7" cy="-22" r="6" fill="none" stroke={c3} strokeWidth="1.5" />
          <circle cx="7" cy="-22" r="6" fill="none" stroke={c3} strokeWidth="1.5" />
          <line x1="-1" y1="-22" x2="1" y2="-22" stroke={c3} strokeWidth="1.5" />
        </g>
      )}
      {card.setId === 'game' && (
        <g>
          {/* 庆典丝带 */}
          <path d="M-28,-35 Q0,-55 28,-35" fill="none" stroke={rc} strokeWidth="2" />
          <polygon points="-30,-35 -34,-45 -26,-42" fill={c3} />
          <polygon points="30,-35 34,-45 26,-42" fill={c3} />
        </g>
      )}
      {card.setId === 'mystery' && (
        <g>
          {/* 兜帽 */}
          <path d="M-24,-28 Q0,-60 24,-28 L20,-10 Q0,-20 -20,-10 Z" fill={c2} opacity="0.7" />
          <circle cx="0" cy="-12" r="5" fill={rc} opacity="0.8" />
        </g>
      )}
      {card.setId === 'monster' && (
        <g>
          {/* 行星环头饰 */}
          <ellipse cx="0" cy="-28" rx="26" ry="6" fill="none" stroke={c3} strokeWidth="2" transform="rotate(-15 0 -28)" />
          <circle cx="20" cy="-30" r="3" fill={rc} />
        </g>
      )}

      {/* SP 额外光翼 */}
      {isSP && (
        <g opacity="0.6">
          <path d="M-28,10 Q-55,-10 -40,-40 Q-25,-20 -20,5 Z" fill={c3} />
          <path d="M28,10 Q55,-10 40,-40 Q25,-20 20,5 Z" fill={c3} />
        </g>
      )}
    </g>
  );
}

function ItemArt({ card }: { card: StarCard }) {
  const [c1, c2, c3] = card.palette;
  const rc = RARITY_COLOR[card.rarity];

  if (card.setId === 'ship') {
    return (
      <g>
        {/* 船体 */}
        <path d="M-40,10 Q-45,-15 -20,-25 L20,-25 Q45,-15 40,10 Q30,25 0,28 Q-30,25 -40,10" fill={c1} />
        <path d="M-20,-25 L-10,-45 L10,-45 L20,-25 Z" fill={c3} />
        <circle cx="0" cy="-8" r="10" fill={c2} opacity="0.7" />
        <circle cx="0" cy="-8" r="6" fill="#fff" opacity="0.9" />
        {/* 引擎光 */}
        <ellipse className="noink" cx="-25" cy="18" rx="6" ry="10" fill={rc} opacity="0.6" />
        <ellipse className="noink" cx="25" cy="18" rx="6" ry="10" fill={rc} opacity="0.6" />
        <ellipse className="noink" cx="0" cy="32" rx="14" ry="5" fill={rc} opacity="0.3" />
      </g>
    );
  }

  if (card.setId === 'mystery') {
    return (
      <g>
        {/* 底座/悬浮物 */}
        <ellipse className="noink" cx="0" cy="45" rx="35" ry="8" fill={c1} opacity="0.3" />
        {card.no === 1 && (
          <>
            {/* 沙漏 */}
            <path d="M-18,-35 L18,-35 L0,-5 Z" fill={c2} opacity="0.8" />
            <path d="M-18,35 L18,35 L0,5 Z" fill={c2} opacity="0.8" />
            <rect x="-20" y="-38" width="40" height="4" rx="2" fill={c3} />
            <rect x="-20" y="34" width="40" height="4" rx="2" fill={c3} />
            <circle cx="0" cy="0" r="3" fill={rc} />
          </>
        )}
        {card.no === 2 && (
          <>
            {/* 罗盘 */}
            <circle cx="0" cy="0" r="32" fill={c1} />
            <circle cx="0" cy="0" r="28" fill="none" stroke={c3} strokeWidth="2" />
            <polygon points="0,-22 5,0 0,22 -5,0" fill={rc} />
            <polygon points="-18,0 0,-5 18,0 0,5" fill={c3} opacity="0.6" />
            <circle cx="0" cy="0" r="4" fill={c3} />
          </>
        )}
        {card.no === 3 && (
          <>
            {/* 虚空镜片 */}
            <circle cx="0" cy="0" r="30" fill="#0e0a2c" stroke={c3} strokeWidth="2" />
            <circle cx="0" cy="0" r="24" fill={c2} opacity="0.2" />
            <path d="M-16,-8 Q0,-20 16,-8 Q8,8 0,18 Q-8,8 -16,-8" fill={c1} opacity="0.6" />
            <circle cx="0" cy="0" r="5" fill={rc} />
          </>
        )}
        {card.no === 4 && (
          <>
            {/* 创世残页 */}
            <rect x="-22" y="-32" width="44" height="64" rx="2" fill={c2} opacity="0.85" />
            <rect x="-18" y="-28" width="36" height="56" fill="#0e0a2c" opacity="0.7" />
            <line x1="-12" y1="-18" x2="12" y2="-18" stroke={c3} strokeWidth="1" />
            <line x1="-12" y1="-8" x2="10" y2="-8" stroke={c3} strokeWidth="1" />
            <line x1="-12" y1="2" x2="14" y2="2" stroke={c3} strokeWidth="1" />
            <line x1="-12" y1="12" x2="8" y2="12" stroke={c3} strokeWidth="1" />
            <circle cx="12" cy="-26" r="4" fill={rc} />
          </>
        )}
      </g>
    );
  }

  return null;
}

function SceneArt({ card }: { card: StarCard }) {
  const [c1, c2, c3] = card.palette;
  const rc = RARITY_COLOR[card.rarity];

  if (card.setId === 'game') {
    return (
      <g>
        {card.no === 1 && (
          <>
            {/* 发射台 / 火箭升空 */}
            <path d="M-10,40 L-6,-20 Q0,-40 6,-20 L10,40 Z" fill={c1} />
            <ellipse cx="0" cy="-20" rx="8" ry="12" fill={c3} />
            <path d="M-18,40 L-14,15 L14,15 L18,40 Z" fill={c2} opacity="0.5" />
            <ellipse className="noink" cx="0" cy="55" rx="20" ry="6" fill={rc} opacity="0.4" />
            {[...Array(6)].map((_, i) => (
              <circle className="noink" key={i} cx={-20 + i * 8} cy={48 + (i % 2) * 6} r="2" fill={c3} opacity="0.7" />
            ))}
          </>
        )}
        {card.no === 2 && (
          <>
            {/* 乌乌怪来袭 */}
            {[...Array(5)].map((_, i) => (
              <g key={i} transform={`translate(${-30 + i * 15}, ${-10 + (i % 2) * 10})`}>
                <circle r="10" fill="#2a2448" />
                <circle className="noink" cx="-3" cy="-2" r="2.5" fill={rc} />
                <circle className="noink" cx="3" cy="-2" r="2.5" fill={rc} />
              </g>
            ))}
            <path d="M-40,30 L-25,20 L-10,30 L5,18 L20,30" fill="none" stroke={c3} strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {card.no === 3 && (
          <>
            {/* 星门 */}
            <ellipse cx="0" cy="0" rx="38" ry="48" fill="none" stroke={c1} strokeWidth="4" />
            <ellipse cx="0" cy="0" rx="30" ry="38" fill="none" stroke={c3} strokeWidth="2" />
            <ellipse cx="0" cy="0" rx="18" ry="24" fill={c2} opacity="0.3" />
            <path d="M-8,-50 L0,-70 L8,-50 Z" fill={rc} />
            <path d="M-8,50 L0,70 L8,50 Z" fill={rc} />
          </>
        )}
        {card.no === 4 && (
          <>
            {/* 千星合唱 */}
            {[...Array(12)].map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const r = 34;
              return <circle className="noink" key={i} cx={Math.cos(angle) * r} cy={Math.sin(angle) * r} r="3" fill={c3} />;
            })}
            <circle cx="0" cy="0" r="14" fill={rc} opacity="0.8" />
            <circle cx="0" cy="0" r="8" fill="#fff" opacity="0.9" />
          </>
        )}
      </g>
    );
  }

  if (card.setId === 'monster') {
    return (
      <g>
        {card.no === 1 && (
          <>
            {/* 小行星 */}
            <circle cx="0" cy="5" r="32" fill={c1} />
            <path d="M-22,-5 Q-10,-20 5,-12 Q20,-5 18,12 Q5,22 -12,18 Q-26,10 -22,-5" fill={c2} opacity="0.5" />
            <circle cx="-10" cy="-5" r="5" fill={c3} opacity="0.5" />
            <circle cx="12" cy="8" r="3" fill={c3} opacity="0.4" />
          </>
        )}
        {card.no === 2 && (
          <>
            {/* 花园星 + 双环 */}
            <circle cx="0" cy="0" r="28" fill={c1} />
            <ellipse cx="0" cy="0" rx="44" ry="10" fill="none" stroke={c2} strokeWidth="2" transform="rotate(-20 0 0)" />
            <ellipse cx="0" cy="0" rx="52" ry="14" fill="none" stroke={c3} strokeWidth="1.5" transform="rotate(15 0 0)" />
            {[...Array(5)].map((_, i) => (
              <circle key={i} cx={-15 + i * 8} cy={8 + (i % 2) * -10} r="3" fill={rc} />
            ))}
          </>
        )}
        {card.no === 3 && (
          <>
            {/* 沉默星云 */}
            <circle cx="0" cy="0" r="36" fill="#1a1535" opacity="0.9" />
            <path d="M-30,-10 Q-10,-30 10,-10 Q30,10 10,30 Q-10,50 -30,30 Q-50,10 -30,-10" fill={c1} opacity="0.4" />
            <path d="M-20,5 Q0,-15 20,5 Q10,25 0,20 Q-10,25 -20,5" fill={rc} opacity="0.35" />
            {[...Array(8)].map((_, i) => (
              <circle key={i} cx={-25 + (i * 13) % 55} cy={-20 + (i * 17) % 50} r="1.5" fill={c3} opacity="0.6" />
            ))}
          </>
        )}
        {card.no === 4 && (
          <>
            {/* 光年树 */}
            <path d="M-4,45 L-6,0 Q-6,-40 0,-60 Q6,-40 6,0 L4,45 Z" fill={c1} />
            <ellipse cx="0" cy="-55" rx="28" ry="18" fill={c2} opacity="0.7" />
            <ellipse cx="-18" cy="-30" rx="10" ry="6" fill={c3} opacity="0.6" transform="rotate(-20 -18 -30)" />
            <ellipse cx="18" cy="-35" rx="10" ry="6" fill={c3} opacity="0.6" transform="rotate(20 18 -35)" />
            <circle cx="0" cy="-55" r="5" fill={rc} />
          </>
        )}
      </g>
    );
  }

  return null;
}
