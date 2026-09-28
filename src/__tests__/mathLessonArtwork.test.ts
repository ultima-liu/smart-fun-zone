import { describe, expect, it } from 'vitest';
import { MATH_UPPER_UNITS } from '../content/mathUpperCurriculum';
import { MATH_LESSON_COVERS } from '../components/MathLessonArtwork';

describe('数学课程目录封面', () => {
  const lessonIds = MATH_UPPER_UNITS.flatMap((unit) => unit.lessons.map((lesson) => lesson.id));

  it('为每张已开放课程卡提供独立封面配置', () => {
    expect(Object.keys(MATH_LESSON_COVERS).sort()).toEqual([...lessonIds].sort());
  });

  it('封面有可辨认的标签、构图和三色配色', () => {
    Object.values(MATH_LESSON_COVERS).forEach((cover) => {
      expect(cover.label.length).toBeGreaterThan(1);
      expect(cover.colors).toHaveLength(3);
      expect(new Set(cover.colors).size).toBe(3);
    });
  });
});
