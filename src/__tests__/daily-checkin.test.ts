import { describe, expect, it } from 'vitest';
import { localDayKey, localWeekdayIndex, nextDailyCheckin, rewardForCheckinStreak } from '../dailyCheckin';

describe('daily check-in', () => {
  it('uses the local calendar day key', () => {
    expect(localDayKey(new Date(2026, 8, 12, 0, 5))).toBe('2026-09-12');
  });

  it('maps the real weekday with Monday first', () => {
    expect(localWeekdayIndex(new Date(2026, 8, 7))).toBe(0);
    expect(localWeekdayIndex(new Date(2026, 8, 12))).toBe(5);
    expect(localWeekdayIndex(new Date(2026, 8, 13))).toBe(6);
  });

  it('starts a streak and prevents a second claim on the same day', () => {
    const first = nextDailyCheckin(undefined, new Date(2026, 8, 12, 10));
    expect(first).toEqual({
      state: { lastDate: '2026-09-12', streak: 1, total: 1 },
      reward: { beans: 5, stardust: 0 },
    });
    expect(nextDailyCheckin(first?.state, new Date(2026, 8, 12, 23))).toBeNull();
  });

  it('continues yesterday’s streak and resets after a missed day', () => {
    const continued = nextDailyCheckin({ lastDate: '2026-09-11', streak: 2, total: 2 }, new Date(2026, 8, 12));
    expect(continued?.state).toEqual({ lastDate: '2026-09-12', streak: 3, total: 3 });
    expect(continued?.reward).toEqual({ beans: 10, stardust: 0 });

    const reset = nextDailyCheckin({ lastDate: '2026-09-10', streak: 6, total: 6 }, new Date(2026, 8, 12));
    expect(reset?.state).toEqual({ lastDate: '2026-09-12', streak: 1, total: 7 });
  });

  it('gives the third- and seventh-day bonuses', () => {
    expect(rewardForCheckinStreak(3)).toEqual({ beans: 10, stardust: 0 });
    expect(rewardForCheckinStreak(7)).toEqual({ beans: 20, stardust: 3 });
    expect(rewardForCheckinStreak(8)).toEqual({ beans: 5, stardust: 0 });
  });
});
