import type { BadgeDefinition } from '../content/badges';

const BADGE_ART: Record<string, string> = {
  'badge-stargate-pass': '/assets/badges/stargate-pass.png',
  'badge-classroom-spark': '/assets/badges/classroom-spark.png',
  'badge-laughter-repair': '/assets/badges/laughter-repair.png',
  'badge-supply-apprentice': '/assets/badges/supply-apprentice.png',
  'badge-archive-keeper': '/assets/badges/archive-keeper.png',
  'badge-night-scout': '/assets/badges/night-scout.png',
  'badge-partner-link': '/assets/badges/partner-link.png',
  'badge-golden-lesson': '/assets/badges/golden-lesson.png',
  'badge-park-sprinter': '/assets/badges/park-sprinter.png',
  'badge-archive-restorer': '/assets/badges/archive-restorer.png',
  'badge-expedition-guide': '/assets/badges/expedition-guide.png',
  'badge-star-ring-guardian': '/assets/badges/star-ring-guardian.png',
};

/** 每枚徽章使用独立透明插画资产，避免合图裁切与线框图标同质化。 */
export default function BadgeIcon({ badge, size = 64 }: { badge: BadgeDefinition; size?: number }) {
  return <img className="badge-art" src={BADGE_ART[badge.id]} width={size} height={size} alt={badge.name} draggable={false} />;
}
