import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, todayPlaySec, streakDays } from '../store';
import { courseTotalStars } from '../activeCourses';
import { useI18n } from '../i18n';
import { KidButton } from '../components/ui';
import Modal from '../components/Modal';
import { speakAsNpc } from '../speech';
import { npcMeta } from '../content/npc';
import { IconBean } from '../components/icons';
import NpcBuddy from '../components/NpcBuddy';
import GomokuGame from '../games/GomokuGame';
import ChineseChessGame from '../games/ChineseChessGame';
import LianliankanGame, { type LianliankanOutcome } from '../games/LianliankanGame';
import '../park-games.css';

type ParkCategory = 'board' | 'card' | 'match' | 'puzzle' | 'reflex';

const PARK_CATEGORIES: Array<{ id: ParkCategory; mark: string; zh: string; en: string; hintZh: string; hintEn: string }> = [
  { id: 'board', mark: '棋', zh: '棋类', en: 'Board', hintZh: '落子布局，观察全局', hintEn: 'Plan each move' },
  { id: 'card', mark: '牌', zh: '牌类', en: 'Cards', hintZh: '组合手牌，灵活判断', hintEn: 'Build a clever hand' },
  { id: 'match', mark: '消', zh: '消除', en: 'Match', hintZh: '连锁消除，爽快闯关', hintEn: 'Chain and clear' },
  { id: 'puzzle', mark: '智', zh: '益智', en: 'Puzzle', hintZh: '解开机关，发现规律', hintEn: 'Find the pattern' },
  { id: 'reflex', mark: '捷', zh: '敏捷', en: 'Reflex', hintZh: '眼疾手快，挑战反应', hintEn: 'Test your reflexes' },
];

export default function LobbyPage() {
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const records = useStore((s) => s.records);
  const mastery = useStore((s) => s.mastery);
  const points = useStore((s) => (s.activeChildId ? s.points[s.activeChildId] ?? 0 : 0));
  const dailyLimitMin = useStore((s) => s.dailyLimitMin);
  const addRecord = useStore((s) => s.addRecord);
  const bonusMin = useStore((s) => (s.activeChildId ? s.bonusMin[s.activeChildId] : undefined));
  const today = new Date().toDateString();
  const effectiveLimitMin = dailyLimitMin + (bonusMin && bonusMin.day === today ? bonusMin.min : 0);
  const [resting, setResting] = useState(false);
  const [category, setCategory] = useState<ParkCategory>('board');
  const [activeGame, setActiveGame] = useState<'gomoku' | 'xiangqi' | 'lianliankan' | null>(null);
  const gameRef = useRef<HTMLDivElement>(null);

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

  const handleGomokuComplete = useCallback((result: 'win' | 'lose' | 'draw', durationSec: number, difficulty: 'easy' | 'normal' | 'hard') => {
    if (!child) return;
    addRecord({
      id: `gomoku-${child.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      childId: child.id,
      gameId: 'sky-gomoku',
      level: difficulty === 'easy' ? 1 : difficulty === 'normal' ? 2 : 3,
      stars: 0,
      correct: result === 'win' ? 1 : 0,
      total: 1,
      durationSec,
      playedAt: Date.now(),
    });
  }, [addRecord, child]);

  const handleXiangqiComplete = useCallback((result: 'win' | 'lose' | 'draw', durationSec: number, difficulty: 'easy' | 'normal' | 'hard') => {
    if (!child) return;
    addRecord({
      id: `xiangqi-${child.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      childId: child.id,
      gameId: 'sky-xiangqi',
      level: difficulty === 'easy' ? 1 : difficulty === 'normal' ? 2 : 3,
      stars: 0,
      correct: result === 'win' ? 1 : 0,
      total: 1,
      durationSec,
      playedAt: Date.now(),
    });
  }, [addRecord, child]);

  const handleLianliankanComplete = useCallback((outcome: LianliankanOutcome) => {
    if (!child) return;
    addRecord({
      id: `lianliankan-${child.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      childId: child.id,
      gameId: outcome.mode === 'levels' ? 'sky-lianliankan-levels' : 'sky-lianliankan',
      level: outcome.mode === 'levels'
        ? outcome.level
        : outcome.difficulty === 'easy' ? 1 : outcome.difficulty === 'normal' ? 2 : 3,
      stars: outcome.mode === 'levels' ? outcome.stars : 0,
      correct: outcome.result === 'win' ? 1 : 0,
      total: 1,
      durationSec: outcome.durationSec,
      playedAt: Date.now(),
    });
  }, [addRecord, child]);

  const openGame = (game: 'gomoku' | 'xiangqi' | 'lianliankan') => {
    setActiveGame(game);
    window.requestAnimationFrame(() => gameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  if (!child) return null;

  const totalStars = courseTotalStars(child.id, mastery, records);
  const streak = streakDays(records, child.id);

  return (
    <div className="page lobby">
      <NpcBuddy npc="泡泡" />
      <header className="park-command-header">
        <div className="park-flight-crest" aria-hidden="true"><i>✦</i><span /><b /></div>
        <div className="park-command-copy">
          <span>{lang === 'zh' ? 'SKY PARK · 云端游乐航站' : 'SKY PARK · PLAY PORT'}</span>
          <h1>{t('lobby')}</h1>
          <p>{lang === 'zh' ? `${child.name}，欢迎回到空中乐园！` : `${child.name}, welcome back to Sky Park!`}</p>
        </div>
        <div className="park-metrics" aria-label={lang === 'zh' ? '我的乐园数据' : 'My park statistics'}>
          <span><i>⭐</i><b>{totalStars}</b><small>{t('totalStars')}</small></span>
          <span><i><IconBean size={15} gradient="gold" /></i><b>{points}</b><small>{t('beans')}</small></span>
          <span><i>🔥</i><b>{streak}</b><small>{t('streakLabel')}</small></span>
        </div>
      </header>

      <section className="sky-park-forecourt" aria-label={lang === 'zh' ? '空中乐园前庭' : 'Sky park forecourt'}>
        <img src="/assets/park/sky-park-hero-v1.webp" alt={lang === 'zh' ? '云海中的空中乐园游乐岛' : 'A floating amusement park in the clouds'} decoding="async" fetchPriority="high" />
        <div className="sky-park-shade" aria-hidden="true" />
        <div className="sky-park-copy">
          <span>{lang === 'zh' ? '✦ 云端登机口已开启' : '✦ Sky gate now boarding'}</span>
          <h2>{lang === 'zh' ? '星星与欢笑，都在这里等你！' : 'Stars and laughter are waiting for you!'}</h2>
          <p>{lang === 'zh' ? '这里装着卷星所有的笑声。' : 'The park holds all the laughter of Juan Star.'}</p>
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

      <section className="park-game-hub" aria-labelledby="park-game-hub-title">
        <header className="park-game-hub-head">
          <div>
            <span>{lang === 'zh' ? 'SKY ARCADE · 云上游戏馆' : 'SKY ARCADE · GAME DECK'}</span>
            <h2 id="park-game-hub-title">{lang === 'zh' ? '选择一条游乐航线' : 'Choose a play route'}</h2>
          </div>
          <p>{lang === 'zh' ? '每类游戏都有自己的节奏，今天想去哪一站？' : 'Every game category has its own rhythm. Where will you go today?'}</p>
        </header>

        <div className="park-category-tabs" role="tablist" aria-label={lang === 'zh' ? '游戏分类' : 'Game categories'}>
          {PARK_CATEGORIES.map((item) => (
            <button
              type="button"
              key={item.id}
              role="tab"
              aria-selected={category === item.id}
              className={category === item.id ? 'active' : ''}
              onClick={() => { setCategory(item.id); setActiveGame(null); }}
            >
              <i aria-hidden="true">{item.mark}</i>
              <span><b>{lang === 'zh' ? item.zh : item.en}</b><small>{lang === 'zh' ? item.hintZh : item.hintEn}</small></span>
            </button>
          ))}
        </div>

        <div className="park-game-shelf" role="tabpanel" aria-label={lang === 'zh' ? `${PARK_CATEGORIES.find((item) => item.id === category)?.zh}游戏` : `${PARK_CATEGORIES.find((item) => item.id === category)?.en} games`}>
          {category === 'board' ? (
            <div className="park-board-game-grid">
              <article className="park-gomoku-card">
                <div className="park-gomoku-preview" aria-hidden="true">
                  <div className="park-gomoku-mini-grid" />
                  <i className="stone s1" /><i className="stone s2" /><i className="stone s3" /><i className="stone s4" /><i className="stone s5" />
                  <span>五</span>
                </div>
                <div className="park-game-card-copy">
                  <span>{lang === 'zh' ? '棋类 · 单人对弈' : 'BOARD · SOLO MATCH'}</span>
                  <h3>{lang === 'zh' ? '星河五子棋' : 'Starlight Gomoku'}</h3>
                  <p>{lang === 'zh' ? '执黑先行，在云端星盘上率先连成五子。三档电脑棋力，随时可以悔一回合。' : 'Play black and connect five first. Three computer levels with one-turn undo.'}</p>
                  <div className="park-game-tags"><span>15 × 15</span><span>{lang === 'zh' ? '三档难度' : '3 levels'}</span><span>{lang === 'zh' ? '单人' : 'Solo'}</span></div>
                </div>
                <button type="button" className="park-game-launch" onClick={() => openGame('gomoku')}>
                  <span>{activeGame === 'gomoku' ? (lang === 'zh' ? '继续对弈' : 'Continue') : (lang === 'zh' ? '开始对弈' : 'Play now')}</span>
                  <i aria-hidden="true">→</i>
                </button>
              </article>

              <article className="park-gomoku-card park-xiangqi-card">
                <div className="park-xiangqi-preview" aria-hidden="true">
                  <div className="park-xiangqi-mini-lines" />
                  <i className="piece black p1">将</i><i className="piece black p2">馬</i><i className="piece red p3">炮</i><i className="piece red p4">帅</i>
                  <span>楚河汉界</span>
                </div>
                <div className="park-game-card-copy">
                  <span>{lang === 'zh' ? '棋类 · 楚河汉界' : 'BOARD · XIANGQI'}</span>
                  <h3>{lang === 'zh' ? '云台中国象棋' : 'Cloud Xiangqi'}</h3>
                  <p>{lang === 'zh' ? '执红先行，排兵布阵。完整象棋走法、合法落点、将军提示与三档电脑棋力。' : 'Play red with complete Xiangqi moves, legal hints, check alerts, and three computer levels.'}</p>
                  <div className="park-game-tags"><span>9 × 10</span><span>{lang === 'zh' ? '完整规则' : 'Full rules'}</span><span>{lang === 'zh' ? '单人' : 'Solo'}</span></div>
                </div>
                <button type="button" className="park-game-launch xiangqi" onClick={() => openGame('xiangqi')}>
                  <span>{activeGame === 'xiangqi' ? (lang === 'zh' ? '继续对弈' : 'Continue') : (lang === 'zh' ? '开始对弈' : 'Play now')}</span>
                  <i aria-hidden="true">→</i>
                </button>
              </article>
            </div>
          ) : category === 'match' ? (
            <div className="park-board-game-grid">
              <article className="park-gomoku-card park-lianliankan-card">
                <div className="park-lianliankan-preview" aria-hidden="true">
                  <span className="mini t1">🎈</span>
                  <span className="mini t2">🌙</span>
                  <span className="mini t3">🍭</span>
                  <span className="mini t4">🐬</span>
                  <span className="seal">连</span>
                  <span className="mini t5">🌈</span>
                  <span className="mini t6">🚀</span>
                  <span className="mini t7">🍩</span>
                  <span className="mini t8">⭐</span>
                  <span className="mini t9">🎈</span>
                  <svg className="link" viewBox="0 0 100 100">
                    <polyline points="22,22 22,7 78,7 78,78" pathLength={1} />
                  </svg>
                </div>
                <div className="park-game-card-copy">
                  <span>{lang === 'zh' ? '消除 · 云上配对' : 'MATCH · SKY PAIRS'}</span>
                  <h3>{lang === 'zh' ? '云径连连看' : 'Cloud Path Match'}</h3>
                  <p>{lang === 'zh' ? '点亮两块相同的云间图案，用不超过两个弯的折线把它们连在一起消掉。自由练习随时玩，闯关模式 20 关难度递增：云岩障碍与限时挑战逐步登场。' : 'Link two matching tiles with a path of at most two bends. Free play any time, or take on 20 stages of rising challenge with cloud rocks and time limits.'}</p>
                  <div className="park-game-tags"><span>8 × 6</span><span>{lang === 'zh' ? '闯关 20 关' : '20 stages'}</span><span>{lang === 'zh' ? '提示与重排' : 'Hint & shuffle'}</span></div>
                </div>
                <button type="button" className="park-game-launch lianliankan" onClick={() => openGame('lianliankan')}>
                  <span>{activeGame === 'lianliankan' ? (lang === 'zh' ? '继续配对' : 'Continue') : (lang === 'zh' ? '开始配对' : 'Play now')}</span>
                  <i aria-hidden="true">→</i>
                </button>
              </article>
            </div>
          ) : (
            <div className="park-category-coming">
              <i aria-hidden="true">{PARK_CATEGORIES.find((item) => item.id === category)?.mark}</i>
              <div><span>{lang === 'zh' ? '新航线筹备中' : 'NEW ROUTE IN PROGRESS'}</span><b>{lang === 'zh' ? `${PARK_CATEGORIES.find((item) => item.id === category)?.zh}游戏正在精心打磨` : `${PARK_CATEGORIES.find((item) => item.id === category)?.en} games are being crafted`}</b><p>{lang === 'zh' ? '完成品质验收后才会开放，不用担心点进空白游戏。' : 'This category will open only after its games pass quality review.'}</p></div>
            </div>
          )}
        </div>
      </section>

      {activeGame && <div ref={gameRef} className="park-active-game">
        {activeGame === 'gomoku'
          ? <GomokuGame lang={lang} playerName={child.name} onComplete={handleGomokuComplete} />
          : activeGame === 'xiangqi'
            ? <ChineseChessGame lang={lang} playerName={child.name} onComplete={handleXiangqiComplete} />
            : <LianliankanGame lang={lang} playerName={child.name} onComplete={handleLianliankanComplete} />}
      </div>}

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
