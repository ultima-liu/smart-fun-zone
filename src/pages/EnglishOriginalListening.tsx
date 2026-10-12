import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store';
import { stopSpeaking } from '../speech';
import { englishOptions, recordEnglishEvidence } from '../englishLearning';
import { englishOriginalActivity } from '../content/englishOriginalActivities';
import { EnglishObservation } from './EnglishLearningActivities';
import ScreenPages from '../components/ScreenPages';
import EnglishSingleLineText from '../components/EnglishSingleLineText';

export default function EnglishOriginalListening({ clipKey, src }: { clipKey: string; src: string }) {
  const childId = useStore((state) => state.activeChildId);
  const activity = englishOriginalActivity(clipKey);
  const [open, setOpen] = useState(false);
  const [heard, setHeard] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const [done, setDone] = useState(false);
  const [note, setNote] = useState('');
  const dialog = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (!open) return;
    stopSpeaking();
    document.querySelectorAll('audio').forEach((element) => { if (element !== audio.current) element.pause(); });
    const main = document.getElementById('main-content');
    const previous = main?.inert ?? false;
    if (main) main.inert = true;
    dialog.current?.focus();
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key === 'Tab') {
        const focusable = [...dialog.current!.querySelectorAll<HTMLElement>('button:not(:disabled), audio, summary, input, textarea')];
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', keys);
    return () => { if (main) main.inert = previous; window.removeEventListener('keydown', keys); audio.current?.pause(); trigger.current?.focus(); };
  }, [open]);
  if (!activity) return null;
  const correct = pick === activity.quiz?.answer;
  const choose = (value: string) => {
    const right = value === activity.quiz?.answer;
    setPick(value);
    recordEnglishEvidence(childId, { lessonId: activity.lessonId, taskId: `original:${clipKey}`, skill: 'listening', level: right ? supported ? 'supported' : 'independent' : 'needs-help', source: 'check', context: 'lesson', note: activity.quiz!.question });
    if (!right) setSupported(true);
    else setDone(true);
    setNote(right ? activity.quiz!.explain : '再听一次，留意问题要找的信息。');
  };
  return <><button type="button" className="en-original-task-trigger" ref={trigger} onClick={() => { setOpen(true); setHeard(false); setPick(null); setSupported(false); setDone(false); setNote(''); }}>原声听后任务</button>{open && createPortal(<div className="en-original-modal"><button type="button" className="en-original-close" aria-label="关闭原声任务" title="关闭" onClick={() => setOpen(false)}>×</button><ScreenPages panel><div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label="教材原声听力任务" className="en-original-dialog"><h3><EnglishSingleLineText>{activity.prompt}</EnglishSingleLineText></h3><audio ref={audio} controls preload="none" src={src} aria-label="任务原声" onEnded={() => setHeard(true)} onError={() => setNote('原声没有成功播放，可以稍后再试。')} />
    {activity.quiz ? <><h4><EnglishSingleLineText>{activity.quiz.question}</EnglishSingleLineText></h4><div className="en-original-options">{englishOptions(activity.quiz.options, clipKey).map((value) => <button type="button" key={value} disabled={!heard} className={pick === value ? correct ? 'correct' : 'wrong' : ''} onClick={() => choose(value)}><EnglishSingleLineText>{value}</EnglishSingleLineText></button>)}</div></> : <><p>{heard ? '可以说给同伴听，也可以录下来回听。' : '先听完原声，再记录实际表达。'}</p>{heard && <><EnglishObservation prompt={activity.prompt} referenceAudio={src} lessonId={activity.lessonId} taskId={`original:${clipKey}`} skill={activity.kind === 'sound' ? 'phonics' : 'listening'} criteria={activity.criteria!} onDone={() => setDone(true)} /></>}</>}
    <p role="status">{note}</p>{done && <button type="button" className="ct-primary" onClick={() => setOpen(false)}>记录好了，回到课程</button>}</div></ScreenPages></div>, document.body)}</>;
}
