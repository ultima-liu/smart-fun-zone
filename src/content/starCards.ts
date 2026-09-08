/**
 * 星际图鉴卡 · 星核档案库收藏集
 *  - 卡牌分稀有度：普通(N) / 稀有(R)
 *  - 由远征战利品掉落的「图鉴碎片」合成（普通 8 片 / 稀有 20 片）
 */

export type CardRarity = 'N' | 'R';

export interface StarCard {
  id: string;
  rarity: CardRarity;
  name: { zh: string; en: string };
  desc: { zh: string; en: string };
  icon: string;
  /** 合成的图鉴碎片数 */
  shardCost: number;
}

const CARD_DEFS: StarCard[] = [
  { id: 'card-sun', rarity: 'N', name: { zh: '星系向日葵', en: 'Galaxy Sunflower' }, desc: { zh: '吸收星光的温柔花朵。', en: 'A gentle flower that absorbs starlight.' }, icon: '🌻', shardCost: 8 },
  { id: 'card-moon', rarity: 'N', name: { zh: '月牙船', en: 'Crescent Boat' }, desc: { zh: '夜航的小小月牙。', en: 'A tiny crescent that sails the night.' }, icon: '🌙', shardCost: 8 },
  { id: 'card-comet', rarity: 'N', name: { zh: '流星信使', en: 'Comet Messenger' }, desc: { zh: '替卷星传递心愿。', en: 'Carries wishes across Juan Star.' }, icon: '☄️', shardCost: 8 },
  { id: 'card-star', rarity: 'N', name: { zh: '小小星光', en: 'Little Starlight' }, desc: { zh: '每一颗都是能量。', en: 'Every spark is energy.' }, icon: '⭐', shardCost: 8 },
  { id: 'card-planet', rarity: 'N', name: { zh: '泡泡星球', en: 'Bubble Planet' }, desc: { zh: '轻盈的梦想星球。', en: 'A light planet of dreams.' }, icon: '🪐', shardCost: 8 },
  { id: 'card-galaxy', rarity: 'R', name: { zh: '星环守护者', en: 'Ring Guardian' }, desc: { zh: '守护卷星星环的传说。', en: 'Legend that guards the star ring.' }, icon: '🛡️', shardCost: 20 },
  { id: 'card-dragon', rarity: 'R', name: { zh: '星火龙', en: 'Star Dragon' }, desc: { zh: '御星而行的神兽。', en: 'A divine beast riding the stars.' }, icon: '🐉', shardCost: 20 },
  { id: 'card-phoenix', rarity: 'R', name: { zh: '涅槃星凰', en: 'Reborn Phoenix' }, desc: { zh: '浴火重生的永恒。', en: 'Eternal, reborn from fire.' }, icon: '🦚', shardCost: 20 },
];

export const STAR_CARDS: readonly StarCard[] = CARD_DEFS;

/** 单张图鉴卡 */
export function starCardById(id: string): StarCard | undefined {
  return CARD_DEFS.find((c) => c.id === id);
}

/** 稀有度中文标签 */
export const CARD_RARITY_LABEL: Record<CardRarity, { zh: string; en: string }> = {
  N: { zh: '普通', en: 'Common' },
  R: { zh: '稀有', en: 'Rare' },
};
