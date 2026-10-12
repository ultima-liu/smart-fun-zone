import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
class Source {
  buffer: { filename: string } | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  onended: (() => void) | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}
class Gain {
  gain = { value: 1 };
  connect = vi.fn();
  disconnect = vi.fn();
}
class Context {
  static instances: Context[] = [];
  state = 'running';
  destination = {};
  sources: Source[] = [];
  resume = vi.fn(async () => {});
  close = vi.fn(async () => {
    this.state = 'closed';
  });
  decodeAudioData = vi.fn(async (data: ArrayBuffer) => ({
    filename: new TextDecoder().decode(data),
  }));
  constructor() {
    Context.instances.push(this);
  }
  createBufferSource() {
    const s = new Source();
    this.sources.push(s);
    return s;
  }
  createGain() {
    return new Gain();
  }
}
async function flush() {
  for (let i = 0; i < 12; i++) await Promise.resolve();
}
beforeEach(() => {
  vi.resetModules();
  Context.instances = [];
  vi.stubGlobal('AudioContext', Context);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode(url).buffer,
    })),
  );
});
afterEach(() => vi.unstubAllGlobals());
describe('Contra original music and audio lifecycle', () => {
  it('routes every stage and both base bosses to the original FC track', async () => {
    const { contraMusicTrack } = await import('../games/contraAudio');
    expect(Array.from({ length: 8 }, (_, i) => contraMusicTrack(i + 1))).toEqual([
      'jungle',
      'base',
      'waterfall',
      'base',
      'snow',
      'energy',
      'jungle',
      'lair',
    ]);
    expect(contraMusicTrack(2, true)).toBe('boss');
    expect(contraMusicTrack(4, true)).toBe('boss');
    expect(contraMusicTrack(8, true)).toBe('lair');
  });
  it('loops original recordings and switches music without stacking tracks', async () => {
    const { ContraAudio } = await import('../games/contraAudio');
    const audio = new ContraAudio();
    await audio.start(1, true);
    const context = Context.instances[0];
    expect(context.sources[0].buffer?.filename).toContain('jungle-fc');
    expect(context.sources[0].loop).toBe(true);
    expect(context.sources[0].loopEnd).toBeGreaterThan(context.sources[0].loopStart);
    await audio.start(7, true);
    expect(context.sources).toHaveLength(1);
    await audio.start(2, true);
    expect(context.sources[0].stop).toHaveBeenCalled();
    expect(context.sources[1].buffer?.filename).toContain('base-fc');
    await audio.start(2, true, true);
    expect(context.sources[1].stop).toHaveBeenCalled();
    expect(context.sources[2].buffer?.filename).toContain('boss-fc');
    audio.dispose();
    expect(context.sources[2].stop).toHaveBeenCalled();
    expect(context.close).toHaveBeenCalledOnce();
  });
  it('muting while music loads cannot revive a pending track', async () => {
    const { ContraAudio } = await import('../games/contraAudio');
    const audio = new ContraAudio();
    const pending = audio.start(1, true);
    audio.stop();
    await pending;
    expect(Context.instances[0].sources).toHaveLength(0);
    await audio.start(1, true);
    expect(Context.instances[0].sources).toHaveLength(1);
    await audio.start(1, false);
    expect(Context.instances[0].sources[0].stop).toHaveBeenCalled();
    audio.dispose();
  });
  it('rapid stage changes invalidate earlier decode and disposal cancels pending jingles', async () => {
    const { ContraAudio } = await import('../games/contraAudio');
    const audio = new ContraAudio();
    const one = audio.start(1, true),
      two = audio.start(5, true);
    await Promise.all([one, two]);
    expect(Context.instances[0].sources).toHaveLength(1);
    expect(Context.instances[0].sources[0].buffer?.filename).toContain('snow-fc');
    const ending = audio.jingle('ending', true);
    audio.dispose();
    await ending;
    await flush();
    expect(Context.instances[0].sources).toHaveLength(1);
  });
  it('a failed audio fetch can be retried', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }),
    );
    const { ContraAudio } = await import('../games/contraAudio');
    const audio = new ContraAudio();
    await audio.start(1, true);
    expect(Context.instances[0].sources).toHaveLength(0);
    await audio.start(1, true);
    expect(Context.instances[0].sources).toHaveLength(1);
    audio.dispose();
  });
});

describe('Contra original hit effects', () => {
  it('plays the original hit and kill recordings over music without stopping its loop', async () => {
    const { ContraAudio } = await import('../games/contraAudio');
    const audio = new ContraAudio();
    await audio.start(1, true);
    await audio.effect('hit', true);
    await audio.effect('kill', true);
    const sources = Context.instances[0].sources;
    expect(sources.map((s) => s.buffer?.filename)).toEqual([
      expect.stringContaining('jungle-fc'),
      expect.stringContaining('sfx-hit-fc'),
      expect.stringContaining('sfx-kill-fc'),
    ]);
    expect(sources[0].stop).not.toHaveBeenCalled();
    expect(sources.slice(1).every((s) => !s.loop && s.start.mock.calls.length === 1)).toBe(true);
    audio.stop();
    expect(sources.every((s) => s.stop.mock.calls.length === 1)).toBe(true);
  });
  it('pause cancels a pending impact and muted effects create no voices', async () => {
    const { ContraAudio } = await import('../games/contraAudio');
    const audio = new ContraAudio();
    await audio.start(1, true);
    const hit = audio.effect('hit', true);
    audio.stop();
    await hit;
    await audio.effect('kill', false);
    await audio.effect('hit', true);
    expect(Context.instances[0].sources).toHaveLength(1);
    audio.dispose();
  });
});
