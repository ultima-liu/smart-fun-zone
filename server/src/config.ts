import 'dotenv/config';

/** 服务端环境配置（可全部用环境变量覆盖，带开发默认值） */
export const config = {
  port: Number(process.env.PORT ?? 8787),
  host: process.env.HOST ?? '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET ?? 'sfz-dev-secret-change-me',
  jwtExpiresIn: '30d',
  /** 短信验证码：mock 态固定码；真实提供商由 sms.ts 注册（SMS_PROVIDER=mock|aliyun） */
  smsMockCode: process.env.SMS_MOCK_CODE ?? '123456',
  smsProviderName: process.env.SMS_PROVIDER ?? 'mock',
  smsCodeTtlMin: Number(process.env.SMS_CODE_TTL_MIN ?? 5),
  mysql: {
    host: process.env.MYSQL_HOST ?? '127.0.0.1',
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER ?? 'root',
    password: process.env.MYSQL_PASSWORD ?? 'sfz123456',
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
};
