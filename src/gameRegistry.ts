import type { ComponentType } from 'react';
import type { SubjectId, GameGenre, GameProps } from './types';

export interface GameDef {
  id: string;
  icon: string;
  name: { zh: string; en: string };
  category: SubjectId;
  /** 大厅玩法分组（count/match/find/listen/think），非学科 */
  genre: GameGenre;
  desc: { zh: string; en: string };
  levels: number;
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
