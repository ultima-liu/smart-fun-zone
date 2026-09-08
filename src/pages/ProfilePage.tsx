import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useStore,
  childTotalStars,
  childRecords,
  streakDays,
  gardenStage,
} from '../store';
import { useI18n } from '../i18n';
import { KidButton, Toggle } from '../components/ui';
import PageHero from '../components/PageHero';
import { AVATARS, GRADES, gradeLabel, type Grade } from '../types';
import { speak, playSfx } from '../speech';
import NpcBuddy from '../components/NpcBuddy';
import { useGates } from '../features';
import AvatarFigure, { PALETTES } from '../components/AvatarFigure';
import {
  IconLock,
  IconTrophy,
  IconStar,
  IconPlay,
  IconChart,
  IconHeart,
  IconClock,
  IconBean,
} from '../components/icons';
import { itemById, shelf } from '../points';
import { logout as cloudLogout } from '../api';

export default function ProfilePage() {
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const gates = useGates();

  const guardStore = () => {
    if (gates.canEnter('/store')) nav('/store');
    else {
      playSfx('deny');
      speak(lang === 'zh' ? '补给站还没解锁，先去完成剧情任务吧！' : 'Locked! Finish the story quest first!', lang);
    }
  };
  const profiles = useStore((s) => s.profiles);
  const records = useStore((s) => s.records);
  const activeChildId = useStore((s) => s.activeChildId);
  const setActiveChild = useStore((s) => s.setActiveChild);
  const pointsMap = useStore((s) => s.points);
  const ownedMap = useStore((s) => s.ownedItems);
  const equippedMap = useStore((s) => s.equipped);
  const equipItem = useStore((s) => s.equipItem);
  const unequipItem = useStore((s) => s.unequipItem);
  const avatarColorMap = useStore((s) => s.avatarColor);
  const setAvatarColor = useStore((s) => s.setAvatarColor);
  const avatarHairMap = useStore((s) => s.avatarHair);
  const setAvatarHair = useStore((s) => s.setAvatarHair);
  const overrides = useStore((s) => s.storeOverrides);
  const iv = (id: string) => itemById(id, overrides);
  const addProfile = useStore((s) => s.addProfile);
  const sound = useStore((s) => s.sound);
  const toggleSound = useStore((s) => s.toggleSound);
  const musicOn = useStore((s) => s.musicOn);
  const setMusicOn = useStore((s) => s.setMusicOn);
  const voiceOn = useStore((s) => s.voiceOn);
  const setVoiceOn = useStore((s) => s.setVoiceOn);
  const setLang = useStore((s) => s.setLang);
  const lessonSkipOn = useStore((s) => s.lessonSkipOn);
  const setLessonSkipOn = useStore((s) => s.setLessonSkipOn);
  const charBag = useStore((s) => s.charBag);

  const child = useMemo(() => profiles.find((p) => p.id === activeChildId) ?? null, [profiles, activeChildId]);

  // 登录态守卫：未完成孩子登录（无当前孩子）不允许进入“我的”，避免绕过登录
  useEffect(() => {
    const s = useStore.getState();
    const hasSession = !!s.activeChildId || !!localStorage.getItem('sfz_token');
    if (!hasSession) nav('/child-login');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChildId]);

  // 进入总部欢迎语
  useEffect(() => {
    if (child) speak(t('welcomeHQ'), lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [creating, setCreating] = useState(false);
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [name, setName] = useState('');
  const [tab, setTab] = useState<'hair' | 'color' | 'outfit' | 'badge'>('hair');
  const [age, setAge] = useState<Grade>('g1');

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
  };

  const doLogout = () => {
    cloudLogout();
    setActiveChild(null);
    nav('/');
  };

  const mine = child ? childRecords(records, child.id) : [];
  const totalStars = child ? childTotalStars(records, child.id) : 0;
  const streak = child ? streakDays(records, child.id) : 0;
  const gamesDone = new Set(mine.map((r) => r.gameId)).size;
  const garden = child ? gardenStage(totalStars) : null;
  const bag = child ? charBag[child.id] ?? [] : [];

  // 卷豆花园进度计算（迁自首页）
  const gardenPct = garden
    ? garden.stage >= 5
      ? 1
      : (() => {
          const floors = [0, 6, 16, 30, 60];
          const cur = Math.max(0, Math.min(floors[garden.stage], totalStars));
          return floors[garden.stage] > 0 ? cur / floors[garden.stage] : totalStars >= 6 ? 1 : totalStars / 6;
        })()
    : 0;
  const gardenLitStars = Math.floor(gardenPct * 5);
  const nextStarGap = garden
    ? garden.stage >= 5
      ? 0
      : Math.max(0, ([0, 6, 16, 30, 60][garden.stage + 1] ?? 60) - totalStars)
    : 0;

  // 成就徽章（由原“成就”页迁入）
  const playedDays = new Set(mine.map((r) => new Date(r.playedAt).toDateString())).size;
  const played = (id: string) => mine.some((r) => r.gameId === id);
  const badges = [
    { id: 'first', icon: <IconTrophy size={38} gradient="gold" />, label: t('badgeFirst'), done: mine.length > 0 },
    { id: 'stars10', icon: <IconStar size={38} gradient="teal" />, label: t('badgeStars10'), done: totalStars >= 10 },
    { id: 'farm', icon: <IconPlay size={38} gradient="coral" />, label: t('badgeFarm'), done: played('number-farm') },
    { id: 'memory', icon: <IconChart size={38} gradient="violet" />, label: t('badgeMemory'), done: played('memory-match') },
    { id: 'spot', icon: <IconHeart size={38} gradient="coral" />, label: t('badgeSpot'), done: played('odd-one-out') },
    { id: 'streak', icon: <IconClock size={38} gradient="gold" />, label: t('badgeStreak'), done: playedDays >= 2 },
  ];
  const litBadges = badges.filter((b) => b.done).length;

  return (
    <div className="page profile">
      <NpcBuddy npc="铁砣" storyNodeIds={["p1"]} />
      {/* 页头：我的档案摘要（头像大图在下方换装展厅展示，这里用文字信息卡） */}
      <PageHero
        eyebrow={`${lang === 'zh' ? '总部 · 卷星人基地' : 'Juanian HQ'}`}
        title={t('hqTitle')}
        planet="hut"
        showAvatar={false}
        stats={[
          { icon: '⭐', value: totalStars, tone: 'gold', label: t('totalStars') },
          { icon: <IconBean size={16} gradient="gold" />, value: child ? pointsMap[child.id] ?? 0 : 0, tone: 'mint', label: t('beans') },
          { icon: '🎮', value: gamesDone, tone: 'teal', label: t('gamesDone') },
          { icon: '🔥', value: streak, tone: 'coral', label: t('streakLabel') },
        ]}
      />

      {/* 角色展厅（游戏换装界面） */}
      {child && (
        <section className="dressing-room">
          {/* 左：实时角色预览 */}
          <div className="dr-stage">
            <div className="dr-stage-glow" />
            <AvatarFigure
              size={200}
              equipped={equippedMap[child.id]}
              colorway={(avatarColorMap[child.id] as never) ?? 'pink'}
              hairstyle={(avatarHairMap[child.id] as never) ?? 'sporty'}
              pose="pose"
            />
            <div className="dr-name">
              <h2>
                {child.name}
                {equippedMap[child.id]?.badge && (
                  <span className="equip-badge-tag" title={iv(equippedMap[child.id]!.badge!)?.name}>
                    {iv(equippedMap[child.id]!.badge!)?.icon}
                  </span>
                )}
              </h2>
              <p>
                {gradeLabel(child.ageBand, lang)} · {gamesDone} {t('gamesDone')} · 🔥 {streak} {t('streakLabel')}
              </p>
              <div className="dr-stats">
                <span>⭐ {totalStars}</span>
                <span>🌱 {garden ? t(garden.labelKey) : ''}</span>
                <span><IconBean size={14} gradient="gold" /> {pointsMap[child.id] ?? 0}</span>
              </div>
            </div>
          </div>

          {/* 右：分类选择器 */}
          <div className="dr-panel">
            <div className="dr-tabs">
              {([
                ['hair', '💇 发型'],
                ['color', '🎨 肤色'],
                ['outfit', '👗 装扮'],
                ['badge', '🎖️ 卷卷徽章'],
              ] as const).map(([k, label]) => (
                <button key={k} className={`dr-tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>
                  {label}
                </button>
              ))}
            </div>

            <div className="dr-body">
              {tab === 'hair' && (
                <div className="dr-grid">
                  {([
                    ['sporty', '🟤', '运动短发'],
                    ['long', '👱', '长发'],
                    ['bob', '👩', '波波头'],
                    ['ponytail', '👧', '马尾'],
                  ] as const).map(([h, icon, label]) => (
                    <button
                      key={h}
                      className={`dr-cell ${(avatarHairMap[child.id] ?? 'sporty') === h ? 'on' : ''}`}
                      onClick={() => setAvatarHair(child.id, h)}
                    >
                      <span className="dr-cell-icon">{icon}</span>
                      <span className="dr-cell-label">{label}</span>
                    </button>
                  ))}
                </div>
              )}

              {tab === 'color' && (
                <div className="dr-grid">
                  {(['pink', 'mint', 'sky', 'lavender', 'lemon', 'skin'] as const).map((c) => (
                    <button
                      key={c}
                      className={`dr-cell ${(avatarColorMap[child.id] ?? 'pink') === c ? 'on' : ''}`}
                      onClick={() => setAvatarColor(child.id, c)}
                    >
                      <span className="dr-cell-icon" style={{ background: PALETTES[c]?.body ?? '#F79BB0' }} />
                      <span className="dr-cell-label">{({ pink: '粉粉', mint: '薄荷', sky: '天蓝', lavender: '薰衣草', lemon: '柠檬', skin: '自然' } as const)[c]}</span>
                    </button>
                  ))}
                </div>
              )}

              {(tab === 'outfit' || tab === 'badge') && (
                <div className="dr-body-scroll">
                  {shelf(tab === 'outfit' ? 'outfit' : 'badge', overrides).map((it) => {
                    const owned = (ownedMap[child.id] ?? []).includes(it.id);
                    const isEquipped = tab === 'outfit' ? equippedMap[child.id]?.outfit === it.id : equippedMap[child.id]?.badge === it.id;
                    return (
                      <div key={it.id} className={`dr-row ${isEquipped ? 'equipped' : ''}`}>
                        <span className="dr-row-icon">{it.icon}</span>
                        <span className="dr-row-name">{it.name}</span>
                        {owned ? (
                          isEquipped ? (
                            <button className="equip-btn on" onClick={() => unequipItem(child.id, it.id)}>卸下</button>
                          ) : (
                            <button className="equip-btn" onClick={() => equipItem(child.id, it.id)}>装备</button>
                          )
                        ) : (
                          <button className="dr-buy" onClick={guardStore}><IconBean size={14} gradient="gold" /> 去兑换</button>
                        )}
                      </div>
                    );
                  })}
                  {(ownedMap[child.id] ?? []).length === 0 && (
                    <p className="empty-tip small">还没有{tab === 'outfit' ? '装扮' : '卷卷徽章'}，去{t('grocery')}兑换吧～</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 成长模块：卷豆花园（花园环 + 豆阶段进度，迁自首页） */}
      {child && garden && (
        <section className="module">
          <h3 className="module-title">{t('gardenName')}</h3>
          <div className="growb-banner">
            <div className="growb-garden">
              <svg className="growb-ring" viewBox="0 0 100 100" aria-hidden="true">
                <defs>
                  <linearGradient id="growb-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#A78BFA" />
                    <stop offset="0.55" stopColor="#8B7BF0" />
                    <stop offset="1" stopColor="#F2A65A" />
                  </linearGradient>
                </defs>
                <circle className="growb-ring-bg" cx="50" cy="50" r="44" />
                <circle
                  className="growb-ring-fg"
                  cx="50" cy="50" r="44"
                  stroke="url(#growb-grad)"
                  strokeDasharray={2 * Math.PI * 44}
                  strokeDashoffset={2 * Math.PI * 44 * (1 - gardenPct)}
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <span className={`growb-plant stage-${garden.stage}`}>{garden.g}</span>
              <i className="growb-spark spark-1" aria-hidden="true">✦</i>
              <i className="growb-spark spark-2" aria-hidden="true">✧</i>
              <i className="growb-spark spark-3" aria-hidden="true">✦</i>
              {[0, 1, 2, 3, 4].map((si) => (
                <i key={si} className={`growb-star ${si < gardenLitStars ? 'lit' : ''}`} aria-hidden="true">★</i>
              ))}
            </div>
            <div className="growb-info">
              <b>{t(garden.labelKey)}</b>
              <small>⭐ {totalStars} · {t('totalStars')}</small>
              {streak > 0 && <i className="growb-streak">🔥 {streak} {t('streakLabel')}</i>}
            </div>
            <div className="growb-stagebar">
              <div className="growb-stagebar-head">
                <b>{lang === 'zh' ? '本阶段进度' : 'Stage Progress'}</b>
                <span>{Math.round(gardenPct * 100)}%</span>
              </div>
              <div className="growb-stagebar-track"><i style={{ width: `${gardenPct * 100}%` }} /></div>
              <p className="growb-stagebar-tip">
                {garden.stage >= 5
                  ? (lang === 'zh' ? '已满级，太棒啦！' : 'Max stage reached!')
                  : (lang === 'zh' ? `再攒 ${nextStarGap} 颗⭐进入下一阶段` : `${nextStarGap} stars to next stage`)}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 卷卷豆 · 补给站入口卡 */}
      {child && (
        <button className="entry-card points-entry" onClick={guardStore} aria-label="grocery">
          <span className="entry-icon coral"><IconBean size={22} gradient="gold" /></span>
          <span className="entry-text">
            <b>{t('grocery')}</b>
            <small>
              当前 <b className="pts-num">{pointsMap[child.id] ?? 0}</b> {t('beans')}
              {ownedMap[child.id]?.length ? ` · 已拥有 ${ownedMap[child.id]!.length} 件装扮` : ''}
            </small>
          </span>
          <span className="entry-arrow">→</span>
        </button>
      )}

      {/* 成就徽章（由原“成就”页迁入） */}
      {child && (
        <section className="module">
          <h3 className="module-title">
            🏅 {t('badges')}
            <span className="badge-lit">{t('badgesLit', { n: litBadges })}</span>
          </h3>
          <div className="badge-grid">
            {badges.map((b) => (
              <div key={b.id} className={`badge-cell ${b.done ? 'unlocked' : 'locked'}`}>
                <div className="badge-icon">{b.done ? b.icon : '🔒'}</div>
                <div className="badge-label">{b.label}</div>
              </div>
            ))}
          </div>
          {mine.length === 0 && <p className="empty-tip small">{t('noData')}</p>}
        </section>
      )}

      {/* 档案管理 */}
      <section className="module">
        <h3 className="module-title">{t('profileManage')}</h3>
        <div className="switch-list">
          {profiles.map((p) => (
            <button
              key={p.id}
              className={`switch-item ${p.id === child?.id ? 'current' : ''}`}
              onClick={() => {
                setActiveChild(p.id);
                speak(t('welcome'), lang);
              }}
            >
              <span className="switch-avatar">{p.avatar}</span>
              <span className="switch-name">
                {p.name}
                <small>
                  {gradeLabel(p.ageBand, lang)} · ⭐ {childTotalStars(records, p.id)}
                </small>
              </span>
              {p.id === child?.id && <span className="switch-current">✓</span>}
            </button>
          ))}
          {!creating ? (
            <button className="switch-item add" onClick={() => setCreating(true)}>
              <span className="switch-avatar">➕</span>
              <span className="switch-name">{t('addProfile')}</span>
            </button>
          ) : (
            <div className="create-inline">
              <input
                className="name-input"
                value={name}
                placeholder={t('namePlaceholder')}
                onChange={(e) => setName(e.target.value)}
                maxLength={12}
              />
              <div className="avatar-grid mini">
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
              <div className="age-grid mini">
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
      </section>

      {/* 家长中心入口 */}
      <section className="module">
        <h3 className="module-title">{t('parentCenter')}</h3>
        <button className="entry-card" onClick={() => nav('/parent')}>
          <span className="entry-icon coral">
            <IconLock size={26} />
          </span>
          <span className="entry-text">
            <b>{t('parentCenter')}</b>
            <small>{t('settings')} · {t('report')}</small>
          </span>
          <span className="entry-arrow">›</span>
        </button>
      </section>

      {/* 字卡袋 */}
      <section className="module">
        <h3 className="module-title">
          🈶 {t('charBag')}（{bag.length}）
        </h3>
        {bag.length === 0 ? (
          <p className="empty-tip small">{t('noData')}</p>
        ) : (
          <div className="char-grid bag">
            {bag.map((c) => (
              <span key={c} className="char-cell seen">
                {c}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* 声音设置 */}
      <section className="module">
        <h3 className="module-title">{t('settings')}</h3>
        <div className="settings-card">
          <div className="setting-row">
            <span>{t('sound')}</span>
            <Toggle on={sound} onClick={toggleSound} label={t('sound')} />
          </div>
          <div className="setting-row">
            <span>🎵 {t('bgm')}</span>
            <Toggle on={musicOn} onClick={() => setMusicOn(!musicOn)} label={t('bgm')} />
          </div>
          <div className="setting-row">
            <span>🗣️ {t('voice')}</span>
            <Toggle on={voiceOn} onClick={() => setVoiceOn(!voiceOn)} label={t('voice')} />
          </div>
          <div className="setting-row">
            <span>⏭️ {t('skipDemo')}</span>
            <Toggle on={lessonSkipOn} onClick={() => setLessonSkipOn(!lessonSkipOn)} label={t('skipDemo')} />
          </div>
          <div className="setting-row">
            <span>{t('language')}</span>
            <div className="lang-toggle small">
              <button className={lang === 'zh' ? 'active' : ''} onClick={() => setLang('zh')}>
                中文
              </button>
              <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
                English
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 退出登录（原首页右上角按钮迁入） */}
      <button className="entry-card logout-entry" onClick={doLogout} aria-label="logout">
        <span className="entry-icon coral">⏻</span>
        <span className="entry-text">
          <b>{t('logout')}</b>
          <small>{t('logoutHint')}</small>
        </span>
        <span className="entry-arrow">›</span>
      </button>

      <footer className="about-line">
        {t('about')} · {t('appName')} v0.2 🪐
      </footer>
    </div>
  );
}
