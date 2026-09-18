/** Reading time 的数字化分镜。lineIndexes 必须完整且不重复地覆盖对应 story.lines。 */
export type EnglishStoryScene = {
  title: string;
  kicker: string;
  summary: string;
  page: number;
  focus: string;
  lineIndexes: number[];
  /** 对话幕：台词用左右分侧聊天气泡呈现（旁白/诗歌幕不加） */
  chat?: boolean;
  /** 微信聊天式对话：两侧头像（emoji） */
  avatars?: [string, string];
  clue: {
    question: string;
    options: [string, string];
    answer: string;
    explain: string;
  };
};

export type EnglishStoryBoard = {
  mission: string;
  ending: string;
  scenes: EnglishStoryScene[];
};

export const ENGLISH_G3_STORY_BOARDS: Record<string, EnglishStoryBoard> = {
  friends: {
    mission: '跟着 Zoom 和 Zip 的关系变化，找出“成为朋友”不是一句话，而是一连串行动。',
    ending: '从打招呼到互相帮助，友谊是在一次次行动里建立的。',
    scenes: [
      { title: '第一次见面', kicker: 'MEET', summary: '校门口来了一个新同学。', page: 12, focus: '50% 15%', lineIndexes: [0, 1, 2, 3], chat: true, avatars: ['🐿️', '🐻'], clue: { question: '他们用什么打开了第一次交流？', options: ['互相介绍并友好问候', '只是安静地看着对方，不说话'], answer: '互相介绍并友好问候', explain: '姓名和 Nice to meet you 让两个人开始认识彼此。' } },
      { title: '一起相处', kicker: 'SHARE', summary: '他们搬东西、分享食物，也一起玩。', page: 12, focus: '50% 78%', lineIndexes: [4, 5, 6], clue: { question: '哪组行动最能说明 Zoom is nice？', options: ['分享、一起玩', '只顾自己离开'], answer: '分享、一起玩', explain: '友好不只是一句评价，还能从 share 和 play together 看出来。' } },
      { title: '互相帮助', kicker: 'CARE', summary: '遇到小意外时，他们没有丢下彼此。', page: 13, focus: '50% 55%', lineIndexes: [7, 8, 9], clue: { question: '故事最后为什么说他们是好朋友？', options: ['会认真听并互相帮助', '因为两个人长得一样'], answer: '会认真听并互相帮助', explain: 'listen with care、help each other 把友谊落到了行动上。' } },
    ],
  },
  families: {
    mission: '对照两首 Family Poems，边读边找“不同”和“相同”。',
    ending: '家庭大小和成员可能不同，但爱、倾听与分享可以相同。',
    scenes: [
      { title: 'Small family', kicker: 'POEM A', summary: '第一首诗写一个较小的家庭。', page: 24, focus: '50% 54%', lineIndexes: [0, 1, 2, 3, 4, 5], clue: { question: '这首诗从哪些行动写家人在一起？', options: ['play、share、listen', 'count、run、jump'], answer: 'play、share、listen', explain: '诗歌不是只报人数，而是用相处行动写家庭。' } },
      { title: 'Big family', kicker: 'POEM B', summary: '第二首诗加入 brothers、sisters 和 cousins。', page: 25, focus: '50% 48%', lineIndexes: [6, 7, 8, 9, 10, 11, 12], clue: { question: '两首诗最后共同表达什么？', options: ['I love my family.', 'Every family is the same size.'], answer: 'I love my family.', explain: '成员数量不同，但两首诗都以 love 收束。' } },
    ],
  },
  animals: {
    mission: '陪小鲸鱼比较“相同点”和“自己的特点”，不要急着把动物排第一。',
    ending: '发现共同点不会抹掉独特之处；小鲸鱼最后找到了自己的歌声。',
    scenes: [
      { title: '提出问题', kicker: 'QUESTION', summary: '小鲸鱼想知道自己为什么很棒。', page: 36, focus: '50% 13%', lineIndexes: [0], clue: { question: '这句话最像在做什么？', options: ['提出一个想探索的问题', '已经宣布最后答案'], answer: '提出一个想探索的问题', explain: '故事先留下问题，后面用比较一步步寻找答案。' } },
      { title: '比较大小和速度', kicker: 'COMPARE', summary: '大和快并不是鲸鱼独有。', page: 36, focus: '50% 62%', lineIndexes: [1, 2, 3, 4], clue: { question: '看到别的动物也大、也快，应该怎样理解？', options: ['动物可以拥有相同特点', '鲸鱼什么特点都没有'], answer: '动物可以拥有相同特点', explain: '比较既能发现不同，也能发现共同点。' } },
      { title: '再比一项', kicker: 'ONE MORE', summary: '“吃得多”也能在别的动物身上发现。', page: 37, focus: '50% 18%', lineIndexes: [5], clue: { question: '这一幕为什么还没有结束故事？', options: ['独特答案还没找到', '熊猫已经替鲸鱼回答完了'], answer: '独特答案还没找到', explain: '第三次比较继续制造悬念。' } },
      { title: '找到自己的歌', kicker: 'DISCOVER', summary: '小鲸鱼终于说出真正想表达的特点。', page: 37, focus: '50% 72%', lineIndexes: [6, 7, 8], clue: { question: '最后的发现是什么？', options: ['鲸鱼会唱好听的歌', '鲸鱼一定比所有动物都大'], answer: '鲸鱼会唱好听的歌', explain: '故事不是评“谁最厉害”，而是发现自己的特点。' } },
    ],
  },
  plants: {
    mission: '沿着苹果树的成长时间线，找出家人怎样帮助树、树又怎样回馈家人。',
    ending: '照料让小树长大，长大的树用果实回馈家人，这是双向的帮助。',
    scenes: [
      { title: '来到新家', kicker: 'PLANT', summary: '一家人种下一棵小苹果树。', page: 48, focus: '50% 18%', lineIndexes: [0, 1], clue: { question: 'My new family 指的是谁？', options: ['照料苹果树的一家人', '另一棵不会动的树'], answer: '照料苹果树的一家人', explain: '故事从苹果树的第一人称看人和植物的关系。' } },
      { title: '生长需要', kicker: 'GROW', summary: '小树说出成长所需，人们开始浇水。', page: 48, focus: '50% 54%', lineIndexes: [2, 3], clue: { question: '哪项是“需要”和“行动”的正确对应？', options: ['需要水—家人浇水', '需要阳光—把树关进盒子'], answer: '需要水—家人浇水', explain: 'water 既能表示水，也能作动词表示浇水。' } },
      { title: '度过寒冷', kicker: 'CARE', summary: '天气变冷，家人继续保护它。', page: 48, focus: '50% 84%', lineIndexes: [4], clue: { question: 'They help me 中的 help 说明什么？', options: ['照料会随情况变化', '冬天不需要管植物'], answer: '照料会随情况变化', explain: '植物在不同季节需要不同的照料。' } },
      { title: '彼此喜欢', kicker: 'FAMILY', summary: '树长成了家人生活的一部分。', page: 49, focus: '50% 23%', lineIndexes: [5], clue: { question: '这一幕主要表现什么？', options: ['人与植物建立了感情', '家人准备丢掉小树'], answer: '人与植物建立了感情', explain: '故事不只讲条件，也讲长期照料形成的关系。' } },
      { title: '长大与回馈', kicker: 'GIVE', summary: '苹果树长大结果，帮助变成了双向。', page: 49, focus: '50% 74%', lineIndexes: [6, 7], clue: { question: '苹果树怎样回馈家人？', options: ['长大后结出苹果', '拿走空气和阳光'], answer: '长大后结出苹果', explain: '家人先 give care，树长大后 give apples。' } },
    ],
  },
  colours: {
    mission: '把颜色变化放进向日葵生命周期里看，找出每种颜色背后的成长线索。',
    ending: '颜色不只是装饰，它记录了发芽、开花、结果、枯萎和新生命。',
    scenes: [
      { title: '绿色幼苗', kicker: 'SPROUT', summary: '向日葵还是高高的绿色植株。', page: 60, focus: '50% 20%', lineIndexes: [0], clue: { question: 'tall and green 描写了什么？', options: ['植株的样子和颜色', '蜜蜂的数量'], answer: '植株的样子和颜色', explain: '形状与颜色一起帮助我们观察植物。' } },
      { title: '出现黄色', kicker: 'CHANGE', summary: '绿色中开始出现花朵的黄色。', page: 60, focus: '50% 56%', lineIndexes: [1], clue: { question: 'Then 提醒我们注意什么？', options: ['时间继续向后发展', '故事回到最开始'], answer: '时间继续向后发展', explain: 'Then 是阅读时间顺序的重要线索。' } },
      { title: '盛开与蜜蜂', kicker: 'BLOOM', summary: '大黄花盛开，蜜蜂来取食。', page: 60, focus: '50% 82%', lineIndexes: [2, 3], clue: { question: '黄色和黑色在这里描写谁？', options: ['来访的蜜蜂', '土里的种子'], answer: '来访的蜜蜂', explain: '代词 They 指向上一句的 Bees。' } },
      { title: '寒冷与枯萎', kicker: 'COLD', summary: '天气变冷，向日葵转成绿色和棕色。', page: 61, focus: '50% 26%', lineIndexes: [4], clue: { question: '颜色变化和什么一起发生？', options: ['季节与生长变化', '每天随便换颜色'], answer: '季节与生长变化', explain: 'cold 是时间与季节变化的提示。' } },
      { title: '新的生命', kicker: 'AGAIN', summary: '老植株消失了，种子又长出孩子。', page: 61, focus: '50% 73%', lineIndexes: [5], clue: { question: '故事结尾为什么不是彻底结束？', options: ['新的幼苗继续生长', '颜色词都用完了'], answer: '新的幼苗继续生长', explain: 'But 把消失和新生连接成生命周期。' } },
    ],
  },
  numbers: {
    mission: '像小侦探一样寻找“六”的不同写法，判断它们变的是外形还是数量。',
    ending: '同一个数量可以有不同语言和文化符号，读数字时要结合表示系统。',
    scenes: [
      { title: '先数数量', kicker: 'COUNT', summary: '先确认卡片的数量是 six。', page: 72, focus: '50% 18%', lineIndexes: [0], clue: { question: '这里的 Six 回答了什么问题？', options: ['卡片有多少张', '卡片是什么颜色'], answer: '卡片有多少张', explain: 'How many 问数量。' } },
      { title: '英文写法', kicker: 'WORD', summary: '看到英语单词 six，他很快认出来。', page: 72, focus: '50% 53%', lineIndexes: [1, 2], clue: { question: '卡片外形变了，数量意义变了吗？', options: ['没有，仍然表示六', '变成了七'], answer: '没有，仍然表示六', explain: '数字词和数字符号可以表达同一个数量。' } },
      { title: '罗马数字', kicker: 'SYMBOL', summary: '新的符号让回答多了一点犹豫。', page: 72, focus: '50% 83%', lineIndexes: [3, 4], clue: { question: 'Hmm 表现了怎样的阅读状态？', options: ['不太确定，正在判断', '非常生气'], answer: '不太确定，正在判断', explain: '语气词能帮助我们读懂人物的思考。' } },
      { title: '汉字的六', kicker: 'CHINESE', summary: '这次出现的是汉字“六”。', page: 73, focus: '50% 17%', lineIndexes: [5, 6], clue: { question: '六和 six 的共同点是什么？', options: ['都可以表示数量 6', '写法和读音完全相同'], answer: '都可以表示数量 6', explain: '语言不同，表示的数量可以相同。' } },
      { title: '陌生的古文字', kicker: 'GUESS', summary: '面对甲骨文，小朋友暂时认不出来。', page: 73, focus: '50% 50%', lineIndexes: [7, 8], clue: { question: 'I don’t know 是不是学习失败？', options: ['不是，它是继续提问的起点', '是，应该立刻停止'], answer: '不是，它是继续提问的起点', explain: '承认不知道，才能听到下一步解释。' } },
      { title: '跨越三千年', kicker: 'HISTORY', summary: '原来古老的甲骨文也能表示 six。', page: 73, focus: '50% 82%', lineIndexes: [9, 10], clue: { question: '最后的 Wow 表达什么？', options: ['对古老文字的惊叹', '不愿意继续认识数字'], answer: '对古老文字的惊叹', explain: '一个数字把英语、汉字和三千多年前的文字连接起来。' } },
    ],
  },
};

export function getEnglishG3StoryBoard(unitId: string) {
  return ENGLISH_G3_STORY_BOARDS[unitId];
}
