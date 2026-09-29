import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { completeActivityMission, MISSION_ACTIVITIES, pauseMission } from '../taskSystem';
import { useStore } from '../store';
import { playSfx, speakOnce } from '../speech';

export default function TaskActivityPage() {
  const nav = useNavigate();
  const { taskId = '' } = useParams();
  const childId = useStore((state) => state.activeChildId);
  const completed = useStore((state) => childId ? state.taskStates[childId]?.completed[taskId] : undefined);
  const task = useMemo(() => MISSION_ACTIVITIES.find((item) => item.id === taskId), [taskId]);
  const [index, setIndex] = useState(0);
  const [firstCorrect, setFirstCorrect] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    if (childId && task && !completed) pauseMission(childId, task.id);
  }, [childId, completed, task]);

  if (!childId) return <main className="page mission-activity"><h1>请先选择孩子档案</h1><button onClick={() => nav('/')}>返回首页</button></main>;
  if (!task || !task.questions?.length) return <main className="page mission-activity"><h1>这个任务还没有开放</h1><button onClick={() => nav('/')}>返回首页</button></main>;

  const question = task.questions[index];
  const choose = (choice: number) => {
    if (picked === question.answer) return;
    const correct = choice === question.answer;
    if (!attempted) {
      setAttempted(true);
      if (correct) setFirstCorrect((value) => value + 1);
    }
    setPicked(choice);
    playSfx(correct ? 'correct' : 'wrong');
    speakOnce(correct ? `答对了。${question.explain}` : `再想一想。${question.explain}`, 'zh', .9);
  };
  const next = () => {
    if (picked !== question.answer) return;
    if (index < task.questions!.length - 1) {
      setIndex((value) => value + 1);
      setPicked(null);
      setAttempted(false);
      return;
    }
    const score = task.category === 'challenge' ? firstCorrect : task.questions!.length;
    const didPass = score >= (task.passCount ?? task.questions!.length);
    setPassed(didPass);
    setFinished(true);
    if (didPass) completeActivityMission(childId, task.id, score, task.questions!.length);
  };
  const retry = () => {
    setIndex(0); setFirstCorrect(0); setAttempted(false); setPicked(null); setFinished(false); setPassed(false);
  };

  return <main className={`page mission-activity mission-activity--${task.category}`}>
    <header className="mission-activity-head">
      <button onClick={() => nav('/')} aria-label="返回首页">←</button>
      <div><span>{task.categoryLabel}</span><h1>{task.icon} {task.title}</h1><p>{task.brief}</p></div>
      <strong>🫘 {task.reward}</strong>
    </header>
    {!finished ? <section className="mission-question-card">
      <div className="mission-question-progress"><span>第 {index + 1} 关 / {task.questions.length}</span><i style={{ width: `${((index + 1) / task.questions.length) * 100}%` }} /></div>
      <div className="mission-question-art" aria-hidden="true">{task.icon}</div>
      <h2>{question.prompt}</h2>
      <div className="mission-options">{question.options.map((option, optionIndex) => {
        const correct = picked !== null && optionIndex === question.answer;
        const wrong = picked === optionIndex && optionIndex !== question.answer;
        return <button key={option} className={correct ? 'correct' : wrong ? 'wrong' : ''} onClick={() => choose(optionIndex)}><b>{String.fromCharCode(65 + optionIndex)}</b><span>{option}</span></button>;
      })}</div>
      {picked !== null && <div className={`mission-answer-note ${picked === question.answer ? 'correct' : 'wrong'}`}><b>{picked === question.answer ? '答对啦！' : '还差一点'}</b><span>{question.explain}</span></div>}
      <button className="mission-next" disabled={picked !== question.answer} onClick={next}>{index === task.questions.length - 1 ? '完成任务' : '下一关 →'}</button>
    </section> : <section className={`mission-result ${passed ? 'passed' : 'retry'}`}>
      <div aria-hidden="true">{passed ? '🎉' : '💪'}</div>
      <h2>{passed ? '任务完成！' : '再试一次就能过关'}</h2>
      <p>{passed ? `卷卷豆 +${task.reward}，已经放进你的收获里。` : `第一次答对 ${firstCorrect} 题，需要答对 ${task.passCount} 题。`}</p>
      <div>{passed ? <button onClick={() => nav('/')}>回到小广场</button> : <button onClick={retry}>重新挑战</button>}</div>
    </section>}
  </main>;
}
