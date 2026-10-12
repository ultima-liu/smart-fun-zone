import { describe, expect, it } from 'vitest';
import {
  addContraScore,
  advanceContra,
  collectContraPower,
  contraBossHP,
  contraBasePhase,
  enterContraBaseDoor,
  createContraState,
  hurtContraPlayer,
  nextContraStage,
  type ContraInput,
} from '../games/contraEngine';

function run(s: ReturnType<typeof createContraState>, seconds: number, input: ContraInput[] = []) {
  for (let i = 0; i < Math.round(seconds * 60); i++) advanceContra(s, 1 / 60, input);
}
describe('Contra campaign and combat', () => {
  it('uses independent co-op lives and weapons, and deterministic time steps', () => {
    const a = createContraState(2),
      b = createContraState(2);
    run(a, 1, [{ right: true, fire: true }, { left: true }]);
    for (let i = 0; i < 120; i++)
      advanceContra(b, 1 / 120, [{ right: true, fire: true }, { left: true }]);
    expect(a.players[0].x).toBeCloseTo(b.players[0].x);
    expect(a.players[0].x).toBeGreaterThan(a.players[1].x);
    collectContraPower(a, a.players[0], 'S');
    expect(a.players[1].weapon).toBe('N');
    a.players[0].invincible = 0;
    hurtContraPlayer(a, a.players[0]);
    expect(a.players.map((p) => p.lives)).toEqual([2, 3]);
    expect(a.players[0].weapon).toBe('N');
  });
  it('jumps once per press, lands, aims diagonally, and goes prone', () => {
    const s = createContraState();
    run(s, 0.25, [{ jump: true, up: true, right: true, fire: true }]);
    expect(s.players[0].y).toBeLessThan(160);
    expect(s.players[0].grounded).toBe(false);
    expect(s.bullets.some((b) => b.owner === 0 && b.vx > 0 && b.vy < 0)).toBe(true);
    run(s, 1, [{ jump: true }]);
    expect(s.players[0].grounded).toBe(true);
    run(s, 0.05, [{ down: true }]);
    expect(s.players[0].prone).toBe(true);
    const x = s.players[0].x;
    run(s, 0.1, [{ down: true }]);
    expect(s.players[0].x).toBe(x);
  });
  it('requires hitting a supply carrier before its upgrade is collectible', () => {
    const s = createContraState(),
      p = s.players[0];
    const pod = s.enemies.find((e) => e.kind === 'carrier')!;
    pod.active = true;
    pod.x = p.x + 18;
    pod.y = p.y - 17;
    expect(s.pickups).toHaveLength(0);
    run(s, 0.05, [{ fire: true }]);
    expect(pod.hp).toBeLessThanOrEqual(0);
    run(s, 0.15, [{ right: true }]);
    expect(p.weapon).toBe('M');
    expect(p.score).toBeGreaterThanOrEqual(1100);
  });
  it('produces five spread trajectories, faster rapid bullets, and a laser replaces its beam', () => {
    const s = createContraState(),
      p = s.players[0];
    collectContraPower(s, p, 'S');
    run(s, 1 / 60, [{ fire: true }]);
    const spread = s.bullets.filter((b) => b.owner === 0);
    expect(spread).toHaveLength(5);
    expect(new Set(spread.map((b) => b.vy)).size).toBe(5);
    s.bullets = [];
    p.cooldown = 0;
    collectContraPower(s, p, 'R');
    run(s, 1 / 60, [{ fire: true }]);
    expect(s.bullets.find((b) => b.owner === 0)!.vx).toBeGreaterThan(spread[0].vx);
    s.bullets = [];
    p.cooldown = 0;
    collectContraPower(s, p, 'L');
    run(s, 0.5, [{ fire: true }]);
    expect(s.bullets.filter((b) => b.owner === 0)).toHaveLength(1);
  });
  it('shield blocks real shots; a missed shot never causes damage; death respawns with protection', () => {
    const s = createContraState(),
      p = s.players[0];
    p.invincible = 0;
    const bullet = (x: number) => ({
      x,
      y: p.y - 15,
      vx: 0,
      vy: 0,
      owner: -1,
      damage: 1,
      life: 1,
      weapon: 'N' as const,
      phase: 0,
    });
    s.bullets.push(bullet(p.x + 30));
    run(s, 0.02);
    expect(p.lives).toBe(3);
    collectContraPower(s, p, 'B');
    s.bullets.push(bullet(p.x));
    run(s, 0.02);
    expect(p.lives).toBe(3);
    p.shield = 0;
    run(s, 0.02);
    expect(p.lives).toBe(2);
    run(s, 1);
    expect(p.dead).toBeLessThanOrEqual(0);
    expect(p.invincible).toBeGreaterThan(0);
  });
  it('screen wipe removes visible enemies and hostile bullets without damaging a boss', () => {
    const s = createContraState();
    s.enemies[0].active = true;
    const bossHP = contraBossHP(s);
    collectContraPower(s, s.players[0], '★');
    expect(s.enemies[0].hp).toBe(0);
    expect(contraBossHP(s)).toBe(bossHP);
    expect(s.enemies[1].hp).toBeGreaterThan(0);
  });
  it('awards the 20,000, 50,000 and subsequent 50,000 life thresholds once', () => {
    const s = createContraState(),
      p = s.players[0];
    addContraScore(s, p, 100000);
    expect(p.lives).toBe(6);
    addContraScore(s, p, 1);
    expect(p.lives).toBe(6);
  });
  it('base rooms require destroying every target before forward progression, retaining lives and guns', () => {
    const s = createContraState(1, 4);
    run(s, 1.5, [{ up: true }]);
    expect(s.room).toBe(1);
    for (const core of s.roomCores) core.hp = 0;
    collectContraPower(s, s.players[0], 'S');
    run(s, 1.5, [{ up: true }]);
    expect(s.room).toBe(2);
    expect(s.roomCores).toHaveLength(2);
    expect(s.players[0].weapon).toBe('S');
    expect(s.roomCores.every((c) => c.hp > 0)).toBe(true);
  });
  it('the final base room transitions into the boss battle', () => {
    const s = createContraState(1, 2);
    s.room = s.rooms;
    for (const c of s.roomCores) c.hp = 0;
    run(s, 1.5, [{ up: true }]);
    expect(s.boss.active).toBe(true);
    expect(s.roomCores).toHaveLength(0);
  });
  it('vertical ledges can be climbed using actual jump physics, with a forward-only camera', () => {
    const s = createContraState(1, 3),
      p = s.players[0];
    p.invincible = 100;
    const initialY = s.cameraY;
    run(s, 0.1, [{ right: true }]);
    run(s, 0.4, [{ jump: true }]);
    run(s, 0.45);
    run(s, 0.8, [{ right: true }]);
    run(s, 0.25, [{ jump: true, right: true }]);
    run(s, 0.6);
    expect(p.y).toBeLessThan(1768);
    expect(s.cameraY).toBeLessThan(initialY);
    const camera = s.cameraY;
    run(s, 0.1, [{ down: true, jump: true }]);
    run(s, 0.3);
    expect(s.cameraY).toBeLessThanOrEqual(camera);
  });
  it.each([1, 2, 3, 4, 5, 6, 7, 8])(
    'stage %i needs every boss weak point destroyed and only finishes after actual projectile hits',
    (stage) => {
      const s = createContraState(1, stage);
      s.boss.active = true;
      // Isolate the boss from the route. Shots still go through real collision handling.
      s.enemies = [];
      s.players[0].invincible = 100;
      s.bullets.push({
        x: s.boss.x,
        y: s.boss.y - 80,
        vx: 0,
        vy: 0,
        owner: 0,
        damage: 999,
        life: 1,
        weapon: 'L',
        phase: 0,
      });
      const hp = contraBossHP(s);
      run(s, 1 / 60);
      expect(contraBossHP(s)).toBe(hp);
      for (const core of s.boss.cores) {
        // Move the camera to the combat screen; no offscreen damage is accepted.
        s.cameraX = stage === 2 || stage === 3 || stage === 4 ? 0 : Math.max(0, s.boss.x - 250);
        s.cameraY = 0;
        s.bullets.push({
          x: core.x,
          y: core.y,
          vx: 0,
          vy: 0,
          owner: 0,
          damage: core.hp,
          life: 1,
          weapon: 'L',
          phase: 0,
        });
        run(s, 1 / 60);
      }
      expect(s.status).toBe(stage === 8 ? 'win' : 'clear');
      const elapsed = s.elapsed;
      run(s, 2);
      expect(s.elapsed).toBe(elapsed);
      if (stage < 8) {
        s.players[0].weapon = 'S';
        nextContraStage(s);
        expect(s.stage).toBe(stage + 1);
        expect(s.players[0].weapon).toBe('S');
        expect(s.status).toBe('playing');
      }
    },
  );
  it('one co-op player can keep playing after the partner runs out of lives', () => {
    const s = createContraState(2);
    s.players[0].lives = 1;
    s.players[0].invincible = 0;
    hurtContraPlayer(s, s.players[0]);
    expect(s.status).toBe('playing');
    s.players[1].lives = 1;
    s.players[1].invincible = 0;
    hurtContraPlayer(s, s.players[1]);
    expect(s.status).toBe('over');
    const elapsed = s.elapsed;
    run(s, 2);
    expect(s.elapsed).toBe(elapsed);
  });
});

describe('Contra jungle corrections', () => {
  it('river collision is bounded; dry pits cannot become water', () => {
    const s = createContraState(),
      p = s.players[0];
    s.enemies = [];
    s.cameraX = 430;
    p.x = 580;
    p.y = 200;
    p.grounded = false;
    run(s, 0.3);
    expect(p.swimming).toBe(true);
    expect(p.y).toBe(214);
    expect(s.events).toContain('splash');
    s.cameraX = 1650;
    p.x = 1800;
    p.y = 245;
    p.swimming = false;
    p.grounded = false;
    run(s, 0.03);
    expect(p.swimming).toBe(false);
    expect(p.y).toBeGreaterThan(245);
  });
  it('down dives, stops movement and firing, avoids enemies, and releasing exposes the player', () => {
    const s = createContraState(),
      p = s.players[0];
    s.enemies = [];
    s.cameraX = 430;
    p.x = 580;
    p.y = 214;
    p.swimming = true;
    p.invincible = 0;
    const shot = () => ({
      x: p.x,
      y: p.y - 23,
      vx: 0,
      vy: 0,
      owner: -1,
      damage: 1,
      life: 1,
      weapon: 'N' as const,
      phase: 0,
    });
    s.bullets.push(shot());
    run(s, 0.1, [{ down: true, right: true, fire: true, jump: true }]);
    expect(p.diving).toBe(true);
    expect(p.prone).toBe(false);
    expect(p.x).toBe(580);
    expect(p.y).toBe(214);
    expect(p.lives).toBe(3);
    expect(s.bullets.filter((b) => b.owner === 0)).toHaveLength(0);
    run(s, 0.03);
    expect(p.diving).toBe(false);
    expect(p.lives).toBe(2);
  });
  it('a swimmer must jump to clear a higher bank; walking alone cannot climb it', () => {
    const s = createContraState(),
      p = s.players[0];
    s.enemies = [];
    s.cameraX = 850;
    p.x = 1000;
    p.y = 214;
    p.swimming = true;
    run(s, 0.02, [{ fire: true }]);
    expect(s.bullets.find((b) => b.owner === 0)!.y).toBeLessThan(s.waters[0].y);
    run(s, 1, [{ right: true }]);
    expect(p.swimming).toBe(true);
    expect(p.y).toBe(214);
    expect(p.x).toBe(1019);
    const riverY = p.y;
    run(s, 0.2, [{ jump: true, right: true }]);
    expect(p.y).toBeLessThan(riverY);
    expect(p.swimming).toBe(false);
    expect(p.grounded).toBe(false);
    run(s, 0.6, [{ right: true }]);
    expect(p.x).toBeGreaterThan(1024);
    expect(p.y).toBe(160);
    expect(p.grounded).toBe(true);
  });
  it('a high cliff blocks a water jump until the body actually clears its top', () => {
    const s = createContraState(),
      p = s.players[0];
    s.enemies = [];
    s.cameraX = 850;
    p.x = 1019;
    p.y = 214;
    p.swimming = true;
    const bank = s.platforms.find((t) => t.x === 1024 && t.material === 'ground')!;
    bank.y = 90;
    for (const bridge of s.platforms.filter((t) => t.bridge)) bridge.collapse = 0;
    run(s, 1.1, [{ right: true, jump: true }]);
    expect(p.x).toBeLessThan(1024);
    expect(p.swimming).toBe(true);
    run(s, 0.3, [{ right: true, jump: true }]);
    expect(p.x).toBeLessThan(1024);
    expect(p.y).toBe(214);
  });
  it('solid ground does not allow drop-through; individual bridge spans collapse over a river', () => {
    const s = createContraState(),
      p = s.players[0];
    s.enemies = [];
    const ground = p.y;
    run(s, 0.05, [{ down: true, jump: true }]);
    expect(p.y).toBeLessThan(ground);
    expect(p.drop).toBe(0);
    s.cameraX = 390;
    p.x = 540;
    p.y = 170;
    p.vy = 0;
    p.grounded = true;
    p.jumpHeld = false;
    run(s, 0.9);
    expect(s.platforms.find((t) => t.bridge && t.x === 512)!.collapse).toBe(0);
    expect(s.platforms.find((t) => t.bridge && t.x === 576)!.collapse).toBeUndefined();
    expect(s.events).toContain('bridge');
    run(s, 0.5);
    expect(p.swimming).toBe(true);
  });
  it('jungle cannons are fixed to rock faces, never tanks or unsupported platforms', () => {
    const s = createContraState();
    expect(s.enemies.some((e) => e.kind === 'tank')).toBe(false);
    const cannons = s.enemies.filter((e) => e.kind === 'turret');
    expect(cannons.length).toBeGreaterThan(0);
    for (const e of cannons) {
      expect(e.mount).toBe('wall');
      expect(
        s.platforms.some(
          (t) => t.material === 'ground' && t.x <= e.x && e.x < t.x + t.w && t.y === e.y,
        ),
      ).toBe(true);
    }
    const cannon = cannons.find((e) => e.id === 80)!;
    s.cameraX = 280;
    s.players[0].x = 360;
    s.players[0].invincible = 100;
    run(s, 0.05);
    expect(cannon.angle).toBeLessThan(0);
    expect(cannon.x).toBe(cannon.origin);
  });
  it('hits and kills have separate sound events and impacts at their actual collision position', () => {
    const s = createContraState();
    s.enemies = s.enemies.filter((e) => e.id === 80);
    const e = s.enemies[0];
    s.cameraX = 280;
    s.players[0].x = 360;
    s.players[0].invincible = 100;
    e.active = true;
    const shot = () => ({
      x: e.x,
      y: e.y - 8,
      vx: 0,
      vy: 0,
      owner: 0,
      damage: 1,
      life: 1,
      weapon: 'N' as const,
      phase: 0,
    });
    s.bullets.push(shot());
    run(s, 0.02);
    expect(e.hp).toBe(4);
    expect(s.events).toContain('hit');
    expect(s.impacts.some((i) => i.kind === 'spark' && i.x === e.x)).toBe(true);
    e.hp = 1;
    s.events = [];
    s.bullets.push(shot());
    run(s, 0.02);
    expect(s.events).toContain('kill');
    expect(s.impacts.some((i) => i.kind === 'explosion')).toBe(true);
  });
  it('fireballs orbit a travelling center with bounded radius and eight-way muzzle alignment', () => {
    const s = createContraState(),
      p = s.players[0];
    s.enemies = [];
    p.weapon = 'F';
    run(s, 1 / 60, [{ up: true, right: true, fire: true }]);
    const b = s.bullets.find((b) => b.owner === 0)!;
    const x = b.x,
      y = b.y,
      t = s.time;
    run(s, 0.3);
    expect(Math.abs(b.x - x - b.vx * (s.time - t))).toBeLessThanOrEqual(12.1);
    expect(Math.abs(b.y - y - b.vy * (s.time - t))).toBeLessThanOrEqual(12.1);
    const second = createContraState();
    second.enemies = [];
    run(second, 1 / 120, [{ up: true, fire: true }]);
    expect(second.bullets[0].x).toBeCloseTo(second.players[0].x);
    expect(second.bullets[0].y).toBeLessThan(second.players[0].y - 30);
  });
});

it('the visible laser tail can hit a cannon even after its leading edge has passed', () => {
  const s = createContraState();
  s.enemies = s.enemies.filter((e) => e.id === 80);
  const e = s.enemies[0];
  s.cameraX = 280;
  s.players[0].x = 360;
  s.players[0].invincible = 100;
  e.active = true;
  s.bullets.push({
    x: e.x + 23,
    y: e.y - 8,
    vx: 260,
    vy: 0,
    owner: 0,
    damage: 1,
    life: 1,
    weapon: 'L',
    phase: 0,
  });
  run(s, 1 / 120);
  expect(e.hp).toBe(4);
  expect(s.events).toContain('hit');
});

it.each([
  ['first-left', 0, -1],
  ['first-right', 0, 1],
  ['middle-left', 1, -1],
  ['middle-right', 1, 1],
  ['last-left', 2, -1],
  ['last-right', 2, 1],
] as const)(
  'every jungle river exit remains reachable with a real jump: %s',
  (_name, index, dir) => {
    const s = createContraState(),
      p = s.players[0],
      water = s.waters[index];
    s.enemies = [];
    for (const t of s.platforms) if (t.bridge) t.collapse = 0;
    const edge = dir < 0 ? water.x : water.x + water.w;
    p.x = edge - dir * 5;
    p.y = water.y + 19;
    p.swimming = true;
    s.cameraX = p.x - 150;
    const input = dir < 0 ? { left: true } : { right: true };
    run(s, 0.25, [input]);
    expect(p.swimming).toBe(true);
    expect(p.y).toBe(water.y + 19);
    run(s, 0.9, [{ ...input, jump: true }]);
    expect(p.swimming).toBe(false);
    expect(p.grounded).toBe(true);
    expect((p.x - edge) * dir).toBeGreaterThan(0);
  },
);

describe('Contra indoor depth combat and doors', () => {
  it('real incoming fire reaches standing players but never a grounded prone player', () => {
    const standing = createContraState(1, 2),
      prone = createContraState(1, 2);
    standing.players[0].invincible = 0;
    prone.players[0].invincible = 0;
    run(standing, 5);
    expect(standing.players[0].lives).toBeLessThan(3);
    run(prone, 30, [{ down: true }]);
    expect(prone.players[0].lives).toBe(3);
    expect(prone.players[0].invincible).toBe(0);
    expect(prone.players[0].prone).toBe(true);
    expect(prone.bullets.some((b) => b.depth)).toBe(true);
    expect(prone.bullets.filter((b) => b.owner < 0).length).toBeLessThan(4);
  });
  it('the indoor prone collision exemption is explicit and does not grant outdoor immunity', () => {
    for (const stage of [1, 2, 4]) {
      const s = createContraState(1, stage),
        p = s.players[0];
      p.invincible = 0;
      run(s, 1 / 60, [{ down: true }]);
      s.bullets.push({
        x: p.x,
        y: p.y - 5,
        vx: 0,
        vy: 0,
        owner: -1,
        damage: 1,
        life: 1,
        weapon: 'N',
        phase: 0,
      });
      run(s, 1 / 60, [{ down: true }]);
      expect(p.lives).toBe(stage === 1 ? 2 : 3);
    }
  });
  it('a depth bullet can only hit when arriving in the foreground and expires after it passes', () => {
    const s = createContraState(1, 2),
      p = s.players[0];
    p.invincible = 0;
    s.bullets.push({
      x: p.x,
      y: 187,
      vx: 0,
      vy: 0,
      owner: -1,
      damage: 1,
      life: 3,
      weapon: 'N',
      phase: 0,
      depth: { fromX: p.x, fromY: 187, toX: p.x, progress: 0.8, rate: 1 },
    });
    run(s, 0.1);
    expect(p.lives).toBe(3);
    run(s, 0.1);
    expect(p.lives).toBe(2);
    expect(s.bullets.filter((b) => b.depth)).toHaveLength(0);
  });
  it('actual shots break the core, clear incoming fire and open the door without an up press', () => {
    const s = createContraState(1, 2);
    expect(enterContraBaseDoor(s)).toBe(false);
    run(s, 3, [{ down: true, fire: true }]);
    expect(s.roomCores[0].hp).toBe(0);
    expect(s.players[0].score).toBe(1000);
    expect(s.players[0].lives).toBe(3);
    expect(contraBasePhase(s)).toBe('open');
    expect(s.room).toBe(1);
    expect(s.door).toBe(1);
    expect(s.bullets.some((b) => b.owner < 0)).toBe(false);
    const weapon = s.players[0].weapon;
    expect(enterContraBaseDoor(s)).toBe(true);
    expect(enterContraBaseDoor(s)).toBe(false);
    run(s, 0.9);
    expect(s.room).toBe(2);
    expect(s.roomCores[0].hp).toBe(14);
    expect(s.door).toBe(0);
    expect(s.players[0].x).toBe(192);
    expect(s.players[0].weapon).toBe(weapon);
    expect(contraBasePhase(s)).toBe('combat');
  });
  it('missed shots leave the door locked, and opening has a distinct unenterable phase', () => {
    const s = createContraState(1, 2);
    run(s, 0.4, [{ right: true }]);
    run(s, 2, [{ down: true, fire: true, up: true }]);
    expect(s.roomCores[0].hp).toBe(12);
    expect(s.room).toBe(1);
    expect(s.door).toBe(0);
    expect(enterContraBaseDoor(s)).toBe(false);
    s.players[0].x = 192;
    for (let i = 0; i < 300 && s.roomCores[0].hp > 0; i++)
      advanceContra(s, 1 / 60, [{ down: true, fire: true }]);
    expect(contraBasePhase(s)).toBe('opening');
    expect(enterContraBaseDoor(s)).toBe(false);
    run(s, 0.5);
    expect(contraBasePhase(s)).toBe('open');
  });
  it('all six rooms are playable using real prone shots and door-entry commands', () => {
    const s = createContraState(1, 2);
    for (let room = 1; room <= 6; room++) {
      expect(s.room).toBe(room);
      expect(s.roomCores[0].hp).toBe(10 + room * 2);
      for (let i = 0; i < 600 && contraBasePhase(s) !== 'open'; i++)
        advanceContra(s, 1 / 60, [{ down: true, fire: true }]);
      expect(contraBasePhase(s)).toBe('open');
      expect(s.players[0].lives).toBe(3);
      expect(enterContraBaseDoor(s)).toBe(true);
      run(s, 0.86);
    }
    expect(s.boss.active).toBe(true);
    expect(s.room).toBe(7);
    expect(s.roomCores).toHaveLength(0);
    expect(s.players[0].score).toBe(6000);
    expect(s.status).toBe('playing');
    expect(enterContraBaseDoor(s)).toBe(false);
  });
  it('Base II keeps its door closed until both targets have actually been shot', () => {
    const s = createContraState(1, 4);
    for (const target of s.roomCores) {
      s.players[0].x = target.x;
      run(s, 3, [{ down: true, fire: true }]);
      expect(target.hp).toBe(0);
      if (s.roomCores.some((c) => c.hp > 0)) {
        expect(s.door).toBe(0);
        expect(enterContraBaseDoor(s)).toBe(false);
      }
    }
    run(s, 0.5, [{ down: true }]);
    expect(contraBasePhase(s)).toBe('open');
    expect(s.players[0].lives).toBe(3);
  });
});
