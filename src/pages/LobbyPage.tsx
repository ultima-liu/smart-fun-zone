import BackButton from '../components/BackButton';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, todayPlaySec, streakDays } from '../store';
import { courseTotalStars } from '../activeCourses';
import { useI18n } from '../i18n';
import { KidButton } from '../components/ui';
import Modal from '../components/Modal';
import { speakAsNpc } from '../speech';
import { npcMeta } from '../content/npc';
import { IconCoin } from '../components/icons';
import NpcBuddy from '../components/NpcBuddy';
import GomokuGame from '../games/GomokuGame';
import ChineseChessGame from '../games/ChineseChessGame';
import LianliankanGame, { type LianliankanOutcome } from '../games/LianliankanGame';
import TetrisGame, { type TetrisOutcome } from '../games/TetrisGame';
import BubbleShooterGame, { type BubbleShooterOutcome } from '../games/BubbleShooterGame';
import SnakeGame, { type SnakeOutcome } from '../games/SnakeGame';
import BreakoutGame, { type BreakoutOutcome } from '../games/BreakoutGame';
import FishEatsFishGame, { type FishOutcome } from '../games/FishEatsFishGame';
import MinesweeperGame, { type MinesweeperOutcome } from '../games/MinesweeperGame';
import SokobanGame, { type SokobanOutcome } from '../games/SokobanGame';
import KlotskiGame, { type KlotskiOutcome } from '../games/KlotskiGame';
import MemoryGame, { type MemoryOutcome } from '../games/MemoryGame';
import SolitaireGame, { type SolitaireOutcome } from '../games/SolitaireGame';
import GoldMinerGame, { type GoldMinerOutcome } from '../games/GoldMinerGame';
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
  const [activeGame, setActiveGame] = useState<'gomoku' | 'xiangqi' | 'lianliankan' | 'tetris' | 'bubbles' | 'snake' | 'breakout' | 'fish' | 'mines' | 'sokoban' | 'klotski' | 'memory' | 'solitaire' | 'gold-miner' | null>(null);
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

  const handleTetrisComplete = useCallback((outcome: TetrisOutcome) => {
    if (!child) return;
    addRecord({
      id: `blocks-${child.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      childId: child.id,
      gameId: 'sky-blocks',
      level: outcome.difficulty === 'easy' ? 1 : outcome.difficulty === 'normal' ? 2 : 3,
      stars: 0,
      correct: 0,
      total: 1,
      durationSec: outcome.durationSec,
      playedAt: Date.now(),
    });
  }, [addRecord, child]);

  const handleSnakeComplete = useCallback((outcome: SnakeOutcome) => {
    if (!child) return;
    addRecord({
      id: `snake-${child.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      childId: child.id,
      gameId: 'sky-snake',
      level: outcome.difficulty === 'easy' ? 1 : outcome.difficulty === 'normal' ? 2 : 3,
      stars: 0,
      correct: 0,
      total: 1,
      durationSec: outcome.durationSec,
      playedAt: Date.now(),
    });
  }, [addRecord, child]);

  const handleBreakoutComplete = useCallback((outcome: BreakoutOutcome) => {
    if (!child) return;
    addRecord({
      id: `breakout-${child.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      childId: child.id,
      gameId: 'sky-breakout',
      level: outcome.difficulty === 'easy' ? 1 : outcome.difficulty === 'normal' ? 2 : 3,
      stars: 0,
      correct: 0,
      total: 1,
      durationSec: outcome.durationSec,
      playedAt: Date.now(),
    });
  }, [addRecord, child]);

  const handleFishComplete = useCallback((outcome: FishOutcome) => {
    if (!child) return;
    addRecord({
      id: `fish-${child.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      childId: child.id,
      gameId: 'sky-fish',
      level: outcome.difficulty === 'easy' ? 1 : outcome.difficulty === 'normal' ? 2 : 3,
      stars: 0,
      correct: outcome.result === 'win' ? 1 : 0,
      total: 1,
      durationSec: outcome.durationSec,
      playedAt: Date.now(),
    });
  }, [addRecord, child]);

  const handleMinesComplete = useCallback((outcome: MinesweeperOutcome) => {
    if (!child) return;
    addRecord({
      id: `mines-${child.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      childId: child.id,
      gameId: 'sky-mines',
      level: outcome.difficulty === 'easy' ? 1 : outcome.difficulty === 'normal' ? 2 : 3,
      stars: 0,
      correct: outcome.result === 'win' ? 1 : 0,
      total: 1,
      durationSec: outcome.durationSec,
      playedAt: Date.now(),
    });
  }, [addRecord, child]);

  const handleBubblesComplete = useCallback((outcome: BubbleShooterOutcome) => {
    if (!child) return;
    addRecord({
      id: `bubbles-${child.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      childId: child.id,
      gameId: 'sky-bubbles',
      level: outcome.difficulty === 'easy' ? 1 : outcome.difficulty === 'normal' ? 2 : 3,
      stars: 0,
      correct: 0,
      total: 1,
      durationSec: outcome.durationSec,
      playedAt: Date.now(),
    });
  }, [addRecord, child]);

  const handleSokobanComplete = useCallback((outcome: SokobanOutcome) => {
    if (!child) return;
    addRecord({
      id: `sokoban-${child.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      childId: child.id,
      gameId: 'sky-sokoban',
      level: outcome.level,
      stars: 0,
      correct: 1,
      total: 1,
      durationSec: outcome.durationSec,
      playedAt: Date.now(),
    });
  }, [addRecord, child]);

  const handleKlotskiComplete = useCallback((outcome: KlotskiOutcome) => {
    if (!child) return;
    addRecord({
      id: `klotski-${child.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      childId: child.id,
      gameId: 'sky-klotski',
      level: outcome.level,
      stars: 0,
      correct: 1,
      total: 1,
      durationSec: outcome.durationSec,
      playedAt: Date.now(),
    });
  }, [addRecord, child]);

  const handleMemoryComplete = useCallback((outcome: MemoryOutcome) => {
    if (!child) return;
    addRecord({
      id: `memory-${child.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      childId: child.id,
      gameId: 'sky-memory',
      level: outcome.difficulty === 'easy' ? 1 : outcome.difficulty === 'normal' ? 2 : 3,
      stars: 0,
      correct: 1,
      total: 1,
      durationSec: outcome.durationSec,
      playedAt: Date.now(),
    });
  }, [addRecord, child]);

  const handleSolitaireComplete = useCallback((outcome: SolitaireOutcome) => {
    if (!child) return;
    addRecord({
      id: `solitaire-${child.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      childId: child.id,
      gameId: 'sky-solitaire',
      level: outcome.difficulty === 'easy' ? 1 : outcome.difficulty === 'normal' ? 2 : 3,
      stars: 0,
      correct: 1,
      total: 1,
      durationSec: outcome.durationSec,
      playedAt: Date.now(),
    });
  }, [addRecord, child]);

  const handleGoldMinerComplete = useCallback((outcome: GoldMinerOutcome) => {
    if (!child) return;
    addRecord({
      id: `gold-miner-${child.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      childId: child.id,
      gameId: 'sky-gold-miner',
      level: outcome.level,
      stars: 0,
      correct: outcome.result === 'win' ? 1 : 0,
      total: 1,
      durationSec: outcome.durationSec,
      playedAt: Date.now(),
    });
  }, [addRecord, child]);

  const openGame = (game: 'gomoku' | 'xiangqi' | 'lianliankan' | 'tetris' | 'bubbles' | 'snake' | 'breakout' | 'fish' | 'mines' | 'sokoban' | 'klotski' | 'memory' | 'solitaire' | 'gold-miner') => {
    setActiveGame(game);
    window.requestAnimationFrame(() => gameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  if (!child) return null;

  const totalStars = courseTotalStars(child.id, mastery, records);
  const streak = streakDays(records, child.id);
  const gameBack = <BackButton label={lang === 'zh' ? '返回' : 'Back'} aria-label={lang === 'zh' ? '返回游戏列表' : 'Back to games'} onClick={() => {
    setActiveGame(null);
    document.getElementById('park-game-hub-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }} />;

  return (
    <div className="page lobby">
      <NpcBuddy npc="泡泡" />
      <header className="park-command-header">
        <BackButton onClick={() => nav('/')} label={lang === 'zh' ? '返回首页' : 'Back to home'} />
        <div className="park-command-copy">
          <span>{lang === 'zh' ? 'SKY PARK · 云端游乐航站' : 'SKY PARK · PLAY PORT'}</span>
          <h1>{t('lobby')}</h1>
          <p>{lang === 'zh' ? `${child.name}，欢迎回到空中乐园！` : `${child.name}, welcome back to Sky Park!`}</p>
        </div>
        <div className="park-metrics" aria-label={lang === 'zh' ? '我的乐园数据' : 'My park statistics'}>
          <span><i>⭐</i><b>{totalStars}</b><small>{t('totalStars')}</small></span>
          <span><i><IconCoin size={15} gradient="gold" /></i><b>{points}</b><small>{t('beans')}</small></span>
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
          ) : category === 'card' ? (
            <div className="park-board-game-grid">
              <article className="park-gomoku-card park-memory-card">
                <div className="park-memory-preview" aria-hidden="true">
                  <div className="park-memory-field">
                    <i className="mc">✦</i>
                    <i className="mc flip star">⭐</i>
                    <i className="mc">✦</i>
                    <i className="mc">✦</i>
                    <i className="mc flip moon">🌙</i>
                    <i className="mc">✦</i>
                    <i className="mc flip moon glow">🌙</i>
                    <i className="mc">✦</i>
                    <i className="mc">✦</i>
                    <i className="mc flip star">⭐</i>
                    <i className="mc">✦</i>
                    <i className="mc flip star glow">⭐</i>
                  </div>
                  <span>翻</span>
                </div>
                <div className="park-game-card-copy">
                  <span>{lang === 'zh' ? '牌类 · 翻牌配对' : 'CARDS · MEMORY PAIRS'}</span>
                  <h3>{lang === 'zh' ? '星牌记忆' : 'Star Card Memory'}</h3>
                  <p>{lang === 'zh' ? '云桌上扣着一排星牌：翻开两张一样的就配成一对，全部配对完成就获胜。连续配对叠连击，每局还有一次「记忆提示」帮你亮一对！' : 'Cards lie face down on the cloud table — flip two alike to pair them up and clear the sky. Chain matches for combos, with one memory hint per round!'}</p>
                  <div className="park-game-tags"><span>{lang === 'zh' ? '4×4 起' : 'From 4×4'}</span><span>{lang === 'zh' ? '三档棋盘' : '3 boards'}</span><span>{lang === 'zh' ? '连击与提示' : 'Combo & hint'}</span></div>
                </div>
                <button type="button" className="park-game-launch memory" onClick={() => openGame('memory')}>
                  <span>{activeGame === 'memory' ? (lang === 'zh' ? '继续翻牌' : 'Continue') : (lang === 'zh' ? '开始翻牌' : 'Play now')}</span>
                  <i aria-hidden="true">→</i>
                </button>
              </article>

              <article className="park-gomoku-card park-solitaire-card">
                <div className="park-solitaire-preview" aria-hidden="true">
                  <i className="pcard back s1" />
                  <i className="pcard up red s2"><b>Q<i>♥</i></b></i>
                  <i className="pcard found s3"><b>A<i>♠</i></b></i>
                  <i className="pcard up blk s4"><b>K<i>♣</i></b></i>
                  <i className="pcard up red s5"><b>J<i>♦</i></b></i>
                  <i className="pcard up blk s6"><b>10<i>♠</i></b></i>
                  <i className="pcard up red s7"><b>9<i>♥</i></b></i>
                  <span>接</span>
                </div>
                <div className="park-game-card-copy">
                  <span>{lang === 'zh' ? '牌类 · 单人接龙' : 'CARDS · SOLITAIRE'}</span>
                  <h3>{lang === 'zh' ? '云阶接龙' : 'Cloud Cascade'}</h3>
                  <p>{lang === 'zh' ? '经典单人纸牌接龙：把每种花色从 A 到 K 依次收进四座星光宝座。牌桌上红黑相间、大数压小数接力，空位只放 K，支持撤销与一键收牌！' : 'Classic Klondike solitaire: build each suit from A to K on four star thrones. Stack opposite colors in descending order, kings open empty columns — undo and auto-finish included!'}</p>
                  <div className="park-game-tags"><span>{lang === 'zh' ? '经典 Klondike' : 'Classic'}</span><span>{lang === 'zh' ? '翻 1 / 翻 3' : 'Draw 1 / 3'}</span><span>{lang === 'zh' ? '撤销与提示' : 'Undo & hint'}</span></div>
                </div>
                <button type="button" className="park-game-launch solitaire" onClick={() => openGame('solitaire')}>
                  <span>{activeGame === 'solitaire' ? (lang === 'zh' ? '继续接龙' : 'Continue') : (lang === 'zh' ? '开始接龙' : 'Play now')}</span>
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

              <article className="park-gomoku-card park-blocks-card">
                <div className="park-blocks-preview" aria-hidden="true">
                  <div className="srow base">
                    <i className="pb c3 k0" /><i className="pb c5 k1" /><i className="pb c0 k2" /><i className="pb c1 k3" /><i className="pb c6 k4" /><i className="pb c2 k5" /><i className="pb c4 k6" />
                  </div>
                  <div className="srow raise">
                    <i className="pb c1 k1" /><i className="pb c4 k2" /><i className="pb c0 k3" />
                  </div>
                  <div className="fall">
                    <i className="pb c5 k0 r0" /><i className="pb c5 k1 r0" /><i className="pb c5 k2 r0" /><i className="pb c5 k1 r1" />
                  </div>
                  <span>落</span>
                </div>
                <div className="park-game-card-copy">
                  <span>{lang === 'zh' ? '消除 · 俄罗斯方块' : 'MATCH · BLOCKFALL'}</span>
                  <h3>{lang === 'zh' ? '星落方块' : 'Starfall Blocks'}</h3>
                  <p>{lang === 'zh' ? '云间飘落七色方块，旋转、拼搭、整行消除。一次消多行、连续消除都有加分，速度还会越落越快！' : 'Rotate the drifting blocks, fill full rows to clear. Multi-row clears and combos score extra as the fall speeds up!'}</p>
                  <div className="park-game-tags"><span>10 × 20</span><span>{lang === 'zh' ? '暂存与预览' : 'Hold & next'}</span><span>{lang === 'zh' ? '连击加分' : 'Combo bonus'}</span></div>
                </div>
                <button type="button" className="park-game-launch blocks" onClick={() => openGame('tetris')}>
                  <span>{activeGame === 'tetris' ? (lang === 'zh' ? '继续拼搭' : 'Continue') : (lang === 'zh' ? '开始拼搭' : 'Play now')}</span>
                  <i aria-hidden="true">→</i>
                </button>
              </article>

              <article className="park-gomoku-card park-bubbles-card">
                <div className="park-bubbles-preview" aria-hidden="true">
                  <i className="bub c1 r0 k0" /><i className="bub c5 r0 k1" /><i className="bub c3 r0 k2" /><i className="bub c6 r0 k3" />
                  <i className="bub c5 r1 k0" /><i className="bub c5 r1 k1" /><i className="bub c2 r1 k2" />
                  <i className="bub c3 r2 k0" /><i className="bub c5 r2 k1 flash" /><i className="bub c3 r2 k2" />
                  <span className="fly c6" />
                  <span className="cannon" />
                  <span>泡</span>
                </div>
                <div className="park-game-card-copy">
                  <span>{lang === 'zh' ? '消除 · 泡泡龙' : 'MATCH · BUBBLE DRAGON'}</span>
                  <h3>{lang === 'zh' ? '云海泡泡龙' : 'Cloud Bubble Dragon'}</h3>
                  <p>{lang === 'zh' ? '转动泡泡龙炮台，把同色泡泡射进云阵：三颗相连砰砰消散，悬空的泡泡还会整串掉落加分。小心云层每隔几泡下降一次，别让泡泡越过警戒线！' : 'Aim the dragon cannon and shoot bubbles into the honeycomb — match 3 colors to pop them, free floating clusters for bonus. The clouds sink every few shots, so stay above the danger line!'}</p>
                  <div className="park-game-tags"><span>{lang === 'zh' ? '10 列蜂窝' : 'Honeycomb'}</span><span>{lang === 'zh' ? '三消与坠泡' : 'Pop & drop'}</span><span>{lang === 'zh' ? '无尽云层' : 'Endless layers'}</span></div>
                </div>
                <button type="button" className="park-game-launch bubbles" onClick={() => openGame('bubbles')}>
                  <span>{activeGame === 'bubbles' ? (lang === 'zh' ? '继续吹泡' : 'Continue') : (lang === 'zh' ? '开始吹泡' : 'Play now')}</span>
                  <i aria-hidden="true">→</i>
                </button>
              </article>
            </div>
          ) : category === 'puzzle' ? (
            <div className="park-board-game-grid">
              <article className="park-gomoku-card park-mines-card">
                <div className="park-mines-preview" aria-hidden="true">
                  <div className="park-mines-field">
                    <i className="pm on n1">1</i>
                    <i className="pm on" />
                    <i className="pm fl">⚑</i>
                    <i className="pm" />
                    <i className="pm on n3">3</i>
                    <i className="pm" />
                    <i className="pm on n2">2</i>
                    <i className="pm bz">💣</i>
                    <i className="pm" />
                    <i className="pm on n1">1</i>
                    <i className="pm" />
                    <i className="pm on" />
                    <i className="pm" />
                    <i className="pm on n2">2</i>
                    <i className="pm" />
                    <i className="pm on n1">1</i>
                  </div>
                  <span>雷</span>
                </div>
                <div className="park-game-card-copy">
                  <span>{lang === 'zh' ? '益智 · 星屿排雷' : 'PUZZLE · MINE ISLES'}</span>
                  <h3>{lang === 'zh' ? '星屿扫雷' : 'Star Isle Mines'}</h3>
                  <p>{lang === 'zh' ? '星屿下埋着淘气的星雷：翻开的数字会提示周围一圈埋着几颗，空白会自动连开。给所有星雷插上旗子、翻开其余格子即可获胜；第一次翻格必定安全，还有贴心的排雷提示。' : 'Naughty mines hide under the isles. Numbers count the mines around, blanks chain open — flag every mine and open the rest to win. The first tap is always safe, with a kind hint to help.'}</p>
                  <div className="park-game-tags"><span>{lang === 'zh' ? '8×8 起' : 'From 8×8'}</span><span>{lang === 'zh' ? '首格安全' : 'Safe first tap'}</span><span>{lang === 'zh' ? '插旗与提示' : 'Flag & hint'}</span></div>
                </div>
                <button type="button" className="park-game-launch mines" onClick={() => openGame('mines')}>
                  <span>{activeGame === 'mines' ? (lang === 'zh' ? '继续排雷' : 'Continue') : (lang === 'zh' ? '开始排雷' : 'Play now')}</span>
                  <i aria-hidden="true">→</i>
                </button>
              </article>

              <article className="park-gomoku-card park-sokoban-card">
                <div className="park-sokoban-preview" aria-hidden="true">
                  <i className="pw a" />
                  <i className="pw b" />
                  <i className="ps crate c1" />
                  <i className="ps crate c2 done" />
                  <i className="ps hero" />
                  <span className="pad" />
                  <span>箱</span>
                </div>
                <div className="park-game-card-copy">
                  <span>{lang === 'zh' ? '益智 · 星云货仓' : 'PUZZLE · STAR CRATES'}</span>
                  <h3>{lang === 'zh' ? '星仓推箱' : 'Star Crate Push'}</h3>
                  <p>{lang === 'zh' ? '夜间货仓摆着几只星箱：推动它们卡进发光的星光托盘，全部就位就通关。箱子只能推不能拉，走错了可以撤销，12 关从轻松一路推到高手！' : 'Push every crate onto its glowing star pad to clear the night warehouse. Crates only push — undo any mistake and climb 12 levels from breeze to master!'}</p>
                  <div className="park-game-tags"><span>{lang === 'zh' ? '12 关三档' : '12 levels'}</span><span>{lang === 'zh' ? '撤销无忧' : 'Undo anytime'}</span><span>{lang === 'zh' ? '键盘+方向盘' : 'Keys & pad'}</span></div>
                </div>
                <button type="button" className="park-game-launch sokoban" onClick={() => openGame('sokoban')}>
                  <span>{activeGame === 'sokoban' ? (lang === 'zh' ? '继续运箱' : 'Continue') : (lang === 'zh' ? '开始运箱' : 'Play now')}</span>
                  <i aria-hidden="true">→</i>
                </button>
              </article>

              <article className="park-gomoku-card park-klotski-card park-card-wide">
                <div className="park-klotski-preview" aria-hidden="true">
                  <i className="pk v l1">张</i>
                  <i className="pk cao">曹</i>
                  <i className="pk v l3">赵</i>
                  <i className="pk s g1">卒</i>
                  <i className="pk s g2">卒</i>
                  <span className="gate" />
                </div>
                <div className="park-game-card-copy">
                  <span>{lang === 'zh' ? '益智 · 星门布阵' : 'PUZZLE · STAR GATE'}</span>
                  <h3>{lang === 'zh' ? '星门华容' : 'Star Gate Escape'}</h3>
                  <p>{lang === 'zh' ? '星门城下棋块林立：拖动木块腾出通道，护送鎏金的曹操从下方星门出城。六座布阵从让开小道到经典横刀立马，同块连滑只记一步！' : 'Slide the wooden blocks aside and escort gold Cao Cao out through the star gate. Six layouts from a gentle warm-up to the classic final gate!'}</p>
                  <div className="park-game-tags"><span>{lang === 'zh' ? '六阵闯关' : '6 layouts'}</span><span>{lang === 'zh' ? '拖动滑块' : 'Drag to slide'}</span><span>{lang === 'zh' ? '经典横刀立马' : 'Classic finale'}</span></div>
                </div>
                <button type="button" className="park-game-launch klotski" onClick={() => openGame('klotski')}>
                  <span>{activeGame === 'klotski' ? (lang === 'zh' ? '继续破阵' : 'Continue') : (lang === 'zh' ? '开始破阵' : 'Play now')}</span>
                  <i aria-hidden="true">→</i>
                </button>
              </article>

              <article className="park-gomoku-card park-gold-miner-card park-card-wide">
                <div className="park-gold-miner-preview" aria-hidden="true">
                  <span className="ridge" />
                  <img className="miner" src="/assets/games/gold-miner/miner-hero-v1.webp" alt="" draggable={false} />
                  <span className="rope"><i /></span>
                  <i className="nugget big" />
                  <i className="nugget small a" />
                  <i className="nugget small b" />
                  <i className="rock" />
                  <b>金</b>
                </div>
                <div className="park-game-card-copy">
                  <span>{lang === 'zh' ? '益智 · 云下寻宝' : 'PUZZLE · CLOUD PROSPECTING'}</span>
                  <h3>{lang === 'zh' ? '云端黄金矿工' : 'Cloud Gold Miner'}</h3>
                  <p>{lang === 'zh' ? '看准摆钩方向放下飞爪，把金块、星钻和神秘袋拉回云上矿车。轻宝物回收快，大金块分数高；抓到沉重云岩时，果断用炸药脱身！' : 'Time the swinging claw to haul gold, star diamonds, and mystery bags into your cloud cart. Light treasure reels fast, giant gold pays big — blast heavy rocks away!'}</p>
                  <div className="park-game-tags"><span>{lang === 'zh' ? '五层寻宝' : '5 levels'}</span><span>{lang === 'zh' ? '摆钩抓取' : 'Swing & grab'}</span><span>{lang === 'zh' ? '层间商店' : 'Supply shop'}</span></div>
                </div>
                <button type="button" className="park-game-launch gold-miner" onClick={() => openGame('gold-miner')}>
                  <span>{activeGame === 'gold-miner' ? (lang === 'zh' ? '继续寻金' : 'Continue') : (lang === 'zh' ? '开始寻金' : 'Start mining')}</span>
                  <i aria-hidden="true">→</i>
                </button>
              </article>
            </div>
          ) : category === 'reflex' ? (
            <div className="park-board-game-grid">
              <article className="park-gomoku-card park-snake-card">
                <div className="park-snake-preview" aria-hidden="true">
                  <i className="pc t0 p0" /><i className="pc t1 p1" /><i className="pc t2 p2" /><i className="pc t3 p3" /><i className="pc t4 p4" />
                  <i className="pc t5 p5" /><i className="pc t6 p6" /><i className="pc t7 p7" /><i className="pc t8 p8" /><i className="pc t9 p9" />
                  <i className="pc hd" />
                  <span className="st">✦</span>
                  <span>蛇</span>
                </div>
                <div className="park-game-card-copy">
                  <span>{lang === 'zh' ? '敏捷 · 云间穿行' : 'REFLEX · SKY DASH'}</span>
                  <h3>{lang === 'zh' ? '追星小蛇' : 'Star Chaser'}</h3>
                  <p>{lang === 'zh' ? '操控云隙间的小蛇追着星星跑：吃得越多身子越长、速度越快，限时流星果值 50 分，还能按住冲刺、连吃叠连击。小心云壁和自己的尾巴！' : 'Steer the little snake after the stars: each one makes it longer and faster. Boost with a hold, chain quick bites for combos, and grab the 50-point shooting star before it flies away!'}</p>
                  <div className="park-game-tags"><span>15 × 15</span><span>{lang === 'zh' ? '冲刺与连击' : 'Boost & combo'}</span><span>{lang === 'zh' ? '流星果加分' : 'Shooting star'}</span></div>
                </div>
                <button type="button" className="park-game-launch snake" onClick={() => openGame('snake')}>
                  <span>{activeGame === 'snake' ? (lang === 'zh' ? '继续追星' : 'Continue') : (lang === 'zh' ? '开始追星' : 'Play now')}</span>
                  <i aria-hidden="true">→</i>
                </button>
              </article>

              <article className="park-gomoku-card park-breakout-card">
                <div className="park-breakout-preview" aria-hidden="true">
                  <i className="bq r0 c0" /><i className="bq r0 c1" /><i className="bq r0 c2" /><i className="bq r0 c3" /><i className="bq r0 c4" /><i className="bq r0 c5" /><i className="bq r0 c6" /><i className="bq r0 c7" />
                  <i className="bq r1 c0" /><i className="bq r1 c1" /><i className="bq r1 c2" /><i className="bq r1 c3" /><i className="bq r1 c4" /><i className="bq r1 c5" /><i className="bq r1 c6" /><i className="bq r1 c7" />
                  <i className="bq r2 c1" /><i className="bq r2 c2 star" /><i className="bq r2 c3" /><i className="bq r2 c4" /><i className="bq r2 c5" /><i className="bq r2 c6" />
                  <span className="pb" />
                  <i className="pd" />
                  <span>弹</span>
                </div>
                <div className="park-game-card-copy">
                  <span>{lang === 'zh' ? '敏捷 · 云海弹星' : 'REFLEX · CLOUD BOUNCE'}</span>
                  <h3>{lang === 'zh' ? '云舟弹星' : 'Star Bounce'}</h3>
                  <p>{lang === 'zh' ? '驾驶云舟接住星弹，把云海上的星砖阵一一敲碎：连续敲砖叠连击，星辉砖掉落加宽、分裂、减速与补命道具，一关比一关快！' : 'Pilot the cloud boat, keep the star ball bouncing and clear every brick wall. Chain breaks for combos, catch glowing power-ups, and race the rising speed stage by stage!'}</p>
                  <div className="park-game-tags"><span>8 × N</span><span>{lang === 'zh' ? '连击与道具' : 'Combo & power-ups'}</span><span>{lang === 'zh' ? '无尽关卡' : 'Endless stages'}</span></div>
                </div>
                <button type="button" className="park-game-launch breakout" onClick={() => openGame('breakout')}>
                  <span>{activeGame === 'breakout' ? (lang === 'zh' ? '继续弹星' : 'Continue') : (lang === 'zh' ? '开始弹星' : 'Play now')}</span>
                  <i aria-hidden="true">→</i>
                </button>
              </article>

              <article className="park-gomoku-card park-fish-card park-card-wide">
                <div className="park-fish-preview" aria-hidden="true"><i className="fish-small one">🐠</i><i className="fish-small two">🐟</i><i className="fish-hero">🐡</i><i className="fish-bubble a" /><i className="fish-bubble b" /><span>鱼</span></div>
                <div className="park-game-card-copy">
                  <span>{lang === 'zh' ? '敏捷 · 珊瑚海奇遇' : 'REFLEX · CORAL SEA'}</span>
                  <h3>{lang === 'zh' ? '大鱼吃小鱼' : 'Fish Eats Fish'}</h3>
                  <p>{lang === 'zh' ? '潜入珊瑚海追逐会逃散的小鱼群，抢到闪亮金鱼，闪开大鱼蓄力扑击还能反赚分数！连吃、冲刺，一路长成海洋之星。' : 'Chase scattering schools, catch golden fish, and dodge telegraphed predator lunges for bonus points. Chain bites and boost your way to ocean stardom!'}</p>
                  <div className="park-game-tags"><span>{lang === 'zh' ? '鱼群突袭' : 'Fish schools'}</span><span>{lang === 'zh' ? '金鱼奖励' : 'Golden fish'}</span><span>{lang === 'zh' ? '闪避反击' : 'Dodge bonus'}</span></div>
                </div>
                <button type="button" className="park-game-launch fish" onClick={() => openGame('fish')}><span>{activeGame === 'fish' ? (lang === 'zh' ? '继续潜游' : 'Continue') : (lang === 'zh' ? '开始潜游' : 'Dive in')}</span><i aria-hidden="true">→</i></button>
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
          ? <GomokuGame headerAction={gameBack} lang={lang} playerName={child.name} onComplete={handleGomokuComplete} />
          : activeGame === 'xiangqi'
            ? <ChineseChessGame headerAction={gameBack} lang={lang} playerName={child.name} onComplete={handleXiangqiComplete} />
            : activeGame === 'tetris'
              ? <TetrisGame headerAction={gameBack} lang={lang} playerName={child.name} onComplete={handleTetrisComplete} />
              : activeGame === 'bubbles'
                ? <BubbleShooterGame headerAction={gameBack} lang={lang} playerName={child.name} onComplete={handleBubblesComplete} />
              : activeGame === 'snake'
                ? <SnakeGame headerAction={gameBack} lang={lang} playerName={child.name} onComplete={handleSnakeComplete} />
                : activeGame === 'breakout'
                  ? <BreakoutGame headerAction={gameBack} lang={lang} playerName={child.name} onComplete={handleBreakoutComplete} />
                  : activeGame === 'fish'
                    ? <FishEatsFishGame headerAction={gameBack} lang={lang} playerName={child.name} onComplete={handleFishComplete} />
                  : activeGame === 'mines'
                  ? <MinesweeperGame headerAction={gameBack} lang={lang} playerName={child.name} onComplete={handleMinesComplete} />
                  : activeGame === 'sokoban'
                  ? <SokobanGame headerAction={gameBack} lang={lang} playerName={child.name} onComplete={handleSokobanComplete} />
                  : activeGame === 'klotski'
                  ? <KlotskiGame headerAction={gameBack} lang={lang} playerName={child.name} onComplete={handleKlotskiComplete} />
                  : activeGame === 'memory'
                  ? <MemoryGame headerAction={gameBack} lang={lang} playerName={child.name} onComplete={handleMemoryComplete} />
                  : activeGame === 'solitaire'
                  ? <SolitaireGame headerAction={gameBack} lang={lang} playerName={child.name} onComplete={handleSolitaireComplete} />
                  : activeGame === 'gold-miner'
                  ? <GoldMinerGame headerAction={gameBack} lang={lang} playerName={child.name} onComplete={handleGoldMinerComplete} />
                  : <LianliankanGame headerAction={gameBack} lang={lang} playerName={child.name} onComplete={handleLianliankanComplete} />}
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
