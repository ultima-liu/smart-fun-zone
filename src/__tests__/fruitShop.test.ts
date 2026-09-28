import { describe, expect, it } from 'vitest';
import { adaptFruitShopLevel, buildFruitShopSession, createFruitShopRandom, fruitShopAbilityForLesson, fruitShopMaxForLesson, unlockedFruitShopAbilities } from '../content/fruitShop';

function cyclicRandom(values: number[]) {
  let index = 0;
  return () => values[index++ % values.length];
}

describe('小卷水果店关卡', () => {
  it('小芽难度只生成 1～5 的点数订单', () => {
    const rounds = buildFruitShopSession(1, cyclicRandom([0, .2, .45, .7, .99]));
    expect(rounds).toHaveLength(3);
    for (const round of rounds) {
      expect(round.kind).toBe('serve');
      if (round.kind !== 'serve') throw new Error('题型生成错误');
      expect(round.targets[0]).toBeGreaterThanOrEqual(1);
      expect(round.targets[0]).toBeLessThanOrEqual(5);
      expect(round.initial).toEqual([0]);
    }
  });

  it('成长难度包含补齐和比较，且比较两边数量不同', () => {
    const rounds = buildFruitShopSession(2, cyclicRandom([.1, .3, .6, .8]));
    expect(rounds.map((round) => round.kind)).toEqual(['topup', 'compare', 'serve']);
    const topup = rounds[0];
    const compare = rounds[1];
    if (topup.kind !== 'topup' || compare.kind !== 'compare') throw new Error('题型生成错误');
    expect(topup.initial[0]).toBeLessThan(topup.targets[0]);
    expect(compare.amounts[0]).not.toBe(compare.amounts[1]);
    expect(compare.answer).toBe(compare.ask === 'more'
      ? (compare.amounts[0] > compare.amounts[1] ? 0 : 1)
      : (compare.amounts[0] < compare.amounts[1] ? 0 : 1));
  });

  it('挑战难度包含双篮分配，并保持总数等于两份目标之和', () => {
    const rounds = buildFruitShopSession(3, cyclicRandom([.15, .35, .55, .75]));
    const split = rounds.find((round) => round.kind === 'split');
    expect(split?.kind).toBe('split');
    if (!split || split.kind !== 'split') return;
    expect(split.guests).toHaveLength(2);
    expect(split.targets.reduce((sum, value) => sum + value, 0)).toBeGreaterThanOrEqual(4);
    expect(split.initial).toEqual([0, 0]);
  });

  it('连续受助时降一级，连续独立完成时升一级', () => {
    expect(adaptFruitShopLevel(2, 2, 0)).toBe(1);
    expect(adaptFruitShopLevel(2, 0, 3)).toBe(3);
    expect(adaptFruitShopLevel(1, 0, 3)).toBe(2);
    expect(adaptFruitShopLevel(3, 0, 3)).toBe(3);
    expect(adaptFruitShopLevel(2, 1, 2)).toBe(2);
  });

  it.each(['addition', 'subtraction', 'make-ten'] as const)('课程聚焦 %s 时三单都只练本课能力', (ability) => {
    const rounds = buildFruitShopSession(2, cyclicRandom([.1, .3, .6, .8]), ability, ['counting', ability]);
    expect(rounds.map((round) => round.kind)).toEqual([ability, ability, ability]);
    for (const round of rounds) {
      if (round.kind !== 'addition' && round.kind !== 'subtraction' && round.kind !== 'make-ten') throw new Error('题型生成错误');
      expect(round.options).toContain(round.answer);
      if (round.kind === 'addition') expect(round.answer).toBe(round.first + round.second);
      if (round.kind === 'subtraction') expect(round.answer).toBe(round.first - round.second);
      if (round.kind === 'make-ten') expect(round.answer).toBe(10 - round.first);
    }
  });

  it('按已完成课程开放能力，并为课程返回聚焦能力', () => {
    expect(fruitShopAbilityForLesson('add-within-5')).toBe('addition');
    expect(fruitShopAbilityForLesson('subtract-within-5')).toBe('subtraction');
    expect(fruitShopAbilityForLesson('plus-nine')).toBe('make-ten');
    expect(unlockedFruitShopAbilities(['compare', 'add-within-5'])).toEqual(['counting', 'compare', 'addition']);
  });

  it('只给内容适合的课程配置水果店，并遵守本课数量范围', () => {
    expect(fruitShopAbilityForLesson('classroom-discover')).toBeUndefined();
    expect(fruitShopAbilityForLesson('solid-shapes')).toBeUndefined();
    expect(fruitShopMaxForLesson('add-within-5')).toBe(5);
    const rounds = buildFruitShopSession(3, cyclicRandom([.1, .3, .6, .8]), 'addition', ['addition'], 5);
    expect(rounds.every((round) => round.kind === 'addition' && round.answer <= 5)).toBe(true);
  });

  it('同一课程种子生成相同订单，不同复习节点生成不同变式', () => {
    const courseA = buildFruitShopSession(2, createFruitShopRandom('child:course:add-within-5'), 'addition', ['counting', 'addition']);
    const courseB = buildFruitShopSession(2, createFruitShopRandom('child:course:add-within-5'), 'addition', ['counting', 'addition']);
    const reviewDay2 = buildFruitShopSession(2, createFruitShopRandom('child:review:add-within-5:day-2'), 'addition', ['counting', 'addition']);
    expect(courseA).toEqual(courseB);
    expect(reviewDay2).not.toEqual(courseA);
  });
});
