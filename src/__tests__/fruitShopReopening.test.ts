import { beforeEach, describe, expect, it } from 'vitest';
import { fruitSplitKey } from '../content/fruitShopReopening';
import { readFruitShopProgress, saveFruitShopReopening, saveFruitShopSession } from '../fruitShopProgress';

const childId = 'reopening-test-child';

beforeEach(() => localStorage.clear());

describe('水果店重新开张', () => {
  it('两篮互换仍算同一种分法，且两只篮子都必须有水果', () => {
    expect(fruitSplitKey([1, 4])).toBe('1+4');
    expect(fruitSplitKey([4, 1])).toBe('1+4');
    expect(fruitSplitKey([2, 3])).toBe('2+3');
    expect(fruitSplitKey([0, 5])).toBeNull();
    expect(fruitSplitKey([2, 2])).toBeNull();
  });

  it('招牌和两种分法跨订单结算保留，并隔离孩子档案', () => {
    saveFruitShopReopening(childId, { signId: 'grape', firstWay: [1, 4], secondWay: [2, 3], completedAt: 100 });
    saveFruitShopSession(childId, {
      playedAt: 200, level: 1, stars: 2, independentRounds: 2, hints: 1,
      durationSec: 90, abilities: ['counting'],
    }, 'apple', 2);
    expect(readFruitShopProgress(childId).reopening).toEqual({
      signId: 'grape', firstWay: [1, 4], secondWay: [2, 3], completedAt: 100,
    });
    expect(readFruitShopProgress('another-child').reopening).toBeUndefined();
  });

  it('损坏的旧记录不会展示虚假的开张成果', () => {
    localStorage.setItem(`sfz-fruit-shop-v1:${childId}`, JSON.stringify({
      sessions: [], stickers: [], decorations: [], suggestedLevel: 1,
      reopening: { signId: 'apple', firstWay: [1, 4], secondWay: [4, 1], completedAt: 100 },
    }));
    expect(readFruitShopProgress(childId).reopening).toBeUndefined();
  });
});
