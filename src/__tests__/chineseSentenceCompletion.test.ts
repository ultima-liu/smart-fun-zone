import { describe, expect, it } from 'vitest';
import { completedSentence } from '../chineseSentenceCompletion';
import { CHINESE_TEXTBOOK_STUDY } from '../content/chineseTextbookStudy';

describe('教材补充关键信息', () => {
  it('提供的句子和只填一部分不能算孩子完成作答', () => {
    expect(completedSentence('我用____来____。', ['', ''])).toBe('');
    expect(completedSentence('我用____来____。', ['手', ''])).toBe('');
    expect(completedSentence('我用____来____。', ['手', '   '])).toBe('');
    expect(completedSentence('我用____来____。', ['手'])).toBe('');
  });
  it('只用实际填写的内容组成完整句子，清空任何一空会撤回可检查答案', () => {
    expect(completedSentence('乌鸦把____放进瓶子里，水渐渐____。', [' 小石子 ', ' 升高 '])).toBe('乌鸦把小石子放进瓶子里，水渐渐升高。');
    expect(completedSentence('乌鸦把____放进瓶子里，水渐渐____。', ['', '升高'])).toBe('');
  });
  it('全册12项文字教材任务均有1～2个可填写关键词，范例能组成句子', () => {
    const tasks = Object.values(CHINESE_TEXTBOOK_STUDY).flatMap(pack => pack.tasks).filter(task => !task.scene && (task.kind === 'speak' || task.kind === 'practice'));
    expect(tasks).toHaveLength(12);
    for (const task of tasks) {
      const completion = task.completion!;
      expect(completion).toBeDefined();
      expect(completion.blanks.length).toBeGreaterThan(0);
      expect(completion.blanks.length).toBeLessThanOrEqual(2);
      expect(completedSentence(completion.frame, completion.blanks.map(blank => blank.example))).not.toBe('');
      expect(completedSentence(completion.frame, completion.blanks.map(() => ''))).toBe('');
      expect(completion.criteria.length).toBeGreaterThan(0);
    }
  });
});
