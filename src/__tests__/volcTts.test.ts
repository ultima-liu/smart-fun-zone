import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = window as unknown as { __VOLC_TTS_ENABLED__?: boolean };
const audioResponse = () => new Response('data: {"code":0,"data":"SUQz"}\n\ndata: {"code":20000000}\n\n');

beforeEach(() => {
  vi.resetModules();
  delete runtime.__VOLC_TTS_ENABLED__;
  vi.stubGlobal('Audio', class {
    pause = vi.fn();
    play = vi.fn().mockResolvedValue(undefined);
  });
  const NativeURL = URL;
  vi.stubGlobal('URL', class extends NativeURL {
    static createObjectURL = vi.fn(() => 'blob:voice');
    static revokeObjectURL = vi.fn();
  });
});

afterEach(() => {
  delete runtime.__VOLC_TTS_ENABLED__;
  vi.unstubAllGlobals();
});

it('收音期间不发起示范播报，已经在途的合成也不能插入收音', async () => {
  runtime.__VOLC_TTS_ENABLED__ = true;
  const { beginSpeechCapture } = await import('../speechCapture');
  const { speakVolc } = await import('../volcTts');
  let resolveAudio!: (response: Response) => void;
  const fetchMock = vi.fn(() => new Promise<Response>(resolve => { resolveAudio = resolve; }));
  vi.stubGlobal('fetch', fetchMock);
  const speech = speakVolc('教材示范', 'zh');
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  const release = beginSpeechCapture(vi.fn());
  try {
    const onEnd = vi.fn();
    await speakVolc('延迟的页面讲解', 'zh', .92, onEnd);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(onEnd).toHaveBeenCalledWith(false);
    resolveAudio(audioResponse()); await speech;
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  } finally { release(); }
});

describe('火山 TTS 运行时配置', () => {
  it('运行时启用覆盖构建期 false，同时保留显式关闭', async () => {
    const { volcConfigured } = await import('../volcTts');
    expect(volcConfigured()).toBe(false);
    runtime.__VOLC_TTS_ENABLED__ = true;
    expect(volcConfigured()).toBe(true);
    runtime.__VOLC_TTS_ENABLED__ = false;
    expect(volcConfigured()).toBe(false);
  });

  it('首次播报等待启动健康检查并复用同一请求', async () => {
    let resolveHealth!: (response: Response) => void;
    const fetchMock = vi.fn((url: string) => url === '/api/health'
      ? new Promise<Response>((resolve) => { resolveHealth = resolve; })
      : Promise.resolve(audioResponse()));
    vi.stubGlobal('fetch', fetchMock);
    const { refreshServerHealth } = await import('../api');
    const { speakVolc } = await import('../volcTts');
    const onChange = vi.fn();
    window.addEventListener('volc-tts-configured', onChange, { once: true });
    const health = refreshServerHealth();
    const speech = speakVolc('欢迎来到乐园', 'zh');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveHealth(Response.json({ ok: true, ttsConfigured: true }));
    await Promise.all([health, speech]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain('/api/volc-tts/');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('翻页取消等待配置的欢迎语，不在新页面补播旧内容', async () => {
    let resolveHealth!: (response: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { resolveHealth = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    const { speakVolc, stopVolc } = await import('../volcTts');
    const onEnd = vi.fn();
    const speech = speakVolc('旧页面欢迎语', 'zh', .92, onEnd);
    stopVolc();
    resolveHealth(Response.json({ ok: true, ttsConfigured: true }));
    await speech;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('服务端未配置时不发送合成请求，仍结束点读流程', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true, ttsConfigured: false }));
    vi.stubGlobal('fetch', fetchMock);
    const { speakVolc } = await import('../volcTts');
    const onEnd = vi.fn();
    await speakVolc('点读内容', 'zh', .92, onEnd);
    await vi.waitFor(() => expect(onEnd).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalledWith(false);
  });

  it('只有真实结束回调成功，播放失败返回 false，取消释放音频但不报成功', async () => {
    runtime.__VOLC_TTS_ENABLED__ = true;
    const audios: { onended?: () => void; onerror?: () => void; pause: () => void; play: () => Promise<void> }[] = [];
    vi.stubGlobal('Audio', class {
      onended?: () => void; onerror?: () => void;
      pause = vi.fn(); play = vi.fn().mockResolvedValue(undefined);
      constructor() { audios.push(this); }
    });
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(audioResponse())));
    const { speakVolc, stopVolc } = await import('../volcTts');
    const complete = vi.fn();
    await speakVolc('heard', 'en', .85, complete);
    expect(complete).not.toHaveBeenCalled();
    audios[0].onended?.();
    expect(complete).toHaveBeenCalledWith(true);
    const error = vi.fn();
    await speakVolc('error', 'en', .85, error);
    audios[1].onerror?.();
    expect(error).toHaveBeenCalledWith(false);
    const canceled = vi.fn();
    await speakVolc('cancel', 'en', .85, canceled);
    stopVolc(); audios[2].onended?.();
    expect(canceled).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(3);
  });

  it('预热也使用服务端运行时配置', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve(url === '/api/health'
      ? Response.json({ ok: true, ttsConfigured: true }) : audioResponse())));
    const { warmTts, speakVolc } = await import('../volcTts');
    await warmTts('缓存点读', 'zh');
    await speakVolc('缓存点读', 'zh');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });
});

it('合成等待也锁定图标，取消立即释放，旧合成结果不解锁新播放，失败后恢复', async () => {
  runtime.__VOLC_TTS_ENABLED__ = true;
  let respond!: (response: Response) => void;
  const audios: { onerror?: () => void }[] = [];
  vi.stubGlobal('Audio', class {
    onerror?: () => void; pause() {} play() { return Promise.resolve(); }
    constructor() { audios.push(this); }
  });
  vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(() => new Promise(resolve => { respond = resolve; })).mockImplementation(() => Promise.resolve(audioResponse())));
  const { speakVolc, stopVolc } = await import('../volcTts');
  const { courseAudioPlaybackState, withCourseAudioOwner } = await import('../courseAudioPlayback');
  const old = withCourseAudioOwner('old', () => speakVolc('旧讲解', 'zh'));
  expect(courseAudioPlaybackState()).toEqual({ busy: true, owner: 'old' });
  await vi.waitFor(() => expect(respond).toBeTypeOf('function'));
  stopVolc();
  await vi.waitFor(() => expect(courseAudioPlaybackState().busy).toBe(false));
  await withCourseAudioOwner('new', () => speakVolc('新讲解', 'zh'));
  respond(audioResponse()); await old;
  expect(audios).toHaveLength(1);
  expect(courseAudioPlaybackState()).toEqual({ busy: true, owner: 'new' });
  audios[0].onerror?.();
  await vi.waitFor(() => expect(courseAudioPlaybackState().busy).toBe(false));
});


it('发音词典和语音指令送入同一请求，按学科分别缓存，不复用错误字母音', async () => {
  runtime.__VOLC_TTS_ENABLED__ = true;
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(audioResponse())));
  const { speakVolc } = await import('../volcTts');
  const chinese = { pronunciation: ['读音1号/(yi1)'], context: ['语文拼音'] };
  const english = { pronunciation: ['读音1号/eye'], context: ['英文字母名'] };
  await speakVolc('读音1号', 'zh', .82, undefined, undefined, 0, chinese);
  await speakVolc('读音1号', 'zh', .82, undefined, undefined, 0, english);
  expect(fetch).toHaveBeenCalledTimes(2);
  const bodies = vi.mocked(fetch).mock.calls.map(call => JSON.parse(call[1]!.body as string));
  expect(JSON.parse(bodies[0].req_params.additions).pronunciation_dict.tone).toEqual(chinese.pronunciation);
  expect(JSON.parse(bodies[1].req_params.additions).context_texts).toEqual(english.context);
  await speakVolc('读音1号', 'zh', .82, undefined, undefined, 0, chinese);
  expect(fetch).toHaveBeenCalledTimes(2);
});
