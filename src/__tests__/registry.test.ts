import { describe, it, expect } from 'vitest';
import { listGames, getGame } from '../games';

describe('乐园街机游戏注册表', () => {
  const games = listGames();

  it('7 个纯休闲游戏全部注册且状态 ready', () => {
    expect(games).toHaveLength(7);
    for (const g of games) {
      expect(g.status, `${g.id} 未就绪`).toBe('ready');
    }
  });

  it('id 唯一、时长与主色齐备', () => {
    const ids = games.map((g) => g.id);
    expect(new Set(ids).size).toBe(7);
    for (const g of games) {
      expect(g.durationSec, `${g.id} 缺一局时长`).toBeGreaterThan(0);
      expect(g.color, `${g.id} 缺主色`).toMatch(/^#/);
    }
  });

  it('每个 ready 游戏都有组件', () => {
    for (const g of games) {
      expect(g.Component, `${g.id} 缺组件`).toBeTruthy();
    }
  });

  it('getGame 按 id 查询', () => {
    expect(getGame('bubble-pop')?.name.zh).toBe('泡泡打打');
    expect(getGame('not-exist')).toBeUndefined();
  });
});
