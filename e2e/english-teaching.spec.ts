import { test, expect, type Page, type Locator } from '@playwright/test';
import { getEnglishTeaching } from '../src/content/englishTeaching';
import { getEnglishG3Lesson } from '../src/content/englishGrade3Upper';

const child = 'english-quality-child';
test.beforeEach(async ({ page }) => {
  await page.addInitScript((id) => {
    if (sessionStorage.getItem('english-quality-seeded')) return;
    localStorage.setItem('smart-fun-zone', JSON.stringify({ state: {
      lang: 'zh', theme: 'dark', sound: false, musicOn: false, voiceOn: false,
      profiles: [{ id, name: '英语体验生', avatarId: 'boy', age: 8, createdAt: Date.now() }], activeChildId: id,
      records: [], mastery: {}, lessonProgress: {}, charBag: {}, wrongs: {}, points: { [id]: 0 }, pointLog: { [id]: [] },
      customTasks: {}, ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {}, storeOverrides: {}, taskOverrides: {}, rewardRequests: {}, bonusMin: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false, expeditionLastAt: {}, materials: {}, shipLevel: {}, archivedCards: {}, cardRewardClaimed: {}, showBadges: {},
    }, version: 0 }));
    sessionStorage.setItem('english-quality-seeded', '1');
  }, child);
});

async function openPhase(page: Page, lessonId: string, phase: number) {
  await page.goto('/');
  await page.evaluate(({ child, lessonId, phase }) => {
    localStorage.setItem(`sfz-english-g3a-flow-v5:${child}:${lessonId}`, JSON.stringify({ phase, unlocked: phase, reviewStartedAt: Date.now() }));
  }, { child, lessonId, phase });
  await page.goto(`/#/english-course/${lessonId}`);
}
async function observe(region: Locator, level = '独立完成') {
  await region.getByText('家人观察', { exact: true }).click();
  for (const check of await region.locator('details input[type=checkbox]').all()) await check.check();
  await region.getByRole('button', { name: level, exact: true }).click();
}
async function expression(region: Locator, hint = false) {
  const next = region.getByRole('button', { name: '我试过了，继续' });
  if (await next.count()) { await next.click(); await next.click(); }
  if (hint) await region.getByRole('button', { name: '给我句子开头' }).click();
  await observe(region);
}
async function evidence(page: Page) {
  return page.evaluate((id) => JSON.parse(localStorage.getItem(`sfz-english-evidence-v1:${id}`) ?? '[]') as { taskId: string; level: string; source: string; context: string }[], child);
}

for (const width of [1280, 820]) test(`删除听信息模块后 ${width} 宽度不显示题组且旧进度不阻塞`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const lessons = ['friends-opening', 'friends-a', 'friends-letters', 'friends-b', 'friends-read', 'friends-project', 'friends-story'];
  await page.goto('/');
  await page.evaluate(({ child, lessons }) => {
    for (const lesson of lessons) {
      localStorage.setItem(`sfz-english-g3a-flow-v5:${child}:${lesson}`, JSON.stringify({ phase: 1, unlocked: 1, listeningDone: false, stars: 3 }));
    }
  }, { child, lessons });
  for (const lessonId of lessons) {
    await page.evaluate((id) => { location.hash = `/english-course/${id}`; }, lessonId);
    await expect(page.locator('.en-source-heading h2')).toHaveText(getEnglishG3Lesson(lessonId)!.title);
    await expect(page.getByLabel('听力理解练习')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '听信息，做回应' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)).toBe(false);
    if (lessonId === 'friends-a') {
      const next = page.getByRole('button', { name: '教材内容看完了，去实际表达 →' });
      await expect(next).toBeDisabled();
      for (const item of await page.locator('.en-source-item').all()) await item.click();
      await expect(next).toBeEnabled();
      await page.reload();
      await expect(next).toBeEnabled();
      await next.click();
      await expect(page.getByLabel('分层表达练习')).toBeVisible();
      const flow = await page.evaluate((id) => JSON.parse(localStorage.getItem(`sfz-english-g3a-flow-v5:${id}:friends-a`)!), child);
      expect(flow.stars).toBe(3);
      expect(flow.phase).toBe(2);
      expect(flow).not.toHaveProperty('listeningDone');
    }
  }
});

test('表达先撤掉示范再换情境，提示不会记成独立，刷新恢复阶段', async ({ page }) => {
  await openPhase(page, 'friends-a', 2);
  const region = page.getByLabel('分层表达练习');
  const next = page.getByRole('button', { name: '把方法用到新情境 →' });
  await page.getByRole('button', { name: getEnglishTeaching('friends-a').check.answer, exact: true }).click();
  await expect(next).toBeDisabled();
  await region.getByRole('button', { name: '我试过了，继续' }).click();
  await region.getByRole('button', { name: '我试过了，继续' }).click();
  await page.reload();
  await expect(region.locator('.en-expression-support')).toHaveCount(0);
  await expect(region.locator('.en-expression-scene p')).toHaveText(getEnglishTeaching('friends-a').expression.transfer!.prompt);
  await expression(region, true);
  await expect(next).toBeEnabled();
  await page.reload();
  await observe(region);
  expect((await evidence(page)).find((row) => row.taskId === 'expression:transfer')?.level).toBe('supported');
});


test('麦克风退出表达层级时停止轨道，不把转写当发音检查', async ({ page }) => {
  await page.addInitScript(() => {
    const runtime = window as unknown as { englishMicStops: number };
    runtime.englishMicStops = 0;
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => runtime.englishMicStops++ }] }) } });
    Object.defineProperty(window, 'MediaRecorder', { value: class {
      state = 'inactive'; mimeType = 'audio/webm'; onstop?: () => void;
      start() { this.state = 'recording'; }
      stop() { this.state = 'inactive'; this.onstop?.(); }
    } });
  });
  await openPhase(page, 'friends-a', 2);
  const region = page.getByLabel('分层表达练习');
  await region.getByRole('button', { name: '录下我的表达' }).click();
  await expect(region.getByRole('button', { name: '停止录音' })).toBeVisible();
  await region.getByRole('button', { name: '我试过了，继续' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { englishMicStops: number }).englishMicStops)).toBeGreaterThan(0);
});

test('三步声音练习不提前示范新词，自记不升级发音能力', async ({ page }) => {
  await openPhase(page, 'friends-letters', 1);
  const region = page.getByLabel('声音到拼读练习');
  await expect(region.getByRole('button', { name: '相同', exact: true })).toBeDisabled();
  await region.getByRole('button', { name: '先看词练习' }).click();
  await region.getByRole('button', { name: '相同', exact: true }).click();
  await region.getByRole('button', { name: '下一步' }).click();
  await region.getByRole('button', { name: '先看词练习' }).click();
  await region.getByRole('button', { name: 'c', exact: true }).click();
  await region.getByRole('button', { name: '下一步' }).click();
  await expect(region.locator('.en-novel-word')).toHaveText('dad');
  await expect(region.getByRole('button', { name: '听短句' })).toHaveCount(0);
  await region.getByRole('button', { name: '我已经试着表达' }).click();
  await expect(region.getByRole('button', { name: '听短句' })).toBeVisible();
  expect((await evidence(page)).filter((row) => row.taskId.startsWith('phonics:')).every((row) => row.level === 'practiced')).toBe(true);
});

test('生日卡有年龄和时间，制作完成后必须介绍；编辑后撤回完成', async ({ page }) => {
  await openPhase(page, 'numbers-project', 2);
  const project = page.getByLabel('生日邀请卡');
  await page.getByRole('button', { name: getEnglishTeaching('numbers-project').check.answer, exact: true }).click();
  await expression(page.getByLabel('分层表达练习'));
  const next = page.getByRole('button', { name: '把方法用到新情境 →' });
  await project.getByLabel('对象／虚构名字').fill('Amy');
  await project.getByLabel('Age · 年龄').fill('7');
  await project.getByLabel('Party time · 聚会时间').fill('7 years old');
  await project.getByRole('button', { name: '检查并保存作品' }).click();
  await expect(project.locator('.en-project-errors')).toContainText('聚会时间');
  await project.getByLabel('Party time · 聚会时间').fill('6:30 p.m.');
  await project.getByRole('button', { name: '检查并保存作品' }).click();
  await expect(next).toBeDisabled();
  await project.getByRole('button', { name: '我已经试着表达' }).click();
  await expect(next).toBeEnabled();
  await project.getByLabel('Age · 年龄').fill('8');
  await expect(next).toBeDisabled();
  await page.reload();
  await expect(project.getByLabel('Age · 年龄')).toHaveValue('8');
  await expect(project.getByLabel('我的作品')).toContainText('6:30 p.m.');
  expect((await evidence(page)).find((row) => row.taskId === 'project:structure')?.level).toBe('supported');
});

test('动物书检查宠物关系并可翻页', async ({ page }) => {
  await openPhase(page, 'animals-project', 2);
  const project = page.getByLabel('动物图片书');
  await project.getByRole('button', { name: '添加一页' }).click();
  await project.getByRole('button', { name: '添加一页' }).click();
  const rows = project.locator('.en-project-row');
  await rows.nth(0).getByLabel('关系／分组').selectOption('Pets');
  await rows.nth(1).getByLabel('内容').selectOption('elephant');
  await rows.nth(1).getByLabel('关系／分组').selectOption('Pets');
  await project.getByRole('button', { name: '检查并保存作品' }).click();
  await expect(project.locator('.en-project-errors')).toContainText('宠物');
  await rows.nth(1).getByLabel('关系／分组').selectOption('Wild animals');
  await project.getByRole('button', { name: '检查并保存作品' }).click();
  await project.getByRole('button', { name: '下一页作品' }).click();
  await expect(project.locator('.en-project-book-page')).toContainText('It is an elephant.');
});

test('原声任务隐藏文本，播放结束才可检查；焦点与关闭恢复', async ({ page }) => {
  await openPhase(page, 'friends-opening', 1);
  await page.getByRole('button', { name: '原声听后任务' }).click();
  const dialog = page.getByRole('dialog', { name: '教材原声听力任务' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Nice to meet you.', { exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: '握手并玩游戏' })).toBeDisabled();
  await dialog.locator('audio').evaluate((element) => element.dispatchEvent(new Event('ended')));
  await dialog.getByRole('button', { name: '握手并玩游戏' }).click();
  expect((await evidence(page)).find((row) => row.taskId === 'original:friends-opening-song')?.level).toBe('independent');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: '原声听后任务' })).toBeFocused();
});

test('主动复习先检索再显示答案，第二次进入仍需重新做任务', async ({ page }) => {
  await openPhase(page, 'friends-a', 4);
  await page.evaluate((id) => {
    localStorage.setItem(`sfz-english-evidence-v1:${id}`, JSON.stringify([{ lessonId: 'friends-a', taskId: 'listen:greet', skill: 'listening', level: 'needs-help', source: 'check', context: 'lesson', note: '旧听力题', at: Date.now() }]));
  }, child);
  await page.getByRole('button', { name: '今天复习，现在开始' }).click();
  const review = page.getByLabel('英语主动回忆复习');
  for (let i = 0; i < 3; i++) {
    await expect(review.locator('.en-recall-answer')).toHaveCount(0);
    await expect(review.getByRole('button', { name: '核对示范' })).toBeDisabled();
    await review.getByRole('button', { name: i === 0 ? '还想不起来' : '我试着说出来了', exact: true }).click();
    await review.getByRole('button', { name: '核对示范' }).click();
    await observe(review);
    await review.getByRole('button', { name: i === 2 ? '换情境用一用' : '回想下一项' }).click();
  }
  const transfer = review.getByLabel('分层表达练习');
  await expect(review.getByLabel('听力理解练习')).toHaveCount(0);
  await expect(transfer.locator('.en-expression-support')).toHaveCount(0);
  await observe(transfer);
  await review.getByRole('button', { name: '完成本次复习' }).click();
  await page.reload();
  await page.getByRole('button', { name: '今天复习，已完成，可再次复习' }).click();
  await expect(review.getByRole('button', { name: '核对示范' })).toBeDisabled();
  expect((await evidence(page)).filter((row) => row.context === 'review' && row.level === 'supported').length).toBeGreaterThan(0);
});

test('完整课程仍可静音学习，奖励与未检查能力分开', async ({ page }) => {
  await page.goto('/#/english-course/friends-a');
  await page.getByRole('button', { name: 'Are they friends?', exact: true }).click();
  await page.getByRole('button', { name: '带着问题去听读 →' }).click();
  await expect(page.getByLabel('听力理解练习')).toHaveCount(0);
  for (const item of await page.locator('.en-source-item').all()) await item.click();
  if (await page.getByRole('button', { name: '关闭跟读' }).count()) await page.getByRole('button', { name: '关闭跟读' }).click();
  await page.getByRole('button', { name: '教材内容看完了，去实际表达 →' }).click();
  await page.getByRole('button', { name: getEnglishTeaching('friends-a').check.answer, exact: true }).click();
  const speaking = page.getByLabel('分层表达练习');
  await speaking.getByRole('button', { name: '我试过了，继续' }).click();
  await speaking.getByRole('button', { name: '我试过了，继续' }).click();
  await speaking.getByRole('button', { name: '我已经试着表达' }).click();
  await page.getByRole('button', { name: '把方法用到新情境 →' }).click();
  await page.getByRole('button', { name: '完成这节课，查看反馈 →' }).click();
  await expect(page.getByText('本次学习奖励 3 星', { exact: false })).toBeVisible();
  await expect(page.locator('.en-ability-summary')).toContainText('尚未检查');
  await page.goto('/#/subject/english');
  await expect(page.locator('.en-lesson-card').nth(1)).toContainText('学习奖励 3 星');
});

test('复习总入口混入已学其他单元，完成实际任务后才勾掉节点', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((id) => {
    localStorage.setItem(`sfz-review-plan-v1:${id}`, JSON.stringify(['friends-a', 'animals-a'].map((lessonId) => ({
      id: `english:${lessonId}`, subject: 'english', lessonId, title: lessonId === 'friends-a' ? '认识朋友' : '介绍宠物',
      focus: '听懂并表达', route: `/english-course/${lessonId}`, learnedAt: Date.now(), completedDays: [], reviewedOn: [],
    }))));
  }, child);
  await page.goto('/#/review');
  const card = page.locator('.review-hub-card.english').filter({ has: page.getByRole('heading', { name: '认识朋友', exact: true }) });
  await card.getByRole('button', { name: '开始小检验' }).click();
  const review = card.getByLabel('英语主动回忆复习');
  await expect(review.getByText('1 / 4', { exact: true })).toBeVisible();
  for (let i = 0; i < 4; i++) {
    if (i === 3) await expect(review.locator('.en-recall-task > small')).toContainText('Our animal friends');
    await review.getByRole('button', { name: '我试着说出来了' }).click();
    await review.getByRole('button', { name: '核对示范' }).click();
    await review.getByRole('button', { name: '我已经试着表达' }).click();
    await review.getByRole('button', { name: i === 3 ? '换情境用一用' : '回想下一项' }).click();
  }
  await review.getByLabel('分层表达练习').getByRole('button', { name: '我已经试着表达' }).click();
  await review.getByRole('button', { name: '完成本次复习' }).click();
  await expect(card).toHaveCount(0);
  const saved = await page.evaluate((id) => JSON.parse(localStorage.getItem(`sfz-review-plan-v1:${id}`)!), child);
  expect(saved.find((entry: { lessonId: string }) => entry.lessonId === 'friends-a').completedDays).toContain(0);
});

for (const width of [1280, 820]) test(`作品与表达适配 ${width} 宽度`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await openPhase(page, 'numbers-project', 2);
  await expect(page.getByLabel('生日邀请卡')).toBeVisible();
  await expect(page.getByLabel('分层表达练习')).toBeVisible();
  await expect(page.locator('.boot-splash')).toHaveClass(/exit/);
  await expect(page.locator('.boot-splash')).toHaveCSS('opacity', '0');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)).toBe(false);
  await page.screenshot({ path: `tmp/english-teaching-${width}.png`, fullPage: true });
});
