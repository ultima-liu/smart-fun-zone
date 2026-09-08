import { useMemo, useState } from 'react';
import { EMPTY } from '../features';
import { useNavigate } from 'react-router-dom';
import RewardBurst from './RewardBurst';
import { useStore, childRecords } from '../store';
import { useI18n } from '../i18n';
import { allNodes, chapterById, type StoryNode } from '../content/story';
import { tryCompleteStoryNode } from '../storyProgress';
import { speak, playSfx } from '../speech';

function sceneTarget(node: StoryNode): string {
  switch (node.rule) {
    case 'visitSchool':
    case 'lesson':
      return '/map';
    case 'visitLobby':
    case 'game':
      return '/lobby';
    case 'visitStore':
      return '/store';
    case 'visitLibrary':
      return '/archive'; // 星核档案库 → 档案馆页面（遇晶晶）
    case 'login':
      return '/profile'; // 序章 → 总部找铁砣
    case 'visitBuddy':
      return '/'; // 小卷悄悄话 → 首页就地对话解锁，无需去总部
    default:
      return '/';
  }
}

/** 首页剧情条：当前章节 + 任务；对话类节点先与 NPC 说话，再领取/跳转 */
export default function StoryStrip() {
  const nav = useNavigate();
  const { lang } = useI18n();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const doneList = useStore((s) => (s.activeChildId ? s.storyDone[s.activeChildId] ?? EMPTY : EMPTY));
  const lessonProgress = useStore((s) => s.lessonProgress);
  const records = useStore((s) => s.records);
  const openBuddy = useStore((s) => s.openBuddy);
  const [, force] = useState(0);
  const [burst, setBurst] = useState<number | null>(null);

  const flat = useMemo(() => allNodes(), []);
  const activeId = child?.id;

  const current = useMemo<StoryNode | null>(() => {
    if (!activeId) return null;
    const done = new Set(doneList);
    let prevOk = true;
    for (const n of flat) {
      if (!done.has(n.id)) return prevOk ? n : null;
      prevOk = true;
    }
    return null;
  }, [flat, doneList, activeId]);

  // 条件型节点（上过课 / 玩过局）达到后弹出领取
  const claimable = useMemo(() => {
    if (!current || !activeId) return false;
    switch (current.rule) {
      case 'lesson':
        return Object.values(lessonProgress).some((v) => (v ?? 0) > 0);
      case 'game':
        return childRecords(records, activeId).length > 0;
      default:
        return false;
    }
  }, [current, lessonProgress, records, activeId]);

  // 对话型：序章/拜访类节点先与 NPC 对话（有台词则对话完成）
  const needsTalk = (n: StoryNode) => (n.lines?.length ?? 0) > 0;

  const txt = (x: { zh: string; en: string }) => (lang === 'zh' ? x.zh : x.en);

  const claim = () => {
    if (!child || !current) return;
    const ok = tryCompleteStoryNode(child.id, current.id);
    if (ok) {
      playSfx('collect');
      speak(lang === 'zh' ? '剧情完成，奖励已领取！' : 'Story complete! Reward claimed!', lang);
      setBurst(current.reward); // 全屏庆祝动画
      force((x) => x + 1);
    }
  };

  // 序章/login 型不再自动完成：由「去找铁砣聊聊」对话推进（首个剧情可见可体验）

  if (!child || !current) return null;
  const chapter = chapterById(current.chapterId);
  const done = doneList.includes(current.id);
  const talk = needsTalk(current);

  // 点击剧情条 = 前往该剧情所在的功能页面；解锁对话在页内 NPC 头像处完成
  const advance = () => {
    if (!child || !current) return;
    if (done) { speak(txt(current.text), lang); return; }
    if (claimable) { claim(); return; }
    playSfx('pop');
    // 小卷剧情：由全局小卷助手承接对话 → 打开小卷面板（无需跳页）
    if (current.rule === 'visitBuddy') { openBuddy(true); return; }
    nav(sceneTarget(current));
  };

  return (
    <>
      <section
        className="story-strip ss-actionable"
        onClick={advance}
        role="button"
        tabIndex={0}
        aria-label={lang === 'zh' ? '继续剧情任务' : 'Continue story quest'}
      >
        {/* 新手引导：手指点击指示（点击剧情条任意处继续） */}
        <div className="ss-guide" aria-hidden="true">
          <span className="ss-guide-hand">👆</span>
          <span className="ss-guide-tip">{lang === 'zh' ? '点击剧情继续' : 'Tap to continue'}</span>
        </div>
        <div className="ss-badge" aria-hidden="true">📖</div>
        <div className="ss-body">
          <p className="ss-eyebrow">
            {chapter ? `${chapter.no} · ${txt(chapter.title)}` : '卷星之旅'}
            <span className="ss-dot" />{current.npc}
          </p>
          <p className="ss-title">{txt(current.title)}</p>
          <p className="ss-text">{done ? txt(current.text) : txt(current.task)}</p>
        </div>
        <div className="ss-actions">
          {!done && (
            <span className="ss-action-pill">
              {claimable ? (lang === 'zh' ? '🎁 领取' : 'Claim') : talk ? (lang === 'zh' ? '💬 去找他' : 'Talk') : (lang === 'zh' ? '▶ 继续' : 'Go')}
            </span>
          )}
        </div>
      </section>

      {burst != null && <RewardBurst reward={burst} onDone={() => setBurst(null)} />}
    </>
  );
}
