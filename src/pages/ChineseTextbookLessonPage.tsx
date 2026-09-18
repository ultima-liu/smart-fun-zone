import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store';
import { playSfx, speakOnce, stopSpeaking } from '../speech';
import { useAsr, readScore } from '../speechAssess';
import { pinyin } from 'pinyin-pro';
import CharCard from '../components/CharCard';
import SpeakChip from '../components/SpeakChip';
import TeacherGuideNote, { narrateAfterCurrent } from '../components/TeacherGuideNote';
import { CHINESE_TEXTBOOK_LESSONS, getChineseTextbookLesson, type ChineseLessonId } from '../content/chineseTextbookCurriculum';
import { getChineseTextbookStudy, type ChineseStudyTask } from '../content/chineseTextbookStudy';
import { optionKey, promptWithOptions } from '../options';
import ChinesePinyinStudyStage from './ChinesePinyinStudyStage';
import ChinesePinyinGardenStudyStage from './ChinesePinyinGardenStudyStage';
import ChineseKnowledgeExtensionStage from './ChineseKnowledgeExtensionStage';
import { CHINESE_PINYIN_GARDENS } from '../content/chinesePinyinGardenStudy';
import { scheduleReview } from '../reviewPlan';
import '../chinese-textbook.css';

/* ============================================================
   聪聪语音导览：不识字的孩子只靠听就能走完一节课（导览条与
   自动播报门控在 components/TeacherGuideNote，语文课本各页共用）。
   ============================================================ */

/** 五个阶段的聪聪引导词：显示与播报同源（做什么 + 完成标志 + 下一步），改一处看听同步 */
function phaseGuides(lesson: NonNullable<ReturnType<typeof getChineseTextbookLesson>>): string[] {
  return [
    `${lesson.teacherIntro} 把图上带数字的地方都点一遍，全部点亮，就点下面亮起来的按钮去点读。`,
    '点一句听一句，再用跟读读给聪聪听。每句话点读过、跟读也过关，就可以继续教材练习。',
    lesson.kind === 'pinyin'
      ? '先看口形和四线格，再练声调、拼读和图文识字。遇到不准的声音，跟老师读，不让机器替你判断发音。每一栏都完成，就继续。'
      : CHINESE_PINYIN_GARDENS[lesson.id]
        ? '把教材园地里的材料逐项点读、比较、回答，再和聪聪一起读短文。全部完成，就继续下一步。'
        : '课文后面的生字、写字和教材任务也要一项一项学完。都做完，知识延伸就会在这里打开。',
    `${lesson.mission} 完成上面的小任务，就可以进入挑战。`,
    '聪聪要考考你。认真听题目，想一想再选答案，答完就记录成绩。',
  ];
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
          <b>{visited.has(item.id) ? '✓' : index + 1}</b><span>{item.label}</span><i className="ct-hotspot-audio" aria-hidden="true">🔊</i>
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
    <details className="ct-textbook-reference">
      <summary><span>教材完整页对照</span><b>{pageRange} · 共 {pages.length} 页</b><i>展开查看</i></summary>
      {viewer}
    </details>
  );
}

type TaskStep = { clue: string; answer: string; options: string[] };

const TASKS: Partial<Record<ChineseLessonId, TaskStep[]>> = {
  china: [
    { clue: '先找到表示所有民族共同称呼的词。', answer: '中华民族', options: ['一家', '中华民族', '是'] },
    { clue: '接着放入表示判断和联系的词。', answer: '是', options: ['我们', '是', '中国人'] },
    { clue: '最后放入表示团结亲近的词。', answer: '一家', options: ['一家', '很多家', '一人'] },
  ],
  motherland: [
    { clue: '红色旗面上有五颗黄色星星。', answer: '五星红旗', options: ['长江', '五星红旗', '黄河', '北京天安门'] },
    { clue: '北京城里的红色城楼。', answer: '北京天安门', options: ['黄河', '北京天安门', '五星红旗', '长江'] },
    { clue: '江水穿过青山，水面开阔。', answer: '长江', options: ['黄河', '五星红旗', '长江', '北京天安门'] },
    { clue: '黄色河水奔腾向前。', answer: '黄河', options: ['长江', '黄河', '北京天安门', '五星红旗'] },
  ],
  schoolchild: [
    { clue: '上学前第一步：把课本和文具放好。', answer: '整理书包', options: ['到校问好', '整理书包', '按时出门'] },
    { clue: '准备好了，下一步要怎样做才不会迟到？', answer: '按时出门', options: ['继续睡觉', '按时出门', '到校问好'] },
    { clue: '来到学校遇见老师和同学。', answer: '到校问好', options: ['到校问好', '转身离开', '把书包放在家里'] },
  ],
  'love-chinese': [
    { clue: '聪聪说：“请看看书上写了什么。”', answer: '读', options: ['读', '写', '讲', '听'] },
    { clue: '聪聪说：“请把自己的名字写下来。”', answer: '写', options: ['听', '讲', '写', '读'] },
    { clue: '聪聪说：“把刚才的事情说给大家听。”', answer: '讲', options: ['讲', '听', '读', '写'] },
    { clue: '同伴正在分享故事，现在应该怎样做？', answer: '听', options: ['写', '读', '听', '讲'] },
  ],
  'heaven-earth-human': [
    { clue: '蓝蓝的天空', answer: '天', options: ['地', '天', '人'] },
    { clue: '脚下的土地', answer: '地', options: ['人', '地', '天'] },
    { clue: '画面中的小朋友', answer: '人', options: ['天', '地', '人'] },
    { clue: '说话的人称自己', answer: '我', options: ['你', '我', '他'] },
    { clue: '说话时，称面前正在交流的同学', answer: '你', options: ['他', '你', '我'] },
  ],
};

function LanguageTask({ lessonId, onDone }: { lessonId: ChineseLessonId; onDone: () => void }) {
  const lesson = getChineseTextbookLesson(lessonId)!;
  const steps = TASKS[lessonId] ?? lesson.taskSteps ?? [];
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [assembled, setAssembled] = useState<string[]>([]);
  const current = steps[step];
  const narratedStep = useRef(-1);
  // 线索与选项一起读：孩子不识字，听完提示还要知道每个选项是什么词才能选；配 🔊 可重听（选项带 A/B/C 编号）。
  // 接续播报：进入阶段时排在聪聪引导词后面（否则 420ms 后引导词会把读题掐掉），答完排在点评后面，不截断任何一条。
  useEffect(() => {
    if (!current || narratedStep.current === step) return;
    narratedStep.current = step;
    narrateAfterCurrent(promptWithOptions(`听提示：${current.clue}`, current.options));
  }, [step]);

  if (!current) return <div className="ct-task-complete"><b>✓ 任务完成</b><p>{lessonId === 'china' ? assembled.join('') + '。' : '你已经把课文里的信息用到新任务里了。'}</p></div>;

  const choose = (option: string) => {
    if (answer) return;
    setAnswer(option);
    const right = option === current.answer;
    playSfx(right ? 'correct' : 'wrong');
    speakOnce(right ? `答对了，${current.answer}。` : '再看看提示，换一个答案试试。', 'zh', .9);
    setTimeout(() => {
      setAnswer(null);
      if (!right) return;
      setAssembled((value) => [...value, option]);
      const next = step + 1;
      setStep(next);
      if (next === steps.length) onDone();
    }, right ? 650 : 850);
  };

  return <div className="ct-language-task">
    <div className="ct-task-progress"><span style={{ width: `${(step / steps.length) * 100}%` }} /><b>{step + 1} / {steps.length}</b></div>
    {assembled.length > 0 && <div className="ct-assembled">{assembled.map((word) => <span key={`${word}-${assembled.indexOf(word)}`}>{word}</span>)}</div>}
    <h3>{current.clue}<SpeakChip text={promptWithOptions(`听提示：${current.clue}`, current.options)} label="再听提示和选项" /></h3>
    <div className="ct-task-options">{current.options.map((option, index) => <button key={option} data-key={optionKey(index)} className={`ct-keyed-option ${answer === option ? (option === current.answer ? 'correct' : 'wrong') : ''}`} onClick={() => choose(option)}>{option}</button>)}</div>
  </div>;
}

/** 跟读收音弹层：录音动画里可以反复重新读，点「完成」后按跟读相似度判定 */
function FollowAlong({ line, onClose, onPass }: { line: string; onClose: () => void; onPass: () => void }) {
  const [attempts, setAttempts] = useState<number[]>([]);
  const [verdict, setVerdict] = useState<'none' | 'again'>('none');
  const onResult = (said: string) => {
    setAttempts((list) => [...list, readScore(line, said)]);
    setVerdict('none');
  };
  const asr = useAsr(onResult);
  useEffect(() => { asr.start(); }, []);
  const best = attempts.length ? Math.max(...attempts) : 0;
  const finish = () => {
    if (best >= 0.5) {
      playSfx('correct');
      speakOnce(best >= 0.85 ? '读得又准又好听！' : '读对啦，声音再响一点就更好了。', 'zh', .86);
      onPass();
    } else {
      playSfx('wrong');
      setVerdict('again');
    }
  };
  return (
    <div className="ct-follow-mask" role="dialog" aria-label={`跟读：${line}`}>
      <div className="ct-follow-card">
        <div className="ct-follow-head"><span>🎤 跟读</span><button onClick={onClose} aria-label="关闭跟读">✕</button></div>
        <b className="ct-follow-line">{line}</b>
        <div className={`ct-follow-mic ${asr.listening ? 'listening' : ''}`} aria-hidden="true">🎙️</div>
        <div className={`ct-follow-wave ${asr.listening ? 'on' : ''}`} aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <p className="ct-follow-state">{asr.listening ? '聪聪在听你读…读得不满意可以点「重新读」' : attempts.length ? '想再读一遍吗？点「重新读」，读好就点「完成」' : '点「重新读」开始，大声读出上面的句子'}</p>
        {attempts.length > 0 && <div className="ct-follow-scores">
          {attempts.map((score, index) => <span key={index} className={score >= 0.5 ? 'ok' : 'no'}>{Math.round(score * 100)} 分</span>)}
          <span className={best >= 0.5 ? 'ok' : 'no'}>最好 {Math.round(best * 100)} 分</span>
        </div>}
        {verdict === 'again' && <p className="ct-follow-try">还没有读准这句哦。点「重新读」再试一次，慢一点也没关系。</p>}
        <div className="ct-follow-ops">
          <button className="ct-follow-retry" onClick={() => asr.start()}>🔄 重新读</button>
          <button className="ct-primary" onClick={finish}>完成，让聪聪判一判</button>
        </div>
      </div>
    </div>
  );
}

const HAN_RE = /[\u4e00-\u9fff]/;

function ReadingStage({ lines, onDone }: { lines: string[]; onDone: () => void }) {
  const [seen, setSeen] = useState<Set<number>>(new Set());
  const [followed, setFollowed] = useState<Set<number>>(new Set());
  const [recording, setRecording] = useState<number | null>(null);
  const [showPinyin, setShowPinyin] = useState(false);
  const [asrSupported] = useState(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    return !!(w.SpeechRecognition ?? w.webkitSpeechRecognition);
  });
  // 每个字的带调拼音（数组与字符一一对应），打开注音开关时才计算
  const pyLines = useMemo(
    () => (showPinyin ? lines.map((line) => pinyin(line, { toneType: 'symbol', type: 'array', nonZh: 'spaced' })) : []),
    [lines, showPinyin],
  );
  const read = (line: string, index: number) => {
    setSeen((value) => new Set(value).add(index));
    speakOnce(line.replace(/[“”]/g, ''), 'zh', .82);
    playSfx('tap');
  };
  const follow = (line: string, index: number) => {
    playSfx('tap');
    if (!asrSupported) {
      // 设备不支持语音识别：听完示范也算读过，不阻断学习
      speakOnce(line.replace(/[“”]/g, ''), 'zh', .82);
      setFollowed((value) => new Set(value).add(index));
      return;
    }
    stopSpeaking();
    setRecording(index);
  };
  useEffect(() => {
    if (seen.size === lines.length && followed.size === lines.length) onDone();
  }, [seen, followed, lines.length, onDone]);
  return <div className="ct-reading-stage">
    <div className="ct-read-guide"><b>点读与跟读</b><span>🔊 点读是听老师读；🎤 跟读是你读给聪聪听，读好由聪聪判一判。</span><button className={showPinyin ? 'ct-py-toggle on' : 'ct-py-toggle'} aria-pressed={showPinyin} onClick={() => setShowPinyin((v) => !v)}>🔤 拼音注音</button><button onClick={() => speakOnce(lines.join(''), 'zh', .8)}>🔊 连起来听</button></div>
    <div className="ct-source-lines">{lines.map((line, index) => <div key={`${line}-${index}`} className="ct-read-line">
      <button className={seen.has(index) ? 'read py-on' : ''} onClick={() => read(line, index)}><i>{seen.has(index) ? '✓' : '🔊'}</i>
        {showPinyin ? <span className="ct-read-py">{Array.from(line).map((ch, chIndex) => HAN_RE.test(ch)
          ? <ruby key={chIndex}>{ch}<rt>{pyLines[index]?.[chIndex] ?? ''}</rt></ruby>
          : <span key={chIndex}>{ch}</span>)}</span>
          : <span>{line}</span>}
      </button>
      <button className={`ct-read-follow ${followed.has(index) ? 'followed' : ''}`} onClick={() => follow(line, index)} aria-label={`跟读：${line}`}>{followed.has(index) ? '✓ 已跟读' : '🎤 跟读'}</button>
    </div>)}</div>
    <p className="ct-stage-hint">已点读 {seen.size} / {lines.length} 句 · 已跟读 {followed.size} / {lines.length} 句。朗读先做到清楚、自然，不用追求速度。</p>
    {recording !== null && <FollowAlong line={lines[recording]} onClose={() => setRecording(null)} onPass={() => { setRecording(null); setFollowed((value) => new Set(value).add(recording)); }} />}
  </div>;
}

const studyTaskActionLabel: Record<ChineseStudyTask['kind'], string> = {
  read: '我已按要求朗读',
  recite: '我已朗读并尝试背诵',
  choice: '选择答案',
  speak: '我已经说一说',
  practice: '我已经动手完成',
  pronunciation: '我已逐组读过',
};

/* ---------- 场景化教材任务：交互要落在任务描述的场景里 ---------- */

/** 田字格找线：点词语卡片，在旁边的田字格上直观高亮对应的中线或四个方位格 */
function TianGridTask({ content, onDone }: { content: string[]; onDone: () => void }) {
  const [found, setFound] = useState<Set<string>>(new Set());
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
function PictMatchTask({ content, onDone }: { content: string[]; onDone: () => void }) {
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const shuffled = useMemo(() => [...content].sort(() => Math.random() - .5), [content]);
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
      <button key={char} className={`ct-pict-pic ${matched.has(char) ? 'done' : ''} ${wrong === char ? 'wrong' : ''}`} disabled={!!picked ? false : true} onClick={() => pickPict(char)} aria-label={`图画：${char}`}><span>{PICT_EMOJI[char] ?? '❓'}</span></button>
    ))}</div>
  </div>;
}

/** 叠词短语的场景点缀 */
const PHRASE_EMOJI: Record<string, string> = { '小小的船': '🛶', '弯弯的月儿': '🌙', '闪闪的星星': '⭐', '蓝蓝的天': '🌤️', '弯弯的小河': '🏞️', '蓝蓝的大海': '🌊' };

/** 教材练习阶段的标题按课型定制（拼音/园地课有专属阶段；这里处理识字、阅读与入学主题课） */
function studyStageCopy(lesson: NonNullable<ReturnType<typeof getChineseTextbookLesson>>) {
  if (lesson.kind === 'pinyin') return ['拼音学习实验室', '听音、辨形、拼读、识字，真正学会这一课'];
  if (CHINESE_PINYIN_GARDENS[lesson.id]) return ['拼音语文园地', '认字、拼音比较、词句运用和共读逐项学'];
  if (lesson.kind === 'orientation') return ['入学主题 · 听读与表达', '听一听、读一读，再说一说你的发现'];
  return ['教材课后学习', '生字、书写和课后练习，一项一项完成'];
}

/* ---------- 说一说的句式支架：点句听聪聪示范，再照着样子补空、换成自己的话说（仅"我上学了"四课的兜底学习用） ---------- */
const SAY_FRAMES: Partial<Record<ChineseLessonId, { frame: string; model: string }[]>> = {
  china: [
    { frame: '我是____，我是中国人。', model: '我是小星，我是中国人。' },
    { frame: '我们的国旗是____。', model: '我们的国旗是五星红旗。' },
    { frame: '中华民族是一家，我们要____。', model: '中华民族是一家，我们要团结友爱。' },
  ],
  motherland: [
    { frame: '我爱____，也爱____。', model: '我爱五星红旗，也爱北京天安门。' },
    { frame: '____和____是祖国的大河。', model: '长江和黄河是祖国的大河。' },
    { frame: '我想去____看一看。', model: '我想去北京天安门看一看。' },
  ],
  schoolchild: [
    { frame: '背上小书包，我要去____。', model: '背上小书包，我要去上学校。' },
    { frame: '我是小学生，我要____、____。', model: '我是小学生，我要爱学习、爱劳动。' },
    { frame: '上学路上，我要做到____。', model: '上学路上，我要做到天天不迟到。' },
  ],
  'love-chinese': [
    { frame: '上课了，我会大声地____。', model: '上课了，我会大声地读课文。' },
    { frame: '同学讲故事时，我会认真地____。', model: '同学讲故事时，我会认真地听。' },
    { frame: '我最想学会____，因为____。', model: '我最想学会讲故事，因为可以把快乐分享给大家。' },
  ],
};

function TextbookStudyStage({ lessonId, onDone }: { lessonId: ChineseLessonId; onDone: () => void }) {
  const lesson = getChineseTextbookLesson(lessonId)!;
  const pack = getChineseTextbookStudy(lessonId);
  const [recognized, setRecognized] = useState<Set<string>>(new Set());
  const [writingSeen, setWritingSeen] = useState<Set<string>>(new Set());
  const [tasksDone, setTasksDone] = useState<Set<string>>(new Set());
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
  const [readSet, setReadSet] = useState<Set<number>>(new Set());
  const [wordSet, setWordSet] = useState<Set<string>>(new Set());
  const [saidSet, setSaidSet] = useState<Set<number>>(new Set());
  const [saidDone, setSaidDone] = useState(false);
  const sayFrames = SAY_FRAMES[lesson.id] ?? lesson.keywords.map((word) => ({ frame: word, model: word }));
  const allSaid = sayFrames.length > 0 && saidSet.size === sayFrames.length;

  const recognizeDone = !pack?.recognize?.length || recognized.size === pack.recognize.length;
  const writingDone = !pack?.writing?.length || writingSeen.size === pack.writing.length;
  const activitiesDone = !pack?.tasks.length || tasksDone.size === pack.tasks.length;
  const readAllDone = !lesson.sourceLines.length || readSet.size === lesson.sourceLines.length;
  const wordsAllDone = !lesson.keywords.length || wordSet.size === lesson.keywords.length;
  const allDone = pack ? recognizeDone && writingDone && activitiesDone : readAllDone && wordsAllDone && saidDone;

  useEffect(() => {
    if (allDone) onDone();
  }, [allDone, onDone]);

  const visitCharacter = (char: string, pinyin: string, writing: boolean) => {
    (writing ? setWritingSeen : setRecognized)((value) => new Set(value).add(char));
    speakOnce(`${char}，${pinyin}`, 'zh', .72);
    playSfx('tap');
  };

  const finishTask = (task: ChineseStudyTask) => {
    setTasksDone((value) => new Set(value).add(task.id));
    speakOnce([task.instruction, ...(task.content ?? [])].join('。'), 'zh', .8);
    playSfx('correct');
  };

  return <div className="ct-textbook-study">
    {!pack && <>
      <section className="ct-study-section">
        <div className="ct-study-section-head"><span>朗读课文<SpeakChip text="朗读课文。先听老师读，再跟着大声读一遍，读过一句就会点亮。" /></span><b>{readSet.size} / {lesson.sourceLines.length} 句</b></div>
        <p>逐句点读：先听老师读，再跟着大声读一遍，读过一句就会点亮。</p>
        <div className="ct-study-content">{lesson.sourceLines.map((line, index) => <button key={index} className={readSet.has(index) ? 'done' : ''} onClick={() => { speakOnce(line, 'zh', .8); setReadSet((value) => new Set(value).add(index)); playSfx('tap'); }}>{line}<small>{readSet.has(index) ? '✓ 已读' : '点读'}</small></button>)}</div>
      </section>
      {lesson.keywords.length > 0 && <section className="ct-study-section">
        <div className="ct-study-section-head"><span>词语积累<SpeakChip text="词语积累。点一个词语听一听，再大声读出来。" /></span><b>{wordSet.size} / {lesson.keywords.length}</b></div>
        <p>点一个词语听一听，再大声读出来。</p>
        <div className="ct-recognize-grid ct-word-grid">{lesson.keywords.map((word) => <button key={word} className={wordSet.has(word) ? 'done' : ''} aria-pressed={wordSet.has(word)} onClick={() => { speakOnce(word, 'zh', .74); setWordSet((value) => new Set(value).add(word)); playSfx('tap'); }}><b>{word}</b><i>{wordSet.has(word) ? '✓' : '点读'}</i></button>)}</div>
      </section>}
      <section className={`ct-study-section ct-study-activity ${saidDone ? 'done' : ''}`}>
        <div className="ct-study-section-head"><span>说一说<SpeakChip text="说一说。点句子先听聪聪示范，再照着样子把空补上，大声说给家人听。三句都说过了，就可以点下面的按钮。" /></span><b>{saidDone ? '✓ 已完成' : `${saidSet.size} / ${sayFrames.length} 句`}</b></div>
        <h3>点句子听示范，把空补上，说给家人听</h3>
        <p className="ct-study-explanation">聪聪先示范一遍；你照着样子，换成自己的话大声说出来。三句都说过了，就能完成这一步。</p>
        <div className="ct-study-content">{sayFrames.map((item, index) => <button key={item.frame} className={saidSet.has(index) ? 'done' : ''} onClick={() => { speakOnce(item.model, 'zh', .8); setSaidSet((value) => new Set(value).add(index)); playSfx('tap'); }}>{item.frame}<small>{saidSet.has(index) ? '✓ 已说' : '听示范'}</small></button>)}</div>
        <button className="ct-study-action" disabled={saidDone || !allSaid} onClick={() => { setSaidDone(true); speakOnce('你说得真好！', 'zh', .84); playSfx('correct'); }}>{saidDone ? '✓ 我已经说完了' : allSaid ? '我说完了' : `还说 ${sayFrames.length - saidSet.size} 句，就能完成`}</button>
      </section>
    </>}

    {pack?.recognize && <section className="ct-study-section">
      <div className="ct-study-section-head"><span>会认的字<SpeakChip text={`会认的字。${pack.pageLabel}。逐个点读，注意字形、拼音和课文中的意思。`} /></span><div className="ct-study-head-ops"><b>{recognized.size} / {pack.recognize.length}</b><button className="ct-study-deck" onClick={() => setDeckIndex(0)}>🃏 生字卡</button></div></div>
      <p>{pack.pageLabel}。逐个点读，注意字形、拼音和课文中的意思。</p>
      <div className="ct-recognize-grid">{pack.recognize.map((item) => <button key={item.char} className={recognized.has(item.char) ? 'done' : ''} aria-pressed={recognized.has(item.char)} onClick={() => visitCharacter(item.char, item.pinyin, false)}><b>{item.char}</b><span>{item.pinyin}</span><i>{recognized.has(item.char) ? '✓' : '点读'}</i></button>)}</div>
    </section>}

    {pack?.writing && <section className="ct-study-section">
      <div className="ct-study-section-head"><span>田字格写字<SpeakChip text="田字格写字。先观察每个字在田字格中的位置，再按正确笔顺临写。" /></span><div className="ct-study-head-ops"><b>{writingSeen.size} / {pack.writing.length}</b><button className="ct-study-deck" onClick={() => setDeckIndex(Math.max(0, lessonChars.findIndex((c) => c === pack.writing![0].char)))}>🃏 生字卡</button></div></div>
      <p>先观察每个字在田字格中的位置，再按正确笔顺临写；本环节只记录观察，不把书写困难判为不理解课文。</p>
      <div className="ct-writing-grid">{pack.writing.map((item) => <button key={item.char} className={writingSeen.has(item.char) ? 'done' : ''} aria-pressed={writingSeen.has(item.char)} onClick={() => visitCharacter(item.char, item.pinyin, true)}><span className="ct-tian-grid"><b>{item.char}</b></span><small>{item.pinyin}</small><i>{writingSeen.has(item.char) ? '✓ 已观察' : '听读'}</i></button>)}</div>
    </section>}

    {pack?.tasks.map((task, index) => {
      const done = tasksDone.has(task.id);
      return <section className={`ct-study-section ct-study-activity ${done ? 'done' : ''}`} key={task.id}>
        <div className="ct-study-section-head"><span>教材任务 {index + 1}</span><b>{done ? '✓ 已完成' : task.kind === 'choice' ? '理解检查' : '需要完成'}</b></div>
        <h3>{task.instruction}<SpeakChip text={`教材任务。${task.instruction}`} label="听任务" /></h3>
        {task.scene === 'tian-grid' && task.content && <TianGridTask content={task.content} onDone={() => setTasksDone((value) => new Set(value).add(task.id))} />}
        {task.scene === 'pict-match' && task.content && <PictMatchTask content={task.content} onDone={() => setTasksDone((value) => new Set(value).add(task.id))} />}
        {task.content && !task.scene && <div className="ct-study-content">{task.content.map((line) => <button key={line} onClick={() => speakOnce(line, 'zh', .78)}>{PHRASE_EMOJI[line] && <em aria-hidden="true">{PHRASE_EMOJI[line]}</em>}{line}<small>点读</small></button>)}</div>}
        {task.kind === 'choice' && <div className="ct-study-options">{task.options?.map((option, index) => <button key={option} data-key={optionKey(index)} className="ct-keyed-option" disabled={done} onClick={() => {
          if (option === task.answer) {
            setTasksDone((value) => new Set(value).add(task.id));
            speakOnce(task.explanation ?? '回答正确。', 'zh', .84);
            playSfx('correct');
          } else {
            speakOnce('再回到教材要求和课文中找一找。', 'zh', .84);
            playSfx('wrong');
          }
        }}>{option}</button>)}</div>}
        {task.kind !== 'choice' && !task.scene && <button className="ct-study-action" disabled={done} onClick={() => finishTask(task)}>{done ? '✓ 这一项已完成' : studyTaskActionLabel[task.kind]}</button>}
        {done && task.explanation && <p className="ct-study-explanation">{task.explanation}</p>}
      </section>;
    })}

    <div className={`ct-study-status ${allDone ? 'done' : ''}`}><b>{allDone ? '✓ 教材课后内容已完成' : '还不能跳过'}</b><span>{allDone ? (pack ? '生字、书写与教材任务都已记录。' : '朗读、词语和表达都完成了。') : (pack ? '请完成本页列出的教材内容，再进入动手任务。' : '把课文读一读、词语点一点，再说一说。')}</span></div>

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
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [wrong, setWrong] = useState(0);
  const question = lesson.questions[index];
  const narratedIndex = useRef(-1);
  // 题干与选项一起读：孩子不识字也能听题作答；配 🔊 重听（选项带 A/B/C 编号）。
  // 接续播报：进入阶段时排在聪聪引导词后面，答完排在点评后面，不截断任何一条。
  useEffect(() => {
    if (!question || narratedIndex.current === index) return;
    narratedIndex.current = index;
    narrateAfterCurrent(promptWithOptions(`听题目：${question.question}`, question.options));
  }, [index]);
  if (!question) {
    const stars = wrong === 0 ? 3 : wrong <= 2 ? 2 : 1;
    return <div className="ct-challenge-done"><span className="ct-challenge-stars" aria-hidden="true">{Array.from({ length: stars }, (_, i) => <i key={i} />)}</span><h3>本课完成 · {stars} 颗星</h3><p>{stars === 3 ? '一次全对，你真正会用这一课了！' : '再读一遍课文，下次冲刺 3 颗星。'}</p><button onClick={() => onComplete(stars)}>记录成绩，返回目录</button></div>;
  }

  const right = picked === question.answer;
  return <div className="ct-challenge">
    <div className="ct-challenge-top"><span>迁移挑战</span><b>{index + 1} / {lesson.questions.length}</b></div>
    <h3>{question.question}<SpeakChip text={promptWithOptions(`听题目：${question.question}`, question.options)} label="再听题目和选项" /></h3>
    <div className="ct-challenge-options">{question.options.map((option, optionIndex) => <button key={option} data-key={optionKey(optionIndex)} className={`ct-keyed-option ${picked === optionIndex ? (right ? 'correct' : 'wrong') : ''}`} onClick={() => {
      if (picked !== null) return;
      setPicked(optionIndex);
      const isRight = optionIndex === question.answer;
      playSfx(isRight ? 'correct' : 'wrong');
      speakOnce(isRight ? question.explain : '先回到课文画面和句子中找线索。', 'zh', .88);
      if (isRight) setTimeout(() => { setPicked(null); setIndex((value) => value + 1); }, 850);
      else { setWrong((value) => value + 1); setTimeout(() => setPicked(null), 950); }
    }}>{option}</button>)}</div>
    {picked !== null && <p className={right ? 'good' : 'try'}>{right ? question.explain : '这个答案还不能说明课文的意思，再想一想。'}</p>}
  </div>;
}

export default function ChineseTextbookLessonPage() {
  const { lessonId } = useParams();
  const lesson = getChineseTextbookLesson(lessonId);
  const nav = useNavigate();
  const activeChildId = useStore((state) => state.activeChildId);
  const collectChars = useStore((state) => state.collectChars);
  const applyPoints = useStore((state) => state.applyPoints);
  const [phase, setPhase] = useState(0);
  const [unlocked, setUnlocked] = useState(0);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [readDone, setReadDone] = useState(false);
  const [studyDone, setStudyDone] = useState(false);
  const [extensionDone, setExtensionDone] = useState(false);
  const [taskDone, setTaskDone] = useState(false);
  const saidPhaseDone = useRef(-1);

  useEffect(() => {
    setPhase(0); setUnlocked(0); setVisited(new Set()); setReadDone(false); setStudyDone(false); setExtensionDone(false); setTaskDone(false); saidPhaseDone.current = -1; stopSpeaking();
  }, [lessonId]);
  useEffect(() => () => stopSpeaking(), []);

  const lessonIndex = useMemo(() => CHINESE_TEXTBOOK_LESSONS.findIndex((item) => item.id === lesson?.id), [lesson]);
  if (!lesson) return <main className="ct-page ct-missing page"><h1>这节课还没有开放</h1><button onClick={() => nav('/subject/chinese')}>返回语文目录</button></main>;

  const observations = getObservations(lesson.id);
  const observeDone = observations.length > 0 && visited.size === observations.length;
  const phaseDone = [observeDone, readDone, studyDone && extensionDone, taskDone, false];
  // 完成确认播报：当前阶段的必做项全部完成时，口头告诉孩子"可以按下面的按钮了"（每阶段只说一次）。
  // 用接续播报：刚触发完成的那条内容语音（最后点亮的卡片、最后一句点评）要先播完，完成提示排在它后面。
  useEffect(() => {
    if (phase < 4 && phaseDone[phase] && saidPhaseDone.current !== phase) {
      saidPhaseDone.current = phase;
      playSfx('correct');
      narrateAfterCurrent('这一步全部完成，真棒！点下面亮起来的按钮，继续下一步。');
    }
  }, [phase, observeDone, readDone, studyDone, extensionDone, taskDone]);
  const goNext = () => { const next = Math.min(4, phase + 1); setUnlocked((value) => Math.max(value, next)); setPhase(next); stopSpeaking(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const finish = (stars: number) => {
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
      // 完成本课计入「练习达标」，供每日/每周课程任务统计（与数学、英语同口径）
      applyPoints(activeChildId, 1, '练习达标', `prac:${lesson.id}:${new Date().toDateString()}`);
      scheduleReview(activeChildId, { subject: 'chinese', lessonId: lesson.id, title: lesson.title, focus: lesson.mission, route: `/chinese-course/${lesson.id}` });
    }
    nav('/subject/chinese');
  };
  const visit = (id: string) => {
    const item = observations.find((entry) => entry.id === id);
    setVisited((value) => new Set(value).add(id));
    if (item) speakOnce(`${item.label}。${item.note}`, 'zh', .86);
    playSfx('pop');
  };

  return <main className="ct-page ct-lesson-page page">
    <header className="ct-lesson-head">
      <button className="ct-back" onClick={() => nav('/subject/chinese')} aria-label="返回语文目录">←</button>
      <div><span>{lesson.unit} · 教材 {lesson.page}</span><h1>{lesson.title}</h1><p>{lesson.subtitle}</p></div>
    </header>
    <nav className="ct-phase-nav" aria-label="本课学习步骤">
      {['看图发现', '逐句点读', '教材练习', '动手表达', '迁移挑战'].map((label, index) => <button key={label} disabled={index > unlocked} className={`${phase === index ? 'active' : ''} ${index < unlocked ? 'done' : ''}`} onClick={() => { stopSpeaking(); setPhase(index); }}><b>{index < unlocked ? '✓' : index + 1}</b><span>{label}</span></button>)}
    </nav>
    {/* 进入每一页（课 × 阶段）都自动播报一次引导：key 带上课 id，上一课/下一课即使阶段号相同也会重讲 */}
    <TeacherGuideNote key={`${lesson.id}:${phase}`} text={phaseGuides(lesson)[phase]} />

    {phase === 0 && <section className="ct-stage"><div className="ct-stage-title"><span>先观察，再开口</span><h2>{lesson.observePrompt}</h2></div><Illustration lessonId={lesson.id} visited={visited} onVisit={visit} /><TextbookPageViewer key={lesson.id} pageRange={lesson.page} title={lesson.title} /><div className="ct-discovery-log">{observations.map((item) => <span key={item.id} className={visited.has(item.id) ? 'seen' : ''}>{visited.has(item.id) ? '✓' : '○'} {item.label}</span>)}</div><button className="ct-primary" disabled={!phaseDone[0]} onClick={goNext}>我发现了全部线索，去点读 →</button></section>}
    {phase === 1 && <section className="ct-stage"><div className="ct-stage-title"><span>{lesson.kind === 'pinyin' ? '本课拼音朗读' : lesson.kind === 'garden' ? '园地读一读' : '课本原文'}</span><h2>眼睛看文字，耳朵听声音</h2></div><ReadingStage key={lesson.id} lines={lesson.sourceLines} onDone={() => setReadDone(true)} /><div className="ct-keywords"><b>课文重点词</b>{lesson.keywords.map((word) => <button key={word} onClick={() => speakOnce(word, 'zh', .76)}>{word}<small>点读</small></button>)}</div><button className="ct-primary" disabled={!phaseDone[1]} onClick={goNext}>正文已点读并跟读，继续教材练习 →</button></section>}
    {phase === 2 && <section className="ct-stage">
      <div className="ct-stage-title"><span>{studyStageCopy(lesson)[0]}</span><h2>{studyStageCopy(lesson)[1]}</h2></div>
      {lesson.id === 'metal-wood-water-fire-earth' && <><div className="ct-knowledge-divider"><span>第一次学写字，先懂占格</span><h3>先完成田字格小工坊<SpeakChip text="第一次学写字，先懂占格。先完成田字格小工坊，学位置与结构，再观察本课的范字。" /></h3><p>先学位置与结构，再观察本课的田字格范字。</p></div><ChineseKnowledgeExtensionStage key={lesson.id} lessonId={lesson.id} onDone={() => setExtensionDone(true)} /></>}
      {lesson.kind === 'pinyin' ? <ChinesePinyinStudyStage key={lesson.id} lessonId={lesson.id} onDone={() => setStudyDone(true)} /> : CHINESE_PINYIN_GARDENS[lesson.id] ? <ChinesePinyinGardenStudyStage key={lesson.id} lessonId={lesson.id} onDone={() => setStudyDone(true)} /> : <TextbookStudyStage key={lesson.id} lessonId={lesson.id} onDone={() => setStudyDone(true)} />}
      {lesson.id !== 'metal-wood-water-fire-earth' && <><div className="ct-knowledge-divider"><span>从教材走向生活</span><h3>本课知识延伸<SpeakChip text="本课知识延伸。学完教材任务，再看一个新方法，并在不同情境里用一次。" /></h3><p>学完教材任务，再看一个新方法，并在不同情境里用一次。</p></div>{studyDone ? <ChineseKnowledgeExtensionStage key={lesson.id} lessonId={lesson.id} onDone={() => setExtensionDone(true)} /> : <div className="ct-knowledge-lock">教材任务完成后，知识延伸就会在这里打开。</div>}</>}
      <button className="ct-primary" disabled={!phaseDone[2]} onClick={goNext}>{phaseDone[2] ? '教材与知识延伸已完成，去动手表达 →' : '学完教材与知识延伸，去动手表达 →'}</button>
    </section>}
    {phase === 3 && <section className="ct-stage"><div className="ct-stage-title"><span>不是“看过了”</span><h2>{lesson.mission}</h2></div><LanguageTask key={lesson.id} lessonId={lesson.id} onDone={() => setTaskDone(true)} /><button className="ct-primary" disabled={!phaseDone[3]} onClick={goNext}>关键任务完成，进入挑战 →</button></section>}
    {phase === 4 && <section className="ct-stage"><Challenge lessonId={lesson.id} onComplete={finish} /></section>}

    <footer className="ct-lesson-footer">
      <button disabled={lessonIndex <= 0} onClick={() => nav(`/chinese-course/${CHINESE_TEXTBOOK_LESSONS[lessonIndex - 1]?.id}`)}>← 上一课</button>
      <span>{lessonIndex + 1} / {CHINESE_TEXTBOOK_LESSONS.length}</span>
      <button disabled={lessonIndex >= CHINESE_TEXTBOOK_LESSONS.length - 1} onClick={() => nav(`/chinese-course/${CHINESE_TEXTBOOK_LESSONS[lessonIndex + 1]?.id}`)}>下一课 →</button>
    </footer>
  </main>;
}
