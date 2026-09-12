export type OutfitRarity = '初见' | '稀有' | '典藏';

export interface PremiumOutfit {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  image: string;
  rarity: OutfitRarity;
  accent: string;
  default?: boolean;
}

/** 游戏级整套服装。每套使用独立透明立绘，方便商店、总部及后续剧情复用。 */
export const PREMIUM_OUTFITS: PremiumOutfit[] = [
  { id: 'o-academy', name: '星航学院礼装', subtitle: 'STAR ACADEMY', description: '卷星新生的正式探索礼装，星轨斗篷会记录每一次成长。', image: '/assets/outfits/stellar-academy-transparent.webp', rarity: '初见', accent: '#8f7bf0', default: true },
  { id: 'o-stellar-detective', name: '星穹侦探', subtitle: 'STELLAR DETECTIVE', description: '深空罗盘与星图风衣，为追踪乌乌怪留下的谜题而制。', image: '/assets/outfits/stellar-detective.png', rarity: '典藏', accent: '#43c6ff' },
  { id: 'o-cloud-mechanic', name: '云端机巧师', subtitle: 'CLOUD MECHANIC', description: '轻量飞行夹克与能量手套，适合修理飞船和探索机械遗迹。', image: '/assets/outfits/cloud-mechanic.png', rarity: '稀有', accent: '#ff9d3c' },
  { id: 'o-aurora-ranger', name: '极光巡游者', subtitle: 'AURORA RANGER', description: '由极光织成的星纱礼装，移动时会映出薄荷与薰衣草色光芒。', image: '/assets/outfits/aurora-ranger.png', rarity: '典藏', accent: '#8debd2' },
  { id: 'o-midautumn-moon-rabbit', name: '月桂玉兔', subtitle: 'MID-AUTUMN LIMITED', description: '月白星纱、玉色短袍与金桂纹样共同织成的中秋限定礼装。', image: '/assets/outfits/midautumn-moon-rabbit.png', rarity: '典藏', accent: '#d9c980' },
  { id: 'o-national-day-mountains', name: '山河星火', subtitle: 'NATIONAL DAY LIMITED', description: '以赤金山河纹与星火罗盘为核心的国庆限定探索礼装。', image: '/assets/outfits/national-day-mountains.png', rarity: '典藏', accent: '#e94b42' },
  { id: 'o-spring-festival-snow', name: '瑞雪迎春', subtitle: 'SPRING FESTIVAL LIMITED', description: '云纹锦缎、暖绒披肩与红灯笼挂饰组成的春节限定礼装。', image: '/assets/outfits/spring-festival-snow.png', rarity: '典藏', accent: '#f04b3e' },
];

export function premiumOutfitById(id?: string): PremiumOutfit {
  return PREMIUM_OUTFITS.find((outfit) => outfit.id === id) ?? PREMIUM_OUTFITS[0];
}
