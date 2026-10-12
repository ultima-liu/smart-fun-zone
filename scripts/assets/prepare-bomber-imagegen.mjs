// Encode the generated atlas cells for runtime; no repainting or background replacement.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
// Pass the folder containing the generated PNGs, or point to the project's saved atlases.
const sourceRoot = process.argv[2] || 'docs/assets/bomber';
const packs = [
 {name:'hero',file:'hero-atlas.png',grid:4,rows:2,sprites:['hero-down-idle','hero-right-idle','hero-up-idle','hero-left-idle','hero-down-walk','hero-right-walk','hero-up-walk','hero-left-walk'],alpha:true},
 {name:'terrain',file:'terrain-atlas.png',grid:3,rows:2,sprites:['floor-mint','floor-sand','floor-star','wall-stone','wall-brick','exit'],alpha:true},
 {name:'monsters',file:'monsters-atlas.png',grid:4,rows:2,sprites:['balloon','scout','runner','hunter','wraith','ghost','tiger','spinner'],alpha:true},
 {name:'powers',file:'powers-atlas.png',grid:4,rows:2,sprites:['range','capacity','speed','remote','wallPass','bombPass','firePass','invincible'],alpha:true},
];
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage();
const metadata=[];
for (const pack of packs) {
  const raw=await fs.readFile(path.join(sourceRoot,pack.file));
  if (path.resolve(sourceRoot) !== path.resolve('docs/assets/bomber')) await fs.copyFile(path.join(sourceRoot,pack.file), `docs/assets/bomber/${pack.name}-atlas.png`);
  const assets=await page.evaluate(async ({ data, grid, rows, sprites, alpha }) => {
    const image=new Image(); image.src=data; await image.decode();
    const source=document.createElement('canvas');source.width=image.width;source.height=image.height;
    const c=source.getContext('2d');c.drawImage(image,0,0);const pixels=c.getImageData(0,0,image.width,image.height).data;
    const cellW=image.width/grid,cellH=image.height/rows;
    return sprites.map((name,i)=>{
      let left=Math.floor(i%grid*cellW),top=Math.floor(Math.floor(i/grid)*cellH),right=Math.floor(left+cellW)-1,bottom=Math.floor(top+cellH)-1;
      if(alpha){
        let minX=right,minY=bottom,maxX=left,maxY=top;
        for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)if(pixels[(y*image.width+x)*4+3]>12){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
        left=Math.max(left,minX-2);top=Math.max(top,minY-2);right=Math.min(right,maxX+2);bottom=Math.min(bottom,maxY+2);
      }
      const w=right-left+1,h=bottom-top+1,scale=Math.min(1,(alpha?320:384)/Math.max(w,h));
      const target=document.createElement('canvas');target.width=Math.round(w*scale);target.height=Math.round(h*scale);
      target.getContext('2d').drawImage(image,left,top,w,h,0,0,target.width,target.height);
      return { name,width:target.width,height:target.height,sourceRect:[left,top,w,h],url:target.toDataURL('image/webp',.92) };
    });
  },{data:`data:image/png;base64,${raw.toString('base64')}`,...pack});
  for(const asset of assets){
    const filename=`${asset.name}-v1.webp`;const bytes=Buffer.from(asset.url.split(',')[1],'base64');
    await fs.writeFile(`public/assets/games/bomber/${filename}`,bytes);metadata.push({...asset,url:undefined,file:filename,bytes:bytes.length});
  }
}
await fs.writeFile('docs/assets/bomber/manifest.json',JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify(metadata.map(({name,width,height,bytes})=>({name,width,height,bytes}))));
await browser.close();
