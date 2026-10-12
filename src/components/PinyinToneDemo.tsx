import { useEffect, useRef, useState } from 'react';
import { playChineseReadingAudio, stopChineseReadingAudio } from '../chineseReadingAudio';
import { LESSON_NARRATION_CANCEL } from '../lessonTabNarration';
import './chinese-textbook-extras.css';

export const PINYIN_TONE_ROADS = [
  { name: '一声', cue: '平平走', path: 'M 24 40 L 176 40', symbol: 'ˉ' },
  { name: '二声', cue: '往上扬', path: 'M 24 103 L 176 28', symbol: 'ˊ' },
  { name: '三声', cue: '先降再升', path: 'M 24 65 Q 91 148 176 29', symbol: 'ˇ' },
  { name: '四声', cue: '往下降', path: 'M 24 28 L 176 110', symbol: 'ˋ' },
] as const;
const vowels = { a: ['ā', 'á', 'ǎ', 'à'], o: ['ō', 'ó', 'ǒ', 'ò'], e: ['ē', 'é', 'ě', 'è'] };

/** The textbook's four car journeys demonstrate pitch, not handwriting stroke order. */
export default function PinyinToneDemo({ onObserve }: { onObserve: (tones: string) => void }) {
  const [vowel, setVowel] = useState<keyof typeof vowels>('a');
  const [playing, setPlaying] = useState(-1);
  const [run, setRun] = useState(0);
  const root = useRef<HTMLElement>(null);
  const timer = useRef(0);
  useEffect(() => {
    const element = root.current;
    const cancel = () => { clearTimeout(timer.current); setPlaying(-1); stopChineseReadingAudio(); };
    element?.addEventListener(LESSON_NARRATION_CANCEL, cancel);
    return () => { clearTimeout(timer.current); element?.removeEventListener(LESSON_NARRATION_CANCEL, cancel); stopChineseReadingAudio(); };
  }, []);
  return <section ref={root} className="ct-tone-demo" data-chinese-leaf data-chinese-narration-mode="instructions-only"
    data-chinese-narration="看声调小汽车。一声平平走，二声往上扬，三声先降再升，四声往下降。点小汽车，看声调走向。">
    <header><h4>声调小汽车</h4><nav aria-label="选择单韵母">{Object.keys(vowels).map(key => <button type="button" key={key} aria-pressed={key === vowel} onClick={() => { clearTimeout(timer.current); stopChineseReadingAudio(); setPlaying(-1); setVowel(key as keyof typeof vowels); }}>{key}</button>)}</nav></header>
    <div className="ct-tone-road-grid">{PINYIN_TONE_ROADS.map((tone, index) => <button type="button" data-tab-audio key={index} aria-label={`${vowels[vowel][index]}，${tone.name}${tone.cue}`} className={playing === index ? 'is-moving' : ''} onClick={() => {
      clearTimeout(timer.current); setPlaying(index); setRun(value => value + 1);
      onObserve(vowels[vowel].join(' '));
      void playChineseReadingAudio([vowels[vowel][index]], () => undefined);
      timer.current = window.setTimeout(() => setPlaying(-1), 1800);
    }}>
      <span><b>{vowels[vowel][index]}</b><small>{tone.name} · {tone.cue}</small></span>
      <svg viewBox="0 0 200 140" aria-hidden="true">
        <path d={tone.path} className="ct-tone-road-edge"/><path d={tone.path} className="ct-tone-road"/><path d={tone.path} className="ct-tone-road-center"/>
        <g className="ct-tone-car" key={`${vowel}:${run}`} style={{ offsetPath: `path('${tone.path}')` }}>
          <path d="M-16-8 L-10-19 L8-19 L15-8 Z" fill="#dc6556"/><path d="M-7-16 H5 L10-8 H-11 Z" fill="#d5eef8"/>
          <rect x="-21" y="-9" width="42" height="13" rx="4" fill="#e85b4b"/>
          <circle cx="-13" cy="4" r="5" fill="#27334a"/><circle cx="13" cy="4" r="5" fill="#27334a"/>
        </g>
      </svg>
    </button>)}</div>
    <p>点小汽车，听一听，看声音怎样变化。</p>
  </section>;
}
