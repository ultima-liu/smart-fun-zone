import { useStore } from './store';
import { allNodes, unlockTargetOf } from './content/story';

/**
 * 尝试按顺序完成剧情节点：前置节点必须全部已完成，且本节点尚未完成才执行。
 * 幂等（已完成直接返回 true）。成功时发放节点奖励（applyPoints，sourceId=story:nodeId 去重）。
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
  s.applyPoints(childId, flat[idx].reward, `剧情「${flat[idx].title.zh}」`, `story:${nodeId}`);
  // 记录待演示的解锁目标：功能页完成后跳回首页即为它播放卷星解封动画
  s.setStoryPulse(unlockTargetOf(nodeId));
  return true;
}
