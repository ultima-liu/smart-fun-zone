import { act, createElement as h, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { useMathPracticeAttempt, usePracticeAttempt } from '../usePracticeAttempt';

let host: HTMLDivElement, root: Root;
function Harness({ initialSaved }: { initialSaved: number }) {
  const [saved, save] = useState(initialSaved);
  const [index, next, complete, restart] = usePracticeAttempt(saved, save, 0, value => value >= 2);
  return h('div', { 'data-saved': saved, 'data-index': index, 'data-complete': complete },
    h('button', { onClick: () => next(value => value + 1) }, '答题'),
    h('button', { onClick: restart }, '重做'));
}
beforeEach(() => {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
async function click(index = 0) { await act(async () => host.querySelectorAll('button')[index].click()); }

it('未完成时保存断点，首次完成后重做和再次完成均保留已验证的进度', async () => {
  await act(async () => root.render(h(Harness, { initialSaved: 0 })));
  await click(); expect(host.firstElementChild?.getAttribute('data-saved')).toBe('1');
  await click(); expect(host.firstElementChild?.getAttribute('data-saved')).toBe('2');
  expect(host.firstElementChild?.getAttribute('data-index')).toBe('0');
  await click(); await click(1); await click(); await click();
  expect(host.firstElementChild?.getAttribute('data-saved')).toBe('2');
  expect(host.firstElementChild?.getAttribute('data-complete')).toBe('true');
  expect(host.firstElementChild?.getAttribute('data-index')).toBe('0');
});

it('恢复已完成记录直接显示原题，重做一半再挂载仍保持已完成', async () => {
  await act(async () => root.render(h(Harness, { initialSaved: 2 })));
  await click();
  expect(host.firstElementChild?.getAttribute('data-index')).toBe('1');
  expect(host.firstElementChild?.getAttribute('data-saved')).toBe('2');
  await act(async () => root.render(h(Harness, { key: 'reload', initialSaved: 2 })));
  expect(host.firstElementChild?.getAttribute('data-index')).toBe('0');
  expect(host.firstElementChild?.getAttribute('data-complete')).toBe('true');
});

function MathHarness({ initialSaved }: { initialSaved: number }) {
  const [saved, save] = useState(initialSaved);
  const [index, next, complete, restart, roundComplete] = useMathPracticeAttempt(saved, save, 0, value => value >= 2);
  return h('div', { 'data-saved': saved, 'data-index': index, 'data-complete': complete, 'data-round-complete': roundComplete },
    h('button', { onClick: () => next(value => value + 1) }, '答题'),
    h('button', { onClick: restart }, '重做'));
}

it('数学首次完成和重做完成都保持终点，重复点击不会循环，历史进度保留', async () => {
  await act(async () => root.render(h(MathHarness, { initialSaved: 0 })));
  await click(); await click(); await click();
  expect(host.firstElementChild?.getAttribute('data-index')).toBe('2');
  await click(1);
  expect(host.firstElementChild?.getAttribute('data-round-complete')).toBe('false');
  expect(host.firstElementChild?.getAttribute('data-complete')).toBe('true');
  await click(); await click(); await click();
  expect(host.firstElementChild?.getAttribute('data-index')).toBe('2');
  expect(host.firstElementChild?.getAttribute('data-saved')).toBe('2');
  expect(host.firstElementChild?.getAttribute('data-round-complete')).toBe('true');
});

it('数学恢复完成记录保持终点，只有明确重做才返回起点', async () => {
  await act(async () => root.render(h(MathHarness, { initialSaved: 2 })));
  expect(host.firstElementChild?.getAttribute('data-index')).toBe('2');
  await click();
  expect(host.firstElementChild?.getAttribute('data-index')).toBe('2');
  await click(1);
  expect(host.firstElementChild?.getAttribute('data-index')).toBe('0');
});
