import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import pack from './levels/memoryMatch.json';
import type { GameDef } from '../gameRegistry';
import type { GameProps } from '../types';
import { speak, playSfx } from '../speech';
import { useI18n } from '../i18n';
import { StarBurst } from '../components/ui';

interface MatchLevel {
  level: number;
  cols: number;
  rows: number;
  emojiPool: string[];
}

const EMOJI_NAMES: Record<string, { zh: string; en: string }> = {
  '🍎': { zh: '苹果', en: 'apple' },
  '🍌': { zh: '香蕉', en: 'banana' },
  '🍇': { zh: '葡萄', en: 'grape' },
  '🍓': { zh: '草莓', en: 'strawberry' },
  '🍑': { zh: '桃子', en: 'peach' },
  '🍒': { zh: '樱桃', en: 'cherry' },
  '🥝': { zh: '猕猴桃', en: 'kiwi' },
  '🍉': { zh: '西瓜', en: 'watermelon' },
  '🍍': { zh: '菠萝', en: 'pineapple' },
  '🥥': { zh: '椰子', en: 'coconut' },
  '🍊': { zh: '橙子', en: 'orange' },
  '🫐': { zh: '蓝莓', en: 'blueberry' },
};

function nowMs(): number {
  return Date.now();
}

function buildDeck(lv: MatchLevel): string[] {
  const pairs = (lv.cols * lv.rows) / 2;
  const chosen = [...lv.emojiPool].sort(() => Math.random() - 0.5).slice(0, pairs);
  return [...chosen, ...chosen].sort(() => Math.random() - 0.5);
}

function MemoryMatchGame({ level, onFinish }: GameProps) {
  const { t, lang } = useI18n();
  const lv = useMemo(
    () => (pack.levels.find((l) => l.level === level) ?? pack.levels[0]) as MatchLevel,
    [level],
  );
  const deck = useMemo(() => buildDeck(lv), [lv]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);
  const [burst, setBurst] = useState<{ x: number; y: number } | null>(null);
  const movesRef = useRef(0);
  const doneRef = useRef(false);
  const startRef = useRef(nowMs());

  useEffect(() => {
    speak(t('memoryTitle'), lang);
  }, [t, lang]);

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
        speak(
          nm
            ? t('pairFoundName', { name: lang === 'zh' ? nm.zh : nm.en })
            : t('pairFoundName', { name: '🎉' }),
          lang,
        );
        const newMatched = new Set(matched);
        newMatched.add(a);
        newMatched.add(b);
        setMatched(newMatched);
        window.setTimeout(() => {
          setFlipped([]);
          setLock(false);
          if (newMatched.size === deck.length && !doneRef.current) {
            doneRef.current = true;
            const pairs = deck.length / 2;
            const m = movesRef.current;
            const stars = m <= pairs * 1.5 ? 3 : m <= pairs * 2.2 ? 2 : 1;
            onFinish({
              correct: pairs,
              total: pairs,
              stars,
              durationSec: Math.round((Date.now() - startRef.current) / 1000),
            });
          }
        }, 600);
      } else {
        playSfx('wrong');
        window.setTimeout(() => {
          setFlipped([]);
          setLock(false);
        }, 900);
      }
    }
  };

  return (
    <div className="memory-match">
      <div className="memory-head">
        <div className="memory-title">{t('memoryTitle')}</div>
        <div className="moves">🔄 {t('moves')}：{moves}</div>
      </div>
      {burst && <StarBurst x={burst.x} y={burst.y} />}
      <div className="memory-grid" style={{ gridTemplateColumns: `repeat(${lv.cols}, 1fr)` }}>
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
  name: { zh: '记忆翻牌', en: 'Memory Match' },
  category: 'thinking',
  desc: { zh: '找出相同的两张卡片', en: 'Find matching pairs' },
  levels: pack.levels.length,
  status: 'ready',
  Component: MemoryMatchGame,
};
