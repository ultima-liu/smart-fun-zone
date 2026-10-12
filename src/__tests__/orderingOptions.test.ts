import { expect, it } from 'vitest';
import { orderingOptions } from '../orderingOptions';
import { CHINESE_TEXTBOOK_LESSONS } from '../content/chineseTextbookCurriculum';
import { getChineseTeaching } from '../content/chineseTeaching';
import { EXTENDED_MATH_LESSONS } from '../content/mathUpperCurriculum';

const chineseOrders = CHINESE_TEXTBOOK_LESSONS.flatMap(lesson => {
  const task = getChineseTeaching(lesson.id).transfer;
  return task?.kind === 'order' ? [{ id: lesson.id, items: task.items }] : [];
});
const mathOrders = EXTENDED_MATH_LESSONS.flatMap(lesson => lesson.activity.kind === 'order'
  ? [{ id: lesson.id, items: lesson.activity.values }] : []);

it('全册语文排序题在课内与复习各轮均不透露答案，重排变换且材料完整', () => {
  expect(chineseOrders).toHaveLength(6);
  for (const { id, items } of chineseOrders) {
    for (const session of ['lesson', 'review:0', 'review:1']) {
      let previous: string[] = [];
      for (let round = 0; round < 40; round++) {
        const seed = `${id}:transfer:${session}:${round}`;
        const choices = orderingOptions(items, seed, previous);
        expect([...choices].sort()).toEqual([...items].sort());
        expect(choices).not.toEqual(items);
        expect(choices).not.toEqual([...items].reverse());
        expect(choices).not.toEqual(previous);
        expect(orderingOptions(items, seed, previous)).toEqual(choices);
        previous = choices;
      }
    }
  }
});

it('全册数学共用数字排序卡同样错序且不改变正确答案数组', () => {
  expect(mathOrders.length).toBeGreaterThan(0);
  for (const { id, items } of mathOrders) {
    const original = [...items];
    for (let round = 0; round < 40; round++) {
      const choices = orderingOptions(items, `${id}:primary-order:${round}`);
      expect([...choices].sort((a, b) => a - b)).toEqual([...items].sort((a, b) => a - b));
      expect(choices).not.toEqual(items);
      expect(choices).not.toEqual([...items].reverse());
    }
    expect(items).toEqual(original);
  }
});

it('两张卡片始终错序，无其他有效排列时重排仍保留错序', () => {
  for (let seed = 0; seed < 50; seed++) {
    expect(orderingOptions(['先', '后'], String(seed), ['后', '先'])).toEqual(['后', '先']);
  }
});

it('重复材料仍保持数量且尽可能错序，不可打乱的材料安全返回', () => {
  for (let seed = 0; seed < 50; seed++) {
    const items = ['甲', '乙', '甲', '乙'];
    const choices = orderingOptions(items, String(seed));
    expect([...choices].sort()).toEqual([...items].sort());
    expect(choices).not.toEqual(items);
    expect(choices).not.toEqual([...items].reverse());
  }
  expect(orderingOptions([], 'empty')).toEqual([]);
  expect(orderingOptions(['甲'], 'single')).toEqual(['甲']);
  expect(orderingOptions(['甲', '甲'], 'same')).toEqual(['甲', '甲']);
});
