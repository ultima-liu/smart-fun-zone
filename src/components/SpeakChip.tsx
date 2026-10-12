import CourseReplayButton from './CourseReplayButton';
import { playSfx, speakOnce } from '../speech';

/** 小节说明的小喇叭：点击朗读该节标题+说明（不识字儿童的手动重听入口，自动朗读由所在页面统一调度） */
export default function SpeakChip({ text, label = '听说明' }: { text: string; label?: string }) {
  return <CourseReplayButton label={label} onClick={() => { playSfx('tap'); speakOnce(text, 'zh', .82); }} />;
}
