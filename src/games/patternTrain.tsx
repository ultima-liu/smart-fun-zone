import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import pack from './levels/patternTrain.json';
import type { GameDef } from '../gameRegistry';
import type { GameProps } from '../types';
import { speak } from '../speech';
import { useI18n } from '../i18n';
import { useQuizSession, QuizShell } from './quiz';

interface PatternLevel {
  level: number;
  questionCount: number;
  types: string[];
  poolSize: number;
}

const POOL = ['🍎', '🍌', '🍇', '🍓', '🍑', '🍒', '🐶', '🐱', '🐰', '🐼', '⭐', '🌈', '🌼', '🌻'];

const PROMPT = {
  zh: '看一看，下一个是什么？',
  en: 'What comes next?',
};

interface Question {
  promptZh: string;
  promptEn: string;
  visual: ReactNode;
  options: { key: string; node: ReactNode; correct: boolean }[];
}

/** 依据规律类型生成序列，返回 [序列, 正确答案] */
function makePattern(type: string, pool: string[]): [string[], string] {
  const pick = () => pool[Math.floor(Math.random() * pool.length)];
  const a = pick();
  let b = pick();
  while (b === a) b = pick();
  let c = pick();
  while (c === a || c === b) c = pick();

  switch (type) {
    case 'ABAB':
      return [[a, b, a, b, a], a];
    case 'AABB':
      return [[a, a, b, b, a], a];
    case 'ABBA':
      return [[a, b, b, a, b], b];
    case 'ABCABC':
      return [[a, b, c, a, b], c];
    case 'AABBAABB':
      return [[a, a, b, b, a, a, b], b];
    default:
      return [[a, b, a, b, a], a];
  }
}

function buildQuestions(lv: PatternLevel): Question[] {
  const qs: Question[] = [];
  for (let i = 0; i < lv.questionCount; i++) {
    const pool = [...POOL].sort(() => Math.random() - 0.5).slice(0, lv.poolSize);
    const type = lv.types[Math.floor(Math.random() * lv.types.length)];
    const [seq, answer] = makePattern(type, pool);
    const distractors = pool.filter((e) => e !== answer).sort(() => Math.random() - 0.5).slice(0, 3);
    const opts = [...distractors, answer].sort(() => Math.random() - 0.5);
    qs.push({
      promptZh: PROMPT.zh,
      promptEn: PROMPT.en,
      visual: (
        <div className="pattern-train">
          {seq.map((e, j) => (
            <span key={j} className={`pattern-car ${j === seq.length - 1 ? 'next' : ''}`}>
              {j === seq.length - 1 ? '❓' : e}
            </span>
          ))}
        </div>
      ),
      options: opts.map((e) => ({
        key: e,
        node: <span className="pattern-option">{e}</span>,
        correct: e === answer,
      })),
    });
  }
  return qs;
}

function PatternTrainGame({ level, onFinish }: GameProps) {
  const { lang } = useI18n();
  const lv = useMemo(
    () => (pack.levels.find((l) => l.level === level) ?? pack.levels[0]) as PatternLevel,
    [level],
  );
  const [questions] = useState<Question[]>(() => buildQuestions(lv));
  const session = useQuizSession(questions.length, onFinish);
  const q = questions[session.idx];

  const speakPrompt = () => speak(lang === 'zh' ? q.promptZh : q.promptEn, lang);
  useEffect(() => {
    speakPrompt();
     
  }, [session.idx, lang]);

  return (
    <QuizShell
      session={session}
      promptZh={q.promptZh}
      promptEn={q.promptEn}
      speakPrompt={speakPrompt}
      visual={q.visual}
    >
      {q.options.map((o) => (
        <button key={o.key} className="quiz-option" onClick={(e) => session.pick(o.correct, e)}>
          {o.node}
        </button>
      ))}
    </QuizShell>
  );
}

export const patternTrainDef: GameDef = {
  id: 'pattern-train',
  icon: '🚂',
  name: { zh: '规律接龙', en: 'Pattern Train' },
  category: 'thinking',
  desc: { zh: '找到排列的规律', en: 'Find the pattern' },
  levels: pack.levels.length,
  status: 'ready',
  Component: PatternTrainGame,
};
