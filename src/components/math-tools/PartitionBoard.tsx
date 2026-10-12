import { useRef, useState, type ReactNode } from 'react';
import { createPartition, movePartition, partitionFacts, undoPartition, type PartitionState } from '../../mathManipulatives';
import './math-tools.css';

type Props = { state: PartitionState; onChange: (state: PartitionState) => void; groupNames: string[]; glyph: ReactNode; tokenName: string; showEquations?: boolean; focusGroups?: boolean };
export default function PartitionBoard({ state, onChange, groupNames, glyph, tokenName, showEquations = false, focusGroups = false }: Props) {
  const [activeGroup, setActiveGroup] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ id: number; x: number; y: number } | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [hint, setHint] = useState(`拖${tokenName}进篮子；也可以先点${tokenName}，再点篮子。`);
  const facts = partitionFacts(state, groupNames.length);
  const canReturn = selected !== null && state.positions[selected] !== -1;
  const hitGroup = (x: number, y: number) => Array.from(stage.current?.querySelectorAll<HTMLElement>('[data-tool-group]') ?? []).find(element => {
    const box = element.getBoundingClientRect();
    return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
  });
  const move = (id: number, group: number) => {
    const next = movePartition(state, id, group, groupNames.length);
    if (next === state) return;
    onChange(next); setSelected(null);
    setHint(group < 0 ? `拿回一个${tokenName}，总数没有变。` : `一个${tokenName}放进${groupNames[group]}，总数仍是 ${facts.total}。`);
  };
  const tokens = (group: number) => state.positions.map((position, id) => position !== group ? null : <button type="button" key={id} className={`tool-token ${selected === id ? 'selected' : ''}`} aria-label={`第 ${id + 1} 个${tokenName}`} aria-pressed={selected === id} onClick={(event) => { event.stopPropagation(); setSelected(id); setHint(`选中了${tokenName}，点一个篮子就能放进去。`); }} onPointerDown={(event) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    origin.current = { x: event.clientX, y: event.clientY };
    setSelected(id); setDrag({ id, x: event.clientX, y: event.clientY });
  }}>{glyph}</button>);
  return <div className={`math-tool partition-tool${focusGroups ? ' tool-focused-groups' : ''}`} aria-label="分与合教具" ref={stage} onPointerMove={(event) => {
    if (drag) { setDrag({ ...drag, x: event.clientX, y: event.clientY }); const target = hitGroup(event.clientX, event.clientY); setOver(target ? Number(target.dataset.toolGroup) : null); }
  }} onPointerUp={(event) => {
    if (!drag) return;
    if (origin.current && Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y) > 8) {
      const target = hitGroup(event.clientX, event.clientY);
      if (target) move(drag.id, Number(target.dataset.toolGroup));
      else setHint('还没有放进去，拖到篮子里再松手。');
    }
    setDrag(null); setOver(null); origin.current = null;
  }} onPointerCancel={() => { setDrag(null); setOver(null); origin.current = null; }}>
    <div className={`tool-pool ${over === -1 ? 'is-over' : ''}`} data-tool-group="-1"><header><b>待分的{tokenName}</b><span>还有 {facts.remaining} 个</span>{focusGroups && canReturn && <button type="button" className="tool-return-token" aria-label={`拿回选中的${tokenName}`} title={`拿回选中的${tokenName}`} onClick={() => move(selected, -1)}><span aria-hidden="true">↩</span></button>}</header><div className="tool-tokens">{tokens(-1)}{!facts.remaining && <span>全部分好了</span>}</div>{!focusGroups && canReturn && <button type="button" onClick={() => move(selected, -1)}>拿回选中的{tokenName}</button>}</div>
    {focusGroups && <div className="tool-group-picker" role="group" aria-label="查看篮子">{groupNames.map((name, group) => <button type="button" key={name} aria-label={`查看${name}，已有 ${facts.counts[group]} 个`} aria-pressed={activeGroup === group} onClick={() => setActiveGroup(group)}><span>{group + 1}</span><b>{facts.counts[group]} 个</b></button>)}</div>}
    <div className="tool-groups" style={{ gridTemplateColumns: `repeat(${focusGroups ? 1 : groupNames.length}, minmax(0, 1fr))` }}>{groupNames.map((name, group) => focusGroups && group !== activeGroup ? null : <div key={name} data-tool-group={group} className={`tool-group ${selected !== null ? 'ready' : ''} ${over === group ? 'is-over' : ''}`} onClick={() => selected === null ? setHint(`先点一个${tokenName}，再点${name}。`) : move(selected, group)}>
      <header><button type="button" aria-label={name} onClick={event => { event.stopPropagation(); if (selected === null) setHint(`先点一个${tokenName}，再点${name}。`); else move(selected, group); }}><span aria-hidden="true">🧺</span>{name}</button><strong>{facts.counts[group]}</strong></header>
      <div className="tool-tokens">{tokens(group)}</div>
    </div>)}</div>
    {drag && origin.current && Math.hypot(drag.x - origin.current.x, drag.y - origin.current.y) > 8 && <span className="tool-drag-ghost" style={{ left: drag.x, top: drag.y }}>{glyph}</span>}
    <p className="tool-hint" aria-live="polite">{hint}</p>
    <div className="tool-part-whole"><b>整体 {facts.total}</b><span>已分：{facts.counts.join(' 和 ')}{facts.remaining ? `；还有 ${facts.remaining} 个待分` : `，合起来还是 ${facts.total}`}</span></div>
    {showEquations && facts.complete && facts.counts.length === 2 && <p className="tool-relation">{facts.counts[0]}＋{facts.counts[1]}＝{facts.total}　{facts.total}－{facts.counts[0]}＝{facts.counts[1]}</p>}
    <div className="tool-actions"><button type="button" disabled={!state.history.length} onClick={() => { onChange(undoPartition(state)); setSelected(null); setHint('已撤销，可以换个放法。'); }}>撤销一步</button><button type="button" onClick={() => { onChange(createPartition(facts.total)); setSelected(null); setHint('物体都拿回来了，试试另一种分法。'); }}>换一种分法</button></div>
  </div>;
}
