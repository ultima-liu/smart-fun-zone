# 聪明乐园 Smart Fun Zone 🦖

幼儿智力训练小游戏网站（3–8 岁 · 中英双语 · 商业级品质版 v0.2）。
总体方案见 [`docs/总体方案.md`](docs/总体方案.md)，质量升级方案见 [`docs/产品质量升级方案.md`](docs/产品质量升级方案.md)。

## 运行

本地启动的完整步骤（含语音 TTS、服务端数据库、测试与资产脚本）见 [`docs/本地启动.md`](docs/本地启动.md)。快速开始：

```bash
npm install
npm run dev       # 开发热更新服务器（改完保存即刷新）http://localhost:5173
npm run build     # tsc 类型检查 + vite build
npm run preview   # 预览构建产物（PWA 生效）
npm run lint      # ESLint
npm run test      # Vitest 单元测试
npm run test:e2e  # Playwright E2E（需先 npx playwright install chromium）
```

## 语音说明（火山引擎 · 豆包语音合成大模型 2.0 seed-tts-2.0）

朗读人声使用 **火山引擎 seed-tts-2.0**（默认音色 中文=爽快思思 / 英文=Dacey），唯一语音通道、无兜底降级：

1. 复制 `.env.example` 为 `.env.local`，填入你的 API Key（火山引擎控制台 → 语音技术 → API Key 管理）：
   ```bash
   VOLC_SPEECH_API_KEY=你的密钥
   ```
2. 密钥由 **Vite dev/preview 代理在服务端注入**（`vite.config.ts` 的 `/api/volc-tts` 代理），
   **不会打包进前端产物**，也绕过了浏览器 CORS 限制；
3. 重启 `npm run dev` / `npm run preview` 生效；未配置密钥时页面会显示配置提示，语音静默（符合"无兜底"设计）；
4. 可选：`VITE_VOLC_SPEAKER_ZH` / `VITE_VOLC_SPEAKER_EN` 自定义音色（详见 `.env.example`）。

> 注意：静态部署到非 Vite 服务器时，需要自建等价代理（把 `X-Api-Key` 加在服务端转发）。



## 架构

```
src/
├─ types.ts          # 核心类型（档案/记录/类别/年龄段）
├─ i18n.ts           # 中英双语字典 + useI18n + DICT（可测试）
├─ store.ts          # zustand 全局状态（localStorage 持久化）+ 成长系统辅助
├─ speech.ts         # 语音朗读 + 合成音效 + BGM 音乐引擎（WebAudio）
├─ gameRegistry.ts   # 统一 Game API 注册表
├─ games/            # 12 个游戏（组件 + levels/*.json 关卡包）+ quiz 通用引擎
├─ components/       # ui（按钮/星星/开关/彩带/爆裂）、Mascot、Logo、scenes、icons、ErrorBoundary
├─ pages/            # 首页/大厅/游戏宿主/成就/家长中心
├─ __tests__/        # 单元测试（store/i18n/关卡包/注册表）
└─ e2e/              # Playwright 主流程冒烟测试
```

新游戏接入：在 `src/games/` 新建组件 + `levels/xxx.json` 关卡包，导出 `GameDef` 并在 `src/games/index.ts` 注册即可。

## 家长中心

入口：首页右上角 🔒。演示初始密码 `1234`（可在设置中修改）。

## 说明

- 语音与音乐使用浏览器能力（Chrome/Edge 体验最佳），首次交互后生效
- 数据保存在浏览器本地，家长中心可一键清除
- 全部素材为自绘 SVG / 系统 emoji / WebAudio 合成，无第三方版权风险
