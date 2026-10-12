import { createContext, type ReactNode } from 'react';
import { WholeStage } from './ScreenPages';

export type MathLessonActivity = { label: string; title?: string; done: boolean; content: ReactNode; disabled?: boolean };

/** Current operation round readiness, separate from saved course checkmarks. */
export const MathActionRoundContext = createContext<((ready: boolean) => void) | null>(null);

export function MathLessonActivityTabs({ activities, selected, onSelect, id }: { activities: MathLessonActivity[]; selected: number; onSelect: (index: number) => void; id: string }) {
  return <nav className="math-lesson-task-tabs" role="tablist" aria-label="本阶段任务" aria-orientation="vertical">
    {activities.map((activity, index) => <button type="button" role="tab" key={activity.label} id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={selected === index} aria-label={`${activity.label}，${activity.done ? '已完成' : selected === index ? '正在做' : activity.disabled ? '待解锁' : '待完成'}`} disabled={activity.disabled} className={`${selected === index ? 'active' : ''} ${activity.done ? 'done' : ''}`} onClick={() => onSelect(index)} onKeyDown={(event) => {
      if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const available = activities.map((task, i) => task.disabled ? -1 : i).filter(i => i >= 0);
      const position = available.indexOf(index);
      const next = event.key === 'Home' ? available[0] : event.key === 'End' ? available[available.length - 1] : available[(position + (event.key === 'ArrowDown' ? 1 : available.length - 1)) % available.length];
      onSelect(next);
      document.getElementById(`${id}-tab-${next}`)?.focus();
    }}>
      <i aria-hidden="true">{activity.done ? '✓' : index + 1}</i>
      <b>{activity.label}</b>
    </button>)}
  </nav>;
}

/** Switching tasks retains the material, answers and drawing state of sibling tasks. */
export function MathLessonActivityPanels({ activities, selected, id }: { activities: MathLessonActivity[]; selected: number; id: string }) {
  return <div className="math-lesson-activity-panels">{activities.map((activity, index) => <section key={activity.label} className="math-lesson-activity-panel" role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} hidden={selected !== index}><WholeStage>{activity.content}</WholeStage></section>)}</div>;
}

export { useActivityAdvance as useMathActivityAdvance } from '../useActivityAdvance';
