import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { speakOnce } from '../speech';
import './chinese-word-order.css';

type Drag = { item: string; pointerId: number; pointerType: string; startX: number; startY: number; x: number; y: number; moved: boolean; offsetX: number; offsetY: number; width: number; height: number };
type PointerPosition = { pointerId: number; clientX: number; clientY: number };

/** Pointer capture supports both mouse and Pad touch, including scaled classroom scenes. */
export default function ChineseWordOrder({ items, placed, onChange }: { items: string[]; placed: string[]; onChange: (value: string[]) => void }) {
  const slots = Array.from({ length: items.length }, (_, index) => placed[index] ?? '');
  const boardRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const bankRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const contains = (element: HTMLElement | null, x: number, y: number) => {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  };
  const targetAt = (x: number, y: number, current: Drag) => {
    const index = slotRefs.current.findIndex(element => contains(element, x, y));
    if (index >= 0) return index;
    // Preserve an intentional return from a filled slot to the bank.
    if (slots.includes(current.item) && contains(bankRef.current, x, y)) return null;
    const card = { left: x - current.offsetX, top: y - current.offsetY, right: x - current.offsetX + current.width, bottom: y - current.offsetY + current.height };
    const candidates = slotRefs.current.flatMap((element, slot) => {
      if (!element) return [];
      const rect = element.getBoundingClientRect();
      const overlapX = Math.max(0, Math.min(rect.right, card.right) - Math.max(rect.left, card.left));
      const overlapY = Math.max(0, Math.min(rect.bottom, card.bottom) - Math.max(rect.top, card.top));
      const distance = Math.hypot(Math.max(rect.left - x, 0, x - rect.right), Math.max(rect.top - y, 0, y - rect.bottom));
      const overlap = overlapX >= 8 && overlapY >= 8 ? overlapX * overlapY : 0;
      return overlap || distance <= 32 ? [{ slot, overlap, distance }] : [];
    });
    candidates.sort((a, b) => b.overlap - a.overlap || a.distance - b.distance);
    return candidates[0]?.slot ?? null;
  };
  const place = (item: string, target: number | null) => {
    const next = [...slots];
    const source = next.indexOf(item);
    if (target === null) {
      if (source < 0) return;
      next[source] = '';
    } else {
      if (source >= 0) next[source] = next[target];
      next[target] = item;
    }
    onChange(next);
    setSelected(null);
    setAnnouncement(target === null ? `${item}已放回词语区。` : `${item}已放到第${target + 1}个位置。`);
    speakOnce(item);
  };
  const start = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    // Pointer capture may target the board after a missed release. Resolve the word under the press.
    const source = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLButtonElement>('button[data-order-item]');
    if (!source || source.disabled || !boardRef.current?.contains(source)) return;
    const item = source.dataset.orderItem;
    if (!item) return;
    // A missed release must never keep the next word bound to the previous drag.
    const stale = pointer.current;
    if (stale) actions.current.finish({ pointerId: stale.pointerId, clientX: stale.x, clientY: stale.y }, true);
    suppressClick.current = false;
    const rect = source.getBoundingClientRect();
    pointer.current = { item, pointerId: event.pointerId, pointerType: event.pointerType, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moved: false, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, width: rect.width, height: rect.height };
  };
  const move = (event: PointerPosition) => {
    const current = pointer.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const moved = current.moved || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) >= 8;
    // Capture on the persistent board only after dragging starts; plain taps still click the word.
    if (moved && !current.moved) boardRef.current?.setPointerCapture(event.pointerId);
    pointer.current = { ...current, x: event.clientX, y: event.clientY, moved };
    if (moved) {
      setDrag(pointer.current);
      setHover(targetAt(event.clientX, event.clientY, pointer.current));
    }
  };
  const finish = (event: PointerPosition, cancelled = false) => {
    const current = pointer.current;
    if (!current || current.pointerId !== event.pointerId) return;
    pointer.current = null;
    if (boardRef.current?.hasPointerCapture(event.pointerId)) boardRef.current.releasePointerCapture(event.pointerId);
    setDrag(null);
    setHover(null);
    const moved = current.moved || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) >= 8;
    suppressClick.current = moved && !cancelled;
    if (cancelled || !moved) return;
    // Use the last visible card position, so mouseup agrees with the highlighted slot.
    const x = current.moved ? current.x : event.clientX;
    const y = current.moved ? current.y : event.clientY;
    const target = targetAt(x, y, current);
    if (target !== null || contains(bankRef.current, x, y)) place(current.item, target);
  };
  const actions = useRef({ move, finish });
  actions.current = { move, finish };
  useEffect(() => {
    const onMove = (event: globalThis.PointerEvent) => actions.current.move(event);
    const onUp = (event: globalThis.PointerEvent) => actions.current.finish(event);
    const onCancel = (event: globalThis.PointerEvent) => actions.current.finish(event, true);
    const onMouseUp = (event: MouseEvent) => {
      const current = pointer.current;
      if (current?.pointerType === 'mouse') actions.current.finish({ pointerId: current.pointerId, clientX: event.clientX, clientY: event.clientY });
    };
    const onBlur = () => {
      const current = pointer.current;
      if (current) actions.current.finish({ pointerId: current.pointerId, clientX: current.x, clientY: current.y }, true);
    };
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onCancel, true);
    window.addEventListener('mouseup', onMouseUp, true);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onCancel, true);
      window.removeEventListener('mouseup', onMouseUp, true);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
  const select = (item: string) => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    setSelected(value => value === item ? null : item);
  };
  return <div className="ct-word-order" ref={boardRef} onPointerDown={start}>
    <p className="ct-order-instruction">把词语拖到上方空位，按从左到右排列。</p>
    <div className="ct-order-slots" role="group" aria-label="排序位置" style={{ '--order-count': items.length } as CSSProperties}>
      {slots.map((item, index) => <button type="button" key={index} ref={element => { slotRefs.current[index] = element; }}
        className={`ct-order-slot ${item ? 'filled' : ''} ${hover === index ? 'drop-target' : ''} ${item && selected === item ? 'selected' : ''} ${drag?.item === item ? 'dragging' : ''}`}
        aria-label={`第${index + 1}个位置：${item || '空位'}`} data-order-item={item || undefined}
        onClick={() => {
          if (suppressClick.current) { suppressClick.current = false; return; }
          if (selected) place(selected, index);
          else if (item) select(item);
        }} onKeyDown={event => { if (event.key === 'Escape') setSelected(null); }}>
        <span className="ct-order-number">{index + 1}</span><span>{item || '拖到这里'}</span>
      </button>)}
    </div>
    <div className="ct-order-bank" ref={bankRef} role="group" aria-label="待排序词语">
      {items.map(item => <button type="button" className={`ct-order-word ${slots.includes(item) ? 'placed' : ''} ${selected === item ? 'selected' : ''} ${drag?.item === item ? 'dragging' : ''}`} key={item}
        data-order-item={item} disabled={slots.includes(item)} aria-hidden={slots.includes(item) || undefined} aria-pressed={selected === item} onClick={() => select(item)} onKeyDown={event => { if (event.key === 'Escape') setSelected(null); }}>{item}</button>)}
      {slots.every(Boolean) && <span className="ct-order-bank-hint">词语都放好了，可以拖动调整顺序。</span>}
    </div>
    <span className="ct-order-announcement" role="status">{announcement}</span>
    {drag && createPortal(<div className="ct-order-ghost" style={{ left: drag.x - drag.offsetX, top: drag.y - drag.offsetY, width: drag.width, height: drag.height }} aria-hidden="true">{drag.item}</div>, document.body)}
  </div>;
}
