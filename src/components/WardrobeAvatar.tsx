import { premiumOutfitById } from '../content/outfits';

export default function WardrobeAvatar({ outfitId, className = '' }: { outfitId?: string; className?: string }) {
  const outfit = premiumOutfitById(outfitId);
  return (
    <svg className={`wardrobe-avatar ${className}`} viewBox="0 0 768 1024" role="img" aria-label={`${outfit.name}角色立绘`}>
      <image href={outfit.image} x="0" y="0" width="768" height="1024" preserveAspectRatio="xMidYMid meet" />
    </svg>
  );
}
