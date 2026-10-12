import { Children, Fragment, createContext, isValidElement, useContext, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

type StageSizing = 'fit' | 'stable';
const StageSizingContext = createContext<StageSizing>('fit');

/** Interactive teaching materials keep their size; other scenes may fit as a unit. */
export function WholeStage({ children, center = false }: { children: ReactNode; center?: boolean }) {
  const sizing = useContext(StageSizingContext);
  const frame = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const viewport = frame.current;
    const content = scene.current;
    if (!viewport || !content) return;
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const width = viewport.clientWidth;
        const height = viewport.clientHeight;
        if (!width || !height) return;
        content.style.width = `${width}px`;
        viewport.style.setProperty('--stage-height', `${height}px`);
        const scale = sizing === 'stable' ? 1 : Math.min(1, height / Math.max(1, content.offsetHeight));
        content.style.transform = sizing === 'stable' ? 'none' : `${center ? 'translate(-50%, -50%)' : 'translateX(-50%)'} scale(${scale})`;
        viewport.dataset.fit = scale.toFixed(3);
      });
    };
    const resize = new ResizeObserver(measure);
    resize.observe(viewport);
    resize.observe(content);
    content.addEventListener('load', measure, true);
    void document.fonts.ready.then(measure);
    measure();
    return () => { resize.disconnect(); cancelAnimationFrame(raf); content.removeEventListener('load', measure, true); };
  }, [center, sizing]);
  return <div className={`whole-stage${sizing === 'stable' ? ' whole-stage-stable' : ''}`} ref={frame}><div className={`whole-scene${center && sizing === 'fit' ? ' whole-scene-centered' : ''}`} ref={scene}>{children}</div></div>;
}

/** Viewport shell only: page composition belongs to each screen. */
export default function ScreenPages({ children, navigation = false, panel = false, sizing = 'fit' }: { children: ReactNode; navigation?: boolean; panel?: boolean; sizing?: StageSizing }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const resize = new ResizeObserver(() => element.style.setProperty('--screen-height', `${element.clientHeight}px`));
    resize.observe(element);
    return () => resize.disconnect();
  }, []);
  return <StageSizingContext.Provider value={sizing}><div className={`screen-pages${navigation ? ' screen-pages-with-nav' : ''}${panel ? ' screen-pages-panel' : ''}`} onClick={panel ? (event) => event.stopPropagation() : undefined}><div className="screen-window" ref={ref}><WholeStage center={panel}>{children}</WholeStage></div></div></StageSizingContext.Provider>;
}

function flatten(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) => isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment ? flatten(child.props.children) : [child]);
}

/** Lists turn by complete cards, with an intentional count for each screen size. */
export function ContentPages({ children, className = '', resetKey, kind = 'cards', followEnd }: { children: ReactNode; className?: string; resetKey?: string | number; kind?: 'cards' | 'gallery' | 'rows' | 'messages' | 'activities'; followEnd?: number }) {
  const cards = flatten(children);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(1);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const width = element.clientWidth;
      const height = Math.max(1, element.clientHeight - 56);
      element.style.setProperty('--cards-height', `${height}px`);
      const columns = kind === 'gallery' ? Math.max(1, Math.min(6, Math.floor(width / 165))) : kind === 'cards' ? (width >= 680 ? 2 : 1) : 1;
      const rows = kind === 'messages' || kind === 'activities' ? 1 : Math.max(1, Math.min(kind === 'rows' ? 6 : 2, Math.floor(height / (kind === 'gallery' ? 245 : kind === 'rows' ? 110 : 215))));
      element.style.setProperty('--content-columns', String(columns));
      setSize(columns * rows);
    };
    const resize = new ResizeObserver(update);
    resize.observe(element);
    update();
    return () => resize.disconnect();
  }, [kind]);
  useLayoutEffect(() => setPage(0), [resetKey]);
  const count = Math.max(1, Math.ceil(cards.length / size));
  const current = Math.min(page, count - 1);
  useLayoutEffect(() => { if (followEnd !== undefined) setPage(count - 1); }, [followEnd, count]);
  return <div className={`content-pages content-pages-${kind}`} ref={ref}>
    <div className={`content-card-grid ${className}`}>{kind === 'activities' ? cards.map((card, index) => <div className="collection-activity" key={isValidElement(card) ? card.key ?? index : index} hidden={index !== current}><WholeStage>{card}</WholeStage></div>) : cards.slice(current * size, (current + 1) * size).map((card, index) => kind === 'messages' ? <WholeStage key={isValidElement(card) ? card.key ?? index : index}>{card}</WholeStage> : card)}</div>
    <nav className="content-pager" aria-label="浏览完整卡片">
      <span>{cards.length ? `${current * size + 1}–${Math.min((current + 1) * size, cards.length)} / ${cards.length}` : '暂无内容'}</span>
      <button onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="上一组">←</button><b>{current + 1} / {count}</b><button onClick={() => setPage(current + 1)} disabled={current === count - 1} aria-label="下一组">→</button>
    </nav>
  </div>;
}

/** Explicit subject/activity panels. Hidden panels stay mounted to retain answers. */
export function ActivityDeck({ children, labels, header, footer, className = '', guided = false, style }: { children: ReactNode; labels: string[]; header?: ReactNode; footer?: ReactNode; className?: string; guided?: boolean; style?: CSSProperties }) {
  const panels = flatten(children);
  const [selected, setSelected] = useState(0);
  const current = Math.min(selected, Math.max(0, panels.length - 1));
  return <section className={`activity-deck ${guided ? 'activity-deck-guided' : ''} ${className}`} style={style}>
    {header && <div className="activity-heading">{header}</div>}
    {panels.length > 1 && <nav className="activity-tabs" aria-label="选择活动内容">{panels.map((_, index) => <button key={index} aria-pressed={current === index} className={current === index ? 'active' : ''} onClick={() => setSelected(index)}>{guided && <span className="activity-number">{index + 1}</span>}<span>{labels[index] ?? `活动 ${index + 1}`}</span></button>)}</nav>}
    <div className="activity-panels">{panels.map((panel, index) => <div key={index} className="activity-panel" hidden={current !== index}><WholeStage>{panel}</WholeStage></div>)}</div>
    <div className={guided ? 'activity-tail' : 'activity-tail-standard'}>
    {guided && panels.length > 1 && <nav className="activity-journey" aria-label="按顺序浏览活动">
      <button disabled={current === 0} onClick={() => setSelected(current - 1)}>← 上个活动</button>
      <span>正在做 {current + 1} / {panels.length}</span>
      <button className="activity-next" disabled={current === panels.length - 1} onClick={() => setSelected(current + 1)}>下个活动：{labels[current + 1] ?? '已到最后'} →</button>
    </nav>}
    {footer && <div className="activity-footer">{footer}</div>}
    </div>
  </section>;
}
