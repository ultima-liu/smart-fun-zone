import { buildApp } from './app.js';
import { config } from './config.js';
import { initSchema, ping, q } from './db.js';
import { hashPassword } from './auth.js';

const app = buildApp();

/** 引导管理员：管理页创建家长账号；管理员账号由环境变量指定（默认 admin / admin123） */
async function bootstrapAdmin() {
  const loginName = process.env.ADMIN_LOGIN ?? 'admin';
  const password = process.env.ADMIN_PASSWORD ?? 'admin123';
  const rows = await q<{ id: number } & import('mysql2').RowDataPacket>('SELECT id FROM users WHERE login_name=? LIMIT 1', [loginName]);
  if (!rows[0]) {
    await q(
      'INSERT INTO users (phone, nickname, login_name, login_hash, role) VALUES (?,?,?,?,?)',
      ['10000000000', '管理员', loginName, hashPassword(password), 'admin'],
    );
    console.log(`[admin] 已创建引导管理员「${loginName}」（默认密码 admin123，请及时修改）`);
  }
}

async function main() {
  try {
    await initSchema();
  } catch (e) {
    console.error('[db] 初始化建表失败（请确认 MySQL 已启动、MYSQL_* 配置正确）:', (e as Error).message);
    process.exit(1);
  }
  const ok = await ping();
  if (!ok) {
    console.error('[db] MySQL 连接失败');
    process.exit(1);
  }
  await bootstrapAdmin();
  await app.listen({ port: config.port, host: config.host });
  console.log(`✅ 卷卷星球服务端已启动: http://127.0.0.1:${config.port}`);
  console.log(`   /api/health  健康检查（含 TTS 配置状态）`);
  console.log(`   /api/content/package  内容包 v1（先运行 npm run seed）`);
}

main();
