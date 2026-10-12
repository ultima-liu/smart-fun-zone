// Generated from the actual 3D default view, relative to the 1380 × 754 poster.
// Facilities retain the same placement in every planet appearance.
import type { WorldPoint } from './places';
import type { WorldAppearance } from './appearances';
export const POSTER_VISIBLE_POINTS = new Set<WorldPoint>([
  'school',
  'archive',
  'park',
  'mail',
  'reward',
  'drift',
]);
export const POSTER_ASPECT = 1380 / 754;
export const POSTER_ANCHORS: Record<WorldPoint, [number, number]> = {
  school: [0.34324354392346335, 0.30103123202757304],
  archive: [0.6431975331278261, 0.31828921414270217],
  hq: [0.3342099735974508, 0.5150633844926873],
  dock: [0.5, 0.4973718394049491],
  supply: [0.6300819108751897, 0.4270961005728534],
  park: [0.19313987808304184, 0.6575645957183095],
  mail: [0.7157313086008963, 0.5762606008928015],
  reward: [0.2331545571223846, 0.25751284241969286],
  drift: [0.4396377251751652, 0.9534320916349494],
  loot: [0.5, 0.95], // Reserved state ID; the expedition ship has no scene label.
};

export const POSTER_SKIN_ANCHORS: Record<WorldAppearance, Record<WorldPoint, [number, number]>> = {
  rock: POSTER_ANCHORS,
  gas: POSTER_ANCHORS,
  ice: POSTER_ANCHORS,
  star: POSTER_ANCHORS,
};
