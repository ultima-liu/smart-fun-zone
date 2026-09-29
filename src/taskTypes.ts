import type { ActiveSubject } from './activeCourses';

export type TaskCategory = 'course' | 'chapter' | 'review' | 'challenge' | 'exploration' | 'event' | 'parent';

export interface TaskCompletion {
  completedAt: number;
  reward: number;
  result?: string;
  /** 升级前已经完成的学习记录，只登记，不补发奖励。 */
  legacy?: boolean;
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
    dismissedOn: {},
    visitorShown: [],
  };
}
