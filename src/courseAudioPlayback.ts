import { useSyncExternalStore } from 'react';

type PlaybackState = { busy: boolean; owner: string | null };
const active = new Map<symbol, string | null>();
const listeners = new Set<() => void>();
let state: PlaybackState = { busy: false, owner: null };
let requestedOwner: string | null = null;

function publish() {
  const owners = [...active.values()];
  const owner = owners.reverse().find(value => value !== null) ?? null;
  const busy = active.size > 0;
  if (state.busy === busy && state.owner === owner) return;
  state = { busy, owner };
  listeners.forEach(listener => listener());
}

/** 包括合成等待和整段连读；每段可独立结束，旧结束回调不会解锁新音频。 */
export function beginCourseAudioPlayback() {
  const token = Symbol();
  active.set(token, requestedOwner);
  publish();
  return () => {
    if (!active.delete(token)) return;
    // Promise 连读在下一微任务开始下一段，延后一拍避免图标闪停与点击缝隙。
    if (active.size) publish(); else window.setTimeout(publish, 0);
  };
}

/** 在播放器启动时绑定图标，自动播放和手动播放使用相同身份。 */
export function withCourseAudioOwner<T>(owner: string | null, play: () => T): T {
  const previous = requestedOwner;
  requestedOwner = owner;
  try { return play(); } finally { requestedOwner = previous; }
}

export const currentCourseAudioOwner = () => requestedOwner;
export const courseAudioPlaybackState = () => state;
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const useCourseAudioPlayback = () => useSyncExternalStore(subscribe, courseAudioPlaybackState, courseAudioPlaybackState);
