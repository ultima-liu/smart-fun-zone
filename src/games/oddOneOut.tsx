import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import pack from './levels/oddOneOut.json';
import type { GameDef } from '../gameRegistry';
import type { GameProps } from '../types';
import { speak, playSfx } from '../speech';
import { useI18n } from '../i18n';
import { ProgressBar, StarBurst } from '../components/ui';

interface SpotLevel {
  level: number;
  cols: number;
  rows: number;
  mainEmoji: string;
  oddEmoji: string;
  oddCount: number;
}

function nowMs(): number {
  return Date.now();
}

function buildGrid(lv: SpotLevel): string[] {
  const total = lv.cols * lv.rows;
  const cells = Array<string>(total).fill(lv.mainEmoji);
  const odds = [...Array(total).keys()].sort(() => Math.random() - 0.5).slice(0, lv.oddCount);
  odds.forEach((i) => (cells[i] = lv.oddEmoji));
  return cells;
}

function OddOneOutGame({ level, onFinish }: GameProps) {
  const { t, lang } = useI18n();
  const lv = useMemo(
    () => (pack.levels.find((l) => l.level === level) ?? pack.levels[0]) as SpotLevel,
    [level],
  );
  const [grid, setGrid] = useState<string[]>(() => buildGrid(lv));
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [burst, setBurst] = useState<{ x: number; y: number } | null>(null);
  const [foundCount, setFoundCount] = useState(0);
  const correctRef = useRef(0);
  const doneRef = useRef(false);
  const startRef = useRef(nowMs());
  const oddTotal = lv.oddCount;

  useEffect(() => {
    speak(t('findDifferent'), lang);
  }, [t, lang]);

  const tap = (i: number, e: MouseEvent) => {
    if (done || wrongIdx !== null) return;
    if (grid[i] === lv.oddEmoji) {
      playSfx('collect');
      correctRef.current += 1;
      setFoundCount((c) => c + 1);
      setBurst({ x: e.clientX, y: e.clientY });
      window.setTimeout(() => setBurst(null), 800);
      setGrid((g) => g.map((c, j) => (j === i ? '✅' : c)));
      if (correctRef.current >= oddTotal) {
        setDone(true);
        playSfx('win');
        speak(t('great'), lang);
        window.setTimeout(() => {
          if (!doneRef.current) {
            doneRef.current = true;
            const got = correctRef.current;
            const stars = got >= oddTotal ? 3 : 2;
            onFinish({
              correct: oddTotal,
              total: oddTotal,
              stars,
              durationSec: Math.round((Date.now() - startRef.current) / 1000),
            });
          }
        }, 800);
      } else {
        speak(t('keepGoing'), lang);
      }
    } else {
      playSfx('wrong');
      setWrongIdx(i);
      window.setTimeout(() => setWrongIdx(null), 600);
    }
  };

  return (
    <div className="odd-one-out">
      <div className="spot-head">
        <div className="question-text">{t('findDifferent')}</div>
      </div>
      {burst && <StarBurst x={burst.x} y={burst.y} />}
      <div
        className="spot-grid"
        style={{ gridTemplateColumns: `repeat(${lv.cols}, 1fr)` }}
      >
        {grid.map((cell, i) => (
          <button
            key={i}
            className={`spot-cell ${wrongIdx === i ? 'shake' : ''} ${cell === '✅' ? 'found' : ''}`}
            onClick={(e) => tap(i, e)}
          >
            {cell === '✅' ? '✅' : cell}
          </button>
        ))}
      </div>
      <div className="spot-progress">
        <ProgressBar value={foundCount} max={oddTotal} />
      </div>
    </div>
  );
}

export const oddOneOutDef: GameDef = {
  id: 'odd-one-out',
  icon: '🔍',
  name: { zh: '火眼金睛', en: 'Odd One Out' },
  category: 'thinking',
  desc: { zh: '找出不一样的那一个', en: 'Find the odd one out' },
  levels: pack.levels.length,
  status: 'ready',
  Component: OddOneOutGame,
};
