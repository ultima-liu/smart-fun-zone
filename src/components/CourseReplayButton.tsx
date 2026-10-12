import { useId, type MouseEventHandler } from 'react';
import { courseAudioPlaybackState, useCourseAudioPlayback, withCourseAudioOwner } from '../courseAudioPlayback';
import { IconCourseSpeaker } from './icons';
import './course-replay-button.css';

/** 三科共用重听入口：小图标、完整触控区，文字名称留给辅助阅读与悬停提示。 */
export default function CourseReplayButton({ onClick, label = '再听一遍', title = label, disabled = false, className = '', playbackOwner }: {
  onClick: MouseEventHandler<HTMLButtonElement>; label?: string; title?: string; disabled?: boolean; className?: string; playbackOwner?: string;
}) {
  const id = useId();
  const owner = playbackOwner ?? id;
  const playback = useCourseAudioPlayback();
  const playing = playback.busy && playback.owner === owner;
  return <button type="button" data-tab-audio className={`course-replay-button ${playing ? 'is-playing' : ''} ${className}`.trim()} aria-label={label} aria-busy={playing} title={playing ? '正在播放' : playback.busy ? '正在播放，请稍等' : title} disabled={disabled || playback.busy} onClick={event => {
    if (disabled || courseAudioPlaybackState().busy) return;
    withCourseAudioOwner(owner, () => onClick(event));
  }}><IconCourseSpeaker size={24} /></button>;
}
