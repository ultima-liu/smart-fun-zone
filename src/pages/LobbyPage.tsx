import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore, childTotalStars, starsForGame, todayPlaySec, streakDays } from '../store';
import { useI18n } from '../i18n';
import { listGames } from '../games';
import { KidButton, TopBar, Stars } from '../components/ui';
import Modal from '../components/Modal';
import { SceneBanner } from '../components/scenes';
import { SUBJECTS, type SubjectId } from '../types';
import { speak, startMusic, stopMusic } from '../speech';
import { IconClock, IconStar } from '../components/icons';

type TabId = 'all' | SubjectId;

export default function LobbyPage() {
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const [params, setParams] = useSearchParams();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const records = useStore((s) => s.records);
  const dailyLimitMin = useStore((s) => s.dailyLimitMin);
  const [resting, setResting] = useState(false);

  const activeTab: TabId = (params.get('cat') as TabId) ?? 'all';

  useEffect(() => {
    if (!child) {
      nav('/');
      return;
    }
    startMusic('lobby');
    speak(t('welcome'), lang);
    return () => stopMusic();
  }, [child?.id, lang, nav, t]);

  const todaySec = useMemo(
    () => (child ? todayPlaySec(records, child.id) : 0),
    [records, child],
  );

  useEffect(() => {
    if (child && dailyLimitMin > 0 && todaySec >= dailyLimitMin * 60) {
      const timer = window.setTimeout(() => setResting(true), 60);
      return () => window.clearTimeout(timer);
    }
  }, [child, dailyLimitMin, todaySec]);

  if (!child) return null;

  const games = listGames();
  const totalStars = childTotalStars(records, child.id);
  const streak = streakDays(records, child.id);
  const shown = activeTab === 'all' ? games : games.filter((g) => g.category === activeTab);
  const activeCat = activeTab === 'all' ? null : SUBJECTS.find((c) => c.id === activeTab);

  const setTab = (tab: TabId) => {
    setParams(tab === 'all' ? {} : { cat: tab }, { replace: true });
  };

  return (
    <div className="page lobby">
      <TopBar
        title={
          <span>
            {t('lobby')} · {child.avatar} {child.name}
          </span>
        }
        onBack={() => nav('/')}
      />

      <div className="lobby-stats">
        <div className="stat-chip">
          <IconStar size={18} style={{ color: '#FFB300' }} />
          <b>{totalStars}</b> {t('stars')}
        </div>
        <div className="stat-chip today">
          <IconClock size={16} />
          {t('todayPlayed', { min: Math.floor(todaySec / 60) })}
        </div>
        {streak > 0 && (
          <div className="stat-chip streak">
            🔥 {streak} {t('streakLabel')}
          </div>
        )}
      </div>

      {/* 分类 Tab */}
      <div className="cat-tabs" role="tablist">
        <button
          className={`cat-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setTab('all')}
          role="tab"
          aria-selected={activeTab === 'all'}
        >
          {t('all')}
        </button>
        {SUBJECTS.map((cat) => (
          <button
            key={cat.id}
            className={`cat-tab ${activeTab === cat.id ? 'active' : ''}`}
            style={activeTab === cat.id ? { background: cat.color } : undefined}
            onClick={() => setTab(cat.id)}
            role="tab"
            aria-selected={activeTab === cat.id}
          >
            {cat.icon} {cat.name[lang]}
          </button>
        ))}
      </div>

      {activeCat && (
        <div className="category-head">
          <SceneBanner kind={activeCat.id} height={86} />
          <h2 className="category-title">
            <span style={{ background: activeCat.color }} className="category-badge">
              {activeCat.icon}
            </span>
            {activeCat.name[lang]}
          </h2>
        </div>
      )}

      <div className="game-grid">
        {shown.map((g) => {
          const best = starsForGame(records, child.id, g.id);
          const cat = SUBJECTS.find((c) => c.id === g.category);
          return (
            <button
              key={g.id}
              className="game-card"
              onClick={() => {
                speak(g.name[lang], lang);
                nav(`/game/${g.id}`);
              }}
            >
              <span className="game-cover" style={{ background: cat?.color }}>
                <span className="game-icon">{g.icon}</span>
                {best === 0 && <span className="game-new">NEW</span>}
              </span>
              <span className="game-name">{g.name[lang]}</span>
              <span className="game-desc">{lang === 'zh' ? g.name.en : g.name.zh}</span>
              <span className="game-footer">
                <Stars count={best} size={16} />
                <span className="game-levels">
                  {t('level', { n: 1 })}~{g.levels}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {resting && (
        <Modal>
          <div className="modal-panel">
            <div className="modal-emoji">🌳</div>
            <p className="modal-text">{t('rest')}</p>
            <KidButton color="green" onClick={() => setResting(false)}>
              {t('ok')}
            </KidButton>
          </div>
        </Modal>
      )}
    </div>
  );
}
