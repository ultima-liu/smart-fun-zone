/* 从现有前端内容数据构建内容包 v1 种子 JSON（server/seed/content-pack.json）
   用法：node scripts/build-content-pack.mjs */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const serverDir = path.join(root, 'server');
const esbuildBin = path.join(root, 'node_modules', '.bin', 'esbuild');

const out = execFileSync(
  esbuildBin,
  ['scripts/content-entry.ts', '--bundle', '--platform=node', '--format=cjs', '--log-level=warning'],
  { cwd: serverDir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);
// 用 node 执行打包产物（stdin 无法直接传 20MB+，落盘执行）
const tmp = path.join(serverDir, 'var', 'content-entry.cjs');
fs.mkdirSync(path.dirname(tmp), { recursive: true });
fs.writeFileSync(tmp, out);
const json = execFileSync('node', [tmp], { cwd: serverDir, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
fs.writeFileSync(path.join(serverDir, 'seed', 'content-pack.json'), json);
console.log(`✅ content-pack.json 已生成（${(json.length / 1024).toFixed(0)} KB）`);
