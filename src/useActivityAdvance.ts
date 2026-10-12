import { useEffect, useRef } from 'react';

/** A fresh completion advances once; viewing a completed task never triggers a jump. */
export function useActivityAdvance(key: string, completed: boolean[], selected: number, onSelect: (index: number) => void) {
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const signature = JSON.stringify(completed);
  const previous = useRef({ key, signature, selected });
  const pending = useRef<{ key: string; from: number; deadline: number } | null>(null);
  useEffect(() => {
    const before = previous.current;
    previous.current = { key, signature, selected };
    if (before.key !== key || before.selected !== selected) { pending.current = null; return; }
    const old = JSON.parse(before.signature) as boolean[];
    const current = JSON.parse(signature) as boolean[];
    if (!current[selected]) { pending.current = null; return; }
    if (old[selected] && !pending.current) return;
    const next = current.findIndex((done, index) => index > selected && !done);
    if (next < 0) { pending.current = null; return; }
    // A sibling can finish during the feedback delay. Keep the original deadline
    // instead of losing the pending jump when the completion array changes.
    const attempt = pending.current ?? { key, from: selected, deadline: Date.now() + 750 };
    pending.current = attempt;
    const timer = window.setTimeout(() => { pending.current = null; selectRef.current(next); }, Math.max(0, attempt.deadline - Date.now()));
    // Children may finish and immediately ask to repeat before the delayed jump.
    const repeat = (event: Event) => { if (event.target instanceof Element && event.target.closest('[data-practice-restart]')) { pending.current = null; window.clearTimeout(timer); } };
    document.addEventListener('click', repeat);
    return () => { window.clearTimeout(timer); document.removeEventListener('click', repeat); };
  }, [key, selected, signature]);
}
