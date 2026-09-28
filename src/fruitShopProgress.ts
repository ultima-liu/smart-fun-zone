import type { FruitKind, FruitShopLevel } from './content/fruitShop';

export type FruitShopSessionRecord = {
  playedAt: number;
  level: FruitShopLevel;
  stars: number;
  independentRounds: number;
  hints: number;
  durationSec: number;
  abilities: string[];
  teacherRounds?: number;
};

export type FruitShopProgress = {
  sessions: FruitShopSessionRecord[];
  stickers: FruitKind[];
  decorations: string[];
  suggestedLevel: FruitShopLevel;
};

const EMPTY: FruitShopProgress = { sessions: [], stickers: [], decorations: [], suggestedLevel: 1 };
const keyFor = (childId: string) => `sfz-fruit-shop-v1:${childId}`;

export function readFruitShopProgress(childId: string): FruitShopProgress {
  try {
    const value = JSON.parse(localStorage.getItem(keyFor(childId)) ?? 'null') as Partial<FruitShopProgress> | null;
    if (!value || !Array.isArray(value.sessions)) return { ...EMPTY };
    return {
      sessions: value.sessions.filter((item): item is FruitShopSessionRecord => !!item && typeof item.playedAt === 'number').slice(0, 50),
      stickers: Array.isArray(value.stickers) ? [...new Set(value.stickers)] : [],
      decorations: Array.isArray(value.decorations) ? [...new Set(value.decorations)] : [],
      suggestedLevel: value.suggestedLevel === 2 || value.suggestedLevel === 3 ? value.suggestedLevel : 1,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function saveFruitShopSession(childId: string, record: FruitShopSessionRecord, sticker: FruitKind, suggestedLevel: FruitShopLevel, decoration?: string) {
  const previous = readFruitShopProgress(childId);
  const newSticker = !previous.stickers.includes(sticker);
  const newDecoration = !!decoration && !previous.decorations.includes(decoration);
  const next: FruitShopProgress = {
    sessions: [record, ...previous.sessions].slice(0, 50),
    stickers: newSticker ? [...previous.stickers, sticker] : previous.stickers,
    decorations: newDecoration && decoration ? [...previous.decorations, decoration] : previous.decorations,
    suggestedLevel,
  };
  try { localStorage.setItem(keyFor(childId), JSON.stringify(next)); } catch { /* 存储不可用时不阻塞结算 */ }
  return { progress: next, newSticker, newDecoration };
}
