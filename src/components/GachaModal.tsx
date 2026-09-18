import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store';
import { useI18n } from '../i18n';
import { cardById, DRAW_COST, type DrawResult, type StarCard } from '../content/starCards';
import CardPortrait from './CardPortrait';
import { KidButton } from './ui';
import { sfx } from '../sfx';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function GachaModal({ open, onClose }: Props) {
  const { lang } = useI18n();
  const childId = useStore((s) => s.activeChildId);
  const beans = useStore((s) => (childId ? s.points[childId] ?? 0 : 0));
  const draw = useStore((s) => s.drawCards);
  const [result, setResult] = useState<DrawResult | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'casting' | 'reveal'>('idle');
  // 蓄力强度 0~3：震动与旋转逐级加强
  const [castTick, setCastTick] = useState(0);
  const [burst, setBurst] = useState(false);
  const zh = lang !== 'en';
  const prevOpen = useRef(false);

  useEffect(() => {
    if (open && !prevOpen.current) {
      sfx.open();
    }
    prevOpen.current = open;
    if (!open) {
      setResult(null);
      setRevealed(0);
      setPhase('idle');
      setCastTick(0);
      setBurst(false);
    }
  }, [open]);

  const revealedCards = useMemo(() => {
    return (result?.ids ?? []).map((id) => cardById(id)).filter(Boolean) as StarCard[];
  }, [result]);

  const startDraw = (count: number) => {
    if (!childId) return;
    const cost = count === 10 ? DRAW_COST.ten : DRAW_COST.single;
    if (beans < cost) return;
    setPhase('casting');
    setResult(null);
    setRevealed(0);
    setCastTick(0);
    setBurst(false);
    // 蓄力阶段：震动越来越强 → 极限 → 爆开 → 卡牌显现
    window.setTimeout(() => { setCastTick(1); sfx.charge(1); }, 560);
    window.setTimeout(() => { setCastTick(2); sfx.charge(2); }, 1100);
    window.setTimeout(() => { setCastTick(3); sfx.charge(3); }, 1580);
    window.setTimeout(() => { setBurst(true); sfx.burst(); }, 2100);
    window.setTimeout(() => {
      const res = draw(childId, count);
      setResult(res);
      setPhase('reveal');
      const cards = res.ids.map((id) => cardById(id)).filter(Boolean) as StarCard[];
      setRevealed(1);
      if (cards[0]) sfx.reveal(cards[0].rarity);
      if (cards.length > 1) {
        cards.slice(1).forEach((c, idx) => {
          const i = idx + 1;
          window.setTimeout(() => {
            setRevealed((n) => n + 1);
            sfx.reveal(c.rarity);
          }, i * 560);
        });
      }
    }, 2500);
  };

  if (!open) return null;

  const castMsg = burst
    ? (zh ? '星门爆发！' : 'The gate bursts!')
    : castTick === 0
      ? (zh ? '卷卷豆能量汇聚…' : 'Gathering bean energy…')
      : castTick === 1
        ? (zh ? '法阵震颤…' : 'The circle trembles…')
        : castTick === 2
          ? (zh ? '能量突破临界…' : 'Energy surges…')
          : (zh ? '到达极限！！' : 'MAXIMUM!!');

  return createPortal(
    <div className="gacha-modal" role="dialog" aria-modal="true">
      <div className="gacha-backdrop" onClick={phase === 'idle' ? onClose : undefined} />
      <SummonScene casting={phase === 'casting'} tick={castTick} burst={burst} done={phase === 'reveal'} />
      <div className="gacha-stage">
        {phase === 'idle' && (
          <div className="gacha-intro">
            <h2>{zh ? '卷卷豆召唤' : 'Bean Summon'}</h2>
            <p className="gacha-shard-count">
              <span className="gs-icon">🫘</span>
              {zh ? `当前卷卷豆：${beans}` : `Beans: ${beans}`}
            </p>
            <div className="gacha-buttons">
              <button className="gacha-btn single" onClick={() => startDraw(1)} disabled={beans < DRAW_COST.single}>
                <b>{zh ? '召唤 ×1' : 'Summon ×1'}</b>
                <small>🫘 {DRAW_COST.single}</small>
              </button>
              <button className="gacha-btn ten" onClick={() => startDraw(10)} disabled={beans < DRAW_COST.ten}>
                <b>{zh ? '召唤 ×10' : 'Summon ×10'}</b>
                <small>🫘 {DRAW_COST.ten}</small>
              </button>
            </div>
            {beans < DRAW_COST.single && (
              <p className="gacha-hint">{zh ? '卷卷豆不足，完成课程和任务来获取吧！' : 'Not enough beans. Complete lessons and quests!'}</p>
            )}
            <KidButton color="purple" onClick={() => { sfx.click(); onClose(); }}>{zh ? '关闭' : 'Close'}</KidButton>
          </div>
        )}

        {phase === 'casting' && (
          <div className="gacha-casting-text">
            <p>{castMsg}</p>
          </div>
        )}

        {phase === 'reveal' && result && (
          <div className="gacha-reveal">
            {revealedCards.length === 1 ? (
              <div className={`gacha-reveal-center${revealed >= 1 ? ' show' : ''}`}>
                <SingleReveal card={revealedCards[0]} isNew={result.newCards.includes(revealedCards[0].id)} zh={zh} />
              </div>
            ) : (
              <div className="gacha-reveal-grid">
                {revealedCards.map((c, i) => {
                  const shown = i < revealed;
                  return (
                    <div key={`${c.id}-${i}`} className={`gr-card-wrap${shown ? ' shown' : ''}`}>
                      <div className="gr-card-flipper">
                        <div className="gr-card-front">
                          <CardPortrait card={c} size={165} />
                        </div>
                        <div className="gr-card-back" />
                      </div>
                      {shown && (
                        <div className={`gr-card-tag ${result.newCards.includes(c.id) ? 'new' : 'dup'}`}>
                          {result.newCards.includes(c.id) ? (zh ? '新' : 'NEW') : (zh ? '重复' : 'DUPE')}
                        </div>
                      )}
                      <ConfettiBurst count={12} />
                    </div>
                  );
                })}
              </div>
            )}

            {result.duplicateCount > 0 && (
              <p className="gacha-dup">{zh ? `本次获得 ${result.duplicateCount} 张重复卡` : `${result.duplicateCount} duplicate card(s) this draw`}</p>
            )}

            {revealed >= revealedCards.length && (
              <div className="gacha-reveal-actions">
                <KidButton color="yellow" onClick={() => { sfx.click(); setPhase('idle'); }}>{zh ? '再召唤一次' : 'Summon Again'}</KidButton>
                <KidButton color="purple" onClick={() => { sfx.click(); onClose(); }}>{zh ? '关闭' : 'Close'}</KidButton>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function SingleReveal({ card, isNew, zh }: { card: StarCard; isNew: boolean; zh: boolean }) {
  return (
    <div className="single-reveal">
      <ConfettiBurst count={22} />
      <div className="single-reveal-card">
        <CardPortrait card={card} size={220} />
      </div>
      <div className={`single-reveal-tag ${isNew ? 'new' : 'dup'}`}>{isNew ? (zh ? '新' : 'NEW') : (zh ? '重复' : 'DUPE')}</div>
      <div className="single-reveal-name">{zh ? card.name.zh : card.name.en}</div>
    </div>
  );
}

const CONFETTI_COLORS = ['#ffd166', '#ff9ac2', '#7df9ff', '#c4b5fd', '#a8ffb5', '#fff3b0', '#ff8fa3'];

function ConfettiBurst({ count }: { count: number }) {
  const items = [];
  for (let j = 0; j < count; j++) {
    const ang = (j * (360 / count) * Math.PI) / 180;
    const r = 52 + ((j * 37) % 46);
    const dx = Math.round(Math.cos(ang) * r * 10) / 10;
    const dy = Math.round(Math.sin(ang) * r * 10) / 10;
    const shape = j % 3;
    const color = CONFETTI_COLORS[j % CONFETTI_COLORS.length];
    const style = {
      '--j': j,
      '--dx': `${dx}px`,
      '--dy': `${dy}px`,
      '--rot': `${(j * 137) % 180}deg`,
      background: color,
      color,
      ...(shape === 1 ? { borderRadius: '50%' } : shape === 2 ? { borderRadius: '2px' } : { borderRadius: '1px' }),
    } as React.CSSProperties;
    items.push(<i key={j} style={style} />);
  }
  return (
    <span className="reveal-confetti" aria-hidden="true">
      {items}
    </span>
  );
}

function SummonScene({ casting, tick, burst, done }: { casting: boolean; tick: number; burst: boolean; done: boolean }) {
  const cls = ['summon-scene'];
  if (casting) cls.push('casting');
  if (casting && tick >= 1) cls.push('s1');
  if (casting && tick >= 2) cls.push('s2');
  if (casting && tick >= 3) cls.push('s3');
  if (burst) cls.push('burst');
  if (done) cls.push('done');
  return (
    <div className={cls.join(' ')} aria-hidden="true">
      {/* 星空背景 */}
      <div className="summon-stars">
        {[...Array(60)].map((_, i) => (
          <i key={i} style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>

      {/* 远景星云 */}
      <div className="summon-nebula" />

      {/* 暗角 vignette */}
      <div className="summon-vignette" />

      {/* 召唤法阵 SVG */}
      <svg className="summon-circle" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="sc-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#a48bfa" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8b7bf0" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sc-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff5cc" />
            <stop offset="40%" stopColor="#c4b5fd" />
            <stop offset="70%" stopColor="#8b7bf0" />
            <stop offset="100%" stopColor="#ff9ac2" />
          </linearGradient>
          <filter id="sc-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* 外环符文环 */}
        <g className="summon-ring outer">
          <circle cx="200" cy="200" r="178" fill="none" stroke="url(#sc-ring)" strokeWidth="1.5" strokeOpacity="0.45" />
          <circle cx="200" cy="200" r="160" fill="none" stroke="url(#sc-ring)" strokeWidth="2.5" strokeOpacity="0.7" />
          {[...Array(16)].map((_, i) => {
            const a = (i * 22.5 * Math.PI) / 180;
            return <polygon key={i} points="0,-9 7,5 -7,5" fill="#fff5cc" opacity="0.75" transform={`translate(${200 + Math.cos(a) * 160}, ${200 + Math.sin(a) * 160}) rotate(${i * 22.5 + 90})`} />;
          })}
        </g>

        {/* 中环 */}
        <g className="summon-ring middle">
          <circle cx="200" cy="200" r="126" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeOpacity="0.5" strokeDasharray="16 10" />
          <circle cx="200" cy="200" r="110" fill="none" stroke="#8b7bf0" strokeWidth="4" strokeOpacity="0.65" strokeDasharray="12 8" />
          {[...Array(12)].map((_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            return <rect key={i} x={-6} y={-6} width="12" height="12" rx="2" fill="#ff9ac2" opacity="0.75" transform={`translate(${200 + Math.cos(a) * 110}, ${200 + Math.sin(a) * 110}) rotate(${i * 30})`} />;
          })}
        </g>

        {/* 内环 */}
        <g className="summon-ring inner">
          <circle cx="200" cy="200" r="72" fill="none" stroke="#f6c24a" strokeWidth="3" strokeOpacity="0.75" />
          <circle cx="200" cy="200" r="58" fill="none" stroke="#fff" strokeWidth="2" strokeOpacity="0.55" />
          <circle cx="200" cy="200" r="44" fill="none" stroke="#8b7bf0" strokeWidth="1.5" strokeOpacity="0.6" strokeDasharray="4 4" />
          <polygon points="200,142 242,228 158,228" fill="url(#sc-glow)" opacity="0.5" />
          <polygon points="200,156 230,222 170,222" fill="#fff" opacity="0.12" />
        </g>
      </svg>

      {/* 中央能量球 */}
      <div className="summon-core" />
      <div className="summon-core-glow" />

      {/* 中央光柱 */}
      <div className="summon-pillar" />
      <div className="summon-pillar-core" />

      {/* 天降光束 */}
      <div className="summon-beams">
        {[...Array(7)].map((_, i) => (
          <i key={i} style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>

      {/* 冲击波环 */}
      <div className="summon-shockwaves">
        {[...Array(4)].map((_, i) => (
          <i key={i} style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>

      {/* 地面平台 */}
      <div className="summon-platform" />

      {/* 火花溅射 */}
      <div className="summon-sparks">
        {[...Array(36)].map((_, i) => (
          <i key={i} style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>

      {/* 漂浮粒子 */}
      <div className="summon-particles">
        {[...Array(40)].map((_, i) => (
          <i key={i} style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>

      {/* 爆开白闪 */}
      <div className="summon-flash" />
      {/* 爆开大冲击波 */}
      <div className="summon-burst-ring" />
    </div>
  );
}
