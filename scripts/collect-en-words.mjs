// 收集全部英语课时 words 的唯一词汇
import * as fs from 'node:fs';
import * as path from 'node:path';

const dir = path.resolve('src', 'content', 'contents');
const files = fs.readdirSync(dir).filter((f) => /^english/.test(f) && f.endsWith('.ts'));
const words = new Set();
for (const f of files) {
  const src = fs.readFileSync(path.join(dir, f), 'utf-8');
  const re = /words:\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const list = m[1].match(/['"]([^'"]*)['"]/g) ?? [];
    list.forEach((w) => {
      const raw = w.replace(/^['"]|['"]$/g, '').trim().toLowerCase();
      if (/^[a-z]+([ -][a-z]+)*$/.test(raw)) words.add(raw);
    });
  }
}
const sorted = [...words].filter(Boolean).sort();
console.log('unique words:', sorted.length);
fs.writeFileSync(path.resolve('scripts', '_en-words.txt'), sorted.join('\n'), 'utf-8');
console.log('saved to scripts/_en-words.txt');
