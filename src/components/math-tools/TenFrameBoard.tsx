import { transferTenFrame } from '../../mathManipulatives';
import './math-tools.css';

export default function TenFrameBoard({ first, second, moved, onChange, sourceLabel = '转移第', sourceAriaLabel, revealResult = true }: { first: number; second: number; moved: number[]; onChange: (moved: number[]) => void; sourceLabel?: string; sourceAriaLabel?: (token: number) => string; revealResult?: boolean }) {
  const filled = first + moved.length;
  const remaining = second - moved.length;
  const toggle = (token: number) => onChange(transferTenFrame(moved, token, second));
  return <div className="math-tool ten-frame-tool" aria-label="十格框教具">
    <p className="tool-hint">从第二组点圆片移入十格框；点移入的圆片可以拿回。</p>
    <div className="tool-ten-layout"><section><header><b>第一组原有 {first} 个</b><span>{filled < 10 ? `还空 ${10 - filled} 格` : filled === 10 ? '正好凑成十' : `十格外还有 ${filled - 10} 个`}</span></header>
      <div className="tool-ten-grid">{Array.from({ length: 10 }, (_, index) => <div key={index} className={index < filled ? 'filled' : ''}>{index < first ? <span className="tool-counter blue" /> : index < filled ? <button type="button" className="tool-counter coral" aria-label={`拿回第 ${moved[index - first] + 1} 个圆片`} onClick={() => toggle(moved[index - first])} /> : null}</div>)}</div>
      {filled > 10 && <div className="tool-tokens">{moved.slice(10 - first).map(token => <button type="button" key={token} className="tool-counter coral" aria-label={`拿回第 ${token + 1} 个圆片`} onClick={() => toggle(token)} />)}</div>}
    </section><section><header><b>第二组原有 {second} 个</b><span>还剩 {remaining} 个</span></header><div className="tool-tokens">{Array.from({ length: second }, (_, index) => <button type="button" key={index} aria-label={sourceAriaLabel ? sourceAriaLabel(index) : `${sourceLabel} ${index + 1} 个圆片`} aria-pressed={moved.includes(index)} className={`tool-counter coral ${moved.includes(index) ? 'moved' : ''}`} onClick={() => toggle(index)}>{moved.includes(index) ? '↩' : ''}</button>)}</div></section></div>
    <p className="tool-relation">{filled === 10 ? `${second} 分成 ${moved.length} 和 ${remaining}；${first}＋${second}＝10＋${remaining}${revealResult ? `＝${first + second}` : ''}` : `第一组现在 ${filled} 个，第二组还有 ${remaining} 个；总量没有变。`}</p>
    <div className="tool-actions"><button type="button" disabled={!moved.length} onClick={() => onChange(moved.slice(0, -1))}>撤销一步</button><button type="button" onClick={() => onChange([])}>再摆一次</button></div>
  </div>;
}
