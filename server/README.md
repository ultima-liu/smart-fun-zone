# 聪明乐园服务端（Fastify + MySQL）

M0/M1：家长账号、家庭/儿童档案、内容包版本化下发、TTS 代理（含缓存）、
学习数据同步、学习计划、学习周报、跟读评测。

## 启动

```bash
# 1. 启动 MySQL（本机已装 MySQL 可跳过）
docker compose up -d mysql

# 2. 安装依赖
npm install

# 3. 配置（开发可使用示例默认值；生产环境必须显式配置）
cp .env.example .env

# 4. 导入仓库内的内容包种子
npm run seed

# 5. 启动服务端（开发）
npm run dev            # http://127.0.0.1:8787

# 6. 单元测试 / 接口冒烟测试
npm test
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
| GET | /api/sync?childId=&since= | 拉取课程、剧情、错题、跟读、积分和物品快照 |
| POST | /api/sync/points | 幂等写入积分流水和物品快照 |
| PUT | /api/sync/progress | 写进度 |
| PUT | /api/sync/story | 写剧情节点与领奖状态（跨端恢复、重置同步） |
| POST | /api/sync/practice | 写练习/错题 |
| POST | /api/score/read-aloud | 跟读评测（可插拔评分） |
| GET/POST | /api/plans | 学习计划 |
| PATCH/DELETE | /api/plans/:id | 完成/删除计划 |
| GET | /api/reports/weekly?childId= | 学习周报 |

## 数据表（src/schema.sql）

users / families / children / sms_codes / content_packages / content_chunks / progress /
story_progress / practice_records / read_aloud_records / plans / points_ledger / child_items /
store_config / audit_logs

## 生产注意事项

- 设置 `NODE_ENV=production`。启动时会拒绝默认 JWT、数据库密码、管理员密码、mock 短信和空 CORS 白名单。
- 所有儿童数据接口使用统一所有权策略：孩子仅自己、家长仅家庭内孩子、管理员仅真实存在的孩子。
- TTS 音频缓存在 var/tts-cache/，可挂载持久卷。
- 应前置 HTTPS 反向代理并配置第二层限流；应用层已对登录、验证码、TTS 和学习助手限流。

## 新增（M1.2）
- 短信可插拔：`SMS_PROVIDER=mock|aliyun`（阿里云短信配置见 .env.example）；验证码存 sms_codes（过期+一次性消费）。
- 内容包增量下载：`GET /api/content/manifest`（分片清单+hash）、`GET /api/content/chunk/:idx`（ETag/304）。
  前端 contentLoader 启动后按 hash 只下载变化分片（每片 3 次重试=断点续传），合并覆盖内置内容并缓存 localStorage。
