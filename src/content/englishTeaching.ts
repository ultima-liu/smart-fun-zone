import { ENGLISH_G3_ALL_LESSONS, ENGLISH_G3_UPPER_UNITS, getEnglishG3Lesson, getEnglishG3Unit, type EnglishQuiz, type EnglishSection } from './englishGrade3Upper';
import type { EnglishSkill } from '../englishLearning';

export type EnglishExpressionTask = { scene: string; picture: string; prompt: string; frame: string; model: string; criteria: string[]; transfer?: { prompt: string; picture: string } };
export type EnglishTeaching = { goal: string; skill: EnglishSkill; core: string[]; expression: EnglishExpressionTask; check: EnglishQuiz; bridgeRequired: boolean };

const EXPRESSION: Record<string, EnglishExpressionTask[]> = {
  friends: [
    { scene: '认识新朋友', picture: 'smile', prompt: '在新活动里向一位朋友介绍自己，并回应问候。可以用虚构名字。', frame: 'Hello! My name is … / Nice to meet you …', model: 'Hello! My name is Amy. Nice to meet you.', criteria: ['说出自己的名字', '根据对方的话回应', '声音能让同伴听清'] },
    { scene: '一起用彩笔', picture: 'share', prompt: '朋友忘带彩笔。向他提出分享，收到感谢后回应。', frame: 'We can … / It is …', model: 'We can share. It is OK.', criteria: ['提出适合场景的办法', '回应对方', '尊重对方的选择'] },
  ],
  families: [
    { scene: '人物相册', picture: 'grandmother', prompt: '介绍相册中的两个人和他们与你的关系。可用虚构人物，不必公开家庭照片。', frame: 'This is my … / This is my …', model: 'This is my grandma. This is my sister.', criteria: ['介绍两个人', '人物与关系对应', '允许真实或虚构家庭'] },
    { scene: '远近人物', picture: 'brother', prompt: '近处是兄弟，远处是堂／表亲。让同伴问人物关系，你来回应。', frame: 'Is this / that …? / Yes … / No …', model: 'Is that your brother? No, it is my cousin.', criteria: ['区分指向的人物', '根据实际关系回答', '说明否定后的关系'] },
  ],
  animals: [
    { scene: '宠物调查', picture: 'cat', prompt: '同伴问你有没有宠物，按自己的实际情况回答；再说一种喜欢的动物。', frame: 'Do you have …? / Yes … / No … / I like …', model: 'No, I do not. I like cats.', criteria: ['如实回答有没有', '表达动物喜好', '不把喜欢当成拥有'] },
    { scene: '动物观察员', picture: 'elephant', prompt: '介绍图中的动物和一个特点，让同伴找到它。', frame: 'It is … / It is …', model: 'It is an elephant. It is big.', criteria: ['说对动物名称', '描述可观察的特点', '让同伴能找到动物'] },
  ],
  plants: [
    { scene: '水果分享', picture: 'bananas', prompt: '同伴问你喜欢苹果吗。回答后，再告诉他你喜欢的一种水果。', frame: 'Yes, I … / No, I … / I like …', model: 'No, I do not. I like bananas.', criteria: ['先回答问句', '补充自己的喜好', '使用合适的水果词'] },
    { scene: '照料小花园', picture: 'tree', prompt: '介绍植物需要什么，以及你能怎样帮助它。', frame: 'Plants need … / We can …', model: 'Plants need water. We can water the flowers.', criteria: ['说出植物的一种需要', '提出对应的行动', '把需要和行动连起来'] },
  ],
  colours: [
    { scene: '设计花朵', picture: 'flowers', prompt: '选两种你喜欢的颜色，告诉同伴，再介绍花朵的颜色。', frame: 'I like … and … / The flower is …', model: 'I like red and pink. The flower is red.', criteria: ['说出自己的颜色选择', '用 and 连接两种颜色', '描述实际物品的颜色'] },
    { scene: '观察变色', picture: 'tree', prompt: '观察一片绿叶和一片棕叶，用英语描述它们。', frame: 'It is … / It is …', model: 'It is green. It is brown.', criteria: ['对应两片叶子的颜色', '用短句描述', '观察后再表达'] },
  ],
  numbers: [
    { scene: '生日交流', picture: 'seven', prompt: '和同伴互问年龄。可用虚构年龄；再告诉他果篮里有三个苹果。', frame: 'How old …? / I am … / Three …', model: 'I am seven years old. Three apples.', criteria: ['回应年龄问题', '表达三个苹果', '区分年龄和数量'] },
    { scene: '水果小店', picture: 'bananas', prompt: '篮子有两根香蕉，标价共六元。和店员交流数量与钱数。', frame: 'How many …? / Two … / Six …', model: 'Two bananas. Six yuan.', criteria: ['说清数量', '说清钱数', '根据对方问句回应'] },
  ],
  revision: [
    { scene: '到朋友家做客', picture: 'share', prompt: '把进门问候、介绍朋友、收到礼物道谢连成一段对话。', frame: 'Hello! / This is … / Thank …', model: 'Hello! This is my friend, Amy. Thank you.', criteria: ['按场景顺序表达', '听对方再接话', '礼貌表达与行动一致'] },
    { scene: '做客后告别', picture: 'hand', prompt: '和朋友轻声玩玩具，离开时道谢并告别。', frame: 'Let us … / Thank … / Good…', model: 'Let us play together. Thank you. Goodbye!', criteria: ['回应一起玩的邀请', '照顾正在休息的人', '结束时道谢并告别'] },
  ],
};

const SECTION_FOCUS: Record<EnglishSection, { skill: EnglishSkill; goal: string; variant: number }> = {
  opening: { skill: 'expression', goal: '围绕单元情境说一句有意义的英语', variant: 0 },
  a: { skill: 'expression', goal: '听清对方的信息，用本课表达作回应', variant: 0 },
  letters: { skill: 'phonics', goal: '辨认词中声音，连接字母，并尝试合音读单词', variant: 1 },
  b: { skill: 'expression', goal: '在变化的场景中选择并说出合适表达', variant: 1 },
  read: { skill: 'reading', goal: '从原文找到依据，再用简短英语表达意思', variant: 2 },
  project: { skill: 'project', goal: '制作有清楚信息的小作品，并向别人介绍', variant: 2 },
  story: { skill: 'reading', goal: '读懂故事中的关系或变化，用短句描述线索', variant: 2 },
};

const ORAL_TRANSFER: Record<string, [{ prompt: string; picture: string }, { prompt: string; picture: string }]> = {
  friends: [{ prompt: '你在课外活动遇到新伙伴。换一个名字介绍自己，听到问候后接话。', picture: 'hand' }, { prompt: '新伙伴忘带画纸。提出一起分享，并回应对方的感谢。', picture: 'help' }],
  families: [{ prompt: '故事主角向新朋友介绍两位亲人。自己选人物和关系，可用虚构家庭。', picture: 'father' }, { prompt: '近处是堂／表亲，远处是姐妹。和同伴问答，否定后说明真正关系。', picture: 'sister' }],
  animals: [{ prompt: '新同伴来问你的宠物情况。先如实回答，再说一种与示范不同的动物喜好。', picture: 'rabbit' }, { prompt: '换到新的动物观察点。介绍图中的狮子和一个特点，让同伴找到它。', picture: 'lion' }],
  plants: [{ prompt: '野餐时新伙伴问你喜欢苹果吗。说出自己的真实喜好，再补充另一种水果。', picture: 'grapes' }, { prompt: '花园里有缺水的花和草。说出需要，以及你选择的照料行动。', picture: 'flowers' }],
  colours: [{ prompt: '你要给新画布设计花朵。自己选两种颜色，告诉同伴，再描述画好的花。', picture: 'flowers' }, { prompt: '观察一棵绿树和一朵粉色花。把两种颜色与对应的植物说清楚。', picture: 'flowers' }],
  numbers: [{ prompt: '新伙伴来参加聚会。换一个年龄回答他的问题，再说明篮子里有三个苹果。', picture: 'apples' }, { prompt: '换一家水果小店：两根香蕉共六元。店员先问钱数，再问数量，请分别回答。', picture: 'banana' }],
  revision: [{ prompt: '换一位主人、一位同行朋友。演出进门、介绍和收到礼物道谢的对话。', picture: 'mother' }, { prompt: '到另一位朋友家做客。有人休息时轻声交流，离开前道谢、告别。', picture: 'listen' }],
};

export function getEnglishTeaching(lessonId: string): EnglishTeaching {
  const lesson = getEnglishG3Lesson(lessonId);
  if (!lesson) throw new Error(`Unknown English lesson: ${lessonId}`);
  const unit = getEnglishG3Unit(lesson.unitId);
  const focus = SECTION_FOCUS[lesson.section];
  const index = lesson.unitId === 'revision' ? (lessonId === 'guest-act' ? 2 : 0) : focus.variant;
  const expression = { ...EXPRESSION[lesson.unitId][index === 0 ? 0 : 1], transfer: ORAL_TRANSFER[lesson.unitId][index === 0 ? 0 : 1] };
  const core = lesson.section === 'letters' && unit ? unit.letters.items.map((item) => item.letter).slice(0, 5)
    : lesson.section === 'a' && unit ? unit.a.blocks.flatMap((block) => block.words ?? []).slice(0, 4)
    : lesson.section === 'b' && unit ? unit.b.blocks.flatMap((block) => block.words ?? []).slice(0, 4) : [];
  return {
    goal: `${focus.goal} · ${lesson.section === 'letters' ? unit?.letters.items.map((item) => item.letter).join(' / ') : expression.scene}`, skill: focus.skill, core: core.length ? core : [expression.model],
    expression,
    check: teachingCheck(lessonId, lesson.check),
    bridgeRequired: ['families-b', 'animals-a', 'plants-read', 'colours-a', 'numbers-a', 'numbers-read'].includes(lessonId),
  };
}

/** 为近义功能/同领域误解提供干扰项，保留教材问题与正确答案。 */
const DISTRACTORS: Record<string, string[]> = {
  'friends-opening': ['Nice to meet you.', 'Goodbye.', 'Thank you.'],
  'friends-a': ['Nice to meet you too.', 'Nice to meet you.', 'My name is Mike.'],
  'friends-b': ['We can share.', 'I listen.', 'I smile.'],
  'friends-project': ['What do friends do?', 'What do friends look like?', 'What are our names?'],
  'friends-story': ['分享、一起玩、认真听并帮助', '只介绍姓名和问候', '一起玩但不分享、不倾听'],
  'families-a': ['This is my grandma.', 'This is my grandpa.', 'This is my mum.'],
  'families-opening': ['不能', '可以只看人数', '可以只看是否住在一起'],
  'animals-opening': ['不能，要尊重不同生活环境', '可以，只要提供一样的食物', '可以，只要住在一样的笼子里'],
  'animals-a': ["No, I don’t.", 'Yes, I do.', 'I like pets.'],
  'animals-read': ['fast', 'big', 'tall'],
  'animals-project': ['Wild animals', 'Pets', 'Small animals'],
  'plants-opening': ['我们照料它，它也给我们果实等', '只需要记录树给我们的东西', '只需要记录人给树的东西'],
  'plants-b': ['We can water the flowers.', 'We can plant new trees.', 'We can water the grass.'],
  'plants-read': ['air, water and sun', 'air and water only', 'water and sun only'],
  'plants-project': ['植物需要的条件', '植物给我们的东西', '我们帮助植物的行动'],
  'colours-opening': ['传递信息与提醒', '只表示物品是否好看', '任何地方都表达同一种意思'],
  'colours-a': ['purple', 'green', 'orange'],
  'colours-b': ['What colours do you like?', 'What colour is it?', 'Do you like flowers?'],
  'colours-project': ['yellow', 'green', 'orange'],
  'numbers-opening': ['不一定，要看旁边的情境', '一定都表示数量', '一定都表示年龄'],
  'numbers-b': ['苹果的数量', '苹果的价格', '买苹果的时间'],
  'numbers-read': ['时间', '数量', '年龄'],
  'numbers-project': ['聚会时间', '年龄', '参加人数'],
  'families-b': ['Yes, it is.', 'No, it is not.', 'Yes, I do.'],
  'families-project': ['堂（表）兄弟姐妹', '亲兄弟姐妹', '祖父母'],
  'families-story': ['都爱自己的家', '都介绍了完全相同的成员', '都说自己家庭人数相同'],
  'animals-story': ['big', 'tall', 'fast'],
  'plants-story': ['家人照料树，树长大给苹果', '只讲树需要水，没有收获', '只讲苹果收获，没有照料'],
  'colours-story': ['生长与季节变化', '只与一天中的时间变化有关', '只与是否有蜜蜂停留有关'],
  'numbers-story': ['阿拉伯数字、英文、罗马数字、汉字和甲骨文等', '只有阿拉伯数字和英文', '只有汉字和甲骨文'],
  'numbers-letters': ['词尾', '词首', '词中'],
  'guest-observe': ['Thank you.', 'Nice to meet you.', 'Goodbye.'],
  'guest-act': ['放低声音，不打扰别人', '邀请更多人加入', '停止介绍动物名称'],
};
function teachingCheck(lessonId: string, fallback: EnglishQuiz): EnglishQuiz {
  const options = DISTRACTORS[lessonId];
  return options?.includes(fallback.answer) ? { ...fallback, options } : fallback;
}

/** 词义和短句逐项维护，避免 a/an、可数性、多义词被通用模板误教。 */
export const ENGLISH_WORD_SENTENCES: Record<string, string> = {
  ear: 'Point to your ear.', eye: 'Point to your eye.', mouth: 'Point to your mouth.', hand: 'Wave your hand.', arm: 'Wave your arm.',
  grandmother: 'This is my grandma.', grandfather: 'This is my grandpa.', mother: 'This is my mum.', father: 'This is my dad.', me: 'This is me.', sister: 'This is my sister.', brother: 'This is my brother.', aunt: 'This is my aunt.', uncle: 'This is my uncle.', cousin: 'This is my cousin.', 'baby sister': 'This is my baby sister.',
  cat: 'I like cats.', dog: 'I like dogs.', fish: 'I like fish.', bird: 'I like birds.', rabbit: 'I like rabbits.', elephant: 'It is an elephant.', monkey: 'It is a monkey.', tiger: 'It is a tiger.', lion: 'It is a lion.', giraffe: 'The giraffe is tall.', panda: 'It is a panda.',
  apple: 'It is an apple.', apples: 'I like apples.', banana: 'It is a banana.', bananas: 'I like bananas.', oranges: 'I like oranges.', grapes: 'I like grapes.',
  sun: 'Plants need sun.', air: 'Plants need air.', water: 'Plants need water.', tree: 'We can plant a tree.', trees: 'We can plant trees.', flowers: 'We can water the flowers.', grass: 'We can water the grass.',
  red: 'It is red.', blue: 'It is blue.', yellow: 'It is yellow.', green: 'It is green.', purple: 'It is purple.', pink: 'It is pink.', orange: 'It is orange.', black: 'It is black.', white: 'It is white.', brown: 'It is brown.',
  one: 'One apple.', two: 'Two apples.', three: 'Three apples.', four: 'Four apples.', five: 'Five apples.', six: 'Six yuan.', seven: 'Seven years old.', eight: 'Eight apples.', nine: 'Nine apples.', ten: 'Ten yuan.',
  help: 'I help.', share: 'We can share.', listen: 'I listen.', smile: 'I smile.', say: 'I say hello.',
};
export function englishWordSentence(word: string, unitId?: string): string {
  const clean = word.toLowerCase().replace(/\s*\(.*?\)/g, '').trim();
  if (clean === 'orange' && unitId === 'plants') return 'It is an orange.';
  return ENGLISH_WORD_SENTENCES[clean] ?? word;
}

export type EnglishPhonicsTask = { words: [string, string]; same: boolean; position: 'first' | 'last'; letter: string; reference: string; novel: string; sounds: string[]; sentence: string };
export const ENGLISH_PHONICS_TASKS: Record<string, EnglishPhonicsTask> = {
  friends: { words: ['cat', 'can'], same: true, position: 'first', letter: 'c', reference: 'cat', novel: 'dad', sounds: ['/d/', '/æ/', '/d/'], sentence: 'This is my dad.' },
  families: { words: ['fish', 'beef'], same: false, position: 'first', letter: 'f', reference: 'fish', novel: 'beg', sounds: ['/b/', '/e/', '/ɡ/'], sentence: 'Dogs can beg.' },
  animals: { words: ['leg', 'lion'], same: true, position: 'first', letter: 'l', reference: 'leg', novel: 'bib', sounds: ['/b/', '/ɪ/', '/b/'], sentence: 'It is a bib.' },
  plants: { words: ['map', 'mum'], same: true, position: 'first', letter: 'm', reference: 'map', novel: 'mop', sounds: ['/m/', '/ɒ/', '/p/'], sentence: 'It is a mop.' },
  colours: { words: ['red', 'bus'], same: false, position: 'first', letter: 'r', reference: 'red', novel: 'rug', sounds: ['/r/', '/ʌ/', '/ɡ/'], sentence: 'It is a rug.' },
  numbers: { words: ['box', 'six'], same: true, position: 'last', letter: 'x', reference: 'six', novel: 'wax', sounds: ['/w/', '/æ/', '/k/', '/s/'], sentence: 'This is wax.' },
};

export function englishCoreSourceIds(lessonId: string, items: { id: string; text: string; kind: string; blockId?: string; speaker?: string }[]): string[] {
  const lesson = getEnglishG3Lesson(lessonId);
  if (!lesson) return [];
  if (lesson.section === 'letters') return items.filter((item) => item.kind === 'letter').map((item) => item.id);
  if (lesson.section === 'a' || lesson.section === 'b') {
    return [...items.filter((item) => item.blockId === 'talk').slice(0, 4), ...items.filter((item) => item.kind === 'word').slice(0, 4), ...items.filter((item) => item.blockId === 'activity').slice(0, 1)].map((item) => item.id);
  }
  return items.slice(0, Math.min(items.length, 4)).map((item) => item.id);
}

const RECALL_MEANINGS: Record<string, string> = {
  ear: '耳朵', eye: '眼睛', mouth: '嘴巴', hand: '手', arm: '手臂', help: '帮助', share: '分享', listen: '倾听', smile: '微笑', say: '说',
  mother: '妈妈', father: '爸爸', grandmother: '奶奶或外婆', grandfather: '爷爷或外公', me: '我', sister: '姐妹', brother: '兄弟', aunt: '阿姨或姑姑', uncle: '叔叔或舅舅', cousin: '堂或表亲', 'baby sister': '小妹妹',
  cat: '猫', dog: '狗', fish: '鱼', bird: '鸟', rabbit: '兔子', elephant: '大象', monkey: '猴子', tiger: '老虎', lion: '狮子', giraffe: '长颈鹿', panda: '大熊猫',
  apple: '一个苹果', apples: '苹果（复数）', banana: '一根香蕉', bananas: '香蕉（复数）', orange: '橙色', oranges: '橙子（复数）', grapes: '葡萄', sun: '太阳', air: '空气', water: '水', tree: '一棵树', flowers: '花（复数）', grass: '草',
  red: '红色', blue: '蓝色', yellow: '黄色', green: '绿色', purple: '紫色', pink: '粉色', black: '黑色', white: '白色', brown: '棕色',
  one: '一', two: '二', three: '三', four: '四', five: '五', six: '六', seven: '七', eight: '八', nine: '九', ten: '十',
  bed: '床', egg: '鸡蛋', girl: '女孩', hot: '热的', ill: '生病的', job: '工作', Kim: '人名：金姆', leg: '腿', map: '地图', new: '新的', pen: '笔', quiet: '安静的', ruler: '尺子', see: '看见', Ted: '人名：泰德', up: '向上', van: '厢式车', we: '我们', box: '盒子', Zip: '人名：齐普',
};

export function englishReviewMaterial(lessonId: string): { id: string; text: string; picture?: string; cue: string }[] {
  const lesson = getEnglishG3Lesson(lessonId);
  if (!lesson) return [];
  const unit = getEnglishG3Unit(lesson.unitId);
  const teaching = getEnglishTeaching(lessonId);
  const words = unit ? (lesson.section === 'a' || lesson.section === 'b' ? unit[lesson.section].blocks.flatMap((block) => block.words ?? []) : lesson.section === 'letters' ? unit.letters.items.map((item) => item.words[0]) : unit.read.words) : ['share', 'smile', 'hand'];
  return [...words.map((text) => ({ id: `recall:${text}`, text, picture: text, cue: `试着用英语说：${text === 'orange' && lesson.unitId === 'plants' ? '一个橙子' : RECALL_MEANINGS[text.replace(/\s*\(.*?\)/g, '').trim()] ?? '图中的内容'}` })), { id: 'recall:expression', text: teaching.expression.model, picture: teaching.expression.picture, cue: teaching.expression.prompt }];
}

export const ENGLISH_TEACHING_LESSON_IDS = ENGLISH_G3_ALL_LESSONS.map((lesson) => lesson.id);
export const ENGLISH_TEACHING_UNIT_IDS = ENGLISH_G3_UPPER_UNITS.map((unit) => unit.id);
