/** ImageGen artwork is decoded once and shared by all four courses. */
const NAMES = [
  'broadleaf',
  'flowers',
  'cottage',
  'palm',
  'sailboat',
  'parasol',
  'pines',
  'rocks',
  'cabin',
  'fuel-car',
  'oil',
  'fuel-can',
  'warning',
  'grass',
  'water',
  'sand',
  'forest-floor',
] as const;
export type RoadSprite = (typeof NAMES)[number];
const images: Partial<Record<RoadSprite, HTMLImageElement>> = {};
let loading: Promise<void> | null = null;

export function loadRoadArtwork(): Promise<void> {
  if (!loading) {
    loading = Promise.all(
      NAMES.map(async (name) => {
        const image = new Image();
        image.src = `/assets/games/road-fighter/${name}-v1.webp`;
        try {
          await image.decode();
          images[name] = image;
        } catch {
          /* Keep the procedural fallback if an asset is unavailable. */
        }
      }),
    ).then(() => {});
  }
  return loading;
}
export function roadSprite(name: RoadSprite) {
  return images[name];
}

/** Fit the alpha-trimmed asset without distorting its silhouette. */
export function paintRoadSprite(
  c: CanvasRenderingContext2D,
  name: RoadSprite,
  x: number,
  y: number,
  width: number,
  height = width,
) {
  const image = images[name];
  if (!image) return false;
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const w = image.naturalWidth * scale,
    h = image.naturalHeight * scale;
  c.drawImage(image, x - w / 2, y - h / 2, w, h);
  return true;
}
