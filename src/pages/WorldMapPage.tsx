import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, goldSkillCount, skillState } from '../store';
import { useI18n } from '../i18n';
import PageHero from '../components/PageHero';
import { KidButton } from '../components/ui';
import { GRADES, STAGES, SUBJECTS, type Grade, type SchoolStage } from '../types';
import { IconStagePrimary, IconStageJunior, IconStageSenior } from '../components/icons';
import { skillsByGrade } from '../content/skills';
import NpcBuddy from '../components/NpcBuddy';
import { speak, stopMusic } from '../speech';

export default function WorldMapPage() {
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const mastery = useStore((s) => s.mastery);
  const records = useStore((s) => s.records);
  const wrongs = useStore((s) => (s.activeChildId ? s.wrongs[s.activeChildId] ?? [] : []));
  // 学段 → 年级：先学段（默认小学有内容），再年级
  const [stage, setStage] = useState<SchoolStage>('primary');
  const [grade, setGrade] = useState<Grade>(child?.ageBand ?? 'g1');

  useEffect(() => {
    if (!child) {
      nav('/');
      return;
    }
    speak(t('welcomeSchool'), lang);
    return () => stopMusic();
  }, [child?.id, lang, nav, t]);

  if (!child) return null;

  const goldCount = goldSkillCount(mastery, child.id);
  const starTotal = records
    .filter((r) => r.childId === child.id)
    .reduce((sum, r) => sum + r.stars, 0);
  const gradeIdx = Math.max(0, GRADES.findIndex((g) => g.id === grade));

  return (
    <div className="page map-page">
      <NpcBuddy npc="阿光" storyNodeIds={["c1-1","c1-2"]} />
      <PageHero
        eyebrow={`${lang === 'zh' ? '学校 · 选年级' : 'School · Pick a Grade'}`}
        title={t('worldMap')}
        planet="academy"
        stats={[
          { icon: '⭐', value: starTotal, tone: 'gold', label: t('totalStars') },
          { icon: '💎', value: goldCount, tone: 'mint', label: t('mastered') },
          ...(wrongs.length > 0
            ? [{ icon: '📕', value: wrongs.length, tone: 'coral' as const, label: t('wrongBook'), onClick: () => nav('/wrongs'), ariaLabel: t('wrongBook') }]
            : []),
        ]}
      />

      {/* 第一步：选学段 */}
      <div className="stage-tabs" role="tablist" aria-label="stage">
        {STAGES.map((sg) => {
          const StageIcon = { primary: IconStagePrimary, junior: IconStageJunior, senior: IconStageSenior }[sg.id];
          return (
            <button
              key={sg.id}
              className={`stage-tab ${stage === sg.id ? 'active' : ''}`}
              role="tab"
              aria-selected={stage === sg.id}
              onClick={() => {
                setStage(sg.id);
                speak(sg.name[lang], lang);
              }}
            >
              <span className="stage-tab-icon"><StageIcon size={32} gradient={stage === sg.id ? 'gold' : 'violet'} /></span>
              <span>{sg.name[lang]}</span>
            </button>
          );
        })}
      </div>

      {/* 初/高中学段：内容准备中 */}
      {stage !== 'primary' ? (
        <div className="coming-soon-card">
          <span className="coming-soon-icon">🚧</span>
          <b>{STAGES.find((sg) => sg.id === stage)?.name[lang]} {t('comingSoon')}</b>
          <p>{lang === 'zh' ? '先来小学探索吧！' : 'Explore Primary first!'}</p>
          <KidButton color="green" onClick={() => { setStage('primary'); speak('小学', lang); }}>
            🏫 去小学
          </KidButton>
        </div>
      ) : (
        <>
          {/* 第二步：选年级（小学） */}
          <div className="grade-switch" role="tablist" aria-label="grade" style={{ '--gidx': gradeIdx } as React.CSSProperties}>
            <span className="grade-thumb" aria-hidden="true" />
            {GRADES.map((g) => (
              <button
                key={g.id}
                className={`grade-seg ${grade === g.id ? 'active' : ''}`}
                role="tab"
                aria-selected={grade === g.id}
                onClick={() => {
                  setGrade(g.id);
                  speak(lang === 'zh' ? `${g.id.slice(1)}年级` : `Grade ${g.id.slice(1)}`, lang);
                }}
              >
                {lang === 'zh' ? `${g.id.slice(1)}年级` : `Grade ${g.id.slice(1)}`}
              </button>
            ))}
          </div>

          {/* 第三步：该年级的学科 */}
          <div className="subject-grid">
            {SUBJECTS.map((sub) => {
              const list = skillsByGrade(grade).filter((s) => s.subject === sub.id);
              const gold = list.filter((s) => skillState(mastery, child.id, s.id).gold).length;
              return (
                <button
                  key={sub.id}
                  className="subject-card"
                  onClick={() => {
                    speak(sub.name[lang], lang);
                    nav(`/subject/${sub.id}?grade=${grade}`);
                  }}
                >
                  <span className="subject-cover" style={{ background: sub.color }}>
                    <span className="subject-emoji">{sub.icon}</span>
                  </span>
                  <span className="subject-name">{sub.name[lang]}</span>
                  <span className="subject-meta">
                    {list.length} {t('skills')} · ⭐ {gold}
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
