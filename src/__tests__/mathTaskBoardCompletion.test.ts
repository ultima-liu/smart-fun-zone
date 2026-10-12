import { act, createElement as h } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MathTaskBoardDeck, MathTaskCard } from '../components/MathTaskBoardDeck';

let host: HTMLDivElement, root: Root;
const report = vi.fn();
beforeEach(() => {
  vi.useFakeTimers(); report.mockClear();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); });
async function render(states: boolean[]) {
  await act(async () => root.render(h(MathTaskBoardDeck, { onCompleteChange: report, children: null },
    ...states.map((complete, index) => h(MathTaskCard, { key: index, complete, 'aria-label': `任务 ${index + 1}` }, `任务 ${index + 1}`)),
    h(MathTaskCard, { key: 'reflection', 'aria-label': '可选记录' }, '可选记录'))));
}

it('父任务汇总所有有完成条件的卡片，隐藏卡也不能跳过，改错后重新阻止完成', async () => {
  await render([false, false, false]); expect(report).toHaveBeenLastCalledWith(false);
  await render([true, false, false]); expect(report).toHaveBeenLastCalledWith(false);
  await render([true, true, false]); expect(report).toHaveBeenLastCalledWith(false);
  expect(host.querySelectorAll('[hidden][data-complete="false"]')).toHaveLength(2);
  await render([true, true, true]); expect(report).toHaveBeenLastCalledWith(true);
  await render([true, false, true]); expect(report).toHaveBeenLastCalledWith(false);
});

it('嵌套任务卡不会和外层兄弟混合，内层全对也不能替代外层完成条件', async () => {
  const innerReport = vi.fn();
  async function nested(parentComplete: boolean) {
    await act(async () => root.render(h(MathTaskBoardDeck, { onCompleteChange: report, children: null },
      h(MathTaskCard, { key: 'first', complete: true, 'aria-label': '主操作' }),
      h(MathTaskCard, { key: 'second', complete: parentComplete, 'aria-label': '读写板' },
        h(MathTaskBoardDeck, { onCompleteChange: innerReport, children: null },
          h(MathTaskCard, { complete: true, 'aria-label': '写数字' }),
          h(MathTaskCard, { complete: true, 'aria-label': '组成判断' }))))));
  }
  await nested(false);
  expect(innerReport).toHaveBeenLastCalledWith(true);
  expect(report).toHaveBeenLastCalledWith(false);
  expect(host.querySelector('.math-task-board-deck')?.getAttribute('data-count')).toBe('2');
  await nested(true); expect(report).toHaveBeenLastCalledWith(true);
});

it('历史完成回看不跳页，重做三步后用本轮完成推进并保留历史勾选', async () => {
  async function round(advanceComplete: boolean) {
    await act(async () => root.render(h(MathTaskBoardDeck, { onCompleteChange: report, children: null },
      h(MathTaskCard, { key: 'train', complete: true, advanceComplete, 'aria-label': '火车三步' }),
      h(MathTaskCard, { key: 'next', complete: false, 'aria-label': '相邻数' }))));
  }
  const active = () => host.querySelector('.math-task-board-tabs button.active')?.textContent;
  await round(true);
  await act(async () => vi.advanceTimersByTime(1000));
  expect(active()).toContain('火车三步');
  await round(false);
  expect(host.querySelector('section')?.getAttribute('data-complete')).toBe('true');
  expect(host.querySelector('.math-task-board-tabs button.done')).not.toBeNull();
  await act(async () => vi.advanceTimersByTime(1000));
  expect(active()).toContain('火车三步');
  await round(true);
  await act(async () => vi.advanceTimersByTime(800));
  expect(active()).toContain('相邻数');
  expect(report).toHaveBeenLastCalledWith(false);
});

it('卡组向父阶段分别报告历史完成和本轮完成，重做不会清掉历史勾选', async () => {
  const roundReport = vi.fn();
  async function update(advanceComplete: boolean) {
    await act(async () => root.render(h(MathTaskBoardDeck, { onCompleteChange: report, onRoundCompleteChange: roundReport, children: null },
      h(MathTaskCard, { complete: true, advanceComplete, 'aria-label': '最后一个任务' }))));
  }
  await update(true);
  expect(report).toHaveBeenLastCalledWith(true);
  expect(roundReport).toHaveBeenLastCalledWith(true);
  await update(false);
  expect(report).toHaveBeenLastCalledWith(true);
  expect(roundReport).toHaveBeenLastCalledWith(false);
  await update(true);
  expect(roundReport).toHaveBeenLastCalledWith(true);
});
