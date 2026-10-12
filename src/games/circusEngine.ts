/** FC Circus Charlie: five acts, fixed 60 Hz simulation, no DOM dependencies. */
export type CircusMode = 'A' | 'B';
export type CircusStatus = 'playing' | 'hit' | 'clear' | 'over';
export type CircusEvent = 'jump' | 'point' | 'hurt' | 'clear' | 'life' | 'catch' | 'bounce';
export type CircusKind = 'hoop' | 'pot' | 'monkey' | 'ball' | 'hurdle' | 'trampoline' | 'trapeze';
export interface CircusObstacle {
  id: number;
  kind: CircusKind;
  x: number;
  variant: number;
  scored: boolean;
  activatedAt?: number | null;
}
export interface CircusState {
  mode: CircusMode;
  stage: number;
  round: number;
  lives: number;
  score: number;
  nextLife: number;
  elapsed: number;
  stageTime: number;
  accumulator: number;
  status: CircusStatus;
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  support: number | null;
  releaseAt: number;
  end: number;
  obstacles: CircusObstacle[];
  events: CircusEvent[];
  cleared: number;
  facing: number;
}
export const CIRCUS_ACTS = [
  {
    zh: '骑狮钻火圈',
    en: 'Lion & Fire Rings',
    hintZh: '骑着狮子前进，跳过火盆，从火圈中间穿过去。',
    hintEn: 'Ride the lion, leap over pots and through the rings.',
  },
  {
    zh: '走钢丝',
    en: 'Tightrope',
    hintZh: '跳过迎面而来的猴子，留意速度更快的紫猴。',
    hintEn: 'Jump over oncoming monkeys. Watch for fast purple ones.',
  },
  {
    zh: '踩球',
    en: 'Ball Balancing',
    hintZh: '踩住滚动的球，向右起跳，落在下一颗球上。',
    hintEn: 'Balance on rolling balls and land on the next one.',
  },
  {
    zh: '骑马',
    en: 'Horse Riding',
    hintZh: '左右控制马速，A 小跳、B 大跳；踩中跳板会弹得更高。',
    hintEn: 'Control horse speed; A is a low jump, B a high jump. Springboards boost you.',
  },
  {
    zh: '空中飞人',
    en: 'Flying Trapeze',
    hintZh: '向右摆荡时松手，接住下一根秋千；落在跳床上可以弹回空中。',
    hintEn: 'Release on the forward swing and catch the next bar. Trampolines bounce you back.',
  },
] as const;
export const CIRCUS_STEP = 1 / 60;
export const circusDifficulty = (s: CircusState) => Math.min(4, s.round + (s.mode === 'B' ? 1 : 0));
export const circusBonus = (s: CircusState) => Math.max(0, 5000 - Math.floor(s.stageTime * 5) * 10);
export const circusFloor = (stage: number) => (stage === 2 ? 145 : stage === 3 ? 164 : 184);
export const circusCamera = (s: CircusState) => Math.max(0, Math.min(s.end - 216, s.x - 72));
export function circusObstacleX(s: CircusState, o: CircusObstacle): number {
  const difficulty = circusDifficulty(s);
  if (o.kind === 'hoop')
    return o.x - Math.max(0, s.stageTime - (o.activatedAt ?? s.stageTime)) * (12 + difficulty * 4);
  if (o.kind === 'monkey') return o.x - s.stageTime * ((o.variant ? 108 : 51) + difficulty * 9);
  if (o.kind === 'ball') return o.id === 0 ? o.x : o.x - s.stageTime * (12 + difficulty * 3);
  return o.x;
}
export function circusTrapeze(s: CircusState, o: CircusObstacle) {
  const frequency = 2.2 + circusDifficulty(s) * 0.12;
  const phase = s.stageTime * frequency - 0.7 - o.id * 0.3;
  const angle = Math.sin(phase) * 0.72;
  const angularSpeed = Math.cos(phase) * 0.72 * frequency;
  return {
    x: o.x + Math.sin(angle) * 76,
    y: 43 + Math.cos(angle) * 76,
    vx: Math.cos(angle) * 76 * angularSpeed,
    vy: -Math.sin(angle) * 76 * angularSpeed,
    angle,
  };
}
function buildStage(s: CircusState) {
  s.end = s.stage === 5 ? 1470 : s.stage === 3 ? 1650 : 2000;
  s.obstacles = [];
  s.stageTime = 0;
  s.accumulator = 0;
  s.status = 'playing';
  s.x = 48;
  s.y = circusFloor(s.stage);
  s.vx = 0;
  s.vy = 0;
  s.grounded = true;
  s.support = null;
  s.releaseAt = -1;
  s.facing = 1;
  const difficulty = circusDifficulty(s);
  let id = 0;
  const add = (kind: CircusKind, x: number, variant = 0) =>
    s.obstacles.push({
      id: id++,
      kind,
      x,
      variant,
      scored: false,
      ...(kind === 'hoop' ? { activatedAt: x < 280 ? 0 : null } : {}),
    });
  if (s.stage === 1) {
    for (let x = 270; x < s.end - 110; x += 215 - difficulty * 12) {
      add('hoop', x);
      add('pot', x + 100);
      if (difficulty > 0 && x > 650) add('hoop', x + 44, 1);
    }
  } else if (s.stage === 2) {
    for (let x = 350; x < 5100; x += 300 - difficulty * 24)
      add('monkey', x, id > 1 && id % 4 === 3 ? 1 : 0);
  } else if (s.stage === 3) {
    add('ball', 48);
    for (let x = 155; x < s.end + 350; x += 94 - difficulty * 3) add('ball', x, id % 3);
    s.support = 0;
  } else if (s.stage === 4) {
    for (let x = 290; x < s.end - 100; x += 220 - difficulty * 14) {
      add('hurdle', x, id % 3 === 2 ? 1 : 0);
      if (id % 2 === 1) add('trampoline', x - 78);
    }
  } else {
    for (let x = 76; x < s.end - 75; x += 100) add('trapeze', x);
    for (let x = 140; x < s.end - 60; x += 200) add('trampoline', x);
    s.support = 0;
    s.grounded = false;
    const bar = circusTrapeze(s, s.obstacles[0]);
    s.x = bar.x;
    s.y = bar.y + 25;
  }
}
export function createCircusState(mode: CircusMode = 'A', stage = 1): CircusState {
  const state: CircusState = {
    mode,
    stage: Math.min(5, Math.max(1, Math.floor(stage))),
    round: 0,
    lives: 3,
    score: 0,
    nextLife: 20000,
    elapsed: 0,
    stageTime: 0,
    accumulator: 0,
    status: 'playing',
    x: 48,
    y: 184,
    vx: 0,
    vy: 0,
    grounded: true,
    support: null,
    releaseAt: -1,
    end: 2000,
    obstacles: [],
    events: [],
    cleared: 0,
    facing: 1,
  };
  buildStage(state);
  return state;
}
export function addCircusScore(s: CircusState, points: number) {
  s.score += points;
  while (s.score >= s.nextLife) {
    s.nextLife += 20000;
    s.lives++;
    s.events.push('life');
  }
}
export function hitCircus(s: CircusState) {
  if (s.status !== 'playing') return;
  s.lives--;
  s.status = s.lives > 0 ? 'hit' : 'over';
  s.events.push('hurt');
}
export function retryCircus(s: CircusState) {
  if (s.status !== 'hit') return;
  // The FC version restarts the current act; retain points and remaining lives.
  buildStage(s);
}
export function nextCircusAct(s: CircusState) {
  if (s.status !== 'clear') return;
  s.stage++;
  if (s.stage > 5) {
    s.stage = 1;
    s.round++;
  }
  buildStage(s);
}
export function jumpCircus(s: CircusState, high = false): boolean {
  if (s.status !== 'playing') return false;
  if (s.stage === 5 && s.support !== null) {
    const bar = circusTrapeze(
      s,
      s.obstacles.find((o) => o.id === s.support)!,
    );
    s.vx = bar.vx + 62;
    s.vy = bar.vy - (high ? 145 : 100);
    s.support = null;
    s.releaseAt = s.stageTime;
    s.events.push('jump');
    return true;
  }
  if (!s.grounded) return false;
  s.grounded = false;
  s.support = null;
  s.vy = s.stage === 3 ? -255 : s.stage === 4 ? (high ? -300 : -223) : -258;
  s.events.push('jump');
  return true;
}
function tick(s: CircusState, direction: number) {
  const dt = CIRCUS_STEP;
  s.elapsed += dt;
  s.stageTime += dt;
  if (circusBonus(s) === 0) {
    hitCircus(s);
    return;
  }
  const difficulty = circusDifficulty(s),
    previousX = s.x,
    previousY = s.y;
  for (const o of s.obstacles)
    if (o.kind === 'hoop' && o.activatedAt === null && o.x < circusCamera(s) + 280)
      o.activatedAt = s.stageTime;
  if (direction) s.facing = direction;
  if (s.stage === 5 && s.support !== null) {
    // Input adds a small swing impulse, rather than translating a hanging performer.
    const o = s.obstacles.find((o) => o.id === s.support)!;
    const bar = circusTrapeze(s, o);
    s.x = bar.x + direction * 3;
    s.y = bar.y + 25;
    s.vx = bar.vx;
    s.vy = bar.vy;
  } else {
    const speed = s.stage === 4 ? 80 + difficulty * 7 + direction * 35 : s.stage === 3 ? 133 : 77;
    if (s.stage !== 5) s.vx = s.stage === 4 ? speed : direction * speed;
    else s.vx += direction * 45 * dt;
    s.x = Math.max(20, s.x + s.vx * dt);
    if (s.stage === 5 && s.x > s.end + 40) {
      hitCircus(s);
      return;
    }
    if (!s.grounded) {
      s.vy += 620 * dt;
      s.y += s.vy * dt;
    }
    if (s.stage === 3) {
      if (s.grounded && s.support !== null) {
        const ball = s.obstacles.find((o) => o.id === s.support)!;
        const bx = circusObstacleX(s, ball);
        if (ball.id !== 0) s.x -= (12 + difficulty * 3) * dt;
        if (Math.abs(s.x - bx) > 15) {
          s.grounded = false;
          s.support = null;
        }
      }
      if (!s.grounded && s.vy > 0 && previousY <= 164 && s.y >= 164) {
        const ball = s.obstacles.find((o) => Math.abs(circusObstacleX(s, o) - s.x) < 17);
        if (ball) {
          s.y = 164;
          s.vy = 0;
          s.grounded = true;
          s.support = ball.id;
          if (!ball.scored && ball.id > 0) {
            ball.scored = true;
            addCircusScore(s, 500);
            s.events.push('point');
          }
        }
      }
      if (s.x >= s.end - 30 && s.y <= 164 && s.vy >= 0) {
        s.grounded = true;
        s.y = 164;
      }
      if (s.y > 209) hitCircus(s);
    } else if (s.stage === 5) {
      if (s.stageTime - s.releaseAt > 0.2) {
        const bar = s.obstacles.find(
          (o) =>
            o.kind === 'trapeze' &&
            (() => {
              const p = circusTrapeze(s, o);
              return Math.abs(p.x - s.x) < 15 && Math.abs(p.y - (s.y - 25)) < 15;
            })(),
        );
        if (bar) {
          s.support = bar.id;
          if (!bar.scored) {
            bar.scored = true;
            addCircusScore(s, 500);
          }
          s.events.push('catch');
        }
      }
      if (s.support === null && s.vy > 0 && previousY <= 183 && s.y >= 183) {
        const spring = s.obstacles.find((o) => o.kind === 'trampoline' && Math.abs(o.x - s.x) < 21);
        if (spring) {
          s.y = 182;
          s.vy = -385;
          s.releaseAt = s.stageTime;
          s.events.push('bounce');
        } else if (s.x < s.end - 45) hitCircus(s);
        else {
          s.x = s.end;
          s.y = 183;
          s.grounded = true;
        }
      }
      if (s.y > 218) hitCircus(s);
    } else if (s.y >= circusFloor(s.stage)) {
      s.y = circusFloor(s.stage);
      s.vy = 0;
      s.grounded = true;
    }
  }
  if (s.status !== 'playing') return;
  for (const o of s.obstacles) {
    const x = circusObstacleX(s, o),
      near = Math.abs(x - s.x);
    if (o.kind === 'hoop') {
      if (near < 9 && (s.y > 171 || s.y - 37 < 77)) {
        hitCircus(s);
        return;
      }
      if (!o.scored && x < s.x - 12) {
        o.scored = true;
        addCircusScore(s, o.variant ? 200 : 100);
        s.events.push('point');
      }
    } else if (o.kind === 'pot' && near < 16 && s.y > 164) {
      hitCircus(s);
      return;
    } else if (o.kind === 'monkey') {
      if (near < 13 && s.y > 125) {
        hitCircus(s);
        return;
      }
      if (!o.scored && x < s.x - 14) {
        o.scored = true;
        addCircusScore(s, o.variant ? 500 : 100);
        s.events.push('point');
      }
    } else if (o.kind === 'hurdle') {
      if (near < 15 && s.y > (o.variant ? 136 : 158)) {
        hitCircus(s);
        return;
      }
      if (!o.scored && s.x > x + 16) {
        o.scored = true;
        addCircusScore(s, 100);
        s.events.push('point');
      }
    } else if (
      o.kind === 'trampoline' &&
      s.stage === 4 &&
      previousX < x &&
      s.x >= x &&
      s.grounded
    ) {
      s.grounded = false;
      s.vy = -345;
      s.events.push('bounce');
    }
  }
  if (s.x >= s.end && (s.stage !== 5 || (s.support === null && s.y >= 177 && s.grounded))) {
    s.status = 'clear';
    s.cleared++;
    addCircusScore(s, circusBonus(s));
    s.events.push('clear');
  }
}
export function advanceCircus(s: CircusState, seconds: number, direction: -1 | 0 | 1 = 0) {
  if (s.status !== 'playing' || !Number.isFinite(seconds) || seconds <= 0) return;
  s.accumulator += seconds;
  while (s.accumulator + 1e-9 >= CIRCUS_STEP && s.status === 'playing') {
    s.accumulator = Math.max(0, s.accumulator - CIRCUS_STEP);
    tick(s, direction);
  }
}
