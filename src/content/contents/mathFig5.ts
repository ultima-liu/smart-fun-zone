import type { MathFigure } from '../skills';

/**
 * 五年级数学 · 配图（人教版，由子代理录入）
 * id 规则：math-g5-a-单元-课（上）/ math-g5-b-单元-课（下）
 * 配图策略：
 *   小数乘法 / 小数除法 / 循环小数 / 简易方程 / 分数加减 → equation（整数代示，渲染器按整数圆点图输出）
 *   多边形的面积（平行四边形→rectangle 近似 底×高；三角形→triangle）→ shapes
 *   长方体和正方体（认识/表面积/体积）→ shapes（square/rectangle 近似）
 *   分数的意义 / 真分数假分数 / 基本性质 / 约分 / 通分 / 互化 → fraction（圆饼等分）
 *   折线统计图 → chart
 *   无法明确配图（数对、可能性、观察物体、因数倍数、旋转、植树、找次品、计算器探索规律、组合图形、梯形、进率、容积）→ 跳过
 */
export const FIG5: Record<string, MathFigure> = {
  /* ==================== 上 ==================== */

  /* —— 单元 1 小数乘法 —— */
  'math-g5-a-1-1': { type: 'text', emoji: '🧮', title: '小数乘整数', text: '0.5 × 3 = 1.5' }, // 小数乘整数
  'math-g5-a-1-2': { type: 'text', emoji: '🧮', title: '小数乘小数', text: '0.6 × 0.5 = 0.3' }, // 小数乘小数
  'math-g5-a-1-3': { type: 'text', emoji: '🎯', title: '积的近似数', text: '0.8 × 0.9 = 0.72 ≈ 0.7' }, // 积的近似数
  'math-g5-a-1-4': { type: 'text', emoji: '🧮', title: '运算定律推广', text: '0.25 × 4.78 × 4 = 4.78' }, // 整数乘法运算定律推广到小数
  'math-g5-a-1-5': { type: 'text', emoji: '🍎', title: '解决问题', text: '4.5 × 3 = 13.5（元）' }, // 解决问题

  /* —— 单元 3 小数除法 —— */
  'math-g5-a-3-1': { type: 'text', emoji: '🧮', title: '除数是整数的小数除法', text: '9.6 ÷ 4 = 2.4' }, // 除数是整数的小数除法
  'math-g5-a-3-2': { type: 'text', emoji: '🧮', title: '除数是小数的小数除法', text: '7.65 ÷ 0.85 = 9' }, // 除数是小数的小数除法
  'math-g5-a-3-3': { type: 'text', emoji: '🎯', title: '商的近似数', text: '19.4 ÷ 12 ≈ 1.62' }, // 商的近似数
  'math-g5-a-3-4': { type: 'text', emoji: '🔁', title: '循环小数', text: '5.333… 的循环节是 3' }, // 循环小数
  'math-g5-a-3-6': { type: 'text', emoji: '🥚', title: '解决问题', text: '25 ÷ 6 = 4 盒余 1，需 5 盒' }, // 解决问题

  /* —— 单元 5 简易方程 —— */
  'math-g5-a-5-2': { type: 'text', emoji: '📐', title: '方程的意义', text: 'x + 5 = 12 是方程' }, // 方程的意义
  'math-g5-a-5-3': { type: 'text', emoji: '📐', title: '解方程', text: 'x + 3 = 9，x = 6' }, // 解方程
  'math-g5-a-5-4': { type: 'text', emoji: '📐', title: '实际问题与方程', text: 'x + 24 = 36，x = 12' }, // 实际问题与方程

  /* —— 单元 6 多边形的面积 —— */
  'math-g5-a-6-1': { type: 'shapes', shape: 'parallelogram', w: 10, h: 6, formula: 'S = 底 × 高' }, // 平行四边形的面积
  'math-g5-a-6-2': { type: 'shapes', shape: 'triangle', w: 100, h: 80 }, // 三角形的面积（底×高÷2）
  'math-g5-a-6-3': { type: 'shapes', shape: 'trapezoid', ta: 4, tb: 6, h: 4, formula: 'S = (上底+下底)×高÷2 = (4+6)×4÷2 = 20' }, // 梯形的面积

  /* ==================== 下 ==================== */

  /* —— 单元 3 长方体和正方体 —— */
  'math-g5-b-3-1': { type: 'shapeSet', shapes: ['cuboid', 'cube'] }, // 长方体和正方体的认识
  'math-g5-b-3-2': { type: 'shapes', shape: 'cuboid', w: 6, h: 4, d: 3, formula: 'S = 2(长×宽+长×高+宽×高)' }, // 表面积
  'math-g5-b-3-3': { type: 'shapes', shape: 'cuboid', w: 6, h: 4, d: 3, formula: 'V = 长×宽×高 = 6×3×4 = 72' }, // 体积

  /* —— 单元 4 分数的意义和性质 —— */
  'math-g5-b-4-1': { type: 'fraction', whole: 5, part: 2 }, // 分数的意义（2/5）
  'math-g5-b-4-2': { type: 'fraction', whole: 6, part: 5 }, // 真分数和假分数（5/6）
  'math-g5-b-4-3': { type: 'fraction', whole: 6, part: 4 }, // 分数的基本性质（4/6=2/3）
  'math-g5-b-4-4': { type: 'fraction', whole: 8, part: 4 }, // 约分（4/8=1/2）
  'math-g5-b-4-5': { type: 'fraction', whole: 6, part: 2 }, // 通分（2/6=1/3）
  'math-g5-b-4-6': { type: 'fraction', whole: 4, part: 1 }, // 分数和小数的互化（1/4=0.25）

  /* —— 单元 6 分数的加法和减法 —— */
  'math-g5-b-6-1': { type: 'text', emoji: '🍰', title: '同分母分数加减', text: '2/5 + 1/5 = 3/5' }, // 同分母分数加减法
  'math-g5-b-6-2': { type: 'text', emoji: '🍰', title: '异分母分数加减', text: '1/2 + 1/3 = 5/6' }, // 异分母分数加减法
  'math-g5-b-6-3': { type: 'text', emoji: '🍰', title: '分数加减混合', text: '1/2 + 1/4 + 3/4 = 3/2' }, // 分数加减混合运算

  /* —— 单元 7 折线统计图 —— */
  'math-g5-b-7-1': { type: 'chart', data: [3, 5, 2, 6, 4], chartKind: 'line' }, // 折线统计图

  /* ============ 上册 ============ */
  /* 单元2 位置 */
  'math-g5-a-2-1': { type: 'grid', gridKind: 'coord', rows: 5, cols: 6, cx: 3, cy: 2, formula: '数对（3，2）= 第 3 列第 2 行' }, // 用数对确定位置
  /* 单元3 小数除法 */
  'math-g5-a-3-5': { type: 'text', emoji: '🧮', title: '用计算器探索规律', text: '1 ÷ 7 = 0.142857…', formula: '商的小数部分循环出现' }, // 用计算器探索规律
  /* 单元4 可能性 */
  'math-g5-a-4-1': { type: 'fraction', whole: 5, part: 2, formula: '摸到红球的可能性 = 2/5' }, // 可能性
  'math-g5-a-4-2': { type: 'fraction', whole: 4, part: 3, formula: '3/4 比 1/4 的可能性大' }, // 可能性的大小
  /* 单元5 简易方程 */
  'math-g5-a-5-1': { type: 'text', emoji: '📐', title: '用字母表示数', text: '摆 1 个三角形用 3 根小棒', formula: '摆 a 个用 3a 根' }, // 用字母表示数
  /* 单元6 多边形的面积 */
  'math-g5-a-6-4': { type: 'shapes', shape: 'rectangle', w: 8, h: 4, formula: '组合图形面积 = 各分块面积之和' }, // 组合图形的面积
  'math-g5-a-6-5': { type: 'shapes', shape: 'triangle', w: 10, h: 8, formula: 'S = 底 × 高 ÷ 2' }, // 解决问题
  /* 单元7 数学广角——植树问题 */
  'math-g5-a-7-1': { type: 'plant', length: 100, interval: 5, formula: '100 ÷ 5 + 1 = 21（棵）' }, // 植树问题

  /* ============ 下册 ============ */
  /* 单元1 观察物体（三） */
  'math-g5-b-1-1': { type: 'views' }, // 观察物体
  /* 单元2 因数与倍数 */
  'math-g5-b-2-1': { type: 'grid', gridKind: 'factors', n: 12, factorA: 3, factorB: 4, formula: '12 = 3 × 4，3 和 4 是 12 的因数' }, // 因数和倍数
  'math-g5-b-2-2': { type: 'grid', gridKind: 'multiples', n: 30, of: 2, formula: '2 的倍数个位是 0、2、4、6、8' }, // 2、5、3 的倍数的特征
  'math-g5-b-2-3': { type: 'grid', gridKind: 'factors', n: 7, factorA: 1, factorB: 7, formula: '7 只有 1×7，所以是质数' }, // 质数和合数
  /* 单元3 长方体和正方体 */
  'math-g5-b-3-4': { type: 'shapes', shape: 'cuboid', w: 10, h: 10, d: 10, formula: '1 立方米 = 1000 立方分米' }, // 体积单位间的进率
  'math-g5-b-3-5': { type: 'shapes', shape: 'cuboid', w: 5, h: 4, d: 3, formula: '1 升 = 1000 毫升' }, // 容积
  /* 单元5 图形的运动（三） */
  'math-g5-b-5-1': { type: 'motion', motionKind: 'turn', shape: 'rectangle' }, // 旋转
  /* 单元8 数学广角——找次品 */
  'math-g5-b-8-1': { type: 'weight', left: 1, right: 1, leftEmoji: '🔴', rightEmoji: '🔵', unit: '个', formula: '3 个零件，称 1 次找出较轻的次品' }, // 找次品
};
