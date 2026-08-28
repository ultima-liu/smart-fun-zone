import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { speak, playSfx } from '../speech';
import type { Quiz } from '../content/skills';

/** 答题语音反馈 */
const PRC_PRAISE = ['太棒了！', '真厉害！', '答对啦！', '完全正确！'];
const PRC_ENCOURAGE = ['再想想，别灰心！', '差一点点，再试一次！', '没关系，想一想本课的口诀，加油！'];

/** 数学「去练习」：逐题闯关（3 选 1），题目语音朗读，答错给口诀提示再试，答完回调 onFinish */
export default function MathPractice({
  questions,
  rhyme,
  onFinish,
}: {
  questions: Quiz[];
  rhyme?: string;
  onFinish: (stars: number, correct: number, total: number) => void;
}) {
  const { t } = useI18n();
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number | null>(null);
  const [hint, setHint] = useState(false);

  const total = questions.length;
  const q = questions[idx];

  // 进入新一题：语音朗读题目和选项
  useEffect(() => {
    const cur = questions[idx];
    if (cur) {
      const opts = cur.options.map((o, oi) => `${oi + 1}、${o}`).join('，');
      speak(`${cur.q}。${opts}`, 'zh');
    }
  }, [idx, questions]);

  const pick = (i: number) => {
    if (picked !== null || !q) return;
    if (i === q.answer) {
      setPicked(i);
      setCorrect((c) => c + 1);
      playSfx('correct');
      speak(PRC_PRAISE[idx % PRC_PRAISE.length], 'zh');
      window.setTimeout(() => {
        if (idx + 1 >= total) {
          const finalCorrect = correct + 1;
          const stars = total > 0 ? Math.round((finalCorrect / total) * 3) : 0;
          onFinish(stars, finalCorrect, total);
        } else {
          setIdx((x) => x + 1);
          setPicked(null);
          setHint(false);
        }
      }, 650);
    } else {
      setWrong(i);
      setHint(true);
      playSfx('wrong');
      speak(`${PRC_ENCOURAGE[idx % PRC_ENCOURAGE.length]}${rhyme ? `，${rhyme}` : ''}`, 'zh');
      window.setTimeout(() => setWrong(null), 500);
    }
  };

  if (!q) return null;

  return (
    <div className="math-practice">
      <div className="math-practice-progress">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={`mp-dot ${i < idx ? 'done' : i === idx ? 'active' : ''}`} />
        ))}
        <span className="mp-count">
          {idx + 1} / {total}
        </span>
      </div>
      <div className="quiz-card">
        <div className="quiz-q">{q.q}</div>
        <div className="quiz-options">
          {q.options.map((o, i) => (
            <button
              key={i}
              className={`quiz-opt ${picked === i ? 'correct' : ''} ${wrong === i ? 'wrong' : ''}`}
              onClick={() => pick(i)}
              disabled={picked !== null}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
      {hint && picked === null && (
        <div className="quiz-hint">💡 {t('hint')}：{rhyme ?? t('thinkAgain')}</div>
      )}
      {picked !== null && <div className="quiz-pass">🎉 {t('correct')}</div>}
    </div>
  );
}
