import { expect, test, type Page } from '@playwright/test';
import { mockCourseAI, mockCourseMicrophone, sayReading, answerCourseTask } from './course-ai-helpers';
import { drawInk, writeHanzi, writeLetter } from './screen-writing-helpers';
import { letterStrokePaths } from '../src/content/writingTemplates';
import { resampleInk, strokePathPoints } from '../src/writingCheck';
import { getChineseTextbookStudy } from '../src/content/chineseTextbookStudy';

const child = 'ai-course-child';
async function seed(page: Page, entries: Record<string, unknown>) {
  await page.route('**/api/**', route => route.fulfill({json:{ok:false,ttsConfigured:false}}));
  await mockCourseMicrophone(page);
  await page.addInitScript(({child,entries}) => {
    if (sessionStorage.getItem('ai-seeded')) return;
    sessionStorage.setItem('ai-seeded','1');
    localStorage.setItem('smart-fun-zone', JSON.stringify({version:8,state:{lang:'zh',theme:'light',sound:false,voiceOn:false,musicOn:false,
      profiles:[{id:child,name:'AI 课程体验生',ageBand:'g1',avatar:'🐼',createdAt:Date.now()}],activeChildId:child,mastery:{},records:[],lessonProgress:{},wrongs:{},points:{},pointLog:{},parentPin:'1234',dailyLimitMin:0,buddyOpen:false,buddyWakeOn:false}}));
    for (const [key,value] of Object.entries(entries)) localStorage.setItem(key,JSON.stringify(value));
  }, {child,entries});
}
async function openEnglish(page: Page, phase=3) {
  const id='friends-opening';
  await seed(page,{[`sfz-english-g3a-flow-v6:${child}:${id}`]:{phase,unlocked:phase}});
  await page.goto(`/#/english-course/${id}`);
  await expect(page.locator('main')).toBeVisible();
}
async function openChineseWriting(page: Page, completed=false) {
  const id='rhyme-song', pack=getChineseTextbookStudy(id)!;
  const prefix=`sfz-chinese-practice-v1:${child}:${id}:`;
  await seed(page,{[`sfz-chinese-flow-v1:${child}:${id}`]:{phase:2,unlocked:3},
    [prefix+'recognized']:pack.recognize!.map(item=>item.char),[prefix+'writingSeen']:pack.writing!.map(item=>item.char),
    [prefix+'recognitionChecked']:true,[prefix+'writingPracticed']:completed,[prefix+'studySelected']:2,
    ...(completed?{[prefix+'lesson:paper-writing:writingIndex:0']:pack.writing!.length}:{})});
  await page.goto(`/#/chinese-course/${id}`);
  await expect(page.locator('main')).toBeVisible();
  await page.getByRole('tab',{name:/实际书写/}).click();
}

test('英语示范跟读复用语音识别自动校验，不上传文件或调用课程大模型',async({page})=>{
  await openEnglish(page);
  let calls=0;
  await mockCourseAI(page,()=>{calls++;return {status:503};});
  const practice=page.getByRole('region',{name:'分层表达练习'});
  await expect(practice.getByRole('button',{name:'我已经试着说过',exact:true})).toHaveCount(0);
  await expect(practice.locator('input[type=file]')).toHaveCount(0);
  await sayReading(page,practice,'I did it.');
  await expect(practice.getByRole('status')).toContainText('再读一次');
  await expect(practice.getByRole('button',{name:/借助提示说/})).toBeDisabled();
  await sayReading(page,practice);
  await expect(practice).toHaveAttribute('data-english-narration-key','expression:1');
  expect(calls).toBe(0);
  const rows=await page.evaluate(child=>JSON.parse(localStorage.getItem(`sfz-english-evidence-v1:${child}`)??'[]'),child);
  expect(rows.find((row:any)=>row.taskId==='expression:stage-0')).toMatchObject({source:'check',level:'supported'});
  await page.screenshot({path:'tmp/course-ai/english-pad.png'});
});

test('英文教材跟读窗读错可重试，通过后能重新打开继续读',async({page})=>{
  const id='friends-a';
  await seed(page,{[`sfz-english-g3a-flow-v6:${child}:${id}`]:{phase:1,unlocked:1}});
  await page.goto(`/#/english-course/${id}`);let calls=0;
  await mockCourseAI(page,()=>{calls++;return {status:503};});
  await page.getByRole('tab',{name:'互动练习',exact:true}).click();
  const line=page.locator('.en-source-item:visible').first();
  await line.click();const dialog=page.getByRole('dialog',{name:/跟读：/});
  await expect(dialog.locator('input[type=file]')).toHaveCount(0);
  await expect(dialog.getByRole('button',{name:'我已跟读',exact:true})).toHaveCount(0);
  await sayReading(page,dialog,'this is unrelated');
  await expect(dialog.getByRole('status')).toContainText('识别结果未匹配');
  await sayReading(page,dialog);await expect(dialog).toHaveCount(0);
  await line.click();await expect(dialog).toBeVisible();
  await expect(dialog.locator('.en-player-title')).toHaveText(/\S+/);
  await sayReading(page,dialog);await expect(dialog).toHaveCount(0);
  const rows=await page.evaluate(child=>JSON.parse(localStorage.getItem(`sfz-english-evidence-v1:${child}`)??'[]'),child);
  expect(rows.some((row:any)=>row.taskId.startsWith('repeat:')&&row.source==='check')).toBe(true);
  expect(calls).toBe(0);
});

test('AI 服务失败可重试，英语表达不会凭孩子声明完成',async({page})=>{
  await openEnglish(page); await mockCourseAI(page,()=>({status:503}));
  const practice=page.getByRole('region',{name:'分层表达练习'});
  await sayReading(page,practice);
  await expect(practice).toHaveAttribute('data-english-narration-key','expression:1');
  await answerCourseTask(practice,'audio');
  await expect(practice.getByRole('status')).toContainText('AI 服务暂时不可用');
  await expect(practice.getByRole('button',{name:'自己说',exact:true})).toBeDisabled();
  await expect(practice.getByRole('button',{name:'请 AI 确认',exact:true})).toHaveCount(0);
  await expect(practice.getByRole('button',{name:'再试一次',exact:true})).toBeEnabled();
  const rows=await page.evaluate(child=>JSON.parse(localStorage.getItem(`sfz-english-evidence-v1:${child}`)??'[]'),child);
  expect(rows.some((row:any)=>row.taskId==='expression:stage-1')).toBe(false);
});

test('语文屏幕书写自动检查，无照片、大模型或手动确认，重做保留完成进度',async({page})=>{
  await openChineseWriting(page,true); let calls=0;
  await mockCourseAI(page,()=>{calls++;return {status:503};});
  const writing=page.getByRole('region',{name:'屏幕书写实践'});
  await expect(writing.locator('input[type=file]')).toHaveCount(0);
  await expect(writing.getByRole('button',{name:'请 AI 确认',exact:true})).toHaveCount(0);
  const first=getChineseTextbookStudy('rhyme-song')!.writing![0].char;
  await drawInk(page,writing.locator('.screen-hanzi-pad svg'),[{x:20,y:20},{x:280,y:280}],300,300);
  await expect(writing.getByRole('status')).toContainText('这一笔再试试');
  await expect(writing.getByRole('heading')).toContainText('1/');
  await page.screenshot({path:'tmp/course-ai/chinese-pad.png'});
  await writeHanzi(page,writing,first);
  await expect(writing.getByRole('heading')).toContainText('2/');
  expect(calls).toBe(0);
  expect(await page.evaluate(child=>JSON.parse(localStorage.getItem(`sfz-chinese-practice-v1:${child}:rhyme-song:lesson:paper-writing:writingIndex:0`)!),child)).toBe(getChineseTextbookStudy('rhyme-song')!.writing!.length);
  const rows=await page.evaluate(child=>JSON.parse(localStorage.getItem(`sfz-chinese-evidence-v1:${child}`)??'[]'),child);
  expect(rows.find((row:any)=>row.skill==='writing')).toMatchObject({source:'check',level:'supported'});
});

test('数学理由输入后自动由 AI 判断，通过后直接进入知识延伸',async({page})=>{
  const id='plus-nine';
  await seed(page,{[`sfz-math-flow-v4:${child}:#/math-course/${id}`]:{contentVersion:4,phase:2,unlocked:3,actionDone:true}});
  await page.goto(`/#/math-course/${id}`); await mockCourseAI(page);
  await page.getByRole('tab',{name:/说出理由/}).click();
  const reason=page.getByRole('region',{name:'用自己的方式讲理由'});
  await expect(reason.getByRole('textbox')).toHaveCount(1);
  await expect(reason.getByRole('button',{name:'请 AI 确认',exact:true})).toHaveCount(0);
  await reason.getByRole('textbox',{name:'我的数学理由',exact:true}).fill('从3里面拿出1给9凑成10，还剩2，所以9加3等于12。');
  await expect(page.getByRole('tab',{name:/知识延伸/})).toHaveAttribute('aria-selected','true');
  await expect(reason.locator('.math-reason-check')).toHaveCount(0);
  const rows=await page.evaluate(child=>JSON.parse(localStorage.getItem(`sfz-math-evidence-v1:${child}`)??'[]'),child);
  expect(rows.find((row:any)=>row.taskId==='reason-expression')).toMatchObject({source:'ai',level:'independent'});
});

test('英语复习不靠回忆声明，口述自动核对目标词句',async({page})=>{
  await seed(page,{}); await mockCourseAI(page);
  await page.goto('/#/subject/english');
  // Mount the real review component through a Vite test harness, retaining the app store and API path.
  await page.evaluate(async()=>{
    const React=await import('/node_modules/.vite/deps/react.js');
    const DOM=await import('/node_modules/.vite/deps/react-dom_client.js');
    const {default:Review}=await import('/src/pages/EnglishReviewPractice.tsx');
    const host=document.createElement('div');host.id='review-test';document.body.replaceChildren(host);
    DOM.default.createRoot(host).render(React.default.createElement(Review,{lessonId:'friends-opening',onDone:()=>{}}));
  });
  const review=page.getByRole('region',{name:'英语主动回忆复习'});
  await expect(review.getByRole('button',{name:'我试着说出来了',exact:true})).toHaveCount(0);
  await expect(review.getByRole('button',{name:'回想下一项',exact:true})).toBeDisabled();
  await sayReading(page,review);
  await expect(review.getByRole('button',{name:'回想下一项',exact:true})).toBeEnabled();
});

test('语文课文跟读自动核对内容，不上传文件或人工声明',async({page})=>{
  const id='rhyme-song';
  await seed(page,{[`sfz-chinese-flow-v1:${child}:${id}`]:{phase:1,unlocked:2}});
  await page.goto(`/#/chinese-course/${id}`);await mockCourseAI(page);
  await page.locator('.ct-read-follow').first().click();
  const dialog=page.getByRole('dialog',{name:/跟读：/});
  await expect(dialog.getByRole('button',{name:'我已线下读过，记录练习',exact:true})).toHaveCount(0);
  await expect(dialog.locator('input[type=file]')).toHaveCount(0);
  await sayReading(page,dialog);await expect(dialog).toHaveCount(0);
  await expect(page.locator('.ct-read-follow').first()).toHaveClass(/followed/);
  await page.locator('.ct-read-follow').first().click();
  await sayReading(page,dialog,'没有读目标内容');
  await expect(dialog.getByRole('status')).toContainText('再读一次');
  await expect(page.locator('.ct-read-follow').first()).toHaveClass(/followed/);
  await sayReading(page,dialog);await expect(dialog).toHaveCount(0);
});

test('四线格松手后保留笔迹，重写错笔不清除已写对的笔画',async({page})=>{
  const id='friends-letters';
  await seed(page,{[`sfz-english-g3a-flow-v6:${child}:${id}`]:{phase:1,unlocked:2}});
  await page.goto(`/#/english-course/${id}`);
  await expect(page.locator('.boot-splash')).toBeHidden({timeout:20000});
  await page.getByRole('tab',{name:/规范书写/}).click();
  await page.getByRole('tab',{name:/动手书写/}).click();
  const writing=page.getByRole('region',{name:'书写实验室'}), pad=writing.locator('.screen-letter-pad');
  const strokes=letterStrokePaths('A').map(path=>resampleInk(strokePathPoints(path)));
  const visibleInk=pad.locator('polyline.writing-child-ink:not([points=""])');
  await drawInk(page,pad,[...strokes[0]].reverse());
  await expect(visibleInk).toHaveCount(1);
  await expect(pad.locator('.writing-retry-ink')).toHaveCount(1);
  await expect(writing.getByRole('status')).toContainText('笔迹已保留');
  await expect(writing.getByText('自己写 · 0/3 笔',{exact:true})).toBeVisible();
  await drawInk(page,pad,strokes[0]);
  await expect(visibleInk).toHaveCount(1);
  await expect(pad.locator('.writing-retry-ink')).toHaveCount(0);
  await expect(writing.getByText('自己写 · 1/3 笔',{exact:true})).toBeVisible();
  const acceptedPoints=await visibleInk.first().getAttribute('points');
  await drawInk(page,pad,[...strokes[1]].reverse());
  await expect(visibleInk).toHaveCount(2);
  await expect(writing.getByText('自己写 · 1/3 笔',{exact:true})).toBeVisible();
  await page.screenshot({path:'tmp/course-ai/letter-ink-retained-1024.png'});
  await page.setViewportSize({width:1366,height:1024});
  await expect(visibleInk).toHaveCount(2);
  await page.screenshot({path:'tmp/course-ai/letter-ink-retained-1366.png'});
  await writing.getByRole('button',{name:'重写这一笔',exact:true}).click();
  await expect(visibleInk).toHaveCount(1);
  await expect(visibleInk.first()).toHaveAttribute('points',acceptedPoints!);
  // A real touch interruption must retain the partial stroke as well.
  const box=(await pad.boundingBox())!, touch=await page.context().newCDPSession(page);
  const screen=(point:{x:number;y:number})=>({x:box.x+point.x*box.width/210,y:box.y+point.y*box.height/200,id:7});
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[screen(strokes[1][0])]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[screen(strokes[1][10])]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await expect(writing.getByRole('status')).toContainText('落笔中断，笔迹已保留');
  await expect(visibleInk).toHaveCount(2);
  await expect(writing.getByText('自己写 · 1/3 笔',{exact:true})).toBeVisible();
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[screen(strokes[1][0])]});
  for(const point of strokes[1].slice(1))await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[screen(point)]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(writing.getByText('自己写 · 2/3 笔',{exact:true})).toBeVisible();
  await expect(pad.locator('.writing-retry-ink')).toHaveCount(0);
  await expect(visibleInk).toHaveCount(2);
  await touch.detach();
  await drawInk(page,pad,strokes[2]);
  await expect(writing.getByRole('status')).toContainText('自动检查通过');
  await expect(visibleInk).toHaveCount(3);
  const saved=await page.evaluate(({child,id})=>JSON.parse(localStorage.getItem(`sfz-english-practice-v1:${child}:${id}:writing:screen-letters`)!),{child,id});
  expect(saved.checked).toEqual(['A']);
  await writing.getByRole('button',{name:'清空，重新写',exact:true}).click();
  await expect(visibleInk).toHaveCount(0);
  await expect(writing.locator('.en-screen-letter-tabs button').first()).toHaveText('✓ A');
});

test('英语大小写全部逐笔通过才完成书写，清空可重做且无需 AI 接口',async({page})=>{
  test.setTimeout(90_000);
  const id='friends-letters';let calls=0;
  await seed(page,{[`sfz-english-g3a-flow-v6:${child}:${id}`]:{phase:1,unlocked:2}});
  await page.goto(`/#/english-course/${id}`);await mockCourseAI(page,()=>{calls++;return {status:503};});
  await page.getByRole('tab',{name:/规范书写/}).click();
  const rules=page.locator('.en-writing-rules-task:visible');
  await expect(rules.locator('.en-four-line-rules article')).toHaveCount(4);
  await expect(rules.locator('textarea,.automatic-course-check,.en-writing-rules-answer')).toHaveCount(0);
  await page.getByRole('tab',{name:/动手书写/}).click();
  const writing=page.getByRole('region',{name:'书写实验室'});
  const tabs=writing.locator('.en-screen-letter-tabs button');const letters=await tabs.allTextContents();
  const first=letters[0].trim();
  await drawInk(page,writing.locator('.screen-letter-pad'),resampleInk(strokePathPoints(letterStrokePaths(first)[0])).reverse());
  await expect(writing.getByRole('status')).toContainText('第 1 笔还需要调整');
  await expect(page.getByRole('tab',{name:/规范书写/})).not.toHaveClass(/done/);
  for(let i=0;i<letters.length;i++){
    await tabs.nth(i).click();await writeLetter(page,writing,letters[i].trim());
    if(i<letters.length-1)await expect(page.getByRole('tab',{name:/规范书写/})).not.toHaveClass(/done/);
  }
  await expect(page.getByRole('tab',{name:/规范书写/})).toHaveClass(/done/);
  const saved=await page.evaluate(({child,id})=>JSON.parse(localStorage.getItem(`sfz-english-practice-v1:${child}:${id}:writing:screen-letters`)!),{child,id});
  expect(saved.checked.length).toBe(letters.length);expect(calls).toBe(0);
  await writing.getByRole('button',{name:'清空，重新写'}).click();
  await expect(writing.getByRole('status')).toContainText('已清空');
  await expect(page.getByRole('tab',{name:/规范书写/})).toHaveClass(/done/);
  // Restored listening progress depends on phonics and real writing, not the removed spoken rules answer.
  await page.evaluate(({child,id,count})=>{
    const key=`sfz-english-g3a-flow-v6:${child}:${id}`;
    const flow=JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key,JSON.stringify({...flow,seen:Array.from({length:count},(_,index)=>`letter-${index}`)}));
    localStorage.setItem(`sfz-english-practice-v1:${child}:${id}:phonics:lesson`,JSON.stringify({done:true,stage:2,unlocked:2}));
  },{child,id,count:letters.length/2});
  await page.reload();
  await expect(page.getByRole('button',{name:/听读原课/})).toHaveClass(/done/);
  expect(await page.evaluate(({child,id})=>localStorage.getItem(`sfz-english-practice-v1:${child}:${id}:source:writing-rules`),{child,id})).toBeNull();
  expect(calls).toBe(0);
  await page.screenshot({path:'tmp/course-ai/english-writing-pad.png'});
});

test('拼音屏幕逐笔检查占格，已有教材完成记录保留',async({page})=>{
  const id='pinyin-a-o-e',prefix=`sfz-chinese-practice-v1:${child}:${id}:`;
  await seed(page,{[`sfz-chinese-flow-v1:${child}:${id}`]:{phase:2,unlocked:3},[prefix+'studyDone']:true});
  await page.goto(`/#/chinese-course/${id}`);await page.getByRole('tab',{name:/屏幕书写/}).click();
  const writing=page.getByRole('tabpanel').filter({has:page.getByRole('heading',{name:'在四线三格中写拼音字母'})});
  const pad=writing.locator('.screen-letter-pad');
  await drawInk(page,pad,resampleInk(strokePathPoints(letterStrokePaths('a')[0])).map(point=>({...point,y:point.y+40})));
  await expect(writing.getByRole('status')).toContainText('第 1 笔还需要调整');
  await writeLetter(page,writing,'a');
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),prefix+'pinyinScreenWriting')).toContain('a');
  await expect(page.getByRole('button',{name:/教材练习/})).toHaveClass(/done/);
  await page.screenshot({path:'tmp/course-ai/pinyin-writing-pad.png'});
});

test('英语单元目标由 AI 检查实际表达，取消自评勾选',async({page})=>{
  const id='numbers-project';const draft={name:'Amy',age:'8',time:'6 p.m.',greeting:'Happy birthday!',rows:[],paper:false,presented:true};
  await seed(page,{[`sfz-english-g3a-flow-v6:${child}:${id}`]:{phase:2,unlocked:2},[`sfz-english-practice-v1:${child}:${id}:project`]:draft});
  await page.goto(`/#/english-course/${id}`);await mockCourseAI(page);
  await page.getByRole('tab',{name:/教材任务 2/}).click();
  await page.getByRole('tab',{name:/单元表达/}).click();
  const check=page.locator('.en-project-self-check');
  await expect(check.getByRole('checkbox')).toHaveCount(0);
  await expect(check.locator('input[type=file]')).toHaveCount(0);
  await answerCourseTask(check,'audio');
  await expect(check.getByText('✓ 完成了',{exact:true})).toBeVisible();
  expect(await page.evaluate(({child,id})=>JSON.parse(localStorage.getItem(`sfz-english-practice-v1:${child}:${id}:project-ai-unit`)!),{child,id})).toMatchObject({done:true});
});

// A stale aggregate flag alone must not certify unfinished current tasks.
test('只有旧教材汇总标记时，不跳过未完成的实际检查',async({page})=>{
  const id='heaven-earth-human';
  await seed(page,{[`sfz-chinese-flow-v1:${child}:${id}`]:{phase:2,unlocked:2},[`sfz-chinese-practice-v1:${child}:${id}:studyDone`]:true});
  await page.goto(`/#/chinese-course/${id}`);
  await expect(page.getByRole('button',{name:/真实表达/})).toBeDisabled();
});

async function openShortWord(page: Page, unit = 'friends') {
  const entries: Record<string, unknown> = {};
  for (const id of ['friends','families','animals','plants','colours','numbers'].map(unit => `${unit}-letters`)) {
    entries[`sfz-english-g3a-flow-v6:${child}:${id}`] = {phase:1,unlocked:1};
    entries[`sfz-english-practice-v1:${child}:${id}:phonics:lesson`] = {stage:2,unlocked:2,done:false,supported:false};
  }
  await seed(page, entries);
  await page.goto(`/#/english-course/${unit}-letters`);
  await page.getByRole('tab',{name:'互动练习',exact:true}).click();
  await page.getByRole('tab',{name:'声音与拼读',exact:true}).click();
  return page.getByRole('region',{name:'声音到拼读练习'}).locator('.speech-reading-check');
}
async function blendEvidence(page: Page, unit='friends') {
  return page.evaluate(({child,unit}) => (JSON.parse(localStorage.getItem(`sfz-english-evidence-v1:${child}`)??'[]') as any[]).find(row=>row.lessonId===`${unit}-letters`&&row.taskId==='phonics:blend'), {child,unit});
}

test('本地英语识别覆盖六单元，送真实录音格式，不发送目标答案或调用课程大模型',async({page})=>{
  let calls=0;const requests: any[]=[];
  page.on('request',request=>{
    if(request.url().includes('/api/course/assess'))calls++;
    if(request.url().includes('/api/reading-asr/transcribe'))requests.push(request.postDataJSON());
  });
  let check=await openShortWord(page);
  for (const [unit,word] of [['friends','dad'],['families','beg'],['animals','bib'],['plants','mop'],['colours','rug'],['numbers','wax']]) {
    if(unit!=='friends') {
      await page.goto(`/#/english-course/${unit}-letters`);
      await page.getByRole('tab',{name:'互动练习',exact:true}).click();
      await page.getByRole('tab',{name:'声音与拼读',exact:true}).click();
      check=page.getByRole('region',{name:'声音到拼读练习'}).locator('.speech-reading-check');
    }
    await sayReading(page,check,word);
    await expect.poll(()=>blendEvidence(page,unit)).toMatchObject({source:'check',level:'independent'});
  }
  expect(calls).toBe(0);expect(requests).toHaveLength(6);
  for(const request of requests) {
    expect(Object.keys(request).sort()).toEqual(['audio','language']);expect(request.language).toBe('en-US');
    const wav=Buffer.from(request.audio,'base64');expect(wav.toString('ascii',0,4)).toBe('RIFF');expect(wav.readUInt32LE(24)).toBe(16000);
  }
  expect(await page.evaluate(()=>(window as any).__courseAsr)).toBeUndefined();
});

test('本地英语识别错词不通过，回听保留真实原文，Pad 无滚动，重试清除旧录音',async({page})=>{
  const check=await openShortWord(page);
  await sayReading(page,check,'better');
  await expect(check.getByRole('status')).toContainText('识别结果与目标不同');expect(await blendEvidence(page)).toBeUndefined();
  await check.getByText('检查收音',{exact:true}).click();
  await expect(check.locator('.reading-capture-details')).toContainText('服务原文：better（本地英语识别）');
  await expect(check.locator('.reading-capture-details')).toContainText('测试麦克风');
  expect(await check.locator('audio').getAttribute('src')).toMatch(/^blob:/);
  expect(await page.evaluate(()=>(window as any).__courseMicTrack.readyState)).toBe('ended');
  await check.getByRole('button',{name:'回听本次录音',exact:true}).click();
  // The recorded fixture is 0.1s; it can finish before a button-state assertion.
  await expect.poll(()=>check.locator('audio').evaluate((audio:HTMLAudioElement)=>audio.currentTime>0||audio.ended)).toBe(true);
  expect(await page.evaluate(()=>({x:document.documentElement.scrollWidth>innerWidth,y:document.documentElement.scrollHeight>innerHeight}))).toEqual({x:false,y:false});
  await page.screenshot({path:'tmp/course-ai/local-reading-diagnostics-pad.png'});
  await sayReading(page,check,'dad');
  await expect.poll(()=>blendEvidence(page)).toMatchObject({source:'check',level:'independent'});
});

test('本地英语空识别和服务故障不通过，短句核对完整内容',async({page})=>{
  const check=await openShortWord(page);
  await sayReading(page,check,'');await expect(check.getByRole('status')).toContainText('没有识别出文字');
  expect(await blendEvidence(page)).toBeUndefined();
  await check.getByRole('button',{name:'放进短句再读',exact:true}).click();
  await expect(check.locator('.reading-context-sentence')).toHaveText('This is my dad.');
  await page.evaluate(()=>{(window as any).__localReadingError='英语识别服务未就绪';});
  await sayReading(page,check);await expect(check.getByRole('status')).toContainText('英语识别服务未就绪');
  expect(await blendEvidence(page)).toBeUndefined();
  await page.evaluate(()=>{delete (window as any).__localReadingError;});
  await sayReading(page,check,'my dad');await expect(check.getByRole('status')).toContainText('识别结果与目标不同');
  expect(await blendEvidence(page)).toBeUndefined();
  await sayReading(page,check,'This is my dad.');await expect.poll(()=>blendEvidence(page)).toMatchObject({source:'check',level:'supported'});
});

test('本地英语麦克风未就绪时不让孩子开口，拒绝和启动超时能重试',async({page})=>{
  const check=await openShortWord(page);
  await page.evaluate(()=>{
    const w=window as any;w.__originalMic=navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('denied','NotAllowedError');};
  });
  await check.getByRole('button',{name:'开始读，自动检查',exact:true}).click();
  await expect(check.getByRole('status')).toContainText('请允许麦克风');expect(await blendEvidence(page)).toBeUndefined();
  await page.clock.install();
  await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=()=>new Promise(()=>{});});
  await check.getByRole('button',{name:'开始读，自动检查',exact:true}).click();
  await expect(check.getByRole('button',{name:'正在准备麦克风…',exact:true})).toBeDisabled();
  await page.clock.fastForward(13000);await expect(check.getByRole('status')).toContainText('麦克风启动超时');
  expect(await blendEvidence(page)).toBeUndefined();
  await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=(window as any).__originalMic;});
  await sayReading(page,check,'dad');await expect.poll(()=>blendEvidence(page)).toMatchObject({source:'check',level:'independent'});
});

test('本地英语录音期间暂停教材原声，隐藏时取消收音',async({page})=>{
  const check=await openShortWord(page);
  await page.getByRole('tab',{name:'教材听读',exact:true}).click();
  const original=page.locator('[data-recording-key="friends-letters-sounds"] audio');
  await page.getByRole('button',{name:'播放Unit 1 A Listen, repeat and chant.教材原声',exact:true}).click();
  await page.getByRole('tab',{name:'互动练习',exact:true}).click();
  await original.evaluate((audio:HTMLAudioElement)=>audio.play());
  await check.getByRole('button',{name:'开始读，自动检查',exact:true}).click();
  expect(await original.evaluate((audio:HTMLAudioElement)=>audio.paused)).toBe(true);
  await page.getByRole('tab',{name:'教材听读',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).__courseMicTrack.readyState)).toBe('ended');
  expect(await blendEvidence(page)).toBeUndefined();
});
