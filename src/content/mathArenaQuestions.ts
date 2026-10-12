import { MATH_TEACHING, mathOptions, type MathQuestion } from './mathTeaching';

/** 闯关有独立情景题库，不重新播放小检测的基础题；每题对应一项课时目标。 */
export function mathArenaQuestions(lessonId: string, variant = 0): MathQuestion[] {
  const teaching = MATH_TEACHING[lessonId];
  if (!teaching) return [];
  const { family, max, goals } = teaching;
  const v = Math.abs(Math.floor(variant));
  const total = 3 + v % (max - 2), part = 1 + (v + 1) % (total - 1), other = total - part;
  const make = (i: number, prompt: string, answer: string | number, kind: MathQuestion['kind'], extra: Partial<MathQuestion> = {}): MathQuestion => ({
    id: `${lessonId}:${v}:arena:${i}`, lessonId, objective: goals[i], prompt, answer: String(answer), kind,
    numbers: [], transfer: true, hint: '先找故事里的数量或位置，再用摆一摆、画一画检查。', ...extra,
  });
  const num = (i: number, prompt: string, answer: number, numbers: number[]) => make(i, prompt, answer, 'number', { numbers });
  const choice = (i: number, prompt: string, answer: string, options: string[], numbers: number[] = []) => make(i, prompt, answer, 'choice', { numbers, options: mathOptions([...new Set(options)], `${lessonId}:${v}:arena:${i}`) });
  const equation = (i: number, prompt: string, a: number, b: number, operation: '+' | '-') => {
    const result = operation === '+' ? a + b : a - b;
    return make(i, prompt, `${a}${operation}${b}=${result}`, 'expression', { numbers: [a, b, result], relation: { a, b, operation, result } });
  };
  if (family === 'count') return [
    num(0, `停车场来了 ${total - 1} 辆车，又停进 1 辆。现在数到最后是几辆？`, total, [total - 1, 1, total]),
    choice(1, `给装着 ${total} 颗糖的袋子贴数量标签，选哪张？`, String(total), [String(total), String(total - 1), String(total + 1 > max ? total - 2 : total + 1)], [total, total - 1, total + 1 > max ? total - 2 : total + 1]),
    choice(2, '同一盒棋子从一排改摆成一个圈，没添也没拿走。总数怎样？', '和原来相同', ['和原来相同', '圆圈大所以更多', '围起来所以更少']),
  ];
  if (family === 'compare') return [
    choice(0, `有 ${total} 把椅子，来了 ${total - 1} 个小朋友。每人坐一把，椅子够吗？`, '够，还有空椅子', ['够，还有空椅子', '不够', '刚好坐满'], [total, total - 1]),
    choice(1, `小红拿 ${part} 张卡，小明拿 ${total} 张卡。小红的数量 ○ 小明的数量，填什么？`, '＜', ['＜', '＞', '＝'], [part, total]),
    num(2, `给 ${total} 个小朋友每人发一支蜡笔，已发给 ${part} 人。还要发几支？`, other, [total, part, other]),
  ];
  if (family === 'ordinal') return [
    num(0, `排队买票，从前面数小红排第 ${part}。她前面有几人？`, part - 1, [part, part - 1]),
    num(1, `${total} 人排队，从前面数小明排第 1。从后面数他排第几？`, total, [total, 1]),
    choice(2, `小红说“我排第 ${part}”，能知道全队一共有几人吗？`, '不能，只知道她的位置', ['不能，只知道她的位置', `一定是 ${part} 人`, '一定只有1人'], [part]),
  ];
  if (family === 'compose') return [
    num(0, `把 ${total} 颗糖装进两个袋子，第一袋放 ${other} 颗，第二袋放几颗？`, part, [total, other, part]),
    num(1, `一盒里有 ${other} 块红积木和 ${part} 块蓝积木。这一盒一共几块？`, total, [other, part, total]),
    num(2, `两个袋子共 ${total} 颗糖，第一袋 ${part} 颗。往第一袋挪 1 颗后，第二袋有几颗？`, other - 1, [total, part, 1, other - 1]),
  ];
  if (['add', 'total', 'original', 'subtract', 'remain', 'filter', 'family', 'relations', 'review', 'application'].includes(family)) {
    const taking = ['subtract', 'remain', 'filter'].includes(family);
    const qs = [
      num(0, taking ? `手工盒里有 ${total} 颗珠子，穿手链用了 ${other} 颗。盒里还剩几颗？` : `手链有 ${other} 颗红珠和 ${part} 颗蓝珠，共有几颗珠子？`, taking ? part : total, [total, other, part]),
      equation(1, family === 'original' ? `送出 ${other} 张贴纸，还留着 ${part} 张。写算式求原来有几张。` : taking ? `篮子里有 ${total} 个苹果，吃了 ${other} 个。写算式求剩下的。` : `书架上有 ${other} 本故事书和 ${part} 本图画书，写算式求共有几本。`, taking ? total : other, taking ? other : part, taking ? '-' : '+'),
      choice(2, taking ? `原有 ${total} 颗珠子，用掉 ${other} 颗，剩 ${part} 颗。怎样检查剩余是否正确？` : `算出红珠和蓝珠共 ${total} 颗。拿出 ${other} 颗红珠后，应剩几颗蓝珠才对？`, taking ? `${other}＋${part}＝${total}` : String(part), taking ? [`${other}＋${part}＝${total}`, `${total}＋${other}`, `${part}－${other}`] : [String(part), String(total), String(part === other ? 0 : other)], [total, part, other]),
    ];
    if (family === 'add') qs[2] = choice(2, `红珠 ${other} 颗、蓝珠 ${part} 颗，合起来 ${total} 颗。先数蓝珠再数红珠，总数怎样？`, '仍然相同', ['仍然相同', '一定多1颗', '一定少1颗'], [other, part, total]);
    if (family === 'original') qs[0] = choice(0, `小红送出一些贴纸，还留着一些。问“送出之前有多少”，要找哪一个量？`, '送出前的全部贴纸', ['送出前的全部贴纸', '只找送出的', '只找留下的']);
    if (family === 'filter') qs[0] = choice(0, `车上 ${total} 人，下车 ${other} 人，路边有 ${part} 棵树。求车上剩几人，哪条信息不用？`, '路边树的数量', ['路边树的数量', '原来车上的人数', '下车人数'], [total, other, part]);
    if (family === 'family') qs[0] = num(0, `一个盒子能装 ${total} 块积木，已经装 ${other} 块。还空几个位置？`, part, [total, other, part]);
    if (family === 'total') qs[2] = num(2, `停车场有 ${other} 辆红车和 ${part} 辆蓝车，车共有几辆？`, total, [other, part, total]);
    if (family === 'filter') qs[2] = num(2, `车上原有 ${total} 人，下车 ${other} 人，路边有 ${part} 棵树。车上还剩几人？`, part, [total, other, part]);
    if (family === 'relations') qs[0] = choice(0, `书架共有 ${total} 本书，故事书 ${other} 本，图画书 ${part} 本。哪一个量是整体？`, '书架上的全部书', ['书架上的全部书', '故事书', '图画书'], [total, other, part]);
    if (family === 'relations') qs[1] = equation(1, `书架共有 ${total} 本书，其中故事书 ${other} 本。写算式求图画书几本。`, total, other, '-');
    if (family === 'application') {
      qs[0] = choice(0, `手工盒有 ${part} 颗红珠、${other} 颗蓝珠。根据这些信息，可以问什么？`, '红珠和蓝珠共有几颗', ['红珠和蓝珠共有几颗', '珠子一共多少钱', '明天会用多少颗'], [part, other]);
      qs[2] = num(2, '储物架有5个格子，从左编号。把书放到从右第1格，它的编号是几？', 5, [5, 1]);
    }
    if (family === 'review' && max === 20) {
      const loose = part % 10 || 1;
      qs[0] = num(0, `贴纸每袋10张，另有 ${loose} 张散装。一袋和散装共有几张？`, 10 + loose, [10, loose, 10 + loose]);
    }
    return qs;
  }
  if (family === 'zero') return [
    num(0, `停车位原来停着 ${total} 辆车，现在全部开走。空位上的车辆数写几？`, 0, [total, 0]),
    num(1, `花瓶里有 ${total} 朵花，今天没有再添。现在仍有几朵？`, total, [total, 0]),
    choice(2, '尺子上从0的位置开始量，0在这里表示什么？', '测量的起点', ['测量的起点', '尺子不存在', '已经量完了'], [0]),
  ];
  if (family === 'ten') {
    const a = 1 + v % 9, b = 10 - a;
    return [num(0, `蛋盒能放10个蛋，已放 ${b} 个，再放几个就满？`, a, [10, b, a]),
      equation(1, `一袋装10颗糖，送给朋友 ${b} 颗。写算式求还剩几颗。`, 10, b, '-'),
      choice(2, `两袋糖合起来10颗，一袋 ${a} 颗、另一袋 ${b} 颗。怎样核对？`, `${a}＋${b}＝10`, [`${a}＋${b}＝10`, `${a}＋10＝${b}`, `10＋${b}＝${a}`], [a, b, 10])];
  }
  if (family === 'ten-add' || family === 'table') {
    const a = lessonId === 'plus-nine' ? 9 : lessonId === 'plus-eight-nine-strategies' ? (v % 2 ? 9 : 8) : lessonId === 'plus-five-four-three-two' ? 2 + v % 4 : 6 + v % 3;
    const b = lessonId === 'plus-eight-nine-strategies' ? 17 - a : 11 - a + v % (a - 1);
    const need = 10 - a, rest = b - need, sum = a + b;
    if (family === 'table') return [num(0, `车上有 ${b} 人，又上来 ${a} 人。现在共有几人？`, sum, [a, b, sum]),
      num(1, `两盒共 ${sum} 颗珠子，第一盒 ${a} 颗，第二盒 ${b} 颗。第一盒挪1颗到第二盒，第二盒有几颗？`, b + 1, [sum, a, b, 1, b + 1]),
      num(2, `书架共有 ${sum} 本书，其中故事书 ${a} 本。图画书几本？`, b, [sum, a, b])];
    return [num(0, `篮里有 ${a} 个苹果和 ${b} 个梨，水果共有几个？`, sum, [a, b, sum]),
      num(1, `蛋盒先放 ${a} 个蛋，从旁边 ${b} 个中拿 ${need} 个补满10格。旁边还剩几个？`, rest, [a, b, need, 10, rest]),
      choice(2, `水果共 ${sum} 个，其中苹果 ${a} 个。怎样检查梨是不是 ${b} 个？`, `${sum}－${a}＝${b}`, [`${sum}－${a}＝${b}`, `${sum}＋${a}＝${b}`, `${b}－${a}＝${sum}`], [sum, a, b])];
  }
  if (family === 'place') {
    const ones = max === 10 ? 0 : 1 + v % 9, n = 10 + ones;
    return [choice(0, '彩笔每盒10支。一整盒可以看成哪个计数单位？', '1个十', ['1个十', '1个一', '0个十'], [10, 1, 0]),
      max === 10 ? choice(1, '一整盒10支彩笔，没有散装。记录十位和个位，应选哪张卡？', '十位1，个位0', ['十位1，个位0', '十位0，个位1', '十位1，个位1'], [10, 1, 0]) : num(1, `贴纸每袋10张，买了一袋和 ${ones} 张散装。一共有几张？`, n, [10, ones, n]),
      max === 10 ? choice(2, '小熊把一袋10颗糖倒进盘子，说：“倒出来，糖就变多了！”你同意吗？', '不同意，还是10颗', ['不同意，还是10颗', '同意，变多了', '只剩1颗'], [10, 1])
        : choice(2, `一袋装10颗糖，盘里另有 ${ones} 颗。打开糖袋全部倒进盘子，现在可以看成多少个一？`, `${n}个一`, [`${n}个一`, '1个一', `${ones}个一`], [10, ones, n, 1])];
  }
  if (family === 'order') {
    const n = 11 + v % 9;
    return [num(0, `柜子按数字顺序编号，你站在 ${n} 号柜前，下一个柜子几号？`, n + 1, [n, n + 1]),
      choice(1, `小红读到第 ${n} 页，小明读到第 ${n - 1} 页。谁的页码大？`, '小红', ['小红', '小明', '一样大'], [n, n - 1]),
      num(2, `收集卡片目标20张，已收集 ${n} 张，还要几张？`, 20 - n, [20, n, 20 - n])];
  }
  if (family === 'simple') {
    const ones = 1 + v % 9, n = 10 + ones;
    return [num(0, `一盒彩笔10支，又买 ${ones} 支散装。共有几支？`, n, [10, ones, n]),
      num(1, `有 ${n} 张贴纸，把 ${ones} 张散装送出，留下完整一袋。还剩几张？`, 10, [n, ones, 10]),
      choice(2, `一袋10颗糖和 ${ones} 颗散装，算出共有 ${n} 颗。用哪道算式检查散装数量？`, `${n}－10＝${ones}`, [`${n}－10＝${ones}`, `${n}＋10＝${ones}`, `${ones}－10＝${n}`], [10, ones, n])];
  }
  if (family === 'chain' || family === 'mixed') {
    const start = 2 + v % 3, first = 1 + v % 2, middle = start + first, result = family === 'mixed' ? middle - 1 : middle + 1;
    return [num(0, `停车场先有 ${start} 辆车，开进 ${first} 辆。第二次变化还没发生，此时几辆？`, middle, [start, first, middle]),
      make(1, `停车场有 ${start} 辆车，先开进 ${first} 辆，再${family === 'mixed' ? '开走' : '开进'}1辆。按故事顺序写完整算式。`, `${start}+${first}${family === 'mixed' ? '-' : '+'}1=${result}`, 'expression', { numbers: [start, first, 1, middle, result] }),
      choice(2, `先开进 ${first} 辆，再${family === 'mixed' ? '开走' : '开进'}1辆。哪张记录卡按先后写对了变化？`, `＋${first}，再${family === 'mixed' ? '－' : '＋'}1`, [`＋${first}，再${family === 'mixed' ? '－' : '＋'}1`, `－${first}，再－1`, `－1，再＋${first}`], [first, 1])];
  }
  if (family === 'between') {
    const left = 2 + v % 10, right = left + 3 + v % 4, gap = right - left;
    return [num(0, `电梯从 ${left} 楼升到 ${right} 楼，两个楼层编号相差几？`, gap, [left, right, gap]),
      num(1, `小红排第 ${left}，小明排第 ${right}。不算他们俩，中间有几个小朋友？`, gap - 1, [left, right, gap - 1]),
      num(2, `公交车从第 ${left} 站到第 ${right} 站，两端不算，中间经过几站？`, gap - 1, [left, right, gap - 1])];
  }
  if (family === 'shape') return [choice(0, '选一个能像球一样向各个方向滚的玩具，应选哪种形状？', '球', ['球', '正方体', '长方体']),
    choice(1, '一个球形玩具转了半圈，它现在是什么形状？', '仍是球', ['仍是球', '变成圆柱', '变成正方体']),
    choice(2, '想让圆柱积木停稳在桌上，哪一面朝下更合适？', '平平的圆面', ['平平的圆面', '弯曲的侧面', '只让一条边碰桌子'])];
  if (family === 'building') return [choice(0, '搭积木桥，下面的支撑块应该怎样放？', '平面贴桌面，稳稳放好', ['平面贴桌面，稳稳放好', '只让一个角碰桌面', '用球来支撑']),
    choice(1, '长方体竖着搭的塔容易倒，换一种放法怎样更稳？', '换较大的平面朝下', ['换较大的平面朝下', '换一个尖角朝下', '让它悬空']),
    choice(2, '桥搭好了，检查发现中间的积木悬空，应该怎么做？', '补上下面的支撑', ['补上下面的支撑', '继续往上加高', '只换积木颜色'])];
  if (family === 'solid-compose') return [choice(0, '拼一个2×2的方块底座，相邻的小正方体应该怎样连接？', '面贴面', ['面贴面', '只碰一个角', '中间都留空'], [2]),
    num(1, `搭台阶，下层 ${3 + v % 2} 块，上层2块，一共用几块小正方体？`, 5 + v % 2, [3 + v % 2, 2, 5 + v % 2]),
    choice(2, '把拼好的积木桥整体换个方向，没有拆开，连接关系怎样？', '和原来相同', ['和原来相同', '一定断开', '一定多出一块'])];
  if (family === 'campus') return [num(0, `校园里原有 ${total - 1} 盆花，门口又添1盆，现在共有几盆？`, total, [total - 1, 1, total]),
    choice(1, '圆圆的钟面没有角，描下来最像哪种平面图形？', '圆形', ['圆形', '三角形', '长方形']),
    choice(2, '面向教室，书柜在门的左边。以门为参照，书柜在哪边？', '左边', ['左边', '右边', '下面'])];
  if (family === 'games') return [num(0, '5个小朋友玩游戏，每组2人。分好两组后还剩几人？', 1, [5, 2, 4, 1]),
    choice(1, '游戏贴纸按“红、蓝、红、蓝”排列，下一张是什么颜色？', '红色', ['红色', '蓝色', '黄色']),
    choice(2, '红队3人，蓝队2人。哪一队还要加1人才能一样多？', '蓝队', ['蓝队', '红队', '两队都不需要'], [3, 2, 1])];
  if (family === 'direction') return [choice(0, '面向书架，玩具盒在书包左边。以书包为参照，玩具盒在哪？', '左边', ['左边', '右边', '上面']),
    choice(1, '面向门时，书柜在左边。转身背对门后，书柜在你哪边？', '右边', ['右边', '左边', '正前方']),
    choice(2, '藏宝图说“在树的右边找宝箱”，应往哪个箭头走？', '→', ['→', '←', '↓'])];
  if (family === 'instruction') return [choice(0, '老师说“用左手指右膝盖”，要用哪只手？', '左手', ['左手', '右手', '右脚']),
    choice(1, '把玩具放到椅子左边，这句话要以什么判断左右？', '椅子', ['椅子', '玩具颜色', '门上的号码']),
    num(2, '作品用了2张红纸和3张蓝纸，一共用了几张纸？', 5, [2, 3, 5])];
  return [choice(0, '活动通知写“9:00集合”，这里的数字告诉我们什么？', '集合时间', ['集合时间', '需要9本书', '排第9名']),
    choice(1, '清单说水杯放在书包左边，要以什么判断位置？', '书包', ['书包', '水杯的颜色', '自己的衣服']),
    choice(2, '准备画画：先拿出纸，再画图。应先做哪件事？', '拿出纸', ['拿出纸', '画图', '收起所有东西'])];
}
