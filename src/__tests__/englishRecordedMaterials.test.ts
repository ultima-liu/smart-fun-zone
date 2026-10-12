import { describe, it, expect } from 'vitest';
import { ENGLISH_G3_AUDIO_CATALOG, englishOriginalRecordings, englishLessonRecordings } from '../content/englishG3Audio';
import { ENGLISH_G3_WORD_LISTS } from '../content/englishG3WordLists';
import { ENGLISH_G3_ALL_LESSONS } from '../content/englishGrade3Upper';
import { ENGLISH_G3_SOUND_EXERCISES } from '../content/englishG3SoundExercises';

describe('原声与完整原教材材料的对应', () => {
  it('同页多栏目不能隐式混配，附录不能冒充单元例词或局部字母录音', () => {
    expect(englishOriginalRecordings('guest-observe', undefined, 74)).toEqual([]);
    expect(englishOriginalRecordings('friends-a', 'learn')).toEqual([]);
    expect(englishOriginalRecordings('friends-b', 'learn')).toEqual([]);
    expect(englishOriginalRecordings('friends-letters', 'alphabet')).toEqual([]);
    expect(englishOriginalRecordings('friends-letters', 'phonics')).toEqual([]);
    expect(englishOriginalRecordings('friends-letters', 'first-sound').map(c => c.key)).toEqual(['friends-letters-first-sound']);
    expect(englishOriginalRecordings('numbers-letters', 'last-sound').map(c => c.key)).toEqual(['numbers-letters-last-sound']);
    expect(englishLessonRecordings('appendix-alphabet').map(c => c.key)).toEqual(['alphabet']);
  });
  it('74 段都有明确的课程或附录归属、原书区域及实际文件', () => {
    expect(ENGLISH_G3_AUDIO_CATALOG).toHaveLength(74);
    expect(new Set(ENGLISH_G3_AUDIO_CATALOG.map(c => c.key)).size).toBe(74);
    const lessons = new Set([...ENGLISH_G3_ALL_LESSONS.map(l => l.id), ...Object.keys(ENGLISH_G3_WORD_LISTS).map(u => `appendix-${u}`), 'appendix-alphabet']);
    for (const clip of ENGLISH_G3_AUDIO_CATALOG) {
      expect(clip.lessonIds, clip.key).toHaveLength(1);
      expect(lessons.has(clip.lessonIds[0]), clip.key).toBe(true);
      expect(clip.material.length, clip.key).toBeGreaterThan(0);
      for (const frame of clip.material) {
        expect(clip.pages, clip.key).toContain(frame.page);
        const [left, top, right, bottom] = frame.region;
        expect(left).toBeGreaterThanOrEqual(0); expect(right).toBeLessThanOrEqual(1);
        expect(top).toBeGreaterThanOrEqual(0); expect(bottom).toBeLessThanOrEqual(1);
        expect(right).toBeGreaterThan(left); expect(bottom).toBeGreaterThan(top);
      }
    }
  });
  it('六份完整词表覆盖录音中的上下文词，保留两种不同语境的 can', () => {
    expect(Object.values(ENGLISH_G3_WORD_LISTS).map(list => list.length)).toEqual([15, 19, 22, 19, 17, 16]);
    expect(ENGLISH_G3_WORD_LISTS.animals.map(([word]) => word)).toContain('Miss');
    expect(ENGLISH_G3_WORD_LISTS.plants.map(([word]) => word)).toContain('them');
    expect(ENGLISH_G3_WORD_LISTS.friends.find(([word]) => word === 'can')?.[1]).toBe('可以');
    expect(englishLessonRecordings('appendix-numbers')[0].pages).toEqual([84, 85]);
    expect(englishLessonRecordings('friends-opening')[0].pages).toEqual([3]);
  });
  it('七组辨音题保留原书图片及选项，不以合音练习词替代录音里的词', () => {
    expect(Object.keys(ENGLISH_G3_SOUND_EXERCISES)).toHaveLength(7);
    expect(Object.values(ENGLISH_G3_SOUND_EXERCISES).flat()).toHaveLength(27);
    expect(ENGLISH_G3_SOUND_EXERCISES['friends-letters-first-sound'].map(q => q.word)).toEqual(['dog', 'can', 'bird', 'ant']);
    expect(ENGLISH_G3_SOUND_EXERCISES['colours-letters-first-sound'].map(q => q.answer)).toEqual(['r', 't', 'u', 's', 'qu']);
    expect(ENGLISH_G3_SOUND_EXERCISES['numbers-letters-last-sound'].map(q => q.answer)).toEqual(['x', 'z']);
    for (const [key, questions] of Object.entries(ENGLISH_G3_SOUND_EXERCISES)) {
      const recording = ENGLISH_G3_AUDIO_CATALOG.find(c => c.key === key)!;
      for (const question of questions) {
        expect(question.choices, key).toContain(question.answer);
        expect(recording.pages, key).toContain(question.page);
      }
    }
  });
});
