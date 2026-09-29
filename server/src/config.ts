import 'dotenv/config';

const nodeEnv = process.env.NODE_ENV ?? 'development';
const production = nodeEnv === 'production';
const defaultJwtSecret = 'sfz-dev-secret-change-me';
const defaultMysqlPassword = 'sfz123456';

/** 服务端环境配置（可全部用环境变量覆盖，带开发默认值） */
export const config = {
  nodeEnv,
  production,
  port: Number(process.env.PORT ?? 8787),
  host: process.env.HOST ?? '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET ?? defaultJwtSecret,
  jwtExpiresIn: '30d',
  /** 短信验证码：mock 态固定码；真实提供商由 sms.ts 注册（SMS_PROVIDER=mock|aliyun） */
  smsMockCode: process.env.SMS_MOCK_CODE ?? '123456',
  smsProviderName: process.env.SMS_PROVIDER ?? 'mock',
  smsCodeTtlMin: Number(process.env.SMS_CODE_TTL_MIN ?? 5),
  mysql: {
    host: process.env.MYSQL_HOST ?? '127.0.0.1',
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER ?? 'root',
    password: process.env.MYSQL_PASSWORD ?? defaultMysqlPassword,
    database: process.env.MYSQL_DB ?? 'smart_fun_zone',
    connectionLimit: Number(process.env.MYSQL_POOL ?? 10),
  },
  volc: {
    apiKey: process.env.VOLC_SPEECH_API_KEY ?? '',
    appId: process.env.VOLC_SPEECH_APP_ID ?? '',
    resourceId: 'seed-tts-2.0',
    endpoint: 'https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse',
    defaultSpeakerZh: 'zh_female_shuangkuaisisi_uranus_bigtts',
    defaultSpeakerEn: 'en_female_dacey_uranus_bigtts',
  },
  /** 学习助手「小卷」LLM（OpenAI 兼容接口，服务端注入密钥） */
  chat: {
    baseUrl: process.env.CHAT_BASE_URL ?? '',
    apiKey: process.env.CHAT_API_KEY ?? '',
    model: process.env.CHAT_MODEL ?? '',
  },
  /** TTS 音频本地缓存目录 */
  ttsCacheDir: process.env.TTS_CACHE_DIR ?? './var/tts-cache',
  /** 内容包种子 JSON（由 scripts/build-content-pack.mjs 从前端数据生成） */
  contentPackSeed: process.env.CONTENT_PACK_SEED ?? './seed/content-pack.json',
  /** 生产环境允许的前端 Origin，逗号分隔；开发环境未配置时允许本地跨域调试。 */
  corsOrigins: (process.env.CORS_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean),
};

/** 防止开发默认凭据被误带到线上。 */
export function assertProductionConfig(): void {
  if (!production) return;
  const problems: string[] = [];
  if (config.jwtSecret === defaultJwtSecret || config.jwtSecret.length < 32) problems.push('JWT_SECRET 必须设置为至少 32 位随机值');
  if (config.mysql.password === defaultMysqlPassword || !process.env.MYSQL_PASSWORD) problems.push('MYSQL_PASSWORD 不能使用开发默认值');
  if (!process.env.ADMIN_LOGIN || !process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) problems.push('ADMIN_LOGIN/ADMIN_PASSWORD 必须显式设置，且管理员密码至少 12 位');
  if (config.smsProviderName === 'mock') problems.push('SMS_PROVIDER 不能为 mock');
  if (config.corsOrigins.length === 0) problems.push('CORS_ORIGINS 必须配置生产前端域名');
  if (problems.length) throw new Error(`生产配置不安全：${problems.join('；')}`);
}
