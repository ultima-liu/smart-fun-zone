import { playSfx, speakOnce } from '../speech';

/** 小节说明的小喇叭：点击朗读该节标题+说明（不识字儿童的手动重听入口，不自动出声） */
export default function SpeakChip({ text, label = '听说明' }: { text: string; label?: string }) {
  return <button className="ct-speak-chip" aria-label={label} title={label} onClick={() => { playSfx('tap'); speakOnce(text, 'zh', .82); }}>🔊</button>;
}
