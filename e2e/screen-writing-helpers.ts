import { expect, type Locator, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { letterStrokePaths } from '../src/content/writingTemplates';
import { resampleInk, strokePathPoints, type InkPoint } from '../src/writingCheck';

export async function drawInk(page: Page, pad: Locator, points: InkPoint[], width=210,height=200){
  await pad.scrollIntoViewIfNeeded();const box=(await pad.boundingBox())!;
  const screen=(point:InkPoint)=>({x:box.x+point.x*box.width/width,y:box.y+point.y*box.height/height});
  const first=screen(points[0]);await page.mouse.move(first.x,first.y);await page.mouse.down();
  for(const point of points.slice(1)){const next=screen(point);await page.mouse.move(next.x,next.y);}
  await page.mouse.up();
}
export async function writeLetter(page: Page,scope:Locator,letter:string){
  const pad=scope.locator('.screen-letter-pad');
  const writingStyle=await pad.getAttribute('data-writing-style')==='pinyin'?'pinyin':'english';
  for(const path of letterStrokePaths(letter,writingStyle))await drawInk(page,pad,resampleInk(strokePathPoints(path)));
  await expect(scope.getByRole('status')).toContainText('自动检查通过');
}
export async function writeHanzi(page:Page,scope:Locator,char:string){
  const pad=scope.locator('.screen-hanzi-pad');await expect(pad.locator('svg path').first()).toBeAttached();
  const data=JSON.parse(await readFile(`public/assets/chinese-textbook/strokes/${char}.json`,'utf8')) as {medians:number[][][]};
  const scale=260/1024,x=20,y=300-(124*scale+20);
  for(let i=0;i<data.medians.length;i++){
    await drawInk(page,pad.locator('svg'),resampleInk(data.medians[i].map(([px,py])=>({x:x+px*scale,y:y-py*scale}))),300,300);
    if(i<data.medians.length-1)await expect(scope.getByText(`已写对 ${i+1} 笔`,{exact:false})).toBeVisible();
  }
}
