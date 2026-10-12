import { useEffect, useRef, useState } from 'react';
import { playChineseReadingAudio, stopChineseReadingAudio } from '../chineseReadingAudio';
import { LESSON_NARRATION_CANCEL } from '../lessonTabNarration';
import { IconCourseSpeaker } from './icons';
import './pinyin-mouth-demo.css';

type Vowel = 'a' | 'o' | 'e';
const forms = {
  a: { sound: 'ā', cue: '张大嘴巴', detail: '嘴巴自然张大。', rx: 23, ry: 29 },
  o: { sound: 'ō', cue: '嘴巴圆圆', detail: '嘴唇拢成圆形。', rx: 18, ry: 20 },
  e: { sound: 'ē', cue: '嘴巴扁扁', detail: '嘴角向两边展开，不拢圆。', rx: 29, ry: 10 },
};

/** Front-view lip shapes demonstrate opening, rounding and spreading. */
export default function PinyinMouthDemo({ vowels, observed, onObserve }: {
  vowels: Vowel[]; observed: Set<string>; onObserve: (vowel: Vowel) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Vowel | null>(null);
  const [run, setRun] = useState(0);
  const attempt = useRef(0);
  const timer = useRef(0);
  const settle = useRef<((done: boolean) => void) | null>(null);
  useEffect(() => {
    const element = root.current;
    const cancel = () => {
      attempt.current++;
      clearTimeout(timer.current);
      settle.current?.(false); settle.current = null;
      setActive(null); stopChineseReadingAudio();
    };
    element?.addEventListener(LESSON_NARRATION_CANCEL, cancel);
    return () => { element?.removeEventListener(LESSON_NARRATION_CANCEL, cancel); cancel(); };
  }, []);

  const demonstrate = async (vowel: Vowel) => {
    const mine = ++attempt.current;
    clearTimeout(timer.current); settle.current?.(false);
    setActive(vowel); setRun(value => value + 1);
    const animation = new Promise<boolean>(resolve => {
      settle.current = resolve;
      timer.current = window.setTimeout(() => { settle.current = null; resolve(true); }, 1800);
    });
    const [shown] = await Promise.all([animation, playChineseReadingAudio([forms[vowel].sound], () => undefined)]);
    if (!shown || mine !== attempt.current) return;
    setActive(null); onObserve(vowel);
  };

  return <div ref={root} className="ct-mouth-demo" data-chinese-leaf data-chinese-narration-mode="instructions-only"
    data-chinese-narration="看口型，听发音。三张卡片分别示范张大嘴巴、圆圆嘴巴和扁扁嘴巴。点一张卡片，看嘴巴怎样变化，听发音，跟着试一试。">
    <div className="ct-mouth-grid">{vowels.map(vowel => {
      const form = forms[vowel];
      return <button type="button" key={vowel} data-tab-audio aria-label={`看 ${vowel} 的口型，听发音`} aria-pressed={active === vowel}
        className={`ct-mouth-card${active === vowel ? ' is-demonstrating' : ''}${observed.has(vowel) ? ' seen' : ''}`}
        onClick={() => { void demonstrate(vowel); }}>
        <span className="ct-mouth-letter">{vowel}</span>
        <svg viewBox="0 0 180 160" role="img" aria-label={`${vowel}：${form.cue}，正面口型示意`}>
          <ellipse cx="90" cy="82" rx="66" ry="72" fill="#ffe2c3" />
          <path d="M48 49 Q57 43 66 48 M114 48 Q123 43 132 49" fill="none" stroke="#795444" strokeWidth="4" strokeLinecap="round" />
          <path d="M53 64 Q58 59 63 64 M117 64 Q122 59 127 64" fill="none" stroke="#513d3c" strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="45" cy="83" rx="10" ry="6" fill="#f5afa0" opacity=".65" />
          <ellipse cx="135" cy="83" rx="10" ry="6" fill="#f5afa0" opacity=".65" />
          <path d="M87 74 Q81 85 92 85" fill="none" stroke="#da9d7e" strokeWidth="3" strokeLinecap="round" />
          <g key={active === vowel ? run : 'rest'} className="ct-mouth-lips">
            <ellipse cx="90" cy="116" rx={form.rx} ry={form.ry} fill="#633842" stroke="#cd6675" strokeWidth="6" />
            {vowel === 'a' && <path d="M76 132 Q90 123 104 132 Q91 144 76 132" fill="#ee95a3" />}
          </g>
        </svg>
        <strong>{form.cue}</strong><span className="ct-mouth-detail">{form.detail}</span>
        <span className="ct-mouth-play"><IconCourseSpeaker size={18} />{active === vowel ? '正在示范' : '看口型 · 听发音'}</span>
        <small>{observed.has(vowel) ? '✓ 已看示范，可再听' : '跟着口型试一试'}</small>
      </button>;
    })}</div>
  </div>;
}
