import { act, createElement as h } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../courseAssessment', () => ({ recordingToWav: vi.fn(async (blob: Blob) => blob), blobDataUrl: vi.fn(async () => 'data:audio/wav;base64,YXVkaW8=') }));
import SpeechReadingCheck from '../components/SpeechReadingCheck';
import StudyBuddy from '../components/StudyBuddy';
import { useStore } from '../store';

class Recognition {
  static sessions: Recognition[] = [];
  lang = ''; continuous = false; interimResults = false;
  onstart: (() => void) | null = null; onaudiostart: (() => void) | null = null;
  onresult: ((event: any) => void) | null = null; onend: (() => void) | null = null; onerror: ((event: any) => void) | null = null;
  input?: MediaStreamTrack;
  abort = vi.fn(); stop = vi.fn(); start(track?: MediaStreamTrack) { this.input = track; Recognition.sessions.push(this); }
  say(text: string) { this.onresult?.({ results: [[{ transcript: text }]] }); this.onend?.(); }
}
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; Recognition.sessions = []; vi.stubGlobal('SpeechRecognition', Recognition);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });
async function start() { await act(async () => host.querySelector('button')!.click()); return Recognition.sessions[Recognition.sessions.length - 1]; }

it('读错可重读，匹配后自动确认一次，不调用大模型或上传文件', async () => {
  const onPass = vi.fn(), fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  await act(async () => root.render(h(SpeechReadingCheck, { target: '猫', language: 'zh-CN', onPass })));
  expect(host.querySelector('input[type=file]')).toBeNull();
  const wrong = await start(); await act(async () => wrong.say('狗'));
  expect(onPass).not.toHaveBeenCalled(); expect(host.textContent).toContain('再读一次');
  const right = await start(); expect(right.lang).toBe('zh-CN');
  await act(async () => right.onresult?.({ results: [Object.assign([{ transcript: '猫' }], { isFinal: false })] }));
  expect(onPass).not.toHaveBeenCalled();
  await act(async () => { right.onresult?.({ results: [[{ transcript: '猫' }]] }); right.say('猫'); });
  expect(onPass).toHaveBeenCalledOnce(); expect(fetch).not.toHaveBeenCalled();
});
it('新目标、隐藏活动及卸载后的迟到识别不会推进题目', async () => {
  const onPass = vi.fn();
  await act(async () => root.render(h(SpeechReadingCheck, { target: '猫', language: 'zh-CN', onPass })));
  const old = await start(), late = old.onresult!;
  await act(async () => root.render(h(SpeechReadingCheck, { target: '狗', language: 'zh-CN', onPass })));
  await act(async () => late({ results: [[{ transcript: '狗' }]] }));
  expect(onPass).not.toHaveBeenCalled(); expect(old.abort).toHaveBeenCalled();
  const hidden = await start(); await act(async () => { host.hidden = true; hidden.say('狗'); });
  expect(onPass).not.toHaveBeenCalled();
  host.hidden = false; const last = await start(), afterUnmount = last.onresult!;
  await act(async () => root.render(h('div')));
  await act(async () => afterUnmount({ results: [[{ transcript: '狗' }]] }));
  expect(onPass).not.toHaveBeenCalled();
});
it('权限失败、静音和超时保持待检查，不按录音时长通过', async () => {
  const onPass = vi.fn();
  await act(async () => root.render(h(SpeechReadingCheck, { target: '猫', language: 'zh-CN', onPass })));
  const denied = await start(); await act(async () => denied.onerror?.({ error: 'not-allowed' }));
  expect(host.textContent).toContain('允许麦克风'); expect(onPass).not.toHaveBeenCalled();
  const silent = await start(); await act(async () => silent.say(''));
  expect(host.textContent).toContain('没有收到识别文字'); expect(onPass).not.toHaveBeenCalled();
  vi.useFakeTimers(); const timed = await start();
  await act(async () => { vi.advanceTimersByTime(45_000); });
  expect(timed.abort).toHaveBeenCalled(); expect(host.textContent).toContain('超时'); expect(onPass).not.toHaveBeenCalled();
});

it('中文识别服务 start 不代表开始采集；等待 audiostart 后才提示孩子开口', async () => {
  const onPass = vi.fn();
  await act(async () => root.render(h(SpeechReadingCheck, { target: '爸爸', language: 'zh-CN', onPass })));
  const rec = await start();
  await act(async () => rec.onstart?.());
  expect(host.querySelector('button')!.disabled).toBe(true);
  expect(host.textContent).toContain('准备');
  await act(async () => rec.onaudiostart?.());
  expect(host.querySelector('button')!.disabled).toBe(false);
  expect(host.textContent).toContain('正在听');
  await act(async () => rec.say('better'));
  expect(host.textContent).toContain('听到：better');
  expect(onPass).not.toHaveBeenCalled();
});

it('前台中文跟读暂停后台唤醒，清掉唤醒重试定时器，结束后才恢复唤醒', async () => {
  vi.useFakeTimers();
  useStore.setState({ buddyWakeOn: true, buddyOpen: false, sound: false, voiceOn: false });
  const onPass = vi.fn();
  await act(async () => root.render(h('div', null, h(StudyBuddy), h(SpeechReadingCheck, { target: '爸爸', language: 'zh-CN', onPass }))));
  const wake = Recognition.sessions[0];
  expect(wake.lang).toBe('zh-CN');
  const staleEnd = wake.onend!;
  const button = host.querySelector<HTMLButtonElement>('.speech-reading-check button')!;
  await act(async () => button.click());
  const reading = Recognition.sessions[1];
  expect(reading.lang).toBe('zh-CN');
  expect(wake.abort).toHaveBeenCalledOnce();
  await act(async () => { staleEnd(); vi.advanceTimersByTime(2000); });
  expect(Recognition.sessions).toHaveLength(2);
  await act(async () => reading.say('爸爸'));
  expect(onPass).toHaveBeenCalledOnce();
  await act(async () => vi.advanceTimersByTime(400));
  expect(Recognition.sessions).toHaveLength(3);
  expect(Recognition.sessions[2].lang).toBe('zh-CN');
  await act(async () => root.render(h('div')));
  useStore.setState({ buddyWakeOn: false });
});

function microphone(getUserMedia: () => Promise<unknown>) {
  vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(() => {});
  vi.stubGlobal('navigator', { userAgent:'Mozilla/5.0 Chrome/153.0.0.0', mediaDevices: { getUserMedia } });
  const createObjectURL = vi.fn(() => 'blob:reading-test'), revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
  const recorded: unknown[] = [];
  vi.stubGlobal('MediaRecorder', class {
    state = 'inactive'; mimeType = 'audio/webm';
    ondataavailable?: (event: {data: Blob}) => void; onstop?: () => void;
    constructor(stream: unknown) { recorded.push(stream); }
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; queueMicrotask(() => { this.ondataavailable?.({ data:new Blob(['actual input'], {type:this.mimeType}) }); this.onstop?.(); }); }
  });
  return { createObjectURL, revokeObjectURL, recorded };
}

it('麦克风授权迟于切换题目返回时，关闭音轨，不启动旧识别会话', async () => {
  let resolve!: (stream: unknown) => void;
  microphone(() => new Promise(done => { resolve = done; }));
  const track = { kind:'audio', readyState:'live', label:'麦克风', stop:vi.fn() };
  const onPass = vi.fn();
  await act(async () => root.render(h(SpeechReadingCheck,{ target:'dad', onPass })));
  await act(async () => host.querySelector('button')!.click());
  await act(async () => root.render(h(SpeechReadingCheck,{ target:'cat', onPass })));
  await act(async () => resolve({getAudioTracks:()=>[track],getTracks:()=>[track]}));
  expect(track.stop).toHaveBeenCalledOnce(); expect(Recognition.sessions).toHaveLength(0); expect(onPass).not.toHaveBeenCalled();
});

it('麦克风授权失败不偷偷改走另一个收音来源', async () => {
  microphone(async () => { throw new DOMException('denied','NotAllowedError'); });
  const onPass = vi.fn();
  await act(async () => root.render(h(SpeechReadingCheck,{ target:'dad', onPass })));
  await start();
  expect(host.textContent).toContain('请允许麦克风'); expect(Recognition.sessions).toHaveLength(0); expect(onPass).not.toHaveBeenCalled();
});

function localMicrophone() {
  const track = {kind:'audio',readyState:'live',label:'外接麦克风',stop:vi.fn()};
  const recording = microphone(async () => ({getAudioTracks:()=>[track],getTracks:()=>[track]}));
  return {...recording,track};
}
async function finishReading() { await act(async () => host.querySelector<HTMLButtonElement>('.course-answer-voice button')!.click()); }
it('英语直接录音送专用识别，不调用 Chrome 识别或传递目标答案，错误原文不通过',async()=>{
  const mic=localMicrophone(),onPass=vi.fn();
  const fetch=vi.fn(async (_url: string, _options: RequestInit)=>({ok:true,json:async()=>({ok:true,text:'better',engine:'sense-voice'})}));vi.stubGlobal('fetch',fetch);
  await act(async()=>root.render(h(SpeechReadingCheck,{target:'dad',onPass})));
  await start(); expect(Recognition.sessions).toHaveLength(0);
  expect(mic.recorded).toHaveLength(1); await finishReading();
  expect(JSON.parse(String(fetch.mock.calls[0][1].body))).toEqual({language:'en-US',audio:'YXVkaW8='});
  expect(onPass).not.toHaveBeenCalled();expect(host.textContent).toContain('服务原文：better');
  expect(mic.track.stop).toHaveBeenCalledOnce();expect(host.querySelector('audio')?.src).toContain('blob:reading-test');
  fetch.mockImplementation(async()=>({ok:true,json:async()=>({ok:true,text:'dad',engine:'sense-voice'})}));
  await start();expect(mic.revokeObjectURL).toHaveBeenCalledWith('blob:reading-test');await finishReading();
  expect(onPass).toHaveBeenCalledOnce();
});
it('英语空识别和服务错误不会通过，也不退回 Chrome',async()=>{
  localMicrophone();const onPass=vi.fn();
  const fetch=vi.fn(async (_url: string, _options: RequestInit)=>({ok:true,json:async()=>({ok:true,text:'',engine:'sense-voice'})}));vi.stubGlobal('fetch',fetch);
  await act(async()=>root.render(h(SpeechReadingCheck,{target:'dad',onPass})));
  await start();await finishReading();expect(host.textContent).toContain('没有识别出文字');
  fetch.mockImplementation(async()=>({ok:false,json:async()=>({ok:false,text:'',engine:'sense-voice',error:'服务未就绪'})}));
  await start();await finishReading();expect(host.textContent).toContain('服务未就绪');
  expect(onPass).not.toHaveBeenCalled();expect(Recognition.sessions).toHaveLength(0);
});
it('英语换题后取消在途服务请求，迟到文字不会通过新题',async()=>{
  localMicrophone();let resolve!: (value: unknown)=>void;
  const fetch=vi.fn((_url: string,_options: RequestInit)=>new Promise(done=>{resolve=done;}));vi.stubGlobal('fetch',fetch);
  const onPass=vi.fn();await act(async()=>root.render(h(SpeechReadingCheck,{target:'dad',onPass})));
  await start();await finishReading();
  await act(async()=>root.render(h(SpeechReadingCheck,{target:'dog',onPass})));
  expect(fetch.mock.calls[0][1].signal?.aborted).toBe(true);
  await act(async()=>resolve({ok:true,json:async()=>({ok:true,text:'dog',engine:'sense-voice'})}));
  expect(onPass).not.toHaveBeenCalled();expect(host.textContent).not.toContain('听到：dog');
});

it('英语本地收音暂停中文后台唤醒，结束采集后恢复，不创建英文浏览器识别会话',async()=>{
  vi.useFakeTimers();localMicrophone();
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({ok:true,text:'dad',engine:'sense-voice'})})));
  useStore.setState({buddyWakeOn:true,buddyOpen:false,sound:false,voiceOn:false});
  const onPass=vi.fn();await act(async()=>root.render(h('div',null,h(StudyBuddy),h(SpeechReadingCheck,{target:'dad',onPass}))));
  const wake=Recognition.sessions[0],lateEnd=wake.onend!;expect(wake.lang).toBe('zh-CN');
  await act(async()=>host.querySelector<HTMLButtonElement>('.course-answer-voice button')!.click());
  expect(wake.abort).toHaveBeenCalledOnce();
  await act(async()=>{lateEnd();vi.advanceTimersByTime(2000);});expect(Recognition.sessions).toHaveLength(1);
  await finishReading();expect(onPass).toHaveBeenCalledOnce();
  await act(async()=>vi.advanceTimersByTime(400));
  expect(Recognition.sessions).toHaveLength(2);expect(Recognition.sessions[1].lang).toBe('zh-CN');
  await act(async()=>root.render(h('div')));useStore.setState({buddyWakeOn:false});
});
