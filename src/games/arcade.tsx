import { useEffect, useRef, useState } from 'react';

function nowMs(): number {
  return Date.now();
}
import type { GameResult } from '../types';
import { useI18n } from '../i18n';

/* =====================================================================
   街机公共件：HUD（分数/倒计时）+ 一局倒计时钩子
   ===================================================================== */

export function ArcadeHud({ score, timeLeft }: { score: number; timeLeft: number }) {
  const { t } = useI18n();
  return (
    <div className="arcade-hud" aria-label={t('scoreLabel')}>
      <span className="arcade-hud-score">🏆 {score}</span>
      <span className={`arcade-hud-time ${timeLeft <= 10 ? 'urgent' : ''}`}>⏱ {timeLeft}s</span>
    </div>
  );
}

/** 一局倒计时：到点用最终分数回调 onFinish（只调一次） */
export function useArcadeRound(durationSec: number, onFinish: (r: GameResult) => void) {
  const [timeLeft, setTimeLeft] = useState(durationSec);
  const scoreRef = useRef(0);
  const doneRef = useRef(false);
  const startRef = useRef(nowMs());

  useEffect(() => {
    const end = startRef.current + durationSec * 1000;
    const id = window.setInterval(() => {
      const remain = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setTimeLeft(remain);
      if (remain <= 0) {
        window.clearInterval(id);
        if (!doneRef.current) {
          doneRef.current = true;
          onFinish({
            score: scoreRef.current,
            durationSec: Math.round((Date.now() - startRef.current) / 1000),
          });
        }
      }
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  return { timeLeft, scoreRef, doneRef, startRef };
}

/** 按孩子年级给街机难度系数：低年级更慢更稀，1（标准）~0.7（最易） */
export function paceForGrade(grade: string): number {
  return ['g1', 'g2'].includes(grade) ? 0.7 : ['g3', 'g4'].includes(grade) ? 0.85 : 1;
}
