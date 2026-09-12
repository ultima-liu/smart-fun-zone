import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, goldSkillCount, skillState } from '../store';
import { useI18n } from '../i18n';
import PageHero from '../components/PageHero';
import { KidButton } from '../components/ui';
import { GRADES, STAGES, SUBJECTS, type Grade, type SchoolStage } from '../types';
import { getSkill, skillsByGrade } from '../content/skills';
import NpcBuddy from '../components/NpcBuddy';
import { speak, stopMusic } from '../speech';

const EMPTY_WRONGS: { lessonId: string; lessonName: string; kind: string; answer: string; time: number }[] = [];

/** 星卷学校入口页：学段 · 年级 · 学科 · 继续学习 */
export default function WorldMapPage() {
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const profiles = useStore((s) => s.profiles);
  const activeChildId = useStore((s) => s.activeChildId);
  const child = useMemo(() => profiles.find((p) => p.id === activeChildId), [profiles, activeChildId]);
  const mastery = useStore((s) => s.mastery);
  const records = useStore((s) => s.records);
  const wrongsMap = useStore((s) => s.wrongs);
  const wrongs = useMemo(() => wrongsMap[activeChildId ?? ''] ?? EMPTY_WRONGS, [wrongsMap, activeChildId]);
  const spokenFor = useRef<string | null>(null);

  const [stage, setStage] = useState<SchoolStage>('primary');
  const [grade, setGrade] = useState<Grade>(child?.ageBand ?? 'g1');

  useEffect(() => {
    if (!child) {
      nav('/');
      return;
    }
    if (spokenFor.current !== `${child.id}:${lang}`) {
      spokenFor.current = `${child.id}:${lang}`;
      speak(t('welcomeSchool'), lang);
    }
    return () => stopMusic();
  }, [child?.id, lang, nav, t]);

  const gradeIdx = Math.max(0, GRADES.findIndex((g) => g.id === grade));
  const gradeSkills = useMemo(() => skillsByGrade(grade), [grade]);

  const continueSkill = useMemo(() => {
    if (!child) return undefined;
    const unfinished = gradeSkills.find((s) => !skillState(mastery, child.id, s.id).gold);
    if (unfinished) return unfinished;
    const nextGrade = GRADES[gradeIdx + 1];
    if (nextGrade) {
      const next = skillsByGrade(nextGrade.id);
      if (next.length) return next[0];
    }
    return gradeSkills[0];
  }, [gradeSkills, gradeIdx, mastery, child, child?.id]);

  const continueState = continueSkill && child
    ? skillState(mastery, child.id, continueSkill.id)
    : null;

  const subjectStats = useMemo(() => {
    const stats: Record<string, { total: number; gold: number; wrong: number }> = {};
    SUBJECTS.forEach((sub) => {
      stats[sub.id] = { total: 0, gold: 0, wrong: 0 };
    });
    if (!child) return stats;
    gradeSkills.forEach((s) => {
      const st = skillState(mastery, child.id, s.id);
      const cur = stats[s.subject] ?? { total: 0, gold: 0, wrong: 0 };
      cur.total += 1;
      if (st.gold) cur.gold += 1;
      stats[s.subject] = cur;
    });
    wrongs.forEach((w) => {
      const s = getSkill(w.lessonId);
      if (s && stats[s.subject]) stats[s.subject].wrong += 1;
    });
    return stats;
  }, [gradeSkills, mastery, child, child?.id, wrongs]);

  if (!child) return null;

  const goldCount = goldSkillCount(mastery, child.id);
  const starTotal = records
    .filter((r) => r.childId === child.id)
    .reduce((sum, r) => sum + r.stars, 0);

  const handleStage = (sg: SchoolStage) => {
    setStage(sg);
    speak(STAGES.find((s) => s.id === sg)?.name[lang] ?? '', lang);
  };

  const handleGrade = (g: Grade) => {
    setGrade(g);
    speak(lang === 'zh' ? `${g.slice(1)}年级` : `Grade ${g.slice(1)}`, lang);
  };

  const goSubject = (sub: typeof SUBJECTS[number]) => {
    speak(sub.name[lang], lang);
    nav(`/subject/${sub.id}?grade=${grade}`);
  };

  return (
    <div className="page map-page">
      <NpcBuddy npc="阿光" storyNodeIds={['c1-1', 'c1-2']} />
      <PageHero
        eyebrow={`${lang === 'zh' ? '学校 · 选年级' : 'School · Pick a Grade'}`}
        title={t('worldMap')}
        planet="academy"
        stats={[
          { icon: '⭐', value: starTotal, tone: 'gold', label: t('totalStars') },
          { icon: '💎', value: goldCount, tone: 'mint', label: t('mastered') },
          ...(wrongs.length > 0
            ? [{
                icon: '📕',
                value: wrongs.length,
                tone: 'coral' as const,
                label: t('wrongBook'),
                onClick: () => nav('/wrongs'),
                ariaLabel: t('wrongBook'),
              }]
            : []),
        ]}
      />

      {/* 学段大卡片 */}
      <div className="stage-deck" role="tablist" aria-label={lang === 'zh' ? '学段' : 'Stage'}>
        {STAGES.map((sg) => {
          const active = stage === sg.id;
          const ready = sg.id === 'primary';
          return (
            <button
              key={sg.id}
              className={`stage-card${active ? ' active' : ''}${ready ? ' ready' : ' soon'}`}
              role="tab"
              aria-selected={active}
              onClick={() => handleStage(sg.id)}
            >
              <span>{sg.name[lang]}</span>
              {!ready && <span className="stage-card-badge">{lang === 'zh' ? '筹备中' : 'Soon'}</span>}
            </button>
          );
        })}
      </div>

      {stage !== 'primary' ? (
        <div className="coming-soon-card v2">
          <span className="coming-soon-icon">🚧</span>
          <b>{STAGES.find((sg) => sg.id === stage)?.name[lang]} {t('comingSoon')}</b>
          <p>{lang === 'zh' ? '先把小学星球点亮吧！' : 'Light up the primary planet first!'}</p>
          <KidButton color="green" onClick={() => { setStage('primary'); speak('小学', lang); }}>
            🏫 {lang === 'zh' ? '去小学' : 'Go Primary'}
          </KidButton>
        </div>
      ) : (
        <>
          {/* 年级轨道 */}
          <div className="grade-orbit" role="tablist" aria-label={lang === 'zh' ? '年级' : 'Grade'}>
            <div className="grade-switch" style={{ '--gidx': gradeIdx } as React.CSSProperties}>
              <span className="grade-thumb" aria-hidden="true" />
              {GRADES.map((g) => (
                <button
                  key={g.id}
                  className={`grade-seg ${grade === g.id ? 'active' : ''}`}
                  role="tab"
                  aria-selected={grade === g.id}
                  onClick={() => handleGrade(g.id)}
                >
                  {lang === 'zh' ? `${g.id.slice(1)}年级` : `Grade ${g.id.slice(1)}`}
                </button>
              ))}
            </div>
          </div>

          {/* 继续学习推荐 */}
          {continueSkill && (
            <div
              className="continue-card"
              onClick={() => {
                speak(continueSkill.name[lang], lang);
                nav(`/learn/${continueSkill.id}?from=map`);
              }}
              role="button"
              tabIndex={0}
            >
              <span className="continue-label">{lang === 'zh' ? '继续学习' : 'Continue'}</span>
              <div className="continue-info">
                <span className="continue-subject">
                  {SUBJECTS.find((s) => s.id === continueSkill.subject)?.icon} {' '}
                  {continueSkill.name[lang]}
                </span>
                <div className="continue-bar" style={{ '--rc': SUBJECTS.find((s) => s.id === continueSkill.subject)?.color ?? '#8f7bf0' } as React.CSSProperties}>
                  <div
                    className="continue-fill"
                    style={{ width: `${((continueState?.stars ?? 0) / 3) * 100}%` }}
                  />
                </div>
                <span className="continue-meta">
                  {continueState?.gold
                    ? (lang === 'zh' ? '已掌握 · 挑战下一课' : 'Mastered · next lesson')
                    : `${lang === 'zh' ? '当前进度' : 'Progress'} ${continueState?.stars ?? 0}/3`}
                </span>
              </div>
              <span className="continue-arrow">→</span>
            </div>
          )}

          {/* 学科卡片 */}
          <div className="subject-grid map-subjects">
            {SUBJECTS.map((sub) => {
              const stat = subjectStats[sub.id];
              const pct = stat.total > 0 ? Math.round((stat.gold / stat.total) * 100) : 0;
              return (
                <button
                  key={sub.id}
                  className="subject-card"
                  onClick={() => goSubject(sub)}
                  style={{ '--sub-color': sub.color } as React.CSSProperties}
                >
                  <span className="subject-cover" style={{ background: sub.color }}>
                    <span className="subject-emoji">{sub.icon}</span>
                    {stat.wrong > 0 && (
                      <span className="subject-wrong-badge">{stat.wrong}</span>
                    )}
                  </span>
                  <span className="subject-name">{sub.name[lang]}</span>
                  <span className="subject-progress">
                    <span className="subject-progress-track">
                      <span className="subject-progress-fill" style={{ width: `${pct}%` }} />
                    </span>
                    <small>{stat.gold}/{stat.total}</small>
                  </span>
                  <span className="subject-meta">
                    {stat.total} {t('skills')}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
