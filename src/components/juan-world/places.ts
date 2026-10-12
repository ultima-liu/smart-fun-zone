export const WORLD_PLACES = [
  {
    id: 'school',
    route: '/map',
    name: { zh: '学校', en: 'School' },
    scene: { zh: '荧光魔法书', en: 'Luminous Magic Tome' },
    purpose: { zh: '学习语文、数学和英语', en: 'Chinese, math and English' },
    x: 38,
    y: 29,
  },
  {
    id: 'archive',
    route: '/archive',
    name: { zh: '档案库', en: 'Archive' },
    scene: { zh: '星际收藏卡', en: 'Stellar Collection Cards' },
    purpose: { zh: '看看你的卡牌收藏', en: 'Explore your card collection' },
    x: 50,
    y: 24,
  },
  {
    id: 'hq',
    route: '/profile',
    name: { zh: '总部', en: 'Home' },
    scene: { zh: '星际悬空城', en: 'Celestial Citadel' },
    purpose: { zh: '查看成长、徽章和装扮', en: 'Growth, badges and outfits' },
    x: 64,
    y: 30,
  },
  {
    id: 'dock',
    route: '/dock',
    name: { zh: '船坞', en: 'Dock' },
    scene: { zh: '月牙湾船坞', en: 'Crescent Harbor' },
    purpose: { zh: '建造和升级飞船', en: 'Build and upgrade ships' },
    x: 37,
    y: 63,
  },
  {
    id: 'supply',
    route: '/store',
    name: { zh: '补给站', en: 'Supply' },
    scene: { zh: '星环补给站', en: 'Orbital Supply Station' },
    purpose: { zh: '用卷星币兑换好物', en: 'Exchange coins for goodies' },
    x: 19,
    y: 47,
  },
  {
    id: 'park',
    route: '/lobby',
    name: { zh: '空中乐园', en: 'Sky Park' },
    scene: { zh: '红蓝游戏机', en: 'Red & Blue Console' },
    purpose: { zh: '去玩喜欢的小游戏', en: 'Play your favorite games' },
    x: 80,
    y: 44,
  },
] as const;

export type PlaceId = (typeof WORLD_PLACES)[number]['id'];
export type WorldPoint = PlaceId | 'mail' | 'loot' | 'reward' | 'drift';
export type WorldState = {
  theme: 'dark' | 'light';
  quiet: boolean;
  hovered: WorldPoint | null;
  mailStatus: string;
  unreadCount: number;
  rewardCount: number;
  deliveryNonce: number;
  lootReady: boolean;
  collectNonce: number;
  archiveNotice: boolean;
  drift: boolean;
};
