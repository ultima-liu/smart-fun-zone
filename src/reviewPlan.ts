/** 跨学科间隔复习清单：只保存复习节奏与入口，课程内容仍由各学科页面负责。 */
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
};

const DAYS = [0, 2, 4] as const;
const keyFor = (childId: string) => `sfz-review-plan-v1:${childId}`;

function read(childId: string): ReviewEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(keyFor(childId)) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is ReviewEntry => entry && typeof entry.id === 'string' && typeof entry.learnedAt === 'number' && typeof entry.route === 'string')
      .map((entry) => ({ ...entry, completedDays: Array.isArray(entry.completedDays) ? entry.completedDays.filter((day) => DAYS.some((candidate) => candidate === day)) : [] }));
  } catch { return []; }
}

function write(childId: string, entries: ReviewEntry[]) {
  try { localStorage.setItem(keyFor(childId), JSON.stringify(entries.slice(0, 200))); } catch { /* 私密模式下不阻塞学习 */ }
}

export function scheduleReview(childId: string, entry: Omit<ReviewEntry, 'id' | 'learnedAt' | 'completedDays'>) {
  const id = `${entry.subject}:${entry.lessonId}`;
  const entries = read(childId).filter((item) => item.id !== id);
  entries.unshift({ ...entry, id, learnedAt: Date.now(), completedDays: [] });
  write(childId, entries);
}

/**
 * 接住已完成的旧课程记录；不重置原来的学习日期和复习进度。
 * 这样更新版本后，孩子已学过的英语课也会立刻出现在总入口中。
 */
export function importReviewEntry(childId: string, entry: ReviewEntry) {
  const entries = read(childId);
  if (entries.some((item) => item.id === entry.id)) return false;
  entries.unshift({ ...entry, completedDays: entry.completedDays.filter((day) => DAYS.some((candidate) => candidate === day)) });
  write(childId, entries);
  return true;
}

export function reviewEntries(childId: string): ReviewEntry[] { return read(childId); }

export function dueReviewDays(entry: ReviewEntry, now = Date.now()): number[] {
  const elapsed = Math.max(0, Math.floor((now - entry.learnedAt) / 86_400_000));
  return DAYS.filter((day) => elapsed >= day && !entry.completedDays.includes(day));
}

/** 完成较晚一次复习时，一并勾掉此前已经错过的节点，避免同一课堆出多张过期卡。 */
export function completeReviewDay(childId: string, entryId: string, day: number) {
  const entries = read(childId).map((entry) => entry.id !== entryId ? entry : {
    ...entry,
    completedDays: [...new Set([...entry.completedDays, ...DAYS.filter((candidate) => candidate <= day)])],
  });
  write(childId, entries);
}
