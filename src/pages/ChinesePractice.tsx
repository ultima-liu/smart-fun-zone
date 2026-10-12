import ScreenHanziWriting from '../components/ScreenHanziWriting';
import AutomaticCourseCheck from '../components/AutomaticCourseCheck';
import type { CourseEvidenceRequirement } from '../courseAssessment';
import PracticeAgain from '../components/PracticeAgain';
import ChineseWordOrder from '../components/ChineseWordOrder';
import { orderingOptions } from '../orderingOptions';
import { usePracticeAttempt } from '../usePracticeAttempt';
import { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import { useStore } from '../store';
import { speakOnce } from '../speech';
import SpeakChip from '../components/SpeakChip';
import { playChineseReadingAudio } from '../chineseReadingAudio';
import ChineseListeningChoice from '../components/ChineseListeningChoice';
import { chineseOptions, recordChineseEvidence, readChineseEvidence, latestSkillEvidence, latestChineseTaskEvidence, CHINESE_SKILL_LABELS, EVIDENCE_LABELS, type ChineseSkill } from '../chineseLearning';
import { getChineseTeaching, chineseWritingHint, type OralTask, type TransferTask } from '../content/chineseTeaching';
import { getChineseTextbookStudy } from '../content/chineseTextbookStudy';
import { pinyin } from 'pinyin-pro';
import { CHINESE_PINYIN_STUDY } from '../content/chinesePinyinStudy';
import { useChinesePracticeState, useRepeatableChineseSequence, useFiniteChineseSequence } from '../chinesePracticeState';
import { WORD_DICT } from '../content/wordDict';

export function EvidenceSummary({ lessonId }: { lessonId: string }) {
  const childId = useStore((state) => state.activeChildId);
  const [, refresh] = useState(0);
  useEffect(() => { const update = () => refresh((value) => value + 1); window.addEventListener('chinese-evidence-change', update); return () => window.removeEventListener('chinese-evidence-change', update); }, []);
  const rows = readChineseEvidence(childId, lessonId);
  const goals = getChineseTeaching(lessonId).goals;
  const skills = goals.map((goal) => goal.skill);
  if (getChineseTextbookStudy(lessonId)?.writing?.length && !skills.includes('writing')) skills.push('writing');
  return <div className="ct-evidence-summary" aria-label="本课学习证据"><b>这次学到了什么</b><p>练习记录与独立表现分开保存。抽样检查只说明这项任务的表现。</p><div>{skills.map((skill) => {
    const row = latestSkillEvidence(rows, skill);
    return <span key={skill}><strong>{CHINESE_SKILL_LABELS[skill]}</strong> {row ? EVIDENCE_LABELS[row.level] : '待练习'}<small>{row ? row.source === 'self' ? '孩子自记' : row.source === 'ai' ? 'AI 确认' : row.source === 'adult' ? '家人观察' : '本次抽样检查' : '还没有学习证据'}</small>{row && <small>最近一次：{row.note}</small>}</span>;
  })}</div></div>;
}

export function ObservedPractice({ lessonId, taskId, skill, prompt, criteria, onDone, context = 'lesson', alsoRecord, stateKey = taskId, answer, exampleAnswer, supported = false, requirement, showPrompt = true, voice = true }: {
  lessonId: string; taskId: string; skill: ChineseSkill; prompt: string; criteria: string[];
  onDone: () => void; context?: 'lesson' | 'review'; alsoRecord?: ChineseSkill; stateKey?: string;
  answer?: string; exampleAnswer?: string; supported?: boolean; requirement?: CourseEvidenceRequirement; showPrompt?: boolean; voice?: boolean;
}) {
  const childId = useStore((state) => state.activeChildId);
  return <div className="ct-observed-practice">{showPrompt && <p>{prompt}<SpeakChip text={`${prompt}。说完或写完后会自动检查。`} /></p>}
    <AutomaticCourseCheck key={`${childId}:${stateKey}`} subject="语文" lessonId={lessonId} taskId={taskId} prompt={prompt} criteria={criteria} answer={answer} exampleAnswer={exampleAnswer} supported={supported} voice={voice}
      requirement={requirement ?? (skill === 'pinyin' ? 'audio' : 'answer')}
      onPass={result => {
        const evidence = { lessonId, taskId, skill, level: supported ? 'supported' as const : 'independent' as const, source: 'ai' as const, context, note: result.feedback };
        recordChineseEvidence(childId, evidence);
        if (alsoRecord) recordChineseEvidence(childId, { ...evidence, taskId: `${taskId}:${alsoRecord}`, skill: alsoRecord });
        onDone();
      }} />
  </div>;
}

export function OralPractice({ lessonId, taskId = 'oral-transfer', task, skill = 'expression', onDone, context = 'lesson' }: {
  lessonId: string; taskId?: string; task?: OralTask; skill?: ChineseSkill; onDone: (submitted?: boolean) => void; context?: 'lesson' | 'review';
}) {
  const oral = task ?? getChineseTeaching(lessonId).oral;
  const [text, setText] = useChinesePracticeState(lessonId, `${context}:${taskId}:expressionNote`, '');
  const submitted = useRef(false);
  return <section className="ct-real-expression" data-chinese-leaf data-chinese-narration={`题目：${oral.prompt}示范：${oral.model}填写要求：写下你的回答，写完后会自动检查。`} aria-label="真实表达与交流">
    <div className="ct-expression-question"><h3>题目</h3><p>{oral.prompt}</p></div>
    <div className="ct-expression-example"><h3>示范</h3><p>{oral.model}</p></div>
    <div className="ct-expression-answer">
      <label className="ct-expression-note"><span>我的回答</span><textarea value={text} onChange={(event) => { submitted.current = true; setText(event.target.value); }} placeholder="在这里写下你的回答" maxLength={500} /></label>
      <ObservedPractice key={taskId} lessonId={lessonId} taskId={taskId} skill={skill} prompt={oral.prompt} showPrompt={false} voice={false} answer={text} exampleAnswer={oral.model} supported criteria={oral.criteria} context={context} onDone={() => { const fresh = submitted.current; submitted.current = false; onDone(fresh); }} />
    </div>
  </section>;
}

export function ReadingExperience({ lessonId, onDone }: { lessonId: string; onDone?: () => void }) {
  const reading = getChineseTeaching(lessonId).reading;
  const [choice, setChoice] = useState<string | null>(null);
  if (!reading) return null;
  return <section className="ct-reading-experience" aria-label="阅读感受与想象"><h3>听完整篇，再想一想<SpeakChip text={`${reading.imagine}。${reading.create}`} /></h3><p>{reading.imagine}</p><b>哪种说法更让你有画面？为什么？</b><div className="ct-practice-actions">{reading.compare.map((line) => <button type="button" key={line} aria-pressed={choice === line} onClick={() => { setChoice(line); speakOnce(line, 'zh', .8); onDone?.(); }}>{line}</button>)}</div>{choice && <p>你选了“{choice}”。请说说自己的理由；两种选择都可以。</p>}<p>{reading.create}</p></section>;
}

export function TransferPractice({ lessonId, task, onDone, context = 'lesson', variant = 0 }: { lessonId: string; task: TransferTask; onDone: () => void; context?: 'lesson' | 'review'; variant?: number }) {
  const childId = useStore((state) => state.activeChildId);
  const session = context === 'review' ? `${context}:${variant}` : context;
  const [savedPlaced, savePlaced] = useChinesePracticeState(lessonId, `${session}:transferPlaced`, [] as string[]);
  const [savedMatched, saveMatched] = useChinesePracticeState(lessonId, `${session}:transferMatched`, new Set<string>());
  const [left, setLeft] = useState<string | null>(null);
  const [helped, setHelped] = useChinesePracticeState(lessonId, `${session}:transferHelped`, false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useChinesePracticeState(lessonId, `${session}:transferDone`, false);
  const [orderRun, setOrderRun] = useState(0);
  const [previousOrder, setPreviousOrder] = useState<string[]>([]);
  const [placed, setPlaced] = usePracticeAttempt(savedPlaced, savePlaced, [] as string[], () => done, false);
  const [matched, setMatched, , restartMatched] = usePracticeAttempt(savedMatched, saveMatched, new Set<string>(), () => done, false);
  const check = () => {
    const correct = task.kind === 'order' ? placed.join('|') === task.items.join('|') : matched.size === task.pairs.length;
    if (!correct) { setHelped(true); setMessage(task.kind === 'order' ? '想想先发生什么、后发生什么。可以重新排一次。' : '再比较两边的意思，找相关的伙伴。'); return; }
    setDone(true); setMessage('这一项完成了。接着用自己的话讲一讲。');
    recordChineseEvidence(childId, { lessonId, taskId: 'transfer-operation', skill: 'reading', level: helped ? 'supported' : 'independent', source: 'check', context, note: task.prompt }); onDone();
  };
  const items = task.kind === 'order'
    ? orderingOptions(task.items, `${lessonId}:transfer:${session}:${orderRun}`, previousOrder)
    : chineseOptions(task.pairs.map((pair) => pair[1]), `${lessonId}:transfer`);
  return <section className={`ct-transfer-practice${task.kind === 'match' ? ' ct-transfer-match' : ''}`} aria-label="配对与排序任务"><PracticeAgain complete={task.kind === 'match' && done} onRestart={() => { restartMatched(); setLeft(null); setHelped(false); setMessage(''); }} /><h3>{task.prompt}<SpeakChip text={`${task.prompt}。${task.kind === 'order' ? `材料有：${items.join('，')}` : `左边有：${task.pairs.map((pair) => pair[0]).join('，')}。右边有：${items.join('，')}`}。`} /></h3>
    {task.kind === 'order' ? <><ChineseWordOrder key={orderRun} items={items} placed={placed} onChange={value => { setPlaced(value); setMessage(''); }} /><button type="button" onClick={() => { setPlaced([]); setPreviousOrder(items); setOrderRun(value => value + 1); setMessage(''); }}>重新排序</button></> : <>
      <p className="ct-match-guide">先点左边，再点右边；配成的一对会显示相同颜色和编号。</p>
      <div className="ct-match-grid"><div>{task.pairs.map(([item], index) => {
        const complete = matched.has(item);
        return <button type="button" key={item} className={`ct-match-option${complete ? ` is-matched ct-match-color-${index % 6}` : ''}`} disabled={complete} aria-pressed={left === item} onClick={() => { setLeft(item); speakOnce(item); }}>
          {complete && <span className="ct-match-badge" aria-hidden="true">✓ {index + 1}</span>}<span>{item}</span>
        </button>;
      })}</div><div>{items.map((item) => {
        const index = task.pairs.findIndex(([, right]) => right === item);
        const complete = index >= 0 && matched.has(task.pairs[index][0]);
        return <button type="button" key={item} className={`ct-match-option${complete ? ` is-matched ct-match-color-${index % 6}` : ''}`} disabled={complete} onClick={() => { speakOnce(item); if (!left) { setMessage('先选择左边的一项，再选右边的伙伴。'); return; } if (task.pairs.some(([a, b]) => a === left && b === item)) { setMatched((value) => new Set(value).add(left)); setLeft(null); setMessage('这一对对应了，再找下一对。'); } else { setHelped(true); setMessage('看看两个词的意思，再找伙伴。'); } }}>
          {complete && <span className="ct-match-badge" aria-hidden="true">✓ {index + 1}</span>}<span>{item}</span>
        </button>;
      })}</div></div>
    </>}
    <button type="button" className="ct-primary" disabled={(task.kind === 'order' ? placed.length !== task.items.length || placed.some(item => !item) : matched.size !== task.pairs.length)} onClick={check}>检查这项任务</button><p role="status">{message}</p>
  </section>;
}

export function RecognitionCheck({ lessonId, onDone, onAdvance, context = 'lesson', variant = 0 }: { lessonId: string; onDone?: () => void; onAdvance?: () => void; context?: 'lesson' | 'review'; variant?: number }) {
  const chars = getChineseTextbookStudy(lessonId)?.recognize ?? (CHINESE_PINYIN_STUDY[lessonId]?.recognize ?? []).map((char) => ({ char, pinyin: pinyin(char) }));
  const childId = useStore((state) => state.activeChildId);
  const [helped, setHelped] = useChinesePracticeState(lessonId, `${context}:recognitionHelped:${variant}`, false);
  const [message, setMessage] = useState('');
  const rows = readChineseEvidence(childId, lessonId);
  const sample = chineseOptions(chars, `${lessonId}:sample:${variant}`).sort((a, b) => {
    if (context !== 'review') return 0;
    const priority = (char: string) => { const found = latestChineseTaskEvidence(rows.filter((row) => row.taskId === `recognition:${char}`))[0]; return !found || found.level === 'practiced' ? 0 : found.level === 'supported' ? 1 : 2; };
    return priority(a.char) - priority(b.char);
  }).slice(0, Math.min(3, chars.length));
  const [targetIds] = useChinesePracticeState(lessonId, `${context}:recognitionTargets:${variant}`, sample.map((item) => item.char));
  const targets = targetIds.map((id) => chars.find((item) => item.char === id)).filter((item): item is typeof chars[number] => Boolean(item));
  const [index, setIndex, , , roundComplete] = useFiniteChineseSequence(lessonId, `${context}:recognitionIndex:${variant}`, targets.length);
  const questionIndex = Math.min(index, Math.max(0, targets.length - 1));
  const target = targets[questionIndex];
  const notified = useRef(false);
  useEffect(() => {
    if (!roundComplete) { notified.current = false; return; }
    if (notified.current) return;
    notified.current = true;
    onDone?.();
  }, [roundComplete, onDone]);
  if (!chars.length) return null;
  if (!target) return null;
  const word = WORD_DICT[target.char]?.words.find((item) => item.includes(target.char)) ?? target.char;
  const choices = chineseOptions([target.char, ...chars.filter((item) => item.char !== target.char).slice(0, 2).map((item) => item.char)], `${lessonId}:recognition:${questionIndex}:${variant}`);
  return <section className="ct-recognition-check" data-chinese-leaf data-chinese-narration-mode="instructions-only" data-chinese-narration-key={index} data-chinese-narration="听词语，找出其中的字。先点击听词语，听清词语和要找的字后再选择。" aria-label="脱离拼音认字检查">
    <ChineseListeningChoice key={`${childId}:${lessonId}:${context}:${variant}:${index}`} title="听词语，找出这个字" prompt="听清词语和要找的字，再选出对应的汉字。" progress={`${questionIndex + 1} / ${targets.length}`} listenLabel="听词语" choices={choices} readOptions={false} readOnly={roundComplete} playTarget={() => playChineseReadingAudio([`词语是：${word}。请找出“${target.char}”这个字。`], () => undefined)} onChoose={char => {
    if (roundComplete) return;
    if (char !== target.char) { setHelped(true); setMessage('再比较字形；需要时回到生字卡看一看。'); recordChineseEvidence(childId, { lessonId, taskId: `recognition:${target.char}`, skill: 'recognition', level: 'supported', source: 'check', context, note: `在“${word}”中辨认${target.char}` }); return; }
    recordChineseEvidence(childId, { lessonId, taskId: `recognition:${target.char}`, skill: 'recognition', level: helped ? 'supported' : 'independent', source: 'check', context, note: `在“${word}”中辨认${target.char}（听音辨字抽样）` });
    setIndex((value) => value + 1); setHelped(false); setMessage('');
    if (index + 1 === targets.length) onAdvance?.();
  }} />{message && <p className="ct-recognition-feedback" role="status">{message}</p>}</section>;
}

function WritingDemo({ char }: { char: string }) {
  const host = useRef<HTMLDivElement>(null);
  const writer = useRef<HanziWriter | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    let mounted = true;
    host.current.innerHTML = ''; setError(false);
    writer.current = HanziWriter.create(host.current, char, { width: 160, height: 160, padding: 12, showOutline: true,
      strokeColor: '#58774f', charDataLoader: (value, onLoad, onError) => { fetch(`/assets/chinese-textbook/strokes/${encodeURIComponent(value)}.json`).then((response) => { if (!response.ok) throw new Error('stroke data'); return response.json(); }).then((data) => { if (mounted) onLoad(data); }).catch((error: Error) => { if (mounted) { setError(true); onError(error); } }); },
    });
    return () => { mounted = false; writer.current?.pauseAnimation(); writer.current?.cancelQuiz(); writer.current = null; };
  }, [char]);
  return <div className="ct-writing-demo"><div ref={host} className="ct-writing-demo-grid" /><button type="button" disabled={error} onClick={() => { void writer.current?.animateCharacter(); }}>看“{char}”的笔顺范写</button>{error && <p>范写暂时不可用，请对照课本或请家人示范。</p>}</div>;
}

export function WritingPractice({ lessonId, taskId = 'paper-writing', onDone, context = 'lesson', sampleOnly = false, variant = 0 }: { lessonId: string; taskId?: string; onDone: () => void; context?: 'lesson' | 'review'; sampleOnly?: boolean; variant?: number }) {
  const all = getChineseTextbookStudy(lessonId)?.writing ?? [];
  const chars = sampleOnly ? all.slice(variant % Math.max(all.length, 1), variant % Math.max(all.length, 1) + 1) : all;
  const [index, setIndex, complete, restart] = useRepeatableChineseSequence(lessonId, `${context}:${taskId}:writingIndex:${variant}`, chars.length);
  const childId = useStore(state => state.activeChildId);
  const [run, setRun] = useState(0);
  const char = chars[index]?.char;
  useEffect(() => { if (complete) onDone(); }, [complete, onDone]);
  if (!char) return null;
  return <section className="ct-paper-writing" data-chinese-leaf data-chinese-narration-key={char} data-chinese-narration={`观察“${char}”的笔顺。${chineseWritingHint(char)}。在屏幕田字格中按笔顺写，系统逐笔自动检查。`} aria-label="屏幕书写实践">
    <PracticeAgain complete={complete} onRestart={() => { restart(); setRun(value => value + 1); }} />
    <h3>看范写 → 屏幕写 → 自动检查 {index + 1}/{chars.length}<SpeakChip text={`先观察“${char}”的笔顺，${chineseWritingHint(char)}。在屏幕田字格中按笔顺写。`} /></h3>
    <div className="ct-writing-tools"><WritingDemo key={char} char={char} /><p>{chineseWritingHint(char)}</p></div>
    <ScreenHanziWriting key={`${char}:${run}`} char={char} onPass={supported => {
      recordChineseEvidence(childId, { lessonId, taskId: `${taskId}:${char}`, skill: 'writing', level: supported ? 'supported' : 'independent', source: 'check', context, note: `屏幕逐笔检查“${char}”的笔顺、方向、轨迹和位置` });
      setIndex(value => value + 1); setRun(value => value + 1); if (index + 1 === chars.length) onDone();
    }} />
  </section>;
}
