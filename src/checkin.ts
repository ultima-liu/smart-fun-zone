import { useStore } from './store';
import { claimAutoTasks } from './tasks';

/** 演示模式：URL 带 ?demo=1 且孩子无真实数据时，注入演示数据（仅看效果用） */
export function injectDemoIfRequested(): boolean {
  if (!window.location.href.includes('demo=1')) return false;
  const s = useStore.getState();
  const cid = s.activeChildId;
  if (!cid) return false;
  if ((s.records ?? []).length > 0 || Object.keys(s.mastery[cid] ?? {}).length > 0) return false;
  const now = Date.now();
  const day = 86400000;
  const today = new Date().toDateString();
  const mkRec = (id: string, gameId: string, t: number) => ({ id, childId: cid, gameId, level: 1, stars: 3, correct: 5, total: 5, durationSec: 90, playedAt: t });
  const recs = [
    mkRec('demo-d-1', 'math-farm', now - 20 * 60000),
    mkRec('demo-d-2', 'word-hunt', now - 15 * 60000),
    mkRec('demo-d-3', 'logic-gems', now - 8 * 60000),
    mkRec('demo-y-1', 'math-farm', now - day),
    mkRec('demo-y-2', 'word-hunt', now - day + 60000),
  ];
  const mastery = {
    'math-g1-a-1-1': { stars: 2, gold: false, updatedAt: now - day },
    'math-g1-a-1-2': { stars: 3, gold: true, updatedAt: now - 2 * day },
    'chinese-g1-a-1-1': { stars: 3, gold: true, updatedAt: now - day - 60000 },
  };
  const log = [
    { id: `task:d-play:${today}`, time: now, amount: 3, reason: '任务·玩 1 局游戏', childId: cid },
    { id: `task:d-kind:${today}`, time: now, amount: 6, reason: '任务·玩 2 种游戏', childId: cid },
  ];
  useStore.setState({
    records: [...s.records, ...recs],
    mastery: { ...s.mastery, [cid]: { ...(s.mastery[cid] ?? {}), ...mastery } },
    points: { ...s.points, [cid]: (s.points[cid] ?? 0) + 40 },
    pointLog: { ...s.pointLog, [cid]: [...(s.pointLog[cid] ?? []), ...log] },
  });
  return true;
}

/** 安装「状态变化 → 自动结算任务」的订阅（签到、学习和练习变化即结算） */
let subInstalled = false;
export function installTaskWatcher(): void {
  if (subInstalled) return;
  subInstalled = true;
  useStore.subscribe((state, prev) => {
    if (
      state.mastery === prev.mastery &&
      state.records === prev.records &&
      state.charBag === prev.charBag &&
      state.lessonProgress === prev.lessonProgress &&
      state.dailyCheckin === prev.dailyCheckin &&
      state.customTasks === prev.customTasks &&
      state.shipLevel === prev.shipLevel &&
      state.pointLog === prev.pointLog
    )
      return;
    const cid = state.activeChildId;
    if (!cid) return;
    const granted = claimAutoTasks(cid);
    if (granted.length > 0) {
      window.dispatchEvent(new CustomEvent('sfz-task-done', { detail: granted }));
    }
  });
}
