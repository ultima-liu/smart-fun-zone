import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import PinyinMouthDemo from '../components/PinyinMouthDemo';
import { playChineseReadingAudio, stopChineseReadingAudio } from '../chineseReadingAudio';
import { LESSON_NARRATION_CANCEL } from '../lessonTabNarration';
import { chineseNarrationText } from '../chineseTabNarration';
vi.mock('../chineseReadingAudio', () => ({ playChineseReadingAudio: vi.fn(() => Promise.resolve(true)), stopChineseReadingAudio: vi.fn() }));
let host: HTMLDivElement, root: Root;
const observe = vi.fn();
beforeEach(async () => {
  vi.useFakeTimers(); vi.clearAllMocks();
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(createElement(PinyinMouthDemo, { vowels: ['a', 'o', 'e'], observed: new Set<string>(), onObserve: observe })));
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); });
it('直接显示三种不同口型，开场说明不把卡片当成词语或答案逐张读出', () => {
  const illustrations = host.querySelectorAll('svg[role="img"]'); expect(illustrations).toHaveLength(3);
  const mouth = (index: number) => illustrations[index].querySelector('.ct-mouth-lips ellipse')!;
  expect(Number(mouth(0).getAttribute('ry'))).toBeGreaterThan(Number(mouth(0).getAttribute('rx')));
  expect(Number(mouth(1).getAttribute('rx')) / Number(mouth(1).getAttribute('ry'))).toBeCloseTo(1, 0);
  expect(Number(mouth(2).getAttribute('rx'))).toBeGreaterThan(2 * Number(mouth(2).getAttribute('ry')));
  expect(chineseNarrationText(host.firstElementChild as HTMLElement)).not.toMatch(/选项|已读词|发 a 的口形/);
  expect(playChineseReadingAudio).not.toHaveBeenCalled();
});
it('点击才播放对应单韵母；音频和口型演示都结束之后才计入观察完成', async () => {
  let audioEnd: (done: boolean) => void = () => undefined;
  vi.mocked(playChineseReadingAudio).mockImplementationOnce(() => new Promise(resolve => { audioEnd = resolve; }));
  await act(async () => host.querySelector('button')!.click());
  expect(playChineseReadingAudio).toHaveBeenCalledWith(['ā'], expect.any(Function));
  expect(host.querySelector('.is-demonstrating')).not.toBeNull();
  await act(async () => vi.advanceTimersByTime(1800)); expect(observe).not.toHaveBeenCalled();
  await act(async () => audioEnd(true)); expect(observe).toHaveBeenCalledWith('a');
});
it('切换tab或快速换卡片会取消旧演示，不能把未看完的口型记为完成', async () => {
  const buttons = host.querySelectorAll('button');
  await act(async () => buttons[0].click());
  await act(async () => vi.advanceTimersByTime(700));
  await act(async () => buttons[1].click());
  await act(async () => vi.advanceTimersByTime(1100)); expect(observe).not.toHaveBeenCalled();
  await act(async () => host.firstElementChild!.dispatchEvent(new Event(LESSON_NARRATION_CANCEL)));
  await act(async () => vi.advanceTimersByTime(2500)); expect(observe).not.toHaveBeenCalled();
  expect(host.querySelector('.is-demonstrating')).toBeNull(); expect(stopChineseReadingAudio).toHaveBeenCalled();
  await act(async () => buttons[2].click());
  await act(async () => vi.advanceTimersByTime(1800)); expect(observe).toHaveBeenCalledTimes(1); expect(observe).toHaveBeenCalledWith('e');
});
