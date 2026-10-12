import { useEffect, useState } from 'react';
import { latestMathEvidence, MATH_EVIDENCE_LABELS, readMathEvidence } from '../mathLearning';
import '../math-teaching.css';
import { ALL_MATH_LESSONS } from '../content/mathUpperCurriculum';

export default function MathParentEvidence({ childId }: { childId: string }) {
  const [, refresh] = useState(0);
  useEffect(() => { const update = () => refresh((n) => n + 1); window.addEventListener('math-evidence-change', update); return () => window.removeEventListener('math-evidence-change', update); }, []);
  const rows = readMathEvidence(childId);
  const latest = [...new Set(rows.map((row) => row.lessonId))].flatMap((lessonId) => latestMathEvidence(rows.filter((row) => row.lessonId === lessonId)));
  const needs = latest.filter((row) => row.level === 'needs-practice' || row.level === 'supported').sort((a, b) => b.at - a.at);
  const independent = latest.filter((row) => ['independent', 'transfer', 'retained'].includes(row.level));
  const unverified = latest.filter((row) => row.level === 'practiced');
  return <section className="math-parent-evidence" aria-label="数学能力与最近表现"><h3>数学能力与最近表现</h3><p>独立或迁移完成 {independent.length} 项 · 需要支持 {needs.length} 项。历史星星保留，能力判断使用最近检查。</p>
    {unverified.length > 0 && <p>另有 {unverified.length} 项自记练习等待回看，未计入独立掌握。</p>}
    {latest.length ? <ul>{[...needs, ...independent.sort((a, b) => b.at - a.at)].slice(0, 8).map((row) => <li key={`${row.lessonId}:${row.objective}`}>《{ALL_MATH_LESSONS.find((lesson) => lesson.id === row.lessonId)?.title ?? row.lessonId}》{row.objective}：{MATH_EVIDENCE_LABELS[row.level]}<small> · {row.source === 'ai' ? 'AI 确认' : row.source === 'adult' ? '家长观察' : '实际作答'}</small></li>)}</ul> : <p>新评价尚未记录。自记练习和语音文字不会自动记为掌握。</p>}
  </section>;
}
