import { describe, expect, it } from 'vitest';
import { BADGES } from '../content/badges';
import { allNodes } from '../content/story';
import { CATALOG } from '../points';

describe('内置徽章方案', () => {
  it('提供按剧情推进排序的唯一徽章，并且所有剧情门槛有效', () => {
    expect(new Set(BADGES.map((badge) => badge.id)).size).toBe(BADGES.length);
    expect(BADGES.map((badge) => badge.order)).toEqual([...BADGES].map((badge) => badge.order).sort((a, b) => a - b));
    const nodeIds = new Set(allNodes().map((node) => node.id));
    BADGES.forEach((badge) => expect(nodeIds.has(badge.storyGate)).toBe(true));
  });

  it('不把徽章作为补给站可购买商品，且加成保持克制', () => {
    expect(CATALOG.some((item) => item.kind === 'badge')).toBe(false);
    BADGES.forEach((badge) => {
      const total = Object.values(badge.bonus).reduce((sum, value) => sum + (value ?? 0), 0);
      expect(total).toBeLessThanOrEqual(4);
    });
  });
});
