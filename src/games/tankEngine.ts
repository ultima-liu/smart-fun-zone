import levels from './tankLevels.json';

export const FIELD = 416;
export const GRID = 52;
export const CELL = 8;
export type Direction = 0 | 1 | 2 | 3;
export type TankKind = 0 | 1 | 2 | 3;
export type PowerKind = 'helmet' | 'clock' | 'shovel' | 'star' | 'grenade' | 'tank';
export type TankSound =
  | 'intro'
  | 'over'
  | 'fire'
  | 'brick'
  | 'steel'
  | 'armor'
  | 'enemy'
  | 'player'
  | 'hq'
  | 'bonus'
  | 'appear'
  | 'pickup'
  | 'life'
  | 'pause'
  | 'ice'
  | 'score';
export interface TankInput {
  direction?: Direction;
  fire?: boolean;
}
export interface TankActor {
  id: number;
  player: number;
  kind: TankKind;
  x: number;
  y: number;
  direction: Direction;
  health: number;
  grade: number;
  shield: number;
  stun: number;
  born: number;
  cooldown: number;
  think: number;
  slide: number;
  moving: boolean;
  carrier: boolean;
}
export interface TankBullet {
  id: number;
  owner: number;
  player: number;
  x: number;
  y: number;
  direction: Direction;
  speed: number;
  strong: boolean;
  alive: boolean;
}
export interface TankPlayer {
  lives: number;
  score: number;
  grade: number;
  respawn: number;
  extra: boolean;
  kills: number[];
}
export interface TankEffect {
  x: number;
  y: number;
  age: number;
  duration: number;
  type: 'blast' | 'spark' | 'points';
  text?: string;
}
export interface TankState {
  stage: number;
  loop: number;
  players: TankPlayer[];
  terrain: Uint8Array;
  revision: number;
  tanks: TankActor[];
  bullets: TankBullet[];
  effects: TankEffect[];
  power: { kind: PowerKind; x: number; y: number; age: number } | null;
  roster: TankKind[];
  spawned: number;
  defeated: number;
  spawnTimer: number;
  spawnPoint: number;
  status: 'playing' | 'clear' | 'over';
  reason: 'base' | 'lives' | null;
  baseAlive: boolean;
  intro: number;
  freeze: number;
  fortify: number;
  time: number;
  stageTime: number;
  sounds: TankSound[];
  seed: number;
  serial: number;
  custom?: number[];
}
const VECTORS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;
const POWER: PowerKind[] = [
  'helmet',
  'clock',
  'shovel',
  'star',
  'grenade',
  'tank',
  'grenade',
  'star',
];
const TIMER = 64 / 60;
// Solo leaves more time to cover the base without a second defender.
const SOLO_RULES = {
  maxEnemies: 3, spawnFactor: 1.6, minSpawnInterval: 2.5,
  moveFactor: 0.75, bulletFactor: 0.8,
  fireMin: 1.6, fireRange: 1.2, spawnShield: 6, initialCooldown: 2.4,
};
const COOP_RULES = {
  maxEnemies: 6, spawnFactor: 1, minSpawnInterval: 0,
  moveFactor: 1, bulletFactor: 1,
  fireMin: 0.8, fireRange: 0.6, spawnShield: 3 * TIMER, initialCooldown: 0.25,
};
const combatRules = (s: TankState) => s.players.length === 1 ? SOLO_RULES : COOP_RULES;
const ring: number[] = [];
for (let y = 46; y < 52; y++)
  for (let x = 22; x < 30; x++) {
    if (y < 48 || x < 24 || x >= 28) ring.push(y * GRID + x);
  }
function random(s: TankState) {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
function sound(s: TankState, event: TankSound) {
  if (!s.sounds.includes(event)) s.sounds.push(event);
}
export function terrainForStage(stage: number) {
  const terrain = new Uint8Array(GRID * GRID);
  for (const [x, y, w, h, type] of levels[Math.max(0, Math.min(34, stage - 1))].terrain) {
    for (let row = y / CELL; row < (y + h) / CELL; row++) {
      for (let col = x / CELL; col < (x + w) / CELL; col++) terrain[row * GRID + col] = type;
    }
  }
  return terrain;
}
export function defaultConstruction(): number[] {
  // CONSTRUCTION uses 13×13 full blocks, while campaign stages retain half walls.
  const terrain = terrainForStage(1);
  return Array.from(
    { length: 169 },
    (_, i) => terrain[Math.floor(i / 13) * 4 * GRID + (i % 13) * 4],
  );
}
export function validConstruction(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === 169 &&
    value.every((v) => Number.isInteger(v) && v >= 0 && v <= 5)
  );
}
function buildConstruction(blocks: number[]) {
  const terrain = new Uint8Array(GRID * GRID);
  blocks.forEach((v, i) => {
    const x = (i % 13) * 4,
      y = Math.floor(i / 13) * 4;
    for (let dy = 0; dy < 4; dy++)
      for (let dx = 0; dx < 4; dx++) terrain[(y + dy) * GRID + x + dx] = v;
  });
  // Preserve the three enemy entrances, player spawns and the eagle's enclosure.
  for (const [x, y] of [
    [0, 0],
    [6, 0],
    [12, 0],
    [4, 12],
    [8, 12],
    [6, 12],
  ]) {
    for (let dy = 0; dy < 4; dy++)
      for (let dx = 0; dx < 4; dx++) terrain[(y * 4 + dy) * GRID + x * 4 + dx] = 0;
  }
  for (const i of ring) terrain[i] = 1;
  return terrain;
}
function actor(s: TankState, player: number, kind: TankKind, x: number, y: number): TankActor {
  return {
    id: ++s.serial,
    player,
    kind,
    x,
    y,
    direction: player >= 0 ? 0 : 2,
    health: kind === 3 ? 4 : 1,
    grade: player >= 0 ? s.players[player].grade : 0,
    shield: player >= 0 ? combatRules(s).spawnShield : 0,
    stun: 0,
    born: player >= 0 ? 0 : 0.85,
    cooldown: player >= 0 ? 0.25 : combatRules(s).initialCooldown,
    think: 0.7,
    slide: 0,
    moving: false,
    carrier: false,
  };
}
export function createTankGame(
  options: { players?: 1 | 2; stage?: number; seed?: number; custom?: number[] } = {},
): TankState {
  const stage = Math.max(1, Math.min(35, Math.floor(options.stage ?? 1)));
  const custom = validConstruction(options.custom) ? [...options.custom] : undefined;
  const s: TankState = {
    stage,
    loop: 1,
    players: Array.from({ length: options.players ?? 1 }, () => ({
      lives: 3,
      score: 0,
      grade: 0,
      respawn: 0,
      extra: false,
      kills: [0, 0, 0, 0],
    })),
    terrain: custom ? buildConstruction(custom) : terrainForStage(stage),
    revision: 0,
    tanks: [],
    bullets: [],
    effects: [],
    power: null,
    roster: [...levels[stage - 1].enemies] as TankKind[],
    spawned: 0,
    defeated: 0,
    spawnTimer: 0.2,
    spawnPoint: 0,
    status: 'playing',
    reason: null,
    baseAlive: true,
    intro: 4.18,
    freeze: 0,
    fortify: 0,
    time: 0,
    stageTime: 0,
    sounds: ['intro'],
    seed: options.seed ?? Date.now() >>> 0,
    serial: 0,
    custom,
  };
  s.players.forEach((_, p) => s.tanks.push(actor(s, p, 0, p === 0 ? 144 : 272, 400)));
  return s;
}
export function nextTankStage(s: TankState) {
  if (s.status !== 'clear') return;
  if (!s.custom) {
    s.stage++;
    if (s.stage > 35) {
      s.stage = 1;
      s.loop++;
    }
  }
  s.terrain = s.custom ? buildConstruction(s.custom) : terrainForStage(s.stage);
  s.revision++;
  s.roster = [...levels[s.loop % 2 === 0 ? 34 : s.stage - 1].enemies] as TankKind[];
  s.spawned = 0;
  s.defeated = 0;
  s.spawnTimer = 0.2;
  s.spawnPoint = 0;
  s.tanks = [];
  s.bullets = [];
  s.effects = [];
  s.power = null;
  s.freeze = 0;
  s.fortify = 0;
  s.baseAlive = true;
  s.status = 'playing';
  s.reason = null;
  s.intro = 4.18;
  s.stageTime = 0;
  s.players.forEach((p, i) => {
    p.kills = [0, 0, 0, 0];
    p.respawn = 0;
    if (p.lives > 0) s.tanks.push(actor(s, i, 0, i === 0 ? 144 : 272, 400));
  });
  sound(s, 'intro');
}
function overlap(x: number, y: number, cx: number, cy: number, half = 28) {
  return Math.abs(x - cx) < half && Math.abs(y - cy) < half;
}
export function canTankOccupy(s: TankState, tank: TankActor, x: number, y: number) {
  const half = 14;
  if (x < half || y < half || x > FIELD - half || y > FIELD - half || overlap(x, y, 208, 400, 28))
    return false;
  for (
    let row = Math.floor((y - half + 0.05) / CELL);
    row <= Math.floor((y + half - 0.05) / CELL);
    row++
  ) {
    for (
      let col = Math.floor((x - half + 0.05) / CELL);
      col <= Math.floor((x + half - 0.05) / CELL);
      col++
    ) {
      const t = s.terrain[row * GRID + col];
      if (t === 1 || t === 2 || t === 3) return false;
    }
  }
  return !s.tanks.some((other) => other.id !== tank.id && overlap(x, y, other.x, other.y));
}
function move(s: TankState, tank: TankActor, dir: Direction, distance: number) {
  if (tank.direction % 2 !== dir % 2) {
    const x = dir % 2 === 0 ? Math.round(tank.x / CELL) * CELL : tank.x;
    const y = dir % 2 === 1 ? Math.round(tank.y / CELL) * CELL : tank.y;
    if (canTankOccupy(s, tank, x, y)) {
      tank.x = x;
      tank.y = y;
    }
  }
  tank.direction = dir;
  const [dx, dy] = VECTORS[dir];
  let moved = false;
  for (let left = distance; left > 0.0001; left -= Math.min(2, left)) {
    const step = Math.min(2, left),
      x = tank.x + dx * step,
      y = tank.y + dy * step;
    if (!canTankOccupy(s, tank, x, y)) break;
    tank.x = x;
    tank.y = y;
    moved = true;
  }
  tank.moving = moved;
  return moved;
}
export function fireTank(s: TankState, tank: TankActor) {
  if (s.status !== 'playing' || tank.cooldown > 0 || tank.stun > 0 || tank.born > 0) return;
  const limit = tank.player >= 0 && tank.grade >= 2 ? 2 : 1;
  if (
    s.bullets.filter(
      (b) => b.alive && (tank.player >= 0 ? b.player === tank.player : b.owner === tank.id),
    ).length >= limit
  )
    return;
  const [dx, dy] = VECTORS[tank.direction];
  s.bullets.push({
    id: ++s.serial,
    owner: tank.id,
    player: tank.player,
    x: tank.x + dx * 17,
    y: tank.y + dy * 17,
    direction: tank.direction,
    speed: (tank.kind === 2 || tank.grade >= 1 ? 480 : 240) *
      (tank.player >= 0 ? 1 : combatRules(s).bulletFactor),
    strong: tank.player >= 0 && tank.grade >= 3,
    alive: true,
  });
  tank.cooldown = tank.player >= 0 ? 0.17 :
    combatRules(s).fireMin + random(s) * combatRules(s).fireRange;
  if (tank.player >= 0) sound(s, 'fire');
}
function effect(s: TankState, x: number, y: number, type: TankEffect['type'], text?: string) {
  s.effects.push({
    x,
    y,
    type,
    age: 0,
    duration: type === 'points' ? 0.9 : type === 'blast' ? 0.4 : 0.13,
    text,
  });
}
function addScore(s: TankState, player: number, amount: number) {
  const p = s.players[player];
  p.score += amount;
  if (p.score >= 20000 && !p.extra) {
    p.extra = true;
    p.lives++;
    sound(s, 'life');
  }
}
function drop(s: TankState) {
  const start = Math.floor(random(s) * 16);
  for (let n = 0; n < 16; n++) {
    const i = (start + n) % 16,
      x = 64 + (i % 4) * 96,
      y = 64 + Math.floor(i / 4) * 96;
    const tile = s.terrain[Math.floor(y / CELL) * GRID + Math.floor(x / CELL)];
    if (tile === 2 || tile === 3) continue;
    s.power = { kind: POWER[Math.floor(random(s) * POWER.length)], x, y, age: 0 };
    sound(s, 'appear');
    return;
  }
}
function removeTank(s: TankState, tank: TankActor, shooter: number) {
  s.tanks = s.tanks.filter((t) => t !== tank);
  effect(s, tank.x, tank.y, 'blast');
  if (tank.player < 0) {
    s.defeated++;
    sound(s, 'enemy');
    if (shooter >= 0) {
      s.players[shooter].kills[tank.kind]++;
      const points = (tank.kind + 1) * 100;
      addScore(s, shooter, points);
      effect(s, tank.x, tank.y, 'points', String(points));
    }
  } else {
    const p = s.players[tank.player];
    p.lives--;
    p.grade = 0;
    p.respawn = 1.2;
    sound(s, 'player');
    if (s.players.every((p) => p.lives <= 0)) {
      s.status = 'over';
      s.reason = 'lives';
      sound(s, 'over');
    }
  }
}
export function collectTankPower(s: TankState, tank: TankActor, kind: PowerKind) {
  if (tank.player < 0) return;
  s.power = null;
  addScore(s, tank.player, 500);
  effect(s, tank.x, tank.y, 'points', '500');
  sound(s, 'pickup');
  if (kind === 'helmet') tank.shield = 10 * TIMER;
  if (kind === 'clock') s.freeze = 10 * TIMER;
  if (kind === 'shovel') {
    s.fortify = 20 * TIMER;
    for (const i of ring) s.terrain[i] = 2;
    s.revision++;
  }
  if (kind === 'star') {
    tank.grade = Math.min(3, tank.grade + 1);
    s.players[tank.player].grade = tank.grade;
  }
  if (kind === 'tank') {
    s.players[tank.player].lives++;
    sound(s, 'life');
  }
  if (kind === 'grenade')
    for (const enemy of [...s.tanks])
      if (enemy.player < 0 && enemy.born <= 0) removeTank(s, enemy, -1);
}
function hitWall(s: TankState, b: TankBullet, col: number, row: number) {
  const material = s.terrain[row * GRID + col];
  if (material !== 1 && material !== 2) return false;
  if (material === 1 || b.strong) {
    // Remove one 8px layer across a 32px shell impact; third star removes two layers.
    const horizontal = b.direction % 2 === 0;
    const across = Math.floor((horizontal ? b.x : b.y) / CELL) - 2;
    for (let width = 0; width < 4; width++)
      for (let depth = 0; depth < (b.strong ? 2 : 1); depth++) {
        const c = horizontal ? across + width : col + VECTORS[b.direction][0] * depth;
        const r = horizontal ? row + VECTORS[b.direction][1] * depth : across + width;
        if (c < 0 || c >= GRID || r < 0 || r >= GRID) continue;
        const v = s.terrain[r * GRID + c];
        if (v === 1 || (v === 2 && b.strong)) s.terrain[r * GRID + c] = 0;
      }
    s.revision++;
    sound(s, material === 1 ? 'brick' : 'steel');
  } else sound(s, 'steel');
  effect(s, b.x, b.y, 'spark');
  b.alive = false;
  return true;
}
function stepBullet(s: TankState, b: TankBullet, dt: number) {
  const [dx, dy] = VECTORS[b.direction];
  for (
    let remaining = b.speed * dt;
    b.alive && remaining > 0.0001 && s.status === 'playing';
    remaining -= Math.min(3, remaining)
  ) {
    const step = Math.min(3, remaining);
    b.x += dx * step;
    b.y += dy * step;
    if (b.x < 0 || b.y < 0 || b.x >= FIELD || b.y >= FIELD) {
      b.alive = false;
      sound(s, 'steel');
      break;
    }
    // Friendly fire can destroy HQ, as in the cartridge. Explosions themselves are visual only.
    if (s.baseAlive && overlap(b.x, b.y, 208, 400, 14)) {
      b.alive = false;
      s.baseAlive = false;
      s.status = 'over';
      s.reason = 'base';
      effect(s, 208, 400, 'blast');
      sound(s, 'hq');
      sound(s, 'player');
      sound(s, 'over');
      break;
    }
    const col = Math.floor(b.x / CELL),
      row = Math.floor(b.y / CELL);
    if (hitWall(s, b, col, row)) break;
    const opposite = s.bullets.find(
      (other) =>
        other !== b &&
        other.alive &&
        other.owner !== b.owner &&
        (other.player < 0 !== b.player < 0 || (other.player >= 0 && other.player !== b.player)) &&
        overlap(b.x, b.y, other.x, other.y, 5),
    );
    if (opposite) {
      opposite.alive = false;
      b.alive = false;
      effect(s, b.x, b.y, 'spark');
      break;
    }
    const target = s.tanks.find(
      (t) =>
        t.id !== b.owner &&
        !(b.player >= 0 && t.player === b.player) &&
        t.born <= 0 &&
        !(t.player < 0 && b.player < 0) &&
        overlap(b.x, b.y, t.x, t.y, 14),
    );
    if (!target) continue;
    b.alive = false;
    if (target.shield > 0) {
      sound(s, 'steel');
      break;
    }
    if (target.player >= 0 && b.player >= 0) {
      target.stun = 200 / 45;
      target.slide = 0;
      sound(s, 'armor');
      break;
    }
    if (target.carrier) {
      target.carrier = false;
      drop(s);
    }
    target.health--;
    if (target.health <= 0) removeTank(s, target, b.player);
    else {
      sound(s, 'armor');
      effect(s, b.x, b.y, 'spark');
    }
  }
}
function tick(s: TankState, input: TankInput[], dt: number) {
  for (const e of s.effects) e.age += dt;
  s.effects = s.effects.filter((e) => e.age < e.duration);
  if (s.status !== 'playing') return;
  s.time += dt;
  s.stageTime += dt;
  if (s.intro > 0) {
    s.intro = Math.max(0, s.intro - dt);
    return;
  }
  s.freeze = Math.max(0, s.freeze - dt);
  if (s.fortify > 0) {
    const before = s.fortify;
    s.fortify = Math.max(0, s.fortify - dt);
    if (
      s.fortify === 0 ||
      (s.fortify < 4 * TIMER && Math.floor(before * 4) !== Math.floor(s.fortify * 4))
    ) {
      const tile = s.fortify === 0 || Math.floor(s.fortify * 4) % 2 === 0 ? 1 : 2;
      for (const i of ring) s.terrain[i] = tile;
      s.revision++;
    }
  }
  if (s.power) s.power.age += dt;
  s.players.forEach((p, index) => {
    if (p.lives <= 0 || s.tanks.some((t) => t.player === index)) return;
    p.respawn -= dt;
    const candidate = actor(s, index, 0, index === 0 ? 144 : 272, 400);
    if (p.respawn <= 0 && canTankOccupy(s, candidate, candidate.x, candidate.y))
      s.tanks.push(candidate);
  });
  s.spawnTimer -= dt;
  if (
    s.spawned < 20 &&
    s.spawnTimer <= 0 &&
    s.tanks.filter((t) => t.player < 0).length < combatRules(s).maxEnemies
  ) {
    const positions = [208, 400, 16];
    for (let n = 0; n < 3; n++) {
      const point = (s.spawnPoint + n) % 3;
      const enemy = actor(s, -1, s.roster[s.spawned], positions[point], 16);
      if (!canTankOccupy(s, enemy, enemy.x, enemy.y)) continue;
      enemy.carrier = [3, 10, 17].includes(s.spawned);
      if (enemy.carrier) s.power = null;
      s.tanks.push(enemy);
      s.spawned++;
      s.spawnPoint = (point + 1) % 3;
      s.spawnTimer = Math.max(combatRules(s).minSpawnInterval,
        (190 - (s.loop % 2 === 0 ? 35 : s.stage) * 4 - (s.players.length === 2 ? 20 : 0)) / 60 *
          combatRules(s).spawnFactor);
      break;
    }
  }
  for (const tank of [...s.tanks]) {
    tank.moving = false;
    tank.cooldown = Math.max(0, tank.cooldown - dt);
    tank.shield = Math.max(0, tank.shield - dt);
    if (tank.born > 0) {
      tank.born = Math.max(0, tank.born - dt);
      continue;
    }
    if (tank.stun > 0) {
      tank.stun = Math.max(0, tank.stun - dt);
      continue;
    }
    if (tank.player >= 0) {
      const control = input[tank.player] ?? {};
      const ice = s.terrain[Math.floor(tank.y / CELL) * GRID + Math.floor(tank.x / CELL)] === 5;
      if (control.direction !== undefined) {
        move(s, tank, control.direction, 90 * dt);
        if (ice && tank.moving) tank.slide = 0.25;
      } else if (tank.slide > 0) {
        tank.slide = Math.max(0, tank.slide - dt);
        if (move(s, tank, tank.direction, 90 * dt)) sound(s, 'ice');
        else tank.slide = 0;
      }
      if (control.fire) fireTank(s, tank);
      if (s.power && overlap(tank.x, tank.y, s.power.x, s.power.y, 23))
        collectTankPower(s, tank, s.power.kind);
    } else if (s.freeze <= 0) {
      tank.think -= dt;
      const moved = move(s, tank, tank.direction,
        (tank.kind === 1 ? 120 : 60) * combatRules(s).moveFactor * dt);
      if (!moved || tank.think <= 0) {
        // Original cardinal wandering, biased down; no knowledge of unseen paths.
        const choices: Direction[] =
          random(s) < 0.65
            ? [2, tank.x > 208 ? 3 : 1, 0, tank.x > 208 ? 1 : 3]
            : [Math.floor(random(s) * 4) as Direction, 2, 1, 3, 0];
        tank.direction =
          choices.find((dir) => {
            const [dx, dy] = VECTORS[dir];
            return canTankOccupy(s, tank, tank.x + dx * 2, tank.y + dy * 2);
          }) ?? choices[0];
        tank.think = 0.4 + random(s) * 1.3;
      }
      if (tank.cooldown <= 0) fireTank(s, tank);
    }
  }
  for (const b of s.bullets) if (b.alive) stepBullet(s, b, dt);
  s.bullets = s.bullets.filter((b) => b.alive);
  if (s.status === 'playing' && s.spawned === 20 && s.defeated === 20) {
    s.status = 'clear';
    s.bullets = [];
    sound(s, 'score');
    if (s.players.length === 2) {
      const kills = s.players.map((p) => p.kills.reduce((a, b) => a + b, 0));
      if (kills[0] !== kills[1]) {
        addScore(s, kills[0] > kills[1] ? 0 : 1, 1000);
        sound(s, 'bonus');
      }
    }
  }
}
export function stepTankGame(s: TankState, inputs: TankInput[], dt: number) {
  // Bounded fixed substeps keep fast shells and tank collisions consistent across refresh rates.
  for (let left = Math.max(0, Math.min(dt, 0.1)); left > 0.00001; left -= Math.min(left, 1 / 120))
    tick(s, inputs, Math.min(left, 1 / 120));
}
export function drainTankSounds(s: TankState) {
  return s.sounds.splice(0);
}
