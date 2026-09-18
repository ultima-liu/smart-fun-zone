# 回退"逐句卡拉OK高亮"，保留整组定位高亮

## 背景
逐句卡拉OK的自动时间轴不准确（有伴奏的歌静音检测不可靠），校准又太麻烦。按你的要求回退这部分代码；**之前完成且准确的"播放 MP3 时定位+整组脉冲高亮"保留不动**。

## 回退清单

### 1. 删除文件
- `src/audioLines.ts`（时间轴检测/校准模块，整文件删除）

### 2. `src/pages/EnglishTextbookLessonPage.tsx`
- 删除 import：`import { calibratedTimings, lineTimings, saveCalibration } from '../audioLines';`
- `OriginalAudio`：还原为只带 `onPlayChange` 的简单版——移除 `lines`/`onActiveLine` props、`audioRef`/`timingsRef`/`calibrating`/`taps` 状态、`updateActive`/`refreshTimings`/`applyTimings`/`beginCalibrate`/`tapLine`/`saveCalibrate`、校准面板 JSX 与"校准"按钮；audio 元素还原为 `onPlay={() => onPlayChange?.(true)} onPause/onEnded={() => onPlayChange?.(false)}` 的简单形式
- `OpeningReader`：移除 `activePhrase` 状态、歌词按钮上的 `active-line` 类、OriginalAudio 的 `lines`/`onActiveLine` props（**保留** `songPhrasesRef`/`songLive`/`onSongPlayChange` 整组高亮）
- `SourceContent`：移除 `chantLineId` 状态、歌谣行上的 `active-line` 类、b-chant OriginalAudio 的 `lines`/`onActiveLine` props（**保留** `liveClip`/`blockClip` 整组高亮、`lettersLive`/`decodeRef`）

### 3. `src/english-textbook.css`
- 删除两条 `.active-line` 强高亮规则（212–213 行）
- `.en-mp3-live` 脉冲与文本底色规则**保留**

### 4. `docs/英语三年级上册课程.md`
- 把"卡拉OK式逐行高亮 + 校准"的句子还原为整组定位高亮的描述（与当前实际行为一致）

## 验证
- `npx tsc --noEmit` 干净
- `npx playwright test e2e/english-textbook.spec.ts` 8/8 通过
- 确认无残留引用（grep `audioLines|lineTimings|active-line|校准`）