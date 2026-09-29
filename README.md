# 聪明乐园 Smart Fun Zone 🦖

幼儿智力训练小游戏网站（3–8 岁 · 中英双语 · 商业级品质版 v0.2）。
总体方案见 [`docs/总体方案.md`](docs/总体方案.md)，工程边界与质量要求见 [`docs/架构设计.md`](docs/架构设计.md)、[`docs/工程质量与安全.md`](docs/工程质量与安全.md) 和 [`docs/测试策略.md`](docs/测试策略.md)。

## 运行

本地启动的完整步骤（含语音 TTS、服务端数据库、测试与资产脚本）见 [`docs/本地启动.md`](docs/本地启动.md)。快速开始：

```bash
npm install
npm run dev       # 开发热更新服务器（改完保存即刷新）http://localhost:5173
npm run build     # tsc 类型检查 + vite build
npm run preview   # 预览构建产物（PWA 生效）
npm run lint      # ESLint
npm run test      # Vitest 单元测试
npm run check     # 前后端 lint、测试与构建的完整质量门禁
npm run test:e2e  # Playwright E2E（需先 npx playwright install chromium）
```

## 语音说明（火山引擎 · 豆包语音合成大模型 2.0 seed-tts-2.0）

朗读人声使用 **火山引擎 seed-tts-2.0**（默认音色 中文=爽快思思 / 英文=Dacey），唯一语音通道、无兜底降级：

1. 复制 `server/.env.example` 为 `server/.env`，填入你的 API Key（火山引擎控制台 → 语音技术 → API Key 管理）：
   ```bash
   VOLC_SPEECH_API_KEY=你的密钥
   ```
2. 密钥由 **Fastify 服务端注入**；Vite 的 `/api` 代理只负责把请求转发到本地服务端，
   **不会打包进前端产物**，也绕过了浏览器 CORS 限制；
3. 重启服务端与 `npm run dev` / `npm run preview` 生效；未配置密钥时页面会显示配置提示，语音静默（符合"无兜底"设计）；
4. 可选：在根目录 `.env.local` 中使用 `VITE_VOLC_SPEAKER_ZH` / `VITE_VOLC_SPEAKER_EN` 自定义音色（详见 `.env.example`）。

> 注意：静态部署到非 Vite 服务器时，需要自建等价代理（把 `X-Api-Key` 加在服务端转发）。



## 架构

```
src/
├─ types.ts          # 核心类型（档案/记录/类别/年龄段）
├─ i18n.ts           # 中英双语字典 + useI18n + DICT（可测试）
├─ store.ts          # zustand 全局状态（localStorage 持久化）+ 成长系统辅助
├─ speech.ts         # 火山 TTS 朗读调度与拼音归一化
├─ cloud.ts          # 本地优先的云同步与账号隔离
├─ gameRegistry.ts   # 统一 Game API 注册表
├─ games/            # 7 个纯休闲街机游戏
├─ content/          # 教材、物品、图鉴与课程内容数据
├─ components/       # ui（按钮/星星/开关/彩带/爆裂）、Mascot、Logo、scenes、icons、ErrorBoundary
├─ pages/            # 学校、教材课程、乐园、总部、家长与管理页面
└─ __tests__/        # 领域规则、内容覆盖与状态单元测试
server/src/          # Fastify API、账号权限、同步、TTS 与 MySQL 数据层
e2e/                 # 按业务领域组织的 Playwright 测试
```

新游戏接入：在 `src/games/` 新建街机组件，导出 `GameDef` 并在 `src/games/index.ts` 注册；乐园游戏不承载课程知识点，也不写入课程掌握度。

## 家长中心

入口：首页右上角 🔒。演示初始密码 `1234`（可在设置中修改）。

## 说明

- 语音由服务端代理火山 TTS，浏览器语音识别能力用于可选跟读输入
- 学习可离线进行；登录后按账号隔离并自动同步课程、积分等数据
- 全部素材为自绘 SVG / 系统 emoji / WebAudio 合成，无第三方版权风险
