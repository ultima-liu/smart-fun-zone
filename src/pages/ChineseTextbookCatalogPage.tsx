import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { stopSpeaking } from '../speech';
import { CHINESE_BOOK_UNITS, CHINESE_TEXTBOOK_LESSONS } from '../content/chineseTextbookCurriculum';
import '../chinese-textbook.css';

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
  const [unitIndex, setUnitIndex] = useState(0);
  const activeUnit = CHINESE_BOOK_UNITS[unitIndex];
  const visibleLessons = CHINESE_TEXTBOOK_LESSONS.filter((lesson) => activeUnit.lessonIds.includes(lesson.id));

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

  // 离开本页时停掉可能还在播的语音，不把声音带去别的页面
  useEffect(() => () => stopSpeaking(), []);

  return (
    <main className="ct-page ct-catalog page">
      <header className="ct-catalog-hero">
        <button className="ct-back" onClick={() => nav('/map')} aria-label="返回学校地图">←</button>
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

      <section className="ct-method-strip" aria-label="数字化学习方式">
        <div><span>①</span><b>看图发现</b><small>先观察，不急着认字</small></div>
        <i>→</i>
        <div><span>②</span><b>逐句点读</b><small>文字与声音同步</small></div>
        <i>→</i>
        <div><span>③</span><b>教材与知识</b><small>学原课，再延伸</small></div>
        <i>→</i>
        <div><span>④</span><b>动手表达</b><small>配对、排序、拼句</small></div>
        <i>→</i>
        <div><span>⑤</span><b>迁移挑战</b><small>换情境真正会用</small></div>
      </section>

      <section className="ct-open-lessons">
        <div className="ct-section-title">
          <div><span>{activeUnit.title}</span><h2>{curUnitDone >= curUnitTotal && curUnitTotal > 0 ? '✓ 本单元已全部完成' : `本单元进度 ${curUnitDone} / ${curUnitTotal} 课`}</h2></div>
          <p>按单元切换课程 · 本单元已获得 ★ {unitStars(activeUnit.lessonIds)} / {curUnitTotal * 3} 星</p>
        </div>
        <nav className="ct-unit-tabs" aria-label="选择语文单元">
          {CHINESE_BOOK_UNITS.map((unit, index) => {
            const done = unitDone(unit.lessonIds);
            const total = unit.lessonIds.length;
            const all = total > 0 && done >= total;
            return (
              <button key={unit.title} className={`${unitIndex === index ? 'active' : ''} ${all ? 'unit-done' : ''} ${done > 0 && !all ? 'unit-part' : ''}`} onClick={() => setUnitIndex(index)} aria-label={`${unit.title}，已完成 ${done}/${total} 课${all ? '，全部完成' : ''}`}>
                <small>{all ? '✓' : String(index + 1).padStart(2, '0')}</small><span>{unit.title}</span><b>{all ? '全部完成' : `${done}/${total} 课`}</b>
                <i className="ct-unit-bar" aria-hidden="true"><em style={{ width: total ? `${(done / total) * 100}%` : '0%' }} /></i>
              </button>
            );
          })}
        </nav>
        <div className="ct-lesson-grid">
          {visibleLessons.map((lesson) => {
            const starCount = starsOf(lesson.id);
            const done = starCount > 0;
            const lessonIndex = CHINESE_TEXTBOOK_LESSONS.findIndex((item) => item.id === lesson.id);
            return (
              <button className={`ct-lesson-entry ct-lesson-${lesson.id} ${done ? 'done' : ''}`} key={lesson.id} onClick={() => nav(`/chinese-course/${lesson.id}`)} aria-label={`${lesson.title}，${done ? `已获得 ${starCount} 星` : '未学习'}`}>
                <span className="ct-lesson-number">{String(lessonIndex + 1).padStart(2, '0')}</span>
                {done && <span className="ct-lesson-stars" aria-hidden="true">{[1, 2, 3].map((n) => <i key={n} className={n <= starCount ? 'on' : ''} />)}</span>}
                <div className="ct-lesson-art" aria-hidden="true">
                  <img src={lesson.artwork} alt="" loading={lessonIndex < 2 ? 'eager' : 'lazy'} draggable="false" />
                  {lesson.artworkSource === 'textbook' && <span className="ct-art-source">教材主题画面</span>}
                </div>
                <div className="ct-lesson-copy"><small>{lesson.unit} · {lesson.page}</small><h3>{lesson.title}</h3><p>{lesson.subtitle}</p><span>{done ? (starCount >= 3 ? '★ 已满星 · 再读一遍' : `已获 ${starCount} 星 · 再读冲刺满星`) : '开始学习'} →</span></div>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
