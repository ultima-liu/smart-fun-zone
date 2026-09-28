import { useEffect, useState } from 'react';
import type { GameDef } from '../gameRegistry';
import type { GameProps } from '../types';
import { playSfx } from '../speech';
import { ArcadeHud, useArcadeRound, paceForGrade } from './arcade';

const CELLS = 9;

interface Cell {
  kind: 'bubble' | 'thorn';
  expires: number;
}

function BubblePopGame({ child, durationSec, onFinish }: GameProps) {
  const [cells, setCells] = useState<(Cell | null)[]>(() => Array(CELLS).fill(null));
  const [score, setScore] = useState(0);
  const [hurtIdx, setHurtIdx] = useState<number | null>(null);
  const { timeLeft, scoreRef, startRef } = useArcadeRound(durationSec, onFinish);
  const pace = paceForGrade(child.ageBand);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      setCells((prev) => {
        const next = prev.map((c) => (c && c.expires > now ? c : null));
        const progress = Math.min(1, (now - startRef.current) / (durationSec * 1000));
        // 泡泡存活时长与出泡频率随时间提升（低年级整体放缓）
        const life = (1300 - progress * 650) / pace;
        const spawnP = (0.22 + progress * 0.4) * pace;
        const empties = next.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
        if (empties.length && Math.random() < spawnP) {
          const idx = empties[Math.floor(Math.random() * empties.length)];
          next[idx] = { kind: Math.random() < 0.18 ? 'thorn' : 'bubble', expires: now + life };
        }
        return next;
      });
    }, 120);
    return () => window.clearInterval(id);
  }, []);

  const tap = (i: number) => {
    const c = cells[i];
    if (!c) return;
    setCells((prev) => prev.map((x, j) => (j === i ? null : x)));
    if (c.kind === 'bubble') {
      playSfx('pop');
      scoreRef.current += 10;
      setScore(scoreRef.current);
    } else {
      playSfx('wrong');
      scoreRef.current = Math.max(0, scoreRef.current - 5);
      setScore(scoreRef.current);
      setHurtIdx(i);
      window.setTimeout(() => setHurtIdx((h) => (h === i ? null : h)), 450);
    }
  };

  return (
    <div className="arcade-game bubble-pop">
      <ArcadeHud score={score} timeLeft={timeLeft} />
      <div className="pop-field">
        {cells.map((c, i) => (
          <button
            key={i}
            className={`pop-cell ${c ? 'up' : ''} ${c?.kind === 'thorn' ? 'thorn' : ''} ${hurtIdx === i ? 'shake' : ''}`}
            onClick={() => tap(i)}
            aria-hidden={!c}
            tabIndex={c ? 0 : -1}
          >
            {c?.kind === 'thorn' ? '🦔' : c ? '🫧' : ''}
          </button>
        ))}
      </div>
    </div>
  );
}

export const bubblePopDef: GameDef = {
  id: 'bubble-pop',
  icon: '🫧',
  name: { zh: '泡泡打打', en: 'Bubble Pop' },
  desc: { zh: '点破泡泡得分，小心刺球', en: 'Pop bubbles, dodge spiky balls' },
  rules: {
    zh: ['🫧 泡泡冒出来就快点它，点破一个得 10 分', '🦔 圆滚滚的刺球不能点，点了会扣 5 分', '⏱ 60 秒内得分越多越好，泡泡会越冒越快'],
    en: ['🫧 Tap each bubble the moment it pops up — 10 points each', '🦔 Never tap the spiky ball — it costs 5 points', '⏱ Score as much as you can in 60 seconds; bubbles get faster'],
  },
  durationSec: 60,
  color: '#4FB3D9',
  status: 'ready',
  Component: BubblePopGame,
};
