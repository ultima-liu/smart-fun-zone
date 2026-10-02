import type { ActiveSubject } from './activeCourses';
import type { Grade } from './types';

export type TaskCategory = 'course' | 'chapter' | 'review' | 'challenge' | 'exploration' | 'event' | 'parent';

export interface TaskCompletion {
  completedAt: number;
  reward: number;
  result?: string;
  /** 升级前已经完成的学习记录，只登记，不补发奖励。 */
  legacy?: boolean;
}

export interface CourseScheduleEntry {
  id: string;
  grade: Grade;
  /** 周一至周日用 1–7 表示。 */
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  subjects: ActiveSubject[];
  /** 当天要安排回顾的学科；旧课表缺失时视为空。 */
  reviews?: ActiveSubject[];
}

export interface CourseMailProgress {
  date?: string;
  subject?: ActiveSubject;
  lessonId?: string;
  reward?: number;
  startedAt?: number;
  completedAt?: number;
  claimedAt?: number;
  result?: string;
}

export interface DailyReviewAssignment {
  day: string;
  taskId: string;
  entryId: string;
  reviewDay: number;
  title: string;
  focus: string;
  route: string;
}

export interface ChildTaskState {
  version: 1;
  updatedAt: number;
  initializedAt: number;
  preferredSubject?: ActiveSubject;
  completed: Record<string, TaskCompletion>;
  /** 课程真实完成时间；用于识别孩子在来信前已经自学完成的课。 */
  lessonCompletedAt: Record<string, number>;
  /** 已生成课程邮件的内容快照、开始、完成和领奖进度，key 为邮件 id。 */
  courseMails: Record<string, CourseMailProgress>;
  pausedTaskId?: string;
  quietUntil?: number;
  dismissedOn: Record<string, string>;
  visitorDay?: string;
  visitorShown: string[];
  dailyReview?: DailyReviewAssignment;
  lastCompletion?: { taskId: string; title: string; reward: number; at: number };
}

export function emptyChildTaskState(now = Date.now()): ChildTaskState {
  return {
    version: 1,
    updatedAt: now,
    initializedAt: 0,
    completed: {},
    lessonCompletedAt: {},
    courseMails: {},
    dismissedOn: {},
    visitorShown: [],
  };
}
