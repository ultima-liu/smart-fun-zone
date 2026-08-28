import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import pack from './levels/shapeCastle.json';
import type { GameDef } from '../gameRegistry';
import type { GameProps } from '../types';
import { speak } from '../speech';
import { useI18n } from '../i18n';
import { useQuizSession, QuizShell } from './quiz';

interface ShapeLevel {
  level: number;
  questionCount: number;
  shapeIds: string[];
}

const SHAPES: Record<string, { g: string; zh: string; en: string }> = {
  circle: { g: '⬤', zh: '圆形', en: 'Circle' },
  triangle: { g: '🔺', zh: '三角形', en: 'Triangle' },
  square: { g: '🟦', zh: '正方形', en: 'Square' },
  star: { g: '⭐', zh: '星星', en: 'Star' },
  heart: { g: '❤️', zh: '爱心', en: 'Heart' },
  diamond: { g: '🔶', zh: '菱形', en: 'Diamond' },
  crescent: { g: '🌙', zh: '月牙', en: 'Crescent' },
};

const PROMPT = {
  zh: '城堡门上哪个图形和它一样？',
  en: 'Which shape matches the castle door?',
};

interface Question {
  promptZh: string;
  promptEn: string;
  visual: string;
  options: { key: string; node: ReactNode; correct: boolean }[];
}

function buildQuestions(lv: ShapeLevel): Question[] {
  const qs: Question[] = [];
  for (let i = 0; i < lv.questionCount; i++) {
    const target = lv.shapeIds[Math.floor(Math.random() * lv.shapeIds.length)];
    const others = lv.shapeIds.filter((s) => s !== target);
    const distractors = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
    const opts = [...distractors, target].sort(() => Math.random() - 0.5);
    const t = SHAPES[target];
    qs.push({
      promptZh: PROMPT.zh,
      promptEn: PROMPT.en,
      visual: t.g,
      options: opts.map((id) => {
        const s = SHAPES[id];
        return {
          key: id,
          node: (
            <>
              <span className="quiz-option-icon">{s.g}</span>
              <span className="quiz-option-label">{s.zh}</span>
            </>
          ),
          correct: id === target,
        };
      }),
    });
  }
  return qs;
}

function ShapeCastleGame({ level, onFinish }: GameProps) {
  const { lang } = useI18n();
  const lv = useMemo(
    () => (pack.levels.find((l) => l.level === level) ?? pack.levels[0]) as ShapeLevel,
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
      visual={<span className="shape-answer">{q.visual}</span>}
    >
      {q.options.map((o) => (
        <button key={o.key} className="quiz-option tall" onClick={(e) => session.pick(o.correct, e)}>
          {o.node}
        </button>
      ))}
    </QuizShell>
  );
}

export const shapeCastleDef: GameDef = {
  id: 'shape-castle',
  icon: '🏰',
  name: { zh: '形状城堡', en: 'Shape Castle' },
  category: 'math',
  desc: { zh: '把图形送回家', en: 'Match shapes to their doors' },
  levels: pack.levels.length,
  status: 'ready',
  Component: ShapeCastleGame,
};
