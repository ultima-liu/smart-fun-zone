import { useCallback, useEffect, useRef, useState } from 'react';
import { lcsLen, normalizeText } from './speechCompare';

/** 浏览器语音识别会话的最小结构（兼容标准与 webkit 前缀实现，及测试假识别器） */
type SrSession = {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; abort?: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
};

/** 浏览器语音识别（跟读评分用） */
export function useAsr(onResult: (text: string) => void, lang = 'zh-CN') {
  const [state, setState] = useState({ supported: false, listening: false, said: '' });
  const cbRef = useRef(onResult);
  cbRef.current = onResult;
  const recRef = useRef<SrSession | null>(null);
  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setState((s) => ({ ...s, supported: !!(w.SpeechRecognition ?? w.webkitSpeechRecognition) }));
  }, []);
  // 结束当前会话：先摘掉回调再 abort——旧会话迟到的 onend/onerror 不能把新会话的收音状态打灭
  const stop = useCallback(() => {
    const rec = recRef.current;
    recRef.current = null;
    if (rec) {
      rec.onresult = null;
      rec.onend = null;
      rec.onerror = null;
      try { rec.abort?.(); } catch { /* 测试假识别器可能没有 abort */ }
    }
    setState((s) => ({ ...s, listening: false }));
  }, []);
  const start = useCallback(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SrSession; webkitSpeechRecognition?: new () => SrSession };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    stop(); // 上一段会话还在时先挂断（挂载即录 + 重复点「重新读」都从干净会话开始，避免两会话互踩）
    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = lang; rec.continuous = false; rec.interimResults = false;
    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setState((s) => ({ ...s, said: text }));
      cbRef.current(text);
    };
    const endSession = () => {
      if (recRef.current !== rec) return;
      recRef.current = null;
      setState((s) => ({ ...s, listening: false }));
    };
    rec.onend = endSession;
    rec.onerror = endSession;
    setState((s) => ({ ...s, listening: true, said: '' }));
    try { rec.start(); } catch { stop(); }
  }, [lang, stop]);
  // 卸载即挂断：弹窗关闭/组件卸载后收音不留在后台
  useEffect(() => () => stop(), [stop]);
  return { ...state, start, stop };
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
