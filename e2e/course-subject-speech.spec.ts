import { expect, test } from '@playwright/test';

function wav() {
  const data=Buffer.alloc(44+2400*2);data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(24000,24);data.writeUInt32LE(48000,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(4800,40);return data.toString('base64');
}
test.use({viewport:{width:1024,height:768}});
for(const subject of ['chinese','english'] as const)test(`${subject}课程混合播报只发一次合成，并指定学科字母读音`,async({page})=>{
 const requests:{text:string;additions:string;speaker:string}[]=[];
 await page.route('**/api/**',route=>{
  if(route.request().url().includes('/volc-tts/')){
   requests.push(route.request().postDataJSON().req_params);
   return route.fulfill({contentType:'text/event-stream',body:`data: {"code":0,"data":"${wav()}"}\n\ndata: {"code":20000000}\n\n`});
  }
  return route.fulfill({json:{ok:true,ttsConfigured:true}});
 });
 await page.addInitScript(()=>{
  const originalPlay=HTMLMediaElement.prototype.play;
  (window as unknown as {speechPlays:number}).speechPlays=0;
  HTMLMediaElement.prototype.play=function(){if(this.src.startsWith('blob:'))(window as unknown as {speechPlays:number}).speechPlays++;return originalPlay.call(this);};
  Object.defineProperty(navigator,'userActivation',{configurable:true,value:{hasBeenActive:true}});
  localStorage.setItem('smart-fun-zone',JSON.stringify({version:8,state:{lang:'zh',theme:'light',sound:true,voiceOn:true,musicOn:false,profiles:[{id:'subject-speech',name:'试听',ageBand:'g1',avatar:'🐼',createdAt:Date.now()}],activeChildId:'subject-speech',records:[],mastery:{},lessonProgress:{},charBag:{},wrongs:{},points:{},pointLog:{},parentPin:'1234',dailyLimitMin:0,buddyOpen:false,buddyWakeOn:false}}));
  localStorage.setItem('sfz-chinese-flow-v1:subject-speech:pinyin-i-u-v',JSON.stringify({phase:2,unlocked:3}));
  localStorage.setItem('sfz-chinese-practice-v1:subject-speech:pinyin-i-u-v:pinyinStep','3');
 });
 const paths=subject==='chinese'?'/#/chinese-course/pinyin-i-u-v':'/#/english-course/appendix';
 await page.goto(paths);await expect(page.locator('.boot-splash')).toBeHidden();
 if(subject==='chinese'){
  await expect(page.locator('.ct-pinyin-rule').filter({visible:true})).toBeVisible();
  await expect.poll(()=>requests.filter(r=>JSON.parse(r.additions).pronunciation_dict?.tone?.some((p:string)=>p.includes('(yu1)'))).length).toBe(1);
  const read=requests.find(r=>JSON.parse(r.additions).pronunciation_dict?.tone?.some((p:string)=>p.includes('(yu1)')))!;
  const rules=JSON.parse(read.additions).pronunciation_dict.tone;
  expect(rules.some((r:string)=>r.includes('(yi1)'))).toBe(true);expect(rules.some((r:string)=>r.includes('(wu1)'))).toBe(true);
  expect(read.text).toContain('声调写法');expect(read.text).toContain('字形差在哪里');
  await expect(page.getByRole('button',{name:'再听一遍',exact:true})).toBeEnabled();
  const prior=requests.length;const plays=await page.evaluate(()=>(window as unknown as {speechPlays:number}).speechPlays);
  await page.getByRole('button',{name:'再听一遍',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {speechPlays:number}).speechPlays)).toBe(plays+1);
  expect(requests.length).toBe(prior); // Cached complete sentence replays without new per-letter requests.
  await page.getByRole('tab',{name:'图文识字',exact:true}).click();
  await expect(page.locator('.ct-pinyin-word-grid').filter({visible:true})).toBeVisible();
 }else{
  await page.getByRole('button',{name:/字母表/,exact:false}).click();
  const a=page.getByRole('button',{name:'点读字母 A',exact:true});await expect(a).toBeVisible();
  await expect(a).toBeEnabled();const prior=requests.length;await a.click();
  await expect.poll(()=>requests.length).toBe(prior+1);
  const read=requests.at(-1)!;expect(JSON.parse(read.additions).pronunciation_dict.tone).toContain('读音1号/ay');expect(read.speaker).toContain('en_');
  await page.getByRole('button',{name:'Unit 1 词汇',exact:true}).click();
  const word=page.getByRole('button',{name:'点读 name，名字',exact:true});await expect(word).toBeEnabled();
  const wordPrior=requests.length;await word.click();await expect.poll(()=>requests.length).toBe(wordPrior+1);
  expect(requests.at(-1)!.text).toBe('name。名字。');expect(requests.at(-1)!.speaker).toContain('zh_');
 }
});
