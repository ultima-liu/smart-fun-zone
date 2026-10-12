import { Fragment } from 'react';
import type { ChineseStudyTask } from '../content/chineseTextbookStudy';
import { completedSentence } from '../chineseSentenceCompletion';
import { useChinesePracticeState } from '../chinesePracticeState';
import { ObservedPractice } from './ChinesePractice';

/** A supplied sentence plus one or two child-owned blanks forms one answer. */
export default function ChineseGuidedPractice({ lessonId, task, onDone }: { lessonId: string; task: ChineseStudyTask; onDone: () => void }) {
  const completion = task.completion!;
  const [values, setValues] = useChinesePracticeState<string[]>(lessonId, `textbook:${task.id}:completion`, completion.blanks.map(() => ''));
  const answer = completedSentence(completion.frame, values);
  const parts = completion.frame.split(/_{2,}/u);
  return <div className="ct-guided-answer">
    <h4>补充我的回答</h4>
    <div className="ct-completion-sentence" role="group" aria-label="补充关键信息">{parts.map((part, index) => <Fragment key={index}>
      {part}{index < completion.blanks.length && <input aria-label={completion.blanks[index].label} placeholder={completion.blanks[index].label} value={typeof values[index] === 'string' ? values[index] : ''} maxLength={60} autoComplete="off" onChange={event => setValues(current => completion.blanks.map((_blank, i) => i === index ? event.target.value : current[i] ?? ''))} />}
    </Fragment>)}</div>
    <ObservedPractice lessonId={lessonId} taskId={`textbook:${task.id}`} skill="expression" prompt={`${task.instruction}。补充句子：${completion.frame}。填写内容：${completion.blanks.map(blank => blank.label).join('、')}。本题只要求补充这些关键信息。`} criteria={completion.criteria} answer={answer} supported requirement="answer" showPrompt={false} voice={false} onDone={onDone} />
  </div>;
}
