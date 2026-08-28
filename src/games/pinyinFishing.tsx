import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import pack from './levels/pinyinFishing.json';
import type { GameDef } from '../gameRegistry';
import type { GameProps } from '../types';
import { speak } from '../speech';
import { useQuizSession, QuizShell } from './quiz';

interface PinyinLevel {
  level: number;
  questionCount: number;
  wordIds: string[];
}

const WORDS: Record<string, { w: string; py: string; g: string }> = {
  mama: { w: '妈妈', py: 'm', g: '👩' },
  baba: { w: '爸爸', py: 'b', g: '👨' },
  gege: { w: '哥哥', py: 'g', g: '👦' },
  jiejie: { w: '姐姐', py: 'j', g: '👧' },
  kitten: { w: '小猫', py: 'x', g: '🐱' },
  puppy: { w: '小狗', py: 'g', g: '🐶' },
  apple: { w: '苹果', py: 'p', g: '🍎' },
  rabbit: { w: '兔子', py: 't', g: '🐰' },
  cow: { w: '奶牛', py: 'n', g: '🐮' },
  flower: { w: '花朵', py: 'h', g: '🌸' },
  moon: { w: '月亮', py: 'y', g: '🌙' },
  sun: { w: '太阳', py: 't', g: '☀️' },
  grape: { w: '葡萄', py: 'p', g: '🍇' },
  tiger: { w: '老虎', py: 'l', g: '🐯' },
};

const LETTER_POOL = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'y', 'w'];

const PROMPT = {
  zh: '听一听，第一个拼音是哪个？',
  en: 'Listen — what is the first letter?',
};

interface Question {
  promptZh: string;
  promptEn: string;
  voiceZh: string;
  voiceEn: string;
  options: { key: string; node: ReactNode; correct: boolean }[];
}

function buildQuestions(lv: PinyinLevel): Question[] {
  const qs: Question[] = [];
  for (let i = 0; i < lv.questionCount; i++) {
    const wordId = lv.wordIds[Math.floor(Math.random() * lv.wordIds.length)];
    const word = WORDS[wordId];
    const others = LETTER_POOL.filter((l) => l !== word.py);
    const distractors = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
    const opts = [...distractors, word.py].sort(() => Math.random() - 0.5);
    qs.push({
      promptZh: PROMPT.zh,
      promptEn: PROMPT.en,
      voiceZh: `${word.w}`,
      voiceEn: `${word.w}`,
      options: opts.map((l) => ({
        key: l,
        node: <span className="pinyin-letter">{l}</span>,
        correct: l === word.py,
      })),
    });
  }
  return qs;
}

function PinyinFishingGame({ level, onFinish }: GameProps) {
  const lv = useMemo(
    () => (pack.levels.find((l) => l.level === level) ?? pack.levels[0]) as PinyinLevel,
    [level],
  );
  const [questions] = useState<Question[]>(() => buildQuestions(lv));
  const session = useQuizSession(questions.length, onFinish);
  const q = questions[session.idx];

  const speakPrompt = () => speak(q.voiceZh, 'zh');
  useEffect(() => {
    speakPrompt();
     
  }, [session.idx]);

  return (
    <QuizShell
      session={session}
      promptZh={q.promptZh}
      promptEn={q.promptEn}
      speakPrompt={speakPrompt}
    >
      {q.options.map((o) => (
        <button key={o.key} className="quiz-option" onClick={(e) => session.pick(o.correct, e)}>
          {o.node}
        </button>
      ))}
    </QuizShell>
  );
}

export const pinyinFishingDef: GameDef = {
  id: 'pinyin-fishing',
  icon: '🎣',
  name: { zh: '拼音钓鱼', en: 'Pinyin Fishing' },
  category: 'chinese',
  desc: { zh: '钓起听到的拼音', en: 'Fish the pinyin you hear' },
  levels: pack.levels.length,
  status: 'ready',
  Component: PinyinFishingGame,
};
