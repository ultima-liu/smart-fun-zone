import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, goldSkillCount } from '../store';
import { useI18n } from '../i18n';
import { GRADES, STAGES, SUBJECTS, type Grade, type SchoolStage } from '../types';
import { TEXTBOOK_SUBJECTS, getTextbook, volLabel } from '../content/textbooks';
import { nextLessonToLearn } from '../activeCourses';
import NpcBuddy from '../components/NpcBuddy';
import { speak, speakAsNpc } from '../speech';
import { npcMeta } from '../content/npc';

const EMPTY_WRONGS: { lessonId: string; lessonName: string; kind: string; answer: string; time: number }[] = [];

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
  const [openingBook, setOpeningBook] = useState<{ key: string; route: string } | null>(null);

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
  }, [child?.id, lang, nav, t]);

  useEffect(() => {
    if (!openingBook) return undefined;
    const timer = window.setTimeout(() => nav(openingBook.route), 560);
    return () => window.clearTimeout(timer);
  }, [nav, openingBook]);

  const continueLesson = useMemo(() => nextLessonToLearn(child?.id, mastery), [mastery, child?.id]);

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
      const bookKey = `${subject}-${g}-${vol}`;
      if (openingBook) return;
      setOpeningBook({ key: bookKey, route: book.route });
      speak(`打开${name}`, lang);
    } else {
      speak(`${name}还在筹备中，先去已经开课的课本吧。`, lang);
    }
  };

  return (
    <div className="page map-page">
      <NpcBuddy npc="阿光" storyNodeIds={['c1-1', 'c1-2']} deferAutoStory={!schoolWelcomeDone} />
      <header className="academy-command-header">
        <div className="academy-crest" aria-hidden="true"><i>✦</i><span /><b /></div>
        <div className="academy-command-copy">
          <span>{lang === 'zh' ? 'JUAN STAR SCHOOL · 学习航站' : 'JUAN STAR SCHOOL · LEARNING PORT'}</span>
          <h1>{t('worldMap')}</h1>
          <p>{lang === 'zh' ? `${child.name}，${GRADES.find((item) => item.id === grade)?.name.zh ?? ''}的探索航线已准备就绪。` : `${child.name}, your learning route is ready.`}</p>
        </div>
        <div className="academy-metrics" aria-label={lang === 'zh' ? '我的学习数据' : 'My learning statistics'}>
          <span><i>⭐</i><b>{starTotal}</b><small>{t('totalStars')}</small></span>
          <span><i>💎</i><b>{goldCount}</b><small>{t('mastered')}</small></span>
          {wrongs.length > 0 && <button onClick={() => nav('/wrongs')} aria-label={t('wrongBook')}><i>📕</i><b>{wrongs.length}</b><small>{t('wrongBook')}</small></button>}
        </div>
      </header>

      <section className="school-portal" aria-label={lang === 'zh' ? '卷星学校校园前庭' : 'Juan Star School campus'}>
        <img src="/assets/school/star-academy-hero-v1.png" alt="云海中的卷星学校星穹校园" />
        <div className="school-portal-shade" aria-hidden="true" />
        <div className="school-portal-copy">
          <span>{lang === 'zh' ? '✦ 晨光已抵达星穹课本馆' : '✦ Morning at the Astral Library'}</span>
          <h2>{lang === 'zh' ? '今天，点亮哪一间课堂？' : 'Which classroom will you light up today?'}</h2>
          <p>{lang === 'zh' ? '沿着星光课程航线，从一本课本开始新的探索。' : 'Follow the starlight course path and begin with a book.'}</p>
        </div>
        <div className="school-portal-route" aria-hidden="true"><span>✦</span><i /><span>◌</span><i /><span>✧</span></div>
      </section>

      {/* 学段 + 继续学习：一行工具条（左边切学段，右边接着学） */}
      <div className="map-toolbar academy-route-console">
        <div className="academy-stage-selector">
          <div className="academy-console-label"><b>{lang === 'zh' ? '选择学习星域' : 'Choose a learning sector'}</b></div>
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
                <span className="stage-card-planet" aria-hidden="true"><i /><em /><strong>✦</strong></span>
                <span className="stage-card-copy"><b>{sg.name[lang]}</b></span>
              </button>
            );
          })}
          </div>
        </div>

        {stage === 'primary' && continueLesson && (
          <div
            className="continue-card"
            onClick={() => {
              speak(continueLesson.title, lang);
              nav(continueLesson.route);
            }}
            role="button"
            tabIndex={0}
          >
            <span className="continue-label">{lang === 'zh' ? '继续学习' : 'Continue'}</span>
            <div className="continue-info">
              <span className="continue-subject">
                {SUBJECTS.find((s) => s.id === continueLesson.subject)?.icon} {' '}
                {continueLesson.title}
              </span>
              <div className="continue-bar" style={{ '--rc': SUBJECTS.find((s) => s.id === continueLesson.subject)?.color ?? '#8f7bf0' } as React.CSSProperties}>
                <div
                  className="continue-fill"
                  style={{ width: `${((continueLesson.stars ?? 0) / 3) * 100}%` }}
                />
              </div>
              <span className="continue-meta">
                {continueLesson.gold
                  ? (lang === 'zh' ? '已掌握 · 挑战下一课' : 'Mastered · next lesson')
                  : `${lang === 'zh' ? '当前进度' : 'Progress'} ${continueLesson.stars ?? 0}/3`}
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
          <div className="bookcase academy-library" aria-label={lang === 'zh' ? '课堂星图：选择年级、学科和上下册' : 'Classroom constellation map'}>
            <div className="bookcase-head">
              <div className="bookcase-title">
                <span className="bookcase-kicker" aria-hidden="true">{lang === 'zh' ? '课堂星图' : 'CLASSROOM CONSTELLATION'}</span>
                <b>{lang === 'zh' ? '选择一束知识星光' : 'Choose a beam of knowledge'}</b>
              </div>
              <span>{lang === 'zh' ? '每层代表一个年级 · 已点亮的课程可以立刻启程' : 'Each level is a grade · lit courses are ready to launch'}</span>
            </div>
            {GRADES.map((g) => {
              const mine = g.id === grade;
              return (
                <div className={`shelf ${mine ? 'mine' : ''}`} key={g.id}>
                  <div className="shelf-rail">
                    <span className="grade-station-sigil" aria-hidden="true"><i>✦</i></span>
                    <small>GRADE {g.id.slice(1).padStart(2, '0')}</small>
                    <b>{g.name.zh}</b>
                    {mine && <i>{lang === 'zh' ? '当前航线' : 'Current route'}</i>}
                  </div>
                  <div className="shelf-plank" role="list">
                    <div className="shelf-constellation" aria-hidden="true"><i /><i /><i /><i /><span /><span /></div>
                    <div className="shelf-plank-head" aria-hidden="true"><span>✦</span><b>{mine ? (lang === 'zh' ? '我的课堂星门' : 'My classroom gates') : (lang === 'zh' ? '待探索课堂星门' : 'Classroom gates')}</b><small>{lang === 'zh' ? '选择一门课程启程' : 'Choose a course to launch'}</small></div>
                    {TEXTBOOK_SUBJECTS.map((sub) => ([1, 2] as const).map((vol) => {
                      const book = getTextbook(sub.id, g.id, vol);
                      return (
                        <button
                          key={`${sub.id}-${vol}`}
                          role="listitem"
                          className={`book-spine book-${sub.id} ${book.available ? 'open' : 'locked'}${openingBook?.key === `${sub.id}-${g.id}-${vol}` ? ' is-opening' : ''}`}
                          data-motif={sub.id === 'math' ? '123' : sub.id === 'chinese' ? '文' : 'ABC'}
                          style={{ '--spine-c': sub.color } as React.CSSProperties}
                          onClick={() => openBook(sub.id, g.id, vol)}
                          aria-busy={openingBook?.key === `${sub.id}-${g.id}-${vol}` || undefined}
                          aria-label={`${sub.zh} ${g.name.zh} ${volLabel(vol)}${book.available ? '，进入目录' : '，筹备中'}`}
                        >
                          <span className="book-head" aria-hidden="true"><b>{sub.zh}</b></span>
                          <span className={`course-field-mark field-${sub.id}`} aria-hidden="true">
                            {sub.id === 'math' ? '1 + 2' : sub.id === 'chinese' ? '横 · 竖 · 撇' : 'Aa · Bb'}
                          </span>
                          <span className="course-star-gate" aria-hidden="true"><i>✦</i><b /></span>
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
        </>
      )}
    </div>
  );
}
