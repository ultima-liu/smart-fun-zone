import { act, createElement, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RecognitionCheck } from '../pages/ChinesePractice';
import { PinyinListeningPractice } from '../pages/ChinesePinyinPractice';
import { playChineseReadingAudio, stopChineseReadingAudio } from '../chineseReadingAudio';
import { playPinyinRecording } from '../pinyinAudio';
import { useChineseTabNarration } from '../chineseTabNarration';
import { useStore } from '../store';

vi.mock('../chineseReadingAudio', () => ({ playChineseReadingAudio: vi.fn(), stopChineseReadingAudio: vi.fn() }));
vi.mock('../pinyinAudio', () => ({ playPinyinRecording: vi.fn(), stopPinyinAudio: vi.fn() }));
const pending: Array<(played: boolean) => void> = [];
let host: HTMLDivElement, root: Root;
const onDone = vi.fn();
const onAdvance = vi.fn();
function Harness({ kind = 'recognition', context = 'lesson', hidden = false }: { kind?: 'recognition' | 'pinyin' | 'challenge'; context?: 'lesson' | 'review'; hidden?: boolean }) {
 const ref = useRef<HTMLDivElement>(null);
 useChineseTabNarration(ref, 'listening-test');
 return createElement('div', { ref }, createElement('div', { hidden }, kind === 'recognition'
   ? createElement(RecognitionCheck, { lessonId: 'heaven-earth-human', context, onDone: () => onDone(), onAdvance: () => onAdvance() })
   : createElement(PinyinListeningPractice, { lessonId: 'pinyin-b-p-m-f', context, onDone, ...(kind === 'challenge' ? { customTrials: [{ prompt: '听声音，选音节。', target: 'bā', choices: ['pā', 'bā', 'mā'] }] } : {}) })));
}
async function settle() { await act(async () => { await Promise.resolve(); }); await act(async () => { vi.advanceTimersByTime(300); }); }
const choices = () => [...host.querySelectorAll<HTMLButtonElement>('.ct-listen-options button')];
async function listen() { await act(async () => { const button = host.querySelector<HTMLButtonElement>('.audio-player-control')!; button.dispatchEvent(new Event('pointerdown', { bubbles: true })); button.click(); }); }
async function finish(success = true) { await act(async () => { pending.shift()!(success); }); }
beforeEach(() => {
 vi.useFakeTimers(); vi.clearAllMocks(); localStorage.clear(); pending.length = 0;
 useStore.setState({ activeChildId: 'listening-test', sound: true, voiceOn: true });
 Object.defineProperty(navigator, 'userActivation', { configurable: true, value: { hasBeenActive: true } });
 vi.mocked(playChineseReadingAudio).mockImplementation(lines => lines[0].startsWith('词语是：') || lines[0].startsWith('请听选项。') ? new Promise(resolve => pending.push(resolve)) : Promise.resolve(true));
 vi.mocked(playPinyinRecording).mockImplementation(() => new Promise(resolve => pending.push(resolve)));
 host = document.createElement('div'); document.body.append(host); root = createRoot(host);
 (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); });

it.each([{ kind: 'recognition', context: 'lesson' }, { kind: 'recognition', context: 'review' }, { kind: 'pinyin', context: 'lesson' }, { kind: 'pinyin', context: 'review' }, { kind: 'challenge', context: 'lesson' }] as const)('$kind $context 开场只读要求，认字选项静音，拼音选项在目标结束后播报', async props => {
 await act(async () => root.render(createElement(Harness, props))); await settle();
 expect(playChineseReadingAudio).toHaveBeenCalledTimes(1);
 expect(vi.mocked(playChineseReadingAudio).mock.calls[0][0][0]).not.toMatch(/答案选项|选项一|词语是/);
 expect(playPinyinRecording).not.toHaveBeenCalled();
 expect(choices().every(button => button.disabled)).toBe(true);
 await listen();
 expect(vi.mocked(playChineseReadingAudio).mock.calls.some(call => call[0][0].startsWith('请听选项'))).toBe(false);
 expect(choices().every(button => button.disabled)).toBe(true);
 await finish();
 if (props.kind === 'recognition') {
  expect(vi.mocked(playChineseReadingAudio).mock.calls.some(call => call[0][0].startsWith('请听选项'))).toBe(false);
  expect(host.textContent).not.toMatch(/读选项|音频和选项/);
 } else {
  const options = vi.mocked(playChineseReadingAudio).mock.calls[vi.mocked(playChineseReadingAudio).mock.calls.length - 1][0][0];
  expect(options).toContain('请听选项');
  const positions = choices().map(button => options.indexOf(button.getAttribute('aria-label')!));
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
  expect(choices().every(button => button.disabled)).toBe(true);
  await finish();
 }
 expect(choices().every(button => !button.disabled)).toBe(true);
 if (props.kind === 'recognition') {
  await listen();
  expect(choices().every(button => button.disabled)).toBe(true);
  await finish();
  expect(choices().every(button => !button.disabled)).toBe(true);
  expect(vi.mocked(playChineseReadingAudio).mock.calls.some(call => call[0][0].startsWith('请听选项'))).toBe(false);
 }
 const count = vi.mocked(playChineseReadingAudio).mock.calls.length;
 await settle(); expect(playChineseReadingAudio).toHaveBeenCalledTimes(count);
 expect(onDone).not.toHaveBeenCalled();
});
it('目标音频失败不读选项，不解锁答案，允许重听', async () => {
 await act(async () => root.render(createElement(Harness))); await settle(); await listen(); await finish(false);
 expect(choices().every(button => button.disabled)).toBe(true);
 expect(host.querySelector('.ct-listen-play')!.textContent).toContain('没有完整播放');
 expect(host.querySelector<HTMLButtonElement>('.audio-player-control')!.disabled).toBe(false);
 expect(vi.mocked(playChineseReadingAudio).mock.calls.some(call => call[0][0].startsWith('请听选项'))).toBe(false);
 await listen(); await finish(); expect(choices().every(button => !button.disabled)).toBe(true);
});
it('拼音选项播放失败不能解锁，声音关闭后不保留上轮听过状态', async () => {
 await act(async () => root.render(createElement(Harness, { kind: 'pinyin' }))); await settle(); await listen(); await finish(); await finish(false);
 expect(choices().every(button => button.disabled)).toBe(true);
 await listen(); await finish(); await finish();
 await act(async () => useStore.setState({ sound: false }));
 await act(async () => useStore.setState({ sound: true }));
 expect(choices().every(button => button.disabled)).toBe(true);
});
it('听音中离开后旧回调不能播放选项，返回时必须重新听', async () => {
 await act(async () => root.render(createElement(Harness))); await settle(); await listen();
 await act(async () => root.render(createElement(Harness, { hidden: true }))); await finish();
 expect(vi.mocked(playChineseReadingAudio).mock.calls.some(call => call[0][0].startsWith('请听选项'))).toBe(false);
 expect(stopChineseReadingAudio).toHaveBeenCalled();
 await act(async () => root.render(createElement(Harness))); await settle();
 expect(choices().every(button => button.disabled)).toBe(true);
});
it('正确答案进入下一题后重置听音状态，开场不读下一题的选项', async () => {
 localStorage.setItem('sfz-chinese-practice-v1:listening-test:heaven-earth-human:lesson:recognitionTargets:0', JSON.stringify(['天', '地', '人']));
 await act(async () => root.render(createElement(Harness))); await settle(); await listen(); await finish();
 await act(async () => choices().find(button => button.getAttribute('aria-label') === '天')!.click()); await settle();
 expect(choices().every(button => button.disabled)).toBe(true);
 expect(host.querySelector('.ct-listen-progress')!.textContent).toBe('2 / 3');
 expect(vi.mocked(playChineseReadingAudio).mock.calls[vi.mocked(playChineseReadingAudio).mock.calls.length - 1][0][0]).not.toContain('选项一');
});


it.each(['lesson', 'review'] as const)('认字 %s 全部答完通知推进，不显示完成页或重做入口，刷新不循环', async context => {
 const storageKey = `sfz-chinese-practice-v1:listening-test:heaven-earth-human:${context}:recognitionIndex:0`;
 localStorage.setItem(`sfz-chinese-practice-v1:listening-test:heaven-earth-human:${context}:recognitionTargets:0`, JSON.stringify(['天', '地', '人']));
 await act(async () => root.render(createElement(Harness, { context }))); await settle();
 for (const char of ['天', '地', '人']) {
  expect(onAdvance).not.toHaveBeenCalled();
  await listen(); await finish();
  await act(async () => choices().find(button => button.getAttribute('aria-label') === char)!.click()); await settle();
  expect(host.textContent).not.toContain('这个字找到了');
 }
 expect(localStorage.getItem(storageKey)).toBe('3');
 expect(choices()).toHaveLength(3);
 expect(choices().every(button => button.disabled)).toBe(true);
 expect(host.textContent).not.toMatch(/认字抽查完成|再做一次/);
 expect(onDone).toHaveBeenCalledTimes(1);
 expect(onAdvance).toHaveBeenCalledTimes(1);
 await act(async () => root.render(createElement(Harness, { context }))); await settle();
 expect(onDone).toHaveBeenCalledTimes(1);
 expect(onAdvance).toHaveBeenCalledTimes(1);
 await act(async () => root.render(createElement(Harness, { key: 'reload', context }))); await settle();
 expect(choices()).toHaveLength(3);
 expect(choices().every(button => button.disabled)).toBe(true);
 expect(host.textContent).not.toMatch(/认字抽查完成|再做一次/);
 expect(onAdvance).toHaveBeenCalledTimes(1);
});
