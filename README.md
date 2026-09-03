# 聪明乐园 Smart Fun Zone 🦖

幼儿智力训练小游戏网站（3–8 岁 · 中英双语 · 商业级品质版 v0.2）。
总体方案见 [`docs/总体方案.md`](docs/总体方案.md)，质量升级方案见 [`docs/产品质量升级方案.md`](docs/产品质量升级方案.md)。

## 运行

```bash
npm install
npm run dev       # 开发服务器 http://localhost:5173
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

## 功能一览

- **内容重构（D 混合模型）**：交互为"**学科入口 → 选年级（一至六年级）→ 学期分组真实课程**"——
  6 门学科 × 1–6 年级，**969 个课时**（数学 268 / 语文 333 / 英语 276 / 科学 32 / 生活 48 / 思维 12），**872 个课时含真实内容**（课文原文/例题讲解/生字/知识点）；
  教材版本：数学=**人教版**（单元→课时逐课目录，`src/content/mathCurriculum.ts`）、语文=人教版（统编）、英语=PEP 人教（三年级起点）、科学=教科版、生活=道德与法治、思维=数学思维拓展；
  学习闭环"**内容学习 → 游戏练习 → 达标点亮（3 星转金）**"、演示家长可设跳过、自由乐园纯玩入口保留；
  内容数据按分片文件组织（`src/content/contents/*.ts`），可并行扩展
- **产品化结构**：底部 Tab 导航（首页 / 地图 / 成就 / 我的）、首页模块分区（Hero 今日推荐、六大学习分类入口、成长区、今日任务）、我的页（档案管理/家长中心入口/声音与语言设置）
- **平台**：幼儿档案（头像/名字/年级：一至六年级）、中英双语切换、全局语音（TTS）、
  BGM/音效/语音三独立开关、本地进度持久化、成就徽章、家长中心（PIN 保护：设置/学习报告/每日时长限制/清除数据）
- **成长系统**：学习花园（星星养植物）、今日任务（3 项）、连续打卡
- **12 个游戏全部可玩**（每游戏 5 关，JSON 关卡包驱动）：

| 类别 | 游戏 |
|---|---|
| 数学 | 🚜 数字农场 · 🍎 摘苹果 · 🏰 形状城堡 |
| 语言 | 🎣 拼音钓鱼 · 🧱 汉字拼图 · 🦁 英语动物园 |
| 逻辑 | 🚂 规律接龙 · 🗑️ 垃圾分类 |
| 专注 | 🃏 记忆翻牌 · 🔍 火眼金睛 |
| 自然 | 🦉 动物在哪里 |
| 生活 | 🚦 红绿灯 |

- **商业级品质**：吉祥物 IP（小恐龙 SVG）、6 大主题场景插画、糖果设计系统、粒子特效、
  WebAudio 合成 BGM/音效（零素材版权风险）、PWA 离线可用、错误兜底、无障碍（对比度/焦点/减少动效）

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
