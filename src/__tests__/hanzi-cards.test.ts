import { describe, expect, it } from 'vitest';
import { CARD_SETS, cardsBySet, hanziCardsForLesson } from '../content/starCards';
import { isPerfectLessonPractice, starsForLessonPractice } from '../lessonRewards';

describe('《我是中国人》汉字图鉴卡', () => {
  it('汉字分类包含三张完整教学卡', () => {
    expect(CARD_SETS.some((set) => set.id === 'hanzi' && set.name.zh === '汉字')).toBe(true);
    const cards = cardsBySet('hanzi');
    expect(cards.map((card) => card.hanzi?.character)).toEqual(['刘', '翊', '鸣']);
    for (const card of cards) {
      expect(card.hanzi?.pinyin).toBeTruthy();
      expect(card.hanzi?.radical.zh).toBeTruthy();
      expect(card.hanzi?.strokes).toBeGreaterThan(0);
      expect(card.hanzi?.structure.zh).toBeTruthy();
      expect(card.hanzi?.words).toHaveLength(2);
      expect(card.hanzi?.writingTip.zh).toBeTruthy();
      expect(card.hanzi?.lessonId).toBe('chinese-g1-a-1-1');
    }
  });

  it('完成对应语文课时可定位全部生字图鉴卡', () => {
    expect(hanziCardsForLesson('chinese-g1-a-1-1').map((card) => card.id)).toEqual([
      'hanzi-liu', 'hanzi-yi', 'hanzi-ming',
    ]);
    expect(hanziCardsForLesson('chinese-g1-a-1-2')).toEqual([]);
  });

  it('按本次正确率给星，只有全对才可领取生字卡', () => {
    expect(starsForLessonPractice(2, 5)).toBe(1);
    expect(starsForLessonPractice(4, 5)).toBe(2);
    expect(starsForLessonPractice(5, 5)).toBe(3);
    expect(isPerfectLessonPractice(4, 5)).toBe(false);
    expect(isPerfectLessonPractice(5, 5)).toBe(true);
  });
});
