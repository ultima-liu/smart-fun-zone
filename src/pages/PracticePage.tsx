import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store';
import { useI18n } from '../i18n';
import { KidButton, Stars, Confetti } from '../components/ui';
import { IconBack } from '../components/icons';
import { SceneBanner } from '../components/scenes';
import { SUBJECTS } from '../types';
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
import { hanziCardsForLesson } from '../content/starCards';
import { isPerfectLessonPractice, starsForLessonPractice } from '../lessonRewards';

export default function PracticePage() {
  const { skillId } = useParams();
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const addSkillResult = useStore((s) => s.addSkillResult);
  const applyPoints = useStore((s) => s.applyPoints);
  const collectChars = useStore((s) => s.collectChars);
  const grantArchiveCard = useStore((s) => s.grantArchiveCard);
  const skill = skillId ? getSkill(skillId) : undefined;
  const subject = skill ? SUBJECTS.find((s) => s.id === skill.subject) : undefined;
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
        <div className="lesson-hero-top">
          <KidButton color="white" className="icon-btn" onClick={() => nav(`/learn/${skill.id}`)} ariaLabel="back">
            <IconBack size={22} />
          </KidButton>
          <div className="lesson-hero-title">
            <span className="lesson-hero-eyebrow">{skill.name[lang]}</span>
            <span className="lesson-hero-name">📖 {lang === 'zh' ? '去练习' : 'Practice'}</span>
          </div>
        </div>
        <div className="lesson-stage">
          <div className="lesson-loading">⏳ 加载中…</div>
        </div>
      </div>
    );
  }
  if (!canPractice) return null;

  const handleFinish = (_componentStars: number, correct: number, total: number) => {
    const stars = starsForLessonPractice(correct, total);
    setResult({ stars, correct, total });
    const pass = total > 0 && correct / total >= 0.8;
    if (stars > 0) {
      // 课程星级取历史最高值，不需要重复练习累计星星。
      addSkillResult(child.id, skill.id, stars);
    }
    if (pass) {
      // 练习达标 → 每天每课 +1 分（幂等）
      applyPoints(child.id, 1, '练习达标', `prac:${skill.id}:${new Date().toDateString()}`);
      setLit(true);
    }
    // 语文课只有练习全对才获得本课生字卡及已关联的汉字图鉴卡。
    if (skill.subject === 'chinese' && isPerfectLessonPractice(correct, total)) {
      const words = [...new Set(content?.words ?? [])];
      collectChars(child.id, words);
      hanziCardsForLesson(skill.id).forEach((card) => grantArchiveCard(child.id, card.id));
    }
    playSfx('win');
    speak(pass ? t('litTip') : t('practiceDone'), lang);
  };

  return (
    <div className="page practice">
      <div className="lesson-hero">
        {subject ? (
          <div className="category-hero">
            <SceneBanner kind={subject.id} height={176} />
            <div className="category-scrim" aria-hidden="true" />
            <div className="lesson-hero-back">
              <KidButton color="white" className="icon-btn" onClick={() => nav(`/learn/${skill.id}`)} ariaLabel="back">
                <IconBack size={22} />
              </KidButton>
            </div>
            <div className="lesson-hero-overlay">
              <div className="lesson-hero-title">
                <span className="lesson-hero-eyebrow">{skill.name[lang]}</span>
                <span className="lesson-hero-name">📖 {lang === 'zh' ? '去练习' : 'Practice'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="lesson-hero-top">
            <KidButton color="white" className="icon-btn" onClick={() => nav(`/learn/${skill.id}`)} ariaLabel="back">
              <IconBack size={22} />
            </KidButton>
            <div className="lesson-hero-title">
              <span className="lesson-hero-eyebrow">{skill.name[lang]}</span>
              <span className="lesson-hero-name">📖 {lang === 'zh' ? '去练习' : 'Practice'}</span>
            </div>
          </div>
        )}
      </div>

      {/* 学习步骤条：练习节点高亮，可点回前面的学习步骤 */}
      <StepBar
        current={3}
        labels={
          isMath
            ? [t('viewExample'), t('watchDemo'), t('rememberPoints'), t('goPractice')]
            : skill.subject === 'english'
              ? [t('read'), t('listen'), t('wordStep'), t('goPractice')]
              : [t('read'), t('learnText'), t('rememberChars'), t('goPractice')]
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
              lessonId={skill?.id}
              lessonName={skill?.name.zh}
              onFinish={handleFinish}
            />
          )}
        </div>
      )}
    </div>
  );
}
