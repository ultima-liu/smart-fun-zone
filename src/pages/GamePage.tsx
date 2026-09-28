import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getGame } from '../games';
import { useStore, bestScoreForGame } from '../store';
import { useI18n } from '../i18n';
import { KidButton, TopBar, Confetti } from '../components/ui';
import Modal from '../components/Modal';
import Mascot from '../components/Mascot';
import { speak, speakAsNpc, playSfx } from '../speech';
import { npcMeta } from '../content/npc';
import type { GameRecord, GameResult } from '../types';

function buildRecord(childId: string, gameId: string, r: GameResult): GameRecord {
  return {
    id: `r${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    childId,
    gameId,
    level: 1,
    stars: 0,
    correct: 0,
    total: 0,
    durationSec: r.durationSec,
    playedAt: Date.now(),
    score: r.score,
  };
}

/** 乐园币掉落：按分数档 + 破纪录彩蛋 */
function coinsFor(score: number, isRecord: boolean): number {
  return Math.max(1, Math.floor(score / 40)) + (isRecord ? 3 : 0);
}

/** 连续玩几局后提醒休息（可继续） */
const REST_EVERY_ROUNDS = 2;

export default function GamePage() {
  const { gameId } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const records = useStore((s) => s.records);
  const addRecord = useStore((s) => s.addRecord);
  const applyGameCoins = useStore((s) => s.applyGameCoins);
  const def = gameId ? getGame(gameId) : undefined;

  const [started, setStarted] = useState(false);
  const [session, setSession] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [result, setResult] = useState<(GameResult & { coins: number; isRecord: boolean; best: number }) | null>(null);
  const [resting, setResting] = useState(false);

  /** 一局时长；e2e 用 ?t= 缩短（8 秒起） */
  const durationSec = useMemo(() => {
    if (!def) return 60;
    const t = Number(params.get('t'));
    return Number.isFinite(t) && t >= 8 ? Math.min(Math.floor(t), def.durationSec) : def.durationSec;
  }, [def, params]);

  useEffect(() => {
    if (!child || !def || def.status !== 'ready') nav('/lobby');
  }, [child, def, nav]);

  // 开局说明卡：泡泡把规则念给孩子听（语音会去表情符号，卡片上保留图标）
  useEffect(() => {
    if (started || !child || !def || def.status !== 'ready') return;
    const lines = def.rules[lang].map((r) =>
      r.replace(/[\p{Extended_Pictographic}]/gu, '').replace(/\s+/g, ' ').trim(),
    );
    speakAsNpc(`${def.name[lang]}！${lines.join('。')}`, npcMeta('泡泡'), lang);
  }, [started, child, def, lang]);

  const prevBest = def && child ? bestScoreForGame(records, child.id, def.id) : 0;

  if (!child || !def || def.status !== 'ready') return null;

  const handleFinish = (r: GameResult) => {
    const isRecord = r.score > prevBest && r.score > 0;
    const coins = coinsFor(r.score, isRecord);
    setResult({ ...r, coins, isRecord, best: Math.max(prevBest, r.score) });
    playSfx('win');
    speak(t('great'), lang);
    addRecord(buildRecord(child.id, def.id, r));
    applyGameCoins(child.id, coins);
    setRoundsPlayed((n) => n + 1);
  };

  const replay = () => {
    if (roundsPlayed >= REST_EVERY_ROUNDS) {
      setResting(true);
      return;
    }
    setResult(null);
    setSession((s) => s + 1);
  };

  return (
    <div className="page game-page">
      <TopBar
        title={
          <span>
            {def.icon} {def.name[lang]}
          </span>
        }
        onBack={() => nav('/lobby')}
      />

      {!started ? (
        <div className="arcade-intro" style={{ '--arcade-c': def.color } as CSSProperties}>
          <div className="arcade-intro-card">
            <span className="arcade-intro-icon" aria-hidden="true">{def.icon}</span>
            <h2 className="arcade-intro-title">{def.name[lang]}</h2>
            <p className="arcade-intro-eyebrow">{t('howToPlay')}</p>
            <p className="arcade-intro-desc">{def.desc[lang]}</p>
            <ul className="arcade-intro-rules">
              {def.rules[lang].map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            {!def.untimed && (
              <p className="arcade-intro-meta">⏱ {t('roundLength', { n: durationSec })}</p>
            )}
            <div className="arcade-intro-actions">
              <KidButton color="green" onClick={() => setStarted(true)}>
                ▶️ {t('startGame')}
              </KidButton>
            </div>
          </div>
        </div>
      ) : result ? (
        <div className="result-wrap">
          <Confetti show />
          <div className="result-panel">
            <div className="result-mascot">
              <Mascot pose="celebrate" size={104} />
            </div>
            <h2 className="result-title">{result.isRecord ? t('newRecord') : t('great')}</h2>
            <p className="arcade-score-big" aria-label={t('scoreLabel')}>
              {t('scoreLabel')} <b>{result.score}</b>
            </p>
            <p className="arcade-best">
              🏆 {t('bestScore')} {result.best}
            </p>
            <p className="arcade-coins">
              🪙 +{result.coins} {t('parkCoins')}
            </p>
            <div className="result-actions">
              <KidButton color="yellow" onClick={replay}>
                {t('playAgain')}
              </KidButton>
              <KidButton color="green" onClick={() => nav('/lobby')}>
                {t('lobby')}
              </KidButton>
            </div>
          </div>
        </div>
      ) : (
        <div className="game-stage" key={`${def.id}-${session}`}>
          <div className="game">
            {def.Component && (
              <def.Component child={child} durationSec={durationSec} onFinish={handleFinish} />
            )}
          </div>
        </div>
      )}

      {resting && (
        <Modal>
          <div className="modal-panel">
            <div className="modal-emoji">💧</div>
            <p className="modal-text">{t('restHintArcade')}</p>
            <div className="modal-actions">
              <KidButton color="white" onClick={() => nav('/lobby')}>
                {t('restBreak')}
              </KidButton>
              <KidButton color="green" onClick={() => { setResting(false); setResult(null); setSession((s) => s + 1); }}>
                {t('restGoOn')}
              </KidButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
