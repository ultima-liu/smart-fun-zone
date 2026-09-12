import { useMemo, useState } from 'react';
import { EMPTY } from '../features';
import { useNavigate } from 'react-router-dom';
import RewardBurst from './RewardBurst';
import { useStore, childRecords } from '../store';
import { useI18n } from '../i18n';
import { allNodes, chapterById, type StoryNode } from '../content/story';
import { claimStoryNodeReward, tryCompleteStoryNode } from '../storyProgress';
import { speak, playSfx } from '../speech';
import { pendingPacks } from '../content/expedition';
import { badgeById } from '../content/badges';

const STORY_BADGES: Record<string, string> = { p1: 'badge-stargate-pass', 'c1-2': 'badge-classroom-spark', 'c2-2': 'badge-laughter-repair', 'c3-1': 'badge-supply-apprentice', 'c4-1': 'badge-archive-keeper', 'c5-1': 'badge-night-scout', 'c6-1': 'badge-partner-link' };

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
  const rewardClaimed = useStore((s) => (s.activeChildId ? s.storyRewardClaimed[s.activeChildId] ?? EMPTY : EMPTY));
  const lessonProgress = useStore((s) => s.lessonProgress);
  const records = useStore((s) => s.records);
  const expeditionLastAt = useStore((s) => (s.activeChildId ? s.expeditionLastAt[s.activeChildId] : undefined));
  const collectExpedition = useStore((s) => s.collectExpedition);
  const openBuddy = useStore((s) => s.openBuddy);
  const [, force] = useState(0);
  const [burst, setBurst] = useState<{ reward: number; cardId?: string } | null>(null);
  const [badgeNotice, setBadgeNotice] = useState<string | null>(null);

  const flat = useMemo(() => allNodes(), []);
  const activeId = child?.id;

  const current = useMemo<StoryNode | null>(() => {
    if (!activeId) return null;
    const done = new Set(doneList);
    const claimed = new Set(rewardClaimed);
    for (const n of flat) {
      if (!done.has(n.id) || !claimed.has(n.id)) return n;
    }
    return null;
  }, [flat, doneList, rewardClaimed, activeId]);

  // 条件型节点（上过课 / 玩过局）达到后弹出领取
  const claimable = useMemo(() => {
    if (!current || !activeId) return false;
    if (doneList.includes(current.id) && !rewardClaimed.includes(current.id)) return true;
    switch (current.rule) {
      case 'lesson':
        return Object.values(lessonProgress).some((v) => (v ?? 0) > 0);
      case 'game':
        return childRecords(records, activeId).length > 0;
      case 'collectLoot':
        // 首次远征视为已有 1 个初始补给包；之后只要有可收取包即可领取
        return expeditionLastAt === undefined || pendingPacks(expeditionLastAt, Date.now()) > 0;
      default:
        return false;
    }
  }, [current, lessonProgress, records, activeId, doneList, rewardClaimed, expeditionLastAt]);

  // 对话型：序章/拜访类节点先与 NPC 对话（有台词则对话完成）
  const needsTalk = (n: StoryNode) => (n.lines?.length ?? 0) > 0;

  const txt = (x: { zh: string; en: string }) => (lang === 'zh' ? x.zh : x.en);

  const claim = () => {
    if (!child || !current) return;
    if (!doneList.includes(current.id)) tryCompleteStoryNode(child.id, current.id);
    const ok = claimStoryNodeReward(child.id, current.id);
    if (ok) {
      playSfx('collect');
      const badge = badgeById(STORY_BADGES[current.id]);
      speak(badge && lang === 'zh' ? `剧情完成，获得徽章「${badge.name}」！` : lang === 'zh' ? '剧情完成，奖励已领取！' : badge ? `Badge earned: ${badge.name}!` : 'Story complete! Reward claimed!', lang);
      setBadgeNotice(badge ? `🏅 获得徽章：${badge.name} · ${badge.meaning}` : null);
      setBurst({ reward: current.reward, cardId: current.rewardCardId });
      force((x) => x + 1);
    }
  };

  // 序章/login 型不再自动完成：由「去找铁砣聊聊」对话推进（首个剧情可见可体验）

  if (!child || !current) return null;
  const chapter = chapterById(current.chapterId);
  const done = doneList.includes(current.id);
  const claimed = rewardClaimed.includes(current.id);
  const talk = needsTalk(current);

  // 点击剧情条 = 前往该剧情所在的功能页面；解锁对话在页内 NPC 头像处完成
  const advance = () => {
    if (!child || !current) return;
    if (current.rule === 'collectLoot' && !done) {
      const drop = collectExpedition(child.id);
      if (drop) {
        playSfx('collect');
        tryCompleteStoryNode(child.id, current.id);
        force((x) => x + 1);
      } else {
        speak(lang === 'zh' ? '远征队还在路上，暂时没有可收取的战利品。' : 'The fleet is still away. No loot is ready yet.', lang);
      }
      return;
    }
    if (claimable) { claim(); return; }
    if (done) { speak(txt(current.text), lang); return; }
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
          {!claimed && (
            <span className="ss-action-pill">
              {claimable ? (lang === 'zh' ? '🎁 领取' : 'Claim') : talk ? (lang === 'zh' ? '💬 去找他' : 'Talk') : (lang === 'zh' ? '▶ 继续' : 'Go')}
            </span>
          )}
        </div>
      </section>

      {burst != null && <RewardBurst reward={burst.reward} rewardCardId={burst.cardId} onDone={() => setBurst(null)} />}
      {badgeNotice && <div className="story-badge-notice" role="status">{badgeNotice}<button onClick={() => setBadgeNotice(null)} aria-label="关闭">×</button></div>}
    </>
  );
}
