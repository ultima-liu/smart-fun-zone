import { describe, expect, it } from 'vitest';
import { intervalFacts, selectLineEndpoint, applyChangeUnit, changeFacts, createChange, createLine, groupingFacts, lineNumbers, moveOnLine, undoChange, undoLine, arithmeticComplete, changePlaceValue, comparisonFacts, connectPair, createPartition, createPlaceValue, movePartition, partitionFacts, representedValue, transferTenFrame, undoPartition, undoPlaceValue } from '../mathManipulatives';

describe('reusable mathematics', () => {
  it('pairs in any order without reusing either object, including an empty side', () => {
    const first = connectPair([], 2, 0, 3, 4);
    expect(connectPair(first, 2, 1, 3, 4)).toBe(first);
    expect(connectPair(first, 1, 0, 3, 4)).toBe(first);
    expect(connectPair(first, 3, 1, 3, 4)).toBe(first);
    const pairs = connectPair(connectPair(first, 0, 3, 3, 4), 1, 1, 3, 4);
    expect(comparisonFacts(3, 4, pairs)).toMatchObject({ complete: true, leftRemaining: 0, rightRemaining: 1, relation: '<' });
    expect(comparisonFacts(0, 3, [])).toMatchObject({ complete: true, leftRemaining: 0, rightRemaining: 3 });
  });

  it('conserves the whole across arbitrary groups, transfers, returns and undo', () => {
    let state = createPartition(12);
    for (let id = 0; id < 12; id++) state = movePartition(state, id, id % 3, 3);
    expect(partitionFacts(state, 3)).toMatchObject({ total: 12, counts: [4, 4, 4], remaining: 0, complete: true });
    const before = state;
    state = movePartition(state, 0, 1, 3);
    expect(partitionFacts(state, 3).counts).toEqual([3, 5, 4]);
    expect(undoPartition(state).positions).toEqual(before.positions);
    state = movePartition(state, 0, -1, 3);
    const facts = partitionFacts(state, 3);
    expect(facts.counts.reduce((sum, n) => sum + n, facts.remaining)).toBe(12);
    expect(facts.complete).toBe(false);
    expect(movePartition(state, 0, 3, 3)).toBe(state);
  });

  it('ten-frame transfers keep token identity and can reverse an overfill', () => {
    let moved: number[] = [];
    for (const id of [4, 0, 3]) moved = transferTenFrame(moved, id, 5);
    expect(moved).toEqual([4, 0, 3]);
    moved = transferTenFrame(moved, 0, 5);
    expect(moved).toEqual([4, 3]);
    expect(transferTenFrame(moved, 5, 5)).toBe(moved);
  });

  it('every legal exchange preserves quantity, and undo restores the full operation state', () => {
    for (let value = 0; value <= 199; value++) {
      const initial = createPlaceValue(value);
      for (const action of ['split-ten', 'split-hundred'] as const) {
        const changed = changePlaceValue(initial, action);
        expect(representedValue(changed)).toBe(value);
        if (changed !== initial) expect(undoPlaceValue(changed)).toEqual(initial);
      }
    }
    let state = changePlaceValue(createPlaceValue(99), 'add', 99);
    expect(arithmeticComplete(state, { first: 99, second: 99, operator: '+' })).toBe(false);
    state = changePlaceValue(changePlaceValue(state, 'bundle-ones'), 'bundle-tens');
    expect(state).toMatchObject({ hundreds: 1, tens: 9, ones: 8, added: 99, exchanges: 2 });
    expect(arithmeticComplete(state, { first: 99, second: 99, operator: '+' })).toBe(true);
  });

  it('carrying and borrowing require real operations and retain a valid retry path', () => {
    const addProblem = { first: 27, second: 8, operator: '+' as const };
    let sum = changePlaceValue(createPlaceValue(27), 'add', 8);
    expect(sum).toMatchObject({ tens: 2, ones: 15 });
    expect(arithmeticComplete(sum, addProblem)).toBe(false);
    sum = changePlaceValue(sum, 'bundle-ones');
    expect(arithmeticComplete(sum, addProblem)).toBe(true);
    expect(arithmeticComplete(undoPlaceValue(sum), addProblem)).toBe(false);
    const subtractProblem = { first: 32, second: 7, operator: '-' as const };
    let difference = createPlaceValue(32);
    difference = changePlaceValue(difference, 'split-ten');
    for (let i = 0; i < 7; i++) difference = changePlaceValue(difference, 'remove-one');
    expect(difference).toMatchObject({ tens: 2, ones: 5, removed: 7 });
    expect(arithmeticComplete(difference, subtractProblem)).toBe(true);
    expect(representedValue(undoPlaceValue(difference))).toBe(26);
    expect(changePlaceValue(createPlaceValue(0), 'remove-one')).toEqual(createPlaceValue(0));
  });
});


describe('number lines, grouping and change sequences', () => {
  it('validates equal intervals, boundaries and counting order with a reversible path', () => {
    const config = { min: 10, max: 20, step: 2 };
    expect(lineNumbers(config)).toEqual([10, 12, 14, 16, 18, 20]);
    expect(lineNumbers({ ...config, step: 3 })).toEqual([]);
    expect(lineNumbers({ ...config, max: 100, step: 1 })).toEqual([]);
    let state = createLine(10);
    expect(moveOnLine(state, config, 12, true)).toBe(state);
    for (const target of lineNumbers(config)) state = moveOnLine(state, config, target, true);
    expect(state.visited).toHaveLength(6);
    expect(moveOnLine(state, config, 20, true)).toBe(state);
    expect(undoLine(state).visited).toEqual([10, 12, 14, 16, 18]);
    expect(moveOnLine(state, config, 22)).toBe(state);
  });
  it('counts interior points separately from steps and excludes both endpoints', () => {
    const config = { min: 10, max: 20, step: 1 };
    let state = selectLineEndpoint(createLine(10), config, 10);
    expect(state.visited).toEqual([10]);
    state = selectLineEndpoint(state, config, 15);
    expect(intervalFacts(config, state.visited)).toEqual({ distance: 5, steps: 5, inside: [11, 12, 13, 14] });
    expect(intervalFacts(config, [14, 13])?.inside).toEqual([]);
    expect(intervalFacts({ min: 10, max: 20, step: 2 }, [10, 16])).toEqual({ distance: 6, steps: 3, inside: [12, 14] });
    expect(undoLine(state).visited).toEqual([10]);
  });
  it('distinguishes fair sharing, fixed-size groups and unassigned remainder', () => {
    let state = createPartition(7);
    for (let i = 0; i < 6; i++) state = movePartition(state, i, i % 3, 3);
    expect(groupingFacts(state, 3)).toMatchObject({ fair: true, size: 2, remainder: 1, remaining: 1 });
    expect(groupingFacts(movePartition(state, 6, 0, 3), 3).fair).toBe(false);
    state = createPartition(7);
    for (let i = 0; i < 6; i++) state = movePartition(state, i, Math.floor(i / 3), 2);
    expect(groupingFacts(state, 2, 3)).toMatchObject({ fair: true, size: 3, remainder: 1 });
    state = movePartition(state, 0, 1, 2);
    expect(groupingFacts(state, 2, 3).fair).toBe(false);
    expect(groupingFacts(undoPartition(state), 2, 3).fair).toBe(true);
  });
  it('retains intermediate quantities and reverses both partial and completed changes', () => {
    for (const [initial, changes, expected] of [[5, [2, 1], [5, 7, 8]], [8, [-2, -3], [8, 6, 3]], [4, [3, -2], [4, 7, 5]], [7, [-2, 3], [7, 5, 8]]] as const) {
      let state = createChange(initial);
      const deltas = [...changes];
      for (let i = 0; i < deltas.reduce((n, delta) => n + Math.abs(delta), 0); i++) state = applyChangeUnit(state, deltas);
      expect(state.counts).toEqual(expected);
      expect(changeFacts(state, deltas).complete).toBe(true);
      expect(applyChangeUnit(state, deltas)).toBe(state);
      const undone = undoChange(state, deltas);
      expect(changeFacts(undone, deltas).complete).toBe(false);
      expect(applyChangeUnit(undone, deltas)).toEqual(state);
      while (state.counts.length > 1 || state.progress) state = undoChange(state, deltas);
      expect(state).toEqual(createChange(initial));
    }
    expect(applyChangeUnit(createChange(0), [-1])).toEqual(createChange(0));
    expect(applyChangeUnit(createChange(30), [1])).toEqual(createChange(30));
  });
});
