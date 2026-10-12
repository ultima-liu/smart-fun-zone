import { expect, type Locator, type Page } from '@playwright/test';

export async function dragChineseWord(page: Page, scope: Locator, word: string, index: number, touch = false) {
  const source = scope.locator('.ct-order-bank').getByRole('button', { name: word, exact: true });
  const target = scope.locator('.ct-order-slot').nth(index);
  await moveChineseWord(page, source, target, touch);
  await expect(target).toContainText(word);
}

export async function moveChineseWord(page: Page, source: Locator, target: Locator, touch = false) {
  const from = await source.boundingBox(), to = await target.boundingBox();
  if (!from || !to) throw new Error('拖放材料或目标位置不可见');
  const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const end = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
  if (touch) {
    const session = await page.context().newCDPSession(page);
    try {
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
      for (let step = 1; step <= 8; step++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (end.x - start.x) * step / 8, y: start.y + (end.y - start.y) * step / 8 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } finally { await session.detach(); }
  } else {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
  }
}
