export const BOMBER_COLS = 31;
export const BOMBER_ROWS = 13;
export const BOMBER_STAGES = 50;
export const BOMBER_START = BOMBER_COLS + 1;
export const BOMBER_FUSE = 160 / 60 * 1000;
export const BOMBER_FIRE = 560;
export const BOMBER_CLOCK_TICK = 64 / 60 * 1000;
export const BOMBER_BONUS_LIMIT = Math.round(60 * BOMBER_CLOCK_TICK);
export type BomberDifficulty = 'easy' | 'normal' | 'hard';
export type BomberDirection = 'up' | 'down' | 'left' | 'right';
export type BomberPower = 'range' | 'capacity' | 'speed' | 'remote' | 'wallPass' | 'bombPass' | 'firePass' | 'invincible';
export type BomberTerrain = 'floor' | 'stone' | 'crate';
export type BomberEnemyKind = 'balloon' | 'scout' | 'runner' | 'hunter' | 'ghost' | 'wraith' | 'tiger' | 'spinner';
export const BOMBER_LEVELS = {
  easy: { zh: '轻松', en: 'Easy', lives: 3, enemyStep: 760, extraEnemies: 0, limit: Math.round(400 * BOMBER_CLOCK_TICK) },
  normal: { zh: '经典', en: 'Classic', lives: 3, enemyStep: 620, extraEnemies: 0, limit: Math.round(400 * BOMBER_CLOCK_TICK) },
  hard: { zh: '高手', en: 'Hard', lives: 2, enemyStep: 480, extraEnemies: 2, limit: Math.round(400 * BOMBER_CLOCK_TICK) },
};
export const BOMBER_ENEMIES: Record<BomberEnemyKind, { zh: string; en: string; points: number; speed: number; chase: boolean; wallPass: boolean; alert: boolean; color: string }> = {
  balloon: { zh: '气球怪', en: 'Ballom', points: 100, speed: 1.25, chase: false, wallPass: false, alert: false, color: '#df9e76' },
  scout: { zh: '洋葱怪', en: 'Onil', points: 200, speed: 1, chase: true, wallPass: false, alert: false, color: '#528bea' },
  runner: { zh: '菱形怪', en: 'Dahl', points: 400, speed: .72, chase: false, wallPass: false, alert: false, color: '#e879bc' },
  hunter: { zh: '笑脸怪', en: 'Minvo', points: 800, speed: .7, chase: true, wallPass: false, alert: false, color: '#e4ad60' },
  ghost: { zh: '胶冻怪', en: 'Kondoria', points: 1000, speed: 2, chase: true, wallPass: true, alert: false, color: '#a3cad2' },
  wraith: { zh: '幽灵怪', en: 'Ovapi', points: 2000, speed: 1.2, chase: false, wallPass: true, alert: false, color: '#adacde' },
  tiger: { zh: '虎面怪', en: 'Pass', points: 4000, speed: .65, chase: true, wallPass: false, alert: false, color: '#dca95e' },
  spinner: { zh: '旋风怪', en: 'Pontan', points: 8000, speed: .5, chase: true, wallPass: true, alert: false, color: '#cf8095' },
};
export const BOMBER_POWERS: Record<BomberPower, { zh: string; en: string; symbol: string; color: string; descZh: string; descEn: string }> = {
  range: { zh: '火力 +1', en: 'Fire up', symbol: '✦', color: '#efb471', descZh: '初始 1 格，最多 5 格', descEn: 'Range up to 5 tiles' },
  capacity: { zh: '炸弹 +1', en: 'Bomb up', symbol: '+', color: '#82b9d1', descZh: '同时最多 10 颗', descEn: 'Up to 10 bombs' },
  speed: { zh: '疾跑靴', en: 'Speed up', symbol: '»', color: '#cc9bd2', descZh: '走得更轻快', descEn: 'Move faster' },
  remote: { zh: '遥控引爆', en: 'Remote', symbol: '◎', color: '#d68eac', descZh: '按 X / B 引爆最早一颗', descEn: 'X / B detonates oldest' },
  wallPass: { zh: '穿砖术', en: 'Brick pass', symbol: '▤', color: '#c8a87f', descZh: '可穿软砖，石墙不可穿', descEn: 'Pass through soft bricks' },
  bombPass: { zh: '穿弹术', en: 'Bomb pass', symbol: '●', color: '#9ca9cf', descZh: '可走过已放置的炸弹', descEn: 'Walk through bombs' },
  firePass: { zh: '防火衣', en: 'Flame pass', symbol: '♨', color: '#e3a381', descZh: '抵挡爆风，仍怕怪物', descEn: 'Flames safe, creatures not' },
  invincible: { zh: '无敌星', en: 'Invincible', symbol: '★', color: '#8ac8b8', descZh: '约 34 秒内不受任何伤害', descEn: 'Safe for about 34 seconds' },
};
/** Original 50-stage population and item sequence (Hudson NES tables). */
export const BOMBER_STAGE_POWERS: BomberPower[] = ["range", "capacity", "remote", "speed", "capacity", "capacity", "range", "remote", "bombPass", "wallPass", "capacity", "capacity", "remote", "bombPass", "range", "wallPass", "capacity", "bombPass", "capacity", "remote", "bombPass", "remote", "capacity", "remote", "bombPass", "invincible", "range", "capacity", "remote", "firePass", "wallPass", "capacity", "remote", "invincible", "bombPass", "firePass", "remote", "range", "wallPass", "invincible", "remote", "wallPass", "bombPass", "remote", "invincible", "wallPass", "bombPass", "remote", "firePass", "invincible"];
export const BOMBER_STAGE_ROSTERS: BomberEnemyKind[][] = [
  ["balloon", "balloon", "balloon", "balloon", "balloon", "balloon"],
  ["balloon", "balloon", "balloon", "scout", "scout", "scout"],
  ["balloon", "balloon", "scout", "scout", "runner", "runner"],
  ["balloon", "scout", "runner", "runner", "hunter", "hunter"],
  ["scout", "scout", "scout", "scout", "runner", "runner", "runner"],
  ["scout", "scout", "runner", "runner", "runner", "hunter", "hunter"],
  ["scout", "scout", "runner", "runner", "runner", "ghost", "ghost"],
  ["scout", "runner", "runner", "hunter", "hunter", "hunter", "hunter"],
  ["scout", "runner", "hunter", "hunter", "hunter", "hunter", "wraith"],
  ["scout", "runner", "hunter", "ghost", "wraith", "wraith", "wraith"],
  ["scout", "runner", "runner", "hunter", "hunter", "hunter", "ghost", "wraith"],
  ["scout", "runner", "hunter", "ghost", "wraith", "wraith", "wraith", "wraith"],
  ["runner", "runner", "runner", "hunter", "hunter", "hunter", "wraith", "wraith"],
  ["ghost", "ghost", "ghost", "ghost", "ghost", "ghost", "ghost", "tiger"],
  ["runner", "hunter", "hunter", "hunter", "wraith", "wraith", "wraith", "tiger"],
  ["hunter", "hunter", "hunter", "wraith", "wraith", "wraith", "wraith", "tiger"],
  ["runner", "runner", "runner", "runner", "runner", "wraith", "wraith", "tiger"],
  ["balloon", "balloon", "balloon", "scout", "scout", "scout", "tiger", "tiger"],
  ["balloon", "scout", "runner", "runner", "runner", "ghost", "tiger", "tiger"],
  ["scout", "runner", "hunter", "ghost", "wraith", "wraith", "tiger", "tiger"],
  ["ghost", "ghost", "ghost", "wraith", "wraith", "wraith", "wraith", "tiger", "tiger"],
  ["runner", "runner", "runner", "runner", "hunter", "hunter", "hunter", "wraith", "tiger"],
  ["runner", "runner", "hunter", "hunter", "ghost", "ghost", "wraith", "wraith", "tiger"],
  ["runner", "hunter", "ghost", "wraith", "wraith", "ghost", "wraith", "wraith", "tiger"],
  ["scout", "scout", "runner", "hunter", "ghost", "ghost", "wraith", "wraith", "tiger"],
  ["balloon", "scout", "runner", "hunter", "ghost", "ghost", "wraith", "wraith", "tiger"],
  ["balloon", "scout", "wraith", "wraith", "wraith", "ghost", "wraith", "wraith", "tiger"],
  ["scout", "runner", "runner", "runner", "hunter", "hunter", "hunter", "wraith", "tiger"],
  ["ghost", "ghost", "ghost", "ghost", "ghost", "wraith", "tiger", "wraith", "tiger"],
  ["runner", "runner", "runner", "hunter", "hunter", "ghost", "ghost", "wraith", "tiger"],
  ["scout", "scout", "runner", "runner", "hunter", "hunter", "ghost", "ghost", "wraith", "wraith"],
  ["scout", "runner", "hunter", "hunter", "hunter", "wraith", "wraith", "wraith", "wraith", "tiger"],
  ["runner", "runner", "hunter", "hunter", "ghost", "wraith", "wraith", "tiger", "wraith", "tiger"],
  ["runner", "runner", "hunter", "hunter", "hunter", "wraith", "wraith", "tiger", "wraith", "tiger"],
  ["runner", "runner", "hunter", "ghost", "wraith", "wraith", "tiger", "wraith", "tiger"],
  ["runner", "runner", "hunter", "hunter", "wraith", "wraith", "tiger", "wraith", "tiger", "tiger"],
  ["runner", "runner", "hunter", "ghost", "wraith", "wraith", "tiger", "wraith", "tiger", "tiger"],
  ["runner", "runner", "hunter", "hunter", "wraith", "wraith", "tiger", "wraith", "tiger", "tiger"],
  ["runner", "hunter", "ghost", "ghost", "wraith", "tiger", "wraith", "tiger", "tiger", "tiger"],
  ["runner", "hunter", "hunter", "wraith", "wraith", "tiger", "wraith", "tiger", "tiger", "tiger"],
  ["runner", "hunter", "ghost", "wraith", "wraith", "wraith", "tiger", "tiger", "tiger", "tiger"],
  ["hunter", "ghost", "wraith", "wraith", "tiger", "wraith", "tiger", "tiger", "tiger", "tiger"],
  ["hunter", "ghost", "wraith", "tiger", "wraith", "tiger", "tiger", "tiger", "tiger", "tiger"],
  ["hunter", "ghost", "wraith", "tiger", "wraith", "tiger", "tiger", "tiger", "tiger", "tiger"],
  ["ghost", "wraith", "ghost", "wraith", "tiger", "tiger", "tiger", "tiger", "tiger", "tiger"],
  ["ghost", "wraith", "ghost", "wraith", "tiger", "tiger", "tiger", "tiger", "tiger", "tiger"],
  ["wraith", "ghost", "ghost", "wraith", "tiger", "tiger", "tiger", "tiger", "tiger", "tiger"],
  ["wraith", "ghost", "wraith", "tiger", "tiger", "tiger", "tiger", "tiger", "tiger", "spinner"],
  ["ghost", "ghost", "wraith", "tiger", "tiger", "tiger", "tiger", "tiger", "tiger", "spinner"],
  ["ghost", "ghost", "wraith", "tiger", "tiger", "tiger", "tiger", "tiger", "spinner", "spinner"],
];
export const bomberIndex = (x: number, y: number) => y * BOMBER_COLS + x;
export const bomberXY = (index: number) => ({ x: index % BOMBER_COLS, y: Math.floor(index / BOMBER_COLS) });
const DIRECTION: Record<BomberDirection, number> = { up: -BOMBER_COLS, down: BOMBER_COLS, left: -1, right: 1 };
const DIRECTIONS = Object.keys(DIRECTION) as BomberDirection[];
export interface BomberActor { at: number; from: number; movedAt: number; direction: BomberDirection }
export interface BomberEnemy extends BomberActor { id: number; kind: BomberEnemyKind; nextMove: number; invulnerableUntil: number }
export interface BomberBomb { id: number; at: number; explodeAt: number; range: number; remote: boolean }
export interface BomberState {
  difficulty: BomberDifficulty; stage: number; seed: number; stageSeed: number; elapsed: number; stageStartedAt: number;
  status: 'playing' | 'retry' | 'clear' | 'win' | 'lose'; bonus: boolean; overtime: boolean; score: number; lives: number;
  range: number; capacity: number; speed: number; remote: boolean; wallPass: boolean; bombPass: boolean; firePass: boolean;
  invincibleUntil: number; invulnerableUntil: number; moveReadyAt: number; stagePowerCollected: boolean;
  terrain: BomberTerrain[]; hiddenPowers: Record<number, BomberPower>; powers: Record<number, BomberPower>;
  player: BomberActor; enemies: BomberEnemy[]; bombs: BomberBomb[]; fire: Record<number, number>;
  exit: number; powerAt: number; bombSerial: number; enemySerial: number; stageBombs: number;
  events: Array<'plant' | 'blast' | 'power' | 'hurt' | 'warning' | 'stepHorizontal' | 'stepVertical' | 'clear' | 'win' | 'lose'>;
}
function random(state: BomberState) {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}
export function bomberNeighbor(at: number, direction: BomberDirection): number | null {
  const next = at + DIRECTION[direction];
  if (next < 0 || next >= BOMBER_COLS * BOMBER_ROWS || (Math.abs(DIRECTION[direction]) === 1 && Math.floor(next / BOMBER_COLS) !== Math.floor(at / BOMBER_COLS))) return null;
  return next;
}
function enemy(state: BomberState, at: number, kind: BomberEnemyKind, protection = 0): BomberEnemy {
  return { at, from: at, movedAt: state.elapsed, direction: 'left', id: ++state.enemySerial, kind, nextMove: state.elapsed + 1200, invulnerableUntil: state.elapsed + protection };
}
function bonusEnemy(stage: number): BomberEnemyKind { return (Object.keys(BOMBER_ENEMIES) as BomberEnemyKind[])[Math.min(7, Math.max(0, Math.floor(stage / 5) - 1))]; }
function setupBomberStage(state: BomberState, retry = false) {
  if (retry) state.seed = state.stageSeed;
  else { state.stageSeed = state.seed; state.stagePowerCollected = false; }
  const startSafe = new Set([bomberIndex(1, 1), bomberIndex(2, 1), bomberIndex(1, 2), bomberIndex(1, 3)]);
  const terrain: BomberTerrain[] = Array.from({ length: BOMBER_COLS * BOMBER_ROWS }, (_, i) => {
    const { x, y } = bomberXY(i);
    if (x === 0 || x === BOMBER_COLS - 1 || y === 0 || y === BOMBER_ROWS - 1 || (x % 2 === 0 && y % 2 === 0)) return 'stone';
    return !state.bonus && !startSafe.has(i) && random(state) < Math.min(.6, .44 + state.stage * .007) ? 'crate' : 'floor';
  });
  const spawns = [bomberIndex(29, 11), bomberIndex(29, 1), bomberIndex(1, 11), bomberIndex(15, 11), bomberIndex(15, 1), bomberIndex(23, 5), bomberIndex(9, 9), bomberIndex(21, 9), bomberIndex(7, 5), bomberIndex(19, 3), bomberIndex(11, 7), bomberIndex(27, 7)];
  for (const spawn of spawns) {
    terrain[spawn] = 'floor';
    for (const direction of DIRECTIONS) { const next = bomberNeighbor(spawn, direction); if (next !== null && terrain[next] !== 'stone') terrain[next] = 'floor'; }
  }
  state.terrain = terrain;
  const boxes = terrain.map((cell, index) => cell === 'crate' && bomberXY(index).x > 8 && !spawns.includes(index) ? index : -1).filter((index) => index >= 0);
  state.exit = state.bonus ? -1 : boxes[Math.floor(random(state) * boxes.length)] ?? bomberIndex(27, 11);
  state.powerAt = state.stage === 1 ? bomberIndex(3, 1) : boxes.filter((index) => index !== state.exit)[Math.floor(random(state) * Math.max(1, boxes.length - 1))] ?? bomberIndex(3, 1);
  state.hiddenPowers = {};
  if (!state.bonus) {
    terrain[state.exit] = 'crate'; terrain[state.powerAt] = 'crate';
    if (!state.stagePowerCollected) state.hiddenPowers[state.powerAt] = BOMBER_STAGE_POWERS[state.stage - 1];
  }
  state.powers = {}; state.bombs = []; state.fire = {};
  state.player = { at: BOMBER_START, from: BOMBER_START, movedAt: state.elapsed, direction: 'down' };
  const roster = state.bonus ? Array<BomberEnemyKind>(10).fill(bonusEnemy(state.stage)) : [...BOMBER_STAGE_ROSTERS[state.stage - 1], ...Array<BomberEnemyKind>(BOMBER_LEVELS[state.difficulty].extraEnemies).fill(state.stage > 5 ? 'hunter' : 'scout')];
  state.enemies = roster.map((kind, i) => enemy(state, spawns[i], kind));
  state.moveReadyAt = state.elapsed; state.stageStartedAt = state.elapsed; state.invulnerableUntil = state.elapsed + 1800;
  state.stageBombs = 0; state.overtime = false; state.status = 'playing';
}
export function createBomberState(difficulty: BomberDifficulty, seed = 20261003): BomberState {
  const state: BomberState = {
    difficulty, stage: 1, seed: seed >>> 0, stageSeed: seed >>> 0, elapsed: 0, stageStartedAt: 0, status: 'playing', bonus: false, overtime: false, score: 0,
    lives: BOMBER_LEVELS[difficulty].lives, range: 1, capacity: 1, speed: 180, remote: false, wallPass: false, bombPass: false, firePass: false,
    invincibleUntil: 0, invulnerableUntil: 0, moveReadyAt: 0, stagePowerCollected: false, terrain: [], hiddenPowers: {}, powers: {},
    player: { at: BOMBER_START, from: BOMBER_START, movedAt: 0, direction: 'down' }, enemies: [], bombs: [], fire: {}, exit: -1, powerAt: -1, bombSerial: 0, enemySerial: 0, stageBombs: 0, events: [],
  };
  setupBomberStage(state); return state;
}
export function nextBomberStage(state: BomberState) {
  if (state.status !== 'clear' || state.stage >= BOMBER_STAGES) return false;
  if (!state.bonus && state.stage % 5 === 0) state.bonus = true;
  else { state.bonus = false; state.stage++; }
  setupBomberStage(state); return true;
}
export function retryBomberStage(state: BomberState) {
  if (state.status !== 'retry') return false;
  setupBomberStage(state, true); return true;
}
export function continueBomberRun(state: BomberState) {
  if (state.status !== 'lose') return false;
  state.lives = BOMBER_LEVELS[state.difficulty].lives; state.elapsed = 0; state.invincibleUntil = 0; state.events = [];
  setupBomberStage(state, true); return true;
}
function passable(state: BomberState, index: number, wallPass = false, bombPass = false) {
  return (state.terrain[index] === 'floor' || wallPass && state.terrain[index] === 'crate') && (bombPass || !state.bombs.some((bomb) => bomb.at === index));
}
function checkExit(state: BomberState) {
  if (state.status !== 'playing' || state.bonus || state.enemies.length || state.terrain[state.exit] !== 'floor' || state.player.at !== state.exit) return;
  state.lives++; // Original stage-clear one-up.
  state.status = state.stage === BOMBER_STAGES ? 'win' : 'clear'; state.events.push(state.status);
}
function hurtPlayer(state: BomberState) {
  if (state.status !== 'playing' || state.bonus || state.elapsed < Math.max(state.invulnerableUntil, state.invincibleUntil)) return;
  state.events.push('hurt'); state.lives--;
  state.remote = false; state.wallPass = false; state.bombPass = false; state.firePass = false; state.invincibleUntil = 0;
  if (!['range', 'capacity', 'speed'].includes(BOMBER_STAGE_POWERS[state.stage - 1])) state.stagePowerCollected = false;
  state.status = state.lives <= 0 ? 'lose' : 'retry';
  if (state.status === 'lose') state.events.push('lose');
}
/** Shared by drawing and collision: logical destination must not hit before the sprite arrives. */
export function bomberActorPosition(actor: BomberActor, now: number) {
  const from = bomberXY(actor.from), to = bomberXY(actor.at);
  const t = Math.min(1, Math.max(0, (now - actor.movedAt) / 110));
  return { x: (from.x + (to.x - from.x) * t) * 60 + 30, y: (from.y + (to.y - from.y) * t) * 60 + 28 };
}
export function bomberPlayerInDanger(state: BomberState) {
  const player = bomberActorPosition(state.player, state.elapsed);
  const creature = state.enemies.some(monster => {
    // Arrival effects and translucent spawn shields are harmless until fully visible.
    if (monster.invulnerableUntil > state.elapsed) return false;
    const point = bomberActorPosition(monster, state.elapsed);
    return Math.hypot(player.x - point.x, player.y - point.y) < 25;
  });
  const flame = !state.firePass && Object.entries(state.fire).some(([index, until]) => {
    // Last 120 ms is a harmless fade, so faint/disappearing embers cannot kill.
    if (until - state.elapsed <= 120) return false;
    const tile = bomberXY(Number(index)), dx = Math.abs(player.x - (tile.x * 60 + 30)), dy = Math.abs(player.y - (tile.y * 60 + 30));
    // Inset flame bounds + a forgiving 10px body radius; ignore helmet, hands and aura.
    return Math.hypot(Math.max(0, dx - 17), Math.max(0, dy - 17)) < 10;
  });
  return creature || flame;
}
function resolvePlayerCell(state: BomberState) {
  if (bomberPlayerInDanger(state)) hurtPlayer(state);
  if (state.status !== 'playing') return;
  const power = state.powers[state.player.at];
  if (power) {
    if (power === 'range') state.range = Math.min(5, state.range + 1);
    else if (power === 'capacity') state.capacity = Math.min(10, state.capacity + 1);
    else if (power === 'speed') state.speed = Math.min(state.speed, 135);
    else if (power === 'invincible') state.invincibleUntil = state.elapsed + 34_000;
    else state[power] = true;
    delete state.powers[state.player.at]; state.stagePowerCollected = true; state.score += 1000; state.events.push('power');
  }
  checkExit(state);
}
export function moveBomberPlayer(state: BomberState, direction: BomberDirection) {
  if (state.status !== 'playing' || state.elapsed < state.moveReadyAt) return false;
  state.player.direction = direction;
  const next = bomberNeighbor(state.player.at, direction);
  if (next === null || !passable(state, next, state.wallPass, state.bombPass)) return false;
  state.player.from = state.player.at; state.player.at = next; state.player.movedAt = state.elapsed; state.moveReadyAt = state.elapsed + state.speed;
  state.events.push(direction === 'left' || direction === 'right' ? 'stepHorizontal' : 'stepVertical');
  resolvePlayerCell(state); return true;
}
export function plantBomberBomb(state: BomberState) {
  if (state.status !== 'playing' || state.terrain[state.player.at] !== 'floor' || state.bombs.length >= state.capacity || state.bombs.some((bomb) => bomb.at === state.player.at)) return false;
  state.bombs.push({ id: ++state.bombSerial, at: state.player.at, range: state.range, remote: state.remote, explodeAt: state.remote ? Infinity : state.elapsed + BOMBER_FUSE });
  state.stageBombs++; state.events.push('plant'); return true;
}
export function triggerBomberRemote(state: BomberState) {
  if (state.status !== 'playing' || !state.remote) return false;
  const bomb = state.bombs.find((item) => item.remote && item.explodeAt === Infinity);
  if (!bomb) return false;
  bomb.explodeAt = state.elapsed;
  return true;
}
export function bomberBlastCells(state: BomberState, at: number, range: number) {
  const cells = [at];
  for (const direction of DIRECTIONS) {
    let here = at;
    for (let step = 0; step < range; step++) {
      const next = bomberNeighbor(here, direction);
      if (next === null || state.terrain[next] === 'stone') break;
      cells.push(next);
      if (state.terrain[next] === 'crate' || state.bombs.some((bomb) => bomb.at === next)) break;
      here = next;
    }
  }
  return cells;
}
function releaseEnemies(state: BomberState, origin: number, count: number, kind: BomberEnemyKind) {
  const { x, y } = bomberXY(origin);
  const candidates = state.terrain.map((cell, index) => ({ cell, index, distance: Math.abs(bomberXY(index).x - x) + Math.abs(bomberXY(index).y - y) }))
    .filter(({ cell, index }) => cell === 'floor' && index !== state.player.at && !state.bombs.some((bomb) => bomb.at === index) && !state.enemies.some((monster) => monster.at === index))
    .sort((a, b) => a.distance - b.distance);
  for (const spot of candidates.slice(0, Math.min(count, Math.max(0, (state.difficulty === 'hard' ? 12 : 10) - state.enemies.length)))) state.enemies.push(enemy(state, spot.index, kind, BOMBER_FIRE + 200));
}
function detonateBomberBombs(state: BomberState) {
  const queue = state.bombs.filter((bomb) => bomb.explodeAt <= state.elapsed || state.fire[bomb.at] > state.elapsed).map((bomb) => bomb.id);
  if (!queue.length) return;
  // All rays use the same pre-explosion walls, so a chain cannot tunnel through a newly broken brick.
  const explosions = new Map(state.bombs.map((bomb) => [bomb.id, bomberBlastCells(state, bomb.at, bomb.range)]));
  const detonated = new Set<number>(), burning = new Set<number>();
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head]; if (detonated.has(id)) continue;
    detonated.add(id);
    for (const index of explosions.get(id) ?? []) {
      burning.add(index);
      const chained = state.bombs.find((bomb) => bomb.at === index);
      if (chained && !detonated.has(chained.id)) queue.push(chained.id);
    }
  }
  state.bombs = state.bombs.filter((bomb) => !detonated.has(bomb.id));
  const alarms: Array<{ at: number; kind: BomberEnemyKind }> = [];
  for (const index of burning) {
    state.fire[index] = state.elapsed + BOMBER_FIRE;
    if (state.terrain[index] === 'crate') {
      state.terrain[index] = 'floor';
      if (state.hiddenPowers[index]) { state.powers[index] = state.hiddenPowers[index]; delete state.hiddenPowers[index]; }
    } else {
      if (index === state.exit) alarms.push({ at: index, kind: (Object.keys(BOMBER_ENEMIES) as BomberEnemyKind[])[['capacity', 'range', 'speed', 'wallPass', 'remote', 'bombPass', 'firePass', 'invincible'].indexOf(BOMBER_STAGE_POWERS[state.stage - 1])] });
      if (state.powers[index]) { delete state.powers[index]; alarms.push({ at: index, kind: (Object.keys(BOMBER_ENEMIES) as BomberEnemyKind[])[['capacity', 'range', 'speed', 'wallPass', 'remote', 'bombPass', 'firePass', 'invincible'].indexOf(BOMBER_STAGE_POWERS[state.stage - 1])] }); }
    }
  }
  for (const alarm of alarms) releaseEnemies(state, alarm.at, 4, alarm.kind);
  if (alarms.length) state.events.push('warning');
  state.events.push('blast');
}
function killBurningEnemies(state: BomberState) {
  state.enemies = state.enemies.filter((monster) => {
    if (state.fire[monster.at] > state.elapsed && monster.invulnerableUntil <= state.elapsed) { state.score += BOMBER_ENEMIES[monster.kind].points; return false; }
    return true;
  });
}
function moveBomberEnemies(state: BomberState) {
  const danger = new Set(Object.keys(state.fire).map(Number));
  state.bombs.filter((bomb) => bomb.explodeAt - state.elapsed < 750).forEach((bomb) => bomberBlastCells(state, bomb.at, bomb.range).forEach((index) => danger.add(index)));
  for (const monster of state.enemies) {
    if (state.elapsed < monster.nextMove) continue;
    const spec = BOMBER_ENEMIES[monster.kind];
    monster.nextMove = state.elapsed + Math.max(150, BOMBER_LEVELS[state.difficulty].enemyStep * spec.speed);
    const options = DIRECTIONS.map((direction) => ({ direction, at: bomberNeighbor(monster.at, direction) })).filter((option): option is { direction: BomberDirection; at: number } => option.at !== null && passable(state, option.at, spec.wallPass) && (!spec.alert || !danger.has(option.at)) && !state.enemies.some((other) => other.id !== monster.id && other.at === option.at));
    if (!options.length) continue;
    let choice = options.find((option) => option.direction === monster.direction) ?? options[Math.floor(random(state) * options.length)];
    if (!spec.chase && random(state) < .22) choice = options[Math.floor(random(state) * options.length)];
    if (spec.chase) {
      const target = bomberXY(state.player.at), here = bomberXY(monster.at);
      if (Math.abs(target.x - here.x) + Math.abs(target.y - here.y) <= 6 || target.x === here.x || target.y === here.y) {
        choice = [...options].sort((a, b) => {
          const pa = bomberXY(a.at), pb = bomberXY(b.at);
          return Math.abs(pa.x - target.x) + Math.abs(pa.y - target.y) - Math.abs(pb.x - target.x) - Math.abs(pb.y - target.y);
        })[0];
      }
    }
    monster.from = monster.at; monster.at = choice.at; monster.direction = choice.direction; monster.movedAt = state.elapsed;
    if (bomberPlayerInDanger(state)) hurtPlayer(state);
    if (state.status !== 'playing') break;
  }
}
export function advanceBomber(state: BomberState, delta: number, direction: BomberDirection | null = null) {
  let remaining = Number.isFinite(delta) ? Math.max(0, delta) : 0;
  while (remaining > 0 && state.status === 'playing') {
    const step = Math.min(40, remaining); remaining -= step; state.elapsed += step;
    for (const [index, until] of Object.entries(state.fire)) if (until <= state.elapsed) delete state.fire[Number(index)];
    const limit = state.bonus ? BOMBER_BONUS_LIMIT : BOMBER_LEVELS[state.difficulty].limit;
    if (state.elapsed - state.stageStartedAt >= limit) {
      if (state.bonus) { state.status = 'clear'; state.events.push('clear'); break; }
      if (!state.overtime) { state.overtime = true; state.enemies = []; releaseEnemies(state, state.exit, 10, 'spinner'); state.events.push('warning'); }
    }
    detonateBomberBombs(state); killBurningEnemies(state); resolvePlayerCell(state);
    if (state.status !== 'playing') break;
    if (direction) moveBomberPlayer(state, direction);
    if (state.status !== 'playing') break;
    moveBomberEnemies(state); killBurningEnemies(state); resolvePlayerCell(state);
    if (state.bonus && state.enemies.length < 10) releaseEnemies(state, bomberIndex(29, 11), 10 - state.enemies.length, bonusEnemy(state.stage));
  }
}
