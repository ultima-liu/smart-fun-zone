import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const packs = [
  { file: 'tanks-atlas-v1.png', columns: 3, rows: 2, names: ['player','ally','basic','fast','power','armor'] },
  { file: 'powers-atlas-v1.png', columns: 3, rows: 2, names: ['star','tank','grenade','helmet','clock','shovel'] },
  { file: 'terrain-atlas-v1.png', columns: 4, rows: 2, names: ['brick','steel','water','forest','ice','floor','base','base-dead'],
    rects: [[28,102,334,329],[413,102,329,329],[795,102,330,330],[1175,102,333,329],[29,528,334,327],[412,528,330,327],[795,528,330,329],[1175,528,334,329]] },
];
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const page = await browser.newPage(), manifest = [];
  await fs.mkdir('public/assets/games/tank', { recursive: true });
  for (const pack of packs) {
    const raw = await fs.readFile(`docs/assets/tank/${pack.file}`);
    const assets = await page.evaluate(async ({ pack, data }) => {
      const image = new Image(); image.src = data; await image.decode();
      const source = document.createElement('canvas'); source.width = image.width; source.height = image.height;
      const c = source.getContext('2d'); c.drawImage(image, 0, 0);
      const pixels = c.getImageData(0,0,image.width,image.height).data;
      return pack.names.map((name, i) => {
        let rect = pack.rects?.[i];
        if (!rect) {
          const w = image.width / pack.columns, h = image.height / pack.rows, x = Math.floor(i % pack.columns * w), y = Math.floor(Math.floor(i / pack.columns) * h);
          let left=x+w, top=y+h, right=x, bottom=y;
          for(let cy=y;cy<y+h;cy++) for(let cx=x;cx<x+w;cx++) if(pixels[(cy*image.width+cx)*4+3]>20) {
            left=Math.min(left,cx);right=Math.max(right,cx);top=Math.min(top,cy);bottom=Math.max(bottom,cy);
          }
          left=Math.max(x,left-2);top=Math.max(y,top-2);right=Math.min(x+w-1,right+2);bottom=Math.min(y+h-1,bottom+2);
          rect=[left,top,right-left+1,bottom-top+1];
        }
        const canvas=document.createElement('canvas'),scale=Math.min(1,320/Math.max(rect[2],rect[3]));
        canvas.width=Math.round(rect[2]*scale);canvas.height=Math.round(rect[3]*scale);
        canvas.getContext('2d').drawImage(image,...rect,0,0,canvas.width,canvas.height);
        return {name,sourceRect:rect,width:canvas.width,height:canvas.height,cornerAlpha:pixels[3],url:canvas.toDataURL('image/webp',.91)};
      });
    }, { pack, data: `data:image/png;base64,${raw.toString('base64')}` });
    for(const asset of assets) {
      const file=`${asset.name}-v1.webp`, bytes=Buffer.from(asset.url.split(',')[1],'base64');
      await fs.writeFile(`public/assets/games/tank/${file}`,bytes);
      manifest.push({...asset,url:undefined,file,source:pack.file,bytes:bytes.length});
    }
  }
  await fs.writeFile('docs/assets/tank/imagegen-manifest.json',JSON.stringify(manifest,null,2)+'\n');
  console.log(manifest.map(({name,bytes,cornerAlpha})=>({name,bytes,cornerAlpha})));
} finally { await browser.close(); }
