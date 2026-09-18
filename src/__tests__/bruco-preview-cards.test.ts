import { describe, expect, it } from 'vitest';
import { CARD_SETS, cardsBySet } from '../content/starCards';
import { characterPortrait } from '../content/characterAssets';

describe('布鲁克战队角色卡', () => {
  it('将十一张用户提供的角色素材隔离为独立套系', () => {
    const cards = cardsBySet('bruco');
    expect(CARD_SETS.find((set) => set.id === 'bruco')).toMatchObject({ name: { zh: '布鲁克战队' }, rewardBeans: 300 });
    expect(cards.map((card) => card.id)).toEqual([
      'bruco-red-hero', 'bruco-lulu', 'bruco-coco', 'bruco-purple-flight', 'bruco-bronze-guard',
      'bruco-blue-glider', 'bruco-red-04', 'bruco-green-03', 'bruco-blue-05',
      'bruco-orange-sprinter', 'bruco-purple-skater',
    ]);
  });

  it('十一张卡均引用透明独立立绘资源', () => {
    for (const card of cardsBySet('bruco')) {
      expect(characterPortrait(card.id)).toMatch(/^\/assets\/cards\/bruco-team\/.+\.png$/);
    }
  });
});
