import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store';
import { api } from '../api';
import { speakOnce, speakSeq, stopSpeaking, playSfx } from '../speech';
import { useAsr, readScore } from '../speechAssess';
import { ALL_MATH_LESSONS, EXTENDED_MATH_LESSONS, MATH_UPPER_UNITS, type ExtendedMathLesson, type MathActivity } from '../content/mathUpperCurriculum';
import { MathKnowledgeBridge } from './MathKnowledgeBridge';
import { scheduleReview } from '../reviewPlan';
import '../math-textbook-lab.css';
import '../chinese-textbook.css';

type LessonId = string;

type Prompt = { question: string; options: string[]; answer?: number };

const LESSONS = ALL_MATH_LESSONS;

const isLessonId = (value: string | undefined): value is LessonId =>
  LESSONS.some((lesson) => lesson.id === value);

const OBJECTS: Record<number, string> = { 1: '🏠', 2: '🪿', 3: '🐦', 4: '🌻', 5: '🌽' };

/* ============================================================
   数字化教学层：AI 语音老师 / 智能题库 / 语音跟读评分
   ============================================================ */

const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(arr: T[]): T => arr[rand(arr.length)];
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

const PRAISE = ['太棒了！', '答对啦，真厉害！', '完全正确，你真是小数学家！', '好极了，继续加油！'];
const ENCOURAGE = ['没关系，再想一想。', '差一点点，再试一次吧！', '再数一数看看哦。'];

/** 浏览器要求首次交互后才能发声；页面级监听一次性标记 */
let userInteracted = false;
function teacherSay(text: string, rate = 0.9) {
  if (!userInteracted) return;
  speakOnce(text, 'zh', rate);
}

/** 答题反馈 = 音效 + 语音 */
function feedback(right: boolean) {
  playSfx(right ? 'correct' : 'wrong');
  teacherSay(right ? pick(PRAISE) : pick(ENCOURAGE));
}

type AskMeta = { title: string; context: string; quick: string[] };

/** AI 语音老师条：聪聪讲解 + 可重听 + 「不懂就问」课内答疑（auto=false 时不自动朗读，只展示文字） */
function TeacherBar({ text, auto = true, ask }: { text: string; auto?: boolean; ask?: AskMeta }) {
  const said = useRef(false);
  const [voiceDown, setVoiceDown] = useState(false);
  // 不懂就问：面板展开 / 对话 / 输入状态
  const [askOpen, setAskOpen] = useState(false);
  const [msgs, setMsgs] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [askDown, setAskDown] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (said.current || !auto) return;
    said.current = true;
    const t = setTimeout(() => teacherSay(text), 400);
    return () => clearTimeout(t);
  }, [text, auto]);
  // 火山 TTS 上游合成失败（授权过期等）时给出可见提示，避免"点了没反应"
  useEffect(() => {
    const onDown = () => setVoiceDown(true);
    window.addEventListener('volc-tts-degraded', onDown);
    return () => window.removeEventListener('volc-tts-degraded', onDown);
  }, []);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [msgs, loading]);

  const ask_ = async (question: string) => {
    const q = question.trim();
    if (!q || loading || !ask) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', content: q }]);
    setLoading(true);
    // 每次都带上课文上下文 preamble，保证回答围绕本课内容
    const preamble = `现在是小学一年级数学课《${ask.title}》的"不懂就问"环节。请你扮演这节课的 AI 老师"聪聪"，只围绕这节课的内容和小朋友能理解的知识回答。课文要点：${ask.context}。回答要求：简单（2~4 句）、适合 6 岁小朋友，多用例子，遇到生字可以加拼音。和本课无关的问题，温柔地引导回数学学习。`;
    const history = msgs.slice(-6);
    const r = await api.buddyChat([{ role: 'user', content: preamble }, ...history, { role: 'user', content: q }]);
    setLoading(false);
    if (r && r.ok && r.reply) {
      setMsgs((m) => [...m, { role: 'assistant', content: r.reply as string }]);
    } else {
      setAskDown(true);
    }
  };

  return (
    <div className="mt-teacher-wrap">
      <div className="mt-teacher ct-teacher-note">
        <span className="mt-teacher-avatar" aria-hidden="true">🤖</span>
        <div className="mt-teacher-body">
          <b>聪聪老师<small>AI 语音讲解</small></b>
          <p>{text}</p>
          {voiceDown && <i className="mt-teacher-down">🔇 语音服务暂不可用（火山 TTS 授权已过期），课程其他功能不受影响；续期密钥后自动恢复。</i>}
        </div>
        <div className="mt-teacher-btns">
          <button className="mt-teacher-replay" onClick={() => speakOnce(text, 'zh', 0.9)}>🔊 再听一遍</button>
          {ask && (
            <button className="mt-teacher-askbtn" onClick={() => setAskOpen(!askOpen)} aria-expanded={askOpen}>
              🤔 不懂就问
            </button>
          )}
        </div>
      </div>
      {ask && askOpen && (
        <div className="mt-ask-panel">
          {msgs.length === 0 && (
            <div className="mt-ask-empty">
              <p>哪里不明白就问聪聪老师，她会结合课文讲给你听。</p>
              <div className="mt-ask-quick">
                {ask.quick.map((q) => <button key={q} onClick={() => ask_(q)}>{q}</button>)}
              </div>
            </div>
          )}
          <div className="mt-ask-list" ref={listRef}>
            {msgs.map((m, i) => (
              <div key={i} className={`mt-ask-msg ${m.role}`}>
                {m.role === 'assistant' && (
                  <>
                    <span className="mt-ask-avatar" aria-hidden="true">🤖</span>
                    <button className="mt-ask-speak" onClick={() => speakOnce(m.content, 'zh', 0.9)} aria-label="朗读回答">🔊 朗读</button>
                  </>
                )}
                <p>{m.content}</p>
              </div>
            ))}
            {loading && <div className="mt-ask-msg assistant"><span className="mt-ask-avatar" aria-hidden="true">🤖</span><p className="mt-ask-thinking">聪聪正在想…</p></div>}
          </div>
          {askDown && <p className="mt-ask-down">🔇 聪聪暂时回答不了（需要家长登录且 AI 服务已配置），稍后再试哦。</p>}
          <form className="mt-ask-form" onSubmit={(e) => { e.preventDefault(); ask_(input); }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入你的问题，比如：为什么要一个对一个？" maxLength={120} />
            <button type="submit" disabled={!input.trim() || loading}>发送</button>
          </form>
        </div>
      )}
    </div>
  );
}



/**
 * 智能闯关题库：不复问动手环节已经做过的原题。
 * 一轮固定覆盖「换情境、逆向、表征转换、判断策略、应用解释」五种迁移能力；
 * 错题仍回到队尾，但会保留原题，让孩子真正修正原来的理解。
 */
type ArenaQuestion = {
  q: string;
  emo?: string;
  opts: string[];
  answer: string;
  say: string;
  objective?: string;
};

const numberOptions = (answer: number, min = 0) => {
  const values = [answer, Math.max(min, answer - 1), answer + 1];
  while (new Set(values).size < 3) values.push(answer + values.length + 1);
  return shuffle([...new Set(values)].slice(0, 3).map(String));
};

function PracticeArena({ gen, count = 5, onPass, onWrong }: { gen: (round: number) => ArenaQuestion; count?: number; onPass: (stars: number) => void; onWrong?: (question: ArenaQuestion, answer: string) => void }) {
  const createQueue = () => Array.from({ length: count }, (_, round) => gen(round));
  const [queue, setQueue] = useState<ArenaQuestion[]>(createQueue);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState(0);
  const [streak, setStreak] = useState(0);
  const [passed, setPassed] = useState(false);
  const q = queue[idx];

  useEffect(() => { if (q) teacherSay(q.say); }, [q]);

  const choose = (o: string) => {
    if (picked || !q) return;
    setPicked(o);
    const right = o === q.answer;
    feedback(right);
    if (right) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setTimeout(() => {
        setPicked(null);
        if (idx + 1 >= queue.length) {
          const stars = wrong === 0 ? 3 : wrong <= 2 ? 2 : 1;
          setPassed(true);
          playSfx('win');
          teacherSay(`闯关成功！你获得了${stars}颗星！`);
          onPass(stars);
        } else setIdx((i) => i + 1);
      }, 800);
    } else {
      setWrong((w) => w + 1);
      setStreak(0);
      onWrong?.(q, o);
      setTimeout(() => {
        setQueue((qq) => [...qq, q]); // 错题插队尾重练
        setPicked(null);
        setIdx((i) => (i + 1 < queue.length ? i + 1 : i));
      }, 950);
    }
  };

  const retry = () => {
    setQueue(createQueue());
    setIdx(0);
    setPicked(null);
    setWrong(0);
    setStreak(0);
    setPassed(false);
    teacherSay('再来一次。这次慢慢看清楚每一题，冲刺三颗星！');
  };

  if (passed) {
    const stars = wrong === 0 ? 3 : wrong <= 2 ? 2 : 1;
    return (
      <div className="mt-arena mt-arena-pass">
        <b>🎉 闯关成功</b>
        <span className="mt-stars" aria-label={`${stars} 星`}>{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</span>
        <p>最多连对 {streak} 题 · 答错 {wrong} 次</p>
        <div className={`mt-arena-result ${stars === 3 ? 'gold' : 'review'}`}>
          {stars === 3 ? '本课已点亮，可以去学习下一课了。' : `本次成绩已保存。再练一次，答对全部题目就能点亮本课。`}
        </div>
        {stars < 3 && <button className="mt-arena-retry" onClick={retry}>↻ 再练一次，冲刺 3 星</button>}
      </div>
    );
  }
  if (!q) return null;
  return (
    <div className="mt-arena">
      <div className="mt-arena-top">
        <span>第 {idx + 1} / {queue.length} 题</span>
        <span className="mt-arena-streak">{'🔥'.repeat(Math.min(streak, 5))} 连对 {streak}</span>
      </div>
      <div className="mt-arena-q">
        {q.objective && <span className="mt-arena-objective">本题考查：{q.objective}</span>}
        {q.emo && <span className="mt-arena-emo">{q.emo}</span>}
        <b>{q.q}</b>
        <button className="mt-teacher-replay" onClick={() => speakOnce(q.say, 'zh', 0.88)}>🔊 听题</button>
      </div>
      <div className="mt-answer-row mt-arena-opts">
        {q.opts.map((o) => (
          <button key={o} className={picked === o ? (o === q.answer ? 'is-correct' : 'is-wrong') : picked && o === q.answer ? 'is-correct' : ''} onClick={() => choose(o)}>{o}</button>
        ))}
      </div>
    </div>
  );
}

function Checkpoint({ question, options, answer, onPass }: { question: string; options: string[]; answer: number; onPass: () => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => { teacherSay(question); }, [question]);
  const correct = picked === answer;
  return (
    <div className="mt-checkpoint">
      <span className="mt-check-tag">离开前想一想</span>
      <h3>{question} <button className="mt-teacher-replay" onClick={() => speakOnce(question, 'zh', 0.9)}>🔊</button></h3>
      <div className="mt-answer-row">
        {options.map((option, index) => (
          <button
            key={option}
            className={picked === index ? (correct ? 'is-correct' : 'is-wrong') : ''}
            onClick={() => {
              if (picked !== null) return;
              setPicked(index);
              feedback(index === answer);
              if (index === answer) setTimeout(onPass, 900);
              else setTimeout(() => setPicked(null), 950);
            }}
          >
            {option}
          </button>
        ))}
      </div>
      {picked !== null && <p className={correct ? 'mt-feedback good' : 'mt-feedback try'}>{correct ? '答对了！进入智能闯关，赢取星星。' : '再看一看画面，试着一个一个对应。'}</p>}
    </div>
  );
}

/** 动手环节只保留一个主任务；聪聪的提示随操作状态变化，文字和语音同步。 */
function OperationCoach({ task, coach, complete }: { task: string; coach: string; complete: boolean }) {
  const lastCoach = useRef<string | null>(null);
  useEffect(() => {
    if (lastCoach.current !== null && lastCoach.current !== coach) teacherSay(coach);
    lastCoach.current = coach;
  }, [coach]);
  return (
    <aside className={`mt-operation-coach ${complete ? 'complete' : ''}`} aria-live="polite">
      <div className="mt-operation-coach-tag"><span aria-hidden="true">🤖</span><b>聪聪老师</b></div>
      <div><small>本环节只做这一件事</small><strong>{complete ? '关键操作已完成，可以继续探索。' : task}</strong><p>{coach}</p></div>
    </aside>
  );
}

/** 全册通用数字学具：每种活动都要求孩子真实操作，不以“我看过了”代替完成。 */
function CurriculumManipulative({ activity, onDone, onCoach }: { activity: MathActivity; onDone: () => void; onCoach: (text: string) => void }) {
  const [step, setStep] = useState(0);
  const [removed, setRemoved] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [sorted, setSorted] = useState<Record<number, string>>({});
  const [pickedModel, setPickedModel] = useState<number | null>(null);
  useEffect(() => { setStep(0); setRemoved([]); setSelected(null); setSorted({}); setPickedModel(null); }, [activity]);
  const praiseStep = (text: string, complete: boolean) => {
    playSfx(complete ? 'correct' : 'pop');
    onCoach(text);
    if (complete) onDone();
  };

  if (activity.kind === 'count') {
    return <div className="mt-curriculum-tool"><div className="mt-tool-scene count" aria-label={activity.prompt}>{Array.from({ length: activity.total }, (_, index) => <button key={index} className={index < step ? 'done' : index === step ? 'next' : ''} onClick={() => {
      if (index !== step) { onCoach('从左边第一个还没有点亮的物体开始，一个一个数。'); playSfx('tap'); return; }
      const next = step + 1; setStep(next); praiseStep(next === activity.total ? `数完了，一共有 ${activity.total} 个。` : `这是第 ${next} 个，还有 ${activity.total - next} 个没有数。`, next === activity.total);
    }}>{activity.emoji}<small>{index < step ? index + 1 : '?'}</small></button>)}</div><p>{step === activity.total ? `✓ 一共 ${activity.total} 个` : `已经按顺序数了 ${step} / ${activity.total} 个`}</p></div>;
  }
  if (activity.kind === 'join') {
    const total = activity.a + activity.b;
    return <div className="mt-curriculum-tool"><div className="mt-join-groups"><section><small>第一部分 · {activity.a}</small>{Array.from({ length: activity.a }, (_, index) => <button key={`a-${index}`} className={index < Math.min(step, activity.a) ? 'done' : ''} onClick={() => { if (step !== index) { onCoach('先把第一部分按顺序放进整体框。'); return; } const next = step + 1; setStep(next); praiseStep(`整体框里现在有 ${next} 个。`, false); }}>{activity.emoji}</button>)}</section><b>＋</b><section><small>第二部分 · {activity.b}</small>{Array.from({ length: activity.b }, (_, index) => <button key={`b-${index}`} className={step > activity.a + index ? 'done' : ''} onClick={() => { const expected = activity.a + index; if (step !== expected) { onCoach(step < activity.a ? '先放完第一部分，再合入第二部分。' : '从第二部分第一个开始放。'); return; } const next = step + 1; setStep(next); praiseStep(next === total ? `${activity.a} 和 ${activity.b} 合起来，一共是 ${total}。` : `合起来已有 ${next} 个，还差 ${total - next} 个。`, next === total); }}>{activity.emoji}</button>)}</section></div><div className="mt-whole-tray"><span>合起来</span><b>{step}</b><small>{activity.a} ＋ {activity.b} ＝ {step === total ? total : '？'}</small></div></div>;
  }
  if (activity.kind === 'take') {
    const left = activity.total - removed.length;
    return <div className="mt-curriculum-tool"><div className="mt-tool-scene take">{Array.from({ length: activity.total }, (_, index) => <button key={index} className={removed.includes(index) ? 'removed' : ''} disabled={removed.includes(index) || removed.length >= activity.take} onClick={() => { const next = [...removed, index]; setRemoved(next); praiseStep(next.length === activity.take ? `一共拿走 ${activity.take} 个，还剩 ${activity.total - activity.take} 个。` : `拿走了 ${next.length} 个，还要拿走 ${activity.take - next.length} 个。`, next.length === activity.take); }}>{activity.emoji}</button>)}</div><div className="mt-take-equation"><b>{activity.total}</b><span>－</span><b>{removed.length}</b><span>＝</span><strong>{left}</strong></div></div>;
  }
  if (activity.kind === 'tenframe') {
    const added = step;
    return <div className="mt-curriculum-tool"><div className="mt-ten-frame" aria-label="十格框">{Array.from({ length: 10 }, (_, index) => {
      const fixed = index < activity.filled; const canAdd = index >= activity.filled && index < activity.filled + activity.add; const done = canAdd && index < activity.filled + added;
      return <button key={index} disabled={fixed || !canAdd || done} className={`${fixed ? 'fixed' : ''} ${done ? 'added' : ''} ${canAdd && !done && index === activity.filled + added ? 'next' : ''}`} onClick={() => { const next = added + 1; setStep(next); praiseStep(next === activity.add ? `补好了！${activity.filled} 加 ${activity.add}，十格框正好完成目标。` : `已经补了 ${next} 个，还要补 ${activity.add - next} 个。`, next === activity.add); }}><i /></button>;
    })}</div><p>原有 {activity.filled} 个 · 已补 {added} / {activity.add} 个</p></div>;
  }
  if (activity.kind === 'order') {
    const choices = [...activity.values].reverse();
    return <div className="mt-curriculum-tool"><div className="mt-order-target">{activity.values.map((value, index) => <span key={value} className={index < step ? 'done' : index === step ? 'next' : ''}>{index < step ? value : '?'}</span>)}</div><div className="mt-tool-options">{choices.map((value) => <button key={value} disabled={activity.values.indexOf(value) < step} onClick={() => { if (value !== activity.values[step]) { playSfx('tap'); onCoach(`下一步应该接在 ${step ? activity.values[step - 1] : '起点'} 后面，看看哪个数符合顺序。`); return; } const next = step + 1; setStep(next); praiseStep(next === activity.values.length ? `顺序完成：${activity.values.join('、')}。` : `放对了 ${value}，接着找下一个数。`, next === activity.values.length); }}>{value}</button>)}</div></div>;
  }
  if (activity.kind === 'sort') {
    const shapes = ['长方体', '正方体', '圆柱', '球'] as const;
    const complete = Object.keys(sorted).length === activity.objects.length;
    return <div className="mt-curriculum-tool"><div className="mt-sort-objects">{activity.objects.map((object, index) => <button key={index} className={sorted[index] ? 'done' : selected === index ? 'selected' : ''} disabled={!!sorted[index]} onClick={() => { setSelected(index); onCoach(`选中了${object.emoji}，观察它的面和能不能滚，再选择形状家族。`); }}>{object.emoji}<small>{sorted[index] || '待分类'}</small></button>)}</div><div className="mt-shape-homes">{shapes.map((shape) => <button key={shape} onClick={() => { if (selected === null) { onCoach('先选一个生活物品，再选择它属于哪种形状。'); return; } const object = activity.objects[selected]; if (object.shape !== shape) { feedback(false); onCoach(`${object.emoji}不属于${shape}，摸一摸它的面，再试一次。`); return; } const next = { ...sorted, [selected]: shape }; setSorted(next); setSelected(null); const done = Object.keys(next).length === activity.objects.length; praiseStep(done ? '四种物品都分类正确了！' : `${object.emoji}属于${shape}，继续分类下一个。`, done); }}>{shape}</button>)}</div>{complete && <p>✓ 分类完成</p>}</div>;
  }
  const right = pickedModel === activity.answer;
  return <div className="mt-curriculum-tool"><div className="mt-model-visual">{activity.visual}</div><div className="mt-tool-options">{activity.options.map((option, index) => <button key={option} className={pickedModel === index ? (right ? 'is-correct' : 'is-wrong') : ''} onClick={() => { if (right) return; setPickedModel(index); if (index === activity.answer) praiseStep('模型和画面中的数量关系完全一致。', true); else { feedback(false); onCoach('这个模型和画面关系还不一致，重新看看“整体”和“部分”。'); setTimeout(() => setPickedModel(null), 850); } }}>{option}</button>)}</div></div>;
}

/** 全册课时的迁移题：同一个知识点换问法、换情境，不照抄动手试和小检测。 */
function genericArena(activity: MathActivity, round: number): ArenaQuestion {
  const type = round % 5;
  if (activity.kind === 'count') {
    const n = activity.total;
    if (type === 0) return { objective: '换情境点数', q: '小卷又放进了 1 个，一共有几个？', emo: activity.emoji.repeat(Math.min(n + 1, 12)), opts: numberOptions(n + 1), answer: String(n + 1), say: `换一个情境数一数，一共有几个？` };
    if (type === 1) return { objective: '数的后继', q: `聪聪已经按顺序数到 ${n}，下一个数是？`, opts: numberOptions(n + 1), answer: String(n + 1), say: `数到${n}以后，下一个数是几？` };
    if (type === 2) return { objective: '倒着想一想', q: `${n} 个物品遮住 1 个，还看见几个？`, opts: numberOptions(Math.max(0, n - 1)), answer: String(Math.max(0, n - 1)), say: `${n}个物品遮住一个，还看见几个？` };
    if (type === 3) return { objective: '数序关联', q: `${n} 前面的一个数是？`, opts: numberOptions(Math.max(0, n - 1)), answer: String(Math.max(0, n - 1)), say: `${n}前面的一个数是几？` };
    return { objective: '方法判断', q: '数一排物品时，怎样做才不容易漏？', opts: ['从一端开始，一个一个数', '从中间随便跳着数', '只看最大的物品'], answer: '从一端开始，一个一个数', say: '数一排物品时，怎样做才不容易漏？' };
  }
  if (activity.kind === 'join') {
    const total = activity.a + activity.b;
    if (type === 0) return { objective: '逆向找部分', q: `一共有 ${total} 个，其中 ${activity.a} 个在左边，右边有几个？`, emo: activity.emoji.repeat(Math.min(total, 12)), opts: numberOptions(activity.b), answer: String(activity.b), say: `一共有${total}个，其中${activity.a}个在左边，右边有几个？` };
    if (type === 1) return { objective: '新情境合并', q: `原来有 ${activity.a} 个，又来了 ${activity.b + 1} 个，现在有几个？`, opts: numberOptions(total + 1), answer: String(total + 1), say: `原来有${activity.a}个，又来了${activity.b + 1}个，现在有几个？` };
    if (type === 2) return { objective: '图式转算式', q: '哪道算式能表示“两部分合成一个整体”？', opts: [`${activity.a}＋${activity.b}＝${total}`, `${total}－${activity.a}＝${total + activity.b}`, `${activity.a}－${activity.b}＝${total}`], answer: `${activity.a}＋${activity.b}＝${total}`, say: '哪道算式能表示两部分合成一个整体？' };
    if (type === 3) return { objective: '加减互相检查', q: `要检查 ${activity.a}＋${activity.b}＝${total} 对不对，可以用哪道减法？`, opts: [`${total}－${activity.a}＝${activity.b}`, `${total}－${activity.b}＝${total}`, `${activity.a}－${activity.b}＝${total}`], answer: `${total}－${activity.a}＝${activity.b}`, say: '用哪道减法可以检查这道加法？' };
    return { objective: '选择运算', q: '题目问“合起来一共多少”，最适合用什么方法？', opts: ['加法', '减法', '只比较大小'], answer: '加法', say: '题目问合起来一共多少，最适合用什么方法？' };
  }
  if (activity.kind === 'take') {
    const left = activity.total - activity.take;
    if (type === 0) return { objective: '逆向还原', q: `拿走 ${activity.take} 个后还剩 ${left} 个，原来有几个？`, opts: numberOptions(activity.total), answer: String(activity.total), say: `拿走${activity.take}个后还剩${left}个，原来有几个？` };
    if (type === 1) return { objective: '新情境减少', q: `${activity.total + 1} 个里拿走 ${activity.take} 个，还剩几个？`, opts: numberOptions(left + 1), answer: String(left + 1), say: `${activity.total + 1}个里拿走${activity.take}个，还剩几个？` };
    if (type === 2) return { objective: '图式转算式', q: '“原来有一些，拿走一部分，求剩下”对应哪道算式？', opts: [`${activity.total}－${activity.take}＝${left}`, `${activity.total}＋${activity.take}＝${left}`, `${left}－${activity.take}＝${activity.total}`], answer: `${activity.total}－${activity.take}＝${left}`, say: '原来有一些，拿走一部分，求剩下，对应哪道算式？' };
    if (type === 3) {
      if (left === 0) return { objective: '反向变化', q: `原来如果多放 1 个，拿走 ${activity.take} 个后还剩几个？`, opts: numberOptions(1), answer: '1', say: `原来如果多放一个，拿走${activity.take}个后还剩几个？` };
      return { objective: '结果变化', q: '如果再拿走 1 个，剩下的会是几个？', opts: numberOptions(left - 1), answer: String(left - 1), say: '如果再拿走一个，剩下的会是几个？' };
    }
    return { objective: '选择运算', q: '题目问“还剩多少”，应该先想哪种数量关系？', opts: ['从整体去掉一部分', '把两部分合起来', '只看最大的数'], answer: '从整体去掉一部分', say: '题目问还剩多少，应该先想哪种数量关系？' };
  }
  if (activity.kind === 'tenframe') {
    const need = 10 - activity.filled;
    if (type === 0) return { objective: '看结构补空格', q: `十格框里已经有 ${activity.filled} 个，还有几格空着？`, opts: numberOptions(need), answer: String(need), say: `十格框里已经有${activity.filled}个，还有几格空着？` };
    if (type === 1) return { objective: '找凑十伙伴', q: `${activity.filled} 的凑十伙伴是几？`, opts: numberOptions(need), answer: String(need), say: `${activity.filled}的凑十伙伴是几？` };
    if (type === 2) return { objective: '等量转换', q: `哪一组数合起来正好是 10？`, opts: [`${activity.filled} 和 ${need}`, `${activity.filled} 和 ${Math.max(0, need - 1)}`, `${activity.filled} 和 ${need + 1}`], answer: `${activity.filled} 和 ${need}`, say: '哪一组数合起来正好是十？' };
    if (type === 3) return { objective: '继续变化', q: `补满 10 格后，又拿走 1 个，还剩几个？`, opts: numberOptions(9), answer: '9', say: '补满十格后，又拿走一个，还剩几个？' };
    return { objective: '策略选择', q: '算“接近 10 的数加几”时，先凑成 10 有什么好处？', opts: ['10 加几更容易算', '答案会自动变大', '不用再看数字'], answer: '10 加几更容易算', say: '先凑成十有什么好处？' };
  }
  if (activity.kind === 'order') {
    const first = activity.values[0], second = activity.values[1], last = activity.values[activity.values.length - 1];
    if (type === 0) return { objective: '读变化记录', q: `记录从 ${first} 开始，下一步到了几？`, opts: numberOptions(second), answer: String(second), say: `记录从${first}开始，下一步到了几？` };
    if (type === 1) return { objective: '补全过程', q: `${first} → ${second} → ？`, opts: numberOptions(activity.values[2]), answer: String(activity.values[2]), say: '看看变化记录，问号处应该是多少？' };
    if (type === 2) return { objective: '回看终点', q: `这段记录最后停在几？`, opts: numberOptions(last), answer: String(last), say: '这段记录最后停在几？' };
    if (type === 3) return { objective: '顺序判断', q: '要看清数量怎样变化，最好的做法是？', opts: ['按发生先后一步一步记录', '只看最后一个数', '随意调换步骤'], answer: '按发生先后一步一步记录', say: '要看清数量怎样变化，最好的做法是？' };
    return { objective: '迁移应用', q: `从 ${first} 走到 ${last}，中间经过的第一个数字是？`, opts: numberOptions(second), answer: String(second), say: `从${first}走到${last}，中间经过的第一个数字是几？` };
  }
  if (activity.kind === 'sort') {
    const object = activity.objects[round % activity.objects.length];
    if (type === 0) return { objective: '生活物品分类', q: `${object.emoji} 最接近哪种立体图形？`, opts: ['长方体', '正方体', '圆柱', '球'], answer: object.shape, say: `${object.emoji}最接近哪种立体图形？` };
    if (type === 1) return { objective: '根据特征判断', q: '哪个特征最能帮助我们认出球？', opts: ['各个方向都容易滚动', '有六个一样的平平的面', '上下两个圆圆的平面'], answer: '各个方向都容易滚动', say: '哪个特征最能帮助我们认出球？' };
    if (type === 2) return { objective: '稳定性应用', q: '搭高塔时，最适合放在最下面的是？', opts: ['平平的盒子', '圆圆的球', '容易滚动的物体'], answer: '平平的盒子', say: '搭高塔时，最适合放在最下面的是？' };
    if (type === 3) return { objective: '反例辨析', q: '聪聪说“圆柱和球一样，都会向各个方向滚动”，这句话对吗？', opts: ['不对，圆柱有平平的底面', '对，两个完全一样', '对，只要颜色相同'], answer: '不对，圆柱有平平的底面', say: '圆柱和球一样都会向各个方向滚动吗？' };
    return { objective: '分类方法', q: '给物品分图形家族时，先观察什么更可靠？', opts: ['面的形状和能不能滚', '物品颜色', '名字有几个字'], answer: '面的形状和能不能滚', say: '给物品分图形家族时，先观察什么更可靠？' };
  }
  if (type === 0) return { objective: '换情境选模型', q: '遇到一个新的数学情境，第一步最该做什么？', opts: ['看清信息和要解决的问题', '马上猜一个答案', '只挑最大的数字'], answer: '看清信息和要解决的问题', say: '遇到一个新的数学情境，第一步最该做什么？' };
  if (type === 1) return { objective: '策略辨析', q: '聪聪只看见一个关键词就决定用什么方法，这样做对吗？', opts: ['不对，要先看数量或位置关系', '对，关键词总是最可靠', '对，只要算得快'], answer: '不对，要先看数量或位置关系', say: '只看一个关键词就决定方法，对吗？' };
  if (type === 2) return { objective: '模型作用', q: '把题目画成图、线段或位置图，最主要是为了？', opts: ['看清各部分之间的关系', '让纸面更漂亮', '把数字写得更大'], answer: '看清各部分之间的关系', say: '把题目画成图，最主要是为了什么？' };
  if (type === 3) return { objective: '好模型的标准', q: '一个好模型最重要的是？', opts: ['能清楚表示题目里的关系', '画得越花越好', '把所有数字写得一样大'], answer: '能清楚表示题目里的关系', say: '一个好模型最重要的是什么？' };
  return { objective: '检查答案', q: '做完题后，怎样检查答案更可靠？', opts: ['回到原来的情境和问题检查', '只看答案写得大不大', '换一个答案试试'], answer: '回到原来的情境和问题检查', say: '做完题后，怎样检查答案更可靠？' };
}

function ExtendedLessonPage({ config, onPass }: { config: ExtendedMathLesson; onPass: (stars: number) => void }) {
  const [taskDone, setTaskDone] = useState(false);
  const [coach, setCoach] = useState(config.activity.prompt);
  useEffect(() => { setTaskDone(false); setCoach(config.activity.prompt); }, [config]);
  return <section className="mt-lesson mt-extended-lesson">
    <div className="mt-lesson-copy"><span className="mt-kicker">教材 {config.page} · 数字化探索课</span><h2>{config.title}</h2><p>{config.concept}</p></div>
    <LearningFlow lessonId={config.id} lessonName={config.title} guess={config.guess} guessVisual={<div className="mt-extended-scene" role="img" aria-label={`${config.title}观察图`}>{config.scene}</div>} reason={config.reason} checkpoint={config.checkpoint} actionReady={taskDone} actionHint={config.activity.prompt} actionCoach={coach} ask={{ title: config.title, context: `${config.concept} 本课依据教材${config.page}的主题图、例题与练习重构。`, quick: config.quick }} narrations={[
      `先看观察图，想一想：${config.guess.question} 这里先记录猜想，不急着判断。`,
      `现在做一个关键操作：${config.activity.prompt} 聪聪会根据你做到哪一步继续提示。`,
      `把刚才的操作说成理由：${config.reason.question}`,
      '小检测只检查本课最核心的理解，仔细看清问题再选择。',
      '进入智能闯关。答错的题会回到队尾再练，真正理解后再点亮课程。',
    ]} arena={(round) => genericArena(config.activity, round)} onPass={onPass}>
      <CurriculumManipulative key={config.id} activity={config.activity} onDone={() => setTaskDone(true)} onCoach={setCoach} />
      <div className="mt-concept-card"><b>把操作变成数学</b><span>{config.concept}</span></div>
    </LearningFlow>
  </section>;
}

function LearningFlow({ lessonId, lessonName, guess, guessVisual, reason, checkpoint, arena, narrations, ask, onPass, actionReady, actionHint, actionCoach, children }: {
  lessonId: LessonId;
  lessonName: string;
  guess: Prompt;
  guessVisual?: React.ReactNode;
  reason: Prompt & { answer: number };
  checkpoint: Prompt & { answer: number };
  arena: (round: number) => ArenaQuestion;
  /** 各阶段（先猜/动手试/说理由/小检测/智能闯关）的 AI 老师讲解词；小检测与闯关阶段不自动朗读（题目/题干自带语音） */
  narrations: string[];
  /** 「不懂就问」课文上下文 */
  ask: AskMeta;
  onPass: (stars: number) => void;
  /** 动手环节是否已完成关键操作；未完成前不能跳到说理由。 */
  actionReady?: boolean;
  actionHint?: string;
  /** 根据当前操作实时变化的聪聪提示。 */
  actionCoach?: string;
  children: React.ReactNode;
}) {
  const activeChildId = useStore((s) => s.activeChildId);
  const addWrong = useStore((s) => s.addWrong);
  // v2 起动手环节改为固定、可核验的任务，旧版“任意操作已完成”的断点不能复用。
  const flowKey = `sfz-math-flow-v2:${activeChildId ?? 'guest'}:${window.location.hash}`;
  const restored = useMemo(() => {
    try {
      const saved = localStorage.getItem(flowKey);
      if (!saved) return { phase: 0, unlocked: 0, actionDone: false, knowledgeDone: false };
      const value = JSON.parse(saved) as { phase?: number; unlocked?: number; actionDone?: boolean; knowledgeDone?: boolean };
      return { phase: Math.max(0, Math.min(4, value.phase ?? 0)), unlocked: Math.max(0, Math.min(4, value.unlocked ?? 0)), actionDone: !!value.actionDone, knowledgeDone: !!value.knowledgeDone || (value.phase ?? 0) >= 3 };
    } catch { return { phase: 0, unlocked: 0, actionDone: false, knowledgeDone: false }; }
  }, [flowKey]);
  const [phase, setPhase] = useState(restored.phase);
  const [unlocked, setUnlocked] = useState(restored.unlocked);
  const [savedActionDone, setSavedActionDone] = useState(restored.actionDone);
  const [knowledgeDone, setKnowledgeDone] = useState(restored.knowledgeDone);
  const [guessPick, setGuessPick] = useState<number | null>(null);
  const [reasonPick, setReasonPick] = useState<number | null>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const phases = ['先猜', '动手试', '说理由', '小检测', '智能闯关'];
  const actionDone = !!actionReady || savedActionDone;
  useEffect(() => {
    if (actionReady) setSavedActionDone(true);
  }, [actionReady]);
  useEffect(() => {
    try { localStorage.setItem(flowKey, JSON.stringify({ phase, unlocked, actionDone, knowledgeDone })); } catch { /* 私密模式下不影响上课 */ }
  }, [actionDone, flowKey, knowledgeDone, phase, unlocked]);
  const goPhase = (next: number) => {
    setPhase(next);
    // 新阶段内容可能在视口下方（如动手试里的写字板），滚动定位让人看见
    setTimeout(() => {
      flowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };
  const advance = (next: number) => {
    setUnlocked((value) => Math.max(value, next));
    goPhase(next);
    stopSpeaking();
  };
  return (
    <div className="mt-learning-flow" ref={flowRef}>
      <nav className="ct-phase-nav mt-phase-nav-math" aria-label="本课学习步骤">
        {phases.map((label, index) => (
          <button key={label} disabled={index > unlocked} className={`${phase === index ? 'active' : ''} ${index < unlocked ? 'done' : ''}`} onClick={() => goPhase(index)}>
            <b>{index < unlocked ? '✓' : index + 1}</b><span>{label}</span>
          </button>
        ))}
      </nav>
      {narrations[phase] && (
        <TeacherBar key={phase} text={narrations[phase]} auto={phase !== 3 && phase !== 4} ask={ask} />
      )}
      {phase === 0 && (
        <div className="mt-phase-card mt-guess-card">
          <span>先观察，再猜一猜</span><h3>{guess.question}</h3>
          {guessVisual && <div className="mt-guess-visual">{guessVisual}</div>}
          <div className="mt-answer-row">{guess.options.map((option, index) => <button key={option} className={guessPick === index ? 'is-picked' : ''} onClick={() => { setGuessPick(index); playSfx('tap'); }}>{option}</button>)}</div>
          <p>这里记录的是猜想，不判对错。下一步用操作来验证。</p>
          <button className="ct-primary mt-flow-next" disabled={guessPick === null} onClick={() => advance(1)}>带着猜想去验证 →</button>
        </div>
      )}
      {phase === 1 && <div className="mt-action-phase"><OperationCoach task={actionHint ?? '完成上面的操作，再继续。'} coach={actionCoach ?? actionHint ?? '先完成上面的操作，再继续。'} complete={actionDone} />{children}{savedActionDone && !actionReady && <p className="mt-action-complete">✓ 这个动手环节已完成；你也可以继续操作，再去说理由。</p>}{!actionDone && <p className="mt-action-required">{actionHint ?? '先完成上面的操作，再继续。'}</p>}<button className="ct-primary mt-flow-next" disabled={!actionDone} onClick={() => advance(2)}>我动手试过了，去说理由 →</button></div>}
      {phase === 2 && (
        <div className="mt-phase-card mt-reason-card">
          <span>把发现说清楚</span><h3>{reason.question}</h3>
          <div className="mt-answer-row">{reason.options.map((option, index) => <button key={option} className={reasonPick === index ? (index === reason.answer ? 'is-correct' : 'is-wrong') : ''} onClick={() => { if (reasonPick !== null) return; setReasonPick(index); const right = index === reason.answer; feedback(right); if (!right) setTimeout(() => setReasonPick(null), 950); }}>{option}</button>)}</div>
          {reasonPick !== null && <p className={reasonPick === reason.answer ? 'mt-feedback good' : 'mt-feedback try'}>{reasonPick === reason.answer ? '理由说清楚了，再把方法用到新情境。' : '这个理由还不能解释刚才的操作，再试一次。'}</p>}
          {reasonPick === reason.answer && <MathKnowledgeBridge key={lessonId} lessonId={lessonId} complete={knowledgeDone} onComplete={() => setKnowledgeDone(true)} />}
          <button className="ct-primary mt-flow-next" disabled={reasonPick !== reason.answer || !knowledgeDone} onClick={() => advance(3)}>进入小检测 →</button>
        </div>
      )}
      {phase === 3 && <Checkpoint question={checkpoint.question} options={checkpoint.options} answer={checkpoint.answer} onPass={() => advance(4)} />}
      {phase === 4 && (
        <div className="mt-arena-wrap">
          <span className="mt-check-tag">智能闯关 · 五类迁移题，答错自动重练</span>
          <PracticeArena
            gen={arena}
            onWrong={(question, answer) => {
              if (!activeChildId) return;
              addWrong(activeChildId, {
                uid: `math:${lessonId}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
                lessonId: `math-lab-${lessonId}`,
                lessonName,
                kind: question.emo ? `${question.q} ${question.emo}` : question.q,
                answer,
                time: Date.now(),
              });
            }}
            onPass={(stars) => { try { localStorage.removeItem(flowKey); } catch { /* 忽略存储不可用 */ } onPass(stars); }}
          />
        </div>
      )}
    </div>
  );
}

const DIGIT_STROKES: Record<number, string[]> = {
  1: ['M76 18 L42 132'],
  2: ['M28 43 C34 12 88 8 96 39 C103 65 75 80 56 98 L25 128 L100 128'],
  3: ['M29 28 C52 8 94 17 92 49 C91 66 75 74 57 74 C79 73 98 84 94 111 C89 143 46 145 25 120'],
  4: ['M73 17 L25 96 L101 96', 'M78 17 L78 134'],
  5: ['M97 22 L39 22 L32 69', 'M32 69 C48 56 89 57 96 91 C102 127 62 146 27 122'],
};

const DIGIT_STROKE_HINTS: Record<number, string[]> = {
  1: ['从上往下起笔，稍微向左下方斜着写到终点。'],
  2: ['从左上起笔，先向右画弯，再向左下行，最后横着写向右。'],
  3: ['从左上起笔，先向右弯；不停笔，继续向下向右弯。'],
  4: ['从上方起笔，斜着向左下写，再横着向右。', '从上方起笔，竖着向下写。'],
  5: ['从右上向左写横，再向下短竖。', '从左上起笔，向右下方弯着写到终点。'],
};

/** 手写描红：笔顺动画 + 起笔/方向提示 + 轨迹智能批改。书写结果不参与数量掌握度。 */
function DigitPractice({ number, replay, onReplay }: { number: number; replay: number; onReplay: () => void }) {
  const [ink, setInk] = useState<string[]>([]);
  const [judge, setJudge] = useState<{ ok: boolean; pct: number; hint: string; checks: { label: string; ok: boolean }[] } | null>(null);
  const [passed, setPassed] = useState<Record<number, boolean>>({});
  const drawingRef = useRef(false);
  const padRef = useRef<SVGSVGElement>(null);
  const point = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return `${Math.round(((event.clientX - rect.left) / rect.width) * 120)},${Math.round(((event.clientY - rect.top) / rect.height) * 150)}`;
  };
  useEffect(() => { setInk([]); setJudge(null); }, [number]);

  /** 批改：覆盖率之外还核验笔数、起笔、行笔方向、收笔和明显的额外涂画。 */
  const check = () => {
    const svg = padRef.current;
    if (!svg || ink.length === 0) { teacherSay('先跟着灰色的字描一遍，再检查哦。'); return; }
    // 写字板里灰色字模的组类名是 mt-digit-guide
    const guides = svg.querySelectorAll<SVGPathElement>('.mt-digit-guide path');
    type Point = { x: number; y: number; progress?: number };
    const guideSamples: Point[][] = [];
    const targets: Point[] = [];
    guides.forEach((p) => {
      const len = p.getTotalLength();
      const samples: Point[] = [];
      for (let d = 0; d < len; d += 4) {
        const pt = p.getPointAtLength(d);
        samples.push({ x: pt.x, y: pt.y, progress: d / len });
      }
      const end = p.getPointAtLength(len);
      samples.push({ x: end.x, y: end.y, progress: 1 });
      guideSamples.push(samples);
      targets.push(...samples);
    });
    if (targets.length === 0) { teacherSay('写字板还没准备好，请刷新页面再试。'); return; }
    const lines = ink.map((line) => line.split(/\s+/).filter(Boolean).map((s) => {
      const [x, y] = s.split(',').map(Number);
      return { x, y } as Point;
    })).filter((line) => line.length > 0);
    const user = lines.flat();
    const R = 13;
    const covered = targets.filter((t) => user.some((u) => Math.hypot(u.x - t.x, u.y - t.y) < R)).length;
    const pct = Math.round((covered / targets.length) * 100);
    const starts = [...guides].map((path) => path.getPointAtLength(0));
    const ends = [...guides].map((path) => path.getPointAtLength(path.getTotalLength()));
    const strokeCountOk = lines.length === guides.length;
    const startOk = strokeCountOk && lines.every((line, index) => Math.hypot(line[0].x - starts[index].x, line[0].y - starts[index].y) < 24);
    const endOk = strokeCountOk && lines.every((line, index) => {
      const last = line[line.length - 1];
      return Math.hypot(last.x - ends[index].x, last.y - ends[index].y) < 28;
    });
    const directionOk = strokeCountOk && lines.every((line, index) => {
      const progress = line.map((point) => guideSamples[index].reduce((best, sample) => {
        const distance = Math.hypot(point.x - sample.x, point.y - sample.y);
        return distance < best.distance ? { distance, progress: sample.progress ?? 0 } : best;
      }, { distance: Infinity, progress: 0 }).progress);
      const backwards = progress.slice(1).filter((value, pointIndex) => value + .11 < progress[pointIndex]).length;
      return progress.length > 1 && progress[0] < .34 && progress[progress.length - 1] > .66
        && backwards <= Math.max(1, Math.floor(progress.length * .18));
    });
    const offGuideRatio = user.filter((point) => !targets.some((target) => Math.hypot(point.x - target.x, point.y - target.y) < 18)).length / user.length;
    const extraMarksOk = offGuideRatio <= .22;
    const hint = !strokeCountOk
      ? `这个数字要分 ${guides.length} 笔写，试着一笔一笔完成。`
      : !startOk
        ? '这一笔请从带数字的小圆点起笔，再沿箭头方向写。'
        : !directionOk
          ? '方向要跟箭头一致：从起笔点向箭头指向的终点写。'
          : !endOk
            ? '这一笔还没有写到箭头终点，慢慢把笔画收完整。'
            : !extraMarksOk
              ? '发现了几处离开笔道的涂画，清除后沿灰色笔道再写一次。'
        : pct < 68
          ? '笔画还没有贴住灰色笔道，再慢一点描一描。'
          : '笔数、起笔、方向和收笔都做对了！';
    const checks = [
      { label: `分 ${guides.length} 笔`, ok: strokeCountOk }, { label: '从起笔点开始', ok: startOk },
      { label: '顺着箭头方向', ok: directionOk }, { label: '写到终点', ok: endOk }, { label: '没有明显涂画', ok: extraMarksOk },
    ];
    const ok = pct >= 68 && strokeCountOk && startOk && directionOk && endOk && extraMarksOk;
    setJudge({ ok, pct, hint, checks });
    if (ok) {
      feedback(true);
      setPassed((p) => ({ ...p, [number]: true }));
      teacherSay(`数字 ${number} 写得真好！`);
    } else {
      playSfx('tap');
      teacherSay(hint);
    }
  };

  return (
    <div className="mt-writing-practice">
      <article>
        <small>笔顺演示</small>
        <svg key={`${number}-${replay}`} viewBox="0 0 120 150" aria-label={`数字 ${number} 的笔顺动画`}>
          <g className="mt-digit-guide">{DIGIT_STROKES[number].map((path, index) => <path key={`guide-${index}`} d={path} />)}</g>
          <g className="mt-digit-animation">{DIGIT_STROKES[number].map((path, index) => <path key={`animated-${index}`} d={path} style={{ animationDelay: `${index * 1.1}s` }} />)}</g>
        </svg>
        <button className="mt-stroke-replay" onClick={onReplay}>▶ 播放正确笔顺</button>
        <ol className="mt-stroke-steps">{DIGIT_STROKE_HINTS[number].map((hint, index) => <li key={hint}><b>{index + 1}</b>{hint}</li>)}</ol>
      </article>
      <article>
        <small>跟着写一遍{passed[number] ? ' ✓ 已写好' : ''}</small>
        <div className="mt-write-next" aria-live="polite"><b>现在写第 {Math.min(ink.length + 1, DIGIT_STROKES[number].length)} 笔</b><span>{DIGIT_STROKE_HINTS[number][Math.min(ink.length, DIGIT_STROKES[number].length - 1)]}</span></div>
        <svg className="mt-write-pad" ref={padRef} viewBox="0 0 120 150"
          onPointerDown={(event) => {
            event.preventDefault();
            const nextPoint = point(event);
            drawingRef.current = true;
            setInk((lines) => [...lines, nextPoint]);
            try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* 部分触控环境不支持捕获，仍可继续书写 */ }
          }}
          onPointerMove={(event) => { if (!drawingRef.current) return; event.preventDefault(); const nextPoint = point(event); setInk((lines) => lines.length === 0 ? [nextPoint] : [...lines.slice(0, -1), `${lines[lines.length - 1]} ${nextPoint}`]); }}
          onPointerUp={() => { drawingRef.current = false; }} onPointerCancel={() => { drawingRef.current = false; }} onLostPointerCapture={() => { drawingRef.current = false; }}>
          <line x1="60" y1="0" x2="60" y2="150" /><line x1="0" y1="75" x2="120" y2="75" />
          <g className="mt-digit-guide">{DIGIT_STROKES[number].map((path, index) => <path key={`write-guide-${index}`} d={path} />)}</g>
          {ink.map((points, index) => <polyline key={index} points={points} />)}
        </svg>
        {judge && <div className={`mt-writing-result ${judge.ok ? 'good' : 'try'}`}><b>{judge.ok ? '这次书写轨迹很接近范字' : '这一次先练笔画，不给数量理解下结论'}</b><span>笔道贴合 {judge.pct}%</span><ul>{judge.checks.map((item) => <li key={item.label} className={item.ok ? 'ok' : ''}>{item.ok ? '✓' : '○'} {item.label}</li>)}</ul><p>{judge.hint}</p></div>}
      </article>
      {/* 批改操作独立于写字卡，放两卡下方，避免和写字板粘在一起 */}
      <div className="mt-write-ops">
        <button onClick={check}>✅ 智能批改</button>
        <button onClick={() => { setInk([]); setJudge(null); }}>🧽 清除重写</button>
      </div>
      <p className="mt-writing-safety">书写练习帮助掌握笔画，不计入本节数量任务、课程星级或“是否理解数字”的判断。</p>
    </div>
  );
}

function CampusGuessPicture() {
  return (
    <div className="mt-campus-guess-picture" role="img" aria-label="三栋教学楼，中间教学楼底层有入口，上方有三排窗户">
      <div className="mt-guess-building side left"><i /><i /><i /></div>
      <div className="mt-guess-building center"><i /><i /><i /><i className="entrance" /></div>
      <div className="mt-guess-building side right"><i /><i /><i /><i /></div>
      <span className="mt-guess-tree">🌳</span><span className="mt-guess-children">🧒🏻　👧🏻　🧒🏽</span>
    </div>
  );
}

function NumberGuessPicture() {
  return (
    <div className="mt-object-guess mt-number-guess" role="img" aria-label="桌面上摆着四个南瓜">
      <span>🎃</span><span>🎃</span><span>🎃</span><span>🎃</span>
      <div><i /><i /><i /><i /><i /></div>
    </div>
  );
}

function CompareGuessPicture() {
  return (
    <div className="mt-object-guess mt-compare-guess" role="img" aria-label="三只小猴和两个香蕉等待配对">
      <div><span>🐒</span><span>🐒</span><span>🐒</span></div><b>和</b><div><span>🍌</span><span>🍌</span></div>
    </div>
  );
}

function OrdinalGuessPicture() {
  return (
    <div className="mt-object-guess mt-ordinal-guess" role="img" aria-label="火车前有五个人排队，穿绿色衣服的小朋友排在第二位">
      <span className="train">🚆</span>
      <div><span>👩🏻</span><span className="focus">🧒🏻</span><span>👩🏽</span><span>👨🏻</span><span>🧑🏻</span></div>
      <i>从火车方向开始数 →</i>
    </div>
  );
}

function ComposeGuessPicture() {
  return (
    <div className="mt-object-guess mt-compose-guess" role="img" aria-label="五个玉米和左右两个空篮子">
      <div className="corns"><span>🌽</span><span>🌽</span><span>🌽</span><span>🌽</span><span>🌽</span></div>
      <div className="arrow">↙　↘</div><div className="empty-baskets"><i /><i /></div>
    </div>
  );
}

function CampusLesson({ onPass }: { onPass: (stars: number) => void }) {
  const [found, setFound] = useState<string | null>(null);
  const [floorCount, setFloorCount] = useState(0);
  const [countFeedback, setCountFeedback] = useState<{ right: boolean; text: string } | null>(null);
  const countFloor = (index: number) => {
    if (index < floorCount) return;
    if (index !== floorCount) {
      feedback(false);
      teacherSay('要从底层入口开始，一层一层往上数，不能跳过哦。');
      setCountFeedback({ right: false, text: '不要跳层：从底层入口开始，一层一层往上数。' });
      return;
    }
    const next = floorCount + 1;
    setFloorCount(next);
    feedback(true);
    teacherSay(next === 4 ? '数完啦！底层入口是第一层，上面还有三层，一共四层。' : `这是第 ${next} 层，继续往上数。`);
    setCountFeedback({ right: true, text: next === 4 ? '数完啦！从底层入口数起，一共有 4 层。' : `这是第 ${next} 层，继续往上数。` });
  };
  const finds = [
    { id: 'floors', label: '中间教学楼有 4 层：底层入口算第 1 层，上面还有 3 层窗户', left: '51%', top: '45%' },
    { id: 'buildings', label: '画面里可以看到 3 栋教学楼', left: '77%', top: '31%' },
    { id: 'window', label: '教学楼的窗户是长方形', left: '24%', top: '38%' },
    { id: 'trees', label: '先找树，再一棵一棵数', left: '32%', top: '68%' },
  ];
  return (
    <section className="mt-lesson mt-campus">
      <div className="mt-lesson-copy">
        <span className="mt-kicker">数学游戏 · 先观察，再表达</span>
        <h2>校园里藏着哪些数学？</h2>
        <p>点击发光标记，找出数量、形状和位置。先让孩子自己说，再打开提示。</p>
      </div>
      <LearningFlow
        lessonId="campus"
        lessonName="在校园里找一找"
        guess={{ question: '中间教学楼看起来有几层？', options: ['3 层', '4 层', '我还不确定'] }}
        guessVisual={<CampusGuessPicture />}
        reason={{ question: '为什么中间教学楼是 4 层？', options: ['只数上面的三排窗户', '底层入口是第 1 层，再数上面三层', '因为有四个标记'], answer: 1 }}
        checkpoint={{ question: '从下往上数，中间教学楼共有几层？', options: ['3 层', '4 层', '5 层'], answer: 1 }}
        actionReady={floorCount === 4}
        actionHint="请从底层入口开始，按顺序点亮中间教学楼的 4 层。"
        actionCoach={floorCount === 0 ? '先点最下面的底层入口，它就是第 1 层。' : floorCount === 4 ? '四层都点亮了！底层入口也算一层，所以一共有 4 层。' : `已经数到第 ${floorCount} 层了，再点它上面紧挨着的一层。`}
        ask={askOf('campus')}
        narrations={[
          '欢迎来到数学探索课！我是聪聪老师。先看一看这幅校园图，不用数得很仔细，凭感觉猜一猜：中间的教学楼看起来有几层？猜错没关系，下一步用操作来验证。',
          '现在来验证猜想。先看看发光的线索，再从底层入口开始，按从下到上的顺序点亮四层教学楼。每点一层，都要报出这是第几层。',
          '你刚才发现了哪些线索？想一想：要数对教学楼的层数，应该从哪里数起、怎么数才不会漏？选一个能说清楚的理由。',
          '小检测时间！听我读题，选出正确答案。',
          '进入智能闯关！题目是随机出的，答错了会自动再练一次。连对越多，星星越多，加油！',
        ]}
        arena={(round) => {
          const questions: ArenaQuestion[] = [
            { objective: '换材料数层', q: '另一栋楼有底层入口和上面 4 层窗户，一共有几层？', opts: ['4 层', '5 层', '6 层'], answer: '5 层', say: '另一栋楼有底层入口和上面四层窗户，一共有几层？' },
            { objective: '辨析漏数', q: '小林只数了上面 3 排窗户，说教学楼有 3 层。她漏掉了什么？', opts: ['底层入口这一层', '天空中的云', '楼旁的大树'], answer: '底层入口这一层', say: '小林漏掉了什么？' },
            { objective: '数序迁移', q: '从底层数起，第 3 层的上面紧挨着第几层？', opts: ['第 2 层', '第 4 层', '第 5 层'], answer: '第 4 层', say: '从底层数起，第三层上面紧挨着第几层？' },
            { objective: '方法选择', q: '要数清楼层，下面哪种做法最好？', opts: ['确认起点后从下到上一层一层数', '只数看起来最高的窗户', '想到哪层就数哪层'], answer: '确认起点后从下到上一层一层数', say: '要数清楼层，哪种做法最好？' },
            { objective: '新情境点数', q: '操场边有几面小旗？', emo: '🚩🚩🚩🚩🚩', opts: ['4', '5', '6'], answer: '5', say: '数一数，操场边有几面小旗？' },
          ];
          return questions[round % questions.length];
        }}
        onPass={onPass}
      >
      <div className="mt-campus-scene" aria-label="可探索校园场景">
        <div className="mt-sun" />
        <div className="mt-cloud cloud-a" /><div className="mt-cloud cloud-b" />
        <div className="mt-building building-a"><i /><i /><i /><i /><i /><i /></div>
        <div className="mt-building building-b"><i /><i /><i /><i /><i /><i /><i /><i />
          <div className="mt-floor-buttons" aria-label="点亮中间教学楼楼层">
            {['底层入口', '第 2 层', '第 3 层', '第 4 层'].map((label, index) => (
              <button
                key={label}
                className={index < floorCount ? 'counted' : index === floorCount ? 'next' : ''}
                aria-label={`数第 ${index + 1} 层：${label}`}
                onClick={() => countFloor(index)}
              >
                <span>{index < floorCount ? index + 1 : index === floorCount ? '●' : ''}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-building building-c"><i /><i /><i /><i /><i /><i /></div>
        <div className="mt-ground"><span className="tree">🌳</span><span className="kids">🧒🏻　👧🏻　🧒🏽</span><span className="teacher">👩🏻‍🏫</span></div>
        {finds.map((item, index) => (
          <button key={item.id} className={`mt-hotspot ${found === item.id ? 'active' : ''}`} style={{ left: item.left, top: item.top }} onClick={() => { setFound(item.id); playSfx('pop'); speakOnce(item.label, 'zh', 0.92); }} aria-label={`线索 ${index + 1}`}>
            <span>{index + 1}</span>
          </button>
        ))}
        {found && <div className="mt-scene-callout">{finds.find((item) => item.id === found)?.label}</div>}
      </div>
      <div className="mt-floor-counter" aria-live="polite">
        <div><small>{floorCount === 4 ? '数完后回看：底层入口也要算一层' : '直接在中间教学楼上，从底层入口开始点数'}</small><b>已经点亮 {floorCount} / 4 层</b></div>
        {countFeedback && <p className={`mt-feedback ${countFeedback.right ? 'good' : 'try'}`}>{countFeedback.text}</p>}
      </div>
      <div className="mt-teach-note"><b>观察方法</b><span>先确认数的是中间教学楼；从底层入口开始，由下往上一层一层数。</span></div>
      </LearningFlow>
    </section>
  );
}

function NumbersLesson({ onPass }: { onPass: (stars: number) => void }) {
  // 按 1→2→3→4→5 顺序认识：每个数字都要把对应数量的珠子拨到左边
  const [number, setNumber] = useState(1);
  const [trace, setTrace] = useState(0);
  const [completed, setCompleted] = useState<Record<number, boolean>>({});
  const completedCount = [1, 2, 3, 4, 5].filter((n) => completed[n]).length;
  const allDone = completedCount === 5;
  const targetNumber = [1, 2, 3, 4, 5].find((n) => !completed[n]);
  const [abacusCount, setAbacusCount] = useState(0);
  const [abacusFeedback, setAbacusFeedback] = useState<{ right: boolean; text: string } | null>(null);
  const [draggingBead, setDraggingBead] = useState<{ index: number; left: number } | null>(null);
  const abacusRef = useRef<HTMLDivElement>(null);
  const moveBead = (index: number) => {
    if (completed[number]) return;
    if (index !== abacusCount) {
      feedback(false);
      teacherSay('从最靠近中梁、还在右边的那颗珠开始，一颗一颗拨过去。');
      setAbacusFeedback({ right: false, text: '先拨最靠近中梁、还在右边的那颗珠。' });
      return;
    }
    const next = abacusCount + 1;
    setAbacusCount(next);
    feedback(true);
    if (next === number) {
      const nc = { ...completed, [number]: true };
      setCompleted(nc);
      const finishedAll = [1, 2, 3, 4, 5].every((n) => nc[n]);
      teacherSay(finishedAll ? '五个数字都拨完了，你真棒！' : `拨好了，左边 ${number} 颗珠，和数字 ${number} 一样多。`);
      setAbacusFeedback({ right: true, text: finishedAll ? '1～5 全部完成！' : `数字 ${number} 完成：左边正好 ${number} 颗珠。` });
      const nextTarget = [1, 2, 3, 4, 5].find((n) => !nc[n]);
      if (nextTarget) setTimeout(() => { setNumber(nextTarget); setAbacusCount(0); }, 1500);
    } else {
      teacherSay(`现在左边有 ${next} 颗珠，继续拨。`);
      setAbacusFeedback({ right: true, text: `左边已经有 ${next} 颗珠，继续拨。` });
    }
  };
  useEffect(() => {
    // 选中数字后，从 1 接着数到该数（语音逐个报数）
    speakSeq(Array.from({ length: number }, (_, i) => String(i + 1)), 'zh', 0.8);
  }, [number]);
  const beginBeadDrag = (event: React.PointerEvent<HTMLButtonElement>, index: number, position: number) => {
    event.preventDefault();
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* 不支持捕获时仍可通过事件坐标判断 */ }
    setDraggingBead({ index, left: position });
    playSfx('tap');
  };
  const moveDraggedBead = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (draggingBead == null) return;
    const rect = abacusRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.max(7, Math.min(93, ((event.clientX - rect.left) / rect.width) * 100));
    setDraggingBead({ ...draggingBead, left });
  };
  const finishBeadDrag = (event: React.PointerEvent<HTMLButtonElement>, index: number) => {
    const rect = abacusRef.current?.getBoundingClientRect();
    const movedLeft = !!rect && event.clientX < rect.left + rect.width / 2;
    setDraggingBead(null);
    if (!movedLeft) {
      feedback(false);
      teacherSay('要把珠子越过中梁，拨到左边去。');
      setAbacusFeedback({ right: false, text: '还没有越过中梁，试着把珠子拖到左边。' });
      return;
    }
    moveBead(index);
  };
  return (
    <section className="mt-lesson">
      <div className="mt-lesson-copy">
        <span className="mt-kicker">1～5 的认识 · 具体 → 图示 → 符号</span>
        <h2>一个数，可以有三种样子</h2>
        <p>选择数字，观察实物数量和点子同时变化，再沿着笔画方向描一遍。</p>
      </div>
      <LearningFlow
        lessonId="numbers"
        lessonName="1～5 的认识"
        guess={{ question: '先看图，不逐个点数，你觉得桌上有几个南瓜？', options: ['3 个', '4 个', '5 个'] }}
        guessVisual={<NumberGuessPicture />}
        reason={{ question: '为什么要把实物、点子和数字放在一起看？', options: ['为了让页面更热闹', '它们表示的是同一个数量', '因为数字一定比实物大'], answer: 1 }}
        checkpoint={{ question: '4 朵花应该和哪个数字连起来？', options: ['3', '4', '5'], answer: 1 }}
        actionReady={allDone}
        actionHint={allDone ? '' : `依次认识 1～5：每个数字都把对应数量的珠子拨到左边（已完成 ${completedCount}/5）。`}
        actionCoach={allDone ? '1～5 全部完成！每个数字的实物、点子、数字和珠子都对上了。' : targetNumber === number ? (abacusCount === 0 ? `现在认识数字 ${number}：从最靠近中梁、还在右边的第 1 颗珠开始，一颗一颗拨。` : `左边已经有 ${abacusCount} 颗珠，还差 ${number - abacusCount} 颗。`) : `下一个是数字 ${targetNumber}：点上面的 ${targetNumber}，把 ${targetNumber} 颗珠子拨到左边。`}
        ask={askOf('numbers')}
        narrations={[
          '先看这幅图，不逐个点数，你觉得桌上有几个南瓜？大胆猜一猜，猜错也没关系。',
          '一个数有三种样子：看得见的实物、可以数的点子、还有数字符号。我们从 1 开始按顺序认识到 5：每选中一个数字，就把它对应数量的珠子一颗一颗拨到左边，拨完会自动到下一个数字。最后还可以在写字板上描一描。',
          '实物、点子和数字为什么放在一起看？选出能说清楚的理由。',
          '小检测时间！听我读题，选出正确答案。',
          '进入智能闯关！题目是随机出的，答错了会自动再练一次。连对越多，星星越多，加油！',
        ]}
        arena={(round) => {
          const questions: ArenaQuestion[] = [
            { objective: '多表征对应', q: '●●●●● 和哪个数字表示同一个数量？', opts: ['4', '5', '6'], answer: '5', say: '五个点和哪个数字表示同一个数量？' },
            { objective: '数序迁移', q: '数字卡 2、3、？、5，问号处应该放几？', opts: ['2', '4', '6'], answer: '4', say: '数字卡二、三、问号、五，问号处应该放几？' },
            { objective: '错误辨析', q: '聪聪说“4 个草莓要配数字 5”，这句话对吗？', opts: ['不对，应该配 4', '对，应该配 5', '只看草莓颜色'], answer: '不对，应该配 4', say: '四个草莓要配数字五，对吗？' },
            { objective: '倒着想一想', q: '有 5 个气球，飞走 1 个，还剩几个？', opts: ['3', '4', '5'], answer: '4', say: '有五个气球，飞走一个，还剩几个？' },
            { objective: '表示方法', q: '想让别人一眼看出数量 3，可以用什么？', opts: ['3 个点子或数字 3', '只写一条横线', '画很多不相同的图'], answer: '3 个点子或数字 3', say: '怎样让别人一眼看出数量三？' },
          ];
          return questions[round % questions.length];
        }}
        onPass={onPass}
      >
      <section className="mt-number-showcase" aria-label={`数字 ${number} 的三种表示`}>
        <div className="mt-number-selector"><span>从 1 开始，按顺序认识：每个数字都把对应数量的珠子拨到左边（已完成 {completedCount}/5）</span>{[1, 2, 3, 4, 5].map((n) => <button key={n} className={`${number === n ? 'active' : ''} ${completed[n] ? 'done' : ''}`} onClick={() => { setNumber(n); setAbacusCount(0); setDraggingBead(null); setAbacusFeedback(null); }}>{n}</button>)}</div>
        <div className="mt-cra-heading"><span>数量 {number}</span><b>看得见 · 数得出 · 写得下</b></div>
        <div className="mt-cra-grid">
          <article><small>① 看得见的数量</small><div className="mt-object-row">{Array.from({ length: number }, (_, i) => <span key={i}>{OBJECTS[number]}</span>)}</div></article>
          <article><small>② 可以数的点子</small><div className="mt-dot-frame">{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= number ? 'filled' : ''} />)}</div></article>
          <article className="mt-symbol-card"><small>③ 表示数量的数字</small><strong>{number}</strong></article>
        </div>
      </section>
      <section className="mt-number-stations" aria-label="认数拓展活动">
        <div className="mt-stations-heading"><span>动手巩固</span><b>换一种方法，再认识一次 {number}</b></div>
        <div className="mt-textbook-stations">
        <article><small>拨一拨</small><div className="mt-abacus" ref={abacusRef} role="group" aria-label={`计数器：目标拨出 ${number} 颗珠，当前已拨出 ${abacusCount} 颗。拖动珠子越过中梁到左边`}><i /><em aria-hidden="true" /><span className="mt-abacus-zone left" aria-hidden="true" /><span className="mt-abacus-zone right" aria-hidden="true" />{[0, 1, 2, 3, 4].map((index) => {
          const active = index < abacusCount;
          // 已拨的珠贴着中梁左侧排成串，剩下的贴着右侧；改数字时靠 left 过渡产生滑动动画
          // 五颗珠时最外侧仍保留轨道边距；避免窄卡片下珠子越出框。
          const pos = active ? 42 - 7 * index : 58 + 7 * (index - abacusCount);
          const dragPos = draggingBead?.index === index ? draggingBead.left : pos;
          return <button key={index} type="button" style={{ left: `${dragPos}%` }} className={`${active ? 'active' : ''} ${draggingBead?.index === index ? 'dragging' : ''}`} onPointerDown={(event) => beginBeadDrag(event, index, pos)} onPointerMove={moveDraggedBead} onPointerUp={(event) => finishBeadDrag(event, index)} onPointerCancel={() => setDraggingBead(null)} onClick={(event) => { if (event.detail === 0) moveBead(index); }} aria-label={active ? `第 ${index + 1} 颗珠，已拨到左边` : `第 ${index + 1} 颗珠，拖到左边`} />;
        })}</div><b>向左拨出 {abacusCount} / {number} 颗珠</b>{abacusFeedback && <p className={`mt-station-feedback ${abacusFeedback.right ? 'good' : 'try'}`}>{abacusFeedback.text}</p>}</article>
        <article><small>摆一摆</small><div className="mt-blocks">{Array.from({ length: number }, (_, index) => <i key={index} />)}</div><b>{number} 个方块排成一排</b></article>
        <article><small>生活中找一找</small><div className="mt-life-number">{number === 1 ? '👃' : number === 2 ? '👟 👟' : number === 3 ? '🚦' : number === 4 ? '🚗' : '⭐ ⭐ ⭐ ⭐ ⭐'}</div><b>它也可以表示数量 {number}</b></article>
        </div>
      </section>
      <DigitPractice number={number} replay={trace} onReplay={() => { setTrace((value) => value + 1); speakOnce(String(number), 'zh', 0.8); }} />
      </LearningFlow>
    </section>
  );
}

function CompareLesson({ onPass }: { onPass: (stars: number) => void }) {
  const [left, setLeft] = useState(3);
  const [right, setRight] = useState(3);
  const [fruit, setFruit] = useState({ icon: '🍑', name: '桃子' });
  const [pairedCount, setPairedCount] = useState(0);
  const [selectedMonkey, setSelectedMonkey] = useState<number | null>(null);
  const [pairFeedback, setPairFeedback] = useState<{ right: boolean; text: string } | null>(null);
  const relation = left === right ? '=' : left > right ? '>' : '<';
  const max = Math.max(left, right);
  const pairLimit = Math.min(left, right);
  const chooseExample = (nextLeft: number, nextRight: number, nextFruit: { icon: string; name: string }) => {
    setLeft(nextLeft);
    setRight(nextRight);
    setFruit(nextFruit);
    setPairedCount(0);
    setSelectedMonkey(null);
    setPairFeedback(null);
  };
  const adjustLeft = (next: number) => { setLeft(next); setPairedCount(0); setSelectedMonkey(null); setPairFeedback(null); };
  const adjustRight = (next: number) => { setRight(next); setPairedCount(0); setSelectedMonkey(null); setPairFeedback(null); };
  const pair = (index: number) => {
    if (index < pairedCount) return;
    if (index !== pairedCount) {
      feedback(false);
      teacherSay('从最上面还没有连线的一对开始，一个小猴配一个水果。');
      setPairFeedback({ right: false, text: '先配最上面还没有连线的一对。' });
      return;
    }
    const next = pairedCount + 1;
    setPairedCount(next);
    feedback(true);
    teacherSay(next === pairLimit ? '配完了！看看哪一边还有剩余。' : '配好一对了，再配下一对。');
    setPairFeedback({ right: true, text: next === pairLimit ? '配完了！现在观察哪边还有剩余。' : '配好一对了，再配下一对。' });
  };
  const pickMonkey = (index: number) => {
    if (index < pairedCount) return;
    if (index >= pairLimit) {
      feedback(false);
      setPairFeedback({ right: false, text: `第 ${index + 1} 只小猴暂时没有${fruit.name}可配，先完成上面的一对。` });
      return;
    }
    if (index !== pairedCount) {
      feedback(false);
      teacherSay('从最上面还没有配对的小猴开始。');
      setPairFeedback({ right: false, text: '从最上面还没有配对的小猴开始。' });
      return;
    }
    setSelectedMonkey(index);
    playSfx('tap');
    setPairFeedback({ right: true, text: `选中了第 ${index + 1} 只小猴，再点一个${fruit.name}。` });
  };
  const pickFruit = (index: number) => {
    if (selectedMonkey === null) {
      feedback(false);
      teacherSay('先点一只小猴，再给它分水果。');
      setPairFeedback({ right: false, text: '先点一只小猴，再给它分一个水果。' });
      return;
    }
    if (index !== selectedMonkey) {
      feedback(false);
      setPairFeedback({ right: false, text: '请把选中的小猴和同一排的水果配在一起。' });
      return;
    }
    setSelectedMonkey(null);
    pair(index);
  };
  const readSentence = () => {
    const sym = relation === '=' ? '等于' : relation === '>' ? '大于' : '小于';
    const cmp = relation === '=' ? `${fruit.name}和小猴同样多` : relation === '>' ? `小猴比${fruit.name}多` : `小猴比${fruit.name}少`;
    speakOnce(`${left} ${sym} ${right}。${cmp}。`, 'zh', 0.88);
  };
  return (
    <section className="mt-lesson">
      <div className="mt-lesson-copy">
        <span className="mt-kicker">比大小 · 一一对应</span>
        <h2>先配对，再写符号</h2>
        <p>每只小猴分一个水果。配完后哪边还有剩余，哪边就更多；都不剩就是同样多。</p>
      </div>
      <LearningFlow
        lessonId="compare"
        lessonName="比大小"
        guess={{ question: '3 只小猴和 2 个香蕉一个对一个配，哪边会有剩余？', options: ['小猴', '香蕉', '都不剩'] }}
        guessVisual={<CompareGuessPicture />}
        reason={{ question: '怎样判断哪边更多最可靠？', options: ['看图形大小', '一个小猴配一个水果，看哪边有剩余', '凭感觉'], answer: 1 }}
        checkpoint={{ question: '3 只小猴和 4 个梨，应该用哪个符号？', options: ['3 = 4', '3 > 4', '3 < 4'], answer: 2 }}
        actionReady={left === 3 && right === 3 && fruit.name === '桃子' && pairedCount === 3}
        actionHint="本次任务是：给 3 只小猴各分 1 个桃子，完成 3 对一一配对。"
        actionCoach={left !== 3 || right !== 3 || fruit.name !== '桃子' ? '先选择“3 和 3 · 同样多”，让 3 只小猴和 3 个桃子准备好。' : selectedMonkey !== null ? `第 ${selectedMonkey + 1} 只小猴在等桃子，点同一排的桃子给它。` : pairedCount === 3 ? '3 只小猴都有桃子了，哪边都没有剩余，所以同样多。' : `已经配好 ${pairedCount} 对，还有 ${3 - pairedCount} 只小猴没有桃子。`}
        ask={askOf('compare')}
        narrations={[
          '三只小猴和两个香蕉，一个对一个配，你觉得哪边会有剩余？先猜一猜。',
          '先完成一个明确任务：给 3 只小猴各分 1 个桃子。先点最上面的小猴，再点同一排的桃子，连成一对；三对都完成后，再自由切换其他数量，看看什么时候会有剩余。',
          '怎样判断哪边更多最可靠？选出你的理由。',
          '小检测时间！听我读题，选出正确答案。',
          '进入智能闯关！题目是随机出的，答错了会自动再练一次。连对越多，星星越多，加油！',
        ]}
        arena={(round) => {
          const questions: ArenaQuestion[] = [
            { objective: '一一对应迁移', q: '4 支铅笔和 4 个笔帽一个配一个，最后会怎样？', opts: ['都配完，没有剩余', '铅笔有剩余', '笔帽有剩余'], answer: '都配完，没有剩余', say: '四支铅笔和四个笔帽一个配一个，最后会怎样？' },
            { objective: '关系转符号', q: '小兔 2 只，小鸡 5 只，2 和 5 中间填什么？', opts: ['＞', '＜', '＝'], answer: '＜', say: '小兔两只，小鸡五只，二和五中间填什么符号？' },
            { objective: '反例辨析', q: '“图画得更大的一边，数量一定更多。”这句话对吗？', opts: ['不对，要一个一个配对或数', '对，图大就更多', '只看颜色'], answer: '不对，要一个一个配对或数', say: '图画得更大的一边，数量一定更多吗？' },
            { objective: '数量变化', q: '原来 3 个杯子和 3 个盘子同样多，又添 1 个盘子，哪边更多？', opts: ['杯子更多', '盘子更多', '还是同样多'], answer: '盘子更多', say: '三只杯子和三只盘子同样多，又添一个盘子，哪边更多？' },
            { objective: '方法选择', q: '比较两组物品时，哪种方法最可靠？', opts: ['一个对一个配，看有没有剩余', '凭感觉看谁画得大', '只数其中一边'], answer: '一个对一个配，看有没有剩余', say: '比较两组物品时，哪种方法最可靠？' },
          ];
          return questions[round % questions.length];
        }}
        onPass={onPass}
      >
      <div className="mt-example-switch" aria-label="教材三组比较情境">
        <button onClick={() => chooseExample(3, 3, { icon: '🍑', name: '桃子' })}>3 和 3 · 同样多</button>
        <button onClick={() => chooseExample(3, 2, { icon: '🍌', name: '香蕉' })}>3 和 2 · 谁更多</button>
        <button onClick={() => chooseExample(3, 4, { icon: '🍐', name: '梨' })}>3 和 4 · 谁更少</button>
      </div>
      <div className="mt-compare-controls">
        <label>小猴 <button onClick={() => adjustLeft(Math.max(1, left - 1))}>−</button><b>{left}</b><button onClick={() => adjustLeft(Math.min(5, left + 1))}>＋</button></label>
        <strong className="mt-live-relation">{relation}</strong>
        <label>{fruit.name} <button onClick={() => adjustRight(Math.max(1, right - 1))}>−</button><b>{right}</b><button onClick={() => adjustRight(Math.min(5, right + 1))}>＋</button></label>
        <button className="mt-teacher-replay" onClick={readSentence}>🔊 读一读</button>
      </div>
      <div className="mt-pairing-stage">
        <p>已配对 <b>{pairedCount}</b> / {pairLimit} 对</p>
        {Array.from({ length: max }, (_, index) => (
          <div className="mt-pair-row" key={index}>
            {index < left ? <button className={`mt-pair-token mt-pair-monkey ${selectedMonkey === index ? 'selected' : ''} ${index < pairedCount ? 'paired' : ''}`} onClick={() => pickMonkey(index)} aria-label={`第 ${index + 1} 只小猴${index < pairedCount ? '，已配对' : ''}`}>🐒</button> : <span className="empty">·</span>}
            {index < pairLimit ? <span className={`mt-pair-link ${index < pairedCount ? 'linked' : ''} ${selectedMonkey === index ? 'awaiting' : ''}`} aria-label={index < pairedCount ? `第 ${index + 1} 对已连线` : undefined}>{index < pairedCount ? '✓' : selectedMonkey === index ? '→' : ''}</span> : <span className="mt-pair-link empty" aria-hidden="true" />}
            {index < right ? <button className={`mt-pair-token mt-pair-fruit ${index < pairedCount ? 'paired' : ''}`} onClick={() => pickFruit(index)} aria-label={`第 ${index + 1} 个${fruit.name}${index < pairedCount ? '，已配对' : ''}`}>{fruit.icon}</button> : <span className="empty">·</span>}
          </div>
        ))}
        {pairFeedback && <p className={`mt-feedback ${pairFeedback.right ? 'good' : 'try'}`}>{pairFeedback.text}</p>}
      </div>
      <div className="mt-equation"><b>{left}</b><em>{relation}</em><b>{right}</b><span>{left === right ? `小猴和${fruit.name}同样多` : left > right ? `小猴比${fruit.name}多` : `小猴比${fruit.name}少`}</span></div>
      </LearningFlow>
    </section>
  );
}

function OrdinalLesson({ onPass }: { onPass: (stars: number) => void }) {
  const [from, setFrom] = useState<'left' | 'right'>('left');
  const [selected, setSelected] = useState<number | null>(null);
  const [directionChosen, setDirectionChosen] = useState(false);
  const [positionFeedback, setPositionFeedback] = useState<{ right: boolean; text: string } | null>(null);
  const people = ['👩🏻', '🧒🏻', '👩🏽', '👨🏻', '🧑🏻'];
  const visual = from === 'left' ? people : [...people].reverse();
  const correct = directionChosen && selected === 1;
  return (
    <section className="mt-lesson">
      <div className="mt-lesson-copy">
        <span className="mt-kicker">第几 · 总数与次序</span>
        <h2>“5 个人”和“第 2 个人”一样吗？</h2>
        <p>5 表示一共有多少人；第 2 表示从规定方向数，一个人的位置。</p>
      </div>
      <LearningFlow
        lessonId="ordinal"
        lessonName="第几"
        guess={{ question: '从火车方向开始数，穿绿色衣服的小朋友排第几？', options: ['第 1', '第 2', '第 3'] }}
        guessVisual={<OrdinalGuessPicture />}
        reason={{ question: '确定“第几”之前，必须先知道什么？', options: ['从哪一边开始数', '队伍里谁最高', '一共有多少种颜色'], answer: 0 }}
        checkpoint={{ question: '队伍里一共有 5 人，小朋友排第 2。“5”和“2”的意思相同吗？', options: ['相同', '不同'], answer: 1 }}
        actionReady={correct}
        actionHint="请先选定方向，再点出从该方向数的第 2 个人。"
        actionCoach={!directionChosen ? '先选择从左数或从右数；起点不一样，“第 2”也会不一样。' : correct ? `找对了：从${from === 'left' ? '左' : '右'}数，第 2 个人已经亮起来。` : `起点已经定在${from === 'left' ? '左' : '右'}边，现在从起点数到第 2 个人。`}
        ask={askOf('ordinal')}
        narrations={[
          '从火车方向开始数，穿绿色衣服的小朋友排第几？先凭观察猜一猜。',
          '5 表示一共有多少人，第 2 表示一个人站的位置，意思不一样。先选好从哪边开始数，再点出从那边数的第 2 个人，点对了他会亮起来。',
          '确定「第几」之前，必须先知道什么？选出你的理由。',
          '小检测时间！听我读题，选出正确答案。',
          '进入智能闯关！题目是随机出的，答错了会自动再练一次。连对越多，星星越多，加油！',
        ]}
        arena={(round) => {
          const questions: ArenaQuestion[] = [
            { objective: '换方向定位', q: '🐶🐱🐰🐼🐸 从右边数，🐰排第几？', opts: ['第 2', '第 3', '第 4'], answer: '第 3', say: '从右边数，小兔排第几？' },
            { objective: '总数与序数', q: '队伍里有 6 人，“第 4 人”里的 4 表示什么？', opts: ['一个位置', '一共有 4 人', '4 种颜色'], answer: '一个位置', say: '第4人里的4表示什么？' },
            { objective: '确定起点', q: '想找“第 2 个”，先要弄清什么？', opts: ['从哪边开始数', '谁跑得最快', '谁的衣服最好看'], answer: '从哪边开始数', say: '想找第2个，先要弄清什么？' },
            { objective: '位置变化', q: '小熊从队伍第 3 个往前走 1 个位置，现在是第几？', opts: ['第 1', '第 2', '第 4'], answer: '第 2', say: '小熊从第3个往前走一个位置，现在是第几？' },
            { objective: '读图判断', q: '🐧🐤🐤🐤 从左边数，最左边的🐧是第几个？', opts: ['第 1', '第 3', '第 4'], answer: '第 1', say: '从左边数，最左边的企鹅是第几个？' },
          ];
          return questions[round % questions.length];
        }}
        onPass={onPass}
      >
      <div className="mt-direction-switch"><button className={directionChosen && from === 'left' ? 'active' : ''} onClick={() => { setFrom('left'); setSelected(null); setDirectionChosen(true); setPositionFeedback({ right: true, text: '起点定好了：现在从左边开始数。' }); }}>从左数 →</button><button className={directionChosen && from === 'right' ? 'active' : ''} onClick={() => { setFrom('right'); setSelected(null); setDirectionChosen(true); setPositionFeedback({ right: true, text: '起点定好了：现在从右边开始数。' }); }}>← 从右数</button></div>
      <div className="mt-ordinal-route" aria-live="polite">{directionChosen ? <><b>{from === 'left' ? '左边' : '右边'}是起点</b><span>① 从这里开始</span><i>→</i><span>② 找第 2 个人</span></> : <span>先定方向，才知道从哪里算第 1 个。</span>}</div>
      <div className="mt-platform"><div className="mt-train">🚆</div><div className="mt-queue">{visual.map((person, index) => <button key={`${from}-${index}`} className={`${selected === index ? (correct ? 'correct' : 'wrong') : ''} ${directionChosen && index === 0 ? 'start' : ''} ${directionChosen && index === 1 ? 'target' : ''}`} aria-label={`${directionChosen ? `从${from === 'left' ? '左' : '右'}数的第 ${index + 1} 个人` : '请先选择计数方向'}`} onClick={() => { if (!directionChosen) { feedback(false); teacherSay('先选从左数还是从右数，再找第 2 个人。'); setPositionFeedback({ right: false, text: '还没有确定起点，先选择从左数还是从右数。' }); return; } setSelected(index); const right = index === 1; feedback(right); setPositionFeedback({ right, text: right ? '找对了！这是从这个方向数的第 2 个人。' : '先从选定的起点开始，一个一个数到第 2 个。' }); if (right) speakOnce('找对了！方向变了，第几也会跟着变。', 'zh', 0.9); }}><span>{person}</span><small>{directionChosen ? `第 ${index + 1}` : '？'}</small>{directionChosen && index === 0 && <i>起点</i>}</button>)}</div></div>
      <div className="mt-ordinal-facts">
        <article><small>队伍一共有</small><b>5</b><span>人</span></article>
        <article><small>第 2 人前面有</small><b>1</b><span>人</span></article>
        <article><small>第 2 人后面有</small><b>3</b><span>人</span></article>
      </div>
      <div className="mt-teach-note"><b>任务</b><span>{directionChosen ? `请点出从${from === 'left' ? '左' : '右'}数的第 2 个人。` : '先选择从左数还是从右数，再点出第 2 个人。'}</span></div>
      {positionFeedback && <p className={`mt-feedback ${positionFeedback.right ? 'good' : 'try'}`}>{positionFeedback.text}</p>}
      </LearningFlow>
    </section>
  );
}

/** 拖拽分一分：把 5 个玉米拖进两个篮子（学具操作的数字化） */
function ComposeDragStage({ onPlaced, onProgress }: { onPlaced: (leftCount: number) => void; onProgress: (placed: number, leftCount: number, rightCount: number) => void }) {
  type Corn = { id: number; where: 'pool' | 'A' | 'B' };
  const [corns, setCorns] = useState<Corn[]>(() => Array.from({ length: 5 }, (_, id) => ({ id, where: 'pool' as const })));
  const [dragId, setDragId] = useState<number | null>(null);
  const [selectedCorn, setSelectedCorn] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [transferFeedback, setTransferFeedback] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [over, setOver] = useState<'A' | 'B' | null>(null);
  const completedRef = useRef(false);
  const basketARef = useRef<HTMLDivElement>(null);
  const basketBRef = useRef<HTMLDivElement>(null);

  const countA = corns.filter((c) => c.where === 'A').length;
  const countB = corns.filter((c) => c.where === 'B').length;
  const allPlaced = countA + countB === 5;

  const placeCorn = (id: number, target: 'A' | 'B') => {
    const corn = corns.find((item) => item.id === id);
    if (!corn || corn.where !== 'pool') return;
    const nextA = countA + (target === 'A' ? 1 : 0);
    const nextB = countB + (target === 'B' ? 1 : 0);
    setCorns((items) => items.map((item) => (item.id === id ? { ...item, where: target } : item)));
    setHistory((items) => [...items, id]);
    setSelectedCorn(null);
    playSfx('pop');
    setTransferFeedback(`第 ${countA + countB + 1} 个玉米放进了${target === 'A' ? '左' : '右'}篮子。`);
    onProgress(nextA + nextB, nextA, nextB);
    if (nextA + nextB === 5 && !completedRef.current) {
      completedRef.current = true;
      speakOnce(`5 可以分成 ${nextA} 和 ${nextB}。`, 'zh', 0.9);
      onPlaced(nextA);
    }
  };

  const hitTest = (x: number, y: number): 'A' | 'B' | null => {
    for (const [key, ref] of [['A', basketARef], ['B', basketBRef]] as const) {
      const r = ref.current?.getBoundingClientRect();
      if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return key;
    }
    return null;
  };
  const onMove = (e: React.PointerEvent) => {
    if (dragId == null) return;
    setPos({ x: e.clientX, y: e.clientY });
    setOver(hitTest(e.clientX, e.clientY));
  };
  const onUp = (e: React.PointerEvent) => {
    if (dragId == null) return;
    const target = hitTest(e.clientX, e.clientY);
    if (target) placeCorn(dragId, target);
    else setTransferFeedback('还没有放进篮子，拖到任意一个篮子里再松手。');
    setDragId(null);
    setOver(null);
  };
  const undoLast = () => {
    const id = history[history.length - 1];
    if (id === undefined) return;
    setCorns((items) => items.map((item) => (item.id === id ? { ...item, where: 'pool' } : item)));
    setHistory((items) => items.slice(0, -1));
    setSelectedCorn(null);
    completedRef.current = false;
    setTransferFeedback('已拿回最后一个玉米，可以换一种分法。');
    onProgress(Math.max(0, countA + countB - 1), countA - (corns.find((item) => item.id === id)?.where === 'A' ? 1 : 0), countB - (corns.find((item) => item.id === id)?.where === 'B' ? 1 : 0));
    playSfx('tap');
  };
  const reset = () => {
    setCorns((items) => items.map((item) => ({ ...item, where: 'pool' as const })));
    setHistory([]);
    setSelectedCorn(null);
    completedRef.current = false;
    setTransferFeedback('已经清空两个篮子，试试另一种分法。');
    onProgress(0, 0, 0);
  };

  return (
    <div className="mt-drag-stage" onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <div className="mt-drag-pool" aria-label="待分的玉米">
        <small>拖玉米进篮子；不方便拖动时，先点玉米再点篮子</small>
        <div>
          {corns.filter((c) => c.where === 'pool').map((c) => (
            <button key={c.id} className={`mt-drag-corn ${selectedCorn === c.id ? 'selected' : ''}`}
              onPointerDown={(e) => {
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                setDragId(c.id);
                setSelectedCorn(c.id);
                setPos({ x: e.clientX, y: e.clientY });
                playSfx('tap');
              }}
              onClick={() => { if (dragId === null) setSelectedCorn(c.id); }}
              aria-label={`第 ${c.id + 1} 个玉米${selectedCorn === c.id ? '，已选中' : ''}`}
            >🌽</button>
          ))}
          {corns.every((c) => c.where !== 'pool') && <i>玉米都分完了</i>}
        </div>
      </div>
      <div className="mt-drag-baskets">
        <div className={`mt-drag-basket ${over === 'A' ? 'over' : ''} ${selectedCorn !== null ? 'ready' : ''}`} ref={basketARef} role="button" tabIndex={0} aria-label={`左边篮子，已有 ${countA} 个玉米`} onClick={() => { if (dragId !== null) return; if (selectedCorn === null) { setTransferFeedback('先点一个玉米，再点篮子。'); feedback(false); } else placeCorn(selectedCorn, 'A'); }} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && selectedCorn !== null) { event.preventDefault(); placeCorn(selectedCorn, 'A'); } }}>
          <span className="mt-drag-basket-emo" aria-hidden="true">🧺</span>
          <div className="mt-drag-basket-corns">{corns.filter((c) => c.where === 'A').map((c) => <span key={c.id}>🌽</span>)}</div>
          <b>{countA}</b>
        </div>
        <div className={`mt-drag-basket ${over === 'B' ? 'over' : ''} ${selectedCorn !== null ? 'ready' : ''}`} ref={basketBRef} role="button" tabIndex={0} aria-label={`右边篮子，已有 ${countB} 个玉米`} onClick={() => { if (dragId !== null) return; if (selectedCorn === null) { setTransferFeedback('先点一个玉米，再点篮子。'); feedback(false); } else placeCorn(selectedCorn, 'B'); }} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && selectedCorn !== null) { event.preventDefault(); placeCorn(selectedCorn, 'B'); } }}>
          <span className="mt-drag-basket-emo" aria-hidden="true">🧺</span>
          <div className="mt-drag-basket-corns">{corns.filter((c) => c.where === 'B').map((c) => <span key={c.id}>🌽</span>)}</div>
          <b>{countB}</b>
        </div>
      </div>
      {dragId != null && <span className="mt-drag-ghost" style={{ left: pos.x, top: pos.y }}>🌽</span>}
      {!allPlaced && <em className="mt-drag-hint">{selectedCorn !== null ? '玉米已选中：把它放进左边或右边的篮子' : '先全部拖完，再看看分成了几和几'}</em>}
      {transferFeedback && <p className="mt-drag-feedback" aria-live="polite">{transferFeedback}</p>}
      {history.length > 0 && !allPlaced && <button className="mt-drag-undo" onClick={undoLast}>↶ 拿回最后一个</button>}
      {allPlaced && (
        <button className="mt-drag-reset" onClick={reset}>↺ 换一种分法再拖一次</button>
      )}
    </div>
  );
}

/** 语音跟读：把分与合的句子读给聪聪听，AI 打分 */
function ComposeReadAloud({ sentence }: { sentence: string }) {
  const [scores, setScores] = useState<number[]>([]);
  const [best, setBest] = useState(false);
  const onResult = (said: string) => {
    const score = readScore(sentence, said);
    setScores((ss) => [...ss, score]);
    const ok = score >= 0.5;
    feedback(ok);
    if (ok) setBest(true);
  };
  const asr = useAsr(onResult);
  return (
    <div className="mt-readaloud">
      <small>读给聪聪听 🎤</small>
      <b className="mt-readaloud-sentence">「{sentence}」</b>
      <div className="mt-readaloud-ops">
        <button onClick={() => speakOnce(sentence, 'zh', 0.85)}>🔊 听示范</button>
        {asr.supported ? (
          <button className={`mt-mic ${asr.listening ? 'listening' : ''}`} onClick={() => { if (!asr.listening) asr.start(); }}>
            {asr.listening ? '🎙️ 正在听…请读' : '🎤 我来读'}
          </button>
        ) : (
          <button onClick={() => { speakOnce(sentence, 'zh', 0.85); }}>设备不支持语音识别 · 听完示范也算读过</button>
        )}
      </div>
      {asr.said && <i className="mt-readaloud-heard">听到你说：{asr.said}</i>}
      {scores.length > 0 && (
        <div className="mt-readaloud-scores">
          {scores.map((s, i) => <span key={i} className={s >= 0.5 ? 'ok' : 'no'}>{Math.round(s * 100)} 分</span>)}
          {best && <span className="ok">✓ 读得好！</span>}
        </div>
      )}
    </div>
  );
}

function ComposeLesson({ onPass }: { onPass: (stars: number) => void }) {
  const [left, setLeft] = useState(2);
  const [seen, setSeen] = useState<number[]>([]);
  const [draggedSplit, setDraggedSplit] = useState(false);
  const [dragProgress, setDragProgress] = useState({ placed: 0, left: 0, right: 0 });
  const right = 5 - left;
  const sentence = `5 可以分成 ${left} 和 ${right}`;
  const recordSplit = (n: number) => {
    setLeft(n);
    setSeen((values) => (values.includes(n) ? values : [...values, n]));
    playSfx('correct');
    speakOnce(`5 可以分成 ${n} 和 ${5 - n}。`, 'zh', 0.9);
  };
  return (
    <section className="mt-lesson">
      <div className="mt-lesson-copy">
        <span className="mt-kicker">分与合 · 整体和部分</span>
        <h2>把 5 个玉米分成两堆</h2>
        <p>把玉米拖进两个篮子，看 5 怎样拆成两部分。交换左右位置，合起来仍然是 5。</p>
      </div>
      <LearningFlow
        lessonId="compose"
        lessonName="分与合"
        guess={{ question: '把 5 个玉米分成两堆，下面哪种分法可行？', options: ['1 和 4', '2 和 3', '两种都可以'] }}
        guessVisual={<ComposeGuessPicture />}
        reason={{ question: '为什么 2 和 3 合起来是 5？', options: ['把两部分重新数在一起共有 5 个', '因为两个数字长得像 5', '左右两堆一样多'], answer: 0 }}
        checkpoint={{ question: '5 可以分成 2 和几？', options: ['1', '2', '3'], answer: 2 }}
        actionReady={draggedSplit}
        actionHint="请把 5 个玉米全部拖进两个篮子，完成一种分法。分法按钮只能用来回看，不会代替动手操作。"
        actionCoach={dragProgress.placed === 0 ? '先选一个玉米，再把它放进左边或右边的篮子。' : draggedSplit ? `5 个玉米都分好了：左边 ${dragProgress.left} 个，右边 ${dragProgress.right} 个。` : `已经放好 ${dragProgress.placed} 个玉米，还剩 ${5 - dragProgress.placed} 个；继续把每一个都放进篮子。`}
        ask={askOf('compose')}
        narrations={[
          '把 5 个玉米分成两堆，下面的分法哪种可行？先猜一猜。',
          '轮到你动手分一分：把 5 个玉米全部拖进两个篮子里，拖完聪聪会读出分法。下面的分法卡可以帮你回看，但不能代替拖拽操作。最后把「5 可以分成几和几」读给我听，我来给你打分。',
          '为什么 2 和 3 合起来是 5？选出能说清楚的理由。',
          '小检测时间！听我读题，选出正确答案。',
          '进入智能闯关！题目是随机出的，答错了会自动再练一次。连对越多，星星越多，加油！',
        ]}
        arena={(round) => {
          const questions: ArenaQuestion[] = [
            { objective: '逆向找部分', q: '一共有 5 颗星，其中红色有 2 颗，蓝色有几颗？', opts: ['2', '3', '5'], answer: '3', say: '一共有五颗星，其中红色两颗，蓝色有几颗？' },
            { objective: '加减互相检查', q: '知道 2 和 3 组成 5，可以用哪道算式检查？', opts: ['5－2＝3', '2－3＝5', '5＋2＝3'], answer: '5－2＝3', say: '知道二和三组成五，可以用哪道算式检查？' },
            { objective: '交换位置', q: '1 和 4 组成 5，4 和 1 还组成几？', opts: ['3', '4', '5'], answer: '5', say: '一和四组成五，四和一还组成几？' },
            { objective: '错误辨析', q: '聪聪说“2 和 2 合起来是 5”，这句话对吗？', opts: ['不对，合起来是 4', '对，合起来是 5', '只要交换位置就对'], answer: '不对，合起来是 4', say: '二和二合起来是五吗？' },
            { objective: '关系表达', q: '看到“整体是 5，分成两堆”时，最应该先找什么？', opts: ['两堆各有多少', '哪堆颜色更亮', '篮子大小'], answer: '两堆各有多少', say: '整体是五，分成两堆时，最应该先找什么？' },
          ];
          return questions[round % questions.length];
        }}
        onPass={onPass}
      >
      <div className="mt-discovery-head"><div><small>探索教材中的全部分法</small><b>已发现 {seen.length}/4</b></div><span>{seen.length === 4 ? '✓ 四种位置关系都找到了' : '拖一拖或点一点，观察不同分法'}</span></div>
      <ComposeDragStage onPlaced={(split) => { recordSplit(split); setDraggedSplit(true); }} onProgress={(placed, leftCount, rightCount) => { setDragProgress({ placed, left: leftCount, right: rightCount }); if (placed < 5) setDraggedSplit(false); }} />
      <div className="mt-split-picker">{[1, 2, 3, 4].map((n) => <button key={n} className={`${left === n ? 'active' : ''} ${seen.includes(n) ? 'seen' : ''}`} onClick={() => recordSplit(n)}>{seen.includes(n) ? '✓ ' : ''}{n} 和 {5 - n}</button>)}</div>
      <div className="mt-compose-stage">
        <div className="mt-whole"><b>5</b><span>一共有 5 个</span></div>
        <svg viewBox="0 0 500 130" aria-hidden="true"><path d="M250 5 C250 55 130 45 130 110" /><path d="M250 5 C250 55 370 45 370 110" /></svg>
        <div className="mt-baskets"><article><div>{Array.from({ length: left }, (_, i) => <span key={i}>🌽</span>)}</div><b>{left}</b></article><article><div>{Array.from({ length: right }, (_, i) => <span key={i}>🌽</span>)}</div><b>{right}</b></article></div>
      </div>
      <div className="mt-compose-sentence"><b>5</b><span>可以分成</span><b>{left}</b><span>和</span><b>{right}</b><i>；</i><b>{left}</b><span>和</span><b>{right}</b><span>组成</span><b>5</b></div>
      <ComposeReadAloud sentence={sentence} />
      </LearningFlow>
    </section>
  );
}

/* ============================================================
   AI 不懂就问：基于课文要点的聪聪答疑（复用服务端 /api/buddy/chat）
   ============================================================ */

const ASK_META: Record<string, { context: string; quick: string[] }> = {
  campus: {
    context: '人教版一年级上册「数学游戏·在校园里找一找」（教材P2–3）：在校园里找数学——数量（国旗上5颗五角星、教学楼4层、教室在第2层）、形状（窗户是长方形）、位置（前后左右）。数数方法：确定要数的对象，按顺序一个一个数，不重不漏。',
    quick: ['怎样数楼层才不会数错？', '生活中还有哪些地方藏着数学？'],
  },
  numbers: {
    context: '人教版一年级上册「1～5 的认识」（教材P14–16）：一个数有三种样子——实物数量、点子图、数字符号；几个物体就用几表示；计数器拨珠表示数；写数字的笔顺。1还可以表示1个太阳、1棵树等很多事物。',
    quick: ['为什么一个数有三种样子？', '数字 3 都能表示什么？'],
  },
  compare: {
    context: '人教版一年级上册「比大小」（教材P17–18）：比多少用一一对应——一个小猴对一个水果，有剩余的那边多，都不剩就是同样多；符号＞＜＝（大口朝大数、尖尖朝小数），读作“大于、小于、等于”。',
    quick: ['怎样知道谁多谁少？', '大于号和小于号怎么记住？'],
  },
  ordinal: {
    context: '人教版一年级上册「第几」（教材P19）：几个表示一共有多少（基数），第几表示按顺序数的那个位置（序数）；数之前要先确定从哪边数起，方向变了第几也会变；排第2的人前面有1人、后面有3人。',
    quick: ['“5个”和“第5个”有什么不一样？', '从右边数和从左边数一样吗？'],
  },
  compose: {
    context: '人教版一年级上册「分与合」（教材P20–21）：把5个物体分成两堆，5可以分成1和4、2和3、3和2、4和1；成对地记分法方便又全面；反过来，几和几组成5，这是学习加减法的基础。',
    quick: ['5 可以分成几和几？', '为什么要成对地记分法？'],
  },
};

/** 由课节 id 生成「不懂就问」上下文 */
const askOf = (id: LessonId): AskMeta => {
  const l = LESSONS.find((x) => x.id === id) ?? LESSONS[0];
  const extended = EXTENDED_MATH_LESSONS.find((item) => item.id === id);
  return { title: l.title, ...(ASK_META[id] ?? { context: extended?.concept ?? l.subtitle, quick: extended?.quick ?? ['这节课最重要的是什么？', '怎样用操作来验证？'] }) };
};


export default function MathTextbookLabPage() {
  const navigate = useNavigate();
  const { lessonId } = useParams();
  const activeChildId = useStore((s) => s.activeChildId);
  const mastery = useStore((s) => s.mastery);
  const addSkillResult = useStore((s) => s.addSkillResult);
  const applyPoints = useStore((s) => s.applyPoints);
  const [active, setActive] = useState<LessonId>(() => isLessonId(lessonId) ? lessonId : 'campus');
  const done = useMemo(
    () => activeChildId
      ? LESSONS.filter((lesson) => mastery[activeChildId]?.[`math-lab-${lesson.id}`]?.gold).map((lesson) => lesson.id)
      : [],
    [activeChildId, mastery],
  );
  const activeIndex = LESSONS.findIndex((lesson) => lesson.id === active);
  const currentLesson = LESSONS[activeIndex];
  const pass = (id: LessonId, stars: number) => {
    if (done.includes(id)) return;
    if (!activeChildId) return;
    const skillId = `math-lab-${id}`;
    addSkillResult(activeChildId, skillId, stars);
    const lesson = LESSONS.find((item) => item.id === id);
    const detail = EXTENDED_MATH_LESSONS.find((item) => item.id === id);
    if (lesson) scheduleReview(activeChildId, { subject: 'math', lessonId: id, title: lesson.title, focus: detail?.concept ?? lesson.subtitle, route: `/math-course/${id}` });
    applyPoints(activeChildId, 1, '练习达标', `prac:${skillId}:${new Date().toDateString()}`);
  };
  useEffect(() => {
    const h = () => { userInteracted = true; };
    window.addEventListener('pointerdown', h, { once: true });
    return () => { window.removeEventListener('pointerdown', h); stopSpeaking(); };
  }, []);
  useEffect(() => {
    if (isLessonId(lessonId)) setActive(lessonId);
  }, [lessonId]);
  const goLesson = (id: LessonId) => {
    stopSpeaking();
    setActive(id);
    navigate(`/math-course/${id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const lesson = useMemo(() => {
    if (active === 'campus') return <CampusLesson onPass={(stars) => pass(active, stars)} />;
    if (active === 'numbers') return <NumbersLesson onPass={(stars) => pass(active, stars)} />;
    if (active === 'compare') return <CompareLesson onPass={(stars) => pass(active, stars)} />;
    if (active === 'ordinal') return <OrdinalLesson onPass={(stars) => pass(active, stars)} />;
    if (active === 'compose') return <ComposeLesson onPass={(stars) => pass(active, stars)} />;
    const extended = EXTENDED_MATH_LESSONS.find((item) => item.id === active);
    return extended ? <ExtendedLessonPage key={extended.id} config={extended} onPass={(stars) => pass(active, stars)} /> : null;
  }, [active]);

  return (
    <main className="ct-page ct-lesson-page math-textbook-lab school-math-course" onPointerDown={() => { userInteracted = true; }}>
      <header className="ct-lesson-head">
        <button className="ct-back" onClick={() => navigate('/subject/math')} aria-label="返回数学目录">←</button>
        <div>
          <span className="ct-eyebrow">{currentLesson.unitNo === '数学游戏' ? '数学游戏' : `第${currentLesson.unitNo}单元`} · 教材 {MATH_UPPER_UNITS.find((unit) => unit.no === currentLesson.unitNo)?.page ?? currentLesson.unitTitle}</span>
          <h1>{currentLesson.title}</h1>
          <p>{currentLesson.subtitle}</p>
        </div>
        <button className="ct-teacher-play" onClick={() => speakOnce(`${currentLesson.title}。${EXTENDED_MATH_LESSONS.find((item) => item.id === active)?.concept ?? currentLesson.subtitle}`, 'zh', 0.9)}>🔊 听聪聪讲</button>
      </header>
      {lesson}
      <footer className="ct-lesson-footer">
        <button disabled={activeIndex === 0} onClick={() => goLesson(LESSONS[activeIndex - 1].id)}>← 上一课</button>
        <span>{done.includes(active) ? '✓ 本课已理解 · ' : '完成智能闯关即点亮 · '}{activeIndex + 1} / {LESSONS.length}</span>
        <button disabled={activeIndex === LESSONS.length - 1} onClick={() => goLesson(LESSONS[activeIndex + 1].id)}>下一课 →</button>
      </footer>
    </main>
  );
}
