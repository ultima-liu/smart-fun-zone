import CourseReplayButton from './CourseReplayButton';
import Modal from './Modal';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ALL_MATH_LESSONS } from '../content/mathUpperCurriculum';
import { mathAnswerCorrect, mathCoreQuestions, mathMisconception, mathQuestions, mathReviewQuestions, type MathQuestion, type MathVisual, type MathVisualObject } from '../content/mathTeaching';
import { mathArenaQuestions } from '../content/mathArenaQuestions';
import { mathAssessmentStars, mathCheckLevel, MATH_EVIDENCE_LABELS, recordMathEvidence, type MathEvidenceContext, type MathEvidenceLevel } from '../mathLearning';
import { playSfx, speakOnce, stopSpeaking } from '../speech';
import { useStore } from '../store';
import MathAnswerChoices from './MathAnswerChoices';
import { SolidShapeGlyph } from './SolidShapeGlyph';
import MathObjectGlyph, { MathStickBundle } from './MathObjectGlyph';
import '../math-teaching.css';

/** 同一组合面贴面，分界线表示原来的小方块，避免把分离图误当拼合。 */
export function MathCubeRow({ count }: { count: number }) {
  const n = Math.max(1, Math.min(4, count));
  const endX = 4 + 32 * n, endY = 24 + 15 * n;
  return <svg className="math-cube-row" width={endX + 28} height={endY + 34} viewBox={`0 0 ${endX + 28} ${endY + 34}`} aria-hidden="true">
    <g stroke="#664329" strokeWidth="2" strokeLinejoin="round">
      <path fill="#ffe6a4" d={`M4 24L28 9L${endX + 24} ${endY - 15}L${endX} ${endY}Z`} />
      <path fill="#e9ad55" d={`M4 24L${endX} ${endY}V${endY + 30}L4 54Z`} />
      <path fill="#bd7836" d={`M${endX} ${endY}L${endX + 24} ${endY - 15}V${endY + 15}L${endX} ${endY + 30}Z`} />
      {Array.from({ length: n - 1 }, (_, i) => { const x = 4 + 32 * (i + 1), y = 24 + 15 * (i + 1); return <path key={i} fill="none" d={`M${x + 24} ${y - 15}L${x} ${y}V${y + 30}`} />; })}
    </g>
  </svg>;
}

function MathObjectGroup({ object, count, label, taken = 0, spaced = false }: { object: MathVisualObject; count: number; label?: string; taken?: number; spaced?: boolean }) {
  return <div className="math-object-group"><b>{label ?? object.label}</b><div className={`math-object-items${spaced ? ' spaced' : ''}`} data-density={count > 10 ? 'dense' : 'normal'} style={{ '--object-columns': Math.max(1, Math.min(count, count > 10 ? 8 : 5)) } as CSSProperties}>
    {Array.from({ length: count }, (_, i) => <span key={i} className={`math-object-token${i < taken ? ' removed' : ''}`} data-size={object.size}><MathObjectGlyph kind={object.kind} /></span>)}
  </div></div>;
}

export function MathQuestionVisual({ visual }: { visual?: MathVisual }) {
  if (!visual) return null;
  const dots = (n: number) => Array.from({ length: n }, (_, i) => <i key={i}>●</i>);
  const first = visual.objects?.[0], second = visual.objects?.[1] ?? first;
  const description = visual.label ?? (first ? visual.kind === 'parts' ? `${visual.a}个${first.label}；${visual.b ?? 0}个${second?.label}` : `${visual.a}个${first.label}${visual.kind === 'take' ? `，其中${visual.b ?? 0}个已拿走` : ''}` : '作答观察材料');
  return <div className={`math-evidence-visual ${visual.kind}${first ? ' has-objects' : ''}`} role="img" aria-label={description}>
    {visual.kind === 'dots' && (first ? <MathObjectGroup object={first} count={visual.a} spaced={visual.spaced} /> : <div className="math-dot-group">{dots(visual.a)}</div>)}
    {visual.kind === 'parts' && (first && second ? <><MathObjectGroup object={first} count={visual.a} label={visual.groupLabels?.[0] ?? (first.label === second.label ? `第一组${first.label}` : first.label)} /><MathObjectGroup object={second} count={visual.b ?? 0} label={visual.groupLabels?.[1] ?? (first.label === second.label ? `第二组${second.label}` : second.label)} /></> : <><div className="math-dot-group">{dots(visual.a)}</div><span>另一组</span><div className="math-dot-group other">{dots(visual.b ?? 0)}</div></>)}
    {visual.kind === 'take' && <>{first ? <MathObjectGroup object={first} count={visual.a} taken={visual.b} /> : <div className="math-dot-group">{Array.from({ length: visual.a }, (_, i) => <i key={i} className={i < (visual.b ?? 0) ? 'removed' : ''}>●</i>)}</div>}<span className="math-taken-caption">虚线圈里的物体已{visual.label?.includes('移出') ? '移出' : '拿走'}</span></>}
    {visual.kind === 'ten' && <div className="math-ten-frame">{Array.from({ length: 10 }, (_, i) => <i key={i}>{i < visual.a ? '●' : ''}</i>)}</div>}
    {visual.kind === 'place' && <><div className="math-stick-place"><b>十 · 每捆10根</b><div>{Array.from({ length: visual.a }, (_, i) => <MathStickBundle key={i} />)}</div></div><div className="math-stick-place"><b>一 · 零散小棒</b><div>{Array.from({ length: visual.b ?? 0 }, (_, i) => <MathObjectGlyph key={i} kind="stick" />)}</div></div></>}
    {visual.kind === 'bundle' && <div className="math-stick-place"><b>捆在一起的小棒</b><MathStickBundle count={visual.a} /></div>}
    {visual.kind === 'queue' && <><small>从左编号 →</small><div className="math-queue">{Array.from({ length: visual.a }, (_, i) => <span key={i}>🧒<b>{i + 1}</b></span>)}</div></>}
    {visual.kind === 'positions' && <><small>从左编号 →</small><div className="math-position-slots">{Array.from({ length: visual.a }, (_, i) => <div key={i}><b>{i + 1}</b><span>{i + 1 === visual.b && first && <MathObjectGlyph kind={first.kind} />}</span></div>)}</div></>}
    {visual.kind === 'shape' && <div className="math-solid-view" style={visual.label?.includes('横放') || visual.label?.includes('上下') ? { transform: 'rotate(90deg)' } : undefined}>{visual.a > 1 ? <MathCubeRow count={visual.a} /> : <SolidShapeGlyph kind={visual.label?.includes('圆柱') ? 'cylinder' : visual.label?.includes('长方体') ? 'cuboid' : 'cube'} size={64} />}</div>}
    {visual.kind === 'sequence' && <span>{visual.label}</span>}
  </div>;
}

export type MathAssessmentReport = { stars: number; levels: MathEvidenceLevel[]; variant: number };
type Props = {
  lessonId: string; context: MathEvidenceContext; onDone: (report: MathAssessmentReport) => void;
  variant?: number; questions?: MathQuestion[]; brief?: boolean; delayed?: boolean;
  onReturnToTools?: () => void;
  onExit?: () => void;
  exitLabel?: string;
  sessionId?: string;
  autoFinish?: boolean;
};
type Progress = { version: 1; bank?: 'arena-v1' | 'core-v1'; variant: number; index: number; levels: MathEvidenceLevel[]; replacement: number; supported: boolean };

function readProgress(key: string, variant?: number): Progress {
  const empty: Progress = { version: 1, bank: 'arena-v1', variant: variant ?? Date.now() % 100000, index: 0, levels: [], replacement: 0, supported: false };
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null') as Progress | null;
    if (saved?.version === 1 && Number.isInteger(saved.variant) && Number.isInteger(saved.index) && saved.index >= 0
      && (saved.bank === undefined || saved.bank === 'arena-v1' || saved.bank === 'core-v1')
      && Array.isArray(saved.levels) && saved.levels.length === saved.index && saved.levels.every((level) => Object.prototype.hasOwnProperty.call(MATH_EVIDENCE_LABELS, level))
      && Number.isInteger(saved.replacement) && saved.replacement >= 0 && typeof saved.supported === 'boolean' && (variant === undefined || saved.variant === variant)) return { ...saved, bank: saved.bank ?? (saved.index > 0 ? 'core-v1' : 'arena-v1') };
  } catch { /* 损坏快照从新题开始 */ }
  return empty;
}

/** 学习时可试错；掌握判断看当前新题是否独立完成，不累计惩罚过去错误。 */
export default function MathAssessmentPractice({ lessonId, context, onDone, variant, questions, brief, delayed = false, onReturnToTools, onExit, exitLabel = '返回课程', sessionId, autoFinish = false }: Props) {
  const childId = useStore((s) => s.activeChildId);
  const addWrong = useStore((s) => s.addWrong);
  const removeWrong = useStore((s) => s.removeWrong);
  const storageKey = `sfz-math-assessment-v1:${childId ?? 'guest'}:${lessonId}:${context}${sessionId ? `:${sessionId}` : ''}`;
  const [progress, setProgress] = useState<Progress>(() => readProgress(storageKey, variant));
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [correct, setCorrect] = useState(false);
  const [done, setDone] = useState(false);
  const [worked, setWorked] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const source = useMemo(() => questions ?? (context === 'review' ? mathReviewQuestions(lessonId, progress.variant) : context === 'lesson' && progress.bank === 'arena-v1' ? mathArenaQuestions(lessonId, progress.variant) : mathQuestions(lessonId, progress.variant)), [context, lessonId, progress.bank, progress.variant, questions]);
  const items = useMemo(() => context === 'checkpoint' ? mathCoreQuestions(source).slice(0, 2) : brief && context === 'lesson' ? mathCoreQuestions(source) : source, [brief, context, source]);
  const original = items[Math.min(progress.index, items.length - 1)];
  const q = original && progress.replacement ? (original.id.includes(':arena:') ? mathArenaQuestions : mathQuestions)(original.lessonId, progress.variant + progress.replacement * 7).find((item) => item.objective === original.objective) ?? original : original;
  // 题库已经用题号稳定打乱；相同排列重复打乱会产生答案位置偏差。
  const options = q?.options ?? [];

  useEffect(() => {
    if (done) { try { localStorage.removeItem(storageKey); } catch { /* 学习不中断 */ } return; }
    try { localStorage.setItem(storageKey, JSON.stringify(progress)); } catch { /* 学习不中断 */ }
  }, [done, progress, storageKey]);

  const record = (level: MathEvidenceLevel, note: string) => {
    if (!q) return;
    recordMathEvidence(childId, { lessonId, taskId: `${context}:${progress.index}`, objective: original.objective, level, source: 'check', context, variant: progress.variant + progress.replacement * 7, note });
  };
  const submit = (answer = input) => {
    if (!q || correct || done || !answer.trim()) return;
    setInput(answer);
    if (mathAnswerCorrect(q, answer)) {
      const level = mathCheckLevel(context, progress.supported, Boolean(q.transfer), delayed);
      record(level, `${q.prompt} 作答：${answer}。${progress.supported ? '本题使用了支持或重试。' : '新题首次独立完成。'}`);
      if (childId && !progress.supported && context !== 'readiness' && context !== 'challenge') {
        const wrongs = useStore.getState().wrongs[childId] ?? [];
        wrongs.filter((wrong) => wrong.lessonId === `math-lab-${lessonId}` && wrong.mathLessonId === q.lessonId && wrong.objective === original.objective && wrong.mathVariant !== progress.variant + progress.replacement * 7)
          .forEach((wrong) => removeWrong(childId, wrong.uid));
      }
      setCorrect(true); setFeedback(`${MATH_EVIDENCE_LABELS[level]}。可以把答案放回材料检查。`); playSfx('correct');
    } else {
      const diagnosis = mathMisconception(q, answer);
      setMistakes((n) => n + 1); setProgress((p) => ({ ...p, supported: true }));
      setFeedback(`${diagnosis.diagnosis} ${diagnosis.remedy}`); playSfx('wrong');
      record('needs-practice', `${diagnosis.diagnosis} 作答：${answer}`);
      if (childId && context !== 'readiness' && context !== 'challenge') {
        addWrong(childId, { uid: `math:${lessonId}:${q.id}`, lessonId: `math-lab-${lessonId}`, lessonName: ALL_MATH_LESSONS.find((l) => l.id === lessonId)?.title ?? lessonId,
          question: q.prompt, kind: q.objective, objective: q.objective, answer, diagnosis: diagnosis.diagnosis, remedy: diagnosis.remedy,
          options: q.options, correctAnswer: q.answer, mathLessonId: q.lessonId, mathVariant: progress.variant + progress.replacement * 7,
          mathQuestionIndex: Number(q.id.split(':').slice(-1)[0]), ...(q.id.includes(':arena:') ? { mathQuestionBank: 'arena-v1' as const } : {}), time: Date.now() });
      }
    }
  };
  const next = useCallback(() => {
    if (!q || !correct) return;
    const level = mathCheckLevel(context, progress.supported, Boolean(q.transfer), delayed);
    const levels = [...progress.levels, level];
    if (progress.index + 1 >= items.length) {
      setProgress((p) => ({ ...p, levels, index: p.index + 1 })); setDone(true);
      onDone({ stars: mathAssessmentStars(levels), levels, variant: progress.variant });
      if (context === 'lesson') playSfx('win');
    } else {
      setProgress((p) => ({ ...p, levels, index: p.index + 1, replacement: 0, supported: false }));
      setInput(''); setFeedback(''); setCorrect(false); setWorked(false); setMistakes(0);
    }
  }, [context, correct, delayed, items.length, onDone, progress, q]);
  useEffect(() => {
    if (!autoFinish || !correct || done || progress.index + 1 !== items.length) return;
    const timer = window.setTimeout(next, 1000);
    return () => window.clearTimeout(timer);
  }, [autoFinish, correct, done, items.length, next, progress.index]);
  const fresh = () => {
    setProgress((p) => ({ ...p, replacement: p.replacement + 1, supported: false }));
    setInput(''); setFeedback('换了数字或材料，试着独立解决这道新题。'); setWorked(false); setMistakes(0);
  };
  const retry = (newQuestions = false) => {
    setProgress({ version: 1, bank: newQuestions ? 'arena-v1' : progress.bank, variant: progress.variant + (newQuestions ? 11 : 0), index: 0, levels: [], replacement: 0, supported: false });
    setDone(false); setCorrect(false); setInput(''); setFeedback(''); setWorked(false); setMistakes(0);
  };
  if (done) return <section className={`math-assessment math-assessment-complete context-${context}`} aria-label="数学学习反馈" data-math-narration-key={`${context}:complete:${progress.variant}`} data-math-narration={`这组练习已完成。${onExit ? `可以${exitLabel}，也可以再做一次。` : '可以再做一次。'}${context === 'lesson' ? '还可以换一组新题。' : ''}`}>
    <div className="math-assessment-result">
      <span className="math-result-mark" aria-hidden="true">✓</span><h3>这组练习已完成</h3>
      {context === 'lesson' && <div className="mt-stars" aria-label={`${mathAssessmentStars(progress.levels)} 星`}>{'⭐'.repeat(mathAssessmentStars(progress.levels))}</div>}
      <p>{context === 'lesson' ? '学习进度和星星已保存，继续加油！' : '你完成了这组练习，继续加油！'}</p>
    </div>
    <div className="math-assessment-result-actions"><h4>接下来想做什么？</h4>{onExit && <button type="button" className="math-result-primary" onClick={onExit}>{exitLabel}</button>}<button type="button" onClick={() => retry()}>再做一次</button>
      {context === 'lesson' && <><button type="button" className="math-result-primary" onClick={() => retry(true)}>换一组新题，再独立试试</button><MathOptionalChallenge lessonId={lessonId} variant={progress.variant + 17} /></>}
    </div>
  </section>;
  if (!q) return <p role="status">本课评价材料需要重新加载。</p>;
  return <section className={`math-assessment mt-arena context-${context}`} data-math-narration-key={`${context}:${progress.variant}:${progress.index}:${progress.replacement}`} data-math-narration={`${q.prompt}。${q.kind === 'choice' ? `答案选项：${options.map((option, index) => `选项${index + 1}，${option}`).join('；')}。` : q.kind === 'expression' ? '填写要求：写出完整算式，填写后点击检查我的答案。' : '填写要求：写出你的答案，填写后点击检查我的答案。'}`} data-question-layout={q.visual ? 'material' : 'plain'} data-answer-kind={q.kind} data-question-density={q.prompt.length <= 30 && q.kind !== 'expression' ? 'brief' : 'regular'} aria-label={context === 'review' ? '数学变式复习' : context === 'readiness' ? '先备能力小检查' : '数学目标检测'}>
    <header><span>{context === 'readiness' ? '先看看已经会什么' : context === 'checkpoint' ? '离开前独立想一想' : context === 'review' ? '换材料回想，再混合练一题' : '把方法用到新问题'} · {Math.min(progress.index + 1, items.length)}/{items.length}</span><small>本题考查：{original.objective}</small></header>
    <div className="math-assessment-workspace">
    <div className="math-assessment-prompt"><h3>{q.prompt}</h3><CourseReplayButton label="听题" title="朗读题目" onClick={() => speakOnce(q.prompt, 'zh', .86)} /></div>
    {(q.visual || worked) && <div className="math-assessment-demo" aria-label="题目演示">
      <MathQuestionVisual visual={q.visual} />
      {worked && <aside className="math-worked-example"><b>本题示范：{q.answer}</b><p>{q.hint}</p><button type="button" onClick={fresh}>收起示范，换一道新题</button></aside>}
    </div>}
    <div className="math-assessment-answer" aria-label="作答区域">{q.kind === 'choice' ? <MathAnswerChoices options={options} className="mt-arena-opts">{options.map((option) => <button type="button" key={option} disabled={correct} className={input === option ? correct ? 'is-correct' : 'is-wrong' : ''} onClick={() => submit(option)}>{option}</button>)}</MathAnswerChoices>
      : <form className="math-answer-form" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <label>{q.kind === 'expression' ? '写出完整算式' : '写出你的答案'}<input aria-label={q.kind === 'expression' ? '完整算式' : '独立答案'} inputMode={q.kind === 'number' ? 'numeric' : 'text'} autoComplete="off" maxLength={q.kind === 'number' ? 2 : 18} value={input} disabled={correct} onChange={(event) => setInput(event.target.value)} /></label>
        {q.kind === 'expression' && <div className="math-equation-keys" aria-label="算式输入键">{['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '+', '-', '='].map((key) => <button type="button" key={key} disabled={correct} onClick={() => setInput((text) => (text + key).slice(0, 18))}>{key}</button>)}<button type="button" disabled={correct} onClick={() => setInput((text) => text.slice(0, -1))}>退一格</button></div>}
        <button type="submit" disabled={correct || !input.trim()}>检查我的答案</button>
      </form>}
    </div><div className="math-assessment-hints" aria-label="提示与反馈">
    {feedback && !worked && <p className={correct ? 'math-good' : 'math-feedback'} role="status">{feedback}</p>}
    {!correct && <div className="math-support-actions"><span className="math-hints-label">💡 提示</span><button type="button" onClick={() => { setProgress((p) => ({ ...p, supported: true })); setFeedback(q.hint); }}>给我一点提示</button>{onReturnToTools && <button type="button" onClick={onReturnToTools}>回到学具摆一摆</button>}
      {mistakes > 0 && <button type="button" onClick={fresh}>检查方法后，换新题独立试</button>}
      {mistakes > 1 && <button type="button" onClick={() => { setWorked(true); setProgress((p) => ({ ...p, supported: true })); }}>看一次示范</button>}
    </div>}
    {correct && !done && (autoFinish && progress.index + 1 === items.length ? <p role="status">✓ 本组完成，正在记录结果…</p> : <button type="button" className="ct-primary" onClick={next}>{progress.index + 1 === items.length ? '完成这组练习 →' : '下一题 →'}</button>)}
    </div></div>

  </section>;
}

function MathOptionalChallenge({ lessonId, variant }: { lessonId: string; variant: number }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const close = useCallback(() => { setOpen(false); stopSpeaking(); }, []);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [close, open]);
  const questions = useMemo(() => mathQuestions(lessonId, variant).slice(3), [lessonId, variant]);
  return <div className="math-optional-challenge"><p>还想挑战吗？这里继续用本课范围的新问题，结果单独记录。</p><button type="button" onClick={() => open ? close() : setOpen(true)}>{open ? '收起挑战' : '我想挑战一下'}</button>{open && <Modal onClose={close}><div className="math-challenge-dialog" role="dialog" aria-modal="true" aria-label="试试新的挑战"><header className="math-challenge-header"><h2>试试新的挑战</h2><button type="button" onClick={close}>退出挑战</button></header><MathAssessmentPractice lessonId={lessonId} context="challenge" variant={variant} questions={questions} onDone={() => setDone(true)} onExit={close} /></div></Modal>}{done && <p>挑战完成，本课星级保持不变。</p>}</div>;
}
