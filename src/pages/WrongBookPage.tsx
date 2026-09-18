import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { useI18n } from '../i18n';
import { gradeLabel, SUBJECTS, type SubjectId } from '../types';
import { CHINESE_TEXTBOOK_LESSONS } from '../content/chineseTextbookCurriculum';
import '../review-hub.css';

/** 学科识别只认 3 本已开课课本；老课程遗留的错题仍可查看/删除，但不再提供「再练」 */
const wrongSubject = (lessonId: string): SubjectId | undefined =>
  lessonId.startsWith('math-lab-') ? 'math'
    : lessonId.startsWith('english-g3a-') ? 'english'
      : CHINESE_TEXTBOOK_LESSONS.some((lesson) => lesson.id === lessonId) ? 'chinese'
        : undefined;
const wrongPracticeTarget = (lessonId: string) => lessonId.startsWith('math-lab-')
  ? `/math-course/${lessonId.replace('math-lab-', '')}`
  : lessonId.startsWith('english-g3a-')
    ? `/english-course/${lessonId.replace('english-g3a-', '')}`
    : CHINESE_TEXTBOOK_LESSONS.some((lesson) => lesson.id === lessonId)
      ? `/chinese-course/${lessonId}`
      : undefined;

/** 学科图标与主题色（数学/语文/英语沿用今日复习页配色） */
const META: Record<SubjectId, { label: string; icon: string; color: string }> = {
  math: { label: '数学', icon: '数', color: '#4d9bd5' },
  chinese: { label: '语文', icon: '文', color: '#dd8555' },
  english: { label: '英语', icon: 'A', color: '#5fb990' },
  thinking: { label: '思维', icon: '思', color: '#a97fd6' },
  science: { label: '科学', icon: '科', color: '#67b97a' },
  life: { label: '生活', icon: '活', color: '#e08a68' },
};

/** 孩子的错题本：看自己答错的题，并可“再去练一遍”（版式与今日复习页一致） */
export default function WrongBookPage() {
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const [params] = useSearchParams();
  const subjectFilter = params.get('subject');
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const wrongs = useStore((s) => s.wrongs);
  const removeWrong = useStore((s) => s.removeWrong);

  const allList = child ? wrongs[child.id] ?? [] : [];
  const list = useMemo(() => {
    if (!subjectFilter) return allList;
    return allList.filter((w) => wrongSubject(w.lessonId) === subjectFilter);
  }, [allList, subjectFilter]);

  const subject = SUBJECTS.find((s) => s.id === subjectFilter);
  const backTarget = subject ? `/subject/${subject.id}` : '/';
  const title = subject ? `${subject.name[lang]} · ${t('wrongBook')}` : t('wrongBook');

  return (
    <main className="page review-hub">
      <header className="review-hub-head">
        <button onClick={() => nav(backTarget)} aria-label="返回">←</button>
        <div>
          <span>WRONG BOOK</span>
          <h1>{title}</h1>
          <p>{child
            ? `${child.name}（${gradeLabel(child.ageBand, lang)}）答错的题都收在这里，点“再练一次”就不怕啦！`
            : '这里会收下你答错的题，随时回来再练一遍。'}</p>
        </div>
        <b>{list.length} 道错题</b>
      </header>
      {!child ? (
        <section className="review-empty"><i>✓</i><h2>{t('noData')}</h2></section>
      ) : list.length === 0 ? (
        <section className="review-empty">
          <i>✓</i>
          <h2>还没有错题，太棒啦！</h2>
          <p>答错的题目会自动收进这本错题本，随时可以回来再练一遍。</p>
          <button onClick={() => nav('/map')}>去学习新课程</button>
        </section>
      ) : (
        <section className="review-hub-list" aria-label="错题列表">
          {list.map((w) => {
            const sid = wrongSubject(w.lessonId);
            const meta = sid ? META[sid] : undefined;
            const practiceTarget = wrongPracticeTarget(w.lessonId);
            return (
              <article
                key={w.uid}
                className={`review-hub-card ${sid ?? ''}`}
                style={meta ? ({ '--review-color': meta.color } as React.CSSProperties) : undefined}
              >
                <span className="review-subject-icon">{meta?.icon ?? '题'}</span>
                <div className="review-hub-main">
                  <small>{meta?.label ?? '错题'} · 题型 {w.kind}</small>
                  <h2>{w.lessonName || w.lessonId}</h2>
                  <p><b>答错的答案：</b>{w.answer || '（这一题没选对哦）'}</p>
                </div>
                <div className="review-hub-actions">
                  {practiceTarget && <button className="review-go" onClick={() => nav(practiceTarget)}>{t('again')} →</button>}
                  <button className="review-done" aria-label="删除" onClick={() => removeWrong(child.id, w.uid)}>✕ 删除</button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
