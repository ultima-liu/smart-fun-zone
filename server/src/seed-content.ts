import fs from 'node:fs';
import crypto from 'node:crypto';
import { config } from './config.js';
import { db, initSchema } from './db.js';

interface Pack {
  format: string;
  curriculum: unknown[];
  contents: Record<string, unknown>;
  enhance: Record<string, unknown>;
}

/** 把一个对象按 key 分成 n 份（按 key 散列，稳定分布） */
function splitByKey<T>(obj: Record<string, T>, n: number): Record<string, T>[] {
  const buckets: Record<string, T>[] = Array.from({ length: n }, () => ({}));
  for (const [k, v] of Object.entries(obj)) {
    let h = 0;
    for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    buckets[h % n][k] = v;
  }
  return buckets;
}

const CONTENTS_CHUNKS = 24;
const ENHANCE_CHUNKS = 12;

/** 将内容包 v1 种子 JSON 写入 content_packages + content_chunks */
async function seed() {
  await initSchema();
  const raw = fs.readFileSync(config.contentPackSeed, 'utf8');
  const pack = JSON.parse(raw) as Pack;
  const version = 1;
  const conn = await db();

  await conn.query(
    'INSERT INTO content_packages (version, payload, note) VALUES (?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload), note=VALUES(note)',
    [version, raw, 'v1：12 册语文课程 + 课文/生字/要点 + 图文分步教学增强'],
  );

  // 分片：0 = 元信息+课程表；1.. = contents 分片；其后 = enhance 分片
  const chunks: { idx: number; data: unknown }[] = [];
  chunks.push({ idx: 0, data: { format: pack.format, curriculum: pack.curriculum } });
  let idx = 1;
  for (const part of splitByKey(pack.contents ?? {}, CONTENTS_CHUNKS)) {
    chunks.push({ idx: idx++, data: { contents: part } });
  }
  for (const part of splitByKey(pack.enhance ?? {}, ENHANCE_CHUNKS)) {
    chunks.push({ idx: idx++, data: { enhance: part } });
  }

  // 清理旧分片，逐片入库（hash 供增量比对）
  await conn.query('DELETE FROM content_chunks WHERE version=?', [version]);
  for (const c of chunks) {
    const text = JSON.stringify(c.data);
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    await conn.query(
      'INSERT INTO content_chunks (version, chunk_idx, hash, size, payload) VALUES (?,?,?,?,?)',
      [version, c.idx, hash, Buffer.byteLength(text), text],
    );
  }

  console.log(
    `✅ 内容包 v${version} 已入库：课程 ${pack.curriculum.length} 课，课文 ${Object.keys(pack.contents ?? {}).length} 篇，分片 ${chunks.length} 个`,
  );
  await conn.end();
}

seed().catch((e) => {
  console.error('seed 失败:', (e as Error).message);
  process.exit(1);
});
