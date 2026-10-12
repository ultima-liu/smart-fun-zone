import { withCourseAudioOwner } from './courseAudioPlayback';
import { useCallback, useEffect, useId, useRef, useState, type RefObject } from 'react';
import { speakOnce, stopSpeaking } from './speech';
import { useStore } from './store';
import { speechCaptureActive } from './speechCapture';
export const LESSON_NARRATION_START = 'lesson-narration-start';
export const LESSON_NARRATION_END = 'lesson-narration-end';
export const LESSON_NARRATION_CANCEL = 'lesson-narration-cancel';
const defaultPlay = (text: string, onEnd?: (played: boolean) => void) => speakOnce(text, 'zh', .86, onEnd);

/** A leaf entry reads once. Value, completion and layout changes do not count as another entry. */
export function useLessonTabNarration(rootRef: RefObject<HTMLElement>, scope: string, resolveLeaf: (root: HTMLElement) => HTMLElement | null, readText: (leaf: HTMLElement) => string, play: (text: string, onEnd?: (played: boolean) => void) => void = defaultPlay, stop: () => void = stopSpeaking) {
  const playbackOwner = useId();
  const sound = useStore(state => state.sound);
  const voiceOn = useStore(state => state.voiceOn);
  const enabled = sound && voiceOn;
  const [available, setAvailable] = useState(false);
  const [explanation, setExplanation] = useState(false);
  const generation = useRef(0);
  const session = useRef<{ leaf: HTMLElement | null; key: string; played: boolean; unavailable: boolean }>({ leaf: null, key: '', played: false, unavailable: false });
  const gesture = useRef(false);
  const playLeaf = useCallback((leaf: HTMLElement, text: string) => {
    const token = ++generation.current;
    leaf.dispatchEvent(new Event(LESSON_NARRATION_START));
    withCourseAudioOwner(playbackOwner, () => play(text, played => {
      if (token !== generation.current || session.current.leaf !== leaf || leaf.closest('[hidden],[aria-hidden="true"]') || !rootRef.current?.contains(leaf)) return;
      leaf.dispatchEvent(new CustomEvent(LESSON_NARRATION_END, { detail: { played } }));
    }));
  }, [play, playbackOwner, rootRef]);
  const replay = useCallback(() => {
    const root = rootRef.current;
    const leaf = root && !root.closest('[hidden],[aria-hidden="true"]') ? resolveLeaf(root) : null;
    if (!enabled || !leaf || speechCaptureActive()) return;
    const text = readText(leaf);
    if (!text) return;
    gesture.current = true;
    session.current.played = true;
    playLeaf(leaf, text);
  }, [enabled, playLeaf, readText, resolveLeaf, rootRef]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let timer = 0;
    session.current = { leaf: null, key: '', played: false, unavailable: false };
    const refresh = () => {
      const leaf = root.closest('[hidden],[aria-hidden="true"]') ? null : resolveLeaf(root);
      const key = `${scope}:${leaf?.dataset.mathNarrationKey ?? leaf?.dataset.chineseNarrationKey ?? leaf?.dataset.englishNarrationKey ?? ''}`;
      if (session.current.leaf !== leaf || session.current.key !== key) {
        window.clearTimeout(timer);
        generation.current++;
        session.current.leaf?.dispatchEvent(new Event(LESSON_NARRATION_CANCEL));
        stop();
        session.current = { leaf, key, played: false, unavailable: false };
      }
      setAvailable(Boolean(leaf && readText(leaf)));
      setExplanation(Boolean(leaf?.hasAttribute('data-lesson-explanation')));
      if (leaf?.hasAttribute('data-lesson-explanation') && !enabled && !session.current.unavailable) {
        session.current.unavailable = true;
        leaf.dispatchEvent(new CustomEvent(LESSON_NARRATION_END, { detail: { played: false } }));
      }
      if (!leaf || !enabled || session.current.played) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (speechCaptureActive()) return;
        if (session.current.leaf !== leaf || session.current.key !== key || session.current.played) return;
        // Direct links can arrive before browser audio activation. Read the current card after the first gesture.
        if (document.querySelector('.boot-splash:not(.exit)')) return;
        if (!gesture.current && !navigator.userActivation?.hasBeenActive) return;
        const text = readText(leaf);
        if (!text) return;
        session.current.played = true;
        playLeaf(leaf, text);
      }, 250);
    };
    const activate = (event: Event) => {
      gesture.current = true;
      // A deliberately requested reading takes precedence over the pending entry reading.
      if (event.target instanceof Element && event.target.closest('[data-tab-audio]')) {
        window.clearTimeout(timer);
        session.current.played = true;
      }
      refresh();
    };
    const observer = new MutationObserver(refresh);
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'data-math-narration-key', 'data-chinese-narration-key', 'data-english-narration-key'] });
    for (let parent = root.parentElement; parent; parent = parent.parentElement) observer.observe(parent, { attributes: true, attributeFilter: ['hidden', 'aria-hidden'] });
    const splash = document.querySelector('.boot-splash');
    if (splash) observer.observe(splash, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('pointerdown', activate);
    window.addEventListener('keydown', activate);
    refresh();
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', activate);
      window.removeEventListener('keydown', activate);
      generation.current++;
      session.current.leaf?.dispatchEvent(new Event(LESSON_NARRATION_CANCEL));
      stop();
    };
  }, [enabled, playLeaf, readText, resolveLeaf, rootRef, scope, stop]);
  return { replay, disabled: !enabled || !available, explanation, playbackOwner };
}
