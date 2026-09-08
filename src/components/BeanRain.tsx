import { useEffect, useRef, useState } from 'react';
import { IconBean } from './icons';

/** 卷卷豆掉落：监听任务完成/豆豆发放事件，全屏撒豆 或 从星球位置爆发 */
interface Drop {
  id: number;
  x: number; // 视口 %（左）
  y: number; // 视口 %（顶，爆发模式）
  fromTop: boolean;
  dx: number;
  dur: number;
  size: number;
}

let seq = 0;

export default function BeanRainHost() {
  const [drops, setDrops] = useState<Drop[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const spawn = (count: number, burst?: { rect: DOMRect }) => {
      const batch: Drop[] = [];
      const cx = burst ? ((burst.rect.left + burst.rect.width / 2) / window.innerWidth) * 100 : null;
      const cy = burst ? ((burst.rect.top + burst.rect.height * 0.3) / window.innerHeight) * 100 : null;
      for (let i = 0; i < count; i++) {
        batch.push({
          id: ++seq,
          x: cx !== null ? cx + (Math.random() * 18 - 9) : 4 + Math.random() * 90,
          y: cy !== null ? cy + Math.random() * 4 : -8,
          fromTop: !burst,
          dx: -30 + Math.random() * 60,
          dur: burst ? 1.0 + Math.random() * 0.7 : 1.15 + Math.random() * 0.95,
          size: 15 + Math.random() * 13,
        });
      }
      const ids = new Set(batch.map((d) => d.id));
      setDrops((prev) => [...prev, ...batch]);
      timers.current.push(
        window.setTimeout(() => setDrops((prev) => prev.filter((d) => !ids.has(d.id))), 2600),
      );
    };
    const onTaskDone = (e: Event) => {
      const detail = (e as CustomEvent<unknown>).detail;
      const n = Array.isArray(detail) ? Math.min(24, detail.length * 5 + 6) : 12;
      spawn(n);
    };
    const onBurst = (e: Event) => {
      const detail = (e as CustomEvent<{ n?: number; rect?: DOMRect }>).detail;
      spawn(detail?.n ?? 8, detail?.rect ? { rect: detail.rect } : undefined);
    };
    window.addEventListener('sfz-task-done', onTaskDone);
    window.addEventListener('sfz-beans-burst', onBurst);
    return () => {
      window.removeEventListener('sfz-task-done', onTaskDone);
      window.removeEventListener('sfz-beans-burst', onBurst);
      timers.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  if (drops.length === 0) return null;
  return (
    <div className="bean-rain" aria-hidden="true">
      {drops.map((d) => (
        <span
          key={d.id}
          className={`br-dot ${d.fromTop ? 'from-top' : ''}`}
          style={
            {
              left: `${d.x}%`,
              top: d.fromTop ? undefined : `${d.y}%`,
              '--dx': `${d.dx}px`,
              '--dur': `${d.dur}s`,
            } as React.CSSProperties
          }
        >
          <IconBean size={d.size} gradient="gold" />
        </span>
      ))}
    </div>
  );
}
