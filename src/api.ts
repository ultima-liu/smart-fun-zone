/* =====================================================================
   服务端 API 客户端（M0/M1）
   - 本地优先：所有请求失败均静默降级，不影响离线学习
   - token 存 localStorage（家长登录后启用同步）
   ===================================================================== */

const BASE = '/api';

export interface ChildInfo {
  id: number;
  name: string;
  avatar: string;
  grade: string;
}

export interface ProgressPayload {
  lessonId: string;
  stepIdx: number;
  stars: number;
  score: number;
  payload?: unknown;
}

export interface WrongRecord {
  lessonId: string;
  kind: string;
  question: string;
  answer: string;
  wrong: boolean;
  durationMs?: number;
}

export interface Plan {
  id: number;
  kind: string;
  title: string;
  detail: string;
  due_date: string | null;
  done: number;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  summary: {
    practiceCount: number;
    wrongCount: number;
    readAloudCount: number;
    readAloudAvg: number;
    totalStars: number;
  };
  topLessons: { lessonId: string; stars: number }[];
}

function token(): string {
  try {
    return localStorage.getItem('sfz_token') ?? '';
  } catch {
    return '';
  }
}

export function setToken(t: string) {
  try {
    localStorage.setItem('sfz_token', t);
  } catch {
    /* ignore */
  }
}

export function isLoggedIn(): boolean {
  return token() !== '';
}

export function logout() {
  try {
    localStorage.removeItem('sfz_token');
    localStorage.removeItem('sfz_parent');
    localStorage.removeItem('sfz_role');
  } catch {
    /* ignore */
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  const t = token();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...((init.headers as Record<string, string>) ?? {}) };
  if (t) headers.Authorization = `Bearer ${t}`;
  try {
    const res = await fetch(BASE + path, { ...init, headers });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // 服务端不可用时静默降级
  }
}

/** 应用启动时探测服务端：可用性 + TTS 配置状态（写入测试钩子供 volcTts 使用） */
export async function refreshServerHealth(): Promise<void> {
  try {
    const res = await fetch(`${BASE}/health`);
    if (!res.ok) return;
    const h = (await res.json()) as { ok: boolean; ttsConfigured: boolean };
    const w = window as unknown as { __VOLC_TTS_ENABLED__?: boolean };
    if (h.ok) w.__VOLC_TTS_ENABLED__ = h.ttsConfigured;
  } catch {
    /* ignore */
  }
}

export const api = {
  health: () => request<{ ok: boolean; ttsConfigured: boolean }>('/health'),
  sendCode: (phone: string) => request<{ ok: boolean; devCode?: string }>('/auth/send-code', { method: 'POST', body: JSON.stringify({ phone }) }),
  login: (phone: string, code: string) =>
    request<{ ok: boolean; token?: string; familyId?: number; nickname?: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ phone, code }) }),
  childAccount: (childId: number, password: string, loginName?: string) =>
    request<{ ok: boolean; loginName?: string }>('/auth/child-account', { method: 'POST', body: JSON.stringify({ childId, password, loginName }) }),
  childLogin: (loginName: string, password: string) =>
    request<{ ok: boolean; token?: string; childId?: number; name?: string; avatar?: string; grade?: string }>('/auth/child-login', { method: 'POST', body: JSON.stringify({ loginName, password }) }),
  parentLogin: (loginName: string, password: string) =>
    request<{ ok: boolean; token?: string; userId?: number; role?: 'parent' | 'admin'; nickname?: string }>('/auth/parent-login', { method: 'POST', body: JSON.stringify({ loginName, password }) }),
  childMe: () => request<{ ok: boolean; child?: ChildInfo }>('/child/me'),
  me: () => request<{ ok: boolean; familyId: number; children: ChildInfo[] }>('/me'),
  createParent: (name: string, password: string) => request<{ ok: boolean; loginName?: string }>('/admin/parents', { method: 'POST', body: JSON.stringify({ name, password }) }),
  listParents: () => request<{ ok: boolean; parents: { id: number; nickname: string; login_name: string; role: string }[] }>('/admin/parents'),
  addChild: (c: { name: string; avatar: string; grade: string }) =>
    request<{ ok: boolean; id: number }>('/family/children', { method: 'POST', body: JSON.stringify(c) }),
  updateChild: (id: number, c: { name?: string; avatar?: string; grade?: string }) =>
    request<{ ok: boolean }>(`/family/children/${id}`, { method: 'PUT', body: JSON.stringify(c) }),
  removeChild: (id: number) => request<{ ok: boolean }>(`/family/children/${id}`, { method: 'DELETE' }),
  contentPackage: (ver = 0) => request<{ ok: boolean; version: number; upToDate?: boolean; payload?: unknown }>(`/content/package?ver=${ver}`),
  syncPull: (childId: number, since = 0) =>
    request<{ ok: boolean; progress: unknown[]; wrongs: unknown[]; readAloud: unknown[]; points?: { source_id: string; amount: number; reason: string; ts: number }[]; items?: string[]; rewards?: { request_id: string; item_id: string; name: string; icon: string; kind: string; cost: number; status: string; created_at: number; decided_at: number }[] }>(`/sync?childId=${childId}&since=${since}`),
  syncPoints: (childId: number, ledger: { id: string; amount: number; reason?: string; time?: number }[], items: string[], rewards: { id: string; itemId: string; name: string; icon: string; kind: string; cost: number; status: string; createdAt: number; decidedAt: number }[]) =>
    request<{ ok: boolean; applied: number }>('/sync/points', { method: 'POST', body: JSON.stringify({ childId, ledger, items, rewards }) }),
  syncProgress: (childId: number, p: ProgressPayload) =>
    request<{ ok: boolean }>('/sync/progress', { method: 'PUT', body: JSON.stringify({ childId, ...p }) }),
  syncPractice: (childId: number, r: WrongRecord) =>
    request<{ ok: boolean }>('/sync/practice', { method: 'POST', body: JSON.stringify({ childId, ...r }) }),
  scoreReadAloud: (childId: number | null, target: string, transcript: string) =>
    request<{ ok: boolean; score: number; accuracy: number }>('/score/read-aloud', {
      method: 'POST',
      body: JSON.stringify({ childId, target, transcript }),
    }),
  plans: (childId: number) => request<{ ok: boolean; plans: Plan[] }>(`/plans?childId=${childId}`),
  systemPlan: (childId: number) => request<{ ok: boolean; created: number }>('/plans/system', { method: 'POST', body: JSON.stringify({ childId }) }),
  addPlan: (p: { childId: number; kind: string; title: string; detail?: string; dueDate?: string }) =>
    request<{ ok: boolean; id: number }>('/plans', { method: 'POST', body: JSON.stringify(p) }),
  patchPlan: (id: number, done: boolean) => request<{ ok: boolean }>(`/plans/${id}`, { method: 'PATCH', body: JSON.stringify({ done }) }),
  removePlan: (id: number) => request<{ ok: boolean }>(`/plans/${id}`, { method: 'DELETE' }),
  weeklyReport: (childId: number, weekStart?: string) =>
    request<WeeklyReport & { ok: boolean }>(`/reports/weekly?childId=${childId}${weekStart ? `&weekStart=${weekStart}` : ''}`),
  // ---- 管理员 ----
  adminDashboard: () => request<{ ok: boolean; parents: number; children: number; weekPractice: number; weekWrong: number; weekRead: number; totalStars: number; contentVersion: number; contentNote: string }>('/admin/dashboard'),
  adminChildren: (search = '') => request<{ ok: boolean; children: { id: number; name: string; avatar: string; grade: string; has_login: number; login_name: string | null; parent_nick: string | null; parent_login: string | null }[] }>(`/admin/children${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  adminParentUpdate: (id: number, body: { password?: string; role?: string; disabled?: boolean }) => request<{ ok: boolean }>(`/admin/parents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminVersions: () => request<{ ok: boolean; versions: { version: number; note: string; created_at: string }[] }>('/admin/content/versions'),
  adminLessons: (q: { subject?: string; grade?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (q.subject) params.set('subject', q.subject);
    if (q.grade) params.set('grade', q.grade);
    if (q.search) params.set('search', q.search);
    return request<{ ok: boolean; lessons: { id: string; name: string; subject: string; grade: string; term: string }[] }>(`/admin/content/lessons?${params.toString()}`);
  },
  adminLesson: (id: string) => request<{ ok: boolean; lesson: { id: string; text?: string; words?: string[]; points?: string[] } }>(`/admin/content/lesson/${encodeURIComponent(id)}`),
  adminSaveLesson: (body: { id: string; text?: string; words?: string[]; points?: string[] }) => request<{ ok: boolean }>('/admin/content/lesson', { method: 'PUT', body: JSON.stringify(body) }),
  adminPublish: () => request<{ ok: boolean; version: number; note: string; chunks: number; applied: number }>('/admin/content/publish', { method: 'POST' }),
  adminRollback: (version: number) => request<{ ok: boolean; version: number; note: string; chunks: number }>('/admin/content/rollback', { method: 'POST', body: JSON.stringify({ version }) }),
  storeConfig: () => request<{ ok: boolean; storeOverrides: Record<string, import('./points').StoreItem>; taskOverrides: Record<string, { reward?: number; enabled?: boolean }> }>('/config/store'),
  saveStoreConfig: (storeOverrides: Record<string, import('./points').StoreItem>, taskOverrides: Record<string, { reward?: number; enabled?: boolean }>) =>
    request<{ ok: boolean }>('/admin/config/store', { method: 'PUT', body: JSON.stringify({ storeOverrides, taskOverrides }) }),
  /** 学习助手「小卷」问答 */
  buddyChat: (messages: { role: 'user' | 'assistant'; content: string }[]) =>
    request<{ ok: boolean; reply?: string; error?: string }>('/buddy/chat', { method: 'POST', body: JSON.stringify({ messages }) }),
};
