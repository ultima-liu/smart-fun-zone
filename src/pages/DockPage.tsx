import { useEffect } from 'react';
import { useI18n } from '../i18n';
import { useStore } from '../store';
import { KidButton } from '../components/ui';
import PageHero from '../components/PageHero';
import { shipConfig, shipBoost, SHIP_MAX_LEVEL } from '../content/shipyard';
import { speak } from '../speech';

/** 船坞：飞船升级，消耗远方征来的星屑+卷星币；升级提升远征产出 */
export default function DockPage() {
  const { lang, t } = useI18n();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const shipLevel = useStore((s) => (s.activeChildId ? s.shipLevel[s.activeChildId] ?? 1 : 1));
  const materials = useStore((s) => (s.activeChildId ? s.materials[s.activeChildId] : undefined));
  const points = useStore((s) => (s.activeChildId ? s.points[s.activeChildId] ?? 0 : 0));
  const upgradeShip = useStore((s) => s.upgradeShip);

  useEffect(() => {
    if (child) speak(t('welcomeDock'), lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child?.id]);

  if (!child) return null;
  const zh = lang !== 'en';

  const cfg = shipConfig(shipLevel + 1); // 下一级成本
  const boost = shipBoost(shipLevel);
  const maxed = shipLevel >= SHIP_MAX_LEVEL;
  const stardust = materials?.stardust ?? 0;
  const canUp = !maxed && stardust >= cfg.stardust && points >= cfg.beans;

  const onUpgrade = () => {
    if (!maxed) {
      upgradeShip(child.id, cfg.stardust, cfg.beans);
    }
  };

  return (
    <div className="page dock-page">
      <PageHero
        eyebrow={zh ? '船坞 · 升级你的飞船' : 'Dock · Upgrade your ship'}
        title={zh ? '卷卷号飞船坞' : 'Juan Star Shipyard'}
        planet="academy"
        showAvatar={false}
        stats={[
          { icon: '✨', value: materials?.stardust ?? 0, tone: 'mint', label: zh ? '星屑' : 'Star Dust' },
          { icon: '🪙', value: points, tone: 'gold', label: zh ? '卷星币' : 'Coins' },
        ]}
      />

      <section className="dock-card">
        {/* 飞船展示 */}
        <div className="dock-ship" aria-hidden="true">
          <span className="dock-ship-emoji">🚀</span>
          <span className="dock-ship-name">{shipConfig(shipLevel).name[lang]}</span>
        </div>

        {/* 等级 + 加成 */}
        <div className="dock-stats">
          <span className="dock-stat">
            <b>Lv.{shipLevel}</b>
            <small>{zh ? `远征产出 +${Math.round((boost - 1) * 100)}%` : `Output +${Math.round((boost - 1) * 100)}%`}</small>
          </span>
        </div>

        {/* 升级材料 */}
        <div className="dock-mats">
          <span className={`dock-mat${stardust >= cfg.stardust ? ' ok' : ''}`}>✨ 星屑 {stardust} / {cfg.stardust}</span>
          <span className={`dock-mat${points >= cfg.beans ? ' ok' : ''}`}>🪙 卷星币 {points} / {cfg.beans}</span>
        </div>

        {/* 升级按钮 */}
        {maxed ? (
          <KidButton color="yellow" disabled>
            {zh ? '🌟 已满级' : '🌟 MAX'}
          </KidButton>
        ) : (
          <KidButton color="green" disabled={!canUp} onClick={onUpgrade}>
            {zh ? `🚀 升级到 Lv.${shipLevel + 1}` : `🚀 Upgrade to Lv.${shipLevel + 1}`}
          </KidButton>
        )}

        <p className="dock-desc">
          {zh
            ? '每次升级都会放大下一次远征的卷星币与星屑产出，快去收集远征战利品吧！'
            : 'Each upgrade boosts your next expedition. Collect expedition loot to level up!'}
        </p>
      </section>
    </div>
  );
}
