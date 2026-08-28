import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import pack from './levels/numberFarm.json';
import type { GameDef } from '../gameRegistry';
import type { GameProps } from '../types';
import { speak, playSfx } from '../speech';
import { useI18n } from '../i18n';
import { ProgressBar, StarBurst } from '../components/ui';

interface FarmLevel {
  level: number;
  questionCount: number;
  countMin: number;
  countMax: number;
  animals: string[];
  optionCount: number;
}

interface Question {
  animal: string;
  nameZh: string;
  nameEn: string;
  count: number;
  options: number[];
}

const ANIMAL_NAMES: Record<string, { zh: string; en: string }> = {
  '🐷': { zh: '小猪', en: 'pig' },
  '🐮': { zh: '奶牛', en: 'cow' },
  '🐔': { zh: '小鸡', en: 'chicken' },
  '🐑': { zh: '小羊', en: 'sheep' },
  '🐰': { zh: '兔子', en: 'rabbit' },
  '🦆': { zh: '鸭子', en: 'duck' },
  '🐴': { zh: '小马', en: 'horse' },
  '🐶': { zh: '小狗', en: 'dog' },
};

function nowMs(): number {
  return Date.now();
}

function buildQuestions(lv: FarmLevel): Question[] {  const qs: Question[] = [];
  for (let i = 0; i < lv.questionCount; i++) {
    const animal = lv.animals[Math.floor(Math.random() * lv.animals.length)];
    const count = lv.countMin + Math.floor(Math.random() * (lv.countMax - lv.countMin + 1));
    const options = new Set<number>([count]);
    let guard = 0;
    while (options.size < lv.optionCount && guard < 200) {
      const d = count + (Math.floor(Math.random() * 7) - 3);
      if (d >= 1 && d <= 12) options.add(d);
      guard++;
    }
    let k = 1;
    while (options.size < lv.optionCount) {
      if (!options.has(k)) options.add(k);
      k++;
    }
    const nm = ANIMAL_NAMES[animal] ?? { zh: animal, en: animal };
    qs.push({
      animal,
      nameZh: nm.zh,
      nameEn: nm.en,
      count,
      options: [...options].sort(() => Math.random() - 0.5),
    });
  }
  return qs;
}

function NumberFarmGame({ level, onFinish }: GameProps) {
  const { t, lang } = useI18n();
  const lv = useMemo(
    () => (pack.levels.find((l) => l.level === level) ?? pack.levels[0]) as FarmLevel,
    [level],
  );
  const [questions] = useState<Question[]>(() => buildQuestions(lv));
  const [idx, setIdx] = useState(0);
  const [wrongPick, setWrongPick] = useState<number | null>(null);
  const [showOK, setShowOK] = useState(false);
  const [burst, setBurst] = useState<{ x: number; y: number } | null>(null);
  const correctRef = useRef(0);
  const doneRef = useRef(false);
  const startRef = useRef(nowMs());

  const q = questions[idx];

  const speakQ = useCallback(() => {
    speak(t('countQuestion', { animal: lang === 'zh' ? q.nameZh : q.nameEn }), lang);
  }, [q, lang, t]);

  useEffect(() => {
    speakQ();
  }, [speakQ]);

  const answer = (val: number, e: MouseEvent) => {
    if (showOK || wrongPick !== null) return;
    if (val === q.count) {
      playSfx('collect');
      correctRef.current += 1;
      setBurst({ x: e.clientX, y: e.clientY });
      window.setTimeout(() => setBurst(null), 800);
      setShowOK(true);
      speak(t('correct'), lang);
      window.setTimeout(() => {
        setShowOK(false);
        if (idx + 1 >= questions.length) {
          if (!doneRef.current) {
            doneRef.current = true;
            const got = correctRef.current;
            const stars = got >= questions.length * 0.8 ? 3 : got >= questions.length * 0.5 ? 2 : 1;
            onFinish({
              correct: got,
              total: questions.length,
              stars,
              durationSec: Math.round((Date.now() - startRef.current) / 1000),
            });
          }
        } else {
          setIdx((i) => i + 1);
        }
      }, 900);
    } else {
      playSfx('wrong');
      setWrongPick(val);
      speak(t('tryAgain'), lang);
      window.setTimeout(() => setWrongPick(null), 700);
    }
  };

  return (
    <div className="number-farm">
      <div className="farm-scene">
        <ProgressBar value={idx} max={questions.length} />
        <div className="question-card">
          <button className="speaker-btn" onClick={speakQ} aria-label="speak">
            🔊
          </button>
          <div className="question-text">
            {t('countQuestion', { animal: lang === 'zh' ? q.nameZh : q.nameEn })}
          </div>
          <div className="question-hint">{t('whichNumber')}</div>
        </div>
        <div className="animal-row">
          {Array.from({ length: q.count }).map((_, i) => (
            <span key={i} className="animal float-a" style={{ animationDelay: `${(i % 6) * 0.15}s` }}>
              {q.animal}
            </span>
          ))}
        </div>
        {showOK && <div className="feedback ok">✅ {t('correct')}</div>}
        {burst && <StarBurst x={burst.x} y={burst.y} />}
        <div className="answer-row">
          {q.options.map((v) => (
            <button
              key={v}
              className={`num-btn ${wrongPick === v ? 'wrong-pick' : ''}`}
              onClick={(e) => answer(v, e)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export const numberFarmDef: GameDef = {
  id: 'number-farm',
  icon: '🚜',
  name: { zh: '数字农场', en: 'Number Farm' },
  category: 'math',
  desc: { zh: '数一数农场里的小动物', en: 'Count the farm animals' },
  levels: pack.levels.length,
  status: 'ready',
  Component: NumberFarmGame,
};
