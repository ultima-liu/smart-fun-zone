import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import pack from './levels/applePick.json';
import type { GameDef } from '../gameRegistry';
import type { GameProps } from '../types';
import { speak, playSfx } from '../speech';
import { useI18n } from '../i18n';
import { ProgressBar, StarBurst } from '../components/ui';

interface PickLevel {
  level: number;
  questionCount: number;
  minN: number;
  maxN: number;
}

interface Round {
  n: number;
  apples: number[];
}

function nowMs(): number {
  return Date.now();
}

function buildRound(lv: PickLevel): Round {
  const n = lv.minN + Math.floor(Math.random() * (lv.maxN - lv.minN + 1));
  const m = n + 2 + Math.floor(Math.random() * 3);
  return { n, apples: Array.from({ length: m }, (_, i) => i) };
}

function ApplePickGame({ level, onFinish }: GameProps) {
  const { t, lang } = useI18n();
  const lv = useMemo(
    () => (pack.levels.find((l) => l.level === level) ?? pack.levels[0]) as PickLevel,
    [level],
  );
  const [idx, setIdx] = useState(0);
  const [round, setRound] = useState<Round>(() => buildRound(lv));
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [showOK, setShowOK] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [burst, setBurst] = useState<{ x: number; y: number } | null>(null);
  const firstTryRef = useRef(0);
  const overflowRef = useRef(false);
  const doneRef = useRef(false);
  const startRef = useRef(nowMs());

  const prompt = lang === 'zh' ? `摘 ${round.n} 个苹果放进篮子` : `Pick ${round.n} apples`;
  const speakPrompt = () => speak(prompt, lang);

  useEffect(() => {
    speakPrompt();
     
  }, [idx, lang, round.n]);

  const tap = (i: number, e: MouseEvent) => {
    if (showOK || picked.has(i)) return;
    if (picked.size < round.n) {
      playSfx('pop');
      const next = new Set(picked);
      next.add(i);
      setPicked(next);
      setBurst({ x: e.clientX, y: e.clientY });
      window.setTimeout(() => setBurst(null), 700);
      if (next.size === round.n) {
        playSfx('collect');
        if (!overflowRef.current) firstTryRef.current += 1;
        setShowOK(true);
        speak(t('correct'), lang);
        window.setTimeout(() => {
          setShowOK(false);
          setPicked(new Set());
          overflowRef.current = false;
          if (idx + 1 >= lv.questionCount) {
            if (!doneRef.current) {
              doneRef.current = true;
              const got = firstTryRef.current;
              const stars =
                got >= lv.questionCount * 0.85 ? 3 : got >= lv.questionCount * 0.55 ? 2 : 1;
              onFinish({
                correct: got,
                total: lv.questionCount,
                stars,
                durationSec: Math.round((Date.now() - startRef.current) / 1000),
              });
            }
          } else {
            setIdx((i2) => i2 + 1);
            setRound(buildRound(lv));
          }
        }, 900);
      }
    } else {
      // 摘多了：篮子重置，温和提醒
      playSfx('wrong');
      overflowRef.current = true;
      setWrongFlash(true);
      speak(t('tryAgain'), lang);
      window.setTimeout(() => {
        setPicked(new Set());
        setWrongFlash(false);
      }, 600);
    }
  };

  return (
    <div className="apple-pick">
      <ProgressBar value={idx} max={lv.questionCount} />
      <div className="question-card">
        <button className="speaker-btn" onClick={speakPrompt} aria-label="speak">
          🔊
        </button>
        <div className="question-text">{prompt}</div>
      </div>
      <div className="apple-tree">
        {round.apples.map((i) => (
          <button
            key={`${idx}-${i}`}
            className={`apple ${picked.has(i) ? 'picked' : ''}`}
            onClick={(e) => tap(i, e)}
            disabled={showOK}
            style={{ transform: `translateY(${(i % 4) * 5}px)` }}
            aria-label="apple"
          >
            {picked.has(i) ? '🍃' : '🍎'}
          </button>
        ))}
      </div>
      {burst && <StarBurst x={burst.x} y={burst.y} />}
      <div className={`basket ${wrongFlash ? 'shake' : ''}`}>
        <span className="basket-icon">🧺</span>
        <span className="basket-count">
          {picked.size}/{round.n}
        </span>
        {showOK && <span className="feedback ok">✅ {t('correct')}</span>}
      </div>
    </div>
  );
}

export const applePickDef: GameDef = {
  id: 'apple-pick',
  icon: '🍎',
  name: { zh: '摘苹果', en: 'Apple Pick' },
  category: 'math',
  desc: { zh: '摘对数量的苹果', en: 'Pick the right number of apples' },
  levels: pack.levels.length,
  status: 'ready',
  Component: ApplePickGame,
};
