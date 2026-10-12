import { Children, Fragment, isValidElement, useId, useState, type ReactNode } from 'react';
import { useActivityAdvance } from '../useActivityAdvance';
import { WholeStage } from './ScreenPages';

function flatten(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap(child => isValidElement<{children?: ReactNode}>(child) && child.type === Fragment ? flatten(child.props.children) : [child]);
}

/** Explicit classroom tasks; panels stay mounted to preserve every child's work. */
export default function ClassroomActivities({children, labels, className = '', completed = [], selectedIndex, onSelect, initialIndex = 0, advanceThrough}: {
  children: ReactNode; labels: string[]; className?: string; completed?: boolean[]; selectedIndex?: number; onSelect?: (index: number) => void; initialIndex?: number; advanceThrough?: number;
}) {
  const panels = flatten(children);
  const [selected, setSelected] = useState(initialIndex);
  const current = Math.min(selectedIndex ?? selected, Math.max(0, panels.length - 1));
  const id = useId();
  const select = (index: number) => { setSelected(index); onSelect?.(index); };
  useActivityAdvance(`${id}:${panels.length}`, completed.slice(0, advanceThrough ?? completed.length), current, select);
  return <section className={`activity-deck ct-classroom-deck ${className}`}>
    {panels.length > 1 && <nav className="activity-tabs" role="tablist" aria-label="选择活动内容" aria-orientation={className.includes('ct-subtasks') ? 'horizontal' : 'vertical'}>
      {panels.map((_, index) => <button type="button" role="tab" id={`${id}-tab-${index}`} key={index} aria-selected={current === index} aria-controls={`${id}-panel-${index}`} className={`${current === index ? 'active' : ''} ${completed[index] ? 'done' : ''}`} onClick={() => select(index)} onKeyDown={event => {
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? panels.length - 1 : (index + (['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : panels.length - 1)) % panels.length;
        select(next); event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
      }}><span className="activity-number" aria-hidden="true">{completed[index] ? '✓' : index + 1}</span><span>{labels[index] ?? `活动 ${index + 1}`}</span></button>)}
    </nav>}
    <div className="activity-panels">{panels.map((panel, index) => <div key={index} id={`${id}-panel-${index}`} role="tabpanel" aria-label={labels[index]} aria-labelledby={panels.length > 1 ? `${id}-tab-${index}` : undefined} className="activity-panel" hidden={current !== index}><WholeStage>{panel}</WholeStage></div>)}</div>
  </section>;
}
