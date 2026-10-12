import { useState, type Dispatch, type SetStateAction } from 'react';

/** Completed progress remains saved; repeat attempts use a separate, local draft. */
export function usePracticeAttempt<T>(saved: T, save: (value: T | ((previous: T) => T)) => void, initial: T, isComplete: (value: T) => boolean, cycle = true) {
  const [draft, setDraft] = useState(initial);
  const complete = isComplete(saved);
  const value = complete ? draft : saved;
  const setValue: Dispatch<SetStateAction<T>> = next => {
    if (!complete) { save(next); return; }
    setDraft(previous => {
      const result = typeof next === 'function' ? (next as (value: T) => T)(previous) : next;
      return cycle && isComplete(result) ? initial : result;
    });
  };
  return [value, setValue, complete, () => setDraft(initial)] as const;
}

/** Finite task rounds stop at completion and restart only through an explicit action. */
export function useFinitePracticeAttempt<T>(saved: T, save: (value: T | ((previous: T) => T)) => void, initial: T, isComplete: (value: T) => boolean) {
  const [draft, setDraft] = useState<{ value: T } | null>(null);
  const complete = isComplete(saved);
  const value = draft ? draft.value : saved;
  const roundComplete = isComplete(value);
  const setValue: Dispatch<SetStateAction<T>> = next => {
    if (roundComplete) return;
    if (!complete) { save(next); return; }
    setDraft(previous => {
      const current = previous ? previous.value : saved;
      return { value: typeof next === 'function' ? (next as (value: T) => T)(current) : next };
    });
  };
  return [value, setValue, complete, () => setDraft({ value: initial }), roundComplete] as const;
}

/** Preserve the existing math API; both subjects share the finite-round behavior. */
export const useMathPracticeAttempt = useFinitePracticeAttempt;
