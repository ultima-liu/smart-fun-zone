import { describe, it, expect } from 'vitest';
import {
  childTotalStars,
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
    gameId: 'number-farm',
    level: 1,
    stars: 2,
    correct: 8,
    total: 10,
    durationSec: 120,
    playedAt: Date.now(),
    ...over,
  };
}

describe('store 辅助函数', () => {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const records: GameRecord[] = [
    rec({ id: 'a', childId: 'c1', stars: 3, durationSec: 60, playedAt: now }),
    rec({ id: 'b', childId: 'c1', stars: 2, durationSec: 90, playedAt: now - day }),
    rec({ id: 'c', childId: 'c1', stars: 1, durationSec: 30, playedAt: now - day * 2 }),
    rec({ id: 'd', childId: 'c2', stars: 3, playedAt: now }),
  ];

  it('childRecords 按孩子过滤', () => {
    expect(childRecords(records, 'c1')).toHaveLength(3);
    expect(childRecords(records, 'c2')).toHaveLength(1);
  });

  it('childTotalStars 求和', () => {
    expect(childTotalStars(records, 'c1')).toBe(6);
    expect(childTotalStars(records, 'c2')).toBe(3);
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
