import EnglishReadingLine from '../components/EnglishReadingLine';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { speakOnce, stopSpeaking } from '../speech';
import { englishRecallItems, englishReviewFocus } from '../englishReview';
import { recordEnglishEvidence } from '../englishLearning';
import { getEnglishG3Lesson } from '../content/englishGrade3Upper';
import { useVoiceAvailability } from '../useVoiceAvailability';
import { EnglishExpressionPractice, EnglishObservation, EnglishPhonicsPractice, EnglishPicture } from './EnglishLearningActivities';

export default function EnglishReviewPractice({ lessonId, round = 0, onDone }: { lessonId: string; round?: number; onDone: () => void }) {
  const childId = useStore((state) => state.activeChildId);
  const sound = useStore((state) => state.sound);
  const voiceOn = useStore((state) => state.voiceOn);
  const configured = useVoiceAvailability();
  const canPlay = sound && voiceOn && configured;
  const targets = useRef(englishRecallItems(childId, lessonId, round)).current;
  const focus = useRef(englishReviewFocus(childId, lessonId)).current;
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [phase, setPhase] = useState<'recall' | 'apply' | 'done'>('recall');
  const sessionId = useRef(`${round}:${Date.now()}`).current;
  const target = targets[index];
  useEffect(() => () => stopSpeaking(), []);
  const next = () => {
    if (!checked) return;
    if (index === targets.length - 1) { setPhase('apply'); return; }
    setIndex((value) => value + 1); setRevealed(false); setChecked(false);
  };
  const completionSent = useRef(false);
  useEffect(() => {
    if (phase !== 'done' || completionSent.current) return;
    completionSent.current = true;
    recordEnglishEvidence(childId, { lessonId, taskId: 'review:participation', skill: focus === 'phonics' ? 'phonics' : 'expression', level: 'practiced', source: 'ai', context: 'review', note: 'AI 已检查实际回想与应用，各项表现见任务记录' });
    onDone();
  }, [phase, childId, lessonId, focus, onDone]);
  return <section className="en-active-review" aria-label="英语主动回忆复习"><header><span>REMEMBER & USE</span><h3>先回想，再核对</h3><b>{phase === 'recall' ? `${index + 1} / ${targets.length}` : '换情境应用'}</b></header>
    {phase === 'recall' && target && <div className="en-recall-task" key={`${target.lessonId}:${target.id}`}><small>{getEnglishG3Lesson(target.lessonId)?.title}</small>{target.picture && <EnglishPicture word={target.picture} />}<p>{target.cue}</p><div className="en-recall-actions"><button type="button" disabled={revealed} onClick={() => setRevealed(true)}>需要提示：核对示范</button></div>
      {revealed && <div className="en-recall-answer"><EnglishReadingLine text={target.text} aria-label="听示范" disabled={!canPlay} onClick={() => speakOnce(target.text, 'en', 0.85)}/></div>}
      <EnglishObservation lessonId={target.lessonId} taskId={target.id} readingTarget={target.text} skill="expression" prompt={`根据提示回想英文词句：${target.cue}。老师核对目标：${target.text}`} criteria={['实际表达与提示对应的英文词句', '读出的内容与目标基本一致']} context="review" supported={revealed} onDone={() => setChecked(true)} />
      <button type="button" className="ct-primary" disabled={!checked} onClick={next}>{index === targets.length - 1 ? '换情境用一用' : '回想下一项'}</button></div>}
    {phase === 'apply' && <>
        {focus === 'phonics' ? <EnglishPhonicsPractice key={`review:${round}`} lessonId={lessonId} canPlay={canPlay} context="review" onDone={() => setPhase('done')} />
          : <EnglishExpressionPractice key={`review:${round}`} lessonId={lessonId} context="review" sessionId={sessionId} direct onDone={() => setPhase('done')} />}
    </>}
    {phase === 'done' && <div className="en-practice-finish"><p>这次回想和应用已经完成。</p><button type="button" className="ct-primary" onClick={onDone}>返回复习计划</button></div>}
  </section>;
}
