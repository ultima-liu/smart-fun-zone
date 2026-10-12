import { useCallback, useEffect, useRef, useState } from 'react';
import { lcsLen, normalizeText } from './speechCompare';
import { beginSpeechCapture } from './speechCapture';
import { openReadingMicrophone, supportsReadingAudioTrack, type ReadingMicrophone } from './readingMicrophone';

/** 浏览器识别会话，兼容标准与 webkit 前缀实现。 */
type SrSession = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives?: number;
  start: (track?: MediaStreamTrack) => void; stop?: () => void; abort?: () => void;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  onspeechend: (() => void) | null;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null;
  onend: (() => void) | null; onerror: ((event?: { error?: string }) => void) | null;
};
type AsrOptions = { continuous?: boolean; interimResults?: boolean; maxAlternatives?: number; stopOnSpeechEnd?: boolean; waitForAudio?: boolean; captureMicrophone?: boolean };

/** 识别器返回的真实候选；临时结果先显示，结束收音后再交给内容核对。 */
export function useAsr(onResult: (text: string, candidates?: readonly string[]) => void, lang = 'zh-CN', options: AsrOptions = {}) {
  const [state, setState] = useState({ supported: false, listening: false, preparing: false, finishing: false, said: '', draft: '', error: '' });
  const [microphone, setMicrophone] = useState({ audioUrl: '', device: '', level: 0, explicitTrack: false });
  const microphoneRef = useRef<ReadingMicrophone | null>(null);
  const audioUrlRef = useRef('');
  const generation = useRef(0);
  const clearRecording = useCallback(() => {
    generation.current++;
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = '';
    setMicrophone({ audioUrl: '', device: '', level: 0, explicitTrack: false });
  }, []);
  const cbRef = useRef(onResult); cbRef.current = onResult;
  const optionsRef = useRef(options); optionsRef.current = options;
  const recRef = useRef<SrSession | null>(null);
  const timerRef = useRef<number>();
  const finishingRef = useRef(false);
  const endRef = useRef<(() => void) | null>(null);
  const releaseCapture = useRef<(() => void) | null>(null);
  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setState(s => ({ ...s, supported: !!(w.SpeechRecognition ?? w.webkitSpeechRecognition) }));
  }, []);
  const stop = useCallback(() => {
    finishingRef.current = false;
    window.clearTimeout(timerRef.current); endRef.current = null;
    const rec = recRef.current; recRef.current = null;
    if (rec) {
      rec.onstart = null; rec.onaudiostart = null; rec.onspeechend = null; rec.onresult = null; rec.onend = null; rec.onerror = null;
      try { rec.abort?.(); } catch { /* already ended */ }
    }
    microphoneRef.current?.close(true); microphoneRef.current = null;
    releaseCapture.current?.(); releaseCapture.current = null;
    setState(s => ({ ...s, listening: false, preparing: false, finishing: false }));
  }, []);
  const finish = useCallback(() => {
    const rec = recRef.current;
    if (!rec || finishingRef.current) return;
    finishingRef.current = true;
    setState(s => ({ ...s, preparing: false, finishing: true }));
    window.clearTimeout(timerRef.current);
    // Some implementations never send onend after stop. Preserve their last transcript, then release capture.
    timerRef.current = window.setTimeout(() => {
      if (recRef.current !== rec) return;
      endRef.current?.();
      try { rec.abort?.(); } catch { /* already ended */ }
    }, 8_000);
    try {
      if (rec.stop) rec.stop();
      else { endRef.current?.(); rec.abort?.(); }
    } catch {
      endRef.current?.();
      try { rec.abort?.(); } catch { /* release attempted */ }
    }
  }, []);
  const start = useCallback(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SrSession; webkitSpeechRecognition?: new () => SrSession };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { setState(s => ({ ...s, error: '当前浏览器不支持语音识别，请换一个支持的浏览器。' })); return; }
    stop();
    clearRecording();
    const attempt = generation.current;
    let rec: SrSession;
    try { rec = new Ctor(); } catch { setState(s => ({ ...s, error: '语音识别暂时不可用，请再试一次。' })); return; }
    const receive = cbRef.current, config = optionsRef.current;
    let latest: string[] = [], delivered = '';
    const deliver = (candidates: string[]) => {
      const text = candidates[0] ?? '';
      const fingerprint = candidates.join('\u0000');
      if (!text.trim() || fingerprint === delivered) return;
      delivered = fingerprint;
      setState(s => ({ ...s, said: text, error: '' })); receive(text, candidates);
    };
    const endSession = (useDraft = true) => {
      if (recRef.current !== rec) return;
      if (useDraft) deliver(latest);
      if (recRef.current !== rec) return; // completion callback may already have stopped this session
      window.clearTimeout(timerRef.current); recRef.current = null; endRef.current = null;
      microphoneRef.current?.close(true); microphoneRef.current = null;
      rec.onstart = null; rec.onaudiostart = null; rec.onspeechend = null; rec.onresult = null; rec.onend = null; rec.onerror = null;
      releaseCapture.current?.(); releaseCapture.current = null;
      setState(s => ({ ...s, listening: false, preparing: false, finishing: false }));
    };
    recRef.current = rec; endRef.current = () => endSession();
    releaseCapture.current = beginSpeechCapture(stop);
    rec.lang = lang; rec.continuous = config.continuous ?? false;
    rec.interimResults = config.interimResults ?? false; rec.maxAlternatives = config.maxAlternatives ?? 1;
    const audioReady = () => {
      if (recRef.current !== rec) return;
      if (!finishingRef.current) window.clearTimeout(timerRef.current);
      setState(s => ({ ...s, preparing: false }));
    };
    // start only confirms that the service started. Actual capture can begin hundreds of ms later.
    rec.onstart = () => { if (!config.waitForAudio) audioReady(); };
    rec.onaudiostart = audioReady;
    rec.onspeechend = () => { if (recRef.current === rec && config.stopOnSpeechEnd) finish(); };
    rec.onresult = e => {
      if (recRef.current !== rec) return;
      const candidates = (finalOnly: boolean) => {
        let rows = [''];
        for (let i = 0; i < e.results.length; i++) {
          const result = e.results[i];
          if (finalOnly && result.isFinal === false) continue;
          const alternatives = Array.from(result).slice(0, 5).map(item => item.transcript.trim()).filter(Boolean);
          if (!alternatives.length) continue;
          rows = rows.flatMap(prefix => alternatives.map(text => [prefix, text].filter(Boolean).join(lang.startsWith('en') ? ' ' : ''))).slice(0, 25);
        }
        return [...new Set(rows.filter(Boolean))];
      };
      if (!finishingRef.current) window.clearTimeout(timerRef.current);
      latest = candidates(false);
      setState(s => ({ ...s, preparing: false, draft: latest[0] ?? '' }));
      deliver(candidates(true));
    };
    rec.onend = () => endSession();
    rec.onerror = event => {
      if (recRef.current !== rec) return;
      const code = event?.error;
      if (code === 'no-speech' && latest.length) { endSession(); return; }
      endSession(false);
      const error = code === 'not-allowed' || code === 'service-not-allowed' ? '请允许麦克风后再读一次。'
        : code === 'network' ? '语音识别连接失败，请稍后重试。'
        : code === 'audio-capture' ? '麦克风没有收到声音，请检查麦克风连接。'
        : code === 'language-not-supported' ? '当前识别服务不支持这个语言，请换一个浏览器。'
        : '没有收到识别文字，请等“正在听”出现后再读。';
      setState(s => ({ ...s, error }));
    };
    setState(s => ({ ...s, listening: true, preparing: true, finishing: false, said: '', draft: '', error: '' }));
    timerRef.current = window.setTimeout(() => {
      if (recRef.current !== rec) return;
      stop(); setState(s => ({ ...s, error: '语音识别启动超时，请检查网络后重试。' }));
    }, 12_000);
    const failed = (error: unknown) => {
      if (recRef.current !== rec) return;
      stop();
      const name = error instanceof DOMException ? error.name : '';
      setState(s => ({ ...s, error: name === 'NotAllowedError' ? '请允许麦克风后再读一次。' : name === 'NotFoundError' || name === 'NotReadableError' ? '没有可用的麦克风，请检查输入设备。' : '收音没有启动，请再试一次。' }));
    };
    if (config.captureMicrophone && supportsReadingAudioTrack() && typeof navigator.mediaDevices?.getUserMedia === 'function') {
      void openReadingMicrophone(
        level => { if (recRef.current === rec) setMicrophone(s => ({ ...s, level })); },
        blob => {
          if (generation.current !== attempt) return;
          if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = URL.createObjectURL(blob);
          setMicrophone(s => ({ ...s, audioUrl: audioUrlRef.current, level: 0 }));
        },
        device => { if (recRef.current === rec) setMicrophone(s => ({ ...s, device, explicitTrack: true })); },
      ).then(input => {
        // Permission prompts can outlive the activity, timeout or a newer attempt.
        if (recRef.current !== rec) { input.close(false); return; }
        microphoneRef.current = input;
        try { rec.start(input.track); } catch (error) { failed(error); }
      }).catch(failed);
    } else {
      try { rec.start(); } catch (error) { failed(error); }
    }
  }, [lang, stop, finish, clearRecording]);
  useEffect(() => () => { stop(); clearRecording(); }, [stop, clearRecording]);
  useEffect(() => { stop(); }, [lang, stop]);
  return { ...state, ...microphone, start, stop, finish, clearRecording };
}

/** 跟读相似度：汉字 LCS，阿拉伯数字按读音归一 */
export function readScore(target: string, said: string): number {
  const digitMap: Record<string, string> = { '0': '零', '1': '一', '2': '二', '3': '三', '4': '四', '5': '五', '6': '六', '7': '七', '8': '八', '9': '九' };
  const t = normalizeText(target);
  const s = normalizeText(said).replace(/\s/g, '');
  if (!s) return 0;
  const s2 = s.replace(/[0-9]/g, (d) => digitMap[d] ?? d);
  return Math.max(lcsLen(t, s) / Math.max(t.length, 1), lcsLen(t, s2) / Math.max(t.length, 1));
}
