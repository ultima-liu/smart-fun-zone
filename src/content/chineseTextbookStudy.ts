export type ChineseStudyCharacter = {
  char: string;
  pinyin: string;
};

export type ChineseStudyTask = {
  id: string;
  kind: 'read' | 'recite' | 'choice' | 'speak' | 'practice' | 'pronunciation';
  /** 场景化任务：tian-grid=田字格找线（点卡片在格上高亮）；pict-match=象形字图文连线 */
  scene?: 'tian-grid' | 'pict-match';
  instruction: string;
  content?: string[];
  options?: string[];
  answer?: string;
  explanation?: string;
};

export type ChineseTextbookStudyPack = {
  pageLabel: string;
  recognize?: ChineseStudyCharacter[];
  writing?: ChineseStudyCharacter[];
  tasks: ChineseStudyTask[];
};

const chars = (pairs: [string, string][]): ChineseStudyCharacter[] => pairs.map(([char, pinyin]) => ({ char, pinyin }));

export const CHINESE_TEXTBOOK_STUDY: Record<string, ChineseTextbookStudyPack> = {
  'heaven-earth-human': {
    pageLabel: 'P8 认读生字',
    recognize: chars([['天', 'tiān'], ['地', 'dì'], ['人', 'rén'], ['你', 'nǐ'], ['我', 'wǒ'], ['他', 'tā']]),
    tasks: [
      { id: 'meaning', kind: 'speak', instruction: '联系画面，说一说“天、地、人”和“你、我、他”分别指什么。', content: ['天　地　人', '你　我　他'] },
    ],
  },
  'metal-wood-water-fire-earth': {
    pageLabel: 'P10 生字、书写与课后要求',
    recognize: chars([['一', 'yī'], ['二', 'èr'], ['三', 'sān'], ['四', 'sì'], ['五', 'wǔ'], ['上', 'shàng'], ['下', 'xià']]),
    writing: chars([['一', 'yī'], ['二', 'èr'], ['三', 'sān'], ['上', 'shàng']]),
    tasks: [
      { id: 'recite', kind: 'recite', instruction: '用普通话朗读课文，并尝试背诵课文。', content: ['一二三四五，金木水火土。', '天地分上下，日月照今古。'] },
      { id: 'grid', kind: 'practice', scene: 'tian-grid', instruction: '认识田字格，找出横中线、竖中线，记住四个方位格的名字。', content: ['横中线', '竖中线', '左上格、右上格、左下格、右下格'] },
    ],
  },
  'mouth-ear-eye-hand-foot': {
    pageLabel: 'P12 生字、书写与表达',
    recognize: chars([['口', 'kǒu'], ['耳', 'ěr'], ['目', 'mù'], ['手', 'shǒu'], ['足', 'zú'], ['站', 'zhàn'], ['坐', 'zuò']]),
    writing: chars([['口', 'kǒu'], ['耳', 'ěr'], ['目', 'mù'], ['手', 'shǒu']]),
    tasks: [
      { id: 'body-use', kind: 'speak', instruction: '口、耳、目、手、足能做哪些事？请联系自己的身体说一说。', content: ['口能说和吃', '耳能听', '目能看', '手能拿', '足能走'] },
      { id: 'posture', kind: 'read', instruction: '朗读韵句，配合动作体会站、坐、行、卧。', content: ['站如松，坐如钟。', '行如风，卧如弓。'] },
    ],
  },
  'sun-moon-mountain-river': {
    pageLabel: 'P14 生字、书写与象形字练习',
    recognize: chars([['日', 'rì'], ['月', 'yuè'], ['山', 'shān'], ['川', 'chuān'], ['水', 'shuǐ'], ['火', 'huǒ'], ['田', 'tián'], ['禾', 'hé']]),
    writing: chars([['日', 'rì'], ['火', 'huǒ'], ['田', 'tián'], ['禾', 'hé']]),
    tasks: [
      { id: 'connect', kind: 'practice', scene: 'pict-match', instruction: '猜一猜，连一连：根据字形给图画找到汉字。', content: ['兔', '鸟', '竹', '羊', '木', '网'] },
      { id: 'reason', kind: 'speak', instruction: '选择一个象形字，说清它的字形哪里像实物。' },
    ],
  },
  autumn: {
    pageLabel: 'P61 生字、田字格、朗读背诵与语文知识',
    recognize: chars([['秋', 'qiū'], ['气', 'qì'], ['了', 'le'], ['树', 'shù'], ['叶', 'yè'], ['黄', 'huáng'], ['片', 'piàn'], ['从', 'cóng'], ['来', 'lái'], ['飞', 'fēi']]),
    writing: chars([['了', 'le'], ['子', 'zǐ'], ['大', 'dà'], ['人', 'rén']]),
    tasks: [
      { id: 'read-recite', kind: 'recite', instruction: '借助拼音朗读课文，做到正确、自然；再尝试背诵课文。', content: ['天气凉了，树叶黄了，一片片叶子从树上落下来。', '天那么蓝，那么高。一群大雁往南飞……', '啊！秋天来了！'] },
      { id: 'paragraphs', kind: 'choice', instruction: '数一数，课文一共有几个自然段？注意自然段前面有两个空格。', options: ['2 个', '3 个', '4 个'], answer: '3 个', explanation: '课文共有三个自然段，每个自然段的开头都有两个空格。' },
      { id: 'yi-tone', kind: 'pronunciation', instruction: '读一读，注意“一”在不同词语中的读音变化。', content: ['一 yī', '一片片 yí piàn piàn', '一会儿 yí huìr', '一群 yì qún'] },
    ],
  },
  jiangnan: {
    pageLabel: 'P63 生字、田字格与背诵',
    recognize: chars([['江', 'jiāng'], ['南', 'nán'], ['可', 'kě'], ['采', 'cǎi'], ['莲', 'lián'], ['戏', 'xì'], ['间', 'jiān'], ['东', 'dōng'], ['北', 'běi']]),
    writing: chars([['可', 'kě'], ['叶', 'yè'], ['东', 'dōng'], ['西', 'xī']]),
    tasks: [
      { id: 'read-recite', kind: 'recite', instruction: '朗读课文，读清东、西、南、北的节奏，并背诵课文。', content: ['江南可采莲，莲叶何田田。', '鱼戏莲叶东，鱼戏莲叶西，鱼戏莲叶南，鱼戏莲叶北。'] },
    ],
  },
  'snow-painters': {
    pageLabel: 'P65 生字、田字格、朗读背诵与课后提问',
    recognize: chars([['的', 'de'], ['家', 'jiā'], ['鸡', 'jī'], ['竹', 'zhú'], ['牙', 'yá'], ['用', 'yòng'], ['几', 'jǐ'], ['步', 'bù'], ['没', 'méi'], ['参', 'cān'], ['加', 'jiā']]),
    writing: chars([['竹', 'zhú'], ['马', 'mǎ'], ['牙', 'yá'], ['用', 'yòng'], ['几', 'jǐ']]),
    tasks: [
      { id: 'read-recite', kind: 'recite', instruction: '朗读课文，读出看到下雪时的兴奋，并背诵课文。' },
      { id: 'painters', kind: 'choice', instruction: '雪地里来了哪些小画家？他们画了什么？', options: ['小鸡画竹叶、小狗画梅花、小鸭画枫叶、小马画月牙', '四只动物都画梅花', '青蛙画竹叶'], answer: '小鸡画竹叶、小狗画梅花、小鸭画枫叶、小马画月牙', explanation: '动物脚掌不同，留在雪地里的脚印形状也不同。' },
      { id: 'frog', kind: 'choice', instruction: '青蛙为什么没参加？', options: ['它在洞里冬眠', '它不会画画', '它去南方了'], answer: '它在洞里冬眠', explanation: '冬天青蛙会在洞里冬眠，所以没有来雪地。' },
    ],
  },
  'four-seasons': {
    pageLabel: 'P67 生字、田字格、朗读与仿说',
    recognize: chars([['鸟', 'niǎo'], ['说', 'shuō'], ['是', 'shì'], ['春', 'chūn'], ['青', 'qīng'], ['蛙', 'wā'], ['夏', 'xià'], ['着', 'zhe'], ['皮', 'pí'], ['地', 'de'], ['就', 'jiù'], ['冬', 'dōng']]),
    writing: chars([['四', 'sì'], ['小', 'xiǎo'], ['鸟', 'niǎo'], ['是', 'shì'], ['天', 'tiān']]),
    tasks: [
      { id: 'read', kind: 'read', instruction: '分角色朗读课文，读出草芽、荷叶、谷穗和雪人的不同语气。' },
      { id: 'imitate', kind: 'speak', instruction: '你喜欢哪个季节？仿照课文说一说。', content: ['我喜欢____，因为____。', '____的____，它说：“我是____。”'] },
    ],
  },
  'rhyme-song': {
    pageLabel: 'P73 生字、田字格与背诵',
    recognize: chars([['对', 'duì'], ['歌', 'gē'], ['雨', 'yǔ'], ['风', 'fēng'], ['虫', 'chóng'], ['清', 'qīng'], ['绿', 'lǜ'], ['桃', 'táo'], ['红', 'hóng']]),
    writing: chars([['云', 'yún'], ['雨', 'yǔ'], ['虫', 'chóng'], ['山', 'shān'], ['水', 'shuǐ']]),
    tasks: [
      { id: 'read-recite', kind: 'recite', instruction: '朗读课文，读好“什么对什么”的节奏，并背诵课文。', content: ['云对雨，雪对风。', '花对树，鸟对虫。', '山清对水秀，柳绿对桃红。'] },
    ],
  },
  'sun-moon-bright': {
    pageLabel: 'P75 生字、田字格、词语与会意识字',
    recognize: chars([['力', 'lì'], ['尖', 'jiān'], ['尘', 'chén'], ['众', 'zhòng'], ['双', 'shuāng'], ['林', 'lín'], ['森', 'sēn'], ['不', 'bù'], ['条', 'tiáo'], ['心', 'xīn'], ['金', 'jīn']]),
    writing: chars([['力', 'lì'], ['男', 'nán'], ['土', 'tǔ'], ['木', 'mù'], ['心', 'xīn']]),
    tasks: [
      { id: 'read', kind: 'read', instruction: '朗读课文，边读边想字的组成和意思。' },
      { id: 'words', kind: 'read', instruction: '读一读课后词语。', content: ['力气', '尘土', '双手', '金黄', '树林', '森林', '关心', '开心'] },
      { id: 'guess', kind: 'choice', instruction: '根据字的组成猜一猜：“不”和“正”合起来是什么意思？', options: ['歪', '苗', '泪'], answer: '歪', explanation: '“不正”就是歪；会意字可以借助部件意思来猜。' },
    ],
  },
  'little-schoolbag': {
    pageLabel: 'P77 生字、田字格、学习用品与整理习惯',
    recognize: chars([['包', 'bāo'], ['尺', 'chǐ'], ['作', 'zuò'], ['业', 'yè'], ['笔', 'bǐ'], ['刀', 'dāo'], ['宝', 'bǎo'], ['贝', 'bèi'], ['少', 'shǎo'], ['课', 'kè'], ['早', 'zǎo']]),
    writing: chars([['尺', 'chǐ'], ['本', 'běn'], ['刀', 'dāo'], ['不', 'bù'], ['少', 'shǎo']]),
    tasks: [
      { id: 'read-say', kind: 'speak', instruction: '朗读课文，说一说你的书包里有哪些学习用品。', content: ['橡皮', '尺子', '作业本', '笔袋', '铅笔', '转笔刀'] },
      { id: 'tidy', kind: 'practice', instruction: '照教材做一做：把文具摆放整齐，再自己整理一次书包。', content: ['分类摆放', '常用物品放在容易取的位置', '整理后检查是否遗漏'] },
    ],
  },
  'raising-flag': {
    pageLabel: 'P78-P79 生字、田字格与背诵',
    recognize: chars([['升', 'shēng'], ['国', 'guó'], ['旗', 'qí'], ['中', 'zhōng'], ['们', 'men'], ['声', 'shēng'], ['起', 'qǐ'], ['多', 'duō'], ['么', 'me'], ['向', 'xiàng'], ['立', 'lì']]),
    writing: chars([['中', 'zhōng'], ['五', 'wǔ'], ['风', 'fēng'], ['立', 'lì'], ['正', 'zhèng']]),
    tasks: [
      { id: 'read-recite', kind: 'recite', instruction: '朗读课文，读出庄重、自豪的语气，并背诵课文。', content: ['向着国旗，我们立正。', '望着国旗，我们敬礼。'] },
      { id: 'etiquette', kind: 'practice', instruction: '模拟升旗：面向国旗立正，国歌声中保持安静并敬礼。' },
    ],
  },
  'little-boat': {
    pageLabel: 'P85 生字、田字格、背诵与叠词仿说',
    recognize: chars([['船', 'chuán'], ['弯', 'wān'], ['儿', 'ér'], ['两', 'liǎng'], ['头', 'tóu'], ['在', 'zài'], ['里', 'lǐ'], ['看', 'kàn'], ['见', 'jiàn'], ['闪', 'shǎn']]),
    writing: chars([['月', 'yuè'], ['儿', 'ér'], ['头', 'tóu'], ['里', 'lǐ'], ['见', 'jiàn']]),
    tasks: [
      { id: 'read-recite', kind: 'recite', instruction: '朗读课文，读出轻柔的想象，并背诵课文。' },
      { id: 'phrases', kind: 'practice', instruction: '照样子说一说，用叠词把事物特点说得更形象。', content: ['小小的船', '弯弯的月儿', '闪闪的星星', '蓝蓝的天', '弯弯的小河', '蓝蓝的大海'] },
    ],
  },
  shadow: {
    pageLabel: 'P87 生字、田字格、朗读与方位表达',
    recognize: chars([['影', 'yǐng'], ['前', 'qián'], ['常', 'cháng'], ['黑', 'hēi'], ['狗', 'gǒu'], ['左', 'zuǒ'], ['右', 'yòu'], ['它', 'tā'], ['好', 'hǎo'], ['朋', 'péng'], ['友', 'yǒu']]),
    writing: chars([['在', 'zài'], ['我', 'wǒ'], ['左', 'zuǒ'], ['右', 'yòu']]),
    tasks: [
      { id: 'read', kind: 'read', instruction: '朗读课文，读清前、后、左、右四个方位词。' },
      { id: 'position', kind: 'speak', instruction: '你的前、后、左、右都是谁？按照教材示例完整地说。', content: ['我的前边是____。', '我的后面是____。', '我的左边是____。', '我的右边是____。'] },
    ],
  },
  'two-treasures': {
    pageLabel: 'P89 生字、田字格、背诵与课后讨论',
    recognize: chars([['件', 'jiàn'], ['有', 'yǒu'], ['和', 'hé'], ['做', 'zuò'], ['也', 'yě'], ['办', 'bàn'], ['到', 'dào'], ['又', 'yòu'], ['才', 'cái'], ['能', 'néng']]),
    writing: chars([['和', 'hé'], ['也', 'yě'], ['又', 'yòu'], ['才', 'cái']]),
    tasks: [
      { id: 'read-recite', kind: 'recite', instruction: '朗读课文，并背诵课文。' },
      { id: 'treasures', kind: 'choice', instruction: '课文中的两件宝是什么？', options: ['双手和大脑', '书包和铅笔', '眼睛和耳朵'], answer: '双手和大脑', explanation: '双手能做工，大脑会思考。' },
      { id: 'why', kind: 'speak', instruction: '说说两件宝能做什么，为什么要“用手又用脑”。', content: ['先用大脑想办法', '再用双手去实践', '根据结果继续调整'] },
    ],
  },
  'compare-tails': {
    pageLabel: 'P96 生字、田字格、背诵与问答游戏',
    recognize: chars([['比', 'bǐ'], ['尾', 'wěi'], ['巴', 'ba'], ['谁', 'shuí'], ['长', 'cháng'], ['短', 'duǎn'], ['把', 'bǎ'], ['伞', 'sǎn'], ['兔', 'tù'], ['最', 'zuì'], ['公', 'gōng']]),
    writing: chars([['比', 'bǐ'], ['巴', 'ba'], ['长', 'cháng'], ['公', 'gōng']]),
    tasks: [
      { id: 'read-recite', kind: 'recite', instruction: '分组朗读问句和答句，并背诵课文。' },
      { id: 'qa-game', kind: 'speak', instruction: '照样子做问答游戏。先问一个特点，再用完整句回答。', content: ['谁的尾巴最好看？孔雀的尾巴最好看。', '谁的样子最可爱？兔子的样子最可爱。'] },
    ],
  },
  'crow-drinks-water': {
    pageLabel: 'P98 生字、田字格、朗读与过程复述',
    recognize: chars([['喝', 'hē'], ['只', 'zhī'], ['处', 'chù'], ['找', 'zhǎo'], ['着', 'zháo'], ['许', 'xǔ'], ['石', 'shí'], ['出', 'chū'], ['法', 'fǎ'], ['放', 'fàng'], ['进', 'jìn'], ['高', 'gāo']]),
    writing: chars([['只', 'zhī'], ['多', 'duō'], ['办', 'bàn'], ['石', 'shí'], ['出', 'chū']]),
    tasks: [
      { id: 'read', kind: 'read', instruction: '朗读课文，注意“一颗一颗”和“渐渐升高”表现出的过程。' },
      { id: 'retell', kind: 'speak', instruction: '说一说乌鸦是用什么办法喝着水的。', content: ['遇到的问题：瓶口小、水不多', '发现的材料：许多小石子', '采取的办法：一颗一颗放进瓶子', '产生的结果：水渐渐升高'] },
    ],
  },
  raindrops: {
    pageLabel: 'P100 生字、田字格、分角色朗读与变调停顿',
    recognize: chars([['点', 'diǎn'], ['数', 'shǔ'], ['彩', 'cǎi'], ['半', 'bàn'], ['空', 'kōng'], ['问', 'wèn'], ['回', 'huí'], ['答', 'dá'], ['方', 'fāng'], ['久', 'jiǔ'], ['更', 'gèng'], ['长', 'zhǎng']]),
    writing: chars([['来', 'lái'], ['半', 'bàn'], ['你', 'nǐ'], ['有', 'yǒu']]),
    tasks: [
      { id: 'roles', kind: 'read', instruction: '分角色朗读课文，区分大雨点儿的问话和小雨点儿的回答。' },
      { id: 'bu-tone', kind: 'pronunciation', instruction: '读一读，注意“不”在不同词语中的读音。', content: ['不多 bù duō', '不行 bù xíng', '不久 bù jiǔ', '不用 bú yòng', '不去 bú qù'] },
      { id: 'pause', kind: 'read', instruction: '读好长句停顿：先分清两处地方，再读出下雨后的变化。', content: ['不久，有花有草的地方，花更红了，草更绿了。', '没有花没有草的地方，开出了红的花，长出了绿的草。'] },
    ],
  },
};

export const getChineseTextbookStudy = (lessonId: string) => CHINESE_TEXTBOOK_STUDY[lessonId];
