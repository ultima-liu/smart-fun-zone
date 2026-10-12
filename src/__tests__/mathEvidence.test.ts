import { nextLessonToLearn } from '../activeCourses';
import { beforeEach, describe, expect, it } from 'vitest';
import { latestMathEvidence, mathAssessmentStars, mathCheckLevel, mathEvidenceReviewPriority, readMathEvidence, recordMathEvidence } from '../mathLearning';

beforeEach(() => localStorage.clear());

describe('数学学习证据与奖励分离', () => {
  const base = { lessonId: 'plus-nine', taskId: 'lesson:0', objective: '计算完整结果', context: 'lesson' as const, source: 'check' as const, note: '新题作答' };
  it('记录最新困难，不被旧满星或历史最好表现掩盖，并隔离儿童', () => {
    recordMathEvidence('a', { ...base, level: 'independent' }, 100);
    recordMathEvidence('a', { ...base, level: 'needs-practice' }, 200);
    const rows = readMathEvidence('a');
    expect(rows).toHaveLength(1);
    expect(latestMathEvidence(rows)[0].level).toBe('needs-practice');
    expect(readMathEvidence('b')).toEqual([]);
  });
  it('自述和语音记录不能覆盖实际检查或被自动记为掌握', () => {
    recordMathEvidence('a', { ...base, level: 'independent' }, 100);
    recordMathEvidence('a', { ...base, level: 'transfer', source: 'self' }, 200);
    expect(readMathEvidence('a').find((row) => row.source === 'self')?.level).toBe('practiced');
    expect(latestMathEvidence(readMathEvidence('a'))[0].level).toBe('independent');
  });
  it('挑战和先备诊断不降低本课掌握判断', () => {
    recordMathEvidence('a', { ...base, level: 'independent' }, 100);
    recordMathEvidence('a', { ...base, context: 'challenge', level: 'needs-practice' }, 200);
    expect(latestMathEvidence(readMathEvidence('a'))[0].level).toBe('independent');
    expect(mathAssessmentStars(['independent', 'transfer', 'independent'])).toBe(3);
    expect(mathAssessmentStars(['supported', 'transfer'])).toBe(2);
    expect(mathAssessmentStars(['supported', 'supported'])).toBe(1);
  });
  it('仅延迟复习且独立完成才记录保持，提示后的成功仍记录支持', () => {
    expect(mathCheckLevel('review', false, true, true)).toBe('retained');
    expect(mathCheckLevel('review', false, false, false)).toBe('independent');
    expect(mathCheckLevel('review', true, true, true)).toBe('supported');
  });
  it('数学提示后完成即推荐下一课，不要求为推进重刷满星', () => {
    expect(nextLessonToLearn('a', { a: { 'math-lab-campus': { stars: 1, gold: false, updatedAt: 100 } } })?.id).toBe('playground');
  });
  it('复习优先级考虑支持需要与证据年龄，损坏数据安全忽略', () => {
    recordMathEvidence('a', { ...base, level: 'needs-practice' }, 100);
    expect(mathEvidenceReviewPriority('a', 'plus-nine', 100 + 86400000)).toBe(3);
    localStorage.setItem('sfz-math-evidence-v1:a', '[null,42,{"level":"constructor"}]');
    expect(readMathEvidence('a')).toEqual([]);
  });
});
