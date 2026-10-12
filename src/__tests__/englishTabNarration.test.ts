import {expect,it} from 'vitest';
import {englishNarrationLeaf,englishNarrationText} from '../englishTabNarration';
it('只读最子级材料及屏幕顺序的全部选项，不读反馈和孩子答案',()=>{
 const root=document.createElement('div');root.innerHTML='<section role="tabpanel"><h3>父任务</h3><div role="tabpanel" data-english-narration="What is this?"><div data-english-options><button>A cat</button><button>A dog</button><button>A bird</button></div><p role="status">正确答案是猫</p><label>写出你的答案<input value="孩子的答案" placeholder="填写单词"></label><label>关系／分组<select><option>长辈</option><option>同辈</option></select></label></div><div role="tabpanel" hidden><h3>隐藏任务</h3></div></section>';
 const leaf=englishNarrationLeaf(root)!;const text=englishNarrationText(leaf);expect(text).toContain('What is this?');expect(text).toContain('选项1，A cat；选项2，A dog；选项3，A bird');expect(text).toContain('填写要求：写出你的答案，填写单词');expect(text).toContain('填写要求：关系／分组');for(const ignored of ['父任务','隐藏任务','正确答案是猫','孩子的答案','长辈','同辈'])expect(text).not.toContain(ignored);
});
it('独立拼读不自动给出新词示范或纯音位',()=>{
 const root=document.createElement('section');root.dataset.englishNarration='用学过的声音，试着读这个新词。';root.innerHTML='<strong>cat</strong><div class="en-blend-sounds"><span>/k/</span><span>/æ/</span></div>';expect(englishNarrationText(root)).toBe('用学过的声音，试着读这个新词。');
});
it('辨音只朗读要求，禁用或已开放的选项、看词提示都不进入自动播报',()=>{
 const root=document.createElement('section');root.dataset.englishNarrationMode='instructions-only';root.dataset.englishNarration='听完整词，选出开头对应的字母。';
 root.innerHTML='<p>cat. can</p><div class="en-phonics-choices"><button disabled>c</button><button>a</button><button>d</button></div><p role="status">再听一次</p>';
 expect(englishNarrationText(root)).toBe('听完整词，选出开头对应的字母。');
 root.querySelector('button')!.disabled=false;
 expect(englishNarrationText(root)).toBe('听完整词，选出开头对应的字母。');
});
it('占格纯讲解使用完整规则，不漏掉 span 中的规则说明',()=>{const root=document.createElement('section');root.dataset.lessonExplanation='短小写住中格。高个向上伸，尾巴向下垂。';root.innerHTML='<h3>占格规则</h3><span>高个向上伸</span><button>重播</button>';expect(englishNarrationText(root)).toBe(root.dataset.lessonExplanation);});
