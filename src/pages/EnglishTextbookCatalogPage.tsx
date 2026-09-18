import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { stopSpeaking } from '../speech';
import { ENGLISH_G3_ALL_LESSONS, ENGLISH_G3_UPPER_UNITS, ENGLISH_G3_UPPER_REVISION } from '../content/englishGrade3Upper';
import '../chinese-textbook.css';
import '../english-textbook.css';

const TABS = [
  ...ENGLISH_G3_UPPER_UNITS.map((unit) => ({ id: unit.id, title: unit.title, question: unit.question, color: unit.color, lessonIds: ENGLISH_G3_ALL_LESSONS.filter((lesson) => lesson.unitId === unit.id).map((lesson) => lesson.id) })),
  { id: 'revision', title: 'Revision · Being a good guest', question: 'How can we be a good guest?', color: '#78a5d9', lessonIds: ENGLISH_G3_UPPER_REVISION.pages.map((page) => page.id) },
];

export default function EnglishTextbookCatalogPage() {
  const nav = useNavigate();
  const childId = useStore((s) => s.activeChildId);
  const mastery = useStore((s) => s.mastery);
  const [tab, setTab] = useState(0);
  const active = TABS[tab];
  const starsOf = (id: string) => childId ? mastery[childId]?.[`english-g3a-${id}`]?.stars ?? 0 : 0;
  const all = ENGLISH_G3_ALL_LESSONS;
  const done = all.filter((lesson) => starsOf(lesson.id) > 0).length;
  const starTotal = all.reduce((sum, lesson) => sum + starsOf(lesson.id), 0);
  useEffect(() => () => stopSpeaking(), []);

  return <main className="ct-page ct-catalog en-catalog page">
    <header className="ct-catalog-hero en-hero">
      <button className="ct-back" onClick={() => nav('/map')} aria-label="返回学校地图">←</button>
      <div className="ct-hero-seal en-seal" aria-hidden="true"><span>EN</span><i>三上</i></div>
      <div><span className="ct-eyebrow">PEP · 2022 年版课标修订教材</span><h1>三年级英语上册</h1><p>从真实对话、声音、阅读和项目中学会表达</p></div>
      <div className="ct-progress-orbit" role="img" aria-label={`整册进度 ${Math.round(done / all.length * 100)}%，已完成 ${done} 节，共 ${all.length} 节`}><b>{Math.round(done / all.length * 100)}%</b><span>整册</span><small>{done} / {all.length} 课 · ★ {starTotal} / {all.length * 3}</small></div>
    </header>
    <section className="ct-method-strip en-method" aria-label="英语数字化学习方式">
      <div><span>①</span><b>看图与预测</b><small>先读单元大问题</small></div><i>→</i>
      <div><span>②</span><b>听读原课</b><small>词句可用英文 TTS</small></div><i>→</i>
      <div><span>③</span><b>实际表达</b><small>角色回应与项目制作</small></div><i>→</i>
      <div><span>④</span><b>知识延伸</b><small>换情境，解释为什么</small></div>
    </section>
    <section className="ct-open-lessons en-open-lessons">
      <div className="ct-section-title"><div><span>{active.title}</span><h2>{active.question}</h2></div><p>本单元已完成 {active.lessonIds.filter((id) => starsOf(id) > 0).length} / {active.lessonIds.length} 课</p></div>
      <nav className="ct-unit-tabs en-unit-tabs" aria-label="选择英语单元">{TABS.map((unit, index) => {
        const count = unit.lessonIds.filter((id) => starsOf(id) > 0).length;
        return <button key={unit.id} className={`${tab === index ? 'active' : ''} ${count === unit.lessonIds.length ? 'unit-done' : ''}`} style={{ '--en-unit-color': unit.color } as React.CSSProperties} onClick={() => setTab(index)} aria-label={`${unit.title}，已完成 ${count}/${unit.lessonIds.length} 课`}><small>{index === 6 ? 'R' : String(index + 1).padStart(2, '0')}</small><span>{unit.title}</span><b>{count}/{unit.lessonIds.length} 课</b><i className="ct-unit-bar"><em style={{ width: `${count / unit.lessonIds.length * 100}%` }} /></i></button>;
      })}</nav>
      <div className="ct-lesson-grid en-lesson-grid">{all.filter((lesson) => lesson.unitId === active.id).map((lesson) => {
        const index = all.findIndex((item) => item.id === lesson.id);
        const stars = starsOf(lesson.id);
        return <button key={lesson.id} className={`ct-lesson-entry en-lesson-card ${stars > 0 ? 'done' : ''}`} style={{ '--en-unit-color': active.color } as React.CSSProperties} onClick={() => nav(`/english-course/${lesson.id}`)} aria-label={`${lesson.title}，${stars > 0 ? `已获得 ${stars} 星` : '未学习'}`}>
          <span className="ct-lesson-number">{String(index + 1).padStart(2, '0')}</span>
          {stars > 0 && <span className="ct-lesson-stars" aria-hidden="true">{[1, 2, 3].map((n) => <i key={n} className={n <= stars ? 'on' : ''} />)}</span>}
          <div className="ct-lesson-art en-lesson-art" aria-hidden="true"><img src={`/assets/english-textbook/pages/p${String(lesson.pageStart).padStart(3, '0')}.webp`} alt="" loading={index < 3 ? 'eager' : 'lazy'} draggable="false" /><span>{lesson.section === 'letters' ? 'Aa–Zz' : lesson.section === 'story' ? 'READ' : lesson.section === 'project' ? 'MAKE' : 'PEP'}</span></div>
          <div className="ct-lesson-copy"><small>{index < 42 ? `Unit ${Math.floor(index / 7) + 1}` : 'Revision'} · {lesson.page}</small><h3>{lesson.title}</h3><p>{lesson.subtitle}</p><span>{stars > 0 ? `★ 已获 ${stars} 星 · 再学取最高` : '开始学习'} →</span></div>
        </button>;
      })}</div>
    </section>
  </main>;
}
