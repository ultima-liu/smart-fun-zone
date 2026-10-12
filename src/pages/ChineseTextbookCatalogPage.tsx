import BackButton from '../components/BackButton';
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { stopSpeaking } from '../speech';
import { CHINESE_BOOK_UNITS, CHINESE_TEXTBOOK_LESSONS } from '../content/chineseTextbookCurriculum';
import { getChineseTeaching } from '../content/chineseTeaching';
import { readChineseEvidence, EVIDENCE_LABELS, latestSkillEvidence } from '../chineseLearning';
import '../chinese-textbook.css';
import '../chinese-classroom.css';

/** 与语文课时页的阶段条一致，用于"继续上次学习"显示进行中的阶段名 */
const CHINESE_PHASE_LABELS = ['看图发现', '完整听读', '教材练习', '真实表达', '迁移挑战'];

/** 读取每课星级：新格式 { [id]: 星数 }；旧格式（纯完成的 id 数组）视为 3 星 */
function readStars(childId: string | null) {
  try {
    const stored = JSON.parse(localStorage.getItem(`sfz-chinese-textbook-progress:${childId ?? 'guest'}`) ?? '{}');
    if (Array.isArray(stored)) return Object.fromEntries((stored as string[]).map((id) => [id, 3])) as Record<string, number>;
    return (stored ?? {}) as Record<string, number>;
  } catch {
    return {};
  }
}

export default function ChineseTextbookCatalogPage() {
  const nav = useNavigate();
  const activeChildId = useStore((state) => state.activeChildId);
  const stars = useMemo(() => readStars(activeChildId), [activeChildId]);
  const [searchParams, setSearchParams] = useSearchParams();
  const unitIndex = Math.max(0, CHINESE_BOOK_UNITS.findIndex((unit) => unit.lessonIds.includes(searchParams.get('unit') ?? '')));
  const activeUnit = CHINESE_BOOK_UNITS[unitIndex];
  const visibleLessons = CHINESE_TEXTBOOK_LESSONS.filter((lesson) => activeUnit.lessonIds.includes(lesson.id));

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => { listRef.current?.scrollTo({ top: 0 }); }, [unitIndex]);

  // 三级完成度：整册 / 单元 / 课（含星级汇总）
  const starsOf = (id: string) => stars[id] ?? 0;
  const unitDone = (lessonIds: string[]) => lessonIds.filter((id) => starsOf(id) > 0).length;
  const unitStars = (lessonIds: string[]) => lessonIds.reduce((sum, id) => sum + starsOf(id), 0);
  const bookDone = CHINESE_TEXTBOOK_LESSONS.filter((lesson) => starsOf(lesson.id) > 0).length;
  const bookTotal = CHINESE_TEXTBOOK_LESSONS.length;
  const bookStars = CHINESE_TEXTBOOK_LESSONS.reduce((sum, lesson) => sum + starsOf(lesson.id), 0);
  const bookPct = bookTotal ? Math.round((bookDone / bookTotal) * 100) : 0;
  const curUnitDone = unitDone(activeUnit.lessonIds);
  const curUnitTotal = activeUnit.lessonIds.length;

  // 继续上次学习（与数学目录同思路）：按课本顺序找第一节有断点的课（阶段已开始但未到最终挑战之后）
  const resumable = (() => {
    if (!activeChildId) return undefined;
    for (const lesson of CHINESE_TEXTBOOK_LESSONS) {
      try {
        const saved = JSON.parse(localStorage.getItem(`sfz-chinese-flow-v1:${activeChildId}:${lesson.id}`) ?? '{}') as { phase?: number };
        const phase = Math.min(CHINESE_PHASE_LABELS.length, Math.max(0, Number(saved.phase) || 0));
        if (phase > 0 && phase < CHINESE_PHASE_LABELS.length) return { lesson, phase };
      } catch { /* 损坏的旧断点忽略 */ }
    }
    return undefined;
  })();

  // 离开本页时停掉可能还在播的语音，不把声音带去别的页面
  useEffect(() => () => stopSpeaking(), []);

  return (
    <main className="ct-page ct-catalog ct-chinese-catalog page">
      <header className="ct-catalog-hero">
        <BackButton className="ct-back" onClick={() => nav('/map')} aria-label="返回学校地图" />
        <div className="ct-hero-seal" aria-hidden="true"><span>语</span><i>文</i></div>
        <div>
          <span className="ct-eyebrow">依据 2022 年版课标教材重新设计</span>
          <h1>一年级语文上册</h1>
          <p>从图画、声音和真实表达开始学语文</p>
        </div>
        <div className="ct-progress-orbit" role="img" aria-label={`整册进度 ${bookPct}%，已完成 ${bookDone} 节，共开放 ${bookTotal} 节`}>
          <b>{bookPct}%</b><span>整册</span><small>{bookDone} / {bookTotal} 课 · ★ {bookStars} / {bookTotal * 3}</small>
        </div>
      </header>

      {resumable && (
        <button className="mc-continue" onClick={() => nav(`/chinese-course/${resumable.lesson.id}`)}>
          <span>继续上次学习</span><b>{resumable.lesson.title}</b><small>正在进行：{CHINESE_PHASE_LABELS[resumable.phase]}</small><em>继续 →</em>
        </button>
      )}

      <section className="ct-open-lessons">
        <div className="ct-section-title">
          <div><span>{activeUnit.title}</span><h2>{curUnitDone >= curUnitTotal && curUnitTotal > 0 ? '✓ 本单元已全部完成' : `本单元进度 ${curUnitDone} / ${curUnitTotal} 课`}</h2></div>
          <p>按单元切换课程 · 本单元已获得 ★ {unitStars(activeUnit.lessonIds)} / {curUnitTotal * 3} 星</p>
        </div>
        <nav className="ct-unit-buttons" aria-label="选择语文单元">{CHINESE_BOOK_UNITS.map((unit, index) => <button key={unit.title} aria-pressed={index === unitIndex} className={index === unitIndex ? 'active' : ''} onClick={() => setSearchParams({ unit: unit.lessonIds[0] }, { replace: true })}><b>{unit.title}</b><small>{unitDone(unit.lessonIds)} / {unit.lessonIds.length} 课</small></button>)}</nav>
        <div className="ct-lesson-swipe" ref={listRef} aria-label="滑动浏览本单元课文"><div className="ct-lesson-grid">
          {visibleLessons.map((lesson) => {
            const starCount = starsOf(lesson.id);
            const done = starCount > 0;
            const teaching = getChineseTeaching(lesson.id);
            const expression = latestSkillEvidence(readChineseEvidence(activeChildId, lesson.id), 'expression');
            const lessonIndex = CHINESE_TEXTBOOK_LESSONS.findIndex((item) => item.id === lesson.id);
            return (
              <button className={`ct-lesson-entry ct-lesson-${lesson.id} ${done ? 'done' : ''}`} key={lesson.id} onClick={() => nav(`/chinese-course/${lesson.id}`)} aria-label={`${lesson.title}，${done ? `已获得 ${starCount} 星` : '未学习'}`}>
                <span className="ct-lesson-number">{String(lessonIndex + 1).padStart(2, '0')}</span>
                {done && <span className="ct-lesson-stars" aria-hidden="true">{[1, 2, 3].map((n) => <i key={n} className={n <= starCount ? 'on' : ''} />)}</span>}
                <div className="ct-lesson-art" aria-hidden="true">
                  <img src={lesson.artwork} alt="" loading={lessonIndex < 2 ? 'eager' : 'lazy'} draggable="false" />
                  {lesson.artworkSource === 'textbook' && <span className="ct-art-source">教材主题画面</span>}
                </div>
                <div className="ct-lesson-copy"><small>{lesson.unit} · {lesson.page}</small><h3>{lesson.title}</h3><p>{lesson.subtitle}</p><small>重点：{teaching.goals[teaching.goals.length - 1].text}</small>{expression && <small>表达：{EVIDENCE_LABELS[expression.level]} · {expression.source === 'ai' ? 'AI 确认' : expression.source === 'self' ? '孩子自记' : '家人观察'}</small>}<span>{done ? `已完成练习 · 再练一次` : '开始学习'} →</span></div>
              </button>
            );
          })}</div></div>
      </section>
    </main>
  );
}
