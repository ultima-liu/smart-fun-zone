// Render-only fixtures inspect door animation and art alignment, not campaign progression.
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
const bundled = await build({
  stdin: {
    contents:
      "export {createContraState,advanceContra} from './src/games/contraEngine'; export {drawContra,loadContraArtwork} from './src/games/contraArtwork';",
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
  const loaded = await page.evaluate(async () => await ContraFixture.loadContraArtwork());
  if (loaded !== 41) throw new Error(`Expected 41 decoded art assets, got ${loaded}`);
  for (const scenario of ['standing', 'prone', 'opening', 'open', 'advancing', 'boss']) {
    await page.evaluate((scenario) => {
      const s = ContraFixture.createContraState(1, 2);
      if (scenario === 'prone')
        for (let i = 0; i < 120; i++) ContraFixture.advanceContra(s, 1 / 60, [{ down: true }]);
      s.players[0].invincible = 0;
      if (['opening', 'open', 'advancing', 'boss'].includes(scenario))
        s.roomCores.forEach((c) => (c.hp = 0));
      if (scenario === 'opening') s.door = 0.5;
      if (['open', 'advancing', 'boss'].includes(scenario)) s.door = 1;
      if (scenario === 'advancing') s.advancing = 0.4;
      if (scenario === 'boss') {
        s.boss.active = true;
        s.roomCores = [];
        s.room = 7;
      }
      ContraFixture.drawContra(document.querySelector('canvas').getContext('2d'), s);
    }, scenario);
    await page
      .locator('canvas')
      .screenshot({ path: `docs/assets/contra/verification/base-render-${scenario}.png` });
  }
  console.log('41 decoded assets; 6 base rendering fixtures saved.');
} finally {
  await browser.close();
}
