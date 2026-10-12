import {
  CONTRA_H,
  CONTRA_W,
  CONTRA_STAGES,
  contraKind,
  contraBasePhase,
  hazardActive,
  contraMuzzle,
  type ContraState,
  type ContraPlayer,
  type Platform,
} from './contraEngine';
const images = new Map<string, HTMLImageElement>();
const terrains = [
  'grass',
  'granite',
  'riverbank',
  'waterfall',
  'snow',
  'energy',
  'hangar',
  'alien',
];
const environments = ['jungle', 'base1', 'waterfall', 'base2', 'snow', 'energy', 'hangar', 'lair'];
export async function loadContraArtwork() {
  const names = [
    ...environments,
    ...terrains.map((name) => `terrain-${name}`),
    'blue-idle',
    'blue-run',
    'blue-jump',
    'blue-prone',
    'red-idle',
    'red-run',
    'red-jump',
    'red-prone',
    'blue-base-idle',
    'blue-base-prone',
    'red-base-idle',
    'red-base-prone',
    'soldier',
    'turret',
    'wall-turret',
    'tank',
    'alien',
    ...Array.from({ length: 8 }, (_, i) => `boss${i + 1}`),
  ];
  const results = await Promise.allSettled(
    names.map(async (name) => {
      const img = new Image();
      img.src = `${import.meta.env.BASE_URL}assets/games/contra/${name}-${['boss2', 'base1', 'blue-idle', 'blue-run', 'blue-jump', 'blue-prone', 'red-idle', 'red-run', 'red-jump', 'red-prone', 'soldier', 'turret', 'tank', 'alien'].includes(name) ? 'v2' : 'v1'}.webp`;
      await img.decode();
      images.set(name, img);
    }),
  );
  return results.filter((r) => r.status === 'fulfilled').length;
}
type Ctx = CanvasRenderingContext2D;
function sprite(c: Ctx, name: string, x: number, y: number, h: number, flip = false, maxW = 100) {
  const img = images.get(name);
  if (!img) {
    c.fillStyle = name.startsWith('red') ? '#ee8667' : '#6fb5dc';
    c.fillRect(x - 5, y - h, 10, h);
    return;
  }
  const w = Math.min(maxW, (h * img.width) / img.height);
  c.save();
  c.translate(x, y);
  if (flip) c.scale(-1, 1);
  c.drawImage(img, -w / 2, -h, w, h);
  c.restore();
}
function glow(c: Ctx, x: number, y: number, radius: number, color: string) {
  c.save();
  c.shadowColor = color;
  c.shadowBlur = 12;
  c.fillStyle = color;
  c.beginPath();
  c.arc(x, y, radius, 0, Math.PI * 2);
  c.fill();
  c.restore();
}
function text(
  c: Ctx,
  value: string,
  x: number,
  y: number,
  color = '#e8f5eb',
  size = 7,
  align: CanvasTextAlign = 'left',
) {
  c.font = `600 ${size}px system-ui, sans-serif`;
  c.textAlign = align;
  c.fillStyle = color;
  c.fillText(value, x, y);
}
function drawPlayer(c: Ctx, p: ContraPlayer, s: ContraState, base: boolean, reduced: boolean) {
  if (p.lives <= 0 || p.dead > 0) return;
  const time = s.time;
  c.save();
  if (base && s.advancing) {
    const progress = Math.min(1, s.advancing / 0.85);
    c.translate(p.x + (192 - p.x) * progress, p.y - progress * 80);
    c.scale(1 - progress * 0.55, 1 - progress * 0.55);
    c.translate(-p.x, -p.y);
  }
  if (p.diving) {
    c.strokeStyle = '#9be6d9aa';
    c.beginPath();
    c.ellipse(p.x, p.y - 19, 9, 1.5, 0, 0, Math.PI * 2);
    c.stroke();
    c.restore();
    return;
  }
  // Water occludes every pose, including the start/end of a jump, at the actual surface.
  c.beginPath();
  c.rect(p.x - 64, p.y - 80, 128, 160);
  for (const water of s.waters) c.rect(water.x, water.y, water.w, water.bottom - water.y);
  for (const ground of s.platforms)
    if (ground.material === 'ground')
      c.rect(ground.x, ground.y, ground.w, Math.max(1, s.cameraY + CONTRA_H + 80 - ground.y));
  c.clip('evenodd');
  if (p.invincible > 0 && !reduced && Math.floor(time * 12) % 2) c.globalAlpha = 0.4;
  const name = p.id === 0 ? 'blue' : 'red';
  const pose = p.prone
    ? 'prone'
    : !p.grounded
      ? 'jump'
      : !p.swimming && p.vx && !reduced && Math.floor(time * 10) % 2
        ? 'run'
        : 'idle';
  if (p.grounded && !p.swimming) {
    c.fillStyle = '#0005';
    c.beginPath();
    c.ellipse(p.x, p.y + 1, 13, 2.7, 0, 0, Math.PI * 2);
    c.fill();
  }
  sprite(
    c,
    base ? `${name}-base-${p.prone ? 'prone' : 'idle'}` : `${name}-${pose}`,
    p.x,
    p.y + 1,
    base ? (p.prone ? 13 : 31) : pose === 'prone' ? 12 : pose === 'jump' ? 26 : 31,
    !base && p.facing < 0,
    base ? 30 : pose === 'prone' ? 37 : 38,
  );
  if (!base && (Math.sin(p.aim) || p.swimming) && pose !== 'jump') {
    c.save();
    c.translate(p.x, p.y - (p.swimming ? 23 : 17));
    c.rotate(base ? -Math.PI / 2 : p.aim);
    c.fillStyle = '#21323e';
    c.fillRect(0, -2, 15, 4);
    c.fillStyle = '#91dce9';
    c.fillRect(9, -1, 5, 1);
    c.restore();
  }
  if (p.shield > 0) {
    c.strokeStyle = '#8ae9fc';
    c.lineWidth = 1;
    c.beginPath();
    c.ellipse(p.x, p.y - 14, 19, 22, 0, 0, Math.PI * 2);
    c.stroke();
  }
  if (p.cooldown > 0.11 && !reduced) {
    const muzzle = contraMuzzle(p, base);
    glow(c, muzzle.x, muzzle.y, 2.5, '#fff1a1');
  }
  if (base) text(c, `${p.id + 1}P`, p.x, p.y + 11, p.id ? '#ffb49d' : '#a6dff7', 6, 'center');
  c.restore();
}
function background(c: Ctx, s: ContraState, reduced: boolean) {
  const name = environments[s.stage - 1],
    img = images.get(name),
    color = CONTRA_STAGES[s.stage - 1].color;
  c.fillStyle = '#112029';
  c.fillRect(0, 0, CONTRA_W, CONTRA_H);
  if (img) {
    const offset =
      contraKind(s) === 'vertical'
        ? (-s.cameraY * 0.08) % CONTRA_H
        : (-s.cameraX * 0.14) % CONTRA_W;
    if (contraKind(s) === 'vertical') {
      c.drawImage(img, 0, offset, CONTRA_W, CONTRA_H);
      c.drawImage(img, 0, offset + CONTRA_H, CONTRA_W, CONTRA_H);
    } else {
      c.drawImage(img, offset, 0, CONTRA_W, CONTRA_H);
      c.drawImage(img, offset + CONTRA_W, 0, CONTRA_W, CONTRA_H);
    }
  }
  const vignette = c.createLinearGradient(0, 0, 0, CONTRA_H);
  vignette.addColorStop(0, '#07152330');
  vignette.addColorStop(0.6, '#06142018');
  vignette.addColorStop(1, '#041019c4');
  c.fillStyle = vignette;
  c.fillRect(0, 0, CONTRA_W, CONTRA_H);
  if (!reduced)
    for (let i = 0; i < 24; i++) {
      const x = (((i * 73 + s.time * (s.stage === 5 ? 7 : -2)) % CONTRA_W) + CONTRA_W) % CONTRA_W;
      const y = (i * 43 + s.time * (s.stage === 5 ? 14 : -3) + CONTRA_H * 40) % CONTRA_H;
      c.globalAlpha = s.stage === 5 ? 0.6 : 0.2;
      c.fillStyle = s.stage === 5 ? '#e5faff' : color;
      c.fillRect(x, y, s.stage === 5 ? 1.1 : 0.6, s.stage === 5 ? 1.6 : 0.6);
    }
  c.globalAlpha = 1;
}
function baseRoom(c: Ctx, s: ContraState, zh: boolean, reduced: boolean) {
  const phase = contraBasePhase(s);
  const locked = phase === 'combat';
  const progress = Math.min(1, s.advancing / 0.85);
  c.save();
  // The floor, walls, firing windows and portal share one fixed perspective.
  c.translate(192, 112);
  c.scale(1 + progress * 0.35, 1 + progress * 0.35);
  c.translate(-192, -112);
  const room = images.get('base1');
  if (room) c.drawImage(room, 0, 0, CONTRA_W, CONTRA_H);
  else {
    c.fillStyle = '#4a555b';
    c.fillRect(0, 0, CONTRA_W, CONTRA_H);
    c.fillStyle = '#737873';
    c.beginPath();
    c.moveTo(104, 124);
    c.lineTo(280, 124);
    c.lineTo(384, 224);
    c.lineTo(0, 224);
    c.fill();
  }
  // Two sliding steel leaves reveal the actual dark doorway after the core breaks.
  c.save();
  c.beginPath();
  c.rect(148, 45, 88, 80);
  c.clip();
  c.fillStyle = '#060e14';
  c.fillRect(148, 45, 88, 80);
  if (s.door > 0) {
    const tunnel = c.createLinearGradient(0, 45, 0, 125);
    tunnel.addColorStop(0, '#07131a');
    tunnel.addColorStop(1, '#365149');
    c.fillStyle = tunnel;
    c.fillRect(157, 54, 70, 71);
    c.strokeStyle = '#72dca24a';
    c.strokeRect(169, 61, 46, 64);
    c.fillStyle = '#91ddad';
    c.fillRect(170, 60, 44, 2);
  }
  for (const side of [-1, 1]) {
    const x = side < 0 ? 148 - s.door * 44 : 192 + s.door * 44;
    const metal = c.createLinearGradient(x, 0, x + 44, 0);
    metal.addColorStop(0, '#34454d');
    metal.addColorStop(0.4, '#61717a');
    metal.addColorStop(1, '#2d3d45');
    c.fillStyle = metal;
    c.fillRect(x, 45, 44, 80);
    c.strokeStyle = '#91a1a4';
    c.strokeRect(x + 2, 47, 40, 76);
    c.fillStyle = '#21333e';
    for (let y = 54; y < 114; y += 10) c.fillRect(x + 6, y, 32, 2);
    c.fillStyle = '#d4a24a';
    c.fillRect(x + 2, 116, 40, 4);
    c.fillStyle = '#283638';
    for (let j = 0; j < 5; j++) c.fillRect(x + 3 + j * 8, 116, 4, 4);
  }
  c.restore();
  // Soldiers are visible in the two rear-wall firing ports, where their bullets originate.
  if (locked) {
    for (const x of [94, 290]) {
      c.save();
      c.beginPath();
      c.rect(x - 13, 72, 26, 19);
      c.clip();
      sprite(c, 'soldier', x, 104, 30, x > 192, 24);
      c.restore();
      if (!reduced && (s.time * 1.5) % 1 < 0.12 && (Math.floor(s.time * 1.5) % 2 ? 94 : 290) === x)
        glow(c, x, 83, 2, '#ffe29e');
    }
  }
  for (const core of s.roomCores) {
    if (core.hp <= 0 && s.door >= 1) continue;
    c.save();
    c.globalAlpha = core.hp > 0 ? 1 : 1 - s.door;
    c.fillStyle = '#202e35';
    c.beginPath();
    c.arc(core.x, core.y, 13, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = core.hp > 0 ? '#e2a95a' : '#688b80';
    c.lineWidth = 2;
    c.stroke();
    if (core.hp > 0) {
      glow(c, core.x, core.y, 7, '#f66047');
      c.fillStyle = '#ffe0a8';
      c.fillRect(core.x - 3, core.y - 3, 6, 6);
      c.fillStyle = '#101e29';
      c.fillRect(core.x - 13, core.y + 17, 26, 3);
      c.fillStyle = '#ffb46a';
      c.fillRect(core.x - 13, core.y + 17, (26 * core.hp) / core.max, 3);
      text(c, zh ? '机关' : 'CORE', core.x, core.y - 17, '#fff1d2', 6, 'center');
    } else {
      c.fillStyle = '#071117';
      c.beginPath();
      c.arc(core.x, core.y, 7, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#819189';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(core.x - 5, core.y - 5);
      c.lineTo(core.x + 5, core.y + 5);
      c.stroke();
    }
    c.restore();
  }
  if (!s.boss.active) {
    for (const x of [30, 350]) {
      c.fillStyle = '#293840';
      c.fillRect(x, 132, 5, 29);
      c.fillStyle = locked ? '#7ae2ef' : '#94ecb3';
      c.fillRect(x + 1, 133, 3, 5);
    }
    if (locked) {
      c.strokeStyle = '#80edf3';
      c.lineWidth = 1;
      c.shadowColor = '#44ddf4';
      c.shadowBlur = 5;
      for (const y of [143, 152]) {
        c.beginPath();
        c.moveTo(35, y);
        for (let x = 35; x <= 350; x += 5)
          c.lineTo(x, y + (reduced ? 0 : Math.sin(x * 0.4 + s.time * 19) * 1.3));
        c.stroke();
      }
      c.shadowBlur = 0;
    }
    if (phase === 'open' || phase === 'advancing') {
      c.strokeStyle = '#b7f6c8';
      c.lineWidth = 2;
      for (const y of [133, 152, 174]) {
        c.beginPath();
        c.moveTo(185, y + 4);
        c.lineTo(192, y - 2);
        c.lineTo(199, y + 4);
        c.stroke();
      }
    }
  }
  c.restore();
  c.fillStyle = '#0a1825dd';
  c.fillRect(105, 6, 174, 24);
  text(
    c,
    s.boss.active
      ? zh
        ? '关底 · 击破闪光弱点'
        : 'BOSS · HIT THE GLOWING CORES'
      : phase === 'combat'
        ? zh
          ? '对准红色机关射击 · ↓ 俯卧避弹'
          : 'SHOOT THE RED CORE · ↓ GO PRONE'
        : phase === 'opening'
          ? zh
            ? '机关已破坏 · 大门开启中'
            : 'CORE DESTROYED · DOOR OPENING'
          : phase === 'open'
            ? zh
              ? '通道已打开 · ↑ 前进'
              : 'DOOR OPEN · ↑ ADVANCE'
            : zh
              ? '进入下一间'
              : 'ENTERING NEXT ROOM',
    192,
    16,
    locked ? '#ffe0b8' : '#baf0cb',
    7,
    'center',
  );
  text(
    c,
    `${zh ? '房间' : 'ROOM'} ${Math.min(s.room, s.rooms)} / ${s.rooms}`,
    192,
    25,
    '#b7cad1',
    6,
    'center',
  );
}
function drawTerrain(c: Ctx, t: Platform, s: ContraState) {
  const kind =
    t.terrain ??
    (s.stage === 3
      ? 'waterfall'
      : s.stage === 5
        ? 'snow'
        : s.stage === 6
          ? 'energy'
          : s.stage === 7
            ? 'hangar'
            : s.stage === 8
              ? 'alien'
              : 'granite');
  const height = t.material === 'ground' ? Math.max(32, s.cameraY + CONTRA_H + 4 - t.y) : 20;
  const image = images.get(`terrain-${kind}`);
  c.save();
  c.beginPath();
  c.rect(t.x, t.y, t.w, height);
  c.clip();
  if (image) {
    const tileWidth = 160;
    for (let x = Math.floor(t.x / tileWidth) * tileWidth; x < t.x + t.w; x += tileWidth) {
      const tileHeight = Math.max(54, height);
      c.drawImage(image, x, t.y, tileWidth, tileHeight);
    }
  } else {
    c.fillStyle =
      kind === 'grass'
        ? '#675133'
        : kind === 'snow'
          ? '#8ebed0'
          : kind === 'alien'
            ? '#593450'
            : '#354953';
    c.fillRect(t.x, t.y, t.w, height);
  }
  c.restore();
  // Exposed vertical sides and the top edge give banks a readable height above the river.
  c.strokeStyle =
    kind === 'snow' ? '#e7f6ff' : kind === 'energy' || kind === 'hangar' ? '#ad844b' : '#778e62';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(t.x, t.y + 0.5);
  c.lineTo(t.x + t.w, t.y + 0.5);
  c.stroke();
  for (const edge of [t.x, t.x + t.w]) {
    const joins = s.platforms.some(
      (other) =>
        other !== t &&
        !other.bridge &&
        other.y === t.y &&
        (Math.abs(other.x - edge) < 0.1 || Math.abs(other.x + other.w - edge) < 0.1),
    );
    if (!joins) {
      c.fillStyle = '#071b2988';
      c.fillRect(edge === t.x ? edge : edge - 3, t.y + 1, 3, height - 1);
      c.strokeStyle = '#a5b9a344';
      c.beginPath();
      c.moveTo(edge, t.y + 1);
      c.lineTo(edge, t.y + height);
      c.stroke();
    }
  }
}
export function drawContra(c: Ctx, s: ContraState, reduced = false, zh = true) {
  c.setTransform(3, 0, 0, 3, 0, 0);
  c.clearRect(0, 0, CONTRA_W, CONTRA_H);
  c.imageSmoothingEnabled = true;
  background(c, s, reduced);
  const base = contraKind(s) === 'base';
  if (base) baseRoom(c, s, zh, reduced);
  c.save();
  c.translate(-s.cameraX, -s.cameraY);
  if (!base) {
    for (const t of s.platforms) {
      if (
        t.x + t.w < s.cameraX ||
        t.x > s.cameraX + CONTRA_W ||
        t.y < s.cameraY - 20 ||
        t.y > s.cameraY + CONTRA_H ||
        t.collapse === 0
      )
        continue;
      c.save();
      if (t.collapse !== undefined && Math.floor(t.collapse * 30) % 2) c.globalAlpha = 0.6;
      if (t.bridge) {
        // An exposed deck, individual planks, ropes and braces over the river.
        c.fillStyle = '#392922';
        c.fillRect(t.x, t.y + 5, t.w, 5);
        for (let x = t.x; x < t.x + t.w; x += 8) {
          c.fillStyle = (x / 8) % 2 ? '#b38b54' : '#d0a46b';
          c.fillRect(x, t.y - 2, 7, 7);
          c.strokeStyle = '#62482f';
          c.lineWidth = 0.6;
          c.beginPath();
          c.moveTo(x + 2, t.y);
          c.lineTo(x + 5, t.y + 3);
          c.stroke();
        }
        c.strokeStyle = '#674e36';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(t.x, t.y + 10);
        c.lineTo(t.x + t.w / 2, t.y + 22);
        c.lineTo(t.x + t.w, t.y + 10);
        c.stroke();
        c.fillStyle = '#83613d';
        c.fillRect(t.x + 2, t.y - 20, 3, 24);
        c.fillRect(t.x + t.w - 5, t.y - 20, 3, 24);
        c.strokeStyle = '#d3bc8a';
        c.lineWidth = 1;
        for (const lift of [13, 20]) {
          c.beginPath();
          c.moveTo(t.x + 4, t.y - lift);
          c.quadraticCurveTo(t.x + t.w / 2, t.y - lift + 9, t.x + t.w - 4, t.y - lift);
          c.stroke();
        }
      } else {
        drawTerrain(c, t, s);
      }
      c.restore();
    }
    for (const water of s.waters) {
      c.fillStyle = '#164d5dcc';
      c.fillRect(water.x, water.y, water.w, water.bottom - water.y);
    }
  }
  for (const h of s.hazards) {
    c.fillStyle = '#364b54';
    c.fillRect(h.x - 4, h.y - 6, h.w + 8, 7);
    if (hazardActive(s, h)) {
      c.fillStyle = h.kind === 'flame' ? '#ff9a3ccc' : '#748993';
      c.fillRect(h.x, h.y, h.w, h.h);
      if (h.kind === 'flame') {
        c.fillStyle = '#ffedaf';
        c.fillRect(h.x + h.w * 0.3, h.y, h.w * 0.4, h.h);
      }
    } else {
      c.fillStyle = '#ffb762';
      c.fillRect(h.x, h.y - 4, h.w, 2);
    }
  }
  for (const e of s.enemies) {
    if (
      e.hp <= 0 ||
      !e.active ||
      e.x < s.cameraX - 40 ||
      e.x > s.cameraX + CONTRA_W + 40 ||
      e.y < s.cameraY - 40 ||
      e.y > s.cameraY + CONTRA_H + 40
    )
      continue;
    if (e.kind === 'carrier') {
      c.fillStyle = '#293f49';
      c.beginPath();
      c.ellipse(e.x, e.y, 15, 8, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#fff0a0';
      c.lineWidth = 1;
      c.stroke();
      glow(c, e.x - 11, e.y + 3, 2, '#77f7ef');
      glow(c, e.x + 11, e.y + 3, 2, '#77f7ef');
      text(c, e.power ?? 'S', e.x, e.y + 3, '#fff5be', 8, 'center');
    } else if (e.mount === 'wall') {
      sprite(c, 'wall-turret', e.x, e.y + 10, 26, false, 26);
      c.save();
      c.translate(e.x, e.y - 3);
      c.rotate(e.angle ?? Math.PI);
      c.fillStyle = '#202d32';
      c.fillRect(0, -3, 17, 6);
      c.fillStyle = '#9aab91';
      c.fillRect(1, -2, 12, 2);
      c.fillStyle = '#111d26';
      c.fillRect(14, -3, 3, 6);
      c.restore();
    } else
      sprite(
        c,
        e.kind,
        e.x,
        e.y,
        e.kind === 'tank' ? 32 : e.kind === 'alien' ? 29 : 30,
        (s.players[0]?.x ?? 0) > e.x,
        e.kind === 'tank' ? 57 : 36,
      );
  }
  if (s.boss.active) {
    const boss = s.boss,
      img = images.get(`boss${s.stage}`),
      h = base ? 104 : s.stage === 3 ? 69 : 116,
      w = base ? (s.stage === 2 ? 164 : 130) : s.stage === 3 ? 145 : 99;
    if (img)
      c.drawImage(img, boss.x - w / 2, boss.y - (base || s.stage === 3 ? h / 2 : h * 0.6), w, h);
    for (const core of boss.cores) {
      if (core.hp <= 0) {
        c.fillStyle = '#12262aa8';
        c.beginPath();
        c.arc(core.x, core.y, 8, 0, 7);
        c.fill();
        continue;
      }
      if (s.stage !== 2)
        glow(c, core.x, core.y, 6 + (!reduced ? Math.sin(s.time * 5) : 0), '#f57862');
      c.strokeStyle = '#ffe8b1';
      c.lineWidth = 0.8;
      c.beginPath();
      c.arc(core.x, core.y, 9, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = '#061a25';
      c.fillRect(core.x - 10, core.y - 16, 20, 2);
      c.fillStyle = '#ffac74';
      c.fillRect(core.x - 10, core.y - 16, (20 * core.hp) / core.max, 2);
    }
  }
  for (const item of s.pickups) {
    c.save();
    c.shadowBlur = 8;
    c.shadowColor = '#ffe499';
    c.fillStyle = '#f6dc84';
    c.beginPath();
    c.roundRect(item.x - 9, item.y - 7, 18, 14, 4);
    c.fill();
    c.restore();
    text(c, item.power, item.x, item.y + 3, '#243d3c', 9, 'center');
  }
  for (const p of s.players) drawPlayer(c, p, s, base, reduced);
  for (const b of s.bullets) {
    c.save();
    c.translate(b.x, b.y);
    c.rotate(Math.atan2(b.vy, b.vx));
    if (b.weapon === 'L' && b.owner >= 0) {
      c.fillStyle = '#e64d40';
      c.fillRect(-18, -2, 18, 4);
      c.fillStyle = '#fff3cc';
      for (let x = -17; x < 0; x += 5) c.fillRect(x, -1, 3, 2);
    } else if (b.weapon === 'F' && b.owner >= 0) {
      c.rotate((s.time - b.phase) * 18);
      c.strokeStyle = '#f66d32';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(0, 0, 4, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = '#fff0a4';
      for (let i = 0; i < 4; i++) {
        c.rotate(Math.PI / 2);
        c.fillRect(2, -1, 3, 2);
      }
    } else {
      c.fillStyle = b.owner < 0 ? '#fb845b' : b.weapon === 'N' ? '#fff2c6' : '#f16c43';
      c.beginPath();
      c.arc(
        0,
        0,
        b.depth ? 1 + b.depth.progress * 2.2 : b.owner < 0 ? 2 : b.weapon === 'S' ? 2.8 : 2.1,
        0,
        Math.PI * 2,
      );
      c.fill();
      c.fillStyle = '#fff6d4';
      c.fillRect(-0.6, -0.8, 1.2, 1.2);
    }
    c.restore();
  }
  if (!reduced)
    for (const effect of s.impacts) {
      c.save();
      const life = effect.kind === 'spark' ? 0.16 : 0.5;
      c.globalAlpha = 1 - effect.age / life;
      if (effect.kind === 'splash') {
        c.strokeStyle = '#b2f9ed';
        c.lineWidth = 1;
        c.beginPath();
        c.ellipse(effect.x, effect.y, 4 + effect.age * 26, 1 + effect.age * 3, 0, 0, Math.PI * 2);
        c.stroke();
        for (let i = 0; i < 5; i++) {
          c.fillStyle = '#cdfef9';
          c.fillRect(
            effect.x + (i - 2) * effect.age * 20,
            effect.y - Math.sin(effect.age * 6) * ((i % 2) * 5 + 6),
            1,
            2,
          );
        }
      } else if (effect.kind === 'spark') {
        c.strokeStyle = '#ffe5a3';
        c.lineWidth = 1.4;
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3,
            r = 2 + effect.age * 45;
          c.beginPath();
          c.moveTo(effect.x + Math.cos(a) * 2, effect.y + Math.sin(a) * 2);
          c.lineTo(effect.x + Math.cos(a) * r, effect.y + Math.sin(a) * r);
          c.stroke();
        }
      } else {
        for (let i = 0; i < 7; i++) {
          const a = (i * Math.PI * 2) / 7,
            r = effect.age * 26;
          glow(
            c,
            effect.x + Math.cos(a) * r,
            effect.y + Math.sin(a) * r,
            Math.max(1, 7 - effect.age * 12),
            i % 2 ? '#ff9b43' : '#ffe5a5',
          );
        }
      }
      c.restore();
    }
  // Surface is drawn over swimmers; its coordinates are exactly the physics surface.
  for (const water of s.waters) {
    c.fillStyle = '#4babb54a';
    c.fillRect(water.x, water.y, water.w, water.bottom - water.y);
    c.strokeStyle = '#b1ede8aa';
    c.lineWidth = 0.8;
    c.beginPath();
    for (let x = water.x; x <= water.x + water.w; x += 3)
      c.lineTo(x, water.y + (!reduced ? Math.sin(x * 0.13 + s.time * 3) * 0.8 : 0));
    c.stroke();
  }
  c.restore();
  if (s.status === 'clear' || s.status === 'win') {
    c.fillStyle = '#d3fff014';
    c.fillRect(0, 0, CONTRA_W, CONTRA_H);
  }
}
