import MathObjectGlyph from '../MathObjectGlyph';
import { applyChangeUnit, changeFacts, createChange, undoChange, type ChangeState } from '../../mathManipulatives';
import './math-tools.css';

export default function QuantityChangeBoard({ initial, changes, state, onChange, showActions = true }: { initial: number; changes: number[]; state: ChangeState; onChange: (state: ChangeState) => void; showActions?: boolean }) {
  const facts = changeFacts(state, changes);
  const equation = `${initial}${changes.map(n => `${n > 0 ? '＋' : '－'}${Math.abs(n)}`).join('')}`;
  return <div className="math-tool quantity-change-tool" aria-label="连续变化教具">
    <ol className="tool-change-timeline"><li><small>原来</small><b>{initial}</b></li>{changes.map((delta, i) => <li key={i} className={i < facts.stage ? 'done' : i === facts.stage ? 'current' : ''}><small>第 {i + 1} 次{delta > 0 ? '加入' : '拿走'} {Math.abs(delta)} 个</small><b>{state.counts[i + 1] ?? '？'}</b></li>)}</ol>
    <div className="tool-change-material"><b>现在有 {facts.current} 个</b><div className="tool-tokens">{Array.from({ length: facts.current }, (_, id) => facts.delta < 0 && !facts.complete ? <button type="button" className="tool-token" key={id} aria-label={`拿走第 ${id + 1} 个圆片`} onClick={() => onChange(applyChangeUnit(state, changes))}><MathObjectGlyph kind="disc" /></button> : <span className="tool-token" key={id}><MathObjectGlyph kind="disc" /></span>)}{facts.current === 0 && <span>没有圆片了</span>}</div></div>
    {!facts.complete && <div className="tool-change-incoming"><b>第 {facts.stage + 1} 次：还要{facts.delta > 0 ? '加入' : '拿走'} {facts.remaining} 个</b>{facts.delta > 0 ? <div className="tool-tokens">{Array.from({ length: facts.remaining }, (_, id) => <button type="button" className="tool-token" key={id} aria-label={`加入第 ${id + 1} 个圆片`} onClick={() => onChange(applyChangeUnit(state, changes))}><MathObjectGlyph kind="disc" /><span aria-hidden="true">＋</span></button>)}</div> : <p>点上面的圆片，把它拿走。</p>}</div>}
    <p className={facts.complete ? 'tool-success' : 'tool-hint'} role="status">{facts.complete ? `✓ ${equation}＝${facts.current}；过程：${state.counts.join(' → ')}。` : '按发生顺序操作圆片，先做完这一次，再做下一次。'}</p>
    {showActions && <div className="tool-actions"><button type="button" disabled={state.counts.length === 1 && state.progress === 0} onClick={() => onChange(undoChange(state, changes))}>撤销一步</button><button type="button" data-practice-restart onClick={() => onChange(createChange(initial))}>再做一次</button></div>}
  </div>;
}
