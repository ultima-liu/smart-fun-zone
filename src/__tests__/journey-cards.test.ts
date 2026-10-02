import { afterEach, describe, expect, it, vi } from 'vitest';
import { CARD_SETS, cardsBySet, drawCards, setProgress } from '../content/starCards';
import { characterPortrait } from '../content/characterAssets';
import { useStore } from '../store';

describe('西游记套系的收集与奖励', () => {
  afterEach(() => vi.restoreAllMocks());

  it('收录十张独立画作及可查阅原著回目', () => {
    const cards = cardsBySet('journey');
    expect(cards).toHaveLength(10);
    expect(new Set(cards.map((card) => card.id)).size).toBe(10);
    expect(cards.map((card) => card.no)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const card of cards) {
      const asset = characterPortrait(card.id);
      expect(asset).toMatch(/^\/assets\/cards\/journey\/.+\.webp$/);
      expect(card.journey?.chapter).toBeGreaterThan(0);
    }
    expect(setProgress([], 'journey')).toEqual({ have: 0, total: 10 });
  });

  it('抽卡写入真实拥有记录，集齐后仅领取一次500豆奖励', () => {
    const original = useStore.getState();
    const childId = 'journey-test';
    const cards = cardsBySet('journey');
    vi.spyOn(Math, 'random').mockReturnValue(0);
    useStore.setState({ points: { [childId]: 100 }, pointLog: { [childId]: [] }, archivedCards: { [childId]: [] }, cardRewardClaimed: { [childId]: [] } });
    try {
      expect(useStore.getState().claimCardReward(childId, 'journey')).toBe(false);
      const result = useStore.getState().drawCards(childId, 1, 'journey');
      expect(result.ids).toEqual([cards[0].id]);
      expect(useStore.getState().archivedCards[childId]).toEqual([cards[0].id]);
      expect(useStore.getState().points[childId]).toBe(0);
      expect(drawCards(1, [cards[0].id], 'journey').duplicateCount).toBe(1);
      useStore.setState({ archivedCards: { [childId]: cards.map((card) => card.id) } });
      expect(useStore.getState().claimCardReward(childId, 'journey')).toBe(true);
      expect(useStore.getState().points[childId]).toBe(CARD_SETS.find((set) => set.id === 'journey')!.rewardBeans);
      expect(useStore.getState().claimCardReward(childId, 'journey')).toBe(false);
      expect(useStore.getState().points[childId]).toBe(500);
    } finally { useStore.setState(original, true); }
  });
});
