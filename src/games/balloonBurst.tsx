import { useEffect, useState } from 'react';
import type { GameDef } from '../gameRegistry';
import type { GameProps } from '../types';
import { playSfx } from '../speech';
import { ArcadeHud, useArcadeRound, paceForGrade } from './arcade';

interface Balloon {
  id: number;
  kind: 'color' | 'black';
  x: number; // 0~1
  y: number; // 1→0 上升，<0 出界
  v: number;
}

const BALLOON_EMOJI = ['🎈', '🟠', '🟡', '🟢', '🔵', '🟣', '🔴'];
let seq = 0;

function BalloonBurstGame({ child, durationSec, onFinish }: GameProps) {
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [score, setScore] = useState(0);
  const [hurt, setHurt] = useState(false);
  const { timeLeft, scoreRef, startRef } = useArcadeRound(durationSec, onFinish);
  const pace = paceForGrade(child.ageBand);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      const progress = Math.min(1, (now - startRef.current) / (durationSec * 1000));
      const baseV = (0.005 + progress * 0.006) * pace;
      setBalloons((prev) => {
        const moved = prev
          .map((b) => ({ ...b, y: b.y - b.v }))
          .filter((b) => b.y > -0.12);
        if (Math.random() < (0.2 + progress * 0.22) * pace) {
          moved.push({
            id: ++seq,
            kind: Math.random() < 0.16 + progress * 0.1 ? 'black' : 'color',
            x: 0.06 + Math.random() * 0.88,
            y: 1.08,
            v: baseV * (0.8 + Math.random() * 0.4),
          });
        }
        return moved;
      });
    }, 60);
    return () => window.clearInterval(id);
  }, []);

  const pop = (b: Balloon) => {
    setBalloons((prev) => prev.filter((x) => x.id !== b.id));
    if (b.kind === 'black') {
      playSfx('wrong');
      scoreRef.current = Math.max(0, scoreRef.current - 10);
      setHurt(true);
      window.setTimeout(() => setHurt(false), 350);
    } else {
      playSfx('pop');
      scoreRef.current += 5;
    }
    setScore(scoreRef.current);
  };

  return (
    <div className="arcade-game balloon-burst">
      <ArcadeHud score={score} timeLeft={timeLeft} />
      <div className={`burst-field ${hurt ? 'hurt' : ''}`}>
        {balloons.map((b) => (
          <button
            key={b.id}
            className={`balloon ${b.kind}`}
            style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%` }}
            onClick={() => pop(b)}
          >
            {b.kind === 'black' ? '⚫' : BALLOON_EMOJI[b.id % BALLOON_EMOJI.length]}
          </button>
        ))}
      </div>
    </div>
  );
}

export const balloonBurstDef: GameDef = {
  id: 'balloon-burst',
  icon: '🎈',
  name: { zh: '气球砰砰', en: 'Balloon Burst' },
  desc: { zh: '点爆气球，黑气球别碰', en: 'Pop balloons, avoid the black one' },
  rules: {
    zh: ['🎈 气球会从下面飞上来，快点爆它们', '✨ 彩色气球每只得 5 分', '⚫ 黑气球千万不能碰，碰了扣 10 分', '⏱ 60 秒内气球会飞得越来越快'],
    en: ['🎈 Balloons float up — pop them fast', '✨ Each colorful balloon is 5 points', '⚫ Never touch the black balloon — it costs 10 points', '⏱ They fly faster and faster for 60 seconds'],
  },
  durationSec: 60,
  color: '#F0A06A',
  status: 'ready',
  Component: BalloonBurstGame,
};
