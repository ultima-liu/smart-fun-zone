import { useState } from 'react';
import MathObjectGlyph from '../MathObjectGlyph';
import PartitionBoard from './PartitionBoard';
import { groupingFacts, type PartitionState } from '../../mathManipulatives';
import './math-tools.css';

export default function GroupingBoard({ state, onChange, groups, mode, size, compact = false }: { state: PartitionState; onChange: (state: PartitionState) => void; groups: number; mode: 'share' | 'size' | 'array'; size: number; compact?: boolean }) {
  const [showArray, setShowArray] = useState(false);
  const facts = groupingFacts(state, groups, mode === 'size' ? size : undefined);
  return <div className={`math-tool grouping-tool grouping-${mode}${compact && showArray ? ' grouping-preview' : ''}`} aria-label="等分排列教具">
    <div className="tool-grouping-instruction"><p className="tool-hint">{mode === 'size' ? `每组放 ${size} 个，够一组再分下一组；不够一组的留在待分区。` : mode === 'array' ? `排成 ${groups} 行，每行一样多；不够完整一行的留在待分区。` : `平均分给 ${groups} 组，每组一样多；不够再每组分一个的留在待分区。`}</p>{compact && mode === 'array' && <button type="button" aria-pressed={showArray} onClick={() => setShowArray(value => !value)}>{showArray ? '返回摆圆片' : '看排列图'}</button>}</div>
    <div className="tool-grouping-materials" hidden={compact && showArray}><PartitionBoard state={state} onChange={onChange} groupNames={Array.from({ length: groups }, (_, i) => `第 ${i + 1} ${mode === 'array' ? '行' : '组'}`)} glyph={<MathObjectGlyph kind="disc" />} tokenName="圆片" focusGroups={compact} /></div>
    {mode === 'array' && (!compact || showArray) && <div className="tool-array" aria-label="行列点阵">{facts.counts.map((count, row) => <div key={row}><b>第 {row + 1} 行</b><span>{Array.from({ length: Math.max(facts.size, count) }, (_, col) => <i key={col} className={col < count ? 'filled' : ''} aria-label={`${row + 1}行${col + 1}列${col < count ? '有圆片' : '空位'}`}>{col < count ? '●' : '○'}</i>)}</span></div>)}</div>}
    <p className={facts.fair ? 'tool-success' : 'tool-hint'} role="status">{facts.fair ? `✓ ${groups} ${mode === 'array' ? '行' : '组'}，每${mode === 'array' ? '行' : '组'} ${facts.size} 个${facts.remainder ? `，剩 ${facts.remainder} 个` : '，正好分完'}。${facts.total}＝${groups}×${facts.size}${facts.remainder ? `＋${facts.remainder}` : ''}` : `${compact ? '' : `各组已有：${facts.counts.join('、')}；`}待分区还有 ${facts.remaining} 个。${facts.counts.some(count => count > facts.size) ? '有一组多了，可以拿回来重新分。' : '继续摆，让各组一样多。'}`}</p>
  </div>;
}
