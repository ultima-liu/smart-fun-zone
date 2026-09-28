import { useEffect, useState } from 'react';
import type { GameDef } from '../gameRegistry';
import type { GameProps } from '../types';
import { playSfx } from '../speech';
import { ArcadeHud, useArcadeRound, paceForGrade } from './arcade';

/* 动物猎影：小动物影子在草丛里穿梭，看准点中得分（纯反应游戏） */

const ANIMALS = ['🐼', '🐱', '🐶', '🐰', '🦁', '🐘', '🐢', '🐬', '🦒', '🐸', '🦆', '🦊', '🐧', '🐨'];

interface Runner {
  id: number;
  emoji: string;
  lane: number; // 0~4 行
  x: number; // -0.2~1.2
  dir: 1 | -1;
  v: number;
}

let seq = 0;
const LANES = 5;

function AnimalHuntGame({ child, durationSec, onFinish }: GameProps) {
  const [runners, setRunners] = useState<Runner[]>([]);
  const [score, setScore] = useState(0);
  const { timeLeft, scoreRef, startRef } = useArcadeRound(durationSec, onFinish);
  const pace = paceForGrade(child.ageBand);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      const progress = Math.min(1, (now - startRef.current) / (durationSec * 1000));
      const baseV = (0.008 + progress * 0.009) * pace;
      setRunners((prev) => {
        const moved = prev
          .map((r) => ({ ...r, x: r.x + r.dir * r.v }))
          .filter((r) => r.x > -0.25 && r.x < 1.25);
        if (moved.length < 3 + Math.floor(progress * 3) && Math.random() < (0.2 + progress * 0.25) * pace) {
          const dir = Math.random() < 0.5 ? 1 : -1;
          moved.push({
            id: ++seq,
            emoji: ANIMALS[Math.floor(Math.random() * ANIMALS.length)],
            lane: Math.floor(Math.random() * LANES),
            x: dir === 1 ? -0.2 : 1.2,
            dir,
            v: baseV * (0.8 + Math.random() * 0.5),
          });
        }
        return moved;
      });
    }, 60);
    return () => window.clearInterval(id);
  }, []);

  const catchIt = (r: Runner) => {
    setRunners((prev) => prev.filter((x) => x.id !== r.id));
    playSfx('collect');
    scoreRef.current += 10;
    setScore(scoreRef.current);
  };

  return (
    <div className="arcade-game animal-hunt">
      <ArcadeHud score={score} timeLeft={timeLeft} />
      <div className="hunt-field">
        {Array.from({ length: LANES }, (_, lane) => (
          <div key={lane} className="hunt-lane">
            {runners.filter((r) => r.lane === lane).map((r) => (
              <button
                key={r.id}
                className={`hunt-runner ${r.dir === -1 ? 'flip' : ''}`}
                style={{ left: `${r.x * 100}%` }}
                onClick={() => catchIt(r)}
              >
                {r.emoji}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export const animalHuntDef: GameDef = {
  id: 'animal-hunt',
  icon: '🦎',
  name: { zh: '动物猎影', en: 'Animal Dash' },
  desc: { zh: '点中草丛里跑过的小动物', en: 'Tap the animals dashing through' },
  rules: {
    zh: ['🦎 小动物会从草丛两边跑过，快点中它们', '✅ 点中一只得 10 分，没点中不扣分，大胆点', '⏱ 60 秒内小动物会跑得越来越快'],
    en: ['🦎 Animals dash across the grass — tap them', '✅ Each catch is 10 points; missing costs nothing, so tap away', '⏱ They run faster and faster for 60 seconds'],
  },
  durationSec: 60,
  color: '#5FC8A8',
  status: 'ready',
  Component: AnimalHuntGame,
};
