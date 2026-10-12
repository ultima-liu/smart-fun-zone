export type EnglishSkill = 'listening' | 'expression' | 'reading' | 'phonics' | 'writing' | 'project';
export type EnglishLevel = 'practiced' | 'supported' | 'independent' | 'needs-help';
export type EnglishEvidence = {
  lessonId: string; taskId: string; skill: EnglishSkill; level: EnglishLevel;
  source: 'self' | 'adult' | 'check' | 'ai'; context: 'lesson' | 'review'; at: number; note: string;
};
export const ENGLISH_SKILL_LABELS: Record<EnglishSkill, string> = {
  listening: '听懂信息', expression: '表达与交流', reading: '阅读理解', phonics: '辨音与拼读', writing: '规范书写', project: '制作与介绍',
};
export const ENGLISH_LEVEL_LABELS: Record<EnglishLevel, string> = {
  practiced: '已练习 · 尚未检查', supported: '提示后完成', independent: '独立完成', 'needs-help': '还需要帮助',
};
const key = (childId: string | null) => `sfz-english-evidence-v1:${childId ?? 'guest'}`;

export function readEnglishEvidence(childId: string | null, lessonId?: string): EnglishEvidence[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key(childId)) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((row): row is EnglishEvidence => row && typeof row.lessonId === 'string'
      && typeof row.taskId === 'string' && typeof row.skill === 'string' && Object.prototype.hasOwnProperty.call(ENGLISH_SKILL_LABELS, row.skill)
      && typeof row.level === 'string' && Object.prototype.hasOwnProperty.call(ENGLISH_LEVEL_LABELS, row.level) && ['self', 'adult', 'check', 'ai'].includes(row.source)
      && ['lesson', 'review'].includes(row.context) && Number.isFinite(row.at) && typeof row.note === 'string'
      && (!lessonId || row.lessonId === lessonId));
  } catch { return []; }
}

export function recordEnglishEvidence(childId: string | null, evidence: Omit<EnglishEvidence, 'at'>, at = Date.now()) {
  const rows = readEnglishEvidence(childId).filter((row) => row.lessonId !== evidence.lessonId
    || row.taskId !== evidence.taskId || row.context !== evidence.context || row.source !== evidence.source);
  rows.push({ ...evidence, level: evidence.source === 'self' ? 'practiced' : evidence.level, at });
  try { localStorage.setItem(key(childId), JSON.stringify(rows.slice(-1500))); } catch { /* 仍可临时练习 */ }
  window.dispatchEvent(new Event('english-evidence-change'));
}

/** 自记不会抹掉检查结果；实际检查取最近一次，允许后来发现的困难覆盖历史最好表现。 */
export function latestEnglishEvidence(rows: EnglishEvidence[]): EnglishEvidence[] {
  const latest = new Map<string, EnglishEvidence>();
  for (const row of rows) {
    const taskKey = `${row.lessonId}:${row.taskId}`;
    const previous = latest.get(taskKey);
    const assessed = row.source !== 'self';
    if (!previous || (assessed && previous.source === 'self') || (assessed === (previous.source !== 'self') && row.at >= previous.at)) latest.set(taskKey, row);
  }
  return [...latest.values()];
}

export function englishAssessmentEvidence(rows: EnglishEvidence[]): EnglishEvidence[] {
  return latestEnglishEvidence(rows).filter((row) => !row.taskId.startsWith('source:')
    && !row.taskId.startsWith('expression:stage-') && row.taskId !== 'review:participation');
}

export function englishReviewPriority(childId: string, lessonId: string, now: number): number {
  const rows = englishAssessmentEvidence(readEnglishEvidence(childId, lessonId));
  if (!rows.length) return 3;
  return rows.reduce((priority, row) => {
    const days = row.level === 'independent' ? 7 : row.level === 'supported' ? 3 : 1;
    return row.at + days * 86_400_000 > now ? priority : Math.max(priority, days === 7 ? 1 : days === 3 ? 2 : 3);
  }, 0);
}

/** 稳定随机顺序：重听/重绘不变，读题和显示使用同一份选项。 */
export function englishOptions<T>(items: readonly T[], seed: string): T[] {
  let state = 2166136261;
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const practiceKey = (childId: string | null, lessonId: string, taskId: string) => `sfz-english-practice-v1:${childId ?? 'guest'}:${lessonId}:${taskId}`;
export function readEnglishPractice<T>(childId: string | null, lessonId: string, taskId: string, fallback: T): T {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(practiceKey(childId, lessonId, taskId)) ?? 'null');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
    return value as T;
  } catch { return fallback; }
}
export function saveEnglishPractice(childId: string | null, lessonId: string, taskId: string, value: unknown) {
  try { localStorage.setItem(practiceKey(childId, lessonId, taskId), JSON.stringify(value)); } catch { /* 仍可临时练习 */ }
}
