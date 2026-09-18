import { useEffect, useRef, useState } from 'react';
import { playSfx, speakOnce } from '../speech';
import SpeakChip from '../components/SpeakChip';
import { narrateAfterCurrent } from '../components/TeacherGuideNote';
import { CHINESE_KNOWLEDGE_EXTENSION, CHINESE_KNOWLEDGE_REVISIT_FROM } from '../content/chineseKnowledgeExtension';
import { getChineseTextbookLesson } from '../content/chineseTextbookCurriculum';
import { optionKey, promptWithOptions } from '../options';

const NUMBER_GUIDE = {
  一: { lines: [52], note: '一笔横画靠近横中线，左右两端留空。' },
  二: { lines: [34, 73], note: '两横分在上、下位置；下面的一横稍长，不能挤在一处。' },
  三: { lines: [27, 51, 79], note: '三横从上到下，间距大致匀称；底横最长。' },
  上: { lines: [41, 77], note: '竖画靠近竖中线，短横在上，长横在下。' },
} as const;
type NumberGuideKey = keyof typeof NUMBER_GUIDE;
const STRUCTURES = [
  { name: '独体', sample: '上', parts: '笔画在同一个整体中，先看中心与四边留白。' },
  { name: '左右', sample: '河', parts: '左边氵、右边可，两边相让，不能各占满一格。' },
  { name: '上下', sample: '草', parts: '上面艹、下面早，上下匀称，不能顶满格边。' },
] as const;

function TianGridWorkshop({ onDone }: { onDone: () => void }) {
  const [part, setPart] = useState(0);
  const [locations, setLocations] = useState<Set<string>>(new Set());
  const [numberSeen, setNumberSeen] = useState<Set<NumberGuideKey>>(new Set());
  const [number, setNumber] = useState<NumberGuideKey>('一');
  const [structureSeen, setStructureSeen] = useState<Set<string>>(new Set());
  const [structure, setStructure] = useState<string>('独体');
  const [answers, setAnswers] = useState<(string | null)[]>([null, null, null]);
  const lineAnswers = ['竖中线', '下面的一横', '左右结构'];
  const complete = locations.size === 6 && numberSeen.size === 4 && structureSeen.size === 3
    && answers.every((answer, index) => answer === lineAnswers[index]);
  useEffect(() => { if (complete) onDone(); }, [complete, onDone]);

  const mark = (name: string) => {
    setLocations((value) => new Set(value).add(name));
    speakOnce(`${name}。横中线分上下，竖中线分左右。`, 'zh', .82);
    playSfx('tap');
  };
  const choose = (choice: string) => {
    setAnswers((value) => value.map((answer, index) => index === part ? choice : answer));
    playSfx(choice === lineAnswers[part] ? 'correct' : 'wrong');
    speakOnce(choice === lineAnswers[part] ? '找对了！再看看这个例子。' : '先回到画面中观察位置，再试一次。', 'zh', .84);
  };
  const question = [
    ['哪条线帮助看清字的左右位置？', ['竖中线', '横中线', '格子外框']],
    ['写“二”时，哪一横通常稍长？', ['下面的一横', '上面的一横', '两横都不写']],
    ['“河”左边氵、右边可，属于哪一类？', ['左右结构', '上下结构', '独体字']],
  ] as const;
  const nextReady = part === 0 ? locations.size === 6 && answers[0] === lineAnswers[0]
    : part === 1 ? numberSeen.size === 4 && answers[1] === lineAnswers[1]
      : structureSeen.size === 3 && answers[2] === lineAnswers[2];

  return <div className="ct-ktrail ct-ktrail--workshop" data-knowledge="tian-grid">
    <div className="ct-ktrail-head"><span>本册书写知识的第一次相遇</span><h3>田字格小工坊</h3><p>先认位置，再看本课的汉字数字，最后认识常见的字形结构。这里教观察，不批改触屏书写。</p></div>
    <div className="ct-ktrail-tabs">{['① 找线和小格', '② 汉字数字占格', '③ 字形三类'].map((label, index) => <span key={label} className={index === part ? 'active' : index < part ? 'done' : ''}>{index < part ? '✓ ' : ''}{label}</span>)}</div>

    {part === 0 && <div className="ct-ktian-section">
      <div className="ct-ktian-copy"><h4>两条中线，四个小格</h4><p>横中线把田字格分成上下；竖中线把它分成左右。直接点格子里的线和四个位置，认全以后再回答。</p><div className="ct-ktian-callout">口诀：田字格，四方方；横线分上下，竖线分左右。</div><small>已找到 {locations.size} / 6 处</small></div>
      <div className="ct-ktian-board" aria-label="可点击的田字格位置">
        {['左上格', '右上格', '左下格', '右下格'].map((name) => <button key={name} className={locations.has(name) ? 'seen' : ''} aria-label={name} onClick={() => mark(name)}>{name}</button>)}
        <button className={`ct-ktian-midline ct-ktian-midline--h ${locations.has('横中线') ? 'seen' : ''}`} aria-label="横中线" onClick={() => mark('横中线')}><span>横中线</span></button>
        <button className={`ct-ktian-midline ct-ktian-midline--v ${locations.has('竖中线') ? 'seen' : ''}`} aria-label="竖中线" onClick={() => mark('竖中线')}><span>竖中线</span></button>
      </div>
    </div>}

    {part === 1 && <div className="ct-ktian-section">
      <div className="ct-ktian-copy"><h4>一、二、三、上：先看范字再下笔</h4><p>“一、二、三”是汉字数字，不是数学课写的阿拉伯数字 1、2、3。本课要求写一、二、三、上；四和五先认读，不在这里强制练写。</p><div className="ct-ktian-callout">口诀：一横近中线，二横上下看，三横间距匀；上字竖居中。</div><div className="ct-ktian-number-pick">{(Object.keys(NUMBER_GUIDE) as NumberGuideKey[]).map((key) => <button key={key} className={number === key ? 'active' : ''} onClick={() => { setNumber(key); setNumberSeen((value) => new Set(value).add(key)); speakOnce(NUMBER_GUIDE[key].note, 'zh', .82); playSfx('tap'); }}>{key}</button>)}</div><small>已观察 {numberSeen.size} / 4 个范字</small></div>
      <div className="ct-ktian-demo"><svg viewBox="0 0 120 120" role="img" aria-label={`${number}在田字格中的占格示意`}><rect x="4" y="4" width="112" height="112" /><path className="guide" d="M60 4v112M4 60h112" />{number === '上' ? <><path className="stroke" d="M60 22v58M60 42h32M27 82h68" /></> : NUMBER_GUIDE[number].lines.map((y, index) => <path key={y} className="stroke" d={`M${number === '一' ? 26 : index === NUMBER_GUIDE[number].lines.length - 1 ? 22 : 34} ${y} H${number === '一' ? 94 : index === NUMBER_GUIDE[number].lines.length - 1 ? 98 : 86}`} />)}</svg><b>{number}</b><p>{NUMBER_GUIDE[number].note}</p><small>上留天、下留地；左右两边有空隙。不同字体和教师范写可略有差别。</small></div>
    </div>}

    {part === 2 && <div className="ct-ktian-section">
      <div className="ct-ktian-copy"><h4>先认识三种常见占格方式</h4><p>独体字看整体居中；左右结构看两边相让；上下结构看上下匀称。以后还有“回”这样的包围结构，不能把所有汉字硬分成这三类。</p><div className="ct-ktian-callout">口诀：独体居中，左右相让，上下匀称；四边留白，别顶格边。</div><small>已比较 {structureSeen.size} / 3 类</small></div>
      <div className="ct-ktian-structures">{STRUCTURES.map((item) => <button key={item.name} className={structure === item.name ? 'active' : ''} onClick={() => { setStructure(item.name); setStructureSeen((value) => new Set(value).add(item.name)); speakOnce(`${item.name}。${item.parts}`, 'zh', .84); playSfx('tap'); }}><span className="ct-tian-grid"><b>{item.sample}</b></span><strong>{item.name}</strong><small>{item.parts}</small>{structureSeen.has(item.name) && <i>✓ 已观察</i>}</button>)}</div>
    </div>}

    <div className="ct-ktrail-check"><span>动脑试一试</span><h4>{question[part][0]}</h4><div>{question[part][1].map((choice, index) => <button key={choice} data-key={optionKey(index)} className={`ct-keyed-option ${answers[part] === choice ? (choice === lineAnswers[part] ? 'correct' : 'wrong') : ''}`} onClick={() => choose(choice)}>{choice}</button>)}</div>{answers[part] && <p>{answers[part] === lineAnswers[part] ? '✓ 看懂了位置与结构。' : '再看示意图，不用急着猜。'}</p>}</div>
    {part === 2 && <aside className="ct-ktian-culture"><span>回到这首韵文</span><h4>金木水火土：数序、自然与时空</h4><p>“一二三四五”是数序；“金木水火土”是古人描述世界的传统分类，不是现代科学说世界只由这五样组成。“天地分上下”说空间，“日月照今古”带我们想到时间。</p><small>记忆：数一数，认自然；看上下，想古今。</small></aside>}
    {part < 2 ? <button className="ct-ktrail-next" disabled={!nextReady} onClick={() => { setPart((value) => value + 1); playSfx('pop'); }}>继续认识 {part === 0 ? '汉字数字' : '字形三类'} →</button> : <div className={`ct-ktrail-status ${complete && nextReady ? 'done' : ''}`}>{complete && nextReady ? '✓ 田字格小工坊已完成' : '观察三类字形并回答正确，才算学会这一步'}</div>}
  </div>;
}

export default function ChineseKnowledgeExtensionStage({ lessonId, onDone }: { lessonId: string; onDone: () => void }) {
  const card = CHINESE_KNOWLEDGE_EXTENSION[lessonId];
  const [explained, setExplained] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const checkSaid = useRef(false);
  const complete = explained && answer === card?.answer;
  useEffect(() => { if (complete) onDone(); }, [complete, onDone]);
  // 换个情境试一试的题目与选项自动播报（与动手表达/迁移挑战同款，孩子不识字也能听题作答）；
  // 接在当前语音后面不截断；ref 防住 StrictMode 双执行造成的重复排队
  useEffect(() => {
    if (!card || lessonId === 'metal-wood-water-fire-earth' || checkSaid.current) return;
    checkSaid.current = true;
    narrateAfterCurrent(promptWithOptions(`换个情境试一试：${card.prompt}`, card.options));
  }, [lessonId]);
  if (!card) return <div className="ct-ktrail">本课知识桥尚未整理。</div>;
  if (lessonId === 'metal-wood-water-fire-earth') return <TianGridWorkshop onDone={onDone} />;
  const fromLesson = CHINESE_KNOWLEDGE_REVISIT_FROM[lessonId] ? getChineseTextbookLesson(CHINESE_KNOWLEDGE_REVISIT_FROM[lessonId]) : null;

  return <div className="ct-ktrail" data-knowledge={lessonId}>
    <div className="ct-ktrail-head"><span>{card.mode === 'first' ? '本课新知识 · ' : '再次用到 · '}{card.domain}</span><h3>{card.title}</h3><p>{fromLesson ? `从《${fromLesson.title}》学过的方法再次出发，` : ''}把这一课的发现带到新情境中，不重复课后原题。</p></div>
    <div className="ct-ktrail-body"><div><small>先懂方法</small><p>{card.insight}</p></div><div><small>看一个例子</small><p>{card.example}</p></div><div className="ct-ktrail-mnemonic"><small>记忆口诀</small><p>{card.mnemonic}</p></div></div>
    <button className={`ct-ktrail-explain ${explained ? 'done' : ''}`} onClick={() => { setExplained(true); speakOnce(`${card.insight}。${card.example}。${card.mnemonic}`, 'zh', .83); playSfx('tap'); }}>{explained ? '✓ 已听方法，可以试一试' : '🔊 听聪聪讲方法'}</button>
    <div className="ct-ktrail-check"><span>换个情境试一试</span><h4>{card.prompt}<SpeakChip text={promptWithOptions(`换个情境试一试：${card.prompt}`, card.options)} label="再听题目和选项" /></h4><div>{card.options.map((choice, index) => <button key={choice} data-key={optionKey(index)} className={`ct-keyed-option ${answer === choice ? (choice === card.answer ? 'correct' : 'wrong') : ''}`} onClick={() => { setAnswer(choice); playSfx(choice === card.answer ? 'correct' : 'wrong'); speakOnce(choice === card.answer ? card.feedback : '看看上面的例子和口诀，再选一次。', 'zh', .84); }}>{choice}</button>)}</div>{answer && <p>{answer === card.answer ? card.feedback : '再看方法卡，不着急。'}</p>}</div>
    <div className={`ct-ktrail-status ${complete ? 'done' : ''}`}>{complete ? '✓ 知识已经用到新情境' : '听方法并答对一题后点亮知识桥'}</div>
  </div>;
}
