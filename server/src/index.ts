import { buildApp } from './app.js';
import { assertProductionConfig, config } from './config.js';
import { initSchema, ping, q } from './db.js';
import { hashPassword } from './auth.js';

const app = buildApp();

/** 引导管理员：生产环境必须显式配置；本地开发保留便捷默认值。 */
async function bootstrapAdmin() {
  const loginName = process.env.ADMIN_LOGIN ?? 'admin';
  const password = process.env.ADMIN_PASSWORD ?? 'admin123';
  const rows = await q<{ id: number } & import('mysql2').RowDataPacket>('SELECT id FROM users WHERE login_name=? LIMIT 1', [loginName]);
  if (!rows[0]) {
    await q(
      'INSERT INTO users (phone, nickname, login_name, login_hash, role) VALUES (?,?,?,?,?)',
      ['10000000000', '管理员', loginName, hashPassword(password), 'admin'],
    );
    console.log(`[admin] 已创建引导管理员「${loginName}」`);
    if (!config.production && !process.env.ADMIN_PASSWORD) {
      console.warn('[admin] 当前使用本地开发默认密码；对外部署前必须设置 ADMIN_PASSWORD');
    }
  }
}

async function main() {
  try {
    assertProductionConfig();
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
