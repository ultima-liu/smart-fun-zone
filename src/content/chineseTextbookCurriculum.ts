import { CHINESE_REMAINING_LESSONS } from './chineseTextbookRemaining';

export type ChineseLessonId = string;

export type ChineseLessonKind = 'orientation' | 'literacy' | 'pinyin' | 'reading' | 'garden';

export type ChineseVisualClue = { id: string; label: string; note: string; x: number; y: number };

export type ChineseTaskStep = { clue: string; answer: string; options: string[] };

export type ChineseQuestion = {
  question: string;
  options: string[];
  answer: number;
  explain: string;
};

export type ChineseTextbookLesson = {
  id: ChineseLessonId;
  kind?: ChineseLessonKind;
  title: string;
  subtitle: string;
  page: string;
  unit: string;
  eyebrow: string;
  teacherIntro: string;
  artwork: string;
  artworkAlt: string;
  artworkSource?: 'original' | 'textbook';
  observePrompt: string;
  mission: string;
  sourceLines: string[];
  keywords: string[];
  visualClues?: ChineseVisualClue[];
  taskSteps?: ChineseTaskStep[];
  questions: ChineseQuestion[];
};

const CHINESE_INITIAL_LESSONS: ChineseTextbookLesson[] = [
  {
    id: 'china',
    kind: 'orientation',
    title: '我是中国人',
    subtitle: '认识国旗、天安门和中华民族大家庭',
    page: 'P2-P3',
    unit: '我上学了',
    eyebrow: '观察 · 表达 · 认同',
    teacherIntro: '先观察画面里的人、建筑和国旗，再听一听、读一读，用自己的话介绍“我是中国人”。',
    artwork: '/assets/chinese-textbook/china-family-v1.webp',
    artworkSource: 'original',
    artworkAlt: '各民族小朋友手拉手站在天安门广场，五星红旗在身后飘扬',
    observePrompt: '依次发现五星红旗、北京天安门和各民族小朋友。',
    mission: '把“中华民族是一家”按意思拼成完整句子。',
    sourceLines: ['我是中国人。', '我们都是中国人。', '中华民族是一家。'],
    keywords: ['中国人', '我们', '中华民族', '一家'],
    questions: [
      { question: '画面中的小朋友虽然服饰不同，他们共同是什么人？', options: ['中国人', '只是一所学校的人', '只有穿红衣服的人'], answer: 0, explain: '服饰和民族可以不同，但大家都是中国人。' },
      { question: '“中华民族是一家”想告诉我们什么？', options: ['大家团结在一起', '大家必须穿一样的衣服', '只介绍一个小朋友'], answer: 0, explain: '“一家”表达的是共同、团结和亲近。' },
      { question: '向新朋友介绍自己，哪句话最完整？', options: ['我是中国人，我叫小星。', '我。', '红色。'], answer: 0, explain: '完整介绍要把“我是谁”说清楚。' },
    ],
  },
  {
    id: 'motherland',
    kind: 'orientation',
    title: '我爱我们的祖国',
    subtitle: '五星红旗、北京天安门、长江和黄河',
    page: 'P4-P5',
    unit: '我上学了',
    eyebrow: '看图 · 配对 · 说句子',
    teacherIntro: '课本用四幅图认识祖国。先观察它们各自的特点，再把名称、画面和句子联系起来。',
    artwork: '/assets/chinese-textbook/motherland-landmarks-v1.webp',
    artworkSource: 'original',
    artworkAlt: '五星红旗、北京天安门、青山间的长江和奔腾的黄河组成祖国山河长卷',
    observePrompt: '打开四张祖国名片，听清它们的名字。',
    mission: '根据画面，把五星红旗、北京天安门、长江、黄河送回正确位置。',
    sourceLines: ['我爱五星红旗。', '我爱北京天安门。', '我爱长江，我爱黄河。', '我爱中华人民共和国。'],
    keywords: ['五星红旗', '北京天安门', '长江', '黄河'],
    questions: [
      { question: '红色旗面上有五颗黄色星星，这是？', options: ['五星红旗', '北京天安门', '黄河'], answer: 0, explain: '五星红旗是中华人民共和国国旗。' },
      { question: '哪两个名称都是河流？', options: ['长江和黄河', '国旗和天安门', '天安门和长江'], answer: 0, explain: '长江和黄河都是祖国的大河。' },
      { question: '“我爱……”后面可以接什么，表达对祖国的热爱？', options: ['五星红旗、天安门、长江、黄河', '只接一种颜色', '只能接自己的名字'], answer: 0, explain: '课文用这些有代表性的事物表达对祖国的热爱。' },
    ],
  },
  {
    id: 'schoolchild',
    kind: 'orientation',
    title: '我是小学生',
    subtitle: '跟着《上学歌》学习节奏朗读和好习惯',
    page: 'P6',
    unit: '我上学了',
    eyebrow: '听读 · 节奏 · 行动',
    teacherIntro: '先听《上学歌》的节奏，再跟着逐行读，最后判断哪些行为是小学生的好习惯。',
    artwork: '/assets/chinese-textbook/school-morning-v1.webp',
    artworkSource: 'original',
    artworkAlt: '阳光下，两名背好书包的小学生走进校园并向老师问好，树上小鸟正在歌唱',
    observePrompt: '观察太阳、花儿、小鸟和背书包上学的孩子。',
    mission: '按上学前后的顺序整理三张行动卡，并找出两个好习惯。',
    sourceLines: ['太阳当空照，', '花儿对我笑。', '小鸟说：“早，早，早，', '你为什么背上小书包？”', '我去上学校，', '天天不迟到。', '爱学习，爱劳动，', '长大要为人民立功劳。'],
    keywords: ['上学校', '不迟到', '爱学习', '爱劳动'],
    questions: [
      { question: '“天天不迟到”是一种什么习惯？', options: ['守时', '大声说话', '忘带书包'], answer: 0, explain: '按时到校是小学生的守时习惯。' },
      { question: '小鸟连续说三个“早”，读的时候可以怎样处理？', options: ['读出轻快的节奏', '三个字都不读', '倒过来读'], answer: 0, explain: '重复的词语可以读得轻快、有节奏。' },
      { question: '下面哪组都是好习惯？', options: ['爱学习、爱劳动', '迟到、忘带书', '只玩不整理'], answer: 0, explain: '课文明确写到了“爱学习，爱劳动”。' },
    ],
  },
  {
    id: 'love-chinese',
    kind: 'orientation',
    title: '我爱学语文',
    subtitle: '读书、写字、讲故事、听故事',
    page: 'P7',
    unit: '我上学了',
    eyebrow: '识图 · 体验 · 合作',
    teacherIntro: '语文学习不只是认字。读、写、讲、听会一起发生，今天用四个小任务认识它们。',
    artwork: '/assets/chinese-textbook/language-actions-v1.webp',
    artworkSource: 'original',
    artworkAlt: '明亮教室里，小朋友分别在读书、写字、讲故事和认真听故事',
    observePrompt: '观察四组活动，分清谁在读、谁在写、谁在讲、谁在听。',
    mission: '听聪聪发布任务，再选择应该使用的语文能力。',
    sourceLines: ['读书', '写字', '讲故事', '听故事'],
    keywords: ['读', '写', '讲', '听'],
    questions: [
      { question: '同学讲故事时，其他同学应该？', options: ['认真听', '同时大声讲话', '背过身去'], answer: 0, explain: '会倾听是合作学习的重要能力。' },
      { question: '把想到的话告诉大家，主要用到哪种能力？', options: ['讲', '写', '只看'], answer: 0, explain: '把内容有顺序地说出来，就是“讲”。' },
      { question: '哪句话最完整地概括语文学习？', options: ['会读、会写、会讲、会听', '只要写字', '只要听故事'], answer: 0, explain: '四种活动互相帮助，共同组成语文学习。' },
    ],
  },
  {
    id: 'heaven-earth-human',
    kind: 'literacy',
    title: '天地人',
    subtitle: '从天地万物和交往关系中认识六个字',
    page: 'P8',
    unit: '第一单元 · 识字',
    eyebrow: '看图识字 · 建立联系',
    teacherIntro: '先看天空、大地和人，再认识“天、地、人”；接着在交往情境中分清“你、我、他”。',
    artwork: '/assets/chinese-textbook/heaven-earth-people-v1.webp',
    artworkSource: 'original',
    artworkAlt: '蓝天下的大地上站着三个小朋友，其中一人指向自己并和面前的同伴交流',
    observePrompt: '把“天、地、人”放到画面中最合适的位置。',
    mission: '根据说话人的位置，完成“你、我、他”的关系任务。',
    sourceLines: ['天地人', '你我他'],
    keywords: ['天', '地', '人', '你', '我', '他'],
    questions: [
      { question: '蓝天、土地、小朋友分别对应哪三个字？', options: ['天、地、人', '人、天、地', '你、我、他'], answer: 0, explain: '“天、地、人”来自我们能观察到的真实事物。' },
      { question: '说话的人称自己为？', options: ['我', '你', '他'], answer: 0, explain: '说话者用“我”指自己。' },
      { question: '面对小明说话时，可以称小明为？', options: ['你', '我', '天'], answer: 0, explain: '“你”指正在和我说话的人。' },
    ],
  },
];

export const CHINESE_TEXTBOOK_LESSONS: ChineseTextbookLesson[] = [
  ...CHINESE_INITIAL_LESSONS,
  ...CHINESE_REMAINING_LESSONS,
];

export const CHINESE_BOOK_UNITS = [
  { title: '我上学了', page: 'P2', note: '4 个入学主题', lessonIds: ['china', 'motherland', 'schoolchild', 'love-chinese'] as ChineseLessonId[] },
  { title: '第一单元 · 识字', page: 'P8', note: '4 课识字、语文园地与快乐读书吧', lessonIds: ['heaven-earth-human', 'metal-wood-water-fire-earth', 'mouth-ear-eye-hand-foot', 'sun-moon-mountain-river', 'garden-1', 'reading-is-joy'] as ChineseLessonId[] },
  { title: '第二单元 · 汉语拼音', page: 'P20', note: '单韵母、b p m f、d t n l', lessonIds: ['pinyin-a-o-e', 'pinyin-i-u-v', 'pinyin-b-p-m-f', 'pinyin-d-t-n-l', 'garden-2'] as ChineseLessonId[] },
  { title: '第三单元 · 汉语拼音', page: 'P32', note: 'g h 至 y w 与整体认读音节', lessonIds: ['pinyin-g-k-h', 'pinyin-j-q-x', 'pinyin-z-c-s', 'pinyin-zh-ch-sh-r', 'pinyin-y-w', 'garden-3'] as ChineseLessonId[] },
  { title: '第四单元 · 汉语拼音', page: 'P45', note: '复韵母、前后鼻韵母与拼音复习', lessonIds: ['pinyin-ai-ei-ui', 'pinyin-ao-ou-iu', 'pinyin-ie-ve-er', 'pinyin-an-en-in-un-vn', 'pinyin-ang-eng-ing-ong', 'garden-4'] as ChineseLessonId[] },
  { title: '第五单元 · 阅读', page: 'P60', note: '秋天、江南、雪地里的小画家、四季', lessonIds: ['autumn', 'jiangnan', 'snow-painters', 'four-seasons', 'garden-5'] as ChineseLessonId[] },
  { title: '第六单元 · 识字', page: 'P73', note: '对韵歌、日月明、小书包、升国旗', lessonIds: ['rhyme-song', 'sun-moon-bright', 'little-schoolbag', 'raising-flag', 'garden-6'] as ChineseLessonId[] },
  { title: '第七单元 · 阅读', page: 'P84', note: '小小的船、影子、两件宝', lessonIds: ['little-boat', 'shadow', 'two-treasures', 'garden-7'] as ChineseLessonId[] },
  { title: '第八单元 · 阅读', page: 'P95', note: '比尾巴、乌鸦喝水、雨点儿', lessonIds: ['compare-tails', 'crow-drinks-water', 'raindrops', 'garden-8'] as ChineseLessonId[] },
];

export const getChineseTextbookLesson = (id: string | undefined) => CHINESE_TEXTBOOK_LESSONS.find((lesson) => lesson.id === id);
