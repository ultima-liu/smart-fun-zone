import { describe, it, expect } from 'vitest';
import { listGames, getGame } from '../games';
import { SUBJECTS, GAME_GENRES } from '../types';

describe('游戏注册表', () => {
  const games = listGames();

  it('12 个游戏全部注册且状态 ready', () => {
    expect(games).toHaveLength(12);
    for (const g of games) {
      expect(g.status, `${g.id} 未就绪`).toBe('ready');
    }
  });

  it('id 唯一、学科合法、玩法分类合法', () => {
    const ids = games.map((g) => g.id);
    expect(new Set(ids).size).toBe(12);
    const subjectIds = SUBJECTS.map((s) => s.id);
    const genreIds = GAME_GENRES.map((s) => s.id);
    for (const g of games) {
      expect(subjectIds).toContain(g.category);
      expect(genreIds, `${g.id} 缺玩法分类`).toContain(g.genre);
    }
  });

  it('每个 ready 游戏都有组件与 5 个关卡', () => {
    for (const g of games) {
      expect(g.Component, `${g.id} 缺组件`).toBeTruthy();
      expect(g.levels, `${g.id} 关卡数`).toBe(5);
    }
  });

  it('getGame 按 id 查询', () => {
    expect(getGame('number-farm')?.name.zh).toBe('数字农场');
    expect(getGame('not-exist')).toBeUndefined();
  });
});
