/** 教材原声按课时懒加载；未提供的录音不会用普通 TTS 冒充。 */
export type EnglishOriginalClip = {
  src: string;
  /** 音频已接入且对应听辨/节奏任务已真正完成验收，才可解除该课 2 星上限。 */
  taskReady: boolean;
};

const AUDIO_ROOT = '/assets/english-textbook/audio';

/**
 * 这里的 taskReady 暂时都保持 false：原声已经可以播放，但真正的听辨、节奏或填空任务
 * 仍需逐项实现和验收，不能仅凭“有播放器”就判定孩子已经完成听力目标。
 */
export const ENGLISH_G3_ORIGINAL_AUDIO: Record<string, EnglishOriginalClip> = {
  'friends-opening-song': { src: `${AUDIO_ROOT}/friends-opening-song.mp3`, taskReady: false },
  'families-opening-song': { src: `${AUDIO_ROOT}/families-opening-song.mp3`, taskReady: false },
  'plants-opening-song': { src: `${AUDIO_ROOT}/plants-opening-song.mp3`, taskReady: false },
  'colours-opening-song': { src: `${AUDIO_ROOT}/colours-opening-song.mp3`, taskReady: false },
  'numbers-opening-song': { src: `${AUDIO_ROOT}/numbers-opening-song.mp3`, taskReady: false },

  'families-a-finger-song': { src: `${AUDIO_ROOT}/families-a-finger-song.mp3`, taskReady: false },
  'friends-b-chant': { src: `${AUDIO_ROOT}/friends-b-chant.mp3`, taskReady: false },
  'families-b-chant': { src: `${AUDIO_ROOT}/families-b-chant.mp3`, taskReady: false },

  'friends-letters-sounds': { src: `${AUDIO_ROOT}/friends-letters-sounds.mp3`, taskReady: false },
  'families-letters-sounds': { src: `${AUDIO_ROOT}/families-letters-sounds.mp3`, taskReady: false },
  'animals-letters-sounds': { src: `${AUDIO_ROOT}/animals-letters-sounds.mp3`, taskReady: false },
  'plants-letters-sounds': { src: `${AUDIO_ROOT}/plants-letters-sounds.mp3`, taskReady: false },
  'colours-letters-sounds': { src: `${AUDIO_ROOT}/colours-letters-sounds.mp3`, taskReady: false },
  'numbers-letters-sounds': { src: `${AUDIO_ROOT}/numbers-letters-sounds.mp3`, taskReady: false },

  'friends-project-listening': { src: `${AUDIO_ROOT}/friends-project-listening.mp3`, taskReady: false },
  'families-project-listening': { src: `${AUDIO_ROOT}/families-project-listening.mp3`, taskReady: false },
  'colours-project-listening': { src: `${AUDIO_ROOT}/colours-project-listening.mp3`, taskReady: false },
  'numbers-project-listening': { src: `${AUDIO_ROOT}/numbers-project-listening.mp3`, taskReady: false },

  'revision-guest-observe-listening': { src: `${AUDIO_ROOT}/revision-guest-observe-listening.mp3`, taskReady: false },
  'revision-guest-act-listening': { src: `${AUDIO_ROOT}/revision-guest-act-listening.mp3`, taskReady: false },
};

/** key 例：friends-opening-chant、friends-opening-song、friends-letters-sounds、friends-project-listening。 */
export function englishOriginalAudio(key: string): string | undefined { return ENGLISH_G3_ORIGINAL_AUDIO[key]?.src; }
export function englishOriginalTaskReady(key: string): boolean { return ENGLISH_G3_ORIGINAL_AUDIO[key]?.taskReady ?? false; }
