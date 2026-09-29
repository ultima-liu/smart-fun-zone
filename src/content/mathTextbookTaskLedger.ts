import type { MathCoverageStatus } from './mathTextbookCoverage';

/**
 * 教材任务级台账：不同于页级归属表，这里的一行就是教材中的一个可观察动作。
 * id 中的页码与序号固定，后续实现只能更新状态、组件和验收，不能重排或合并条目。
 */
export type MathTextbookTaskLedgerEntry = {
  id: string;
  page: number;
  ownerLessonId: string;
  task: string;
  status: MathCoverageStatus;
  acceptance: string;
};

const L = (page: number, ownerLessonId: string, status: MathCoverageStatus, acceptance: string, ...tasks: string[]): MathTextbookTaskLedgerEntry[] =>
  tasks.map((task, index) => ({ id: `MATH-G1-P${String(page).padStart(3, '0')}-${String(index + 1).padStart(2, '0')}`, page, ownerLessonId, task, status, acceptance }));

export const MATH_G1_UPPER_TASK_LEDGER: MathTextbookTaskLedgerEntry[] = [
  ...L(1, 'campus', 'implemented', 'e2e: campus entry', '数学游戏单元主题观察：说出校园中可能找到的数、形状或位置。'),
  ...L(2, 'campus', 'implemented', 'e2e: campus scene', '观察校园全景，提出一个与数量、形状或位置有关的问题。'),
  ...L(3, 'campus', 'implemented', 'e2e: campus missions', '数国旗上的 5 颗星', '辨认长方形窗户', '从底层数 4 层并定位第 2 层教室。'),
  ...L(4, 'playground', 'implemented', 'e2e: playground missions', '按“开 3 朵”口令组成 3 人小组', '按○双脚、△单脚规则跳格。'),
  ...L(5, 'playground', 'implemented', 'e2e: playground missions', '点数网中的 4 条鱼', '比较两名学生的身高', '用一一对应判断男生多 1 人。'),
  ...L(6, 'classroom-discover', 'implemented', 'e2e: classroom missions', '数一年级 6 个班并确认一（3）班', '描述教室前后左右的物体。'),
  ...L(7, 'classroom-discover', 'implemented', 'e2e: classroom introduction e2e', '按家庭人数、原幼儿园和喜好完成自我介绍', '用参照物描述前面、左边的位置。'),
  ...L(8, 'classroom-games', 'implemented', 'e2e: classroom missions', '按“摸左耳”指令做动作', '按“跺左脚”的正话反做规则做动作', '从指定方向找左边第 3 个同学。'),
  ...L(9, 'classroom-games', 'implemented', 'e2e: classroom missions', '用椅子和同学一一对应解释有人没有座位', '合并 3 个黄三角形和 1 个红三角形', '用 2 个圆柱搭车轮。'),
  ...L(10, 'learning-readiness', 'implemented', 'e2e: readiness missions', '认识 8:30 表示上课时间', '完成认真听讲、右手举手的课堂规则辨认。'),
  ...L(11, 'learning-readiness', 'implemented', 'e2e: open observation e2e', '按指令摆放书本和笔袋', '说出校园喜欢的地方及其中数学信息。'),

  ...L(12, 'numbers', 'implemented', 'e2e: numbers representations', '第一单元主题页：观察 5 以内数与加减法学习内容。'),
  ...L(13, 'numbers', 'implemented', 'e2e: numbers representations', '第一单元主题图：用 1～5 描述图中数量。'),
  ...L(14, 'numbers', 'implemented', 'e2e: numbers representations', '把 1～5 的实物、点子和数字逐一对应。'),
  ...L(15, 'numbers', 'implemented', 'e2e: numbers abacus', '用计数器拨珠表示 1～5', '说出 1 还能表示哪些生活数量。'),
  ...L(16, 'numbers', 'implemented', 'e2e: unit1 marking practice', '圈出指定数量', '连实物、点子与数字', '数一数并写出 1～5。'),
  ...L(17, 'compare', 'implemented', 'e2e: compare matching', '用一一对应建立同样多、多、少。'),
  ...L(18, 'compare', 'implemented', 'e2e: compare symbols', '认识并读写＝、＞、＜', '按松鼠和松果数量填比较符号。'),
  ...L(19, 'ordinal', 'implemented', 'e2e: ordinal direction', '在 5 人排队中区分总数、第 2、人前和人后数量', '提出一个新的位置问题。'),
  ...L(20, 'compose', 'implemented', 'e2e: compose drag', '把 5 个物体分两堆，记录 1 和 4、2 和 3 等分法。'),
  ...L(21, 'compose', 'implemented', 'e2e: compose missions', '用分合图补全 2、3、4、5 的组成', '反向说“几和几组成 5”。'),
  ...L(22, 'unit1-review', 'implemented', 'e2e: unit1 marking practice', '完成序数遮挡填空', '完成数字分合填空', '完成比较符号填空。'),
  ...L(23, 'unit1-review', 'implemented', 'e2e: unit1 marking practice', '在少的一组后画标记', '看图判断同样多、多、少', '填＞、＜、＝。'),
  ...L(24, 'add-within-5', 'implemented', 'e2e: addition operation', '由合起来的情境认识加法、加号和读法', '看图写 3＋1＝4。'),
  ...L(25, 'add-within-5', 'implemented', 'e2e: addition operation', '用接着数计算 3＋2', '用分合解释加法。'),
  ...L(26, 'subtract-within-5', 'implemented', 'e2e: subtraction operation', '由去掉情境认识减法、减号和读法', '用小棒完成 4－1 的试一试。'),
  ...L(27, 'subtract-within-5', 'implemented', 'e2e: subtraction operation', '用倒着数和分合计算 5－3', '看图说减法算式', '画图、涂色补全减法。'),
  ...L(28, 'unit1-review', 'implemented', 'e2e: unit1 practice', '完成 5 以内加减口算和缺数题', '看图写加减式并说明算式意思。'),
  ...L(29, 'unit1-review', 'implemented', 'e2e: unit1 practice', '看算式讲故事', '根据数量变化图写加减算式。'),
  ...L(30, 'zero', 'implemented', 'e2e: zero pattern', '体验 2→1→0', '说出生活中的 0', '解释 3－3＝0', '完成含 0 的加减。'),
  ...L(31, 'unit1-review', 'implemented', 'e2e: unit1 review', '整理 1～5、比较、分合、加减知识并口述收获', '制作并交流知识图。'),
  ...L(32, 'unit1-review', 'implemented', 'e2e: unit1 card organizer', '制作 5 以内加减法算式卡', '按规律整理算式卡并发现规律。'),
  ...L(33, 'unit1-review', 'implemented', 'e2e: unit1 reflection portfolio', '按顺序填 0～5', '完成 5 以内加减口算与缺数题', '比较两组数量', '完成含 0 的加减规律表', '填写本单元成长小档案。'),

  ...L(34, 'six-to-nine', 'implemented', 'e2e: unit2 practice', '第二单元主题页：观察 6～10 的学习内容。'),
  ...L(35, 'six-to-nine', 'implemented', 'e2e: unit2 practice', '第二单元主题图：用 6～10 描述情境。'),
  ...L(36, 'six-to-nine', 'implemented', 'e2e: unit2 practice', '把 6～9 的实物、点子、数字对应', '书写 6～9。'),
  ...L(37, 'compare-order-nine', 'implemented', 'e2e: unit2 practice', '比较 5～9', '在鱼缸图中数总数和第几个。'),
  ...L(38, 'compare-order-nine', 'implemented', 'e2e: unit2 practice', '数写 6～9', '比较两组数量', '根据方向判断第几个。'),
  ...L(39, 'compose-six-nine', 'implemented', 'e2e: unit2 practice', '探索 6 的全部分法。'),
  ...L(40, 'compose-six-nine', 'implemented', 'e2e: unit2 practice', '探索 7 的全部分法并成对记录。'),
  ...L(41, 'compose-six-nine', 'implemented', 'e2e: unit2 practice', '探索 8 的全部分法', '探索 9 的全部分法。'),
  ...L(42, 'compose-six-nine', 'implemented', 'e2e: unit2 practice', '按 0～9 顺序连线', '找图形规律', '根据车厢位置判断第几', '找两数合成 6。'),
  ...L(43, 'compose-six-nine', 'implemented', 'e2e: unit2 practice', '画一画并比较 6～9', '圈出能组成 8、9 的两个数', '补全 8、9 的分合。'),
  ...L(44, 'addsub-six-seven', 'implemented', 'e2e: unit2 practice', '基于同一图写 6 的两加两减四式', '处理 3＋3、6－3。'),
  ...L(45, 'solve-total-within-7', 'implemented', 'e2e: unit2 problem extension', '阅读理解：找左右两部分', '画部分整体关系', '列式求一共有几只。'),
  ...L(46, 'solve-remain-within-7', 'implemented', 'e2e: unit2 problem extension', '阅读理解：找整体和跳走部分', '列减法求还剩几只', '用加法检查。'),
  ...L(47, 'addsub-six-seven', 'implemented', 'e2e: unit2 practice', '完成 6、7 加减口算和缺数。'),
  ...L(48, 'addsub-six-seven', 'implemented', 'e2e: unit2 practice', '看图补加减式', '根据左右鱼提出问题。'),
  ...L(49, 'solve-total-within-7', 'implemented', 'e2e: unit2 problem extension', '说出问题并解答花朵、物品等应用题。'),
  ...L(50, 'addsub-eight-nine', 'implemented', 'e2e: unit2 practice', '完成 8、9 的一图四式。'),
  ...L(51, 'select-info-eight-nine', 'implemented', 'e2e: unit2 problem extension', '从复杂图选 9 只鹿和跑走 3 只鹿的信息', '求还剩几只鹿', '比较 8 只天鹅和 6 朵蘑菇并提出问题。'),
  ...L(52, 'addsub-eight-nine', 'implemented', 'e2e: unit2 practice', '完成 8、9 口算与缺数', '配对组成 8、9 的数字卡。'),
  ...L(53, 'select-info-eight-nine', 'implemented', 'e2e: unit2 problem extension', '完成浇花两问和看图应用题。'),
  ...L(54, 'ten', 'implemented', 'e2e: unit2 practice', '主题图点数得到 10', '说出生活中表示 10 的事物。'),
  ...L(55, 'ten', 'implemented', 'e2e: unit2 practice', '摆 10 的全部分合', '完成“我出几、你出几”的补数游戏。'),
  ...L(56, 'addsub-ten', 'implemented', 'e2e: unit2 practice', '建立 10 的加减法算式组', '比较 1＋9 与 9＋1。'),
  ...L(57, 'addsub-ten', 'implemented', 'e2e: unit2 practice', '完成火箭倒数活动', '10 的口算和数字填空。'),
  ...L(58, 'addsub-ten', 'implemented', 'e2e: unit2 practice', '用 10 的组成补加减式', '看图讲数学故事。'),
  ...L(59, 'continuous-add-sub', 'implemented', 'e2e: unit2 practice', '按两次变化摆小鸡', '保留 5＋2＋1 的中间结果。'),
  ...L(60, 'mixed-add-sub', 'implemented', 'e2e: unit2 practice', '按先来后走、先走后来处理加减混合', '完成数阵。'),
  ...L(61, 'unit2-review', 'implemented', 'e2e: unit2 practice', '完成连加、连减、加减混合口算。'),
  ...L(62, 'unit2-review', 'implemented', 'e2e: unit2 practice', '根据图意补连算式', '解释数量变化。'),
  ...L(63, 'unit2-review', 'implemented', 'e2e: unit2 practice', '整理 0～10、比较、分合、加减与连算知识。'),
  ...L(64, 'unit2-review', 'implemented', 'e2e: unit2 practice', '合作制作 10 以内所有加减法卡', '按规律整理表。'),
  ...L(65, 'unit2-review', 'implemented', 'e2e: unit2 practice', '按 1～9 顺序连线', '完成综合填空。'),
  ...L(66, 'unit2-review', 'implemented', 'e2e: unit2 practice', '从图中提出数学问题并解答。'),

  ...L(67, 'solid-shapes', 'implemented', 'e2e: unit34 practice', '第三单元主题页：识别生活物品的立体形状。'),
  ...L(68, 'solid-shapes', 'implemented', 'e2e: unit34 practice', '按长方体、正方体、圆柱、球分类多种物品', '观察平面和曲面。'),
  ...L(69, 'solid-shapes', 'implemented', 'e2e: unit34 practice', '按口令完成我说你拿', '按特征完成我说你猜', '按要求完成我说你搭。'),
  ...L(70, 'solid-building', 'implemented', 'e2e: unit34 practice', '所有积木都用上搭得又稳又高', '阅读理解任务要求', '比较搭法。'),
  ...L(71, 'solid-compose', 'implemented', 'e2e: unit34 practice', '用 2 个正方体拼长方体', '判断哪些由 4 个正方体拼成。'),
  ...L(72, 'solid-compose', 'implemented', 'e2e: unit34 practice', '连接可拼合的图形', '数立体图形', '按规律接着摆。'),

  ...L(73, 'ten-again', 'implemented', 'e2e: unit34 practice', '第四单元主题页：观察 11～20 的学习内容。'),
  ...L(74, 'ten-again', 'implemented', 'e2e: unit34 practice', '选事物按 10 个一组数', '10 个一捆成 1 个十并接着数。'),
  ...L(75, 'ten-again', 'implemented', 'e2e: unit34 practice', '比较 10 与 0～9 的写法', '解释 10 中 1 和 0 的意义。'),
  ...L(76, 'eleven-twenty', 'implemented', 'e2e: unit34 practice', '抓小棒，捆 10 后接着数到十几。'),
  ...L(77, 'eleven-twenty', 'implemented', 'e2e: unit34 practice', '在十位个位摆 11、15、20', '读写数并解释位值。'),
  ...L(78, 'order-twenty', 'implemented', 'e2e: unit34 practice', '把 0～20 按顺序排一排', '找前一个和后一个数。'),
  ...L(79, 'eleven-twenty', 'implemented', 'e2e: unit34 practice', '圈 10 后接着数', '摆出 11、13、16、18、20', '根据数量正确写数。'),
  ...L(80, 'order-twenty', 'implemented', 'e2e: unit34 practice', '说 14 的组成', '完成数序和相邻数填空。'),
  ...L(81, 'simple-addsub-twenty', 'implemented', 'e2e: unit34 practice', '计算 10＋3、13－3、13－10', '认识加减各部分名称。'),
  ...L(82, 'between-positions', 'implemented', 'e2e: unit34 practice', '读第 10 与第 15 的排队信息', '画图并数两人之间人数。'),
  ...L(83, 'between-positions', 'implemented', 'e2e: unit34 practice', '完成东东与玲玲之间人数的做一做', '说明两端是否计入。'),
  ...L(84, 'unit4-review', 'implemented', 'e2e: unit34 practice', '十几加减口算', '楼层、日期、连续计算与比较应用。'),
  ...L(85, 'unit4-review', 'implemented', 'e2e: unit34 practice', '整理 11～20 的数位、读写、顺序与简单加减。'),
  ...L(86, 'unit4-review', 'implemented', 'e2e: unit34 practice', '先估计数量再点数', '用十位个位写数。'),
  ...L(87, 'unit4-review', 'implemented', 'e2e: unit34 practice', '按得数涂色数学游戏', '发现单双数。'),

  ...L(88, 'plus-nine', 'implemented', 'e2e: unit5 practice', '第五单元主题页：观察 20 以内进位加法。'),
  ...L(89, 'plus-nine', 'implemented', 'e2e: unit5 practice', '用 9＋4 拆 1 凑十', '用小棒或圈图解释。'),
  ...L(90, 'plus-nine', 'implemented', 'e2e: unit5 practice', '移动 9 完成 9 加几表', '发现规律。'),
  ...L(91, 'plus-eight-seven-six', 'implemented', 'e2e: unit5 practice', '用 8＋5 按十格空位拆 2 和 3', '计算 8、7、6 加几。'),
  ...L(92, 'plus-eight-nine-strategies', 'implemented', 'e2e: unit5 practice', '用圆片完成给 8 凑十', '用圆片完成给 9 凑十', '比较两条路线。'),
  ...L(93, 'plus-five-four-three-two', 'implemented', 'e2e: unit5 practice', '用 5＋8 体验交换加数', '解释两种算法。'),
  ...L(94, 'plus-five-four-three-two', 'implemented', 'e2e: unit5 practice', '移动 8 完成加法表', '完成算式上车活动', '比较同组算式。'),
  ...L(95, 'plus-five-four-three-two', 'implemented', 'e2e: unit5 practice', '读取体育用品表', '求两班和一共数量。'),
  ...L(96, 'solve-total', 'implemented', 'e2e: unit5 problem extension', '按男生 5 人、女生 10 人或前排 7 人、后排 8 人两种分组读信息', '分别列加法求一共 15 人。'),
  ...L(97, 'find-original', 'implemented', 'e2e: unit5 problem extension', '将领走和剩下合成原来整体', '画部分整体图并列加法。'),
  ...L(98, 'solve-total', 'implemented', 'e2e: unit5 problem extension', '完成天鹅和足球应用题。'),
  ...L(99, 'find-original', 'implemented', 'e2e: unit5 problem extension', '完成草莓原来有多少的应用题', '从图中提出问题。'),
  ...L(100, 'unit5-review', 'implemented', 'e2e: unit5 practice', '整理凑十、交换和问题解决策略', '表达喜欢的算法。'),
  ...L(101, 'unit5-review', 'implemented', 'e2e: unit5 textbook worksheet', '完成 12 道口算、比较、同和算式组、积木列式和运算符。'),
  ...L(102, 'unit5-review', 'implemented', 'e2e: unit5 textbook worksheet', '完成饺子求原来、6 道未知加数和排队思考题。'),

  ...L(103, 'review-numbers', 'implemented', 'e2e: unit6 continuous practice', '全册知识图：整理 0～9、10～20、十位个位和不进位/进位加法；根据 2 只和 4 只长颈鹿提出问题。'),
  ...L(104, 'review-numbers', 'implemented', 'e2e: unit6 continuous practice', '口述数与运算收获', '连接分合、数位、加减策略。'),
  ...L(105, 'review-relations', 'implemented', 'e2e: unit6 relations extension', '根据图选择加减法解决一共和还剩问题。'),
  ...L(106, 'review-application', 'implemented', 'e2e: unit6 application extension', '走数表入口出口', '完成行列、前后数、位值和规律问题。'),
  ...L(107, 'review-application', 'implemented', 'e2e: unit6 application extension', '填写加法表空格', '找得数 10 的涂色规律。'),
  ...L(108, 'review-shapes', 'implemented', 'e2e: unit6 continuous practice', '用 4 个正方体拼图形', '判断大正方体需要的小正方体数。'),
  ...L(109, 'review-relations', 'implemented', 'e2e: unit6 relations extension', '填＞、＜、＝', '完成算式链、求原来和图形拼合。'),
  ...L(110, 'review-application', 'implemented', 'e2e: unit6 application extension', '从图提出并解答数学问题', '探索购买小印章的多种可能。'),
  ...L(111, 'review-application', 'implemented', 'e2e: whole-book reflection', '按九项学习表现各涂 0～3 朵小红花，并写下要多多努力的方面。'),
];

export const MATH_G1_UPPER_TASK_LEDGER_PAGE_COUNT = 111;
