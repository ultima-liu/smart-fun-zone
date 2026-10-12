import CourseReplayButton from './CourseReplayButton';
import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import VoiceField from './VoiceField';
import { ContentPages } from './ScreenPages';
import { api } from '../api';
import { speakOnce } from '../speech';
import { stopChineseReadingAudio } from '../chineseReadingAudio';
import '../lesson-help.css';

export default function LessonHelp({ title, context, subject }: { title: string; context: string | (()=>string); subject: string }) {
  const ask = { title, context, quick: ['这道题怎么想？', '请给我一个提示', '这个词是什么意思？'] };
  const [askOpen, setAskOpen] = useState(false);
  const [msgs, setMsgs] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [askDown, setAskDown] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!askOpen) return;
    const trigger = triggerRef.current;
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setAskOpen(false); }
      if (event.key !== 'Tab') return;
      const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea,[tabindex="0"]') ?? [])].filter(element => element.getBoundingClientRect().width > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); trigger?.focus(); };
  }, [askOpen]);
  const ask_ = async (question: string) => {
    const q = question.trim();
    if (!q || loading || !ask) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', content: q }]);
    setLoading(true);
    // 每次都带上课文上下文 preamble，保证回答围绕本课内容
    const preamble = `你是小学${subject === '英语' ? '三年级' : '一年级'}${subject}课《${ask.title}》的老师聪聪。课文与当前任务：${typeof ask.context === 'function' ? ask.context() : ask.context}。用适合${subject === '英语' ? '八到九岁' : '六岁'}孩子的两到四句短话回答。先引导孩子看图、读原文或实际尝试，再给一个具体提示。检查题默认不直接给答案。${subject === '英语' ? '英语歌曲、孤立音位与辨音题使用教材原声，不能用普通朗读代替。英文例句短且符合当前课文。' : '拼音声母、韵母不要用普通文字合成冒充准确本音；需要时请孩子听本页录音或请老师、家人示范。'}引导孩子在本页原作答区写答案、说想法或完成书写，输入结束后会自动检查；普通问答不直接修改完成状态，也不凭自述或文字识别认证发音和书写。无关问题引导回本课。`;
    const history = msgs.slice(-6);
    const r = await api.buddyChat([{ role: 'user', content: preamble }, ...history, { role: 'user', content: q }]);
    setLoading(false);
    if (r && r.ok && r.reply) {
      setMsgs((m) => [...m, { role: 'assistant', content: r.reply as string }]);
    } else {
      setAskDown(true);
    }
  };

  return <>
    <button type="button" className="lesson-help-icon" ref={triggerRef} aria-label="不懂就问" title="不懂就问" aria-haspopup="dialog" aria-expanded={askOpen} onClick={() => { stopChineseReadingAudio(); setAskOpen(true); }}>
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M9 10h26a6 6 0 0 1 6 6v15a6 6 0 0 1-6 6H21l-9 7v-7H9a6 6 0 0 1-6-6V16a6 6 0 0 1 6-6Z" fill="#fff8da" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M18 21a5 5 0 1 1 8 4c-2 1-3 2-3 4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /><circle cx="23" cy="33" r="1.6" fill="currentColor" />
        <path d="m38 2 1.4 3.6L43 7l-3.6 1.4L38 12l-1.4-3.6L33 7l3.6-1.4L38 2Z" fill="#eaa936" />
      </svg>
      <span className="lesson-help-label"><b>不懂就问</b><small>点我问聪聪</small></span>
    </button>
    {askOpen && <Modal onClose={() => setAskOpen(false)}>
      <div className="lesson-help-dialog" role="dialog" aria-modal="true" aria-label="不懂就问聪聪老师" ref={dialogRef}>
        <header><div><h2>不懂就问</h2><p>聪聪陪你一起想 · {ask.title}</p></div><button type="button" aria-label="关闭答疑" onClick={() => setAskOpen(false)}>×</button></header>
        <div className="lesson-ask-panel">
          {msgs.length === 0 && <div className="lesson-ask-empty"><p>哪里不明白就问聪聪老师，她会结合课文讲给你听。</p><div className="lesson-ask-quick">{ask.quick.map(q => <button key={q} onClick={() => ask_(q)} disabled={loading}>{q}</button>)}</div></div>}
          {(msgs.length > 0 || loading) && <div className="lesson-help-messages"><ContentPages kind="messages" followEnd={msgs.length + Number(loading)}>
            {msgs.map((m, i) => <div key={i} className={`lesson-ask-msg ${m.role}`}>
              {m.role === 'assistant' && <><span className="lesson-ask-avatar" aria-hidden="true">🤖</span><CourseReplayButton label="朗读回答" onClick={() => speakOnce(m.content, 'zh', subject === '英语' ? .86 : .9, undefined, subject === '英语' ? 'english' : subject === '语文' ? 'chinese' : undefined)} /></>}
              <p>{m.content}</p>
            </div>)}
            {loading && <div className="lesson-ask-msg assistant" role="status"><span className="lesson-ask-avatar" aria-hidden="true">🤖</span><p className="lesson-ask-thinking">聪聪正在想…</p></div>}
          </ContentPages></div>}
          {askDown && <p className="lesson-ask-down" role="status">🔇 聪聪暂时回答不了（需要登录孩子或家长账号，且 AI 服务已配置），稍后再试哦。</p>}
          <form className="lesson-ask-form" onSubmit={e => { e.preventDefault(); ask_(input); }}>
            <VoiceField value={input} onChange={setInput} ariaLabel="向聪聪提问" placeholder="说出你的问题" maxLength={120} />
            <button type="submit" disabled={!input.trim() || loading}>发送</button>
          </form>
        </div>
      </div>
    </Modal>}
  </>;
}

