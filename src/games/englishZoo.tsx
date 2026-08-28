import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import pack from './levels/englishZoo.json';
import type { GameDef } from '../gameRegistry';
import type { GameProps } from '../types';
import { speak } from '../speech';
import { useI18n } from '../i18n';
import { useQuizSession, QuizShell } from './quiz';

interface ZooLevel {
  level: number;
  questionCount: number;
  animalIds: string[];
}

const ANIMALS: Record<string, { g: string; zh: string; en: string }> = {
  cat: { g: '🐱', zh: '猫', en: 'cat' },
  dog: { g: '🐶', zh: '狗', en: 'dog' },
  pig: { g: '🐷', zh: '猪', en: 'pig' },
  cow: { g: '🐮', zh: '牛', en: 'cow' },
  sheep: { g: '🐑', zh: '羊', en: 'sheep' },
  duck: { g: '🦆', zh: '鸭子', en: 'duck' },
  monkey: { g: '🐵', zh: '猴子', en: 'monkey' },
  lion: { g: '🦁', zh: '狮子', en: 'lion' },
  tiger: { g: '🐯', zh: '老虎', en: 'tiger' },
  elephant: { g: '🐘', zh: '大象', en: 'elephant' },
  bear: { g: '🐻', zh: '熊', en: 'bear' },
  bird: { g: '🐦', zh: '小鸟', en: 'bird' },
  fish: { g: '🐟', zh: '鱼', en: 'fish' },
  frog: { g: '🐸', zh: '青蛙', en: 'frog' },
  rabbit: { g: '🐰', zh: '兔子', en: 'rabbit' },
  horse: { g: '🐴', zh: '马', en: 'horse' },
};

const PROMPT = {
  zh: '听一听，点出对应的动物',
  en: 'Listen and tap the animal',
};

interface Question {
  promptZh: string;
  promptEn: string;
  voiceZh: string;
  voiceEn: string;
  options: { key: string; node: ReactNode; correct: boolean }[];
}

function buildQuestions(lv: ZooLevel, lang: 'zh' | 'en'): Question[] {
  const qs: Question[] = [];
  for (let i = 0; i < lv.questionCount; i++) {
    const targetId = lv.animalIds[Math.floor(Math.random() * lv.animalIds.length)];
    const target = ANIMALS[targetId];
    const others = lv.animalIds.filter((id) => id !== targetId);
    const distractors = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
    const opts = [...distractors, targetId].sort(() => Math.random() - 0.5);
    qs.push({
      promptZh: PROMPT.zh,
      promptEn: PROMPT.en,
      voiceZh: `${target.en}，${target.en}`,
      voiceEn: `Where is the ${target.en}?`,
      options: opts.map((id) => {
        const a = ANIMALS[id];
        return {
          key: id,
          node: (
            <>
              <span className="quiz-option-icon big">{a.g}</span>
              <span className="quiz-option-label">{lang === 'zh' ? a.zh : a.en}</span>
            </>
          ),
          correct: id === targetId,
        };
      }),
    });
  }
  return qs;
}

function EnglishZooGame({ level, onFinish }: GameProps) {
  const { lang } = useI18n();
  const lv = useMemo(
    () => (pack.levels.find((l) => l.level === level) ?? pack.levels[0]) as ZooLevel,
    [level],
  );
  const [questions] = useState<Question[]>(() => buildQuestions(lv, lang));
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
    >
      {q.options.map((o) => (
        <button key={o.key} className="quiz-option" onClick={(e) => session.pick(o.correct, e)}>
          {o.node}
        </button>
      ))}
    </QuizShell>
  );
}

export const englishZooDef: GameDef = {
  id: 'english-zoo',
  icon: '🦁',
  name: { zh: '英语动物园', en: 'English Zoo' },
  category: 'english',
  desc: { zh: '听单词找动物', en: 'Listen and find the animal' },
  levels: pack.levels.length,
  status: 'ready',
  Component: EnglishZooGame,
};
