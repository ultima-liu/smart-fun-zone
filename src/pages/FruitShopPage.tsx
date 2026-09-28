import { useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Confetti, Stars } from '../components/ui';
import {
  adaptFruitShopLevel,
  buildFruitShopSession,
  createFruitShopRandom,
  FRUIT_META,
  FRUIT_SHOP_ABILITY_LABELS,
  fruitShopAbilityForLesson,
  fruitShopMaxForLesson,
  unlockedFruitShopAbilities,
  type FruitShopAllocationRound,
  type FruitShopLevel,
  type FruitShopRound,
} from '../content/fruitShop';
import { ALL_MATH_LESSONS } from '../content/mathUpperCurriculum';
import { localDayKey } from '../dailyCheckin';
import { readFruitShopProgress, saveFruitShopSession } from '../fruitShopProgress';
import { playSfx, speakOnce, stopSpeaking } from '../speech';
import { useStore } from '../store';
import '../fruit-shop.css';

const LEVELS: Array<{ id: FruitShopLevel; name: string; note: string }> = [
  { id: 1, name: '小芽', note: '数量小 · 提示多' },
  { id: 2, name: '成长', note: '1～10 · 少提示' },
  { id: 3, name: '挑战', note: '数量更大' },
];

function allocationInitial(round: FruitShopRound): number[] {
  return round.kind === 'serve' || round.kind === 'topup' || round.kind === 'split' ? [...round.initial] : [];
}

function instructionFor(round: FruitShopRound) {
  if (round.kind === 'compare') return round.prompt;
  if (round.kind === 'addition' || round.kind === 'subtraction' || round.kind === 'make-ten') return `${round.prompt} 选出正确的数字。`;
  if (round.kind === 'split') return `${round.prompt} 先点亮一个篮子，再点水果。`;
  return `${round.prompt} 点一点击水果，把它放进篮子。`;
}

function isAllocationRound(round: FruitShopRound): round is FruitShopAllocationRound {
  return round.kind === 'serve' || round.kind === 'topup' || round.kind === 'split';
}

function teacherPromptFor(round: FruitShopRound) {
  if (round.kind === 'compare') return { prompt: '比较两篮水果时，第一步应该怎么做？', options: ['一个一个配对', '只看篮子大小'], answer: 0 };
  if (round.kind === 'addition') return { prompt: '求一共时，应该把两部分怎么办？', options: ['合在一起数', '拿走一部分'], answer: 0 };
  if (round.kind === 'subtraction') return { prompt: '求还剩时，应该先怎么做？', options: ['拿走吃掉的部分', '再添上一部分'], answer: 0 };
  if (round.kind === 'make-ten') return { prompt: '凑十时，应该先找什么？', options: ['十格盒的空位', '最大的水果'], answer: 0 };
  if (round.kind === 'split') return { prompt: '分水果时，怎样才不容易漏？', options: ['按两张订单逐个放', '随便抓一把'], answer: 0 };
  return { prompt: '按订单装水果时，第一步应该怎么做？', options: ['看目标数再逐个放', '先把水果全放进去'], answer: 0 };
}

function nowMs() { return Date.now(); }

function FruitDots({ count, filled }: { count: number; filled: number }) {
  return <span className="fs-dots" aria-hidden="true">{Array.from({ length: count }, (_, index) => <i key={index} className={index < filled ? 'filled' : ''} />)}</span>;
}

export default function FruitShopPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const child = useStore((state) => state.profiles.find((profile) => profile.id === state.activeChildId));
  const mastery = useStore((state) => state.mastery);
  const addRecord = useStore((state) => state.addRecord);
  const applyPoints = useStore((state) => state.applyPoints);
  const sourceLessonId = params.get('lesson');
  const sourceLesson = ALL_MATH_LESSONS.find((lesson) => lesson.id === sourceLessonId);
  const lessonAbility = fruitShopAbilityForLesson(sourceLessonId);
  const lessonQuantityMax = fruitShopMaxForLesson(sourceLessonId);
  const completedLessonIds = child
    ? Object.entries(mastery[child.id] ?? {}).filter(([, value]) => value.stars > 0 || value.gold).map(([key]) => key.replace(/^math-lab-/, ''))
    : [];
  const focusAbility = lessonAbility;
  const unlockedAbilities = focusAbility ? [focusAbility] : unlockedFruitShopAbilities(completedLessonIds);
  const reviewDay = Number(params.get('reviewDay'));
  const [freeEntrySeed] = useState(() => `free-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const seedContext = params.get('from') === 'review' && sourceLessonId
    ? `review:${sourceLessonId}:day-${reviewDay}`
    : params.get('from') === 'course' && sourceLessonId
      ? `course:${sourceLessonId}`
      : freeEntrySeed;
  const sessionSeed = (targetLevel: FruitShopLevel, variant: number) => `${child?.id ?? 'guest'}:${seedContext}:level-${targetLevel}:variant-${variant}:v1`;
  const [level, setLevel] = useState<FruitShopLevel>(() => child ? readFruitShopProgress(child.id).suggestedLevel : 1);
  const [sessionVariant, setSessionVariant] = useState(0);
  const [rounds, setRounds] = useState(() => buildFruitShopSession(level, createFruitShopRandom(sessionSeed(level, 0)), focusAbility, unlockedAbilities, lessonQuantityMax));
  const [roundIndex, setRoundIndex] = useState(0);
  const round = rounds[roundIndex];
  const [allocations, setAllocations] = useState<number[]>(() => allocationInitial(round));
  const [activeBasket, setActiveBasket] = useState(0);
  const [comparePick, setComparePick] = useState<number | null>(null);
  const [calculationPick, setCalculationPick] = useState<number | null>(null);
  const [teacherMode, setTeacherMode] = useState(false);
  const [teacherReady, setTeacherReady] = useState(false);
  const [teacherPick, setTeacherPick] = useState<number | null>(null);
  const [teacherRounds, setTeacherRounds] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [roundHints, setRoundHints] = useState(0);
  const [sessionHints, setSessionHints] = useState(0);
  const [independentRounds, setIndependentRounds] = useState(0);
  const [independentStreak, setIndependentStreak] = useState(0);
  const [assistedStreak, setAssistedStreak] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [roundDone, setRoundDone] = useState(false);
  const [result, setResult] = useState<{ stars: number; sticker: string; stickerName: string; newSticker: boolean; nextLevel: FruitShopLevel } | null>(null);
  const startedAt = useRef(0);

  const fruit = FRUIT_META[round.fruit];
  const backTarget = params.get('from') === 'review' ? '/review' : params.get('from') === 'course' && sourceLessonId ? `/math-course/${sourceLessonId}` : '/subject/math';

  useEffect(() => {
    if (!child) nav('/map');
  }, [child, nav]);

  useEffect(() => {
    if (!round || result) return;
    const timer = window.setTimeout(() => speakOnce(instructionFor(round), 'zh', .82), 260);
    return () => window.clearTimeout(timer);
  }, [round, result]);

  useEffect(() => {
    startedAt.current = nowMs();
    return () => stopSpeaking();
  }, []);

  if (!child || !round) return null;

  const resetRoundState = (next: FruitShopRound, useTeacherMode = false) => {
    setAllocations(allocationInitial(next));
    setActiveBasket(0);
    setComparePick(null);
    setCalculationPick(null);
    setTeacherMode(useTeacherMode);
    setTeacherReady(false);
    setTeacherPick(null);
    setAttempts(0);
    setRoundHints(0);
    setFeedback('');
    setRoundDone(false);
  };

  const finishSession = () => {
    const independent = independentRounds;
    const hints = sessionHints;
    const stars = independent === 3 ? 3 : independent >= 2 || hints <= 2 ? 2 : 1;
    const nextLevel = adaptFruitShopLevel(level, assistedStreak, independentStreak);
    const finishedAt = nowMs();
    const durationSec = Math.max(1, Math.round((finishedAt - (startedAt.current || finishedAt)) / 1000));
    const stickerFruit = rounds[rounds.length - 1].fruit;
    const saved = saveFruitShopSession(child.id, {
      playedAt: finishedAt, level, stars, independentRounds: independent, hints, durationSec,
      abilities: [...new Set(rounds.map((item) => item.ability))], teacherRounds,
    }, stickerFruit, nextLevel);
    addRecord({
      id: `fruit-shop-${finishedAt}-${Math.random().toString(36).slice(2, 6)}`,
      childId: child.id,
      gameId: 'fruit-shop',
      level,
      stars,
      correct: independent,
      total: rounds.length,
      durationSec,
      playedAt: finishedAt,
    });
    applyPoints(child.id, 3, '水果店实践奖励', `fruit-shop:${child.id}:${localDayKey()}`);
    setResult({
      stars, sticker: FRUIT_META[stickerFruit].emoji, stickerName: `${FRUIT_META[stickerFruit].name}贴纸`, newSticker: saved.newSticker, nextLevel,
    });
    playSfx('win');
    speakOnce(`${child.name}帮大家准备好了水果，真会用数学！`, 'zh', .84);
  };

  const markRoundDone = () => {
    if (roundDone) return;
    const wasIndependent = attempts === 0 && roundHints === 0;
    setRoundDone(true);
    setFeedback(`${isAllocationRound(round) ? '装好啦' : '算对啦'}！${round.guests.map((guest) => guest.name).join('和')}开心地说谢谢！`);
    if (wasIndependent) {
      setIndependentRounds((value) => value + 1);
      setIndependentStreak((value) => value + 1);
      setAssistedStreak(0);
    } else {
      setIndependentStreak(0);
      setAssistedStreak((value) => value + 1);
    }
    playSfx('correct');
    speakOnce('正好！一个也不少，一个也不多。', 'zh', .84);
  };

  const addFruit = (basket: number) => {
    if (!isAllocationRound(round) || roundDone) return;
    setActiveBasket(basket);
    setAllocations((current) => {
      if ((current[basket] ?? 0) >= round.targets[basket] + 2) return current;
      const next = [...current];
      next[basket] = (next[basket] ?? 0) + 1;
      return next;
    });
    setFeedback('');
    playSfx('pop');
  };

  const removeFruit = (basket: number) => {
    if (!isAllocationRound(round) || roundDone) return;
    setAllocations((current) => {
      if ((current[basket] ?? 0) <= round.initial[basket]) return current;
      const next = [...current];
      next[basket] -= 1;
      return next;
    });
    playSfx('tap');
  };

  const checkAllocation = () => {
    if (!isAllocationRound(round) || roundDone) return;
    const right = round.targets.every((target, index) => allocations[index] === target);
    if (right) {
      markRoundDone();
      return;
    }
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setRoundHints((value) => value + 1);
    setSessionHints((value) => value + 1);
    const tooMany = round.targets.some((target, index) => allocations[index] > target);
    const message = tooMany
      ? '有一只篮子装多了一点。点篮子里的水果把它放回货架，再数一数。'
      : nextAttempts >= 2
        ? `再看看空圆点，每个圆点放一个${fruit.name}。`
        : '还差一点。摸着篮子里的水果，一个一个数，再试一次。';
    setFeedback(message);
    playSfx('wrong');
    speakOnce(message, 'zh', .82);
  };

  const chooseCompare = (index: number) => {
    if (round.kind !== 'compare' || roundDone) return;
    setComparePick(index);
    if (index === round.answer) {
      markRoundDone();
      return;
    }
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setRoundHints((value) => value + 1);
    setSessionHints((value) => value + 1);
    const message = nextAttempts >= 2 ? '把两边的水果一个对一个看，哪边还有剩下？' : '再数一数两只篮子，慢慢比较。';
    setFeedback(message);
    playSfx('wrong');
    speakOnce(message, 'zh', .82);
  };

  const chooseCalculation = (answer: number) => {
    if ((round.kind !== 'addition' && round.kind !== 'subtraction' && round.kind !== 'make-ten') || roundDone) return;
    setCalculationPick(answer);
    if (answer === round.answer) {
      markRoundDone();
      return;
    }
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setRoundHints((value) => value + 1);
    setSessionHints((value) => value + 1);
    const message = round.kind === 'addition'
      ? '把两堆水果合在一起，一个一个数。'
      : round.kind === 'subtraction'
        ? '先摆出原来的水果，再划掉吃掉的几个。'
        : `盒子一共有 10 个位置，数数还有几个空位。`;
    setFeedback(message);
    playSfx('wrong');
    speakOnce(message, 'zh', .82);
  };

  const teachJuan = (index: number) => {
    if (!teacherMode || teacherReady) return;
    const teacherPrompt = teacherPromptFor(round);
    setTeacherPick(index);
    if (index !== teacherPrompt.answer) {
      setFeedback('兔兔店长还是有点迷糊，再选一个更稳的方法教教它。');
      playSfx('wrong');
      return;
    }
    setTeacherReady(true);
    setTeacherRounds((value) => value + 1);
    setFeedback('兔兔店长学会第一步啦！现在请你用这个方法完成订单。');
    playSfx('correct');
    speakOnce('原来要先想方法！现在请小老师带我做完吧。', 'zh', .82);
  };

  const askForHint = () => {
    const next = Math.min(2, roundHints + 1);
    setRoundHints(next);
    setSessionHints((value) => value + 1);
    let message: string;
    if (round.kind === 'compare') message = '用手指一个一个配对，先找出哪边有剩下。';
    else if (round.kind === 'addition') message = `${round.first} 个和 ${round.second} 个合在一起，可以接着往后数。`;
    else if (round.kind === 'subtraction') message = `从 ${round.first} 个里面拿走 ${round.second} 个，再数剩下的。`;
    else if (round.kind === 'make-ten') message = `10 格盒里已经有 ${round.first} 个，数一数空格。`;
    else if (next === 1) message = '篮子里的圆点就是目标位置，一个圆点放一个水果。';
    else if (isAllocationRound(round)) message = round.targets.map((target, index) => `${round.guests[index].name}还差 ${Math.max(0, target - (allocations[index] ?? 0))} 个`).join('，') + '。';
    else message = '再看一看水果和数字。';
    setFeedback(message);
    playSfx('tap');
    speakOnce(message, 'zh', .82);
  };

  const goNext = () => {
    if (roundIndex === rounds.length - 1) {
      finishSession();
      return;
    }
    const nextIndex = roundIndex + 1;
    setRoundIndex(nextIndex);
    resetRoundState(rounds[nextIndex], assistedStreak >= 2);
  };

  const restart = (nextLevel = result?.nextLevel ?? level) => {
    const nextVariant = sessionVariant + 1;
    const nextRounds = buildFruitShopSession(nextLevel, createFruitShopRandom(sessionSeed(nextLevel, nextVariant)), focusAbility, unlockedAbilities, lessonQuantityMax);
    setSessionVariant(nextVariant);
    setLevel(nextLevel);
    setRounds(nextRounds);
    setRoundIndex(0);
    resetRoundState(nextRounds[0]);
    setSessionHints(0);
    setIndependentRounds(0);
    setIndependentStreak(0);
    setAssistedStreak(0);
    setTeacherRounds(0);
    setResult(null);
    startedAt.current = nowMs();
  };

  const changeLevel = (next: FruitShopLevel) => {
    if (next === level) return;
    const nextRounds = buildFruitShopSession(next, createFruitShopRandom(sessionSeed(next, sessionVariant)), focusAbility, unlockedAbilities, lessonQuantityMax);
    setLevel(next);
    setRounds(nextRounds);
    setRoundIndex(0);
    resetRoundState(nextRounds[0]);
    setSessionHints(0);
    setIndependentRounds(0);
    setIndependentStreak(0);
    setAssistedStreak(0);
    setTeacherRounds(0);
    setResult(null);
    startedAt.current = nowMs();
  };

  if (result) {
    return <main className="fs-page page">
      <Confetti show count={28} />
      <section className="fs-result" aria-live="polite">
        <div className="fs-result-photo"><span>🐰</span><span>🐼</span><b>🫘</b><span>🦊</span><span>🐻</span></div>
        <small>今日水果店合照</small>
        <h1>客人们都吃上水果啦！</h1>
        <Stars count={result.stars} size={52} />
        <p>你完成了 3 张订单，练习了{[...new Set(rounds.map((item) => FRUIT_SHOP_ABILITY_LABELS[item.ability]))].join('、')}。</p>
        <div className="fs-sticker"><span>{result.sticker}</span><div><b>{result.stickerName}</b><small>{result.newSticker ? '新贴纸已经放进收藏册' : '这张贴纸已经在收藏册里啦'}</small></div></div>
        {teacherRounds > 0 && <p className="fs-adapt-note">你还当了 {teacherRounds} 次小老师，把方法教会了兔兔店长。</p>}
        {result.nextLevel !== level && <p className="fs-adapt-note">下一轮为你准备了「{LEVELS.find((item) => item.id === result.nextLevel)?.name}」难度。</p>}
        <div className="fs-result-actions"><button onClick={() => restart()}>再招待一组</button><button onClick={() => nav(backTarget)}>返回{backTarget === '/review' ? '今日复习' : sourceLesson ? sourceLesson.title : '数学课'}</button></div>
      </section>
    </main>;
  }

  const allocationRound = isAllocationRound(round) ? round : null;
  const allocation = round as FruitShopAllocationRound;
  const totalTarget = allocationRound?.targets.reduce((sum, value) => sum + value, 0) ?? 0;
  const totalInitial = allocationRound?.initial.reduce((sum, value) => sum + value, 0) ?? 0;
  const totalPlaced = allocations.reduce((sum, value) => sum + value, 0);
  const supplyCount = Math.max(0, totalTarget + 2 - (totalPlaced - totalInitial));
  const teacherPrompt = teacherPromptFor(round);
  const taskBlocked = teacherMode && !teacherReady;

  return <main className="fs-page page">
    <header className="fs-topbar">
      <button className="fs-back" onClick={() => nav(backTarget)} aria-label="返回">←</button>
      <div><span>MATH STORY LAB</span><h1>小卷水果店</h1></div>
      <div className="fs-round-progress" aria-label={`第 ${roundIndex + 1} 张订单，共 ${rounds.length} 张`}><b>{roundIndex + 1}</b><span>/ {rounds.length} 单</span></div>
    </header>

    <nav className="fs-levels" aria-label="选择难度">{LEVELS.map((item) => <button key={item.id} className={level === item.id ? 'active' : ''} onClick={() => changeLevel(item.id)}><b>{item.name}</b><span>{item.note}</span></button>)}</nav>

    {sourceLesson && focusAbility && <aside className="fs-course-link"><span>{params.get('from') === 'review' ? reviewDay === 2 || reviewDay === 4 ? `第 ${reviewDay} 天复习` : '当天回顾' : '本课专属'}</span><div><b>《{sourceLesson.title}》的小卷水果店</b><small>三张订单都练习：{FRUIT_SHOP_ABILITY_LABELS[focusAbility]}</small></div></aside>}

    <section className="fs-shop-stage">
      <div className="fs-awning" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
      <div className="fs-sign"><span>🫘</span><div><small>卷星生活小剧场</small><b>{sourceLesson ? `${sourceLesson.title} · 专属订单` : '今天请你当水果店长'}</b></div><button onClick={() => speakOnce(instructionFor(round), 'zh', .82)} aria-label="再听一次任务">🔊</button></div>

      <div className="fs-coach" role="status"><span className={roundDone ? 'happy' : ''}>🐰</span><div><small>兔兔店长说</small><p>{feedback || instructionFor(round)}</p></div></div>

      {teacherMode && <section className={`fs-teacher-mode ${teacherReady ? 'ready' : ''}`} aria-label="小老师模式"><span>🐰</span><div><small>连续需要帮助 · 换一种方法</small><h2>{teacherReady ? '兔兔店长学会第一步啦！' : '请你当小老师'}</h2><p>{teacherReady ? '现在带着兔兔店长完成下面的订单。' : teacherPrompt.prompt}</p>{!teacherReady && <div>{teacherPrompt.options.map((option, index) => <button key={option} className={teacherPick === index ? 'picked' : ''} onClick={() => teachJuan(index)}>{option}</button>)}</div>}</div></section>}

      <div className={taskBlocked ? 'fs-task-blocked' : ''} aria-disabled={taskBlocked}>
      {round.kind === 'addition' || round.kind === 'subtraction' || round.kind === 'make-ten' ? <section className="fs-calculation" aria-label={`${FRUIT_SHOP_ABILITY_LABELS[round.ability]}订单`}>
        <div className="fs-calc-guest"><span className="fs-guest">{round.guests[0].emoji}</span><b>{round.guests[0].name}的订单</b></div>
        {round.kind === 'make-ten' ? <div className="fs-ten-frame" aria-label={`十格盒已有 ${round.first} 个${fruit.name}`}>
          {Array.from({ length: 10 }, (_, index) => <i key={index} className={index < round.first ? 'filled' : ''}>{index < round.first ? fruit.emoji : ''}</i>)}
        </div> : <div className="fs-calc-story" aria-hidden="true">
          <span>{Array.from({ length: round.first }, (_, index) => <i key={index}>{fruit.emoji}</i>)}</span>
          <b>{round.kind === 'addition' ? '+' : '−'}</b>
          <span>{Array.from({ length: round.second }, (_, index) => <i key={index} className={round.kind === 'subtraction' ? 'removed' : ''}>{fruit.emoji}</i>)}</span>
          <strong>= ?</strong>
        </div>}
        <div className="fs-number-options">{round.options.map((option) => <button key={option} className={`${calculationPick === option ? 'picked' : ''} ${roundDone && option === round.answer ? 'correct' : ''}`} disabled={roundDone} onClick={() => chooseCalculation(option)} aria-label={`答案 ${option}`}>{option}</button>)}</div>
      </section> : round.kind === 'compare' ? <section className="fs-compare" aria-label="比较两篮水果">
        <h2>{round.ask === 'more' ? '谁的水果更多？' : '谁的水果更少？'}</h2>
        <div>{round.guests.map((guest, index) => <button key={guest.name} className={`${comparePick === index ? 'picked' : ''} ${roundDone && round.answer === index ? 'correct' : ''}`} disabled={roundDone} onClick={() => chooseCompare(index)} aria-label={`${guest.name}，${round.amounts[index]} 个${fruit.name}`}>
          <span className="fs-guest">{guest.emoji}</span><b>{guest.name}</b><div className="fs-fruit-pile">{Array.from({ length: round.amounts[index] }, (_, fruitIndex) => <i key={fruitIndex}>{fruit.emoji}</i>)}</div><strong>{round.amounts[index]} 个</strong>
        </button>)}</div>
      </section> : <>
        <section className={`fs-orders ${allocation.guests.length > 1 ? 'double' : ''}`} aria-label="水果订单">
          {allocation.guests.map((guest, index) => {
            const showDots = level === 1 || roundHints > 0;
            return <article key={guest.name} className={`fs-order ${activeBasket === index ? 'active' : ''} ${roundDone ? 'done' : ''}`} role="button" tabIndex={0} onClick={() => setActiveBasket(index)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setActiveBasket(index); }} onDragOver={(event) => event.preventDefault()} onDrop={(event: DragEvent<HTMLElement>) => { event.preventDefault(); addFruit(index); }} aria-label={`${guest.name}的篮子，目标 ${allocation.targets[index]} 个，现在 ${allocations[index] ?? 0} 个`}>
              <span className="fs-guest">{guest.emoji}</span><div className="fs-order-request"><small>{guest.name}想要</small><strong className="fs-order-number">{allocation.targets[index]}</strong><b>个{fruit.name}</b>{showDots && <FruitDots count={allocation.targets[index]} filled={allocations[index] ?? 0} />}</div>
              <div className="fs-basket"><span>{Array.from({ length: allocations[index] ?? 0 }, (_, fruitIndex) => <button key={fruitIndex} onClick={(event) => { event.stopPropagation(); removeFruit(index); }} aria-label={`放回一个${fruit.name}`}>{fruit.emoji}</button>)}</span><b aria-hidden="true" /></div>
              {allocation.initial[index] > 0 && <em>原来有 {allocation.initial[index]} 个</em>}
            </article>;
          })}
        </section>

        <section className="fs-supply" aria-label={`${fruit.name}货架`}>
          <div><span>水果货架</span><b>{allocation.guests.length > 1 ? `先选篮子，再点${fruit.name}` : `点${fruit.name}放进篮子`}</b></div>
          <div className="fs-supply-fruits">{Array.from({ length: Math.min(12, supplyCount) }, (_, index) => <button key={`${round.id}-${index}`} draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', round.fruit)} onClick={() => addFruit(activeBasket)} disabled={roundDone} aria-label={`拿一个${fruit.name}`}>{fruit.emoji}</button>)}</div>
          <small>也可以拖进篮子里</small>
        </section>
      </>}
      </div>

      <footer className="fs-actions">
        {!roundDone && !taskBlocked && <button className="fs-help" onClick={askForHint}>💡 给我一点提示</button>}
        {!roundDone && !taskBlocked && isAllocationRound(round) && <button className="fs-check" onClick={checkAllocation}>请兔兔店长检查</button>}
        {roundDone && <button className="fs-next" onClick={goNext}>{roundIndex === rounds.length - 1 ? '一起去野餐 →' : '接待下一位 →'}</button>}
      </footer>
    </section>

    <aside className="fs-learning-note"><b>这张订单在练什么？</b><span>{FRUIT_SHOP_ABILITY_LABELS[round.ability]}</span><p>不用着急，数错了可以拿回来再试。</p></aside>
  </main>;
}
