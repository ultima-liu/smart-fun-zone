/* =====================================================================
   离线语音引擎（不依赖系统语音、不依赖网络）
   - Piper 神经语音：英文 en_US-amy-medium、中文 zh_CN-huayan-medium
   - espeak-ng（GPL-3.0）：Piper 不可用时的最后兜底
   优先级由 speech.ts 决定：Piper 就绪 → 用 Piper；否则系统语音；最后 espeak
   ===================================================================== */

/* ---------- Piper（中英神经语音） ---------- */

type PiperEngineLike = {
  generate(text: string, voice: string, speaker?: number): Promise<{ file: Blob; duration: number }>;
  destroy(): void;
};

type PiperModule = {
  PiperWebEngine: new (opts: unknown) => PiperEngineLike;
  OnnxWebRuntime: new (opts: { basePath: string; numThreads?: number }) => unknown;
  PhonemizeWebRuntime: new (opts: { basePath: string }) => unknown;
};

const PIPER_VOICES: Record<'zh' | 'en', string> = {
  en: 'en_US-amy-medium',
  zh: 'zh_CN-huayan-medium',
};

type PiperStatus = 'loading' | 'ready' | 'broken';
let status: PiperStatus = 'loading';

/** Piper 引擎可用状态（speech.ts 据此决定是否走离线） */
export function piperStatus(): PiperStatus {
  return status;
}

/** 语音模型缓存：每个语言只加载一次（避免重复下载 63MB） */
const voiceCache: Partial<Record<'zh' | 'en', { config: Record<string, unknown>; blobUrl: string }>> = {};
let currentLang: 'zh' | 'en' = 'en';
/** 当前语速（合成前设置，provider 返回按语速调整的配置克隆） */
let currentRate = 0.95;

async function getVoiceData(lang: 'zh' | 'en'): Promise<[Record<string, unknown>, string]> {
  let cached = voiceCache[lang];
  if (!cached) {
    const name = PIPER_VOICES[lang];
    const config = (await (await fetch(`/piper/voices/${name}.onnx.json`)).json()) as Record<string, unknown>;
    const blob = await (await fetch(`/piper/voices/${name}.onnx`)).blob();
    cached = { config, blobUrl: URL.createObjectURL(blob) };
    voiceCache[lang] = cached;
  }
  // 语速：rate 越小越慢（length_scale 越大越慢）；克隆配置，不污染缓存
  const scale = 0.95 / currentRate;
  const cfg = cached.config;
  return [
    { ...cfg, inference: { ...(cfg.inference as Record<string, unknown>), length_scale: scale } },
    cached.blobUrl,
  ];
}

const localVoiceProvider = {
  fetch(): Promise<[Record<string, unknown>, string]> {
    return getVoiceData(currentLang);
  },
  destroy() {
    for (const lang of ['zh', 'en'] as const) {
      const c = voiceCache[lang];
      if (c?.blobUrl) URL.revokeObjectURL(c.blobUrl);
      delete voiceCache[lang];
    }
  },
};

let piperPromise: Promise<PiperEngineLike | null> | null = null;

function getPiper(): Promise<PiperEngineLike | null> {
  if (!piperPromise) {
    piperPromise = (async () => {
      try {
        const mod = (await import('piper-tts-web')) as unknown as PiperModule;
        const engine = new mod.PiperWebEngine({
          onnxRuntime: new mod.OnnxWebRuntime({ basePath: '/piper/onnx/', numThreads: 1 }),
          phonemizeRuntime: new mod.PhonemizeWebRuntime({ basePath: '/piper/piper/' }),
          expressionRuntime: { destroy: () => {} },
          voiceProvider: localVoiceProvider,
        });
        return engine;
      } catch (e) {
        console.error('piper init failed', e);
        status = 'broken';
        return null;
      }
    })();
  }
  return piperPromise;
}

/** 用 Piper 合成语音并返回音频 Blob（含语速调节；成功/失败更新引擎状态） */
export async function synthPiper(text: string, lang: 'zh' | 'en', rate: number): Promise<Blob | null> {
  if (status === 'broken') return null;
  const engine = await getPiper();
  if (!engine) return null;
  try {
    currentLang = lang;
    currentRate = rate;
    const res = await engine.generate(text, PIPER_VOICES[lang], 0);
    status = 'ready';
    return res.file;
  } catch (e) {
    console.error('piper synth failed', e);
    status = 'broken';
    return null;
  }
}

/* ---------- espeak-ng（最后兜底） ---------- */

type EspeakInstance = {
  FS: { readFile(path: string): Uint8Array };
};
type EspeakFactory = (opts: {
  arguments: string[];
  locateFile?: (path: string) => string;
}) => Promise<EspeakInstance>;

let espeakFactoryPromise: Promise<EspeakFactory> | null = null;

async function getEspeak(): Promise<EspeakFactory> {
  if (!espeakFactoryPromise) {
    espeakFactoryPromise = import('espeak-ng').then((m) => m.default as EspeakFactory);
  }
  return espeakFactoryPromise;
}

async function synthEspeak(text: string, lang: 'zh' | 'en', rate: number): Promise<ArrayBuffer | null> {
  try {
    const factory = await getEspeak();
    const fname = 'tts_out.wav';
    const voice = lang === 'zh' ? 'zh' : 'en-us';
    const speed = String(Math.max(80, Math.round(180 * rate)));
    const inst = await factory({
      arguments: ['-w', fname, '-v', voice, '-s', speed, text],
      locateFile: () => '/espeak-ng.wasm',
    });
    const data = inst.FS.readFile(fname);
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  } catch {
    return null;
  }
}

/* ---------- 播放 ---------- */

let currentAudio: HTMLAudioElement | null = null;

/** 停止当前离线朗读 */
export function stopOffline() {
  try {
    currentAudio?.pause();
  } catch {
    /* 已停止 */
  }
  currentAudio = null;
}

function playAudioBlob(blob: Blob, onEnd?: () => void) {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;
  const finish = () => {
    URL.revokeObjectURL(url);
    if (currentAudio === audio) currentAudio = null;
    onEnd?.();
  };
  audio.onended = finish;
  audio.onerror = finish;
  audio.play().catch(finish);
}

/** 播放离线语音（Piper 优先，失败退回 espeak），播完（或被停止）回调 onEnd */
export async function playOffline(
  text: string,
  lang: 'zh' | 'en',
  rate: number,
  onEnd?: () => void,
) {
  const blob = await synthPiper(text, lang, rate);
  if (blob) {
    playAudioBlob(blob, onEnd);
    return;
  }
  const buf = await synthEspeak(text, lang, rate);
  if (buf) playAudioBlob(new Blob([buf], { type: 'audio/wav' }), onEnd);
  else onEnd?.();
}

/** 预加载离线引擎（进入课程前调用，让首次朗读几乎零等待） */
export function preloadOffline(langs: ('zh' | 'en')[] = ['en', 'zh']) {
  void getPiper().then((engine) => {
    if (engine) {
      // 预热：各语言合成一小段，让 wasm 与语音模型全部就绪
      for (const l of langs) void synthPiper(l === 'zh' ? '你好' : 'Hello', l, 0.95);
    }
  });
  if (typeof fetch !== 'undefined') void fetch('/espeak-ng.wasm');
}
