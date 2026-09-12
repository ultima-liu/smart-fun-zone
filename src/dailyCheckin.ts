export interface DailyCheckinState {
  lastDate: string;
  streak: number;
  total: number;
}

export interface CheckinReward {
  beans: number;
  stardust: number;
}

/** 本地日历日，避免 UTC 在凌晨把“今日”误判为前一天。 */
export function localDayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 周一为 0、周日为 6，用于签到星历按真实星期定位。 */
export function localWeekdayIndex(now = new Date()): number {
  return (now.getDay() + 6) % 7;
}

function previousDayKey(now: Date): string {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return localDayKey(yesterday);
}

export function rewardForCheckinStreak(streak: number): CheckinReward {
  if (streak > 0 && streak % 7 === 0) return { beans: 20, stardust: 3 };
  if (streak > 0 && streak % 3 === 0) return { beans: 10, stardust: 0 };
  return { beans: 5, stardust: 0 };
}

/** 返回本次签到后的状态；同一天重复签到返回 null。 */
export function nextDailyCheckin(previous: DailyCheckinState | undefined, now = new Date()): { state: DailyCheckinState; reward: CheckinReward } | null {
  const today = localDayKey(now);
  if (previous?.lastDate === today) return null;
  const streak = previous?.lastDate === previousDayKey(now) ? previous.streak + 1 : 1;
  return {
    state: { lastDate: today, streak, total: (previous?.total ?? 0) + 1 },
    reward: rewardForCheckinStreak(streak),
  };
}
