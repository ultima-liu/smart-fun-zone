import { describe, expect, it } from 'vitest';
import { advanceMoleRound, createMoleRound, hitMoleHole, MOLE_LEVELS, ROUND_MS } from '../games/whackAMoleEngine';

describe('花园打地鼠规则', () => {
  it('首只普通地鼠可命中且同一只不能重复加分', () => {
    const round = createMoleRound('easy');
    advanceMoleRound(round, 40, () => 0);
    expect(round.holes[0].kind).toBe('mole');
    expect(hitMoleHole(round, 0)).toBe('mole');
    expect(round.score).toBe(10);
    expect(hitMoleHole(round, 0)).toBeNull();
    expect(round.attempts).toBe(1);
  });

  it('第 5 次起双倍，第 10 次起三倍，金鼠按基础 30 分倍增', () => {
    const round = createMoleRound('normal');
    for (let index = 0; index < 10; index++) {
      round.holes[0] = { kind: index === 9 ? 'gold' : 'mole', expires: 9999, feedback: null, feedbackUntil: 0 };
      hitMoleHole(round, 0);
    }
    expect(round.score).toBe(40 + 100 + 90);
    expect(round.maxCombo).toBe(10);
    expect(round.hits).toBe(10);
  });

  it('误敲兔子扣分到零、重置连击；敲空只重置连击', () => {
    const round = createMoleRound('easy');
    round.score = 10;
    round.combo = 4;
    round.holes[1].kind = 'rabbit';
    round.holes[1].expires = 1000;
    hitMoleHole(round, 1);
    expect(round.score).toBe(0);
    expect(round.combo).toBe(0);
    expect(round.rabbitHits).toBe(1);
    round.combo = 3;
    hitMoleHole(round, 2);
    expect(round.combo).toBe(0);
    expect(round.attempts).toBe(2);
  });

  it('漏掉地鼠中断连击，兔子自行离开不影响连击', () => {
    const round = createMoleRound('hard');
    round.nextSpawn = 9999;
    round.combo = 5;
    round.holes[0].kind = 'rabbit';
    round.holes[0].expires = 100;
    advanceMoleRound(round, 100);
    expect(round.combo).toBe(5);
    round.holes[1].kind = 'gold';
    round.holes[1].expires = 200;
    advanceMoleRound(round, 100);
    expect(round.combo).toBe(0);
    expect(round.missed).toBe(1);
  });

  it('随机出现类型正确，并遵守同时出现上限', () => {
    const round = createMoleRound('hard');
    round.elapsed = 200;
    round.nextSpawn = 200;
    advanceMoleRound(round, 0, () => 0);
    expect(round.holes[0].kind).toBe('rabbit');
    round.nextSpawn = round.elapsed;
    advanceMoleRound(round, 0, () => .99);
    expect(round.holes[8].kind).toBe('gold');
    round.nextSpawn = round.elapsed;
    advanceMoleRound(round, 0, () => .5);
    round.nextSpawn = round.elapsed;
    advanceMoleRound(round, 0, () => .5);
    round.nextSpawn = round.elapsed;
    advanceMoleRound(round, 0, () => .5);
    expect(round.holes.filter((hole) => hole.kind)).toHaveLength(MOLE_LEVELS.hard.max);
  });

  it('首个计时回调延迟时第一只仍是普通地鼠', () => {
    const round = createMoleRound('easy');
    advanceMoleRound(round, 800, () => 0);
    expect(round.holes[0].kind).toBe('mole');
  });

  it('到 60 秒冻结结果，结束后敲击和计时均无效', () => {
    const round = createMoleRound('easy');
    advanceMoleRound(round, ROUND_MS + 1000);
    expect(round.over).toBe(true);
    expect(round.elapsed).toBe(ROUND_MS);
    expect(hitMoleHole(round, 0)).toBeNull();
    advanceMoleRound(round, 1000);
    expect(round.attempts).toBe(0);
    expect(round.elapsed).toBe(ROUND_MS);
  });
});
