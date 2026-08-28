import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getGame } from '../games';
import { useStore } from '../store';
import { useI18n } from '../i18n';
import { KidButton, TopBar, Stars, Confetti } from '../components/ui';
import { SceneBanner } from '../components/scenes';
import Mascot from '../components/Mascot';
import { speak, playSfx, startMusic, stopMusic } from '../speech';
import type { GameRecord, GameResult } from '../types';

function buildRecord(childId: string, gameId: string, level: number, r: GameResult): GameRecord {
  return {
    id: `r${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    childId,
    gameId,
    level,
    stars: r.stars,
    correct: r.correct,
    total: r.total,
    durationSec: r.durationSec,
    playedAt: Date.now(),
  };
}

export default function GamePage() {
  const { gameId } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const addRecord = useStore((s) => s.addRecord);
  const addSkillResult = useStore((s) => s.addSkillResult);
  const def = gameId ? getGame(gameId) : undefined;
  const fromLearn = params.get('from') === 'learn';
  const skillId = params.get('skill');

  const [level, setLevel] = useState(1);
  const [session, setSession] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);

  const backTarget = fromLearn ? '/map' : '/lobby';

  useEffect(() => {
    if (!child || !def || def.status !== 'ready') nav('/lobby');
  }, [child, def, nav]);

  useEffect(() => {
    startMusic('game');
    return () => stopMusic();
  }, []);

  if (!child || !def || def.status !== 'ready') return null;

  const handleFinish = (r: GameResult) => {
    setResult(r);
    playSfx('win');
    speak(t('great'), lang);
    addRecord(buildRecord(child.id, def.id, level, r));
    // 学习流程：正确率达标则知识点 +1 星
    if (skillId && r.total > 0 && r.correct / r.total >= 0.8) {
      addSkillResult(child.id, skillId);
    }
  };

  const replay = () => {
    setResult(null);
    setSession((s) => s + 1);
  };

  const nextLevel = () => {
    setResult(null);
    setSession((s) => s + 1);
    setLevel((l) => Math.min(l + 1, def.levels));
  };

  return (
    <div className="page game-page">
      <TopBar
        title={
          <span>
            {def.icon} {def.name[lang]} · {t('level', { n: level })}
          </span>
        }
        onBack={() => nav(backTarget)}
      />

      <div className="level-pills">
        {Array.from({ length: def.levels }).map((_, i) => (
          <KidButton
            key={i}
            color={level === i + 1 ? 'green' : 'white'}
            className="level-pill"
            onClick={() => {
              setLevel(i + 1);
              setResult(null);
              setSession((s) => s + 1);
            }}
          >
            {i + 1}
          </KidButton>
        ))}
      </div>

      {result ? (
        <div className="result-wrap">
          <Confetti show />
          <div className="result-panel">
            <div className="result-mascot">
              <Mascot pose="celebrate" size={104} />
            </div>
            <h2 className="result-title">{t('great')}</h2>
            <div className="result-stars">
              <Stars count={result.stars} size={64} />
            </div>
            <p className="result-text">{t('earnedStars', { n: result.stars })}</p>
            <div className="result-actions">
              <KidButton color="yellow" onClick={replay}>
                {t('playAgain')}
              </KidButton>
              {level < def.levels && (
                <KidButton color="green" onClick={nextLevel}>
                  {t('nextLevel')}
                </KidButton>
              )}
              <KidButton color="white" onClick={() => nav(backTarget)}>
                {fromLearn ? t('backToMap') : t('lobby')}
              </KidButton>
            </div>
          </div>
        </div>
      ) : (
        <div className="game-stage" key={`${def.id}-${session}-${level}`}>
          <div className="game-scene-top">
            <SceneBanner kind={def.category} height={88} />
          </div>
          <div className="game">
            {def.Component && (
              <def.Component child={child} level={level} onFinish={handleFinish} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
