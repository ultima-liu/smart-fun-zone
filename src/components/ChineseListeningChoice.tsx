import AudioPlayer from './AudioPlayer';
import { useEffect, useRef, useState } from 'react';
import { playChineseReadingAudio, stopChineseReadingAudio } from '../chineseReadingAudio';
import { useStore } from '../store';
import './chinese-listening-choice.css';

const ordinals = ['一', '二', '三', '四', '五', '六'];
export const chineseListeningOptionsText = (choices: string[]) =>
  `请听选项。${choices.map((choice, index) => `选项${ordinals[index] ?? index + 1}，${choice}`).join('。')}。`;

/** Recognition choices stay silent; other listening tasks can narrate choices after the stimulus. */
export default function ChineseListeningChoice({ title, prompt, progress, listenLabel, choices, readOptions = true, readOnly = false, playTarget, onChoose }: {
  title: string; prompt: string; progress: string; listenLabel: string; choices: string[]; readOptions?: boolean; readOnly?: boolean;
  playTarget: () => Promise<boolean>; onChoose: (choice: string) => void;
}) {
  const sound = useStore(state => state.sound && state.voiceOn);
  const host = useRef<HTMLDivElement>(null);
  const operation = useRef(0);
  const busy = useRef(false);
  const [phase, setPhase] = useState<'idle' | 'target' | 'options' | 'ready' | 'error'>('idle');
  const playing = phase === 'target' || phase === 'options';
  const visible = () => Boolean(host.current && !host.current.closest('[hidden],[aria-hidden="true"]'));
  useEffect(() => {
    const cancel = () => {
      operation.current++;
      if (busy.current) stopChineseReadingAudio();
      busy.current = false;
      setPhase('idle');
    };
    if (!sound) cancel();
    const observer = new MutationObserver(() => { if (!visible()) cancel(); });
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['hidden', 'aria-hidden'] });
    return () => { observer.disconnect(); operation.current++; if (busy.current) stopChineseReadingAudio(); busy.current = false; };
  }, [sound]);
  const listen = async () => {
    if (!sound || busy.current || !visible()) return;
    const request = ++operation.current;
    busy.current = true;
    setPhase('target');
    stopChineseReadingAudio();
    const current = () => request === operation.current && visible() && useStore.getState().sound && useStore.getState().voiceOn;
    const finish = (success: boolean) => { busy.current = false; setPhase(success ? 'ready' : 'error'); };
    try {
      const played = await playTarget();
      if (!current()) return;
      if (!played) { finish(false); return; }
      if (!readOptions) { finish(true); return; }
      setPhase('options');
      const optionsPlayed = await playChineseReadingAudio([chineseListeningOptionsText(choices)], () => undefined);
      if (current()) finish(optionsPlayed);
    } catch { if (current()) finish(false); }
  };
  const status = !sound ? '请打开声音，再播放音频。'
    : phase === 'target' ? readOptions ? '认真听，播放完后会接着读选项。' : '认真听词语和要找的字，听完后再选择。'
    : phase === 'options' ? '正在读选项，读完就可以选择。'
    : phase === 'ready' ? readOnly ? '听完了，可以再听一次。' : '听完了，选出你听到的答案。'
    : phase === 'error' ? '音频没有完整播放，请再听一次。'
    : readOptions ? '点击播放，听完后会接着读选项。' : '点击播放，听清词语和要找的字。';
  return <div ref={host} className="ct-listen-choice">
    <header className="ct-listen-question"><span className="ct-listen-progress">{progress}</span><h3>{title}</h3><p>{prompt}</p></header>
    <div className="ct-listen-workspace">
      <div className="ct-listen-play">
        <AudioPlayer title={listenLabel} state={playing ? 'playing' : phase === 'ready' ? 'played' : phase === 'error' ? 'error' : 'idle'} disabled={!sound} onPlay={() => void listen()} />
        <p role="status">{status}</p>
      </div>
      <div className="ct-listen-answer" role="group" aria-label="选择答案">
        <div className="ct-listen-options" style={{ gridTemplateColumns: `repeat(${choices.length}, minmax(0, 1fr))` }}>{choices.map(choice => <button type="button" key={choice} aria-label={choice} disabled={readOnly || !sound || phase !== 'ready'} onClick={() => onChoose(choice)}><b>{choice}</b></button>)}</div>
      </div>
    </div>
  </div>;
}
