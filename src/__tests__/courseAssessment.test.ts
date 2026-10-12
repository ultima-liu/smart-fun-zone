import { act, createElement as h } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AutomaticCourseCheck from '../components/AutomaticCourseCheck';
import { checkCourse, type CourseAssessmentRequest } from '../courseAssessment';
import { recordChineseEvidence, readChineseEvidence } from '../chineseLearning';
import { recordEnglishEvidence, readEnglishEvidence } from '../englishLearning';
import { recordMathEvidence, readMathEvidence } from '../mathLearning';

const task: CourseAssessmentRequest={subject:'数学',lessonId:'plus-nine',taskId:'reason',prompt:'说明9＋3的凑十过程',criteria:['解释剩余部分'],requirement:'answer',answer:'9凑十还剩2，一共12。'};
const report=(met=true)=>({verdict:'pass' as const,feedback:'解释数量关系。',checks:[{met,feedback:'核对剩余部分。'}]});
let host:HTMLDivElement, root:Root;
beforeEach(()=>{host=document.createElement('div');document.body.append(host);root=createRoot(host);localStorage.clear();(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();vi.useRealTimers();});
const advance=async()=>{await act(async()=>{await vi.advanceTimersByTimeAsync(1800);});};

it('客户端也拒绝逐项结果不全或口头 pass 但标准未达到',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({ok:true,result:report(false)}))));
  expect((await checkCourse(task,new AbortController().signal)).verdict).toBe('retry');
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({ok:true,result:{...report(),checks:[]}}))));
  await expect(checkCourse(task,new AbortController().signal)).rejects.toThrow('完整检查结果');
});
it('原答案自动检查，失败可重试，通过后没有手动确认区',async()=>{
  vi.useFakeTimers();
  const onPass=vi.fn(); let success=false;
  vi.stubGlobal('fetch',vi.fn(async()=>success?new Response(JSON.stringify({ok:true,result:report()})):new Response(JSON.stringify({ok:false,error:'暂时不可用'}),{status:503})));
  await act(async()=>root.render(h(AutomaticCourseCheck,{...task,onPass})));
  expect(host.querySelectorAll('textarea')).toHaveLength(0);
  expect(host.querySelectorAll('details')).toHaveLength(0);
  expect(host.textContent).not.toMatch(/AI 检查标准|补充说明|录音交给 AI|请 AI 确认/);
  await advance();expect(onPass).not.toHaveBeenCalled();expect(host.textContent).toContain('暂时不可用');
  success=true;
  await act(async()=>{(Array.from(host.querySelectorAll('button')).find(button=>button.textContent==='再试一次') as HTMLButtonElement).click();});
  expect(onPass).toHaveBeenCalledOnce();expect(host.textContent).toContain('完成了');
});
it('更换作答或退出页面后，迟到的通过结果不记录完成',async()=>{
  vi.useFakeTimers();
  let resolve!: (response:Response)=>void; const onPass=vi.fn();
  vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(done=>{resolve=done;})));
  await act(async()=>root.render(h(AutomaticCourseCheck,{...task,onPass})));
  await advance();
  await act(async()=>root.render(h(AutomaticCourseCheck,{...task,answer:'改过的理由',onPass})));
  await act(async()=>resolve(new Response(JSON.stringify({ok:true,result:report()}))));
  expect(onPass).not.toHaveBeenCalled();
  await advance();await act(async()=>root.render(h('div')));
  await act(async()=>resolve(new Response(JSON.stringify({ok:true,result:report()}))));expect(onPass).not.toHaveBeenCalled();
});
it('示范随实际答案一起提交；示范变更会取消旧判题并重新检查',async()=>{
  vi.useFakeTimers();const onPass=vi.fn();
  const responses:Array<(response:Response)=>void>=[];
  const fetch=vi.fn((_url,init)=>{
    const body=JSON.parse(String(init.body));
    expect(body.answer).toBe(task.answer);
    expect(body.exampleAnswer).toBe(responses.length===0?'页面示范':'更新后的示范');
    return new Promise<Response>(resolve=>responses.push(resolve));
  });
  vi.stubGlobal('fetch',fetch);
  await act(async()=>root.render(h(AutomaticCourseCheck,{...task,exampleAnswer:'页面示范',onPass})));
  await advance();expect(fetch).toHaveBeenCalledTimes(1);
  await act(async()=>root.render(h(AutomaticCourseCheck,{...task,exampleAnswer:'更新后的示范',onPass})));
  await act(async()=>responses[0](new Response(JSON.stringify({ok:true,result:report()}))));
  expect(onPass).not.toHaveBeenCalled();
  await advance();expect(fetch).toHaveBeenCalledTimes(2);
  await act(async()=>responses[1](new Response(JSON.stringify({ok:true,result:report()}))));
  expect(onPass).toHaveBeenCalledOnce();
});
it('朗读不能靠文字声明自动完成，无重复说明或录音提交按钮',async()=>{
  vi.useFakeTimers();const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
  await act(async()=>root.render(h(AutomaticCourseCheck,{...task,requirement:'audio',answer:'我已经做了',onPass:vi.fn()})));
  await advance();expect(fetch).not.toHaveBeenCalled();
  expect(host.querySelectorAll('textarea')).toHaveLength(0);
  expect(host.querySelector('input[type=file]')).toBeNull();
  expect(host.textContent).toContain('我来说');
  expect(host.textContent).not.toMatch(/补充说明|录音交给 AI|请 AI 确认/);
});
it('隐藏任务不自动检查，切换时取消旧结果，回到任务后继续检查',async()=>{
  vi.useFakeTimers(); const onPass=vi.fn(); const responses:Array<(response:Response)=>void>=[];
  const fetch=vi.fn(()=>new Promise<Response>(resolve=>responses.push(resolve))); vi.stubGlobal('fetch',fetch);
  const render=(hidden:boolean)=>h('section',{hidden},h(AutomaticCourseCheck,{...task,onPass}));
  await act(async()=>root.render(render(true)));
  await advance();expect(fetch).not.toHaveBeenCalled();
  await act(async()=>root.render(render(false)));
  await advance();expect(fetch).toHaveBeenCalledTimes(1);
  await act(async()=>root.render(render(true)));
  await act(async()=>responses[0](new Response(JSON.stringify({ok:true,result:report()}))));
  expect(onPass).not.toHaveBeenCalled();
  await act(async()=>root.render(render(false)));
  await advance();expect(fetch).toHaveBeenCalledTimes(2);
  await act(async()=>responses[1](new Response(JSON.stringify({ok:true,result:report()}))));
  expect(onPass).toHaveBeenCalledOnce();
});
it('没有原作答框时只显示一个输入入口，标准不会展示给孩子',async()=>{
  await act(async()=>root.render(h(AutomaticCourseCheck,{...task,answer:undefined,onPass:vi.fn()})));
  expect(host.querySelectorAll('textarea')).toHaveLength(1);
  expect(host.querySelectorAll('details')).toHaveLength(0);
  expect(host.textContent).not.toContain('解释剩余部分');
});
it('切换任务后，旧麦克风授权失败不覆盖新题反馈',async()=>{
  let reject!: (error: Error) => void;
  const devices = { getUserMedia: vi.fn(() => new Promise((_resolve, fail) => { reject = fail; })) };
  vi.stubGlobal('navigator', { mediaDevices: devices }); vi.stubGlobal('MediaRecorder', class {});
  await act(async()=>root.render(h(AutomaticCourseCheck,{...task,requirement:'audio',onPass:vi.fn()})));
  await act(async()=>{ (Array.from(host.querySelectorAll('button')).find(button=>button.textContent==='🎤 我来说') as HTMLButtonElement).click(); });
  await act(async()=>root.render(h(AutomaticCourseCheck,{...task,taskId:'another-task',prompt:'新题',requirement:'audio',onPass:vi.fn()})));
  await act(async()=>reject(new Error('上一题麦克风授权失败')));
  expect(host.textContent).not.toContain('上一题麦克风');
});
it('三科 AI 来源可读取并保留旧记录的真实来源',()=>{
  recordChineseEvidence('child',{lessonId:'lesson',taskId:'oral',skill:'expression',level:'independent',source:'ai',context:'lesson',note:'AI检查实际回答'});
  recordEnglishEvidence('child',{lessonId:'lesson',taskId:'oral',skill:'expression',level:'supported',source:'ai',context:'lesson',note:'AI检查实际录音'});
  recordMathEvidence('child',{lessonId:'lesson',taskId:'reason',objective:'理由',level:'independent',source:'ai',context:'reason',note:'AI检查数学关系'});
  recordChineseEvidence('child',{lessonId:'lesson',taskId:'old',skill:'expression',level:'practiced',source:'self',context:'lesson',note:'旧练习'});
  expect(readChineseEvidence('child').map(row=>row.source)).toEqual(['ai','self']);
  expect(readEnglishEvidence('child')[0].source).toBe('ai');expect(readMathEvidence('child')[0].source).toBe('ai');
});
