import {
  circusBonus,
  circusCamera,
  circusObstacleX,
  circusTrapeze,
  type CircusState,
} from './circusEngine';
import { paintCircusLion } from './circusLionSprites';

// Gameplay remains in FC coordinates. Only the artwork uses a larger, smooth canvas.
export const CIRCUS_WIDTH = 960,
  CIRCUS_HEIGHT = 720;
const W = 320,
  H = 240,
  SCALE = 3;
type Ctx = CanvasRenderingContext2D;
type Paint = string | CanvasGradient;
function ellipse(
  c: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: Paint,
  stroke?: string,
) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = 0.65;
    c.stroke();
  }
}
function round(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: Paint,
  stroke?: string,
) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = 0.7;
    c.stroke();
  }
}
function path(c: Ctx, points: number[], fill: Paint, stroke?: string) {
  c.beginPath();
  c.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1]);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = 0.6;
    c.stroke();
  }
}
function line(c: Ctx, points: number[], color: string, width = 1) {
  c.beginPath();
  c.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1]);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.stroke();
}
function gradient(c: Ctx, y: number, height: number, colors: string[]) {
  const g = c.createLinearGradient(0, y, 0, y + height);
  colors.forEach((color, i) => g.addColorStop(i / (colors.length - 1), color));
  return g;
}
function star(c: Ctx, x: number, y: number, size: number, color: string) {
  const p: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5,
      r = i % 2 ? size * 0.43 : size;
    p.push(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  path(c, p, color);
}
export function circusText(
  c: Ctx,
  text: string,
  x: number,
  y: number,
  color = '#fff4dc',
  size = 7,
  align: CanvasTextAlign = 'left',
) {
  c.font = `600 ${size}px system-ui, -apple-system, sans-serif`;
  c.textAlign = align;
  c.textBaseline = 'middle';
  c.fillStyle = color;
  c.fillText(text, x, y);
}
function audience(c: Ctx, camera: number, time: number) {
  // Layered stands, soft silhouettes and warm light keep the playable objects distinct.
  const offset = -((camera * 0.3) % 160);
  for (let base = offset - 160; base < W + 160; base += 160) {
    for (let row = 0; row < 3; row++) {
      const y = 121 + row * 9;
      round(c, base, y + 2, 156, 7, 3, ['#443153', '#56345a', '#704267'][row]);
      for (let col = 0; col < 17; col++) {
        const x = base + col * 9 + 4,
          bob = Math.sin(time * 2 + col + row * 3) * 0.5;
        ellipse(
          c,
          x,
          y + bob - 3,
          2.2,
          2.5,
          ['#9e8193', '#c39892', '#d0b49d', '#c1a9b6'][(col + row) % 4],
        );
        ellipse(
          c,
          x,
          y + bob + 1,
          3.4,
          3.3,
          ['#6577a6', '#ad637d', '#8b7ea8', '#8e9d9c'][(col * 3 + row) % 4],
        );
      }
    }
  }
  round(c, 0, 151, W, 6, 2, '#a25267');
  c.fillStyle = '#f1b67d';
  c.fillRect(0, 151, W, 1.2);
  for (let x = -camera % 22; x < W; x += 22) {
    star(c, x, 154, 1.5, '#eec388');
  }
}
function backdrop(c: Ctx, s: CircusState, time: number) {
  const camera = circusCamera(s);
  c.fillStyle = gradient(c, 0, 185, ['#20223e', '#50314e', '#83515f']);
  c.fillRect(0, 0, W, H);
  // Bigtop roof: draped velvet and stitched gold seams, rather than an old console frame.
  c.fillStyle = gradient(c, 0, 57, ['#6c2348', '#ac4760']);
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(W, 0);
  c.lineTo(W, 33);
  for (let x = W; x >= 0; x -= 40) c.quadraticCurveTo(x - 20, 57, x - 40, 33);
  c.closePath();
  c.fill();
  for (let x = 0; x <= W; x += 40) {
    c.beginPath();
    c.moveTo(x, 0);
    c.quadraticCurveTo(x + 20, 15, x + 20, 40);
    c.strokeStyle = '#e7a96d50';
    c.lineWidth = 0.7;
    c.stroke();
    ellipse(c, x + 20, 43, 1.3, 2.3, '#ffd7a2');
  }
  // Spotlights and drifting sparkles are decorative, independent of the simulation.
  const cones = [
    [35, 110, 210],
    [275, 105, 285],
  ];
  for (const [x, left, right] of cones) {
    const light = gradient(c, 35, 150, ['#ffe2b426', '#f9dc9d03']);
    path(c, [x, 33, left, 184, right, 184], light);
    ellipse(c, x, 35, 4, 2, '#ffdeb0');
  }
  for (let i = 0; i < 28; i++) {
    const x = (i * 71.3 + 19) % W,
      y = 58 + ((i * 31.7) % 65);
    const alpha = 0.25 + Math.sin(time * 0.8 + i) * 0.15;
    c.globalAlpha = alpha;
    star(c, x, y, i % 4 ? 0.7 : 1.7, '#ffe1b0');
  }
  c.globalAlpha = 1;
  // Floating banners repeat with the scrolling landscape.
  for (let x = -((camera * 0.2) % 280) - 280; x < W + 280; x += 280) {
    const bx = x + 170;
    line(c, [bx, 52, bx, 90], '#e0b583', 0.7);
    path(c, [bx - 15, 53, bx + 15, 53, bx + 15, 79, bx, 89, bx - 15, 79], '#913a62', '#d8a876');
    star(c, bx, 68, 6, '#f4d193');
    c.beginPath();
    c.arc(bx, 68, 10, 0, Math.PI * 2);
    c.strokeStyle = '#e9ba794d';
    c.lineWidth = 0.6;
    c.stroke();
  }
  audience(c, camera, time);
  c.fillStyle = gradient(c, 157, 82, ['#db9676', '#b96c62', '#8e4c58']);
  c.fillRect(0, 157, W, 83);
  // A broad oval ring and wooden floor establish the arena without hiding gaps.
  ellipse(c, 164, 174, 196, 16, '#ebbc8a');
  ellipse(c, 164, 174, 185, 12, '#df9c76');
  for (let y = 184; y < H; y += 12) {
    line(c, [0, y, W, y], '#713d4929', 0.7);
    const offset = Math.floor(y / 12) % 2 ? 0 : 30;
    for (let x = ((-camera * 0.7) % 72) + offset; x < W; x += 72)
      line(c, [x, y, x, y + 12], '#713d4920', 0.6);
  }
  line(c, [0, 195, W, 195], '#f5cba0', 1);
  c.fillStyle = gradient(c, 215, 25, ['#6b394400', '#542c4870']);
  c.fillRect(0, 215, W, 25);
}
function performer(
  c: Ctx,
  x: number,
  feet: number,
  time: number,
  facing: number,
  airborne: boolean,
  hanging: boolean,
) {
  c.save();
  c.translate(x, feet);
  c.scale(facing < 0 ? -1 : 1, 1);
  const stride = airborne ? 1.5 : Math.sin(time * 13) * 1.7;
  // Boots and trousers, articulated in two halves.
  line(c, [-2, -7, -3 - stride, -2, -4 - stride, 0], '#f9e4cc', 2.5);
  line(c, [2, -7, 3 + stride, -2, 5 + stride, 0], '#f9e4cc', 2.5);
  round(c, -7 - stride, -1, 5, 2, 1, '#824258');
  round(c, 3 + stride, -1, 5, 2, 1, '#824258');
  const coat = gradient(c, -13, 8, ['#ff91ac', '#c94e85']);
  path(c, [-4, -13, 4, -13, 5, -7, 2, -5, 0, -7, -2, -5, -5, -7], coat, '#8c3e65');
  path(c, [-3, -13, 0, -10, 3, -13, 2, -14, -2, -14], '#fff1d9');
  ellipse(c, 0.1, -9, 0.6, 0.6, '#ffd486');
  ellipse(c, 0.1, -7.5, 0.6, 0.6, '#ffd486');
  if (hanging) {
    line(c, [-3, -12, -6, -18, -5, -24], '#e99c86', 1.6);
    line(c, [3, -12, 6, -18, 5, -24], '#e99c86', 1.6);
  } else {
    line(c, [-3, -12, -6, -9 + stride, -8, -10 + stride], '#f3b398', 1.8);
    line(c, [3, -12, 6, -10 - stride, 8, -12 - stride], '#f3b398', 1.8);
    round(c, -6, -13, 3, 4, 1, '#ea709c');
    round(c, 3, -13, 3, 4, 1, '#ea709c');
  }
  ellipse(c, 0, -17, 4.7, 5, '#ffc6a5', '#b86567');
  ellipse(c, -3.5, -17, 1.1, 1.6, '#d67767');
  ellipse(c, -1.2, -17.6, 0.65, 0.9, '#443753');
  ellipse(c, 2.3, -17.6, 0.65, 0.9, '#443753');
  ellipse(c, -2.3, -15.4, 1.2, 0.7, '#f19092');
  ellipse(c, 3.3, -15.4, 1.1, 0.7, '#f19092');
  ellipse(c, 1, -16.3, 1, 0.8, '#d85872');
  c.beginPath();
  c.arc(1, -15.2, 1.4, 0.2, Math.PI - 0.2);
  c.strokeStyle = '#964956';
  c.lineWidth = 0.6;
  c.stroke();
  round(c, -3.8, -23, 7.3, 3.8, 1.2, '#4d577d');
  round(c, -5.7, -20.4, 11, 1.1, 0.5, '#f4d8a3');
  line(c, [-3.5, -22.2, 3.1, -22.2], '#ffb2b9', 0.65);
  star(c, 2.2, -22.3, 0.9, '#ffdc8f');
  c.restore();
}
function lion(c: Ctx, x: number, feet: number, time: number, facing: number, airborne: boolean) {
  c.save();
  c.translate(x, feet);
  c.scale(facing < 0 ? -1 : 1, 1);
  const stride = airborne ? 2 : Math.sin(time * 12) * 2;
  c.beginPath();
  c.moveTo(-16, -8);
  c.bezierCurveTo(-23, -6, -23, -18, -20, -19);
  c.strokeStyle = '#dda256';
  c.lineWidth = 1.8;
  c.stroke();
  ellipse(c, -20, -19, 2, 2.3, '#9d653b');
  for (const [base, step] of [
    [-10, stride],
    [-5, -stride],
    [8, stride],
    [13, -stride],
  ]) {
    line(c, [base, -8, base + step, -2, base + step + 1, 0], '#edb55a', 2.7);
    ellipse(c, base + step + 1, -0.7, 2.4, 1.2, '#f9d183');
  }
  ellipse(c, -1, -9, 16, 6.3, gradient(c, -15, 12, ['#f9d17e', '#dda253']), '#ad713e');
  // Scalloped mane and friendly face.
  for (let i = 0; i < 11; i++) {
    const a = (i * Math.PI * 2) / 11;
    ellipse(
      c,
      15 + Math.cos(a) * 5,
      -13 + Math.sin(a) * 5,
      3.2,
      3.3,
      i % 2 ? '#b57543' : '#d28d48',
    );
  }
  ellipse(c, 15, -13, 5.3, 5.6, '#ffd988', '#9e6b3d');
  ellipse(c, 12, -13.5, 0.7, 1, '#553d3d');
  ellipse(c, 17, -13.5, 0.7, 1, '#553d3d');
  ellipse(c, 15, -10.8, 3.2, 2.1, '#fff0c2');
  ellipse(c, 15, -11.5, 1.2, 0.8, '#83504c');
  line(c, [15, -11, 15, -9.6, 13.5, -9.3], '#a76b4d', 0.45);
  line(c, [15, -9.6, 16.5, -9.3], '#a76b4d', 0.45);
  round(c, -9, -16, 15, 4, 1.5, '#ce5b85', '#954165');
  line(c, [-8, -15, 5, -15], '#ffdb97', 0.65);
  c.restore();
}
function monkey(c: Ctx, x: number, feet: number, time: number, purple: boolean) {
  c.save();
  c.translate(x, feet);
  const body = purple ? '#9863b9' : '#b2775d',
    shade = purple ? '#623f87' : '#794c48',
    step = Math.sin(time * (purple ? 18 : 12)) * 2;
  c.beginPath();
  c.moveTo(5, -4);
  c.bezierCurveTo(14, -1, 14, -15, 10, -12);
  c.strokeStyle = body;
  c.lineWidth = 1.7;
  c.stroke();
  line(c, [-2, -4, -5 - step, -0.5, -7 - step, 0], shade, 2);
  line(c, [2, -4, 5 + step, -0.5, 7 + step, 0], body, 2);
  ellipse(c, 0, -7, 4.2, 5.2, body, shade);
  ellipse(c, -5, -13, 2.6, 2.4, body);
  ellipse(c, 5, -13, 2.6, 2.4, body);
  ellipse(c, 0, -13, 5.2, 5.3, body, shade);
  ellipse(c, -0.2, -12.5, 3.8, 3.7, '#f5c79f');
  ellipse(c, -1.8, -13, 0.6, 0.8, '#443449');
  ellipse(c, 1.4, -13, 0.6, 0.8, '#443449');
  c.beginPath();
  c.arc(-0.2, -11.8, 1.2, 0, Math.PI);
  c.strokeStyle = '#916653';
  c.lineWidth = 0.6;
  c.stroke();
  line(c, [-3, -8, 3, -8], purple ? '#cbe4cc' : '#efbe7d', 1);
  c.restore();
}
function horse(c: Ctx, x: number, feet: number, time: number, airborne: boolean) {
  c.save();
  c.translate(x, feet);
  const stride = airborne ? 2.2 : Math.sin(time * 16) * 3;
  c.beginPath();
  c.moveTo(-14, -11);
  c.bezierCurveTo(-24, -16, -17, -3, -22, -5);
  c.strokeStyle = '#807094';
  c.lineWidth = 3;
  c.stroke();
  for (const [base, step] of [
    [-10, stride],
    [-6, -stride],
    [8, -stride],
    [12, stride],
  ]) {
    line(c, [base, -8, base + step, -3, base + step - 1, 0], '#f1e7df', 2.5);
    round(c, base + step - 3, -1, 4, 1.6, 0.6, '#7b6585');
  }
  ellipse(c, -1, -10, 15, 6, '#fff2e4', '#bb96a1');
  path(c, [8, -13, 13, -23, 18, -21, 18, -9], '#fff2e4', '#bb96a1');
  line(c, [10, -15, 12, -19, 13, -23], '#9e809b', 2.5);
  ellipse(c, 17, -21, 5.5, 3.5, '#fff2e4', '#bb96a1');
  path(c, [13, -23, 13, -28, 16, -24], '#f0ddd3');
  ellipse(c, 17, -22, 0.7, 0.8, '#69516d');
  ellipse(c, 21, -20.5, 0.6, 0.45, '#b88994');
  line(c, [16, -24, 18, -19, 21, -20], '#d27285', 0.9);
  round(c, -8, -16, 13, 4, 1, '#648aa1', '#49677c');
  line(c, [-7, -14.5, 4, -14.5], '#f5cd99', 0.8);
  c.restore();
}
function flame(c: Ctx, x: number, y: number, time: number, size = 6) {
  c.save();
  c.translate(x, y);
  const wiggle = Math.sin(time * 13 + x) * 1.2;
  c.beginPath();
  c.moveTo(-size * 0.6, 0);
  c.bezierCurveTo(-size, -size * 0.7, -size * 0.2, -size, -size * 0.1, -size * 1.6 + wiggle);
  c.bezierCurveTo(size * 0.4, -size * 0.8, size, -size * 0.4, size * 0.5, 0);
  c.closePath();
  c.fillStyle = gradient(c, -size * 1.6, size * 1.6, ['#ffd797', '#ff9a46', '#eb6171']);
  c.fill();
  c.beginPath();
  c.moveTo(-size * 0.25, 0);
  c.quadraticCurveTo(-size * 0.1, -size * 0.8, 0, -size);
  c.quadraticCurveTo(size * 0.6, -size * 0.3, size * 0.2, 0);
  c.fillStyle = '#fff2bd';
  c.fill();
  c.restore();
}
/** The suspended hoop is viewed obliquely, with fire attached to its metal rim. */
function hoop(c: Ctx, x: number, time: number, front: boolean) {
  c.save();
  if (!front) {
    for (let y = 49; y < 76; y += 4) ellipse(c, x, y, 1.2, 2.5, '#0000', '#c7bbad');
    round(c, x - 2, 43, 4, 3, 1, '#d9c9af', '#635368');
  }
  const start = front ? -Math.PI / 2 : Math.PI / 2;
  // Fire grows outward; the open center remains readable as the jump target.
  for (let i = 0; i <= 18; i++) {
    const a = start + (i * Math.PI) / 18;
    c.save();
    c.translate(x + Math.cos(a) * 13, 126 + Math.sin(a) * 47);
    c.rotate(a + Math.PI / 2);
    flame(c, 0, 0, time + i * 0.17, 3.2 + Math.sin(time * 9 + i) * 0.7);
    c.restore();
  }
  for (const [width, color] of [
    [3.4, '#76372b'],
    [2.5, '#ff762b'],
    [1.1, '#ffe6a6'],
  ] as const) {
    c.beginPath();
    c.ellipse(x, 126, 13, 47, 0, start, start + Math.PI);
    c.lineWidth = width;
    c.strokeStyle = color;
    c.stroke();
  }
  c.restore();
}
function firePot(c: Ctx, x: number, time: number) {
  ellipse(c, x, 190, 13, 2.1, '#47304945');
  // Cast-iron brazier, side handles, three feet and a glowing bed of coals.
  line(c, [x - 7, 185, x - 9, 189, x - 5, 189], '#424451', 1.5);
  line(c, [x + 7, 185, x + 9, 189, x + 5, 189], '#424451', 1.5);
  line(c, [x, 185, x, 189], '#424451', 1.5);
  ellipse(c, x - 10, 180, 2, 2, '#0000', '#c79860');
  ellipse(c, x + 10, 180, 2, 2, '#0000', '#c79860');
  c.beginPath();
  c.moveTo(x - 10, 178);
  c.bezierCurveTo(x - 9, 188, x + 9, 188, x + 10, 178);
  c.closePath();
  c.fillStyle = gradient(c, 177, 10, ['#707487', '#303547']);
  c.fill();
  ellipse(c, x, 178, 10, 2.3, '#3e2330', '#deaa61');
  for (let i = -6; i <= 6; i += 3) ellipse(c, x + i, 178, 1.8, 1, '#ff6b25');
  for (const [offset, size] of [
    [-6, 4.2],
    [0, 7.5],
    [5, 5.4],
  ])
    flame(c, x + offset, 177, time + offset, size);
  line(c, [x - 7, 182, x + 7, 182], '#c99962', 0.7);
  ellipse(c, x, 183, 1.1, 1.1, '#e1b473');
}
function circusBall(c: Ctx, x: number, id: number, time: number) {
  ellipse(c, x, 191, 13, 2.4, '#75455930');
  c.save();
  c.translate(x, 176);
  c.rotate(-time + id);
  c.beginPath();
  c.arc(0, 0, 12, 0, Math.PI * 2);
  c.clip();
  // Broad colored gores and cream seams distinguish a balancing ball from an ornament.
  c.fillStyle = '#fff2d1';
  c.fillRect(-12, -12, 24, 24);
  for (let i = 0; i < 6; i++) {
    c.beginPath();
    c.moveTo(0, -12);
    c.bezierCurveTo(-16 + i * (32 / 6), -6, -16 + i * (32 / 6), 6, 0, 12);
    c.bezierCurveTo(-16 + (i + 1) * (32 / 6), 6, -16 + (i + 1) * (32 / 6), -6, 0, -12);
    c.fillStyle = ['#da475d', '#fff1ce', '#428eb9', '#fff1ce', '#e7b330', '#fff1ce'][i];
    c.fill();
  }
  c.restore();
  const shade = c.createRadialGradient(x - 4, 171, 0, x + 2, 177, 15);
  shade.addColorStop(0, '#ffffff70');
  shade.addColorStop(0.48, '#ffffff00');
  shade.addColorStop(1, '#3c274a99');
  ellipse(c, x, 176, 12, 12, shade, '#725066');
  ellipse(c, x - 4, 170, 2.6, 1.3, '#fff8e960');
}
function hurdle(c: Ctx, x: number, tall: boolean) {
  const h = tall ? 48 : 26,
    y = 184 - h;
  ellipse(c, x, 189, 15, 2, '#56364835');
  // White and scarlet horizontal rails, braced between two striped posts.
  round(c, x - 10, y + 2, 20, h - 2, 0.5, '#9e374f');
  for (let yy = y + 4; yy < 181; yy += 8) {
    round(c, x - 10, yy, 20, 3.6, 0.5, '#fff0cf', '#c4a183');
    line(c, [x - 8, yy + 1, x + 8, yy + 1], '#fff9e4', 0.6);
  }
  for (const xx of [x - 12, x + 9]) {
    round(c, xx, y - 1, 3, h + 5, 0.8, '#fff0cf', '#aa5261');
    for (let yy = y + 2; yy < 183; yy += 9)
      path(c, [xx, yy, xx + 3, yy - 2, xx + 3, yy + 2, xx, yy + 4], '#d85067');
    ellipse(c, xx + 1.5, y - 2, 2.2, 1.6, '#e8bf70', '#a87754');
    round(c, xx - 3, 186, 9, 2, 0.6, '#9d5265');
  }
  round(c, x - 10, y, 20, 3, 0.7, '#f5cc89', '#b37a5a');
}
function spring(c: Ctx, x: number) {
  ellipse(c, x, 194, 23, 2.1, '#483b5633');
  // A taut fabric bed inside a steel frame, visible coils and splayed legs.
  for (const xx of [x - 17, x + 17]) {
    line(c, [xx, 184, xx + (xx < x ? -3 : 3), 193], '#485b72', 2);
    round(c, xx + (xx < x ? -5 : 1), 192, 5, 2, 0.6, '#d2c1ac');
  }
  path(c, [x - 20, 178, x + 16, 178, x + 21, 183, x - 16, 183], '#b8c5c7', '#445c70');
  path(c, [x - 15, 179, x + 13, 179, x + 16, 182, x - 13, 182], '#397f91', '#e9dba9');
  for (let i = -12; i <= 12; i += 4) {
    line(c, [x + i, 182, x + i - 1, 183, x + i + 1, 184, x + i, 185], '#4c5c70', 0.6);
  }
  round(c, x - 18, 183, 38, 3, 0.9, '#da586f', '#994359');
  line(c, [x - 16, 183.5, x + 17, 183.5], '#ffcab0', 0.6);
}
function hud(c: Ctx, s: CircusState, best: number) {
  round(c, 8, 8, 85, 18, 7, '#231f3ab8', '#f4cba22c');
  star(c, 19, 17, 3, '#ffd488');
  circusText(c, String(s.score).padStart(6, '0'), 28, 17, '#fff0d7', 8);
  round(c, 104, 8, 107, 18, 7, '#231f3ab8', '#f4cba22c');
  circusText(
    c,
    `ACT ${String(s.round * 5 + s.stage).padStart(2, '0')} · BONUS ${circusBonus(s)}`,
    157.5,
    17,
    '#ffe1ba',
    6.5,
    'center',
  );
  round(c, 222, 8, 90, 18, 7, '#231f3ab8', '#f4cba22c');
  circusText(c, `HI ${Math.max(20000, best, s.score)}`, 267, 17, '#ffe1ba', 7, 'center');
}
export function drawCircus(c: Ctx, s: CircusState, best: number, reducedMotion = false) {
  c.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  c.imageSmoothingEnabled = true;
  const camera = circusCamera(s),
    time = reducedMotion ? 0 : s.stageTime;
  backdrop(c, s, time);
  if (s.stage === 2) {
    for (let x = -camera % 150; x < W; x += 150) {
      round(c, x, 144, 4, 48, 2, '#c5ab8d');
      round(c, x - 3, 191, 10, 3, 1, '#8f5a64');
    }
    line(c, [0, 146, W, 146], '#694464', 2.5);
    line(c, [0, 144.8, W, 144.8], '#f8d9aa', 1.1);
    for (let x = -camera % 9; x < W; x += 9) line(c, [x, 144.8, x + 3, 144.8], '#c77a85', 1.1);
  }
  for (const o of s.obstacles) {
    const x = circusObstacleX(s, o) - camera;
    if (x < -80 || x > W + 80) continue;
    if (o.kind === 'hoop') hoop(c, x, time, false);
    if (o.kind === 'pot') firePot(c, x, time);
    if (o.kind === 'monkey') monkey(c, x, 145, time, !!o.variant);
    if (o.kind === 'ball') circusBall(c, x, o.id, time);
    if (o.kind === 'hurdle') hurdle(c, x, !!o.variant);
    if (o.kind === 'trampoline') spring(c, x);
    if (o.kind === 'trapeze') {
      const bar = circusTrapeze(s, o),
        bx = bar.x - camera;
      line(c, [x - 1, 42, bx - 5, bar.y], '#d6b59a', 0.75);
      line(c, [x + 1, 42, bx + 5, bar.y], '#d6b59a', 0.75);
      round(c, bx - 8, bar.y - 0.5, 16, 3, 1.2, '#dcab69', '#7b5660');
      line(c, [bx - 6, bar.y, bx + 6, bar.y], '#ffe2a4', 0.7);
      round(c, bx - 6, bar.y - 1, 2, 4, 0.6, '#d4d0c4');
      round(c, bx + 4, bar.y - 1, 2, 4, 0.6, '#d4d0c4');
      ellipse(c, x, 42, 2, 2, '#edbd82');
    }
  }
  const goal = s.end - camera;
  if (goal < W + 70) {
    const y = s.stage === 3 ? 164 : s.stage === 2 ? 145 : s.stage === 5 ? 183 : 184;
    round(c, goal - 30, y, 70, 13, 3, gradient(c, y, 13, ['#8cbfc2', '#588695']), '#edcfac');
    line(c, [goal - 29, y + 1, goal + 39, y + 1], '#e7f0d8', 1.5);
    for (let x = goal - 24; x < goal + 40; x += 12) star(c, x, y + 8, 1.8, '#e8cfa1');
    line(c, [goal + 27, y, goal + 27, y - 40], '#eec99d', 1);
    path(c, [goal + 27, y - 40, goal + 44, y - 35, goal + 27, y - 29], '#b04f7b');
    circusText(c, 'BRAVO!', goal + 7, y - 13, '#fff0ca', 5.8, 'center');
  }
  const px = s.x - camera,
    py = s.y;
  if (s.stage === 1) {
    ellipse(c, px, 191, 20, 2.7, '#80536925');
    if (
      !paintCircusLion(c, px, py, time, s.facing, !s.grounded, !reducedMotion && Math.abs(s.vx) > 1)
    )
      lion(c, px, py, time, s.facing, !s.grounded);
    performer(c, px - 2, py - 14, time, s.facing, !s.grounded, false);
  } else if (s.stage === 4) {
    ellipse(c, px, 192, 21, 2.8, '#80536925');
    horse(c, px, py, time, !s.grounded);
    performer(c, px - 3, py - 15, time, 1, !s.grounded, false);
  } else performer(c, px, py, time, s.facing, !s.grounded, s.stage === 5 && s.support !== null);
  for (const o of s.obstacles)
    if (o.kind === 'hoop') {
      const x = circusObstacleX(s, o) - camera;
      if (x > -25 && x < W + 25) hoop(c, x, time, true);
    }
  // Distance and life readouts sit on the stage apron, away from the action.
  for (let x = Math.floor(camera / 200) * 200; x < camera + W; x += 200) {
    circusText(
      c,
      Math.max(0, Math.ceil((s.end - x) / 20)) + ' m',
      x - camera + 12,
      220,
      '#f6d5b3',
      6,
    );
  }
  for (let i = 0; i < Math.min(7, s.lives); i++) {
    const x = 13 + i * 9;
    path(
      c,
      [
        x,
        233,
        x - 3.5,
        230,
        x - 3.5,
        227.5,
        x - 1.5,
        226,
        x,
        228,
        x + 1.5,
        226,
        x + 3.5,
        227.5,
        x + 3.5,
        230,
      ],
      '#f5b0be',
    );
  }
  circusText(c, `GAME ${s.mode}`, W - 13, 232, '#f4d3b0', 6, 'right');
  hud(c, s, best);
}
