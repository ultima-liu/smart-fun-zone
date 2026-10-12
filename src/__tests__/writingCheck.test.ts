import { expect, it } from 'vitest';
import { checkInkStroke, resampleInk, strokePathPoints } from '../writingCheck';
import { letterStrokePaths } from '../content/writingTemplates';
import { CHINESE_PINYIN_STUDY } from '../content/chinesePinyinStudy';

it('全部大小写字母及教材拼音均有可逐笔检查的模板',()=>{
  const letters = new Set(['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzü', ...Object.values(CHINESE_PINYIN_STUDY).flatMap(pack=>pack.letters.map(letter=>letter.glyph))].join(''));
  for(const letter of letters){
    expect(letterStrokePaths(letter).length,letter).toBeGreaterThan(0);
    for(const path of letterStrokePaths(letter)){
      const reference=strokePathPoints(path);
      expect(reference.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y)),`${letter}:${path}`).toBe(true);
      expect(checkInkStroke(resampleInk(reference),reference),`${letter}:${path}`).toBe(true);
    }
  }
});
it('拒绝空白、乱画、反向、错误占格及错误笔序，允许小幅手写偏差',()=>{
  const first=strokePathPoints(letterStrokePaths('A')[0]);
  const actual=resampleInk(first);
  expect(checkInkStroke([],first)).toBe(false);
  expect(checkInkStroke([{x:55,y:128}],first)).toBe(false);
  expect(checkInkStroke([...actual].reverse(),first)).toBe(false);
  expect(checkInkStroke(actual.map(point=>({x:point.x,y:point.y+40})),first)).toBe(false);
  expect(checkInkStroke(resampleInk(strokePathPoints(letterStrokePaths('A')[1])),first)).toBe(false);
  expect(checkInkStroke([{x:55,y:128},{x:190,y:190},{x:0,y:0},{x:102,y:24}],first)).toBe(false);
  expect(checkInkStroke(actual.map((point,index)=>({x:point.x+2*Math.sin(index),y:point.y+3})),first)).toBe(true);
});
it('点必须写在模板位置，短点不能代替普通笔画',()=>{
  const dot=strokePathPoints(letterStrokePaths('i')[1]);
  expect(checkInkStroke([{x:106,y:46}],dot)).toBe(true);
  expect(checkInkStroke([{x:106,y:100}],dot)).toBe(false);
  expect(checkInkStroke([{x:106,y:46},{x:106,y:128}],dot)).toBe(false);
  expect(checkInkStroke([{x:106,y:73},{x:106,y:74},{x:106,y:75}],strokePathPoints(letterStrokePaths('i')[0]))).toBe(false);
});

it('全套英文大小写的提笔次数对应教材六页的笔画编号',()=>{
  // Independently transcribed from PEP Write and say P6/18/30/42/54/66, not derived from paths.
  const upper=[3,2,1,2,3,3,1,3,3,1,2,1,2,3,1,2,2,2,1,2,2,1,1,2,2,1];
  const lower=[1,1,1,2,1,2,1,1,2,2,2,1,1,1,1,2,1,1,1,2,1,1,1,2,1,1];
  [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].forEach((letter,index)=>{
    expect(letterStrokePaths(letter).length,letter).toBe(upper[index]);
    expect(letterStrokePaths(letter.toLowerCase()).length,letter.toLowerCase()).toBe(lower[index]);
  });
});

it('A 从顶部向左下写，N 的两竖和 P、R 的竖都从上往下',()=>{
  const a=strokePathPoints(letterStrokePaths('A')[0]);
  expect(a[0]).toEqual({x:102,y:24});expect(a[a.length-1]).toEqual({x:55,y:128});
  const hand=[{x:103,y:25},{x:91,y:50},{x:79,y:77},{x:66,y:104},{x:55,y:127}];
  expect(checkInkStroke(hand,a)).toBe(true);
  expect(checkInkStroke([...hand].reverse(),a)).toBe(false);
  for(const [letter,index] of [['N',0],['N',2],['P',0],['R',0]] as const){
    const path=strokePathPoints(letterStrokePaths(letter)[index]);
    expect(path[0].y,letter).toBe(24);expect(path[path.length-1].y,letter).toBe(128);
    expect(checkInkStroke(resampleInk(path).reverse(),path),letter).toBe(false);
  }
});

it('英语连写与拼音分笔分开，教材手写 f 伸入下格',()=>{
  const pinyinCounts:Record<string,number>={a:2,b:2,f:2,g:2,h:2,k:3,m:3,n:2,q:2,r:2,u:2,y:2,ü:4};
  for(const [letter,count] of Object.entries(pinyinCounts)){
    const paths=letterStrokePaths(letter,'pinyin');expect(paths.length,letter).toBe(count);
    for(const path of paths){const points=strokePathPoints(path);expect(checkInkStroke(resampleInk(points),points),letter).toBe(true);}
  }
  const englishF=strokePathPoints(letterStrokePaths('f')[0]);
  expect(Math.max(...englishF.map(point=>point.y))).toBeGreaterThan(160);
  const pinyinF=strokePathPoints(letterStrokePaths('f','pinyin')[0]);
  expect(Math.max(...pinyinF.map(point=>point.y))).toBeLessThanOrEqual(128);
});

it('拼音范字按字母分别占格，圆弧不越过中格边界',()=>{
  // Textbook grid: middle-only bodies, ascenders/dots above, descenders below; j spans all three.
  const groups = [
    { letters: 'ace mnorsuvwxz'.replaceAll(' ', ''), top: 73, bottom: 128 },
    { letters: 'bdfhikltü', top: 24, bottom: 128 },
    { letters: 'gpqy', top: 73, bottom: 178 },
    { letters: 'j', top: 24, bottom: 178 },
  ];
  for (const { letters, top, bottom } of groups) for (const letter of letters) {
    for (const path of letterStrokePaths(letter, 'pinyin')) {
      const points = strokePathPoints(path);
      expect(Math.min(...points.map(point => point.y)), letter).toBeGreaterThanOrEqual(top);
      expect(Math.max(...points.map(point => point.y)), letter).toBeLessThanOrEqual(bottom);
      expect(checkInkStroke(resampleInk(points), points), letter).toBe(true);
    }
  }
  for (const letter of ['i', 'ü', 'j']) {
    const strokes = letterStrokePaths(letter, 'pinyin').map(strokePathPoints);
    const dots = strokes.filter(points => points.every(point => point.x === points[0].x && point.y === points[0].y));
    expect(dots.length, letter).toBe(letter === 'ü' ? 2 : 1);
    expect(dots.every(points => points[0].y > 24 && points[0].y < 73), letter).toBe(true);
  }
});
