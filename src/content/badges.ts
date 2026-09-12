/**
 * 徽章是剧情与成长的永久授勋，不是补给站商品，也不需要装备才生效。
 * 条件的实际判定与发奖流程将在徽章页面接入时实现；这里是唯一的内置定义来源。
 */
export type BadgeAttribute = 'wisdom' | 'courage' | 'creativity' | 'teamwork';
export type BadgeRarity = 'normal' | 'rare' | 'epic';

export interface BadgeDefinition {
  id: string;
  order: number;
  name: string;
  icon: string;
  rarity: BadgeRarity;
  /** 达到该剧情节点后，才会向孩子显示该徽章的轮廓与进度。 */
  storyGate: string;
  meaning: string;
  unlockCondition: string;
  bonus: Partial<Record<BadgeAttribute, number>>;
  shape: 'star' | 'shield' | 'hex' | 'gear' | 'laurel' | 'compass';
}

export const BADGES: readonly BadgeDefinition[] = [
  { id: 'badge-stargate-pass', order: 1, name: '星门通行证', icon: '🛂', shape: 'shield', rarity: 'normal', storyGate: 'p1', meaning: '勇敢通过星门验证，成为卷星的新旅人。', unlockCondition: '完成序章「星门验证」', bonus: { wisdom: 1, courage: 1 } },
  { id: 'badge-classroom-spark', order: 2, name: '课堂星火', icon: '📚', shape: 'star', rarity: 'normal', storyGate: 'c1-2', meaning: '用专心学习点亮第一束课堂星光。', unlockCondition: '完成任意一节课程并获得课程结算', bonus: { wisdom: 2 } },
  { id: 'badge-laughter-repair', order: 3, name: '笑声修复员', icon: '🎠', shape: 'gear', rarity: 'normal', storyGate: 'c2-2', meaning: '用一次认真挑战，让空中乐园重新响起笑声。', unlockCondition: '完成任意一局乐园小游戏', bonus: { courage: 2 } },
  { id: 'badge-supply-apprentice', order: 4, name: '补给学徒', icon: '🧰', shape: 'hex', rarity: 'normal', storyGate: 'c3-1', meaning: '学会为下一次旅程挑选合适的补给。', unlockCondition: '在补给站成功获得首件装扮或游戏道具', bonus: { creativity: 1, teamwork: 1 } },
  { id: 'badge-archive-keeper', order: 5, name: '档案守护者', icon: '🗃️', shape: 'shield', rarity: 'rare', storyGate: 'c4-1', meaning: '记住相遇与发现，让卷星的故事被好好保存。', unlockCondition: '档案库累计点亮 3 张图鉴卡', bonus: { wisdom: 1, creativity: 2 } },
  { id: 'badge-night-scout', order: 6, name: '夜航见习生', icon: '🚀', shape: 'compass', rarity: 'rare', storyGate: 'c5-1', meaning: '第一次收回远征战利品，懂得等待也会有收获。', unlockCondition: '完成一次远征战利品收取', bonus: { courage: 2 } },
  { id: 'badge-partner-link', order: 7, name: '小卷同伴', icon: '🌀', shape: 'laurel', rarity: 'rare', storyGate: 'c6-1', meaning: '在疑问与探索中，和小卷建立可靠的伙伴默契。', unlockCondition: '完成第 6 章小卷剧情，并使用一次小卷助手', bonus: { teamwork: 2 } },
  { id: 'badge-golden-lesson', order: 8, name: '金课新星', icon: '🌟', shape: 'star', rarity: 'rare', storyGate: 'c1-2', meaning: '把每一次练习都当成和昨天的自己比赛。', unlockCondition: '累计 5 节课程获得三星（100%正确）', bonus: { wisdom: 3 } },
  { id: 'badge-park-sprinter', order: 9, name: '乐园跃迁者', icon: '🏃', shape: 'gear', rarity: 'rare', storyGate: 'c2-2', meaning: '在不同挑战里保持勇气和好奇心。', unlockCondition: '累计完成 10 局小游戏，且体验过 3 种小游戏', bonus: { courage: 3 } },
  { id: 'badge-archive-restorer', order: 10, name: '星核修复师', icon: '💎', shape: 'hex', rarity: 'epic', storyGate: 'c4-1', meaning: '把散落的知识和伙伴故事拼回完整星图。', unlockCondition: '档案库累计点亮 12 张图鉴卡', bonus: { creativity: 3 } },
  { id: 'badge-expedition-guide', order: 11, name: '远征领航员', icon: '🧭', shape: 'compass', rarity: 'epic', storyGate: 'c5-1', meaning: '带着准备与耐心，让远征队一次次平安返航。', unlockCondition: '收取 7 次远征战利品，且飞船达到 Lv.2', bonus: { courage: 1, teamwork: 2 } },
  { id: 'badge-star-ring-guardian', order: 12, name: '星环守望者', icon: '🛡️', shape: 'laurel', rarity: 'epic', storyGate: 'c6-1', meaning: '学习、探索、收集与陪伴汇成守护卷星的光。', unlockCondition: '完成第 6 章、累计 30 颗星，并获得任意 2 枚稀有徽章', bonus: { wisdom: 1, courage: 1, creativity: 1, teamwork: 1 } },
];

export const badgeById = (id: string) => BADGES.find((badge) => badge.id === id);
