import type { MathFigure } from '../skills';

/** 四年级数学（人教版）· 配图（由子代理录入） */
export const FIG4: Record<string, MathFigure> = {
  /* ================= 上册 ================= */

  /* 单元3 角的度量 */
  'math-g4-a-3-2': { type: 'numberline', start: 0, end: 180, mark: 45 }, // 角的度量
  'math-g4-a-3-3': { type: 'numberline', start: 0, end: 180, mark: 90 }, // 角的分类
  'math-g4-a-3-4': { type: 'numberline', start: 0, end: 180, mark: 120 }, // 画角

  /* 单元4 三位数乘两位数 */
  'math-g4-a-4-1': { type: 'equation', a: 145, b: 12, op: '×' }, // 三位数乘两位数笔算
  'math-g4-a-4-2': { type: 'equation', a: 106, b: 30, op: '×' }, // 因数中间或末尾有 0 的乘法
  'math-g4-a-4-3': { type: 'equation', a: 6, b: 20, op: '×' }, // 积的变化规律
  'math-g4-a-4-4': { type: 'equation', a: 24, b: 15, op: '×' }, // 解决问题

  /* 单元5 平行四边形和梯形 */
  'math-g4-a-5-2': { type: 'shapes', shape: 'parallelogram', w: 6, h: 4 }, // 平行四边形
  'math-g4-a-5-3': { type: 'shapes', shape: 'trapezoid', ta: 4, tb: 6, h: 4 }, // 梯形

  /* 单元6 除数是两位数的除法 */
  'math-g4-a-6-1': { type: 'equation', a: 80, b: 20, op: '÷' }, // 口算除法
  'math-g4-a-6-2': { type: 'equation', a: 84, b: 21, op: '÷' }, // 笔算除法
  'math-g4-a-6-3': { type: 'equation', a: 160, b: 80, op: '÷' }, // 商的变化规律

  /* 单元7 条形统计图 */
  'math-g4-a-7-1': { type: 'chart', data: [12, 18, 9, 15, 6] }, // 条形统计图

  /* ================= 下册 ================= */

  /* 单元1 四则运算 */
  'math-g4-b-1-1': { type: 'vertical', a: 126, b: 74, op: '+' }, // 加减法的意义和各部分间的关系
  'math-g4-b-1-2': { type: 'equation', a: 25, b: 4, op: '×' }, // 乘除法的意义和各部分间的关系
  'math-g4-b-1-3': { type: 'equation', a: 96, b: 16, op: '÷' }, // 括号
  'math-g4-b-1-4': { type: 'equation', a: 24, b: 6, op: '×' }, // 解决问题

  /* 单元3 运算定律 */
  'math-g4-b-3-1': { type: 'vertical', a: 115, b: 132, op: '+' }, // 加法运算定律
  'math-g4-b-3-2': { type: 'equation', a: 25, b: 4, op: '×' }, // 乘法运算定律
  'math-g4-b-3-3': { type: 'equation', a: 25, b: 44, op: '×' }, // 简便计算

  /* 单元4 小数的意义和性质 */
  'math-g4-b-4-1': { type: 'fraction', whole: 10, part: 3 }, // 小数的意义
  'math-g4-b-4-3': { type: 'numberline', start: 0, end: 1, mark: 0.5 }, // 小数的大小比较
  'math-g4-b-4-4': { type: 'equation', a: 0.85, b: 100, op: '×' }, // 小数点移动引起小数大小的变化

  /* 单元5 三角形 */
  'math-g4-b-5-1': { type: 'shapes', shape: 'triangle', w: 8, h: 5 }, // 三角形的特性
  'math-g4-b-5-2': { type: 'shapes', shape: 'triangle', w: 6, h: 4 }, // 三角形三边关系
  'math-g4-b-5-3': { type: 'shapes', shape: 'triangle', w: 5, h: 5 }, // 三角形的分类
  'math-g4-b-5-4': { type: 'shapes', shape: 'triangle', w: 7, h: 4 }, // 三角形的内角和

  /* 单元6 小数的加法和减法 */
  'math-g4-b-6-1': { type: 'vertical', a: 6.45, b: 4.29, op: '+' }, // 小数加减法
  'math-g4-b-6-2': { type: 'vertical', a: 20, b: 14.45, op: '-' }, // 小数加减混合运算
  'math-g4-b-6-3': { type: 'vertical', a: 3.25, b: 1.75, op: '+' }, // 整数加法运算定律推广到小数

  /* 单元8 平均数与条形统计图 */
  'math-g4-b-8-1': { type: 'chart', data: [14, 12, 11, 15] }, // 平均数
  'math-g4-b-8-2': { type: 'chart', data: [12, 18, 9, 15, 21] }, // 复式条形统计图

  /* ============ 上册 ============ */
  /* 单元1 大数的认识 */
  'math-g4-a-1-1': { type: 'placevalue', number: '360050' }, // 亿以内数的认识
  'math-g4-a-1-2': { type: 'placevalue', number: '360050', name: '三十六万零五十' }, // 亿以内数的读法和写法
  'math-g4-a-1-3': { type: 'placevalue', number: '998000', formula: '≈ 100 万（改写）' }, // 比较大小 数的改写
  'math-g4-a-1-4': { type: 'placevalue', number: '1300000000', name: '十三亿' }, // 亿以上数的认识
  'math-g4-a-1-5': { type: 'text', emoji: '🧮', title: '计算工具', text: '算盘 · 计算器' }, // 计算工具的认识
  /* 单元2 公顷和平方千米 */
  'math-g4-a-2-1': { type: 'shapes', shape: 'square', w: 100, h: 100, formula: '1 公顷 = 10000 平方米' }, // 公顷
  'math-g4-a-2-2': { type: 'shapes', shape: 'square', w: 1000, h: 1000, formula: '1 平方千米 = 100 公顷' }, // 平方千米
  /* 单元3 角的度量 */
  'math-g4-a-3-1': { type: 'linekind', lineKind: 'segment' }, // 线段、直线、射线
  /* 单元5 平行四边形和梯形 */
  'math-g4-a-5-1': { type: 'linepair', pairKind: 'parallel' }, // 垂直与平行
  /* 单元8 数学广角——优化 */
  'math-g4-a-8-1': { type: 'timeline', tasks: [{ name: '洗水壶', start: 0, len: 1 }, { name: '烧水', start: 1, len: 8 }, { name: '沏茶', start: 9, len: 1 }] }, // 沏茶问题
  'math-g4-a-8-2': { type: 'timeline', tasks: [{ name: '第 1 张', start: 0, len: 3 }, { name: '第 2 张', start: 3, len: 3 }, { name: '第 3 张', start: 6, len: 3 }] }, // 烙饼问题
  'math-g4-a-8-3': { type: 'match', matches: [{ a: '齐王 上等马', b: '田忌 下等马', win: 'b' }, { a: '齐王 中等马', b: '田忌 上等马', win: 'b' }, { a: '齐王 下等马', b: '田忌 中等马', win: 'b' }] }, // 田忌赛马

  /* ============ 下册 ============ */
  /* 单元2 观察物体（二） */
  'math-g4-b-2-1': { type: 'views' }, // 观察物体
  /* 单元4 小数的意义和性质 */
  'math-g4-b-4-2': { type: 'numberline', start: 0, end: 1, mark: 0.1, formula: '0.10 = 0.1' }, // 小数的性质
  'math-g4-b-4-5': { type: 'equation', a: 1.5, b: 100, op: '×', formula: '1.5 米 = 150 厘米' }, // 小数与单位换算
  'math-g4-b-4-6': { type: 'numberline', start: 0, end: 1, mark: 0.3, formula: '0.35 ≈ 0.4（保留一位小数）' }, // 小数的近似数
  /* 单元7 图形的运动（二） */
  'math-g4-b-7-1': { type: 'motion', motionKind: 'flip', shape: 'square' }, // 轴对称
  'math-g4-b-7-2': { type: 'motion', motionKind: 'slide', shape: 'triangle' }, // 平移
  /* 单元9 数学广角——鸡兔同笼 */
  'math-g4-b-9-1': { type: 'text', emoji: '🐔🐰', title: '鸡兔同笼', text: '8 个头，26 只脚', formula: '鸡 3 只 · 兔 5 只' }, // 鸡兔同笼
};
