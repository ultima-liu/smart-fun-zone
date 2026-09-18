import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '../store';
import { DAILY_TASKS, WEEKLY_TASKS } from '../tasks';

describe('learning task design', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses explicit learning, archive, and store actions instead of game-count goals', () => {
    expect(DAILY_TASKS).toHaveLength(8);
    expect(WEEKLY_TASKS).toHaveLength(5);
    [...DAILY_TASKS, ...WEEKLY_TASKS].forEach((task) => {
      expect(task.title).not.toMatch(/游戏|玩\s*\d/);
      expect(task.go).not.toBe('/lobby');
    });
  });

  it('counts distinct learning days and course review within the current week', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-20T12:00:00'));
    const original = useStore.getState();
    useStore.setState({
      pointLog: {
        taskKid: [
          { id: 'prac:math-lab-numbers:Sun Sep 20 2026', time: new Date('2026-09-16T09:00:00').getTime(), amount: 1, reason: '练习达标', childId: 'taskKid' },
          { id: 'prac:chinese-g1-a-1-1:Sun Sep 20 2026', time: new Date('2026-09-18T09:00:00').getTime(), amount: 1, reason: '练习达标', childId: 'taskKid' },
        ],
      },
    });
    const state = useStore.getState();

    expect(WEEKLY_TASKS.find((task) => task.id === 'w-math-course')?.progress(state, 'taskKid')).toBe(1);
    expect(WEEKLY_TASKS.find((task) => task.id === 'w-chinese-course')?.progress(state, 'taskKid')).toBe(1);
    useStore.setState(original, true);
  });
});
