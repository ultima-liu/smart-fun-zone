import { arithmeticComplete, changePlaceValue, representedValue, undoPlaceValue, type ArithmeticProblem, type PlaceValueState, type ValueAction } from '../../mathManipulatives';
import MathObjectGlyph, { MathStickBundle } from '../MathObjectGlyph';
import './math-tools.css';

const LABELS: Record<ValueAction, string> = {
  'bundle-ones': '捆成 1 个十', 'split-ten': '拆开 1 个十', 'bundle-tens': '合成 1 个百', 'split-hundred': '拆开 1 个百',
  add: '加入第二组', 'remove-one': '拿走 1 根', 'remove-ten': '拿走 1 捆',
};
export default function PlaceValueBoard({ state, onChange, problem, actions = ['bundle-ones', 'split-ten', 'bundle-tens', 'split-hundred'], locked = false }: {
  state: PlaceValueState; onChange: (state: PlaceValueState) => void; problem?: ArithmeticProblem; actions?: ValueAction[]; locked?: boolean;
}) {
  const complete = problem ? arithmeticComplete(state, problem) : false;
  const remaining = problem ? problem.second - (problem.operator === '+' ? state.added : state.removed) : 0;
  const relevantActions = actions.filter(action => !['bundle-tens', 'split-hundred'].includes(action) || state.hundreds > 0 || state.tens >= 10);
  const available = problem ? [...relevantActions, ...(problem.operator === '+' ? ['add' as const] : ['remove-one' as const, 'remove-ten' as const])] : relevantActions;
  const disabled = (action: ValueAction) => locked ||
    (action === 'bundle-ones' && state.ones < 10) || (action === 'split-ten' && !state.tens) ||
    (action === 'bundle-tens' && state.tens < 10) || (action === 'split-hundred' && !state.hundreds) ||
    (action === 'add' && remaining <= 0) || (action === 'remove-one' && (!state.ones || remaining < 1)) ||
    (action === 'remove-ten' && (!state.tens || remaining < 10));
  return <div className="math-tool place-value-tool" aria-label="数位小棒教具">
    {problem && <p className="tool-hint">{complete ? '操作完成！看看小棒和数位怎样对应。' : problem.operator === '+' ? remaining > 0 ? `先加入 ${problem.second} 根，再把满十的散棒捆起来。` : '散棒满 10 根可以捆成 1 个十；十位满 10 捆可以合成百。' : `还要拿走 ${remaining} 根。散棒不够时，拆开一捆再拿。`}</p>}
    <div className="tool-value-columns">{(['hundreds', 'tens', 'ones'] as const).filter(place => place !== 'hundreds' || state.hundreds > 0 || state.tens >= 10).map(place => <section key={place} className={`tool-value-place ${place}`}>
      <header><b>{place === 'ones' ? '个位 · 一根一根' : place === 'tens' ? '十位 · 一捆十根' : '百位 · 一板百根'}</b><strong>{state[place]}</strong></header>
      <div className="tool-value-materials">{Array.from({ length: state[place] }, (_, index) => <span key={index} className="tool-value-piece" role="img" aria-label={place === 'ones' ? '1 根小棒' : place === 'tens' ? '1 捆小棒，共 10 根' : '1 个百，共 100 根'}>{place === 'ones' ? <MathObjectGlyph kind="stick" narrow /> : place === 'tens' ? <MathStickBundle /> : <svg viewBox="0 0 100 100" aria-hidden="true"><rect x="2" y="2" width="96" height="96" rx="8" fill="#f6d399" stroke="#b6853e" />{Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${(i + 1) * 10} 3v94 M3 ${(i + 1) * 10}h94`} stroke="#b6853e" />)}</svg>}</span>)}</div>
    </section>)}</div>
    <p className="tool-relation">{state.hundreds > 0 && `${state.hundreds} 个百＋`}{state.tens} 个十＋{state.ones} 个一＝{representedValue(state)}{state.ones >= 10 || state.tens >= 10 ? '（还可以整理数位）' : ''}</p>
    <div className="tool-actions">{available.map(action => <button type="button" key={action} disabled={disabled(action)} onClick={() => onChange(changePlaceValue(state, action, action === 'add' ? remaining : 1))}>{action === 'add' && problem ? `加入 ${problem.second} 根` : LABELS[action]}</button>)}<button type="button" disabled={locked || !state.history.length} onClick={() => onChange(undoPlaceValue(state))}>撤销一步</button></div>
    {!problem && <p className="tool-hint">10 根换 1 捆，1 捆也能拆成 10 根；兑换前后总数不变。</p>}
    {complete && problem && <p className="tool-success">✓ {problem.first}{problem.operator === '+' ? '＋' : '－'}{problem.second}＝{representedValue(state)}</p>}
  </div>;
}
