import { useId } from 'react';
import { useI18n } from '../i18n';
import { characterPortrait } from '../content/characterAssets';
import type { StarCard } from '../content/starCards';

export default function HuluPortrait({ card, size = 168, className = '' }: { card: StarCard; size?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  const zh = useI18n().lang !== 'en';
  const lore = card.hulu!;
  const color = card.palette[0];
  return (
    <svg className={`ccard-portrait hulu-portrait ${className}`} width={size} height={Math.round(size * 1.4)} viewBox="0 0 200 280" role="img" aria-label={zh ? card.name.zh : card.name.en}>
      <defs>
        <clipPath id={`hulu-clip-${id}`}><rect x="4" y="4" width="192" height="272" rx="9" /></clipPath>
        <linearGradient id={`hulu-paper-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset=".64" stopColor="#faf1db" stopOpacity="0" />
          <stop offset=".8" stopColor="#faf1db" stopOpacity=".12" />
          <stop offset=".9" stopColor="#faf1db" stopOpacity=".88" />
          <stop offset="1" stopColor="#faf1db" />
        </linearGradient>
      </defs>
      <rect width="200" height="280" rx="13" fill="#faf1db" />
      <g clipPath={`url(#hulu-clip-${id})`}>
        <image className="hulu-character-art" href={characterPortrait(card.id)} x="4" y="4" width="192" height="272" preserveAspectRatio="xMidYMid slice" />
        <rect x="4" y="4" width="192" height="272" fill={`url(#hulu-paper-${id})`} />
      </g>
      <rect x="3" y="3" width="194" height="274" rx="10" fill="none" stroke={color} strokeWidth="1.5" />
      <rect x="7" y="7" width="186" height="266" rx="7" fill="none" stroke="#fff7df" strokeOpacity=".55" strokeWidth=".6" />
      <rect x="12" y="12" width="23" height="22" rx="5" fill={color} fillOpacity=".94" />
      <text x="23.5" y="27" textAnchor="middle" fill="#fff8e5" fontSize="10" fontWeight="700">{String(card.no).padStart(2, '0')}</text>
      <rect x="154" y="12" width="33" height="20" rx="5" fill="#faf1db" fillOpacity=".92" stroke={color} strokeWidth=".7" />
      <text x="170.5" y="26" textAnchor="middle" fill={color} fontSize="9" fontWeight="800">{card.rarity}</text>
      <text x="100" y="249" textAnchor="middle" fill="#293e2c" fontSize={zh ? '24' : '15'} fontWeight="800" fontFamily="STKaiti, KaiTi, serif" letterSpacing={zh ? '2' : '0'}>{zh ? card.name.zh : card.name.en}</text>
      <text x="100" y="267" textAnchor="middle" fill={color} fontSize={zh ? '9' : '7.5'} fontWeight="600">{zh ? lore.ability.zh : lore.ability.en}</text>
    </svg>
  );
}
