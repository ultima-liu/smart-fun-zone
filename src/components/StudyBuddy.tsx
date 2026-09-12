import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { speak, stopSpeaking, playSfx } from '../speech';
import Mascot, { type Pose } from './Mascot';
import { IconClose, IconMic } from './icons';
import { EMPTY } from '../features';
import { allNodes, type StoryNode } from '../content/story';
import { tryCompleteStoryNode } from '../storyProgress';

type Msg = { role: 'user' | 'assistant'; content: string };

/** 浏览器语音识别的最小结构化类型 */
interface SR {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: unknown) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SRConstructor = new () => SR;

function srCtor(): SRConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

interface TranscriptEvent {
  resultIndex: number;
  results: { isFinal: boolean; [i: number]: { transcript: string } }[];
}

const QUICK = ['这个字怎么读？', '给我讲个成语故事', '帮我出几道口算题'];
/** 会话记忆本地存储 key：多轮记忆保留（超过 SESSION_TTL 未使用自动开启新会话） */
const SESSION_KEY = 'sfz_buddy_session_v1';
const SESSION_TTL = 60 * 60 * 1000; // 60 分钟

/** 学习助手「小卷」：全局悬浮球 + 面板 + 文字/语音问答 + 语音唤醒 */
export default function StudyBuddy() {
  const buddyOpen = useStore((s) => s.buddyOpen);
  const buddyWakeOn = useStore((s) => s.buddyWakeOn);
  const toggleBuddy = useStore((s) => s.toggleBuddy);
  const setBuddyWake = useStore((s) => s.setBuddyWake);
  const openBuddy = useStore((s) => s.openBuddy);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [micErr, setMicErr] = useState<string | null>(null);
  const [srSupported] = useState(() => srCtor() !== undefined);
  const recRef = useRef<SR | null>(null);
  const wakeRef = useRef<SR | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // 小卷剧情：仅当它是主线中当前唯一可推进的节点时，才由全局助手承接对话。
  // 这样晶晶的档案库引导（及其间的前置节点）会始终先于小卷出现。
  const childId = useStore((s) => s.activeChildId);
  const doneList = useStore((s) => (s.activeChildId ? s.storyDone[s.activeChildId] ?? EMPTY : EMPTY));
  const [storyIdx, setStoryIdx] = useState(0);
  const [storyDoneUi, setStoryDoneUi] = useState(false);

  const buddyStory = useMemo<StoryNode | null>(() => {
    if (!childId || storyDoneUi) return null;
    const done = new Set(doneList);
    const current = allNodes().find((n) => !done.has(n.id));
    return current?.rule === 'visitBuddy' ? current : null;
  }, [childId, doneList, storyDoneUi]);

  // 剧情开始：面板打开且有剧情 → 朗读第一句
  useEffect(() => {
    if (buddyStory && buddyOpen && storyIdx === 0) {
      const line = buddyStory.lines?.[0];
      if (line) speak(line.zh, 'zh');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buddyStory?.id, buddyOpen]);


  // 自动滚到底部
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  // 会话记忆：恢复本地记录（超时则清空）；首次挂载不写，避免空数组覆盖
  const skipSave = useRef(true);
  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ msgs: messages, at: Date.now() }));
    } catch {
      /* ignore */
    }
  }, [messages]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as { msgs?: Msg[]; at?: number };
      if (!Array.isArray(d.msgs) || !d.at || Date.now() - d.at > SESSION_TTL) {
        localStorage.removeItem(SESSION_KEY);
        return;
      }
      if (d.msgs.length > 0) setMessages(d.msgs);
    } catch {
      /* ignore */
    }
    // 仅在挂载时恢复一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishBuddyStory = () => {
    if (!childId || !buddyStory) return;
    const ok = tryCompleteStoryNode(childId, buddyStory.id);
    stopSpeaking();
    if (ok) {
      setStoryDoneUi(true);
      playSfx('collect');
      // 剧情完成：关闭小卷面板
      openBuddy(false);
    } else {
      // 顺序未满足：提示解锁前面剧情
      playSfx('deny');
      speak('先完成前面的任务，我们才能认识小卷哦。', 'zh');
    }
  };

  const clearSession = () => {
    stopSpeaking();
    setMessages([]);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  };

  // 关闭时停掉朗读与识别
  useEffect(() => {
    if (!buddyOpen) {
      stopSpeaking();
      setListening(false);
      recRef.current?.abort();
    }
  }, [buddyOpen]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || thinking) return;
    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setThinking(true);
    const r = await api.buddyChat(next);
    setThinking(false);
    const reply = r?.ok && r.reply ? r.reply : '（小卷暂时回答不上来，请稍后再试哦）';
    setMessages([...next, { role: 'assistant', content: reply }]);
    speak(reply, 'zh');
  };

  /* ---------- 点按说话 ---------- */
  const stopListen = () => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    setListening(false);
  };

  const startListen = () => {
    const Ctor = srCtor();
    if (!Ctor || listening) return;
    setMicErr(null);
    // 防御：确保唤醒监听已让出识别通道，避免冲突
    try {
      wakeRef.current?.abort();
    } catch {
      /* ignore */
    }
    const rec = new Ctor();
    let finalText = '';
    rec.lang = 'zh-CN';
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (e: unknown) => {
      const ev = e as TranscriptEvent;
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      // 实时显示识别到的文字（有最终结果优先）
      setInput((finalText || interim).trim());
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      const t = finalText.trim();
      if (t) {
        setInput('');
        void send(t);
      }
    };
    rec.onerror = (e: unknown) => {
      recRef.current = null;
      setListening(false);
      const code = (e as { error?: string })?.error;
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setMicErr('需要麦克风权限：请在浏览器地址栏允许使用麦克风后重试');
      } else if (code === 'no-speech' || code === 'aborted') {
        setMicErr('没有听清，请对着麦克风再说一次');
      } else {
        setMicErr('语音识别失败，请稍后再试');
      }
    };
    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
      setMicErr('无法启动语音识别：请使用 Chrome / Edge，并确认麦克风可用');
    }
  };

  /* ---------- 语音唤醒（喊「小卷，小卷」） ----------
     仅在面板关闭时监听；命中后自停并打开面板。
     避免与面板内「点按提问」同时占用浏览器唯一识别通道。 */
  useEffect(() => {
    if (!buddyWakeOn || buddyOpen || !srCtor()) return;
    let stopped = false;
    let rec: SR | null = null;
    const start = () => {
      if (stopped) return;
      const Ctor = srCtor();
      if (!Ctor) return;
      rec = new Ctor();
      rec.lang = 'zh-CN';
      rec.continuous = true;
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e: unknown) => {
        const ev = e as TranscriptEvent;
        let text = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const r = ev.results[i];
          if (r.isFinal) text += r[0].transcript;
        }
        if (/小卷|小娟|小倦/.test(text)) {
          stopped = true;
          try {
            rec?.abort();
          } catch {
            /* ignore */
          }
          useStore.setState({ buddyOpen: true });
          speak('我在呢，你想问什么呀？', 'zh');
        }
      };
      rec.onend = () => {
        if (!stopped) window.setTimeout(start, 400);
      };
      rec.onerror = () => {
        if (!stopped) window.setTimeout(start, 900);
      };
      wakeRef.current = rec;
      try {
        rec.start();
      } catch {
        /* 麦克风未授权时静默 */
      }
    };
    start();
    return () => {
      stopped = true;
      try {
        rec?.abort();
      } catch {
        /* ignore */
      }
      wakeRef.current = null;
    };
  }, [buddyWakeOn, buddyOpen]);

  const pose: Pose = thinking ? 'idle' : listening ? 'happy' : messages.length > 0 ? 'happy' : 'idle';

  return (
    <>
      {/* 悬浮球 */}
      <button className="buddy-fab" onClick={toggleBuddy} aria-label="小卷学习助手">
        <span className="buddy-fab-ring" aria-hidden="true" />
        <Mascot pose="happy" size={64} className="buddy-fab-mascot" />
        {buddyStory && <i className="npc-buddy-quest" aria-hidden="true">!</i>}
      </button>

      {/* 面板 */}
      {buddyOpen && (
        <div className="buddy-panel" role="dialog" aria-label="小卷学习助手">
          <header className="buddy-head">
            <span className="buddy-head-mascot">
              <Mascot pose={pose} size={64} />
            </span>
            <div className="buddy-head-info">
              <b>小卷</b>
              <small>{thinking ? '正在想…' : listening ? '我在听，请说…' : '有什么想问我？'}</small>
            </div>
            <button
              className={`buddy-wake ${buddyWakeOn ? 'on' : ''}`}
              onClick={() => setBuddyWake(!buddyWakeOn)}
              title="语音唤醒「小卷，小卷」"
              aria-label="语音唤醒开关"
            >
              {buddyWakeOn ? '🎙 唤醒开' : '🎙 唤醒关'}
            </button>
            <button className="buddy-close" onClick={toggleBuddy} aria-label="关闭">
              <IconClose size={20} />
            </button>
          </header>

          <div className="buddy-body" ref={scrollRef}>
            {buddyStory && (
              <div className="buddy-story">
                <span className="buddy-story-tag">📖 剧情 · 小卷的自我介绍</span>
                <div className="buddy-story-lines">
                  {buddyStory.lines?.map((l, i) => (
                    <p
                      key={i}
                      className={`buddy-story-line ${i === storyIdx ? 'on' : i < storyIdx ? 'seen' : ''}`}
                    >
                      <span className="buddy-story-ava"><Mascot pose={i === storyIdx ? 'happy' : 'idle'} size={22} /></span>
                      <span className="buddy-story-bubble">{l.zh}</span>
                    </p>
                  ))}
                </div>
                <div className="buddy-story-actions">
                  {storyIdx < (buddyStory.lines?.length ?? 1) - 1 ? (
                    <button
                      className="kid-btn"
                      onClick={() => {
                        const ni = storyIdx + 1;
                        setStoryIdx(ni);
                        const nl = buddyStory.lines?.[ni];
                        if (nl) speak(nl.zh, 'zh');
                      }}
                    >
                      继续 ▸
                    </button>
                  ) : (
                    <button className="kid-btn green" onClick={finishBuddyStory}>
                      完成剧情 ✓
                    </button>
                  )}
                </div>
              </div>
            )}
            {messages.length === 0 && !thinking && (
              <div className="buddy-empty">
                <span className="buddy-empty-emoji">👋</span>
                <p>我是小卷，学习上的问题都可以问我～</p>
              </div>
            )}
            {messages.map((m, i) =>
              m.role === 'assistant' ? (
                <div key={i} className="buddy-msg assistant">
                  <span className="buddy-msg-ava">
                    <Mascot pose="happy" size={26} />
                  </span>
                  <div className="buddy-col">
                    <span className="buddy-bubble">{m.content}</span>
                    <button className="buddy-replay" onClick={() => speak(m.content, 'zh')} aria-label="语音重播">
                      🔊 再听一遍
                    </button>
                  </div>
                </div>
              ) : (
                <div key={i} className="buddy-msg user">
                  <span className="buddy-bubble">{m.content}</span>
                </div>
              ),
            )}
            {thinking && (
              <div className="buddy-msg assistant">
                <span className="buddy-msg-ava">
                  <Mascot pose="idle" size={26} />
                </span>
                <span className="buddy-bubble thinking">
                  <i>·</i>
                  <i>·</i>
                  <i>·</i>
                </span>
              </div>
            )}
          </div>

          <div className="buddy-quick">
            {QUICK.map((q) => (
              <button key={q} onClick={() => send(q)}>
                {q}
              </button>
            ))}
            {messages.length > 0 && (
              <button className="buddy-clear" onClick={clearSession}>
                🗑 换个话题
              </button>
            )}
          </div>

          {micErr && <p className="buddy-mic-err">{micErr}</p>}
          {listening && <p className="buddy-listen-tip">🎤 正在听，请说出你的问题…（说完自动发送）</p>}

          <footer className="buddy-input">
            <button
              className={`buddy-mic ${listening ? 'on' : ''}`}
              onClick={() => {
                if (listening) stopListen();
                else {
                  setMicErr(null);
                  startListen();
                }
              }}
              disabled={!srSupported}
              aria-label="语音提问"
              title={srSupported ? '语音提问' : '当前浏览器不支持语音'}
            >
              <IconMic size={20} />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void send(input);
              }}
              placeholder={srSupported ? '打字或点麦克风问小卷…' : '输入问题，小卷来回答…'}
            />
            <button className="buddy-send" onClick={() => send(input)} disabled={!input.trim() || thinking}>
              发送
            </button>
          </footer>
        </div>
      )}
    </>
  );
}
