// 纯合成音效模块：不依赖任何音频文件，使用 Web Audio API 生成
import { useStore } from './store';

let ctx: AudioContext | null = null;

// 抽卡音效只由 GachaModal 使用；稍高于常规交互音，确保在背景音乐和环境噪声下仍清晰可辨。
const GACHA_MASTER_GAIN = 0.8;

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
  master.gain.value = GACHA_MASTER_GAIN;

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
  master.gain.value = GACHA_MASTER_GAIN;

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
  gain.gain.exponentialRampToValueAtTime(0.65, t + 0.01);
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
  gain.gain.exponentialRampToValueAtTime(0.2, t + 0.005);
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

  /** 连连看：点选一块牌 */
  lkSelect() {
    tone(620, 0.09, { type: 'triangle', gain: 0.05, endFreq: 880 });
  },

  /** 连连看：消除成功，combo 越高旋律沿五声音阶爬得越高（封顶两个八度） */
  lkMatch(combo: number) {
    const steps = [0, 2, 4, 7, 9, 12, 14, 16];
    const lift = steps[Math.min(Math.max(combo, 1), steps.length) - 1];
    const base = 523.25 * Math.pow(2, lift / 12);
    chime(base, 0.45, 0);
    chime(base * 1.25, 0.4, 0.07);
    chime(base * 1.5, 0.55, 0.14);
  },

  /** 连连看：同图案但路径不通 */
  lkBlocked() {
    tone(200, 0.16, { type: 'sine', gain: 0.05, endFreq: 150 });
  },

  /** 连连看：提示高亮 */
  lkHint() {
    chime(1318, 0.3, 0);
    chime(1760, 0.4, 0.09);
  },

  /** 连连看：云朵重排 */
  lkShuffle() {
    noise(0.5, { gain: 0.12, filter: 700 });
    tone(320, 0.5, { type: 'sine', gain: 0.045, endFreq: 640, attack: 0.12 });
  },

  /** 连连看：通关小号角 */
  lkWin() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => chime(f, 0.7, i * 0.13));
    chime(1567.98, 1.1, 0.55);
  },

  /** 连连看：闯关时间到（温和的下行音，不刺耳） */
  lkFail() {
    tone(392, 0.4, { type: 'sine', gain: 0.06, endFreq: 262, attack: 0.02 });
    tone(262, 0.55, { type: 'sine', gain: 0.05, delay: 0.22, endFreq: 196, attack: 0.02 });
  },

  /** 连连看：开始云端音乐盒背景音乐（游戏挂载时调用，全局 sound 关闭时为空操作） */
  lkBgmStart() {
    const c = getCtx();
    if (!c || lkBgmTimer !== null) return;
    lkBgmGain = c.createGain();
    lkBgmGain.gain.setValueAtTime(0.0001, c.currentTime);
    lkBgmGain.gain.exponentialRampToValueAtTime(LK_BGM_MASTER, c.currentTime + 1.6);
    lkBgmGain.connect(c.destination);
    lkBgmNext = c.currentTime + 0.25;
    lkBgmBeat = 0;
    lkBgmTimer = window.setInterval(lkBgmTick, 300);
  },

  /** 连连看：停止背景音乐并淡出 */
  lkBgmStop() {
    if (lkBgmTimer !== null) {
      window.clearInterval(lkBgmTimer);
      lkBgmTimer = null;
    }
    const c = ctx;
    const gainNode = lkBgmGain;
    lkBgmGain = null;
    if (gainNode && c) {
      try {
        const now = c.currentTime;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(Math.max(gainNode.gain.value, 0.0001), now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        window.setTimeout(() => {
          try { gainNode.disconnect(); } catch { /* 已断开则忽略 */ }
        }, 700);
      } catch { /* 音频图已失效则忽略 */ }
    }
  },
};

// ---------- 连连看背景音乐：云端音乐盒 ----------
// 8 小节一循环（72bpm）：Cmaj7 → Am7 → Fmaj7 → G6 的柔和垫弦，
// 配 C 大调五声的音乐盒旋律；全部实时合成，无音频文件。

const LK_BGM_MASTER = 0.5;
const LK_BEAT = 60 / 72;
const LK_PATTERN_BEATS = 32;

const midiFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

// [起拍, 和弦 MIDI]，每 2 小节（8 拍）一次
const LK_CHORDS: Array<[number, number[]]> = [
  [0, [48, 55, 64, 59]],
  [8, [45, 52, 60, 55]],
  [16, [41, 48, 57, 52]],
  [24, [43, 50, 59, 52]],
];

// [拍, 旋律 MIDI]，C 大调五声（C D E G A）
const LK_MELODY: Array<[number, number]> = [
  [0, 76], [1.5, 79], [2.5, 84], [4, 79], [5, 76], [6, 74], [7, 76],
  [8, 72], [9.5, 76], [10.5, 81], [12, 79], [13.5, 76], [15, 74],
  [16, 69], [17.5, 72], [18.5, 76], [20, 74], [21.5, 72], [23, 74],
  [24, 79], [25.5, 76], [26.5, 74], [28, 76], [29.5, 79], [31, 84],
];

let lkBgmTimer: number | null = null;
let lkBgmGain: GainNode | null = null;
let lkBgmNext = 0;
let lkBgmBeat = 0;

function lkPad(c: AudioContext, dest: AudioNode, midis: number[], t: number) {
  const dur = 8 * LK_BEAT;
  midis.forEach((midi) => {
    const osc = c.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = midiFreq(midi);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.02, t + 2.2);
    gain.gain.setValueAtTime(0.02, t + dur - 1.8);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.9);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 1);
  });
}

function lkBoxNote(c: AudioContext, dest: AudioNode, midi: number, t: number, peak: number) {
  // 音乐盒音色：基频 + 2/3 倍频泛音，快起慢衰；0.36s 后叠一份弱回声营造云端空间感
  [[0, 1], [0.36, 0.32]].forEach(([delay, echo]) => {
    [[1, 1], [2, 0.28], [3, 0.08]].forEach(([mult, amp]) => {
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = midiFreq(midi) * mult;
      const gain = c.createGain();
      const at = t + delay;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(peak * amp * echo, at + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.5);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(at);
      osc.stop(at + 1.6);
    });
  });
}

function lkBgmTick() {
  const c = getCtx();
  if (!c || !lkBgmGain || c.state !== 'running') return;
  const now = c.currentTime;
  // 页面标签页被挂起等导致时间轴落后时重新对齐，避免积压的音符恢复后齐鸣
  if (lkBgmNext < now - 0.2) {
    lkBgmNext = now + 0.2;
    lkBgmBeat = 0;
  }
  while (lkBgmNext < now + 1.2) {
    LK_CHORDS.forEach(([beat, midis]) => {
      if (beat >= lkBgmBeat && beat < lkBgmBeat + 4) lkPad(c, lkBgmGain!, midis, lkBgmNext);
    });
    LK_MELODY.forEach(([beat, midi]) => {
      if (beat >= lkBgmBeat && beat < lkBgmBeat + 4) {
        lkBoxNote(c, lkBgmGain!, midi, lkBgmNext + (beat - lkBgmBeat) * LK_BEAT, 0.09);
      }
    });
    lkBgmBeat = (lkBgmBeat + 4) % LK_PATTERN_BEATS;
    lkBgmNext += 4 * LK_BEAT;
  }
}

export default sfx;
