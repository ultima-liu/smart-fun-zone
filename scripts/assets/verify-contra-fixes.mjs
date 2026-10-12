// Visual fixtures use the shipped rules and renderer; they are not campaign/E2E state injection.
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const bundled = await build({
  stdin: {
    contents:
      "export {createContraState} from './src/games/contraEngine'; export {drawContra,loadContraArtwork} from './src/games/contraArtwork';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'iife',
  globalName: 'ContraFixture',
  write: false,
  define: { 'import.meta.env.BASE_URL': JSON.stringify('http://localhost:5173/') },
});
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
try {
  const page = await browser.newPage({ viewport: { width: 1152, height: 672 } });
  await page.goto('http://localhost:5173/');
  await page.setContent(
    '<canvas width="1152" height="672"></canvas><style>html,body{margin:0;background:#14232b}canvas{display:block}</style>',
  );
  await page.addScriptTag({ content: bundled.outputFiles[0].text });
  await page.evaluate(async () => {
    await ContraFixture.loadContraArtwork();
  });
  for (const scenario of [
    'bridge-cannon',
    'weapons',
    'underwater',
    'jump-clean',
    'water-jump-mask',
    'river-bank',
    'terrain-grass',
    'terrain-snow',
    'terrain-energy',
    'terrain-hangar',
    'terrain-alien',
  ]) {
    await page.evaluate((scenario) => {
      const s = ContraFixture.createContraState();
      s.cameraX = 300;
      s.time = 0.7;
      s.enemies = s.enemies.filter((e) => e.mount === 'wall');
      for (const e of s.enemies) {
        e.active = true;
        e.angle = -2.8;
      }
      s.players[0].x = 380;
      s.players[0].y = 160;
      s.players[0].invincible = 0;
      if (scenario === 'weapons') {
        s.bullets = ['N', 'M', 'S', 'F', 'L'].map((weapon, i) => ({
          x: 340 + i * 62,
          y: 115,
          vx: 260,
          vy: 0,
          owner: 0,
          damage: 1,
          life: 1,
          weapon,
          phase: 0,
        }));
        s.impacts = [
          { x: 400, y: 145, kind: 'spark', age: 0.06 },
          { x: 465, y: 140, kind: 'explosion', age: 0.15 },
        ];
      }
      if (scenario === 'underwater') {
        s.players[0].x = 580;
        s.players[0].y = 214;
        s.players[0].swimming = true;
        s.players[0].diving = true;
      }
      if (scenario === 'jump-clean') {
        s.players[0].grounded = false;
        s.players[0].y = 120;
      }
      if (scenario === 'water-jump-mask') {
        s.players[0].x = 580;
        s.players[0].y = 208;
        s.players[0].grounded = false;
      }
      if (scenario === 'river-bank') {
        s.cameraX = 800;
        s.players[0].x = 1019;
        s.players[0].y = 214;
        s.players[0].swimming = true;
      }
      if (scenario.startsWith('terrain-')) {
        const stages = {
          'terrain-grass': 1,
          'terrain-snow': 5,
          'terrain-energy': 6,
          'terrain-hangar': 7,
          'terrain-alien': 8,
        };
        s.stage = stages[scenario];
        s.cameraX = 0;
        s.players = [];
        s.enemies = [];
        const name = scenario.slice(8);
        s.platforms = s.platforms.filter((t) => t.material === 'ground').slice(0, 2);
        for (const t of s.platforms) t.terrain = name;
      }
      ContraFixture.drawContra(document.querySelector('canvas').getContext('2d'), s);
    }, scenario);
    await page
      .locator('canvas')
      .screenshot({ path: `docs/assets/contra/verification/fix-${scenario}.png` });
  }
  await fs.writeFile(
    'docs/assets/contra/verification/fix-visual-report.json',
    JSON.stringify(
      {
        method: 'Rendering fixtures, separate from real-input E2E',
        scenarios: [
          'bridge-cannon',
          'weapons',
          'underwater',
          'jump-clean',
          'water-jump-mask',
          'river-bank',
          'terrain-grass',
          'terrain-snow',
          'terrain-energy',
          'terrain-hangar',
          'terrain-alien',
        ],
        size: [1152, 672],
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  await browser.close();
}
