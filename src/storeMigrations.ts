import { localDayKey } from './dailyCheckin';
import { STAR_CARDS } from './content/starCards';
import type { ActiveSubject } from './activeCourses';
import type { AppState } from './store';

/** Zustand 持久化结构迁移集中维护；只做数据形状转换，不触发业务副作用。 */
export function migrateAppState(persistedState: unknown, version: number): AppState {
  let state = persistedState as Partial<AppState>;
  if (version < 1) {
    const npcCardIds = new Set(STAR_CARDS.filter((card) => card.setId === 'npc').map((card) => card.id));
    const archivedCards = Object.fromEntries(Object.entries(state.archivedCards ?? {}).map(([childId, cardIds]) => [childId, (cardIds ?? []).filter((cardId) => !npcCardIds.has(cardId))]));
    const cardRewardClaimed = Object.fromEntries(Object.entries(state.cardRewardClaimed ?? {}).map(([childId, setIds]) => [childId, (setIds ?? []).filter((setId) => setId !== 'npc')]));
    state = { ...state, archivedCards, cardRewardClaimed };
  }
  if (version < 2) {
    const oldBadge = (id: string) => id.startsWith('b-');
    const ownedItems = Object.fromEntries(Object.entries(state.ownedItems ?? {}).map(([childId, itemIds]) => [childId, (itemIds ?? []).filter((id) => !oldBadge(id))]));
    const equipped = Object.fromEntries(Object.entries(state.equipped ?? {}).map(([childId, current]) => {
      const remaining = { ...(current ?? {}) };
      delete remaining.badge;
      return [childId, remaining];
    }));
    const storeOverrides = Object.fromEntries(Object.entries(state.storeOverrides ?? {}).filter(([itemId]) => !oldBadge(itemId)));
    state = { ...state, ownedItems, equipped, storeOverrides, showBadges: {}, badges: {} };
  }
  if (version < 3) {
    const materials = Object.fromEntries(Object.entries(state.materials ?? {}).map(([childId, material]) => [
      childId,
      { stardust: (material as { stardust?: number }).stardust ?? 0 },
    ]));
    state = { ...state, materials };
  }
  if (version < 4) {
    const customTasks = Object.fromEntries(Object.entries(state.customTasks ?? {}).map(([childId, list]) => [
      childId,
      ((list ?? []) as unknown as Array<Record<string, unknown>>).map((task) => ({
        ...task,
        repeat: (task.repeat as string) ?? 'once',
        judge: (task.judge as string) ?? 'parent',
        doneDays: task.done ? [localDayKey(new Date(typeof task.doneAt === 'number' ? task.doneAt : Date.now()))] : [],
        pendingDays: [],
      })),
    ]));
    state = { ...state, customTasks } as unknown as Partial<AppState>;
  }
  if (version < 5) {
    // 新手剧情系统已下线：清除旧本地存档里残留的剧情进度字段。
    const legacy = state as Partial<AppState> & {
      storyDone?: unknown; storyRewardClaimed?: unknown; storyUpdatedAt?: unknown; storyPulse?: unknown;
    };
    delete legacy.storyDone;
    delete legacy.storyRewardClaimed;
    delete legacy.storyUpdatedAt;
    delete legacy.storyPulse;
    state = legacy;
  }
  if (version < 6) {
    state = { ...state, taskStates: state.taskStates ?? {} };
  }
  if (version < 7) {
    const taskStates = Object.fromEntries(Object.entries(state.taskStates ?? {}).map(([childId, taskState]) => [
      childId,
      { ...taskState, lessonCompletedAt: taskState.lessonCompletedAt ?? {}, courseMails: taskState.courseMails ?? {} },
    ]));
    state = { ...state, taskStates, courseSchedule: state.courseSchedule ?? [] };
  }
  if (version < 8) {
    type LegacySchedule = { id?: string; date?: string; grade?: string; subject?: string; lessonId?: string; reward?: number };
    const legacy = (state.courseSchedule ?? []) as unknown as LegacySchedule[];
    const validSubjects = new Set<ActiveSubject>(['math', 'chinese', 'english']);
    const weekly = new Map<string, { id: string; grade: string; weekday: 1 | 2 | 3 | 4 | 5; subjects: ActiveSubject[] }>();
    const legacyById = new Map(legacy.filter((entry) => entry.id).map((entry) => [entry.id!, entry]));
    for (const entry of legacy) {
      if (!entry.date || !entry.grade || !entry.subject || !validSubjects.has(entry.subject as ActiveSubject)) continue;
      const weekday = new Date(`${entry.date}T12:00:00`).getDay();
      if (weekday < 1 || weekday > 5) continue;
      const id = `${entry.grade}:weekday:${weekday}`;
      const current = weekly.get(id) ?? { id, grade: entry.grade, weekday: weekday as 1 | 2 | 3 | 4 | 5, subjects: [] };
      const subject = entry.subject as ActiveSubject;
      if (!current.subjects.includes(subject)) current.subjects.push(subject);
      weekly.set(id, current);
    }
    const taskStates = Object.fromEntries(Object.entries(state.taskStates ?? {}).map(([childId, taskState]) => {
      const courseMails = Object.fromEntries(Object.entries(taskState.courseMails ?? {}).map(([mailId, progress]) => {
        const old = legacyById.get(mailId);
        return [mailId, old ? { ...progress, date: old.date, subject: old.subject as ActiveSubject, lessonId: old.lessonId, reward: old.reward } : progress];
      }));
      return [childId, { ...taskState, courseMails }];
    }));
    state = { ...state, taskStates, courseSchedule: [...weekly.values()] as AppState['courseSchedule'] };
  }
  return state as AppState;
}
