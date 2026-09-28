import { describe, expect, it } from 'vitest';
import { EXTENDED_MATH_LESSONS } from '../content/mathUpperCurriculum';
import { genericArena } from '../pages/MathTextbookLabPage';

describe('数学智能闯关题目', () => {
  it('变化题把原有数量和变化数量分开画出，答案与题干一致', () => {
    const addOne = genericArena({ kind: 'count', prompt: '', emoji: '🧒', total: 3 }, 0);
    expect(addOne.q).toBe('图中原来有 3 个，小熊又放进 1 个，一共有几个？');
    expect(addOne.emo).toBe('🧒🧒🧒 ＋ 🧒');
    expect(addOne.answer).toBe('4');
    expect(addOne.opts).toContain('4');

    const findPart = genericArena({ kind: 'join', prompt: '', emoji: '🐟', a: 3, b: 2 }, 0);
    expect(findPart.emo).toBe('🐟🐟🐟 ｜ 🐟🐟');
    expect(findPart.answer).toBe('2');

    const takeAway = genericArena({ kind: 'take', prompt: '', emoji: '🍎', total: 5, take: 2 }, 1);
    expect(takeAway.emo).toBe('🍎🍎🍎🍎🍎🍎 − 🍎🍎');
    expect(takeAway.answer).toBe('4');
  });

  it('所有扩展课的五道迁移题都有唯一且可选的正确答案', () => {
    EXTENDED_MATH_LESSONS.forEach((lesson) => {
      for (let round = 0; round < 5; round += 1) {
        const question = genericArena(lesson.activity, round);
        expect(question.q.trim(), `${lesson.id} 第 ${round + 1} 题缺少题干`).not.toBe('');
        expect(question.opts, `${lesson.id} 第 ${round + 1} 题正确答案不可选`).toContain(question.answer);
        expect(new Set(question.opts).size, `${lesson.id} 第 ${round + 1} 题选项重复`).toBe(question.opts.length);
      }
    });
  });
});
