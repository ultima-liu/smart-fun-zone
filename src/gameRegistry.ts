import type { ComponentType } from 'react';
import type { GameProps } from './types';

/** 乐园街机游戏定义（与课程教学无关的纯休闲游戏） */
export interface GameDef {
  id: string;
  icon: string;
  name: { zh: string; en: string };
  desc: { zh: string; en: string };
  /** 玩法规则（开局说明卡逐条展示，也是语音讲解词；末条写明怎么结束/时长） */
  rules: { zh: string[]; en: string[] };
  /** 一局标准时长（秒），游戏内随时间提速 */
  durationSec: number;
  /** 非计时局（如记忆配对：清完全牌即结束），说明与卡片不显示秒数 */
  untimed?: boolean;
  /** 乐园设施卡片主色 */
  color: string;
  status: 'ready' | 'soon';
  Component?: ComponentType<GameProps>;
}

const registry = new Map<string, GameDef>();

export function registerGame(def: GameDef): void {
  registry.set(def.id, def);
}

export function getGame(id: string): GameDef | undefined {
  return registry.get(id);
}

export function listGames(): GameDef[] {
  return [...registry.values()];
}
