import type { StarCard } from '../content/starCards';
import JourneyPortrait from './JourneyPortrait';
import HuluPortrait from './HuluPortrait';
import ThemedCardPortrait from './ThemedCardPortrait';

interface Props {
  card: StarCard;
  size?: number;
  className?: string;
}

export default function CardPortrait({ card, size = 168, className = '' }: Props) {
  if (card.setId === 'journey') return <JourneyPortrait card={card} size={size} className={className} />;
  if (card.setId === 'hulu') return <HuluPortrait card={card} size={size} className={className} />;
  return <ThemedCardPortrait card={card} size={size} className={className} />;
}
