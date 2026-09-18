export type PinyinLetter = {
  glyph: string;
  cue: string;
  shape: string;
  slot: 'upper' | 'middle' | 'lower' | 'full';
};

export type PinyinCheck = {
  prompt: string;
  choices: string[];
  answer: string;
  feedback: string;
};

export type PinyinStudyPack = {
  page: string;
  letters: PinyinLetter[];
  tones: string[];
  blends: { parts: string[]; result: string; distractors: string[] }[];
  words: { pinyin: string; word: string }[];
  recognize?: string[];
  readingTitle?: string;
  readingLines: string[];
  rule?: { title: string; detail: string; examples: string[] };
  check: PinyinCheck;
};

const L = (glyph: string, cue: string, shape: string, slot: PinyinLetter['slot'] = 'middle'): PinyinLetter => ({ glyph, cue, shape, slot });
const B = (parts: string[], result: string, distractors: string[]) => ({ parts, result, distractors });
const W = (pinyin: string, word: string) => ({ pinyin, word });
const C = (prompt: string, choices: string[], answer: string, feedback: string): PinyinCheck => ({ prompt, choices, answer, feedback });

export const CHINESE_PINYIN_STUDY: Record<string, PinyinStudyPack> = {
  'pinyin-a-o-e': {
    page: 'P20-P21', letters: [L('a', '张大嘴巴，发 a。', '圆肚子加小尾巴'), L('o', '嘴巴圆圆，发 o。', '一个圆圈'), L('e', '嘴巴扁扁，发 e。', '横开的小圆圈')],
    tones: ['ā á ǎ à', 'ō ó ǒ ò', 'ē é ě è'], blends: [],
    words: [W('ā', '发 a 的口形'), W('ō', '发 o 的口形'), W('ē', '发 e 的口形')],
    readingLines: ['张大嘴巴 a a a。', '圆圆嘴巴 o o o。', '扁扁嘴巴 e e e。'],
    rule: { title: '四声初体验', detail: '同一个单韵母加上不同声调，声音的高低和走向会改变。', examples: ['一声平 ā', '二声扬 á', '三声拐弯 ǎ', '四声降 à'] },
    check: C('a 的口形是什么样？', ['张大嘴巴', '嘴巴圆圆', '嘴巴扁扁'], '张大嘴巴', '看发音口形，不只靠字形猜声音。'),
  },
  'pinyin-i-u-v': {
    page: 'P22-P23', letters: [L('i', '牙齿对齐，发 i。', '一竖上面一点', 'upper'), L('u', '嘴巴突出，发 u。', '下弯后向上'), L('ü', '嘴巴像吹口哨，发 ü。', 'u 上面两点', 'upper')],
    tones: ['ī í ǐ ì', 'ū ú ǔ ù', 'ǖ ǘ ǚ ǜ'], blends: [],
    words: [W('ī', '衣服'), W('ū', '乌龟'), W('ǖ', '小鱼')],
    readingLines: ['牙齿对齐 i i i。', '嘴巴突出 u u u。', '吹起口哨 ü ü ü。'],
    rule: { title: 'i 的声调写法', detail: 'i 加声调时，原来上面的小点去掉，声调写在上方。', examples: ['i → ī', 'i → í', 'i → ǐ', 'i → ì'] },
    check: C('ü 和 u 的字形差在哪里？', ['ü 上面有两点', 'ü 上面有一横', '字形完全一样'], 'ü 上面有两点', '两点是辨认 ü 的重要特征。'),
  },
  'pinyin-b-p-m-f': {
    page: 'P24-P25', letters: [L('b', '发音轻短，双唇先合拢。', '竖在左，半圆在右', 'upper'), L('p', '双唇打开时有一股气流。', '竖向下，半圆在右', 'lower'), L('m', '双唇合拢，鼻腔发声。', '两扇门'), L('f', '上齿轻触下唇。', '上弯下竖', 'upper')],
    tones: ['bā bá bǎ bà'], blends: [B(['b', 'ā'], 'bā', ['pā', 'mā']), B(['m', 'ā'], 'mā', ['bā', 'fā'])],
    words: [W('bà ba', '爸爸'), W('mā ma', '妈妈')], recognize: ['爸', '妈'],
    readingLines: ['b + a → ba。', 'bā，bá，bǎ，bà。', '爸爸，妈妈。'],
    rule: { title: '两音相连', detail: '声母读得轻短，韵母读得响亮，两个声音连起来，不要停成两个字。', examples: ['b + a → ba', 'm + a → ma'] },
    check: C('b + ā 连读是哪个音节？', ['bā', 'pā', 'mā'], 'bā', '先轻轻发 b，再和 ā 连成一个音节。'),
  },
  'pinyin-d-t-n-l': {
    page: 'P26-P27', letters: [L('d', '舌尖抵上齿龈，轻短发声。', '半圆在左，竖在右', 'upper'), L('t', '舌尖弹开，气流明显。', '一竖加横', 'upper'), L('n', '舌尖抵上齿龈，鼻腔发声。', '一扇门'), L('l', '舌尖轻弹，气流从两边走。', '一长竖', 'upper')],
    tones: ['dā dá dǎ dà', 'tā tá tǎ tà'], blends: [B(['d', 'à'], 'dà', ['tà', 'nà']), B(['l', 'ù'], 'lù', ['nù', 'dù'])],
    words: [W('dà dì', '大地'), W('mǎ lù', '马路'), W('ní tǔ', '泥土')], recognize: ['大', '马', '路', '土'],
    readingTitle: '小白兔', readingLines: ['小白兔，穿皮袄，', '耳朵长，尾巴小。', '三瓣嘴，胡子翘，', '一动一动总在笑。'],
    check: C('“马路”的“路”读哪个音节？', ['lù', 'nù', 'dù'], 'lù', '听清声母 l，再和 ù 连起来。'),
  },
  'pinyin-g-k-h': {
    page: 'P32-P33', letters: [L('g', '舌根抬起，发音轻短。', '圆圈加向下小弯', 'lower'), L('k', '舌根抬起后送气。', '一竖加两斜线', 'upper'), L('h', '气流从喉间出来。', '一长竖加弯', 'upper')],
    tones: ['gā gá gǎ gà', 'guā guá guǎ guà'], blends: [B(['g', 'u', 'ā'], 'guā', ['gā', 'huā']), B(['h', 'u', 'ā'], 'huā', ['huá', 'guā'])],
    words: [W('gē ge', '哥哥'), W('dì di', '弟弟'), W('huà huà', '画画'), W('hé huā', '荷花')], recognize: ['哥', '弟', '画', '花'],
    readingTitle: '说话', readingLines: ['小溪流说话，哗哗，哗哗。', '小雨点说话，沙沙，沙沙。', '小鸽子说话，咕咕，咕咕。', '小鸭子说话，嘎嘎，嘎嘎。', '小花猫说话，喵喵，喵喵。', '小青蛙说话，呱呱，呱呱。'],
    rule: { title: '三拼音节', detail: '声母、介母、韵母连在一起读，介母轻快带过。', examples: ['g + u + ā → guā', 'h + u + ā → huā'] },
    check: C('g + u + ā 连读成什么？', ['guā', 'gā', 'huā'], 'guā', '三个声音连成一个完整音节。'),
  },
  'pinyin-j-q-x': {
    page: 'P34-P35', letters: [L('j', '舌面靠近上腭，气流较弱。', '竖向下加点', 'lower'), L('q', '舌面靠近上腭，送气明显。', '半圆在左，竖向下', 'lower'), L('x', '舌面靠近上腭，气流从缝中出。', '两斜交叉')],
    tones: ['jī jí jǐ jì', 'qī qí qǐ qì'], blends: [B(['j', 'ü'], 'ju', ['jü', 'ji']), B(['q', 'ü'], 'qu', ['qü', 'qi'])],
    words: [W('dǎ gǔ', '打鼓'), W('xià qí', '下棋'), W('dā jī mù', '搭积木')], recognize: ['打', '棋', '积', '木'],
    readingTitle: '在一起', readingLines: ['小黄鸡，小黑鸡，', '欢欢喜喜在一起。', '刨刨土，捉捉虫，', '青草地上做游戏。'],
    rule: { title: '小 ü 碰到 j q x', detail: 'ü 和 j、q、x 拼写时，ü 上面的两点要省去；读音仍是 ü，不是 u。', examples: ['j + ü → ju', 'q + ü → qu', 'x + ü → xu'] },
    check: C('j 和 ü 拼写成哪个音节？', ['ju', 'jü', 'ji'], 'ju', '两点省去，但读的还是 ü。'),
  },
  'pinyin-z-c-s': {
    page: 'P36-P37', letters: [L('z', '舌尖靠近上齿背，发音轻短。', '折线形'), L('c', '舌尖靠近上齿背，有明显气流。', '左开口半圆'), L('s', '气流从齿间出来。', '弯曲线')],
    tones: ['zā zá zǎ zà', 'cā cá cǎ cà'], blends: [B(['z', 'ī'], 'zi', ['zī', 'ci']), B(['c', 'ī'], 'ci', ['cī', 'si'])],
    words: [W('zì', '字'), W('cí', '词'), W('jù zi', '句子')], recognize: ['字', '词', '句', '子'],
    readingTitle: '过桥', readingLines: ['数学题，一道道，', '等号就像一座桥。', '做对了，走过桥，', '做错了，过不了。', '想一想，算一算，', '快快乐乐过了桥。'],
    rule: { title: '整体认读音节', detail: 'zi、ci、si 直接读整体，不把后面的 i 当普通 i 单独拼。', examples: ['z → zi', 'c → ci', 's → si'] },
    check: C('zi 应该怎样读？', ['作为整体音节直接读', '把 z 和普通 i 分开拼', '只读 i'], '作为整体音节直接读', 'zi 是整体认读音节。'),
  },
  'pinyin-zh-ch-sh-r': {
    page: 'P38-P39', letters: [L('zh', '舌尖翘起，发音轻短。', 'z 和 h 连在一起', 'upper'), L('ch', '舌尖翘起，送气明显。', 'c 和 h 连在一起', 'upper'), L('sh', '舌尖翘起，气流摩擦。', 's 和 h 连在一起', 'upper'), L('r', '舌尖翘起，声带振动。', '小竖加弯')],
    tones: ['zhī zhí zhǐ zhì', 'chī chí chǐ chì'], blends: [B(['zh', 'ī'], 'zhi', ['zhī', 'chi']), B(['sh', 'ī'], 'shi', ['shī', 'ri'])],
    words: [W('cā zhuō zi', '擦桌子'), W('zhé zhǐ', '折纸'), W('dú shū', '读书')], recognize: ['桌', '纸', '读', '书'],
    readingTitle: '绕口令', readingLines: ['四是四，', '十是十。', '十四是十四，', '四十是四十。', '四十不是十四，', '十四不是四十。'],
    rule: { title: '平舌和翘舌', detail: 'z、c、s 舌尖靠前；zh、ch、sh、r 舌尖翘起。zhi、chi、shi、ri 是整体认读音节。', examples: ['z ↔ zh', 'c ↔ ch', 's ↔ sh', 'zhi chi shi ri'] },
    check: C('课文中哪一个是翘舌声母？', ['zh', 'z', 's'], 'zh', 'zh 发音时舌尖需要翘起来。'),
  },
  'pinyin-y-w': {
    page: 'P40-P41', letters: [L('y', '读得轻短，帮助音节开头。', '像枝丫', 'upper'), L('w', '读得轻短，帮助音节开头。', '两个山谷')],
    tones: ['yī yí yǐ yì', 'wū wú wǔ wù', 'yū yú yǔ yù'], blends: [B(['y', 'i'], 'yi', ['yu', 'wu']), B(['w', 'u'], 'wu', ['yi', 'yu'])],
    words: [W('yú', '鱼'), W('yā zi', '鸭子'), W('wū yā', '乌鸦'), W('mǎ yǐ', '蚂蚁')], recognize: ['鱼', '鸭', '乌', '鸦'],
    readingTitle: '哪座房子最漂亮', readingLines: ['一座房，两座房，', '青青的瓦，白白的墙。', '三座房，四座房，', '房前花果香，屋后树成行。', '哪座房子最漂亮？', '要数我们的小学堂。'],
    rule: { title: '整体认读', detail: 'yi、wu、yu 直接作为整体音节来读；yu 写作时不带 ü 的两点。', examples: ['i → yi', 'u → wu', 'ü → yu'] },
    check: C('ü 单独成音节时常写成什么？', ['yu', 'yü', 'wu'], 'yu', '整体认读音节 yu 不写两点。'),
  },
  'pinyin-ai-ei-ui': {
    page: 'P45-P46', letters: [L('ai', '先发 a，再滑向 i。', 'a 和 i 并排'), L('ei', '先发 e，再滑向 i。', 'e 和 i 并排'), L('ui', '嘴形从 u 向 i 滑动。', 'u 和 i 并排')],
    tones: ['āi ái ǎi ài', 'ēi éi ěi èi', 'uī uí uǐ uì'], blends: [B(['g', 'u', 'āi'], 'guāi', ['gāi', 'guài']), B(['t', 'u', 'ǐ'], 'tuǐ', ['tǔ', 'tuī'])],
    words: [W('luó bo', '萝卜'), W('bái cài', '白菜'), W('shū cài', '蔬菜'), W('yā lí', '鸭梨'), W('xī guā', '西瓜'), W('shuǐ guǒ', '水果')], recognize: ['白', '菜', '西', '瓜', '果'],
    readingTitle: '洗手歌', readingLines: ['排着队，向前走，', '做什么？去洗手。', '肥皂用来搓搓手，', '清水帮我冲冲手，', '毛巾给我擦擦手。', '小手洗得真干净，', '大家一起笑开口。'],
    rule: { title: '复韵母口形滑动', detail: '两个韵母不是两个声音停顿着念，而是嘴形从前一个自然滑向后一个。', examples: ['a → i：ai', 'e → i：ei', 'u → i：ui'] },
    check: C('ui 是怎样发出来的？', ['从 u 自然滑向 i', 'u 和 i 停成两个字', '只读 u'], '从 u 自然滑向 i', '复韵母要连贯发音。'),
  },
  'pinyin-ao-ou-iu': {
    page: 'P47-P48', letters: [L('ao', '先发 a，再滑向 o。', 'a 和 o 并排'), L('ou', '先发 o，再滑向 u。', 'o 和 u 并排'), L('iu', '先发 i，再滑向 u。', 'i 和 u 并排')],
    tones: ['āo áo ǎo ào', 'ōu óu ǒu òu', 'iū iú iǔ iù'], blends: [B(['n', 'i', 'ǎo'], 'niǎo', ['nǎo', 'liǎo']), B(['q', 'iú'], 'qiú', ['qí', 'qū'])],
    words: [W('xiǎo qiáo', '小桥'), W('liú shuǐ', '流水'), W('chuí liǔ', '垂柳'), W('táo huā', '桃花')], recognize: ['小', '桥', '流', '柳'],
    readingTitle: '欢迎台湾小朋友', readingLines: ['一只船，扬起帆，', '漂啊漂啊到台湾。', '接来台湾小朋友，', '到我学校来参观。', '伸出双手紧紧握，', '热情的话儿说不完。'],
    rule: { title: 'iu 的声调位置', detail: 'iu 加声调时写在后面的 u 上；ao、ou 按一般声调位置规则标注。', examples: ['liū liú liǔ liù', 'qiū qiú qiǔ qiù'] },
    check: C('“小桥”的“桥”读什么？', ['qiáo', 'qiào', 'qióu'], 'qiáo', '声母 q 与介母 i、复韵母 ao 连起来读。'),
  },
  'pinyin-ie-ve-er': {
    page: 'P49-P50', letters: [L('ie', '先发 i，再滑向 e。', 'i 和 e 并排', 'upper'), L('üe', '先发 ü，再滑向 e。', 'ü 和 e 并排', 'upper'), L('er', '卷舌发 er。', 'e 后面带 r')],
    tones: ['iē ié iě iè', 'üē üé üě üè', 'ēr ér ěr èr'], blends: [B(['y', 'e'], 'ye', ['ie', 'yie']), B(['y', 'ü', 'e'], 'yue', ['yüe', 'ye'])],
    words: [W('méi huā kāi', '梅花开'), W('xuě huā piāo', '雪花飘'), W('yè sè měi', '夜色美')], recognize: ['开', '雪', '夜', '色', '美'],
    readingTitle: '月儿弯弯', readingLines: ['月儿弯弯挂蓝天，', '小溪弯弯出青山。', '大河弯弯流入海，', '山路弯弯到校园。'],
    rule: { title: 'ye、yue 和 er', detail: 'ie、üe 单独成音节时写作 ye、yue；er 不和声母相拼，直接读。', examples: ['ie → ye', 'üe → yue', 'er → ér'] },
    check: C('üe 单独成音节怎样写？', ['yue', 'yüe', 'ye'], 'yue', '整体认读音节 yue 的 ü 省去两点。'),
  },
  'pinyin-an-en-in-un-vn': {
    page: 'P51-P53', letters: [L('an', 'a 后接鼻音 n。', 'a 后面有 n'), L('en', 'e 后接鼻音 n。', 'e 后面有 n'), L('in', 'i 后接鼻音 n。', 'i 后面有 n', 'upper'), L('un', 'u 后接鼻音 n。', 'u 后面有 n'), L('ün', 'ü 后接鼻音 n。', 'ü 后面有 n', 'upper')],
    tones: ['ān án ǎn àn', 'ēn én ěn èn', 'īn ín ǐn ìn'], blends: [B(['g', 'u', 'ān'], 'guān', ['gān', 'guǎn']), B(['q', 'ü', 'ān'], 'quān', ['qüān', 'qiān'])],
    words: [W('lán tiān', '蓝天'), W('bái yún', '白云'), W('cǎo yuán', '草原'), W('sēn lín', '森林')], recognize: ['蓝', '云', '草', '原'],
    readingTitle: '家', readingLines: ['蓝天是白云的家，', '树林是小鸟的家，', '小河是鱼儿的家，', '泥土是种子的家。', '我们是祖国的花朵，', '祖国就是我们的家。'],
    rule: { title: '前鼻音和整体认读', detail: 'an、en、in、un、ün 的末尾都带鼻音 n；yuan、yin、yun 是整体认读音节。', examples: ['an → an', 'in → yin', 'ün → yun', 'ü + an → yuan'] },
    check: C('哪个是本课的整体认读音节？', ['yuan', 'guan', 'kan'], 'yuan', 'yuan 直接整体认读。'),
  },
  'pinyin-ang-eng-ing-ong': {
    page: 'P54-P55', letters: [L('ang', 'a 后接后鼻音 ng。', 'a 后面有 ng'), L('eng', 'e 后接后鼻音 ng。', 'e 后面有 ng'), L('ing', 'i 后接后鼻音 ng。', 'i 后面有 ng', 'upper'), L('ong', 'o 后接后鼻音 ng。', 'o 后面有 ng')],
    tones: ['āng áng ǎng àng', 'ēng éng ěng èng'], blends: [B(['q', 'i', 'áng'], 'qiáng', ['qián', 'qáng']), B(['y', 'ing'], 'ying', ['yingg', 'yin'])],
    words: [W('yóu yǒng', '游泳'), W('huá bīng', '滑冰'), W('qí zì xíng chē', '骑自行车'), W('dǎ pīng pāng qiú', '打乒乓球')], recognize: ['冰', '自', '行', '车'],
    readingTitle: '两只羊', readingLines: ['桥东走来一只羊，', '桥西走来一只羊，', '一起走到小桥上。', '你也不肯让，', '我也不肯让，', '扑通掉进河中央。'],
    rule: { title: '后鼻音与整体认读', detail: 'ang、eng、ing、ong 的结尾是 ng；ying 是整体认读音节。注意与前鼻音 n 的收尾不同。', examples: ['an ↔ ang', 'en ↔ eng', 'in ↔ ing', 'ying'] },
    check: C('“羊”的韵母属于哪一组？', ['ang', 'an', 'ai'], 'ang', 'yáng 末尾是后鼻音 ng。'),
  },
};
