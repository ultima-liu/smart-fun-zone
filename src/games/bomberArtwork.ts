import { drawBomberSprite, bomberSpriteRevision, type BomberSprite } from './bomberSprites';
import { BOMBER_COLS, BOMBER_ROWS, BOMBER_FUSE, BOMBER_LEVELS, BOMBER_BONUS_LIMIT, BOMBER_CLOCK_TICK, BOMBER_ENEMIES, BOMBER_POWERS, bomberXY, bomberActorPosition, type BomberEnemyKind, type BomberState } from './bomberEngine';

export const BOMBER_CELL = 60;
export const BOMBER_VIEW_COLS = 23;
export const BOMBER_WIDTH = BOMBER_VIEW_COLS * BOMBER_CELL;
export const BOMBER_HEIGHT = BOMBER_ROWS * BOMBER_CELL;
const rounded = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) => {
  c.fillStyle = fill; c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); c.fill();
};
const ellipse = (c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient) => { c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); };
export function drawBomberHero(c: CanvasRenderingContext2D, x: number, y: number, time = 0, shield = false, direction = 'down', walking = false) {
  c.save(); c.translate(x, y);
  ellipse(c, 0, 21, 19, 6, '#203c5550');
  if (shield) { c.strokeStyle = '#9beeff'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, -1, 27, 0, Math.PI * 2); c.stroke(); }
  const facing = ['up','left','right'].includes(direction) ? direction : 'down';
  const pose = walking && Math.floor(time / 90) % 2 ? 'walk' : 'idle';
  if (drawBomberSprite(c, `hero-${facing}-${pose}` as BomberSprite, 0, -7, 66)) { c.restore(); return; }
  const step = Math.sin(time / 65) * 2;
  rounded(c, -15, 13 + step, 13, 9, 4, '#cf5f98'); rounded(c, 3, 13 - step, 13, 9, 4, '#cf5f98');
  rounded(c, -12, -1, 24, 20, 7, '#67bfb9'); rounded(c, -12, 11, 24, 5, 2, '#397578');
  rounded(c, -19, 3, 9, 10, 4, '#f5e5c8'); rounded(c, 11, 3, 9, 10, 4, '#f5e5c8');
  rounded(c, -21, -28, 42, 33, 12, '#d8dfdc'); rounded(c, -20, -30, 40, 31, 12, '#fff9e7');
  rounded(c, -23, -20, 7, 16, 3, '#e78db8'); rounded(c, 16, -20, 7, 16, 3, '#e78db8');
  rounded(c, -15, -19, 30, 16, 7, '#29486b'); rounded(c, -13, -17, 26, 5, 2, '#4c6c8a');
  const look = direction === 'left' ? -3 : direction === 'right' ? 3 : 0;
  rounded(c, -8 + look, -14, 4, 8, 2, '#fff4cf'); rounded(c, 4 + look, -14, 4, 8, 2, '#fff4cf');
  rounded(c, -2, -36, 4, 8, 2, '#cd779f'); ellipse(c, 0, -37, 6, 5, '#f2a5c3'); ellipse(c, -2, -39, 2, 1.5, '#ffefec');
  c.restore();
}
function drawEnemy(c: CanvasRenderingContext2D, x: number, y: number, time: number, kind: BomberEnemyKind, id: number) {
  c.save(); c.translate(x, y);
  ellipse(c, 0, 19, 20, 5, '#23415040');
  const bob = Math.sin(time / 170 + id) * 2;
  if (drawBomberSprite(c, kind, 0, bob - 3, 50)) { c.restore(); return; }
  const spec = BOMBER_ENEMIES[kind], chaser = spec.chase;
  if (spec.wallPass) c.globalAlpha = .82;
  rounded(c, -19, -14 + bob, 38, 33, 16, spec.color);
  rounded(c, -17, -16 + bob, 34, 23, 12, spec.color);
  ellipse(c, -10, -12 + bob, 5, 9, spec.color); ellipse(c, 10, -12 + bob, 5, 9, spec.color);
  ellipse(c, -7, -1 + bob, 6, 7, '#fff7df'); ellipse(c, 7, -1 + bob, 6, 7, '#fff7df');
  ellipse(c, -6, bob, 2.5, 4, '#344352'); ellipse(c, 6, bob, 2.5, 4, '#344352');
  rounded(c, -5, 9 + bob, 10, 3, 1, '#685577');
  if (kind === 'balloon') { c.strokeStyle = '#987455'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 19 + bob); c.quadraticCurveTo(-5, 23, 1, 26); c.stroke(); }
  if (chaser) { c.strokeStyle = '#5b4965'; c.lineWidth = 2; c.beginPath(); c.moveTo(-12, -10 + bob); c.lineTo(-3, -7 + bob); c.moveTo(3, -7 + bob); c.lineTo(12, -10 + bob); c.stroke(); }
  if (kind === 'tiger') { c.fillStyle = '#8d694b'; c.fillRect(-13, -10 + bob, 4, 8); c.fillRect(9, -10 + bob, 4, 8); }
  if (kind === 'spinner') { c.strokeStyle = '#fff8d6'; c.lineWidth = 2; c.beginPath(); c.arc(0, -25 + bob, 9, time / 100, time / 100 + 4); c.stroke(); }
  ellipse(c, -15, 7 + bob, 3, 2, '#e99ea8'); ellipse(c, 15, 7 + bob, 3, 2, '#e99ea8');
  c.restore();
}
function drawBomb(c: CanvasRenderingContext2D, x: number, y: number, remaining: number, time: number, remote: boolean) {
  c.save(); c.translate(x, y);
  const scale = 1 + Math.sin(time / (remaining < 700 ? 45 : 120)) * .055; c.scale(scale, scale);
  ellipse(c, 0, 17, 18, 5, '#31465655');
  const sphere = c.createRadialGradient(-6, -7, 1, 0, 0, 17); sphere.addColorStop(0, '#647ca1'); sphere.addColorStop(.65, '#354e76'); sphere.addColorStop(1, '#24375d');
  ellipse(c, 0, 0, 16, 16, sphere); ellipse(c, -6, -7, 5, 3, '#d7e9ef80');
  rounded(c, -4, -20, 8, 8, 2, '#a18a6c');
  c.strokeStyle = '#e4ba73'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, -20); c.quadraticCurveTo(1, -31, 12, -26); c.stroke();
  c.fillStyle = '#ffedac'; c.font = 'bold 15px sans-serif'; c.fillText('✦', 7, -21);
  if (remote) { c.fillStyle = '#f7c9e6'; c.font = 'bold 18px sans-serif'; c.textAlign = 'center'; c.fillText('◎', 0, 6); }
  c.strokeStyle = remaining < 700 ? '#f7ad8a' : '#ecdb9b'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (remote ? 1 : remaining / BOMBER_FUSE)); c.stroke();
  c.restore();
}

const terrainLayers = new WeakMap<BomberState, { key: string; canvas: HTMLCanvasElement }>();
function drawTerrainLayer(c: CanvasRenderingContext2D, state: BomberState) {
  const key = `${state.stage}:${bomberSpriteRevision()}:${state.terrain.join(',')}`;
  let layer = terrainLayers.get(state);
  if (!layer || layer.key !== key) {
    const canvas = document.createElement('canvas'); canvas.width = BOMBER_COLS * 60; canvas.height = BOMBER_HEIGHT;
    const context = canvas.getContext('2d'); if (!context) return;
    paintTerrain(context, state); layer = { key, canvas }; terrainLayers.set(state, layer);
  }
  c.drawImage(layer.canvas, 0, 0);
}
function paintTerrain(c: CanvasRenderingContext2D, state: BomberState) {
  state.terrain.forEach((terrain, index) => {
    const { x, y } = bomberXY(index), px = x * 60, py = y * 60;
    const palette = [['#aed5a1', '#badcaa'], ['#d8c2a4', '#e3cfaf'], ['#b4c9d1', '#c2d5d6']][Math.floor((state.stage - 1) / 5) % 3];
    const floor = palette[(x + y) % 2];
    rounded(c, px + 1, py + 1, 58, 58, 4, floor);
    const floorKind = (['floor-mint','floor-sand','floor-star'] as const)[Math.floor((state.stage - 1) / 5) % 3];
    drawBomberSprite(c, floorKind, px + 30, py + 30, 60);
    c.strokeStyle = '#86b58944'; c.lineWidth = 1; c.strokeRect(px + 2.5, py + 2.5, 55, 55);
    if (terrain === 'floor' && !bomberSpriteRevision() && (index * 17 % 13 === 0)) {
      c.strokeStyle = '#82b181'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(px + 8, py + 46); c.lineTo(px + 9, py + 41); c.moveTo(px + 9, py + 46); c.lineTo(px + 13, py + 43); c.stroke();
    }
    if (terrain === 'stone' && !drawBomberSprite(c, 'wall-stone', px + 30, py + 30, 58)) {
      rounded(c, px + 3, py + 16, 54, 42, 9, '#547d8b'); rounded(c, px + 3, py + 5, 54, 45, 9, '#8db9b9');
      rounded(c, px + 7, py + 7, 46, 33, 7, '#b1d2c9'); rounded(c, px + 9, py + 9, 42, 9, 4, '#d8e7d2');
      c.strokeStyle = '#88b1ad'; c.lineWidth = 2; c.beginPath(); c.moveTo(px + 17, py + 40); c.lineTo(px + 25, py + 36); c.lineTo(px + 35, py + 37); c.stroke();
    }
    if (terrain === 'crate' && !drawBomberSprite(c, 'wall-brick', px + 30, py + 30, 56)) {
      rounded(c, px + 5, py + 15, 50, 42, 5, '#a27758');
      rounded(c, px + 5, py + 6, 50, 44, 5, '#b98d63');
      for (let row = 0; row < 3; row++) {
        const bricks = row % 2 ? [[8, 9], [19, 23], [44, 8]] : [[8, 21], [31, 21]];
        for (const [offset, width] of bricks) {
          rounded(c, px + offset, py + 8 + row * 13, width, 11, 2, row % 2 ? '#e9bc88' : '#f0cb96');
          rounded(c, px + offset + 1, py + 9 + row * 13, width - 2, 3, 1, '#ffe0a9');
        }
      }
    }
  });
}

export function drawBomberBoard(c: CanvasRenderingContext2D, state: BomberState, reducedMotion = false) {
  const time = reducedMotion ? 0 : state.elapsed;
  c.clearRect(0, 0, BOMBER_WIDTH, BOMBER_HEIGHT);
  c.fillStyle = '#6eab9b'; c.fillRect(0, 0, BOMBER_WIDTH, BOMBER_HEIGHT);
  c.save();
  const heroPosition = bomberActorPosition(state.player, state.elapsed);
  c.translate(-bomberCameraX(heroPosition.x), 0);
  drawTerrainLayer(c, state);
  if (state.terrain[state.exit] === 'floor') {
    const { x, y } = bomberXY(state.exit), px = x * 60 + 30, py = y * 60 + 28;
    const unlocked = state.enemies.length === 0;
    if (drawBomberSprite(c, 'exit', px, py + 2, 52)) {
      if (unlocked) { c.strokeStyle = '#85ffe3'; c.lineWidth = 3; c.strokeRect(px - 23, py - 21, 46, 46); }
      else { c.fillStyle = '#29385380'; c.fillRect(px - 15, py - 7, 30, 16); c.fillStyle = '#fff2c6'; c.font = 'bold 14px sans-serif'; c.textAlign = 'center'; c.fillText('◇', px, py + 6); }
    } else {
    ellipse(c, px, py + 10, 24, 12, unlocked ? '#71bfa4' : '#9b98bc');
    ellipse(c, px, py + 5, 20, 10, unlocked ? '#d5ffe8' : '#d5cce9');
    ellipse(c, px, py + 5, 14, 7, unlocked ? '#6eb6b2' : '#9486ba');
    if (unlocked) { c.fillStyle = '#c0ffe866'; c.fillRect(px - 10, py - 22, 20, 27); }
    c.fillStyle = unlocked ? '#fff0b4' : '#69587a'; c.font = 'bold 20px sans-serif'; c.textAlign = 'center'; c.fillText(unlocked ? '✦' : '◇', px, py + 3);
    }
  }
  for (const [key, power] of Object.entries(state.powers)) {
    const { x, y } = bomberXY(Number(key));
    const px = x * 60 + 30, py = y * 60 + 28 + Math.sin(time / 200) * 2;
    const spec = BOMBER_POWERS[power];
    ellipse(c, px, py + 19, 18, 5, '#305c6440');
    rounded(c, px - 23, py - 24, 46, 46, 10, '#fff8e5');
    if (drawBomberSprite(c, power, px, py - 1, 40)) continue;
    rounded(c, px - 15, py - 16, 30, 30, 9, '#fff6d9'); rounded(c, px - 12, py - 13, 24, 24, 7, spec.color);
    c.fillStyle = '#fffbed'; c.font = 'bold 18px sans-serif'; c.textAlign = 'center'; c.fillText(spec.symbol, px, py + 5);
  }
  for (const bomb of state.bombs) { const { x, y } = bomberXY(bomb.at); drawBomb(c, x * 60 + 30, y * 60 + 29, bomb.remote ? BOMBER_FUSE : Math.max(0, bomb.explodeAt - state.elapsed), time, bomb.remote); }
  for (const [key, until] of Object.entries(state.fire)) {
    const { x, y } = bomberXY(Number(key)), px = x * 60 + 30, py = y * 60 + 30;
    const intensity = Math.min(1, (until - state.elapsed) / 120);
    c.save(); c.globalAlpha = intensity;
    rounded(c, px - 28, py - 26, 56, 53, 14, '#ee8d6380');
    const glow = c.createRadialGradient(px, py, 3, px, py, 28); glow.addColorStop(0, '#fffadc'); glow.addColorStop(.5, '#ffdf8b'); glow.addColorStop(1, '#ef9363aa');
    c.fillStyle = glow; c.beginPath(); c.arc(px, py, 26, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff7c6'; c.font = 'bold 42px sans-serif'; c.textAlign = 'center'; c.fillText('✦', px, py + 14);
    for (let p = 0; p < 4; p++) { const angle = p * Math.PI / 2 + Number(key); ellipse(c, px + Math.cos(angle) * 22, py + Math.sin(angle) * 22, 2.5, 2.5, '#fff9df'); }
    c.restore();
  }
  state.enemies.forEach((enemy) => { const point = bomberActorPosition(enemy, state.elapsed); c.save(); if (enemy.invulnerableUntil > state.elapsed) c.globalAlpha = .45; drawEnemy(c, point.x, point.y, time, enemy.kind, enemy.id); c.restore(); });
  const hero = bomberActorPosition(state.player, state.elapsed);
  c.save();
  if (!reducedMotion && state.invulnerableUntil > state.elapsed && Math.floor(state.elapsed / 130) % 2) c.globalAlpha = .55;
  drawBomberHero(c, hero.x, hero.y, time, state.firePass || state.invincibleUntil > state.elapsed || state.bonus, state.player.direction, !reducedMotion && state.elapsed - state.player.movedAt < 110); c.restore();
  c.restore();
  // A light vignette gives the toy board depth without reducing the readable center.
  const vignette = c.createLinearGradient(0, 0, 0, BOMBER_HEIGHT); vignette.addColorStop(0, '#fff9dc15'); vignette.addColorStop(.8, '#fff9dc00'); vignette.addColorStop(1, '#375c5e16'); c.fillStyle = vignette; c.fillRect(0, 0, BOMBER_WIDTH, BOMBER_HEIGHT);
}

export function bomberTimeLeft(state: BomberState) {
  const limit = state.bonus ? BOMBER_BONUS_LIMIT : BOMBER_LEVELS[state.difficulty].limit;
  // Limits are rounded to milliseconds; count whole ticks to avoid an extra opening tick.
  const totalTicks = Math.round(limit / BOMBER_CLOCK_TICK);
  const spentTicks = Math.floor((state.elapsed - state.stageStartedAt + 0.5) / BOMBER_CLOCK_TICK);
  return Math.max(0, totalTicks - spentTicks);
}

export function bomberCameraX(heroX: number) {
  return Math.max(0, Math.min(BOMBER_COLS * BOMBER_CELL - BOMBER_WIDTH, heroX - BOMBER_WIDTH / 2));
}
