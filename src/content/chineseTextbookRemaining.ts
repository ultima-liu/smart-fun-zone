import type { ChineseQuestion, ChineseTaskStep, ChineseTextbookLesson, ChineseVisualClue } from './chineseTextbookCurriculum';
import { CHINESE_PINYIN_STUDY } from './chinesePinyinStudy';

const sourceArtwork = (page: number) => `/assets/chinese-textbook/source/p${String(page).padStart(3, '0')}.webp`;

const ORIGINAL_ARTWORK_BY_LESSON_ID: Record<string, string> = {
  'metal-wood-water-fire-earth': '/assets/chinese-textbook/lessons/metal-wood-water-fire-earth-v1.webp',
  'mouth-ear-eye-hand-foot': '/assets/chinese-textbook/lessons/mouth-ear-eye-hand-foot-v1.webp',
  'sun-moon-mountain-river': '/assets/chinese-textbook/lessons/sun-moon-mountain-river-v1.webp',
  'reading-is-joy': '/assets/chinese-textbook/lessons/reading-is-joy-v1.webp',
  autumn: '/assets/chinese-textbook/lessons/autumn-v1.webp',
  jiangnan: '/assets/chinese-textbook/lessons/jiangnan-v1.webp',
  'snow-painters': '/assets/chinese-textbook/lessons/snow-painters-v1.webp',
  'four-seasons': '/assets/chinese-textbook/lessons/four-seasons-v1.webp',
  'rhyme-song': '/assets/chinese-textbook/lessons/rhyme-song-v1.webp',
  'sun-moon-bright': '/assets/chinese-textbook/lessons/sun-moon-bright-v1.webp',
  'little-schoolbag': '/assets/chinese-textbook/lessons/little-schoolbag-v1.webp',
  'raising-flag': '/assets/chinese-textbook/lessons/raising-flag-v1.webp',
  'little-boat': '/assets/chinese-textbook/lessons/little-boat-v1.webp',
  shadow: '/assets/chinese-textbook/lessons/shadow-v1.webp',
  'two-treasures': '/assets/chinese-textbook/lessons/two-treasures-v1.webp',
  'compare-tails': '/assets/chinese-textbook/lessons/compare-tails-v1.webp',
  'crow-drinks-water': '/assets/chinese-textbook/lessons/crow-drinks-water-v1.webp',
  raindrops: '/assets/chinese-textbook/lessons/raindrops-v1.webp',
};

type LessonInput = Omit<ChineseTextbookLesson, 'artwork' | 'artworkSource'> & {
  sourcePage: number;
  originalArtwork?: string;
};

const lesson = ({ sourcePage, originalArtwork: customArtwork, ...input }: LessonInput): ChineseTextbookLesson => {
  const originalArtwork = customArtwork ?? ORIGINAL_ARTWORK_BY_LESSON_ID[input.id];
  return {
    ...input,
    artwork: originalArtwork ?? sourceArtwork(sourcePage),
    artworkSource: originalArtwork ? 'original' : 'textbook',
  };
};

const clue = (id: string, label: string, note: string, x: number, y: number): ChineseVisualClue => ({ id, label, note, x, y });
const step = (clueText: string, answer: string, options: string[]): ChineseTaskStep => ({ clue: clueText, answer, options });
const question = (questionText: string, options: string[], answer: number, explain: string): ChineseQuestion => ({ question: questionText, options, answer, explain });

type PinyinInput = {
  id: string;
  title: string;
  page: string;
  sourcePage: number;
  unit: string;
  letters: string[];
  syllables: string[];
  words: string[];
  reading: string;
};

const pinyinLesson = (input: PinyinInput): ChineseTextbookLesson => lesson({
  id: input.id,
  kind: 'pinyin',
  title: input.title,
  subtitle: `认清 ${input.letters.join('、')}，练习口形、声调和拼读`,
  page: input.page,
  sourcePage: input.sourcePage,
  unit: input.unit,
  eyebrow: '听音 · 辨形 · 拼读',
  teacherIntro: `先观察发音图和口形，听清 ${input.letters.join('、')}，再把声母、韵母和声调连成完整音节。`,
  artworkAlt: `${input.title}教材主题图，包含发音情境、字母字形和拼读示例`,
  observePrompt: '从教材主题图中依次发现发音情境、字母形状和拼读示例。',
  mission: `完成“听音辨字母—拼出音节—联系词义”三步任务。`,
  sourceLines: CHINESE_PINYIN_STUDY[input.id]?.readingLines ?? [input.reading],
  keywords: [...input.letters, ...(CHINESE_PINYIN_STUDY[input.id]?.recognize ?? input.words.slice(0, 2))],
  visualClues: [
    clue('sound-scene', '发音情境', '先借助画面记住发音，再慢慢脱离画面。', 28, 35),
    clue('letter-shape', '字母字形', `比较 ${input.letters.join('、')} 的占格和笔画方向。`, 52, 52),
    clue('pinyin-track', '拼读示例', `从左向右读出 ${input.syllables[0]}，不要把几个部分割裂开。`, 76, 69),
  ],
  taskSteps: [
    step('选出本课新学的字母组合。', input.letters.join(' '), [input.letters.join(' '), '上一课字母', '汉字笔画']),
    step(`把声音连起来，选出本课练习的音节。`, input.syllables[0], [input.syllables[0], input.syllables[1] ?? '不拼读', '只读声母']),
    step('拼读后联系教材图片，选出本课出现的词语。', input.words[0], [input.words[0], '无关图片', '只看颜色']),
  ],
  questions: [
    question(`哪一组是本课学习的字母？`, [input.letters.join('、'), '一、二、三', '天、地、人'], 0, `本课的学习重点是 ${input.letters.join('、')}。`),
    question('看到带声调的音节时，怎样读更准确？', ['看清字母和声调，再连起来读', '只猜图片', '跳过声调'], 0, '字母、口形和声调都要关注，最后连成自然的音节。'),
    question('拼出音节以后，还要做什么？', ['联系图片和词义', '只背字母名称', '把字母倒着读'], 0, '拼音最终要帮助我们认字、读词和理解意思。'),
  ],
});

type GardenInput = {
  id: string;
  title: string;
  page: string;
  sourcePage: number;
  unit: string;
  focus: string;
  lines: string[];
  keywords: string[];
  taskSteps: ChineseTaskStep[];
  questions: ChineseQuestion[];
};

const gardenLesson = (input: GardenInput): ChineseTextbookLesson => lesson({
  id: input.id,
  kind: 'garden',
  title: input.title,
  subtitle: input.focus,
  page: input.page,
  sourcePage: input.sourcePage,
  unit: input.unit,
  eyebrow: '整理 · 运用 · 积累',
  teacherIntro: `语文园地不是复习清单。先发现规律，再把规律用到新的字词、句子和表达中。本园地重点是：${input.focus}。`,
  artworkAlt: `${input.title}教材页面，包含识字、字词句运用和积累栏目`,
  observePrompt: '在页面中找到识字加油站、字词句运用和日积月累三个学习区。',
  mission: `用刚发现的规律完成一组综合任务：${input.focus}。`,
  sourceLines: input.lines,
  keywords: input.keywords,
  visualClues: [
    clue('station', '识字加油站', '从生活、事物关系或字形规律中主动识字。', 27, 31),
    clue('language-use', '字词句运用', '把字词放进比较、分类和说话任务中。', 55, 53),
    clue('accumulate', '日积月累', '听读、理解并积累诗句或常用表达。', 76, 72),
  ],
  taskSteps: input.taskSteps,
  questions: input.questions,
});

export const CHINESE_REMAINING_LESSONS: ChineseTextbookLesson[] = [
  lesson({
    id: 'metal-wood-water-fire-earth', kind: 'literacy', title: '金木水火土', subtitle: '从数字、天地和日月中认识“一二三四五、上下”', page: 'P9-P10', sourcePage: 9, originalArtwork: '/assets/chinese-textbook/lessons/metal-wood-water-fire-earth-v1.webp', unit: '第一单元 · 识字', eyebrow: '韵文识字 · 田字格',
    teacherIntro: '先跟着韵文数一数，再观察“上、下”的位置关系，最后认识田字格和横中线、竖中线。', artworkAlt: '金木水火土课文教材画面和一二三四五、上下的字形练习',
    observePrompt: '在画面和韵文中找到数字、天地、日月三组关系。', mission: '按课文顺序排好四句韵文，并判断物体的上下位置。',
    sourceLines: ['一二三四五，', '金木水火土。', '天地分上下，', '日月照今古。'], keywords: ['一', '二', '三', '四', '五', '上', '下'],
    visualClues: [clue('numbers', '一二三四五', '用熟悉的数量帮助记住五个数字汉字。', 28, 34), clue('world', '天地上下', '天空在上，大地在下。', 54, 51), clue('grid', '田字格', '横中线和竖中线帮助确定字的位置。', 75, 70)],
    taskSteps: [step('韵文的第一句是什么？', '一二三四五', ['一二三四五', '日月照今古', '天地分上下']), step('“天”在什么位置？', '上', ['上', '下', '中']), step('写字时帮助确定左右位置的是哪条线？', '竖中线', ['竖中线', '画外线', '随意线'])],
    questions: [question('“天地分上下”中，地在哪里？', ['下', '上', '天外'], 0, '我们脚下的是地，所以“地”对应“下”。'), question('哪一组都是数字汉字？', ['一、二、三', '天、地、日', '金、木、火'], 0, '一、二、三表示数量。'), question('田字格有什么作用？', ['帮助看清笔画位置', '把字涂满', '只用来画画'], 0, '田字格帮助初学者把字写得端正、匀称。')],
  }),
  lesson({
    id: 'mouth-ear-eye-hand-foot', kind: 'literacy', title: '口耳目手足', subtitle: '把身体部位、动作和汉字建立联系', page: 'P11-P12', sourcePage: 11, originalArtwork: '/assets/chinese-textbook/lessons/mouth-ear-eye-hand-foot-v1.webp', unit: '第一单元 · 识字', eyebrow: '看图识字 · 动作体验',
    teacherIntro: '先在人物图上指出口、耳、目、手、足，再用站、坐、行、卧做动作理解韵句。', artworkAlt: '人物身体部位图，标示口、耳、目、手、足并展示站坐姿势',
    observePrompt: '指一指人物的口、耳、目、手、足，再观察站和坐的姿势。', mission: '根据功能和动作，把身体部位与正确的汉字配对。',
    sourceLines: ['口　耳　目　手　足', '站如松，坐如钟。', '行如风，卧如弓。'], keywords: ['口', '耳', '目', '手', '足', '站', '坐'],
    visualClues: [clue('face', '口耳目', '嘴巴用来说和吃，耳朵用来听，眼睛用来看。', 34, 32), clue('limbs', '手和足', '手能拿，足能走。', 52, 55), clue('posture', '站和坐', '站立挺拔，坐姿端正。', 73, 70)],
    taskSteps: [step('用来听声音的是？', '耳', ['耳', '目', '足']), step('用来观察图画的是？', '目', ['手', '目', '口']), step('“站如松”提醒我们站得怎样？', '挺拔', ['挺拔', '歪斜', '趴下'])],
    questions: [question('拿铅笔主要用到哪个部位？', ['手', '耳', '足'], 0, '手可以拿、握和操作物品。'), question('“坐如钟”强调什么？', ['坐姿端正稳定', '跑得很快', '声音很响'], 0, '“如钟”形容坐得端正、稳当。'), question('“目”在这里表示什么？', ['眼睛', '耳朵', '脚'], 0, '“目”是眼睛的意思。')],
  }),
  lesson({
    id: 'sun-moon-mountain-river', kind: 'literacy', title: '日月山川', subtitle: '从图画演变中认识象形字', page: 'P13-P14', sourcePage: 13, originalArtwork: '/assets/chinese-textbook/lessons/sun-moon-mountain-river-v1.webp', unit: '第一单元 · 识字', eyebrow: '象形字 · 图字联想',
    teacherIntro: '把“日、月、山、川、水、火、田、禾”和画面一一比较，看看古人怎样把事物画成字。', artworkAlt: '日月山川水火田禾的实物图、古文字和现代汉字对照',
    observePrompt: '观察八种事物的轮廓，找出最像它们的汉字。', mission: '完成三组“实物图—古文字—现代汉字”的连线。',
    sourceLines: ['日　月', '山　川', '水　火', '田　禾'], keywords: ['日', '月', '山', '川', '水', '火', '田', '禾'],
    visualClues: [clue('sky-shapes', '日和月', '太阳圆，月亮弯，字形保留了明显特征。', 28, 31), clue('land-shapes', '山和川', '山峰有起伏，河川像流动的水道。', 54, 51), clue('field-shapes', '田和禾', '田有分块，禾有下垂的谷穗。', 75, 71)],
    taskSteps: [step('像一轮太阳的字是？', '日', ['日', '月', '山']), step('像连绵山峰的字是？', '山', ['川', '田', '山']), step('有田垄分格特征的字是？', '田', ['禾', '火', '田'])],
    questions: [question('象形字最初和什么有联系？', ['事物的样子', '字的读音长短', '纸张颜色'], 0, '象形字常从事物的外形提炼而来。'), question('哪一个字和庄稼有关？', ['禾', '月', '川'], 0, '“禾”的古字形像成熟的谷穗。'), question('看到陌生象形字，可以怎样猜意思？', ['观察字形像什么', '只数笔画', '随便猜'], 0, '观察轮廓和事物特征能帮助推测字义。')],
  }),
  gardenLesson({
    id: 'garden-1', title: '语文园地一', page: 'P15-P18', sourcePage: 15, unit: '第一单元 · 识字', focus: '数字识字、形近字比较、基本笔顺和口令倾听',
    lines: ['一片两片三四片，五片六片七八片。', '人—天　口—田　日—目', '笔顺规则：先横后竖，先撇后捺。', '《咏鹅》：鹅，鹅，鹅，曲项向天歌。', '口语交际：我说你做。'], keywords: ['六', '七', '八', '九', '十'],
    taskSteps: [step('“一片两片……”谜语说的是？', '雪花', ['雪花', '石头', '书包']), step('“十”的笔顺先写什么？', '横', ['横', '竖', '点']), step('听到两步口令时应该？', '听完整再按顺序做', ['听完整再按顺序做', '只做最后一步', '边说话边猜'])],
    questions: [question('“日”和“目”最需要比较什么？', ['字框里面的横画', '颜色', '读音长短'], 0, '观察细小的字形差别可以避免认错。'), question('别人发布动作口令时，首先要？', ['认真听', '抢着说', '背过身'], 0, '听清楚是完成口令的第一步。'), question('“先撇后捺”适合指导哪个字？', ['八', '十', '田'], 0, '“八”先写撇，再写捺。')],
  }),
  lesson({
    id: 'reading-is-joy', kind: 'reading', title: '读书真快乐', subtitle: '发现阅读的地点、伙伴和收获', page: 'P19', sourcePage: 19, originalArtwork: '/assets/chinese-textbook/lessons/reading-is-joy-v1.webp', unit: '第一单元 · 快乐读书吧', eyebrow: '选书 · 共读 · 分享',
    teacherIntro: '读书可以在家、学校和书店发生，也可以自己读、和家人读、和同伴分享。先找到自己最想读的一本。', artworkAlt: '孩子和家长共读、在书店选书并向同学讲故事的教材画面',
    observePrompt: '找出共读、选书、讲故事和借助拼音阅读四种场景。', mission: '为一次周末阅读安排选择合适的书、伙伴和分享方式。',
    sourceLines: ['我经常和爸爸妈妈一起读有趣的故事书。', '我读了很多书，会讲很多故事。', '周末，我在书店看到了很多好看的图画书。', '学了拼音，我就可以认更多的字，读更多的书了！'], keywords: ['读书', '故事', '图画书', '拼音'],
    visualClues: [clue('together', '和家人共读', '遇到不懂的地方可以一起讨论。', 27, 34), clue('choose', '在书店选书', '看封面和图画，挑自己感兴趣的书。', 54, 52), clue('share', '向同伴分享', '讲清人物和最有趣的情节。', 76, 71)],
    taskSteps: [step('想了解一本图画书，可以先看？', '封面和图画', ['封面和图画', '价格数字', '书架颜色']), step('遇到不认识的字可以？', '请教或借助拼音', ['请教或借助拼音', '立刻放弃', '把书合上']), step('读完后怎样让阅读更有收获？', '讲给别人听', ['讲给别人听', '忘掉内容', '只数页码'])],
    questions: [question('“故事大王”为什么会讲很多故事？', ['读了很多书', '只看封面', '从不分享'], 0, '广泛阅读会积累更多故事和表达素材。'), question('亲子共读时遇到疑问可以？', ['一起讨论', '谁也不说', '直接跳过整本书'], 0, '讨论能帮助理解，也让阅读更有趣。'), question('拼音对阅读有什么帮助？', ['帮助认读生字', '代替所有汉字', '只用来写数字'], 0, '拼音是初学阅读的重要工具。')],
  }),

  pinyinLesson({ id: 'pinyin-a-o-e', title: 'a o e', page: 'P20-P21', sourcePage: 20, unit: '第二单元 · 汉语拼音', letters: ['a', 'o', 'e'], syllables: ['ā á ǎ à', 'ō ó ǒ ò', 'ē é ě è'], words: ['阿姨', '白鹅'], reading: '张大嘴巴 a a a，圆圆嘴巴 o o o，扁扁嘴巴 e e e。' }),
  pinyinLesson({ id: 'pinyin-i-u-v', title: 'i u ü', page: 'P22-P23', sourcePage: 22, unit: '第二单元 · 汉语拼音', letters: ['i', 'u', 'ü'], syllables: ['ī í ǐ ì', 'ū ú ǔ ù', 'ǖ ǘ ǚ ǜ'], words: ['衣服', '乌龟', '小鱼'], reading: '牙齿对齐 i i i，嘴巴突出 u u u，吹起口哨 ü ü ü。' }),
  pinyinLesson({ id: 'pinyin-b-p-m-f', title: 'b p m f', page: 'P24-P25', sourcePage: 24, unit: '第二单元 · 汉语拼音', letters: ['b', 'p', 'm', 'f'], syllables: ['bā bá bǎ bà', 'pā pá pǎ pà', 'mā má mǎ mà'], words: ['爸爸', '妈妈'], reading: '声母轻短，韵母响亮，前音轻短后音重，两音相连猛一碰。' }),
  pinyinLesson({ id: 'pinyin-d-t-n-l', title: 'd t n l', page: 'P26-P27', sourcePage: 26, unit: '第二单元 · 汉语拼音', letters: ['d', 't', 'n', 'l'], syllables: ['dā dé dǔ dì', 'tā tè tǔ tí', 'ná nǚ lù'], words: ['大地', '马路', '泥土'], reading: '小白兔，穿皮袄，耳朵长，尾巴小。' }),
  gardenLesson({ id: 'garden-2', title: '语文园地二', page: 'P28-P31', sourcePage: 28, unit: '第二单元 · 汉语拼音', focus: '姓名识字、声调辨读、形近字母和拼音阅读', lines: ['本　学　校　班　级　姓　名　王', '读准声调：dǎ—dà，mā—má，bǐ—bì。', '比较字母：b—d，f—t。', '《画》：远看山有色，近听水无声。', '和大人一起读《小白兔和小灰兔》。'], keywords: ['本', '学校', '班级', '姓名', '王'], taskSteps: [step('个人信息卡上表示名字的是？', '姓名', ['姓名', '学校', '班级']), step('哪组字母容易因方向不同而认错？', 'b—d', ['b—d', 'a—o', 'm—n']), step('小白兔选择菜籽说明他想？', '自己劳动获得白菜', ['自己劳动获得白菜', '什么也不做', '只等别人送'])], questions: [question('读拼音时声调不同，读音会？', ['发生变化', '完全一样', '消失'], 0, '声调是汉语音节不可缺少的一部分。'), question('比较 b 和 d 应重点看？', ['半圆方向', '颜色', '大小'], 0, '字母的方向是辨形关键。'), question('《小白兔和小灰兔》更赞成哪种做法？', ['通过劳动获得收获', '只接受现成白菜', '不照料菜地'], 0, '故事说明劳动能带来持续的收获。')] }),

  pinyinLesson({ id: 'pinyin-g-k-h', title: 'g k h', page: 'P32-P33', sourcePage: 32, unit: '第三单元 · 汉语拼音', letters: ['g', 'k', 'h'], syllables: ['gā gé gǔ', 'kā kě kù', 'hā hé hǔ'], words: ['哥哥', '弟弟', '荷花'], reading: '小溪流说话哗哗，小鸽子说话咕咕，小青蛙说话呱呱。' }),
  pinyinLesson({ id: 'pinyin-j-q-x', title: 'j q x', page: 'P34-P35', sourcePage: 34, unit: '第三单元 · 汉语拼音', letters: ['j', 'q', 'x'], syllables: ['jī jiā jù', 'qī qiā qù', 'xī xiā xù'], words: ['打鼓', '下棋', '搭积木'], reading: '小黄鸡，小黑鸡，欢欢喜喜在一起；刨刨土，捉捉虫。' }),
  pinyinLesson({ id: 'pinyin-z-c-s', title: 'z c s', page: 'P36-P37', sourcePage: 36, unit: '第三单元 · 汉语拼音', letters: ['z', 'c', 's', 'zi', 'ci', 'si'], syllables: ['zā zé zǔ', 'cā cè cù', 'sā sè sù'], words: ['字', '词', '句子'], reading: '数学题，一道道，等号就像一座桥。想一想，算一算，快快乐乐过了桥。' }),
  pinyinLesson({ id: 'pinyin-zh-ch-sh-r', title: 'zh ch sh r', page: 'P38-P39', sourcePage: 38, unit: '第三单元 · 汉语拼音', letters: ['zh', 'ch', 'sh', 'r'], syllables: ['zhī zhá zhǔ', 'chī chá chū', 'shī shá shù'], words: ['擦桌子', '折纸', '读书'], reading: '四是四，十是十；十四是十四，四十是四十。' }),
  pinyinLesson({ id: 'pinyin-y-w', title: 'y w', page: 'P40-P41', sourcePage: 40, unit: '第三单元 · 汉语拼音', letters: ['y', 'w', 'yi', 'wu', 'yu'], syllables: ['yī yí yǐ yì', 'wū wú wǔ wù', 'yū yú yǔ yù'], words: ['鱼', '鸭子', '乌鸦'], reading: '一座房，两座房，青青的瓦，白白的墙；要数我们的小学堂。' }),
  gardenLesson({ id: 'garden-3', title: '语文园地三', page: 'P42-P44', sourcePage: 42, unit: '第三单元 · 汉语拼音', focus: '课程表识字、平翘舌比较、看图数数和动作儿歌', lines: ['午　星期　语文　数学　写字　班会', '比较：z—zh，c—ch，s—sh。', '说动作：刷牙、骑马、吃西瓜、拖地、理发、拔萝卜。', '图中找：鸡、鱼、河、一座山、一棵树。', '和大人一起读《谁会飞》。'], keywords: ['午', '星期', '语文', '数学', '班会'], taskSteps: [step('课程表可以帮助我们知道？', '每天上什么课', ['每天上什么课', '天气温度', '动物尾巴']), step('哪一组要比较平舌音和翘舌音？', 'z—zh', ['z—zh', 'a—o', 'b—p']), step('“谁会飞”中鸟怎样飞？', '扇扇翅膀', ['扇扇翅膀', '摇摇尾巴', '四脚腾空'])], questions: [question('看课程表时先确定什么？', ['星期和节次', '纸张颜色', '字的总数'], 0, '横看星期、竖看节次，才能找到对应课程。'), question('读“四只鸽子”要把哪个数量说清？', ['四只', '一座', '七朵'], 0, '量词和数量要与图中事物对应。'), question('《谁会飞》用什么方式介绍动物？', ['一问一答', '只列名字', '只写颜色'], 0, '问答形式让动物的运动特点更清楚。')] }),

  pinyinLesson({ id: 'pinyin-ai-ei-ui', title: 'ai ei ui', page: 'P45-P46', sourcePage: 45, unit: '第四单元 · 汉语拼音', letters: ['ai', 'ei', 'ui'], syllables: ['gāi cái hǎi', 'bēi péi fēi', 'duī tuǐ huì'], words: ['白菜', '西瓜', '水果'], reading: '排着队，向前走，做什么？去洗手。肥皂搓，清水冲，毛巾擦。' }),
  pinyinLesson({ id: 'pinyin-ao-ou-iu', title: 'ao ou iu', page: 'P47-P48', sourcePage: 47, unit: '第四单元 · 汉语拼音', letters: ['ao', 'ou', 'iu'], syllables: ['tiào shǎo zǎo', 'kǒu lóu zǒu', 'qiú liù niú'], words: ['小桥', '流水', '垂柳'], reading: '一只船，扬起帆，漂啊漂啊到台湾；伸出双手紧紧握。' }),
  pinyinLesson({ id: 'pinyin-ie-ve-er', title: 'ie üe er', page: 'P49-P50', sourcePage: 49, unit: '第四单元 · 汉语拼音', letters: ['ie', 'üe', 'er', 'ye', 'yue'], syllables: ['diē jiě xié', 'jué què xué', 'ěr ér'], words: ['梅花开', '雪花飘', '夜色美'], reading: '月儿弯弯挂蓝天，小溪弯弯出青山，大河弯弯流入海。' }),
  pinyinLesson({ id: 'pinyin-an-en-in-un-vn', title: 'an en in un ün', page: 'P51-P53', sourcePage: 51, unit: '第四单元 · 汉语拼音', letters: ['an', 'en', 'in', 'un', 'ün'], syllables: ['wān nán jiàn', 'mén rén zhēn', 'mín jīn xīn'], words: ['蓝天', '白云', '草原'], reading: '蓝天是白云的家，树林是小鸟的家，小河是鱼儿的家，祖国就是我们的家。' }),
  pinyinLesson({ id: 'pinyin-ang-eng-ing-ong', title: 'ang eng ing ong', page: 'P54-P55', sourcePage: 54, unit: '第四单元 · 汉语拼音', letters: ['ang', 'eng', 'ing', 'ong'], syllables: ['bāng qiáng chuáng', 'fēng děng', 'jīng míng qīng'], words: ['游泳', '滑冰', '自行车'], reading: '桥东走来一只羊，桥西走来一只羊；你也不肯让，我也不肯让。' }),
  gardenLesson({ id: 'garden-4', title: '语文园地四', page: 'P56-P59', sourcePage: 56, unit: '第四单元 · 汉语拼音', focus: '时间词、易混韵母、拼音总复习和生活分类', lines: ['上午—下午—晚上，昨天—今天—明天，去年—今年—明年。', '比较：ie—ei，iu—ui。', '秋游时想带什么？帽子、水壶、苹果、面包、望远镜……', '声母、韵母和整体认读音节总复习。', '《悯农》：谁知盘中餐，粒粒皆辛苦。'], keywords: ['晚', '昨', '今', '明', '年'], taskSteps: [step('“今天”的前一天是？', '昨天', ['昨天', '明天', '明年']), step('秋游物品中用来喝水的是？', '水壶', ['水壶', '望远镜', '雨伞']), step('“粒粒皆辛苦”提醒我们？', '珍惜粮食', ['珍惜粮食', '挑食浪费', '只看颜色'])], questions: [question('“上午—下午—晚上”是按什么排序？', ['一天中的时间', '物品大小', '地点远近'], 0, '这些词表示一天中不同的时间段。'), question('复习拼音表时为什么要分类？', ['分清声母、韵母和整体认读音节', '把字母变颜色', '只数数量'], 0, '分类能建立完整、清晰的拼音结构。'), question('准备秋游用品要考虑什么？', ['实际需要和天气', '越多越好', '只带玩具'], 0, '真实情境中要根据用途合理选择。')] }),

  lesson({ id: 'autumn', kind: 'reading', title: '秋天', subtitle: '从天气、树叶和大雁发现季节变化', page: 'P60-P61', sourcePage: 60, unit: '第五单元 · 阅读', eyebrow: '观察变化 · 自然段', teacherIntro: '先观察画面里天空、树叶和大雁的变化，再听读三个自然段，找出秋天到来的证据。', artworkAlt: '秋日蓝天、飘落的黄叶和向南飞的大雁教材画面', observePrompt: '找出天气、树叶和大雁三个秋天信号。', mission: '把三条秋天证据放进“看到—想到”的观察记录。', sourceLines: ['天气凉了，树叶黄了，一片片叶子从树上落下来。', '天那么蓝，那么高。一群大雁往南飞，一会儿排成个“人”字，一会儿排成个“一”字。', '啊！秋天来了！'], keywords: ['秋天', '树叶', '一片片', '大雁'], visualClues: [clue('leaves', '黄叶落下', '树叶由绿变黄，一片片飘落。', 29, 39), clue('sky', '蓝天高远', '秋天的天空显得又蓝又高。', 53, 31), clue('geese', '大雁南飞', '大雁排成不同队形飞向南方。', 76, 64)], taskSteps: [step('天气变凉，对应哪条观察？', '秋风来了', ['秋风来了', '盛夏更热', '春花开放']), step('“一片片”说明树叶？', '不止一片', ['不止一片', '只有一片', '没有落叶']), step('大雁队形会变成？', '人字和一字', ['人字和一字', '圆形和方形', '从不变化'])], questions: [question('判断秋天到来最可靠的做法是？', ['综合观察多种变化', '只看一种颜色', '随便猜'], 0, '天气、植物和动物的变化共同提供证据。'), question('自然段前面有什么明显特点？', ['开头空两格', '全部居中', '没有标点'], 0, '课本用开头空两格帮助辨认自然段。'), question('“啊！秋天来了！”表达怎样的心情？', ['发现秋天的惊喜', '生气', '害怕'], 0, '感叹号表现发现季节变化后的惊喜。')] }),
  lesson({ id: 'jiangnan', kind: 'reading', title: '江南', subtitle: '在莲叶与游鱼的方向变化中读出节奏', page: 'P62-P63', sourcePage: 62, unit: '第五单元 · 阅读', eyebrow: '古诗乐府 · 方位', teacherIntro: '先看连成一片的莲叶和穿行的小鱼，再随着东、西、南、北的方向移动来朗读。', artworkAlt: '江南荷塘中莲叶田田、鱼儿在叶间游动的教材画面', observePrompt: '找到莲叶、游鱼和东南西北四个游动方向。', mission: '根据鱼儿的位置，把东、西、南、北放到荷塘方向图。', sourceLines: ['江南可采莲，莲叶何田田。', '鱼戏莲叶间。', '鱼戏莲叶东，鱼戏莲叶西，', '鱼戏莲叶南，鱼戏莲叶北。'], keywords: ['江南', '采莲', '莲叶', '鱼', '东', '西', '南', '北'], visualClues: [clue('lotus', '层层莲叶', '“何田田”写出莲叶茂盛相连的样子。', 30, 35), clue('fish', '鱼儿嬉戏', '小鱼在莲叶之间灵活游动。', 54, 56), clue('directions', '四个方向', '东、西、南、北写出鱼儿到处游。', 76, 70)], taskSteps: [step('“何田田”主要写莲叶？', '茂盛相连', ['茂盛相连', '全部枯黄', '只有一片']), step('鱼儿在哪里游戏？', '莲叶间', ['莲叶间', '天空中', '山顶上']), step('选出一组相对方向。', '东和西', ['东和西', '东和南', '北和东'])], questions: [question('连续写东、西、南、北有什么效果？', ['表现鱼儿自由穿游', '说明鱼儿不动', '只介绍地图'], 0, '方向不断变化，让画面充满流动感。'), question('朗读后四句适合怎样处理？', ['节奏相近、方向词读清', '越快越好', '省略方向词'], 0, '相似句式形成节奏，方向词是变化重点。'), question('“鱼戏莲叶间”的“戏”可以理解为？', ['嬉戏游动', '写字', '睡觉'], 0, '这里写鱼儿在莲叶间快乐游动。')] }),
  lesson({ id: 'snow-painters', kind: 'reading', title: '雪地里的小画家', subtitle: '观察脚印形状，发现动物过冬秘密', page: 'P64-P65', sourcePage: 64, unit: '第五单元 · 阅读', eyebrow: '图形比较 · 科学观察', teacherIntro: '先猜雪地里的图案是谁留下的，再把动物脚印和竹叶、梅花、枫叶、月牙一一对应。', artworkAlt: '雪地里小鸡、小狗、小鸭、小马留下不同形状脚印的教材画面', observePrompt: '比较四种脚印，并找出没有来参加的青蛙。', mission: '为四位动物匹配脚印，再解释青蛙为什么缺席。', sourceLines: ['下雪啦，下雪啦！雪地里来了一群小画家。', '小鸡画竹叶，小狗画梅花，小鸭画枫叶，小马画月牙。', '不用颜料不用笔，几步就成一幅画。', '青蛙为什么没参加？他在洞里睡着啦。'], keywords: ['雪地', '小画家', '竹叶', '梅花', '枫叶', '月牙', '冬眠'], visualClues: [clue('tracks', '不同脚印', '脚掌结构不同，留下的形状也不同。', 31, 38), clue('animals', '四位画家', '小鸡、小狗、小鸭和小马都用脚作画。', 54, 54), clue('frog', '冬眠的青蛙', '青蛙在洞里冬眠，所以没有脚印。', 77, 70)], taskSteps: [step('小鸡的脚印像？', '竹叶', ['竹叶', '梅花', '月牙']), step('小马的脚印像？', '月牙', ['月牙', '枫叶', '竹叶']), step('青蛙没有参加是因为？', '正在冬眠', ['正在冬眠', '不会走路', '没有看到雪'])], questions: [question('动物为什么“不用颜料不用笔”？', ['脚印就是画', '它们不会画', '雪地有铅笔'], 0, '动物走过雪地留下脚印，像画出图案。'), question('从脚印能推测什么？', ['哪种动物来过', '天气一定很热', '动物会写字'], 0, '脚印是判断动物活动的重要线索。'), question('“下雪啦”重复两次表现？', ['看到雪的兴奋', '非常安静', '不知道下雪'], 0, '重复和感叹号加强了兴奋的语气。')] }),
  lesson({ id: 'four-seasons', kind: 'reading', title: '四季', subtitle: '让草芽、荷叶、谷穗和雪人说出季节', page: 'P66-P67', sourcePage: 66, unit: '第五单元 · 阅读', eyebrow: '角色朗读 · 仿说', teacherIntro: '草芽、荷叶、谷穗、雪人各自代表一个季节。观察它们的形状和动作，再分角色朗读。', artworkAlt: '春天草芽、夏天荷叶、秋天谷穗和冬天雪人的四季教材画面', observePrompt: '从四幅画中找出每个季节最有代表性的事物。', mission: '把季节、代表事物和形态词组成四张季节名片。', sourceLines: ['草芽尖尖，他对小鸟说：“我是春天。”', '荷叶圆圆，他对青蛙说：“我是夏天。”', '谷穗弯弯，他鞠着躬说：“我是秋天。”', '雪人大肚子一挺，他顽皮地说：“我就是冬天。”'], keywords: ['春天', '夏天', '秋天', '冬天', '尖尖', '圆圆', '弯弯'], visualClues: [clue('spring', '草芽尖尖', '嫩绿草芽代表春天的新生。', 22, 35), clue('summer', '荷叶圆圆', '圆圆荷叶在夏日池塘生长。', 44, 52), clue('autumn-winter', '谷穗与雪人', '成熟谷穗和雪人分别指向秋天、冬天。', 75, 68)], taskSteps: [step('“尖尖”形容的是？', '草芽', ['草芽', '荷叶', '雪人']), step('谷穗弯弯像在做什么？', '鞠躬', ['鞠躬', '飞翔', '游泳']), step('大肚子一挺的是？', '雪人', ['雪人', '小鸟', '青蛙'])], questions: [question('课文为什么让事物自己说话？', ['让季节特点更生动', '因为没有人物', '只为增加字数'], 0, '拟人的表达让四季特点像角色一样鲜明。'), question('仿照课文说秋叶，可以说？', ['秋叶黄黄，它说我是秋天', '秋叶会游泳', '秋叶是夏天的荷叶'], 0, '仿说要抓住事物特征并对应季节。'), question('哪组对应正确？', ['荷叶—夏天', '雪人—春天', '草芽—冬天'], 0, '荷叶在夏季生长最旺盛。')] }),
  gardenLesson({ id: 'garden-5', title: '语文园地五', page: 'P68-P72', sourcePage: 68, unit: '第五单元 · 阅读', focus: '反义词、季节分类、姓名识字和主动交朋友', lines: ['南—北，男—女，开—关，正—反，先—后，内—外。', '春天、夏天、秋天、冬天。', '从姓名卡、写字本中认识同学名字。', '一年之计在于春，一日之计在于晨。', '口语交际：交朋友；和大人一起读《拔萝卜》。'], keywords: ['男', '女', '开', '关', '正', '反', '先', '后'], taskSteps: [step('“开”的反义词是？', '关', ['关', '正', '先']), step('雪人应该放进哪个季节？', '冬天', ['冬天', '夏天', '春天']), step('第一次和同学交朋友，可以先？', '自我介绍并询问兴趣', ['自我介绍并询问兴趣', '不看对方', '只说自己的名字就走'])], questions: [question('“先—后”表示什么关系？', ['顺序相反', '颜色相同', '声音大小'], 0, '“先”和“后”表示相反的时间顺序。'), question('《拔萝卜》说明完成困难任务需要？', ['合作', '一个人逞强', '放弃'], 0, '人物一个接一个加入，合作终于解决问题。'), question('说话时看着对方眼睛有什么作用？', ['表示尊重和专注', '让声音变小', '代替所有语言'], 0, '自然的目光交流有助于建立友好关系。')] }),

  lesson({ id: 'rhyme-song', kind: 'literacy', title: '对韵歌', subtitle: '在自然景物的相对与相配中感受韵律', page: 'P73', sourcePage: 73, unit: '第六单元 · 识字', eyebrow: '对韵 · 景物关系', teacherIntro: '一边看云雨、花树、鸟虫、山水和柳桃，一边发现“什么对什么”的整齐节奏。', artworkAlt: '云雨花树鸟虫山水柳桃相映成趣的对韵歌教材画面', observePrompt: '在画面中找出五组相对或相配的自然景物。', mission: '补全三组对韵，并为新景物创作一组合理的“对”。', sourceLines: ['云对雨，雪对风。', '花对树，鸟对虫。', '山清对水秀，柳绿对桃红。'], keywords: ['云', '雨', '雪', '风', '花', '树', '鸟', '虫'], visualClues: [clue('weather', '云雨雪风', '天气景象两两相对。', 28, 33), clue('living', '花树鸟虫', '植物和动物构成自然画面。', 54, 53), clue('colors', '柳绿桃红', '颜色词让春景更鲜明。', 76, 70)], taskSteps: [step('“云”对什么？', '雨', ['雨', '虫', '桃']), step('“鸟”对什么？', '虫', ['虫', '风', '树']), step('“柳绿”对什么最整齐？', '桃红', ['桃红', '山高', '小鸟'])], questions: [question('对韵句读起来整齐，是因为？', ['结构相近、词语成对', '每句都很长', '没有停顿'], 0, '对应的词语和相近结构形成节奏。'), question('“山清对水秀”描写什么？', ['山水景色优美', '教室物品', '动物叫声'], 0, '“清、秀”共同描绘秀美山水。'), question('下面哪组适合组成新对韵？', ['日对月', '书对跑', '红对桌'], 0, '日和月同属天空中的自然景物，关系清楚。')] }),
  lesson({ id: 'sun-moon-bright', kind: 'literacy', title: '日月明', subtitle: '拆一拆、合一合，理解会意字', page: 'P74-P75', sourcePage: 74, unit: '第六单元 · 识字', eyebrow: '会意字 · 合作含义', teacherIntro: '把熟悉的字合在一起，猜猜新字的意思：日和月为什么是“明”，三个人为什么是“众”？', artworkAlt: '日月明、双木林、三木森等会意字组合关系教材画面', observePrompt: '找到“部件合起来，意思也合起来”的会意字规律。', mission: '拖合字形部件，组成“明、尘、众、林、森”，并说出推理理由。', sourceLines: ['日月明，田力男。小大尖，小土尘。', '二人从，三人众。双木林，三木森。', '一人不成众，独木不成林。', '众人一条心，黄土变成金。'], keywords: ['明', '男', '尖', '尘', '从', '众', '林', '森'], visualClues: [clue('combine', '日月成明', '两个熟悉部件共同提示新字意思。', 28, 34), clue('more', '木多成林森', '一个木、两个木、三个木表达数量变化。', 55, 53), clue('team', '众人一条心', '字形规律也连接到合作含义。', 76, 70)], taskSteps: [step('“日”和“月”合成？', '明', ['明', '林', '尘']), step('三个“木”组成？', '森', ['森', '林', '众']), step('“众人一条心”强调？', '团结合作', ['团结合作', '独自离开', '比较高低'])], questions: [question('猜“泪”的意思，可以看哪两个部件？', ['水和目', '日和月', '田和力'], 0, '眼睛里的水就是泪，会意部件提供了线索。'), question('“独木不成林”说明？', ['许多树木才成树林', '一棵树就是森林', '木和林无关'], 0, '字形数量变化和真实事物数量相联系。'), question('学习会意字最有用的方法是？', ['分析部件之间的意义', '只背总笔画', '只看颜色'], 0, '理解部件关系比机械记忆更牢固。')] }),
  lesson({ id: 'little-schoolbag', kind: 'literacy', title: '小书包', subtitle: '认识学习用品，练习独立整理', page: 'P76-P77', sourcePage: 76, unit: '第六单元 · 识字', eyebrow: '生活识字 · 整理实践', teacherIntro: '先认一认橡皮、尺子、作业本、笔袋、铅笔和转笔刀，再真正整理一次书包。', artworkAlt: '橡皮尺子作业本笔袋铅笔转笔刀和小书包教材画面', observePrompt: '找全六种学习用品，并观察它们适合放在书包哪里。', mission: '按照“大本子靠后、小物品进笔袋、常用物品易取”的规则整理书包。', sourceLines: ['我的小书包，宝贝真不少。', '课本作业本，铅笔转笔刀。', '天天起得早，陪我去学校。'], keywords: ['书包', '橡皮', '尺子', '作业本', '笔袋', '铅笔'], visualClues: [clue('tools', '六种学习用品', '认清名称和用途，避免漏带。', 28, 34), clue('bag', '书包分区', '不同大小物品放进合适区域。', 55, 53), clue('tidy', '摆放整齐', '整齐能让取放更快，也保护用品。', 76, 70)], taskSteps: [step('铅笔和橡皮最好放进？', '笔袋', ['笔袋', '水杯袋', '书包外面']), step('大课本适合？', '平整放入主袋', ['平整放入主袋', '揉成一团', '挂在拉链上']), step('整理完成后还要？', '按课程检查是否带齐', ['按课程检查是否带齐', '立刻全部倒出', '只看书包颜色'])], questions: [question('课文把学习用品叫“宝贝”说明？', ['要爱护学习用品', '它们都是玩具', '越贵越好'], 0, '学习用品陪伴学习，应该珍惜并保管好。'), question('自己整理书包能培养？', ['独立和有序的习惯', '拖延习惯', '依赖别人'], 0, '亲自整理能增强责任感和生活能力。'), question('第二天有美术课，整理时应？', ['根据课程表补充美术用品', '什么都不变', '只带玩具'], 0, '整理书包要联系第二天的真实课程需要。')] }),
  lesson({ id: 'raising-flag', kind: 'literacy', title: '升国旗', subtitle: '在升旗仪式中理解立正与敬礼', page: 'P78-P79', sourcePage: 78, unit: '第六单元 · 识字', eyebrow: '仪式观察 · 节奏朗读', teacherIntro: '观察国旗怎样徐徐升起，同学怎样立正敬礼，再用庄重、清楚的语气朗读。', artworkAlt: '校园升旗仪式中五星红旗升起、学生立正敬礼的教材画面', observePrompt: '找出国旗、升起的方向、立正姿势和敬礼动作。', mission: '按真实升旗流程排列“集合—立正—升旗—敬礼”。', sourceLines: ['五星红旗，我们的国旗。', '国歌声中，徐徐升起。', '迎风飘扬，多么美丽。', '向着国旗，我们立正。', '望着国旗，我们敬礼。'], keywords: ['国旗', '五星红旗', '升起', '立正', '敬礼'], visualClues: [clue('flag', '五星红旗', '认清国旗的颜色和五星。', 30, 31), clue('rise', '徐徐升起', '旗帜沿旗杆缓缓向上。', 55, 50), clue('respect', '立正敬礼', '面向国旗，姿态庄重。', 77, 70)], taskSteps: [step('升旗仪式开始前先？', '整齐集合', ['整齐集合', '自由跑动', '背对旗杆']), step('国歌响起时应该？', '立正面向国旗', ['立正面向国旗', '继续聊天', '坐在地上']), step('“徐徐”表示？', '缓慢而庄重', ['缓慢而庄重', '突然落下', '快速旋转'])], questions: [question('课文连续写立正、敬礼是为了？', ['表现对国旗的尊重', '介绍体育动作', '比较身高'], 0, '规范姿态表达对国旗和国家的尊重。'), question('朗读这篇课文适合什么语气？', ['庄重清楚', '嬉笑随意', '越来越轻听不见'], 0, '内容与升旗仪式有关，应读得庄重、清楚。'), question('“迎风飘扬”描写的是？', ['国旗在风中的样子', '同学跑步', '树叶落下'], 0, '迎风飘扬写旗帜随风展开的状态。')] }),
  gardenLesson({ id: 'garden-6', title: '语文园地六', page: 'P80-P83', sourcePage: 80, unit: '第六单元 · 识字', focus: '场所与职业、偏旁归类、路牌识字和看图表达', lines: ['学校—老师，工厂—工人，医院—医生，传达室—门卫。', '木字旁：树、林、桃、桥；草字头：花、草、莲、菜。', '从路牌、商店招牌等生活环境中识字。', '笔顺规则：从上到下，从左到右。', '《古朗月行》：小时不识月，呼作白玉盘。'], keywords: ['老师', '工厂', '医生', '门卫', '树', '花'], taskSteps: [step('医院里为病人诊治的是？', '医生', ['医生', '门卫', '工人']), step('“桃、桥、林”共同的偏旁是？', '木字旁', ['木字旁', '草字头', '口字旁']), step('看到陌生路牌，可以怎样识字？', '联系地点和图标推测', ['联系地点和图标推测', '闭眼猜', '只数颜色'])], questions: [question('许多木字旁的字为什么和树木有关？', ['偏旁提示字义类别', '它们读音相同', '笔画一样多'], 0, '偏旁常能提示汉字意义所属的范围。'), question('看图写话先要观察？', ['谁在什么地方做什么', '只看边框', '只写一个字'], 0, '人物、地点和动作是把画面说完整的基本信息。'), question('生活识字的好地方包括？', ['路牌和商店招牌', '只有语文书', '只有考试卷'], 0, '生活环境中处处都有真实、有意义的文字。')] }),

  lesson({ id: 'little-boat', kind: 'reading', title: '小小的船', subtitle: '在月亮船的想象中感受叠词和画面', page: 'P84-P85', sourcePage: 84, unit: '第七单元 · 阅读', eyebrow: '想象 · 叠词', teacherIntro: '先观察弯月为什么像小船，再闭眼听读，想象自己坐在月亮船里看见什么。', artworkAlt: '弯弯月亮像小船，孩子坐在月亮上仰望星空的教材画面', observePrompt: '找出弯月的两头、闪闪星星和蓝蓝天空。', mission: '为月儿、船、星星、天空选择最贴切的叠词，并组成自己的星空句。', sourceLines: ['弯弯的月儿小小的船，小小的船儿两头尖。', '我在小小的船里坐，只看见闪闪的星星蓝蓝的天。'], keywords: ['弯弯', '小小', '两头尖', '闪闪', '蓝蓝'], visualClues: [clue('moon', '弯弯月儿', '弯月两头尖，形状像小船。', 29, 35), clue('child', '坐进小船', '想象把天空中的月亮变成可以乘坐的小船。', 55, 54), clue('stars', '闪闪星星', '叠词让星光和天空特点更鲜明。', 77, 69)], taskSteps: [step('月儿是什么样的？', '弯弯的', ['弯弯的', '方方的', '厚厚的']), step('星星怎样？', '闪闪的', ['闪闪的', '弯弯的', '长长的']), step('月儿像船是因为？', '弯弯且两头尖', ['弯弯且两头尖', '会在水上开', '有船桨'])], questions: [question('“小小的”重复出现有什么作用？', ['突出月亮船小巧可爱', '表示船很重', '说明没有星星'], 0, '叠词营造轻柔、亲切的想象画面。'), question('课文中的“船”实际指？', ['弯弯的月亮', '真正的轮船', '纸船'], 0, '诗歌把弯月想象成小船。'), question('照样子形容白云，哪句合适？', ['软软的白云', '白云的桌子', '白云会写字'], 0, '叠词可以抓住事物特点进行生动描写。')] }),
  lesson({ id: 'shadow', kind: 'reading', title: '影子', subtitle: '用光源实验理解前后左右', page: 'P86-P87', sourcePage: 86, unit: '第七单元 · 阅读', eyebrow: '方位 · 光影实验', teacherIntro: '观察太阳、人物和影子的位置，转动方向看看影子怎样跑到前、后、左、右。', artworkAlt: '阳光下孩子与影子在前后左右变化的教材画面', observePrompt: '找出光从哪里来、影子落在哪里以及人物的朝向。', mission: '移动光源方向，判断影子会出现在人物的前、后、左还是右。', sourceLines: ['影子在前，影子在后，影子常常跟着我，就像一条小黑狗。', '影子在左，影子在右，影子常常陪着我，它是我的好朋友。'], keywords: ['影子', '前', '后', '左', '右', '小黑狗'], visualClues: [clue('light', '光的方向', '影子总在光源相反的一侧。', 28, 32), clue('position', '前后左右', '人物转身后，相对方位也会变化。', 54, 53), clue('shape', '像小黑狗', '影子跟随动作，像一直陪伴的小伙伴。', 77, 70)], taskSteps: [step('太阳在人物前方，影子通常在？', '后方', ['后方', '前方', '头顶']), step('人物转身后，前后会？', '跟着朝向改变', ['跟着朝向改变', '永远不变', '全部消失']), step('课文把影子比作？', '小黑狗', ['小黑狗', '小白兔', '小书包'])], questions: [question('为什么说影子“常常跟着我”？', ['人物移动时影子也随之变化', '影子会说话', '影子是动物'], 0, '光照下人物位置和动作变化，影子也跟着变化。'), question('判断左右最稳妥的方法是？', ['先确定自己面对的方向', '只看别人', '闭眼判断'], 0, '左右是相对于观察者朝向确定的。'), question('没有光时还能看到清楚影子吗？', ['通常不能', '一定更清楚', '影子会发光'], 0, '影子由物体遮挡光线形成。')] }),
  lesson({ id: 'two-treasures', kind: 'reading', title: '两件宝', subtitle: '让双手操作，让大脑思考', page: 'P88-P89', sourcePage: 88, unit: '第七单元 · 阅读', eyebrow: '思考 · 实践 · 创造', teacherIntro: '双手和大脑各有本领，更重要的是一起合作。通过一个搭建任务体验“先想再做、边做边改”。', artworkAlt: '孩子用双手搭建并动脑思考解决问题的教材画面', observePrompt: '观察双手在做什么、大脑在想什么，以及作品怎样被改进。', mission: '先选计划，再动手搭建，遇到不稳时根据原因调整。', sourceLines: ['人有两件宝，双手和大脑。', '双手会做工，大脑会思考。', '用手不用脑，事情做不好。', '用脑不用手，啥也办不到。', '用手又用脑，才能有创造。'], keywords: ['双手', '大脑', '做工', '思考', '创造'], visualClues: [clue('hands', '双手操作', '手可以拿、摆、连接和制作。', 28, 36), clue('brain', '大脑思考', '先观察问题，再计划解决办法。', 53, 51), clue('create', '手脑合作', '实际操作会产生新问题，需要继续思考调整。', 76, 70)], taskSteps: [step('开始搭建前先应该？', '想清目标和步骤', ['想清目标和步骤', '随手乱放', '等别人完成']), step('搭好后总倒塌，应该？', '观察原因并调整结构', ['观察原因并调整结构', '重复同样做法', '立刻放弃']), step('“创造”最需要？', '动手和动脑合作', ['动手和动脑合作', '只想不做', '只做不想'])], questions: [question('为什么“用脑不用手，啥也办不到”？', ['想法需要通过行动验证和实现', '大脑没有用', '双手会自己想'], 0, '实践能把想法变成结果，也能检验想法。'), question('做手工时剪错了，合理做法是？', ['分析原因并调整下一步', '继续乱剪', '责怪工具'], 0, '手脑合作包括观察反馈、修正计划。'), question('课文中的“两件宝”是？', ['双手和大脑', '书包和铅笔', '太阳和月亮'], 0, '课文开头直接指出人有双手和大脑两件宝。')] }),
  gardenLesson({ id: 'garden-7', title: '语文园地七', page: 'P90-P94', sourcePage: 90, unit: '第七单元 · 阅读', focus: '家人称谓、时间偏旁、方向判断和合适音量', lines: ['爷爷、奶奶、姥爷、姥姥、叔叔、姑姑、舅舅、姨妈。', '“日”常和时间有关：“明、晚、昨”。', '早晨起来，面向太阳。前面是东，后面是西，左面是北，右面是南。', '口语交际：用多大的声音说话。', '和大人一起读《猴子捞月亮》。'], keywords: ['爷爷', '奶奶', '叔叔', '姐姐', '妹妹'], taskSteps: [step('妈妈的妈妈可以称为？', '姥姥', ['姥姥', '叔叔', '哥哥']), step('早晨面向太阳，左面是？', '北', ['北', '南', '西']), step('图书馆里说话应该？', '轻声且让对方听清', ['轻声且让对方听清', '大声喊叫', '完全不回应'])], questions: [question('“明、晚、昨”都含日字旁，说明它们多和？', ['时间有关', '动物有关', '食物有关'], 0, '日字旁常提示与太阳、日期或时间相关。'), question('猴子为什么误以为月亮掉进井里？', ['把水中倒影当成月亮', '月亮真的落下', '井里有灯'], 0, '故事提醒我们先观察、验证，再下结论。'), question('什么时候需要适当提高音量？', ['面向全班讲故事', '在阅览室交谈', '同桌近距离交流'], 0, '面对多人发言要让大家听清，同时仍要自然。')] }),

  lesson({ id: 'compare-tails', kind: 'reading', title: '比尾巴', subtitle: '在问答儿歌中比较动物尾巴特点', page: 'P95-P96', sourcePage: 95, unit: '第八单元 · 阅读', eyebrow: '比较 · 问答', teacherIntro: '先只看尾巴猜动物，再把长、短、弯、扁、像伞和最好看这些特点逐一验证。', artworkAlt: '猴子兔子松鼠公鸡鸭子孔雀展示不同尾巴的教材画面', observePrompt: '比较六种动物尾巴的长度、形状和外观。', mission: '根据尾巴局部图猜动物，并仿照课文完成一问一答。', sourceLines: ['谁的尾巴长？谁的尾巴短？谁的尾巴好像一把伞？', '猴子的尾巴长。兔子的尾巴短。松鼠的尾巴好像一把伞。', '谁的尾巴弯？谁的尾巴扁？谁的尾巴最好看？', '公鸡的尾巴弯。鸭子的尾巴扁。孔雀的尾巴最好看。'], keywords: ['尾巴', '长', '短', '一把伞', '弯', '扁'], visualClues: [clue('length', '长和短', '猴子和兔子的尾巴形成明显对比。', 28, 36), clue('shape', '弯和扁', '公鸡与鸭子的尾巴形状不同。', 53, 53), clue('like', '像一把伞', '松鼠蓬松的大尾巴可以用比喻描述。', 77, 69)], taskSteps: [step('尾巴长的是？', '猴子', ['猴子', '兔子', '鸭子']), step('尾巴像一把伞的是？', '松鼠', ['松鼠', '公鸡', '猴子']), step('尾巴扁的是？', '鸭子', ['鸭子', '孔雀', '兔子'])], questions: [question('这首儿歌主要用什么结构？', ['先问后答', '按时间讲故事', '只写景色'], 0, '问题和答案一一对应，适合合作朗读。'), question('“好像一把伞”是什么表达？', ['把尾巴和伞作比较', '真的拿着伞', '说明尾巴会下雨'], 0, '相似形状的比较让描写更形象。'), question('介绍新动物尾巴时应先观察？', ['长度、形状和特点', '动物名字字数', '背景颜色'], 0, '抓住可观察特征才能进行准确比较。')] }),
  lesson({ id: 'crow-drinks-water', kind: 'reading', title: '乌鸦喝水', subtitle: '观察条件变化，理解解决问题的过程', page: 'P97-P98', sourcePage: 97, unit: '第八单元 · 阅读', eyebrow: '问题解决 · 因果', teacherIntro: '先明确困难：水少、瓶口小、嘴够不到。再观察乌鸦怎样利用小石子让水面升高。', artworkAlt: '乌鸦把小石子一颗颗放进窄口瓶使水面升高的教材画面', observePrompt: '找出瓶口、水位、小石子和乌鸦嘴四个关键条件。', mission: '模拟逐颗放石子，观察水位变化，并判断哪些材料真的有用。', sourceLines: ['一只乌鸦口渴了，到处找水喝。', '乌鸦看见一个瓶子，瓶子里有水。但是，瓶子里水不多，瓶口又小，乌鸦喝不着水。', '乌鸦看见旁边有许多小石子，想出办法来了。', '乌鸦把小石子一颗一颗地放进瓶子里。瓶子里的水渐渐升高，乌鸦就喝着水了。'], keywords: ['乌鸦', '瓶子', '小石子', '一颗一颗', '渐渐升高'], visualClues: [clue('problem', '瓶口小、水位低', '先看清问题条件，才知道办法是否可行。', 29, 35), clue('stones', '许多小石子', '石子能占据瓶中空间，让水面上升。', 53, 54), clue('change', '水渐渐升高', '一颗一颗投入，水位持续变化。', 77, 69)], taskSteps: [step('乌鸦喝不到水的关键原因是？', '瓶口小且水位低', ['瓶口小且水位低', '瓶子没有水', '乌鸦不口渴']), step('应该选择什么放入瓶中？', '能放进瓶口的小石子', ['能放进瓶口的小石子', '大树枝', '棉花']), step('石子放入后水位会？', '渐渐升高', ['渐渐升高', '立刻消失', '越来越低'])], questions: [question('乌鸦想到办法前先做了什么？', ['观察周围条件', '马上离开', '打破瓶子'], 0, '发现旁边的小石子，是形成办法的关键。'), question('“一颗一颗”说明？', ['动作连续而有顺序', '只放一颗', '同时倒入很多水'], 0, '逐颗投入与“渐渐升高”形成清楚的过程。'), question('如果瓶口很宽、乌鸦直接够到水，还需要放石子吗？', ['不需要', '一定需要', '石子越多越好'], 0, '解决办法应根据实际问题条件选择。')] }),
  lesson({ id: 'raindrops', kind: 'reading', title: '雨点儿', subtitle: '分角色朗读，发现雨水让环境发生变化', page: 'P99-P100', sourcePage: 99, unit: '第八单元 · 阅读', eyebrow: '对话 · 变化', teacherIntro: '先分清大雨点儿和小雨点儿想去哪里，再比较下雨前后两处地方发生了什么变化。', artworkAlt: '大雨点儿和小雨点儿从云彩落下，让不同地方开花长草的教材画面', observePrompt: '找出两个雨点儿、两处不同环境和下雨后的变化。', mission: '为大雨点儿和小雨点儿选择目的地，并把“原来—后来”的环境图排好。', sourceLines: ['数不清的雨点儿，从云彩里落下来。', '大雨点儿问小雨点儿：“你要到哪里去？”', '小雨点儿回答：“我要去有花有草的地方。你呢？”', '大雨点儿说：“我要去没有花没有草的地方。”', '不久，有花有草的地方，花更红了，草更绿了。没有花没有草的地方，开出了红的花，长出了绿的草。'], keywords: ['雨点儿', '云彩', '回答', '地方', '不久', '更红', '更绿'], visualClues: [clue('characters', '大小雨点儿', '根据问和答分清两个说话角色。', 28, 34), clue('places', '两处地方', '一处已有花草，一处还没有花草。', 54, 53), clue('changes', '花红草绿', '雨水到来后，两处环境都发生变化。', 77, 70)], taskSteps: [step('小雨点儿要去哪里？', '有花有草的地方', ['有花有草的地方', '没有花草的地方', '回到云里']), step('大雨点儿要去哪里？', '没有花没有草的地方', ['没有花没有草的地方', '屋顶', '小河里']), step('下雨后没有花草的地方怎样？', '开花并长出绿草', ['开花并长出绿草', '更加干旱', '什么也没变'])], questions: [question('分角色朗读时怎样让听者分清角色？', ['结合提示语读出问答语气', '两个人完全同样读', '省略所有对话'], 0, '问句、回答和人物提示共同帮助区分角色。'), question('“更红、更绿”中的“更”说明？', ['在原有基础上变化得更明显', '颜色消失', '刚刚开始下雨'], 0, '已有花草的地方得到雨水后变得更加鲜艳。'), question('课文表现雨水有什么作用？', ['滋润植物生长', '让花草消失', '把云彩变成石头'], 0, '两处环境的变化都说明雨水滋润生命。')] }),
  gardenLesson({ id: 'garden-8', title: '语文园地八', page: 'P101-P104', sourcePage: 101, unit: '第八单元 · 阅读', focus: '拆字识字、一词多义、新年祝福和大胆想办法', lines: ['拆字组合：牛、羊、只、爪、叶、花、口、作、元、拼、音、巴、白。', '比较词义：果皮—树皮，加法—办法，回来—回答，到处—四处，方向—地方。', '给家人或朋友写一句新年祝福。', '笔顺规则：先外后内，先中间后两边。', '口语交际：我会想办法；和大人一起读《春节童谣》。'], keywords: ['牛', '羊', '爪', '元', '拼音', '办法'], taskSteps: [step('“果皮”和“树皮”的“皮”共同表示？', '外面的一层', ['外面的一层', '一种颜色', '一个动作']), step('给朋友写新年祝福，应包含？', '称呼和真诚祝愿', ['称呼和真诚祝愿', '只有标点', '无关数字']), step('小兔运南瓜，先应观察？', '南瓜形状和道路条件', ['南瓜形状和道路条件', '南瓜有几个字', '天空颜色'])], questions: [question('同一个字在不同词里可能？', ['意思有联系也可能不同', '永远只有一个意思', '没有意思'], 0, '比较词语能帮助发现字义之间的联系和变化。'), question('“我会想办法”最看重什么？', ['根据条件提出可行方案', '只说一个答案', '模仿别人不思考'], 0, '解决问题要观察条件、提出方案并说明理由。'), question('《春节童谣》按什么推进？', ['腊八到春节的时间顺序', '地点远近', '人物年龄'], 0, '童谣用日期和年俗串起春节前后的生活。')] }),
];
