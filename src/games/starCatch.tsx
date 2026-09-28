import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { GameDef } from '../gameRegistry';
import type { GameProps } from '../types';
import { playSfx } from '../speech';
import { ArcadeHud, useArcadeRound, paceForGrade } from './arcade';

interface Fall {
  id: number;
  kind: 'star' | 'cloud';
  x: number; // 0~1
  y: number; // 0~1，到 1 出界
  v: number; // 每 tick 下落比例
}

let seq = 0;

function StarCatchGame({ child, durationSec, onFinish }: GameProps) {
  const [items, setItems] = useState<Fall[]>([]);
  const [basketX, setBasketX] = useState(0.5);
  const [score, setScore] = useState(0);
  const [hurt, setHurt] = useState(false);
  const { timeLeft, scoreRef, startRef } = useArcadeRound(durationSec, onFinish);
  const basketRef = useRef(0.5);
  const pace = paceForGrade(child.ageBand);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      const progress = Math.min(1, (now - startRef.current) / (durationSec * 1000));
      const baseV = (0.006 + progress * 0.007) * pace;
      setItems((prev) => {
        const moved = prev.map((it) => ({ ...it, y: it.y + it.v }));
        // 接住：到篮口高度且横向重叠
        const caught = moved.filter((it) => it.y >= 0.84 && it.y < 0.98 && Math.abs(it.x - basketRef.current) < 0.12);
        if (caught.length) {
          const cloud = caught.some((it) => it.kind === 'cloud');
          if (cloud) {
            playSfx('wrong');
            scoreRef.current = Math.max(0, scoreRef.current - 5);
            setHurt(true);
            window.setTimeout(() => setHurt(false), 350);
          } else {
            playSfx('collect');
            scoreRef.current += caught.length * 10;
          }
          setScore(scoreRef.current);
        }
        const alive = moved.filter((it) => it.y < 1 && !(it.y >= 0.84 && Math.abs(it.x - basketRef.current) < 0.12));
        // 生成新掉落：星星为主，乌云随时间变多
        if (Math.random() < (0.16 + progress * 0.18) * pace) {
          alive.push({
            id: ++seq,
            kind: Math.random() < 0.15 + progress * 0.15 ? 'cloud' : 'star',
            x: 0.06 + Math.random() * 0.88,
            y: -0.08,
            v: baseV * (0.85 + Math.random() * 0.3),
          });
        }
        return alive;
      });
    }, 60);
    return () => window.clearInterval(id);
  }, []);

  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(0.92, Math.max(0.08, (e.clientX - rect.left) / rect.width));
    basketRef.current = x;
    setBasketX(x);
  };

  return (
    <div className="arcade-game star-catch">
      <ArcadeHud score={score} timeLeft={timeLeft} />
      <div className={`catch-field ${hurt ? 'hurt' : ''}`} onPointerMove={move} onPointerDown={move}>
        {items.map((it) => (
          <span key={it.id} className={`fall ${it.kind}`} style={{ left: `${it.x * 100}%`, top: `${it.y * 100}%` }}>
            {it.kind === 'star' ? '⭐' : '☁️'}
          </span>
        ))}
        <span className="catch-basket" style={{ left: `${basketX * 100}%` }}>🧺</span>
      </div>
    </div>
  );
}

export const starCatchDef: GameDef = {
  id: 'star-catch',
  icon: '⭐',
  name: { zh: '接星星', en: 'Star Catch' },
  desc: { zh: '移动篮子接星星，躲开乌云', en: 'Catch stars, dodge clouds' },
  rules: {
    zh: ['🧺 用手指左右滑动，移动下面的小篮子', '⭐ 接住掉下来的星星，一颗得 10 分', '☁️ 灰乌云不要接，碰到了会扣 5 分', '⏱ 60 秒内接得越多越好'],
    en: ['🧺 Slide your finger to move the basket', '⭐ Each star you catch is worth 10 points', '☁️ Avoid the grey clouds — they cost 5 points', '⏱ Catch as many as you can in 60 seconds'],
  },
  durationSec: 60,
  color: '#F2B661',
  status: 'ready',
  Component: StarCatchGame,
};
