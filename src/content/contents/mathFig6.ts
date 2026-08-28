import type { MathFigure } from '../skills';

/** 六年级数学 · 配图（由子代理录入） */
export const FIG6: Record<string, MathFigure> = {
  /* ================= 六年级上册 ================= */

  /* 第一单元 分数乘法 */
  'math-g6-a-1-1': { type: 'fraction', whole: 5, part: 2 }, // 分数乘整数：2/5 × 3
  'math-g6-a-1-2': { type: 'fractionMultiply', fa: 3, fb: 4, fc: 2, fd: 5 }, // 分数乘分数：3/4 × 2/5 = 6/20
  'math-g6-a-1-3': { type: 'fraction', whole: 10, part: 7 }, // 小数乘分数：0.7 = 7/10
  'math-g6-a-1-4': { type: 'text', emoji: '🍰', title: '分数乘法运算定律', text: '5/7 × 3/8 + 2/7 × 3/8 = 3/8' }, // 分数乘法运算定律
  'math-g6-a-1-5': { type: 'fraction', whole: 10, part: 3 }, // 解决问题：求一个数的几分之几

  /* 第二单元 位置与方向（二）——无法表达，跳过 */

  /* 第三单元 分数除法 */
  'math-g6-a-3-1': { type: 'fraction', whole: 3, part: 2 }, // 倒数的认识：2/3 的倒数是 3/2
  'math-g6-a-3-2': { type: 'fraction', whole: 4, part: 3 }, // 分数除以整数：3/4 ÷ 2
  'math-g6-a-3-3': { type: 'fraction', whole: 5, part: 2 }, // 一个数除以分数：2 ÷ 2/5
  'math-g6-a-3-4': { type: 'text', emoji: '🍰', title: '分数四则混合', text: '2/3 + 1/4 ÷ 1/2 = 7/6' }, // 分数四则混合运算
  'math-g6-a-3-5': { type: 'fraction', whole: 3, part: 1 }, // 解决问题：已知几分之几求总量

  /* 第四单元 比 */
  'math-g6-a-4-1': { type: 'fraction', whole: 3, part: 2 }, // 比的意义：2 : 3
  'math-g6-a-4-2': { type: 'fraction', whole: 4, part: 2 }, // 比的基本性质：2 : 4 = 1 : 2
  'math-g6-a-4-3': { type: 'fraction', whole: 5, part: 3 }, // 比的应用：按 3 : 2 分配

  /* 第五单元 圆 */
  'math-g6-a-5-1': { type: 'shapes', shape: 'circle', r: 3 }, // 圆的认识：圆心 O、半径 r、直径 d
  'math-g6-a-5-2': { type: 'unroll', r: 3, formula: 'C = πd = 2πr = 2 × 3.14 × 3 = 18.84' }, // 圆的周长：圆拉直成线段，C≈3 个直径 + 0.14
  'math-g6-a-5-3': { type: 'shapes', shape: 'circle', r: 3, emphasis: 'area', formula: 'S = πr² = 3.14 × 3² = 28.26' }, // 圆的面积：强调面
  'math-g6-a-5-4': { type: 'fraction', whole: 4, part: 1 }, // 扇形：四分之一圆

  /* 第六单元 百分数（一） */
  'math-g6-a-6-1': { type: 'fraction', whole: 100, part: 25 }, // 百分数的意义：25%
  'math-g6-a-6-2': { type: 'fraction', whole: 100, part: 20 }, // 互化：20% = 1/5
  'math-g6-a-6-3': { type: 'fraction', whole: 100, part: 30 }, // 解决问题：求一个数的百分之几

  /* 第七单元 扇形统计图 */
  'math-g6-a-7-1': { type: 'chart', data: [40, 30, 20, 10], chartKind: 'pie' }, // 扇形统计图
  'math-g6-a-7-2': { type: 'chart', data: [45, 25, 30] }, // 选择合适的统计图

  /* 第八单元 数学广角——数与形 */
  'math-g6-a-8-1': { type: 'chart', data: [1, 3, 5, 7, 9] }, // 数与形：奇数序列 → 平方数

  /* ================= 六年级下册 ================= */

  /* 第一单元 负数 */
  'math-g6-b-1-1': { type: 'numberline', start: -5, end: 5, mark: -2 }, // 负数的认识
  'math-g6-b-1-2': { type: 'numberline', start: -5, end: 5, mark: -3 }, // 负数的大小比较

  /* 第二单元 百分数（二） */
  'math-g6-b-2-1': { type: 'fraction', whole: 100, part: 90 }, // 折扣：九折 = 90%
  'math-g6-b-2-2': { type: 'fraction', whole: 100, part: 20 }, // 成数：二成 = 20%
  'math-g6-b-2-3': { type: 'fraction', whole: 100, part: 3 }, // 税率：3%
  'math-g6-b-2-4': { type: 'fraction', whole: 100, part: 2 }, // 利率：2%

  /* 第三单元 圆柱与圆锥（以圆近似表达） */
  'math-g6-b-3-1': { type: 'shapes', shape: 'cylinder', r: 3, h: 5 }, // 圆柱的认识
  'math-g6-b-3-2': { type: 'shapes', shape: 'cylinder', r: 3, h: 5, formula: 'S表 = 2πr² + 2πrh' }, // 圆柱的表面积
  'math-g6-b-3-3': { type: 'shapes', shape: 'cylinder', r: 3, h: 5, formula: 'V = πr²h = 3.14×3²×5' }, // 圆柱的体积
  'math-g6-b-3-4': { type: 'shapes', shape: 'cone', r: 2, h: 5 }, // 圆锥的认识
  'math-g6-b-3-5': { type: 'shapes', shape: 'cone', r: 2, h: 5, formula: 'V = ⅓πr²h' }, // 圆锥的体积

  /* 第四单元 比例 */
  'math-g6-b-4-1': { type: 'fraction', whole: 3, part: 2 }, // 比例的意义和基本性质
  'math-g6-b-4-2': { type: 'fraction', whole: 4, part: 2 }, // 正比例和反比例
  'math-g6-b-4-3': { type: 'fraction', whole: 100, part: 1 }, // 比例尺：1 : 100
  'math-g6-b-4-4': { type: 'shapes', shape: 'rectangle', w: 4, h: 2 }, // 图形的放大与缩小（2 : 1）

  /* 第五单元 数学广角——鸽巢问题——无法表达，跳过 */
  /* 第六单元 整理和复习——无法表达，跳过 */

  /* ============ 上册 ============ */
  /* 单元2 位置与方向（二） */
  'math-g6-a-2-1': { type: 'direction', mode: 'compass', dir: '东北', formula: '东偏北 30° 方向' }, // 描述物体的位置
  'math-g6-a-2-2': { type: 'direction', mode: 'compass', dir: '北', formula: '北偏东 30°，距离 200 米' }, // 根据方向和距离确定位置
  'math-g6-a-2-3': { type: 'direction', mode: 'compass', dir: '东', formula: '路线：东北 300 米 → 正东 500 米' }, // 描述简单的路线图

  /* ============ 下册 ============ */
  /* 单元5 数学广角——鸽巢问题 */
  'math-g6-b-5-1': { type: 'pigeonhole', pigeons: 4, holes: 3, formula: '4 只鸽子进 3 个巢，至少一个巢有 2 只' }, // 鸽巢问题
  /* 单元6 整理和复习 */
  'math-g6-b-6-1': { type: 'vertical', a: 36, b: 25, op: '+', formula: '数与代数 · 综合复习' }, // 数与代数
  'math-g6-b-6-2': { type: 'shapes', shape: 'rectangle', w: 6, h: 4, formula: '图形与几何 · 综合复习' }, // 图形与几何
  'math-g6-b-6-3': { type: 'chart', data: [30, 25, 20, 15, 10], chartKind: 'pie', formula: '统计与概率 · 综合复习' }, // 统计与概率
  'math-g6-b-6-4': { type: 'text', emoji: '🧩', title: '综合与实践', text: '用数学解决生活中的问题' }, // 综合与实践
};
