import { BOMBER_ENEMIES, BOMBER_POWERS, type BomberEnemyKind, type BomberPower } from './bomberEngine';
const EXTRA_SPRITES = ['hero-down-idle','hero-right-idle','hero-up-idle','hero-left-idle','hero-down-walk','hero-right-walk','hero-up-walk','hero-left-walk','floor-mint','floor-sand','floor-star','wall-stone','wall-brick','exit'] as const;
export type BomberSprite = BomberEnemyKind | BomberPower | (typeof EXTRA_SPRITES)[number];
let revision = 0;
export const bomberSpriteRevision = () => revision;
export const bomberSpriteUrl = (kind: BomberSprite) => `/assets/games/bomber/${kind}-v1.webp`;
const sprites = new Map<string, HTMLImageElement>();
export function loadBomberSprites(redraw: () => void) {
  let active = true;
  for (const kind of [...Object.keys(BOMBER_ENEMIES), ...Object.keys(BOMBER_POWERS), ...EXTRA_SPRITES] as BomberSprite[]) {
    let sprite = sprites.get(kind);
    if (!sprite) { sprite = new Image(); sprite.src = bomberSpriteUrl(kind); sprites.set(kind, sprite); }
    void sprite.decode().then(() => { revision++; if (active) redraw(); }).catch(() => {});
  }
  return () => { active = false; };
}
export function drawBomberSprite(c: CanvasRenderingContext2D, kind: BomberSprite, x: number, y: number, size: number) {
  const sprite = sprites.get(kind); if (!sprite?.complete || !sprite.naturalWidth) return false;
  const scale = size / Math.max(sprite.naturalWidth, sprite.naturalHeight), w = sprite.naturalWidth * scale, h = sprite.naturalHeight * scale;
  c.drawImage(sprite, x - w / 2, y - h / 2, w, h); return true;
}
