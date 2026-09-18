import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useI18n } from '../i18n';
import { allNodes, type StoryNode } from '../content/story';
import { npcMeta } from '../content/npc';
import { speakAsNpc, playSfx } from '../speech';
import { EMPTY } from '../features';
import NpcFigure from './NpcFigure';
import StoryDialog from './StoryDialog';

interface Props {
  npc: string;
  /** 该 NPC 负责的剧情节点 id（若其中有进行中且带对话的，头像出现「!」，点击优先剧情） */
  storyNodeIds?: string[];
  /** 用于先播页面入场语；解除后才自动弹出剧情，避免两段 TTS 互相取消。 */
  deferAutoStory?: boolean;
}

/** NPC 人形立绘：放在页头标题栏右上空白区；点击 → 剧情优先，否则固定闲聊 */
export default function NpcBuddy({ npc, storyNodeIds, deferAutoStory = false }: Props) {
  const { lang } = useI18n();
  const nav = useNavigate();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const doneList = useStore((s) => (s.activeChildId ? s.storyDone[s.activeChildId] ?? EMPTY : EMPTY));
  const [storyNode, setStoryNode] = useState<StoryNode | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatIdx, setChatIdx] = useState(0);

  const meta = npcMeta(npc);
  const txt = (x: { zh: string; en: string }) => (lang === 'zh' ? x.zh : x.en);

  // 该 NPC 的进行中且带对话的剧情节点（优先级最高）
  const pendingStory = (() => {
    if (!storyNodeIds?.length) return null;
    const done = new Set(doneList);
    for (const id of storyNodeIds) {
      if (done.has(id)) continue;
      const node = allNodes().find((n) => n.id === id);
      if (node && (node.lines?.length ?? 0) > 0) return node;
    }
    return null;
  })();

  if (!child) return null;

  const onTap = () => {
    if (pendingStory) {
      playSfx('pop');
      setStoryNode(pendingStory); // 语音由 StoryDialog 统一朗读，避免双重 speak
      return;
    }
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

  // 进入页面时若有进行中的剧情对话 → 强制自动触发（若从剧情条跳转来，该节点即进行中）
  useEffect(() => {
    if (deferAutoStory) return;
    if (pendingStory) {
      const t = window.setTimeout(() => setStoryNode((cur) => cur ?? pendingStory), 220);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingStory?.id, deferAutoStory]);

  return createPortal(
    <div className="npc-buddy">
      <span className="npc-buddy-name">{txt(meta.name)}</span>
      <button className="npc-buddy-avatar" onClick={onTap} aria-label={txt(meta.name)}>
        <NpcFigure npc={npc} size={84} />
        {pendingStory && <i className="npc-buddy-quest" aria-hidden="true">!</i>}
        <span className="npc-buddy-bubble" aria-hidden="true">
          {pendingStory ? (lang === 'zh' ? '有剧情！' : 'Story!') : (lang === 'zh' ? '聊聊' : 'Chat')}
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

      {storyNode && (
        <StoryDialog
          childId={child.id}
          node={storyNode}
          npc={npc}
          onDone={() => {
            setStoryNode(null);
            // 对话完成后回首页，在任务条领取奖励。
            const st = useStore.getState();
            const done = st.storyDone[child.id] ?? [];
            if (done.includes(storyNode.id)) nav('/');
          }}
          onClose={() => setStoryNode(null)}
        />
      )}
    </div>,
    document.body,
  );
}
