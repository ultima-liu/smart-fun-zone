import { act, createElement as h } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CourseReplayButton from '../components/CourseReplayButton';
import { beginCourseAudioPlayback, courseAudioPlaybackState, withCourseAudioOwner } from '../courseAudioPlayback';

let host: HTMLDivElement, root: Root;
let end: (() => void) | undefined;
beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => { await act(async () => { end?.(); vi.runOnlyPendingTimers(); root.unmount(); }); host.remove(); vi.useRealTimers(); });
const buttons = () => [...host.querySelectorAll<HTMLButtonElement>('button')];

it('连续快速点击只发起一次播放，只有当前图标动，其他重听入口也不能打断', async () => {
  const play = vi.fn(() => { end = beginCourseAudioPlayback(); });
  await act(async () => root.render(h('div', null, h(CourseReplayButton, { onClick: play }), h(CourseReplayButton, { label: '另一个内容', onClick: play }))));
  await act(async () => { buttons()[0].click(); buttons()[0].click(); buttons()[1].click(); });
  expect(play).toHaveBeenCalledOnce();
  expect(buttons().map(button => button.disabled)).toEqual([true, true]);
  expect(buttons().map(button => button.getAttribute('aria-busy'))).toEqual(['true', 'false']);
  await act(async () => { end?.(); vi.runOnlyPendingTimers(); });
  expect(buttons().every(button => !button.disabled)).toBe(true);
  await act(async () => buttons()[0].click()); expect(play).toHaveBeenCalledTimes(2);
});

it('自动播放绑定公共图标，段落交接保持禁用，旧完成回调不能停止新的动效', async () => {
  await act(async () => root.render(h(CourseReplayButton, { playbackOwner: 'auto', onClick: vi.fn() })));
  let oldEnd!: () => void;
  await act(async () => { oldEnd = withCourseAudioOwner('auto', beginCourseAudioPlayback); end = oldEnd; });
  expect(buttons()[0].classList.contains('is-playing')).toBe(true);
  await act(async () => { oldEnd(); end = withCourseAudioOwner('auto', beginCourseAudioPlayback); oldEnd(); vi.runOnlyPendingTimers(); });
  expect(buttons()[0].disabled).toBe(true);
  expect(buttons()[0].classList.contains('is-playing')).toBe(true);
  await act(async () => { end?.(); vi.runOnlyPendingTimers(); });
  expect(courseAudioPlaybackState().busy).toBe(false);
  expect(buttons()[0].disabled).toBe(false);
});
