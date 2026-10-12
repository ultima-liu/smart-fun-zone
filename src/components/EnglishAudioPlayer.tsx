import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { EnglishOriginalRecording } from '../content/englishG3Audio';
import { stopEnglishNarration } from '../englishTabNarration';
import { IconPlay } from './icons';

const timeLabel = (seconds: number) => {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};
const recordingLabel = (clip: EnglishOriginalRecording) => /first sound/i.test(clip.title)
  ? '首音辨音 · Listen and circle'
  : /last sound/i.test(clip.title) ? '末音辨音 · Listen and circle'
    : clip.title.replace(/^Unit \d+\s*(?:[ABC]\s+)?/, '');

function AudioTrack({ clip, label, picker, onPlayChange }: {
  clip: EnglishOriginalRecording; label: string; picker?: ReactNode;
  onPlayChange?: (playing: boolean) => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(clip.seconds);
  const [error, setError] = useState(false);
  useEffect(() => {
    const element = audio.current;
    return () => { element?.pause(); };
  }, []);
  const play = () => {
    const element = audio.current;
    if (!element) return;
    stopEnglishNarration();
    document.querySelectorAll('audio').forEach(other => { if (other !== element) other.pause(); });
    setError(false);
    setLoading(true);
    if (element.ended) element.currentTime = 0;
    void element.play().catch(reason => { setLoading(false); if (reason?.name !== 'AbortError') setError(true); });
  };
  const paused = () => { setPlaying(false); setLoading(false); onPlayChange?.(false); };
  return <div className={`en-audio-player${playing ? ' is-playing' : ''}`} role="group" aria-label={`${label}教材原声`} data-tab-audio>
    <button type="button" className="en-audio-play" aria-label={`${playing ? '暂停' : loading ? '取消播放' : '播放'}${label}教材原声`} onClick={() => {
      if (playing || loading) { audio.current?.pause(); paused(); } else play();
    }}>
      {playing || loading ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM14 5h4v14h-4z" fill="currentColor" /></svg> : <IconPlay size={22} />}
    </button>
    <div className="en-audio-info"><span className="en-audio-kicker"><span className="en-audio-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span><span>教材原声{loading ? ' · 加载中' : playing ? ' · 播放中' : ''}</span></span>
      {picker ?? <strong title={clip.title}>{recordingLabel(clip)}</strong>}
      {clip.slot === 'learn' && <small>Part A / B 词汇汇总</small>}
    </div>
    <input className="en-audio-progress" type="range" min={0} max={duration} step={0.1} value={Math.min(current, duration)} disabled={!ready}
      aria-label={`${label}播放进度`} aria-valuetext={`${timeLabel(current)}，共 ${timeLabel(duration)}`}
      style={{ backgroundImage: `linear-gradient(to right, var(--en-audio-accent), var(--en-audio-accent-soft) ${duration ? current / duration * 100 : 0}%, var(--en-audio-track) 0)` }}
      onChange={event => { const value = Number(event.target.value); if (audio.current) audio.current.currentTime = value; setCurrent(value); }} />
    <span className="en-audio-time">{timeLabel(current)}<i> / </i>{timeLabel(duration)}</span>
    <button type="button" className="en-audio-replay" aria-label={`重播${label}教材原声`} title="从头播放" onClick={() => { if (audio.current) audio.current.currentTime = 0; setCurrent(0); play(); }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 10a8 8 0 1 1 .8 7M4 4v6h6" /></svg>
    </button>
    {error && <small className="en-audio-error" role="status">播放未成功，点击播放重试</small>}
    <audio ref={audio} preload="none" src={clip.src} aria-label={clip.title}
      onLoadedMetadata={event => { const seconds = event.currentTarget.duration; if (Number.isFinite(seconds)) setDuration(seconds); setReady(true); }}
      onTimeUpdate={event => setCurrent(event.currentTarget.currentTime)}
      onPlay={event => { stopEnglishNarration(event.currentTarget); document.querySelectorAll('audio').forEach(other => { if (other !== event.currentTarget) other.pause(); }); setPlaying(true); }}
      onPlaying={() => { setLoading(false); onPlayChange?.(true); }} onWaiting={() => setLoading(true)} onPause={paused} onEnded={paused}
      onError={() => { paused(); setError(true); }} />
  </div>;
}

/** 同一教材栏目有多段录音时，直接在播放条里切换。 */
export default function EnglishAudioPlayer({ clips, label, onPlayChange }: {
  clips: readonly EnglishOriginalRecording[]; label: string; onPlayChange?: (playing: boolean) => void;
}) {
  const [selected, setSelected] = useState(0);
  const id = useId();
  const clip = clips[Math.min(selected, clips.length - 1)];
  if (!clip) return null;
  const picker = clips.length > 1 ? <select id={id} aria-label="选择录音" value={selected} onChange={event => {
    onPlayChange?.(false); setSelected(Number(event.target.value));
  }}>{clips.map((item, index) => <option key={item.key} value={index}>{recordingLabel(item)}</option>)}</select> : undefined;
  return <AudioTrack key={clip.key} clip={clip} label={label} picker={picker} onPlayChange={onPlayChange} />;
}
