import type { MathFigure } from '../skills';

/** 三年级数学 · 配图（由子代理录入） */
export const FIG3: Record<string, MathFigure> = {
  /* ================= 三年级上册 ================= */
  /* 第 1 单元 · 时、分、秒 */
  'math-g3-a-1-1': { type: 'clock', hour: 12, minute: 0 }, // 秒的认识
  'math-g3-a-1-2': { type: 'clock', hour: 8, minute: 30 }, // 时间的计算

  /* 第 2 单元 · 万以内的加法和减法（一） */
  'math-g3-a-2-1': { type: 'vertical', a: 34, b: 25, op: '+' }, // 两位数加两位数口算
  'math-g3-a-2-2': { type: 'vertical', a: 65, b: 28, op: '-' }, // 两位数减两位数口算
  'math-g3-a-2-3': { type: 'vertical', a: 340, b: 260, op: '+' }, // 几百几十加减法
  'math-g3-a-2-4': { type: 'vertical', a: 350, b: 280, op: '+' }, // 解决问题

  /* 第 4 单元 · 万以内的加法和减法（二） */
  'math-g3-a-4-1': { type: 'vertical', a: 271, b: 122, op: '+' }, // 三位数加三位数
  'math-g3-a-4-2': { type: 'vertical', a: 435, b: 86, op: '-' }, // 三位数减三位数
  'math-g3-a-4-3': { type: 'vertical', a: 412, b: 287, op: '+' }, // 验算

  /* 第 5 单元 · 倍的认识 */
  'math-g3-a-5-1': { type: 'equation', a: 3, b: 4, op: '×' }, // 倍的认识

  /* 第 6 单元 · 多位数乘一位数 */
  'math-g3-a-6-1': { type: 'equation', a: 20, b: 3, op: '×' }, // 口算乘法
  'math-g3-a-6-2': { type: 'equation', a: 24, b: 3, op: '×' }, // 笔算乘法
  'math-g3-a-6-3': { type: 'equation', a: 12, b: 4, op: '×' }, // 解决问题

  /* 第 7 单元 · 长方形和正方形 */
  'math-g3-a-7-1': { type: 'shapes', shape: 'rectangle', w: 5, h: 3 }, // 四边形
  'math-g3-a-7-2': { type: 'shapes', shape: 'rectangle', w: 4, h: 2 }, // 周长
  'math-g3-a-7-3': { type: 'shapes', shape: 'square', w: 4, h: 4 }, // 长方形和正方形的周长

  /* 第 8 单元 · 分数的初步认识 */
  'math-g3-a-8-1': { type: 'fraction', whole: 4, part: 1 }, // 分数的初步认识
  'math-g3-a-8-2': { type: 'fraction', whole: 3, part: 1 }, // 比较大小
  'math-g3-a-8-3': { type: 'equation', a: 2, b: 3, op: '+' }, // 同分母分数加减法

  /* ================= 三年级下册 ================= */
  /* 第 2 单元 · 除数是一位数的除法 */
  'math-g3-b-2-1': { type: 'equation', a: 60, b: 3, op: '÷' }, // 口算除法
  'math-g3-b-2-2': { type: 'equation', a: 92, b: 4, op: '÷' }, // 笔算除法
  'math-g3-b-2-3': { type: 'equation', a: 615, b: 3, op: '÷' }, // 商中间或末尾有 0 的除法
  'math-g3-b-2-4': { type: 'equation', a: 120, b: 4, op: '÷' }, // 解决问题

  /* 第 3 单元 · 复式统计表 */
  'math-g3-b-3-1': { type: 'chart', data: [18, 12, 15, 9] }, // 复式统计表

  /* 第 4 单元 · 两位数乘两位数 */
  'math-g3-b-4-1': { type: 'equation', a: 20, b: 30, op: '×' }, // 口算乘法
  'math-g3-b-4-2': { type: 'equation', a: 23, b: 12, op: '×' }, // 笔算乘法
  'math-g3-b-4-3': { type: 'equation', a: 15, b: 14, op: '×' }, // 解决问题

  /* 第 5 单元 · 面积 */
  'math-g3-b-5-1': { type: 'shapes', shape: 'rectangle', w: 4, h: 3 }, // 面积和面积单位
  'math-g3-b-5-2': { type: 'shapes', shape: 'square', w: 5, h: 5 }, // 长方形、正方形面积计算

  /* 第 6 单元 · 年、月、日 */
  'math-g3-b-6-1': { type: 'clock', hour: 10, minute: 15 }, // 年、月、日
  'math-g3-b-6-2': { type: 'clock', hour: 15, minute: 30 }, // 24 时计时法

  /* 第 7 单元 · 小数的初步认识 */
  'math-g3-b-7-1': { type: 'vertical', a: 1.5, b: 0.5, op: '+' }, // 认识小数
  'math-g3-b-7-2': { type: 'vertical', a: 0.6, b: 0.3, op: '+' }, // 简单的小数加减法

  /* ============ 上册 ============ */
  /* 单元3 测量 */
  'math-g3-a-3-1': { type: 'numberline', start: 0, end: 10, mark: 1, formula: '1 厘米 = 10 毫米' }, // 毫米、分米的认识
  'math-g3-a-3-2': { type: 'numberline', start: 0, end: 1000, mark: 500, formula: '1 千米 = 1000 米' }, // 千米的认识
  'math-g3-a-3-3': { type: 'weight', left: 1000, right: 1000, leftEmoji: '🐘', rightEmoji: '🚚', unit: '千克', formula: '1 吨 = 1000 千克' }, // 吨的认识
  /* 单元9 数学广角——集合 */
  'math-g3-a-9-1': { type: 'venn', vA: 4, vB: 3, vAB: 2, labelA: '会游泳', labelB: '会骑车' }, // 集合

  /* ============ 下册 ============ */
  /* 单元1 位置与方向（一） */
  'math-g3-b-1-1': { type: 'direction', mode: 'compass', dir: '东' }, // 认识东南西北
  'math-g3-b-1-2': { type: 'direction', mode: 'compass', dir: '东北' }, // 认识东北、东南、西北、西南
  /* 单元5 面积 */
  'math-g3-b-5-3': { type: 'shapes', shape: 'square', w: 10, h: 10, formula: '1 平方米 = 100 平方分米' }, // 面积单位间的进率
  /* 单元8 数学广角——搭配（二） */
  'math-g3-b-8-1': { type: 'combo', rows: 3, cols: 3, rowLabel: '十位', colLabel: '个位', formula: '3 × 3 = 9 个两位数' }, // 搭配（二）
};
