# 炸弹人爆炸音效修正

2026-10-04：用户反馈爆炸音效不对、太闷。替换爆炸素材，保留原版其他音乐和事件录音。

旧 `blast-fc-v1.mp3` 来自 Zophar `SFX 4.mp3`，解码后仅开头约 30 毫秒有明显声音，后续基本静音。只检查“文件可解码、有非零信号”无法发现这种缺少完整声音的问题。本轮改为核对音效中段和尾段能量。

## 原版采样与解码

- 原采样：[BOOM.NAS](https://github.com/emu-russia/bomberman-nes/blob/master/BOOM.NAS)，Git blob `f6cb1f7e1cbf768b70d0a635288451d7f69f20d0`，4080 字节；[BMAN.NAS](https://github.com/emu-russia/bomberman-nes/blob/master/BMAN.NAS) 中紧随其后的 `DUMMY` 首字节为 `$FF`，共同组成硬件实际读取的 4081 字节。
- 原版配置：`$4010=$0E`（NTSC CPU 每 72 周期输出一位）、`$4012=$C0`（地址 `$F000`）、`$4013=$FF`（4081 字节），原始播放约 1.3133824 秒。
- 解码依据：[QuickNES DMC 实现](https://github.com/libretro/QuickNES_Core/blob/master/nes_emu/Nes_Oscs.cpp)。逐字节最低位先行，7 位 DAC 每位增减 2，限制在硬件范围。初始 DAC 使用上电值 0。
- 位流保存在 `blast-sample-v2.dmc`，SHA256 `d65319c03f74e795e80e6c0c793d80b65cbd2f7524af728d684a40800a47452a`。只包含爆炸声音数据。
- 独立 DMC 混音、90 / 440 Hz 一阶高通及 14 kHz 一阶低通近似原机模拟输出。随后抗混叠降采样至 44.1 kHz、峰值统一为 0.85，保存单声道 16 位 PCM WAV；保留 80 毫秒滤波衰减。没有新增随机噪声、变调、压缩或混响。

运行文件为 `public/assets/games/bomber/audio/blast-fc-v2.wav`，约 123 KB。播放器继续使用音效增益 0.32、播放速率 1、不循环。连锁爆炸重启一个 DMC 声道，音乐和其他事件音效继续播放；静音、暂停、失焦和离开保持原有清理及异步取消机制。

## 复现

在项目根目录执行 `python3 scripts/assets/render-bomber-blast.py`，需要 Python 3 和 ffmpeg。脚本核对原采样长度与 SHA256，并只更新爆炸 WAV、音频清单中的爆炸条目及播放器配置。通用 `prepare-bomber-audio.py` 也调用该脚本，避免重新生成有问题的旧爆炸素材。

## 验证

| 项目 | v1 | v2 |
|---|---:|---:|
| 文件时长 | 0.1956 秒 | 1.3934 秒（含滤波尾音） |
| 50–150 毫秒 RMS | 0.000011 | 0.367074 |
| 900–1100 毫秒 RMS | 0 | 0.116232 |
| 解码峰值 | 1.4143 | 0.8500 |

原始测量保存在 `blast-audio-verification-v2.json`；其中 v1 路径是已被替换的历史素材。

本轮音频单测 7 项通过，覆盖连锁声道重启、音乐保留、静音和迟到解码取消。只执行爆炸音效与音乐生命周期两个相关 E2E，均通过；爆炸用例通过真实键盘放弹、绕角避险和等待引爆，验证实际播放缓冲区的中段 / 尾段能量、播放速率和非循环状态。定向 ESLint、TypeScript / Vite 构建及包体预算检查通过。
