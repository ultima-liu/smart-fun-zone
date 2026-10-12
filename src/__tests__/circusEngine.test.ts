import { describe, expect, it } from 'vitest';
import {
  addCircusScore,
  advanceCircus,
  CIRCUS_ACTS,
  createCircusState,
  circusBonus,
  circusDifficulty,
  circusObstacleX,
  circusTrapeze,
  hitCircus,
  jumpCircus,
  nextCircusAct,
  retryCircus,
  type CircusState,
} from '../games/circusEngine';

describe('FC 马戏团', () => {
  it('保留 FC 五节目顺序、A/B 难度、三命与奖金倒计时', () => {
    expect(CIRCUS_ACTS.map((a) => a.zh)).toEqual([
      '骑狮钻火圈',
      '走钢丝',
      '踩球',
      '骑马',
      '空中飞人',
    ]);
    const a = createCircusState(),
      b = createCircusState('B');
    expect(a.lives).toBe(3);
    expect(circusDifficulty(b)).toBe(1);
    expect(b.obstacles.length).toBeGreaterThan(a.obstacles.length);
    advanceCircus(a, 1);
    expect(circusBonus(a)).toBe(4950);
    expect(createCircusState('A', 5).obstacles.some((o) => o.kind === 'trapeze')).toBe(true);
  });
  it('按固定帧推进，不受渲染帧率影响；非法时间不推进', () => {
    const a = createCircusState(),
      b = createCircusState();
    advanceCircus(a, 0.5, 1);
    for (let i = 0; i < 50; i++) advanceCircus(b, 0.01, 1);
    expect(a.x).toBeCloseTo(b.x, 8);
    expect(a.y).toBe(b.y);
    expect(a.stageTime).toBeCloseTo(b.stageTime);
    const x = a.x;
    for (const t of [-1, 0, Infinity, NaN]) advanceCircus(a, t, 1);
    expect(a.x).toBe(x);
  });
  it('单次起跳不能空中连跳，左右移动与落地生效', () => {
    const s = createCircusState();
    expect(jumpCircus(s)).toBe(true);
    expect(jumpCircus(s, true)).toBe(false);
    advanceCircus(s, 0.3, 1);
    expect(s.x).toBeGreaterThan(48);
    expect(s.y).toBeLessThan(150);
    advanceCircus(s, 0.6);
    expect(s.grounded).toBe(true);
    expect(s.y).toBe(184);
    const x = s.x;
    advanceCircus(s, 0.1, -1);
    expect(s.x).toBeLessThan(x);
  });
  it('火圈需要跳过下沿，上沿也会碰撞；火盆不能直接走过', () => {
    for (const y of [184, 112]) {
      const s = createCircusState();
      s.x = 270;
      s.y = y;
      s.grounded = false;
      advanceCircus(s, 1 / 60);
      expect(s.status).toBe('hit');
    }
    const through = createCircusState();
    through.x = 270;
    through.y = 145;
    through.grounded = false;
    advanceCircus(through, 0.2, 1);
    expect(through.status).toBe('playing');
    expect(through.score).toBe(100);
    const pot = createCircusState();
    pot.x = 370;
    advanceCircus(pot, 1 / 60);
    expect(pot.lives).toBe(2);
  });
  it('钢丝猴子移动，紫猴更快；跳过紫猴得 500 分', () => {
    const s = createCircusState('A', 2),
      brown = s.obstacles[0],
      purple = s.obstacles.find((o) => o.variant === 1)!;
    advanceCircus(s, 1);
    expect(brown.x - circusObstacleX(s, brown)).toBeCloseTo(51);
    expect(purple.x - circusObstacleX(s, purple)).toBeCloseTo(108);
    s.obstacles = [purple];
    s.x = circusObstacleX(s, purple) + 16;
    s.y = 115;
    s.grounded = false;
    advanceCircus(s, 1 / 60);
    expect(s.score).toBe(500);
    expect(s.status).toBe('playing');
  });
  it('踩球必须落在球上，空隙会掉命；球持续滚动', () => {
    const s = createCircusState('A', 3);
    expect(s.support).toBe(0);
    const ball = s.obstacles[1];
    advanceCircus(s, 0.2);
    expect(circusObstacleX(s, ball)).toBeLessThan(ball.x);
    const land = createCircusState('A', 3);
    land.x = 155;
    land.y = 163;
    land.vy = 100;
    land.grounded = false;
    advanceCircus(land, 1 / 60);
    expect(land.support).toBe(1);
    expect(land.score).toBe(500);
    const fall = createCircusState('A', 3);
    fall.x = 105;
    fall.y = 163;
    fall.vy = 100;
    fall.grounded = false;
    fall.support = null;
    advanceCircus(fall, 0.5);
    expect(fall.status).toBe('hit');
  });
  it('骑马自动前进，方向调马速；大小跳高度不同，弹板有弹跳', () => {
    const slow = createCircusState('A', 4),
      fast = createCircusState('A', 4);
    advanceCircus(slow, 0.5, -1);
    advanceCircus(fast, 0.5, 1);
    expect(fast.x - slow.x).toBeCloseTo(35);
    const low = createCircusState('A', 4),
      high = createCircusState('A', 4);
    jumpCircus(low);
    jumpCircus(high, true);
    advanceCircus(low, 0.35);
    advanceCircus(high, 0.35);
    expect(high.y).toBeLessThan(low.y - 20);
    const spring = createCircusState('A', 4);
    spring.x = 211;
    advanceCircus(spring, 1 / 60);
    expect(spring.events).toContain('bounce');
    expect(spring.vy).toBe(-345);
  });
  it('秋千按照时间摆动，松手沿切线飞出，能接杆与在跳床反弹', () => {
    const s = createCircusState('A', 5),
      rope = s.obstacles[0],
      first = circusTrapeze(s, rope);
    advanceCircus(s, 0.3);
    expect(s.x).not.toBe(first.x);
    expect(s.support).toBe(0);
    const vx = s.vx;
    expect(jumpCircus(s)).toBe(true);
    expect(s.support).toBeNull();
    expect(s.vx).toBeGreaterThan(vx);
    const catchState = createCircusState('A', 5);
    catchState.support = null;
    catchState.releaseAt = -1;
    const bar = circusTrapeze(catchState, catchState.obstacles[1]);
    catchState.x = bar.x;
    catchState.y = bar.y + 25;
    advanceCircus(catchState, 1 / 60);
    expect(catchState.support).toBe(1);
    expect(catchState.events).toContain('catch');
    const bounce = createCircusState('A', 5);
    bounce.support = null;
    bounce.x = 140;
    bounce.y = 182;
    bounce.vy = 150;
    advanceCircus(bounce, 1 / 60);
    expect(bounce.vy).toBe(-385);
    expect(bounce.events).toContain('bounce');
    const miss = createCircusState('A', 5);
    miss.support = null;
    miss.x = 210;
    miss.y = 182;
    miss.vy = 150;
    advanceCircus(miss, 1 / 60);
    expect(miss.status).toBe('hit');
  });
  it('每 20000 分补命，重试保留分数与生命，结束后不能重复扣命', () => {
    const s = createCircusState();
    addCircusScore(s, 41000);
    expect(s.lives).toBe(5);
    expect(s.nextLife).toBe(60000);
    hitCircus(s);
    expect(s.lives).toBe(4);
    const elapsed = s.elapsed;
    advanceCircus(s, 10);
    expect(s.elapsed).toBe(elapsed);
    retryCircus(s);
    expect(s.score).toBe(41000);
    expect(s.lives).toBe(4);
    expect(s.stageTime).toBe(0);
    s.lives = 1;
    hitCircus(s);
    hitCircus(s);
    expect(s.lives).toBe(0);
    expect(s.status).toBe('over');
    retryCircus(s);
    expect(s.status).toBe('over');
  });
  it('到终点才通关，结算剩余 BONUS，五关后循环增加难度', () => {
    const s = createCircusState();
    s.obstacles = [];
    s.x = s.end - 1;
    advanceCircus(s, 0.1, 1);
    expect(s.status).toBe('clear');
    expect(s.score).toBe(circusBonus(s));
    const score = s.score;
    advanceCircus(s, 30, 1);
    expect(s.score).toBe(score);
    nextCircusAct(s);
    expect(s.stage).toBe(2);
    s.stage = 5;
    s.status = 'clear';
    nextCircusAct(s);
    expect(s.stage).toBe(1);
    expect(s.round).toBe(1);
    expect(circusDifficulty(s)).toBe(1);
  });
  it('奖金耗尽会损失生命，重试恢复关内计时', () => {
    const s = createCircusState();
    s.obstacles = [];
    advanceCircus(s, 100.1);
    expect(s.status).toBe('hit');
    expect(circusBonus(s)).toBe(0);
    retryCircus(s);
    expect(circusBonus(s)).toBe(5000);
  });
});

function playCourse(s: CircusState) {
  let targetBall = 1;
  for (let frame = 0; frame < 6000 && s.status === 'playing'; frame++) {
    let direction: -1 | 0 | 1 = 1;
    if (s.stage === 1 || s.stage === 2 || s.stage === 4) {
      const next = s.obstacles
        .filter(
          (o) =>
            ['hoop', 'pot', 'monkey', 'hurdle'].includes(o.kind) && circusObstacleX(s, o) > s.x,
        )
        .sort((a, b) => circusObstacleX(s, a) - circusObstacleX(s, b))[0];
      const threshold =
        s.stage === 4
          ? 60
          : s.stage === 2
            ? next?.variant
              ? 70
              : 50
            : next?.kind === 'pot'
              ? 33
              : 37;
      if (next && circusObstacleX(s, next) - s.x < threshold && s.grounded) jumpCircus(s, true);
    } else if (s.stage === 3) {
      if (s.grounded) {
        targetBall = (s.support ?? targetBall - 1) + 1;
        jumpCircus(s);
      }
      const ball = s.obstacles.find((o) => o.id === targetBall);
      if (ball && s.x >= circusObstacleX(s, ball) - 4) direction = 0;
    }
    advanceCircus(s, 1 / 60, direction);
  }
}
describe('完整场地可玩性', () => {
  for (const stage of [1, 3, 4])
    it(`第 ${stage} 关能用实际移动和跳跃通过完整场地`, () => {
      const s = createCircusState('A', stage);
      playCourse(s);
      expect(s.status, JSON.stringify({ x: s.x, y: s.y, time: s.stageTime, score: s.score })).toBe(
        'clear',
      );
    });
});

// Recorded control timings exercise whole courses without teleporting or changing the engine state.
const CONTROL_PATHS: Record<number, number[][]> = {
  2: [
    [1, 0, 18],
    [1, 1, 1],
    [1, 0, 22],
    [1, 1, 1],
    [1, 0, 17],
    [1, 1, 1],
    [1, 0, 8],
    [1, 1, 1],
    [1, 0, 43],
    [1, 1, 1],
    [1, 0, 11],
    [1, 1, 1],
    [1, 0, 10],
    [1, 1, 1],
    [1, 0, 22],
    [1, 1, 1],
    [1, 0, 30],
    [1, 1, 1],
    [1, 0, 15],
    [1, 1, 1],
    [1, 0, 23],
    [1, 1, 1],
    [1, 0, 24],
  ],
  5: [
    [1, 0, 2],
    [1, 1, 1],
    [1, 0, 25],
    [1, 2, 1],
    [1, 0, 9],
    [1, 1, 1],
    [1, 0, 5],
    [-1, 0, 1],
    [0, 0, 2],
    [1, 0, 1],
    [-1, 0, 1],
    [0, 0, 1],
    [1, 0, 1],
    [-1, 0, 1],
    [0, 0, 1],
    [1, 0, 1],
    [-1, 0, 1],
    [0, 0, 1],
    [1, 0, 1],
    [-1, 0, 1],
    [0, 0, 1],
    [1, 0, 1],
    [-1, 0, 1],
    [0, 0, 1],
    [1, 0, 6],
    [1, 2, 1],
    [1, 0, 5],
    [1, 2, 1],
    [1, 0, 19],
    [1, 2, 1],
    [1, 0, 1],
    [1, 2, 1],
    [1, 0, 4],
    [-1, 0, 1],
    [0, 0, 1],
    [1, 2, 1],
    [1, 0, 5],
  ],
};
for (const stage of [2, 5])
  it(`第 ${stage} 关用移动、跳跃、停顿通过完整场地`, () => {
    const s = createCircusState('A', stage),
      events: string[] = [];
    for (const [direction, jump, ticks] of CONTROL_PATHS[stage]) {
      if (jump) expect(jumpCircus(s, jump === 2)).toBe(true);
      advanceCircus(s, ticks * 0.1, direction as -1 | 0 | 1);
      events.push(...s.events.splice(0));
    }
    expect(s.status).toBe('clear');
    expect(s.lives).toBe(3);
    if (stage === 5) {
      expect(events.filter((e) => e === 'catch').length).toBeGreaterThanOrEqual(6);
      expect(events).toContain('bounce');
    }
  });
