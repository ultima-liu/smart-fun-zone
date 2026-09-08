import mysql, { type Pool, type RowDataPacket, type ResultSetHeader } from 'mysql2/promise';
import { config } from './config.js';

export type { RowDataPacket };

let pool: Pool | null = null;

export function db(): Pool {
  pool ??= mysql.createPool({
    ...config.mysql,
    waitForConnections: true,
    charset: 'utf8mb4',
    multipleStatements: true,
  });
  return pool;
}

export async function q<T extends RowDataPacket>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await db().query<T[]>(sql, params as never);
  return rows;
}

/** 执行 INSERT，返回自增主键 */
export async function insertOne(sql: string, params: unknown[] = []): Promise<number> {
  const [res] = await db().query<ResultSetHeader>(sql, params as never);
  return Number(res.insertId);
}

/** 建库建表（幂等）：整文件多语句执行 schema.sql，再做增量列迁移 */
export async function initSchema(): Promise<void> {
  const fs = await import('node:fs');
  const sql = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
  await db().query(sql);
  await ensureColumns();
}

/** 幂等补列（MySQL 8 无 ADD COLUMN IF NOT EXISTS，用 information_schema 判断） */
async function ensureColumns(): Promise<void> {
  const tables = ['children', 'users'] as const;
  for (const tbl of tables) {
    const cols = await q<{ COLUMN_NAME: string } & RowDataPacket>(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='${tbl}'`,
      [config.mysql.database],
    );
    const names = new Set(cols.map((c) => c.COLUMN_NAME));
    const adds: string[] = [];
    if (!names.has('login_name')) adds.push('ADD COLUMN login_name VARCHAR(64) NULL');
    if (!names.has('login_hash')) adds.push('ADD COLUMN login_hash VARCHAR(255) NULL');
    if (tbl === 'users' && !names.has('role')) adds.push("ADD COLUMN role VARCHAR(16) NOT NULL DEFAULT 'parent'");
    if (tbl === 'users' && !names.has('disabled')) adds.push('ADD COLUMN disabled TINYINT NOT NULL DEFAULT 0');
    if (adds.length) {
      await db().query(`ALTER TABLE ${tbl} ${adds.join(', ')}`);
    }
  }
}

export async function ping(): Promise<boolean> {
  try {
    await db().query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
