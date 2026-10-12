export type ChineseSkill = 'recognition' | 'pinyin' | 'reading' | 'expression' | 'writing' | 'listening';
export type EvidenceLevel = 'practiced' | 'supported' | 'independent';
export type EvidenceSource = 'self' | 'adult' | 'check' | 'ai';
export type ChineseEvidence = {
  lessonId: string; taskId: string; skill: ChineseSkill; level: EvidenceLevel;
  source: EvidenceSource; context: 'lesson' | 'review'; at: number; note: string;
};
export const CHINESE_SKILL_LABELS: Record<ChineseSkill, string> = {
  recognition: '认字', pinyin: '拼读', reading: '阅读理解', expression: '表达与交流', writing: '书写', listening: '倾听',
};
export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  practiced: '已练习', supported: '借助提示完成', independent: '独立完成',
};
const key = (childId: string | null) => `sfz-chinese-evidence-v1:${childId ?? 'guest'}`;

export function readChineseEvidence(childId: string | null, lessonId?: string): ChineseEvidence[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key(childId)) ?? '[]');
    if (!Array.isArray(data)) return [];
    return data.filter((item): item is ChineseEvidence => item && typeof item.lessonId === 'string'
      && typeof item.taskId === 'string' && item.skill in CHINESE_SKILL_LABELS
      && item.level in EVIDENCE_LABELS && ['self', 'adult', 'check', 'ai'].includes(item.source)
      && ['lesson', 'review'].includes(item.context) && Number.isFinite(item.at) && typeof item.note === 'string'
      && (!lessonId || item.lessonId === lessonId));
  } catch { return []; }
}

export function recordChineseEvidence(childId: string | null, evidence: Omit<ChineseEvidence, 'at'>, at = Date.now()) {
  // 只保留同一任务、来源与情境的最新表现；后来的困难不能被历史最好成绩掩盖。
  const rows = readChineseEvidence(childId).filter((row) => row.lessonId !== evidence.lessonId || row.taskId !== evidence.taskId || row.context !== evidence.context || row.source !== evidence.source);
  const level = evidence.source === 'self' ? 'practiced' : evidence.level;
  rows.push({ ...evidence, level, at });
  try { localStorage.setItem(key(childId), JSON.stringify(rows.slice(-1500))); } catch { /* 存储不可用仍可练习 */ }
  window.dispatchEvent(new Event('chinese-evidence-change'));
}

export function latestSkillEvidence(rows: ChineseEvidence[], skill: ChineseSkill) {
  return rows.filter((row) => row.skill === skill).sort((a, b) => b.at - a.at)[0];
}

/** 自记练习保留参与记录，不覆盖同一细项的实际检查；实际检查之间取最近表现。 */
export function latestChineseTaskEvidence(rows: ChineseEvidence[]): ChineseEvidence[] {
  const latest = new Map<string, ChineseEvidence>();
  for (const row of rows) {
    const previous = latest.get(row.taskId);
    const assessed = row.source !== 'self' && row.level !== 'practiced';
    const wasAssessed = previous && previous.source !== 'self' && previous.level !== 'practiced';
    if (!previous || (assessed && !wasAssessed) || (assessed === Boolean(wasAssessed) && row.at >= previous.at)) latest.set(row.taskId, row);
  }
  return [...latest.values()];
}

/** 稳定的 Fisher–Yates 排序：重绘/重听不改变选项，显示和语音共用同一份数组。 */
export function chineseOptions<T>(items: readonly T[], seed: string): T[] {
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

/** 首页/课程表只需要证据优先级，不加载整册教材与教学任务。 */
export function chineseEvidenceReviewPriority(childId: string, lessonId: string, now: number): number {
  const rows = readChineseEvidence(childId, lessonId);
  if (!rows.length) return 3;
  const groups = new Map<string, ChineseEvidence[]>();
  for (const row of rows) {
    const category = row.skill !== 'pinyin' ? row.skill : /^(listen:|offline-listen:)/.test(row.taskId) ? 'pinyin:listen' : row.taskId.startsWith('production:') ? 'pinyin:production' : 'pinyin:rule';
    groups.set(category, [...(groups.get(category) ?? []), row]);
  }
  // 已有实际检查时按各细项判断；尚未检查时用该能力最近练习安排回顾。
  // 初次点读等参与记录不应使后来已检查的能力永久处于最高复习优先级。
  const reviewRows = [...groups.values()].flatMap((group) => {
    const assessed = latestChineseTaskEvidence(group).filter((row) => row.source !== 'self' && row.level !== 'practiced');
    return assessed.length ? assessed : [group.reduce((latest, row) => latest.at > row.at ? latest : row)];
  });
  return reviewRows.reduce((priority, row) => {
    const days = row.source === 'self' || row.level === 'practiced' ? 1 : row.level === 'supported' ? 3 : 7;
    if (row.at + days * 86_400_000 > now) return priority;
    return Math.max(priority, days === 1 ? 3 : days === 3 ? 2 : 1);
  }, 0);
}
