/* 语文一年级上册内容静态校验：45 课时全覆盖、文本/生字表非空、无重复词 */
import { readFileSync } from 'node:fs';

const src = readFileSync('src/content/contents/chineseG1A.ts', 'utf8');
const ids = [...src.matchAll(/'chinese-g1-a-(\d+-\d+)'\s*:/g)].map((m) => m[1]);
const plan = { 1: 4, 2: 6, 3: 5, 4: 6, 5: 6, 6: 5, 7: 5, 8: 4, 9: 4 };
const expect = new Set();
for (const [u, c] of Object.entries(plan)) for (let l = 1; l <= c; l++) expect.add(`${u}-${l}`);

const fails = [];
const have = new Set(ids);
for (const id of expect) if (!have.has(id)) fails.push(`缺少课时 chinese-g1-a-${id}`);
for (const id of ids) if (!expect.has(id)) fails.push(`多余课时 chinese-g1-a-${id}`);

// 提取每课 {text, words}（简化正则：条目以两行形式；words 数组单行解析）
for (const id of ids) {
  const re = new RegExp(`'chinese-g1-a-${id}': \\{[\\s\\S]*?text: '((?:[^'\\\\]|\\\\.)*)'[\\s\\S]*?words: (\\[[^\\]]*\\])`, 'm');
  const m = src.match(re);
  if (!m) { fails.push(`chinese-g1-a-${id} 结构解析失败`); continue; }
  const text = m[1].replace(/\\n/g, '');
  const words = [...m[2].matchAll(/'([^']*)'/g)].map((x) => x[1]);
  if (!text.trim()) fails.push(`chinese-g1-a-${id} text 为空`);
  if (new Set(words).size !== words.length) fails.push(`chinese-g1-a-${id} words 有重复`);
  // 入学课/读书吧/纯拼音课（a o e、i u ü）允许无生字词
  if (words.length === 0 && !/^(1-\d|2-6|3-1|3-2)$/.test(id)) fails.push(`chinese-g1-a-${id} 无生字词`);
}
console.log(fails.length === 0 ? `✅ 校验通过：${ids.length} 课时内容完整` : `❌ ${fails.length} 处问题:\n` + fails.join('\n'));
process.exit(fails.length === 0 ? 0 : 1);
