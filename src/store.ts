import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChildProfile, GameRecord, Lang } from './types';

export interface MasteryState {
  stars: number;
  gold: boolean;
  updatedAt: number;
}

interface AppState {
  lang: Lang;
  sound: boolean;
  musicOn: boolean;
  voiceOn: boolean;
  /** 家长设置：演示页可跳过（默认强制先看） */
  lessonSkipOn: boolean;
  profiles: ChildProfile[];
  activeChildId: string | null;
  records: GameRecord[];
  /** 知识点掌握度：childId → skillId → 状态 */
  mastery: Record<string, Record<string, MasteryState>>;
  /** 课程学习进度：skillId → 已完成步骤数（0-3，第 4 步=练习由 mastery 体现） */
  lessonProgress: Record<string, number>;
  /** 字卡袋：childId → 已收集汉字 */
  charBag: Record<string, string[]>;
  parentPin: string;
  dailyLimitMin: number;
  setLang: (l: Lang) => void;
  toggleSound: () => void;
  setMusicOn: (v: boolean) => void;
  setVoiceOn: (v: boolean) => void;
  setLessonSkipOn: (v: boolean) => void;
  addProfile: (p: ChildProfile) => void;
  removeProfile: (id: string) => void;
  setActiveChild: (id: string | null) => void;
  addRecord: (r: GameRecord) => void;
  /** 知识点练习达标（正确率≥80%）：+1 星，满 3 星转金色 */
  addSkillResult: (childId: string, skillId: string) => void;
  /** 完成一个学习步骤（看课文/听读/认生字），封顶 3 */
  completeLessonStep: (skillId: string) => void;
  /** 把本课生字收进字卡袋（去重） */
  collectChars: (childId: string, chars: string[]) => void;
  setParentPin: (pin: string) => void;
  setDailyLimit: (min: number) => void;
  clearAll: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      lang: 'zh',
      sound: true,
      musicOn: true,
      voiceOn: true,
      lessonSkipOn: false,
      profiles: [],
      activeChildId: null,
      records: [],
      mastery: {},
      lessonProgress: {},
      charBag: {},
      parentPin: '1234',
      dailyLimitMin: 0,
      setLang: (lang) => set({ lang }),
      toggleSound: () => set((s) => ({ sound: !s.sound })),
      setMusicOn: (musicOn) => set({ musicOn }),
      setVoiceOn: (voiceOn) => set({ voiceOn }),
      setLessonSkipOn: (lessonSkipOn) => set({ lessonSkipOn }),
      addProfile: (p) => set((s) => ({ profiles: [...s.profiles, p] })),
      removeProfile: (id) =>
        set((s) => ({
          profiles: s.profiles.filter((p) => p.id !== id),
          records: s.records.filter((r) => r.childId !== id),
          activeChildId: s.activeChildId === id ? null : s.activeChildId,
        })),
      setActiveChild: (activeChildId) => set({ activeChildId }),
      addRecord: (r) => set((s) => ({ records: [...s.records, r] })),
      addSkillResult: (childId, skillId) =>
        set((s) => {
          const childMap = { ...(s.mastery[childId] ?? {}) };
          const prev = childMap[skillId] ?? { stars: 0, gold: false, updatedAt: 0 };
          const stars = Math.min(3, prev.stars + 1);
          const gold = stars >= 3;
          childMap[skillId] = { stars, gold, updatedAt: Date.now() };
          return { mastery: { ...s.mastery, [childId]: childMap } };
        }),
      completeLessonStep: (skillId) =>
        set((s) => ({
          lessonProgress: { ...s.lessonProgress, [skillId]: Math.min(3, (s.lessonProgress[skillId] ?? 0) + 1) },
        })),
      collectChars: (childId, chars) =>
        set((s) => {
          const bag = new Set(s.charBag[childId] ?? []);
          chars.forEach((c) => bag.add(c));
          return { charBag: { ...s.charBag, [childId]: [...bag] } };
        }),
      setParentPin: (parentPin) => set({ parentPin }),
      setDailyLimit: (dailyLimitMin) => set({ dailyLimitMin }),
      clearAll: () => set({ profiles: [], records: [], activeChildId: null, mastery: {} }),
    }),
    { name: 'smart-fun-zone' },
  ),
);

export function childRecords(records: GameRecord[], childId: string): GameRecord[] {
  return records.filter((r) => r.childId === childId);
}

export function childTotalStars(records: GameRecord[], childId: string): number {
  return childRecords(records, childId).reduce((sum, r) => sum + r.stars, 0);
}

export function starsForGame(records: GameRecord[], childId: string, gameId: string): number {
  const list = childRecords(records, childId).filter((r) => r.gameId === gameId);
  return list.length === 0 ? 0 : Math.max(...list.map((r) => r.stars));
}

export function todayPlaySec(records: GameRecord[], childId: string): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return childRecords(records, childId)
    .filter((r) => r.playedAt >= start.getTime())
    .reduce((sum, r) => sum + r.durationSec, 0);
}

/* ---------- 成长系统辅助 ---------- */

export function todayRecords(records: GameRecord[], childId: string): GameRecord[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return childRecords(records, childId).filter((r) => r.playedAt >= start.getTime());
}

export function todayStars(records: GameRecord[], childId: string): number {
  return todayRecords(records, childId).reduce((s, r) => s + r.stars, 0);
}

export function todayGameKinds(records: GameRecord[], childId: string): number {
  return new Set(todayRecords(records, childId).map((r) => r.gameId)).size;
}

export function streakDays(records: GameRecord[], childId: string): number {
  const days = new Set(
    childRecords(records, childId).map((r) => new Date(r.playedAt).toDateString()),
  );
  let streak = 0;
  const d = new Date();
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export interface GardenStage {
  stage: number;
  g: string;
  labelKey: string;
}

export function gardenStage(totalStars: number): GardenStage {
  if (totalStars >= 60) return { stage: 5, g: '🌳🍎', labelKey: 'gardenBigTree' };
  if (totalStars >= 30) return { stage: 4, g: '🌳', labelKey: 'gardenTree' };
  if (totalStars >= 16) return { stage: 3, g: '🌷', labelKey: 'gardenFlower' };
  if (totalStars >= 6) return { stage: 2, g: '🌿', labelKey: 'gardenSprout' };
  return { stage: 1, g: '🌱', labelKey: 'gardenSeed' };
}

/* ---------- 知识点掌握度辅助 ---------- */

export function skillState(
  mastery: Record<string, Record<string, MasteryState>>,
  childId: string,
  skillId: string,
): MasteryState {
  return mastery[childId]?.[skillId] ?? { stars: 0, gold: false, updatedAt: 0 };
}

export function litSkillCount(
  mastery: Record<string, Record<string, MasteryState>>,
  childId: string,
): number {
  return Object.values(mastery[childId] ?? {}).filter((m) => m.stars >= 1).length;
}

export function goldSkillCount(
  mastery: Record<string, Record<string, MasteryState>>,
  childId: string,
): number {
  return Object.values(mastery[childId] ?? {}).filter((m) => m.gold).length;
}
