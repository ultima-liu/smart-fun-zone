import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseTotalStars } from '../activeCourses';
import CurrencyBar from '../components/CurrencyBar';
import { IconLock, IconSpeakerOff, IconSpeakerOn } from '../components/icons';
import JuanWorld from '../components/juan-world/JuanWorld';
import { cardById } from '../content/starCards';
import LoginDialog from '../components/LoginDialog';
import Logo from '../components/Logo';
import MissionHome from '../components/MissionHome';
import Modal from '../components/Modal';
import RewardBurst from '../components/RewardBurst';
import { KidButton } from '../components/ui';
import VoiceField from '../components/VoiceField';
import { pendingPacks, type LootDrop } from '../content/expedition';
import { useI18n } from '../i18n';
import { reviewCandidates } from '../reviewPlan';
import { playSfx, speak } from '../speech';
import { useStore } from '../store';
import { AVATARS, GRADES, gradeLabel, type Grade } from '../types';

const GateRocket = (
  <svg viewBox="0 0 26 40" width="26" height="40" className="gate-rocket" aria-hidden="true">
    <polygon points="10.5,28 13,38 15.5,28" fill="#F6C24B" />
    <polygon points="12,29 13,34.5 14,29" fill="#FFF3CE" />
    <polygon points="10,17 4,27 9.5,25" fill="#A99BF2" />
    <polygon points="16,17 22,27 16.5,25" fill="#A99BF2" />
    <path d="M13 2 L17 10 Q18.6 15 18.6 21 L18.6 27 A5.6 5.6 0 0 1 13 32.6 A5.6 5.6 0 0 1 7.4 27 L7.4 21 Q7.4 15 9 10 Z" fill="#DCD3FF" stroke="#7C6AF0" strokeWidth="1.6" />
    <circle cx="13" cy="17" r="3.4" fill="#9ED6F7" stroke="#6B62D6" strokeWidth="1.2" />
  </svg>
);
const GATE_TRAILS: Record<'gs1' | 'gs2' | 'gs3', number[]> = {
  gs1: [0.09, 0.18, 0.3, 0.45, 0.64],
  gs2: [1.49, 1.58, 1.7, 1.85, 2.04],
  gs3: [2.89, 2.98, 3.1, 3.25, 3.44],
};
function tierFor(stars: number) { return stars >= 60 ? 5 : stars >= 30 ? 4 : stars >= 16 ? 3 : stars >= 6 ? 2 : 1; }

export default function HomePage() {
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const profiles = useStore((state) => state.profiles);
  const records = useStore((state) => state.records);
  const mastery = useStore((state) => state.mastery);
  const courseSchedule = useStore((state) => state.courseSchedule);
  const activeChildId = useStore((state) => state.activeChildId);
  const child = useMemo(() => profiles.find((profile) => profile.id === activeChildId) ?? null, [profiles, activeChildId]);
  const sound = useStore((state) => state.sound);
  const theme = useStore((state) => state.theme);
  const setLang = useStore((state) => state.setLang);
  const toggleSound = useStore((state) => state.toggleSound);
  const setTheme = useStore((state) => state.setTheme);
  const setActiveChild = useStore((state) => state.setActiveChild);
  const addProfile = useStore((state) => state.addProfile);
  const removeProfile = useStore((state) => state.removeProfile);
  const collectLoot = useStore((state) => state.collectExpedition);
  const expeditionLastAt = useStore((state) => activeChildId ? state.expeditionLastAt[activeChildId] : undefined);
  const archivedCards = useStore((state) => activeChildId ? state.archivedCards[activeChildId] : undefined);
  const [archiveNotice, setArchiveNotice] = useState<string | null>(null);
  const [collectNonce, setCollectNonce] = useState(0);
  const [creating, setCreating] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [arrive, setArrive] = useState(() => Boolean(child));
  const [arrivalMode, setArrivalMode] = useState<'full' | 'brief'>('full');
  const greetedChild = useRef<string>();
  const [reading, setReading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lootBurst, setLootBurst] = useState<LootDrop | null>(null);
  const [lootTick, setLootTick] = useState(0);
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [name, setName] = useState('');
  const [age, setAge] = useState<Grade>('g1');
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setLootTick((value) => value + 1), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    sync();
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  useEffect(() => {
    if (!child || greetedChild.current === child.id) return;
    greetedChild.current = child.id;
    const key = `sfz-home-welcome-v1:${child.id}`;
    try {
      setArrivalMode(window.sessionStorage.getItem(key) ? 'brief' : 'full');
      window.sessionStorage.setItem(key, '1');
    } catch { setArrivalMode('brief'); }
    setArrive(true);
  }, [child?.id]);
  useEffect(() => {
    if (reading) setArrive(false);
    document.body.classList.toggle('home-reading', reading);
    return () => document.body.classList.remove('home-reading');
  }, [reading]);
  useEffect(() => {
    if (!child) return;
    const wide = window.matchMedia('(min-width: 1100px) and (min-height: 760px) and (orientation: landscape) and (pointer: fine)');
    const apply = () => document.body.classList.toggle('home-dash-lock', wide.matches && navigator.maxTouchPoints === 0);
    apply();
    wide.addEventListener('change', apply);
    return () => { document.body.classList.remove('home-dash-lock'); wide.removeEventListener('change', apply); };
  }, [child?.id]);

  useEffect(() => {
    if (!child) return;
    setArchiveNotice(null);
    const key = `sfz-world-archive:${child.id}`;
    try {
      const previous = JSON.parse(sessionStorage.getItem(key) ?? 'null') as string[] | null;
      const added = previous ? (archivedCards ?? []).filter(id => !previous.includes(id)) : [];
      if (added.length) setArchiveNotice(added[added.length - 1]);
      sessionStorage.setItem(key, JSON.stringify(archivedCards ?? []));
    } catch { /* a card notice never changes the collection */ }
    const timer = window.setTimeout(() => setArchiveNotice(null), 8000);
    return () => window.clearTimeout(timer);
  }, [child?.id, archivedCards]);

  const toggleFullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { /* 浏览器拒绝时保持普通页面 */ }
  };
  const enter = (id: string) => {
    setActiveChild(id);
    setSwitching(false);
    const profile = profiles.find((item) => item.id === id);
    if (profile) speak(t('welcomeHome', { title: t(`titleTier${tierFor(courseTotalStars(profile.id, mastery, records))}`), name: profile.name }), lang);
    nav('/');
  };
  const create = () => {
    const childName = name.trim() || (lang === 'zh' ? '小宝贝' : 'Kid');
    const id = `c${Date.now()}`;
    addProfile({ id, name: childName, avatar, ageBand: age, createdAt: Date.now() });
    setActiveChild(id);
    setCreating(false);
    speak(t('welcomeHome', { title: t('titleTier1'), name: childName }), lang);
    nav('/');
  };

  if (!child || creating) return (
    <div className="page home welcome-flow">
      <div className="home-top">
        <div className="lang-toggle"><button className={lang === 'zh' ? 'active' : ''} onClick={() => setLang('zh')}>中文</button><button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>English</button></div>
        <div className="home-top-right"><KidButton color="white" className="icon-btn" onClick={toggleSound} ariaLabel="sound">{sound ? <IconSpeakerOn size={22} /> : <IconSpeakerOff size={22} />}</KidButton><KidButton color="white" className="icon-btn" onClick={() => nav('/parent')} ariaLabel="parent"><IconLock size={22} /></KidButton></div>
      </div>
      {!creating ? (
        <div className="welcome-screen">
          <Logo />
          {loginOpen && <LoginDialog onClose={() => setLoginOpen(false)} onArrived={() => setArrive(true)} />}
          <div className="welcome-actions gate-wrap">
            <span className="gate-halo" aria-hidden="true" /><span className="gate-halo halo-b" aria-hidden="true" />
            {(Object.keys(GATE_TRAILS) as Array<keyof typeof GATE_TRAILS>).map((key) => <Fragment key={key}><span className={`gate-ship ${key}`} aria-hidden="true">{GateRocket}</span>{GATE_TRAILS[key].map((delay, index) => <i key={index} className={`gate-trail ${key}`} style={{ animationDelay: `${delay}s` }} aria-hidden="true" />)}</Fragment>)}
            <button className="login-gate" onClick={() => setLoginOpen(true)} aria-label="go login"><span className="gate-sheen" /><span className="gate-vortex" /><span className="gate-vortex v2" /><span className="gate-vortex v3" /><span className="gate-orbit" /><span className="gate-orbit orbit-b" /><span className="gate-glow" /><span className="gate-icon"><span className="gate-spin"><span className="gate-dive">{GateRocket}</span></span></span><b className="gate-title">{lang === 'zh' ? '去登录' : 'Log in'}</b><small className="gate-sub">{lang === 'zh' ? '孩子 / 家长' : 'Kid / Parent'}</small></button>
          </div>
        </div>
      ) : (
        <div className="create-card"><h3>{t('yourName')}</h3><VoiceField inputClass="name-input" value={name} placeholder={t('namePlaceholder')} onChange={setName} maxLength={12} /><h3>{t('chooseAvatar')}</h3><div className="avatar-grid">{AVATARS.map((item) => <button key={item} className={`avatar-cell ${avatar === item ? 'selected' : ''}`} onClick={() => setAvatar(item)}>{item}</button>)}</div><h3>{t('chooseAge')}</h3><div className="age-grid">{GRADES.map((grade) => <button key={grade.id} className={`age-cell ${age === grade.id ? 'selected' : ''}`} onClick={() => setAge(grade.id)}>{grade.name[lang]}</button>)}</div><div className="create-actions"><KidButton color="white" onClick={() => setCreating(false)}>{t('cancel')}</KidButton><KidButton color="green" onClick={create}>{t('start')}</KidButton></div></div>
      )}
    </div>
  );

  const totalStars = courseTotalStars(child.id, mastery, records);
  const explorerTitle = t(`titleTier${tierFor(totalStars)}`);
  const reviewDueCount = reviewCandidates(child.id, child.ageBand, courseSchedule).length;
  const lootPacks = expeditionLastAt === undefined ? 1 : pendingPacks(expeditionLastAt, Date.now());
  void lootTick;
  const collectLootNow = () => {
    const drop = collectLoot(child.id);
    if (drop && (drop.beans > 0 || drop.stardust > 0 || drop.outfits.length > 0)) { playSfx('collect'); setLootBurst(drop); setCollectNonce(value => value + 1); }
    else { playSfx('tap'); speak(lang === 'zh' ? '远征队还在路上，攒够补给包再来收取吧！' : 'The fleet is still on its way!', lang); }
  };

  return (
    <div className="page home home-world-page">
      <header className="app-header">
        <button
          className="home-profile-mini"
          onClick={() => setSwitching(true)}
          aria-label={lang === 'zh' ? '切换孩子' : 'Switch child'}
        >
          <span>{child.avatar}</span>
          <span>
            <b>{child.name}</b>
            <small>{explorerTitle}</small>
          </span>
          <i>⇄</i>
        </button>
        <CurrencyBar compact />
        <div className="app-header-right">
          <button
            className={`top-pill home-review-entry ${reviewDueCount ? 'ready' : ''}`}
            onClick={() => nav('/review')}
          >
            📚<span>{lang === 'zh' ? '复习' : 'Review'}</span>
            {reviewDueCount > 0 && <b>{reviewDueCount}</b>}
          </button>
          <details className="home-settings">
            <summary aria-label={lang === 'zh' ? '首页设置' : 'Home settings'}>
              ⚙ <span>{lang === 'zh' ? '设置' : 'Settings'}</span>
            </summary>
            <div className="home-settings-panel">
              <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}>
                {lang === 'zh' ? 'English' : '中文'}
              </button>
              <button onClick={toggleSound}>
                {sound ? <IconSpeakerOn size={18} /> : <IconSpeakerOff size={18} />}
                {lang === 'zh'
                  ? sound
                    ? '声音开启'
                    : '声音关闭'
                  : sound
                    ? 'Sound on'
                    : 'Sound off'}
              </button>
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? '☀' : '☾'}{' '}
                {lang === 'zh'
                  ? theme === 'dark'
                    ? '日间'
                    : '夜间'
                  : theme === 'dark'
                    ? 'Day'
                    : 'Night'}
              </button>
              <button onClick={toggleFullscreen}>
                ⛶{' '}
                {lang === 'zh'
                  ? isFullscreen
                    ? '退出全屏'
                    : '全屏'
                  : isFullscreen
                    ? 'Exit full screen'
                    : 'Full screen'}
              </button>
              <button onClick={() => nav('/parent')}>
                <IconLock size={18} />
                {lang === 'zh' ? '家长' : 'Parent'}
              </button>
            </div>
          </details>
        </div>
      </header>
      <main className="home-world-main">
        <MissionHome
          key={child.id}
          onReadingChange={setReading}
          renderScene={(station) => (
            <JuanWorld
              childId={child.id}
              theme={theme}
              lang={lang}
              quiet={reading || switching}
              station={station}
              lootPacks={lootPacks}
              onCollect={collectLootNow}
              collectNonce={collectNonce}
              welcome={arrive ? t('welcomeHome', { title: explorerTitle, name: child.name }) : null}
              arrival={arrivalMode === 'full'}
              onWelcomeDone={() => setArrive(false)}
              archiveNotice={
                archiveNotice ? (cardById(archiveNotice)?.name[lang] ?? archiveNotice) : null
              }
            />
          )}
        />
      </main>
      {lootBurst && <RewardBurst drop={lootBurst} onDone={() => setLootBurst(null)} />}

      {switching && <Modal><div className="modal-panel switch-panel"><div className="modal-emoji">👧👦</div><h3 className="modal-title">{t('switchChild')}</h3><div className="switch-list">{profiles.map((profile) => <button key={profile.id} className={`switch-item ${profile.id === child.id ? 'current' : ''}`} onClick={() => enter(profile.id)}><span className="switch-avatar">{profile.avatar}</span><span className="switch-name">{profile.name}<small>{gradeLabel(profile.ageBand, lang)} · ⭐ {courseTotalStars(profile.id, mastery, records)}</small></span>{profile.id === child.id && <span className="switch-current">✓</span>}{editMode && <span className="profile-del" role="button" onClick={(event) => { event.stopPropagation(); removeProfile(profile.id); }}>✖</span>}</button>)}<button className="switch-item add" onClick={() => setCreating(true)}><span className="switch-avatar">➕</span><span className="switch-name">{t('addProfile')}</span></button></div><div className="modal-actions"><KidButton color="white" onClick={() => setEditMode((value) => !value)}>{editMode ? t('done') : t('edit')}</KidButton><KidButton color="white" onClick={() => setSwitching(false)}>{t('cancel')}</KidButton></div></div></Modal>}
    </div>
  );
}
