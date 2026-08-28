import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import pack from './levels/trashSort.json';
import type { GameDef } from '../gameRegistry';
import type { GameProps } from '../types';
import { speak } from '../speech';
import { useI18n } from '../i18n';
import { useQuizSession, QuizShell } from './quiz';

interface TrashLevel {
  level: number;
  questionCount: number;
  binIds: string[];
}

type BinId = 'recyclable' | 'kitchen' | 'hazardous' | 'other';

const BINS: Record<BinId, { g: string; zh: string; en: string }> = {
  recyclable: { g: '♻️', zh: '可回收', en: 'Recyclable' },
  kitchen: { g: '🍂', zh: '厨余', en: 'Kitchen' },
  hazardous: { g: '☠️', zh: '有害', en: 'Hazardous' },
  other: { g: '🗑️', zh: '其他', en: 'Other' },
};

const ITEMS: { g: string; zh: string; en: string; bin: BinId }[] = [
  { g: '🍶', zh: '塑料瓶', en: 'plastic bottle', bin: 'recyclable' },
  { g: '🥫', zh: '易拉罐', en: 'soda can', bin: 'recyclable' },
  { g: '📰', zh: '旧报纸', en: 'newspaper', bin: 'recyclable' },
  { g: '📦', zh: '纸箱', en: 'cardboard box', bin: 'recyclable' },
  { g: '🍌', zh: '香蕉皮', en: 'banana peel', bin: 'kitchen' },
  { g: '🍎', zh: '苹果核', en: 'apple core', bin: 'kitchen' },
  { g: '🍚', zh: '剩饭', en: 'leftover rice', bin: 'kitchen' },
  { g: '🥬', zh: '菜叶', en: 'vegetable leaf', bin: 'kitchen' },
  { g: '🔋', zh: '电池', en: 'battery', bin: 'hazardous' },
  { g: '💊', zh: '过期药品', en: 'expired medicine', bin: 'hazardous' },
  { g: '💡', zh: '灯泡', en: 'light bulb', bin: 'hazardous' },
  { g: '🏺', zh: '陶瓷碎片', en: 'broken pottery', bin: 'other' },
  { g: '🧻', zh: '脏纸巾', en: 'used tissue', bin: 'other' },
  { g: '🪥', zh: '旧牙刷', en: 'old toothbrush', bin: 'other' },
];

const PROMPT = {
  zh: '这个垃圾该放进哪个桶？',
  en: 'Which bin does this go in?',
};

interface Question {
  promptZh: string;
  promptEn: string;
  voiceZh: string;
  voiceEn: string;
  visual: ReactNode;
  options: { key: string; node: ReactNode; correct: boolean }[];
}

function buildQuestions(lv: TrashLevel): Question[] {
  const bins: BinId[] = lv.binIds as BinId[];
  const qs: Question[] = [];
  for (let i = 0; i < lv.questionCount; i++) {
    const candidates = ITEMS.filter((it) => bins.includes(it.bin));
    const item = candidates[Math.floor(Math.random() * candidates.length)];
    const opts = [...bins].sort(() => Math.random() - 0.5);
    qs.push({
      promptZh: PROMPT.zh,
      promptEn: PROMPT.en,
      voiceZh: `${item.zh}`,
      voiceEn: `${item.en}`,
      visual: (
        <div className="trash-show">
          <span className="trash-item">{item.g}</span>
          <span className="trash-name">{item.zh}</span>
        </div>
      ),
      options: opts.map((b) => {
        const bin = BINS[b];
        return {
          key: b,
          node: (
            <>
              <span className="quiz-option-icon">{bin.g}</span>
              <span className="quiz-option-label">
                {bin.zh}
                <small className="en">{bin.en}</small>
              </span>
            </>
          ),
          correct: b === item.bin,
        };
      }),
    });
  }
  return qs;
}

function TrashSortGame({ level, onFinish }: GameProps) {
  const { lang } = useI18n();
  const lv = useMemo(
    () => (pack.levels.find((l) => l.level === level) ?? pack.levels[0]) as TrashLevel,
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

export const trashSortDef: GameDef = {
  id: 'trash-sort',
  icon: '🗑️',
  name: { zh: '垃圾分类', en: 'Trash Sort' },
  category: 'thinking',
  desc: { zh: '把垃圾放进正确的桶', en: 'Sort the trash' },
  levels: pack.levels.length,
  status: 'ready',
  Component: TrashSortGame,
};
