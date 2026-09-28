import { NavLink } from 'react-router-dom';
import { useStore } from '../store';
import { useI18n } from '../i18n';
import { EMPTY, featureOfPath, isFeatureOpen } from '../features';
import { speak, playSfx } from '../speech';

const TABS = [
  { to: '/', key: 'home', end: true },
  { to: '/map', key: 'map', end: false },
  { to: '/lobby', key: 'games', end: false },
  { to: '/profile', key: 'my', end: false },
] as const;

/** 底部 Tab 导航（首页 / 学校 / 乐园 / 总部）；新手剧情未解锁的 tab 不可点 */
export default function BottomNav() {
  const { t, lang } = useI18n();
  const doneList = useStore((s) => (s.activeChildId ? s.storyDone[s.activeChildId] ?? EMPTY : EMPTY));

  const lockedOf = (to: string) => {
    const f = featureOfPath(to);
    if (!f) return false;
    return !isFeatureOpen(f, doneList);
  };

  const lockTip = (e: React.MouseEvent) => {
    e.preventDefault();
    playSfx('deny');
    speak(lang === 'zh' ? '先去完成剧情任务，这里才能解锁哦！' : 'Finish the story quest first to unlock this!', lang);
  };

  return (
    <nav className="bottom-nav" aria-label="main navigation">
      <span className="bottom-nav-track" aria-hidden="true" />
      <span className="bottom-nav-scenery" aria-hidden="true" />
      <span className="bottom-nav-train-signal" aria-hidden="true"><i /><b /></span>
      {TABS.map(({ to, key, end }) => {
        const locked = lockedOf(to);
        return (
          <NavLink
            key={key}
            to={to}
            end={end}
            onClick={locked ? lockTip : undefined}
            aria-disabled={locked || undefined}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${locked ? 'locked' : ''}`}
          >
            {({ isActive }) => (
              <span className={`nav-carriage ${key === 'home' ? 'nav-locomotive' : ''}`}>
                {key === 'home' && <i className="nav-engine-stack" aria-hidden="true" />}
                {key === 'home' && <i className="nav-engine-nose" aria-hidden="true" />}
                {key === 'home' && <i className="nav-engine-lamp" aria-hidden="true" />}
                <i className="nav-roof-beacon" aria-hidden="true" />
                <span className="nav-carriage-windows" aria-hidden="true"><i /><i /></span>
                <span className="nav-carriage-door" aria-hidden="true" />
                <span className="nav-station-plate"><span className="nav-label">{t(key)}</span></span>
                <span className="nav-carriage-wheels" aria-hidden="true"><i /><i /></span>
                {isActive && <span className="nav-station-platform" aria-hidden="true" />}
                {locked && <i className="nav-lock" aria-hidden="true">🔒</i>}
              </span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
