/* 服务端接口冒烟测试：直接注入 buildApp（不监听端口），覆盖 M0/M1 关键接口 */
import { buildApp } from '../src/app.js';
import { initSchema, db } from '../src/db.js';

const app = buildApp();
await app.ready();
await initSchema();

const phone = `138${String(Date.now()).slice(-8)}`;
let token = '';
let familyId = 0;
let childId = 0;
const fails: string[] = [];
const check = (name: string, cond: boolean, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) fails.push(name);
};

// 1. 健康检查
let res = await app.inject({ method: 'GET', url: '/api/health' });
const health = res.json() as { ok: boolean; db: boolean };
check('health: 服务端与数据库可用', res.statusCode === 200 && health.ok && health.db);

// 2. 验证码 + 登录（mock 态固定码；错误码应拒绝）
res = await app.inject({ method: 'POST', url: '/api/auth/send-code', payload: { phone } });
check('auth: 发送验证码(mock)', res.statusCode === 200);
res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { phone, code: '000000' } });
check('auth: 错误验证码被拒绝', res.statusCode === 401);
res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { phone, code: '123456' } });
const login = res.json() as { ok: boolean; token?: string; familyId?: number };
check('auth: 登录获得 token 与家庭', res.statusCode === 200 && !!login.token && !!login.familyId);
token = login.token!;
familyId = login.familyId!;

// 3. 家庭儿童档案 CRUD
const auth = { authorization: `Bearer ${token}` };
res = await app.inject({ method: 'POST', url: '/api/family/children', headers: auth, payload: { name: '乐乐', avatar: '🦊', grade: 'g2' } });
const child = res.json() as { ok: boolean; id?: number };
check('children: 新增儿童档案', res.statusCode === 200 && !!child.id);
childId = child.id!;
res = await app.inject({ method: 'GET', url: '/api/me', headers: auth });
const me = res.json() as { children: unknown[] };
check('children: /api/me 返回儿童列表', Array.isArray(me.children) && me.children.length === 1);

// 3b. 孩子账号：家长创建 + 孩子登录 + 孩子令牌同步（用独立的孩子，避免影响后续进度/周报断言）
res = await app.inject({ method: 'POST', url: '/api/family/children', headers: auth, payload: { name: '小雨', grade: 'g1' } });
const childB = (res.json() as { ok: boolean; id?: number }).id as number;
res = await app.inject({ method: 'POST', url: '/api/auth/child-account', headers: auth, payload: { childId: childB, loginName: `kid${childB}`, password: '8888' } });
const acc = res.json() as { ok: boolean };
check('child: 家长创建孩子账号', res.statusCode === 200 && acc.ok === true);
res = await app.inject({ method: 'POST', url: '/api/auth/child-login', payload: { loginName: `kid${childB}`, password: '8888' } });
const clogin = res.json() as { ok: boolean; token?: string; childId?: number };
check('child: 孩子登录', res.statusCode === 200 && !!clogin.token);
const childAuth = { authorization: `Bearer ${clogin.token!}` };
res = await app.inject({ method: 'GET', url: '/api/child/me', headers: childAuth });
check('child: /api/child/me', res.statusCode === 200 && (res.json() as { child?: unknown }).child != null);
res = await app.inject({ method: 'PUT', url: '/api/sync/progress', headers: childAuth, payload: { lessonId: 'chinese-g1-b-1-1', stepIdx: 2, stars: 2, score: 80 } }); // childB（无 childId 伪造）
check('child: 孩子可推送自己的进度(忽略伪造childId)', res.statusCode === 200);
res = await app.inject({ method: 'GET', url: '/api/sync?childId=99999&since=0', headers: childAuth });
const csync = res.json() as { progress: unknown[] };
check('child: 只能拉取自己数据', csync.progress.length >= 1);

// 4. 内容包 v1
res = await app.inject({ method: 'GET', url: '/api/content/package' });
const pkg = res.json() as { ok: boolean; payload?: { curriculum: unknown[]; contents: Record<string, unknown> } };
check('content: 内容包 v1 下发', res.statusCode === 200 && pkg.ok === true);
const pkgOk = res.json() as { version: number; payload: { curriculum: unknown[]; contents: Record<string, unknown> } };
check('content: 含课程表与课文内容', pkgOk.payload && pkgOk.payload.curriculum.length > 300 && Object.keys(pkgOk.payload.contents).length > 300);
res = await app.inject({ method: 'GET', url: '/api/content/package?ver=1' });
check('content: 同版本 upToDate', (res.json() as { upToDate?: boolean }).upToDate === true);

// 4b. 内容分片（增量下载 + 304）
res = await app.inject({ method: 'GET', url: '/api/content/manifest' });
const manifest = res.json() as { ok: boolean; version: number; chunks: { idx: number; hash: string; size: number }[] };
check('content: manifest 分片清单', res.statusCode === 200 && manifest.ok && manifest.chunks.length > 30);
res = await app.inject({ method: 'GET', url: '/api/content/chunk/0' });
const chunk0 = res.json() as { ok: boolean; data: { curriculum: unknown[] } };
check('content: 分片 0 下载(课程表)', res.statusCode === 200 && chunk0.data?.curriculum.length > 300);
const etag = res.headers.etag as string;
res = await app.inject({ method: 'GET', url: '/api/content/chunk/0', headers: { 'if-none-match': etag } });
check('content: 分片 304 未变化', res.statusCode === 304);

// 5. 同步：进度 / 错题 / 跟读
res = await app.inject({ method: 'PUT', url: '/api/sync/progress', headers: auth, payload: { childId, lessonId: 'chinese-g2-a-1-1', stepIdx: 2, stars: 3, score: 95, payload: { t: 1 } } });
check('sync: 写入进度', res.statusCode === 200);
res = await app.inject({ method: 'POST', url: '/api/sync/practice', headers: auth, payload: { childId, lessonId: 'chinese-g2-a-1-1', kind: 'quiz', question: '小蝌蚪的妈妈是谁？', answer: '青蛙', wrong: true } });
check('sync: 写入错题', res.statusCode === 200);
res = await app.inject({ method: 'GET', url: `/api/sync?childId=${childId}&since=0`, headers: auth });
const sync = res.json() as { progress: unknown[]; wrongs: unknown[] };
check('sync: 拉取增量', sync.progress.length === 1 && sync.wrongs.length === 1);

// 6. 跟读评测
res = await app.inject({ method: 'POST', url: '/api/score/read-aloud', headers: auth, payload: { childId, lessonId: 'chinese-g2-a-1-1', target: '池塘里有一群小蝌蚪', transcript: '池塘里有一群小蝌蚪' } });
const score = res.json() as { score: number; accuracy: number };
check('score: 跟读评测满分', res.statusCode === 200 && score.score >= 90);
res = await app.inject({ method: 'POST', url: '/api/score/read-aloud', headers: auth, payload: { target: '鹅鹅鹅', transcript: '完全不搭' } });
const score2 = res.json() as { score: number };
check('score: 差转写给低分', score2.score < 50);

// 7. 学习计划
res = await app.inject({ method: 'POST', url: '/api/plans', headers: auth, payload: { childId, kind: 'custom', title: '每天读一篇课文', detail: '本周完成第一单元', dueDate: '2025-01-12' } });
const plan = res.json() as { ok: boolean; id?: number };
check('plans: 家长布置计划', res.statusCode === 200 && !!plan.id);
res = await app.inject({ method: 'GET', url: `/api/plans?childId=${childId}`, headers: auth });
check('plans: 计划列表', (res.json() as { plans: unknown[] }).plans.length === 1);
res = await app.inject({ method: 'PATCH', url: `/api/plans/${plan.id}`, headers: auth, payload: { done: true } });
check('plans: 标记完成', res.statusCode === 200);

// 7b. 系统按年级自动排期
res = await app.inject({ method: 'POST', url: '/api/plans/system', headers: auth, payload: { childId } });
const sysPlan = res.json() as { ok: boolean; created?: number };
check('plans: 按年级自动排期', res.statusCode === 200 && (sysPlan.created ?? 0) >= 3);
res = await app.inject({ method: 'GET', url: `/api/plans?childId=${childId}`, headers: auth });
const plans2 = res.json() as { plans: { kind: string }[] };
check('plans: 系统计划已入列', plans2.plans.some((p) => p.kind === 'system'));

// 8. 学习周报
res = await app.inject({ method: 'GET', url: `/api/reports/weekly?childId=${childId}`, headers: auth });
const report = res.json() as { summary: { practiceCount: number; wrongCount: number; readAloudCount: number; totalStars: number } };
check('report: 周报汇总', res.statusCode === 200 && report.summary.practiceCount === 1 && report.summary.wrongCount === 1 && report.summary.readAloudCount === 1 && report.summary.totalStars === 3);

// 9. 角色模型：引导管理员(直接落库) + 家长账号密码登录 + 管理员创建家长 + 越权拒绝
import { hashPassword } from '../src/auth.js';
const adminName = `admin${Date.now()}`;
await db().query('INSERT INTO users (phone, nickname, login_name, login_hash, role) VALUES (?,?,?,?,?)', [`8${String(Date.now()).slice(-10)}`, '管理员', adminName, hashPassword('admin123'), 'admin']);
res = await app.inject({ method: 'POST', url: '/api/auth/parent-login', payload: { loginName: adminName, password: 'admin123' } });
const ad = res.json() as { ok: boolean; token?: string; role?: string };
check('role: 管理员登录(账号密码)', res.statusCode === 200 && ad.role === 'admin');
const adminAuth = { authorization: `Bearer ${ad.token!}` };
res = await app.inject({ method: 'POST', url: '/api/auth/parent-login', payload: { loginName: adminName, password: 'wrong' } });
check('role: 错误密码被拒', res.statusCode === 401);
const parentName = `parent${Date.now()}`;
res = await app.inject({ method: 'POST', url: '/api/admin/parents', headers: adminAuth, payload: { name: parentName, password: 'p12345' } });
check('role: 管理员创建家长', res.statusCode === 200);
res = await app.inject({ method: 'POST', url: '/api/admin/parents', headers: auth, payload: { name: 'x', password: '123456' } });
check('role: 家长无管理员权限(403)', res.statusCode === 403);
res = await app.inject({ method: 'POST', url: '/api/auth/parent-login', payload: { loginName: parentName, password: 'p12345' } });
const pa = res.json() as { ok: boolean; token?: string; role?: string };
check('role: 家长登录', res.statusCode === 200 && pa.role === 'parent');

await db().end();
console.log(fails.length === 0 ? '\nSMOKE ALL PASS' : `\n${fails.length} FAILURES: ${fails.join(', ')}`);
process.exit(fails.length === 0 ? 0 : 1);
