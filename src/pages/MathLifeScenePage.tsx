import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MathLifeSceneArt from '../components/MathLifeSceneArt';
import { Confetti, Stars } from '../components/ui';
import { ALL_MATH_LESSONS } from '../content/mathUpperCurriculum';
import { mathLifeSceneForLesson } from '../content/mathLifeScenes';
import { localDayKey } from '../dailyCheckin';
import { playSfx, speakOnce, stopSpeaking } from '../speech';
import { useStore } from '../store';
import '../math-life-scene.css';

export default function MathLifeScenePage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const lessonId = params.get('lesson');
  const lesson = ALL_MATH_LESSONS.find((item) => item.id === lessonId);
  const scene = mathLifeSceneForLesson(lessonId);
  const child = useStore((state) => state.profiles.find((profile) => profile.id === state.activeChildId));
  const addRecord = useStore((state) => state.addRecord);
  const applyPoints = useStore((state) => state.applyPoints);
  const reviewDay = Number(params.get('reviewDay'));
  const tasks = useMemo(() => {
    const source = scene?.tasks ?? [];
    if (!source.length || params.get('from') !== 'review') return source;
    const offset = (reviewDay === 2 ? 1 : reviewDay === 4 ? 2 : 0) % source.length;
    return [...source.slice(offset), ...source.slice(0, offset)];
  }, [scene, params, reviewDay]);
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [mistakes, setMistakes] = useState(0);
  const [done, setDone] = useState(false);
  const task = tasks[index];
  const backTarget = params.get('from') === 'review' ? '/review' : lessonId ? `/math-course/${lessonId}` : '/subject/math';

  useEffect(() => {
    if (!child) nav('/map');
    if (!scene || scene.kind === 'fruit-shop' || !lesson || !task) nav(backTarget);
    return () => stopSpeaking();
  }, [backTarget, child, lesson, nav, scene, task]);

  if (!child || !scene || scene.kind === 'fruit-shop' || !lesson || !task) return null;

  const choose = (option: number) => {
    if (pick !== null) return;
    if (option !== task.answer) {
      setMistakes((value) => value + 1);
      setFeedback('再看一看场景里的数量、位置或形状，动物朋友等你再试一次。');
      playSfx('wrong');
      return;
    }
    setPick(option);
    setFeedback(task.explain);
    playSfx('correct');
    speakOnce(task.explain, 'zh', .84);
  };

  const next = () => {
    if (index < tasks.length - 1) {
      setIndex((value) => value + 1);
      setPick(null);
      setFeedback('');
      return;
    }
    const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
    const playedAt = Date.now();
    addRecord({
      id: `math-life-${scene.kind}-${lesson.id}-${playedAt}`,
      childId: child.id, gameId: `math-life-${scene.kind}`, level: 1, stars,
      correct: tasks.length, total: tasks.length, durationSec: 1, playedAt,
    });
    applyPoints(child.id, 3, '生活小剧场奖励', `math-life:${scene.kind}:${lesson.id}:${child.id}:${localDayKey()}`);
    setDone(true);
    playSfx('win');
  };

  if (done) return <main className={`mls-page ${scene.kind}`}>
    <Confetti show count={24} />
    <section className="mls-result">
      <span>{scene.icon}</span><small>{lesson.title} · 生活小剧场</small>
      <h1>{scene.kind === 'picnic' ? '野餐准备好啦！' : '修理任务完成啦！'}</h1>
      <Stars count={mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1} size={50} />
      <p>你把《{lesson.title}》学到的方法用在了新的生活场景里。</p>
      <button onClick={() => nav(backTarget)}>返回{backTarget === '/review' ? '今日复习' : '本课'}</button>
    </section>
  </main>;

  return <main className={`mls-page ${scene.kind}`}>
    <header className="mls-topbar">
      <button onClick={() => nav(backTarget)} aria-label="返回">←</button>
      <div><small>MATH LIFE STORY</small><h1>{scene.title}</h1></div>
      <b>{index + 1} / {tasks.length}</b>
    </header>
    <aside className="mls-course-link"><span>{params.get('from') === 'review' ? reviewDay === 2 || reviewDay === 4 ? `第 ${reviewDay} 天复习` : '当天回顾' : '本课专属'}</span><div><b>来自《{lesson.title}》</b><small>{scene.summary}</small></div></aside>
    <section className="mls-stage">
      <div className="mls-sky" role="img" aria-label={task.artLabel}>
        <div className="mls-artboard"><small>看图找线索</small><div className="mls-art-items"><MathLifeSceneArt kind={task.artKind} /></div></div>
      </div>
      <div className="mls-task" role="region" aria-label={`${scene.title}任务`}>
        <small>动物朋友请你帮忙</small><h2>{task.prompt}</h2>
        <div>{task.options.map((option, optionIndex) => <button key={option} className={pick === optionIndex ? 'correct' : ''} onClick={() => choose(optionIndex)}>{option}</button>)}</div>
        {feedback && <p className={pick === null ? 'hint' : 'success'}>{feedback}</p>}
        {pick !== null && <button className="mls-next" onClick={next}>{index === tasks.length - 1 ? '完成小剧场 →' : '继续下一步 →'}</button>}
      </div>
    </section>
    <p className="mls-note">答错可以继续试，先观察场景，再使用本课学到的方法。</p>
  </main>;
}
