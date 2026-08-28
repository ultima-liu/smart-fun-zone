import type { LessonContent } from './skills';

/* =====================================================================
   课程内容懒加载
   LESSON_CONTENTS（课文/生字/知识点/配图正文）体积较大，构建后是独立 chunk，
   首次进入课程页才动态下载，避免全量课文打进首屏主包。
   ===================================================================== */

let mapPromise: Promise<Record<string, LessonContent>> | null = null;

export function loadContents(): Promise<Record<string, LessonContent>> {
  mapPromise ??= import('./lessonContents').then((m) => m.LESSON_CONTENTS);
  return mapPromise;
}

export async function loadLessonContent(id: string): Promise<LessonContent | undefined> {
  const map = await loadContents();
  return map[id];
}
