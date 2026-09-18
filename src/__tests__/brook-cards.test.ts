import { describe, expect, it } from 'vitest';
import { CARD_SETS, cardsBySet } from '../content/starCards';
import { characterPortrait } from '../content/characterAssets';

describe('星航协作队图鉴卡', () => {
  it('提供一套四张有职责区分的可收集人物卡', () => {
    const cards = cardsBySet('brook');
    expect(CARD_SETS.find((set) => set.id === 'brook')).toMatchObject({ name: { zh: '星航协作队' }, rewardBeans: 500 });
    expect(cards.map((card) => card.id)).toEqual([
      'brook-captain', 'brook-xing-shan', 'brook-yan-dun', 'brook-lu-mi',
    ]);
    expect(new Set(cards.map((card) => card.desc.zh)).size).toBe(4);
  });

  it('每位成员都通过统一资源入口取独立立绘', () => {
    for (const card of cardsBySet('brook')) {
      expect(characterPortrait(card.id)).toMatch(/^\/assets\/cards\/brook-team\/.+\.png$/);
    }
  });
});
