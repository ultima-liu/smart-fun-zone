import { MATH_UPPER_UNITS } from './content/mathUpperCurriculum';
import { CHINESE_TEXTBOOK_LESSONS } from './content/chineseTextbookCurriculum';
import { ENGLISH_G3_ALL_LESSONS } from './content/englishGrade3Upper';
import type { MasteryState } from './store';

/** 已开课课程注册表：学校当前只开 3 本课本（数学一年级上册 / 语文一年级上册 / 英语三年级上册）。
 *  首页、学校页的「继续学习」「课程进度」都以这里为准；新增课本时在此登记。 */

export type ActiveSubject = 'math' | 'chinese' | 'english';

export interface ActiveLesson {
  id: string;
  title: string;
  subject: ActiveSubject;
  /** 进入课时学习的路由 */
  route: string;
  stars: number;
  gold: boolean;
}

/** 语文课本进度存在独立 localStorage（目录页同款），数学/英语在 mastery 里 */
function chineseStars(childId: string | undefined): Record<string, number> {
  if (!childId) return {};
  try {
    const stored = JSON.parse(localStorage.getItem(`sfz-chinese-textbook-progress:${childId}`) ?? '{}');
    return Array.isArray(stored)
      ? Object.fromEntries((stored as string[]).map((id) => [id, 3]))
      : (stored ?? {});
  } catch {
    return {};
  }
}

const starsOf = (mastery: Record<string, Record<string, MasteryState>> | undefined, childId: string | undefined, key: string) =>
  (childId ? mastery?.[childId]?.[key]?.stars : 0) ?? 0;

/** 展开 3 本已开课课本的全部课时（顺序：数学 → 语文 → 英语） */
export function activeLessons(
  childId: string | undefined,
  mastery: Record<string, Record<string, MasteryState>> | undefined,
): ActiveLesson[] {
  const chinese = chineseStars(childId);
  return [
    ...MATH_UPPER_UNITS.flatMap((unit) => unit.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      subject: 'math' as const,
      route: `/math-course/${lesson.id}`,
      stars: starsOf(mastery, childId, `math-lab-${lesson.id}`),
    }))),
    ...CHINESE_TEXTBOOK_LESSONS.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      subject: 'chinese' as const,
      route: `/chinese-course/${lesson.id}`,
      stars: chinese[lesson.id] ?? 0,
    })),
    ...ENGLISH_G3_ALL_LESSONS.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      subject: 'english' as const,
      route: `/english-course/${lesson.id}`,
      stars: starsOf(mastery, childId, `english-g3a-${lesson.id}`),
    })),
  ].map((lesson) => ({ ...lesson, gold: lesson.stars >= 3 }));
}

/** 继续学习推荐：第一门未满星课时；全部满星则回到第一课 */
export function nextLessonToLearn(
  childId: string | undefined,
  mastery: Record<string, Record<string, MasteryState>> | undefined,
): ActiveLesson | undefined {
  const lessons = activeLessons(childId, mastery);
  return lessons.find((lesson) => !lesson.gold) ?? lessons[0];
}
