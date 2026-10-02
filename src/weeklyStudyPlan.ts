import type { Grade } from './types';
import type { CourseScheduleEntry } from './taskTypes';
import type { ActiveSubject } from './activeCourses';

const GRADES: Grade[] = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'];

/** 可编辑的起始模板；只有 D0 跟随新课，后续复习由 reviews 的星期选项决定。 */
export function weeklyStudySchedule(grade: Grade): CourseScheduleEntry[] {
  return [
    { id: `${grade}:weekday:1`, grade, weekday: 1, subjects: ['chinese'], reviews: [] },
    { id: `${grade}:weekday:2`, grade, weekday: 2, subjects: [], reviews: ['chinese', 'english'] },
    { id: `${grade}:weekday:3`, grade, weekday: 3, subjects: ['math'], reviews: [] },
    { id: `${grade}:weekday:4`, grade, weekday: 4, subjects: [], reviews: ['chinese', 'math'] },
    { id: `${grade}:weekday:5`, grade, weekday: 5, subjects: ['english'], reviews: [] },
    { id: `${grade}:weekday:6`, grade, weekday: 6, subjects: [], reviews: ['math', 'english'] },
    { id: `${grade}:weekday:7`, grade, weekday: 7, subjects: [], reviews: [] },
  ];
}

export const DEFAULT_COURSE_SCHEDULE: CourseScheduleEntry[] = GRADES.flatMap(weeklyStudySchedule);

/** 识别上一版完整预置模板，仅迁移未改动的年级。 */
function wasPreviousTemplate(entries: CourseScheduleEntry[], grade: Grade): boolean {
  const rows = entries.filter((entry) => entry.grade === grade);
  const previous: Array<[CourseScheduleEntry['weekday'], ActiveSubject[], ActiveSubject[]]> = [
    [1, ['chinese'], []], [2, ['math'], ['english']], [3, [], ['chinese']],
    [4, [], ['math']], [5, ['english'], ['chinese']], [6, [], ['math']], [7, [], ['english']],
  ];
  return rows.length === previous.length && previous.every(([weekday, subjects, reviews]) => {
    const row = rows.find((entry) => entry.weekday === weekday);
    return row && row.subjects.length === subjects.length && subjects.every((subject) => row.subjects.includes(subject))
      && (row.reviews ?? []).length === reviews.length && reviews.every((subject) => row.reviews?.includes(subject));
  });
}

/** 空配置采用新模板；上一版未改动模板升级；自定义年级原样保留。 */
export function effectiveCourseSchedule(schedule: CourseScheduleEntry[]): CourseScheduleEntry[] {
  if (schedule.length === 0) return DEFAULT_COURSE_SCHEDULE;
  const upgraded = GRADES.filter((grade) => wasPreviousTemplate(schedule, grade));
  if (upgraded.length === 0) return schedule;
  return [...schedule.filter((entry) => !upgraded.includes(entry.grade)), ...upgraded.flatMap(weeklyStudySchedule)]
    .sort((a, b) => a.grade.localeCompare(b.grade) || a.weekday - b.weekday);
}
