import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore, skillState } from '../store';
import { useI18n } from '../i18n';
import { TopBar, Stars } from '../components/ui';
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
      <TopBar
        title={
          <span>
            {subject.icon} {subject.name[lang]}
          </span>
        }
        onBack={() => nav('/map')}
      />

      <div className="category-head">
        <SceneBanner kind={subject.id} height={92} />
        <h2 className="category-title">
          <span style={{ background: subject.color }} className="category-badge">
            {subject.icon}
          </span>
          {subject.name[lang]}
        </h2>
      </div>

      {/* 第一行：年级分段开关（学科色滑块） */}
      <div className="grade-switch" role="tablist">
        {GRADES.map((g) => (
          <button
            key={g.id}
            className={`grade-seg ${grade === g.id ? 'active' : ''}`}
            style={grade === g.id ? { background: subject.color } : undefined}
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
                    speak(lesson.name[lang], lang);
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
