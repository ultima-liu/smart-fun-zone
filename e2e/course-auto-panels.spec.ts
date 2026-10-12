import { expect, test, type Page } from '@playwright/test';
import { mockCourseAI, mockCourseMicrophone } from './course-ai-helpers';
import { getChineseTextbookLesson } from '../src/content/chineseTextbookCurriculum';
import { getChineseTextbookStudy } from '../src/content/chineseTextbookStudy';
import { CHINESE_KNOWLEDGE_EXTENSION } from '../src/content/chineseKnowledgeExtension';

test.use({ viewport: { width: 1024, height: 768 } });
const child='course-auto-panel-child';
async function seed(page:Page, entries:Record<string,unknown>) {
  await mockCourseMicrophone(page);
  await page.route('**/api/**',route=>route.fulfill({json:{ok:false,ttsConfigured:false}}));
  await page.addInitScript(({child,entries})=>{
    if(sessionStorage.getItem('auto-panel-seeded'))return;
    sessionStorage.setItem('auto-panel-seeded','1');
    localStorage.setItem('smart-fun-zone',JSON.stringify({version:8,state:{lang:'zh',theme:'light',sound:false,voiceOn:false,musicOn:false,profiles:[{id:child,name:'自动检查体验生',ageBand:'g1',avatar:'🐼',createdAt:Date.now()}],activeChildId:child,mastery:{},records:[],lessonProgress:{},wrongs:{},points:{},pointLog:{},parentPin:'1234',dailyLimitMin:0,buddyOpen:false,buddyWakeOn:false}}));
    for(const[key,value]of Object.entries(entries))localStorage.setItem(key,JSON.stringify(value));
  },{child,entries});
}
async function noManualPanels(page:Page) {
  await expect(page.getByRole('button',{name:/请 AI 确认|录音交给 AI/})).toHaveCount(0);
  await expect(page.getByText('AI 检查标准',{exact:true})).toHaveCount(0);
  await expect(page.getByText('实际作答或补充说明',{exact:true})).toHaveCount(0);
}

for (const id of ['love-chinese', 'rhyme-song', 'pinyin-b-p-m-f']) test(`知识桥不以播放为完成条件 ${id}：答错停留，未点重播也可完成`, async ({ page }) => {
  const prefix = `sfz-chinese-practice-v1:${child}:${id}:`;
  const pack = getChineseTextbookStudy(id);
  const lesson = getChineseTextbookLesson(id)!;
  await seed(page, {
    [`sfz-chinese-flow-v1:${child}:${id}`]: { phase: 2, unlocked: 2 },
    [prefix + 'bridgeExplained']: false,
    [prefix + 'recognized']: pack?.recognize?.map(item => item.char) ?? [],
    [prefix + 'recognitionChecked']: true,
    [prefix + 'writingSeen']: pack?.writing?.map(item => item.char) ?? [],
    [prefix + 'writingPracticed']: true,
    [prefix + 'textbookTasks']: pack?.tasks.map(task => task.id) ?? [],
    [prefix + 'wordsSeen']: lesson.keywords,
  });
  await page.goto(`/#/chinese-course/${id}`);
  await page.getByRole('tab', { name: /知识桥/ }).click();
  const bridge = page.locator(`.ct-ktrail[data-knowledge="${id}"]`);
  await expect(bridge.getByRole('button', { name: '再听方法', exact: true })).toBeVisible();
  await expect(bridge.locator('.ct-ktrail-explain')).toHaveCount(0);
  const card = CHINESE_KNOWLEDGE_EXTENSION[id];
  await bridge.getByRole('button', { name: card.options.find(choice => choice !== card.answer)!, exact: true }).click();
  await expect(bridge.locator('.ct-ktrail-check > p')).toContainText('再看方法卡');
  expect(await page.evaluate(prefix => localStorage.getItem(prefix + 'extensionDone'), prefix)).toBe('false');
  await bridge.getByRole('button', { name: card.answer, exact: true }).click();
  await expect.poll(() => page.evaluate(prefix => localStorage.getItem(prefix + 'extensionDone'), prefix)).toBe('true');
  expect(await page.evaluate(prefix => localStorage.getItem(prefix + 'bridgeExplained'), prefix)).toBe('false');
  if (id !== 'pinyin-b-p-m-f') await expect(page.locator('.ct-phase-nav button').nth(3)).toHaveClass(/active/);
});

for (const item of [{ id: 'china', width: 1024, height: 768 }, { id: 'rhyme-song', width: 1180, height: 820 }]) test(`语文整课成功页 ${item.id}：保存后停留，刷新不重复结算`, async ({ page }) => {
  await page.setViewportSize(item);
  const lesson = getChineseTextbookLesson(item.id)!;
  const last = lesson.questions.at(-1)!;
  const flow = `sfz-chinese-flow-v1:${child}:${item.id}`;
  const prefix = `sfz-chinese-practice-v1:${child}:${item.id}:`;
  await seed(page, { [flow]: { phase: 4, unlocked: 4 }, [prefix + 'challengeIndex']: lesson.questions.length - 1 });
  await page.goto(`/#/chinese-course/${item.id}`);
  await expect(page.locator('.ct-question-row')).toContainText(last.question, { timeout: 30_000 });
  const choices = page.locator('.ct-challenge-options');
  await choices.getByRole('button', { name: last.options[(last.answer + 1) % last.options.length], exact: true }).click();
  await expect(page.getByRole('region', { name: '语文学习完成', exact: true })).toHaveCount(0);
  await expect(choices.locator('.wrong')).toHaveCount(0);
  await choices.getByRole('button', { name: last.options[last.answer], exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`chinese-course/${item.id}\\?completed=1`));
  const result = page.getByRole('region', { name: '语文学习完成', exact: true });
  await expect(result.getByRole('heading', { name: '本课学习完成！' })).toBeVisible();
  await expect(result.getByRole('img', { name: '3 颗星' })).toBeVisible();
  await expect(page.locator('.ct-challenge')).toHaveCount(0);
  const read = () => page.evaluate(({ child, id, flow, prefix }) => {
    const state = JSON.parse(localStorage.getItem('smart-fun-zone') ?? '{}').state;
    return { stars: JSON.parse(localStorage.getItem(`sfz-chinese-textbook-progress:${child}`) ?? '{}')[id],
      flow: localStorage.getItem(flow), practice: Object.keys(localStorage).filter(key => key.startsWith(prefix)),
      points: state.points[child], log: state.pointLog[child], chars: state.charBag[child],
      completedAt: state.taskStates[child]?.lessonCompletedAt?.[`chinese:${id}`],
      reviews: JSON.parse(localStorage.getItem(`sfz-review-plan-v1:${child}`) ?? '[]'),
    };
  }, { child, id: item.id, flow, prefix });
  const saved = await read();
  expect(saved).toMatchObject({ stars: 3, flow: null, practice: [], completedAt: expect.any(Number) });
  const pack = getChineseTextbookStudy(item.id);
  for (const entry of [...pack?.recognize ?? [], ...pack?.writing ?? []]) expect(saved.chars).toContain(entry.char);
  expect(saved.reviews).toEqual([expect.objectContaining({ subject: 'chinese', lessonId: item.id })]);
  await page.reload();
  await expect(page.locator('.boot-splash')).toBeHidden();
  await expect(page.locator('.boot-splash')).toHaveCSS('opacity', '0');
  await expect(result).toBeVisible();
  expect(await read()).toEqual(saved);
  await expect(result).toBeVisible();
  expect(await result.evaluate(el => {
    const rect = el.getBoundingClientRect();
    return rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight && el.scrollHeight <= el.clientHeight + 1;
  })).toBe(true);
  await page.screenshot({ path: `tmp/chinese-completion/${item.id}-${item.width}.png`, animations: 'disabled' });
  if (item.id !== 'china') {
    await result.getByRole('button', { name: '再学一次', exact: true }).click();
    await expect(page.locator('.ct-phase-nav button').first()).toHaveAttribute('aria-current', 'step');
    await expect(page.getByRole('region', { name: '语文学习完成', exact: true })).toHaveCount(0);
    expect((await read()).stars).toBe(3);
    await page.getByRole('button', { name: '返回语文目录', exact: true }).click();
  } else await result.getByRole('button', { name: '返回语文目录', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`subject/chinese\\?unit=${item.id}`));
  await expect(page.locator(`.ct-lesson-${item.id}`)).toHaveClass(/done/);
});

test('语文无完成记录不能通过成功页地址获得星星或奖励', async ({ page }) => {
  await seed(page, {});
  await page.goto('/#/chinese-course/china?completed=1');
  await expect(page).toHaveURL(/chinese-course\/china$/);
  await expect(page.locator('.ct-phase-nav button').first()).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('region', { name: '语文学习完成', exact: true })).toHaveCount(0);
  expect(await page.evaluate(child => localStorage.getItem(`sfz-chinese-textbook-progress:${child}`), child)).toBeNull();
});

for (const id of ['schoolchild', 'pinyin-i-u-v']) test(`语文跟读暂不检查 ${id}：无需麦克风即可完成并推进`, async ({ page }) => {
  const flow = `sfz-chinese-flow-v1:${child}:${id}`;
  const practice = `sfz-chinese-practice-v1:${child}:${id}:`;
  await seed(page, { [flow]: { phase: 1, unlocked: 1 } });
  await page.addInitScript(() => {
    const calls = { microphone: 0, recognition: 0 };
    Object.assign(window, { chineseFollowCalls: calls });
    navigator.mediaDevices.getUserMedia = async () => {
      calls.microphone++;
      throw new Error('本用例不允许录音');
    };
    class UnavailableRecognition {
      constructor() { calls.recognition++; throw new Error('本用例不允许语音识别'); }
    }
    Object.assign(window, { SpeechRecognition: UnavailableRecognition, webkitSpeechRecognition: UnavailableRecognition });
  });
  let assessments = 0;
  await page.route('**/api/course/assess', async route => {
    assessments++;
    await route.fulfill({ status: 503, json: { ok: false } });
  });
  await page.goto(`/#/chinese-course/${id}`);
  const reading = page.locator('.ct-reading-stage');
  await expect(reading).toBeVisible({ timeout: 20_000 });
  await reading.getByRole('button', { name: /^跟读：/ }).first().click();
  await expect(reading.locator('.ct-read-follow').first()).toHaveText('✓ 已跟读');
  await expect(page.locator('.ct-follow-mask')).toHaveCount(0);
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'false'), practice + 'readPracticed')).toBe(true);
  await expect(page.getByRole('button', { name: /完整听读/ })).toHaveAttribute('aria-current', 'step');
  // 关闭跟读检查不替代完整听读；全部句子点读后才推进。
  for (const line of await reading.getByRole('button', { name: /^点读第/ }).all()) await line.click();
  await expect(page.getByRole('button', { name: /教材练习/ })).toHaveAttribute('aria-current', 'step');
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').phase, flow)).toBe(2);
  expect(await page.evaluate(() => (window as unknown as { chineseFollowCalls: unknown }).chineseFollowCalls)).toEqual({ microphone: 0, recognition: 0 });
  expect(assessments).toBe(0);
  expect(await page.evaluate(child => JSON.parse(localStorage.getItem(`sfz-chinese-evidence-v1:${child}`) ?? '[]'), child)).toEqual([
    expect.objectContaining({ lessonId: id, taskId: 'read-line:0', skill: 'reading', source: 'self', level: 'practiced', note: expect.stringContaining('未核验') }),
  ]);
  await page.reload();
  await expect(page.getByRole('button', { name: /教材练习/ })).toHaveAttribute('aria-current', 'step');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'false'), practice + 'readDone')).toBe(true);
});

test('数学原有知识关系输入自动判断，不再显示手动确认区',async({page})=>{
  const id='unit1-review';const key=`sfz-math-task-v1:${child}:${id}`;
  await seed(page,{[`sfz-math-flow-v4:${child}:#/math-course/${id}`]:{contentVersion:4,phase:1,unlocked:1,actionDone:true},[key]:{'completed-action-tasks-v1':[0]}});
  await page.goto(`/#/math-course/${id}`);await mockCourseAI(page);
  const map=page.getByRole('region',{name:'第一单元知识图',exact:true});
  await expect(map).toBeVisible({timeout:20_000});await noManualPanels(page);
  const check=map.locator('.automatic-course-check:visible').first();
  await expect(check.getByRole('textbox')).toHaveCount(1);
  await check.getByRole('textbox',{name:'我的作答',exact:true}).fill('先数出有三只和五只，就知道五只比三只多。');
  await expect.poll(async()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'{}')['unit1-knowledge-map']?.length??0,key)).toBe(1);
});

test('语文表达直接使用原来的文字框，无重复答案或补充说明',async({page})=>{
  const id='rhyme-song';await seed(page,{[`sfz-chinese-flow-v1:${child}:${id}`]:{phase:3,unlocked:3}});
  await page.goto(`/#/chinese-course/${id}`);await mockCourseAI(page);
  await page.getByRole('tab',{name:'口语练习',exact:true}).click();
  const expression=page.getByRole('region',{name:'真实表达与交流',exact:true});
  await expect(expression).toBeVisible({timeout:20_000});await noManualPanels(page);
  await expect(expression.getByRole('textbox')).toHaveCount(1);
  await expression.getByRole('textbox').fill('我看到了天、地和人，天在上面，大地在下面，人站在地上。');
  await expect.poll(async()=>page.evaluate(child=>JSON.parse(localStorage.getItem(`sfz-chinese-evidence-v1:${child}`)??'[]').filter((row:any)=>row.source==='ai').length,child)).toBeGreaterThan(0);
});

test('自我介绍只检查一次表达，不要求接话也不记录倾听通过',async({page})=>{
  const id='china';await seed(page,{[`sfz-chinese-flow-v1:${child}:${id}`]:{phase:3,unlocked:3}});
  await page.goto(`/#/chinese-course/${id}`);
  await mockCourseAI(page,body=>{
    expect(body.prompt).toBe('向一位新朋友介绍自己，说说你叫什么、是哪里人。');
    expect(body.criteria).toEqual(['说出自己的名字','说出自己是哪里人','围绕题目表达，意思清楚']);
    return {};
  });
  await page.getByRole('tab',{name:'口语练习',exact:true}).click();
  const expression=page.getByRole('region',{name:'真实表达与交流',exact:true});
  await expect(expression).toBeVisible({timeout:20_000});
  await expect(expression.getByRole('textbox')).toHaveCount(1);
  await expect(expression.locator('.ct-listen-response')).toHaveCount(0);
  await expect(expression).not.toContainText('小雨');
  await expression.getByRole('textbox').fill('你好，我叫小星，我是中国人。');
  await expect.poll(async()=>page.evaluate(child=>JSON.parse(localStorage.getItem(`sfz-chinese-evidence-v1:${child}`)??'[]').filter((row:{source:string})=>row.source==='ai'),child)).toEqual([
    expect.objectContaining({lessonId:id,taskId:'oral-transfer',skill:'expression',source:'ai'}),
  ]);
});

for (const item of [
  { id:'motherland', model:'我看到长江很宽，我想看看江上的船。', answer:'我看到黄河的水是黄色的，我想知道它为什么是黄色的。' },
  { id:'pinyin-i-u-v', model:'我的衣服是蓝色的。', answer:'我的衣服上有一只小兔子。' },
]) test(`三段表达 ${item.id}：示范直接显示，一次输入只检查题目`,async({page})=>{
  await seed(page,{[`sfz-chinese-flow-v1:${child}:${item.id}`]:{phase:3,unlocked:3}});
  await page.goto(`/#/chinese-course/${item.id}`);
  await mockCourseAI(page,body=>{
    expect(body.prompt).not.toMatch(/倾听与回应任务|听别人|家人|拼读/);
    expect(body.criteria.join('')).not.toMatch(/回应|倾听|拼读/);
    expect(body.answer).toBe(item.answer);
    expect(body.exampleAnswer).toBe(item.model);
    expect(body.supported).toBe(true);
    return {};
  });
  await page.getByRole('tab',{name:'口语练习',exact:true}).click();
  const expression=page.getByRole('region',{name:'真实表达与交流',exact:true});
  await expect(expression).toBeVisible({timeout:20_000});
  await expect(expression.locator(':scope > div')).toHaveCount(3);
  await expect(expression.locator('.ct-expression-example')).toContainText(item.model);
  await expect(expression.getByRole('button')).toHaveCount(0);
  await expect(expression).not.toContainText('听别人说');
  await expression.getByRole('textbox',{name:'我的回答',exact:true}).fill(item.answer);
  await expect.poll(async()=>page.evaluate(child=>JSON.parse(localStorage.getItem(`sfz-chinese-evidence-v1:${child}`)??'[]').filter((row:{source:string})=>row.source==='ai'),child)).toEqual([
    expect.objectContaining({lessonId:item.id,skill:'expression',level:'supported'}),
  ]);
});

test('景物表达缺少想法时提示补充，输入页面示范原句后通过',async({page})=>{
  const id='motherland';const model='我看到长江很宽，我想看看江上的船。';
  await seed(page,{[`sfz-chinese-flow-v1:${child}:${id}`]:{phase:3,unlocked:3}});
  await page.goto(`/#/chinese-course/${id}`);
  const answers:string[]=[];
  await mockCourseAI(page,body=>{
    expect(body.exampleAnswer).toBe(model);
    expect(body.criteria).toEqual(['说出看到的景物','说出自己的想法','围绕题目表达，意思清楚']);
    answers.push(body.answer);
    if(body.answer==='我看到长江很宽。') return {verdict:'retry',feedback:'再说说你想到什么。'};
    expect(body.answer).toBe(model);
    return {feedback:'你说出了看到的景物和自己的想法！'};
  });
  await page.getByRole('tab',{name:'口语练习',exact:true}).click();
  const expression=page.getByRole('region',{name:'真实表达与交流',exact:true});
  const input=expression.getByRole('textbox',{name:'我的回答',exact:true});
  const evidence=()=>page.evaluate(child=>JSON.parse(localStorage.getItem(`sfz-chinese-evidence-v1:${child}`)??'[]').filter((row:{source:string})=>row.source==='ai'),child);
  await expect(expression.locator('.ct-expression-example')).toContainText(model);
  await input.fill('我看到长江很宽。');
  await expect(expression.getByRole('status')).toContainText('再说说你想到什么。');
  expect(await evidence()).toEqual([]);
  await input.fill(model);
  await expect(expression.getByRole('status')).toContainText('完成了');
  await expect.poll(evidence).toEqual([expect.objectContaining({lessonId:id,taskId:'oral-transfer',skill:'expression',level:'supported'})]);
  expect(answers).toEqual(['我看到长江很宽。',model]);
});

for (const item of [
  {id:'motherland',oralDone:false,unlocked:3,answer:'我看到长江很宽，我想看看江上的船。'},
  {id:'motherland',oralDone:true,unlocked:4,answer:'我看到黄河的水是黄色的，我想去看看黄河。'},
  {id:'pinyin-i-u-v',oralDone:false,unlocked:3,answer:'我的衣服是蓝色的。'},
]) test(`表达完成自动进入迁移挑战 ${item.id} 已完成=${item.oralDone}`,async({page})=>{
  const flow=`sfz-chinese-flow-v1:${child}:${item.id}`;
  await seed(page,{[flow]:{phase:3,unlocked:item.unlocked},
    [`sfz-chinese-practice-v1:${child}:${item.id}:taskDone`]:true,
    [`sfz-chinese-practice-v1:${child}:${item.id}:oralDone`]:item.oralDone,
  });
  await page.goto(`/#/chinese-course/${item.id}`);await mockCourseAI(page);
  const current=page.getByRole('button',{name:/真实表达/,exact:false});
  const next=page.getByRole('button',{name:/迁移挑战/,exact:false});
  await expect(current).toHaveAttribute('aria-current','step');
  await page.getByRole('tab',{name:'口语练习',exact:true}).click();
  const oral=page.getByRole('region',{name:'真实表达与交流',exact:true});
  // Restoring existing completion never advances by itself.
  await page.waitForTimeout(1400);
  await expect(current).toHaveAttribute('aria-current','step');
  await oral.getByRole('textbox',{name:'我的回答',exact:true}).fill(item.answer);
  await expect(next).toHaveAttribute('aria-current','step');
  await expect(page.locator('.ct-challenge-top')).toBeVisible();
  await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'{}'),flow)).toEqual({phase:4,unlocked:4});
  await page.reload();
  await expect(next).toHaveAttribute('aria-current','step');
});

test('先完成表达会返回未完成的迁移实践，完成配对后自动进入挑战',async({page})=>{
  const id='motherland';
  await seed(page,{[`sfz-chinese-flow-v1:${child}:${id}`]:{phase:3,unlocked:3}});
  await page.goto(`/#/chinese-course/${id}`);await mockCourseAI(page);
  await page.getByRole('tab',{name:'口语练习',exact:true}).click();
  await page.getByRole('textbox',{name:'我的回答',exact:true}).fill('我看到长江很宽，我想看看江上的船。');
  await expect(page.getByRole('tab',{name:'迁移实践',exact:true})).toHaveAttribute('aria-selected','true');
  const next=page.getByRole('button',{name:/迁移挑战/});
  await expect(next).toBeDisabled();
  const transfer=page.getByRole('region',{name:'配对与排序任务'});
  for (const [left,right] of [['五星红旗','红旗面、五颗星'],['北京天安门','北京的红色城楼'],['长江','教材图中穿过青山的宽阔江水'],['黄河','教材图中奔腾的黄色河水']]) {
    await transfer.getByRole('button',{name:left,exact:true}).click();
    await transfer.getByRole('button',{name:right,exact:true}).click();
  }
  await transfer.getByRole('button',{name:'检查这项任务',exact:true}).click();
  await expect(next).toHaveAttribute('aria-current','step');
});

test('表达判题未通过时不自动进入挑战，通过后的跳转可被手动切页取消',async({page})=>{
  const id='motherland';
  await seed(page,{[`sfz-chinese-flow-v1:${child}:${id}`]:{phase:3,unlocked:3},
    [`sfz-chinese-practice-v1:${child}:${id}:taskDone`]:true});
  await page.goto(`/#/chinese-course/${id}`);
  await mockCourseAI(page,body=>body.answer==='我看到长江很宽。'?{verdict:'retry',feedback:'再说说你想到什么。'}:{});
  await page.getByRole('tab',{name:'口语练习',exact:true}).click();
  const input=page.getByRole('textbox',{name:'我的回答',exact:true});
  await input.fill('我看到长江很宽。');
  await expect(page.getByRole('status')).toContainText('再说说你想到什么。');
  await page.waitForTimeout(1400);
  await expect(page.getByRole('button',{name:/迁移挑战/})).toBeDisabled();
  await input.fill('我看到长江很宽，我想看看江上的船。');
  await expect(page.getByRole('status')).toContainText('完成了');
  await page.getByRole('button',{name:/看图发现/}).click();
  await page.waitForTimeout(1400);
  await expect(page.getByRole('button',{name:/看图发现/})).toHaveAttribute('aria-current','step');
});

test('恢复已完成的表达和原答案只重新展示反馈，不误触发自动跳转',async({page})=>{
  const id='motherland';const answer='我看到长江很宽，我想看看江上的船。';
  await seed(page,{[`sfz-chinese-flow-v1:${child}:${id}`]:{phase:3,unlocked:4},
    [`sfz-chinese-practice-v1:${child}:${id}:taskDone`]:true,
    [`sfz-chinese-practice-v1:${child}:${id}:oralDone`]:true,
    [`sfz-chinese-practice-v1:${child}:${id}:lesson:oral-transfer:expressionNote`]:answer});
  await page.goto(`/#/chinese-course/${id}`);await mockCourseAI(page);
  await page.getByRole('tab',{name:'口语练习',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'我的回答',exact:true})).toHaveValue(answer);
  await expect(page.getByRole('status')).toContainText('完成了');
  await page.waitForTimeout(1400);
  await expect(page.getByRole('button',{name:/真实表达/})).toHaveAttribute('aria-current','step');
});

test('数学已有作答框的开放观察写完自动检查，不增加输入框',async({page})=>{
  const id='learning-readiness';await seed(page,{[`sfz-math-flow-v4:${child}:#/math-course/${id}`]:{contentVersion:4,phase:1,unlocked:1,actionDone:true},[`sfz-math-task-v1:${child}:${id}`]:{'completed-action-tasks-v1':[0]}});
  await page.goto(`/#/math-course/${id}`);await mockCourseAI(page);
  await page.getByRole('tab',{name:/教材任务 2/}).click();
  const observation=page.locator('.mt-open-observation');
  await page.getByRole('button',{name:/开放数学观察记录/}).click();
  await expect(observation).toBeVisible({timeout:20_000});await noManualPanels(page);
  await expect(observation.getByRole('textbox')).toHaveCount(1);
  await observation.getByRole('textbox').fill('我看到教室里有三排桌子，每排有四张。');
  await expect.poll(async()=>page.evaluate(child=>JSON.parse(localStorage.getItem(`sfz-math-evidence-v1:${child}`)??'[]').some((row:any)=>row.taskId==='open-observation'&&row.source==='ai'),child)).toBe(true);
});
