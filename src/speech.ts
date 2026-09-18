import { useStore } from './store';
import { speakVolc, stopVolc, volcConfigured, warmTts, voiceForProfile, type VoiceProfile } from './volcTts';

/* =====================================================================
   音频系统：语音朗读（火山引擎 seed-tts-2.0，唯一通道、无兜底）
   + 合成音效 + 背景音乐（WebAudio 无素材）
   ===================================================================== */

/* ---------- 拼音朗读归一化（把拼音字母读成对应汉字音，带调字母读出声调） ---------- */

// 单字母（韵母/声母名称）→ 汉字读音
const PZ_SINGLE: Record<string, string> = {
  a: '啊', o: '喔', e: '鹅', i: '衣', u: '乌', ü: '迂',
  b: '玻', p: '坡', m: '摸', f: '佛', d: '得', t: '特', n: '讷', l: '勒',
  g: '哥', k: '科', h: '喝', j: '基', q: '欺', x: '希', z: '资', c: '雌', s: '思', r: '日',
  y: '呀', w: '乌',
};

// 复韵母/鼻韵母 → 汉字读音
const PZ_COMP: Record<string, string> = {
  ai: '哀', ei: '诶', ui: '威', ao: '熬', ou: '欧', iu: '优', ie: '耶', üe: '约', er: '儿',
  an: '安', en: '恩', in: '因', un: '温', ün: '晕', ang: '昂', eng: '鞥', ing: '英', ong: '翁',
};

// 常用音节 → 汉字读音（出现于拼音例词/儿歌，取常见读音）
const PZ_SYL: Record<string, string> = {
  ba: '爸', pa: '爬', ma: '妈', fa: '发', da: '大', ta: '他', na: '拿', la: '拉',
  ge: '哥', ke: '科', he: '喝', ji: '积', qi: '棋', xi: '西', zi: '字', ci: '词', si: '四',
  zhi: '知', chi: '吃', shi: '十', ri: '日', yi: '衣', wu: '乌', yu: '鱼',
  zh: '知', ch: '吃', sh: '诗',
  gu: '鼓', hu: '狐', ku: '哭', ju: '句', qu: '去', xu: '须', zhu: '桌', chu: '出', shu: '书', ru: '入',
  lu: '路', mu: '木', tu: '土', nu: '努', bu: '不', pu: '蒲', fu: '服', du: '读',
  bo: '播', po: '坡', mo: '摸', fo: '佛', de: '得', te: '特', ne: '呢', le: '了',
  bai: '白', pei: '赔', mei: '美', fei: '飞', dai: '戴', tai: '台', nai: '奶', lai: '来',
  gai: '该', kai: '开', hai: '还', bei: '杯', lei: '累', gui: '龟', kui: '亏', hui: '会',
  zui: '最', cui: '翠', sui: '岁', bao: '包', pao: '跑', mao: '猫', dao: '刀', tao: '桃',
  nao: '闹', lao: '老', gao: '高', kao: '考', hao: '好', tou: '头', you: '有', niu: '牛',
  liu: '流', jiu: '九', qiu: '球', xiu: '休', pie: '撇', bie: '别', tie: '铁', nie: '捏',
  lie: '列', jue: '觉', que: '确', xue: '学', er: '儿',
  ban: '班', pan: '盘', man: '满', fan: '饭', dan: '蛋', tan: '谈', nan: '男', lan: '蓝',
  gen: '根', ken: '肯', hen: '很', bin: '宾', pin: '拼', min: '民', nin: '您', lin: '林',
  gun: '滚', kun: '困', hun: '混', jun: '军', qun: '群', xun: '寻', yun: '云',
  bang: '帮', pang: '旁', mang: '忙', fang: '方', dang: '当', tang: '糖', nang: '囊',
  lang: '狼', geng: '更', keng: '坑', heng: '横', bing: '冰', ping: '平', ming: '明',
  ning: '宁', ling: '铃', gong: '工', kong: '空', hong: '红', dong: '冬', tong: '同',
  nong: '农', long: '龙', zhong: '中', chong: '虫', shong: '松', rong: '荣', yong: '用',
  wa: '蛙', wo: '我', wang: '王', wen: '文', ya: '牙', ye: '叶', yuan: '圆',
  yin: '音', ying: '英', jia: '家', qia: '掐', xia: '夏', zha: '扎', cha: '茶', sha: '沙',
  zhuo: '桌', chuo: '戳', shuo: '说', ruo: '弱', hua: '花', gua: '瓜', kua: '夸',
  huo: '火', guo: '国', kuo: '阔', duo: '多', tuo: '脱', nuo: '挪', luo: '落',
  jiao: '交', qiao: '桥', xiao: '小', zhao: '找', chao: '吵', shao: '少', rao: '绕',
  xie: '写', jie: '借', qie: '切', zhe: '这', che: '车', she: '舌', re: '热',
};

// 每个韵母的四个带调字母（用于识别"四声示范"行）
const VOWEL_TONE_CLASSES = ['āáǎà', 'ōóǒò', 'ēéěè', 'īíǐì', 'ūúǔù', 'ǖǘǚǜ'];
const TONE_VOWEL = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/;

/** 去掉字母上的声调符号，得到"基础字母" */
function stripTone(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// 独立大写单字母（选项编号 A、B、C…）→ 英文字母名，不读成拼音声母（啊/玻/雌）
const LETTER_NAMES: Record<string, string> = { A: '诶', B: '必', C: '西', D: '第', E: '衣', F: '艾弗', G: '吉' };

/** 中文朗读前归一化：
    1) "四声示范"行（同韵母、≥2 个带调字母相邻）：保留带调字母、空格换成逗号，占位跳过字母归一化——
       实测 seed-tts-2.0 原样收到"ā，á，ǎ，à"能读准纯韵母的四个声调（旧方案读同韵母汉字，孩子听到的是"妈"而非 a 的本音）；
    2) 其余字母（含拼读里孤立的带调字母）读字母名/音节汉字，避免把示范字混进别处。 */
export function zhSpeakNormalize(text: string): string {
  // 1) 识别同韵母相邻成一组的带调字母（如"ā á ǎ à"）→ 逗号分隔并占位，原样交引擎
  const toneRows: string[] = [];
  for (const cls of VOWEL_TONE_CLASSES) {
    const re = new RegExp('[' + cls + '](?:[ \\t]*[' + cls + '])+', 'g');
    text = text.replace(re, (m) => {
      toneRows.push(m.split(/[ \t]+/).join('，'));
      return `\u0000${toneRows.length - 1}\u0000`;
    });
  }
  // 2) 其余字母处理：拼读里孤立的带调字母读字母名，不读示范字
  text = text.replace(/[A-Za-z\u00C0-\u024F]+/g, (token) => {
    // 独立的大写单字母：选项编号，读英文字母名
    if (token.length === 1 && LETTER_NAMES[token]) return LETTER_NAMES[token];
    const hasTone = TONE_VOWEL.test(token);
    const base = stripTone(token);
    // 独立的带调单元音（拼读里的 à 等）：读字母名（啊/衣…），不读示范字
    if (hasTone && base.length === 1 && /[aeiouü]/i.test(base)) return PZ_SINGLE[base] ?? token;
    // 带调音节（bà/mā/xī…）：去掉声调后按音节读成汉字
    if (PZ_SYL[base]) return PZ_SYL[base];
    if (PZ_COMP[base]) return PZ_COMP[base];
    if (base.length === 1 && PZ_SINGLE[base]) return PZ_SINGLE[base];
    return token;
  });
  // 3) 还原四声示范行（带调字母原样，引擎按纯韵母四声朗读）
  return text.replace(/\u0000(\d+)\u0000/g, (_, index) => toneRows[Number(index)]);
}

/* ---------- 语音朗读（火山引擎 豆包语音合成大模型 2.0） ---------- */

/** 朗读会话令牌：每次开始新朗读或停止时 +1，用于作废旧的逐句朗读链 */
let chainToken = 0;

function newChain(): number {
  chainToken++;
  return chainToken;
}

/** 朗读去重：同一段文本在 12 秒内不会重复朗读（减少页面切换/自动欢迎语的频繁打扰） */
const lastSpeakAt = new Map<string, number>();
const SPEAK_THROTTLE_MS = 12_000;

/* ---------- 接续播报：当前语音没播完时，把下一条排到它播完之后（不打断刚点亮/刚答对的内容语音） ---------- */
let currentSpeakEnd: (() => void) | null = null; // 当前朗读自然播完时的收尾（含触发接续队列）
const afterCurrent: (() => void)[] = [];

/* ---------- 连读令牌：逐句连读进行中等于 chainToken，结束/被打断后置 -1 ---------- */
let seqToken = -1;

/** 当前是否有语音在播（speakOnce 的朗读/接续，或 speakSeq 的逐句连读）；自动导览据此避让内容语音 */
export function isSpeaking(): boolean {
  return currentSpeakEnd !== null || seqToken === chainToken;
}

export function stopSpeaking() {
  newChain();
  stopVolc();
  afterCurrent.length = 0; // 主动停止/翻页：接续提示一并作废
}

/** 火山引擎语音是否已配置（未配置时页面会提示） */
export { volcConfigured, warmTts };

/** 用当前语言朗读文本（跟随"声音总开关 + 语音开关"；rate 越小越慢） */
export function speak(text: string, lang: 'zh' | 'en' = 'zh', rate = 0.92) {
  const { sound, voiceOn } = useStore.getState();
  if (!sound || !voiceOn || !text) return;
  const key = `${lang}:${text}`;
  const now = Date.now();
  const last = lastSpeakAt.get(key);
  if (last && now - last < SPEAK_THROTTLE_MS) return;
  lastSpeakAt.set(key, now);
  newChain();
  stopVolc();
  void speakVolc(lang === 'zh' ? zhSpeakNormalize(text) : text, lang, rate);
}

/** 按 NPC 性别与年龄选择音色；若环境未配置专属音色则回退默认音色。 */
export function speakAsNpc(
  text: string,
  npc: { gender?: { zh: string; en: string }; age?: number; voicePitch?: number } | undefined,
  lang: 'zh' | 'en' = 'zh',
  rate = 0.92,
  onEnd?: () => void,
) {
  if (!text) {
    window.setTimeout(() => onEnd?.(), 0);
    return;
  }
  // 兼容元数据中的“男/男性/male”等写法，避免未知写法落回中性女声默认档。
  const gender = String(npc?.gender?.zh ?? npc?.gender?.en ?? '').trim().toLowerCase();
  const age = npc?.age ?? 30;
  let profile: VoiceProfile = 'neutral';
  if (gender === '女' || gender === '女性' || gender === 'female') profile = age < 13 ? 'female-child' : age < 25 ? 'female-young' : age >= 60 ? 'female-elder' : 'female-adult';
  else if (gender === '男' || gender === '男性' || gender === 'male') profile = age < 13 ? 'male-child' : age < 25 ? 'male-young' : age >= 60 ? 'male-elder' : 'male-adult';
  const { sound, voiceOn } = useStore.getState();
  if (!sound || !voiceOn) {
    window.setTimeout(() => onEnd?.(), 0);
    return;
  }
  const clean = lang === 'zh' ? zhSpeakNormalize(text) : text;
  newChain();
  stopVolc();
  const pitch = Math.max(-12, Math.min(12, npc?.voicePitch ?? 0));
  void speakVolc(clean, lang, rate, onEnd, voiceForProfile(profile, lang), pitch);
}

/** 朗读一句，读完后回调 onEnd（语音被关闭/未配置/失败时也会回调，保证跟读流程不卡住） */
export function speakOnce(
  text: string,
  lang: 'zh' | 'en' = 'zh',
  rate = 0.92,
  onEnd?: () => void,
) {
  const { sound, voiceOn } = useStore.getState();
  if (!sound || !voiceOn || !text) {
    window.setTimeout(() => onEnd?.(), 0);
    return;
  }
  newChain();
  stopVolc();
  const end = () => {
    currentSpeakEnd = null;
    onEnd?.();
    afterCurrent.shift()?.(); // 播完当前，接续的下一条才开始
  };
  currentSpeakEnd = end;
  void speakVolc(lang === 'zh' ? zhSpeakNormalize(text) : text, lang, rate, end);
}

/** 排队播报：当前有语音在播时等它播完再读（不截断正在播的内容），没有则立即读；stopSpeaking 会清空队列 */
export function speakAfterCurrent(text: string, lang: 'zh' | 'en' = 'zh', rate = 0.92) {
  const { sound, voiceOn } = useStore.getState();
  if (!sound || !voiceOn || !text) return;
  if (!currentSpeakEnd) {
    speakOnce(text, lang, rate);
    return;
  }
  afterCurrent.push(() => speakOnce(text, lang, rate));
}

/** 逐句朗读序列：每句播完回调 onIndex（用于高亮跟随），全部播完回调 onEnd */
export function speakSeq(
  texts: string[],
  lang: 'zh' | 'en' = 'zh',
  rate = 0.9,
  onIndex?: (i: number) => void,
  onEnd?: () => void,
) {
  const { sound, voiceOn } = useStore.getState();
  if (!sound || !voiceOn || texts.length === 0) return;
  const token = newChain();
  seqToken = token;
  let i = 0;
  const next = () => {
    if (token !== chainToken) return; // 已被停止/新朗读打断
    if (i >= texts.length) {
      seqToken = -1;
      onEnd?.();
      return;
    }
    onIndex?.(i);
    const text = texts[i];
    i += 1;
    stopVolc();
    void speakVolc(lang === 'zh' ? zhSpeakNormalize(text) : text, lang, rate, next);
  };
  next();
}

/** 按中英文把混排文本切段：拉丁字母/数字与常规西文标点连续段为英文，其余（CJK 与中文标点）为中文 */
export function splitMixedSegments(text: string): { text: string; lang: 'zh' | 'en' }[] {
  const runs = text.match(/[A-Za-z0-9’'\-.,;:!?%]+|[^A-Za-z0-9’'\-.,;:!?%]+/g) ?? [];
  const segs: { text: string; lang: 'zh' | 'en' }[] = [];
  for (const run of runs) {
    const lang: 'zh' | 'en' = /[A-Za-z0-9]/.test(run) ? 'en' : /[\u4e00-\u9fff]/.test(run) ? 'zh' : (segs[segs.length - 1]?.lang ?? 'zh');
    if (segs.length && segs[segs.length - 1].lang === lang) segs[segs.length - 1].text += run;
    else segs.push({ text: run, lang });
  }
  return segs
    .map((s) => ({ ...s, text: s.text.trim() }))
    .filter((s) => s.text.length > 0 && /[A-Za-z0-9\u4e00-\u9fff]/.test(s.text));
}

/**
 * 把混排文案交给同一条中文主持人音轨前，只归一化其中的中文部分。
 *
 * 不能直接调用 zhSpeakNormalize(text)：它会把英文中的独立 A、B… 当作
 * 中文选项字母替换。保留英文原文，让火山的中文主持人音色在同一个请求内
 * 自然处理英文词；纯英文点读仍由 speakOnce(..., 'en') 走英文音色。
 */
function mixedSpeakNormalize(text: string): string {
  return splitMixedSegments(text)
    .map((segment) => segment.lang === 'zh' ? zhSpeakNormalize(segment.text) : segment.text)
    .join(' ');
}

/**
 * 中英混排朗读：一整句只合成一条火山音频，使用同一位中文主持人音色。
 *
 * 旧实现会为“中文 → English → 中文”分别发起请求、依次播放；不仅有网络
 * 空档，音色也会突然切换，听起来像被剪成三段。混排内容多为教师提示、题干
 * 和反馈，连续的句流比在提示语中切换英文示范音色更重要。需要标准英语发音
 * 的单词、句子与教材对话仍走独立的英文点读，不受这里影响。
 */
export function speakMixedSeq(text: string, rate = 0.92, onEnd?: () => void) {
  const { sound, voiceOn } = useStore.getState();
  if (!sound || !voiceOn || !text) return;
  const token = newChain();
  stopVolc();
  void speakVolc(mixedSpeakNormalize(text), 'zh', rate, () => {
    if (token !== chainToken) return; // 已被停止/新朗读打断
    onEnd?.();
  });
}

/** 接续版中英混读：当前有语音在播时排到它播完之后（用于跟在聪聪导览后面） */
export function speakMixedAfterCurrent(text: string, rate = 0.92) {
  const { sound, voiceOn } = useStore.getState();
  if (!sound || !voiceOn || !text) return;
  if (!currentSpeakEnd) {
    speakMixedSeq(text, rate);
    return;
  }
  afterCurrent.push(() => speakMixedSeq(text, rate));
}

/* ---------- WebAudio 基础 ---------- */

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  try {
    if (!audioCtx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

/* ---------- 持续飞船引擎声（飞行过程中持续到停止） ---------- */
let thrustNodes: { oscs: OscillatorNode[]; gain: GainNode; lfo: OscillatorNode } | null = null;

/** 启动持续引擎轰鸣（低频锯齿 + 细沙沙，带转速起伏），用 stopThrust 停止 */
export function startThrust(): void {
  const { sound } = useStore.getState();
  if (!sound) return;
  stopThrust();
  const c = ctx();
  if (!c) return;

  const gain = c.createGain();
  const g = gain.gain;
  g.setValueAtTime(0.0001, c.currentTime);
  g.exponentialRampToValueAtTime(0.15, c.currentTime + 0.15);
  gain.connect(c.destination);

  const oscs: OscillatorNode[] = [];
  const body = (freq: number, type: OscillatorType, vol: number) => {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const og = c.createGain();
    og.gain.value = vol;
    o.connect(og);
    og.connect(gain);
    o.start();
    oscs.push(o);
    return o;
  };
  const main = body(85, 'sine', 0.9);
  body(128, 'triangle', 0.62);
  body(96, 'sine', 0.5);

  // 转速起伏 LFO（平缓）
  const lfo = c.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 4.5;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 14;
  lfo.connect(lfoGain);
  lfoGain.connect(main.frequency);
  lfo.start();
  thrustNodes = { oscs, gain, lfo };
}

/** 停止引擎声（淡出 0.5s） */
export function stopThrust(): void {
  if (!thrustNodes) return;
  const { oscs, gain, lfo } = thrustNodes;
  thrustNodes = null;
  const c = ctx();
  if (!c) return;
  const now = c.currentTime;
  const g = gain.gain;
  try {
    g.cancelScheduledValues(now);
  } catch {
    /* ignore */
  }
  g.setValueAtTime(g.value || 0.0001, now);
  g.exponentialRampToValueAtTime(0.0001, now + 0.5);
  [lfo, ...oscs].forEach((o) => {
    try {
      o.stop(now + 0.6);
    } catch {
      /* ignore */
    }
  });
}

function tone(
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType = 'sine',
  vol = 0.25,
  out?: AudioNode,
) {
  const c = ctx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(out ?? c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

/** 频率滑动的长音（做气流/机械滑升效果） */
function sweep(
  fromHz: number,
  toHz: number,
  start: number,
  dur: number,
  type: OscillatorType = 'sine',
  vol = 0.2,
  out?: AudioNode,
) {
  const c = ctx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(fromHz, c.currentTime + start);
  o.frequency.exponentialRampToValueAtTime(toHz, c.currentTime + start + dur);
  const t0 = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(out ?? c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

/* ---------- 音效（跟随"声音总开关"，与 BGM 音量独立） ---------- */

export function playSfx(kind: 'tap' | 'correct' | 'wrong' | 'win' | 'flip' | 'collect' | 'pop' | 'deny' | 'door' | 'thrust' | 'enter' | 'verify' | 'warp' | 'arrival') {
  const { sound } = useStore.getState();
  if (!sound) return;
  try {
    switch (kind) {
      case 'tap':
        tone(660, 0, 0.1, 'triangle', 0.14);
        break;
      case 'flip':
        tone(520, 0, 0.07, 'triangle', 0.16);
        tone(760, 0.05, 0.08, 'triangle', 0.12);
        break;
      case 'pop':
        tone(880, 0, 0.06, 'square', 0.08);
        tone(1320, 0.04, 0.08, 'sine', 0.1);
        break;
      case 'correct':
        tone(523, 0, 0.14, 'sine', 0.22);
        tone(784, 0.12, 0.3, 'sine', 0.22);
        break;
      case 'collect':
        tone(659, 0, 0.1, 'triangle', 0.18);
        tone(880, 0.09, 0.14, 'triangle', 0.18);
        tone(1046, 0.18, 0.22, 'triangle', 0.16);
        break;
      case 'wrong':
        tone(220, 0, 0.28, 'sawtooth', 0.09);
        break;
      case 'deny':
        // 黑客终端"拒绝"警报：两声急促高音 + 低沉轰鸣
        tone(880, 0, 0.1, 'square', 0.12);
        tone(880, 0.16, 0.1, 'square', 0.12);
        tone(160, 0.3, 0.5, 'sawtooth', 0.14);
        break;
      case 'verify':
        // 身份核验：三次扫描脉冲 + 清亮确认和弦
        [420, 560, 720].forEach((f, i) => tone(f, i * 0.1, 0.12, 'triangle', 0.1));
        tone(1046, 0.34, 0.42, 'sine', 0.17);
        tone(1318, 0.4, 0.38, 'sine', 0.1);
        break;
      case 'door':
        // 科幻电子门：高频快速"嗖—"上扬 + 数字电子"叮"
        sweep(280, 1600, 0, 0.3, 'sine', 0.16);     // 主嗖声上扬
        sweep(900, 2400, 0.06, 0.2, 'triangle', 0.07); // 轻和声层
        tone(1900, 0.28, 0.16, 'sine', 0.12);       // 数字落锁叮
        break;
      case 'thrust':
        // 飞船引擎持续推进：低频轰鸣 + 细碎嗡鸣（听感像在飞）
        tone(96, 0, 1.6, 'sawtooth', 0.1);
        tone(120, 0.05, 1.5, 'square', 0.05);
        tone(180, 0.1, 1.4, 'triangle', 0.06);
        break;
      case 'warp':
        // 跃迁启动：低频推进、能量持续上扬并在末端突破
        sweep(70, 150, 0, 1.2, 'sawtooth', 0.1);
        sweep(260, 2200, 0.05, 1.05, 'sine', 0.13);
        tone(1760, 1.02, 0.32, 'triangle', 0.12);
        break;
      case 'arrival':
        // 抵达：减速下落后以温暖三和弦收束
        sweep(900, 180, 0, 0.34, 'sine', 0.1);
        [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.24 + i * 0.09, 0.46, 'triangle', 0.14));
        break;
      case 'enter':
        // 进入总部大楼：上扬"叮咚"确认音
        tone(523, 0, 0.12, 'triangle', 0.16);
        tone(784, 0.1, 0.16, 'triangle', 0.16);
        tone(1046, 0.22, 0.32, 'sine', 0.16);
        break;
      case 'win':
        [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.14, 0.32, 'triangle', 0.2));
        break;
    }
  } catch {
    /* 音频不可用时静默忽略 */
  }
}

/* ---------- 背景音乐（轻快五声音阶循环，WebAudio 合成） ---------- */

type MusicKind = 'lobby' | 'game';

/** 相对 C5 的半音阶旋律（C 大调五声音阶，欢快） */
const MELODIES: Record<MusicKind, { step: number; notes: number[]; bass: number[]; vol: number }> = {
  lobby: {
    step: 0.24,
    notes: [0, 4, 7, 9, 7, 4, 2, 4, 0, 4, 7, 9, 12, 9, 7, 4, 7, 9, 7, 4, 2, 0, -2, 0],
    bass: [0, -17, -19, -17, 0, -17, -19, -17],
    vol: 0.09,
  },
  game: {
    step: 0.18,
    notes: [7, 9, 12, 9, 7, 9, 7, 4, 5, 7, 9, 7, 4, 2, 4, 0],
    bass: [0, -17, -19, -17, 0, -17, -19, -17],
    vol: 0.07,
  },
};

const C5 = 523.25;
const semitone = (s: number) => C5 * Math.pow(2, s / 12);

class MusicBox {
  private timer: number | null = null;
  private nextTime = 0;
  private stepIdx = 0;
  private bassIdx = 0;
  private nodes = new Set<AudioScheduledSourceNode>();
  private current: MusicKind | null = null;
  /** 被自动暂停（如开关关闭）时保留 kind，恢复后继续 */
  private paused = false;

  tryStart(kind: MusicKind) {
    this.current = kind;
    this.paused = false;
    const { sound, musicOn } = useStore.getState();
    if (!sound || !musicOn) return;
    const c = ctx();
    if (!c || c.state !== 'running') return; // 等待用户手势后重试
    if (this.timer !== null) return; // 已在播放
    this.nextTime = c.currentTime + 0.06;
    this.stepIdx = 0;
    this.bassIdx = 0;
    this.timer = window.setInterval(() => this.tick(), 80);
  }

  stop() {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.nodes.forEach((n) => {
      try {
        n.stop();
      } catch {
        /* 已停止 */
      }
    });
    this.nodes.clear();
  }

  pause() {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.paused = true;
  }

  resume() {
    if (this.paused && this.current) {
      this.paused = false;
      this.tryStart(this.current);
    }
  }

  private tick() {
    const c = ctx();
    if (!c) return;
    const mel = MELODIES[this.current ?? 'lobby'];
    while (this.nextTime < c.currentTime + 0.5) {
      const s = mel.notes[this.stepIdx % mel.notes.length];
      const isBeat = this.stepIdx % 2 === 0;
      tone(semitone(s), this.nextTime - c.currentTime, mel.step * 1.6, 'triangle', mel.vol, c.destination);
      if (isBeat) {
        const b = mel.bass[this.bassIdx % mel.bass.length];
        tone(semitone(b), this.nextTime - c.currentTime, mel.step * 2.2, 'sine', mel.vol * 1.6);
      }
      this.nextTime += mel.step;
      this.stepIdx++;
      if (this.stepIdx % 2 === 0) this.bassIdx++;
    }
  }
}

const musicBox = new MusicBox();

let currentMusic: MusicKind | null = null;

export function startMusic(kind: MusicKind) {
  currentMusic = kind;
  // 首次可能在用户手势之前调用：若 AudioContext 未就绪，等手势后由 subscribe 重试
  musicBox.tryStart(kind);
  window.setTimeout(() => musicBox.tryStart(kind), 400);
}

export function stopMusic() {
  currentMusic = null;
  musicBox.stop();
}

// 跟随声音/BGM 开关自动启停
useStore.subscribe((s) => {
  if (!currentMusic) return;
  const should = s.sound && s.musicOn;
  if (!should) musicBox.pause();
  else musicBox.resume();
});

// 首次用户手势后兜底启动 BGM
if (typeof window !== 'undefined') {
  const unlock = () => {
    if (currentMusic) musicBox.tryStart(currentMusic);
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}
