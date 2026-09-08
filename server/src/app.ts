import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { db, q, ping, insertOne, type RowDataPacket } from './db.js';
import { signToken, signChildToken, verifyAny, hashPassword, verifyPassword } from './auth.js';
import { scoreText } from './score.js';
import { synthesizeCache } from './tts.js';
import { smsProvider } from './sms.js';
import { writeVersion, type LessonContent } from './content-store.js';

/* ---------- 家长账号 / 家庭 / 儿童 ---------- */
async function getOrCreateFamily(userId: number): Promise<number> {
  const rows = await q<{ id: number } & RowDataPacket>('SELECT id FROM families WHERE owner_user_id=? LIMIT 1', [userId]);
  if (rows[0]) return rows[0].id;
  return await insertOne('INSERT INTO families (owner_user_id, name) VALUES (?,?)', [userId, '我的家庭']);
}

async function familyOfUser(userId: number): Promise<number> {
  return getOrCreateFamily(userId);
}

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false, bodyLimit: 8 * 1024 * 1024 });

  void app.register(cors, { origin: true });

  /** 统一鉴权 preHandler（家长或孩子令牌） */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function requireAuth(req: any, reply: any) {
    const h = req.headers.authorization ?? '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : '';
    const auth = token ? verifyAny(token) : null;
    if (!auth) {
      reply.code(401).send({ ok: false, error: '未登录或登录已过期' });
      return;
    }
    (req as any).auth = auth;
  }
  app.decorateRequest('auth', null);
  const authed = { preHandler: requireAuth };

  /** 家长令牌的 userId（孩子令牌在家长专属路由返回 null） */
  function parentId(req: any): number | null {
    const a = req.auth as { kind?: string; userId?: number } | null;
    return a?.kind === 'user' ? a.userId ?? null : null;
  }
  /** 孩子令牌的 childId（家长令牌返回 null） */
  function childScope(req: any): number | null {
    const a = req.auth as { kind?: string; childId?: number } | null;
    return a?.kind === 'child' ? a.childId ?? null : null;
  }
  /** 是否管理员 */
  function isAdmin(req: any): boolean {
    const a = req.auth as { kind?: string; role?: string } | null;
    return a?.kind === 'user' && a.role === 'admin';
  }

  /* ---------- 健康检查 ---------- */
  app.get('/api/health', async () => ({
    ok: true,
    db: await ping(),
    ttsConfigured: config.volc.apiKey !== '',
    chatConfigured: config.chat.apiKey !== '' && config.chat.baseUrl !== '' && config.chat.model !== '',
    version: 1,
    time: Date.now(),
  }));

  /* ---------- 学习助手「小卷」问答（OpenAI 兼容接口，服务端注入密钥） ---------- */
  const BUDDY_SYSTEM = [
    {
      role: 'system',
      content:
        '你是「小卷」，卷卷星球的学习小助手，一个可爱、耐心、温柔的机器人，帮助小朋友学习。' +
        '回答要：简洁（一般 2~4 句）、友好、适合 6~12 岁儿童；使用中文，遇到生字可附带拼音或举一个简单例子。' +
        '语气温暖鼓励，多用短句。只回答与学习、知识、生活常识、成长相关的问题；' +
        '遇到不适当、危险或成人内容，礼貌地拒绝并引导回学习话题。',
    },
  ];

  app.post<{ Body: { messages?: { role: string; content: string }[] } }>(
    '/api/buddy/chat',
    authed,
    async (req, reply) => {
      const { baseUrl, apiKey, model } = config.chat;
      if (!baseUrl || !apiKey || !model) {
        return reply.code(503).send({ ok: false, error: '服务端未配置 LLM（CHAT_BASE_URL/CHAT_API_KEY/CHAT_MODEL）' });
      }
      const messages = req.body?.messages;
      if (!Array.isArray(messages) || messages.length === 0) {
        return reply.code(400).send({ ok: false, error: 'messages 不能为空' });
      }
      const recent = messages.slice(-20).map((m) => ({
        role: m.role === 'assistant' || m.role === 'user' ? m.role : 'user',
        content: String(m.content ?? '').slice(0, 2000),
      }));
      try {
        const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [...BUDDY_SYSTEM, ...recent],
            temperature: 0.7,
            // 推理型模型会先消耗 reasoning token，预算给足以保证正文完整
            max_tokens: 2000,
          }),
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          return reply.code(502).send({ ok: false, error: `LLM 请求失败 ${res.status}`, detail: errText.slice(0, 300) });
        }
        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const text = data.choices?.[0]?.message?.content ?? '';
        return { ok: true, reply: text.trim() };
      } catch (e) {
        return reply.code(502).send({ ok: false, error: 'LLM 请求异常', detail: String(e).slice(0, 200) });
      }
    },
  );

  /* ---------- 认证 ---------- */
  app.post<{ Body: { phone?: string } }>('/api/auth/send-code', async (req, reply) => {
    const phone = (req.body?.phone ?? '').trim();
    if (!/^1\d{10}$/.test(phone)) {
      return reply.code(400).send({ ok: false, error: '手机号格式不正确' });
    }
    // mock 态用固定码；真实提供商生成随机 6 位码
    const code = config.smsProviderName === 'mock' ? config.smsMockCode : String(Math.floor(100000 + Math.random() * 900000));
    await q('INSERT INTO sms_codes (phone, code, expires_at) VALUES (?,?,DATE_ADD(NOW(), INTERVAL ? MINUTE))', [
      phone,
      code,
      config.smsCodeTtlMin,
    ]);
    try {
      await smsProvider().sendCode(phone, code);
    } catch (e) {
      return reply.code(502).send({ ok: false, error: `短信发送失败：${(e as Error).message}` });
    }
    return { ok: true, mock: config.smsProviderName === 'mock', devCode: config.smsProviderName === 'mock' ? code : undefined };
  });

  app.post<{ Body: { phone?: string; code?: string } }>('/api/auth/login', async (req, reply) => {
    const phone = (req.body?.phone ?? '').trim();
    const code = (req.body?.code ?? '').trim();
    if (!/^1\d{10}$/.test(phone)) return reply.code(400).send({ ok: false, error: '手机号格式不正确' });
    // 校验：最近一条未消费且未过期的验证码；mock 态额外接受固定码
    const ok = await q<{ n: number } & RowDataPacket>(
      'SELECT COUNT(*) AS n FROM sms_codes WHERE phone=? AND code=? AND consumed=0 AND expires_at>NOW() ORDER BY id DESC LIMIT 1',
      [phone, code],
    );
    const mockOk = config.smsProviderName === 'mock' && code === config.smsMockCode;
    if (!ok[0]?.n && !mockOk) {
      return reply.code(401).send({ ok: false, error: '验证码不正确或已过期' });
    }
    await q('UPDATE sms_codes SET consumed=1 WHERE phone=? AND code=? AND consumed=0', [phone, code]);
    let rows = await q<{ id: number; nickname: string; role: string } & RowDataPacket>('SELECT id, nickname, role FROM users WHERE phone=? LIMIT 1', [phone]);
    let user = rows[0];
    if (!user) {
      await q('INSERT INTO users (phone, nickname, role) VALUES (?,?,?)', [phone, `家长${phone.slice(-4)}`, 'parent']);
      rows = await q<{ id: number; nickname: string; role: string } & RowDataPacket>('SELECT id, nickname, role FROM users WHERE phone=? LIMIT 1', [phone]);
      user = rows[0];
    }
    const familyId = await familyOfUser(user.id);
    const token = signToken({ userId: user.id, phone }, user.role === 'admin' ? 'admin' : 'parent');
    return { ok: true, token, userId: user.id, familyId, nickname: user.nickname, role: user.role };
  });

  /* ---------- 家长账号登录（账号密码，由管理员在管理页创建） ---------- */
  app.post<{ Body: { loginName?: string; password?: string } }>('/api/auth/parent-login', async (req, reply) => {
    const loginName = (req.body?.loginName ?? '').trim();
    const password = req.body?.password ?? '';
    const rows = await q<{ id: number; role: string; nickname: string; login_hash: string | null } & RowDataPacket>(
      'SELECT id, role, nickname, login_hash FROM users WHERE login_name=? LIMIT 1',
      [loginName],
    );
    const row = rows[0];
    if (!row || !row.login_hash || !verifyPassword(password, row.login_hash)) {
      return reply.code(401).send({ ok: false, error: '账号或密码不正确' });
    }
    const token = signToken({ userId: row.id, phone: '' }, row.role === 'admin' ? 'admin' : 'parent');
    return { ok: true, token, userId: row.id, role: row.role, nickname: row.nickname };
  });

  /* ---------- 管理员：创建/查看家长账号 ---------- */
  app.post<{ Body: { name?: string; password?: string } }>('/api/admin/parents', authed, async (req, reply) => {
    if (!isAdmin(req)) return reply.code(403).send({ ok: false, error: '仅管理员可操作' });
    const name = (req.body?.name ?? '').trim();
    const password = (req.body?.password ?? '').trim();
    if (!name || password.length < 4) return reply.code(400).send({ ok: false, error: '请填写家长名与至少4位密码' });
    const exists = await q<RowDataPacket>('SELECT id FROM users WHERE login_name=? LIMIT 1', [name]);
    if (exists[0]) return reply.code(409).send({ ok: false, error: '该登录名已被占用' });
    const phone = `9${String(Date.now()).slice(-10)}`;
    await q('INSERT INTO users (phone, nickname, login_name, login_hash, role) VALUES (?,?,?,?,?)', [phone, name, name, hashPassword(password), 'parent']);
    return { ok: true, loginName: name };
  });

  app.get('/api/admin/parents', authed, async (req, reply) => {
    if (!isAdmin(req)) return reply.code(403).send({ ok: false, error: '仅管理员可操作' });
    const rows = await q<RowDataPacket>('SELECT id, nickname, login_name, role, created_at FROM users WHERE role<>"child" ORDER BY id');
    return { ok: true, parents: rows };
  });

  /* ---------- 家庭与儿童档案 ---------- */
  app.get('/api/me', authed, async (req) => {
    const userId = parentId(req)!;
    const familyId = await familyOfUser(userId);
    const children = await q<RowDataPacket>('SELECT id, name, avatar, grade FROM children WHERE family_id=? ORDER BY id', [familyId]);
    return { ok: true, familyId, children };
  });

  app.post<{ Body: { name?: string; avatar?: string; grade?: string } }>('/api/family/children', authed, async (req, reply) => {
    const userId = parentId(req)!;
    const familyId = await familyOfUser(userId);
    const name = (req.body?.name ?? '').trim();
    if (!name) return reply.code(400).send({ ok: false, error: '请填写孩子昵称' });
    const avatar = (req.body?.avatar ?? '🐯').slice(0, 8);
    const grade = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'].includes(req.body?.grade ?? '') ? req.body!.grade! : 'g1';
    const id = await insertOne('INSERT INTO children (family_id, name, avatar, grade) VALUES (?,?,?,?)', [familyId, name, avatar, grade]);
    return { ok: true, id };
  });

  app.put<{ Params: { id: string }; Body: { name?: string; avatar?: string; grade?: string } }>(
    '/api/family/children/:id', authed, async (req, reply) => {
      const userId = parentId(req)!;
      const familyId = await familyOfUser(userId);
      const id = Number(req.params.id);
      const owned = await q<RowDataPacket>('SELECT id FROM children WHERE id=? AND family_id=? LIMIT 1', [id, familyId]);
      if (!owned[0]) return reply.code(404).send({ ok: false, error: '未找到该儿童档案' });
      const name = (req.body?.name ?? '').trim();
      const sets: string[] = []; const vals: unknown[] = [];
      if (name) { sets.push('name=?'); vals.push(name); }
      if (req.body?.avatar) { sets.push('avatar=?'); vals.push(req.body.avatar.slice(0, 8)); }
      if (req.body?.grade) { sets.push('grade=?'); vals.push(req.body.grade); }
      if (sets.length) { vals.push(id); await q(`UPDATE children SET ${sets.join(',')} WHERE id=?`, vals); }
      return { ok: true };
    });

  app.delete<{ Params: { id: string } }>('/api/family/children/:id', authed, async (req, reply) => {
    const userId = parentId(req)!;
    const familyId = await familyOfUser(userId);
    const id = Number(req.params.id);
    await q('DELETE FROM children WHERE id=? AND family_id=?', [id, familyId]);
    return { ok: true };
  });


  /* ---------- 孩子账号（家长创建；孩子登录） ---------- */
  app.post<{ Body: { childId?: number; loginName?: string; password?: string } }>('/api/auth/child-account', authed, async (req, reply) => {
    const userId = parentId(req);
    const admin = isAdmin(req);
    if (!userId && !admin) return reply.code(403).send({ ok: false, error: '请使用家长/管理员账号' });
    const childId = Number(req.body?.childId ?? 0);
    let owned: RowDataPacket[] = [];
    if (admin) {
      owned = await q<RowDataPacket>('SELECT id, name FROM children WHERE id=? LIMIT 1', [childId]);
    } else {
      const familyId = await familyOfUser(userId!);
      owned = await q<RowDataPacket>('SELECT id, name FROM children WHERE id=? AND family_id=? LIMIT 1', [childId, familyId]);
    }
    if (!owned[0]) return reply.code(404).send({ ok: false, error: '未找到该儿童档案' });
    const password = (req.body?.password ?? '').trim();
    if (password.length < 4) return reply.code(400).send({ ok: false, error: '密码至少 4 位' });
    const loginName = (req.body?.loginName ?? (owned[0].name as string)).trim();
    if (!loginName) return reply.code(400).send({ ok: false, error: '请填写登录名' });
    const exists = await q<RowDataPacket>('SELECT id FROM children WHERE login_name=? AND id<>? LIMIT 1', [loginName, childId]);
    if (exists[0]) return reply.code(409).send({ ok: false, error: '该登录名已被占用' });
    await q('UPDATE children SET login_name=?, login_hash=? WHERE id=?', [loginName, hashPassword(password), childId]);
    return { ok: true, loginName };
  });

  app.post<{ Body: { loginName?: string; password?: string } }>('/api/auth/child-login', async (req, reply) => {
    const loginName = (req.body?.loginName ?? '').trim();
    const password = req.body?.password ?? '';
    const rows = await q<{ id: number; name: string; avatar: string; grade: string; login_hash: string | null } & RowDataPacket>(
      'SELECT id, name, avatar, grade, login_hash FROM children WHERE login_name=? LIMIT 1',
      [loginName],
    );
    const row = rows[0];
    if (!row || !row.login_hash || !verifyPassword(password, row.login_hash)) {
      return reply.code(401).send({ ok: false, error: '账号或密码不正确' });
    }
    const token = signChildToken(row.id);
    return { ok: true, token, childId: row.id, name: row.name, avatar: row.avatar, grade: row.grade };
  });

  app.get('/api/child/me', authed, async (req) => {
    const cid = childScope(req);
    if (!cid) return { ok: false, error: '请使用孩子登录' };
    const rows = await q<{ id: number; name: string; avatar: string; grade: string } & RowDataPacket>(
      'SELECT id, name, avatar, grade FROM children WHERE id=? LIMIT 1',
      [cid],
    );
    const c = rows[0];
    return { ok: !!c, child: c };
  });

  /* ---------- 内容包 v1 下发 ---------- */
  app.get<{ Querystring: { ver?: string } }>('/api/content/package', async (req) => {
    const latest = await q<{ version: number; payload: string; note: string } & RowDataPacket>(
      'SELECT version, payload, note FROM content_packages ORDER BY version DESC LIMIT 1',
    );
    if (!latest[0]) {
      return { ok: false, error: '内容包未初始化，请先运行 npm run seed' };
    }
    const want = Number(req.query.ver ?? 0);
    if (want >= latest[0].version) {
      return { ok: true, version: latest[0].version, upToDate: true };
    }
    return { ok: true, version: latest[0].version, note: latest[0].note, payload: JSON.parse(latest[0].payload) };
  });

  /* ---------- 内容包分片（增量下载 + 断点续传） ---------- */
  app.get('/api/content/manifest', async () => {
    const latest = await q<{ version: number; note: string } & RowDataPacket>(
      'SELECT version, note FROM content_packages ORDER BY version DESC LIMIT 1',
    );
    if (!latest[0]) return { ok: false, error: '内容包未初始化' };
    const chunks = await q<{ chunk_idx: number; hash: string; size: number } & RowDataPacket>(
      'SELECT chunk_idx, hash, size FROM content_chunks WHERE version=? ORDER BY chunk_idx',
      [latest[0].version],
    );
    return {
      ok: true,
      version: latest[0].version,
      note: latest[0].note,
      chunks: chunks.map((c) => ({ idx: c.chunk_idx, hash: c.hash, size: c.size })),
    };
  });

  app.get<{ Params: { idx: string }; Headers: Record<string, string | undefined> }>(
    '/api/content/chunk/:idx',
    async (req, reply) => {
      const latest = await q<{ version: number } & RowDataPacket>('SELECT version FROM content_packages ORDER BY version DESC LIMIT 1');
      if (!latest[0]) return reply.code(503).send({ ok: false, error: '内容包未初始化' });
      const idx = Number(req.params.idx);
      const rows = await q<{ hash: string; payload: string } & RowDataPacket>(
        'SELECT hash, payload FROM content_chunks WHERE version=? AND chunk_idx=? LIMIT 1',
        [latest[0].version, idx],
      );
      if (!rows[0]) return reply.code(404).send({ ok: false, error: '分片不存在' });
      const etag = `"${rows[0].hash}"`;
      if (req.headers['if-none-match'] === etag) {
        reply.header('ETag', etag);
        return reply.code(304).send();
      }
      reply.header('ETag', etag);
      reply.header('Cache-Control', 'public, max-age=86400');
      return { ok: true, idx, hash: rows[0].hash, data: JSON.parse(rows[0].payload) };
    },
  );

  /* ---------- TTS 代理（火山 seed-tts-2.0，服务端注入密钥 + 磁盘缓存） ---------- */
  app.post('/api/volc-tts/api/v3/tts/unidirectional/sse', async (req, reply) => {
    const bodyText = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const resourceId = (req.headers['x-api-resource-id'] as string) || config.volc.resourceId;
    const key = crypto.createHash('sha256').update(`${resourceId}|${bodyText}`).digest('hex');
    fs.mkdirSync(config.ttsCacheDir, { recursive: true });
    const file = path.join(config.ttsCacheDir, `${key}.sse`);
    if (!fs.existsSync(file)) {
      if (!config.volc.apiKey) {
        return reply.code(503).send({ ok: false, error: '服务端未配置 VOLC_SPEECH_API_KEY' });
      }
      await synthesizeCache({ bodyText, resourceId, requestId: (req.headers['x-api-request-id'] as string) || crypto.randomUUID(), outFile: file });
    }
    const cached = fs.readFileSync(file);
    reply.header('Content-Type', 'text/event-stream');
    reply.header('Cache-Control', 'public, max-age=31536000, immutable');
    return reply.send(cached);
  });

  /* ---------- 同步（进度 / 练习错题 / 跟读记录） ---------- */
  app.get<{ Querystring: { childId?: string; since?: string } }>('/api/sync', authed, async (req) => {
    const childId = childScope(req) ?? Number(req.query.childId ?? 0);
    const since = Number(req.query.since ?? 0);
    const where = 'child_id=? AND updated_at > FROM_UNIXTIME(?)';
    const progress = await q<RowDataPacket>('SELECT lesson_id, step_idx, stars, score, payload, UNIX_TIMESTAMP(updated_at) AS ts FROM progress WHERE ' + where, [childId, since / 1000]);
    const wrongs = await q<RowDataPacket>('SELECT id, lesson_id, kind, question, answer, wrong, created_at FROM practice_records WHERE child_id=? AND UNIX_TIMESTAMP(created_at) > ? ORDER BY id DESC LIMIT 500', [childId, since / 1000]);
    const readAloud = await q<RowDataPacket>('SELECT id, lesson_id, sentence, score, accuracy, created_at FROM read_aloud_records WHERE child_id=? AND UNIX_TIMESTAMP(created_at) > ? ORDER BY id DESC LIMIT 200', [childId, since / 1000]);
    const points = await q<RowDataPacket>('SELECT source_id, amount, reason, UNIX_TIMESTAMP(created_at) AS ts FROM points_ledger WHERE child_id=? AND UNIX_TIMESTAMP(created_at) > ? ORDER BY id DESC LIMIT 800', [childId, since / 1000]);
    const items = await q<RowDataPacket>('SELECT item_id FROM child_items WHERE child_id=?', [childId]);
    const rewards = await q<RowDataPacket>('SELECT request_id, item_id, name, icon, kind, cost, status, created_at, decided_at FROM reward_requests WHERE child_id=? ORDER BY created_at DESC LIMIT 200', [childId]);
    return { ok: true, now: Date.now(), progress, wrongs, readAloud, points, items: items.map((i) => i.item_id), rewards };
  });

  /* ---------- 积分流水推送（幂等批量写入） ---------- */
  app.post<{ Body: { childId?: number; ledger?: { id: string; amount: number; reason?: string; time?: number }[]; items?: string[]; rewards?: { id: string; itemId: string; name: string; icon: string; kind: string; cost: number; status: string; createdAt: number; decidedAt: number }[] } }>(
    '/api/sync/points', authed, async (req, reply) => {
      const b = req.body ?? {};
      const childId = childScope(req) ?? Number(b.childId ?? 0);
      if (!childId) return reply.code(400).send({ ok: false, error: '缺少 childId' });
      let n = 0;
      for (const e of b.ledger ?? []) {
        const res = await q<RowDataPacket>('INSERT IGNORE INTO points_ledger (child_id, source_id, amount, reason, created_at) VALUES (?,?,?,?,FROM_UNIXTIME(?))', [
          childId, String(e.id).slice(0, 128), e.amount, String(e.reason ?? '').slice(0, 255), Math.floor((e.time ?? Date.now()) / 1000),
        ]);
        n += (res as unknown as { affectedRows?: number })?.affectedRows ?? 0;
      }
      for (const itemId of b.items ?? []) {
        await q('INSERT IGNORE INTO child_items (child_id, item_id) VALUES (?,?)', [childId, String(itemId).slice(0, 64)]);
      }
      for (const rw of b.rewards ?? []) {
        await q(
          'INSERT INTO reward_requests (child_id, request_id, item_id, name, icon, kind, cost, status, created_at, decided_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status), decided_at=VALUES(decided_at)',
          [childId, String(rw.id).slice(0, 64), String(rw.itemId).slice(0, 64), String(rw.name ?? '').slice(0, 128), String(rw.icon ?? '').slice(0, 16), String(rw.kind ?? '').slice(0, 32), rw.cost ?? 0, String(rw.status ?? 'pending').slice(0, 16), rw.createdAt ?? Date.now(), rw.decidedAt ?? 0],
        );
      }
      return { ok: true, applied: n };
    });

  app.put<{ Body: { childId?: number; lessonId?: string; stepIdx?: number; stars?: number; score?: number; payload?: unknown } }>(
    '/api/sync/progress', authed, async (req, reply) => {
      const b2 = req.body ?? {};
      const childId = childScope(req) ?? Number(b2.childId ?? 0);
      const { lessonId, stepIdx, stars, score, payload } = b2;
      if (!childId || !lessonId) return reply.code(400).send({ ok: false, error: '缺少 childId/lessonId' });
      await q(
        'INSERT INTO progress (child_id, lesson_id, step_idx, stars, score, payload) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE step_idx=VALUES(step_idx), stars=VALUES(stars), score=VALUES(score), payload=VALUES(payload)',
        [childId, lessonId, stepIdx ?? 0, stars ?? 0, score ?? 0, payload ? JSON.stringify(payload) : null],
      );
      return { ok: true };
    });

  app.post<{ Body: { childId?: number; lessonId?: string; kind?: string; question?: string; answer?: string; wrong?: boolean; durationMs?: number } }>(
    '/api/sync/practice', authed, async (req, reply) => {
      const b = req.body ?? {};
      const childId = childScope(req) ?? Number(b.childId ?? 0);
      if (!childId || !b.lessonId) return reply.code(400).send({ ok: false, error: '缺少 childId/lessonId' });
      await q('INSERT INTO practice_records (child_id, lesson_id, kind, question, answer, wrong, duration_ms) VALUES (?,?,?,?,?,?,?)', [
        childId, b.lessonId, b.kind ?? 'quiz', b.question ?? '', b.answer ?? '', b.wrong ? 1 : 0, b.durationMs ?? 0,
      ]);
      return { ok: true };
    });

  /* ---------- 跟读评测（可插拔：本地编辑距离打分，预留 ASR 适配点） ---------- */
  app.post<{ Body: { childId?: number; lessonId?: string; target?: string; transcript?: string } }>(
    '/api/score/read-aloud', authed, async (req, reply) => {
      const b = req.body ?? {};
      const childId = childScope(req) ?? Number(b.childId ?? 0);
      if (!b.target) return reply.code(400).send({ ok: false, error: '缺少目标句 target' });
      const transcript = b.transcript ?? '';
      const { score, accuracy } = scoreText(String(b.target), transcript);
      if (childId && b.lessonId) {
        await q('INSERT INTO read_aloud_records (child_id, lesson_id, sentence, transcript, score, accuracy) VALUES (?,?,?,?,?,?)', [
          childId, b.lessonId, String(b.target), transcript, score, accuracy,
        ]);
      }
      return { ok: true, score, accuracy };
    });

  /* ---------- 学习计划 ---------- */
  app.get<{ Querystring: { childId?: string } }>('/api/plans', authed, async (req) => {
    const childId = childScope(req) ?? Number(req.query.childId ?? 0);
    const rows = await q<RowDataPacket>('SELECT id, kind, title, detail, DATE_FORMAT(due_date,"%Y-%m-%d") AS due_date, done, created_at FROM plans WHERE child_id=? ORDER BY done, due_date IS NULL, due_date, id DESC', [childId]);
    return { ok: true, plans: rows };
  });

  app.post<{ Body: { childId?: number; kind?: string; title?: string; detail?: string; dueDate?: string } }>(
    '/api/plans', authed, async (req, reply) => {
      const b = req.body ?? {};
      const childId = childScope(req) ?? Number(b.childId ?? 0);
      if (!childId || !b.title?.trim()) return reply.code(400).send({ ok: false, error: '缺少 childId/title' });
      const id = await insertOne('INSERT INTO plans (child_id, kind, title, detail, due_date) VALUES (?,?,?,?,?)', [
        childId, b.kind ?? 'custom', b.title, b.detail ?? '', b.dueDate || null,
      ]);
      return { ok: true, id };
    });

  app.patch<{ Params: { id: string }; Body: { done?: boolean } }>('/api/plans/:id', authed, async (req) => {
    await q('UPDATE plans SET done=? WHERE id=?', [req.body?.done ? 1 : 0, Number(req.params.id)]);
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>('/api/plans/:id', authed, async (req) => {
    await q('DELETE FROM plans WHERE id=?', [Number(req.params.id)]);
    return { ok: true };
  });

  /* ---------- 系统按年级自动排期 ---------- */
  app.post<{ Body: { childId?: number } }>('/api/plans/system', authed, async (req, reply) => {
    const childId = Number(req.body?.childId ?? 0);
    if (!childId) return reply.code(400).send({ ok: false, error: '缺少 childId' });
    const kids = await q<{ grade: string } & RowDataPacket>('SELECT grade FROM children WHERE id=? LIMIT 1', [childId]);
    if (!kids[0]) return reply.code(404).send({ ok: false, error: '未找到儿童档案' });
    const grade = kids[0].grade;
    const pkg = await q<{ payload: string } & RowDataPacket>('SELECT payload FROM content_packages ORDER BY version DESC LIMIT 1');
    if (!pkg[0]) return reply.code(503).send({ ok: false, error: '内容包未初始化' });
    const curriculum = (JSON.parse(pkg[0].payload) as { curriculum?: { id: string; name: { zh: string }; unit: { zh: string }; subject: string; grade: string; term: string }[] }).curriculum ?? [];
    const mine = curriculum.filter((l) => l.grade === grade && l.subject === 'chinese');
    // 按学期+单元分组，逐组生成一个计划项（截止日期顺延）
    const groups: { key: string; title: string; n: number }[] = [];
    for (const l of mine) {
      const key = `${l.term}|${l.unit.zh}`;
      const g = groups.find((x) => x.key === key);
      if (g) g.n += 1;
      else groups.push({ key, title: `${l.term}册 · ${l.unit.zh}`, n: 1 });
    }
    // 删除旧的系统计划，重新生成
    await q('DELETE FROM plans WHERE child_id=? AND kind="system"', [childId]);
    const today = new Date();
    let created = 0;
    const items = [
      { title: '每天朗读课文 20 分钟', detail: '打开任意一篇课文，使用“读课文”逐句跟读', due: null },
      ...groups.map((g) => ({
        title: `学完${g.title}（${g.n} 课）`,
        detail: '看课文 → 学课文 → 认生字 → 去练习',
        due: null as string | null,
      })),
    ];
    // 系统计划前 4 项分配到本周内，其余不设截止
    for (let i = 0; i < items.length; i++) {
      const d = new Date(today.getTime() + i * 86400_000 * 2);
      const due = i < 4 ? d.toISOString().slice(0, 10) : null;
      await insertOne('INSERT INTO plans (child_id, kind, title, detail, due_date) VALUES (?,?,?,?,?)', [
        childId, 'system', items[i].title, items[i].detail, due,
      ]);
      created += 1;
    }
    return { ok: true, created };
  });

  /* ---------- 学习周报 ---------- */
  app.get<{ Querystring: { childId?: string; weekStart?: string } }>('/api/reports/weekly', authed, async (req) => {
    const childId = childScope(req) ?? Number(req.query.childId ?? 0);
    const start = req.query.weekStart ?? new Date(Date.now() - 6 * 86400_000).toISOString().slice(0, 10);
    const end = new Date(new Date(start).getTime() + 7 * 86400_000).toISOString().slice(0, 10);
    const lessons = await q<{ n: number } & RowDataPacket>('SELECT COUNT(*) AS n FROM practice_records WHERE child_id=? AND created_at>=? AND created_at<?', [childId, start, end]);
    const wrong = await q<{ n: number } & RowDataPacket>('SELECT COUNT(*) AS n FROM practice_records WHERE child_id=? AND wrong=1 AND created_at>=? AND created_at<?', [childId, start, end]);
    const read = await q<{ n: number; avg: string } & RowDataPacket>('SELECT COUNT(*) AS n, COALESCE(AVG(score),0) AS avg FROM read_aloud_records WHERE child_id=? AND created_at>=? AND created_at<?', [childId, start, end]);
    const stars = await q<{ s: number } & RowDataPacket>('SELECT COALESCE(SUM(stars),0) AS s FROM progress WHERE child_id=?', [childId]);
    const weekLessons = await q<{ lesson_id: string; stars: number } & RowDataPacket>('SELECT lesson_id, stars FROM progress WHERE child_id=? AND updated_at>=? ORDER BY stars DESC, lesson_id LIMIT 20', [childId, start]);
    return {
      ok: true,
      weekStart: start, weekEnd: end,
      summary: {
        practiceCount: lessons[0]?.n ?? 0,
        wrongCount: wrong[0]?.n ?? 0,
        readAloudCount: read[0]?.n ?? 0,
        readAloudAvg: Math.round(Number(read[0]?.avg ?? 0)),
        totalStars: Number(stars[0]?.s ?? 0),
      },
      topLessons: weekLessons.map((r) => ({ lessonId: r.lesson_id, stars: r.stars })),
    };
  });


  /* ================= 积分与商店配置（全局，客户端同步读取） ================= */
  app.get('/api/config/store', async () => {
    const rows = await q<{ store_overrides: string | null; task_overrides: string | null } & RowDataPacket>('SELECT store_overrides, task_overrides FROM store_config WHERE id=1');
    if (!rows[0]) return { ok: true, storeOverrides: {}, taskOverrides: {} };
    const parse = (s: unknown): Record<string, unknown> => { if (typeof s === 'string') { try { return JSON.parse(s); } catch { return {}; } } return (s as Record<string, unknown>) ?? {}; };
    return { ok: true, storeOverrides: parse(rows[0].store_overrides), taskOverrides: parse(rows[0].task_overrides) };
  });

  app.put<{ Body: { storeOverrides?: Record<string, unknown>; taskOverrides?: Record<string, unknown> } }>('/api/admin/config/store', authed, async (req, reply) => {
    if (!isAdmin(req)) return reply.code(403).send({ ok: false, error: '仅管理员可操作' });
    const b = req.body ?? {};
    const prev = await q<{ store_overrides: string | null; task_overrides: string | null } & RowDataPacket>('SELECT store_overrides, task_overrides FROM store_config WHERE id=1');
    const parse = (s: unknown): Record<string, unknown> => { if (typeof s === 'string') { try { return JSON.parse(s); } catch { return {}; } } return (s as Record<string, unknown>) ?? {}; };
    const mergedStore = { ...parse(prev[0]?.store_overrides ?? null), ...(b.storeOverrides ?? {}) };
    const mergedTask = { ...parse(prev[0]?.task_overrides ?? null), ...(b.taskOverrides ?? {}) };
    await q(
      'INSERT INTO store_config (id, store_overrides, task_overrides) VALUES (1,?,?) ON DUPLICATE KEY UPDATE store_overrides=VALUES(store_overrides), task_overrides=VALUES(task_overrides)',
      [JSON.stringify(mergedStore), JSON.stringify(mergedTask)],
    );
    await q('INSERT INTO audit_logs (admin_id, action, detail) VALUES (?,?,?)', [parentId(req)!, 'store.config', 'update']);
    return { ok: true };
  });

  /* ================= 管理员后台（/admin，角色=admin） ================= */
  app.get('/api/admin/dashboard', authed, async (req, reply) => {
    if (!isAdmin(req)) return reply.code(403).send({ ok: false, error: '仅管理员可操作' });
    const parents = await q<{ n: number } & RowDataPacket>('SELECT COUNT(*) AS n FROM users WHERE role="parent"');
    const children = await q<{ n: number } & RowDataPacket>('SELECT COUNT(*) AS n FROM children');
    const week = await q<{ n: number } & RowDataPacket>('SELECT COUNT(*) AS n FROM practice_records WHERE created_at>=DATE_SUB(NOW(), INTERVAL 7 DAY)');
    const wrongs = await q<{ n: number } & RowDataPacket>('SELECT COUNT(*) AS n FROM practice_records WHERE wrong=1 AND created_at>=DATE_SUB(NOW(), INTERVAL 7 DAY)');
    const read = await q<{ n: number } & RowDataPacket>('SELECT COUNT(*) AS n FROM read_aloud_records WHERE created_at>=DATE_SUB(NOW(), INTERVAL 7 DAY)');
    const stars = await q<{ s: number } & RowDataPacket>('SELECT COALESCE(SUM(stars),0) AS s FROM progress');
    const ver = await q<{ v: number, note: string } & RowDataPacket>('SELECT version AS v, note FROM content_packages ORDER BY version DESC LIMIT 1');
    return { ok: true,
      parents: parents[0]?.n ?? 0, children: children[0]?.n ?? 0,
      weekPractice: week[0]?.n ?? 0, weekWrong: wrongs[0]?.n ?? 0, weekRead: read[0]?.n ?? 0,
      totalStars: Number(stars[0]?.s ?? 0), contentVersion: ver[0]?.v ?? 0, contentNote: ver[0]?.note ?? '' };
  });

  app.get<{ Querystring: { search?: string } }>('/api/admin/children', authed, async (req, reply) => {
    if (!isAdmin(req)) return reply.code(403).send({ ok: false, error: '仅管理员可操作' });
    const s = (req.query.search ?? '').trim();
    const rows = await q<RowDataPacket>(
      'SELECT c.id, c.name, c.avatar, c.grade, c.login_name, c.login_hash IS NOT NULL AS has_login, u.nickname AS parent_nick, u.login_name AS parent_login ' +
      'FROM children c JOIN families f ON f.id=c.family_id JOIN users u ON u.id=f.owner_user_id ' +
      'WHERE c.name LIKE CONCAT("%", ?, "%") ORDER BY c.id DESC LIMIT 200', [s],
    );
    return { ok: true, children: rows };
  });

  app.patch<{ Params: { id: string }; Body: { password?: string; role?: string; disabled?: boolean } }>('/api/admin/parents/:id', authed, async (req, reply) => {
    if (!isAdmin(req)) return reply.code(403).send({ ok: false, error: '仅管理员可操作' });
    const id = Number(req.params.id);
    if (id === parentId(req)) return reply.code(400).send({ ok: false, error: '不能修改自己的角色/停用自己' });
    const b = req.body ?? {};
    if (b.password && b.password.length >= 4) await q('UPDATE users SET login_hash=? WHERE id=?', [hashPassword(b.password), id]);
    if (b.role && (b.role === 'admin' || b.role === 'parent')) await q('UPDATE users SET role=? WHERE id=?', [b.role, id]);
    if (typeof b.disabled === 'boolean') await q('UPDATE users SET disabled=? WHERE id=?', [b.disabled ? 1 : 0, id]);
    await q('INSERT INTO audit_logs (admin_id, action, detail) VALUES (?,?,?)', [parentId(req)!, 'parent.update', `parent#${id}`]);
    return { ok: true };
  });

  app.get('/api/admin/content/versions', authed, async (req, reply) => {
    if (!isAdmin(req)) return reply.code(403).send({ ok: false, error: '仅管理员可操作' });
    const rows = await q<RowDataPacket>('SELECT version, note, created_at FROM content_packages ORDER BY version DESC LIMIT 20');
    return { ok: true, versions: rows };
  });

  /* 全部课程列表（供内容编辑器选择/检索；只取元信息，体积小） */
  app.get<{ Querystring: { subject?: string; grade?: string; search?: string } }>('/api/admin/content/lessons', authed, async (req, reply) => {
    if (!isAdmin(req)) return reply.code(403).send({ ok: false, error: '仅管理员可操作' });
    const pkg = await q<{ payload: string } & RowDataPacket>('SELECT payload FROM content_packages ORDER BY version DESC LIMIT 1');
    if (!pkg[0]) return reply.code(404).send({ ok: false, error: '内容包未初始化' });
    const parsed = JSON.parse(pkg[0].payload) as { curriculum?: { id: string; name?: { zh?: string; en?: string }; subject?: string; grade?: string; term?: string }[] };
    let list = parsed.curriculum ?? [];
    const { subject, grade, search } = req.query;
    if (subject) list = list.filter((l) => l.subject === subject);
    if (grade) list = list.filter((l) => l.grade === grade);
    const s = (search ?? '').trim();
    if (s) list = list.filter((l) => (l.name?.zh ?? '').includes(s) || (l.name?.en ?? '').toLowerCase().includes(s.toLowerCase()) || l.id.includes(s));
    const lessons = list.map((l) => ({ id: l.id, name: l.name?.zh ?? l.name?.en ?? l.id, subject: l.subject ?? '', grade: l.grade ?? '', term: l.term ?? '' }));
    return { ok: true, lessons };
  });

  /* 读取某课当前生效内容（最新版本的 contents + 管理员可视化覆盖） */
  const jparse = (v: unknown): unknown => (typeof v === 'string' ? JSON.parse(v) : v);
  app.get<{ Params: { id: string } }>('/api/admin/content/lesson/:id', authed, async (req, reply) => {
    if (!isAdmin(req)) return reply.code(403).send({ ok: false, error: '仅管理员可操作' });
    const id = req.params.id;
    const pkg = await q<{ payload: string } & RowDataPacket>('SELECT payload FROM content_packages ORDER BY version DESC LIMIT 1');
    if (!pkg[0]) return reply.code(404).send({ ok: false, error: '内容包未初始化' });
    const parsed = JSON.parse(pkg[0].payload) as { contents?: Record<string, LessonContent> };
    const base = parsed.contents?.[id] ?? {};
    const over = await q<{ text: string | null; words: unknown; points: unknown } & RowDataPacket>(
      'SELECT text, words, points FROM content_overrides WHERE lesson_key=? LIMIT 1', [id],
    );
    const o = over[0];
    const lesson: LessonContent = { ...base };
    if (o?.text != null) lesson.text = o.text;
    if (o?.words != null) lesson.words = jparse(o.words) as string[];
    if (o?.points != null) lesson.points = jparse(o.points) as string[];
    return { ok: true, lesson: { id, ...lesson } };
  });

  /* 保存某课覆盖（仅入库，不立即生效；publish 时合并进新版本） */
  app.put<{ Body: { id?: string; text?: string; words?: string[]; points?: string[] } }>('/api/admin/content/lesson', authed, async (req, reply) => {
    if (!isAdmin(req)) return reply.code(403).send({ ok: false, error: '仅管理员可操作' });
    const { id, text, words, points } = req.body ?? {};
    if (!id) return reply.code(400).send({ ok: false, error: '缺少课程 id' });
    await q(
      'INSERT INTO content_overrides (lesson_key, text, words, points) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE text=VALUES(text), words=VALUES(words), points=VALUES(points)',
      [id, text ?? null, words ? JSON.stringify(words) : null, points ? JSON.stringify(points) : null],
    );
    await q('INSERT INTO audit_logs (admin_id, action, detail) VALUES (?,?,?)', [parentId(req)!, 'content.lesson', id]);
    return { ok: true };
  });

  /* 把全部覆盖合并进最新内容包，生成新版本 v+1（增量分片 hash 不变即不下发） */
  app.post('/api/admin/content/publish', authed, async (req, reply) => {
    if (!isAdmin(req)) return reply.code(403).send({ ok: false, error: '仅管理员可操作' });
    const latest = await q<{ version: number; payload: string } & RowDataPacket>('SELECT version, payload FROM content_packages ORDER BY version DESC LIMIT 1');
    if (!latest[0]) return reply.code(404).send({ ok: false, error: '内容包未初始化' });
    const parsed = JSON.parse(latest[0].payload) as { contents?: Record<string, LessonContent> };
    const contents = parsed.contents ?? {};
    const overs = await q<{ lesson_key: string; text: string | null; words: unknown; points: unknown } & RowDataPacket>('SELECT lesson_key, text, words, points FROM content_overrides');
    let applied = 0;
    for (const o of overs) {
      const cur = { ...(contents[o.lesson_key] ?? {}) } as LessonContent;
      cur.text = o.text ?? cur.text;
      if (o.words != null) cur.words = jparse(o.words) as string[];
      if (o.points != null) cur.points = jparse(o.points) as string[];
      contents[o.lesson_key] = cur;
      applied++;
    }
    const newVersion = latest[0].version + 1;
    const raw = JSON.stringify({ ...parsed, contents });
    const note = `v${newVersion}：管理员发布，应用 ${applied} 课可视化修改`;
    const info = await writeVersion(db(), newVersion, raw, note);
    await q('INSERT INTO audit_logs (admin_id, action, detail) VALUES (?,?,?)', [parentId(req)!, 'content.publish', `v${newVersion}`]);
    return { ok: true, version: newVersion, note, chunks: info.chunks, applied };
  });

  /* 回滚：把某历史版本的内容复制为最新版本 v+1（不删除历史） */
  app.post('/api/admin/content/rollback', authed, async (req, reply) => {
    if (!isAdmin(req)) return reply.code(403).send({ ok: false, error: '仅管理员可操作' });
    const ver = Number((req.body as { version?: number })?.version ?? 0);
    const src = await q<{ payload: string } & RowDataPacket>('SELECT payload FROM content_packages WHERE version=? LIMIT 1', [ver]);
    if (!src[0]) return reply.code(404).send({ ok: false, error: '版本不存在' });
    const latest = await q<{ version: number } & RowDataPacket>('SELECT version FROM content_packages ORDER BY version DESC LIMIT 1');
    const newVersion = (latest[0]?.version ?? ver) + 1;
    const note = `v${newVersion}：管理员回滚到 v${ver}`;
    const info = await writeVersion(db(), newVersion, src[0].payload, note);
    await q('INSERT INTO audit_logs (admin_id, action, detail) VALUES (?,?,?)', [parentId(req)!, 'content.rollback', `v${ver}->v${newVersion}`]);
    return { ok: true, version: newVersion, note, chunks: info.chunks };
  });

  return app;
}
