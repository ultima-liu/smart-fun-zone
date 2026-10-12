import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BackButton from '../components/BackButton';
import CourseReplayButton from '../components/CourseReplayButton';
import MathObjectGlyph from '../components/MathObjectGlyph';
import PairingBoard from '../components/math-tools/PairingBoard';
import PartitionBoard from '../components/math-tools/PartitionBoard';
import TenFrameBoard from '../components/math-tools/TenFrameBoard';
import PlaceValueBoard from '../components/math-tools/PlaceValueBoard';
import NumberLineBoard from '../components/math-tools/NumberLineBoard';
import GroupingBoard from '../components/math-tools/GroupingBoard';
import QuantityChangeBoard from '../components/math-tools/QuantityChangeBoard';
import MissingPartBoard from '../components/math-tools/MissingPartBoard';
import { createPartition, createPlaceValue, createLine, createChange, type ArithmeticProblem, type Pair, type LineConfig } from '../mathManipulatives';
import { useStore } from '../store';
import { useLessonTabNarration } from '../lessonTabNarration';
import '../math-tools-page.css';

const TOOLS = [
  { id: 'pair', title: '配一配', detail: '比较多少', say: '先点上面的圆片，再点下面的方块。配好的一对会排在同一列，中间有一条连线。全部配好后，看看哪种物体还有剩余。如果一种是零，看看另一种有几个。' },
  { id: 'partition', title: '分一分', detail: '整体和部分', say: '把物体分进篮子，可以拖动，也可以先点物体再点篮子。换一个篮子，总数会变吗？' },
  { id: 'ten', title: '凑成十', detail: '十格框', say: '从第二组点圆片，放进第一组的十格框。先凑成十，再看看还剩几个。' },
  { id: 'value', title: '捆十拆十', detail: '数位与加减法', say: '加入或拿走小棒。十根散棒可以捆成一捆；散棒不够时，可以拆开一捆。' },
  { id: 'line', title: '走数线', detail: '数序与距离', say: '点车厢看相邻数和距离。选择按顺序走，要从最小编号点起；选择跳着走，用箭头做加减。' },
  { id: 'group', title: '分组排列', detail: '平均分与行列', say: '先点圆片，再点要放的组。平均分时每组一样多；按每组几个分时，先分满一组。不够再分的留在待分区。' },
] as const;
function ToolIllustration({ kind }: { kind: ToolId }) {
  return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
    {kind === 'pair' && <><circle cx="16" cy="18" r="8" fill="#f6b27b" /><circle cx="16" cy="46" r="8" fill="#f6b27b" /><rect x="42" y="10" width="16" height="16" rx="5" fill="#71b8dd" /><rect x="42" y="38" width="16" height="16" rx="5" fill="#71b8dd" /><path d="M26 18h12M26 46h12" stroke="#69bda4" strokeWidth="3" strokeLinecap="round" /></>}
    {kind === 'partition' && <><path d="M7 32h24l-4 22H11L7 32ZM35 32h24l-4 22H39l-4-22Z" fill="#f5d19a" stroke="#be8d52" strokeWidth="2" /><path d="M12 32c0-16 14-16 14 0M40 32c0-16 14-16 14 0" stroke="#be8d52" strokeWidth="3" /><circle cx="24" cy="13" r="5" fill="#72bdad" /><circle cx="40" cy="10" r="5" fill="#83b9dd" /></>}
    {kind === 'ten' && <><rect x="5" y="17" width="54" height="32" rx="6" fill="#e3edf8" stroke="#779ac0" strokeWidth="2" />{Array.from({ length: 10 }, (_, i) => <circle key={i} cx={11 + (i % 5) * 10.5} cy={25 + Math.floor(i / 5) * 15} r="4" fill={i < 8 ? '#79b8d7' : '#f5b088'} />)}</>}
    {kind === 'value' && <><path d="M11 10v42M18 10v42M25 10v42M32 10v42" stroke="#ddb271" strokeWidth="4" strokeLinecap="round" /><rect x="7" y="27" width="29" height="8" rx="3" fill="#79b49e" /><path d="M46 18v34M54 18v34" stroke="#e1bb7a" strokeWidth="4" strokeLinecap="round" /></>}
    {kind === 'line' && <><path d="M5 51h54" stroke="#8aa4b7" strokeWidth="3" /><rect x="7" y="16" width="24" height="30" rx="6" fill="#80bedd" /><rect x="34" y="16" width="24" height="30" rx="6" fill="#aca0da" /><path d="M13 23h12M40 23h12" stroke="white" strokeWidth="6" /><circle cx="13" cy="47" r="4" fill="#64879e" /><circle cx="26" cy="47" r="4" fill="#64879e" /><circle cx="40" cy="47" r="4" fill="#64879e" /><circle cx="53" cy="47" r="4" fill="#64879e" /></>}
    {kind === 'group' && <>{Array.from({ length: 9 }, (_, i) => <circle key={i} cx={14 + i % 3 * 18} cy={14 + Math.floor(i / 3) * 18} r="6" fill={i < 3 ? '#84bdb0' : i < 6 ? '#8fbadd' : '#baa5da'} />)}</>}
  </svg>;
}
type ToolId = typeof TOOLS[number]['id'];
const bounded = (raw: string | null, fallback: number, max: number, min = 0) => raw !== null && /^\d+$/.test(raw) ? Math.min(max, Math.max(min, Number(raw))) : fallback;
const resolveTool = (root: HTMLElement) => root.querySelector<HTMLElement>('#tool-workbench');
const readTool = (leaf: HTMLElement) => leaf.dataset.toolInstruction ?? '';

export default function MathToolsPage() {
  const child = useStore(state => state.activeChildId);
  return <ToolWorkspace key={child ?? 'guest'} />;
}

function ToolWorkspace() {
  const root = useRef<HTMLElement>(null);
  const narration = useLessonTabNarration(root, 'math-tools', resolveTool, readTool);
  const nav = useNavigate();
  const [params] = useSearchParams();
  const initialTool = TOOLS.find(tool => tool.id === params.get('tool'))?.id ?? 'pair';
  const [tool, setTool] = useState<ToolId>(initialTool);
  const [compare, setCompare] = useState({ left: bounded(params.get('left'), 4, 20), right: bounded(params.get('right'), 6, 20), pairs: [] as Pair[] });
  const [partition, setPartition] = useState(() => { const total = bounded(params.get('total'), 8, 20, 1); return { total, groups: 2, state: createPartition(total) }; });
  const [ten, setTen] = useState({ first: bounded(params.get('first'), 8, 9, 1), second: bounded(params.get('second'), 5, 10, 1), moved: [] as number[] });
  const [problem, setProblem] = useState<ArithmeticProblem>(() => {
    const first = bounded(params.get('first'), 27, 99);
    const operator = params.get('operator') === '-' ? '-' : '+';
    const second = bounded(params.get('second'), 8, operator === '-' ? first : 99);
    return { first, second: operator === '-' ? Math.min(first, second) : second, operator };
  });
  const [draft, setDraft] = useState({ first: String(problem.first), second: String(problem.second), operator: problem.operator });
  const [value, setValue] = useState(() => createPlaceValue(problem.first));
  const [error, setError] = useState('');
  const [partitionMode, setPartitionMode] = useState<'free' | 'hidden' | 'original' | 'changes'>(() => { const mode = params.get('mode'); return mode === 'hidden' || mode === 'original' || mode === 'changes' ? mode : 'free'; });
  const [missingAnswers, setMissingAnswers] = useState({ hidden: '', original: '' });
  const [originalMoved, setOriginalMoved] = useState<number[]>([]);
  const resetRelation = () => { setMissingAnswers({ hidden: '', original: '' }); setOriginalMoved([]); };
  const [relation, setRelation] = useState(() => { const whole = bounded(params.get('total'), 8, 20, 1); return { whole, known: bounded(params.get('known'), 3, params.get('mode') === 'original' ? 10 : whole) }; });
  const [changeProblem, setChangeProblem] = useState({ initial: 5, changes: [2, 1] });
  const [changeState, setChangeState] = useState(() => createChange(5));
  const [changeEditing, setChangeEditing] = useState(0);
  const activeChange = Math.min(changeEditing, changeProblem.changes.length - 1);
  const [changeError, setChangeError] = useState('');
  const [lineConfig, setLineConfig] = useState<LineConfig>(() => { const min = bounded(params.get('min'), 10, 19); return { min, max: bounded(params.get('max'), 20, 20, min + 1), step: 1 }; });
  const [lineState, setLineState] = useState(() => createLine(lineConfig.min));
  const [lineMode, setLineMode] = useState<'explore' | 'count' | 'jump' | 'between'>(params.get('mode') === 'between' ? 'between' : 'explore');
  const [train, setTrain] = useState(true);
  const [groupMode, setGroupMode] = useState<'share' | 'size' | 'array'>('share');
  const [grouping, setGrouping] = useState(() => { const total = bounded(params.get('total'), 12, 24, 2); return { total, groups: Math.min(total, 3), size: Math.min(total, 3), state: createPartition(total) }; });
  const adjustLine = (next: LineConfig) => { setLineConfig(next); setLineState(createLine(next.min)); };
  const adjustChange = (initial: number, changes: number[]) => {
    let count = initial;
    if (changes.some(delta => { count += delta; return count < 0 || count > 30; })) { setChangeError('每一步的数量要在 0 到 30 之间，换一个数量试试。'); return; }
    setChangeProblem({ initial, changes }); setChangeState(createChange(initial)); setChangeError('');
  };
  const partitionSay = partitionMode === 'hidden' ? '看整体和露出来的部分，想一想盒子里有几个，写下数量就会自动核对。' : partitionMode === 'original' ? '点拿走的圆片，把它们逐个放回来，再写下原来的数量。' : partitionMode === 'changes' ? '按事情发生的顺序，点圆片加入或拿走。先做完一次，再做下一次。' : TOOLS.find(item => item.id === tool)!.say;
  const choiceModes = <T extends string,>(items: { id: T; label: string }[], selected: T, select: (mode: T) => void, label: string) => <div className="tools-mode-choices" role="group" aria-label={label}>{items.map(item => <button type="button" key={item.id} aria-pressed={item.id === selected} onClick={() => { if (item.id !== selected) select(item.id); }}>{item.label}</button>)}</div>;

  const lineSay = lineMode === 'count' ? `请从 ${lineConfig.min} 开始，每次加 ${lineConfig.step}，按顺序点到 ${lineConfig.max}。点过的位置会亮起来。` : lineMode === 'jump' ? `现在在 ${lineState.position}。点左右箭头，每次往右加 ${lineConfig.step}，往左减 ${lineConfig.step}，看看最后停在哪个数。` : lineMode === 'between' ? '请先点一个端点，再点另一个端点。看看两个端点之间有几个位置，两端自己不算在里面。' : '点一节车厢或一个刻度，看看它的前后刻度，再比较走到两端各要几步。';
  const groupSay = groupMode === 'size' ? `把 ${grouping.total} 个圆片按每组 ${grouping.size} 个来分。先点圆片，再点一组。不够分一整组的留在待分区。` : groupMode === 'array' ? `把 ${grouping.total} 个圆片排成 ${grouping.groups} 行，每行一样多。先点圆片，再点要放的行。` : `把 ${grouping.total} 个圆片平均分给 ${grouping.groups} 组，每组一样多。先点圆片，再点一组。不够再每组分一个的留在待分区。`;
  const current = TOOLS.find(item => item.id === tool)!;
  const from = params.get('from');
  const returnRoute = from && /^[a-z0-9-]+$/.test(from) ? `/math-course/${from}` : '/subject/math';
  const numberControl = (label: string, count: number, min: number, max: number, update: (count: number) => void) => <div className="tool-number-control"><span>{label}</span><button type="button" aria-label={`${label}减少一个`} disabled={count <= min} onClick={() => update(count - 1)}>−</button><b>{count}</b><button type="button" aria-label={`${label}增加一个`} disabled={count >= max} onClick={() => update(count + 1)}>＋</button></div>;
  const startProblem = (next: ArithmeticProblem) => {
    if (next.operator === '-' && next.second > next.first) { setError('先试试拿走的数量不超过原来数量的题。'); return; }
    setProblem(next); setDraft({ first: String(next.first), second: String(next.second), operator: next.operator }); setValue(createPlaceValue(next.first)); setError('');
  };
  return <main className="page math-tools-page" ref={root}>
    <header className="tools-page-head"><BackButton aria-label={from ? '回到教材任务' : '返回数学目录'} onClick={() => nav(returnRoute)} /><div><span>摆一摆，发现数学</span><h1>数学教具箱</h1></div><p>选一件教具，摆出你的问题</p></header>
    <div className="tools-workspace"><nav className="tools-selector" role="tablist" aria-label="选择数学教具">{TOOLS.map(item => <button key={item.id} type="button" role="tab" id={`tool-tab-${item.id}`} aria-controls="tool-workbench" aria-selected={tool === item.id} onClick={() => setTool(item.id)}><i aria-hidden="true"><ToolIllustration kind={item.id} /></i><span><b>{item.title}</b><small>{item.detail}</small></span></button>)}</nav>
      <section className={`tools-workbench tools-workbench-${tool}${tool === 'partition' ? ` tools-partition-${partitionMode}` : ''}`} role="tabpanel" id="tool-workbench" aria-labelledby={`tool-tab-${tool}`} data-math-narration-key={`${tool}:${tool === 'partition' ? partitionMode : tool === 'line' ? lineMode : tool === 'group' ? groupMode : ''}`} data-tool-instruction={tool === 'partition' ? partitionSay : tool === 'line' ? lineSay : tool === 'group' ? groupSay : current.say}><header><div><small>{current.detail}</small><h2>{current.title}</h2></div><span className="tools-workbench-caption">摆一摆 · 看变化</span><CourseReplayButton label="再听操作方法" disabled={narration.disabled} playbackOwner={narration.playbackOwner} onClick={narration.replay} /></header>
        {tool === 'pair' && <><div className="tools-controls">{numberControl('圆片数量', compare.left, 0, 20, left => setCompare({ ...compare, left, pairs: [] }))}{numberControl('方块数量', compare.right, 0, 20, right => setCompare({ ...compare, right, pairs: [] }))}</div><PairingBoard tiled key={`${compare.left}:${compare.right}`} left={compare.left} right={compare.right} leftName="圆片" rightName="方块" leftGlyph={<MathObjectGlyph kind="disc" />} rightGlyph={<MathObjectGlyph kind="block" />} pairs={compare.pairs} onChange={pairs => setCompare({ ...compare, pairs })} showDifference /></>}
        {tool === 'partition' && <>{choiceModes([{ id: 'free', label: '自由分合' }, { id: 'hidden', label: '藏了几个' }, { id: 'original', label: '原来几个' }, { id: 'changes', label: '连续变化' }], partitionMode, mode => { setPartitionMode(mode); const known = Math.min(relation.known, mode === 'hidden' ? relation.whole : 10); if (known !== relation.known) { setRelation({ ...relation, known }); resetRelation(); } }, '分合问题类型')}{partitionMode === 'free' && <><div className="tools-controls">{numberControl('一共几个', partition.total, 1, 20, total => setPartition({ ...partition, total, state: createPartition(total) }))}{numberControl('几个篮子', partition.groups, 2, 4, groups => setPartition({ ...partition, groups, state: createPartition(partition.total) }))}</div><PartitionBoard key={`${partition.total}:${partition.groups}`} state={partition.state} onChange={state => setPartition({ ...partition, state })} groupNames={Array.from({ length: partition.groups }, (_, index) => `第 ${index + 1} 个篮子`)} glyph={<MathObjectGlyph kind="disc" />} tokenName="圆片" focusGroups showEquations /></>}
          {(partitionMode === 'hidden' || partitionMode === 'original') && <><div className="tools-controls">{numberControl(partitionMode === 'hidden' ? '整体' : '剩下的', relation.whole, 1, 20, whole => { setRelation({ whole, known: partitionMode === 'hidden' ? Math.min(relation.known, whole) : relation.known }); resetRelation(); })}{numberControl(partitionMode === 'hidden' ? '看得到' : '拿走的', relation.known, 0, partitionMode === 'hidden' ? relation.whole : 10, known => { setRelation({ ...relation, known }); resetRelation(); })}</div><MissingPartBoard key={`${partitionMode}:${relation.whole}:${relation.known}`} whole={relation.whole} known={relation.known} mode={partitionMode} answer={missingAnswers[partitionMode]} onAnswerChange={answer => setMissingAnswers(values => ({ ...values, [partitionMode]: answer }))} moved={partitionMode === 'original' ? originalMoved : undefined} onMove={partitionMode === 'original' ? setOriginalMoved : undefined} /></>}
          {partitionMode === 'changes' && <><div className="tools-change-settings"><div className="tools-change-start">{numberControl('原来', changeProblem.initial, 0, 20, initial => adjustChange(initial, changeProblem.changes))}<div className="tools-example-choices"><button type="button" disabled={changeProblem.changes.length >= 4} onClick={() => { adjustChange(changeProblem.initial, [...changeProblem.changes, 1]); setChangeEditing(changeProblem.changes.length); }}>增加一步</button><button type="button" disabled={changeProblem.changes.length <= 2} onClick={() => adjustChange(changeProblem.initial, changeProblem.changes.slice(0, -1))}>减少一步</button></div></div><div className="tools-change-editor"><div className="tools-mode-choices" role="group" aria-label="设置哪一次变化">{changeProblem.changes.map((delta, i) => <button type="button" key={i} aria-pressed={i === activeChange} onClick={() => setChangeEditing(i)}>第 {i + 1} 次 · {delta > 0 ? '＋' : '－'}{Math.abs(delta)}</button>)}</div><div className="tools-change-control">{numberControl('数量', Math.abs(changeProblem.changes[activeChange]), 1, 9, amount => adjustChange(changeProblem.initial, changeProblem.changes.map((n, j) => activeChange === j ? amount * Math.sign(n) : n)))}<button type="button" aria-label={`第 ${activeChange + 1} 次改为${changeProblem.changes[activeChange] > 0 ? '拿走' : '加入'}`} onClick={() => adjustChange(changeProblem.initial, changeProblem.changes.map((n, j) => activeChange === j ? -n : n))}>{changeProblem.changes[activeChange] > 0 ? '＋ 加入' : '－ 拿走'}</button></div></div></div>{changeError && <p role="alert">{changeError}</p>}<QuantityChangeBoard initial={changeProblem.initial} changes={changeProblem.changes} state={changeState} onChange={setChangeState} /></>}
        </>}
        {tool === 'ten' && <><div className="tools-controls">{numberControl('第一组', ten.first, 1, 9, first => setTen({ ...ten, first, moved: [] }))}{numberControl('第二组', ten.second, 1, 10, second => setTen({ ...ten, second, moved: [] }))}</div><TenFrameBoard first={ten.first} second={ten.second} moved={ten.moved} onChange={moved => setTen({ ...ten, moved })} /></>}
        {tool === 'line' && <>{choiceModes([{ id: 'explore', label: '相邻数和距离' }, { id: 'count', label: '按顺序走' }, { id: 'jump', label: '跳着做加减' }, { id: 'between', label: '数两端之间' }], lineMode, mode => { setLineMode(mode); setLineState(createLine(mode === 'count' ? lineConfig.min : lineState.position)); }, '数线操作方式')}<div className="tools-controls">{numberControl('左端', lineConfig.min, 0, lineConfig.max - 1, min => adjustLine({ ...lineConfig, min, step: 1 }))}{numberControl('右端', lineConfig.max, lineConfig.min + 1, 20, max => adjustLine({ ...lineConfig, max, step: 1 }))}<label className="tools-step-select">每步<select aria-label="数线间隔" value={lineConfig.step} onChange={event => adjustLine({ ...lineConfig, step: Number(event.target.value) })}>{[1, 2, 5].filter(n => (lineConfig.max - lineConfig.min) % n === 0).map(n => <option key={n} value={n}>{n}</option>)}</select></label><button type="button" aria-pressed={!train} onClick={() => setTrain(value => !value)}>{train ? '换成数线' : '换成车厢'}</button></div><NumberLineBoard compact key={`${lineConfig.min}:${lineConfig.max}:${lineConfig.step}:${lineMode}`} config={lineConfig} state={lineState} onChange={setLineState} mode={lineMode} train={train} /></>}
        {tool === 'group' && <>{choiceModes([{ id: 'share', label: '平均分' }, { id: 'size', label: '每组几个' }, { id: 'array', label: '排成行列' }], groupMode, mode => { setGroupMode(mode); setGrouping({ ...grouping, state: createPartition(grouping.total) }); }, '分组方式')}<div className="tools-controls">{numberControl('圆片总数', grouping.total, 2, 24, total => setGrouping({ ...grouping, total, groups: Math.min(grouping.groups, total), size: Math.min(grouping.size, total), state: createPartition(total) }))}{groupMode === 'size' ? numberControl('每组几个', grouping.size, 2, Math.min(grouping.total, 6), size => setGrouping({ ...grouping, size, state: createPartition(grouping.total) })) : numberControl(groupMode === 'array' ? '排成几行' : '平均分几组', grouping.groups, 2, Math.min(grouping.total, 6), groups => setGrouping({ ...grouping, groups, state: createPartition(grouping.total) }))}</div><GroupingBoard compact key={`${groupMode}:${grouping.total}:${grouping.groups}:${grouping.size}`} state={grouping.state} onChange={state => setGrouping({ ...grouping, state })} groups={groupMode === 'size' ? Math.floor(grouping.total / grouping.size) : grouping.groups} mode={groupMode} size={grouping.size} /></>}
        {tool === 'value' && <><form className="tools-arithmetic" onSubmit={event => { event.preventDefault(); if (!/^\d{1,2}$/.test(draft.first) || !/^\d{1,2}$/.test(draft.second)) { setError('写下两个 0 到 99 的数，再开始摆。'); return; } startProblem({ first: Number(draft.first), second: Number(draft.second), operator: draft.operator }); }}><label>原来有<input aria-label="第一个数" inputMode="numeric" maxLength={2} value={draft.first} onChange={event => setDraft({ ...draft, first: event.target.value.replace(/\D/g, '') })} /></label><div className="tools-operator"><button type="button" aria-label="加法" aria-pressed={draft.operator === '+'} onClick={() => setDraft({ ...draft, operator: '+' })}>＋</button><button type="button" aria-label="减法" aria-pressed={draft.operator === '-'} onClick={() => setDraft({ ...draft, operator: '-' })}>－</button></div><label>{draft.operator === '+' ? '再加入' : '拿走'}<input aria-label="第二个数" inputMode="numeric" maxLength={2} value={draft.second} onChange={event => setDraft({ ...draft, second: event.target.value.replace(/\D/g, '') })} /></label><button type="submit">开始摆</button></form>
          {error && <p role="alert">{error}</p>}<div className="tools-example-choices"><span>试一试</span><button type="button" onClick={() => startProblem({ first: 27, second: 8, operator: '+' })}>27＋8</button><button type="button" onClick={() => startProblem({ first: 32, second: 7, operator: '-' })}>32－7</button></div><h3 className="tools-active-problem">正在探索：{problem.first}{problem.operator === '+' ? '＋' : '－'}{problem.second}</h3><PlaceValueBoard state={value} onChange={setValue} problem={problem} /><div className="tools-repeat"><button type="button" onClick={() => setValue(createPlaceValue(problem.first))}>再做一次</button></div></>}
      </section>
    </div>
  </main>;
}
