import { useRef, useState } from 'react';
import { letterStrokePaths, type LetterWritingStyle } from '../content/writingTemplates';
import { checkInkStroke, strokePathPoints, type InkPoint } from '../writingCheck';
import './screen-writing.css';

export default function ScreenLetterWriting({ letter, writingStyle = 'english', onPass }: { letter: string; writingStyle?: LetterWritingStyle; onPass: (supported: boolean) => void }) {
  const paths = letterStrokePaths(letter, writingStyle);
  const strokes = paths.map(strokePathPoints);
  const numbers = strokes.map((stroke, index) => {
    const sameStart = strokes.flatMap((other, otherIndex) => Math.hypot(other[0].x-stroke[0].x, other[0].y-stroke[0].y) < 7 ? [otherIndex] : []);
    return { x: stroke[0].x + 5 + (sameStart.indexOf(index) - (sameStart.length-1)/2)*18, y: stroke[0].y - 5 };
  });
  const [accepted, setAccepted] = useState<InkPoint[][]>([]);
  const [ink, setInk] = useState<InkPoint[]>([]);
  const [retryInk, setRetryInk] = useState<InkPoint[]>([]);
  const [message, setMessage] = useState('按范写的顺序，在四线格中写字母。');
  const [demo, setDemo] = useState(0);
  const current = useRef<InkPoint[] | null>(null);
  const pointerId = useRef<number | null>(null);
  const finished = useRef(false);
  const point = (event: React.PointerEvent<SVGSVGElement>): InkPoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * 210 / rect.width, y: (event.clientY - rect.top) * 200 / rect.height };
  };
  const finish = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!current.current || finished.current || event.pointerId !== pointerId.current) return;
    const drawn = [...current.current, point(event)]; current.current = null; pointerId.current = null; setInk([]);
    if (!checkInkStroke(drawn, strokes[accepted.length])) {
      setRetryInk(drawn);
      setMessage(`第 ${accepted.length + 1} 笔还需要调整，笔迹已保留。请看起笔点、方向和占格，重新写这一笔。`); return;
    }
    setRetryInk([]);
    const next = [...accepted, drawn]; setAccepted(next);
    if (next.length === strokes.length) {
      finished.current = true; setMessage('✓ 自动检查通过：笔画、顺序和占格符合本次范写。'); onPass(true);
    } else setMessage(`第 ${next.length} 笔正确，继续第 ${next.length + 1} 笔。`);
  };
  const line = (points: InkPoint[]) => points.map(point => `${point.x},${point.y}`).join(' ');
  return <div className="screen-letter-writing" aria-label={`屏幕书写 ${letter}`}>
    <div className="screen-writing-reference"><b>范字 {letter}</b><svg viewBox="0 0 210 200" preserveAspectRatio="none" aria-label={`${letter} 笔画顺序`}>
      {[24,73,128,178].map(y => <line key={y} x1="0" x2="210" y1={y} y2={y} className="writing-grid-line" />)}
      {paths.map((path,index) => <g key={index}><path d={path} className="writing-reference-stroke"/><text x={numbers[index].x} y={numbers[index].y}>{index+1}</text></g>)}
      {demo > 0 && paths.map((path,index) => <path key={`${demo}:${index}`} d={path} pathLength="1" className="writing-demo-stroke" style={{ animationDelay: `${index * 1.1}s` }} />)}
    </svg></div>
    <div className="screen-writing-input"><b>自己写 · {accepted.length}/{paths.length} 笔</b>
      <svg viewBox="0 0 210 200" preserveAspectRatio="none" role="img" aria-label={`${letter} 屏幕书写区`} className="screen-letter-pad" data-letter={letter} data-writing-style={writingStyle}
        onPointerDown={event => { if (finished.current || !paths.length || current.current) return; event.currentTarget.setPointerCapture(event.pointerId); pointerId.current = event.pointerId; current.current = [point(event)]; setRetryInk([]); setInk(current.current); }}
        onPointerMove={event => { if (!current.current || event.pointerId !== pointerId.current) return; current.current.push(point(event)); setInk([...current.current]); }}
        onPointerUp={finish} onPointerCancel={event => { if (!current.current || event.pointerId !== pointerId.current) return; setRetryInk([...current.current]); current.current = null; pointerId.current = null; setInk([]); setMessage(`落笔中断，笔迹已保留。请重新写第 ${accepted.length + 1} 笔。`); }}>
        {[24,73,128,178].map(y => <line key={y} x1="0" x2="210" y1={y} y2={y} className="writing-grid-line" />)}
        {paths.map((path,index) => <path key={index} d={path} className="writing-trace-hint" />)}
        {accepted.map((stroke,index) => <polyline key={index} points={line(stroke)} className="writing-child-ink"/>)}
        {retryInk.length > 0 && <polyline points={line(retryInk)} className="writing-child-ink writing-retry-ink"/>}
        <polyline points={line(ink)} className="writing-child-ink"/>
      </svg>
    </div>
    <div className="screen-writing-actions"><button type="button" onClick={() => { setDemo(value => value + 1); }}>看逐笔范写</button>
      {retryInk.length > 0 && <button type="button" onClick={() => { setRetryInk([]); setMessage(`重新写第 ${accepted.length + 1} 笔，已写对的笔画会保留。`); }}>重写这一笔</button>}
      <button type="button" onClick={() => { current.current = null; pointerId.current = null; finished.current = false; setAccepted([]); setInk([]); setRetryInk([]); setMessage('已清空，在四线格中重新写。'); }}>清空，重新写</button></div>
    <p role="status">{paths.length ? message : '该字母暂缺笔画模板，请稍后重试。'}</p>
    <small>按本课范写逐笔检查，写对后自动记完成。</small>
  </div>;
}
