import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CHINESE_TEXTBOOK_EXTRAS } from '../content/chineseTextbookExtras';
import { playChineseReadingAudio, stopChineseReadingAudio } from '../chineseReadingAudio';
import { LESSON_NARRATION_CANCEL } from '../lessonTabNarration';
import CourseReplayButton from './CourseReplayButton';
import './chinese-textbook-extras.css';

/** Original teaching material is always accessible, including after a lesson is completed. */
export default function ChineseTextbookExtras({ lessonId }: { lessonId: string }) {
  const entries = CHINESE_TEXTBOOK_EXTRAS[lessonId] ?? [];
  const [selected, setSelected] = useState(0);
  const [missing, setMissing] = useState(false);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = root.current;
    element?.addEventListener(LESSON_NARRATION_CANCEL, stopChineseReadingAudio);
    return () => { element?.removeEventListener(LESSON_NARRATION_CANCEL, stopChineseReadingAudio); stopChineseReadingAudio(); };
  }, []);
  const entry = entries[selected];
  if (!entry) return null;
  const count = entry.groups.reduce((total, group) => total + group.lines.join('').length, 0);
  const lineCount = entry.groups.reduce((total, group) => total + group.lines.length, 0);
  const columns = entry.reading ? (count > 300 || lineCount > 10 ? 3 : count > 130 || lineCount > 7 ? 2 : 1) : Math.min(3, Math.max(1, entry.groups.length));
  return <section ref={root} className="ct-original-extra" data-chinese-leaf data-chinese-narration-key={entry.id}
    data-chinese-narration-mode="instructions-only" data-chinese-narration={`${entry.title}。${entry.intro}`}>
    <nav aria-label="选择教材补充内容">{entries.map((item, index) => <button type="button" key={item.id} aria-pressed={index === selected} onClick={() => { stopChineseReadingAudio(); setSelected(index); setMissing(false); }}>{item.title}</button>)}</nav>
    <header><h3>{entry.title}</h3>{entry.reading && columns > 1 && <small className="ct-extra-reading-order">从左到右，每列从上到下</small>}<CourseReplayButton label={entry.reading ? `点读${entry.title}全文` : `听${entry.title}的说明`} onClick={() => { void playChineseReadingAudio(entry.reading ? entry.groups.flatMap(group => group.lines) : [entry.intro], () => undefined); }}/></header>
    <p>{entry.intro}</p>
    <div className={`ct-extra-body${entry.illustration ? ' ct-extra-illustrated' : ''}${!entry.groups.length ? ' ct-extra-picture-only' : ''}`}>
      {entry.illustration && <svg className="ct-extra-picture" viewBox={entry.illustration.join(' ')} role="img" aria-label={`${entry.title}的教材原图`}>
        <image href={`/assets/chinese-textbook/pages/p${String(entry.page).padStart(3, '0')}.webp`} width="1000" height="1414"/>
      </svg>}
      {!!entry.groups.length && <div className={`ct-extra-groups${entry.pinyin ? ' ct-extra-pinyin' : ''}${entry.reading ? ' ct-extra-reading' : ''}${entry.reading && count > 150 ? ' ct-extra-story' : ''}`} style={{ '--ct-extra-columns': columns } as CSSProperties}>
        {entry.groups.map((group, index) => <section key={index}>
          {!(entry.reading && count > 150) && <h4>{group.title}<CourseReplayButton label={`点读${group.title ?? entry.title}`} onClick={() => { void playChineseReadingAudio(group.lines, values => setMissing(values.length > 0)); }}/></h4>}
          {group.lines.map((line, lineIndex) => <p key={lineIndex}>{line}</p>)}
        </section>)}
      </div>}
    </div>
    {missing && <small role="status">部分音节暂无录音，请和家人对照教材练读。</small>}
  </section>;
}
