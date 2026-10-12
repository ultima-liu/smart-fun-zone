import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const packs = [
  {
    file: 'environments-atlas-v1.png',
    cols: 2,
    rows: 4,
    trim: false,
    names: ['jungle', 'base1', 'waterfall', 'base2', 'snow', 'energy', 'hangar', 'lair'],
  },
  { file: 'base-room-v2.png', cols: 1, rows: 1, trim: false, version: 'v2', names: ['base1'] },
  {
    file: 'base-characters-atlas-v1.png',
    cols: 2,
    rows: 2,
    trim: true,
    names: ['blue-base-idle', 'blue-base-prone', 'red-base-idle', 'red-base-prone'],
  },
  {
    file: 'terrain-atlas-v1.png',
    cols: 2,
    rows: 4,
    trim: false,
    names: [
      'terrain-grass',
      'terrain-granite',
      'terrain-riverbank',
      'terrain-waterfall',
      'terrain-snow',
      'terrain-energy',
      'terrain-hangar',
      'terrain-alien',
    ],
  },
  {
    file: 'characters-atlas-v1.png',
    cols: 4,
    rows: 3,
    trim: true,
    rects: {
      'blue-jump': [790, 50, 270, 275],
      'blue-prone': [1064, 195, 472, 137],
      'red-jump': [790, 355, 250, 260],
      'red-prone': [1064, 515, 472, 155],
      soldier: [0, 688, 340, 318],
      turret: [338, 686, 338, 320],
      tank: [680, 697, 475, 300],
      alien: [1156, 686, 380, 330],
    },
    names: [
      'blue-idle',
      'blue-run',
      'blue-jump',
      'blue-prone',
      'red-idle',
      'red-run',
      'red-jump',
      'red-prone',
      'soldier',
      'turret',
      'tank',
      'alien',
    ],
  },
  {
    file: 'bosses-atlas-v1.png',
    cols: 4,
    rows: 2,
    trim: true,
    names: Array.from({ length: 8 }, (_, i) => `boss${i + 1}`),
  },
  { file: 'base-boss-v2.png', cols: 1, rows: 1, trim: true, version: 'v2', names: ['boss2'] },
];
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
try {
  const page = await browser.newPage(),
    manifest = [];
  await fs.mkdir('public/assets/games/contra', { recursive: true });
  for (const pack of packs) {
    const raw = await fs.readFile(`docs/assets/contra/${pack.file}`);
    const assets = await page.evaluate(
      async ({ pack, raw }) => {
        const img = new Image();
        img.src = raw;
        await img.decode();
        const source = document.createElement('canvas');
        source.width = img.width;
        source.height = img.height;
        const ctx = source.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const pixels = ctx.getImageData(0, 0, img.width, img.height).data;
        return pack.names.map((name, i) => {
          const column = i % pack.cols,
            row = Math.floor(i / pack.cols);
          const cellX = Math.floor((column * img.width) / pack.cols),
            cellY = Math.floor((row * img.height) / pack.rows);
          const w = Math.floor(((column + 1) * img.width) / pack.cols) - cellX,
            h = Math.floor(((row + 1) * img.height) / pack.rows) - cellY;
          const bounds = pack.rects?.[name] ?? [cellX, cellY, w, h];
          const [x, y, cropW, cropH] = bounds;
          let rect = bounds;
          if (pack.trim) {
            let left = x + cropW,
              top = y + cropH,
              right = x,
              bottom = y;
            for (let cy = y; cy < y + cropH; cy++)
              for (let cx = x; cx < x + cropW; cx++)
                if (pixels[(cy * img.width + cx) * 4 + 3] > 32) {
                  left = Math.min(left, cx);
                  top = Math.min(top, cy);
                  right = Math.max(right, cx);
                  bottom = Math.max(bottom, cy);
                }
            if (left > right) throw new Error(`Empty sprite: ${name}`);
            rect = [left, top, right - left + 1, bottom - top + 1];
          }
          const c = document.createElement('canvas'),
            scale = Math.min(1, (pack.trim ? 360 : 768) / Math.max(rect[2], rect[3]));
          c.width = Math.round(rect[2] * scale);
          c.height = Math.round(rect[3] * scale);
          c.getContext('2d').drawImage(img, ...rect, 0, 0, c.width, c.height);
          return {
            name,
            rect,
            width: c.width,
            height: c.height,
            cornerAlpha: pixels[(y * img.width + x) * 4 + 3],
            data: c.toDataURL('image/webp', 0.9),
          };
        });
      },
      { pack, raw: `data:image/png;base64,${raw.toString('base64')}` },
    );
    for (const asset of assets) {
      const { data, ...info } = asset,
        file = `${asset.name}-${pack.version ?? (pack.file === 'characters-atlas-v1.png' ? 'v2' : 'v1')}.webp`,
        bytes = Buffer.from(data.split(',')[1], 'base64');
      await fs.writeFile(`public/assets/games/contra/${file}`, bytes);
      manifest.push({ ...info, file, source: pack.file, bytes: bytes.length });
    }
  }
  await fs.writeFile(
    'docs/assets/contra/imagegen-manifest.json',
    JSON.stringify(manifest, null, 2) + '\n',
  );
  console.log(manifest.map(({ name, bytes, cornerAlpha }) => ({ name, bytes, cornerAlpha })));
} finally {
  await browser.close();
}
