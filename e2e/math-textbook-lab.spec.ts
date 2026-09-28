import { test, expect } from '@playwright/test';
import { EXTENDED_MATH_LESSONS, MATH_UPPER_UNITS } from '../src/content/mathUpperCurriculum';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

test.use({ launchOptions: { executablePath: CHROME } });

async function finishPerfectCampusArena(page: import('@playwright/test').Page) {
  // 连对三题会插入一道数序进阶题；这也验证高掌握表现不会只重复原来的五题。
  const answers = ['5 层', '底层入口这一层', '第 4 层', '12', '确认起点后从下到上一层一层数', '5'];
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
    localStorage.removeItem(`sfz-math-flow-v4:${id}:/#/math-course/numbers`);
    localStorage.removeItem(`sfz-math-flow-v3:${id}:/#/math-course/numbers`);
    localStorage.removeItem(`sfz-math-flow-v3:${id}:/#/math-course/compare`);
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
  for (const answer of ['5 颗五角星', '长方形', '从哪一层开始数']) {
    await page.locator('.mt-generic-task').getByRole('button', { name: answer, exact: true }).click();
  }
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
  expect(new Set(objectives).size).toBe(6);
  expect(objectives).toContain('本题考查：进阶挑战 · 数与顺序');
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
  const numberPractice = page.getByRole('region', { name: '1到5圈和连线练习' });
  await numberPractice.getByRole('button', { name: '豌豆，5 个' }).click();
  const objectLinks = numberPractice.getByRole('group', { name: '数字和实物连线' });
  for (const [number, label] of [[1, '1 个小羊'], [2, '2 个蜜蜂'], [3, '3 个小鸟'], [4, '4 个熊猫'], [5, '5 个公鸡']] as const) {
    await objectLinks.getByRole('button', { name: `数字 ${number}`, exact: true }).click();
    await objectLinks.getByRole('button', { name: label }).click();
  }
  const dotLinks = numberPractice.getByRole('group', { name: '点子和数字连线' });
  for (const number of [1, 2, 3, 4, 5]) {
    await dotLinks.getByRole('button', { name: `${number} 个点子`, exact: true }).click();
    await dotLinks.getByRole('button', { name: `数字 ${number}`, exact: true }).click();
  }
  const orderTask = numberPractice.getByLabel('1到5数序答案').locator('..');
  for (const number of [1, 2, 3, 4, 5]) await orderTask.getByRole('button', { name: String(number), exact: true }).click();
  await expect(numberPractice.getByText('✓ 五条线都连好了')).toHaveCount(2);
  await expect(numberPractice.getByText('✓ 1、2、3、4、5 已按从小到大排好')).toBeVisible();
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
  // 课程顶部的步骤导航会吸顶；居中定位后再用真实鼠标轨迹，避免只露出 1px 时点到导航按钮。
  await writePad.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'center' }));
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
  const compareBoard = page.getByRole('region', { name: '5以内一一对应比较板' });
  for (let index = 0; index < 3; index++) await compareBoard.getByRole('button', { name: `给第 ${index + 1} 只小猴分桃` }).click();
  await compareBoard.locator('article').filter({ hasText: '4 个桃子和 3 只小猴' }).getByRole('button', { name: '4＞3', exact: true }).click();
  await compareBoard.locator('article').filter({ hasText: '3 个圆片和 3 个方块' }).getByRole('button', { name: '3＝3', exact: true }).click();
  await expect(compareBoard).toContainText('✓ 配完有剩余的一边更多；配完都没有剩余就是同样多。');
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
  const ordinalBoard = page.getByRole('region', { name: '5以内序数方向板' });
  await ordinalBoard.getByRole('button', { name: '从左边开始', exact: true }).click();
  await ordinalBoard.getByRole('button', { name: '从左位置 4', exact: true }).click();
  await ordinalBoard.getByRole('button', { name: '从右位置 4', exact: true }).click();
  await expect(ordinalBoard).toContainText('✓ 火车方向变了，第几个的位置也会变。');
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
  const composeBoard = page.getByRole('region', { name: '5的分与合记录板' });
  for (const pair of ['0 和 5', '1 和 4', '2 和 3']) {
    await composeBoard.locator('article').filter({ hasText: `5 = ${pair}` }).getByRole('button', { name: '把玉米分进两篮' }).click();
  }
  await expect(composeBoard).toContainText('✓ 5 有三组不同分法；左右交换仍是同一组。');
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
      const key = `sfz-math-flow-v4:math-textbook-child:${window.location.hash}`;
      localStorage.setItem(key, JSON.stringify({ contentVersion: 4, phase: 2, unlocked: 2, actionDone: true, knowledgeDone: false }));
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
    const key = `sfz-math-flow-v4:math-textbook-child:${window.location.hash}`;
    localStorage.setItem(key, JSON.stringify({ contentVersion: 4, phase: 2, unlocked: 2, actionDone: true, knowledgeDone: false }));
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

test('旧版单任务断点会迁移到新增教材任务入口，不能跳过双任务', async ({ page }) => {
  await page.goto('/#/math-course/plus-nine');
  await page.evaluate(() => {
    const key = `sfz-math-flow-v3:math-textbook-child:${window.location.hash}`;
    localStorage.setItem(key, JSON.stringify({ phase: 4, unlocked: 4, actionDone: true, knowledgeDone: true }));
  });
  await page.reload();
  await expect(page.locator('.mt-operation-coach')).toContainText('教材任务一');
  await expect(page.locator('.mt-operation-coach')).toContainText('教材任务二');
  await expect(page.getByRole('button', { name: '我动手试过了，去说理由 →' })).toBeDisabled();
  const migrated = await page.evaluate(() => JSON.parse(localStorage.getItem(`sfz-math-flow-v4:math-textbook-child:${window.location.hash}`) ?? '{}'));
  expect(migrated).toMatchObject({ contentVersion: 4, phase: 1, unlocked: 1, actionDone: false });
});

test('第一任务站和专属学具共享同一课的精确断点', async ({ page }) => {
  await page.goto('/#/math-course/campus');
  await page.getByRole('button', { name: '4 层', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  await page.locator('.mt-floor-buttons button').nth(0).click();
  await page.locator('.mt-floor-buttons button').nth(1).click();
  await page.reload();
  await expect(page.getByText('已经点亮 2 / 4 层')).toBeVisible();

  await page.goto('/#/math-course/ten-again');
  await page.getByRole('button', { name: '10 根捆成一捆', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  for (let index = 0; index < 3; index++) await page.locator('.mt-tool-scene.count button').nth(index).click({ force: true });
  await page.reload();
  await expect(page.getByText('已经按顺序数了 3 / 10 个')).toBeVisible();
});

test('数学游戏开放观察与第一单元圈涂连练习可保存并恢复', async ({ page }) => {
  await page.goto('/#/math-course/campus');
  await page.getByRole('button', { name: '4 层', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const observation = page.getByRole('region', { name: '开放数学观察记录' });
  await observation.getByRole('textbox').fill('花坛里有 6 朵花。');
  await observation.getByRole('button', { name: '保存我的发现' }).click();
  await expect(observation.getByText('已记录：花坛里有 6 朵花。')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: '开放数学观察记录' }).getByRole('textbox')).toHaveValue('花坛里有 6 朵花。');

  await page.goto('/#/math-course/unit1-review');
  await page.getByRole('button', { name: '能', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const knowledgeMap = page.getByRole('region', { name: '第一单元知识图' });
  for (const link of ['数一数　→　比一比', '分与合　→　加减法', '加减法　→　检查答案']) {
    await knowledgeMap.locator('article').filter({ hasText: link }).getByRole('button', { name: '连通这两个知识点' }).click();
  }
  await expect(knowledgeMap.getByText('✓ 三条关系都连通了')).toBeVisible();
  const marking = page.getByRole('region', { name: '第一单元圈选涂色连线练习' });
  await marking.getByRole('button', { name: '●' }).nth(0).click();
  await marking.getByRole('button', { name: '●' }).nth(1).click();
  await marking.getByRole('button', { name: '●' }).nth(2).click();
  await marking.getByRole('button', { name: '●' }).nth(3).click();
  await marking.getByRole('button', { name: '4', exact: true }).click();
  await marking.getByRole('button', { name: '●●　　 2' }).click();
  await expect(marking.getByText('✓ 正好圈了 4 个')).toBeVisible();
  await expect(marking.getByText('✓ 第 4 个已涂色')).toBeVisible();
  await expect(marking.getByText('✓ 已连线')).toBeVisible();
  const p22 = page.getByRole('region', { name: '第一单元P22练一练' });
  for (const [label, value] of [['遮住的第一个雪人', '3'], ['遮住的第二个雪人', '4'], ['遮住几个雪人', '2']] as const) await p22.getByLabel(label).fill(value);
  for (const [index, value] of ['3', '2', '3', '4', '1'].entries()) await p22.getByLabel(`分合填空第 ${index + 1} 格`).fill(value);
  for (const [label, value] of [['大象数量', '3'], ['长颈鹿数量', '2'], ['斑马数量', '3'], ['袋鼠数量', '4']] as const) await p22.getByLabel(label).fill(value);
  await p22.getByRole('button', { name: '＞', exact: true }).first().click();
  await p22.getByRole('button', { name: '＜', exact: true }).last().click();
  await expect(p22.getByText('✓ 第 3 个和第 4 个，共遮住 2 个')).toBeVisible();
  await expect(p22.getByText('✓ 五组分合都填对了')).toBeVisible();
  await expect(p22.getByText('✓ 大小关系都填对了')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: '第一单元P22练一练' }).getByLabel('大象数量')).toHaveValue('3');
});

test('教室数学自我介绍会保存儿童自己的三项信息', async ({ page }) => {
  await page.goto('/#/math-course/classroom-discover');
  await page.getByRole('button', { name: '要根据教室观察', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const introduction = page.getByRole('region', { name: '我的数学自我介绍' });
  await introduction.getByRole('textbox').nth(0).fill('4');
  await introduction.getByRole('textbox').nth(1).fill('阳光幼儿园');
  await introduction.getByRole('textbox').nth(2).fill('画画');
  await introduction.getByRole('button', { name: '保存自我介绍' }).click();
  await page.reload();
  await expect(page.getByRole('region', { name: '我的数学自我介绍' }).getByRole('textbox').nth(1)).toHaveValue('阳光幼儿园');
});

test('第二单元三类问题解决课保留变式情境与反向检查', async ({ page }) => {
  await page.goto('/#/math-course/solve-remain-within-7');
  await page.getByRole('button', { name: '变少', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const extension = page.getByRole('heading', { name: '树上原有 6 只鸟，飞走 2 只。“还剩”要用哪两条信息？' }).locator('..').locator('..');
  await extension.getByRole('button', { name: '原有 6 只和飞走 2 只' }).click();
  await page.getByRole('button', { name: '4＋2＝6' }).click();
  await expect(page.getByText('✓ 第二个情境和检查都完成了')).toBeVisible();
  await page.reload();
  await expect(page.getByText('✓ 第二个情境和检查都完成了')).toBeVisible();
});

test('第六单元综合应用会保存七项全册成长档案', async ({ page }) => {
  await page.goto('/#/math-course/review-application');
  await page.getByRole('button', { name: '看清信息和问题', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  await page.getByRole('heading', { name: '数表里从 8 向右走 2 格，出口数字是？' }).locator('..').locator('..').getByRole('button', { name: '10', exact: true }).click();
  await page.getByRole('button', { name: '6＋4', exact: true }).click();
  await page.getByRole('button', { name: '确认图中的数量和关系', exact: true }).click();
  const numberPath = page.getByRole('region', { name: '数表路径' });
  for (const value of ['8', '9', '10', '11', '12']) await numberPath.getByRole('button', { name: value, exact: true }).click();
  await expect(numberPath.getByText('已走到出口')).toBeVisible();
  const tenGrid = page.getByRole('region', { name: '得数十涂色加法表' });
  for (const equation of ['1＋9', '2＋8', '3＋7', '4＋6', '5＋5']) await tenGrid.getByRole('button', { name: new RegExp(equation) }).click();
  await expect(tenGrid.getByText('每一对加数合起来都是 10')).toBeVisible();
  const composer = page.getByRole('region', { name: '开放问题编制板' });
  await composer.getByRole('button', { name: '红色印章 4 枚' }).click();
  await composer.getByRole('button', { name: '蓝色印章 3 枚' }).click();
  await composer.locator('textarea').fill('红色和蓝色印章一共有几枚？');
  await composer.getByRole('button', { name: '4＋3', exact: true }).click();
  await composer.locator('input').fill('7');
  await expect(composer.getByText('你提出并解答了一个有依据的数学问题')).toBeVisible();
  const portfolio = page.getByRole('region', { name: '全册成长档案' });
  await expect(portfolio.locator('article')).toHaveCount(7);
  await portfolio.getByRole('button', { name: '记录我的情况' }).first().click();
  await expect(portfolio.getByRole('button', { name: '✓ 我会了' })).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('region', { name: '全册成长档案' }).getByRole('button', { name: '✓ 我会了' })).toHaveCount(1);
});

test('P100 保留进位加法三角表、凑十回顾、看图列式和行列观察', async ({ page }) => {
  await page.goto('/#/math-course/addition-table');
  await page.getByRole('button', { name: '容易', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const table = page.getByRole('region', { name: '进位加法表' });
  for (const equation of ['5＋7', '4＋8', '3＋9', '6＋7', '5＋8', '4＋9', '6＋8', '5＋9', '6＋9', '7＋9']) {
    await table.getByLabel(`填写 ${equation}`).fill(equation.split('＋')[1]);
  }
  await expect(table.getByText('10 个空格都补全了')).toBeVisible();
  const review = page.getByRole('region', { name: '进位加法表观察记录' });
  await review.getByLabel('8加9拆出的数').fill('2');
  await review.getByLabel('8加9剩余的数').fill('7');
  await review.getByLabel('6加5看图列式').fill('6＋5＝11');
  const chosenEquation = review.getByRole('button', { name: '8＋9', exact: true });
  await chosenEquation.focus();
  await page.keyboard.press('Enter');
  await review.getByLabel('计算 8＋9').fill('17');
  await review.getByLabel('第一列规律').fill('第二个加数每次加一，得数也每次加一。');
  await review.getByLabel('第一行规律').fill('第一个加数减一，第二个加数加一，和不变。');
  await expect(review.getByText('四项原页整理任务都完成了')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: '进位加法表观察记录' }).getByText('四项原页整理任务都完成了')).toBeVisible();
});

test('P101-P102 保留八组进位加法练习和思考题', async ({ page }) => {
  await page.goto('/#/math-course/unit5-review');
  await page.getByRole('button', { name: '10', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const sheet = page.getByRole('region', { name: '第五单元教材练习单' });
  const calculations: Record<string, string> = { '3＋9': '12', '6＋7': '13', '5＋8': '13', '2＋9': '11', '3＋7': '10', '7＋5': '12', '10＋4': '14', '8－3': '5', '6＋6': '12', '7＋7': '14', '8＋8': '16', '9＋9': '18' };
  for (const [equation, answer] of Object.entries(calculations)) await sheet.getByLabel(`P101口算 ${equation}`).fill(answer);
  await sheet.getByLabel('P101比较得数大').fill('4＋9');
  for (const equation of ['6＋7', '7＋6', '8＋5', '8＋3', '9＋2', '10＋1']) await sheet.getByLabel(`填写同和算式 ${equation}`).fill(equation);
  await sheet.getByLabel('P101积木列式').fill('7＋9＝16');
  for (const [index, sign] of ['＋', '－', '＋', '－'].entries()) await sheet.getByLabel(`P101运算符 ${index + 1}`).fill(sign);
  await sheet.getByLabel('P102饺子列式').fill('8＋5＝13');
  const unknowns: Record<string, string> = { '7＋□＝16': '9', '9＋□＝12': '3', '□＋3＝11': '8', '6＋□＝13': '7', '8＋□＝15': '7', '□＋4＝14': '10' };
  for (const [equation, answer] of Object.entries(unknowns)) await sheet.getByLabel(`P102未知数 ${equation}`).fill(answer);
  await sheet.getByLabel('P102排队答案').fill('14');
  await expect(sheet.getByText('P101-P102 的 8 组教材任务都完成并保存了')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: '第五单元教材练习单' }).getByText('P101-P102 的 8 组教材任务都完成并保存了')).toBeVisible();
});

test('P85-P87 保留数位复习、数序游戏、得数分类和成长档案', async ({ page }) => {
  test.setTimeout(15_000);
  await page.goto('/#/math-course/unit4-review');
  await page.getByRole('button', { name: '1 个十和 8 个一', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const sheet = page.getByRole('region', { name: '第四单元教材复习单' });
  await sheet.getByLabel('P85知识图数').fill('13');
  await sheet.getByLabel('第四单元成长档案').fill('我会把十个一捆起来数。');
  for (const [number, tens, ones] of [['17', '1', '7'], ['15', '1', '5'], ['18', '1', '8'], ['20', '2', '0']]) {
    await sheet.getByLabel(`${number}的十位`).fill(tens);
    await sheet.getByLabel(`${number}的个位`).fill(ones);
  }
  await sheet.getByLabel('P86中间站数').fill('6');
  await sheet.getByLabel('P86水果路径').fill('桃子');
  for (const [equation, answer] of [['7＋□＝10', '3'], ['10＋□＝12', '2'], ['11＋□＝13', '2']]) await sheet.getByLabel(`P86 ${equation}`).fill(answer);
  const results: Record<string, string> = { '0＋8': '8', '10－2': '8', '3＋5': '8', '12＋1': '13', '13＋0': '13', '11＋2': '13', '14－1': '13', '15－1': '14', '10＋4': '14', '14＋0': '14' };
  await sheet.locator('input[aria-label^="P87得数 "]').evaluateAll((nodes, values) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    nodes.forEach((node) => {
      const input = node as HTMLInputElement;
      const equation = input.getAttribute('aria-label')?.replace('P87得数 ', '') ?? '';
      setter?.call(input, (values as Record<string, string>)[equation]);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }, results);
  await sheet.getByLabel('P87单双数').fill('偶数');
  await expect(sheet.getByText('P85-P87 的教材任务都完成并保存了')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: '第四单元教材复习单' }).getByText('P85-P87 的教材任务都完成并保存了')).toBeVisible();
});

test('P67-P72 保留全部材料拼搭、不同拼法、分类计数和规律', async ({ page }) => {
  await page.goto('/#/math-course/solid-compose');
  await page.getByRole('button', { name: '长方体', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const compose = page.locator('.mt-solid-task');
  for (let index = 0; index < 4; index += 1) await compose.locator('button.target').first().click();
  await compose.getByRole('button', { name: '相同拼法', exact: true }).click();
  const board = page.getByRole('region', { name: '立体图形教材拼搭与练习板' });
  const tower = board.getByRole('region', { name: 'P70全部材料拼搭' });
  for (const material of ['1 个正方体', '5 个长方体', '1 个球', '1 个圆柱']) await tower.getByRole('button', { name: material, exact: true }).click();
  await tower.getByRole('button', { name: '底座选长方体', exact: true }).click();
  await tower.getByRole('button', { name: '顶端选球', exact: true }).click();
  const make = board.getByRole('region', { name: 'P71做一做' });
  await make.getByRole('button', { name: '4 个排成一行', exact: true }).click();
  await make.getByRole('button', { name: '2 个一排，叠两层', exact: true }).click();
  await make.getByRole('button', { name: '同一种拼法', exact: true }).click();
  const practice = board.getByRole('region', { name: 'P72练一练' });
  for (const [item, shape] of [['胶棒', '圆柱'], ['魔方', '正方体'], ['玻璃球', '球'], ['文具盒', '长方体'], ['茶叶盒', '长方体']]) await practice.getByRole('button', { name: `${item}是${shape}` }).click();
  for (const [name, value] of [['长方体', '5'], ['正方体', '2'], ['球', '2'], ['圆柱', '2']]) await board.getByLabel(`P72计数 ${name}`).fill(value);
  await practice.getByRole('button', { name: '圆柱、正方体、球', exact: true }).click();
  await expect(board.getByText('P70-P72 的教材拼搭与练习全部完成')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: '立体图形教材拼搭与练习板' }).getByText('P70-P72 的教材拼搭与练习全部完成')).toBeVisible();
});

test('P108 复习课用八块小正方体拼成二乘二乘二大正方体', async ({ page }) => {
  await page.goto('/#/math-course/review-shapes');
  await page.getByRole('button', { name: '形状和稳定性', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const builder = page.getByRole('region', { name: '二乘二乘二正方体拼搭' });
  await expect(builder.getByRole('button')).toHaveCount(8);
  for (let index = 0; index < 8; index += 1) await builder.locator('.mt-solid-grid button.target').click();
  await expect(builder.getByText('2×2×2 大正方体完成')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: '二乘二乘二正方体拼搭' }).getByText('2×2×2 大正方体完成')).toBeVisible();
});

test('P109 用数量关系算式链区分剩余、原来与反向检查', async ({ page }) => {
  await page.goto('/#/math-course/review-relations');
  await page.getByRole('button', { name: '部分合成整体', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const chain = page.getByRole('region', { name: '数量关系算式链' });
  await chain.locator('article').nth(0).getByRole('button', { name: '12－5＝7' }).click();
  await chain.locator('article').nth(1).getByRole('button', { name: '6＋7＝13' }).click();
  await chain.locator('article').nth(2).getByRole('button', { name: '7＋5＝12' }).click();
  await expect(chain.getByText('已完成剩余、原来与反向检查')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: '数量关系算式链' }).getByText('已完成剩余、原来与反向检查')).toBeVisible();
});

test('P64 把十以内加减法算式卡按运算符整理并保存', async ({ page }) => {
  await page.goto('/#/math-course/unit2-review');
  await page.getByRole('button', { name: '可以', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const cards = page.getByRole('region', { name: '十以内加减法算式卡整理' });
  await cards.locator('article').nth(0).getByRole('button', { name: '加法' }).click();
  await cards.locator('article').nth(1).getByRole('button', { name: '加法' }).click();
  await cards.locator('article').nth(2).getByRole('button', { name: '减法' }).click();
  await cards.locator('article').nth(3).getByRole('button', { name: '减法' }).click();
  await expect(cards.getByText('加法把部分合起来')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: '十以内加减法算式卡整理' }).getByText('加法把部分合起来')).toBeVisible();
});

test('P59 保留连加两次变化的中间结果并恢复', async ({ page }) => {
  await page.goto('/#/math-course/continuous-add-sub');
  await page.getByRole('button', { name: '2 次', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const board = page.getByRole('region', { name: '连加连续变化板' });
  await board.getByRole('button', { name: '把 2 只放进来' }).click();
  await expect(board.getByText('●●●●●●● = 7 ✓')).toBeVisible();
  await board.getByRole('button', { name: '再放 1 只' }).click();
  await expect(board.getByText('5 → 7 → 8')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: '连加连续变化板' }).getByText('5 → 7 → 8')).toBeVisible();
});

test('数学游戏连续任务切换不会进入错误边界', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#/math-course/campus');
  await page.getByRole('button', { name: '4 层', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  for (let index = 0; index < 4; index++) await page.locator('.mt-floor-buttons button').nth(index).click();
  await page.locator('.mt-generic-task').getByRole('button', { name: '5 颗五角星', exact: true }).click();
  await expect(page.locator('.mt-generic-task')).toContainText('教学楼的窗户最接近什么图形？');
  expect(errors).toEqual([]);
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
  await expect(page.locator('.mt-operation-coach')).toContainText('教材任务一');
  await expect(page.locator('.mt-operation-coach')).toContainText('教材任务二');
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

test('数学目录课卡显示覆盖台账的实际教材页码', async ({ page }) => {
  await page.goto('/#/subject/math');
  await page.getByRole('button', { name: /5 以内数的认识和加、减法/ }).click();
  const card = (title: string) => page.locator('.ct-lesson-entry').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await expect(card('1～5 的认识')).toContainText('P12–16');
  await expect(card('比大小')).toContainText('P17–18');
  await expect(card('第几')).toContainText('P19');
  await expect(card('分与合')).toContainText('P20–21');
  await expect(card('第一单元整理和复习')).toContainText('P22–23、P28–29、P31–33');
  const pageProgress = page.getByRole('region', { name: /教材页进度/ });
  await expect(pageProgress).toContainText('已学习 0 / 22 页');
  await expect(pageProgress).toContainText('下一站：1～5 的认识');
});

test('全册通用学具要求真实操作并给出进度反馈', async ({ page }) => {
  await page.goto('/#/math-course/ten');
  await page.getByRole('button', { name: '10', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  await expect(page.getByRole('button', { name: '我动手试过了，去说理由 →' })).toBeDisabled();
  await page.locator('.mt-ten-frame button.next').click();
  const tenPartners = page.getByRole('region', { name: '十的分与合补数板' });
  for (const [index, partner] of [9, 8, 7, 6, 5].entries()) {
    await tenPartners.locator('article').nth(index).getByRole('button', { name: String(partner), exact: true }).click();
  }
  await expect(tenPartners).toContainText('1 和 9、2 和 8、3 和 7、4 和 6、5 和 5 都组成 10');
  const tenWriting = page.getByRole('region', { name: '10的书写和比较板' });
  await tenWriting.getByLabel('写数字10').fill('10');
  await tenWriting.getByRole('button', { name: '10＞9', exact: true }).click();
  const tenCards = page.getByRole('region', { name: '十格伙伴实验桌' });
  await tenCards.getByRole('button', { name: '3', exact: true }).click();
  await tenCards.getByRole('button', { name: '2', exact: true }).click();
  await expect(page.getByRole('button', { name: '我动手试过了，去说理由 →' })).toBeEnabled();

  await page.goto('/#/math-course/add-within-5');
  await page.getByRole('button', { name: '变多', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  for (const button of await page.locator('.mt-join-groups section').nth(0).locator('button').all()) await button.click();
  for (const button of await page.locator('.mt-join-groups section').nth(1).locator('button').all()) await button.click();
  await expect(page.locator('.mt-whole-tray')).toContainText('3 ＋ 1 ＝ 4');
  await page.locator('.mt-addition-practice button.next').click();
  await expect(page.locator('.mt-addition-practice')).toContainText('所以 3＋1＝4');
  await page.getByRole('button', { name: '继续试一试 →' }).click();
  await page.locator('.mt-addition-practice button.next').click();
  await page.locator('.mt-addition-practice button.next').click();
  await page.getByRole('button', { name: '完成加法练习' }).click();
  await expect(page.getByText('3＋1＝4，3＋2＝5；“又来”表示把两部分合起来。')).toBeVisible();
  await expect(page.getByRole('button', { name: '我动手试过了，去说理由 →' })).toBeEnabled();

  await page.goto('/#/math-course/solid-shapes');
  await page.getByRole('button', { name: '球', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  for (const [emoji, shape] of [['📦', '长方体'], ['🎲', '正方体'], ['🥫', '圆柱'], ['⚽', '球']] as const) {
    await page.locator('.mt-match-objects').getByRole('button', { name: emoji, exact: true }).click();
    await page.locator('.mt-match-shapes').getByRole('button', { name: shape, exact: true }).click();
  }
  await expect(page.getByText('✓ 分类完成')).toBeVisible();
  const featureLab = page.getByRole('region', { name: '立体图形特征实验台' });
  for (const [item, feature] of [['球', '能向各个方向滚动'], ['圆柱', '有平面也有曲面'], ['正方体', '六个面一样大'], ['长方体', '适合作稳定底座']] as const) {
    const row = featureLab.locator('article').filter({ hasText: item }).first();
    await row.getByRole('button', { name: `测试${item}` }).click();
    await expect(row.getByRole('button', { name: feature, exact: true })).toBeEnabled();
    await row.getByRole('button', { name: feature, exact: true }).click();
    // is-correct 的 ✓ 由 ::before 提供，会并入可访问名，这里按类名断言选中效果
    await expect(row.locator('button.is-correct')).toHaveCount(1);
  }
  await expect(featureLab).toContainText('器材检测完成');
  await expect(page.getByRole('button', { name: '我动手试过了，去说理由 →' })).toBeEnabled();
});

test('P26-P30 保留逐个拿走与 0 的动态变化', async ({ page }) => {
  await page.goto('/#/math-course/subtract-within-5');
  await page.evaluate(() => localStorage.setItem(`sfz-math-flow-v4:math-textbook-child:${window.location.hash}`, JSON.stringify({ contentVersion: 4, phase: 1, unlocked: 1, actionDone: true, knowledgeDone: false })));
  await page.reload();
  const subtraction = page.getByRole('region', { name: '5以内减法操作练习' });
  await subtraction.locator('button.next').click();
  await subtraction.getByRole('button', { name: '下一道减法 →' }).click();
  for (let index = 0; index < 3; index++) await subtraction.locator('button.next').click();
  await subtraction.getByRole('button', { name: '下一道减法 →' }).click();
  for (let index = 0; index < 2; index++) await subtraction.locator('button.next').click();
  await subtraction.getByRole('button', { name: '完成减法练习' }).click();
  await expect(subtraction.getByText('4－1＝3、5－3＝2、4－2＝2')).toBeVisible();

  await page.goto('/#/math-course/zero');
  await page.evaluate(() => localStorage.setItem(`sfz-math-flow-v4:math-textbook-child:${window.location.hash}`, JSON.stringify({ contentVersion: 4, phase: 1, unlocked: 1, actionDone: true, knowledgeDone: false })));
  await page.reload();
  const zeroChange = page.getByRole('region', { name: '0的动态变化练习' });
  await zeroChange.locator('button.next').click();
  await zeroChange.locator('button.next').click();
  await expect(page.getByText('0＋4＝？')).toBeVisible();
  for (const answer of ['4', '4', '4', '0']) await page.locator('.mt-generic-task').getByRole('button', { name: answer, exact: true }).click();
  await expect(page.getByText('✓ 2→1→0 和 4 条规律都验证了')).toBeVisible();
});

test('P44 一图四式必须由同一组部分与整体实际整理出来', async ({ page }) => {
  await page.goto('/#/math-course/addsub-six-seven');
  await page.getByRole('button', { name: '4 道', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();

  const board = page.getByRole('region', { name: '一图四式关系板' });
  for (const equation of ['5＋1＝6', '1＋5＝6', '6－5＝1', '6－1＝5']) {
    await board.getByRole('button', { name: equation, exact: true }).click();
  }
  await board.getByRole('button', { name: '6－3＝3', exact: true }).click();
  await board.getByRole('button', { name: '7－2＝5', exact: true }).click();
  await expect(board).toContainText('相同部分和遮挡求差都整理对了');
  // 等待过程快照写入，验证刷新后并非只保留本次页面内的视觉状态。
  await page.waitForTimeout(150);
  await page.reload();
  await expect(page.getByRole('region', { name: '一图四式关系板' }).getByRole('button', { name: '5＋1＝6', exact: true })).toHaveClass(/is-correct/);
});

test('P39-P53 保留分合、一图四式和复杂图选信息的连续操作', async ({ page }) => {
  await page.goto('/#/math-course/compose-six-nine');
  await page.getByRole('button', { name: '5', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const splitBoard = page.getByRole('region', { name: '八的分与合记录板' });
  for (let index = 0; index < 5; index += 1) {
    await splitBoard.locator('button:not([disabled])', { hasText: '摆一摆并记录' }).click();
  }
  await expect(splitBoard).toContainText('共有 5 组不同分法');
  await page.waitForTimeout(150);
  await page.reload();
  await expect(page.getByRole('region', { name: '八的分与合记录板' })).toContainText('共有 5 组不同分法');
  const numberPractice = page.getByRole('region', { name: '0到9数序规律和分合练习板' });
  for (const number of [3, 6, 9]) await numberPractice.getByLabel(`数序空格 ${number}`).fill(String(number));
  await numberPractice.getByRole('button', { name: '○', exact: true }).click();
  await numberPractice.getByLabel('车厢位置 5').click();
  for (const [index, answer] of ['1', '3', '4'].entries()) await numberPractice.locator('article').filter({ hasText: '组成' }).nth(index).getByRole('button', { name: answer, exact: true }).click();
  await expect(numberPractice).toContainText('数序、规律、从左第 5 节车厢和三张分合卡都正确');

  await page.goto('/#/math-course/addsub-eight-nine');
  await page.getByRole('button', { name: '9', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const equationBoard = page.getByRole('region', { name: '八和九一图四式关系板' });
  for (const equation of ['5＋3＝8', '3＋5＝8', '8－5＝3', '8－3＝5']) {
    await equationBoard.getByRole('button', { name: equation, exact: true }).click();
  }
  await equationBoard.getByRole('button', { name: '8－4＝4', exact: true }).click();
  await equationBoard.getByRole('button', { name: '9－4＝5', exact: true }).click();
  await expect(equationBoard).toContainText('8 的四式、4＋4 和 9－4＝5 都验证完成');

  await page.goto('/#/math-course/select-info-eight-nine');
  await page.getByRole('button', { name: '一共有的鹿和跑走的鹿', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const filterBoard = page.getByRole('region', { name: '复杂图信息筛选板' });
  const information = [
    ['一共有 9 只鹿', '有用信息'],
    ['跑走 3 只鹿', '有用信息'],
    ['树根处有 6 朵蘑菇', '无关信息'],
    ['有 8 只天鹅', '无关信息'],
  ] as const;
  for (const [statement, choice] of information) {
    const row = filterBoard.getByText(statement, { exact: true }).locator('..');
    await row.getByRole('button', { name: choice, exact: true }).click();
  }
  await expect(filterBoard).toContainText('鹿的信息已筛对');
});

test('P34-P38 保留6到9的数形书写、比较和定向序数操作', async ({ page }) => {
  await page.goto('/#/math-course/six-to-nine');
  await page.getByRole('button', { name: '6', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const representation = page.getByRole('region', { name: '6到9数形书写对应板' });
  for (const number of [6, 7, 8, 9]) {
    const row = representation.locator('article').filter({ hasText: `共计？个` }).nth(number - 6);
    await row.getByRole('button', { name: String(number), exact: true }).click();
    await row.getByLabel(`写数字 ${number}`).fill(String(number));
  }
  await expect(representation).toContainText('6、7、8、9 都能用点子和数字表示');
  await page.waitForTimeout(150);
  await page.reload();
  await expect(page.getByRole('region', { name: '6到9数形书写对应板' }).getByLabel('写数字 9')).toHaveValue('9');

  await page.goto('/#/math-course/compare-order-nine');
  await page.getByRole('button', { name: '7', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const compareOrder = page.getByRole('region', { name: '6到9比较和序数操作板' });
  for (const [index, symbol] of ['＜', '＞', '＝'].entries()) {
    await compareOrder.locator('article').nth(index).getByRole('button', { name: symbol, exact: true }).click();
  }
  const rightSixth = compareOrder.locator('article').filter({ hasText: '从右数第 6 条鱼' });
  await rightSixth.getByRole('button', { name: '从右边开始', exact: true }).click();
  await rightSixth.getByLabel('从右数第 6 条鱼位置 4').click();
  const leftSeventh = compareOrder.locator('article').filter({ hasText: '从左数第 7 只海马' });
  await leftSeventh.getByRole('button', { name: '从左边开始', exact: true }).click();
  await leftSeventh.getByLabel('从左数第 7 只海马位置 7').click();
  await expect(compareOrder).toContainText('从右第 6 个和从左第 7 个都已标出');
});

test('P17-P21 保留一一对应、方向序数和5的完整分合', async ({ page }) => {
  await page.goto('/#/math-course/compare');
  await page.getByRole('button', { name: '小猴', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const compare = page.getByRole('region', { name: '5以内一一对应比较板' });
  for (let index = 0; index < 3; index += 1) await compare.getByRole('button', { name: /给第|三对分好了/ }).click();
  await compare.locator('article').nth(1).getByRole('button', { name: '4＞3', exact: true }).click();
  await compare.locator('article').nth(2).getByRole('button', { name: '3＝3', exact: true }).click();
  await expect(compare).toContainText('配完有剩余的一边更多');

  await page.goto('/#/math-course/ordinal');
  await page.getByRole('button', { name: '第 2', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const ordinal = page.getByRole('region', { name: '5以内序数方向板' });
  await ordinal.getByRole('button', { name: '从左边开始', exact: true }).click();
  await ordinal.getByLabel('从左位置 4').click();
  await ordinal.getByLabel('从右位置 4').click();
  await expect(ordinal).toContainText('方向变了，第几个的位置也会变');

  await page.goto('/#/math-course/compose');
  await page.getByRole('button', { name: '两种都可以', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const compose = page.getByRole('region', { name: '5的分与合记录板' });
  for (let index = 0; index < 3; index += 1) await compose.locator('button:not([disabled])', { hasText: '把玉米分进两篮' }).click();
  await expect(compose).toContainText('5 有三组不同分法');
});

test('P54-P66 保留十的组成、算式组、混合变化与整理提问', async ({ page }) => {
  await page.goto('/#/math-course/ten');
  await page.getByRole('button', { name: '10', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const partners = page.getByRole('region', { name: '十的分与合补数板' });
  for (const [index, partner] of ['9', '8', '7', '6', '5'].entries()) {
    await partners.locator('article').nth(index).getByRole('button', { name: partner, exact: true }).click();
  }
  await expect(partners).toContainText('5 和 5 都组成 10');
  const tenWriting = page.getByRole('region', { name: '10的书写和比较板' });
  await tenWriting.getByLabel('写数字10').fill('10');
  await tenWriting.getByRole('button', { name: '10＞9', exact: true }).click();
  await expect(tenWriting).toContainText('10 写作“1 和 0”');
  await page.waitForTimeout(150);
  await page.reload();
  await expect(page.getByRole('region', { name: '十的分与合补数板' })).toContainText('1 和 9');

  await page.goto('/#/math-course/addsub-ten');
  await page.getByRole('button', { name: '4', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const tenWorkbench = page.getByRole('region', { name: '十的加减法工作台' });
  for (const equation of ['1＋9＝10', '9＋1＝10', '10－1＝9', '10－9＝1']) {
    await tenWorkbench.getByRole('button', { name: equation, exact: true }).click();
  }
  for (let index = 0; index < 10; index += 1) await tenWorkbench.getByRole('button', { name: /发射前数/ }).click();
  await tenWorkbench.getByLabel('给 7＋3＝10 讲一个数量故事').fill('7只鸟又来了3只。');
  await tenWorkbench.getByLabel('给 10－4＝6 讲一个数量故事').fill('10个苹果吃掉4个。');
  await expect(tenWorkbench).toContainText('加减关系、倒数和两道数量故事都完成');

  await page.goto('/#/math-course/continuous-add-sub');
  await page.getByRole('button', { name: '2 次', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const continuousSubtraction = page.getByRole('region', { name: '连减连续变化板' });
  await continuousSubtraction.getByRole('button', { name: '让 2 只飞走' }).click();
  await continuousSubtraction.getByRole('button', { name: '再让 3 只飞走' }).click();
  await expect(continuousSubtraction).toContainText('8 → 6 → 3');

  await page.goto('/#/math-course/mixed-add-sub');
  await page.getByRole('button', { name: '先增加再减少', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const mixedBoard = page.getByRole('region', { name: '加减混合变化板' });
  await mixedBoard.getByRole('button', { name: '把 3 人上车' }).click();
  await mixedBoard.getByRole('button', { name: '让 2 人下车' }).click();
  await expect(mixedBoard).toContainText('4＋3－2＝5');
  const mixedReverse = page.getByRole('region', { name: '先减后加变化板' });
  await mixedReverse.getByRole('button', { name: '让 2 人下车' }).click();
  await mixedReverse.getByRole('button', { name: '让 3 人上车' }).click();
  await expect(mixedReverse).toContainText('7－2＋3＝8');

  await page.goto('/#/math-course/unit2-review');
  await page.getByRole('button', { name: '可以', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const organizer = page.getByRole('region', { name: '十以内加减法算式卡整理' });
  for (const [index, group] of ['加法', '加法', '减法', '减法'].entries()) {
    await organizer.locator('article').nth(index).getByRole('button', { name: group, exact: true }).click();
  }
  const unit2Map = page.getByRole('region', { name: '第二单元知识图' });
  for (let index = 0; index < 3; index += 1) await unit2Map.locator('article').nth(index).getByRole('button', { name: '连通知识关系' }).click();
  await expect(unit2Map).toContainText('三条知识关系都连通了');
  const review = page.getByRole('region', { name: '第二单元整理复习工作台' });
  for (const [index, kind] of ['连加', '连减', '加减混合', '加减混合'].entries()) {
    await review.locator('article').nth(index).getByRole('button', { name: kind, exact: true }).click();
  }
  await review.locator('textarea').fill('左边 4 只和右边 2 只一共有几只？');
  await review.locator('input').fill('6');
  await expect(review).toContainText('提出并解答了 4＋2＝6 的问题');
  const cardLab = page.getByRole('region', { name: '第二单元整理实验桌' });
  await cardLab.getByRole('button', { name: '10', exact: true }).click();
  await cardLab.getByRole('button', { name: '＋2－1', exact: true }).click();
  await expect(page.getByLabel('第二单元复习完成门槛')).toContainText('P63-P66 全部工作台都完成');
});

test('P67-P87 保留图形特征、拼搭、数位、数轴、间隔和第四单元整理', async ({ page }) => {
  await page.goto('/#/math-course/solid-shapes');
  await page.getByRole('button', { name: '球', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const features = page.getByRole('region', { name: '立体图形特征实验台' });
  for (const [index, feature] of ['能向各个方向滚动', '有平面也有曲面', '六个面一样大', '适合作稳定底座'].entries()) {
    await features.locator('article').nth(index).getByRole('button', { name: /测试/ }).click();
    await expect(features.locator('article').nth(index).getByRole('button', { name: feature, exact: true })).toBeEnabled();
    await features.locator('article').nth(index).getByRole('button', { name: feature, exact: true }).click();
  }
  const ballCard = features.locator('article').nth(0);
  const ballTest = ballCard.locator('.mt-block-test-button');
  await ballTest.click();
  await expect(ballCard.locator('.mt-block-test-stage')).toHaveClass(/running/);
  await expect(ballTest).toHaveText('再测一次');
  await expect(features).toContainText('器材检测完成');

  await page.goto('/#/math-course/solid-building');
  await page.getByRole('button', { name: '平面稳定的长方体', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const build = page.locator('.mt-solid-task');
  for (let index = 0; index < 4; index += 1) await build.locator('button.target').first().click();
  await build.getByRole('button', { name: '稳稳的', exact: true }).click();
  await expect(build).toContainText('拼搭完成');

  await page.goto('/#/math-course/solid-compose');
  await page.getByRole('button', { name: '长方体', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const compose = page.locator('.mt-solid-task');
  for (let index = 0; index < 4; index += 1) await compose.locator('button.target').first().click();
  await compose.getByRole('button', { name: '相同拼法', exact: true }).click();
  await expect(compose).toContainText('拼搭完成');

  await page.goto('/#/math-course/eleven-twenty');
  await page.getByRole('button', { name: '15', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const teenWriting = page.getByRole('region', { name: '11到20读写板' });
  for (const number of [11, 13, 16, 18, 20]) await teenWriting.getByLabel(`写数字 ${number}`).fill(String(number));
  await teenWriting.getByRole('button', { name: '2个十', exact: true }).click();
  await expect(teenWriting).toContainText('十几由 1 个十和几个一组成');

  await page.goto('/#/math-course/order-twenty');
  await page.getByRole('button', { name: '10', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const rail = page.getByRole('region', { name: '二十以内数轴轨道' });
  for (const value of ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20']) await rail.locator('article').nth(0).getByRole('button', { name: value, exact: true }).click();
  await rail.locator('article').nth(1).getByRole('button', { name: '10', exact: true }).click();
  await rail.locator('article').nth(2).getByRole('button', { name: '20', exact: true }).click();
  await expect(rail).toContainText('12 更接近 10，18 更接近 20');

  await page.goto('/#/math-course/simple-addsub-twenty');
  await page.getByRole('button', { name: '13', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const tenOnes = page.getByRole('region', { name: '十几加减数位算式板' });
  for (const [index, equation] of ['10＋3＝13', '13－3＝10', '13－10＝3'].entries()) {
    await tenOnes.locator('article').nth(index).getByRole('button', { name: equation, exact: true }).click();
  }
  await expect(tenOnes).toContainText('十和一的位置没有混淆');

  await page.goto('/#/math-course/between-positions');
  await page.getByRole('button', { name: '不包含', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const between = page.getByRole('region', { name: '两人之间位置板' });
  // 按钮文案为「🧒 第 11 人」等（带 emoji 前缀），用正则子串匹配
  for (const person of ['第 11 人', '第 12 人', '第 13 人', '第 14 人']) await between.getByRole('button', { name: new RegExp(person) }).click();
  await expect(between).toContainText('15－10－1＝4');

  await page.goto('/#/math-course/unit4-review');
  await page.getByRole('button', { name: '1 个十和 8 个一', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const review = page.getByRole('region', { name: '第四单元教材复习单' });
  await review.getByLabel('P85知识图数').fill('13');
  for (const [number, tens, ones] of [['17', '1', '7'], ['15', '1', '5'], ['18', '1', '8'], ['20', '2', '0']]) {
    await review.getByLabel(`${number}的十位`).fill(tens);
    await review.getByLabel(`${number}的个位`).fill(ones);
  }
  await review.getByLabel('P86中间站数').fill('6');
  await review.getByLabel('P86水果路径').fill('桃子');
  for (const [equation, answer] of [['7＋□＝10', '3'], ['10＋□＝12', '2'], ['11＋□＝13', '2']]) await review.getByLabel(`P86 ${equation}`).fill(answer);
  const results: Record<string, string> = { '0＋8': '8', '10－2': '8', '3＋5': '8', '12＋1': '13', '13＋0': '13', '11＋2': '13', '14－1': '13', '15－1': '14', '10＋4': '14', '14＋0': '14' };
  await review.locator('input[aria-label^="P87得数 "]').evaluateAll((nodes, values) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    nodes.forEach((node) => {
      const input = node as HTMLInputElement;
      const equation = input.getAttribute('aria-label')?.replace('P87得数 ', '') ?? '';
      setter?.call(input, (values as Record<string, string>)[equation]);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }, results);
  await review.getByLabel('P87单双数').fill('偶数');
  await review.getByLabel('第四单元成长档案').fill('我会先看十位再比较大小。');
  await expect(review).toContainText('P85-P87 的教材任务都完成并保存了');
});

test('P88-P102 保留凑十、交换、应用题、加法表和综合复习', async ({ page }) => {
  await page.goto('/#/math-course/plus-nine');
  await page.getByRole('button', { name: '1', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  await page.locator('.mt-make-ten-task').locator('.mt-chip-row button.next').click();
  await expect(page.locator('.mt-make-ten-task')).toContainText('9＋4＝10＋3＝13');

  await page.goto('/#/math-course/plus-eight-seven-six');
  await page.getByRole('button', { name: '2', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  for (let index = 0; index < 2; index += 1) await page.locator('.mt-make-ten-task').locator('.mt-chip-row button.next').click();
  await expect(page.locator('.mt-make-ten-task')).toContainText('8＋5＝10＋3＝13');

  await page.goto('/#/math-course/plus-eight-nine-strategies');
  await page.getByRole('button', { name: '2 个', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const strategies = page.getByRole('region', { name: '8加9两种凑十方法' });
  await strategies.locator('article').nth(0).getByRole('button').click();
  await strategies.locator('article').nth(1).getByRole('button').click();
  await expect(strategies).toContainText('两种拆分都得到 17');

  await page.goto('/#/math-course/plus-five-four-three-two');
  await page.getByRole('button', { name: '8＋5', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const exchange = page.getByRole('region', { name: '加数交换操作板' });
  for (let index = 0; index < 2; index += 1) await exchange.locator('article').nth(index).getByRole('button', { name: '交换左右两部分' }).click();
  await expect(exchange).toContainText('交换加数，和不变');

  await page.goto('/#/math-course/solve-total');
  await page.getByRole('button', { name: '加法', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const totalProblem = page.locator('.mt-problem-task');
  await totalProblem.getByRole('button', { name: '男生 5 人' }).click();
  await totalProblem.getByRole('button', { name: '女生 10 人' }).click();
  await totalProblem.getByRole('button', { name: '部分 ＋ 部分 ＝ 整体' }).click();
  await totalProblem.getByRole('button', { name: '5 + 10 ＝ 15' }).click();
  await expect(totalProblem.getByRole('button', { name: '5 + 10 ＝ 15' })).toHaveClass(/is-correct/);

  await page.goto('/#/math-course/find-original');
  await page.getByRole('button', { name: '更大', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const originalProblem = page.locator('.mt-problem-task');
  await originalProblem.getByRole('button', { name: '领走 6 个' }).click();
  await originalProblem.getByRole('button', { name: '剩下 5 个' }).click();
  await originalProblem.getByRole('button', { name: '部分 ＋ 部分 ＝ 整体' }).click();
  await originalProblem.getByRole('button', { name: '6 + 5 ＝ 11' }).click();
  await expect(originalProblem.getByRole('button', { name: '6 + 5 ＝ 11' })).toHaveClass(/is-correct/);

  await page.goto('/#/math-course/addition-table');
  await page.getByRole('button', { name: '容易', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const table = page.getByRole('region', { name: '进位加法表' });
  for (const equation of ['5＋7', '4＋8', '3＋9', '6＋7', '5＋8', '4＋9', '6＋8', '5＋9', '6＋9', '7＋9']) await table.getByLabel(`填写 ${equation}`).fill(equation.split('＋')[1]);
  await expect(table).toContainText('10 个空格都补全了');

  await page.goto('/#/math-course/unit5-review');
  await page.getByRole('button', { name: '10', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  for (let index = 0; index < 3; index += 1) await page.locator('.mt-make-ten-task').locator('.mt-chip-row button.next').click();
  const review = page.getByRole('region', { name: '第五单元整理复习工作台' });
  await review.locator('article').nth(0).getByRole('button', { name: '8＋5＝10＋3＝13', exact: true }).click();
  await review.locator('article').nth(1).getByRole('button', { name: '13－8＝5', exact: true }).click();
  await review.locator('article').nth(2).getByRole('button', { name: '6＋5＝11', exact: true }).click();
  await expect(review).toContainText('会凑十、会写相关减法');
});

test('P103-P111 保留知识图、关系链、拼搭、数表、开放问题和成长档案', async ({ page }) => {
  await page.goto('/#/math-course/review-numbers');
  await page.getByRole('button', { name: '数位', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const map = page.getByRole('region', { name: '全册数与运算知识图' });
  for (let index = 0; index < 4; index += 1) await map.locator('article').nth(index).getByRole('button', { name: '连上这条关系' }).click();
  await map.locator('textarea').fill('两组长颈鹿一共有几只？');
  await map.getByRole('button', { name: '2＋4＝6', exact: true }).click();
  await map.getByLabel('长颈鹿问题答案').fill('6');
  await expect(map).toContainText('2＋4＝6 都已整理，并提出、列式和解答了问题');

  await page.goto('/#/math-course/review-relations');
  await page.getByRole('button', { name: '部分合成整体', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const chain = page.getByRole('region', { name: '数量关系算式链' });
  await chain.locator('article').nth(0).getByRole('button', { name: '12－5＝7' }).click();
  await chain.locator('article').nth(1).getByRole('button', { name: '6＋7＝13' }).click();
  await chain.locator('article').nth(2).getByRole('button', { name: '7＋5＝12' }).click();
  await expect(chain).toContainText('剩余、原来与反向检查');

  await page.goto('/#/math-course/review-shapes');
  await page.getByRole('button', { name: '形状和稳定性', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const builder = page.getByRole('region', { name: '二乘二乘二正方体拼搭' });
  for (let index = 0; index < 8; index += 1) await builder.locator('.mt-solid-grid button.target').click();
  await expect(builder).toContainText('2×2×2 大正方体完成');

  await page.goto('/#/math-course/review-application');
  await page.getByRole('button', { name: '看清信息和问题', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const path = page.getByRole('region', { name: '数表路径' });
  for (const value of ['8', '9', '10', '11', '12']) await path.getByRole('button', { name: value, exact: true }).click();
  const tenGrid = page.getByRole('region', { name: '得数十涂色加法表' });
  for (const equation of ['1＋9', '2＋8', '3＋7', '4＋6', '5＋5']) await tenGrid.getByRole('button', { name: new RegExp(equation) }).click();
  const composer = page.getByRole('region', { name: 'P110综合问题工作台' });
  await composer.getByLabel('猴群问题第 1 题').fill('左边和右边一共有几只猴子？');
  await composer.getByLabel('猴群算式第 1 题').fill('8＋8＝16');
  await composer.getByLabel('猴群问题第 2 题').fill('树上和树下各有几只猴子？');
  await composer.getByLabel('猴群算式第 2 题').fill('8＋8＝16');
  await composer.getByRole('button', { name: '第 1 盒：4 枚' }).click();
  await composer.getByRole('button', { name: '第 2 盒：8 枚' }).click();
  await composer.getByLabel('印章选择问题').fill('买第一盒和第二盒一共有多少枚？');
  await composer.getByLabel('印章选择答案').fill('12');
  await composer.getByLabel('9加几小于15').fill('5');
  await composer.getByLabel('18减几大于10').fill('7');
  await composer.getByLabel('13加几小于19').fill('5');
  await composer.getByRole('button', { name: '小明', exact: true }).click();
  await expect(composer).toContainText('猴群两题、印章两盒、不等式和读书思考题都完成了');
  const portfolio = page.getByRole('region', { name: '全册成长档案' });
  await expect(portfolio.locator('article')).toHaveCount(9);
  await portfolio.locator('article').first().getByRole('button', { name: /第 1 朵小红花/ }).click();
  await portfolio.locator('textarea').fill('我要更认真检查题目。');
  await expect(portfolio).toContainText('已涂 1 / 3 朵');
  await page.waitForTimeout(150);
  await page.reload();
  await expect(page.getByRole('region', { name: '全册成长档案' }).locator('textarea')).toHaveValue('我要更认真检查题目。');
});

test('智能闯关使用不重复的迁移能力，而非复问动手原题', async ({ page }) => {
  await page.goto('/#/math-course/add-within-5');
  await page.getByRole('button', { name: '变多', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  for (const button of await page.locator('.mt-join-groups section').nth(0).locator('button').all()) await button.click();
  for (const button of await page.locator('.mt-join-groups section').nth(1).locator('button').all()) await button.click();
  await page.locator('.mt-addition-practice button.next').click();
  await page.getByRole('button', { name: '继续试一试 →' }).click();
  await page.locator('.mt-addition-practice button.next').click();
  await page.locator('.mt-addition-practice button.next').click();
  await page.getByRole('button', { name: '完成加法练习' }).click();
  await page.getByRole('button', { name: '我动手试过了，去说理由 →' }).click();
  await page.getByRole('button', { name: '把两部分合起来求总数', exact: true }).click();
  await page.getByRole('button', { name: '从 4 接着数 5' }).click();
  await page.getByRole('button', { name: '进入小检测 →' }).click();
  await page.getByRole('button', { name: '2+3=5', exact: true }).click();

  // 连对三题后会插入数量关系进阶题，再回到原来的迁移序列。
  const answers = ['1', '5', '3＋1＝4', '7 个', '4－3＝1', '加法'];
  const objectives: string[] = [];
  const prompts: string[] = [];
  for (const answer of answers) {
    objectives.push((await page.locator('.mt-arena-objective').textContent()) ?? '');
    prompts.push((await page.locator('.mt-arena-q b').textContent()) ?? '');
    await page.locator('.mt-arena-opts button').getByText(answer, { exact: true }).click();
    await page.waitForTimeout(900);
  }
  expect(new Set(objectives).size).toBe(6);
  expect(objectives).toContain('本题考查：进阶挑战 · 数量关系');
  expect(prompts).not.toContain('把 3 只和 1 只小动物逐个送进“合起来”的圈。');
  await expect(page.getByText('🎉 闯关成功')).toBeVisible();
});

test('智能闯关的数量变化题让图示、题干和答案表示同一数量关系', async ({ page }) => {
  await page.goto('/#/math-course/playground');
  await page.evaluate(() => {
    const key = `sfz-math-flow-v4:math-textbook-child:${window.location.hash}`;
    localStorage.setItem(key, JSON.stringify({ contentVersion: 4, phase: 4, unlocked: 4, actionDone: true, knowledgeDone: true }));
  });
  await page.reload();

  await expect(page.locator('.mt-arena-q b')).toHaveText('图中原来有 3 个，小卷又放进 1 个，一共有几个？');
  await expect(page.locator('.mt-arena-emo')).toHaveText('🧒🏻🧒🏻🧒🏻 ＋ 🧒🏻');
  await expect(page.locator('.mt-arena-opts')).toContainText('4');
});

test('课堂游戏的任务一可点击并完成听指令辨左右', async ({ page }) => {
  await page.goto('/#/math-course/classroom-games');
  await page.getByRole('button', { name: '可以，关键是左耳', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();

  const directionTask = page.getByRole('region', { name: '教材任务一：听指令辨左右' });
  const leftEar = directionTask.getByRole('button', { name: '摸左耳', exact: true });
  const rightEar = directionTask.getByRole('button', { name: '摸右耳', exact: true });
  await expect(leftEar).toBeEnabled();
  await rightEar.click();
  await expect(rightEar).toHaveClass(/is-wrong/);
  await leftEar.click();
  await page.waitForTimeout(950);
  await expect(leftEar).toHaveClass(/is-correct/);
  await expect(directionTask.getByText('答对了。还可以继续点其他选项，重新核对自己的判断。')).toBeVisible();
  await expect(rightEar).toBeEnabled();
  await expect(page.locator('.mt-operation-coach')).toContainText('教材任务二：合并三角形数量');

  const routeTask = page.locator('.mt-classroom-route');
  await routeTask.getByRole('button', { name: '摸左耳', exact: true }).click();
  await routeTask.getByRole('button', { name: '第 3 个', exact: true }).click();
  await routeTask.getByRole('button', { name: '3＋1＝4', exact: true }).click();
  await expect(routeTask).toContainText('听到“摸左耳”，把动作牌放到正确位置。');
  await expect(routeTask).toContainText('从左边开始，点亮第 3 个同学的位置。');
  await expect(routeTask).toContainText('把 3 个黄三角和 1 个红三角放入同一托盘。');
  await expect(routeTask).toContainText('我的答案：3＋1＝4');
});

test('学习准备的先猜图用八点三十分的上课情境支撑时间问题', async ({ page }) => {
  await page.goto('/#/math-course/learning-readiness');
  await expect(page.getByRole('heading', { name: '每天 8:30 开始上课，8:30 表示什么？' })).toBeVisible();
  const readinessGuess = page.locator('.mt-guess-learning-readiness');
  await expect(readinessGuess).toBeVisible();
  await expect(readinessGuess).toContainText('8:30');
  await expect(readinessGuess).toContainText('上午课程表 · 第 1 节');
  await expect(readinessGuess).toContainText('想一想：这里的 8:30 表示什么？');
  await expect(page.locator('.mt-guess-order')).toHaveCount(0);

  await page.getByRole('button', { name: '时间', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  const readinessTask = page.getByRole('region', { name: '教材任务一：辨认 8:30 的上课时间' });
  await expect(readinessTask).toContainText('观察钟面和课程表，选出“8:30”表示的上课信息。');
  await expect(readinessTask).toContainText('🕣　8:30 · 上午第 1 节');
  const timeOption = readinessTask.getByRole('button', { name: '8:30 表示上课开始的时间', exact: true });
  await timeOption.click();
  await expect(timeOption).toHaveClass(/is-correct/);
  await expect(page.locator('.mt-operation-coach')).toContainText('教材任务一完成。');
});

test('6到9的认识提供笔顺演示和田字格跟写', async ({ page }) => {
  await page.goto('/#/math-course/six-to-nine');
  await page.getByRole('button', { name: '6', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();

  const writing = page.getByRole('region', { name: '6到9笔顺和跟写练习' });
  await expect(writing).toContainText('选一个数字，先看笔顺，再在田字格里跟着写');
  await expect(writing.getByLabel('数字 6 的笔顺动画')).toBeVisible();
  const guidePaths = await writing.locator('[aria-label="数字 6 的笔顺动画"] .mt-digit-guide path').evaluateAll((paths) => paths.map((path) => path.getAttribute('d')));
  const animatedPaths = await writing.locator('[aria-label="数字 6 的笔顺动画"] .mt-digit-animation path').evaluateAll((paths) => paths.map((path) => path.getAttribute('d')));
  expect(animatedPaths).toEqual(guidePaths);
  await expect(writing.getByRole('button', { name: '🧽 清除重写' })).toBeVisible();

  await writing.getByRole('button', { name: '数字 9', exact: true }).click();
  await expect(writing.getByLabel('数字 9 的笔顺动画')).toBeVisible();
  await expect(writing).toContainText('现在写第 1 笔');
});

test('第几从右数时定位右起第二位，而不是左起第二位', async ({ page }) => {
  await page.goto('/#/math-course/ordinal');
  await page.getByRole('button', { name: '第 2', exact: true }).click();
  await page.getByRole('button', { name: '带着猜想去验证 →' }).click();
  await page.getByRole('button', { name: '← 从右数' }).click();

  const queue = page.locator('.mt-queue');
  await expect(page.locator('.mt-platform')).toHaveClass(/from-right/);
  await expect(queue.getByRole('button', { name: '从右数的第 2 个人' })).toHaveCount(1);
  await queue.locator('button').nth(1).click();
  await expect(queue.locator('button').nth(1)).toHaveClass(/wrong/);
  await queue.locator('button').nth(3).click();
  await expect(queue.locator('button').nth(3)).toHaveClass(/correct/);
  await expect(page.getByText('找对了！这是从这个方向数的第 2 个人。')).toBeVisible();
});
