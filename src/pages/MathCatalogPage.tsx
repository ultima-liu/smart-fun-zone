import { Fragment, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store';
import { GRADES, SUBJECTS } from '../types';
import { getTextbook, textbookRoute, volLabel, firstAvailableTextbook } from '../content/textbooks';
import MathLessonArtwork from '../components/MathLessonArtwork';
import '../chinese-textbook.css';
import '../math-catalog.css';

const FLOW_LABELS = ['先猜', '动手试', '说理由', '小检测', '智能闯关'];

/** 数学课与语文目录页同款的五步学习方式条 */
const FLOW_STEPS = [
  { label: '先猜', note: '先猜一猜，不怕猜错' },
  { label: '动手试', note: '摆一摆、拨一拨' },
  { label: '说理由', note: '讲清道理，再学延伸' },
  { label: '小检测', note: '马上试两道题' },
  { label: '智能闯关', note: '随机组卷冲三星' },
];

/** 每个单元在课卡插画位展示的场景由 MathLessonArtwork 按单元色绘制 */

/** 课本目录页：/textbook/:subject/:grade/:vol（旧入口 /subject/math 默认数学一年级上册），结构与语文目录一致 */
export default function MathCatalogPage() {
  const nav = useNavigate();
  const { subject = 'math', grade = 'g1', vol = '1' } = useParams();
  const book = useMemo(() => getTextbook(subject, grade as 'g1', (Number(vol) || 1) as 1), [subject, grade, vol]);
  const activeChildId = useStore((s) => s.activeChildId);
  const mastery = useStore((s) => s.mastery);
  const [unitIndex, setUnitIndex] = useState(0);
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

  const resumable = useMemo(() => {
    if (!activeChildId) return undefined;
    for (const unit of units) {
      for (const lesson of unit.lessons) {
        try {
          const saved = JSON.parse(localStorage.getItem(`sfz-math-flow-v2:${activeChildId}:#/math-course/${lesson.id}`) ?? '{}') as { phase?: number };
          if (saved.phase && saved.phase > 0 && saved.phase < FLOW_LABELS.length) return { lesson, phase: saved.phase };
        } catch { /* 损坏的旧断点忽略即可 */ }
      }
    }
    return undefined;
  }, [activeChildId, units]);

  const subjectMeta = SUBJECTS.find((s) => s.id === book.subject);
  const gradeMeta = GRADES.find((g) => g.id === book.grade);
  const bookTitle = `${gradeMeta?.name.zh ?? ''}${subjectMeta?.name.zh ?? book.subject}${volLabel(book.vol)}`;
  const firstAvail = firstAvailableTextbook();
  const curUnitDone = activeUnit ? unitDone(activeUnit.lessons) : 0;
  const curUnitTotal = activeUnit?.lessons.length ?? 0;
  const curUnitAll = curUnitTotal > 0 && curUnitDone >= curUnitTotal;

  return (
    <main className="ct-page ct-catalog page math-catalog">
      <header className="ct-catalog-hero">
        <button className="ct-back" onClick={() => nav('/map')} aria-label="返回学校书架">←</button>
        <div className="ct-hero-seal" aria-hidden="true"><span>数</span><i>学</i></div>
        <div>
          <span className="ct-eyebrow">{book.edition} · 五步数字化课堂</span>
          <h1>{bookTitle}</h1>
          <p>在游戏和动手操作中发现数学，再说出自己的道理</p>
        </div>
        <div className="ct-progress-orbit" role="img" aria-label={`整册进度 ${bookPct}%，已完成 ${bookDone} 节，共开放 ${bookTotal} 节`}>
          <b>{bookPct}%</b><span>整册</span><small>{bookDone} / {bookTotal} 课 · ★ {bookStars} / {bookTotal * 3}</small>
        </div>
      </header>

      {book.available && activeUnit ? (
        <>
          <section className="ct-method-strip" aria-label="数学课五步学习方式">
            {FLOW_STEPS.map((step, index) => <Fragment key={step.label}>
              {index > 0 && <i>→</i>}
              <div><span>{'①②③④⑤'[index]}</span><b>{step.label}</b><small>{step.note}</small></div>
            </Fragment>)}
          </section>

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
            <nav className="ct-unit-tabs" aria-label="选择数学单元">
              {units.map((unit, index) => {
                const done = unitDone(unit.lessons);
                const total = unit.lessons.length;
                const all = total > 0 && done >= total;
                return (
                  <button key={unit.no} className={`${unitIndex === index ? 'active' : ''} ${all ? 'unit-done' : ''} ${done > 0 && !all ? 'unit-part' : ''}`} onClick={() => setUnitIndex(index)} aria-label={`${unit.title}，已完成 ${done}/${total} 课${all ? '，全部完成' : ''}`}>
                    <small>{all ? '✓' : String(index + 1).padStart(2, '0')}</small><span>{unit.title}</span><b>{all ? '全部完成' : `${done}/${total} 课`}</b>
                    <i className="ct-unit-bar" aria-hidden="true"><em style={{ width: total ? `${(done / total) * 100}%` : '0%' }} /></i>
                  </button>
                );
              })}
            </nav>
            <div className="ct-lesson-grid">
              {activeUnit.lessons.map((lesson) => {
                const starCount = starsOf(lesson.id);
                const done = starCount > 0;
                const lessonNo = allLessons.findIndex((item) => item.id === lesson.id) + 1;
                return (
                  <button className={`ct-lesson-entry ${done ? 'done' : ''}`} key={lesson.id} onClick={() => nav(`/math-course/${lesson.id}`)} aria-label={`${lesson.title}，${done ? `已获得 ${starCount} 星` : '未学习'}`}>
                    <span className="ct-lesson-number">{String(lessonNo).padStart(2, '0')}</span>
                    {done && <span className="ct-lesson-stars" aria-hidden="true">{[1, 2, 3].map((n) => <i key={n} className={n <= starCount ? 'on' : ''} />)}</span>}
                    <div className="ct-lesson-art" aria-hidden="true">
                      <MathLessonArtwork unitColor={activeUnit.color} seed={lessonNo} />
                    </div>
                    <div className="ct-lesson-copy">
                      <small>{activeUnit.no === '数学游戏' ? '数学游戏' : `第${activeUnit.no}单元`} · {lesson.page ?? activeUnit.page}</small>
                      <h3>{lesson.title}</h3><p>{lesson.subtitle}</p>
                      <span>{done ? (starCount >= 3 ? '★ 已满星 · 再练一遍' : `已获 ${starCount} 星 · 再练冲刺满星`) : '开始学习'} →</span>
                    </div>
                  </button>
                );
              })}
            </div>
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
