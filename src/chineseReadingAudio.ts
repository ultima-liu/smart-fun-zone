import { courseSpeechRequest, pinyinPronunciation } from './courseSpeech';
import { currentCourseAudioOwner, withCourseAudioOwner } from './courseAudioPlayback';
import { CHINESE_PINYIN_AUDIO } from './content/chinesePinyinAudio';
import { playPinyinRecording, stopPinyinAudio } from './pinyinAudio';
import { speakOnce, stopSpeaking } from './speech';
import { speakVolc } from './volcTts';
import { useStore } from './store';

export type ReadingAudioPart = { kind: 'speech'; text: string } | { kind: 'recording'; value: string } | { kind: 'vowel'; value: string } | { kind: 'pinyin'; value: string } | { kind: 'missing'; value: string };
const PINYIN_TOKEN = /[a-züāáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜ]+/gi;

/** 汉字说明和真人拼音分段播放，不能把拼音删掉，也不让 TTS 猜声调。 */
export function chineseReadingAudioParts(line: string): ReadingAudioPart[] {
  if (/^b\s*\+\s*a\s*→\s*ba[。.]?$/.test(line.trim())) return [
    { kind: 'speech', text: '双唇先合拢，声母轻短，和韵母连起来。听一声音节示范。' },
    { kind: 'recording', value: 'bā' },
  ];
  const parts: ReadingAudioPart[] = [];
  let offset = 0;
  for (const match of line.matchAll(PINYIN_TOKEN)) {
    const text = line.slice(offset, match.index).replace(/[“”]/g, '');
    if (/[\u4e00-\u9fff]/.test(text)) parts.push({ kind: 'speech', text });
    const value = match[0].toLowerCase();
    parts.push(CHINESE_PINYIN_AUDIO[value] ? { kind: 'recording', value } : /^[oōóǒò]$/.test(value) ? { kind: 'vowel', value: value === 'o' ? 'ō' : value } : pinyinPronunciation(value) ? { kind: 'pinyin', value } : { kind: 'missing', value });
    offset = match.index! + match[0].length;
  }
  const text = line.slice(offset).replace(/[“”]/g, '');
  if (/[\u4e00-\u9fff]/.test(text)) parts.push({ kind: 'speech', text });
  return parts;
}

let generation = 0;
let finishSpeech: ((played: boolean) => void) | null = null;
export function stopChineseReadingAudio() {
  generation++;
  finishSpeech?.(false);
  finishSpeech = null;
  stopPinyinAudio();
  stopSpeaking();
}

export async function playChineseReadingAudio(lines: string[], onMissing: (values: string[]) => void, rate = .82): Promise<boolean> {
  stopChineseReadingAudio();
  const mine = generation;
  const { sound, voiceOn } = useStore.getState();
  if (!sound || !voiceOn) return false;
  const owner = currentCourseAudioOwner();
  // Mixed teaching text is one utterance: no per-letter request/recording switches.
  if (lines.some(line => /[\u4e00-\u9fff]/.test(line))) {
    onMissing([]);
    return new Promise<boolean>(resolve => {
      finishSpeech = resolve;
      withCourseAudioOwner(owner, () => speakOnce(lines.join('。').replace(/。+/g, '。'), 'zh', rate, played => {
        if (mine !== generation) return;
        finishSpeech = null; resolve(played);
      }, 'chinese'));
    });
  }
  const parts = lines.flatMap(chineseReadingAudioParts);
  const missing = [...new Set(parts.flatMap((part) => part.kind === 'missing' ? [part.value] : []))];
  onMissing(missing);
  let complete = parts.length > 0 && !missing.length;
  for (const part of parts) {
    if (mine !== generation) return false;
    const enabled = useStore.getState();
    if (!enabled.sound || !enabled.voiceOn) return false;
    if (part.kind === 'missing') continue;
    if (part.kind === 'recording') {
      if (!await withCourseAudioOwner(owner, () => playPinyinRecording(part.value))) return false;
    } else {
      const played = await new Promise<boolean>((resolve) => {
        finishSpeech = resolve;
        const done = (ok: boolean) => { if (mine === generation) finishSpeech = null; resolve(ok); };
        // 单韵母原样交给合成服务，不转成“喔/窝”，也不用带声母的录音替代。
        withCourseAudioOwner(owner, () => {
          if (part.kind === 'vowel') {
            stopSpeaking(); const request = courseSpeechRequest(part.value, 'zh', 'chinese');
            void speakVolc(part.value, 'zh', rate, done, undefined, 0, { ...request.options, pronunciation: [`${part.value}/(${pinyinPronunciation(part.value)})`] });
          }
          else speakOnce(part.kind === 'pinyin' ? part.value : part.text, 'zh', rate, done, 'chinese');
        });
      });
      // 服务暂不可用仍继续本地拼音，不让缺少中文旁白阻塞音节录音。
      complete = complete && played;
    }
  }
  return mine === generation && complete;
}
