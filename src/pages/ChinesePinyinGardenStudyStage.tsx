import { useEffect, useState } from 'react';
import { CHINESE_PINYIN_GARDENS } from '../content/chinesePinyinGardenStudy';
import { playSfx, speakOnce } from '../speech';
import SpeakChip from '../components/SpeakChip';
import { optionKey } from '../options';

export default function ChinesePinyinGardenStudyStage({ lessonId, onDone }: { lessonId: string; onDone: () => void }) {
  const activities = CHINESE_PINYIN_GARDENS[lessonId] ?? [];
  const [index, setIndex] = useState(0);
  const [readLines, setReadLines] = useState<Set<number>>(new Set());
  const [picked, setPicked] = useState<string | null>(null);
  const activity = activities[index];
  const complete = index >= activities.length;

  useEffect(() => { if (complete && activities.length) onDone(); }, [complete, activities.length, onDone]);
  if (!activity && !complete) return <p>本园地内容尚未整理。</p>;

  return <div className="ct-pinyin-garden">
    <div className="ct-pinyin-garden-progress"><span style={{ width: `${(index / activities.length) * 100}%` }} /><b>{Math.min(index + 1, activities.length)} / {activities.length}</b></div>
    {complete ? <section className="ct-pinyin-garden-review" aria-label="本园地教材任务完成回顾"><header><b>✓ 本园地教材任务已完成</b><p>题目、材料和正确作答仍保留在这里，方便回看和讲给家人听。</p></header><div>{activities.map((item, itemIndex) => <article key={item.title}><small>园地任务 {itemIndex + 1}</small><h3>{item.title}</h3><p>{item.prompt}</p><div className="ct-pinyin-garden-material">{item.material.map((line) => <span key={line}><b>{line}</b></span>)}</div><h4>{item.question}</h4><p className="ct-pinyin-review-answer">✓ 我的答案：<strong>{item.answer}</strong></p><p>{item.feedback}</p></article>)}</div></section> : <section className="ct-pinyin-panel">
      <div className="ct-pinyin-panel-head"><small>园地任务 {index + 1} / {activities.length}</small><h3>{activity.title}<SpeakChip text={`园地任务。${activity.title}。${activity.prompt}`} label="听任务" /></h3><p>{activity.prompt}</p></div>
      <div className="ct-pinyin-garden-material">{activity.material.map((line, lineIndex) => <button key={lineIndex} className={readLines.has(lineIndex) ? 'seen' : ''} onClick={() => {
        setReadLines((value) => new Set(value).add(lineIndex));
        speakOnce(line, 'zh', .8); playSfx('tap');
      }}><b>{line}</b><small>{readLines.has(lineIndex) ? '✓ 已点读' : '点读'}</small></button>)}</div>
      <div className="ct-pinyin-garden-question"><small>联系材料想一想</small><h4>{activity.question}</h4><div>{activity.choices.map((choice, choiceIndex) => <button key={choice} data-key={optionKey(choiceIndex)} className={`ct-keyed-option ${picked === choice ? (choice === activity.answer ? 'correct' : 'wrong') : ''}`} onClick={() => {
        setPicked(choice);
        if (choice === activity.answer) { speakOnce(activity.feedback, 'zh', .84); playSfx('correct'); }
        else { speakOnce('回到刚才点读的材料中找线索。', 'zh', .84); playSfx('wrong'); }
      }}>{choice}</button>)}</div>
      {picked === activity.answer && <p>{activity.feedback}</p>}</div>
      <button className="ct-pinyin-next" disabled={readLines.size < activity.material.length || picked !== activity.answer} onClick={() => {
        setIndex((value) => value + 1); setReadLines(new Set()); setPicked(null); playSfx('pop');
      }}>{index + 1 === activities.length ? '完成园地学习 →' : '这项完成，继续下一项 →'}</button>
    </section>}
  </div>;
}
