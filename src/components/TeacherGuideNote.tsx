import { useEffect, useState } from 'react';
import { isSpeaking, speakAfterCurrent, speakOnce } from '../speech';
import { volcDegraded } from '../volcTts';

/* ============================================================
   聪聪语音导览（语文课本各页共用）：不识字的孩子只靠听就能走完一页。
   规则只有一条——听聪聪的话；想再听，点聪聪。
   ============================================================ */

/** 浏览器自动播放策略：应用内出现第一次点击（包括点进本页的那次导航点击）即允许自动出声 */
let userInteracted = false;
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => { userInteracted = true; }, { once: true, capture: true });
}

/** 自动导览播报：未交互前不出声（浏览器自动播放限制），交互过则整段读出 */
export const narrate = (text: string) => {
  console.log('[narrate] called, interacted=', userInteracted, JSON.stringify(text.slice(0,12)));
  if (!userInteracted) return;
  speakOnce(text, 'zh', .86);
};

/** 接续导览播报：不打断正在播的语音（如刚点亮的卡片、刚答对的点评），等它播完再讲 */
export const narrateAfterCurrent = (text: string) => {
  if (!userInteracted) return;
  speakAfterCurrent(text, 'zh', .86);
};

/** 聪聪老师导览条：进入页面/阶段自动讲一次引导，可随时再听一遍；TTS 降级时提示 */
export default function TeacherGuideNote({ text }: { text: string }) {
  const [voiceDown, setVoiceDown] = useState(volcDegraded());
  useEffect(() => {
    const onDown = () => setVoiceDown(true);
    window.addEventListener('volc-tts-degraded', onDown);
    return () => window.removeEventListener('volc-tts-degraded', onDown);
  }, []);
  // 只用定时器+清理保证"进入播报一次"：不能用 said ref 挡重入——
  // StrictMode（dev）下 effect 会挂载→清理→重跑，第二遍会被 ref 挡住导致永不播报。
  // 依赖必须是 []：导览文案会随进度变（如"已看过X项"），跟着 text 重播会
  // 在孩子每次点读 420ms 后重新武装定时器，把刚点的第一句内容语音打断。
  useEffect(() => {
    const timer = setTimeout(() => {
      // 孩子已经抢先点了内容语音（点读/连播）时自动让位；导览文字仍在条上，可点"再听一遍"
      if (isSpeaking()) return;
      narrate(text);
    }, 420);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <section className="ct-teacher-note">
    <span aria-hidden="true">🤖</span>
    <div><b>聪聪老师</b><p>{text}</p>{voiceDown && <i className="ct-teacher-down">🔇 语音服务暂时不可用，课程其他功能不受影响。</i>}</div>
    <button className="ct-note-replay" onClick={() => speakOnce(text, 'zh', .86)}>🔊 再听一遍</button>
  </section>;
}
