import { useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import type { GameDef } from '../gameRegistry';
import type { GameProps } from '../types';
import { playSfx } from '../speech';
import { useI18n } from '../i18n';
import { StarBurst } from '../components/ui';
import { ArcadeHud, useArcadeRound } from './arcade';

/* 火眼金睛：限时内连续找异类图，找得越多分越高（纯观察，无知识问答） */

const PAIRS: [string, string][] = [
  ['🐻', '🐼'],
  ['🐸', '🐢'],
  ['🚗', '🚙'],
  ['🌞', '🌝'],
  ['⭐', '🌟'],
  ['🍎', '❤️'],
  ['🐤', '🐥'],
  ['🐬', '🐟'],
  ['🦊', '🐺'],
  ['🍪', '🧭'],
];

function gridFor(round: number): number {
  if (round <= 3) return 3;
  if (round <= 7) return 4;
  return 5;
}

interface RoundData {
  cols: number;
  cells: string[];
  oddEmoji: string;
  oddIdx: number;
}

function buildRound(round: number): RoundData {
  const cols = gridFor(round);
  const total = cols * cols;
  const [main, odd] = PAIRS[Math.floor(Math.random() * PAIRS.length)];
  const cells = Array<string>(total).fill(main);
  const oddIdx = Math.floor(Math.random() * total);
  cells[oddIdx] = odd;
  return { cols, cells, oddEmoji: odd, oddIdx };
}

function OddOneOutGame({ durationSec, onFinish }: GameProps) {
  const { t } = useI18n();
  const [round, setRound] = useState(1);
  const [data, setData] = useState<RoundData>(() => buildRound(1));
  const [score, setScore] = useState(0);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [burst, setBurst] = useState<{ x: number; y: number } | null>(null);
  const { timeLeft, scoreRef } = useArcadeRound(durationSec, onFinish);
  const lockRef = useRef(false);

  const tap = (i: number, e: MouseEvent) => {
    if (lockRef.current) return;
    if (data.cells[i] === data.oddEmoji) {
      lockRef.current = true;
      playSfx('collect');
      scoreRef.current += 10;
      setScore(scoreRef.current);
      setBurst({ x: e.clientX, y: e.clientY });
      window.setTimeout(() => setBurst(null), 700);
      window.setTimeout(() => {
        setRound((r) => {
          const next = r + 1;
          setData(buildRound(next));
          return next;
        });
        lockRef.current = false;
      }, 350);
    } else {
      playSfx('wrong');
      scoreRef.current = Math.max(0, scoreRef.current - 5);
      setScore(scoreRef.current);
      setWrongIdx(i);
      window.setTimeout(() => setWrongIdx(null), 600);
    }
  };

  const cols = data.cols;
  const roundLabel = useMemo(() => `${t('level', { n: round })}`, [round, t]);

  return (
    <div className="arcade-game odd-one-out">
      <ArcadeHud score={score} timeLeft={timeLeft} />
      <div className="spot-head">
        <div className="question-text">
          {t('findDifferent')} <span className="question-count">{roundLabel}</span>
        </div>
      </div>
      {burst && <StarBurst x={burst.x} y={burst.y} />}
      <div className="spot-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {data.cells.map((cell, i) => (
          <button
            key={`${round}-${i}`}
            className={`spot-cell ${wrongIdx === i ? 'shake' : ''}`}
            onClick={(e) => tap(i, e)}
          >
            {cell}
          </button>
        ))}
      </div>
    </div>
  );
}

export const oddOneOutDef: GameDef = {
  id: 'odd-one-out',
  icon: '🔍',
  name: { zh: '火眼金睛', en: 'Odd One Out' },
  desc: { zh: '限时找不同，越找越快', en: 'Spot the odd one against the clock' },
  rules: {
    zh: ['🔍 每一格里都藏着一个小小的「不一样的」，把它点出来', '✅ 点对得 10 分，马上进入下一格；点错扣 5 分', '⏱ 60 秒内找得越多越好，格子会越来越大'],
    en: ['🔍 One item in the grid is different — tap it', '✅ Correct tap is 10 points and jumps to the next grid; a miss costs 5', '⏱ Grids grow bigger as you go — find as many as you can in 60 seconds'],
  },
  durationSec: 60,
  color: '#4FB3D9',
  status: 'ready',
  Component: OddOneOutGame,
};
