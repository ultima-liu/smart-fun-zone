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
    {complete ? <div className="ct-pinyin-garden-done"><b>✓ 本园地教材任务已完成</b><p>你已经把认字、拼音比较、词句运用、诗文和共读内容用到自己的学习里。</p></div> : <section className="ct-pinyin-panel">
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
