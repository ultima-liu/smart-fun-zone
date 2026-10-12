import { getChineseTeaching } from '../content/chineseTeaching';
import { CHINESE_SKILL_LABELS } from '../chineseLearning';
import type { ChineseReviewTask } from '../chineseReview';
import { OralPractice, RecognitionCheck, TransferPractice, WritingPractice } from './ChinesePractice';
import { PinyinListeningPractice, PinyinProductionPractice } from './ChinesePinyinPractice';
import '../chinese-textbook.css';
import { useRef } from 'react';
import { useChineseTabNarration } from '../chineseTabNarration';

export default function ChineseReviewPractice({ lessonId, task, onDone }: { lessonId: string; task: ChineseReviewTask; onDone: () => void }) {
  const listeningRef = useRef<HTMLElement>(null);
  useChineseTabNarration(listeningRef, `${lessonId}:review:${task.kind}:${task.variant}`);
  const teaching = getChineseTeaching(lessonId);
  const oral = task.skill === 'reading' ? { ...teaching.oral, prompt: teaching.reading?.create ?? teaching.oral.prompt, criteria: ['联系故事或诗中的具体内容', '用自己的话讲出发现或感受'] } : task.skill === 'listening' ? { ...teaching.oral, prompt: teaching.oral.response, model: teaching.oral.responseModel ?? teaching.oral.model, criteria: ['听清伙伴提供的新信息', '围绕对方的话作出回应'] } : teaching.oral;
  return <section ref={task.kind === 'recognition' || task.kind === 'listen' ? listeningRef : undefined} className="ct-chinese-review" aria-label="语文能力短复习">{task.kind !== 'oral' && <><b>{CHINESE_SKILL_LABELS[task.skill]} · {task.title}</b><p>先回想，再实际练。需要时可以求助；学习记录会注明是否借助提示。</p></>}
    {task.kind === 'recognition' && <RecognitionCheck key={`${lessonId}:${task.variant}`} lessonId={lessonId} variant={task.variant + 1} context="review" onDone={onDone} />}
    {task.kind === 'listen' && <PinyinListeningPractice lessonId={lessonId} variant={task.variant} context="review" onDone={onDone} />}
    {task.kind === 'production' && <PinyinProductionPractice lessonId={lessonId} variant={task.variant} context="review" onDone={onDone} />}
    {task.kind === 'oral' && <OralPractice lessonId={lessonId} taskId={`review-oral:${task.skill}:${task.variant}`} skill={task.skill} task={oral} context="review" onDone={onDone} />}
    {task.kind === 'writing' && <WritingPractice lessonId={lessonId} sampleOnly variant={task.variant} context="review" onDone={onDone} />}
    {task.kind === 'transfer' && teaching.transfer && <TransferPractice lessonId={lessonId} task={teaching.transfer} variant={task.variant} context="review" onDone={onDone} />}
  </section>;
}
