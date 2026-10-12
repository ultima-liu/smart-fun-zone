import catalog from './englishG3AudioCatalog.json' with { type: 'json' };

/** 官方完整录音；播放本身不代表完成作答或掌握。 */
export type EnglishOriginalClip = { src: string; taskReady: boolean };
export type EnglishOriginalRecording = EnglishOriginalClip & {
  key: string; title: string; lessonIds: string[]; slot: string; pages: number[];
  seconds: number; sourceId: string; sourceMd5: string;
  material: { page: number; label: string; region: number[]; src: string }[];
};

/** 74 段教材原声与耳机栏目的对应关系，文件均按需加载。 */
export const ENGLISH_G3_AUDIO_CATALOG: EnglishOriginalRecording[] = catalog;
export const ENGLISH_G3_ORIGINAL_AUDIO: Record<string, EnglishOriginalClip> = Object.fromEntries(
  ENGLISH_G3_AUDIO_CATALOG.map(recording => [recording.key, recording]),
);

export function englishOriginalAudio(key: string): string | undefined { return ENGLISH_G3_ORIGINAL_AUDIO[key]?.src; }
export function englishOriginalTaskReady(key: string): boolean { return ENGLISH_G3_ORIGINAL_AUDIO[key]?.taskReady ?? false; }
export function englishOriginalRecordings(lessonId: string, slot?: string, page?: number): EnglishOriginalRecording[] {
  // A page may contain several unrelated recordings. Never use the page alone as a binding.
  if (!slot) return [];
  return ENGLISH_G3_AUDIO_CATALOG.filter(clip => clip.lessonIds.includes(lessonId)
    && (!slot || clip.slot === slot) && (page === undefined || clip.pages.includes(page)));
}

export function englishLessonRecordings(lessonId: string): EnglishOriginalRecording[] {
  return ENGLISH_G3_AUDIO_CATALOG.filter(clip => clip.lessonIds.includes(lessonId));
}
