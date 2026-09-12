import { useStore } from './store';
import { allNodes, unlockTargetOf } from './content/story';
import { BADGES } from './content/badges';

const STORY_BADGE_BY_NODE: Record<string, string> = {
  p1: 'badge-stargate-pass',
  'c1-2': 'badge-classroom-spark',
  'c2-2': 'badge-laughter-repair',
  'c3-1': 'badge-supply-apprentice',
  'c4-1': 'badge-archive-keeper',
  'c5-1': 'badge-night-scout',
  'c6-1': 'badge-partner-link',
};

/**
 * 尝试按顺序完成剧情节点：前置节点必须全部已完成，且本节点尚未完成才执行。
 * 幂等（已完成直接返回 true）。此函数只标记任务完成；奖励需由首页任务条领取。
 */
export function tryCompleteStoryNode(childId: string, nodeId: string): boolean {
  const s = useStore.getState();
  const done = s.storyDone[childId] ?? [];
  if (done.includes(nodeId)) return true;
  const flat = allNodes();
  const idx = flat.findIndex((n) => n.id === nodeId);
  if (idx < 0) return false;
  for (let i = 0; i < idx; i++) {
    if (!done.includes(flat[i].id)) return false; // 前置未完成，顺序锁定
  }
  s.completeStoryNode(childId, nodeId);
  return true;
}

/** 在首页任务条领取已完成节点的奖励：卷星币 + 可选 NPC 图鉴卡。 */
export function claimStoryNodeReward(childId: string, nodeId: string): boolean {
  const s = useStore.getState();
  const flat = allNodes();
  const idx = flat.findIndex((n) => n.id === nodeId);
  if (idx < 0) return false;
  const done = s.storyDone[childId] ?? [];
  const claimed = s.storyRewardClaimed[childId] ?? [];
  if (!done.includes(nodeId) || claimed.includes(nodeId)) return false;
  for (let i = 0; i < idx; i++) if (!done.includes(flat[i].id) || !claimed.includes(flat[i].id)) return false;
  const node = flat[idx];
  s.applyPoints(childId, node.reward, `剧情「${node.title.zh}」`, `story:${nodeId}`);
  if (node.rewardCardId) s.grantArchiveCard(childId, node.rewardCardId);
  const badgeId = STORY_BADGE_BY_NODE[nodeId];
  if (badgeId && BADGES.some((badge) => badge.id === badgeId)) s.grantBadge(childId, badgeId);
  s.claimStoryReward(childId, nodeId);
  s.setStoryPulse(unlockTargetOf(nodeId));
  return true;
}
