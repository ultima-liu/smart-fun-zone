import { useState } from 'react';
import type { EnglishSoundQuestion } from '../content/englishG3SoundExercises';

export default function EnglishTextbookSoundExercise({ questions, lastSound, heard }: { questions: readonly EnglishSoundQuestion[]; lastSound: boolean; heard: boolean }) {
  const [picks, setPicks] = useState<Record<number, string>>({});
  const done = questions.every((question, index) => picks[index] === question.answer);
  return <div className="en-original-sound-exercise" data-questions={questions.length} aria-label={lastSound ? '教材尾音辨音题' : '教材首音辨音题'}>
    <p>{done ? '✓ 都选对了！可以重听、重新练习。' : `播放上面的录音，听词语${lastSound ? '末尾' : '开头'}的声音，再选字母。`}</p>
    <div>{questions.map((question, index) => <section key={question.word}>
      <small>{index + 1}</small><img src={question.picture} alt={`第 ${index + 1} 题教材图片`} draggable={false}/>
      <div>{question.choices.map(choice => <button type="button" key={choice} disabled={!heard} aria-pressed={picks[index] === choice} className={picks[index] === choice ? choice === question.answer ? 'correct' : 'retry' : ''} onClick={() => setPicks(current => ({ ...current, [index]: choice }))}>{choice}</button>)}</div>
      <span role="status">{!picks[index] ? '听一听，选一选' : picks[index] === question.answer ? '✓ 正确' : '再听听这个声音'}</span>
    </section>)}</div>
  </div>;
}
