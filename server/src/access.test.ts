import assert from 'node:assert/strict';
import test from 'node:test';
import { authorizeChildAccess } from './access.js';

const lookup = {
  childExists: async (childId: number) => childId === 7 || childId === 8,
  childOwnedByUser: async (childId: number, userId: number) => childId === 7 && userId === 3,
};

test('孩子令牌只能访问自己的数据', async () => {
  assert.equal(await authorizeChildAccess({ kind: 'child', childId: 7 }, 7, lookup), 7);
  assert.equal(await authorizeChildAccess({ kind: 'child', childId: 7 }, 8, lookup), null);
});

test('家长只能访问自己家庭的孩子', async () => {
  assert.equal(await authorizeChildAccess({ kind: 'user', userId: 3, role: 'parent' }, 7, lookup), 7);
  assert.equal(await authorizeChildAccess({ kind: 'user', userId: 3, role: 'parent' }, 8, lookup), null);
});

test('管理员仍需访问真实存在的孩子', async () => {
  assert.equal(await authorizeChildAccess({ kind: 'user', userId: 1, role: 'admin' }, 8, lookup), 8);
  assert.equal(await authorizeChildAccess({ kind: 'user', userId: 1, role: 'admin' }, 999, lookup), null);
});

test('拒绝无效 childId 和匿名请求', async () => {
  assert.equal(await authorizeChildAccess(null, 7, lookup), null);
  assert.equal(await authorizeChildAccess({ kind: 'user', userId: 3, role: 'parent' }, 0, lookup), null);
});
