import { useId } from 'react';
import { useI18n } from '../i18n';
import type { StarCard } from '../content/starCards';
import { characterPortrait } from '../content/characterAssets';
import { JOURNEY_FACTIONS } from '../content/journeyCards';

/** 西行绘卷使用完整画作、古金双线框与朱砂藏印，不进入卡通 SVG 渲染路径。 */
export default function JourneyPortrait({ card, size, className }: { card: StarCard; size: number; className: string }) {
  const id = useId().replace(/:/g, '');
  const zh = useI18n().lang !== 'en';
  const lore = card.journey!;
  return (
    <svg className={`ccard-portrait journey-portrait ${className}`} width={size} height={Math.round(size * 1.4)} viewBox="0 0 200 280" role="img" aria-label={zh ? card.name.zh : card.name.en}>
      <defs>
        <clipPath id={`j-clip-${id}`}><rect x="5" y="5" width="190" height="270" rx="3" /></clipPath>
        <linearGradient id={`j-shade-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#131918" stopOpacity=".2" />
          <stop offset=".58" stopColor="#131918" stopOpacity="0" />
          <stop offset="1" stopColor="#111a18" stopOpacity=".97" />
        </linearGradient>
        <linearGradient id={`j-gold-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#e7cd94" /><stop offset=".5" stopColor="#886d42" /><stop offset="1" stopColor="#d8bc7f" />
        </linearGradient>
      </defs>
      <rect width="200" height="280" rx="5" fill="#18201c" />
      <g clipPath={`url(#j-clip-${id})`}>
        <image className="journey-character-art" href={characterPortrait(card.id)} x="5" y="5" width="190" height="270" preserveAspectRatio="xMidYMid slice" />
        <rect x="5" y="5" width="190" height="270" fill={`url(#j-shade-${id})`} />
      </g>
      <rect x="5" y="5" width="190" height="270" rx="3" fill="none" stroke={`url(#j-gold-${id})`} strokeWidth="1.5" />
      <rect x="10" y="10" width="180" height="260" rx="2" fill="none" stroke="#d8bd85" strokeOpacity=".5" strokeWidth=".5" />
      {[['0', '0'], ['200', '0'], ['0', '280'], ['200', '280']].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${i % 2 ? -1 : 1} ${i > 1 ? -1 : 1})`} fill="none" stroke="#e3c58d" strokeWidth="1">
          <path d="M9 35V9H35M14 29V14H29M14 21c9 0 7 9 1 6M21 14c0 9 9 7 6 1" />
        </g>
      ))}
      <g transform="translate(17 19)">
        <rect width="22" height="33" rx="1" fill="#8f352a" fillOpacity=".93" stroke="#d8b580" strokeWidth=".5" />
        <text x="11" y="13" textAnchor="middle" fill="#fff0cc" fontSize="9" fontFamily="serif">西行</text>
        <text x="11" y="26" textAnchor="middle" fill="#fff0cc" fontSize="9" fontFamily="serif">{String(card.no).padStart(2, '0')}</text>
      </g>
      <rect x="151" y="18" width="32" height="19" rx="2" fill="#18201c" fillOpacity=".85" stroke="#b69a64" strokeWidth=".6" />
      <text x="167" y="31" textAnchor="middle" fill="#edd5a2" fontSize="10" letterSpacing="1">{card.rarity}</text>
      <text x="100" y="215" textAnchor="middle" fill="#d7bd88" fontSize={zh ? '9' : '8'} letterSpacing={zh ? '2' : '0'}>{zh ? lore.title.zh : lore.title.en}</text>
      <text x="100" y="241" textAnchor="middle" fill="#fff0ce" fontSize={zh ? '21' : '15'} fontFamily="STKaiti, KaiTi, serif" letterSpacing={zh ? '3' : '0'}>{zh ? card.name.zh : card.name.en}</text>
      <path d="M38 253H76m48 0h38" stroke="#bea06b" strokeOpacity=".6" strokeWidth=".6" />
      <text x="100" y="257" textAnchor="middle" fill="#cdbb98" fontSize="8" letterSpacing="1">{zh ? JOURNEY_FACTIONS[lore.faction].zh : JOURNEY_FACTIONS[lore.faction].en}</text>
    </svg>
  );
}
