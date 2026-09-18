/** 将用户提供的 PEP 三年级上册页面压成教学对照图；不复制原始 22 MB PDF 到项目。 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const pdf = process.argv[2];
if (!pdf) throw new Error('用法：node scripts/render-english-g3-pages.mjs <教材 PDF 绝对路径>');
const output = join(process.cwd(), 'public/assets/english-textbook/pages');
mkdirSync(output, { recursive: true });
const scratch = mkdtempSync(join(tmpdir(), 'sfz-en-g3-'));
let total = 0;
try {
  for (let printed = 2; printed <= 77; printed++) {
    const sourcePage = printed + 5;
    const stem = `p${String(printed).padStart(3, '0')}`;
    const temp = join(scratch, stem);
    execFileSync('pdftoppm', ['-f', String(sourcePage), '-l', String(sourcePage), '-scale-to', '820', '-png', '-singlefile', pdf, temp], { stdio: 'ignore' });
    const target = join(output, `${stem}.webp`);
    execFileSync('cwebp', ['-quiet', '-q', '57', `${temp}.png`, '-o', target], { stdio: 'ignore' });
    total += statSync(target).size;
  }
} finally { rmSync(scratch, { recursive: true, force: true }); }
writeFileSync(join(output, 'source.txt'), `PEP 英语三年级上册；教材印刷 P2-P77；PDF 页码 = 印刷页码 + 5；WebP 820px，质量 57。\n`);
console.log(`生成 76 页，${(total / 1048576).toFixed(2)} MiB`);
