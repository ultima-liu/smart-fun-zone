import { beginCourseAudioPlayback } from './courseAudioPlayback';
import { CHINESE_PINYIN_AUDIO } from './content/chinesePinyinAudio';
import { useStore } from './store';
import { stopSpeaking } from './speech';
let current: HTMLAudioElement | null = null;
let generation = 0;
let finishPlayback: (() => void) | null = null;
let settle: ((played: boolean) => void) | null = null;
export function stopPinyinAudio() {
  generation++;
  finishPlayback?.(); finishPlayback = null;
  if (current) { current.pause(); current.onended = null; current.onerror = null; current = null; }
  settle?.(false); settle = null;
}
/** 只有录音正常播完返回 true。关闭声音、资源失败和中途切换均不算听过。 */
export async function playPinyinRecording(values: string | string[]): Promise<boolean> {
  stopPinyinAudio(); stopSpeaking();
  const { sound, voiceOn } = useStore.getState();
  if (!sound || !voiceOn) return false;
  const finish = beginCourseAudioPlayback();
  finishPlayback = finish;
  try {
    const mine = generation;
    for (const value of typeof values === 'string' ? [values] : values) {
      const path = CHINESE_PINYIN_AUDIO[value];
      if (!path || mine !== generation) return false;
      const ok = await new Promise<boolean>((resolve) => {
        const audio = new Audio(path); current = audio;
        const done = (played: boolean) => { if (current === audio) { current = null; settle = null; } audio.onended = null; audio.onerror = null; resolve(played); };
        settle = done; audio.onended = () => done(true); audio.onerror = () => done(false);
        void audio.play().catch(() => done(false));
      });
      if (!ok || mine !== generation) return false;
    }
    return true;
  } finally { finish(); if (finishPlayback === finish) finishPlayback = null; }
}
