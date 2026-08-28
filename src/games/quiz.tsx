import { useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import type { GameResult } from '../types';
import { playSfx } from '../speech';
import { useI18n } from '../i18n';
import { ProgressBar, StarBurst } from '../components/ui';
/* =====================================================================
   通用答题引擎：多数"听/看题 → 点选项"类游戏共用
   ===================================================================== */

function nowMs(): number {
  return Date.now();
}

export interface QuizSession {
  idx: number;
  total: number;
  showOK: boolean;
  wrongFlash: boolean;
  burst: { x: number; y: number } | null;
  pick: (correct: boolean, e: MouseEvent) => void;
}

export function useQuizSession(total: number, onFinish: (r: GameResult) => void): QuizSession {
  const [idx, setIdx] = useState(0);
  const [showOK, setShowOK] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [burst, setBurst] = useState<{ x: number; y: number } | null>(null);
  const firstTryRef = useRef(0);
  const wrongThisQRef = useRef(0);
  const doneRef = useRef(false);
  const startRef = useRef(nowMs());

  const pick = (correct: boolean, e: MouseEvent) => {
    if (showOK) return;
    if (correct) {
      playSfx('collect');
      if (wrongThisQRef.current === 0) firstTryRef.current += 1;
      setBurst({ x: e.clientX, y: e.clientY });
      window.setTimeout(() => setBurst(null), 800);
      setShowOK(true);
      window.setTimeout(() => {
        setShowOK(false);
        wrongThisQRef.current = 0;
        if (idx + 1 >= total) {
          if (!doneRef.current) {
            doneRef.current = true;
            const got = firstTryRef.current;
            const stars = got >= total * 0.85 ? 3 : got >= total * 0.55 ? 2 : 1;
            onFinish({
              correct: got,
              total,
              stars,
              durationSec: Math.round((Date.now() - startRef.current) / 1000),
            });
          }
        } else {
          setIdx((i) => i + 1);
        }
      }, 850);
    } else {
      playSfx('wrong');
      wrongThisQRef.current += 1;
      setWrongFlash(true);
      window.setTimeout(() => setWrongFlash(false), 550);
    }
  };

  return { idx, total, showOK, wrongFlash, burst, pick };
}

export interface QuizShellProps {
  session: QuizSession;
  promptZh: string;
  promptEn: string;
  speakPrompt: () => void;
  visual?: ReactNode;
  children: ReactNode;
}

export function QuizShell({ session, promptZh, promptEn, speakPrompt, visual, children }: QuizShellProps) {
  const { t, lang } = useI18n();
  return (
    <div className="quiz-game">
      <ProgressBar value={session.idx} max={session.total} />
      <div className="question-card">
        <button className="speaker-btn" onClick={speakPrompt} aria-label="speak">
          🔊
        </button>
        <div className="question-text">
          {lang === 'zh' ? promptZh : promptEn}
          <span className="question-count">
            {' '}
            {session.idx + 1}/{session.total}
          </span>
        </div>
      </div>
      {visual && <div className="quiz-visual">{visual}</div>}
      {session.showOK && <div className="feedback ok">✅ {t('correct')}</div>}
      {session.burst && <StarBurst x={session.burst.x} y={session.burst.y} />}
      <div className={`quiz-options ${session.wrongFlash ? 'shake-once' : ''}`}>{children}</div>
    </div>
  );
}
