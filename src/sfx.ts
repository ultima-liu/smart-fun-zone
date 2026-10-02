// 纯合成音效模块：不依赖任何音频文件，使用 Web Audio API 生成
import { useStore } from './store';

let ctx: AudioContext | null = null;

// 抽卡音效只由 GachaModal 使用；稍高于常规交互音，确保在背景音乐和环境噪声下仍清晰可辨。
const GACHA_MASTER_GAIN = 0.8;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!useStore.getState().sound) return null;

  if (!ctx) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  const audioCtx = ctx!;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function tone(
  freq: number,
  dur: number,
  opts: {
    type?: OscillatorType;
    gain?: number;
    endFreq?: number;
    attack?: number;
    delay?: number;
    pan?: number;
  } = {},
) {
  const c = getCtx();
  if (!c) return;

  const t = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const gain = c.createGain();
  const master = c.createGain();
  master.gain.value = GACHA_MASTER_GAIN;

  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (opts.endFreq && opts.endFreq !== freq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.endFreq), t + dur);
  }

  const peak = opts.gain ?? 0.2;
  const attack = Math.min(opts.attack ?? 0.01, dur * 0.4);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.connect(gain);
  gain.connect(master);

  if (opts.pan && 'createStereoPanner' in c) {
    const pan = (c as any).createStereoPanner();
    pan.pan.value = opts.pan;
    master.connect(pan);
    pan.connect(c.destination);
  } else {
    master.connect(c.destination);
  }

  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noise(dur: number, opts: { gain?: number; filter?: number; delay?: number } = {}) {
  const c = getCtx();
  if (!c) return;

  const t = c.currentTime + (opts.delay ?? 0);
  const bufferSize = c.sampleRate * dur;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const src = c.createBufferSource();
  src.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = opts.filter ?? 1200;

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(opts.gain ?? 0.25, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  const master = c.createGain();
  master.gain.value = GACHA_MASTER_GAIN;

  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  master.connect(c.destination);

  src.start(t);
  src.stop(t + dur + 0.05);
}

function thump(delay = 0) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(35, t + 0.22);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.65, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.3);
}

function chime(freq: number, dur = 0.6, delay = 0) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.2, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export const sfx = {
  /** 蓄力阶段音效，level 0~3 逐级升高 */
  charge(level: number) {
    const base = [200, 310, 480, 720][level] ?? 220;
    tone(base, 0.22, { type: 'sawtooth', gain: 0.06, endFreq: base * 1.4, attack: 0.008 });
    tone(base * 1.5, 0.18, { type: 'sine', gain: 0.04, endFreq: base * 1.8, delay: 0.03 });
  },

  /** 爆开瞬间 */
  burst() {
    noise(0.55, { gain: 0.35, filter: 900 });
    noise(0.35, { gain: 0.22, filter: 2800, delay: 0.02 });
    thump(0);
    // 闪光般的铃音
    [880, 1320, 1760].forEach((f, i) => chime(f, 0.8, i * 0.04));
  },

  /** 卡牌 reveal，rarity 越高越华丽 */
  reveal(rarity: string) {
    const base: Record<string, number> = { R: 523, SR: 698, SSR: 988, SP: 1319 };
    const r = base[rarity] ?? 523;
    chime(r, 0.55, 0);
    chime(r * 1.25, 0.45, 0.08);
    if (['SSR', 'SP'].includes(rarity)) {
      chime(r * 1.5, 0.6, 0.16);
      chime(r * 2, 0.5, 0.24);
    }
  },

  /** 打开召唤弹窗 */
  open() {
    tone(330, 0.35, { type: 'sine', gain: 0.04, endFreq: 660, attack: 0.05 });
  },

  /** 点击按钮反馈 */
  click() {
    tone(880, 0.08, { type: 'triangle', gain: 0.03 });
  },

  /** 连连看：点选一块牌 */
  lkSelect() {
    tone(620, 0.09, { type: 'triangle', gain: 0.05, endFreq: 880 });
  },

  /** 连连看：消除成功，combo 越高旋律沿五声音阶爬得越高（封顶两个八度） */
  lkMatch(combo: number) {
    const steps = [0, 2, 4, 7, 9, 12, 14, 16];
    const lift = steps[Math.min(Math.max(combo, 1), steps.length) - 1];
    const base = 523.25 * Math.pow(2, lift / 12);
    chime(base, 0.45, 0);
    chime(base * 1.25, 0.4, 0.07);
    chime(base * 1.5, 0.55, 0.14);
  },

  /** 连连看：同图案但路径不通 */
  lkBlocked() {
    tone(200, 0.16, { type: 'sine', gain: 0.05, endFreq: 150 });
  },

  /** 连连看：提示高亮 */
  lkHint() {
    chime(1318, 0.3, 0);
    chime(1760, 0.4, 0.09);
  },

  /** 连连看：云朵重排 */
  lkShuffle() {
    noise(0.5, { gain: 0.12, filter: 700 });
    tone(320, 0.5, { type: 'sine', gain: 0.045, endFreq: 640, attack: 0.12 });
  },

  /** 连连看：通关小号角 */
  lkWin() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => chime(f, 0.7, i * 0.13));
    chime(1567.98, 1.1, 0.55);
  },

  /** 连连看：闯关时间到（温和的下行音，不刺耳） */
  lkFail() {
    tone(392, 0.4, { type: 'sine', gain: 0.06, endFreq: 262, attack: 0.02 });
    tone(262, 0.55, { type: 'sine', gain: 0.05, delay: 0.22, endFreq: 196, attack: 0.02 });
  },

  // ---------- 棋类：背景音乐启停 ----------
  /** 五子棋：星河夜航背景音乐（游戏挂载时调用，全局 sound 关闭时为空操作） */
  gomokuBgmStart() { gomokuLoop.start(); },
  gomokuBgmStop() { gomokuLoop.stop(); },

  /** 象棋：楚河汉界背景音乐 */
  xiangqiBgmStart() { xiangqiLoop.start(); },
  xiangqiBgmStop() { xiangqiLoop.stop(); },

  // ---------- 棋类：操作音效 ----------
  /** 五子棋：落黑子（木石轻响） */
  gmkPlace() {
    tone(230, 0.14, { type: 'sine', gain: 0.14, endFreq: 110 });
    tone(1150, 0.035, { type: 'triangle', gain: 0.035 });
  },

  /** 五子棋：电脑落白子（稍低稍轻） */
  gmkPlaceAi() {
    tone(180, 0.14, { type: 'sine', gain: 0.1, endFreq: 90 });
    tone(950, 0.03, { type: 'triangle', gain: 0.025 });
  },

  /** 棋类：悔棋（短促上滑） */
  undoSweep() {
    tone(280, 0.2, { type: 'sine', gain: 0.05, endFreq: 520, attack: 0.03 });
  },

  /** 棋类：对局胜利 */
  gameWin() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => chime(f, 0.6, i * 0.12));
    chime(1567.98, 1, 0.5);
  },

  /** 棋类：对局失利（温和下行） */
  gameLose() {
    tone(392, 0.4, { type: 'sine', gain: 0.06, endFreq: 262, attack: 0.02 });
    tone(262, 0.5, { type: 'sine', gain: 0.05, delay: 0.2, endFreq: 196, attack: 0.02 });
  },

  /** 棋类：对局和棋 */
  gameDraw() {
    chime(587.33, 0.5, 0);
    chime(587.33, 0.6, 0.22);
  },

  /** 象棋：选中棋子 */
  xqSelect() {
    tone(680, 0.06, { type: 'triangle', gain: 0.045, endFreq: 900 });
  },

  /** 象棋：走子（木质落盘） */
  xqMove() {
    noise(0.07, { gain: 0.16, filter: 2200 });
    tone(210, 0.12, { type: 'sine', gain: 0.12, endFreq: 130 });
  },

  /** 象棋：吃子（重击） */
  xqCapture() {
    noise(0.1, { gain: 0.24, filter: 1600 });
    tone(150, 0.2, { type: 'sine', gain: 0.2, endFreq: 80 });
    tone(600, 0.06, { type: 'triangle', gain: 0.05, delay: 0.02 });
  },

  /** 象棋：将军提醒（双音） */
  xqCheck() {
    chime(880, 0.16, 0);
    chime(880, 0.2, 0.17);
  },

  /** 连连看：开始云端音乐盒背景音乐（游戏挂载时调用，全局 sound 关闭时为空操作） */
  lkBgmStart() { lkLoop.start(); },
  lkBgmStop() { lkLoop.stop(); },

  // ---------- 星落方块（俄罗斯方块） ----------
  /** 方块：左右移动 */
  blkMove() {
    tone(340, 0.05, { type: 'square', gain: 0.02 });
  },

  /** 方块：旋转 */
  blkRotate() {
    tone(430, 0.08, { type: 'triangle', gain: 0.04, endFreq: 620 });
  },

  /** 方块：触底锁定（轻磕） */
  blkLand() {
    noise(0.06, { gain: 0.12, filter: 1800 });
    tone(150, 0.12, { gain: 0.1, endFreq: 85 });
  },

  /** 方块：直落重击 */
  blkHard() {
    noise(0.1, { gain: 0.2, filter: 1200 });
    tone(110, 0.18, { gain: 0.16, endFreq: 55 });
  },

  /** 方块：暂存交换 */
  blkHold() {
    tone(520, 0.09, { type: 'triangle', gain: 0.035, endFreq: 380 });
  },

  /** 方块：消行。行数越多琶音越宽（四消加彩铃与重拍），连击越高整体音调越高 */
  blkClear(lines: number, combo = 1) {
    // 打碎感：噪声扫频 + 低频冲击
    noise(0.09, { gain: 0.22, filter: 2600 });
    tone(170, 0.13, { gain: 0.16, endFreq: 85 });
    // 亮度随连击沿五声音阶上行（封顶一个八度）
    const lift = [0, 2, 4, 7, 9, 12][Math.min(Math.max(combo, 1), 6) - 1];
    const base = 523.25 * Math.pow(2, lift / 12);
    const chord = [1, 1.25, 1.5, 2];
    for (let i = 0; i < Math.min(lines, 4); i++) {
      chime(base * chord[i], 0.55, i * 0.075);
      chime(base * chord[i] * 2, 0.32, i * 0.075 + 0.015);
    }
    if (lines >= 3) {
      noise(0.18, { gain: 0.14, filter: 4200, delay: 0.1 });
      chime(base * 2.5, 0.6, 0.26);
    }
    if (lines >= 4) {
      chime(base * 3, 0.75, 0.34);
      tone(130, 0.28, { gain: 0.15, endFreq: 60, delay: 0.05 });
    }
  },

  /** 方块：升级 */
  blkLevel() {
    [659.25, 783.99, 987.77, 1318.5].forEach((f, i) => chime(f, 0.55, i * 0.09));
  },

  /** 方块：本局结束（温和的阶梯下行） */
  blkOver() {
    tone(392, 0.4, { gain: 0.06, endFreq: 262, attack: 0.02 });
    tone(262, 0.5, { gain: 0.05, delay: 0.2, endFreq: 196, attack: 0.02 });
    tone(196, 0.7, { gain: 0.045, delay: 0.42, endFreq: 147, attack: 0.02 });
  },

  /** 方块：开始「星落之夜」背景音乐（游戏挂载时调用，全局 sound 关闭时为空操作） */
  blocksBgmStart() { blocksLoop.start(); },
  blocksBgmStop() { blocksLoop.stop(); },

  // ---------- 追星小蛇 ----------
  /** 小蛇：吃到星果（轻弹 + 双音；连击越高沿五声音阶爬得越高，封顶一个八度） */
  snkEat(combo: number) {
    const lift = [0, 2, 4, 7, 9, 12][Math.min(Math.max(combo, 1), 6) - 1];
    const base = 587.33 * Math.pow(2, lift / 12);
    tone(190, 0.07, { type: 'square', gain: 0.03 });
    chime(base, 0.4, 0);
    chime(base * 1.5, 0.32, 0.05);
  },

  /** 小蛇：吃到流星果（彩铃琶音 + 光泽噪声） */
  snkGold() {
    [880, 1108.73, 1318.51, 1760].forEach((f, i) => chime(f, 0.5, i * 0.06));
    noise(0.16, { gain: 0.1, filter: 4200, delay: 0.05 });
  },

  /** 小蛇：提速一档 */
  snkLevel() {
    [587.33, 739.99, 880, 1174.66].forEach((f, i) => chime(f, 0.5, i * 0.08));
  },

  /** 小蛇：本局结束（温和的阶梯下行） */
  snkOver() {
    tone(440, 0.35, { gain: 0.055, endFreq: 330, attack: 0.02 });
    tone(330, 0.45, { gain: 0.05, delay: 0.18, endFreq: 247, attack: 0.02 });
    tone(247, 0.65, { gain: 0.045, delay: 0.38, endFreq: 185, attack: 0.02 });
  },

  /** 小蛇：开始「云隙流光」背景音乐（游戏挂载时调用，全局 sound 关闭时为空操作） */
  snakeBgmStart() { snakeLoop.start(); },
  snakeBgmStop() { snakeLoop.stop(); },

  // ---------- 星屿扫雷 ----------
  /** 扫雷：翻开格子（涟漪按展开深度沿五声音阶上爬，封顶一个八度） */
  msOpen(depth: number) {
    const lift = [0, 2, 4, 7, 9][Math.min(Math.max(depth, 0), 4)];
    chime(587.33 * Math.pow(2, lift / 12), 0.3, depth * 0.055);
  },

  /** 扫雷：插旗（清脆双音上跳） */
  msFlag() {
    tone(740, 0.07, { type: 'triangle', gain: 0.05, endFreq: 980 });
    tone(980, 0.09, { type: 'triangle', gain: 0.04, delay: 0.06 });
  },

  /** 扫雷：拔旗（短促下行） */
  msUnflag() {
    tone(520, 0.09, { type: 'triangle', gain: 0.04, endFreq: 360 });
  },

  /** 扫雷：踩雷（爆开噪声 + 双重低频冲击） */
  msBoom() {
    noise(0.5, { gain: 0.4, filter: 800 });
    noise(0.3, { gain: 0.22, filter: 2400, delay: 0.02 });
    thump(0);
    thump(0.08);
  },

  /** 扫雷：排雷成功（上行小号角 + 收尾高铃） */
  msWin() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => chime(f, 0.65, i * 0.1));
    chime(1567.98, 1.2, 0.55);
  },

  /** 扫雷：排雷提示（星光双闪） */
  msHint() {
    chime(1318.5, 0.3, 0);
    chime(1760, 0.4, 0.09);
  },

  /** 扫雷：开始「星屿谜航」背景音乐（游戏挂载时调用，全局 sound 关闭时为空操作） */
  minesBgmStart() { minesLoop.start(); },
  minesBgmStop() { minesLoop.stop(); },

  // ---------- 云舟弹星 ----------
  /** 弹星：发射星弹（上滑噪声 + 上升音） */
  brkLaunch() {
    noise(0.18, { gain: 0.09, filter: 1500 });
    tone(300, 0.16, { type: 'triangle', gain: 0.06, endFreq: 640, attack: 0.01 });
  },

  /** 弹星：云舟接住星弹（温暖的弹音） */
  brkBounce() {
    tone(196, 0.09, { type: 'triangle', gain: 0.07, endFreq: 150, attack: 0.004 });
    tone(392, 0.05, { gain: 0.028, delay: 0.01 });
  },

  /** 弹星：撞到云壁（轻点） */
  brkWall() {
    tone(620, 0.045, { gain: 0.026 });
  },

  /** 弹星：硬砖/铁砖受击未碎（低哑闷响） */
  brkChip() {
    tone(150, 0.07, { type: 'square', gain: 0.035, endFreq: 110 });
  },

  /** 弹星：敲碎星砖（碎裂噪声 + 连击沿五声音阶爬升，封顶一个八度） */
  brkBreak(combo: number) {
    const lift = [0, 2, 4, 7, 9, 12][Math.min(Math.max(combo, 1), 6) - 1];
    const base = 523.25 * Math.pow(2, lift / 12);
    noise(0.1, { gain: 0.07, filter: 2600 });
    chime(base, 0.34, 0);
    chime(base * 1.5, 0.26, 0.04);
  },

  /** 弹星：接住星辉道具（彩铃琶音） */
  brkPower() {
    [783.99, 987.77, 1174.66].forEach((f, i) => chime(f, 0.42, i * 0.055));
    noise(0.12, { gain: 0.06, filter: 4200, delay: 0.04 });
  },

  /** 弹星：星弹坠海（温和的下行） */
  brkLife() {
    tone(392, 0.3, { gain: 0.06, endFreq: 262, attack: 0.015 });
    tone(262, 0.4, { gain: 0.05, delay: 0.16, endFreq: 175, attack: 0.015 });
  },

  /** 弹星：通关（上行号角琶音 + 光泽噪声） */
  brkStage() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => chime(f, 0.55, i * 0.08));
    noise(0.3, { gain: 0.08, filter: 3600, delay: 0.1 });
  },

  /** 弹星：本局结束（温和的阶梯下行） */
  brkOver() {
    tone(415, 0.35, { gain: 0.055, endFreq: 311, attack: 0.02 });
    tone(311, 0.45, { gain: 0.05, delay: 0.18, endFreq: 233, attack: 0.02 });
    tone(233, 0.65, { gain: 0.045, delay: 0.38, endFreq: 175, attack: 0.02 });
  },

  /** 弹星：开始「云海跃光」背景音乐（游戏挂载时调用，全局 sound 关闭时为空操作） */
  breakoutBgmStart() { breakoutLoop.start(); },
  breakoutBgmStop() { breakoutLoop.stop(); },

  // ---------- 大鱼吃小鱼 ----------
  fishStart() { [523.25, 659.25, 783.99].forEach((f, i) => chime(f, .3, i * .08)); },
  fishEat(combo: number) {
    const note = [659.25, 739.99, 880, 987.77, 1174.66][Math.min(combo - 1, 4)];
    chime(note, .28, 0);
    if (combo >= 3) chime(note * 1.5, .3, .05);
  },
  fishHit() { tone(260, .28, { type: 'triangle', gain: .08, endFreq: 110 }); noise(.15, { gain: .045, filter: 900 }); },
  fishSchool() { [659.25, 783.99, 987.77].forEach((f, i) => chime(f, .34, i * .065)); },
  fishGold() { [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => chime(f, .5, i * .07)); },
  fishWarning() { tone(330, .16, { type: 'triangle', gain: .035, endFreq: 260 }); tone(260, .17, { type: 'triangle', gain: .03, delay: .2, endFreq: 220 }); },
  fishDodge() { chime(880, .33, 0); chime(1174.66, .4, .08); },
  fishMission() { [783.99, 987.77, 1318.51].forEach((f, i) => chime(f, .42, i * .075)); },
  fishWin() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => chime(f, .7, i * .12)); },
  fishOver() { [392, 330, 261.63].forEach((f, i) => tone(f, .4, { gain: .04, delay: i * .17 })); },
  fishBgmStart() { fishLoop.start(); },
  fishBgmStop() { fishLoop.stop(); },

  // ---------- 云海泡泡龙 ----------
  /** 泡泡龙：发射（短促“啵”声上滑） */
  bubShoot() {
    noise(0.12, { gain: 0.07, filter: 1800 });
    tone(360, 0.14, { type: 'triangle', gain: 0.06, endFreq: 720, attack: 0.008 });
  },

  /** 泡泡龙：泡泡粘附到云阵（软木轻响） */
  bubStick() {
    tone(240, 0.1, { type: 'sine', gain: 0.11, endFreq: 150 });
    tone(980, 0.03, { type: 'triangle', gain: 0.03 });
  },

  /** 泡泡龙：换泡泡（双音轻跳） */
  bubSwap() {
    tone(500, 0.07, { type: 'triangle', gain: 0.04, endFreq: 640 });
    tone(680, 0.08, { type: 'triangle', gain: 0.035, delay: 0.06 });
  },

  /** 泡泡龙：爆泡（连击沿五声音阶升调，颗数越多琶音越宽；悬空掉落补一段下行水漂音） */
  bubPop(popped: number, combo = 1, fallen = 0) {
    const lift = [0, 2, 4, 7, 9, 12][Math.min(Math.max(combo, 1), 6) - 1];
    const base = 523.25 * Math.pow(2, lift / 12);
    const n = Math.min(popped, 6);
    for (let i = 0; i < n; i++) {
      const f = base * [1, 1.2, 1.5, 1.8, 2, 2.4][i]!;
      // “啵”：高频噪声破裂 + 音高下滑的水泡音
      noise(0.05, { gain: 0.16, filter: 3000, delay: i * 0.055 });
      tone(f * 1.06, 0.16, { type: 'sine', gain: 0.07, endFreq: f * 0.72, delay: i * 0.055, attack: 0.006 });
    }
    if (popped >= 4) {
      noise(0.16, { gain: 0.12, filter: 4200, delay: 0.2 });
      chime(base * 2.5, 0.55, 0.26);
    }
    if (fallen > 0) {
      const dropBase = 660;
      for (let i = 0; i < Math.min(fallen, 4); i++) {
        tone(dropBase / (1 + i * 0.18), 0.2, { type: 'sine', gain: 0.045, endFreq: dropBase / (2 + i * 0.3), delay: 0.24 + i * 0.07, attack: 0.01 });
      }
    }
  },

  /** 泡泡龙：云层下降（低沉的云滚动 + 重拍） */
  bubDrop() {
    noise(0.4, { gain: 0.18, filter: 700 });
    tone(130, 0.26, { gain: 0.2, endFreq: 70 });
    thump(0.06);
  },

  /** 泡泡龙：云层突破（上行号角 + 光泽噪声） */
  bubStage() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => chime(f, 0.6, i * 0.09));
    noise(0.28, { gain: 0.08, filter: 3600, delay: 0.1 });
  },

  /** 泡泡龙：本局结束（温和的阶梯下行） */
  bubOver() {
    tone(392, 0.38, { gain: 0.055, endFreq: 294, attack: 0.02 });
    tone(294, 0.46, { gain: 0.05, delay: 0.2, endFreq: 220, attack: 0.02 });
    tone(220, 0.66, { gain: 0.045, delay: 0.4, endFreq: 165, attack: 0.02 });
  },

  /** 泡泡龙：开始「云泡迪斯科」背景音乐（游戏挂载时调用，全局 sound 关闭时为空操作） */
  bubblesBgmStart() { bubblesLoop.start(); },
  bubblesBgmStop() { bubblesLoop.stop(); },

  // ---------- 星仓推箱 ----------
  /** 推箱：小星使迈步（轻快的脚步点） */
  skbStep() {
    tone(240, 0.05, { type: 'triangle', gain: 0.035, endFreq: 190 });
  },

  /** 推箱：推动星箱（木箱蹭地低鸣） */
  skbPush() {
    noise(0.13, { gain: 0.14, filter: 760 });
    tone(140, 0.16, { gain: 0.13, endFreq: 95 });
  },

  /** 推箱：星箱卡进星光托盘（落定的双音） */
  skbGoal() {
    chime(783.99, 0.4, 0);
    chime(1174.66, 0.5, 0.07);
  },

  /** 推箱：撞墙（闷响） */
  skbBlocked() {
    tone(120, 0.09, { type: 'square', gain: 0.045, endFreq: 85 });
  },

  /** 推箱：撤销一步（短促上滑） */
  skbUndo() {
    tone(300, 0.16, { type: 'sine', gain: 0.05, endFreq: 480, attack: 0.02 });
  },

  /** 推箱：本关完成（上行号角 + 光泽收尾） */
  skbWin() {
    [587.33, 739.99, 880, 1174.66, 1318.5].forEach((f, i) => chime(f, 0.6, i * 0.09));
    noise(0.22, { gain: 0.07, filter: 4200, delay: 0.28 });
    chime(1567.98, 1, 0.42);
  },

  /** 推箱：开始「星仓夜航」背景音乐（游戏挂载时调用，全局 sound 关闭时为空操作） */
  sokobanBgmStart() { sokobanLoop.start(); },
  sokobanBgmStop() { sokobanLoop.stop(); },

  // ---------- 星门华容 ----------
  /** 华容：选中棋块（木鱼轻点） */
  hrdSelect() {
    tone(660, 0.05, { type: 'triangle', gain: 0.04, endFreq: 820 });
  },

  /** 华容：棋块滑动（木块蹭地 + 低音衬底） */
  hrdSlide() {
    noise(0.1, { gain: 0.13, filter: 900 });
    tone(180, 0.11, { gain: 0.1, endFreq: 130 });
  },

  /** 华容：滑动受阻（低哑闷响） */
  hrdBlocked() {
    tone(110, 0.1, { type: 'square', gain: 0.045, endFreq: 78 });
  },

  /** 华容：撤销一步（短促上滑） */
  hrdUndo() {
    tone(280, 0.16, { type: 'sine', gain: 0.05, endFreq: 460, attack: 0.02 });
  },

  /** 华容：曹操出逃成功（城门轰鸣 + 上行号角） */
  hrdWin() {
    noise(0.5, { gain: 0.2, filter: 500 });
    thump(0.05);
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => chime(f, 0.65, 0.12 + i * 0.1));
    chime(1567.98, 1.2, 0.68);
  },

  /** 华容：开始「华容古道」背景音乐（游戏挂载时调用，全局 sound 关闭时为空操作） */
  klotskiBgmStart() { klotskiLoop.start(); },
  klotskiBgmStop() { klotskiLoop.stop(); },

  // ---------- 星牌记忆（记忆翻牌） ----------
  /** 翻牌：轻快的纸页翻动 */
  memFlip() {
    noise(0.06, { gain: 0.1, filter: 2600 });
    tone(520, 0.08, { type: 'triangle', gain: 0.045, endFreq: 760 });
  },

  /** 配对成功（连击沿五声音阶爬升，封顶一个八度） */
  memMatch(combo: number) {
    const lift = [0, 2, 4, 7, 9, 12][Math.min(Math.max(combo, 1), 6) - 1];
    const base = 659.25 * Math.pow(2, lift / 12);
    chime(base, 0.45, 0);
    chime(base * 1.25, 0.4, 0.07);
    chime(base * 1.5, 0.5, 0.14);
  },

  /** 配对失败（温和的下行双音，不刺耳） */
  memMiss() {
    tone(330, 0.12, { type: 'sine', gain: 0.04, endFreq: 260 });
    tone(247, 0.16, { type: 'sine', gain: 0.035, delay: 0.1, endFreq: 196 });
  },

  /** 全部配对完成（上行号角 + 收尾高铃） */
  memWin() {
    [587.33, 659.25, 783.99, 1046.5].forEach((f, i) => chime(f, 0.6, i * 0.11));
    chime(1567.98, 1.1, 0.5);
  },

  /** 记忆提示（星光双闪） */
  memHint() {
    chime(1318.5, 0.3, 0);
    chime(1760, 0.4, 0.09);
  },

  /** 记忆翻牌：开始「星牌摇篮曲」背景音乐（游戏挂载时调用，全局 sound 关闭时为空操作） */
  memoryBgmStart() { memoryLoop.start(); },
  memoryBgmStop() { memoryLoop.stop(); },

  // ---------- 云阶接龙（纸牌接龙） ----------
  /** 接龙：选牌（木鱼轻点） */
  solSelect() {
    tone(640, 0.05, { type: 'triangle', gain: 0.04, endFreq: 800 });
  },

  /** 接龙：牌落到桌（纸牌轻拍） */
  solMove() {
    noise(0.05, { gain: 0.13, filter: 3000 });
    tone(240, 0.09, { type: 'sine', gain: 0.09, endFreq: 170 });
  },

  /** 接龙：从牌堆翻牌（纸页上滑） */
  solDraw() {
    noise(0.09, { gain: 0.1, filter: 2200 });
    tone(430, 0.09, { type: 'triangle', gain: 0.04, endFreq: 640 });
  },

  /** 接龙：收回基础堆（已收张数越多音越高，封顶一个八度） */
  solFound(count: number) {
    const lift = [0, 2, 4, 5, 7, 9, 12][Math.min(Math.max(count, 1), 7) - 1];
    const base = 523.25 * Math.pow(2, lift / 12);
    chime(base, 0.4, 0);
    chime(base * 1.5, 0.34, 0.06);
  },

  /** 接龙：弃牌堆翻回牌堆（温柔的纸堆翻转） */
  solRecycle() {
    noise(0.22, { gain: 0.12, filter: 900 });
    tone(300, 0.24, { type: 'sine', gain: 0.05, endFreq: 500, attack: 0.05 });
  },

  /** 接龙：操作不可行（低哑闷响） */
  solBlocked() {
    tone(140, 0.09, { type: 'square', gain: 0.04, endFreq: 100 });
  },

  /** 接龙：撤销一步（短促上滑） */
  solUndo() {
    tone(300, 0.16, { type: 'sine', gain: 0.05, endFreq: 480, attack: 0.02 });
  },

  /** 接龙：接龙完成（上行号角 + 光泽收尾） */
  solWin() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => chime(f, 0.65, i * 0.1));
    noise(0.28, { gain: 0.08, filter: 4200, delay: 0.32 });
    chime(1567.98, 1.2, 0.58);
  },

  /** 接龙：提示（星光双闪） */
  solHint() {
    chime(1174.66, 0.28, 0);
    chime(1567.98, 0.38, 0.08);
  },

  /** 接龙：开始「云阶夜曲」背景音乐（游戏挂载时调用，全局 sound 关闭时为空操作） */
  solitaireBgmStart() { solitaireLoop.start(); },
  solitaireBgmStop() { solitaireLoop.stop(); },

  // ---------- 云端黄金矿工 ----------
  /** 飞爪穿云下落 */
  minerLaunch() {
    noise(0.16, { gain: 0.07, filter: 1450 });
    tone(420, 0.22, { type: 'triangle', gain: 0.045, endFreq: 230 });
  },
  /** 抓住矿物；云岩使用更低沉的碰撞声 */
  minerCatch(rock = false) {
    noise(0.08, { gain: rock ? 0.17 : 0.1, filter: rock ? 760 : 1900 });
    tone(rock ? 125 : 260, rock ? 0.18 : 0.11, { gain: rock ? 0.13 : 0.08, endFreq: rock ? 82 : 170 });
  },
  /** 宝物回到矿车；贵重宝物使用更宽的琶音 */
  minerGold(valuable = false) {
    const notes = valuable ? [659.25, 830.61, 987.77, 1318.5] : [659.25, 987.77];
    notes.forEach((f, i) => chime(f, 0.45, i * 0.055));
  },
  minerBag() { [523.25, 783.99, 1046.5].forEach((f, i) => chime(f, .42, i * .07)); },
  minerBomb() { noise(.48, { gain: .34, filter: 820 }); thump(0); thump(.07); },
  minerStage() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => chime(f, .65, i * .11)); },
  minerWin() { [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => chime(f, .75, i * .1)); },
  minerOver() { [392, 311.13, 246.94].forEach((f, i) => tone(f, .42, { gain: .045, delay: i * .18, endFreq: f * .82 })); },
  minerBgmStart() { goldMinerLoop.start(); },
  minerBgmStop() { goldMinerLoop.stop(); },
};

// ---------- 背景音乐引擎与曲谱 ----------
// 纯 Web Audio 实时合成、无音频文件。MusicLoop 按“每小节 4 拍”前瞻调度，
// 曲谱（BgmSpec）描述拍长、循环长度、垫弦与旋律音色；同时只挂载一个游戏，不叠曲。

const midiFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

interface BgmSpec {
  /** 每拍秒数 */
  beat: number;
  /** 循环小节数（每小节 4 拍） */
  bars: number;
  master: number;
  /** 每小节调用一次，负责垫弦（bar 从 0 递增） */
  pad: (c: AudioContext, dest: AudioNode, t: number, bar: number) => void;
  /** 旋律音色 */
  pluck: (c: AudioContext, dest: AudioNode, midi: number, t: number, peak: number) => void;
  /** [拍, midi, 音量]，拍相对循环起点 */
  melody: ReadonlyArray<readonly [number, number, number]>;
}

class MusicLoop {
  private timer: number | null = null;
  private gainNode: GainNode | null = null;
  private nextTime = 0;
  private bar = 0;

  constructor(private readonly spec: BgmSpec) {}

  start() {
    const c = getCtx();
    if (!c || this.timer !== null) return;
    this.gainNode = c.createGain();
    this.gainNode.gain.setValueAtTime(0.0001, c.currentTime);
    this.gainNode.gain.exponentialRampToValueAtTime(this.spec.master, c.currentTime + 1.6);
    this.gainNode.connect(c.destination);
    this.nextTime = c.currentTime + 0.25;
    this.bar = 0;
    this.timer = window.setInterval(() => this.tick(), 300);
  }

  stop() {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    const c = ctx;
    const gainNode = this.gainNode;
    this.gainNode = null;
    if (gainNode && c) {
      try {
        const now = c.currentTime;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(Math.max(gainNode.gain.value, 0.0001), now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        window.setTimeout(() => {
          try { gainNode.disconnect(); } catch { /* 已断开则忽略 */ }
        }, 700);
      } catch { /* 音频图已失效则忽略 */ }
    }
  }

  private tick() {
    const c = getCtx();
    if (!c || !this.gainNode || c.state !== 'running') return;
    const now = c.currentTime;
    // 页面标签页被挂起等导致时间轴落后时重新对齐，避免积压的音符恢复后齐鸣
    if (this.nextTime < now - 0.2) {
      this.nextTime = now + 0.2;
      this.bar = 0;
    }
    while (this.nextTime < now + 1.2) {
      const dest = this.gainNode;
      const barStartBeat = this.bar * 4;
      this.spec.pad(c, dest, this.nextTime, this.bar);
      this.spec.melody.forEach(([beat, midi, peak]) => {
        if (beat >= barStartBeat && beat < barStartBeat + 4) {
          this.spec.pluck(c, dest, midi, this.nextTime + (beat - barStartBeat) * this.spec.beat, peak);
        }
      });
      this.bar = (this.bar + 1) % this.spec.bars;
      this.nextTime += 4 * this.spec.beat;
    }
  }
}

/** 柔和垫弦：慢起慢收，dur 为持续秒数 */
function bgmPad(c: AudioContext, dest: AudioNode, midis: number[], t: number, dur: number, peak: number, attack: number, type: OscillatorType = 'triangle') {
  midis.forEach((midi) => {
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.value = midiFreq(midi);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + attack);
    gain.gain.setValueAtTime(peak, t + Math.max(attack + 0.05, dur - 1.8));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.9);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 1);
  });
}

/** 音乐盒音色（连连看）：基频 + 2/3 倍频泛音，快起慢衰；0.36s 后叠一份弱回声 */
function bgmBell(c: AudioContext, dest: AudioNode, midi: number, t: number, peak: number) {
  [[0, 1], [0.36, 0.32]].forEach(([delay, echo]) => {
    [[1, 1], [2, 0.28], [3, 0.08]].forEach(([mult, amp]) => {
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = midiFreq(midi) * mult;
      const gain = c.createGain();
      const at = t + delay;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(peak * amp * echo, at + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.5);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(at);
      osc.stop(at + 1.6);
    });
  });
}

/** 空灵钟音色（五子棋·星河）：正弦 + 2.4 倍频，长衰减，0.45s 弱回声 */
function bgmChime(c: AudioContext, dest: AudioNode, midi: number, t: number, peak: number) {
  [[0, 1], [0.45, 0.3]].forEach(([delay, echo]) => {
    [[1, 1], [2.4, 0.18]].forEach(([mult, amp]) => {
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = midiFreq(midi) * mult;
      const gain = c.createGain();
      const at = t + delay;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(peak * amp * echo, at + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 2.2);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(at);
      osc.stop(at + 2.3);
    });
  });
}

/** 古筝拨弦音色（象棋·楚河汉界）：起音略高快速下滑 + 高八度亮泛音 + 弱回声 */
function bgmPluck(c: AudioContext, dest: AudioNode, midi: number, t: number, peak: number) {
  [[0, 1], [0.28, 0.3]].forEach(([delay, echo]) => {
    const at = t + delay;
    const osc = c.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(midiFreq(midi) * 1.012, at);
    osc.frequency.exponentialRampToValueAtTime(midiFreq(midi), at + 0.08);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak * echo, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.85);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(at);
    osc.stop(at + 0.95);
    const bright = c.createOscillator();
    bright.type = 'sine';
    bright.frequency.value = midiFreq(midi) * 2;
    const brightGain = c.createGain();
    brightGain.gain.setValueAtTime(0.0001, at);
    brightGain.gain.exponentialRampToValueAtTime(peak * 0.22 * echo, at + 0.006);
    brightGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
    bright.connect(brightGain);
    brightGain.connect(dest);
    bright.start(at);
    bright.stop(at + 0.55);
  });
}

// 连连看「云端音乐盒」：72bpm，Cmaj7 → Am7 → Fmaj7 → G6，C 大调五声旋律
const lkLoop = new MusicLoop({
  beat: 60 / 72,
  bars: 8,
  master: 0.5,
  pad: (c, dest, t, bar) => {
    if (bar % 2 === 1) return;
    const chords = [[48, 55, 64, 59], [45, 52, 60, 55], [41, 48, 57, 52], [43, 50, 59, 52]];
    bgmPad(c, dest, chords[bar / 2] ?? [], t, 8 * (60 / 72), 0.02, 2.2);
  },
  pluck: bgmBell,
  melody: [
    [0, 76, 0.09], [1.5, 79, 0.08], [2.5, 84, 0.09], [4, 79, 0.08], [5, 76, 0.08], [6, 74, 0.08], [7, 76, 0.08],
    [8, 72, 0.09], [9.5, 76, 0.08], [10.5, 81, 0.09], [12, 79, 0.08], [13.5, 76, 0.08], [15, 74, 0.08],
    [16, 69, 0.09], [17.5, 72, 0.08], [18.5, 76, 0.09], [20, 74, 0.08], [21.5, 72, 0.08], [23, 74, 0.08],
    [24, 79, 0.09], [25.5, 76, 0.08], [26.5, 74, 0.08], [28, 76, 0.08], [29.5, 79, 0.08], [31, 84, 0.09],
  ],
});

// 五子棋「星河夜航」：56bpm，Am → Fmaj7 → C → G，A 小五声的疏朗钟声
const gomokuLoop = new MusicLoop({
  beat: 60 / 56,
  bars: 8,
  master: 0.42,
  pad: (c, dest, t, bar) => {
    if (bar % 2 === 1) return;
    const chords = [[45, 52, 60, 64], [41, 48, 57, 64], [48, 55, 63, 67], [43, 50, 58, 62]];
    bgmPad(c, dest, chords[bar / 2] ?? [], t, 8 * (60 / 56), 0.016, 3, 'sine');
  },
  pluck: bgmChime,
  melody: [
    [0, 76, 0.05], [2.5, 79, 0.045],
    [8, 74, 0.05], [11, 72, 0.04],
    [16, 79, 0.05], [18.5, 76, 0.045],
    [24, 74, 0.05], [27, 72, 0.04], [30, 76, 0.045],
  ],
});

// 象棋「楚河汉界」：66bpm，叠五度开放和声（C → Am → F → G），D 大五声古筝拨弦
const xiangqiLoop = new MusicLoop({
  beat: 60 / 66,
  bars: 8,
  master: 0.5,
  pad: (c, dest, t, bar) => {
    if (bar % 2 === 1) return;
    const chords = [[48, 55, 62], [45, 52, 59], [41, 48, 55], [43, 50, 57]];
    bgmPad(c, dest, chords[bar / 2] ?? [], t, 8 * (60 / 66), 0.018, 1.8);
  },
  pluck: bgmPluck,
  melody: [
    [0, 74, 0.07], [0.5, 78, 0.05], [1, 81, 0.06], [2, 86, 0.05], [3.5, 83, 0.05], [4, 81, 0.05], [6, 74, 0.05], [7, 76, 0.04],
    [8, 76, 0.06], [8.5, 78, 0.05], [9, 81, 0.06], [11.5, 74, 0.05], [12, 76, 0.05], [14, 74, 0.04],
    [16, 74, 0.06], [16.5, 78, 0.05], [17, 81, 0.06], [18, 83, 0.05], [19.5, 81, 0.05], [21.5, 76, 0.05], [22, 74, 0.05],
    [24, 76, 0.06], [24.5, 78, 0.05], [25, 81, 0.06], [26, 83, 0.05], [27.5, 86, 0.05], [28, 83, 0.05], [29, 81, 0.045], [30, 78, 0.05], [31, 76, 0.04],
  ],
});

// 星落方块「星落之夜」：112bpm，俄罗斯民谣《货郎》（Korobeiniki，公有领域，经典方块旋律）
// Am/Am/E/Am · Dm/Am/E/Am 每小节换和弦，音乐盒音色演奏主旋律
const blocksLoop = new MusicLoop({
  beat: 60 / 112,
  bars: 8,
  master: 0.4,
  pad: (c, dest, t, bar) => {
    const chords = [[45, 52, 57, 60], [45, 52, 57, 60], [40, 47, 52], [45, 52, 57, 60], [38, 50, 53, 57], [45, 52, 57, 60], [40, 47, 52], [45, 52, 57, 60]];
    bgmPad(c, dest, chords[bar] ?? [], t, 4 * (60 / 112), 0.02, 0.9);
  },
  pluck: bgmBell,
  melody: [
    [0, 76, 0.09], [1, 71, 0.07], [1.5, 72, 0.07], [2, 74, 0.08], [3, 72, 0.06], [3.5, 71, 0.06],
    [4, 69, 0.09], [5, 69, 0.06], [5.5, 72, 0.06], [6, 76, 0.08], [7, 74, 0.06], [7.5, 72, 0.06],
    [8, 71, 0.09], [9.5, 72, 0.06], [10, 74, 0.08], [11, 76, 0.08],
    [12, 72, 0.08], [13, 69, 0.08], [14, 69, 0.07],
    [16.5, 74, 0.08], [17.5, 77, 0.08], [18, 81, 0.09], [19, 79, 0.07], [19.5, 77, 0.07],
    [20, 76, 0.09], [21.5, 72, 0.06], [22, 76, 0.08], [23, 74, 0.06], [23.5, 72, 0.06],
    [24, 71, 0.08], [24.5, 71, 0.06], [25, 72, 0.06], [26, 74, 0.08], [27, 76, 0.08],
    [28, 72, 0.08], [29, 69, 0.08], [30, 69, 0.07],
  ],
});

// 追星小蛇「云隙流光」：104bpm，Em→C→G→D 每小节换和弦，E 小五声音乐盒旋律，轻快跳跃
const snakeLoop = new MusicLoop({
  beat: 60 / 104,
  bars: 8,
  master: 0.42,
  pad: (c, dest, t, bar) => {
    const chords = [[52, 59, 64], [48, 55, 64], [55, 62, 67], [50, 57, 62]];
    bgmPad(c, dest, chords[bar % 4] ?? [], t, 4 * (60 / 104), 0.02, 1.1);
  },
  pluck: bgmBell,
  melody: [
    [0, 76, .08], [1, 79, .07], [1.5, 81, .07], [2.5, 79, .06], [3, 76, .06],
    [4, 74, .08], [5, 76, .07], [6, 72, .07], [7, 74, .06],
    [8, 74, .08], [8.5, 76, .06], [9.5, 79, .07], [10.5, 74, .06], [11, 71, .06],
    [12, 74, .08], [13, 78, .07], [14, 81, .08], [15, 83, .07],
    [16, 76, .08], [17, 79, .07], [17.5, 81, .07], [18.5, 84, .07], [19, 83, .06],
    [20, 81, .07], [21, 79, .06], [22, 81, .07], [23, 79, .06],
    [24, 74, .08], [25, 76, .06], [26, 78, .07], [27, 81, .07],
    [28, 83, .08], [29, 81, .06], [30, 79, .07], [31, 76, .07],
  ],
});

// 星屿扫雷「星屿谜航」：68bpm，Dm→B♭→F→C 每两小节换和弦，D 小五声空灵钟声，舒缓神秘
const minesLoop = new MusicLoop({
  beat: 60 / 68,
  bars: 8,
  master: 0.44,
  pad: (c, dest, t, bar) => {
    if (bar % 2 === 1) return;
    const chords = [[50, 57, 62, 65], [46, 53, 58, 62], [41, 48, 57, 60], [43, 50, 58, 62]];
    bgmPad(c, dest, chords[bar / 2] ?? [], t, 8 * (60 / 68), 0.016, 2.6, 'sine');
  },
  pluck: bgmChime,
  melody: [
    [0, 74, .06], [2.5, 77, .05],
    [4, 79, .06], [6, 77, .05], [7, 74, .05],
    [8, 72, .06], [10.5, 74, .05],
    [12, 77, .07], [14, 74, .05],
    [16, 79, .06], [17.5, 81, .05], [18, 79, .05],
    [20, 77, .05], [22, 74, .05],
    [24, 81, .06], [25.5, 79, .05], [26, 77, .05],
    [28, 74, .07], [30, 77, .05], [31, 79, .04],
  ],
});

// 云舟弹星「云海跃光」：116bpm，C→Am→F→G 每小节换和弦，C 大五声音乐盒旋律，蹦跳明快
const breakoutLoop = new MusicLoop({
  beat: 60 / 116,
  bars: 8,
  master: 0.4,
  pad: (c, dest, t, bar) => {
    const chords = [[48, 55, 64], [45, 52, 60], [41, 48, 57], [43, 50, 59], [48, 55, 64], [45, 52, 60], [41, 48, 57], [43, 50, 62]];
    bgmPad(c, dest, chords[bar] ?? [], t, 4 * (60 / 116), 0.02, 0.85);
  },
  pluck: bgmBell,
  melody: [
    [0, 76, .08], [0.5, 79, .06], [1, 84, .08], [1.5, 79, .06], [2, 81, .07], [2.5, 79, .06], [3, 76, .06],
    [4, 74, .07], [4.5, 76, .06], [5, 79, .07], [5.5, 76, .06], [6, 74, .06], [6.5, 76, .06], [7, 79, .06],
    [8, 81, .08], [8.5, 79, .06], [9, 76, .07], [9.5, 79, .06], [10, 81, .06], [10.5, 84, .07], [11, 81, .06],
    [12, 79, .07], [12.5, 76, .06], [13, 74, .06], [13.5, 76, .06], [14, 79, .06], [14.5, 81, .06], [15, 79, .06],
    [16, 84, .08], [16.5, 81, .06], [17, 79, .07], [17.5, 81, .06], [18, 84, .06], [18.5, 86, .07], [19, 84, .06],
    [20, 79, .07], [20.5, 76, .06], [21, 74, .06], [21.5, 76, .06], [22, 79, .06], [22.5, 76, .06], [23, 74, .06],
    [24, 76, .07], [24.5, 79, .06], [25, 81, .07], [25.5, 84, .07], [26, 81, .06], [26.5, 79, .06], [27, 76, .06],
    [28, 74, .07], [28.5, 76, .06], [29, 79, .07], [29.5, 81, .06], [30, 84, .07], [30.5, 81, .06], [31, 79, .06],
  ],
});

// 珊瑚海「潮汐漫游」：轻快的 6/8 感海洋音乐盒，F→Dm→Bb→C 和声循环。
const fishLoop = new MusicLoop({
  beat: 60 / 108,
  bars: 8,
  master: .34,
  pad: (c, dest, t, bar) => {
    const chords = [[53, 60, 69], [50, 57, 65], [46, 53, 62], [48, 55, 64]];
    bgmPad(c, dest, chords[bar % 4] ?? [], t, 4 * (60 / 108), .018, .9);
  },
  pluck: bgmBell,
  melody: [
    [0, 72, .06], [.5, 77, .06], [1.5, 79, .045], [2, 81, .06], [3, 79, .05],
    [4, 77, .06], [4.5, 74, .05], [5.5, 72, .05], [6, 69, .06], [7, 72, .05],
    [8, 74, .055], [8.5, 77, .055], [9.5, 81, .05], [10, 79, .06], [11, 77, .05],
    [12, 76, .06], [12.5, 79, .05], [13.5, 76, .05], [14, 72, .055], [15, 74, .05],
    [16, 72, .06], [16.5, 77, .06], [17.5, 81, .05], [18, 84, .06], [19, 81, .05],
    [20, 79, .06], [20.5, 77, .055], [21.5, 74, .05], [22, 77, .06], [23, 79, .05],
    [24, 81, .06], [24.5, 84, .055], [25.5, 81, .05], [26, 79, .06], [27, 77, .05],
    [28, 76, .06], [28.5, 79, .05], [29.5, 77, .05], [30, 72, .06], [31, 77, .05],
  ],
});

// —— 云泡迪斯科音色组 ——
/** 电子贝斯：锯齿波 + 低通快速压暗，短促弹跳 */
function bgmBass(c: AudioContext, dest: AudioNode, midi: number, t: number, peak: number) {
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = midiFreq(midi);
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(680, t);
  filter.frequency.exponentialRampToValueAtTime(220, t + 0.18);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.21);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  osc.start(t);
  osc.stop(t + 0.24);
}

/** 反拍和弦切分：锯齿波三和弦短促“啪” */
function bgmStab(c: AudioContext, dest: AudioNode, midis: number[], t: number) {
  midis.forEach((midi) => {
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = midiFreq(midi);
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, t);
    filter.frequency.exponentialRampToValueAtTime(900, t + 0.13);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.05, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.17);
  });
}

/** 电子底鼓：正弦下坠，拳感干净 */
function bgmKick(c: AudioContext, dest: AudioNode, t: number) {
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(44, t + 0.1);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.38, t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(t);
  osc.stop(t + 0.16);
}

/** 电子踩镲：高频短噪声，随时间衰减 */
function bgmHat(c: AudioContext, dest: AudioNode, t: number) {
  const len = Math.floor(c.sampleRate * 0.05);
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 6500;
  const gain = c.createGain();
  gain.gain.value = 0.05;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  src.start(t);
}

/** 合成器主旋律：双锯齿微失谐 + 低通滑落，快起缓衰 + 弱回声 */
function bgmSaw(c: AudioContext, dest: AudioNode, midi: number, t: number, peak: number) {
  [[0, 1], [0.24, 0.24]].forEach(([delay, echo]) => {
    const at = t + delay;
    [0, 9].forEach((detune) => {
      const osc = c.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = midiFreq(midi);
      osc.detune.value = detune;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, at);
      filter.frequency.exponentialRampToValueAtTime(1100, at + 0.22);
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(peak * echo, at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(at);
      osc.stop(at + 0.32);
    });
  });
}

// 云海泡泡龙「云泡迪斯科」：128bpm 电子舞曲，Am→F→C→G 每两小节换和弦；
// 八分音符锯齿贝斯 + 反拍和弦切分 + 每拍底鼓/反拍踩镲 + 双锯齿合成器主旋律，动感蹦跳
const bubblesLoop = new MusicLoop({
  beat: 60 / 128,
  bars: 8,
  master: 0.4,
  pad: (c, dest, t, bar) => {
    // 和弦：根音（贝斯）+ 三和弦（切分），Am 与 F/C/G 大三和弦
    const chords = [
      { root: 45, triad: [0, 3, 7] },
      { root: 41, triad: [0, 4, 7] },
      { root: 48, triad: [0, 4, 7] },
      { root: 43, triad: [0, 4, 7] },
    ];
    const chord = chords[Math.floor(bar / 2) % 4]!;
    const beatSec = 60 / 128;
    // 八分音符贝斯：根音为主，反拍穿插高八度
    [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].forEach((b, i) => {
      bgmBass(c, dest, i % 4 === 2 || i === 7 ? chord.root + 12 : chord.root, t + b * beatSec, 0.16);
    });
    // 反拍和弦切分 + 底鼓每拍 + 反拍踩镲
    [0.5, 1.5, 2.5, 3.5].forEach((b) => {
      bgmStab(c, dest, chord.triad.map((semi) => chord.root + 12 + semi), t + b * beatSec);
      bgmHat(c, dest, t + b * beatSec);
    });
    [0, 1, 2, 3].forEach((b) => bgmKick(c, dest, t + b * beatSec));
  },
  pluck: bgmSaw,
  melody: [
    [0, 76, .10], [0.5, 74, .06], [0.75, 72, .06], [1.5, 74, .07], [2, 76, .09], [2.5, 79, .07], [3, 76, .06], [3.5, 74, .05],
    [4, 72, .09], [4.5, 74, .06], [5, 76, .08], [5.5, 79, .07], [6, 81, .10], [6.5, 79, .06], [7, 76, .06], [7.5, 74, .05],
    [8, 72, .09], [8.5, 74, .06], [9, 77, .08], [9.5, 76, .06], [10, 74, .09], [10.5, 76, .06], [11, 79, .07], [11.5, 77, .05],
    [12, 76, .09], [12.5, 74, .06], [13, 72, .08], [13.5, 74, .06], [14, 76, .08], [14.5, 79, .07], [15, 81, .08], [15.5, 79, .05],
    [16, 79, .10], [16.5, 76, .06], [17, 74, .08], [17.5, 76, .06], [18, 79, .09], [18.5, 81, .07], [19, 79, .06], [19.5, 76, .05],
    [20, 76, .09], [20.5, 79, .06], [21, 81, .08], [21.5, 79, .06], [22, 76, .08], [22.5, 74, .06], [23, 72, .06], [23.5, 74, .05],
    [24, 74, .09], [24.5, 71, .06], [25, 74, .08], [25.5, 79, .07], [26, 79, .09], [26.5, 81, .07], [27, 79, .06], [27.5, 76, .05],
    [28, 74, .09], [28.5, 76, .06], [29, 79, .08], [29.5, 81, .07], [30, 83, .09], [30.5, 81, .06], [31, 79, .08], [31.5, 81, .06],
  ],
});

// 星仓推箱「星仓夜航」：88bpm，F→C→Dm→B♭ 每两小节换和弦，F 大五声音乐盒旋律，温暖从容
const sokobanLoop = new MusicLoop({
  beat: 60 / 88,
  bars: 8,
  master: 0.4,
  pad: (c, dest, t, bar) => {
    if (bar % 2 === 1) return;
    const chords = [[41, 48, 57, 60], [48, 55, 64], [50, 57, 62, 65], [46, 53, 58, 62]];
    bgmPad(c, dest, chords[bar / 2] ?? [], t, 8 * (60 / 88), 0.018, 2.2, 'sine');
  },
  pluck: bgmBell,
  melody: [
    [0, 69, .07], [1, 72, .06], [2, 77, .07], [3, 74, .055], [3.5, 72, .05],
    [4, 74, .07], [5, 77, .06], [6, 79, .07], [7, 77, .055],
    [8, 74, .07], [9, 72, .06], [10, 69, .07], [11, 65, .055], [11.5, 69, .05],
    [12, 70, .07], [13, 72, .06], [14, 74, .06], [15, 72, .055],
    [16, 77, .07], [17, 79, .06], [18, 81, .07], [19, 79, .055], [19.5, 77, .05],
    [20, 74, .07], [21, 72, .06], [22, 74, .06], [23, 77, .055],
    [24, 79, .07], [25, 77, .06], [26, 74, .07], [27, 72, .055], [27.5, 70, .05],
    [28, 69, .07], [29, 70, .06], [30, 72, .06], [31, 74, .05],
  ],
});

// 星门华容「华容古道」：58bpm，Am→Fmaj7→C→Em 每两小节换和弦，A 小五声古筝拨弦，苍劲悠远
const klotskiLoop = new MusicLoop({
  beat: 60 / 58,
  bars: 8,
  master: 0.46,
  pad: (c, dest, t, bar) => {
    if (bar % 2 === 1) return;
    const chords = [[45, 52, 60, 64], [41, 48, 57, 64], [48, 55, 63, 67], [40, 47, 55, 59]];
    bgmPad(c, dest, chords[bar / 2] ?? [], t, 8 * (60 / 58), 0.016, 3.2, 'triangle');
  },
  pluck: bgmPluck,
  melody: [
    [0, 69, .07], [0.5, 72, .05], [1, 76, .06], [2, 74, .05], [3, 72, .045],
    [4, 69, .06], [5, 67, .05], [6, 64, .055], [7, 67, .045],
    [8, 69, .065], [9, 72, .05], [9.5, 74, .045], [10, 76, .055], [11, 79, .05],
    [12, 76, .06], [13, 74, .05], [14, 72, .045],
    [16, 81, .07], [17, 79, .05], [17.5, 76, .045], [18, 74, .055], [19, 76, .05], [20, 72, .05], [21, 69, .045],
    [22, 72, .06], [23, 74, .05], [24, 76, .055], [25, 72, .05], [26, 69, .05], [27, 67, .045],
    [28, 64, .06], [29, 67, .05], [30, 69, .06], [31, 72, .045],
  ],
});

// 星牌记忆「星牌摇篮曲」：76bpm，F→Dm→B♭→C 每两小节换和弦，F 大五声音乐盒旋律，温柔宁静
const memoryLoop = new MusicLoop({
  beat: 60 / 76,
  bars: 8,
  master: 0.42,
  pad: (c, dest, t, bar) => {
    if (bar % 2 === 1) return;
    const chords = [[41, 48, 57, 60], [38, 50, 57, 62], [46, 53, 58, 65], [43, 52, 60, 64]];
    bgmPad(c, dest, chords[bar / 2] ?? [], t, 8 * (60 / 76), 0.015, 2.8, 'sine');
  },
  pluck: bgmBell,
  melody: [
    [0, 77, .06], [1.5, 74, .05], [2.5, 72, .055],
    [4, 69, .05], [5.5, 72, .045], [7, 74, .04],
    [8, 77, .06], [9.5, 81, .05], [10.5, 79, .05], [12, 77, .055], [14, 74, .045],
    [16, 72, .06], [17.5, 74, .05], [18.5, 77, .05], [20, 79, .055], [21.5, 77, .05], [23, 74, .045],
    [24, 72, .06], [25.5, 69, .05], [26.5, 65, .05], [28, 69, .055], [30, 72, .04], [31, 74, .04],
  ],
});

// 云阶接龙「云阶夜曲」：92bpm，C→Am→Dm→G 每小节换和弦，C 大调音乐盒旋律，从容流动
const solitaireLoop = new MusicLoop({
  beat: 60 / 92,
  bars: 8,
  master: 0.42,
  pad: (c, dest, t, bar) => {
    const chords = [[48, 55, 64], [45, 52, 60], [50, 57, 62], [43, 50, 59], [48, 55, 64], [45, 52, 60], [50, 57, 62], [43, 50, 59]];
    bgmPad(c, dest, chords[bar] ?? [], t, 4 * (60 / 92), 0.018, 1);
  },
  pluck: bgmBell,
  melody: [
    [0, 76, .07], [1, 74, .05], [1.5, 72, .05], [2, 74, .06], [3, 76, .05], [3.5, 79, .05],
    [4, 81, .07], [5, 79, .05], [5.5, 76, .05], [6, 74, .06], [7, 72, .05],
    [8, 74, .07], [9, 77, .05], [9.5, 74, .06], [10, 71, .05], [11, 69, .05],
    [12, 69, .06], [13, 72, .06], [13.5, 74, .05], [14, 76, .06], [15, 77, .05],
    [16, 79, .07], [17, 76, .05], [17.5, 74, .05], [18, 76, .06], [19, 79, .05], [19.5, 81, .05],
    [20, 83, .06], [21, 79, .05], [22, 74, .05], [23, 71, .045],
    [24, 72, .07], [25, 76, .05], [25.5, 79, .06], [26, 84, .06], [27, 79, .05],
    [28, 77, .06], [29, 76, .05], [30, 72, .045], [31, 74, .04],
  ],
});

// 云端黄金矿工「金脉摇摆」：94bpm，Am→F→C→G，木质拨弦与金属钟声交替，
// 既保留矿井探险感，又让摆钩节奏保持轻快。
const goldMinerLoop = new MusicLoop({
  beat: 60 / 94,
  bars: 8,
  master: 0.4,
  pad: (c, dest, t, bar) => {
    const chords = [[45, 52, 60], [41, 48, 57], [48, 55, 64], [43, 50, 59]];
    bgmPad(c, dest, chords[bar % 4] ?? [], t, 4 * (60 / 94), .017, 1.15, 'triangle');
  },
  pluck: bgmPluck,
  melody: [
    [0, 69, .065], [1, 72, .055], [1.5, 76, .06], [2.5, 72, .05], [3, 69, .05],
    [4, 69, .06], [5, 72, .05], [6, 77, .065], [7, 76, .05],
    [8, 72, .06], [9, 76, .055], [9.5, 79, .06], [10.5, 76, .05], [11, 72, .05],
    [12, 71, .06], [13, 74, .055], [14, 79, .065], [15, 76, .05],
    [16, 81, .07], [17, 79, .05], [17.5, 76, .055], [18.5, 72, .05], [19, 76, .055],
    [20, 77, .06], [21, 76, .05], [22, 72, .06], [23, 69, .05],
    [24, 72, .065], [25, 76, .055], [25.5, 79, .06], [26.5, 81, .06], [27, 79, .05],
    [28, 76, .06], [29, 74, .05], [30, 72, .055], [31, 69, .05],
  ],
});

export default sfx;
