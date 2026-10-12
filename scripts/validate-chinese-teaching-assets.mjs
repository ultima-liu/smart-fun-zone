import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const manifest = JSON.parse(readFileSync('src/content/chinesePinyinAudio.ts', 'utf8').match(/= (\{[\s\S]*\});/)[1]);
for (const path of new Set(Object.values(manifest))) assert(readFileSync(`public${path}`).length > 100, `录音资源损坏：${path}`);
const study = readFileSync('src/content/chineseTextbookStudy.ts', 'utf8');
const writing = [...study.matchAll(/writing: chars\((\[[^\n]*\])\)/g)].flatMap((match) => [...match[1].matchAll(/\['([^']+)',/g)].map((item) => item[1]));
for (const char of new Set(writing)) {
  const data = JSON.parse(readFileSync(`public/assets/chinese-textbook/strokes/${char}.json`, 'utf8'));
  assert(data.strokes.length > 0, `缺少笔画：${char}`);
  assert.equal(data.strokes.length, data.medians.length, `笔顺数据不完整：${char}`);
}
console.log(`语文资源验证通过：${new Set(Object.values(manifest)).size} 段音节录音、${new Set(writing).size} 个书写字的笔顺。`);
