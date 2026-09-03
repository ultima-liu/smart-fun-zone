/* =====================================================================
   火山引擎 豆包语音合成大模型 2.0（seed-tts-2.0）——唯一语音通道，无兜底
   - 接口：POST /api/v3/tts/unidirectional/sse（SSE 流式，base64 MP3 分片）
   - 鉴权：X-Api-Key 由 Vite dev/preview 代理在服务端注入（.env.local 的
     VOLC_SPEECH_API_KEY），前端不持有密钥、也不存在 CORS 问题
   - 音色默认：中文 爽快思思 zh_female_shuangkuaisisi_uranus_bigtts（可用
     VITE_VOLC_SPEAKER_ZH 覆盖），英文 Dacey en_female_dacey_uranus_bigtts
     （可用 VITE_VOLC_SPEAKER_EN 覆盖）
   - 未配置密钥时静默（页面给出配置提示），失败只回调 onEnd，绝不降级
   ===================================================================== */

/** 由 vite.config.ts 构建期注入：代理是否已配置服务端密钥 */
declare const __VOLC_TTS_KEY_PRESENT__: boolean;

const ENDPOINT = '/api/volc-tts/api/v3/tts/unidirectional/sse';
const RESOURCE_ID = 'seed-tts-2.0';

const VOICES: Record<'zh' | 'en', string> = {
  zh: import.meta.env.VITE_VOLC_SPEAKER_ZH ?? 'zh_female_shuangkuaisisi_uranus_bigtts',
  en: import.meta.env.VITE_VOLC_SPEAKER_EN ?? 'en_female_dacey_uranus_bigtts',
};

export function volcConfigured(): boolean {
  const w = window as unknown as { __VOLC_TTS_ENABLED__?: boolean };
  if (w.__VOLC_TTS_ENABLED__ === false) return false; // 测试钩子
  return __VOLC_TTS_KEY_PRESENT__;
}

/** 去除 emoji 等符号（避免 TTS 读出乱码），保留文字/数字/标点 */
function stripEmoji(s: string): string {
  return s
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

let current: HTMLAudioElement | null = null;

/** 停止当前朗读（开始新朗读前调用；停掉的朗读不会再回调） */
export function stopVolc() {
  try {
    current?.pause();
  } catch {
    /* ignore */
  }
  current = null;
}

function playAudioBlob(blob: Blob, onEnd?: () => void) {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  current = audio;
  const finish = () => {
    URL.revokeObjectURL(url);
    if (current === audio) current = null;
    onEnd?.();
  };
  audio.onended = finish;
  audio.onerror = finish;
  audio.play().catch(finish);
}

/** 读 SSE 响应，拼接 base64 音频分片 */
async function readSseAudio(res: Response): Promise<Blob | null> {
  if (!res.ok || !res.body) return null;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const chunks: Uint8Array[] = [];
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl = buf.indexOf('\n');
    while (nl !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith('data:')) {
        const payload = line.slice(5).trim();
        if (payload) {
          try {
            const d = JSON.parse(payload) as { code?: number; message?: string; data?: string };
            const code = d.code ?? 0;
            if (code !== 0 && code !== 20000000) {
              console.warn('volc tts api error:', code, d.message);
              return null;
            }
            if (d.data) {
              const bin = atob(d.data);
              const bytes = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
              chunks.push(bytes);
            }
          } catch (e) {
            console.warn('volc tts parse error:', e);
          }
        }
      }
      nl = buf.indexOf('\n');
    }
  }
  if (chunks.length === 0) return null;
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const merged = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    merged.set(c, off);
    off += c.length;
  }
  return new Blob([merged], { type: 'audio/mpeg' });
}

/**
 * 用 seed-tts-2.0 朗读一段文本（流式合成 → MP3 播放）。
 * 无论成功/失败/未配置，都会回调 onEnd（保证跟读等流程不卡住）。
 */
export async function speakVolc(
  text: string,
  lang: 'zh' | 'en',
  rate = 0.92,
  onEnd?: () => void,
): Promise<void> {
  if (!volcConfigured()) {
    window.setTimeout(() => onEnd?.(), 0);
    return;
  }
  const clean = stripEmoji(text);
  if (!clean) {
    window.setTimeout(() => onEnd?.(), 0);
    return;
  }
  try {
    // 语速映射：0.92x → -8；1.0x → 0；上限 100（2.0x）、下限 -50（0.5x）
    const speechRate = Math.max(-50, Math.min(100, Math.round((rate - 1) * 100)));
    const body = {
      user: { uid: 'smart-fun-zone' },
      req_params: {
        text: clean,
        speaker: VOICES[lang],
        sample_rate: 24000,
        audio_params: {
          format: 'mp3',
          speech_rate: speechRate,
          loudness_rate: 0,
          bit_rate: 64000,
        },
        additions: JSON.stringify({
          post_process: { pitch: 0 },
          disable_markdown_filter: true,
          enable_latex_tn: false,
        }),
      },
    };
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Resource-Id': RESOURCE_ID,
        'X-Api-Request-Id': uuid(),
      },
      body: JSON.stringify(body),
    });
    const blob = await readSseAudio(res);
    if (!blob) {
      window.setTimeout(() => onEnd?.(), 0);
      return;
    }
    stopVolc();
    playAudioBlob(blob, onEnd);
  } catch (e) {
    console.warn('volc tts exception:', e);
    window.setTimeout(() => onEnd?.(), 0);
  }
}
