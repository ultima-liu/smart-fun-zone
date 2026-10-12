import { describe, expect, it } from 'vitest';
import { ALL_MATH_LESSONS } from '../content/mathUpperCurriculum';
import { MATH_TEACHING, mathAnswerCorrect, mathCoreQuestions, mathMisconception, mathOptions, mathPrerequisites, mathQuestions, mathReviewQuestions } from '../content/mathTeaching';

describe('数学逐课目标与变式评价', () => {
  it('47课均有明确目标、先备来源和不越界的核心题，包括精简路径', () => {
    expect(Object.keys(MATH_TEACHING).sort()).toEqual(ALL_MATH_LESSONS.map((lesson) => lesson.id).sort());
    for (const lesson of ALL_MATH_LESSONS) {
      const teaching = MATH_TEACHING[lesson.id];
      if (teaching.prerequisite) expect(MATH_TEACHING[teaching.prerequisite], lesson.id).toBeDefined();
      for (let variant = 0; variant < 80; variant++) {
        const questions = mathQuestions(lesson.id, variant);
        expect(questions, lesson.id).toHaveLength(5);
        expect(new Set(mathCoreQuestions(questions).map((q) => q.objective)), lesson.id).toEqual(new Set(teaching.goals));
        for (const q of questions) {
          expect(q.numbers.every((n) => Number.isInteger(n) && n >= 0 && n <= teaching.max), `${q.id}: ${q.numbers}`).toBe(true);
          expect(mathAnswerCorrect(q, q.answer), q.id).toBe(true);
          if (q.kind === 'choice') {
            expect(q.options, q.id).toContain(q.answer);
            expect(new Set(q.options).size, q.id).toBe(q.options!.length);
          }
          if (q.relation) {
            const { a, b, operation, result } = q.relation;
            expect(operation === '+' ? a + b : a - b, q.id).toBe(result);
          }
        }
      }
    }
  }, 15000);

  it('早期课程不会因连对而出现12以内的额外基础题', () => {
    for (const id of ['numbers', 'compare', 'compose', 'add-within-5', 'subtract-within-5']) {
      for (let variant = 0; variant < 30; variant++) expect(mathQuestions(id, variant).every((q) => q.numbers.every((n) => n <= 5))).toBe(true);
    }
  });

  it('凑十完整检查拆分、剩余与结果，求原来和信息筛选有专属产出', () => {
    const questions = mathQuestions('plus-nine', 3);
    expect(questions[0].answer).toBe('14');
    expect(questions[1].answer).toBe('1');
    expect(questions[2].answer).toBe('4');
    expect(mathMisconception(questions[0], '10').diagnosis).toContain('漏掉');
    expect(mathQuestions('find-original', 3)[1].relation?.operation).toBe('+');
    expect(mathQuestions('select-info-eight-nine', 3)[0].prompt).toContain('鹿');
    expect(mathQuestions('select-info-eight-nine', 3)[1].kind).toBe('expression');
  });

  it('检测要求实际产出对应目标，而不只给题目贴目标标签', () => {
    expect(mathQuestions('add-within-5', 2)[2].relation?.operation).toBe('+');
    expect(mathQuestions('subtract-within-5', 2)[2].relation?.operation).toBe('+');
    expect(mathQuestions('solve-total', 2)[2].prompt).toContain('合起来');
    expect(mathQuestions('find-original', 2)[2].relation?.operation).toBe('-');
    const chain = mathQuestions('mixed-add-sub', 2)[2];
    expect(chain.kind).toBe('expression');
    expect(chain.answer).toMatch(/^\d+\+\d+-\d+=\d+$/);
    expect(mathAnswerCorrect(chain, chain.answer.replace('-', '+'))).toBe(false);
    expect(mathQuestions('review-application', 2)[2].visual?.kind).toBe('positions');
    expect(mathQuestions('review-application', 2)[2].visual?.objects?.[0].kind).toBe('pencil-case');
    expect(mathQuestions('solid-shapes', 1).map((q) => q.prompt)).not.toEqual(mathQuestions('solid-shapes', 2).map((q) => q.prompt));
  });

  it('算式允许交换加数但不接受关系错误或任意可执行文本', () => {
    const q = mathQuestions('add-within-5', 2)[1];
    const { a, b, result } = q.relation!;
    expect(mathAnswerCorrect(q, `${b} ＋ ${a} ＝ ${result}`)).toBe(true);
    expect(mathAnswerCorrect(q, `${a}-${b}=${result}`)).toBe(false);
    expect(mathAnswerCorrect(q, `${a}+${b}=${result + 1}`)).toBe(false);
    expect(mathAnswerCorrect(q, 'alert(1)')).toBe(false);
  });

  it('选项同题稳定，不同种子不会始终把答案放第一项', () => {
    const items = ['正确', '误区A', '误区B'];
    expect(mathOptions(items, 'same')).toEqual(mathOptions(items, 'same'));
    const positions = new Set(Array.from({ length: 40 }, (_, i) => mathOptions(items, String(i)).indexOf('正确')));
    expect(positions.size).toBe(3);
  });

  it('先备诊断不拿新课的超前知识作门槛，复习混合相关能力且轮换材料', () => {
    expect(mathPrerequisites('plus-nine', 1).every((q) => q.lessonId === 'ten')).toBe(true);
    const first = mathReviewQuestions('plus-nine', 1);
    const later = mathReviewQuestions('plus-nine', 2);
    expect(first).toHaveLength(3);
    expect(first[2].lessonId).toBe('ten');
    expect(later.map((q) => q.prompt)).not.toEqual(first.map((q) => q.prompt));
  });
});
