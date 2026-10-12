import { act, createElement as h, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MathKnowledgeBridge } from '../pages/MathKnowledgeBridge';
import { MathLessonTaskProgressProvider } from '../components/MathTextbookTaskPack';
import { MATH_KNOWLEDGE_EXTENSION } from '../content/mathKnowledgeExtension';
import { useMathTabNarration } from '../mathTabNarration';
import { useStore } from '../store';
import { speakOnce } from '../speech';

vi.mock('../speech', () => ({ speakOnce: vi.fn(), playSfx: vi.fn(), stopSpeaking: vi.fn() }));
let host: HTMLDivElement, root: Root;
let played: ((success: boolean) => void) | undefined;
const finish = vi.fn();
const card = MATH_KNOWLEDGE_EXTENSION['plus-nine'];
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); localStorage.clear(); played = undefined;
  useStore.setState({ sound: true, voiceOn: true });
  Object.defineProperty(navigator, 'userActivation', { configurable: true, value: { hasBeenActive: true } });
  vi.mocked(speakOnce).mockImplementation((_text, _lang, _rate, onEnd) => { played = onEnd; });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); });
const button = (text: string) => [...host.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent?.includes(text))!;
function KnowledgeHarness({ complete, hidden, lessonId }: { complete: boolean; hidden: boolean; lessonId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const narration = useMathTabNarration(ref, lessonId);
  return h('div', { hidden }, h('button', { 'data-tab-audio': true, onClick: narration.replay, disabled: narration.disabled }, '再听一遍讲解'), h('div', { ref }, h(MathLessonTaskProgressProvider, { lessonId, children: h(MathKnowledgeBridge, { lessonId, complete, onComplete: finish }) })));
}
async function settle() { await act(async () => { await Promise.resolve(); }); await act(async () => { vi.advanceTimersByTime(300); }); }
async function render(complete: boolean, hidden = false, lessonId = 'plus-nine') {
  await act(async () => root.render(h(KnowledgeHarness, { complete, hidden, lessonId }))); await settle();
}
async function click(text: string) { await act(async () => button(text).click()); }
async function listen(success = true) { await act(async () => played?.(success)); }
async function answer() { await click(card.answer); }
async function operate() { await act(async () => host.querySelector<HTMLButtonElement>('.mt-knowledge-ten button:not(:disabled)')!.click()); }
const tabs = () => [...host.querySelectorAll<HTMLButtonElement>('[role=tab]')];

it('首次学习必须先听讲解、完成学具，才能回答新情景', async () => {
  await render(false);
  expect(tabs().map(tab => tab.disabled)).toEqual([false, true, true]);
  expect(speakOnce).toHaveBeenCalled(); expect(tabs()[1].disabled).toBe(true);
  await answer(); expect(finish).not.toHaveBeenCalled();
  await act(async () => played?.(true));
  expect(tabs()[1].getAttribute('aria-selected')).toBe('true'); expect(tabs()[2].disabled).toBe(true);
  await operate(); expect(finish).not.toHaveBeenCalled();
  await click('完成了，去试一试');
  await click(card.options.find(option => option !== card.answer)!); expect(finish).not.toHaveBeenCalled();
  await answer(); expect(finish).toHaveBeenCalledOnce();
});

it('已完成知识桥可以回看三步，重做按顺序且不覆盖历史完成快照', async () => {
  await render(true); expect(tabs().every(tab => !tab.disabled)).toBe(true);
  await click('换个情景'); await answer(); expect(finish).not.toHaveBeenCalled();
  const snapshot = localStorage.getItem('sfz-math-task-v1:guest:plus-nine');
  await click('再做一次'); expect(tabs().map(tab => tab.disabled)).toEqual([false, true, true]);
  expect(host.querySelectorAll('.mt-knowledge-ten .added')).toHaveLength(0);
  await settle(); await listen(); await operate(); await click('完成了，去试一试'); await answer();
  expect(finish).not.toHaveBeenCalled();
  expect(localStorage.getItem('sfz-math-task-v1:guest:plus-nine')).toBe(snapshot);
});

it('首次学习保存讲解与操作步骤，重新进入后从当前步骤继续', async () => {
  await render(false); await settle(); await listen(); await operate();
  await act(async () => root.unmount()); root = createRoot(host);
  await render(false);
  expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
  expect(host.querySelectorAll('.mt-knowledge-ten .added')).toHaveLength(1);
  await click('完成了，去试一试'); await answer(); expect(finish).toHaveBeenCalledOnce();
});

it('语音不可用时保留完整讲解，阅读后按顺序进入动手', async () => {
  await render(false); await listen(false);
  expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
  expect(host.textContent).toContain(card.insight);
  await click('看完讲解，去动手'); expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
  expect(tabs()[2].disabled).toBe(true);
});
it('凑十缺口随实际填格减少，同一格不能重复填，补满前不开放迁移', async () => {
  await render(false, false, 'plus-eight-seven-six'); await listen();
  const first = host.querySelector<HTMLButtonElement>('.mt-knowledge-ten button:not(:disabled)')!;
  await act(async () => first.click()); expect(host.textContent).toContain('还差 2 格');
  await act(async () => first.click()); expect(host.textContent).toContain('还差 2 格');
  expect(tabs()[2].disabled).toBe(true);
  await operate(); expect(host.textContent).toContain('还差 1 格');
  await operate(); expect(tabs()[2].disabled).toBe(false); expect(finish).not.toHaveBeenCalled();
});

it('切走知识延伸后，旧讲解播放回调不能解锁后续步骤', async () => {
  await render(false); expect(speakOnce).toHaveBeenCalled(); await render(false, true);
  await act(async () => played?.(true)); await render(false);
  expect(tabs().map(tab => tab.disabled)).toEqual([false, true, true]);
});

const linePaths: Record<string, number[]> = {
  'order-twenty': [12, 11, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  ordinal: [1, 2, 5, 4, 3, 2],
  'between-positions': [3, 7, 4, 5, 6],
  zero: [0, 1, 2, 3, 4],
  'six-to-nine': [5, 6, 7, 8],
  'compare-order-nine': [6, 7, 8, 9],
  'review-numbers': [15, 16, 17, 18],
};
async function routeClick(value: number) {
  await act(async () => [...host.querySelectorAll<HTMLButtonElement>('.mt-knowledge-route button')].find(item => item.querySelector('strong')?.textContent === `${value}`)!.click());
}
for (const [lesson, path] of Object.entries(linePaths)) it(`${lesson} 数线必须实际操作，点错或重复点不推进，完成后才开放新情景`, async () => {
  await render(false, false, lesson); await listen();
  expect(button('完成了，去试一试')).toBeUndefined();
  expect(tabs()[2].disabled).toBe(true);
  const values = [...host.querySelectorAll('.mt-knowledge-route button strong')].map(item => Number(item.textContent));
  await routeClick(values.find(value => value !== path[0])!);
  expect(host.querySelector('[role=status]')?.textContent).toContain('先找一找');
  await routeClick(path[0]); await routeClick(path[0]);
  expect(host.querySelectorAll('.mt-knowledge-route button[aria-pressed=true]')).toHaveLength(1);
  expect(tabs()[2].disabled).toBe(true);
  for (const value of path.slice(1, -1)) await routeClick(value);
  expect(tabs()[2].disabled).toBe(true);
  await routeClick(path[path.length - 1]);
  expect(tabs()[2].disabled).toBe(false);
  expect(host.querySelector('.mt-knowledge-route-status')?.textContent).toContain('✓');
  expect(finish).not.toHaveBeenCalled();
  await click('完成了，去试一试');
  await act(async () => [...host.querySelectorAll<HTMLButtonElement>('.mt-knowledge-options button')].find(item => item.textContent === MATH_KNOWLEDGE_EXTENSION[lesson].answer)!.click());
  expect(finish).toHaveBeenCalledOnce();
});

it('两条路分别从 12 出发，每格相差 1，任务语音包含动作，刷新不丢已走步数', async () => {
  await render(false, false, 'order-twenty'); await listen();
  expect(host.querySelector('[data-math-narration-key="line-0"]')?.getAttribute('data-math-narration')).toContain('先点 12');
  expect([...host.querySelectorAll('.mt-knowledge-route strong')].map(item => Number(item.textContent))).toEqual([10,11,12,13,14,15,16,17,18,19,20]);
  await routeClick(12); await routeClick(11);
  await act(async () => root.unmount()); root = createRoot(host); await render(false, false, 'order-twenty');
  expect(host.querySelector('.mt-knowledge-route-status')?.textContent).toContain('已走 1 步');
  await routeClick(10);
  expect(host.querySelector('[data-math-narration-key="line-1"]')?.getAttribute('data-math-narration')).toContain('往右点到 20');
  expect(host.querySelector('.mt-knowledge-route-status')?.textContent).toContain('走了 2 步');
  await routeClick(12); await routeClick(13);
  expect(host.querySelector('.mt-knowledge-route-status')?.textContent).toContain('已走 1 步');
});

it('旧数线完成记录可回看结果，重做恢复实际操作门槛且保留历史快照', async () => {
  await render(true, false, 'order-twenty'); await click('再动手');
  expect(host.querySelector('.mt-knowledge-route-status')?.textContent).toContain('到 10 只要 2 步');
  const snapshot = localStorage.getItem('sfz-math-task-v1:guest:order-twenty');
  await click('再做一次'); await settle(); await listen();
  expect(tabs()[2].disabled).toBe(true); expect(host.querySelectorAll('.mt-knowledge-route .reached')).toHaveLength(0);
  for (const value of linePaths['order-twenty']) await routeClick(value);
  await click('完成了，去试一试'); await act(async () => [...host.querySelectorAll<HTMLButtonElement>('.mt-knowledge-options button')].find(item => item.textContent === '20')!.click());
  expect(finish).not.toHaveBeenCalled();
  expect(localStorage.getItem('sfz-math-task-v1:guest:order-twenty')).toBe(snapshot);
});

for (const [lesson, content] of Object.entries(MATH_KNOWLEDGE_EXTENSION)) it(`${lesson} 进入纯讲解自动播放完整内容一次，只使用公共重播入口`, async () => {
  await render(false, false, lesson);
  expect(speakOnce).toHaveBeenCalledOnce();
  const text = vi.mocked(speakOnce).mock.calls[0][0];
  for (const part of [content.title, content.insight, content.example, content.mnemonic]) expect(text).toContain(part);
  expect(host.querySelector('.mt-knowledge-story button')).toBeNull();
  await settle(); expect(speakOnce).toHaveBeenCalledOnce();
});

it('自动讲解播完进入动手，回看和重播仍留在讲解页，不再次跳走', async () => {
  await render(false, false, 'order-twenty'); await listen();
  expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
  await click('先听讲解'); await settle();
  expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
  await listen(); expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
  await click('再听一遍讲解'); await listen();
  expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
});
for (const lesson of ['campus', 'compare', 'compose', 'eleven-twenty', 'solid-shapes', 'continuous-add-sub']) it(`${lesson} 纯观察学具自动讲一次，播完进入情景题`, async () => {
  await render(false, false, lesson); await listen(); await settle();
  expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
  expect(tabs()[2].disabled).toBe(true);
  expect(speakOnce).toHaveBeenCalledTimes(2);
  await listen(); expect(tabs()[2].getAttribute('aria-selected')).toBe('true');
  expect(finish).not.toHaveBeenCalled();
});
it('静音时无需先点播放，直接提供阅读后继续入口，不自动跳走', async () => {
  useStore.setState({ sound: false, voiceOn: false });
  await render(false, false, 'campus');
  expect(speakOnce).not.toHaveBeenCalled();
  expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
  await click('看完讲解，去动手'); await settle();
  expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
  await click('看完讲解，去试一试');
  expect(tabs()[2].getAttribute('aria-selected')).toBe('true');
});
it('在同一个讲解 tab 重做会重新自动播放，旧播放结束不能解锁新一轮', async () => {
  await render(true); const oldEnd = played;
  await click('再做一次'); await settle();
  await act(async () => oldEnd?.(true));
  expect(tabs()[1].disabled).toBe(true);
  expect(speakOnce).toHaveBeenCalledTimes(2);
  await listen(); expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
});
