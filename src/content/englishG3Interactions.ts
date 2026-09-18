/** 非故事类课文的数字化操作点：所有答案均来自对应教材文字，不用 TTS 伪造听力。 */
export type EnglishReadSpotlight = { prompt: string; answerIndex: number; explain: string };

export const ENGLISH_G3_READ_SPOTLIGHTS: Record<string, EnglishReadSpotlight> = {
  friends: { prompt: '找出最直接写“认真听朋友说话”的句子。', answerIndex: 1, explain: 'I listen. 不是只听到声音，而是让朋友把话说完。' },
  families: { prompt: '找出写出小家庭共同情感的句子。', answerIndex: 2, explain: '家庭人数可以不同，They love each other 表达的是共同的关爱。' },
  animals: { prompt: '找出用速度单位描述动物特点的句子。', answerIndex: 1, explain: '60 km/h 是速度单位，所以 fast 描写的是狮子的速度。' },
  plants: { prompt: '找出同时列出植物三项生长条件的句子。', answerIndex: 1, explain: 'air、water 和 sun 是教材中植物生长条件的完整组合。' },
  colours: { prompt: '找出黄色在教材标志里传递的提醒。', answerIndex: 3, explain: 'Yellow can say “Be careful!”；颜色要放回具体标志里理解。' },
  numbers: { prompt: '找出数字 seven 表示“时间”的句子。', answerIndex: 0, explain: 'seven o’clock 中的 seven 结合 o’clock 表示时间，不是数量。' },
};

export type EnglishRevisionScene = {
  title: string;
  label: string;
  page: number;
  focus: string;
  lineIndexes: number[];
  /** 做客对话幕：台词用微信聊天式气泡呈现 */
  chat?: boolean;
  /** 两侧头像（emoji）：[客人, 主人] */
  avatars?: [string, string];
  prompt: string;
  options: [string, string];
  answer: string;
  explain: string;
};

export const ENGLISH_G3_REVISION_SCENES: Record<string, EnglishRevisionScene[]> = {
  'guest-observe': [
    { title: '进门问候', label: 'ARRIVE', page: 74, focus: '50% 22%', lineIndexes: [0, 1, 2], chat: true, avatars: ['👦', '👩'], prompt: '做客刚进门，教材先做了什么？', options: ['介绍同行朋友并问好', '先问水果价格'], answer: '介绍同行朋友并问好', explain: '介绍和 Nice to meet you 让客人、主人彼此认识。' },
    { title: '收下心意', label: 'GIFT', page: 74, focus: '50% 57%', lineIndexes: [3, 4, 5, 6], chat: true, avatars: ['👦', '👩'], prompt: '收到礼物后最自然的回应是？', options: ['Thank you.', 'How many lions?'], answer: 'Thank you.', explain: '感谢和愿意帮忙，都是做客时的友好行动。' },
    { title: '礼貌分享', label: 'SHARE', page: 75, focus: '50% 60%', lineIndexes: [7, 8], chat: true, avatars: ['👦', '👩'], prompt: '主人问你喜欢香蕉，你喜欢时怎么回应？', options: ['Yes, I do. Thanks.', 'It is ten.'], answer: 'Yes, I do. Thanks.', explain: '真实回应喜好后补一句 Thanks，让对话更完整。' },
  ],
  'guest-act': [
    { title: '一起玩', label: 'PLAY', page: 76, focus: '50% 38%', lineIndexes: [0, 1, 2, 3, 4, 5], chat: true, avatars: ['👦', '👩'], prompt: '玩动物玩具时，怎样确认远处的动物？', options: ['Is that a tiger?', 'How old is a tiger?'], answer: 'Is that a tiger?', explain: 'that 用来指向较远的动物或物品。' },
    { title: '留意他人', label: 'QUIET', page: 77, focus: '50% 28%', lineIndexes: [6], chat: true, avatars: ['👦', '👩'], prompt: 'Shh… 在这个场景最可能提醒什么？', options: ['轻一点，不打扰别人', '把声音再放大'], answer: '轻一点，不打扰别人', explain: '做客时玩得开心，也要照顾周围的人。' },
    { title: '好好告别', label: 'GOODBYE', page: 77, focus: '50% 72%', lineIndexes: [7, 8, 9, 10], chat: true, avatars: ['👦', '👩'], prompt: '做客快结束时，这组动作的顺序最完整的是？', options: ['问好、感谢、关心、告别', '只问好和告别'], answer: '问好、感谢、关心、告别', explain: '好客人与好主人都把礼貌落实在完整的互动里。' },
  ],
};
