import { ALL_MATH_LESSONS } from './mathUpperCurriculum';

export type MathFamily = 'campus' | 'count' | 'games' | 'direction' | 'instruction' | 'readiness' | 'compare' | 'ordinal' | 'compose' | 'add' | 'subtract' | 'zero' | 'family' | 'total' | 'remain' | 'filter' | 'ten' | 'chain' | 'mixed' | 'shape' | 'building' | 'solid-compose' | 'place' | 'order' | 'simple' | 'between' | 'ten-add' | 'original' | 'table' | 'review' | 'relations' | 'application';
export type MathVisualObject = { kind: 'cup' | 'lid' | 'block' | 'flower' | 'disc' | 'stick' | 'flowerpot' | 'fish' | 'plate' | 'pencil-case'; label: string; size?: 'large' | 'small' };
export type MathVisual = {
  kind: 'dots' | 'parts' | 'take' | 'ten' | 'place' | 'bundle' | 'queue' | 'positions' | 'shape' | 'sequence';
  a: number; b?: number; label?: string;
  /** 题干中的具体物品由出题处指定，不通过题干猜测或统一替换为点子。 */
  objects?: [MathVisualObject, MathVisualObject?]; groupLabels?: [string, string?]; spaced?: boolean;
};
const MATERIALS = {
  cup: { kind: 'cup', label: '杯子' }, lid: { kind: 'lid', label: '盖子' }, block: { kind: 'block', label: '积木' },
  flower: { kind: 'flower', label: '小花' }, disc: { kind: 'disc', label: '圆片' }, stick: { kind: 'stick', label: '小棒' },
  flowerpot: { kind: 'flowerpot', label: '花盆' }, fish: { kind: 'fish', label: '鱼' }, plate: { kind: 'plate', label: '盘子' },
  pencilCase: { kind: 'pencil-case', label: '笔袋' },
} satisfies Record<string, MathVisualObject>;
export type MathQuestion = {
  id: string; lessonId: string; objective: string; prompt: string; kind: 'number' | 'choice' | 'expression';
  answer: string; options?: string[]; visual?: MathVisual; hint: string;
  /** 数域验收使用结构化数据，不解析题干中的时间和编号。 */
  numbers: number[]; relation?: { a: number; b: number; operation: '+' | '-'; result: number };
  misconceptions?: Record<string, { diagnosis: string; remedy: string }>;
  transfer?: boolean;
};
export type MathTeaching = {
  lessonId: string; family: MathFamily; max: number; goals: [string, string, string]; prerequisite?: string;
  reasonChecks: [string, string, string];
};

const GOALS: Record<MathFamily, [string, string, string]> = {
  campus: ['确定观察对象并点数', '辨认生活中的形状', '以参照物描述位置'],
  count: ['一物一数并说出总数', '实物和数字相互对应', '摆放改变时判断数量'],
  games: ['按人数规则分组', '延续重复图形规律', '比较两组数量'],
  direction: ['以参照物判断左右', '改变朝向后描述位置', '按方向找到位置'],
  instruction: ['分清动作工具与对象', '听清对象与方向', '合并不同颜色的数量'],
  readiness: ['区分时间与数量', '按参照物摆放物品', '按顺序完成准备'],
  compare: ['比较实际数量', '正确使用比较符号', '通过配对判断相差数量'],
  ordinal: ['确定起点找第几', '改变方向重新定位', '区分总数与位置'],
  compose: ['根据整体找另一部分', '反向合成整体', '有序发现不同分法'],
  add: ['合并两部分求总数', '由情境建立加法算式', '交换两部分验证总数'],
  subtract: ['去掉一部分求剩余', '由情境建立减法算式', '把两部分合回整体检查'],
  zero: ['全部拿走后用0表示', '计算一个数加减0', '区分空数量与起点'],
  family: ['用组成计算加减', '按问题写相关算式', '反向求缺少的部分'],
  total: ['找到两个不重叠部分', '建立求整体的算式', '在新情境中求总数'],
  remain: ['找到整体与去掉部分', '建立求剩余的算式', '用加法检查剩余'],
  filter: ['从复杂信息中选已知量', '按问题建立数量关系', '排除无关信息求剩余'],
  ten: ['找出组成10的伙伴', '用组成计算10的加减', '验证两部分合成10'],
  chain: ['按先后求中间数量', '计算连续两次变化', '建立连算与故事对应'],
  mixed: ['分清先加还是先减', '计算每一步后的数量', '建立混合算式与故事对应'],
  shape: ['按特征辨认立体图形', '改变朝向仍能辨认', '用平面与曲面判断滚动'],
  building: ['依据支撑选择底座', '调整朝向保持稳定', '检查连接与搭建成果'],
  'solid-compose': ['判断贴合后的图形', '按层数计算所用小方块', '转动后判断连接不变'],
  place: ['十个一换成一个十', '按十和一读写数量', '拆开整十仍保持数量'],
  order: ['确定相邻数', '在数线上比较大小', '判断数到整十的距离'],
  simple: ['按十和一计算加法', '保留整十计算减法', '用数量关系检查结果'],
  between: ['确定两端的位置', '只数两端之间的人', '迁移到页码与站点'],
  'ten-add': ['拆分加数计算完整结果', '凑十后保留剩余', '换一种正确算法检查'],
  original: ['识别所求是原来整体', '合并拿走与剩余列式', '放回原情境检查答案'],
  table: ['计算进位加法', '发现同和算式规律', '补全未知加数'],
  review: ['连接组成与运算', '独立计算并检查', '迁移到新数量情境'],
  relations: ['分清整体与两个部分', '按所求选择加减', '反向检查数量关系'],
  application: ['从信息提出可解问题', '建立算式并解答', '综合使用数与空间知识'],
};

const REGISTRY: Record<string, [MathFamily, number, string?]> = {
  campus: ['campus', 5], playground: ['games', 5, 'campus'], 'classroom-discover': ['direction', 5, 'campus'],
  'classroom-games': ['instruction', 5, 'classroom-discover'], 'learning-readiness': ['readiness', 5, 'classroom-discover'],
  numbers: ['count', 5], compare: ['compare', 5, 'numbers'], ordinal: ['ordinal', 5, 'numbers'], compose: ['compose', 5, 'numbers'],
  'add-within-5': ['add', 5, 'compose'], 'subtract-within-5': ['subtract', 5, 'compose'], zero: ['zero', 5, 'subtract-within-5'], 'unit1-review': ['review', 5, 'compose'],
  'six-to-nine': ['count', 9, 'numbers'], 'compare-order-nine': ['compare', 9, 'ordinal'], 'compose-six-nine': ['compose', 9, 'compose'],
  'addsub-six-seven': ['family', 7, 'compose-six-nine'], 'solve-total-within-7': ['total', 7, 'add-within-5'], 'solve-remain-within-7': ['remain', 7, 'subtract-within-5'],
  'addsub-eight-nine': ['family', 9, 'compose-six-nine'], 'select-info-eight-nine': ['filter', 9, 'solve-remain-within-7'],
  ten: ['ten', 10, 'compose-six-nine'], 'addsub-ten': ['ten', 10, 'ten'], 'continuous-add-sub': ['chain', 10, 'addsub-ten'], 'mixed-add-sub': ['mixed', 10, 'continuous-add-sub'], 'unit2-review': ['review', 10, 'addsub-ten'],
  'solid-shapes': ['shape', 10], 'solid-building': ['building', 10, 'solid-shapes'], 'solid-compose': ['solid-compose', 10, 'solid-shapes'],
  'ten-again': ['place', 10, 'ten'], 'eleven-twenty': ['place', 20, 'ten-again'], 'order-twenty': ['order', 20, 'six-to-nine'],
  'simple-addsub-twenty': ['simple', 20, 'eleven-twenty'], 'between-positions': ['between', 20, 'ordinal'], 'unit4-review': ['place', 20, 'eleven-twenty'],
  'plus-nine': ['ten-add', 20, 'ten'], 'plus-eight-seven-six': ['ten-add', 20, 'plus-nine'], 'plus-eight-nine-strategies': ['ten-add', 20, 'plus-eight-seven-six'],
  'plus-five-four-three-two': ['ten-add', 20, 'plus-eight-seven-six'], 'solve-total': ['total', 20, 'solve-total-within-7'], 'find-original': ['original', 20, 'compose-six-nine'],
  'addition-table': ['table', 20, 'plus-eight-seven-six'], 'unit5-review': ['ten-add', 20, 'find-original'],
  'review-numbers': ['review', 20, 'eleven-twenty'], 'review-relations': ['relations', 20, 'find-original'], 'review-shapes': ['shape', 10, 'solid-compose'], 'review-application': ['application', 20, 'review-relations'],
};

const reasonChecks = (family: MathFamily): [string, string, string] => {
  if (['shape', 'building', 'solid-compose'].includes(family)) return ['指出图形的面或连接特征', '说明转动、滚动或支撑的变化', '用实际拼搭或观察检查想法'];
  if (['direction', 'instruction', 'ordinal', 'between', 'readiness'].includes(family)) return ['指出参照物或计数起点', '说明方向、顺序或两端', '在图上指出自己的判断依据'];
  if (family === 'ten-add' || family === 'table') return ['说出给谁凑十和从哪里分', '指出移动后剩余的数量', '说明凑十后加上剩余且总量不变'];
  if (family === 'place') return ['指出十和一分别是多少', '说明一捆与十根是同一个量', '将拆开或捆起后的数与原数量对应'];
  return ['指出题目中的已知数量和问题', '说明操作与数量关系', '用图、实物或算式检查结论'];
};

export const MATH_TEACHING: Record<string, MathTeaching> = Object.fromEntries(ALL_MATH_LESSONS.map(({ id }) => {
  const row = REGISTRY[id];
  if (!row) throw new Error(`数学课缺少教学目标：${id}`);
  const [family, max, prerequisite] = row;
  return [id, { lessonId: id, family, max, goals: GOALS[family], prerequisite, reasonChecks: reasonChecks(family) }];
}));

export function mathSeed(seed: string): number {
  let value = 2166136261;
  for (const char of seed) value = Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0;
  return value;
}

/** 同一道题显示期间排序不变；新题与新一轮复习使用新的种子。 */
export function mathOptions<T>(items: readonly T[], seed: string): T[] {
  const result = [...items]; let state = mathSeed(seed);
  for (let index = result.length - 1; index > 0; index--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const target = state % (index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

/** 每课按明确目标出题；variant 改变数字、物品与问法，核心数域不升级。 */
export function mathQuestions(lessonId: string, variant = 0): MathQuestion[] {
  const teaching = MATH_TEACHING[lessonId];
  if (!teaching) return [];
  const { family, max, goals } = teaching;
  const v = Math.abs(Math.floor(variant));
  const total = Math.min(max, 3 + v % Math.max(1, max - 2));
  const part = 1 + (v + 1) % (total - 1);
  const other = total - part;
  const material = [MATERIALS.cup, MATERIALS.block, MATERIALS.flower, MATERIALS.disc][v % 4];
  const item = material.label;
  const make = (index: number, prompt: string, answer: string | number, kind: MathQuestion['kind'] = 'number', extra: Partial<MathQuestion> = {}): MathQuestion => ({
    id: `${lessonId}:${v}:${index}`, lessonId, objective: goals[index % 3], prompt, kind, answer: String(answer),
    hint: '先指出已知信息和所求，再用图或实物检查。', numbers: [], transfer: index >= 2, ...extra,
  });
  const num = (i: number, prompt: string, answer: number, numbers: number[], visual?: MathVisual, hint?: string) => make(i, prompt, answer, 'number', { numbers, visual, ...(hint ? { hint } : {}) });
  const choice = (i: number, prompt: string, answer: string, options: string[], extra: Partial<MathQuestion> = {}) => make(i, prompt, answer, 'choice', { options: mathOptions([...new Set(options)], `${lessonId}:${v}:${i}`), ...extra });
  const equation = (i: number, prompt: string, a: number, b: number, operation: '+' | '-', visual?: MathVisual) => {
    const result = operation === '+' ? a + b : a - b;
    return make(i, prompt, `${a}${operation}${b}=${result}`, 'expression', { numbers: [a, b, result], relation: { a, b, operation, result }, visual, hint: operation === '+' ? '两个部分合起来是整体。把所求量放在等号后。' : '从整体中去掉已知部分。把所求量放在等号后。' });
  };
  if (family === 'count') return [
    num(0, `点数图中的${item}，最后一个数词是多少？`, total, [total], { kind: 'dots', a: total, objects: [material] }, '一个物体对应一个数词，最后一个数词表示总数。'),
    num(1, `请写出与这组点子数量相同的数字。`, total - 1, [total - 1], { kind: 'dots', a: total - 1 }),
    choice(2, `同样的 ${total} 个${item}，只把它们拉开，数量会怎样？`, '仍然一样多', ['仍然一样多', '变多了', '变少了'], { numbers: [total], visual: { kind: 'dots', a: total, objects: [material], spaced: true, label: '同一组，只改变间距' }, hint: '看看有没有增加或拿走物体。' }),
    num(3, `一组有 ${total - 1} 个，添 1 个后有几个？`, total, [total - 1, 1, total]),
    num(4, `已经有 5 个一组，旁边还有 ${Math.max(0, total - 5)} 个，共几个？`, total < 5 ? total : total, total < 5 ? [total] : [5, total - 5, total], { kind: 'parts', a: 5, b: Math.max(0, total - 5) }),
  ].map((q, i) => i === 4 && total < 5 ? num(4, '请看另一种排列，写出总数。', total, [total], { kind: 'dots', a: total }) : q);
  if (family === 'compare') return [
    choice(0, `${total} 个杯子和 ${total - 1} 个盖子，哪组更多？`, '杯子', ['杯子', '盖子', '同样多'], { numbers: [total, total - 1], visual: { kind: 'parts', a: total, b: total - 1, objects: [MATERIALS.cup, MATERIALS.lid] }, hint: '一个杯子对一个盖子，哪边有剩余？' }),
    choice(1, `${total - 1} ○ ${total}，填什么符号？`, '＜', ['＜', '＞', '＝'], { numbers: [total - 1, total] }),
    num(2, `${total} 个杯子，每个配一个盖子，已有 ${part} 个盖子，还缺几个？`, other, [total, part, other], { kind: 'parts', a: total, b: part, objects: [MATERIALS.cup, MATERIALS.lid] }),
    choice(3, '四个大圆片与四个小圆片，哪组更多？', '同样多', ['大圆片', '小圆片', '同样多'], { numbers: [4], visual: { kind: 'parts', a: 4, b: 4, objects: [{ ...MATERIALS.disc, label: '大圆片', size: 'large' }, { ...MATERIALS.disc, label: '小圆片', size: 'small' }] } }),
    ...(lessonId === 'compare-order-nine' ? [num(4, `从左起给这 ${total} 人编号，从右第 2 人的编号是多少？`, total - 1, [total, 2, total - 1], { kind: 'queue', a: total })] : [choice(4, `${part} 和 ${part} 的大小关系？`, '＝', ['＜', '＞', '＝'], { numbers: [part] })]),
  ];
  if (family === 'ordinal') return [
    num(0, `从左开始数，编号 ${part} 的人是第几人？`, part, [total, part], { kind: 'queue', a: total }),
    num(1, `这队人从左编号。从右第 2 人的编号是多少？`, total - 1, [total, 2, total - 1], { kind: 'queue', a: total }, '从右端开始，一个人一个位置地数。'),
    num(2, `图中一共有几人？`, total, [total], { kind: 'queue', a: total }),
    num(3, `从左第 ${part} 人前面有几人？`, part - 1, [part, part - 1], { kind: 'queue', a: total }),
    choice(4, '从另一端开始数，队伍的总人数会改变吗？', '不会改变', ['不会改变', '一定多1人', '一定少1人']),
  ];
  if (family === 'compose') return [
    num(0, `${total} 个${item}分两组，一组 ${part} 个，另一组几个？`, other, [total, part, other], { kind: 'parts', a: part, b: other, objects: [material] }),
    num(1, `${part} 和 ${other} 组成几？`, total, [part, other, total]),
    num(2, `把 ${total} 分两组，左边从 ${part} 增加到 ${part + 1}，右边还剩几个？`, other - 1, [total, part, part + 1, other - 1]),
    num(3, `左边 ${other} 个、右边 ${part} 个，交换后总数几个？`, total, [other, part, total]),
    num(4, `${total} 个都放左边，右边用哪个数表示？`, 0, [total, 0]),
  ];
  if (['add', 'total', 'original', 'subtract', 'remain', 'filter', 'family', 'relations', 'review', 'application'].includes(family)) {
    const subtract = ['subtract', 'remain', 'filter'].includes(family);
    const original = family === 'original';
    const situation = original ? `领走 ${part} 个${item}，还剩 ${other} 个，原来有多少？` : subtract ? `原来 ${total} 个${item}，拿走 ${part} 个，还剩多少？` : `一组 ${part} 个${item}，另一组 ${other} 个，合起来多少？`;
    const info = family === 'filter' ? `旁边还有 ${Math.min(max, part + 1)} 本书。` : '';
    const qs = [
      num(0, `${info}${situation}`, subtract ? other : total, [total, part, other, ...(info ? [Math.min(max, part + 1)] : [])], { kind: subtract ? 'take' : 'parts', a: subtract ? total : part, b: subtract ? part : other, objects: [material], ...(original ? { groupLabels: ['领走的', '剩下的'] } : {}) }),
      equation(1, `请为这个问题写一道有答案的算式：${situation}`, subtract ? total : part, subtract ? part : other, subtract ? '-' : '+'),
      num(2, original ? `又一盒领走 ${other} 个，剩 ${part} 个，原来几个？` : `一共 ${total} 个，一组 ${other} 个，另一组几个？`, original ? total : part, [total, part, other]),
      equation(3, original ? `原来 ${total} 个，领走 ${part} 个，写算式检查剩余。` : `拿走 ${part} 个，还剩 ${other} 个，写加法检查原有总数。`, original ? total : part, original ? part : other, original ? '-' : '+'),
      num(4, `用 ${part} 和 ${other} 两组${item}摆一摆，写出总数。`, total, [part, other, total], { kind: 'parts', a: part, b: other, objects: [material] }),
    ];
    if (family === 'filter') {
      qs[0] = choice(0, `还剩几只鹿？原有 ${total} 只鹿，走了 ${part} 只，旁边有 ${other} 朵花。该用哪两条信息？`, '原有的鹿和走掉的鹿', ['原有的鹿和走掉的鹿', '走掉的鹿和花', '原有的鹿和花'], { numbers: [total, part, other], hint: '问题问鹿，找同一整体的数量和变化。' });
      qs[2] = num(2, `原有 ${total} 只鹿，走了 ${part} 只，旁边 ${other} 朵花，还剩几只鹿？`, other, [total, part, other]);
    }
    if (family === 'total') qs[0] = choice(0, `一组 ${part} 个，另一组 ${other} 个。求一共，应合并哪两个部分？`, `${part} 和 ${other}`, [`${part} 和 ${other}`, `${total} 和 ${part}`, `${total} 和 ${other}`], { numbers: [part, other, total] });
    if (family === 'original') qs[0] = choice(0, `领走 ${part} 个，还剩 ${other} 个，问原来多少，要求的是？`, '原来的整体', ['原来的整体', '剩下的一部分', '领走的一部分'], { numbers: [part, other] });
    if (family === 'remain') qs[0] = num(0, `原来 ${total} 个，拿走 ${part} 个。这个故事的整体是几个？`, total, [total, part]);
    if (family === 'family') qs[0] = num(0, `${total}－${part}＝？可想 ${part} 和几组成 ${total}。`, other, [total, part, other]);
    if (family === 'relations') qs[0] = choice(0, `一共 ${total} 个，一组 ${part} 个，另一组未知。这里的整体是？`, String(total), [String(total), String(part), String(other)], { numbers: [total, part, other] });
    if (family === 'family' || family === 'relations') qs[2] = equation(2, `一共 ${total} 个，其中一组 ${part} 个，请写求另一组的算式。`, total, part, '-');
    if (family === 'add') qs[2] = equation(2, `交换两组后，${other} 个和 ${part} 个合起来，写算式验证总数。`, other, part, '+');
    if (family === 'subtract' || family === 'remain') qs[2] = equation(2, `拿走 ${part} 个，剩 ${other} 个，写加法检查原有总数。`, part, other, '+');
    if (family === 'total') qs[2] = num(2, `换一个故事：${part} 个杯子与 ${other} 个盘子，合起来几件？`, total, [part, other, total]);
    if (family === 'original') qs[2] = equation(2, `算出原来 ${total} 个，领走 ${part} 个，请写算式检查是否还剩 ${other} 个。`, total, part, '-');
    if (family === 'review' && max === 20) qs[0] = num(0, `1 个十和 ${part % 10} 个一组成多少？`, 10 + part % 10, [10, part % 10, 10 + part % 10], { kind: 'place', a: 1, b: part % 10 });
    if (family === 'application') qs[0] = choice(0, `图里只有 ${part} 个杯子和 ${other} 个盘子，哪一个问题能由这些信息回答？`, '杯子和盘子共有几件', ['杯子和盘子共有几件', '杯子多少钱', '明天会来几人'], { numbers: [part, other], visual: { kind: 'parts', a: part, b: other, objects: [MATERIALS.cup, MATERIALS.plate] } });
    if (family === 'application') qs[2] = num(2, '四个位置从左编号，笔袋放在从右第2个位置，其编号是多少？', 3, [4, 2, 3], { kind: 'positions', a: 4, b: 3, objects: [MATERIALS.pencilCase], label: '笔袋所在位置，从左编号 →' });
    if (lessonId === 'solve-total') qs[4] = num(4, `换一种分组：${part - 1} 个和 ${other + 1} 个合起来几个？`, total, [part - 1, other + 1, total]);
    return qs;
  }
  if (family === 'zero') return [
    num(0, `${total} 个都拿走，还剩几个？`, 0, [total, 0], { kind: 'take', a: total, b: total }),
    num(1, `${total}＋0＝？`, total, [total, 0]), num(2, `${total}－0＝？`, total, [total, 0]),
    choice(3, '从0米线出发，0表示什么？', '起点位置', ['起点位置', '没有跑道', '已经跑完'], { numbers: [0] }),
    num(4, `原来一个也没有，又放入 ${part} 个，现在几个？`, part, [0, part]),
  ].map((q, i) => ({ ...q, objective: goals[i === 3 ? 2 : i === 0 ? 0 : 1] }));
  if (family === 'ten') {
    const a = 1 + v % 9, b = 10 - a;
    return [num(0, `已有 ${a} 个圆片，十格板还空几格？`, b, [a, b, 10], { kind: 'ten', a }, '十格板共10格，看看空格。'),
      num(1, `10－${a}＝？`, b, [10, a, b]), equation(2, `${a} 个和 ${b} 个合起来，写完整算式。`, a, b, '+'),
      num(3, `${b} 和几组成10？`, a, [b, a, 10]), num(4, `十格里拿走 ${b} 个，还剩几个？`, a, [10, b, a])];
  }
  if (family === 'ten-add' || family === 'table') {
    const a = lessonId === 'plus-nine' ? 9 : lessonId === 'plus-eight-nine-strategies' ? (v % 2 ? 9 : 8) : lessonId === 'plus-five-four-three-two' ? 2 + v % 4 : 6 + v % 3;
    const b = lessonId === 'plus-eight-nine-strategies' ? 17 - a : 11 - a + v % Math.max(1, a - 1);
    const need = 10 - a, rest = b - need, sum = a + b;
    const misconceptions = {
      '10': { diagnosis: '可能凑成十后漏掉了剩余部分。', remedy: `把第二组分成移走与未移走两部分，数清未移走的圆片，再合回总量。` },
      [String(sum + 1)]: { diagnosis: '可能在移动圆片时重复计算了一个。', remedy: '每移一个，就在来源组去掉一个，核对总数没有增加。' },
    };
    const qs = [
      num(0, `${a}＋${b}＝？请算完整结果。`, sum, [a, b, sum], undefined, '先选接着数、分合或凑十，算完回到两组数量检查。'),
      num(1, `给 ${a} 凑成10，要从 ${b} 里移几个？`, need, [a, b, need, 10], { kind: 'ten', a }),
      num(2, `从 ${b} 里移 ${need} 个给 ${a}，第二组还剩几个？`, rest, [a, b, need, rest], { kind: 'take', a: b, b: need, objects: [MATERIALS.disc], label: '从第二组移出圆片' }, '移动一部分后，来源组没有移动的才是剩余。'),
      equation(3, `请写有答案的算式：${a} 个和 ${b} 个合起来。`, a, b, '+'),
      num(4, `${sum} 是总数，已有 ${a} 个，还缺几个？`, b, [sum, a, b]),
    ];
    qs[0].misconceptions = misconceptions;
    qs[1].objective = goals[0];
    qs[2].objective = goals[1];
    qs[3].objective = goals[0];
    qs[4].objective = goals[2];
    qs[4].prompt = `交换两组后，${b}＋${a}＝？再检查总数。`;
    qs[4].answer = String(sum);
    if (family === 'table') qs[1] = num(1, `${a}＋${b} 与 ${a - 1}＋□ 得数相同，□填几？`, b + 1, [a, b, a - 1, b + 1, sum]);
    if (family === 'table') qs[2] = num(2, `${a}＋□＝${sum}，□填几？`, b, [a, b, sum]);
    return qs;
  }
  if (family === 'place' || family === 'simple' || family === 'order') {
    const ones = max === 10 ? 0 : 1 + v % 9, n = 10 + ones;
    if (family === 'order') return [num(0, `${n} 前面的数是多少？`, n - 1, [n, n - 1]), num(1, `${n} 后面的数是多少？`, n + 1, [n, n + 1]),
      choice(2, `${n} 与 ${n + 1} 谁大？`, String(n + 1), [String(n), String(n + 1), '一样大'], { numbers: [n, n + 1] }),
      num(3, `${n} 到20还差几个？`, 20 - n, [n, 20, 20 - n]), num(4, `从10接着数 ${ones} 个数，到几？`, n, [10, ones, n])].map((q, i) => ({ ...q, objective: goals[i === 3 ? 2 : i === 2 ? 1 : 0] }));
    if (family === 'simple') return [num(0, `10＋${ones}＝？`, n, [10, ones, n], { kind: 'place', a: 1, b: ones }),
      num(1, `${n}－${ones}＝？`, 10, [n, ones, 10]), equation(2, `1个十和 ${ones} 个一合起来，写完整加法算式。`, 10, ones, '+'),
      num(3, `${n}－${Math.min(ones, 2)}＝？`, n - Math.min(ones, 2), [n, Math.min(ones, 2), n - Math.min(ones, 2)]), num(4, `${n}－10＝？`, ones, [n, 10, ones])];
    return [num(0, '10根小棒捆在一起，变成几个十？', 1, [10, 1], { kind: 'bundle', a: 10, objects: [MATERIALS.stick], label: '10根小棒捆在一起' }),
      num(1, `1个十和 ${ones} 个一，写作多少？`, n, [1, ones, n], { kind: 'place', a: 1, b: ones }),
      num(2, `把1个十拆开，再加 ${ones} 根零散小棒，总共几根？`, n, [10, ones, n]),
      num(3, max === 10 ? '10里面有几个一？' : '20里面有几个十？', max === 10 ? 10 : 2, [max, max === 10 ? 10 : 2]),
      num(4, max === 10 ? '10的个位表示没有零散小棒，写几？' : `${n} 中十位的1表示几根小棒？`, max === 10 ? 0 : 10, [n, max === 10 ? 0 : 10])];
  }
  if (family === 'chain' || family === 'mixed') {
    const start = 2 + v % 3, first = 1 + v % 2, second = 1;
    const middle = start + first, result = family === 'mixed' ? middle - second : middle + second;
    return [num(0, `原来 ${start} 人，先来 ${first} 人，这一步后几人？`, middle, [start, first, middle]),
      num(1, `原来 ${start} 人，先来 ${first} 人，再${family === 'mixed' ? '走' : '来'} ${second} 人，最后几人？`, result, [start, first, second, result]),
      make(2, `原来 ${start} 人，先来 ${first} 人，再${family === 'mixed' ? '走' : '来'} ${second} 人。写出按先后变化的完整算式。`, `${start}+${first}${family === 'mixed' ? '-' : '+'}${second}=${result}`, 'expression', { numbers: [start, first, second, result], hint: '从原有数量开始，按故事的先后顺序记录两次变化，再写最终结果。' }),
      num(3, `一共有8个，先拿走2个，再拿走1个，最后几个？`, 5, [8, 2, 1, 5]),
      num(4, `从 ${middle} 变为 ${result}，最后这一步${family === 'mixed' ? '减少' : '增加'}几个？`, second, [middle, result, second])];
  }
  if (family === 'between') {
    const left = 2 + v % 10, right = left + 3 + v % 4, count = right - left - 1;
    return [num(0, `从第 ${left} 人到第 ${right} 人，两个位置相差几？`, right - left, [left, right, right - left]),
      num(1, `第 ${left} 人和第 ${right} 人之间有几人？不含两端。`, count, [left, right, count], undefined, '画出连续位置，划掉两端，再数中间的人。'),
      num(2, `书本第 ${left} 页与第 ${right} 页之间，不含这两页，共几页？`, count, [left, right, count]),
      choice(3, '数“两人之间”时，两端的人算在里面吗？', '都不算', ['都不算', '两端都算', '只算一端']),
      num(4, `从第 ${left} 人到第 ${right} 人，包括两端共有几人？`, right - left + 1, [left, right, right - left + 1])];
  }
  if (['shape', 'building', 'solid-compose'].includes(family)) {
    if (family === 'solid-compose') return [choice(0, `两个相同小正方体面贴面${v % 2 ? '上下叠放' : '并排摆放'}，形成什么？`, '长方体', ['长方体', '正方体', '圆柱'], { visual: { kind: 'shape', a: 2, label: v % 2 ? '上下贴合' : '并排贴合' }, numbers: [2] }),
      num(1, `每层4个小正方体，${1 + v % 2} 层共几个？`, 4 * (1 + v % 2), [4, 1 + v % 2, 4 * (1 + v % 2)]),
      choice(2, `把一行${2 + v % 3}个小正方体整体转动，方块连接会怎样？`, '连接不变', ['连接不变', '多一个方块', '一定散开'], { visual: { kind: 'shape', a: 2 + v % 3, label: '转动前后的同一组合' }, numbers: [2 + v % 3] }),
      num(3, '一行用了4个，相邻方块面贴面，共几个小正方体？', 4, [4]),
      choice(4, '四个小正方体组成的2×2一层拼块能是长方体吗？', '能，相邻面贴合', ['能，相邻面贴合', '不能，只有排一行才行', '不能，必须八块'], { numbers: [2, 4, 8] })].map((q, i) => ({ ...q, objective: goals[i === 3 ? 1 : i === 4 ? 0 : i] }));
    const qs = [choice(0, '六个面都是同样大小的正方形，这是什么？', '正方体', ['正方体', '长方体', '圆柱']),
      choice(1, '把圆柱转到横放，它的图形类别是什么？', '圆柱', ['圆柱', '球', '长方体'], { visual: { kind: 'shape', a: 1, label: '横放圆柱' } }),
      choice(2, '圆柱曲面接触地面，最可能怎样运动？', '沿一个方向滚', ['沿一个方向滚', '像球一样向各方向滚', '不能滚']),
      choice(3, '球与圆柱的区别是什么？', '圆柱有两个平平的圆面', ['圆柱有两个平平的圆面', '球也有两个圆形平面', '圆柱没有曲面']),
      choice(4, '轻推后底座晃动，先怎样调整？', '让底座平稳接触桌面', ['让底座平稳接触桌面', '把球换到底下', '让一只脚悬空'])];
    if (family === 'building') {
      qs[0] = choice(0, '要搭稳高塔，哪种底座比较合适？', '平面朝下的长方体', ['平面朝下的长方体', '球', '横放易滚的圆柱']);
      qs[1] = choice(1, '把圆柱放在平稳底座上，怎样更稳？', '圆形平面朝下', ['圆形平面朝下', '曲面朝下', '只让边缘接触']);
      qs[2] = choice(2, '顶层方块的正下方空着，应怎样调整？', '先放好正下方的支撑块', ['先放好正下方的支撑块', '保持悬空', '只把顶块涂色']);
      qs[3] = choice(3, '想让底座平稳，长方体和球应该选哪个？', '长方体的平面朝下', ['长方体的平面朝下', '球放在最下层', '都只让边缘接触']);
    } else {
      const changed = v % 2 ? '长方体' : '正方体';
      qs[4] = choice(4, `把${changed}${v % 2 ? '做成大一些的同类模型' : '转动并换个方向摆放'}，它仍是什么？`, changed, [changed, '圆柱', '球'], { visual: { kind: 'shape', a: 1, label: `转动的${changed}` } });
      if (v % 2) {
        qs[0] = choice(0, '有两个平平的圆面和一个曲面，这是什么？', '圆柱', ['圆柱', '球', '正方体']);
        qs[1] = choice(1, '把正方体转动后换个面朝下，它仍是什么？', '正方体', ['正方体', '圆柱', '球'], { visual: { kind: 'shape', a: 1, label: '换朝向的正方体' } });
        qs[2] = choice(2, '圆柱的平平圆面朝下，轻推后会像横放时那样容易滚吗？', '不容易沿曲面滚', ['不容易沿曲面滚', '一定向各方向滚', '变成球'], { visual: { kind: 'shape', a: 1, label: '直立圆柱' } });
      }
    }
    return qs;
  }
  if (family === 'campus') return [num(0, '校园角落这些花盆有几个？', total, [total], { kind: 'dots', a: total, objects: [MATERIALS.flowerpot] }),
    choice(1, '四条直边、对边一样长且四角方方的窗，最像什么？', '长方形', ['长方形', '圆形', '三角形']),
    choice(2, '面向桌面，书本右边放笔袋，笔袋在书本哪边？', '右边', ['右边', '左边', '下面']),
    num(3, '一层一层数到第4层，最后一层用哪个数？', 4, [4]),
    choice(4, '数楼层时，应从哪开始？', '底层入口', ['底层入口', '最高层窗户', '任意一排窗户'])];
  if (family === 'games') return [num(0, '每组3人，已经站好2人，还要几人？', 1, [3, 2, 1]),
    choice(1, `按 ${v % 2 ? '△ ○ △ ○' : '○ △ ○ △'} 排，下一个是什么？`, v % 2 ? '△' : '○', ['○', '△', '□']),
    choice(2, '4条鱼和3朵花，哪个数量多？', '鱼', ['鱼', '花', '同样多'], { numbers: [4, 3], visual: { kind: 'parts', a: 4, b: 3, objects: [MATERIALS.fish, { ...MATERIALS.flower, label: '花' }] } }),
    num(3, '4人按每组3人分，分好一组还剩几人？', 1, [4, 3, 1]), num(4, '2人来参加，又来2人，共几人？', 4, [2, 2, 4])];
  if (family === 'direction') return [choice(0, '面向桌面，笔袋放在书本右边。以书本为参照，笔袋在哪？', '右边', ['左边', '右边', '后面']),
    choice(1, '两人面对面，每人伸出自己的左手，他们的左边方向一定相同吗？', '不相同', ['相同', '不相同', '没有左边']),
    num(2, `从左编号的队伍，从右第2个的编号是多少？`, total - 1, [total, 2, total - 1], { kind: 'queue', a: total }),
    choice(3, '原来面向黑板，窗在右边；转身后窗在哪边？', '左边', ['左边', '右边', '仍在前面']),
    choice(4, '以书本为参照，要把笔袋放到左边，应选哪个方向？', '←', ['←', '→', '↑'])];
  if (family === 'instruction') return [choice(0, '用右手摸左耳，要摸哪只耳朵？', '左耳', ['左耳', '右耳', '右脚']),
    choice(1, '把杯子放在篮子右边，参照物是什么？', '篮子', ['篮子', '杯子', '自己手的颜色']),
    num(2, '3个黄色三角形和1个红色三角形共有几个？', 4, [3, 1, 4]),
    choice(3, '跺右脚，应该动哪只脚？', '右脚', ['右脚', '左脚', '两只手']), num(4, '2个红盘子与2个黄盘子合起来几个？', 4, [2, 2, 4])];
  // 学习准备不把识钟超前变成考点，仅判断数字在情境中的用途。
  return [choice(0, '门口写“8:30开门”，8:30表示什么？', '时间', ['时间', '人数', '页数']),
    choice(1, '书本右边放笔袋，参照物是什么？', '书本', ['书本', '笔袋', '衣服']),
    choice(2, '先准备书本再找课本页码，哪个先做？', '准备书本', ['准备书本', '找页码', '两件都不用做']),
    num(3, '清单要3本书，已经有2本，还缺几本？', 1, [3, 2, 1]), choice(4, '准备完成后，怎样检查有没有遗漏？', '对照清单逐项检查', ['对照清单逐项检查', '只数颜色', '不看清单就结束'])];
}

export function normalizeMathAnswer(text: string): string {
  return text.trim().replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 65248)).replace(/\s+/g, '').replace(/[＋加]/g, '+').replace(/[－−减]/g, '-').replace(/等于|＝/g, '=').replace(/[。！!，,]/g, '');
}

/** 只解析有限的整数算式，不执行输入；加法允许交换两部分。 */
export function mathAnswerCorrect(question: MathQuestion, input: string): boolean {
  const answer = normalizeMathAnswer(input);
  if (question.kind === 'number') return /^\d{1,2}$/.test(answer) && Number(answer) === Number(question.answer);
  if (question.kind !== 'expression' || !question.relation) return answer === normalizeMathAnswer(question.answer);
  const match = /^(\d{1,2})([+-])(\d{1,2})=(\d{1,2})$/.exec(answer);
  if (!match) return false;
  const { a, b, operation, result } = question.relation;
  return match[2] === operation && Number(match[4]) === result && (Number(match[1]) === a && Number(match[3]) === b || operation === '+' && Number(match[1]) === b && Number(match[3]) === a);
}

export function mathMisconception(question: MathQuestion, input: string) {
  return question.misconceptions?.[normalizeMathAnswer(input)] ?? {
    diagnosis: question.kind === 'expression' ? '可能把整体、部分或所求量的位置混淆了。' : '这次判断还需要回到材料核对，暂不能确定错误原因。',
    remedy: question.hint,
  };
}

export function mathPrerequisites(lessonId: string, variant: number): MathQuestion[] {
  const teaching = MATH_TEACHING[lessonId];
  return mathCoreQuestions(mathQuestions(teaching?.prerequisite ?? lessonId, variant)).slice(0, 2);
}

/** 精简路径仍逐项覆盖全部关键目标，不能只取前三道同类题。 */
export function mathCoreQuestions(questions: MathQuestion[]): MathQuestion[] {
  return [...new Set(questions.map((question) => question.objective))].map((goal) => questions.find((question) => question.objective === goal)!);
}

/** 延迟复习保留本课两项关键目标，再混入一项明确的先备能力。 */
export function mathReviewQuestions(lessonId: string, variant: number): MathQuestion[] {
  const core = mathQuestions(lessonId, variant);
  const prerequisite = MATH_TEACHING[lessonId]?.prerequisite;
  const targets = mathCoreQuestions(core);
  if (!targets.length) return [];
  const offset = Math.abs(variant) % targets.length;
  return [targets[offset], targets[(offset + 1) % targets.length], prerequisite ? { ...mathCoreQuestions(mathQuestions(prerequisite, variant + 3))[2], transfer: true } : targets[(offset + 2) % targets.length]];
}
