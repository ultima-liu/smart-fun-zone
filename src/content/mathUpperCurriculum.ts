export type MathActivity =
  | { kind: 'count'; prompt: string; emoji: string; total: number }
  | { kind: 'join'; prompt: string; emoji: string; a: number; b: number }
  | { kind: 'take'; prompt: string; emoji: string; total: number; take: number }
  | { kind: 'tenframe'; prompt: string; filled: number; add: number }
  | { kind: 'order'; prompt: string; values: number[] }
  | { kind: 'sort'; prompt: string; objects: { emoji: string; shape: '长方体' | '正方体' | '圆柱' | '球' }[] }
  | { kind: 'model'; prompt: string; options: string[]; answer: number; visual: string };

/** 一节课内可被独立保存、核验的教材任务，不再以一个 activity 代表整课。 */
export type MathTextbookTask = {
  id: string;
  title: string;
  evidence: string;
  required: boolean;
  /** template 仅用于审计旧壳，不能作为教材还原完成证据。 */
  source?: 'explicit' | 'template';
};

export type MathPracticeGroup = {
  id: string;
  title: string;
  mode: '基础练习' | '变式练习' | '开放表达';
  evidence: string;
};

export type ExtendedMathLesson = {
  id: string;
  title: string;
  subtitle: string;
  page: string;
  concept: string;
  scene: string;
  guess: { question: string; options: string[] };
  activity: MathActivity;
  reason: { question: string; options: string[]; answer: number };
  checkpoint: { question: string; options: string[]; answer: number };
  quick: string[];
  tasks: MathTextbookTask[];
  practiceGroups: MathPracticeGroup[];
  taskBlueprintSource: 'explicit' | 'template';
};

export type MathUnit = { no: string; title: string; page: string; color: string; lessons: ({ id: string; title: string; subtitle: string } & Partial<ExtendedMathLesson>)[] };

type ExtendedMathLessonInput = Omit<ExtendedMathLesson, 'tasks' | 'practiceGroups' | 'taskBlueprintSource'> & Partial<Pick<ExtendedMathLesson, 'tasks' | 'practiceGroups'>>;

type ExplicitTaskBlueprint = Pick<ExtendedMathLesson, 'tasks' | 'practiceGroups'>;
const T = (id: string, title: string, evidence: string): MathTextbookTask => ({ id, title, evidence, required: true, source: 'explicit' });
const P = (id: string, title: string, mode: MathPracticeGroup['mode'], evidence: string): MathPracticeGroup => ({ id, title, mode, evidence });

/**
 * 已完成专属交互与验收的课时，必须在这里声明各自的教材任务；不能回退到 L() 的默认壳。
 * 先从第二单元开始逐单元清除模板蓝图，剩余单元仍会保留在真实性审计列表中。
 */
const EXPLICIT_TASK_BLUEPRINTS: Record<string, ExplicitTaskBlueprint> = {
  'six-to-nine': { tasks: [T('count-6-9', '逐个点数并对应数字', '按固定方向点数 6～9 个物体，写出对应数字。'), T('order-6-9', '接着数与数序定位', '从 5 接着说出 6、7、8、9，并找出前后数。')], practiceGroups: [P('numbers-basic', '数写对应', '基础练习', '完成 6～9 的点子、数字和数量对应。'), P('numbers-transfer', '数序迁移', '变式练习', '在新图中从指定数接着数并判断相邻数。')] },
  'compare-order-nine': { tasks: [T('compare-6-9', '一一对应比较 6～9', '用配对或数序判断两个数量的多、少和同样多。'), T('ordinal-6-9', '确定方向找第几', '先确定起点与方向，再指出指定位置。')], practiceGroups: [P('compare-basic', '比较符号', '基础练习', '填写 6～9 的＞、＜、＝。'), P('ordinal-transfer', '变换方向', '变式练习', '改变左右方向后重新判断第几个。')] },
  'compose-six-nine': { tasks: [T('compose-eight', '有序记录 8 的分法', '按左部分从 0 到 4 摆出并记录 8 的五组不同分法。'), T('compose-nine', '迁移 9 的分合', '用相同顺序补全 9 的组成，区分左右交换。')], practiceGroups: [P('compose-basic', '分合填空', '基础练习', '补全 6～9 的分与合。'), P('compose-transfer', '规律表达', '开放表达', '说出怎样按顺序记录才不会遗漏。')] },
  'addsub-six-seven': { tasks: [T('family-six', '由部分整体写一图四式', '从 5、1、6 中找全两道加法和两道减法。'), T('family-seven', '处理相同部分的相关算式', '用 3、3、6 或 2、5、7 说明整体与部分的关系。')], practiceGroups: [P('family-basic', '6、7 加减口算', '基础练习', '完成 6、7 的加减和缺数题。'), P('family-transfer', '看图讲算式', '开放表达', '根据左右两部分编一道加法或减法故事。')] },
  'solve-total-within-7': { tasks: [T('total-info', '圈出两个部分', '从图或文字中选出左右两部分的信息。'), T('total-equation', '画关系并列加法', '用部分＋部分＝整体列式并检查总数。')], practiceGroups: [P('total-basic', '求一共', '基础练习', '完成花朵、小鸟等“求一共”题。'), P('total-transfer', '换情境求总数', '变式练习', '在新分组情境中说明为什么仍用加法。')] },
  'solve-remain-within-7': { tasks: [T('remain-info', '找整体和去掉部分', '区分原有数量与离开数量，排除无关信息。'), T('remain-check', '列减法并用加法检查', '完成整体－部分＝剩余，并用剩余＋去掉部分检验。')], practiceGroups: [P('remain-basic', '求还剩', '基础练习', '完成飞走、拿走后的剩余问题。'), P('remain-transfer', '反向检查', '变式练习', '在新情境中写出减法的加法检验。')] },
  'addsub-eight-nine': { tasks: [T('family-eight', '找全 8 的一图四式', '从部分 5、3 和整体 8 找出两加两减。'), T('family-nine', '用组成计算 9 的加减', '用 9 的两个部分解释一道减法。')], practiceGroups: [P('eight-nine-basic', '8、9 口算', '基础练习', '完成 8、9 加减和缺数题。'), P('eight-nine-transfer', '数字卡配对', '变式练习', '把能组成 8 或 9 的两张数字卡配对。')] },
  'select-info-eight-nine': { tasks: [T('filter-info', '筛选有用信息', '把 9 只鹿、跑走 3 只鹿与 6 朵蘑菇、8 只天鹅分开。'), T('solve-filtered', '依据筛选结果解答', '只用 9 和 3 算出还剩 6 只，再带回原图检查。')], practiceGroups: [P('filter-basic', '复杂图解题', '基础练习', '完成含无关信息的还剩鹿问题。'), P('filter-transfer', '提出新问题', '开放表达', '基于同一幅图比较 8 只天鹅和 6 朵蘑菇。')] },
  ten: { tasks: [T('ten-frame', '填满十格框', '把第 10 个圆片放进十格框，整体识别 10。'), T('ten-partners', '补数游戏记录 10 的组成', '依次找出 1～5 的补数，记录 10 的五组不同组成。')], practiceGroups: [P('ten-basic', '10 的分合', '基础练习', '补全 10 的分合和加减式。'), P('ten-transfer', '生活中的 10', '开放表达', '说出生活中可整体看成 10 的事物。')] },
  'addsub-ten': { tasks: [T('ten-family', '整理 10 的相关算式', '从干扰卡中找出同一组 1、9、10 的两加两减。'), T('rocket-countdown', '火箭倒数', '从 10 逐步倒数到 0，说明每次少 1。')], practiceGroups: [P('ten-equation-basic', '10 的加减', '基础练习', '完成 10 的口算和填空。'), P('ten-equation-transfer', '数阵规律', '变式练习', '用 10 的组成补全新算式并解释。')] },
  'continuous-add-sub': { tasks: [T('continuous-add', '摆出连加中间结果', '按事情发生顺序完成 5→7→8，保留中间的 7。'), T('continuous-sub', '记录连减过程', '把 8－2－3 分两步计算并写出每步结果。')], practiceGroups: [P('continuous-basic', '连加连减口算', '基础练习', '完成连加、连减的基础题。'), P('continuous-transfer', '情境顺序解释', '开放表达', '说明为什么连算必须从左到右。')] },
  'mixed-add-sub': { tasks: [T('mixed-change', '摆出先加后减过程', '按上车、下车顺序完成 4→7→5。'), T('mixed-equation', '记录加减混合算式', '把故事变化写成 4＋3－2＝5，不跳过中间数。')], practiceGroups: [P('mixed-basic', '加减混合', '基础练习', '完成按顺序计算的混合题。'), P('mixed-transfer', '数阵补数', '变式练习', '在数阵中补全能组成 10 的数。')] },
  'unit2-review': { tasks: [T('unit2-cards', '制作并整理加减法卡', '按运算符整理 10 以内加减法卡，再观察得数。'), T('unit2-review-map', '整理连算并提出问题', '分类连加、连减、混合算式，并用图中数量提出问题。')], practiceGroups: [P('unit2-basic', '综合口算', '基础练习', '完成 6～10、连算和图意补式。'), P('unit2-transfer', '单元知识整理', '开放表达', '说出分合、加减和数序之间的一条联系。')] },
  'solid-shapes': { tasks: [T('solid-sort', '按形状分类生活物品', '把长方体、正方体、圆柱和球送入正确家族。'), T('solid-feature', '用滚动与平面特征辨认', '依据滚动、曲面、平面和面大小匹配四种图形特征。')], practiceGroups: [P('solid-basic', '图形辨认', '基础练习', '从生活物品中辨认四种立体图形。'), P('solid-transfer', '特征说明', '开放表达', '说出一种图形为什么能滚或能稳定放置。')] },
  'solid-building': { tasks: [T('stable-base', '选择稳定底座', '依据平面和支撑范围选择搭高塔的底座。'), T('build-all', '用全部积木搭建', '逐块放入相连且稳定的位置，完成又稳又高的搭法。')], practiceGroups: [P('build-basic', '搭法比较', '基础练习', '比较两种搭法的稳定性。'), P('build-transfer', '轻推检查', '变式练习', '用轻推观察并说明怎样调整底座。')] },
  'solid-compose': { tasks: [T('compose-four-cubes', '用四块小正方体拼长方体', '让四个小方块相连，完成一个长方体拼搭。'), T('rotate-compare', '比较旋转后的拼法', '判断转动前后连接关系是否改变。')], practiceGroups: [P('compose-basic', '拼搭辨认', '基础练习', '判断哪些图由相连的小正方体拼成。'), P('compose-transfer', '空间想象', '变式练习', '说出拼 2×2×2 大正方体需要几块。')] },
  'ten-again': { tasks: [T('count-ten-sticks', '逐根数出 10 根小棒', '按顺序点数十根小棒，不重不漏。'), T('bundle-ten', '捆成一个十', '将 10 个一捆成 1 个十，说明十位含义。')], practiceGroups: [P('bundle-basic', '十和一', '基础练习', '判断 10 个一与 1 个十的关系。'), P('bundle-transfer', '按十计数', '变式练习', '在新物品中圈出 10 个并整体计数。')] },
  'eleven-twenty': { tasks: [T('make-fifteen', '摆出 1 个十和 5 个一', '先捆一十，再摆五个一并读作 15。'), T('make-twenty', '认识 2 个十', '用两捆小棒表示 20，并区分十位个位。')], practiceGroups: [P('teen-basic', '十几读写', '基础练习', '摆、读、写 11、13、16、18、20。'), P('teen-transfer', '数位解释', '开放表达', '说出 11 中两个 1 分别表示什么。')] },
  'order-twenty': { tasks: [T('number-rail', '沿数轴走 10 到 15', '按相邻每次加 1 的规则逐格走数。'), T('near-ten', '比较 12 到整十数的距离', '在数轴上判断 12 更接近 10 还是 20。')], practiceGroups: [P('order-basic', '相邻数', '基础练习', '填写十几的前一个和后一个数。'), P('order-transfer', '数轴比较', '变式练习', '用数轴说明两个十几数的大小。')] },
  'simple-addsub-twenty': { tasks: [T('ten-ones-add', '合并十和一', '用 1 个十和 3 个一写出 10＋3＝13。'), T('ten-ones-subtract', '区分去一和去十', '分别配出 13－3＝10、13－10＝3。')], practiceGroups: [P('simple-calc', '十几简单加减', '基础练习', '完成十加几、十几减几和十几减十。'), P('simple-transfer', '数位解释计算', '开放表达', '说明去掉几个一后为什么还剩一个十。')] },
  'between-positions': { tasks: [T('mark-endpoints', '确定第 10 和第 15 两端', '把两端作为端点，不计入“之间”。'), T('count-between', '逐个标出中间四人', '依次标出第 11、12、13、14 人，得到 4 人。')], practiceGroups: [P('between-basic', '间隔问题', '基础练习', '完成不同位置之间人数的题目。'), P('between-transfer', '画图解释', '开放表达', '画出端点和中间位置，说明为什么要减 1。')] },
  'unit4-review': { tasks: [T('place-value-review', '摆出 18 的十位和个位', '捆一十、摆八一并写作 18。'), T('order-compare-review', '整理数序和比较', '判断 19 的后一个数并比较 17 与 19。')], practiceGroups: [P('unit4-basic', '11～20 综合练习', '基础练习', '完成读写、数序和简单加减。'), P('unit4-transfer', '十位个位表达', '开放表达', '说明比较十几数时先看什么。')] },
  'plus-nine': { tasks: [T('nine-make-ten', '从第二个加数拆 1 凑十', '把 4 中的 1 移给 9，完成 9＋4＝10＋3。'), T('nine-table', '整理 9 加几', '根据凑十过程填写 9 加几的结果并找规律。')], practiceGroups: [P('nine-basic', '9 加几口算', '基础练习', '完成 9 加几的凑十计算。'), P('nine-transfer', '圈图解释', '变式练习', '用圆片或图解释为什么先分出 1。')] },
  'plus-eight-seven-six': { tasks: [T('eight-make-ten', '给 8 补 2 凑十', '从第二个加数中移动 2，观察 8＋5＝10＋3。'), T('seven-six-partners', '找 7、6 的凑十伙伴', '分别说明 7 需 3、6 需 4 才能凑十。')], practiceGroups: [P('eight-seven-six-basic', '8、7、6 加几', '基础练习', '完成 8、7、6 加几的口算。'), P('eight-seven-six-transfer', '拆数说明', '开放表达', '说出一次拆数后十和剩余部分。')] },
  'plus-eight-nine-strategies': { tasks: [T('make-eight-ten', '给 8 凑十', '从 9 中移 2 给 8，记录 8＋9＝10＋7。'), T('make-nine-ten', '给 9 凑十并比较', '从 8 中移 1 给 9，比较两条路线都得 17。')], practiceGroups: [P('eight-nine-basic', '8＋9 计算', '基础练习', '完成 8＋9 及相关进位加法。'), P('eight-nine-transfer', '方法选择', '开放表达', '选择一种凑十路线并说清拆分理由。')] },
  'plus-five-four-three-two': { tasks: [T('exchange-addends', '交换两个加数的位置', '实际把 5＋8、4＋9 交换为大数在前。'), T('compare-sums', '比较交换前后结果', '确认交换后数量和得数不变。')], practiceGroups: [P('small-addend-basic', '交换加数口算', '基础练习', '完成 5、4、3、2 加几。'), P('small-addend-transfer', '算式上车', '变式练习', '把同得数或可交换的算式整理成组。')] },
  'solve-total': { tasks: [T('total-read-info', '圈出两种分组的信息', '从同一队列中分别找出男生 5 人和女生 10 人，或前排 7 人和后排 8 人。'), T('total-model-equation', '用部分整体图列两道加法', '分别写出 5＋10＝15、7＋8＝15，并回顾为什么答案相同。')], practiceGroups: [P('total-twenty-basic', '20 以内求一共', '基础练习', '完成男生女生、前后两组的两种总数问题。'), P('total-twenty-transfer', '改变分组', '开放表达', '说明同一总数换一种分组后仍列加法的原因。')] },
  'find-original': { tasks: [T('original-info', '找领走和剩下两部分', '圈出领走量和剩余量，排除无关信息。'), T('original-equation', '合并两部分求原来', '用部分＋部分＝原来整体列式并检查。')], practiceGroups: [P('original-basic', '求原来', '基础练习', '完成吃掉、领走与剩下的问题。'), P('original-transfer', '看图多问', '开放表达', '从同图提出一个求原来问题并解答。')] },
  'addition-table': { tasks: [T('fill-addition-table', '补全进位加法三角表', '补出原页 10 个白格，保留所有已给算式的三角排列。'), T('review-table-actions', '凑十、看图列式、指算与行列规律', '完成 8＋9 拆 2 和 7、6＋5＝11，看任意算式说得数，并写下第一列与第一行的变化。')], practiceGroups: [P('table-basic', '进位加法表', '基础练习', '完成全部白格、凑十回顾、看图列式和任意指算。'), P('table-transfer', '行列规律', '开放表达', '说明第一列和第一行中两个加数、得数的变化。')] },
  'unit5-review': { tasks: [T('review-make-ten', '复习凑十路线', '完成 7＋8 或 8＋5 的拆数、凑十和加剩余。'), T('review-relations', '整理相关算式与求原来', '完成相关减法和领走、剩下求原来的关系。')], practiceGroups: [P('unit5-basic', '进位加法综合', '基础练习', '完成口算、比较、填符号和未知数。'), P('unit5-transfer', '算法表达', '开放表达', '选择一种算法并说明为什么正确。')] },
  'review-numbers': { tasks: [T('knowledge-map', '连接数与运算知识图', '连通 0～9、10～20、十位个位以及不进位/进位加法。'), T('giraffe-question', '根据长颈鹿图提出问题', '依据 2 只和 4 只长颈鹿写出一个问题，并用 2＋4＝6 表示数量。')], practiceGroups: [P('book-numbers-basic', '0～20 综合', '基础练习', '完成数位、顺序、组成和计算复习。'), P('book-numbers-transfer', '知识关联与提问', '开放表达', '从知识图说明一条关系，再根据两组长颈鹿提出问题。')] },
  'review-relations': { tasks: [T('relation-chain', '完成数量关系算式链', '分别处理还剩、求原来和反向检查。'), T('relation-compare', '看关系选运算', '根据整体和部分决定用加法或减法。')], practiceGroups: [P('relations-basic', '数量关系复习', '基础练习', '完成一共、还剩、原来和比较题。'), P('relations-transfer', '图形与关系综合', '变式练习', '在图形或算式链新情境中说明选择的关系。')] },
  'review-shapes': { tasks: [T('review-solid-sort', '综合辨认立体图形', '根据形状、稳定性和滚动特点分类。'), T('build-big-cube', '拼 2×2×2 大正方体', '按层依次放满 8 个小正方体。')], practiceGroups: [P('review-shapes-basic', '图形综合', '基础练习', '完成看图写数、图形计数和拼搭题。'), P('review-shapes-transfer', '空间说明', '开放表达', '说出大正方体每层需要几块及原因。')] },
  'review-application': { tasks: [T('application-tools', '完成数表和加法表操作', '走数表路径并涂出得数为 10 的加法格。'), T('application-question-portfolio', '自编问题并记录自评', '依据原图猴群和印章信息编题解答，并完成九项成长档案。')], practiceGroups: [P('application-basic', '综合应用', '基础练习', '完成数表、加法表、位值和图形综合题。'), P('application-transfer', '开放问题与反思', '开放表达', '从原图提出问题、说明方法并记录下一步练习。')] },
  playground: { tasks: [T('playground-count', '按规则点数游戏人数和鱼', '按顺序数出三人一组和网中四条鱼。'), T('playground-pattern-compare', '发现图形规则并比较', '接着排列图形规则，比较两位同学身高。')], practiceGroups: [P('playground-basic', '游戏规则', '基础练习', '完成抱团、跳格和数鱼规则。'), P('playground-transfer', '数学观察', '开放表达', '说出操场中一个数量、形状或比较发现。')] },
  'classroom-discover': { tasks: [T('classroom-position', '以参照物描述位置', '根据黑板、窗户和座位说清前后左右。'), T('classroom-introduction', '完成数学自我介绍', '记录自己的数量、位置或喜好信息。')], practiceGroups: [P('classroom-basic', '位置与序数', '基础练习', '完成教室中的前后左右和第几。'), P('classroom-transfer', '换参照物描述', '变式练习', '改变参照物后重新说明位置。')] },
  'classroom-games': { tasks: [T('direction-command', '听指令辨左右', '根据对象和方向完成左耳、右脚等动作选择。'), T('triangle-compose', '合并三角形数量', '把 3 个黄色和 1 个红色三角形合起来。')], practiceGroups: [P('classroom-game-basic', '方向游戏', '基础练习', '完成听口令辨左右。'), P('classroom-game-transfer', '颜色数量迁移', '变式练习', '在新颜色和数量下列出合并结果。')] },
  'learning-readiness': { tasks: [T('class-time', '辨认 8:30 的上课时间', '观察钟面和课程表，说明 8:30 是上课开始的时间。'), T('time-space-rules', '完成课堂准备活动', '按课程规则完成举手发言和物品位置任务。')], practiceGroups: [P('readiness-basic', '课堂准备', '基础练习', '完成时间、规则和物品位置题。'), P('readiness-transfer', '我的准备清单', '开放表达', '说出自己一项可执行的课前准备。')] },
  'add-within-5': { tasks: [T('join-within-five', '逐个合并两部分', '把 3 个和 1 个小动物逐个放进整体圈。'), T('equation-within-five', '用加法表示总数', '根据两部分写出正确加法式并说明合起来。')], practiceGroups: [P('add-five-basic', '5 以内加法', '基础练习', '完成看图、口算和补式。'), P('add-five-transfer', '交换加数', '变式练习', '比较两部分交换位置后的结果。')] },
  'subtract-within-5': { tasks: [T('take-within-five', '从整体中点走部分', '从 4 只小鸟中点走 1 只并数剩余。'), T('subtract-equation-five', '用减法表示剩余', '根据拿走和剩下写出减法式。')], practiceGroups: [P('subtract-five-basic', '5 以内减法', '基础练习', '完成飞走、吃掉后的剩余题。'), P('subtract-five-transfer', '加法检查', '变式练习', '用剩下和拿走部分检验减法。')] },
  zero: { tasks: [T('take-all', '全部拿走认识 0', '把 3 个苹果全部拿走，观察一个也没有。'), T('zero-relations', '整理 0 的加减关系', '说明 3－3＝0 和任何数加 0 仍是原数。')], practiceGroups: [P('zero-basic', '0 的认识和计算', '基础练习', '完成 0、相同数相减和加 0 的题目。'), P('zero-transfer', '数轴起点', '开放表达', '说出 0 在数轴和生活中的一种意义。')] },
  'unit1-review': { tasks: [T('unit1-mark', '圈涂连留下证据', '圈 4 个、涂第 4 个并连点子与数字。'), T('unit1-organize', '整理算式卡和知识', '按加减分类算式卡，回顾数量、位置和分合。')], practiceGroups: [P('unit1-basic', '第一单元综合', '基础练习', '完成数、比较、位置、分合和加减练习。'), P('unit1-transfer', '单元反思', '开放表达', '说出一个会用来检查答案的方法。')] },
};

const L = (lesson: ExtendedMathLessonInput): ExtendedMathLesson => {
  const blueprint = EXPLICIT_TASK_BLUEPRINTS[lesson.id];
  const usesTemplate = !blueprint && (!lesson.tasks || !lesson.practiceGroups);
  return {
    ...lesson,
    taskBlueprintSource: usesTemplate ? 'template' : 'explicit',
    tasks: lesson.tasks ?? blueprint?.tasks ?? [
      { id: 'core-operation', title: '核心操作', evidence: lesson.activity.prompt, required: true, source: 'template' },
      { id: 'textbook-practice', title: '教材做一做', evidence: '用另一种表征或题目验证核心关系。', required: true, source: 'template' },
    ],
    practiceGroups: lesson.practiceGroups ?? blueprint?.practiceGroups ?? [
      { id: 'basic', title: '教材基本练习', mode: '基础练习', evidence: lesson.checkpoint.question },
      { id: 'transfer', title: '换情境迁移', mode: '变式练习', evidence: '智能闯关中的新情境、逆向或辨析题。' },
    ],
  };
};

export const EXTENDED_MATH_LESSONS: ExtendedMathLesson[] = [
  L({ id: 'playground', title: '在操场上玩一玩', subtitle: '数数、比较和图形规则', page: 'P4', concept: '在游戏规则里使用数量、比较和图形。', scene: '🌸🌸🌸　🐟🐟🐟🐟　○ △ ○ △', guess: { question: '“桃花朵朵开，开 3 朵”需要几个人抱在一起？', options: ['2 人', '3 人', '4 人'] }, activity: { kind: 'count', prompt: '按顺序点亮参加游戏的 3 个小朋友。', emoji: '🧒🏻', total: 3 }, reason: { question: '怎样保证正好是 3 人？', options: ['一个一个数，不重复也不漏', '看谁最高', '站得越近越好'], answer: 0 }, checkpoint: { question: '网中有 4 条鱼，应选哪个数？', options: ['3', '4', '5'], answer: 1 }, quick: ['怎样数才不会漏？', '图形规则怎样接着排？'] }),
  L({ id: 'classroom-discover', title: '在教室里认一认', subtitle: '位置、序数和自我介绍', page: 'P6', concept: '用前、后、左、右和第几描述位置。', scene: '🚩　⬛　🪟　🧒🏻🧒🏽👧🏻', guess: { question: '面向黑板时，窗户可能在你的哪一边？', options: ['左边', '右边', '要根据教室观察'] }, activity: { kind: 'model', prompt: '选择能完整描述位置的话。', options: ['只说“在那里”', '说清参照物和前后左右', '只说物品颜色'], answer: 1, visual: '🧒🏻　← 左边｜右边 →　🪟' }, reason: { question: '为什么描述位置要说参照物？', options: ['不说也一样', '参照物不同，左右和前后可能不同', '为了让句子更长'], answer: 1 }, checkpoint: { question: '“我的前面是小红”描述的是？', options: ['数量', '位置', '形状'], answer: 1 }, quick: ['左右怎样分清？', '怎样说清自己的座位？'] }),
  L({ id: 'classroom-games', title: '在教室里玩一玩', subtitle: '听指令辨左右，发现数量关系', page: 'P8', concept: '在动作和座位情境中辨认左右、多少与组合。', scene: '👂🏻⬅️　🦶🏻➡️　🔺🔺🔺🔺', guess: { question: '“摸你的左耳”应该用哪只手都可以吗？', options: ['可以，关键是左耳', '只能左手', '只能右手'] }, activity: { kind: 'model', prompt: '听清对象和方向，选择正确动作。', options: ['摸左耳', '摸右耳', '跺右脚'], answer: 0, visual: '聪聪说：摸你的左耳' }, reason: { question: '做位置动作前先听清什么？', options: ['对象和方向', '声音大小', '动作快慢'], answer: 0 }, checkpoint: { question: '3 个黄色三角形和 1 个红色三角形，一共有几个？', options: ['3', '4', '5'], answer: 1 }, quick: ['左和右会改变吗？', '怎样把两部分合起来数？'] }),
  L({ id: 'learning-readiness', title: '学习准备', subtitle: '时间、课堂规则和物品位置', page: 'P10', concept: '认识学习中的时间、顺序和空间安排。', scene: '🕣　📚　✏️　🙋🏻', guess: { question: '每天 8:30 开始上课，8:30 表示什么？', options: ['时间', '人数', '页数'] }, activity: { kind: 'model', prompt: '观察钟面和课程表，选出“8:30”表示的上课信息。', options: ['8:30 表示上课开始的时间', '8:30 表示 8 个同学和 30 本书', '8:30 表示课本第 8 页第 30 题'], answer: 0, visual: '🕣　8:30 · 上午第 1 节' }, reason: { question: '为什么物品要放在固定位置？', options: ['更快找到，也不容易遗漏', '桌面看起来更满', '可以少带东西'], answer: 0 }, checkpoint: { question: '举手发言属于哪种准备？', options: ['课堂规则', '数量比较', '图形分类'], answer: 0 }, quick: ['怎样做好课前准备？', '8:30 是什么意思？'] }),

  L({ id: 'add-within-5', title: '1～5 的加法', subtitle: '把两部分合起来', page: 'P24', concept: '加法表示把两部分合起来，求一共有多少。', scene: '🐿️🐿️🐿️　＋　🐿️', guess: { question: '原来 3 只，又来 1 只，一共会变多还是变少？', options: ['变多', '变少', '不变'] }, activity: { kind: 'join', prompt: '把 3 只和 1 只小动物逐个送进“合起来”的圈。', emoji: '🐿️', a: 3, b: 1 }, reason: { question: '为什么这里用加法？', options: ['把两部分合起来求总数', '从总数里去掉一部分', '只看一部分'], answer: 0 }, checkpoint: { question: '2 只小鸟和 3 只小鸟合起来，算式是？', options: ['2+3=5', '5-2=3', '3-2=1'], answer: 0 }, quick: ['什么时候用加法？', '交换两部分结果会变吗？'] }),
  L({ id: 'subtract-within-5', title: '1～5 的减法', subtitle: '从总数里去掉一部分', page: 'P26', concept: '减法表示从总数中去掉一部分，求还剩多少。', scene: '🐦🐦🐦🐦　飞走 1 只', guess: { question: '4 只小鸟飞走 1 只，剩下的会变多还是变少？', options: ['变多', '变少', '不变'] }, activity: { kind: 'take', prompt: '从 4 只小鸟中点走 1 只，再数剩下的。', emoji: '🐦', total: 4, take: 1 }, reason: { question: '为什么这里用减法？', options: ['把两部分合起来', '从总数里去掉一部分', '比较形状'], answer: 1 }, checkpoint: { question: '5 个苹果吃掉 3 个，还剩几个？', options: ['2', '3', '8'], answer: 0 }, quick: ['什么时候用减法？', '减号表示什么动作？'] }),
  L({ id: 'zero', title: '0 的认识和加、减法', subtitle: '一个也没有与起点', page: 'P30', concept: '0 可以表示一个也没有，也可以表示起点。', scene: '🪹　0　0—1—2—3', guess: { question: '盘子里的苹果全部拿走后，用哪个数表示？', options: ['0', '1', '5'] }, activity: { kind: 'take', prompt: '把 3 个苹果全部拿走，观察“一个也没有”。', emoji: '🍎', total: 3, take: 3 }, reason: { question: '3−3 为什么等于 0？', options: ['全部拿走后一个也没有', '因为 3 很小', '因为没有做加法'], answer: 0 }, checkpoint: { question: '任何数加 0，结果怎样？', options: ['还是原来的数', '一定变成 0', '一定变大'], answer: 0 }, quick: ['0 只能表示没有吗？', '为什么 3 减 3 等于 0？'] }),
  L({ id: 'unit1-review', title: '第一单元整理和复习', subtitle: '把数、比较、分合与加减连起来', page: 'P31', concept: '建立 5 以内数的知识关联。', scene: '1 2 3 4 5　＜＝＞　＋－', guess: { question: '分与合能帮助计算加减法吗？', options: ['能', '不能', '只帮助写数字'] }, activity: { kind: 'order', prompt: '把 1～5 按顺序点亮，完成知识线的起点。', values: [1, 2, 3, 4, 5] }, reason: { question: '2 和 3 组成 5，可以帮助算什么？', options: ['2+3 和 5−2', '只算 2−3', '只比较形状'], answer: 0 }, checkpoint: { question: '5−3 的结果是？', options: ['1', '2', '3'], answer: 1 }, quick: ['加法和减法有什么联系？', '怎样整理 5 以内算式？'] }),

  L({ id: 'six-to-nine', title: '6～9 的认识', subtitle: '数量、顺序和写法', page: 'P36', concept: '在 5 的基础上继续认识 6、7、8、9。', scene: '🦢🦢🦢🦢🦢🦢　6 7 8 9', guess: { question: '5 再添上 1 是几？', options: ['5', '6', '7'] }, activity: { kind: 'count', prompt: '逐个点数 6 只天鹅，建立“5 添 1 是 6”。', emoji: '🦢', total: 6 }, reason: { question: '怎样数 6～9 不容易漏？', options: ['按顺序一个一个数', '只看颜色', '从中间随便数'], answer: 0 }, checkpoint: { question: '8 前面的数是？', options: ['6', '7', '9'], answer: 1 }, quick: ['6～9 怎样接在 5 后面？', '数越往后会怎样？'] }),
  L({ id: 'compare-order-nine', title: '6～9 的比大小和第几', subtitle: '比较数量与确定位置', page: 'P37', concept: '在更大数量中继续用一一对应和确定起点。', scene: '6 ＜ 7　🐥🐥🐥🐥🐥🐥🐥', guess: { question: '6 和 7 谁更大？', options: ['6', '7', '一样大'] }, activity: { kind: 'model', prompt: '选出能正确表示 7 比 6 多 1 的式子。', options: ['7＞6', '7＝6', '7＜6'], answer: 0, visual: '●●●●●●　｜　●●●●●●●' }, reason: { question: '判断第几之前为什么要先定方向？', options: ['起点不同，位置序号可能不同', '数字会消失', '人数会改变'], answer: 0 }, checkpoint: { question: '从左数第 7 个表示的是？', options: ['总数', '位置', '形状'], answer: 1 }, quick: ['怎样比较 8 和 9？', '第几为什么要说方向？'] }),
  L({ id: 'compose-six-nine', title: '6～9 的分与合', subtitle: '成对记录所有分法', page: 'P39', concept: '有序地分一分，发现互换的两种分法。', scene: '8 → 1和7、2和6、3和5、4和4', guess: { question: '8 可以分成 3 和几？', options: ['4', '5', '6'] }, activity: { kind: 'join', prompt: '把 3 个和 5 个圆片合进整体圈，验证组成 8。', emoji: '🔵', a: 3, b: 5 }, reason: { question: '为什么分法常常成对出现？', options: ['交换左右部分，总数不变', '每次总数都会变', '只是为了好看'], answer: 0 }, checkpoint: { question: '7 可以分成 2 和几？', options: ['4', '5', '6'], answer: 1 }, quick: ['怎样不漏掉分法？', '4 和 4 组成几？'] }),
  L({ id: 'addsub-six-seven', title: '6 和 7 的加、减法', subtitle: '一图四式与数量关系', page: 'P44', concept: '根据同一幅部分整体图写出两道加法和两道减法。', scene: '5＋1＝6　1＋5＝6　6－1＝5　6－5＝1', guess: { question: '5 和 1 组成 6，可以写出几道相关算式？', options: ['1 道', '2 道', '4 道'] }, activity: { kind: 'join', prompt: '把 5 个和 1 个学具合起来，观察整体 6。', emoji: '🐟', a: 5, b: 1 }, reason: { question: '为什么同一幅图能写加法也能写减法？', options: ['它同时包含整体和两个部分', '符号可以随便换', '答案都必须相同'], answer: 0 }, checkpoint: { question: '7−2 等于？', options: ['4', '5', '6'], answer: 1 }, quick: ['什么是一图四式？', '加减法怎样互相检查？'] }),
  L({ id: 'solve-total-within-7', title: '求一共有几只', subtitle: '读信息、画关系、列加法', page: 'P45', concept: '已知左右两部分，求一共有多少，要把两部分合起来。', scene: '左边 4 只　＋　右边 2 只　＝　一共？只', guess: { question: '左边有 4 只、右边有 2 只，问题问“一共”，应该先想什么？', options: ['两部分合成整体', '从整体去掉一部分', '只数左边'] }, activity: { kind: 'join', prompt: '先把左边 4 只、右边 2 只按顺序放进整体框，再说出算式。', emoji: '🐟', a: 4, b: 2 }, reason: { question: '为什么列 4＋2？', options: ['要求两部分合起来的总数', '要求右边有几只', '因为 4 比 2 大'], answer: 0 }, checkpoint: { question: '3 只小鸟和 4 只小鸟一共几只？', options: ['1 只', '7 只', '12 只'], answer: 1 }, quick: ['题目里哪两部分要合起来？', '算完怎样检查“一共”？'] }),
  L({ id: 'solve-remain-within-7', title: '求还剩几只', subtitle: '整体去掉一部分，再检查', page: 'P46', concept: '已知整体和离开的一部分，求剩余要从整体里去掉那一部分。', scene: '一共 7 只　－　跳走 2 只　＝　还剩？只', guess: { question: '一共有 7 只，跳走 2 只，数量发生什么变化？', options: ['变少', '变多', '不变'] }, activity: { kind: 'take', prompt: '从 7 只小鱼中点走 2 只，数清还剩多少。', emoji: '🐟', total: 7, take: 2 }, reason: { question: '为什么列 7−2？', options: ['从整体去掉跳走的一部分', '把两部分合起来', '因为 7 写在前面'], answer: 0 }, checkpoint: { question: '6 只鸟飞走 1 只，还剩几只？', options: ['5 只', '6 只', '7 只'], answer: 0 }, quick: ['“还剩”时整体和去掉的部分分别是什么？', '怎样用加法检查减法？'] }),
  L({ id: 'addsub-eight-nine', title: '8 和 9 的加、减法', subtitle: '用分与合快速计算', page: 'P50', concept: '利用 8、9 的组成计算相关加减法。', scene: '5＋3＝8　9－4＝5', guess: { question: '5 和 4 组成几？', options: ['8', '9', '10'] }, activity: { kind: 'join', prompt: '合并 5 朵红花和 4 朵黄花，验证 5＋4。', emoji: '🌼', a: 5, b: 4 }, reason: { question: '算 9−4 时可以想什么？', options: ['4 和 5 组成 9', '9 比 4 写得大', '从 1 开始乱猜'], answer: 0 }, checkpoint: { question: '8−6 等于？', options: ['1', '2', '3'], answer: 1 }, quick: ['怎样用组成算减法？', '8 的一图四式怎么写？'] }),
  L({ id: 'select-info-eight-nine', title: '选择有用信息解决问题', subtitle: '从复杂图中找到需要的信息', page: 'P51', concept: '图中信息很多时，先看问题，再找和问题有关的整体与部分。', scene: '一共有 9 只鹿　跑走 3 只鹿　还剩？只　（树根有 6 朵蘑菇，还有 8 只天鹅）', guess: { question: '图里有鹿、蘑菇和天鹅，题目问“还剩几只鹿”，先找哪两条信息？', options: ['一共有的鹿和跑走的鹿', '蘑菇和天鹅的数量', '所有动物的颜色'] }, activity: { kind: 'model', prompt: '选择能表示“整体 9 只鹿，跑走 3 只，求还剩”的关系图。', options: ['9 个整体去掉 3 个', '3 个和 9 个合起来', '只画跑走的 3 个'], answer: 0, visual: '整体 9 ｜ 跑走 3 ｜ 剩下？' }, reason: { question: '为什么不能把图里所有数字都拿来计算？', options: ['要先看问题需要什么信息', '数字越多答案越准', '颜色相同才能计算'], answer: 0 }, checkpoint: { question: '8 只天鹅比 6 朵蘑菇多多少？', options: ['2', '8', '14'], answer: 0 }, quick: ['怎样圈出有用信息？', '还能利用天鹅和蘑菇提出什么问题？'] }),
  L({ id: 'ten', title: '10 的认识', subtitle: '满十、数位与组成', page: 'P54', concept: '9 添 1 是 10，10 由 1 个十组成。', scene: '●●●●● ●●●●●　10', guess: { question: '9 再添上 1 是几？', options: ['9', '10', '11'] }, activity: { kind: 'tenframe', prompt: '把最后 1 个圆片放进十格框，正好填满 10 格。', filled: 9, add: 1 }, reason: { question: '为什么把 10 个排成两行五个更容易看？', options: ['结构整齐，能整体看出 10', '圆片会变大', '可以少一个'], answer: 0 }, checkpoint: { question: '10 可以分成 8 和几？', options: ['1', '2', '3'], answer: 1 }, quick: ['10 为什么用两个数字写？', '怎样快速看出 10？'] }),
  L({ id: 'addsub-ten', title: '10 的加、减法', subtitle: '围绕 10 建立算式组', page: 'P56', concept: '根据 10 的组成计算加减法。', scene: '1＋9＝10　10－1＝9', guess: { question: '6 和几组成 10？', options: ['3', '4', '5'] }, activity: { kind: 'tenframe', prompt: '十格框已有 6 个，再补 4 个凑成 10。', filled: 6, add: 4 }, reason: { question: '算 10−6 时可以怎样想？', options: ['6 和 4 组成 10', '10 后面是 11', '只看减号'], answer: 0 }, checkpoint: { question: '3＋7 等于？', options: ['9', '10', '11'], answer: 1 }, quick: ['怎样记住 10 的组成？', '10 的算式有什么规律？'] }),
  L({ id: 'continuous-add-sub', title: '连加、连减', subtitle: '按事情发生顺序计算', page: 'P59', concept: '连续发生两次增加或减少，要从左往右依次计算。', scene: '5＋2＋1　8－2－2', guess: { question: '原来 5 只，先来 2 只，又来 1 只，要计算几次？', options: ['1 次', '2 次', '不用计算'] }, activity: { kind: 'order', prompt: '按“原来—第一次变化—第二次变化”的顺序点亮。', values: [5, 7, 8] }, reason: { question: '连加为什么从左往右算？', options: ['和事情发生顺序一致', '答案会更大', '加号在左边'], answer: 0 }, checkpoint: { question: '2＋3＋4 等于？', options: ['5', '8', '9'], answer: 2 }, quick: ['连加怎样看图？', '连减每一步表示什么？'] }),
  L({ id: 'mixed-add-sub', title: '加减混合', subtitle: '一次增加、一次减少', page: 'P60', concept: '按情境顺序处理增加和减少。', scene: '4＋3－2＝5', guess: { question: '车上原有 4 人，先上来 3 人，又下去 2 人，人数经历了什么变化？', options: ['只增加', '先增加再减少', '只减少'] }, activity: { kind: 'order', prompt: '按 4→7→5 点亮人数变化过程。', values: [4, 7, 5] }, reason: { question: '为什么加减混合也从左往右算？', options: ['按事情发生先后', '先算数字大的', '先算减法'], answer: 0 }, checkpoint: { question: '7−5＋2 等于？', options: ['2', '4', '6'], answer: 1 }, quick: ['怎样分清先加还是先减？', '没有情境时怎样计算？'] }),
  L({ id: 'unit2-review', title: '第二单元整理和复习', subtitle: '串联 6～10 与加减法', page: 'P63', concept: '整理 10 以内数、组成、比较和运算。', scene: '0 1 2 3 4 5 6 7 8 9 10', guess: { question: '10 以内加减法可以借助分与合吗？', options: ['可以', '不可以', '只能借助颜色'] }, activity: { kind: 'order', prompt: '从 6 开始按顺序点亮到 10。', values: [6, 7, 8, 9, 10] }, reason: { question: '把算式按规律整理有什么用？', options: ['看见联系、减少遗漏', '让算式更长', '改变答案'], answer: 0 }, checkpoint: { question: '10−4−4 等于？', options: ['2', '4', '6'], answer: 0 }, quick: ['怎样整理 10 以内算式？', '哪些知识互相有联系？'] }),

  L({ id: 'solid-shapes', title: '认识立体图形', subtitle: '长方体、正方体、圆柱和球', page: 'P67', concept: '根据面的形状、大小和滚动特点辨认立体图形。', scene: '📦　🎲　🥫　⚽', guess: { question: '哪种物体最容易向各个方向滚动？', options: ['长方体', '球', '正方体'] }, activity: { kind: 'sort', prompt: '把生活物品分别放入正确的形状家族。', objects: [{ emoji: '📦', shape: '长方体' }, { emoji: '🎲', shape: '正方体' }, { emoji: '🥫', shape: '圆柱' }, { emoji: '⚽', shape: '球' }] }, reason: { question: '球为什么容易滚动？', options: ['表面是弯曲的', '有很多平平的面', '颜色很亮'], answer: 0 }, checkpoint: { question: '骰子最接近哪种形状？', options: ['正方体', '圆柱', '球'], answer: 0 }, quick: ['圆柱和球哪里不同？', '长方体有哪些特点？'] }),
  L({ id: 'solid-building', title: '立体图形的拼搭', subtitle: '滚动、稳定与组合', page: 'P69', concept: '根据图形特征选择材料并搭得又稳又高。', scene: '📦＋🎲＋🥫 → 🏰', guess: { question: '搭高塔时，哪种图形更适合放在最下面？', options: ['平面稳定的长方体', '容易滚的球', '都一样'] }, activity: { kind: 'model', prompt: '选择更稳的搭法。', options: ['球放最下，盒子放上面', '长方体放最下，圆柱竖放', '所有物体横着滚'], answer: 1, visual: '目标：所有积木都用上，并且又稳又高' }, reason: { question: '怎样判断搭得稳不稳？', options: ['底面平、支撑范围大', '颜色相同', '最上面一定放球'], answer: 0 }, checkpoint: { question: '两个相同正方体并排可能拼成？', options: ['长方体', '球', '圆柱'], answer: 0 }, quick: ['怎样搭得更稳？', '哪些图形可以滚动？'] }),
  L({ id: 'solid-compose', title: '立体图形拼一拼', subtitle: '用正方体拼出不同的长方体', page: 'P71', concept: '相同正方体可以拼出不同形状；转一转后相同的拼法只算一种。', scene: '🎲🎲 → 长方体　｜　4 个 🎲 可以怎样拼？', guess: { question: '两个相同正方体并排放，可以拼成什么？', options: ['长方体', '球', '圆柱'] }, activity: { kind: 'model', prompt: '选择由 4 个相同正方体拼成的长方体。', options: ['2×2 的平面方块', '4 个排成一行的方块', '4 个散开的方块'], answer: 1, visual: '每个小方块都要和另一个小方块贴在一起' }, reason: { question: '为什么把拼好的图形转一转，还是同一种拼法？', options: ['小方块的连接没有改变', '颜色变了一点', '转动会增加方块'], answer: 0 }, checkpoint: { question: '拼一个 2×2×2 的大正方体，至少要几个小正方体？', options: ['4 个', '6 个', '8 个'], answer: 2 }, quick: ['怎样判断两个拼法是不是一样？', '小方块要怎样连接？'] }),

  L({ id: 'ten-again', title: '10 的再认识', subtitle: '10 个一组成 1 个十', page: 'P74', concept: '把 10 个零散物体看成一个整体单位“十”。', scene: '|||||||||| → 1 捆', guess: { question: '数很多小棒时，怎样更清楚？', options: ['10 根捆成一捆', '全部散开放', '只数颜色'] }, activity: { kind: 'count', prompt: '逐根点数 10 根小棒，把它们看成 1 个十。', emoji: '│', total: 10 }, reason: { question: '为什么 10 根要捆成一捆？', options: ['便于按十计数', '小棒会变短', '可以少数几根'], answer: 0 }, checkpoint: { question: '10 个一是？', options: ['1 个一', '1 个十', '10 个十'], answer: 1 }, quick: ['“一”和“十”是什么？', '10 中的 1 表示什么？'] }),
  L({ id: 'eleven-twenty', title: '11～20 的认识', subtitle: '一个十和几个一', page: 'P76', concept: '十几由 1 个十和几个一组成，20 由 2 个十组成。', scene: '1 捆＋5 根＝15', guess: { question: '1 个十和 5 个一组成几？', options: ['10', '15', '51'] }, activity: { kind: 'join', prompt: '把“1 个十”和“5 个一”合到数位框中。', emoji: '🔹', a: 10, b: 5 }, reason: { question: '15 中的 1 和 5 分别表示什么？', options: ['1 个十和 5 个一', '1 个一和 5 个十', '只是两个数字'], answer: 0 }, checkpoint: { question: '2 个十是？', options: ['2', '12', '20'], answer: 2 }, quick: ['十几怎样组成？', '11 中两个 1 一样吗？'] }),
  L({ id: 'order-twenty', title: '0～20 的顺序和比较', subtitle: '数轴、相邻数与接近程度', page: 'P78', concept: '在数线上理解顺序、大小和接近。', scene: '0—1—…—10—…—20', guess: { question: '12 更接近 10 还是 20？', options: ['10', '20', '一样近'] }, activity: { kind: 'order', prompt: '按顺序点亮 10、11、12、13、14、15。', values: [10, 11, 12, 13, 14, 15] }, reason: { question: '数轴上右边的数通常怎样？', options: ['更大', '更小', '没有规律'], answer: 0 }, checkpoint: { question: '19 后面的数是？', options: ['18', '20', '21'], answer: 1 }, quick: ['怎样比较十几的大小？', '什么是相邻数？'] }),
  L({ id: 'simple-addsub-twenty', title: '20 以内简单加、减法', subtitle: '十加几与十几减几', page: 'P81', concept: '利用一个十和几个一直接计算不进位加减法。', scene: '10＋3＝13　13－3＝10', guess: { question: '10 加 3 是多少？', options: ['7', '13', '30'] }, activity: { kind: 'join', prompt: '把 1 个十和 3 个一合起来。', emoji: '🔸', a: 10, b: 3 }, reason: { question: '13−3 为什么等于 10？', options: ['去掉 3 个一，还剩 1 个十', '去掉十位', '13 比 3 大'], answer: 0 }, checkpoint: { question: '15−4 等于？', options: ['9', '11', '19'], answer: 1 }, quick: ['十加几怎样算？', '十几减几为什么简单？'] }),
  L({ id: 'between-positions', title: '两人之间有几人', subtitle: '用序数解决间隔问题', page: 'P82', concept: '区分位置编号与两点之间的数量。', scene: '第10　○○○○　第15', guess: { question: '第 10 人和第 15 人之间包含两端吗？', options: ['包含', '不包含', '只包含第10人'] }, activity: { kind: 'count', prompt: '只点数第 10 与第 15 之间的 4 个人。', emoji: '🧒🏻', total: 4 }, reason: { question: '为什么不是 15−10＝5 人？', options: ['还要去掉一个端点间隔', '因为 5 太大', '序号不能相减'], answer: 0 }, checkpoint: { question: '第4人与第8人之间有几人？', options: ['3', '4', '5'], answer: 0 }, quick: ['“之间”包不包括两端？', '画图怎样帮助理解？'] }),
  L({ id: 'unit4-review', title: '第四单元整理和复习', subtitle: '十、数位与 20 以内数', page: 'P85', concept: '连接十进制结构、读写、顺序和简单计算。', scene: '十位｜个位　1｜8 → 18', guess: { question: '18 由几个十和几个一组成？', options: ['1 个十和 8 个一', '8 个十和 1 个一', '18 个十'] }, activity: { kind: 'order', prompt: '按 16、17、18、19、20 的顺序点亮。', values: [16, 17, 18, 19, 20] }, reason: { question: '比较 17 和 19 先看什么？', options: ['十位，再看个位', '颜色', '数字写得大小'], answer: 0 }, checkpoint: { question: '1 个十和 7 个一是？', options: ['17', '71', '8'], answer: 0 }, quick: ['怎样读写 11～20？', '十位和个位有什么用？'] }),

  L({ id: 'plus-nine', title: '9 加几', subtitle: '拆小数，先凑十', page: 'P88', concept: '从第二个加数分出 1 给 9，先凑成 10。', scene: '9＋4＝9＋1＋3＝13', guess: { question: '算 9＋4 时，先从 4 里分出几给 9？', options: ['1', '2', '3'] }, activity: { kind: 'tenframe', prompt: '九格已满 9 个，先补 1 个凑成 10，再看剩余。', filled: 9, add: 1 }, reason: { question: '为什么先凑成 10？', options: ['10 加几容易计算', '必须改变题目', '9 不能相加'], answer: 0 }, checkpoint: { question: '9＋5 等于？', options: ['13', '14', '15'], answer: 1 }, quick: ['什么是凑十法？', '9 加几为什么分出 1？'] }),
  L({ id: 'plus-eight-seven-six', title: '8、7、6 加几', subtitle: '寻找各自的凑十伙伴', page: 'P92', concept: '8 需要 2、7 需要 3、6 需要 4 才能凑成 10。', scene: '8＋5＝8＋2＋3＝13', guess: { question: '8 还差几凑成 10？', options: ['1', '2', '3'] }, activity: { kind: 'tenframe', prompt: '十格框已有 8 个，补 2 个先凑十。', filled: 8, add: 2 }, reason: { question: '算 7＋5 时先给 7 几个？', options: ['2', '3', '4'], answer: 1 }, checkpoint: { question: '6＋8 等于？', options: ['12', '13', '14'], answer: 2 }, quick: ['每个数的凑十伙伴是谁？', '怎样拆第二个加数？'] }),
  L({ id: 'plus-eight-nine-strategies', title: '8＋9 的多种算法', subtitle: '给 8 凑十，或给 9 凑十', page: 'P92', concept: '8＋9 可以从 9 中拿 2 给 8，也可以从 8 中拿 1 给 9；两种拆分都不改变总数。', scene: '8＋9＝8＋2＋7＝17　或　9＋1＋7＝17', guess: { question: '8＋9 中，想先给 8 凑成 10，要从 9 里拿几个？', options: ['1 个', '2 个', '3 个'] }, activity: { kind: 'tenframe', prompt: '先给 8 补 2 个凑成 10，再看 9 里还剩多少个。', filled: 8, add: 2 }, reason: { question: '为什么给 8 凑十和给 9 凑十都能算对？', options: ['只是把同一总数分成了不同部分', '两个数会自动变小', '因为 8 和 9 一样大'], answer: 0 }, checkpoint: { question: '8＋9 等于？', options: ['16', '17', '18'], answer: 1 }, quick: ['两种凑十路线有什么相同？', '哪一种方法你更容易讲清楚？'] }),
  L({ id: 'plus-five-four-three-two', title: '5、4、3、2 加几', subtitle: '交换位置，选择更快算法', page: 'P94', concept: '利用交换两个加数结果不变，把小数加大数转化为熟悉算式。', scene: '5＋8＝8＋5＝13', guess: { question: '5＋8 可以转化成哪个更熟悉的算式？', options: ['8＋5', '8−5', '5＋5'] }, activity: { kind: 'join', prompt: '把 5 个和 8 个学具合起来，再交换两组位置观察总数。', emoji: '⭐', a: 5, b: 8 }, reason: { question: '交换两个加数位置后为什么和不变？', options: ['两部分数量没有改变', '加号变成减号', '大数会消失'], answer: 0 }, checkpoint: { question: '4＋9 等于？', options: ['12', '13', '14'], answer: 1 }, quick: ['什么时候交换位置更快？', '加数交换后什么不变？'] }),
  L({ id: 'solve-total', title: '求一共有多少', subtitle: '找信息、找问题、列加法', page: 'P96', concept: '把两个部分合起来解决总数问题。', scene: '男生 5 人＋女生 7 人＝？人', guess: { question: '求男生和女生一共有多少人，用什么法？', options: ['加法', '减法', '比较法'] }, activity: { kind: 'model', prompt: '选择与画面数量关系一致的线段模型。', options: ['两部分合成一个整体', '从整体去掉一部分', '只画一个部分'], answer: 0, visual: '男生 5｜女生 7 → 一共？' }, reason: { question: '为什么用加法？', options: ['求两个部分合起来的总数', '求剩余', '求谁更高'], answer: 0 }, checkpoint: { question: '5＋7 等于？', options: ['11', '12', '13'], answer: 1 }, quick: ['怎样找题里的信息？', '“一共”一定用加法吗？'] }),
  L({ id: 'find-original', title: '求原来有多少', subtitle: '领走与剩下共同组成原数', page: 'P98', concept: '已知拿走的一部分和剩下的一部分，求原来的整体要用加法。', scene: '领走 6 个＋剩下 5 个＝原来？', guess: { question: '领走 6 个，还剩 5 个，原来的数量比 5 大还是小？', options: ['更大', '更小', '相同'] }, activity: { kind: 'join', prompt: '把“领走的 6 个”和“剩下的 5 个”重新合起来。', emoji: '🍎', a: 6, b: 5 }, reason: { question: '题目有“领走”，为什么仍用加法？', options: ['求原来的整体，要合并两个部分', '看到领走都用减法', '因为答案超过 10'], answer: 0 }, checkpoint: { question: '吃了 8 个，还剩 5 个，原来有几个？', options: ['3', '12', '13'], answer: 2 }, quick: ['为什么“领走”也可能用加法？', '怎样画部分整体图？'] }),
  L({ id: 'addition-table', title: '20 以内进位加法表', subtitle: '按和整理、发现规律', page: 'P100', concept: '把进位加法按第一个加数或得数整理成表。', scene: '9＋2　8＋3　7＋4　…＝11', guess: { question: '把和相同的算式放一起，容易发现规律吗？', options: ['容易', '不容易', '会改变答案'] }, activity: { kind: 'order', prompt: '按得数 11、12、13、14、15 点亮算式组。', values: [11, 12, 13, 14, 15] }, reason: { question: '整理加法表有什么用？', options: ['发现规律、帮助熟练计算', '让算式答案变大', '只为了装饰'], answer: 0 }, checkpoint: { question: '和是 13 的算式是？', options: ['8＋5', '8＋4', '9＋5'], answer: 0 }, quick: ['加法表怎样整理？', '斜着看有什么规律？'] }),
  L({ id: 'unit5-review', title: '第五单元整理和复习', subtitle: '凑十、交换与解决问题', page: 'P99', concept: '比较不同进位加法策略，并用模型解决问题。', scene: '拆小数→凑成10→加剩余', guess: { question: '进位加法的关键中间数通常是？', options: ['5', '10', '20'] }, activity: { kind: 'tenframe', prompt: '十格框已有 7 个，补 3 个完成一次凑十。', filled: 7, add: 3 }, reason: { question: '选择算法时最重要的是什么？', options: ['能说清数量关系且算得正确', '步骤越多越好', '只能用一种方法'], answer: 0 }, checkpoint: { question: '8＋9 等于？', options: ['16', '17', '18'], answer: 1 }, quick: ['凑十法分几步？', '怎样检查进位加法？'] }),

  L({ id: 'review-numbers', title: '复习与关联：数与运算', subtitle: '0～20、数位与计算方法', page: 'P103', concept: '把本册数的认识、组成、顺序和计算连成知识图。', scene: '0～20　组成　比较　加减', guess: { question: '“10 个一是 1 个十”属于哪部分知识？', options: ['数位', '图形', '位置'] }, activity: { kind: 'order', prompt: '依次点亮 5、10、15、20，观察每次增加 5。', values: [5, 10, 15, 20] }, reason: { question: '为什么要把知识连接起来？', options: ['遇到新问题能调用相关方法', '让页数更多', '只记一个答案'], answer: 0 }, checkpoint: { question: '18 由什么组成？', options: ['1 个十和 8 个一', '8 个十和 1 个一', '18 个十'], answer: 0 }, quick: ['这学期认识了哪些数？', '计算方法之间有什么联系？'] }),
  L({ id: 'review-relations', title: '复习与关联：数量关系', subtitle: '看图、提问与选择运算', page: 'P105', concept: '根据部分整体关系决定使用加法还是减法。', scene: '部分＋部分＝整体　整体－部分＝部分', guess: { question: '求一共通常关注什么关系？', options: ['部分合成整体', '整体去掉部分', '前后位置'] }, activity: { kind: 'model', prompt: '选择“已知整体和一部分，求另一部分”的模型。', options: ['整体－已知部分＝未知部分', '部分＋部分＝已知部分', '只比较两个数字'], answer: 0, visual: '整体 10｜已知 4｜未知？' }, reason: { question: '为什么不能只看关键词选运算？', options: ['要看信息之间的数量关系', '关键词都没有用', '加减法答案一样'], answer: 0 }, checkpoint: { question: '一共 10 只，走了 4 只，还剩几只？', options: ['6', '10', '14'], answer: 0 }, quick: ['怎样画部分整体图？', '什么时候用减法？'] }),
  L({ id: 'review-shapes', title: '复习与关联：立体图形', subtitle: '辨认、拼搭与空间想象', page: 'P105', concept: '综合使用图形特征进行分类与拼搭。', scene: '📦 🎲 🥫 ⚽ → 分类与拼搭', guess: { question: '搭建时要先考虑图形的什么？', options: ['形状和稳定性', '名称长短', '颜色深浅'] }, activity: { kind: 'sort', prompt: '再次把四种生活物品送回正确形状家族。', objects: [{ emoji: '🧱', shape: '长方体' }, { emoji: '🎲', shape: '正方体' }, { emoji: '🛢️', shape: '圆柱' }, { emoji: '🏀', shape: '球' }] }, reason: { question: '圆柱怎样放更稳定？', options: ['平面朝下', '曲面朝下', '怎样都一样'], answer: 0 }, checkpoint: { question: '最容易向各个方向滚动的是？', options: ['球', '正方体', '长方体'], answer: 0 }, quick: ['四种立体图形怎样分？', '拼搭时怎样选择底座？'] }),
  L({ id: 'review-application', title: '应用提升与自我评价', subtitle: '综合应用并反思学习方法', page: 'P106', concept: '在表格、算式、图形和问题情境中综合运用本册知识。', scene: '📊　🔢　🧩　🌟', guess: { question: '遇到综合问题时第一步做什么？', options: ['看清信息和问题', '马上猜答案', '只看数字最大的'] }, activity: { kind: 'model', prompt: '选择完整的解决问题流程。', options: ['读题→操作或画图→列式→检查', '猜答案→结束', '只列式不看问题'], answer: 0, visual: '信息 → 关系 → 方法 → 检查' }, reason: { question: '自我评价最重要的作用是什么？', options: ['知道会什么、还要练什么', '只给自己满分', '和别人比速度'], answer: 0 }, checkpoint: { question: '检查答案时应回到哪里？', options: ['原问题和数量关系', '只看书写颜色', '重新猜一次'], answer: 0 }, quick: ['怎样整理自己的收获？', '遇到不会的题怎么办？'] }),
];

const core = (id: string, title: string, subtitle: string) => ({ id, title, subtitle });
const ext = (...ids: string[]) => ids.map((id) => {
  const lesson = EXTENDED_MATH_LESSONS.find((item) => item.id === id);
  if (!lesson) throw new Error(`Missing math lesson: ${id}`);
  return lesson;
});

const MATH_UPPER_UNIT_DRAFTS: MathUnit[] = [
  { no: '数学游戏', title: '在校园里找数学', page: 'P1', color: 'sky', lessons: [core('campus', '在校园里找一找', '数量、形状和位置'), ...ext('playground', 'classroom-discover', 'classroom-games', 'learning-readiness')] },
  { no: '一', title: '5 以内数的认识和加、减法', page: 'P12', color: 'gold', lessons: [core('numbers', '1～5 的认识', '实物、点子、数字与书写'), core('compare', '比大小', '一一对应'), core('ordinal', '第几', '总数与次序'), core('compose', '分与合', '整体与部分'), ...ext('add-within-5', 'subtract-within-5', 'zero', 'unit1-review')] },
  { no: '二', title: '6～10 的认识和加、减法', page: 'P34', color: 'mint', lessons: ext('six-to-nine', 'compare-order-nine', 'compose-six-nine', 'addsub-six-seven', 'solve-total-within-7', 'solve-remain-within-7', 'addsub-eight-nine', 'select-info-eight-nine', 'ten', 'addsub-ten', 'continuous-add-sub', 'mixed-add-sub', 'unit2-review') },
  { no: '三', title: '认识立体图形', page: 'P67', color: 'violet', lessons: ext('solid-shapes', 'solid-building', 'solid-compose') },
  { no: '四', title: '11～20 的认识', page: 'P73', color: 'coral', lessons: ext('ten-again', 'eleven-twenty', 'order-twenty', 'simple-addsub-twenty', 'between-positions', 'unit4-review') },
  { no: '五', title: '20 以内的进位加法', page: 'P88', color: 'blue', lessons: ext('plus-nine', 'plus-eight-seven-six', 'plus-eight-nine-strategies', 'plus-five-four-three-two', 'solve-total', 'find-original', 'addition-table', 'unit5-review') },
  { no: '六', title: '复习与关联', page: 'P103', color: 'slate', lessons: ext('review-numbers', 'review-relations', 'review-shapes', 'review-application') },
];

/**
 * 目录页的页码必须来自逐页覆盖台账，而不是只显示单元起始页。
 * 同一课承担的分散练习页会明确列出，例如 P22–23、P28–29、P31–33。
 */
const textbookPageLabel = (lessonId: string) => {
  const pageNumbers = [...new Set(MATH_G1_UPPER_COVERAGE
    .filter((entry) => entry.ownerLessonId === lessonId)
    .flatMap((entry) => entry.pages))].sort((left, right) => left - right);
  if (!pageNumbers.length) return undefined;
  const ranges: Array<[number, number]> = [];
  pageNumbers.forEach((page) => {
    const last = ranges[ranges.length - 1];
    if (last && page === last[1] + 1) last[1] = page;
    else ranges.push([page, page]);
  });
  return ranges.map(([start, end]) => start === end ? `P${start}` : `P${start}–${end}`).join('、');
};

export const MATH_UPPER_UNITS: MathUnit[] = MATH_UPPER_UNIT_DRAFTS.map((unit) => ({
  ...unit,
  lessons: unit.lessons.map((lesson) => ({ ...lesson, page: textbookPageLabel(lesson.id) ?? lesson.page ?? unit.page })),
}));

const CORE_LESSON_TASKS: Record<string, { tasks: MathTextbookTask[]; practiceGroups: MathPracticeGroup[] }> = {
  campus: {
    tasks: [
      { id: 'campus-floor', title: '数教学楼层数', evidence: '从底层入口逐层点数至第 4 层。', required: true },
      { id: 'campus-observe', title: '校园数学观察', evidence: '分别识别国旗数量、窗户形状和教室位置。', required: true },
    ],
    practiceGroups: [{ id: 'campus-basic', title: '数量、形状与位置', mode: '基础练习', evidence: '完成三个校园观察任务。' }],
  },
  numbers: {
    tasks: [
      { id: 'numbers-abacus', title: '1～5 拨珠', evidence: '依次拨出 1～5，并对应实物、点子和数字。', required: true },
      { id: 'numbers-represent', title: '多表征表示', evidence: '完成点子、方块和数字的对应任务。', required: true },
    ],
    practiceGroups: [{ id: 'numbers-writing', title: '数字书写与表示', mode: '基础练习', evidence: '笔顺示范、描写和数写对应。' }],
  },
  compare: {
    tasks: [
      { id: 'compare-match', title: '一一对应配对', evidence: '小猴与水果完成逐一配对。', required: true },
      { id: 'compare-symbol', title: '比较与符号', evidence: '根据剩余判断多、少、同样多并选择符号。', required: true },
    ],
    practiceGroups: [{ id: 'compare-basic', title: '比较练习', mode: '基础练习', evidence: '比较不同数量并读写＞、＜、＝。' }],
  },
  ordinal: {
    tasks: [
      { id: 'ordinal-direction', title: '确定方向找位置', evidence: '选择起点并找出第 2 个人。', required: true },
      { id: 'ordinal-distinguish', title: '区分几个和第几', evidence: '说明总数、位置和前后人数。', required: true },
    ],
    practiceGroups: [{ id: 'ordinal-basic', title: '序数练习', mode: '基础练习', evidence: '变换方向后确定第几个。' }],
  },
  compose: {
    tasks: [
      { id: 'compose-drag', title: '拖分 5 个玉米', evidence: '将 5 个玉米全部分入两个篮子。', required: true },
      { id: 'compose-record', title: '记录分合关系', evidence: '补全 5 的分法并判断能否均分。', required: true },
    ],
    practiceGroups: [{ id: 'compose-basic', title: '分与合练习', mode: '基础练习', evidence: '正向、反向说出整体和部分。' }],
  },
};

/** 供课程页面、台账与测试共同使用的课程任务蓝图。 */
export const MATH_LESSON_TASKS: Record<string, { tasks: MathTextbookTask[]; practiceGroups: MathPracticeGroup[] }> = {
  ...Object.fromEntries(EXTENDED_MATH_LESSONS.map((lesson) => [lesson.id, { tasks: lesson.tasks, practiceGroups: lesson.practiceGroups }])),
  ...CORE_LESSON_TASKS,
};

/** 真实性审计入口：此列表非空即表示仍有课程使用旧通用任务壳。 */
export const MATH_TEMPLATE_TASK_LESSON_IDS = EXTENDED_MATH_LESSONS
  .filter((lesson) => lesson.taskBlueprintSource === 'template')
  .map((lesson) => lesson.id);

export const ALL_MATH_LESSONS = MATH_UPPER_UNITS.flatMap((unit) => unit.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, subtitle: lesson.subtitle, unitNo: unit.no, unitTitle: unit.title })));
import { MATH_G1_UPPER_COVERAGE } from './mathTextbookCoverage';
