import { afterEach, describe, expect, it, vi } from 'vitest';
import { CARD_SETS, STAR_CARDS, cardsBySet, drawCards, setProgress } from '../content/starCards';
import { characterPortrait } from '../content/characterAssets';
import { useStore } from '../store';

describe('葫芦娃套系收集', () => {
  afterEach(() => vi.restoreAllMocks());

  it('角色资源真实存在，编号独立，收集进度只统计本套系', () => {
    const cards = cardsBySet('hulu');
    expect(cards).toHaveLength(11);
    expect(new Set(STAR_CARDS.map((card) => card.id)).size).toBe(STAR_CARDS.length);
    expect(cards.map((card) => card.no)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const assets = import.meta.glob('/public/assets/cards/hulu/*.webp', { query: '?url', import: 'default' });
    for (const card of cards) {
      const asset = characterPortrait(card.id);
      expect(asset).toMatch(/^\/assets\/cards\/hulu\/.+\.webp$/);
      expect(`/public${asset}` in assets).toBe(true);
    }
    expect(setProgress([], 'hulu')).toEqual({ have: 0, total: 11 });
    expect(setProgress(['hulu-1', 'hulu-1', 'journey-wukong'], 'hulu')).toEqual({ have: 1, total: 11 });
  });

  it('全池可抽到葫芦娃，指定套系十连不会混入其他角色', () => {
    const firstIndex = STAR_CARDS.findIndex((card) => card.setId === 'hulu');
    const weight = { R: 55, SR: 30, SSR: 12, SP: 3 };
    const before = STAR_CARDS.slice(0, firstIndex).reduce((sum, card) => sum + weight[card.rarity], 0);
    const total = STAR_CARDS.reduce((sum, card) => sum + weight[card.rarity], 0);
    vi.spyOn(Math, 'random').mockReturnValue((before + 1) / total);
    expect(drawCards(1, []).ids).toEqual(['hulu-1']);
    const result = drawCards(10, [], 'hulu');
    expect(result.ids).toHaveLength(10);
    expect(result.ids.every((id) => cardsBySet('hulu').some((card) => card.id === id))).toBe(true);
  });

  it('抽卡扣豆并去重保存，集齐十一位后只能领一次500豆', () => {
    const original = useStore.getState();
    const childId = 'hulu-test';
    const ids = cardsBySet('hulu').map((card) => card.id);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    useStore.setState({ points: { [childId]: 200 }, pointLog: { [childId]: [] }, archivedCards: { [childId]: [] }, cardRewardClaimed: { [childId]: [] } });
    try {
      expect(useStore.getState().claimCardReward(childId, 'hulu')).toBe(false);
      expect(useStore.getState().drawCards(childId, 1, 'hulu').newCards).toEqual(['hulu-1']);
      expect(useStore.getState().points[childId]).toBe(100);
      expect(useStore.getState().drawCards(childId, 1, 'hulu').duplicateCount).toBe(1);
      expect(useStore.getState().archivedCards[childId]).toEqual(['hulu-1']);
      expect(useStore.getState().points[childId]).toBe(0);
      expect(useStore.getState().drawCards(childId, 1, 'hulu').ids).toEqual([]);
      useStore.setState({ archivedCards: { [childId]: ids.slice(0, -1) } });
      expect(useStore.getState().claimCardReward(childId, 'hulu')).toBe(false);
      useStore.setState({ archivedCards: { [childId]: ids } });
      expect(useStore.getState().claimCardReward(childId, 'hulu')).toBe(true);
      expect(useStore.getState().points[childId]).toBe(CARD_SETS.find((set) => set.id === 'hulu')!.rewardBeans);
      expect(useStore.getState().claimCardReward(childId, 'hulu')).toBe(false);
      expect(useStore.getState().points[childId]).toBe(500);
    } finally { useStore.setState(original, true); }
  });
});
