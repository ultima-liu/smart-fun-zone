import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore, skillState } from '../store';
import { useI18n } from '../i18n';
import { KidButton, Stars } from '../components/ui';
import { IconBack } from '../components/icons';
import { SceneBanner } from '../components/scenes';
import { GRADES, SUBJECTS, type Grade } from '../types';
import { lessonsByUnit, skillEmoji } from '../content/skills';
import { speak } from '../speech';

export default function SubjectPage() {
  const { subjectId } = useParams();
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const mastery = useStore((s) => s.mastery);
  const subject = SUBJECTS.find((s) => s.id === subjectId);
  const [params] = useSearchParams();
  // 从 URL 恢复上次选择的年级/上下册（返回时保持原位）
  const [grade, setGrade] = useState<Grade>((params.get('grade') as Grade) ?? 'g1');
  const [term, setTerm] = useState<'上' | '下'>((params.get('term') as '上' | '下') ?? '上');
  const gradeIdx = GRADES.findIndex((g) => g.id === grade);

  useEffect(() => {
    if (!child || !subject) {
      nav('/map');
      return;
    }
    speak(subject.name[lang], lang);
  }, [child, subject, lang, nav]);

  // 从课文返回时：滚动并高亮那篇课文所在的单元目录
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

  if (!child || !subject) return null;

  const groups = lessonsByUnit(grade, subject.id).filter((g) => g.term === term);
  const emptySubject = groups.length === 0 || groups.every((g) => g.lessons.length === 0);

  return (
    <div className="page subject-page">
      <div className="category-head">
        {/* 整合头部：横幅 + 返回按钮 + 学科标题（去除独立 TopBar 层，结构更简洁） */}
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

      {/* 第一行：年级分段开关（滑动深色游标） */}
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

      {/* 第二行：上下册 tab 页签（切换变更目录内容） */}
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

      {emptySubject && <p className="empty-tip">{t('noData')}</p>}

      {/* 学期 → 单元 → 课时 分组课程 */}
      {groups.map((g, gi) => (
        <section
          key={g.unit.zh}
          id={`unit-${gi}`}
          className={`module ${unitParam === String(gi) ? 'unit-flash' : ''}`}
        >
          <h3 className="module-title">{lang === 'zh' ? g.unit.zh : g.unit.en}</h3>
          <div className="skill-list">
            {g.lessons.map((lesson) => {
              const st = skillState(mastery, child.id, lesson.id);
              const cls = st.gold ? 'gold' : st.stars >= 1 ? 'lit' : 'new';
              return (
                <button
                  key={lesson.id}
                  className={`skill-chip ${cls}`}
                  onClick={() => {
                    // 朗读语言按课程内容：英语课程显式 'en'，其余按界面语言
                    const spLang: 'zh' | 'en' = lesson.subject === 'english' ? 'en' : lang;
                    speak(lesson.name[spLang], spLang);
                    nav(`/learn/${lesson.id}?from=subject&grade=${grade}&term=${term}&unit=${gi}`);
                  }}
                >
                  <span className="skill-emoji">{skillEmoji(lesson)}</span>
                  <span className="skill-name">{lesson.name[lang]}</span>
                  <Stars count={st.stars} size={15} />
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
