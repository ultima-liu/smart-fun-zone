import { describe, expect, it } from 'vitest';
import { ENGLISH_G3_ALL_LESSONS, ENGLISH_G3_UPPER_REVISION, ENGLISH_G3_UPPER_UNITS, getEnglishG3Lesson } from '../content/englishGrade3Upper';
import { getEnglishG3Extension } from '../content/englishG3Extensions';
import { ENGLISH_G3_ORIGINAL_AUDIO, englishOriginalAudio, englishOriginalTaskReady } from '../content/englishG3Audio';
import { ENGLISH_G3_FINGER_FAMILY, ENGLISH_G3_PHONICS_CHANTS, ENGLISH_G3_SONGS } from '../content/englishG3Appendix';
import { ENGLISH_G3_STORY_BOARDS } from '../content/englishG3Stories';
import { ENGLISH_G3_READ_SPOTLIGHTS, ENGLISH_G3_REVISION_SCENES } from '../content/englishG3Interactions';
import { getTextbook } from '../content/textbooks';

describe('PEP 三年级英语上册独立课程', () => {
  it('六单元各七课，复习两课；教材 P2–P77 全覆盖且延伸题逐课存在', () => {
    expect(ENGLISH_G3_UPPER_UNITS).toHaveLength(6);
    expect(ENGLISH_G3_ALL_LESSONS).toHaveLength(44);
    const pages = new Set(ENGLISH_G3_ALL_LESSONS.flatMap((lesson) => Array.from({ length: lesson.pageEnd - lesson.pageStart + 1 }, (_, i) => lesson.pageStart + i)));
    expect([...pages].sort((a, b) => a - b)).toEqual(Array.from({ length: 76 }, (_, i) => i + 2));
    for (const lesson of ENGLISH_G3_ALL_LESSONS) {
      expect(getEnglishG3Lesson(lesson.id)).toEqual(lesson);
      expect(lesson.check.options, lesson.id).toContain(lesson.check.answer);
      const bridge = getEnglishG3Extension(lesson.id);
      expect(bridge, lesson.id).toBeDefined();
      expect(bridge?.transfer.options, lesson.id).toContain(bridge?.transfer.answer);
      if (bridge?.from) expect(getEnglishG3Lesson(bridge.from), `${lesson.id} 的知识回看来源`).toBeDefined();
    }
    for (const unit of ENGLISH_G3_UPPER_UNITS) {
      expect(unit.a.blocks.map((block) => block.id), `${unit.id} Part A 板块`).toEqual(['talk', 'practice', 'learn', 'activity']);
      expect(unit.a.blocks.map((block) => block.page), `${unit.id} Part A 页码`).toEqual([unit.start + 2, unit.start + 2, unit.start + 3, unit.start + 3]);
      unit.a.blocks.forEach((block) => expect(block.turns?.length || block.lines?.length || block.words?.length, `${unit.id}/${block.id} 内容`).toBeTruthy());
      expect(unit.b.blocks.map((block) => block.id), `${unit.id} Part B 板块`).toEqual(['talk', 'practice', 'learn', 'activity']);
      expect(unit.b.blocks.map((block) => block.page), `${unit.id} Part B 页码`).toEqual([unit.start + 5, unit.start + 5, unit.start + 6, unit.start + 6]);
      unit.b.blocks.forEach((block) => expect(block.turns?.length || block.lines?.length || block.words?.length, `${unit.id}/Part B/${block.id} 内容`).toBeTruthy());
    }
    expect(ENGLISH_G3_UPPER_UNITS[0].b.blocks[1]).toMatchObject({ title: 'Look and match', lines: ['We can share.', 'Thank you.', 'Nice to meet you.', 'Nice to meet you too.', 'Oh no!', "It’s OK."] });
  });

  it('教材原声按需接入，缺失项不伪装成 TTS且播放器不等于完成听力任务', () => {
    expect(getTextbook('english', 'g3', 1).route).toBe('/subject/english');
    expect(getTextbook('english', 'g3', 1).available).toBe(true);
    expect(Object.keys(ENGLISH_G3_ORIGINAL_AUDIO)).toHaveLength(20);
    expect(englishOriginalAudio('friends-opening-song')).toBe('/assets/english-textbook/audio/friends-opening-song.mp3');
    expect(englishOriginalAudio('friends-letters-sounds')).toBe('/assets/english-textbook/audio/friends-letters-sounds.mp3');
    expect(englishOriginalAudio('animals-opening-song')).toBeUndefined();
    expect(englishOriginalAudio('animals-b-chant')).toBeUndefined();
    expect(englishOriginalTaskReady('friends-opening-song')).toBe(false);
    expect(englishOriginalTaskReady('missing-audio')).toBe(false);
  });

  it('附录的六首单元歌曲、六组字母歌谣与手指家庭歌都有课程内容承接', () => {
    const ids = ENGLISH_G3_UPPER_UNITS.map((unit) => unit.id);
    expect(Object.keys(ENGLISH_G3_SONGS)).toEqual(ids);
    expect(Object.keys(ENGLISH_G3_PHONICS_CHANTS)).toEqual(ids);
    expect(ENGLISH_G3_FINGER_FAMILY.length).toBeGreaterThanOrEqual(4);
    ids.forEach((id) => {
      expect(ENGLISH_G3_SONGS[id].length, `${id} 单元歌曲`).toBeGreaterThan(1);
      expect(ENGLISH_G3_PHONICS_CHANTS[id].alphabet.length, `${id} 字母歌谣`).toBeGreaterThan(1);
      expect(ENGLISH_G3_PHONICS_CHANTS[id].examples.length, `${id} 自然拼读`).toBeGreaterThan(1);
    });
  });

  it('六篇 Reading time 都拆成互动分镜，且不遗漏或重复任何原文句子', () => {
    for (const unit of ENGLISH_G3_UPPER_UNITS) {
      const board = ENGLISH_G3_STORY_BOARDS[unit.id];
      expect(board, `${unit.id} 故事分镜`).toBeDefined();
      expect(board.scenes.length, `${unit.id} 分镜数量`).toBeGreaterThanOrEqual(2);
      const indexes = board.scenes.flatMap((scene) => scene.lineIndexes);
      expect(indexes.sort((a, b) => a - b), `${unit.id} 原文覆盖`).toEqual(unit.story.lines.map((_, index) => index));
      expect(new Set(indexes).size, `${unit.id} 原文不重复`).toBe(indexes.length);
      board.scenes.forEach((scene) => {
        expect(scene.clue.options, `${unit.id}/${scene.title} 线索题`).toContain(scene.clue.answer);
        expect(scene.page, `${unit.id}/${scene.title} 教材页`).toBeGreaterThanOrEqual(unit.start + 10);
        expect(scene.page, `${unit.id}/${scene.title} 教材页`).toBeLessThanOrEqual(unit.start + 11);
      });
    }
  });

  it('所有非对话课文都有独立互动，不再退回通用逐行列表', () => {
    for (const unit of ENGLISH_G3_UPPER_UNITS) {
      const spotlight = ENGLISH_G3_READ_SPOTLIGHTS[unit.id];
      expect(spotlight, `${unit.id} Start to read 证据任务`).toBeDefined();
      expect(spotlight.answerIndex, `${unit.id} Start to read 证据索引`).toBeGreaterThanOrEqual(0);
      expect(spotlight.answerIndex, `${unit.id} Start to read 证据索引`).toBeLessThan(unit.read.lines.length);
      expect(spotlight.prompt).toBeTruthy();
      expect(unit.opening.chant.length, `${unit.id} 单元导入节奏接龙`).toBeGreaterThan(1);
      expect(unit.project.steps.length, `${unit.id} 项目路线`).toBeGreaterThanOrEqual(3);
    }
    for (const page of ENGLISH_G3_UPPER_REVISION.pages) {
      const scenes = ENGLISH_G3_REVISION_SCENES[page.id];
      expect(scenes, `${page.id} 复习分镜`).toBeDefined();
      const indexes = scenes.flatMap((scene) => scene.lineIndexes);
      expect(indexes.sort((a, b) => a - b), `${page.id} 原文覆盖`).toEqual(page.lines.map((_, index) => index));
      expect(new Set(indexes).size, `${page.id} 原文不重复`).toBe(indexes.length);
      scenes.forEach((scene) => expect(scene.options).toContain(scene.answer));
    }
  });
});
