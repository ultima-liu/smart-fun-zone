import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { completeReviewDay, dueReviewDays, importReviewEntry, reviewEntries, type ReviewEntry } from '../reviewPlan';
import { ENGLISH_G3_ALL_LESSONS } from '../content/englishGrade3Upper';
import '../review-hub.css';

const SUBJECT: Record<ReviewEntry['subject'], { label: string; icon: string }> = {
  chinese: { label: '语文', icon: '文' }, math: { label: '数学', icon: '数' }, english: { label: '英语', icon: 'A' },
};

export default function ReviewHubPage() {
  const nav = useNavigate();
  const childId = useStore((state) => state.activeChildId);
  const [revision, setRevision] = useState(0);
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
  const entries = useMemo(() => childId ? reviewEntries(childId) : [], [childId, revision]);
  const due = entries.map((entry) => ({ entry, days: dueReviewDays(entry) })).filter((item) => item.days.length > 0);
  const upcoming = entries.map((entry) => ({ entry, days: dueReviewDays(entry), next: [0, 2, 4].find((day) => !entry.completedDays.includes(day) && day > Math.floor((Date.now() - entry.learnedAt) / 86_400_000)) })).filter((item) => item.days.length === 0 && item.next !== undefined).slice(0, 6);
  const complete = (entry: ReviewEntry, day: number) => {
    if (!childId) return;
    completeReviewDay(childId, entry.id, day);
    setRevision((value) => value + 1);
  };
  return <main className="page review-hub">
    <header className="review-hub-head"><button onClick={() => nav('/')} aria-label="返回首页">←</button><div><span>STUDY RHYTHM</span><h1>今日复习</h1><p>把不同课程需要再见一次的内容集中在这里。</p></div><b>{due.length} 节待复习</b></header>
    {due.length > 0 ? <section className="review-hub-list" aria-label="今日待复习课程">{due.map(({ entry, days }) => {
      const subject = SUBJECT[entry.subject];
      const day = days[days.length - 1];
      return <article key={entry.id} className={`review-hub-card ${entry.subject}`}><span className="review-subject-icon">{subject.icon}</span><div className="review-hub-main"><small>{subject.label} · {day === 0 ? '当天回顾' : `第 ${day} 天复习`}</small><h2>{entry.title}</h2><p><b>这次回顾：</b>{entry.focus}</p></div><div className="review-hub-actions"><button className="review-go" onClick={() => nav(entry.route)}>去课程复习 →</button><button className="review-done" onClick={() => complete(entry, day)}>✓ 已完成回顾</button></div></article>;
    })}</section> : <section className="review-empty"><i>✓</i><h2>今天没有待复习的课程</h2><p>学习过的内容会在当天、第 2 天和第 4 天自动出现在这里。</p><button onClick={() => nav('/subject/english')}>去学习新课程</button></section>}
    {upcoming.length > 0 && <section className="review-upcoming"><header><span>接下来</span><h2>之后会回来复习的课程</h2></header><div>{upcoming.map(({ entry, next }) => <article key={entry.id}><b>{SUBJECT[entry.subject].icon}</b><span><strong>{entry.title}</strong><small>{next === 0 ? '今天' : `${next} 天后`}再见一次 · {entry.focus}</small></span></article>)}</div></section>}
  </main>;
}
