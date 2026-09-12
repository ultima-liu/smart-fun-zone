import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { useStore } from '../store';
import { KidButton } from '../components/ui';
import PageHero from '../components/PageHero';
import { shipConfig, shipBoost, SHIP_MAX_LEVEL } from '../content/shipyard';
import { playSfx, speak } from '../speech';

type UpgradePhase = 'idle' | 'charging' | 'burst' | 'complete';

/** 船坞：飞船升级，消耗远方征来的星屑+卷星币；升级提升远征产出 */
export default function DockPage() {
  const { lang, t } = useI18n();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const shipLevel = useStore((s) => (s.activeChildId ? s.shipLevel[s.activeChildId] ?? 1 : 1));
  const materials = useStore((s) => (s.activeChildId ? s.materials[s.activeChildId] : undefined));
  const points = useStore((s) => (s.activeChildId ? s.points[s.activeChildId] ?? 0 : 0));
  const upgradeShip = useStore((s) => s.upgradeShip);
  const [upgradePhase, setUpgradePhase] = useState<UpgradePhase>('idle');
  const upgradeTimers = useRef<number[]>([]);

  useEffect(() => {
    if (child) speak(t('welcomeDock'), lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child?.id]);

  useEffect(() => () => upgradeTimers.current.forEach(window.clearTimeout), []);

  if (!child) return null;
  const zh = lang !== 'en';

  const cfg = shipConfig(shipLevel + 1); // 下一级成本
  const boost = shipBoost(shipLevel);
  const maxed = shipLevel >= SHIP_MAX_LEVEL;
  const stardust = materials?.stardust ?? 0;
  const canUp = !maxed && stardust >= cfg.stardust && points >= cfg.beans;
  const upgrading = upgradePhase !== 'idle';

  const onUpgrade = () => {
    if (maxed || !canUp || upgrading) return;
    setUpgradePhase('charging');
    playSfx('thrust');
    upgradeTimers.current.push(window.setTimeout(() => {
      setUpgradePhase('burst');
      playSfx('warp');
      upgradeShip(child.id, cfg.stardust, cfg.beans);
    }, 1050));
    upgradeTimers.current.push(window.setTimeout(() => {
      setUpgradePhase('complete');
      playSfx('collect');
    }, 1620));
    upgradeTimers.current.push(window.setTimeout(() => setUpgradePhase('idle'), 2650));
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

      <section className={`dock-card phase-${upgradePhase}`}>
        <div className="dock-console-head">
          <span className="dock-console-kicker">STARDOCK / 01</span>
          <span className="dock-console-status"><i /> {
            upgradePhase === 'charging' ? (zh ? '星核充能中' : 'CORE CHARGING')
              : upgradePhase === 'burst' ? (zh ? '跃迁突破' : 'WARP BREAKTHROUGH')
                : upgradePhase === 'complete' ? (zh ? '升级完成' : 'UPGRADE COMPLETE')
                  : (zh ? '停泊稳定' : 'DOCKED · STABLE')
          }</span>
        </div>

        <div className="dock-workbench">
          {/* 飞船展示 */}
          <div className="dock-hangar" aria-hidden="true">
            <span className="dock-star dock-star-a" /><span className="dock-star dock-star-b" /><span className="dock-star dock-star-c" />
            <span className="dock-orbit dock-orbit-a" /><span className="dock-orbit dock-orbit-b" />
            <span className="dock-energy-core" />
            <div className="dock-beams">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ '--beam-i': i } as React.CSSProperties} />)}</div>
            <div className="dock-particles">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--particle-i': i } as React.CSSProperties} />)}</div>
            <div className="dock-ship">
              <span className="dock-ship-emoji">🚀</span>
              <span className="dock-ship-name">{shipConfig(shipLevel).name[lang]}</span>
            </div>
            <div className="dock-pad"><i /><i /><i /></div>
            {upgradePhase === 'complete' && <div className="dock-level-reveal">LV.{shipLevel}<small>{zh ? '跃迁完成' : 'UPGRADE COMPLETE'}</small></div>}
          </div>

          <div className="dock-control-panel">
            <div className="dock-stats">
              <span className="dock-stat"><b>Lv.{shipLevel}</b><small>{zh ? `远征产出 +${Math.round((boost - 1) * 100)}%` : `Output +${Math.round((boost - 1) * 100)}%`}</small></span>
              <span className="dock-stat dock-stat--range"><b>{shipLevel}/{SHIP_MAX_LEVEL}</b><small>{zh ? '星际航程' : 'Star range'}</small></span>
            </div>
            <div className="dock-systems">
              <span><i /> {zh ? '引擎阵列' : 'Engine array'} <b>{Math.min(100, 55 + shipLevel * 5)}%</b></span>
              <span><i /> {zh ? '导航核心' : 'Navigation core'} <b>{Math.min(100, 48 + shipLevel * 5)}%</b></span>
              <span><i /> {zh ? '远征增幅' : 'Expedition boost'} <b>+{Math.round((boost - 1) * 100)}%</b></span>
            </div>
            <div className="dock-mats">
              <span className={`dock-mat${stardust >= cfg.stardust ? ' ok' : ''}`}><i>✨</i><b>{zh ? '星屑' : 'Star Dust'}</b><strong>{stardust}<em>/ {cfg.stardust}</em></strong></span>
              <span className={`dock-mat${points >= cfg.beans ? ' ok' : ''}`}><i>🪙</i><b>{zh ? '卷星币' : 'Coins'}</b><strong>{points}<em>/ {cfg.beans}</em></strong></span>
            </div>
            {maxed ? <KidButton color="yellow" disabled>{zh ? '🌟 已满级' : '🌟 MAX'}</KidButton> : (
              <KidButton color="green" disabled={!canUp || upgrading} onClick={onUpgrade}>
                {upgrading ? (zh ? '✦ 星核跃迁中…' : '✦ Core warping…') : (zh ? `🚀 升级到 Lv.${shipLevel + 1}` : `🚀 Upgrade to Lv.${shipLevel + 1}`)}
              </KidButton>
            )}
            <p className="dock-desc">{zh ? '升级将永久提高远征的卷星币与星屑产出。' : 'Upgrades permanently boost expedition rewards.'}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
