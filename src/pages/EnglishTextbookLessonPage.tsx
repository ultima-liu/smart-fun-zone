import CourseReplayButton from '../components/CourseReplayButton';
import EnglishRecordedMaterials from '../components/EnglishRecordedMaterials';
import EnglishReadingLayout from '../components/EnglishReadingLayout';
import EnglishReadingLine from '../components/EnglishReadingLine';
import ScreenLetterWriting from '../components/ScreenLetterWriting';
import EnglishSingleLineText from '../components/EnglishSingleLineText';
import SpeechReadingCheck from '../components/SpeechReadingCheck';
import { getEnglishDiscovery } from '../content/englishDiscovery';
import { englishLetterNarration, englishLetterWord } from '../content/englishLetterRecognition';
import { usePracticeAttempt } from '../usePracticeAttempt';
import PracticeAgain from '../components/PracticeAgain';
import { WholeStage } from '../components/ScreenPages';
import BackButton from '../components/BackButton';
import {IconCourseSpeaker} from '../components/icons';
import { useVoiceAvailability } from '../useVoiceAvailability';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store';
import { playSfx, speakOnce, speakSeq, stopSpeaking } from '../speech';
import ClassroomActivities, { EnglishClassroomContext } from '../components/EnglishClassroomActivities';
import LessonHelp from '../components/LessonHelp';
import Modal from '../components/Modal';
import { useEnglishTabNarration, englishNarrationLeaf, englishNarrationText, playEnglishNarration, stopEnglishNarration } from '../englishTabNarration';
import { useActivityAdvance } from '../useActivityAdvance';
import { Confetti } from '../components/ui';
import { ENGLISH_G3_UPPER_REVISION, getEnglishG3Lesson, getEnglishG3Unit, type EnglishLesson, type EnglishQuiz, type EnglishUnit } from '../content/englishGrade3Upper';
import { getEnglishG3Extension } from '../content/englishG3Extensions';
import { englishLessonRecordings } from '../content/englishG3Audio';
import { ENGLISH_G3_PHONICS_CHANTS, ENGLISH_G3_SONGS } from '../content/englishG3Appendix';
import { wordPictureArt, wordPictureSrc } from '../content/englishWordPictures';
import { getEnglishG3StoryBoard } from '../content/englishG3Stories';
import { ENGLISH_G3_READ_SPOTLIGHTS, ENGLISH_G3_REVISION_SCENES } from '../content/englishG3Interactions';
import { scheduleReview } from '../reviewPlan';
import { englishOptions, recordEnglishEvidence, readEnglishPractice, saveEnglishPractice } from '../englishLearning';
import { englishWordSentence, getEnglishTeaching } from '../content/englishTeaching';
import { EnglishExpressionPractice, EnglishPhonicsPractice } from './EnglishLearningActivities';
import EnglishProjectBuilder from './EnglishProjectBuilder';
import { settleCourseTask } from '../taskSystem';
import '../chinese-textbook.css';
import '../english-textbook.css';
import '../english-teaching.css';
import '../english-classroom.css';

const pageSrc = (page: number) => `/assets/english-textbook/pages/p${String(page).padStart(3, '0')}.webp`;
const sceneSrc = (unitId: string, section: 'a' | 'b', blockId: string) => `/assets/english-textbook/scenes/${unitId}-${section}-${blockId}.webp`;
type SourceItem = { id: string; text: string; speaker?: string; lang: 'zh' | 'en'; kind: 'line' | 'word' | 'letter' | 'step'; blockId?: string; letterInfo?: { letter: string; words: string[] } };

function WordPicture({ word }: { word: string }) {
  const painted = wordPictureArt(word);
  if (painted) {
    const position = `${(painted.column * 100) / 3}% ${(painted.row * 100) / 3}%`;
    return <span className="en-word-art-frame en-word-art-frame--painted" style={{ backgroundImage: `url(${painted.src})`, backgroundPosition: position }} aria-hidden="true" />;
  }
  const fallback = wordPictureSrc(word);
  return fallback ? <span className="en-word-art-frame"><img className="en-word-art" src={fallback} alt="" loading="lazy" draggable={false} onError={(event) => { event.currentTarget.parentElement?.remove(); }} /></span> : null;
}

function sourceItems(lesson: EnglishLesson): SourceItem[] {
  const unit = getEnglishG3Unit(lesson.unitId);
  const map = (list: string[], kind: SourceItem['kind'], lang: SourceItem['lang'] = 'en') => list.map((text, index) => ({ id: `${kind}-${index}`, text, lang, kind }));
  if (!unit) return map(ENGLISH_G3_UPPER_REVISION.pages.find((page) => page.id === lesson.id)?.lines ?? [], 'line');
  if (lesson.section === 'opening') return map(unit.opening.chant, 'line');
  if (lesson.section === 'a') return unit.a.blocks.flatMap((block) => [
    ...(block.turns ?? []).map((turn, index) => ({ id: `a-${block.id}-turn-${index}`, text: turn.text, speaker: turn.speaker, lang: 'en' as const, kind: 'line' as const, blockId: block.id })),
    ...(block.lines ?? []).map((text, index) => ({ id: `a-${block.id}-line-${index}`, text, lang: 'en' as const, kind: 'line' as const, blockId: block.id })),
    ...(block.words ?? []).map((text, index) => ({ id: `a-${block.id}-word-${index}`, text, lang: 'en' as const, kind: 'word' as const, blockId: block.id })),
  ]);
  if (lesson.section === 'letters') return unit.letters.items.map((item, index) => ({ id: `letter-${index}`, text: `${item.letter} — ${item.words.join(' / ')}`, lang: 'en' as const, kind: 'letter' as const, letterInfo: { letter: item.letter, words: [...item.words] } }));
  if (lesson.section === 'b') return unit.b.blocks.flatMap((block) => [
    ...(block.turns ?? []).map((turn, index) => ({ id: `b-${block.id}-turn-${index}`, text: turn.text, speaker: turn.speaker, lang: 'en' as const, kind: 'line' as const, blockId: block.id })),
    ...(block.lines ?? []).map((text, index) => ({ id: `b-${block.id}-line-${index}`, text, lang: 'en' as const, kind: 'line' as const, blockId: block.id })),
    ...(block.words ?? []).map((text, index) => ({ id: `b-${block.id}-word-${index}`, text, lang: 'en' as const, kind: 'word' as const, blockId: block.id })),
  ]);
  if (lesson.section === 'read') return map(unit.read.lines, 'line');
  if (lesson.section === 'project') return map(unit.project.steps, 'step', 'zh');
  return map(unit.story.lines, 'line');
}

const SPEAKER_COLORS = ['#4f9bd8', '#e0834f', '#57bd8d', '#b678d8', '#d3ab4e', '#d86f92'];
function speakerColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return SPEAKER_COLORS[hash % SPEAKER_COLORS.length];
}

function PageReference({ lesson }: { lesson: EnglishLesson }) {
  const [current, setCurrent] = useState(lesson.pageStart);
  const pages = Array.from({ length: lesson.pageEnd - lesson.pageStart + 1 }, (_, i) => lesson.pageStart + i);
  return <aside className="en-page-reference"><div className="en-page-ref-head"><b>教材情境 · {lesson.page}</b><small>这里用原书画面核对细节，操作和练习在右侧重新设计</small></div><img src={pageSrc(current)} alt={`${lesson.title}教材第 ${current} 页`} draggable="false" /><div className="en-page-switch" aria-label="选择教材页">{pages.map((page) => <button key={page} className={current === page ? 'active' : ''} onClick={() => setCurrent(page)}>P{page}</button>)}</div></aside>;
}


function TextbookScene({ src, title, blockId }: { src: string; title: string; blockId: string }) {
  const [expanded,setExpanded]=useState(false);
  useEffect(()=>{if(!expanded)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setExpanded(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[expanded]);
  return <><button type="button" className={`en-block-scene en-block-scene--${blockId}`} onClick={()=>{stopSpeaking();setExpanded(true);}} aria-expanded={expanded} aria-label={`放大${title}教材场景`}><img src={src} alt={`${title}教材局部场景插图`} draggable={false}/><span><b>教材场景</b><small>点图放大</small></span></button>{expanded&&<Modal onClose={()=>setExpanded(false)}><section className="en-scene-modal" role="dialog" aria-modal="true" aria-label={`${title}教材场景`} onClick={event=>event.stopPropagation()}><header><h3>{title}</h3><button type="button" autoFocus aria-label="关闭教材场景" onClick={()=>setExpanded(false)}>×</button></header><img src={src} alt={`${title}完整教材场景`} draggable={false}/></section></Modal>}</>;
}

/** 词卡永远带着一个能开口说的短句，而不是孤立地拼字母。 */
const wordSentence = englishWordSentence;

function RolePlayPanel({ lessonId, items, onShadowTarget }: { lessonId: string; items: SourceItem[]; onShadowTarget: (item: SourceItem, onDone?: () => void) => void }) {
  const turns = useMemo(() => items.filter((item) => item.lang === 'en' && item.speaker && item.blockId === 'talk'), [items]);
  const roles = useMemo(() => [...new Set(turns.map((item) => item.speaker!))], [turns]);
  const [role, setRole] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [turnIndex, setTurnIndex] = useState(0);
  const [said, setSaid] = useState<Set<string>>(() => new Set());
  const [systemSaid, setSystemSaid] = useState<Set<string>>(() => new Set());
  const [systemSpeaking, setSystemSpeaking] = useState(false);
  useEffect(() => { setRole(null); setStarted(false); setTurnIndex(0); setSaid(new Set()); setSystemSaid(new Set()); setSystemSpeaking(false); stopSpeaking(); }, [lessonId]);
  useEffect(() => {
    const current = turns[turnIndex];
    if (!started || !role || !current || current.speaker === role || systemSpeaking) return;
    let active = true;
    let completed = false;
    const finish = () => {
      if (!active || completed) return;
      completed = true;
      setSystemSaid((currentTurns) => new Set(currentTurns).add(current.id));
      setSystemSpeaking(false);
      setTurnIndex((index) => index + 1);
    };
    setSystemSpeaking(true);
    speakOnce(current.text, 'en', .82, finish);
    // 静音或浏览器拒绝自动播放时，舞台仍会自然把系统台词演完。
    const fallback = window.setTimeout(finish, Math.max(1250, Math.min(3500, current.text.length * 95)));
    return () => { active = false; window.clearTimeout(fallback); };
  // 不把 systemSpeaking 放进依赖：它只是舞台动画状态，变更时不能清掉当前系统台词的完成定时器。
  }, [role, started, turnIndex, turns]);
  if (roles.length < 2) return null;
  const current = turns[turnIndex];
  const complete = started && turnIndex >= turns.length;
  const selectRole = (speaker: string) => {
    stopSpeaking();
    setRole(speaker); setStarted(false); setTurnIndex(0); setSaid(new Set()); setSystemSaid(new Set()); setSystemSpeaking(false);
  };
  const start = () => { setTurnIndex(0); setSaid(new Set()); setSystemSaid(new Set()); setStarted(true); playSfx('tap'); };
  return <section className="en-role-play" aria-label="课本对话角色扮演">
    <header><div><span>ROLE PLAY · MINI STAGE</span><h4>选一个角色，和系统演一段对话</h4></div><p>你只负责自己的台词；其余角色会自动接话、朗读并推动下一轮。</p></header>
    <div className="en-role-choices" aria-label="选择要扮演的角色">{roles.map((speaker) => <button type="button" key={speaker} className={role === speaker ? 'active' : ''} onClick={() => selectRole(speaker)}><i style={{ background: speakerColor(speaker) }}>{speaker.slice(0, 1)}</i><span>我来演 {speaker}</span></button>)}</div>
    {role && <div className={`en-role-stage ${started ? 'playing' : ''} ${complete ? 'complete' : ''}`}>
      <div className="en-role-cast" aria-label="本次演出角色"><span className={systemSpeaking ? 'speaking' : ''}><i>✦</i>系统演 {roles.filter((speaker) => speaker !== role).join(' / ')}</span><b>↔</b><span className={current?.speaker === role && started ? 'speaking child' : 'child'}><i style={{ background: speakerColor(role) }}>{role.slice(0, 1)}</i>我演 {role}</span></div>
      {!started ? <div className="en-role-ready"><p>角色选好了。系统会先说自己的台词；轮到你时，打开跟读窗说出这一句。</p><button type="button" onClick={start}>开始演出 →</button></div> : <>{complete && <div className="en-role-finish"><b>✓ 这段对话演完了</b><p>你完成了自己的 {said.size} 句台词，系统已接完其余角色；下面保留完整台词，方便回看。</p><button type="button" onClick={start}>↻ 再演一遍</button></div>}<div className="en-role-script" aria-live="polite">{turns.map((item, index) => {
        const mine = item.speaker === role;
        const done = mine ? said.has(item.id) : systemSaid.has(item.id);
        const active = index === turnIndex;
        return <article key={item.id} className={`${mine ? 'child-line' : 'system-line'} ${done ? 'said' : ''} ${active ? 'active' : ''}`}><i style={{ background: mine ? speakerColor(role) : speakerColor(item.speaker!) }}>{item.speaker!.slice(0, 1)}</i><div><small>{mine ? '轮到我' : '系统角色'} · {item.speaker}</small><strong><EnglishSingleLineText>{item.text}</EnglishSingleLineText></strong></div>{mine && active ? <button type="button" onClick={() => onShadowTarget(item, () => { setSaid((currentSaid) => new Set(currentSaid).add(item.id)); setTurnIndex((indexNow) => indexNow + 1); playSfx('correct'); })}>🎙 我来说</button> : <em>{done ? '✓' : active && systemSpeaking ? '系统正在说…' : mine ? '等待' : '待接话'}</em>}</article>;
      })}</div></>}
    </div>}
  </section>;
}


function PhraseMatchActivity({ items, globalIndex, stateClass, onVisit, itemRef, onWrong, onComplete,lessonId,initialComplete }: { items: SourceItem[]; globalIndex: Map<string, number>; stateClass: (item: SourceItem) => string; onVisit: (item: SourceItem, index: number) => void; itemRef: (index: number, el: HTMLElement | null) => void; onWrong?: (kind: string, answer: string) => void; onComplete?:()=>void;lessonId:string;initialComplete?:boolean }) {
  const pairs = [[items[0], items[1]], [items[2], items[3]], [items[4], items[5]]].filter((pair): pair is [SourceItem, SourceItem] => !!pair[0] && !!pair[1]);
  const left = pairs.map(([item]) => item);
  const right = pairs.length === 3 ? [pairs[2][1], pairs[0][1], pairs[1][1]] : pairs.map(([, item]) => item);
  const answer = new Map(pairs.map(([first, second]) => [first.id, second.id]));
  const [active, setActive] = useState<string | null>(null);
  const childId=useStore(state=>state.activeChildId);
  const [savedMatched,setSavedMatched]=useState<Set<string>>(()=>new Set(initialComplete?pairs.flatMap(pair=>pair.map(item=>item.id)):readEnglishPractice(childId,lessonId,'source:phrase-match-links',{matched:[] as string[]}).matched));
  useEffect(()=>saveEnglishPractice(childId,lessonId,'source:phrase-match-links',{matched:[...savedMatched]}),[childId,lessonId,savedMatched]);
  const [matched, setMatched, complete, restart] = usePracticeAttempt(savedMatched, setSavedMatched, new Set<string>(), value => pairs.length > 0 && value.size === pairs.length * 2);
  const [message, setMessage] = useState('先选左边的情境句，再选择右边最自然的回应。');
  useEffect(()=>{if(complete)onComplete?.();},[complete,onComplete]);
  const selectLeft = (item: SourceItem) => {
    const index = globalIndex.get(item.id)!;
    onVisit(item, index);
    setActive(item.id);
    setMessage(`已经选择 “${item.text}”，请在右边找回应。`);
  };
  const selectRight = (item: SourceItem) => {
    const index = globalIndex.get(item.id)!;
    onVisit(item, index);
    if (!active) { setMessage('请先选择左边的一句话。'); playSfx('wrong'); return; }
    if (answer.get(active) !== item.id) { setMessage('这两句话接起来不够自然，再观察人物当时发生了什么。'); playSfx('wrong'); const leftItem = left.find((choice) => choice.id === active); const rightAnswer = pairs.find(([first]) => first.id === active)?.[1]; onWrong?.('Look and match', `${leftItem?.text ?? ''} → ${rightAnswer?.text ?? ''}`); return; }
    const leftItem = left.find((choice) => choice.id === active)!;
    setMatched((current) => new Set(current).add(active).add(item.id));
    setMessage(`配对成功：${leftItem.text} — ${item.text}`);
    setActive(null);
    playSfx(matched.size >= 4 ? 'win' : 'correct');
  };
  return <div className="en-match-activity" aria-label="Look and match 互动配对">
    <PracticeAgain complete={complete} onRestart={() => { restart(); setActive(null); }} /><div className="en-match-board">
      <div>{left.map((item) => { const index = globalIndex.get(item.id)!; return <button type="button" key={item.id} ref={(el) => itemRef(index, el)} className={`en-source-item en-match-option ${stateClass(item)} ${active === item.id ? 'active' : ''} ${matched.has(item.id) ? 'matched' : ''}`} disabled={matched.has(item.id)} aria-pressed={active === item.id} onClick={() => selectLeft(item)}><i aria-hidden="true" /><strong><EnglishSingleLineText>{item.text}</EnglishSingleLineText></strong><span>先发生</span></button>; })}</div>
      <svg viewBox="0 0 42 180" preserveAspectRatio="none" aria-hidden="true"><path d="M7 30 H35M7 90 H35M7 150 H35" /></svg>
      <div>{right.map((item) => { const index = globalIndex.get(item.id)!; return <button type="button" key={item.id} ref={(el) => itemRef(index, el)} className={`en-source-item en-match-option ${stateClass(item)} ${matched.has(item.id) ? 'matched' : ''}`} disabled={matched.has(item.id)} onClick={() => selectRight(item)}><i aria-hidden="true" /><strong><EnglishSingleLineText>{item.text}</EnglishSingleLineText></strong><span>怎样回应</span></button>; })}</div>
    </div>
    <p className={matched.size === 6 ? 'complete' : ''} role="status"><b>{matched.size === 6 ? '三组全部连对了！' : `已完成 ${matched.size / 2} / 3 组`}</b><span>{message}</span></p>
  </div>;
}

function restoredSourceReady(childId:string|null,lesson:EnglishLesson|undefined,items:SourceItem[],seen:string[]) {
  if(!lesson || !items.length || !items.every(item=>seen.includes(item.id)))return false;
  const done=(id:string)=>readEnglishPractice(childId,lesson.id,id,{done:false}).done===true;
  if(lesson.section==='opening')return done('source:rhythm');
  if(lesson.section==='letters')return done('phonics:lesson')&&done('source:writing');
  if(lesson.section==='read')return done('source:reading-clue');
  if(lesson.section==='project')return done('source:project-start');
  if(lesson.section==='story'||lesson.unitId==='revision') {
    const count=lesson.unitId==='revision'?(ENGLISH_G3_REVISION_SCENES[lesson.id]??[]).length:(getEnglishG3StoryBoard(lesson.unitId)?.scenes??[]).length;
    return count>0&&Array.from({length:count},(_,index)=>done(`source:scene-${index}:clue`)).every(Boolean);
  }
  return lesson.id!=='friends-b'||done('source:phrase-match');
}

function useEnglishTask(lessonId: string, id: string) {
  const childId = useStore(state => state.activeChildId);
  const [done, setDone] = useState(() => readEnglishPractice(childId, lessonId, id, {done:false}).done === true);
  const complete = useCallback(() => { saveEnglishPractice(childId, lessonId, id, {done:true}); setDone(true); }, [childId, lessonId, id]);
  return [done, complete] as const;
}

type ReaderProps = {lesson: EnglishLesson; items: SourceItem[]; seen:Set<string>; playingIndex:number|null; canPlay:boolean; onVisit:(item:SourceItem,index:number)=>void; onPlayScene:(start:number,end:number)=>void; onStoryComplete:(ready:boolean)=>void; onShadowTarget:(item:SourceItem,onDone?:()=>void)=>void; itemRef:(index:number,el:HTMLElement|null)=>void; onWrong?:(kind:string,answer:string)=>void};

function SourceLines({items, allItems, seen, onVisit, itemRef,unitId=''}: Pick<ReaderProps,'items'|'seen'|'onVisit'|'itemRef'> & {allItems:SourceItem[]; unitId?:string}) {
  return <div className={`en-source-lines-grid ${items.every(item => item.kind === 'word') ? 'en-source-lines-grid--words' : ''}`} data-english-narration={items.map(item => item.letterInfo ? englishLetterNarration(item.letterInfo) : `${item.speaker ? `${item.speaker}: ` : ''}${item.text}`).join('。')}>
    {items.map(item => { const index = allItems.findIndex(candidate => candidate.id === item.id); return <EnglishReadingLine key={item.id} ref={element => itemRef(index,element)} className={`en-source-item ${seen.has(item.id) ? 'seen' : ''} ${item.kind === 'word' ? 'en-source-item--word' : ''}`} onClick={() => onVisit(item,index)} aria-label={`点读第 ${index+1} 项：${item.text}`} text={item.text} lang={item.lang} marker={seen.has(item.id) ? '✓' : index + 1} speaker={item.speaker} example={item.kind === 'word' ? wordSentence(item.text, unitId) : undefined} picture={item.kind === 'word' ? <WordPicture word={item.text} /> : item.kind === 'letter' ? <b className="en-letter-glyph">{item.letterInfo?.letter} {item.letterInfo?.letter.toLowerCase()}</b> : undefined}/>; })}
  </div>;
}

function LetterRecognitionCard({ item, index, seen, onVisit, onShadowTarget, itemRef }: Pick<ReaderProps, 'onVisit'|'onShadowTarget'|'itemRef'> & {item:SourceItem;index:number;seen:boolean}) {
  const info = item.letterInfo!;
  const [selectedWord,setSelectedWord] = useState(info.words[0]);
  return <article className={`en-letter-study-card ${seen ? 'seen' : ''}`} ref={element=>itemRef(index,element)} aria-label={`认字母 ${info.letter}`}>
    <button type="button" className="en-letter-name" data-tab-audio onClick={()=>onVisit(item,index)} aria-label={`点读字母 ${info.letter} 和例词`}>
      <span className="en-letter-name-label">字母名</span>
      <b className="en-letter-glyph">{info.letter} {info.letter.toLowerCase()}</b>
      <span className="en-letter-name-action">{seen ? '✓ ' : ''}听字母和例词 <IconCourseSpeaker size={20} /></span>
    </button>
    <div className="en-letter-examples">{info.words.map(word=>{
      const {meaning,picture}=englishLetterWord(word);
      return <button type="button" className="en-letter-example" data-tab-audio key={word} aria-label={`点读 ${word}，${meaning}`} aria-pressed={selectedWord===word} onClick={()=>{setSelectedWord(word);playEnglishNarration(`${word}。${meaning}。`);}}>
        {picture&&<WordPicture word={picture}/>}
        <span className="en-letter-example-text"><strong lang="en">{[...word].map((char,at)=>char.toLowerCase()===info.letter.toLowerCase()?<em key={at}>{char}</em>:char)}</strong><span lang="zh">{meaning}</span></span>
      </button>;
    })}</div>
    <button type="button" className="en-letter-shadow" data-tab-audio onClick={()=>{stopEnglishNarration();onShadowTarget({...item,kind:'word',text:selectedWord});}} aria-label={`跟读 ${selectedWord}`}>🎤 跟读 {selectedWord}</button>
  </article>;
}

function LetterRecognition(props:ReaderProps) {
  return <section className="en-full-panel en-letter-recognition" data-english-narration={props.items.map(item=>englishLetterNarration(item.letterInfo!)).join('。')}>
    <div className="en-letter-recognition-heading"><header><h3>大写、小写和例词一起认</h3><p>先听字母名，再听例词和中文意思。</p></header><button type="button" className="en-appendix-link" onClick={()=>{stopSpeaking();window.location.hash="/english-course/appendix?unit=alphabet";}}>完整字母表 →</button></div>
    <div className="en-letter-study-grid">{props.items.map((item,index)=><LetterRecognitionCard key={item.id} item={item} index={index} seen={props.seen.has(item.id)} onVisit={props.onVisit} onShadowTarget={props.onShadowTarget} itemRef={props.itemRef}/>)}</div>
    <p className="en-letter-study-note">点例词可以单独听；蓝色字母也可能出现在词中或词尾。</p>
  </section>;
}

function EnglishSceneTask({props, scene, index, onReady}: {props:ReaderProps; scene:{title:string;page:number;focus:string;lineIndexes:number[];question:string;options:readonly string[];answer:string;explain:string};index:number;onReady:(ready:boolean)=>void}) {
  const [solved, complete] = useEnglishTask(props.lesson.id,`source:scene-${index}:clue`);
  const [pick,setPick] = useState<string|null>(solved ? scene.answer : null);
  const material = scene.lineIndexes.map(at=>props.items[at]).filter(Boolean);
  const read = material.every(item=>props.seen.has(item.id));
  const ready = read && solved;
  useEffect(()=>onReady(ready),[onReady,ready]);
  return <ClassroomActivities activityKey={`scene-${index}`} className="ct-subtasks en-scene-subtasks" labels={['听读画面','找线索']} completed={[read,ready]}>
    <section className="en-reader-panel en-full-panel"><header><h3>{scene.title}</h3><CourseReplayButton label="连续听这一幕" disabled={!props.canPlay} onClick={()=>props.onPlayScene(scene.lineIndexes[0],scene.lineIndexes[scene.lineIndexes.length-1]+1)}/></header><EnglishReadingLayout picture={<img src={pageSrc(scene.page)} alt={`${scene.title} · 教材 P${scene.page}`} draggable={false}/>}><SourceLines {...props} unitId={props.lesson.unitId} items={material} allItems={props.items}/></EnglishReadingLayout></section>
    <QuizPanel title={`${scene.title} · 找线索`} quiz={{question:scene.question, options:[...scene.options] as EnglishQuiz['options'],answer:scene.answer,explain:scene.explain}} pick={pick} onPick={value=>{setPick(value);if(value===scene.answer)complete();else props.onWrong?.('场景线索',`${scene.question} → ${scene.answer}`);playSfx(value===scene.answer?'correct':'wrong');}}/>
  </ClassroomActivities>;
}

function EnglishStoryTasks(props:ReaderProps) {
  const board = getEnglishG3StoryBoard(props.lesson.unitId);
  const scenes = props.lesson.unitId === 'revision' ? (ENGLISH_G3_REVISION_SCENES[props.lesson.id] ?? []).map(scene=>({...scene,question:scene.prompt})) : (board?.scenes ?? []).map(scene=>({...scene,...scene.clue}));
  const [completed,setCompleted] = useState<boolean[]>(()=>scenes.map((scene,index)=>scene.lineIndexes.every(at=>props.seen.has(props.items[at]?.id))&&readEnglishPractice(useStore.getState().activeChildId,props.lesson.id,`source:scene-${index}:clue`,{done:false}).done));
  const ready = scenes.length>0 && completed.length === scenes.length && completed.every(Boolean);
  useEffect(()=>props.onStoryComplete(ready),[props.onStoryComplete,ready]);
  return <ClassroomActivities className="en-story-tasks" labels={scenes.map((_,index)=>`第 ${index+1} 幕`)} completed={completed}>
    {scenes.map((scene,index)=><EnglishSceneTask key={index} props={props} scene={scene} index={index} onReady={value=>setCompleted(current=>current[index]===value?current:current.map((item,at)=>at===index?value:item))}/>)}
  </ClassroomActivities>;
}

function EnglishOpeningTasks(props:ReaderProps & {unit:EnglishUnit}) {
  const [complete,markComplete] = useEnglishTask(props.lesson.id,'source:rhythm');
  const [expected,setExpected] = useState(complete ? props.items.length : 0);
  const [feedback,setFeedback] = useState('按教材顺序，点出下一拍。');
  useEffect(()=>props.onStoryComplete(complete),[props.onStoryComplete,complete]);
  return <ClassroomActivities labels={['教材任务 1','歌曲文字']} completed={[complete,false]} advanceThrough={1}>
    <section className="en-opening-task en-full-panel" data-english-narration={props.items.map(item=>item.text).join('。')}><header><h3><EnglishSingleLineText>{props.unit.question}</EnglishSingleLineText></h3><span>歌谣接龙 · {Math.min(expected,props.items.length)} / {props.items.length}</span></header><EnglishReadingLayout picture={<img src={pageSrc(props.lesson.pageStart)} alt={`${props.lesson.title}教材画面`}/>} footer={<p role="status">{feedback}</p>}><div className="en-source-lines-grid">{props.items.map((item,index)=><EnglishReadingLine key={item.id} ref={element=>props.itemRef(index,element)} className={`en-source-item ${props.seen.has(item.id)?'seen':''} ${index===expected?'next':''}`} text={item.text} marker={props.seen.has(item.id)?'✓':index+1} onClick={()=>{if(!complete&&index!==expected){setFeedback(`先找第 ${expected+1} 拍。`);return;}props.onVisit(item,index);if(!complete){setExpected(index+1);if(index+1===props.items.length)markComplete();}setFeedback('读得好，把歌谣接下去。');}}/>)}</div></EnglishReadingLayout></section>
    <section className="en-song-task en-full-panel"><header><h3>{props.unit.opening.song}</h3><span>歌曲文字 · 选学</span></header><EnglishReadingLayout><div className="en-source-lines-grid en-song-phrases">{ENGLISH_G3_SONGS[props.unit.id].map((line,index)=><EnglishReadingLine key={index} text={line} marker={index+1} aria-label={`点读第 ${index+1} 句：${line}`} onClick={()=>speakOnce(line,'en',.82)}/>)}</div></EnglishReadingLayout></section>
  </ClassroomActivities>;
}

function EnglishReadingTasks(props:ReaderProps & {unit:EnglishUnit}) {
  const spotlight = ENGLISH_G3_READ_SPOTLIGHTS[props.unit.id];
  const [solved, complete] = useEnglishTask(props.lesson.id,'source:reading-clue');
  const [pick,setPick]=useState<string|null>(solved?props.items[spotlight.answerIndex].text:null);
  const read = props.items.every(item=>props.seen.has(item.id));
  const ready = read && solved;
  useEffect(()=>props.onStoryComplete(ready),[props.onStoryComplete,ready]);
  return <ClassroomActivities labels={['教材任务 1','教材任务 2']} completed={[read,ready]}>
    <section className="en-reader-panel en-full-panel"><header><h3>从文本里找证据</h3><span>{props.unit.read.task}</span></header><EnglishReadingLayout picture={<img src={pageSrc(props.lesson.pageStart)} alt={`${props.lesson.title}教材画面`}/>}><SourceLines {...props} unitId={props.lesson.unitId} allItems={props.items}/></EnglishReadingLayout></section>
    <QuizPanel title="证据定位" quiz={{question:spotlight.prompt,options:props.items.map(item=>item.text),answer:props.items[spotlight.answerIndex].text,explain:spotlight.explain}} pick={pick} onPick={value=>{setPick(value);if(value===props.items[spotlight.answerIndex].text)complete();else props.onWrong?.('证据定位',`${spotlight.prompt} → ${props.items[spotlight.answerIndex].text}`);}}/>
  </ClassroomActivities>;
}

function EnglishProjectPlan(props:ReaderProps & {unit:EnglishUnit}) {
  const [solved, complete] = useEnglishTask(props.lesson.id,'source:project-start');
  const [pick,setPick]=useState<string|null>(solved?props.items[0].text:null);
  const read=props.items.every(item=>props.seen.has(item.id));
  const ready=read&&solved;
  useEffect(()=>props.onStoryComplete(ready),[props.onStoryComplete,ready]);
  return <ClassroomActivities labels={['制作计划','先做什么']} completed={[read,ready]} advanceThrough={2}>
    <section className="en-reader-panel en-full-panel"><header><h3>{props.unit.project.title}</h3><span>{props.unit.project.sentence}</span></header><EnglishReadingLayout picture={<img src={pageSrc(props.lesson.pageStart)} alt="项目教材画面"/>}><SourceLines {...props} unitId={props.lesson.unitId} allItems={props.items}/></EnglishReadingLayout></section>
    <QuizPanel title="制作前的准备" quiz={{question:'真正制作前，先选出项目的起始动作。',options:props.items.map(item=>item.text),answer:props.items[0].text,explain:'起点正确。接下来按照计划实际制作作品。'}} pick={pick} onPick={value=>{setPick(value);if(value===props.items[0].text)complete();}}/>
  </ClassroomActivities>;
}

function LetterChant({unit}:{unit:EnglishUnit}) {
  const chant=ENGLISH_G3_PHONICS_CHANTS[unit.id];
  return <section className="en-full-panel en-letter-chant" data-english-leaf data-english-narration-mode="instructions-only" data-english-narration="这里显示同一录音的两个文字部分。完整录音在教材听读中播放，例词可以点读。">
    <div className="en-letter-chant-heading"><header><h3>字母歌谣 · 选学</h3><p>字母歌谣与词中声音歌谣，是同一段录音的两个部分。</p></header></div>
    <EnglishReadingLayout footer={<div className="en-letter-chant-decode"><b>完整词点读</b><div>{unit.letters.decode.map(word=><EnglishReadingLine key={word} text={word} aria-label={`点读完整词 ${word}`} onClick={()=>playEnglishNarration(word)}/>)}</div></div>}>
      <div className="en-letter-chant-parts">
        <section className="en-letter-chant-part" aria-label="录音第一部分：字母歌谣"><h4><span>1</span>字母歌谣</h4><div className="en-letter-chant-lines">{chant.alphabet.map((line,index)=><p key={index} lang="en"><EnglishSingleLineText>{line}</EnglishSingleLineText></p>)}</div></section>
        <section className="en-letter-chant-part" aria-label="录音第二部分：词中声音歌谣"><h4><span>2</span>词中声音歌谣</h4><div className="en-letter-chant-lines">{chant.examples.map((line,index)=><p key={index} className="en-letter-chant-verse" lang="en"><EnglishSingleLineText>{line}</EnglishSingleLineText></p>)}</div></section>
      </div>
    </EnglishReadingLayout>
  </section>;
}

function LettersWorkbench(props:ReaderProps & {unit:EnglishUnit}) {
  const [phonicsDone,setPhonicsDone]=useState(()=>readEnglishPractice(useStore.getState().activeChildId,props.lesson.id,'phonics:lesson',{done:false}).done);
  const [writingDone,completeWriting]=useEnglishTask(props.lesson.id,'source:writing');
  const read = props.items.every(item=>props.seen.has(item.id));
  const ready=read&&phonicsDone&&writingDone;
  useEffect(()=>props.onStoryComplete(ready),[props.onStoryComplete,ready]);
  const modelWords:Record<string,string>={friends:'dad',families:'bed',animals:'big',plants:'nod',colours:'cut',numbers:'wet'};
  return <ClassroomActivities className="en-letters-workbench" labels={['认字母','声音与拼读','规范书写','字母歌谣','教材拼读']} completed={[read,phonicsDone,writingDone,false,false]} advanceThrough={3}>
    <LetterRecognition {...props}/>
    <EnglishPhonicsPractice lessonId={props.lesson.id} canPlay={props.canPlay} onDone={()=>setPhonicsDone(true)}/>
    <ClassroomActivities className="ct-subtasks" labels={['占格规则','动手书写']} completed={[false,writingDone]}>
      <section className="en-writing-rules-task en-full-panel">
        <FourLineRuleFocus compact={props.unit.id!=='friends'}/>
      </section>
      <div className="en-writing-task en-full-panel"><LetterWritingPad lessonId={props.lesson.id} letters={props.unit.letters.items.map(item=>item.letter)} onDone={completeWriting}/></div>
    </ClassroomActivities>
    <LetterChant unit={props.unit}/>
    <section className="en-full-panel en-textbook-decode"><header><h3>Can you read the words?</h3><span>教材 P{props.unit.start+4}</span></header><p>先看教材示范，再试着把声音连起来。</p><div className="en-decode-model"><b>{modelWords[props.unit.id].split('').join(' · ')}</b><span>→</span><b>{modelWords[props.unit.id]}</b></div><div className="en-decode-words">{[...new Set([modelWords[props.unit.id],...props.unit.letters.decode])].map(word=><EnglishReadingLine key={word} text={word} onClick={()=>playEnglishNarration(word)}/>)}</div></section>
  </ClassroomActivities>;
}

function EnglishPartTasks(props:ReaderProps & {unit:EnglishUnit}) {
  const part=props.unit[props.lesson.section as 'a'|'b'];
  const [matchDone,completeMatch]=useEnglishTask(props.lesson.id,'source:phrase-match');
  const done=part.blocks.map(block=>props.items.filter(item=>item.blockId===block.id).every(item=>props.seen.has(item.id))&&(props.lesson.id!=='friends-b'||block.id!=='practice'||matchDone));
  const ready=done.every(Boolean);
  useEffect(()=>props.onStoryComplete(ready),[props.onStoryComplete,ready]);
  return <ClassroomActivities labels={part.blocks.map((_,index)=>`教材任务 ${index+1}`)} completed={done}>
    {part.blocks.map(block=>{
      const material=props.items.filter(item=>item.blockId===block.id);
      const groups=[material.filter(item=>item.kind!=='word'),material.filter(item=>item.kind==='word')].filter(group=>group.length);
      return <ClassroomActivities key={block.id} activityKey={block.id} className="ct-subtasks" labels={groups.map(group=>group[0].kind==='word'?'词与短句':'听读材料')} completed={groups.map(group=>group.every(item=>props.seen.has(item.id)))} advanceThrough={groups.length}>
        {groups.map((group,index)=><section key={index} className="en-reader-panel en-full-panel"><header><h3>{block.title}</h3><span>{block.goal}</span></header><EnglishReadingLayout picture={<TextbookScene src={sceneSrc(props.unit.id,props.lesson.section as 'a'|'b',block.id)} title={block.title} blockId={block.id}/>}>{props.unit.id==='friends'&&props.lesson.section==='b'&&block.id==='practice'?<PhraseMatchActivity lessonId={props.lesson.id} initialComplete={matchDone} items={group} globalIndex={new Map(props.items.map((item,at)=>[item.id,at]))} onComplete={completeMatch} stateClass={item=>props.seen.has(item.id)?'seen':''} onVisit={props.onVisit} itemRef={props.itemRef} onWrong={props.onWrong}/>:<SourceLines {...props} unitId={props.lesson.unitId} items={group} allItems={props.items}/>}</EnglishReadingLayout></section>)}
      </ClassroomActivities>;
    })}
  </ClassroomActivities>;
}

function SourceContent(props:ReaderProps) {
  const clips=englishLessonRecordings(props.lesson.id);
  if(!clips.length)return <SourcePracticeContent {...props}/>;
  return <ClassroomActivities className="ct-subtasks en-source-mode" labels={['教材听读','互动练习']} advanceThrough={0}>
    <EnglishRecordedMaterials clips={clips}/>
    <SourcePracticeContent {...props}/>
  </ClassroomActivities>;
}

function SourcePracticeContent(props:ReaderProps) {
  const unit=getEnglishG3Unit(props.lesson.unitId);
  if(!unit||props.lesson.section==='story')return <EnglishStoryTasks {...props}/>;
  if(props.lesson.section==='opening')return <EnglishOpeningTasks {...props} unit={unit}/>;
  if(props.lesson.section==='letters')return <LettersWorkbench {...props} unit={unit}/>;
  if(props.lesson.section==='read')return <EnglishReadingTasks {...props} unit={unit}/>;
  if(props.lesson.section==='project')return <EnglishProjectPlan {...props} unit={unit}/>;
  return <EnglishPartTasks {...props} unit={unit}/>;
}

/** 跟读复用浏览器识别与本地内容核对；通过后自动收起，不提供发音评分。 */
function RepeatDock({ target, art, lessonId, onClose, onDone }: { target: string; art?: string; lessonId: string; onClose: () => void; onDone: () => void }) {
  const childId = useStore(state => state.activeChildId);
  return createPortal(<div className="en-player-mask"><div className="en-player" role="dialog" aria-label={`跟读：${target}`}>
    <button className="en-player-close" onClick={onClose} aria-label="关闭跟读">✕</button>
    <SpeechReadingCheck key={target} target={target} art={art} presentation="player" onPass={result => {
      recordEnglishEvidence(childId, { lessonId, taskId: `repeat:${target}`.slice(0,160), skill: 'reading', level: 'independent', source: 'check', context: 'lesson', note: result.feedback });
      onDone();
    }} />
  </div></div>, document.body);
}

function QuizPanel({ quiz, pick, onPick, title, showRestart = true }: { quiz: EnglishQuiz; pick: string | null; onPick: (value: string) => void; title: string; showRestart?: boolean }) {
  const choices = englishOptions(quiz.options, quiz.question);
  const [wasComplete, setWasComplete] = useState(pick === quiz.answer);
  const complete = wasComplete || pick === quiz.answer;
  const [attemptPick, setAttemptPick] = useState<string | null>(null);
  const shownPick = complete ? attemptPick : pick;
  const right = shownPick === quiz.answer;
  const script = `${quiz.question}。答案选项：${choices.map((value, index) => `选项${index + 1}，${value}`).join('；')}`;
  return <section className="en-quiz en-full-panel" aria-label={title} data-english-narration={quiz.question}>
    {showRestart && <PracticeAgain complete={complete} onRestart={() => setAttemptPick(null)} />}<div className="en-quiz-head"><span>{title}</span></div>
    <div className="en-question-row"><h3><EnglishSingleLineText>{quiz.question}</EnglishSingleLineText></h3><CourseReplayButton label="朗读题目和选项" onClick={() => playEnglishNarration(script)} /></div>
    <div className="en-quiz-options" data-english-options>{choices.map(value => <button type="button" key={value} className={shownPick === value ? right ? 'correct' : 'wrong' : ''} onClick={() => { setAttemptPick(value); if (value === quiz.answer) setWasComplete(true); onPick(value); }}><EnglishSingleLineText>{value}</EnglishSingleLineText></button>)}</div>
    <div className="en-question-hints"><span>💡 提示</span><p role="status">{shownPick ? right ? quiz.explain : '回到教材画面里找信息，再试一次。' : '看清问题，再选出自己的答案。'}</p></div>
  </section>;
}

function ColourMixer({ onDone }: { onDone: () => void }) {
  const [choice, setChoice] = useState<string[]>([]);
  const result = choice.includes('red') && choice.includes('blue') ? 'purple' : choice.includes('blue') && choice.includes('yellow') ? 'green' : choice.length >= 2 ? 'orange' : '';
  return <div className="en-colour-mixer"><span>动手演示 · 先预测再混色</span><h3><EnglishSingleLineText>请选择 red 和 blue，观察教材的紫色从哪里来</EnglishSingleLineText></h3><div className="en-colour-choice">{['red', 'blue', 'yellow'].map((colour) => <button key={colour} className={`${colour} ${choice.includes(colour) ? 'selected' : ''}`} onClick={() => { const next = choice.includes(colour) ? choice.filter((item) => item !== colour) : choice.length === 2 ? [choice[1], colour] : [...choice, colour]; setChoice(next); if (next.includes('red') && next.includes('blue')) onDone(); }} aria-label={`选择 ${colour}`}><i />{colour}</button>)}</div><div className="en-mix-result">{choice.length >= 2 ? <><i className={result} /><strong>{choice.join(' + ')} → {result}</strong><small>实际颜料的深浅会因材料不同而变，这里演示教材的典型结果。</small></> : '选两种颜色，再看结果'}</div></div>;
}

function PairEven({ onDone }: { onDone: () => void }) {
  const [savedCount, saveCount] = useState(0);
  const [count, setCount, complete, restart] = usePracticeAttempt(savedCount, saveCount, 0, value => value >= 8);
  return <div className="en-even-task"><span>动手演示 · odd / even</span><h3><EnglishSingleLineText>把 9 个点两两配对，看看最后剩几个</EnglishSingleLineText></h3><div className="en-even-dots" role="group" aria-label="九个点两两配对">{Array.from({ length: 9 }, (_, index) => <button type="button" key={index} disabled={index !== count || count >= 8} className={index < count ? 'paired' : index === 8 ? 'last' : ''} onClick={() => { const next = count + 1; setCount(next); playSfx('tap'); if (next === 8) onDone(); }} aria-label={`第 ${index + 1} 个点`}>●</button>)}</div><p>{count < 8 ? `已配 ${Math.floor(count / 2)} 对，继续一次点两个。` : '配成 4 对，还剩 1 个；9 是 odd。'}</p>{complete && <button type="button" onClick={restart}>重新配对</button>}</div>;
}

function FourLineRuleFocus({ compact = false }: { compact?: boolean }) {
  if (compact) return <section className="en-four-line-review" aria-label="四线格占格规则复习" data-lesson-explanation="四线格占格复习。上格、中格、下格。大写住上、中两格；短小写住中格；高个向上伸，尾巴向下垂。">
    <span>占格复习</span><b>上格 · 中格 · 下格</b><p>大写住上、中两格；短小写住中格；高个向上伸，尾巴向下垂。</p>
  </section>;
  return <section className="en-four-line-focus" aria-label="四线格书写规则重点" data-lesson-explanation="英语四线格：认识上格、中格、下格。把书写区看成三层小房子。大写字母主要住在上格和中格。短小写住中格，不跑到上下两格。高个字母从中格向上伸。有尾巴的字母从中格向下垂；教材手写 f 伸入下格，占三格。记住：大写住上中；短小写住中；高个向上伸，尾巴向下垂。">
    <header><span>FIRST KEY · 首次重点</span><h3>英语四线格：认识上格、中格、下格</h3><p>把书写区看成三层小房子。先看字母住哪一格，再观察它会不会向上伸、向下垂。</p></header>
    <div className="en-four-line-map" aria-label="四线格分为上格、中格和下格，样例：大写 A、短小写 a、高个 h、有尾巴 g">
      <div className="en-four-line-zones">
        <div className="top"><b>上格</b><span>高个字母会伸进来</span></div>
        <div className="mid"><b>中格</b><span>所有小写字母的家</span></div>
        <div className="low"><b>下格</b><span>有尾巴的字母会垂下来</span></div>
      </div>
      <svg className="en-four-line-grid-svg" viewBox="190 0 444 236" role="img" aria-hidden="true">
        <line x1="6" y1="14" x2="634" y2="14" /><line x1="6" y1="84" x2="634" y2="84" /><line x1="6" y1="154" x2="634" y2="154" /><line x1="6" y1="224" x2="634" y2="224" />
        <g className="en-four-letters">
          <path d="M208 154 L240 14 L272 154" /><path d="M216 120 L264 120" />
          <circle cx="350" cy="119" r="35" /><path d="M385 84 L385 154" />
          <path d="M430 14 L430 154" /><path d="M430 84 C462 84 480 102 480 154" />
          <circle cx="545" cy="119" r="35" /><path d="M580 110 L580 168 C580 198 557 214 535 220" />
        </g>
      </svg>
    </div>
    <div className="en-four-line-rules">
      <article><b>大写字母</b><strong>A B C</strong><span>主要住在上格和中格，大小要整齐。</span></article>
      <article><b>短小写</b><strong>a c e m n o r s u v w x z</strong><span>安安稳稳住在中格，不跑到上下两格。</span></article>
      <article><b>高个</b><strong>b d f h k l t</strong><span>从中格向上伸；教材手写 f 还伸入下格，占三格。</span></article>
      <article><b>有尾巴</b><strong>f g j p q y</strong><span>从中格向下垂，尾巴进下格。</span></article>
    </div>
    <p className="en-four-line-mnemonic">口诀：大写住上中；短小写住中；高个向上伸，尾巴向下垂。</p>
  </section>;
}

function LetterWritingPad({ letters, lessonId, onDone }: { letters: string[]; lessonId: string; onDone: () => void }) {
  const childId = useStore(state => state.activeChildId);
  const targets = letters.flatMap(letter => [letter, letter.toLowerCase()]);
  const [active, setActive] = useState(targets[0]);
  const [checked, setChecked] = useState<string[]>(() => readEnglishPractice(childId, lessonId, 'writing:screen-letters', {checked: [] as string[]}).checked);
  useEffect(() => { if (targets.every(letter => checked.includes(letter))) onDone(); }, [targets, checked, onDone]);
  return <section className="en-screen-letter-workbench" aria-label="书写实验室"><h3>在四线格里写 {active}</h3>
    <nav className="en-screen-letter-tabs" aria-label="选择练写字母">{targets.map(letter => <button key={letter} className={active === letter ? 'active' : ''} type="button" onClick={() => setActive(letter)}>{checked.includes(letter) ? '✓ ' : ''}{letter}</button>)}</nav>
    <ScreenLetterWriting key={active} letter={active} onPass={supported => {
      const next = [...new Set([...checked, active])]; setChecked(next);
      saveEnglishPractice(childId, lessonId, 'writing:screen-letters', {checked: next});
      recordEnglishEvidence(childId, { lessonId, taskId: `writing:letter:${active}`, skill: 'writing', level: supported ? 'supported' : 'independent', source: 'check', context: 'lesson', note: `屏幕逐笔检查字母 ${active} 的轨迹、方向、顺序和占格` });
    }} />
  </section>;
}

const PHASES = ['看图发现', '听读原课', '教材练习', '实际表达', '迁移挑战'];
const PROMPTS = ['观察画面，选择一个你想了解的问题。', '点读材料，再完成当前任务；歌曲和辨音使用教材原声。', '根据教材情境作判断，再实际动手试一试。', '跟着示范说，借助提示说，再换个情境自己说。', '把本课的方法用到新问题里。'];

export default function EnglishTextbookLessonPage() {
  const { lessonId = '' } = useParams();
  const childId = useStore(state => state.activeChildId);
  return <EnglishLessonSession key={`${childId}:${lessonId}`} lessonId={lessonId} />;
}

function EnglishLessonSession({ lessonId }: { lessonId: string })  {
  const nav = useNavigate();
  const lesson = useMemo(() => getEnglishG3Lesson(lessonId), [lessonId]);
  const unit = lesson ? getEnglishG3Unit(lesson.unitId) : undefined;
  const extension = getEnglishG3Extension(lessonId);
  const childId = useStore((s) => s.activeChildId);
  const mastery = useStore((s) => s.mastery);
  const addSkillResult = useStore((s) => s.addSkillResult);
  const addWrong = useStore((s) => s.addWrong);
  const voiceOn = useStore((s) => s.voiceOn);
  const ttsConfigured = useVoiceAvailability();
  const sound = useStore((s) => s.sound);
  const setVoiceOn = useStore((s) => s.setVoiceOn);
  const toggleSound = useStore((s) => s.toggleSound);
  const items = useMemo(() => lesson ? sourceItems(lesson) : [], [lesson]);
  const flowKey = `sfz-english-g3a-flow-v6:${childId ?? 'guest'}:${lessonId}`;
  const restored = useMemo(() => {
    try { const value = JSON.parse(localStorage.getItem(flowKey) ?? localStorage.getItem(flowKey.replace('flow-v6:', 'flow-v5:')) ?? '{}') as { phase?: number; unlocked?: number; seen?: string[]; operationPick?: string; operationDone?: boolean; transferPick?: string; mistakes?: number; stars?: number; sourceActivityDone?: boolean; reviewStartedAt?: number; reviewDoneDays?: number[] }; return { phase: Math.min(4, Math.max(0, !localStorage.getItem(flowKey) && (value.phase ?? 0) >= 3 ? 4 : value.phase ?? 0)), unlocked: Math.min(4, Math.max(0, !localStorage.getItem(flowKey) && (value.unlocked ?? 0) >= 3 ? 4 : value.unlocked ?? 0)), seen: value.seen ?? [], operationPick: value.operationPick ?? null, operationDone: !!value.operationDone, transferPick: value.transferPick ?? null, mistakes: value.mistakes ?? 0, stars: value.stars ?? 0, sourceActivityDone: restoredSourceReady(childId,lesson,items,value.seen??[]), reviewStartedAt: Number(value.reviewStartedAt) || 0, reviewDoneDays: Array.isArray(value.reviewDoneDays) ? value.reviewDoneDays.filter((day) => [0, 2, 4].includes(day)) : [] }; } catch { return { phase: 0, unlocked: 0, seen: [] as string[], operationPick: null, operationDone: false, transferPick: null, mistakes: 0, stars: 0, sourceActivityDone: false, reviewStartedAt: 0, reviewDoneDays: [] as number[] }; }
  }, [childId, flowKey, lesson, lessonId]);
  const [phase, setPhase] = useState(restored.phase);
  const [unlocked, setUnlocked] = useState(restored.unlocked);
  const [seen, setSeen] = useState<Set<string>>(() => new Set(restored.seen));
  const [guess, setGuess] = useState<string | null>(null);
  const [operationPick, setOperationPick] = useState<string | null>(restored.operationPick);
  const [operationDone, setOperationDone] = useState(restored.operationDone);
  const [transferPick, setTransferPick] = useState<string | null>(restored.transferPick);
  const [mistakes, setMistakes] = useState(restored.mistakes);
  const [awardedStars, setAwardedStars] = useState(restored.stars);
  const [repeat, setRepeat] = useState<{ text: string; art?: string; onDone?: () => void } | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [sourceActivityDone, setSourceActivityDone] = useState(restored.sourceActivityDone);
  const [reviewStartedAt, setReviewStartedAt] = useState(restored.reviewStartedAt);
  const [reviewDoneDays, setReviewDoneDays] = useState<number[]>(restored.reviewDoneDays);
  const itemEls = useRef<(HTMLElement | null)[]>([]);
  const celebratedRef = useRef(false);
  const activeFlowRef = useRef(flowKey);
  const bestStars = childId ? mastery[childId]?.[`english-g3a-${lessonId}`]?.stars ?? 0 : 0;
  const extraRequired = lesson?.section === 'project' || lessonId === 'colours-a' || lessonId === 'numbers-read';
  const teaching = lesson ? getEnglishTeaching(lesson.id) : undefined;
  const [expressionDone, setExpressionDone] = useState(() => readEnglishPractice(childId, lessonId, 'expression:lesson', { done: false }).done);
  const sourceDone = items.length > 0 && items.every((item) => seen.has(item.id)) && sourceActivityDone;
  const canPlay = voiceOn && sound && ttsConfigured && items.length > 0;
  const operationReady = !!lesson && operationPick === teaching!.check.answer && (!extraRequired || operationDone);
  useEffect(() => { if (!lesson || !extension) nav('/subject/english', { replace: true }); }, [extension, lesson, nav]);
  useEffect(() => {
    if (activeFlowRef.current !== flowKey) return;
    try { localStorage.setItem(flowKey, JSON.stringify({ phase, unlocked, seen: [...seen], operationPick, operationDone, transferPick, mistakes, stars: awardedStars, sourceActivityDone, reviewStartedAt, reviewDoneDays })); } catch { /* 私密模式仍可临时学习 */ }
  }, [awardedStars, flowKey, mistakes, operationDone, operationPick, phase, reviewDoneDays, reviewStartedAt, seen, sourceActivityDone, transferPick, unlocked]);
  // 同一个路由组件切换课时时 React 不会自动卸载；显式恢复新课状态，避免上一课的 line-0 等标记串到下一课。
  useEffect(() => {
    if (activeFlowRef.current === flowKey) return;
    activeFlowRef.current = flowKey;
    setPhase(restored.phase);
    setUnlocked(restored.unlocked);
    setSeen(new Set(restored.seen));
    setGuess(null);
    setOperationPick(restored.operationPick);
    setOperationDone(restored.operationDone);
    setExpressionDone(readEnglishPractice(childId, lessonId, 'expression:lesson', { done: false }).done);
    setTransferPick(restored.transferPick);
    setMistakes(restored.mistakes);
    setAwardedStars(restored.stars);
    setRepeat(null);
    setPlayingIndex(null);
    setCelebrate(false);
    setSourceActivityDone(restored.sourceActivityDone);
    setReviewStartedAt(restored.reviewStartedAt);
    setReviewDoneDays(restored.reviewDoneDays);
    celebratedRef.current = restored.seen.length >= items.length && items.length > 0;
    itemEls.current = [];
    stopSpeaking();
  }, [flowKey, items.length, restored]);
  // 断点恢复时已完成的点读不重复庆祝；集满只庆祝一次，"再学一遍"重置后再集满可再庆祝
  useEffect(() => { if (items.length > 0 && seen.size >= items.length) celebratedRef.current = true;

  }, []);
  useEffect(() => {
    if (items.length === 0 || seen.size < items.length || celebratedRef.current) return;
    celebratedRef.current = true;
    setCelebrate(true);
    playSfx('correct');
    const timer = window.setTimeout(() => setCelebrate(false), 2800);
    return () => window.clearTimeout(timer);
  }, [seen, items]);
  // 最后一个必做材料完成时收起跟读窗，随后按真实任务状态推进。
  useEffect(() => { if (sourceDone) setRepeat(null); }, [sourceDone]);
  useEffect(() => () => stopSpeaking(), []);
  const completeSourceActivity = useCallback((ready: boolean) => setSourceActivityDone(ready), []);
  const rootRef = useRef<HTMLDivElement>(null);
  const narration = useEnglishTabNarration(rootRef, `${flowKey}:${phase}`);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const referenceTriggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!referenceOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setReferenceOpen(false); };
    window.addEventListener('keydown', close);
    return () => { window.removeEventListener('keydown', close); referenceTriggerRef.current?.focus(); };
  }, [referenceOpen]);
  const touched = useRef(false);
  const phaseCompleted = [guess !== null, sourceDone, operationReady, expressionDone, awardedStars > 0];
  const advancePhase = (next: number) => { if(!touched.current) return; stopSpeaking(); setPlayingIndex(null); setPhase(next); setUnlocked(value => Math.max(value, next)); };
  useActivityAdvance(flowKey, phaseCompleted, phase, advancePhase);
  useEffect(()=>{if(phaseCompleted[phase]&&phase<4)setUnlocked(value=>Math.max(value,phase+1));},[phase,phaseCompleted[phase]]);
  useEffect(() => {
    if (phase !== 4 || transferPick !== extension?.transfer.answer || awardedStars > 0 || !operationReady || !expressionDone) return;
    const timer = window.setTimeout(() => {
      setAwardedStars(3); setReviewStartedAt(current => current || Date.now());
      if (childId && lesson && extension) {
        addSkillResult(childId, `english-g3a-${lesson.id}`, 3);
        scheduleReview(childId, { subject: 'english', lessonId: lesson.id, title: lesson.title, focus: `${extension.title}：${extension.mnemonic}`, route: `/english-course/${lesson.id}` });
        settleCourseTask(childId, 'english', lesson.id, '3 星');
      }
      try{const saved=JSON.parse(localStorage.getItem(flowKey)??'{}');localStorage.setItem(flowKey,JSON.stringify({...saved,phase:4,unlocked:4,stars:3,reviewStartedAt:saved.reviewStartedAt||Date.now()}));}catch{/* Reward is also stored in the child's record. */}
      nav(`/subject/english?unit=${lesson?.unitId??'friends'}`);
    }, 950);
    return () => window.clearTimeout(timer);
  }, [phase, transferPick, extension, awardedStars, operationReady, expressionDone, childId, lesson, addSkillResult, flowKey, nav]);

  if (!lesson || !extension) return null;
  const speakTextOf = (item: SourceItem) => item.letterInfo ? englishLetterNarration(item.letterInfo) : item.text;
  const playRange = (start: number, end = items.length) => {
    if (!canPlay) return;
    stopSpeaking();
    const seq = items.slice(start, end);
    if (!seq.length) return;
    if (lesson.section === 'letters') { setPlayingIndex(null); playEnglishNarration(seq.map(speakTextOf).join('。')); return; }
    const rate = seq[0].lang === 'en' ? .85 : .9;
    setPlayingIndex(start);
    speakSeq(seq.map(speakTextOf), seq[0].lang, rate, (step) => {
      const at = start + step;
      const item = items[at];
      if (!item) return;
      setPlayingIndex(at);
      setSeen((current) => current.has(item.id) ? current : new Set(current).add(item.id));
    }, () => setPlayingIndex(null));
  };
  const playFrom = (start: number) => playRange(start, items.length);
  const itemRef = (index: number, el: HTMLElement | null) => { itemEls.current[index] = el; };
  // 跟读播放器的插图：词卡用手绘图，句子用所属板块的局部场景图
  const artForItem = (item: SourceItem) => {
    const part = lesson.section === 'a' || lesson.section === 'b' ? lesson.section : undefined;
    const scene = unit && part && item.blockId ? sceneSrc(unit.id, part, item.blockId) : undefined;
    if (lesson.section === 'letters' && item.kind === 'word') {
      const picture = englishLetterWord(item.text).picture;
      return picture ? wordPictureSrc(picture) ?? undefined : undefined;
    }
    // 词卡优先用手绘词图；句子没有词图，直接用所属板块的局部场景
    if (item.kind === 'word') return wordPictureSrc(item.text) ?? scene;
    return scene;
  };
  const onItem = (item: SourceItem, index: number) => {
    if (item.letterInfo) {
      setPlayingIndex(null);
      const completeVisit=()=>{
        setSeen(current=>new Set(current).add(item.id));
        recordEnglishEvidence(childId, { lessonId, taskId:`source:${item.id}`, skill:'phonics', level:'practiced', source:'self', context:'lesson', note:'点读或查看材料，不代表独立掌握' });
      };
      if (canPlay) playEnglishNarration(englishLetterNarration(item.letterInfo),completeVisit);
      else { stopEnglishNarration();completeVisit(); }
      playSfx('tap');return;
    }
    setSeen((current) => new Set(current).add(item.id));
    recordEnglishEvidence(childId, { lessonId, taskId: `source:${item.id}`, skill: lesson.section === 'letters' ? 'phonics' : 'reading', level: 'practiced', source: 'self', context: 'lesson', note: '点读或查看材料，不代表独立掌握' });
    if (playingIndex !== null) { playFrom(index); playSfx('tap'); return; }
    speakOnce(item.text, item.lang, item.lang === 'en' ? .85 : .9); if (item.lang === 'en') setRepeat({ text: item.text, art: artForItem(item) });
    playSfx('tap');
  };
  const rememberWrong = (kind: string, answer: string) => {
    if (!childId) return;
    addWrong(childId, { uid: `english-${lesson.id}-${kind}-${answer}`, lessonId: `english-g3a-${lesson.id}`, lessonName: lesson.title, kind, answer, time: Date.now() });
  };
  const chooseOperation = (value: string) => {
    const correct = value === teaching!.check.answer;
    recordEnglishEvidence(childId, { lessonId, taskId: 'check:source', skill: 'reading', level: correct ? operationPick !== null ? 'supported' : 'independent' : 'needs-help', source: 'check', context: 'lesson', note: teaching!.check.question });
    setOperationPick(current => current === teaching!.check.answer ? current : value);
    if (!correct) { setMistakes((count) => count + 1); rememberWrong('教材情境', `${teaching!.check.question} → ${teaching!.check.answer}`); playSfx('wrong'); } else playSfx('correct');
  };
  const chooseTransfer = (value: string) => {
    setTransferPick(current => awardedStars > 0 || current === extension.transfer.answer ? extension.transfer.answer : value);
    if (value !== extension.transfer.answer) { setMistakes((count) => count + 1); rememberWrong('知识迁移', `${extension.transfer.question} → ${extension.transfer.answer}`); playSfx('wrong'); return; }
    playSfx('correct');
  };
  const discovery = getEnglishDiscovery(lesson.id);
  const lookPrompts = discovery.prompts;
  const exampleQuestion = discovery.question;

  const catalogRoute = `/subject/english?unit=${lesson.unitId}`;
  return <EnglishClassroomContext.Provider value={`${flowKey}:${phase}`}><main className="ct-page ct-lesson-page en-lesson-page en-classroom page">
    <header className="ct-lesson-head en-lesson-head"><BackButton className="ct-back" onClick={()=>nav(catalogRoute)} aria-label="返回英语目录"/><div><span className="ct-eyebrow">{unit ? `Unit ${ENGLISH_G3_UPPER_UNITS_INDEX(lesson.unitId)} · ${unit.title}` : 'Revision'} · 教材 {lesson.page}</span><h1>{lesson.title}</h1><p>{lesson.subtitle}</p></div><button type="button" className="ct-reference-trigger" ref={referenceTriggerRef} onClick={()=>{stopSpeaking();setReferenceOpen(true);}}>看教材原页</button></header>
    <nav className="ct-phase-nav en-phase-nav" aria-label="本课学习步骤">{PHASES.map((label,index)=><button type="button" key={label} className={`${phase===index?'active':''} ${phaseCompleted[index]?'done':''}`} disabled={index>unlocked} onClick={()=>{stopSpeaking();setPlayingIndex(null);setPhase(index);}}><b>{phaseCompleted[index]?'✓':index+1}</b><span>{label}</span></button>)}</nav>
    <section className="en-common-prompt"><div><b>{PHASES[phase]}</b><p>{phase===4?`${extension.title}：${extension.mnemonic}`:PROMPTS[phase]}</p>{(!voiceOn||!sound||!ttsConfigured)&&<small role="status">{ttsConfigured?'声音已关闭':'语音暂不可用'}{ttsConfigured&&<button type="button" onClick={()=>{if(!sound)toggleSound();if(!voiceOn)setVoiceOn(true);}}>启用朗读</button>}</small>}</div><CourseReplayButton disabled={narration.disabled||!ttsConfigured} playbackOwner={narration.playbackOwner} onClick={narration.replay} /><LessonHelp title={lesson.title} subject="英语" context={()=>`${teaching!.goal}；${PHASES[phase]}；${rootRef.current ? englishNarrationText(englishNarrationLeaf(rootRef.current) ?? rootRef.current) : ''}`} /></section>
    <div ref={rootRef} className="en-classroom-content" onPointerDown={()=>{touched.current=true;}} onKeyDown={()=>{touched.current=true;}}>
      {phase===0&&<WholeStage><section className="en-observe-panel en-full-panel" data-english-narration={`${exampleQuestion}。观察画面，选择一个你想了解的问题。`}><div className="en-question-row"><h3><EnglishSingleLineText>{exampleQuestion}</EnglishSingleLineText></h3><CourseReplayButton label="朗读问题和选项" playbackOwner={narration.playbackOwner} onClick={narration.replay} /></div><div className="en-observe-art"><img src={pageSrc(discovery.page)} alt={`${lesson.title}教材情境`} draggable={false}/></div><div className="en-quiz-options" data-english-options>{lookPrompts.map(prompt=><button type="button" key={prompt} className={guess===prompt?'selected':''} onClick={()=>setGuess(prompt)}><EnglishSingleLineText>{prompt}</EnglishSingleLineText></button>)}</div><div className="en-question-hints">💡 选一个问题，带着它去听读教材。</div></section></WholeStage>}
      {phase===1&&<><SourceContent lesson={lesson} items={items} seen={seen} playingIndex={playingIndex} canPlay={canPlay} onVisit={onItem} onPlayScene={playRange} onStoryComplete={completeSourceActivity} onShadowTarget={(item,onDone)=>setRepeat({text:item.text,art:artForItem(item),onDone})} itemRef={itemRef} onWrong={rememberWrong}/>{celebrate&&<Confetti show/>}</>}
      {phase===2&&<ClassroomActivities key="operation" labels={['教材任务 1',...(extraRequired?['教材任务 2']:[])]} completed={[operationPick===teaching!.check.answer,...(extraRequired?[operationDone]:[])]}><QuizPanel showRestart={false} quiz={teaching!.check} pick={operationPick} onPick={chooseOperation} title="根据教材内容作判断"/>{lesson.section==='project'&&<EnglishProjectBuilder key={flowKey} lessonId={lessonId} unitId={lesson.unitId} onReady={setOperationDone}/ >}{lessonId==='colours-a'&&<ColourMixer onDone={()=>setOperationDone(true)}/ >}{lessonId==='numbers-read'&&<PairEven onDone={()=>setOperationDone(true)}/ >}</ClassroomActivities>}
      {phase===3&&<ClassroomActivities labels={['表达练习',...(items.filter(item=>item.speaker&&item.blockId==='talk').length>1?['角色扮演']:[])]} completed={[expressionDone,false]} advanceThrough={1}><EnglishExpressionPractice key={flowKey} lessonId={lessonId} onDone={()=>setExpressionDone(true)}/>{items.filter(item=>item.speaker&&item.blockId==='talk').length>1&&<RolePlayPanel lessonId={lessonId} items={items} onShadowTarget={(item,onDone)=>setRepeat({text:item.text,art:artForItem(item),onDone})}/>}</ClassroomActivities>}
      {phase===4&&<WholeStage><QuizPanel quiz={extension.transfer} pick={awardedStars > 0 ? extension.transfer.answer : transferPick} onPick={chooseTransfer} title="把方法用到新问题" />{awardedStars>0&&<div className="en-challenge-done"><p>可以反复练习，把学过的方法用一用。</p><p>✓ 本课已完成 · 学习奖励 {Math.max(bestStars,awardedStars)} 星</p><button type="button" onClick={()=>nav(catalogRoute)}>返回英语目录</button></div>}</WholeStage>}
    </div>
    {referenceOpen&&<Modal onClose={()=>setReferenceOpen(false)}><section className="en-reference-modal" role="dialog" aria-modal="true" aria-label="教材原页" onClick={event=>event.stopPropagation()}><header><h3>{lesson.title} · 教材原页</h3><button type="button" autoFocus aria-label="关闭教材原页" onClick={()=>setReferenceOpen(false)}>×</button></header><PageReference lesson={lesson}/></section></Modal>}
    {repeat&&<RepeatDock lessonId={lesson.id} target={repeat.text} art={repeat.art} onClose={()=>setRepeat(null)} onDone={()=>{repeat.onDone?.();setRepeat(null);}}/>}
  </main></EnglishClassroomContext.Provider>;
}

function ENGLISH_G3_UPPER_UNITS_INDEX(id: string) { return ['friends', 'families', 'animals', 'plants', 'colours', 'numbers'].indexOf(id) + 1; }
