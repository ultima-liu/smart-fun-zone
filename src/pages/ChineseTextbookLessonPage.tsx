import ChineseTextbookExtras from '../components/ChineseTextbookExtras';
import { CHINESE_TEXTBOOK_EXTRAS } from '../content/chineseTextbookExtras';
import ChineseGuidedPractice from './ChineseGuidedPractice';
import CourseReplayButton from '../components/CourseReplayButton';
import AutomaticCourseCheck from '../components/AutomaticCourseCheck';
import SpeechReadingCheck from '../components/SpeechReadingCheck';
import PracticeAgain from '../components/PracticeAgain';
import Modal from '../components/Modal';
import { WholeStage } from '../components/ScreenPages';
import ActivityDeck from '../components/ClassroomActivities';
import BackButton from '../components/BackButton';
import { playChineseReadingAudio, stopChineseReadingAudio } from '../chineseReadingAudio';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { playSfx, speakOnce, stopSpeaking } from '../speech';
import { pinyin } from 'pinyin-pro';
import CharCard from '../components/CharCard';
import SpeakChip from '../components/SpeakChip';
import LessonHelp from '../components/LessonHelp';
import { IconCourseSpeaker } from '../components/icons';
import { useChineseTabNarration } from '../chineseTabNarration';
import { getChineseTextbookLesson, type ChineseLessonId } from '../content/chineseTextbookCurriculum';
import { getChineseTextbookStudy } from '../content/chineseTextbookStudy';
import { optionKey } from '../options';
import ChinesePinyinStudyStage from './ChinesePinyinStudyStage';
import ChinesePinyinGardenStudyStage from './ChinesePinyinGardenStudyStage';
import ChineseKnowledgeExtensionStage from './ChineseKnowledgeExtensionStage';
import { CHINESE_PINYIN_GARDENS } from '../content/chinesePinyinGardenStudy';
import { scheduleReview } from '../reviewPlan';
import { settleCourseTask } from '../taskSystem';
import { useRepeatableChineseSequence, useChinesePracticeState, clearChinesePracticeState, readChinesePracticeIndex } from '../chinesePracticeState';
import { chineseOptions, recordChineseEvidence } from '../chineseLearning';
import { getChineseTeaching } from '../content/chineseTeaching';
import { PinyinListeningPractice, PinyinProductionPractice } from './ChinesePinyinPractice';
import { stopPinyinAudio } from '../pinyinAudio';
import { OralPractice, ReadingExperience, TransferPractice, RecognitionCheck, WritingPractice, ObservedPractice } from './ChinesePractice';
import '../chinese-textbook.css';
import '../chinese-classroom.css';

/** 公共提示保持简短；完整题目由当前最子级任务负责朗读。 */
function phaseGuides(lesson: NonNullable<ReturnType<typeof getChineseTextbookLesson>>): string[] {
  return [lesson.observePrompt, '完整听或读一遍，再挑一句自己练读。',
    lesson.kind === 'pinyin' ? '观察字形与口形，练声调、拼读和听辨。' : '认字、书写和教材任务，逐项练习。',
    '自己做、自己说，再听别人说并回应。', '听清题目和所有选项，再独立想一想。'];
}

const OBSERVATIONS: Partial<Record<ChineseLessonId, { id: string; label: string; note: string; x: number; y: number }[]>> = {
  china: [
    { id: 'flag', label: '五星红旗', note: '红色旗面上有一颗大星和四颗小星。', x: 70, y: 15 },
    { id: 'gate', label: '北京天安门', note: '画面远处是北京天安门。', x: 48, y: 31 },
    { id: 'children', label: '各民族小朋友', note: '大家服饰各不相同，开心地站在一起。', x: 50, y: 70 },
  ],
  motherland: [
    { id: 'flag', label: '五星红旗', note: '中华人民共和国国旗。', x: 18, y: 20 },
    { id: 'gate', label: '北京天安门', note: '北京天安门是课本中的祖国名片。', x: 72, y: 22 },
    { id: 'yangtze', label: '长江', note: '江水穿过青山，奔流向前。', x: 28, y: 69 },
    { id: 'yellow', label: '黄河', note: '奔腾的黄河水气势雄伟。', x: 77, y: 70 },
  ],
  schoolchild: [
    { id: 'sun', label: '太阳', note: '太阳当空照，告诉我们新的一天开始了。', x: 84, y: 11 },
    { id: 'bird', label: '小鸟', note: '小鸟用三个“早”向小学生问好。', x: 18, y: 12 },
    { id: 'bag', label: '小书包', note: '背上小书包，准备去上学校。', x: 30, y: 57 },
  ],
  'love-chinese': [
    { id: 'read', label: '读书', note: '眼睛看文字，嘴巴可以轻声读。', x: 15, y: 58 },
    { id: 'write', label: '写字', note: '坐端正，认真写下每一笔。', x: 43, y: 59 },
    { id: 'tell', label: '讲故事', note: '把故事有顺序地讲给别人听。', x: 67, y: 31 },
    { id: 'listen', label: '听故事', note: '认真听，想一想故事讲了什么。', x: 84, y: 58 },
  ],
  'heaven-earth-human': [
    { id: 'sky', label: '天', note: '抬头看到的是天。', x: 23, y: 15 },
    { id: 'earth', label: '地', note: '我们站立、行走在地上。', x: 41, y: 82 },
    { id: 'human', label: '人', note: '你、我、他都是人。', x: 57, y: 55 },
  ],
};

const getObservations = (lessonId: ChineseLessonId) => {
  const lesson = getChineseTextbookLesson(lessonId);
  return OBSERVATIONS[lessonId] ?? lesson?.visualClues ?? [];
};

function Illustration({ lessonId, visited, onVisit }: { lessonId: ChineseLessonId; visited: Set<string>; onVisit: (id: string) => void }) {
  const items = getObservations(lessonId);
  const lesson = getChineseTextbookLesson(lessonId)!;
  return (
    <div className={`ct-observe-scene scene-${lessonId} ${lesson.artworkSource === 'textbook' ? 'ct-source-scene' : ''}`} role="group" aria-label={`${lesson.title}课文观察图`}>
      <img className="ct-observe-artwork" src={lesson.artwork} alt={lesson.artworkAlt} draggable="false" />
      {lesson.artworkSource === 'textbook' && <span className="ct-source-badge" aria-hidden="true">教材主题画面</span>}
      {items.map((item, index) => (
        <button
          key={item.id}
          className={`ct-scene-hotspot ${visited.has(item.id) ? 'seen' : ''}`}
          style={{ left: `${item.x}%`, top: `${item.y}%` }}
          onClick={() => onVisit(item.id)}
          aria-label={`发现${item.label}`}
        >
          <b>{visited.has(item.id) ? '✓' : index + 1}</b><span>{item.label}</span><i className="ct-hotspot-audio" aria-hidden="true"><IconCourseSpeaker size={20} /></i>
        </button>
      ))}
    </div>
  );
}

function TextbookPageViewer({ pageRange, title }: { pageRange: string; title: string }) {
  const matches = [...pageRange.matchAll(/\d+/g)].map((match) => Number(match[0]));
  const first = matches[0] ?? 2;
  const last = matches[1] ?? first;
  const pages = Array.from({ length: Math.max(1, last - first + 1) }, (_, index) => first + index);
  const [activePage, setActivePage] = useState(first);
  const src = `/assets/chinese-textbook/pages/p${String(activePage).padStart(3, '0')}.webp`;

  const viewer = (
    <div className="ct-page-viewer">
      <div className="ct-page-canvas"><img src={src} alt={`${title}教材第${activePage}页`} loading="lazy" draggable="false" /></div>
      <div className="ct-page-switcher" aria-label="选择教材页">
        {pages.map((pageNumber) => <button key={pageNumber} className={pageNumber === activePage ? 'active' : ''} onClick={() => setActivePage(pageNumber)}>P{pageNumber}</button>)}
      </div>
    </div>
  );

  return (
    <section className="ct-textbook-reference ct-reference-modal" aria-label="教材完整页对照">
      <header><b>教材完整页对照</b><span>{pageRange} · 共 {pages.length} 页</span></header>
      {viewer}
    </section>
  );
}

// 测试期间暂时关闭完整听读中的跟读检查；恢复时将此开关设为 true。
const CHINESE_FOLLOW_ALONG_CHECK_ENABLED = false;

/** 启用检查时，普通课文核对内容；拼音跟读使用实际录音。 */
function FollowAlong({ line, lessonId, onClose, onPass }: { line: string; lessonId: string; onClose: () => void; onPass: () => void }) {
  return <div className="ct-follow-mask" role="dialog" aria-label={`跟读：${line}`}><div className="ct-follow-card">
    <div className="ct-follow-head"><span>🎤 自动跟读检查</span><button onClick={onClose} aria-label="关闭跟读">✕</button></div>
    <b className="ct-follow-line">{line}</b>
    {/[\u4e00-\u9fff]/.test(line) && !/[a-zāáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜü]/i.test(line)
      ? <SpeechReadingCheck key={line} target={line} language="zh-CN" autoStart onPass={onPass} />
      : <AutomaticCourseCheck subject="语文" lessonId={lessonId} taskId="follow-along" prompt={`朗读这句：${line}`} requirement="audio" criteria={['实际读出目标内容', '字音或音节基本正确，朗读连贯']} onPass={onPass} />}
  </div></div>;
}

const HAN_RE = /[\u4e00-\u9fff]/;

function ReadingStage({ lines, lessonId, onDone }: { lines: string[]; lessonId: string; onDone: () => void }) {
  const [seen, setSeen] = useChinesePracticeState(lessonId, 'readSeen', new Set<number>());
  const childId = useStore((state) => state.activeChildId);
  const [wholeRead, setWholeRead] = useChinesePracticeState(lessonId, 'wholeRead', false);
  const [practiced, setPracticed] = useChinesePracticeState(lessonId, 'readPracticed', false);
  const [followed, setFollowed] = useChinesePracticeState(lessonId, 'readFollowed', new Set<number>());
  const [recording, setRecording] = useState<number | null>(null);
  const [showPinyin, setShowPinyin] = useState(false);
  const [audioNote, setAudioNote] = useState('');
  const readingAttempt = useRef(0);
  const pinyinLesson = getChineseTextbookLesson(lessonId)?.kind === 'pinyin';
  useEffect(() => () => { readingAttempt.current++; stopChineseReadingAudio(); }, []);
  // 每个字的带调拼音（数组与字符一一对应），打开注音开关时才计算
  const pyLines = useMemo(
    () => (showPinyin ? lines.map((line) => pinyin(line, { toneType: 'symbol', type: 'array', nonZh: 'spaced' })) : []),
    [lines, showPinyin],
  );
  const listen = (selectedLines: string[], whole = false) => {
    const attempt = ++readingAttempt.current;
    stopChineseReadingAudio();
    const { sound, voiceOn } = useStore.getState();
    if (!sound || !voiceOn) { setAudioNote('声音或语音已关闭，请打开后再听，也可以自己读给家人听。'); return; }
    setAudioNote('正在朗读…');
    if (pinyinLesson) {
      let missing: string[] = [];
      void playChineseReadingAudio(selectedLines, (values) => {
        missing = values;
        if (values.length) setAudioNote(`${values.join('、')} 暂缺本音录音，请老师或家人示范；其余声音继续播放。`);
      }).then((played) => {
        if (attempt !== readingAttempt.current) return;
        if (missing.length) return;
        setAudioNote(played ? '朗读播放完成，可以再听一遍。' : '朗读未完整播完，可以重听；请检查声音开关或语音服务。');
        if (whole && played) setWholeRead(true);
      });
    } else speakOnce(selectedLines.join(''), 'zh', .82, (played) => {
      setAudioNote(played ? '朗读播放完成，可以再听一遍。' : '朗读没有播完，可以重听或自己读。');
      if (whole && played) setWholeRead(true);
    });
  };
  const read = (line: string, index: number) => {
    setSeen((value) => new Set(value).add(index));
    listen([line]);
    playSfx('tap');
  };
  const follow = (index: number) => {
    playSfx('tap');
    readingAttempt.current++;
    stopChineseReadingAudio();
    if (CHINESE_FOLLOW_ALONG_CHECK_ENABLED) setRecording(index);
    else {
      setFollowed((value) => new Set(value).add(index));
      setPracticed(true);
      recordChineseEvidence(childId, { lessonId, taskId: `read-line:${index}`, skill: 'reading', level: 'practiced', source: 'self', context: 'lesson', note: '跟读检查暂时关闭，点击标记练习，未核验朗读内容或发音' });
    }
  };
  useEffect(() => {
    if ((wholeRead || seen.size === lines.length) && practiced) onDone();
  }, [seen, wholeRead, practiced, lines.length, onDone]);
  return <div className={`ct-reading-stage ${!pinyinLesson && lines.length <= 4 ? "ct-reading-brief" : ""}`} data-chinese-leaf data-chinese-narration={`完整听读。${lines.join("。")}。完整听或读一遍，再挑一句自己练读。`}>
    <div className="ct-read-guide"><b>点读与跟读</b><span>从上到下按顺序读，再选一句跟读。</span><div className="ct-read-actions"><button className={showPinyin ? 'ct-py-toggle on' : 'ct-py-toggle'} aria-pressed={showPinyin} onClick={() => setShowPinyin((v) => !v)}>🔤 拼音注音<span className="ct-py-state">{showPinyin ? '已开启' : '已关闭'}</span></button><button className="ct-read-all" data-tab-audio onClick={() => listen(lines, true)}><IconCourseSpeaker size={20} /> 连起来听</button></div></div>
    {pinyinLesson && <p>点击文字听示范，中文和拼音按顺序读。{lines.some((line) => /\bo\b/.test(line)) && '单韵母 o 使用合成示范，可跟老师或家人核对口形。'}</p>}<p role="status">{audioNote}</p><div className="ct-reading-full-text"><WholeStage><div className="ct-source-lines">{lines.map((line, index) => <div key={`${line}-${index}`} className="ct-read-line">
      <button data-tab-audio aria-label={`点读第${index + 1}句：${line}`} className={seen.has(index) ? 'read py-on' : ''} onClick={() => read(line, index)}><i aria-hidden="true">{index + 1}</i>
        {showPinyin ? <span className="ct-read-py">{Array.from(line).map((ch, chIndex) => HAN_RE.test(ch)
          ? <ruby key={chIndex}>{ch}<rt>{pyLines[index]?.[chIndex] ?? ''}</rt></ruby>
          : <span key={chIndex}>{ch}</span>)}</span>
          : <span>{line}</span>}
      </button>
      <button className={`ct-read-follow ${followed.has(index) ? 'followed' : ''}`} onClick={() => follow(index)} aria-label={`跟读：${line}`}>{followed.has(index) ? '✓ 已跟读' : '🎤 跟读'}</button>
    </div>)}</div></WholeStage></div>
    <p className="ct-stage-hint">已点读 {seen.size} / {lines.length} 句 · 已跟读 {followed.size} / {lines.length} 句。朗读先做到清楚、自然，不用追求速度。</p>
    {recording !== null && <FollowAlong lessonId={lessonId} line={lines[recording]} onClose={() => setRecording(null)} onPass={() => { const plain = /[\u4e00-\u9fff]/.test(lines[recording]) && !/[a-zāáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜü]/i.test(lines[recording]); setRecording(null); setFollowed((value) => new Set(value).add(recording)); setPracticed(true); recordChineseEvidence(childId, { lessonId, taskId: `read-line:${recording}`, skill: 'reading', level: 'independent', source: plain ? 'check' : 'ai', context: 'lesson', note: plain ? '浏览器语音识别与目标内容自动核对，不提供发音评分' : 'AI 根据实际录音确认朗读内容和读音' }); }} />}
  </div>;
}

/* ---------- 场景化教材任务：交互要落在任务描述的场景里 ---------- */

/** 田字格找线：点词语卡片，在旁边的田字格上直观高亮对应的中线或四个方位格 */
function TianGridTask({ lessonId, content, onDone }: { lessonId: string; content: string[]; onDone: () => void }) {
  const [found, setFound] = useChinesePracticeState(lessonId, 'gridFound', new Set<string>());
  const [active, setActive] = useState<string | null>(null);
  const pick = (item: string) => {
    speakOnce(item.replace(/[、]/g, '，'), 'zh', .78);
    playSfx('pop');
    setActive(item);
    setFound((value) => {
      const next = new Set(value);
      next.add(item);
      if (next.size === content.length) setTimeout(onDone, 700);
      return next;
    });
  };
  const showH = active?.includes('横中线') ?? false;
  const showV = active?.includes('竖中线') ?? false;
  const showQuad = active?.includes('左上格') ?? false;
  return <div className="ct-tian-task">
    <div className="ct-tian-list">{content.map((item) => (
      <button key={item} className={found.has(item) ? 'done' : ''} aria-pressed={found.has(item)} onClick={() => pick(item)}>
        <b>{item}</b><i>{found.has(item) ? '✓ 已找到' : '在格子里找一找'}</i>
      </button>
    ))}</div>
    <div className="ct-tian-board">
      <svg viewBox="0 0 120 120" aria-label="田字格示意图" role="img">
        <rect className="ct-tian-frame" x="5" y="5" width="110" height="110" />
        <line className="ct-tian-mid" x1="5" y1="60" x2="115" y2="60" />
        <line className="ct-tian-mid" x1="60" y1="5" x2="60" y2="115" />
        {showQuad && <>
          <rect className="ct-tian-quad" x="7" y="7" width="51" height="51" />
          <rect className="ct-tian-quad" x="62" y="7" width="51" height="51" />
          <rect className="ct-tian-quad" x="7" y="62" width="51" height="51" />
          <rect className="ct-tian-quad" x="62" y="62" width="51" height="51" />
          <text className="ct-tian-quad-label" x="32.5" y="37">左上</text>
          <text className="ct-tian-quad-label" x="87.5" y="37">右上</text>
          <text className="ct-tian-quad-label" x="32.5" y="92">左下</text>
          <text className="ct-tian-quad-label" x="87.5" y="92">右下</text>
        </>}
        {showH && <line className="ct-tian-hl ct-tian-hl-h" x1="5" y1="60" x2="115" y2="60" />}
        {showV && <line className="ct-tian-hl ct-tian-hl-v" x1="60" y1="5" x2="60" y2="115" />}
      </svg>
      <p>{active ? `这就是${active.replace(/[、]/g, '、')}的位置。` : '点左边的词语，看看它在田字格的哪里。'}</p>
    </div>
  </div>;
}

/** 象形字图文连线：先点汉字，再点对应图画，配对成功锁定 */
const PICT_EMOJI: Record<string, string> = { 兔: '🐰', 鸟: '🐦', 竹: '🎍', 羊: '🐑', 木: '🌳', 网: '🕸️' };
function PictMatchTask({ lessonId, content, onDone }: { lessonId: string; content: string[]; onDone: () => void }) {
  const [matched, setMatched] = useChinesePracticeState(lessonId, 'pictMatched', new Set<string>());
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const shuffled = useMemo(() => chineseOptions(content, `${lessonId}:pict-match`), [content, lessonId]);
  const pickChar = (char: string) => {
    if (matched.has(char)) return;
    setPicked(char);
    setWrong(null);
    speakOnce(char, 'zh', .74);
    playSfx('tap');
  };
  const pickPict = (char: string) => {
    if (matched.has(char) || !picked) return;
    if (picked === char) {
      const next = new Set(matched).add(char);
      setMatched(next);
      setPicked(null);
      setWrong(null);
      speakOnce(`${char}，配对正确。`, 'zh', .8);
      playSfx('correct');
      if (next.size === content.length) setTimeout(onDone, 700);
    } else {
      setWrong(char);
      speakOnce('再看看字形，这幅图像哪个字？', 'zh', .8);
      playSfx('wrong');
      setTimeout(() => setWrong(null), 700);
    }
  };
  return <div className="ct-pict-match">
    <div className="ct-pict-col">{content.map((char) => (
      <button key={char} className={`ct-pict-char ${matched.has(char) ? 'done' : ''} ${picked === char ? 'picked' : ''}`} disabled={matched.has(char)} onClick={() => pickChar(char)}>{char}</button>
    ))}</div>
    <div className="ct-pict-link" aria-hidden="true">{matched.size}/{content.length}</div>
    <div className="ct-pict-col">{shuffled.map((char) => (
      <button key={char} className={`ct-pict-pic ${matched.has(char) ? 'done' : ''} ${wrong === char ? 'wrong' : ''}`} disabled={!picked} onClick={() => pickPict(char)} aria-label={`图画：${char}`}><span>{PICT_EMOJI[char] ?? '❓'}</span></button>
    ))}</div>
  </div>;
}

/** 叠词短语的场景点缀 */
const PHRASE_EMOJI: Record<string, string> = { '小小的船': '🛶', '弯弯的月儿': '🌙', '闪闪的星星': '⭐', '蓝蓝的天': '🌤️', '弯弯的小河': '🏞️', '蓝蓝的大海': '🌊' };

function TextbookStudyStage({ lessonId, onDone, onCompletionChange, extensionDone, onExtensionDone }: { lessonId: ChineseLessonId; onDone: () => void; onCompletionChange: (done: boolean) => void; extensionDone: boolean; onExtensionDone: () => void }) {
  const lesson = getChineseTextbookLesson(lessonId)!;
  const pack = getChineseTextbookStudy(lessonId);
  const childId = useStore(state => state.activeChildId);
  const [recognized, setRecognized] = useChinesePracticeState(lessonId, 'recognized', new Set<string>());
  const [writingSeen, setWritingSeen] = useChinesePracticeState(lessonId, 'writingSeen', new Set<string>());
  const [tasksDone, setTasksDone] = useChinesePracticeState(lessonId, 'textbookTasks', new Set<string>());
  // 生字卡浏览：本课会认字 + 写字字（去重），入口在区块标题右侧，不打扰"单击=点读"
  const [deckIndex, setDeckIndex] = useState<number | null>(null);
  const lessonChars = useMemo(() => {
    const list: string[] = [];
    for (const item of [...pack?.recognize ?? [], ...pack?.writing ?? []]) {
      if (item.char && !list.includes(item.char)) list.push(item.char);
    }
    return list;
  }, [pack]);
  // 无练习包课文的兜底学习：逐句朗读打卡、词语点读、句式支架口头表达
  const [wordSet, setWordSet] = useChinesePracticeState(lessonId, 'wordsSeen', new Set<string>());
  // 园地一新增“九”后使用新的书写断点，旧四字完成不能跳过新增字。
  const writingTaskId = lessonId === 'garden-1' ? 'paper-writing-numbers' : 'paper-writing';
  const writingIndexKey = `lesson:${writingTaskId}:writingIndex:0`;
  const [writingPracticed, setWritingPracticed] = useChinesePracticeState(lessonId, lessonId === 'garden-1' ? 'writingPracticed:numbers' : 'writingPracticed', Boolean(pack?.writing?.length && readChinesePracticeIndex(childId, lessonId, writingIndexKey) >= pack.writing.length));
  const recognizeDone = !pack?.recognize?.length || pack.recognize.every(item => recognized.has(item.char));
  const writingDone = !pack?.writing?.length || writingPracticed || readChinesePracticeIndex(childId, lessonId, writingIndexKey) >= pack.writing.length;
  const activitiesDone = !pack?.tasks.length || pack.tasks.every(task => tasksDone.has(task.id));
  const wordsAllDone = !lesson.keywords.length || lesson.keywords.every(word => wordSet.has(word));
  const [selected, setSelected] = useChinesePracticeState(lessonId, 'studySelected', 0);
  const [recognitionChecked, setRecognitionChecked] = useChinesePracticeState(lessonId, 'recognitionChecked', Boolean(pack?.recognize?.length && readChinesePracticeIndex(childId, lessonId, 'lesson:recognitionIndex:0') >= Math.min(3, pack.recognize.length)));
  const recognitionDone = recognitionChecked || Boolean(pack?.recognize?.length && readChinesePracticeIndex(childId, lessonId, 'lesson:recognitionIndex:0') >= Math.min(3, pack.recognize.length));
  const gardenChecksDone = lesson.kind !== 'garden' || (recognitionDone && (pack?.writing?.every(item => writingSeen.has(item.char)) ?? true));
  const allDone = pack ? recognizeDone && writingDone && activitiesDone && gardenChecksDone : wordsAllDone;
  useEffect(() => { onCompletionChange(allDone); if (allDone) onDone(); }, [allDone, onDone, onCompletionChange]);
  const requiredBridge = lesson.id === 'metal-wood-water-fire-earth';
  const recognitionTabIndex = requiredBridge ? 2 : 1;


  const visitCharacter = (char: string, pinyin: string, writing: boolean) => {
    (writing ? setWritingSeen : setRecognized)((value) => new Set(value).add(char));
    speakOnce(`${char}，${pinyin}`, 'zh', .72);
    playSfx('tap');
  };

  return <div className="ct-textbook-study"><ActivityDeck selectedIndex={selected} onSelect={setSelected}
    labels={[...(requiredBridge ? ['田字格'] : []), ...(!pack && lesson.keywords.length ? ['词语积累'] : []), ...(pack?.recognize?.length ? ['会认的字', '认字抽查'] : []), ...(pack?.writing?.length ? ['写字观察', '实际书写'] : []), ...(pack?.tasks.map((_task, index) => `教材任务 ${index + 1}`) ?? []), ...(!requiredBridge ? ['知识桥'] : []), ...(CHINESE_TEXTBOOK_EXTRAS[lessonId] ? ['教材补充'] : [])]}
    completed={[...(requiredBridge ? [extensionDone] : []), ...(!pack && lesson.keywords.length ? [wordsAllDone] : []), ...(pack?.recognize?.length ? [recognizeDone, recognitionDone] : []), ...(pack?.writing?.length ? [pack.writing.every(item => writingSeen.has(item.char)), writingDone] : []), ...(pack?.tasks.map(task => tasksDone.has(task.id)) ?? []), ...(!requiredBridge ? [extensionDone] : [])]}>
    {requiredBridge && <ChineseKnowledgeExtensionStage lessonId={lessonId} onDone={onExtensionDone} />}

    {!pack && <>
      {lesson.keywords.length > 0 && <section className="ct-study-section" data-chinese-leaf data-chinese-narration-mode="instructions-only" data-chinese-narration="词语积累。点一个词语听一听，再大声读出来。">
        <div className="ct-study-section-head"><span>词语积累<SpeakChip text="词语积累。点一个词语听一听，再大声读出来。" /></span><b>{wordSet.size} / {lesson.keywords.length}</b></div>
        <p>点一个词语听一听，再大声读出来。</p>
        <div className="ct-recognize-grid ct-word-grid">{(lesson.kind === 'pinyin' ? lesson.keywords.filter((word) => HAN_RE.test(word)) : lesson.keywords).map((word) => <button data-tab-audio key={word} className={wordSet.has(word) ? 'done' : ''} aria-pressed={wordSet.has(word)} onClick={() => { speakOnce(word, 'zh', .74); setWordSet((value) => new Set(value).add(word)); playSfx('tap'); }}><b>{word}</b><i>{wordSet.has(word) ? '✓' : '点读'}</i></button>)}</div>
      </section>}

    </>}

    {!!pack?.recognize?.length && <section className="ct-study-section" data-chinese-leaf data-chinese-narration-mode="instructions-only" data-chinese-narration="会认的字。逐个点读，注意字形、拼音和课文中的意思。">
      <div className="ct-study-section-head"><span>会认的字<SpeakChip text="会认的字。逐个点读，注意字形、拼音和课文中的意思。" /></span><div className="ct-study-head-ops"><b>{recognized.size} / {pack.recognize.length}</b><button className="ct-study-deck" onClick={() => setDeckIndex(0)}>🃏 生字卡</button></div></div>
      <p>逐个点读，注意字形、拼音和课文中的意思。</p>
      <div className="ct-recognize-grid">{pack.recognize.map((item) => <button data-tab-audio key={item.char} className={recognized.has(item.char) ? 'done' : ''} aria-pressed={recognized.has(item.char)} onClick={() => visitCharacter(item.char, item.pinyin, false)}><b>{item.char}</b><span>{item.pinyin}</span><i>{recognized.has(item.char) ? '✓ 已练习' : '点读'}</i></button>)}</div>
    </section>}

    {!!pack?.recognize?.length && <RecognitionCheck lessonId={lessonId} onDone={() => setRecognitionChecked(true)} onAdvance={() => setSelected(recognitionTabIndex + 1)} />}

    {!!pack?.writing?.length && <section className="ct-study-section">
      <div className="ct-study-section-head"><span>田字格写字<SpeakChip text="田字格写字。先观察每个字在田字格中的位置，再按正确笔顺临写。" /></span><div className="ct-study-head-ops"><b>{writingSeen.size} / {pack.writing.length}</b><button className="ct-study-deck" onClick={() => setDeckIndex(Math.max(0, lessonChars.findIndex((c) => c === pack.writing![0].char)))}>🃏 生字卡</button></div></div>
      <p>先观察每个字在田字格中的位置，再按正确笔顺临写；本环节只记录观察，不把书写困难判为不理解课文。</p>
      <div className="ct-writing-grid">{pack.writing.map((item) => <button key={item.char} className={writingSeen.has(item.char) ? 'done' : ''} aria-pressed={writingSeen.has(item.char)} onClick={() => visitCharacter(item.char, item.pinyin, true)}><span className="ct-tian-grid"><b>{item.char}</b></span><small>{item.pinyin}</small><i>{writingSeen.has(item.char) ? '✓ 已观察' : '听读'}</i></button>)}</div>
    </section>}

    {!!pack?.writing?.length && <WritingPractice lessonId={lessonId} taskId={writingTaskId} onDone={() => setWritingPracticed(true)} />}

    {pack?.tasks.map((task, index) => {
      const done = tasksDone.has(task.id);
      const material = task.content && !task.scene && <div className="ct-study-content">{task.content.map((line) => <button key={line} onClick={() => speakOnce(line, 'zh', .78)}>{PHRASE_EMOJI[line] && <em aria-hidden="true">{PHRASE_EMOJI[line]}</em>}{line}<small>点读</small></button>)}</div>;
      return <section className={`ct-study-section ct-study-activity ${done ? 'done' : ''}`} key={task.id} data-chinese-narration={`${task.instruction}。${task.completion ? task.completion.frame.replace(/_{2,}/g, '空白') : task.content?.join("。") ?? ""}`}>
        <div className="ct-study-section-head"><span>教材任务 {index + 1}</span><b>{done ? '✓ 已完成' : task.kind === 'choice' ? '理解检查' : '需要完成'}</b></div>
        <h3>{task.instruction}<SpeakChip text={`教材任务。${task.instruction}`} label="听任务" /></h3>
        {task.scene === 'tian-grid' && task.content && <TianGridTask lessonId={lessonId} content={task.content} onDone={() => setTasksDone((value) => new Set(value).add(task.id))} />}
        {task.scene === 'pict-match' && task.content && <PictMatchTask lessonId={lessonId} content={task.content} onDone={() => setTasksDone((value) => new Set(value).add(task.id))} />}
        {task.kind === 'choice' && material}
        {task.kind === 'choice' && <div className="ct-study-options">{chineseOptions(task.options ?? [], `${lessonId}:study:${task.id}`).map((option, index) => <button key={option} aria-label={option} data-key={optionKey(index)} className="ct-keyed-option" onClick={() => {
          if (option === task.answer) {
            setTasksDone((value) => new Set(value).add(task.id));
            speakOnce(task.explanation ?? '回答正确。', 'zh', .84);
            playSfx('correct');
          } else {
            speakOnce('再回到教材要求和课文中找一找。', 'zh', .84);
            playSfx('wrong');
          }
        }}>{option}</button>)}</div>}
        {task.kind !== 'choice' && !task.scene && <div className={`ct-study-workspace${material ? '' : ' ct-study-workspace-solo'}`}>
          {material && <div className="ct-study-material"><h4>学习材料</h4>{material}</div>}
          <div className="ct-study-response">{['read', 'recite', 'pronunciation'].includes(task.kind) && <h4>我的朗读</h4>}{task.completion ? <ChineseGuidedPractice lessonId={lessonId} task={task} onDone={() => setTasksDone(value => new Set(value).add(task.id))} /> : <ObservedPractice showPrompt={false} lessonId={lessonId} taskId={`textbook:${task.id}`} skill={task.kind === 'speak' || task.kind === 'practice' ? 'expression' : 'reading'} prompt={`${task.instruction}。本课材料：${task.content?.join(" ") ?? ""}`} requirement={task.kind === 'read' || task.kind === 'recite' || task.kind === 'pronunciation' ? 'audio' : 'answer'} criteria={task.kind === 'speak' ? ['用自己的内容说了一次', '说清与本课有关的信息'] : task.kind === 'practice' ? ['实际做了要求的动作或操作', '说出自己的发现'] : ['按要求实际朗读或尝试背诵', '说出一处自己注意到的字词或停顿']} onDone={() => setTasksDone((value) => new Set(value).add(task.id))} />}</div>
        </div>}
        {done && task.explanation && <p className="ct-study-explanation">{task.explanation}</p>}
      </section>;
    })}

    {!requiredBridge && <ChineseKnowledgeExtensionStage lessonId={lessonId} onDone={onExtensionDone} />}
{CHINESE_TEXTBOOK_EXTRAS[lessonId] && <ChineseTextbookExtras lessonId={lessonId}/>}
      </ActivityDeck>

    {deckIndex !== null && lessonChars[deckIndex] && <CharCard
      key={lessonChars[deckIndex]}
      char={lessonChars[deckIndex]}
      context={lesson.sourceLines.join('')}
      deck={{ index: deckIndex, total: lessonChars.length, onPrev: () => setDeckIndex((v) => Math.max(0, (v ?? 0) - 1)), onNext: () => setDeckIndex((v) => Math.min(lessonChars.length - 1, (v ?? 0) + 1)) }}
      onClose={() => setDeckIndex(null)}
    />}
  </div>;
}

function Challenge({ lessonId, onComplete }: { lessonId: ChineseLessonId; onComplete: (stars: number) => void }) {
  const lesson = getChineseTextbookLesson(lessonId)!;
  const [index, setIndex, complete, restart] = useRepeatableChineseSequence(lessonId, 'challengeIndex', lesson.questions.length);
  const [picked, setPicked] = useState<number | null>(null);
  const childId = useStore((state) => state.activeChildId);
  const raw = lesson.questions[index];
  const question = raw ? (() => { const options = chineseOptions(raw.options, `${lessonId}:challenge:${index}`); return { ...raw, options, answer: options.indexOf(raw.options[raw.answer]) }; })() : undefined;
  const questionNarration = !question ? '' : question.audio ? `${question.question}。点听真人音节录音，再选择。`
    : `${question.question}。${lesson.kind === 'pinyin' ? '拼音读音请参照真人音节录音或请家人示范。' : ''}`;
  const [helped, setHelped] = useChinesePracticeState(lessonId, 'challengeHelped', false);
  useEffect(() => {
    if (!complete) return;
    const timer = window.setTimeout(() => onComplete(3), 1200);
    return () => window.clearTimeout(timer);
  }, [complete, onComplete]);
  if (complete) return <p className="ct-stage-hint" role="status">挑战已完成，正在保存学习结果…</p>;
  if (!question) return null;

  const right = picked === question.answer;
  return <div className="ct-challenge" data-chinese-leaf data-chinese-narration-key={index} data-chinese-narration={questionNarration}>
    <PracticeAgain complete={complete} onRestart={() => { restart(); setPicked(null); setHelped(false); }} /><div className="ct-challenge-top"><span>迁移挑战</span><b>{index + 1} / {lesson.questions.length}</b></div>
    {question.audio ? <PinyinListeningPractice key={`challenge:${index}`} lessonId={lessonId} customTrials={[{ target: question.audio, choices: question.options, prompt: question.question }]} onDone={() => setIndex((value) => value + 1)} /> : <><div className="ct-question-row"><h3>{question.question}<SpeakChip text={questionNarration} label="再听题目和选项" /></h3></div>
    {/画面|图中|图上|看图/.test(question.question) && <div className="ct-challenge-demo"><img src={lesson.artwork} alt={lesson.artworkAlt} /></div>}
    <div className={`ct-challenge-options ${question.options.every(option => option.length <= 6) ? "ct-options-short" : ""}`}>{question.options.map((option, optionIndex) => <button key={option} aria-label={option} data-key={optionKey(optionIndex)} className={`ct-keyed-option ${picked === optionIndex ? (right ? 'correct' : 'wrong') : ''}`} onClick={() => {
      if (picked !== null) return;
      setPicked(optionIndex);
      const isRight = optionIndex === question.answer;
      playSfx(isRight ? 'correct' : 'wrong');
      speakOnce(isRight ? question.explain : '先回到课文画面和句子中找线索。', 'zh', .88);
      recordChineseEvidence(childId, { lessonId, taskId: `challenge:${index}`, skill: lesson.kind === 'pinyin' ? 'pinyin' : 'reading', level: isRight && !helped ? 'independent' : 'supported', source: 'check', context: 'lesson', note: question.question });
      if (isRight) setTimeout(() => { setPicked(null); setHelped(false); setIndex((value) => value + 1); }, 850);
      else { setHelped(true); setTimeout(() => setPicked(null), 950); }
    }}>{option}</button>)}</div>
    <div className="ct-question-hints"><span>💡 提示</span><button onClick={() => { setHelped(true); speakOnce('回到课文画面和句子中找线索，再想一想。', 'zh', .86); }}>回到课文找线索</button><p role="status">{picked !== null ? right ? question.explain : '再找一找课文里的线索。' : ''}</p></div></>}
  </div>;
}

function ChineseLessonSession() {
  const { lessonId } = useParams();
  const lesson = getChineseTextbookLesson(lessonId);
  const nav = useNavigate();
  const returnToCatalog = () => nav(`/subject/chinese${lessonId ? `?unit=${encodeURIComponent(lessonId)}` : ''}`);
  const activeChildId = useStore((state) => state.activeChildId);
  const collectChars = useStore((state) => state.collectChars);
  // 学习断点（与数学/英语课同思路）：记住本课进行到的阶段，语文目录页据此显示"继续上次学习"；完成本课后清除
  const flowKey = `sfz-chinese-flow-v1:${activeChildId ?? 'guest'}:${lessonId}`;
  const [phase, setPhase] = useState(0);
  const [unlocked, setUnlocked] = useState(0);
  const [visited, setVisited] = useChinesePracticeState(lessonId ?? '', 'visited', new Set<string>());
  const [readDone, setReadDone] = useChinesePracticeState(lessonId ?? '', 'readDone', false);
  const [studyDone, setStudyDone] = useChinesePracticeState(lessonId ?? '', 'studyDone', false);
  const [extensionDone, setExtensionDone] = useChinesePracticeState(lessonId ?? '', 'extensionDone', false);
  const [oralDone, setOralDone] = useChinesePracticeState(lessonId ?? '', 'oralDone', false);
  const [readingExperienceSeen, setReadingExperienceSeen] = useChinesePracticeState(lessonId ?? '', 'readingExperienceSeen', false);
  const [taskDone, setTaskDone] = useChinesePracticeState(lessonId ?? '', 'taskDone', false);
  const [expressionIndex, setExpressionIndex] = useState(0);
  // A new verified attempt is an event even when its persisted completion was already true.
  const [expressionCompletion, setExpressionCompletion] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [flowLoaded, setFlowLoaded] = useState(false);
  const [studyVerified, setStudyVerified] = useState<boolean | null>(null);
  const narration = useChineseTabNarration(contentRef, `${lessonId}:${phase}`);
  const markStudyDone = useCallback(() => setStudyDone(true), [setStudyDone]);
  const markExtensionDone = useCallback(() => setExtensionDone(true), [setExtensionDone]);
  const previous = useRef<{ phase: number; ready: boolean; checked: boolean; expressionCompletion: number } | null>(null);
  const markOralDone = (submitted = false) => { setOralDone(true); if (submitted) setExpressionCompletion(value => value + 1); };
  const markExpressionTaskDone = () => { setTaskDone(true); setExpressionCompletion(value => value + 1); };

  useEffect(() => {
    let savedPhase = 0;
    let savedUnlocked = 0;
    try {
      const saved = JSON.parse(localStorage.getItem(flowKey) ?? '{}') as { phase?: number; unlocked?: number };
      savedPhase = Math.min(4, Math.max(0, Number(saved.phase) || 0));
      savedUnlocked = Math.min(4, Math.max(0, Number(saved.unlocked) || 0));
    } catch { /* 损坏的旧断点忽略 */ }
    setPhase(savedPhase); setUnlocked(Math.max(savedPhase, savedUnlocked)); setFlowLoaded(true); stopChineseReadingAudio();
  }, [lessonId, flowKey]);
  useEffect(() => () => { stopSpeaking(); stopPinyinAudio(); }, []);

  // 断点只在阶段切换时写入（不在恢复时回写，避免把旧值带到新课）
  const saveFlow = (nextPhase: number, nextUnlocked: number) => {
    try { localStorage.setItem(flowKey, JSON.stringify({ phase: nextPhase, unlocked: nextUnlocked })); } catch { /* 存储不可用不影响学习 */ }
  };

  const observations = lesson ? getObservations(lesson.id) : [];
  const observeDone = observations.length > 0 && visited.size === observations.length;
  const teaching = lesson ? getChineseTeaching(lesson.id) : null;
  const phaseDone = [observeDone, readDone, (phase === 2 ? studyVerified === true || (studyDone && unlocked > 2) : studyDone) && (teaching?.bridge !== 'required' || extensionDone), oralDone && ((!teaching?.transfer && lesson?.kind !== 'pinyin') || taskDone), false];
  const checked = flowLoaded && (phase !== 2 || studyVerified !== null);
  // 知识桥参与自动学习顺序；必做教材完成后仍可手动进入真实表达。
  const ready = phaseDone[phase] && (phase !== 2 || extensionDone);
  const availableThrough = Math.max(unlocked, checked && phaseDone[phase] ? Math.min(4, phase + 1) : phase);
  const needsExpressionTask = Boolean(teaching?.transfer || lesson?.kind === 'pinyin');
  const nextExpressionIndex = needsExpressionTask && !taskDone ? Number(Boolean(teaching?.reading))
    : !oralDone ? Number(Boolean(teaching?.reading)) + Number(Boolean(teaching?.transfer)) + Number(lesson?.kind === 'pinyin') : -1;
  useEffect(() => {
    const before = previous.current;
    previous.current = { phase, ready, checked, expressionCompletion };
    if (!checked || !before?.checked || before.phase !== phase || phase >= 4) return;
    const newExpressionCompletion = phase === 3 && before.expressionCompletion !== expressionCompletion;
    // If the final input was done first, return to the remaining required activity.
    if (newExpressionCompletion && !ready && nextExpressionIndex >= 0 && nextExpressionIndex !== expressionIndex) {
      const timer = window.setTimeout(() => setExpressionIndex(nextExpressionIndex), 750);
      return () => window.clearTimeout(timer);
    }
    if (!ready || (before.ready && !newExpressionCompletion)) return;
    const timer = window.setTimeout(() => {
      const next = phase + 1;
      const nextUnlocked = Math.max(unlocked, next);
      setUnlocked(nextUnlocked); setPhase(next);
      try { localStorage.setItem(flowKey, JSON.stringify({ phase: next, unlocked: nextUnlocked })); } catch { /* 不影响学习 */ }
      stopChineseReadingAudio();
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [phase, ready, checked, unlocked, flowKey, expressionCompletion, expressionIndex, nextExpressionIndex]);

  if (!lesson) return <main className="ct-page ct-missing page"><h1>这节课还没有开放</h1><BackButton className="ct-back" onClick={returnToCatalog} aria-label="返回语文目录" /></main>;
  const finish = (stars: number) => {
    clearChinesePracticeState(activeChildId, lesson.id);
    try { localStorage.removeItem(flowKey); } catch { /* 忽略存储不可用 */ }
    const key = `sfz-chinese-textbook-progress:${activeChildId ?? 'guest'}`;
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? '{}');
      // 旧格式为已完成的课程 id 数组；新格式为 { [id]: 星数 }
      const record: Record<string, number> = Array.isArray(stored)
        ? Object.fromEntries((stored as string[]).map((id) => [id, 3]))
        : (stored ?? {});
      record[lesson.id] = Math.max(record[lesson.id] ?? 0, stars);
      localStorage.setItem(key, JSON.stringify(record));
    } catch { /* 存储不可用不影响返回 */ }
    // 按《汉字图鉴卡》规则：完成本课即把会认字 + 写字字收进字卡袋（新字 +1 积分，重复不重复计）
    const pack = getChineseTextbookStudy(lesson.id);
    if (activeChildId && pack) {
      const chars = [...pack.recognize ?? [], ...pack.writing ?? []].map((item) => item.char).filter((c, i, arr) => c && arr.indexOf(c) === i);
      if (chars.length) collectChars(activeChildId, chars);
    }
    if (activeChildId) {
      scheduleReview(activeChildId, { subject: 'chinese', lessonId: lesson.id, title: lesson.title, focus: '按学习证据练习认字、拼读、表达或书写', route: `/chinese-course/${lesson.id}` });
      settleCourseTask(activeChildId, 'chinese', lesson.id, `${stars} 星`);
    }
    nav(`/chinese-course/${lesson.id}?completed=1`, { replace: true });
  };
  const visit = (id: string) => {
    const item = observations.find((entry) => entry.id === id);
    setVisited((value) => new Set(value).add(id));
    if (item) speakOnce(`${item.label}。${item.note}`, 'zh', .86);
    playSfx('pop');
  };

  return <main className="ct-page ct-lesson-page ct-classroom page">
    <header className="ct-lesson-head">
      <BackButton className="ct-back" onClick={returnToCatalog} aria-label="返回语文目录" />
      <div><span>{lesson.unit} · 教材 {lesson.page}</span><h1>{lesson.title}</h1><p>{lesson.subtitle}</p></div>
      <button className="ct-reference-trigger" onClick={() => setReferenceOpen(true)}>教材原页</button>
    </header>
    <nav className="ct-phase-nav" aria-label="本课学习步骤">
      {['看图发现', '完整听读', '教材练习', '真实表达', '迁移挑战'].map((label, index) => <button key={label} disabled={index > availableThrough} aria-current={phase === index ? 'step' : undefined} className={`${phase === index ? 'active' : ''} ${phaseDone[index] || index < unlocked ? 'done' : ''}`} onClick={() => { stopChineseReadingAudio(); const nextUnlocked = Math.max(unlocked, index); setPhase(index); setUnlocked(nextUnlocked); saveFlow(index, nextUnlocked); }}><b>{phaseDone[index] || index < unlocked ? '✓' : index + 1}</b><span>{label}</span></button>)}
    </nav>
    <div className="ct-common-prompt">
      <div><span>{lesson.title}</span><p>{phaseGuides(lesson)[phase]}</p></div>
      <CourseReplayButton disabled={narration.disabled} playbackOwner={narration.playbackOwner} onClick={narration.replay} />
      <LessonHelp title={lesson.title} context={`${lesson.sourceLines.join('。')}。当前环节：${['看图发现', '完整听读', '教材练习', '真实表达', '迁移挑战'][phase]}。${phaseGuides(lesson)[phase]}`} subject="语文" />
    </div>
    <div className="ct-classroom-content" ref={contentRef}>
      {phase === 0 && <WholeStage><div className="ct-observation-workspace" data-chinese-leaf data-chinese-narration={`${lesson.observePrompt}。点击图中标记：${observations.map(item => item.label).join('、')}。`}><Illustration lessonId={lesson.id} visited={visited} onVisit={visit} /><div className="ct-discovery-log">{observations.map(item => <span key={item.id} className={visited.has(item.id) ? 'seen' : ''}>{visited.has(item.id) ? '✓' : '○'} {item.label}</span>)}</div></div></WholeStage>}
      {phase === 1 && <WholeStage><div className="ct-reading-workspace">{lesson.kind !== 'pinyin' && lesson.sourceLines.length <= 4 && <img className="ct-reading-art" src={lesson.artwork} alt={lesson.artworkAlt} />}<ReadingStage key={lesson.id} lessonId={lesson.id} lines={lesson.sourceLines} onDone={() => setReadDone(true)} /></div></WholeStage>}
      {phase === 2 && (lesson.kind === 'pinyin' ? <ChinesePinyinStudyStage key={lesson.id} lessonId={lesson.id} onDone={markStudyDone} onCompletionChange={setStudyVerified} extensionDone={extensionDone} onExtensionDone={markExtensionDone} /> : CHINESE_PINYIN_GARDENS[lesson.id] ? <ChinesePinyinGardenStudyStage key={lesson.id} lessonId={lesson.id} onDone={markStudyDone} onCompletionChange={setStudyVerified} extensionDone={extensionDone} onExtensionDone={markExtensionDone} /> : <TextbookStudyStage key={lesson.id} lessonId={lesson.id} onDone={markStudyDone} onCompletionChange={setStudyVerified} extensionDone={extensionDone} onExtensionDone={markExtensionDone} />)}
      {phase === 3 && <ActivityDeck key={`${lesson.id}:expression`} selectedIndex={expressionIndex} onSelect={setExpressionIndex} labels={[...(teaching!.reading ? ['阅读体验'] : []), ...(teaching!.transfer ? ['迁移实践'] : []), ...(lesson.kind === 'pinyin' ? ['拼音表达'] : []), '口语练习']} completed={[...(teaching!.reading ? [readingExperienceSeen] : []), ...(teaching!.transfer ? [taskDone] : []), ...(lesson.kind === 'pinyin' ? [taskDone] : []), oralDone]}>
        {teaching!.reading && <ReadingExperience lessonId={lesson.id} onDone={() => setReadingExperienceSeen(true)} />}
        {teaching!.transfer && <TransferPractice key={`transfer:${lesson.id}`} lessonId={lesson.id} task={teaching!.transfer} onDone={markExpressionTaskDone} />}
        {lesson.kind === 'pinyin' && <PinyinProductionPractice key={`production:${lesson.id}`} lessonId={lesson.id} onDone={markExpressionTaskDone} />}
        <OralPractice key={`oral:${lesson.id}`} lessonId={lesson.id} onDone={markOralDone} />
      </ActivityDeck>}
      {phase === 4 && <WholeStage><Challenge key={lesson.id} lessonId={lesson.id} onComplete={finish} /></WholeStage>}
    </div>
    {referenceOpen && <Modal onClose={() => setReferenceOpen(false)} controls={<button className="textbook-preview-close" aria-label="关闭教材原页" onClick={() => setReferenceOpen(false)}>×</button>}><TextbookPageViewer pageRange={lesson.page} title={lesson.title} /></Modal>}
  </main>;
}

function ChineseLessonComplete({ lessonId, stars }: { lessonId: ChineseLessonId; stars: number }) {
  const lesson = getChineseTextbookLesson(lessonId)!;
  const nav = useNavigate();
  const returnToCatalog = () => nav(`/subject/chinese?unit=${encodeURIComponent(lessonId)}`);
  return <main className="ct-page ct-lesson-page ct-classroom ct-lesson-complete page">
    <header className="ct-lesson-head">
      <BackButton className="ct-back" onClick={returnToCatalog} aria-label="返回语文目录" />
      <div><span>{lesson.unit} · 教材 {lesson.page}</span><h1>{lesson.title}</h1></div>
    </header>
    <section className="ct-lesson-result" aria-label="语文学习完成">
      <div className="ct-lesson-result-summary">
        <span className="ct-lesson-result-mark" aria-hidden="true">✓</span>
        <h2>本课学习完成！</h2>
        <div className="ct-lesson-result-stars" role="img" aria-label={`${stars} 颗星`}>{'★'.repeat(stars)}</div>
        <p>学习进度和星星已保存，继续加油！</p>
      </div>
      <div className="ct-lesson-result-actions">
        <h3>接下来想做什么？</h3>
        <button type="button" className="ct-primary" onClick={returnToCatalog}>返回语文目录</button>
        <button type="button" onClick={() => nav(`/chinese-course/${lessonId}`, { replace: true })}>再学一次</button>
      </div>
    </section>
  </main>;
}

export default function ChineseTextbookLessonPage() {
  const { lessonId } = useParams();
  const childId = useStore((state) => state.activeChildId);
  const [search] = useSearchParams();
  const lesson = getChineseTextbookLesson(lessonId);
  if (search.get('completed') === '1' && lesson) {
    let stars = 0;
    try {
      const progress = JSON.parse(localStorage.getItem(`sfz-chinese-textbook-progress:${childId ?? 'guest'}`) ?? '{}');
      stars = Array.isArray(progress) ? (progress.includes(lesson.id) ? 3 : 0) : Math.min(3, Number(progress?.[lesson.id]) || 0);
    } catch { /* 无有效完成记录时回到课程 */ }
    return stars > 0 ? <ChineseLessonComplete lessonId={lesson.id} stars={stars} /> : <Navigate to={`/chinese-course/${lesson.id}`} replace />;
  }
  return <ChineseLessonSession key={`${childId ?? 'guest'}:${lessonId}`} />;
}
