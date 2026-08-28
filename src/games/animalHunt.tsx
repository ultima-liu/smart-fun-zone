import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import pack from './levels/animalHunt.json';
import type { GameDef } from '../gameRegistry';
import type { GameProps } from '../types';
import { speak } from '../speech';
import { useI18n } from '../i18n';
import { useQuizSession, QuizShell } from './quiz';

interface HuntLevel {
  level: number;
  questionCount: number;
  clueIds: string[];
}

const CLUES: Record<string, { zh: string; en: string; animalZh: string; animalEn: string; g: string }> = {
  panda: { zh: '爱吃竹子', en: 'loves to eat bamboo', animalZh: '熊猫', animalEn: 'panda', g: '🐼' },
  cat: { zh: '喵喵叫', en: 'says meow', animalZh: '小猫', animalEn: 'cat', g: '🐱' },
  dog: { zh: '汪汪叫', en: 'says woof', animalZh: '小狗', animalEn: 'dog', g: '🐶' },
  bird: { zh: '会飞', en: 'can fly', animalZh: '小鸟', animalEn: 'bird', g: '🐦' },
  cow: { zh: '会产奶', en: 'gives us milk', animalZh: '奶牛', animalEn: 'cow', g: '🐮' },
  rabbit: { zh: '会蹦蹦跳', en: 'hops around', animalZh: '兔子', animalEn: 'rabbit', g: '🐰' },
  penguin: { zh: '住在南极', en: 'lives at the South Pole', animalZh: '企鹅', animalEn: 'penguin', g: '🐧' },
  lion: { zh: '森林之王', en: 'king of the forest', animalZh: '狮子', animalEn: 'lion', g: '🦁' },
  elephant: { zh: '鼻子很长', en: 'has a long trunk', animalZh: '大象', animalEn: 'elephant', g: '🐘' },
  turtle: { zh: '走路慢吞吞', en: 'is very slow', animalZh: '乌龟', animalEn: 'turtle', g: '🐢' },
  dolphin: { zh: '住在海里', en: 'lives in the sea', animalZh: '海豚', animalEn: 'dolphin', g: '🐬' },
  giraffe: { zh: '脖子很长', en: 'has a long neck', animalZh: '长颈鹿', animalEn: 'giraffe', g: '🦒' },
  frog: { zh: '呱呱叫', en: 'says ribbit', animalZh: '青蛙', animalEn: 'frog', g: '🐸' },
  duck: { zh: '嘎嘎叫', en: 'says quack', animalZh: '鸭子', animalEn: 'duck', g: '🦆' },
};

const PROMPT = {
  zh: '听一听，是哪个动物？',
  en: 'Listen — which animal is it?',
};

interface Question {
  promptZh: string;
  promptEn: string;
  voiceZh: string;
  voiceEn: string;
  options: { key: string; node: ReactNode; correct: boolean }[];
}

function buildQuestions(lv: HuntLevel): Question[] {
  const qs: Question[] = [];
  for (let i = 0; i < lv.questionCount; i++) {
    const targetId = lv.clueIds[Math.floor(Math.random() * lv.clueIds.length)];
    const target = CLUES[targetId];
    const others = lv.clueIds.filter((id) => id !== targetId);
    const distractors = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
    const opts = [...distractors, targetId].sort(() => Math.random() - 0.5);
    qs.push({
      promptZh: `${PROMPT.zh}（${target.zh}）`,
      promptEn: `${PROMPT.en} (${target.en})`,
      voiceZh: target.zh,
      voiceEn: target.en,
      options: opts.map((id) => {
        const a = CLUES[id];
        return {
          key: id,
          node: (
            <>
              <span className="quiz-option-icon big">{a.g}</span>
              <span className="quiz-option-label">{a.animalZh}</span>
            </>
          ),
          correct: id === targetId,
        };
      }),
    });
  }
  return qs;
}

function AnimalHuntGame({ level, onFinish }: GameProps) {
  const { lang } = useI18n();
  const lv = useMemo(
    () => (pack.levels.find((l) => l.level === level) ?? pack.levels[0]) as HuntLevel,
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
    >
      {q.options.map((o) => (
        <button key={o.key} className="quiz-option" onClick={(e) => session.pick(o.correct, e)}>
          {o.node}
        </button>
      ))}
    </QuizShell>
  );
}

export const animalHuntDef: GameDef = {
  id: 'animal-hunt',
  icon: '🦉',
  name: { zh: '动物在哪里', en: 'Animal Hunt' },
  category: 'science',
  desc: { zh: '根据线索找动物', en: 'Find the animal by clues' },
  levels: pack.levels.length,
  status: 'ready',
  Component: AnimalHuntGame,
};
