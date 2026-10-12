import { useState } from 'react';
import { createLine, intervalFacts, selectLineEndpoint, lineNumbers, moveOnLine, undoLine, type LineConfig, type LineState } from '../../mathManipulatives';
import './math-tools.css';

type Props = { config: LineConfig; state: LineState; onChange: (state: LineState) => void; mode?: 'explore' | 'count' | 'jump' | 'between'; train?: boolean; showActions?: boolean; compact?: boolean };
export default function NumberLineBoard({ config, state, onChange, mode = 'explore', train = true, showActions = true, compact = false }: Props) {
  const numbers = lineNumbers(config);
  const tracks = compact ? [numbers.slice(0, 11), numbers.slice(11)].filter(row => row.length) : [numbers];
  const [hint, setHint] = useState('');
  const index = numbers.indexOf(state.position);
  const interval = intervalFacts(config, state.visited);
  const complete = mode === 'count' && state.visited.length === numbers.length;
  const choose = (number: number) => {
    const next = mode === 'between' ? selectLineEndpoint(state, config, number) : moveOnLine(state, config, number, mode === 'count');
    if (next === state) { if (mode === 'count' && !complete) setHint(`先点 ${numbers[state.visited.length]}，再点下一节。`); return; }
    onChange(next); setHint(`已到 ${number}${train ? ' 号车厢' : ''}。`);
  };
  return <div className={`math-tool number-line-tool ${train ? 'with-carriages' : ''}`} aria-label="数线车厢教具">
    <p className="tool-hint" role="status">{mode === 'between' ? '先点一个端点，再点另一个，数一数两端之间有几个。两端自己不算在里面。' : mode === 'count' ? complete ? '✓ 顺序点好了！' : `从 ${config.min} 点到 ${config.max}，接下来点 ${numbers[state.visited.length]}。` : mode === 'jump' ? `从 ${state.history[0]?.position ?? state.position} 出发，点左右箭头，每次走 ${config.step}。` : '点一节车厢，看看它的相邻数和到两端的距离。'}{hint && ` ${hint}`}</p>
    <div className="tool-line-scroll">{tracks.map((row, rowIndex) => <div className="tool-line-segment" key={rowIndex}>{tracks.length > 1 && <small className="tool-line-continuation">{rowIndex === 0 ? "先从左往右走这一行" : "接着从左往右走这一行"}</small>}<div className="tool-line-track" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(${compact ? 44 : 52}px, 1fr))`, width: compact ? `min(100%, ${row.length * 82 - 6}px)` : undefined, margin: compact ? '0 auto' : undefined }}>{row.map(number => <button type="button" key={number} disabled={mode === 'jump'} aria-label={`${number}${train ? '号车厢' : '刻度'}`} aria-pressed={state.position === number && ((mode !== 'count' && mode !== 'between') || state.visited.includes(number))} className={`${state.visited.includes(number) ? 'visited' : ''} ${mode === 'between' && interval?.inside.includes(number) ? 'inside' : ''} ${state.position === number && ((mode !== 'count' && mode !== 'between') || state.visited.includes(number)) ? 'current' : ''}`} onClick={() => choose(number)}><span className="line-marker" aria-hidden="true">{state.position === number && ((mode !== 'count' && mode !== 'between') || state.visited.includes(number)) ? '🐻' : state.visited.includes(number) ? '✓' : ''}</span>{train && <span className="line-windows" aria-hidden="true">▯ ▯</span>}<b>{number}</b><small>{train ? '号车厢' : number === config.min ? '起点' : number === config.max ? '终点' : ''}</small></button>)}</div></div>)}</div>
    {mode === 'jump' && <div className="tool-jump-actions"><button type="button" disabled={index <= 0} onClick={() => choose(numbers[index - 1])}>← 往左走 {config.step}</button><strong>{state.position}</strong><button type="button" disabled={index < 0 || index >= numbers.length - 1} onClick={() => choose(numbers[index + 1])}>往右走 {config.step} →</button></div>}
    {mode === 'between' && <p className="tool-relation" role="status">{interval ? `两端是 ${state.visited.join(' 和 ')}，之间有 ${interval.inside.length} 个${train ? '车厢' : '刻度点'}${interval.inside.length ? `：${interval.inside.join('、')}` : ''}。从一端走到另一端要 ${interval.steps} 步，距离是 ${interval.distance}。` : state.visited.length ? `已选 ${state.visited[0]}，再点另一个端点。` : '先选择两端。'}</p>}
    {mode !== 'count' && mode !== 'between' && <><div className="tool-part-whole"><b>当前：{state.position}</b><span>前一个刻度：{numbers[index - 1] ?? '到头了'}　后一个刻度：{numbers[index + 1] ?? '到头了'}</span></div><p className="tool-relation">到 {config.min} 要走 {index} 步；到 {config.max} 要走 {numbers.length - 1 - index} 步。每步是 {config.step}，{index === numbers.length - 1 - index ? '两边一样远' : `${index < numbers.length - 1 - index ? config.min : config.max} 更近`}。</p>{mode === 'jump' && state.visited.length > 0 && <p className="tool-hint">{compact ? '最近的足迹：' : '足迹：'}{(compact ? [state.history[0]?.position ?? config.min, ...state.visited].slice(-8) : [state.history[0]?.position ?? config.min, ...state.visited]).join(' → ')}</p>}</>}
    {showActions && <div className="tool-actions"><button type="button" disabled={!state.history.length} onClick={() => { onChange(undoLine(state)); setHint('撤销了上一步。'); }}>撤销一步</button><button type="button" onClick={() => { onChange(createLine(config.min)); setHint(''); }}>再走一次</button></div>}
  </div>;
}
