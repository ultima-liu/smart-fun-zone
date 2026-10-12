import { MathKnowledgeLine } from '../components/MathKnowledgeLine';
import { mathKnowledgeLineActivity, mathKnowledgeLineState } from '../content/mathKnowledgeLine';
import PracticeAgain from '../components/PracticeAgain';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useMathLessonTaskProgress } from '../components/MathTextbookTaskPack';
import { MathStickBundle } from '../components/MathObjectGlyph';
import { playSfx } from '../speech';
import { LESSON_NARRATION_START, LESSON_NARRATION_END, LESSON_NARRATION_CANCEL } from '../lessonTabNarration';
import { MATH_KNOWLEDGE_EXTENSION, type MathBridgeModel } from '../content/mathKnowledgeExtension';
import { ALL_MATH_LESSONS } from '../content/mathUpperCurriculum';
import { mathOptions } from '../content/mathTeaching';

function Model({ model, lessonId, done, tapped, selected, onTap, onSelect, onDone, replayControl }: { replayControl?: ReactNode; model: MathBridgeModel; lessonId: string; done: boolean; tapped: number; selected: number[]; onTap: (value: number) => void; onSelect: (value: number[]) => void; onDone: () => void }) {
  const heading = (title: string) => replayControl
    ? <div className="mt-knowledge-card-head"><b>{title}</b>{replayControl}</div>
    : <b>{title}</b>;
  if (model.kind === 'ten') {
    const needed = Math.min(model.add, 10 - model.filled);
    return <div className="mt-knowledge-model">
      <b>十格板 · 先看还差几格</b>
      <p>已有 {model.filled} 个，请点亮 {needed} 个空格，看看怎样凑成 10。</p>
      <div className="mt-knowledge-ten" role="group" aria-label="凑十操作">
        {Array.from({ length: 10 }, (_, index) => <button key={index} type="button" className={index < model.filled ? 'filled' : selected.includes(index) ? 'added' : ''} disabled={index < model.filled || selected.includes(index) || done} aria-label={`第 ${index + 1} 格`} onClick={() => { const next = [...selected, index]; onSelect(next); playSfx('tap'); if (next.length === needed) onDone(); }}>{index < model.filled ? '●' : selected.includes(index) ? '★' : ''}</button>)}
      </div>
      <strong>{done ? `${model.filled}＋${needed}＝10${model.leftover ? `，余下 ${model.leftover} 个：10＋${model.leftover}＝${10 + model.leftover}` : ''}` : `还差 ${needed - selected.length} 格`}</strong>
    </div>;
  }
  if (model.kind === 'place') {
    const firstBundle = lessonId === 'ten-again';
    return <div className="mt-knowledge-model">
      {heading('数位小棒 · 十个一换一个十')}
      {firstBundle && !done ? <><p>逐根点数，数到 10 后一起捆成一捆。</p><div className="mt-knowledge-sticks" role="group" aria-label="数十根小棒">{Array.from({ length: 10 }, (_, index) => <button type="button" key={index} className={index < tapped ? 'counted' : ''} disabled={index !== tapped} aria-label={`第 ${index + 1} 根小棒`} onClick={() => { const next = tapped + 1; onTap(next); playSfx('tap'); if (next === 10) onDone(); }}>│</button>)}</div><strong>已数 {tapped} 根，还差 {10 - tapped} 根</strong></> : <div className="mt-knowledge-place"><div><span>十位</span><strong>{model.tens}</strong><small>{Array.from({ length: model.tens }, (_, i) => <i key={i} aria-label="一捆十根小棒"><MathStickBundle /></i>)}</small></div><div><span>个位</span><strong>{model.ones}</strong><small>{Array.from({ length: model.ones }, (_, i) => <i key={i} aria-label="一根小棒">│</i>)}</small></div></div>}
      <p>一捆仍有 10 根；如果右边的个位是 0，就表示没有零散的小棒。</p>
    </div>;
  }
  if (model.kind === 'count') return <div className="mt-knowledge-model">{heading('一个实物对应一个数词')}<div className="mt-knowledge-count">{Array.from({ length: model.total }, (_, index) => <span key={index}><i>●</i><strong>{index + 1}</strong></span>)}</div><p>点的大小、颜色变化，个数不变；最后一个数词表示这一组的总数。</p></div>;
  if (model.kind === 'pair') return <div className="mt-knowledge-model">{heading('一一配对，看哪边有剩余')}<div className="mt-knowledge-pair"><div>{Array.from({ length: model.left }, (_, i) => <span key={i}>●</span>)}</div><div>{Array.from({ length: model.right }, (_, i) => <span key={i} className={i >= model.left ? 'extra' : ''}>●</span>)}</div></div><p>先配对，再看剩下；不要只靠两排的长短猜。</p></div>;
  if (model.kind === 'whole') return <div className="mt-knowledge-model">{heading('整体与两个部分')}<div className="mt-knowledge-whole"><strong>{model.left + model.right}<small>整体</small></strong><span>＝</span><strong>{model.left}<small>第一部分</small></strong><span>＋</span><strong>{model.right}<small>第二部分</small></strong></div><p>问题问哪一部分？先画清关系，再决定怎样算。</p></div>;
  if (model.kind === 'line') return <MathKnowledgeLine lessonId={lessonId} values={model.values} selected={selected} done={done} onSelect={onSelect} onDone={onDone} />;
  if (model.kind === 'shape') return <div className="mt-knowledge-model">{heading('同一种形状，换个朝向试一试')}<div className="mt-knowledge-shapes"><span className="box">平面支撑</span><span className="cylinder">竖放稳</span><span className="ball">曲面会滚</span></div><p>观察接触的面和支撑范围，而不是只看颜色。</p></div>;
  return <div className="mt-knowledge-model">{heading('按步骤把想法说清')}<div className="mt-knowledge-steps">{model.labels.map((label, index) => <span key={label}><i>{index + 1}</i>{label}</span>)}</div><p>每一步都回到题目和操作中检查。</p></div>;
}

function mathModelExplanation(model: MathBridgeModel): string {
  if (model.kind === 'count') return `一个实物对应一个数词。这一组有 ${model.total} 个点。点的大小、颜色变化，个数不变；最后一个数词表示这一组的总数。`;
  if (model.kind === 'pair') return `一一配对，看哪边有剩余。上面 ${model.left} 个，下面 ${model.right} 个，相差 ${Math.abs(model.left - model.right)} 个。先配对，再看剩下；不要只靠两排的长短猜。`;
  if (model.kind === 'whole') return `整体与两个部分。第一部分 ${model.left}，第二部分 ${model.right}，合起来是 ${model.left + model.right}。问题问哪一部分？先画清关系，再决定怎样算。`;
  if (model.kind === 'place') return `数位小棒。十位是 ${model.tens}，表示 ${model.tens} 捆十根小棒；个位是 ${model.ones}，表示 ${model.ones} 根零散小棒。一捆仍有 10 根；个位是 0，就表示没有零散的小棒。`;
  if (model.kind === 'shape') return '同一种形状，换个朝向试一试。盒子的平面可以支撑；圆柱竖放稳；球的曲面会滚。观察接触的面和支撑范围，而不是只看颜色。';
  if (model.kind === 'steps') return `按步骤把想法说清。${model.labels.map((label, i) => `第 ${i + 1} 步，${label}`).join('。')}。每一步都回到题目和操作中检查。`;
  return '';
}

type KnowledgeProgress = { step: number; explained: boolean; modelDone: boolean; tapped: number; selected: number[]; pick: string | null; attempts: number };
const emptyProgress: KnowledgeProgress = { step: 0, explained: false, modelDone: false, tapped: 0, selected: [], pick: null, attempts: 0 };
const stages = ['先听讲解', '再动手', '换个情景试一试'];

/** 一课一桥：讲解、操作与迁移按顺序解锁，回看和重做保留历史完成。 */
export function MathKnowledgeBridge({ lessonId, onComplete, complete, replayControl }: { replayControl?: ReactNode; lessonId: string; onComplete: () => void; complete: boolean }) {
  const card = MATH_KNOWLEDGE_EXTENSION[lessonId];
  const needsOperation = card?.model.kind === 'line' || card?.model.kind === 'ten' || card?.model.kind === 'place' && lessonId === 'ten-again';
  const [saved, save] = useMathLessonTaskProgress<KnowledgeProgress>('knowledge-sequence-v1', complete
    ? { ...emptyProgress, explained: true, modelDone: true, tapped: 10, selected: card?.model.kind === 'ten' ? Array.from({ length: Math.min(card.model.add, 10 - card.model.filled) }, (_, index) => card.model.kind === 'ten' ? card.model.filled + index : index) : [], pick: card?.answer ?? null }
    : emptyProgress);
  const [draft, setDraft] = useState<KnowledgeProgress | null>(null);
  const progress = draft ?? saved;
  const update = (change: (current: KnowledgeProgress) => KnowledgeProgress) => {
    if (draft !== null) setDraft(current => change(current ?? saved));
    else save(change);
  };
  const [playing, setPlaying] = useState(false);
  const [audioMessage, setAudioMessage] = useState('');
  const host = useRef<HTMLElement>(null);
  const [lectureRun, setLectureRun] = useState(0);
  const id = useId();
  const unlocked = progress.modelDone && progress.explained ? 2 : progress.explained ? 1 : 0;
  const step = Math.min(progress.step, unlocked);
  useEffect(() => {
    const panels = host.current?.querySelectorAll<HTMLElement>('[data-lesson-explanation]');
    const start = () => { setPlaying(true); setAudioMessage(''); };
    const cancel = () => setPlaying(false);
    const end = (event: Event) => {
      const panel = event.currentTarget as HTMLElement;
      if (panel.closest('[hidden]')) return;
      const played = (event as CustomEvent<{ played: boolean }>).detail.played;
      const observation = panel.dataset.knowledgeLecture === 'model';
      setPlaying(false);
      setAudioMessage(played ? '' : '声音暂时不能播放，可以看上面的讲解再继续。');
      update(current => {
        const first = observation ? !current.modelDone : !current.explained;
        return { ...current, ...(observation ? { modelDone: true } : { explained: true }), step: played && first ? observation ? 2 : 1 : current.step };
      });
    };
    panels?.forEach(panel => { panel.addEventListener(LESSON_NARRATION_START, start); panel.addEventListener(LESSON_NARRATION_END, end); panel.addEventListener(LESSON_NARRATION_CANCEL, cancel); });
    return () => panels?.forEach(panel => { panel.removeEventListener(LESSON_NARRATION_START, start); panel.removeEventListener(LESSON_NARRATION_END, end); panel.removeEventListener(LESSON_NARRATION_CANCEL, cancel); });
  });
  useEffect(() => {
    if (!complete && progress.explained && progress.modelDone && progress.pick === card?.answer) onComplete();
  }, [card?.answer, complete, onComplete, progress.explained, progress.modelDone, progress.pick]);
  if (!card) return null;
  const right = progress.pick === card.answer;
  const lineActivity = card.model.kind === 'line' ? mathKnowledgeLineActivity(lessonId, card.model.values) : null;
  const lineState = lineActivity ? mathKnowledgeLineState(lineActivity, progress.selected, progress.modelDone) : null;
  const select = (next: number) => {
    if (next > unlocked) return;
    update(current => ({ ...current, step: next }));
  };
  const lecture = `${card.title}。${card.insight}。例如，${card.example}。记住，${card.mnemonic}`;
  const observation = mathModelExplanation(card.model);
  return <section className="mt-knowledge" aria-label="本课知识延伸" ref={host}>
    <PracticeAgain complete={complete} onRestart={() => { setAudioMessage(''); setDraft({ ...emptyProgress }); setLectureRun(run => run + 1); }} />
    <div className="mt-knowledge-head"><span>知识延伸 · {card.domain}</span><h4>{card.title}</h4>{card.from && <small>从《{ALL_MATH_LESSONS.find(lesson => lesson.id === card.from)?.title ?? card.from}》学到的方法继续往前走</small>}</div>
    <nav className="mt-knowledge-tabs" role="tablist" aria-label="知识延伸学习顺序">{stages.map((label, index) => <button type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={step === index} tabIndex={step === index ? 0 : -1} disabled={index > unlocked} key={label} onClick={() => select(index)} onKeyDown={event => {
      const next = event.key === 'ArrowRight' ? (step + 1) % (unlocked + 1) : event.key === 'ArrowLeft' ? (step + unlocked) % (unlocked + 1) : event.key === 'Home' ? 0 : event.key === 'End' ? unlocked : null;
      if (next === null) return;
      event.preventDefault(); select(next); document.getElementById(`${id}-tab-${next}`)?.focus();
    }}><span>{(index === 0 ? progress.explained : index === 1 ? progress.modelDone : right) ? '✓' : index + 1}</span>{label}</button>)}</nav>
    <div className="mt-knowledge-workbench">
      <div className="mt-knowledge-stage" role="tabpanel" id={`${id}-panel-0`} aria-labelledby={`${id}-tab-0`} hidden={step !== 0} data-lesson-explanation={lecture} data-knowledge-lecture="story" data-math-narration-key={`lecture-${lectureRun}`}>
        <div className="mt-knowledge-story"><div className="mt-knowledge-card-head"><b>聪聪老师讲方法</b>{replayControl}</div><p>{card.insight}</p><p className="mt-knowledge-example">例如：{card.example}</p><div className="mt-knowledge-mnemonic">记住它：{card.mnemonic}</div>{playing && <p role="status">正在讲解…</p>}{audioMessage && <p role="status">{audioMessage}</p>}</div>
        {progress.explained && <button className="mt-knowledge-next" type="button" onClick={() => select(1)}>{audioMessage ? '看完讲解，去动手 →' : '去动手 →'}</button>}
      </div>
      <div className="mt-knowledge-stage" role="tabpanel" id={`${id}-panel-1`} aria-labelledby={`${id}-tab-1`} hidden={step !== 1} data-lesson-explanation={!needsOperation ? observation : undefined} data-knowledge-lecture="model" data-math-narration={lineState ? progress.modelDone ? lineState.task.feedback : lineState.task.instruction : undefined} data-math-narration-key={lineState ? `line-${lineState.taskIndex}` : `model-${lectureRun}`}>
        <Model replayControl={!needsOperation ? replayControl : undefined} model={card.model} lessonId={lessonId} done={progress.modelDone} tapped={progress.tapped} selected={progress.selected} onTap={tapped => update(current => ({ ...current, tapped }))} onSelect={selected => update(current => ({ ...current, selected }))} onDone={() => update(current => ({ ...current, modelDone: true }))} />
        {!needsOperation && audioMessage && <p role="status">{audioMessage}</p>}
        {progress.modelDone && <button className="mt-knowledge-next" type="button" onClick={() => { update(current => ({ ...current, modelDone: true, step: 2 })); }}>{needsOperation ? '完成了，去试一试 →' : '看完讲解，去试一试 →'}</button>}
      </div>
      <div className="mt-knowledge-stage" role="tabpanel" id={`${id}-panel-2`} aria-labelledby={`${id}-tab-2`} hidden={step !== 2}>
        <div className="mt-knowledge-transfer"><b>换个情景试一试</b><p>{card.question}</p><div className="mt-knowledge-options">{mathOptions(card.options, `${lessonId}:knowledge`).map(option => <button type="button" key={option} disabled={step !== 2} className={progress.pick === option ? right ? 'correct' : 'wrong' : ''} onClick={() => { update(current => ({ ...current, pick: option, attempts: current.attempts + 1 })); playSfx(option === card.answer ? 'correct' : 'wrong'); }}>{option}</button>)}</div>{progress.pick && <p className={right ? 'good' : 'try'} role="status">{right ? card.feedback : progress.attempts > 1 ? '还没答对，可以回到前面的讲解和学具，再想想。' : '再想想，也可以回看讲解和学具。'}</p>}{complete && <strong className="mt-knowledge-finished">✓ 这道迁移判断已完成，接下来独立验证</strong>}</div>
      </div>
    </div>
  </section>;
}
