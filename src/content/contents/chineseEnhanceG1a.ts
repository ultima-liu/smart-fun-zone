import type { ChineseEnhance } from '../chineseEnhance';

/* =====================================================================
   语文一年级上册 · 内容增强（图文分步教学 + 口诀 + 要点 + 想一想）
   以《金木水火土》为高质量样板：学课文不再是"列要点"，而是
   一节一节"图+文"地教；记一记用口诀与要点，与教学步骤区分开。
   ===================================================================== */

export const CHG1E: Record<string, ChineseEnhance> = {
  'chinese-g1-a-2-2': {
    example: '我们来读一首数字歌、认五个字，还要学会在田字格里把字写端正。',
    steps: [
      {
        title: '一边数，一边读',
        text: '伸出小手指，跟着课文数一数：一、二、三、四、五。数一个点一下，一个比一个大 1。',
        example: '一二三四五，五个好朋友，一个挨着一个排。',
        figure: { type: 'count', emoji: '⭐', count: 5 },
        check: { q: '“五”的前面是几？', options: ['4', '5', '6'], answer: 0 },
      },
      {
        title: '认识"金木水火土"',
        text: '金、木、水、火、土是五种东西：金是金属，木是树木，水会流动，火会燃烧，土是大地的土。',
        example: '木头可以造房子，水能喝，火能取暖，土里能长庄稼。',
        figure: { type: 'scene', bg: 'field', emojis: ['🪙', '🌳', '💧', '🔥', '🌍'], title: '金 木 水 火 土', text: '大地上有金属、树木、流水和火焰' },
        check: { q: '"木"跟什么有关？', options: ['树木', '金属', '水'], answer: 0 },
      },
      {
        title: '天地分上下，日月照今古',
        text: '天在上，地在下；太阳和月亮，从古到今都在天上照耀着我们。抬头是天，低头是地。',
        example: '早上出太阳，晚上出月亮，它们一直都照着大地。',
        figure: { type: 'scene', bg: 'sky', emojis: ['☀️', '🌙', '🌍'], title: '日月照今古', text: '太阳月亮在天上照耀，从古照到今' },
        check: { q: '太阳和月亮，一直都在哪里照耀？', options: ['天上', '地下', '水里'], answer: 0 },
      },
      {
        title: '认识田字格',
        text: '田字格把方格分成四小格：中间有横线和竖线，横的叫"横中线"，竖的叫"竖中线"。写字时要把字写在格子的中间。',
        example: '就像"上"字，写在田字格的正中间，才好看。',
        tip: '写字时要注意笔画在田字格中的位置，别写歪了。',
        figure: { type: 'tianzige', char: '上', showLabels: true },
        check: { q: '田字格里横着的那条虚线叫什么？', options: ['横中线', '竖中线', '对角线'], answer: 0 },
      },
      {
        title: '坐端正，握好笔',
        text: '写字前先坐端正、握好笔。头正、身直、臂开、足安，这样写出来的字又稳又好看。',
        example: '写字时胸口离桌子一拳远，眼睛离本子一尺远。',
        check: { q: '写字时要先做什么？', options: ['坐端正，握好笔', '随便躺着写', '站着写'], answer: 0 },
      },
    ],
    rhyme: '田字格，四方方，横竖中线把它分；\n写横写竖看位置，一笔一画写端正。',
    points: [
      '一二三四五：五个数字，一个比一个大 1。',
      '金木水火土：金、木、水、火、土 五种东西。',
      '天地分上下：上面是天，下面是地。',
      '日月照今古：太阳和月亮，从古到今天天照耀。',
      '田字格：有横中线、竖中线，帮我们把字写端正。',
    ],
    quiz: { q: '“五”的后面是几？', options: ['四', '六', '七'], answer: 1 },
  },
  'chinese-g1-a-2-1': {
    example: '我们先认识"天、地、人"，再认识身边"你、我、他"。',
    steps: [
      {
        title: '天、地、人',
        text: '天在我们的头顶上，地在我们脚下，"人"就是我们自己。天、地、人，是世间最根本的三样。',
        example: '抬头是天，低头是地，站着的我们就是人。',
        figure: { type: 'scene', bg: 'field', emojis: ['☀️', '🌍', '🧍‍♂️'], title: '天 地 人', text: '蓝天白云下，人稳稳地站在大地上' },
        check: { q: '我们脚下踩着的是什么？', options: ['地', '天', '水'], answer: 0 },
      },
      {
        title: '你、我、他',
        text: '说话的时候，称呼自己用"我"，称呼跟你说话的人用"你"，称呼旁边的人用"他"。',
        example: '我是小朋友，你是好朋友，他是新同学。',
        figure: { type: 'scene', bg: 'indoor', emojis: ['🧑‍🤝‍🧑', '👧', '👦'], title: '你 我 他', text: '你、我、他三个小朋友说说笑笑在一起' },
        check: { q: '称呼跟你说话的人，用哪个字？', options: ['你', '我', '他'], answer: 0 },
      },
      {
        title: '读准这三个字',
        text: '"你"是三声，"我"是三声，"他"是一声。跟着老师读：你、我、他，声音要洪亮。',
        check: { q: '"我"是第几声？', options: ['三声', '一声', '四声'], answer: 0 },
      },
    ],
    rhyme: '天在上，地在下，人在中间立得正；\n你说话，我听话，他来了，三个好朋友。',
    points: [
      '天地人：天在上，地在下，人在中间。',
      '你我他：说"我"是自己，说"你"是对方，说"他"是别人。',
      '读准字音：你（nǐ）、我（wǒ）、他（tā）。',
    ],
    quiz: { q: '称呼别人用哪个字？', options: ['我', '你', '他'], answer: 1 },
  },
  'chinese-g1-a-2-3': {
    example: '认一认身上的"口、耳、目、手、足"，再学一学站和坐的姿势。',
    steps: [
      {
        title: '口、耳、目、手、足',
        text: '口是嘴巴，用来吃饭说话；耳是耳朵，用来听声音；目是眼睛，用来看东西；手用来做事，足就是脚。',
        example: '指一指：这是口，这是耳，这是目……',
        figure: { type: 'scene', bg: 'indoor', emojis: ['👄', '👂', '👀', '✋', '🦶'], title: '口 耳 目 手 足', text: '小朋友指一指嘴巴、耳朵、眼睛、手和脚' },
        check: { q: '"目"指的是身体哪个部位？', options: ['眼睛', '耳朵', '嘴巴'], answer: 0 },
      },
      {
        title: '站如松，坐如钟',
        text: '站要站得像松树一样直，坐要坐得像钟一样稳，走路要轻快，躺下要放松。',
        example: '立正站好，抬头挺胸，就像一棵小松树。',
        figure: { type: 'scene', bg: 'indoor', emojis: ['🌲', '🪑', '🧍‍♂️'], title: '站如松 坐如钟', text: '立正站直像松树，坐下稳稳像座钟' },
        check: { q: '坐要坐得像什么一样稳？', options: ['钟', '松树', '风'], answer: 0 },
      },
      {
        title: '它们能做什么',
        text: '想一想：口、耳、目、手、足各自能做什么？比如口可以说话、吃东西；小手可以写字、画画。',
        example: '橡皮用小手拿，好听的歌用耳朵听。',
        check: { q: '用什么听声音？', options: ['耳朵', '眼睛', '嘴巴'], answer: 0 },
      },
    ],
    rhyme: '口吃饭，耳听话，目光亮亮看天下；\n小手做事真能干，小脚走路哒哒哒。',
    points: [
      '五官四肢：口、耳、目、手、足。',
      '姿势口诀：站如松、坐如钟、行如风、卧如弓。',
      '口耳目手足各有各的本领。',
    ],
    quiz: { q: '"足"指身上的哪个部位？', options: ['脚', '手', '头'], answer: 0 },
  },
  'chinese-g1-a-2-4': {
    example: '这些字都是象形字，看看它们的样子，猜一猜是什么。',
    steps: [
      {
        title: '日、月、山、川',
        text: '"日"像圆圆的太阳，"月"像弯弯的月亮，"山"像高高的山峰，"川"像流动的河水。',
        example: '日字中间一横，像太阳的光芒。',
        figure: { type: 'scene', bg: 'mountain', emojis: ['☀️', '🌙', '⛰️', '🌊'], title: '日 月 山 川', text: '圆日弯月挂天边，高山下河水长流' },
        check: { q: '"日"字像什么？', options: ['太阳', '月亮', '山'], answer: 0 },
      },
      {
        title: '水、火、田、禾',
        text: '"水"像流动的水，"火"像燃烧的火苗，"田"像一块块田地，"禾"像禾苗。',
        example: '田字里面分成了几小格，就是块块田地。',
        figure: { type: 'scene', bg: 'field', emojis: ['💧', '🔥', '🌾', '🌱'], title: '水 火 田 禾', text: '水在流、火在烧，田里禾苗绿油油' },
        check: { q: '"火"字像什么？', options: ['燃烧的火苗', '流动的水', '田地'], answer: 0 },
      },
      {
        title: '猜一猜，连一连',
        text: '看下面的图，和汉字连一连：兔、鸟、竹、羊、木、网。先自己猜，再和同学讨论。',
        example: '兔子的"兔"字，下面有个"儿"，像兔子的腿。',
        check: { q: '竹子的"竹"，和哪一种东西有关？', options: ['竹子', '小鸟', '小羊'], answer: 0 },
      },
    ],
    rhyme: '日像圆盘挂天上，月像小船空中晃；\n山水藏在字里藏，象形汉字真奇妙。',
    points: [
      '象形字：字的样子和东西的样子很像。',
      '日月山川、水火田禾，都是象形字。',
      '会看图猜字、连一连。',
    ],
    quiz: { q: '"田"字像什么？', options: ['一块块田地', '太阳', '山'], answer: 0 },
  },
  'chinese-g1-a-6-1': {
    example: '跟着老师读一读《秋天》，数一数课文有几个自然段，再感受秋天的美。',
    steps: [
      {
        title: '朗读课文，读准字音',
        text: '借助拼音读课文，一句一句读通顺。读"天气凉了，树叶黄了"时，声音要轻一点、慢一点。',
        example: '"啊！秋天来了！"读出开心的语气。',
        figure: { type: 'scene', bg: 'sky', emojis: ['🍂', '🌳', '🦢', '☁️'], title: '秋天', text: '树叶黄了飘落，大雁往南飞，秋天来了' },
        check: { q: '《秋天》一共有几个自然段？', options: ['3 个', '1 个', '5 个'], answer: 0 },
      },
      {
        title: '"一"的读音会变',
        text: '"一"在不同的词里读音不同：一片片（yí）、一会儿（yí）、一群（yì）。读的时候要听清、读准。',
        example: '一片片叶子、一会儿排成"人"字、一群大雁。',
        check: { q: '"一片片"里的"一"读第几声？', options: ['二声', '一声', '四声'], answer: 0 },
      },
      {
        title: '感受秋天的变化',
        text: '秋天来了：天气凉了，树叶黄了、落了，大雁往南飞，天空又蓝又高。',
        example: '抬头看天，低头看落叶，到处都有秋天的样子。',
        figure: { type: 'scene', bg: 'sky', emojis: ['🍁', '🦢', '🌤️'], title: '秋天的变化', text: '大雁往南飞，天空又高又蓝，落叶飘飘' },
        check: { q: '大雁往哪边飞？', options: ['南', '北', '东'], answer: 0 },
      },
      {
        title: '说一说秋天',
        text: '用"秋天来了，……"说一句话。比如：秋天来了，树叶黄了。秋天来了，果子熟了。',
        example: '秋天来了，天气凉了。',
        check: { q: '秋天来了，什么黄了？', options: ['树叶', '青蛙', '大雁'], answer: 0 },
      },
    ],
    rhyme: '天气凉，树叶黄，一片片叶子落地上；\n大雁南飞排成行，啊！秋天真漂亮。',
    points: [
      '秋天：天气凉、树叶黄、大雁南飞。',
      '"一"的变调：一片片、一会儿、一群。',
      '朗读时不要漏字、加字，读出秋天的美。',
    ],
    quiz: { q: '大雁往南飞，排成什么字？', options: ['“人”字或“一”字', '“口”字', '“日”字'], answer: 0 },
  },
  'chinese-g1-a-6-2': {
    example: '《江南》是一首汉乐府古诗，跟着老师读一读，想象采莲时鱼儿嬉戏的画面。',
    steps: [
      {
        title: '读一读《江南》',
        text: '这是一首古诗，节奏是"江南可采莲，莲叶何田田"。读的时候两个字一停，读出韵律。',
        example: '江南可采莲，莲叶何田田。',
        figure: { type: 'scene', bg: 'water', emojis: ['🪷', '🐟', '🌊'], title: '江南采莲', text: '江南池塘莲叶田田，人们划船去采莲' },
        check: { q: '"江南可采莲"，采的是什么？', options: ['莲', '鱼', '竹'], answer: 0 },
      },
      {
        title: '鱼戏莲叶间',
        text: '鱼儿在莲叶间游来游去：一会儿向东，一会儿向西，一会儿向南，一会儿向北，快乐极了。',
        example: '鱼戏莲叶东，鱼戏莲叶西，鱼戏莲叶南，鱼戏莲叶北。',
        figure: { type: 'scene', bg: 'water', emojis: ['🪷', '🐟', '🐠'], title: '鱼戏莲叶间', text: '小鱼在莲叶间游来游去，真快乐' },
        check: { q: '鱼儿在哪里游来游去？', options: ['莲叶间', '天上', '岸上'], answer: 0 },
      },
      {
        title: '认识东西南北',
        text: '东、西、南、北是四个方向。太阳升起的地方是东，落下的是西。',
        example: '早上太阳从东方升起。',
        check: { q: '太阳晚上从哪边落下？', options: ['西', '东', '南'], answer: 0 },
      },
    ],
    rhyme: '江南可采莲，莲叶何田田；\n鱼儿游东西，游向南和北。',
    points: [
      '《江南》是汉乐府古诗。',
      '江南采莲，莲叶又多又密（田田）。',
      '认识方位：东、西、南、北。',
    ],
    quiz: { q: '"鱼戏莲叶西"的"西"是哪个方向？', options: ['西', '东', '南'], answer: 0 },
  },
  'chinese-g1-a-3-1': {
    example: '先学三个单韵母 a、o、e，再学它们的四声。',
    steps: [
      {
        title: '认识 a、o、e',
        text: 'a、o、e 是三个单韵母。发 a 时嘴巴张大，发 o 时嘴巴圆圆，发 e 时嘴巴扁扁。',
        example: '阿姨的"阿"里有 a，公鸡喔喔叫有 o，白鹅的"鹅"有 e。',
        figure: { type: 'scene', bg: 'water', emojis: ['🙋‍♀️', '🐓', '🦢'], title: 'a o e', text: '河边阿姨张大嘴，公鸡喔喔，白鹅唱歌' },
        check: { q: '发 a 的时候，嘴巴要怎样？', options: ['张大', '圆圆', '扁扁'], answer: 0 },
      },
      {
        title: '学四声',
        text: '四个声调：一声平、二声扬、三声拐弯、四声降。跟着读：ā ō ē、á ó é、ǎ ǒ ě、à ò è。',
        example: 'ā á ǎ à，一声一声往上扬。',
        figure: { type: 'text', emoji: '🎵', title: '四声歌', text: '一声平，二声扬，三声拐弯，四声降。' },
        check: { q: '二声要怎样读？', options: ['扬起来', '平平的', '降下去'], answer: 0 },
      },
      {
        title: '找一找，读一读',
        text: '看到"阿姨"读 ā，看到"喔"读 ō，看到"鹅"读 é。把声调和字连起来。',
        example: '阿（ā）、喔（ō）、鹅（é）。',
        check: { q: '"阿"字里有哪个单韵母？', options: ['a', 'o', 'e'], answer: 0 },
      },
    ],
    rhyme: '张大嘴巴 a a a，圆圆嘴巴 o o o，\n扁扁嘴巴 e e e，三个单韵母要记牢。',
    points: [
      '单韵母 a、o、e。',
      '四声：一声平、二声扬、三声拐弯、四声降。',
      '看图读：阿姨、喔喔、白鹅。',
    ],
    quiz: { q: '哪个是单韵母？', options: ['a', 'b', 'zh'], answer: 0 },
  },
  'chinese-g1-a-7-1': {
    example: '跟着老师读一读《对韵歌》，找一找哪两个词是一对。',
    steps: [
      {
        title: '读一读对韵歌',
        text: '像"云对雨，雪对风"这样，一个对一个，读起来朗朗上口，叫"对韵"。',
        example: '云对雨，雪对风，花对树，鸟对虫。',
        figure: { type: 'scene', bg: 'sky', emojis: ['☁️', '🌧️', '❄️', '🌬️'], title: '云对雨 雪对风', text: '天上的云对雨、雪对风，对对子真有趣' },
        check: { q: '"云对雨"里，云对的是什么？', options: ['雨', '雪', '风'], answer: 0 },
      },
      {
        title: '找一找对子',
        text: '山清对水秀，柳绿对桃红。清对秀，绿对红，都是意思相对的字。',
        example: '柳绿对桃红，绿和红都是颜色。',
        figure: { type: 'scene', bg: 'mountain', emojis: ['🌳', '🌸', '🏞️'], title: '山清对水秀', text: '山青青水秀秀，柳树绿桃花红' },
        check: { q: '"柳绿"对的是？', options: ['桃红', '水秀', '山清'], answer: 0 },
      },
      {
        title: '自己试着对一对',
        text: '想一想还能怎么对：天对地，上对下，大对小，多对少。',
        example: '天对地，上对下，多对少。',
        check: { q: '"天"可以对什么？', options: ['地', '水', '花'], answer: 0 },
      },
    ],
    rhyme: '云对雨，雪对风，花对树，鸟对虫；\n山清水秀柳绿红，对对子，真有趣。',
    points: [
      '对韵：一个对一个，意思相对。',
      '对子：云—雨、雪—风、花—树、鸟—虫、山清—水秀、柳绿—桃红。',
      '朗读要读出韵律和节奏。',
    ],
    quiz: { q: '"雪"可以对什么？', options: ['风', '雨', '花'], answer: 0 },
  },
  'chinese-g1-a-7-2': {
    example: '这些字很神奇：两个字合起来就成了一个新字。一起来发现吧！',
    steps: [
      {
        title: '日月明，田力男',
        text: '"日"和"月"合起来是"明"（明亮）；"田"和"力"合起来是"男"（种田的力气大）。',
        example: '日＋月＝明，田＋力＝男。',
        figure: { type: 'scene', bg: 'sky', emojis: ['☀️', '🌙', '💡'], title: '日＋月＝明', text: '太阳和月亮合起来，就是明亮的明' },
        check: { q: '"日"和"月"合起来是什么字？', options: ['明', '男', '尖'], answer: 0 },
      },
      {
        title: '小大尖，小土尘',
        text: '"小"在上"大"在下是"尖"；"小"加"土"是"尘"。还有：二人从，三人众；双木林，三木森。',
        example: '小＋大＝尖，小＋土＝尘。',
        figure: { type: 'scene', bg: 'field', emojis: ['🔺', '🌳', '🌲'], title: '会意字', text: '小大合成尖，双木成林，会意字真奇妙' },
        check: { q: '"小"和"大"合起来是什么字？', options: ['尖', '尘', '明'], answer: 0 },
      },
      {
        title: '一条心，变成金',
        text: '"一人不成众，独木不成林。众人一条心，黄土变成金。"意思是大家团结起来力量大。',
        check: { q: '黄土变成金，说的是什么道理？', options: ['团结力量大', '土会变金', '人多麻烦'], answer: 0 },
      },
    ],
    rhyme: '日月明，田力男，小大尖，小土尘；\n二人从，三人众，双木林，三木森。',
    points: [
      '会意字：几个字合成一个新字，意思也合在一起。',
      '日＋月＝明，田＋力＝男，小＋大＝尖，小＋土＝尘。',
      '众人一条心，黄土变成金——团结力量大。',
    ],
    quiz: { q: '"人"和"人"合起来是什么字？', options: ['从', '众', '林'], answer: 0 },
  },
  'chinese-g1-a-7-3': {
    example: '一起来看看小书包里有什么学习用品，再学一首《小书包》。',
    steps: [
      {
        title: '书包里的宝贝',
        text: '橡皮、尺子、作业本、笔袋、铅笔、转笔刀，都是我们的学习用品。',
        example: '铅笔写字，橡皮擦，尺子画线。',
        figure: { type: 'scene', bg: 'indoor', emojis: ['✏️', '📏', '📒', '🖊️'], title: '学习用品', text: '书桌上摆着铅笔、尺子、作业本和笔' },
        check: { q: '下面哪个是学习用品？', options: ['铅笔', '皮球', '玩具'], answer: 0 },
      },
      {
        title: '读一读儿歌',
        text: '我的小书包，宝贝真不少。课本作业本，铅笔转笔刀。天天起得早，陪我去学校。',
        example: '把"宝贝"读得开心一点。',
        check: { q: '儿歌里的"宝贝"指的是什么？', options: ['学习用品', '玩具', '零食'], answer: 0 },
      },
      {
        title: '自己整理书包',
        text: '文具用完要摆放整齐，每天自己整理书包，做会整理的好孩子。',
        example: '我会把文具摆放整齐，我会自己整理书包。',
        check: { q: '下课后，应该怎样对待自己的书包？', options: ['整理整齐', '随手乱丢', '什么都不管'], answer: 0 },
      },
    ],
    rhyme: '小书包，真不少，课本作业本，铅笔转笔刀；\n用完放整齐，天天背书包。',
    points: [
      '学习用品：橡皮、尺子、作业本、笔袋、铅笔、转笔刀。',
      '儿歌：我的小书包，宝贝真不少。',
      '学会整理书包，摆放文具。',
    ],
    quiz: { q: '铅笔和转笔刀都是什么？', options: ['学习用品', '玩具', '水果'], answer: 0 },
  },
  'chinese-g1-a-8-1': {
    example: '这首儿歌里的"小船"其实是什么？读一读，想一想。',
    steps: [
      {
        title: '弯弯的月儿小小的船',
        text: '"弯弯的月儿小小的船"——天上的月儿弯弯的，就像一艘小船。',
        example: '我把月儿当成小船，坐在里面。',
        figure: { type: 'scene', bg: 'night', emojis: ['🌙', '🚢', '✨'], title: '弯弯的月儿', text: '弯弯的月儿像小船，挂在深蓝的夜空' },
        check: { q: '儿歌里的"小小的船"指的是什么？', options: ['月儿', '真船', '星星'], answer: 0 },
      },
      {
        title: '照样子说一说',
        text: '船（小小的船）、月儿（弯弯的月儿）、星星（闪闪的星星）、天（蓝蓝的天）。',
        example: '弯弯的小河，蓝蓝的大海。',
        check: { q: '"蓝蓝的"后面可以接什么？', options: ['天', '星星', '月儿'], answer: 0 },
      },
      {
        title: '夜晚的想象',
        text: '我在小小的船里坐，只看见闪闪的星星蓝蓝的天——多美的夜晚啊！',
        example: '数一数天上的星星。',
        figure: { type: 'scene', bg: 'night', emojis: ['🌌', '⭐', '🌙'], title: '星星蓝蓝天', text: '闪闪的星星眨着眼，蓝蓝的天真美' },
        check: { q: '我在小小的船里，看见了什么？', options: ['星星和蓝天', '大海', '小树'], answer: 0 },
      },
    ],
    rhyme: '弯弯的月儿小小的船，小小的船儿两头尖；\n我在船里坐，看见星星蓝蓝天。',
    points: [
      '比喻：弯弯的月儿像小小的船。',
      '叠词：弯弯的、小小的、闪闪的、蓝蓝的。',
      '夜晚的想象很美，要大胆想象。',
    ],
    quiz: { q: '"闪闪的"后面接什么？', options: ['星星', '月儿', '大海'], answer: 0 },
  },
  'chinese-g1-a-8-2': {
    example: '影子一直跟着我，它像什么？读一读《影子》。',
    steps: [
      {
        title: '影子在前在后',
        text: '影子在前，影子在后，影子常常跟着我，就像一条小黑狗。',
        example: '太阳在前面，影子就跑到后面。',
        figure: { type: 'scene', bg: 'sky', emojis: ['👤', '🐕', '☀️'], title: '影子像小黑狗', text: '太阳下影子一前一后跟着我，像小黑狗' },
        check: { q: '影子像什么？', options: ['小黑狗', '小猫', '小兔'], answer: 0 },
      },
      {
        title: '影子在左在右',
        text: '影子在左，影子在右，影子常常陪着我，它是我的好朋友。',
        example: '有光的地方就有影子。',
        figure: { type: 'scene', bg: 'sky', emojis: ['👧', '👤', '🌞'], title: '影子像好朋友', text: '阳光下的影子忽左忽右，像好朋友陪我' },
        check: { q: '影子常常陪着我，是我的什么？', options: ['好朋友', '小玩具', '小动物'], answer: 0 },
      },
      {
        title: '说说你的前后左右',
        text: '你的前面、后面、左面、右面分别是谁？说一说，学会分清方向。',
        example: '我的前面是黑板，右面是窗户。',
        check: { q: '影子会跟着谁走？', options: ['我', '别人', '不会跟'], answer: 0 },
      },
    ],
    rhyme: '影子前，影子后，影子像条小黑狗；\n影子左，影子右，影子陪我好朋友。',
    points: [
      '影子随光而来，有光就有影子。',
      '方位：前、后、左、右。',
      '把影子当成好朋友。',
    ],
    quiz: { q: '有光的地方，影子会怎样？', options: ['出现', '消失', '不变'], answer: 0 },
  },
  'chinese-g1-a-8-3': {
    example: '人有哪两件宝？读一读《两件宝》，找找答案。',
    steps: [
      {
        title: '人有两件宝',
        text: '人有两件宝，双手和大脑。双手会做工，大脑会思考。',
        example: '一双手，一个聪明的大脑。',
        figure: { type: 'scene', bg: 'indoor', emojis: ['✋', '🧠'], title: '双手和大脑', text: '人有两件宝：双手会做工，大脑会思考' },
        check: { q: '人有哪两件宝？', options: ['双手和大脑', '眼睛和耳朵', '腿和脚'], answer: 0 },
      },
      {
        title: '手和脑的分工',
        text: '双手会做工，大脑会思考。用手不用脑，事情做不好；用脑不用手，啥也办不到。',
        example: '先动脑想，再动手做。',
        check: { q: '大脑会做什么？', options: ['思考', '做工', '走路'], answer: 0 },
      },
      {
        title: '用手又用脑',
        text: '用手又用脑，才能有创造。做事情要想一想、做一做，手脑并用。',
        check: { q: '为什么"要用脑又用手"？', options: ['才能有创造', '手会累', '没有别的'], answer: 0 },
      },
    ],
    rhyme: '人有两件宝，双手和大脑；\n双手会做工，大脑会思考。',
    points: [
      '两件宝：双手、大脑。',
      '手脑并用，才能把事情做好、有创造。',
      '歌谣是陶行知先生写的。',
    ],
    quiz: { q: '怎样才能有创造？', options: ['用手又用脑', '只用手', '只用脑'], answer: 0 },
  },
  'chinese-g1-a-3-2': {
    example: '认一认 i、u、ü 三个单韵母，注意 ü 上面有两个小点。',
    steps: [
      { title: '认识 i、u、ü', text: 'i 像一件小衣服，u 像一只小乌鸦，ü 像一条小鱼。ü 上面的两点，像小鱼的眼睛。', example: '衣服的"衣"有 i，乌鸦的"乌"有 u，小鱼的"鱼"有 ü。', figure: { type: 'text', emoji: '🔤', title: 'i u ü', text: 'i 一竖一点　u 一个半圆　ü 两点在上' }, check: { q: '哪个字母上面有两个小点？', options: ['ü', 'i', 'u'], answer: 0 } },
      { title: '读四声', text: 'i、u、ü 也有四声：ī í ǐ ì、ū ú ǔ ù、ǖ ǘ ǚ ǜ。', example: 'ī 的一声平平，í 的二声扬起来。', check: { q: 'ǖ 是第几声？', options: ['一声', '二声', '三声'], answer: 0 } },
    ],
    rhyme: '小 i 小 u 小 ü 仨，ü 上两点像鱼眼；\n衣服乌鱼读一读，四声变化要记全。',
    points: ['单韵母 i、u、ü。', 'ü 上两点，小 u 没点。', 'i u ü 的四声。'],
    quiz: { q: '"鱼"的读音里有哪个单韵母？', options: ['ü', 'i', 'u'], answer: 0 },
  },
  'chinese-g1-a-3-3': {
    example: '认一认声母 b、p、m、f，再试着拼一拼。',
    steps: [
      { title: '认读 b、p、m、f', text: 'b 像广播，p 像爬坡，m 像两扇门，f 像一根拐杖。读的时候要轻轻、短短。', example: 'b ǎ（坡）、p、m、f 都是声母。', figure: { type: 'scene', bg: 'mountain', emojis: ['📻', '⛰️', '🚪', '🦯'], title: 'b p m f', text: 'b像广播、p像山坡，m像门、f像拐杖' }, check: { q: '下面哪个是声母？', options: ['b', 'a', 'o'], answer: 0 } },
      { title: '拼一拼', text: '声母和韵母相拼：b—à→bà 爸，m—ā→mā 妈。前音轻短后音重，两音相连猛一碰。', example: '爸爸、妈妈，bà ba、mā ma。', check: { q: 'b—à 拼成什么音节？', options: ['bà', 'bō', 'bí'], answer: 0 } },
    ],
    rhyme: 'b 像广播 p 爬坡，m 像两扇门，f 像拐杖；\n爸是 bà，妈是 mā，声母轻轻拼一拼。',
    points: ['声母 b、p、m、f。', '拼读口诀：前音轻短后音重，两音相连猛一碰。', '会拼 bà、mā 等音节。'],
    quiz: { q: '"爸爸"的"爸"读音是？', options: ['bà', 'mā', 'pā'], answer: 0 },
  },
  'chinese-g1-a-3-4': {
    example: '认一认 d、t、n、l，用它们拼出"大地、马路、泥土"。',
    steps: [
      { title: '认读 d、t、n、l', text: 'd 像马蹄，t 像雨伞，n 像一扇门，l 像一根小棒。它们都是声母。', example: 'd、t、n、l 读得轻又短。', figure: { type: 'scene', bg: 'field', emojis: ['🐎', '☂️', '🚪', '🥢'], title: 'd t n l', text: 'd像马蹄、t像雨伞，n像门、l像小棒' }, check: { q: '下面哪个是声母？', options: ['d', 'a', 'e'], answer: 0 } },
      { title: '拼一拼', text: 'd—à→dà 大，m—ǎ→mǎ 马，l—ù→lù 路，t—ǔ→tǔ 土。', example: '大地（dà dì）、马路（mǎ lù）、泥土（ní tǔ）。', check: { q: 'l—ù 拼成什么音节？', options: ['lù', 'lú', 'lǔ'], answer: 0 } },
    ],
    rhyme: 'd 马蹄 t 雨伞，n 小门 l 小棒；\n大是 dà，马路 mǎ lù，泥土 ní tǔ。',
    points: ['声母 d、t、n、l。', '拼读：dà、mǎ、lù、tǔ。', '读儿歌《小白兔》感受押韵。'],
    quiz: { q: '"大"的读音是？', options: ['dà', 'tà', 'là'], answer: 0 },
  },
  'chinese-g1-a-4-1': {
    example: '认一认 g、k、h，读一读"哥哥、弟弟、画画、荷花"。',
    steps: [
      { title: '认读 g、k、h', text: 'g 像鸽子的头，k 像一把机枪，h 像一把椅子。读的时候要轻轻送出气。', example: 'g、k、h 是声母，读得轻又短。', figure: { type: 'scene', bg: 'sky', emojis: ['🕊️', '🔫', '🪑'], title: 'g k h', text: 'g像鸽子、k像机枪，h像一把椅子' }, check: { q: '下面哪个是声母？', options: ['g', 'a', 'e'], answer: 0 } },
      { title: '拼一拼，读一读', text: 'g—ē→gē 哥，d—ì→dì 弟，huà 画，huā 花。', example: '哥哥、弟弟、画画、荷花。', check: { q: '"哥哥"的"哥"读音是？', options: ['gē', 'kē', 'hē'], answer: 0 } },
    ],
    rhyme: 'g 鸽子 k 机枪，h 椅子站前方；\n哥哥弟弟画画，荷花清香。',
    points: ['声母 g、k、h。', '拼读 gē、kē、hē。', '会读词：哥哥、弟弟、画画、荷花。'],
    quiz: { q: '"花"的读音是？', options: ['huā', 'guā', 'kuā'], answer: 0 },
  },
  'chinese-g1-a-4-2': {
    example: '认一认 j、q、x，读一读"打鼓、下棋、搭积木"。',
    steps: [
      { title: '认读 j、q、x', text: 'j 像一只小鸡，q 像一个小气球，x 像一个叉叉。它们和 ü 相拼时，ü 上两点要省略。', example: 'j—ü→ju，ü 上两点不见了。', figure: { type: 'scene', bg: 'field', emojis: ['🐤', '🎈', '✖️'], title: 'j q x', text: 'j像小鸡、q像气球，x像叉叉' }, check: { q: 'j、q、x 和 ü 相拼时，ü 上两点怎么做？', options: ['去掉', '留着', '变成横'], answer: 0 } },
      { title: '拼一拼，读一读', text: 'd—ǎ→dǎ 打，q—í→qí 棋，j—ī→jī 积，m—ù→mù 木。', example: '打鼓、下棋、搭积木。', check: { q: 'j—ī 拼成什么音节？', options: ['jī', 'jú', 'qī'], answer: 0 } },
    ],
    rhyme: 'j 小鸡 q 气球，x 是叉叉点点头；\n打鼓下棋搭积木，j q x 记心头。',
    points: ['声母 j、q、x。', 'j q x 与 ü 相拼，ü 上两点省略。', '拼读：dǎ、qí、jī、mù。'],
    quiz: { q: '"棋"的读音是？', options: ['qí', 'jī', 'xí'], answer: 0 },
  },
  'chinese-g1-a-4-3': {
    example: '认一认平舌音 z、c、s，读一读"字、词、句子"。',
    steps: [
      { title: '认读 z、c、s', text: 'z、c、s 是平舌音，舌尖平平地抵住上牙背。z 像数字 2，c 像半个圆，s 像一条弯弯的蛇。', example: '读 z、c、s 时舌头放平。', figure: { type: 'scene', bg: 'field', emojis: ['2️⃣', '🌙', '🐍'], title: 'z c s', text: 'z像数字2、c像月牙，s像弯弯的蛇' }, check: { q: 'z、c、s 是平舌音还是翘舌音？', options: ['平舌音', '翘舌音', '都不是'], answer: 0 } },
      { title: '读一读', text: 'zì 字、cí 词、jù zi 句子。', example: '字词句子，一字一句。', check: { q: '"字"的读音是？', options: ['zì', 'cì', 'sì'], answer: 0 } },
    ],
    rhyme: 'z 像 2，c 像月牙，s 像小蛇弯弯爬；\n平舌平舌顶牙齿，z c s 记心中。',
    points: ['平舌音 z、c、s。', '拼读 zì、cí、jù。', '读儿歌《过桥》。'],
    quiz: { q: '"词"的读音是？', options: ['cí', 'zí', 'sí'], answer: 0 },
  },
  'chinese-g1-a-4-4': {
    example: '认一认翘舌音 zh、ch、sh、r，再读一读绕口令。',
    steps: [
      { title: '认读 zh、ch、sh、r', text: 'zh、ch、sh、r 是翘舌音，舌尖要翘起来，抵住上颚。', example: '读 zh、ch、sh 时舌头要翘。', figure: { type: 'scene', bg: 'indoor', emojis: ['👄', '👅', '🗣️'], title: 'zh ch sh r', text: '读翘舌音，舌尖翘起来抵住上颚' }, check: { q: 'zh、ch、sh、r 是翘舌音吗？', options: ['是', '不是', '不知道'], answer: 0 } },
      { title: '读绕口令', text: '四是四，十是十，十四是十四，四十是四十。读的时候要分清 z 和 zh。', example: '四十不是十四，十四不是四十。', check: { q: '"十"是翘舌音吗？', options: ['是', '不是', '不知道'], answer: 0 } },
    ],
    rhyme: 'zh ch sh r 翘舌尖，四四是四十是十；\n绕口令，读一读，平翘分清不走样。',
    points: ['翘舌音 zh、ch、sh、r。', '区分平舌 z、c、s 和翘舌 zh、ch、sh。', '读准绕口令。'],
    quiz: { q: '"四"是平舌音还是翘舌音？', options: ['平舌音', '翘舌音', '都不是'], answer: 0 },
  },
  'chinese-g1-a-4-5': {
    example: '认一认 y、w 和整体认读音节 yi、wu、yu。',
    steps: [
      { title: '认识 y、w', text: 'y 是大 i，w 是大 u。它们可以当声母用。', example: 'y 和 w 读得轻又短。', figure: { type: 'scene', bg: 'water', emojis: ['🐟', '🦆', '🐜'], title: 'y w', text: '水边的小鱼、鸭子和小蚂蚁来学拼音' }, check: { q: 'y、w 可以当什么用？', options: ['声母', '韵母', '都不是'], answer: 0 } },
      { title: '整体认读音节', text: 'yi、wu、yu 是整体认读音节，要整个记住，不用拼读。', example: 'yi、wu、yu，不用拼，直接读。', check: { q: '下面哪个是整体认读音节？', options: ['yu', 'y', 'u'], answer: 0 } },
    ],
    rhyme: 'y 大 i，w 大 u，yi wu yu 记心头；\n整体认读不用拼，鱼鸭乌呀读得溜。',
    points: ['声母 y、w。', '整体认读音节 yi、wu、yu。', '会读：鱼、鸭子、乌鸦、蚂蚁。'],
    quiz: { q: '"鱼"的整体认读音节是？', options: ['yu', 'yi', 'wu'], answer: 0 },
  },
  'chinese-g1-a-5-1': {
    example: '学一学复韵母 ai、ei、ui，读一读"白菜、西瓜"。',
    steps: [
      { title: '认识 ai、ei、ui', text: 'ai 由 a 和 i 组成，ei 由 e 和 i 组成，ui 由 u 和 i 组成。读的时候前一个音要重，后一个音要轻。', example: 'ai、ei、ui 是复韵母。', figure: { type: 'text', emoji: '🔤', title: 'ai ei ui', text: '复韵母：两个字母合起来，前重后轻' }, check: { q: 'ai、ei、ui 都是什么？', options: ['复韵母', '单韵母', '声母'], answer: 0 } },
      { title: '读一读', text: '白菜（bái cài）、西瓜（xī guā）、水果（shuǐ guǒ）。', example: '白、飞、水，都带复韵母。', check: { q: '"白"的读音是？', options: ['bái', 'bāi', 'pái'], answer: 0 } },
    ],
    rhyme: 'ai ei ui 三兄妹，前重后轻读得美；\n白菜西瓜和水果，复韵母里找一找。',
    points: ['复韵母 ai、ei、ui。', '读音：前重后轻。', '会拼 bái、fēi、shuǐ。'],
    quiz: { q: '"水"的读音是？', options: ['shuǐ', 'shái', 'suǐ'], answer: 0 },
  },
  'chinese-g1-a-5-2': {
    example: '学一学复韵母 ao、ou、iu，读一读"小桥、流水、垂柳、桃花"。',
    steps: [
      { title: '认识 ao、ou、iu', text: 'ao、ou、iu 都是复韵母，读时前重后轻，要一气呵成。', example: 'ao、ou、iu，三个好朋友。', figure: { type: 'text', emoji: '🔤', title: 'ao ou iu', text: '复韵母：前音重，后音轻' }, check: { q: 'ao、ou、iu 是复韵母吗？', options: ['是', '不是', '不确定'], answer: 0 } },
      { title: '读一读', text: '小桥（xiǎo qiáo）、流水（liú shuǐ）、垂柳（chuí liǔ）、桃花（táo huā）。', example: '小桥流水垂柳桃花，真美。', check: { q: '"桥"的读音是？', options: ['qiáo', 'qiǎo', 'jiáo'], answer: 0 } },
    ],
    rhyme: 'ao ou iu 记心头，前重后轻要读好；\n小桥流水垂柳花，ao ou iu 里面找。',
    points: ['复韵母 ao、ou、iu。', '拼读：xiǎo、liú、táo。', '读儿歌《欢迎台湾小朋友》。'],
    quiz: { q: '"桃"的读音是？', options: ['táo', 'dáo', 'tǎo'], answer: 0 },
  },
  'chinese-g1-a-5-3': {
    example: '学一学 ie、üe 和特殊韵母 er，认识整体认读音节 ye、yue。',
    steps: [
      { title: '认识 ie、üe、er', text: 'ie 由 i 和 e 组成，üe 由 ü 和 e 组成，er 是特殊韵母，只能单独做音节。', example: 'er 只能自己成音节，不跟声母拼。', figure: { type: 'text', emoji: '🔤', title: 'ie üe er', text: 'ie üe 复韵母　er 特殊韵母' }, check: { q: '哪个是特殊韵母？', options: ['er', 'ie', 'üe'], answer: 0 } },
      { title: '整体认读 ye、yue', text: 'ie、üe 可以编成整体认读音节 ye、yue。', example: 'ye、yue，不用拼，直接读。', check: { q: 'ye、yue 是什么音节？', options: ['整体认读音节', '声母', '单韵母'], answer: 0 } },
    ],
    rhyme: 'ie üe er 三兄弟，er 是特殊韵母；\nye yue 整体读，梅花雪花夜色美。',
    points: ['复韵母 ie、üe，特殊韵母 er。', '整体认读音节 ye、yue。', '读儿歌《月儿弯弯》。'],
    quiz: { q: '"月"的整体认读音节是？', options: ['yue', 'ye', 'er'], answer: 0 },
  },
  'chinese-g1-a-5-4': {
    example: '学一学前鼻韵母 an、en、in、un、ün，读一读"蓝天、白云"。',
    steps: [
      { title: '认识 an、en、in、un、ün', text: '这些都是前鼻韵母，发音时舌尖要抵住上牙床，鼻子出气。', example: 'an、en、in、un、ün，舌尖顶上牙床。', figure: { type: 'text', emoji: '🔤', title: 'an en in un ün', text: '前鼻韵母：舌尖抵上牙床' }, check: { q: 'an、en、in、un、ün 都是什么？', options: ['前鼻韵母', '声母', '单韵母'], answer: 0 } },
      { title: '整体认读 yuan、yin、yun', text: 'yuan、yin、yun 是整体认读音节，不用拼，直接读。', example: '蓝天（lán tiān）、白云（bái yún）、草原（cǎo yuán）。', check: { q: '"云"的整体认读音节是？', options: ['yun', 'yin', 'yuan'], answer: 0 } },
    ],
    rhyme: 'an en in un ün，舌尖顶上牙床；\nyuan yin yun 整体读，蓝天白云草原上。',
    points: ['前鼻韵母 an、en、in、un、ün。', '整体认读音节 yuan、yin、yun。', '读儿歌《家》。'],
    quiz: { q: '"蓝"的读音是？', options: ['lán', 'lān', 'nán'], answer: 0 },
  },
  'chinese-g1-a-5-5': {
    example: '学一学后鼻韵母 ang、eng、ing、ong，读一读"游泳、滑冰"。',
    steps: [
      { title: '认识 ang、eng、ing、ong', text: '这些都是后鼻韵母，发音时舌根抬起，鼻子出气，声音要长。', example: 'ang、eng、ing、ong，舌根顶住后鼻。', figure: { type: 'text', emoji: '🔤', title: 'ang eng ing ong', text: '后鼻韵母：舌根抬起，鼻子出气' }, check: { q: 'ang、eng、ing、ong 都是什么？', options: ['后鼻韵母', '前鼻韵母', '声母'], answer: 0 } },
      { title: '整体认读 ying + 拼读', text: 'ying 是整体认读音节。yóu 游、bīng 冰、huá 滑、qí 骑。', example: '游泳、滑冰、骑自行车、打乒乓球。', check: { q: '"冰"的读音是？', options: ['bīng', 'bīn', 'píng'], answer: 0 } },
    ],
    rhyme: 'ang eng ing ong，舌根抬起鼻出气；\nying 整体认读，游泳滑冰真有趣。',
    points: ['后鼻韵母 ang、eng、ing、ong。', '区分前鼻音 an、en、in 和后鼻音 ang、eng、ing。', '整体认读音节 ying。'],
    quiz: { q: '"星"的韵母是？', options: ['ing', 'in', 'ang'], answer: 0 },
  },
  'chinese-g1-a-1-1': {
    example: '上学第一天，先认识"我是中国人"。',
    steps: [
      { title: '我是中国人', text: '我们是中国人，我们都是中华民族的一员。', example: '我是中国人，我骄傲。', figure: { type: 'scene', bg: 'city', emojis: ['🧑‍🤝‍🧑', '🏮', '🌏'], title: '我是中国人', text: '各族小朋友手拉手，我们都是中国人' }, check: { q: '我们是哪个民族大家庭的一员？', options: ['中华民族', '外民族', '都不是'], answer: 0 } },
      { title: '一家人', text: '我们都是中国人，中华民族是一家。大家相亲相爱，团结在一起。', example: '五十六个民族，是一家。', check: { q: '我们是一家人吗？', options: ['是', '不是', '不知道'], answer: 0 } },
    ],
    rhyme: '我是中国人，我是中华娃；\n各族小朋友，都是一家人。',
    points: ['我是中国人。', '我们都是中华民族的一家人。', '热爱自己的祖国。'],
    quiz: { q: '我们是哪个国家的孩子？', options: ['中国', '外国', '不知道'], answer: 0 },
  },
  'chinese-g1-a-1-2': {
    example: '认识我们的国旗、首都天安门和长江黄河。',
    steps: [
      { title: '五星红旗和天安门', text: '我们的国旗是五星红旗，首都北京有雄伟的天安门。', example: '五星红旗，我爱您。', figure: { type: 'scene', bg: 'city', emojis: ['🚩', '🏛️'], title: '五星红旗 天安门', text: '首都天安门城楼前，五星红旗高高飘扬' }, check: { q: '我们的国旗是什么旗？', options: ['五星红旗', '红旗', '彩旗'], answer: 0 } },
      { title: '长江和黄河', text: '长江、黄河是我们的大江大河，我们爱长江，爱黄河，爱中华人民共和国。', example: '我爱长江，我爱黄河。', figure: { type: 'scene', bg: 'water', emojis: ['🌊', '🏞️', '❤️'], title: '长江 黄河', text: '长江黄河滚滚向前，我们热爱祖国' }, check: { q: '我们爱什么？', options: ['中华人民共和国', '别的国家', '谁都不爱'], answer: 0 } },
    ],
    rhyme: '五星红旗迎风飘，天安门真雄伟；\n长江黄河水长流，我爱我的祖国。',
    points: ['国旗：五星红旗。', '首都：北京天安门。', '长江、黄河是我们的大河。'],
    quiz: { q: '五星红旗是我们的什么？', options: ['国旗', '校旗', '队旗'], answer: 0 },
  },
  'chinese-g1-a-1-3': {
    example: '学唱《上学歌》，做个守时爱学习的小学生。',
    steps: [
      { title: '唱一唱《上学歌》', text: '太阳当空照，花儿对我笑。小鸟说：早，早，早，你为什么背上小书包？', example: '上学歌真欢快。', figure: { type: 'scene', bg: 'sky', emojis: ['🌞', '🌼', '🐦'], title: '上学歌', text: '太阳当空照，花儿对我笑，小鸟问早' }, check: { q: '上学歌里，小鸟说什么？', options: ['早，早，早', '你好', '再见'], answer: 0 } },
      { title: '做个好学生', text: '我去上学校，天天不迟到。爱学习，爱劳动，长大要为人民立功劳。', example: '上学不迟到，爱学习爱劳动。', check: { q: '上学应该怎样？', options: ['不迟到', '迟到', '不去'], answer: 0 } },
    ],
    rhyme: '太阳当空照，花儿对我笑；\n背上小书包，天天早到校。',
    points: ['学唱《上学歌》。', '上学不迟到，爱学习、爱劳动。', '长大为人民立功劳。'],
    quiz: { q: '上学歌里，花儿对"我"干什么？', options: ['笑', '哭', '不理'], answer: 0 },
  },
  'chinese-g1-a-1-4': {
    example: '语文课要学读书、写字、讲故事、听故事。',
    steps: [
      { title: '读书写字', text: '语文课里，我们会学着读书、写字，认很多很多汉字。', example: '我会读书，会写字。', figure: { type: 'scene', bg: 'indoor', emojis: ['📖', '✍️'], title: '读书写字', text: '小朋友在教室里认真读书、写字' }, check: { q: '语文课要学什么？', options: ['读书写字', '唱歌', '跑步'], answer: 0 } },
      { title: '讲故事，听故事', text: '我们还爱听故事、讲故事。故事里有很多有趣的事。', example: '我爱听故事，也爱讲故事。', figure: { type: 'scene', bg: 'indoor', emojis: ['📚', '🗣️', '👧'], title: '讲故事', text: '大家围坐在一起，听故事、讲故事' }, check: { q: '你爱听什么？', options: ['故事', '不说话', '发呆'], answer: 0 } },
    ],
    rhyme: '我爱学语文，读书又写字；\n故事真好听，大家都爱听。',
    points: ['语文课学读书、写字、讲故事、听故事。', '我爱学语文。', '从今天起好好学语文。'],
    quiz: { q: '下面哪一样是语文课要学的？', options: ['写字', '踢球', '画画'], answer: 0 },
  },
  'chinese-g1-a-7-4': {
    example: '升国旗时，我们要站好、敬礼。',
    steps: [
      { title: '五星红旗，我们的国旗', text: '五星红旗，我们的国旗。国歌声中，徐徐升起。', example: '升国旗时，大家要立正。', figure: { type: 'scene', bg: 'city', emojis: ['🚩', '🎶'], title: '升国旗', text: '国歌声中，五星红旗迎着风徐徐升起' }, check: { q: '我们的国旗是什么旗？', options: ['五星红旗', '红旗', '蓝旗'], answer: 0 } },
      { title: '向着国旗立正敬礼', text: '向着国旗，我们立正；望着国旗，我们敬礼。', example: '升国旗时，眼睛看着国旗。', figure: { type: 'scene', bg: 'city', emojis: ['🧒', '🚩'], title: '立正敬礼', text: '望着国旗立正站好，少先队员敬队礼' }, check: { q: '升国旗时应该怎么做？', options: ['立正敬礼', '乱跑', '大声叫'], answer: 0 } },
    ],
    rhyme: '五星红旗飘呀飘，国歌声中慢慢升；\n向着国旗立正站，望着国旗来敬礼。',
    points: ['五星红旗是我国的国旗。', '升国旗时要立正、敬礼。', '尊敬国旗，热爱祖国。'],
    quiz: { q: '国歌声中，国旗怎样升起？', options: ['徐徐升起', '一下子落下', '不动'], answer: 0 },
  },
  'chinese-g1-a-9-1': {
    example: '猜一猜：谁的尾巴长？谁的尾巴短？',
    steps: [
      { title: '谁的尾巴长、短、像把伞', text: '猴子的尾巴长，兔子的尾巴短，松鼠的尾巴好像一把伞。', example: '猴子的尾巴最长。', figure: { type: 'scene', bg: 'forest', emojis: ['🐒', '🐰', '🐿️'], title: '比尾巴', text: '猴子的尾巴长，兔子的短，松鼠的像伞' }, check: { q: '谁的尾巴最长？', options: ['猴子', '兔子', '松鼠'], answer: 0 } },
      { title: '谁的尾巴好看', text: '公鸡的尾巴弯，鸭子的尾巴扁，孔雀的尾巴最好看。', example: '孔雀开屏最漂亮。', figure: { type: 'scene', bg: 'garden', emojis: ['🐓', '🦆', '🦚'], title: '谁的尾巴最好看', text: '公鸡鸭子比尾巴，孔雀开屏最好看' }, check: { q: '谁的尾巴最好看？', options: ['孔雀', '鸭子', '公鸡'], answer: 0 } },
    ],
    rhyme: '猴子长，兔子短，松鼠尾巴像把伞；\n公鸡弯，鸭子扁，孔雀尾巴最好看。',
    points: ['不同动物尾巴不同。', '长—短、弯—扁 是反义词。', '照样子做问答游戏。'],
    quiz: { q: '谁的尾巴像把伞？', options: ['松鼠', '猴子', '兔子'], answer: 0 },
  },
  'chinese-g1-a-9-2': {
    example: '一只乌鸦口渴了，它用什么办法喝到水？',
    steps: [
      { title: '口渴找水喝', text: '一只乌鸦口渴了，到处找水喝。看见一个瓶子，瓶子里有水，可是喝不着。', example: '瓶口太小了，怎么办？', figure: { type: 'scene', bg: 'field', emojis: ['🐦', '🍶', '💧'], title: '乌鸦喝水', text: '乌鸦口渴找水喝，看见瓶里有水' }, check: { q: '乌鸦口渴了，要做什么？', options: ['找水喝', '找果子', '睡觉'], answer: 0 } },
      { title: '动脑筋想办法', text: '乌鸦看见旁边有许多小石子，把小石子一颗一颗放进瓶子里，水渐渐升高，就喝着水了。', example: '遇到困难，要动脑筋想办法。', figure: { type: 'scene', bg: 'field', emojis: ['🪨', '🍶', '🐦'], title: '放石子', text: '乌鸦把石子放进瓶里，水渐渐升高' }, check: { q: '乌鸦用了什么办法喝水？', options: ['放小石子', '把瓶子打破', '等下雨'], answer: 0 } },
    ],
    rhyme: '乌鸦口渴找水喝，瓶口太小喝不着；\n动动脑筋想办法，石子放进水升高。',
    points: ['遇到困难要动脑筋。', '乌鸦的办法：放进小石子。', '朗读课文，说清办法。'],
    quiz: { q: '瓶子里的水为什么会升高？', options: ['放了石头', '下大雨', '水自己涨'], answer: 0 },
  },
  'chinese-g1-a-9-3': {
    example: '数不清的雨点儿从云彩里落下来，它们要去哪里？',
    steps: [
      { title: '雨点儿落下来', text: '数不清的雨点儿，从云彩里落下来。半空中，大雨点儿问小雨点儿：你要到哪里去？', example: '小雨点儿要去有花有草的地方。', figure: { type: 'scene', bg: 'sky', emojis: ['🌧️', '☁️'], title: '雨点儿', text: '数不清的雨点儿，从云彩里落下来' }, check: { q: '雨点儿从哪里落下来？', options: ['云彩', '树上', '房子里'], answer: 0 } },
      { title: '花更红，草更绿', text: '有花有草的地方，花更红了，草更绿了；没有花没有草的地方，也开出了红的花，长出了绿的草。', example: '雨点儿让大地更美。', figure: { type: 'scene', bg: 'garden', emojis: ['🌷', '🌱', '💧'], title: '花红草绿', text: '雨点儿过后，花更红了，草更绿了' }, check: { q: '下过雨后，有花有草的地方怎样了？', options: ['花更红草更绿', '都枯了', '没变化'], answer: 0 } },
    ],
    rhyme: '数不清的雨点儿，从云彩落下来；\n花更红来草更绿，雨点儿真可爱。',
    points: ['雨点儿从云彩里落下来。', '雨让花草更茂盛。', '分角色朗读大雨点儿、小雨点儿的对话。'],
    quiz: { q: '有雨的地方，花会怎样？', options: ['更红了', '谢了', '消失'], answer: 0 },
  },
  'chinese-g1-a-6-3': {
    example: '下雪啦，雪地里来了一群小画家，猜猜它们画了什么。',
    steps: [
      { title: '下雪啦，来了一群小画家', text: '下雪啦，下雪啦！雪地里来了一群小画家。', example: '小鸡、小狗、小鸭、小马都来了。', figure: { type: 'scene', bg: 'snow', emojis: ['🌨️', '🐥', '🐶', '🦆', '🐴'], title: '雪地里的小画家', text: '小鸡小狗小鸭小马，雪地上画出脚印' }, check: { q: '雪地里来了一群什么？', options: ['小画家', '小学生', '小朋友'], answer: 0 } },
      { title: '它们画了什么', text: '小鸡画竹叶，小狗画梅花，小鸭画枫叶，小马画月牙。不用颜料不用笔，几步就成一幅画。', example: '小鸡的脚印像竹叶。', check: { q: '小鸡画的是什么？', options: ['竹叶', '梅花', '枫叶'], answer: 0 } },
      { title: '青蛙为什么没参加', text: '青蛙为什么没参加？他在洞里睡着啦。', example: '冬天青蛙要冬眠。', check: { q: '青蛙为什么没参加？', options: ['在洞里睡觉', '生病了', '去玩了'], answer: 0 } },
    ],
    rhyme: '小鸡画竹叶，小狗画梅花；\n小鸭画枫叶，小马画月牙。',
    points: ['不同动物脚印不同。', '青蛙冬天在洞里睡觉（冬眠）。', '朗读课文，背诵课文。'],
    quiz: { q: '小马画的是什么？', options: ['月牙', '竹叶', '梅花'], answer: 0 },
  },
  'chinese-g1-a-6-4': {
    example: '一年有四季，四季各不同。读一读《四季》。',
    steps: [
      { title: '草芽尖尖是春天', text: '草芽尖尖，他对小鸟说："我是春天。"', example: '春天小草发芽了。', figure: { type: 'scene', bg: 'field', emojis: ['🌱', '🐦'], title: '春天', text: '草芽尖尖冒出来，小鸟唱着春天的歌' }, check: { q: '草芽尖尖，说的是哪个季节？', options: ['春天', '夏天', '冬天'], answer: 0 } },
      { title: '荷叶圆圆是夏天，谷穗弯弯是秋天', text: '荷叶圆圆，他对青蛙说："我是夏天。"谷穗弯弯，他鞠着躬说："我是秋天。"', example: '夏天荷叶大，秋天谷子熟。', figure: { type: 'scene', bg: 'field', emojis: ['🪷', '🐸', '🌾'], title: '夏和秋', text: '荷叶圆圆是夏天，谷穗弯弯是秋天' }, check: { q: '谷穗弯弯，说的是哪个季节？', options: ['秋天', '春天', '冬天'], answer: 0 } },
      { title: '雪人是冬天', text: '雪人大肚子一挺，他顽皮地说："我就是冬天。"', example: '冬天可以堆雪人。', figure: { type: 'scene', bg: 'snow', emojis: ['⛄', '❄️'], title: '冬天', text: '雪人挺着大肚子，说我就是冬天' }, check: { q: '雪人说"我就是什么天"？', options: ['冬天', '春天', '夏天'], answer: 0 } },
    ],
    rhyme: '草芽尖，荷叶圆，谷穗弯弯雪人冬；\n一年四季各不同，春夏秋冬都可爱。',
    points: ['一年四季：春夏秋冬。', '草芽—春天、荷叶—夏天、谷穗—秋天、雪人—冬天。', '你喜欢哪个季节？仿照课文说一说。'],
    quiz: { q: '荷叶圆圆，说的是哪个季节？', options: ['夏天', '春天', '秋天'], answer: 0 },
  },
  'chinese-g1-a-2-5': {
    example: '到"语文园地一"来玩玩：猜谜、比字、读诗、剪窗花。',
    steps: [
      { title: '识字加油站：猜谜语', text: '一片两片三四片，五片六片七八片。九片十片无数片，飞入芦花都不见。——打一物，谜底是雪花。', example: '片片雪花飞进芦花里，看不见了。', figure: { type: 'scene', bg: 'snow', emojis: ['❄️', '🌾'], title: '谜语诗', text: '片片雪花飞进芦花丛，一下不见了' }, check: { q: '这个谜语的谜底是什么？', options: ['雪花', '落叶', '蝴蝶'], answer: 0 } },
      { title: '字词句运用：比一比', text: '人—天、口—田、日—目。加一笔或少一笔就成了另一个字。', example: '人 加一横 就是 天。', figure: { type: 'scene', bg: 'indoor', emojis: ['✍️', '🔤'], title: '比一比', text: '人加一横是天，口加一笔变日变田' }, check: { q: '"口"里面加一横是什么字？', options: ['日', '田', '目'], answer: 0 } },
      { title: '日积月累：咏鹅', text: '咏鹅（唐·骆宾王）：鹅，鹅，鹅，曲项向天歌。白毛浮绿水，红掌拨清波。', example: '大白鹅在水里唱歌。', figure: { type: 'scene', bg: 'water', emojis: ['🦢', '🌊'], title: '咏鹅', text: '大白鹅浮在绿水上，红掌轻轻拨清波' }, check: { q: '《咏鹅》的作者是谁？', options: ['骆宾王', '李白', '杜甫'], answer: 0 } },
    ],
    rhyme: '一片两片三四片，飞入芦花都不见；\n鹅鹅鹅，曲项向天歌。',
    points: ['谜语诗《一片两片三四片》，谜底是雪。', '人—天、口—田、日—目 比一比。', '背诵《咏鹅》。'],
    quiz: { q: '谜底"雪"是打什么谜面？', options: ['一片两片三四片', '鹅鹅鹅', '剪窗花'], answer: 0 },
  },
  'chinese-g1-a-2-6': {
    example: '读书真快乐！和爸爸妈妈一起读有趣的故事书吧。',
    steps: [
      { title: '我经常和爸爸妈妈一起读', text: '我经常和爸爸妈妈一起读有趣的故事书。周末，我在书店看到了很多好看的图画书。', example: '和爸爸妈妈一起读，最开心。', figure: { type: 'scene', bg: 'indoor', emojis: ['📖', '👨‍👩‍👧'], title: '亲子共读', text: '和爸爸妈妈一起，读有趣的故事书' }, check: { q: '我喜欢和谁一起读故事书？', options: ['爸爸妈妈', '一个人', '不理别人'], answer: 0 } },
      { title: '学拼音，读更多书', text: '我读了很多书，会讲很多故事，同学们叫我"故事大王"。学了拼音，我就认更多的字，读更多的书了！', example: '多读书，能认更多字。', figure: { type: 'scene', bg: 'indoor', emojis: ['📚', '🔤'], title: '读更多书', text: '学了拼音认了字，就能读更多的书' }, check: { q: '学了拼音有什么好处？', options: ['认更多字读更多书', '不用读书', '变懒'], answer: 0 } },
    ],
    rhyme: '读书真快乐，天天读一读；\n认识更多字，故事讲得多。',
    points: ['多读书、读好书。', '学着把故事讲给大家听。', '学好拼音，认更多的字。'],
    quiz: { q: '怎样能讲很多故事？', options: ['多读书', '多睡觉', '多看电视'], answer: 0 },
  },
  'chinese-g1-a-3-5': {
    example: '到"语文园地二"练一练：写拼音本、读准声调、背《画》。',
    steps: [
      { title: '识字加油站：拼音本', text: '拼音本上要写清楚学校、班级、姓名。课程表里也会认识"王"这个字。', example: '我的拼音本，写上学校和名字。', figure: { type: 'scene', bg: 'city', emojis: ['📘', '🏫'], title: '拼音本', text: '在拼音本上，写好学校班级和姓名' }, check: { q: '拼音本上要写上什么？', options: ['学校班级姓名', '随便写', '什么都不写'], answer: 0 } },
      { title: '用拼音：读准声调', text: 'dā—dà、mā—má、bǐ—bí、pǔ—pù。读准声调，字音才清楚。', example: '一声平、二声扬、三声拐弯、四声降。', figure: { type: 'scene', bg: 'indoor', emojis: ['🔤', '🎵'], title: '读准声调', text: '一声平二声扬，三声拐弯四声降' }, check: { q: 'dā 是第几声？', options: ['一声', '二声', '四声'], answer: 0 } },
      { title: '字词句运用 + 日积月累', text: '读一读连一连（他、八、马……）；背一背《画》：远看山有色，近听水无声。春去花还在，人来鸟不惊。', example: '《画》是一首谜语诗。', figure: { type: 'scene', bg: 'mountain', emojis: ['🖼️', '🏔️', '🕊️', '🌸'], title: '画', text: '远看山有色，画里的花常开鸟不惊' }, check: { q: '"远看山有色"下一句是什么？', options: ['近听水无声', '人来鸟不惊', '春去花还在'], answer: 0 } },
    ],
    rhyme: '拼音本，写清楚，学校班级和姓名；\n读准声调读准音，古诗《画》记心中。',
    points: ['拼音本上写学校、班级、姓名。', '读准声调：dā—dà、mā—má。', '背诵《画》。'],
    quiz: { q: '《画》里"近听水"怎样？', options: ['无声', '有声', '很大声'], answer: 0 },
  },
  'chinese-g1-a-4-6': {
    example: '到"语文园地三"看看课程表、找一找词语、比一比拼音。',
    steps: [
      { title: '识字加油站：课程表', text: '看看你的课程表，星期几有什么课？学会认"星期、语文、数学、写字、会"这些字。', example: '星期一上午第一节是语文。', figure: { type: 'scene', bg: 'indoor', emojis: ['🗓️', '📖'], title: '课程表', text: '课程表上写着星期几、上什么课' }, check: { q: '课程表上要认哪些字？', options: ['星期语文数学', 'abc', '123'], answer: 0 } },
      { title: '字词句运用：找一找', text: '在图里找一找：鸡、鱼、河、一座山、一棵树、四只鸽子、七朵花。', example: '数一数，几只鸽子？四只。', figure: { type: 'scene', bg: 'field', emojis: ['🐔', '🐟', '🏔️', '🌳', '🌸'], title: '找一找', text: '图里有山有树，有鸡有鱼还有鲜花' }, check: { q: '"一座"后面接什么？', options: ['山', '树', '鸽子'], answer: 0 } },
      { title: '拼音 + 日积月累', text: '读一读比一比：z—zh、c—ch、s—sh，分清平翘舌音。', example: '祖母、擦玻璃、四十，多读几遍。', check: { q: 'z 和 zh 哪个是翘舌音？', options: ['zh', 'z', '都是'], answer: 0 } },
    ],
    rhyme: '课程表，看仔细，星期几上什么课；\n分清平舌和翘舌，z c s 与 zh ch sh。',
    points: ['会看课程表。', '看图找词语：一座山、一棵树。', '分清平舌音与翘舌音。'],
    quiz: { q: '星期三上午第二节是什么课（如课程表所示）？', options: ['数学', '语文', '写字'], answer: 0 },
  },
  'chinese-g1-a-5-6': {
    example: '到"语文园地四"认识时间词，读准整体认读音节。',
    steps: [
      { title: '识字加油站：时间词', text: '上午、下午、晚上；昨天、今天、明天；上个月、这个月、下个月；去年、今年、明年。', example: '今天明天，去年今年。', figure: { type: 'scene', bg: 'indoor', emojis: ['🕐', '📅'], title: '时间词', text: '时钟和日历，教我们认识时间词' }, check: { q: '"今天"的昨天是？', options: ['昨天', '明天', '去年'], answer: 0 } },
      { title: '用拼音：读准音节', text: 'yán—yuán、yún—yúng、jiàn—juàn、zuān—zhuān、chūn—chuān—chuāng，读准整体认读音节和前后鼻音。', example: 'yuan、yin、yun 整体认读。', figure: { type: 'scene', bg: 'indoor', emojis: ['🔤', '🎵'], title: '读准音节', text: '分清前后鼻音和整体认读音节' }, check: { q: 'chuān 是前鼻音还是后鼻音？', options: ['前鼻音', '后鼻音', '都不是'], answer: 0 } },
      { title: '说一说：秋游带什么', text: '秋游的时候，你想带些什么？帽子、水壶、苹果、饼干、雨伞、望远镜……', example: '说出你想带的东西。', check: { q: '秋游可以带什么？', options: ['水壶', '课桌', '讲台'], answer: 0 } },
    ],
    rhyme: '上午下午晚上，昨天今天明天；\n去年今年明年，时间词要记全。',
    points: ['认识时间词。', '读准整体认读音节和前后鼻音。', '说话练习：秋游带什么。'],
    quiz: { q: '"今年"的明年是？', options: ['明年', '去年', '昨天'], answer: 0 },
  },
  'chinese-g1-a-6-5': {
    example: '到"语文园地五"学反义词、说四季、背名言。',
    steps: [
      { title: '识字加油站：反义词', text: '南—北、男—女、开—关、正—反、先—后、内—外。', example: '打开水龙头，关掉水龙头。', figure: { type: 'scene', bg: 'indoor', emojis: ['↔️', '🚪'], title: '反义词', text: '开门和关门，意思相反的叫反义词' }, check: { q: '"南"的反义词是什么？', options: ['北', '东', '西'], answer: 0 } },
      { title: '字词句运用：说四季', text: '春天（大地、飞鸟），夏天（树叶、小鱼），秋天（青草、青蛙），冬天（莲花、雪人）。', example: '春天的大地，冬天的雪人。', check: { q: '春天的景物有哪些？', options: ['大地、飞鸟', '雪人', '莲花'], answer: 0 } },
      { title: '日积月累：惜时名言', text: '一年之计在于春，一日之计在于晨。一寸光阴一寸金，寸金难买寸光阴。', example: '珍惜时间，从今天做起。', figure: { type: 'scene', bg: 'sky', emojis: ['⏳', '🌅'], title: '珍惜时间', text: '一年之计在于春，一日之计在于晨' }, check: { q: '一年之计在于？', options: ['春', '夏', '秋'], answer: 0 } },
    ],
    rhyme: '南对北，男对女，开关正反先与后；\n一年之计在于春，一寸光阴一寸金。',
    points: ['认识反义词：南—北、开—关……', '说一说是哪个季节的景物。', '背一背惜时名言。'],
    quiz: { q: '"开"的反义词是什么？', options: ['关', '正', '先'], answer: 0 },
  },
  'chinese-g1-a-7-5': {
    example: '到"语文园地六"认识职业、读准字音、背古诗。',
    steps: [
      { title: '识字加油站：职业', text: '学校有老师，工厂有工人，医院有医生，传达室有门卫。', example: '老师教书，医生看病。', figure: { type: 'scene', bg: 'city', emojis: ['👩‍🏫', '🏭', '🧑‍⚕️'], title: '职业', text: '老师教书、工人做工、医生看病' }, check: { q: '医生在哪里工作？', options: ['医院', '学校', '工厂'], answer: 0 } },
      { title: '字词句运用：读准字音', text: '你们—家里、男生—蓝色、上山—三年、写字—报纸，读准容易混的字音。', example: '注意区分 n 和 l、sh 和 s。', check: { q: '"蓝"和"男"，哪个是 l？', options: ['蓝', '男', '都不是'], answer: 0 } },
      { title: '日积月累：古朗月行', text: '古朗月行（节选·唐·李白）：小时不识月，呼作白玉盘。又疑瑶台镜，飞在青云端。', example: '小时候把月亮当成白玉盘。', figure: { type: 'scene', bg: 'night', emojis: ['🌕', '🪞', '☁️'], title: '古朗月行', text: '圆月亮像白玉盘，又像镜子挂云端' }, check: { q: '《古朗月行》把月亮比作什么？', options: ['白玉盘', '小船', '灯笼'], answer: 0 } },
    ],
    rhyme: '老师医生和门卫，各有各的工作；\n小时不识月，呼作白玉盘。',
    points: ['认识不同职业。', '读准容易混的字音。', '背诵《古朗月行》。'],
    quiz: { q: '教书的老师在哪里工作？', options: ['学校', '医院', '工厂'], answer: 0 },
  },
  'chinese-g1-a-8-4': {
    example: '到"语文园地七"认识家人、背方位歌、学谚语。',
    steps: [
      { title: '识字加油站：家人称呼', text: '爷爷、奶奶、姥爷、姥姥、爸爸、妈妈、叔叔、姑姑、舅舅、姨妈、哥哥、姐姐、弟弟、妹妹。', example: '爸爸的爸爸是爷爷。', figure: { type: 'scene', bg: 'indoor', emojis: ['👵', '👴', '👨‍👩‍👧‍👦'], title: '一家人', text: '爷爷奶奶爸爸妈妈和孩子，一家人' }, check: { q: '爸爸的爸爸叫什么？', options: ['爷爷', '姥爷', '叔叔'], answer: 0 } },
      { title: '日积月累：方位歌', text: '早晨起来，面向太阳。前面是东，后面是西。左面是北，右面是南。', example: '面向太阳，前面就是东。', check: { q: '早晨面向太阳，前面是什么方向？', options: ['东', '西', '南'], answer: 0 } },
      { title: '读谚语', text: '种瓜得瓜，种豆得豆。前人栽树，后人乘凉。千里之行，始于足下。百尺竿头，更进一步。', example: '一步一个脚印。', figure: { type: 'scene', bg: 'field', emojis: ['🌱', '🌳', '👣'], title: '谚语', text: '种瓜得瓜，前人栽树，千里之行始于足下' }, check: { q: '"千里之行"始于什么？', options: ['足下', '远方', '天上'], answer: 0 } },
    ],
    rhyme: '爷爷奶奶姥爷姥姥，爸爸妈妈叔叔姑姑；\n早晨面向太阳，前面是东后面是西。',
    points: ['认识家人称呼。', '会背方位歌。', '背一背四条谚语。'],
    quiz: { q: '"种瓜得瓜"下一句是什么？', options: ['种豆得豆', '种花得花', '什么也不得'], answer: 0 },
  },
  'chinese-g1-a-9-4': {
    example: '到"语文园地八"认识汉字结构、读词语、背古诗《风》。',
    steps: [
      { title: '识字加油站：分一分', text: '有些字可以分成上下两部分，如"花、元、音"；"牛、羊、爪"是独体字。', example: '花字上面是草字头。', figure: { type: 'scene', bg: 'field', emojis: ['🌷', '🐮', '🐑'], title: '分一分', text: '看图分一分：花分上下，牛羊是独体字' }, check: { q: '"花"可以分成上下两部分吗？', options: ['可以', '不可以', '不知道'], answer: 0 } },
      { title: '字词句运用：读一读', text: '果皮—树皮、加法—办法、回来—回答、许多—不许、到处—四处、方向—地方。', example: '同一个字在不同词里意思不同。', check: { q: '"办法"和"加法"里的"法"意思一样吗？', options: ['不一样', '一样', '不确定'], answer: 0 } },
      { title: '日积月累：风', text: '风（唐·李峤）：解落三秋叶，能开二月花。过江千尺浪，入竹万竿斜。', example: '风能吹落树叶，吹开春花。', figure: { type: 'scene', bg: 'field', emojis: ['🍃', '🌬️', '🎋'], title: '风', text: '风吹落叶、吹开花，还把竹子吹斜' }, check: { q: '《风》"能开二月花"，风吹开了什么？', options: ['花', '雪', '云'], answer: 0 } },
    ],
    rhyme: '牛字羊字独体字，花草元音分上下；\n解落三秋叶，能开二月花。',
    points: ['认识上下结构字与独体字。', '词中多义字：皮、法、回、处。', '背诵古诗《风》。'],
    quiz: { q: '"音"字可以分成上下两部分吗？', options: ['可以', '不可以', '不知道'], answer: 0 },
  },
};
