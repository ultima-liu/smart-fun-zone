import { describe, expect, it } from 'vitest';
import { ALL_MATH_LESSONS } from '../content/mathUpperCurriculum';
import { MATH_KNOWLEDGE_EXTENSION } from '../content/mathKnowledgeExtension';

describe('整册数学知识延伸', () => {
  it('42 课逐课有知识桥，答案在选项中，复现来源是已存在课时', () => {
    const ids = ALL_MATH_LESSONS.map((lesson) => lesson.id);
    expect(ids).toHaveLength(42);
    expect(Object.keys(MATH_KNOWLEDGE_EXTENSION).sort()).toEqual([...ids].sort());
    for (const [id, card] of Object.entries(MATH_KNOWLEDGE_EXTENSION)) {
      expect(card.title, id).not.toBe('');
      expect(card.insight, id).not.toBe('');
      expect(card.options, id).toContain(card.answer);
      expect(card.options.length, id).toBeGreaterThanOrEqual(3);
      if (card.from) expect(ids, `${id} 的复现来源`).toContain(card.from);
    }
  });

  it('十个一和凑十保留数量，不把拆分后的余数丢掉', () => {
    expect(MATH_KNOWLEDGE_EXTENSION['ten-again'].model).toEqual({ kind: 'place', tens: 1, ones: 0 });
    expect(MATH_KNOWLEDGE_EXTENSION['plus-nine'].model).toEqual({ kind: 'ten', filled: 9, add: 1, leftover: 3 });
    expect(MATH_KNOWLEDGE_EXTENSION['plus-eight-seven-six'].model).toEqual({ kind: 'ten', filled: 7, add: 3, leftover: 3 });
  });
});
