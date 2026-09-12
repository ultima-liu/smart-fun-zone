// 纯合成音效模块：不依赖任何音频文件，使用 Web Audio API 生成
import { useStore } from './store';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!useStore.getState().sound) return null;

  if (!ctx) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  const audioCtx = ctx!;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function tone(
  freq: number,
  dur: number,
  opts: {
    type?: OscillatorType;
    gain?: number;
    endFreq?: number;
    attack?: number;
    delay?: number;
    pan?: number;
  } = {},
) {
  const c = getCtx();
  if (!c) return;

  const t = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const gain = c.createGain();
  const master = c.createGain();
  master.gain.value = 0.45;

  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (opts.endFreq && opts.endFreq !== freq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.endFreq), t + dur);
  }

  const peak = opts.gain ?? 0.2;
  const attack = Math.min(opts.attack ?? 0.01, dur * 0.4);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.connect(gain);
  gain.connect(master);

  if (opts.pan && 'createStereoPanner' in c) {
    const pan = (c as any).createStereoPanner();
    pan.pan.value = opts.pan;
    master.connect(pan);
    pan.connect(c.destination);
  } else {
    master.connect(c.destination);
  }

  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noise(dur: number, opts: { gain?: number; filter?: number; delay?: number } = {}) {
  const c = getCtx();
  if (!c) return;

  const t = c.currentTime + (opts.delay ?? 0);
  const bufferSize = c.sampleRate * dur;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const src = c.createBufferSource();
  src.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = opts.filter ?? 1200;

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(opts.gain ?? 0.25, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  const master = c.createGain();
  master.gain.value = 0.5;

  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  master.connect(c.destination);

  src.start(t);
  src.stop(t + dur + 0.05);
}

function thump(delay = 0) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(35, t + 0.22);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.45, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.3);
}

function chime(freq: number, dur = 0.6, delay = 0) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.12, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export const sfx = {
  /** 蓄力阶段音效，level 0~3 逐级升高 */
  charge(level: number) {
    const base = [200, 310, 480, 720][level] ?? 220;
    tone(base, 0.22, { type: 'sawtooth', gain: 0.06, endFreq: base * 1.4, attack: 0.008 });
    tone(base * 1.5, 0.18, { type: 'sine', gain: 0.04, endFreq: base * 1.8, delay: 0.03 });
  },

  /** 爆开瞬间 */
  burst() {
    noise(0.55, { gain: 0.35, filter: 900 });
    noise(0.35, { gain: 0.22, filter: 2800, delay: 0.02 });
    thump(0);
    // 闪光般的铃音
    [880, 1320, 1760].forEach((f, i) => chime(f, 0.8, i * 0.04));
  },

  /** 卡牌 reveal，rarity 越高越华丽 */
  reveal(rarity: string) {
    const base: Record<string, number> = { R: 523, SR: 698, SSR: 988, SP: 1319 };
    const r = base[rarity] ?? 523;
    chime(r, 0.55, 0);
    chime(r * 1.25, 0.45, 0.08);
    if (['SSR', 'SP'].includes(rarity)) {
      chime(r * 1.5, 0.6, 0.16);
      chime(r * 2, 0.5, 0.24);
    }
  },

  /** 打开召唤弹窗 */
  open() {
    tone(330, 0.35, { type: 'sine', gain: 0.04, endFreq: 660, attack: 0.05 });
  },

  /** 点击按钮反馈 */
  click() {
    tone(880, 0.08, { type: 'triangle', gain: 0.03 });
  },
};

export default sfx;
