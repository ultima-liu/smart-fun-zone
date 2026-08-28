import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import pack from './levels/trafficLight.json';
import type { GameDef } from '../gameRegistry';
import type { GameProps } from '../types';
import { speak } from '../speech';
import { useI18n } from '../i18n';
import { useQuizSession, QuizShell } from './quiz';

interface LightLevel {
  level: number;
  questionCount: number;
  states: string[];
}

type LightState = 'red' | 'yellow' | 'green';

const PROMPT = {
  zh: '现在可以过马路吗？',
  en: 'Can we cross the road now?',
};

interface Question {
  promptZh: string;
  promptEn: string;
  voiceZh: string;
  voiceEn: string;
  visual: ReactNode;
  options: { key: string; node: ReactNode; correct: boolean }[];
}

function TrafficLightSvg({ state }: { state: LightState }) {
  const lights: [LightState, string][] = [
    ['red', '#EF5350'],
    ['yellow', '#FFEE58'],
    ['green', '#66BB6A'],
  ];
  return (
    <svg viewBox="0 0 120 240" width={84} height={168} aria-hidden="true">
      <rect x="10" y="10" width="100" height="190" rx="26" fill="#37474F" />
      {lights.map(([key, color]) => (
        <circle
          key={key}
          cx="60"
          cy={40 + lights.findIndex((l) => l[0] === key) * 66}
          r="28"
          fill={state === key ? color : '#263238'}
          opacity={state === key ? 1 : 0.55}
        >
          {state === key && <animate attributeName="opacity" values="1;0.6;1" dur="1s" repeatCount="indefinite" />}
        </circle>
      ))}
      <rect x="42" y="204" width="36" height="26" rx="8" fill="#37474F" />
    </svg>
  );
}

function buildQuestions(lv: LightLevel, lang: 'zh' | 'en'): Question[] {
  const states: LightState[] = lv.states as LightState[];
  const qs: Question[] = [];
  const gen = () => {
    // 绿灯出现的概率略低，增加思考
    const r = Math.random();
    if (states.length === 2) return r < 0.45 ? 'red' : 'green';
    return r < 0.4 ? 'red' : r < 0.7 ? 'yellow' : 'green';
  };
  for (let i = 0; i < lv.questionCount; i++) {
    const state = gen();
    const canGo = state === 'green';
    qs.push({
      promptZh: PROMPT.zh,
      promptEn: PROMPT.en,
      voiceZh: canGo ? '绿灯亮了，可以过马路' : '不可以过马路，要等一等',
      voiceEn: canGo ? 'The light is green. You may cross!' : 'No, wait for the green light',
      visual: <TrafficLightSvg state={state} />,
      options: (
        [
          { key: 'go', node: <span className="go-option">✅ {langGo(lang)}</span>, correct: canGo },
          { key: 'wait', node: <span className="wait-option">⏸️ {langWait(lang)}</span>, correct: !canGo },
        ] as { key: string; node: ReactNode; correct: boolean }[]
      ).sort(() => Math.random() - 0.5),
    });
  }
  return qs;
}

function langGo(lang: 'zh' | 'en') {
  return lang === 'zh' ? '可以走' : 'Cross';
}

function langWait(lang: 'zh' | 'en') {
  return lang === 'zh' ? '等一等' : 'Wait';
}

function TrafficLightGame({ level, onFinish }: GameProps) {
  const { lang } = useI18n();
  const lv = useMemo(
    () => (pack.levels.find((l) => l.level === level) ?? pack.levels[0]) as LightLevel,
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
      visual={q.visual}
    >
      {q.options.map((o) => (
        <button key={o.key} className="quiz-option tall" onClick={(e) => session.pick(o.correct, e)}>
          {o.node}
        </button>
      ))}
    </QuizShell>
  );
}

export const trafficLightDef: GameDef = {
  id: 'traffic-light',
  icon: '🚦',
  name: { zh: '红绿灯', en: 'Traffic Light' },
  category: 'life',
  desc: { zh: '安全过马路', en: 'Cross the road safely' },
  levels: pack.levels.length,
  status: 'ready',
  Component: TrafficLightGame,
};
