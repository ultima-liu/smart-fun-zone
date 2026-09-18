import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, childTotalStars, streakDays, gardenStage, goldSkillCount, litSkillCount } from '../store';
import { EMPTY, useGates } from '../features';
import { useI18n } from '../i18n';
import { KidButton } from '../components/ui';
import Modal from '../components/Modal';
import { AVATARS, GRADES, SUBJECTS, gradeLabel, type Grade } from '../types';
import { speak, playSfx } from '../speech';
import { tryCompleteStoryNode } from '../storyProgress';
import RewardBurst from '../components/RewardBurst';
import Logo from '../components/Logo';
import LoginDialog from '../components/LoginDialog';
import ArrivalFlight from '../components/ArrivalFlight';
import StoryStrip from '../components/StoryStrip';
import Mascot from '../components/Mascot';
import WardrobeAvatar from '../components/WardrobeAvatar';
import { IconLock, IconSpeakerOff, IconSpeakerOn } from '../components/icons';
import { nextLessonToLearn, activeLessons } from '../activeCourses';
import { DAILY_TASKS, WEEKLY_TASKS, taskProgress } from '../tasks';
import InteractiveJuanStar from '../components/InteractiveJuanStar';
import { CosmicFleet } from '../components/cosmos';
import CurrencyBar from '../components/CurrencyBar';
import AttrRadar from '../components/AttrRadar';
import { pendingPacks, LOOT_MAX_PACKS, type LootDrop } from '../content/expedition';
import { dueReviewDays, reviewEntries } from '../reviewPlan';

/** 登录引导小火箭：纯 SVG 自绘，船头固定朝上（星门中央旋转 180° 即“俯冲钻入”，四周飞船直接使用本图） */
const GateRocket = (
  <svg viewBox="0 0 26 40" width="26" height="40" className="gate-rocket" aria-hidden="true">
    {/* 尾焰 */}
    <polygon points="10.5,28 13,38 15.5,28" fill="#F6C24B" />
    <polygon points="12,29 13,34.5 14,29" fill="#FFF3CE" />
    {/* 左/右尾翼 */}
    <polygon points="10,17 4,27 9.5,25" fill="#A99BF2" />
    <polygon points="16,17 22,27 16.5,25" fill="#A99BF2" />
    {/* 机身（头朝上） */}
    <path d="M13 2 L17 10 Q18.6 15 18.6 21 L18.6 27 A5.6 5.6 0 0 1 13 32.6 A5.6 5.6 0 0 1 7.4 27 L7.4 21 Q7.4 15 9 10 Z" fill="#DCD3FF" stroke="#7C6AF0" strokeWidth="1.6" />
    {/* 舷窗 */}
    <circle cx="13" cy="17" r="3.4" fill="#9ED6F7" stroke="#6B62D6" strokeWidth="1.2" />
  </svg>
);

/**
 * 三艘飞船的残影尾焰时间表（相对挂载时刻的绝对 delay）。
 * 残影沿与飞船完全相同的弧线动画运行，只是相位各自滞后于对应飞船 ——
 * 于是残影永远落在飞船已飞过的弧线上，尾焰随之弯曲。
 * 近船残影密（小滞后）、远船残影疏（大滞后）。
 */
const GATE_TRAILS: Record<'gs1' | 'gs2' | 'gs3', number[]> = {
  gs1: [0.09, 0.18, 0.3, 0.45, 0.64],
  gs2: [1.49, 1.58, 1.7, 1.85, 2.04],
  gs3: [2.89, 2.98, 3.1, 3.25, 3.44],
};

/** 头衔档位：由总星星决定（1~5） */
function tierFor(stars: number): number {
  return stars >= 60 ? 5 : stars >= 30 ? 4 : stars >= 16 ? 3 : stars >= 6 ? 2 : 1;
}

export default function HomePage() {
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const profiles = useStore((s) => s.profiles);
  const records = useStore((s) => s.records);
  const sound = useStore((s) => s.sound);
  const setLang = useStore((s) => s.setLang);
  const toggleSound = useStore((s) => s.toggleSound);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const setActiveChild = useStore((s) => s.setActiveChild);
  const addProfile = useStore((s) => s.addProfile);
  const removeProfile = useStore((s) => s.removeProfile);
  const activeChildId = useStore((s) => s.activeChildId);
  const equippedNow = useStore((s) => (s.activeChildId ? s.equipped[s.activeChildId] : undefined));
  const child = useMemo(() => profiles.find((p) => p.id === activeChildId) ?? null, [profiles, activeChildId]);

  const [creating, setCreating] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [arrive, setArrive] = useState(false);
  const [taskTab, setTaskTab] = useState<'day' | 'week'>('day');
  const [pulse, setPulse] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lootBurst, setLootBurst] = useState<LootDrop | null>(null);
  const expeditionLastAt = useStore((s) => (s.activeChildId ? s.expeditionLastAt[s.activeChildId] : undefined));
  const materials = useStore((s) => (s.activeChildId ? s.materials[s.activeChildId] : undefined));
  const ownedItemsNow = useStore((s) => (s.activeChildId ? s.ownedItems[s.activeChildId] ?? EMPTY : EMPTY));
  const collectLoot = useStore((s) => s.collectExpedition);
  // 常驻远征：可收取的补给包数（受上限封顶；首次尚未收取视为可收 1 包）
  const [lootTick, setLootTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setLootTick((x) => x + 1), 30 * 1000);
    return () => window.clearInterval(t);
  }, []);
  const lootPacks = expeditionLastAt === undefined ? 1 : pendingPacks(expeditionLastAt, Date.now());
  void lootTick; // 定时刷新重渲染，用于让上述补给包数随时间更新
  const collectLootNow = () => {
    if (!child) return;
    const drop = collectLoot(child.id);
    if (drop && (drop.beans > 0 || drop.stardust > 0 || drop.outfits.length > 0)) {
      playSfx('collect');
      setLootBurst(drop);
      // 首次远征：完成第5章教程剧情节点
      tryCompleteStoryNode(child.id, 'c5-1');
    } else {
      playSfx('tap');
      speak(lang === 'zh' ? '远征队还在路上，攒够补给包再来收取吧！' : 'The fleet is still on its way—come back when it’s stocked!', lang);
    }
  };
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [name, setName] = useState('');
  const [age, setAge] = useState<Grade>('g1');
  const [editMode, setEditMode] = useState(false);
  const storyDone = useStore((s) => (s.activeChildId ? s.storyDone[s.activeChildId] ?? EMPTY : EMPTY));
  // 必须在“无孩子/建档”早返回之前订阅，避免登录成功激活孩子后改变 Hook 数量。
  const masteryAll = useStore((s) => s.mastery);
  const gates = useGates();

  // 消费待演示的解锁目标（功能页完成剧情后写入 → 回到首页播放解封动画）
  const storyPulse = useStore((s) => s.storyPulse);
  const setStoryPulse = useStore((s) => s.setStoryPulse);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreen);
    syncFullscreen();
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // 全屏可能被浏览器策略拒绝，保持页面正常使用即可
    }
  };

  // Dashboard 一屏：仅桌面视口禁用 body 滚动，确保无滚动条；移动端保持可滚动不锁
  useEffect(() => {
    if (!child) return;
    const mq = window.matchMedia('(min-width: 900px)');
    const apply = () => {
      if (mq.matches) {
        document.body.classList.add('home-dash-lock');
        window.scrollTo(0, 0);
      } else {
        document.body.classList.remove('home-dash-lock');
      }
    };
    apply();
    mq.addEventListener('change', apply);
    return () => {
      document.body.classList.remove('home-dash-lock');
      mq.removeEventListener('change', apply);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child?.id]);

  useEffect(() => {
    if (!storyPulse) return;
    // 小卷卷星入场动画播完后（或稍候）再触发建筑解封，避免被到达动画覆盖
    const t = window.setTimeout(() => {
      setPulse(storyPulse);
      setStoryPulse(null);
      const t2 = window.setTimeout(() => setPulse(null), 2600);
      return () => window.clearTimeout(t2);
    }, arrive ? 2600 : 600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyPulse]);

  // 新手剧情门禁：未解锁的入口点不进去（提示去完成剧情）
  const guardNav = (path: string): boolean => {
    if (gates.canEnter(path)) { nav(path); return true; }
    playSfx('deny');
    speak(lang === 'zh' ? '这个功能还没有解锁，先去完成剧情任务吧！' : 'Locked! Finish the story quest first!', lang);
    return false;
  };

  // 进入正式首页（孩子已选）时播放一次“开门→飞船飞向总部”到达动画；
  // “欢迎回家”语音改由 ArrivalFlight 在飞船进入总部大楼后播放
  useEffect(() => {
    if (!child) return;
    setArrive(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child?.id]);

  const enter = (id: string) => {
    setActiveChild(id);
    setSwitching(false);
    const p = profiles.find((x) => x.id === id);
    if (p) {
      const tier = tierFor(childTotalStars(records, p.id));
      speak(t('welcomeHome', { title: t(`titleTier${tier}`), name: p.name }), lang);
    } else {
      speak(t('welcome'), lang);
    }
    nav('/'); // 建档/切换后先回首页，跟随新手剧情推进
  };

  const create = () => {
    const kidName = name.trim() || (lang === 'zh' ? '小宝贝' : 'Kid');
    const id = `c${Date.now()}`;
    addProfile({
      id,
      name: kidName,
      avatar,
      ageBand: age,
      createdAt: Date.now(),
    });
    setActiveChild(id);
    setCreating(false);
    speak(t('welcomeHome', { title: t('titleTier1'), name: kidName }), lang);
    nav('/'); // 建档后先回首页，跟随新手剧情推进
  };

  /* ---------- 无档案 / 建档流程 ---------- */
  if (!child || creating) {
    return (
      <div className="page home welcome-flow">
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
            {loginOpen && <LoginDialog onClose={() => setLoginOpen(false)} onArrived={() => setArrive(true)} />}
            <div className="welcome-actions gate-wrap">
              {/* 星门外层辉光 */}
              <span className="gate-halo" aria-hidden="true" />
              <span className="gate-halo halo-b" aria-hidden="true" />
              {/* 引导小飞船 + 残影尾焰：飞船从四周沿弧线飞入登录星门 */}
              {(Object.keys(GATE_TRAILS) as Array<keyof typeof GATE_TRAILS>).map((cls) => (
                <Fragment key={cls}>
                  <span className={`gate-ship ${cls}`} aria-hidden="true">{GateRocket}</span>
                  {GATE_TRAILS[cls].map((d, k) => (
                    <i key={k} className={`gate-trail ${cls}`} style={{ animationDelay: `${d}s` }} aria-hidden="true" />
                  ))}
                </Fragment>
              ))}
              <button className="login-gate" onClick={() => setLoginOpen(true)} aria-label="go login">
                <span className="gate-sheen" aria-hidden="true" />
                <span className="gate-vortex" aria-hidden="true" />
                <span className="gate-vortex v2" aria-hidden="true" />
                <span className="gate-vortex v3" aria-hidden="true" />
                <span className="gate-orbit" aria-hidden="true" />
                <span className="gate-orbit orbit-b" aria-hidden="true" />
                <span className="gate-glow" aria-hidden="true" />
                <span className="gate-icon">
                  <span className="gate-spin" aria-hidden="true">
                    <span className="gate-dive">{GateRocket}</span>
                  </span>
                </span>
                <b className="gate-title">{lang === 'zh' ? '去登录' : 'Log in'}</b>
                <small className="gate-sub">{lang === 'zh' ? '孩子 / 家长' : 'Kid / Parent'}</small>
              </button>
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

  /* ---------- 正式首页（卷星观测台） ---------- */
  const totalStars = childTotalStars(records, child.id);
  const streak = streakDays(records, child.id);
  const garden = gardenStage(totalStars);
  const goldCount = goldSkillCount(useStore.getState().mastery, child.id);
  const litCount = litSkillCount(useStore.getState().mastery, child.id);
  // 课程进度：圈内=已开课 3 本课本满星课时 / 总课时；右侧按学科逐门显示
  const lessons = activeLessons(child.id, masteryAll);
  const gradeGold = lessons.filter((s) => s.gold).length;
  const gradeTotal = lessons.length;
  const gradeBySubject = (['math', 'chinese', 'english'] as const)
    .map((sub) => {
      const info = SUBJECTS.find((s) => s.id === sub);
      const list = lessons.filter((s) => s.subject === sub);
      return { id: sub, name: info?.name, icon: info?.icon, gold: list.filter((s) => s.gold).length, total: list.length };
    })
    .filter((x) => x.total > 0 && x.name);
  // 卷星人头衔：按总星星自动成长
  const explorerTier = totalStars >= 60 ? 5 : totalStars >= 30 ? 4 : totalStars >= 16 ? 3 : totalStars >= 6 ? 2 : 1;
  const explorerTitle = t(`titleTier${explorerTier}`);
  const mineRec = records.filter((r) => r.childId === child.id);
  // 四维属性（行为推导，0~100；雷达以最大值定最长边）
  const outfitOwned = ownedItemsNow.filter((i) => i.startsWith('o-')).length;
  const attrValues = {
    wis: Math.min(100, litCount * 5 + goldCount * 10),
    cou: Math.min(100, mineRec.length * 8),
    cre: Math.min(100, outfitOwned * 8),
    tea: Math.min(100, streak * 10 + (expeditionLastAt !== undefined ? 15 : 0)),
  };
  // 继续学习：第一门未满星的已开课课时
  const resumeSkill = nextLessonToLearn(child.id, masteryAll);
  // 花园进度环：当前星级在“本阶段 → 下一阶段”之间的进度（0~1）
  const gardenPct = (() => {
    if (garden.stage >= 5) return 1;
    const floors = [0, 6, 16, 30, 60];
    const cur = Math.max(0, Math.min(floors[garden.stage], totalStars));
    return floors[garden.stage] > 0 ? cur / floors[garden.stage] : totalStars >= 6 ? 1 : totalStars / 6;
  })();
  const daily = DAILY_TASKS.map((tk) => ({ tk, p: taskProgress(tk, child.id) })).filter((x) => x.p.enabled);
  const doneCount = daily.filter((x) => x.p.done).length;
  const pendingCount = daily.filter((x) => !x.p.done).length;
  const weekly = WEEKLY_TASKS.map((tk) => ({ tk, p: taskProgress(tk, child.id) })).filter((x) => x.p.enabled);
  const weekDone = weekly.filter((x) => x.p.done).length;
  const reviewDueCount = reviewEntries(child.id).filter((entry) => dueReviewDays(entry).length > 0).length;

  return (
    <div className="page home home-dash">
      {/* 登录到达首页：左上舱门开 → 飞船飞向卷星 */}
      {arrive && <ArrivalFlight greet={t('welcomeHome', { title: explorerTitle, name: child.name })} lang={lang} onDone={() => setArrive(false)} />}
      <header className="app-header">
        <div className="brand-mini">
          <Mascot pose="happy" size={44} />
          <span className="brand-name">{t('appName')}</span>
        </div>
        {/* 顶部货币/材料余额：星星/卷卷豆/星屑 */}
        <CurrencyBar compact />
        <div className="app-header-right">
          <button
            className={`top-pill ${lang === 'en' ? 'on' : ''}`}
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            aria-label={t('language')}
          >
            {lang === 'zh' ? 'EN' : '中'}
          </button>
          <KidButton color="white" className="top-pill" onClick={toggleSound} ariaLabel="sound">
            {sound ? <IconSpeakerOn size={20} /> : <IconSpeakerOff size={20} />}
          </KidButton>
          {/* 主题切换：深色(月) / 浅色(日) */}
          <button
            className={`top-pill ${theme === 'light' ? 'light' : ''}`}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={t('theme')}
            title={theme === 'dark' ? (t('themeToLight')) : (t('themeToDark'))}
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
          <button
            className="top-pill fullscreen-pill"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? '退出全屏' : '进入全屏'}
            title={isFullscreen ? '退出全屏' : '进入全屏'}
          >
            {isFullscreen ? '⛶' : '⛶'}
          </button>
          <button className={`top-pill home-review-entry ${reviewDueCount ? 'ready' : ''}`} onClick={() => guardNav('/review')} aria-label={`今日复习${reviewDueCount}节`} title="今日复习">
            📚<span>复习</span>{reviewDueCount > 0 && <b>{reviewDueCount}</b>}
          </button>
        </div>
      </header>

      {/* 主区三栏：左=个人卡 / 中=卷星 / 右=今日任务（一屏，不滚动） */}
      <div className="home-main">
        {/* 左栏：星际通行证（孩子身份） */}
        <aside className="home-col home-left">
          <section className="pass-card">
            {/* 身份区：大头像 + 星环 + 名字/头衔 */}
            <div className="ps-hero">
              <div className="ps-avatar-wrap">
                <span className="ps-ring" aria-hidden="true" />
                <span className="ps-halo" aria-hidden="true" />
                <WardrobeAvatar outfitId={equippedNow?.outfit} className="wardrobe-avatar--home-card" />
              </div>
              <div className="ps-id">
                <h2 className="ps-name">{child.name}</h2>
                <span className="hq-title-badge"><span className="hq-title-shield">⭐</span><span>{explorerTitle}</span></span>
                <span className="ps-grade">{GRADES.find((g) => g.id === child.ageBand)?.name[lang]}</span>
              </div>
              <button className="ps-switch" onClick={() => setSwitching(true)} aria-label="switch">⇄</button>
            </div>

            {/* 四维属性 · 雷达图（以最大属性为最长边） */}
            <div className="ps-attr">
              <div className="ps-radar-wrap">
                <AttrRadar
                  values={attrValues}
                  labels={{ wis: t('attrWisdom'), cou: t('attrCourage'), cre: t('attrCraft'), tea: t('attrTeam') }}
                  size={128}
                />
              </div>
            </div>

            {/* 已开课课程掌握进度 */}
            <div className="ps-mastery">
              <div className="ps-mastery-head">
                <b>{t('masteredSkills')}</b>
                <span className="ps-mastery-count">{gradeGold}/{gradeTotal}</span>
              </div>
              <div className="ps-mastery-body">
                <div className="ps-ring-progress" style={{ '--m': `${gradeTotal ? (gradeGold / gradeTotal) * 100 : 0}%` } as React.CSSProperties}>
                  <div className="ps-ring-hole">
                    <span className="ps-ring-txt"><b>{gradeGold}</b><small>/{gradeTotal}</small></span>
                  </div>
                </div>
                {/* 本年级各学科进度（百分比） */}
                <div className="ps-course-list">
                  {gradeBySubject.map((x) => {
                    const all = x.total > 0 && x.gold === x.total;
                    const any = x.gold > 0;
                    const pct = x.total ? Math.round((x.gold / x.total) * 100) : 0;
                    return (
                      <button
                        key={x.id}
                        className={`ps-course${all ? ' gold' : any ? ' lit' : ''}`}
                        onClick={() => guardNav(`/subject/${x.id}`)}
                      >
                        <span className="ps-course-ic">{x.icon}</span>
                        <span className="ps-course-name">{x.name?.[lang]}</span>
                        <span className="ps-course-bar"><i style={{ width: `${pct}%` }} /></span>
                        <span className="ps-course-pct">{pct}%</span>
                        {all && <i className="ps-course-star" aria-hidden="true">★</i>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 行动区：继续学习 · 播放器样式 */}
            {resumeSkill && (
              <button className="resume-bar player-bar" onClick={() => guardNav(resumeSkill.route)}>
                <span className="player-cover" aria-hidden="true">📖</span>
                <span className="player-main">
                  <span className="player-meta">
                    <small>{t('playerResume')}</small>
                    <b className="player-title">{resumeSkill.title}</b>
                  </span>
                  <span className="player-track">
                    <i className="player-track-fill" style={{ width: `${(resumeSkill.stars / 3) * 100}%` }} />
                    <em className="player-pos">★ {resumeSkill.stars}/3</em>
                  </span>
                </span>
                <span className="player-play" aria-hidden="true">▶</span>
              </button>
            )}
          </section>
        </aside>

        {/* 中栏：新手引导任务在卷星正上方，避免与左右卡片及下方星球重叠 */}
        <section className="hero-card juan-hero juan-hero-big home-center">
          <StoryStrip />
          <div className="hero-planet-zone">
            <InteractiveJuanStar
              stars={totalStars}
              streak={streak}
              gardenPct={gardenPct}
              gardenStage={garden.stage}
              pendingTasks={pendingCount}
              lang={lang}
              sealed={{
                school: !storyDone.includes('c1-1'),
                park: !storyDone.includes('c2-1'),
                store: !storyDone.includes('c3-1'),
              }}
              pulse={pulse}
              onNav={(to) => {
                if (to.startsWith('#')) {
                  document.querySelector(to)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  return;
                }
                guardNav(to);
              }}
            />
            <CosmicFleet />
            <span className="hero-mascot-mini" aria-hidden="true">
              <Mascot pose="happy" size={92} />
            </span>
            {/* 常驻远征战利品：按时间累积补给包，点卷星即可收取 */}
            <button className="loot-prompt" onClick={collectLootNow} aria-label="collect loot">
              <span className="loot-icon">🛰️</span>
              <span className="loot-text">
                {lang === 'zh' ? `远征战利品 · ${lootPacks}/${LOOT_MAX_PACKS}` : `Loot · ${lootPacks}/${LOOT_MAX_PACKS}`}
              </span>
              <span className="loot-sub">{lang === 'zh' ? '点击收取' : 'Tap to collect'}</span>
            </button>
            <div className="loot-materials" aria-hidden="true">
              <span>✨ 星屑 {materials?.stardust ?? 0}</span>
            </div>
          </div>
        </section>

        {lootBurst != null && <RewardBurst drop={lootBurst} onDone={() => setLootBurst(null)} />}

        {/* 右栏：今日任务（竖排） */}
        <aside className="home-col home-right">
          <section className="task-panel">
            {/* 头部：今日/本周 Tab + 进度环 */}
            <div className="tp-head">
              <div className="tp-tabs" role="tablist">
                <button role="tab" aria-selected={taskTab === 'day'} className={`tp-tab ${taskTab === 'day' ? 'on' : ''}`} onClick={() => setTaskTab('day')}>
                  🛰️ {t('todayTab')}
                </button>
                <button role="tab" aria-selected={taskTab === 'week'} className={`tp-tab ${taskTab === 'week' ? 'on' : ''}`} onClick={() => setTaskTab('week')}>
                  📅 {t('weekTab')}
                </button>
              </div>
              {taskTab === 'day' ? (
                <div className="tp-ring" style={{ '--p': `${(doneCount / Math.max(1, daily.length)) * 100}%` } as React.CSSProperties}>
                  <span>{doneCount}/{daily.length}</span>
                </div>
              ) : (
                <div className="tp-ring" style={{ '--p': `${(weekDone / Math.max(1, weekly.length)) * 100}%` } as React.CSSProperties}>
                  <span>{weekDone}/{weekly.length}</span>
                </div>
              )}
            </div>

            {/* 任务列表：按 tab 显示 */}
            <div className="tp-list">
              {(taskTab === 'day' ? daily : weekly).map(({ tk, p }) => {
                const state = p.done ? 'done' : p.cur > 0 ? 'doing' : 'todo';
                return (
                  <button key={tk.id} className={`tp-task ${state}`} onClick={() => tk.go && guardNav(tk.go)}>
                    <span className={`tp-check ${p.done ? 'on' : ''}`}>{p.done ? '✓' : ''}</span>
                    <span className="tp-task-icon">{tk.icon}</span>
                    <span className="tp-task-main">
                      <span className="tp-task-name">{tk.title}</span>
                      <span className="tp-task-meta">{p.done ? (lang === 'zh' ? '已领取' : 'Claimed') : `${p.cur}/${tk.target}`} · 🫘 {p.reward}</span>
                      <span className="tp-task-bar"><i style={{ width: `${(p.cur / tk.target) * 100}%` }} /></span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>
      </div>

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
