import type { RefObject } from 'react';
import { useLessonTabNarration } from './lessonTabNarration';
import { playChineseReadingAudio, stopChineseReadingAudio } from './chineseReadingAudio';

const visible = (element: Element) => !element.closest('[hidden],[aria-hidden="true"]');
const clean = (value: string) => value.replace(/[✓✔🔊🎤💡]/gu, '').replace(/\s+/g, ' ').trim();
const ordinal = ['一', '二', '三', '四', '五', '六', '七', '八'];
export function chineseNarrationLeaf(root: HTMLElement): HTMLElement | null {
  if (root.querySelector('.ct-challenge-done')) return null;
  const leaves = [...root.querySelectorAll<HTMLElement>('[data-lesson-explanation],[role="tabpanel"],[data-chinese-leaf]')].filter(visible);
  return leaves.find(leaf => !leaves.some(other => other !== leaf && leaf.contains(other))) ?? root;
}
export function chineseNarrationText(leaf: HTMLElement): string {
  if (leaf.dataset.lessonExplanation) return leaf.dataset.lessonExplanation;
  const source = leaf.hasAttribute('data-chinese-narration') ? leaf : leaf.querySelector<HTMLElement>('[data-chinese-narration]');
  const script = source?.dataset.chineseNarration;
  if (source?.dataset.chineseNarrationMode === 'instructions-only') return clean(script ?? '');

  const headings = [...leaf.querySelectorAll('h3,h4,p,:scope > b,:scope > strong')]
    .filter(element => visible(element) && !element.closest('[role="status"],details,.ct-study-explanation,.ct-question-hints,.ct-practice-saved,.ct-ktrail-check > p,.ct-pinyin-check > p,.ct-pinyin-garden-question > p,.ct-practice-policy'))
    .map(element => { const copy = element.cloneNode(true) as HTMLElement; copy.querySelectorAll('button,svg,input,textarea').forEach(item => item.remove()); return clean(copy.textContent ?? ''); }).filter(Boolean);
  const groups = [...leaf.querySelectorAll('.ct-study-options,.ct-challenge-options,.ct-pinyin-choices,.ct-pinyin-check > div,.ct-pinyin-garden-question > div,.ct-ktrail-check > div,.ct-recognition-options,.ct-recognition-check > .ct-practice-actions,.ct-reading-experience > .ct-practice-actions,.ct-transfer-practice > .ct-practice-actions')]
    .filter(visible).map(group => [...group.querySelectorAll('button')].filter(visible).map(button => clean(button.textContent ?? '')).filter(Boolean))
    .filter(options => options.length).map(options => `答案选项：${options.map((option, index) => `选项${ordinal[index] ?? index + 1}，${option}`).join('；')}。`);
  const fields = [...leaf.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('textarea,input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])')].filter(visible).map(field => {
    const copy = field.labels?.[0]?.cloneNode(true) as HTMLElement | undefined;
    copy?.querySelectorAll('input,textarea,button').forEach(element => element.remove());
    const caption = clean(copy?.textContent ?? field.getAttribute('aria-label') ?? '');
    return caption ? `填写要求：${caption}${field.placeholder ? `，${field.placeholder}` : ''}。` : '';
  });
  return [...new Set(script ? [script] : headings), ...groups, ...new Set(fields)].join('。').replace(/。+/gu, '。');
}
// Recorded syllables are used for pinyin; missing recordings are never replaced with English-letter TTS.
const play = (text: string, onEnd?: (played: boolean) => void) => { void playChineseReadingAudio([text], () => undefined).then(played => onEnd?.(played)); };
export function useChineseTabNarration(rootRef: RefObject<HTMLElement>, scope: string) {
  return useLessonTabNarration(rootRef, scope, chineseNarrationLeaf, chineseNarrationText, play, stopChineseReadingAudio);
}
