import { describe, it, expect } from 'vitest';
import {
  bestScoreForGame,
  gamePlayStats,
  childRecords,
  streakDays,
  todayPlaySec,
  gardenStage,
  useStore,
} from '../store';
import type { GameRecord } from '../types';

function rec(over: Partial<GameRecord>): GameRecord {
  return {
    id: 'r1',
    childId: 'c1',
    gameId: 'bubble-pop',
    level: 1,
    stars: 0,
    correct: 0,
    total: 0,
    durationSec: 60,
    playedAt: Date.now(),
    ...over,
  };
}

describe('store 辅助函数', () => {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const records: GameRecord[] = [
    rec({ id: 'a', childId: 'c1', score: 120, durationSec: 60, playedAt: now }),
    rec({ id: 'b', childId: 'c1', score: 80, durationSec: 90, playedAt: now - day }),
    rec({ id: 'c', childId: 'c1', score: 200, durationSec: 30, playedAt: now - day * 2 }),
    rec({ id: 'd', childId: 'c2', score: 50, playedAt: now }),
  ];

  it('childRecords 按孩子过滤', () => {
    expect(childRecords(records, 'c1')).toHaveLength(3);
    expect(childRecords(records, 'c2')).toHaveLength(1);
  });

  it('bestScoreForGame 取街机最高分', () => {
    expect(bestScoreForGame(records, 'c1', 'bubble-pop')).toBe(200);
    expect(bestScoreForGame(records, 'c2', 'bubble-pop')).toBe(50);
    expect(bestScoreForGame(records, 'c1', 'not-exist')).toBe(0);
  });

  it('gamePlayStats 统计局数与总时长', () => {
    expect(gamePlayStats(records, 'c1', 'bubble-pop')).toEqual({ rounds: 3, totalSec: 180 });
    expect(gamePlayStats(records, 'c1', 'not-exist')).toEqual({ rounds: 0, totalSec: 0 });
  });

  it('streakDays 计算连续打卡天数', () => {
    expect(streakDays(records, 'c1')).toBe(3);
    expect(streakDays(records, 'c2')).toBe(1);
    expect(streakDays(records, 'nobody')).toBe(0);
  });

  it('todayPlaySec 只统计今天', () => {
    expect(todayPlaySec(records, 'c1')).toBe(60);
  });

  it('gardenStage 随星星数成长', () => {
    expect(gardenStage(0).stage).toBe(1);
    expect(gardenStage(10).stage).toBe(2);
    expect(gardenStage(20).stage).toBe(3);
    expect(gardenStage(40).stage).toBe(4);
    expect(gardenStage(80).stage).toBe(5);
  });

  it('云端剧情仅用较新的存档恢复，并支持跨端重置', () => {
    useStore.setState({
      storyDone: { c1: ['p1', 'c1-1'] },
      storyRewardClaimed: { c1: ['p1'] },
      storyUpdatedAt: { c1: 100 },
    });
    useStore.getState().applyCloudStory('c1', { done: [], rewardClaimed: [], updatedAt: 200 });
    expect(useStore.getState().storyDone.c1).toEqual([]);
    expect(useStore.getState().storyRewardClaimed.c1).toEqual([]);

    useStore.getState().applyCloudStory('c1', { done: ['p1'], rewardClaimed: ['p1'], updatedAt: 150 });
    expect(useStore.getState().storyDone.c1).toEqual([]);
  });
});
