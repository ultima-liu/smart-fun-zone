import { act, createElement as h, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import MathNumberOrder, { mathNumberOrderChoices } from '../components/MathNumberOrder';

vi.mock('../speech', () => ({ playSfx: vi.fn() }));
const values = [10, 11, 12, 13, 14, 15];
let host: HTMLDivElement, root: Root;
const saved = vi.fn();
function Harness({ initial = 0 }: { initial?: number }) {
  const [progress, setProgress] = useState(initial);
  return h(MathNumberOrder, { values, progress, seed: 'order-twenty:primary-order', onCoach: vi.fn(), onProgress: step => { saved(step); setProgress(step); } });
}
const cards = () => [...host.querySelectorAll<HTMLButtonElement>('.mt-tool-options button')];
const order = () => cards().map(b => Number(b.textContent));
async function click(value: number) { await act(async () => cards().find(b => Number(b.textContent) === value)!.click()); }
async function restart() { await act(async () => [...host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === '再做一次')!.click()); }
beforeEach(() => {
  vi.clearAllMocks(); host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

it('洗牌不丢数字，也不会排成正序或倒序，同种子稳定', () => {
  for (let seed = 0; seed < 80; seed++) {
    const shuffled = mathNumberOrderChoices(values, String(seed));
    expect([...shuffled].sort((a, b) => a - b)).toEqual(values);
    expect(shuffled).not.toEqual(values); expect(shuffled).not.toEqual([...values].reverse());
    expect(shuffled).toEqual(mathNumberOrderChoices(values, String(seed)));
  }
});
it('错序不推进，正确点击期间排列稳定；完成保留结果，重做恢复点击且不改完成记录', async () => {
  await act(async () => root.render(h(Harness)));
  const first = order(); await click(15); expect(saved).not.toHaveBeenCalled();
  for (const value of values) { await click(value); expect(order()).toEqual(first); }
  expect(saved).toHaveBeenLastCalledWith(6);
  expect(cards().every(b => b.disabled)).toBe(true);
  expect(host.textContent).toContain('顺序完成');
  await restart(); expect(cards().every(b => !b.disabled)).toBe(true); expect(order()).not.toEqual(first);
  for (const value of values) await click(value);
  expect(saved).toHaveBeenCalledTimes(6);
  expect(host.querySelectorAll('.mt-order-target .done')).toHaveLength(6);
  await restart(); expect(cards().every(b => !b.disabled)).toBe(true);
});
it('恢复历史完成时也提供重做入口，重做一半不写入旧快照', async () => {
  await act(async () => root.render(h(Harness, { initial: 6 })));
  await restart(); await click(10); await click(11);
  expect(host.querySelectorAll('.mt-order-target .done')).toHaveLength(2);
  expect(saved).not.toHaveBeenCalled();
  await act(async () => root.render(h(Harness, { key: 'reload', initial: 6 })));
  expect(host.querySelectorAll('.mt-order-target .done')).toHaveLength(6);
  await restart(); expect(cards().every(b => !b.disabled)).toBe(true);
});
