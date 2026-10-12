import { useState, type ReactNode } from 'react';
import { comparisonFacts, connectPair, type Pair } from '../../mathManipulatives';
import './math-tools.css';

type Props = {
  left: number; right: number; leftName: string; rightName: string;
  leftGlyph: ReactNode; rightGlyph: ReactNode; pairs: Pair[];
  onChange: (pairs: Pair[]) => void; onSelectionChange?: (left: number | null) => void;
  revealRelation?: boolean; showDifference?: boolean;
  tokenSize?: 44 | 54;
  workspace?: { controls: ReactNode; instructions: ReactNode; replay: ReactNode };
  tiled?: boolean;
};

export default function PairingBoard({ left, right, leftName, rightName, leftGlyph, rightGlyph, pairs, onChange, onSelectionChange, revealRelation = true, showDifference = false, tokenSize = 54, workspace, tiled = false }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState(left === 0 || right === 0 ? `${leftName}有 ${left} 个，${rightName}有 ${right} 个；空的一边没有可以配对的物体。` : tiled ? `先点上面的${leftName}，再点下面的${rightName}；配好后，它们会排在同一列。` : '先点左边一个物体，再点右边一个，把它们配成一对。');
  const facts = comparisonFacts(left, right, pairs);
  const rows = Math.max(left, right, 1);
  const rowHeight = tokenSize + 6;
  const size = tiled ? 44 : tokenSize;
  const tokenStyle = { width: size, height: size, flexBasis: size, fontSize: size === 44 ? 28 : 32 };
  const select = (index: number | null) => { setSelected(index); onSelectionChange?.(index); };
  const point = (index: number, side: 'left' | 'right') => ({
    x: side === 'left' ? 14 : 86,
    y: index * rowHeight + tokenSize / 2,
  });
  const leftToken = (index: number) => {
    const paired = pairs.some(pair => pair.left === index);
    return <button type="button" key={index} aria-label={`第 ${index + 1} ${leftName === '小猴' ? '只' : '个'}${leftName}${paired ? '，已配对' : ''}`} aria-pressed={selected === index || paired} className={`tool-token mt-pair-monkey ${paired ? 'paired' : ''} ${selected === index ? 'selected' : ''}`} onClick={() => {
      if (paired) { setHint('这一对已经配好了，可以撤销后重新配。'); return; }
      select(index); setHint(`选中了第 ${index + 1} 个${leftName}，再点${tiled ? '下面' : '右边'}一个${rightName}。`);
    }} style={tokenStyle}>{leftGlyph}{tiled && <small className="tool-token-number">{index + 1}</small>}{paired && <i>✓</i>}</button>;
  };
  const rightToken = (index: number) => {
    const paired = pairs.some(pair => pair.right === index);
    return <button type="button" key={index} aria-label={`第 ${index + 1} 个${rightName}${paired ? '，已配对' : ''}`} aria-pressed={paired} className={`tool-token mt-pair-fruit ${paired ? 'paired' : ''}`} onClick={() => {
      if (selected === null) { setHint(`先点${tiled ? '上面' : '左边'}一个${leftName}，再给它配一个${rightName}。`); return; }
      const next = connectPair(pairs, selected, index, left, right);
      if (next === pairs) { setHint('这个物体已经配过了，请选一个还没配的。'); return; }
      onChange(next); select(null);
      setHint(next.length === Math.min(left, right) ? '配完了！看看哪边还有剩余。' : '配好一对了，再配下一对。');
    }} style={tokenStyle}>{rightGlyph}{tiled && <small className="tool-token-number">{index + 1}</small>}{paired && <i>✓</i>}</button>;
  };
  // Keep each chosen pair in its own vertical lane. Unmatched objects fill the
  // remaining slots, preserving their original identities and selection order.
  const unmatchedRight = Array.from({ length: right }, (_, index) => index).filter(index => !pairs.some(pair => pair.right === index));
  let nextUnmatched = 0;
  const lanes = Array.from({ length: rows }, (_, index) => {
    const pair = pairs.find(pair => pair.left === index);
    return { left: index < left ? index : null, right: pair?.right ?? unmatchedRight[nextUnmatched++], paired: !!pair };
  });
  const materials = <>
    <div className="tool-pair-head"><b>{tiled ? '上面 · ' : ''}{leftName} · {left}</b><span>已配好 {pairs.length} 对</span><b>{tiled ? '下面 · ' : ''}{rightName} · {right}</b></div>
    <div className="tool-pair-scroll">{tiled ? <div className="tool-pair-lanes" style={{ gridTemplateColumns: `repeat(${Math.min(rows, 10)}, minmax(0, 1fr))` }}>
      {lanes.map((lane, index) => <div key={index} className={`tool-pair-lane${lane.paired ? ' paired' : ''}`}>
        {lane.left === null ? <span className="tool-pair-vacancy" aria-hidden="true" /> : leftToken(lane.left)}
        <span className={`tool-pair-link${lane.paired ? ' connected' : ''}`} aria-hidden="true" />
        {lane.right === undefined ? <span className="tool-pair-vacancy" aria-hidden="true" /> : rightToken(lane.right)}
      </div>)}
    </div> : <div className="tool-pair-stage" style={{ height: rows * rowHeight }}>
      <svg className="tool-pair-lines" viewBox={`0 0 100 ${rows * rowHeight}`} preserveAspectRatio="none" aria-hidden="true">
        {pairs.map(pair => { const a = point(pair.left, 'left'); const b = point(pair.right, 'right'); return <path key={pair.left} d={`M ${a.x} ${a.y} C 46 ${a.y},54 ${b.y},${b.x} ${b.y}`} />; })}
      </svg>
      <div className="tool-pair-column">{Array.from({ length: left }, (_, index) => leftToken(index))}</div>
      <div className="tool-pair-column">{Array.from({ length: right }, (_, index) => rightToken(index))}</div>
    </div>}</div>
  </>;
  const feedback = <>
    <p className="tool-hint" aria-live="polite">{hint}</p>
    <p className="tool-relation" aria-live="polite">{facts.complete ? <>{revealRelation && <strong>{left} {facts.relation} {right}　</strong>}{facts.leftRemaining === facts.rightRemaining ? '两边都配完，同样多。' : `${facts.leftRemaining ? leftName : rightName}还有 ${Math.abs(left - right)} 个没配上。`}{showDifference && left !== right && <span>相差 {Math.abs(left - right)} 个。</span>}</> : '配完后，看看哪边还有剩余。'}</p>
    <div className="tool-actions"><button type="button" disabled={!pairs.length} onClick={() => { onChange(pairs.slice(0, -1)); select(null); setHint('已撤销最后一对，可以重新配。'); }}>撤销一对</button><button type="button" onClick={() => { onChange([]); select(null); setHint('重新开始，一个对一个配。'); }}>再配一次</button></div>
  </>;
  return <div className={`math-tool pairing-tool${workspace ? ' tool-pair-workspace' : ''}${tiled ? ' tool-pair-tiled' : ''}`} aria-label="一一配对教具">
    {workspace ? <>
      <div className="tool-pair-operation" aria-label="配对操作区">{workspace.controls}{materials}</div>
      <aside className="tool-pair-explanation" aria-label="配对说明与操作">
        <div className="tool-pair-instructions">{workspace.instructions}</div>
        <div className="tool-pair-result-heading"><b>看看结果</b>{workspace.replay}</div>
        {feedback}
      </aside>
    </> : <>{materials}{feedback}</>}
  </div>;
}
