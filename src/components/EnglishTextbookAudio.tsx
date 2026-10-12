import EnglishAudioPlayer from './EnglishAudioPlayer';
import { englishOriginalRecordings } from '../content/englishG3Audio';

/** 播放器直接嵌在相应教材栏目中，播放不写入学习进度。 */
export default function EnglishTextbookAudio({ lessonId, slot, page, label }: {
  lessonId: string; slot?: string; page?: number; label: string;
}) {
  const clips = englishOriginalRecordings(lessonId, slot, page);
  return clips.length ? <EnglishAudioPlayer clips={clips} label={label} /> : null;
}
