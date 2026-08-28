import { test, expect } from '@playwright/test';

test('学科→年级→课程学习闭环', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');

  // 欢迎页：创建档案
  await expect(page.locator('.logo-name')).toBeVisible();
  await page.getByRole('button', { name: /创建小档案/ }).click();
  await page.getByRole('button', { name: /开始玩/ }).click();

  // 大厅（自由乐园）
  await expect(page.locator('.game-card')).toHaveCount(12);

  // 底部导航 → 学习世界地图（学科入口）
  await page.getByRole('link', { name: '地图', exact: true }).click();
  await expect(page.locator('.subject-grid')).toBeVisible();
  await expect(page.locator('.subject-card')).toHaveCount(6); // 6 门学科

  // 进入数学学科
  await page.locator('.subject-card', { hasText: '数学' }).click();
  await expect(page.locator('.grade-seg')).toHaveCount(6); // 一至六年级
  await expect(page.locator('.skill-chip').first()).toBeVisible();

  // 进入第一课（一年级数学上册 · 准备课·数一数）演示
  await page.locator('.skill-chip').first().click();
  await expect(page.locator('.lesson-stage')).toBeVisible();

  // 去练习（数字农场）
  await page.getByRole('button', { name: /去练习/ }).click();
  await expect(page.locator('.number-farm')).toBeVisible();

  // 完成 8 题
  for (let i = 0; i < 8; i++) {
    const animals = await page.locator('.animal').count();
    await page.locator('.answer-row .num-btn', { hasText: String(animals) }).click();
    await expect(page.locator('.feedback.ok')).toBeVisible();
    await page.locator('.feedback.ok').waitFor({ state: 'detached', timeout: 6000 });
  }
  await expect(page.locator('.result-panel')).toBeVisible();

  // 返回地图 → 再进数学：第一课应点亮
  await page.getByRole('button', { name: /返回地图/ }).click();
  await expect(page.locator('.subject-grid')).toBeVisible();
  await page.locator('.subject-card', { hasText: '数学' }).click();
  await expect(page.locator('.skill-chip').first()).toHaveClass(/lit|gold/);

  // 底部导航 → 我的
  await page.getByRole('link', { name: '我的', exact: true }).click();
  await expect(page.locator('.profile-hero')).toBeVisible();
});
