import BackButton from '../components/BackButton';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { completeReviewDay, importReviewEntry, reviewCandidates, reviewEntries, type ReviewEntry } from '../reviewPlan';
import { completeDailyReview, ensureDailyReview } from '../taskSystem';
import { ENGLISH_G3_ALL_LESSONS } from '../content/englishGrade3Upper';
import { CHINESE_TEXTBOOK_LESSONS } from '../content/chineseTextbookCurriculum';
import { EXTENDED_MATH_LESSONS } from '../content/mathUpperCurriculum';
import { readFruitShopProgress } from '../fruitShopProgress';
import { FRUIT_SHOP_ABILITY_LABELS, fruitShopAbilityForLesson } from '../content/fruitShop';
import { mathLifeSceneForLesson, mathLifeSceneRoute } from '../content/mathLifeScenes';
import { localDayKey } from '../dailyCheckin';
import '../review-hub.css';

const SUBJECT: Record<ReviewEntry['subject'], { label: string; icon: string }> = {
  chinese: { label: '语文', icon: '文' }, math: { label: '数学', icon: '数' }, english: { label: '英语', icon: 'A' },
};

type MathReviewCheck = { question: string; options: string[]; answer: number };

/** 前五节专属课不在通用课程数据内，其余课直接复用每课的小检测。 */
const FOUNDATION_MATH_REVIEW: Record<string, MathReviewCheck> = {
  campus: { question: '从下往上数，中间教学楼共有几层？', options: ['3 层', '4 层', '5 层'], answer: 1 },
  numbers: { question: '4 朵花应该和哪个数字连起来？', options: ['3', '4', '5'], answer: 1 },
  compare: { question: '3 只小猴和 4 个梨，应该用哪个符号？', options: ['3 = 4', '3 > 4', '3 < 4'], answer: 2 },
  ordinal: { question: '队伍里一共有 5 人，小朋友排第 2。“5”和“2”的意思相同吗？', options: ['相同', '不同'], answer: 1 },
  compose: { question: '5 可以分成哪两个部分？', options: ['1 和 4', '1 和 5', '2 和 4'], answer: 0 },
};

function reviewCheck(entry: ReviewEntry): MathReviewCheck | undefined {
  if (entry.subject === 'math') return FOUNDATION_MATH_REVIEW[entry.lessonId] ?? EXTENDED_MATH_LESSONS.find((lesson) => lesson.id === entry.lessonId)?.checkpoint;
  if (entry.subject === 'chinese') {
    const question = CHINESE_TEXTBOOK_LESSONS.find((lesson) => lesson.id === entry.lessonId)?.questions[0];
    return question ? { question: question.question, options: question.options, answer: question.answer } : undefined;
  }
  const question = ENGLISH_G3_ALL_LESSONS.find((lesson) => lesson.id === entry.lessonId)?.check;
  return question ? { question: question.question, options: question.options, answer: question.options.indexOf(question.answer) } : undefined;
}

function ReviewMiniCheck({ check, onPass }: { check: MathReviewCheck; onPass: () => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [passed, setPassed] = useState(false);
  const choose = (index: number) => {
    if (passed) return;
    setPicked(index);
    if (index === check.answer) {
      setPassed(true);
      window.setTimeout(onPass, 700);
    } else window.setTimeout(() => setPicked(null), 850);
  };
  return <div className="review-math-check">
    <b>回想小检验</b><p>{check.question}</p>
    <div>{check.options.map((option, index) => <button type="button" key={option} className={picked === index ? index === check.answer ? 'correct' : 'wrong' : ''} disabled={passed} onClick={() => choose(index)}>{option}</button>)}</div>
    {picked !== null && <small className={passed ? 'good' : 'try'}>{passed ? '答对了，这次复习已完成！' : '再看看本课的方法卡，慢慢想一次。'}</small>}
  </div>;
}

export default function ReviewHubPage() {
  const nav = useNavigate();
  const childId = useStore((state) => state.activeChildId);
  const grade = useStore((state) => state.profiles.find((profile) => profile.id === childId)?.ageBand);
  const courseSchedule = useStore((state) => state.courseSchedule);
  const [revision, setRevision] = useState(0);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const assignedReview = useStore((state) => childId ? state.taskStates[childId]?.dailyReview : undefined);
  const assignmentCompleted = useStore((state) => childId && assignedReview ? Boolean(state.taskStates[childId]?.completed[assignedReview.taskId]) : false);
  useEffect(() => { if (childId) ensureDailyReview(childId); }, [childId, courseSchedule, revision]);
  // 英语课原先已保存「第几天复习」的学习反馈；首次打开总入口时无损接入，
  // 避免新入口只显示更新之后新学的课。
  useEffect(() => {
    if (!childId) return;
    let imported = false;
    for (const lesson of ENGLISH_G3_ALL_LESSONS) {
      try {
        const saved = JSON.parse(localStorage.getItem(`sfz-english-g3a-flow-v5:${childId}:${lesson.id}`) ?? 'null') as { reviewStartedAt?: number; reviewDoneDays?: number[] } | null;
        if (!saved || typeof saved.reviewStartedAt !== 'number') continue;
        imported = importReviewEntry(childId, {
          id: `english:${lesson.id}`, subject: 'english', lessonId: lesson.id, title: lesson.title,
          focus: `听读、词汇和本课核心表达`, route: `/english-course/${lesson.id}`,
          learnedAt: saved.reviewStartedAt, completedDays: saved.reviewDoneDays ?? [],
        }) || imported;
      } catch { /* 单个旧记录损坏时不影响其余课程 */ }
    }
    if (imported) setRevision((value) => value + 1);
  }, [childId]);
  const entries = useMemo<ReviewEntry[]>(() => {
    const list = childId ? reviewEntries(childId) : [];
    if (!assignedReview || assignedReview.day !== localDayKey() || list.some((entry) => entry.id === assignedReview.entryId)) return list;
    const subject = assignedReview.entryId.split(':')[0];
    if (subject !== 'math' && subject !== 'chinese' && subject !== 'english') return list;
    return [{
      id: assignedReview.entryId, subject, lessonId: assignedReview.entryId.slice(subject.length + 1), title: assignedReview.title,
      focus: assignedReview.focus, route: assignedReview.route,
      learnedAt: Date.now(), completedDays: [], reviewedOn: [],
    }, ...list];
  }, [assignedReview, childId, revision]);
  const fruitShopProgress = useMemo(() => childId ? readFruitShopProgress(childId) : null, [childId, revision]);
  const due = childId && grade ? reviewCandidates(childId, grade, courseSchedule).map((item) => ({ entry: item.entry, day: item.reviewDay })) : [];
  if (assignedReview?.day === localDayKey() && !assignmentCompleted && !due.some((item) => item.entry.id === assignedReview.entryId)) {
    const entry = entries.find((item) => item.id === assignedReview.entryId);
    if (entry && (assignedReview.reviewDay === 0 || assignedReview.reviewDay === -1)) due.push({ entry, day: assignedReview.reviewDay });
  }
  const matchedLifeReview = due.find(({ entry }) => entry.subject === 'math' && mathLifeSceneForLesson(entry.lessonId));
  const matchedLifeScene = mathLifeSceneForLesson(matchedLifeReview?.entry.lessonId);
  const matchedFruitAbility = fruitShopAbilityForLesson(matchedLifeReview?.entry.lessonId);
  const matchedLifeDay = matchedLifeReview?.day ?? 0;
  const complete = (entry: ReviewEntry, day: number) => {
    if (!childId) return;
    completeDailyReview(childId, entry.id, day);
    completeReviewDay(childId, entry.id, day);
    setRevision((value) => value + 1);
  };
  return <main className="page review-hub">
    <header className="review-hub-head"><BackButton onClick={() => nav('/')} aria-label="返回首页" /><div><span>STUDY RHYTHM</span><h1>今日复习</h1><p>把不同课程需要再见一次的内容集中在这里。</p></div><b>{due.length} 节待复习</b></header>
    {matchedLifeReview && matchedLifeScene && <section className="review-story-practice" aria-label="今日情境实践">
      <div className="review-story-art" aria-hidden="true"><span>{matchedLifeScene.kind === 'repair-shop' ? '🦊' : '🐰'}</span><i>{matchedLifeScene.props[0]}</i><i>{matchedLifeScene.props[1]}</i><b>{matchedLifeScene.icon}</b></div>
      <div><small>今日情境实践 · 数学</small><h2>《{matchedLifeReview.entry.title}》· {matchedLifeScene.title}</h2><p>{matchedFruitAbility ? `三张订单继续练习「${FRUIT_SHOP_ABILITY_LABELS[matchedFruitAbility]}」。` : matchedLifeScene.summary}</p><span>{matchedLifeScene.kind === 'fruit-shop' && fruitShopProgress?.sessions.length ? `已经开店 ${fruitShopProgress.sessions.length} 次 · 收藏 ${fruitShopProgress.stickers.length} 张贴纸` : '把本课方法用到新的生活任务里'}</span></div>
      <button onClick={() => nav(mathLifeSceneRoute(matchedLifeReview.entry.lessonId, 'review', matchedLifeDay))}>开始实践 →</button>
    </section>}
    {due.length > 0 ? <section className="review-hub-list" aria-label="今日待复习课程">{due.map(({ entry, day }) => {
      const subject = SUBJECT[entry.subject];
      const check = reviewCheck(entry);
      const reviewing = reviewingId === entry.id;
      return <article key={entry.id} className={`review-hub-card ${entry.subject}`}><span className="review-subject-icon">{subject.icon}</span><div className="review-hub-main"><small>{subject.label} · {day === 0 ? '当天短巩固' : '课程表复习'}</small><h2>{entry.title}</h2><p><b>这次回顾：</b>{entry.focus}</p>{reviewing && check && <ReviewMiniCheck check={check} onPass={() => complete(entry, day)} />}</div><div className="review-hub-actions"><button className="review-go" onClick={() => nav(entry.route)}>去课程复习 →</button>{check && <button className="review-done" onClick={() => setReviewingId(reviewing ? null : entry.id)}>{reviewing ? '收起小检验' : '开始小检验'}</button>}</div></article>;
    })}</section> : <section className="review-empty"><i>✓</i><h2>今天没有待复习的课程</h2><p>新课当天会有短巩固；之后按课程表勾选的学科安排复习。</p><button onClick={() => nav('/subject/english')}>去学习新课程</button></section>}
  </main>;
}
