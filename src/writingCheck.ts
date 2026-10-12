export type InkPoint = { x: number; y: number };
const distance = (a: InkPoint, b: InkPoint) => Math.hypot(a.x - b.x, a.y - b.y);
export function inkLength(points: readonly InkPoint[]) {
  return points.slice(1).reduce((total, point, index) => total + distance(points[index], point), 0);
}
export function resampleInk(points: readonly InkPoint[], count = 40): InkPoint[] {
  if (!points.length) return [];
  const length = inkLength(points);
  if (!length) return Array.from({ length: count }, () => ({ ...points[0] }));
  const result: InkPoint[] = [];
  let index = 1, passed = 0;
  for (let i = 0; i < count; i++) {
    const wanted = length * i / (count - 1);
    while (index < points.length - 1 && passed + distance(points[index - 1], points[index]) < wanted) {
      passed += distance(points[index - 1], points[index]); index++;
    }
    const start = points[index - 1], end = points[index];
    const fraction = Math.min(1, (wanted - passed) / (distance(start, end) || 1));
    result.push({ x: start.x + (end.x - start.x) * fraction, y: start.y + (end.y - start.y) * fraction });
  }
  return result;
}
/** Fixed grid coordinates preserve size and placement; do not normalize a scribble into a letter. */
export function checkInkStroke(actual: readonly InkPoint[], expected: readonly InkPoint[]) {
  if (!actual.length || !expected.length || actual.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) return false;
  const targetLength = inkLength(expected), actualLength = inkLength(actual);
  if (targetLength < 5) return distance(actual[0], expected[0]) <= 10 && actualLength <= 20;
  if (actual.length < 3 || actualLength < targetLength * .55 || actualLength > targetLength * 1.65) return false;
  if (distance(actual[0], expected[0]) > 20 || distance(actual[actual.length - 1], expected[expected.length - 1]) > 20) return false;
  const drawn = resampleInk(actual), target = resampleInk(expected);
  const errors = drawn.map((point, index) => distance(point, target[index]));
  return errors.reduce((sum, error) => sum + error, 0) / errors.length <= 12 && Math.max(...errors) <= 28;
}
/** Course templates use absolute M/L/C paths; sampling runs offline without a font or vision service. */
export function strokePathPoints(path: string): InkPoint[] {
  const tokens = path.match(/[MLC]|-?\d+(?:\.\d+)?/g) ?? [];
  const points: InkPoint[] = [];
  let index = 0, mode = '', current = { x: 0, y: 0 };
  const point = () => ({ x: Number(tokens[index++]), y: Number(tokens[index++]) });
  while (index < tokens.length) {
    if (/^[MLC]$/.test(tokens[index])) mode = tokens[index++];
    if (mode === 'M' || mode === 'L') {
      current = point(); points.push(current); if (mode === 'M') mode = 'L';
    } else if (mode === 'C') {
      const first = point(), second = point(), end = point(), start = current;
      for (let step = 1; step <= 24; step++) {
        const t = step / 24, u = 1 - t;
        points.push({ x: u*u*u*start.x + 3*u*u*t*first.x + 3*u*t*t*second.x + t*t*t*end.x,
          y: u*u*u*start.y + 3*u*u*t*first.y + 3*u*t*t*second.y + t*t*t*end.y });
      }
      current = end;
    } else throw new Error('Unsupported writing template');
  }
  return points;
}
