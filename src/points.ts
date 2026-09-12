/** 积分系统 · 类型与规则（本地核心）
 *  - 每条获得/消费都记入流水 pointLog，携带 sourceId 实现幂等（同源只发一次）
 *  - 积分余额按孩子维护：points[childId]
 *  - 家长部署的自定义任务：customTasks（家长配置）→ 完成时 earnPoints(childId, sourceId, pts)
 */

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
export interface CustomTask {
  id: string;
  /** 任务描述（家长填写，如"自己整理书包"） */
  text: string;
  /** 完成后给多少积分 */
  points: number;
  /** 是否已确认发放（家长手动确认加分） */
  done: boolean;
  /** 确认时间 */
  doneAt?: number;
  /** 创建时间 */
  createdAt: number;
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
  icon: string;
  /** 只有 reward 类需要家长审批；outfit/item 即时到账 */
  on?: boolean; // 管理端上架开关（默认 true）
}

/** 商店 3 类商品目录 */
export const CATALOG: StoreItem[] = [
  /* 1) 装扮 outfit —— 直接作用于虚拟形象（卷星人）：帽子、光环、翅膀、表情等 */
  { id: 'o-stellar-detective', kind: 'outfit', name: '星穹侦探', desc: '完整星图风衣与深空罗盘套装', cost: 180, icon: '🔎' },
  { id: 'o-cloud-mechanic', kind: 'outfit', name: '云端机巧师', desc: '飞行夹克、能量手套与机巧工具套装', cost: 140, icon: '⚙️' },
  { id: 'o-aurora-ranger', kind: 'outfit', name: '极光巡游者', desc: '会流动发光的极光星纱礼装', cost: 220, icon: '🌌' },
  { id: 'o-midautumn-moon-rabbit', kind: 'outfit', name: '月桂玉兔', desc: '月白星纱与金桂纹样的中秋限定套装', cost: 200, icon: '🌕' },
  { id: 'o-national-day-mountains', kind: 'outfit', name: '山河星火', desc: '赤金山河纹的国庆限定探索礼装', cost: 180, icon: '✨' },
  { id: 'o-spring-festival-snow', kind: 'outfit', name: '瑞雪迎春', desc: '云纹锦缎与暖绒披肩的春节限定套装', cost: 240, icon: '🧧' },
  { id: 'o-hat', kind: 'outfit', name: '小侦探帽', desc: '给角色戴上帅气侦探帽', cost: 20, icon: '🎩' },
  { id: 'o-crown', kind: 'outfit', name: '金色皇冠', desc: '角色戴上闪闪皇冠', cost: 60, icon: '👑' },
  { id: 'o-halo', kind: 'outfit', name: '天使光环', desc: '头顶悬浮柔和光环', cost: 45, icon: '😇' },
  { id: 'o-wings', kind: 'outfit', name: '小翅膀', desc: '背上长出俏皮翅膀', cost: 80, icon: '🪽' },
  { id: 'o-glasses', kind: 'outfit', name: '圆框眼镜', desc: '很有学问的圆框眼镜', cost: 15, icon: '🤓' },
  { id: 'o-flower', kind: 'outfit', name: '头上小花', desc: '发间别一朵小粉花', cost: 12, icon: '🌸' },
  { id: 'o-frame-gold', kind: 'outfit', name: '金边框', desc: '角色头像加金边相框', cost: 30, icon: '🖼️' },
  { id: 'o-bow', kind: 'outfit', name: '蝴蝶结', desc: '系一个可爱蝴蝶结', cost: 18, icon: '🎀' },
  { id: 'o-antenna', kind: 'outfit', name: '卷星天线', desc: '头顶长出卷卷天线和小星环', cost: 38, icon: '📡' },
  /* 2) 游戏道具 item —— 在具体游戏里使用 */
  { id: 'i-rocket', kind: 'item', name: '火箭加速', desc: '游戏内快进 5 秒', cost: 12, icon: '🚀' },
  { id: 'i-shield', kind: 'item', name: '星星护盾', desc: '答错一次不扣分', cost: 18, icon: '🛡️' },
  { id: 'i-hint', kind: 'item', name: '提示卡', desc: '卡住时给一个提示', cost: 10, icon: '💡' },
  { id: 'i-heart', kind: 'item', name: '生命之心', desc: '游戏内 +1 次机会', cost: 16, icon: '❤️' },
  /* 3) 奖励兑换 reward —— 需要家长确认后兑现 */
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

/** 按 kind 分货架（可带覆盖配置） */
export const shelf = (kind: ItemKind, overrides: Record<string, Partial<StoreItem>> = {}) =>
  effectiveCatalog(overrides).filter((i) => i.kind === kind);

export const itemById = (id: string, overrides: Record<string, Partial<StoreItem>> = {}): StoreItem | undefined =>
  effectiveCatalog(overrides).find((i) => i.id === id);

/** 应用管理端覆盖：改字段 / 上下架 / 新增 */
export function effectiveCatalog(overrides: Record<string, Partial<StoreItem>> = {}): StoreItem[] {
  const map = new Map(CATALOG.map((i) => [i.id, { ...i }]));
  for (const [id, patch] of Object.entries(overrides)) {
    const base = map.get(id) ?? ({ id } as StoreItem);
    map.set(id, { ...base, ...patch, id });
  }
  return [...map.values()].filter((i) => i.on !== false);
}



/** 家长奖励/数字时长兑换请求（孩子提交 → 家长审批） */
export interface RewardRequest {
  id: string;
  childId: string;
  itemId: string;
  name: string;
  icon: string;
  /** reward 类商品；时长类靠 itemId 前缀 rw-game/rw-video 识别 */
  kind: 'reward' | string;
  cost: number;
  createdAt: number;
  /** pending / approved / declined */
  status: 'pending' | 'approved' | 'declined';
  /** 审批时间 */
  decidedAt?: number;
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
