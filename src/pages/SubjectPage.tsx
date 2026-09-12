import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useStore, skillState } from '../store';
import { useI18n } from '../i18n';
import { KidButton, Stars } from '../components/ui';
import { IconBack } from '../components/icons';
import { SceneBanner } from '../components/scenes';
import { GRADES, SUBJECTS, type Grade } from '../types';
import { getSkill, lessonsByUnit, skillEmoji } from '../content/skills';
import { speak } from '../speech';

const EMPTY_WRONGS: { uid: string; lessonId: string; lessonName: string; kind: string; answer: string; time: number }[] = [];

export default function SubjectPage() {
  const { subjectId } = useParams();
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const profiles = useStore((s) => s.profiles);
  const activeChildId = useStore((s) => s.activeChildId);
  const child = useMemo(() => profiles.find((p) => p.id === activeChildId), [profiles, activeChildId]);
  const mastery = useStore((s) => s.mastery);
  const wrongsMap = useStore((s) => s.wrongs);
  const wrongs = useMemo(() => wrongsMap[activeChildId ?? ''] ?? EMPTY_WRONGS, [wrongsMap, activeChildId]);
  const subject = SUBJECTS.find((s) => s.id === subjectId);
  const [params] = useSearchParams();
  const [grade, setGrade] = useState<Grade>((params.get('grade') as Grade) ?? 'g1');
  const [term, setTerm] = useState<'上' | '下'>((params.get('term') as '上' | '下') ?? '上');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const gradeIdx = GRADES.findIndex((g) => g.id === grade);

  const groups = useMemo(
    () => (subject ? lessonsByUnit(grade, subject.id).filter((g) => g.term === term) : []),
    [grade, subject, term],
  );

  const unitProgress = useMemo(
    () =>
      groups.map((g) => {
        const total = g.lessons.length;
        const gold = child
          ? g.lessons.filter((l) => skillState(mastery, child.id, l.id).gold).length
          : 0;
        return { total, gold, pct: total > 0 ? gold / total : 0 };
      }),
    [groups, mastery, child?.id],
  );

  const subjectWrongs = useMemo(
    () => (subject ? wrongs.filter((w) => getSkill(w.lessonId)?.subject === subject.id) : []),
    [wrongs, subject?.id],
  );

  const initialExpanded = useMemo(() => {
    const init: Record<number, boolean> = {};
    const firstOpen = unitProgress.findIndex((p) => p.gold < p.total);
    const openIdx = firstOpen >= 0 ? firstOpen : Math.max(groups.length - 1, 0);
    groups.forEach((_, i) => {
      init[i] = i === openIdx || unitProgress[i].gold < unitProgress[i].total;
    });
    return init;
  }, [groups, unitProgress]);

  const [expanded, setExpanded] = useState<Record<number, boolean>>(initialExpanded);
  useEffect(() => setExpanded(initialExpanded), [initialExpanded]);

  useEffect(() => {
    if (!child || !subject) {
      nav('/map');
      return;
    }
    speak(subject.name[lang], lang);
  }, [child, subject, lang, nav]);

  const unitParam = params.get('unit');
  useEffect(() => {
    if (unitParam === null) return;
    const t = window.setTimeout(() => {
      document
        .getElementById(`unit-${unitParam}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => window.clearTimeout(t);
  }, [unitParam]);

  useEffect(() => {
    const syncBackToTop = () => setShowBackToTop(window.scrollY > 360);
    window.addEventListener('scroll', syncBackToTop, { passive: true });
    syncBackToTop();
    return () => window.removeEventListener('scroll', syncBackToTop);
  }, []);

  if (!child || !subject) return null;

  const emptySubject = groups.length === 0 || groups.every((g) => g.lessons.length === 0);


  const toggleUnit = (i: number) => setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));

  const goWrongPractice = () => {
    nav(`/wrongs?subject=${subject.id}`);
  };

  const handleLesson = (lesson: typeof groups[number]['lessons'][number], gi: number) => {
    const spLang: 'zh' | 'en' = lesson.subject === 'english' ? 'en' : lang;
    speak(lesson.name[spLang], spLang);
    nav(`/learn/${lesson.id}?from=subject&grade=${grade}&term=${term}&unit=${gi}`);
  };

  return (
    <div className="page subject-page">
      <div className="category-head">
        <div className="category-hero">
          <SceneBanner kind={subject.id} height={176} />
          <div className="category-scrim" aria-hidden="true" />
          <div className="lesson-hero-back">
            <KidButton color="white" className="icon-btn" onClick={() => nav('/map')} ariaLabel="back">
              <IconBack size={22} />
            </KidButton>
          </div>
          <div className="lesson-hero-overlay">
            <div className="lesson-hero-title">
              <span className="lesson-hero-eyebrow">Subject · {subject.name.en ?? subject.name.zh}</span>
              <span className="lesson-hero-name">📖 {subject.name[lang]}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grade-switch" style={{ '--gidx': gradeIdx } as CSSProperties} role="tablist">
        <span className="grade-thumb" aria-hidden="true" />
        {GRADES.map((g) => (
          <button
            key={g.id}
            className={`grade-seg ${grade === g.id ? 'active' : ''}`}
            onClick={() => setGrade(g.id)}
            role="tab"
            aria-selected={grade === g.id}
          >
            {lang === 'zh' ? `${g.id.slice(1)}年级` : `Grade ${g.id.slice(1)}`}
          </button>
        ))}
      </div>

      <div className="term-tabs" role="tablist">
        {(['上', '下'] as const).map((t2) => (
          <button
            key={t2}
            className={`term-tab ${term === t2 ? 'active' : ''}`}
            onClick={() => setTerm(t2)}
            role="tab"
            aria-selected={term === t2}
          >
            {t2 === '上' ? t('termUp') : t('termDown')}
          </button>
        ))}
      </div>

      {subjectWrongs.length > 0 && (
        <div className="subject-wrong-card" onClick={goWrongPractice} role="button" tabIndex={0}>
          <span className="swc-icon">📕</span>
          <div className="swc-text">
            <b>{lang === 'zh' ? '有错题等你去打败！' : 'Mistakes waiting for you!'}</b>
            <small>{lang === 'zh' ? `本学科还有 ${subjectWrongs.length} 道错题，点这里再练一遍` : `${subjectWrongs.length} mistakes in this subject — practice again`}</small>
          </div>
          <span className="swc-go">→</span>
        </div>
      )}

      {emptySubject && <p className="empty-tip">{t('noData')}</p>}

      {groups.map((g, gi) => {
        const prog = unitProgress[gi];
        const open = expanded[gi] ?? false;
        const circumference = 2 * Math.PI * 16;
        const dash = `${prog.pct * circumference} ${circumference}`;
        return (
          <section
            key={g.unit.zh}
            id={`unit-${gi}`}
            className={`module ${unitParam === String(gi) ? 'unit-flash' : ''}`}
          >
            <button
              className="module-header"
              onClick={() => toggleUnit(gi)}
              aria-expanded={open}
            >
              <div className="module-title-wrap">
                <span className="unit-ic" style={{ background: subject.color }}>{subject.icon}</span>
                <h3 className="module-title">{lang === 'zh' ? g.unit.zh : g.unit.en}</h3>
              </div>
              <div className="module-status">
                <div className="unit-ring" aria-hidden="true">
                  <svg viewBox="0 0 36 36">
                    <circle className="ring-bg" cx="18" cy="18" r="16" />
                    <circle
                      className="ring-fill"
                      cx="18"
                      cy="18"
                      r="16"
                      strokeDasharray={dash}
                      transform="rotate(-90 18 18)"
                    />
                  </svg>
                  <small>{prog.gold}/{prog.total}</small>
                </div>
                <span className="module-toggle">{open ? '▲' : '▼'}</span>
              </div>
            </button>
            {open && (
              <div className="skill-list">
                {g.lessons.map((lesson) => {
                  const st = skillState(mastery, child.id, lesson.id);
                  const cls = st.gold ? 'gold' : st.stars >= 1 ? 'lit' : 'new';
                  return (
                    <button
                      key={lesson.id}
                      className={`skill-chip ${cls}`}
                      onClick={() => handleLesson(lesson, gi)}
                    >
                      <span className="skill-emoji">{skillEmoji(lesson)}</span>
                      <span className="skill-copy">
                        <span className="skill-name">{lesson.name[lang]}</span>
                        <small className="skill-state">
                          {st.gold
                            ? (lang === 'zh' ? '已掌握' : 'Mastered')
                            : st.stars > 0
                              ? (lang === 'zh' ? '学习中' : 'In progress')
                              : (lang === 'zh' ? '等待探索' : 'Ready to explore')}
                        </small>
                      </span>
                      <span className="skill-badge">
                        {st.gold ? '👑' : <Stars count={st.stars} size={14} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
      {showBackToTop && createPortal((
        <button
          className="subject-back-to-top"
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label={lang === 'zh' ? '回到课程目录顶部' : 'Back to course directory top'}
        >
          <span aria-hidden="true">↑</span>
          <small>{lang === 'zh' ? '顶部' : 'Top'}</small>
        </button>
      ), document.body)}
    </div>
  );
}
