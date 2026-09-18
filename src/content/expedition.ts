import { CATALOG } from '../points';

/**
 * 常驻远征战利品系统 · 掉落池与累积规则
 *  - 远征队按时间挂机累积「补给包」，每包即一次收取的奖励单位
 *  - 战利品范围：卷卷豆(常驻) + 星屑·飞船升级材料(常驻) + 装扮(稀有)
 */

/** 每 5 分钟完成 1 个远征周期，产出 1 个补给包 */
export const LOOT_INTERVAL_MS = 5 * 60 * 1000;
/** 累积（挂机）上限 240 个周期 ≈ 20 小时，满后停止累积 */
export const LOOT_MAX_PACKS = 240;

/** 每包固定产出：卷卷豆 ↑ 星屑(飞船升级材料) */
export const LOOT_PACK_BEANS = 4;
export const LOOT_PACK_STARDUST = 2;
/** 每包概率掉落：装扮（稀有） */
export const LOOT_OUTFIT_CHANCE = 0.08;

export interface LootDrop {
  /** 卷星币（积分） */
  beans: number;
  /** 星屑（飞船升级材料） */
  stardust: number;
  /** 随机装扮（免费获得，对应 CATALOG.kind=outfit 的 id） */
  outfits: string[];
}

/** 按上次收取时间算出当前可收取的补给包数（受上限封顶，0 表示还没攒够） */
export function pendingPacks(lastAt: number | undefined, now: number): number {
  if (!lastAt) return 0;
  const packs = Math.floor((now - lastAt) / LOOT_INTERVAL_MS);
  return Math.min(LOOT_MAX_PACKS, Math.max(0, packs));
}

/** 按补给包数抽取本次战利品（每包独立随机） */
export function drawLoot(packs: number): LootDrop {
  const drop: LootDrop = { beans: 0, stardust: 0, outfits: [] };
  const outfits = CATALOG.filter((i) => i.kind === 'outfit');
  for (let i = 0; i < packs; i++) {
    drop.beans += LOOT_PACK_BEANS;
    drop.stardust += LOOT_PACK_STARDUST;
    if (Math.random() < LOOT_OUTFIT_CHANCE && outfits.length > 0) {
      const o = outfits[Math.floor(Math.random() * outfits.length)];
      if (!drop.outfits.includes(o.id)) drop.outfits.push(o.id);
    }
  }
  return drop;
}
