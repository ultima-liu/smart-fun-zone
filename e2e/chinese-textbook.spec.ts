import { expect, test } from '@playwright/test';
import { CHINESE_BOOK_UNITS, CHINESE_TEXTBOOK_LESSONS } from '../src/content/chineseTextbookCurriculum';
import { CHINESE_PINYIN_STUDY } from '../src/content/chinesePinyinStudy';
import { CHINESE_PINYIN_GARDENS } from '../src/content/chinesePinyinGardenStudy';
import { CHINESE_KNOWLEDGE_EXTENSION, CHINESE_KNOWLEDGE_REVISIT_FROM } from '../src/content/chineseKnowledgeExtension';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
test.use({ launchOptions: { executablePath: CHROME } });

/** 逐句点读+跟读：每行先点读（听），再跟读（弹收音层，假识别器回填句子），点完成后 AI 判定通过 */
async function readAllLines(page: import('@playwright/test').Page) {
  const rows = page.locator('.ct-read-line');
  for (let i = 0; i < await rows.count(); i++) {
    await rows.nth(i).locator('button').first().click();
    await rows.nth(i).locator('.ct-read-follow').click();
    await expect(page.locator('.ct-follow-scores span').first()).toBeVisible();
    await page.getByRole('button', { name: '完成，让聪聪判一判' }).click();
    await expect(page.locator('.ct-follow-mask')).toHaveCount(0);
  }
}

/** 观察热点全部点亮：先等渲染（慢启动时 count 可能为 0，空转会卡死主按钮），再补点重试 */
async function clickAllHotspots(page: import('@playwright/test').Page) {
  await page.waitForSelector('.ct-scene-hotspot', { timeout: 15000 });
  const total = await page.locator('.ct-scene-hotspot').count();
  expect(total).toBeGreaterThan(0);
  // 每轮重新查询并点"当前第一个未点亮"的，避免 nth 下标在集合缩小后失效
  for (let i = 0; i < total * 3; i++) {
    const pending = page.locator('.ct-scene-hotspot:not(.seen)');
    if (!(await pending.count())) break;
    await pending.first().click();
  }
  await expect(page.locator('.ct-scene-hotspot.seen')).toHaveCount(total);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // 跟读用的假语音识别：开始后把弹层里的目标句作为识别结果回填，让 AI 判定可测
    class FakeSR {
      lang = ''; continuous = false; interimResults = false;
      onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null = null;
      onend: (() => void) | null = null; onerror: (() => void) | null = null;
      start() {
        setTimeout(() => {
          const target = document.querySelector('.ct-follow-line')?.textContent ?? '我是中国人';
          this.onresult?.({ results: [[{ transcript: target }]] });
          this.onend?.();
        }, 150);
      }
      stop() { this.onend?.(); }
    }
    (window as unknown as Record<string, unknown>).SpeechRecognition = FakeSR;
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeSR;
    const childId = 'chinese-textbook-child';
    localStorage.setItem('smart-fun-zone', JSON.stringify({
      state: {
        lang: 'zh', theme: 'dark', sound: false, musicOn: false, voiceOn: false,
        profiles: [{ id: childId, name: '语文体验生', avatarId: 'boy', age: 6, createdAt: Date.now() }],
        activeChildId: childId, records: [], mastery: {}, lessonProgress: {}, charBag: {},
        storyDone: { [childId]: ['p1'] }, storyPulse: null, wrongs: {}, points: { [childId]: 0 }, pointLog: { [childId]: [] },
        customTasks: {}, ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {}, storeOverrides: {}, taskOverrides: {}, rewardRequests: {}, bonusMin: {}, parentPin: '1234', dailyLimitMin: 0,
        buddyOpen: false, buddyWakeOn: false, expeditionLastAt: {}, materials: {}, shipLevel: {}, archivedCards: {}, cardRewardClaimed: {}, showBadges: {},
      },
      version: 0,
    }));
    localStorage.removeItem(`sfz-chinese-textbook-progress:${childId}`);
  });
});

test('新语文目录按教材页序开放整册四十五个学习页面', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#/subject/chinese');
  await expect(page.getByRole('heading', { name: '一年级语文上册' })).toBeVisible();
  expect(CHINESE_TEXTBOOK_LESSONS).toHaveLength(45);
  expect(Object.keys(CHINESE_KNOWLEDGE_EXTENSION).sort()).toEqual(CHINESE_TEXTBOOK_LESSONS.map((lesson) => lesson.id).sort());
  for (const card of Object.values(CHINESE_KNOWLEDGE_EXTENSION)) {
    expect(card.options).toContain(card.answer);
    expect(card.mnemonic.length).toBeGreaterThan(8);
  }
  expect(Object.keys(CHINESE_KNOWLEDGE_REVISIT_FROM).sort()).toEqual(Object.entries(CHINESE_KNOWLEDGE_EXTENSION).filter(([, card]) => card.mode === 'reuse').map(([id]) => id).sort());
  for (const [id, from] of Object.entries(CHINESE_KNOWLEDGE_REVISIT_FROM))
    expect(CHINESE_TEXTBOOK_LESSONS.findIndex((lesson) => lesson.id === from)).toBeLessThan(CHINESE_TEXTBOOK_LESSONS.findIndex((lesson) => lesson.id === id));
  expect(CHINESE_TEXTBOOK_LESSONS.filter((lesson) => lesson.artworkSource === 'original')).toHaveLength(23);
  expect(CHINESE_TEXTBOOK_LESSONS.filter((lesson) => lesson.artworkSource === 'textbook')).toHaveLength(22);
  expect(new Set(CHINESE_TEXTBOOK_LESSONS.map((lesson) => lesson.artwork))).toHaveProperty('size', 45);
  await expect(page.locator('.ct-unit-tabs button')).toHaveCount(9);
  await expect(page.locator('.ct-method-strip > div')).toHaveCount(5);
  for (const [index, tab] of (await page.locator('.ct-unit-tabs button').all()).entries()) {
    await tab.click();
    const expectedCount = CHINESE_BOOK_UNITS[index].lessonIds.length;
    await expect(page.locator('.ct-lesson-entry')).toHaveCount(expectedCount);
    await expect(page.locator('.ct-lesson-art img')).toHaveCount(expectedCount);
    await expect(page.locator('.ct-unit-tabs button').nth(index)).toHaveClass(/active/);
  }
  expect(errors).toEqual([]);
});

test('我是中国人完成观察、点读、拼句和迁移挑战后记录进度', async ({ page }) => {
  await page.goto('/#/chinese-course/china');
  await expect(page.getByRole('heading', { name: '我是中国人', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '我发现了全部线索，去点读 →' })).toBeDisabled();
  await expect(page.locator('.ct-observe-artwork')).toHaveJSProperty('complete', true);
  await clickAllHotspots(page);
  await page.getByRole('button', { name: '我发现了全部线索，去点读 →' }).click();

  await expect(page.getByRole('button', { name: '正文已点读并跟读，继续教材练习 →' })).toBeDisabled();
  // 拼音注音开关：打开后每字上标带调拼音，首字"我"注音 wǒ
  const pyToggle = page.getByRole('button', { name: '拼音注音' });
  await pyToggle.click();
  await expect(page.locator('.ct-read-py ruby rt').first()).toHaveText('wǒ');
  await pyToggle.click();
  await expect(page.locator('.ct-read-py')).toHaveCount(0);
  await readAllLines(page);
  await page.getByRole('button', { name: '正文已点读并跟读，继续教材练习 →' }).click();

  await expect(page.locator('.ct-textbook-study')).toBeVisible();
  for (const button of await page.locator('.ct-textbook-study .ct-study-content button').all()) await button.click();
  for (const button of await page.locator('.ct-word-grid button').all()) await button.click();
  await page.getByRole('button', { name: '我说完了' }).click();
  await expect(page.getByRole('button', { name: '学完教材与知识延伸，去动手表达 →' })).toBeDisabled();
  await page.getByRole('button', { name: '🔊 听聪聪讲方法' }).click();
  await page.locator('.ct-ktrail-check').getByRole('button', { name: CHINESE_KNOWLEDGE_EXTENSION.china.answer }).click();
  await page.getByRole('button', { name: '教材与知识延伸已完成，去动手表达 →' }).click();

  for (const answer of ['中华民族', '是', '一家']) {
    await page.locator('.ct-task-options button').getByText(answer, { exact: true }).click();
    await page.waitForTimeout(700);
  }
  await expect(page.getByText('中华民族是一家。', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '关键任务完成，进入挑战 →' }).click();

  for (const answer of ['中国人', '大家团结在一起', '我是中国人，我叫小星。']) {
    await page.locator('.ct-challenge-options button').getByText(answer, { exact: true }).click();
    await page.waitForTimeout(900);
  }
  await page.getByRole('button', { name: '记录成绩，返回目录' }).click();
  await expect(page.locator('.ct-lesson-entry.done')).toContainText('我是中国人');
});

test('拼音课把教材内容重做为听音四线格声调拼读识字和规则任务', async ({ page }) => {
  expect(Object.keys(CHINESE_PINYIN_STUDY)).toHaveLength(14);
  for (const [id, pack] of Object.entries(CHINESE_PINYIN_STUDY)) {
    expect(pack.letters.length).toBeGreaterThan(0);
    expect(pack.tones.length).toBeGreaterThan(0);
    expect(pack.words.length).toBeGreaterThan(0);
    expect(pack.readingLines.length).toBeGreaterThan(0);
    expect(CHINESE_TEXTBOOK_LESSONS.find((lesson) => lesson.id === id)?.sourceLines).toEqual(pack.readingLines);
  }
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/#/chinese-course/pinyin-a-o-e');
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  await clickAllHotspots(page);
  await page.getByRole('button', { name: '我发现了全部线索，去点读 →' }).click();
  await readAllLines(page);
  await page.getByRole('button', { name: '正文已点读并跟读，继续教材练习 →' }).click();
  await expect(page.locator('.ct-pinyin-lab')).toBeVisible();
  await expect(page.locator('.ct-textbook-reference--expanded')).toHaveCount(0);
  await expect(page.locator('.ct-pinyin-letter-grid button')).toHaveCount(3);
  await expect(page.getByRole('button', { name: '完成这一步，继续 声调与拼读 →' })).toBeDisabled();
  for (const button of await page.locator('.ct-pinyin-letter-grid button').all()) await button.click();
  await page.getByRole('button', { name: '完成这一步，继续 声调与拼读 →' }).click();
  for (const button of await page.locator('.ct-pinyin-tones button').all()) await button.click();
  await page.getByRole('button', { name: '完成这一步，继续 图文识字 →' }).click();
  for (const button of await page.locator('.ct-pinyin-word-grid button').all()) await button.click();
  await page.getByRole('button', { name: '完成这一步，继续 规律验证 →' }).click();
  await page.getByRole('button', { name: '听聪聪解释规则' }).click();
  await page.locator('.ct-pinyin-check').getByRole('button', { name: '张大嘴巴' }).click();
  await expect(page.getByRole('button', { name: '学完教材与知识延伸，去动手表达 →' })).toBeDisabled();
  await page.getByRole('button', { name: '🔊 听聪聪讲方法' }).click();
  await page.locator('.ct-ktrail-check').getByRole('button', { name: CHINESE_KNOWLEDGE_EXTENSION['pinyin-a-o-e'].answer }).click();
  await expect(page.getByRole('button', { name: '教材与知识延伸已完成，去动手表达 →' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test('拼音园地二至四用栏目任务和共读内容替代扫描页确认', async ({ page }) => {
  expect(Object.keys(CHINESE_PINYIN_GARDENS).sort()).toEqual(['garden-2', 'garden-3', 'garden-4']);
  for (const activities of Object.values(CHINESE_PINYIN_GARDENS)) expect(activities).toHaveLength(5);
  await page.goto('/#/chinese-course/garden-2');
  await clickAllHotspots(page);
  await page.getByRole('button', { name: '我发现了全部线索，去点读 →' }).click();
  await readAllLines(page);
  await page.getByRole('button', { name: '正文已点读并跟读，继续教材练习 →' }).click();
  await expect(page.locator('.ct-pinyin-garden')).toBeVisible();
  await expect(page.locator('.ct-textbook-reference--expanded')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '生活识字 · 拼音本' })).toBeVisible();
  await expect(page.getByRole('button', { name: '这项完成，继续下一项 →' })).toBeDisabled();
  for (const button of await page.locator('.ct-pinyin-garden-material button').all()) await button.click();
  await page.locator('.ct-pinyin-garden-question').getByRole('button', { name: '姓名' }).click();
  await page.getByRole('button', { name: '这项完成，继续下一项 →' }).click();
  await expect(page.getByRole('heading', { name: '声调实验 · 读准声音' })).toBeVisible();
});

test('金木水火土首次讲透田字格中线汉字数字占格与常见结构', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/#/chinese-course/metal-wood-water-fire-earth');
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  await clickAllHotspots(page);
  await page.getByRole('button', { name: '我发现了全部线索，去点读 →' }).click();
  await readAllLines(page);
  await page.getByRole('button', { name: '正文已点读并跟读，继续教材练习 →' }).click();

  await expect(page.locator('[data-knowledge="tian-grid"]')).toBeVisible();
  await expect(page.getByRole('button', { name: '继续认识 汉字数字 →' })).toBeDisabled();
  for (const name of ['左上格', '右上格', '左下格', '右下格', '横中线', '竖中线'])
    await page.locator('.ct-ktian-board').getByRole('button', { name }).click();
  await page.locator('.ct-ktrail-check').getByRole('button', { name: '竖中线' }).click();
  await page.getByRole('button', { name: '继续认识 汉字数字 →' }).click();
  await expect(page.getByText('“一、二、三”是汉字数字')).toBeVisible();
  for (const name of ['一', '二', '三', '上']) await page.locator('.ct-ktian-number-pick').getByRole('button', { name }).click();
  await page.locator('.ct-ktrail-check').getByRole('button', { name: '下面的一横' }).click();
  await page.getByRole('button', { name: '继续认识 字形三类 →' }).click();
  for (const name of ['独体', '左右', '上下']) await page.locator('.ct-ktian-structures').getByRole('button', { name: new RegExp(name) }).click();
  await page.locator('.ct-ktrail-check').getByRole('button', { name: '左右结构' }).click();
  await expect(page.getByText('✓ 田字格小工坊已完成')).toBeVisible();
  await expect(page.getByRole('button', { name: '学完教材与知识延伸，去动手表达 →' })).toBeDisabled();

  for (const button of await page.locator('.ct-recognize-grid button').all()) await button.click();
  for (const button of await page.locator('.ct-writing-grid > button').all()) await button.click();
  // 生字卡：会认的字区入口打开，翻到下一个再关闭
  await page.locator('.ct-study-deck').first().click();
  await expect(page.locator('.char-card-big')).toHaveText('一');
  await page.getByRole('button', { name: '下一个 →' }).click();
  await expect(page.locator('.char-card-big')).toHaveText('二');
  await expect(page.locator('.char-card-pos')).toHaveText('2 / 7');
  await page.getByRole('button', { name: '关闭' }).click();
  await expect(page.locator('.char-card')).toHaveCount(0);
  await page.getByRole('button', { name: '我已朗读并尝试背诵' }).click();
  for (const button of await page.locator('.ct-tian-list button').all()) await button.click();
  await expect(page.getByRole('button', { name: '教材与知识延伸已完成，去动手表达 →' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test('秋天完整保留P61生字田字格背诵自然段和一字变调学习', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/#/chinese-course/autumn');
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  await clickAllHotspots(page);
  await page.getByRole('button', { name: '我发现了全部线索，去点读 →' }).click();
  await readAllLines(page);
  await page.getByRole('button', { name: '正文已点读并跟读，继续教材练习 →' }).click();

  await expect(page.getByText('P61 生字、田字格、朗读背诵与语文知识')).toBeVisible();
  await expect(page.getByText('借助拼音朗读课文，做到正确、自然；再尝试背诵课文。')).toBeVisible();
  await expect(page.getByText('数一数，课文一共有几个自然段？注意自然段前面有两个空格。')).toBeVisible();
  await expect(page.getByText('读一读，注意“一”在不同词语中的读音变化。')).toBeVisible();
  await expect(page.locator('.ct-recognize-grid button')).toHaveCount(10);
  await expect(page.locator('.ct-writing-grid > button')).toHaveCount(4);

  for (const button of await page.locator('.ct-recognize-grid button').all()) await button.click();
  for (const button of await page.locator('.ct-writing-grid > button').all()) await button.click();
  await page.getByRole('button', { name: '我已朗读并尝试背诵' }).click();
  await page.getByRole('button', { name: '3 个' }).click();
  await page.getByRole('button', { name: '我已逐组读过' }).click();
  await page.getByRole('button', { name: '🔊 听聪聪讲方法' }).click();
  await page.locator('.ct-ktrail-check').getByRole('button', { name: CHINESE_KNOWLEDGE_EXTENSION.autumn.answer }).click();
  await expect(page.getByRole('button', { name: '教材与知识延伸已完成，去动手表达 →' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  expect(await page.locator('.ct-study-section').first().evaluate((element) => getComputedStyle(element).color)).toBe('rgb(39, 51, 74)');
});

test('入学、识字、拼音、阅读和园地页面均有独立观察场景，并适配浅色平板布局', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  const samples = ['china', 'metal-wood-water-fire-earth', 'pinyin-a-o-e', 'autumn', 'garden-8']
    .map((id) => CHINESE_TEXTBOOK_LESSONS.find((lesson) => lesson.id === id)!);
  for (const lesson of samples) {
    await page.goto(`/#/chinese-course/${lesson.id}`);
    await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
    await expect(page.getByRole('heading', { name: lesson.title, exact: true })).toBeVisible();
    await expect(page.locator(`.scene-${lesson.id}`)).toBeVisible();
    await expect(page.locator('.ct-observe-artwork')).toHaveAttribute('src', lesson.artwork);
    expect(await page.locator('.ct-observe-artwork').evaluate((image: HTMLImageElement) => image.naturalWidth > 1000 && image.naturalHeight > 500)).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    const color = await page.locator('.ct-stage').evaluate((element) => getComputedStyle(element).color);
    expect(color).toBe('rgb(39, 51, 74)');
  }
});
