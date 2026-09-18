import { test, expect } from '@playwright/test';

test.use({ launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('english-g3a-seeded')) return;
    const id = 'english-g3a-child';
    localStorage.setItem('smart-fun-zone', JSON.stringify({ state: {
      lang: 'zh', theme: 'dark', sound: false, musicOn: false, voiceOn: false,
      profiles: [{ id, name: '英语体验生', avatarId: 'boy', age: 8, createdAt: Date.now() }], activeChildId: id,
      records: [], mastery: {}, lessonProgress: {}, charBag: {}, storyDone: { [id]: ['p1'] }, storyPulse: null,
      wrongs: {}, points: { [id]: 0 }, pointLog: { [id]: [] }, customTasks: {}, ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {}, storeOverrides: {}, taskOverrides: {}, rewardRequests: {}, bonusMin: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false, expeditionLastAt: {}, materials: {}, shipLevel: {}, archivedCards: {}, cardRewardClaimed: {}, showBadges: {},
    }, version: 0 }));
    sessionStorage.setItem('english-g3a-seeded', '1');
  });
});

async function readAllSource(page: import('@playwright/test').Page) {
  await completeListeningRoutine(page);
  const count = await page.locator('.en-source-item').count();
  for (let i = 0; i < count; i++) await page.locator('.en-source-item').nth(i).click();
  if (await page.locator('.en-read-explorer').count()) {
    const candidates = page.locator('.en-evidence-check button');
    for (let i = 0; i < await candidates.count(); i++) {
      await candidates.nth(i).click();
      if (await page.locator('.en-evidence-check button.correct').count()) break;
    }
  }
  if (await page.locator('.en-project-roadmap').count()) await page.locator('.en-project-start button').first().click();
  await expect(page.getByRole('button', { name: '教材内容看完了，去实际表达 →' })).toBeEnabled();
  await page.getByRole('button', { name: '教材内容看完了，去实际表达 →' }).click();
}

async function completeListeningRoutine(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '▶ 慢速示范' }).click();
  await page.getByRole('button', { name: '▶ 只听声音' }).click();
  await page.locator('.en-blind-pick button').first().click();
  await page.getByRole('button', { name: '🎙 跟着音频读' }).click();
  await expect(page.locator('.en-listening-routine.complete')).toBeVisible();
}

test('教材目录到单课、原声播放、知识延伸和未完成听力任务时的诚实反馈', async ({ page }) => {
  await page.goto('/#/subject/english');
  await expect(page.getByRole('heading', { name: '三年级英语上册' })).toBeVisible();
  await expect(page.locator('.en-unit-tabs button')).toHaveCount(7);
  await expect(page.locator('.en-lesson-card')).toHaveCount(7);
  await page.locator('.en-lesson-card').first().click();
  await expect(page.getByRole('heading', { name: 'Making friends · 主题与问题' })).toBeVisible();
  await expect(page.getByRole('img', { name: /教材第 2 页/ })).toBeVisible();
  await page.getByRole('button', { name: 'Are they friends?' }).click();
  await page.getByRole('button', { name: '带着问题去听读 →' }).click();
  const originalAudio = page.locator('.en-audio-slot.ready audio');
  await expect(originalAudio).toBeVisible();
  await expect(originalAudio).toHaveAttribute('src', '/assets/english-textbook/audio/friends-opening-song.mp3');
  await readAllSource(page);
  await page.getByRole('button', { name: 'Nice to meet you.', exact: true }).click();
  await page.getByRole('button', { name: '把方法用到新情境 →' }).click();
  await page.getByRole('button', { name: '看着她，等她说完' }).click();
  await page.getByRole('button', { name: '完成这节课，查看反馈 →' }).click();
  await expect(page.getByText('本次获得 2 星，历史最高 2 星。', { exact: false })).toBeVisible();
  await expect(page.getByText('教材原版歌曲、语音辨音或只听判断还未练到', { exact: false })).toBeVisible();
  await page.goto('/#/subject/english');
  await expect(page.locator('.en-lesson-card').first()).toHaveClass(/done/);
});

test('学习反馈的到期复习站可进入、可完成并保存状态', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('sfz-english-g3a-flow-v5:english-g3a-child:friends-a', JSON.stringify({
      phase: 4,
      unlocked: 4,
      stars: 2,
      reviewStartedAt: Date.now(),
      reviewDoneDays: [],
    }));
  });
  await page.goto('/#/english-course/friends-a');
  await expect(page.getByText('本课学习反馈')).toBeVisible();
  const today = page.getByRole('button', { name: '今天复习，现在开始' });
  await expect(today).toBeEnabled();
  await expect(page.getByRole('button', { name: /第 2 天复习，2 天后开放/ })).toBeDisabled();
  await today.click();
  const session = page.getByLabel('今天词句复习任务');
  await expect(session).toBeVisible();
  await expect(session.locator('.en-review-cards article')).toHaveCount(7);
  const cards = session.locator('.en-review-cards article');
  for (let index = 0; index < await cards.count(); index++) {
    await cards.nth(index).getByRole('button', { name: '听一听' }).click();
    await cards.nth(index).getByRole('button', { name: '跟读' }).click();
    await expect(page.getByRole('dialog', { name: /跟读：/ })).toBeVisible();
    await expect(page.locator('.en-player')).toHaveCSS('background-image', /linear-gradient/);
    await page.getByRole('button', { name: '我已跟读' }).click();
    await expect(page.getByRole('dialog', { name: /跟读：/ })).toBeHidden();
  }
  await expect(session.getByText('7 / 7')).toBeVisible();
  await session.getByRole('button', { name: '完成本次复习' }).click();
  await expect(page.getByRole('button', { name: '今天复习，已完成，可再次复习' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: '今天复习，已完成，可再次复习' })).toBeVisible();
});

test('角色扮演由系统接话，孩子只在自己的轮次进入跟读', async ({ page }) => {
  await page.goto('/#/english-course/friends-a');
  await page.getByRole('button', { name: 'Are they friends?' }).click();
  await page.getByRole('button', { name: '带着问题去听读 →' }).click();
  const stage = page.getByLabel('课本对话角色扮演');
  await expect(stage).toBeVisible();
  await stage.getByRole('button', { name: '我来演 Mike' }).click();
  await expect(stage.getByText('系统演 Wu Binbin / Sarah / John')).toBeVisible();
  await stage.getByRole('button', { name: '开始演出 →' }).click();
  await expect(stage.getByRole('button', { name: '🎙 我来说' })).toBeVisible();
  await stage.getByRole('button', { name: '🎙 我来说' }).click();
  await expect(page.getByRole('dialog', { name: /跟读：Hello! I’m Mike Black/ })).toBeVisible();
  await page.getByRole('button', { name: '我已跟读' }).click();
  await expect(stage.locator('.system-line.said')).toHaveCount(1, { timeout: 4500 });
  await expect(stage.getByText('系统正在说…')).toHaveCount(0);
});

test('听读原课：Part A 按教材四个栏目分区，对话、词汇和活动不混排', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/#/english-course/friends-a');
  await page.getByRole('button', { name: 'Are they friends?' }).click();
  await page.getByRole('button', { name: '带着问题去听读 →' }).click();
  // 听读阶段不再显示教材情境栏，全部宽度给听读内容（教材图只在看图与预测等阶段出现）
  await expect(page.locator('.en-stage-layout--source')).toBeVisible();
  await expect(page.locator('.en-page-reference')).toHaveCount(0);
  const layoutBox = await page.locator('.en-stage-layout--source').boundingBox();
  const sourceBox = await page.locator('.en-stage-main').boundingBox();
  expect(layoutBox).not.toBeNull();
  expect(sourceBox).not.toBeNull();
  expect(Math.abs((sourceBox?.width ?? 0) - (layoutBox?.width ?? 0))).toBeLessThan(3);
  await page.setViewportSize({ width: 820, height: 900 });
  const talkBox = await page.locator('.en-textbook-block--talk').boundingBox();
  const practiceBox = await page.locator('.en-textbook-block--practice').boundingBox();
  expect(practiceBox?.y ?? 0).toBeGreaterThan((talkBox?.y ?? 0) + (talkBox?.height ?? 0) - 3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 3)).toBeFalsy();
  await page.setViewportSize({ width: 1280, height: 900 });
  // 语音与声音关闭时连播按钮禁用，不假装能自动朗读
  await expect(page.getByRole('button', { name: '▶ 连续听读' })).toBeDisabled();
  // P4/P5 按 Let’s talk / Role-play / Let’s learn / Listen and do 四块呈现
  await expect(page.locator('.en-textbook-block')).toHaveCount(4);
  await expect(page.locator('.en-textbook-block > header b')).toHaveText(['Let’s talk', 'Role-play', 'Let’s learn', 'Listen and do']);
  await expect(page.locator('.en-textbook-block--talk .en-bubble')).toHaveCount(4);
  await expect(page.locator('.en-textbook-block--practice .en-bubble')).toHaveCount(2);
  await expect(page.locator('.en-textbook-block--learn .en-word-card')).toHaveCount(5);
  await expect(page.locator('.en-textbook-block--learn .en-word-art-frame--painted')).toHaveCount(5);
  await expect(page.locator('.en-textbook-block--activity .en-source-line')).toHaveCount(5);
  await expect(page.locator('.en-block-scene')).toHaveCount(4);
  await expect(page.locator('.en-textbook-block--talk .en-bubble.left').first()).toContainText('Mike');
  await expect(page.locator('.en-textbook-block--talk .en-bubble.right').first()).toContainText('Wu Binbin');
  // 单词拆成单词卡，点读后标记已读
  await expect(page.locator('.en-word-card')).toHaveCount(5);
  await page.locator('.en-word-card').first().click();
  await expect(page.locator('.en-word-card.seen').first()).toBeVisible();
  await expect(page.getByRole('img', { name: '点读进度 6%，已点读或查看 1 / 18 项' })).toBeVisible();
  // 全部点读完成后进度环点亮并撒花庆祝
  const sourceCount = await page.locator('.en-source-item').count();
  for (let i = 0; i < sourceCount; i++) await page.locator('.en-source-item').nth(i).click();
  await expect(page.locator('.en-source-progress.complete')).toBeVisible();
  await expect(page.locator('.confetti')).toBeVisible();
  await expect(page.getByText('教材内容已逐项看过，可以动手表达了。')).toBeVisible();
  await completeListeningRoutine(page);

  // 字母课：字母卡展示大小写与例词
  await page.goto('/#/english-course/friends-letters');
  await page.getByRole('button', { name: 'Are they friends?' }).click();
  await page.getByRole('button', { name: '带着问题去听读 →' }).click();
  await expect(page.locator('.en-letter-card')).toHaveCount(4);
  await expect(page.locator('.en-letter-card').first()).toContainText('apple');
  await expect(page.getByRole('heading', { name: '在四线格里写 A / a' })).toBeVisible();
  await expect(page.locator('.en-letters-discovery')).toBeVisible();
  await expect(page.getByRole('heading', { name: '英语四线格：认识上格、中格、下格' })).toBeVisible();
  await expect(page.locator('.en-four-line-map')).toContainText('上格');
  await expect(page.locator('.en-four-line-map')).toContainText('中格');
  await expect(page.locator('.en-four-line-map')).toContainText('下格');
  await expect(page.locator('.en-four-line-rules article')).toHaveCount(4);
  await expect(page.locator('.en-four-line-focus')).toContainText('大写住上中；短小写住中；高个向上伸，尾巴向下垂。');
  await expect(page.locator('.en-writing-rules article')).toHaveCount(3);
  await expect(page.locator('.en-writing-rules')).toContainText('占格');
  await expect(page.locator('.en-writing-rules')).toContainText('间距');
  await expect(page.locator('.en-writing-rules')).toContainText('标点');
  await expect(page.locator('.en-stroke-demo')).toBeVisible();
  await expect(page.locator('.en-stroke-panel--upper')).toContainText('大写 A');
  await expect(page.locator('.en-stroke-panel--lower')).toContainText('小写 a');
  await expect(page.locator('.en-writing-workbench')).toBeVisible();
  const discoverMain = await page.locator('.en-letters-discovery-main').boundingBox();
  const audioShelf = await page.locator('.en-letters-audio-shelf').boundingBox();
  expect(Math.abs((discoverMain?.y ?? 0) - (audioShelf?.y ?? 0))).toBeLessThan(3);
  expect(discoverMain?.width ?? 0).toBeGreaterThan(audioShelf?.width ?? 0);
  const demoBox = await page.locator('.en-writing-workbench > .en-stroke-demo').boundingBox();
  const writingPracticeBox = await page.locator('.en-writing-practice').boundingBox();
  expect(Math.abs((demoBox?.y ?? 0) - (writingPracticeBox?.y ?? 0))).toBeLessThan(3);
  expect(Math.abs((demoBox?.width ?? 0) - (writingPracticeBox?.width ?? 0))).toBeLessThan(8);
  await page.setViewportSize({ width: 820, height: 900 });
  const mobileDiscoverMain = await page.locator('.en-letters-discovery-main').boundingBox();
  const mobileAudioShelf = await page.locator('.en-letters-audio-shelf').boundingBox();
  expect(mobileAudioShelf?.y ?? 0).toBeGreaterThan((mobileDiscoverMain?.y ?? 0) + (mobileDiscoverMain?.height ?? 0) - 3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 3)).toBeFalsy();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator('.en-letter-model-upper')).toHaveText('A');
  await expect(page.locator('.en-letter-model-lower')).toHaveText('a');
  await page.getByRole('button', { name: '▶ 播放笔顺' }).click();
  await expect(page.getByRole('button', { name: '准备第一笔…' })).toBeDisabled();
  await expect(page.locator('.en-stroke-demo-body svg g.current')).toHaveCount(0);
  await expect(page.locator('.en-stroke-panel--upper svg g.current')).toHaveCount(1);
  await expect(page.locator('.en-stroke-panel--lower svg g.current')).toHaveCount(1);
  await expect.poll(() => page.locator('.en-stroke-panel--upper svg g.shown').count()).toBeGreaterThan(1);
  await page.locator('.en-letter-card').first().click();
  await expect(page.locator('.en-letter-card.seen').first()).toBeVisible();
  await completeListeningRoutine(page);
  const letterSourceCount = await page.locator('.en-letter-card').count();
  for (let i = 0; i < letterSourceCount; i++) await page.locator('.en-letter-card').nth(i).click();
  await expect(page.getByRole('button', { name: '教材内容看完了，去实际表达 →' })).toBeEnabled();
});

test('Part B 保留教材应用栏目，Unit 1 Look and match 六条原句不丢失', async ({ page }) => {
  await page.goto('/#/english-course/friends-b');
  await page.getByRole('button', { name: 'Are they friends?' }).click();
  await page.getByRole('button', { name: '带着问题去听读 →' }).click();
  await expect(page.getByText('Part B · 教材板块导航')).toBeVisible();
  await expect(page.locator('.en-textbook-block')).toHaveCount(4);
  await expect(page.locator('.en-textbook-block > header b')).toHaveText(['Let’s talk', 'Look and match', 'Let’s learn', 'Listen and chant']);
  const match = page.locator('.en-textbook-block--practice');
  await expect(page.locator('.en-block-scene')).toHaveCount(4);
  const scene = match.getByRole('button', { name: /教材场景/ });
  await expect(scene).toBeVisible();
  await expect(scene.locator('img')).toHaveAttribute('src', '/assets/english-textbook/scenes/friends-b-practice.webp');
  await expect(scene.locator('img')).toHaveAttribute('alt', 'Look and match教材局部场景插图');
  await scene.click();
  await expect(scene).toHaveAttribute('aria-expanded', 'true');
  await expect(match.locator('.en-match-option')).toHaveCount(6);
  await expect(match.locator('.en-match-option strong')).toHaveText(['We can share.', 'Nice to meet you.', 'Oh no!', 'It’s OK.', 'Thank you.', 'Nice to meet you too.']);
  await match.getByRole('button', { name: /We can share/ }).click();
  await match.getByRole('button', { name: /It’s OK/ }).click();
  await expect(match.getByText('这两句话接起来不够自然')).toBeVisible();
  await match.getByRole('button', { name: /Thank you/ }).click();
  await expect(match.getByText('配对成功：We can share. — Thank you.')).toBeVisible();
  await expect(match.locator('.en-match-option.matched')).toHaveCount(2);
  await expect(page.locator('.en-textbook-block--learn .en-source-line strong')).toHaveText(['I smile.', 'I listen.', 'I help.', 'I share.']);
  await expect(page.locator('.en-textbook-block--activity .en-audio-slot')).toBeVisible();
});

test('六篇 Reading time 使用分镜阅读，Unit 1 必须听读并破解线索才能推进', async ({ page }) => {
  await page.goto('/#/english-course/friends-story');
  await page.locator('.en-observe-stage > div button').first().click();
  await page.getByRole('button', { name: '带着问题去听读 →' }).click();
  await expect(page.locator('.en-story-reader')).toBeVisible();
  await expect(page.locator('.en-source-list')).toHaveCount(0);
  await expect(page.locator('.en-story-map button')).toHaveCount(3);
  await expect(page.locator('.en-story-map button').nth(1)).toBeDisabled();
  await expect(page.locator('.en-story-art img')).toHaveAttribute('src', '/assets/english-textbook/pages/p012.webp');
  await expect(page.getByRole('button', { name: '教材内容看完了，去实际表达 →' })).toBeDisabled();

  const firstSceneLines = page.locator('.en-story-line');
  await expect(firstSceneLines).toHaveCount(4);
  for (let index = 0; index < 4; index++) await firstSceneLines.nth(index).click();
  await page.getByRole('button', { name: '互相介绍并友好问候' }).click();
  await expect(page.getByText('姓名和 Nice to meet you 让两个人开始认识彼此。')).toBeVisible();
  await expect(page.getByRole('button', { name: '进入下一幕 →' })).toBeEnabled();
  await page.getByRole('button', { name: '进入下一幕 →' }).click();
  await expect(page.locator('.en-story-scene-head')).toContainText('一起相处');
  await expect(page.locator('.en-story-map button').nth(1)).toBeEnabled();

  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await page.setViewportSize({ width: 820, height: 900 });
  for (const [id, sceneCount, firstPage] of [
    ['families-story', 2, 'p024.webp'],
    ['animals-story', 4, 'p036.webp'],
    ['plants-story', 5, 'p048.webp'],
    ['colours-story', 5, 'p060.webp'],
    ['numbers-story', 6, 'p072.webp'],
  ] as const) {
    await page.goto(`/#/english-course/${id}`);
    await page.locator('.en-observe-stage > div button').first().evaluate((button) => (button as HTMLButtonElement).click());
    const next = page.getByRole('button', { name: '带着问题去听读 →' });
    await expect(next).toBeEnabled();
    await next.click();
    await expect(page.locator('.en-story-reader'), id).toBeVisible();
    await expect(page.locator('.en-story-map button'), id).toHaveCount(sceneCount);
    await expect(page.locator('.en-story-art img'), id).toHaveAttribute('src', `/assets/english-textbook/pages/${firstPage}`);
    await expect(page.locator('.en-story-line').first(), id).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 3), `${id} 浅色平板不应横向溢出`).toBeFalsy();
  }
});

test('单元导入、Start to read、项目与 Revision 全部使用各自的互动阅读器', async ({ page }) => {
  // 此用例连续打开 20 个课时；与其他并行浏览器争抢本地预览资源时，默认 40 秒不足以覆盖页面过场。
  test.setTimeout(90_000);
  const enterSource = async (id: string) => {
    await page.goto(`/#/english-course/${id}`);
    await expect(page.locator('.boot-splash')).toBeHidden();
    await page.locator('.en-observe-stage > div button').first().evaluate((button) => (button as HTMLButtonElement).click());
    const next = page.getByRole('button', { name: '带着问题去听读 →' });
    await expect(next).toBeEnabled();
    await next.click();
  };

  await enterSource('friends-opening');
  await expect(page.locator('.en-opening-reader')).toBeVisible();
  await expect(page.locator('.en-listening-routine')).toBeVisible();
  await expect(page.locator('.en-source-list')).toHaveCount(0);
  const rhythm = page.locator('.en-rhythm-lines button');
  for (let index = 0; index < await rhythm.count(); index++) await rhythm.nth(index).click();
  await completeListeningRoutine(page);
  await expect(page.getByRole('button', { name: '教材内容看完了，去实际表达 →' })).toBeEnabled();

  await enterSource('friends-read');
  await expect(page.locator('.en-read-explorer')).toBeVisible();
  await expect(page.locator('.en-source-list')).toHaveCount(0);
  const evidence = page.locator('.en-evidence-card');
  for (let index = 0; index < await evidence.count(); index++) await evidence.nth(index).click();
  await page.locator('.en-evidence-check').getByRole('button', { name: 'I listen.', exact: true }).click();
  await completeListeningRoutine(page);
  await expect(page.getByRole('button', { name: '教材内容看完了，去实际表达 →' })).toBeEnabled();

  await enterSource('friends-project');
  await expect(page.locator('.en-project-roadmap')).toBeVisible();
  await expect(page.locator('.en-source-list')).toHaveCount(0);
  const projectSteps = page.locator('.en-project-path button');
  for (let index = 0; index < await projectSteps.count(); index++) await projectSteps.nth(index).click();
  await page.locator('.en-project-start button').first().click();
  await completeListeningRoutine(page);
  await expect(page.getByRole('button', { name: '教材内容看完了，去实际表达 →' })).toBeEnabled();

  for (const unit of ['families', 'animals', 'plants', 'colours', 'numbers']) {
    for (const section of ['opening', 'read', 'project']) {
      await enterSource(`${unit}-${section}`);
      await expect(page.locator(section === 'opening' ? '.en-opening-reader' : section === 'read' ? '.en-read-explorer' : '.en-project-roadmap'), `${unit}-${section}`).toBeVisible();
      await expect(page.locator('.en-source-list'), `${unit}-${section}`).toHaveCount(0);
    }
  }

  for (const id of ['guest-observe', 'guest-act']) {
    await enterSource(id);
    await expect(page.locator('.en-revision-reader'), id).toBeVisible();
    await expect(page.locator('.en-story-map button'), id).toHaveCount(id === 'guest-observe' ? 3 : 3);
    await expect(page.locator('.en-source-list'), id).toHaveCount(0);
  }
});

test('六个单元的 Part A/B 均使用四张独立局部场景，而不是教材整页', async ({ page }) => {
  for (const unit of ['friends', 'families', 'animals', 'plants', 'colours', 'numbers']) {
    for (const section of ['a', 'b']) {
      await page.goto(`/#/english-course/${unit}-${section}`);
      await page.locator('.en-observe-stage > div button').first().click();
      await page.getByRole('button', { name: '带着问题去听读 →' }).click();
      const scenes = page.locator('.en-block-scene img');
      await expect(scenes).toHaveCount(4);
      expect(await scenes.evaluateAll((images) => images.map((image) => image.getAttribute('src')))).toEqual([
        `/assets/english-textbook/scenes/${unit}-${section}-talk.webp`,
        `/assets/english-textbook/scenes/${unit}-${section}-practice.webp`,
        `/assets/english-textbook/scenes/${unit}-${section}-learn.webp`,
        `/assets/english-textbook/scenes/${unit}-${section}-activity.webp`,
      ]);
      await expect.poll(() => scenes.evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBeTruthy();
    }
  }
});

test('颜色混合和奇偶配对是实际操作，不能仅答题跳过', async ({ page }) => {
  for (const [id, look, sourceAnswer, transferAnswer, task] of [
    ['colours-a', 'What colours do you see?', 'purple', 'green', 'mix'],
    ['numbers-read', 'What numbers do you see?', '时间', '1 个', 'even'],
  ] as const) {
    await page.goto(`/#/english-course/${id}`);
    await page.getByRole('button', { name: look }).click();
    await page.getByRole('button', { name: '带着问题去听读 →' }).click();
    await readAllSource(page);
    await page.getByRole('button', { name: sourceAnswer, exact: true }).click();
    await expect(page.getByRole('button', { name: '把方法用到新情境 →' })).toBeDisabled();
    if (task === 'mix') {
      await page.getByRole('button', { name: '选择 red' }).click();
      await page.getByRole('button', { name: '选择 blue' }).click();
      await expect(page.getByText('red + blue → purple')).toBeVisible();
    } else {
      for (let index = 0; index < 8; index++) await page.getByRole('group', { name: '九个点两两配对' }).getByRole('button').nth(index).click();
      await expect(page.getByText('配成 4 对，还剩 1 个；9 是 odd。')).toBeVisible();
    }
    await expect(page.getByRole('button', { name: '把方法用到新情境 →' })).toBeEnabled();
    await page.getByRole('button', { name: '把方法用到新情境 →' }).click();
    await page.getByRole('button', { name: transferAnswer, exact: true }).click();
    await page.getByRole('button', { name: '完成这节课，查看反馈 →' }).click();
    await expect(page.getByText('本次获得 3 星，历史最高 3 星。', { exact: false })).toBeVisible();
  }
});

test('答错进入错题本：按英语学科归类，再练跳回对应课时', async ({ page }) => {
  await page.goto('/#/english-course/friends-story');
  await page.getByRole('button', { name: 'Are they friends?' }).click();
  await page.getByRole('button', { name: '带着问题去听读 →' }).click();
  // 第一幕线索题答错一次
  await expect(page.locator('.en-story-clue')).toBeVisible();
  await page.getByRole('button', { name: '只是安静地看着对方，不说话' }).click();
  // 英语学科错题本可见该错题
  await page.goto('/#/wrongs?subject=english');
  await expect(page.locator('.review-hub-card')).toHaveCount(1);
  await expect(page.locator('.review-hub-card')).toContainText('故事线索');
  // 再练跳回对应课时
  await page.getByRole('button', { name: /再练/ }).click();
  await expect(page).toHaveURL(/#\/english-course\/friends-story/);
  // 重复答错同题不重复入本（先离开课时页再清除断点，避免内存状态把断点写回，让课时从看图与预测重新开始）
  await page.goto('/#/wrongs?subject=english');
  await page.evaluate(() => localStorage.removeItem('sfz-english-g3a-flow-v5:english-g3a-child:friends-story'));
  await page.goto('/#/english-course/friends-story');
  await page.getByRole('button', { name: 'Are they friends?' }).click();
  await page.getByRole('button', { name: '带着问题去听读 →' }).click();
  await page.getByRole('button', { name: '只是安静地看着对方，不说话' }).click();
  await page.goto('/#/wrongs?subject=english');
  await expect(page.locator('.review-hub-card')).toHaveCount(1);
});

test('深浅主题与桌面、平板宽度下目录和课时没有横向溢出', async ({ page }) => {
  for (const path of ['/#/subject/english', '/#/english-course/families-story']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: path.includes('subject') ? '三年级英语上册' : 'Different families · Reading time' })).toBeVisible();
    await expect(page.locator('.boot-splash')).toBeHidden();
    for (const theme of ['dark', 'light'] as const) {
      await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);
      for (const width of [1280, 820]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(page.locator(path.includes('subject') ? '.en-catalog' : '.en-lesson-page')).toBeVisible();
        const overflowing = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 3);
        expect(overflowing, `${path} ${theme} ${width}`).toBeFalsy();
      }
    }
  }
});
