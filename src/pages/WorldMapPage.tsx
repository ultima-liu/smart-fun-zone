import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, goldSkillCount, skillState } from '../store';
import { useI18n } from '../i18n';
import PageHero from '../components/PageHero';
import { GRADES, STAGES, SUBJECTS, type Grade, type SchoolStage } from '../types';
import { skillsByGrade } from '../content/skills';
import { TEXTBOOK_SUBJECTS, getTextbook, volLabel } from '../content/textbooks';
import NpcBuddy from '../components/NpcBuddy';
import { speak, speakAsNpc, stopMusic } from '../speech';
import { npcMeta } from '../content/npc';

const EMPTY_WRONGS: { lessonId: string; lessonName: string; kind: string; answer: string; time: number }[] = [];
/** 思维/科学/生活是技能课，不设课本，单独一排入口 */
const EXT_SUBJECTS = ['thinking', 'science', 'life'];

/** 星卷学校入口页：学段 → 年级书架 → 学科课本（上/下册）全层次一屏展开 */
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
  const grade = (child?.ageBand ?? 'g1') as Grade;
  const [schoolWelcomeDone, setSchoolWelcomeDone] = useState(false);

  useEffect(() => {
    if (!child) {
      nav('/');
      return;
    }
    if (spokenFor.current !== `${child.id}:${lang}`) {
      spokenFor.current = `${child.id}:${lang}`;
      setSchoolWelcomeDone(false);
      speakAsNpc(t('welcomeSchool'), npcMeta('阿光'), lang, 0.92, () => setSchoolWelcomeDone(true));
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

  if (!child) return null;

  const goldCount = goldSkillCount(mastery, child.id);
  const starTotal = records
    .filter((r) => r.childId === child.id)
    .reduce((sum, r) => sum + r.stars, 0);

  const handleStage = (sg: SchoolStage) => {
    setStage(sg);
    speak(STAGES.find((s) => s.id === sg)?.name[lang] ?? '', lang);
  };

  /** 点击一册课本：已开课进入目录，未开课给语音提示 */
  const openBook = (subject: string, g: Grade, vol: 1 | 2) => {
    const book = getTextbook(subject, g, vol);
    const name = `${TEXTBOOK_SUBJECTS.find((s) => s.id === subject)?.zh ?? subject}${GRADES.find((x) => x.id === g)?.name.zh ?? ''}${volLabel(vol)}`;
    if (book.available && book.route) {
      speak(`打开${name}`, lang);
      nav(book.route);
    } else {
      speak(`${name}还在筹备中，先去已经开课的课本吧。`, lang);
    }
  };

  return (
    <div className="page map-page">
      <NpcBuddy npc="阿光" storyNodeIds={['c1-1', 'c1-2']} deferAutoStory={!schoolWelcomeDone} />
      <PageHero
        eyebrow={`${lang === 'zh' ? '学校 · 课本书架' : 'School · Bookshelf'}`}
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

      {/* 学段 + 继续学习：一行工具条（左边切学段，右边接着学） */}
      <div className="map-toolbar">
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

        {stage === 'primary' && continueSkill && (
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
      </div>

      {stage !== 'primary' ? (
        <div className="coming-soon-card v2">
          <span className="coming-soon-icon">🚧</span>
          <b>{STAGES.find((sg) => sg.id === stage)?.name[lang]} {t('comingSoon')}</b>
          <p>{lang === 'zh' ? '先把小学星球点亮吧！' : 'Light up the primary planet first!'}</p>
        </div>
      ) : (
        <>
          {/* 课本书架：年级 × 学科 × 上下册 全层次直接展开 */}
          <div className="bookcase" aria-label={lang === 'zh' ? '课本书架：选择年级、学科和上下册' : 'Textbook shelves'}>
            <div className="bookcase-head">
              <div className="bookcase-title">
                <span className="bookcase-kicker" aria-hidden="true">{lang === 'zh' ? '✦ 星穹书院 ✦' : '✦ Astral Academy ✦'}</span>
                <b>{lang === 'zh' ? '课本书架' : 'Bookshelf'}</b>
              </div>
              <span>{lang === 'zh' ? '每个年级一层 · 每科两册 · 点击亮着的课本进入目录' : 'One shelf per grade · tap a lit book'}</span>
            </div>
            {GRADES.map((g) => {
              const mine = g.id === grade;
              return (
                <div className={`shelf ${mine ? 'mine' : ''}`} key={g.id}>
                  <div className="shelf-rail">
                    <b>{g.name.zh}</b>
                    {mine && <i>{lang === 'zh' ? '我的年级' : 'Mine'}</i>}
                  </div>
                  <div className="shelf-plank" role="list">
                    {TEXTBOOK_SUBJECTS.map((sub) => ([1, 2] as const).map((vol) => {
                      const book = getTextbook(sub.id, g.id, vol);
                      return (
                        <button
                          key={`${sub.id}-${vol}`}
                          role="listitem"
                          className={`book-spine book-${sub.id} ${book.available ? 'open' : 'locked'}`}
                          data-motif={sub.id === 'math' ? '123' : sub.id === 'chinese' ? '文' : 'ABC'}
                          style={{ '--spine-c': sub.color } as React.CSSProperties}
                          onClick={() => openBook(sub.id, g.id, vol)}
                          aria-label={`${sub.zh} ${g.name.zh} ${volLabel(vol)}${book.available ? '，进入目录' : '，筹备中'}`}
                        >
                          <span className="book-head" aria-hidden="true"><em>{sub.icon}</em><b>{sub.zh}</b></span>
                          <span className="book-spine-vol" aria-hidden="true">{volLabel(vol)}</span>
                          {book.available && <span className="book-spine-badge">{lang === 'zh' ? '开课中' : 'Open'}</span>}
                          {!book.available && <span className="book-spine-lock" aria-hidden="true">🔒</span>}
                        </button>
                      );
                    }))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 拓展技能课入口（无课本，不设上下册） */}
          <div className="ext-classes" aria-label={lang === 'zh' ? '拓展课程' : 'Skill classes'}>
            <b>✨ {lang === 'zh' ? '拓展课程' : 'Skill Classes'}</b>
            <div className="ext-chips">
              {EXT_SUBJECTS.map((id) => {
                const sub = SUBJECTS.find((s) => s.id === id);
                if (!sub) return null;
                return (
                  <button key={id} className="ext-chip" style={{ '--ext-color': sub.color } as React.CSSProperties} onClick={() => { speak(sub.name[lang], lang); nav(`/subject/${sub.id}?grade=${grade}`); }}>
                    <span>{sub.icon}</span>{sub.name[lang]}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
