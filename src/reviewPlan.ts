/** 课程复习清单：D0 跟随新课，后续回顾由可编辑的周课程表决定。 */
import { localDayKey } from './dailyCheckin';
import type { CourseScheduleEntry } from './taskTypes';
import type { Grade } from './types';
import { effectiveCourseSchedule } from './weeklyStudyPlan';
export type ReviewSubject = 'chinese' | 'math' | 'english';

export type ReviewEntry = {
  id: string;
  subject: ReviewSubject;
  lessonId: string;
  title: string;
  focus: string;
  route: string;
  learnedAt: number;
  completedDays: number[];
  /** 每次按课程表完成回顾的本地日期。 */
  reviewedOn?: string[];
};

const DAYS = [0, 2, 4] as const;
const keyFor = (childId: string) => `sfz-review-plan-v1:${childId}`;

function read(childId: string): ReviewEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(keyFor(childId)) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is ReviewEntry => entry && typeof entry.id === 'string' && typeof entry.learnedAt === 'number' && typeof entry.route === 'string')
      .map((entry) => ({ ...entry, completedDays: Array.isArray(entry.completedDays) ? entry.completedDays.filter((day) => DAYS.some((candidate) => candidate === day)) : [], reviewedOn: Array.isArray(entry.reviewedOn) ? entry.reviewedOn.filter((day): day is string => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)) : [] }));
  } catch { return []; }
}

function write(childId: string, entries: ReviewEntry[]) {
  try { localStorage.setItem(keyFor(childId), JSON.stringify(entries.slice(0, 200))); } catch { /* 私密模式下不阻塞学习 */ }
}

export function scheduleReview(childId: string, entry: Omit<ReviewEntry, 'id' | 'learnedAt' | 'completedDays'>) {
  const id = `${entry.subject}:${entry.lessonId}`;
  const saved = read(childId);
  const previous = saved.find((item) => item.id === id);
  const entries = saved.filter((item) => item.id !== id);
  entries.unshift({ ...entry, id, learnedAt: previous?.learnedAt ?? Date.now(), completedDays: previous?.completedDays ?? [], reviewedOn: previous?.reviewedOn ?? [] });
  write(childId, entries);
}

/**
 * 接住已完成的旧课程记录；不重置原来的学习日期和复习进度。
 * 这样更新版本后，孩子已学过的英语课也会立刻出现在总入口中。
 */
export function importReviewEntry(childId: string, entry: ReviewEntry) {
  const entries = read(childId);
  if (entries.some((item) => item.id === entry.id)) return false;
  entries.unshift({ ...entry, completedDays: entry.completedDays.filter((day) => DAYS.some((candidate) => candidate === day)), reviewedOn: entry.reviewedOn ?? [] });
  write(childId, entries);
  return true;
}

export function reviewEntries(childId: string): ReviewEntry[] { return read(childId); }

/** 用本地自然日而非满 24 小时计算，避免晚间学课使两天后的早间复习错位。 */
export function reviewCalendarDaysSince(learnedAt: number, now = Date.now()): number {
  const learned = new Date(learnedAt);
  const current = new Date(now);
  const firstDay = Date.UTC(learned.getFullYear(), learned.getMonth(), learned.getDate());
  const today = Date.UTC(current.getFullYear(), current.getMonth(), current.getDate());
  return Math.max(0, Math.round((today - firstDay) / 86_400_000));
}

export function dueReviewDays(entry: ReviewEntry, now = Date.now()): number[] {
  return reviewCalendarDaysSince(entry.learnedAt, now) === 0 && !entry.completedDays.includes(0) ? [0] : [];
}

export type ReviewCandidate = { entry: ReviewEntry; reviewDay: 0 | -1 };

/** D0 可独立完成；课程表每个已勾选学科在当天最多选一节旧课。 */
export function reviewCandidates(childId: string, grade: Grade, schedule: CourseScheduleEntry[], now = new Date()): ReviewCandidate[] {
  const day = localDayKey(now);
  const entries = read(childId);
  const sameDay = entries.filter((entry) => localDayKey(new Date(entry.learnedAt)) === day && !entry.completedDays.includes(0))
    .map((entry) => ({ entry, reviewDay: 0 as const }));
  const weekday = now.getDay() || 7;
  const subjects = effectiveCourseSchedule(schedule).find((row) => row.grade === grade && row.weekday === weekday)?.reviews ?? [];
  const lastReviewed = (entry: ReviewEntry) => entry.reviewedOn?.[entry.reviewedOn.length - 1] ?? localDayKey(new Date(entry.learnedAt));
  const scheduled = subjects.flatMap((subject) => {
    if (entries.some((item) => item.subject === subject && (item.reviewedOn ?? []).includes(day))) return [];
    const entry = entries.filter((item) => item.subject === subject
      && localDayKey(new Date(item.learnedAt)) < day && !(item.reviewedOn ?? []).includes(day))
      .sort((a, b) => lastReviewed(a).localeCompare(lastReviewed(b)) || a.learnedAt - b.learnedAt || a.id.localeCompare(b.id))[0];
    return entry ? [{ entry, reviewDay: -1 as const }] : [];
  });
  return [...scheduled, ...sameDay];
}

/** -1 是课程表复习；0 是新课当天短巩固。 */
export function completeReviewDay(childId: string, entryId: string, day: number, now = new Date()) {
  const today = localDayKey(now);
  const entries = read(childId).map((entry) => entry.id !== entryId ? entry : {
    ...entry,
    completedDays: day === 0 ? [...new Set([...entry.completedDays, 0])] : entry.completedDays,
    reviewedOn: day === -1 ? [...new Set([...(entry.reviewedOn ?? []), today])] : entry.reviewedOn,
  });
  write(childId, entries);
}
