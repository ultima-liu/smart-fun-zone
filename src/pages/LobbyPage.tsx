import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, todayPlaySec, streakDays, bestScoreForGame, gamePlayStats } from '../store';
import { courseTotalStars } from '../activeCourses';
import { useI18n } from '../i18n';
import { listGames } from '../games';
import { KidButton } from '../components/ui';
import Modal from '../components/Modal';
import { speak, speakAsNpc } from '../speech';
import { npcMeta } from '../content/npc';
import { IconBean } from '../components/icons';
import NpcBuddy from '../components/NpcBuddy';

export default function LobbyPage() {
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const records = useStore((s) => s.records);
  const mastery = useStore((s) => s.mastery);
  const points = useStore((s) => (s.activeChildId ? s.points[s.activeChildId] ?? 0 : 0));
  const coins = useStore((s) => (s.activeChildId ? s.gameCoins[s.activeChildId] ?? 0 : 0));
  const dailyLimitMin = useStore((s) => s.dailyLimitMin);
  const bonusMin = useStore((s) => (s.activeChildId ? s.bonusMin[s.activeChildId] : undefined));
  const today = new Date().toDateString();
  const effectiveLimitMin = dailyLimitMin + (bonusMin && bonusMin.day === today ? bonusMin.min : 0);
  const [resting, setResting] = useState(false);

  useEffect(() => {
    if (!child) {
      nav('/');
      return;
    }
    speakAsNpc(t('welcomeLobby'), npcMeta('泡泡'), lang);
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
  const totalStars = courseTotalStars(child.id, mastery, records);
  const streak = streakDays(records, child.id);

  return (
    <div className="page lobby">
      <NpcBuddy npc="泡泡" storyNodeIds={["c2-1","c2-2"]} />
      <header className="park-command-header">
        <div className="park-flight-crest" aria-hidden="true"><i>✦</i><span /><b /></div>
        <div className="park-command-copy">
          <span>{lang === 'zh' ? 'SKY PARK · 云端游乐航站' : 'SKY PARK · PLAY PORT'}</span>
          <h1>{t('lobby')}</h1>
          <p>{lang === 'zh' ? `${child.name}，今天想登上哪一座游乐岛？` : `${child.name}, which play island will you visit today?`}</p>
        </div>
        <div className="park-metrics" aria-label={lang === 'zh' ? '我的乐园数据' : 'My park statistics'}>
          <span><i>⭐</i><b>{totalStars}</b><small>{t('totalStars')}</small></span>
          <span><i><IconBean size={15} gradient="gold" /></i><b>{points}</b><small>{t('beans')}</small></span>
          <span><i>🔥</i><b>{streak}</b><small>{t('streakLabel')}</small></span>
          <span><i>🪙</i><b>{coins}</b><small>{t('parkCoins')}</small></span>
        </div>
      </header>

      <section className="sky-park-forecourt" aria-label={lang === 'zh' ? '空中乐园前庭' : 'Sky park forecourt'}>
        <img src="/assets/park/sky-park-hero-v1.png" alt={lang === 'zh' ? '云海中的空中乐园游乐岛' : 'A floating amusement park in the clouds'} />
        <div className="sky-park-shade" aria-hidden="true" />
        <div className="sky-park-copy">
          <span>{lang === 'zh' ? '✦ 云端登机口已开启' : '✦ Sky gate now boarding'}</span>
          <h2>{lang === 'zh' ? '选一条航线，出发去玩！' : 'Choose a route and play!'}</h2>
          <p>{lang === 'zh' ? '每座游乐岛，都是一次新的小挑战。' : 'Every play island is a new little challenge.'}</p>
        </div>
        <div className="sky-park-flightline" aria-hidden="true"><i /><span>✦</span><i /><span>◌</span></div>
      </section>

      {effectiveLimitMin > 0 && (
        <div className="lobby-time-note" title="今日可玩时长含奖励加成">
          {lang === 'zh'
            ? `⏱ 今日已玩 ${Math.floor(todaySec / 60)} 分钟 · 剩余 ${Math.max(0, effectiveLimitMin - Math.floor(todaySec / 60))} 分钟`
            : `⏱ ${Math.floor(todaySec / 60)} min played · ${Math.max(0, effectiveLimitMin - Math.floor(todaySec / 60))} min left`}
        </div>
      )}

      <section className="park-attraction-atlas" aria-label={lang === 'zh' ? '游乐设施入口' : 'Play attraction entrances'}>
        <div className="park-atlas-head"><span>{lang === 'zh' ? '街机游乐岛' : 'Arcade islands'}</span><b>{lang === 'zh' ? '登上你喜欢的游乐设施' : 'Board an attraction you like'}</b></div>
      <div className="game-grid park-attraction-grid">
        {games.map((g) => {
          const best = bestScoreForGame(records, child.id, g.id);
          const played = gamePlayStats(records, child.id, g.id).rounds > 0;
          return (
            <button
              key={g.id}
              className="game-card park-attraction-card"
              onClick={() => {
                speak(g.name[lang], lang);
                nav(`/game/${g.id}`);
              }}
            >
              <span className="game-cover" style={{ background: g.color }}>
                <span className="attraction-route" aria-hidden="true"><i /><b>✦</b><i /></span>
                <span className="game-icon">{g.icon}</span>
                {!played && <span className="game-new">NEW</span>}
              </span>
              <span className="game-name">{g.name[lang]}</span>
              <span className="game-desc">{g.desc[lang]}</span>
              <span className="game-footer">
                <span className="game-best">{played ? `🏆 ${best}` : lang === 'zh' ? '还没玩过' : 'Not played yet'}</span>
                {!g.untimed && <span className="game-levels">⏱ {g.durationSec}s</span>}
              </span>
            </button>
          );
        })}
      </div>
      </section>

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
