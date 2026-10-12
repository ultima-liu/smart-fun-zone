import { CELL, FIELD, GRID, type TankState } from './tankEngine';
export const TANK_IMAGES = [
  'player',
  'ally',
  'basic',
  'fast',
  'power',
  'armor',
  'star',
  'tank',
  'grenade',
  'helmet',
  'clock',
  'shovel',
  'brick',
  'steel',
  'water',
  'forest',
  'ice',
  'floor',
  'base',
  'base-dead',
] as const;
type Artwork = (typeof TANK_IMAGES)[number];
export type TankArtwork = Partial<Record<Artwork, HTMLImageElement>>;
export async function loadTankArtwork(): Promise<TankArtwork> {
  const result: TankArtwork = {};
  await Promise.all(
    TANK_IMAGES.map(
      (name) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            result[name] = img;
            resolve();
          };
          img.onerror = () => resolve();
          img.src = `/assets/games/tank/${name}-v1.webp`;
        }),
    ),
  );
  return result;
}
const TILES: Artwork[] = ['floor', 'brick', 'steel', 'water', 'forest', 'ice'];
const COLORS = ['#b8b19a', '#ad6845', '#758482', '#369dc7', '#539955', '#b9e4eb'];
export class TankPainter {
  private terrain: HTMLCanvasElement | null = null;
  private revision = -1;
  private source: TankState | null = null;
  constructor(private images: TankArtwork) {}
  private terrainLayer(s: TankState) {
    if (!this.terrain) {
      this.terrain = document.createElement('canvas');
      this.terrain.width = FIELD * 2;
      this.terrain.height = FIELD * 2;
    }
    if (this.source === s && this.revision === s.revision) return this.terrain;
    this.source = s;
    this.revision = s.revision;
    const c = this.terrain.getContext('2d')!;
    c.setTransform(2, 0, 0, 2, 0, 0);
    for (let y = 0; y < 13; y++)
      for (let x = 0; x < 13; x++) this.tile(c, 'floor', x * 32, y * 32, 32);
    for (let i = 0; i < s.terrain.length; i++) {
      const type = s.terrain[i];
      if (type === 0 || type === 4) continue;
      const x = (i % GRID) * CELL,
        y = Math.floor(i / GRID) * CELL,
        img = this.images[TILES[type]];
      if (img)
        c.drawImage(
          img,
          ((x % 32) / 32) * img.width,
          ((y % 32) / 32) * img.height,
          img.width / 4,
          img.height / 4,
          x,
          y,
          CELL,
          CELL,
        );
      else {
        c.fillStyle = COLORS[type];
        c.fillRect(x, y, CELL, CELL);
      }
    }
    return this.terrain;
  }
  private tile(c: CanvasRenderingContext2D, name: Artwork, x: number, y: number, size: number) {
    const img = this.images[name];
    if (img) c.drawImage(img, x, y, size, size);
    else {
      c.fillStyle = '#afa38b';
      c.fillRect(x, y, size, size);
    }
  }
  draw(canvas: HTMLCanvasElement, s: TankState, reduced = false) {
    const c = canvas.getContext('2d');
    if (!c) return;
    c.setTransform(canvas.width / FIELD, 0, 0, canvas.height / FIELD, 0, 0);
    c.clearRect(0, 0, FIELD, FIELD);
    c.drawImage(this.terrainLayer(s), 0, 0, FIELD, FIELD);
    // The original eagle stays in the bottom centre, clearly visible behind its U-shaped wall.
    this.tile(c, s.baseAlive ? 'base' : 'base-dead', 192, 384, 32);
    for (const tank of s.tanks) {
      if (tank.born > 0) {
        c.save();
        c.translate(tank.x, tank.y);
        c.strokeStyle = '#fff4af';
        c.lineWidth = 2;
        const a = reduced ? 0 : s.time * 8;
        c.rotate(a);
        c.strokeRect(-12, -12, 24, 24);
        c.rotate(0.8);
        c.strokeRect(-8, -8, 16, 16);
        c.restore();
        continue;
      }
      const name: Artwork =
        tank.player === 0
          ? 'player'
          : tank.player === 1
            ? 'ally'
            : (['basic', 'fast', 'power', 'armor'][tank.kind] as Artwork);
      c.save();
      c.translate(tank.x, tank.y);
      c.rotate((tank.direction * Math.PI) / 2);
      c.shadowColor = '#273c3555';
      c.shadowBlur = 3;
      c.shadowOffsetY = 2;
      if (tank.carrier && (reduced || Math.floor(s.time * 6) % 2 === 0)) {
        c.shadowColor = '#ff3457';
        c.shadowBlur = 9;
      }
      if (tank.stun > 0) c.globalAlpha = 0.65 + 0.2 * Math.sin(s.time * 15);
      const img = this.images[name];
      if (img) c.drawImage(img, -14, -24, 28, 40);
      else {
        c.fillStyle = tank.player >= 0 ? '#e4bd4a' : '#bb473e';
        c.fillRect(-13, -13, 26, 26);
        c.fillRect(-3, -20, 6, 12);
      }
      c.restore();
      if (tank.kind === 3) {
        for (let n = 0; n < tank.health; n++) {
          c.fillStyle = '#ffdda0';
          c.fillRect(tank.x - 10 + n * 6, tank.y + 18, 4, 3);
        }
      }
      if (tank.shield > 0) {
        c.beginPath();
        c.arc(tank.x, tank.y, 21 + (reduced ? 0 : Math.sin(s.time * 8)), 0, Math.PI * 2);
        c.strokeStyle = '#fff9b0';
        c.lineWidth = 1.6;
        c.stroke();
      }
    }
    for (const b of s.bullets) {
      c.save();
      c.translate(b.x, b.y);
      c.rotate((b.direction * Math.PI) / 2);
      c.shadowBlur = 4;
      c.shadowColor = '#ffeaaa';
      c.fillStyle = '#fff1bd';
      c.fillRect(-2, -4, 4, 7);
      c.fillStyle = '#dc8955';
      c.fillRect(-1, 2, 2, 4);
      c.restore();
    }
    // Grass covers tanks and bullets; no collision or damage is attached to this layer.
    for (let i = 0; i < s.terrain.length; i++)
      if (s.terrain[i] === 4) {
        const x = (i % GRID) * CELL,
          y = Math.floor(i / GRID) * CELL,
          img = this.images.forest;
        if (img)
          c.drawImage(
            img,
            ((x % 32) / 32) * img.width,
            ((y % 32) / 32) * img.height,
            img.width / 4,
            img.height / 4,
            x,
            y,
            CELL,
            CELL,
          );
      }
    if (s.power && (reduced || Math.floor(s.power.age * 7.5) % 2 === 0)) {
      c.save();
      c.shadowColor = '#fcedaa';
      c.shadowBlur = 7;
      this.tile(c, s.power.kind, s.power.x - 17, s.power.y - 17, 34);
      c.restore();
    }
    for (const e of s.effects) {
      const p = e.age / e.duration;
      c.save();
      c.globalAlpha = 1 - p;
      if (e.type === 'points') {
        c.font = 'bold 13px monospace';
        c.textAlign = 'center';
        c.strokeStyle = '#223b32';
        c.lineWidth = 3;
        c.strokeText(e.text ?? '', e.x, e.y - p * 20);
        c.fillStyle = '#fffbcf';
        c.fillText(e.text ?? '', e.x, e.y - p * 20);
      } else {
        const radius = e.type === 'blast' ? 8 + p * 26 : 3 + p * 8;
        c.translate(e.x, e.y);
        c.beginPath();
        for (let n = 0; n < 16; n++) {
          const a = (n / 16) * Math.PI * 2,
            r = radius * (n % 2 ? 0.5 : 1);
          c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        c.closePath();
        c.fillStyle = '#ee6e38';
        c.fill();
        c.scale(0.55, 0.55);
        c.fillStyle = '#fff6b2';
        c.fill();
      }
      c.restore();
    }
  }
}
