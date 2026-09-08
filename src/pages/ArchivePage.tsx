import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useI18n } from '../i18n';
import { EMPTY } from '../features';
import { playSfx, speak } from '../speech';
import { KidButton } from '../components/ui';
import PageHero from '../components/PageHero';
import NpcBuddy from '../components/NpcBuddy';
import { STAR_CARDS, CARD_RARITY_LABEL } from '../content/starCards';

/** 星核档案库：图鉴卡收集（远征战利品碎片合成），遇见晶晶 */
export default function ArchivePage() {
  const nav = useNavigate();
  const { lang, t } = useI18n();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const materials = useStore((s) => (s.activeChildId ? s.materials[s.activeChildId] : undefined));
  const archivedCards = useStore((s) => (s.activeChildId ? s.archivedCards[s.activeChildId] ?? EMPTY : EMPTY));
  const craftCard = useStore((s) => s.craftCard);
  const [shake, setShake] = useState(false);

  // 进入档案库欢迎语
  useEffect(() => {
    if (child) speak(t('welcomeArchive'), lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child?.id]);

  if (!child) return null;
  const zh = lang !== 'en';

  const shards = materials?.cardShard ?? 0;
  const txt = (x: { zh: string; en: string }) => (zh ? x.zh : x.en);
  const collected = archivedCards.length;

  // 图鉴卡槽（不足 12 用空槽补齐；已合成的点亮）
  const slots = STAR_CARDS.map((c) => ({ card: c, owned: archivedCards.includes(c.id) }));

  const onCraft = (id: string, cost: number) => {
    if (craftCard(child.id, id, cost)) {
      playSfx('collect');
      setShake((v) => !v);
    } else {
      playSfx('deny');
    }
  };

  return (
    <div className="page archive-page">
      <PageHero
        eyebrow={zh ? `星核档案库 · 点亮 ${collected}/${slots.length} 张图鉴` : `Star Archive · ${collected}/${slots.length} cards lit`}
        title={zh ? '星核档案库' : 'Star Archive'}
        planet="hut"
        showAvatar={false}
        stats={[
          { icon: '🎴', value: shards, tone: 'coral', label: zh ? '图鉴碎片' : 'Card Shards' },
        ]}
      />

      <section className="archive-hall">
        <div className="archive-glow" aria-hidden="true" />
        <div className="archive-shelf" aria-hidden="true">
          <span className="arch-book b1">📕</span>
          <span className="arch-book b2">📗</span>
          <span className="arch-book b3">📘</span>
          <span className="arch-book b4">📙</span>
          <span className="arch-book b5">📔</span>
        </div>
        <p className="archive-caption">
          {zh
            ? `远征队带回了图鉴碎片（现有 ${shards}），凑够就能点亮一张图鉴卡！`
            : `Expeditions bring card shards (${shards}). Gather enough to light a card!`}
        </p>

        {/* 图鉴卡墙：已合成点亮，图标展示；未合成显示所需碎片 */}
        <div className="archive-cards">
          {slots.map(({ card, owned }) => (
            <div key={card.id} className={`arch-slot${owned ? ' on' : ''}${shake ? ' shake' : ''} r-${card.rarity}`}>
              {owned ? (
                <span className="arch-card">{card.icon}<small>{txt(card.name)}</small></span>
              ) : (
                <span className="arch-lock">🔒<small>{card.shardCost} 片</small></span>
              )}
            </div>
          ))}
        </div>

        {/* 待合成列表（未拥有的卡，碎片足够可一键合成） */}
        <div className="archive-craft">
          {slots.filter((s) => !s.owned).map(({ card }) => {
            const ready = shards >= card.shardCost;
            return (
              <div key={card.id} className={`arch-craft-item${ready ? ' ready' : ''}`}>
                <span className="arch-craft-icon">{card.icon}</span>
                <span className="arch-craft-info">
                  <b>{card.icon} {txt(card.name)}</b>
                  <small>{CARD_RARITY_LABEL[card.rarity][lang]} · {txt(card.desc)}</small>
                </span>
                <KidButton color={ready ? 'green' : 'white'} onClick={() => onCraft(card.id, card.shardCost)}>
                  {ready ? `合成 · ${card.shardCost}片` : `${shards}/${card.shardCost}`}
                </KidButton>
              </div>
            );
          })}
        </div>

        <div className="archive-actions">
          <KidButton color="white" onClick={() => nav('/store')}>
            {zh ? '去补给站换卡' : 'Get cards at Supply'}
          </KidButton>
        </div>
      </section>

      {/* 晶晶档案管理员（剧情触发） */}
      <NpcBuddy npc="晶晶" storyNodeIds={['c4-1']} />
    </div>
  );
}
