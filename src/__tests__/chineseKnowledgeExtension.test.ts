import { act, createElement, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ChineseKnowledgeExtensionStage from '../pages/ChineseKnowledgeExtensionStage';
import { CHINESE_KNOWLEDGE_EXTENSION } from '../content/chineseKnowledgeExtension';
import { useChineseTabNarration } from '../chineseTabNarration';
import { playChineseReadingAudio } from '../chineseReadingAudio';
import { speakOnce } from '../speech';
import { useStore } from '../store';

vi.mock('../speech', () => ({ speakOnce: vi.fn(), playSfx: vi.fn() }));
vi.mock('../chineseReadingAudio', () => ({ playChineseReadingAudio: vi.fn(() => Promise.resolve(true)), stopChineseReadingAudio: vi.fn() }));

const child = 'knowledge-bridge-test';
const key = (id: string, field: string) => `sfz-chinese-practice-v1:${child}:${id}:${field}`;
let host: HTMLDivElement, root: Root;
const onDone = vi.fn();

function Harness({ hidden = false }: { hidden?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useChineseTabNarration(ref, 'knowledge-bridge');
  return createElement('div', { ref },
    createElement('section', { hidden }, createElement(ChineseKnowledgeExtensionStage, { lessonId: 'rhyme-song', onDone })),
    createElement('section', { hidden: !hidden, 'data-chinese-leaf': true, 'data-chinese-narration': '另一项任务。' }));
}
async function settle() {
  await act(async () => { await Promise.resolve(); });
  await act(async () => { vi.advanceTimersByTime(300); });
}
async function click(button: HTMLButtonElement) {
  await act(async () => button.click());
  await settle();
}
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); localStorage.clear();
  useStore.setState({ activeChildId: child, sound: true, voiceOn: true });
  Object.defineProperty(navigator, 'userActivation', { configurable: true, value: { hasBeenActive: true } });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); });

it.each(['china', 'rhyme-song', 'pinyin-b-p-m-f', 'garden-2'])('%s 关闭声音且未听方法也可答对完成，答错不能完成', async id => {
  useStore.setState({ sound: false, voiceOn: false });
  localStorage.setItem(key(id, 'bridgeExplained'), 'false');
  await act(async () => root.render(createElement(ChineseKnowledgeExtensionStage, { lessonId: id, onDone })));
  const card = CHINESE_KNOWLEDGE_EXTENSION[id];
  const choices = [...host.querySelectorAll<HTMLButtonElement>('.ct-ktrail-check > div > button')];
  await click(choices.find(button => button.textContent !== card.answer)!);
  expect(onDone).not.toHaveBeenCalled();
  await click(choices.find(button => button.textContent === card.answer)!);
  expect(onDone).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem(key(id, 'bridgeExplained'))).toBe('false');
});

it('旧断点只保存正确答案、未点击方法时仍完成知识桥', async () => {
  localStorage.setItem(key('rhyme-song', 'bridgeAnswer'), JSON.stringify(CHINESE_KNOWLEDGE_EXTENSION['rhyme-song'].answer));
  localStorage.setItem(key('rhyme-song', 'bridgeExplained'), 'false');
  await act(async () => root.render(createElement(ChineseKnowledgeExtensionStage, { lessonId: 'rhyme-song', onDone })));
  expect(onDone).toHaveBeenCalledTimes(1);
});

it('进入自动播放一次方法、题目及选项；重播和答题反馈不触发整段重复或完成', async () => {
  await act(async () => root.render(createElement(Harness))); await settle();
  expect(playChineseReadingAudio).toHaveBeenCalledTimes(1);
  const text = vi.mocked(playChineseReadingAudio).mock.calls[0][0][0];
  const card = CHINESE_KNOWLEDGE_EXTENSION['rhyme-song'];
  for (const part of [card.title, card.insight, card.example, card.mnemonic, card.prompt, ...card.options]) expect(text).toContain(part);
  await click(host.querySelector<HTMLButtonElement>('[aria-label="再听方法"]')!);
  expect(speakOnce).toHaveBeenLastCalledWith(`${card.title}。${card.insight}。${card.example}。${card.mnemonic}。`, 'zh', .82);
  expect(onDone).not.toHaveBeenCalled();
  await click([...host.querySelectorAll<HTMLButtonElement>('.ct-ktrail-check > div > button')].find(button => button.textContent !== card.answer)!);
  expect(playChineseReadingAudio).toHaveBeenCalledTimes(1);
  expect(onDone).not.toHaveBeenCalled();
  await act(async () => root.render(createElement(Harness, { hidden: true }))); await settle();
  await act(async () => root.render(createElement(Harness))); await settle();
  expect(playChineseReadingAudio).toHaveBeenCalledTimes(3);
  expect(vi.mocked(playChineseReadingAudio).mock.calls[2][0][0]).toBe(text);
});

it('在自动播放等待期间点重播，只播放用户请求的方法', async () => {
  await act(async () => root.render(createElement(Harness)));
  const replay = host.querySelector<HTMLButtonElement>('[aria-label="再听方法"]')!;
  await act(async () => { replay.dispatchEvent(new Event('pointerdown', { bubbles: true })); replay.click(); });
  await settle();
  expect(speakOnce).toHaveBeenCalledTimes(1);
  expect(playChineseReadingAudio).not.toHaveBeenCalled();
  expect(onDone).not.toHaveBeenCalled();
});
