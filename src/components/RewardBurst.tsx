import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n';
import type { LootDrop } from '../content/expedition';
import { cardById } from '../content/starCards';

interface Props { reward?: number; rewardCardId?: string; drop?: LootDrop; onDone: () => void }

/** 领取奖励庆祝：星星+金币爆开 + 金色横幅，约 1.4s 后自动关闭 */
export default function RewardBurst({ drop, reward = 0, rewardCardId, onDone }: Props) {
  const { lang } = useI18n();
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setGone(true), 1300);
    const t2 = window.setTimeout(onDone, 1450);
    return () => { window.clearTimeout(t); window.clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parts = ['⭐', '✨', '🌟', '🪙', '⭐', '💛', '✨', '🌟'];
  const items: { icon: string; label: string; n: number }[] = [
    { icon: '🪙', label: '卷星币', n: drop?.beans ?? (drop ? 0 : reward) },
    { icon: '✨', label: '星屑', n: drop?.stardust ?? 0 },
    { icon: '💠', label: '星尘', n: drop?.cardShard ?? 0 },
  ].filter((x) => x.n > 0);
  const hasDrop = !!drop;
  const rewardCard = rewardCardId ? cardById(rewardCardId) : undefined;
  return createPortal(
    <div className={`reward-burst${gone ? ' gone' : ''}`} aria-hidden="true">
      {/* 粒子 */}
      <div className="rb-parts">
        {parts.map((p, i) => (
          <i key={i} style={{ '--i': i } as React.CSSProperties}>{p}</i>
        ))}
      </div>
      {/* 中央横幅 */}
      <div className="rb-banner">
        <b>{hasDrop ? (lang === 'zh' ? '🎉 远征补给已收取！' : '🎉 Expedition loot received!') : (lang === 'zh' ? '🎉 奖励已领取！' : '🎉 Reward claimed!')}</b>
        <span className="rb-loot">
          {items.map((it) => (
            <em key={it.label}>{it.icon} +{it.n} {it.label}</em>
          ))}
          {drop && drop.outfits.length > 0 && <em>🎩 稀有装扮 ×{drop.outfits.length}</em>}
          {rewardCard && <em>🎴 {lang === 'zh' ? `图鉴卡「${rewardCard.name.zh}」` : rewardCard.name.en}</em>}
        </span>
      </div>
    </div>,
    document.body,
  );
}
