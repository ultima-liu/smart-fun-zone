export type MathEvidenceLevel = 'practiced' | 'supported' | 'independent' | 'transfer' | 'retained' | 'needs-practice';
export type MathEvidenceContext = 'readiness' | 'operation' | 'reason' | 'checkpoint' | 'lesson' | 'review' | 'challenge' | 'life';
export type MathEvidenceSource = 'check' | 'adult' | 'self' | 'ai';
export type MathEvidence = {
  lessonId: string; taskId: string; objective: string; level: MathEvidenceLevel; context: MathEvidenceContext;
  source: MathEvidenceSource; at: number; note: string; variant?: number;
};
export const MATH_EVIDENCE_LABELS: Record<MathEvidenceLevel, string> = {
  practiced: '已练习，待验证', supported: '借助提示完成', independent: '独立完成', transfer: '能迁移到新问题', retained: '延迟复习仍能完成', 'needs-practice': '还需要练习',
};
const CONTEXTS: MathEvidenceContext[] = ['readiness', 'operation', 'reason', 'checkpoint', 'lesson', 'review', 'challenge', 'life'];
const key = (childId: string | null) => `sfz-math-evidence-v1:${childId ?? 'guest'}`;

export function readMathEvidence(childId: string | null, lessonId?: string): MathEvidence[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key(childId)) ?? '[]');
    if (!Array.isArray(data)) return [];
    return data.filter((item): item is MathEvidence => !!item && typeof item === 'object'
      && typeof item.lessonId === 'string' && typeof item.taskId === 'string' && typeof item.objective === 'string'
      && typeof item.level === 'string' && Object.prototype.hasOwnProperty.call(MATH_EVIDENCE_LABELS, item.level)
      && CONTEXTS.includes(item.context) && ['self', 'adult', 'check', 'ai'].includes(item.source)
      && typeof item.at === 'number' && Number.isFinite(item.at) && typeof item.note === 'string'
      && (!lessonId || item.lessonId === lessonId));
  } catch { return []; }
}

export function recordMathEvidence(childId: string | null, evidence: Omit<MathEvidence, 'at'>, at = Date.now()): MathEvidence {
  const rows = readMathEvidence(childId).filter((row) => row.lessonId !== evidence.lessonId || row.taskId !== evidence.taskId || row.context !== evidence.context || row.source !== evidence.source);
  // 自述和参与记录不能自动升级为数学掌握。
  const row = { ...evidence, level: evidence.source === 'self' ? 'practiced' as const : evidence.level, at };
  rows.push(row);
  try { localStorage.setItem(key(childId), JSON.stringify(rows.slice(-1800))); } catch { /* 存储不可用仍可学习 */ }
  window.dispatchEvent(new Event('math-evidence-change'));
  return row;
}

/** 每一目标看最近的真实检查；一次新的困难可以覆盖历史最好表现。 */
export function latestMathEvidence(rows: MathEvidence[]): MathEvidence[] {
  const latest = new Map<string, MathEvidence>();
  for (const row of rows) {
    if (row.context === 'readiness' || row.context === 'challenge') continue;
    const previous = latest.get(row.objective);
    const checked = row.source !== 'self' && row.level !== 'practiced';
    const wasChecked = previous && previous.source !== 'self' && previous.level !== 'practiced';
    if (!previous || checked && !wasChecked || checked === Boolean(wasChecked) && row.at >= previous.at) latest.set(row.objective, row);
  }
  return [...latest.values()];
}

export function mathEvidenceSummary(childId: string | null, lessonId: string) {
  const rows = latestMathEvidence(readMathEvidence(childId, lessonId));
  const needs = rows.find((row) => row.level === 'needs-practice') ?? rows.find((row) => row.level === 'supported');
  const recent = [...rows].sort((a, b) => b.at - a.at)[0];
  return { rows, needs, label: needs ? `${needs.objective}：${MATH_EVIDENCE_LABELS[needs.level]}` : recent ? `${recent.objective}：${MATH_EVIDENCE_LABELS[recent.level]}` : '新评价待验证，原有进度已保留' };
}

/** 复习日程不增加额外任务，优先选择最近困难或证据已到回顾时间的课。 */
export function mathEvidenceReviewPriority(childId: string, lessonId: string, now: number): number {
  const rows = latestMathEvidence(readMathEvidence(childId, lessonId));
  if (!rows.length) return 3;
  return rows.reduce((priority, row) => {
    const days = row.level === 'needs-practice' || row.level === 'practiced' ? 1 : row.level === 'supported' ? 3 : 7;
    if (row.at + days * 86_400_000 > now) return priority;
    return Math.max(priority, days === 1 ? 3 : days === 3 ? 2 : 1);
  }, 0);
}

export function mathAssessmentStars(levels: MathEvidenceLevel[]): number {
  const independent = levels.filter((level) => ['independent', 'transfer', 'retained'].includes(level)).length;
  return levels.length && independent === levels.length ? 3 : independent ? 2 : 1;
}

export function mathCheckLevel(context: MathEvidenceContext, supported: boolean, transfer: boolean, delayed: boolean): MathEvidenceLevel {
  if (supported) return 'supported';
  if (context === 'review' && delayed) return 'retained';
  return transfer ? 'transfer' : 'independent';
}
