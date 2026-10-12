import { useState } from 'react';
import MathObjectGlyph from '../MathObjectGlyph';
import './math-tools.css';

type Props = { whole: number; known: number; mode?: 'hidden' | 'original'; initialAnswer?: number | null; onResolved?: (answer: number | null) => void; answer?: string; onAnswerChange?: (answer: string) => void; moved?: number[]; onMove?: (moved: number[]) => void; showActions?: boolean };
export default function MissingPartBoard({ whole, known, mode = 'hidden', initialAnswer, onResolved, answer: suppliedAnswer, onAnswerChange, moved: suppliedMoved, onMove, showActions = true }: Props) {
  const [localAnswer, setLocalAnswer] = useState(() => initialAnswer === (mode === 'hidden' ? whole - known : whole + known) ? String(initialAnswer) : '');
  const [localMoved, setLocalMoved] = useState<number[]>(() => mode === 'original' && initialAnswer === whole + known ? Array.from({ length: known }, (_, i) => i) : []);
  const answer = suppliedAnswer ?? localAnswer;
  const moved = suppliedMoved ?? localMoved;
  const setAnswer = (next: string) => { setLocalAnswer(next); onAnswerChange?.(next); };
  const setMoved = (update: (values: number[]) => number[]) => { const next = update(moved); setLocalMoved(next); onMove?.(next); };
  const expected = mode === 'hidden' ? whole - known : whole + known;
  const passed = answer !== '' && Number(answer) === expected;
  return <div className="math-tool missing-part-tool" aria-label={mode === 'hidden' ? '隐藏部分教具' : '求原来教具'}>
    <p className="tool-hint">{mode === 'hidden' ? `一共有 ${whole} 个圆片，看得到 ${known} 个。盒子里藏了几个？` : `拿走了 ${known} 个，剩下 ${whole} 个。点拿走的圆片，把它们放回来，看看原来有几个。`}</p>
    <div className="tool-missing-groups"><section><b>{mode === 'hidden' ? `看得到 ${known} 个` : '放回原来的位置'}</b><div className="tool-tokens">{Array.from({ length: mode === 'hidden' ? known : whole + moved.length }, (_, i) => <span className="tool-token" key={i}><MathObjectGlyph kind="disc" /></span>)}</div></section><section><b>{mode === 'hidden' ? '藏起来的部分' : '拿走的部分'}</b>{mode === 'hidden' ? <div className="tool-cover-box" aria-label={passed ? `盒子里有 ${expected} 个` : '盒子里的数量待推想'}>{passed ? <><b>{expected} 个</b><div className="tool-tokens">{Array.from({ length: expected }, (_, i) => <span className="tool-token" key={i}><MathObjectGlyph kind="disc" /></span>)}</div></> : <span>？</span>}</div> : <div className="tool-tokens">{Array.from({ length: known }, (_, i) => moved.includes(i) ? null : <button type="button" className="tool-token" key={i} aria-label={`放回第 ${i + 1} 个圆片`} onClick={() => { setMoved(values => values.includes(i) ? values : [...values, i]); setAnswer(''); onResolved?.(null); }}><MathObjectGlyph kind="disc" /></button>)}{moved.length === known && <span>都放回来了</span>}</div>}</section></div>
    <label className="tool-missing-answer">{mode === 'hidden' ? '藏了几个？' : '原来几个？'}<input aria-label={mode === 'hidden' ? '隐藏部分的数量' : '原来的数量'} inputMode="numeric" maxLength={2} readOnly={passed} disabled={mode === 'original' && moved.length !== known} value={answer} onChange={event => { const next = event.target.value.replace(/\D/g, ''); setAnswer(next); onResolved?.(next && Number(next) === expected ? expected : null); }} /></label>
    {answer && <p role="status" className={passed ? 'tool-success' : 'tool-hint'}>{passed ? `✓ ${mode === 'hidden' ? `${whole}－${known}` : `${whole}＋${known}`}＝${expected}。${mode === 'hidden' ? '打开盒子核对一下。' : '拿走的和剩下的合起来，就是原来的数量。'}` : '再看看整体和两个部分，试试另一个数。'}</p>}
    {showActions && <div className="tool-actions">{mode === 'original' && <button type="button" disabled={!moved.length} onClick={() => { setMoved(values => values.slice(0, -1)); setAnswer(''); onResolved?.(null); }}>撤销一步</button>}<button type="button" data-practice-restart onClick={() => { setMoved(() => []); setAnswer(''); onResolved?.(null); }}>再做一次</button></div>}
  </div>;
}
