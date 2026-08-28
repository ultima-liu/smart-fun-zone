import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store';
import { useI18n } from '../i18n';
import { KidButton, TopBar, Stars, Confetti } from '../components/ui';
import Mascot from '../components/Mascot';
import LessonPractice from '../components/LessonPractice';
import LessonPracticeEnglish from '../components/LessonPracticeEnglish';
import MathPractice from '../components/MathPractice';
import { StepBar } from '../components/StepBar';
import { getSkill, type LessonContent } from '../content/skills';
import { loadLessonContent } from '../content/contentLoader';
import { MATH_FIGURES } from '../content/mathFigures';
import { MATH_QUIZ } from '../content/mathQuiz';
import { MATH_PRACTICE_BANK } from '../content/mathPracticeBank';
import { MATH_RHYMES } from '../content/mathRhymes';
import { CHINESE_ENHANCE } from '../content/chineseEnhance';
import { genMathPractice } from '../content/mathPractice';
import { speak, playSfx } from '../speech';

export default function PracticePage() {
  const { skillId } = useParams();
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const addSkillResult = useStore((s) => s.addSkillResult);
  const skill = skillId ? getSkill(skillId) : undefined;
  const [contentById, setContentById] = useState<Record<string, LessonContent | undefined>>({});
  const [loadedIds, setLoadedIds] = useState<ReadonlySet<string>>(new Set());

  const [session, setSession] = useState(0);
  const [result, setResult] = useState<{ stars: number; correct: number; total: number } | null>(null);
  const [lit, setLit] = useState(false);

  // 懒加载真实课程内容（课文/生字），状态只在异步回调里更新；数学练习无需正文
  useEffect(() => {
    if (!skill || skill.subject === 'math' || skill.content !== undefined) return;
    let alive = true;
    loadLessonContent(skill.id).then((c) => {
      if (!alive) return;
      setContentById((m) => ({ ...m, [skill.id]: c }));
      setLoadedIds((s) => new Set(s).add(skill.id));
    });
    return () => {
      alive = false;
    };
  }, [skill]);

  const isMath = skill?.subject === 'math';
  const content = skill && loadedIds.has(skill.id) ? contentById[skill.id] : skill?.content;
  const contentReady = !skill || isMath || skill.content !== undefined || loadedIds.has(skill.id);
  const canPractice = !!skill && (isMath || ((skill.subject === 'chinese' || skill.subject === 'english') && !!content));

  const figure = (skill && MATH_FIGURES[skill.id]) || content?.figure;
  const quiz = isMath && skill ? MATH_QUIZ[skill.id] : undefined;
  // 去练习：优先用逐课精心设计的专属题库；未覆盖课时回退到自动生成（含概念题）
  const questions = useMemo(
    () => (isMath && skill ? (MATH_PRACTICE_BANK[skill.id] ?? genMathPractice(figure, quiz)) : []),
    [isMath, figure, quiz, skill],
  );
  const rhyme = isMath && skill ? MATH_RHYMES[skill.id] : undefined;
  // 语文课：增强内容（梯度练习 + 中心句提示）
  const ch = skill?.subject === 'chinese' ? CHINESE_ENHANCE[skill.id ?? ''] : undefined;
  const chPractice = ch?.practice;
  const chRhyme = ch?.rhyme;

  useEffect(() => {
    if (!child || !skill) {
      nav('/map');
      return;
    }
    if (contentReady && !canPractice) nav('/map');
  }, [child, skill, contentReady, canPractice, nav]);

  if (!child || !skill) return null;
  if (!contentReady) {
    return (
      <div className="page practice">
        <TopBar title={`✏️ ${t('practiceTitle')} · ${skill.name[lang]}`} onBack={() => nav(`/learn/${skill.id}`)} />
        <div className="lesson-stage">
          <div className="lesson-loading">⏳ 加载中…</div>
        </div>
      </div>
    );
  }
  if (!canPractice) return null;

  const handleFinish = (stars: number, correct: number, total: number) => {
    setResult({ stars, correct, total });
    const pass = total > 0 && correct / total >= 0.8;
    if (pass) {
      addSkillResult(child.id, skill.id);
      setLit(true);
    }
    playSfx('win');
    speak(pass ? t('litTip') : t('practiceDone'), lang);
  };

  return (
    <div className="page practice">
      <TopBar
        title={`✏️ ${t('practiceTitle')} · ${skill.name[lang]}`}
        onBack={() => nav(`/learn/${skill.id}`)}
      />

      {/* 学习步骤条：练习节点高亮，可点回前面的学习步骤 */}
      <StepBar
        current={3}
        labels={
          isMath
            ? [t('viewExample'), t('watchDemo'), t('rememberPoints'), t('goPractice')]
            : [t('read'), t('listen'), skill.subject === 'english' ? t('wordStep') : t('chars'), t('goPractice')]
        }
        onStepClick={(i) => {
          if (i < 3) nav(`/learn/${skill.id}?step=${i}`);
        }}
      />

      {result ? (
        <div className="lesson-stage practice-stage">
          <div className="result-wrap">
            <Confetti show={lit} />
            <div className="result-panel">
              <Mascot pose={lit ? 'celebrate' : 'happy'} size={104} />
              <h2 className="result-title">{t('practiceDone')}</h2>
              <div className="result-stars">
                <Stars count={result.stars} size={60} />
              </div>
              {lit && <p className="result-text">⭐ {t('litTip')}</p>}
              <div className="result-actions">
                <KidButton
                  color="yellow"
                  onClick={() => {
                    setResult(null);
                    setSession((s) => s + 1);
                  }}
                >
                  {t('practiceAgain')}
                </KidButton>
                <KidButton color="green" onClick={() => nav(`/learn/${skill.id}`)}>
                  {t('backToLesson')}
                </KidButton>
                <KidButton color="white" onClick={() => nav('/map')}>
                  {t('backToMap')}
                </KidButton>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="lesson-stage practice-stage">
          {isMath ? (
            <MathPractice key={session} questions={questions} rhyme={rhyme} onFinish={handleFinish} />
          ) : chPractice && chPractice.length > 0 ? (
            <MathPractice key={session} questions={chPractice} rhyme={chRhyme} onFinish={handleFinish} />
          ) : skill.subject === 'english' ? (
            <LessonPracticeEnglish
              key={session}
              text={content?.text ?? ''}
              words={content?.words ?? []}
              translation={content?.translation}
              onFinish={handleFinish}
            />
          ) : (
            <LessonPractice
              key={session}
              text={content?.text ?? ''}
              words={content?.words ?? []}
              onFinish={handleFinish}
            />
          )}
        </div>
      )}
    </div>
  );
}
