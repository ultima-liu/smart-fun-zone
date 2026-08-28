import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { useI18n } from '../i18n';
import { KidButton, TopBar, Confetti } from '../components/ui';
import Mascot from '../components/Mascot';
import LessonReader from '../components/LessonReader';
import TraceCard from '../components/TraceCard';
import WordCard from '../components/WordCard';
import { StepBar } from '../components/StepBar';
import { getSkill, skillDesc, skillEmoji, skillGames, type LessonContent } from '../content/skills';
import { loadLessonContent } from '../content/contentLoader';
import MathFigure from '../components/MathFigure';
import { MATH_FIGURES } from '../content/mathFigures';
import { MATH_QUIZ } from '../content/mathQuiz';
import { MATH_STEPS } from '../content/mathSteps';
import { MATH_EXAMPLES } from '../content/mathExamples';
import { MATH_RHYMES } from '../content/mathRhymes';
import { MATH_WORKED } from '../content/mathWorked';
import { MATH_POINTS } from '../content/mathPoints';
import { CHINESE_ENHANCE } from '../content/chineseEnhance';
import { MathExample, MathExplain, MathConcepts } from '../components/MathLesson';
import { TEXT_WORDS } from '../content/textWords';
import { speak } from '../speech';
import { preloadOffline } from '../tts';

export default function LessonPage() {
  const { skillId } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const lessonSkipOn = useStore((s) => s.lessonSkipOn);
  const completeLessonStep = useStore((s) => s.completeLessonStep);
  const collectChars = useStore((s) => s.collectChars);
  const charBag = useStore((s) => s.charBag);
  const skill = skillId ? getSkill(skillId) : undefined;
  const [contentById, setContentById] = useState<Record<string, LessonContent | undefined>>({});
  const [loadedIds, setLoadedIds] = useState<ReadonlySet<string>>(new Set());

  // 返回来源页：从学科目录进入 → 回学科目录（保持年级/上下册）；否则回地图
  const fromSubject = params.get('from') === 'subject';
  const gParam = params.get('grade');
  const tParam = params.get('term');
  const uParam = params.get('unit');
  const qs =
    gParam && tParam
      ? `?grade=${gParam}&term=${tParam}${uParam !== null ? `&unit=${uParam}` : ''}`
      : '';
  const backTarget = fromSubject && skill ? `/subject/${skill.subject}${qs}` : '/map';

  // 懒加载真实课程内容（课文/生字），首次进入课程页才下载对应 chunk；
  // 状态只在异步回调里更新，避免在 effect 中同步 setState
  useEffect(() => {
    if (!skill || skill.content !== undefined) return;
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

  const content = skill && loadedIds.has(skill.id) ? contentById[skill.id] : skill?.content;
  const contentReady = !skill || skill.content !== undefined || loadedIds.has(skill.id);
  const figure = (skill && MATH_FIGURES[skill.id]) || content?.figure;

  // 进入课程默认从"看例题/看课文"开始；支持 ?step=N 直接定位到某一步
  const [step, setStep] = useState(() => {
    const s = Number(params.get('step'));
    return Number.isInteger(s) && s >= 0 && s <= 3 ? s : 0;
  });
  // 语文/英语：认生字/认单词
  const [traceChar, setTraceChar] = useState<string | null>(null);
  const [tracedChars, setTracedChars] = useState<Set<string>>(new Set());
  const [wordCard, setWordCard] = useState<string | null>(null);

  useEffect(() => {
    if (!child || !skill) {
      nav('/map');
      return;
    }
    if (contentReady && !content) speak(skillDesc(skill, lang), lang);
  }, [child, skill, content, contentReady, lang, nav]);

  // 进入课程：英语课预热离线语音引擎（系统无英文语音时的兜底）
  useEffect(() => {
    if (skill?.subject === 'english' && content) preloadOffline(['en']);
  }, [skill, content]);

  if (!child || !skill) return null;

  if (!contentReady) {
    return (
      <div className="page lesson">
        <TopBar title={`📖 ${skill.name[lang]}`} onBack={() => nav(backTarget)} />
        <div className="lesson-stage">
          <div className="lesson-loading">⏳ 加载中…</div>
        </div>
      </div>
    );
  }

  const words = [...new Set(content?.words ?? [])];
  // 本课分词真词表（构建期生成，仅语文/英语课文用）
  const textWords = (skill && content ? TEXT_WORDS[skill.id] : undefined) ?? [];
  // 朗读语言：英语课文用英文，其余用中文
  const speechLang: 'zh' | 'en' = skill.subject === 'english' ? 'en' : 'zh';
  const isEnglish = skill.subject === 'english';
  const isMath = skill.subject === 'math';
  const points = (isMath ? MATH_POINTS[skill.id] : undefined) ?? content?.points ?? [];
  const quiz = isMath ? MATH_QUIZ[skill.id] : undefined;
  const steps = isMath ? MATH_STEPS[skill.id] : undefined;
  const example = isMath ? (MATH_EXAMPLES[skill.id] ?? (content?.text ?? '').split('\n').map((s) => s.trim()).find(Boolean) ?? skill.name.zh) : '';
  const rhyme = isMath ? MATH_RHYMES[skill.id] : undefined;
  const worked = isMath ? (MATH_WORKED[skill.id] ?? []) : [];
  // 语文课内容增强（情境导入/学课文分节讲解/中心句/要点/想一想）
  const isChinese = skill.subject === 'chinese';
  const ch = isChinese ? CHINESE_ENHANCE[skill.id] : undefined;
  const chExample = isChinese ? (ch?.example ?? (content?.text ?? '').split('\n').map((s) => s.trim()).find(Boolean) ?? skill.name.zh) : '';
  const chSteps = isChinese ? (ch?.steps ?? []) : undefined;
  const chRhyme = isChinese ? ch?.rhyme : undefined;
  const chPoints = isChinese ? (ch?.points ?? points) : points;
  const chQuiz = isChinese ? (ch?.quiz ?? quiz) : quiz;

  const goPractice = () => {
    // 语文/英语课文 → 课文练习；数学 → 数学专项练习（题目来自本课知识点）；其他 → 映射游戏
    if ((skill.subject === 'chinese' || skill.subject === 'english' || skill.subject === 'math') && content) {
      nav(`/practice/${skill.id}`);
      return;
    }
    const g = skillGames(skill)[0];
    if (g) nav(`/game/${g}?skill=${skill.id}&from=learn`);
  };

  const completeStep = () => {
    // 基于本次会话的当前步骤推进（不叠加历史完成数）
    const next = step + 1;
    completeLessonStep(skill.id);
    setStep(next);
    if (next >= 3 && !isMath) collectChars(child.id, words);
  };

  const stepLabels = isMath
    ? [t('viewExample'), t('watchDemo'), t('rememberPoints'), t('goPractice')]
    : isChinese
      ? [t('read'), t('learnText'), t('rememberChars'), t('goPractice')]
      : [t('read'), t('listen'), isEnglish ? t('wordStep') : t('chars'), t('goPractice')];
  const bagCount = (charBag[child.id] ?? []).length;

  /** 步骤条点击：任意步骤可自由跳转（练习始终可进） */
  const onStepClick = (i: number) => {
    if (i === 3) {
      goPractice();
      return;
    }
    setStep(i);
  };

  /* 无真实内容的课程：保持原演示页 */
  if (!content) {
    return (
      <div className="page lesson">
        <TopBar title={`📖 ${skill.name[lang]}`} onBack={() => nav(backTarget)} />
        <div className="lesson-stage">
          <div className="lesson-demo" aria-hidden="true">
            <span className="lesson-emoji">{skillEmoji(skill)}</span>
            <div className="lesson-dino">
              <Mascot pose="happy" size={96} />
            </div>
          </div>
          <h2 className="lesson-title">{skill.name[lang]}</h2>
          <p className="lesson-desc">{skillDesc(skill, lang)}</p>
          {!lessonSkipOn && (
            <KidButton
              color="white"
              className="lesson-replay"
              onClick={() => speak(skillDesc(skill, lang), lang)}
            >
              🔊 {t('listenAgain')}
            </KidButton>
          )}
          <div className="lesson-actions">
            <KidButton color="green" onClick={goPractice}>
              {t('goPractice')}
            </KidButton>
            {!lessonSkipOn && (
              <KidButton color="yellow" onClick={goPractice}>
                {t('skipDemo')}
              </KidButton>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page lesson">
      <TopBar title={`📖 ${skill.name[lang]}`} onBack={() => nav(backTarget)} />
      <StepBar current={Math.min(step, 3)} labels={stepLabels} onStepClick={onStepClick} />

      <div className="lesson-stage">
        {step === 0 &&
          (isMath ? (
            <MathExample figure={figure} example={example} worked={worked} text={content.text ?? skill.name.zh} lang={speechLang} onDone={completeStep} />
          ) : isChinese ? (
            <>
              <div className="example-scene" onClick={() => speak(chExample, speechLang)}>
                <span className="example-scene-label">📖 课文</span>
                <span className="example-scene-text">{chExample}</span>
              </div>
              <LessonReader
                key="read"
                text={content.text ?? skill.name.zh}
                words={words}
                mode="read"
                onDone={completeStep}
                title={skill.name[lang]}
                textWords={textWords}
                speechLang={speechLang}
                translation={content.translation}
                highlightWords
              />
            </>
          ) : (
            <>
              {figure && <MathFigure figure={figure} />}
              <LessonReader
                key="read"
                text={content.text ?? skill.name.zh}
                words={words}
                mode="read"
                onDone={completeStep}
                title={skill.name[lang]}
                textWords={textWords}
                speechLang={speechLang}
                translation={content.translation}
                highlightWords
              />
            </>
          ))}

        {step === 1 &&
          (isMath ? (
            <MathExplain figure={figure} steps={steps} points={points} lang={speechLang} onDone={completeStep} />
          ) : isChinese ? (
            <MathExplain figure={undefined} steps={chSteps} points={points} lang={speechLang} onDone={completeStep} />
          ) : (
            <>
              {figure && <MathFigure figure={figure} />}
              <LessonReader
                key="listen"
                text={content.text ?? skill.name.zh}
                words={words}
                mode="listen"
                onDone={completeStep}
                title={skill.name[lang]}
                textWords={textWords}
                speechLang={speechLang}
                translation={content.translation}
                highlightWords
              />
            </>
          ))}

        {step === 2 &&
          (isMath ? (
            <MathConcepts
              figure={figure}
              rhyme={rhyme}
              points={points}
              words={words}
              quiz={quiz}
              lang={speechLang}
              onDone={completeStep}
            />
          ) : isChinese ? (
            <div className="chars-step">
              <h3 className="chars-title">
                ✏️ {t('chars')}（{words.length}）
              </h3>
              <p className="chars-tip">
                {t('traceHint')} · {t('tracedCount', { n: tracedChars.size, total: words.length })}
              </p>
              <div className="char-grid">
                {words.map((w) => (
                  <button
                    key={w}
                    className={`char-cell ${tracedChars.has(w) ? 'seen' : ''}`}
                    onClick={() => setTraceChar(w)}
                  >
                    {w}
                  </button>
                ))}
              </div>
              <MathConcepts
                figure={undefined}
                rhyme={chRhyme}
                points={chPoints}
                words={[]}
                quiz={chQuiz}
                lang={speechLang}
                onDone={completeStep}
              />
            </div>
          ) : (
            <div className="chars-step">
              <h3 className="chars-title">
                {isEnglish ? t('wordStep') : t('chars')}（{words.length}）
              </h3>
              <p className="chars-tip">
                {isEnglish ? t('wordTip') : t('traceHint')} ·{' '}
                {t('tracedCount', { n: tracedChars.size, total: words.length })}
              </p>
              <div className="char-grid">
                {words.map((w) => (
                  <button
                    key={w}
                    className={`char-cell ${isEnglish ? 'word-cell' : ''} ${tracedChars.has(w) ? 'seen' : ''}`}
                    onClick={() => {
                      if (isEnglish) {
                        setWordCard(w);
                        return;
                      }
                      setTraceChar(w);
                    }}
                  >
                    {w}
                  </button>
                ))}
              </div>
              {(words.length === 0 || tracedChars.size >= words.length) && (
                <KidButton color="yellow" onClick={completeStep}>
                  ✅ {isEnglish ? t('wordDone') : t('knownAll')}
                </KidButton>
              )}
            </div>
          ))}

        {step >= 3 && (
          <div className="lesson-done">
            <Confetti show />
            <Mascot pose="celebrate" size={110} />
            <h2 className="lesson-title">{t('congrats')}</h2>
            <p className="lesson-done-info">
              {isMath
                ? `${t('pointsLearned')}：${points.length}`
                : `${t('learnedChars')}：${words.length} ｜ ${t('charBag')}：${bagCount}`}
            </p>
            <div className="lesson-actions">
              <KidButton color="green" onClick={goPractice}>
                {t('goPractice')}
              </KidButton>
              <KidButton color="white" onClick={() => nav('/map')}>
                {t('backToMap')}
              </KidButton>
            </div>
          </div>
        )}
      </div>

      {traceChar && (
        <TraceCard
          key={traceChar}
          char={traceChar}
          context={content.text}
          textWords={textWords}
          hasNext={words.some((w) => !tracedChars.has(w) && w !== traceChar)}
          onTraced={() => setTracedChars((s) => new Set(s).add(traceChar))}
          onNext={() => {
            const rest = words.filter((w) => !tracedChars.has(w) && w !== traceChar);
            if (rest.length > 0) setTraceChar(rest[0]);
            else setTraceChar(null);
          }}
          onClose={() => setTraceChar(null)}
        />
      )}

      {wordCard && (
        <WordCard
          key={wordCard}
          word={wordCard}
          context={content.text}
          translation={content.translation}
          hasNext={words.some((w) => !tracedChars.has(w) && w !== wordCard)}
          onLearned={() => setTracedChars((s) => new Set(s).add(wordCard))}
          onNext={() => {
            const rest = words.filter((w) => !tracedChars.has(w) && w !== wordCard);
            if (rest.length > 0) setWordCard(rest[0]);
            else setWordCard(null);
          }}
          onClose={() => setWordCard(null)}
        />
      )}
    </div>
  );
}
