import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const testSource = readFileSync('e2e/tank.spec.ts', 'utf8');
const start = testSource.indexOf('await page.addInitScript(') + 'await page.addInitScript('.length;
const end = testSource.indexOf('\n  });\n});', start);
const fixture = testSource.slice(start, end) + '\n}';
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const out = 'docs/assets/tank/verification'; mkdirSync(out,{recursive:true});
const report=[];
for (const [width,height,label] of [[1440,1000,'web'],[1024,768,'pad-landscape'],[768,1024,'pad-portrait'],[390,844,'phone']]) {
 for (const theme of ['light','dark']) {
  const page = await browser.newPage({viewport:{width,height}});
  await page.addInitScript({content:`(${fixture.replace("theme: 'dark'",`theme: '${theme}'`)})();`});
  await page.goto('http://localhost:5173/#/lobby'); await page.getByRole('tab',{name:/敏捷/}).click();
  const cards=await page.locator('.park-board-game-grid > article').evaluateAll(nodes=>nodes.map(n=>({x:n.getBoundingClientRect().x,width:n.getBoundingClientRect().width})));
  await page.getByRole('button',{name:'进入坦克大战'}).click();
  await page.locator('.tank-game').scrollIntoViewIfNeeded();
  await page.locator('.tank-field canvas').waitFor();
  const ready=await page.locator('.tank-overlay-panel').evaluate(n=>{const a=n.getBoundingClientRect(),b=n.closest('.tank-field').getBoundingClientRect();return {panelHeight:a.height,fieldHeight:b.height,clipped:a.height>b.height-12};});
  await page.locator('.tank-game').screenshot({path:`${out}/${label}-${theme}-ready.png`});
  await page.getByRole('button',{name:'开始守护'}).click();
  await page.waitForFunction(()=>document.querySelector('.tank-field')?.getAttribute('data-intro')==='false');
  await page.locator('.tank-game').screenshot({path:`${out}/${label}-${theme}-playing.png`});
  const metrics=await page.locator('.tank-game').evaluate(n=>({width:n.getBoundingClientRect().width,scrollWidth:n.scrollWidth,clientWidth:n.clientWidth,controls:[...n.querySelectorAll('.tank-control')].map(b=>({width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height})),canvas:n.querySelector('canvas').getBoundingClientRect().width,documentOverflow:document.documentElement.scrollWidth>innerWidth+1}));
  const images=await page.evaluate(async()=>await Promise.all(['player','ally','basic','fast','power','armor','star','tank','grenade','helmet','clock','shovel','brick','steel','water','forest','ice','floor','base','base-dead'].map(name=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve({name,width:i.width,height:i.height});i.onerror=()=>resolve({name,error:true});i.src=`/assets/games/tank/${name}-v1.webp`;}))));
  report.push({label,theme,viewport:{width,height},ready,metrics,twoCardColumns:new Set(cards.map(c=>Math.round(c.x))).size===2,images});
  console.log(label,theme,JSON.stringify({ready,metrics,twoCardColumns:report[report.length-1].twoCardColumns}));
  await page.close();
 }
}
await browser.close();writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');
if(report.some(r=>r.ready.clipped||r.metrics.documentOverflow||!r.twoCardColumns||r.images.some(i=>i.error)||r.metrics.controls.some(c=>c.width<44||c.height<44)))process.exitCode=1;
