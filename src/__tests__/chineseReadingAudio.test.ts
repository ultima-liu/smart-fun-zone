import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { chineseReadingAudioParts, playChineseReadingAudio, stopChineseReadingAudio } from '../chineseReadingAudio';
import { speakOnce } from '../speech';
import { speakVolc } from '../volcTts';
import { useStore } from '../store';
import { CHINESE_PINYIN_STUDY } from '../content/chinesePinyinStudy';
import { CHINESE_PINYIN_TRIALS } from '../content/chinesePinyinTrials';
import { CHINESE_PINYIN_AUDIO } from '../content/chinesePinyinAudio';
import { CHINESE_TEXTBOOK_LESSONS } from '../content/chineseTextbookCurriculum';
import { chineseListeningOptionsText } from '../components/ChineseListeningChoice';

vi.mock('../speech', () => ({ stopSpeaking: vi.fn(), speakOnce: vi.fn() }));
vi.mock('../volcTts', () => ({ speakVolc: vi.fn() }));
const played: string[] = [];
class FakeAudio {
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(private path: string) {}
  pause() {}
  play() { played.push(this.path); queueMicrotask(() => this.onended?.()); return Promise.resolve(); }
}
beforeEach(() => {
  played.length = 0;
  useStore.setState({ sound: true, voiceOn: true });
  vi.stubGlobal('Audio', FakeAudio);
  vi.mocked(speakOnce).mockImplementation((_text, _lang, _rate, end) => { queueMicrotask(() => end?.(true)); });
  vi.mocked(speakVolc).mockImplementation(async (_text, _lang, _rate, end) => { queueMicrotask(() => end?.(true)); });
});
afterEach(() => { stopChineseReadingAudio(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

it('整册拼音听读材料不删除声音，四声音节保持原调号', () => {
  for (const pack of Object.values(CHINESE_PINYIN_STUDY)) {
    for (const line of pack.readingLines) {
      const parts = chineseReadingAudioParts(line);
      expect(parts.length).toBeGreaterThan(0);
      expect(parts.some((part) => part.kind === 'missing')).toBe(false);
    }
  }
  expect(chineseReadingAudioParts('bā，bá，bǎ，bà。')).toEqual(['bā', 'bá', 'bǎ', 'bà'].map((value) => ({kind: 'recording', value})));
});
it('整册听辨、复习与有音频的挑战选项均有真人音节资源，编号只使用中文', () => {
  const localClips = Object.keys(import.meta.glob('/public/assets/chinese-textbook/audio/*.mp3', { query: '?url', import: 'default' }));
  const groups = [...Object.values(CHINESE_PINYIN_TRIALS).flat().map(trial => trial.choices),
    ...CHINESE_TEXTBOOK_LESSONS.flatMap(lesson => lesson.questions.filter(question => question.audio).map(question => question.options))];
  for (const choices of groups) {
    const parts = chineseReadingAudioParts(chineseListeningOptionsText(choices));
    expect(parts.some(part => part.kind === 'missing'), choices.join('、')).toBe(false);
    const recordings = parts.filter(part => part.kind === 'recording');
    expect(recordings).toHaveLength(choices.length);
    for (const part of recordings) {
      const clip = CHINESE_PINYIN_AUDIO[part.value];
      expect(localClips.includes(`/public${clip}`), clip).toBe(true);
    }
  }
});
it('混合说明整句一次连续播报，不切换多条拼音录音', async () => {
  expect(await playChineseReadingAudio(['张大嘴巴 a a a。', '圆圆嘴巴 o o o。'], vi.fn())).toBe(true);
  expect(played).toEqual([]);
  expect(speakOnce).toHaveBeenCalledTimes(1);
  expect(vi.mocked(speakOnce).mock.calls[0][0]).toBe('张大嘴巴 a a a。圆圆嘴巴 o o o。');
  expect(vi.mocked(speakOnce).mock.calls[0][4]).toBe('chinese');
});
it('连续说明合成失败不算听完，纯拼音仍可独立使用本地录音', async () => {
  vi.mocked(speakOnce).mockImplementation((_text, _lang, _rate, end) => { queueMicrotask(() => end?.(false)); });
  expect(await playChineseReadingAudio(['张大嘴巴 a a a。'], vi.fn())).toBe(false);
  expect(await playChineseReadingAudio(['ā'], vi.fn())).toBe(true);
  expect(played).toHaveLength(1);
});
it('停止未完成旁白后不继续录音，旧请求能结束', async () => {
  vi.mocked(speakOnce).mockImplementation(() => {});
  const result = playChineseReadingAudio(['张大嘴巴 a a a。'], vi.fn());
  stopChineseReadingAudio();
  expect(await result).toBe(false);
  expect(played).toEqual([]);
});
it('录音失败停止后续队列，不把未播完当作完成', async () => {
  vi.stubGlobal('Audio', class extends FakeAudio { play() { return Promise.reject(new Error('resource')); } });
  expect(await playChineseReadingAudio(['bā，bá，bǎ，bà。'], vi.fn())).toBe(false);
});
it('声音或语音关闭时不开始旁白或录音', async () => {
  for (const state of [{sound: false, voiceOn: true}, {sound: true, voiceOn: false}]) {
    useStore.setState(state);
    expect(await playChineseReadingAudio(['bā。'], vi.fn())).toBe(false);
  }
  expect(played).toEqual([]);
  expect(speakOnce).not.toHaveBeenCalled();
});

it('小汽车四声演示保持 o 的四个调号，不以汉字或带声母音节替代', async () => {
  expect(chineseReadingAudioParts('ō ó ǒ ò')).toEqual(['ō', 'ó', 'ǒ', 'ò'].map(value => ({kind: 'vowel', value})));
  expect(await playChineseReadingAudio(['ō ó ǒ ò'], vi.fn())).toBe(true);
  expect(vi.mocked(speakVolc).mock.calls.map(call => call[0])).toEqual(['ō', 'ó', 'ǒ', 'ò']);
  expect(played).toEqual([]);
});

it('未下载录音的孤立声母按拼音呼读音合成，不删字母', async () => {
 expect(await playChineseReadingAudio(['b'],vi.fn())).toBe(true);
 expect(vi.mocked(speakOnce).mock.calls[0][0]).toBe('b');
 expect(vi.mocked(speakOnce).mock.calls[0][4]).toBe('chinese');
});
