// 合并 englishDict.part{1,2,3}.ts → englishDict.ts，校验词汇全覆盖
import * as fs from 'node:fs';
import * as path from 'node:path';

const root = process.cwd();
const all = new Map();
for (const p of ['englishDict.part1.ts', 'englishDict.part2.ts', 'englishDict.part3.ts']) {
  const src = fs.readFileSync(path.join(root, 'src', 'content', p), 'utf-8');
  const re = /'([^']+)':\s*'([^']*)'/g;
  let m;
  let count = 0;
  while ((m = re.exec(src)) !== null) {
    all.set(m[1].trim().toLowerCase(), m[2].trim());
    count++;
  }
  console.log(p, 'entries:', count);
}
console.log('merged unique:', all.size);

// 校验词汇表全覆盖
const words = fs.readFileSync(path.join(root, 'scripts', '_en-words.txt'), 'utf-8')
  .split('\n').map((s) => s.trim().toLowerCase()).filter(Boolean);
const missing = words.filter((w) => !all.has(w));
console.log('missing:', missing.length, missing.slice(0, 20).join(', '));

const lines = ['// AUTO-GENERATED 英文词汇 → 中文释义（由 3 份翻译合并，勿手改）',
  'export const ENGLISH_DICT: Record<string, string> = {'];
for (const w of words) {
  if (all.has(w)) lines.push(`  '${w}': '${all.get(w)}',`);
}
lines.push('};');
fs.writeFileSync(path.join(root, 'src', 'content', 'englishDict.ts'), lines.join('\n') + '\n', 'utf-8');
console.log('written src/content/englishDict.ts');
