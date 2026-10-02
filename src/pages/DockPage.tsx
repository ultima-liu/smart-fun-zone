import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import DockShip from '../components/DockShip';
import { useI18n } from '../i18n';
import { useStore } from '../store';
import {
  shipConfig,
  shipBoost,
  SHIP_MAX_LEVEL,
  SHIP_FEATURES,
  SHIP_UPGRADE_DURATION_MS,
} from '../content/shipyard';
import { playSfx, speak } from '../speech';
import './dock.css';

type UpgradeSession = { childId: string; fromLevel: number; startedAt: number };
const outputBonus = (level: number) => Math.round((shipBoost(level) - 1) * 100);

export default function DockPage() {
  const nav = useNavigate();
  const { lang, t } = useI18n();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const shipLevel = useStore((s) => (s.activeChildId ? (s.shipLevel[s.activeChildId] ?? 1) : 1));
  const materials = useStore((s) => (s.activeChildId ? s.materials[s.activeChildId] : undefined));
  const points = useStore((s) => (s.activeChildId ? (s.points[s.activeChildId] ?? 0) : 0));
  const [previewLevel, setPreviewLevel] = useState<number | null>(null);
  const [session, setSession] = useState<UpgradeSession | null>(null);
  const [progress, setProgress] = useState(0);
  const [completedLevel, setCompletedLevel] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const upgradeLock = useRef(false);
  const zh = lang !== 'en';

  useEffect(() => {
    if (child) speak(t('welcomeDock'), lang);
    setSession(null);
    setPreviewLevel(null);
    setProgress(0);
    setCompletedLevel(null);
    setError(false);
    upgradeLock.current = false;
  }, [child?.id]);

  // The process belongs to this page and profile. Leaving cancels it before any payment.
  useEffect(() => {
    if (!session || session.childId !== child?.id) return;
    let frame = 0;
    const tick = () => {
      const elapsed = Date.now() - session.startedAt;
      setProgress(Math.min(100, Math.floor((elapsed / SHIP_UPGRADE_DURATION_MS) * 100)));
      if (elapsed < SHIP_UPGRADE_DURATION_MS) {
        frame = window.requestAnimationFrame(tick);
        return;
      }
      const state = useStore.getState();
      const cfg = shipConfig(session.fromLevel + 1);
      const valid =
        state.activeChildId === session.childId &&
        state.profiles.some((profile) => profile.id === session.childId) &&
        (state.shipLevel[session.childId] ?? 1) === session.fromLevel &&
        session.fromLevel < SHIP_MAX_LEVEL;
      const success = valid && state.upgradeShip(session.childId, cfg.stardust, cfg.beans);
      setSession(null);
      upgradeLock.current = false;
      if (success) {
        setCompletedLevel(session.fromLevel + 1);
        setPreviewLevel(null);
        playSfx('collect');
      } else {
        setProgress(0);
        setError(true);
      }
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [session, child?.id]);

  if (!child) return null;
  const maxed = shipLevel >= SHIP_MAX_LEVEL;
  const nextLevel = Math.min(shipLevel + 1, SHIP_MAX_LEVEL);
  const cfg = shipConfig(nextLevel);
  const stardust = materials?.stardust ?? 0;
  const canUp = !maxed && stardust >= cfg.stardust && points >= cfg.beans;
  const upgrading = session !== null;
  const displayedLevel = upgrading ? shipLevel : (previewLevel ?? shipLevel);
  const previewing = displayedLevel !== shipLevel;
  const bonus = outputBonus(shipLevel);
  const stage = progress < 25 ? 0 : progress < 75 ? 1 : 2;
  const stages = zh
    ? ['连接星核', '充能改装', '校准引擎']
    : ['Connect core', 'Charge & refit', 'Calibrate'];
  const status = upgrading
    ? stages[stage]
    : completedLevel
      ? zh
        ? `Lv.${completedLevel} 升级完成`
        : `Lv.${completedLevel} upgrade complete`
      : zh
        ? '飞船已就位'
        : 'Ship ready';

  const onUpgrade = () => {
    if (!canUp || upgradeLock.current) return;
    upgradeLock.current = true;
    setError(false);
    setCompletedLevel(null);
    setPreviewLevel(null);
    setProgress(0);
    setSession({ childId: child.id, fromLevel: shipLevel, startedAt: Date.now() });
    playSfx('thrust');
  };

  return (
    <div className="page dock-page sd-page">
      <header className="sd-heading">
        <div className="sd-heading-main">
          <BackButton
            onClick={() => nav('/')}
            label={zh ? '返回' : 'Back'}
            aria-label={zh ? '返回首页' : 'Back to home'}
          />
          <div className="sd-heading-copy">
            <span className="sd-eyebrow">JUAN FLEET / STARDOCK</span>
            <h1>{zh ? '卷卷号飞船坞' : 'Juan Star Shipyard'}</h1>
            <p>
              {zh
                ? '把每一颗星屑，变成飞向远方的力量。'
                : 'Turn every speck of stardust into a journey farther.'}
            </p>
          </div>
        </div>
        <div className="sd-wallet">
          <span>
            <i className="sd-dust-icon">✦</i>
            <small>{zh ? '星屑' : 'Stardust'}</small>
            <b>{stardust}</b>
          </span>
          <span>
            <i className="sd-coin-icon">◎</i>
            <small>{zh ? '卷星币' : 'Coins'}</small>
            <b>{points}</b>
          </span>
        </div>
      </header>

      <section
        className={`sd-workshop${upgrading ? ' is-charging' : ''}${completedLevel ? ' is-complete' : ''}`}
        aria-label={zh ? '飞船改装工坊' : 'Ship refit workshop'}
      >
        <div className="sd-toolbar">
          <span>
            <i /> {zh ? `${child.name}的专属机库` : `${child.name}'s hangar`}
          </span>
          <span>
            SECTOR 01 <b> / </b> LV.{shipLevel.toString().padStart(2, '0')}
          </span>
        </div>
        <div className="sd-workspace">
          <div className="sd-display">
            <div className="sd-display-top">
              <span>
                {previewing ? (zh ? '外形预览' : 'DESIGN PREVIEW') : zh ? '当前飞船' : 'YOUR SHIP'}
              </span>
              <b>MK.{displayedLevel.toString().padStart(2, '0')}</b>
            </div>
            <div className="sd-hangar">
              <div className="sd-grid" aria-hidden="true" />
              <div className="sd-orbit sd-orbit-one" aria-hidden="true" />
              <div className="sd-orbit sd-orbit-two" aria-hidden="true" />
              <div className="sd-charging-streams" aria-hidden="true">
                {Array.from({ length: 5 }, (_, i) => (
                  <i key={i} style={{ '--stream': i } as CSSProperties} />
                ))}
              </div>
              <span className="sd-hangar-mark sd-hangar-mark-left" aria-hidden="true">
                +<br />+<br />+
              </span>
              <span className="sd-hangar-mark sd-hangar-mark-right" aria-hidden="true">
                +<br />+<br />+
              </span>
              <div className="sd-main-ship" key={displayedLevel}>
                <DockShip level={displayedLevel} label={shipConfig(displayedLevel).name[lang]} />
              </div>
              <div className="sd-platform" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <span className="sd-hangar-caption">
                {upgrading ? 'ENERGY TRANSFER IN PROGRESS' : 'ANTI-GRAVITY BERTH / 01'}
              </span>
            </div>
            <div className="sd-ship-title">
              <span className="sd-level-tag">LV.{displayedLevel}</span>
              <h2>{shipConfig(displayedLevel).name[lang]}</h2>
              <p>{SHIP_FEATURES[displayedLevel - 1][lang]}</p>
            </div>
            {previewing && (
              <button className="sd-return" onClick={() => setPreviewLevel(null)}>
                {zh ? '↶ 返回我的飞船' : '↶ Back to my ship'}
              </button>
            )}
            <div className="sd-ship-readings">
              <span>
                <small>{zh ? '远征产出加成' : 'Expedition bonus'}</small>
                <b>
                  +{outputBonus(displayedLevel)}
                  <em>%</em>
                </b>
              </span>
              <span>
                <small>{zh ? '外形进化' : 'Fleet evolution'}</small>
                <b>
                  {displayedLevel}
                  <em> / 10</em>
                </b>
              </span>
              <span>
                <small>{zh ? '引擎级别' : 'Engine class'}</small>
                <b>
                  MK<em> {displayedLevel.toString().padStart(2, '0')}</em>
                </b>
              </span>
            </div>
          </div>

          <div className="sd-console">
            <span className="sd-eyebrow">{maxed ? 'LEGENDARY CLASS' : 'NEXT EVOLUTION'}</span>
            <h2>
              {maxed
                ? zh
                  ? '传奇舰，整装待发'
                  : 'A legend, ready to fly'
                : zh
                  ? '下一站，更远的星海'
                  : 'Next stop: farther stars'}
            </h2>
            <div className="sd-next-ship">
              <DockShip level={nextLevel} />
              <div>
                <small>
                  {maxed ? (zh ? '最终形态' : 'Final form') : `LV.${shipLevel} → LV.${nextLevel}`}
                </small>
                <h3>{cfg.name[lang]}</h3>
                <p>{SHIP_FEATURES[nextLevel - 1][lang]}</p>
              </div>
            </div>
            <div className="sd-benefit">
              <span>{zh ? '远征产出' : 'Expedition output'}</span>
              <b>
                +{bonus}%
                {!maxed && (
                  <>
                    <i>→</i>
                    <strong>+{outputBonus(nextLevel)}%</strong>
                  </>
                )}
              </b>
              <small>{zh ? '卷星币与星屑的永久加成' : 'Permanent coin & stardust bonus'}</small>
            </div>

            {!maxed && (
              <div className="sd-materials">
                <div className={stardust >= cfg.stardust ? 'is-ready' : ''}>
                  <i className="sd-dust-icon">✦</i>
                  <span>
                    {zh ? '星屑' : 'Stardust'}
                    <small>
                      {stardust >= cfg.stardust
                        ? zh
                          ? '材料就绪'
                          : 'Ready'
                        : zh
                          ? `还差 ${cfg.stardust - stardust}`
                          : `Need ${cfg.stardust - stardust} more`}
                    </small>
                  </span>
                  <b>
                    {cfg.stardust}
                    <small>{zh ? `拥有 ${stardust}` : `${stardust} owned`}</small>
                  </b>
                </div>
                <div className={points >= cfg.beans ? 'is-ready' : ''}>
                  <i className="sd-coin-icon">◎</i>
                  <span>
                    {zh ? '卷星币' : 'Coins'}
                    <small>
                      {points >= cfg.beans
                        ? zh
                          ? '材料就绪'
                          : 'Ready'
                        : zh
                          ? `还差 ${cfg.beans - points}`
                          : `Need ${cfg.beans - points} more`}
                    </small>
                  </span>
                  <b>
                    {cfg.beans}
                    <small>{zh ? `拥有 ${points}` : `${points} owned`}</small>
                  </b>
                </div>
              </div>
            )}

            <div className={`sd-charge-panel${maxed && !completedLevel ? ' is-maxed' : ''}`}>
              <div className="sd-charge-label">
                <span aria-live="polite" role="status">
                  {maxed && !completedLevel
                    ? zh
                      ? '全部进化已完成'
                      : 'All evolutions complete'
                    : status}
                </span>
                <b>
                  {maxed ? 100 : progress}
                  <em>%</em>
                </b>
              </div>
              <div
                className="sd-battery"
                role="progressbar"
                aria-label={zh ? '飞船升级充电进度' : 'Ship upgrade charging progress'}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={maxed ? 100 : progress}
              >
                <div className="sd-battery-cells">
                  {Array.from({ length: 20 }, (_, i) => (
                    <span key={i}>
                      <i
                        style={{
                          height: `${Math.min(100, Math.max(0, ((maxed ? 100 : progress) - i * 5) * 20))}%`,
                        }}
                      />
                    </span>
                  ))}
                </div>
                <span className="sd-battery-bolt" aria-hidden="true">
                  ϟ
                </span>
              </div>
              <div className="sd-charge-steps">
                {stages.map((label, i) => (
                  <span
                    className={
                      (upgrading ? stage >= i : completedLevel || maxed) ? 'is-active' : ''
                    }
                    key={label}
                  >
                    <i>{completedLevel || maxed || (upgrading && stage > i) ? '✓' : `0${i + 1}`}</i>
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <button
              className="sd-upgrade-button"
              disabled={!canUp || upgrading}
              onClick={onUpgrade}
            >
              {upgrading
                ? zh
                  ? `充电升级中 · ${progress}%`
                  : `Charging · ${progress}%`
                : maxed
                  ? zh
                    ? '✦ 已达到传奇等级'
                    : '✦ Legendary level reached'
                  : zh
                    ? `ϟ 开始升级至 Lv.${nextLevel}`
                    : `ϟ Upgrade to Lv.${nextLevel}`}
            </button>
            <p className="sd-help">
              {upgrading
                ? zh
                  ? '请留在船坞，充满后自动完成升级。'
                  : 'Stay in the dock. Your upgrade completes when charged.'
                : maxed
                  ? zh
                    ? '十阶进化完成！带上你的传奇舰继续探索。'
                    : 'All ten forms unlocked. Explore with your legendary ship.'
                  : canUp
                    ? zh
                      ? '约 6 秒充能 · 完成时扣除材料'
                      : '6-second charge · Materials used on completion'
                    : zh
                      ? '首页收取远征战利品，积攒星屑与卷星币。'
                      : 'Collect expedition loot on the home page to gather materials.'}
            </p>
            {error && (
              <p className="sd-error" role="alert">
                {zh
                  ? '材料或等级发生变化，本次升级未扣费，请重新尝试。'
                  : 'Materials or level changed. No charge made; try again.'}
              </p>
            )}
          </div>
        </div>
        {completedLevel && (
          <div className="sd-success" role="status" key={completedLevel}>
            <span>✦</span>
            <div>
              <b>
                {zh
                  ? `改装完成 · ${shipConfig(completedLevel).name.zh}`
                  : `Refit complete · ${shipConfig(completedLevel).name.en}`}
              </b>
              <p>
                {zh
                  ? `新外形已解锁，远征产出提升至 +${outputBonus(completedLevel)}%。`
                  : `New form unlocked. Expedition bonus is now +${outputBonus(completedLevel)}%.`}
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="sd-evolution" aria-labelledby="sd-evolution-title">
        <div className="sd-evolution-head">
          <div>
            <span className="sd-eyebrow">THE EVOLUTION ATLAS</span>
            <h2 id="sd-evolution-title">
              {zh ? '十阶星舰进化图谱' : 'Ten stages of starship evolution'}
            </h2>
          </div>
          <p>{zh ? '点击任意飞船，预览未来的模样' : 'Select any ship to preview its design'}</p>
        </div>
        <div className="sd-fleet">
          {Array.from({ length: SHIP_MAX_LEVEL }, (_, i) => {
            const level = i + 1;
            return (
              <button
                key={level}
                className={`sd-fleet-ship${displayedLevel === level ? ' is-selected' : ''}${level > shipLevel ? ' is-locked' : ''}`}
                disabled={upgrading}
                aria-pressed={displayedLevel === level}
                aria-label={`${shipConfig(level).name[lang]} · Lv.${level} · ${zh ? (level === shipLevel ? '当前' : level < shipLevel ? '已解锁' : '待解锁，可预览') : level === shipLevel ? 'Current' : level < shipLevel ? 'Unlocked' : 'Locked, preview available'}`}
                onClick={() => setPreviewLevel(level === shipLevel ? null : level)}
              >
                <span className="sd-fleet-level">
                  LV.{level.toString().padStart(2, '0')}
                  <i>{level < shipLevel ? '✓' : level === shipLevel ? '●' : '◇'}</i>
                </span>
                <DockShip level={level} />
                <b>{shipConfig(level).name[lang].replace(zh ? '卷卷号·' : `Juan-${level} `, '')}</b>
                <small>
                  {level === shipLevel
                    ? zh
                      ? '当前飞船'
                      : 'Current ship'
                    : level < shipLevel
                      ? zh
                        ? '已解锁'
                        : 'Unlocked'
                      : zh
                        ? '待解锁 · 预览'
                        : 'Preview design'}
                </small>
              </button>
            );
          })}
        </div>
        <p className="sd-atlas-note">
          {zh
            ? '每升一级，外形焕新，远征产出增加 10 个百分点。Lv.10 获得传奇星冠与 +90% 产出加成。'
            : 'Each upgrade brings a new form and +10 percentage points to expedition output. Lv.10 grants the legendary crown and a +90% bonus.'}
        </p>
      </section>
    </div>
  );
}
