import { dragChineseWord, moveChineseWord } from './chinese-order-helpers';
import { expect, test, type Page, type Locator } from '@playwright/test';
import { CHINESE_TEXTBOOK_LESSONS, CHINESE_BOOK_UNITS } from '../src/content/chineseTextbookCurriculum';
import { CHINESE_PINYIN_STUDY } from '../src/content/chinesePinyinStudy';
import { getChineseTextbookStudy } from '../src/content/chineseTextbookStudy';
import { CHINESE_PINYIN_GARDENS } from '../src/content/chinesePinyinGardenStudy';
import { CHINESE_KNOWLEDGE_EXTENSION } from '../src/content/chineseKnowledgeExtension';
import { getChineseTeaching } from '../src/content/chineseTeaching';
const child='chinese-classroom-child';
test.beforeEach(async ({page}) => {
 await page.addInitScript(child => { if(sessionStorage.getItem('chinese-classroom-seeded')) return; sessionStorage.setItem('chinese-classroom-seeded','1'); localStorage.setItem('smart-fun-zone',JSON.stringify({version:6,state:{lang:'zh',theme:'light',sound:false,voiceOn:false,musicOn:false,profiles:[{id:child,name:'语文体验生',ageBand:'g1',avatar:'🐼',createdAt:Date.now()}],activeChildId:child,records:[],mastery:{},lessonProgress:{},charBag:{},wrongs:{},points:{},pointLog:{},parentPin:'1234',dailyLimitMin:0,buddyOpen:false,buddyWakeOn:false}})); },child);
});
async function open(page:Page,id:string,phase=0,fields:Record<string,unknown>={},unlocked=phase) {
 await page.addInitScript(({child,id,phase,fields,unlocked}) => { const seedKey = `chinese-classroom-open:${id}`; if (sessionStorage.getItem(seedKey)) return; sessionStorage.setItem(seedKey, '1'); localStorage.setItem(`sfz-chinese-flow-v1:${child}:${id}`,JSON.stringify({phase,unlocked})); for(const [field,value] of Object.entries(fields)) localStorage.setItem(`sfz-chinese-practice-v1:${child}:${id}:${field}`,JSON.stringify(value)); },{child,id,phase,fields,unlocked});
 await page.goto(`/#/chinese-course/${id}`);await expect(page.locator('.ct-phase-nav button').nth(phase)).toHaveClass(/active/, { timeout: 20_000 });await expect(page.locator('.boot-splash')).toBeHidden();
}
async function record(scope:Locator) {await scope.getByRole('button',{name:'我已实际练习，开始检查',exact:true}).click();await scope.getByRole('button',{name:'记录：我练习了',exact:true}).click();}
const stage=(page:Page,index:number)=>page.locator('.ct-phase-nav button').nth(index);
async function completeBridge(page: Page, id: string) {
 await expect(page.getByRole('tab', { name: /知识桥/, selected: true })).toBeVisible();
 const bridge = page.locator(`.ct-ktrail[data-knowledge="${id}"]`);
 await expect(bridge.getByRole('button', { name: '再听方法', exact: true })).toBeVisible();
 await bridge.getByRole('button', { name: CHINESE_KNOWLEDGE_EXTENSION[id].answer, exact: true }).click();
 await expect(stage(page, 3)).toHaveClass(/active/);
}
function rhymePracticeFields() {
 const pack = getChineseTextbookStudy('rhyme-song')!;
 return { recognized: pack.recognize!.map(item => item.char), recognitionChecked: true, writingSeen: pack.writing!.map(item => item.char), writingPracticed: true, studySelected: 4 };
}

for (const lesson of CHINESE_TEXTBOOK_LESSONS) {
 const task = getChineseTeaching(lesson.id).transfer;
 if (task?.kind !== 'order') continue;
 test(`排序选项打乱：${lesson.id} 初始错序、拖动稳定、重排换序与断点恢复`, async ({ page }) => {
  await open(page, lesson.id, 3);
  const tab = page.getByRole('tab', { name: /迁移实践/ });
  if (await tab.count()) await tab.click();
  const scope = page.locator('.ct-transfer-practice');
  await expect(scope).toBeVisible();
  const bank = scope.locator('.ct-order-bank button');
  const first = await bank.allTextContents();
  expect(first).not.toEqual(task.items);
  expect(first).not.toEqual([...task.items].reverse());
  expect([...first].sort()).toEqual([...task.items].sort());
  await dragChineseWord(page, scope, task.items[0], 0);
  expect(await bank.allTextContents()).toEqual(first);
  await page.reload();
  await expect(stage(page, 3)).toHaveClass(/active/);
  await expect(page.locator('.boot-splash')).toBeHidden();
  if (await tab.count()) await tab.click();
  await expect(scope).toBeVisible();
  await expect(scope.locator('.ct-order-slot').first()).toContainText(task.items[0]);
  expect(await bank.allTextContents()).toEqual(first);
  await scope.getByRole('button', { name: '重新排序', exact: true }).click();
  const second = await bank.allTextContents();
  expect(second).not.toEqual(first);
  expect(second).not.toEqual(task.items);
  expect(second).not.toEqual([...task.items].reverse());
  await expect(scope.locator('.ct-order-slot.filled')).toHaveCount(0);
  for (let i = 0; i < task.items.length; i++) await dragChineseWord(page, scope, task.items[i], i);
  expect(await bank.allTextContents()).toEqual(second);
  await scope.getByRole('button', { name: '检查这项任务', exact: true }).click();
  await expect.poll(() => page.evaluate(({ child, id }) => JSON.parse(localStorage.getItem(`sfz-chinese-practice-v1:${child}:${id}:lesson:transferDone`) ?? 'false'), { child, id: lesson.id })).toBe(true);
 });
}

test('排序拖放：Pad 触屏填入预留空位，填满才可检查并自动进下一任务', async ({ page }) => {
 await open(page, 'china', 3);
 const scope = page.locator('.ct-transfer-practice'), check = scope.getByRole('button', { name: '检查这项任务' });
 await expect(scope.locator('.ct-order-slot')).toHaveCount(3);
 await expect(scope.locator('.practice-again')).toHaveCount(0);
 await expect(check).toBeDisabled();
 await dragChineseWord(page, scope, '一家', 2, true);
 await expect(scope.locator('.ct-order-slot').nth(0)).toContainText('拖到这里');
 await expect(check).toBeDisabled();
 await dragChineseWord(page, scope, '中华民族', 0, true);
 await dragChineseWord(page, scope, '是', 1, true);
 await expect(check).toBeEnabled();
 await page.screenshot({ path: 'tmp/chinese-word-order/Pad-排序.png' });
 await check.click();
 await expect(page.getByRole('tab', { name: /口语练习/, selected: true })).toBeVisible();
 expect(await page.evaluate(child => JSON.parse(localStorage.getItem(`sfz-chinese-practice-v1:${child}:china:lesson:transferDone`)! ), child)).toBe(true);
});

test('排序拖放：错误顺序可交换、替换与拖回，重排清空所有位置', async ({ page }) => {
 await open(page, 'china', 3);
 const scope = page.locator('.ct-transfer-practice'), slots = scope.locator('.ct-order-slot');
 await dragChineseWord(page, scope, '一家', 0);
 await dragChineseWord(page, scope, '是', 1);
 await dragChineseWord(page, scope, '中华民族', 2);
 await scope.getByRole('button', { name: '检查这项任务' }).click();
 await expect(scope.getByRole('status').last()).toContainText('可以重新排一次');
 await moveChineseWord(page, slots.nth(0), slots.nth(2));
 await expect(slots.nth(0)).toContainText('中华民族');
 await expect(slots.nth(2)).toContainText('一家');
 await moveChineseWord(page, slots.nth(1), scope.locator('.ct-order-bank'));
 await expect(slots.nth(1)).toContainText('拖到这里');
 await expect(scope.getByRole('button', { name: '检查这项任务' })).toBeDisabled();
 await dragChineseWord(page, scope, '是', 0);
 await expect(scope.locator('.ct-order-bank').getByRole('button', { name: '中华民族', exact: true })).toBeVisible();
 await scope.getByRole('button', { name: '重新排序' }).click();
 for (const slot of await slots.all()) await expect(slot).toContainText('拖到这里');
 await expect(scope.locator('.ct-order-bank button')).toHaveCount(3);
});

test('排序拖放：保留旧断点与空位，取消或拖到无效区域不改变答案', async ({ page }) => {
 await open(page, 'china', 3, { 'lesson:transferPlaced': ['中华民族'] });
 const scope = page.locator('.ct-transfer-practice'), slots = scope.locator('.ct-order-slot');
 await expect(slots.nth(0)).toContainText('中华民族');
 await dragChineseWord(page, scope, '一家', 2);
 await page.reload();
 await expect(slots.nth(1)).toContainText('拖到这里');
 await expect(slots.nth(2)).toContainText('一家');
 const source = scope.locator('.ct-order-bank').getByRole('button', { name: '是', exact: true });
 await moveChineseWord(page, source, page.getByRole('heading', { name: '我是中国人', exact: true }));
 await expect(source).toBeVisible();
 const box = await source.boundingBox();
 if (!box) throw new Error('词语不可见');
 const session = await page.context().newCDPSession(page);
 await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
 await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x, y: box.y - 40 }] });
 await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
 await session.detach();
 await expect(page.locator('.ct-order-ghost')).toHaveCount(0);
 await expect(slots.nth(1)).toContainText('拖到这里');
 await dragChineseWord(page, scope, '是', 1);
 await expect(scope.getByRole('button', { name: '检查这项任务' })).toBeEnabled();
});

test('排序拖放：完成后无重复练习顶栏，重排与刷新保留原完成记录', async ({ page }) => {
 const fields = { 'lesson:transferPlaced': ['中华民族', '是', '一家'], 'lesson:transferDone': true, taskDone: true };
 await open(page, 'china', 3, fields, 4);
 const scope = page.locator('.ct-transfer-practice');
 await expect(scope.locator('.practice-again')).toHaveCount(0);
 await expect(scope.getByText('已完成', { exact: false })).toHaveCount(0);
 await dragChineseWord(page, scope, '一家', 0);
 await scope.getByRole('button', { name: '重新排序' }).click();
 await dragChineseWord(page, scope, '中华民族', 0);
 expect(await page.evaluate(child => JSON.parse(localStorage.getItem(`sfz-chinese-practice-v1:${child}:china:lesson:transferPlaced`)! ), child)).toEqual(['中华民族', '是', '一家']);
 await page.reload();
 await expect(scope.locator('.ct-order-bank button')).toHaveCount(3);
 await expect(stage(page, 4)).toBeEnabled();
});

test('排序拖放：键盘选词后可明确指定位置，四格长词在 Pad 完整显示', async ({ page }) => {
 await open(page, 'two-treasures', 3);
 await page.getByRole('tab', { name: /迁移实践/ }).click();
 const scope = page.locator('.ct-transfer-practice');
 const word = scope.locator('.ct-order-bank').getByRole('button', { name: '想清楚要做什么', exact: true });
 await word.focus(); await word.press('Enter');
 const slot = scope.locator('.ct-order-slot').nth(2);
 await slot.focus(); await slot.press('Enter');
 await expect(slot).toContainText('想清楚要做什么');
 const dimensions = await scope.evaluate(el => ({ scroll: el.scrollWidth, width: el.clientWidth }));
 expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
 await page.screenshot({ path: 'tmp/chinese-word-order/Pad-四格排序.png' });
});

test('排序拖放：触屏在空位外沿松手能一次吸附，连续拖入不同位置', async ({ page }) => {
 await open(page, 'china', 3);
 const scope = page.locator('.ct-transfer-practice');
 const session = await page.context().newCDPSession(page);
 try {
  for (const [index, word] of ['中华民族', '是', '一家'].entries()) {
   const source = scope.locator('.ct-order-bank').getByRole('button', { name: word, exact: true });
   const target = scope.locator('.ct-order-slot').nth(index);
   const from = await source.boundingBox(), to = await target.boundingBox();
   if (!from || !to) throw new Error('拖放位置不可见');
   const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
   const end = { x: to.x + to.width / 2, y: to.y + to.height + 26 };
   await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
   await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [end] });
   await expect(target).toHaveClass(/drop-target/);
   if (index === 0) await page.screenshot({ path: 'tmp/chinese-word-order/Pad-边缘吸附.png' });
   await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
   await expect(target).toContainText(word);
  }
 } finally { await session.detach(); }
 await expect(scope.getByRole('button', { name: '检查这项任务' })).toBeEnabled();
});

test('排序拖放：抓住卡片边角拖动，卡片碰到空位即可放入', async ({ page }) => {
 await open(page, 'two-treasures', 3);
 await page.getByRole('tab', { name: /迁移实践/ }).click();
 const scope = page.locator('.ct-transfer-practice');
 const source = scope.locator('.ct-order-bank').getByRole('button', { name: '想清楚要做什么', exact: true });
 const target = scope.locator('.ct-order-slot').nth(1);
 const from = await source.boundingBox(), to = await target.boundingBox();
 if (!from || !to) throw new Error('拖放位置不可见');
 await page.mouse.move(from.x + from.width - 4, from.y + from.height - 4);
 await page.mouse.down();
 const end = { x: to.x + to.width / 2, y: to.y - 40 };
 await page.mouse.move(end.x, end.y, { steps: 6 });
 const ghost = await page.locator('.ct-order-ghost').boundingBox();
 if (!ghost) throw new Error('拖动卡片不可见');
 expect(Math.abs(ghost.x + ghost.width - 4 - end.x)).toBeLessThan(2);
 // Move below the slot with the card's top still overlapping the slot by 18px.
 await page.mouse.move(to.x + to.width / 2, to.y + to.height + from.height - 4 - 18, { steps: 6 });
 await expect(target).toHaveClass(/drop-target/);
 await page.mouse.up();
 await expect(target).toContainText('想清楚要做什么');
});

test('排序拖放：空位之间的间隙也能吸附到最近位置，远离排序区不会误放', async ({ page }) => {
 await open(page, 'china', 3);
 const scope = page.locator('.ct-transfer-practice');
 const source = scope.locator('.ct-order-bank').getByRole('button', { name: '是', exact: true });
 const target = scope.locator('.ct-order-slot').nth(1);
 const from = await source.boundingBox(), to = await target.boundingBox();
 if (!from || !to) throw new Error('拖放位置不可见');
 await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
 await page.mouse.move(to.x - 4, to.y + to.height / 2, { steps: 6 });
 await expect(target).toHaveClass(/drop-target/);
 await page.mouse.up();
 await expect(target).toContainText('是');
 const other = scope.locator('.ct-order-bank').getByRole('button', { name: '一家', exact: true });
 await moveChineseWord(page, other, page.getByRole('heading', { name: '我是中国人', exact: true }));
 await expect(other).toBeVisible();
});

test('排序拖放：Chrome 第一个放入后第二第三个原位连续拖入，松手都结束拖动', async ({ page }) => {
 await open(page, 'china', 3);
 const scope = page.locator('.ct-transfer-practice');
 const words = ['中华民族', '是', '一家'];
 for (let round = 0; round < 2; round++) {
  const sources = await Promise.all(words.map(word => scope.locator('.ct-order-bank').getByRole('button', { name: word, exact: true }).boundingBox()));
  for (const [index, word] of words.entries()) {
   const from = sources[index], to = await scope.locator('.ct-order-slot').nth(index).boundingBox();
   if (!from || !to) throw new Error('拖放位置不可见');
   const current = await scope.locator('.ct-order-bank').getByRole('button', { name: word, exact: true }).boundingBox();
   expect(current).toEqual(from);
   await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
   await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 3 }); await page.mouse.up();
   await expect(scope.locator('.ct-order-slot').nth(index)).toContainText(word);
   await expect(page.locator('.ct-order-ghost')).toHaveCount(0);
  }
  await expect(scope.getByRole('button', { name: '检查这项任务' })).toBeEnabled();
  if (round === 1) await page.screenshot({ path: 'tmp/chinese-word-order/Chrome-连续三个词.png' });
  await scope.getByRole('button', { name: '重新排序' }).click();
 }
});

test('排序拖放：Chrome 子元素拦截松手事件仍能连续放入三个词', async ({ page }) => {
 await open(page, 'china', 3);
 const scope = page.locator('.ct-transfer-practice');
 await scope.locator('.ct-word-order').evaluate(board => {
  board.addEventListener('pointerup', event => event.stopPropagation());
 });
 for (const [index, word] of ['中华民族', '是', '一家'].entries()) {
  await dragChineseWord(page, scope, word, index);
  await expect(page.locator('.ct-order-ghost')).toHaveCount(0);
 }
 await expect(scope.getByRole('button', { name: '检查这项任务' })).toBeEnabled();
});

test('排序拖放：Chrome mouseup 兜底沿用高亮落点，后续两个词仍可放入', async ({ page }) => {
 await open(page, 'china', 3);
 const scope = page.locator('.ct-transfer-practice');
 const source = await scope.locator('.ct-order-bank').getByRole('button', { name: '中华民族', exact: true }).boundingBox();
 const target = await scope.locator('.ct-order-slot').nth(0).boundingBox();
 if (!source || !target) throw new Error('拖放位置不可见');
 await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2); await page.mouse.down();
 await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 3 });
 await expect(scope.locator('.ct-order-slot').nth(0)).toHaveClass(/drop-target/);
 // A mouse release must end the drag even if delegated pointerup is absent or reports the source position.
 await page.evaluate(({ x, y }) => window.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y, bubbles: true })), { x: source.x, y: source.y });
 await expect(scope.locator('.ct-order-slot').nth(0)).toContainText('中华民族');
 await expect(page.locator('.ct-order-ghost')).toHaveCount(0);
 await page.mouse.up();
 await dragChineseWord(page, scope, '是', 1);
 await dragChineseWord(page, scope, '一家', 2);
});

test('排序拖放：鼠标轻点词语再点目标位置仍可指定排序', async ({ page }) => {
 await open(page, 'china', 3);
 const scope = page.locator('.ct-transfer-practice');
 for (const [index, word] of ['中华民族', '是', '一家'].entries()) {
  const source = scope.locator('.ct-order-bank').getByRole('button', { name: word, exact: true });
  await source.click(); await expect(source).toHaveAttribute('aria-pressed', 'true');
  await scope.locator('.ct-order-slot').nth(index).click();
  await expect(scope.locator('.ct-order-slot').nth(index)).toContainText(word);
 }
 await expect(scope.getByRole('button', { name: '检查这项任务' })).toBeEnabled();
});

test('排序拖放：上一轮缺少松手时，下一次按下会清理旧词语状态', async ({ page }) => {
 await open(page, 'china', 3);
 const scope = page.locator('.ct-transfer-practice');
 await dragChineseWord(page, scope, '中华民族', 0);
 const second = scope.locator('.ct-order-bank').getByRole('button', { name: '是', exact: true });
 const third = scope.locator('.ct-order-bank').getByRole('button', { name: '一家', exact: true });
 const from = await second.boundingBox(), next = await third.boundingBox(), target = await scope.locator('.ct-order-slot').nth(2).boundingBox();
 if (!from || !next || !target) throw new Error('拖放位置不可见');
 await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
 await page.mouse.move(next.x + next.width / 2, next.y + next.height / 2, { steps: 3 });
 // Mimic a fresh primary press after the previous release never reached the component.
 await scope.locator('.ct-word-order').dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, clientX: next.x + next.width / 2, clientY: next.y + next.height / 2 });
 await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 3 }); await page.mouse.up();
 await expect(scope.locator('.ct-order-slot').nth(2)).toContainText('一家');
 await expect(second).toBeVisible();
 await expect(page.locator('.ct-order-ghost')).toHaveCount(0);
 await dragChineseWord(page, scope, '是', 1);
 await expect(scope.getByRole('button', { name: '检查这项任务' })).toBeEnabled();
});

test('对韵歌教材任务完成先进入知识桥，刷新停留，桥完成后自动进入真实表达', async ({ page }) => {
 await open(page, 'rhyme-song', 2, rhymePracticeFields());
 await record(page.locator('.ct-study-activity:visible'));
 await expect(page.getByRole('tab', { name: /知识桥/, selected: true })).toBeVisible();
 await expect(stage(page, 3)).toBeEnabled();
 await page.waitForTimeout(1400);
 await expect(stage(page, 2)).toHaveClass(/active/);
 await page.reload();
 await expect(page.getByRole('tab', { name: /知识桥/, selected: true })).toBeVisible();
 await page.waitForTimeout(1400);
 await expect(stage(page, 2)).toHaveClass(/active/);
 const bridge = page.locator('.ct-ktrail[data-knowledge="rhyme-song"]');
 await expect(bridge.getByRole('button', { name: '再听方法', exact: true })).toBeVisible();
 await bridge.getByRole('button', { name: '桌子', exact: true }).click();
 await page.waitForTimeout(1400);
 await expect(stage(page, 2)).toHaveClass(/active/);
 await bridge.getByRole('button', { name: '树', exact: true }).click();
 await expect(stage(page, 3)).toHaveClass(/active/);
});

test('对韵歌可手动跳过可选知识桥，不误记桥完成', async ({ page }) => {
 await open(page, 'rhyme-song', 2, rhymePracticeFields());
 await record(page.locator('.ct-study-activity:visible'));
 await expect(page.getByRole('tab', { name: /知识桥/, selected: true })).toBeVisible();
 await stage(page, 3).click();
 await expect(stage(page, 3)).toHaveClass(/active/);
 expect(await page.evaluate(child => localStorage.getItem(`sfz-chinese-practice-v1:${child}:rhyme-song:extensionDone`), child)).toBe('false');
});

test('对韵歌知识桥已完成时直接自动进真实表达，回看完成任务不跳走', async ({ page }) => {
 await open(page, 'rhyme-song', 2, { ...rhymePracticeFields(), extensionDone: true, bridgeExplained: true, bridgeAnswer: '树' }, 4);
 await record(page.locator('.ct-study-activity:visible'));
 await expect(stage(page, 3)).toHaveClass(/active/);
 await stage(page, 2).click();
 await expect(page.getByRole('tab', { name: /教材任务 1/, selected: true })).toBeVisible();
 await page.waitForTimeout(1400);
 await expect(stage(page, 2)).toHaveClass(/active/);
 expect(await page.evaluate(child => JSON.parse(localStorage.getItem(`sfz-chinese-flow-v1:${child}:rhyme-song`)!).unlocked, child)).toBe(4);
});

test('园地最后一项完成后先进入知识桥，完成桥后自动进真实表达', async ({ page }) => {
 const id = 'garden-2', cards = CHINESE_PINYIN_GARDENS[id];
 const fields: Record<string, unknown> = { gardenSelected: cards.length - 1, gardenCardsDone: cards.slice(0, -1).map((_card, i) => i) };
 cards.forEach((card, i) => { fields[`gardenTask:${i}:lines`] = card.material.map((_line, n) => n); fields[`gardenTask:${i}:answer`] = i < cards.length - 1 ? card.answer : null; });
 await open(page, id, 2, fields);
 const questionTab = page.getByRole('tab', { name: /想一想/ });
 if (await questionTab.count()) await questionTab.click();
 await page.locator('.ct-pinyin-garden-question:visible').getByRole('button', { name: cards[cards.length - 1].answer, exact: true }).click();
 await expect(page.getByRole('tab', { name: /知识桥/, selected: true })).toBeVisible();
 await page.waitForTimeout(1400);
 await expect(stage(page, 2)).toHaveClass(/active/);
 await completeBridge(page, id);
});

test('拼音最后一项完成后先进入知识桥，完成桥后自动进真实表达', async ({ page }) => {
 const id = 'pinyin-b-p-m-f', pack = CHINESE_PINYIN_STUDY[id];
 await open(page, id, 2, { pinyinStep: 3, pinyinLetters: pack.letters.map(letter => letter.glyph), pinyinTones: pack.tones, pinyinBlends: pack.blends.map((_blend, i) => i), pinyinWords: pack.words.map(word => word.word), pinyinRuleSeen: true, pinyinListeningDone: true });
 await page.locator('.ct-pinyin-check:visible').getByRole('button', { name: pack.check.answer, exact: true }).click();
 await expect(page.getByRole('tab', { name: /知识桥/, selected: true })).toBeVisible();
 await page.waitForTimeout(1400);
 await expect(stage(page, 2)).toHaveClass(/active/);
 await completeBridge(page, id);
});

test('入学课按实际完成自动推进，全部挑战答完显示成功页，手动返回所属单元',async({page})=>{
 await open(page,'china');
 await expect(page.locator('.ct-classroom-content > .ct-classroom-deck')).toHaveCount(0);
 for(const button of await page.locator('.ct-scene-hotspot').all()) await button.click();
 await expect(stage(page,1)).toHaveClass(/active/);
 await expect(page.locator('.ct-classroom-content .activity-tabs')).toHaveCount(0);
 await page.getByRole('button',{name:'我已完整听读或读过',exact:true}).click();await expect(stage(page,2)).toHaveClass(/active/);
 for(const button of await page.locator('.ct-word-grid button').all()) await button.click();await completeBridge(page,'china');
 for(const [index,item] of ['中华民族','是','一家'].entries()) await dragChineseWord(page,page.locator('.ct-transfer-practice'),item,index);
 await page.getByRole('button',{name:'检查这项任务',exact:true}).click();await expect(page.getByRole('tab',{name:/口语练习/,selected:true})).toBeVisible();
 await record(page.locator('.ct-real-expression'));await expect(stage(page,4)).toHaveClass(/active/);
 await expect(page.locator('.ct-classroom-content .activity-tabs')).toHaveCount(0);await expect(page.getByRole('button',{name:/上个活动|下个活动|继续.*→/})).toHaveCount(0);
 for(const q of CHINESE_TEXTBOOK_LESSONS.find(l=>l.id==='china')!.questions){await expect(page.locator('.ct-question-row')).toContainText(q.question);await page.locator('.ct-challenge-options').getByRole('button',{name:q.options[q.answer],exact:true}).click();}
 await expect(page.getByRole('region',{name:'语文学习完成',exact:true})).toBeVisible();
 await page.getByRole('region',{name:'语文学习完成',exact:true}).getByRole('button',{name:'返回语文目录',exact:true}).click();
 await expect(page).toHaveURL(/subject\/chinese\?unit=china/);await expect(page.locator('.ct-lesson-china')).toHaveClass(/done/);
 expect(await page.evaluate(child=>JSON.parse(localStorage.getItem(`sfz-chinese-textbook-progress:${child}`)??'{}').china,child)).toBe(3);
});

test('旧教材完成标记不能跳过尚未练习的认字和教材任务',async({page})=>{
 await open(page,'heaven-earth-human',2,{studyDone:true});await page.waitForTimeout(1300);await expect(stage(page,2)).toHaveClass(/active/);await expect(stage(page,3)).toBeDisabled();
 for(const button of await page.locator('.ct-recognize-grid button').all()) await button.click();
 await expect(page.getByRole('tab',{name:/认字抽查/,selected:true})).toBeVisible();await expect(stage(page,3)).toBeDisabled();
 await page.getByRole('tab',{name:/教材任务 1/}).click();await record(page.locator('.ct-study-activity:visible'));await completeBridge(page,'heaven-earth-human');
});

test('拼音只完成规则和听辨不能跳阶段，声调和所有拼读子任务逐项自动推进',async({page})=>{
 const id='pinyin-b-p-m-f',pack=CHINESE_PINYIN_STUDY[id];
 await open(page,id,2,{studyDone:true,pinyinStep:3,pinyinRuleAnswer:pack.check.answer,pinyinRuleSeen:true,pinyinListeningDone:true});await page.waitForTimeout(1300);await expect(stage(page,3)).toBeDisabled();
 await page.getByRole('tab',{name:/听音辨形/}).click();for(const button of await page.locator('.ct-pinyin-letter-grid button:visible').all())await button.click();
 await expect(page.getByRole('tab',{name:/声调与拼读/,selected:true})).toBeVisible();for(const button of await page.locator('.ct-pinyin-tones button:visible').all()) await button.click();
 for(const [index,blend] of pack.blends.entries()){await expect(page.getByRole('tab',{name:new RegExp(`拼读 ${index+1}`),selected:true})).toBeVisible();await page.locator('.ct-pinyin-blend:visible .ct-pinyin-choices').getByRole('button',{name:blend.result,exact:true}).click();await expect(stage(page,3)).toBeDisabled();}
 await expect(page.getByRole('tab',{name:/图文识字/,selected:true})).toBeVisible();for(const button of await page.locator('.ct-pinyin-word-grid button:visible').all())await button.click();await completeBridge(page,id);
});

test('园地先完成阅读材料再进入该项问题，一项完成仅进入下一项，刷新保留子任务进度',async({page})=>{
 const id='garden-2',first=CHINESE_PINYIN_GARDENS[id][0];await open(page,id,2);
 for(const button of await page.locator('.ct-pinyin-garden-material:visible button').all())await button.click();await expect(page.getByRole('tab',{name:/想一想/,selected:true})).toBeVisible();await expect(stage(page,3)).toBeDisabled();
 await page.locator('.ct-pinyin-garden-question:visible').getByRole('button',{name:first.answer,exact:true}).click();await expect(page.getByRole('tab',{name:/教材任务 2/,selected:true})).toBeVisible();await expect(stage(page,3)).toBeDisabled();
 // 刷新后读取各子任务自己的学习断点。
 await page.reload();await expect(page.getByRole('tab',{name:/教材任务 2/,selected:true})).toBeVisible();await page.waitForTimeout(1200);await expect(stage(page,2)).toHaveClass(/active/);
 const done=await page.evaluate(({child,id})=>JSON.parse(localStorage.getItem(`sfz-chinese-practice-v1:${child}:${id}:gardenCardsDone`)??'[]'),{child,id});expect(done).toEqual([0]);
});

test('目录直接选单元，课文通过滑动浏览，返回与刷新保留单元',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/#/subject/chinese');await expect(page.locator('.ct-unit-buttons button')).toHaveCount(9);await expect(page.locator('.catalog-unit-select,.content-pager,.ct-method-strip')).toHaveCount(0);
 for(const [index,unit] of CHINESE_BOOK_UNITS.entries()){await page.locator('.ct-unit-buttons button').nth(index).click();await expect(page.locator('.ct-lesson-entry')).toHaveCount(unit.lessonIds.length);}
 await page.setViewportSize({width:1024,height:768});await page.locator('.ct-unit-buttons button').nth(1).click();await page.locator('.ct-lesson-swipe').hover();await page.mouse.wheel(0,700);await expect.poll(()=>page.locator('.ct-lesson-swipe').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 await page.locator('.ct-lesson-garden-1').click();await page.getByRole('button',{name:'返回语文目录',exact:true}).click();await expect(page.locator('.ct-unit-buttons button').nth(1)).toHaveAttribute('aria-pressed','true');await page.reload();await expect(page.locator('.ct-unit-buttons button').nth(1)).toHaveAttribute('aria-pressed','true');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
});

test('最子级自动朗读题目与屏幕顺序中的选项，提示和重绘不重读，重播可点击',async({page})=>{
 const reads:string[]=[];await page.route('**/api/**',route=>{if(route.request().url().includes('/volc-tts/')){reads.push(route.request().postDataJSON().req_params.text);return route.fulfill({contentType:'text/event-stream',body:'data: {"code":20000000}\n\n'});}return route.fulfill({json:{ok:true,ttsConfigured:true}});});
 await page.addInitScript(child=>{(window as unknown as {__VOLC_TTS_ENABLED__:boolean}).__VOLC_TTS_ENABLED__=true; const saved=JSON.parse(localStorage.getItem('smart-fun-zone')??'{}');saved.state.sound=true;saved.state.voiceOn=true;localStorage.setItem('smart-fun-zone',JSON.stringify(saved));localStorage.setItem(`sfz-chinese-flow-v1:${child}:china`,JSON.stringify({phase:4,unlocked:4}));},child);
 await page.goto('/#/chinese-course/china');await expect(page.locator('.boot-splash')).toBeHidden();await page.locator('.ct-common-prompt > div').click();const narrated=()=>reads.filter(text=>text.includes('答案选项'));await expect.poll(()=>narrated().length).toBe(1);
 const first=narrated()[0],options=await page.locator('.ct-challenge-options button').allTextContents();for(const option of options)expect(first).toContain(option);expect(options.map(option=>first.indexOf(option))).toEqual([...options.map(option=>first.indexOf(option))].sort((a,b)=>a-b));
 await page.getByRole('button',{name:'回到课文找线索',exact:true}).click();await page.waitForTimeout(500);expect(narrated()).toHaveLength(1);await page.getByRole('button',{name:'再听一遍',exact:true}).click();await expect.poll(()=>narrated().length).toBe(2);expect(narrated()[1]).toBe(first);
 await page.getByRole('button',{name:'不懂就问',exact:true}).click();await expect(page.getByRole('dialog',{name:'不懂就问聪聪老师'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'不懂就问聪聪老师'})).toHaveCount(0);await expect(page.getByRole('button',{name:'不懂就问',exact:true})).toBeFocused();
});

test('后续阶段已经解锁时，新完成当前教材仍自动推进，回看已完成页不跳走',async({page})=>{
 await open(page,'china',2,{wordsSeen:['中国人','我们','中华民族']},4);
 await page.locator('.ct-word-grid').getByRole('button',{name:/一家/}).click();await completeBridge(page,'china');
 await stage(page,2).click();await page.waitForTimeout(1300);await expect(stage(page,2)).toHaveClass(/active/);
 expect(await page.evaluate(child=>JSON.parse(localStorage.getItem(`sfz-chinese-flow-v1:${child}:china`)??'{}').unlocked,child)).toBe(4);
});

test('全部教材实际记录已完成时，恢复到教材页不会自动跳过回看',async({page})=>{
 await open(page,'china',2,{wordsSeen:['中国人','我们','中华民族','一家'],studyDone:true});
 await expect(stage(page,3)).toBeEnabled();await page.waitForTimeout(1300);await expect(stage(page,2)).toHaveClass(/active/);
 await page.reload();await page.waitForTimeout(1300);await expect(stage(page,2)).toHaveClass(/active/);
});

test('园地整组材料和答案已有实际记录时，初次校验及刷新不会误当新完成',async({page})=>{
 const id='garden-2',cards=CHINESE_PINYIN_GARDENS[id],fields:Record<string,unknown>={gardenCardsDone:cards.map((_card,i)=>i),gardenSelected:0};
 cards.forEach((card,i)=>{fields[`gardenTask:${i}:lines`]=card.material.map((_line,n)=>n);fields[`gardenTask:${i}:answer`]=card.answer;});
 await open(page,id,2,fields);await expect(stage(page,3)).toBeEnabled();await page.waitForTimeout(1500);await expect(stage(page,2)).toHaveClass(/active/);await expect(page.getByRole('tab',{name:/教材任务 1/,selected:true})).toBeVisible();
 await page.reload();await page.waitForTimeout(1500);await expect(stage(page,2)).toHaveClass(/active/);
});

test('拼音真实听辨细项已完成时，恢复校验不触发新的自动推进',async({page})=>{
 const id='pinyin-b-p-m-f',pack=CHINESE_PINYIN_STUDY[id];
 await open(page,id,2,{pinyinLetters:pack.letters.map(letter=>letter.glyph),pinyinTones:pack.tones,pinyinBlends:pack.blends.map((_blend,i)=>i),pinyinWords:pack.words.map(word=>word.word),pinyinRuleAnswer:pack.check.answer,pinyinRuleSeen:true,pinyinListeningDone:false,'lesson:listenIndex:0':2,pinyinStep:3});
 await expect(stage(page,3)).toBeEnabled();await page.waitForTimeout(1500);await expect(stage(page,2)).toHaveClass(/active/);
});

test('纸笔逐字断点已全部完成时，不因旧总标记缺失而重新跳页',async({page})=>{
 const id='autumn',pack=getChineseTextbookStudy(id)!;
 await open(page,id,2,{recognized:pack.recognize!.map(item=>item.char),writingSeen:pack.writing!.map(item=>item.char),textbookTasks:pack.tasks.map(task=>task.id),writingPracticed:false,'lesson:paper-writing:writingIndex:0':pack.writing!.length,studySelected:3});
 await expect(stage(page,3)).toBeEnabled();await expect(page.getByRole('tab',{name:/实际书写/,selected:true})).toBeVisible();await page.waitForTimeout(1500);await expect(stage(page,2)).toHaveClass(/active/);
});
