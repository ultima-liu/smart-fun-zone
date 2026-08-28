import { NavLink } from 'react-router-dom';
import { useI18n } from '../i18n';
import { IconHome, IconPlay, IconTrophy, IconUser } from './icons';

const TABS = [
  { to: '/', key: 'home', icon: IconHome, end: true },
  { to: '/map', key: 'map', icon: IconPlay, end: false },
  { to: '/achievements', key: 'achievementsShort', icon: IconTrophy, end: false },
  { to: '/profile', key: 'my', icon: IconUser, end: false },
] as const;

/** 底部 Tab 导航（正式产品标配：首页 / 游戏 / 成就 / 我的） */
export default function BottomNav() {
  const { t } = useI18n();
  return (
    <nav className="bottom-nav" aria-label="main navigation">
      {TABS.map(({ to, key, icon: Icon, end }) => (
        <NavLink
          key={key}
          to={to}
          end={end}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Icon size={24} />
          <span className="nav-label">{t(key)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
