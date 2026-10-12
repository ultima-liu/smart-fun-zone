import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class Parameter {
  value = 1;
  setTargetAtTime(value: number) {
    this.value = value;
  }
}
class Source {
  buffer: { filename: string } | null = null;
  loop = false;
  playbackRate = new Parameter();
  onended: (() => void) | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}
class Gain {
  gain = new Parameter();
  connect = vi.fn();
  disconnect = vi.fn();
}
class Context {
  static instances: Context[] = [];
  state = 'running';
  currentTime = 0;
  destination = {};
  sources: Source[] = [];
  gains: Gain[] = [];
  decodeAudioData = vi.fn(async (data: ArrayBuffer) => ({
    filename: new TextDecoder().decode(data),
  }));
  resume = vi.fn(async () => {});
  close = vi.fn(async () => {
    this.state = 'closed';
  });
  constructor() {
    Context.instances.push(this);
  }
  createBufferSource() {
    const source = new Source();
    this.sources.push(source);
    return source;
  }
  createGain() {
    const gain = new Gain();
    this.gains.push(gain);
    return gain;
  }
}
const flush = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};
let RoadAudio: typeof import('../games/roadFighterAudio').RoadAudio;
let audio: InstanceType<typeof RoadAudio>;
beforeEach(async () => {
  vi.resetModules();
  Context.instances = [];
  vi.stubGlobal('AudioContext', Context);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode(url.split('/').slice(-1)[0]).buffer,
    })),
  );
  RoadAudio = (await import('../games/roadFighterAudio')).RoadAudio;
  audio = new RoadAudio();
});
afterEach(() => {
  audio.dispose();
  vi.unstubAllGlobals();
});

describe('火箭车原版录音与音频生命周期', () => {
  it('静音不开音频设备；起跑短曲仅播一次，驾驶只有引擎循环，继续不会重播起跑', async () => {
    audio.start(false, true);
    expect(Context.instances).toHaveLength(0);
    audio.start(true, true);
    audio.start(true);
    await flush();
    const context = Context.instances[0];
    expect(context.sources).toHaveLength(2);
    expect(context.sources.filter((s) => s.loop).map((s) => s.buffer?.filename)).toEqual([
      'engine-fc-v2.wav',
    ]);
    expect(context.sources.find((s) => !s.loop)?.buffer?.filename).toBe('start-fc-v1.mp3');
    audio.update(196, false, false);
    const low = context.sources[0].playbackRate.value;
    audio.update(400, false, false);
    expect(context.sources[0].playbackRate.value).toBeGreaterThan(low);
    audio.update(400, false, true);
    expect(context.gains[0].gain.value).toBe(0);
    audio.stop();
    expect(context.sources.every((s) => s.stop.mock.calls.length === 1)).toBe(true);
    audio.start(true);
    await flush();
    expect(context.sources).toHaveLength(3);
    expect(context.sources[2].buffer?.filename).toBe('engine-fc-v2.wav');
  });

  it('关间、最终胜利和失败分别播放原版短曲，未添加救车或彩蛋旋律', async () => {
    for (const event of ['clear', 'goal', 'over', 'fuel', 'crash', 'skid', 'clean', 'empty'])
      audio.effect(event, true);
    await flush();
    expect(Context.instances[0].sources.map((s) => s.buffer?.filename)).toEqual([
      'checkpoint-fc-v1.mp3',
      'goal-fc-v1.mp3',
      'over-fc-v1.mp3',
      'fuel-fc-v1.mp3',
      'crash-fc-v1.mp3',
      'skid-fc-v1.mp3',
    ]);
    expect(Context.instances[0].sources.every((s) => !s.loop)).toBe(true);
  });

  it('正常加速只改变发动机；低于 10 才响警报，警报不随车速变调，补给和空油立即停止', async () => {
    audio.start(true); await flush();
    const c = Context.instances[0];
    audio.update(196, false, false, 100);
    audio.update(400, false, false, 10); await flush();
    expect(c.sources).toHaveLength(1);
    expect(c.sources[0].buffer?.filename).toBe('engine-fc-v2.wav');
    audio.update(196, false, false, 9); await flush();
    const warning = c.sources[1];
    expect(warning.buffer?.filename).toBe('low-fuel-fc-v2.wav');
    expect(warning.loop).toBe(true);
    audio.update(400, false, false, 5); await flush();
    expect(c.sources).toHaveLength(2);
    expect(warning.playbackRate.value).toBe(1);
    audio.update(400, false, false, 12);
    expect(warning.stop).toHaveBeenCalledOnce();
    expect(c.sources[0].stop).not.toHaveBeenCalled();
    audio.update(400, false, false, 8); await flush();
    expect(c.sources).toHaveLength(3);
    audio.update(0, false, false, 0);
    expect(c.sources[2].stop).toHaveBeenCalledOnce();
  });

  it('补给取消正在加载的低油量警报，暂停再继续只恢复当前仍需的警报', async () => {
    audio.start(true); await flush();
    let complete!: (data: ArrayBuffer) => void;
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: () => new Promise<ArrayBuffer>(r => { complete = r; }) })));
    audio.update(400, false, false, 9); await flush();
    audio.update(400, false, false, 16);
    complete(new TextEncoder().encode('low-fuel-fc-v2.wav').buffer); await flush();
    const c = Context.instances[0];
    expect(c.sources).toHaveLength(1);
    audio.update(400, false, false, 9); await flush();
    audio.stop();
    expect(c.sources[1].stop).toHaveBeenCalledOnce();
    audio.start(true); await flush();
    expect(c.sources.slice(2).map(s => s.buffer?.filename)).toEqual(['engine-fc-v2.wav', 'low-fuel-fc-v2.wav']);
  });

  it('解码延迟期间暂停再继续，不会复活旧引擎或旧起跑曲', async () => {
    let complete!: (data: ArrayBuffer) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((resolve) => {
            resolve({
              ok: true,
              arrayBuffer: () =>
                new Promise<ArrayBuffer>((r) => {
                  complete = r;
                }),
            });
          }),
      ),
    );
    audio.start(true);
    await flush();
    audio.stop();
    audio.start(true);
    complete(new TextEncoder().encode('engine-fc-v2.wav').buffer);
    await flush();
    expect(Context.instances[0].sources).toHaveLength(1);
  });

  it('已经救回的车不会在延迟解码后补播打滑音', async () => {
    let complete!: (data: ArrayBuffer) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: () =>
          new Promise<ArrayBuffer>((r) => {
            complete = r;
          }),
      })),
    );
    audio.effect('skid', true);
    await flush();
    audio.effect('saved', true);
    complete(new TextEncoder().encode('skid-fc-v1.mp3').buffer);
    await flush();
    expect(Context.instances[0].sources).toHaveLength(0);
  });

  it('静音和离开阻止迟到音效；关闭设备且释放所有已开始节点', async () => {
    audio.start(true, true);
    await flush();
    const context = Context.instances[0];
    audio.effect('fuel', true);
    audio.effect('over', false);
    audio.dispose();
    await flush();
    expect(context.sources).toHaveLength(2);
    expect(
      context.sources.every(
        (s) => s.stop.mock.calls.length === 1 && s.disconnect.mock.calls.length === 1,
      ),
    ).toBe(true);
    expect(context.close).toHaveBeenCalledOnce();
  });

  it('下载失败保持安静，下次启动可重试原版素材', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
    audio.start(true);
    await flush();
    expect(Context.instances[0].sources).toHaveLength(0);
    audio.stop();
    audio.start(true);
    await flush();
    expect(Context.instances[0].sources).toHaveLength(1);
  });
});
