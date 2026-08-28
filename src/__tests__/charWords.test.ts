import { describe, expect, it } from 'vitest';
import { extractContextWords } from '../components/CharCard';

describe('extractContextWords', () => {
  it('不把标点拼进词', () => {
    const words = extractContextWords('光', '阳光，光明。');
    expect(words.every((w) => !/[，。！？；、：""''（）]/.test(w))).toBe(true);
  });

  it('只保留字典可验证的真词', () => {
    const words = extractContextWords('光', '阳光光明');
    expect(words).toEqual(['阳光', '光明']);
  });

  it('非词组合不收录（不再出现 妈四/的妈 这类假词）', () => {
    const words = extractContextWords('妈', '妈妈在家');
    expect(words).toEqual(['妈妈']); // 妈在/妈四 等不会出现
  });

  it('三字组合仅在字典可验证时保留', () => {
    const words = extractContextWords('晨', '早晨晨光');
    expect(words).toEqual(['早晨']); // 晨光不在字典组词 → 不收录
    expect(words.some((w) => w.length === 3)).toBe(false);
  });
});
