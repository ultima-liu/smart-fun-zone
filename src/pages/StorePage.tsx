import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { KidButton } from '../components/ui';
import PageHero from '../components/PageHero';
import { useI18n } from '../i18n';
import { speakAsNpc } from '../speech';
import { npcMeta } from '../content/npc';
import { IconBean } from '../components/icons';
import { KIND_LABEL, shelf, type ItemKind, type StoreItem } from '../points';
import WardrobeAvatar from '../components/WardrobeAvatar';
import NpcBuddy from '../components/NpcBuddy';

/** 补给站：3 类货架（装扮/游戏道具/奖励兑换）+ 试穿预览 */
export default function StorePage() {
  const nav = useNavigate();
  const { lang, t } = useI18n();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const stateNow = useStore();
  const redeemItem = useStore((s) => s.redeemItem);
  const buyReward = useStore((s) => s.buyReward);
  const [msg, setMsg] = useState('');
  const [preview, setPreview] = useState<StoreItem | null>(null);

  const points = child?.id ? stateNow.points[child.id] ?? 0 : 0;
  const owned = child?.id ? stateNow.ownedItems[child.id] ?? [] : [];
  const equipped = child?.id ? stateNow.equipped[child.id] ?? {} : {};

  // 进入补给站欢迎语
  useEffect(() => {
    if (child) speakAsNpc(t('welcomeStore'), npcMeta('铛铛'), lang);

  }, [child?.id]);

  useEffect(() => {
    if (!child) nav('/');

  }, [child]);

  if (!child) return null;

  const buy = (it: StoreItem): boolean => {
    if (!child) return false;
    const ok = redeemItem(child.id, it.id, it.cost);
    setMsg(ok ? `✅ 已兑换「${it.name}」` : owned.includes(it.id) ? '已拥有该商品' : '卷卷豆不足');
    return ok;
  };

  const buyRewardItem = (it: StoreItem) => {
    if (!child) return;
    const ok = buyReward(child.id, { id: it.id, name: it.name, cost: it.cost });
    setMsg(ok
      ? it.id.startsWith('rw-game') || it.id.startsWith('rw-video')
        ? `✅ 已兑换「${it.name}」，今天游戏时长已加上！`
        : `✅ 已兑换「${it.name}」，记得找家长兑现哦～`
      : '卷卷豆不足');
  };

  const renderCard = (it: StoreItem) => {
    const has = owned.includes(it.id);
    const afford = points >= it.cost;
    const isReward = it.kind === 'reward';
    const canBuy = isReward || !has;
    return (
      <div
        key={it.id}
        data-kind={it.kind}
        className={`store-item deck-card ${has ? 'owned' : afford ? '' : 'poor'}`}
        style={it.accent ? ({ '--outfit-accent': it.accent } as React.CSSProperties) : undefined}
        role="button"
        tabIndex={0}
        aria-label={`${it.name}，${has ? '已拥有' : '未拥有'}，点击预览`}
        onClick={() => setPreview(it)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPreview(it); } }}
      >
        {it.image ? (
          <span className="store-item-figure">
            <img src={it.image} alt="" loading="lazy" draggable={false} />
            {it.rarity && <i className="store-item-rarity">{it.rarity}</i>}
          </span>
        ) : (
          <div className="store-item-icon">{it.icon}</div>
        )}
        <div className="store-item-name">{it.name}</div>
        <div className="store-item-desc">{it.desc}</div>
        <span className={`store-item-state ${has ? 'is-owned' : 'is-none'}`}>{has ? '已拥有' : '未拥有'}</span>
        {/* 奖励为消耗品可重复购买；装扮/道具仅未拥有时可购买 */}
        {canBuy && (
          <div className="store-item-actions">
            <KidButton
              color={isReward ? (afford ? 'coral' : 'white') : afford ? 'mint' : 'white'}
              disabled={!afford}
              onClick={(e) => {
                e.stopPropagation();
                if (isReward) buyRewardItem(it);
                else buy(it);
              }}
            >
              <IconBean size={16} gradient="gold" /> {it.cost}
            </KidButton>
          </div>
        )}
      </div>
    );
  };

  const SHELVES: ItemKind[] = ['outfit', 'item', 'reward'];
  const SHELF_ICON: Record<ItemKind, string> = { outfit: '🎨', badge: '🎖️', item: '🛠️', reward: '🎁' };

  return (
    <div className="page store">
      <NpcBuddy npc="铛铛" />
      <PageHero
        eyebrow={lang === 'zh' ? '补给站 · 兑换好物' : 'Supply · Rewards'}
        title={lang === 'zh' ? '补给站' : 'Supply Station'}
        planet="grocery"
        stats={[
          { icon: <IconBean size={16} gradient="gold" />, value: points, tone: 'gold', label: lang === 'zh' ? '卷卷豆' : 'Beans' },
        ]}
      />

      {msg && <p className="saved-tip">{msg}</p>}

      {/* 货架 */}
      {SHELVES.map((kind) => (
        <section className="module" key={kind}>
          <h3 className="module-title">{SHELF_ICON[kind]} {KIND_LABEL[kind]}</h3>
          <div className="store-grid">
            {(kind === 'outfit'
              ? shelf(kind, stateNow.storeOverrides).filter((i) => i.acqType !== 'event')
              : shelf(kind, stateNow.storeOverrides)
            ).map((it) => renderCard(it))}
          </div>
          {kind === 'outfit' && (
            <p className="empty-tip small">装备的装扮会显示在角色身上，快去“我的”看看效果～</p>
          )}
        </section>
      ))}

      {/* 预览弹层：所有商品均可预览；装扮为试穿效果 */}
      {preview && (() => {
        const isOutfit = preview.kind === 'outfit';
        const tmpEquipped = { ...equipped };
        if (isOutfit) tmpEquipped.outfit = preview.id;
        const has = owned.includes(preview.id);
        const afford = points >= preview.cost;
        const isReward = preview.kind === 'reward';
        const canBuy = isReward || !has;
        return (
          <div className="preview-overlay" onClick={() => setPreview(null)}>
            <div className="preview-card" onClick={(e) => e.stopPropagation()}>
              <button className="preview-close" onClick={() => setPreview(null)}>✕</button>
              <div className="preview-figure">
                {isOutfit ? (
                  <WardrobeAvatar outfitId={tmpEquipped.outfit} className="wardrobe-avatar--store-modal" />
                ) : (
                  <span className="preview-figure-icon" aria-hidden="true">{preview.icon}</span>
                )}
              </div>
              <div className="preview-name">{preview.icon ? `${preview.icon} ` : ''}{preview.name}</div>
              <div className="preview-desc">{preview.desc}</div>
              <div className="preview-actions">
                <KidButton color="white" onClick={() => setPreview(null)}>再看看</KidButton>
                {canBuy ? (
                  <KidButton color="green" disabled={!afford} onClick={() => { const ok = isReward ? buyRewardItem(preview) : buy(preview); if (ok) setPreview(null); }}><IconBean size={16} gradient="gold" /> {preview.cost} 兑换</KidButton>
                ) : (
                  <KidButton color="white" disabled>✓ 已拥有</KidButton>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
