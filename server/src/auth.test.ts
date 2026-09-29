import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword, signChildToken, signToken, verifyAny, verifyPassword } from './auth.js';

test('密码使用带随机盐的哈希并可安全校验', () => {
  const first = hashPassword('correct horse battery staple');
  const second = hashPassword('correct horse battery staple');
  assert.notEqual(first, second);
  assert.equal(verifyPassword('correct horse battery staple', first), true);
  assert.equal(verifyPassword('wrong password', first), false);
});

test('家长和孩子令牌保留明确身份边界', () => {
  assert.deepEqual(verifyAny(signToken({ userId: 3, phone: '13800000000' }, 'parent')), {
    kind: 'user', userId: 3, role: 'parent',
  });
  assert.deepEqual(verifyAny(signChildToken(7)), { kind: 'child', childId: 7 });
});
