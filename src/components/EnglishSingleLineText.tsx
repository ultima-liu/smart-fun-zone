import { useLayoutEffect, useRef } from 'react';
import './english-single-line-text.css';

/** Keep the complete question or answer on one line, fitting only when space is tight. */
export default function EnglishSingleLineText({ children }: { children: string }) {
  const container = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const outer = container.current;
    const inner = text.current;
    if (!outer || !inner) return;
    let active = true;
    const fit = () => {
      if (!active) return;
      inner.style.fontSize = 'inherit';
      const available = outer.clientWidth;
      const needed = inner.offsetWidth;
      if (available > 0 && needed > available) {
        const size = parseFloat(getComputedStyle(outer).fontSize);
        inner.style.fontSize = `${Math.floor(size * (available - 1) / needed * 100) / 100}px`;
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(outer);
    void document.fonts.ready.then(fit);
    return () => { active = false; observer.disconnect(); };
  }, [children]);
  return <span ref={container} className="en-single-line-text"><span ref={text}>{children}</span></span>;
}
