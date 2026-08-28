import type { Grade, SubjectId } from '../types';
import { MATH_UNITS } from './mathCurriculum';

/* =====================================================================
   真实教材课程体系（浙江省 · 分科录入）
   层级：学科 → 年级 → 学期（上/下）→ 单元 → 课时
   版本：数学=浙教版（课标单元）· 语文=人教版（统编）· 英语=PEP 人教(三年级起点)
        科学=教科版 · 生活=道德与法治(人教版) · 思维=数学思维拓展(非统编)
   说明：课时级真实目录，以现行教材为准可微调；2024 年起部分年级启用新教材。
   ===================================================================== */

export type MathFigureType =
  | 'count' | 'equation' | 'vertical' | 'numberline' | 'compare' | 'shapes' | 'fraction' | 'fractionMultiply'
  | 'makeTen' | 'breakTen' | 'unroll' | 'clock' | 'chart'
  | 'position' | 'direction' | 'ordinal' | 'shapeSet' | 'sort' | 'money' | 'pattern' | 'angle'
  | 'views' | 'combo' | 'motion' | 'weight' | 'venn' | 'placevalue' | 'linekind' | 'linepair'
  | 'timeline' | 'match' | 'plant' | 'grid' | 'pigeonhole' | 'text' | 'scene';

/** 图形集合（认识立体/平面图形） */
export type ShapeKind = 'rectangle' | 'square' | 'triangle' | 'circle' | 'trapezoid' | 'parallelogram' | 'cylinder' | 'cone' | 'cuboid' | 'cube' | 'sphere';

/** 数学配图（程序化渲染，非教材插图） */
export interface MathFigure {
  type: MathFigureType;
  /** count：物品 emoji（默认 ● 圆点）与数量 */
  emoji?: string;
  count?: number;
  /** equation：左/右操作数与运算符；vertical（竖式加减法）复用 a/b/op */
  a?: number;
  b?: number;
  op?: '+' | '-' | '×' | '÷';
  /** numberline：起点/终点/标记点 */
  start?: number;
  end?: number;
  mark?: number;
  /** compare：两堆物品数量与 emoji */
  left?: number;
  right?: number;
  leftEmoji?: string;
  rightEmoji?: string;
  /** shapes：几何图形 */
  shape?: ShapeKind;
  w?: number;
  h?: number;
  r?: number;
  /** 长方体：长宽高 */
  d?: number;
  /** 梯形：上底 a、下底 b */
  ta?: number;
  tb?: number;
  /** 圆：强调线（周长）或面（面积） */
  emphasis?: 'line' | 'area';
  /** 通用：公式/计算过程（渲染在图形下方，如"C=2πr=2×3.14×3=18.84"） */
  formula?: string;
  /** fraction：分母（等分份数）与分子（涂色份数） */
  whole?: number;
  part?: number;
  /** fractionMultiply：分数乘分数 a/b × c/d（重叠阴影示意） */
  fa?: number;
  fb?: number;
  fc?: number;
  fd?: number;
  /** makeTen：凑十法（a 接近 10，b 为另一加数）；breakTen：破十法（a 为十几的被减数，b 为减数） */
  // a/b 复用 equation 字段
  /** clock：时针与分针 */
  hour?: number;
  minute?: number;
  /** chart：数据与类型（bar 柱状 / line 折线 / pie 扇形饼图） */
  data?: number[];
  chartKind?: 'bar' | 'line' | 'pie';
  /** position：相对方位（上/下/左/右/前/后），高亮 dir */
  dir?: string;
  /** direction：方位图，mode=relative 相对 / compass 指南针八方位 */
  mode?: 'relative' | 'compass';
  /** ordinal：第几——count 总数，mark 高亮第几个（1 起） */
  /** shapeSet：认识图形集合 */
  shapes?: ShapeKind[];
  /** sort：分类与整理——若干组 {标签, emoji, 数量} */
  groups?: { label: string; emoji: string; n: number }[];
  /** money：人民币——若干枚 {面值, 张数} */
  coins?: { v: number; n: number }[];
  /** pattern：找规律——序列 emoji 与答案 */
  seq?: string[];
  answer?: string;
  /** angle：角——角度（直角用 rightAngle） */
  angleDeg?: number;
  rightAngle?: boolean;
  /** combo：搭配——rows×cols 网格 + 行列标签 */
  rows?: number;
  cols?: number;
  rowLabel?: string;
  colLabel?: string;
  /** motion：图形的运动——slide 平移 / turn 旋转 / flip 轴对称 */
  motionKind?: 'slide' | 'turn' | 'flip';
  /** weight：天平称重——左右砝码/物品（克/千克/吨） */
  unit?: string;
  /** venn：集合——A、B、交集三块数量 */
  vA?: number;
  vB?: number;
  vAB?: number;
  labelA?: string;
  labelB?: string;
  /** placevalue：大数的认识——数字串与读法 */
  number?: string;
  name?: string;
  /** linekind：线段/直线/射线（高亮其一） */
  lineKind?: 'segment' | 'ray' | 'line';
  /** linepair：垂直与平行 */
  pairKind?: 'parallel' | 'perpendicular';
  /** timeline：优化问题——任务甘特条 {名称, 起始, 时长} */
  tasks?: { name: string; start: number; len: number }[];
  /** match：田忌赛马——对阵 {甲方, 乙方, 胜方} */
  matches?: { a: string; b: string; win?: 'a' | 'b' }[];
  /** plant：植树问题——总长与间隔 */
  length?: number;
  interval?: number;
  /** grid：网格——coord 数对 / factors 因数点阵 / multiples 倍数 */
  gridKind?: 'coord' | 'factors' | 'multiples';
  cx?: number;
  cy?: number;
  n?: number;
  of?: number;
  factorA?: number;
  factorB?: number;
  /** pigeonhole：鸽巢问题——鸽子数与巢数 */
  pigeons?: number;
  holes?: number;
  /** text：抽象概念——大 emoji + 标题 + 说明（配合 formula） */
  title?: string;
  text?: string;
  /** scene：语文场景插画——一组情境 emoji + 场景标题（配合 title），逐个弹入 */
  emojis?: string[];
}

export interface LessonContent {
  /** 课文/例题正文（长课文只录导读，不复制原文） */
  text?: string;
  /** 生字 / 关键词 */
  words?: string[];
  /** 知识点讲解要点 */
  points?: string[];
  /** 朗读/示例 */
  sample?: string;
  /** 中文翻译（英语课文：与 text 段落结构一致，逐段对照） */
  translation?: string;
  /** 数学配图（图文并茂，图为主体） */
  figure?: MathFigure;
  /** 即时检测题（数学「想一想」：答对才算记住） */
  quiz?: Quiz;
  /** 看演示：本课专属分步讲解（每步一个小节，深入讲透，区别于 points） */
  steps?: TeachStep[];
  /** 去练习：本课专属练习题（3~5 道，与 quiz 不重复） */
  practice?: Quiz[];
  /** 看例题：本课具体示例（一句真实情境，配图展示，让幼儿知道这节课学什么） */
  example?: string;
  /** 看例题：例题详解（2~3 道，每道逐步讲解，知识含量足） */
  examples?: WorkedExample[];
  /** 记要点：本课口诀/儿歌（朗朗上口，帮助记忆关键概念，区别于 points 的规则句） */
  rhyme?: string;
}

/** 即时检测题（儿童友好，3 选项为主） */
export interface Quiz {
  /** 题干（一句话） */
  q: string;
  /** 选项（2~4 个） */
  options: string[];
  /** 正确选项下标（0 起） */
  answer: number;
}

/** 看演示：分步讲解（每步一个小节，深入讲透，幼儿可自学） */
export interface TeachStep {
  /** 小节标题（如"认识数位"） */
  title: string;
  /** 深入讲解（3~5 句，口语化、具体、由浅入深，把概念讲透） */
  text: string;
  /** 具体示例（一句话，带数字/情境，帮助理解） */
  example?: string;
  /** 易错提醒（"别忘记…/小心…"，点出常见错误） */
  tip?: string;
  /** 本小节的演示配图（图随讲解变化；缺省用本课配图） */
  figure?: MathFigure;
  /** 小试身手：检验本小节是否听懂（3 选 1，答对才进入下一节） */
  check?: Quiz;
}

/** 例题详解（看例题）：一题一练，逐步讲解 */
export interface WorkedExample {
  /** 例题标题（如"例 1 · 读大数"） */
  title: string;
  /** 题目（真实情境） */
  problem: string;
  /** 解答步骤（每步一句讲解，2~4 步） */
  solution: string[];
  /** 答案 */
  answer: string;
}

export interface Skill {
  id: string;
  /** 课时名称（教材真实课文/小节名） */
  name: { zh: string; en: string };
  /** 所属单元 */
  unit: { zh: string; en: string };
  subject: SubjectId;
  grade: Grade;
  /** 学期 */
  term: '上' | '下';
  /** 真实课程内容（课文/生字/知识点） */
  content?: LessonContent;
}

/** 学科元信息：演示主视觉 + 练习游戏映射 */
export const SUBJECT_META: Record<SubjectId, { emoji: string; games: string[] }> = {
  math: { emoji: '🔢', games: ['number-farm', 'apple-pick', 'shape-castle'] },
  chinese: { emoji: '📖', games: ['hanzi-puzzle', 'pinyin-fishing'] },
  english: { emoji: '🔤', games: ['english-zoo'] },
  thinking: { emoji: '🧠', games: ['pattern-train', 'memory-match', 'odd-one-out', 'trash-sort'] },
  science: { emoji: '🔬', games: ['animal-hunt'] },
  life: { emoji: '🚦', games: ['traffic-light', 'trash-sort'] },
};

interface RawLesson {
  zh: string;
  en: string;
  content?: LessonContent;
}

/* ================= 数学（浙教版 · 课标单元） ================= */
const MATH: Record<Grade, { 上: RawLesson[]; 下: RawLesson[] }> = {
  g1: {
    上: [
      { zh: '准备课 · 数一数', en: 'Getting Ready: Counting' },
      { zh: '准备课 · 比一比', en: 'Getting Ready: Comparing' },
      { zh: '1~5 的认识和加减法', en: 'Numbers 1-5: Add & Subtract' },
      { zh: '6~10 的认识和加减法', en: 'Numbers 6-10: Add & Subtract' },
      { zh: '认识图形（立体图形）', en: '3D Shapes' },
      { zh: '认识钟表', en: 'Telling Time' },
      { zh: '11~20 各数的认识', en: 'Numbers 11-20' },
      { zh: '20 以内的进位加法', en: 'Addition within 20' },
    ],
    下: [
      { zh: '20 以内的退位减法', en: 'Subtraction within 20' },
      { zh: '100 以内数的认识', en: 'Numbers to 100' },
      { zh: '认识图形（平面图形）', en: '2D Shapes' },
      { zh: '100 以内的加法和减法（一）', en: 'Add & Subtract to 100 (1)' },
      { zh: '100 以内的加法和减法（二）', en: 'Add & Subtract to 100 (2)' },
      { zh: '认识人民币', en: 'Money (RMB)' },
      { zh: '找规律', en: 'Find Patterns' },
    ],
  },
  g2: {
    上: [
      { zh: '长度单位', en: 'Units of Length' },
      { zh: '100 以内的加法和减法（二）', en: 'Add & Subtract to 100 (2)' },
      { zh: '角的初步认识', en: 'Intro to Angles' },
      { zh: '表内乘法（一）', en: 'Multiplication Tables (1)' },
      { zh: '表内乘法（二）', en: 'Multiplication Tables (2)' },
      { zh: '观察物体', en: 'Observing Objects' },
      { zh: '认识时间', en: 'Telling Time' },
      { zh: '数学广角 · 搭配', en: 'Math Corner: Combinations' },
    ],
    下: [
      { zh: '数据收集整理', en: 'Data Collection' },
      { zh: '表内除法（一）', en: 'Division Tables (1)' },
      { zh: '图形的运动（一）', en: 'Motion of Shapes (1)' },
      { zh: '表内除法（二）', en: 'Division Tables (2)' },
      { zh: '混合运算', en: 'Mixed Operations' },
      { zh: '有余数的除法', en: 'Division with Remainder' },
      { zh: '万以内数的认识', en: 'Numbers to 10,000' },
      { zh: '克和千克', en: 'Grams and Kilograms' },
      { zh: '数学广角 · 推理', en: 'Math Corner: Reasoning' },
    ],
  },
  g3: {
    上: [
      { zh: '时、分、秒', en: 'Hours, Minutes, Seconds' },
      { zh: '万以内的加法和减法（一）', en: 'Add & Subtract to 10,000 (1)' },
      { zh: '测量', en: 'Measurement' },
      { zh: '万以内的加法和减法（二）', en: 'Add & Subtract to 10,000 (2)' },
      { zh: '倍的认识', en: 'Understanding Multiples' },
      { zh: '多位数乘一位数', en: 'Multiply by One Digit' },
      { zh: '长方形和正方形', en: 'Rectangles & Squares' },
      { zh: '分数的初步认识', en: 'Intro to Fractions' },
      { zh: '数学广角 · 集合', en: 'Math Corner: Sets' },
    ],
    下: [
      { zh: '位置与方向（一）', en: 'Position & Direction (1)' },
      { zh: '除数是一位数的除法', en: 'Division by One Digit' },
      { zh: '复式统计表', en: 'Compound Tables' },
      { zh: '两位数乘两位数', en: 'Multiply by Two Digits' },
      { zh: '面积', en: 'Area' },
      { zh: '年、月、日', en: 'Year, Month, Day' },
      { zh: '小数的初步认识', en: 'Intro to Decimals' },
      { zh: '数学广角 · 搭配（二）', en: 'Math Corner: Combinations (2)' },
    ],
  },
  g4: {
    上: [
      { zh: '大数的认识', en: 'Large Numbers' },
      { zh: '公顷和平方千米', en: 'Hectare & Square Kilometer' },
      { zh: '角的度量', en: 'Measuring Angles' },
      { zh: '三位数乘两位数', en: 'Multiply by Multi-digits' },
      { zh: '平行四边形和梯形', en: 'Parallelogram & Trapezoid' },
      { zh: '除数是两位数的除法', en: 'Division by Two Digits' },
      { zh: '条形统计图', en: 'Bar Charts' },
      { zh: '数学广角 · 优化', en: 'Math Corner: Optimization' },
    ],
    下: [
      { zh: '四则运算', en: 'Four Operations' },
      { zh: '观察物体（二）', en: 'Observing Objects (2)' },
      { zh: '运算定律', en: 'Laws of Operations' },
      { zh: '小数的意义和性质', en: 'Decimals: Meaning & Properties' },
      { zh: '三角形', en: 'Triangles' },
      { zh: '小数的加法和减法', en: 'Add & Subtract Decimals' },
      { zh: '图形的运动（二）', en: 'Motion of Shapes (2)' },
      { zh: '平均数与条形统计图', en: 'Average & Bar Charts' },
      { zh: '数学广角 · 鸡兔同笼', en: 'Math Corner: Chickens & Rabbits' },
    ],
  },
  g5: {
    上: [
      { zh: '小数乘法', en: 'Multiplying Decimals' },
      { zh: '位置', en: 'Position' },
      { zh: '小数除法', en: 'Dividing Decimals' },
      { zh: '可能性', en: 'Probability' },
      { zh: '简易方程', en: 'Simple Equations' },
      { zh: '多边形的面积', en: 'Area of Polygons' },
      { zh: '数学广角 · 植树问题', en: 'Math Corner: Planting Trees' },
    ],
    下: [
      { zh: '观察物体（三）', en: 'Observing Objects (3)' },
      { zh: '因数与倍数', en: 'Factors & Multiples' },
      { zh: '长方体和正方体', en: 'Cuboids & Cubes' },
      { zh: '分数的意义和性质', en: 'Fractions: Meaning & Properties' },
      { zh: '图形的运动（三）', en: 'Motion of Shapes (3)' },
      { zh: '分数的加法和减法', en: 'Add & Subtract Fractions' },
      { zh: '折线统计图', en: 'Line Charts' },
      { zh: '数学广角 · 找次品', en: 'Math Corner: Find the Odd One' },
    ],
  },
  g6: {
    上: [
      { zh: '分数乘法', en: 'Multiplying Fractions' },
      { zh: '位置与方向（二）', en: 'Position & Direction (2)' },
      { zh: '分数除法', en: 'Dividing Fractions' },
      { zh: '比', en: 'Ratio' },
      { zh: '圆', en: 'Circles' },
      { zh: '百分数（一）', en: 'Percentages (1)' },
      { zh: '扇形统计图', en: 'Pie Charts' },
      { zh: '数学广角 · 数与形', en: 'Math Corner: Number & Shape' },
    ],
    下: [
      { zh: '负数', en: 'Negative Numbers' },
      { zh: '百分数（二）', en: 'Percentages (2)' },
      { zh: '圆柱与圆锥', en: 'Cylinders & Cones' },
      { zh: '比例', en: 'Proportion' },
      { zh: '数学广角 · 鸽巢问题', en: 'Math Corner: Pigeonhole' },
      { zh: '整理和复习', en: 'Review' },
    ],
  },
};

/* ================= 英语（PEP 人教 · 三年级起点） ================= */
/* ================= 英语（PEP 人教版 · 三年级起点，浙江 3~6 年级） ================= */
/** 每单元课时结构（随年级课型不同） */
function EN_LESSON_NAMES(grade: Grade, unitIndex: number): string[] {
  const u = `Unit ${unitIndex}`;
  if (grade === 'g5') {
    return [
      `${u} · A Let's try & Let's talk`,
      `${u} · A Let's learn`,
      `${u} · Let's spell`,
      `${u} · B Let's try & Let's talk`,
      `${u} · B Let's learn`,
      `${u} · Story time`,
    ];
  }
  if (grade === 'g6') {
    return [
      `${u} · A Let's try & Let's talk`,
      `${u} · A Let's learn`,
      `${u} · B Let's try & Let's talk`,
      `${u} · B Let's learn`,
      `${u} · Read and write`,
      `${u} · Story time`,
    ];
  }
  return [
    `${u} · A Let's talk`,
    `${u} · A Let's learn`,
    `${u} · Letters and sounds`,
    `${u} · B Let's talk`,
    `${u} · B Let's learn`,
    `${u} · Start to read & Story time`,
  ];
}

const ENGLISH_UNITS: { 上: Partial<Record<Grade, { zh: string; en: string }[]>>; 下: Partial<Record<Grade, { zh: string; en: string }[]>> } = {
  上: {
    g3: [
      { zh: 'Unit 1 Hello!', en: 'Unit 1 Hello!' },
      { zh: 'Unit 2 Colours', en: 'Unit 2 Colours' },
      { zh: 'Unit 3 Look at me!', en: 'Unit 3 Look at me!' },
      { zh: 'Unit 4 We love animals', en: 'Unit 4 We love animals' },
      { zh: "Unit 5 Let's eat!", en: "Unit 5 Let's eat!" },
      { zh: 'Unit 6 Happy birthday!', en: 'Unit 6 Happy birthday!' },
    ],
    g4: [
      { zh: 'Unit 1 My classroom', en: 'Unit 1 My classroom' },
      { zh: 'Unit 2 My schoolbag', en: 'Unit 2 My schoolbag' },
      { zh: 'Unit 3 My friends', en: 'Unit 3 My friends' },
      { zh: 'Unit 4 My home', en: 'Unit 4 My home' },
      { zh: "Unit 5 Dinner's ready", en: "Unit 5 Dinner's ready" },
      { zh: 'Unit 6 Meet my family!', en: 'Unit 6 Meet my family!' },
    ],
    g5: [
      { zh: "Unit 1 What's he like?", en: "Unit 1 What's he like?" },
      { zh: 'Unit 2 My week', en: 'Unit 2 My week' },
      { zh: 'Unit 3 What would you like?', en: 'Unit 3 What would you like?' },
      { zh: 'Unit 4 What can you do?', en: 'Unit 4 What can you do?' },
      { zh: 'Unit 5 There is a big bed', en: 'Unit 5 There is a big bed' },
      { zh: 'Unit 6 In a nature park', en: 'Unit 6 In a nature park' },
    ],
    g6: [
      { zh: 'Unit 1 How can I get there?', en: 'Unit 1 How can I get there?' },
      { zh: 'Unit 2 Ways to go to school', en: 'Unit 2 Ways to go to school' },
      { zh: 'Unit 3 My weekend plan', en: 'Unit 3 My weekend plan' },
      { zh: 'Unit 4 I have a pen pal', en: 'Unit 4 I have a pen pal' },
      { zh: 'Unit 5 What does he do?', en: 'Unit 5 What does he do?' },
      { zh: 'Unit 6 How do you feel?', en: 'Unit 6 How do you feel?' },
    ],
  },
  下: {
    g3: [
      { zh: 'Unit 1 Welcome back to school!', en: 'Unit 1 Welcome back to school!' },
      { zh: 'Unit 2 My family', en: 'Unit 2 My family' },
      { zh: 'Unit 3 At the zoo', en: 'Unit 3 At the zoo' },
      { zh: 'Unit 4 Where is my car?', en: 'Unit 4 Where is my car?' },
      { zh: 'Unit 5 Do you like pears?', en: 'Unit 5 Do you like pears?' },
      { zh: 'Unit 6 How many?', en: 'Unit 6 How many?' },
    ],
    g4: [
      { zh: 'Unit 1 My school', en: 'Unit 1 My school' },
      { zh: 'Unit 2 What time is it?', en: 'Unit 2 What time is it?' },
      { zh: 'Unit 3 Weather', en: 'Unit 3 Weather' },
      { zh: 'Unit 4 At the farm', en: 'Unit 4 At the farm' },
      { zh: 'Unit 5 My clothes', en: 'Unit 5 My clothes' },
      { zh: 'Unit 6 Shopping', en: 'Unit 6 Shopping' },
    ],
    g5: [
      { zh: 'Unit 1 My day', en: 'Unit 1 My day' },
      { zh: 'Unit 2 My favourite season', en: 'Unit 2 My favourite season' },
      { zh: 'Unit 3 My school calendar', en: 'Unit 3 My school calendar' },
      { zh: 'Unit 4 When is the art show?', en: 'Unit 4 When is the art show?' },
      { zh: "Unit 5 Whose dog is it?", en: "Unit 5 Whose dog is it?" },
      { zh: 'Unit 6 Work quietly!', en: 'Unit 6 Work quietly!' },
    ],
    g6: [
      { zh: 'Unit 1 How tall are you?', en: 'Unit 1 How tall are you?' },
      { zh: 'Unit 2 Last weekend', en: 'Unit 2 Last weekend' },
      { zh: 'Unit 3 Where did you go?', en: 'Unit 3 Where did you go?' },
      { zh: 'Unit 4 Then and now', en: 'Unit 4 Then and now' },
    ],
  },
};

/* ================= 语文（部编版 · 单元主题） ================= */
const CHINESE: Record<Grade, { 上: RawLesson[]; 下: RawLesson[] }> = {
  g1: {
    上: [
      { zh: '我上学了（入学教育）', en: 'First Day of School' },
      { zh: '识字 · 天地人', en: 'Characters: Sky & People' },
      { zh: '汉语拼音 · a o e', en: 'Pinyin: a o e' },
      { zh: '汉语拼音 · b p m f', en: 'Pinyin: b p m f' },
      { zh: '汉语拼音 · g k h', en: 'Pinyin: g k h' },
      { zh: '识字 · 画', en: 'Characters: Painting' },
      { zh: '课文 · 影子', en: 'Text: Shadows' },
      { zh: '课文 · 明天要远足', en: 'Text: Trip Tomorrow' },
    ],
    下: [
      { zh: '识字 · 春夏秋冬', en: 'Characters: Seasons' },
      { zh: '单元 · 心愿', en: 'Theme: Wishes' },
      { zh: '单元 · 伙伴', en: 'Theme: Friends' },
      { zh: '单元 · 家人', en: 'Theme: Family' },
      { zh: '单元 · 夏天', en: 'Theme: Summer' },
      { zh: '单元 · 好习惯', en: 'Theme: Good Habits' },
      { zh: '单元 · 问号', en: 'Theme: Questions' },
      { zh: '单元 · 身边的科学', en: 'Theme: Science Around Us' },
    ],
  },
  g2: {
    上: [
      { zh: '识字 · 场景歌', en: 'Characters: Scenes' },
      { zh: '课文 · 小蝌蚪找妈妈', en: 'Text: Little Tadpole' },
      { zh: '课文 · 曹冲称象', en: 'Text: Cao Chong Weighs an Elephant' },
      { zh: '识字 · 田家四季歌', en: 'Characters: Farm Seasons' },
      { zh: '课文 · 日月潭', en: 'Text: Sun Moon Lake' },
      { zh: '课文 · 坐井观天', en: 'Text: Frog in the Well' },
      { zh: '课文 · 狐假虎威', en: 'Text: Fox Borrows Tiger\'s Might' },
      { zh: '古诗二首', en: 'Poems' },
    ],
    下: [
      { zh: '单元 · 春天', en: 'Theme: Spring' },
      { zh: '单元 · 关爱', en: 'Theme: Caring' },
      { zh: '识字 · 传统节日', en: 'Characters: Festivals' },
      { zh: '单元 · 童话', en: 'Theme: Fairy Tales' },
      { zh: '单元 · 寓言', en: 'Theme: Fables' },
      { zh: '单元 · 自然', en: 'Theme: Nature' },
      { zh: '单元 · 改变', en: 'Theme: Change' },
      { zh: '单元 · 世界之初', en: 'Theme: Beginning of the World' },
    ],
  },
  g3: {
    上: [
      { zh: '单元 · 学校生活', en: 'Theme: School Life' },
      { zh: '单元 · 金秋时节', en: 'Theme: Golden Autumn' },
      { zh: '单元 · 童话世界', en: 'Theme: Fairy Tales' },
      { zh: '单元 · 观察与发现', en: 'Theme: Observation' },
      { zh: '单元 · 祖国山河', en: 'Theme: Our Land' },
      { zh: '单元 · 壮丽山河', en: 'Theme: Scenery' },
      { zh: '单元 · 可爱生灵', en: 'Theme: Living Things' },
      { zh: '单元 · 美好品质', en: 'Theme: Good Qualities' },
    ],
    下: [
      { zh: '单元 · 可爱的生灵', en: 'Theme: Living Things' },
      { zh: '单元 · 寓言故事', en: 'Theme: Fables' },
      { zh: '单元 · 传统文化', en: 'Theme: Traditions' },
      { zh: '单元 · 观察与发现', en: 'Theme: Discovery' },
      { zh: '单元 · 想象世界', en: 'Theme: Imagination' },
      { zh: '单元 · 童年生活', en: 'Theme: Childhood' },
      { zh: '单元 · 奇妙世界', en: 'Theme: Wonders' },
      { zh: '单元 · 有趣的故事', en: 'Theme: Fun Stories' },
    ],
  },
  g4: {
    上: [
      { zh: '单元 · 自然之美', en: 'Theme: Nature' },
      { zh: '单元 · 思考与提问', en: 'Theme: Thinking' },
      { zh: '单元 · 留心观察', en: 'Theme: Observe' },
      { zh: '单元 · 神话故事', en: 'Theme: Myths' },
      { zh: '习作单元 · 写一件事', en: 'Writing: An Event' },
      { zh: '单元 · 家国情怀', en: 'Theme: Homeland' },
      { zh: '单元 · 革命岁月', en: 'Theme: History' },
      { zh: '单元 · 历史故事', en: 'Theme: Historical Tales' },
    ],
    下: [
      { zh: '单元 · 乡村生活', en: 'Theme: Countryside' },
      { zh: '单元 · 科学技术', en: 'Theme: Science & Tech' },
      { zh: '单元 · 现代诗歌', en: 'Theme: Modern Poetry' },
      { zh: '单元 · 动物朋友', en: 'Theme: Animal Friends' },
      { zh: '习作单元 · 游历', en: 'Writing: Travel' },
      { zh: '单元 · 成长故事', en: 'Theme: Growing Up' },
      { zh: '单元 · 伟大品格', en: 'Theme: Great Characters' },
      { zh: '单元 · 童话', en: 'Theme: Fairy Tales' },
    ],
  },
  g5: {
    上: [
      { zh: '单元 · 万物有灵', en: 'Theme: All Things Alive' },
      { zh: '单元 · 阅读策略', en: 'Theme: Reading Skills' },
      { zh: '单元 · 民间故事', en: 'Theme: Folk Tales' },
      { zh: '单元 · 爱国情怀', en: 'Theme: Patriotism' },
      { zh: '单元 · 说明文', en: 'Theme: Expository Writing' },
      { zh: '单元 · 舐犊情深', en: 'Theme: Family Love' },
      { zh: '单元 · 四季之美', en: 'Theme: Seasons' },
      { zh: '单元 · 读书明智', en: 'Theme: Reading' },
    ],
    下: [
      { zh: '单元 · 童年往事', en: 'Theme: Childhood' },
      { zh: '单元 · 古典名著', en: 'Theme: Classics' },
      { zh: '单元 · 汉字', en: 'Theme: Characters' },
      { zh: '单元 · 家国情怀', en: 'Theme: Homeland' },
      { zh: '单元 · 人物描写', en: 'Theme: Characters' },
      { zh: '单元 · 思维火花', en: 'Theme: Thinking' },
      { zh: '单元 · 世界各地', en: 'Theme: The World' },
      { zh: '单元 · 语言艺术', en: 'Theme: Language' },
    ],
  },
  g6: {
    上: [
      { zh: '单元 · 触摸自然', en: 'Theme: Nature' },
      { zh: '单元 · 革命岁月', en: 'Theme: History' },
      { zh: '单元 · 有目的地阅读', en: 'Theme: Purposeful Reading' },
      { zh: '单元 · 小说', en: 'Theme: Fiction' },
      { zh: '习作单元 · 围绕中心写', en: 'Writing: Main Idea' },
      { zh: '单元 · 保护环境', en: 'Theme: Environment' },
      { zh: '单元 · 艺术之美', en: 'Theme: Art' },
      { zh: '单元 · 走近鲁迅', en: 'Theme: Lu Xun' },
    ],
    下: [
      { zh: '单元 · 民风民俗', en: 'Theme: Folk Customs' },
      { zh: '单元 · 外国名著', en: 'Theme: World Classics' },
      { zh: '单元 · 真情流露', en: 'Theme: True Feelings' },
      { zh: '单元 · 理想与信念', en: 'Theme: Ideals' },
      { zh: '单元 · 科学与发现', en: 'Theme: Science' },
      { zh: '单元 · 难忘小学生活', en: 'Theme: Farewell' },
    ],
  },
};

/* ================= 科学（教科版 · 单元） ================= */
const SCIENCE: Record<Grade, { 上: RawLesson[]; 下: RawLesson[] }> = {
  g1: {
    上: [{ zh: '植物', en: 'Plants' }, { zh: '比较与测量', en: 'Compare & Measure' }],
    下: [{ zh: '我们周围的物体', en: 'Objects Around Us' }, { zh: '动物', en: 'Animals' }],
  },
  g2: {
    上: [{ zh: '地球家园中的天气', en: 'Weather on Earth' }, { zh: '材料', en: 'Materials' }],
    下: [{ zh: '磁铁', en: 'Magnets' }, { zh: '我们自己', en: 'Our Bodies' }],
  },
  g3: {
    上: [{ zh: '水', en: 'Water' }, { zh: '空气', en: 'Air' }, { zh: '天气', en: 'Weather' }],
    下: [
      { zh: '物体的运动', en: 'Motion of Objects' },
      { zh: '动物的一生', en: 'Life of Animals' },
      { zh: '太阳、地球和月球', en: 'Sun, Earth & Moon' },
    ],
  },
  g4: {
    上: [{ zh: '声音', en: 'Sound' }, { zh: '呼吸与消化', en: 'Breathing & Digestion' }, { zh: '运动和力', en: 'Motion & Force' }],
    下: [
      { zh: '植物的生长变化', en: 'Plant Growth' },
      { zh: '电路', en: 'Electric Circuits' },
      { zh: '岩石与土壤', en: 'Rocks & Soil' },
    ],
  },
  g5: {
    上: [{ zh: '光', en: 'Light' }, { zh: '地球表面的变化', en: 'Earth\'s Surface' }, { zh: '计量时间', en: 'Measuring Time' }],
    下: [
      { zh: '生物与环境', en: 'Living Things & Environment' },
      { zh: '船的研究', en: 'Boats' },
      { zh: '环境与我们', en: 'Environment & Us' },
    ],
  },
  g6: {
    上: [{ zh: '微小世界', en: 'The Tiny World' }, { zh: '地球的运动', en: 'Earth\'s Movement' }, { zh: '工具与技术', en: 'Tools & Technology' }],
    下: [
      { zh: '工程与技术', en: 'Engineering & Technology' },
      { zh: '物质的变化', en: 'Changes of Matter' },
      { zh: '宇宙', en: 'The Universe' },
    ],
  },
};

/* ================= 生活（道德与法治 · 部编版 · 单元主题） ================= */
const LIFE: Record<Grade, { 上: RawLesson[]; 下: RawLesson[] }> = {
  g1: {
    上: [
      { zh: '我是小学生啦', en: 'I Am a Pupil' },
      { zh: '校园生活真快乐', en: 'Happy School Life' },
      { zh: '家中的安全与健康', en: 'Safety & Health at Home' },
      { zh: '天气虽冷有温暖', en: 'Warmth in Winter' },
    ],
    下: [
      { zh: '我的好习惯', en: 'My Good Habits' },
      { zh: '我和大自然', en: 'Me & Nature' },
      { zh: '我爱我家', en: 'I Love My Family' },
      { zh: '我们在一起', en: 'Together' },
    ],
  },
  g2: {
    上: [
      { zh: '我们的班级', en: 'Our Class' },
      { zh: '我们的节日', en: 'Our Festivals' },
      { zh: '我们的校园', en: 'Our School' },
      { zh: '我们的家', en: 'Our Home' },
    ],
    下: [
      { zh: '我和我的同伴', en: 'Me & Friends' },
      { zh: '我生活的地方', en: 'Where I Live' },
      { zh: '绿色小卫士', en: 'Green Guardian' },
      { zh: '我爱我的祖国', en: 'I Love My Country' },
    ],
  },
  g3: {
    上: [
      { zh: '快乐学习', en: 'Happy Learning' },
      { zh: '我们的学校', en: 'Our School' },
      { zh: '安全护成长', en: 'Safety First' },
      { zh: '家是温暖的地方', en: 'Warm Home' },
    ],
    下: [
      { zh: '我和我的同伴', en: 'Me & Friends' },
      { zh: '我在这里长大', en: 'Where I Grew Up' },
      { zh: '家乡物产养育我', en: 'Home Products' },
      { zh: '多样的交通和通信', en: 'Transport & Communication' },
    ],
  },
  g4: {
    上: [
      { zh: '与班级共成长', en: 'Growing with Class' },
      { zh: '为父母分担', en: 'Helping Parents' },
      { zh: '信息万花筒', en: 'Information' },
      { zh: '让生活多一些绿色', en: 'Greener Life' },
    ],
    下: [
      { zh: '同伴与交往', en: 'Friendship' },
      { zh: '做聪明的消费者', en: 'Smart Consumer' },
      { zh: '美好生活哪里来', en: 'Where Good Life Comes From' },
      { zh: '感受家乡文化', en: 'Local Culture' },
    ],
  },
  g5: {
    上: [
      { zh: '面对成长中的新问题', en: 'Growing Up' },
      { zh: '我们是班级的主人', en: 'Masters of Our Class' },
      { zh: '我们的国土', en: 'Our Land' },
      { zh: '骄人祖先 灿烂文化', en: 'Our Culture' },
    ],
    下: [
      { zh: '我们一家人', en: 'Our Family' },
      { zh: '公共生活靠大家', en: 'Public Life' },
      { zh: '百年追梦 复兴中华', en: 'Chinese Dream' },
      { zh: '屹立在世界东方', en: 'On the World Stage' },
    ],
  },
  g6: {
    上: [
      { zh: '我们的守护者', en: 'Our Guardians' },
      { zh: '我们是公民', en: 'We Are Citizens' },
      { zh: '我们的国家机构', en: 'National Institutions' },
      { zh: '法律保护我们健康成长', en: 'Law Protects Us' },
    ],
    下: [
      { zh: '完善自我 健康成长', en: 'Grow Healthily' },
      { zh: '爱护地球 共同责任', en: 'Care for Earth' },
      { zh: '多样文明 多彩生活', en: 'Diverse Cultures' },
      { zh: '让世界更美好', en: 'A Better World' },
    ],
  },
};

/* ================= 思维（数学思维拓展 · 非统编） ================= */
const THINKING: Record<Grade, { 上: RawLesson[]; 下: RawLesson[] }> = {
  g1: { 上: [{ zh: '找规律', en: 'Find Patterns' }], 下: [{ zh: '分类整理', en: 'Sort & Group' }] },
  g2: { 上: [{ zh: '搭配', en: 'Combinations' }], 下: [{ zh: '简单推理', en: 'Reasoning' }] },
  g3: { 上: [{ zh: '集合', en: 'Sets' }], 下: [{ zh: '搭配（二）', en: 'Combinations (2)' }] },
  g4: { 上: [{ zh: '优化', en: 'Optimization' }], 下: [{ zh: '鸡兔同笼', en: 'Chickens & Rabbits' }] },
  g5: { 上: [{ zh: '植树问题', en: 'Planting Trees' }], 下: [{ zh: '找次品', en: 'Find the Odd One' }] },
  g6: { 上: [{ zh: '数与形', en: 'Number & Shape' }], 下: [{ zh: '鸽巢问题', en: 'Pigeonhole' }] },
};

/* ================= 一年级逐课真实目录（样板：数学/语文） ================= */
interface RawUnit {
  unit: RawLesson;
  lessons: RawLesson[];
}

const G1_MATH: { 上: RawUnit[]; 下: RawUnit[] } = {
  上: [
    { unit: { zh: '准备课', en: 'Getting Ready' }, lessons: [{ zh: '数一数', en: 'Counting' }, { zh: '比一比', en: 'Comparing' }] },
    { unit: { zh: '位置', en: 'Position' }, lessons: [{ zh: '上、下、前、后', en: 'Up, Down, Front, Back' }, { zh: '左、右', en: 'Left, Right' }] },
    { unit: { zh: '1~5 的认识和加减法', en: 'Numbers 1-5' }, lessons: [{ zh: '1~5 的认识', en: 'Knowing 1-5' }, { zh: '比大小', en: 'Compare' }, { zh: '第几', en: 'Ordinals' }, { zh: '分与合', en: 'Part & Whole' }, { zh: '加法', en: 'Addition' }, { zh: '减法', en: 'Subtraction' }, { zh: '0', en: 'Zero' }] },
    { unit: { zh: '认识图形（一）', en: 'Shapes (1)' }, lessons: [{ zh: '认识立体图形', en: '3D Shapes' }] },
    { unit: { zh: '6~10 的认识和加减法', en: 'Numbers 6-10' }, lessons: [{ zh: '6 和 7', en: '6 and 7' }, { zh: '8 和 9', en: '8 and 9' }, { zh: '10', en: '10' }, { zh: '连加连减', en: 'Add & Subtract in a Row' }, { zh: '加减混合', en: 'Mixed Operations' }] },
    { unit: { zh: '11~20 各数的认识', en: 'Numbers 11-20' }, lessons: [{ zh: '11~20 各数的认识', en: 'Knowing 11-20' }, { zh: '10 加几和相应的减法', en: '10 Plus and Minus' }] },
    { unit: { zh: '认识钟表', en: 'Clock' }, lessons: [{ zh: '认识整时', en: 'Telling the Hour' }] },
    { unit: { zh: '20 以内的进位加法', en: 'Addition within 20' }, lessons: [{ zh: '9 加几', en: '9 Plus' }, { zh: '8、7、6 加几', en: '8, 7, 6 Plus' }, { zh: '5、4、3、2 加几', en: '5, 4, 3, 2 Plus' }] },
  ],
  下: [
    { unit: { zh: '认识图形（二）', en: 'Shapes (2)' }, lessons: [{ zh: '认识平面图形', en: '2D Shapes' }] },
    { unit: { zh: '20 以内的退位减法', en: 'Subtraction within 20' }, lessons: [{ zh: '十几减 9', en: 'Minus 9' }, { zh: '十几减 8、7', en: 'Minus 8, 7' }, { zh: '十几减 6、5、4、3、2', en: 'Minus 6 to 2' }] },
    { unit: { zh: '分类与整理', en: 'Sort & Group' }, lessons: [{ zh: '分类与整理', en: 'Sorting' }] },
    { unit: { zh: '100 以内数的认识', en: 'Numbers to 100' }, lessons: [{ zh: '数数 数的组成', en: 'Count & Compose' }, { zh: '数的顺序 比较大小', en: 'Order & Compare' }, { zh: '整十数加一位数和相应的减法', en: 'Tens Plus Ones' }] },
    { unit: { zh: '认识人民币', en: 'Money (RMB)' }, lessons: [{ zh: '认识人民币', en: 'Knowing RMB' }, { zh: '简单的计算', en: 'Simple Money' }] },
    { unit: { zh: '100 以内的加法和减法（一）', en: 'Add & Subtract to 100 (1)' }, lessons: [{ zh: '整十数加、减整十数', en: 'Tens ± Tens' }, { zh: '两位数加一位数、整十数', en: 'Add Ones/Tens' }, { zh: '两位数减一位数、整十数', en: 'Subtract Ones/Tens' }] },
    { unit: { zh: '100 以内的加法和减法（二）', en: 'Add & Subtract to 100 (2)' }, lessons: [{ zh: '两位数加两位数', en: 'Add Two Digits' }, { zh: '两位数减两位数', en: 'Subtract Two Digits' }] },
    { unit: { zh: '找规律', en: 'Find Patterns' }, lessons: [{ zh: '找规律', en: 'Patterns' }] },
  ],
};

const G1_CHINESE: { 上: RawUnit[]; 下: RawUnit[] } = {
  上: [
    { unit: { zh: '我上学了', en: 'First Day' }, lessons: [{ zh: '我上学了', en: 'First Day of School' }] },
    { unit: { zh: '第一单元 · 识字', en: 'Unit 1 Characters' }, lessons: [
      { zh: '天地人', en: 'Sky, Earth, People', content: { text: '天 地 人 你 我 他', words: ['天', '地', '人', '你', '我', '他'], points: ['天：天空', '地：大地', '人：人', '你、我、他：人称代词'] } },
      { zh: '金木水火土', en: 'Metal, Wood, Water, Fire, Earth', content: { text: '一二三四五，金木水火土。天地分上下，日月照今古。', words: ['一', '二', '三', '四', '五', '上', '下'], points: ['认识数字 1~5', '认识金、木、水、火、土', '认识"上""下"方位'] } },
      { zh: '口耳目', en: 'Mouth, Ear, Eye', content: { text: '口 耳 目 手 足', words: ['口', '耳', '目', '手', '足'], points: ['口：嘴巴', '耳：耳朵', '目：眼睛', '手：手', '足：脚'] } },
      { zh: '日月水火', en: 'Sun, Moon, Water, Fire', content: { text: '日 月 水 火', words: ['日', '月', '水', '火'], points: ['象形字：日像太阳', '月像弯弯的月亮', '水像流动的水', '火像燃烧的火苗'] } },
      { zh: '对韵歌', en: 'Rhyming Song', content: { text: '云对雨，雪对风。花对树，鸟对虫。山清对水秀，柳绿对桃红。', words: ['云', '雨', '雪', '风', '花', '树', '鸟', '虫'], points: ['学习"对韵"（对仗）', '认识自然景物字词'] } },
    ] },
    { unit: { zh: '第二单元 · 汉语拼音', en: 'Unit 2 Pinyin' }, lessons: [{ zh: 'a o e', en: 'a o e' }, { zh: 'i u ü', en: 'i u ü' }, { zh: 'b p m f', en: 'b p m f' }, { zh: 'd t n l', en: 'd t n l' }, { zh: 'g k h', en: 'g k h' }, { zh: 'j q x', en: 'j q x' }, { zh: 'z c s', en: 'z c s' }, { zh: 'zh ch sh r', en: 'zh ch sh r' }] },
    { unit: { zh: '第三单元 · 汉语拼音', en: 'Unit 3 Pinyin' }, lessons: [{ zh: 'ai ei ui', en: 'ai ei ui' }, { zh: 'ao ou iu', en: 'ao ou iu' }, { zh: 'ie üe er', en: 'ie üe er' }, { zh: 'an en in un ün', en: 'an en in un ün' }, { zh: 'ang eng ing ong', en: 'ang eng ing ong' }] },
    { unit: { zh: '第四单元 · 课文', en: 'Unit 4 Texts' }, lessons: [{ zh: '秋天', en: 'Autumn', content: { words: ['秋', '气', '了', '树', '叶', '片', '大', '飞', '会', '个'], points: ['朗读课文，感受秋天的景色', '认识生字：秋、气、树、叶、飞', '体会"大雁南飞"的景象'] } }, { zh: '小小的船', en: 'The Little Boat', content: { words: ['船', '弯', '星', '看', '见', '闪'], points: ['朗读儿歌，感受夜空之美', '认识生字：船、弯、星、闪'] } }, { zh: '江南', en: 'South of the River', content: { text: '江南可采莲，莲叶何田田。鱼戏莲叶间。鱼戏莲叶东，鱼戏莲叶西，鱼戏莲叶南，鱼戏莲叶北。', words: ['江', '南', '莲', '叶', '鱼', '东', '西', '南', '北'], points: ['古诗《江南》，感受采莲景象', '认识方位：东、西、南、北'] } }, { zh: '四季', en: 'Four Seasons', content: { words: ['季', '春', '夏', '秋', '冬', '圆', '尖'], points: ['认识一年四季：春夏秋冬', '认识生字：春、夏、秋、冬'] } }] },
    { unit: { zh: '第五单元 · 识字', en: 'Unit 5 Characters' }, lessons: [{ zh: '画', en: 'Painting' }, { zh: '大小多少', en: 'Big, Small, Many, Few' }, { zh: '小书包', en: 'My Schoolbag' }, { zh: '日月明', en: 'Sun and Moon' }, { zh: '升国旗', en: 'Raising the Flag' }] },
    { unit: { zh: '第六单元 · 课文', en: 'Unit 6 Texts' }, lessons: [{ zh: '影子', en: 'Shadows' }, { zh: '比尾巴', en: 'Comparing Tails' }, { zh: '青蛙写诗', en: 'Frog Writes a Poem' }, { zh: '雨点儿', en: 'Raindrops' }] },
    { unit: { zh: '第七单元 · 课文', en: 'Unit 7 Texts' }, lessons: [{ zh: '明天要远足', en: 'Trip Tomorrow' }, { zh: '大还是小', en: 'Big or Small' }, { zh: '项链', en: 'The Necklace' }] },
    { unit: { zh: '第八单元 · 课文', en: 'Unit 8 Texts' }, lessons: [{ zh: '雪地里的小画家', en: 'Painters in the Snow' }, { zh: '乌鸦喝水', en: 'The Crow Drinks' }, { zh: '小蜗牛', en: 'The Little Snail' }] },
  ],
  下: [
    { unit: { zh: '第一单元 · 识字', en: 'Unit 1 Characters' }, lessons: [{ zh: '春夏秋冬', en: 'Seasons' }, { zh: '姓氏歌', en: 'Surnames' }, { zh: '小青蛙', en: 'Little Frog' }, { zh: '猜字谜', en: 'Character Riddles' }] },
    { unit: { zh: '第二单元 · 课文', en: 'Unit 2 Texts' }, lessons: [{ zh: '吃水不忘挖井人', en: 'Remember the Well Digger' }, { zh: '我多想去看看', en: 'I Want to See' }, { zh: '一个接一个', en: 'One by One' }, { zh: '四个太阳', en: 'Four Suns' }] },
    { unit: { zh: '第三单元 · 课文', en: 'Unit 3 Texts' }, lessons: [{ zh: '小公鸡和小鸭子', en: 'Rooster & Duck' }, { zh: '树和喜鹊', en: 'Tree & Magpie' }, { zh: '怎么都快乐', en: 'Always Happy' }] },
    { unit: { zh: '第四单元 · 课文', en: 'Unit 4 Texts' }, lessons: [{ zh: '静夜思', en: 'Quiet Night Thoughts', content: { text: '床前明月光，疑是地上霜。举头望明月，低头思故乡。', words: ['床', '光', '霜', '望', '低', '乡'], points: ['唐代诗人李白的名篇', '表达了思念故乡的感情'] } }, { zh: '夜色', en: 'Night', content: { words: ['夜', '色', '外', '看', '爸', '笑'], points: ['朗读课文，感受夜色', '认识生字：夜、色、看、笑'] } }, { zh: '端午粽', en: 'Dragon Boat Zongzi', content: { words: ['端', '午', '粽', '节', '米', '真'], points: ['了解端午节吃粽子的习俗', '认识生字：端、午、粽'] } }, { zh: '彩虹', en: 'Rainbow', content: { words: ['虹', '座', '浇', '提', '洒', '挑'], points: ['朗读课文，感受彩虹之美', '认识生字：虹、座、浇'] } }] },
    { unit: { zh: '第五单元 · 识字', en: 'Unit 5 Characters' }, lessons: [{ zh: '动物儿歌', en: 'Animal Rhymes' }, { zh: '古对今', en: 'Ancient & Modern' }, { zh: '操场上', en: 'On the Playground' }, { zh: '人之初', en: 'At First' }] },
    { unit: { zh: '第六单元 · 课文', en: 'Unit 6 Texts' }, lessons: [{ zh: '古诗二首', en: 'Two Poems' }, { zh: '荷叶圆圆', en: 'Round Lotus Leaves' }, { zh: '要下雨了', en: 'It Will Rain' }] },
    { unit: { zh: '第七单元 · 课文', en: 'Unit 7 Texts' }, lessons: [{ zh: '文具的家', en: 'Home of Stationery' }, { zh: '一分钟', en: 'One Minute' }, { zh: '动物王国开大会', en: 'Animal Assembly' }, { zh: '小猴子下山', en: 'Monkey Goes Down' }] },
    { unit: { zh: '第八单元 · 课文', en: 'Unit 8 Texts' }, lessons: [{ zh: '棉花姑娘', en: 'Miss Cotton' }, { zh: '咕咚', en: 'Thump!' }, { zh: '小壁虎借尾巴', en: 'Gecko Borrows a Tail' }] },
  ],
};

/* ================= 语文 2–6 年级上册逐课（人教版统编） ================= */
const G2_UP: RawUnit[] = [
  { unit: { zh: '第一单元 · 课文', en: 'Unit 1 Texts' }, lessons: [{ zh: '小蝌蚪找妈妈', en: 'Little Tadpoles Look for Mom' }, { zh: '我是什么', en: 'What Am I' }, { zh: '植物妈妈有办法', en: 'How Plants Travel' }] },
  { unit: { zh: '第二单元 · 识字', en: 'Unit 2 Characters' }, lessons: [{ zh: '场景歌', en: 'Scene Song' }, { zh: '树之歌', en: 'Tree Song' }, { zh: '拍手歌', en: 'Clapping Song' }, { zh: '田家四季歌', en: 'Farm Seasons' }] },
  { unit: { zh: '第三单元 · 课文', en: 'Unit 3 Texts' }, lessons: [{ zh: '曹冲称象', en: 'Cao Chong Weighs an Elephant' }, { zh: '玲玲的画', en: 'Lingling\'s Picture' }, { zh: '一封信', en: 'A Letter' }, { zh: '妈妈睡了', en: 'Mom Is Asleep' }] },
  { unit: { zh: '第四单元 · 课文', en: 'Unit 4 Texts' }, lessons: [{ zh: '古诗二首', en: 'Two Poems' }, { zh: '黄山奇石', en: 'Rocks of Huangshan' }, { zh: '日月潭', en: 'Sun Moon Lake' }, { zh: '葡萄沟', en: 'The Grape Valley' }] },
  { unit: { zh: '第五单元 · 课文', en: 'Unit 5 Texts' }, lessons: [{ zh: '坐井观天', en: 'Frog in the Well' }, { zh: '寒号鸟', en: 'The Hanhao Bird' }, { zh: '我要的是葫芦', en: 'I Want the Gourd' }] },
  { unit: { zh: '第六单元 · 课文', en: 'Unit 6 Texts' }, lessons: [{ zh: '八角楼上', en: 'In the Octagonal Room' }, { zh: '朱德的扁担', en: 'Zhu De\'s Carrying Pole' }, { zh: '难忘的泼水节', en: 'The Water-Splashing Festival' }, { zh: '刘胡兰', en: 'Liu Hulan' }] },
  { unit: { zh: '第七单元 · 课文', en: 'Unit 7 Texts' }, lessons: [{ zh: '古诗二首', en: 'Two Poems' }, { zh: '雾在哪里', en: 'Where Is the Fog' }, { zh: '雪孩子', en: 'The Snow Child' }] },
  { unit: { zh: '第八单元 · 课文', en: 'Unit 8 Texts' }, lessons: [{ zh: '狐假虎威', en: 'Fox Borrows Tiger\'s Might' }, { zh: '纸船和风筝', en: 'Paper Boat & Kite' }, { zh: '风娃娃', en: 'The Wind Doll' }] },
];

const G3_UP: RawUnit[] = [
  { unit: { zh: '第一单元', en: 'Unit 1' }, lessons: [{ zh: '大青树下的小学', en: 'School under the Green Tree' }, { zh: '花的学校', en: 'School of Flowers' }, { zh: '不懂就要问', en: 'Ask When in Doubt' }] },
  { unit: { zh: '第二单元', en: 'Unit 2' }, lessons: [{ zh: '古诗三首', en: 'Three Poems' }, { zh: '铺满金色巴掌的水泥道', en: 'The Golden Path' }, { zh: '秋天的雨', en: 'Autumn Rain' }, { zh: '听听，秋的声音', en: 'Listen to Autumn' }] },
  { unit: { zh: '第三单元', en: 'Unit 3' }, lessons: [{ zh: '卖火柴的小女孩', en: 'The Little Match Girl' }, { zh: '那一定会很好', en: 'It Will Be Great' }, { zh: '在牛肚子里旅行', en: 'Journey in a Cow\'s Belly' }, { zh: '一块奶酪', en: 'A Piece of Cheese' }] },
  { unit: { zh: '第四单元', en: 'Unit 4' }, lessons: [{ zh: '总也倒不了的老屋', en: 'The Old House' }, { zh: '胡萝卜先生的长胡子', en: 'Mr. Carrot\'s Beard' }, { zh: '小狗学叫', en: 'Puppy Learns to Bark' }] },
  { unit: { zh: '第五单元', en: 'Unit 5' }, lessons: [{ zh: '搭船的鸟', en: 'A Bird on the Boat' }, { zh: '金色的草地', en: 'The Golden Meadow' }] },
  { unit: { zh: '第六单元', en: 'Unit 6' }, lessons: [{ zh: '古诗三首', en: 'Three Poems' }, { zh: '富饶的西沙群岛', en: 'The Rich Xisha Islands' }, { zh: '海滨小城', en: 'A Seaside Town' }, { zh: '美丽的小兴安岭', en: 'The Beautiful Xiaoxing\'anling' }] },
  { unit: { zh: '第七单元', en: 'Unit 7' }, lessons: [{ zh: '大自然的声音', en: 'Sounds of Nature' }, { zh: '读不完的大书', en: 'The Endless Book' }, { zh: '父亲、树林和鸟', en: 'Father, Woods and Birds' }] },
  { unit: { zh: '第八单元', en: 'Unit 8' }, lessons: [{ zh: '司马光', en: 'Sima Guang' }, { zh: '灰雀', en: 'The Grey Sparrow' }, { zh: '手术台就是阵地', en: 'The Operating Table' }, { zh: '一个粗瓷大碗', en: 'A Coarse Porcelain Bowl' }] },
];

const G4_UP: RawUnit[] = [
  { unit: { zh: '第一单元', en: 'Unit 1' }, lessons: [{ zh: '观潮', en: 'Watching the Tide' }, { zh: '走月亮', en: 'Walking in the Moonlight' }, { zh: '现代诗二首', en: 'Two Modern Poems' }, { zh: '繁星', en: 'Stars' }] },
  { unit: { zh: '第二单元', en: 'Unit 2' }, lessons: [{ zh: '一个豆荚里的五粒豆', en: 'Five Peas in a Pod' }, { zh: '蝙蝠和雷达', en: 'Bats and Radar' }, { zh: '呼风唤雨的世纪', en: 'The Century of Change' }, { zh: '蝴蝶的家', en: 'Home of Butterflies' }] },
  { unit: { zh: '第三单元', en: 'Unit 3' }, lessons: [{ zh: '古诗三首', en: 'Three Poems' }, { zh: '爬山虎的脚', en: 'The Ivy\'s Feet' }, { zh: '蟋蟀的住宅', en: 'The Cricket\'s House' }] },
  { unit: { zh: '第四单元', en: 'Unit 4' }, lessons: [{ zh: '盘古开天地', en: 'Pangu Creates the World' }, { zh: '精卫填海', en: 'Jingwei Fills the Sea' }, { zh: '普罗米修斯', en: 'Prometheus' }, { zh: '女娲补天', en: 'Nüwa Mends the Sky' }] },
  { unit: { zh: '第五单元', en: 'Unit 5' }, lessons: [{ zh: '麻雀', en: 'The Sparrow' }, { zh: '爬天都峰', en: 'Climbing Tiandu Peak' }] },
  { unit: { zh: '第六单元', en: 'Unit 6' }, lessons: [{ zh: '牛和鹅', en: 'The Cow and the Goose' }, { zh: '一只窝囊的大老虎', en: 'A Clumsy Tiger' }, { zh: '陀螺', en: 'The Top' }] },
  { unit: { zh: '第七单元', en: 'Unit 7' }, lessons: [{ zh: '古诗三首', en: 'Three Poems' }, { zh: '为中华之崛起而读书', en: 'Study for China\'s Rise' }, { zh: '梅兰芳蓄须', en: 'Mei Lanfang' }, { zh: '延安，我把你追寻', en: 'Yan\'an, I Seek You' }] },
  { unit: { zh: '第八单元', en: 'Unit 8' }, lessons: [{ zh: '王戎不取道旁李', en: 'Wang Rong and the Plums' }, { zh: '西门豹治邺', en: 'Ximen Bao' }, { zh: '故事二则', en: 'Two Stories' }] },
];

const G5_UP: RawUnit[] = [
  { unit: { zh: '第一单元', en: 'Unit 1' }, lessons: [{ zh: '白鹭', en: 'The Egret' }, { zh: '落花生', en: 'Peanuts' }, { zh: '桂花雨', en: 'Osmanthus Rain' }, { zh: '珍珠鸟', en: 'The Pearl Bird' }] },
  { unit: { zh: '第二单元', en: 'Unit 2' }, lessons: [{ zh: '搭石', en: 'Stepping Stones' }, { zh: '将相和', en: 'General and Minister' }, { zh: '什么比猎豹的速度更快', en: 'Faster than a Cheetah' }, { zh: '冀中的地道战', en: 'The Tunnel War' }] },
  { unit: { zh: '第三单元', en: 'Unit 3' }, lessons: [{ zh: '猎人海力布', en: 'Hunter Hailibu' }, { zh: '牛郎织女（一）', en: 'The Cowherd and the Weaver (1)' }, { zh: '牛郎织女（二）', en: 'The Cowherd and the Weaver (2)' }] },
  { unit: { zh: '第四单元', en: 'Unit 4' }, lessons: [{ zh: '古诗三首', en: 'Three Poems' }, { zh: '少年中国说（节选）', en: 'Young China' }, { zh: '圆明园的毁灭', en: 'The Ruins of Yuanmingyuan' }, { zh: '小岛', en: 'The Islet' }] },
  { unit: { zh: '第五单元', en: 'Unit 5' }, lessons: [{ zh: '太阳', en: 'The Sun' }, { zh: '松鼠', en: 'The Squirrel' }] },
  { unit: { zh: '第六单元', en: 'Unit 6' }, lessons: [{ zh: '慈母情深', en: 'A Mother\'s Love' }, { zh: '父爱之舟', en: 'A Father\'s Love' }, { zh: '"精彩极了"和"糟糕透了"', en: 'Wonderful and Terrible' }] },
  { unit: { zh: '第七单元', en: 'Unit 7' }, lessons: [{ zh: '古诗词三首', en: 'Three Poems' }, { zh: '四季之美', en: 'Beauty of the Seasons' }, { zh: '鸟的天堂', en: 'Paradise of Birds' }, { zh: '月迹', en: 'Traces of the Moon' }] },
  { unit: { zh: '第八单元', en: 'Unit 8' }, lessons: [{ zh: '古人谈读书', en: 'On Reading' }, { zh: '忆读书', en: 'Recalling Reading' }, { zh: '我的"长生果"', en: 'My "Long-Life Fruit"' }] },
];

const G6_UP: RawUnit[] = [
  { unit: { zh: '第一单元', en: 'Unit 1' }, lessons: [{ zh: '草原', en: 'The Grassland' }, { zh: '丁香结', en: 'Lilac Knots' }, { zh: '古诗词三首', en: 'Three Poems' }, { zh: '花之歌', en: 'Song of Flowers' }] },
  { unit: { zh: '第二单元', en: 'Unit 2' }, lessons: [{ zh: '七律·长征', en: 'The Long March' }, { zh: '狼牙山五壮士', en: 'Five Heroes of Langya Mountain' }, { zh: '开国大典', en: 'The Founding Ceremony' }, { zh: '灯光', en: 'The Light' }, { zh: '我的战友邱少云', en: 'My Comrade Qiu Shaoyun' }] },
  { unit: { zh: '第三单元', en: 'Unit 3' }, lessons: [{ zh: '竹节人', en: 'Bamboo Figures' }, { zh: '宇宙生命之谜', en: 'Life in the Universe' }, { zh: '故宫博物院', en: 'The Palace Museum' }] },
  { unit: { zh: '第四单元', en: 'Unit 4' }, lessons: [{ zh: '桥', en: 'The Bridge' }, { zh: '穷人', en: 'The Poor' }, { zh: '金色的鱼钩', en: 'The Golden Fishhook' }] },
  { unit: { zh: '第五单元', en: 'Unit 5' }, lessons: [{ zh: '夏天里的成长', en: 'Growing in Summer' }, { zh: '盼', en: 'Hoping' }] },
  { unit: { zh: '第六单元', en: 'Unit 6' }, lessons: [{ zh: '古诗三首', en: 'Three Poems' }, { zh: '只有一个地球', en: 'Only One Earth' }, { zh: '青山不老', en: 'The Evergreen Hills' }, { zh: '三黑和土地', en: 'Sanhei and the Land' }] },
  { unit: { zh: '第七单元', en: 'Unit 7' }, lessons: [{ zh: '文言文二则', en: 'Two Classical Essays' }, { zh: '月光曲', en: 'Moonlight Sonata' }, { zh: '京剧趣谈', en: 'Peking Opera' }] },
  { unit: { zh: '第八单元', en: 'Unit 8' }, lessons: [{ zh: '少年闰土', en: 'Young Runtu' }, { zh: '好的故事', en: 'A Good Story' }, { zh: '我的伯父鲁迅先生', en: 'My Uncle Lu Xun' }, { zh: '有的人', en: 'Some People' }] },
];

const CHINESE_UP: Partial<Record<Grade, RawUnit[]>> = {
  g2: G2_UP,
  g3: G3_UP,
  g4: G4_UP,
  g5: G5_UP,
  g6: G6_UP,
};

/* ================= 语文 2–6 年级下册逐课（人教版统编） ================= */
const G2_DOWN: RawUnit[] = [
  { unit: { zh: '第一单元', en: 'Unit 1' }, lessons: [{ zh: '古诗二首', en: 'Two Poems' }, { zh: '找春天', en: 'Looking for Spring' }, { zh: '开满鲜花的小路', en: 'The Flowery Path' }, { zh: '邓小平爷爷植树', en: 'Grandpa Deng Plants Trees' }] },
  { unit: { zh: '第二单元', en: 'Unit 2' }, lessons: [{ zh: '雷锋叔叔，你在哪里', en: 'Uncle Lei Feng, Where Are You' }, { zh: '千人糕', en: 'The Thousand-Person Cake' }, { zh: '一匹出色的马', en: 'A Wonderful Horse' }] },
  { unit: { zh: '第三单元 · 识字', en: 'Unit 3 Characters' }, lessons: [{ zh: '神州谣', en: 'Song of China' }, { zh: '传统节日', en: 'Traditional Festivals' }, { zh: '"贝"的故事', en: 'The Story of "Bei"' }, { zh: '中国美食', en: 'Chinese Food' }] },
  { unit: { zh: '第四单元', en: 'Unit 4' }, lessons: [{ zh: '彩色的梦', en: 'Colorful Dreams' }, { zh: '枫树上的喜鹊', en: 'Magpie on the Maple' }, { zh: '沙滩上的童话', en: 'Fairy Tale on the Beach' }, { zh: '我是一只小虫子', en: 'I Am a Little Bug' }] },
  { unit: { zh: '第五单元', en: 'Unit 5' }, lessons: [{ zh: '寓言二则', en: 'Two Fables' }, { zh: '画杨桃', en: 'Drawing a Star Fruit' }, { zh: '小马过河', en: 'The Pony Crosses the River' }] },
  { unit: { zh: '第六单元', en: 'Unit 6' }, lessons: [{ zh: '古诗二首', en: 'Two Poems' }, { zh: '雷雨', en: 'Thunderstorm' }, { zh: '要是你在野外迷了路', en: 'Lost in the Wild' }, { zh: '太空生活趣事多', en: 'Fun Life in Space' }] },
  { unit: { zh: '第七单元', en: 'Unit 7' }, lessons: [{ zh: '大象的耳朵', en: 'The Elephant\'s Ears' }, { zh: '蜘蛛开店', en: 'The Spider\'s Shop' }, { zh: '青蛙卖泥塘', en: 'The Frog Sells the Pond' }, { zh: '小毛虫', en: 'The Little Caterpillar' }] },
  { unit: { zh: '第八单元', en: 'Unit 8' }, lessons: [{ zh: '祖先的摇篮', en: 'Cradle of Ancestors' }, { zh: '当世界年纪还小的时候', en: 'When the World Was Young' }, { zh: '羿射九日', en: 'Yi Shoots the Suns' }] },
];

const G3_DOWN: RawUnit[] = [
  { unit: { zh: '第一单元', en: 'Unit 1' }, lessons: [{ zh: '古诗三首', en: 'Three Poems' }, { zh: '燕子', en: 'The Swallow' }, { zh: '荷花', en: 'The Lotus' }, { zh: '昆虫备忘录', en: 'Insect Notes' }] },
  { unit: { zh: '第二单元', en: 'Unit 2' }, lessons: [{ zh: '守株待兔', en: 'Waiting for a Hare' }, { zh: '陶罐和铁罐', en: 'Pot and Can' }, { zh: '美丽的鹿角', en: 'Beautiful Antlers' }, { zh: '池子与河流', en: 'The Pond and the River' }] },
  { unit: { zh: '第三单元', en: 'Unit 3' }, lessons: [{ zh: '古诗三首', en: 'Three Poems' }, { zh: '纸的发明', en: 'The Invention of Paper' }, { zh: '赵州桥', en: 'Zhaozhou Bridge' }, { zh: '一幅名扬中外的画', en: 'A World-Famous Painting' }] },
  { unit: { zh: '第四单元', en: 'Unit 4' }, lessons: [{ zh: '花钟', en: 'The Flower Clock' }, { zh: '蜜蜂', en: 'The Bee' }, { zh: '小虾', en: 'The Little Shrimp' }] },
  { unit: { zh: '第五单元', en: 'Unit 5' }, lessons: [{ zh: '宇宙的另一边', en: 'The Other Side of the Universe' }, { zh: '我变成了一棵树', en: 'I Became a Tree' }] },
  { unit: { zh: '第六单元', en: 'Unit 6' }, lessons: [{ zh: '童年的水墨画', en: 'Childhood Ink Paintings' }, { zh: '剃头大师', en: 'The Barber Master' }, { zh: '肥皂泡', en: 'Soap Bubbles' }, { zh: '我不能失信', en: 'I Keep My Word' }] },
  { unit: { zh: '第七单元', en: 'Unit 7' }, lessons: [{ zh: '我们奇妙的世界', en: 'Our Wonderful World' }, { zh: '海底世界', en: 'The Undersea World' }, { zh: '火烧云', en: 'The Glowing Clouds' }] },
  { unit: { zh: '第八单元', en: 'Unit 8' }, lessons: [{ zh: '慢性子裁缝和急性子顾客', en: 'Slow Tailor, Quick Customer' }, { zh: '方帽子店', en: 'The Square Hat Shop' }, { zh: '漏', en: 'The Leak' }, { zh: '枣核', en: 'The Date Pit' }] },
];

const G4_DOWN: RawUnit[] = [
  { unit: { zh: '第一单元', en: 'Unit 1' }, lessons: [{ zh: '古诗词三首', en: 'Three Poems' }, { zh: '乡下人家', en: 'Country Families' }, { zh: '天窗', en: 'The Skylight' }, { zh: '三月桃花水', en: 'Peach Blossom Water' }] },
  { unit: { zh: '第二单元', en: 'Unit 2' }, lessons: [{ zh: '琥珀', en: 'Amber' }, { zh: '飞向蓝天的恐龙', en: 'Dinosaurs Take Flight' }, { zh: '纳米技术就在我们身边', en: 'Nanotechnology Around Us' }, { zh: '千年梦圆在今朝', en: 'A Dream Realized' }] },
  { unit: { zh: '第三单元', en: 'Unit 3' }, lessons: [{ zh: '短诗三首', en: 'Three Short Poems' }, { zh: '绿', en: 'Green' }, { zh: '白桦', en: 'The Birch' }, { zh: '在天晴了的时候', en: 'After the Rain' }] },
  { unit: { zh: '第四单元', en: 'Unit 4' }, lessons: [{ zh: '猫', en: 'The Cat' }, { zh: '母鸡', en: 'The Hen' }, { zh: '白鹅', en: 'The White Goose' }] },
  { unit: { zh: '第五单元', en: 'Unit 5' }, lessons: [{ zh: '海上日出', en: 'Sunrise at Sea' }, { zh: '记金华的双龙洞', en: 'The Double Dragon Cave' }] },
  { unit: { zh: '第六单元', en: 'Unit 6' }, lessons: [{ zh: '文言文二则', en: 'Two Classical Essays' }, { zh: '小英雄雨来', en: 'Little Hero Yulai' }, { zh: '我们家的男子汉', en: 'The Little Man' }, { zh: '芦花鞋', en: 'Reed Shoes' }] },
  { unit: { zh: '第七单元', en: 'Unit 7' }, lessons: [{ zh: '古诗三首', en: 'Three Poems' }, { zh: '"诺曼底号"遇难记', en: 'The Wreck of the Normandy' }, { zh: '黄继光', en: 'Huang Jiguang' }, { zh: '挑山工', en: 'The Mountain Porter' }] },
  { unit: { zh: '第八单元', en: 'Unit 8' }, lessons: [{ zh: '宝葫芦的秘密', en: 'The Magic Gourd' }, { zh: '巨人的花园', en: 'The Giant\'s Garden' }, { zh: '海的女儿', en: 'Daughter of the Sea' }] },
];

const G5_DOWN: RawUnit[] = [
  { unit: { zh: '第一单元', en: 'Unit 1' }, lessons: [{ zh: '古诗三首', en: 'Three Poems' }, { zh: '祖父的园子', en: 'Grandfather\'s Garden' }, { zh: '月是故乡明', en: 'The Moon over Home' }, { zh: '梅花魂', en: 'The Plum Blossom Spirit' }] },
  { unit: { zh: '第二单元', en: 'Unit 2' }, lessons: [{ zh: '草船借箭', en: 'Borrowing Arrows' }, { zh: '景阳冈', en: 'Jingyang Ridge' }, { zh: '猴王出世', en: 'The Monkey King' }, { zh: '红楼春趣', en: 'Dream of Red Mansions' }] },
  { unit: { zh: '第三单元 · 综合性学习', en: 'Unit 3 Projects' }, lessons: [{ zh: '汉字真有趣', en: 'Characters Are Fun' }, { zh: '我爱你，汉字', en: 'I Love Characters' }] },
  { unit: { zh: '第四单元', en: 'Unit 4' }, lessons: [{ zh: '古诗三首', en: 'Three Poems' }, { zh: '青山处处埋忠骨', en: 'Heroes Rest Everywhere' }, { zh: '军神', en: 'The God of War' }, { zh: '清贫', en: 'Honest Poverty' }] },
  { unit: { zh: '第五单元', en: 'Unit 5' }, lessons: [{ zh: '人物描写一组', en: 'Character Sketches' }, { zh: '刷子李', en: 'Brush Master Li' }] },
  { unit: { zh: '第六单元', en: 'Unit 6' }, lessons: [{ zh: '自相矛盾', en: 'Contradiction' }, { zh: '田忌赛马', en: 'Tian Ji\'s Horse Race' }, { zh: '跳水', en: 'The Dive' }] },
  { unit: { zh: '第七单元', en: 'Unit 7' }, lessons: [{ zh: '威尼斯的小艇', en: 'Venetian Boats' }, { zh: '牧场之国', en: 'The Pasture Land' }, { zh: '金字塔', en: 'The Pyramids' }] },
  { unit: { zh: '第八单元', en: 'Unit 8' }, lessons: [{ zh: '杨氏之子', en: 'The Yang Child' }, { zh: '手指', en: 'The Fingers' }, { zh: '童年的发现', en: 'A Childhood Discovery' }] },
];

const G6_DOWN: RawUnit[] = [
  { unit: { zh: '第一单元', en: 'Unit 1' }, lessons: [{ zh: '北京的春节', en: 'Spring Festival in Beijing' }, { zh: '腊八粥', en: 'Laba Porridge' }, { zh: '古诗三首', en: 'Three Poems' }, { zh: '藏戏', en: 'Tibetan Opera' }] },
  { unit: { zh: '第二单元', en: 'Unit 2' }, lessons: [{ zh: '鲁滨逊漂流记（节选）', en: 'Robinson Crusoe' }, { zh: '骑鹅旅行记（节选）', en: 'Nils\'s Travels' }, { zh: '汤姆·索亚历险记（节选）', en: 'Tom Sawyer' }] },
  { unit: { zh: '第三单元', en: 'Unit 3' }, lessons: [{ zh: '匆匆', en: 'In a Hurry' }, { zh: '那个星期天', en: 'That Sunday' }] },
  { unit: { zh: '第四单元', en: 'Unit 4' }, lessons: [{ zh: '古诗三首', en: 'Three Poems' }, { zh: '十六年前的回忆', en: 'Memory of 16 Years Ago' }, { zh: '为人民服务', en: 'Serve the People' }, { zh: '董存瑞舍身炸暗堡', en: 'Dong Cunrui' }] },
  { unit: { zh: '第五单元', en: 'Unit 5' }, lessons: [{ zh: '文言文二则', en: 'Two Classical Essays' }, { zh: '真理诞生于一百个问号之后', en: 'Truth Is Born of Questions' }, { zh: '表里的生物', en: 'A Creature in the Watch' }, { zh: '他们那时候多有趣啊', en: 'Their Old Days' }] },
  { unit: { zh: '第六单元 · 综合性学习', en: 'Unit 6 Projects' }, lessons: [{ zh: '回忆往事', en: 'Recalling the Past' }, { zh: '依依惜别', en: 'Farewell' }] },
];

const CHINESE_DOWN: Partial<Record<Grade, RawUnit[]>> = {
  g2: G2_DOWN,
  g3: G3_DOWN,
  g4: G4_DOWN,
  g5: G5_DOWN,
  g6: G6_DOWN,
};

function buildSkills(): Skill[] {
  const out: Skill[] = [];
  /** 逐课（单元 → 课时） */
  const pushDetail = (subject: SubjectId, grade: Grade, term: '上' | '下', units: RawUnit[]) => {
    units.forEach((u, ui) =>
      u.lessons.forEach((l, li) => {
        const id = `${subject}-${grade}-${term === '上' ? 'a' : 'b'}-${ui + 1}-${li + 1}`;
        out.push({
          id,
          name: { zh: l.zh, en: l.en },
          unit: u.unit,
          subject,
          grade,
          term,
          content: l.content,
        });
      }),
    );
  };
  /** 单元级（尚未逐课化的年级：单元即一课） */
  const pushBook = (subject: SubjectId, grade: Grade, term: '上' | '下', lessons: RawLesson[]) => {
    lessons.forEach((l, i) => {
      const id = `${subject}-${grade}-${term === '上' ? 'a' : 'b'}-${i + 1}`;
      out.push({
        id,
        name: { zh: l.zh, en: l.en },
        unit: { zh: l.zh, en: l.en },
        subject,
        grade,
        term,
        content: l.content,
      });
    });
  };

  // 数学：人教版逐课目录（1~6 年级）
  (Object.keys(MATH_UNITS) as Grade[]).forEach((g) => {
    pushDetail('math', g, '上', MATH_UNITS[g].上);
    pushDetail('math', g, '下', MATH_UNITS[g].下);
  });
  pushDetail('chinese', 'g1', '上', G1_CHINESE.上);
  pushDetail('chinese', 'g1', '下', G1_CHINESE.下);
  // 英语：PEP 三年级起点，3~6 年级按单元→课时（每单元 6 课）
  (['上', '下'] as const).forEach((term) => {
    (Object.keys(ENGLISH_UNITS[term]) as Grade[]).forEach((g) => {
      const units = ENGLISH_UNITS[term][g] as { zh: string; en: string }[];
      pushDetail(
        'english',
        g,
        term,
        units.map((u, ui) => ({
          unit: u,
          lessons: EN_LESSON_NAMES(g, ui + 1).map((n) => ({ zh: n, en: n })),
        })),
      );
    });
  });
  (Object.keys(CHINESE) as Grade[]).forEach((g) => {
    if (g === 'g1') return;
    if (CHINESE_UP[g]) pushDetail('chinese', g, '上', CHINESE_UP[g] as RawUnit[]);
    else pushBook('chinese', g, '上', CHINESE[g].上);
    if (CHINESE_DOWN[g]) pushDetail('chinese', g, '下', CHINESE_DOWN[g] as RawUnit[]);
    else pushBook('chinese', g, '下', CHINESE[g].下);
  });
  (Object.keys(SCIENCE) as Grade[]).forEach((g) => {
    pushBook('science', g, '上', SCIENCE[g].上);
    pushBook('science', g, '下', SCIENCE[g].下);
  });
  (Object.keys(LIFE) as Grade[]).forEach((g) => {
    pushBook('life', g, '上', LIFE[g].上);
    pushBook('life', g, '下', LIFE[g].下);
  });
  (Object.keys(THINKING) as Grade[]).forEach((g) => {
    pushBook('thinking', g, '上', THINKING[g].上);
    pushBook('thinking', g, '下', THINKING[g].下);
  });
  return out;
}

export const SKILLS: Skill[] = buildSkills();

/* ---------- 查询辅助 ---------- */

export function getSkill(id: string): Skill | undefined {
  return SKILLS.find((s) => s.id === id);
}

export function skillsByGrade(grade: Grade): Skill[] {
  return SKILLS.filter((s) => s.grade === grade);
}

export function skillsBySubject(grade: Grade, subject: SubjectId): Skill[] {
  return SKILLS.filter((s) => s.grade === grade && s.subject === subject);
}

/** 某学科全部课程（跨年级） */
export function skillsBySubjectOnly(subject: SubjectId): Skill[] {
  return SKILLS.filter((s) => s.subject === subject);
}

/** 某学科全部课程数（跨年级） */
export function subjectLessonCount(subject: SubjectId): number {
  return SKILLS.filter((s) => s.subject === subject).length;
}

/** 某学科某年级的课程，按学期 → 单元 分组（保持课时顺序） */
export function lessonsByUnit(
  grade: Grade,
  subject: SubjectId,
): { term: '上' | '下'; unit: { zh: string; en: string }; lessons: Skill[] }[] {
  const list = skillsBySubject(grade, subject);
  const groups: { term: '上' | '下'; unit: { zh: string; en: string }; lessons: Skill[] }[] = [];
  for (const s of list) {
    const last = groups[groups.length - 1];
    if (last && last.term === s.term && last.unit.zh === s.unit.zh) last.lessons.push(s);
    else groups.push({ term: s.term, unit: s.unit, lessons: [s] });
  }
  return groups;
}

/** 某游戏服务的课程（用于学习流程反向查找） */
export function skillByGame(gameId: string): Skill[] {
  return SKILLS.filter((s) => SUBJECT_META[s.subject].games.includes(gameId));
}

/** 演示主视觉 */
export function skillEmoji(s: Skill): string {
  return SUBJECT_META[s.subject].emoji;
}

/** 练习游戏 */
export function skillGames(s: Skill): string[] {
  return SUBJECT_META[s.subject].games;
}

/** 演示讲解文案 */
export function skillDesc(s: Skill, lang: 'zh' | 'en'): string {
  return lang === 'zh' ? `我们来学习「${s.name.zh}」吧！` : `Let's learn: ${s.name.en}!`;
}

// 保留旧数学目录定义（历史数据，已由 mathCurriculum.ts 的逐课目录取代）
export { MATH, G1_MATH };
