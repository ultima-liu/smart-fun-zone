import { describe, expect, it } from 'vitest';
import { ALL_MATH_LESSONS } from '../content/mathUpperCurriculum';
import { MATH_TEACHING } from '../content/mathTeaching';
import { explorationAnswerCorrect, mathExplorationPlan } from '../content/mathExplorations';

describe('逐课数学小探索', () => {
  it('47课具有不同探索主题和问题组合，材料实际改变，目标和数域与本课一致', () => {
    const titles = new Set<string>(), problems = new Set<string>();
    for (const lesson of ALL_MATH_LESSONS) {
      const base = mathExplorationPlan(lesson.id);
      titles.add(base.title); problems.add(base.stages.map(stage => stage.question.prompt).join('|'));
      for (let round = 0; round < 20; round++) {
        const plan = mathExplorationPlan(lesson.id, round);
        expect(plan.stages).toHaveLength(2);
        expect(new Set(plan.stages.map(stage => stage.question.objective)).size).toBe(2);
        for (const stage of plan.stages) {
          expect(MATH_TEACHING[lesson.id].goals).toContain(stage.question.objective);
          expect(stage.actions.length).toBeGreaterThan(0);
          let prior = stage.scene;
          for (const action of stage.actions) {
            expect(JSON.stringify(action.scene), `${lesson.id}/${round}/${action.label}`).not.toBe(JSON.stringify(prior));
            prior = action.scene;
          }
          expect(explorationAnswerCorrect(stage.question, stage.question.answer)).toBe(true);
          for (const n of stage.question.numbers) expect(n).toBeLessThanOrEqual(MATH_TEACHING[lesson.id].max);
          if (stage.question.options) { expect(new Set(stage.question.options).size).toBe(stage.question.options.length); expect(stage.question.options).toContain(stage.question.answer); }
        }
      }
    }
    expect(titles.size).toBe(47); expect(problems.size).toBe(47);
  });
  it('同类课程考察不同关系，重新探索改变材料或操作顺序', () => {
    for (const lesson of ALL_MATH_LESSONS) {
      const material = (round: number) => mathExplorationPlan(lesson.id, round).stages.map(stage => ({ scene: stage.scene, actions: stage.actions, prompt: stage.question.prompt, answer: stage.question.answer }));
      expect(JSON.stringify(material(1)), lesson.id).not.toBe(JSON.stringify(material(0)));
    }
    expect(mathExplorationPlan('find-original').stages[0].question.kind).toBe('expression');
    expect(mathExplorationPlan('solve-remain-within-7').stages[0].question.answer).toContain('-');
    expect(mathExplorationPlan('between-positions').stages.map(stage => stage.question.answer)).toEqual(['3', '5']);
  });
  it('探究算式保留关系和先后，加法可交换，错误结果与可执行输入不能通过', () => {
    const add = mathExplorationPlan('add-within-5').stages[1].question;
    expect(explorationAnswerCorrect(add, '2＋1＝3')).toBe(true);
    expect(explorationAnswerCorrect(add, '1+2=4')).toBe(false);
    const mixed = mathExplorationPlan('mixed-add-sub').stages[1].question;
    expect(explorationAnswerCorrect(mixed, '4+2-1=5')).toBe(true);
    expect(explorationAnswerCorrect(mixed, '4-1+2=5')).toBe(false);
    expect(explorationAnswerCorrect(mixed, 'alert(1)')).toBe(false);
  });
});
