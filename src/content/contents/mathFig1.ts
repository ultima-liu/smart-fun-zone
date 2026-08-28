import type { MathFigure } from '../skills';

/** 一年级数学 · 配图（由子代理录入） */
export const FIG1: Record<string, MathFigure> = {
  /* ================= 上册 ================= */

  /* 单元1 准备课 */
  'math-g1-a-1-1': { type: 'count', emoji: '🐦', count: 5 }, // 数一数
  'math-g1-a-1-2': { type: 'compare', left: 5, right: 3, leftEmoji: '🔴', rightEmoji: '🔵' }, // 比一比

  /* 单元3 1~5 的认识和加减法 */
  'math-g1-a-3-1': { type: 'count', emoji: '🍎', count: 4 }, // 1~5 的认识
  'math-g1-a-3-2': { type: 'compare', left: 4, right: 3, leftEmoji: '🔴', rightEmoji: '🔵' }, // 比大小
  'math-g1-a-3-4': { type: 'equation', a: 2, b: 3, op: '+' }, // 分与合
  'math-g1-a-3-5': { type: 'equation', a: 2, b: 3, op: '+' }, // 加法
  'math-g1-a-3-6': { type: 'equation', a: 5, b: 2, op: '-' }, // 减法
  'math-g1-a-3-7': { type: 'equation', a: 3, b: 3, op: '-' }, // 0

  /* 单元5 6~10 的认识和加减法 */
  'math-g1-a-5-1': { type: 'count', emoji: '🐟', count: 6 }, // 6 和 7
  'math-g1-a-5-2': { type: 'count', emoji: '🐰', count: 8 }, // 8 和 9
  'math-g1-a-5-3': { type: 'count', emoji: '🍎', count: 10 }, // 10
  'math-g1-a-5-4': { type: 'equation', a: 3, b: 4, op: '+' }, // 连加连减
  'math-g1-a-5-5': { type: 'equation', a: 8, b: 3, op: '-' }, // 加减混合

  /* 单元6 11~20 各数的认识 */
  'math-g1-a-6-1': { type: 'count', emoji: '🐦', count: 15 }, // 11~20 各数的认识
  'math-g1-a-6-2': { type: 'equation', a: 10, b: 5, op: '+' }, // 10 加几和相应的减法

  /* 单元8 20 以内的进位加法 */
  'math-g1-a-8-1': { type: 'makeTen', a: 9, b: 4 }, // 9 加几（凑十法）
  'math-g1-a-8-2': { type: 'makeTen', a: 8, b: 5 }, // 8、7、6 加几（凑十法）
  'math-g1-a-8-3': { type: 'makeTen', a: 7, b: 5 }, // 5、4、3、2 加几（凑十法）

  /* ================= 下册 ================= */

  /* 单元2 20 以内的退位减法 */
  'math-g1-b-2-1': { type: 'breakTen', a: 15, b: 9 }, // 十几减 9（破十法）
  'math-g1-b-2-2': { type: 'breakTen', a: 14, b: 8 }, // 十几减 8、7（破十法）
  'math-g1-b-2-3': { type: 'breakTen', a: 13, b: 6 }, // 十几减 6、5、4、3、2（破十法）

  /* 单元4 100 以内数的认识 */
  'math-g1-b-4-1': { type: 'count', emoji: '🍎', count: 10 }, // 数数 数的组成
  'math-g1-b-4-2': { type: 'numberline', start: 0, end: 100, mark: 50 }, // 数的顺序 比较大小
  'math-g1-b-4-3': { type: 'vertical', a: 30, b: 5, op: '+' }, // 整十数加一位数和相应的减法

  /* 单元6 100 以内的加法和减法（一） */
  'math-g1-b-6-1': { type: 'vertical', a: 30, b: 20, op: '+' }, // 整十数加、减整十数
  'math-g1-b-6-2': { type: 'vertical', a: 45, b: 20, op: '+' }, // 两位数加一位数、整十数
  'math-g1-b-6-3': { type: 'vertical', a: 56, b: 20, op: '-' }, // 两位数减一位数、整十数

  /* 单元7 100 以内的加法和减法（二） */
  'math-g1-b-7-1': { type: 'vertical', a: 34, b: 25, op: '+' }, // 两位数加两位数
  'math-g1-b-7-2': { type: 'vertical', a: 52, b: 37, op: '-' }, // 两位数减两位数

  /* ============ 上册 ============ */
  /* 单元2 位置 */
  'math-g1-a-2-1': { type: 'position', dir: '上', formula: '上、下、前、后' }, // 上、下、前、后
  'math-g1-a-2-2': { type: 'position', dir: '左', formula: '左、右' }, // 左、右
  /* 单元3 1~5 的认识和加减法 */
  'math-g1-a-3-3': { type: 'ordinal', count: 5, mark: 3 }, // 第几
  /* 单元4 认识图形（一） */
  'math-g1-a-4-1': { type: 'shapeSet', shapes: ['cuboid', 'cube', 'cylinder', 'sphere'] }, // 认识立体图形
  /* 单元7 认识钟表 */
  'math-g1-a-7-1': { type: 'clock', hour: 8, minute: 0 }, // 认识整时

  /* ============ 下册 ============ */
  /* 单元1 认识图形（二） */
  'math-g1-b-1-1': { type: 'shapeSet', shapes: ['rectangle', 'square', 'triangle', 'circle'] }, // 认识平面图形
  /* 单元3 分类与整理 */
  'math-g1-b-3-1': { type: 'sort', groups: [{ label: '水果', emoji: '🍎', n: 4 }, { label: '玩具', emoji: '🧸', n: 3 }] }, // 分类与整理
  /* 单元5 认识人民币 */
  'math-g1-b-5-1': { type: 'money', coins: [{ v: 1, n: 3 }, { v: 5, n: 1 }, { v: 10, n: 1 }] }, // 认识人民币
  'math-g1-b-5-2': { type: 'money', coins: [{ v: 5, n: 1 }, { v: 1, n: 3 }, { v: 10, n: 1 }], formula: '5 + 1 + 1 + 1 = 8 元' }, // 简单的计算
  /* 单元8 找规律 */
  'math-g1-b-8-1': { type: 'pattern', seq: ['🔴', '🔵', '🔴', '🔵'], answer: '🔴' }, // 找规律
};
