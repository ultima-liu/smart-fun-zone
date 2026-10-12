import { useFinitePracticeAttempt, usePracticeAttempt } from './usePracticeAttempt';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useStore } from './store';
const prefix = (childId: string | null, lessonId: string) => `sfz-chinese-practice-v1:${childId ?? 'guest'}:${lessonId}:`;
/** Read a child task's real progress without introducing a second writer for that field. */
export function readChinesePracticeIndex(childId: string | null, lessonId: string, field: string): number {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(prefix(childId, lessonId) + field) ?? '0');
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
  } catch { return 0; }
}
/** 会话组件按儿童和课时重挂载；细项断点不与能力证据混用。 */
export function useChinesePracticeState<T>(lessonId: string, field: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const childId = useStore((state) => state.activeChildId);
  const key = prefix(childId, lessonId) + field;
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return initial;
      const parsed = JSON.parse(raw);
      if (initial instanceof Set) return (Array.isArray(parsed) ? new Set(parsed) : initial) as T;
      if (Array.isArray(initial)) return (Array.isArray(parsed) ? parsed : initial) as T;
      if (typeof initial === 'number') return typeof parsed === 'number' && Number.isInteger(parsed) && parsed >= 0 ? parsed as T : initial;
      if (initial === null) return (parsed === null || typeof parsed === 'string') ? parsed as T : initial;
      return typeof parsed === typeof initial ? parsed as T : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value instanceof Set ? [...value] : value)); } catch { /* 存储不可用时正常练习 */ }
  }, [key, value]);
  return [value, setValue];
}
export function clearChinesePracticeState(childId: string | null, lessonId: string) {
  try {
    const root = prefix(childId, lessonId);
    const keys = Object.keys(localStorage).filter((key) => key.startsWith(root));
    keys.forEach((key) => localStorage.removeItem(key));
  } catch { /* 不阻塞完成课程 */ }
}

/** Keep the verified index for progress checks while restarting the visible questions. */
export function useRepeatableChineseSequence(lessonId: string, field: string, total: number) {
  const [saved, save] = useChinesePracticeState(lessonId, field, 0);
  return usePracticeAttempt(saved, save, 0, value => total > 0 && value >= total);
}

/** A completed recognition round stays finished until the child explicitly restarts it. */
export function useFiniteChineseSequence(lessonId: string, field: string, total: number) {
  const [saved, save] = useChinesePracticeState(lessonId, field, 0);
  return useFinitePracticeAttempt(saved, save, 0, value => total > 0 && value >= total);
}
