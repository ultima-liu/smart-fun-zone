import AutomaticCourseCheck from '../components/AutomaticCourseCheck';
import EnglishSingleLineText from '../components/EnglishSingleLineText';
import EnglishReadingLine from '../components/EnglishReadingLine';
import { IconCourseSpeaker } from '../components/icons';
import { stopEnglishNarration } from '../englishTabNarration';
import SpeechReadingCheck from '../components/SpeechReadingCheck';
import type { CourseEvidenceRequirement } from '../courseAssessment';
import { useActivityAdvance } from '../useActivityAdvance';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from '../store';
import { speakOnce, stopSpeaking } from '../speech';
import { ENGLISH_LEVEL_LABELS, ENGLISH_SKILL_LABELS, englishOptions, latestEnglishEvidence, readEnglishEvidence, readEnglishPractice, recordEnglishEvidence, saveEnglishPractice, type EnglishEvidence, type EnglishLevel, type EnglishSkill } from '../englishLearning';
import { ENGLISH_PHONICS_TASKS, getEnglishTeaching } from '../content/englishTeaching';
import { getEnglishG3Lesson, getEnglishG3Unit } from '../content/englishGrade3Upper';
import { wordPictureArt, wordPictureSrc } from '../content/englishWordPictures';

export function EnglishPicture({ word }: { word: string }) {
  const art = wordPictureArt(word);
  if (art) return <span className="en-word-art-frame en-word-art-frame--painted" style={{ backgroundImage: `url(${art.src})`, backgroundPosition: `${art.column * 100 / 3}% ${art.row * 100 / 3}%` }} aria-hidden="true" />;
  return <img className="en-teaching-picture" src={wordPictureSrc(word) ?? ''} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />;
}


export function useEnglishEvidence(lessonId: string) {
  const childId = useStore((state) => state.activeChildId);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const update = () => setVersion((value) => value + 1);
    window.addEventListener('english-evidence-change', update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener('english-evidence-change', update); window.removeEventListener('storage', update); };
  }, []);
  void version;
  return latestEnglishEvidence(readEnglishEvidence(childId, lessonId));
}

export function EnglishEvidenceSummary({ lessonId }: { lessonId: string }) {
  const rows = useEnglishEvidence(lessonId);
  const primary = getEnglishTeaching(lessonId).skill;
  const skills = [...new Set<EnglishSkill>(['listening', primary, 'expression', ...(primary === 'phonics' ? ['writing' as const] : [])])];
  return <section className="en-ability-summary" aria-label="本课最近能力表现"><h3>这一次，我做到了什么</h3><p>下面是实际做过的任务表现，不代表整项能力已经全部掌握。</p><div>{skills.map((skill) => {
    const matches = rows.filter((row) => row.skill === skill);
    // 最弱的已检查细项保留可见，不被另一题的成功覆盖。
    const rank: Record<EnglishLevel, number> = { 'needs-help': 0, practiced: 1, supported: 2, independent: 3 };
    const assessed = matches.filter((row) => row.source !== 'self');
    const row = (assessed.length ? assessed : matches).sort((a, b) => rank[a.level] - rank[b.level] || b.at - a.at)[0];
    return <article key={skill}><b>{ENGLISH_SKILL_LABELS[skill]}</b><strong className={row?.level ?? 'unchecked'}>{row ? ENGLISH_LEVEL_LABELS[row.level] : '尚未检查'}</strong>{row && <small>{row.source === 'self' ? '自己记下的练习' : row.source === 'ai' ? 'AI 确认' : row.source === 'adult' ? '家人观察' : '任务检查'} · {row.context === 'review' ? '复习' : '本课'} · {new Date(row.at).toLocaleDateString('zh-CN')}</small>}</article>;
  })}</div></section>;
}

type Context = EnglishEvidence['context'];

/** 固定目标本地核对，开放表达说完自动检查；退出活动时释放麦克风。 */
export function EnglishObservation({ lessonId, taskId, skill, criteria, context = 'lesson', onDone, supported = false, prompt, answer, requirement, referenceAudio, readingTarget, readingSentence }: {
  lessonId: string; taskId: string; skill: EnglishSkill; criteria: string[]; context?: Context; onDone?: () => void; supported?: boolean;
  prompt?: string; answer?: string; requirement?: CourseEvidenceRequirement; referenceAudio?: string; readingTarget?: string; readingSentence?: string;
}) {
  const childId = useStore((state) => state.activeChildId);
  if (readingTarget) return <SpeechReadingCheck key={`${childId}:${taskId}:${readingTarget}`} target={readingTarget} contextSentence={readingSentence} onPass={(result, assisted) => {
    recordEnglishEvidence(childId, { lessonId, taskId, skill, level: supported || assisted ? 'supported' : 'independent', source: 'check', context, note: result.feedback }); onDone?.();
  }} />;
  return <AutomaticCourseCheck key={`${childId}:${taskId}`} subject="英语" lessonId={lessonId} taskId={taskId}
    prompt={prompt ?? `${getEnglishTeaching(lessonId).expression.prompt}。${getEnglishTeaching(lessonId).expression.transfer?.prompt ?? ''}`}
    referenceAudio={referenceAudio} criteria={criteria} answer={answer} supported={supported} requirement={requirement ?? (skill === 'writing' ? 'answer' : 'audio')}
    onPass={result => {
      recordEnglishEvidence(childId, { lessonId, taskId, skill, level: supported ? 'supported' : 'independent', source: 'ai', context, note: result.feedback });
      onDone?.();
    }} />;
}

export function EnglishExpressionPractice({ lessonId, onDone, context = 'lesson', sessionId = 'lesson', direct = false }: { lessonId: string; onDone?: () => void; context?: Context; sessionId?: string; direct?: boolean }) {
  const childId = useStore((state) => state.activeChildId);
  const task = getEnglishTeaching(lessonId).expression;
  const stateId = `expression:${context}${context === 'review' ? `:${sessionId}` : ''}`;
  const saved = readEnglishPractice(childId, lessonId, stateId, { stage: direct ? 2 : 0, done: false, hint: false, unlocked: direct ? 2 : 0 });
  const [stage, setStage] = useState(Math.min(2, Math.max(0, Math.floor(Number(saved.stage) || 0))));
  const [hint, setHint] = useState(saved.hint === true);
  const [unlocked, setUnlocked] = useState(Math.min(2, Math.max(0, Number(saved.unlocked) || Number(saved.stage) || 0)));
  const [done, setDone] = useState(saved.done === true);
  const [completed, setCompleted] = useState<boolean[]>(() => [saved.unlocked > 0 || saved.stage > 0, saved.unlocked > 1 || saved.stage > 1, saved.done === true]);
  useActivityAdvance(`${lessonId}:${stateId}`, completed, stage, next => {setUnlocked(value => Math.max(value,next));setStage(next);});
  useEffect(() => { saveEnglishPractice(childId, lessonId, stateId, { stage, done, hint, unlocked }); }, [childId, stateId, done, hint, lessonId, stage, unlocked]);
  useEffect(() => { if (done) onDone?.(); }, [done, onDone]);
  return <section className="en-expression-practice en-full-panel" aria-label="分层表达练习" data-english-leaf data-english-narration-key={`expression:${stage}`} data-english-narration={`${task.scene}。${stage === 2 ? task.transfer?.prompt ?? task.prompt : task.prompt}。${stage === 0 ? task.model : stage === 1 ? task.frame : '试着用英语表达自己的想法。'}`}><header><span>SPEAK & CONNECT</span><h3>{task.scene}</h3></header><nav aria-label="表达练习层级">{['跟着示范说', '借助提示说', '自己说'].map((label, index) => <button type="button" key={label} className={stage === index ? 'active' : ''} disabled={index > unlocked} onClick={() => { setStage(index); }}>{completed[index] ? '✓ ' : ''}{label}</button>)}</nav><div className="en-expression-scene"><EnglishPicture word={stage === 2 ? task.transfer?.picture ?? task.picture : task.picture} /><p>{stage === 2 ? task.transfer?.prompt ?? task.prompt : stage === 1 ? `${task.prompt} 换一个名字或选择，用句子开头试着说。` : task.prompt}</p></div>
    <div className="en-expression-compose">{stage === 0 && <div className="en-expression-support"><EnglishReadingLine text={task.model} aria-label="听示范" onClick={() => speakOnce(task.model, 'en', 0.85)}/></div>}
    {(stage === 1 || hint) && <p className="en-expression-frame">{task.frame}</p>}
    {stage === 2 && !hint && <button type="button" onClick={() => setHint(true)}>给我句子开头</button>}
    <EnglishObservation key={`${lessonId}:${stage}:${context}`} lessonId={lessonId} taskId={stage < 2 ? `expression:stage-${stage}` : 'expression:transfer'} skill="expression"
      readingTarget={stage === 0 ? task.model : undefined}
      prompt={stage === 0 ? `跟读示范：${task.model}` : stage === 1 ? `${task.prompt}。使用句子开头：${task.frame}，换一个自己的内容。` : task.transfer?.prompt ?? task.prompt}
      criteria={stage === 0 ? ['读出示范的英文内容', '读音基本清楚、句子完整'] : task.criteria} supported={stage < 2 || hint} context={context}
      onDone={() => { setCompleted(current => current.map((value, index) => index === stage ? true : value)); if (stage < 2) setUnlocked(value => Math.max(value, stage + 1)); else setDone(true); }} />
    {done && <p role="status">这次表达已记下，可以继续练习。</p>}</div>
  </section>;
}

export function EnglishPhonicsPractice({ lessonId, canPlay, onDone, originalAudio, context = 'lesson' }: { lessonId: string; canPlay: boolean; onDone?: () => void; originalAudio?: ReactNode; context?: Context }) {
  const childId = useStore((state) => state.activeChildId);
  const lesson = getEnglishG3Lesson(lessonId);
  const task = ENGLISH_PHONICS_TASKS[lesson?.unitId ?? 'friends'];
  const unit = getEnglishG3Unit(lesson?.unitId ?? 'friends');
  const saved = context === 'lesson' ? readEnglishPractice(childId, lessonId, 'phonics:lesson', { stage: 0, supported: false, done: false, unlocked:0 }) : { stage: 0, supported: false, done: false, unlocked:0 };
  const [stage, setStage] = useState(Math.min(2, Math.max(0, Math.floor(Number(saved.stage) || 0))));
  const [unlocked, setUnlocked] = useState(Math.max(Number(saved.unlocked)||0,Number(saved.stage)||0));
  const [heard, setHeard] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [supported, setSupported] = useState(saved.supported === true);
  const [reading, setReading] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(saved.done === true);
  const active = useRef(true);
  const generation = useRef(0);
  const host = useRef<HTMLElement>(null);
  useEffect(() => { active.current = true; return () => { active.current = false; generation.current++; stopSpeaking(); }; }, []);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let hidden = Boolean(element.closest('[hidden]'));
    const observer = new MutationObserver(() => {
      const next = Boolean(element.closest('[hidden]'));
      if (next && !hidden) { generation.current++; setPlaying(false); setHeard(false); }
      hidden = next;
    });
    for (let node: HTMLElement | null = element; node; node = node.parentElement) observer.observe(node, { attributes:true, attributeFilter:['hidden'] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => { if (done) onDone?.(); }, [done, onDone]);
  useEffect(() => { if (context === 'lesson') saveEnglishPractice(childId, lessonId, 'phonics:lesson', { stage, supported, done, unlocked }); }, [childId, context, done, lessonId, stage, supported, unlocked]);
  useEffect(() => {
    if(stage >= 2 || picked !== (stage === 0 ? task.same ? '相同' : '不同' : task.letter)) return;
    const timer=window.setTimeout(()=>{setUnlocked(value=>Math.max(value,stage+1));setStage(value=>value+1);setHeard(false);setPicked(null);setSupported(false);setReading(false);setMessage('');stopSpeaking();generation.current++;},750);
    return ()=>window.clearTimeout(timer);
  },[stage,picked,task]);
  const target = stage === 0 ? task.words.join('. ') : task.reference;
  const answer = stage === 0 ? task.same ? '相同' : '不同' : task.letter;
  const choices = stage === 0 ? ['相同', '不同'] : englishOptions([...new Set([task.letter, ...(unit?.letters.items.map((item) => item.letter.toLowerCase()).filter((letter) => letter !== task.letter) ?? []).slice(0, 2)])], `${lessonId}:sound-letter`);
  const listen = () => {
    const request = ++generation.current;
    stopEnglishNarration();
    setPlaying(true); setHeard(false); setMessage('');
    speakOnce(target, 'en', 0.85, (played) => {
      if (!active.current || request !== generation.current) return;
      setPlaying(false); setHeard(played);
      if (!played) setMessage('没有成功播放，可以重试或先做看读。');
    });
  };
  const choose = (value: string) => {
    if ((!heard && !reading) || playing || picked === answer) return;
    setPicked(value);
    const correct = value === answer;
    recordEnglishEvidence(childId, { lessonId, taskId: `phonics:${stage === 0 ? 'sound' : 'letter'}`, skill: 'phonics', level: correct ? supported ? 'supported' : 'independent' : 'needs-help', source: reading ? 'self' : 'check', context, note: stage === 0 ? '完整词中的声音比较' : '听完整词对应字母' });
    if (!correct) setSupported(true);
    setMessage(correct ? '找到了。接着把声音和字母联系起来。' : `再听${task.position === 'last' ? '词尾' : '开头'}，不要只想字母名。`);
  };
  return <section ref={host} className="en-phonics-practice en-full-panel" aria-label="声音到拼读练习" data-english-leaf data-english-narration-mode="instructions-only" data-english-narration-key={`phonics:${stage}`} data-english-narration={stage === 0 ? `听两个完整词，比较${task.position === 'last' ? '末尾' : '开头'}的声音是否相同。` : stage === 1 ? `听完整词，选出${task.position === 'last' ? '末尾' : '开头'}对应的字母。` : '用学过的声音，试着读这个单词，再用短句表达。'}><div className="en-phonics-heading"><header><div><span>声音与拼读</span><h3>{['先听声音', '声音对应字母', '合音读单词'][stage]}</h3></div><b>{stage + 1} / 3</b></header>{originalAudio}</div><nav className="en-phonics-tabs" aria-label="拼读练习任务">{['听声音','认字母','读单词'].map((label,index)=><button type="button" key={label} disabled={index>unlocked} aria-current={stage===index?'step':undefined} className={stage===index?'active':''} onClick={()=>{generation.current++;stopEnglishNarration();setStage(index);setPicked(null);setHeard(false);setPlaying(false);setReading(false);setMessage('');}}><i aria-hidden="true">{index<unlocked||(index===2&&done)?'✓':index+1}</i><span>{label}</span></button>)}</nav>
    {stage < 2 ? <div className="en-phonics-task"><p className="en-phonics-question"><EnglishSingleLineText>{stage === 0 ? `听两个完整词，比较${task.position === 'last' ? '末尾' : '开头'}的声音是否相同。` : `听完整词，选出它${task.position === 'last' ? '末尾' : '开头'}对应的字母。`}</EnglishSingleLineText></p>
      <div className="en-phonics-listen"><div className="en-phonics-listen-heading"><span className="en-phonics-listen-icon" aria-hidden="true"><IconCourseSpeaker size={20} /></span><b>先听完整词</b></div><div className="en-phonics-listen-controls"><button type="button" className="en-phonics-play" disabled={!canPlay || playing} data-tab-audio onClick={listen}>{playing ? '正在播放…' : heard ? '再听一次' : '听完整词'}</button>{playing && <button type="button" className="en-phonics-secondary" onClick={() => { generation.current++; stopEnglishNarration(); setPlaying(false); setHeard(false); setMessage('播放已停止，可以重新听。'); }}>停止播放</button>}{(!canPlay || message.includes('没有成功播放')) && <button type="button" className="en-phonics-secondary" onClick={() => { setReading(true); setSupported(true); }}>先看词练习</button>}</div>{reading && <p className="en-phonics-reading">{target}</p>}</div>
      <div className="en-phonics-answer"><b>再选答案</b><div className="en-phonics-choices">{choices.map((choice) => <button type="button" key={choice} disabled={(!heard && !reading) || playing || picked === answer} className={picked === choice ? choice === answer ? 'correct' : 'wrong' : ''} onClick={() => choose(choice)}><EnglishSingleLineText>{choice}</EnglishSingleLineText></button>)}</div><small>{heard || reading ? stage === 0 ? '比较两个词的声音。' : '选出与声音对应的字母。' : '听完完整词后，就可以选择。'}</small></div>
      <p className="en-phonics-feedback" role="status">{message || (playing ? '认真听，播放结束后再作答。' : heard ? '听完了，试着选出答案。' : reading ? '现在是看词练习，可以选择答案。' : '点击“听完整词”开始。')}</p></div> : <div className="en-phonics-reading-task">
      <p className="en-phonics-question"><EnglishSingleLineText>用学过的声音，试着自己读出这个单词。</EnglishSingleLineText></p>
      <div className="en-phonics-word-focus"><strong className="en-novel-word">{task.novel}</strong><button type="button" className="en-phonics-secondary" aria-expanded={supported} onClick={() => setSupported(true)}>{supported ? '分音提示' : '看看分音提示'}</button><div className="en-phonics-hint-slot">{supported && <div className="en-blend-sounds en-phonics-sounds"><div className="en-phonics-sound-row">{task.sounds.map((sound, index) => <span className="en-phonics-sound-step" key={index}>{index > 0 && <i aria-hidden="true">＋</i>}<span>{sound}</span></span>)}</div><small>把每个声音连起来，读成一个完整词。</small></div>}</div></div>
      <div className="en-phonics-speaking"><EnglishObservation lessonId={lessonId} taskId="phonics:blend" readingTarget={task.novel} readingSentence={task.sentence} prompt={`读出单词 ${task.novel}。字母声音：${task.sounds.join("、")}。`} skill="phonics" criteria={['实际读出目标词', '读出的内容与目标词对应']} supported={supported} context={context} onDone={() => setDone(true)} />
      {done && <div className="en-word-in-sentence"><b>放回短句再读</b><EnglishReadingLine text={task.sentence} aria-label="听短句" onClick={() => speakOnce(task.sentence, 'en', 0.85)}/></div>}</div>
    </div>}
  </section>;
}
