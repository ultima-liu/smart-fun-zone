import {test,expect,type Page} from '@playwright/test';
import {getEnglishTeaching} from '../src/content/englishTeaching';
import {getEnglishG3Unit} from '../src/content/englishGrade3Upper';
import {getEnglishG3StoryBoard} from '../src/content/englishG3Stories';
const child='english-classroom-child';
test.beforeEach(async({page})=>{await page.addInitScript(child=>{if(sessionStorage.getItem('english-classroom'))return;sessionStorage.setItem('english-classroom','1');localStorage.setItem('smart-fun-zone',JSON.stringify({version:6,state:{lang:'zh',theme:'light',sound:false,voiceOn:false,musicOn:false,profiles:[{id:child,name:'英语体验生',ageBand:'g3',avatar:'🐼',createdAt:Date.now()}],activeChildId:child,records:[],mastery:{},lessonProgress:{},charBag:{},wrongs:{},points:{},pointLog:{},parentPin:'1234',dailyLimitMin:0,buddyOpen:false,buddyWakeOn:false}}));},child);});
async function open(page:Page,id:string,phase:number,extra:Record<string,unknown>={},practice:Record<string,unknown>={}){await page.addInitScript(({child,id,phase,extra,practice})=>{if(!localStorage.getItem(`sfz-english-g3a-flow-v6:${child}:${id}`))localStorage.setItem(`sfz-english-g3a-flow-v6:${child}:${id}`,JSON.stringify({phase,unlocked:4,...extra}));for(const [key,value]of Object.entries(practice))localStorage.setItem(`sfz-english-practice-v1:${child}:${id}:${key}`,JSON.stringify(value));},{child,id,phase,extra,practice});await page.goto(`/#/english-course/${id}`);await expect(page.locator('.en-classroom')).toBeVisible({timeout:20000});await expect(page.locator('.boot-splash')).toBeHidden({timeout:20000});}
const phase=(page:Page,index:number)=>page.locator('.en-phase-nav button').nth(index);
test('认字母先读字母名，再读英文例词和中文释义，例词可单独点读及跟读',async({page})=>{
 const played=()=>page.evaluate(()=>((window as any).__letterReads as {text:string;speaker:string}[]));
 await page.addInitScript(()=>{
   const w=window as any;w.__VOLC_TTS_ENABLED__=true;
   const data=JSON.parse(localStorage.getItem('smart-fun-zone')!);data.state.sound=true;data.state.voiceOn=true;localStorage.setItem('smart-fun-zone',JSON.stringify(data));
   w.__letterReads=[];
   w.Audio=function(src:string){const audio:any={};audio.play=async()=>{w.__letterReads.push(await fetch(src).then(r=>r.json()));w.__letterPendingAudio=audio;if(!w.__letterHold)setTimeout(()=>audio.onended?.(new Event('ended')),0);};audio.pause=()=>{};return audio;};
 });
 await page.route('**/api/**',route=>{
   if(route.request().url().includes('/volc-tts/')){
     const params=route.request().postDataJSON().req_params;
     const payload=Buffer.from(JSON.stringify({text:params.text.replace(/[。；]/g,'').trim(),speaker:params.speaker})).toString('base64');
     return route.fulfill({contentType:'text/event-stream',body:`data: ${JSON.stringify({code:0,data:payload})}\n\n`});
   }
   return route.fulfill({json:{ok:true,ttsConfigured:true}});
 });
 await open(page,'friends-letters',1,{seen:['letter-0']});
 const recognition=page.locator('.en-letter-recognition');
 await expect(recognition.locator('.en-letter-study-card')).toHaveCount(4);
 await expect(recognition.locator('.en-letter-study-card').first()).toHaveClass(/seen/);
 await recognition.locator('h3').click();
 await expect.poll(async()=>(await played()).some(r=>r.text==='难过的')).toBe(true);
 let reads=await played();
 expect(reads.slice(0,6).map(r=>r.text)).toEqual(['字母名','Letter A','例词','apple','苹果','bag']);
 expect(reads[6].text).toMatch(/^书包/); // Adjacent Chinese meaning and the next card's heading share one voice segment.
 expect(reads[1].speaker).toContain('en_');expect(reads[3].speaker).toContain('en_');expect(reads[4].speaker).toContain('zh_');
 await page.evaluate(()=>{(window as any).__letterReads=[];});
 await recognition.getByRole('button',{name:'点读字母 B 和例词',exact:true}).click();
 await expect.poll(async()=>(await played()).some(r=>r.text.includes('鲍勃'))).toBe(true);reads=await played();
 expect(reads.map(r=>r.text)).toEqual(['字母名','Letter B','例词','bed','床','Bob','鲍勃（人名）']);
 await expect(page.getByRole('dialog',{name:/跟读/})).toHaveCount(0);
 await expect(recognition.locator('[aria-label="认字母 B"]')).toHaveClass(/seen/);
 await page.evaluate(()=>{(window as any).__letterReads=[];});
 const can=recognition.getByRole('button',{name:'点读 can，会；能',exact:true});
 await expect(can.locator('img,.en-word-art-frame')).toHaveCount(0);
 await expect(recognition.getByRole('button',{name:'点读 cat，猫',exact:true}).locator('.en-word-art-frame')).toHaveCount(1);
 await can.click();await expect.poll(async()=>(await played()).length).toBe(2);reads=await played();
 expect(reads.map(r=>r.text)).toEqual(['can','会能']);expect(reads[0].speaker).toContain('en_');expect(reads[1].speaker).toContain('zh_');
 await recognition.getByRole('button',{name:'跟读 can',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'跟读：can',exact:true})).toBeVisible();
 await expect(page.getByRole('dialog',{name:'跟读：can',exact:true}).locator('img')).toHaveCount(0);
 await page.getByRole('button',{name:'关闭跟读',exact:true}).click();
 await recognition.getByRole('button',{name:'点读字母 C 和例词',exact:true}).click();
 await expect(recognition.locator('[aria-label="认字母 C"]')).toHaveClass(/seen/);
 await page.evaluate(()=>{(window as any).__letterHold=true;(window as any).__letterReads=[];});
 await recognition.getByRole('button',{name:'点读字母 D 和例词',exact:true}).click();
 await expect.poll(async()=>(await played()).length).toBe(1);
 await expect(recognition.locator('[aria-label="认字母 D"]')).not.toHaveClass(/seen/);
 await expect(page.getByRole('tab',{name:/认字母/,selected:true})).toBeVisible();
 await page.evaluate(()=>{const w=window as any;w.__letterHold=false;w.__letterPendingAudio.onended(new Event('ended'));});
 await expect(page.getByRole('tab',{name:/声音与拼读/,selected:true})).toBeVisible();
 expect((await played()).map(r=>r.text)).toContain('难过的');
});
test('认字母关闭声音时可查看全部材料并推进，刷新后保留完成状态',async({page})=>{
 await page.route('**/api/**',route=>route.fulfill({json:{ok:false,ttsConfigured:false}}));
 await open(page,'friends-letters',1);
 const recognition=page.locator('.en-letter-recognition');
 for(const letter of ['A','B','C','D']) await recognition.getByRole('button',{name:`点读字母 ${letter} 和例词`,exact:true}).click();
 await expect(page.getByRole('tab',{name:/声音与拼读/,selected:true})).toBeVisible();
 await page.reload();await page.getByRole('tab',{name:/认字母/}).click();
 await expect(recognition.locator('.en-letter-study-card.seen')).toHaveCount(4);
 await expect(recognition.getByRole('button',{name:'点读 can，会；能',exact:true})).toBeVisible();
});
test('辨音进页和重播只读要求，完整词点击后才播放且自然结束才开放答案',async({page})=>{
 const reads:string[]=[];
 await page.addInitScript(()=>{
   const w=window as any;
   w.__VOLC_TTS_ENABLED__=true;localStorage.setItem('sfz-english-g3a-flow-v6:english-classroom-child:friends-letters:1:tab:认字母|声音与拼读|规范书写|字母歌谣','1');
   const data=JSON.parse(localStorage.getItem('smart-fun-zone')!);data.state.sound=true;data.state.voiceOn=true;localStorage.setItem('smart-fun-zone',JSON.stringify(data));
   w.Audio=function(){
     const audio:any={};
     audio.play=async()=>{w.__phonicsAudio=audio;if(!w.__phonicsHold)setTimeout(()=>audio.onended?.(new Event('ended')),0);};
     audio.pause=()=>{};
     return audio;
   };
 });
 await page.route('**/api/**',route=>{
   if(route.request().url().includes('/volc-tts/')){
     reads.push(route.request().postDataJSON().req_params.text);
     return route.fulfill({contentType:'text/event-stream',body:'data: {"code":0,"data":"AA=="}\n\n'});
   }
   return route.fulfill({json:{ok:true,ttsConfigured:true}});
 });
 await open(page,'friends-letters',1);
 await page.getByRole('tab',{name:/声音与拼读/}).click();
 const phonics=page.getByLabel('声音到拼读练习');
 await expect.poll(()=>reads.some(text=>text.includes('比较开头的声音是否相同'))).toBe(true);
 await page.getByRole('button',{name:/再听一遍/}).click();
 await page.waitForTimeout(400);
 expect(reads.join(' ')).not.toMatch(/答案选项|选项\d|cat|can/i);
 await expect(phonics.getByRole('button',{name:'相同',exact:true})).toBeDisabled();
 await page.screenshot({path:'tmp/course-ai/phonics-listen-pad.png'});
 await page.evaluate(()=>{const w=window as any;w.__phonicsHold=true;w.__phonicsBeforeListen=w.__phonicsAudio;});
 await phonics.getByRole('button',{name:'听完整词',exact:true}).click();
 await expect.poll(()=>reads.some(text=>text==='cat. can')).toBe(true);
 await expect(phonics.getByRole('button',{name:'相同',exact:true})).toBeDisabled();
 await page.waitForFunction(()=>{const w=window as any;return w.__phonicsAudio && w.__phonicsAudio!==w.__phonicsBeforeListen;});
 await page.evaluate(()=>{(window as any).__phonicsStale=(window as any).__phonicsAudio;});
 await phonics.getByRole('button',{name:'停止播放',exact:true}).click();
 await page.evaluate(()=>{(window as any).__phonicsStale.onended(new Event('ended'));});
 await expect(phonics.getByRole('button',{name:'相同',exact:true})).toBeDisabled();
 await phonics.getByRole('button',{name:'听完整词',exact:true}).click();
 await page.waitForFunction(()=>(window as any).__phonicsAudio!==(window as any).__phonicsStale);
 await page.evaluate(()=>{const w=window as any;w.__phonicsAudio.onended(new Event('ended'));w.__phonicsHold=false;});
 await expect(phonics.getByRole('button',{name:'相同',exact:true})).toBeEnabled();
 await phonics.getByRole('button',{name:'相同',exact:true}).click();
 await expect(phonics).toHaveAttribute('data-english-narration-key','phonics:1');
 await expect(phonics.locator('.en-phonics-choices button').first()).toBeDisabled();
 await page.waitForTimeout(400);
 expect(reads.join(' ')).not.toMatch(/答案选项|选项\d/);
 await page.screenshot({path:'tmp/course-ai/phonics-letter-pad.png'});
 await phonics.getByRole('button',{name:'听完整词',exact:true}).click();
 await expect(phonics.getByRole('button',{name:'c',exact:true})).toBeEnabled();
 await phonics.getByRole('button',{name:'c',exact:true}).click();
 await expect(phonics).toHaveAttribute('data-english-narration-key','phonics:2');
 await page.screenshot({path:'tmp/course-ai/phonics-novel-pad.png'});
});
test('辨音播放失败不会开放答案，看词练习保留为明确的辅助入口',async({page})=>{
 await page.addInitScript(()=>{
  const w=window as any;w.__VOLC_TTS_ENABLED__=true;localStorage.setItem('sfz-english-g3a-flow-v6:english-classroom-child:friends-letters:1:tab:认字母|声音与拼读|规范书写|字母歌谣','1');
  const data=JSON.parse(localStorage.getItem('smart-fun-zone')!);data.state.sound=true;data.state.voiceOn=true;localStorage.setItem('smart-fun-zone',JSON.stringify(data));
 });
 await page.route('**/api/**',route=>route.request().url().includes('/volc-tts/')?route.fulfill({status:503,body:'暂时不可用'}):route.fulfill({json:{ok:true,ttsConfigured:true}}));
 await open(page,'friends-letters',1);
 await page.getByRole('tab',{name:/声音与拼读/}).click();
 const phonics=page.getByLabel('声音到拼读练习');
 await phonics.getByRole('button',{name:'听完整词',exact:true}).click();
 await expect(phonics.getByRole('status')).toContainText('没有成功播放');
 await expect(phonics.locator('.en-phonics-choices button').first()).toBeDisabled();
 await phonics.getByRole('button',{name:'先看词练习',exact:true}).click();
 await expect(phonics.locator('.en-phonics-reading')).toHaveText('cat. can');
 await expect(phonics.locator('.en-phonics-choices button').first()).toBeEnabled();
});
async function sourceRead(page:Page){for(const button of await page.locator('.en-source-item:visible').all()){await button.click();const close=page.getByRole('button',{name:'关闭跟读',exact:true});if(await close.isVisible())await close.click({timeout:1500}).catch(async error=>{if(await close.isVisible())throw error;});}}
test('目录直接选单元，课文划动，返回与刷新保留单元',async({page})=>{await page.goto('/#/subject/english');await expect(page.locator('.en-unit-buttons button')).toHaveCount(7);await expect(page.locator('.catalog-guide,.catalog-unit-select,.content-pager')).toHaveCount(0);await page.locator('.en-unit-buttons button').nth(4).click();await page.locator('.en-lesson-swipe').hover();await page.mouse.wheel(0,500);await expect.poll(()=>page.locator('.en-lesson-swipe').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);await page.locator('.en-lesson-card').last().click();await page.getByRole('button',{name:'返回英语目录',exact:true}).click();await expect(page.locator('.en-unit-buttons button').nth(4)).toHaveAttribute('aria-pressed','true');await page.reload();await expect(page.locator('.en-unit-buttons button').nth(4)).toHaveAttribute('aria-pressed','true');});
test('听读只完成第一个教材任务不能跳阶段，全部完成才自动进入练习',async({page})=>{await open(page,'friends-a',1);await sourceRead(page);await expect(page.getByRole('tab',{name:/教材任务 2/,selected:true})).toBeVisible();await expect(phase(page,1)).toHaveClass(/active/);for(let i=1;i<getEnglishG3Unit('friends')!.a.blocks.length;i++){await sourceRead(page);if(i===2){await expect(page.getByRole('tab',{name:/词与短句/,selected:true})).toBeVisible();await sourceRead(page);}if(i<3)await expect(page.getByRole('tab',{name:new RegExp(`教材任务 ${i+2}`),selected:true})).toBeVisible();}await expect(phase(page,2)).toHaveClass(/active/);await phase(page,1).click();await page.waitForTimeout(1200);await expect(phase(page,1)).toHaveClass(/active/);await expect(page.locator('.en-stage-next,.activity-journey,.ct-teacher-play,.en-lesson-footer')).toHaveCount(0);});
test('故事每幕先听读再找线索，子任务不被总完成标记跳过',async({page})=>{await open(page,'friends-story',1,{sourceActivityDone:true});const board=getEnglishG3StoryBoard('friends')!;for(let i=0;i<board.scenes.length;i++){await sourceRead(page);await expect(page.getByRole('tab',{name:/找线索/,selected:true})).toBeVisible();await page.locator('.en-quiz:visible').getByRole('button',{name:board.scenes[i].clue.answer,exact:true}).click();if(i<board.scenes.length-1){await expect(page.getByRole('tab',{name:new RegExp(`第 ${i+2} 幕`),selected:true})).toBeVisible();await expect(phase(page,1)).toHaveClass(/active/);}}await expect(phase(page,2)).toHaveClass(/active/);});
test('表达按实际尝试自动推进三个层级，提示与自主表现分别记录',async({page})=>{await open(page,'friends-a',3);const region=page.getByLabel('分层表达练习');for(let i=0;i<2;i++){await expect(region).toHaveAttribute('data-english-narration-key',`expression:${i}`);await region.getByRole('button',{name:'我已经试着说过',exact:true}).click();}await expect(region).toHaveAttribute('data-english-narration-key','expression:2');await expect(region.locator('.en-expression-support')).toHaveCount(0);await region.getByRole('button',{name:'给我句子开头'}).click();await region.getByRole('button',{name:'我已经试着表达',exact:true}).click();await expect(phase(page,4)).toHaveClass(/active/);const evidence=await page.evaluate(child=>JSON.parse(localStorage.getItem(`sfz-english-evidence-v1:${child}`)??'[]'),child);expect(evidence.find((row:{taskId:string})=>row.taskId==='expression:transfer')).toMatchObject({source:'self',level:'practiced'});});
test('项目必须保存有效作品，再介绍；编辑作品会撤销介绍完成',async({page})=>{await open(page,'numbers-project',2,{operationPick:getEnglishTeaching('numbers-project').check.answer});await page.getByRole('tab',{name:/教材任务 2/}).click();const builder=page.getByLabel('生日邀请卡');await builder.getByLabel('对象／虚构名字').fill('Amy');await builder.getByLabel('Age · 年龄').fill('8');await builder.getByLabel('Party time · 聚会时间').fill('6 p.m.');await builder.getByRole('button',{name:'检查并保存作品',exact:true}).click();await expect(page.getByRole('tab',{name:/介绍作品/,selected:true})).toBeVisible();await expect(phase(page,2)).toHaveClass(/active/);await page.locator('.en-project-presentation:visible').getByRole('button',{name:'我已经试着表达',exact:true}).click();await expect(phase(page,3)).toHaveClass(/active/);await phase(page,2).click();await page.getByRole('tab',{name:/教材任务 2/}).click();await page.getByRole('tab',{name:/制作作品/}).click();await builder.getByLabel('Age · 年龄').fill('9');await expect(page.getByRole('tab',{name:/介绍作品/})).not.toHaveClass(/done/);});
test('拼读必须实际听词或看读，再判断，答对自动到下一子任务',async({page})=>{await open(page,'friends-letters',1);await page.getByRole('tab',{name:/声音与拼读/}).click();const phonics=page.getByLabel('声音到拼读练习');await expect(phonics.locator('.en-phonics-choices button').first()).toBeDisabled();await phonics.getByRole('button',{name:'先看词练习',exact:true}).click();await phonics.getByRole('button',{name:'相同',exact:true}).click();await expect(phonics).toHaveAttribute('data-english-narration-key','phonics:1');await phonics.getByRole('button',{name:'先看词练习',exact:true}).click();await phonics.locator('.en-phonics-choices').getByRole('button',{name:'c',exact:true}).click();await expect(phonics).toHaveAttribute('data-english-narration-key','phonics:2');await phonics.getByRole('button',{name:'我已经试着表达',exact:true}).click();await expect(page.getByRole('tab',{name:/规范书写/,selected:true})).toBeVisible();await expect(phase(page,1)).toHaveClass(/active/);});
test('恢复已完成任务不自动跳页，切换孩子和课文不串进度',async({page})=>{await open(page,'friends-a',2,{operationPick:getEnglishTeaching('friends-a').check.answer});await page.waitForTimeout(1300);await expect(phase(page,2)).toHaveClass(/active/);await phase(page,3).click();await page.reload();await expect(phase(page,3)).toHaveClass(/active/);await page.evaluate(async()=>{const modulePath='/src/store.ts';const {useStore}=await import(modulePath);useStore.getState().addProfile({id:'another-english-child',name:'第二位体验生',ageBand:'g3',avatar:'🐸',createdAt:Date.now()});useStore.getState().setActiveChild('another-english-child');});await expect(phase(page,0)).toHaveClass(/active/);await expect(phase(page,1)).toBeDisabled();await page.evaluate(async child=>{const modulePath='/src/store.ts';const {useStore}=await import(modulePath);useStore.getState().setActiveChild(child);},child);await expect(phase(page,3)).toHaveClass(/active/);await page.getByRole('button',{name:'返回英语目录',exact:true}).click();await page.locator('.en-lesson-card').first().click();await expect(phase(page,0)).toHaveClass(/active/);});
test('完成迁移挑战自动保存奖励并返回所属单元',async({page})=>{const id='friends-opening';await open(page,id,4,{operationPick:getEnglishTeaching(id).check.answer}, {'expression:lesson':{stage:2,unlocked:2,done:true}});const {getEnglishG3Extension}=await import('../src/content/englishG3Extensions');await page.locator('.en-quiz-options').getByRole('button',{name:getEnglishG3Extension(id)!.transfer.answer,exact:true}).click();await expect(page).toHaveURL(/subject\/english\?unit=friends/);const saved=await page.evaluate(({child,id})=>JSON.parse(localStorage.getItem(`sfz-english-g3a-flow-v6:${child}:${id}`)??'{}'),{child,id});expect(saved).toMatchObject({phase:4,stars:3});});
test('最子级自动读题及全部选项，中英分声，重绘不重读并可重播',async({page})=>{const reads:{text:string;speaker:string}[]=[];await page.route('**/api/**',route=>{if(route.request().url().includes('/volc-tts/')){const params=route.request().postDataJSON().req_params;reads.push({text:params.text,speaker:params.speaker});return route.fulfill({contentType:'text/event-stream',body:'data: {"code":20000000}\n\n'});}return route.fulfill({json:{ok:true,ttsConfigured:true}});});await page.addInitScript(()=>{(window as unknown as {__VOLC_TTS_ENABLED__:boolean}).__VOLC_TTS_ENABLED__=true;const store=JSON.parse(localStorage.getItem('smart-fun-zone')??'{}');store.state.sound=true;store.state.voiceOn=true;localStorage.setItem('smart-fun-zone',JSON.stringify(store));});await open(page,'friends-opening',2);await page.locator('.en-common-prompt > div').click();const options=await page.locator('.en-quiz-options button').allTextContents();await expect.poll(()=>options.every(option=>reads.some(read=>read.text.includes(option)))).toBe(true);const first=reads.map(read=>read.text).join(' ');expect(options.map(option=>first.indexOf(option))).toEqual(options.map(option=>first.indexOf(option)).sort((a,b)=>a-b));expect(new Set(reads.map(read=>read.speaker)).size).toBe(2);const count=reads.length;await page.setViewportSize({width:1100,height:768});await page.waitForTimeout(600);expect(reads).toHaveLength(count);await page.getByRole('button',{name:/再听一遍/}).click();await expect.poll(()=>reads.length).toBeGreaterThan(count);await page.getByRole('button',{name:'不懂就问',exact:true}).click();await expect(page.getByRole('dialog',{name:'不懂就问聪聪老师'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'不懂就问',exact:true})).toBeFocused();await page.getByRole('button',{name:'看教材原页',exact:true}).click();await expect(page.getByRole('dialog',{name:'教材原页',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'看教材原页',exact:true})).toBeFocused();});
