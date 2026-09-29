import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const assetDir = new URL('../dist/assets/', import.meta.url);
const limits = { '.js': 170 * 1024, '.css': 120 * 1024 };
const violations = [];
const measurements = [];

for (const name of readdirSync(assetDir)) {
  const ext = name.endsWith('.js') ? '.js' : name.endsWith('.css') ? '.css' : null;
  if (!ext) continue;
  const path = join(assetDir.pathname, name);
  if (!statSync(path).isFile()) continue;
  const gzipBytes = gzipSync(readFileSync(path), { level: 9 }).byteLength;
  measurements.push({ name, gzipBytes });
  if (gzipBytes > limits[ext]) violations.push(`${name}: ${(gzipBytes / 1024).toFixed(1)} KiB gzip > ${limits[ext] / 1024} KiB`);
}

const largest = measurements.sort((a, b) => b.gzipBytes - a.gzipBytes).slice(0, 5);
console.log('Largest bundles:', largest.map((item) => `${item.name} ${(item.gzipBytes / 1024).toFixed(1)} KiB`).join(', '));
if (violations.length) {
  console.error(`Bundle budget exceeded:\n${violations.join('\n')}`);
  process.exit(1);
}
