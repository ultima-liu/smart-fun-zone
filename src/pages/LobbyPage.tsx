import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore, childTotalStars, starsForGame, todayPlaySec, streakDays } from '../store';
import { useI18n } from '../i18n';
import { listGames } from '../games';
import { KidButton, Stars } from '../components/ui';
import Modal from '../components/Modal';
import PageHero from '../components/PageHero';
import { GAME_GENRES, type GameGenre } from '../types';
import { speak, speakAsNpc, stopMusic } from '../speech';
import { npcMeta } from '../content/npc';
import { IconBean } from '../components/icons';
import NpcBuddy from '../components/NpcBuddy';

type TabId = 'all' | GameGenre;

export default function LobbyPage() {
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const [params, setParams] = useSearchParams();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const records = useStore((s) => s.records);
  const points = useStore((s) => (s.activeChildId ? s.points[s.activeChildId] ?? 0 : 0));
  const dailyLimitMin = useStore((s) => s.dailyLimitMin);
  const bonusMin = useStore((s) => (s.activeChildId ? s.bonusMin[s.activeChildId] : undefined));
  const today = new Date().toDateString();
  const effectiveLimitMin = dailyLimitMin + (bonusMin && bonusMin.day === today ? bonusMin.min : 0);
  const [resting, setResting] = useState(false);

  const activeTab: TabId = (params.get('cat') as TabId) ?? 'all';

  useEffect(() => {
    if (!child) {
      nav('/');
      return;
    }
    speakAsNpc(t('welcomeLobby'), npcMeta('泡泡'), lang);
    return () => stopMusic();
  }, [child?.id, lang, nav, t]);

  const todaySec = useMemo(
    () => (child ? todayPlaySec(records, child.id) : 0),
    [records, child],
  );

  useEffect(() => {
    if (child && effectiveLimitMin > 0 && todaySec >= effectiveLimitMin * 60) {
      const timer = window.setTimeout(() => setResting(true), 60);
      return () => window.clearTimeout(timer);
    }
  }, [child, effectiveLimitMin, todaySec]);

  if (!child) return null;

  const games = listGames();
  const totalStars = childTotalStars(records, child.id);
  const streak = streakDays(records, child.id);
  const shown = activeTab === 'all' ? games : games.filter((g) => g.genre === activeTab);
  const activeGenre = activeTab === 'all' ? null : GAME_GENRES.find((g) => g.id === activeTab);

  const setTab = (tab: TabId) => {
    setParams(tab === 'all' ? {} : { cat: tab }, { replace: true });
  };

  return (
    <div className="page lobby">
      <NpcBuddy npc="泡泡" storyNodeIds={["c2-1","c2-2"]} />
      {/* 与学习/我的一致的发光玻璃页头 */}
      <PageHero
        eyebrow={`${lang === 'zh' ? '空中乐园 · 玩中学' : 'Sky Park · Fun & Learn'}`}
        title={t('lobby')}
        planet="funpark"
        stats={[
          { icon: '⭐', value: totalStars, tone: 'gold', label: t('totalStars') },
          { icon: <IconBean size={16} gradient="gold" />, value: points, tone: 'mint', label: t('beans') },
          { icon: '🔥', value: streak, tone: 'coral', label: t('streakLabel') },
        ]}
      />

      {effectiveLimitMin > 0 && (
        <div className="lobby-time-note" title="今日可玩时长含奖励加成">
          {lang === 'zh'
            ? `⏱ 今日已玩 ${Math.floor(todaySec / 60)} 分钟 · 剩余 ${Math.max(0, effectiveLimitMin - Math.floor(todaySec / 60))} 分钟`
            : `⏱ ${Math.floor(todaySec / 60)} min played · ${Math.max(0, effectiveLimitMin - Math.floor(todaySec / 60))} min left`}
        </div>
      )}

      {/* 分类 Tab：按玩法分（数一数/配一配/找一找/听一听/想一想），不分学科 */}
      <div className="cat-tabs" role="tablist">
        <button
          className={`cat-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setTab('all')}
          role="tab"
          aria-selected={activeTab === 'all'}
        >
          {t('all')}
        </button>
        {GAME_GENRES.map((g) => (
          <button
            key={g.id}
            className={`cat-tab ${activeTab === g.id ? 'active' : ''}`}
            onClick={() => setTab(g.id)}
            role="tab"
            aria-selected={activeTab === g.id}
          >
            {g.icon} {g.name[lang]}
          </button>
        ))}
      </div>

      {activeGenre && (
        <div className="category-head">
          <div className="category-hero genre-hero">
            <div className="category-scrim" aria-hidden="true" />
            <div className="subject-title-block">
              <span
                style={{ background: activeGenre.color }}
                className="subject-badge"
                aria-hidden="true"
              >
                {activeGenre.icon}
              </span>
              <h2 className="subject-title">{activeGenre.name[lang]}</h2>
            </div>
          </div>
        </div>
      )}

      <div className="game-grid">
        {shown.map((g) => {
          const best = starsForGame(records, child.id, g.id);
          const genre = GAME_GENRES.find((x) => x.id === g.genre);
          return (
            <button
              key={g.id}
              className="game-card"
              onClick={() => {
                speak(g.name[lang], lang);
                nav(`/game/${g.id}`);
              }}
            >
              <span className="game-cover" style={{ background: genre?.color ?? '#2C7D74' }}>
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
