import { test, expect, type Locator, type Page } from '@playwright/test';

test.use({ viewport: { width: 1024, height: 768 }, launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } });
const child = 'math-tools-child';
test.beforeEach(async ({ page }) => {
  await page.route('**/config/store', route => route.abort());
  await page.addInitScript(id => {
    if (sessionStorage.getItem('tools-seeded')) return;
    localStorage.setItem('smart-fun-zone', JSON.stringify({ state: { lang: 'zh', theme: 'light', sound: false, voiceOn: false, musicOn: false, profiles: [{ id, name: '教具体验生', avatarId: 'boy', age: 6, createdAt: Date.now() }], activeChildId: id, records: [], mastery: {}, lessonProgress: {}, wrongs: {}, points: {}, pointLog: {}, charBag: {}, customTasks: {}, ownedItems: {}, equipped: {}, parentPin: '1234', dailyLimitMin: 0, buddyOpen: false, buddyWakeOn: false }, version: 0 }));
    sessionStorage.setItem('tools-seeded', '1');
  }, child);
});
const tool = (page: Page, name: string) => page.getByRole('tab', { name });
async function placeAll(board: Locator, total: number, left: number, token = '玉米') {
  for (let index = 0; index < total; index++) {
    await board.getByRole('button', { name: `第 ${index + 1} 个${token}`, exact: true }).click();
    await board.getByRole('button', { name: index < left ? '左边篮子' : '右边篮子', exact: true }).click();
  }
}
async function openCourse(page: Page, lessonId: string, snapshot: Record<string, unknown> = {}) {
  await page.goto('/#/math-tools');
  await page.evaluate(({ child, lessonId, snapshot }) => {
    localStorage.setItem(`sfz-math-flow-v4:${child}:#/math-course/${lessonId}`, JSON.stringify({ contentVersion: 4, phase: 1, unlocked: 1, actionDone: false, knowledgeDone: false }));
    localStorage.setItem(`sfz-math-task-v1:${child}:${lessonId}`, JSON.stringify({ 'teaching-support-path-v1': 'standard', 'teaching-exploration-v1': { done: true }, ...snapshot }));
  }, { child, lessonId, snapshot });
  await page.goto(`/#/math-course/${lessonId}`);
  await expect(page.getByRole('navigation', { name: '本课学习步骤' }).getByRole('button', { name: /动手试/ })).toHaveClass(/active/);
}

test('目录可进入教具箱，任意顺序配对、剩余观察和重做可用', async ({ page }) => {
  await page.goto('/#/subject/math');
  await page.getByRole('button', { name: /数学教具箱/ }).click();
  await expect(page.getByRole('heading', { name: '数学教具箱', exact: true })).toBeVisible();
  const board = page.getByLabel('一一配对教具');
  const leftOrder = [3, 1, 4, 2], rightOrder = [6, 2, 4, 1];
  for (let i = 0; i < 4; i++) {
    await board.getByRole('button', { name: `第 ${leftOrder[i]} 个圆片`, exact: true }).click();
    await expect(board.locator('.selected')).toHaveCount(1);
    await board.getByRole('button', { name: `第 ${rightOrder[i]} 个方块`, exact: true }).click();
  }
  await expect(board).toContainText('4 < 6');
  await expect(board).toContainText('方块还有 2 个没配上');
  await expect(board.locator('.tool-pair-lines path')).toHaveCount(4);
  await board.getByRole('button', { name: '第 3 个圆片，已配对', exact: true }).click();
  await expect(board.locator('.tool-pair-lines path')).toHaveCount(4);
  await board.getByRole('button', { name: '再配一次' }).click();
  await expect(board.locator('.tool-pair-lines path')).toHaveCount(0);
  await page.getByRole('button', { name: '左边圆片增加一个' }).click();
  await expect(board).toContainText('圆片 · 5');
});

test('分组支持真实拖拽、跨篮移动、撤销和多组，总量保持不变', async ({ page }) => {
  await page.goto('/#/math-tools?tool=partition&total=8');
  const board = page.getByLabel('分与合教具');
  await board.getByRole('button', { name: '第 1 个圆片', exact: true }).click({ trial: true });
  const first = await board.getByRole('button', { name: '第 1 个圆片', exact: true }).boundingBox();
  const basket = await board.getByRole('button', { name: '第 1 个篮子', exact: true }).boundingBox();
  expect(first).not.toBeNull(); expect(basket).not.toBeNull();
  await page.mouse.move(first!.x + first!.width / 2, first!.y + first!.height / 2);
  await page.mouse.down();
  await page.mouse.move(basket!.x + basket!.width / 2, basket!.y + basket!.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(board.locator('[data-tool-group="0"] .tool-token')).toHaveCount(1);
  await board.getByRole('button', { name: '第 1 个圆片', exact: true }).click();
  await board.locator('[data-tool-group="1"]').click();
  await expect(board.locator('[data-tool-group="1"] .tool-token')).toHaveCount(1);
  await board.getByRole('button', { name: '撤销一步' }).click();
  await expect(board.locator('[data-tool-group="0"] .tool-token')).toHaveCount(1);
  await page.getByRole('button', { name: '几个篮子增加一个' }).click();
  await expect(board.locator('.tool-group')).toHaveCount(3);
  await expect(board.locator('.tool-token')).toHaveCount(8);
  const courseKeys = await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('sfz-math-task') || key.startsWith('sfz-math-flow')));
  expect(courseKeys).toEqual([]);
});

test('十格框转移与拿回联动，切换教具保留当前摆法', async ({ page }) => {
  await page.goto('/#/math-tools?tool=ten&first=8&second=5');
  const board = page.getByLabel('十格框教具');
  for (const index of [5, 2]) await board.getByRole('button', { name: `转移第 ${index} 个圆片`, exact: true }).click();
  await expect(board).toContainText('8＋5＝10＋3＝13');
  await expect(board.locator('.tool-ten-grid > .filled')).toHaveCount(10);
  await tool(page, '分一分 整体和部分').click();
  await tool(page, '凑成十 十格框').click();
  await expect(board.locator('.tool-ten-grid > .filled')).toHaveCount(10);
  await board.getByRole('button', { name: '拿回第 5 个圆片', exact: true }).click();
  await expect(board.locator('.tool-ten-grid > .filled')).toHaveCount(9);
  await board.getByRole('button', { name: '再摆一次' }).click();
  await expect(board.locator('.tool-ten-grid > .filled')).toHaveCount(8);
});

test('进位、退位、跨百兑换以及重做均需实际操作', async ({ page }) => {
  await page.goto('/#/math-tools?tool=value');
  const board = page.getByLabel('数位小棒教具');
  await board.getByRole('button', { name: '加入 8 根', exact: true }).click();
  await expect(board).toContainText('2 个十＋15 个一＝35');
  await expect(board.locator('.tool-success')).toHaveCount(0);
  await board.getByRole('button', { name: '捆成 1 个十', exact: true }).click();
  await expect(board.locator('.tool-success')).toHaveText('✓ 27＋8＝35');
  await board.getByRole('button', { name: '撤销一步' }).click();
  await expect(board.locator('.tool-success')).toHaveCount(0);
  await board.getByRole('button', { name: '捆成 1 个十', exact: true }).click();
  await page.getByRole('button', { name: '再做一次', exact: true }).click();
  await expect(board).toContainText('2 个十＋7 个一＝27');
  await expect(board.getByRole('button', { name: '加入 8 根', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '32－7', exact: true }).click();
  await board.getByRole('button', { name: '拆开 1 个十', exact: true }).click();
  await expect(board).toContainText('2 个十＋12 个一＝32');
  for (let i = 0; i < 7; i++) await board.getByRole('button', { name: '拿走 1 根', exact: true }).click();
  await expect(board.locator('.tool-success')).toHaveText('✓ 32－7＝25');
  await expect(board.getByRole('button', { name: '拿走 1 根', exact: true })).toBeDisabled();
  await page.getByLabel('第一个数', { exact: true }).fill('99');
  await page.getByLabel('第二个数', { exact: true }).fill('99');
  await page.getByRole('button', { name: '加法', exact: true }).click();
  await page.getByRole('button', { name: '开始摆', exact: true }).click();
  await board.getByRole('button', { name: '加入 99 根', exact: true }).click();
  await board.getByRole('button', { name: '捆成 1 个十', exact: true }).click();
  await board.getByRole('button', { name: '合成 1 个百', exact: true }).click();
  await expect(board.locator('.tool-success')).toHaveText('✓ 99＋99＝198');
});

test('教材比大小任意顺序配对，进入教具箱带材料并保留课程断点', async ({ page }) => {
  await openCourse(page, 'compare');
  const board = page.locator('.pairing-tool:visible').first();
  await expect(board.locator('.tool-relation')).toHaveCount(0);
  for (const [left, right] of [[3, 1], [1, 3], [2, 2]]) {
    await board.getByRole('button', { name: `第 ${left} 只小猴`, exact: true }).click();
    await board.getByRole('button', { name: `第 ${right} 个桃子`, exact: true }).click();
  }
  await expect(page.getByRole('tab', { name: /教材任务 2/ })).toHaveAttribute('aria-selected', 'true');
  const saved = await page.evaluate(child => localStorage.getItem(`sfz-math-task-v1:${child}:compare`), child);
  await page.getByRole('button', { name: '▦ 教具箱', exact: true }).click();
  await expect(page).toHaveURL(/tool=pair.*left=3.*right=3.*from=compare/);
  await page.getByRole('button', { name: '左边圆片增加一个' }).click();
  expect(await page.evaluate(child => localStorage.getItem(`sfz-math-task-v1:${child}:compare`), child)).toBe(saved);
  await page.getByRole('button', { name: '回到教材任务', exact: true }).click();
  await expect(page.getByRole('tab', { name: /教材任务 2/ })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: /教材任务 1/ }).click();
  await expect(board.locator('.tool-token.paired')).toHaveCount(6);
});

test('教材分与合回看不算发现，真实操作记录所有分法后自动进入说理由', async ({ page }) => {
  await openCourse(page, 'compose');
  const primary = page.locator('.math-compose-task:visible');
  await primary.getByRole('button', { name: '1 和 4', exact: true }).click();
  await expect(primary).toContainText('已发现 0/4');
  await placeAll(primary, 5, 2);
  const record = page.getByRole('region', { name: '5的分与合记录板', exact: true });
  await expect(record).toBeVisible();
  await expect(record.getByRole('button', { name: '记下这种分法' })).toBeDisabled();
  for (const left of [0, 1, 2]) {
    await placeAll(record, 5, left);
    await record.getByRole('button', { name: '记下这种分法' }).click();
  }
  await expect(page.getByRole('navigation', { name: '本课学习步骤' }).getByRole('button', { name: /说理由/ })).toHaveClass(/active/);
  await page.reload();
  await expect(page.getByRole('navigation', { name: '本课学习步骤' }).getByRole('button', { name: /说理由/ })).toHaveClass(/active/);
});

test('另一节教材使用同一分合板，旧完成记录保留，重做另开一轮', async ({ page }) => {
  await openCourse(page, 'compose-six-nine', { 'completed-action-tasks-v1': [0], 'selected-activity:1': 1, 'split-compose-eight': ['0 和 8', '1 和 7', '2 和 6', '3 和 5', '4 和 4'] });
  await page.getByRole('tab', { name: /教材任务 2/ }).click();
  const record = page.getByRole('region', { name: '八的分与合记录板', exact: true });
  await expect(record).toBeVisible();
  await record.getByRole('button', { name: '再做一次', exact: true }).click();
  await expect(record).toContainText('这次摆出 0 和 8');
  await placeAll(record, 8, 0, '圆片');
  await record.getByRole('button', { name: '记下这种分法' }).click();
  await expect(record).toContainText('这次摆出 1 和 7');
  expect(await page.evaluate(child => JSON.parse(localStorage.getItem(`sfz-math-task-v1:${child}:compose-six-nine`)!)['split-compose-eight'], child)).toHaveLength(5);
});

test('凑十教材保留计划、实际转移和完整答案，两条策略都能完成', async ({ page }) => {
  await openCourse(page, 'plus-nine', { 'completed-action-tasks-v1': [0] });
  const work = page.getByRole('region', { name: '凑十自主拆分', exact: true });
  await expect(work).toBeVisible();
  await work.getByLabel('计划移入的数量', { exact: true }).fill('1');
  await work.getByRole('button', { name: '转移第 4 个圆片', exact: true }).click();
  await expect(work.locator('.tool-ten-grid > .filled')).toHaveCount(10);
  await expect(work.locator('.tool-relation')).toHaveText('4 分成 1 和 3；9＋4＝10＋3');
  await work.getByLabel('凑十完整结果', { exact: true }).fill('14');
  await work.getByRole('button', { name: '检查拆分、剩余与结果', exact: true }).click();
  await expect(work).toHaveAttribute('data-complete', 'false');
  await work.getByLabel('凑十完整结果', { exact: true }).fill('13');
  await work.getByRole('button', { name: '检查拆分、剩余与结果', exact: true }).click();
  await expect(work).toHaveAttribute('data-complete', 'true');
  await openCourse(page, 'plus-eight-nine-strategies', { 'completed-action-tasks-v1': [0] });
  const strategies = page.getByRole('region', { name: '8加9两种凑十方法', exact: true });
  for (const [target, count] of [[8, 2], [9, 1]]) {
    await strategies.getByRole('button', { name: `给 ${target} 凑十`, exact: true }).click();
    for (let i = 1; i <= count; i++) await strategies.getByRole('button', { name: `路线圆片 ${i}`, exact: true }).click();
    await strategies.getByLabel('本路线完整结果', { exact: true }).fill('17');
    await strategies.getByRole('button', { name: '验证这条路线', exact: true }).click();
  }
  await expect(strategies).toHaveAttribute('data-complete', 'true');
});

test('旧玉米位置恢复为通用分合材料，未分完时不会误完成', async ({ page }) => {
  await openCourse(page, 'compose', {
    'compose-drag': { corns: Array.from({ length: 5 }, (_, id) => ({ id, where: id === 0 ? 'A' : id === 1 ? 'B' : 'pool' })), history: [0, 1], selectedCorn: null },
    'compose-primary': { left: 2, seen: [], draggedSplit: false, dragProgress: { placed: 2, left: 1, right: 1 } },
  });
  const primary = page.locator('.math-compose-task:visible');
  await expect(primary.locator('[data-tool-group="0"] .tool-token')).toHaveCount(1);
  await expect(primary.locator('[data-tool-group="1"] .tool-token')).toHaveCount(1);
  await expect(primary.locator('[data-tool-group="-1"] .tool-token')).toHaveCount(3);
  await expect(page.getByRole('tab', { name: /教材任务 1/ })).not.toHaveClass(/done/);
  for (let i = 3; i <= 5; i++) {
    await primary.getByRole('button', { name: `第 ${i} 个玉米`, exact: true }).click();
    await primary.getByRole('button', { name: '右边篮子', exact: true }).click();
  }
  await expect(page.getByRole('tab', { name: /教材任务 2/ })).toHaveAttribute('aria-selected', 'true');
});

test('数线走数顺序、选中高亮、相邻数、等距跳跃及撤销重做', async ({ page }) => {
  await page.goto('/#/math-tools?tool=line&min=10&max=20');
  const board = page.getByLabel('数线车厢教具');
  await board.getByRole('button', { name: '12号车厢', exact: true }).click();
  await expect(board.getByRole('button', { name: '12号车厢' })).toHaveClass(/current/);
  await expect(board).toContainText('到 10 要走 2 步；到 20 要走 8 步');
  await page.getByRole('button', { name: '按顺序走', exact: true }).click();
  await expect(page.getByRole('tabpanel', { name: '走数线 数序与距离' })).toHaveAttribute('data-tool-instruction', /请从 10 开始，每次加 1/);
  await board.getByRole('button', { name: '12号车厢', exact: true }).click();
  await expect(board).toContainText('先点 10');
  for (let number = 10; number <= 20; number++) await board.getByRole('button', { name: `${number}号车厢`, exact: true }).click();
  await expect(board.locator('.visited')).toHaveCount(11);
  await expect(board).toContainText('顺序点好了');
  await board.getByRole('button', { name: '再走一次', exact: true }).click();
  await expect(board.locator('.visited')).toHaveCount(0);
  await page.getByRole('button', { name: '相邻数和距离', exact: true }).click();
  await page.getByLabel('数线间隔').selectOption('2');
  await board.getByRole('button', { name: '12号车厢', exact: true }).click();
  await expect(board).toContainText('前一个刻度：10');
  await page.getByRole('button', { name: '跳着做加减', exact: true }).click();
  await board.getByRole('button', { name: '往右走 2 →', exact: true }).click();
  await expect(board).toContainText('足迹：12 → 14');
  await board.getByRole('button', { name: '撤销一步', exact: true }).click();
  await expect(board).toContainText('当前：12');
  await board.getByRole('button', { name: '← 往左走 2', exact: true }).click();
  await expect(board.getByRole('button', { name: '← 往左走 2', exact: true })).toBeDisabled();
});

test('平均分和按每组数量分正确保留余数，不平均时不宣布完成', async ({ page }) => {
  await page.goto('/#/math-tools?tool=group&total=7');
  const board = page.getByLabel('等分排列教具');
  for (let i = 0; i < 6; i++) {
    await board.getByRole('button', { name: `第 ${i + 1} 个圆片`, exact: true }).click();
    await board.getByRole('button', { name: `第 ${i % 3 + 1} 组`, exact: true }).click();
  }
  await expect(board.locator('.tool-success')).toContainText('7＝3×2＋1');
  await board.getByRole('button', { name: '第 7 个圆片', exact: true }).click();
  await board.getByRole('button', { name: '第 1 组', exact: true }).click();
  await expect(board.locator('.tool-success')).toHaveCount(0);
  await board.getByRole('button', { name: '撤销一步', exact: true }).click();
  await expect(board.locator('.tool-success')).toHaveCount(1);
  await page.getByRole('button', { name: '每组几个', exact: true }).click();
  for (let i = 0; i < 6; i++) {
    await board.getByRole('button', { name: `第 ${i + 1} 个圆片`, exact: true }).click();
    await board.getByRole('button', { name: `第 ${Math.floor(i / 3) + 1} 组`, exact: true }).click();
  }
  await expect(board.locator('.tool-success')).toContainText('7＝2×3＋1');
  await expect(board.locator('[data-tool-group="-1"] .tool-token')).toHaveCount(1);
});

test('行列排列由实际摆放形成，改变行数重置材料', async ({ page }) => {
  await page.goto('/#/math-tools?tool=group&total=12');
  await page.getByRole('button', { name: '排成行列', exact: true }).click();
  const board = page.getByLabel('等分排列教具');
  for (let i = 0; i < 12; i++) {
    await board.getByRole('button', { name: `第 ${i + 1} 个圆片`, exact: true }).click();
    await board.getByRole('button', { name: `第 ${Math.floor(i / 4) + 1} 行`, exact: true }).click();
  }
  await expect(board.getByLabel('行列点阵').locator('.filled')).toHaveCount(12);
  await expect(board.locator('.tool-success')).toContainText('12＝3×4');
  await page.getByRole('button', { name: '排成几行增加一个', exact: true }).click();
  await expect(board.getByLabel('行列点阵').locator('.filled')).toHaveCount(0);
  await expect(board.locator('.tool-group')).toHaveCount(4);
});

test('隐藏部分自动核对不泄漏，求原来必须放回物体，切换工具保留操作', async ({ page }) => {
  await page.goto('/#/math-tools?tool=partition&mode=hidden&total=8&known=3');
  const hidden = page.getByLabel('隐藏部分教具');
  await expect(hidden.locator('.tool-cover-box .tool-token')).toHaveCount(0);
  await hidden.getByLabel('隐藏部分的数量').fill('4');
  await expect(hidden).toContainText('再看看整体');
  await hidden.getByLabel('隐藏部分的数量').fill('5');
  await expect(hidden.locator('.tool-cover-box .tool-token')).toHaveCount(5);
  await tool(page, '走数线 数序与距离').click();
  await tool(page, '分一分 整体和部分').click();
  await expect(hidden.getByLabel('隐藏部分的数量')).toHaveValue('5');
  await page.goto('/#/math-tools?tool=partition&mode=original&total=5&known=6');
  const original = page.getByLabel('求原来教具');
  await expect(original.getByLabel('原来的数量')).toBeDisabled();
  for (let i = 1; i <= 6; i++) await original.getByRole('button', { name: `放回第 ${i} 个圆片`, exact: true }).click();
  await original.getByLabel('原来的数量').fill('11');
  await expect(original).toContainText('5＋6＝11');
  await original.getByRole('button', { name: '撤销一步', exact: true }).click();
  await expect(original.getByLabel('原来的数量')).toBeDisabled();
  await original.getByRole('button', { name: '再做一次', exact: true }).click();
  await expect(original.getByRole('button', { name: /^放回第/ })).toHaveCount(6);
  await page.getByRole('button', { name: '藏了几个', exact: true }).click();
  await hidden.getByLabel('隐藏部分的数量').fill('0');
  await expect(hidden).toContainText('5－5＝0');
});

test('连续变化逐个操作、保留中间量、撤销完成与混合变化均可重做', async ({ page }) => {
  await page.goto('/#/math-tools?tool=partition&mode=changes');
  const board = page.getByLabel('连续变化教具');
  await board.getByRole('button', { name: '加入第 1 个圆片', exact: true }).click();
  await expect(board).toContainText('现在有 6 个');
  await expect(board.locator('.tool-change-timeline li').nth(1)).toContainText('？');
  await board.getByRole('button', { name: '加入第 1 个圆片', exact: true }).click();
  await expect(board.locator('.tool-change-timeline li').nth(1)).toContainText('7');
  await board.getByRole('button', { name: '加入第 1 个圆片', exact: true }).click();
  await expect(board).toContainText('5＋2＋1＝8');
  await board.getByRole('button', { name: '撤销一步', exact: true }).click();
  await expect(board.locator('.tool-success')).toHaveCount(0);
  await page.getByRole('button', { name: '第 2 次改为拿走', exact: true }).click();
  for (let i = 0; i < 2; i++) await board.getByRole('button', { name: '加入第 1 个圆片', exact: true }).click();
  await board.getByRole('button', { name: '拿走第 3 个圆片', exact: true }).click();
  await expect(board).toContainText('5＋2－1＝6');
  await board.getByRole('button', { name: '再做一次', exact: true }).click();
  await expect(board).toContainText('现在有 5 个');
});

test('教材车厢依次完成后进入下一子任务，历史进度可重做', async ({ page }) => {
  await openCourse(page, 'order-twenty', { 'completed-action-tasks-v1': [0] });
  const work = page.getByRole('region', { name: '10到20的火车车厢', exact: true });
  await expect(work).toBeVisible();
  for (let number = 10; number <= 20; number++) await work.getByRole('button', { name: `${number}号车厢`, exact: true }).click();
  for (const [number, answer] of [[12, 10], [18, 20]]) {
    const card = work.getByRole('article', { name: `${number}号离哪端近`, exact: true });
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: `${answer}号车厢`, exact: true }).click();
  }
  await expect(work).toHaveAttribute('data-complete', 'true');
  await expect(page.getByRole('navigation', { name: '选择完整教材任务卡' }).getByRole('button', { name: /14 的前一个和后一个数是/ })).toHaveAttribute('aria-pressed', 'true');
  const data = await page.evaluate(child => JSON.parse(localStorage.getItem(`sfz-math-task-v1:${child}:order-twenty`)!), child);
  expect(data['twenty-number-rail']).toBe(11);
  await page.getByRole('navigation', { name: '选择完整教材任务卡' }).getByRole('button', { name: /10到20的火车车厢/ }).click();
  await work.getByRole('button', { name: '再做一次', exact: true }).click();
  await expect(work.locator('.tool-line-track .visited')).toHaveCount(0);
  await work.getByRole('button', { name: '10号车厢', exact: true }).click();
  await expect(work.locator('.tool-line-track .visited')).toHaveCount(1);
  expect(await page.evaluate(child => JSON.parse(localStorage.getItem(`sfz-math-task-v1:${child}:order-twenty`)!)['twenty-number-rail'], child)).toBe(11);
});

test('教材连加材料断点恢复，逐个完成后进入连减，旧完成记录重做保留', async ({ page }) => {
  await openCourse(page, 'continuous-add-sub', { 'completed-action-tasks-v1': [0] });
  const add = page.getByRole('region', { name: '连加连续变化板', exact: true });
  await expect(add).toBeVisible();
  await add.getByRole('button', { name: '加入第 1 个圆片', exact: true }).click();
  await page.reload();
  await expect(add).toContainText('现在有 6 个');
  for (let i = 0; i < 2; i++) await add.getByRole('button', { name: '加入第 1 个圆片', exact: true }).click();
  await expect(add).toHaveAttribute('data-complete', 'true');
  const sub = page.getByRole('region', { name: '连减连续变化板', exact: true });
  await expect(sub).toBeVisible();
  for (let i = 0; i < 5; i++) await sub.getByRole('button', { name: '拿走第 1 个圆片', exact: true }).click();
  await expect(sub).toHaveAttribute('data-complete', 'true');
  await openCourse(page, 'continuous-add-sub', { 'completed-action-tasks-v1': [0], 'continuous-change-board': 2, 'continuous-subtraction-board': 2 });
  await page.getByRole('tab', { name: /教材任务 2/ }).click();
  await add.getByRole('button', { name: '再做一次', exact: true }).click();
  await expect(add).toContainText('现在有 5 个');
  expect(await page.evaluate(child => JSON.parse(localStorage.getItem(`sfz-math-task-v1:${child}:continuous-add-sub`)!)['continuous-change-board'], child)).toBe(2);
});

test('教材求原来实际放回后自动判断，恢复材料和完成后重做保留历史', async ({ page }) => {
  await openCourse(page, 'find-original', { 'completed-action-tasks-v1': [0] });
  const work = page.locator('.mt-problem-task:visible');
  await work.getByRole('button', { name: '领走 6 个', exact: true }).click();
  await work.getByRole('button', { name: '剩下 5 个', exact: true }).click();
  await work.getByRole('button', { name: '部分 ＋ 部分 ＝ 整体', exact: true }).click();
  await work.getByRole('button', { name: '放回第 1 个圆片', exact: true }).click();
  await page.reload();
  await expect(work.getByRole('button', { name: /^放回第/ })).toHaveCount(5);
  for (let i = 2; i <= 6; i++) await work.getByRole('button', { name: `放回第 ${i} 个圆片`, exact: true }).click();
  await work.getByLabel('原来的数量').fill('11');
  await expect(work).toHaveAttribute('data-complete', 'true');
  await work.getByRole('button', { name: '再做一次', exact: true }).first().click();
  await expect(work).toHaveAttribute('data-complete', 'true');
  await expect(work.getByLabel('原来的数量')).toBeDisabled();
  expect(await page.evaluate(child => JSON.parse(localStorage.getItem(`sfz-math-task-v1:${child}:find-original`)!)['problem-solving'].answer, child)).toBe(11);
});

test('两端之间排除端点，相邻两点之间没有位置，多次变化最多四步', async ({ page }) => {
  await page.goto('/#/math-tools?tool=line&mode=between&min=10&max=15');
  const line = page.getByLabel('数线车厢教具');
  await line.getByRole('button', { name: '10号车厢', exact: true }).click();
  await line.getByRole('button', { name: '15号车厢', exact: true }).click();
  await expect(line).toContainText('之间有 4 个车厢：11、12、13、14');
  await expect(line.locator('.inside')).toHaveCount(4);
  await line.getByRole('button', { name: '13号车厢', exact: true }).click();
  await line.getByRole('button', { name: '14号车厢', exact: true }).click();
  await expect(line).toContainText('之间有 0 个车厢');
  await page.goto('/#/math-tools?tool=partition&mode=changes');
  await page.getByRole('button', { name: '新增一次变化', exact: true }).click();
  await page.getByRole('button', { name: '新增一次变化', exact: true }).click();
  await expect(page.getByRole('button', { name: '新增一次变化', exact: true })).toBeDisabled();
  const board = page.getByLabel('连续变化教具');
  for (let i = 0; i < 5; i++) await board.getByRole('button', { name: '加入第 1 个圆片', exact: true }).click();
  await expect(board).toContainText('5＋2＋1＋1＋1＝10');
  await expect(board).toContainText('5 → 7 → 8 → 9 → 10');
});

test('教材未知部分自动判断后自动进入变式任务，不需要手动AI确认', async ({ page }) => {
  await openCourse(page, 'solve-remain-within-7', { 'completed-action-tasks-v1': [0] });
  const work = page.locator('.mt-problem-task:visible');
  await work.getByRole('button', { name: '一共 7 只', exact: true }).click();
  await work.getByRole('button', { name: '跳走 2 只', exact: true }).click();
  await work.getByRole('button', { name: '整体 − 部分 ＝ 剩余', exact: true }).click();
  await work.getByLabel('隐藏部分的数量').fill('4');
  await expect(work).toHaveAttribute('data-complete', 'false');
  await work.getByLabel('隐藏部分的数量').fill('5');
  await expect(work).toHaveAttribute('data-complete', 'true');
  await expect(page.getByRole('heading', { name: /树上原有 6 只鸟，飞走 2 只/ })).toBeVisible();
});

test('教材加减混合共用连续变化规则，先加后减和先减后加均按顺序完成', async ({ page }) => {
  await openCourse(page, 'mixed-add-sub', { 'completed-action-tasks-v1': [0] });
  const forward = page.getByRole('region', { name: '加减混合变化板', exact: true });
  for (let i = 0; i < 3; i++) await forward.getByRole('button', { name: '加入第 1 个圆片', exact: true }).click();
  await expect(forward).toContainText('现在有 7 个');
  for (let i = 0; i < 2; i++) await forward.getByRole('button', { name: '拿走第 1 个圆片', exact: true }).click();
  await expect(forward).toContainText('4＋3－2＝5');
  const reverse = page.getByRole('region', { name: '先减后加变化板', exact: true });
  await expect(reverse).toBeVisible();
  for (let i = 0; i < 2; i++) await reverse.getByRole('button', { name: '拿走第 1 个圆片', exact: true }).click();
  await expect(reverse).toContainText('现在有 5 个');
  for (let i = 0; i < 3; i++) await reverse.getByRole('button', { name: '加入第 1 个圆片', exact: true }).click();
  await expect(reverse).toContainText('7－2＋3＝8');
  await expect(reverse).toHaveAttribute('data-complete', 'true');
});
