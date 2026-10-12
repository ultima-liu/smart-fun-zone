import { act, createElement, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mathNarrationLeaf, mathNarrationText, useMathTabNarration } from '../mathTabNarration';
import { speakOnce, stopSpeaking } from '../speech';
import { useStore } from '../store';

vi.mock('../speech', () => ({ speakOnce: vi.fn(), stopSpeaking: vi.fn() }));
const markup = `<section role="tabpanel"><h3>外层任务</h3><div class="math-task-board-pages">
 <article id="first" data-complete="false" aria-label="比较数量"><h4>杯子和盖子，哪组更多？</h4><div class="math-answer-choices"><button>杯子</button><button>盖子</button><button>同样多</button></div><p role="status">答案反馈</p></article>
 <article id="second" data-complete="false" hidden><h4>一共有几个？</h4><label>写出你的答案<input aria-label="独立答案" value="99" /></label></article>
 </div></section>`;
let host: HTMLDivElement, root: Root;
function Harness({ scope = 'compare:1' }: { scope?: string }) {
 const ref = useRef<HTMLDivElement>(null);
 const narration = useMathTabNarration(ref, scope);
 return createElement('div', null, createElement('button', { onClick: narration.replay, disabled: narration.disabled }, '再听一遍'), createElement('div', { ref, dangerouslySetInnerHTML: { __html: markup } }));
}
async function settle() { await act(async () => { await Promise.resolve(); }); await act(async () => { vi.advanceTimersByTime(300); }); }
async function mount(scope?: string) { await act(async () => { root.render(createElement(Harness, { scope })); }); await settle(); }
async function select(id: 'first' | 'second') { await act(async () => { host.querySelector<HTMLElement>('#first')!.hidden = id !== 'first'; host.querySelector<HTMLElement>('#second')!.hidden = id !== 'second'; }); await settle(); }

beforeEach(() => {
 vi.useFakeTimers(); vi.clearAllMocks();
 useStore.setState({ sound: true, voiceOn: true });
 Object.defineProperty(navigator, 'userActivation', { configurable: true, value: { hasBeenActive: true } });
 host = document.createElement('div'); document.body.append(host); root = createRoot(host);
 (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); });

describe('数学最子级任务朗读', () => {
 it('只有材料名称或算式时，补上所属任务的操作要求', () => {
  for (const caption of ['数轴轨道', '1＋4＝5', '部分：5、1；整体：6']) {
   host.innerHTML = `<section class="mt-textbook-task"><header><h3>请选择对应的算式</h3></header><div class="math-task-board-pages"><article data-complete="false"><b>${caption}</b><button>操作</button></article><article data-complete="false" hidden><b>兄弟题</b></article></div></section>`;
   const text = mathNarrationText(mathNarrationLeaf(host)!);
   expect(text).toContain('请选择对应的算式'); expect(text).toContain(caption); expect(text).not.toContain('兄弟题');
  }
 });
 it('火车卡明确的专属要求优先，顺序卡不读编号选项', () => {
  host.innerHTML = '<article data-math-narration="请从10号开始，按编号点到20号车厢。"><b>车厢</b><button>10</button><button>11</button></article>';
  expect(mathNarrationText(host.firstElementChild as HTMLElement)).toBe('请从10号开始，按编号点到20号车厢。');
 });
 it('连续变化只描述故事时补读当前动作，不读隐藏下一步', () => {
  host.innerHTML = '<section class="mt-textbook-task"><header><h3>车上原有7人，先下去2人，又上来3人</h3></header><div class="math-task-board-pages"><article data-complete="false"><b>先下去2人</b><button>让2人下车</button></article><article data-complete="false" hidden><button>让3人上车</button></article></div></section>';
  const text = mathNarrationText(mathNarrationLeaf(host)!);
  expect(text).toContain('请点击“让2人下车”'); expect(text).not.toContain('让3人上车');
 });
 it('顺序点击只读操作要求，不枚举数字卡；普通判断题仍读选项', () => {
  host.innerHTML = '<section role="tabpanel"><h3>按顺序点亮10到15</h3><div class="mt-tool-options" data-math-narration-options="skip"><button>12</button><button>10</button><button>15</button></div></section>';
  const text = mathNarrationText(mathNarrationLeaf(host)!);
  expect(text).toContain('按顺序点亮10到15'); expect(text).not.toContain('答案选项'); expect(text).not.toContain('选项1');
  host.innerHTML = markup;
  expect(mathNarrationText(mathNarrationLeaf(host)!)).toContain('答案选项');
 });
 it('只读可见最子级的题目和全部选项，不读父任务、隐藏兄弟或反馈', () => {
  host.innerHTML = markup;
  const leaf = mathNarrationLeaf(host)!;
  expect(leaf.id).toBe('first');
  const text = mathNarrationText(leaf);
  expect(text).toContain('杯子和盖子，哪组更多？');
  expect(text).toContain('选项1，杯子；选项2，盖子；选项3，同样多');
  for (const ignored of ['外层任务', '一共有几个', '答案反馈', '99']) expect(text).not.toContain(ignored);
 });
 it('恢复填写记录后，朗读要求不包含文本框中的孩子回答', () => {
  host.innerHTML = '<section role="tabpanel"><h3>说出你的想法</h3><label>我的想法<textarea>保存过的孩子回答</textarea><button>语音输入</button></label></section>';
  const text = mathNarrationText(mathNarrationLeaf(host)!);
  expect(text).toContain('填写要求：我的想法'); expect(text).not.toContain('保存过的孩子回答'); expect(text).not.toContain('语音输入');
 });
 it('只有操作材料的最子级卡继承所属题目，不读相邻任务', () => {
  host.innerHTML = '<section class="mt-textbook-task"><header><h3>只标出两人之间的读者</h3></header><div class="math-task-board-pages"><article data-complete="false"><div class="mt-reading-queue"><button>端点 10</button><button>第 11 人</button></div></article><article data-complete="false" hidden><h4>其他问题</h4></article></div></section>';
  const text = mathNarrationText(mathNarrationLeaf(host)!);
  expect(text).toContain('只标出两人之间的读者'); expect(text).toContain('第 11 人'); expect(text).not.toContain('其他问题');
 });
 it('进入、切换和返回任务各读一次，重播可再次读；作答与完成不重复触发', async () => {
  await mount(); expect(speakOnce).toHaveBeenCalledTimes(1);
  host.querySelector('input')!.value = '12';
  host.querySelector('#first')!.setAttribute('data-complete', 'true');
  host.querySelector('[role="status"]')!.textContent = '已完成';
  await settle(); expect(speakOnce).toHaveBeenCalledTimes(1);
  await select('second'); expect(speakOnce).toHaveBeenCalledTimes(2);
  const text = vi.mocked(speakOnce).mock.calls[1][0];
  expect(text).toContain('填写要求：写出你的答案'); expect(text).not.toContain('12');
  await select('first'); expect(speakOnce).toHaveBeenCalledTimes(3);
  await act(async () => host.querySelector<HTMLButtonElement>('button')!.click());
  await settle(); expect(speakOnce).toHaveBeenCalledTimes(4);
 });
 it('快速切换取消旧任务待播，离开页面取消剩余朗读', async () => {
  await act(async () => { root.render(createElement(Harness)); });
  await act(async () => { host.querySelector<HTMLElement>('#first')!.hidden = true; host.querySelector<HTMLElement>('#second')!.hidden = false; });
  await settle(); expect(speakOnce).toHaveBeenCalledTimes(1);
  expect(vi.mocked(speakOnce).mock.calls[0][0]).toContain('一共有几个');
  await act(async () => { root.render(null); }); await settle();
  expect(speakOnce).toHaveBeenCalledTimes(1); expect(stopSpeaking).toHaveBeenCalled();
 });
 it('声音关闭不自动播放；首次浏览器交互后读当前任务一次', async () => {
  useStore.setState({ sound: false }); await mount(); expect(speakOnce).not.toHaveBeenCalled();
  Object.defineProperty(navigator, 'userActivation', { configurable: true, value: { hasBeenActive: false } });
  await act(async () => { useStore.setState({ sound: true }); }); await settle(); expect(speakOnce).not.toHaveBeenCalled();
  await act(async () => { window.dispatchEvent(new Event('pointerdown')); }); await settle();
  expect(speakOnce).toHaveBeenCalledTimes(1);
 });
 it('检测换题读新题，输入和提示不触发重读', async () => {
  await mount(); vi.mocked(speakOnce).mockClear();
  const first = host.querySelector<HTMLElement>('#first')!;
  first.dataset.mathNarration = '新题。填写要求：写出完整算式。';
  first.dataset.mathNarrationKey = 'checkpoint:1';
  await settle(); expect(speakOnce).toHaveBeenCalledTimes(1);
  expect(vi.mocked(speakOnce).mock.calls[0][0]).toBe(first.dataset.mathNarration);
  first.querySelector('[role="status"]')!.textContent = '提示文字';
  await settle(); expect(speakOnce).toHaveBeenCalledTimes(1);
 });
});

it('纯讲解脚本优先，方法、例子和口诀完整播放，不读控制按钮', () => {
 const leaf = document.createElement('section'); leaf.dataset.lessonExplanation = '完整方法。例子。口诀。';
 leaf.innerHTML = '<div class="mt-knowledge-story"><p>完整方法</p><button>再听一次</button></div>';
 expect(mathNarrationText(leaf)).toBe(leaf.dataset.lessonExplanation);
});
