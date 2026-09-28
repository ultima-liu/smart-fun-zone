import { useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import type { GameDef } from '../gameRegistry';
import type { GameProps } from '../types';
import { speak, playSfx } from '../speech';
import { useI18n } from '../i18n';
import { StarBurst } from '../components/ui';

function nowMs(): number {
  return Date.now();
}

/* 乐园图案记忆翻牌：一局一副牌，配对越连顺分数越高（无知识内容） */

const EMOJI_NAMES: Record<string, { zh: string; en: string }> = {
  '🎡': { zh: '摩天轮', en: 'Ferris wheel' },
  '🎠': { zh: '旋转木马', en: 'carousel' },
  '🎢': { zh: '过山车', en: 'roller coaster' },
  '🎪': { zh: '马戏团', en: 'big top' },
  '🎈': { zh: '气球', en: 'balloon' },
  '🍦': { zh: '冰淇淋', en: 'ice cream' },
  '🎟️': { zh: '游乐券', en: 'ticket' },
  '🎯': { zh: '靶子', en: 'target' },
  '🫧': { zh: '泡泡', en: 'bubble' },
};

const POOL = Object.keys(EMOJI_NAMES);

function boardFor(grade: string): { cols: number; rows: number } {
  return ['g1', 'g2'].includes(grade) ? { cols: 4, rows: 3 } : { cols: 4, rows: 4 };
}

function buildDeck(pairs: number): string[] {
  const chosen = [...POOL].sort(() => Math.random() - 0.5).slice(0, pairs);
  return [...chosen, ...chosen].sort(() => Math.random() - 0.5);
}

function MemoryMatchGame({ child, onFinish }: GameProps) {
  const { t, lang } = useI18n();
  const { cols, rows } = useMemo(() => boardFor(child.ageBand), [child.ageBand]);
  const deck = useMemo(() => buildDeck((cols * rows) / 2), [cols, rows]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);
  const [score, setScore] = useState(0);
  const [burst, setBurst] = useState<{ x: number; y: number } | null>(null);
  const movesRef = useRef(0);
  const comboRef = useRef(0);
  const scoreRef = useRef(0);
  const doneRef = useRef(false);
  const startRef = useRef(nowMs());

  const flip = (i: number, e: MouseEvent) => {
    if (lock || flipped.includes(i) || matched.has(i)) return;
    playSfx('flip');
    const next = [...flipped, i];
    setFlipped(next);
    if (next.length === 2) {
      movesRef.current += 1;
      setMoves(movesRef.current);
      setLock(true);
      const [a, b] = next;
      if (deck[a] === deck[b]) {
        playSfx('collect');
        setBurst({ x: e.clientX, y: e.clientY });
        window.setTimeout(() => setBurst(null), 800);
        const nm = EMOJI_NAMES[deck[a]];
        speak(t('pairFoundName', { name: lang === 'zh' ? nm.zh : nm.en }), lang);
        // 连续配对成功有连击加分；翻错一次连击清零
        comboRef.current += 1;
        scoreRef.current += 10 + (comboRef.current - 1) * 5;
        setScore(scoreRef.current);
        const newMatched = new Set(matched);
        newMatched.add(a);
        newMatched.add(b);
        setMatched(newMatched);
        window.setTimeout(() => {
          setFlipped([]);
          setLock(false);
          if (newMatched.size === deck.length && !doneRef.current) {
            doneRef.current = true;
            onFinish({
              score: scoreRef.current,
              durationSec: Math.round((Date.now() - startRef.current) / 1000),
            });
          }
        }, 600);
      } else {
        playSfx('wrong');
        comboRef.current = 0;
        window.setTimeout(() => {
          setFlipped([]);
          setLock(false);
        }, 900);
      }
    }
  };

  return (
    <div className="arcade-game memory-match">
      <div className="arcade-hud" aria-label={t('scoreLabel')}>
        <span className="arcade-hud-score">🏆 {score}</span>
        <span className="arcade-hud-time">🔄 {moves}</span>
      </div>
      <div className="memory-head">
        <div className="memory-title">{t('memoryTitle')}</div>
      </div>
      {burst && <StarBurst x={burst.x} y={burst.y} />}
      <div className="memory-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {deck.map((e, i) => {
          const up = flipped.includes(i) || matched.has(i);
          return (
            <button
              key={i}
              className={`mcard ${up ? 'up' : ''} ${matched.has(i) ? 'matched' : ''}`}
              onClick={(ev) => flip(i, ev)}
            >
              <span className="mcard-inner">
                <span className="mcard-back">❓</span>
                <span className="mcard-front">{e}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const memoryMatchDef: GameDef = {
  id: 'memory-match',
  icon: '🃏',
  name: { zh: '记忆配对', en: 'Memory Match' },
  desc: { zh: '翻牌配对，连对加分', en: 'Flip and match pairs for combos' },
  rules: {
    zh: ['🃏 点开两张卡片，图案一样就配对成功', '🔥 连续配对成功分数越滚越高，翻错一次连击就清零', '🎉 把所有配对找完，这一局就结束啦'],
    en: ['🃏 Tap two cards — matching pictures stay open', '🔥 Back-to-back matches grow your combo; one miss resets it', '🎉 Find every pair to finish the round'],
  },
  durationSec: 90,
  untimed: true,
  color: '#5FC8A8',
  status: 'ready',
  Component: MemoryMatchGame,
};
