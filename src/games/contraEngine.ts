/** Native, deterministic FC-style rules. Rendering never determines a hit. */
export const CONTRA_W = 384;
export const CONTRA_H = 224;
export const CONTRA_STAGES = [
  { zh: '丛林', en: 'Jungle', kind: 'side', length: 3584, color: '#53b89a' },
  { zh: '基地一', en: 'Base I', kind: 'base', length: 384, color: '#7aa9e7' },
  { zh: '瀑布', en: 'Waterfall', kind: 'vertical', length: 1792, color: '#70cadd' },
  { zh: '基地二', en: 'Base II', kind: 'base', length: 384, color: '#a5a9f4' },
  { zh: '雪地', en: 'Snowfield', kind: 'side', length: 3328, color: '#b7e7f4' },
  { zh: '能源区', en: 'Energy Zone', kind: 'side', length: 3072, color: '#ffb968' },
  { zh: '机库', en: 'Hangar', kind: 'side', length: 3584, color: '#b3afc5' },
  { zh: '异形巢穴', en: 'Alien’s Lair', kind: 'side', length: 2560, color: '#de94db' },
] as const;
export type Weapon = 'N' | 'M' | 'S' | 'F' | 'L';
export type Power = Exclude<Weapon, 'N'> | 'R' | 'B' | '★';
export type ContraStatus = 'playing' | 'clear' | 'over' | 'win';
export interface ContraInput {
  left?: boolean;
  right?: boolean;
  up?: boolean;
  down?: boolean;
  jump?: boolean;
  fire?: boolean;
}
export interface ContraPlayer {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  grounded: boolean;
  prone: boolean;
  swimming: boolean;
  diving: boolean;
  lives: number;
  score: number;
  weapon: Weapon;
  rapid: boolean;
  shield: number;
  invincible: number;
  cooldown: number;
  jumpHeld: boolean;
  drop: number;
  dead: number;
  nextLife: number;
  aim: number;
}
export interface Platform {
  x: number;
  y: number;
  w: number;
  material?: 'ground' | 'ledge' | 'bridge';
  terrain?:
    'grass' | 'granite' | 'riverbank' | 'waterfall' | 'snow' | 'energy' | 'hangar' | 'alien';
  bridge?: boolean;
  collapse?: number;
}
export interface ContraEnemy {
  id: number;
  x: number;
  y: number;
  origin: number;
  kind: 'soldier' | 'turret' | 'tank' | 'alien' | 'carrier';
  hp: number;
  active: boolean;
  cooldown: number;
  vy: number;
  mount?: 'wall';
  angle?: number;
  power?: Power;
}
export interface ContraBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: number;
  damage: number;
  life: number;
  weapon: Weapon;
  phase: number;
  depth?: { fromX: number; fromY: number; toX: number; progress: number; rate: number };
}
export interface ContraWater {
  x: number;
  y: number;
  w: number;
  bottom: number;
}
export interface ContraImpact {
  x: number;
  y: number;
  age: number;
  kind: 'spark' | 'explosion' | 'splash';
}
export interface ContraPickup {
  x: number;
  y: number;
  vy: number;
  power: Power;
  life: number;
}
export interface ContraHazard {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'flame' | 'crusher' | 'rock';
  offset: number;
}
export interface ContraCore {
  x: number;
  y: number;
  hp: number;
  max: number;
}
export interface ContraBoss {
  x: number;
  y: number;
  cores: ContraCore[];
  active: boolean;
  timer: number;
  cooldown: number;
  originY: number;
}
export interface ContraState {
  stage: number;
  startingStage: number;
  count: 1 | 2;
  status: ContraStatus;
  elapsed: number;
  time: number;
  cameraX: number;
  cameraY: number;
  players: ContraPlayer[];
  platforms: Platform[];
  waters: ContraWater[];
  impacts: ContraImpact[];
  enemies: ContraEnemy[];
  bullets: ContraBullet[];
  pickups: ContraPickup[];
  hazards: ContraHazard[];
  boss: ContraBoss;
  room: number;
  rooms: number;
  advancing: number;
  door: number;
  roomCores: ContraCore[];
  events: (
    | 'shot'
    | 'shotM'
    | 'shotS'
    | 'shotF'
    | 'shotL'
    | 'hit'
    | 'heart'
    | 'armor'
    | 'kill'
    | 'explosion'
    | 'bridge'
    | 'splash'
    | 'power'
    | 'death'
    | 'clear'
    | 'over'
    | 'life'
  )[];
  accumulator: number;
}
export const contraKind = (s: ContraState) => CONTRA_STAGES[s.stage - 1].kind;
export const contraBossHP = (s: ContraState) => s.boss.cores.reduce((n, c) => n + c.hp, 0);
export const hazardActive = (s: ContraState, h: ContraHazard) => (s.time + h.offset) % 3.2 > 1.45;
export function playerBody(p: ContraPlayer) {
  return {
    x: p.x - 6,
    y: p.y - (p.prone ? 10 : 27),
    w: 12,
    h: p.swimming ? 8 : p.prone ? 9 : 25,
  };
}
function inside(
  x: number,
  y: number,
  r: { x: number; y: number; w: number; h: number },
  extra = 0,
) {
  return x >= r.x - extra && x <= r.x + r.w + extra && y >= r.y - extra && y <= r.y + r.h + extra;
}
function makePlayer(id: number, y: number): ContraPlayer {
  return {
    id,
    x: 42 + id * 24,
    y,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: true,
    prone: false,
    swimming: false,
    diving: false,
    lives: 3,
    score: 0,
    weapon: 'N',
    rapid: false,
    shield: 0,
    invincible: 2.5,
    cooldown: 0,
    jumpHeld: false,
    drop: 0,
    dead: 0,
    nextLife: 20000,
    aim: 0,
  };
}
function roomTargets(s: ContraState) {
  const positions = s.stage === 2 ? [192] : [124, 260];
  s.door = 0;
  s.roomCores = positions.map((x) => ({ x, y: 79, hp: 10 + s.room * 2, max: 10 + s.room * 2 }));
  s.bullets = [];
}
function loadStage(s: ContraState) {
  s.time = 0;
  s.cameraX = 0;
  s.cameraY = contraKind(s) === 'vertical' ? CONTRA_STAGES[2].length - CONTRA_H : 0;
  s.platforms = [];
  s.waters = [];
  s.impacts = [];
  s.enemies = [];
  s.bullets = [];
  s.pickups = [];
  s.hazards = [];
  s.room = 1;
  s.rooms = s.stage === 2 ? 6 : 8;
  s.advancing = 0;
  s.door = 0;
  s.roomCores = [];
  const vertical = contraKind(s) === 'vertical',
    base = contraKind(s) === 'base';
  const end = CONTRA_STAGES[s.stage - 1].length;
  if (base) {
    s.platforms.push({ x: 0, y: 204, w: CONTRA_W });
    roomTargets(s);
  } else if (vertical) {
    s.platforms.push({ x: 0, y: end - 24, w: CONTRA_W });
    for (let i = 0; i < 34; i++) {
      const y = end - 78 - i * 48,
        x = [18, 126, 234, 126][i % 4];
      s.platforms.push({ x, y, w: 132 });
      if (i % 3 === 1)
        s.enemies.push({
          id: i,
          x: x + 80,
          y,
          origin: x + 80,
          kind: 'turret',
          hp: 4,
          active: false,
          cooldown: 1,
          vy: 0,
        });
      if (i % 7 === 2)
        s.enemies.push({
          id: 100 + i,
          x: 185,
          y: y - 34,
          origin: 185,
          kind: 'carrier',
          hp: 1,
          active: false,
          cooldown: 0,
          vy: 0,
          power: ['S', 'M', 'L', 'B'][Math.floor(i / 7)] as Power,
        });
    }
    s.platforms.push({ x: 0, y: 90, w: CONTRA_W });
  } else {
    const terrain: Record<number, number[]> = {
      1: [160, 160, 170, 170, 160, 150, 150, 160, 160, 160, 200, 200, 170, 170],
      5: [200, 200, 184, 184, 200, 160, 160, 200, 180, 180, 200, 200, 200],
      6: [200, 168, 168, 200, 152, 152, 184, 184, 160, 200, 168, 200],
      7: [200, 200, 168, 168, 200, 152, 152, 184, 200, 168, 168, 200, 200, 200],
      8: [200, 184, 184, 200, 152, 152, 184, 184, 200, 200],
    };
    const ys = terrain[s.stage];
    ys.forEach((y, i) => {
      const gap = i > 0 && i < ys.length - 2 && i % 4 === 0;
      const bridge = s.stage === 1 && (i === 2 || i === 3);
      if (bridge) {
        for (let n = 0; n < 4; n++)
          s.platforms.push({ x: i * 256 + n * 64, y, w: 64, bridge: true, material: 'bridge' });
      } else {
        const terrain: Platform['terrain'] =
          s.stage === 1
            ? [1, 4, 8].includes(i)
              ? 'riverbank'
              : i % 3 === 0
                ? 'grass'
                : 'granite'
            : s.stage === 5
              ? 'snow'
              : s.stage === 6
                ? 'energy'
                : s.stage === 7
                  ? 'hangar'
                  : 'alien';
        s.platforms.push({ x: i * 256, y, w: gap ? 202 : 256, material: 'ground', terrain });
        if (i > 0 && i % 2 === 0)
          s.platforms.push({
            x: i * 256 + 32,
            y: y - 53,
            w: 108,
            material: 'ledge',
            terrain: s.stage === 1 ? 'granite' : terrain,
          });
      }
    });
    if (s.stage === 1)
      s.waters = [
        { x: 512, y: 195, w: 512, bottom: 250 },
        { x: 1226, y: 195, w: 54, bottom: 250 },
        { x: 2250, y: 195, w: 54, bottom: 250 },
      ];
    for (let i = 0; i < Math.floor((end - 300) / 135); i++) {
      const x = 270 + i * 135;
      const floor = s.platforms.find((p) => p.material === 'ground' && p.x <= x && p.x + p.w >= x);
      // Stationary weapons require an actual mount, never a fallback height in a gap.
      if (!floor) continue;
      const kind =
        s.stage === 8
          ? 'alien'
          : i % 7 === 4 && s.stage !== 1
            ? 'tank'
            : i % 3 === 2 || (s.stage === 1 && i % 7 === 4)
              ? 'turret'
              : 'soldier';
      s.enemies.push({
        id: i,
        x,
        y: floor.y,
        origin: x,
        kind,
        mount: s.stage === 1 && kind === 'turret' ? 'wall' : undefined,
        angle: Math.PI,
        hp: kind === 'tank' ? 18 : kind === 'turret' ? 5 : kind === 'alien' ? 3 : 1,
        active: false,
        cooldown: 0.9 + (i % 3) * 0.3,
        vy: 0,
      });
    }
    if (s.stage === 1)
      s.enemies.push({
        id: 80,
        x: 440,
        y: s.platforms.find((t) => t.material === 'ground' && t.x <= 440 && t.x + t.w > 440)!.y,
        origin: 440,
        kind: 'turret',
        mount: 'wall',
        angle: Math.PI,
        hp: 5,
        active: false,
        cooldown: 1.2,
        vy: 0,
      });
    const powers: Power[] = ['M', 'S', 'R', 'F', 'L', 'B', '★'];
    powers.forEach((power, i) => {
      const x = 200 + i * 380;
      if (x < end - 260)
        s.enemies.push({
          id: 100 + i,
          x,
          y: 90,
          origin: x,
          kind: 'carrier',
          hp: 1,
          active: false,
          cooldown: 0,
          vy: 0,
          power,
        });
    });
    if (s.stage === 6 || s.stage === 7)
      for (let i = 0; i < 7; i++) {
        const x = 470 + i * 340,
          floor = s.platforms.find((p) => p.x <= x && p.x + p.w >= x);
        s.hazards.push({
          x,
          y: (floor?.y ?? 200) - (s.stage === 6 ? 66 : 52),
          w: s.stage === 6 ? 14 : 34,
          h: s.stage === 6 ? 66 : 52,
          kind: s.stage === 6 ? 'flame' : 'crusher',
          offset: i * 0.6,
        });
      }
  }
  const bossX = base ? 192 : vertical ? 192 : end - 94,
    bossY = base ? 80 : vertical ? 55 : 150;
  const coreCount = s.stage === 8 ? 1 : [1, 2, 3, 4].includes(s.stage) ? 3 : 2;
  s.boss = {
    x: bossX,
    y: bossY,
    originY: bossY,
    cores: Array.from({ length: coreCount }, (_, i) => ({
      x: bossX + (i - (coreCount - 1) / 2) * (base || vertical ? 45 : 24),
      y: bossY + (base || vertical ? 0 : (i % 2) * 28),
      hp: s.stage === 8 ? 120 : 24 + s.stage * 4,
      max: s.stage === 8 ? 120 : 24 + s.stage * 4,
    })),
    active: false,
    timer: 0,
    cooldown: 1,
  };
  for (const p of s.players) {
    p.x = base ? (s.count === 1 ? 192 : 168 + p.id * 48) : 42 + p.id * 24;
    p.y = vertical
      ? end - 24
      : base
        ? 204
        : (s.platforms.find((t) => t.material === 'ground' && t.x <= p.x && t.x + t.w > p.x)?.y ??
          200);
    p.vx = 0;
    p.vy = 0;
    p.grounded = true;
    p.prone = false;
    p.swimming = false;
    p.diving = false;
    p.invincible = 2.5;
    p.dead = 0;
    p.jumpHeld = false;
    p.cooldown = 0;
  }
}
export function createContraState(count: 1 | 2 = 1, stage = 1): ContraState {
  stage = Math.max(1, Math.min(8, Math.floor(stage)));
  const s: ContraState = {
    stage,
    startingStage: stage,
    count,
    status: 'playing',
    elapsed: 0,
    time: 0,
    cameraX: 0,
    cameraY: 0,
    players: Array.from({ length: count }, (_, id) => makePlayer(id, 200)),
    platforms: [],
    waters: [],
    impacts: [],
    enemies: [],
    bullets: [],
    pickups: [],
    hazards: [],
    boss: { x: 0, y: 0, originY: 0, cores: [], active: false, timer: 0, cooldown: 1 },
    room: 1,
    rooms: 6,
    advancing: 0,
    door: 0,
    roomCores: [],
    events: [],
    accumulator: 0,
  };
  loadStage(s);
  return s;
}
export function nextContraStage(s: ContraState) {
  if (s.status !== 'clear') return;
  s.stage++;
  s.status = 'playing';
  s.accumulator = 0;
  loadStage(s);
}
export function contraBasePhase(s: ContraState) {
  if (s.boss.active) return 'boss';
  if (s.advancing > 0) return 'advancing';
  if (s.roomCores.some((c) => c.hp > 0)) return 'combat';
  return s.door < 1 ? 'opening' : 'open';
}
export function enterContraBaseDoor(s: ContraState) {
  if (
    s.status !== 'playing' ||
    contraKind(s) !== 'base' ||
    contraBasePhase(s) !== 'open' ||
    !s.players.some((p) => p.lives > 0 && p.dead <= 0)
  )
    return false;
  s.advancing = 0.001;
  s.bullets = [];
  for (const p of s.players) {
    p.prone = false;
    p.vx = 0;
    p.vy = 0;
    p.y = 204;
    p.grounded = true;
  }
  return true;
}
export function addContraScore(s: ContraState, p: ContraPlayer, score: number) {
  p.score += score;
  while (p.score >= p.nextLife) {
    p.lives++;
    p.nextLife = p.nextLife === 20000 ? 50000 : p.nextLife + 50000;
    s.events.push('life');
  }
}
export function hurtContraPlayer(s: ContraState, p: ContraPlayer, pit = false) {
  if (p.lives <= 0 || p.dead > 0 || (!pit && (p.invincible > 0 || p.shield > 0 || p.diving)))
    return;
  p.lives--;
  p.diving = false;
  p.dead = 0.75;
  p.weapon = 'N';
  p.rapid = false;
  p.shield = 0;
  s.events.push('death');
  if (s.players.every((q) => q.lives <= 0)) {
    s.status = 'over';
    s.events.push('over');
  }
}
export function collectContraPower(s: ContraState, p: ContraPlayer, power: Power) {
  if (power === 'R') p.rapid = true;
  else if (power === 'B') p.shield = 20;
  else if (power === '★') {
    for (const e of s.enemies)
      if (e.active && e.kind !== 'carrier' && e.hp > 0) {
        e.hp = 0;
        addContraScore(s, p, 100);
      }
    s.bullets = s.bullets.filter((b) => b.owner >= 0);
  } else p.weapon = power;
  addContraScore(s, p, 1000);
  s.events.push('power');
}
export function waterAt(s: ContraState, x: number) {
  return s.waters.find((water) => x >= water.x && x < water.x + water.w);
}
export function contraMuzzle(p: ContraPlayer, base = false) {
  if (base) return { x: p.x, y: p.y - (p.prone ? 13 : 24) };
  const angle = p.aim;
  return {
    x: p.x + Math.cos(angle) * 15,
    y: p.y - (p.prone ? 7 : p.swimming ? 23 : 17) + Math.sin(angle) * 15,
  };
}
export function enemyBody(e: ContraEnemy) {
  if (e.mount === 'wall') return { x: e.x - 13, y: e.y - 16, w: 26, h: 26 };
  const size = e.kind === 'tank' ? 23 : e.kind === 'carrier' ? 14 : 10;
  return {
    x: e.x - size,
    y: e.y - (e.kind === 'carrier' ? 11 : 28),
    w: size * 2,
    h: e.kind === 'carrier' ? 22 : 28,
  };
}
function bulletHits(b: ContraBullet, body: { x: number; y: number; w: number; h: number }) {
  const radius = b.weapon === 'F' ? 4 : b.weapon === 'L' ? 2 : b.weapon === 'S' ? 2.8 : 2;
  const length = b.weapon === 'L' && b.owner >= 0 ? 18 : 0;
  const angle = Math.atan2(b.vy, b.vx);
  for (let distance = 0; distance <= length; distance += 3) {
    if (inside(b.x - Math.cos(angle) * distance, b.y - Math.sin(angle) * distance, body, radius))
      return true;
  }
  return false;
}
function impact(s: ContraState, x: number, y: number, kind: ContraImpact['kind']) {
  s.impacts.push({ x, y, kind, age: 0 });
}
function firePlayer(s: ContraState, p: ContraPlayer) {
  if (
    p.cooldown > 0 ||
    p.diving ||
    (contraKind(s) === 'base' &&
      (s.advancing > 0 || (!s.boss.active && contraBasePhase(s) !== 'combat')))
  )
    return;
  const existing = s.bullets.filter((b) => b.owner === p.id).length;
  const limit = p.weapon === 'S' ? 15 : p.weapon === 'M' ? 6 : p.weapon === 'L' ? 3 : 4;
  if (existing >= limit) return;
  let angle = p.aim;
  if (contraKind(s) === 'base') angle = -Math.PI / 2;
  const muzzle = contraMuzzle(p, contraKind(s) === 'base');
  const spreads = p.weapon === 'S' ? [-0.24, -0.12, 0, 0.12, 0.24] : [0];
  if (p.weapon === 'L') s.bullets = s.bullets.filter((b) => b.owner !== p.id);
  for (const spread of spreads) {
    const a = angle + spread,
      speed = (p.weapon === 'M' ? 310 : p.weapon === 'L' ? 420 : 260) * (p.rapid ? 1.3 : 1);
    s.bullets.push({
      x: muzzle.x,
      y: muzzle.y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      owner: p.id,
      damage: p.weapon === 'L' ? 3 : 1,
      life: 1.6,
      weapon: p.weapon,
      phase: s.time,
    });
  }
  p.cooldown = p.weapon === 'M' ? 0.09 : p.weapon === 'L' ? 0.22 : 0.16;
  s.events.push(p.weapon === 'N' ? 'shot' : `shot${p.weapon}`);
}
function aimed(s: ContraState, x: number, y: number, speed = 100, spread = 0) {
  const target = s.players
    .filter((p) => p.lives > 0 && p.dead <= 0)
    .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
  if (!target) return;
  if (contraKind(s) === 'base') {
    const toX = target.x + Math.tan(spread) * 110;
    s.bullets.push({
      x,
      y,
      vx: 0,
      vy: 0,
      owner: -1,
      damage: 1,
      life: 3,
      weapon: 'N',
      phase: s.time,
      depth: { fromX: x, fromY: y, toX, progress: 0, rate: speed / 130 },
    });
    return;
  }
  const a = Math.atan2(target.y - 16 - y, target.x - x) + spread;
  s.bullets.push({
    x,
    y,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    owner: -1,
    damage: 1,
    life: 5,
    weapon: 'N',
    phase: 0,
  });
}
function respawn(s: ContraState, p: ContraPlayer) {
  const mate = s.players.find((q) => q.id !== p.id && q.lives > 0 && q.dead <= 0);
  p.x =
    mate?.x ??
    (contraKind(s) === 'base' ? (s.count === 1 ? 192 : 168 + p.id * 48) : s.cameraX + 50);
  const candidates = s.platforms
    .filter(
      (t) =>
        t.x <= p.x &&
        t.x + t.w >= p.x &&
        t.y >= s.cameraY + 40 &&
        t.y < s.cameraY + CONTRA_H &&
        t.collapse !== 0,
    )
    .sort((a, b) => b.y - a.y);
  if (!candidates.length && contraKind(s) === 'vertical') {
    const platform = s.platforms
      .filter((t) => t.y > s.cameraY + 40 && t.y < s.cameraY + CONTRA_H)
      .sort((a, b) => b.y - a.y)[0];
    if (platform) p.x = platform.x + platform.w / 2;
  }
  p.y = mate?.y ?? candidates[0]?.y ?? s.cameraY + 180;
  p.vy = 0;
  p.grounded = false;
  p.invincible = 2.5;
  p.swimming = false;
  p.diving = false;
  p.drop = 0;
}
function step(s: ContraState, dt: number, inputs: ContraInput[]) {
  s.elapsed += dt;
  s.time += dt;
  const kind = contraKind(s),
    vertical = kind === 'vertical',
    base = kind === 'base';
  for (const p of s.players) {
    if (p.lives <= 0) continue;
    if (p.dead > 0) {
      p.dead -= dt;
      if (p.dead <= 0) respawn(s, p);
      continue;
    }
    if (base && s.advancing > 0) {
      p.vx = 0;
      p.vy = 0;
      p.y = 204;
      p.grounded = true;
      p.prone = false;
      continue;
    }
    const input = inputs[p.id] ?? {},
      dir = Number(!!input.right) - Number(!!input.left);
    p.invincible = Math.max(0, p.invincible - dt);
    p.shield = Math.max(0, p.shield - dt);
    p.cooldown = Math.max(0, p.cooldown - dt);
    p.drop = Math.max(0, p.drop - dt);
    const previousX = p.x,
      wasSwimming = p.swimming;
    p.diving = p.swimming && !!input.down;
    p.prone = !p.swimming && !!input.down && p.grounded && !dir;
    if (dir) p.facing = dir;
    p.vx = p.prone || p.diving ? 0 : dir * (p.swimming ? 60 : 90);
    const aimY = input.up ? -1 : input.down && (!p.grounded || dir) && !p.swimming ? 1 : 0;
    p.aim = aimY && !dir ? Math.atan2(aimY, 0) : Math.atan2(aimY, dir || p.facing);
    const jump = !!input.jump && !p.jumpHeld;
    p.jumpHeld = !!input.jump;
    if (jump && p.grounded && !p.diving) {
      const support = s.platforms.find(
        (t) => t.collapse !== 0 && Math.abs(t.y - p.y) < 2 && p.x >= t.x && p.x < t.x + t.w,
      );
      if (!p.swimming && input.down && support && support.material !== 'ground' && !base) {
        p.drop = 0.25;
        p.y += 2;
        p.grounded = false;
      } else {
        p.vy = p.swimming ? -320 : -280;
        if (p.swimming) {
          const water = waterAt(s, p.x);
          if (water) impact(s, p.x, water.y, 'splash');
          s.events.push('splash');
        }
        p.swimming = false;
        p.grounded = false;
        p.prone = false;
      }
    }
    p.x += p.vx * dt;
    const rightLimit = base ? CONTRA_W - 18 : s.cameraX + CONTRA_W - 12;
    p.x = Math.max(s.cameraX + 9, Math.min(rightLimit, p.x));
    // Solid cliff faces block walking until a real jump clears the top.
    for (const t of s.platforms) {
      if (t.material !== 'ground' || p.y <= t.y + 1 || p.y - 25 >= CONTRA_H + 20) continue;
      const crossingRight = previousX + 5 <= t.x && p.x + 5 > t.x;
      const crossingLeft = previousX - 5 >= t.x + t.w && p.x - 5 < t.x + t.w;
      if (!crossingRight && !crossingLeft) continue;
      // A bank is a solid cliff: horizontal input never teleports a swimmer onto it.
      p.x = crossingRight ? t.x - 5 : t.x + t.w + 5;
    }
    const beforeFall = p.y;
    p.vy += 640 * dt;
    p.y += p.vy * dt;
    p.grounded = false;
    for (const t of s.platforms) {
      if (t.collapse === 0 || p.drop > 0 || p.vy < 0) continue;
      if (p.x + 5 > t.x && p.x - 5 < t.x + t.w && beforeFall <= t.y + 1 && p.y >= t.y) {
        p.y = t.y;
        p.vy = 0;
        p.grounded = true;
        p.swimming = false;
        p.diving = false;
        if (t.bridge && t.collapse === undefined) t.collapse = 0.8;
        break;
      }
    }
    const water = waterAt(s, p.x);
    if (water && p.y >= water.y + 19 && p.vy >= 0) {
      p.y = water.y + 19;
      p.vy = 0;
      p.grounded = true;
      p.swimming = true;
      p.diving = !!input.down;
      p.prone = false;
      if (!wasSwimming) {
        impact(s, p.x, water.y, 'splash');
        s.events.push('splash');
      }
    } else if (!water || p.grounded) {
      p.swimming = false;
      p.diving = false;
    }
    if (p.y > s.cameraY + CONTRA_H + 35) hurtContraPlayer(s, p, true);
    if (base && input.up) enterContraBaseDoor(s);
    if (input.fire) firePlayer(s, p);
  }
  for (const t of s.platforms)
    if (t.collapse !== undefined && t.collapse > 0) {
      t.collapse = Math.max(0, t.collapse - dt);
      if (t.collapse === 0) {
        impact(s, t.x + t.w / 2, t.y, 'explosion');
        s.events.push('bridge');
      }
    }
  for (const effect of s.impacts) effect.age += dt;
  s.impacts = s.impacts.filter((effect) => effect.age < (effect.kind === 'spark' ? 0.16 : 0.5));
  const alive = s.players.filter((p) => p.lives > 0 && p.dead <= 0);
  if (alive.length && !base) {
    if (vertical)
      s.cameraY = Math.max(0, Math.min(s.cameraY, Math.min(...alive.map((p) => p.y)) - 102));
    else
      s.cameraX = Math.min(
        CONTRA_STAGES[s.stage - 1].length - CONTRA_W,
        Math.max(s.cameraX, Math.max(...alive.map((p) => p.x)) - 150),
      );
  }
  if (base) {
    if (!s.boss.active && s.roomCores.every((c) => c.hp <= 0)) {
      s.door = Math.min(1, s.door + dt * 2.5);
      // No residual shot may hit the player after the room is cleared.
      s.bullets = s.bullets.filter((b) => b.owner >= 0);
    }
    if (s.advancing) {
      s.advancing += dt;
      if (s.advancing >= 0.85) {
        s.advancing = 0;
        s.room++;
        s.bullets = [];
        s.impacts = [];
        for (const p of s.players) {
          p.x = s.count === 1 ? 192 : 168 + p.id * 48;
          p.y = 204;
          p.vy = 0;
          p.prone = false;
          p.grounded = true;
          p.jumpHeld = false;
        }
        if (s.room > s.rooms) {
          s.boss.active = true;
          s.roomCores = [];
          s.door = 1;
        } else roomTargets(s);
      }
    }
    if (
      contraBasePhase(s) === 'combat' &&
      Math.floor(s.time * 1.5) !== Math.floor((s.time - dt) * 1.5)
    ) {
      aimed(s, Math.floor(s.time * 1.5) % 2 ? 94 : 290, 83, 88);
    }
  }
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    const visible =
      e.x >= s.cameraX - 40 &&
      e.x <= s.cameraX + CONTRA_W + 30 &&
      e.y >= s.cameraY - 30 &&
      e.y <= s.cameraY + CONTRA_H + 20;
    if (!visible && !e.active) continue;
    e.active = true;
    if (!visible) continue;
    if (e.kind === 'carrier') {
      e.y += Math.sin(s.time * 3 + e.id) * dt * 24;
      e.x += Math.cos(s.time + e.id) * dt * 12;
      continue;
    }
    const target = alive[0];
    if (target && (e.kind === 'soldier' || e.kind === 'alien')) {
      e.x += Math.sign(target.x - e.x) * dt * (e.kind === 'alien' ? 49 : 36);
      const prev = e.y;
      e.vy += 640 * dt;
      e.y += e.vy * dt;
      for (const t of s.platforms)
        if (
          t.collapse !== 0 &&
          e.x > t.x &&
          e.x < t.x + t.w &&
          prev <= t.y + 1 &&
          e.y >= t.y &&
          e.vy >= 0
        ) {
          e.y = t.y;
          e.vy = 0;
          break;
        }
      if (
        e.kind === 'alien' &&
        e.vy === 0 &&
        Math.floor(s.time * 0.7 + e.id) !== Math.floor((s.time - dt) * 0.7 + e.id)
      )
        e.vy = -180;
      if (e.y > s.cameraY + CONTRA_H + 40) e.hp = 0;
    }
    if (e.mount === 'wall' && target)
      e.angle = Math.atan2(target.y - 17 - (e.y - 3), target.x - e.x);
    e.cooldown -= dt;
    if (e.cooldown <= 0 && e.kind !== 'alien') {
      const angle = e.angle ?? Math.PI;
      aimed(
        s,
        e.x + (e.mount === 'wall' ? Math.cos(angle) * 16 : 0),
        e.mount === 'wall' ? e.y - 3 + Math.sin(angle) * 16 : e.y - (e.kind === 'tank' ? 23 : 17),
        e.kind === 'tank' ? 130 : 97,
      );
      e.cooldown = e.kind === 'turret' ? 1.3 : e.kind === 'tank' ? 1.8 : 2.4;
    }
    for (const p of alive)
      if (e.mount !== 'wall' && inside(e.x, e.y - 12, playerBody(p), e.kind === 'tank' ? 20 : 7))
        hurtContraPlayer(s, p);
  }
  const boss = s.boss;
  if (!base && (vertical ? s.cameraY < 80 : s.cameraX + CONTRA_W > boss.x - 90)) boss.active = true;
  if (boss.active && contraBossHP(s) > 0) {
    boss.timer += dt;
    boss.cooldown -= dt;
    const oldY = boss.y;
    if (s.stage === 3 || s.stage === 5) boss.y = boss.originY + Math.sin(boss.timer * 1.3) * 12;
    if (s.stage === 6) boss.y = boss.originY - Math.max(0, Math.sin(boss.timer * 1.5)) * 46;
    for (const core of boss.cores) core.y += boss.y - oldY;
    if (boss.cooldown <= 0) {
      const living = boss.cores.filter((c) => c.hp > 0);
      for (const c of living) {
        aimed(s, c.x, c.y, 95 + s.stage * 5);
        if (s.stage >= 4) {
          aimed(s, c.x, c.y, 105, -0.2);
          aimed(s, c.x, c.y, 105, 0.2);
        }
      }
      boss.cooldown = s.stage === 8 ? 0.75 : 1.45;
    }
    for (const p of alive)
      if (!base && inside(p.x, p.y - 12, { x: boss.x - 42, y: boss.y - 44, w: 84, h: 92 }))
        hurtContraPlayer(s, p);
  }
  for (const h of s.hazards)
    if (hazardActive(s, h))
      for (const p of alive) {
        const b = playerBody(p);
        if (b.x < h.x + h.w && b.x + b.w > h.x && b.y < h.y + h.h && b.y + b.h > h.y)
          hurtContraPlayer(s, p);
      }
  for (const b of s.bullets) {
    b.life -= dt;
    if (b.depth) {
      b.depth.progress = Math.min(1, b.depth.progress + dt * b.depth.rate);
      const progress = b.depth.progress;
      b.x = b.depth.fromX + (b.depth.toX - b.depth.fromX) * progress;
      b.y = b.depth.fromY + (187 - b.depth.fromY) * progress;
    } else {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    if (b.weapon === 'F') {
      // A travelling center with a bounded circular orbit, not integrated sinusoidal drift.
      const now = (s.time - b.phase) * 18,
        before = now - dt * 18;
      b.x += (Math.cos(now) - Math.cos(before)) * 6;
      b.y += (Math.sin(now) - Math.sin(before)) * 6;
    }
    if (b.owner < 0) {
      for (const p of alive)
        if (
          !p.diving &&
          !(base && p.prone && p.grounded) &&
          (!b.depth || b.depth.progress >= 0.96) &&
          inside(b.x, b.y, playerBody(p), 2)
        ) {
          if (p.invincible <= 0 && p.shield <= 0) {
            hurtContraPlayer(s, p);
            b.life = 0;
          }
        }
    } else {
      const p = s.players[b.owner];
      for (const e of s.enemies) {
        if (e.hp <= 0 || !e.active || b.life <= 0) continue;
        if (bulletHits(b, enemyBody(e))) {
          e.hp -= b.damage;
          b.life = 0;
          impact(s, b.x, b.y, 'spark');
          s.events.push(e.hp <= 0 ? 'kill' : 'hit');
          if (e.hp <= 0) {
            impact(s, e.x, e.y - 12, 'explosion');
            addContraScore(s, p, e.kind === 'tank' ? 500 : e.kind === 'turret' ? 300 : 100);
            if (e.power) s.pickups.push({ x: e.x, y: e.y, vy: -90, power: e.power, life: 18 });
          }
        }
      }
      const targets = boss.active ? boss.cores : base ? s.roomCores : [];
      for (const c of targets)
        if (c.hp > 0 && b.life > 0 && bulletHits(b, { x: c.x - 9, y: c.y - 10, w: 18, h: 20 })) {
          c.hp = Math.max(0, c.hp - b.damage);
          b.life = 0;
          impact(s, b.x, b.y, c.hp === 0 ? 'explosion' : 'spark');
          s.events.push(c.hp === 0 ? 'explosion' : s.stage === 8 ? 'heart' : 'hit');
          if (c.hp === 0) addContraScore(s, p, 1000);
        }
    }
    if (b.depth && b.depth.progress >= 1) b.life = 0;
    if (base && !boss.active && b.owner >= 0 && b.life > 0 && b.y < 69) {
      b.life = 0;
      impact(s, b.x, 79, 'spark');
      s.events.push('armor');
    }
    if (
      b.x < s.cameraX - 25 ||
      b.x > s.cameraX + CONTRA_W + 25 ||
      b.y < s.cameraY - 30 ||
      b.y > s.cameraY + CONTRA_H + 30
    )
      b.life = 0;
  }
  s.bullets = s.bullets.filter((b) => b.life > 0);
  for (const item of s.pickups) {
    item.life -= dt;
    const prev = item.y;
    item.vy += 380 * dt;
    item.y += item.vy * dt;
    for (const t of s.platforms)
      if (
        t.collapse !== 0 &&
        item.x >= t.x &&
        item.x <= t.x + t.w &&
        item.vy >= 0 &&
        prev <= t.y - 8 &&
        item.y >= t.y - 8
      ) {
        item.y = t.y - 8;
        item.vy = 0;
        break;
      }
    for (const p of alive)
      if (item.life > 0 && inside(item.x, item.y, playerBody(p), 10)) {
        collectContraPower(s, p, item.power);
        item.life = 0;
      }
  }
  s.pickups = s.pickups.filter((p) => p.life > 0);
  if (s.status === 'playing' && boss.active && contraBossHP(s) <= 0) {
    for (const p of s.players) if (p.lives > 0) addContraScore(s, p, 5000);
    s.status = s.stage === 8 ? 'win' : 'clear';
    s.events.push('clear');
    s.bullets = [];
  }
}
export function advanceContra(s: ContraState, seconds: number, inputs: ContraInput[] = []) {
  if (s.status !== 'playing') return;
  s.accumulator += Math.max(0, Math.min(0.1, seconds));
  while (s.accumulator >= 1 / 120 && s.status === 'playing') {
    step(s, 1 / 120, inputs);
    s.accumulator -= 1 / 120;
  }
}
