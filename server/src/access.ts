import type { AnyAuth } from './auth.js';

export interface ChildAccessLookup {
  childExists: (childId: number) => Promise<boolean>;
  childOwnedByUser: (childId: number, userId: number) => Promise<boolean>;
}

/**
 * 统一的儿童数据访问策略：孩子只能访问自己，家长只能访问家庭内孩子，管理员可访问存在的孩子。
 * 路由不得自行信任 query/body 中的 childId。
 */
export async function authorizeChildAccess(
  auth: AnyAuth | null | undefined,
  requestedChildId: number,
  lookup: ChildAccessLookup,
): Promise<number | null> {
  if (!Number.isSafeInteger(requestedChildId) || requestedChildId <= 0 || !auth) return null;
  if (auth.kind === 'child') return auth.childId === requestedChildId ? requestedChildId : null;
  if (!auth.userId) return null;
  if (auth.role === 'admin') return await lookup.childExists(requestedChildId) ? requestedChildId : null;
  return await lookup.childOwnedByUser(requestedChildId, auth.userId) ? requestedChildId : null;
}
