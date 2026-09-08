import { useStore } from './store';

/** 稳定空数组引用：避免 zustand selector 每次返回新数组导致无限循环 */
export const EMPTY: string[] = [];

/** 新手剧情功能门禁：功能随剧情节点完成逐个解锁（见 docs 新手剧情设定）
 *  顺序：p1(序章·与铁砣对话) → c1-1(拜访星校长) 解锁学校
 *        → c2-1(与泡泡对话) 解锁乐园 → c3-1(与铛铛对话) 解锁补给站
 */
export type FeatureKey = 'school' | 'park' | 'store' | 'hq';

/** 功能 → 解锁所需剧情节点 */
export const FEATURE_GATE_NODE: Record<FeatureKey, string> = {
  // 用"前一章节点"作为解锁条件：功能页在"本页内对话"完成前即开放，对话在页内 NPC 完成
  school: 'p1',  // 完成序章即可进入星环学校（c1-1 拜访星校长在此完成）
  park: 'c1-2',  // 点亮第一课后解锁空中乐园（c2-1 在此完成）
  store: 'c2-2', // 玩过一局后解锁补给站（c3-1 在此完成）
  hq: 'p1',      // 完成序章「星门验证」解锁总部
};

export const FEATURE_LABEL: Record<FeatureKey, string> = {
  school: '星环学校',
  park: '空中乐园',
  store: '补给站',
  hq: '卷星总部',
};

/** 判断某孩子的剧情是否已解锁某功能 */
export function isFeatureOpen(feature: FeatureKey, doneList: string[] | undefined): boolean {
  const list = doneList ?? EMPTY;
  if (list.includes(FEATURE_GATE_NODE[feature])) return true;
  // 总部始终开放（'' 表示无门槛）
  if (feature === 'hq') return true;
  return false;
}

/** 路由（含带参子路径）→ 所需功能；不锁的页面返回 null */
export function featureOfPath(path: string): FeatureKey | null {
  if (path === '/map' || path.startsWith('/subject') || path.startsWith('/learn') || path.startsWith('/practice')) return 'school';
  if (path === '/lobby' || path.startsWith('/game')) return 'park';
  if (path === '/store') return 'store';
  if (path === '/profile') return 'hq';
  return null;
}

/** React Hook：读取当前孩子的解锁状态 */
export function useGates() {
  const activeChildId = useStore((s) => s.activeChildId);
  const doneList = useStore((s) => (s.activeChildId ? s.storyDone[s.activeChildId] ?? EMPTY : EMPTY));
  const open = (f: FeatureKey) => isFeatureOpen(f, doneList);
  return {
    activeChildId,
    /** 某路径是否可进入（未解锁返回 false） */
    canEnter(path: string): boolean {
      const f = featureOfPath(path);
      if (!f || !activeChildId) return true;
      return open(f);
    },
    isOpen: open,
  };
}
