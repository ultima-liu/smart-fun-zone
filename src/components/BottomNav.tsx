import { NavLink } from 'react-router-dom';
import { useStore } from '../store';
import { useI18n } from '../i18n';
import { EMPTY, featureOfPath, isFeatureOpen } from '../features';
import { speak, playSfx } from '../speech';
import { IconHome, IconSchool, IconFerris, IconTower } from './icons';

const TABS = [
  { to: '/', key: 'home', icon: IconHome, end: true },
  { to: '/map', key: 'map', icon: IconSchool, end: false },
  { to: '/lobby', key: 'games', icon: IconFerris, end: false },
  { to: '/profile', key: 'my', icon: IconTower, end: false },
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
      {TABS.map(({ to, key, icon: Icon, end }) => {
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
              <>
                <Icon size={24} gradient={isActive ? 'gold' : 'teal'} />
                <span className="nav-label">{t(key)}</span>
                {locked && <i className="nav-lock" aria-hidden="true">🔒</i>}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
