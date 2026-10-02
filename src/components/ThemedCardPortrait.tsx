import { useId } from 'react';
import { useI18n } from '../i18n';
import { CARD_SETS, type StarCard } from '../content/starCards';
import CardArtwork from './CardArtwork';
import { CARD_THEMES, type FramedCardSet } from './cardThemes';
import './themed-cards.css';

const SQUARE = 'M3 3H197V277H3Z';
const CUT = 'M18 3H182L197 18V262L182 277H18L3 262V18Z';
const SOFT = 'M17 3H183Q197 3 197 17V263Q197 277 183 277H17Q3 277 3 263V17Q3 3 17 3Z';
const CLOUD = 'M20 4Q30 0 40 5Q60 0 80 5Q100 0 120 5Q140 0 160 5Q180 0 192 12Q200 24 194 38Q200 70 195 100Q200 130 195 160Q200 200 195 230Q200 262 185 274Q170 280 150 275Q125 280 100 275Q75 280 50 275Q25 280 10 268Q0 250 5 230Q0 200 5 160Q0 130 5 100Q0 70 5 38Q0 14 20 4Z';

export default function ThemedCardPortrait({ card, size, className }: { card: StarCard; size: number; className: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const zh = useI18n().lang !== 'en';
  const setId = card.setId as FramedCardSet;
  const theme = CARD_THEMES[setId];
  const shape = setId === 'monster' ? CLOUD : setId === 'hanzi' || setId === 'game' ? SQUARE : ['brook', 'bruco', 'ship'].includes(setId) ? CUT : SOFT;
  const name = zh ? card.name.zh : card.name.en;
  const displayName = setId === 'npc' && zh ? name.split('·').slice(-1)[0].trim() : name;
  const subtitle = CARD_SETS.find((set) => set.id === setId)?.name;
  return <svg className={`ccard-portrait themed-portrait theme-${setId} ${className}`} width={size} height={Math.round(size * 1.4)} viewBox="0 0 200 280" role="img" aria-label={name}>
    <defs>
      <clipPath id={`theme-clip-${id}`}><path d={shape} /></clipPath>
      <radialGradient id={`theme-bg-${id}`} cx="42%" cy="28%" r="80%">
        <stop stopColor={setId === 'hanzi' ? '#fff8e7' : setId === 'paw-patrol' ? '#dbf1ff' : card.palette[0]} />
        <stop offset="1" stopColor={setId === 'hanzi' ? '#edddbc' : setId === 'paw-patrol' ? '#7da7e0' : theme.paper} />
      </radialGradient>
      <linearGradient id={`theme-caption-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset=".65" stopColor={theme.paper} stopOpacity="0" />
        <stop offset=".86" stopColor={theme.paper} stopOpacity=".73" />
        <stop offset="1" stopColor={theme.paper} />
      </linearGradient>
      <linearGradient id={`metal-${id}`}><stop stopColor="#ffeeb1" /><stop offset="1" stopColor="#a0783b" /></linearGradient>
      <filter id={`glow-${id}`}><feGaussianBlur stdDeviation="2" /></filter>
    </defs>
    <g clipPath={`url(#theme-clip-${id})`}>
      <rect width="200" height="280" fill={`url(#theme-bg-${id})`} />
      <ThemeScene setId={setId} accent={theme.accent} />
      <CardArtwork card={card} idBase={id} />
      {!card.hanzi && <rect width="200" height="280" fill={`url(#theme-caption-${id})`} />}
    </g>
    <path d={shape} fill="none" stroke={theme.edge} strokeWidth={setId === 'paw-patrol' ? 5 : 2.5} />
    <ThemeEdge setId={setId} edge={theme.edge} accent={theme.accent} />
    <g className="theme-card-number">
      <rect x="12" y="13" width="23" height="18" rx={setId === 'hanzi' ? 0 : 3} fill={theme.paper} fillOpacity=".88" stroke={theme.edge} strokeWidth=".6" />
      <text x="23.5" y="26" textAnchor="middle" fill={theme.ink} fontSize="9" fontWeight="700">{String(card.no).padStart(2, '0')}</text>
    </g>
    <rect x="151" y="13" width="36" height="18" rx={setId === 'hanzi' ? 0 : 3} fill={theme.paper} fillOpacity=".88" stroke={theme.edge} strokeWidth=".6" />
    <text x="169" y="26" textAnchor="middle" fill={theme.ink} fontSize="9" fontWeight="800">{card.rarity}</text>
    {!card.hanzi && <g className="theme-card-caption" fill={theme.ink}>
      <text x="100" y="245" textAnchor="middle" fontSize={zh ? displayName.length > 7 ? 15 : displayName.length > 5 ? 18 : 21 : Math.min(13, 265 / displayName.length)} fontWeight="750" fontFamily={zh ? 'STKaiti, KaiTi, serif' : 'inherit'} letterSpacing={zh ? '1' : '0'}>{displayName}</text>
      <text x="100" y="264" textAnchor="middle" fill={setId === 'paw-patrol' ? '#deeeff' : theme.accent} fontSize={zh ? 9 : 7.5} letterSpacing={zh ? '2' : '.1'}>{zh ? subtitle?.zh : subtitle?.en}</text>
    </g>}
  </svg>;
}

function ThemeScene({ setId, accent }: { setId: FramedCardSet; accent: string }) {
  if (setId === 'hanzi') return <g stroke="#b88b57" opacity=".13"><path d="M25 0V280M175 0V280" />{Array.from({ length: 13 }, (_, i) => <path key={i} d={`M0 ${i * 23}H200`} />)}</g>;
  if (setId === 'paw-patrol') return <g>
    <path d="M0 62Q28 35 52 57Q80 36 106 59Q137 35 166 58Q193 39 200 58V99H0Z" fill="#fff" opacity=".55" />
    <path d="M0 205V170H24V149H49V183H78V158H110V176H142V147H168V165H200V219Z" fill="#5894ce" opacity=".2" />
    <path d="M15 223H185" stroke="#fff" strokeWidth="3" opacity=".3" />
  </g>;
  if (setId === 'monster') return <g fill={accent} opacity=".15">
    <path d="M0 87Q25 64 43 90T93 89T145 88T200 88V130H0Z" /><path d="M0 200Q30 175 58 205T115 198T165 204T200 198V280H0Z" />
    {[15, 57, 156, 185].map((x, i) => <circle key={x} cx={x} cy={42 + i * 39} r={3 + i} />)}
  </g>;
  if (setId === 'bruco') return <g fill="none" stroke={accent} opacity=".13">
    {[70, 110, 145].map((r) => <circle key={r} cx="100" cy="136" r={r} strokeDasharray="18 7" strokeWidth="2" />)}
    <path d="M0 65H38L50 77H87M200 195H155L143 183H115M0 217L42 175M200 70L165 105" strokeWidth="3" />
  </g>;
  return <g fill="none" stroke={accent} opacity=".22">
    <ellipse cx="100" cy="130" rx="118" ry="50" transform="rotate(-38 100 130)" />
    <ellipse cx="100" cy="130" rx="123" ry="76" transform="rotate(37 100 130)" strokeDasharray="3 9" />
    {[26, 58, 161, 180].map((x, i) => <g key={x}><path d={`M${x - 5} ${55 + i * 32}h10m-5 -5v10`} /><circle cx={x} cy={55 + i * 32} r="1.8" fill={accent} /></g>)}
  </g>;
}

function ThemeEdge({ setId, edge, accent }: { setId: FramedCardSet; edge: string; accent: string }) {
  switch (setId) {
    case 'npc': return <g fill="none" stroke={accent}>
      <path d="M10 52V19Q10 10 19 10H55M145 10H181Q190 10 190 19V52M10 224V261Q10 270 19 270H54M146 270H181Q190 270 190 261V224" strokeWidth="1" />
      <ellipse cx="100" cy="19" rx="24" ry="6" transform="rotate(-12 100 19)" strokeOpacity=".75" />
      <path d="M100 10L103 16L110 17L105 22L106 29L100 26L94 29L95 22L90 17L97 16Z" fill={accent} strokeWidth=".5" />
      <path d="M8 83v28M192 162v28" stroke={edge} strokeWidth="3" /><circle cx="8" cy="75" r="2" fill={accent} /><circle cx="192" cy="198" r="2" fill={accent} />
    </g>;
    case 'brook': return <g fill="none" stroke={accent}>
      <path d="M8 48V21L21 8H54M146 8H179L192 21V48M8 233V259L21 272H52M148 272H179L192 259V233" strokeWidth="2" />
      {Array.from({ length: 10 }, (_, i) => <path key={i} d={`M8 ${70 + i * 15}h${i % 3 ? 3 : 6}M192 ${70 + i * 15}h-${i % 3 ? 3 : 6}`} strokeWidth=".7" />)}
      <g transform="translate(100 20)"><circle r="11" strokeWidth=".7" /><path d="M0 -10L3 0L0 10L-3 0Z" fill={edge} /><path d="M-7 0H7" /></g>
    </g>;
    case 'bruco': return <g>
      <path d="M3 56V18L18 3H56M144 3H182L197 18V56M3 226V262L18 277H56M144 277H182L197 262V226" fill="none" stroke={edge} strokeWidth="6" />
      <path d="M9 58V22L22 9H54M146 9H178L191 22V58M9 223V258L22 271H54M146 271H178L191 258V223" fill="none" stroke="#263642" strokeWidth="2" />
      {[18, 182].flatMap((x) => [20, 260].map((y) => <g key={`${x}-${y}`}><circle cx={x} cy={y} r="3" fill="#263642" stroke={accent} strokeWidth=".8" /><path d={`M${x - 1.5} ${y + 1.5}l3 -3`} stroke={accent} strokeWidth=".7" /></g>))}
      {[0, 1, 2, 3].map((i) => <g key={i} fill={accent}><path d={`M3 ${96 + i * 8}l5 -4v5l-5 4Z`} /><path d={`M197 ${177 + i * 8}l-5 4v-5l5 -4Z`} /></g>)}
      <path d="M86 10H114L108 24H92Z" fill={accent} /><path d="M98 12l-3 6h5l-2 5 7-8h-5l2-3Z" fill="#263642" />
    </g>;
    case 'paw-patrol': return <g>
      <path d="M8 49V18Q8 8 18 8H47M153 8H182Q192 8 192 18V49M8 232V262Q8 272 18 272H48M152 272H182Q192 272 192 262V232" fill="none" stroke="#fff" strokeWidth="2" />
      <path d="M3 78V111M197 165V198" stroke={accent} strokeWidth="5" />
      <path d="M87 9H113V22Q111 33 100 37Q89 33 87 22Z" fill={accent} stroke="#fff" strokeWidth="1.5" />
      <g fill="#fff"><ellipse cx="100" cy="25" rx="5" ry="4" /><ellipse cx="94" cy="19" rx="2" ry="3" transform="rotate(-20 94 19)" /><ellipse cx="100" cy="16" rx="2" ry="3" /><ellipse cx="106" cy="19" rx="2" ry="3" transform="rotate(20 106 19)" /></g>
      <path d="M10 129v22M190 129v22" stroke="#fff" strokeWidth="1.4" strokeDasharray="2 3" />
    </g>;
    case 'monster': return <g fill="none" stroke={accent}>
      <path d="M10 39Q6 13 29 13M170 13Q194 10 190 39M10 239Q5 263 29 267M170 267Q194 270 190 239" strokeWidth="2" />
      <path d="M8 71l5 4-5 7 5 5-5 6M192 170l-5 4 5 7-5 5 5 6" strokeWidth="1.5" />
      <path d="M92 12l3 5M100 8v7M108 12l-3 5" strokeWidth="2" strokeLinecap="round" />
      {[54, 114, 211].map((y) => <g key={y}><circle cx="9" cy={y} r="2" fill={accent} /><circle cx="191" cy={y + 9} r="2" fill={accent} /></g>)}
    </g>;
    case 'hanzi': return <g fill="none" stroke={edge}>
      <path d="M8 44V8H44M156 8H192V44M8 235V272H44M156 272H192V235" strokeWidth="1" />
      <path d="M13 32V13H32M168 13H187V32M13 248V267H32M168 267H187V248" strokeWidth="2" />
      <rect x="89" y="11" width="22" height="22" strokeWidth="1" /><text x="100" y="27" textAnchor="middle" fill={edge} stroke="none" fontSize="14" fontFamily="KaiTi, serif">字</text>
      <path d="M8 75v130M192 75v130" stroke={accent} strokeWidth=".5" />
    </g>;
    case 'outfit': return <g fill="none" stroke={accent}><rect x="9" y="9" width="182" height="262" rx="10" strokeDasharray="3 3" /><path d="M81 15L100 26L119 15L108 32L100 26L92 32Z" /></g>;
    case 'badge': return <g fill="none" stroke={accent}><path d="M10 46Q24 20 48 10M152 10Q176 20 190 46M10 234Q24 260 48 270M152 270Q176 260 190 234" strokeWidth="3" strokeDasharray="6 3" /><circle cx="100" cy="20" r="10" /></g>;
    case 'game': return <g fill="none" stroke={accent} strokeWidth="3"><path d="M5 45V15H15V5H45M155 5H185V15H195V45M5 235V265H15V275H45M155 275H185V265H195V235" /><path d="M92 17H108M100 9V25" /></g>;
    case 'ship': return <g fill="none" stroke={accent}><path d="M9 55V21L21 9H55M145 9H179L191 21V55M9 225V259L21 271H55M145 271H179L191 259V225" strokeWidth="2" /><path d="M87 20H113M100 7V33" /><circle cx="100" cy="20" r="9" /></g>;
    case 'mystery': return <g fill="none" stroke={accent}><rect x="9" y="9" width="182" height="262" rx="10" strokeDasharray="10 3 2 3" /><path d="M100 8L110 20L100 32L90 20Z" /><circle cx="100" cy="20" r="4" /></g>;
  }
}
