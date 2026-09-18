import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store';
import { useI18n } from '../i18n';
import { speak, speakAsNpc } from '../speech';
import { npcMeta } from '../content/npc';
import { KidButton } from '../components/ui';
import PageHero from '../components/PageHero';
import NpcBuddy from '../components/NpcBuddy';
import GachaModal from '../components/GachaModal';
import CardPortrait from '../components/CardPortrait';
import { sfx } from '../sfx';
import {
  CARD_SETS,
  STAR_CARDS,
  RARITY_ORDER,
  cardsBySet,
  setProgress,
  type CardRarity,
  type CardSetId,
  type StarCard,
} from '../content/starCards';

/** 星核档案库：抽卡 + 可翻转/放大图鉴墙 */
export default function ArchivePage() {
  const { lang, t } = useI18n();
  const profiles = useStore((s) => s.profiles);
  const activeChildId = useStore((s) => s.activeChildId);
  const archivedCards = useStore((s) => s.archivedCards);
  const cardRewardClaimed = useStore((s) => s.cardRewardClaimed);
  const child = useMemo(() => profiles.find((p) => p.id === activeChildId), [profiles, activeChildId]);
  const childId = child?.id ?? null;
  const myCards = childId ? archivedCards[childId] ?? [] : [];
  // 图鉴只反映真实获得记录；尤其卷星人卡牌不再使用开发预览的默认点亮状态。
  const owned = myCards;
  const claimed = childId ? cardRewardClaimed[childId] ?? [] : [];
  const claimReward = useStore((s) => s.claimCardReward);
  const [activeSet, setActiveSet] = useState<CardSetId | 'all'>('all');
  const [activeRarity, setActiveRarity] = useState<CardRarity | 'all'>('all');
  const [gachaOpen, setGachaOpen] = useState(false);
  const [preview, setPreview] = useState<StarCard | null>(null);
  const [previewFlipped, setPreviewFlipped] = useState(false);
  const zh = lang !== 'en';
  const spokenFor = useRef<string | null>(null);

  useEffect(() => {
    if (child && spokenFor.current !== child.id) {
      spokenFor.current = child.id;
      speakAsNpc(t('welcomeArchive'), npcMeta('晶晶'), lang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child?.id]);

  if (!child) return null;

  const setCards = useMemo(() => (activeSet === 'all' ? STAR_CARDS : cardsBySet(activeSet)), [activeSet]);
  const displayCards = useMemo(() => {
    if (activeRarity === 'all') return setCards;
    return setCards.filter((c) => c.rarity === activeRarity);
  }, [setCards, activeRarity]);

  const totalOwned = owned.length;
  const totalCards = STAR_CARDS.length;

  const handleClaim = (setId: CardSetId) => {
    if (!childId) return;
    const ok = claimReward(childId, setId);
    if (ok) speak(zh ? '套系集齐奖励已领取！' : 'Set collection reward claimed!', lang);
  };

  return (
    <div className="page archive-page">
      <PageHero
        eyebrow={zh ? '星核档案库' : 'Star Archive'}
        title={zh ? '欢迎来到档案库' : 'Welcome to the Archive'}
        planet="academy"
      />

      {/* 召唤面板 */}
      <section className="summon-panel">
        <div className="summon-glow" />
        <div className="summon-info">
          <h3>{zh ? '卷卷豆召唤' : 'Bean Summon'}</h3>
          <p>
            {zh
              ? `消耗卷卷豆召唤图鉴卡。已收集 ${totalOwned}/${totalCards}`
              : `Spend beans to summon cards. Collected ${totalOwned}/${totalCards}`}
          </p>
        </div>
        <div className="summon-actions">
          <KidButton color="purple" onClick={() => setGachaOpen(true)}>
            {zh ? '✨ 开始召唤' : '✨ Summon'}
          </KidButton>
        </div>
      </section>

      {/* 双层筛选：第一层套系 / 第二层稀有度 */}
      <section className="filter-panels" role="tablist" aria-label={zh ? '卡牌筛选' : 'Card filters'}>
        <div className="filter-tier">
          <span className="filter-label">{zh ? '套系' : 'Series'}</span>
          <div className="filter-row">
            <button
              className={`filter-chip${activeSet === 'all' ? ' active' : ''}`}
              onClick={() => { setActiveSet('all'); setActiveRarity('all'); }}
              role="tab"
              aria-selected={activeSet === 'all'}
            >
              <span className="fc-icon">📚</span>
              <b>{zh ? '全部' : 'All'}</b>
              <small>{totalOwned}/{totalCards}</small>
            </button>
            {CARD_SETS.map((set) => {
              const p = setProgress(owned, set.id);
              const active = activeSet === set.id;
              return (
                <button
                  key={set.id}
                  className={`filter-chip${active ? ' active' : ''}`}
                  onClick={() => { setActiveSet(set.id); setActiveRarity('all'); }}
                  role="tab"
                  aria-selected={active}
                  style={active ? ({ '--set-color': set.color } as React.CSSProperties) : undefined}
                >
                  <span className="fc-icon">{set.icon}</span>
                  <b>{zh ? set.name.zh : set.name.en}</b>
                  <small>{p.have}/{p.total}</small>
                </button>
              );
            })}
          </div>
        </div>

        <div className="filter-tier">
          <span className="filter-label">{zh ? '稀有度' : 'Rarity'}</span>
          <div className="filter-row">
            <button
              className={`filter-chip rarity-chip${activeRarity === 'all' ? ' active' : ''}`}
              onClick={() => setActiveRarity('all')}
              role="tab"
              aria-selected={activeRarity === 'all'}
            >
              <span className="fc-dot all-dot" />
              <b>{zh ? '全部' : 'All'}</b>
              <small>
                {setCards.filter((c) => owned.includes(c.id)).length}/{setCards.length}
              </small>
            </button>
            {RARITY_ORDER.map((rarity) => {
              const have = setCards.filter((c) => c.rarity === rarity && owned.includes(c.id)).length;
              const total = setCards.filter((c) => c.rarity === rarity).length;
              if (total === 0) return null;
              const active = activeRarity === rarity;
              return (
                <button
                  key={rarity}
                  className={`filter-chip rarity-chip c-${rarity}${active ? ' active' : ''}`}
                  onClick={() => setActiveRarity(rarity)}
                  role="tab"
                  aria-selected={active}
                  style={{ '--rc': rarityColor(rarity) } as React.CSSProperties}
                >
                  <span className="fc-dot" />
                  <b>{rarity}</b>
                  <small>{have}/{total}</small>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 图鉴展示柜 */}
      <section className="gallery-shelf">
        {displayCards.length === 0 ? (
          <div className="gallery-empty">
            <p>{zh ? '没有符合条件的卡牌' : 'No cards match these filters.'}</p>
          </div>
        ) : (
          <div className="rarity-cards">
            {displayCards.map((c) => {
              const lit = owned.includes(c.id);
              return (
                <div
                  key={c.id}
                  className={`ccard${lit ? ' lit' : ' unlit'} c-${c.rarity}`}
                  style={{ '--rc': rarityColor(c.rarity) } as React.CSSProperties}
                  onClick={() => { sfx.click(); setPreview(c); setPreviewFlipped(false); }}
                  title={zh ? c.name.zh : c.name.en}
                >
                  <div className="ccard-face ccard-front">
                    <CardPortrait card={c} size={172} />
                    <div className="ccard-titleplate">
                      <span className="ccard-name">{zh ? c.name.zh : c.name.en}</span>
                      <small>{zh ? CARD_SETS.find((set) => set.id === c.setId)?.name.zh : CARD_SETS.find((set) => set.id === c.setId)?.name.en}</small>
                    </div>
                    {!lit && <div className="ccard-veil" />}
                  </div>
                  <div className="ccard-face ccard-back">
                    <div className="ccard-back-inner" style={{ '--rc': rarityColor(c.rarity) } as React.CSSProperties}>
                      <b className="ccard-back-rarity">{c.rarity}</b>
                      <h5>{zh ? c.name.zh : c.name.en}</h5>
                      {c.hanzi ? <HanziLesson card={c} zh={zh} compact /> : (
                        <>
                          <p className="ccard-quote">{zh ? c.quote.zh : c.quote.en}</p>
                          <p className="ccard-desc">{zh ? c.desc.zh : c.desc.en}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 套系集齐奖励 */}
      {activeSet !== 'all' && (
        <section className="set-reward">
          {(() => {
            const set = CARD_SETS.find((s) => s.id === activeSet)!;
            const p = setProgress(owned, set.id);
            const isClaimed = claimed.includes(set.id);
            const canClaim = p.have === p.total && !isClaimed;
            return (
              <div className={`sr-card${canClaim ? ' ready' : ''}${isClaimed ? ' claimed' : ''}`}>
                <span>{set.icon}</span>
                <div>
                  <b>{zh ? `${set.name.zh} · 集齐奖励` : `${set.name.en} · Complete Reward`}</b>
                  <small>
                    {isClaimed
                      ? (zh ? '已领取' : 'Claimed')
                      : `${p.have}/${p.total} · 🪙 +${set.rewardBeans}`}
                  </small>
                </div>
                <KidButton color={canClaim ? 'yellow' : 'white'} onClick={() => handleClaim(set.id)} disabled={!canClaim}>
                  {isClaimed ? (zh ? '已领' : 'Done') : canClaim ? (zh ? '领取' : 'Claim') : (zh ? '未集齐' : 'Locked')}
                </KidButton>
              </div>
            );
          })()}
        </section>
      )}

      <NpcBuddy npc="晶晶" storyNodeIds={['c4-1']} />

      {gachaOpen && <GachaModal open={gachaOpen} onClose={() => setGachaOpen(false)} />}

      {preview &&
        createPortal(
          <div className="card-preview-modal" onClick={() => { sfx.click(); setPreview(null); }} role="dialog" aria-modal="true">
            <div className="card-preview-backdrop" />
            <div className="card-preview-content" onClick={(e) => e.stopPropagation()}>
              <button className="card-preview-close" onClick={() => { sfx.click(); setPreview(null); }} aria-label={zh ? '关闭' : 'close'}>×</button>
              <div
                className={`preview-card${previewFlipped ? ' flipped' : ''} c-${preview.rarity}${owned.includes(preview.id) ? ' lit' : ' unlit'}`}
                style={{ '--rc': rarityColor(preview.rarity) } as React.CSSProperties}
              >
                <button
                  className="preview-card-flipbtn"
                  onClick={(e) => { e.stopPropagation(); sfx.click(); setPreviewFlipped((v) => !v); }}
                  aria-label={zh ? '翻转卡片' : 'flip card'}
                >↻</button>
                <div className="preview-card-face preview-card-front">
                  <CardPortrait card={preview} size={260} />
                </div>
                <div className="preview-card-face preview-card-back" style={{ '--rc': rarityColor(preview.rarity) } as React.CSSProperties}>
                  <b className="pcb-rarity">{preview.rarity}</b>
                  <h4>{zh ? preview.name.zh : preview.name.en}</h4>
                  {preview.hanzi ? <HanziLesson card={preview} zh={zh} /> : (
                    <>
                      <p className="pcb-quote">{zh ? preview.quote.zh : preview.quote.en}</p>
                      <p className="pcb-desc">{zh ? preview.desc.zh : preview.desc.en}</p>
                    </>
                  )}
                </div>
              </div>
              <div className="card-preview-info" style={{ '--rc': rarityColor(preview.rarity) } as React.CSSProperties}>
                <h3>{zh ? preview.name.zh : preview.name.en}</h3>
                <span className="cpr-rarity">{preview.rarity}</span>
                {preview.hanzi ? <HanziLesson card={preview} zh={zh} /> : (
                  <>
                    <p className="cpr-quote">{zh ? preview.quote.zh : preview.quote.en}</p>
                    <p className="cpr-desc">{zh ? preview.desc.zh : preview.desc.en}</p>
                  </>
                )}
                {!owned.includes(preview.id) && <span className="cpr-locked">{zh ? '尚未解锁' : 'Locked'}</span>}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function HanziLesson({ card, zh, compact = false }: { card: StarCard; zh: boolean; compact?: boolean }) {
  const h = card.hanzi!;
  return (
    <div className={`hanzi-card-lesson${compact ? ' compact' : ''}`}>
      <strong className="hanzi-card-pinyin">{h.pinyin}</strong>
      <div className="hanzi-card-facts">
        <span>{zh ? '部首' : 'Radical'}：{zh ? h.radical.zh : h.radical.en}</span>
        <span>{zh ? `${h.strokes}画` : `${h.strokes} strokes`}</span>
        <span>{zh ? h.structure.zh : h.structure.en}</span>
      </div>
      <p>{zh ? h.meaning.zh : h.meaning.en}</p>
      <div className="hanzi-card-words">
        {h.words.map((item) => (
          <span key={item.word}><b>{item.word}</b><small>{item.pinyin}</small></span>
        ))}
      </div>
      <p className="hanzi-writing-tip">✍ {zh ? '书写提示：' : 'Writing: '}{zh ? h.writingTip.zh : h.writingTip.en}</p>
    </div>
  );
}

function rarityColor(r: string): string {
  switch (r) {
    case 'R': return '#3bd89e';
    case 'SR': return '#4fb3e8';
    case 'SSR': return '#d9537e';
    case 'SP': return '#f6cd72';
    default: return '#8b7bf0';
  }
}
