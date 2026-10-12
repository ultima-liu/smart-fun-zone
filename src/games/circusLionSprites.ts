/** Four ImageGen poses, drawn directly from the original transparent PNG atlas. */
export const CIRCUS_LION_ATLAS = `${import.meta.env.BASE_URL}assets/games/circus/lion-atlas-v1.png`;
const CELL = 627;
const POSES = [
  { left: 29, top: 101, width: 582, height: 432, seatX: 300, seatY: 255 },
  { left: 14, top: 116, width: 593, height: 414, seatX: 280, seatY: 275 },
  { left: 25, top: 81, width: 587, height: 412, seatX: 295, seatY: 213 },
  { left: 15, top: 69, width: 585, height: 355, seatX: 285, seatY: 207 },
] as const;
let image: HTMLImageElement | null = null;
let loading: Promise<void> | null = null;

export function loadCircusLion(): Promise<void> {
  if (!loading) {
    const atlas = new Image();
    atlas.src = CIRCUS_LION_ATLAS;
    loading = atlas
      .decode()
      .then(() => {
        image = atlas;
      })
      .catch(() => {
        // The original Canvas drawing remains available if the asset cannot load.
        loading = null;
      });
  }
  return loading;
}

export function paintCircusLion(
  c: CanvasRenderingContext2D,
  x: number,
  feet: number,
  time: number,
  facing: number,
  airborne: boolean,
  moving: boolean,
) {
  if (!image) return false;
  const pose = airborne ? 3 : moving ? 1 + (Math.floor(time * 10) % 2) : 0;
  const frame = POSES[pose];
  const scale = 0.056;
  c.save();
  // Register each pose at the saddle so the separate rider never slides between frames.
  c.translate(x - 2, feet - 14);
  c.scale(facing < 0 ? -1 : 1, 1);
  c.drawImage(
    image,
    (pose % 2) * CELL + frame.left,
    Math.floor(pose / 2) * CELL + frame.top,
    frame.width,
    frame.height,
    (frame.left - frame.seatX) * scale,
    (frame.top - frame.seatY) * scale,
    frame.width * scale,
    frame.height * scale,
  );
  c.restore();
  return true;
}
