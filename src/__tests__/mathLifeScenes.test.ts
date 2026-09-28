import { describe, expect, it } from 'vitest';
import { mathLifeSceneForLesson, mathLifeSceneRoute } from '../content/mathLifeScenes';

describe('数学生活小剧场映射', () => {
  it('按课程内容选择水果店、野餐或修理铺', () => {
    expect(mathLifeSceneForLesson('add-within-5')?.kind).toBe('fruit-shop');
    expect(mathLifeSceneForLesson('campus')?.kind).toBe('picnic');
    expect(mathLifeSceneForLesson('solid-shapes')?.kind).toBe('repair-shop');
    expect(mathLifeSceneForLesson('review-application')).toBeUndefined();
  });

  it('为课程和复习生成对应场景路由', () => {
    expect(mathLifeSceneRoute('add-within-5', 'course')).toBe('/math-practice/fruit-shop?from=course&lesson=add-within-5');
    expect(mathLifeSceneRoute('solid-shapes', 'review', 2)).toBe('/math-practice/life-scene?from=review&lesson=solid-shapes&reviewDay=2');
  });

  it('每道野餐和修理铺任务都有独立实物画面，不再使用字符串拼图', () => {
    const lessonIds = ['campus', 'playground', 'classroom-discover', 'classroom-games', 'learning-readiness', 'ordinal', 'solid-shapes', 'solid-building', 'solid-compose', 'review-shapes'];
    const tasks = lessonIds.flatMap((lessonId) => mathLifeSceneForLesson(lessonId)?.tasks ?? []);
    expect(tasks).toHaveLength(30);
    expect(tasks.every((task) => Boolean(task.artKind) && !('art' in task))).toBe(true);
    expect(tasks.every((task) => !task.prompt.includes('小卷') && !task.artLabel.includes('小卷'))).toBe(true);
    expect(new Set(tasks.map((task) => task.artKind)).size).toBe(30);
  });
});
