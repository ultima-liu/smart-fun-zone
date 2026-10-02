import { afterEach, describe, expect, it } from 'vitest';
import { useStore } from '../store';
import type { PointEntry } from '../points';

const original = useStore.getState();
const childId = 'wallet-regression';
const entry = (id: string, amount: number, time: number): PointEntry => ({ id, amount, time, reason: '钱包回归', childId });
afterEach(() => useStore.setState(original, true));

describe('完整云端钱包同步', () => {
  it('超过 800 条历史时使用完整余额，保留最新补币记录', () => {
    const history = Array.from({ length: 1200 }, (_, i) => entry(`old-${i}`, i < 600 ? 2 : -1, i));
    const credit = entry('account-credit', 500, 2000);
    const all = [credit, ...history.reverse()];
    useStore.setState({ points: { [childId]: 0 }, pointLog: { [childId]: all.slice(1, 601) } });
    const wallet = { balance: 1100, sourceIds: all.map((row) => row.id) };
    useStore.getState().applyCloudPoints(childId, all.slice(0, 800), [], wallet);
    expect(useStore.getState().points[childId]).toBe(1100);
    expect(useStore.getState().pointLog[childId]).toHaveLength(600);
    expect(useStore.getState().pointLog[childId][0].id).toBe('account-credit');
    useStore.getState().applyCloudPoints(childId, all.slice(0, 800), [], wallet);
    expect(useStore.getState().points[childId]).toBe(1100);
  });

  it('云端已知的旧流水不重复计入，未同步的本地奖励和消费保持可用', () => {
    const older = entry('older-synced-row', 200, 1);
    const pending = [entry('offline-reward', 20, 4), entry('offline-purchase', -5, 3)];
    useStore.setState({ points: { [childId]: 215 }, pointLog: { [childId]: [...pending, older] } });
    const incoming = [entry('remote-credit', 500, 2)];
    useStore.getState().applyCloudPoints(childId, incoming, [], { balance: 700, sourceIds: [older.id, incoming[0].id] });
    expect(useStore.getState().points[childId]).toBe(715);
    useStore.getState().applyCloudPoints(childId, [...incoming, ...pending], [], { balance: 715, sourceIds: [older.id, incoming[0].id, ...pending.map((row) => row.id)] });
    expect(useStore.getState().points[childId]).toBe(715);
  });

  it('兼容旧服务端，增量入账保留现有余额且去重', () => {
    useStore.setState({ points: { [childId]: 200 }, pointLog: { [childId]: [] } });
    const incoming = [entry('legacy-server-reward', 20, 1)];
    useStore.getState().applyCloudPoints(childId, incoming, []);
    useStore.getState().applyCloudPoints(childId, incoming, []);
    expect(useStore.getState().points[childId]).toBe(220);
  });
});
