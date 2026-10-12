import BackButton from '../components/BackButton';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store';
import { GRADES, SUBJECTS } from '../types';
import { getTextbook, textbookRoute, volLabel, firstAvailableTextbook } from '../content/textbooks';
import { migrateMathFlowSnapshot } from '../content/mathLearningProgress';
import { MATH_G1_UPPER_COVERAGE } from '../content/mathTextbookCoverage';
import { mathLifeSceneForLesson } from '../content/mathLifeScenes';
import { readFruitShopProgress } from '../fruitShopProgress';
import MathLessonArtwork, { mathLessonCoverLabel } from '../components/MathLessonArtwork';
import '../chinese-textbook.css';
import '../math-catalog.css';
import '../math-teaching.css';
import { mathEvidenceSummary } from '../mathLearning';

const FLOW_LABELS = ['先猜', '动手试', '说理由', '小检测', '智能闯关'];

/** 每节数学课在课卡插画位展示各自的主题 SVG 封面。 */

/** 课本目录页：/textbook/:subject/:grade/:vol（旧入口 /subject/math 默认数学一年级上册），结构与语文目录一致 */
export default function MathCatalogPage() {
  const nav = useNavigate();
  const { subject = 'math', grade = 'g1', vol = '1' } = useParams();
  const book = useMemo(() => getTextbook(subject, grade as 'g1', (Number(vol) || 1) as 1), [subject, grade, vol]);
  const activeChildId = useStore((s) => s.activeChildId);
  const mastery = useStore((s) => s.mastery);
  const [, updateEvidence] = useState(0);
  useEffect(() => { const refresh = () => updateEvidence((n) => n + 1); window.addEventListener('math-evidence-change', refresh); return () => window.removeEventListener('math-evidence-change', refresh); }, []);
  const [unitIndex, setUnitIndex] = useState(() => {
    // 初始定位到最近学习课文所在的单元；没有记录时停留第一单元。
    let lastLesson: string | null = null;
    try { lastLesson = localStorage.getItem(`sfz-math-last-lesson:${activeChildId ?? 'guest'}`); } catch { /* 存储不可用默认第一单元 */ }
    const index = lastLesson ? book.units.findIndex((unit) => unit.lessons.some((lesson) => lesson.id === lastLesson)) : -1;
    return index >= 0 ? index : 0;
  });
  const units = book.units;
  const activeUnit = units[Math.min(unitIndex, Math.max(0, units.length - 1))];

  const starsOf = (id: string) => (activeChildId ? mastery[activeChildId]?.[`math-lab-${id}`]?.stars ?? 0 : 0);
  const unitDone = (lessons: { id: string }[]) => lessons.filter((lesson) => starsOf(lesson.id) > 0).length;
  const unitStars = (lessons: { id: string }[]) => lessons.reduce((sum, lesson) => sum + starsOf(lesson.id), 0);

  const allLessons = useMemo(() => units.flatMap((unit) => unit.lessons), [units]);
  const bookDone = allLessons.filter((lesson) => starsOf(lesson.id) > 0).length;
  const bookTotal = allLessons.length;
  const bookStars = allLessons.reduce((sum, lesson) => sum + starsOf(lesson.id), 0);
  const bookPct = bookTotal ? Math.round((bookDone / bookTotal) * 100) : 0;
  const shopReopened = activeChildId ? !!readFruitShopProgress(activeChildId).reopening : false;

  const resumable = (() => {
    if (!activeChildId) return undefined;
    for (const unit of units) {
      for (const lesson of unit.lessons) {
        try {
          const route = `#/math-course/${lesson.id}`;
          const saved = migrateMathFlowSnapshot(
            localStorage.getItem(`sfz-math-flow-v4:${activeChildId}:${route}`),
            localStorage.getItem(`sfz-math-flow-v3:${activeChildId}:${route}`),
            localStorage.getItem(`sfz-math-flow-v2:${activeChildId}:${route}`),
          );
          if (saved.phase && saved.phase > 0 && saved.phase < FLOW_LABELS.length) return { lesson, phase: saved.phase };
        } catch { /* 损坏的旧断点忽略即可 */ }
      }
    }
    return undefined;
  })();

  const subjectMeta = SUBJECTS.find((s) => s.id === book.subject);
  const gradeMeta = GRADES.find((g) => g.id === book.grade);
  const bookTitle = `${gradeMeta?.name.zh ?? ''}${subjectMeta?.name.zh ?? book.subject}${volLabel(book.vol)}`;
  const firstAvail = firstAvailableTextbook();
  const curUnitDone = activeUnit ? unitDone(activeUnit.lessons) : 0;
  const curUnitTotal = activeUnit?.lessons.length ?? 0;
  const curUnitAll = curUnitTotal > 0 && curUnitDone >= curUnitTotal;
  const activeLessonIds = new Set(activeUnit?.lessons.map((lesson) => lesson.id) ?? []);
  const activeCoverage = MATH_G1_UPPER_COVERAGE.filter((entry) => activeLessonIds.has(entry.ownerLessonId));
  const activePages = [...new Set(activeCoverage.flatMap((entry) => entry.pages))].sort((left, right) => left - right);
  const learnedPages = [...new Set(activeCoverage.filter((entry) => starsOf(entry.ownerLessonId) > 0).flatMap((entry) => entry.pages))].sort((left, right) => left - right);
  const nextLesson = activeUnit?.lessons.find((lesson) => starsOf(lesson.id) === 0);

  return (
    <main className="ct-page ct-catalog page math-catalog">
      <header className="ct-catalog-hero">
        <BackButton className="ct-back" onClick={() => nav('/map')} aria-label="返回学校书架" />
        <div className="math-hero-mark" aria-hidden="true">
          <svg viewBox="0 0 120 132" role="presentation" focusable="false">
            <defs>
              <linearGradient id="math-mark-card" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#4cbce8" /><stop offset="1" stopColor="#3979c9" /></linearGradient>
              <linearGradient id="math-mark-bead" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ffe58a" /><stop offset="1" stopColor="#f5a53b" /></linearGradient>
            </defs>
            <rect x="10" y="7" width="100" height="118" rx="27" fill="url(#math-mark-card)" />
            <rect x="17" y="14" width="86" height="104" rx="21" fill="none" stroke="#fff" strokeOpacity=".56" strokeWidth="2" />
            <path d="M28 44h64M28 66h64M28 88h64" stroke="#dff7ff" strokeOpacity=".9" strokeWidth="4" strokeLinecap="round" />
            <path d="M39 34v65M59 34v65M79 34v65" stroke="#dff7ff" strokeOpacity=".8" strokeWidth="3" strokeLinecap="round" />
            {[['39', '44'], ['59', '66'], ['79', '44'], ['79', '88']].map(([cx, cy], index) => <circle key={index} cx={cx} cy={cy} r="10" fill="url(#math-mark-bead)" stroke="#fff4c7" strokeWidth="2" />)}
            <circle cx="60" cy="24" r="12" fill="#f46767" stroke="#ffd8bd" strokeWidth="2" />
            <path d="M55 24h10M60 19v10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
            <path d="M50 108h20" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <span className="ct-eyebrow">{book.edition}</span>
          <h1>{bookTitle}</h1>
          <p>在游戏和动手操作中发现数学，再说出自己的道理</p>
        </div>
        <div className="ct-progress-orbit" role="img" aria-label={`整册进度 ${bookPct}%，已完成 ${bookDone} 节，共开放 ${bookTotal} 节`}>
          <b>{bookPct}%</b><span>整册</span><small>{bookDone} / {bookTotal} 课 · ★ {bookStars} / {bookTotal * 3}</small>
        </div>
      </header>

      {book.available && activeUnit ? (
        <>
          <button className="mc-tools-invite" onClick={() => nav('/math-tools')}><span aria-hidden="true">▦</span><span><b>数学教具箱</b><small>配一配、分一分、凑成十、捆十拆十、走数线、分组排列</small></span><strong>去摆一摆 →</strong></button>
          <button className="mc-fruit-invite" onClick={() => nav('/math-practice/fruit-shop?from=catalog&reopen=1')}>
            <span aria-hidden="true">🐰🍎</span><span><b>{shopReopened ? '回兔兔水果店' : '兔兔水果店'}</b></span><strong>进入 →</strong>
          </button>


          {resumable && (
            <button className="mc-continue" onClick={() => nav(`/math-course/${resumable.lesson.id}`)}>
              <span>继续上次学习</span><b>{resumable.lesson.title}</b><small>正在进行：{FLOW_LABELS[resumable.phase]}</small><em>继续 →</em>
            </button>
          )}

          <section className="ct-open-lessons">
            <div className="ct-section-title">
              <div><span>{activeUnit.title}</span><h2>{curUnitAll ? '✓ 本单元已全部完成' : `本单元进度 ${curUnitDone} / ${curUnitTotal} 课`}</h2></div>
              <p>按单元切换课程 · 本单元已获得 ★ {unitStars(activeUnit.lessons)} / {curUnitTotal * 3} 星</p>
            </div>
            <section className="catalog-guide"><h3>教材页进度 · 已学习 {learnedPages.length} / {activePages.length} 页</h3>
            <section className="mc-page-progress" aria-label={`${activeUnit.title}教材页进度`}>
              <div><b>教材页进度</b><span>已学习 {learnedPages.length} / {activePages.length} 页</span>{nextLesson && <em>下一站：{nextLesson.title}</em>}</div>
              <div className="mc-page-rail" aria-hidden="true">{activePages.map((page) => <i key={page} className={learnedPages.includes(page) ? 'done' : ''} title={`P${page}${learnedPages.includes(page) ? ' 已学习' : ' 待学习'}`} />)}</div>
              <p>{activePages.length ? `P${activePages[0]}–P${activePages[activePages.length - 1]} · 深色格表示对应课程已获得星星，浅色格可继续学习。` : '本单元教材页正在整理。'}</p>
            </section>
            </section>
            <nav className="math-catalog-units" aria-label="选择数学单元">{units.map((unit, index) => <button key={unit.no} type="button" aria-pressed={unitIndex === index} className={unitIndex === index ? 'active' : ''} onClick={() => setUnitIndex(index)}><b>{unit.title}</b><small>{unitDone(unit.lessons)} / {unit.lessons.length} 课</small></button>)}</nav>
            <div className="math-catalog-swipe-hint" aria-hidden="true">上下滑动，看看本单元的课文 <span>↓</span></div>
            <div className="math-catalog-lesson-scroll" key={unitIndex} tabIndex={0} role="region" aria-label={`${activeUnit.title}课文列表，可上下滑动`}><div className="ct-lesson-grid">
              {activeUnit.lessons.map((lesson) => {
                const starCount = starsOf(lesson.id);
                const done = starCount > 0;
                const lifeScene = mathLifeSceneForLesson(lesson.id);
                const lessonNo = allLessons.findIndex((item) => item.id === lesson.id) + 1;
                return (
                  <button className={`ct-lesson-entry ${done ? 'done' : ''}`} key={lesson.id} onClick={() => nav(`/math-course/${lesson.id}`)} aria-label={`${lesson.title}，${done ? `已获得 ${starCount} 星` : '未学习'}`}>
                    <span className="ct-lesson-number">{String(lessonNo).padStart(2, '0')}</span>
                    {done && <span className="ct-lesson-stars" aria-hidden="true">{[1, 2, 3].map((n) => <i key={n} className={n <= starCount ? 'on' : ''} />)}</span>}
                    <div className="ct-lesson-art" aria-hidden="true">
                      <MathLessonArtwork lessonId={lesson.id} seed={lessonNo} />
                      <span className="ct-art-source">{mathLessonCoverLabel(lesson.id)}</span>
                    </div>
                    <div className="ct-lesson-copy">
                      <small>{activeUnit.no === '数学游戏' ? '数学游戏' : `第${activeUnit.no}单元`} · {lesson.page ?? activeUnit.page}</small>
                      <h3>{lesson.title}</h3><p>{lesson.subtitle}</p>
                      {lifeScene && <em className={`mc-life-scene-tag ${done ? 'ready' : ''}`}><b>{lifeScene.icon} 生活小剧场 · {lifeScene.title}</b><i>{done ? '已开放' : '完成本课后开放'}</i></em>}
                      <small className="math-evidence-note">{mathEvidenceSummary(activeChildId, lesson.id).label}</small><span>{done ? `✓ 学习已完成 · ${starCount} 星 · 再试新题` : '开始学习'} →</span>
                    </div>
                  </button>
                );
              })}</div></div>
          </section>
        </>
      ) : (
        <div className="mc-building">
          <span className="mc-building-emoji" aria-hidden="true">🏗️</span>
          <b>《{bookTitle}》课程筹备中</b>
          <p>聪聪老师正在按教材整理这一册的互动课程。先去已开课的课本学习吧！</p>
          {firstAvail && (
            <button className="mc-building-go" onClick={() => nav(textbookRoute(firstAvail.subject, firstAvail.grade, firstAvail.vol))}>
              🔢 去数学一年级上册
            </button>
          )}
        </div>
      )}
    </main>
  );
}
