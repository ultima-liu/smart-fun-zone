import { describe, expect, it } from 'vitest';
import { themeEmojis } from '../content/lessonTheme';

describe('themeEmojis', () => {
  it('观潮类课文配海洋主题', () => {
    const e = themeEmojis(['大潮', '潮水', '浪花', '钱塘江', '奔腾']);
    expect(e).toContain('🌊');
  });

  it('秋天课文配秋主题', () => {
    const e = themeEmojis(['秋天', '落叶', '金黄', '枫叶']);
    expect(e).toContain('🍂');
  });

  it('最多返回 4 个', () => {
    const e = themeEmojis(['太阳', '阳光', '大海', '浪花', '花朵', '蝴蝶', '小鸟', '唱歌']);
    expect(e.length).toBeLessThanOrEqual(4);
  });

  it('无匹配时返回空', () => {
    expect(themeEmojis(['的', '了'])).toEqual([]);
  });
});
