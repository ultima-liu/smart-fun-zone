import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { config } from './config.js';

export interface AuthUser {
  userId: number;
  phone: string;
}

export function signToken(user: AuthUser, role = 'parent'): string {
  return jwt.sign({ k: 'u', userId: user.userId, phone: user.phone, role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
}

/** 孩子令牌（登录后可用 /api/sync、/api/plans 等管理自己的数据） */
export function signChildToken(childId: number): string {
  return jwt.sign({ k: 'c', childId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const p = jwt.verify(token, config.jwtSecret) as unknown as { k?: string; userId?: number; childId?: number; phone?: string; role?: string };
    if (p?.k === 'c' && typeof p.childId === 'number') {
      return { userId: -1, phone: '', childId: p.childId } as AuthUser & { childId: number };
    }
    if (p?.k === 'u' && typeof p.userId === 'number') {
      return { userId: p.userId, phone: p.phone ?? '', role: p.role ?? 'parent' } as AuthUser & { role: string };
    }
    return null;
  } catch {
    return null;
  }
}

export interface AnyAuth {
  kind: 'user' | 'child';
  userId?: number;
  role?: 'parent' | 'admin';
  childId?: number;
}

export function verifyAny(token: string): AnyAuth | null {
  try {
    const p = jwt.verify(token, config.jwtSecret) as unknown as { k?: string; userId?: number; role?: string; childId?: number };
    if (p?.k === 'c' && typeof p.childId === 'number') return { kind: 'child', childId: p.childId };
    if (p?.k === 'u' && typeof p.userId === 'number') {
      return { kind: 'user', userId: p.userId, role: p.role === 'admin' ? 'admin' : 'parent' };
    }
    return null;
  } catch {
    return null;
  }
}

/* 孩子账号密码哈希（scrypt，salt:hash 格式） */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const calc = crypto.scryptSync(password, salt, 32).toString('hex');
  const a = Buffer.from(calc, 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Fastify 前置钩子：校验 Authorization: Bearer <token>（家长或孩子令牌） */
export function authHook(
  request: { headers: Record<string, string | undefined> },
  reply: { code: (n: number) => { send: (b: object) => unknown } },
): AnyAuth | undefined {
  const h = request.headers.authorization ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  const auth = token ? verifyAny(token) : null;
  if (!auth) {
    reply.code(401).send({ ok: false, error: '未登录或登录已过期' });
    return undefined;
  }
  return auth;
}
