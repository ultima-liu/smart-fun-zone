import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { useStore } from '../store';
import { KidButton } from './ui';
import Mascot from './Mascot';
import MathFigure from './MathFigure';
import { speak, playSfx, volcConfigured } from '../speech';
import type { MathFigure as MathFigureSpec, Quiz, TeachStep, WorkedExample } from '../content/skills';

/* ================= 数学课专用学习节点（替代 听读 / 认生字） ================= */

/** 语音开关关闭时的提示（否则整课静默，家长不知道原因） */
function VoiceOffHint({ lang }: { lang: 'zh' | 'en' }) {
  const voiceOn = useStore((s) => s.voiceOn);
  if (voiceOn) return null;
  return (
    <div className="voice-off-hint">
      {lang === 'zh' ? '🔇 语音开关已关闭：到「我的」页打开语音，就能听到讲解人声' : '🔇 Voice is off: enable it in Profile to hear the narration'}
    </div>
  );
}

/** 未配置火山引擎语音密钥时的提示 */
function VolcMissingHint({ lang }: { lang: 'zh' | 'en' }) {
  if (volcConfigured()) return null;
  return (
    <div className="voice-off-hint">
      {lang === 'zh'
        ? '⚠️ 未配置火山引擎语音：请在项目 .env.local 中设置 VOLC_SPEECH_API_KEY 后重启开发服务器'
        : '⚠️ Volcengine TTS not configured: set VOLC_SPEECH_API_KEY in .env.local and restart the dev server'}
    </div>
  );
}

/** 看例题：情境示例卡 + 2~3 道例题逐步详解（知识含量足），点行听讲解；
    配图动画自带数数语音，播完后自动朗读本课示例句 */
export function MathExample({ figure, example, worked, text, lang, onDone }: { figure: MathFigureSpec | undefined; example: string; worked: WorkedExample[]; text: string; lang: 'zh' | 'en'; onDone: () => void }) {
  const { t } = useI18n();
  const paras = text.split('\n').map((s) => s.trim()).filter(Boolean);
  const exampleRef = useRef(example);
  useEffect(() => {
    exampleRef.current = example;
  });
  return (
    <div className="math-example">
      <VoiceOffHint lang={lang} />
      <VolcMissingHint lang={lang} />
      {figure && (
        <MathFigure
          figure={figure}
          lang={lang}
          onVoiceEnd={() => {
            if (exampleRef.current) speak(exampleRef.current, lang);
          }}
        />
      )}
      <div className="example-scene" onClick={() => speak(example, lang)}>
        <span className="example-scene-label">📖 例</span>
        <span className="example-scene-text">{example}</span>
      </div>
      {worked.length > 0 ? (
        worked.map((w, wi) => (
          <div key={wi} className="work-example">
            <div className="work-title" onClick={() => speak(w.title, lang)}>
              📝 {w.title}
            </div>
            <div className="work-problem" onClick={() => speak(w.problem, lang)}>
              {w.problem}
            </div>
            <ol className="work-solution">
              {w.solution.map((s, si) => (
                <li key={si} onClick={() => speak(s, lang)}>
                  {s}
                </li>
              ))}
            </ol>
            <div className="work-answer" onClick={() => speak(w.answer, lang)}>
              ✔ 答：{w.answer}
            </div>
          </div>
        ))
      ) : (
        <div className="example-body">
          {paras.map((p, i) => (
            <div key={i} className="example-para" onClick={() => speak(p, lang)}>
              {p}
            </div>
          ))}
        </div>
      )}
      <p className="tap-para-tip">👆 {t('tapParaTip')}</p>
      <div className="lesson-actions">
        <KidButton color="green" onClick={onDone}>
          ✅ {t('readDone')}
        </KidButton>
      </div>
    </div>
  );
}

/** 答题语音反馈（答对表扬 / 答错建议+鼓励，按小节轮换避免重复） */
const CHK_PRAISE = ['太棒了，答对了！', '真厉害！', '答对啦，你真棒！', '完全正确，给你点赞！'];
const CHK_ENCOURAGE = [
  '再想想，没关系，你一定能做对！',
  '差一点点，别灰心，再试一次！',
  '答错了不要紧，想一想老师刚讲的，加油！',
];

/** 看演示：交互式教学——每小节讲完立即"小试身手"检验理解，答对才进入下一节 */
export function MathExplain({
  figure,
  steps,
  points,
  lang,
  onDone,
}: {
  figure: MathFigureSpec | undefined;
  steps: TeachStep[] | undefined;
  points: string[];
  lang: 'zh' | 'en';
  onDone: () => void;
}) {
  const { t } = useI18n();
  const narr: TeachStep[] =
    steps && steps.length > 0
      ? steps
      : points.map((p, pi) => ({ title: `${t('rememberPoints')} ${pi + 1}`, text: p }));
  const [i, setI] = useState(0);
  const [checking, setChecking] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);

  const step = narr[i];
  const stepFigure = step?.figure ?? figure;
  const stepText = step
    ? `${step.title}。${step.text}${step.example ? `。例如：${step.example}` : ''}`
    : '';

  // 讲解人声在演示动画开始时同步开讲（画外音）；配图保持静音，不与讲解抢话
  useEffect(() => {
    if (stepText && !checking) speak(stepText, lang);
  }, [i, stepText, lang, checking]);

  const pick = (idx: number) => {
    if (picked !== null || !step?.check) return;
    if (idx === step.check.answer) {
      setPicked(idx);
      playSfx('correct');
      speak(CHK_PRAISE[i % CHK_PRAISE.length], lang);
    } else {
      setWrongIdx(idx);
      playSfx('wrong');
      const sug = step.tip ?? step.example;
      speak(`${CHK_ENCOURAGE[i % CHK_ENCOURAGE.length]}${sug ? `，${sug}` : ''}`, lang);
      window.setTimeout(() => setWrongIdx(null), 500);
    }
  };

  const next = () => {
    if (i < narr.length - 1) {
      setI(i + 1);
      setChecking(false);
      setPicked(null);
    } else {
      onDone();
    }
  };

  return (
    <div className="math-explain">
      <VoiceOffHint lang={lang} />
      <VolcMissingHint lang={lang} />
      {/* 演示配图：随小节变化（图态优先，缺省用本课配图）；讲解人声做画外音，配图静音 */}
      {stepFigure && <MathFigure figure={stepFigure} lang={lang} voice={false} />}
      {/* 学习进度 */}
      <div className="explain-progress">
        {narr.map((_, j) => (
          <span key={j} className={`explain-dot ${j < i ? 'done' : j === i ? 'active' : ''}`} />
        ))}
        <span className="explain-count">
          {i + 1} / {narr.length}
        </span>
      </div>

      {!checking ? (
        <>
          <div className="explain-card">
            <Mascot pose="happy" size={60} />
            <div className="explain-bubble">
              {step && (
                <>
                  <div className="explain-title tap-to-read" onClick={() => speak(step.title, lang)}>
                    {step.title}
                  </div>
                  <div className="explain-text tap-to-read" onClick={() => speak(step.text, lang)}>
                    {step.text}
                  </div>
                  {step.example && (
                    <div className="explain-example tap-to-read" onClick={() => speak(`例如：${step.example}`, lang)}>
                      ✨ 例：{step.example}
                    </div>
                  )}
                  {step.tip && (
                    <div className="explain-tip tap-to-read" onClick={() => speak(`${t('tip')}：${step.tip}`, lang)}>
                      ⚠️ {t('tip')}：{step.tip}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <p className="tap-para-tip">👆 {t('tapParaTip')}</p>
          <div className="explain-nav">
            <KidButton
              color="white"
              disabled={i === 0}
              onClick={() => {
                setI(i - 1);
                setPicked(null);
              }}
            >
              ◀ {t('prevStep')}
            </KidButton>
            <KidButton color="white" onClick={() => speak(stepText, lang)}>
              🔊 {t('replay')}
            </KidButton>
            {step?.check ? (
              <KidButton
                color="yellow"
                onClick={() => {
                  setChecking(true);
                  if (step?.check) {
                    const opts = step.check.options.map((o, oi) => `${oi + 1}、${o}`).join('，');
                    speak(`${step.check.q}。${opts}`, lang);
                  }
                }}
              >
                🔍 {t('tryIt')}
              </KidButton>
            ) : i < narr.length - 1 ? (
              <KidButton color="yellow" onClick={next}>
                {t('nextStep')} ▶
              </KidButton>
            ) : (
              <KidButton color="green" onClick={onDone}>
                ✅ {t('learned')}
              </KidButton>
            )}
          </div>
        </>
      ) : (
        <div className="quiz-card">
          <div
            className="quiz-q tap-to-read"
            onClick={() => {
              if (step?.check) {
                const opts = step.check.options.map((o, oi) => `${oi + 1}、${o}`).join('，');
                speak(`${step.check.q}。${opts}`, lang);
              }
            }}
          >
            🤔 {t('tryIt')}：{step?.check?.q}
          </div>
          <div className="quiz-options">
            {step?.check?.options.map((o, idx) => (
              <button
                key={idx}
                className={`quiz-opt ${picked === idx ? 'correct' : ''} ${wrongIdx === idx ? 'wrong' : ''}`}
                onClick={() => pick(idx)}
                disabled={picked !== null}
              >
                {o}
              </button>
            ))}
          </div>
          {wrongIdx !== null && step && <div className="quiz-hint">💡 {t('hint')}：{step.text}</div>}
          {picked !== null && (
            <div className="explain-nav">
              <div className="quiz-pass">🎉 {t('correct')}</div>
              <KidButton color="green" onClick={next}>
                {i < narr.length - 1 ? `${t('nextStep')} ▶` : `✅ ${t('learned')}`}
              </KidButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** 记要点：口诀卡（记忆） + 配图小样 + 要点卡 + 关键词 + 「想一想」 */
export function MathConcepts({
  figure,
  rhyme,
  points,
  words,
  quiz,
  lang,
  onDone,
}: {
  figure: MathFigureSpec | undefined;
  rhyme: string | undefined;
  points: string[];
  words: string[];
  quiz: Quiz | undefined;
  lang: 'zh' | 'en';
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [quizPassed, setQuizPassed] = useState(false);
  return (
    <div className="math-concepts">
      {rhyme && (
        <div className="rhyme-card" onClick={() => speak(rhyme, lang)}>
          <span className="rhyme-icon">🎵</span>
          <span className="rhyme-text">{rhyme}</span>
        </div>
      )}
      {figure && (
        <div className="math-concepts-fig">
          <MathFigure figure={figure} />
        </div>
      )}
      <h3 className="chars-title">📌 {t('rememberPoints')}</h3>
      <div className="concept-list">
        {points.map((p, idx) => (
          <div key={idx} className="concept-card" onClick={() => speak(p, lang)}>
            <span className="concept-no">{idx + 1}</span>
            <span className="concept-text">{p}</span>
          </div>
        ))}
      </div>
      {words.length > 0 && (
        <div className="keyword-tags">
          {words.map((w) => (
            <span key={w} className="keyword-tag">
              {w}
            </span>
          ))}
        </div>
      )}
      {quiz && <QuizCard quiz={quiz} onPass={() => setQuizPassed(true)} />}
      {(!quiz || quizPassed) && (
        <div className="lesson-actions">
          <KidButton color="green" onClick={onDone}>
            ✅ {t('allRemembered')}
          </KidButton>
        </div>
      )}
    </div>
  );
}

function QuizCard({ quiz, onPass }: { quiz: Quiz; onPass: () => void }) {
  const { t } = useI18n();
  const [picked, setPicked] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number | null>(null);
  const pick = (idx: number) => {
    if (picked !== null) return;
    if (idx === quiz.answer) {
      setPicked(idx);
      playSfx('correct');
      onPass();
    } else {
      setWrong(idx);
      playSfx('wrong');
      window.setTimeout(() => setWrong(null), 600);
    }
  };
  return (
    <div className="quiz-card">
      <div className="quiz-q">
        🤔 {t('thinkAbout')}：{quiz.q}
      </div>
      <div className="quiz-options">
        {quiz.options.map((o, idx) => (
          <button
            key={idx}
            className={`quiz-opt ${picked === idx ? 'correct' : ''} ${wrong === idx ? 'wrong' : ''}`}
            onClick={() => pick(idx)}
            disabled={picked !== null}
          >
            {o}
          </button>
        ))}
      </div>
      {picked !== null && <div className="quiz-pass">🎉 {t('correct')}</div>}
    </div>
  );
}
