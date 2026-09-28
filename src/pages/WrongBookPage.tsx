import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { useI18n } from '../i18n';
import { gradeLabel, SUBJECTS, type SubjectId } from '../types';
import { CHINESE_TEXTBOOK_LESSONS } from '../content/chineseTextbookCurriculum';
import '../review-hub.css';

/** 学科识别只认 3 本已开课课本；老课程遗留的错题仍可查看/删除，但不再提供「再练」 */
const wrongSubject = (lessonId: string): SubjectId | undefined =>
  lessonId.startsWith('math-lab-') ? 'math'
    : lessonId.startsWith('english-g3a-') ? 'english'
      : CHINESE_TEXTBOOK_LESSONS.some((lesson) => lesson.id === lessonId) ? 'chinese'
        : undefined;
const wrongPracticeTarget = (lessonId: string) => lessonId.startsWith('math-lab-')
  ? `/math-course/${lessonId.replace('math-lab-', '')}`
  : lessonId.startsWith('english-g3a-')
    ? `/english-course/${lessonId.replace('english-g3a-', '')}`
    : CHINESE_TEXTBOOK_LESSONS.some((lesson) => lesson.id === lessonId)
      ? `/chinese-course/${lessonId}`
      : undefined;

/** 学科图标与主题色（数学/语文/英语沿用今日复习页配色） */
const META: Record<SubjectId, { label: string; icon: string; color: string }> = {
  math: { label: '数学', icon: '数', color: '#4d9bd5' },
  chinese: { label: '语文', icon: '文', color: '#dd8555' },
  english: { label: '英语', icon: 'A', color: '#5fb990' },
  thinking: { label: '思维', icon: '思', color: '#a97fd6' },
  science: { label: '科学', icon: '科', color: '#67b97a' },
  life: { label: '生活', icon: '活', color: '#e08a68' },
};

type MathAbility = '数与顺序' | '数量关系' | '凑十与位值' | '图形与空间' | '方法与检查';

/** 把逐题错因收拢为少量可行动的能力方向，避免孩子只看到一长串题目。 */
function mathAbilityOf(wrong: { objective?: string; kind: string; question?: string }): MathAbility {
  const source = `${wrong.objective ?? ''} ${wrong.kind} ${wrong.question ?? ''}`;
  if (/凑十|十格|数位|补空|满十/.test(source)) return '凑十与位值';
  if (/图形|稳定|分类|滚动|拼搭/.test(source)) return '图形与空间';
  if (/逆向|还原|图式|模型|运算|关系|整体|部分/.test(source)) return '数量关系';
  if (/点数|后继|数序|顺序|变化|相邻/.test(source)) return '数与顺序';
  return '方法与检查';
}

/** 新版数学闯关错题可在错题本内立即重做，避免每次都重新走完整节课。 */
function MathWrongRetry({ question, onResolved }: { question: { question?: string; options?: string[]; correctAnswer?: string; diagnosis?: string; remedy?: string }; onResolved: () => void }) {
  const [pick, setPick] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  if (!question.question || !question.options?.length || !question.correctAnswer) return null;
  const choose = (option: string) => {
    if (done) return;
    setPick(option);
    if (option === question.correctAnswer) {
      setDone(true);
      window.setTimeout(onResolved, 850);
    } else {
      window.setTimeout(() => setPick(null), 900);
    }
  };
  return <div className="wrong-math-retry">
    <p><b>马上重练：</b>{question.question}</p>
    <div className="wrong-math-options">
      {question.options.map((option) => <button type="button" key={option} disabled={done} className={pick === option ? option === question.correctAnswer ? 'correct' : 'wrong' : ''} onClick={() => choose(option)}>{option}</button>)}
    </div>
    {pick && <small className={done ? 'good' : 'try'}>{done ? '答对了，已经从错题本移出！' : question.remedy ?? question.diagnosis ?? '再回看题目中的数量关系，慢慢想一次。'}</small>}
  </div>;
}

/** 孩子的错题本：看自己答错的题，并可“再去练一遍”（版式与今日复习页一致） */
export default function WrongBookPage() {
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const [params] = useSearchParams();
  const subjectFilter = params.get('subject');
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const wrongs = useStore((s) => s.wrongs);
  const removeWrong = useStore((s) => s.removeWrong);

  const allList = child ? wrongs[child.id] ?? [] : [];
  const list = useMemo(() => {
    if (!subjectFilter) return allList;
    return allList.filter((w) => wrongSubject(w.lessonId) === subjectFilter);
  }, [allList, subjectFilter]);

  const subject = SUBJECTS.find((s) => s.id === subjectFilter);
  const backTarget = subject ? `/subject/${subject.id}` : '/';
  const title = subject ? `${subject.name[lang]} · ${t('wrongBook')}` : t('wrongBook');
  const mathProfile = useMemo(() => {
    const counts = new Map<MathAbility, number>();
    allList.filter((wrong) => wrongSubject(wrong.lessonId) === 'math').forEach((wrong) => {
      const ability = mathAbilityOf(wrong);
      counts.set(ability, (counts.get(ability) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [allList]);

  return (
    <main className="page review-hub">
      <header className="review-hub-head">
        <button onClick={() => nav(backTarget)} aria-label="返回">←</button>
        <div>
          <span>WRONG BOOK</span>
          <h1>{title}</h1>
          <p>{child
            ? `${child.name}（${gradeLabel(child.ageBand, lang)}）答错的题都收在这里，点“再练一次”就不怕啦！`
            : '这里会收下你答错的题，随时回来再练一遍。'}</p>
        </div>
        <b>{list.length} 道错题</b>
      </header>
      {!child ? (
        <section className="review-empty"><i>✓</i><h2>{t('noData')}</h2></section>
      ) : list.length === 0 ? (
        <section className="review-empty">
          <i>✓</i>
          <h2>还没有错题，太棒啦！</h2>
          <p>答错的题目会自动收进这本错题本，随时可以回来再练一遍。</p>
          <button onClick={() => nav('/map')}>去学习新课程</button>
        </section>
      ) : (
        <>
        {(!subjectFilter || subjectFilter === 'math') && mathProfile.length > 0 && <section className="wrong-math-profile" aria-label="数学学习画像">
          <div><span>数学学习画像</span><h2>先复习最常卡住的方法</h2><p>按错题的考查能力归类；答对卡内重练后，画像会同步变轻。</p></div>
          <div className="wrong-profile-tags">{mathProfile.map(([ability, count], index) => <span key={ability} className={index === 0 ? 'priority' : ''}><b>{ability}</b><small>{count} 道待复习</small></span>)}</div>
        </section>}
        <section className="review-hub-list" aria-label="错题列表">
          {list.map((w) => {
            const sid = wrongSubject(w.lessonId);
            const meta = sid ? META[sid] : undefined;
            const practiceTarget = wrongPracticeTarget(w.lessonId);
            return (
              <article
                key={w.uid}
                className={`review-hub-card ${sid ?? ''}`}
                style={meta ? ({ '--review-color': meta.color } as React.CSSProperties) : undefined}
              >
                <span className="review-subject-icon">{meta?.icon ?? '题'}</span>
                <div className="review-hub-main">
                  <small>{meta?.label ?? '错题'} · 题型 {w.kind}</small>
                  <h2>{w.lessonName || w.lessonId}</h2>
                  <p><b>答错的答案：</b>{w.answer || '（这一题没选对哦）'}</p>
                  {sid === 'math' && (w.diagnosis || w.remedy) && <p className="wrong-diagnosis"><b>这次先练：</b>{w.remedy ?? w.diagnosis}</p>}
                  {sid === 'math' && <MathWrongRetry question={w} onResolved={() => removeWrong(child.id, w.uid)} />}
                </div>
                <div className="review-hub-actions">
                  {practiceTarget && <button className="review-go" onClick={() => nav(practiceTarget)}>{t('again')} →</button>}
                  <button className="review-done" aria-label="删除" onClick={() => removeWrong(child.id, w.uid)}>✕ 删除</button>
                </div>
              </article>
            );
          })}
        </section>
        </>
      )}
    </main>
  );
}
