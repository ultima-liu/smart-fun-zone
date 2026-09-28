import { useEffect, useRef, useState } from 'react';
import type { GameDef } from '../gameRegistry';
import type { GameProps } from '../types';
import { playSfx } from '../speech';
import { ArcadeHud, useArcadeRound, paceForGrade } from './arcade';

/** 木桩往返移动，看准时机点「抛圈」；连中三环有奖励 */
function RingTossGame({ child, durationSec, onFinish }: GameProps) {
  const [pegX, setPegX] = useState(0.5);
  const [dir, setDir] = useState(1);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [ring, setRing] = useState<{ x: number; flying: boolean; hit: boolean | null } | null>(null);
  const [flash, setFlash] = useState<'hit' | 'miss' | null>(null);
  const { timeLeft, scoreRef, startRef } = useArcadeRound(durationSec, onFinish);
  const pegXRef = useRef(0.5);
  const flyingRef = useRef(false);
  const comboRef = useRef(0);
  const pace = paceForGrade(child.ageBand);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      const progress = Math.min(1, (now - startRef.current) / (durationSec * 1000));
      const step = (0.008 + progress * 0.01) * pace;
      let next = pegXRef.current + dir * step;
      let d = dir;
      if (next > 0.9) { next = 0.9; d = -1; }
      if (next < 0.1) { next = 0.1; d = 1; }
      pegXRef.current = next;
      setPegX(next);
      setDir(d);
    }, 50);
    return () => window.clearInterval(id);
  }, [dir]);

  const toss = () => {
    if (flyingRef.current) return;
    flyingRef.current = true;
    const throwX = 0.5;
    setRing({ x: throwX, flying: true, hit: null });
    window.setTimeout(() => {
      // 圈从正下方抛出，木桩仍在移动：落点误差小于 9% 判中
      const hit = Math.abs(pegXRef.current - throwX) < 0.09;
      setRing((r) => (r ? { ...r, flying: false, hit } : r));
      if (hit) {
        playSfx('collect');
        comboRef.current += 1;
        scoreRef.current += 15 + (comboRef.current >= 3 ? 10 : 0);
        setCombo(comboRef.current);
      } else {
        playSfx('wrong');
        comboRef.current = 0;
        setCombo(0);
      }
      setScore(scoreRef.current);
      setFlash(hit ? 'hit' : 'miss');
      window.setTimeout(() => setFlash(null), 400);
      window.setTimeout(() => {
        flyingRef.current = false;
        setRing(null);
      }, 650);
    }, 420);
  };

  return (
    <div className="arcade-game ring-toss">
      <ArcadeHud score={score} timeLeft={timeLeft} />
      {combo >= 3 && <div className="combo-badge">🔥 x{combo}</div>}
      <div className={`toss-field ${flash ?? ''}`} onPointerDown={toss}>
        <span className="toss-peg" style={{ left: `${pegX * 100}%` }}>🎯</span>
        {ring && (
          <span className={`toss-ring ${ring.flying ? 'flying' : ''} ${ring.hit === false ? 'missed' : ''}`} style={{ left: `${ring.x * 100}%` }}>
            ⭕
          </span>
        )}
        <button className="toss-btn" onClick={toss} disabled={ring?.flying}>
          🤾 抛圈
        </button>
      </div>
    </div>
  );
}

export const ringTossDef: GameDef = {
  id: 'ring-toss',
  icon: '🎪',
  name: { zh: '套圈圈', en: 'Ring Toss' },
  desc: { zh: '看准时机抛圈套木桩，连中有奖', en: 'Toss rings onto the moving peg' },
  rules: {
    zh: ['🎯 木桩会左右跑来跑去，盯住它', '🤾 看准时机点「抛圈」，圈从中间飞出去', '⭕ 套中木桩得 15 分，连中 3 个再奖 10 分', '⏱ 60 秒内套中越多越好，木桩会越跑越快'],
    en: ['🎯 The peg slides left and right — keep your eyes on it', '🤾 Tap Toss at just the right moment', '⭕ Each hit is 15 points; 3 in a row earns 10 bonus', '⏱ The peg gets faster over 60 seconds'],
  },
  durationSec: 60,
  color: '#A186C4',
  status: 'ready',
  Component: RingTossGame,
};
