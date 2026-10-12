import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const output = 'docs/assets/contra/verification';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const report = [];
try {
  for (const viewport of [
    { width: 1440, height: 1100 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport, hasTouch: true });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.clock.install({ time: new Date('2026-10-04T12:00:00Z') });
    await page.addInitScript(() => {
      localStorage.setItem(
        'smart-fun-zone',
        JSON.stringify({
          state: {
            lang: 'zh',
            theme: 'dark',
            sound: false,
            voiceOn: false,
            profiles: [
              {
                id: 'contra-visual',
                name: '小战士',
                avatar: '🐼',
                ageBand: 'g3',
                createdAt: Date.now(),
              },
            ],
            activeChildId: 'contra-visual',
            points: { 'contra-visual': 25 },
            records: [],
            dailyLimitMin: 0,
            buddyOpen: false,
            buddyWakeOn: false,
          },
          version: 6,
        }),
      );
    });
    await page.goto('http://localhost:5173/#/lobby');
    await page.getByRole('tab', { name: /敏捷/ }).click();
    await page
      .getByRole('article')
      .filter({ hasText: '魂斗罗 · 一代' })
      .screenshot({ path: `${output}/base-card-${viewport.width}.png` });
    await page.getByRole('button', { name: '进入魂斗罗' }).click();
    const game = page.locator('.contra-game');
    await game.locator('canvas[data-art-loaded="41"]').waitFor();
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
    await game.getByRole('button', { name: /02 基地一/ }).click();
    for (const theme of ['dark', 'light']) {
      await page.evaluate(
        (theme) => document.documentElement.setAttribute('data-theme', theme),
        theme,
      );
      await game.screenshot({ path: `${output}/base-${theme}-ready-${viewport.width}.png` });
    }
    await game.getByRole('button', { name: '开始行动' }).click();
    await page.keyboard.down('j');
    await page.keyboard.down('ArrowDown');
    await page.clock.runFor(700);
    await game.screenshot({ path: `${output}/base-combat-${viewport.width}.png` });
    await page.clock.runFor(3000);
    await page.keyboard.up('j');
    await page.keyboard.up('ArrowDown');
    await game.screenshot({ path: `${output}/base-open-${viewport.width}.png` });
    const measurements = await game.evaluate((root) => ({
      doorOpen: root.querySelector('canvas').getAttribute('data-base-phase') === 'open',
      advanceHeight: root.querySelector('.contra-base-objective button').getBoundingClientRect()
        .height,
      noOverflow: document.documentElement.scrollWidth <= innerWidth,
      minControl: Math.min(
        ...[...root.querySelectorAll('.contra-controller button')].map((b) =>
          Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height),
        ),
      ),
      allArt: root.querySelector('canvas').getAttribute('data-art-loaded'),
      floatingHidden: [...document.querySelectorAll('.npc-buddy, .buddy-fab')].every(
        (el) => getComputedStyle(el).display === 'none',
      ),
    }));
    report.push({ viewport, errors, ...measurements });
    if (
      errors.length ||
      !measurements.doorOpen ||
      measurements.advanceHeight < 44 ||
      !measurements.noOverflow ||
      measurements.minControl < 44 ||
      measurements.allArt !== '41' ||
      !measurements.floatingHidden
    )
      throw new Error(JSON.stringify(report.at(-1)));
    await page.close();
  }
  await fs.writeFile(`${output}/base-layout-report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(report);
} finally {
  await browser.close();
}
