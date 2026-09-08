import fs from 'node:fs';
import { config } from './config.js';
import { q } from './db.js';

/**
 * 调用火山 seed-tts-2.0 合成并缓存：
 * 把上游 SSE 响应原文写入 outFile（.sse），同时在 tts_cache 表登记。
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
  fs.writeFileSync(opts.outFile, buf);
  const key = opts.outFile.split('/').pop() ?? opts.requestId;
  await q(
    'INSERT INTO tts_cache (cache_key, file_path, bytes) VALUES (?,?,?) ON DUPLICATE KEY UPDATE file_path=VALUES(file_path), bytes=VALUES(bytes)',
    [key, opts.outFile, buf.length],
  );
}
