import type { FruitKind, FruitShopLevel } from './content/fruitShop';
import { fruitSplitKey, isShopSignId, type FruitSplit, type ShopSignId } from './content/fruitShopReopening';

export type FruitShopReopening = {
  signId: ShopSignId;
  firstWay: FruitSplit;
  secondWay: FruitSplit;
  completedAt: number;
};

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
  reopening?: FruitShopReopening;
};

const EMPTY: FruitShopProgress = { sessions: [], stickers: [], decorations: [], suggestedLevel: 1 };
const keyFor = (childId: string) => `sfz-fruit-shop-v1:${childId}`;

function readReopening(value: unknown): FruitShopReopening | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Partial<FruitShopReopening>;
  const first = Array.isArray(record.firstWay) && record.firstWay.length === 2 ? record.firstWay as FruitSplit : undefined;
  const second = Array.isArray(record.secondWay) && record.secondWay.length === 2 ? record.secondWay as FruitSplit : undefined;
  if (!isShopSignId(record.signId) || !first || !second || !fruitSplitKey(first) || !fruitSplitKey(second)
    || fruitSplitKey(first) === fruitSplitKey(second) || typeof record.completedAt !== 'number' || !Number.isFinite(record.completedAt)) return undefined;
  return { signId: record.signId, firstWay: [...first], secondWay: [...second], completedAt: record.completedAt };
}

export function readFruitShopProgress(childId: string): FruitShopProgress {
  try {
    const value = JSON.parse(localStorage.getItem(keyFor(childId)) ?? 'null') as Partial<FruitShopProgress> | null;
    if (!value || !Array.isArray(value.sessions)) return { ...EMPTY };
    return {
      sessions: value.sessions.filter((item): item is FruitShopSessionRecord => !!item && typeof item.playedAt === 'number').slice(0, 50),
      stickers: Array.isArray(value.stickers) ? [...new Set(value.stickers)] : [],
      decorations: Array.isArray(value.decorations) ? [...new Set(value.decorations)] : [],
      suggestedLevel: value.suggestedLevel === 2 || value.suggestedLevel === 3 ? value.suggestedLevel : 1,
      reopening: readReopening(value.reopening),
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
    reopening: previous.reopening,
  };
  try { localStorage.setItem(keyFor(childId), JSON.stringify(next)); } catch { /* 存储不可用时不阻塞结算 */ }
  return { progress: next, newSticker, newDecoration };
}

/** 开张成果独立保存，结算新订单时继续保留这块招牌。 */
export function saveFruitShopReopening(childId: string, reopening: FruitShopReopening): FruitShopProgress {
  const valid = readReopening(reopening);
  if (!valid) throw new Error('水果店开张成果不完整');
  const next = { ...readFruitShopProgress(childId), reopening: valid };
  try { localStorage.setItem(keyFor(childId), JSON.stringify(next)); } catch { /* 存储不可用时仍可继续体验 */ }
  return next;
}
