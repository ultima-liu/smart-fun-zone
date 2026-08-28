/* =====================================================================
   语音模型下载脚本（可选资源，不进 git）
   - 用途：下载 Piper 神经语音模型（各 ~60MB）到 public/piper/voices/
   - 缺失时站点自动降级为 espeak-ng 兜底朗读（npm 包内置，无需本脚本），
     功能不受影响，仅音质更机械 —— 因此本脚本是"可选优化"
   - 用法：npm run fetch:voices
   ===================================================================== */

import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'piper', 'voices');

const MODELS = [
  {
    lang: '中文 zh_CN-huayan-medium',
    file: 'zh_CN-huayan-medium.onnx',
    urls: [
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx',
      // 个人镜像备用（内容一致）
      'https://huggingface.co/Trelis/piper-zh-cn-huayan-medium/resolve/main/zh_CN-huayan-medium.onnx',
    ],
  },
  {
    lang: '英文 en_US-amy-medium',
    file: 'en_US-amy-medium.onnx',
    urls: [
      'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx',
    ],
  },
];

const MIN_BYTES = 20 * 1024 * 1024; // 小于 20MB 视为下载失败/错误页

async function download(url, dest, file) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const total = Number(res.headers.get('content-length') ?? 0);
  let done = 0;
  const reader = res.body.getReader();
  const chunks = [];
  for (;;) {
    const { done: d, value } = await reader.read();
    if (d) break;
    chunks.push(value);
    done += value.length;
    if (total) process.stdout.write(`\r  ${file} ${(done / 1048576).toFixed(1)} / ${(total / 1048576).toFixed(1)} MB`);
  }
  const buf = Buffer.concat(chunks);
  if (buf.length < MIN_BYTES) throw new Error(`文件过小（${buf.length} 字节），可能不是模型文件`);
  writeFileSync(dest, buf);
  process.stdout.write(`\r  ${file} 完成：${(buf.length / 1048576).toFixed(1)} MB\n`);
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  let ok = 0;
  for (const m of MODELS) {
    const dest = join(outDir, m.file);
    if (existsSync(dest) && statSync(dest).size >= MIN_BYTES) {
      console.log(`✔ 已有 ${m.file}（${(statSync(dest).size / 1048576).toFixed(1)} MB），跳过`);
      ok++;
      continue;
    }
    console.log(`↓ 下载${m.lang}…`);
    for (const url of m.urls) {
      try {
        await download(url, dest, m.file);
        ok++;
        break;
      } catch (e) {
        console.log(`  源失败：${url.split('/').slice(0, 3).join('/')}…（${e.message}）`);
      }
    }
  }
  console.log(ok === MODELS.length
    ? '\n✅ 全部语音模型就绪，Piper 神经语音可用。'
    : '\n⚠ 部分模型下载失败：站点仍可用 espeak-ng 兜底朗读。\n  请检查网络后重试 `npm run fetch:voices`，'
      + '或手动将 .onnx 放入 public/piper/voices/（文件名须与上方一致）。');
}

main().catch((e) => {
  console.error('下载失败：', e);
  process.exit(1);
});
