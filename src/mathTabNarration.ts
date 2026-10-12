import { type RefObject } from 'react';
import { useLessonTabNarration } from './lessonTabNarration';

const LEAVES = '[data-lesson-explanation],[role="tabpanel"],.activity-panel,.math-task-board-pages > [data-complete],.math-assessment,.mt-guess-card';
const visible = (element: Element) => !element.closest('[hidden],[aria-hidden="true"]');
const clean = (text: string) => text.replace(/[✓✔🎤🔊💡]/gu, '').replace(/\s+/g, ' ').trim();

/** The active innermost card owns narration; mounted hidden siblings never contribute. */
export function mathNarrationLeaf(root: HTMLElement): HTMLElement | null {
  const candidates = [...root.querySelectorAll<HTMLElement>(LEAVES)].filter(visible);
  return candidates.find(candidate => !candidates.some(other => other !== candidate && candidate.contains(other)))
    ?? (root.querySelector('.math-assessment-result') ? null : root);
}

/** Read the displayed question, options and instructions, excluding submitted answers and feedback. */
export function mathNarrationText(leaf: HTMLElement): string {
  if (leaf.dataset.lessonExplanation) return leaf.dataset.lessonExplanation;
  if (leaf.dataset.mathNarration) return leaf.dataset.mathNarration;
  const prompts = [...leaf.querySelectorAll('h3,h4,p,.mt-action-station > header,.mt-marking-grid article > b,:scope > b,:scope > strong')]
    .filter(element => visible(element) && !element.closest('[role="status"],.math-assessment-hints,.math-support-actions,.math-reason-wait,.mt-task-equation,.mt-knowledge-story,.mt-knowledge-model'))
    .map(element => clean(element.textContent ?? '')).filter(Boolean);
  // 材料名或算式不等于操作要求；继承所属任务的动作，不能只念“数轴轨道”。
  const asksForAction = /[？?]|请|点击|点出|点亮|点到|选择|选出|填写|写出|写作|写下|按顺序|把|圈出|标出|找出|配对|摆出|拖动|数一数|分到|完成|说出|记录|测试|拼满|先定方向|让|放进|再放|拿走|点走|观察|翻出/;
  const hasField = !!leaf.querySelector('input,textarea');
  if (!prompts.length || (!hasField && !prompts.some(prompt => asksForAction.test(prompt)))) {
    for (let parent = leaf.parentElement; parent; parent = parent.parentElement) {
      if (!parent.matches('.mt-textbook-task,.mt-action-station')) continue;
      const heading = parent.querySelector(':scope > header h3,:scope > h3') ?? parent.querySelector(':scope > .mt-action-station-brief,:scope > header');
      const inherited = clean(heading?.textContent ?? '');
      if (inherited) { if (!prompts.includes(inherited)) prompts.unshift(inherited); break; }
    }
  }
  // 连续变化卡的题干有时只描述故事；把当前按钮的动作也说清楚。
  if (!hasField && !prompts.some(prompt => asksForAction.test(prompt))) {
    const action = [...leaf.querySelectorAll('button')].filter(visible)
      .filter(button => !button.closest('.math-answer-choices,[data-practice-restart]'))
      .map(button => clean(button.textContent ?? '')).find(text => asksForAction.test(text));
    if (action) prompts.push(`请点击“${action}”`);
  }
  const name = clean(leaf.getAttribute('aria-label') ?? '');
  if (name && !prompts.some(prompt => prompt.includes(name))) prompts.unshift(name);
  const options = [...leaf.querySelectorAll('.math-answer-choices,.mt-knowledge-options,.mt-tool-options,.mt-build-ways,.mt-deer-model-choices,.mt-reading-queue,.mt-match-shapes,.mt-number-groups,.mt-number-order-options,.mt-number-line-column')].filter(visible)
    .filter(group => !group.closest('[data-math-narration-options="skip"]'))
    .map(group => [...group.querySelectorAll('button')].filter(visible)
      .map(button => clean(button.getAttribute('aria-label') ?? button.textContent ?? '')).filter(Boolean))
    .filter(group => group.length).map(group => `答案选项：${group.map((option, index) => `选项${index + 1}，${option}`).join('；')}。`);
  const fields = [...leaf.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="hidden"]),textarea')]
    .filter(visible).map(field => {
      const label = field.labels?.[0];
      const caption = label?.cloneNode(true) as HTMLElement | undefined;
      caption?.querySelectorAll('input,textarea,button,svg,[role="status"]').forEach(element => element.remove());
      const text = clean(caption?.textContent ?? field.getAttribute('aria-label') ?? '');
      return text ? `填写要求：${text}${field.placeholder ? `，${field.placeholder}` : ''}。` : '';
    }).filter(Boolean);
  return [...new Set(prompts), ...options, ...new Set(fields)].join('。').replace(/。+/gu, '。');
}

export function useMathTabNarration(rootRef: RefObject<HTMLElement>, scope: string) {
  return useLessonTabNarration(rootRef, scope, mathNarrationLeaf, mathNarrationText);
}
