import {
  ROAD_COURSES,
  roadAt,
  roadEntityX,
  type RoadKind,
  type RoadState,
} from './roadFighterEngine';
import { paintRoadSprite, roadSprite, type RoadSprite } from './roadFighterSprites';
export { loadRoadArtwork } from './roadFighterSprites';

export const ROAD_WIDTH = 480,
  ROAD_HEIGHT = 680,
  ROAD_PLAYER_Y = 526,
  ROAD_SCALE = 3;
type Ctx = CanvasRenderingContext2D;
const hash = (n: number) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const patterns = new WeakMap<Ctx, Partial<Record<RoadSprite, CanvasPattern>>>();
function terrain(c: Ctx, name: RoadSprite, distance: number, alpha = 0.8) {
  const image = roadSprite(name);
  if (!image) return;
  let cache = patterns.get(c);
  if (!cache) {
    cache = {};
    patterns.set(c, cache);
  }
  const pattern = cache[name] ?? c.createPattern(image, 'repeat');
  if (!pattern) return;
  cache[name] = pattern;
  const offset =
    (((distance * ROAD_SCALE) % image.naturalHeight) + image.naturalHeight) % image.naturalHeight;
  c.save();
  c.globalAlpha = alpha;
  c.translate(0, offset);
  c.fillStyle = pattern;
  c.fillRect(0, -offset, ROAD_WIDTH, ROAD_HEIGHT);
  c.restore();
}
function ellipse(
  c: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string | CanvasGradient,
) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}
function round(c: Ctx, x: number, y: number, w: number, h: number, r: number, color: string) {
  c.fillStyle = color;
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}
function tree(c: Ctx, x: number, y: number, scale: number, pine: boolean) {
  if (paintRoadSprite(c, pine ? 'pines' : 'broadleaf', x, y, 62 * scale, 72 * scale)) return;
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  ellipse(c, 7, 10, 19, 12, '#103c3942');
  round(c, -2, 0, 4, 20, 2, '#826043');
  if (pine) {
    for (let i = 0; i < 3; i++) {
      c.fillStyle = ['#164c50', '#21676a', '#34867b'][i];
      c.beginPath();
      c.moveTo(0, -25 + i * 9);
      c.lineTo(-17 + i * 3, 9 + i * 3);
      c.lineTo(17 - i * 3, 9 + i * 3);
      c.closePath();
      c.fill();
      c.strokeStyle = '#78b69855';
      c.beginPath();
      c.moveTo(0, -20 + i * 9);
      c.lineTo(-11 + i * 2, 4 + i * 3);
      c.stroke();
    }
  } else {
    ellipse(c, -9, -2, 15, 16, '#36764b');
    ellipse(c, 9, -4, 15, 18, '#4f8b50');
    ellipse(c, 0, -14, 18, 15, '#76a85d');
    ellipse(c, -7, -18, 9, 6, '#abd17960');
    c.fillStyle = '#d4e68e';
    c.fillRect(4, -19, 2, 2);
    c.fillRect(-12, -7, 2, 2);
  }
  c.restore();
}
function house(c: Ctx, x: number, y: number, flip: number) {
  if (paintRoadSprite(c, 'cottage', x, y, 74, 88)) return;
  c.save();
  c.translate(x, y);
  c.scale(flip, 1);
  round(c, -23, -21, 53, 56, 3, '#23483538');
  round(c, -26, -26, 48, 52, 2, '#e7caa4');
  round(c, -31, -31, 58, 44, 3, '#b76d55');
  c.fillStyle = '#d78d67';
  c.fillRect(-31, -31, 27, 44);
  for (let j = 0; j < 5; j++) {
    c.fillStyle = '#824f442f';
    c.fillRect(-31, -29 + j * 9, 58, 2);
  }
  round(c, 10, -19, 8, 15, 1, '#dfb890');
  c.fillStyle = '#f4dbb0';
  c.fillRect(10, -20, 8, 3);
  c.fillStyle = '#648590';
  c.fillRect(-18, 15, 9, 7);
  c.fillRect(8, 15, 9, 7);
  c.restore();
}
function scenery(c: Ctx, s: RoadState) {
  const base = ['#80a36b', '#318caa', '#459fb3', '#547c72'][s.course];
  c.fillStyle = base;
  c.fillRect(0, 0, ROAD_WIDTH, ROAD_HEIGHT);
  terrain(
    c,
    s.course === 0 ? 'grass' : s.course === 3 ? 'forest-floor' : 'water',
    s.distance,
    s.course === 3 ? 0.87 : 0.8,
  );
  if (s.course === 1 || s.course === 2) {
    for (let y = -30; y < ROAD_HEIGHT + 30; y += 22) {
      c.beginPath();
      c.strokeStyle = y % 44 === 0 ? '#d2faf615' : '#123e620c';
      c.lineWidth = 2;
      for (let x = 0; x <= ROAD_WIDTH; x += 8) {
        const yy =
          y + Math.sin(x / 25 + s.distance / 42 + y) * 3 + ((s.distance * ROAD_SCALE) % 22);
        if (!x) c.moveTo(x, yy);
        else c.lineTo(x, yy);
      }
      c.stroke();
    }
  }
  if (s.course === 2) {
    c.beginPath();
    c.moveTo(0, 0);
    for (let y = 0; y <= ROAD_HEIGHT; y += 12) {
      const r = roadAt(s.course, s.distance + (ROAD_PLAYER_Y - y) / ROAD_SCALE);
      c.lineTo(r.right + 29 + Math.sin((y - s.distance * ROAD_SCALE) / 90) * 9, y);
    }
    c.lineTo(0, ROAD_HEIGHT);
    c.fillStyle = '#d7c394';
    c.fill();
    c.save();
    c.clip();
    terrain(c, 'sand', s.distance, 0.92);
    c.restore();
    c.beginPath();
    for (let y = 0; y <= ROAD_HEIGHT; y += 8) {
      const r = roadAt(s.course, s.distance + (ROAD_PLAYER_Y - y) / ROAD_SCALE);
      const x = r.right + 29 + Math.sin((y - s.distance * ROAD_SCALE) / 90) * 9;
      if (!y) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.strokeStyle = '#e6f7de95';
    c.lineWidth = 5;
    c.stroke();
  }
  const first = Math.floor((s.distance - 70) / 20),
    last = Math.ceil((s.distance + 190) / 20);
  for (let band = first; band <= last; band++) {
    const z = band * 20,
      y = ROAD_PLAYER_Y - (z - s.distance) * ROAD_SCALE;
    const road = roadAt(s.course, z);
    if (s.course === 1) {
      for (const side of [-1, 1]) {
        const x = side < 0 ? road.left - 26 : road.right + 26;
        round(c, x - 9, y - 11, 18, 50, 2, '#15496250');
        round(c, x - 5, y - 12, 10, 35, 2, '#c3cec9');
        c.fillStyle = '#eef1dd';
        c.fillRect(x - 5, y - 12, 3, 35);
      }
      if (band % 7 === 0) {
        const side = band % 14 === 0 ? 1 : -1;
        const x = side > 0 ? road.right + 70 : road.left - 70;
        if (!paintRoadSprite(c, 'sailboat', x, y, 53, 88)) {
          ellipse(c, x, y, 12, 4, '#e4e9cd');
          round(c, x - 5, y - 10, 10, 12, 2, '#fff4dc');
        }
      }
      continue;
    }
    for (const side of [-1, 1]) {
      if (s.course === 2 && side > 0) continue;
      const x =
        side < 0 ? road.left - 27 - hash(band * 3) * 44 : road.right + 27 + hash(band * 7) * 40;
      const scale = 0.75 + hash(band * 13) * 0.4;
      // Landscape sprites stay entirely outside the kerbs and do not mask traffic.
      const safeX = side < 0 ? Math.min(x, road.left - 38) : Math.max(x, road.right + 38);
      if (s.course === 0) {
        if ((band + (side < 0 ? 0 : 3)) % 7 === 2) house(c, safeX, y, side);
        else if (band % 3 === 1 && roadSprite('flowers'))
          paintRoadSprite(c, 'flowers', safeX, y, 46, 50);
        else tree(c, safeX, y + hash(band) * 14, scale, false);
        c.fillStyle = '#e4d898';
        c.fillRect(x + 20, y + 15, 3, 3);
        c.fillStyle = '#d99591';
        c.fillRect(x - 23, y + 9, 3, 3);
      } else if (s.course === 2) {
        if (band % 5 === 1 && roadSprite('parasol'))
          paintRoadSprite(c, 'parasol', safeX, y, 67, 76);
        else if (!paintRoadSprite(c, 'palm', safeX, y + hash(band) * 14, 70 * scale, 80 * scale))
          tree(c, safeX, y, scale, false);
      } else {
        if ((band + (side < 0 ? 0 : 4)) % 9 === 3 && roadSprite('cabin'))
          paintRoadSprite(c, 'cabin', safeX, y, 73, 86);
        else if (band % 4 === 0 && roadSprite('rocks'))
          paintRoadSprite(c, 'rocks', safeX, y, 59, 60);
        else tree(c, safeX, y + hash(band) * 14, scale, true);
      }
    }
  }
}
function roadRibbon(c: Ctx, s: RoadState, offset: number, color: string, width: number) {
  c.beginPath();
  c.strokeStyle = color;
  c.lineWidth = width;
  for (let y = 0; y <= ROAD_HEIGHT; y += 8) {
    const r = roadAt(s.course, s.distance + (ROAD_PLAYER_Y - y) / ROAD_SCALE);
    const x = offset === 0 ? r.center : offset < 0 ? r.left + offset + 1 : r.right + offset - 1;
    if (y === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.stroke();
}
function surface(c: Ctx, s: RoadState) {
  c.beginPath();
  for (let y = 0; y <= ROAD_HEIGHT; y += 8) {
    const r = roadAt(s.course, s.distance + (ROAD_PLAYER_Y - y) / ROAD_SCALE);
    if (!y) c.moveTo(r.left, y);
    else c.lineTo(r.left, y);
  }
  for (let y = ROAD_HEIGHT; y >= 0; y -= 8)
    c.lineTo(roadAt(s.course, s.distance + (ROAD_PLAYER_Y - y) / ROAD_SCALE).right, y);
  c.closePath();
  c.fillStyle = '#3a4851';
  c.fill();
  roadRibbon(c, s, -5, '#19353655', 12);
  roadRibbon(c, s, 5, '#19353655', 12);
  roadRibbon(c, s, -2, '#ede5cc', 6);
  roadRibbon(c, s, 2, '#ede5cc', 6);
  // Alternating painted kerbs and a consistent, distance-scrolling lane pattern.
  for (let y = -32; y < ROAD_HEIGHT + 32; y += 8) {
    const z = s.distance + (ROAD_PLAYER_Y - y) / ROAD_SCALE,
      r = roadAt(s.course, z);
    c.fillStyle = Math.floor(z / 9) % 2 ? '#de7c68' : '#f0e9d2';
    c.fillRect(r.left - 3, y, 5, 9);
    c.fillRect(r.right - 2, y, 5, 9);
    if (Math.floor(z / 12) % 2 === 0) {
      c.fillStyle = '#d9e0d8a8';
      c.fillRect(r.center - r.width / 6, y, 3, 9);
      c.fillRect(r.center + r.width / 6, y, 3, 9);
    }
    if (Math.floor(z / 5) % 3 === 0) {
      c.fillStyle = '#dce0d607';
      c.fillRect(r.left + 20, y, r.width - 40, 1);
    }
  }
  roadRibbon(c, s, -11, s.course === 1 ? '#e5ecdf' : '#385e4344', s.course === 1 ? 3 : 1);
  roadRibbon(c, s, 11, s.course === 1 ? '#e5ecdf' : '#385e4344', s.course === 1 ? 3 : 1);
  for (const z of [0, ROAD_COURSES[s.course].length]) {
    const y = ROAD_PLAYER_Y - (z - s.distance) * ROAD_SCALE;
    if (y < -40 || y > ROAD_HEIGHT + 40) continue;
    const r = roadAt(s.course, z);
    for (let i = 0; i < Math.floor(r.width / 12); i++)
      for (let j = 0; j < 3; j++) {
        c.fillStyle = (i + j) % 2 ? '#24343a' : '#fff6df';
        c.fillRect(r.left + i * 12, y + j * 10, 12, 10);
      }
    if (z > 0) {
      c.font = 'bold 16px sans-serif';
      c.textAlign = 'center';
      c.fillStyle = '#fff9e1';
      c.fillText('FINISH', r.center, y - 14);
    }
  }
  const marker = Math.floor(s.distance / 500) + 1,
    z = marker * 500,
    y = ROAD_PLAYER_Y - (z - s.distance) * ROAD_SCALE;
  if (y > -30 && y < ROAD_HEIGHT) {
    const r = roadAt(s.course, z);
    c.fillStyle = '#c5cbb9';
    c.fillRect(r.right + 15, y, 3, 25);
    round(c, r.right + 4, y - 13, 27, 23, 3, '#e4ead4');
    c.font = 'bold 10px monospace';
    c.fillStyle = '#37535a';
    c.textAlign = 'center';
    c.fillText(String(marker / 2), r.right + 17, y + 2);
  }
}
export function drawRoadCar(
  c: Ctx,
  x: number,
  y: number,
  kind: RoadKind | 'player',
  angle = 0,
  time = 0,
) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  const truck = kind === 'truck',
    w = truck ? 40 : 29,
    h = truck ? 82 : 54;
  if (kind === 'oil') {
    if (!paintRoadSprite(c, 'oil', 0, 0, 62, 37)) {
      ellipse(c, 2, 3, 34, 20, '#111d25aa');
      const g = c.createRadialGradient(-6, -4, 1, 0, 0, 32);
      g.addColorStop(0, '#2b304a');
      g.addColorStop(0.65, '#111c2b');
      g.addColorStop(1, '#080e18');
      ellipse(c, 0, 0, 29, 16, g);
      ellipse(c, -7, -5, 19, 5, '#b089dc88');
      ellipse(c, 8, 5, 17, 4, '#69cece80');
    }
    c.strokeStyle = '#ffe0a1';
    c.lineWidth = 2.5;
    c.setLineDash([5, 4]);
    c.beginPath();
    c.ellipse(0, 0, 34, 21, 0, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);
    if (!paintRoadSprite(c, 'warning', 0, -33, 24, 23)) {
      c.fillStyle = '#f6d086';
      c.beginPath();
      c.moveTo(0, -42);
      c.lineTo(-12, -23);
      c.lineTo(12, -23);
      c.closePath();
      c.fill();
      c.fillStyle = '#3c3540';
      c.font = 'bold 15px sans-serif';
      c.textAlign = 'center';
      c.fillText('!', 0, -26);
    }
    c.restore();
    return;
  }
  if (kind === 'fuel' && paintRoadSprite(c, 'fuel-car', 0, 0, 35, 57)) {
    c.restore();
    return;
  }
  ellipse(c, 5, 5, w * 0.7, h * 0.52, '#11232d65');
  for (const side of [-1, 1]) {
    round(c, (side * w) / 2 - 3, -h * 0.33, 6, 13, 2, '#172029');
    round(c, (side * w) / 2 - 3, h * 0.2, 6, 13, 2, '#172029');
  }
  const palette =
    kind === 'player'
      ? ['#ffb193', '#e75649', '#a52d3b']
      : kind === 'yellow'
        ? ['#fff1a8', '#e7b759', '#b07838']
        : kind === 'red'
          ? ['#ffc5ad', '#c87361', '#90474d']
          : kind === 'blue'
            ? ['#afd6f0', '#6594cb', '#3e5c94']
            : kind === 'truck'
              ? ['#e5e8d6', '#9baea5', '#596f75']
              : ['#d4f6c0', '#81c887', '#4b7a78'];
  const paint = c.createLinearGradient(-w / 2, 0, w / 2, 0);
  paint.addColorStop(0, palette[2]);
  paint.addColorStop(0.3, palette[1]);
  paint.addColorStop(0.48, palette[0]);
  paint.addColorStop(0.65, palette[1]);
  paint.addColorStop(1, palette[2]);
  c.fillStyle = paint;
  c.beginPath();
  c.roundRect(-w / 2, -h / 2, w, h, truck ? 3 : 8);
  c.fill();
  if (truck) {
    round(c, -16, -36, 32, 18, 2, '#bdcfbb');
    round(c, -14, -33, 28, 9, 2, '#263e4a');
    round(c, -17, -12, 34, 48, 2, '#c5cdc3');
    for (let j = 0; j < 6; j++) {
      c.fillStyle = '#8eaaa0';
      c.fillRect(-15, -7 + j * 7, 30, 1);
    }
    c.fillStyle = '#edf0dc';
    c.fillRect(-17, -12, 3, 48);
  } else {
    if (kind === 'player') {
      c.fillStyle = '#fff4e1';
      c.fillRect(-7, -25, 4, 49);
      c.fillRect(3, -25, 4, 49);
    }
    if (kind === 'fuel') {
      for (let j = 0; j < 5; j++) {
        c.fillStyle = ['#ed8da5', '#f4d580', '#a8dea1', '#80cdd6', '#b4a9de'][
          (j + Math.floor(time * 6)) % 5
        ];
        c.fillRect(-11, -22 + j * 9, 22, 8);
      }
    }
    const glass = c.createLinearGradient(0, -17, 0, 16);
    glass.addColorStop(0, '#b4dfdd');
    glass.addColorStop(0.32, '#325568');
    glass.addColorStop(1, '#203547');
    c.fillStyle = glass;
    c.beginPath();
    c.moveTo(-10, -13);
    c.lineTo(10, -13);
    c.lineTo(8, 1);
    c.lineTo(-8, 1);
    c.closePath();
    c.fill();
    c.fillStyle = '#f6e4c744';
    c.fillRect(-8, -12, 14, 2);
    round(c, -8, 3, 16, 9, 3, palette[1]);
    round(c, -9, 14, 18, 7, 2, '#294454');
    c.fillStyle = '#c2e6dd50';
    c.fillRect(-8, 14, 16, 2);
    round(c, -17, -7, 4, 4, 1, palette[1]);
    round(c, 13, -7, 4, 4, 1, palette[1]);
  }
  round(c, -w / 2 + 2, -h / 2 + 2, 6, 3, 1, '#fff6c5');
  round(c, w / 2 - 8, -h / 2 + 2, 6, 3, 1, '#fff6c5');
  round(c, -w / 2 + 2, h / 2 - 6, 6, 3, 1, '#f08670');
  round(c, w / 2 - 8, h / 2 - 6, 6, 3, 1, '#f08670');
  c.strokeStyle = '#fffcde90';
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(-w / 2 + 2, -h / 2 + 7);
  c.lineTo(-w / 2 + 2, h / 2 - 9);
  c.stroke();
  c.restore();
}
export function drawRoad(c: Ctx, s: RoadState, reduced = false) {
  c.save();
  scenery(c, s);
  surface(c, s);
  for (const e of s.entities) {
    if (!e.active) continue;
    const y = ROAD_PLAYER_Y - (e.z - s.distance) * ROAD_SCALE;
    if (y < -90 || y > ROAD_HEIGHT + 90) continue;
    const x = roadEntityX(s, e);
    drawRoadCar(c, x, y, e.kind, 0, reduced ? 0 : s.elapsed);
    if (e.kind === 'fuel') {
      round(c, x - 20, y - 47, 40, 16, 8, '#e6f8d9');
      c.fillStyle = '#346252';
      c.font = 'bold 10px monospace';
      c.textAlign = 'center';
      c.fillText('+7 F', x, y - 35);
    }
  }
  if (s.spin > 0) {
    c.strokeStyle = '#19262ca6';
    c.lineWidth = 3;
    for (const offset of [-10, 10]) {
      c.beginPath();
      c.moveTo(s.x + offset, ROAD_PLAYER_Y + 20);
      c.quadraticCurveTo(
        s.x + offset - s.spinDirection * 25,
        ROAD_PLAYER_Y + 40,
        s.x + offset - s.spinDirection * 50,
        ROAD_PLAYER_Y + 100,
      );
      c.stroke();
    }
  }
  if (s.crashTime > 0) {
    const time = 1 - s.crashTime / 0.9;
    for (let i = 0; i < 18; i++) {
      const a = i * 2.4,
        radius = 8 + time * (20 + hash(i) * 36);
      ellipse(
        c,
        s.x + Math.cos(a) * radius,
        ROAD_PLAYER_Y + Math.sin(a) * radius,
        3 + (1 - time) * 11,
        3 + (1 - time) * 9,
        i % 3 ? '#efad69' : '#f5eac3',
      );
    }
    ellipse(c, s.x, ROAD_PLAYER_Y, 18 * (1 - time), 24 * (1 - time), '#fff4cd');
  } else {
    if (s.speed > 210 && !reduced) {
      const exhaust = 5 + Math.sin(s.elapsed * 37) * 2;
      ellipse(c, s.x - 9, ROAD_PLAYER_Y + 33, 3, exhaust, '#efc6a67a');
      ellipse(c, s.x + 9, ROAD_PLAYER_Y + 33, 3, exhaust, '#efc6a67a');
    }
    c.globalAlpha = s.invulnerable > 0 && !reduced ? 0.55 + Math.sin(s.elapsed * 30) * 0.25 : 1;
    drawRoadCar(
      c,
      s.x,
      ROAD_PLAYER_Y,
      'player',
      s.spin ? Math.sin(s.elapsed * 14) * 0.7 * s.spinDirection : 0,
    );
    c.globalAlpha = 1;
  }
  if (s.cameo > 0) {
    const y = ROAD_HEIGHT - (4 - s.cameo) * 190;
    c.save();
    c.translate(42, y);
    c.fillStyle = '#e99a70';
    c.beginPath();
    c.moveTo(-8, 4);
    c.lineTo(14, 31);
    c.lineTo(5, 3);
    c.closePath();
    c.fill();
    round(c, -7, -2, 14, 22, 5, '#e5dbc1');
    ellipse(c, 0, -9, 7, 8, '#f5c5a4');
    round(c, -6, -14, 12, 6, 2, '#405c71');
    c.fillStyle = '#496c8d';
    c.fillRect(-3, 1, 6, 13);
    c.restore();
  }
  const vignette = c.createRadialGradient(240, 340, 170, 240, 340, 440);
  vignette.addColorStop(0, '#10243200');
  vignette.addColorStop(1, '#10243240');
  c.fillStyle = vignette;
  c.fillRect(0, 0, ROAD_WIDTH, ROAD_HEIGHT);
  c.restore();
}
