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
