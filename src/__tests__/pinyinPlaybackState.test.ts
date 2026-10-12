import { afterEach, expect, it, vi } from 'vitest';
import { playPinyinRecording, stopPinyinAudio } from '../pinyinAudio';
import { courseAudioPlaybackState, withCourseAudioOwner } from '../courseAudioPlayback';
import { useStore } from '../store';

vi.mock('../speech', () => ({ stopSpeaking: vi.fn() }));
afterEach(() => { stopPinyinAudio(); vi.unstubAllGlobals(); });

it('真人拼音连读期间保持同一图标状态，取消后释放且不记录完整播完', async () => {
  const audios: { onended: (() => void) | null; onerror: (() => void) | null }[] = [];
  vi.stubGlobal('Audio', class {
    onended = null; onerror = null; pause() {} play() { return Promise.resolve(); }
    constructor() { audios.push(this); }
  });
  useStore.setState({ sound: true, voiceOn: true });
  const played = withCourseAudioOwner('pinyin', () => playPinyinRecording(['bā', 'bá']));
  expect(courseAudioPlaybackState()).toEqual({ busy: true, owner: 'pinyin' });
  audios[0].onended?.();
  await vi.waitFor(() => expect(audios).toHaveLength(2));
  expect(courseAudioPlaybackState()).toEqual({ busy: true, owner: 'pinyin' });
  stopPinyinAudio();
  expect(await played).toBe(false);
  await vi.waitFor(() => expect(courseAudioPlaybackState().busy).toBe(false));
});
