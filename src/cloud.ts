/* =====================================================================
   云端同步（M1）：本地优先，云端备份
   - pushAll：把本地某孩子的进度推到云端（进度/星星/错题由调用方提供）
   - pullAll：拉取云端增量并合并进本地 store
   服务端不可用时所有调用静默失败，学习不受影响。
   ===================================================================== */
import { api } from './api';
import { useStore } from './store';

export interface CloudChild {
  id: number;
  name: string;
  avatar: string;
  grade: string;
}

/** 本地儿童档案 ↔ 云端 children 映射：保存于 localStorage */
const MAP_KEY = 'sfz_cloud_child_map';
type MapT = Record<string, number>; // localProfileId -> cloud child id

export function childMap(): MapT {
  try {
    return JSON.parse(localStorage.getItem(MAP_KEY) ?? '{}') as MapT;
  } catch {
    return {};
  }
}
export function saveChildMap(m: MapT) {
  try {
    localStorage.setItem(MAP_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

/** 把本地某孩子的全部进度推送到云端（fire-and-forget） */
export async function pushAll(cloudChildId: number, localChildId: string): Promise<number> {
  const s = useStore.getState();
  const mastery = s.mastery[localChildId] ?? {};
  const steps = s.lessonProgress;
  let n = 0;
  const keys = new Set([...Object.keys(mastery), ...Object.keys(steps)]);
  for (const skillId of keys) {
    const m = mastery[skillId];
    const ok = await api.syncProgress(cloudChildId, {
      lessonId: skillId,
      stepIdx: steps[skillId] ?? 0,
      stars: m?.stars ?? 0,
      score: m ? (m.gold ? 100 : m.stars * 33) : 0,
      payload: { updatedAt: m?.updatedAt ?? 0 },
    });
    if (ok) n++;
  }
  return n;
}

/** 从云端拉取并合并进本地 store */
export async function pullAll(cloudChildId: number, localChildId: string): Promise<number> {
  const r = await api.syncPull(cloudChildId, 0);
  if (!r || !Array.isArray(r.progress)) return 0;
  const map: Record<string, { stars?: number; stepIdx?: number; updatedAt?: number }> = {};
  for (const row of r.progress as { lesson_id?: string; stars?: number; step_idx?: number; payload?: string | { updatedAt?: number } }[]) {
    if (!row.lesson_id) continue;
    let updatedAt = 0;
    try {
      const p = typeof row.payload === 'string' ? JSON.parse(row.payload ?? '{}') : row.payload;
      updatedAt = Number(p?.updatedAt ?? 0);
    } catch {
      /* ignore */
    }
    map[row.lesson_id] = { stars: row.stars ?? 0, stepIdx: row.step_idx ?? 0, updatedAt };
  }
  useStore.getState().applyCloudProgress(localChildId, map);
  return Object.keys(map).length;
}

/** 把本地积分流水 + 已购商品推送到云端（幂等） */
export async function pushPoints(cloudChildId: number, localChildId: string): Promise<number> {
  const s = useStore.getState();
  const log = s.pointLog[localChildId] ?? [];
  const items = s.ownedItems[localChildId] ?? [];
  if (log.length === 0 && items.length === 0) return 0;
  const r = await api.syncPoints(
    cloudChildId,
    log.map((e) => ({ id: e.id, amount: e.amount, reason: e.reason, time: e.time })),
    items,
  );
  return r?.applied ?? 0;
}

/** 从云端拉取积分流水/已购并合并进本地 */
export async function pullPoints(cloudChildId: number, localChildId: string): Promise<number> {
  const r = await api.syncPull(cloudChildId, 0);
  if (!r || !Array.isArray(r.points)) return 0;
  const entries = (r.points as { source_id: string; amount: number; reason: string; ts: number }[]).map((x) => ({
    id: x.source_id,
    amount: x.amount,
    reason: x.reason,
    time: x.ts * 1000,
  }));
  useStore.getState().applyCloudPoints(localChildId, entries, r.items ?? []);
  return entries.length;
}

/* ---------- 剧情存档同步 ---------- */

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value !== 'string') return [];
  try {
    return stringList(JSON.parse(value));
  } catch {
    return [];
  }
}

/** 保存剧情节点与已领取奖励；更新时间让「重置剧情」也可跨端覆盖旧存档。 */
export async function pushStory(cloudChildId: number, localChildId: string): Promise<boolean> {
  const s = useStore.getState();
  return !!(await api.syncStory(cloudChildId, {
    done: s.storyDone[localChildId] ?? [],
    rewardClaimed: s.storyRewardClaimed[localChildId] ?? [],
    updatedAt: s.storyUpdatedAt[localChildId] ?? 0,
  }));
}

/** 从云端恢复剧情存档。仅当云端版本较新时覆盖本地，避免旧端反向覆盖新进度。 */
export async function pullStory(cloudChildId: number, localChildId: string): Promise<number> {
  const r = await api.syncPull(cloudChildId, 0);
  if (!r?.story) return 0;
  const done = stringList(r.story.done);
  const rewardClaimed = stringList(r.story.reward_claimed);
  const updatedAt = Number(r.story.updated_at ?? 0);
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) return 0;
  useStore.getState().applyCloudStory(localChildId, { done, rewardClaimed, updatedAt });
  return done.length;
}

/* ---------- 错题自动同步 ---------- */
const PUSHED_KEY = 'sfz_pushed_wrongs';
function pushedWrongSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(PUSHED_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}
function savePushedWrongSet(s: Set<string>) {
  try {
    localStorage.setItem(PUSHED_KEY, JSON.stringify([...s].slice(-500)));
  } catch {
    /* ignore */
  }
}

/** 把本地未同步的错题推到云端（幂等：按本地 uid 记账，不重复上传） */
export async function pushWrongs(cloudChildId: number, localChildId: string): Promise<number> {
  const wrongs = useStore.getState().wrongs[localChildId] ?? [];
  if (wrongs.length === 0) return 0;
  const done = pushedWrongSet();
  let n = 0;
  for (const w of wrongs) {
    if (done.has(w.uid)) continue;
    const ok = await api.syncPractice(cloudChildId, {
      lessonId: w.lessonId,
      kind: w.kind,
      question: w.lessonName || w.lessonId,
      answer: w.answer,
      wrong: true,
    });
    if (ok) {
      done.add(w.uid);
      n += 1;
    }
  }
  savePushedWrongSet(done);
  return n;
}
