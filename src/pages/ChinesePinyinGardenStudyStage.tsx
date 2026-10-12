import ChineseTextbookExtras from '../components/ChineseTextbookExtras';
import { CHINESE_TEXTBOOK_EXTRAS } from '../content/chineseTextbookExtras';
import { IconCourseSpeaker } from '../components/icons';
import { useCallback, useEffect, useState } from 'react';
import { CHINESE_PINYIN_GARDENS } from '../content/chinesePinyinGardenStudy';
import { playSfx, speakOnce } from '../speech';
import SpeakChip from '../components/SpeakChip';
import ActivityDeck from '../components/ClassroomActivities';
import { useChinesePracticeState } from '../chinesePracticeState';
import { chineseOptions } from '../chineseLearning';
import { optionKey } from '../options';
import { playChineseReadingAudio, stopChineseReadingAudio } from '../chineseReadingAudio';
import ChineseKnowledgeExtensionStage from './ChineseKnowledgeExtensionStage';

type GardenCard = (typeof CHINESE_PINYIN_GARDENS)[string][number];
function GardenActivity({ lessonId, index, activity, legacyIndex, legacyLines, legacyAnswer, onCompletionChange }: { lessonId: string; index: number; activity: GardenCard; legacyIndex: number; legacyLines: Set<number>; legacyAnswer: string | null; onCompletionChange: (index: number, done: boolean) => void }) {
  const [readLines, setReadLines] = useChinesePracticeState(lessonId, `gardenTask:${index}:lines`, index < legacyIndex ? new Set(activity.material.map((_line, i) => i)) : index === legacyIndex ? legacyLines : new Set<number>());
  const [picked, setPicked] = useChinesePracticeState<string | null>(lessonId, `gardenTask:${index}:answer`, index < legacyIndex ? activity.answer : index === legacyIndex ? legacyAnswer : null);
  const longMaterial = activity.material.join('').length > 240 || activity.material.some(line => line.length > 80);
  const splitMaterial = longMaterial || activity.material.length > 4 || activity.material.some(line => line.length > 40);
  const materialDone = activity.material.every((_line, lineIndex) => readLines.has(lineIndex));
  const done = materialDone && picked === activity.answer;
  useEffect(() => onCompletionChange(index, done), [done, index, onCompletionChange]);
  return <section className="ct-pinyin-panel ct-garden-card" data-chinese-narration={`${activity.title}。${activity.prompt}。${activity.material.join('。')}。${activity.question}。`}>
    <div className="ct-pinyin-panel-head"><small>教材任务 {index + 1}</small><h3>{activity.title}<SpeakChip text={`${activity.title}。${activity.prompt}`} label="听任务" /></h3><p>{activity.prompt}</p></div>
    {splitMaterial ? <ActivityDeck className="ct-subtasks" labels={["阅读材料", "想一想"]} completed={[materialDone, picked === activity.answer]}>
    <div className={`ct-pinyin-garden-material ${longMaterial ? "ct-garden-reading" : ""}`} data-chinese-narration={`${activity.prompt}。${activity.material.join("。")}。逐项点读或练读。`}>{activity.material.map((line, lineIndex) => <button key={lineIndex} className={readLines.has(lineIndex) ? 'seen' : ''} onClick={() => {
      setReadLines(value => new Set(value).add(lineIndex));
      void playChineseReadingAudio([line], missing => { if (missing.length) speakOnce('这里缺少的拼音声音，请老师或家人示范。', 'zh', .8); });
      playSfx('tap');
    }}><b>{line}</b>{longMaterial ? <i aria-hidden="true">{readLines.has(lineIndex) ? "✓" : <IconCourseSpeaker size={20} />}</i> : <small>{readLines.has(lineIndex) ? "✓ 已观察或练读" : "点读 / 听示范"}</small>}</button>)}</div>
    <div className="ct-pinyin-garden-question" data-chinese-narration={`${activity.question}。`}><small>联系材料想一想</small><h4>{activity.question}</h4><div>{chineseOptions(activity.choices, `${lessonId}:garden:${index}`).map((choice, choiceIndex) => <button key={choice} aria-label={choice} data-key={optionKey(choiceIndex)} className={`ct-keyed-option ${picked === choice ? choice === activity.answer ? 'correct' : 'wrong' : ''}`} onClick={() => {
      setPicked(choice); speakOnce(choice === activity.answer ? activity.feedback : '回到刚才点读的材料中找线索。', 'zh', .84); playSfx(choice === activity.answer ? 'correct' : 'wrong');
    }}>{choice}</button>)}</div><p role="status">{picked === activity.answer ? activity.feedback : ''}</p></div></ActivityDeck> : <>    <div className={`ct-pinyin-garden-material ${longMaterial ? "ct-garden-reading" : ""}`} data-chinese-narration={`${activity.prompt}。${activity.material.join("。")}。逐项点读或练读。`}>{activity.material.map((line, lineIndex) => <button key={lineIndex} className={readLines.has(lineIndex) ? 'seen' : ''} onClick={() => {
      setReadLines(value => new Set(value).add(lineIndex));
      void playChineseReadingAudio([line], missing => { if (missing.length) speakOnce('这里缺少的拼音声音，请老师或家人示范。', 'zh', .8); });
      playSfx('tap');
    }}><b>{line}</b>{longMaterial ? <i aria-hidden="true">{readLines.has(lineIndex) ? "✓" : <IconCourseSpeaker size={20} />}</i> : <small>{readLines.has(lineIndex) ? "✓ 已观察或练读" : "点读 / 听示范"}</small>}</button>)}</div>
    <div className="ct-pinyin-garden-question" data-chinese-narration={`${activity.question}。`}><small>联系材料想一想</small><h4>{activity.question}</h4><div>{chineseOptions(activity.choices, `${lessonId}:garden:${index}`).map((choice, choiceIndex) => <button key={choice} aria-label={choice} data-key={optionKey(choiceIndex)} className={`ct-keyed-option ${picked === choice ? choice === activity.answer ? 'correct' : 'wrong' : ''}`} onClick={() => {
      setPicked(choice); speakOnce(choice === activity.answer ? activity.feedback : '回到刚才点读的材料中找线索。', 'zh', .84); playSfx(choice === activity.answer ? 'correct' : 'wrong');
    }}>{choice}</button>)}</div><p role="status">{picked === activity.answer ? activity.feedback : ''}</p></div></>}

  </section>;
}
export default function ChinesePinyinGardenStudyStage({ lessonId, onDone, onCompletionChange, extensionDone, onExtensionDone }: { lessonId: string; onDone: () => void; onCompletionChange?: (done: boolean) => void; extensionDone?: boolean; onExtensionDone?: () => void }) {
  const activities = CHINESE_PINYIN_GARDENS[lessonId] ?? [];
  const [legacyIndex] = useChinesePracticeState(lessonId, 'gardenIndex', 0);
  const [legacyLines] = useChinesePracticeState(lessonId, 'gardenReadLines', new Set<number>());
  const [legacyAnswer] = useChinesePracticeState<string | null>(lessonId, 'gardenPicked', null);
  const [selected, setSelected] = useChinesePracticeState(lessonId, 'gardenSelected', Math.min(legacyIndex, Math.max(0, activities.length - 1)));
  const [doneCards, setDoneCards] = useChinesePracticeState(lessonId, 'gardenCardsDone', new Set(Array.from({ length: Math.min(legacyIndex, activities.length) }, (_, i) => i)));
  const [checked, setChecked] = useState(new Set<number>());
  const report = useCallback((index: number, done: boolean) => {
    setChecked(value => value.has(index) ? value : new Set(value).add(index));
    setDoneCards(value => { if (value.has(index) === done) return value; const next = new Set(value); if (done) next.add(index); else next.delete(index); return next; });
  }, [setChecked, setDoneCards]);
  const complete = activities.length > 0 && activities.every((_activity, index) => checked.has(index) && doneCards.has(index));
  const verified = activities.every((_activity, index) => checked.has(index));
  useEffect(() => { if (!verified) return; onCompletionChange?.(complete); if (complete) onDone(); }, [complete, verified, onDone, onCompletionChange]);
  useEffect(() => () => stopChineseReadingAudio(), []);
  return <div className="ct-pinyin-garden"><ActivityDeck selectedIndex={selected} onSelect={setSelected} labels={[...activities.map((_activity, i) => `教材任务 ${i + 1}`), ...(onExtensionDone ? ['知识桥'] : []), ...(CHINESE_TEXTBOOK_EXTRAS[lessonId] ? ['教材补充'] : [])]} completed={[...activities.map((_activity, i) => doneCards.has(i)), ...(onExtensionDone ? [!!extensionDone] : [])]}>
    {activities.map((activity, index) => <GardenActivity key={index} {...{ lessonId, index, activity, legacyIndex, legacyLines, legacyAnswer }} onCompletionChange={report} />)}
    {onExtensionDone && <ChineseKnowledgeExtensionStage lessonId={lessonId} onDone={onExtensionDone} />}
  {CHINESE_TEXTBOOK_EXTRAS[lessonId] && <ChineseTextbookExtras lessonId={lessonId}/>}
  </ActivityDeck></div>;
}
