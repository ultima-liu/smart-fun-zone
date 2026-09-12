import { useStore, goldSkillCount, todayGameKinds, todayRecords, childRecords } from './store';
import type { AppState } from './store';

/** 任务系统：任务有进度，完成自动发放积分（幂等 source = task:<id>[:<day>]）
 *  数据源只用「按孩子」的字段（mastery/records/charBag），避免跨孩子污染。
 */

export interface TaskDef {
  id: string;
  kind: 'milestone' | 'daily' | 'weekly';
  title: string;
  icon: string;
  reward: number;
  target: number;
  enabled?: boolean;
  /** 点击引导：跳转路由（可选） */
  go?: string;
  /** 返回当前进度 */
  progress: (s: AppState, childId: string) => number;
}

const S = () => useStore.getState();
const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
/** 本周（周一起）开始时间戳 */
const weekStart = () => { const d = new Date(); const day = d.getDay() || 7; d.setDate(d.getDate() - (day - 1)); d.setHours(0, 0, 0, 0); return d.getTime(); };
/** 今日内 pointLog 中某 reason 前缀出现的次数 */
const todayReason = (s: AppState, c: string, prefix: string): number =>
  (s.pointLog[c] ?? []).filter((e) => e.time >= dayStart() && e.reason.includes(prefix)).length;
/** 周内 pointLog 中某 reason 前缀出现的次数 */
const weekReason = (s: AppState, c: string, prefix: string): number =>
  (s.pointLog[c] ?? []).filter((e) => e.time >= weekStart() && e.reason.includes(prefix)).length;
/** 周内游戏记录 */
const weekRecords = (s: AppState, c: string) =>
  s.records.filter((r) => r.childId === c && r.playedAt >= weekStart());

export const TASKS: TaskDef[] = [
  // 每日学习引导（每日重置）
  { id: 'd-learn', kind: 'daily', title: '学习 1 课', icon: '📖', reward: 5, target: 1, go: '/map', progress: (s, c) => todayReason(s, c, '满星') + todayReason(s, c, '学步骤') },
  { id: 'd-read', kind: 'daily', title: '跟读 1 次', icon: '🎤', reward: 4, target: 1, progress: (s, c) => todayReason(s, c, '跟读') },
  { id: 'd-play', kind: 'daily', title: '玩 1 局游戏', icon: '🎮', reward: 3, target: 1, go: '/lobby', progress: (s, c) => todayRecords(s.records, c).length },
  { id: 'd-char', kind: 'daily', title: '收集 1 个字卡', icon: '🧩', reward: 3, target: 1, progress: (s, c) => todayReason(s, c, '收集字卡') },
  { id: 'd-kind', kind: 'daily', title: '玩 2 种游戏', icon: '🎲', reward: 6, target: 2, go: '/lobby', progress: (s, c) => todayGameKinds(s.records, c) },
  { id: 'd-games', kind: 'daily', title: '玩 3 局', icon: '⚡', reward: 6, target: 3, go: '/lobby', progress: (s, c) => todayRecords(s.records, c).length },
  // 每周目标（自然周重置）
  { id: 'w-learn', kind: 'weekly', title: '本周学 3 课', icon: '📚', reward: 15, target: 3, go: '/map', progress: (s, c) => weekReason(s, c, '满星') + weekReason(s, c, '学步骤') },
  { id: 'w-games', kind: 'weekly', title: '本周玩 5 局', icon: '🎮', reward: 15, target: 5, go: '/lobby', progress: (s, c) => weekRecords(s, c).length },
  { id: 'w-stars', kind: 'weekly', title: '本周得 20 星', icon: '⭐', reward: 25, target: 20, progress: (s, c) => weekRecords(s, c).reduce((n, r) => n + r.stars, 0) },
  { id: 'w-chars', kind: 'weekly', title: '本周收 5 张字卡', icon: '🧩', reward: 20, target: 5, progress: (s, c) => weekReason(s, c, '收集字卡') },
  // 里程碑（累计一次性）
  { id: 'gold-5', kind: 'milestone', title: '五课满星', icon: '🏅', reward: 20, target: 5, progress: (s, c) => goldSkillCount(s.mastery, c) },
  { id: 'chars-10', kind: 'milestone', title: '识字小达人', icon: '🧩', reward: 15, target: 10, progress: (s, c) => (s.charBag[c] ?? []).length },
  { id: 'games-10', kind: 'milestone', title: '游戏闯关者', icon: '🎮', reward: 15, target: 10, progress: (s, c) => childRecords(s.records, c).length },
  { id: 'stars-30', kind: 'milestone', title: '收集 30 星', icon: '⭐', reward: 25, target: 30, progress: (s, c) => s.records.filter((r) => r.childId === c).reduce((n, r) => n + r.stars, 0) },
];

function sourceFor(t: TaskDef): string {
  // 每日/每周任务按周期独立结算，里程碑一次性
  if (t.kind === 'daily') {
    const day = new Date().toDateString();
    return `task:${t.id}:${day}`;
  }
  if (t.kind === 'weekly') {
    const week = new Date(weekStart()).toDateString();
    return `task:${t.id}:${week}`;
  }
  return `task:${t.id}`;
}

function claimed(childId: string, sourceId: string): boolean {
  return (S().pointLog[childId] ?? []).some((e) => e.id === sourceId && e.amount > 0);
}

/** 任务分值/开关合并管理端配置 */
export function effTask(t: TaskDef): TaskDef {
  const o = S().taskOverrides[t.id];
  if (!o) return t;
  return { ...t, reward: o.reward ?? t.reward, enabled: o.enabled ?? true };
}

/** 扫描任务：完成未领的自动加分（幂等） */
export function claimAutoTasks(childId: string): string[] {
  const s = S();
  const granted: string[] = [];
  for (const raw of TASKS) {
    const t = effTask(raw);
    if (!t.enabled) continue;
    const src = sourceFor(t);
    if (claimed(childId, src)) continue;
    if (t.progress(s, childId) >= t.target) {
      s.applyPoints(childId, t.reward, `任务·${t.title}`, src);
      granted.push(t.title);
    }
  }
  return granted;
}


/** 每日引导任务（供首页面板展示） */
export const DAILY_TASKS: TaskDef[] = TASKS.filter((t) => t.kind === 'daily');
/** 每周目标（供首页面板展示） */
export const WEEKLY_TASKS: TaskDef[] = TASKS.filter((t) => t.kind === 'weekly');

/** 便捷：某任务对某孩子的当前进度/是否完成（合并管理端配置） */
export function taskProgress(t: TaskDef, childId: string): { cur: number; done: boolean; reward: number; enabled: boolean } {
  const eff = effTask(t);
  const cur = eff.progress(S(), childId);
  const src = sourceFor(t);
  const done = (S().pointLog[childId] ?? []).some((e) => e.id === src && e.amount > 0);
  return { cur: Math.min(eff.target, cur), done, reward: eff.reward, enabled: eff.enabled ?? true };
}
