import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store';
import { playSfx, speakMixedAfterCurrent, speakMixedSeq, speakOnce, speakSeq, stopSpeaking, volcConfigured } from '../speech';
import { readScore, useAsr } from '../speechAssess';
import TeacherGuideNote from '../components/TeacherGuideNote';
import { Confetti } from '../components/ui';
import { ENGLISH_G3_ALL_LESSONS, ENGLISH_G3_UPPER_REVISION, getEnglishG3Lesson, getEnglishG3Unit, type EnglishLesson, type EnglishQuiz, type EnglishUnit } from '../content/englishGrade3Upper';
import { getEnglishG3Extension } from '../content/englishG3Extensions';
import { englishOriginalAudio, englishOriginalTaskReady } from '../content/englishG3Audio';
import { ENGLISH_G3_PHONICS_CHANTS, ENGLISH_G3_SONGS } from '../content/englishG3Appendix';
import { wordPictureArt, wordPictureSrc } from '../content/englishWordPictures';
import { getEnglishG3StoryBoard } from '../content/englishG3Stories';
import { ENGLISH_G3_READ_SPOTLIGHTS, ENGLISH_G3_REVISION_SCENES } from '../content/englishG3Interactions';
import { completeReviewDay, scheduleReview } from '../reviewPlan';
import '../chinese-textbook.css';
import '../english-textbook.css';

const pageSrc = (page: number) => `/assets/english-textbook/pages/p${String(page).padStart(3, '0')}.webp`;
const sceneSrc = (unitId: string, section: 'a' | 'b', blockId: string) => `/assets/english-textbook/scenes/${unitId}-${section}-${blockId}.webp`;
const audioKey = (lesson: EnglishLesson) => lesson.id === 'families-a'
  ? 'families-a-finger-song'
  : lesson.unitId === 'revision'
    ? `revision-${lesson.id}-listening`
    : lesson.section === 'b'
      ? `${lesson.unitId}-b-chant`
  : `${lesson.unitId}-${lesson.section}-${lesson.section === 'opening' ? 'song' : lesson.section === 'letters' ? 'sounds' : 'listening'}`;
const needsOriginalAudio = (lesson: EnglishLesson) => lesson.unitId === 'revision' || lesson.id === 'families-a' || ['opening', 'letters', 'b', 'project'].includes(lesson.section);
const requiresInteractiveSource = (lesson: EnglishLesson | undefined) => !!lesson && (lesson.unitId === 'revision' || ['opening', 'read', 'project', 'story'].includes(lesson.section));
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

function OriginalAudio({ clipKey, label, note, onPlayChange }: { clipKey: string; label: string; note: string; onPlayChange?: (playing: boolean) => void }) {
  const src = englishOriginalAudio(clipKey);
  return <div className={`en-audio-slot ${src ? 'ready' : 'pending'}`}><b>{label}</b>{src ? <audio controls preload="none" src={src} onPlay={() => onPlayChange?.(true)} onPause={() => onPlayChange?.(false)} onEnded={() => onPlayChange?.(false)}>浏览器不支持音频播放</audio> : <p>原版 MP3 尚未提供。{note} 这里不把普通 TTS 伪装成歌声或辨音录音。</p>}</div>;
}

function TextbookScene({ src, title, blockId }: { src: string; title: string; blockId: string }) {
  const [expanded, setExpanded] = useState(false);
  return <button type="button" className={`en-block-scene en-block-scene--${blockId} ${expanded ? 'expanded' : ''}`} onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} aria-label={`${expanded ? '收起' : '放大'}${title}教材场景`}>
    <img src={src} alt={`${title}教材局部场景插图`} draggable="false" />
    <span><b>栏目局部场景</b><small>{expanded ? '收起局部画面，继续操作' : '点击放大人物、动作与物品'}</small></span>
  </button>;
}

/** 词卡永远带着一个能开口说的短句，而不是孤立地拼字母。 */
function wordSentence(word: string): string {
  const clean = word.toLowerCase().replace(/[^a-z ]/g, '');
  if (['red', 'blue', 'yellow', 'green', 'purple', 'pink', 'black', 'white', 'brown', 'orange'].includes(clean)) return `It's ${clean}.`;
  if (['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'].includes(clean)) return `I can see ${clean}.`;
  if (['mum', 'dad', 'mother', 'father', 'brother', 'sister', 'grandma', 'grandpa', 'grandmother', 'grandfather', 'aunt', 'uncle', 'cousin'].includes(clean)) return `This is my ${clean}.`;
  if (['apple', 'orange', 'banana', 'grapes', 'apples', 'oranges', 'bananas'].includes(clean)) return `I like ${clean}.`;
  if (['dog', 'cat', 'bird', 'rabbit', 'panda', 'tiger', 'lion', 'elephant', 'monkey', 'giraffe', 'fish'].includes(clean)) return `It's a ${clean}.`;
  if (['air', 'water', 'sun', 'tree', 'trees', 'flower', 'flowers', 'grass'].includes(clean)) return `I can see ${clean}.`;
  return `Say: ${word}.`;
}

/**
 * 每课都复用的磨耳朵闭环。TTS 只承担“逐句慢速示范”；涉及旋律、多人语气或教材听辨的地方仍保留原版音频入口。
 * 第三步不把浏览器转写当评分器，孩子可用跟说按钮观察机器听到的内容后自行确认。
 */
function ListeningRoutine({ lessonId, items, fallbackText, canPlay, onShadowTarget, onComplete, onWrong }: {
  lessonId: string;
  items: SourceItem[];
  fallbackText?: string;
  canPlay: boolean;
  onShadowTarget: (item: SourceItem) => void;
  onComplete: () => void;
  onWrong?: (kind: string, answer: string) => void;
}) {
  // 字母课没有普通 line 项；把每张字母卡的第一个例词作为完整单词听力目标，
  // 既不伪造孤立音位，也能让“看着听 → 盲听 → 跟读”闭环真正完成。
  const candidates = useMemo<SourceItem[]>(() => items
    .filter((item) => item.lang === 'en')
    .map((item) => item.kind === 'letter'
      ? { ...item, kind: 'line' as const, text: item.letterInfo?.words[0] ?? item.text }
      : item)
    .slice(0, 8), [items]);
  const target = candidates.find((item) => item.kind === 'line') ?? candidates[0] ?? (fallbackText ? { id: `${lessonId}-listening-focus`, text: fallbackText, lang: 'en' as const, kind: 'line' as const } : undefined);
  const options = useMemo(() => target ? [target, ...candidates.filter((item) => item.id !== target.id).slice(0, 2)] : [], [candidates, target]);
  const [withTextPlayed, setWithTextPlayed] = useState(false);
  const [blindPlayed, setBlindPlayed] = useState(false);
  const [blindRight, setBlindRight] = useState(false);
  const [shadowPlayed, setShadowPlayed] = useState(false);
  const [message, setMessage] = useState('先看着文字听一遍，再把文字藏起来听。');
  useEffect(() => {
    setWithTextPlayed(false); setBlindPlayed(false); setBlindRight(false); setShadowPlayed(false);
    setMessage('先看着文字听一遍，再把文字藏起来听。');
  }, [lessonId]);
  const complete = withTextPlayed && blindPlayed && blindRight && shadowPlayed;
  useEffect(() => { if (complete) onComplete(); }, [complete, onComplete]);
  if (!target) return null;
  const markPlayed = (mode: 'text' | 'blind' | 'shadow') => {
    if (mode === 'text') { setWithTextPlayed(true); setMessage(canPlay ? '很好。现在把文字藏起来，只用耳朵抓住这句话。' : '当前没有可用语音，先看读这句；打开语音后建议再完成一次真正听读。'); }
    if (mode === 'blind') { setBlindPlayed(true); setMessage(canPlay ? '听完了，在下面选出刚才听到的那一句。' : '当前没有可用语音，先依据刚才的句子做一次文字辨认；打开语音后可重做盲听。'); }
    if (mode === 'shadow') { setShadowPlayed(true); setMessage(canPlay ? '影子跟读完成。你可以再听一次，模仿停顿和语调。' : '现在先自己朗读；打开语音后，建议再用影子跟读模仿停顿和语调。'); }
  };
  const play = (mode: 'text' | 'blind' | 'shadow') => {
    if (!canPlay) { markPlayed(mode); return; }
    speakOnce(target.text, 'en', .78, () => {
      markPlayed(mode);
    });
  };
  return <section className={`en-listening-routine ${complete ? 'complete' : ''}`} aria-label="听力三步练习">
    <header><div><span>LISTENING ROUTINE · 约 1 分钟</span><h3>看着听 → 盲听 → 影子跟读</h3></div><p>用本课的一句核心表达磨耳朵；不要求一次全懂。</p></header>
    <div className="en-listening-steps">
      <article className={withTextPlayed ? 'done' : ''}><b>01</b><div><small>看着原文听</small><strong>{target.text}</strong><button type="button" onClick={() => play('text')}>▶ 慢速示范</button></div></article>
      <article className={blindRight ? 'done' : ''}><b>02</b><div><small>不看原文盲听</small><strong aria-hidden="true">• • • • • • •</strong><button type="button" disabled={!withTextPlayed} onClick={() => play('blind')}>▶ 只听声音</button></div></article>
      <article className={shadowPlayed ? 'done' : ''}><b>03</b><div><small>影子跟读</small><strong>{target.text}</strong><button type="button" disabled={!blindRight} onClick={() => { onShadowTarget(target); play('shadow'); }}>🎙 跟着音频读</button></div></article>
    </div>
    {blindPlayed && !blindRight && <div className="en-blind-pick"><b>刚才听到哪一句？</b><div>{options.map((item) => <button type="button" key={item.id} onClick={() => {
      if (item.id === target.id) { setBlindRight(true); setMessage('找对了！最后紧跟音频把它说出来。'); playSfx('correct'); }
      else { setMessage('先别看文字，再听一次，注意开头和最后一个词。'); playSfx('wrong'); onWrong?.('盲听辨句', `刚才听到哪一句 → ${target.text}`); }
    }}>{item.text}</button>)}</div></div>}
    <p role="status">{message}</p>
  </section>;
}

function RolePlayPanel({ lessonId, items, onShadowTarget }: { lessonId: string; items: SourceItem[]; onShadowTarget: (item: SourceItem, onDone?: () => void) => void }) {
  const turns = useMemo(() => items.filter((item) => item.lang === 'en' && item.speaker).slice(0, 6), [items]);
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
      {!started ? <div className="en-role-ready"><p>角色选好了。系统会先说自己的台词；轮到你时，打开跟读窗说出这一句。</p><button type="button" onClick={start}>开始演出 →</button></div> : complete ? <div className="en-role-finish"><b>✓ 这段对话演完了</b><p>你完成了自己的 {said.size} 句台词，系统已接完其余角色。</p><button type="button" onClick={start}>↻ 再演一遍</button></div> : <div className="en-role-script" aria-live="polite">{turns.map((item, index) => {
        const mine = item.speaker === role;
        const done = mine ? said.has(item.id) : systemSaid.has(item.id);
        const active = index === turnIndex;
        return <article key={item.id} className={`${mine ? 'child-line' : 'system-line'} ${done ? 'said' : ''} ${active ? 'active' : ''}`}><i style={{ background: mine ? speakerColor(role) : speakerColor(item.speaker!) }}>{item.speaker!.slice(0, 1)}</i><div><small>{mine ? '轮到我' : '系统角色'} · {item.speaker}</small><strong>{item.text}</strong></div>{mine && active ? <button type="button" onClick={() => onShadowTarget(item, () => { setSaid((currentSaid) => new Set(currentSaid).add(item.id)); setTurnIndex((indexNow) => indexNow + 1); playSfx('correct'); })}>🎙 我来说</button> : <em>{done ? '✓' : active && systemSpeaking ? '系统正在说…' : mine ? '等待' : '待接话'}</em>}</article>;
      })}</div>}
    </div>}
  </section>;
}

/** 只做“完整单词—首字母”音形连接，不把 TTS 伪装成教材的孤立音位听辨。 */
function SoundShapeLab({ lessonId, letters }: { lessonId: string; letters: SourceItem[] }) {
  const [index, setIndex] = useState(0);
  const [played, setPlayed] = useState(false);
  const [message, setMessage] = useState('先听完整单词，再找它开头的字母。');
  useEffect(() => { setIndex(0); setPlayed(false); setMessage('先听完整单词，再找它开头的字母。'); }, [lessonId]);
  const item = letters[index];
  if (!item?.letterInfo) return null;
  const word = item.letterInfo.words[0];
  const choices = [...new Set([item.letterInfo.letter, ...letters.filter((other) => other.id !== item.id).map((other) => other.letterInfo?.letter ?? '').filter(Boolean).slice(0, 3)])];
  return <section className="en-sound-shape" aria-label="单词音形连接">
    <span>SOUND + SHAPE</span><h4>听完整单词，找开头字母</h4><p>不是死背字母表：先听 <b>{word}</b>，再看它是从哪个字母开始的。</p>
    <button type="button" className="en-sound-play" onClick={() => { setPlayed(true); speakOnce(word, 'en', .72); }}>▶ 听 {word}</button>
    <div>{choices.map((letter) => <button type="button" key={letter} disabled={!played} onClick={() => {
      if (letter === item.letterInfo?.letter) { const next = (index + 1) % letters.length; setMessage(`对，${word} 从 ${letter} 开始。${next === 0 ? '这一轮完成，可以再听一遍。' : '换一个词继续。'}`); setIndex(next); setPlayed(false); playSfx('correct'); }
      else { setMessage('再听一次完整单词，注意它开头的声音和字母形状。'); playSfx('wrong'); }
    }}>{letter}</button>)}</div><small>{message}</small>
  </section>;
}

function StoryReader({ unitId, items, seen, playingIndex, canPlay, onVisit, onPlayScene, onComplete, itemRef, onWrong }: {
  unitId: string;
  items: SourceItem[];
  seen: Set<string>;
  playingIndex: number | null;
  canPlay: boolean;
  onVisit: (item: SourceItem, index: number) => void;
  onPlayScene: (start: number, end: number) => void;
  onComplete: () => void;
  itemRef: (index: number, el: HTMLElement | null) => void;
  onWrong?: (kind: string, answer: string) => void;
}) {
  const board = getEnglishG3StoryBoard(unitId);
  const [active, setActive] = useState(0);
  const [solved, setSolved] = useState<Set<number>>(() => new Set());
  const [feedback, setFeedback] = useState('先听读画面里的句子，再回答本幕线索。');
  useEffect(() => { setActive(0); setSolved(new Set()); setFeedback('先听读画面里的句子，再回答本幕线索。'); }, [unitId]);
  const sceneDone = (index: number) => {
    if (!board) return false;
    const target = board.scenes[index];
    return solved.has(index) && target.lineIndexes.every((lineIndex) => seen.has(items[lineIndex]?.id));
  };
  const boardDone = !!board && board.scenes.every((_, index) => sceneDone(index));
  useEffect(() => { if (boardDone) onComplete(); }, [boardDone, onComplete]);
  if (!board) return null;
  const scene = board.scenes[active];
  const unlocked = (index: number) => index === 0 || sceneDone(index - 1);
  const currentLinesDone = scene.lineIndexes.every((lineIndex) => seen.has(items[lineIndex]?.id));
  const currentDone = solved.has(active) && currentLinesDone;
  const pickClue = (value: string) => {
    if (value !== scene.clue.answer) {
      setFeedback('再看一眼画面和句子，线索就在这一幕里。');
      playSfx('wrong');
      onWrong?.('故事线索', `${scene.clue.question} → ${scene.clue.answer}`);
      return;
    }
    setSolved((current) => new Set(current).add(active));
    setFeedback(scene.clue.explain);
    playSfx('correct');
  };
  const first = scene.lineIndexes[0];
  const last = scene.lineIndexes[scene.lineIndexes.length - 1] + 1;
  return <section className="en-story-reader" style={{ '--story-accent': getEnglishG3Unit(unitId)?.color ?? '#4a99ca' } as CSSProperties}>
    <header className="en-story-intro"><div><span>INTERACTIVE READING</span><h3>把课文读成一段会推进的故事</h3></div><p>{board.mission}</p></header>
    <nav className="en-story-map" aria-label="故事分镜地图">{board.scenes.map((item, index) => {
      const open = unlocked(index);
      const done = sceneDone(index);
      return <button key={item.title} type="button" disabled={!open} className={`${active === index ? 'active' : ''} ${done ? 'done' : ''}`} onClick={() => { setActive(index); setFeedback(solved.has(index) ? item.clue.explain : '先听读画面里的句子，再回答本幕线索。'); }} aria-label={`第 ${index + 1} 幕 ${item.title}${open ? '' : '，未解锁'}`}><i>{done ? '✓' : index + 1}</i><span><b>{item.kicker}</b>{item.title}</span></button>;
    })}</nav>
    <div className="en-story-stage">
      <div className="en-story-art">
        <img src={pageSrc(scene.page)} alt={`教材第 ${scene.page} 页，${scene.title}场景`} style={{ objectPosition: scene.focus }} draggable="false" />
        <span><b>SCENE {active + 1}</b><small>P{scene.page} · {scene.title}</small></span>
      </div>
      <div className="en-story-script">
        <div className="en-story-scene-head"><span>{scene.kicker}</span><h3>{scene.title}</h3><p>{scene.summary}</p></div>
        <button type="button" className="en-story-play" disabled={!canPlay} onClick={() => onPlayScene(first, last)}>{playingIndex !== null && scene.lineIndexes.includes(playingIndex) ? '正在播放这一幕…' : '▶ 连续听这一幕'}</button>
        <div className={`en-story-lines ${scene.chat ? 'en-chat-lines' : ''}`}>{scene.lineIndexes.map((lineIndex, localIndex) => {
          const item = items[lineIndex];
          if (!item) return null;
          const isSeen = seen.has(item.id);
          if (scene.chat) { const side = localIndex % 2 === 1 ? 'right' : 'left'; const avatar = scene.avatars?.[localIndex % 2] ?? '🙂'; return <button type="button" key={item.id} ref={(el) => itemRef(lineIndex, el)} className={`en-source-item en-story-line ${side} ${isSeen ? 'seen' : ''} ${playingIndex === lineIndex ? 'playing' : ''}`} onClick={() => onVisit(item, lineIndex)} aria-label={`点读第 ${lineIndex + 1} 句：${item.text}`}><span className="en-chat-avatar" aria-hidden="true">{avatar}</span><span className="en-chat-bubble"><strong>{item.text}</strong><em aria-hidden="true">🔊</em></span>{isSeen && <span className="en-chat-check" aria-hidden="true">✓</span>}</button>; }
          return <button type="button" key={item.id} ref={(el) => itemRef(lineIndex, el)} className={`en-source-item en-story-line ${isSeen ? 'seen' : ''} ${playingIndex === lineIndex ? 'playing' : ''}`} onClick={() => onVisit(item, lineIndex)} aria-label={`点读第 ${lineIndex + 1} 句：${item.text}`}><i>{isSeen ? '✓' : localIndex + 1}</i><strong>{item.text}</strong><em aria-hidden="true">🔊</em></button>;
        })}</div>
      </div>
    </div>
    <div className={`en-story-clue ${solved.has(active) ? 'solved' : ''}`}><div><span>本幕线索</span><h4>{scene.clue.question}</h4></div><div>{scene.clue.options.map((option) => <button type="button" key={option} disabled={solved.has(active)} className={solved.has(active) && option === scene.clue.answer ? 'correct' : ''} onClick={() => pickClue(option)}>{option}</button>)}</div><p role="status">{feedback}</p></div>
    <div className="en-story-step"><span>{currentLinesDone ? '✓ 本幕句子已经听读' : `还要听读 ${scene.lineIndexes.filter((lineIndex) => !seen.has(items[lineIndex]?.id)).length} 句`}</span>{active < board.scenes.length - 1 ? <button type="button" disabled={!currentDone} onClick={() => { setActive(active + 1); setFeedback('先听读画面里的句子，再回答本幕线索。'); }}>进入下一幕 →</button> : <strong className={currentDone ? 'ready' : ''}>{currentDone ? board.ending : '完成听读和线索题，就能揭晓故事意义。'}</strong>}</div>
  </section>;
}

function PhraseMatchActivity({ items, globalIndex, stateClass, onVisit, itemRef, onWrong }: { items: SourceItem[]; globalIndex: Map<string, number>; stateClass: (item: SourceItem) => string; onVisit: (item: SourceItem, index: number) => void; itemRef: (index: number, el: HTMLElement | null) => void; onWrong?: (kind: string, answer: string) => void }) {
  const pairs = [[items[0], items[1]], [items[2], items[3]], [items[4], items[5]]].filter((pair): pair is [SourceItem, SourceItem] => !!pair[0] && !!pair[1]);
  const left = pairs.map(([item]) => item);
  const right = pairs.length === 3 ? [pairs[2][1], pairs[0][1], pairs[1][1]] : pairs.map(([, item]) => item);
  const answer = new Map(pairs.map(([first, second]) => [first.id, second.id]));
  const [active, setActive] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState('先选左边的情境句，再选择右边最自然的回应。');
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
    <div className="en-match-board">
      <div>{left.map((item) => { const index = globalIndex.get(item.id)!; return <button type="button" key={item.id} ref={(el) => itemRef(index, el)} className={`en-source-item en-match-option ${stateClass(item)} ${active === item.id ? 'active' : ''} ${matched.has(item.id) ? 'matched' : ''}`} disabled={matched.has(item.id)} aria-pressed={active === item.id} onClick={() => selectLeft(item)}><i aria-hidden="true" /><strong>{item.text}</strong><span>先发生</span></button>; })}</div>
      <svg viewBox="0 0 42 180" preserveAspectRatio="none" aria-hidden="true"><path d="M7 30 H35M7 90 H35M7 150 H35" /></svg>
      <div>{right.map((item) => { const index = globalIndex.get(item.id)!; return <button type="button" key={item.id} ref={(el) => itemRef(index, el)} className={`en-source-item en-match-option ${stateClass(item)} ${matched.has(item.id) ? 'matched' : ''}`} disabled={matched.has(item.id)} onClick={() => selectRight(item)}><i aria-hidden="true" /><strong>{item.text}</strong><span>怎样回应</span></button>; })}</div>
    </div>
    <p className={matched.size === 6 ? 'complete' : ''} role="status"><b>{matched.size === 6 ? '三组全部连对了！' : `已完成 ${matched.size / 2} / 3 组`}</b><span>{message}</span></p>
  </div>;
}

function OpeningReader({ unit, items, seen, onVisit, onComplete, itemRef }: { unit: EnglishUnit; items: SourceItem[]; seen: Set<string>; onVisit: (item: SourceItem, index: number) => void; onComplete: () => void; itemRef: (index: number, el: HTMLElement | null) => void }) {
  const [expected, setExpected] = useState(0);
  const songPhrasesRef = useRef<HTMLDivElement>(null);
  const [songLive, setSongLive] = useState(false);
  const onSongPlayChange = (p: boolean) => { setSongLive(p); if (p) songPhrasesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  const [feedback, setFeedback] = useState('先读第一拍，再把歌谣接下去。');
  useEffect(() => { setExpected(0); setFeedback('先读第一拍，再把歌谣接下去。'); }, [unit.id]);
  const complete = expected >= items.length && items.length > 0;
  useEffect(() => { if (complete) onComplete(); }, [complete, onComplete]);
  const choose = (item: SourceItem, index: number) => {
    if (index !== expected) { setFeedback(`先找第 ${expected + 1} 拍；歌谣要按教材节奏接龙。`); playSfx('wrong'); return; }
    onVisit(item, index);
    const next = index + 1;
    setExpected(next);
    setFeedback(next === items.length ? '节奏接龙完成！现在能听出这段歌谣怎样围绕单元问题展开了。' : `读得好，继续找下一拍（第 ${next + 1} 拍）。`);
    playSfx('correct');
  };
  return <section className="en-opening-reader">
    <header className="en-opening-hero"><div><span>UNIT LAUNCH</span><h3>{unit.question}</h3><p>不是把歌谣逐行念完：先观察问题，再按节奏把教材句子接成一段。</p></div><div className="en-opening-lenses">{unit.opening.look.map((look, index) => <span key={look}><i>{index + 1}</i>{look}</span>)}</div></header>
    <div className="en-rhythm-board"><div className="en-rhythm-side"><b>CHANT RELAY</b><strong>点下一拍</strong><p>第 {Math.min(expected + 1, items.length)} / {items.length} 拍</p><div aria-hidden="true">{items.map((item, index) => <i key={item.id} className={index < expected ? 'done' : index === expected ? 'next' : ''} />)}</div></div><div className="en-rhythm-lines">{items.map((item, index) => <button type="button" key={item.id} ref={(el) => itemRef(index, el)} className={`en-source-item ${seen.has(item.id) ? 'seen' : ''} ${index === expected ? 'next' : ''}`} onClick={() => choose(item, index)} aria-label={`歌谣第 ${index + 1} 拍：${item.text}`}><i>{seen.has(item.id) ? '✓' : index + 1}</i><strong>{item.text}</strong><em aria-hidden="true">🔊</em></button>)}</div></div>
    <div className="en-song-shelf"><div><span>LISTEN AND SING</span><h4>{unit.opening.song}</h4><p>歌曲保留原版旋律；先读这些关键句，再用原声感受节拍。</p></div><div ref={songPhrasesRef} className={`en-song-phrases ${songLive ? 'en-mp3-live' : ''}`}>{ENGLISH_G3_SONGS[unit.id].map((line, index) => <button key={`${line}-${index}`} onClick={() => speakOnce(line, 'en', .82)}>{line}<i>🔊</i></button>)}</div><OriginalAudio clipKey={`${unit.id}-opening-song`} label="教材歌曲原声" note="完整歌词可以阅读，节拍、旋律与合唱需原版音频。" onPlayChange={onSongPlayChange} /></div>
    <p className={complete ? 'en-reader-status complete' : 'en-reader-status'} role="status">{feedback}</p>
  </section>;
}

function ReadExplorer({ unit, lesson, items, seen, playingIndex, onVisit, onComplete, itemRef, onWrong }: { unit: EnglishUnit; lesson: EnglishLesson; items: SourceItem[]; seen: Set<string>; playingIndex: number | null; onVisit: (item: SourceItem, index: number) => void; onComplete: () => void; itemRef: (index: number, el: HTMLElement | null) => void; onWrong?: (kind: string, answer: string) => void }) {
  const spotlight = ENGLISH_G3_READ_SPOTLIGHTS[unit.id];
  const [pick, setPick] = useState<number | null>(null);
  useEffect(() => setPick(null), [lesson.id]);
  const allRead = items.length > 0 && items.every((item) => seen.has(item.id));
  const solved = pick === spotlight?.answerIndex;
  useEffect(() => { if (allRead && solved) onComplete(); }, [allRead, onComplete, solved]);
  const selectEvidence = (index: number) => {
    setPick(index);
    if (index !== spotlight?.answerIndex) onWrong?.('证据定位', `${spotlight?.prompt} → ${items[spotlight?.answerIndex]?.text ?? ''}`);
    playSfx(index === spotlight?.answerIndex ? 'correct' : 'wrong');
  };
  return <section className="en-read-explorer"><header><div><span>READING LAB</span><h3>从文本里找证据</h3><p>{unit.read.task}</p></div><div className="en-read-keywords">{unit.read.words.slice(0, 5).map((word) => <button key={word} onClick={() => speakOnce(word, 'en', .82)}>{word}</button>)}</div></header><div className="en-read-stage"><figure><img src={pageSrc(lesson.pageStart)} alt={`${lesson.title}教材局部阅读场景`} draggable="false" /><figcaption>教材 P{lesson.pageStart} · 先观察图和文字如何相互说明</figcaption></figure><div className="en-evidence-grid">{items.map((item, index) => <button type="button" key={item.id} ref={(el) => itemRef(index, el)} className={`en-source-item en-evidence-card ${seen.has(item.id) ? 'seen' : ''} ${playingIndex === index ? 'playing' : ''} ${pick === index ? (solved ? 'correct' : 'picked') : ''}`} onClick={() => onVisit(item, index)} aria-label={`点读阅读证据 ${index + 1}：${item.text}`}><span>证据 {index + 1}</span><strong>{item.text}</strong><i aria-hidden="true">{seen.has(item.id) ? '✓' : '🔊'}</i></button>)}</div></div><div className={`en-evidence-check ${solved ? 'solved' : ''}`}><div><span>证据定位</span><h4>{spotlight?.prompt}</h4></div><div>{items.map((item, index) => <button type="button" key={item.id} className={pick === index ? (index === spotlight?.answerIndex ? 'correct' : 'wrong') : ''} onClick={() => selectEvidence(index)}>{item.text}</button>)}</div><p role="status">{pick === null ? '先点读每条证据，再选出最能回答问题的一句。' : solved ? spotlight?.explain : '这句还不能直接回答问题，回到题干里的关键词再找。'}</p></div></section>;
}

function ProjectRoadmap({ unit, items, seen, onVisit, onComplete, itemRef }: { unit: EnglishUnit; items: SourceItem[]; seen: Set<string>; onVisit: (item: SourceItem, index: number) => void; onComplete: () => void; itemRef: (index: number, el: HTMLElement | null) => void }) {
  const [firstPick, setFirstPick] = useState<number | null>(null);
  const projectPathRef = useRef<HTMLDivElement>(null);
  const [projectLive, setProjectLive] = useState(false);
  const onProjectPlayChange = (p: boolean) => { setProjectLive(p); if (p) projectPathRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  useEffect(() => setFirstPick(null), [unit.id]);
  const allRead = items.length > 0 && items.every((item) => seen.has(item.id));
  const ready = firstPick === 0;
  useEffect(() => { if (allRead && ready) onComplete(); }, [allRead, onComplete, ready]);
  return <section className="en-project-roadmap"><header><div><span>PROJECT MISSION</span><h3>{unit.project.title}</h3><p>{unit.project.sentence}</p></div><div className="en-project-audio"><OriginalAudio clipKey={`${unit.id}-project-listening`} label="项目活动原声" note={unit.project.listenTask} onPlayChange={onProjectPlayChange} /></div></header><div ref={projectPathRef} className={`en-project-path ${projectLive ? 'en-mp3-live' : ''}`}>{items.map((item, index) => <button type="button" key={item.id} ref={(el) => itemRef(index, el)} className={`en-source-item ${seen.has(item.id) ? 'seen' : ''}`} onClick={() => onVisit(item, index)} aria-label={`项目第 ${index + 1} 步：${item.text}`}><i>{seen.has(item.id) ? '✓' : index + 1}</i><span>MISSION {String(index + 1).padStart(2, '0')}</span><strong>{item.text}</strong><em aria-hidden="true">阅读</em></button>)}</div><div className={`en-project-start ${ready ? 'ready' : ''}`}><div><span>先做什么？</span><h4>真正制作前，先选出项目的起始动作。</h4></div><div>{items.map((item, index) => <button type="button" key={item.id} className={firstPick === index ? (index === 0 ? 'correct' : 'wrong') : ''} onClick={() => { setFirstPick(index); playSfx(index === 0 ? 'correct' : 'wrong'); }}>{item.text}</button>)}</div><p role="status">{firstPick === null ? '项目不是把步骤堆在一起：先定观察或分类，再制作，最后表达。' : ready ? '起点正确。下一阶段会把这份计划真正做成作品。' : '先回看第 1 个任务：它决定后面的材料和表达。'}</p></div><div className="en-self-check-shelf"><b>完成作品后，我可以……</b>{unit.project.selfCheck.map((item) => <span key={item}>{item}</span>)}</div></section>;
}

function RevisionReader({ lesson, items, seen, playingIndex, canPlay, onVisit, onPlayScene, onComplete, itemRef, onWrong }: { lesson: EnglishLesson; items: SourceItem[]; seen: Set<string>; playingIndex: number | null; canPlay: boolean; onVisit: (item: SourceItem, index: number) => void; onPlayScene: (start: number, end: number) => void; onComplete: () => void; itemRef: (index: number, el: HTMLElement | null) => void; onWrong?: (kind: string, answer: string) => void }) {
  const scenes = ENGLISH_G3_REVISION_SCENES[lesson.id] ?? [];
  const [active, setActive] = useState(0);
  const [solved, setSolved] = useState<Set<number>>(() => new Set());
  const [feedback, setFeedback] = useState('先在这一幕里听读对话，再找礼貌表达。');
  useEffect(() => { setActive(0); setSolved(new Set()); setFeedback('先在这一幕里听读对话，再找礼貌表达。'); }, [lesson.id]);
  const sceneDone = (index: number) => {
    const scene = scenes[index];
    return !!scene && solved.has(index) && scene.lineIndexes.every((lineIndex) => seen.has(items[lineIndex]?.id));
  };
  const boardDone = scenes.length > 0 && scenes.every((_, index) => sceneDone(index));
  useEffect(() => { if (boardDone) onComplete(); }, [boardDone, onComplete]);
  const mp3LinesRef = useRef<HTMLDivElement>(null);
  const [mp3Live, setMp3Live] = useState(false);
  const onMp3PlayChange = (p: boolean) => { setMp3Live(p); if (p) mp3LinesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  const scene = scenes[active];
  if (!scene) return null;
  const currentLinesDone = scene.lineIndexes.every((lineIndex) => seen.has(items[lineIndex]?.id));
  const currentDone = sceneDone(active);
  const unlocked = (index: number) => index === 0 || sceneDone(index - 1);
  return <section className="en-revision-reader en-story-reader"><header className="en-story-intro"><div><span>REVISION MISSION</span><h3>把分散的表达放进一次真实做客</h3></div><p>问好、介绍、分享、感谢和告别要跟着场景出现；每一幕都完成后，才能继续。</p></header><nav className="en-story-map" aria-label="做客故事分镜">{scenes.map((item, index) => <button key={item.title} type="button" disabled={!unlocked(index)} className={`${active === index ? 'active' : ''} ${sceneDone(index) ? 'done' : ''}`} onClick={() => { setActive(index); setFeedback(solved.has(index) ? item.explain : '先在这一幕里听读对话，再找礼貌表达。'); }}><i>{sceneDone(index) ? '✓' : index + 1}</i><span><b>{item.label}</b>{item.title}</span></button>)}</nav><div className="en-story-stage"><div className="en-story-art"><img src={pageSrc(scene.page)} alt={`教材第 ${scene.page} 页，${scene.title}场景`} style={{ objectPosition: scene.focus }} draggable="false" /><span><b>{scene.label}</b><small>P{scene.page} · {scene.title}</small></span></div><div className="en-story-script"><div className="en-story-scene-head"><span>{scene.label}</span><h3>{scene.title}</h3><p>把这一幕的表达连成真正的交流。</p></div><button type="button" className="en-story-play" disabled={!canPlay} onClick={() => onPlayScene(scene.lineIndexes[0], scene.lineIndexes[scene.lineIndexes.length - 1] + 1)}>{playingIndex !== null && scene.lineIndexes.includes(playingIndex) ? '正在播放这一幕…' : '▶ 连续听这一幕'}</button><div ref={mp3LinesRef} className={`en-story-lines ${scene.chat ? 'en-chat-lines' : ''} ${mp3Live ? 'en-mp3-live' : ''}`}>{scene.lineIndexes.map((lineIndex, localIndex) => { const item = items[lineIndex]; if (!item) return null; if (scene.chat) { const side = localIndex % 2 === 1 ? 'right' : 'left'; const avatar = scene.avatars?.[localIndex % 2] ?? '🙂'; return <button type="button" key={item.id} ref={(el) => itemRef(lineIndex, el)} className={`en-source-item en-story-line ${side} ${seen.has(item.id) ? 'seen' : ''} ${playingIndex === lineIndex ? 'playing' : ''}`} onClick={() => onVisit(item, lineIndex)}><span className="en-chat-avatar" aria-hidden="true">{avatar}</span><span className="en-chat-bubble"><strong>{item.text}</strong><em aria-hidden="true">🔊</em></span>{seen.has(item.id) && <span className="en-chat-check" aria-hidden="true">✓</span>}</button>; } return <button type="button" key={item.id} ref={(el) => itemRef(lineIndex, el)} className={`en-source-item en-story-line ${seen.has(item.id) ? 'seen' : ''} ${playingIndex === lineIndex ? 'playing' : ''}`} onClick={() => onVisit(item, lineIndex)}><i>{seen.has(item.id) ? '✓' : localIndex + 1}</i><strong>{item.text}</strong><em aria-hidden="true">🔊</em></button>; })}</div></div></div><div className={`en-story-clue ${solved.has(active) ? 'solved' : ''}`}><div><span>场景判断</span><h4>{scene.prompt}</h4></div><div>{scene.options.map((option) => <button type="button" key={option} disabled={solved.has(active)} className={solved.has(active) && option === scene.answer ? 'correct' : ''} onClick={() => { if (option === scene.answer) { setSolved((current) => new Set(current).add(active)); setFeedback(scene.explain); playSfx('correct'); } else { setFeedback('回到对话里找能和这个场景相连的表达。'); playSfx('wrong'); onWrong?.('做客情境', `${scene.prompt} → ${scene.answer}`); } }}>{option}</button>)}</div><p role="status">{feedback}</p></div><div className="en-story-step"><span>{currentLinesDone ? '✓ 本幕表达已听读' : '先读完本幕表达'}</span>{active < scenes.length - 1 ? <button type="button" disabled={!currentDone} onClick={() => { setActive(active + 1); setFeedback('先在这一幕里听读对话，再找礼貌表达。'); }}>进入下一幕 →</button> : <strong className={currentDone ? 'ready' : ''}>{currentDone ? '你已把分散的表达组织成一次完整做客。' : '完成听读和场景判断后，就能完成这次做客任务。'}</strong>}</div><OriginalAudio clipKey={`revision-${lesson.id}-listening`} label="Revision · 教材原版录音" note="复习录音需配合对应的听读、填空或演唱任务。" onPlayChange={onMp3PlayChange} /></section>;
}

function LettersWorkbench({ lesson, unit, letterCards, seen, stateClass, globalIndex, onVisit, itemRef }: {
  lesson: EnglishLesson;
  unit: EnglishUnit;
  letterCards: SourceItem[];
  seen: Set<string>;
  stateClass: (item: SourceItem) => string;
  globalIndex: Map<string, number>;
  onVisit: (item: SourceItem, index: number) => void;
  itemRef: (index: number, el: HTMLElement | null) => void;
}) {
  const decodeRef = useRef<HTMLDivElement>(null);
  const [lettersLive, setLettersLive] = useState(false);
  const onLettersPlayChange = (playing: boolean) => {
    setLettersLive(playing);
    if (playing) decodeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const firstFourLineLesson = unit.id === 'friends';
  return <section className="en-letters-workbench" aria-label="字母与发音学习工作台">
    <div className="en-letters-intro">
      <span>LETTERS WORKBENCH</span>
      <div><h3>先认字母和词，再学会规范书写</h3><p>点击字母卡听完整例词；完成首字母判断后，再进入读词、歌谣和书写。</p></div>
    </div>
    <div className="en-letters-discovery">
      <section className="en-letters-discovery-main" aria-label="认字母和音形连接">
        <header><span>01 · LOOK & LISTEN</span><h4>大写、小写和例词一起认</h4></header>
        <div className="en-letters-list">{letterCards.map((item) => {
          const index = globalIndex.get(item.id)!;
          return <button type="button" key={item.id} className={`en-source-item en-letter-card ${stateClass(item)}`} ref={(el) => itemRef(index, el)} onClick={() => onVisit(item, index)} aria-label={`点读第 ${index + 1} 项：字母 ${item.letterInfo?.letter}，例词 ${item.letterInfo?.words.join('、')}`}><b aria-hidden="true">{item.letterInfo?.letter}<span>{item.letterInfo?.letter.toLowerCase()}</span></b><strong>{item.letterInfo?.words.join(' · ')}</strong><i aria-hidden="true">{seen.has(item.id) ? '✓' : '🔊'}</i></button>;
        })}</div>
        <SoundShapeLab lessonId={lesson.id} letters={letterCards} />
      </section>
      <aside ref={decodeRef} className={`en-letters-audio-shelf ${lettersLive ? 'en-mp3-live' : ''}`} aria-label="读词、歌谣和原版录音">
        <header><span>02 · READ & CHANT</span><h4>会听，也要开口读</h4><p>点词听示范，跟着节奏读歌谣。孤立音位听辨只使用教材原声。</p></header>
        <section className="en-decode-words"><b>Can you read the words?</b><div>{unit.letters.decode.map((word) => <button type="button" key={word} onClick={() => speakOnce(word, 'en', .8)}>{word}<span>🔊</span></button>)}</div></section>
        <section className="en-appendix-chant"><b>Appendix 2 · 字母歌谣</b><ol>{ENGLISH_G3_PHONICS_CHANTS[unit.id].alphabet.map((line) => <li key={line}>{line}</li>)}</ol><b>词中声音的教材歌谣（待原声）</b><ol>{ENGLISH_G3_PHONICS_CHANTS[unit.id].examples.map((line) => <li key={line}>{line}</li>)}</ol></section>
        <OriginalAudio clipKey={`${unit.id}-letters-sounds`} label="Listen, repeat and circle the first / last sound" note="完整例词可由 TTS 示范；孤立音位和听音选择必须用原声。" onPlayChange={onLettersPlayChange} />
      </aside>
    </div>
    <FourLineRuleFocus compact={!firstFourLineLesson} />
    <LetterWritingPad letters={unit.letters.items.map((item) => item.letter)} />
  </section>;
}

function SourceContent({ lesson, items, seen, playingIndex, canPlay, onVisit, onPlayAll, onPlayScene, onStoryComplete, onListeningComplete, onShadowTarget, onStopPlay, itemRef, onWrong }: { lesson: EnglishLesson; items: SourceItem[]; seen: Set<string>; playingIndex: number | null; canPlay: boolean; onVisit: (item: SourceItem, index: number) => void; onPlayAll: () => void; onPlayScene: (start: number, end: number) => void; onStoryComplete: () => void; onListeningComplete: () => void; onShadowTarget: (item: SourceItem, onDone?: () => void) => void; onWrong?: (kind: string, answer: string) => void; onStopPlay: () => void; itemRef: (index: number, el: HTMLElement | null) => void }) {
  const unit = getEnglishG3Unit(lesson.unitId);
  const section = lesson.section;
  const partSection = section === 'a' || section === 'b' ? section : undefined;
  const textbookPart = unit && partSection ? unit[partSection] : undefined;
  const globalIndex = new Map(items.map((item, index) => [item.id, index]));
  const bubbles = textbookPart ? [] : items.filter((item) => item.kind === 'line' && item.speaker);
  const words = textbookPart ? [] : items.filter((item) => item.kind === 'word');
  const letterCards = items.filter((item) => item.kind === 'letter');
  const hasSpecialReader = !unit || ['opening', 'read', 'project', 'story'].includes(section);
  const rows = textbookPart || hasSpecialReader ? [] : items.filter((item) => (item.kind === 'line' && !item.speaker) || item.kind === 'step');
  const speakerOrder = [...new Set(bubbles.map((item) => item.speaker!))];
  const sideOf = (speaker: string) => (speakerOrder.indexOf(speaker) % 2 === 1 ? 'right' : 'left');
  const stateClass = (item: SourceItem) => `${seen.has(item.id) ? 'seen ' : ''}${playingIndex === globalIndex.get(item.id) ? 'playing' : ''}`.trim();
  const done = items.length > 0 && seen.size >= items.length;
  // 原版 MP3 播放时，定位并高亮页面上对应的文本组
  const [liveClip, setLiveClip] = useState<string | null>(null);
  useEffect(() => { if (liveClip) document.querySelector('.en-mp3-live')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [liveClip]);
  const pct = items.length ? seen.size / items.length : 0;
  const ring = 2 * Math.PI * 30;
  return <div className="en-source-content">
    <div className="en-source-heading"><span>教材内容 · 点击听读与标记</span><h2>{lesson.title}</h2><p>{lesson.subtitle}</p></div>
    <ListeningRoutine lessonId={lesson.id} items={items} fallbackText={section === 'project' ? unit?.project.sentence : undefined} canPlay={canPlay} onShadowTarget={onShadowTarget} onComplete={onListeningComplete} onWrong={onWrong} />
    {!hasSpecialReader && <div className="en-playbar" role="group" aria-label="连续听读控制">{playingIndex === null
      ? <button type="button" className="en-playbtn" disabled={!canPlay} onClick={onPlayAll}>▶ 连续听读</button>
      : <button type="button" className="en-playbtn stop" onClick={onStopPlay}>⏹ 停止连播 · 第 {playingIndex + 1} / {items.length} 句</button>}<small>{playingIndex === null ? (canPlay ? '自动逐句朗读、高亮跟随；连播时点任意一句，就从那一句接着读。' : '打开声音与语音开关后，可以自动逐句连读。') : '正在连读，页面自动滚动跟随当前句。'}</small></div>}
    <div className="en-source-cols">
      <div className="en-source-main">
        {unit && section === 'opening' && <OpeningReader unit={unit} items={items} seen={seen} onVisit={onVisit} onComplete={onStoryComplete} itemRef={itemRef} />}
        {unit && textbookPart && <><div className="en-source-context"><b>Part {section.toUpperCase()} · 教材板块导航</b><p>{textbookPart.prompt}</p><div>{textbookPart.blocks.map((block, index) => <span key={block.id}>{index + 1}. {block.title} · P{block.page}</span>)}</div></div><RolePlayPanel lessonId={lesson.id} items={items} onShadowTarget={onShadowTarget} /><div className="en-textbook-blocks">{textbookPart.blocks.map((block, blockIndex) => {
          const blockItems = items.filter((item) => item.blockId === block.id);
          const turns = blockItems.filter((item) => item.speaker);
          const lines = blockItems.filter((item) => item.kind === 'line' && !item.speaker);
          const blockWords = blockItems.filter((item) => item.kind === 'word');
          const blockSpeakers = [...new Set(turns.map((item) => item.speaker!))];
          const isPhraseMatch = unit.id === 'friends' && section === 'b' && block.id === 'practice';
          const blockClip = section === 'b' && block.id === 'activity' ? `${unit.id}-b-chant` : unit.id === 'families' && section === 'a' && block.id === 'practice' ? 'families-a-finger-song' : null;
          return <section key={block.id} className={`en-textbook-block en-textbook-block--${block.id}`}><header><span>{blockIndex + 1}</span><div><b>{block.title}</b><small>P{block.page} · {block.goal}</small></div></header><TextbookScene src={sceneSrc(unit.id, partSection!, block.id)} title={block.title} blockId={block.id} />{block.id === 'activity' && <div className="en-chant-track" aria-hidden="true"><i /><i /><i /><i /><span>听 · 跟 · 做 · 再来</span></div>}{turns.length > 0 && <div className="en-dialogue" aria-label={`${block.title} 教材对话`}>{turns.map((item) => { const index = globalIndex.get(item.id)!; const side = blockSpeakers.indexOf(item.speaker!) % 2 === 1 ? 'right' : 'left'; return <button type="button" key={item.id} className={`en-source-item en-bubble ${side} ${stateClass(item)}`} ref={(el) => itemRef(index, el)} onClick={() => onVisit(item, index)} aria-label={`点读第 ${index + 1} 项：${item.speaker} 说 ${item.text}`}><i className="en-bubble-avatar" aria-hidden="true" style={{ background: speakerColor(item.speaker!) }}>{item.speaker!.slice(0, 1)}</i><span className="en-bubble-body"><small>{item.speaker}</small><strong>{item.text}</strong><em aria-hidden="true">🔊</em></span></button>; })}</div>}{isPhraseMatch && <PhraseMatchActivity items={lines} globalIndex={globalIndex} stateClass={stateClass} onVisit={onVisit} itemRef={itemRef} onWrong={onWrong} />}{lines.length > 0 && !isPhraseMatch && <div className={`en-source-list ${blockClip && liveClip === blockClip ? 'en-mp3-live' : ''}`}>{lines.map((item, lineIndex) => { const index = globalIndex.get(item.id)!; return <button type="button" key={item.id} className={`en-source-item en-source-line ${stateClass(item)}`} ref={(el) => itemRef(index, el)} onClick={() => onVisit(item, index)} aria-label={`点读第 ${index + 1} 项：${item.text}`}><i>{seen.has(item.id) ? '✓' : lineIndex + 1}</i><span><strong>{item.text}</strong></span><em aria-hidden="true">🔊</em></button>; })}</div>}{blockWords.length > 0 && <div className="en-word-block"><b>Words · 看图、听词，再把词放进短句</b><div className="en-word-cards">{blockWords.map((item) => { const index = globalIndex.get(item.id)!; return <button type="button" key={item.id} className={`en-source-item en-word-card ${stateClass(item)}`} ref={(el) => itemRef(index, el)} onClick={() => onVisit(item, index)} aria-label={`点读第 ${index + 1} 项单词：${item.text}`}><WordPicture word={item.text} /><span><strong>{item.text}</strong><small>{wordSentence(item.text)}</small></span><i aria-hidden="true">{seen.has(item.id) ? '✓' : '🔊'}</i></button>; })}</div></div>}{unit.id === 'families' && section === 'a' && block.id === 'practice' && <OriginalAudio clipKey="families-a-finger-song" label="Finger family 原版歌曲" note="文字按教材板块呈现；旋律、节拍与手指游戏需要原声。" onPlayChange={(p) => setLiveClip(p ? 'families-a-finger-song' : null)} />}{section === 'b' && block.id === 'activity' && <OriginalAudio clipKey={`${unit.id}-b-chant`} label={`教材${block.title === 'Listen and do' ? '指令活动' : '歌谣'}原声`} note="文字按教材板块完整呈现；节奏、语调与动作时机需要教材原声。" onPlayChange={(p) => setLiveClip(p ? `${unit.id}-b-chant` : null)} />}</section>;
        })}</div></>}
        {unit && section === 'letters' && <LettersWorkbench lesson={lesson} unit={unit} letterCards={letterCards} seen={seen} stateClass={stateClass} globalIndex={globalIndex} onVisit={onVisit} itemRef={itemRef} />}
        {unit && section === 'read' && <ReadExplorer unit={unit} lesson={lesson} items={items} seen={seen} playingIndex={playingIndex} onVisit={onVisit} onComplete={onStoryComplete} itemRef={itemRef} onWrong={onWrong} />}
        {unit && section === 'project' && <ProjectRoadmap unit={unit} items={items} seen={seen} onVisit={onVisit} onComplete={onStoryComplete} itemRef={itemRef} />}
        {unit && section === 'story' && <StoryReader unitId={unit.id} items={items} seen={seen} playingIndex={playingIndex} canPlay={canPlay} onVisit={onVisit} onPlayScene={onPlayScene} onComplete={onStoryComplete} itemRef={itemRef} onWrong={onWrong} />}
        {!unit && <RevisionReader lesson={lesson} items={items} seen={seen} playingIndex={playingIndex} canPlay={canPlay} onVisit={onVisit} onPlayScene={onPlayScene} onComplete={onStoryComplete} itemRef={itemRef} onWrong={onWrong} />}
        {bubbles.length > 0 && <div className="en-dialogue" aria-label="教材对话，按说话人分侧显示">{bubbles.map((item) => { const index = globalIndex.get(item.id)!; return <button type="button" key={item.id} className={`en-source-item en-bubble ${sideOf(item.speaker!)} ${stateClass(item)}`} ref={(el) => itemRef(index, el)} onClick={() => onVisit(item, index)} aria-label={`点读第 ${index + 1} 项：${item.speaker} 说 ${item.text}`}><i className="en-bubble-avatar" aria-hidden="true" style={{ background: speakerColor(item.speaker!) }}>{item.speaker!.slice(0, 1)}</i><span className="en-bubble-body"><small>{item.speaker}</small><strong>{item.text}</strong><em aria-hidden="true">🔊</em></span></button>; })}</div>}
        {rows.length > 0 && <div className="en-source-list">{rows.map((item) => { const index = globalIndex.get(item.id)!; return <button type="button" key={item.id} className={`en-source-item en-source-line ${stateClass(item)}`} ref={(el) => itemRef(index, el)} onClick={() => onVisit(item, index)} aria-label={`点读第 ${index + 1} 项：${item.text}`}><i>{seen.has(item.id) ? '✓' : index + 1}</i><span><strong>{item.text}</strong></span><em aria-hidden="true">{item.lang === 'zh' ? '阅读' : '🔊'}</em></button>; })}</div>}
        {section !== 'letters' && letterCards.length > 0 && <div className="en-letters-list">{letterCards.map((item) => { const index = globalIndex.get(item.id)!; return <button type="button" key={item.id} className={`en-source-item en-letter-card ${stateClass(item)}`} ref={(el) => itemRef(index, el)} onClick={() => onVisit(item, index)} aria-label={`点读第 ${index + 1} 项：字母 ${item.letterInfo?.letter}，例词 ${item.letterInfo?.words.join('、')}`}><b aria-hidden="true">{item.letterInfo?.letter}<span>{item.letterInfo?.letter.toLowerCase()}</span></b><strong>{item.letterInfo?.words.join(' · ')}</strong><i aria-hidden="true">{seen.has(item.id) ? '✓' : '🔊'}</i></button>; })}</div>}
        {words.length > 0 && <div className="en-word-block"><b>Words · 看图、听词，再把词放进短句</b><div className="en-word-cards">{words.map((item) => { const index = globalIndex.get(item.id)!; return <button type="button" key={item.id} className={`en-source-item en-word-card ${stateClass(item)}`} ref={(el) => itemRef(index, el)} onClick={() => onVisit(item, index)} aria-label={`点读第 ${index + 1} 项单词：${item.text}`}><WordPicture word={item.text} /><span><strong>{item.text}</strong><small>{wordSentence(item.text)}</small></span><i aria-hidden="true">{seen.has(item.id) ? '✓' : '🔊'}</i></button>; })}</div></div>}
      </div>
    </div>
    <div className={`en-source-progress ${done ? 'complete' : ''}`}>
      <svg className="en-progress-ring" viewBox="0 0 72 72" role="img" aria-label={`点读进度 ${Math.round(pct * 100)}%，已点读或查看 ${seen.size} / ${items.length} 项`}><circle className="track" cx="36" cy="36" r="30" /><circle className="bar" cx="36" cy="36" r="30" strokeDasharray={ring} strokeDashoffset={ring * (1 - pct)} /></svg>
      <div><b>{Math.round(pct * 100)}%</b><span>已点读或查看 {seen.size} / {items.length} 项</span><em>{done ? '教材内容已逐项看过，可以动手表达了。' : '逐项看完，再到实际操作。'}</em></div>
    </div>
  </div>;
}

/** 跟读小播放器：屏幕正中弹出，图形为主、文字精简；自动收音，完成判定后自动消失。
 *  相似度只是鼓励性反馈，不计入星级。 */
function RepeatDock({ target, art, onClose, onDone }: { target: string; art?: string; onClose: () => void; onDone: () => void }) {
  const [attempts, setAttempts] = useState<number[]>([]);
  const [verdict, setVerdict] = useState<'none' | 'again'>('none');
  const [passed, setPassed] = useState(false);
  const onResult = useCallback((said: string) => { setAttempts((list) => [...list, readScore(target, said)]); setVerdict('none'); }, [target]);
  const asr = useAsr(onResult, 'en-GB');
  useEffect(() => () => asr.stop(), []);
  const best = attempts.length ? Math.max(...attempts) : 0;
  const listening = asr.listening;
  const startRead = () => { stopSpeaking(); setVerdict('none'); asr.start(); };
  const finish = () => {
    if (best >= 0.5) {
      playSfx('correct');
      setPassed(true);
      const { sound, voiceOn } = useStore.getState();
      // 关闭语音时 speakMixedSeq 不会回调，直接延时消失
      if (sound && voiceOn) speakMixedSeq(best >= .85 ? '读得又准又好听！Great job!' : '读对啦！声音再响一点就更好了。', .92, onDone);
      else window.setTimeout(onDone, 700);
    } else {
      playSfx('wrong');
      setVerdict('again');
    }
  };
  // 不支持语音识别的设备仍应能完成“听示范后跟读”的复习，不把浏览器能力缺失
  // 误判为孩子没有开口；有识别能力时仍按原有相似度鼓励反馈。
  const finishWithoutAsr = () => {
    playSfx('correct');
    setPassed(true);
    window.setTimeout(onDone, 420);
  };
  const note = passed ? '读对啦！' : listening ? '在听你说…' : attempts.length ? (verdict === 'again' ? '差一点点，再读一次' : `${Math.round(best * 100)} 分`) : asr.supported ? '点麦克风开始跟读' : '此浏览器不支持跟读';
  return createPortal(
    <div className="en-player-mask">
      <div className="en-player" role="dialog" aria-label={`跟读：${target}`} onClick={(e) => e.stopPropagation()}>
        <button className="en-player-close" onClick={onClose} aria-label="关闭跟读">✕</button>
        <div className={`en-player-art ${listening ? 'on' : ''} ${passed ? 'pass' : ''}`}>
          {art ? <img src={art} alt="" draggable={false} /> : <span className="en-player-mic" aria-hidden="true">🎙️</span>}
          {listening && <span className="en-player-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>}
          {passed && <span className="en-player-pass" aria-hidden="true">✓</span>}
        </div>
        <strong className="en-player-title" aria-label={target}>{target.split(/\s+/).map((word, i) => <span key={i} className="en-player-word" style={{ '--i': i } as CSSProperties}>{word}</span>)}</strong>
        {attempts.length > 0 && <div className="en-player-meter" role="img" aria-label={`最好 ${Math.round(best * 100)} 分`}><i style={{ width: `${Math.round(best * 100)}%` }} /></div>}
        <p className="en-player-note">{note}</p>
        <div className="en-player-ops">
          {!passed && asr.supported && attempts.length > 0 && <button className="en-player-btn" onClick={startRead} aria-label="重新读">🔄</button>}
          {!passed && asr.supported && <button className={`en-player-btn primary ${attempts.length ? '' : 'big'}`} onClick={attempts.length ? finish : startRead} aria-label={attempts.length ? '完成' : '开始跟读'}>{listening ? '🎙' : attempts.length ? '✓' : '🎤'}</button>}
          {!passed && <button className="en-player-fallback" onClick={finishWithoutAsr}>我已跟读</button>}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function QuizPanel({ quiz, pick, onPick, title }: { quiz: EnglishQuiz; pick: string | null; onPick: (value: string) => void; title: string }) {
  const right = pick === quiz.answer;
  // 进入阶段 600ms 后自动接续播报题干（排在聪聪导览之后，不打断导览）；
  // 已答过的课再次进入也重读一遍，方便复习，不因断点恢复而跳过
  useEffect(() => {
    const timer = setTimeout(() => speakMixedAfterCurrent(quiz.question, .92), 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 🔊 听题目：题干中英分段朗读，读完逐条读选项，英文选项用英文 TTS
  const readAloud = () => speakMixedSeq(quiz.question, .92, () => {
    const next = (i: number) => {
      if (i >= quiz.options.length) return;
      const text = quiz.options[i];
      const en = !/[\u4e00-\u9fff]/.test(text);
      speakOnce(`${String.fromCharCode(65 + i)}. ${text}`, en ? 'en' : 'zh', en ? .85 : .92, () => next(i + 1));
    };
    next(0);
  });
  return <div className="en-quiz" aria-label={title}><div className="en-quiz-head"><span>{title}</span><button type="button" className="en-quiz-speak" onClick={readAloud} aria-label="朗读题目和选项">🔊 听题目</button></div><h3>{quiz.question}</h3><div className="en-quiz-options">{quiz.options.map((value) => <button type="button" key={value} disabled={right} className={pick === value ? right ? 'correct' : 'wrong' : ''} onClick={() => onPick(value)}>{value}</button>)}</div>{pick && <p className={right ? 'good' : 'try'} role="status">{right ? quiz.explain : '先回看教材内容和情境，再试一次。'}</p>}</div>;
}

const PROJECT_TAGS: Record<string, string[]> = {
  friends: ['Say “Hi!”', 'Smile', 'Listen', 'Help', 'Share', 'Play together'],
  families: ['grandma', 'grandpa', 'mum', 'dad', 'brother', 'sister', 'cousin', 'aunt', 'uncle'],
  animals: ['dog', 'cat', 'bird', 'rabbit', 'panda', 'tiger', 'lion', 'elephant'],
  plants: ['air', 'water', 'sun', 'plant a tree', 'water the tree', 'apples', 'grapes'],
  colours: ['red', 'blue', 'yellow', 'green', 'purple', 'pink', 'black'],
  numbers: ['Name', 'Happy birthday!', 'Party time', 'Age', 'One to ten', 'Thanks!'],
};

function ProjectBuilder({ unitId, onDone }: { unitId: string; onDone: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const choices = PROJECT_TAGS[unitId] ?? [];
  const enough = selected.length >= 3;
  return <div className="en-project-builder"><span>数字化项目作品</span><h3>{unitId === 'friends' ? '朋友思维导图' : unitId === 'families' ? '我的家庭树' : unitId === 'animals' ? '动物图片书' : unitId === 'plants' ? '纸上花园' : unitId === 'colours' ? '颜色翻页书' : '电子生日卡'}</h3><p>请选择至少三张有意义的卡，构成自己的作品；你可以继续替换和补充。</p><div className="en-project-tags">{choices.map((tag) => <button key={tag} className={selected.includes(tag) ? 'selected' : ''} onClick={() => setSelected((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])}>{selected.includes(tag) ? '✓ ' : '+ '}{tag}</button>)}</div><div className="en-project-preview"><small>我的作品草图</small><strong>{selected.length ? selected.join(' · ') : '选择卡片后这里会出现你的作品'}</strong></div><button className="ct-primary" disabled={!enough} onClick={onDone}>保存这份项目草图 →</button></div>;
}

function ColourMixer({ onDone }: { onDone: () => void }) {
  const [choice, setChoice] = useState<string[]>([]);
  const result = choice.includes('red') && choice.includes('blue') ? 'purple' : choice.includes('blue') && choice.includes('yellow') ? 'green' : choice.length >= 2 ? 'orange' : '';
  return <div className="en-colour-mixer"><span>动手演示 · 先预测再混色</span><h3>请选择 red 和 blue，观察教材的紫色从哪里来</h3><div className="en-colour-choice">{['red', 'blue', 'yellow'].map((colour) => <button key={colour} className={`${colour} ${choice.includes(colour) ? 'selected' : ''}`} onClick={() => { const next = choice.includes(colour) ? choice.filter((item) => item !== colour) : choice.length === 2 ? [choice[1], colour] : [...choice, colour]; setChoice(next); if (next.includes('red') && next.includes('blue')) onDone(); }} aria-label={`选择 ${colour}`}><i />{colour}</button>)}</div><div className="en-mix-result">{choice.length >= 2 ? <><i className={result} /><strong>{choice.join(' + ')} → {result}</strong><small>实际颜料的深浅会因材料不同而变，这里演示教材的典型结果。</small></> : '选两种颜色，再看结果'}</div></div>;
}

function PairEven({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(0);
  return <div className="en-even-task"><span>动手演示 · odd / even</span><h3>把 9 个点两两配对，看看最后剩几个</h3><div className="en-even-dots" role="group" aria-label="九个点两两配对">{Array.from({ length: 9 }, (_, index) => <button type="button" key={index} disabled={index !== count || count >= 8} className={index < count ? 'paired' : index === 8 ? 'last' : ''} onClick={() => { const next = count + 1; setCount(next); playSfx('tap'); if (next === 8) onDone(); }} aria-label={`第 ${index + 1} 个点`}>●</button>)}</div><p>{count < 8 ? `已配 ${Math.floor(count / 2)} 对，继续一次点两个。` : '配成 4 对，还剩 1 个；9 是 odd。'}</p></div>;
}

function FourLineRuleFocus({ compact = false }: { compact?: boolean }) {
  if (compact) return <section className="en-four-line-review" aria-label="四线格占格规则复习">
    <span>占格复习</span><b>上格 · 中格 · 下格</b><p>大写住上、中两格；短小写住中格；高个向上伸，尾巴向下垂。</p>
  </section>;
  return <section className="en-four-line-focus" aria-label="四线格书写规则重点">
    <header><span>FIRST KEY · 首次重点</span><h3>英语四线格：认识上格、中格、下格</h3><p>把书写区看成三层小房子。先看字母住哪一格，再观察它会不会向上伸、向下垂。</p></header>
    <div className="en-four-line-map" aria-label="四线格分为上格、中格和下格，样例：大写 A、短小写 a、高个 h、有尾巴 g">
      <svg className="en-four-line-grid-svg" viewBox="0 0 640 236" role="img" aria-hidden="true">
        <line x1="6" y1="14" x2="634" y2="14" /><line x1="6" y1="84" x2="634" y2="84" /><line x1="6" y1="154" x2="634" y2="154" /><line x1="6" y1="224" x2="634" y2="224" />
        <g className="en-four-zone-tag top"><rect x="14" y="26" width="54" height="24" rx="7" /><text x="41" y="42">上格</text><text className="en-four-zone-desc" x="14" y="62">高个字母会伸进来</text></g>
        <g className="en-four-zone-tag mid"><rect x="14" y="96" width="54" height="24" rx="7" /><text x="41" y="112">中格</text><text className="en-four-zone-desc" x="14" y="132">所有小写字母的家</text></g>
        <g className="en-four-zone-tag low"><rect x="14" y="166" width="54" height="24" rx="7" /><text x="41" y="182">下格</text><text className="en-four-zone-desc" x="14" y="202">有尾巴的字母会垂下来</text></g>
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
      <article><b>高个</b><strong>b d f h k l t</strong><span>从中格向上伸，顶到上格。</span></article>
      <article><b>有尾巴</b><strong>g j p q y</strong><span>从中格向下垂，尾巴进下格。</span></article>
    </div>
    <p className="en-four-line-mnemonic">口诀：大写住上中；短小写住中；高个向上伸，尾巴向下垂。</p>
  </section>;
}

function LetterWritingPad({ letters }: { letters: string[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [active, setActive] = useState(letters[0] ?? 'A');
  const [ink, setInk] = useState(false);
  const [demoStep, setDemoStep] = useState<number | null>(null);
  const [demoPreparing, setDemoPreparing] = useState(false);
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - box.left) * 600 / box.width, y: (event.clientY - box.top) * 220 / box.height };
  };
  const guide = LETTER_STROKES[active] ?? '先看灰色范字的起笔点和方向，分笔写完，再检查字母是不是住在正确的格子里。';
  const demoPaths = LETTER_DEMO_PATHS[active] ?? LETTER_DEMO_PATHS.A;
  const lowerDemoPaths = LETTER_LOWER_DEMO_PATHS[active];
  const lowerStarts = LETTER_LOWER_STROKE_STARTS[active] ?? [];
  const demoLabels = LETTER_DEMO_LABELS[active] ?? ['先找起笔点', '沿箭头方向写'];
  const demoLength = Math.max(demoPaths.length, lowerDemoPaths?.length ?? 0, lowerStarts.length || 1);
  useEffect(() => { setDemoStep(null); setDemoPreparing(false); }, [active]);
  useEffect(() => {
    if (!demoPreparing) return;
    const timer = window.setTimeout(() => { setDemoStep(0); setDemoPreparing(false); }, 460);
    return () => window.clearTimeout(timer);
  }, [demoPreparing]);
  useEffect(() => {
    if (demoStep === null || demoStep >= demoLength - 1) return;
    const timer = window.setTimeout(() => setDemoStep((step) => step === null ? null : step + 1), 820);
    return () => window.clearTimeout(timer);
  }, [demoLength, demoStep]);
  const isDone = demoStep !== null && demoStep >= demoLength - 1;
  // 每个字母各存一份笔迹：切 tab 前保存、切回时恢复，练写成果不丢
  const inkStore = useRef<Record<string, string>>({});
  const clearWriting = () => {
    delete inkStore.current[active];
    canvas.current?.getContext('2d')?.clearRect(0, 0, 600, 220);
    setInk(false);
  };
  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, 600, 220);
    const saved = inkStore.current[active];
    if (saved) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = saved;
      setInk(true);
    } else setInk(false);
  }, [active]);
  const startDemoFromBlank = () => {
    clearWriting();
    setDemoStep(null);
    setDemoPreparing(true);
  };
  const renderPaths = (paths: string[], letterCase: 'upper' | 'lower') => paths.map((path, index) => (
    <g key={`${active}-${letterCase}-${index}`} className={`${demoStep !== null && index <= demoStep ? 'shown' : ''} ${demoStep === index ? 'current' : ''}`}>
      <path d={path} pathLength="1" />
      <circle cx={strokeStart(path).x} cy={strokeStart(path).y} r="3" />
      <text x={strokeStart(path).x + 7} y={strokeStart(path).y - 6}>{index + 1}</text>
    </g>
  ));
  const lowerRevealWidth = demoStep === null ? 0 : demoStep === 0 ? 118 : 210;

  return <section className="en-letter-writing" aria-label="书写实验室">
    <span>WRITING LAB · 书写实验室</span>
    <h3>在四线格里写 {active} / {active.toLowerCase()}</h3>
    <p>先观察大写、小写分别住在哪些格，再看笔顺动画，最后自己写。书写练习不影响发音和字母理解的评价。</p>
    <div className="en-writing-rules" aria-label="英语书写规范">
      <article><b>占格</b><span>大写多占上两格；小写看高低，g / j / p / q / y 才伸到下格。</span></article>
      <article><b>间距</b><span>一个单词里的字母靠近；两个单词之间留一个小写 a 的宽度。</span></article>
      <article><b>标点</b><span>句首大写，句末用 . / ? / !，标点紧贴最后一个单词。</span></article>
    </div>
    <div className="en-writing-guide"><b>分笔提示</b><span>{guide}</span><small>每一笔慢一点、方向对一点；写完再看有没有住错格或跑出格。</small></div>
    <div className="en-writing-workbench">
      <div className="en-stroke-demo" aria-label={`${active} 大小写笔顺演示`}>
      <div className="en-stroke-demo-head">
        <div><b>笔顺演示 · {active} / {active.toLowerCase()}</b><small>{demoPreparing ? '已清空，先观察空白范字；第 1 笔马上开始。' : demoStep === null ? '两侧都以教材同款范字为底，彩色线条按笔画播放；圆点是起笔点。' : isDone ? '演示完成，可以照着下方四线格练写。' : `正在演示第 ${demoStep + 1} 笔`}</small></div>
        <button type="button" disabled={demoPreparing} onClick={startDemoFromBlank}>{demoPreparing ? '准备第一笔…' : isDone ? '↻ 重播并清空' : '▶ 播放笔顺'}</button>
      </div>
      <div className="en-stroke-demo-body">
        <div className="en-stroke-panel en-stroke-panel--upper">
          <header><b>大写 {active}</b><small>上两格</small></header>
          <svg viewBox="0 0 210 150" role="img" aria-label={`大写 ${active} 分笔示范`}><text className="en-demo-glyph en-demo-glyph--upper" x="105" y="126">{active}</text>{renderPaths(demoPaths, 'upper')}</svg>
        </div>
        <div className="en-stroke-panel en-stroke-panel--lower">
          <header><b>小写 {active.toLowerCase()}</b><small>从中格出发</small></header>
          <svg className="en-lower-glyph-demo" viewBox="0 0 210 150" role="img" aria-label={`小写 ${active.toLowerCase()} 分笔示范`}>
            {lowerDemoPaths ? <>{/* 淡底范字 + 真实分笔路径（与右侧口令同步逐笔播放） */}
              <text className="en-demo-glyph en-demo-glyph--lower" x="105" y="123">{active.toLowerCase()}</text>
              {renderPaths(lowerDemoPaths, 'lower')}
            </> : <><defs><clipPath id={`en-lower-reveal-${active}`}><rect x="0" y="0" width={lowerRevealWidth} height="150" /></clipPath></defs>
              <text className="en-demo-glyph en-demo-glyph--lower" x="105" y="123">{active.toLowerCase()}</text>
              <text className="en-demo-glyph en-demo-glyph--lower en-demo-glyph--revealed" x="105" y="123" clipPath={`url(#en-lower-reveal-${active})`}>{active.toLowerCase()}</text>
              {lowerStarts.map((point, index) => <g key={`${active}-lower-start-${index}`} className={`${demoStep !== null && index <= demoStep ? 'shown' : ''} ${demoStep === index ? 'current' : ''}`}><circle cx={point.x} cy={point.y} r="3" /><text x={point.x + 7} y={point.y - 6}>{index + 1}</text></g>)}
            </>}
          </svg>
        </div>
        <ol>{(lowerDemoPaths ? (LETTER_LOWER_DEMO_LABELS[active] ?? demoLabels) : demoLabels).map((label, index) => <li key={label} className={demoStep !== null && index <= demoStep ? 'shown' : ''}><b>{index + 1}</b><span>{label}</span></li>)}</ol>
      </div>
      </div>
      <section className="en-writing-practice" aria-label="四线格动手书写区">
        <header><span>NOW YOU TRY</span><h4>选一个字母，照着范字写</h4><p>橙色是你的笔迹。先写大写，再写小写。</p></header>
        <div className="en-letter-tabs">{letters.map((letter) => <button key={letter} className={active === letter ? 'active' : ''} onClick={() => { if (canvas.current) inkStore.current[active] = canvas.current.toDataURL(); setActive(letter); }}>{letter}{letter.toLowerCase()}</button>)}</div>
        <div className="en-four-line" role="img" aria-label={`英语字母四线格：大写 ${active} 与小写 ${active.toLowerCase()} 的占格范字`}>
          <svg className="en-letter-model" viewBox="0 0 600 220" preserveAspectRatio="none" aria-hidden="true">
            <text className="en-letter-model-upper" x="144" y="134">{active}</text>
            <text className="en-letter-model-lower" x="346" y="134">{active.toLowerCase()}</text>
          </svg>
          <canvas ref={canvas} width="600" height="220" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); drawing.current = true; const ctx = canvas.current?.getContext('2d'); if (!ctx) return; const p = point(event); ctx.strokeStyle = '#ec7b49'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x, p.y); setInk(true); }} onPointerMove={(event) => { if (!drawing.current) return; const ctx = canvas.current?.getContext('2d'); if (!ctx) return; const p = point(event); ctx.lineTo(p.x, p.y); ctx.stroke(); }} onPointerUp={() => { drawing.current = false; if (canvas.current) inkStore.current[active] = canvas.current.toDataURL(); }} onPointerCancel={() => { drawing.current = false; }} />
        </div>
        <button className="en-clear-ink" disabled={!ink} onClick={clearWriting}>清除笔迹，重新写</button>
      </section>
    </div>
  </section>;
}

/** 矢量笔顺演示：路径只是教学用的方向骨架，实际落笔仍在四线格画布完成。 */
function strokeStart(path: string): { x: number; y: number } {
  const match = path.match(/M\s*([\d.]+)[ ,]+([\d.]+)/i);
  return { x: Number(match?.[1] ?? 20), y: Number(match?.[2] ?? 20) };
}

const LETTER_DEMO_PATHS: Record<string, string[]> = {
  A: ['M55 128 L102 24', 'M102 24 L151 128', 'M74 88 L131 88'], B: ['M58 24 L58 128', 'M58 24 C144 20 143 76 58 75', 'M58 75 C153 71 150 132 58 128'],
  C: ['M151 35 C116 8 61 25 59 76', 'M59 76 C61 126 116 143 151 116'], D: ['M59 24 L59 128', 'M59 24 C155 19 157 132 59 128'],
  E: ['M145 24 L59 24 L59 128 L145 128', 'M59 75 L130 75'], F: ['M145 24 L59 24 L59 128', 'M59 75 L128 75'],
  G: ['M151 37 C113 9 61 27 60 76 C60 126 119 141 151 112', 'M151 112 L151 78 L113 78'], H: ['M59 24 L59 128', 'M151 24 L151 128', 'M59 75 L151 75'],
  I: ['M58 24 L151 24', 'M104 24 L104 128', 'M58 128 L151 128'], J: ['M59 24 L151 24', 'M126 24 L126 106 C126 138 62 142 62 108'],
  K: ['M59 24 L59 128', 'M151 24 L59 76 L151 128'], L: ['M59 24 L59 128 L148 128'], M: ['M52 128 L52 24 L103 86 L155 24 L155 128'],
  N: ['M56 128 L56 24', 'M56 24 L153 128', 'M153 128 L153 24'], O: ['M105 24 C49 24 49 128 105 128 C161 128 161 24 105 24'],
  P: ['M59 128 L59 24', 'M59 24 C148 18 148 77 59 75'], Q: ['M105 24 C49 24 49 128 105 128 C161 128 161 24 105 24', 'M128 109 L158 137'],
  R: ['M59 128 L59 24', 'M59 24 C148 18 148 77 59 75', 'M93 75 L153 128'], S: ['M146 37 C109 10 61 27 61 59 C61 88 145 67 145 101 C145 132 92 143 57 113'],
  T: ['M54 24 L156 24', 'M105 24 L105 128'], U: ['M58 24 L58 98 C58 140 151 140 151 98 L151 24'], V: ['M54 24 L105 128', 'M105 128 L156 24'],
  W: ['M49 24 L76 128 L105 76 L134 128 L161 24'], X: ['M56 24 L153 128', 'M153 24 L56 128'], Y: ['M54 24 L105 76', 'M156 24 L105 76 L105 128'], Z: ['M55 24 L155 24 L55 128 L155 128'],
};

/** 小写分笔路径（210×150 演示面板坐标系：基线 y=123，小写体高线 y≈73，上升部到 y=30）。
 *  按教材真实笔顺：a 先圆后竖；b/d 先长竖后半圆；c 一笔绕圆。 */
const LETTER_LOWER_DEMO_PATHS: Record<string, string[]> = {
  A: ['M131 76 C106 58 80 70 80 97 C80 122 108 132 131 114', 'M131 73 L131 123'],
  B: ['M84 30 L84 123', 'M84 64 C124 52 142 70 142 93 C142 117 120 130 84 120'],
  C: ['M133 79 C112 60 82 72 82 97 C82 122 106 132 131 114'],
  D: ['M137 30 L137 123', 'M137 64 C97 52 80 70 80 93 C80 117 102 130 137 120'],
};

const LETTER_LOWER_DEMO_LABELS: Record<string, string[]> = {
  A: ['先写圆圈', '再写右竖'], B: ['先写左长竖', '补右半圆'], C: ['从右上绕圆一笔'], D: ['先写右长竖', '补左半圆'],
};

/** 教材同款完整字形分段高亮时的起笔提示；不再用自绘曲线代替小写字形。 */
const LETTER_LOWER_STROKE_STARTS: Record<string, Array<{ x: number; y: number }>> = {
  A: [{ x: 89, y: 96 }, { x: 132, y: 99 }],
  B: [{ x: 78, y: 32 }, { x: 79, y: 96 }],
  C: [{ x: 139, y: 95 }],
  D: [{ x: 142, y: 32 }, { x: 136, y: 96 }],
};

const LETTER_DEMO_LABELS: Record<string, string[]> = {
  A: ['左斜下', '右斜下', '中间横线'], B: ['先写竖线', '上半圆', '下半圆'], C: ['右上向左绕', '绕到右下收笔'], D: ['先写竖线', '从上到下写大弧'], E: ['竖线与外框', '补中间横线'], F: ['竖线与上横', '补中间横线'], G: ['先写开口圆', '补向内横线'], H: ['左竖与右竖', '连中间横线'], I: ['上横', '中间竖线', '下横'], J: ['先写上横', '竖线向左弯钩'], K: ['先写竖线', '补两条斜线'], L: ['先写竖线', '向右横收笔'], M: ['左竖与斜线', '写中间斜线与右竖'], N: ['左竖', '斜线连接', '右竖'], O: ['从上方绕一整圈'], P: ['先写竖线', '补上半圆'], Q: ['先写 O', '右下补短尾'], R: ['竖线与上半圆', '从中部斜下'], S: ['右上向左弯', '向右下弯收'], T: ['先写上横', '中间向下竖'], U: ['左边向下', '底部弯起到右边'], V: ['左斜下', '右斜上收'], W: ['连续下、上、下、上'], X: ['左上到右下', '右上到左下'], Y: ['两斜线相遇', '中间向下竖'], Z: ['上横', '斜线连接', '下横'],
};

const LETTER_STROKES: Record<string, string> = {
  A: '大写 A：左斜下 → 右斜下 → 中间横线；小写 a：先绕圆，再从右侧收笔。',
  B: '大写 B：先竖线，再写上半圆和下半圆；小写 b：先竖线，再在中部绕圆。',
  C: '大写 C：从右上向左绕到右下；小写 c：从右上向左绕开口。',
  D: '大写 D：先竖线，再从上到下写大弧；小写 d：先写圆，再从右边向上拉竖线。',
  E: '大写 E：先竖线，再上、中、下三横；小写 e：从中格左侧起笔向右绕开。',
  F: '大写 F：先竖线，再上横和中横；小写 f：从上往下写竖弯，再写中横。',
  G: '大写 G：先写 C，再补向内横线；小写 g：先写圆，再向下绕出尾巴。',
  H: '大写 H：两条竖线，再连中横；小写 h：先竖线，再写右侧小拱。',
  I: '大写 I：先上横、竖线、下横；小写 i：短竖后，在上方点一点。',
  J: '大写 J：从上向下，再向左弯钩；小写 j：从中格向下伸进下格，再点一点。',
  K: '大写 K：先竖线，再从中点写两条斜线；小写 k：先竖线，再从中部写两条斜线。',
  L: '大写 L：先竖线，再向右横；小写 l：一笔从上往下。',
  M: '大写 M：左竖 → 斜下 → 斜上 → 右竖；小写 m：先竖，再写两个小拱。',
  N: '大写 N：左竖 → 斜下 → 右竖；小写 n：先竖，再写一个小拱。',
  O: '大写 O：从上方绕一整圈；小写 o：从右上绕一整圈。',
  P: '大写 P：先竖线，再写上半圆；小写 p：先从中格向下伸进下格，再绕圆。',
  Q: '大写 Q：先写 O，再从右下添短尾；小写 q：先在中格写圆，再从右侧伸进下格。',
  R: '大写 R：先竖线、上半圆，再从中部斜下；小写 r：先竖，再向右挑一个小肩。',
  S: '大写 S：从右上向左弯，再向右下弯；小写 s：写一个小小的弯曲。',
  T: '大写 T：先上横，再从中间向下竖；小写 t：先竖弯，再在中间写横。',
  U: '大写 U：两边向下，再在底部弯起；小写 u：从中格上方往下写，再弯起收笔。',
  V: '大写 V：左上斜下，再右上斜回；小写 v：同样两笔尖角。',
  W: '大写 W：连续写下、上、下、上四条斜线；小写 w：连续写两个小 v。',
  X: '大写 X：先左上到右下，再右上到左下；小写 x：同样交叉两笔。',
  Y: '大写 Y：两条斜线在中间相遇，再向下竖；小写 y：先写 v，再向下绕尾。',
  Z: '大写 Z：上横 → 左上到右下斜线 → 下横；小写 z：也是横、斜、横。',
};

function ReviewPlan({
  startedAt,
  items,
  completedDays,
  onComplete,
  onRepeat,
}: {
  startedAt: number;
  items: SourceItem[];
  completedDays: number[];
  onComplete: (day: number) => void;
  onRepeat: (item: SourceItem, onDone: () => void) => void;
}) {
  const elapsed = startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 86_400_000)) : 0;
  const days = [0, 2, 4];
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [heard, setHeard] = useState<Set<string>>(new Set());
  const [spoken, setSpoken] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const targets = useMemo(() => {
    const words = items.filter((item) => item.kind === 'word').slice(0, 6);
    const sentences = items.filter((item) => item.kind === 'line').slice(0, 2);
    const primary = [...words, ...sentences];
    if (primary.length >= 5) return primary;
    return [...primary, ...items.filter((item) => !primary.includes(item)).slice(0, 5 - primary.length)];
  }, [items]);
  const open = (day: number) => {
    setActiveDay(day);
    setHeard(new Set());
    setSpoken(new Set());
    setHidden(new Set());
  };
  const finishReview = () => {
    if (activeDay === null || spoken.size < targets.length) return;
    onComplete(activeDay);
    setActiveDay(null);
    playSfx('correct');
  };
  return <section className="en-review-plan" aria-label="词句复习计划">
    <div><span>SPACED REVIEW</span><h3>把今天的词句再见三次</h3><p>点击已到时间的复习站，完成“听一听、遮住想、跟读”。</p></div>
    <ol>{days.map((day, index) => {
      const due = elapsed >= day;
      const done = completedDays.includes(day);
      return <li key={day} className={`${due ? 'due' : ''} ${done ? 'done' : ''}`}><button type="button" disabled={!due} onClick={() => open(day)} aria-label={`${day === 0 ? '今天' : `第 ${day} 天`}复习${done ? '，已完成，可再次复习' : due ? '，现在开始' : `，${day - elapsed} 天后开放`}`}><b>{done ? '✓' : index + 1}</b><span>{day === 0 ? '今天' : `第 ${day} 天`}</span><small>{done ? '已完成 · 再复习' : due ? '开始复习 →' : `${day - elapsed} 天后开放`}</small></button></li>;
    })}</ol>
    {activeDay !== null && <div className="en-review-session" aria-label={`${activeDay === 0 ? '今天' : `第 ${activeDay} 天`}词句复习任务`}>
      <header><div><span>本次复习</span><h4>{activeDay === 0 ? '今天' : `第 ${activeDay} 天`} · 听、想、跟读</h4></div><strong>{spoken.size} / {targets.length}</strong></header>
      <p>先点“听一听”；再遮住文字，回想读音；最后打开跟读窗，大声跟读。</p>
      <div className="en-review-cards">{targets.map((item) => {
        const isHeard = heard.has(item.id);
        const isSpoken = spoken.has(item.id);
        const isHidden = hidden.has(item.id);
        const text = item.kind === 'letter' ? (item.letterInfo?.words[0] ?? item.text) : item.text;
        return <article key={item.id} className={isSpoken ? 'complete' : ''}>
          <div>{item.kind === 'word' && <WordPicture word={item.text} />}<small>{item.kind === 'word' ? 'WORD' : item.kind === 'line' ? 'SENTENCE' : 'REVIEW'}</small><strong className={isHidden ? 'is-hidden' : ''}>{isHidden ? '想一想，它怎么读？' : text}</strong></div>
          <div className="en-review-card-actions"><button type="button" onClick={() => { speakOnce(text, item.lang, item.lang === 'en' ? .85 : .9); setHeard((current) => new Set(current).add(item.id)); }}>🔊 {isHeard ? '再听' : '听一听'}</button><button type="button" disabled={!isHeard} onClick={() => setHidden((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })}>{isHidden ? '👀 看答案' : '🙈 遮住想'}</button><button type="button" disabled={!isHeard} className={isSpoken ? 'done' : ''} onClick={() => onRepeat(item, () => setSpoken((current) => new Set(current).add(item.id)))}>{isSpoken ? '✓ 跟读完成' : '🎤 跟读'}</button></div>
        </article>;
      })}</div>
      <footer><button type="button" onClick={() => { stopSpeaking(); setActiveDay(null); }}>稍后再练</button><button type="button" className="ct-primary" disabled={spoken.size < targets.length} onClick={finishReview}>完成本次复习</button></footer>
    </div>}
    <em>答错的句子或单词已自动收进错题本；每周回看一次即可，不需要抄满整页。</em>
  </section>;
}

const PHASES = ['看图与预测', '听读原课', '实际表达', '知识延伸', '学习反馈'];
function guide(lesson: EnglishLesson, phase: number, visited: number, total: number): string {
  if (phase === 0) return `今天学习${lesson.title}。先观察教材画面，选择一个你想先追问的问题，再逐句听读。`;
  if (phase === 1) return `点一句听一句，也可以用“连续听读”自动逐句跟听；教材里还有词汇、歌谣或故事。你已经看过${visited}项，共${total}项。原版歌曲与听音辨音不能由普通朗读代替。`;
  if (phase === 2) return lesson.section === 'project' ? '按步骤制作一份小作品，再回答教材情境问题。' : lesson.section === 'letters' ? '先看字母在词中的位置，再试着写大写和小写；机器转写不负责判定纯音位。' : '根据教材情境实际回应或操作，答错先回看材料再试。';
  if (phase === 3) return '教材方法学过以后，换一个新的生活情境试一试。答对时要能说清理由。';
  return '回看你掌握的方法和还想练的能力。歌曲、节奏和原版听音题如果缺教材录音，会明确标出，不算已经练过。';
}

export default function EnglishTextbookLessonPage() {
  const nav = useNavigate();
  const { lessonId = '' } = useParams();
  const lesson = useMemo(() => getEnglishG3Lesson(lessonId), [lessonId]);
  const unit = lesson ? getEnglishG3Unit(lesson.unitId) : undefined;
  const extension = getEnglishG3Extension(lessonId);
  const childId = useStore((s) => s.activeChildId);
  const mastery = useStore((s) => s.mastery);
  const addSkillResult = useStore((s) => s.addSkillResult);
  const addWrong = useStore((s) => s.addWrong);
  const applyPoints = useStore((s) => s.applyPoints);
  const voiceOn = useStore((s) => s.voiceOn);
  const sound = useStore((s) => s.sound);
  const setVoiceOn = useStore((s) => s.setVoiceOn);
  const toggleSound = useStore((s) => s.toggleSound);
  const items = useMemo(() => lesson ? sourceItems(lesson) : [], [lesson]);
  const flowKey = `sfz-english-g3a-flow-v5:${childId ?? 'guest'}:${lessonId}`;
  const restored = useMemo(() => {
    try { const value = JSON.parse(localStorage.getItem(flowKey) ?? '{}') as { phase?: number; unlocked?: number; seen?: string[]; operationPick?: string; operationDone?: boolean; transferPick?: string; mistakes?: number; stars?: number; listeningDone?: boolean; sourceActivityDone?: boolean; reviewStartedAt?: number; reviewDoneDays?: number[] }; return { phase: Math.min(4, Math.max(0, value.phase ?? 0)), unlocked: Math.min(4, Math.max(0, value.unlocked ?? 0)), seen: value.seen ?? [], operationPick: value.operationPick ?? null, operationDone: !!value.operationDone, transferPick: value.transferPick ?? null, mistakes: value.mistakes ?? 0, stars: value.stars ?? 0, listeningDone: !!value.listeningDone, sourceActivityDone: !!value.sourceActivityDone, reviewStartedAt: Number(value.reviewStartedAt) || 0, reviewDoneDays: Array.isArray(value.reviewDoneDays) ? value.reviewDoneDays.filter((day) => [0, 2, 4].includes(day)) : [] }; } catch { return { phase: 0, unlocked: 0, seen: [] as string[], operationPick: null, operationDone: false, transferPick: null, mistakes: 0, stars: 0, listeningDone: false, sourceActivityDone: false, reviewStartedAt: 0, reviewDoneDays: [] as number[] }; }
  }, [flowKey]);
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
  const [listeningDone, setListeningDone] = useState(restored.listeningDone);
  const [reviewStartedAt, setReviewStartedAt] = useState(restored.reviewStartedAt);
  const [reviewDoneDays, setReviewDoneDays] = useState<number[]>(restored.reviewDoneDays);
  const itemEls = useRef<(HTMLElement | null)[]>([]);
  const celebratedRef = useRef(false);
  const activeFlowRef = useRef(flowKey);
  const currentIndex = ENGLISH_G3_ALL_LESSONS.findIndex((item) => item.id === lessonId);
  const bestStars = childId ? mastery[childId]?.[`english-g3a-${lessonId}`]?.stars ?? 0 : 0;
  const extraRequired = lesson?.section === 'project' || lessonId === 'colours-a' || lessonId === 'numbers-read';
  const sourceDone = items.length > 0 && items.every((item) => seen.has(item.id)) && listeningDone && (!requiresInteractiveSource(lesson) || sourceActivityDone);
  const canPlay = voiceOn && sound && volcConfigured() && items.length > 0;
  const operationReady = !!lesson && operationPick === lesson.check.answer && (!extraRequired || operationDone);
  useEffect(() => { if (!lesson || !extension) nav('/subject/english', { replace: true }); }, [extension, lesson, nav]);
  useEffect(() => {
    if (activeFlowRef.current !== flowKey) return;
    try { localStorage.setItem(flowKey, JSON.stringify({ phase, unlocked, seen: [...seen], operationPick, operationDone, transferPick, mistakes, stars: awardedStars, listeningDone, sourceActivityDone, reviewStartedAt, reviewDoneDays })); } catch { /* 私密模式仍可临时学习 */ }
  }, [awardedStars, flowKey, listeningDone, mistakes, operationDone, operationPick, phase, reviewDoneDays, reviewStartedAt, seen, sourceActivityDone, transferPick, unlocked]);
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
    setTransferPick(restored.transferPick);
    setMistakes(restored.mistakes);
    setAwardedStars(restored.stars);
    setRepeat(null);
    setPlayingIndex(null);
    setCelebrate(false);
    setSourceActivityDone(restored.sourceActivityDone);
    setListeningDone(restored.listeningDone);
    setReviewStartedAt(restored.reviewStartedAt);
    setReviewDoneDays(restored.reviewDoneDays);
    celebratedRef.current = restored.seen.length >= items.length && items.length > 0;
    itemEls.current = [];
    stopSpeaking();
  }, [flowKey, items.length, restored]);
  // 断点恢复时已完成的点读不重复庆祝；集满只庆祝一次，"再学一遍"重置后再集满可再庆祝
  useEffect(() => { if (items.length > 0 && seen.size >= items.length) celebratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (items.length === 0 || seen.size < items.length || celebratedRef.current) return;
    celebratedRef.current = true;
    setCelebrate(true);
    playSfx('correct');
    const timer = window.setTimeout(() => setCelebrate(false), 2800);
    return () => window.clearTimeout(timer);
  }, [seen, items]);
  // 点读全部完成时自动收起跟读悬浮条：读完即走，避免挡住"去实际表达"按钮（再点任意内容会重新出现）
  useEffect(() => { if (sourceDone) setRepeat(null); }, [sourceDone]);
  useEffect(() => () => stopSpeaking(), []);
  const completeSourceActivity = useCallback(() => setSourceActivityDone(true), []);
  const completeListeningRoutine = useCallback(() => {
    setListeningDone(true);
    setReviewStartedAt((current) => current || Date.now());
  }, []);

  if (!lesson || !extension) return null;
  const go = (next: number) => { stopSpeaking(); setPlayingIndex(null); setPhase(next); setUnlocked((value) => Math.max(value, next)); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const speakTextOf = (item: SourceItem) => item.kind === 'letter' ? (item.letterInfo?.words.join(', ') ?? item.text) : item.text;
  const playRange = (start: number, end = items.length) => {
    if (!canPlay) return;
    stopSpeaking();
    const seq = items.slice(start, end);
    if (!seq.length) return;
    const rate = lesson.section === 'letters' ? .82 : seq[0].lang === 'en' ? .85 : .9;
    setPlayingIndex(start);
    speakSeq(seq.map(speakTextOf), seq[0].lang, rate, (step) => {
      const at = start + step;
      const item = items[at];
      if (!item) return;
      setPlayingIndex(at);
      setSeen((current) => current.has(item.id) ? current : new Set(current).add(item.id));
      itemEls.current[at]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, () => setPlayingIndex(null));
  };
  const playFrom = (start: number) => playRange(start, items.length);
  const stopPlay = () => { stopSpeaking(); setPlayingIndex(null); };
  const itemRef = (index: number, el: HTMLElement | null) => { itemEls.current[index] = el; };
  // 跟读播放器的插图：词卡用手绘图，句子用所属板块的局部场景图
  const artForItem = (item: SourceItem) => {
    const part = lesson.section === 'a' || lesson.section === 'b' ? lesson.section : undefined;
    const scene = unit && part && item.blockId ? sceneSrc(unit.id, part, item.blockId) : undefined;
    // 词卡优先用手绘词图；句子没有词图，直接用所属板块的局部场景
    if (item.kind === 'word') return wordPictureSrc(item.text) ?? scene;
    return scene;
  };
  const onItem = (item: SourceItem, index: number) => {
    setSeen((current) => new Set(current).add(item.id));
    if (playingIndex !== null) { playFrom(index); playSfx('tap'); return; }
    if (item.kind === 'letter') { speakOnce(item.letterInfo?.words.join(', ') ?? '', 'en', .82); const word = item.letterInfo?.words[0] ?? ''; setRepeat(word ? { text: word, art: wordPictureSrc(word) || undefined } : null); }
    else { speakOnce(item.text, item.lang, item.lang === 'en' ? .85 : .9); if (item.lang === 'en') setRepeat({ text: item.text, art: artForItem(item) }); }
    playSfx('tap');
  };
  const rememberWrong = (kind: string, answer: string) => {
    if (!childId) return;
    addWrong(childId, { uid: `english-${lesson.id}-${kind}-${answer}`, lessonId: `english-g3a-${lesson.id}`, lessonName: lesson.title, kind, answer, time: Date.now() });
  };
  const chooseOperation = (value: string) => { setOperationPick(value); if (value !== lesson.check.answer) { setMistakes((count) => count + 1); rememberWrong('教材情境', `${lesson.check.question} → ${lesson.check.answer}`); playSfx('wrong'); } else playSfx('correct'); };
  const chooseTransfer = (value: string) => {
    setTransferPick(value);
    if (value !== extension.transfer.answer) { setMistakes((count) => count + 1); rememberWrong('知识迁移', `${extension.transfer.question} → ${extension.transfer.answer}`); playSfx('wrong'); return; }
    playSfx('correct');
  };
  const finish = () => {
    if (transferPick !== extension.transfer.answer || !operationReady) return;
    const raw = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
    const cap = needsOriginalAudio(lesson) && !englishOriginalTaskReady(audioKey(lesson)) ? 2 : 3;
    const stars = Math.min(raw, cap);
    setAwardedStars(stars);
    setReviewStartedAt((current) => current || Date.now());
    if (childId) {
      addSkillResult(childId, `english-g3a-${lesson.id}`, stars);
      scheduleReview(childId, { subject: 'english', lessonId: lesson.id, title: lesson.title, focus: `${extension.title}：${extension.mnemonic}`, route: `/english-course/${lesson.id}` });
      if (mistakes === 0) applyPoints(childId, 1, '练习达标', `prac:english-g3a-${lesson.id}:${new Date().toDateString()}`);
    }
    go(4);
  };
  const lookPrompts = unit ? unit.opening.look : ['How do we greet a guest?', 'What should we do when sharing toys?'];
  const exampleQuestion = unit?.question ?? 'How can we be a good guest?';

  return <main className="ct-page ct-lesson-page en-lesson-page page">
    <header className="ct-lesson-head en-lesson-head"><button className="ct-back" onClick={() => nav('/subject/english')} aria-label="返回英语目录">←</button><div><span className="ct-eyebrow">{unit ? `Unit ${ENGLISH_G3_UPPER_UNITS_INDEX(lesson.unitId)} · ${unit.title}` : 'Revision · Being a good guest'} · 教材 {lesson.page}</span><h1>{lesson.title}</h1><p>{lesson.subtitle}</p></div><button className="ct-teacher-play" onClick={() => speakMixedSeq(`${lesson.title}。今天先看教材，再听读、动手表达和知识延伸。`, .9)}>🔊 听聪聪讲</button></header>
    {(!voiceOn || !sound || !volcConfigured()) && <div className="en-voice-banner" role="status"><b>英文点读需要项目中的火山 TTS</b><span>{!volcConfigured() ? '语音服务尚未配置；教材文字和操作仍可学习。' : '当前声音或语音开关关闭，点读按钮不会出声。'}</span>{volcConfigured() && <button onClick={() => { if (!sound) toggleSound(); if (!voiceOn) setVoiceOn(true); }}>启用点读</button>}</div>}
    <nav className="ct-phase-nav en-phase-nav" aria-label="本课学习步骤">{PHASES.map((label, index) => <button key={label} className={`${phase === index ? 'active' : ''} ${index < unlocked ? 'done' : ''}`} disabled={index > unlocked} onClick={() => { stopSpeaking(); setPlayingIndex(null); setPhase(index); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><b>{index < unlocked ? '✓' : index + 1}</b><span>{label}</span></button>)}</nav>
    <TeacherGuideNote key={`${lessonId}:${phase}`} text={guide(lesson, phase, seen.size, items.length)} />
    {phase < 4 && <div className={`en-stage-layout ${phase === 1 ? 'en-stage-layout--source' : ''}`}>{phase !== 1 && <PageReference lesson={lesson} />}<div className="en-stage-main">
      {phase === 0 && <section className="en-observe-stage"><span>看图发现 · 不判对错</span><h2>{exampleQuestion}</h2><p>从教材情境里，你最想先追问哪一点？选一个问题，下一步用课文材料来验证。</p><div>{lookPrompts.map((prompt) => <button key={prompt} className={guess === prompt ? 'selected' : ''} onClick={() => setGuess(prompt)}>{prompt}</button>)}</div><button className="ct-primary" disabled={!guess} onClick={() => go(1)}>带着问题去听读 →</button></section>}
    {phase === 1 && <><SourceContent lesson={lesson} items={items} seen={seen} playingIndex={playingIndex} canPlay={canPlay} onVisit={onItem} onPlayAll={() => playFrom(0)} onPlayScene={playRange} onStoryComplete={completeSourceActivity} onListeningComplete={completeListeningRoutine} onShadowTarget={(item, onDone) => setRepeat({ text: item.text, art: artForItem(item), onDone })} onStopPlay={stopPlay} itemRef={itemRef} onWrong={rememberWrong} /><button className="ct-primary en-stage-next" disabled={!sourceDone} onClick={() => go(2)}>教材内容看完了，去实际表达 →</button>{celebrate && <Confetti show />}</>}
      {phase === 2 && <section className="en-operation-stage"><span>教材情境 · 真正回应或操作</span><QuizPanel quiz={lesson.check} pick={operationPick} onPick={chooseOperation} title="根据教材内容作判断" />{lesson.section === 'project' && <ProjectBuilder unitId={lesson.unitId} onDone={() => setOperationDone(true)} />}{lessonId === 'colours-a' && <ColourMixer onDone={() => setOperationDone(true)} />}{lessonId === 'numbers-read' && <PairEven onDone={() => setOperationDone(true)} />}{lesson.section === 'letters' && <p className="en-task-hint">书写实验室已在上一阶段完成：先按笔顺在四线格练写，再用这里的情境题检查自己是否会认、会用。</p>}{operationPick === lesson.check.answer && extraRequired && !operationDone && <p className="en-task-hint">判断答对了，还要完成本课的实际操作。</p>}<button className="ct-primary en-stage-next" disabled={!operationReady} onClick={() => go(3)}>把方法用到新情境 →</button></section>}
      {phase === 3 && <section className="en-extension-stage"><span>知识延伸 · {extension.from ? `从 ${getEnglishG3Lesson(extension.from)?.title ?? extension.from} 继续` : '首次建立方法'}</span><h2>{extension.title}</h2><p>{extension.insight}</p><div className="en-extension-example"><b>换个角度看</b><p>{extension.example}</p><button onClick={() => speakMixedSeq(`${extension.title}。${extension.insight}。${extension.example}`, .88)}>🔊 听讲解</button></div><strong className="en-mnemonic">记住它：{extension.mnemonic}</strong><QuizPanel quiz={extension.transfer} pick={transferPick} onPick={chooseTransfer} title="新情境迁移题" /><button className="ct-primary en-stage-next" disabled={transferPick !== extension.transfer.answer} onClick={finish}>完成这节课，查看反馈 →</button></section>}
    </div></div>}
    {phase === 4 && <section className="en-result-stage"><span>本课学习反馈</span><h2>{bestStars > 0 ? '学会啦，再用一用！' : '学习步骤已经完成'}</h2><div className="en-result-stars" aria-label={`本次 ${awardedStars} 星，历史最高 ${bestStars} 星`}>{[1, 2, 3].map((index) => <i key={index} className={index <= Math.max(awardedStars, bestStars) ? 'on' : ''}>★</i>)}</div><p>本次获得 {awardedStars} 星，历史最高 {bestStars} 星。{needsOriginalAudio(lesson) && !englishOriginalTaskReady(audioKey(lesson)) ? '教材原版歌曲、语音辨音或只听判断还未练到，本课暂不标为完整 3 星。' : '多次学习保留最高成绩。'}</p><div className="en-result-review"><b>今天用过的方法</b><p>{extension.title}：{extension.mnemonic}</p>{unit?.project.selfCheck && <details><summary>本单元四项自评目标</summary><ol>{unit.project.selfCheck.map((text) => <li key={text}>{text}</li>)}</ol></details>}</div><ReviewPlan startedAt={reviewStartedAt} items={items} completedDays={reviewDoneDays} onComplete={(day) => { setReviewDoneDays((current) => current.includes(day) ? current : [...current, day]); if (childId) completeReviewDay(childId, `english:${lesson.id}`, day); }} onRepeat={(item, done) => { const text = item.kind === 'letter' ? (item.letterInfo?.words[0] ?? item.text) : item.text; setRepeat({ text, art: artForItem(item), onDone: done }); }} /><div><button className="ct-primary" onClick={() => { setGuess(null); setOperationPick(null); setOperationDone(false); setTransferPick(null); setMistakes(0); setSeen(new Set()); setSourceActivityDone(false); setListeningDone(false); celebratedRef.current = false; setPlayingIndex(null); go(0); }}>再学一遍，取最高成绩</button><button onClick={() => nav('/subject/english')}>返回英语目录</button></div></section>}
    {repeat && <RepeatDock target={repeat.text} art={repeat.art} onClose={() => setRepeat(null)} onDone={() => { repeat.onDone?.(); setRepeat(null); }} />}
    <footer className="ct-lesson-footer en-lesson-footer"><button disabled={currentIndex <= 0} onClick={() => nav(`/english-course/${ENGLISH_G3_ALL_LESSONS[currentIndex - 1].id}`)}>← 上一课</button><span>{bestStars > 0 ? `★ 已获 ${bestStars} 星 · ` : '完成课程即记录 · '}{currentIndex + 1} / {ENGLISH_G3_ALL_LESSONS.length}</span><button disabled={currentIndex >= ENGLISH_G3_ALL_LESSONS.length - 1} onClick={() => nav(`/english-course/${ENGLISH_G3_ALL_LESSONS[currentIndex + 1].id}`)}>下一课 →</button></footer>
  </main>;
}

function ENGLISH_G3_UPPER_UNITS_INDEX(id: string) { return ['friends', 'families', 'animals', 'plants', 'colours', 'numbers'].indexOf(id) + 1; }
