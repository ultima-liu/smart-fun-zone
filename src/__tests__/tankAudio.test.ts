import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
class Source {
  buffer: { filename: string } | null = null;
  loop = false;
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
describe('original FC tank sound routing', () => {
  it('routes every action to its distinct original recording', async () => {
    const { TankAudio } = await import('../games/tankAudio');
    const audio = new TankAudio();
    audio.enable(true);
    const events = [
      'intro',
      'fire',
      'brick',
      'steel',
      'armor',
      'enemy',
      'player',
      'hq',
      'bonus',
      'appear',
      'pickup',
      'life',
      'pause',
      'ice',
      'score',
      'over',
    ] as const;
    audio.events([...events]);
    await flush();
    const sources = Context.instances[0].sources;
    expect(sources).toHaveLength(events.length);
    events.forEach((track) =>
      expect(sources.some((s) => s.buffer?.filename.endsWith(`/${track}-fc-v1.wav`))).toBe(true),
    );
    expect(sources.every((s) => !s.loop)).toBe(true);
    audio.dispose();
  });
  it('switches idle and movement hum, stopping loops at pause and mute', async () => {
    const { TankAudio } = await import('../games/tankAudio');
    const a = new TankAudio();
    a.enable(true);
    a.movement(true, false);
    await flush();
    const c = Context.instances[0];
    expect(c.sources[0].buffer?.filename).toContain('idle-fc');
    expect(c.sources[0].loop).toBe(true);
    a.movement(true, true);
    await flush();
    expect(c.sources[0].stop).toHaveBeenCalled();
    expect(c.sources[1].buffer?.filename).toContain('move-fc');
    a.movement(false, true);
    expect(c.sources[1].stop).toHaveBeenCalled();
    a.movement(true, false);
    await flush();
    a.enable(false);
    expect(c.sources[2].stop).toHaveBeenCalled();
    a.dispose();
  });
  it('does not resurrect a delayed engine loop after a rapid state change', async () => {
    const { TankAudio } = await import('../games/tankAudio');
    const a = new TankAudio();
    a.enable(true);
    a.movement(true, false);
    a.movement(true, true);
    a.movement(false, false);
    await flush();
    expect(Context.instances[0].sources).toHaveLength(0);
    a.dispose();
  });
  it('does not play decoded effects after disposal or muted fetch completion', async () => {
    const { TankAudio } = await import('../games/tankAudio');
    const a = new TankAudio();
    a.enable(true);
    a.events(['fire', 'enemy']);
    a.enable(false);
    await flush();
    expect(Context.instances[0].sources).toHaveLength(0);
    a.enable(true);
    a.events(['intro']);
    a.dispose();
    await flush();
    expect(Context.instances[0].sources).toHaveLength(0);
    expect(Context.instances[0].close).toHaveBeenCalledOnce();
  });
  it('replaces rapid repetitions instead of layering the same cartridge voice', async () => {
    const { TankAudio } = await import('../games/tankAudio');
    const a = new TankAudio();
    a.enable(true);
    a.events(['fire']);
    await flush();
    a.events(['fire']);
    await flush();
    expect(Context.instances[0].sources[0].stop).toHaveBeenCalled();
    expect(Context.instances[0].sources[1].start).toHaveBeenCalledOnce();
    a.dispose();
  });
});
