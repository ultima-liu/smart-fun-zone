import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, childTotalStars, starsForGame, todayStars, todayGameKinds, streakDays, gardenStage, todayRecords } from '../store';
import { useI18n } from '../i18n';
import { KidButton } from '../components/ui';
import Modal from '../components/Modal';
import { AVATARS, GRADES, SUBJECTS, gradeLabel, type Grade, type SubjectId } from '../types';
import { speak } from '../speech';
import Logo from '../components/Logo';
import Mascot from '../components/Mascot';
import { IconLock, IconSpeakerOff, IconSpeakerOn } from '../components/icons';
import { listGames } from '../games';
import { subjectLessonCount } from '../content/skills';

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function HomePage() {
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const profiles = useStore((s) => s.profiles);
  const records = useStore((s) => s.records);
  const sound = useStore((s) => s.sound);
  const setLang = useStore((s) => s.setLang);
  const toggleSound = useStore((s) => s.toggleSound);
  const setActiveChild = useStore((s) => s.setActiveChild);
  const addProfile = useStore((s) => s.addProfile);
  const removeProfile = useStore((s) => s.removeProfile);
  const activeChildId = useStore((s) => s.activeChildId);
  const child = useMemo(() => profiles.find((p) => p.id === activeChildId) ?? null, [profiles, activeChildId]);

  const [creating, setCreating] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [name, setName] = useState('');
  const [age, setAge] = useState<Grade>('g1');
  const [editMode, setEditMode] = useState(false);

  const readyGames = useMemo(() => listGames().filter((g) => g.status === 'ready'), []);
  const recGame = useMemo(() => {
    if (!child) return readyGames[0];
    const notPlayed = readyGames.find((g) => starsForGame(records, child.id, g.id) === 0);
    return notPlayed ?? pickRandom(readyGames);
  }, [child, records, readyGames]);

  const enter = (id: string) => {
    setActiveChild(id);
    setSwitching(false);
    speak(t('welcome'), lang);
    nav('/lobby');
  };

  const create = () => {
    const id = `c${Date.now()}`;
    addProfile({
      id,
      name: name.trim() || (lang === 'zh' ? '小宝贝' : 'Kid'),
      avatar,
      ageBand: age,
      createdAt: Date.now(),
    });
    setActiveChild(id);
    setCreating(false);
    speak(t('welcome'), lang);
    nav('/lobby');
  };

  /* ---------- 无档案 / 建档流程 ---------- */
  if (!child || creating) {
    return (
      <div className="page home">
        <div className="home-top">
          <div className="lang-toggle">
            <button className={lang === 'zh' ? 'active' : ''} onClick={() => setLang('zh')}>
              中文
            </button>
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
              English
            </button>
          </div>
          <div className="home-top-right">
            <KidButton color="white" className="icon-btn" onClick={toggleSound} ariaLabel="sound">
              {sound ? <IconSpeakerOn size={22} /> : <IconSpeakerOff size={22} />}
            </KidButton>
            <KidButton color="white" className="icon-btn" onClick={() => nav('/parent')} ariaLabel="parent">
              <IconLock size={22} />
            </KidButton>
          </div>
        </div>

        {!creating ? (
          <div className="welcome-screen">
            <Logo />
            <div className="welcome-actions">
              <KidButton color="green" className="big" onClick={() => setCreating(true)}>
                {t('createNow')}
              </KidButton>
            </div>
          </div>
        ) : (
          <div className="create-card">
            <h3>{t('yourName')}</h3>
            <input
              className="name-input"
              value={name}
              placeholder={t('namePlaceholder')}
              onChange={(e) => setName(e.target.value)}
              maxLength={12}
            />
            <h3>{t('chooseAvatar')}</h3>
            <div className="avatar-grid">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  className={`avatar-cell ${avatar === a ? 'selected' : ''}`}
                  onClick={() => setAvatar(a)}
                >
                  {a}
                </button>
              ))}
            </div>
            <h3>{t('chooseAge')}</h3>
            <div className="age-grid">
              {GRADES.map((g) => (
                <button
                  key={g.id}
                  className={`age-cell ${age === g.id ? 'selected' : ''}`}
                  onClick={() => setAge(g.id)}
                >
                  {g.name[lang]}
                </button>
              ))}
            </div>
            <div className="create-actions">
              <KidButton color="white" onClick={() => setCreating(false)}>
                {t('cancel')}
              </KidButton>
              <KidButton color="green" onClick={create}>
                {t('start')}
              </KidButton>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ---------- 正式首页 ---------- */
  const totalStars = childTotalStars(records, child.id);
  const tStars = todayStars(records, child.id);
  const tKinds = todayGameKinds(records, child.id);
  const streak = streakDays(records, child.id);
  const garden = gardenStage(totalStars);
  const tasks = [
    { id: 'play', key: 'taskPlay', done: todayRecords(records, child.id).length >= 1 },
    { id: 'stars', key: 'taskStars', done: tStars >= 3 },
    { id: 'variety', key: 'taskVariety', done: tKinds >= 2 },
  ];
  const lessonCount = (subjectId: SubjectId) => subjectLessonCount(subjectId);

  return (
    <div className="page home">
      <header className="app-header">
        <div className="brand-mini">
          <Mascot pose="happy" size={44} />
          <span className="brand-name">{t('appName')}</span>
        </div>
        <div className="app-header-right">
          <button
            className={`header-lang ${lang === 'en' ? 'active' : ''}`}
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            aria-label={t('language')}
          >
            {lang === 'zh' ? 'EN' : '中'}
          </button>
          <KidButton color="white" className="icon-btn" onClick={toggleSound} ariaLabel="sound">
            {sound ? <IconSpeakerOn size={20} /> : <IconSpeakerOff size={20} />}
          </KidButton>
          <KidButton color="white" className="icon-btn" onClick={() => nav('/parent')} ariaLabel="parent">
            <IconLock size={20} />
          </KidButton>
        </div>
      </header>

      {/* 当前孩子条 */}
      <button className="child-bar" onClick={() => setSwitching(true)}>
        <span className="child-avatar">{child.avatar}</span>
        <span className="child-info">
          <span className="child-name">{child.name}</span>
          <span className="child-age">{gradeLabel(child.ageBand, lang)}</span>
        </span>
        <span className="child-stars">
          ⭐ <b>{totalStars}</b>
        </span>
        <span className="child-switch">⇄</span>
      </button>

      {/* 今日推荐 Hero */}
      {recGame && (
        <section className="hero-card">
          <div className="hero-text">
            <span className="hero-tag">{t('recommend')}</span>
            <h2 className="hero-title">
              {recGame.icon} {recGame.name[lang]}
            </h2>
            <p className="hero-desc">{recGame.desc[lang]}</p>
            <KidButton color="green" onClick={() => nav(`/game/${recGame.id}`)}>
              {t('playNow')}
            </KidButton>
          </div>
          <div className="hero-mascot">
            <Mascot pose="happy" size={116} />
          </div>
        </section>
      )}

      {/* 学科入口（年级 → 学科 → 课程） */}
      <section className="module">
        <h3 className="module-title">{t('subjects')}</h3>
        <div className="cat-grid">
          {SUBJECTS.map((sub) => (
            <button key={sub.id} className="cat-entry" onClick={() => nav('/map')}>
              <span className="cat-icon" style={{ background: sub.color }}>
                {sub.icon}
              </span>
              <span className="cat-name">{sub.name[lang]}</span>
              <span className="cat-count">
                {lessonCount(sub.id)} {t('skills')}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 成长模块 */}
      <section className="module">
        <h3 className="module-title">{t('growth')}</h3>
        <div className="growth-row">
          <div className="garden-card compact">
            <div className="garden-plant">
              <span className={`plant-emoji stage-${garden.stage}`}>{garden.g}</span>
              <div className="garden-soil" />
            </div>
            <div className="garden-info">
              <h3>{t('garden')}</h3>
              <p>
                {t(garden.labelKey)} · ⭐ {totalStars}
              </p>
              {streak > 0 && <p className="garden-streak">🔥 {streak} {t('streakLabel')}</p>}
            </div>
          </div>
          <div className="task-card">
            <h4>{t('dailyTasks')}</h4>
            {tasks.map((task) => (
              <span key={task.id} className={`task-chip ${task.done ? 'done' : ''}`}>
                {task.done ? '✅' : '⬜'} {t(task.key)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 档案切换弹层 */}
      {switching && (
        <Modal>
          <div className="modal-panel switch-panel">
            <div className="modal-emoji">👧👦</div>
            <h3 className="modal-title">{t('switchChild')}</h3>
            <div className="switch-list">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  className={`switch-item ${p.id === child.id ? 'current' : ''}`}
                  onClick={() => enter(p.id)}
                >
                  <span className="switch-avatar">{p.avatar}</span>
                  <span className="switch-name">
                    {p.name}
                    <small>
                      {gradeLabel(p.ageBand, lang)} · ⭐ {childTotalStars(records, p.id)}
                    </small>
                  </span>
                  {p.id === child.id && <span className="switch-current">✓</span>}
                  {editMode && (
                    <span
                      className="profile-del"
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeProfile(p.id);
                      }}
                    >
                      ✖
                    </span>
                  )}
                </button>
              ))}
              <button className="switch-item add" onClick={() => setCreating(true)}>
                <span className="switch-avatar">➕</span>
                <span className="switch-name">{t('addProfile')}</span>
              </button>
            </div>
            <div className="modal-actions">
              <KidButton color="white" onClick={() => setEditMode((v) => !v)}>
                {editMode ? t('done') : t('edit')}
              </KidButton>
              <KidButton color="white" onClick={() => setSwitching(false)}>
                {t('cancel')}
              </KidButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
