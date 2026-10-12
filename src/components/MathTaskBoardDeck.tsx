import { Children, createContext, isValidElement, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { useMathActivityAdvance } from './MathLessonActivities';

const compactTitle = (name: string) => { const title = name.split(/[：？]/)[0]; return title.length > 16 ? `${title.slice(0, 15)}…` : title; };

type Board = { id: string; name: string; done: boolean; advanceDone: boolean; required: boolean; element: HTMLElement };
type BoardContext = { selected: number; boards: Board[]; register: (board: Board) => void; unregister: (id: string) => void };
const Context = createContext<BoardContext | null>(null);

/** Separate complete task boards, retaining each board's controls and saved answers. */
export function MathTaskBoardDeck({ children, className = '', onCompleteChange, onRoundCompleteChange, initialIndex = 0 }: { children: ReactNode; className?: string; onCompleteChange?: (complete: boolean) => void; onRoundCompleteChange?: (complete: boolean) => void; initialIndex?: number }) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selected, setSelected] = useState(initialIndex);
  const id = useId();
  const register = useCallback((board: Board) => setBoards(current => {
    const old = current.find(item => item.id === board.id);
    if (old?.name === board.name && old.done === board.done && old.advanceDone === board.advanceDone && old.required === board.required && old.element === board.element) return current;
    return [...current.filter(item => item.id !== board.id), board].sort((a, b) => a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
  }), []);
  const unregister = useCallback((key: string) => setBoards(current => current.filter(item => item.id !== key)), []);
  const current = Math.min(selected, Math.max(0, boards.length - 1));
  // Cards with an explicit completion condition are required; ungraded observation
  // and reflection cards retain their existing optional role.
  const requiredBoards = boards.filter(board => board.required);
  const complete = requiredBoards.length > 0 && requiredBoards.every(board => board.done);
  const roundComplete = requiredBoards.length > 0 && requiredBoards.every(board => board.advanceDone);
  useEffect(() => {
    if (boards.length) onCompleteChange?.(complete);
  }, [boards.length, complete, onCompleteChange]);
  useEffect(() => {
    if (boards.length) onRoundCompleteChange?.(roundComplete);
  }, [boards.length, roundComplete, onRoundCompleteChange]);
  useMathActivityAdvance(`${id}:${boards.length}`, boards.map(board => board.advanceDone), current, setSelected);
  return <Context.Provider value={{ selected: current, boards, register, unregister }}>
    <div className="math-task-board-deck" data-deck-id={id} data-count={boards.length}>
      {boards.length > 1 && <nav className="math-task-board-tabs" aria-label="选择完整教材任务卡">{boards.map((board, index) => <button type="button" key={board.id} aria-pressed={index === current} aria-controls={board.id} aria-label={`${board.name}，${board.done ? '已完成' : index === current ? '正在做' : '待完成'}`} className={`${index === current ? 'active' : ''} ${board.done ? 'done' : ''}`} onClick={() => setSelected(index)}><i aria-hidden="true">{board.done ? '✓' : index + 1}</i><span>{compactTitle(board.name)}</span></button>)}</nav>}
      <div className={`math-task-board-pages ${className}`}>{children}</div>
    </div>
  </Context.Provider>;
}

export function MathTaskCard({ complete, advanceComplete = complete, as = 'section', children, ...props }: HTMLAttributes<HTMLElement> & { complete?: boolean; advanceComplete?: boolean; as?: 'section' | 'article' }) {
  const context = useContext(Context);
  const id = useId();
  const ref = useRef<HTMLElement>(null);
  const name = props['aria-label'];
  const register = context?.register, unregister = context?.unregister;
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !register) return;
    // Replaying can reset this round's advance condition without losing saved completion.
    register({ id, name: name ?? element.querySelector(':scope > header h3,:scope > b,:scope > h4,:scope > strong')?.textContent ?? '教材练习', done: complete === true, advanceDone: advanceComplete === true, required: complete !== undefined, element });
  }, [complete, advanceComplete, id, name, register]);
  useLayoutEffect(() => () => unregister?.(id), [id, unregister]);
  const index = context?.boards.findIndex(board => board.id === id) ?? -1;
  const Tag = as;
  return <Tag {...props} id={context ? id : props.id} ref={ref} hidden={context && index >= 0 ? index !== context.selected : props.hidden} data-complete={complete === true} data-required={complete !== undefined}>{children}</Tag>;
}

/** Long worksheets switch by whole exercises, never by a crop of an image. */
export function MathExerciseCards({ children, initialIndex = 0 }: { children: ReactNode; initialIndex?: number }) {
  const cards = Children.toArray(children);
  return <MathTaskBoardDeck initialIndex={initialIndex} className="mt-card-sort-grid math-exercise-cards">{cards.map((child, index) => {
    if (!isValidElement<HTMLAttributes<HTMLElement>>(child)) return child;
    return <MathTaskCard as="article" key={child.key ?? index} {...child.props} complete={child.props.className?.split(' ').includes('done')} aria-label={child.props['aria-label']}>{child.props.children}</MathTaskCard>;
  })}</MathTaskBoardDeck>;
}
