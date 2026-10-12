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
    filename: new TextDecoder().decode(data), duration: 20,
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
let BomberAudio: typeof import('../games/bomberAudio').BomberAudio;
let audio: InstanceType<typeof BomberAudio>;
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
  BomberAudio = (await import('../games/bomberAudio')).BomberAudio;
  audio = new BomberAudio();
});
afterEach(() => {
  audio.dispose();
  vi.unstubAllGlobals();
});

describe('炸弹人原版音频生命周期', () => {
  it('标题、开场、主曲按顺序播放，反复更新不重播开场', async () => {
    audio.music('title'); await flush(); const c = Context.instances[0];
    expect(c.sources[0].buffer?.filename).toBe('title-fc-v1.mp3');
    audio.music('main',true); audio.music('main'); await flush();
    expect(c.sources[0].stop).toHaveBeenCalledOnce(); expect(c.sources[1].buffer?.filename).toBe('start-fc-v1.mp3');
    c.sources[1].onended?.(); await flush();
    expect(c.sources[2].buffer?.filename).toBe('main-fc-v1.wav'); expect(c.sources[2].loop).toBe(true);
    audio.music('upgrade'); await flush(); expect(c.sources[3].buffer?.filename).toBe('upgrade-fc-v1.wav');
  });
  it('奖励、无敌、过关、死亡、失败和结局都使用各自原版曲目', async () => {
    for (const track of ['bonus','invincible','clear','miss','over','ending'] as const) { audio.music(track); await flush(); }
    expect(Context.instances[0].sources.map(s=>s.buffer?.filename)).toEqual(['bonus-fc-v1.wav','invincible-fc-v1.wav','clear-fc-v1.mp3','miss-fc-v1.mp3','over-fc-v1.mp3','ending-fc-v1.mp3']);
  });
  it('音效关闭仍可播放音乐，脚步、放弹、爆炸与拾取使用原版录音', async () => {
    audio.effect('plant',false); expect(Context.instances).toHaveLength(0);
    audio.music('main'); await flush();
    for (const event of ['stepHorizontal','stepVertical','plant','blast','power','hurt','pause']) { audio.effect(event,true); await flush(); }
    expect(Context.instances[0].sources.map(s=>s.buffer?.filename)).toEqual(['main-fc-v1.wav','step-horizontal-fc-v1.mp3','step-vertical-fc-v1.mp3','plant-fc-v1.mp3','blast-fc-v2.wav','power-fc-v1.mp3','hurt-fc-v1.mp3','pause-fc-v1.mp3']);
    audio.muteEffects(); expect(Context.instances[0].sources[0].stop).not.toHaveBeenCalled();
    expect(Context.instances[0].sources.slice(1).every(s=>s.stop.mock.calls.length===1)).toBe(true);
  });
  it('暂停或离开阻止解码迟到的音乐、音效和开场回调', async () => {
    let finish!: (data:ArrayBuffer)=>void;
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,arrayBuffer:()=>new Promise<ArrayBuffer>(r=>{finish=r;})})));
    audio.music('main',true); await flush(); audio.stop();
    finish(new TextEncoder().encode('start-fc-v1.mp3').buffer); await flush(); expect(Context.instances[0].sources).toHaveLength(0);
    audio.dispose(); expect(Context.instances[0].close).toHaveBeenCalledOnce();
  });
  it('音效静音会取消迟到解码，音乐继续', async () => {
    audio.music('main'); await flush(); const c=Context.instances[0];
    let finish!: (data:ArrayBuffer)=>void;
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,arrayBuffer:()=>new Promise<ArrayBuffer>(r=>{finish=r;})})));
    audio.effect('blast',true); await flush(); audio.muteEffects(); finish(new TextEncoder().encode('blast').buffer); await flush();
    expect(c.sources).toHaveLength(1); expect(c.sources[0].stop).not.toHaveBeenCalled();
  });
  it('连锁爆炸重启单个 DMC 声道，不叠加，也不截断背景音乐或其他音效', async () => {
    audio.music('main'); await flush();
    audio.effect('plant', true); await flush();
    for (let i = 0; i < 10; i++) audio.effect('blast', true);
    await flush();
    const c = Context.instances[0], blasts = c.sources.slice(2);
    expect(blasts).toHaveLength(10);
    expect(blasts.slice(0, -1).every(s => s.stop.mock.calls.length === 1)).toBe(true);
    expect(blasts[blasts.length - 1].stop).not.toHaveBeenCalled();
    expect(c.sources[0].stop).not.toHaveBeenCalled();
    expect(c.sources[1].stop).not.toHaveBeenCalled();
    expect(blasts.every(s => !s.loop && s.playbackRate.value === 1)).toBe(true);
    audio.stop();
    expect(blasts[blasts.length - 1].stop).toHaveBeenCalledOnce();
  });
  it('停止释放节点，继续只恢复循环，不再播放开场', async () => {
    audio.music('main'); await flush(); const c=Context.instances[0]; audio.stop();
    expect(c.sources[0].stop).toHaveBeenCalledOnce(); expect(c.sources[0].disconnect).toHaveBeenCalledOnce();
    audio.music('main'); await flush(); expect(c.sources[1].buffer?.filename).toBe('main-fc-v1.wav');
    audio.dispose(); expect(c.close).toHaveBeenCalledOnce();
  });
});
