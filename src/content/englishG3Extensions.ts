import type { EnglishQuiz, EnglishSection } from './englishGrade3Upper';

export type EnglishExtension = { title: string; insight: string; example: string; mnemonic: string; transfer: EnglishQuiz; from?: string };
const X = (title: string, insight: string, example: string, mnemonic: string, question: string, options: string[], answer: string, explain: string, from?: string): EnglishExtension =>
  ({ title, insight, example, mnemonic, transfer: { question, options, answer, explain }, from });
type Cards = Record<EnglishSection, EnglishExtension>;
export const ENGLISH_G3_EXTENSIONS: Record<string, Cards> = {
  friends: {
    opening: X('友好不只是一句 Hello', '问候、倾听、分享都让朋友感到被尊重；看场合选择合适行动。', '新同学不认识路时，先打招呼，再告诉她教室在哪。', '先问好，再倾听；需要帮助伸出手。', '同学在介绍自己，你怎样让她知道你在认真听？', ['看着她，等她说完', '马上打断', '转身离开'], '看着她，等她说完', '结交朋友需要双向交流。'),
    a: X('问候是一来一回', 'Nice to meet you too 的 too 是“我也一样”；只重复自己的名字不能完整回应对方。', 'Sarah 说 Nice to meet you，John 接 Nice to meet you too。', '问一句，答一句，名字和回应都听清。', '朋友说 “Hi! My name is Amy.”，你的第一步是？', ['听清名字，再介绍自己', '直接说 Bye', '问她几元'], '听清名字，再介绍自己', '对话先听对方，再回应。', 'friends-opening'),
    letters: X('字母名与单词里的声音不同', '看到 A 要知道它的字母名；听 apple 的起首音还要听词中的声音，不把两者当成一样。', 'A 的字母名不等于 apple 起首的短元音。', '看字母名，听词中音；两个都要认。', '学 apple 时只听字母名 A，足以判断 apple 的起首音吗？', ['不够，还要听单词里的声音', '足够，完全一样', '只看苹果颜色'], '不够，还要听单词里的声音', '听音辨首音需要教材原版录音；TTS 只示范完整单词。'),
    b: X('分享之前要先征求意见', 'We can share 是友好的提议，但不能不问就拿朋友的东西；真实沟通也要说 Thank you。', '朋友有一盒彩笔，你先问能否一起用，得到同意后说 Thank you。', '分享先问，收到感谢，彼此轮流。', '朋友拿着自己的新书，最合适怎样做？', ['先问能不能一起看', '只聊自己的新书', '不听朋友回答'], '先问能不能一起看', '分享是一种尊重对方的行为。', 'friends-a'),
    read: X('海报里的 I 是谁', '读 I listen / I help 时，I 指正在说这句话的人；要把海报变成自己的行动。', '轮到你说 I help，就是“我帮助朋友”。', 'I 指我，动词说行动；读后要能做。', '你要告诉新朋友自己愿意帮忙，选哪句？', ['I help.', 'He is ten yuan.', 'It is orange.'], 'I help.', '读懂短句还要用在自己的生活。', 'friends-b'),
    project: X('思维导图不是词堆', '把 Say Hi、Listen、Help 放在“交朋友”中心周围，说明它们怎样帮助关系；自己可添新行动。', '“问好”让人知道你愿意交流，“倾听”让人愿意继续说。', '一个中心，多种行动，每个行动说理由。', '导图新添“邀请一起玩”，它最好放哪边？', ['交朋友行动的一条分支', '家庭成员列表', '数字价签'], '交朋友行动的一条分支', '新分支要和主题有关。', 'friends-read'),
    story: X('故事看关系怎样变化', 'Zoom 和 Zip 不只是互换名字；他们分享、游戏和帮忙，关系才从认识走向友谊。', 'Zip 受伤，Zoom 伸手帮忙；这一幕比只说 Hi 更能看出友谊。', '先认识，再相处，遇到困难互相帮。', '如果故事只保留第一句 Hi，能解释“好朋友”怎样形成吗？', ['不能，还要看后面的行动', '能，名字就是全部', '只看食物颜色'], '不能，还要看后面的行动', '阅读故事要关注行动和变化。', 'friends-project'),
  },
  families: {
    opening: X('家庭形状可以不同', '有的家庭大、有的家庭小；家人关系也各不相同，不能用一种模板要求每个孩子。', '书里的两张家庭诗分别有小家庭和大家庭。', '人数不同，关系不同，关爱都可有。', '同学的家庭树与自己不同，应怎样对待？', ['尊重他的家庭', '说他的家庭画错', '强迫他补一样的人'], '尊重他的家庭', '家庭学习要保护孩子表达意愿和隐私。'),
    a: X('This is 用来介绍眼前的人', '介绍身边的人时可以说 This is my ...；grandma 和 grandmother 意思相关，语气与使用场合不同。', '带朋友见奶奶：This is my grandma。', '先指人物，再说 This is my ...。', '老师问照片里的人是谁，你想介绍爸爸，怎样开头？', ['This is my dad.', 'How many dads?', 'It is blue.'], 'This is my dad.', '把关系词放进完整介绍句。', 'families-opening'),
    letters: X('词首与词尾都能帮你辨字母', 'egg 的 e 在词首，nest 的 e 不在词首；教材用两个词帮你观察同一字母的不同位置。', 'fish 的 f 在开头，beef 的 f 在末尾。', '字母可能在头也在尾，找位置再听音。', 'beef 的 f 在哪里？', ['词尾', '词首', '没有 f'], '词尾', '不要因为例词位置不同就漏认字母。', 'friends-letters'),
    b: X('this 与 that 要看距离', 'Is this your ... 问近处照片/人物，Is that your ... 问较远的；回答前也要看是不是同一个人。', '指手里的照片：Is this your brother? 指远处：Is that your brother?', '近 this，远 that；先看所指再回答。', '朋友指远处舞台上的男孩，应问？', ['Is that your brother?', 'Is this your brother?', 'How many brothers?'], 'Is that your brother?', '根据说话者指向选择词。', 'families-a'),
    read: X('big / small 只说人数，不说爱', '大小家庭都可以互相关爱；small 不能解释成“不完整”或“不幸福”。', '两首诗最后都说 I love my family。', '人数说大小，关爱看行动。', '书里小家庭的孩子说什么？', ['I love my small family.', 'My family is wrong.', 'Only big families are happy.'], 'I love my small family.', '教材阅读强调共同关爱。', 'families-b'),
    project: X('家庭树是关系图，不是标准答案', '家庭树要帮助说明“谁和谁是什么关系”，可以按自己实际生活填写，也可以不公开私人信息。', 'cousin 放在亲属分支，不必给每位同学画一样的树。', '画真实关系，愿意分享才分享。', '同学不愿意公开家庭照片，你应怎样做？', ['允许用文字或空白卡代替', '坚持要照片', '说他没完成'], '允许用文字或空白卡代替', '项目可以表达真实关系，也尊重隐私。', 'families-read'),
    story: X('两首诗可以比较共同点', 'small 和 big 的成员不一样，但两首都写一起玩、分享、倾听、爱家。比较不是只找哪首人更多。', '一首写 brother，一首写 brothers；共同有 listen with care。', '先找不同，再找共同感受。', '哪一句两首诗都有？', ['We listen with care.', 'I have three cousins.', 'We live in a zoo.'], 'We listen with care.', '读相似文本时要抓共同情感。', 'families-project'),
  },
  animals: {
    opening: X('动物不同，生活环境也不同', '宠物需要照料；野生动物需要合适栖息地，不是看到可爱就带回家。', '猫能做宠物，野外小熊猫要在自己的环境里生活。', '先认动物，再看住哪里，尊重它的生活。', '看到野生动物幼崽，最合适怎样做？', ['保持距离并请大人帮助', '带回家当宠物', '追着玩'], '保持距离并请大人帮助', '友好对待动物也要考虑安全和栖息地。'),
    a: X('have a pet 与 like an animal 不一样', '喜欢狗不代表家里有狗；Do you have a pet 问有没有，I like dogs 说喜不喜欢。', 'Binbin 没有宠物，也可以喜欢动物。', '有无问 have，喜好说 like。', '同学说 “I like rabbits.”，能断定他家养兔子吗？', ['不能', '一定养了', '一定不喜欢兔子'], '不能', '喜好与拥有是两种信息。', 'animals-opening'),
    letters: X('一个字母可在两个词里不同位置', '教材 lion 的 l 在词首，leg 也在词首；big 的 i 在词中。观察位置后再用原录音辨音。', 'I 是元音字母，big 的 i 不是单词首字母。', '先找字母位置，再听词中的音。', 'big 的 i 在哪里？', ['词中', '词首', '词尾'], '词中', '辨字形与辨声音要分开训练。', 'families-letters'),
    b: X('this / that 跟着观察位置变', '离自己近的狐狸问 What’s this，较远的小熊猫问 What’s that；红熊猫和大熊猫也不是同一种动物。', '近处问 this，远处问 that。', '近 this，远 that；回答还要认对动物。', '站在远处笼子前，问另一边的动物？', ["What’s that?", "What’s this?", 'How old are you?'], "What’s that?", '说话时先明确指哪一个。', 'families-b'),
    read: X('big / small / tall / fast 不同标准', '高、重、快分别需要不同线索；6 m 是高度，60 km/h 是速度，不是同一个“最大”。', '长颈鹿 6 m 强调高，狮子 60 km/h 强调快。', '比较先定标准，数字还要看单位。', '看 “8 cm” 描述鱼，更直接观察什么？', ['长度或大小', '奔跑速度', '颜色数量'], '长度或大小', '单位帮助我们读懂动物资料。', 'animals-b'),
    project: X('分类可以换标准，但每次只用一个', '一页按宠物/野生分，一页按大小分都可以；先说当前标准，不能把两种标准混到同一组里。', '猫可放“宠物”，狮子可放“野生动物”。', '先定一把尺，按同一把尺分。', '把“快”“野生”“小”混成一个分组名，会怎样？', ['标准不清楚，要重新说明', '非常清楚', '所有动物都会同类'], '标准不清楚，要重新说明', '项目分类必须解释为什么放一起。', 'animals-read'),
    story: X('每种动物有自己的本领', '鲸鱼和其他动物共享“大”“快”等特点，但自己的歌声也值得欣赏。不能只问谁最厉害。', '鲸鱼、鱼和大象各有不同本领。', '找共同，也找特别，别只争第一。', '听到别人有相同本领，你还可以怎样看自己？', ['寻找自己的其他优点', '说自己一无是处', '只比体重'], '寻找自己的其他优点', '故事的比较指向欣赏多样性。', 'animals-project'),
  },
  plants: {
    opening: X('人与植物互相帮助', '植物要空气、水和阳光；人照料它，植物能给人水果、阴凉和美丽环境。', '苹果树被照料后长出苹果。', '问“它需要什么”，也问“它给我们什么”。', '给果树浇水后，还能观察什么？', ['有没有新的叶和果实', '只看花盆价格', '只数同学'], '有没有新的叶和果实', '持续观察才能看见联系。', 'animals-opening'),
    a: X('Do you like 问喜好，不是测验', '回答 Yes / No 应根据自己的真实喜好；不喜欢某种水果仍可礼貌地说喜欢另一种。', 'No, I don’t. I like bananas。', '先答喜欢吗，再补喜欢什么。', '朋友喜欢橙子，你不喜欢，最礼貌的回答？', ["No, I don’t. I like apples.", 'Your choice is wrong.', 'How old is orange?'], "No, I don’t. I like apples.", '表达不同喜好不用否定对方。', 'animals-a'),
    letters: X('元音字母不是只在开头出现', 'O 在 orange 开头，也在 fox 中间；不能以“没在第一个”判断没有这个字母。', 'orange / fox 都有 o，位置不同。', '找字母头中尾，听音再比较。', 'fox 的 o 在哪里？', ['词中', '词首', '词尾'], '词中', '词形观察要覆盖不同位置。', 'animals-letters'),
    b: X('帮助植物要对应它的需要', 'We can water the flowers 是行动，但浇水要看植物和土壤状态；“越多越好”不是照料。', '花园干燥时给花浇适量水。', '先看需要，再做行动，做后观察。', '花盆泥土已经很湿，接下来最合适？', ['先观察，不再一直浇', '不停倒水', '用颜料替代阳光'], '先观察，不再一直浇', '懂得需要比机械重复动作更重要。', 'plants-opening'),
    read: X('读两条线：植物需要与植物给予', '短文前后分别写 Plants can give us ... 和 Plants need ...，读时可画双向箭头。', '我们给树水，树给我们苹果。', '一边看 need，一边看 give。', '“Trees give us apples.” 应放在关系图哪一边？', ['植物给人', '人给植物', '没有关系'], '植物给人', '双向图让短文更容易理解。', 'plants-b'),
    project: X('纸上花园要能解释因果', '卡片不是装饰：阳光、水、空气放“需要”，果实放“给予”，浇水、种树放“人做的事”。', '把 water 放需要侧，把 water the tree 放行动侧。', '名词说条件，动作说照料；卡片要有理由。', '“water the tree” 应放在哪一类？', ['我们帮助植物的行动', '水果名称', '家庭成员'], '我们帮助植物的行动', '项目可以用图解释人与植物如何互相帮助。', 'plants-read'),
    story: X('故事按时间看植物变化', '苹果树从小树到结果需要时间；冬天变冷时，照料方式也可能变化。', '先需要阳光和水，后来树长大并给果实。', '先种下，再照料，慢慢长，最后收获。', '如果只看故事最后一页，会漏掉什么？', ['照料和生长的过程', '苹果的英文', '所有颜色'], '照料和生长的过程', '阅读时跟着时间顺序观察因果。', 'plants-project'),
  },
  colours: {
    opening: X('颜色传递信息要看场景', '同一种颜色在花、颜料、交通信号中作用不同；看到红色要看它是在什么标志上。', '红花可让人欣赏，交通红灯可提醒停下。', '先看物体和场景，再说颜色意义。', '红色纸花和红色信号灯都表示“停”吗？', ['不一定，要看场景', '都一样', '颜色没有区别'], '不一定，要看场景', '颜色的意义不能脱离物体和标志。', 'plants-opening'),
    a: X('混色要观察，不只背答案', '书里红加蓝成紫、蓝加黄成绿；用可点击颜色板亲自混合，再把结果说成 It’s ...。', 'red + blue → purple。', '先猜颜色，动手混，再说 It’s ...。', '蓝色颜料和黄色颜料按教材例子混合，得到？', ['green', 'purple', 'red'], 'green', '混色适合先预测再验证。', 'colours-opening'),
    letters: X('Q 常和 u 成组出现', '教材把 Qq 和 u 放一起；quiet / queen 的起首常写 qu，不能只记一个孤立的 Q。', 'quiet、queen 都以 qu 开头。', '看见 qu，两个字母一起观察。', 'queen 的词首应选哪个组合？', ['qu', 'uq', 'qr'], 'qu', '词形中的字母组合比孤立字母更有用。', 'plants-letters'),
    b: X('问复数 colours 可以答多种', 'What colours do you like? 允许说 I like red and pink；喜欢的颜色不是只能选一种。', 'Sarah 喜欢 red and pink。', 'colour 问一种，colours 可说几种。', '朋友喜欢蓝和绿，最合适怎样说？', ['I like blue and green.', 'I like a ten yuan.', 'I have a pet.'], 'I like blue and green.', 'and 把两个喜好连起来。', 'colours-a'),
    read: X('安全提示不能只靠颜色', '教材用红/绿/黄/蓝提示行动；现实中还要看文字、图案与当地规则，不能把所有蓝色物体当可回收。', '黄色提醒 Be careful，红色灯提示 No。', '颜色是线索，标志和场景一起看。', '路口有黄色信号，应怎样做？', ['留意并小心', '闭眼冲过', '只看自己衣服颜色'], '留意并小心', '颜色帮助提示，但行动要结合标志。', 'colours-opening'),
    project: X('颜色小书把物品与表达连起来', '给香蕉贴 yellow 标签只是第一步，还要说 Bananas are yellow 并观察有没有例外。', '书页翻开物品，先猜颜色再揭示标签。', '看物品，读标签，说完整句。', '颜色小书出现黄鸭，介绍哪句最合适？', ['The duck is yellow.', 'The duck is six yuan.', 'The duck is my uncle.'], 'The duck is yellow.', '项目作品要能帮助表达，不只是涂色。', 'colours-b'),
    story: X('颜色会跟生命周期一起变化', '向日葵从绿到黄，后来出现棕色；颜色可帮助我们追踪不同阶段，但不能代替观察其他变化。', '黄花开放时蜜蜂来，冷时花变色。', '看颜色，也看发生了什么。', '向日葵变黄后故事出现了谁？', ['bees', 'cousins', 'lions'], 'bees', '把颜色和故事事件联系起来读。', 'plants-story'),
  },
  numbers: {
    opening: X('同一个数字有不同用途', '足球号码、年龄、价格、时间都能写数字；先找对象与单位再说意义。', '6 岁和 6 元不是同一件事。', '数字先看用途，再看单位。', '球衣写 7，能直接说球员 7 岁吗？', ['不能，可能是号码', '一定 7 岁', '一定 7 元'], '不能，可能是号码', '观察数字周围的信息才能解释。', 'colours-opening'),
    a: X('How old 与 How many 问不同信息', 'How old are you? 问年龄；How many ...? 问多少个物品。', 'Sam 回 I’m five years old，不是 five apples。', 'old 说年龄，many 数物品。', '想知道同学带几本书，要问？', ['How many books?', 'How old are you?', 'What colour is it?'], 'How many books?', '根据要知道的信息选问题。', 'numbers-opening'),
    letters: X('X 常在词尾，辨音不能只听首音', '前面单元多比词首音；本课教材还比较 x 的末尾音，如 box、six。TTS 可读整词，原录音用于准确辨音。', 'six 末尾 x，而 yellow 开头 y。', '词首词尾都找一找，原声再辨音。', 'box 和 six 哪个共同字母位于词尾？', ['x', 'y', 'z'], 'x', '要扩大到词尾位置观察。', 'colours-letters'),
    b: X('数量、价格与预算不一样', 'How many apples 问有几颗，ten yuan 表示钱；买东西要把数量和总价放在一起考虑。', '两颗苹果不是两元，需看价签。', '数个数，看价格，别把两种数混了。', '店里三根香蕉，每根两元，问“有几根”时回答？', ['Three.', 'Six yuan.', 'I am six.'], 'Three.', '数量问题不等于金额问题。', 'numbers-a'),
    read: X('奇数偶数可以两两配对', '教材 P69 提出 odd/even 分类；让数字对应实物两两配，全部配上为偶数，剩一个为奇数。', '6 个果子可以配成 3 对，7 个配完剩 1 个。', '两两配，没剩偶；剩一个，是奇数。', '9 个积木两两配好后会剩几个？', ['1 个', '0 个', '9 个'], '1 个', '操作解释 odd/even，不只背数字表。', 'families-read'),
    project: X('生日卡里的数字要带标签', '生日卡会写年龄和时间，两者不要混；分享前检查对象、日期/时间和祝福。', '“6 p.m.” 是聚会时间，“6 years old” 是年龄。', '先看词，再读数；卡上数字别串位。', '卡片写 “7 p.m.”，应把它放在哪一栏？', ['Party time', 'How old', 'Fruit count'], 'Party time', '真实卡片需要把信息放对位置。', 'numbers-read'),
    story: X('同一个数可以有多种符号', '故事用 6、six、VI、六和甲骨文展示同一数量；符号不同，指向的六张卡没有改变。', '数字 6 和汉字 六 都可以表示六。', '写法会变化，数量可相同。', '把六张卡的标签从 “6” 换成 “六”，卡片数会？', ['不变', '变成一张', '变成十张'], '不变', '符号代表数量，不改变实物。', 'numbers-opening'),
  },
};

export const ENGLISH_G3_REVISION_EXTENSIONS: Record<string, EnglishExtension> = {
  'guest-observe': X('做客时把表达连成真正对话', '介绍朋友、回应 Nice to meet you、收到礼物道谢是顺序相连的交往行为。', '先介绍 Mike，再回应家人问候，最后说 Thank you。', '先介绍，听回应，收礼道谢。', '进门见到主人，最先适合做什么？', ['问好并介绍同行朋友', '只说十元', '直接拿玩具'], '问好并介绍同行朋友', '综合复习要把不同单元的句子按场合连起来。', 'friends-a'),
  'guest-act': X('礼貌还包括放低声音', '朋友愿意分享时仍要照顾屋里其他人；Shh 可以提醒大家放低音量。', '一起玩动物玩具很兴奋，但有人休息就轻声。', '问好、分享、感谢，也留心他人。', '看到家人正在休息，玩具角色扮演怎么继续？', ['小声玩并尊重他人', '喊得更响', '把玩具收起来，不玩了'], '小声玩并尊重他人', '“好客人”是一组综合行动，不是一句口号。', 'guest-observe'),
};

export function getEnglishG3Extension(id: string): EnglishExtension | undefined {
  if (ENGLISH_G3_REVISION_EXTENSIONS[id]) return ENGLISH_G3_REVISION_EXTENSIONS[id];
  const index = id.lastIndexOf('-');
  if (index < 0) return undefined;
  return ENGLISH_G3_EXTENSIONS[id.slice(0, index)]?.[id.slice(index + 1) as EnglishSection];
}
