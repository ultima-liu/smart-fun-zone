import { FRUIT_SHOP_ABILITY_LABELS, fruitShopAbilityForLesson } from './fruitShop';

export type MathLifeSceneKind = 'fruit-shop' | 'picnic' | 'repair-shop';

export type MathLifeSceneArtKind =
  | 'picnic-cups' | 'picnic-mat' | 'picnic-mat-position'
  | 'play-group' | 'plate-pattern' | 'quantity-compare'
  | 'seat-left' | 'seat-order' | 'reference-direction'
  | 'juice-right' | 'plates-total' | 'instruction-parts'
  | 'departure-time' | 'checklist' | 'cup-bag'
  | 'queue-third' | 'queue-five' | 'queue-reverse'
  | 'rolling-shapes' | 'dice-cube' | 'can-cylinder'
  | 'stable-base-options' | 'cylinder-upright' | 'shelf-base'
  | 'cubes-pair' | 'cube-2x2x2' | 'cube-rotation'
  | 'base-shapes' | 'cylinder-wheel' | 'connector-parts';

export type MathLifeSceneTask = {
  prompt: string;
  options: string[];
  answer: number;
  explain: string;
  artKind: MathLifeSceneArtKind;
  artLabel: string;
};

export type MathLifeScene = {
  kind: MathLifeSceneKind;
  title: string;
  action: string;
  summary: string;
  icon: string;
  props: [string, string, string];
  tasks?: MathLifeSceneTask[];
};

const PICNIC = (summary: string, tasks: MathLifeSceneTask[]): MathLifeScene => ({
  kind: 'picnic', title: '小卷动物野餐', action: '去准备野餐 →', summary,
  icon: '🧺', props: ['🥪', '🧃', '🌳'], tasks,
});

const REPAIR = (summary: string, tasks: MathLifeSceneTask[]): MathLifeScene => ({
  kind: 'repair-shop', title: '小卷形状修理铺', action: '去修理铺试一试 →', summary,
  icon: '🧰', props: ['🧱', '⚙️', '🔧'], tasks,
});

const OTHER_SCENES: Record<string, MathLifeScene> = {
  campus: PICNIC('在准备野餐的过程中寻找数量、形状和位置。', [
    { prompt: '野餐垫旁边放着 4 个杯子，应该选哪个数？', options: ['3', '4', '5'], answer: 1, explain: '一个一个点数，正好有 4 个杯子。', artKind: 'picnic-cups', artLabel: '格纹野餐垫旁边整齐放着四个杯子' },
    { prompt: '野餐垫有四条直直的边，最像哪种形状？', options: ['长方形', '圆形', '三角形'], answer: 0, explain: '常见的野餐垫最像长方形。', artKind: 'picnic-mat', artLabel: '一张带格纹、布边和流苏的长方形野餐垫' },
    { prompt: '果篮在野餐垫的右边，应该放到哪一侧？', options: ['左边', '右边', '上面'], answer: 1, explain: '先面向野餐垫，再找到它的右边。', artKind: 'picnic-mat-position', artLabel: '果篮位于格纹野餐垫的右边' },
  ]),
  playground: PICNIC('用点数、比较和图形规律安排野餐游戏。', [
    { prompt: '“3 人一组”玩游戏，兔兔这一组需要几位小伙伴？', options: ['2 位', '3 位', '4 位'], answer: 1, explain: '目标数是 3，要一个一个数到 3。', artKind: 'play-group', artLabel: '兔兔、熊猫和狐狸组成一个三人游戏小组' },
    { prompt: '餐盘按“圆、三角、圆、三角”摆放，下一个是什么？', options: ['圆', '三角', '正方形'], answer: 0, explain: '圆和三角轮流出现，所以下一个是圆。', artKind: 'plate-pattern', artLabel: '有厚度和盘沿的圆形餐盘与三角形餐盘交替摆放，最后空出一个位置' },
    { prompt: '一边有 4 条小鱼，另一边有 3 朵花，哪边数量更多？', options: ['小鱼', '花', '一样多'], answer: 0, explain: '4 比 3 多，所以小鱼更多。', artKind: 'quantity-compare', artLabel: '两块草地上分别摆着四条小鱼和三朵花' },
  ]),
  'classroom-discover': PICNIC('按参照物安排野餐座位，练习前后左右和第几。', [
    { prompt: '小熊坐在兔兔左边，小熊应该坐在哪一侧？', options: ['左边', '右边', '后面'], answer: 0, explain: '先以兔兔为参照，再找到左边。', artKind: 'seat-left', artLabel: '小熊坐在兔兔左侧的野餐坐垫上' },
    { prompt: '从果篮开始数，兔兔坐第 2 个位置，应该选哪个？', options: ['第 1 个', '第 2 个', '第 3 个'], answer: 1, explain: '确定起点后按顺序数，兔兔在第 2 个。', artKind: 'seat-order', artLabel: '从果篮开始依次排列熊猫、兔兔和狐狸，兔兔的坐垫标为第二个' },
    { prompt: '怎样才能把座位位置说清楚？', options: ['说清参照物和方向', '只说“在那里”', '只说颜色'], answer: 0, explain: '位置会随参照物改变，要同时说清参照物和方向。', artKind: 'reference-direction', artLabel: '兔兔坐在果篮左侧，两者的位置清楚可见' },
  ]),
  'classroom-games': PICNIC('在野餐游戏中听清对象和方向，再发现数量关系。', [
    { prompt: '兔兔说“把果汁放在篮子的右边”，应该放在哪边？', options: ['左边', '右边', '里面'], answer: 1, explain: '先听清对象是篮子，再找篮子的右边。', artKind: 'juice-right', artLabel: '兔兔把果汁盒放在野餐篮右侧的草地上' },
    { prompt: '草地上有 3 个黄盘子和 1 个红盘子，一共有几个？', options: ['3 个', '4 个', '5 个'], answer: 1, explain: '把两部分合起来，3 加 1 等于 4。', artKind: 'plates-total', artLabel: '草地上摆着三个有盘沿的黄色餐盘和一个红色餐盘' },
    { prompt: '做方向游戏前，最先要听清什么？', options: ['对象和方向', '谁最快', '声音大小'], answer: 0, explain: '对象和方向都听清，动作才不会做反。', artKind: 'instruction-parts', artLabel: '兔兔听指令后，把果汁沿虚线路径放到篮子右侧' },
  ]),
  'learning-readiness': PICNIC('用时间、顺序和固定位置完成出发前的准备。', [
    { prompt: '野餐车 8:30 出发，“8:30”表示什么？', options: ['出发时间', '8 个杯子', '30 个篮子'], answer: 0, explain: '8:30 是钟面上的时间。', artKind: 'departure-time', artLabel: '指针指向八点半的钟和等待出发的野餐车' },
    { prompt: '出发前应该先做什么？', options: ['先检查物品', '先把东西乱放', '到了再找'], answer: 0, explain: '按顺序检查，可以减少遗漏。', artKind: 'checklist', artLabel: '夹板清单上依次画着水杯、食物和格纹野餐垫，项目都已勾选' },
    { prompt: '水杯为什么要放在固定袋子里？', options: ['容易找到且不遗漏', '让袋子更重', '颜色更好看'], answer: 0, explain: '固定位置能帮助我们更快找到物品。', artKind: 'cup-bag', artLabel: '两个水杯整齐装在专用的蓝色水杯袋里' },
  ]),
  ordinal: PICNIC('给排队领取食物的客人找到正确位置。', [
    { prompt: '从兔兔这边开始数，狐狸排在第 3 个。应该找哪个位置？', options: ['第 2 个', '第 3 个', '一共 3 个'], answer: 1, explain: '“第 3 个”表示位置，不表示总共有 3 个。', artKind: 'queue-third', artLabel: '从兔兔这边开始数，兔兔、熊猫和狐狸依次排队，狐狸的坐垫标为第三个' },
    { prompt: '队伍里一共有 5 位客人，“5 位”说的是什么？', options: ['总数', '第 5 位的位置', '方向'], answer: 0, explain: '“5 位客人”表示队伍的总数。', artKind: 'queue-five', artLabel: '兔兔、熊猫、狐狸、小熊和青蛙五位客人排成一队' },
    { prompt: '换到队伍另一端开始数，第 1 个会怎样？', options: ['可能变成另一位客人', '一定不变', '队伍会少一人'], answer: 0, explain: '起点改变，客人的位置序号也可能改变。', artKind: 'queue-reverse', artLabel: '同一列五位动物的左右两端都标出了开始数的位置' },
  ]),
  'solid-shapes': REPAIR('根据物体的形状和滚动特点选择修理零件。', [
    { prompt: '小车需要能向各个方向滚动的零件，应该选什么？', options: ['球', '正方体', '长方体'], answer: 0, explain: '球的表面是弯曲的，容易向各个方向滚动。', artKind: 'rolling-shapes', artLabel: '修理台上摆着有明暗和体积感的球、正方体和长方体零件' },
    { prompt: '要换一个像骰子一样的零件，应该选什么？', options: ['正方体', '圆柱', '球'], answer: 0, explain: '骰子的六个面都是正方形，最像正方体。', artKind: 'dice-cube', artLabel: '立体骰子和正方体零件并排摆放' },
    { prompt: '罐头盒最接近哪种立体图形？', options: ['圆柱', '球', '长方体'], answer: 0, explain: '罐头盒有两个圆形平面和一个曲面，最像圆柱。', artKind: 'can-cylinder', artLabel: '有圆形顶面的罐头盒与圆柱零件并排摆放' },
  ]),
  'solid-building': REPAIR('选择稳定底座，把修理铺的零件架搭稳。', [
    { prompt: '搭零件架时，哪种物体适合放在最下面？', options: ['平面大的长方体', '容易滚动的球', '斜放的圆柱'], answer: 0, explain: '底面平、支撑范围大的物体更稳定。', artKind: 'stable-base-options', artLabel: '修理台上摆着平放长方体、球和斜放圆柱三种立体底座' },
    { prompt: '圆柱怎样放更稳定？', options: ['平面朝下', '曲面朝下', '斜着放'], answer: 0, explain: '让圆形平面朝下，圆柱就不容易滚走。', artKind: 'cylinder-upright', artLabel: '圆柱竖直站立，底部圆形平面完整接触工作台' },
    { prompt: '架子轻轻一碰就晃，应该先检查哪里？', options: ['底座是否平稳', '零件颜色', '架子名字'], answer: 0, explain: '先检查底座和支撑范围，再调整上面的零件。', artKind: 'shelf-base', artLabel: '零件架的一只支脚悬空，底部用红色标记突出显示' },
  ]),
  'solid-compose': REPAIR('用小正方体拼出修理所需的新零件。', [
    { prompt: '两个小正方体并排，可以拼成什么？', options: ['长方体', '球', '圆柱'], answer: 0, explain: '两个相同正方体贴在一起可以组成长方体。', artKind: 'cubes-pair', artLabel: '两个有立体明暗的小正方体紧贴并排，旁边呈现组成的长方体' },
    { prompt: '拼一个 2×2×2 的大正方体，需要几个小正方体？', options: ['4 个', '6 个', '8 个'], answer: 2, explain: '每层 4 个，一共 2 层，需要 8 个。', artKind: 'cube-2x2x2', artLabel: '八个小正方体按两层、每层四个堆成一组' },
    { prompt: '把拼好的零件转一转，它还是同一种拼法吗？', options: ['连接不变就是同一种', '一定变成新拼法', '方块会减少'], answer: 0, explain: '转动没有改变小方块之间的连接关系。', artKind: 'cube-rotation', artLabel: '两个相连方块横放和竖放的样子，中间用旋转标记连接' },
  ]),
  'review-shapes': REPAIR('综合使用形状、稳定和拼搭知识完成检修。', [
    { prompt: '需要一个稳定的方盒底座，应该选什么？', options: ['长方体', '球', '横放的圆柱'], answer: 0, explain: '长方体有较大的平面，适合做稳定底座。', artKind: 'base-shapes', artLabel: '工作台上摆着长方体、球和横放圆柱三种立体底座' },
    { prompt: '需要会滚动的轮子，圆柱应该怎样放？', options: ['曲面接触地面', '平面接触地面', '放进盒子里'], answer: 0, explain: '曲面接触地面时，圆柱可以沿一个方向滚动。', artKind: 'cylinder-wheel', artLabel: '圆柱横放在工作台上，曲面贴地，两侧有滚动轨迹' },
    { prompt: '检查拼组零件时，最重要的是看什么？', options: ['形状和连接是否合适', '名字长不长', '颜色是不是一样'], answer: 0, explain: '形状特征和连接方式决定零件能否使用。', artKind: 'connector-parts', artLabel: '两个真实零件分别带有能互相配合的插孔和凸榫' },
  ]),
};

export function mathLifeSceneForLesson(lessonId: string | null | undefined): MathLifeScene | undefined {
  if (!lessonId) return undefined;
  const ability = fruitShopAbilityForLesson(lessonId);
  if (ability) return {
    kind: 'fruit-shop', title: '小卷水果店', action: '去水果店试一试 →',
    summary: `用三张订单练习「${FRUIT_SHOP_ABILITY_LABELS[ability]}」。`,
    icon: '🧺', props: ['🍎', '🍐', '🍊'],
  };
  return OTHER_SCENES[lessonId];
}

export function mathLifeSceneRoute(lessonId: string, from: 'course' | 'review', reviewDay?: number) {
  const scene = mathLifeSceneForLesson(lessonId);
  if (!scene) return `/math-course/${lessonId}`;
  const query = `from=${from}&lesson=${encodeURIComponent(lessonId)}${from === 'review' ? `&reviewDay=${reviewDay ?? 0}` : ''}`;
  return scene.kind === 'fruit-shop' ? `/math-practice/fruit-shop?${query}` : `/math-practice/life-scene?${query}`;
}
