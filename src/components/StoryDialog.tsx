import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { speak, playSfx } from '../speech';
import { tryCompleteStoryNode } from '../storyProgress';
import type { StoryNode } from '../content/story';
import { cardById } from '../content/starCards';

interface Props {
  childId: string;
  node: StoryNode;
  /** 对话全部说完后（已完成节点）回调 */
  onDone: () => void;
  onClose: () => void;
}

/** 剧情对话：NPC 旁的小气泡，逐句朗读，不遮住页面 */
export default function StoryDialog({ childId, node, onDone, onClose }: Props) {
  const { lang } = useI18n();
  const lines = node.lines ?? [];
  const [idx, setIdx] = useState(0);
  const doneRef = useRefInit();

  const txt = (x: { zh: string; en: string }) => (lang === 'zh' ? x.zh : x.en);
  const rewardCard = node.rewardCardId ? cardById(node.rewardCardId) : undefined;

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    const ok = tryCompleteStoryNode(childId, node.id);
    if (ok) playSfx('collect');
    else playSfx('tap');
    onDone();
  };

  // 每句入场播放语音
  useEffect(() => {
    const line = lines[idx];
    if (line) speak(txt(line), lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const next = () => {
    playSfx('pop');
    if (idx < lines.length - 1) setIdx(idx + 1);
    else finish();
  };

  const skip = () => {
    playSfx('tap');
    onClose();
  };

  return (
    <div className="sd-bubble-card" role="dialog" aria-label={txt(node.title)}>
      <div className="sd-bubble" key={idx}>
        <p className="sd-text">{lines[idx] ? txt(lines[idx]) : txt(node.text)}</p>
        {rewardCard && (
          <p className="sd-reward-card">🎴 {lang === 'zh' ? `完成对话后，回任务条领取「${rewardCard.name.zh}」图鉴卡` : `Complete the dialogue, then claim ${rewardCard.name.en} from the task bar`}</p>
        )}
        <span className="sd-tail" aria-hidden="true" />
      </div>

      {/* 进度点 */}
      {lines.length > 1 && (
        <div className="sd-dots" aria-hidden="true">
          {lines.map((_, i) => (
            <i key={i} className={i === idx ? 'on' : i < idx ? 'seen' : ''} />
          ))}
        </div>
      )}

      {/* 操作 */}
      <div className="sd-actions">
        <button className="kid-btn white sd-skip" onClick={skip} aria-label="skip">
          {lang === 'zh' ? '✕' : '✕'}
        </button>
        <button className="kid-btn sd-next" onClick={next} aria-label="next">
          {idx < lines.length - 1 ? (lang === 'zh' ? '继续 ▸' : 'Next ▸') : (lang === 'zh' ? '完成 ✓' : 'Done ✓')}
        </button>
      </div>
    </div>
  );
}

/** 模块级 ref 初始化（每次挂载为 false） */
function useRefInit() {
  const [ref] = useState(() => ({ current: false }));
  return ref;
}
