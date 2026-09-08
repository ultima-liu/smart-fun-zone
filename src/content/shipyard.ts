/**
 * 船坞系统 · 飞船升级
 *  - 星屑(远征战利品·常驻) 作为升级材料
 *  - 升级飞船等级 → 解锁更丰富的奖励（远征产出加成）
 */

/** 升级到下一级所需的星屑/卷星币，随等级增长 */
export interface ShipLevel {
  /** 等级（从 1 起） */
  level: number;
  /** 升级所需星屑 */
  stardust: number;
  /** 升级所需卷星币 */
  beans: number;
  /** 本等级名称 */
  name: { zh: string; en: string };
  /** 本等级说明 */
  desc: { zh: string; en: string };
}

export const SHIP_MAX_LEVEL = 10;

/** 飞船名称随等级变化 */
export const SHIP_NAMES: { zh: string; en: string }[] = [
  { zh: '卷卷号·新手艇', en: 'Juan-1 Starter' },
  { zh: '卷卷号·探索艇', en: 'Juan-2 Explorer' },
  { zh: '卷卷号·巡星艇', en: 'Juan-3 Cruiser' },
  { zh: '卷卷号·远航艇', en: 'Juan-4 Voyager' },
  { zh: '卷卷号·星舰', en: 'Juan-5 Starship' },
  { zh: '卷卷号·旗舰', en: 'Juan-6 Flagship' },
  { zh: '卷卷号·银河舰', en: 'Juan-7 Galaxy' },
  { zh: '卷卷号·光速舰', en: 'Juan-8 Light-Speed' },
  { zh: '卷卷号·星域舰', en: 'Juan-9 Star Realm' },
  { zh: '卷卷号·传奇舰', en: 'Juan-10 Legend' },
];

/** 飞船等级 → 配置（成本 & 名称） */
export function shipConfig(level: number): ShipLevel {
  const idx = Math.min(Math.max(level - 1, 0), SHIP_MAX_LEVEL - 1);
  const name = SHIP_NAMES[idx];
  return {
    level,
    // 成本逐级递增
    stardust: 2 + (level - 1) * 3,
    beans: 5 + (level - 1) * 6,
    name: {
      zh: name.zh,
      en: name.en,
    },
    desc: {
      zh: `升级到第${level}级，远征产出提升。`,
      en: `Upgrade to level ${level}, boosting expedition output.`,
    },
  };
}

/** 飞船等级 → 远征产出加成（每级 +10%；满级 +100%） */
export function shipBoost(level: number): number {
  return 1 + (Math.min(Math.max(level, 1), SHIP_MAX_LEVEL) - 1) * 0.1;
}
