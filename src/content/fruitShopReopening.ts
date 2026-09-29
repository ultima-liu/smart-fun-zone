export const SHOP_SIGNS = [
  { id: 'apple', emoji: '🍎', name: '红苹果招牌' },
  { id: 'orange', emoji: '🍊', name: '甜橙招牌' },
  { id: 'grape', emoji: '🍇', name: '葡萄招牌' },
] as const;

export type ShopSignId = (typeof SHOP_SIGNS)[number]['id'];
export type FruitSplit = [number, number];
export const REOPENING_FRUIT_COUNT = 5;

export function isShopSignId(value: unknown): value is ShopSignId {
  return SHOP_SIGNS.some((sign) => sign.id === value);
}

/** 两篮互换位置仍是同一种分法，且每只篮子都要有水果。 */
export function fruitSplitKey(split: FruitSplit): string | null {
  const [left, right] = split;
  if (!Number.isInteger(left) || !Number.isInteger(right) || left < 1 || right < 1 || left + right !== REOPENING_FRUIT_COUNT) return null;
  return `${Math.min(left, right)}+${Math.max(left, right)}`;
}
