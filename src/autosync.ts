/* =====================================================================
   自动云端同步（M1.3）：家长登录后自动备份/恢复
   - 启动时：已登录且有孩子映射 → 自动从云端拉取合并
   - 学习中：每次 mastery/lessonProgress 变化 → 防抖 1.5s 后自动推送到云端
   - 手动按钮仍保留（立即同步）
   服务端不可用/未登录时全部静默，本地学习不受影响。
   ===================================================================== */
import { useStore } from './store';
import { isLoggedIn } from './api';
import { childMap, pushAll, pullAll, pushWrongs, pushPoints, pullPoints } from './cloud';

let pushTimer: number | null = null;

function schedulePush() {
  const s = useStore.getState();
  const localId = s.activeChildId;
  const cloudId = localId ? childMap()[localId] ?? null : null;
  if (!localId || cloudId === null) return;
  if (pushTimer !== null) return; // 已有待推送
  pushTimer = window.setTimeout(() => {
    pushTimer = null;
    void pushAll(cloudId, localId)
      .then(() => pushWrongs(cloudId, localId))
      .then(() => pushPoints(cloudId, localId));
  }, 1500);
}

/** 登录完成后调用：先拉取合并云端，再立即推送本地（双向一致） */
export async function syncAfterLogin(localChildId: string): Promise<{ pulled: number; pushed: number; wrongs: number; points: number } | null> {
  const cloudId = childMap()[localChildId] ?? null;
  if (cloudId === null) return null;
  const pulled = await pullAll(cloudId, localChildId);
  const pushed = await pushAll(cloudId, localChildId);
  const wrongs = await pushWrongs(cloudId, localChildId);
  const pulledPoints = await pullPoints(cloudId, localChildId);
  await pushPoints(cloudId, localChildId);
  return { pulled, pushed, wrongs, points: pulledPoints };
}

let inited = false;
export function initAutoSync(): void {
  if (inited) return;
  inited = true;
  try {
    // 启动：已登录且映射存在 → 自动拉取合并
    const s = useStore.getState();
    if (isLoggedIn() && s.activeChildId) {
      const cloudId = childMap()[s.activeChildId] ?? null;
      if (cloudId !== null) {
        void pullAll(cloudId, s.activeChildId).then(() => pullPoints(cloudId, s.activeChildId as string));
      }
    }
    // 学习中数据变化（进度/星星/错题/积分） → 防抖自动推送
    useStore.subscribe((state, prev) => {
      if (
        state.mastery === prev.mastery &&
        state.lessonProgress === prev.lessonProgress &&
        state.wrongs === prev.wrongs &&
        state.pointLog === prev.pointLog &&
        state.ownedItems === prev.ownedItems
      )
        return;
      if (!isLoggedIn()) return;
      schedulePush();
    });
  } catch {
    /* ignore */
  }
}
