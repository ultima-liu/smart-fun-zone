import {expect,test} from '@playwright/test';
import {getEnglishG3Unit} from '../src/content/englishGrade3Upper';
import {drawInk,writeLetter} from './screen-writing-helpers';

for(const unitId of ['friends','families','animals','plants','colours','numbers']){
 test(`${unitId} 全部大小写按教材笔顺练写，编号、常显描写和自动校验一致`,async({page})=>{
  const child='letter-stroke-audit',id=`${unitId}-letters`;
  await page.route('**/api/**',route=>route.fulfill({json:{ok:false,ttsConfigured:false}}));
  await page.addInitScript(({child,id})=>{
   localStorage.setItem('smart-fun-zone',JSON.stringify({version:8,state:{lang:'zh',theme:'light',sound:false,voiceOn:false,musicOn:false,profiles:[{id:child,name:'笔顺检查',ageBand:'g3',avatar:'🐼',createdAt:Date.now()}],activeChildId:child,mastery:{},records:[],lessonProgress:{},wrongs:{},points:{},pointLog:{},parentPin:'1234',dailyLimitMin:0,buddyOpen:false,buddyWakeOn:false}}));
   const key=`sfz-english-g3a-flow-v6:${child}:${id}`;
   localStorage.setItem(key,JSON.stringify({phase:1,unlocked:4}));
   localStorage.setItem(`${key}:1:tab:认字母|声音与拼读|规范书写|字母歌谣`,'2');
   localStorage.setItem(`${key}:1:tab:占格规则|动手书写`,'1');
  },{child,id});
  await page.goto(`/#/english-course/${id}`);
  await expect(page.locator('.boot-splash')).toBeHidden({timeout:20000});
  const writing=page.getByRole('region',{name:'书写实验室'}),pad=writing.locator('.screen-letter-pad');
  const letters=getEnglishG3Unit(unitId)!.letters.items.flatMap(item=>[item.letter,item.letter.toLowerCase()]);
  for(let index=0;index<letters.length;index++){
   const letter=letters[index];await writing.locator('.en-screen-letter-tabs button').nth(index).click();
   const reference=writing.locator('.screen-writing-reference svg');
   const paths=await reference.locator('.writing-reference-stroke').evaluateAll(elements=>elements.map(el=>el.getAttribute('d')));
   await expect(pad.locator('.writing-trace-hint')).toHaveCount(paths.length);
   await expect(writing.getByRole('button',{name:/描写提示/})).toHaveCount(0);
   if(letter==='A'){
    const downward=[{x:102,y:24},{x:90,y:50},{x:78,y:76},{x:66,y:102},{x:55,y:128}];
    await drawInk(page,pad,[...downward].reverse());
    await expect(writing.getByText('自己写 · 0/3 笔',{exact:true})).toBeVisible();
    await drawInk(page,pad,downward);
    await expect(writing.getByText('自己写 · 1/3 笔',{exact:true})).toBeVisible();
    await writing.getByRole('button',{name:'清空，重新写',exact:true}).click();
   }
   await writeLetter(page,writing,letter);
   const passedInk=pad.locator('polyline.writing-child-ink:not([points=""])');
   await expect(passedInk).toHaveCount(paths.length);
   await writing.getByRole('button',{name:'看逐笔范写',exact:true}).click();
   const demo=reference.locator('.writing-demo-stroke');await expect(demo).toHaveCount(paths.length);
   expect(await demo.evaluateAll(elements=>elements.map(el=>el.getAttribute('d')))).toEqual(paths);
   if(['A','B','E','M','G','f','u','k','r','W'].includes(letter))await page.screenshot({path:`tmp/course-ai/letter-stroke-${letter}.png`});
   await writing.getByRole('button',{name:'清空，重新写',exact:true}).click();
   await expect(pad.locator('.writing-trace-hint')).toHaveCount(paths.length);
   await expect(passedInk).toHaveCount(0);
  }
  const saved=await page.evaluate(({child,id})=>JSON.parse(localStorage.getItem(`sfz-english-practice-v1:${child}:${id}:writing:screen-letters`)!),{child,id});
  expect(saved.checked).toEqual(letters);
  await expect(page.getByRole('tab',{name:/规范书写/})).toHaveClass(/done/);
 });
}
