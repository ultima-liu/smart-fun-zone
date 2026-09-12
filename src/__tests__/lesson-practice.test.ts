import { describe, expect, it } from 'vitest';
import { selectSentencesInSourceOrder } from '../components/LessonPractice';

describe('课文排序题', () => {
  it('随机抽取句子后仍按原文顺序作为答案', () => {
    const source = ['第一句', '第二句', '第三句', '第四句'];
    for (let i = 0; i < 30; i++) {
      const selected = selectSentencesInSourceOrder(source, 3);
      const positions = selected.map((sentence) => source.indexOf(sentence));
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    }
  });
});
