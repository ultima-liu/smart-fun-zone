import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, childTotalStars, streakDays, gardenStage, goldSkillCount, litSkillCount } from '../store';
import { EMPTY, useGates } from '../features';
import { useI18n } from '../i18n';
import { KidButton } from '../components/ui';
import Modal from '../components/Modal';
import { AVATARS, GRADES, gradeLabel, type Grade } from '../types';
import { speak, playSfx } from '../speech';
import { tryCompleteStoryNode } from '../storyProgress';
import RewardBurst from '../components/RewardBurst';
import Logo from '../components/Logo';
import LoginDialog from '../components/LoginDialog';
import ArrivalFlight from '../components/ArrivalFlight';
import StoryStrip from '../components/StoryStrip';
import Mascot from '../components/Mascot';
import AvatarFigure from '../components/AvatarFigure';
import { IconLock, IconSpeakerOff, IconSpeakerOn, IconBean, IconStar, IconPlay, IconClock } from '../components/icons';
import { getSkill } from '../content/skills';
import { DAILY_TASKS, taskProgress } from '../tasks';
import InteractiveJuanStar from '../components/InteractiveJuanStar';
import { CosmicFleet } from '../components/cosmos';
import CurrencyBar from '../components/CurrencyBar';
import { pendingPacks, LOOT_MAX_PACKS, type LootDrop } from '../content/expedition';

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
  const pointsNow = useStore((s) => (s.activeChildId ? s.points[s.activeChildId] ?? 0 : 0));
  const equippedNow = useStore((s) => (s.activeChildId ? s.equipped[s.activeChildId] : undefined));
  const colorNow = useStore((s) => (s.activeChildId ? s.avatarColor[s.activeChildId] : undefined));
  const hairNow = useStore((s) => (s.activeChildId ? s.avatarHair[s.activeChildId] : undefined));
  const child = useMemo(() => profiles.find((p) => p.id === activeChildId) ?? null, [profiles, activeChildId]);

  const [creating, setCreating] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [arrive, setArrive] = useState(false);
  const [pulse, setPulse] = useState<string | null>(null);
  const [lootBurst, setLootBurst] = useState<LootDrop | null>(null);
  const expeditionLastAt = useStore((s) => (s.activeChildId ? s.expeditionLastAt[s.activeChildId] : undefined));
  const materials = useStore((s) => (s.activeChildId ? s.materials[s.activeChildId] : undefined));
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
    if (drop && (drop.beans > 0 || drop.stardust > 0 || drop.cardShard > 0 || drop.outfits.length > 0)) {
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
  const gates = useGates();

  // 消费待演示的解锁目标（功能页完成剧情后写入 → 回到首页播放解封动画）
  const storyPulse = useStore((s) => s.storyPulse);
  const setStoryPulse = useStore((s) => s.setStoryPulse);

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
    speak(t('welcome'), lang);
    nav('/'); // 建档/切换后先回首页，跟随新手剧情推进
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
  // 继续学习：最近更新且未满星的课
  const resumeSkill = (() => {
    const m = useStore.getState().mastery[child.id];
    if (!m) return undefined;
    const ids = Object.keys(m).filter((id) => !m[id].gold);
    if (ids.length === 0) return undefined;
    ids.sort((a, b) => (m[b].updatedAt ?? 0) - (m[a].updatedAt ?? 0));
    return getSkill(ids[0]);
  })();
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

  return (
    <div className="page home home-dash">
      {/* 登录到达首页：左上舱门开 → 飞船飞向卷星 */}
      {arrive && <ArrivalFlight greet={t('welcomeHome', { name: child.name })} lang={lang} onDone={() => setArrive(false)} />}
      <header className="app-header">
        <div className="brand-mini">
          <Mascot pose="happy" size={44} />
          <span className="brand-name">{t('appName')}</span>
        </div>
        {/* 顶部货币/材料余额：星星/卷星币/星屑/图鉴碎片 */}
        <CurrencyBar compact />
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
        </div>
      </header>

      {/* 剧情条：当前章节任务（序章起顺序推进） */}
      <StoryStrip />

      {/* 主区三栏：左=个人卡 / 中=卷星 / 右=今日任务（一屏，不滚动） */}
      <div className="home-main">
        {/* 左栏：孩子成长档案 */}
        <aside className="home-col home-left">
          <section className="profile-card">
            {/* 头像 + 称号 */}
            <div className="pc-head">
              <div className="pc-avatar">
                <AvatarFigure
                  size={84}
                  equipped={equippedNow}
                  colorway={(colorNow as never) ?? 'pink'}
                  hairstyle={(hairNow as never) ?? 'sporty'}
                  mood={doneCount >= daily.length ? 'proud' : 'happy'}
                />
              </div>
              <div className="pc-title">
                <b className="pc-name">{child.name}</b>
                <span className="pc-grade">{gradeLabel(child.ageBand, lang)}</span>
              </div>
              <button className="pc-switch" onClick={() => setSwitching(true)} aria-label="switch">⇄</button>
            </div>

            {/* 成长数据 */}
            <div className="pc-stats">
              <div className="pc-stat"><IconStar size={17} gradient="gold" /><b>{totalStars}</b><small>{t('totalStars')}</small></div>
              <div className="pc-stat"><IconBean size={17} gradient="gold" /><b>{pointsNow}</b><small>{t('beans')}</small></div>
              <div className="pc-stat"><IconClock size={17} gradient="coral" /><b>{streak}</b><small>{t('streakLabel')}</small></div>
              <div className="pc-stat"><IconPlay size={17} gradient="mint" /><b>{litCount}</b><small>{t('coursesLearned')}</small></div>
            </div>

            {/* 继续学习 */}
            {resumeSkill && (
              <button className="resume-bar" onClick={() => guardNav(`/learn/${resumeSkill.id}`)}>
                <span className="resume-icon">📖</span>
                <span className="resume-text">
                  <small>{t('continueLearn')}</small>
                  <b>{resumeSkill.name[lang]}</b>
                </span>
                <span className="resume-go">▶</span>
              </button>
            )}

            {/* 成长进度：已学课程中，掌握了多少（满星） */}
            <div className="pc-progress">
              <div className="pc-progress-head">
                <span className="pc-progress-row"><i>⭐</i> {t('masteredSkills')}</span>
                <span className="pc-progress-num">{goldCount}<em> / {litCount}</em></span>
              </div>
              <div className="pc-progress-track"><i style={{ width: `${litCount ? (goldCount / litCount) * 100 : 0}%` }} /></div>
              <span className="pc-progress-tip">{t('masterNote')}</span>
            </div>
          </section>
        </aside>

        {/* 中栏：大卷星 */}
        <section className="hero-card juan-hero juan-hero-big home-center">
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
              <span>🎴 图鉴碎片 {materials?.cardShard ?? 0}</span>
            </div>
          </div>
        </section>

        {lootBurst != null && <RewardBurst drop={lootBurst} onDone={() => setLootBurst(null)} />}

        {/* 右栏：今日任务（竖排） */}
        <aside className="home-col home-right">
          <section className="task-panel">
            {/* 面板头：今日任务 + 进度环 */}
            <div className="tp-head">
              <div className="tp-title">
                <span className="tp-emoji">🛰️</span>
                <div>
                  <b>{t('stationTasks')}</b>
                  <small>{t('todayQuest')}</small>
                </div>
              </div>
              <div className="tp-ring" style={{ '--p': `${(doneCount / Math.max(1, daily.length)) * 100}%` } as React.CSSProperties}>
                <span>{doneCount}/{daily.length}</span>
              </div>
            </div>

            {/* 任务列表 */}
            <div className="tp-list">
              {daily.map(({ tk, p }) => {
                const state = p.done ? 'done' : p.cur > 0 ? 'doing' : 'todo';
                return (
                  <button
                    key={tk.id}
                    className={`tp-task ${state}`}
                    onClick={() => tk.go && guardNav(tk.go)}
                  >
                    <span className="tp-task-icon">{p.done ? '✅' : tk.icon}</span>
                    <span className="tp-task-name">{tk.title}</span>
                    {state === 'done' ? (
                      <span className="tp-task-done">✓</span>
                    ) : (
                      <span className="tp-task-bar"><i style={{ width: `${(p.cur / tk.target) * 100}%` }} /></span>
                    )}
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
