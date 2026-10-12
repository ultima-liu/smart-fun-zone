import { describe, expect, it } from 'vitest';
import levels from '../games/tankLevels.json';
import {
  canTankOccupy,
  collectTankPower,
  createTankGame,
  defaultConstruction,
  drainTankSounds,
  fireTank,
  GRID,
  nextTankStage,
  stepTankGame,
  terrainForStage,
  validConstruction,
  type Direction,
  type TankActor,
  type TankBullet,
  type TankState,
} from '../games/tankEngine';
function game(players: 1 | 2 = 1) {
  const s = createTankGame({ players, seed: 1985 });
  s.intro = 0;
  s.terrain.fill(0);
  s.spawnTimer = 999;
  s.sounds = [];
  return s;
}
function advance(s: TankState, seconds: number, input = [{}]) {
  for (let n = 0; n < Math.ceil(seconds * 120); n++) stepTankGame(s, input, 1 / 120);
}
function enemy(s: TankState, kind: 0 | 1 | 2 | 3 = 0, x = 96, y = 96): TankActor {
  const t = {
    ...s.tanks[0],
    id: 100 + s.tanks.length,
    player: -1,
    kind,
    x,
    y,
    direction: 2 as Direction,
    shield: 0,
    health: kind === 3 ? 4 : 1,
    cooldown: 999,
    born: 0,
    think: 999,
  };
  s.tanks.push(t);
  return t;
}
function bullet(
  s: TankState,
  x: number,
  y: number,
  dir: Direction,
  options: Partial<TankBullet> = {},
) {
  const b: TankBullet = {
    id: ++s.serial,
    owner: s.tanks[0].id,
    player: 0,
    x,
    y,
    direction: dir,
    speed: 300,
    strong: false,
    alive: true,
    ...options,
  };
  s.bullets.push(b);
  return b;
}
function wall(s: TankState, x: number, y: number, w: number, h: number, type: number) {
  for (let row = y / 8; row < (y + h) / 8; row++)
    for (let col = x / 8; col < (x + w) / 8; col++) s.terrain[row * GRID + col] = type;
}
describe('Battle City original stages and rules', () => {
  it('keeps 35 original stages, original grouped rosters and half-wall layouts', () => {
    expect(levels).toHaveLength(35);
    levels.forEach((_, i) => {
      const s = createTankGame({ stage: i + 1 });
      expect(s.roster).toHaveLength(20);
      expect(canTankOccupy(s, s.tanks[0], 144, 400)).toBe(true);
    });
    expect(levels[0].enemies).toEqual([...Array(18).fill(0), 1, 1]);
    expect(levels[1].enemies).toEqual([
      ...Array(2).fill(3),
      ...Array(4).fill(1),
      ...Array(14).fill(0),
    ]);
    expect(terrainForStage(1)[46 * GRID + 22]).toBe(1);
  });
  it('announces the stage before movement and keeps at most three or six enemies', () => {
    for (const players of [1, 2] as const) {
      const s = createTankGame({ players, stage: 35 });
      const y = s.tanks[0].y;
      advance(s, 2, [{ direction: 0 }]);
      expect(s.tanks[0].y).toBe(y);
      advance(s, 10);
      expect(s.tanks.filter((t) => t.player < 0).length).toBeLessThanOrEqual(players === 1 ? 3 : 6);
    }
  });
  it('solo spaces out reinforcements and retains its relaxed pace after stage changes', () => {
    for (const players of [1, 2] as const) {
      const s = game(players);
      s.stage = 35;
      s.spawnTimer = 0;
      advance(s, 0.01);
      expect(s.spawned).toBe(1);
      const first = s.spawnTimer;
      expect(first).toBeCloseTo(players === 1 ? 2.5 : 0.5, 1);
      s.status = 'clear';
      nextTankStage(s);
      s.intro = 0;
      advance(s, 0.21);
      expect(s.spawned).toBe(1);
      expect(s.spawnTimer).toBeCloseTo(first, 1);
    }
  });
  it('solo enemies move and shoot more slowly while player shells keep their speed', () => {
    for (const players of [1, 2] as const) {
      const s = game(players), t = enemy(s);
      advance(s, 0.2);
      expect(t.y - 96).toBeCloseTo(players === 1 ? 9 : 12);
      t.cooldown = 0;
      fireTank(s, t);
      expect(s.bullets[0].speed).toBe(players === 1 ? 192 : 240);
      expect(t.cooldown).toBeGreaterThanOrEqual(players === 1 ? 1.6 : 0.8);
      expect(t.cooldown).toBeLessThan(players === 1 ? 2.8 : 1.4);
      s.bullets = [];
      t.kind = 2;
      t.cooldown = 0;
      fireTank(s, t);
      expect(s.bullets[0].speed).toBe(players === 1 ? 384 : 480);
      s.bullets = [];
      s.tanks[0].cooldown = 0;
      fireTank(s, s.tanks[0]);
      expect(s.bullets[0].speed).toBe(240);
    }
  });
  it('solo shields cover a later incoming hit and protect respawns for six seconds', () => {
    const s = game(), p = s.tanks[0];
    p.x = 96; p.y = 96;
    advance(s, 4);
    bullet(s, 96, 70, 2, { owner: 999, player: -1 });
    advance(s, 0.1);
    expect(s.players[0].lives).toBe(3);
    advance(s, 2);
    bullet(s, 96, 70, 2, { owner: 999, player: -1 });
    advance(s, 0.1);
    expect(s.players[0].lives).toBe(2);
    advance(s, 1.4);
    expect(s.tanks.find((t) => t.player === 0)?.shield).toBeGreaterThan(5);
  });
  it('blocks tanks with brick, steel, water and the eagle; grass and ice remain passable', () => {
    const s = game(),
      p = s.tanks[0];
    for (const type of [1, 2, 3, 4, 5]) {
      s.terrain.fill(0);
      wall(s, 64, 64, 32, 32, type);
      expect(canTankOccupy(s, p, 80, 80)).toBe(type >= 4);
    }
    expect(canTankOccupy(s, p, 208, 400)).toBe(false);
  });
  it('removes only the impacted brick layer and allows fast shells no tunneling', () => {
    const s = game();
    wall(s, 64, 64, 32, 32, 1);
    bullet(s, 80, 50, 2, { speed: 480 });
    advance(s, 0.1);
    expect(s.terrain[8 * GRID + 10]).toBe(0);
    expect(s.terrain[9 * GRID + 10]).toBe(1);
    expect(s.bullets).toHaveLength(0);
    expect(drainTankSounds(s)).toContain('brick');
  });
  it('four shots clear a full tank-width brick corridor', () => {
    const s = game(),
      p = s.tanks[0];
    p.x = 80;
    p.y = 48;
    p.direction = 2;
    wall(s, 64, 64, 32, 32, 1);
    for (let shot = 0; shot < 4; shot++) {
      p.cooldown = 0;
      fireTank(s, p);
      advance(s, 0.22);
    }
    expect(canTankOccupy(s, p, 80, 80)).toBe(true);
    advance(s, 0.4, [{ direction: 2 }]);
    expect(p.y).toBeGreaterThan(75);
  });
  it('only a three-star shell can break steel and removes two layers', () => {
    const s = game();
    wall(s, 64, 64, 32, 32, 2);
    bullet(s, 80, 50, 2);
    advance(s, 0.1);
    expect(s.terrain[8 * GRID + 10]).toBe(2);
    bullet(s, 80, 50, 2, { strong: true });
    advance(s, 0.1);
    expect(s.terrain[8 * GRID + 10]).toBe(0);
    expect(s.terrain[9 * GRID + 10]).toBe(0);
    expect(s.terrain[10 * GRID + 10]).toBe(2);
  });
  it('lets shells cross water, grass and ice without destroying terrain', () => {
    for (const type of [3, 4, 5]) {
      const s = game();
      wall(s, 64, 64, 32, 32, type);
      bullet(s, 80, 50, 2);
      advance(s, 0.25);
      expect(s.bullets[0].y).toBeGreaterThan(96);
      expect(s.terrain[8 * GRID + 10]).toBe(type);
    }
  });
  it('matches the visible body: a near miss and an expired blast cannot kill a tank', () => {
    const s = game(),
      p = s.tanks[0];
    p.x = 96;
    p.y = 96;
    p.shield = 0;
    bullet(s, 111, 60, 2, { player: -1, owner: 999 });
    s.effects.push({ type: 'blast', x: 96, y: 96, duration: 0.4, age: 0.399 });
    advance(s, 0.2);
    expect(s.players[0].lives).toBe(3);
    expect(s.effects).toHaveLength(0);
  });
  it('armor needs four hits and emits the proper impact before the explosion', () => {
    const s = game(),
      t = enemy(s, 3);
    collectTankPower(s, s.tanks[0], 'clock');
    for (let n = 0; n < 4; n++) {
      bullet(s, t.x, t.y - 25, 2);
      advance(s, 0.05);
      expect(t.health).toBe(3 - n);
    }
    expect(s.tanks).not.toContain(t);
    expect(s.players[0].score).toBe(900);
    expect(s.players[0].kills[3]).toBe(1);
    expect(drainTankSounds(s)).toEqual(expect.arrayContaining(['armor', 'enemy']));
  });
  it('a carrier drops its bonus on the first armor hit, only once', () => {
    const s = game(),
      t = enemy(s, 3);
    t.carrier = true;
    s.freeze = 99;
    bullet(s, 96, 70, 2);
    advance(s, 0.05);
    expect(s.power).not.toBeNull();
    const power = s.power;
    expect(t.health).toBe(3);
    expect(t.carrier).toBe(false);
    bullet(s, 96, 70, 2);
    advance(s, 0.05);
    expect(s.power).toBe(power);
  });
  it('keeps an unclaimed power-up until the next carrier instead of expiring it', () => {
    const s = game(),
      t = enemy(s, 3);
    t.carrier = true;
    s.freeze = 99;
    bullet(s, 96, 70, 2);
    advance(s, 0.05);
    const power = s.power;
    expect(power).not.toBeNull();
    advance(s, 31);
    expect(s.power).toBe(power);
    expect([64, 160, 256, 352]).toContain(power?.x);
  });
  it('upgrades shell speed, two-shot capacity and steel piercing in that order', () => {
    const s = game(),
      p = s.tanks[0];
    p.cooldown = 0;
    fireTank(s, p);
    expect(s.bullets[0].speed).toBe(240);
    p.cooldown = 0;
    fireTank(s, p);
    expect(s.bullets).toHaveLength(1);
    collectTankPower(s, p, 'star');
    s.bullets = [];
    p.cooldown = 0;
    fireTank(s, p);
    expect(s.bullets[0].speed).toBe(480);
    expect(s.bullets[0].strong).toBe(false);
    collectTankPower(s, p, 'star');
    p.cooldown = 0;
    fireTank(s, p);
    expect(s.bullets).toHaveLength(2);
    collectTankPower(s, p, 'star');
    collectTankPower(s, p, 'star');
    expect(p.grade).toBe(3);
    s.bullets = [];
    p.cooldown = 0;
    fireTank(s, p);
    expect(s.bullets[0].strong).toBe(true);
  });
  it('grenades give the pickup score without enemy kill points or tally', () => {
    const s = game();
    enemy(s);
    enemy(s, 3, 128, 128);
    collectTankPower(s, s.tanks[0], 'grenade');
    expect(s.defeated).toBe(2);
    expect(s.players[0].score).toBe(500);
    expect(s.players[0].kills).toEqual([0, 0, 0, 0]);
    expect(s.tanks).toHaveLength(1);
  });
  it('clock freezes tanks but existing shells keep moving', () => {
    const s = game(),
      t = enemy(s);
    bullet(s, 60, 120, 2, { owner: t.id, player: -1 });
    collectTankPower(s, s.tanks[0], 'clock');
    advance(s, 0.2);
    expect(t.y).toBe(96);
    expect(s.bullets[0].y).toBeGreaterThan(120);
  });
  it('helmet blocks a real hit and life bonus adds one tank', () => {
    const s = game(),
      p = s.tanks[0];
    p.x = 96;
    p.y = 96;
    collectTankPower(s, p, 'helmet');
    bullet(s, 96, 70, 2, { owner: 999, player: -1 });
    advance(s, 0.1);
    expect(s.players[0].lives).toBe(3);
    collectTankPower(s, p, 'tank');
    expect(s.players[0].lives).toBe(4);
  });
  it('shovel restores the brick enclosure after its original 20×64-frame timer', () => {
    const s = game();
    collectTankPower(s, s.tanks[0], 'shovel');
    expect(s.terrain[46 * GRID + 22]).toBe(2);
    expect(s.fortify).toBeCloseTo(21.333);
    advance(s, 21.4);
    expect(s.terrain[46 * GRID + 22]).toBe(1);
    expect(s.fortify).toBe(0);
  });
  it('friendly shells stun allies but can destroy the shared eagle', () => {
    const s = game(2),
      p = s.tanks[1];
    p.shield = 0;
    p.x = 96;
    p.y = 96;
    bullet(s, 96, 70, 2);
    advance(s, 0.1);
    expect(p.stun).toBeGreaterThan(4);
    expect(s.players[1].lives).toBe(3);
    bullet(s, 208, 360, 2);
    advance(s, 0.2);
    expect(s.status).toBe('over');
    expect(s.reason).toBe('base');
    expect(s.baseAlive).toBe(false);
  });
  it('does not hit the same player with a shell left over from a previous life', () => {
    const s = game(),
      p = s.tanks[0];
    p.shield = 0;
    p.x = 96;
    p.y = 96;
    bullet(s, 96, 70, 2, { owner: 999, player: 0 });
    advance(s, 0.1);
    expect(p.stun).toBe(0);
    expect(s.players[0].lives).toBe(3);
    expect(s.bullets).toHaveLength(1);
  });
  it('opposing shells cancel each other instead of crossing through', () => {
    const s = game();
    bullet(s, 96, 80, 2);
    bullet(s, 96, 110, 0, { owner: 999, player: -1 });
    advance(s, 0.1);
    expect(s.bullets).toHaveLength(0);
  });
  it('death resets upgrades, respawns safely, and ends only when both players run out', () => {
    const s = game(2),
      p = s.tanks[0];
    p.shield = 0;
    p.x = 96;
    p.y = 96;
    collectTankPower(s, p, 'star');
    bullet(s, 96, 70, 2, { owner: 999, player: -1 });
    advance(s, 0.1);
    expect(s.players[0].lives).toBe(2);
    expect(s.players[0].grade).toBe(0);
    advance(s, 1.4);
    expect(s.tanks.find((t) => t.player === 0)?.shield).toBeGreaterThan(2);
  });
  it('grants the 20,000-point life only once', () => {
    const s = game(),
      p = s.tanks[0];
    s.players[0].score = 19500;
    collectTankPower(s, p, 'star');
    expect(s.players[0].lives).toBe(4);
    s.players[0].score = 39500;
    collectTankPower(s, p, 'star');
    expect(s.players[0].lives).toBe(4);
  });
  it('slides briefly after releasing direction on ice', () => {
    const s = game(),
      p = s.tanks[0];
    p.x = 80;
    p.y = 120;
    s.terrain.fill(5);
    advance(s, 0.1, [{ direction: 0 }]);
    const y = p.y;
    advance(s, 0.1);
    expect(p.y).toBeLessThan(y);
    advance(s, 0.3);
    const stopped = p.y;
    advance(s, 0.1);
    expect(p.y).toBe(stopped);
  });
  it('clears after all twenty tanks and carries lives/grades into the next stage and second loop', () => {
    const s = game();
    collectTankPower(s, s.tanks[0], 'star');
    s.spawned = 20;
    s.defeated = 20;
    advance(s, 0.1);
    expect(s.status).toBe('clear');
    nextTankStage(s);
    expect(s.stage).toBe(2);
    expect(s.tanks[0].grade).toBe(1);
    expect(s.players[0].lives).toBe(3);
    s.stage = 35;
    s.status = 'clear';
    nextTankStage(s);
    expect(s.loop).toBe(2);
    expect(s.stage).toBe(1);
    expect(s.roster).toEqual(levels[34].enemies);
  });
  it('validates saved construction maps and reserves spawn/base positions', () => {
    expect(validConstruction(defaultConstruction())).toBe(true);
    expect(validConstruction(Array(169).fill(999))).toBe(false);
    expect(validConstruction(Array(168).fill(0))).toBe(false);
    const s = createTankGame({ custom: Array(169).fill(2), players: 2 });
    expect(canTankOccupy(s, s.tanks[0], 144, 400)).toBe(true);
    expect(canTankOccupy(s, s.tanks[1], 272, 400)).toBe(true);
    expect(s.terrain[46 * GRID + 22]).toBe(1);
  });
});
