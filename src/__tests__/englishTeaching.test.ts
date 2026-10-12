import { beforeEach, describe, expect, it } from 'vitest';
import { ENGLISH_G3_ALL_LESSONS, ENGLISH_G3_UPPER_UNITS } from '../content/englishGrade3Upper';
import { ENGLISH_PHONICS_TASKS, ENGLISH_WORD_SENTENCES, englishCoreSourceIds, englishWordSentence, getEnglishTeaching } from '../content/englishTeaching';
import { ENGLISH_G3_ORIGINAL_AUDIO } from '../content/englishG3Audio';
import { englishOriginalActivity } from '../content/englishOriginalActivities';
import { emptyEnglishProject, englishProjectSentence, validateEnglishProject } from '../content/englishProjects';
import { englishAssessmentEvidence, englishOptions, englishReviewPriority, latestEnglishEvidence, readEnglishEvidence, readEnglishPractice, recordEnglishEvidence } from '../englishLearning';
import { englishRecallItems, englishReviewFocus } from '../englishReview';

beforeEach(() => localStorage.clear());
const record = (level: 'independent' | 'needs-help' | 'supported', at: number, source: 'adult' | 'self' | 'check' = 'adult', taskId = 'expression:transfer') => recordEnglishEvidence('one', { lessonId: 'friends-a', taskId, skill: 'expression', level, source, context: 'lesson', note: '真实观察' }, at);

describe('英语教学材料', () => {
  it('44 课保留明确目标与新情境表达，不再配置补充听力题', () => {
    const positions = new Set<number>();
    for (const lesson of ENGLISH_G3_ALL_LESSONS) {
      const task = getEnglishTeaching(lesson.id);
      expect(task.goal, lesson.id).toBeTruthy();
      expect(task.core.length, lesson.id).toBeGreaterThan(0);
      expect(task.expression.transfer?.prompt, lesson.id).not.toBe(task.expression.prompt);
      expect(task.check.options).toContain(task.check.answer);
      expect(task).not.toHaveProperty('listening');
      const options = englishOptions(task.check.options, lesson.id);
      expect(options).toEqual(englishOptions(task.check.options, lesson.id));
      positions.add(options.findIndex((option) => option === task.check.answer));
    }
    expect(positions.size).toBeGreaterThan(1);
  });
  it('核心点读限制材料，而不是强迫完成全部扩展内容', () => {
    const items = Array.from({ length: 12 }, (_, index) => ({ id: String(index), text: 'x', kind: index < 6 ? 'word' : 'line', blockId: index < 6 ? 'learn' : 'talk' }));
    expect(englishCoreSourceIds('friends-a', items)).toHaveLength(8);
    expect(englishCoreSourceIds('missing', items)).toEqual([]);
  });
  it('词义短句覆盖核心词汇，保留冠词、单复数和单位', () => {
    for (const unit of ENGLISH_G3_UPPER_UNITS) for (const part of [unit.a, unit.b]) for (const word of part.blocks.flatMap((block) => block.words ?? [])) {
      const clean = word.toLowerCase().replace(/\s*\(.*?\)/g, '').trim();
      expect(ENGLISH_WORD_SENTENCES[clean], `${unit.id}:${word}`).toBeTruthy();
    }
    expect(englishWordSentence('elephant')).toBe('It is an elephant.');
    expect(englishWordSentence('orange', 'plants')).toBe('It is an orange.');
    expect(englishWordSentence('orange', 'colours')).toBe('It is orange.');
    expect(englishWordSentence('grapes')).toBe('I like grapes.');
    expect(englishWordSentence('six')).toBe('Six yuan.');
  });
  it('拼读目标与教材或拓展定位一致，音位不交给 TTS 朗读', () => {
    for (const unit of ENGLISH_G3_UPPER_UNITS) {
      const task = ENGLISH_PHONICS_TASKS[unit.id];
      expect(unit.letters.items.map((item) => item.letter.toLowerCase())).toContain(task.letter);
      const textbookWords = unit.letters.decode.map((word) => word.toLowerCase());
      if (unit.id === 'friends') expect(textbookWords).toContain(task.novel);
      else expect(textbookWords).not.toContain(task.novel);
      expect(task.sounds.length).toBeGreaterThanOrEqual(3);
      expect(task.sentence.toLowerCase()).toContain(task.novel);
    }
    expect(ENGLISH_PHONICS_TASKS.numbers.position).toBe('last');
    expect(ENGLISH_PHONICS_TASKS.numbers.sounds.slice(-2)).toEqual(['/k/', '/s/']);
  });
  it('20 段原声任务依据明确文本检查或人工核对，不制造缺失脚本', () => {
    const activities = Object.keys(ENGLISH_G3_ORIGINAL_AUDIO).map(englishOriginalActivity);
    expect(activities).toHaveLength(20);
    expect(activities.filter((activity) => activity?.kind === 'meaning')).toHaveLength(7);
    for (const activity of activities) {
      expect(activity).toBeDefined();
      expect(ENGLISH_G3_ALL_LESSONS.some((lesson) => lesson.id === activity?.lessonId)).toBe(true);
      if (activity?.quiz) expect(activity.quiz.options).toContain(activity.quiz.answer);
      else expect(activity?.criteria?.length).toBeGreaterThan(1);
    }
    expect(englishOriginalActivity('missing')).toBeUndefined();
  });
  it('六种作品必须有实际信息和正确关系，作品句子不误教语法', () => {
    const base = emptyEnglishProject();
    const rows = {
      friends: [{ item: 'Smile', detail: 'I show friendliness.' }, { item: 'Listen', detail: 'I hear my friend.' }, { item: 'Help', detail: 'I help my friend.' }],
      families: [{ item: 'mother', detail: '长辈' }, { item: 'sister', detail: '同辈' }],
      animals: [{ item: 'cat', detail: 'Pets' }, { item: 'elephant', detail: 'Wild animals' }],
      plants: [{ item: 'water', detail: 'Plants need' }, { item: 'apples', detail: 'Plants give us' }, { item: 'plant trees', detail: 'We can' }],
      colours: [{ item: 'grass', detail: 'green' }, { item: 'flowers', detail: 'red' }],
    };
    for (const [unit, values] of Object.entries(rows)) {
      expect(validateEnglishProject(unit, base).length).toBeGreaterThan(0);
      expect(validateEnglishProject(unit, { ...base, name: 'Amy', rows: values }), unit).toEqual([]);
    }
    expect(validateEnglishProject('plants', { ...base, rows: rows.plants.map((row) => ({ ...row, detail: 'We can' })) }).length).toBeGreaterThan(0);
    expect(validateEnglishProject('animals', { ...base, rows: rows.animals.map((row) => ({ ...row, detail: 'Pets' })) }).length).toBeGreaterThan(0);
    expect(validateEnglishProject('numbers', { ...base, name: 'Amy', age: '7', time: '6:30 p.m.' })).toEqual([]);
    expect(validateEnglishProject('numbers', { ...base, name: 'Amy', age: '7', time: '7 years old' })).not.toEqual([]);
    expect(englishProjectSentence('animals', rows.animals[1])).toContain('an elephant');
    expect(englishProjectSentence('colours', rows.colours[1])).toBe('The flowers are red.');
  });
});

describe('能力证据和复习', () => {
  it('自记不能升为独立，不能覆盖观察；最近困难能覆盖历史最好', () => {
    record('independent', 1);
    record('independent', 2, 'self');
    expect(latestEnglishEvidence(readEnglishEvidence('one'))[0].level).toBe('independent');
    record('needs-help', 3);
    expect(latestEnglishEvidence(readEnglishEvidence('one'))[0].level).toBe('needs-help');
    expect(readEnglishEvidence('one').find((row) => row.source === 'self')?.level).toBe('practiced');
    expect(readEnglishEvidence('two')).toEqual([]);
  });
  it('过滤坏数据和参与条目，独立能力不会被点读或阶段练习持续压过', () => {
    const day = 86_400_000;
    record('independent', 1);
    record('independent', 1, 'self', 'source:talk-1');
    record('independent', 1, 'self', 'expression:stage-0');
    record('independent', 1, 'self', 'review:participation');
    expect(englishAssessmentEvidence(readEnglishEvidence('one'))).toHaveLength(1);
    expect(englishReviewPriority('one', 'friends-a', 4 * day)).toBe(0);
    expect(englishReviewPriority('one', 'friends-a', 8 * day)).toBe(1);
    record('supported', 1);
    expect(englishReviewPriority('one', 'friends-a', 4 * day)).toBe(2);
    record('needs-help', 1);
    expect(englishReviewPriority('one', 'friends-a', 2 * day)).toBe(3);
    localStorage.setItem('sfz-english-evidence-v1:one', JSON.stringify([{ skill: 'toString', level: 'independent' }]));
    expect(readEnglishEvidence('one')).toEqual([]);
    localStorage.setItem('sfz-english-practice-v1:one:friends-a:x', 'true');
    expect(readEnglishPractice('one', 'friends-a', 'x', { stage: 0 })).toEqual({ stage: 0 });
  });
  it('任务聚合不混淆不同课，复习选真实弱项并轮换检索材料', () => {
    record('independent', 1);
    recordEnglishEvidence('one', { lessonId: 'friends-a', taskId: 'listening:greet', skill: 'listening', level: 'needs-help', source: 'check', context: 'lesson', note: '' }, 2);
    recordEnglishEvidence('one', { lessonId: 'animals-a', taskId: 'expression:transfer', skill: 'expression', level: 'supported', source: 'adult', context: 'lesson', note: '' }, 3);
    expect(latestEnglishEvidence(readEnglishEvidence('one'))).toHaveLength(3);
    expect(englishReviewFocus('one', 'friends-a')).toBe('expression');
    expect(englishRecallItems('one', 'friends-a', 0)).toHaveLength(3);
    expect(englishRecallItems('one', 'friends-a', 0)[0].id).not.toBe(englishRecallItems('one', 'friends-a', 1)[0].id);
  });
});
