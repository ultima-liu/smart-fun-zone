/**
 * 兼容旧导入路径。任务实现已迁移到 taskSystem；旧每日/每周清单不再存在。
 */
export * from './taskSystem';

export type TaskDef = {
  id: string;
  kind: 'course' | 'chapter' | 'review' | 'challenge' | 'exploration' | 'event' | 'parent';
  title: string;
  icon: string;
  reward: number;
  enabled?: boolean;
};

/** 管理端只配置七类任务的统一规则；具体内容由任务内容表控制。 */
export const TASKS: TaskDef[] = [
  { id: 'category:course', kind: 'course', title: '课程任务', icon: '📚', reward: 8 },
  { id: 'category:chapter', kind: 'chapter', title: '章节任务', icon: '🏆', reward: 30 },
  { id: 'category:review', kind: 'review', title: '每日复习', icon: '🧠', reward: 8 },
  { id: 'category:challenge', kind: 'challenge', title: '专项挑战', icon: '⚔️', reward: 15 },
  { id: 'category:exploration', kind: 'exploration', title: '探索支线', icon: '🧭', reward: 10 },
  { id: 'category:event', kind: 'event', title: '主题活动', icon: '🎈', reward: 18 },
  { id: 'category:parent', kind: 'parent', title: '家长任务', icon: '🤝', reward: 0 },
];
