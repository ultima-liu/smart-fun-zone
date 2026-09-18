# 语文课文页"聪聪语音导览"方案

## 目标与原则

一年级孩子不识字，要做到**"只靠听声音就能走完一节课"**：聪聪老师在每个节点告诉孩子"现在做什么、怎样算完成、做完了去哪"。方案对使用者只有一条规则：**听聪聪的话；想再听，点聪聪**。对维护者只有一个模式：**引导词集中定义一份，显示与播报同源**。

粒度（已确认）：**阶段进入自动播报 + 小节/题目手动 🔊 重听**。

## 交互设计

1. **阶段自动引导**：进入五个阶段（看图发现/逐句点读/教材练习/动手表达/迁移挑战）时，聪聪老师条自动朗读该阶段引导词（含"完成标志"提示，如"把三个亮点都点一遍，都亮了就按下面的按钮"）。首次进入、切课、点阶段导航切换都触发。沿用数学页 TeacherBar 的成熟模式：`userInteracted` 门控（浏览器自动播放策略）+ `said ref` 只读一次 + `key={phase}` 重挂载 + 400ms 延迟。
2. **聪聪条即遥控器**：现有 `ct-teacher-note` 升级为可交互——右侧加"🔊 再听一遍"大按钮，重听当前阶段引导；监听 `volc-tts-degraded` 显示"🔇 语音暂时不可用"提示（与数学页一致，语文页目前没有）。
3. **完成确认播报**：每阶段 gate 达成时（线索全找到/全部点读跟读完/教材练习完成/动手任务完成），自动播一句"都完成了！点下面的按钮去 XXX"+ correct 音效，让不识字的孩子知道可以往下走。
4. **题干自动读**：迁移挑战每道题进入时自动读题干（数学 PracticeArena 同款 useEffect on index），题干旁配 🔊 重听；动手表达的线索 h3 同样自动读 + 🔊。
5. **小节手动 🔊**：教材练习各 section（会认的字/田字格写字/教材任务）、拼音实验室四个 panel、园地任务的标题+说明配通用小喇叭按钮 `SpeakChip`，点击读该节说明（进入视口不自动读，避免声音轰炸）。
6. **语音开关**：沿用全局 `voiceOn/sound`（家长设置里已有），不新增开关；speech.ts 已统一拦截，静音时所有自动播报自动失效且不阻塞流程。

## 实施步骤

### 1. 引导词集中化（`src/pages/ChineseTextbookLessonPage.tsx`）
- 新增 `phaseGuides(lesson): string[]`：5 句阶段引导词。phase 0 复用 `lesson.teacherIntro`；phase 1-4 把现在内联在 JSX 三元里的聪聪条文案抽出并扩写成"做什么+完成标志+下一步"的口语版；显示文案与播报同源（一条数据两用，改一处看听同步）。

### 2. 聪聪条改造（同文件）
- 新组件 `GuideNote`（替代内联 `ct-teacher-note`）：props `{ text: string }`，内部 `useEffect` + setTimeout(400) 自动播报（`userInteracted` 门控 + said ref），"🔊 再听一遍"按钮，`volc-tts-degraded` 监听横幅。视觉沿用现有 ct-teacher-note 样式，仅加按钮。
- 模块级 `let userInteracted` + `<main onPointerDown>` 置位（照抄数学页 `MathTextbookLabPage.tsx:39-43,1447-1451`）。
- 阶段导航点击时补 `stopSpeaking()`（goNext 已有）。

### 3. 完成确认 + 题干播报（同文件 + LanguageTask/Challenge）
- 五个阶段的 done 状态变化处（`useEffect` 监听 phaseDone）播报"✓ 都完成了，点下面的绿按钮…"。
- `Challenge`：`useEffect` on 题目下标自动读题干；h3 加 🔊。
- `LanguageTask`：线索 h3 自动读 + 🔊。

### 4. 小节 SpeakChip（通用小组件）
- 新建 `src/components/SpeakChip.tsx`（或放语文页内）：小喇叭按钮 `speakOnce(text)`。
- 挂载点：`TextbookStudyStage` 各 section 头（读"标题+说明"）、兜底三步 section、`ChinesePinyinStudyStage` 四个 panel-head、`ChinesePinyinGardenStudyStage` 任务 head、`ChineseKnowledgeExtensionStage` 分隔说明。
- CSS：`.ct-speak-chip` 胶囊样式（双主题、复用 ct-* 变量）。

### 5. E2E 与文档
- E2E（`e2e/chinese-textbook.spec.ts`）：只跑语文相关用例回归（DOM 上主按钮文案与结构不变，预期兼容）；补断言：聪聪条有"再听一遍"按钮、各 section 有 🔊。
- 文档 `docs/语文课程重构.md`：新增"语音导览"一节，记录交互模型（一条规则）与文案集中原则。

## 不做的事（保持简单）
- 不做"不懂就问"AI 问答挂载（数学页已有，语文页属后续增强）。
- 不用全局"小卷"悬浮球做导览（角色混淆，聪聪留在课文页内）。
- 不给 disabled 主按钮做点击播报（有完成确认播报引导已闭环，且 disabled 不触发 click 需改按钮语义，影响现有 E2E 断言）。

## 验证
- `tsc --noEmit` + `npm run build`。
- 只跑相关 E2E：`e2e/chinese-textbook.spec.ts`（7 条）。
- 浏览器实测：走一遍金木水火土，确认进入各阶段自动播报（TTS 日志/听感）、再听一遍、section 🔊、完成确认、挑战题干播报，双主题截图确认 UI；验证后恢复主题。
