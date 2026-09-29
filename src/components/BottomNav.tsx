import { NavLink } from 'react-router-dom';
import { useI18n } from '../i18n';

const TABS = [
  { to: '/', key: 'home', end: true },
  { to: '/map', key: 'map', end: false },
  { to: '/lobby', key: 'games', end: false },
  { to: '/profile', key: 'my', end: false },
] as const;

/** 底部 Tab 导航（首页 / 学校 / 乐园 / 总部），所有入口直接开放 */
export default function BottomNav() {
  const { t } = useI18n();

  return (
    <nav className="bottom-nav" aria-label="main navigation">
      <span className="bottom-nav-track" aria-hidden="true" />
      <span className="bottom-nav-scenery" aria-hidden="true" />
      <span className="bottom-nav-train-signal" aria-hidden="true"><i /><b /></span>
      {TABS.map(({ to, key, end }) => (
        <NavLink key={key} to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
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
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
