import type { MathFigure } from '../skills';

/** 二年级数学（人教版）· 逐课时配图
 *  id 规则：math-g2-a-单元序号-课序号（上）/ math-g2-b-单元序号-课序号（下），按 mathCurriculum.ts 顺序从 1 起
 *  只收录能明确配图的课时：长度单位→numberline；加减乘除/混合/有余数除法→equation；
 *  乘法口诀→count 或 equation；认识时间→clock；其余（角、观察物体、搭配、数据、图形运动、克和千克、推理）跳过。
 */
export const FIG2: Record<string, MathFigure> = {
  /* ================= 上 ================= */
  /* —— 一、长度单位 —— */
  'math-g2-a-1-1': { type: 'numberline', start: 0, end: 8, mark: 4 }, // 认识厘米 用厘米量
  'math-g2-a-1-2': { type: 'numberline', start: 0, end: 10, mark: 5 }, // 认识米 用米量
  'math-g2-a-1-3': { type: 'numberline', start: 0, end: 6, mark: 3 }, // 认识线段

  /* —— 二、100 以内的加法和减法（二） —— */
  'math-g2-a-2-1': { type: 'vertical', a: 23, b: 15, op: '+' }, // 不进位加
  'math-g2-a-2-2': { type: 'vertical', a: 27, b: 35, op: '+' }, // 进位加
  'math-g2-a-2-3': { type: 'vertical', a: 58, b: 26, op: '-' }, // 不退位减
  'math-g2-a-2-4': { type: 'vertical', a: 52, b: 38, op: '-' }, // 退位减
  'math-g2-a-2-5': { type: 'vertical', a: 20, b: 30, op: '+' }, // 连加连减
  'math-g2-a-2-6': { type: 'vertical', a: 50, b: 25, op: '-' }, // 加减混合
  'math-g2-a-2-7': { type: 'vertical', a: 36, b: 25, op: '+' }, // 解决问题

  /* —— 四、表内乘法（一） —— */
  'math-g2-a-4-1': { type: 'equation', a: 3, b: 4, op: '×' }, // 乘法的初步认识
  'math-g2-a-4-2': { type: 'count', emoji: '🔴', count: 5 }, // 5 的乘法口诀
  'math-g2-a-4-3': { type: 'equation', a: 2, b: 4, op: '×' }, // 2、3、4 的乘法口诀
  'math-g2-a-4-4': { type: 'equation', a: 4, b: 3, op: '×' }, // 乘加乘减
  'math-g2-a-4-5': { type: 'count', emoji: '🔴', count: 6 }, // 6 的乘法口诀

  /* —— 六、表内乘法（二） —— */
  'math-g2-a-6-1': { type: 'count', emoji: '🔴', count: 7 }, // 7 的乘法口诀
  'math-g2-a-6-2': { type: 'count', emoji: '🔴', count: 8 }, // 8 的乘法口诀
  'math-g2-a-6-3': { type: 'count', emoji: '🔴', count: 9 }, // 9 的乘法口诀
  'math-g2-a-6-4': { type: 'equation', a: 8, b: 9, op: '×' }, // 解决问题

  /* —— 七、认识时间 —— */
  'math-g2-a-7-1': { type: 'clock', hour: 3, minute: 0 }, // 认识时和分
  'math-g2-a-7-2': { type: 'clock', hour: 7, minute: 45 }, // 认识几时几分

  /* ================= 下 ================= */
  /* —— 二、表内除法（一） —— */
  'math-g2-b-2-1': { type: 'equation', a: 12, b: 3, op: '÷' }, // 平均分
  'math-g2-b-2-2': { type: 'equation', a: 12, b: 4, op: '÷' }, // 除法
  'math-g2-b-2-3': { type: 'equation', a: 18, b: 3, op: '÷' }, // 用 2~6 的乘法口诀求商
  'math-g2-b-2-4': { type: 'equation', a: 20, b: 4, op: '÷' }, // 解决问题

  /* —— 四、表内除法（二） —— */
  'math-g2-b-4-1': { type: 'equation', a: 56, b: 8, op: '÷' }, // 用 7、8、9 的乘法口诀求商
  'math-g2-b-4-2': { type: 'equation', a: 63, b: 9, op: '÷' }, // 解决问题

  /* —— 五、混合运算 —— */
  'math-g2-b-5-1': { type: 'equation', a: 3, b: 5, op: '×' }, // 混合运算
  'math-g2-b-5-2': { type: 'equation', a: 15, b: 6, op: '+' }, // 解决问题

  /* —— 六、有余数的除法 —— */
  'math-g2-b-6-1': { type: 'equation', a: 14, b: 4, op: '÷' }, // 有余数除法的意义
  'math-g2-b-6-2': { type: 'equation', a: 23, b: 5, op: '÷' }, // 有余数除法的计算
  'math-g2-b-6-3': { type: 'equation', a: 26, b: 6, op: '÷' }, // 解决问题

  /* —— 七、万以内数的认识 —— */
  'math-g2-b-7-1': { type: 'numberline', start: 0, end: 1000, mark: 500 }, // 1000 以内数的认识
  'math-g2-b-7-2': { type: 'numberline', start: 0, end: 10000, mark: 5000 }, // 10000 以内数的认识
  'math-g2-b-7-3': { type: 'vertical', a: 800, b: 300, op: '-' }, // 整百整千数加减法

  /* ============ 上册 ============ */
  /* 单元3 角的初步认识 */
  'math-g2-a-3-1': { type: 'angle', angleDeg: 45 }, // 角的初步认识
  'math-g2-a-3-2': { type: 'angle', rightAngle: true }, // 直角的初步认识
  /* 单元5 观察物体（一） */
  'math-g2-a-5-1': { type: 'views' }, // 观察物体
  /* 单元8 数学广角——搭配（一） */
  'math-g2-a-8-1': { type: 'combo', rows: 2, cols: 3, rowLabel: '上衣', colLabel: '裤子' }, // 搭配（一）

  /* ============ 下册 ============ */
  /* 单元1 数据收集整理 */
  'math-g2-b-1-1': { type: 'chart', data: [8, 5, 7, 3] }, // 数据的收集整理
  /* 单元3 图形的运动（一） */
  'math-g2-b-3-1': { type: 'motion', motionKind: 'flip', shape: 'triangle' }, // 轴对称图形
  'math-g2-b-3-2': { type: 'motion', motionKind: 'slide', shape: 'rectangle' }, // 平移
  'math-g2-b-3-3': { type: 'motion', motionKind: 'turn', shape: 'triangle' }, // 旋转
  /* 单元8 克和千克 */
  'math-g2-b-8-1': { type: 'weight', left: 100, right: 100, leftEmoji: '🍎', rightEmoji: '🧱', unit: '克', formula: '1 个苹果约 100 克' }, // 认识克
  'math-g2-b-8-2': { type: 'weight', left: 1, right: 1, leftEmoji: '🧺', rightEmoji: '🐘', unit: '千克', formula: '1 千克 = 1000 克' }, // 认识千克
  /* 单元9 数学广角——推理 */
  'math-g2-b-9-1': { type: 'text', emoji: '🤔', title: '推理', text: '甲比乙高，乙比丙高，谁最高？' }, // 推理
};
