/** Reusable mathematics only. Course gates and persistence belong to the caller. */
export type Pair = { left: number; right: number };

export function connectPair(pairs: Pair[], left: number, right: number, leftCount: number, rightCount: number): Pair[] {
  if (!Number.isInteger(left) || !Number.isInteger(right) || left < 0 || right < 0 || left >= leftCount || right >= rightCount || pairs.some(pair => pair.left === left || pair.right === right)) return pairs;
  return [...pairs, { left, right }];
}

export function comparisonFacts(left: number, right: number, pairs: Pair[]) {
  return { relation: left === right ? '=' : left > right ? '>' : '<', leftRemaining: left - pairs.length, rightRemaining: right - pairs.length, paired: pairs.length, complete: pairs.length === Math.min(left, right) };
}

export type PartitionState = { positions: number[]; history: number[][] };
export const createPartition = (total: number): PartitionState => ({ positions: Array.from({ length: total }, () => -1), history: [] });
export function movePartition(state: PartitionState, token: number, group: number, groups: number): PartitionState {
  if (!Number.isInteger(token) || !Number.isInteger(group) || token < 0 || token >= state.positions.length || group < -1 || group >= groups || state.positions[token] === group) return state;
  return { positions: state.positions.map((position, index) => index === token ? group : position), history: [...state.history, state.positions] };
}
export function undoPartition(state: PartitionState): PartitionState {
  return state.history.length ? { positions: state.history[state.history.length - 1], history: state.history.slice(0, -1) } : state;
}
export function partitionFacts(state: PartitionState, groups: number) {
  const counts = Array.from({ length: groups }, (_, group) => state.positions.filter(position => position === group).length);
  const remaining = state.positions.filter(position => position === -1).length;
  return { total: state.positions.length, counts, remaining, complete: remaining === 0 };
}

export function transferTenFrame(moved: number[], token: number, sourceCount: number): number[] {
  if (!Number.isInteger(token) || token < 0 || token >= sourceCount) return moved;
  return moved.includes(token) ? moved.filter(item => item !== token) : [...moved, token];
}

export type ValueSnapshot = { hundreds: number; tens: number; ones: number; added: number; removed: number; exchanges: number };
export type PlaceValueState = ValueSnapshot & { history: ValueSnapshot[] };
export type ValueAction = 'bundle-ones' | 'split-ten' | 'bundle-tens' | 'split-hundred' | 'add' | 'remove-one' | 'remove-ten';
export type ArithmeticProblem = { first: number; second: number; operator: '+' | '-' };
export function createPlaceValue(number: number): PlaceValueState {
  return { hundreds: Math.floor(number / 100), tens: Math.floor(number / 10) % 10, ones: number % 10, added: 0, removed: 0, exchanges: 0, history: [] };
}
export const representedValue = (state: ValueSnapshot) => state.hundreds * 100 + state.tens * 10 + state.ones;
export function changePlaceValue(state: PlaceValueState, action: ValueAction, amount = 1): PlaceValueState {
  const { history, ...before } = state;
  const next = { ...before };
  switch (action) {
    case 'bundle-ones': if (next.ones < 10) return state; next.ones -= 10; next.tens++; next.exchanges++; break;
    case 'split-ten': if (!next.tens) return state; next.tens--; next.ones += 10; next.exchanges++; break;
    case 'bundle-tens': if (next.tens < 10) return state; next.tens -= 10; next.hundreds++; next.exchanges++; break;
    case 'split-hundred': if (!next.hundreds) return state; next.hundreds--; next.tens += 10; next.exchanges++; break;
    case 'add': if (!Number.isInteger(amount) || amount < 1 || representedValue(state) + amount > 199) return state; next.tens += Math.floor(amount / 10); next.ones += amount % 10; next.added += amount; break;
    case 'remove-one': if (!next.ones) return state; next.ones--; next.removed++; break;
    case 'remove-ten': if (!next.tens) return state; next.tens--; next.removed += 10; break;
  }
  return { ...next, history: [...history, before] };
}
export function undoPlaceValue(state: PlaceValueState): PlaceValueState {
  return state.history.length ? { ...state.history[state.history.length - 1], history: state.history.slice(0, -1) } : state;
}
export function arithmeticComplete(state: PlaceValueState, problem: ArithmeticProblem): boolean {
  const changed = problem.operator === '+' ? state.added === problem.second : state.removed === problem.second;
  const answer = problem.operator === '+' ? problem.first + problem.second : problem.first - problem.second;
  return changed && state.ones < 10 && state.tens < 10 && representedValue(state) === answer;
}

export type LineConfig = { min: number; max: number; step: number };
export type LineState = { position: number; visited: number[]; history: { position: number; visited: number[] }[] };
export function lineNumbers(config: LineConfig): number[] {
  const { min, max, step } = config;
  if (![min, max, step].every(Number.isInteger) || min < 0 || max > 100 || max <= min || step < 1 || (max - min) % step || (max - min) / step > 20) return [];
  return Array.from({ length: (max - min) / step + 1 }, (_, i) => min + i * step);
}
export const createLine = (start: number): LineState => ({ position: start, visited: [], history: [] });
export function moveOnLine(state: LineState, config: LineConfig, target: number, counting = false): LineState {
  const numbers = lineNumbers(config);
  if (!numbers.includes(target) || (counting && target !== numbers[state.visited.length]) || (!counting && target === state.position)) return state;
  const { history, ...before } = state;
  return { position: target, visited: [...state.visited, target], history: [...history, before] };
}
export const undoLine = (state: LineState): LineState => state.history.length ? { ...state.history[state.history.length - 1], history: state.history.slice(0, -1) } : state;
export function selectLineEndpoint(state: LineState, config: LineConfig, target: number): LineState {
  if (!lineNumbers(config).includes(target) || (state.visited.length === 1 && state.visited[0] === target)) return state;
  const { history, ...before } = state;
  return { position: target, visited: state.visited.length === 1 ? [...state.visited, target] : [target], history: [...history, before] };
}
export function intervalFacts(config: LineConfig, ends: number[]) {
  const numbers = lineNumbers(config);
  if (ends.length !== 2 || ends[0] === ends[1] || ends.some(end => !numbers.includes(end))) return null;
  const low = Math.min(...ends), high = Math.max(...ends);
  return { distance: high - low, steps: (high - low) / config.step, inside: numbers.filter(number => number > low && number < high) };
}
export function groupingFacts(state: PartitionState, groups: number, fixedSize?: number) {
  const facts = partitionFacts(state, groups);
  const size = fixedSize ?? Math.floor(state.positions.length / groups);
  const remainder = facts.total - groups * size;
  return { ...facts, size, remainder, fair: remainder >= 0 && remainder < (fixedSize ?? groups) && facts.remaining === remainder && facts.counts.every(count => count === size) };
}
export type ChangeState = { counts: number[]; progress: number };
export const createChange = (initial: number): ChangeState => ({ counts: [initial], progress: 0 });
export function changeFacts(state: ChangeState, changes: number[]) {
  const stage = state.counts.length - 1;
  const delta = changes[stage] ?? 0;
  return { stage, delta, current: state.counts[stage] + Math.sign(delta) * state.progress, remaining: Math.abs(delta) - state.progress, complete: stage === changes.length };
}
export function applyChangeUnit(state: ChangeState, changes: number[]): ChangeState {
  const facts = changeFacts(state, changes);
  if (facts.complete || !Number.isInteger(facts.delta) || facts.delta === 0 || facts.current + Math.sign(facts.delta) < 0 || facts.current + Math.sign(facts.delta) > 30) return state;
  const progress = state.progress + 1;
  return progress === Math.abs(facts.delta) ? { counts: [...state.counts, facts.current + Math.sign(facts.delta)], progress: 0 } : { ...state, progress };
}
export function undoChange(state: ChangeState, changes: number[]): ChangeState {
  if (state.progress) return { ...state, progress: state.progress - 1 };
  if (state.counts.length < 2) return state;
  return { counts: state.counts.slice(0, -1), progress: Math.abs(changes[state.counts.length - 2]) - 1 };
}
