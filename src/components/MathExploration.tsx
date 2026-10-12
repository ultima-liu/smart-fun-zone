import PracticeAgain from './PracticeAgain';
import { usePracticeAttempt } from '../usePracticeAttempt';
import { useMemo, useState } from 'react';
import { explorationAnswerCorrect, mathExplorationPlan, type ExplorationScene } from '../content/mathExplorations';
import { recordMathEvidence } from '../mathLearning';
import { useStore } from '../store';
import { useMathLessonTaskProgress } from './MathTextbookTaskPack';
import { MathCubeRow } from './MathAssessmentPractice';
import MathAnswerChoices from './MathAnswerChoices';
import { SolidShapeGlyph } from './SolidShapeGlyph';
import MathObjectGlyph, { MathStickBundle } from './MathObjectGlyph';
import '../math-teaching.css';

type Progress = { version: 2; round: number; stage: number; input: string; actions: number; assisted: boolean; done: boolean };
const initial = (done = false, round = 0): Progress => ({ version: 2, round, stage: 0, input: '', actions: 0, assisted: false, done });
function validProgress(saved: Progress, legacyDone: boolean): Progress {
  return saved?.version === 2 && Number.isInteger(saved.round) && saved.round >= 0 && Number.isInteger(saved.stage) && saved.stage >= 0 && saved.stage < 2
    && Number.isInteger(saved.actions) && saved.actions >= 0 && typeof saved.input === 'string' && typeof saved.done === 'boolean' && typeof saved.assisted === 'boolean'
    ? saved : initial(legacyDone);
}

export function ExplorationMaterial({ scene }: { scene: ExplorationScene }) {
  const a = scene.a ?? 0, b = scene.b ?? 0;
  const token = (count: number, emoji: string, offset = 0) => Array.from({ length: count }, (_, i) => <span key={i} className={i + offset < (scene.removed ?? 0) ? 'taken' : ''}>{emoji}</span>);
  return <div className={`math-exploration-material kind-${scene.kind} ${scene.spaced ? 'spaced' : ''} ${scene.joined ? 'joined' : ''} ${scene.paired ? 'paired' : ''}`} role="img" aria-label={scene.label}>
    {scene.kind === 'tokens' && <div className={`math-exploration-groups ${scene.swapped ? 'swapped' : ''}`}><div>{token(a, scene.emoji ?? '●')}</div>{b > 0 && <div className="other">{token(b, scene.secondEmoji ?? '●', a)}</div>}</div>}
    {scene.kind === 'ten' && <><div className="math-ten-frame">{Array.from({ length: 10 }, (_, i) => <i key={i}>{i < a ? scene.emoji === '│' ? <MathObjectGlyph kind="stick" /> : '●' : ''}</i>)}</div>{b > 0 && <div className="math-exploration-loose">{token(b, scene.emoji ?? '●')}</div>}</>}
    {scene.kind === 'place' && <><div className="math-bundle-inquiry">{scene.bundled ? <MathStickBundle /> : Array.from({ length: 10 }, (_, i) => <MathObjectGlyph key={i} kind="stick" />)}</div>{b > 0 && <div className="math-exploration-loose">{Array.from({ length: b }, (_, i) => <MathObjectGlyph key={i} kind="stick" />)}</div>}</>}
    {scene.kind === 'queue' && <><small>{scene.label}</small><div className="math-queue">{Array.from({ length: a }, (_, i) => <span key={i} className={scene.highlight === i ? 'highlighted' : ''}>🧒<b>{i + 1}</b></span>)}</div></>}
    {scene.kind === 'solids' && <div className={`math-rotate-inquiry ${scene.rotated ? 'rotated' : ''} ${scene.scaled ? 'scaled' : ''} ${scene.combined ? 'combined' : ''}`}>
      {scene.combined && scene.a ? <MathCubeRow count={a} /> : scene.shapes?.map((shape, i) => <SolidShapeGlyph key={i} kind={shape === 'sphere' ? 'ball' : shape} size={72} />)}
    </div>}
    {scene.cards && <div className="math-exploration-cards">{scene.cards.map((card, i) => <span key={i} className={scene.highlight === i ? 'highlighted' : ''}>{card}</span>)}</div>}
  </div>;
}

/** 每课有独立探索计划，先改变实际材料再作判断；旧版完成记录继续有效。 */
export function MathExploration({ lessonId, onDone }: { lessonId: string; onDone: () => void }) {
  const childId = useStore(s => s.activeChildId);
  const [legacy, setLegacy] = useMathLessonTaskProgress<{ done?: boolean }>('teaching-exploration-v1', {});
  const [saved, setSaved] = useMathLessonTaskProgress<Progress>('teaching-exploration-v2', initial(Boolean(legacy.done)));
  const [state, saveAttempt, complete, restartAttempt] = usePracticeAttempt(validProgress(saved, Boolean(legacy.done)), setSaved, initial(), value => value.done);
  const [message, setMessage] = useState('');
  const plan = useMemo(() => mathExplorationPlan(lessonId, state.round), [lessonId, state.round]);
  const stage = plan.stages[state.stage];
  const actions = Math.min(state.actions, stage.actions.length);
  const material = actions ? stage.actions[actions - 1].scene : stage.scene;
  const update = (patch: Partial<Progress>) => saveAttempt({ ...state, ...patch });
  const submit = (answer = state.input) => {
    if (actions !== stage.actions.length || !answer.trim()) return;
    const correct = explorationAnswerCorrect(stage.question, answer);
    recordMathEvidence(childId, { lessonId, taskId: `operation-inquiry-v2:${state.stage}`, objective: stage.question.objective,
      level: correct ? state.assisted ? 'supported' : 'independent' : 'needs-practice', source: 'check', context: 'operation', variant: state.round,
      note: `${plan.title}。${stage.actions.map(action => action.label).join(' → ')}。${stage.question.prompt} 作答：${answer}` });
    if (!correct) { update({ assisted: true, input: answer }); setMessage(`回看刚才改变的材料：${stage.question.hint}`); return; }
    if (state.stage + 1 === plan.stages.length) {
      update({ done: true, input: answer }); setLegacy({ ...legacy, done: true }); onDone();
    } else { update({ stage: state.stage + 1, actions: 0, input: '', assisted: false }); }
    setMessage('这一步已经核对，继续观察下一种变化。');
  };
  const restart = () => { restartAttempt(); setMessage('先操作，再判断；已完成进度保留。'); };
  return <section className="math-inquiry" aria-label="数学小探索" data-lesson={lessonId} data-stage={state.stage}>
    <PracticeAgain complete={complete} onRestart={restart} /><h3>数学小探索 · {plan.title}</h3><p>{plan.purpose}</p><small>观察 {state.stage + 1}/{plan.stages.length} · {stage.question.objective}</small>
    <div className="math-exploration-workspace"><div className="math-exploration-observe"><div className="math-exploration-comparison">{actions > 0 && <section aria-label="操作前的探索材料"><b>操作前</b><ExplorationMaterial scene={stage.scene} /></section>}<section aria-label="当前探索材料"><b>{actions > 0 ? '操作后' : '先观察材料'}</b><ExplorationMaterial scene={material} /></section></div>
    <div className="math-exploration-actions" aria-label="改变探索材料">{stage.actions.map((action, i) => <button type="button" key={action.id} disabled={i !== actions} aria-pressed={i < actions} onClick={() => { update({ actions: actions + 1 }); setMessage('材料已经改变，仔细观察后再判断。'); }}>{i < actions ? '✓ ' : ''}{action.label}</button>)}</div>
    </div><div className="math-exploration-judge"><h4>{stage.question.prompt}</h4>
    {stage.question.kind === 'choice' ? <MathAnswerChoices options={stage.question.options ?? []}>{stage.question.options?.map(option => <button type="button" key={option} disabled={actions !== stage.actions.length} onClick={() => submit(option)}>{option}</button>)}</MathAnswerChoices> : <form onSubmit={event => { event.preventDefault(); submit(); }}>
      <label>{stage.question.kind === 'expression' ? '写出这一步的完整算式' : '写出观察到的数量'}<input aria-label={stage.question.kind === 'expression' ? '探索完整算式' : '探索答案'} inputMode={stage.question.kind === 'number' ? 'numeric' : 'text'} maxLength={20} disabled={actions !== stage.actions.length} value={state.input} onChange={event => update({ input: event.target.value })} /></label>
      {stage.question.kind === 'expression' && <div className="math-equation-keys" aria-label="探索算式输入键">{['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '+', '-', '='].map(key => <button type="button" key={key} disabled={actions !== stage.actions.length} onClick={() => update({ input: (state.input + key).slice(0, 20) })}>{key}</button>)}<button type="button" disabled={actions !== stage.actions.length} onClick={() => update({ input: state.input.slice(0, -1) })}>退一格</button></div>}
      <button type="submit" disabled={actions !== stage.actions.length || !state.input.trim()}>检查探索判断</button>
    </form>}
    {message && <p role="status">{message}</p>}</div></div>
  </section>;
}
