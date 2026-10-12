/** Reviewed against the local textbook pages P2–P104. These are learning materials, not completion checks. */
export type ChineseTextbookExtra = {
  id: string; title: string; page: number; intro: string;
  groups: { title?: string; lines: string[] }[];
  pinyin?: boolean; reading?: boolean;
  illustration?: [number, number, number, number];
};
const group = (title: string, ...lines: string[]) => ({ title, lines });
const item = (id: string, title: string, page: number, intro: string, groups: ChineseTextbookExtra['groups'], extra: Partial<ChineseTextbookExtra> = {}): ChineseTextbookExtra => ({ id, title, page, intro, groups, ...extra });
const chart = (page: number, groups: ChineseTextbookExtra['groups'], intro = '按教材中的分组练习拼读。先看字母怎样相连，再读完整音节。', id = 'syllables') => item(id, id === 'syllables-second' ? '拼读花瓣' : '教材拼读', page, intro, groups, { pinyin: true });
export const CHINESE_TEXTBOOK_EXTRAS: Record<string, ChineseTextbookExtra[]> = {
  'pinyin-a-o-e': [item('mouth', '字形线索', 20, '看教材里的小姑娘、公鸡和白鹅，把口形与字形联系起来。', [group('a', '张大嘴巴，观察小姑娘圆圆的脸和辫子。'), group('o', '嘴巴圆圆，观察正在打鸣的公鸡。'), group('e', '嘴巴扁扁，观察白鹅与水中的倒影。')], { illustration: [60, 90, 880, 960] })],
  'pinyin-i-u-v': [item('mouth', '字形线索', 22, '看看衣服、乌龟和小鱼，记住三个韵母的字形和口形。', [group('i', '衣服的衣襟和纽扣帮助记住“一竖一点”。'), group('u', '看看乌龟，嘴唇向前突出。'), group('ü', '看看小鱼，注意 u 上方的两点。')], { illustration: [70, 80, 860, 1010] })],
  'pinyin-b-p-m-f': [chart(25, [group('b', 'bǎ bō bí bù'), group('p', 'pá pò pī pǔ'), group('m', 'mǎ mō mǐ mù'), group('f', 'fā fó fǔ')]), item('blend', '两拼与四声', 24, '轻短的声母和响亮的韵母连起来。相同音节也要区分四声。', [group('两拼', 'b + a → ba'), group('四声', 'bā bá bǎ bà')], { pinyin: true })],
  'pinyin-d-t-n-l': [chart(26, [group('d', 'dá dé dī dú'), group('t', 'tā tè tǐ tú'), group('n', 'ná né nǐ nù nǚ'), group('l', 'lā lè lǐ lù lǘ')])],
  'pinyin-g-k-h': [chart(32, [group('g', 'gā gè gù'), group('k', 'kǎ kē kǔ'), group('h', 'hā hé hǔ'), group('三拼', 'g + u + ā → guā', 'kuā huá guō kuò huǒ')])],
  'pinyin-j-q-x': [chart(34, [group('两拼', 'jī qí xī'), group('三拼', 'j + i + ā → jiā', 'qiā xiá'), group('去掉两点', 'j + ü → ju', 'q + ü → qu', 'x + ü → xu')], '教材用连线展示拼读和 ü 两点的变化。省去两点后仍读 ü。')],
  'pinyin-z-c-s': [chart(36, [group('z', 'zá zé zǔ zuó'), group('c', 'cā cè cū cuō'), group('s', 'sǎ sè sù suǒ'), group('整体认读', 'zǐ cì sī')]), item('school', '读词和句子', 37, '先读词，再把词放进完整句子里。', [group('教材黑板', '学', '学生', '我是小学生。')], { illustration: [170, 85, 470, 295] })],
  'pinyin-zh-ch-sh-r': [chart(38, [group('两拼', 'zhā zhè zhù', 'chá chē chū', 'shà shé shǔ', 'rè rǔ'), group('三拼', 'zhuǎ zhuō chuō', 'shuā shuō ruò'), group('整体认读', 'zhí chī shī rì')])],
  'pinyin-y-w': [chart(40, [group('拼写联系', 'i → yi', 'u → wu', 'ü → yu'), group('整体认读', 'yī wú yǔ'), group('拼读', 'yá wá wō')], '把韵母与整体认读音节联系起来。yu 的两点省去，读音仍是 ü。')],
  'pinyin-ai-ei-ui': [chart(45, [group('ai', 'g + āi → gāi', 'g + u + āi → guāi', 'tái kāi cāi huài kuài'), group('ei', 'l + èi → lèi', 'bēi péi fēi gěi wéi hēi'), group('ui', 't + uǐ → tuǐ', 'huí duì chuī zuǐ suì ruì')])],
  'pinyin-ao-ou-iu': [chart(47, [group('ao', 'niǎo tiào shǎo zǎo yào rào'), group('ou', 'ròu tóu kǒu lóu shōu yóu zǒu'), group('iu', 'qiū jiù diū xiù liù niú')])],
  'pinyin-ie-ve-er': [chart(49, [group('ie', 'piě dié bié xié qiē jiě'), group('üe', 'lüè nüè jué quē xué'), group('整体认读', 'ie → ye', 'üe → yue'), group('独立成音节', 'er')])],
  'pinyin-an-en-in-un-vn': [chart(51, [group('三拼', 'g + u + ān → guān', 'kuān huān', 'j + ü + ān → juān', 'quān xuān'), group('整体认读', 'yuán yīn yùn')]), chart(52, [group('an', 'wān yàn quān nán jiān zhàn rǎn duǎn'), group('en', 'chén nèn kěn wén zhēn rén'), group('in', 'pīn mín nín qīn jìn xīn'), group('un', 'rùn chūn tūn lún hūn zhǔn'), group('ün', 'jūn qún xún')], '对照前鼻韵母的拼读表，读清末尾的 n。', 'syllables-second')],
  'pinyin-ang-eng-ing-ong': [chart(54, [group('ang', 'bāng huáng qiáng chuāng'), group('eng', 'rēng héng fēng děng'), group('ing', 'jǐng bǐng tīng qīng'), group('ong', 'hóng zhōng sòng qióng'), group('整体认读', 'ying'), group('比一比', 'míng liàng')])],
  'garden-1': [
    item('snow-riddle', '猜谜读数', 15, '读数字歌谣，再看看画面里的雪花。', [group('一片两片', '一片两片三四片，', '五片六片七八片。', '九片十片无数片，', '飞入芦花都不见。')]),
    item('similar', '形近字', 15, '比较相近的字，看看多了哪一笔、哪里不一样。', [group('读一读，比一比', '人—天', '口—田', '日—目')]),
    item('stroke-rules', '笔顺提示', 16, '写字时注意坐端正，握好笔。', [group('先横后竖', '十、田'), group('先撇后捺', '八、禾')], { illustration: [85, 85, 820, 600] }),
    item('goose', '咏鹅', 16, '读一读，想象鹅在水中游动的样子。', [group('［唐］骆宾王', '鹅，鹅，鹅，', '曲项向天歌。', '白毛浮绿水，', '红掌拨清波。')], { reading: true }),
    item('listen-do', '我说你做', 17, '一个人发指令，其他人做动作。声音洪亮，吐字清楚；别人说话时认真听。', [group('口令一', '请你抬起一条腿。'), group('口令二', '把铅笔放到文具盒里，把书合上，然后坐端正。')]),
    item('paper-cuts', '剪窗花', 18, '和大人一起从左到右读，看看每次剪出了什么。', [group('先读', '小剪刀，手中拿，', '我学奶奶剪窗花。', '剪雪花，剪梅花，', '剪对喜鹊叫喳喳。'), group('接着读', '剪只鸡，剪只鸭，', '剪条鲤鱼摇尾巴。', '大红鲤鱼谁来抱？', '哦！再剪一个胖娃娃。')], { reading: true }),
  ],
  'garden-2': [
    item('cover', '拼音本', 28, '认读封面栏目，找找学校、班级和姓名。', [group('封面信息', '学校：第九小学', '班级：一年级（4）班', '姓名：王川')], { illustration: [295, 300, 360, 470] }),
    item('writing', '范字观察', 28, '看看九、王的笔画顺序，再观察田字格中的位置。', [group('教材范字', '九', '王')], { illustration: [110, 925, 710, 130] }),
    item('words', '形近字母', 29, '读音节，再比较半圆和横画的位置。', [group('b—d', 'là bǐ', 'dà mǐ'), group('f—t', 'fú tī', 'dì tú')], { pinyin: true }),
    item('poem', '画', 29, '读完整的古诗，想想这幅画的特点。', [group('画', '远看山有色，', '近听水无声。', '春去花还在，', '人来鸟不惊。')], { reading: true }),
  ],
  'garden-3': [
    item('timetable', '课程表', 42, '先找到星期，再找到第几节。看看教材的完整课程表。', [], { illustration: [55, 285, 870, 460] }),
    item('build', '摆字母', 42, '观察教材中用小棒和绳子摆出的字母，再尝试摆一个学过的字母。', [], { illustration: [75, 1100, 750, 195] }),
    item('writing', '范字观察', 42, '看看午、下的笔画顺序和田字格位置。', [group('教材范字', '午', '下')], { illustration: [145, 890, 680, 125] }),
    item('sound-pairs', '平翘舌音', 43, '比较声母和对应词语，注意舌尖的位置。', [group('z—zh', 'zì mǔ', 'zhī zhū'), group('c—ch', 'cā bō li', 'hē chá'), group('s—sh', 'sù shè', 'shū jià')], { pinyin: true }),
    item('idioms', '成语积累', 43, '读一读，看看成语中的数字。', [group('日积月累', '一模一样', '一心一意', '独一无二', '三头六臂', '五颜六色', '十全十美')]),
  ],
  'garden-4': [
    item('sound-pairs', '音节比较', 56, '看清声母、韵母和声调，再比较多了哪个音。', [group('读准音节', 'yǎn—yuǎn', 'yīn—yīng', 'jiǎn—juǎn', 'zuān—zhuān', 'chán—chuán—chuáng')], { pinyin: true }),
    item('compound-pairs', '韵母顺序', 57, '同样的字母，换了顺序就组成不同的韵母。', [group('ie—ei', 'xiě zì', 'dǎ léi', 'dié bèi zi'), group('iu—ui', 'chuī qì qiú', 'duī xuě rén', 'diū shǒu juàn')], { pinyin: true }),
    item('charts', '拼音总表', 57, '读一读，记一记，再说说自己的名字里有哪些声母和韵母。', [group('声母', 'b p m f', 'd t n l', 'g k h', 'j q x', 'zh ch sh r', 'z c s', 'y w'), group('韵母', 'a o e', 'i u ü', 'ai ei ui', 'ao ou iu', 'ie üe er', 'an en in un ün', 'ang eng ing ong'), group('整体认读音节', 'zhi chi shi ri', 'zi ci si', 'yi wu yu', 'ye yue yuan', 'yin yun ying')], { pinyin: true }),
    item('write', '拼写与词语', 58, '拼音帮助读词，也帮助写出汉字。', [group('拼一拼，写一写', '门 kǒu → 门口', 'shēng 日 → 生日', '题 mù → 题目', 'tián 野 → 田野'), group('车字词', '火车、马车、汽车', '上车、坐车、车站、车厢'), group('范字观察', '个、去')]),
  ],
  'sun-moon-bright': [item('characters', '猜字意思', 75, '教材还有“泪、苗、歪”三组部件图，可以联系字的组成来猜。', [group('水和眼睛', '氵 + 目 → 泪'), group('田里长草', '艹 + 田 → 苗'), group('不正', '不 + 正 → 歪')])],
  'garden-5': [
    item('opposites', '相反意思', 68, '读一读，在同一个情境里比较相反的意思。', [group('相反词', '南—北', '男—女', '开—关', '正—反', '先—后', '内—外')]),
    item('seasons', '四季词语', 68, '把教材词语与季节联系起来，再说说自己喜欢哪个季节。', [group('季节', '春天、夏天、秋天、冬天'), group('景物', '大地、树叶、飞鸟、莲花', '小鱼、青草、青蛙、雪人')]),
    item('names', '认识名字', 69, '看看姓名卡和写字本，找找自己认识的名字。', [group('姓名卡', '李晓宇，6岁'), group('写字本', '一年级（3）班', '刘丽')], { illustration: [85, 90, 830, 610] }),
    item('time', '珍惜时间', 69, '读一读，体会时间的宝贵。', [group('日积月累', '一年之计在于春，', '一日之计在于晨。', '一寸光阴一寸金，', '寸金难买寸光阴。')], { reading: true }),
    item('friends', '交朋友', 70, '主动与他人交流，说话时看着对方的眼睛。', [group('聊聊兴趣', '我喜欢跳绳。你呢？', '我也喜欢。放学后我们一起去跳绳吧！', '好啊！')]),
    item('radish', '拔萝卜', 71, '读完整故事，按先后顺序看看谁来帮忙。课本留下了“后来怎么样了”的问题。', [group('老公公', '老公公种了一个萝卜。萝卜长大了，老公公去地里拔萝卜。', '老公公拉着萝卜叶子，“嗨哟！嗨哟！”拔呀拔，拔不动。'), group('老婆婆', '老公公喊老婆婆来帮忙。老婆婆拉着老公公，老公公拉着萝卜叶子，“嗨哟！嗨哟！”拔呀拔，拔不动。'), group('小姑娘', '老婆婆喊小姑娘来帮忙。小姑娘拉着老婆婆，老婆婆拉着老公公，老公公拉着萝卜叶子，“嗨哟！嗨哟！”拔呀拔，拔不动。'), group('小狗', '小姑娘喊小狗来帮忙。小狗拉着小姑娘，小姑娘拉着老婆婆，老婆婆拉着老公公，老公公拉着萝卜叶子，“嗨哟！嗨哟！”拔呀拔，拔不动。'), group('小猫', '小狗喊小猫来帮忙……', '后来怎么样了？')], { reading: true }),
  ],
  'garden-6': [
    item('jobs', '地点与职业', 80, '把工作的地点和职业联系起来。', [group('学校', '老师'), group('医院', '医生'), group('工厂', '工人'), group('传达室', '门卫')]),
    item('words', '读准字音', 80, '读清词语，留意相近的声母和韵母。', [group('读一读', '你们、家里', '男生、上山', '三年、写字', '蓝色、报纸')]),
    item('radicals', '部件发现', 81, '木字旁与草字头能给我们字义线索，还要结合词语核对。', [group('木字旁', '树、林、桃、桥'), group('草字头', '花、草、莲、菜')]),
    item('street', '生活识字', 81, '看看路上的招牌和指示牌，再观察教材图里的人在做什么。', [group('路上的字', '电影院', '生活超市'), group('看图写词语', '先观察图中的人和动作，再说一两句话。')], { illustration: [70, 590, 860, 640] }),
    item('strokes', '笔顺规则', 82, '先看笔画的位置，再按顺序观察范字。', [group('从上到下', '云、男'), group('从左到右', '叶、竹')], { illustration: [80, 70, 840, 660] }),
    item('moon', '古朗月行', 82, '读节选，想象白玉盘和瑶台镜。', [group('［唐］李白 · 节选', '小时不识月，', '呼作白玉盘。', '又疑瑶台镜，', '飞在青云端。')], { reading: true }),
    item('peanuts', '小松鼠找花生', 83, '读完整故事，想想花生长在哪里。', [group('发现花生', '大树旁边的地里长着许多花生。花生已经开花了，一朵朵金黄色的小花，在阳光下格外鲜艳。'), group('问鼹鼠', '小松鼠问鼹鼠：“这是什么花啊？”鼹鼠说：“这是花生的花。到了秋天，会结花生。花生可好吃啦！”小松鼠很高兴，他想：等花生结了果，我就把它摘下来，留着冬天吃。'), group('每天去看', '小松鼠每天都到地里去，看看结花生了没有。'), group('等到花落', '他等啊，等啊，等到花都落光了，也没看见花生。'), group('是谁摘走了', '小松鼠感到很奇怪，自言自语地说：“是谁把花生摘走了呢？”')], { reading: true }),
  ],
  'garden-7': [
    item('family', '介绍家人', 90, '读一读教材的家人称谓，联系自己的家人。', [group('长辈', '爷爷、奶奶、姥爷、姥姥', '叔叔、姑姑、爸爸、妈妈', '舅舅、姨妈'), group('兄弟姐妹', '哥哥、姐姐、弟弟、妹妹')]),
    item('compare', '比一比写字', 90, '比较笔画和字形，再写一写。', [group('比一比笔画', '了、才', '云、山', '儿、四', '我、心')], { illustration: [90, 990, 820, 295] }),
    item('radicals', '偏旁发现', 91, '看看共同的偏旁，再说说这些字与什么有关。', [group('日字旁', '明、晚、昨、春'), group('女字旁', '妈、奶、姐、妹')]),
    item('directions', '辨认方向', 91, '“早晨、面向太阳”是这首方位儿歌的重要条件。', [group('方位儿歌', '早晨起来，面向太阳。', '前面是东，后面是西。', '左面是北，右面是南。')], { reading: true }),
    item('sayings', '谚语积累', 91, '读一读，说说你理解的一句。', [group('日积月累', '种瓜得瓜，种豆得豆。', '前人栽树，后人乘凉。', '千里之行，始于足下。', '百尺竿头，更进一步。')], { reading: true }),
    item('volume', '说话音量', 92, '什么时候大声说，什么时候轻声说？既让别人听清，也不影响其他人。', [group('近距离交谈', '请问，这里有人吗？'), group('告诉老师', '老师，我在教室里捡到一块橡皮。'), group('全班分享', '我给大家讲一个故事……')]),
    item('monkeys', '猴子捞月亮', 93, '读完整故事，观察井里的月亮和天上的月亮。', [group('小猴子发现月亮', '有只小猴子在井边玩。他往井里一看，里面有个月亮。小猴子叫起来：“糟啦，糟啦！月亮掉在井里啦！”'), group('大猴子、老猴子', '大猴子听见了，跑过来一看，跟着叫起来：“糟啦，糟啦！月亮掉在井里啦！”', '老猴子听见了，跑过来一看，也跟着叫起来：“糟啦，糟啦！月亮掉在井里啦！”'), group('大家来捞', '附近的猴子听见了，都跑过来看。大家跟着叫起来：“糟啦，糟啦！月亮掉在井里啦！咱们快把它捞上来！”'), group('一只拉一只', '猴子们爬上了井旁边的大树。老猴子倒挂在树上，拉住大猴子的脚。大猴子也倒挂着，拉住另一只猴子的脚。猴子们就这样一只拉一只，一直挂到井里头，小猴子挂在最下边。'), group('伸手去捞', '小猴子伸手去捞月亮，手刚碰到水，月亮就不见了。'), group('抬头再看', '老猴子一抬头，看见月亮还在天上。他喘着气说：“不用捞了，不用捞了！月亮还好好地挂在天上呢！”')], { reading: true }),
  ],
  'garden-8': [
    item('parts', '拆字发现', 101, '看看哪些字能分成上下两部分，给两部分找到对应的字。', [], { illustration: [80, 95, 850, 560] }),
    item('meanings', '词义比较', 101, '同一个字放进不同词语里，意思可能相近，也可能不同。', [group('皮', '果皮—树皮'), group('许', '许多—不许'), group('法', '加法—办法'), group('处', '到处—四处'), group('回', '回来—回答'), group('方', '方向—地方')]),
    item('greeting', '新年祝福', 102, '看看教材里的祝福卡，记住称呼、祝福、署名和日期。', [group('祝福卡', '妈妈：', '祝您新年快乐！', '小华', '12月21日')]),
    item('strokes', '笔顺规则', 102, '观察范字的笔画怎样依次写下来。', [group('先外后内', '月、风'), group('先中间后两边', '小、水')], { illustration: [80, 270, 840, 470] }),
    item('wind', '风', 102, '想象风让树叶、花、水面和竹子发生的变化。', [group('［唐］李峤', '解落三秋叶，', '能开二月花。', '过江千尺浪，', '入竹万竿斜。')], { reading: true }),
    item('pumpkin', '想运南瓜', 103, '先观察南瓜的形状和道路，再大胆说出自己的办法。', [], { illustration: [75, 150, 850, 960] }),
    item('festival', '春节童谣', 104, '从腊八读到春节，按日期发现不同年俗。', [group('过了腊八就是年', '小孩小孩你别馋，', '过了腊八就是年。', '腊八粥，喝几天，', '哩哩啦啦二十三。'), group('二十三到二十八', '二十三，糖瓜粘。', '二十四，扫房子。', '二十五，磨豆腐。', '二十六，去买肉。', '二十七，宰公鸡。', '二十八，把面发。'), group('过新年', '二十九，蒸馒头。', '三十晚上熬一宿，', '初一初二满街走。')], { reading: true }),
  ],
};
