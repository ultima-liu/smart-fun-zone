import { describe, expect, it } from 'vitest';
import { mathArenaQuestions } from '../content/mathArenaQuestions';
import { MATH_TEACHING, mathAnswerCorrect, mathCoreQuestions, mathQuestions } from '../content/mathTeaching';

describe('小检测与智能闯关分工', () => {
  it('全册闯关独立三题，覆盖三目标、数域和正确关系，不重放任何小检测变式', () => {
    for (const [id, teaching] of Object.entries(MATH_TEACHING)) {
      const checkpointPrompts = new Set(Array.from({ length: 80 }, (_, v) => mathCoreQuestions(mathQuestions(id, v)).slice(0, 2)).flat().map(q => q.prompt));
      for (let v = 0; v < 80; v++) {
        const arena = mathArenaQuestions(id, v);
        expect(arena, id).toHaveLength(3);
        expect(arena.map(q => q.objective), id).toEqual(teaching.goals);
        expect(new Set(arena.map(q => q.prompt)).size, id).toBe(3);
        for (const q of arena) {
          expect(checkpointPrompts.has(q.prompt), q.id).toBe(false);
          expect(q.transfer, q.id).toBe(true);
          expect(mathAnswerCorrect(q, q.answer), q.id).toBe(true);
          expect(q.numbers.every(n => Number.isInteger(n) && n >= 0 && n <= teaching.max), `${q.id}: ${q.numbers}`).toBe(true);
          if (q.options) {
            expect(q.options, q.id).toContain(q.answer);
            expect(new Set(q.options).size, q.id).toBe(q.options.length);
            expect(q.options.length, q.id).toBeGreaterThanOrEqual(2);
          }
          if (q.relation) {
            const { a, b, operation, result } = q.relation;
            expect(operation === '+' ? a + b : a - b, q.id).toBe(result);
          }
        }
      }
    }
  }, 15000);

  it('固定概念换成实际用途，而不是只改数字或给原题加前缀', () => {
    const ten = mathArenaQuestions('ten-again', 0);
    expect(ten[0].prompt).toContain('彩笔');
    expect(ten[1].prompt).toContain('十位和个位');
    expect(ten[2].prompt).toContain('糖');
    const plus = mathArenaQuestions('plus-nine', 3);
    expect(plus[0].prompt).toContain('水果');
    expect(plus[1].prompt).toContain('还剩');
    expect(plus[2].answer).toMatch(/－9＝/);
    expect(mathArenaQuestions('find-original', 3)[1].relation?.operation).toBe('+');
    expect(mathArenaQuestions('select-info-eight-nine', 3)[2].prompt).toContain('树');
    expect(mathArenaQuestions('mixed-add-sub', 3)[1].answer).toMatch(/^\d+\+\d+-1=\d+$/);
  });

  it('同种子稳定，数量题换轮变化，未知课程没有兜底考题', () => {
    expect(mathArenaQuestions('plus-nine', 3)).toEqual(mathArenaQuestions('plus-nine', 3));
    expect(mathArenaQuestions('plus-nine', 14).map(q => q.prompt)).not.toEqual(mathArenaQuestions('plus-nine', 3).map(q => q.prompt));
    expect(mathArenaQuestions('unknown', 0)).toEqual([]);
  });

  it('拆十让孩子判断数量是否改变，不拼接不存在的散装物品', () => {
    for (let v = 0; v < 80; v++) {
      const ten = mathArenaQuestions('ten-again', v)[2];
      expect(ten.kind).toBe('choice');
      expect(ten.prompt).toContain('你同意吗');
      expect(ten.answer).toBe('不同意，还是10颗');
      expect(mathAnswerCorrect(ten, '同意，变多了')).toBe(false);
      const twenty = mathArenaQuestions('eleven-twenty', v)[2];
      expect(twenty.prompt).toContain('多少个一');
      expect(twenty.answer).toBe(`${twenty.numbers[2]}个一`);
      for (const id of Object.keys(MATH_TEACHING)) {
        for (const q of mathArenaQuestions(id, v)) expect(q.prompt, q.id).not.toMatch(/(?:旁边|另有)\s*0\s*[颗支张]/);
      }
    }
  });
});
