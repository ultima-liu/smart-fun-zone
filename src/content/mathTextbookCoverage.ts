/**
 * 人教版数学一年级上册（2022 课标修订）教材覆盖台账。
 *
 * 这是课程内容的审计基线：每个印刷页 P1-P111 必须恰好归属一项。
 * status 表示 2026-09-19 的实际基线，而非计划完成度；课程重构时应
 * 逐项更新为 equivalent / implemented，并在对应课程任务中引用 id。
 */
export type MathCoverageStatus = 'implemented' | 'partial' | 'missing' | 'planned';

export type MathCoverageEntry = {
  id: string;
  pages: number[];
  unit: string;
  task: string;
  ownerLessonId: string;
  status: MathCoverageStatus;
};

const pages = (from: number, to = from) => Array.from({ length: to - from + 1 }, (_, index) => from + index);

export const MATH_G1_UPPER_COVERAGE: MathCoverageEntry[] = [
  { id: 'game-opening', pages: pages(1), unit: '数学游戏', task: '单元主题页：认识校园、教室、同伴和数学游戏。', ownerLessonId: 'campus', status: 'implemented' },
  { id: 'game-campus', pages: pages(2, 3), unit: '数学游戏', task: '校园全景中寻找国旗 5 颗星、长方形窗户、4 层教学楼和第 2 层教室。', ownerLessonId: 'campus', status: 'implemented' },
  { id: 'game-playground', pages: pages(4, 5), unit: '数学游戏', task: '桃花组人、○/△跳格规则、4 条鱼、比高和男生多 1 人。', ownerLessonId: 'playground', status: 'implemented' },
  { id: 'game-classroom-discover', pages: pages(6, 7), unit: '数学游戏', task: '6 个班、教室前后左右、自我介绍与座位参照物。', ownerLessonId: 'classroom-discover', status: 'implemented' },
  { id: 'game-classroom-play', pages: pages(8, 9), unit: '数学游戏', task: '听指令、正话反做、左边第 3 个、椅子配对、三角形合并和圆柱车轮。', ownerLessonId: 'classroom-games', status: 'implemented' },
  { id: 'game-ready', pages: pages(10, 11), unit: '数学游戏', task: '8:30、课堂规则、右手举手、物品位置和校园开放观察。', ownerLessonId: 'learning-readiness', status: 'implemented' },

  { id: 'u1-opening', pages: pages(12, 13), unit: '一', task: '5 以内数的认识和加、减法单元主题页。', ownerLessonId: 'numbers', status: 'implemented' },
  { id: 'u1-numbers', pages: pages(14, 16), unit: '一', task: '1-5 的实物、点子、拨珠、方块、数字与书写；圈、连、数写和自选表示。', ownerLessonId: 'numbers', status: 'implemented' },
  { id: 'u1-compare', pages: pages(17, 18), unit: '一', task: '一一对应、同样多/多/少、＝＞＜、松鼠松果与看图比较。', ownerLessonId: 'compare', status: 'implemented' },
  { id: 'u1-ordinal', pages: pages(19), unit: '一', task: '排队中的总数、第几、前后人数；左右方向下的序数。', ownerLessonId: 'ordinal', status: 'implemented' },
  { id: 'u1-compose', pages: pages(20, 21), unit: '一', task: '4、5 的全部分合、摆一摆、填一填和两个鸟窝的相等判断。', ownerLessonId: 'compose', status: 'implemented' },
  { id: 'u1-foundation-practice', pages: pages(22, 23), unit: '一', task: '序数遮挡、分合、比较、涂色、符号填空、公平游戏和思考题。', ownerLessonId: 'unit1-review', status: 'implemented' },
  { id: 'u1-add', pages: pages(24, 25), unit: '一', task: '加法意义、加号与读法、接着数、看图说算式和摆一摆。', ownerLessonId: 'add-within-5', status: 'implemented' },
  { id: 'u1-subtract', pages: pages(26, 27), unit: '一', task: '减法意义、减号与读法、倒着数、画一画和涂一涂。', ownerLessonId: 'subtract-within-5', status: 'implemented' },
  { id: 'u1-addsub-practice', pages: pages(28, 29), unit: '一', task: '加减口算、补式、看图填式、看算式讲故事和数量变化故事。', ownerLessonId: 'unit1-review', status: 'implemented' },
  { id: 'u1-zero', pages: pages(30), unit: '一', task: '0 的含义、生活中的 0、加 0、减 0 和相同数相减。', ownerLessonId: 'zero', status: 'implemented' },
  { id: 'u1-review', pages: pages(31, 33), unit: '一', task: '知识图、5 以内算式卡整理、规律、综合练习和成长小档案。', ownerLessonId: 'unit1-review', status: 'implemented' },

  { id: 'u2-opening', pages: pages(34, 35), unit: '二', task: '6-10 的认识和加、减法单元主题页。', ownerLessonId: 'six-to-nine', status: 'implemented' },
  { id: 'u2-numbers', pages: pages(36), unit: '二', task: '6-9 的实物、点子、数字、生活实例与书写。', ownerLessonId: 'six-to-nine', status: 'implemented' },
  { id: 'u2-compare-ordinal', pages: pages(37, 38), unit: '二', task: '5-9 比较、鱼缸总数和第几、海马方向任务。', ownerLessonId: 'compare-order-nine', status: 'implemented' },
  { id: 'u2-compose', pages: pages(39, 41), unit: '二', task: '6-9 的所有分法、成对记录、草莓配对和完整填空。', ownerLessonId: 'compose-six-nine', status: 'implemented' },
  { id: 'u2-number-practice', pages: pages(42, 43), unit: '二', task: '0-9 数序、图形规律、车厢序数、卡片配对和分合练习。', ownerLessonId: 'compose-six-nine', status: 'implemented' },
  { id: 'u2-addsub-six-seven', pages: pages(44), unit: '二', task: '6、7 的一图四式和摆数计算。', ownerLessonId: 'addsub-six-seven', status: 'implemented' },
  { id: 'u2-solve-total', pages: pages(45), unit: '二', task: '求一共有几只：阅读理解、分析解答、回顾反思。', ownerLessonId: 'solve-total-within-7', status: 'implemented' },
  { id: 'u2-solve-remain', pages: pages(46), unit: '二', task: '求还剩几只：整体、去掉部分、减法与反向检查。', ownerLessonId: 'solve-remain-within-7', status: 'implemented' },
  { id: 'u2-addsub-practice', pages: pages(47, 49), unit: '二', task: '6、7 的口算、数字卡、看图提问、补式和水果代数题。', ownerLessonId: 'addsub-six-seven', status: 'implemented' },
  { id: 'u2-addsub-eight-nine', pages: pages(50), unit: '二', task: '8、9 的一图四式、遮挡卡片和组成计算。', ownerLessonId: 'addsub-eight-nine', status: 'implemented' },
  { id: 'u2-select-information', pages: pages(51), unit: '二', task: '从复杂主题图选择与问题有关的信息，求剩余并提出新问题。', ownerLessonId: 'select-info-eight-nine', status: 'implemented' },
  { id: 'u2-eight-nine-practice', pages: pages(52, 53), unit: '二', task: '8、9 口算、卡片配对、缺数、浇花问题和比较。', ownerLessonId: 'addsub-eight-nine', status: 'implemented' },
  { id: 'u2-ten', pages: pages(54, 55), unit: '二', task: '10 的数量、比较、分合、补数游戏、书写和算筹文化。', ownerLessonId: 'ten', status: 'implemented' },
  { id: 'u2-addsub-ten', pages: pages(56, 58), unit: '二', task: '10 的加减法、找朋友、倒数、看图和数学故事。', ownerLessonId: 'addsub-ten', status: 'implemented' },
  { id: 'u2-continuous', pages: pages(59), unit: '二', task: '连加、连减的连续变化和中间结果。', ownerLessonId: 'continuous-add-sub', status: 'implemented' },
  { id: 'u2-mixed', pages: pages(60, 62), unit: '二', task: '加减混合、数阵、连续变化、古埃及数字文化。', ownerLessonId: 'mixed-add-sub', status: 'implemented' },
  { id: 'u2-review', pages: pages(63, 66), unit: '二', task: '知识图、10 以内算式表、规律、综合应用与成长小档案。', ownerLessonId: 'unit2-review', status: 'implemented' },

  { id: 'u3-opening', pages: pages(67), unit: '三', task: '认识立体图形单元主题页。', ownerLessonId: 'solid-shapes', status: 'implemented' },
  { id: 'u3-shapes', pages: pages(68, 69), unit: '三', task: '多物品分类、平面和曲面、滚动、我说你拿/猜/搭。', ownerLessonId: 'solid-shapes', status: 'implemented' },
  { id: 'u3-building', pages: pages(70), unit: '三', task: '所有积木都用上，搭得又稳又高并解释方案。', ownerLessonId: 'solid-building', status: 'implemented' },
  { id: 'u3-compose', pages: pages(71, 72), unit: '三', task: '正方体拼长方体、4 块拼法、连接拼合、数图形和规律接摆。', ownerLessonId: 'solid-compose', status: 'implemented' },

  { id: 'u4-opening', pages: pages(73), unit: '四', task: '11-20 的认识单元主题页。', ownerLessonId: 'ten-again', status: 'implemented' },
  { id: 'u4-ten-again', pages: pages(74, 75), unit: '四', task: '10 个一捆成 1 个十、十位个位、生活分组和画珠。', ownerLessonId: 'ten-again', status: 'implemented' },
  { id: 'u4-eleven-twenty', pages: pages(76, 77), unit: '四', task: '11-20 的组成、读写、十位个位和我说你摆。', ownerLessonId: 'eleven-twenty', status: 'implemented' },
  { id: 'u4-order', pages: pages(78, 80), unit: '四', task: '0-20 数线、前后数、接近、书页定位、旗面和数的联系。', ownerLessonId: 'order-twenty', status: 'implemented' },
  { id: 'u4-simple-addsub', pages: pages(81), unit: '四', task: '十加几、十几减几、数位操作和运算各部分名称。', ownerLessonId: 'simple-addsub-twenty', status: 'implemented' },
  { id: 'u4-between', pages: pages(82), unit: '四', task: '两人之间有几人：数一数和画图表示。', ownerLessonId: 'between-positions', status: 'implemented' },
  { id: 'u4-practice', pages: pages(83, 84), unit: '四', task: '算式连线、楼层、日期、连续计算、比较和阅读页数。', ownerLessonId: 'unit4-review', status: 'implemented' },
  { id: 'u4-review', pages: pages(85, 87), unit: '四', task: '位值知识图、估数、得数路径、数学游戏、单双数和成长档案。', ownerLessonId: 'unit4-review', status: 'implemented' },

  { id: 'u5-opening', pages: pages(88), unit: '五', task: '20 以内进位加法单元主题页。', ownerLessonId: 'plus-nine', status: 'implemented' },
  { id: 'u5-nine-plus', pages: pages(89, 90), unit: '五', task: '9 加几的凑十、小棒、圈图、算式表和规律。', ownerLessonId: 'plus-nine', status: 'implemented' },
  { id: 'u5-eight-seven-six', pages: pages(91), unit: '五', task: '8、7、6 加几，依据凑十缺口拆分第二加数。', ownerLessonId: 'plus-eight-seven-six', status: 'implemented' },
  { id: 'u5-eight-nine-strategies', pages: pages(92), unit: '五', task: '8＋9 的两种凑十策略、交换加数和选择方法。', ownerLessonId: 'plus-eight-nine-strategies', status: 'implemented' },
  { id: 'u5-five-four-three-two', pages: pages(93, 95), unit: '五', task: '5、4、3、2 加几、交换策略、得数 13、上车、表格与未知数。', ownerLessonId: 'plus-five-four-three-two', status: 'implemented' },
  { id: 'u5-total', pages: pages(96), unit: '五', task: '同图按不同分组求总数，阅读理解、分析解答和回顾。', ownerLessonId: 'solve-total', status: 'implemented' },
  { id: 'u5-original', pages: pages(97, 99), unit: '五', task: '领走与剩下求原来、画部分整体图、看图多问和练习。', ownerLessonId: 'find-original', status: 'implemented' },
  { id: 'u5-table', pages: pages(100), unit: '五', task: '20 以内进位加法卡片表、行列规律和快速计算。', ownerLessonId: 'addition-table', status: 'implemented' },
  { id: 'u5-review', pages: pages(101, 102), unit: '五', task: '整理复习、综合口算、比较、填符号、未知数、思考题和成长档案。', ownerLessonId: 'unit5-review', status: 'implemented' },

  { id: 'u6-opening-numbers', pages: pages(103, 104), unit: '六', task: '全册知识图、20 以内数和运算、分合与凑十。', ownerLessonId: 'review-numbers', status: 'implemented' },
  { id: 'u6-relations-shapes', pages: pages(105), unit: '六', task: '数量关系与立体图形特征、拼搭的全册整理。', ownerLessonId: 'review-relations', status: 'implemented' },
  { id: 'u6-application-grid', pages: pages(106), unit: '六', task: '数表入口出口、前后数、行列位置、位值和规律。', ownerLessonId: 'review-application', status: 'implemented' },
  { id: 'u6-application-table', pages: pages(107), unit: '六', task: '加法表填空、得数 10 的涂色规律和天鹅问题。', ownerLessonId: 'review-application', status: 'implemented' },
  { id: 'u6-practice-one', pages: pages(108), unit: '六', task: '看图写数、数位、立体图形计数和综合计算。', ownerLessonId: 'review-shapes', status: 'implemented' },
  { id: 'u6-practice-two', pages: pages(109), unit: '六', task: '比较、算式链、求原来、未知数和立体图形拼合。', ownerLessonId: 'review-relations', status: 'implemented' },
  { id: 'u6-practice-three', pages: pages(110), unit: '六', task: '看图提问、购买印章多种可能、思考题。', ownerLessonId: 'review-application', status: 'implemented' },
  { id: 'u6-self-evaluation', pages: pages(111), unit: '六', task: '九项学习表现各涂 0～3 朵小红花，并完成开放反思的成长档案。', ownerLessonId: 'review-application', status: 'implemented' },
];

export const MATH_G1_UPPER_TOTAL_PAGES = 111;

export const plannedMathLessonIds = new Set([
  'solve-total-within-7',
  'solve-remain-within-7',
  'select-info-eight-nine',
  'solid-compose',
  'plus-eight-nine-strategies',
]);
