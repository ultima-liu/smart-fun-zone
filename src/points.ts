/** 积分系统 · 类型与规则（本地核心）
 *  - 每条获得/消费都记入流水 pointLog，携带 sourceId 实现幂等（同源只发一次）
 *  - 积分余额按孩子维护：points[childId]
 *  - 家长部署的自定义任务：customTasks（家长配置）→ 完成时 earnPoints(childId, sourceId, pts)
 */

import { PREMIUM_OUTFITS } from './content/outfits';
import { BADGES } from './content/badges';
import { localDayKey } from './dailyCheckin';

export interface PointEntry {
  /** 全局唯一：sourceId 或消费单号 */
  id: string;
  /** 产生/消费时时间戳 */
  time: number;
  /** 正数为获得，负数为消费 */
  amount: number;
  /** 来源/用途（文案 key 或直接文本） */
  reason: string;
  /** 孩子 id（冗余便于过滤） */
  childId: string;
}

/** 家长部署的自定义任务 */
/** 自定义任务的周期类型 */
export type CustomTaskRepeat = 'once' | 'daily' | 'weekly' | 'monthly' | 'dated';
/** 自定义任务的完成判定：auto=系统自动发放；parent=孩子点已完成、家长审核后发放 */
export type CustomTaskJudge = 'auto' | 'parent';

export interface CustomTask {
  id: string;
  /** 任务描述（家长填写，如"自己整理书包"） */
  text: string;
  /** 周期：一次性 / 每天 / 每周若干天 / 每月若干天 / 指定日期 */
  repeat: CustomTaskRepeat;
  /** weekly：星期几（0=周日 … 6=周六） */
  weekDays?: number[];
  /** monthly：每月几号（1-31） */
  monthDays?: number[];
  /** dated：指定日期（YYYY-MM-DD） */
  date?: string;
  /** 完成判定方式 */
  judge: CustomTaskJudge;
  /** 奖励卷卷豆数量（可为 0） */
  points: number;
  /** 奖励物品（管理员物品目录 id，可选） */
  itemId?: string;
  createdAt: number;
  /** 已完成并发放奖励的日期（YYYY-MM-DD） */
  doneDays: string[];
  /** 家长判断类：孩子已完成、待家长审核的日期 */
  pendingDays: string[];
}

/** 自定义任务今天是否到期（once 任务恒显示，直至完成） */
export function customTaskDueToday(task: CustomTask, now: number | Date = Date.now()): boolean {
  const d = new Date(now);
  switch (task.repeat) {
    case 'daily': return true;
    case 'weekly': return (task.weekDays ?? []).includes(d.getDay());
    case 'monthly': return (task.monthDays ?? []).includes(d.getDate());
    case 'dated': return task.date === localDayKey(d);
    case 'once': return true;
  }
}

/** 商品大类（商店分 3 类货架；徽章由剧情授勋，不是商品） */
export type ItemKind = 'outfit' | 'badge' | 'item' | 'reward';

/** 兑换商品 */
export interface StoreItem {
  id: string;
  kind: ItemKind;
  name: string;
  desc?: string;
  cost: number;
  /** 装扮类无图标（用立绘），道具/奖励类为 emoji */
  icon?: string;
  /** 装扮类：与总部衣柜共用的立绘资源 */
  image?: string;
  /** 装扮类：与总部一致的主题色 */
  accent?: string;
  /** 装扮类：稀有度（初见/稀有/典藏） */
  rarity?: string;
  /** 装扮类活动类型：购买=补给站出售；活动=限定活动发放（补给站不显示） */
  acqType?: 'purchase' | 'event';
  /** reward 类可重复购买、即时到账（时长券直接加当日时长）；outfit/item 即时到账 */
  on?: boolean; // 管理端上架开关（默认 true）
}

/** 商店 3 类商品目录 */
/* 1) 装扮 outfit —— 与总部衣柜同一份数据（content/outfits.ts 的 PREMIUM_OUTFITS）：
   默认套装（o-academy）人人免费拥有、不上架；购买型在补给站兑换，
   活动型（节日限定）补给站不显示，仅总部衣柜展示 */
const OUTFIT_PRICES: Record<string, number> = {
  'o-stellar-detective': 180,
  'o-cloud-mechanic': 140,
  'o-aurora-ranger': 220,
  'o-midautumn-moon-rabbit': 200,
  'o-national-day-mountains': 180,
  'o-spring-festival-snow': 240,
};
const outfitCatalog: StoreItem[] = PREMIUM_OUTFITS
  .filter((outfit) => !outfit.default)
  .map((outfit) => ({
    id: outfit.id,
    kind: 'outfit' as const,
    name: outfit.name,
    desc: outfit.description,
    cost: OUTFIT_PRICES[outfit.id] ?? 180,
    image: outfit.image,
    accent: outfit.accent,
    rarity: outfit.rarity,
    acqType: outfit.acqType,
  }));

/* 1.5) 徽章 badge —— 与剧情徽章（content/badges.ts）同一份数据：剧情授勋获得，
   不上架出售（商店货架不含徽章），管理端可查看与维护名称/图标 */
const badgeCatalog: StoreItem[] = BADGES.map((badge) => ({
  id: badge.id,
  kind: 'badge' as const,
  name: badge.name,
  desc: badge.unlockCondition,
  cost: 0,
  icon: badge.icon,
  rarity: badge.rarity,
}));

export const CATALOG: StoreItem[] = [
  ...outfitCatalog,
  ...badgeCatalog,
  /* 2) 游戏道具 item —— 在具体游戏里使用 */
  { id: 'i-rocket', kind: 'item', name: '火箭加速', desc: '游戏内快进 5 秒', cost: 12, icon: '🚀' },
  { id: 'i-shield', kind: 'item', name: '星星护盾', desc: '答错一次不扣分', cost: 18, icon: '🛡️' },
  { id: 'i-hint', kind: 'item', name: '提示卡', desc: '卡住时给一个提示', cost: 10, icon: '💡' },
  { id: 'i-heart', kind: 'item', name: '生命之心', desc: '游戏内 +1 次机会', cost: 16, icon: '❤️' },
  /* 3) 奖励兑换 reward —— 卷卷豆直接兑换、即时到账（时长券加当日游戏时长） */
  { id: 'rw-game15', kind: 'reward', name: '+15 分钟游戏', desc: '今天多玩 15 分钟', cost: 30, icon: '🎮' },
  { id: 'rw-video10', kind: 'reward', name: '+10 分钟动画', desc: '动画时长券', cost: 30, icon: '🎬' },
  { id: 'rw-toy', kind: 'reward', name: '小礼物一份', desc: '家长准备的小惊喜', cost: 100, icon: '🎁' },
  { id: 'rw-outing', kind: 'reward', name: '周末出游', desc: '和家长出去玩一次', cost: 200, icon: '🏞️' },
  { id: 'rw-book', kind: 'reward', name: '心仪绘本', desc: '家长帮你买一本绘本', cost: 150, icon: '📖' },
];

export const KIND_LABEL: Record<ItemKind, string> = {
  outfit: '装扮',
  badge: '徽章',
  item: '游戏道具',
  reward: '奖励兑换',
};

/** 某孩子「已拥有 → 可选择装配」的装扮 id（当前装配 by 类型各一个） */
export interface Equipped {
  outfit?: string;
  badge?: string;
}

/** 按 kind 分货架（可带覆盖配置；不含已下架商品） */
export const shelf = (kind: ItemKind, overrides: Record<string, Partial<StoreItem>> = {}) =>
  effectiveCatalog(overrides).filter((i) => i.kind === kind);

export const itemById = (id: string, overrides: Record<string, Partial<StoreItem>> = {}): StoreItem | undefined =>
  effectiveCatalog(overrides, true).find((i) => i.id === id);

/** 应用管理端覆盖：改字段 / 上下架 / 新增。
 *  includeOffShelf=false 供孩子端货架（过滤已下架）；管理端传 true 以查看并重新上架。 */
export function effectiveCatalog(overrides: Record<string, Partial<StoreItem>> = {}, includeOffShelf = false): StoreItem[] {
  const map = new Map(CATALOG.map((i) => [i.id, { ...i }]));
  for (const [id, patch] of Object.entries(overrides)) {
    const base = map.get(id) ?? ({ id } as StoreItem);
    map.set(id, { ...base, ...patch, id });
  }
  const all = [...map.values()];
  return includeOffShelf ? all : all.filter((i) => i.on !== false);
}


/** 一次性获得来源的 id 拼接（幂等键） */
export const src = (kind: string, key: string): string => `${kind}:${key}`;

/** 自动学习行为 → 积分规则（正数分值） */
export const AUTO_POINTS: Record<string, number> = {
  step: 2,        // 完成一个学习步骤
  firstRight: 1,  // 练习首次答对
  goldSkill: 5,   // 单课首次满3星转金
  readAloud: 3,   // 跟读≥60分
  gameFinish: 2,  // 完成一个游戏
  newChar: 1,     // 收集新字卡（每个）
  dailyCheckin: 5, // 今日首次登录
  weekStreak: 20, // 连续学习7天
};

/** 计算余额 */
export function balanceOf(points: Record<string, number>, childId: string): number {
  return points[childId] ?? 0;
}

/** 判断某 sourceId 是否已产生（幂等） */
export function hasEarned(log: PointEntry[], childId: string, sourceId: string): boolean {
  return log.some((e) => e.childId === childId && e.id === sourceId && e.amount > 0);
}

/** 追加一条流水并更新余额（内部供 store 使用） */
export function applyEntry(
  points: Record<string, number>,
  log: PointEntry[],
  entry: PointEntry,
): { points: Record<string, number>; log: PointEntry[] } {
  const childLog = log.filter((e) => e.childId === entry.childId);
  const otherLog = log.filter((e) => e.childId !== entry.childId);
  // 幂等：同 id 的获得记录存在则忽略（消费单号冲突也忽略）
  if (childLog.some((e) => e.id === entry.id)) return { points, log };
  const next = [...otherLog, entry, ...childLog].slice(0, 600);
  const bal = Math.max(0, (points[entry.childId] ?? 0) + entry.amount);
  return { points: { ...points, [entry.childId]: bal }, log: next };
}
