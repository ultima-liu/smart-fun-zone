import { IconPlay, IconSpeakerOn } from './icons';
import './audio-player.css';

/** A compact playback control; the caller owns audio and reports its real state. */
export default function AudioPlayer({ title, state, disabled = false, onPlay }: {
  title: string;
  state: 'idle' | 'playing' | 'played' | 'error';
  disabled?: boolean;
  onPlay: () => void;
}) {
  const playing = state === 'playing';
  const action = playing ? '正在播放' : disabled ? '声音已关闭' : state === 'played' ? '再听一次' : state === 'error' ? '重新播放' : '点击播放';
  return <div className={`audio-player${playing ? ' is-playing' : ''}${disabled ? ' is-disabled' : ''}`}>
    <button type="button" className="audio-player-control" aria-label={title} title={action} data-tab-audio disabled={disabled || playing} onClick={onPlay}>
      {playing ? <IconSpeakerOn size={20} aria-hidden="true" /> : <IconPlay size={22} aria-hidden="true" />}
    </button>
    <div className="audio-player-copy"><strong>{title}</strong><span>{action}</span></div>
    <div className="audio-player-wave" aria-hidden="true">{[0, 1, 2, 3, 4].map(index => <i key={index} />)}</div>
  </div>;
}
