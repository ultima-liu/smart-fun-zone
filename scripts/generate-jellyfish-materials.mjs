/** Reproducible, linear PBR data maps. This does not derive physical data from a colour image. */
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
const size = 1024,
  tau = Math.PI * 2;
const clamp = (v) => Math.min(1, Math.max(0, v));
function tissue(u, v) {
  const warp = 0.27 * Math.sin(v * 17 + tau * u * 2) + 0.12 * Math.sin(v * 31 - tau * u * 3);
  const vein = Math.exp(-Math.pow(Math.sin(tau * (u * 21 + warp)) * 15, 2));
  const fork = Math.exp(-Math.pow(Math.sin(tau * (u * 37 - v * 3 + warp * 0.65)) * 24, 2));
  const grain =
    0.5 +
    Math.sin(tau * u * 3 + v * 11) * 0.22 +
    Math.cos(tau * u * 7 - v * 23) * 0.12 +
    Math.sin(tau * u * 13 + v * 41) * 0.07;
  return {
    height: vein * 0.055 + fork * 0.017 + grain * 0.026,
    vein: Math.max(vein, fork * 0.5),
    grain,
  };
}
const normal = Buffer.alloc(size * size * 3),
  optics = Buffer.alloc(size * size * 3);
for (let y = 0; y < size; y++)
  for (let x = 0; x < size; x++) {
    const u = x / size,
      v = 1 - y / size,
      i = (y * size + x) * 3,
      h = tissue(u, v);
    const dx = (tissue(u + 1 / size, v).height - tissue(u - 1 / size, v).height) * size * 0.012;
    const dy = (tissue(u, v + 1 / size).height - tissue(u, v - 1 / size).height) * size * 0.012;
    const length = Math.hypot(dx, dy, 1);
    normal[i] = Math.round((0.5 - (dx / length) * 0.5) * 255);
    normal[i + 1] = Math.round((0.5 - (dy / length) * 0.5) * 255);
    normal[i + 2] = Math.round((0.5 + (1 / length) * 0.5) * 255);
    // R = optical transmission, G = roughness, B = optical thickness.
    optics[i] = Math.round(clamp(0.96 - h.vein * 0.17 - h.grain * 0.05) * 255);
    optics[i + 1] = Math.round(clamp(0.35 + h.grain * 0.42 + h.vein * 0.18) * 255);
    optics[i + 2] = Math.round(clamp(0.1 + h.grain * 0.22 + h.vein * 0.58) * 255);
  }
const crcTable = Array.from({ length: 256 }, (_, i) => {
  let c = i;
  for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function chunk(name, data) {
  const type = Buffer.from(name),
    joined = Buffer.concat([type, data]);
  let crc = 0xffffffff;
  for (const b of joined) crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8);
  const header = Buffer.alloc(4),
    footer = Buffer.alloc(4);
  header.writeUInt32BE(data.length);
  footer.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([header, joined, footer]);
}
function png(pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;
  const rows = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++)
    pixels.copy(rows, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
for (const [name, pixels] of [
  ['jellyfish-normal-v2.png', normal],
  ['jellyfish-optics-v2.png', optics],
]) {
  const file = new URL(`../public/assets/juan-world/${name}`, import.meta.url);
  writeFileSync(file, png(pixels));
  console.log(name);
}
