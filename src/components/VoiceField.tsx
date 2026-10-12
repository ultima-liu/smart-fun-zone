import { useRef } from 'react';
import { useAsr } from '../speechAssess';

/** 口述内容整理成页面期望的格式：算式题把「加/减/等于」和半角符号统一成教材的全角写法。 */
export function normalizeSpokenText(text: string, mode: 'text' | 'math'): string {
  const cleaned = text.replace(/\s+/g, '').replace(/[。，,.!?？~～]+$/g, '');
  if (mode === 'text') return cleaned;
  const digits: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  return cleaned
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 65248))
    .replace(/[零〇一二两三四五六七八九十]+/g, (word) => {
      if (word.length === 1 && word !== '十') return String(digits[word]);
      if (/^[一二两三四五六七八九]?十[零〇一二两三四五六七八九]?$/.test(word)) {
        const [tens, ones] = word.split('十');
        return String((tens ? digits[tens] : 1) * 10 + (ones ? digits[ones] : 0));
      }
      return word; // 不猜测模糊或超出支持形式的读数，保留给孩子核对。
    })
    .replace(/加/g, '＋').replace(/减/g, '－').replace(/等于|得/g, '＝')
    .replace(/\+/g, '＋').replace(/-/g, '－').replace(/=/g, '＝')
    .replace(/＋{2,}/g, '＋').replace(/－{2,}/g, '－').replace(/＝{2,}/g, '＝');
}

/**
 * 语音输入字段：低年级孩子还不会写字，点「我来说」说出要写的内容即可填入，
 * 收音按钮与说理由环节的 mt-mic 同款（共用 useAsr）。文本框仍保留——
 * 不支持语音的浏览器、家长代填和 e2e 都走原来的输入路径。
 * math=true 时按算式规范口述（「8 加 9 等于 17」→「8＋9＝17」）。
 */
export default function VoiceField({
  value,
  onChange,
  ariaLabel,
  placeholder,
  maxLength,
  multiline = false,
  math = false,
  inputClass = '',
  className = '',
}: {
  value: string;
  onChange: (next: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
  math?: boolean;
  inputClass?: string;
  className?: string;
}) {
  const valueRef = useRef(value);
  valueRef.current = value;
  const asr = useAsr((heard) => {
    const said = normalizeSpokenText(heard, math ? 'math' : 'text');
    if (!said) return;
    const current = valueRef.current;
    onChange(current ? current + said : said);
  });
  const field = multiline
    ? <textarea className={inputClass} aria-label={ariaLabel} value={value} placeholder={placeholder} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} />
    : <input className={inputClass} aria-label={ariaLabel} value={value} placeholder={placeholder} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} />;

  return (
    <span className={`voice-field ${className}`}>
      {field}
      {asr.supported && (
        <button
          type="button"
          className={`mt-mic ${asr.listening ? 'listening' : ''}`}
          onClick={() => (asr.listening ? asr.stop() : asr.start())}
          aria-label="语音输入"
          aria-pressed={asr.listening}
          title="点一下，说出要写的内容"
        >
          {asr.listening ? '🎙️ 正在听…说完点这里' : '🎤 我来说'}
        </button>
      )}
    </span>
  );
}
