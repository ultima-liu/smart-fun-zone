import { MATH_TEACHING, mathAnswerCorrect, mathOptions, type MathQuestion } from './mathTeaching';

export type ExplorationScene = {
  kind: 'tokens' | 'ten' | 'place' | 'queue' | 'cards' | 'solids' | 'positions';
  a?: number; b?: number; removed?: number; emoji?: string; secondEmoji?: string;
  joined?: boolean; spaced?: boolean; paired?: boolean; swapped?: boolean; bundled?: boolean;
  cards?: string[]; shapes?: Array<'cube' | 'cuboid' | 'cylinder' | 'sphere'>;
  rotated?: boolean; scaled?: boolean; combined?: boolean; highlight?: number; label: string;
};
export type ExplorationAction = { id: string; label: string; scene: ExplorationScene };
export type ExplorationStage = { question: MathQuestion; scene: ExplorationScene; actions: ExplorationAction[] };
export type MathExplorationPlan = { lessonId: string; title: string; purpose: string; round: number; stages: ExplorationStage[] };
type StageInput = { prompt: string; answer: string | number; goal: 0 | 1 | 2; numbers?: number[]; options?: string[]; expression?: boolean; hint: string; scene: ExplorationScene; actions: Array<[string, ExplorationScene]> };
type PlanInput = { title: string; purpose: string; stages: StageInput[] };
const tokens = (a: number, b = 0, extra: Partial<ExplorationScene> = {}): ExplorationScene => ({ kind: 'tokens', a, b, emoji: '●', secondEmoji: '●', label: '探索材料', ...extra });
const cards = (values: string[], label = '探索卡片'): ExplorationScene => ({ kind: 'cards', cards: values, label });
const queue = (a: number, highlight?: number, label = '从左编号的队伍'): ExplorationScene => ({ kind: 'queue', a, highlight, label });
const place = (b: number, bundled = true): ExplorationScene => ({ kind: 'place', a: 1, b, bundled, label: '一捆十根小棒与零散小棒' });
const ten = (a: number, b = 0): ExplorationScene => ({ kind: 'ten', a, b, label: '十格板和旁边的圆片' });
const solids = (shapes: NonNullable<ExplorationScene['shapes']>, extra: Partial<ExplorationScene> = {}): ExplorationScene => ({ kind: 'solids', shapes, label: '立体图形观察材料', ...extra });
const choose = (prompt: string, answer: string, options: string[], goal: 0 | 1 | 2, scene: ExplorationScene, actions: StageInput['actions'], hint: string, numbers: number[] = []): StageInput => ({ prompt, answer, options, goal, scene, actions, hint, numbers });
const number = (prompt: string, answer: number, goal: 0 | 1 | 2, scene: ExplorationScene, actions: StageInput['actions'], hint: string, numbers: number[]): StageInput => ({ prompt, answer, goal, scene, actions, hint, numbers });
const equation = (prompt: string, answer: string, goal: 0 | 1 | 2, scene: ExplorationScene, actions: StageInput['actions'], hint: string, numbers: number[]): StageInput => ({ prompt, answer, expression: true, goal, scene, actions, hint, numbers });

/** 逐课登记探索问题与实际材料变化；相同学科类别不再共用一份小探索。 */
const PLANS: Record<string, (r: number) => PlanInput> = {
  campus: r => { const n = 3 + r % 3; return { title: '校园观察：换个起点数旗子', purpose: '同一批物体从不同起点点数，再观察生活中的形状。', stages: [
    number('从另一端重新点数，校园旗子共有几面？', n, 0, tokens(n, 0, { emoji: '🚩', cards: ['从左端开始 →'] }), [['从另一端开始点数', tokens(n, 0, { emoji: '🚩', swapped: true, cards: ['← 改从右端开始'] })]], '不重复、不遗漏，最后一个数表示总数。', [n]),
    choose('只转动这扇窗户的观察卡，窗户的平面形状是什么？', '长方形', ['长方形', '圆形', '三角形'], 1, cards(['▭'], '窗户观察卡'), [['转动窗户观察卡', cards(['▯'], '转动后的窗户观察卡')]], '观察四条边与四个角。')
  ] }; },
  playground: r => { const n = 3 + r % 2; return { title: '操场规则：人数与重复花纹', purpose: '把参加游戏的人组成规定人数的一组，再延续图形规则。', stages: [
    number(`一组要 ${n} 人，把新同伴加入后，这组还缺几人？`, 1, 0, tokens(n - 2, 0, { emoji: '🧒' }), [['加入一位同伴', tokens(n - 1, 0, { emoji: '🧒' })]], '比较规定人数和已经加入的人数。', [n, n - 2, n - 1, 1]),
    choose('把前面一组花纹复制到后面，下一张应是什么？', '○', ['○', '△', '□'], 1, cards(['○', '△']), [['复制一组花纹', cards(['○', '△', '○', '△', '？'])]], '找到重复的一组，再从这一组的开头接着排。')
  ] }; },
  'classroom-discover': r => { const side = r % 2 === 0; return { title: '教室位置：换参照物再描述', purpose: '观察同一排物品，改变参照物会改变位置描述。', stages: [
    choose(`以${side ? '书本' : '笔袋'}为参照物，铅笔在它的哪边？`, side ? '右边' : '左边', ['左边', '右边', '无法判断'], 0, cards(['📚', '✏️', '👝']), [[`圈出参照物：${side ? '书本' : '笔袋'}`, { kind: 'positions', cards: ['📚', '✏️', '👝'], highlight: side ? 0 : 2, label: '圈出参照物的桌面' }]], '先找到被圈出的参照物，再看铅笔。'),
    choose('参照物从书本换成笔袋，铅笔本身需要移动吗？', '不需要移动', ['不需要移动', '必须移到最左边', '必须移到最右边'], 1, cards(['📚', '✏️', '👝']), [['把参照物换成笔袋', { kind: 'positions', cards: ['📚', '✏️', '👝'], highlight: 2, label: '以笔袋为参照物' }]], '区分物品的位置与描述它的参照物。')
  ] }; },
  'classroom-games': r => { const left = r % 2 === 0; return { title: '听指令：对象和工具要分清', purpose: '改变执行动作的手，检查指令指定的对象是否改变。', stages: [
    choose(`指令是“摸${left ? '左' : '右'}耳”。换一只手执行后，要摸哪只耳朵？`, left ? '左耳' : '右耳', ['左耳', '右耳', '哪只都行'], 0, cards([left ? '摸左耳' : '摸右耳', '用左手']), [['换成用右手执行', cards([left ? '摸左耳' : '摸右耳', '用右手'])]], '手是动作工具，耳朵是指令指定的对象。'),
    number('把两种颜色的三角形放在一起，一共有几个三角形？', 4, 2, tokens(3, 1, { emoji: '▲', secondEmoji: '△' }), [['把两种颜色的三角形合在一起', tokens(3, 1, { emoji: '▲', secondEmoji: '△', joined: true })]], '颜色改变不会改变图形的数量。', [3, 1, 4])
  ] }; },
  'learning-readiness': r => { const sequence = r % 2 ? ['拿课本', '摆好笔袋', '准备听讲'] : ['收好玩具', '拿课本', '准备听讲']; return { title: '课前准备：顺序与时间', purpose: '排好准备步骤，分清时间记录和数量记录。', stages: [
    choose('展示准备步骤后，哪一步应最后做？', '准备听讲', ['准备听讲', sequence[0], sequence[1]], 2, cards(sequence.slice(0, 2)), [['展示最后一个准备步骤', cards(sequence)]], '先准备物品，再做好听讲的准备。'),
    choose('翻开上课信息卡，“8:30”记录的是？', '上课时间', ['上课时间', '同学人数', '书本数量'], 0, cards(['上课信息：？']), [['翻开上课信息卡', cards(['🕣', '8:30 开始上课'])]], '时刻用来说明什么时候开始。')
  ] }; },
  numbers: r => { const n = 3 + (r + 1) % 3; return { title: '1～5：排列改变，数量怎样', purpose: '先点数，再改变同一批圆片的间距，检查数量是否守恒。', stages: [
    number('逐个点数这组圆片，总数是多少？', n, 0, tokens(n), [['把圆片排成一行', tokens(n, 0, { joined: true })]], '一个圆片对应一个数词。', [n]),
    choose('只拉开这些圆片的间距，数量会怎样？', '一样多', ['一样多', '变多', '变少'], 2, tokens(n), [['改变物体间距', tokens(n, 0, { spaced: true })]], '看看有没有增加或拿走圆片。', [n])
  ] }; },
  compare: r => { const a = 3 + r % 2, b = a - 1; return { title: '比大小：配对后看剩余', purpose: '一只小猴配一个桃子，比较数量并补齐缺少的一方。', stages: [
    choose('配对以后，哪一组有剩余、数量更多？', '小猴', ['小猴', '桃子', '同样多'], 0, tokens(a, b, { emoji: '🐒', secondEmoji: '🍑' }), [['把小猴和桃子一一配对', tokens(a, b, { emoji: '🐒', secondEmoji: '🍑', paired: true })]], '观察哪一组有没配上的物体。', [a, b]),
    choose('给每只小猴都补上一个桃子后，应填哪个比较符号？', '＝', ['＜', '＞', '＝'], 1, tokens(a, b, { emoji: '🐒', secondEmoji: '🍑', paired: true }), [['补上缺少的桃子', tokens(a, a, { emoji: '🐒', secondEmoji: '🍑', paired: true })]], '每一对都有两个物体，没有剩余。', [a, b])
  ] }; },
  ordinal: r => { const n = 4 + r % 2; return { title: '第几：从两端找同一个人', purpose: '标出左起第2人，再从右端重新定位同一个人。', stages: [
    number('编号2的人从右边数是第几人？', n - 1, 1, queue(n), [['圈出左起第2人', queue(n, 1, '圈出编号2的人；从右开始数')]], '从右端开始，一个人对应一个位置。', [n, 2, n - 1]),
    number('换了计数方向，这支队伍一共有几人？', n, 2, queue(n, 1), [['改从左边重新点数全队', queue(n, 1, '改从左边点数，同一个人仍被圈出')]], '第几说明位置，几个说明全队的数量。', [n])
  ] }; },
  compose: r => { const a = 1 + r % 3, b = 5 - a; return { title: '分与合：移动一颗玉米', purpose: '保持整体为5，从右篮移一颗到左篮，再交换两篮检查。', stages: [
    number(`左篮原有 ${a} 个，移来一个后，右篮还剩几个？`, b - 1, 0, tokens(a, b, { emoji: '🌽', secondEmoji: '🌽' }), [['从右篮移一个到左篮', tokens(a + 1, b - 1, { emoji: '🌽', secondEmoji: '🌽' })]], '玉米只从一篮移动到另一篮，总数没有增加。', [a, b, a + 1, b - 1, 5]),
    number('交换左右两篮后，合起来共有几个玉米？', 5, 1, tokens(a + 1, b - 1, { emoji: '🌽', secondEmoji: '🌽' }), [['交换左右两个篮子', tokens(b - 1, a + 1, { emoji: '🌽', secondEmoji: '🌽' })]], '两部分互换，整体仍由原来的玉米组成。', [5, a + 1, b - 1])
  ] }; },
  'add-within-5': r => { const a = 2, b = 1 + r % 2, sum = a + b; return { title: '加法：合并后交换两部分', purpose: '真正合并两组积木，再用交换加数的算式检查。', stages: [
    number('把两组积木合到一个圈里，一共有几个？', sum, 0, tokens(a, b, { emoji: '🧱', secondEmoji: '🧱' }), [['把两组积木合在一起', tokens(a, b, { joined: true, emoji: '🧱', secondEmoji: '🧱' })]], '逐个点数合并后的积木。', [a, b, sum]),
    equation('交换两部分后，写一道有答案的加法算式。', `${b}+${a}=${sum}`, 2, tokens(a, b, { emoji: '🧱', secondEmoji: '🧱' }), [['交换两部分的位置', tokens(b, a, { swapped: true, emoji: '🧱', secondEmoji: '🧱' })]], '两部分合成整体，交换位置不改变总数。', [a, b, sum])
  ] }; },
  'subtract-within-5': r => { const whole = 4 + r % 2, take = 1 + r % 2, rest = whole - take; return { title: '减法：拿走，再放回检查', purpose: '观察剩余，再把拿走的部分放回原来的整体。', stages: [
    number('拿走圈出的苹果后，还剩几个？', rest, 0, tokens(whole, 0, { emoji: '🍎' }), [[`拿走 ${take} 个苹果`, tokens(whole, 0, { removed: take, emoji: '🍎' })]], '圈出拿走的部分，只点数没有拿走的。', [whole, take, rest]),
    equation('把拿走的放回，写加法检查原来的总数。', `${rest}+${take}=${whole}`, 2, tokens(rest, take, { emoji: '🍎', secondEmoji: '🍎' }), [['把拿走的苹果放回', tokens(rest, take, { joined: true, emoji: '🍎', secondEmoji: '🍎' })]], '剩下的和拿走的合起来应回到原有总数。', [rest, take, whole])
  ] }; },
  zero: r => { const n = 2 + r % 3; return { title: '0：空盘子与跑道起点', purpose: '清空物体，再比较“没有物体”和“起点位置”中的0。', stages: [
    number('全部拿走后，盘中数量用哪个数表示？', 0, 0, tokens(n, 0, { emoji: '🍓' }), [['清空盘子', tokens(n, 0, { removed: n, emoji: '🍓' })]], '看看盘子里是否还有没拿走的物体。', [n, 0]),
    choose('打开跑道卡，跑道上的0表示什么？', '起点位置', ['起点位置', '没有跑道', '已经跑完'], 2, cards(['空盘子：0']), [['打开跑道的起点卡', cards(['起点 0', '→ 1 → 2 → 3'])]], '相同的数字在不同情境中可以表示数量或位置。', [0, 1, 2, 3])
  ] }; },
  'unit1-review': r => { const a = 1 + r % 3, b = 5 - a; return { title: '第一单元：让分合连接加减', purpose: '由同一组5个圆片，检查组成和求缺少部分的关系。', stages: [
    equation('两组重新合起来，写出加法算式。', `${a}+${b}=5`, 0, tokens(a, b), [['把分开的圆片合回整体', tokens(a, b, { joined: true })]], '整体由两个部分合成。', [a, b, 5]),
    equation(`在整体5个中圈出 ${a} 个，写求另一部分的减法算式。`, `5-${a}=${b}`, 1, tokens(5), [['把已知部分圈出', tokens(5, 0, { removed: a })]], '减去已知的一部分，留下另一部分。', [5, a, b])
  ] }; },
  'six-to-nine': r => { const n = 6 + r % 4; return { title: '6～9：看见5和剩余', purpose: '将圆片按5分组，再改变一个圆片观察相邻数。', stages: [
    number('圈出5个一组后，旁边还剩几个圆片？', n - 5, 1, tokens(n), [['把5个圆片圈成一组', tokens(5, n - 5)]], '把已圈出的5个与零散的圆片分开点数。', [n, 5, n - 5]),
    number(n === 9 ? '拿回一个圆片后，这组的总数是多少？' : '添一个圆片后，这组的总数是多少？', n === 9 ? 8 : n + 1, 0, tokens(5, n - 5), [[n === 9 ? '拿回一个圆片' : '添一个圆片', tokens(5, n === 9 ? 3 : n - 4)]], n === 9 ? '本轮从9拿回一个，数到9前面的数。' : '从原来的总数接着数一个。', [n, n === 9 ? 8 : n + 1])
  ] }; },
  'compare-order-nine': r => { const n = 6 + r % 3; return { title: '6～9：数量比较与方向定位', purpose: '配对比较两组数量，再找右起第二个的位置。', stages: [
    choose('配对后第一组与第二组之间应填什么符号？', '＜', ['＜', '＞', '＝'], 1, tokens(n, n + 1), [['把两组圆片一一配对', tokens(n, n + 1, { paired: true })]], '第二组有一个没配上的圆片。', [n, n + 1]),
    number('把右起第二人圈出，他的左起编号是多少？', n - 1, 0, queue(n), [['从右端圈出第二人', queue(n, n - 2)]], '确定右端起点，再对应原来的左起编号。', [n, 2, n - 1])
  ] }; },
  'compose-six-nine': r => { const whole = 6 + r % 4, a = 2; return { title: '6～9分合：按顺序移动不漏分法', purpose: '左边每次增加一个，观察右边的对应变化。', stages: [
    number(`整体 ${whole} 不变，左边从2变成3，右边有几个？`, whole - 3, 2, tokens(a, whole - a), [['向左边移动一个圆片', tokens(3, whole - 3)]], '左边增加的圆片从右边移来，整体不变。', [whole, 2, 3, whole - 3]),
    number('左边再增加一个，右边还剩几个？', whole - 4, 0, tokens(3, whole - 3), [['再向左边移动一个圆片', tokens(4, whole - 4)]], '按同样的顺序继续移动，避免遗漏分法。', [whole, 3, 4, whole - 4])
  ] }; },
  'addsub-six-seven': r => { const whole = 6 + r % 2, a = 2, b = whole - a; return { title: '6和7：同一幅图的四道算式', purpose: '交换两个部分、遮住另一部分，让同一幅图对应不同算式。', stages: [
    equation('交换两部分后，写另一道加法算式。', `${b}+${a}=${whole}`, 1, tokens(a, b), [['交换两个部分', tokens(b, a)]], '两道加法只交换两个加数。', [a, b, whole]),
    equation(`从整体中遮住 ${b} 个，写求另一部分的减法算式。`, `${whole}-${b}=${a}`, 2, tokens(whole), [['遮住较大的部分', tokens(whole, 0, { removed: b })]], '先确定整体，再减去被遮住的一部分。', [whole, b, a])
  ] }; },
  'solve-total-within-7': r => { const a = 3, b = 2 + r % 3; return { title: '求一共：合并不同位置的花', purpose: '圈出两个不重叠部分，忽略题目没有问的其他物品。', stages: [
    choose('问题问花一共几朵，应该合并哪两部分？', '左边的花和右边的花', ['左边的花和右边的花', '花和小鸟', '只数左边的花'], 0, tokens(a, b, { emoji: '🌼', secondEmoji: '🌼' }), [['展开花坛的两侧', tokens(a, b, { emoji: '🌼', secondEmoji: '🌼', spaced: true })]], '问题中的整体是花，两个部分不能重复。', [a, b]),
    number('把两侧的花归到同一个花坛，一共几朵？', a + b, 2, tokens(a, b, { emoji: '🌼', secondEmoji: '🌼' }), [['把两侧的花合到一起', tokens(a, b, { emoji: '🌼', secondEmoji: '🌼', joined: true })]], '把两个不重叠的部分合起来点数。', [a, b, a + b])
  ] }; },
  'solve-remain-within-7': r => { const whole = 5 + r % 3, gone = 2; return { title: '求剩余：飞走后反向检查', purpose: '从原来的鸟群去掉飞走的鸟，再放回检查原数。', stages: [
    equation('鸟飞走后，写求还剩几只的完整算式。', `${whole}-${gone}=${whole - gone}`, 1, tokens(whole, 0, { emoji: '🐦' }), [['让两只鸟飞走', tokens(whole, 0, { removed: gone, emoji: '🐦' })]], '原来的整体减去飞走的部分。', [whole, gone, whole - gone]),
    number('把飞走的鸟放回后，回到几只鸟？', whole, 2, tokens(whole - gone, gone, { emoji: '🐦', secondEmoji: '🐦' }), [['把飞走的鸟放回', tokens(whole - gone, gone, { joined: true, emoji: '🐦', secondEmoji: '🐦' })]], '剩下的与飞走的合起来应等于原数。', [whole, gone, whole - gone])
  ] }; },
  'addsub-eight-nine': r => { const whole = 8 + r % 2, a = 3, b = whole - a; return { title: '8和9：整体已知，部分藏起来', purpose: '翻开部分与整体，再用同一关系补未知量。', stages: [
    number(`整体是 ${whole}，翻开一部分3个后，另一部分几个？`, b, 2, cards([`整体 ${whole}`, '部分 ？', '部分 ？']), [['翻开其中一部分', cards([`整体 ${whole}`, '部分 3', '部分 ？'])]], '整体减去已知部分得到另一部分。', [whole, a, b]),
    equation('从整体中圈出较大部分，写一道求较小部分的减法算式。', `${whole}-${b}=${a}`, 1, tokens(a, b), [['将较大的部分圈出', tokens(whole, 0, { removed: b })]], '圈出的部分与留下的部分都来自同一整体。', [whole, b, a])
  ] }; },
  'select-info-eight-nine': r => { const n = 8 + r % 2; return { title: '选信息：改变蘑菇不改变鹿的剩余', purpose: '先按问题选择信息，再改变无关数量检验它是否影响结果。', stages: [
    choose('问鹿还剩几只，应该保留哪两张信息卡？', '原有鹿与跑走鹿', ['原有鹿与跑走鹿', '蘑菇与跑走鹿', '原有鹿与蘑菇'], 0, cards([`原有鹿 ${n}`, '跑走鹿 3', '蘑菇 4']), [['把蘑菇信息单独移开', cards([`原有鹿 ${n}`, '跑走鹿 3', '无关：蘑菇 4'])]], '需要同一种对象的整体和变化量。', [n, 3, 4]),
    number('蘑菇数量改变后，鹿还剩几只？', n - 3, 2, tokens(n, 0, { removed: 3, emoji: '🦌' }), [['把蘑菇从4朵改成6朵', { ...tokens(n, 0, { removed: 3, emoji: '🦌' }), cards: ['蘑菇：4 → 6'] }]], '蘑菇没有改变鹿的原数和跑走数量。', [n, 3, 4, 6, n - 3])
  ] }; },
  ten: r => { const a = 6 + r % 3; return { title: '认识10：把十格板填满', purpose: '补满十格板，再遮住部分找组成10的伙伴。', stages: [
    number('从旁边移入圆片，填满十格板一共需要补几个？', 10 - a, 0, ten(a, 10 - a), [['把空格全部补满', ten(10)]], '比较原来已经填好的格子与空格。', [a, 10, 10 - a]),
    number(`十格板遮住 ${a} 格，没遮住的有几格？`, 10 - a, 1, ten(10), [[`遮住 ${a} 个圆片`, tokens(10, 0, { removed: a })]], '10减去一部分，留下组成10的另一部分。', [10, a, 10 - a])
  ] }; },
  'addsub-ten': r => { const a = 3 + r % 4, b = 10 - a; return { title: '10的加减：用伙伴检查算式组', purpose: '将10分成两个部分，再由同一图写反向检查。', stages: [
    equation('分开这10个圆片，写合成整体的加法算式。', `${a}+${b}=10`, 2, ten(10), [['把十格板分成两个部分', tokens(a, b)]], '两个部分合成10。', [a, b, 10]),
    equation('把较少的一部分遮住，写求剩下部分的减法算式。', `10-${a}=${b}`, 1, tokens(a, b), [['从整体中遮住第一部分', tokens(10, 0, { removed: a })]], '已知整体和一部分，求另一部分用减法。', [10, a, b])
  ] }; },
  'continuous-add-sub': r => { const start = 3 + r % 2; return { title: '连算：记录两次来的变化', purpose: '先观察第一批来的人，再处理第二批，保留中间数量。', stages: [
    number('第一批来了2人，这一步之后有几人？', start + 2, 0, tokens(start, 0, { emoji: '🧒' }), [['让第一批2人加入', tokens(start, 2, { joined: true, emoji: '🧒', secondEmoji: '🧒' })]], '先只计算第一次变化。', [start, 2, start + 2]),
    equation('第二批又来1人，按故事顺序写完整连加算式。', `${start}+2+1=${start + 3}`, 2, tokens(start + 2, 0, { emoji: '🧒' }), [['再让第二批1人加入', tokens(start + 2, 1, { joined: true, emoji: '🧒', secondEmoji: '🧒' })]], '从原数开始，按两次变化依次写两个加号。', [start, 2, 1, start + 3])
  ] }; },
  'mixed-add-sub': r => { const start = 4 + r % 2; return { title: '加减混合：先来再走', purpose: '分清两次变化方向，将每一步放回同一故事。', stages: [
    number('先来了2人，此时有几人？', start + 2, 1, tokens(start, 0, { emoji: '🧒' }), [['先让2人加入', tokens(start, 2, { joined: true, emoji: '🧒', secondEmoji: '🧒' })]], '先来的动作增加数量。', [start, 2, start + 2]),
    equation('后来又走1人，按先后来走写完整混合算式。', `${start}+2-1=${start + 1}`, 2, tokens(start + 2, 0, { emoji: '🧒' }), [['再让1人离开', tokens(start + 2, 0, { removed: 1, emoji: '🧒' })]], '先加上来的，再减去走的。', [start, 2, 1, start + 1])
  ] }; },
  'unit2-review': r => { const whole = 8 + r % 3, part = 3; return { title: '第二单元：分组不同，整体相同', purpose: '从分合联系到加减，再通过改变分组检查总数。', stages: [
    number('把一个圆片移到第一组，整体现在有几个？', whole, 0, tokens(part, whole - part), [['移动一个圆片改变分组', tokens(part + 1, whole - part - 1)]], '改变分组没有增加或拿走圆片。', [whole, part, part + 1, whole - part - 1]),
    equation('将新第一组拿走，写出求另一组的减法算式。', `${whole}-${part + 1}=${whole - part - 1}`, 1, tokens(whole), [['拿走新第一组', tokens(whole, 0, { removed: part + 1 })]], '整体减去新第一部分。', [whole, part + 1, whole - part - 1])
  ] }; },
  'solid-shapes': r => { const cylinder = r % 2 === 0, shape = cylinder ? 'cylinder' : 'cuboid'; return { title: '立体图形：转动与大小不改变类别', purpose: '改变朝向和大小，检查图形类别与面的特征。', stages: [
    choose('这件模型横放并放大后，它仍属于哪种图形？', cylinder ? '仍是圆柱' : '仍是长方体', cylinder ? ['仍是圆柱', '变成球', '变成长方体'] : ['仍是长方体', '变成圆柱', '变成球'], 1, solids([shape]), [['转一转', solids([shape], { rotated: true })], ['改变图形大小', solids([shape], { rotated: true, scaled: true })]], '朝向和大小改变，面的特征没有改变。'),
    choose(cylinder ? '观察圆柱的两个底面，平面朝下与曲面朝下哪种放法更不容易滚动？' : '观察这个长方体的每个面，哪种描述与它一致？', cylinder ? '平面朝下' : '每个面都是平面', cylinder ? ['平面朝下', '曲面朝下', '完全一样'] : ['每个面都是平面', '只有曲面', '没有平面'], 2, solids([shape], { rotated: true }), [[cylinder ? '把平面转到下面' : '换一个面继续观察', solids([shape])]], '观察实际接触面，平面可以作为稳定的支撑面。')
  ] }; },
  'solid-building': r => ({ title: '搭高塔：换底座检验稳定', purpose: '比较球与平面底座，并调整上层积木的支撑。', stages: [
    choose('把高塔的球形底座换成盒子后，哪种特征帮助稳定？', '底部有平平的面', ['底部有平平的面', '颜色变深了', '名称更长了'], 0, solids(['sphere', r % 2 ? 'cuboid' : 'cube'], { combined: true }), [['用长方体替换球形底座', solids(['cuboid', r % 2 ? 'cuboid' : 'cube'], { combined: true })]], '看与桌面接触的是曲面还是平面。'),
    choose('把上层方块移到盒子中间，调整的是哪种关系？', '上层由底座支撑', ['上层由底座支撑', '方块数量增加', '方块变成圆柱'], 2, solids(['cuboid', r % 2 ? 'cuboid' : 'cube'], { spaced: true }), [['把上层方块放到底座中央', solids(['cuboid', r % 2 ? 'cuboid' : 'cube'], { combined: true })]], '上层要放在能支撑它的位置。')
  ] }),
  'solid-compose': r => { const n = 2 + r % 2; return { title: '拼搭：面贴面连成一排', purpose: '把小正方体贴合，检查新外形和转动后的连接。', stages: [
    choose('把这些小正方体面贴面排成一行，整体外形是什么？', '长方体', ['长方体', '球', '圆柱'], 0, solids(Array.from({ length: n }, () => 'cube')), [['让相邻小方块面贴面', { ...solids(Array.from({ length: n }, () => 'cube'), { combined: true }), a: n }]], '检查贴合后整体的外表面。', [n]),
    number('转动整排模型，没有拆开，仍由几个小正方体组成？', n, 2, { ...solids(Array.from({ length: n }, () => 'cube'), { combined: true }), a: n }, [['转动整排模型', { ...solids(Array.from({ length: n }, () => 'cube'), { combined: true, rotated: true }), a: n }]], '转动整个模型没有增加、拿走或拆开方块。', [n])
  ] }; },
  'ten-again': r => ({ title: '再认识10：拆十再捆十', purpose: '完成十个一与一个十的双向转换。', stages: [
    number(r % 2 ? '先捆起十根小棒，再拆开，总共有几根？' : '拆开一捆小棒，再捆回去，总共有几根？', 10, 2, place(0, r % 2 === 0), r % 2 ? [['捆成一个十', place(0)], ['再拆成十个一', place(0, false)]] : [['拆成十个一', place(0, false)], ['重新捆成一个十', place(0)]], '捆起与拆开都没有拿走小棒。', [10, 1, 0]),
    number('把10放进十位和个位，个位没有零散小棒，应写几？', 0, 1, place(0), [['打开十位与个位记录卡', { ...place(0), cards: ['十位：1', '个位：？'] }]], '个位表示零散的几个一。', [10, 1, 0])
  ] }),
  'eleven-twenty': r => { const ones = 2 + r % 7; return { title: '11～20：十位与个位分别表示什么', purpose: '从拆捆后的实物理解数位，再补到下一个整十。', stages: [
    number('拆开一捆后，与零散小棒合起来，总数是多少？', 10 + ones, 1, place(ones), [['拆开一捆，与零散小棒放在一起', place(ones, false)]], '一捆是10根，零散部分再加上去。', [10, ones, 10 + ones]),
    number('观察补满第二捆的位置，还需添几根才能到20？', 10 - ones, 0, place(ones), [['把零散小棒放入第二个十格位置', { ...ten(ones), emoji: '│', cards: ['第一捆已有10根，这是第二捆的位置'] }]], '第二捆需要十根，数清空位。', [20, ones, 10 - ones])
  ] }; },
  'order-twenty': r => { const n = 12 + r % 6; return { title: '20以内顺序：从数线找邻居', purpose: '移动数线标记，比较前后相邻数并计算到20的距离。', stages: [
    number(`标记从 ${n} 向右走一格，落在哪个数？`, n + 1, 0, cards([`${n - 1}`, `● ${n}`, `${n + 1}`], '递增的数线'), [['让标记向右移动一格', cards([`${n - 1}`, `${n}`, `● ${n + 1}`], '向右移动后的数线')]], '每向右一格，数增加1。', [n - 1, n, n + 1]),
    number(`从 ${n} 到20，空出的距离是几个一？`, 20 - n, 2, cards([`${n}`, '…', '20']), [['展开到20的每一格', cards(Array.from({ length: 21 - n }, (_, i) => `${n + i}`), '从当前数到20的数线')]], '数移动的格数，起点本身不算一步。', [n, 20, 20 - n])
  ] }; },
  'simple-addsub-twenty': r => { const ones = 4 + r % 5; return { title: '不进位加减：整十不动，只改个位', purpose: '保留一个十，观察个位增加与减少的计算。', stages: [
    number('整捆不动，零散小棒再添1根，现在总数是多少？', 11 + ones, 0, place(ones), [['在个位添1根小棒', place(ones + 1)]], '一个十保留，个位增加1。', [10, ones, ones + 1, 11 + ones]),
    equation('从刚才的总数中拿走两根零散小棒，写出完整算式。', `${11 + ones}-2=${9 + ones}`, 1, place(ones + 1), [['从个位拿走2根小棒', place(ones - 1)]], '从个位去掉两根，整捆仍保留。', [11 + ones, 2, 9 + ones])
  ] }; },
  'between-positions': r => { const left = 2 + r % 3, right = left + 4; return { title: '间隔：只数两端之间', purpose: '标记两端，并区分两端距离与中间的人数。', stages: [
    number(`编号 ${left} 和 ${right} 的人之间有几人？`, 3, 1, queue(right + 1), [['圈出两端之间的人', { ...queue(right + 1, undefined, '两端本人不计入中间'), cards: [`两端：${left} 和 ${right}`, `中间编号：${left + 1}、${left + 2}、${left + 3}`] }]], '两端不算，只数严格夹在中间的人。', [left, right, 3, right + 1]),
    number(`书页从第 ${left} 页到第 ${right} 页，两端也读，共读几页？`, 5, 2, cards([`${left}`, '…', `${right}`]), [['展开包括两端的所有页码', cards(Array.from({ length: 5 }, (_, i) => String(left + i)), '包括两端的页码')]], '这次包括两端，与上一问“之间”不同。', [left, right, 5])
  ] }; },
  'unit4-review': r => { const ones = 3 + r % 6; return { title: '第四单元：同一个数的不同表示', purpose: '连接数位、实物拆捆与减法记录。', stages: [
    choose(`数 ${10 + ones} 的十位1表示多少根小棒？`, '10根', ['1根', '10根', `${ones}根`], 1, place(ones), [['展开十位这一捆', place(ones, false)]], '十位的1是一个十，个位才表示几个一。', [10, ones, 10 + ones]),
    equation('拿走全部零散小棒，写求还剩数量的算式。', `${10 + ones}-${ones}=10`, 2, place(ones), [['只拿走个位的零散小棒', place(0)]], '剩下的是一整捆。', [10 + ones, ones, 10])
  ] }; },
  'plus-nine': r => makeTenPlan('9加几：给9补1，保留剩余', '从第二组拆一个给9，逐步检查来源组剩余与完整结果。', 9, 3 + r % 5),
  'plus-eight-seven-six': r => { const a = 8 - r % 3; return makeTenPlan('8、7、6加几：补十所需数不同', '给不同的第一加数补十，观察拆分量随空位变化。', a, 11 - a + r % 2); },
  'plus-eight-nine-strategies': r => { const a = 8 + r % 2, b = 17 - a; return { title: '8加9：分别给8和9凑十', purpose: '比较两条路线，来源组与移动量不同，总数相同。', stages: [
    number(`给 ${a} 凑十后，来源组 ${b} 还剩几个？`, 7, 1, ten(a, b), [[`从 ${b} 中移 ${10 - a} 个给 ${a}`, ten(10, 7)]], '从来源组减去移走的那几个。', [a, b, 10 - a, 7, 10]),
    number(`交换路线，给 ${b} 凑十后，完整结果是多少？`, 17, 2, ten(b, a), [[`改从 ${a} 中移 ${10 - b} 个给 ${b}`, ten(10, 7)]], '两条路线都要加上来源组剩余，不能只写10。', [a, b, 10 - b, 10, 7, 17])
  ] }; },
  'plus-five-four-three-two': r => { const a = 2 + r % 4, b = 9; return { title: '小数加大数：交换后选凑十路线', purpose: '将大加数放在前面，比较接着数与给大数补十。', stages: [
    number(`交换两组，给 ${b} 凑十，从 ${a} 里移几个？`, 1, 0, ten(a, b), [['交换两组，把9放到十格板', ten(b, a)]], '看看9的十格板还空几格。', [a, b, 10, 1]),
    number('移好后，加上来源组剩余，完整结果是多少？', a + b, 1, ten(b, a), [['从小加数移1个给9', ten(10, a - 1)]], '十加未移动的部分，得到原来两组的总数。', [a, b, 10, a - 1, a + b])
  ] }; },
  'solve-total': r => { const a = 6 + r % 3, b = 5; return { title: '求总数：换分组不重复数人', purpose: '将同一群人由左右分组改成前后分组，检查整体不变。', stages: [
    number('把左右两组同伴合在一起，全队共有几人？', a + b, 2, tokens(a, b, { emoji: '🧒', secondEmoji: '🧒' }), [['合并左右两组同伴', tokens(a, b, { joined: true, emoji: '🧒', secondEmoji: '🧒' })]], '两个不重叠部分合成整个队伍。', [a, b, a + b]),
    number('将同一队伍改成前后两排，总人数是多少？', a + b, 0, tokens(a, b, { joined: true, emoji: '🧒', secondEmoji: '🧒' }), [['把一个同伴移到前排重新分组', tokens(a + 1, b - 1, { emoji: '🧒', secondEmoji: '🧒' })]], '不要把左右分组和前后分组重复相加。', [a, b, a + 1, b - 1, a + b])
  ] }; },
  'find-original': r => { const gone = 6 + r % 3, rest = 5; return { title: '求原来：把领走的部分找回来', purpose: '重建原有整体，再用拿走的动作检查答案。', stages: [
    equation('找回领走的与剩下的，写求原来数量的完整算式。', `${gone}+${rest}=${gone + rest}`, 1, cards([`领走 ${gone}`, `还剩 ${rest}`, '原来 ？']), [['把领走和剩下的放到同一个整体', tokens(gone, rest, { joined: true, emoji: '🍎', secondEmoji: '🍎' })]], '问原来的整体，要把领走与剩下两部分合起来。', [gone, rest, gone + rest]),
    number('按原故事再次领走那部分，应该还剩几个？', rest, 2, tokens(gone + rest, 0, { emoji: '🍎' }), [['按原故事再次领走', tokens(gone + rest, 0, { removed: gone, emoji: '🍎' })]], '将重建的整体放回故事，检查剩余是否吻合。', [gone, rest, gone + rest])
  ] }; },
  'addition-table': r => { const a = 8 - r % 3, b = 5 + r % 3, sum = a + b; return { title: '加法表：一增一减，和怎样', purpose: '移动一个圆片改变两个加数，发现同和规律并补空格。', stages: [
    number('从第一组移一个到第二组，新的和是多少？', sum, 1, tokens(a, b), [['第一组少1，第二组多1', tokens(a - 1, b + 1)]], '同一批圆片只改变分组，总数不变。', [a, b, a - 1, b + 1, sum]),
    number(`再沿同和的一列移动一格：${a - 2}＋□＝${sum}，空格填几？`, b + 2, 2, cards([`${a}+${b}=${sum}`, `${a - 1}+${b + 1}=${sum}`]), [['展开同和算式的下一格', cards([`${a}+${b}=${sum}`, `${a - 1}+${b + 1}=${sum}`, `${a - 2}+□=${sum}`])]], '第一加数再少1，第二加数就要再多1。', [a - 2, b + 2, sum])
  ] }; },
  'unit5-review': r => { const a = 7 + r % 2, b = 6; return { title: '第五单元：拆分后用交换检查', purpose: '凑十保留剩余，再换加数顺序验证完整结果。', stages: [
    number('凑十以后，来源组没有移走的有几个？', a + b - 10, 1, ten(a, b), [['给第一组补成十', ten(10, a + b - 10)]], '分清移动量和来源组剩余。', [a, b, 10 - a, 10, a + b - 10]),
    equation('交换原来两组，写出有完整结果的检查算式。', `${b}+${a}=${a + b}`, 2, tokens(a, b), [['交换原来两个加数', tokens(b, a)]], '交换只改顺序，完整结果仍是两组的总数。', [a, b, a + b])
  ] }; },
  'review-numbers': r => { const ones = 4 + r % 5; return { title: '数与运算关联：拆十理解减法', purpose: '用同一批小棒连接数位和减去整十。', stages: [
    number('把整捆拆开后，总数仍是多少？', 10 + ones, 0, place(ones), [['拆开整捆，连接十和一', place(ones, false)]], '表示方式改变，数量不变。', [10, ones, 10 + ones]),
    number('从这些小棒中拿走一个十，还剩几个一？', ones, 1, place(ones, false), [['拿走原来的一整捆十根', tokens(ones, 0, { emoji: '│' })]], '减去10就是拿走十根，零散部分保留。', [10 + ones, 10, ones])
  ] }; },
  'review-relations': r => { const whole = 12 + r % 4, part = 5; return { title: '数量关系关联：同一图问不同量', purpose: '同一幅部分整体图先求部分，再反向求整体。', stages: [
    equation('已知整体和圈出的部分，写求另一部分的完整算式。', `${whole}-${part}=${whole - part}`, 1, tokens(whole), [['在整体中圈出已知部分', tokens(whole, 0, { removed: part })]], '所求是一部分时，整体减去已知部分。', [whole, part, whole - part]),
    equation('改问整体，把两部分合回去，写出完整算式。', `${part}+${whole - part}=${whole}`, 2, tokens(part, whole - part), [['将两个部分合回原图', tokens(part, whole - part, { joined: true })]], '所求改变，运算随数量关系改变。', [part, whole - part, whole])
  ] }; },
  'review-shapes': r => ({ title: '图形关联：辨认与选择支撑面', purpose: '结合图形特征、朝向和实际搭建选择进行回顾。', stages: [
    choose('转动这组图形后，哪一种仍只有曲面、最容易向各个方向滚动？', '球', ['球', '圆柱', '正方体'], 0, solids(r % 2 ? ['cuboid', 'sphere', 'cylinder'] : ['sphere', 'cylinder', 'cube']), [['转动三种图形的观察卡', solids(r % 2 ? ['cuboid', 'sphere', 'cylinder'] : ['sphere', 'cylinder', 'cube'], { rotated: true })]], '球没有平面，圆柱既有平面也有曲面。'),
    choose('要把小正方体搭在圆柱上，应该让圆柱怎样放？', '平面朝下', ['平面朝下', '曲面朝下', '只看颜色'], 2, solids(['cylinder', 'cube'], { rotated: true }), [['调整圆柱的支撑面', solids(['cylinder', 'cube'], { combined: true })]], '平面朝下更不容易滚动，上面也有平面承托方块。')
  ] }),
  'review-application': r => { const a = 4 + r % 3, b = 3; return { title: '综合应用：先选问题，再检查位置', purpose: '根据餐具材料选择可以解答的问题，再从参照物检查摆放。', stages: [
    choose('把两组餐具摆在桌上，哪一个问题能由材料回答？', '杯子和盘子共有几件', ['杯子和盘子共有几件', '杯子多少钱', '明天会来几人'], 0, tokens(a, b, { emoji: '🥤', secondEmoji: '🍽️' }), [['把杯子与盘子分组摆好', tokens(a, b, { emoji: '🥤', secondEmoji: '🍽️', spaced: true })]], '只提出材料里有足够信息回答的问题。', [a, b]),
    choose('把笔袋放到书本右边，哪个描述与实际摆放一致？', '笔袋在书本右边', ['笔袋在书本右边', '笔袋在书本左边', '位置与参照物无关'], 2, cards(['👝', '📚']), [['把笔袋移到书本右边', { kind: 'positions', cards: ['📚', '👝'], highlight: 0, label: '以书本为参照物的摆放' }]], '先找参照物书本，再看笔袋所在一侧。')
  ] }; },
};

function makeTenPlan(title: string, purpose: string, a: number, b: number): PlanInput {
  const need = 10 - a, rest = b - need;
  return { title, purpose, stages: [
    number(`从 ${b} 中移 ${need} 个给 ${a} 后，来源组还剩几个？`, rest, 1, ten(a, b), [[`移 ${need} 个圆片给 ${a} 凑十`, ten(10, rest)]], '只从来源组移走所需数量，未移走的是剩余。', [a, b, need, rest, 10]),
    number('把十和剩余的圆片一起点数，完整结果是多少？', a + b, 0, ten(10, rest), [['把十与剩余放回一个整体', tokens(10, rest, { joined: true })]], '凑成十以后，还要加上没有移动的圆片。', [10, rest, a + b])
  ] };
}

export function mathExplorationPlan(lessonId: string, round = 0): MathExplorationPlan {
  const factory = PLANS[lessonId];
  if (!factory) throw new Error(`数学课缺少专属小探索：${lessonId}`);
  const variant = Number.isFinite(round) ? Math.max(0, Math.floor(round)) : 0;
  const plan = factory(variant);
  return { lessonId, title: plan.title, purpose: plan.purpose, round: variant, stages: plan.stages.map((stage, index) => ({
    scene: stage.scene,
    actions: stage.actions.map(([label, scene], action) => ({ id: `${lessonId}:${index}:${action}`, label, scene })),
    question: { id: `${lessonId}:exploration:${variant}:${index}`, lessonId, objective: MATH_TEACHING[lessonId].goals[stage.goal],
      prompt: stage.prompt, answer: String(stage.answer), kind: stage.options ? 'choice' : stage.expression ? 'expression' : 'number',
      options: stage.options ? mathOptions(stage.options, `${lessonId}:exploration:${variant}:${index}`) : undefined,
      numbers: stage.numbers ?? [], hint: stage.hint,
    },
  })) };
}

export function explorationAnswerCorrect(question: MathQuestion, answer: string): boolean {
  // 连算要保留操作先后；两个加数的加法允许交换，减法保留方向。
  if (question.kind === 'expression') {
    const match = question.answer.match(/^(\d+)\+(\d+)=(\d+)$/);
    if (match) return mathAnswerCorrect({ ...question, relation: { a: Number(match[1]), b: Number(match[2]), operation: '+', result: Number(match[3]) } }, answer);
  }
  return mathAnswerCorrect(question, answer);
}
