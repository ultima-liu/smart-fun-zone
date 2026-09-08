import type { LessonContent } from './skills';

/* =====================================================================
   课程内容懒加载 + 服务端内容包增量下载（M1.2）
   1) 先从构建内置的 LESSON_CONTENTS 起步（离线兜底）
   2) 向服务端拉取内容分片清单（manifest），按 hash 只下载变化的分片
      （每个分片带重试/断点），下载后合并覆盖内置内容
   3) 分片 hash 与合并结果缓存到 localStorage，下次启动断点续传
   服务端不可用时完全静默，本地内置内容照常可用。
   ===================================================================== */

const CACHE_KEY = 'sfz_content_cache';
const CHUNK_KEY = 'sfz_content_chunks';

let mapPromise: Promise<Record<string, LessonContent>> | null = null;

interface Manifest {
  ok: boolean;
  version: number;
  chunks: { idx: number; hash: string; size: number }[];
}

interface ChunkResp {
  ok: boolean;
  idx: number;
  hash: string;
  data: { contents?: Record<string, LessonContent>; enhance?: Record<string, unknown> };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** 带重试的分片下载（断点续传：失败重试，最多 3 次） */
async function fetchChunk(idx: number): Promise<ChunkResp | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetchJson<ChunkResp>(`/api/content/chunk/${idx}`);
    if (r && r.ok) return r;
    if (attempt < 3) await new Promise((res) => setTimeout(res, 400 * attempt));
  }
  return null;
}

function loadChunkHashes(): Record<number, string> {
  try {
    return JSON.parse(localStorage.getItem(CHUNK_KEY) ?? '{}') as Record<number, string>;
  } catch {
    return {};
  }
}
function saveChunkHashes(m: Record<number, string>) {
  try {
    localStorage.setItem(CHUNK_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

/** 尝试从服务端增量更新内容（失败静默） */
async function tryFetchServerContents(base: Record<string, LessonContent>): Promise<Record<string, LessonContent>> {
  const manifest = await fetchJson<Manifest>('/api/content/manifest');
  if (!manifest || !manifest.ok || manifest.chunks.length === 0) return base;
  const prev = loadChunkHashes();
  const changed = manifest.chunks.filter((c) => prev[c.idx] !== c.hash);
  if (changed.length === 0) {
    // 无变化：直接用本地缓存
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return { ...base, ...(JSON.parse(cached) as Record<string, LessonContent>) };
    } catch {
      /* ignore */
    }
    return base;
  }
  // 逐分片下载（可断点续传），并把结果合并
  const merged: Record<string, LessonContent> = { ...base };
  let changedAgain = false;
  for (const c of changed) {
    const r = await fetchChunk(c.idx);
    if (r && r.hash === c.hash && r.data?.contents) {
      Object.assign(merged, r.data.contents);
      prev[c.idx] = c.hash;
    } else {
      changedAgain = true; // 本片失败，下次续传
    }
  }
  saveChunkHashes(prev);
  if (!changedAgain) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
    } catch {
      /* ignore */
    }
  }
  return merged;
}

export function loadContents(): Promise<Record<string, LessonContent>> {
  mapPromise ??= import('./lessonContents').then(async (m) => {
    try {
      return await tryFetchServerContents(m.LESSON_CONTENTS);
    } catch {
      return m.LESSON_CONTENTS;
    }
  });
  return mapPromise;
}

export async function loadLessonContent(id: string): Promise<LessonContent | undefined> {
  const map = await loadContents();
  return map[id];
}
