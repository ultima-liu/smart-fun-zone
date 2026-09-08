# 聪明乐园服务端（Fastify + MySQL）

M0/M1：家长账号、家庭/儿童档案、内容包版本化下发、TTS 代理（含缓存）、
学习数据同步、学习计划、学习周报、跟读评测。

## 启动

```bash
# 1. 启动 MySQL（本机已装 MySQL 可跳过）
docker compose up -d mysql

# 2. 安装依赖
npm install

# 3. 配置（可选；默认值见 src/config.ts）
cp .env.example .env

# 4. 生成内容包种子（从现有前端课程数据导出 JSON）
node scripts/build-content-pack.mjs

# 5. 导入内容包
npm run seed

# 6. 启动服务端（开发）
npm run dev            # http://127.0.0.1:8787

# 7. 接口冒烟测试（需 MySQL 已启动、内容包已 seed）
npm run smoke
```

## 前端联调

前端 Vite 已把 `/api` 代理到 `http://127.0.0.1:8787`（见根目录 vite.config.ts）。
启动顺序：先起服务端，再 `npm run dev`（前端 5173），前端请求 `/api/*` 自动到达服务端。

## 主要接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/health | 健康检查（含 TTS 配置状态） |
| POST | /api/auth/send-code | 发送验证码（开发态 mock=123456） |
| POST | /api/auth/login | 手机号+验证码登录 → token |
| GET | /api/me | 当前家庭与儿童列表 |
| POST/PUT/DELETE | /api/family/children[/:id] | 儿童档案管理 |
| GET | /api/content/package?ver= | 内容包 v1（版本化下发） |
| POST | /api/volc-tts/api/v3/tts/unidirectional/sse | TTS 代理（服务端密钥 + 磁盘缓存） |
| GET | /api/sync?childId=&since= | 增量拉取（进度/错题/跟读记录） |
| PUT | /api/sync/progress | 写进度 |
| POST | /api/sync/practice | 写练习/错题 |
| POST | /api/score/read-aloud | 跟读评测（可插拔评分） |
| GET/POST | /api/plans | 学习计划 |
| PATCH/DELETE | /api/plans/:id | 完成/删除计划 |
| GET | /api/reports/weekly?childId= | 学习周报 |

## 数据表（src/schema.sql）

users / families / children / sms_codes / content_packages / progress /
practice_records / read_aloud_records / plans / tts_cache

## 生产注意事项

- 修改 JWT_SECRET；短信验证码接真实平台（替换 mock）。
- TTS 音频缓存在 var/tts-cache/，可挂载持久卷。
- 建议前置 Nginx（HTTPS）+ 限流；儿童数据字段级加密见规划。

## 新增（M1.2）
- 短信可插拔：`SMS_PROVIDER=mock|aliyun`（阿里云短信配置见 .env.example）；验证码存 sms_codes（过期+一次性消费）。
- 内容包增量下载：`GET /api/content/manifest`（分片清单+hash）、`GET /api/content/chunk/:idx`（ETag/304）。
  前端 contentLoader 启动后按 hash 只下载变化分片（每片 3 次重试=断点续传），合并覆盖内置内容并缓存 localStorage。
