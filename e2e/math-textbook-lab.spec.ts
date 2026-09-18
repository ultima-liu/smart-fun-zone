import { test, expect } from '@playwright/test';
import { EXTENDED_MATH_LESSONS, MATH_UPPER_UNITS } from '../src/content/mathUpperCurriculum';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

test.use({ launchOptions: { executablePath: CHROME } });

async function finishPerfectCampusArena(page: import('@playwright/test').Page) {
  const answers = ['5 层', '底层入口这一层', '第 4 层', '确认起点后从下到上一层一层数', '5'];
  const objectives: string[] = [];
  for (const answer of answers) {
    objectives.push((await page.locator('.mt-arena-objective').textContent()) ?? '');
    await page.locator('.mt-arena-opts button').getByText(answer, { exact: true }).click();
    await page.waitForTimeout(900);
  }
  await expect(page.getByText('🎉 闯关成功')).toBeVisible();
  return objectives;
}

async function dragBeadsLeft(page: import('@playwright/test').Page, count: number) {
  const abacus = page.locator('.mt-abacus');
  const track = await abacus.boundingBox();
  expect(track).not.toBeNull();
  const targetX = (track?.x ?? 0) + (track?.width ?? 0) * .42;
  const targetY = (track?.y ?? 0) + (track?.height ?? 0) / 2;
  for (let index = 0; index < count; index++) {
    const bead = page.locator('.mt-abacus > button').nth(index);
    const box = await bead.boundingBox();
    expect(box).not.toBeNull();
    await bead.dispatchEvent('pointerdown', { pointerId: index + 1, clientX: (box?.x ?? 0) + (box?.width ?? 0) / 2, clientY: (box?.y ?? 0) + (box?.height ?? 0) / 2 });
    await bead.dispatchEvent('pointermove', { pointerId: index + 1, clientX: targetX, clientY: targetY });
    await bead.dispatchEvent('pointerup', { pointerId: index + 1, clientX: targetX, clientY: targetY });
    await expect(page.locator('.mt-abacus > button.active')).toHaveCount(index + 1);
  }
}

test.beforeEach(async ({ page }) => {
  const childId = 'math-textbook-child';
  await page.addInitScript((id) => {
    if (sessionStorage.getItem('math-textbook-e2e-seeded')) return;
    localStorage.setItem('smart-fun-zone', JSON.stringify({
      state: {
        lang: 'zh', theme: 'dark', sound: true, musicOn: false, voiceOn: false,
        profiles: [{ id, name: '数学体验生', avatarId: 'boy', age: 6, createdAt: Date.now() }],
        activeChildId: id, records: [], mastery: {}, lessonProgress: {}, charBag: {},
        storyDone: { [id]: ['p1'] }, storyPulse: null,
        wrongs: { [id]: [{ uid: 'math-wrong-1', lessonId: 'math-lab-compare', lessonName: '比大小', kind: '3 ○ 4，填什么符号？', answer: '＞', time: Date.now() }] },
        points: { [id]: 0 }, pointLog: { [id]: [] },
        customTasks: {}, ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {}, storeOverrides: {},
        taskOverrides: {}, rewardRequests: {}, bonusMin: {}, parentPin: '1234', dailyLimitMin: 0,
        buddyOpen: false, buddyWakeOn: false, expeditionLastAt: {}, materials: {}, shipLevel: {},
        archivedCards: {}, cardRewardClaimed: {}, showBadges: {},
      },
      version: 0,
    }));
    localStorage.removeItem('sfz-math-textbook-v1');
    localStorage.removeItem(`sfz-math-flow-v2:${id}:/#/math-course/numbers`);
    localStorage.removeItem(`sfz-math-flow-v2:${id}:/#/math-course/compare`);
    sessionStorage.setItem('math-textbook-e2e-seeded', '1');
  }, childId);
});

test('数学目录可进入单课并保留完整教学闭环', async ({ page }) => {
  test.setTimeout(90_000);
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/#/subject/math');

  await expect(page.getByRole('heading', { name: '一年级数学上册' })).toBeVisible();
  await page.getByRole('button', { name: /5 以内数的认识和加、减法/ }).click();
  await expect(page.getByRole('button', { name: /1～5 的认识/ })).toBeVisible();
  await page.getByRole('button', { name: /在校园里找数学/ }).click();
  await expect(page.getByRole('button', { name: /在校园里找一找/ })).toBeVisible();
  await page.getByRole('button', { name: /在校园里找一找/ }).click();
  await expect(page.getByRole('heading', { name: '在校园里找一找' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '校园里藏着哪些数学？' })).toBeVisible();
  await expect(page.getByRole('img', { name: '三栋教学楼，中间教学楼底层有入口，上方有三排窗户' })).toBeVisible();

  await page.getByRole('button', { name: '4 层', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  await expect(page.locator('.mt-campus-scene')).toBeVisible();
  await expect(page.getByRole('button', { name: '我动手试过了，去说理由 →' })).toBeDisabled();
  await expect(page.getByText('已经点亮 0 / 4 层')).toBeVisible();
  for (let index = 0; index < 4; index++) await page.locator('.mt-floor-buttons button').nth(index).click();
  await expect(page.getByText('数完啦！从底层入口数起，一共有 4 层。')).toBeVisible();
  await page.reload();
  await expect(page.locator('.mt-campus-scene')).toBeVisible();
  await expect(page.getByRole('button', { name: '我动手试过了，去说理由 →' })).toBeEnabled();
  await page.getByRole('button', { name: '我动手试过了，去说理由 →' }).click();
  await page.getByRole('button', { name: '只数上面的三排窗户' }).click();
  await expect(page.getByText('这个理由还不能解释刚才的操作，再试一次。')).toBeVisible();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: '底层入口是第 1 层，再数上面三层' }).click();
  await expect(page.getByRole('region', { name: '本课知识延伸' })).toBeVisible();
  await expect(page.getByRole('button', { name: '进入小检测 →' })).toBeDisabled();
  await page.getByRole('button', { name: '入口与实际楼层' }).click();
  await expect(page.getByText('✓ 方法能用到新问题了')).toBeVisible();
  await page.getByRole('button', { name: '进入小检测 →' }).click();
  await page.getByRole('button', { name: '4 层', exact: true }).click();
  await expect(page.getByText('智能闯关 · 五类迁移题，答错自动重练')).toBeVisible();
  const objectives = await finishPerfectCampusArena(page);
  expect(new Set(objectives).size).toBe(5);
  await expect(page.locator('.ct-lesson-footer span')).toContainText('✓ 本课已理解');
  await page.goto('/#/subject/math');
  await expect(page.locator('.ct-lesson-entry.done')).toContainText('满星');

  await page.goto('/#/math-course/numbers');
  await expect(page.getByRole('img', { name: '桌面上摆着四个南瓜' })).toBeVisible();
  await page.getByRole('button', { name: '4 个', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  await expect(page.getByRole('button', { name: '我动手试过了，去说理由 →' })).toBeDisabled();
  for (const value of [1, 2, 3, 4, 5]) {
    await page.locator('.mt-number-selector button').filter({ hasText: String(value) }).click();
    await dragBeadsLeft(page, value);
    await expect(page.locator('.mt-number-selector button').filter({ hasText: String(value) })).toHaveClass(/done/);
    if (value < 5) await page.waitForTimeout(1550);
  }
  await expect(page.getByRole('button', { name: '我动手试过了，去说理由 →' })).toBeEnabled();
  const allBeadsInsideTrack = await page.locator('.mt-abacus').evaluate((abacus) => {
    const track = abacus.getBoundingClientRect();
    return [...abacus.querySelectorAll('button')].every((bead) => {
      const box = bead.getBoundingClientRect();
      return box.left >= track.left && box.right <= track.right;
    });
  });
  expect(allBeadsInsideTrack).toBeTruthy();
  await expect(page.locator('.mt-symbol-card strong')).toHaveText('5');
  await expect(page.locator('.mt-object-row span')).toHaveCount(5);
  await expect(page.getByLabel('数字 5 的笔顺动画')).toBeVisible();
  const guidePaths = await page.locator('[aria-label="数字 5 的笔顺动画"] .mt-digit-guide path').evaluateAll((paths) => paths.map((path) => path.getAttribute('d')));
  const animatedPaths = await page.locator('[aria-label="数字 5 的笔顺动画"] .mt-digit-animation path').evaluateAll((paths) => paths.map((path) => path.getAttribute('d')));
  expect(animatedPaths).toEqual(guidePaths);
  await expect(page.locator('.mt-stroke-steps li')).toHaveCount(2);
  await expect(page.getByText('书写练习帮助掌握笔画，不计入本节数量任务、课程星级或“是否理解数字”的判断。')).toBeVisible();
  const writePad = page.locator('.mt-write-pad');
  await writePad.scrollIntoViewIfNeeded();
  const box = await writePad.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move((box?.x ?? 0) + 70, (box?.y ?? 0) + 30);
  await page.mouse.down();
  await page.mouse.move((box?.x ?? 0) + 55, (box?.y ?? 0) + 120, { steps: 8 });
  await page.mouse.up();
  await expect(writePad.locator('polyline')).toHaveCount(1);
  await page.getByRole('button', { name: '✅ 智能批改' }).click();
  await expect(page.getByText('这一次先练笔画，不给数量理解下结论')).toBeVisible();

  await page.goto('/#/math-course/compare');
  await expect(page.getByRole('img', { name: '三只小猴和两个香蕉等待配对' })).toBeVisible();
  await page.getByRole('button', { name: '小猴', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  await expect(page.locator('.mt-live-relation')).toHaveText('=');
  await expect(page.locator('.mt-equation')).toContainText('3=3');
  await expect(page.getByRole('button', { name: '我动手试过了，去说理由 →' })).toBeDisabled();
  await page.locator('.mt-pair-monkey').nth(1).click();
  await expect(page.getByText('已配对 0 / 3 对')).toBeVisible();
  for (let index = 0; index < 3; index++) {
    await page.locator('.mt-pair-monkey').nth(index).click();
    await page.locator('.mt-pair-fruit').nth(index).click();
  }
  await expect(page.getByText('已配对 3 / 3 对')).toBeVisible();
  await expect(page.getByRole('button', { name: '我动手试过了，去说理由 →' })).toBeEnabled();
  await page.getByRole('button', { name: '3 和 2 · 谁更多' }).click();
  await expect(page.locator('.mt-live-relation')).toHaveText('>');
  await expect(page.locator('.mt-equation')).toContainText('3>2');

  await page.getByRole('button', { name: '我动手试过了，去说理由 →' }).click();
  await page.getByRole('button', { name: '一个小猴配一个水果，看哪边有剩余' }).click();
  await page.getByRole('button', { name: '不公平' }).click();
  await page.getByRole('button', { name: '进入小检测 →' }).click();
  await page.getByRole('button', { name: '3 < 4', exact: true }).click();
  await expect(page.getByText('智能闯关 · 五类迁移题，答错自动重练')).toBeVisible();

  await page.goto('/#/math-course/ordinal');
  await expect(page.getByRole('img', { name: '火车前有五个人排队，穿绿色衣服的小朋友排在第二位' })).toBeVisible();
  await page.getByRole('button', { name: '第 2', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  await expect(page.getByRole('button', { name: '我动手试过了，去说理由 →' })).toBeDisabled();
  await page.locator('.mt-queue button').nth(1).click();
  await page.getByRole('button', { name: '从左数 →' }).click();
  await page.locator('.mt-queue button').nth(1).click();
  await expect(page.getByRole('button', { name: '我动手试过了，去说理由 →' })).toBeEnabled();

  await page.goto('/#/math-course/compose');
  await expect(page.getByRole('img', { name: '五个玉米和左右两个空篮子' })).toBeVisible();
  await page.getByRole('button', { name: '两种都可以' }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  await page.getByRole('button', { name: '1 和 4' }).click();
  await expect(page.getByRole('button', { name: '我动手试过了，去说理由 →' })).toBeDisabled();
  for (let index = 0; index < 5; index++) {
    await page.locator('.mt-drag-corn').first().click();
    await page.locator('.mt-drag-basket').nth(index % 2).click();
  }
  await expect(page.getByText('玉米都分完了')).toBeVisible();
  await expect(page.getByRole('button', { name: '我动手试过了，去说理由 →' })).toBeEnabled();

  await page.reload();
  await expect(page.locator('.mt-drag-stage')).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('知识桥中的位值与凑十必须实做模型并迁移到新问题', async ({ page }) => {
  test.setTimeout(60_000);
  for (const [id, reason, answer, count, modelName] of [
    ['ten-again', '便于按十计数', '仍是 10 根', 10, '数十根小棒'],
    ['plus-nine', '10 加几容易计算', '5 个', 1, '凑十操作'],
  ] as const) {
    await page.goto(`/#/math-course/${id}`);
    await page.evaluate(() => {
      const key = `sfz-math-flow-v2:math-textbook-child:${window.location.hash}`;
      localStorage.setItem(key, JSON.stringify({ phase: 2, unlocked: 2, actionDone: true }));
    });
    await page.reload();
    await page.getByRole('button', { name: reason }).click();
    await expect(page.getByRole('region', { name: '本课知识延伸' })).toBeVisible();
    await expect(page.getByRole('button', { name: '进入小检测 →' })).toBeDisabled();
    await page.getByRole('button', { name: answer }).click();
    await expect(page.getByRole('button', { name: '进入小检测 →' })).toBeDisabled();
    for (let index = 0; index < count; index++) await page.getByRole('group', { name: modelName }).locator('button:not([disabled])').first().click();
    await expect(page.getByRole('button', { name: '进入小检测 →' })).toBeEnabled();
    await page.reload();
    await page.getByRole('button', { name: reason }).click();
    await expect(page.getByText('✓ 方法能用到新问题了')).toBeVisible();
    await expect(page.getByRole('button', { name: '进入小检测 →' })).toBeEnabled();
  }
});

test('知识桥在深浅主题和桌面平板宽度下文字清晰且不横向溢出', async ({ page }) => {
  await page.goto('/#/math-course/campus');
  await page.evaluate(() => {
    const key = `sfz-math-flow-v2:math-textbook-child:${window.location.hash}`;
    localStorage.setItem(key, JSON.stringify({ phase: 2, unlocked: 2, actionDone: true }));
  });
  await page.reload();
  await page.getByRole('button', { name: '底层入口是第 1 层，再数上面三层' }).click();
  const bridge = page.getByRole('region', { name: '本课知识延伸' });
  for (const theme of ['dark', 'light'] as const) {
    await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);
    for (const width of [1280, 820, 700]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(bridge).toBeVisible();
      const style = await bridge.evaluate((element) => {
        const computed = getComputedStyle(element);
        return { color: computed.color, background: computed.backgroundColor, overflow: element.scrollWidth > element.clientWidth + 2 };
      });
      expect(style.overflow, `${theme} / ${width}`).toBeFalsy();
      if (theme === 'light') {
        expect(style.color).toBe('rgb(36, 50, 74)');
        expect(style.background).toBe('rgb(255, 255, 255)');
      }
    }
  }
});

test('数学错题可从错题本回到对应单课', async ({ page }) => {
  await page.goto('/#/wrongs?subject=math');
  await expect(page.getByText('比大小')).toBeVisible();
  await expect(page.getByText('3 ○ 4，填什么符号？')).toBeVisible();
  await page.getByRole('button', { name: /再练/ }).click();
  await expect(page).toHaveURL(/#\/math-course\/compare$/);
  await expect(page.getByRole('heading', { name: '先配对，再写符号' })).toBeVisible();
});

test('动手环节在深浅色、桌面和平板下保持单一任务与同步提示', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/#/math-course/compare');
  await page.getByRole('button', { name: '小猴', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  await expect(page.locator('.mt-operation-coach')).toContainText('本环节只做这一件事');
  await expect(page.locator('.mt-operation-coach')).toContainText('还有 3 只小猴没有桃子');
  await page.locator('.mt-pair-monkey').first().click();
  await expect(page.locator('.mt-operation-coach')).toContainText('第 1 只小猴在等桃子');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();

  await page.evaluate(() => document.documentElement.dataset.theme = 'light');
  await page.setViewportSize({ width: 768, height: 900 });
  await expect(page.locator('.mt-operation-coach')).toBeVisible();
  const coachColors = await page.locator('.mt-operation-coach').evaluate((element) => {
    const style = getComputedStyle(element);
    return { color: style.color, background: style.backgroundImage };
  });
  expect(coachColors.color).not.toBe('rgb(255, 255, 255)');
  expect(coachColors.background).not.toBe('none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test('一年级上册全部课时均已开放且可独立进入', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/#/subject/math');
  const expectedTotal = MATH_UPPER_UNITS.reduce((sum, unit) => sum + unit.lessons.length, 0);
  await expect(page.locator('.ct-progress-orbit small')).toContainText(`/ ${expectedTotal} 课`);
  for (const unit of MATH_UPPER_UNITS) {
    await page.getByRole('button', { name: new RegExp(unit.title) }).click();
    await expect(page.locator('.ct-lesson-entry')).toHaveCount(unit.lessons.length);
    await expect(page.locator('.ct-lesson-entry:disabled')).toHaveCount(0);
  }
  for (const lesson of EXTENDED_MATH_LESSONS) {
    await page.goto(`/#/math-course/${lesson.id}`);
    await expect(page.getByRole('heading', { name: lesson.title, exact: true, level: 1 })).toBeVisible();
    await expect(page.getByRole('img', { name: `${lesson.title}观察图` })).toBeVisible();
    await expect(page.getByRole('button', { name: '带着猜想去验证 →' })).toBeVisible();
  }
  expect(pageErrors).toEqual([]);
});

test('全册通用学具要求真实操作并给出进度反馈', async ({ page }) => {
  await page.goto('/#/math-course/ten');
  await page.getByRole('button', { name: '10', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  await expect(page.getByRole('button', { name: '我动手试过了，去说理由 →' })).toBeDisabled();
  await page.locator('.mt-ten-frame button.next').click();
  await expect(page.locator('.mt-operation-coach')).toContainText('关键操作已完成');
  await expect(page.getByRole('button', { name: '我动手试过了，去说理由 →' })).toBeEnabled();

  await page.goto('/#/math-course/add-within-5');
  await page.getByRole('button', { name: '变多', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  for (const button of await page.locator('.mt-join-groups section').nth(0).locator('button').all()) await button.click();
  for (const button of await page.locator('.mt-join-groups section').nth(1).locator('button').all()) await button.click();
  await expect(page.locator('.mt-whole-tray')).toContainText('3 ＋ 1 ＝ 4');
  await expect(page.getByRole('button', { name: '我动手试过了，去说理由 →' })).toBeEnabled();

  await page.goto('/#/math-course/solid-shapes');
  await page.getByRole('button', { name: '球', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  for (const [index, shape] of ['长方体', '正方体', '圆柱', '球'].entries()) {
    await page.locator('.mt-sort-objects button').nth(index).click();
    await page.locator('.mt-shape-homes').getByRole('button', { name: shape, exact: true }).click();
  }
  await expect(page.getByText('✓ 分类完成')).toBeVisible();
  await expect(page.getByRole('button', { name: '我动手试过了，去说理由 →' })).toBeEnabled();
});

test('智能闯关使用不重复的迁移能力，而非复问动手原题', async ({ page }) => {
  await page.goto('/#/math-course/add-within-5');
  await page.getByRole('button', { name: '变多', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  for (const button of await page.locator('.mt-join-groups section').nth(0).locator('button').all()) await button.click();
  for (const button of await page.locator('.mt-join-groups section').nth(1).locator('button').all()) await button.click();
  await page.getByRole('button', { name: '我动手试过了，去说理由 →' }).click();
  await page.getByRole('button', { name: '把两部分合起来求总数', exact: true }).click();
  await page.getByRole('button', { name: '从 4 接着数 5' }).click();
  await page.getByRole('button', { name: '进入小检测 →' }).click();
  await page.getByRole('button', { name: '2+3=5', exact: true }).click();

  const answers = ['1', '5', '3＋1＝4', '4－3＝1', '加法'];
  const objectives: string[] = [];
  const prompts: string[] = [];
  for (const answer of answers) {
    objectives.push((await page.locator('.mt-arena-objective').textContent()) ?? '');
    prompts.push((await page.locator('.mt-arena-q b').textContent()) ?? '');
    await page.locator('.mt-arena-opts button').getByText(answer, { exact: true }).click();
    await page.waitForTimeout(900);
  }
  expect(new Set(objectives).size).toBe(5);
  expect(prompts).not.toContain('把 3 只和 1 只小动物逐个送进“合起来”的圈。');
  await expect(page.getByText('🎉 闯关成功')).toBeVisible();
});
