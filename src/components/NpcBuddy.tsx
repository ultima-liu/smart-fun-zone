import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store';
import { useI18n } from '../i18n';
import { npcMeta } from '../content/npc';
import { speakAsNpc } from '../speech';
import NpcFigure from './NpcFigure';

interface Props {
  npc: string;
}

/** NPC 人形立绘：放在页头标题栏右上空白区；点击闲聊 */
export default function NpcBuddy({ npc }: Props) {
  const { lang } = useI18n();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const [chatOpen, setChatOpen] = useState(false);
  const [chatIdx, setChatIdx] = useState(0);

  const meta = npcMeta(npc);
  const txt = (x: { zh: string; en: string }) => (lang === 'zh' ? x.zh : x.en);

  const onTap = () => {
    const isOpen = !chatOpen;
    setChatIdx(0);
    setChatOpen(isOpen);
    if (isOpen && chat.length) {
      const rnd = Math.floor(Math.random() * chat.length);
      setChatIdx(rnd);
      speakAsNpc(txt(chat[rnd]), meta, lang);
    }
  };

  const chat = meta.chitchat;
  const line = chat.length ? chat[chatIdx % chat.length] : null;

  if (!child) return null;

  return createPortal(
    <div className="npc-buddy">
      <span className="npc-buddy-name">{txt(meta.name)}</span>
      <button className="npc-buddy-avatar" onClick={onTap} aria-label={txt(meta.name)}>
        <NpcFigure npc={npc} size={84} />
        <span className="npc-buddy-bubble" aria-hidden="true">
          {lang === 'zh' ? '聊聊' : 'Chat'}
        </span>
      </button>

      {chatOpen && line && (
        <div className="npc-chat">
          <p className="npc-chat-text">{txt(line)}</p>
          <div className="npc-chat-actions">
            {chat.length > 1 && (
              <button className="npc-chat-next" onClick={() => {
                let ni = chatIdx;
                while (chat.length > 1 && ni === chatIdx) ni = Math.floor(Math.random() * chat.length);
                setChatIdx(ni);
                speakAsNpc(txt(chat[ni]), meta, lang);
              }}>
                {lang === 'zh' ? '再聊一句' : 'Next'}
              </button>
            )}
            <button className="npc-chat-close" onClick={() => setChatOpen(false)}>✕</button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
