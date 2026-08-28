import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, childTotalStars, childRecords } from '../store';
import { useI18n } from '../i18n';
import { TopBar, KidButton } from '../components/ui';
import Mascot from '../components/Mascot';
import { listGames } from '../games';

export default function AchievementsPage() {
  const nav = useNavigate();
  const { t } = useI18n();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const records = useStore((s) => s.records);

  useEffect(() => {
    if (!child) nav('/');
  }, [child, nav]);

  const mine = useMemo(() => (child ? childRecords(records, child.id) : []), [records, child]);

  if (!child) return null;

  const totalStars = childTotalStars(records, child.id);
  const gamesDone = new Set(mine.map((r) => r.gameId)).size;
  const playedDays = new Set(mine.map((r) => new Date(r.playedAt).toDateString())).size;
  const played = (id: string) => mine.some((r) => r.gameId === id);

  const badges = [
    { id: 'first', icon: '🏆', label: t('badgeFirst'), done: mine.length > 0 },
    { id: 'stars10', icon: '⭐', label: t('badgeStars10'), done: totalStars >= 10 },
    { id: 'farm', icon: '🚜', label: t('badgeFarm'), done: played('number-farm') },
    { id: 'memory', icon: '🧠', label: t('badgeMemory'), done: played('memory-match') },
    { id: 'spot', icon: '👀', label: t('badgeSpot'), done: played('odd-one-out') },
    { id: 'streak', icon: '🔥', label: t('badgeStreak'), done: playedDays >= 2 },
  ];

  return (
    <div className="page achievements">
      <TopBar title={`🎖️ ${t('achievements')}`} />

      <div className="ach-head">
        <Mascot pose="happy" size={72} />
        <span className="ach-avatar">{child.avatar}</span>
        <span className="ach-name">{child.name}</span>
      </div>

      <div className="ach-stats">
        <div className="stat-card">
          <div className="stat-num">⭐ {totalStars}</div>
          <div className="stat-label">{t('totalStars')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">🎮 {gamesDone}/{listGames().filter((g) => g.status === 'ready').length}</div>
          <div className="stat-label">{t('gamesDone')}</div>
        </div>
      </div>

      <h2 className="section-title">{t('badges')}</h2>
      <div className="badge-grid">
        {badges.map((b) => (
          <div key={b.id} className={`badge-cell ${b.done ? 'unlocked' : 'locked'}`}>
            <div className="badge-icon">{b.done ? b.icon : '🔒'}</div>
            <div className="badge-label">{b.label}</div>
          </div>
        ))}
      </div>

      {mine.length === 0 && <p className="empty-tip">{t('noData')}</p>}

      <div className="ach-actions">
        <KidButton color="green" onClick={() => nav('/lobby')}>
          {t('lobby')}
        </KidButton>
      </div>
    </div>
  );
}
