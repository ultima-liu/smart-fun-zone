import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import pack from './levels/hanziPuzzle.json';
import type { GameDef } from '../gameRegistry';
import type { GameProps } from '../types';
import { speak } from '../speech';
import { useI18n } from '../i18n';
import { useQuizSession, QuizShell } from './quiz';

interface HanziLevel {
  level: number;
  questionCount: number;
  chars: string[];
}

const CHAR_INFO: Record<string, { zh: string; en: string; g: string }> = {
  一: { zh: '一', en: 'one', g: '☝️' },
  二: { zh: '二', en: 'two', g: '✌️' },
  三: { zh: '三', en: 'three', g: '🤟' },
  人: { zh: '人', en: 'person', g: '🚶' },
  口: { zh: '口', en: 'mouth', g: '😮' },
  手: { zh: '手', en: 'hand', g: '✋' },
  大: { zh: '大', en: 'big', g: '🐘' },
  小: { zh: '小', en: 'small', g: '🐜' },
  上: { zh: '上', en: 'up', g: '⬆️' },
  下: { zh: '下', en: 'down', g: '⬇️' },
  日: { zh: '日', en: 'sun', g: '🌞' },
  月: { zh: '月', en: 'moon', g: '🌙' },
  水: { zh: '水', en: 'water', g: '💧' },
  火: { zh: '火', en: 'fire', g: '🔥' },
  山: { zh: '山', en: 'mountain', g: '⛰️' },
  木: { zh: '木', en: 'tree', g: '🌳' },
  花: { zh: '花', en: 'flower', g: '🌸' },
  鸟: { zh: '鸟', en: 'bird', g: '🐦' },
  天: { zh: '天', en: 'sky', g: '☀️' },
  地: { zh: '地', en: 'earth', g: '🌍' },
  妈: { zh: '妈', en: 'mom', g: '👩' },
  爸: { zh: '爸', en: 'dad', g: '👨' },
  我: { zh: '我', en: 'me', g: '🙋' },
  你: { zh: '你', en: 'you', g: '👉' },
  学: { zh: '学', en: 'learn', g: '📚' },
  家: { zh: '家', en: 'home', g: '🏠' },
  乐: { zh: '乐', en: 'happy', g: '😄' },
  玩: { zh: '玩', en: 'play', g: '🪁' },
};

const PROMPT = {
  zh: '听一听，点出这个字',
  en: 'Listen and tap the character',
};

interface Question {
  promptZh: string;
  promptEn: string;
  voiceZh: string;
  voiceEn: string;
  visual: ReactNode;
  options: { key: string; node: ReactNode; correct: boolean }[];
}

function buildQuestions(lv: HanziLevel): Question[] {
  const qs: Question[] = [];
  for (let i = 0; i < lv.questionCount; i++) {
    const target = lv.chars[Math.floor(Math.random() * lv.chars.length)];
    const others = lv.chars.filter((c) => c !== target);
    const distractors = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
    const opts = [...distractors, target].sort(() => Math.random() - 0.5);
    const info = CHAR_INFO[target];
    qs.push({
      promptZh: PROMPT.zh,
      promptEn: PROMPT.en,
      voiceZh: target,
      voiceEn: info?.en ?? target,
      visual: (
        <div className="hanzi-show">
          <span className="hanzi-big">{target}</span>
          <span className="hanzi-emoji">{info?.g}</span>
        </div>
      ),
      options: opts.map((c) => ({
        key: c,
        node: <span className="hanzi-option">{c}</span>,
        correct: c === target,
      })),
    });
  }
  return qs;
}

function HanziPuzzleGame({ level, onFinish }: GameProps) {
  const { lang } = useI18n();
  const lv = useMemo(
    () => (pack.levels.find((l) => l.level === level) ?? pack.levels[0]) as HanziLevel,
    [level],
  );
  const [questions] = useState<Question[]>(() => buildQuestions(lv));
  const session = useQuizSession(questions.length, onFinish);
  const q = questions[session.idx];

  const speakPrompt = () => speak(lang === 'zh' ? q.voiceZh : q.voiceEn, lang);
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

export const hanziPuzzleDef: GameDef = {
  id: 'hanzi-puzzle',
  icon: '🧱',
  name: { zh: '汉字拼图', en: 'Hanzi Puzzle' },
  category: 'chinese',
  desc: { zh: '认一认常用汉字', en: 'Learn common characters' },
  levels: pack.levels.length,
  status: 'ready',
  Component: HanziPuzzleGame,
};
