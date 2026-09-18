import fs from 'node:fs';
import { config } from './config.js';
import { q } from './db.js';

/**
 * 校验一段 SSE 响应是"可用的合成结果"：
 * 至少包含一个非空 data 音频分片，且没有任何业务错误码。
 * 火山的失败响应也是 HTTP 200 + SSE，错误藏在 data JSON 的 code 字段里
 * （如 45000030 resource not granted），不校验就会把错误文案缓存成"音频"。
 */
export function sseLooksValid(buf: Buffer): boolean {
  const text = buf.toString('utf8');
  let hasAudio = false;
  for (const line of text.split('\n')) {
    const l = line.trim();
    if (!l.startsWith('data:')) continue;
    const payload = l.slice(5).trim();
    if (!payload) continue;
    try {
      const d = JSON.parse(payload) as { code?: number; data?: string };
      const code = d.code ?? 0;
      if (code !== 0 && code !== 20000000) return false;
      if (d.data) hasAudio = true;
    } catch {
      return false;
    }
  }
  return hasAudio;
}

/**
 * 调用火山 seed-tts-2.0 合成并缓存：
 * 把上游 SSE 响应原文写入 outFile（.sse），同时在 tts_cache 表登记。
 * 仅在响应校验通过（含真实音频）时落盘，失败响应不缓存，让下次请求可重试。
 */
export async function synthesizeCache(opts: {
  bodyText: string;
  resourceId: string;
  requestId: string;
  outFile: string;
}): Promise<void> {
  const res = await fetch(config.volc.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': config.volc.apiKey,
      'X-Api-Resource-Id': opts.resourceId,
      'X-Api-Request-Id': opts.requestId,
    },
    body: opts.bodyText,
  });
  if (!res.ok || !res.body) {
    throw new Error(`volc tts upstream error: ${res.status}`);
  }
  const chunks: Buffer[] = [];
  for await (const c of res.body as unknown as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(c));
  }
  const buf = Buffer.concat(chunks);
  if (!sseLooksValid(buf)) {
    throw new Error(`volc tts upstream rejected: ${buf.toString('utf8').slice(0, 200)}`);
  }
  fs.writeFileSync(opts.outFile, buf);
  const key = opts.outFile.split('/').pop() ?? opts.requestId;
  await q(
    'INSERT INTO tts_cache (cache_key, file_path, bytes) VALUES (?,?,?) ON DUPLICATE KEY UPDATE file_path=VALUES(file_path), bytes=VALUES(bytes)',
    [key, opts.outFile, buf.length],
  );
}
