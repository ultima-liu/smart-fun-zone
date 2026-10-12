import { act, createElement, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { chineseNarrationLeaf, chineseNarrationText, useChineseTabNarration } from '../chineseTabNarration';
import { playChineseReadingAudio, stopChineseReadingAudio } from '../chineseReadingAudio';
import { useStore } from '../store';
vi.mock('../chineseReadingAudio', () => ({ playChineseReadingAudio: vi.fn(() => Promise.resolve(true)), stopChineseReadingAudio: vi.fn() }));
const markup = '<section role="tabpanel"><h3>父任务</h3><div id="first" role="tabpanel" data-chinese-narration="读句子，选出相关的信息。"><div class="ct-study-options"><button>先认真检查</button><button>先观察画面</button><button>只猜答案</button></div><p role="status">答案反馈</p></div><div id="second" role="tabpanel" hidden><h3>用自己的话说</h3><label>自己的想法<textarea>孩子保存的回答</textarea></label></div></section>';
let host: HTMLDivElement, root: Root;
function Harness() { const ref = useRef<HTMLDivElement>(null); const narration = useChineseTabNarration(ref, 'chinese:2'); return createElement('div', null, createElement('button', { onClick: narration.replay }, '再听一遍'), createElement('div', { ref, dangerouslySetInnerHTML: { __html: markup } })); }
async function settle() { await act(async () => { await Promise.resolve(); }); await act(async () => { vi.advanceTimersByTime(300); }); }
beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); useStore.setState({ sound: true, voiceOn: true }); Object.defineProperty(navigator, 'userActivation', { configurable: true, value: { hasBeenActive: true } }); host = document.createElement('div'); document.body.append(host); root = createRoot(host); (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); });
it('只朗读当前最子级的题目和屏幕顺序中的所有选项', () => { host.innerHTML = markup; const leaf = chineseNarrationLeaf(host)!; expect(leaf.id).toBe('first'); const text = chineseNarrationText(leaf); expect(text).toContain('选项一，先认真检查；选项二，先观察画面；选项三，只猜答案'); for (const ignored of ['父任务', '答案反馈', '孩子保存的回答', '用自己的话说']) expect(text).not.toContain(ignored); });
it('填写要求在自动朗读中，保存的孩子回答和朗读按钮不在其中', () => { host.innerHTML = '<section role="tabpanel"><h3>说说理由<button>听说明</button></h3><label>自己的想法<textarea>已经保存的回答</textarea><button>语音输入</button></label></section>'; const text = chineseNarrationText(chineseNarrationLeaf(host)!); expect(text).toContain('填写要求：自己的想法'); for (const ignored of ['已经保存的回答', '听说明', '语音输入']) expect(text).not.toContain(ignored); });
it('听音选择开场和题目重播只读说明，不提前读取答案选项', () => {
 host.innerHTML = '<section data-chinese-leaf data-chinese-narration-mode="instructions-only" data-chinese-narration="先听词语，再选择。"><div class="ct-practice-actions"><button>天</button><button>地</button></div><div class="ct-pinyin-choices"><button>bā</button><button>pā</button></div></section>';
 expect(chineseNarrationText(chineseNarrationLeaf(host)!)).toBe('先听词语，再选择。');
});
it('进入、切换、返回及手动重播各朗读一次，反馈与输入不触发重读', async () => {
 await act(async () => root.render(createElement(Harness))); await settle(); expect(playChineseReadingAudio).toHaveBeenCalledTimes(1);
 host.querySelector('[role="status"]')!.textContent = '已完成'; host.querySelector('textarea')!.value = '新的想法'; await settle(); expect(playChineseReadingAudio).toHaveBeenCalledTimes(1);
 await act(async () => { host.querySelector<HTMLElement>('#first')!.hidden = true; host.querySelector<HTMLElement>('#second')!.hidden = false; }); await settle(); expect(playChineseReadingAudio).toHaveBeenCalledTimes(2);
 await act(async () => { host.querySelector<HTMLElement>('#second')!.hidden = true; host.querySelector<HTMLElement>('#first')!.hidden = false; }); await settle(); expect(playChineseReadingAudio).toHaveBeenCalledTimes(3);
 await act(async () => host.querySelector<HTMLButtonElement>('button')!.click()); expect(playChineseReadingAudio).toHaveBeenCalledTimes(4); expect(stopChineseReadingAudio).toHaveBeenCalled();
});
it('同一内容页换题按子题编号重读，声音关闭时停止自动朗读', async () => { await act(async () => root.render(createElement(Harness))); await settle(); vi.mocked(playChineseReadingAudio).mockClear(); const leaf = host.querySelector<HTMLElement>('#first')!; leaf.dataset.chineseNarration = '新问题'; leaf.dataset.chineseNarrationKey = '2'; await settle(); expect(playChineseReadingAudio).toHaveBeenCalledTimes(1); await act(async () => useStore.setState({ sound: false })); await settle(); expect(stopChineseReadingAudio).toHaveBeenCalled(); leaf.dataset.chineseNarrationKey = '3'; await settle(); expect(playChineseReadingAudio).toHaveBeenCalledTimes(1); });
it('纯讲解直接使用完整讲解脚本，不附加隐藏选项或重播按钮',()=>{host.innerHTML='<section data-lesson-explanation="方法、例子、口诀"><button>再听</button><div class="ct-study-options"><button>隐藏题</button></div></section>';expect(chineseNarrationText(host.firstElementChild as HTMLElement)).toBe('方法、例子、口诀');});

it('点读生字卡和词语卡不是答案选项，不自动逐张读出', () => {
 host.innerHTML = '<section role="tabpanel"><p>逐个点读，观察字形。</p><div class="ct-recognize-grid"><button><b>天</b><span>tiān</span></button><button><b>地</b><span>dì</span></button></div></section>';
 expect(chineseNarrationText(chineseNarrationLeaf(host)!)).toBe('逐个点读，观察字形。');
});
