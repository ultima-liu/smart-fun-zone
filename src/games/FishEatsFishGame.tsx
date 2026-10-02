import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { sfx } from '../sfx';
import './fish-eats-fish.css';

export interface FishOutcome {
  result: 'win' | 'lose';
  difficulty: 'easy' | 'normal' | 'hard';
  score: number;
  eaten: number;
  durationSec: number;
}

interface Props {
  headerAction?: ReactNode;
  lang: 'zh' | 'en';
  playerName: string;
  onComplete: (outcome: FishOutcome) => void;
}

type Difficulty = FishOutcome['difficulty'];
type Phase = 'ready' | 'playing' | 'paused' | 'won' | 'lost';
type Fish = {
  id: number;
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  speed: number;
  homeDir: number;
  phase: number;
  hue: number;
  kind: 'prey' | 'danger' | 'gold';
  state: 'cruise' | 'windup' | 'strike' | 'recover';
  stateUntil: number;
  nearMiss: boolean;
  hitStrike: boolean;
  dodgeAwarded: boolean;
};
type Bubble = { x: number; y: number; r: number; speed: number; phase: number };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; hue: number };
type FloatText = { x: number; y: number; text: string; life: number; color: string };
type Wake = { x: number; y: number; life: number };
type Game = {
  fish: Fish[];
  bubbles: Bubble[];
  sparks: Spark[];
  floats: FloatText[];
  wakes: Wake[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  facing: number;
  target: { x: number; y: number } | null;
  keys: Set<string>;
  boost: boolean;
  energy: number;
  lives: number;
  score: number;
  eaten: number;
  combo: number;
  missions: { combo: boolean; dodge: boolean; gold: boolean };
  comboUntil: number;
  invincibleUntil: number;
  notice: 'grow' | 'hit' | 'school' | 'gold' | 'danger' | 'dodge' | null;
  noticeUntil: number;
  lastWarningAt: number;
  shakeUntil: number;
  elapsed: number;
  spawnIn: number;
  schoolIn: number;
  goldIn: number;
  schoolCount: number;
  goldCount: number;
  wakeIn: number;
  nextId: number;
  difficulty: Difficulty;
};

const W = 960;
const H = 540;
const START_SIZE = 26;
const TARGET = 68;
const OPENING_FISH = 9;
const REGULAR_FISH_CAP = 18;
const SETTINGS: Record<Difficulty, { lives: number; speed: number; danger: number }> = {
  easy: { lives: 5, speed: 270, danger: 0.14 },
  normal: { lives: 3, speed: 300, danger: 0.23 },
  hard: { lives: 2, speed: 325, danger: 0.32 },
};
const LABELS: Record<Difficulty, { zh: string; en: string }> = {
  easy: { zh: '轻松', en: 'Breeze' },
  normal: { zh: '认真', en: 'Focus' },
  hard: { zh: '高手', en: 'Master' },
};
const NOTICES: Record<Exclude<Game['notice'], null>, { zh: string; en: string }> = {
  grow: { zh: '✦ 长大啦！试着挑战更大的鱼', en: '✦ Bigger now! Chase bigger fish' },
  hit: { zh: '小心！还有机会反击', en: 'Careful! Swim back in' },
  school: { zh: '🐟 鱼群来了，追上它们！', en: '🐟 A school is passing by!' },
  gold: { zh: '✦ 金鱼现身！吃掉有惊喜', en: '✦ Golden fish! Catch it!' },
  danger: { zh: '❗ 大鱼蓄力了，快闪开！', en: '❗ Predator charging! Dodge!' },
  dodge: { zh: '漂亮闪避！+25 分', en: 'Nice dodge! +25 points' },
};
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function makeGame(difficulty: Difficulty): Game {
  return {
    fish: [],
    bubbles: Array.from({ length: 30 }, () => ({
      x: rand(0, W),
      y: rand(0, H),
      r: rand(2, 6),
      speed: rand(12, 35),
      phase: rand(0, 7),
    })),
    sparks: [],
    floats: [],
    wakes: [],
    x: W * 0.5,
    y: H * 0.52,
    vx: 0,
    vy: 0,
    r: START_SIZE,
    facing: 1,
    target: null,
    keys: new Set(),
    boost: false,
    energy: 100,
    lives: SETTINGS[difficulty].lives,
    score: 0,
    eaten: 0,
    combo: 0,
    missions: { combo: false, dodge: false, gold: false },
    comboUntil: 0,
    invincibleUntil: 0,
    notice: null,
    noticeUntil: 0,
    lastWarningAt: -10,
    shakeUntil: 0,
    elapsed: 0,
    spawnIn: 0.85,
    schoolIn: 5,
    goldIn: 10,
    schoolCount: 0,
    goldCount: 0,
    wakeIn: 0,
    nextId: 0,
    difficulty,
  };
}

function spawnFish(
  g: Game,
  opts: {
    opening?: boolean;
    kind?: Fish['kind'];
    dir?: number;
    y?: number;
    lag?: number;
    edge?: boolean;
    hue?: number;
    speed?: number;
  } = {},
) {
  const kind =
    opts.kind ??
    (opts.opening || Math.random() >= SETTINGS[g.difficulty].danger ? 'prey' : 'danger');
  const r =
    kind === 'danger'
      ? clamp(g.r * rand(1.35, 1.75), 35, 86)
      : kind === 'gold'
        ? clamp(g.r * 0.49, 13, 32)
        : clamp(g.r * rand(0.45, 0.7), 11, 42);
  const dir = opts.dir ?? (Math.random() < 0.5 ? 1 : -1);
  const x = opts.opening
    ? rand(0, W)
    : dir === 1
      ? (opts.edge ? r * 1.8 : -r * 3) - (opts.lag ?? 0)
      : (opts.edge ? W - r * 1.8 : W + r * 3) + (opts.lag ?? 0);
  const y = opts.y ?? (opts.opening ? rand(82, H - 82) : rand(72 + r, H - 67 - r));
  if (opts.opening && Math.hypot(x - g.x, y - g.y) < 120) return;
  const speed =
    opts.speed ?? (kind === 'danger' ? rand(56, 82) : kind === 'gold' ? 145 : rand(64, 105));
  g.fish.push({
    id: ++g.nextId,
    x,
    y,
    r,
    vx: dir * speed,
    vy: 0,
    speed,
    homeDir: dir,
    phase: rand(0, 7),
    hue: opts.hue ?? (kind === 'danger' ? rand(340, 370) : kind === 'gold' ? 43 : rand(15, 202)),
    kind,
    state: 'cruise',
    stateUntil: g.elapsed + rand(1, 3),
    nearMiss: false,
    hitStrike: false,
    dodgeAwarded: false,
  });
}

function seedFish(g: Game) {
  for (let i = 0; i < OPENING_FISH; i++) spawnFish(g, { opening: true });
}

function completeMission(g: Game, key: keyof Game['missions']) {
  if (g.missions[key]) return;
  g.missions[key] = true;
  g.score += 40;
  g.floats.push({ x: g.x, y: g.y - g.r - 42, text: '+40 BONUS', life: 1.15, color: '#fff3ab' });
  sfx.fishMission();
}

function spawnSchool(g: Game) {
  const dir = Math.random() < 0.5 ? 1 : -1;
  const centerY = rand(130, H - 145);
  const hue = rand(145, 190);
  for (let i = 0; i < 4; i++) {
    spawnFish(g, {
      kind: 'prey',
      dir,
      y: centerY + (i - 1.5) * 30,
      lag: (i % 3) * 19,
      edge: true,
      hue: hue + i * 2,
      speed: 125,
    });
  }
  g.notice = 'school';
  g.schoolCount++;
  g.noticeUntil = g.elapsed + 2.2;
  sfx.fishSchool();
}

function fishShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  direction: number,
  hue: number,
  player = false,
  time = 0,
  kind: Fish['kind'] = 'prey',
) {
  ctx.save();
  ctx.translate(x, y);
  if (direction < 0) ctx.scale(-1, 1);
  const body = ctx.createLinearGradient(-r, -r, r, r);
  body.addColorStop(0, player ? '#fff2b6' : `hsl(${hue} 100% 82%)`);
  body.addColorStop(0.46, player ? '#ffbd69' : `hsl(${hue} 82% 62%)`);
  body.addColorStop(1, player ? '#ef6b78' : `hsl(${hue} 70% 39%)`);
  ctx.shadowColor = player || kind === 'gold' ? '#ffe2a2' : `hsla(${hue} 95% 70% / .4)`;
  ctx.shadowBlur = player || kind === 'gold' ? 21 : 10;
  ctx.fillStyle = body;
  const tailWag = Math.sin(time * (player ? 12 : 7) + x * 0.025) * r * 0.23;
  ctx.beginPath();
  ctx.moveTo(-r * 0.68, 0);
  ctx.lineTo(-r * 1.7, -r * 0.75 + tailWag);
  ctx.quadraticCurveTo(-r * 1.45, 0, -r * 1.7, r * 0.75);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.05, r * 0.67, 0, 0, Math.PI * 2);
  ctx.fill();
  if (kind === 'danger') {
    ctx.strokeStyle = 'rgba(95,21,62,.35)';
    ctx.lineWidth = Math.max(2, r * 0.09);
    for (const stripe of [-0.3, 0, 0.3]) {
      ctx.beginPath();
      ctx.moveTo(r * stripe - r * 0.2, -r * 0.36);
      ctx.lineTo(r * stripe + r * 0.02, r * 0.35);
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = player ? '#ffda92' : `hsla(${hue} 92% 78% / .9)`;
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, -r * 0.55);
  ctx.quadraticCurveTo(-r * 0.38, -r * 1.06, r * 0.38, -r * 0.53);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.24)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.05, r * 0.22, r * 0.73, r * 0.23, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(r * 0.54, -r * 0.2, Math.max(2, r * 0.13), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#163759';
  ctx.beginPath();
  ctx.arc(r * 0.58, -r * 0.19, Math.max(1.4, r * 0.075), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(46,50,80,.55)';
  ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.beginPath();
  ctx.moveTo(r * 0.85, r * 0.12);
  ctx.quadraticCurveTo(r * 0.96, r * 0.23, r * 0.86, r * 0.28);
  ctx.stroke();
  if (player) {
    ctx.fillStyle = '#fff6d2';
    ctx.beginPath();
    ctx.arc(-r * 0.2, -r * 0.1, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-r * 0.5, r * 0.09, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
  if (kind === 'gold') {
    ctx.fillStyle = '#fff7b8';
    ctx.font = `bold ${Math.max(10, r * 0.7)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('✦', -r * 0.18, r * 0.2);
  }
  ctx.restore();
}

function drawScene(ctx: CanvasRenderingContext2D, g: Game, time: number, reduced: boolean) {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (!reduced && g.elapsed < g.shakeUntil) ctx.translate(rand(-5, 5), rand(-4, 4));
  const water = ctx.createLinearGradient(0, 0, 0, H);
  water.addColorStop(0, '#0c5079');
  water.addColorStop(0.42, '#105c84');
  water.addColorStop(1, '#07364f');
  ctx.fillStyle = water;
  ctx.fillRect(0, 0, W, H);
  const beamTime = reduced ? 0 : time;
  for (let i = 0; i < 7; i++) {
    const x = 80 + i * 150 + Math.sin(beamTime * 0.15 + i) * 24;
    ctx.fillStyle = 'rgba(180,246,255,.035)';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 76, 0);
    ctx.lineTo(x + 220, H);
    ctx.lineTo(x + 100, H);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(161,239,255,.08)';
  ctx.beginPath();
  ctx.ellipse(820, 95, 210, 75, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#164f5c';
  ctx.beginPath();
  ctx.moveTo(0, 475);
  for (let x = 0; x <= W; x += 30) ctx.lineTo(x, 477 + Math.sin(x * 0.018) * 11);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();
  ctx.fillStyle = '#d7ad83';
  ctx.beginPath();
  ctx.moveTo(0, 520);
  for (let x = 0; x <= W; x += 24) ctx.lineTo(x, 518 + Math.sin(x * 0.02) * 8);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();
  for (let i = 0; i < 17; i++) {
    const x = i * 61 + 12;
    const y = 515 + Math.sin(i * 2.3) * 10;
    const sway = reduced ? 0 : Math.sin(time * 1.3 + i) * 7;
    ctx.strokeStyle = i % 2 ? '#2fbd9d' : '#54d0a6';
    ctx.lineWidth = 5 + (i % 3);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + sway + 12, y - 42, x + sway, y - 73 - (i % 4) * 12);
    ctx.stroke();
  }
  // 近景珊瑚从海床伸出，分枝和端点保留温暖的糖果色。
  for (let i = 0; i < 8; i++) {
    const x = 48 + i * 129;
    const y = 523 + (i % 3) * 4;
    const height = 25 + (i % 3) * 10;
    const hue = i % 2 ? 342 : 24;
    ctx.strokeStyle = `hsl(${hue} 82% 72%)`;
    ctx.fillStyle = `hsl(${hue} 95% 82%)`;
    ctx.lineCap = 'round';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - height);
    ctx.moveTo(x, y - height * 0.36);
    ctx.lineTo(x - 12, y - height * 0.68);
    ctx.moveTo(x, y - height * 0.55);
    ctx.lineTo(x + 13, y - height * 0.84);
    ctx.stroke();
    for (const [tipX, tipY] of [
      [x, y - height],
      [x - 12, y - height * 0.68],
      [x + 13, y - height * 0.84],
    ]) {
      ctx.beginPath();
      ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const b of g.bubbles) {
    ctx.strokeStyle = 'rgba(185,248,255,.37)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(b.x + Math.sin(time + b.phase) * 4, b.y, b.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.beginPath();
    ctx.arc(b.x - b.r * 0.27, b.y - b.r * 0.3, 1, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const wake of g.wakes) {
    ctx.globalAlpha = clamp(wake.life * 1.8, 0, 0.7);
    ctx.strokeStyle = '#d3ffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(wake.x, wake.y, 10 * (1 - wake.life) + 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const f of g.fish) {
    if (f.kind === 'gold') {
      ctx.strokeStyle = `rgba(255,236,130,${0.42 + Math.sin(time * 6) * 0.2})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 1.55, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (f.state === 'windup') {
      ctx.strokeStyle = '#ffd4db';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (1.45 + Math.sin(time * 18) * 0.08), 0, Math.PI * 2);
      ctx.stroke();
    }
    fishShape(
      ctx,
      f.x,
      f.y + Math.sin(time * 2 + f.phase) * 2,
      f.r,
      Math.sign(f.vx) || f.homeDir,
      f.hue,
      false,
      time,
      f.kind,
    );
    if (f.kind === 'danger' && f.r > g.r * 1.17) {
      ctx.fillStyle = '#ffdddd';
      ctx.font = `bold ${f.state === 'windup' ? 27 : 19}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText('!', f.x, f.y - f.r - 11);
    }
  }
  if (g.invincibleUntil <= g.elapsed || Math.floor(g.elapsed * 8) % 2 === 0)
    fishShape(ctx, g.x, g.y, g.r, g.facing, 33, true, time);
  for (const p of g.sparks) {
    ctx.globalAlpha = clamp(p.life * 2, 0, 1);
    ctx.fillStyle = `hsl(${p.hue} 100% 78%)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5 * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const f of g.floats) {
    ctx.globalAlpha = clamp(f.life * 1.2, 0, 1);
    ctx.textAlign = 'center';
    ctx.font = '900 20px system-ui';
    ctx.strokeStyle = 'rgba(9,44,65,.8)';
    ctx.lineWidth = 4;
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function step(g: Game, dt: number): 'win' | 'lose' | null {
  g.elapsed += dt;
  const keyX =
    Number(g.keys.has('arrowright') || g.keys.has('d')) -
    Number(g.keys.has('arrowleft') || g.keys.has('a'));
  const keyY =
    Number(g.keys.has('arrowdown') || g.keys.has('s')) -
    Number(g.keys.has('arrowup') || g.keys.has('w'));
  let dx = keyX;
  let dy = keyY;
  if (dx || dy) g.target = null;
  else if (g.target) {
    dx = g.target.x - g.x;
    dy = g.target.y - g.y;
    if (Math.hypot(dx, dy) < 6) {
      dx = 0;
      dy = 0;
    }
  }
  const len = Math.hypot(dx, dy);
  const boosting = g.boost && g.energy > 2 && len > 0;
  g.energy = clamp(g.energy + (boosting ? -46 : 20) * dt, 0, 100);
  const speed =
    (SETTINGS[g.difficulty].speed * (boosting ? 1.6 : 1)) /
    (1 + Math.max(0, g.r - START_SIZE) * 0.007);
  const blend = Math.min(1, dt * 9);
  g.vx += ((len ? (dx / len) * speed : 0) - g.vx) * blend;
  g.vy += ((len ? (dy / len) * speed : 0) - g.vy) * blend;
  g.x = clamp(g.x + g.vx * dt, g.r * 1.25, W - g.r * 1.25);
  g.y = clamp(g.y + g.vy * dt, g.r, H - 36 - g.r);
  if (Math.abs(g.vx) > 12) g.facing = Math.sign(g.vx);
  g.wakeIn -= dt;
  if (boosting && g.wakeIn <= 0) {
    g.wakes.push({
      x: g.x - g.facing * g.r * 1.3,
      y: g.y + rand(-g.r * 0.3, g.r * 0.3),
      life: 0.55,
    });
    g.wakeIn = 0.055;
  }
  g.spawnIn -= dt;
  if (g.spawnIn <= 0 && g.fish.length < REGULAR_FISH_CAP) {
    spawnFish(g);
    g.spawnIn = rand(1.05, 1.55);
  }
  g.schoolIn -= dt;
  if (g.schoolIn <= 0) {
    if (g.fish.length < REGULAR_FISH_CAP) {
      spawnSchool(g);
      g.schoolIn = rand(18, 22);
    } else {
      g.schoolIn = 2;
    }
  }
  g.goldIn -= dt;
  if (g.goldIn <= 0) {
    spawnFish(g, { kind: 'gold', edge: true });
    g.goldCount++;
    g.goldIn = rand(20, 24);
    g.notice = 'gold';
    g.noticeUntil = g.elapsed + 2.1;
    sfx.fishGold();
  }
  for (const f of g.fish) {
    const awayX = f.x - g.x;
    const awayY = f.y - g.y;
    const distance = Math.hypot(awayX, awayY) || 1;
    const isThreat = f.kind === 'danger' && f.r >= g.r * 1.16;
    if (!isThreat && (f.state === 'windup' || f.state === 'strike')) {
      f.state = 'cruise';
    }
    if (isThreat && f.state === 'cruise' && distance < 255 && g.elapsed >= f.stateUntil) {
      f.state = 'windup';
      f.stateUntil = g.elapsed + 0.58;
      if (g.elapsed - g.lastWarningAt > 2.4) {
        g.notice = 'danger';
        g.noticeUntil = g.elapsed + 1.15;
        g.lastWarningAt = g.elapsed;
        sfx.fishWarning();
      }
    } else if (f.state === 'windup' && g.elapsed >= f.stateUntil) {
      f.state = 'strike';
      f.stateUntil = g.elapsed + 0.76;
      f.nearMiss = false;
      f.hitStrike = false;
      f.dodgeAwarded = false;
      f.vx = (-awayX / distance) * f.speed * 3;
      f.vy = (-awayY / distance) * f.speed * 3;
    } else if (f.state === 'strike' && g.elapsed >= f.stateUntil) {
      f.state = 'recover';
      f.stateUntil = g.elapsed + 2;
    } else if (f.state === 'recover' && g.elapsed >= f.stateUntil) {
      f.state = 'cruise';
      f.stateUntil = g.elapsed + rand(0.7, 1.6);
    }
    if (f.state === 'windup') {
      f.vx *= Math.max(0, 1 - dt * 6);
      f.vy *= Math.max(0, 1 - dt * 6);
    } else if (f.state !== 'strike') {
      let desiredX = f.homeDir * f.speed;
      let desiredY = Math.sin(g.elapsed * 1.7 + f.phase) * 28;
      if (!isThreat && distance < (f.kind === 'gold' ? 235 : 160)) {
        desiredX = (awayX / distance) * f.speed * (f.kind === 'gold' ? 1.65 : 1.32);
        desiredY = (awayY / distance) * f.speed * (f.kind === 'gold' ? 1.65 : 1.32);
      }
      const steer = Math.min(1, dt * (f.state === 'recover' ? 2.1 : 3.3));
      f.vx += (desiredX - f.vx) * steer;
      f.vy += (desiredY - f.vy) * steer;
    }
    f.x += f.vx * dt;
    f.y = clamp(f.y + f.vy * dt, 55 + f.r, H - 64 - f.r);
    const gap = Math.hypot((f.x - g.x) * 0.8, f.y - g.y);
    if (f.state === 'strike' && gap < g.r + f.r + 46) f.nearMiss = true;
    if (
      f.state === 'recover' &&
      f.nearMiss &&
      !f.hitStrike &&
      !f.dodgeAwarded &&
      gap > g.r + f.r + 34
    ) {
      f.dodgeAwarded = true;
      g.score += 25;
      completeMission(g, 'dodge');
      g.energy = clamp(g.energy + 18, 0, 100);
      g.floats.push({ x: g.x, y: g.y - g.r - 15, text: '+25 ✦', life: 1, color: '#a9ffdf' });
      g.notice = 'dodge';
      g.noticeUntil = g.elapsed + 1.3;
      sfx.fishDodge();
    }
    if (gap > g.r + f.r * 0.9) continue;
    if (f.r <= g.r * 0.78) {
      g.fish = g.fish.filter((item) => item.id !== f.id);
      g.combo = g.elapsed < g.comboUntil ? Math.min(9, g.combo + 1) : 1;
      if (g.combo >= 3) completeMission(g, 'combo');
      g.comboUntil = g.elapsed + 4;
      g.eaten++;
      const gained = (f.kind === 'gold' ? 80 : 10) + (g.combo - 1) * 5;
      g.score += gained;
      const previousSize = g.r;
      g.r = Math.min(TARGET, g.r + Math.max(0.75, f.r * 0.095) + (f.kind === 'gold' ? 1.2 : 0));
      if (f.kind === 'gold') {
        completeMission(g, 'gold');
        g.energy = 100;
        g.notice = 'gold';
        g.noticeUntil = g.elapsed + 1.8;
        sfx.fishGold();
      } else if ((previousSize < 41 && g.r >= 41) || (previousSize < 54 && g.r >= 54)) {
        g.notice = 'grow';
        g.noticeUntil = g.elapsed + 1.5;
      }
      g.floats.push({
        x: f.x,
        y: f.y - f.r,
        text: `+${gained}${g.combo >= 3 ? ` ×${g.combo}` : ''}`,
        life: 1,
        color: f.kind === 'gold' ? '#ffe79a' : '#e6ffec',
      });
      for (let i = 0; i < (f.kind === 'gold' ? 22 : 10); i++)
        g.sparks.push({
          x: f.x,
          y: f.y,
          vx: rand(-95, 95),
          vy: rand(-95, 95),
          life: rand(0.35, 0.7),
          hue: f.hue,
        });
      sfx.fishEat(g.combo);
      if (g.r >= TARGET) return 'win';
    } else if (f.r >= g.r * 1.16 && g.elapsed >= g.invincibleUntil) {
      g.lives--;
      f.hitStrike = true;
      g.combo = 0;
      g.invincibleUntil = g.elapsed + 2.2;
      g.notice = 'hit';
      g.noticeUntil = g.elapsed + 1.4;
      g.shakeUntil = g.elapsed + 0.35;
      g.vx = -Math.sign(f.x - g.x) * 220;
      g.vy = -Math.sign(f.y - g.y) * 140;
      sfx.fishHit();
      if (g.lives <= 0) return 'lose';
    }
  }
  g.fish = g.fish.filter((f) => f.x > -f.r * 3.5 && f.x < W + f.r * 3.5);
  for (const b of g.bubbles) {
    b.y -= b.speed * dt;
    if (b.y < -10) {
      b.y = H + 10;
      b.x = rand(0, W);
    }
  }
  g.sparks = g.sparks.filter((p) => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    return p.life > 0;
  });
  g.floats = g.floats.filter((f) => {
    f.y -= 35 * dt;
    f.life -= dt;
    return f.life > 0;
  });
  g.wakes = g.wakes.filter((wake) => {
    wake.life -= dt;
    return wake.life > 0;
  });
  if (g.elapsed > g.comboUntil) g.combo = 0;
  if (g.elapsed > g.noticeUntil) g.notice = null;
  return null;
}

export default function FishEatsFishGame({ lang, playerName, onComplete, headerAction }: Props) {
  const sound = useStore((s) => s.sound);
  const toggleSound = useStore((s) => s.toggleSound);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [initialGame] = useState(() => {
    const game = makeGame('normal');
    seedFish(game);
    return game;
  });
  const gameRef = useRef<Game>(initialGame);
  const onCompleteRef = useRef(onComplete);
  const [phase, setPhase] = useState<Phase>('ready');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [hud, setHud] = useState({
    score: 0,
    eaten: 0,
    size: START_SIZE,
    lives: 3,
    combo: 0,
    missions: { combo: false, dodge: false, gold: false },
    energy: 100,
    sec: 0,
    schoolIn: 5,
    goldIn: 10,
    notice: null as Game['notice'],
  });
  const [best, setBest] = useState(0);
  const [outcome, setOutcome] = useState<FishOutcome | null>(null);
  const isZh = lang === 'zh';
  onCompleteRef.current = onComplete;

  const syncHud = useCallback(() => {
    const g = gameRef.current;
    setHud({
      score: g.score,
      eaten: g.eaten,
      size: g.r,
      lives: g.lives,
      combo: g.combo,
      missions: { ...g.missions },
      energy: g.energy,
      sec: Math.floor(g.elapsed),
      schoolIn: Math.max(0, Math.ceil(g.schoolIn)),
      goldIn: Math.max(0, Math.ceil(g.goldIn)),
      notice: g.notice,
    });
  }, []);

  const finish = useCallback(
    (result: 'win' | 'lose') => {
      const g = gameRef.current;
      const summary: FishOutcome = {
        result,
        difficulty: g.difficulty,
        score: g.score,
        eaten: g.eaten,
        durationSec: Math.max(1, Math.ceil(g.elapsed)),
      };
      setOutcome(summary);
      setBest((value) => Math.max(value, g.score));
      setPhase(result === 'win' ? 'won' : 'lost');
      syncHud();
      if (result === 'win') sfx.fishWin();
      else sfx.fishOver();
      onCompleteRef.current(summary);
    },
    [syncHud],
  );

  const start = useCallback(
    (selected: Difficulty = difficulty) => {
      const game = makeGame(selected);
      seedFish(game);
      gameRef.current = game;
      setDifficulty(selected);
      setOutcome(null);
      syncHud();
      setPhase('playing');
      sfx.fishStart();
    },
    [difficulty, syncHud],
  );

  useEffect(() => {
    if (!sound || phase !== 'playing') return;
    sfx.fishBgmStart();
    return () => sfx.fishBgmStop();
  }, [sound, phase]);

  useEffect(() => {
    if (phase !== 'playing') return;
    let frame = 0;
    let last = performance.now();
    let lastHud = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.035);
      last = now;
      const g = gameRef.current;
      const result = step(g, dt);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        canvas.dataset.playerX = g.x.toFixed(1);
        canvas.dataset.playerY = g.y.toFixed(1);
        canvas.dataset.fishCount = String(g.fish.length);
        canvas.dataset.schoolCount = String(g.schoolCount);
        canvas.dataset.goldCount = String(g.goldCount);
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (width > 0 && height > 0) {
          const pixelW = Math.round(width * dpr);
          const pixelH = Math.round(height * dpr);
          if (canvas.width !== pixelW || canvas.height !== pixelH) {
            canvas.width = pixelW;
            canvas.height = pixelH;
          }
          ctx.setTransform(pixelW / W, 0, 0, pixelH / H, 0, 0);
          drawScene(
            ctx,
            g,
            g.elapsed,
            window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          );
        }
      }
      if (now - lastHud > 130 || result) {
        syncHud();
        lastHud = now;
      }
      if (result) {
        finish(result);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, finish, syncHud]);

  useEffect(() => {
    if (phase === 'playing') return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    drawScene(ctx, gameRef.current, gameRef.current.elapsed, true);
  }, [phase]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (
        [
          'arrowup',
          'arrowdown',
          'arrowleft',
          'arrowright',
          ' ',
          'shift',
          'w',
          'a',
          's',
          'd',
          'p',
          'escape',
          'enter',
        ].includes(key)
      ) {
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
          return;
        if (phase === 'playing') {
          event.preventDefault();
          if (key === 'p' || key === 'escape') {
            setPhase('paused');
            return;
          }
          if (key === ' ' || key === 'shift') gameRef.current.boost = true;
          else gameRef.current.keys.add(key);
        } else if (phase === 'paused' && (key === 'p' || key === 'escape')) {
          event.preventDefault();
          setPhase('playing');
        }
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      gameRef.current.keys.delete(key);
      if (key === ' ' || key === 'shift') gameRef.current.boost = false;
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const hide = () => {
      if (document.hidden) {
        gameRef.current.keys.clear();
        gameRef.current.boost = false;
        setPhase('paused');
      }
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, [phase]);

  const aim = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== 'playing') return;
    const box = event.currentTarget.getBoundingClientRect();
    gameRef.current.target = {
      x: ((event.clientX - box.left) / box.width) * W,
      y: ((event.clientY - box.top) / box.height) * H,
    };
  };
  const hold = (key: string, pressed: boolean) => {
    if (pressed) gameRef.current.keys.add(key);
    else gameRef.current.keys.delete(key);
  };
  const pause = () => {
    gameRef.current.keys.clear();
    gameRef.current.boost = false;
    setPhase((value) => (value === 'playing' ? 'paused' : 'playing'));
  };
  const progress = clamp(((hud.size - START_SIZE) / (TARGET - START_SIZE)) * 100, 0, 100);
  const sizeTier = hud.size < 41 ? 1 : hud.size < 54 ? 2 : 3;

  return (
    <section className="ff-game" aria-labelledby="ff-title">
      <header className="ff-head">
        {headerAction ?? (<div className="ff-emblem arcade-art" aria-hidden="true" />)}
        <div>
          <span>{isZh ? '敏捷 · 珊瑚海奇遇' : 'REFLEX · CORAL SEA'}</span>
          <h2 id="ff-title">{isZh ? '大鱼吃小鱼' : 'Fish Eats Fish'}</h2>
          <p>
            {isZh
              ? '追逐逃散鱼群，抢金鱼，闪开大鱼扑击，在珊瑚海一路长大。'
              : 'Chase scattering schools, catch golden fish, and dodge predator lunges as you grow.'}
          </p>
        </div>
        <div className="ff-best">
          {isZh ? '本次最高分' : 'SESSION BEST'}
          <b>{Math.max(best, hud.score)}</b>
        </div>
      </header>
      <div className="ff-layout">
        <div className="ff-stage">
          <div
            className="ff-board"
            role="application"
            aria-label={
              isZh
                ? `大鱼吃小鱼海域，分数 ${hud.score}，体型第 ${sizeTier} 阶，生命 ${hud.lives}`
                : `Fish Eats Fish sea, score ${hud.score}, size tier ${sizeTier}, ${hud.lives} lives`
            }
          >
            <canvas
              ref={canvasRef}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                aim(event);
              }}
              onPointerMove={aim}
              onPointerLeave={() => {
                if (phase === 'playing') gameRef.current.target = null;
              }}
            />
            {phase === 'playing' && hud.notice && (
              <div className={`ff-toast ${hud.notice}`} role="status">
                {NOTICES[hud.notice][lang]}
              </div>
            )}
            {phase !== 'playing' && (
              <div className="ff-overlay">
                {phase === 'ready' ? (
                  <>
                    <span>✦ {isZh ? '珊瑚海冒险' : 'CORAL ADVENTURE'}</span>
                    <h3>{isZh ? `出发吧，${playerName}！` : `Dive in, ${playerName}!`}</h3>
                    <p>
                      {isZh
                        ? '追上小鱼、躲开会蓄力扑击的大鱼。遇见鱼群和金鱼别错过，长满成长进度就能赢！'
                        : 'Chase little fish, dodge charging predators, and catch passing schools and golden fish. Fill the growth bar to win!'}
                    </p>
                    <button type="button" onClick={() => start()}>
                      {isZh ? '开始潜游' : 'Dive in'} →
                    </button>
                  </>
                ) : phase === 'paused' ? (
                  <>
                    <span>✦ {isZh ? '休息一下' : 'TAKE A BREATH'}</span>
                    <h3>{isZh ? '已暂停' : 'Paused'}</h3>
                    <p>
                      {isZh
                        ? '鱼群和计时都停下了，准备好就继续。'
                        : 'The fish and clock are waiting for you.'}
                    </p>
                    <button type="button" onClick={pause}>
                      {isZh ? '继续潜游' : 'Resume'} →
                    </button>
                  </>
                ) : (
                  <>
                    <span>
                      ✦{' '}
                      {phase === 'won'
                        ? isZh
                          ? '海洋之星'
                          : 'OCEAN STAR'
                        : isZh
                          ? '旅程结束'
                          : 'ROUND OVER'}
                    </span>
                    <h3>
                      {phase === 'won'
                        ? isZh
                          ? '你成为大鱼啦！'
                          : 'You grew into a big fish!'
                        : isZh
                          ? '再潜一次吧！'
                          : 'Dive in again!'}
                    </h3>
                    <div className="ff-result">
                      <span>
                        {isZh ? '分数' : 'Score'}
                        <b>{outcome?.score}</b>
                      </span>
                      <span>
                        {isZh ? '吃掉' : 'Eaten'}
                        <b>{outcome?.eaten}</b>
                      </span>
                      <span>
                        {isZh ? '用时' : 'Time'}
                        <b>{outcome?.durationSec}s</b>
                      </span>
                    </div>
                    <button type="button" onClick={() => start()}>
                      {isZh ? '再来一局' : 'Play again'} ↻
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="ff-pad" aria-label={isZh ? '触屏方向控制' : 'Touch direction controls'}>
            {(
              [
                ['arrowleft', '←', '向左游', 'Swim left'],
                ['arrowup', '↑', '向上游', 'Swim up'],
                ['arrowdown', '↓', '向下游', 'Swim down'],
                ['arrowright', '→', '向右游', 'Swim right'],
              ] as const
            ).map(([key, glyph, zh, en]) => (
              <button
                key={key}
                type="button"
                disabled={phase !== 'playing'}
                aria-label={isZh ? zh : en}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  hold(key, true);
                }}
                onPointerUp={() => hold(key, false)}
                onPointerCancel={() => hold(key, false)}
              >
                {glyph}
              </button>
            ))}
            <button
              type="button"
              className="ff-boost"
              disabled={phase !== 'playing'}
              onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                gameRef.current.boost = true;
              }}
              onPointerUp={() => {
                gameRef.current.boost = false;
              }}
              onPointerCancel={() => {
                gameRef.current.boost = false;
              }}
            >
              {isZh ? '冲刺' : 'Boost'} ✦
            </button>
          </div>
        </div>
        <aside className="ff-console">
          <div className="ff-score">
            <small>{isZh ? '本局分数' : 'SCORE'}</small>
            <strong>{hud.score}</strong>
            <span>
              {hud.combo > 1
                ? `${isZh ? '连吃' : 'Combo'} ×${hud.combo}`
                : isZh
                  ? '连吃小鱼加分'
                  : 'Chain bites for bonus points'}
            </span>
          </div>
          <div className="ff-stats">
            <span>
              {isZh ? '已吃小鱼' : 'Fish eaten'} <b>{hud.eaten}</b>
            </span>
            <span>
              {isZh ? '海洋生命' : 'Lives'}{' '}
              <b aria-label={isZh ? `剩余 ${hud.lives} 条生命` : `${hud.lives} lives`}>
                {'♥'.repeat(hud.lives)}
              </b>
            </span>
            <span>
              {isZh ? '潜游时间' : 'Time'} <b>{hud.sec}s</b>
            </span>
          </div>
          <div className="ff-next" aria-label={isZh ? '海域事件倒计时' : 'Sea event countdown'}>
            <span>
              🐟 {isZh ? '鱼群' : 'School'} <b>{hud.schoolIn}s</b>
            </span>
            <span>
              ✦ {isZh ? '金鱼' : 'Gold fish'} <b>{hud.goldIn}s</b>
            </span>
          </div>
          <div className="ff-meter">
            <div>
              <span>{isZh ? '成长进度' : 'GROWTH'}</span>
              <b>Lv.{sizeTier} / 3</b>
            </div>
            <i>
              <em style={{ width: `${progress}%` }} />
            </i>
            <small>
              {isZh
                ? '继续吃比自己小的鱼，长成海洋之星'
                : 'Keep eating smaller fish to become an ocean star'}
            </small>
          </div>
          <div className="ff-meter energy">
            <div>
              <span>{isZh ? '冲刺能量' : 'BOOST ENERGY'}</span>
              <b>{Math.round(hud.energy)}%</b>
            </div>
            <i>
              <em style={{ width: `${hud.energy}%` }} />
            </i>
          </div>
        </aside>
        <div className="ff-bottom">
          <div className="ff-legend">
            <b>{isZh ? '本局挑战 · 每项 +40 分' : 'ROUND QUESTS · +40 EACH'}</b>
            <div className="ff-quests">
              <span className={hud.missions.combo ? 'done' : ''}>
                🐟 {isZh ? '连吃 3 条' : '3 bite combo'}{' '}
                <strong>{hud.missions.combo ? '✓' : `${Math.min(hud.combo, 3)}/3`}</strong>
              </span>
              <span className={hud.missions.dodge ? 'done' : ''}>
                ❗ {isZh ? '闪开一次扑击' : 'Dodge a lunge'}{' '}
                <strong>{hud.missions.dodge ? '✓' : '○'}</strong>
              </span>
              <span className={hud.missions.gold ? 'done' : ''}>
                ✦ {isZh ? '吃到一条金鱼' : 'Catch a golden fish'}{' '}
                <strong>{hud.missions.gold ? '✓' : '○'}</strong>
              </span>
            </div>
            <p>
              {isZh
                ? '鱼群会逃散；大鱼红圈蓄力后扑击；金鱼能补满冲刺。'
                : 'Schools scatter, red rings warn of lunges, and golden fish refill boost.'}
            </p>
          </div>
          <div className="ff-bottom-controls">
            <div className="ff-difficulty">
              <b>{isZh ? '选择难度' : 'DIFFICULTY'}</b>
              <div>
                {(Object.keys(LABELS) as Difficulty[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={difficulty === item ? 'selected' : ''}
                    aria-pressed={difficulty === item}
                    disabled={phase === 'playing' || phase === 'paused'}
                    onClick={() => {
                      setDifficulty(item);
                      const g = makeGame(item);
                      seedFish(g);
                      gameRef.current = g;
                      syncHud();
                      setPhase('ready');
                    }}
                  >
                    {LABELS[item][lang]}
                  </button>
                ))}
              </div>
            </div>
            <div className="ff-actions">
              <button
                type="button"
                onClick={pause}
                disabled={phase !== 'playing' && phase !== 'paused'}
              >
                {phase === 'paused' ? (isZh ? '▶ 继续' : '▶ Resume') : isZh ? 'Ⅱ 暂停' : 'Ⅱ Pause'}
              </button>
              <button type="button" onClick={toggleSound}>
                {sound ? (isZh ? '♫ 音乐开' : '♫ Music on') : isZh ? '♪ 音乐关' : '♪ Music off'}
              </button>
            </div>
            <small className="ff-hint">
              {isZh
                ? '键盘方向键 / WASD 游动 · 空格 / Shift 冲刺 · P 暂停；也可在海面拖动或点按方向键。'
                : 'Arrow keys / WASD to swim · Space / Shift to boost · P to pause; drag the sea or use touch controls.'}
            </small>
          </div>
        </div>
      </div>
    </section>
  );
}
