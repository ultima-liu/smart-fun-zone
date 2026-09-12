import { test, expect } from '@playwright/test';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

test.use({ launchOptions: { executablePath: CHROME } });

function buildState(theme: 'dark' | 'light') {
  const childId = 'c1';
  return {
    state: {
      lang: 'zh',
      theme,
      sound: true,
      musicOn: true,
      voiceOn: true,
      lessonSkipOn: false,
      profiles: [{ id: childId, name: '测试小卷', avatarId: 'girl', age: 5, createdAt: Date.now() }],
      activeChildId: childId,
      records: [],
      mastery: {},
      lessonProgress: {},
      charBag: {},
      storyDone: { [childId]: ['c1-1', 'c2-1', 'c3-1', 'c4-1', 'c5-1', 'c6-1'] },
      storyPulse: null,
      wrongs: {},
      points: { [childId]: 9999 },
      pointLog: { [childId]: [] },
      customTasks: {},
      ownedItems: {},
      equipped: {},
      avatarColor: {},
      avatarHair: {},
      storeOverrides: {},
      taskOverrides: {},
      rewardRequests: {},
      bonusMin: {},
      parentPin: '1234',
      dailyLimitMin: 0,
      buddyOpen: false,
      buddyWakeOn: false,
      expeditionLastAt: { [childId]: Date.now() - 3_600_000 },
      materials: { [childId]: { stardust: 999, cardShard: 5000 } },
      shipLevel: { [childId]: 1 },
      archivedCards: { [childId]: ['npc-a-guang','npc-tie-tuo','npc-dang-dang','npc-pao-pao','npc-xiao-juan','npc-jing-jing','mon-mist','mon-dawdle','mon-sloppy','mon-fidget','mon-quitter','hanzi-liu','hanzi-yi','hanzi-ming'] },
      cardRewardClaimed: { [childId]: [] },
      showBadges: {},
    },
    version: 1,
  };
}

test.describe.configure({ mode: 'serial' });

for (const theme of ['dark', 'light'] as const) {
  test(`星核档案库 · ${theme === 'dark' ? '深色' : '浅色'}主题`, async ({ page }) => {
    test.setTimeout(40_000);
    const logs: string[] = [];
    page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));

    // 禁用 Service Worker，避免旧构建外壳干扰
    await page.route('**/sw.js', (route) => route.abort());
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'serviceWorker', { value: { register: () => Promise.resolve({ active: null, installing: null } as any) }, configurable: true });
    });

    await page.goto('/#/');
    // 等首屏完全启动，避免 App 后续异步写回默认态覆盖注入
    await page.waitForSelector('.boot-splash.exit', { state: 'attached', timeout: 20_000 });
    await page.waitForTimeout(400);
    const payload = buildState(theme);
    await page.evaluate((data) => {
      localStorage.setItem('smart-fun-zone', JSON.stringify(data));
    }, payload);
    await page.reload();
    await page.waitForSelector('.boot-splash.exit', { state: 'attached', timeout: 20_000 });
    // 确认注入的档案已水合
    await page.waitForFunction(() => {
      try {
        const raw = localStorage.getItem('smart-fun-zone');
        return !!raw && JSON.parse(raw)?.state?.activeChildId === 'c1';
      } catch { return false; }
    }, { timeout: 15_000 }).catch(() => null);

    await page.goto('/#/archive');
    await page.waitForSelector('.boot-splash.exit', { state: 'attached', timeout: 20_000 });

    // 页面外壳与页头
    await expect(page.locator('.archive-page')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.archive-page .page-hero')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.npc-buddy-name')).toContainText('档案员晶晶');
    await expect(page.locator('.npc-buddy .npc-jingjing-figure')).toHaveCount(1);

    // 召唤面板存在
    await expect(page.locator('.summon-panel')).toBeVisible();
    await expect(page.locator('.summon-panel button')).toContainText('召唤');

    // 双层筛选（第一层套系 / 第二层稀有度）与图鉴墙
    await expect(page.locator('.filter-panels')).toBeVisible();
    await expect(page.locator('.ccard')).toHaveCount(14);

    const setTier = page.locator('.filter-tier').first();
    const rarityTier = page.locator('.filter-tier').nth(1);

    // 第一层：套系筛选 + 回全部
    await setTier.getByRole('tab', { name: /卷星人/ }).click();
    await expect(setTier.locator('.filter-chip.active')).toContainText('卷星人');
    await expect(page.locator('.ccard')).toHaveCount(6);
    // 四位 NPC 使用独立 PNG；小卷与晶晶直接复用各自的全局 NPC 组件，而非复制卡牌贴图。
    const portraitHrefs = await page.locator('.ccard image.ccard-npc-art').evaluateAll((images) =>
      images.map((image) => image.getAttribute('href')),
    );
    expect(new Set(portraitHrefs).size).toBe(4);
    expect(portraitHrefs.every((href) => href?.endsWith('.png'))).toBe(true);
    await expect(page.locator('.ccard .ccard-xiao-juan-mascot')).toHaveCount(1);
    await expect(page.locator('.ccard .ccard-jing-jing-art')).toHaveCount(1);
    await setTier.getByRole('tab', { name: /全部/ }).click();
    await expect(setTier.locator('.filter-chip.active')).toContainText('全部');
    await expect(page.locator('.ccard')).toHaveCount(14);

    // 汉字套系：三张教学卡，正面包含田字格大字、拼音、部首与笔画。
    await setTier.getByRole('tab', { name: /汉字/ }).click();
    await expect(page.locator('.ccard')).toHaveCount(3);
    await expect(page.locator('.ccard-hanzi-art')).toHaveCount(3);
    await expect(page.locator('.ccard-hanzi-art').first()).toContainText('liú');
    await setTier.getByRole('tab', { name: /全部/ }).click();

    // 第二层：稀有度筛选 + 回全部
    await rarityTier.locator('.filter-chip.c-SP').click();
    await expect(rarityTier.locator('.filter-chip.active')).toContainText('SP');
    await expect(page.locator('.ccard.c-SP')).toHaveCount(2);
    await expect(page.locator('.ccard')).toHaveCount(2);
    await rarityTier.getByRole('tab', { name: /全部/ }).click();
    await expect(page.locator('.ccard')).toHaveCount(14);

    // 组合筛选：卷星人 + SR → 铛铛、泡泡与晶晶三张
    await setTier.getByRole('tab', { name: /卷星人/ }).click();
    await rarityTier.locator('.filter-chip.c-SR').click();
    await expect(page.locator('.ccard')).toHaveCount(3);
    // 清理回全部
    await setTier.getByRole('tab', { name: /全部/ }).click();
    await rarityTier.getByRole('tab', { name: /全部/ }).click();
    await expect(page.locator('.ccard')).toHaveCount(14);

    // 点击第一张卡放大预览
    await page.locator('.ccard').first().click();
    await expect(page.locator('.card-preview-modal')).toBeVisible();
    await expect(page.locator('.card-preview-info h3')).toBeVisible();

    // 在放大预览弹窗里翻转卡片看背面
    await page.locator('.preview-card-flipbtn').click();
    await expect(page.locator('.preview-card')).toHaveClass(/flipped/);
    await expect(page.locator('.preview-card-back')).toBeVisible();
    await page.locator('.preview-card-flipbtn').click();
    await expect(page.locator('.preview-card')).not.toHaveClass(/flipped/);

    await page.locator('.card-preview-close').click();
    await expect(page.locator('.card-preview-modal')).not.toBeVisible();

    // 打开抽卡弹窗
    await page.locator('.summon-panel button').click();
    await expect(page.locator('.gacha-modal')).toBeVisible();
    await expect(page.locator('.gacha-btn.single')).toBeVisible();
    await expect(page.locator('.gacha-btn.ten')).toBeVisible();
    await page.locator('.gacha-stage button', { hasText: '关闭' }).click();
    await expect(page.locator('.gacha-modal')).not.toBeVisible();

    // 抽一次单抽，检查动画与结果区
    await page.locator('.summon-panel button').click();
    await page.locator('.gacha-btn.single').click();
    await expect(page.locator('.summon-scene.casting')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.single-reveal-card, .gacha-reveal-grid')).toBeVisible({ timeout: 12_000 });
    await page.locator('.gacha-reveal-actions button', { hasText: '再召唤一次' }).click();
    await expect(page.locator('.gacha-intro')).toBeVisible();
    await page.locator('.gacha-stage button', { hasText: '关闭' }).click();
    await expect(page.locator('.gacha-modal')).not.toBeVisible();

    expect(logs.filter((l) => l.includes('[pageerror]') || (l.includes('[error]') && !l.includes('Failed to load resource'))).join('\n')).toBe('');

    await page.screenshot({ path: `e2e/__screenshots__/archive-${theme}.png`, fullPage: true });
  });
}
