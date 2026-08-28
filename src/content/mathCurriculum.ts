import type { Grade } from '../types';

/* =====================================================================
   人教版小学数学 · 逐课目录（单元 → 课时）
   依据人教版（人民教育出版社）现行教材目录
   ===================================================================== */

export interface RawUnit {
  unit: { zh: string; en: string };
  lessons: { zh: string; en: string }[];
}

export const MATH_UNITS: Record<Grade, { 上: RawUnit[]; 下: RawUnit[] }> = {
  /* ---------- 一年级 ---------- */
  g1: {
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
  },
  /* ---------- 二年级 ---------- */
  g2: {
    上: [
      { unit: { zh: '长度单位', en: 'Units of Length' }, lessons: [{ zh: '认识厘米 用厘米量', en: 'Centimeters' }, { zh: '认识米 用米量', en: 'Meters' }, { zh: '认识线段', en: 'Line Segments' }] },
      { unit: { zh: '100 以内的加法和减法（二）', en: 'Add & Subtract to 100 (2)' }, lessons: [{ zh: '不进位加', en: 'Add without Carry' }, { zh: '进位加', en: 'Add with Carry' }, { zh: '不退位减', en: 'Subtract without Borrow' }, { zh: '退位减', en: 'Subtract with Borrow' }, { zh: '连加连减', en: 'Add & Subtract in a Row' }, { zh: '加减混合', en: 'Mixed Operations' }, { zh: '解决问题', en: 'Problem Solving' }] },
      { unit: { zh: '角的初步认识', en: 'Intro to Angles' }, lessons: [{ zh: '角的初步认识', en: 'Angles' }, { zh: '直角的初步认识', en: 'Right Angles' }] },
      { unit: { zh: '表内乘法（一）', en: 'Multiplication Tables (1)' }, lessons: [{ zh: '乘法的初步认识', en: 'Multiplication' }, { zh: '5 的乘法口诀', en: 'Table of 5' }, { zh: '2、3、4 的乘法口诀', en: 'Tables of 2,3,4' }, { zh: '乘加乘减', en: 'Mixed Multiply' }, { zh: '6 的乘法口诀', en: 'Table of 6' }] },
      { unit: { zh: '观察物体（一）', en: 'Observing Objects (1)' }, lessons: [{ zh: '观察物体', en: 'Observing' }] },
      { unit: { zh: '表内乘法（二）', en: 'Multiplication Tables (2)' }, lessons: [{ zh: '7 的乘法口诀', en: 'Table of 7' }, { zh: '8 的乘法口诀', en: 'Table of 8' }, { zh: '9 的乘法口诀', en: 'Table of 9' }, { zh: '解决问题', en: 'Problem Solving' }] },
      { unit: { zh: '认识时间', en: 'Telling Time' }, lessons: [{ zh: '认识时和分', en: 'Hours & Minutes' }, { zh: '认识几时几分', en: 'Reading the Clock' }] },
      { unit: { zh: '数学广角——搭配（一）', en: 'Math Corner: Combinations (1)' }, lessons: [{ zh: '搭配（一）', en: 'Combinations (1)' }] },
    ],
    下: [
      { unit: { zh: '数据收集整理', en: 'Data Collection' }, lessons: [{ zh: '数据的收集整理', en: 'Collecting Data' }] },
      { unit: { zh: '表内除法（一）', en: 'Division Tables (1)' }, lessons: [{ zh: '平均分', en: 'Equal Sharing' }, { zh: '除法', en: 'Division' }, { zh: '用 2~6 的乘法口诀求商', en: 'Find Quotients' }, { zh: '解决问题', en: 'Problem Solving' }] },
      { unit: { zh: '图形的运动（一）', en: 'Motion of Shapes (1)' }, lessons: [{ zh: '轴对称图形', en: 'Symmetry' }, { zh: '平移', en: 'Translation' }, { zh: '旋转', en: 'Rotation' }] },
      { unit: { zh: '表内除法（二）', en: 'Division Tables (2)' }, lessons: [{ zh: '用 7、8、9 的乘法口诀求商', en: 'Find Quotients 7-9' }, { zh: '解决问题', en: 'Problem Solving' }] },
      { unit: { zh: '混合运算', en: 'Mixed Operations' }, lessons: [{ zh: '混合运算', en: 'Mixed Operations' }, { zh: '解决问题', en: 'Problem Solving' }] },
      { unit: { zh: '有余数的除法', en: 'Division with Remainder' }, lessons: [{ zh: '有余数除法的意义', en: 'Remainder' }, { zh: '有余数除法的计算', en: 'Calculating with Remainder' }, { zh: '解决问题', en: 'Problem Solving' }] },
      { unit: { zh: '万以内数的认识', en: 'Numbers to 10,000' }, lessons: [{ zh: '1000 以内数的认识', en: 'Numbers to 1000' }, { zh: '10000 以内数的认识', en: 'Numbers to 10000' }, { zh: '整百整千数加减法', en: 'Hundreds & Thousands' }] },
      { unit: { zh: '克和千克', en: 'Grams & Kilograms' }, lessons: [{ zh: '认识克', en: 'Grams' }, { zh: '认识千克', en: 'Kilograms' }] },
      { unit: { zh: '数学广角——推理', en: 'Math Corner: Reasoning' }, lessons: [{ zh: '推理', en: 'Reasoning' }] },
    ],
  },
  /* ---------- 三年级 ---------- */
  g3: {
    上: [
      { unit: { zh: '时、分、秒', en: 'Hours, Minutes, Seconds' }, lessons: [{ zh: '秒的认识', en: 'Seconds' }, { zh: '时间的计算', en: 'Time Calculation' }] },
      { unit: { zh: '万以内的加法和减法（一）', en: 'Add & Subtract (1)' }, lessons: [{ zh: '两位数加两位数口算', en: 'Mental Add' }, { zh: '两位数减两位数口算', en: 'Mental Subtract' }, { zh: '几百几十加减法', en: 'Hundreds ± Tens' }, { zh: '解决问题', en: 'Problem Solving' }] },
      { unit: { zh: '测量', en: 'Measurement' }, lessons: [{ zh: '毫米、分米的认识', en: 'mm & dm' }, { zh: '千米的认识', en: 'Kilometers' }, { zh: '吨的认识', en: 'Tons' }] },
      { unit: { zh: '万以内的加法和减法（二）', en: 'Add & Subtract (2)' }, lessons: [{ zh: '三位数加三位数', en: 'Three-Digit Add' }, { zh: '三位数减三位数', en: 'Three-Digit Subtract' }, { zh: '验算', en: 'Checking' }] },
      { unit: { zh: '倍的认识', en: 'Multiples' }, lessons: [{ zh: '倍的认识', en: 'Multiples' }] },
      { unit: { zh: '多位数乘一位数', en: 'Multiply by One Digit' }, lessons: [{ zh: '口算乘法', en: 'Mental Multiply' }, { zh: '笔算乘法', en: 'Written Multiply' }, { zh: '解决问题', en: 'Problem Solving' }] },
      { unit: { zh: '长方形和正方形', en: 'Rectangles & Squares' }, lessons: [{ zh: '四边形', en: 'Quadrilaterals' }, { zh: '周长', en: 'Perimeter' }, { zh: '长方形和正方形的周长', en: 'Perimeter of Rectangles' }] },
      { unit: { zh: '分数的初步认识', en: 'Intro to Fractions' }, lessons: [{ zh: '分数的初步认识', en: 'Fractions' }, { zh: '比较大小', en: 'Comparing Fractions' }, { zh: '同分母分数加减法', en: 'Add & Subtract Fractions' }] },
      { unit: { zh: '数学广角——集合', en: 'Math Corner: Sets' }, lessons: [{ zh: '集合', en: 'Sets' }] },
    ],
    下: [
      { unit: { zh: '位置与方向（一）', en: 'Position & Direction (1)' }, lessons: [{ zh: '认识东南西北', en: 'Four Directions' }, { zh: '认识东北、东南、西北、西南', en: 'Four More Directions' }] },
      { unit: { zh: '除数是一位数的除法', en: 'Division by One Digit' }, lessons: [{ zh: '口算除法', en: 'Mental Division' }, { zh: '笔算除法', en: 'Written Division' }, { zh: '商中间或末尾有 0 的除法', en: 'Quotients with Zero' }, { zh: '解决问题', en: 'Problem Solving' }] },
      { unit: { zh: '复式统计表', en: 'Compound Tables' }, lessons: [{ zh: '复式统计表', en: 'Compound Tables' }] },
      { unit: { zh: '两位数乘两位数', en: 'Multiply by Two Digits' }, lessons: [{ zh: '口算乘法', en: 'Mental Multiply' }, { zh: '笔算乘法', en: 'Written Multiply' }, { zh: '解决问题', en: 'Problem Solving' }] },
      { unit: { zh: '面积', en: 'Area' }, lessons: [{ zh: '面积和面积单位', en: 'Area Units' }, { zh: '长方形、正方形面积计算', en: 'Area of Rectangles' }, { zh: '面积单位间的进率', en: 'Area Unit Conversion' }] },
      { unit: { zh: '年、月、日', en: 'Year, Month, Day' }, lessons: [{ zh: '年、月、日', en: 'Calendar' }, { zh: '24 时计时法', en: '24-Hour Clock' }] },
      { unit: { zh: '小数的初步认识', en: 'Intro to Decimals' }, lessons: [{ zh: '认识小数', en: 'Decimals' }, { zh: '简单的小数加减法', en: 'Decimal Add & Subtract' }] },
      { unit: { zh: '数学广角——搭配（二）', en: 'Math Corner: Combinations (2)' }, lessons: [{ zh: '搭配（二）', en: 'Combinations (2)' }] },
    ],
  },
  /* ---------- 四年级 ---------- */
  g4: {
    上: [
      { unit: { zh: '大数的认识', en: 'Large Numbers' }, lessons: [{ zh: '亿以内数的认识', en: 'Numbers within Yi' }, { zh: '亿以内数的读法和写法', en: 'Reading & Writing' }, { zh: '比较大小 数的改写', en: 'Compare & Rewrite' }, { zh: '亿以上数的认识', en: 'Numbers above Yi' }, { zh: '计算工具的认识', en: 'Calculating Tools' }] },
      { unit: { zh: '公顷和平方千米', en: 'Hectare & Square Kilometer' }, lessons: [{ zh: '公顷', en: 'Hectare' }, { zh: '平方千米', en: 'Square Kilometer' }] },
      { unit: { zh: '角的度量', en: 'Measuring Angles' }, lessons: [{ zh: '线段、直线、射线', en: 'Lines & Rays' }, { zh: '角的度量', en: 'Measuring Angles' }, { zh: '角的分类', en: 'Kinds of Angles' }, { zh: '画角', en: 'Drawing Angles' }] },
      { unit: { zh: '三位数乘两位数', en: 'Multiply by Multi-digits' }, lessons: [{ zh: '三位数乘两位数笔算', en: 'Written Multiply' }, { zh: '因数中间或末尾有 0 的乘法', en: 'Multiply with Zero' }, { zh: '积的变化规律', en: 'Product Patterns' }, { zh: '解决问题', en: 'Problem Solving' }] },
      { unit: { zh: '平行四边形和梯形', en: 'Quadrilaterals & Trapezoids' }, lessons: [{ zh: '垂直与平行', en: 'Perpendicular & Parallel' }, { zh: '平行四边形', en: 'Parallelogram' }, { zh: '梯形', en: 'Trapezoid' }] },
      { unit: { zh: '除数是两位数的除法', en: 'Division by Two Digits' }, lessons: [{ zh: '口算除法', en: 'Mental Division' }, { zh: '笔算除法', en: 'Written Division' }, { zh: '商的变化规律', en: 'Quotient Patterns' }] },
      { unit: { zh: '条形统计图', en: 'Bar Charts' }, lessons: [{ zh: '条形统计图', en: 'Bar Charts' }] },
      { unit: { zh: '数学广角——优化', en: 'Math Corner: Optimization' }, lessons: [{ zh: '沏茶问题', en: 'Tea Making' }, { zh: '烙饼问题', en: 'Pancakes' }, { zh: '田忌赛马', en: 'Horse Racing' }] },
    ],
    下: [
      { unit: { zh: '四则运算', en: 'Four Operations' }, lessons: [{ zh: '加减法的意义和各部分间的关系', en: 'Add & Subtract Meaning' }, { zh: '乘除法的意义和各部分间的关系', en: 'Multiply & Divide Meaning' }, { zh: '括号', en: 'Brackets' }, { zh: '解决问题', en: 'Problem Solving' }] },
      { unit: { zh: '观察物体（二）', en: 'Observing Objects (2)' }, lessons: [{ zh: '观察物体', en: 'Observing' }] },
      { unit: { zh: '运算定律', en: 'Laws of Operations' }, lessons: [{ zh: '加法运算定律', en: 'Addition Laws' }, { zh: '乘法运算定律', en: 'Multiplication Laws' }, { zh: '简便计算', en: 'Shortcut Calculation' }] },
      { unit: { zh: '小数的意义和性质', en: 'Decimals: Meaning & Properties' }, lessons: [{ zh: '小数的意义', en: 'Meaning of Decimals' }, { zh: '小数的性质', en: 'Properties of Decimals' }, { zh: '小数的大小比较', en: 'Comparing Decimals' }, { zh: '小数点移动引起小数大小的变化', en: 'Decimal Point Moves' }, { zh: '小数与单位换算', en: 'Unit Conversion' }, { zh: '小数的近似数', en: 'Approximation' }] },
      { unit: { zh: '三角形', en: 'Triangles' }, lessons: [{ zh: '三角形的特性', en: 'Properties of Triangles' }, { zh: '三角形三边关系', en: 'Triangle Sides' }, { zh: '三角形的分类', en: 'Kinds of Triangles' }, { zh: '三角形的内角和', en: 'Angle Sum' }] },
      { unit: { zh: '小数的加法和减法', en: 'Decimal Add & Subtract' }, lessons: [{ zh: '小数加减法', en: 'Decimal Add & Subtract' }, { zh: '小数加减混合运算', en: 'Mixed Decimal Operations' }, { zh: '整数加法运算定律推广到小数', en: 'Laws to Decimals' }] },
      { unit: { zh: '图形的运动（二）', en: 'Motion of Shapes (2)' }, lessons: [{ zh: '轴对称', en: 'Symmetry' }, { zh: '平移', en: 'Translation' }] },
      { unit: { zh: '平均数与条形统计图', en: 'Average & Bar Charts' }, lessons: [{ zh: '平均数', en: 'Average' }, { zh: '复式条形统计图', en: 'Compound Bar Charts' }] },
      { unit: { zh: '数学广角——鸡兔同笼', en: 'Math Corner: Chickens & Rabbits' }, lessons: [{ zh: '鸡兔同笼', en: 'Chickens & Rabbits' }] },
    ],
  },
  /* ---------- 五年级 ---------- */
  g5: {
    上: [
      { unit: { zh: '小数乘法', en: 'Multiplying Decimals' }, lessons: [{ zh: '小数乘整数', en: 'Decimal × Integer' }, { zh: '小数乘小数', en: 'Decimal × Decimal' }, { zh: '积的近似数', en: 'Rounding Products' }, { zh: '整数乘法运算定律推广到小数', en: 'Laws to Decimals' }, { zh: '解决问题', en: 'Problem Solving' }] },
      { unit: { zh: '位置', en: 'Position' }, lessons: [{ zh: '用数对确定位置', en: 'Coordinates' }] },
      { unit: { zh: '小数除法', en: 'Dividing Decimals' }, lessons: [{ zh: '除数是整数的小数除法', en: 'Divide by Integer' }, { zh: '除数是小数的小数除法', en: 'Divide by Decimal' }, { zh: '商的近似数', en: 'Rounding Quotients' }, { zh: '循环小数', en: 'Repeating Decimals' }, { zh: '用计算器探索规律', en: 'Explore with Calculator' }, { zh: '解决问题', en: 'Problem Solving' }] },
      { unit: { zh: '可能性', en: 'Probability' }, lessons: [{ zh: '可能性', en: 'Probability' }, { zh: '可能性的大小', en: 'Probability Size' }] },
      { unit: { zh: '简易方程', en: 'Simple Equations' }, lessons: [{ zh: '用字母表示数', en: 'Letters for Numbers' }, { zh: '方程的意义', en: 'Meaning of Equations' }, { zh: '解方程', en: 'Solving Equations' }, { zh: '实际问题与方程', en: 'Equations in Life' }] },
      { unit: { zh: '多边形的面积', en: 'Area of Polygons' }, lessons: [{ zh: '平行四边形的面积', en: 'Area of Parallelogram' }, { zh: '三角形的面积', en: 'Area of Triangle' }, { zh: '梯形的面积', en: 'Area of Trapezoid' }, { zh: '组合图形的面积', en: 'Composite Area' }, { zh: '解决问题', en: 'Problem Solving' }] },
      { unit: { zh: '数学广角——植树问题', en: 'Math Corner: Planting Trees' }, lessons: [{ zh: '植树问题', en: 'Planting Trees' }] },
    ],
    下: [
      { unit: { zh: '观察物体（三）', en: 'Observing Objects (3)' }, lessons: [{ zh: '观察物体', en: 'Observing' }] },
      { unit: { zh: '因数与倍数', en: 'Factors & Multiples' }, lessons: [{ zh: '因数和倍数', en: 'Factors & Multiples' }, { zh: '2、5、3 的倍数的特征', en: 'Divisibility Rules' }, { zh: '质数和合数', en: 'Prime & Composite' }] },
      { unit: { zh: '长方体和正方体', en: 'Cuboids & Cubes' }, lessons: [{ zh: '长方体和正方体的认识', en: 'Cuboids & Cubes' }, { zh: '表面积', en: 'Surface Area' }, { zh: '体积', en: 'Volume' }, { zh: '体积单位间的进率', en: 'Volume Units' }, { zh: '容积', en: 'Capacity' }] },
      { unit: { zh: '分数的意义和性质', en: 'Fractions: Meaning & Properties' }, lessons: [{ zh: '分数的意义', en: 'Meaning of Fractions' }, { zh: '真分数和假分数', en: 'Proper & Improper' }, { zh: '分数的基本性质', en: 'Basic Property' }, { zh: '约分', en: 'Simplifying' }, { zh: '通分', en: 'Common Denominator' }, { zh: '分数和小数的互化', en: 'Fraction & Decimal' }] },
      { unit: { zh: '图形的运动（三）', en: 'Motion of Shapes (3)' }, lessons: [{ zh: '旋转', en: 'Rotation' }] },
      { unit: { zh: '分数的加法和减法', en: 'Add & Subtract Fractions' }, lessons: [{ zh: '同分母分数加减法', en: 'Same Denominator' }, { zh: '异分母分数加减法', en: 'Different Denominators' }, { zh: '分数加减混合运算', en: 'Mixed Operations' }] },
      { unit: { zh: '折线统计图', en: 'Line Charts' }, lessons: [{ zh: '折线统计图', en: 'Line Charts' }] },
      { unit: { zh: '数学广角——找次品', en: 'Math Corner: Find the Odd One' }, lessons: [{ zh: '找次品', en: 'Find the Odd One' }] },
    ],
  },
  /* ---------- 六年级 ---------- */
  g6: {
    上: [
      { unit: { zh: '分数乘法', en: 'Multiplying Fractions' }, lessons: [{ zh: '分数乘整数', en: 'Fraction × Integer' }, { zh: '分数乘分数', en: 'Fraction × Fraction' }, { zh: '小数乘分数', en: 'Decimal × Fraction' }, { zh: '分数乘法运算定律', en: 'Laws of Multiplication' }, { zh: '解决问题', en: 'Problem Solving' }] },
      { unit: { zh: '位置与方向（二）', en: 'Position & Direction (2)' }, lessons: [{ zh: '描述物体的位置', en: 'Describing Position' }, { zh: '根据方向和距离确定位置', en: 'Locating by Direction' }, { zh: '描述简单的路线图', en: 'Describing Routes' }] },
      { unit: { zh: '分数除法', en: 'Dividing Fractions' }, lessons: [{ zh: '倒数的认识', en: 'Reciprocals' }, { zh: '分数除以整数', en: 'Fraction ÷ Integer' }, { zh: '一个数除以分数', en: 'Number ÷ Fraction' }, { zh: '分数四则混合运算', en: 'Mixed Operations' }, { zh: '解决问题', en: 'Problem Solving' }] },
      { unit: { zh: '比', en: 'Ratio' }, lessons: [{ zh: '比的意义', en: 'Meaning of Ratio' }, { zh: '比的基本性质', en: 'Basic Property' }, { zh: '比的应用', en: 'Using Ratio' }] },
      { unit: { zh: '圆', en: 'Circles' }, lessons: [{ zh: '圆的认识', en: 'Circles' }, { zh: '圆的周长', en: 'Circumference' }, { zh: '圆的面积', en: 'Area of Circle' }, { zh: '扇形', en: 'Sectors' }] },
      { unit: { zh: '百分数（一）', en: 'Percentages (1)' }, lessons: [{ zh: '百分数的意义和写法', en: 'Percentages' }, { zh: '百分数与分数、小数的互化', en: 'Converting' }, { zh: '解决问题', en: 'Problem Solving' }] },
      { unit: { zh: '扇形统计图', en: 'Pie Charts' }, lessons: [{ zh: '扇形统计图', en: 'Pie Charts' }, { zh: '选择合适的统计图', en: 'Choosing Charts' }] },
      { unit: { zh: '数学广角——数与形', en: 'Math Corner: Number & Shape' }, lessons: [{ zh: '数与形', en: 'Number & Shape' }] },
    ],
    下: [
      { unit: { zh: '负数', en: 'Negative Numbers' }, lessons: [{ zh: '负数的认识', en: 'Negative Numbers' }, { zh: '负数的大小比较', en: 'Comparing Negatives' }] },
      { unit: { zh: '百分数（二）', en: 'Percentages (2)' }, lessons: [{ zh: '折扣', en: 'Discounts' }, { zh: '成数', en: 'Chengshu' }, { zh: '税率', en: 'Tax' }, { zh: '利率', en: 'Interest' }] },
      { unit: { zh: '圆柱与圆锥', en: 'Cylinders & Cones' }, lessons: [{ zh: '圆柱的认识', en: 'Cylinders' }, { zh: '圆柱的表面积', en: 'Surface of Cylinder' }, { zh: '圆柱的体积', en: 'Volume of Cylinder' }, { zh: '圆锥的认识', en: 'Cones' }, { zh: '圆锥的体积', en: 'Volume of Cone' }] },
      { unit: { zh: '比例', en: 'Proportion' }, lessons: [{ zh: '比例的意义和基本性质', en: 'Proportion' }, { zh: '正比例和反比例', en: 'Direct & Inverse' }, { zh: '比例尺', en: 'Scale' }, { zh: '图形的放大与缩小', en: 'Enlarge & Shrink' }] },
      { unit: { zh: '数学广角——鸽巢问题', en: 'Math Corner: Pigeonhole' }, lessons: [{ zh: '鸽巢问题', en: 'Pigeonhole' }] },
      { unit: { zh: '整理和复习', en: 'Review' }, lessons: [{ zh: '数与代数', en: 'Number & Algebra' }, { zh: '图形与几何', en: 'Shapes & Geometry' }, { zh: '统计与概率', en: 'Statistics' }, { zh: '综合与实践', en: 'Practice' }] },
    ],
  },
};
