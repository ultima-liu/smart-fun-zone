import BackButton from '../components/BackButton';
import { useNavigate } from 'react-router-dom';
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
import { cardThemeClass, cardThemeStyle } from '../components/cardThemes';
import { sfx } from '../sfx';
import { JourneyCollectionHero, JourneyLoreDetails } from '../components/JourneyCollection';
import './journey-cards.css';
import { HuluCollectionHero, HuluLoreDetails } from '../components/HuluCollection';
import './hulu-cards.css';
import './archive-card-state.css';
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
  const nav = useNavigate();
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

  }, [child?.id]);

  const setCards = useMemo(() => (activeSet === 'all' ? STAR_CARDS : cardsBySet(activeSet)), [activeSet]);
  const displayCards = useMemo(() => {
    if (activeRarity === 'all') return setCards;
    return setCards.filter((c) => c.rarity === activeRarity);
  }, [setCards, activeRarity]);

  if (!child) return <ArchiveGuestPreview zh={zh} />;

  const totalOwned = owned.length;
  const totalCards = STAR_CARDS.length;

  const handleClaim = (setId: CardSetId) => {
    if (!childId) return;
    const ok = claimReward(childId, setId);
    if (ok) speak(zh ? '套系集齐奖励已领取！' : 'Set collection reward claimed!', lang);
  };

  return (
    <div className={`page archive-page${activeSet === 'journey' ? ' journey-active' : activeSet === 'hulu' ? ' hulu-active' : ' reframed-active'}`}>
      {activeSet === 'journey' ? <JourneyCollectionHero leading={<BackButton onClick={() => nav('/')} label={zh ? '返回' : 'Back'} aria-label={zh ? '返回首页' : 'Back to home'} />} zh={zh} have={setProgress(owned, 'journey').have} /> : activeSet === 'hulu' ? <HuluCollectionHero leading={<BackButton onClick={() => nav('/')} label={zh ? '返回' : 'Back'} aria-label={zh ? '返回首页' : 'Back to home'} />} zh={zh} have={setProgress(owned, 'hulu').have} /> : (
        <PageHero leading={<BackButton onClick={() => nav('/')} label={zh ? '返回首页' : 'Back to home'} />} eyebrow={zh ? '星核档案库' : 'Star Archive'} title={zh ? '欢迎来到档案库' : 'Welcome to the Archive'} planet="academy" />
      )}

      {/* 召唤面板 */}
      <section className="summon-panel">
        <div className="summon-glow" />
        <div className="summon-info">
          <h3>{zh ? '卷星币召唤' : 'Coin Summon'}</h3>
          <p>
            {zh
              ? `消耗卷星币召唤图鉴卡。已收集 ${totalOwned}/${totalCards}`
              : `Spend coins to summon cards. Collected ${totalOwned}/${totalCards}`}
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
                  className={`ccard${lit ? ' lit' : ' unlit'} c-${c.rarity}${cardThemeClass(c.setId)}`}
                  style={{ ...cardThemeStyle(c.setId), '--rc': rarityColor(c.rarity), '--hulu-color': c.palette[0] } as React.CSSProperties}
                  onClick={() => { sfx.click(); setPreview(c); setPreviewFlipped(false); }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault(); sfx.click(); setPreview(c); setPreviewFlipped(false);
                    }
                  }}
                  title={zh ? c.name.zh : c.name.en}
                  aria-label={`${zh ? c.name.zh : c.name.en} · ${lit ? (zh ? '已解锁' : 'Unlocked') : (zh ? '未解锁' : 'Locked')}`}
                >
                  <div className="ccard-face ccard-front">
                    <CardPortrait card={c} size={172} />
                    <div className="ccard-titleplate">
                      <span className="ccard-name">{zh ? c.name.zh : c.name.en}</span>
                      <small>{zh ? CARD_SETS.find((set) => set.id === c.setId)?.name.zh : CARD_SETS.find((set) => set.id === c.setId)?.name.en}</small>
                    </div>
                    {!lit && <div className="ccard-veil" data-label={zh ? '未解锁' : 'Locked'} />}
                  </div>
                  <div className="ccard-face ccard-back">
                    <div className="ccard-back-inner" style={{ ...cardThemeStyle(c.setId), '--rc': rarityColor(c.rarity), '--hulu-color': c.palette[0] } as React.CSSProperties}>
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

      {activeSet !== 'journey' && activeSet !== 'hulu' && <NpcBuddy npc="晶晶" />}

      {gachaOpen && <GachaModal open={gachaOpen} onClose={() => setGachaOpen(false)} />}

      {preview &&
        createPortal(
          <div className={`card-preview-modal${preview.setId === 'journey' ? ' journey-preview' : preview.setId === 'hulu' ? ' hulu-preview' : ` themed-preview card-theme-${preview.setId}`}`} onClick={() => { sfx.click(); setPreview(null); }} style={cardThemeStyle(preview.setId)} role="dialog" aria-modal="true">
            <div className="card-preview-backdrop" />
            <div className="card-preview-content" onClick={(e) => e.stopPropagation()}>
              <button className="card-preview-close" onClick={() => { sfx.click(); setPreview(null); }} aria-label={zh ? '关闭' : 'close'}>×</button>
              <div
                className={`preview-card${previewFlipped ? ' flipped' : ''} c-${preview.rarity}${cardThemeClass(preview.setId)}${owned.includes(preview.id) ? ' lit' : ' unlit'}`}
                style={{ ...cardThemeStyle(preview.setId), '--rc': rarityColor(preview.rarity), '--hulu-color': preview.palette[0] } as React.CSSProperties}
              >
                <button
                  className="preview-card-flipbtn"
                  onClick={(e) => { e.stopPropagation(); sfx.click(); setPreviewFlipped((v) => !v); }}
                  aria-label={zh ? '翻转卡片' : 'flip card'}
                >↻</button>
                <div className="preview-card-face preview-card-front">
                  <CardPortrait card={preview} size={260} />
                </div>
                <div className="preview-card-face preview-card-back" style={{ ...cardThemeStyle(preview.setId), '--rc': rarityColor(preview.rarity), '--hulu-color': preview.palette[0] } as React.CSSProperties}>
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
              <div className="card-preview-info" style={{ ...cardThemeStyle(preview.setId), '--rc': rarityColor(preview.rarity), '--hulu-color': preview.palette[0] } as React.CSSProperties}>
                <h3>{zh ? preview.name.zh : preview.name.en}</h3>
                <span className="cpr-rarity">{preview.rarity}</span>
                {preview.hanzi ? <HanziLesson card={preview} zh={zh} /> : (
                  <>
                    <p className="cpr-quote">{zh ? preview.quote.zh : preview.quote.en}</p>
                    <p className="cpr-desc">{zh ? preview.desc.zh : preview.desc.en}</p>
                  </>
                )}
                <JourneyLoreDetails card={preview} zh={zh} />
                <HuluLoreDetails card={preview} zh={zh} />
                {!owned.includes(preview.id) && <span className="cpr-locked">{zh ? '尚未解锁' : 'Locked'}</span>}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/** 未登录时也保留图鉴入口，避免新套系在空白页中不可见。 */
function ArchiveGuestPreview({ zh }: { zh: boolean }) {
  const nav = useNavigate();
  const [activeSet, setActiveSet] = useState<CardSetId | 'all'>('all');
  const cards = activeSet === 'all' ? STAR_CARDS : cardsBySet(activeSet);
  return (
    <div className={`page archive-page archive-guest-preview${activeSet === 'journey' ? ' journey-active' : activeSet === 'hulu' ? ' hulu-active' : ' reframed-active'}`}>
      {activeSet === 'journey' ? <JourneyCollectionHero leading={<BackButton onClick={() => nav('/')} label={zh ? '返回' : 'Back'} aria-label={zh ? '返回首页' : 'Back to home'} />} zh={zh} /> : activeSet === 'hulu' ? <HuluCollectionHero leading={<BackButton onClick={() => nav('/')} label={zh ? '返回' : 'Back'} aria-label={zh ? '返回首页' : 'Back to home'} />} zh={zh} /> : (
        <PageHero leading={<BackButton onClick={() => nav('/')} label={zh ? '返回首页' : 'Back to home'} />} eyebrow={zh ? '星核档案库' : 'Star Archive'} title={zh ? '图鉴预览' : 'Card Preview'} planet="academy" />
      )}
      <section className="summon-panel">
        <div className="summon-glow" />
        <div className="summon-info">
          <h3>{zh ? '先看看伙伴们吧' : 'Meet the collection'}</h3>
          <p>{zh ? `档案库共有 ${STAR_CARDS.length} 张卡牌。登录孩子档案后即可召唤、点亮和领取套系奖励。` : `The Archive has ${STAR_CARDS.length} cards. Sign in to summon, unlock and claim set rewards.`}</p>
        </div>
      </section>
      <section className="filter-panels" aria-label={zh ? '套系预览' : 'Set preview'}>
        <div className="filter-tier">
          <span className="filter-label">{zh ? '套系' : 'Series'}</span>
          <div className="filter-row">
            <button className={`filter-chip${activeSet === 'all' ? ' active' : ''}`} onClick={() => setActiveSet('all')}>{zh ? '全部' : 'All'}</button>
            {CARD_SETS.map((set) => (
              <button className={`filter-chip${activeSet === set.id ? ' active' : ''}`} key={set.id} onClick={() => setActiveSet(set.id)} aria-pressed={activeSet === set.id}>
                <span className="fc-icon">{set.icon}</span>
                <b>{zh ? set.name.zh : set.name.en}</b>
                <small>0/{cardsBySet(set.id).length}</small>
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="gallery-shelf">
        <div className="rarity-cards">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`ccard unlit c-${card.rarity}${cardThemeClass(card.setId)}`}
              style={{ ...cardThemeStyle(card.setId), '--rc': rarityColor(card.rarity), '--hulu-color': card.palette[0] } as React.CSSProperties}
              title={zh ? card.name.zh : card.name.en}
            >
              <div className="ccard-face ccard-front">
                <CardPortrait card={card} size={172} />
                <div className="ccard-titleplate">
                  <span className="ccard-name">{zh ? card.name.zh : card.name.en}</span>
                  <small>{zh ? CARD_SETS.find((set) => set.id === card.setId)?.name.zh : CARD_SETS.find((set) => set.id === card.setId)?.name.en}</small>
                </div>
                <div className="ccard-veil" data-label={zh ? '未解锁' : 'Locked'} />
              </div>
            </div>
          ))}
        </div>
      </section>
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
