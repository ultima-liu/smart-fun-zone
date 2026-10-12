import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { useActivityAdvance } from '../useActivityAdvance';
let host: HTMLDivElement, root: Root;
const select = vi.fn();
function Harness({ completed, repaint = 0 }: { completed: boolean[]; repaint?: number }) { const [selected, setSelected] = useState(0); useActivityAdvance('task', completed, selected, index => { select(index); setSelected(index); }); return createElement('div', { 'data-selected': selected }, repaint); }
async function render(completed: boolean[], repaint = 0) { await act(async () => root.render(createElement(Harness, { completed, repaint }))); }
beforeEach(() => { vi.useFakeTimers(); select.mockClear(); host = document.createElement('div'); document.body.append(host); root = createRoot(host); (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); });
it('完成一个子任务只能进入下一个未完成子任务，不能跳过其他子任务', async () => { await render([false,false,false]); await render([true,false,false]); await act(async () => vi.advanceTimersByTime(800)); expect(select).toHaveBeenLastCalledWith(1); await render([true,true,false]); await act(async () => vi.advanceTimersByTime(800)); expect(select).toHaveBeenLastCalledWith(2); await render([true,true,true]); await act(async () => vi.advanceTimersByTime(800)); expect(select).toHaveBeenCalledTimes(2); });
it('恢复已完成任务不会自动跳页，普通重绘不会取消新完成的推进', async () => { await render([true,false,false]); await act(async () => vi.advanceTimersByTime(800)); expect(select).not.toHaveBeenCalled(); await render([false,false,false]); await render([true,false,false]); await act(async () => vi.advanceTimersByTime(200)); await render([true,false,false],1); await act(async () => vi.advanceTimersByTime(600)); expect(select).toHaveBeenLastCalledWith(1); });
it('在延迟期间撤销完成会取消推进', async () => { await render([false,false]); await render([true,false]); await render([false,false]); await act(async () => vi.advanceTimersByTime(1000)); expect(select).not.toHaveBeenCalled(); });
it('刚完成后立刻重做会取消待执行的跳转', async () => {
 await render([false,false]); await render([true,false]);
 const repeat = document.createElement('button'); repeat.dataset.practiceRestart = ''; document.body.append(repeat);
 await act(async () => { repeat.click(); vi.advanceTimersByTime(1000); });
 expect(select).not.toHaveBeenCalled(); repeat.remove();
});

it('其他任务完成状态在反馈延迟中变化，不会取消当前任务的自动推进', async () => {
 await render([false,false,false]); await render([true,false,false]);
 await act(async () => vi.advanceTimersByTime(300));
 await render([true,false,true]);
 await act(async () => vi.advanceTimersByTime(450));
 expect(select).toHaveBeenCalledExactlyOnceWith(1);
});
