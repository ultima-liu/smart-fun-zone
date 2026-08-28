import { useStore } from './store';
import { playOffline, stopOffline } from './tts';

/* =====================================================================
   音频系统：语音朗读（TTS）+ 合成音效 + 背景音乐（WebAudio 无素材）
   ===================================================================== */

/* ---------- 语音朗读 ---------- */

let voices: SpeechSynthesisVoice[] = [];

function loadVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  voices = window.speechSynthesis.getVoices();
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

/** 朗读会话令牌：每次开始新朗读或停止时 +1，用于作废旧的逐句朗读链 */
let speechToken = 0;

function newSpeech(): number {
  speechToken++;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  return speechToken;
}

/** 调用时重新拉取语音列表（部分浏览器首次需主动 getVoices 才会加载） */
function currentVoices(): SpeechSynthesisVoice[] {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const v = window.speechSynthesis.getVoices();
    if (v.length) voices = v;
  }
  return voices;
}

/**
 * 选择语音：优先"自然语音"（Windows 11 晓晓/云希等，多音字准），
 * 再退到其它可用语音；Google 在线语音国内不可达，排除在外。
 */
function pickVoice(lang: 'zh' | 'en'): SpeechSynthesisVoice | undefined {
  const want = lang === 'zh' ? 'zh' : 'en';
  const list = currentVoices().filter(
    (v) => v.lang.toLowerCase().startsWith(want) && (v.localService || !/^google/i.test(v.name)),
  );
  if (list.length === 0) return undefined;
  const NATURAL = /xiaoxiao|yunxi|xiaoyi|yunyang|natural|aria|guy|jenny|sonja|tingting|婷婷/i;
  const natural = list.find((v) => NATURAL.test(v.name));
  return natural ?? list[0];
}

/**
 * 系统是否有该语言的可用语音：
 * - 优先本地语音；iPad/iPhone 等系统语音也视为可用
 * - 仅排除 Google 在线语音（国内不可达，桌面 Chrome 会列出它们导致无声）
 */
function hasVoiceFor(lang: 'zh' | 'en'): boolean {
  const want = lang === 'zh' ? 'zh' : 'en';
  return currentVoices().some(
    (v) => v.lang.toLowerCase().startsWith(want) && (v.localService || !/^google/i.test(v.name)),
  );
}

/**
 * 是否走离线引擎（Piper/espeak）：
 * 系统有该语言的【本地】语音 → 用系统（音质最佳、零延迟）；
 * 系统没有 → 用离线（Piper 神经语音，其次 espeak）
 */
function shouldUseOffline(lang: 'zh' | 'en'): boolean {
  return !hasVoiceFor(lang);
}

/** 用当前语言朗读文本（跟随"声音总开关 + 语音开关"；rate 越小越慢） */
export function speak(text: string, lang: 'zh' | 'en' = 'zh', rate = 0.92) {
  const { sound, voiceOn } = useStore.getState();
  if (!sound || !voiceOn || !text) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (shouldUseOffline(lang)) {
    newSpeech();
    void playOffline(text, lang, rate);
    return;
  }
  const synth = window.speechSynthesis;
  newSpeech();
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(lang);
  if (voice) u.voice = voice;
  u.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
  u.rate = rate;
  u.pitch = 1.15;
  synth.speak(u);
}

export function stopSpeaking() {
  newSpeech();
  stopOffline();
}

/** 朗读一句，读完后回调 onEnd（语音被关闭/不可用时也会回调，保证跟读流程不卡住） */
export function speakOnce(
  text: string,
  lang: 'zh' | 'en' = 'zh',
  rate = 0.92,
  onEnd?: () => void,
) {
  const { sound, voiceOn } = useStore.getState();
  if (
    !sound ||
    !voiceOn ||
    !text ||
    typeof window === 'undefined' ||
    !('speechSynthesis' in window)
  ) {
    window.setTimeout(() => onEnd?.(), 0);
    return;
  }
  const token = newSpeech();
  if (shouldUseOffline(lang)) {
    void playOffline(text, lang, rate, () => {
      if (token === speechToken) onEnd?.();
    });
    return;
  }
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(lang);
  if (voice) u.voice = voice;
  u.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
  u.rate = rate;
  u.pitch = 1.15;
  u.onend = () => {
    if (token === speechToken) onEnd?.();
  };
  u.onerror = () => {
    if (token === speechToken) onEnd?.();
  };
  synth.speak(u);
}

/** 逐句朗读序列：每句播完回调 onIndex（用于高亮跟随），全部播完回调 onEnd */
export function speakSeq(
  texts: string[],
  lang: 'zh' | 'en' = 'zh',
  rate = 0.9,
  onIndex?: (i: number) => void,
  onEnd?: () => void,
) {
  const { sound, voiceOn } = useStore.getState();
  if (!sound || !voiceOn || texts.length === 0) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const token = newSpeech();
  const synth = window.speechSynthesis;
  if (shouldUseOffline(lang)) {
    // 离线逐句连读（每句合成播放，支持高亮跟随与打断）
    void (async () => {
      for (let i = 0; i < texts.length; i++) {
        if (token !== speechToken) return;
        onIndex?.(i);
        await new Promise<void>((res) => playOffline(texts[i], lang, rate, res));
      }
      if (token === speechToken) onEnd?.();
    })();
    return;
  }
  const voice = pickVoice(lang);
  let i = 0;
  const speakOne = () => {
    if (token !== speechToken) return; // 已被停止/新朗读打断
    if (i >= texts.length) {
      onEnd?.();
      return;
    }
    onIndex?.(i);
    const u = new SpeechSynthesisUtterance(texts[i]);
    if (voice) u.voice = voice;
    u.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
    u.rate = rate;
    u.pitch = 1.15;
    const next = () => {
      i++;
      speakOne();
    };
    u.onend = next;
    u.onerror = next;
    synth.speak(u);
  };
  speakOne();
}

/* ---------- WebAudio 基础 ---------- */

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  try {
    if (!audioCtx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType = 'sine',
  vol = 0.25,
  out?: AudioNode,
) {
  const c = ctx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(out ?? c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

/* ---------- 音效（跟随"声音总开关"，与 BGM 音量独立） ---------- */

export function playSfx(kind: 'tap' | 'correct' | 'wrong' | 'win' | 'flip' | 'collect' | 'pop') {
  const { sound } = useStore.getState();
  if (!sound) return;
  try {
    switch (kind) {
      case 'tap':
        tone(660, 0, 0.1, 'triangle', 0.14);
        break;
      case 'flip':
        tone(520, 0, 0.07, 'triangle', 0.16);
        tone(760, 0.05, 0.08, 'triangle', 0.12);
        break;
      case 'pop':
        tone(880, 0, 0.06, 'square', 0.08);
        tone(1320, 0.04, 0.08, 'sine', 0.1);
        break;
      case 'correct':
        tone(523, 0, 0.14, 'sine', 0.22);
        tone(784, 0.12, 0.3, 'sine', 0.22);
        break;
      case 'collect':
        tone(659, 0, 0.1, 'triangle', 0.18);
        tone(880, 0.09, 0.14, 'triangle', 0.18);
        tone(1046, 0.18, 0.22, 'triangle', 0.16);
        break;
      case 'wrong':
        tone(220, 0, 0.28, 'sawtooth', 0.09);
        break;
      case 'win':
        [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.14, 0.32, 'triangle', 0.2));
        break;
    }
  } catch {
    /* 音频不可用时静默忽略 */
  }
}

/* ---------- 背景音乐（轻快五声音阶循环，WebAudio 合成） ---------- */

type MusicKind = 'lobby' | 'game';

/** 相对 C5 的半音阶旋律（C 大调五声音阶，欢快） */
const MELODIES: Record<MusicKind, { step: number; notes: number[]; bass: number[]; vol: number }> = {
  lobby: {
    step: 0.24,
    notes: [0, 4, 7, 9, 7, 4, 2, 4, 0, 4, 7, 9, 12, 9, 7, 4, 7, 9, 7, 4, 2, 0, -2, 0],
    bass: [0, -17, -19, -17, 0, -17, -19, -17],
    vol: 0.09,
  },
  game: {
    step: 0.18,
    notes: [7, 9, 12, 9, 7, 9, 7, 4, 5, 7, 9, 7, 4, 2, 4, 0],
    bass: [0, -17, -19, -17, 0, -17, -19, -17],
    vol: 0.07,
  },
};

const C5 = 523.25;
const semitone = (s: number) => C5 * Math.pow(2, s / 12);

class MusicBox {
  private timer: number | null = null;
  private nextTime = 0;
  private stepIdx = 0;
  private bassIdx = 0;
  private nodes = new Set<AudioScheduledSourceNode>();
  private current: MusicKind | null = null;
  /** 被自动暂停（如开关关闭）时保留 kind，恢复后继续 */
  private paused = false;

  tryStart(kind: MusicKind) {
    this.current = kind;
    this.paused = false;
    const { sound, musicOn } = useStore.getState();
    if (!sound || !musicOn) return;
    const c = ctx();
    if (!c || c.state !== 'running') return; // 等待用户手势后重试
    if (this.timer !== null) return; // 已在播放
    this.nextTime = c.currentTime + 0.06;
    this.stepIdx = 0;
    this.bassIdx = 0;
    this.timer = window.setInterval(() => this.tick(), 80);
  }

  stop() {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.nodes.forEach((n) => {
      try {
        n.stop();
      } catch {
        /* 已停止 */
      }
    });
    this.nodes.clear();
  }

  pause() {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.paused = true;
  }

  resume() {
    if (this.paused && this.current) {
      this.paused = false;
      this.tryStart(this.current);
    }
  }

  private tick() {
    const c = ctx();
    if (!c) return;
    const mel = MELODIES[this.current ?? 'lobby'];
    while (this.nextTime < c.currentTime + 0.5) {
      const s = mel.notes[this.stepIdx % mel.notes.length];
      const isBeat = this.stepIdx % 2 === 0;
      tone(semitone(s), this.nextTime - c.currentTime, mel.step * 1.6, 'triangle', mel.vol, c.destination);
      if (isBeat) {
        const b = mel.bass[this.bassIdx % mel.bass.length];
        tone(semitone(b), this.nextTime - c.currentTime, mel.step * 2.2, 'sine', mel.vol * 1.6);
      }
      this.nextTime += mel.step;
      this.stepIdx++;
      if (this.stepIdx % 2 === 0) this.bassIdx++;
    }
  }
}

const musicBox = new MusicBox();

let currentMusic: MusicKind | null = null;

export function startMusic(kind: MusicKind) {
  currentMusic = kind;
  // 首次可能在用户手势之前调用：若 AudioContext 未就绪，等手势后由 subscribe 重试
  musicBox.tryStart(kind);
  window.setTimeout(() => musicBox.tryStart(kind), 400);
}

export function stopMusic() {
  currentMusic = null;
  musicBox.stop();
}

// 跟随声音/BGM 开关自动启停
useStore.subscribe((s) => {
  if (!currentMusic) return;
  const should = s.sound && s.musicOn;
  if (!should) musicBox.pause();
  else musicBox.resume();
});

// 首次用户手势后兜底启动 BGM
if (typeof window !== 'undefined') {
  const unlock = () => {
    if (currentMusic) musicBox.tryStart(currentMusic);
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}
