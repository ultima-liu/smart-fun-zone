import { useStore, goldSkillCount } from './store';
import type { AppState } from './store';
import { localDayKey } from './dailyCheckin';
import { CHINESE_TEXTBOOK_LESSONS } from './content/chineseTextbookCurriculum';
import { SHIP_MAX_LEVEL } from './content/shipyard';

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
  /** 此孩子当前是否具备完成条件；不可达的可选任务不展示。 */
  available?: (s: AppState, childId: string) => boolean;
  /** 点击引导：跳转路由（可选） */
  go?: string;
  /** 返回当前进度 */
  progress: (s: AppState, childId: string) => number;
}

const S = () => useStore.getState();
const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
/** 本周（周一起）开始时间戳 */
const weekStart = () => { const d = new Date(); const day = d.getDay() || 7; d.setDate(d.getDate() - (day - 1)); d.setHours(0, 0, 0, 0); return d.getTime(); };
/** 今日内 pointLog 中某 reason 关键字出现的次数 */
const todayReason = (s: AppState, c: string, prefix: string): number =>
  (s.pointLog[c] ?? []).filter((e) => e.time >= dayStart() && e.reason.includes(prefix)).length;
/** 周内 pointLog 中某 reason 前缀出现的次数 */
const weekReason = (s: AppState, c: string, prefix: string): number =>
  (s.pointLog[c] ?? []).filter((e) => e.time >= weekStart() && e.reason.includes(prefix)).length;
type CourseSubject = 'chinese' | 'math' | 'english';
/** 课堂练习达到 80% 后写入 prac:<lessonId>:<day>；按课去重后即“完成一节课程”。 */
const completedCourseIds = (s: AppState, c: string, since: number): string[] => {
  const ids = new Set<string>();
  (s.pointLog[c] ?? []).forEach((entry) => {
    if (entry.time < since || entry.reason !== '练习达标') return;
    const match = entry.id.match(/^prac:(.+?):/);
    if (match?.[1]) ids.add(match[1]);
  });
  return [...ids];
};
const CHINESE_LESSON_IDS = new Set(CHINESE_TEXTBOOK_LESSONS.map((lesson) => lesson.id));
const courseSubject = (id: string): CourseSubject | undefined =>
  id.startsWith('math-lab-') ? 'math' : id.startsWith('english-g3a-') ? 'english' : CHINESE_LESSON_IDS.has(id) ? 'chinese' : undefined;
const completedCourses = (s: AppState, c: string, subject: CourseSubject, since: number) =>
  completedCourseIds(s, c, since).filter((id) => courseSubject(id) === subject).length;
const todayCourse = (subject: CourseSubject) => (s: AppState, c: string) => completedCourses(s, c, subject, dayStart());
const weekCourse = (subject: CourseSubject) => (s: AppState, c: string) => completedCourses(s, c, subject, weekStart());
const todayParentTasks = (s: AppState, c: string) =>
  (s.customTasks[c] ?? []).filter((task) => task.done && (task.doneAt ?? 0) >= dayStart()).length;

export const TASKS: TaskDef[] = [
  // 每日清单按具体行为拆分；所有课程完成都以课堂练习正确率达到 80% 为准。
  { id: 'd-checkin', kind: 'daily', title: '完成今日签到', icon: '☀️', reward: 3, target: 1, go: '/profile', progress: (s, c) => s.dailyCheckin[c]?.lastDate === localDayKey(new Date()) ? 1 : 0 },
  { id: 'd-chinese-course', kind: 'daily', title: '完成一节语文课程', icon: '📕', reward: 8, target: 1, go: '/subject/chinese', progress: todayCourse('chinese') },
  { id: 'd-math-course', kind: 'daily', title: '完成一节数学课程', icon: '📐', reward: 8, target: 1, go: '/subject/math', progress: todayCourse('math') },
  { id: 'd-english-course', kind: 'daily', title: '完成一节英语课程', icon: '🔤', reward: 8, target: 1, go: '/subject/english', progress: todayCourse('english') },
  { id: 'd-card-draw', kind: 'daily', title: '完成一次图鉴召唤', icon: '🎴', reward: 3, target: 1, go: '/archive', progress: (s, c) => todayReason(s, c, '图鉴召唤') },
  { id: 'd-store-buy', kind: 'daily', title: '在商店兑换一次物品', icon: '🛍️', reward: 3, target: 1, go: '/store', progress: (s, c) => todayReason(s, c, '兑换商品') },
  { id: 'd-ship-upgrade', kind: 'daily', title: '升级一次飞船', icon: '🚀', reward: 15, target: 1, go: '/dock', progress: (s, c) => todayReason(s, c, '飞船升级'), available: (s, c) => (s.shipLevel[c] ?? 1) < SHIP_MAX_LEVEL || todayReason(s, c, '飞船升级') > 0 },
  { id: 'd-parent-task', kind: 'daily', title: '完成一个家长任务', icon: '🤝', reward: 12, target: 1, progress: todayParentTasks, available: (s, c) => (s.customTasks[c] ?? []).some((task) => !task.done || (task.doneAt ?? 0) >= dayStart()) },
  // 每周目标沿用相同的明确口径，鼓励持续学习，而非游戏时长或局数。
  { id: 'w-chinese-course', kind: 'weekly', title: '完成 3 节语文课程', icon: '📚', reward: 20, target: 3, go: '/subject/chinese', progress: weekCourse('chinese') },
  { id: 'w-math-course', kind: 'weekly', title: '完成 3 节数学课程', icon: '📏', reward: 20, target: 3, go: '/subject/math', progress: weekCourse('math') },
  { id: 'w-english-course', kind: 'weekly', title: '完成 2 节英语课程', icon: '🗣️', reward: 16, target: 2, go: '/subject/english', progress: weekCourse('english') },
  { id: 'w-card-draw', kind: 'weekly', title: '完成 2 次图鉴召唤', icon: '🃏', reward: 8, target: 2, go: '/archive', progress: (s, c) => weekReason(s, c, '图鉴召唤') },
  { id: 'w-store-buy', kind: 'weekly', title: '兑换 2 件学习补给', icon: '🎒', reward: 8, target: 2, go: '/store', progress: (s, c) => weekReason(s, c, '兑换商品') },
  // 里程碑（累计一次性）
  { id: 'gold-5', kind: 'milestone', title: '五课满星', icon: '🏅', reward: 20, target: 5, progress: (s, c) => goldSkillCount(s.mastery, c) },
  { id: 'chars-10', kind: 'milestone', title: '识字小达人', icon: '🧩', reward: 15, target: 10, progress: (s, c) => (s.charBag[c] ?? []).length },
  { id: 'lessons-10', kind: 'milestone', title: '十课探索者', icon: '🧭', reward: 15, target: 10, progress: (s, c) => Object.keys(s.mastery[c] ?? {}).length },
  { id: 'stars-30', kind: 'milestone', title: '收集 30 颗课程星', icon: '⭐', reward: 25, target: 30, progress: (s, c) => Object.values(s.mastery[c] ?? {}).reduce((sum, item) => sum + item.stars, 0) },
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
  const available = !eff.available || eff.available(S(), childId);
  return { cur: Math.min(eff.target, cur), done, reward: eff.reward, enabled: (eff.enabled ?? true) && available };
}
