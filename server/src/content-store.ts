import crypto from 'node:crypto';
import type { Pool } from 'mysql2/promise';

/** 一节课的全部内容（与前端 LessonContent 对齐；管理员只可视化编辑 text/words/points） */
export interface LessonContent {
  text?: string;
  words?: string[];
  points?: string[];
  [k: string]: unknown;
}

interface Pack {
  format: string;
  curriculum: unknown[];
  contents: Record<string, LessonContent>;
  enhance: Record<string, unknown>;
}

const CONTENTS_CHUNKS = 24;
const ENHANCE_CHUNKS = 12;

/** 把一个对象按 key 分成 n 份（按 key 散列，稳定分布）——与 seed-content.ts 一致 */
function splitByKey<T>(obj: Record<string, T>, n: number): Record<string, T>[] {
  const buckets: Record<string, T>[] = Array.from({ length: n }, () => ({}));
  for (const [k, v] of Object.entries(obj)) {
    let h = 0;
    for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    buckets[h % n][k] = v;
  }
  return buckets;
}

/** 按某个版本写入 content_packages + content_chunks（覆盖旧分片，重算 hash） */
export async function writeVersion(
  conn: Pool,
  version: number,
  raw: string,
  note: string,
): Promise<{ chunks: number; lessons: number }> {
  const pack = JSON.parse(raw) as Pack;
  const chunks: { idx: number; data: unknown }[] = [];
  chunks.push({ idx: 0, data: { format: pack.format, curriculum: pack.curriculum } });
  let idx = 1;
  for (const part of splitByKey(pack.contents ?? {}, CONTENTS_CHUNKS)) {
    chunks.push({ idx: idx++, data: { contents: part } });
  }
  for (const part of splitByKey(pack.enhance ?? {}, ENHANCE_CHUNKS)) {
    chunks.push({ idx: idx++, data: { enhance: part } });
  }

  await conn.query(
    'INSERT INTO content_packages (version, payload, note) VALUES (?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload), note=VALUES(note)',
    [version, raw, note],
  );
  await conn.query('DELETE FROM content_chunks WHERE version=?', [version]);
  for (const c of chunks) {
    const text = JSON.stringify(c.data);
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    await conn.query(
      'INSERT INTO content_chunks (version, chunk_idx, hash, size, payload) VALUES (?,?,?,?,?)',
      [version, c.idx, hash, Buffer.byteLength(text), text],
    );
  }
  return { chunks: chunks.length, lessons: Object.keys(pack.contents ?? {}).length };
}
