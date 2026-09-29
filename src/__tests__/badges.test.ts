import { describe, expect, it } from 'vitest';
import { BADGES } from '../content/badges';
import { CATALOG } from '../points';

describe('内置徽章方案', () => {
  it('提供按展示顺序排序的唯一徽章', () => {
    expect(new Set(BADGES.map((badge) => badge.id)).size).toBe(BADGES.length);
    expect(BADGES.map((badge) => badge.order)).toEqual([...BADGES].map((badge) => badge.order).sort((a, b) => a - b));
  });

  it('徽章只作为零价格管理目录项存在，且加成保持克制', () => {
    const badgeItems = CATALOG.filter((item) => item.kind === 'badge');
    expect(badgeItems).toHaveLength(BADGES.length);
    expect(badgeItems.every((item) => item.cost === 0)).toBe(true);
    BADGES.forEach((badge) => {
      const total = Object.values(badge.bonus).reduce((sum, value) => sum + (value ?? 0), 0);
      expect(total).toBeLessThanOrEqual(4);
    });
  });
});
