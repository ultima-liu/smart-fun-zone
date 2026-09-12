import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useStore,
  childTotalStars,
  childRecords,
  streakDays,
  goldSkillCount,
  litSkillCount,
} from '../store';
import { useI18n } from '../i18n';
import { gradeLabel } from '../types';
import { speak, playSfx } from '../speech';
import NpcBuddy from '../components/NpcBuddy';
import { useGates } from '../features';
import WardrobeAvatar from '../components/WardrobeAvatar';
import AttrRadar from '../components/AttrRadar';
import { IconBean } from '../components/icons';
import { shelf } from '../points';
import { localDayKey, localWeekdayIndex, rewardForCheckinStreak } from '../dailyCheckin';
import { PREMIUM_OUTFITS, premiumOutfitById } from '../content/outfits';
import { BADGES } from '../content/badges';
import BadgeIcon from '../components/BadgeIcon';

type LockerKey = 'outfit' | 'materials' | 'items';

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
  const activeChildId = useStore((s) => s.activeChildId);
  const records = useStore((s) => s.records);
  const badgesMap = useStore((s) => s.badges);
  const pointsMap = useStore((s) => s.points);
  const ownedMap = useStore((s) => s.ownedItems);
  const equippedMap = useStore((s) => s.equipped);
  const equipItem = useStore((s) => s.equipItem);
  const unequipItem = useStore((s) => s.unequipItem);
  const overrides = useStore((s) => s.storeOverrides);
  const mastery = useStore((s) => s.mastery);
  const expeditionLastAt = useStore((s) => s.expeditionLastAt);
  const materialsMap = useStore((s) => s.materials);
  const rewardRequestsMap = useStore((s) => s.rewardRequests);
  const dailyCheckinMap = useStore((s) => s.dailyCheckin);
  const claimDailyCheckin = useStore((s) => s.claimDailyCheckin);

  const child = useMemo(() => profiles.find((p) => p.id === activeChildId) ?? null, [profiles, activeChildId]);

  // 登录态守卫
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

  const [activeLocker, setActiveLocker] = useState<LockerKey | null>('outfit');
  const [previewOutfitId, setPreviewOutfitId] = useState<string | null>(null);
  const [checkinReward, setCheckinReward] = useState<{ childId: string; beans: number; stardust: number; streak: number } | null>(null);

  const totalStars = child ? childTotalStars(records, child.id) : 0;
  const streak = child ? streakDays(records, child.id) : 0;
  const mine = child ? childRecords(records, child.id) : [];

  // 头衔
  const tier = child
    ? totalStars >= 60
      ? 5
      : totalStars >= 30
        ? 4
        : totalStars >= 16
          ? 3
          : totalStars >= 6
            ? 2
            : 1
    : 1;
  const explorerTitle = t(`titleTier${tier}`);
  const nextTitleGap = Math.max(0, [6, 16, 30, 60, 999][tier - 1] - totalStars);

  // 收集柜数据
  const owned = child ? ownedMap[child.id] ?? [] : [];
  const outfitOwned = owned.filter((i) => i.startsWith('o-')).length;
  const itemOwned = owned.filter((i) => i.startsWith('i-')).length;
  const equipped = child ? equippedMap[child.id] ?? {} : {};
  const equippedPremiumId = PREMIUM_OUTFITS.some((outfit) => outfit.id === equipped.outfit) ? equipped.outfit : undefined;
  const displayedOutfitId = activeLocker === 'outfit' && previewOutfitId ? previewOutfitId : equippedPremiumId;

  // 四维
  const goldCount = child ? goldSkillCount(mastery, child.id) : 0;
  const litCount = child ? litSkillCount(mastery, child.id) : 0;
  const attrValues = child
    ? {
        wis: Math.min(100, litCount * 5 + goldCount * 10),
        cou: Math.min(100, mine.length * 8),
        cre: Math.min(100, outfitOwned * 8),
        tea: Math.min(100, streak * 10 + (expeditionLastAt[child.id] ? 15 : 0)),
      }
    : { wis: 0, cou: 0, cre: 0, tea: 0 };

  // 材料
  const mat = child ? materialsMap[child.id] ?? { stardust: 0, cardShard: 0 } : { stardust: 0, cardShard: 0 };
  const approvedRewards = child ? (rewardRequestsMap[child.id] ?? []).filter((r) => r.status === 'approved') : [];
  const earnedBadges = child ? (badgesMap[child.id] ?? []).map((id) => BADGES.find((badge) => badge.id === id)).filter(Boolean) : [];

  if (!child) {
    return (
      <div className="page hq-page">
        <NpcBuddy npc="铁砣" storyNodeIds={['p1']} />
        <div className="hq-loading">{lang === 'zh' ? '请登录卷星账号…' : 'Please log in…'}</div>
      </div>
    );
  }

  const checkin = dailyCheckinMap[child.id];
  const checkedToday = checkin?.lastDate === localDayKey();
  const checkinStreak = checkin?.streak ?? 0;
  const todayWeekday = localWeekdayIndex();
  const earnedWeekdays = new Set<number>();
  const earnedDays = Math.min(checkinStreak, 7);
  const lastEarnedOffset = checkedToday ? 0 : -1;
  for (let offset = 0; offset < earnedDays; offset += 1) {
    earnedWeekdays.add((todayWeekday + lastEarnedOffset - offset + 14) % 7);
  }
  const nextCheckinReward = rewardForCheckinStreak(checkinStreak + 1);
  const rewardLabel = (reward: { beans: number; stardust: number }) =>
    `${reward.beans} ${lang === 'zh' ? '卷卷豆' : 'beans'}${reward.stardust ? ` + ${reward.stardust} ${lang === 'zh' ? '星尘' : 'stardust'}` : ''}`;
  const handleDailyCheckin = () => {
    const reward = claimDailyCheckin(child.id);
    if (!reward) {
      playSfx('tap');
      speak(lang === 'zh' ? '今天已经签到过啦，明天再来吧！' : 'You are already checked in for today. See you tomorrow!', lang);
      return;
    }
    setCheckinReward({ ...reward, childId: child.id });
    playSfx('collect');
    speak(
      lang === 'zh'
        ? `签到成功！连续 ${reward.streak} 天，获得 ${rewardLabel(reward)}。`
        : `Check-in complete! ${reward.streak} days in a row. You earned ${rewardLabel(reward)}.`,
      lang,
    );
  };

  const toggleLocker = (key: LockerKey) => {
    if (key === 'outfit') setPreviewOutfitId(null);
    setActiveLocker((current) => (current === key ? null : key));
  };

  return (
    <div className="page hq-page">
      <NpcBuddy npc="铁砣" storyNodeIds={['p1']} />

      {/* 星空背景 */}
      <div className="hq-stars" aria-hidden="true">
        {Array.from({ length: 24 }).map((_, i) => (
          <i
            key={i}
            className="hq-star"
            style={{
              left: `${5 + Math.random() * 90}%`,
              top: `${2 + Math.random() * 60}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="hq-inner">
        {/* 角色成长舱 */}
        <section className="hq-hero">
          <div className="hq-capsule">
            <div className="hq-capsule-glow" aria-hidden="true" />
            <div className="hq-satellite s1" aria-hidden="true">🪐</div>
            <div className="hq-satellite s2" aria-hidden="true">🚀</div>

            <button className="hq-gear" onClick={() => nav('/profile/settings')} aria-label={t('settings')}>
              ⚙️
            </button>

            <div className="hq-avatar-ring">
              <WardrobeAvatar outfitId={displayedOutfitId} />
            </div>

            <div className="hq-title-badge">
              <span className="hq-title-shield">⭐</span>
              <span>{explorerTitle}</span>
            </div>

            <h2 className="hq-name">{child.name}</h2>
            <p className="hq-meta">
              {gradeLabel(child.ageBand, lang)} · ⭐ {totalStars}
            </p>
            {tier < 5 && (
              <p className="hq-title-next">
                {lang === 'zh' ? `再 ${nextTitleGap} 颗星升级` : `${nextTitleGap} stars to next title`}
              </p>
            )}

            <button className="hq-wallet-inline" onClick={guardStore}>
              <span className="hq-wallet-inline-icon">
                <IconBean size={20} gradient="gold" />
              </span>
              <span className="hq-wallet-inline-label">{t('beans')}</span>
              <span className="hq-wallet-inline-count">{pointsMap[child.id] ?? 0}</span>
            </button>
          </div>

          <div className="hq-hero-right">
            {/* 每日星签：独立卡片，置于四维图上方 */}
            <section className="hq-signin">
              <div className="hq-signin-head">
                <span>🌟 {lang === 'zh' ? '每日星签' : 'Daily Star Sign'}</span>
                <span>{lang === 'zh' ? `连续 ${checkinStreak} 天` : `${checkinStreak}-day streak`}</span>
              </div>
              <div className="hq-signin-orbit">
                {['一', '二', '三', '四', '五', '六', '日'].map((d, i) => (
                  <span
                    key={d}
                    className={`hq-planet ${earnedWeekdays.has(i) ? 'earned' : ''} ${i === todayWeekday ? 'today' : ''}`}
                    aria-label={lang === 'zh' ? `星期${d}${i === todayWeekday ? '，今天' : ''}` : undefined}
                  >
                    {d}
                  </span>
                ))}
              </div>
              <button className={`hq-signin-btn ${checkedToday ? 'checked' : ''}`} onClick={handleDailyCheckin} disabled={checkedToday}>
                {checkedToday
                  ? (lang === 'zh' ? '✓ 今日已签到' : '✓ Checked in')
                  : (lang === 'zh' ? `今日签到 · +${rewardLabel(nextCheckinReward)}` : `Check in · +${rewardLabel(nextCheckinReward)}`)}
              </button>
              <p className="hq-signin-preview">
                {checkedToday
                  ? (lang === 'zh' ? `明日奖励：${rewardLabel(nextCheckinReward)}` : `Tomorrow: ${rewardLabel(nextCheckinReward)}`)
                  : (lang === 'zh' ? `本次奖励：${rewardLabel(nextCheckinReward)}` : `This check-in: ${rewardLabel(nextCheckinReward)}`)}
              </p>
              {checkinReward?.childId === child.id && (
                <p className="hq-signin-reward">
                  {lang === 'zh'
                    ? `✦ 签到成功！连续 ${checkinReward.streak} 天，已获得 ${rewardLabel(checkinReward)}`
                    : `✦ Collected: ${rewardLabel(checkinReward)}`}
                </p>
              )}
            </section>

            {/* 四维图：独立卡片，位于签到下方 */}
            <section className="hq-radar">
              <h4>{lang === 'zh' ? '我的四维能量' : 'My Energy'}</h4>
              <AttrRadar
                values={attrValues}
                labels={{
                  wis: t('attrWisdom'),
                  cou: t('attrCourage'),
                  cre: t('attrCraft'),
                  tea: t('attrTeam'),
                }}
                size={150}
              />
              <div className="hq-radar-stats">
                {([
                  ['wis', t('attrWisdom'), attrValues.wis, '#43c6ff'],
                  ['cou', t('attrCourage'), attrValues.cou, '#ff7a98'],
                  ['cre', t('attrCraft'), attrValues.cre, '#f6cd72'],
                  ['tea', t('attrTeam'), attrValues.tea, '#3bd89e'],
                ] as const).map(([k, label, v, color]) => (
                  <span key={k} className="hq-radar-chip" style={{ '--chip': color } as React.CSSProperties}>
                    <b>{v}</b>
                    <small>{label}</small>
                  </span>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="hq-panel hq-honors-panel">
          <div className="hq-panel-head"><span>🏅 {lang === 'zh' ? '荣誉墙' : 'Honors'}</span><span className="hq-panel-count">{earnedBadges.length}/{BADGES.length}</span></div>
          {earnedBadges.length ? <div className="hq-badge-grid">{earnedBadges.map((badge) => badge && <div key={badge.id} className={`hq-badge-cell unlocked ${badge.rarity}`} title={badge.meaning}><span className="hq-badge-icon"><BadgeIcon badge={badge} /></span><span className="hq-badge-label">{badge.name}</span><small>{badge.meaning}</small></div>)}</div> : <p className="hq-empty">完成剧情任务后，徽章会在这里点亮。</p>}
        </section>

        {/* 收集柜 · 分段页签（课程页上下册样式） */}
        <nav className="hq-tabs" aria-label="收藏柜">
          {([
            ['outfit', lang === 'zh' ? '装扮' : 'Outfit', '👗', ''],
            ['materials', lang === 'zh' ? '材料' : 'Materials', '💎', ''],
            ['items', lang === 'zh' ? '道具' : 'Items', '🧰', itemOwned > 0 ? itemOwned : ''],
          ] as const).map(([key, label, icon, count]) => (
            <button
              key={key}
              className={`hq-tab ${activeLocker === key ? 'active' : ''}`}
              onClick={() => toggleLocker(key)}
              aria-label={label}
            >
              <span className="hq-tab-icon">{icon}</span>
              <span className="hq-tab-name">{label}</span>
              {count !== '' && <span className="hq-tab-count">{count}</span>}
            </button>
          ))}
        </nav>

        {/* 柜子详情面板 */}
        {activeLocker === 'outfit' && (
          <section className="hq-panel wardrobe-panel">
            <div className="hq-panel-head">
              <span>✦ {lang === 'zh' ? '星轨衣橱' : 'Startrail Wardrobe'}</span>
              <button className="hq-panel-close" onClick={() => { setPreviewOutfitId(null); setActiveLocker(null); }}>✕</button>
            </div>
            <div className="wardrobe-layout">
              <div className="wardrobe-stage">
                <div className="wardrobe-stage-glow" />
                <WardrobeAvatar outfitId={previewOutfitId ?? equippedPremiumId} className="wardrobe-avatar--preview" />
                <div className="wardrobe-stage-copy">
                  <span className="wardrobe-rarity">{premiumOutfitById(previewOutfitId ?? equippedPremiumId).rarity}</span>
                  <h3>{premiumOutfitById(previewOutfitId ?? equippedPremiumId).name}</h3>
                  <small>{premiumOutfitById(previewOutfitId ?? equippedPremiumId).subtitle}</small>
                  <p>{premiumOutfitById(previewOutfitId ?? equippedPremiumId).description}</p>
                </div>
              </div>
              <div className="wardrobe-picker">
                <p className="wardrobe-tip">{lang === 'zh' ? '点击任意套装自由试穿，不会立即替换当前穿戴' : 'Select any outfit to preview before equipping'}</p>
                <div className="wardrobe-cards">
                  {PREMIUM_OUTFITS.map((outfit) => {
                    const isOwned = outfit.default || owned.includes(outfit.id);
                    const isEquipped = outfit.default ? !equippedPremiumId : equippedPremiumId === outfit.id;
                    const isPreviewing = (previewOutfitId ?? equippedPremiumId ?? 'o-academy') === outfit.id;
                    return (
                      <button key={outfit.id} className={`wardrobe-card ${isPreviewing ? 'previewing' : ''}`} aria-pressed={isPreviewing} style={{ '--outfit-accent': outfit.accent } as CSSProperties} onClick={() => { setPreviewOutfitId(outfit.id); playSfx('tap'); }}>
                        <img src={outfit.image} alt="" />
                        <span className="wardrobe-card-info"><b>{outfit.name}</b><small>{outfit.rarity} · {isEquipped ? '穿戴中' : isOwned ? '已拥有' : '可预览'}</small></span>
                      </button>
                    );
                  })}
                </div>
                {(() => {
                  const selected = premiumOutfitById(previewOutfitId ?? equippedPremiumId);
                  const isOwned = selected.default || owned.includes(selected.id);
                  const isEquipped = selected.default ? !equippedPremiumId : equippedPremiumId === selected.id;
                  if (isEquipped) return <button className="wardrobe-confirm is-equipped" disabled>✓ {lang === 'zh' ? '当前穿戴' : 'Equipped'}</button>;
                  if (!isOwned) return <button className="wardrobe-confirm is-locked" onClick={() => nav('/store')}>🔒 {lang === 'zh' ? '前往补给站获取' : 'Get in Store'}</button>;
                  return <button className="wardrobe-confirm" onClick={() => {
                    if (selected.default) {
                      if (equipped.outfit) unequipItem(child.id, equipped.outfit);
                    } else equipItem(child.id, selected.id);
                    setPreviewOutfitId(null);
                    playSfx('collect');
                    speak(lang === 'zh' ? `${selected.name}，穿戴完成！` : `${selected.name} equipped!`, lang);
                  }}>{lang === 'zh' ? '确认穿戴' : 'Equip Outfit'}</button>;
                })()}
              </div>
            </div>
          </section>
        )}


        {activeLocker === 'materials' && (
          <section className="hq-panel">
            <div className="hq-panel-head">
              <span>💎 {lang === 'zh' ? '材料舱' : 'Materials'}</span>
              <button className="hq-panel-close" onClick={() => setActiveLocker(null)}>✕</button>
            </div>
            <div className="hq-materials">
              <button className="hq-mat-card" onClick={() => nav('/dock')}>
                <span className="hq-mat-icon">✨</span>
                <div className="hq-mat-info">
                  <b>{lang === 'zh' ? '星屑' : 'Stardust'}</b>
                  <small>{lang === 'zh' ? '升级飞船' : 'Upgrade ship'}</small>
                </div>
                <span className="hq-mat-count">{mat.stardust}</span>
              </button>
              <button className="hq-mat-card" onClick={() => nav('/archive')}>
                <span className="hq-mat-icon">💎</span>
                <div className="hq-mat-info">
                  <b>{lang === 'zh' ? '星尘' : 'Card Shard'}</b>
                  <small>{lang === 'zh' ? '星尘召唤' : 'Card summon'}</small>
                </div>
                <span className="hq-mat-count">{mat.cardShard}</span>
              </button>
            </div>
          </section>
        )}

        {activeLocker === 'items' && (
          <section className="hq-panel">
            <div className="hq-panel-head">
              <span>🧰 {lang === 'zh' ? '道具框' : 'Item Box'}</span>
              <button className="hq-panel-close" onClick={() => setActiveLocker(null)}>✕</button>
            </div>
            <div className="hq-scroll">
              {shelf('item', overrides).map((it) => {
                const count = owned.filter((id) => id === it.id).length;
                if (count === 0) return null;
                return (
                  <div key={it.id} className="hq-row">
                    <span className="hq-row-icon">{it.icon}</span>
                    <span className="hq-row-name">
                      {it.name}
                      <small>{it.desc}</small>
                    </span>
                    <span className="hq-row-count">×{count}</span>
                  </div>
                );
              })}
              {approvedRewards.map((r) => (
                <div key={r.id} className="hq-row">
                  <span className="hq-row-icon">{r.icon}</span>
                  <span className="hq-row-name">
                    {r.name}
                    <small>{lang === 'zh' ? '已批准的奖励卡' : 'Approved reward card'}</small>
                  </span>
                  <span className="hq-row-count">1</span>
                </div>
              ))}
              {itemOwned === 0 && approvedRewards.length === 0 && (
                <p className="empty-tip small">{lang === 'zh' ? '还没有道具或奖励卡～' : 'No items or reward cards yet.'}</p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
