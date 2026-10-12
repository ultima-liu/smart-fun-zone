import {expect,test} from '@playwright/test';

const child='knowledge-narration-check',lesson='love-chinese';
test.use({viewport:{width:1024,height:768}});
for(const sound of [false,true])test(`知识桥${sound?'自动讲方法与图标重播':'关闭声音'}不作为答题完成门槛`,async({page})=>{
 const reads:string[]=[];
 await page.route('**/api/**',route=>{
  if(route.request().url().includes('/volc-tts/')){
   reads.push(route.request().postDataJSON().req_params.text);
   return route.fulfill({contentType:'text/event-stream',body:'data: {"code":20000000}\n\n'});
  }
  return route.fulfill({json:{ok:true,ttsConfigured:true}});
 });
 await page.addInitScript(({child,lesson,sound})=>{
  (window as unknown as {__VOLC_TTS_ENABLED__:boolean}).__VOLC_TTS_ENABLED__=true;
  localStorage.setItem('smart-fun-zone',JSON.stringify({version:8,state:{lang:'zh',theme:'light',sound,voiceOn:sound,musicOn:false,profiles:[{id:child,name:'体验生',ageBand:'g1',avatar:'🐼',createdAt:Date.now()}],activeChildId:child,records:[],mastery:{},lessonProgress:{},wrongs:{},points:{},pointLog:{},parentPin:'1234',dailyLimitMin:0,buddyOpen:false,buddyWakeOn:false}}));
  localStorage.setItem(`sfz-chinese-flow-v1:${child}:${lesson}`,JSON.stringify({phase:2,unlocked:3}));
 },{child,lesson,sound});
 const stored=(field:string)=>page.evaluate(({child,lesson,field})=>JSON.parse(localStorage.getItem(`sfz-chinese-practice-v1:${child}:${lesson}:${field}`)??'null'),{child,lesson,field});
 await page.goto(`/#/chinese-course/${lesson}`);await expect(page.locator('.boot-splash')).toBeHidden({timeout:20000});
 await page.getByRole('tab',{name:/知识桥/}).click();
 const bridge=page.locator(`[data-knowledge="${lesson}"]`),replay=bridge.getByRole('button',{name:'再听方法',exact:true});
 await expect(replay).toBeVisible();await expect(bridge.getByRole('button',{name:/听聪聪讲方法|已听方法/})).toHaveCount(0);
 if(sound){
  await expect.poll(()=>reads.filter(text=>text.includes('读写姿势会帮助眼和手')).length).toBe(1);
  const initial=reads.length;await bridge.locator('.ct-ktrail-head').click();await page.waitForTimeout(400);expect(reads).toHaveLength(initial);
  await replay.click();await expect.poll(()=>reads.filter(text=>text.includes('身坐正，书放平，手轻握，眼看清')).length).toBe(2);
  expect(await stored('extensionDone')).not.toBe(true);
 }
 expect(await stored('bridgeExplained')).toBeNull();
 await bridge.getByRole('button',{name:'趴在桌上',exact:true}).click();expect(await stored('extensionDone')).not.toBe(true);
 await bridge.getByRole('button',{name:'坐稳、放平纸',exact:true}).click();
 await expect.poll(()=>stored('extensionDone')).toBe(true);expect(await stored('bridgeExplained')).toBeNull();
 if(!sound)expect(reads).toHaveLength(0);
 await page.reload();await expect(page.locator('.boot-splash')).toBeHidden();
 await page.getByRole('tab',{name:/知识桥/}).click();await expect(bridge.locator('.ct-ktrail-status')).toContainText('知识已经用到新情境');
 expect(await stored('bridgeAnswer')).toBe('坐稳、放平纸');
 await page.screenshot({path:`tmp/course-ai/knowledge-bridge-${sound?'voice':'muted'}.png`});
});
