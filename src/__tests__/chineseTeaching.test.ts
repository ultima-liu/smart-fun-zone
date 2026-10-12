import { beforeEach, describe, expect, it, afterEach, vi } from 'vitest';
import { CHINESE_TEXTBOOK_LESSONS, CHINESE_BOOK_UNITS } from '../content/chineseTextbookCurriculum';
import { getChineseTeaching, CHINESE_UNIT_PROGRESSION } from '../content/chineseTeaching';
import { CHINESE_PINYIN_TRIALS } from '../content/chinesePinyinTrials';
import { CHINESE_PINYIN_AUDIO } from '../content/chinesePinyinAudio';
import { chineseOptions, chineseEvidenceReviewPriority, recordChineseEvidence, readChineseEvidence, type ChineseEvidence } from '../chineseLearning';
import { chineseReviewBank, chineseReviewEvidence, selectChineseReview, chineseReviewInterval, chineseReviewPriority } from '../chineseReview';
import { clearChinesePracticeState } from '../chinesePracticeState';
import { playPinyinRecording, stopPinyinAudio } from '../pinyinAudio';
import { useStore } from '../store';

beforeEach(() => { localStorage.clear(); useStore.setState({ sound: true, voiceOn: true }); });
afterEach(() => { stopPinyinAudio(); vi.unstubAllGlobals(); });
const evidence = (changes: Partial<ChineseEvidence> = {}): Omit<ChineseEvidence, 'at'> => ({ lessonId: 'crow-drinks-water', taskId: 'oral-transfer', skill: 'expression', level: 'independent', source: 'adult', context: 'lesson', note: '按顺序讲清问题、办法和结果', ...changes });

describe('整册教学完整性与评价效度', () => {
  it('45 课都有明确目标、课型递进、实际交流任务和复习材料', () => {
    expect(CHINESE_TEXTBOOK_LESSONS).toHaveLength(45);
    for (const unit of CHINESE_BOOK_UNITS) {
      expect(CHINESE_UNIT_PROGRESSION[unit.title].steps).toHaveLength(3);
      expect(CHINESE_UNIT_PROGRESSION[unit.title].check.length).toBeGreaterThan(15);
    }
    for (const lesson of CHINESE_TEXTBOOK_LESSONS) {
      const teaching = getChineseTeaching(lesson.id);
      expect(teaching.goals).toHaveLength(3);
      expect(new Set(teaching.goals.map((goal) => goal.skill)).size).toBe(3);
      expect(teaching.goals.every((goal) => goal.text.length > 10)).toBe(true);
      expect(teaching.sessions).toHaveLength(2);
      expect(teaching.oral.criteria).toHaveLength(3);
      expect(teaching.oral.model?.length).toBeGreaterThan(3);
      expect(teaching.oral.criteria.join('')).not.toMatch(/回应|倾听|听后|听清|拼读|音量/);
      expect(teaching.oral.response.length).toBeGreaterThan(15);
      if (lesson.kind === 'garden' || lesson.kind === 'orientation') expect(teaching.oral.responseModel?.length).toBeGreaterThan(3);
      expect(chineseReviewBank(lesson.id).length).toBeGreaterThan(0);
      expect(teaching.bridge).toBe(lesson.id === 'metal-wood-water-fire-earth' ? 'required' : 'optional');
      expect(lesson.questions).toHaveLength(3);
    }
    for (const id of ['autumn', 'little-boat', 'crow-drinks-water']) expect(getChineseTeaching(id).reading?.compare).toHaveLength(2);
    expect(getChineseTeaching('crow-drinks-water').transfer?.kind).toBe('order');
    expect(getChineseTeaching('snow-painters').transfer?.kind).toBe('match');
  });
  it('选项稳定且答案分布覆盖所有位置，不改变答案或材料', () => {
    const positions = new Set<number>();
    for (const lesson of CHINESE_TEXTBOOK_LESSONS) lesson.questions.forEach((question, index) => {
      const seed = `${lesson.id}:challenge:${index}`;
      const choices = chineseOptions(question.options, seed);
      expect(choices).toEqual(chineseOptions(question.options, seed));
      expect([...choices].sort()).toEqual([...question.options].sort());
      expect(new Set(choices).size).toBe(3);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(3);
      positions.add(choices.indexOf(question.options[question.answer]));
      expect(choices.some((choice) => /无关图片|只看颜色|上一课字母|汉字笔画/.test(choice))).toBe(false);
    });
    expect([...positions].sort()).toEqual([0, 1, 2]);
  });
  it('14 节拼音均有学习/迁移不同的听辨音节，目标录音和全部范写均可本地加载', () => {
    expect(Object.keys(CHINESE_PINYIN_TRIALS)).toHaveLength(14);
    for (const [id, trials] of Object.entries(CHINESE_PINYIN_TRIALS)) {
      expect(trials).toHaveLength(4);
      expect(new Set(trials.map((trial) => trial.target)).size).toBe(4);
      expect(CHINESE_TEXTBOOK_LESSONS.find((lesson) => lesson.id === id)!.questions[0].audio).toBe(trials[2].target);
      for (const trial of trials) {
        expect(trial.choices).toContain(trial.target);
        expect(CHINESE_PINYIN_AUDIO[trial.target]).toMatch(/^\/assets\/chinese-textbook\/audio\/pinyin-.+\.mp3$/);
      }
    }

  });
});

describe('儿童隔离、参与证据与当前表现', () => {
  it('孩子自记不会升级成独立掌握，另一个儿童不会继承记录', () => {
    recordChineseEvidence('a', evidence({ source: 'self' }), 100);
    expect(readChineseEvidence('a')[0].level).toBe('practiced');
    expect(readChineseEvidence('b')).toEqual([]);
  });
  it('同一任务后来的困难覆盖历史最好成绩，延时复习单独保存', () => {
    recordChineseEvidence('a', evidence(), 100);
    recordChineseEvidence('a', evidence({ level: 'supported' }), 200);
    recordChineseEvidence('a', evidence({ context: 'review' }), 300);
    expect(readChineseEvidence('a')).toHaveLength(2);
    expect(readChineseEvidence('a').find((row) => row.context === 'lesson')?.level).toBe('supported');
  });
  it('后来自己练习不抹掉家人或自动检查的困难，复习继续优先该细项', () => {
    const now = 100 * 86_400_000;
    recordChineseEvidence('a', evidence({ level: 'supported' }), now - 4 * 86_400_000);
    recordChineseEvidence('a', evidence({ source: 'self', level: 'supported' }), now);
    const rows = readChineseEvidence('a');
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.source === 'self')?.level).toBe('practiced');
    const task = chineseReviewBank('crow-drinks-water').find((task) => task.skill === 'expression')!;
    expect(chineseReviewEvidence(rows, task)?.level).toBe('supported');
    expect(chineseEvidenceReviewPriority('a', 'crow-drinks-water', now)).toBe(2);
  });
  it('损坏记录可恢复，清除本课断点不会清除证据或其他儿童断点', () => {
    localStorage.setItem('sfz-chinese-evidence-v1:a', '{broken');
    expect(readChineseEvidence('a')).toEqual([]);
    recordChineseEvidence('a', evidence());
    localStorage.setItem('sfz-chinese-practice-v1:a:crow-drinks-water:writingIndex', '2');
    localStorage.setItem('sfz-chinese-practice-v1:b:crow-drinks-water:writingIndex', '1');
    clearChinesePracticeState('a', 'crow-drinks-water');
    expect(localStorage.getItem('sfz-chinese-practice-v1:a:crow-drinks-water:writingIndex')).toBeNull();
    expect(localStorage.getItem('sfz-chinese-practice-v1:b:crow-drinks-water:writingIndex')).toBe('1');
    expect(readChineseEvidence('a')).toHaveLength(1);
  });
});

describe('按能力复习', () => {
  it('独立表现可延后检查，仍需要提示的项目优先', () => {
    const now = 100 * 86_400_000;
    recordChineseEvidence('a', evidence({ skill: 'recognition', taskId: 'recognition:喝', source: 'check' }), now - 1000);
    recordChineseEvidence('a', evidence({ skill: 'writing', taskId: 'paper-writing:只', level: 'supported' }), now - 4 * 86_400_000);
    recordChineseEvidence('a', evidence({ skill: 'reading', taskId: 'transfer-operation', source: 'check' }), now - 1000);
    recordChineseEvidence('a', evidence(), now - 1000);
    expect(selectChineseReview('a', 'crow-drinks-water', 0, now)?.skill).toBe('writing');
    expect(chineseReviewPriority('a', 'crow-drinks-water', now)).toBe(2);
    expect(chineseReviewInterval()).toBe(1);
    expect(chineseReviewInterval({ ...evidence(), at: now })).toBe(7);
  });
  it('另一项答对不会掩盖易错字；听辨独立不代表能独立拼读', () => {
    recordChineseEvidence('a', evidence({ skill: 'recognition', taskId: 'recognition:喝', source: 'check', level: 'supported' }), 100);
    recordChineseEvidence('a', evidence({ skill: 'recognition', taskId: 'recognition:石', source: 'check' }), 200);
    const task = chineseReviewBank('crow-drinks-water').find((task) => task.kind === 'recognition')!;
    expect(chineseReviewEvidence(readChineseEvidence('a'), task)?.level).toBe('supported');
    recordChineseEvidence('a', evidence({ lessonId: 'pinyin-b-p-m-f', taskId: 'listen:pá', skill: 'pinyin', source: 'check' }), 300);
    const production = chineseReviewBank('pinyin-b-p-m-f').find((task) => task.kind === 'production')!;
    expect(chineseReviewEvidence(readChineseEvidence('a'), production)).toBeUndefined();
  });
  it('旧点读不会使刚独立检查过的能力永久优先', () => {
    const now = new Date('2026-10-06T10:00:00').getTime();
    recordChineseEvidence('a', evidence({ taskId: 'whole-reading', skill: 'reading', source: 'self' }), now - 10 * 86_400_000);
    recordChineseEvidence('a', evidence({ taskId: 'transfer-operation', skill: 'reading', source: 'check' }), now - 1000);
    expect(chineseEvidenceReviewPriority('a', 'crow-drinks-water', now)).toBe(0);
    recordChineseEvidence('a', evidence({ taskId: 'challenge:1', skill: 'reading', source: 'check', level: 'supported' }), now - 4 * 86_400_000);
    expect(chineseEvidenceReviewPriority('a', 'crow-drinks-water', now)).toBe(2);
  });
});

describe('拼音录音播放证据', () => {
  it('只有正常播放结束才算听过，静音和播放失败不算', async () => {
    class FakeAudio {
      onended: (() => void) | null = null; onerror: (() => void) | null = null;
      pause() {}
      play() { queueMicrotask(() => this.onended?.()); return Promise.resolve(); }
    }
    vi.stubGlobal('Audio', FakeAudio);
    expect(await playPinyinRecording('á')).toBe(true);
    useStore.setState({ sound: false });
    expect(await playPinyinRecording('á')).toBe(false);
    useStore.setState({ sound: true });
    vi.stubGlobal('Audio', class extends FakeAudio { play() { return Promise.reject(new Error('device')); } });
    expect(await playPinyinRecording('á')).toBe(false);
  });
  it('切换页面终止录音，不把未播完的音节记成听过', async () => {
    vi.stubGlobal('Audio', class { onended = null; onerror = null; pause() {} play() { return Promise.resolve(); } });
    const result = playPinyinRecording('á');
    stopPinyinAudio();
    expect(await result).toBe(false);
  });
});
