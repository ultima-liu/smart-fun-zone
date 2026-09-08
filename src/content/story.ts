/** 剧情数据：序章 ~ 第3章（第一季第一幕：启程）
 *  一致性依据见 docs/卷星故事架构.md；奖励见 docs/卷星世界观·剧情与系统设计.md
 *  字段：unlockStars=章节解锁星数（当前实现仅展示与预告，不硬卡）
 *  rule: 完成判定类型：
 *   - login        登录成功即完成（由 LoginDialog 调用）
 *   - visitSchool  /map 挂载即完成
 *   - visitLobby   /lobby 挂载即完成
 *   - visitStore   /store 挂载即完成
 *   - lesson       上过任意一节课（lessonProgress 有值）自动完成
 *   - game         玩过任意乐园游戏（有 records）自动完成
 */

export interface StoryText {
  zh: string;
  en: string;
}

/** 一句对话（NPC 说的话） */
export interface StoryLine {
  zh: string;
  en: string;
}

export interface StoryNode {
  /** 唯一 id，如 c1-2 */
  id: string;
  chapterId: string;
  title: StoryText;
  npc: string;
  /** 剧情：与 NPC 的对话序列（visit 类节点通过对话完成；lesson/game/login 可为空） */
  lines?: StoryLine[];
  /** 小卷/剧情气泡播报文本（无对话时的短播报） */
  text: StoryText;
  /** 任务提示（气泡内展示） */
  task: StoryText;
  rule: 'login' | 'visitSchool' | 'visitLobby' | 'visitStore' | 'lesson' | 'game' | 'visitLibrary' | 'visitExpedition' | 'visitBuddy' | 'collectLoot';
  /** 完成奖励（卷星币，走 applyPoints + 幂等 sourceId） */
  reward: number;
}

export interface StoryChapter {
  id: string;
  no: string;
  title: StoryText;
  unlockStars: number;
  nodes: StoryNode[];
}

export const STORY: StoryChapter[] = [
  {
    id: 'prologue',
    no: '序章',
    title: { zh: '星门之光', en: 'Gate of Light' },
    unlockStars: 0,
    nodes: [
      {
        id: 'p1',
        chapterId: 'prologue',
        title: { zh: '星门验证', en: 'Stargate Check' },
        npc: '铁砣',
        lines: [
          { zh: '欢迎来到卷星总部！我是铁砣，这里管着卷星的秩序。', en: 'Welcome to HQ! I am Tie-Tuo, keeper of order here.' },
          { zh: '你的通行证验证通过了，小飞船也已经加满能量。', en: 'Your pass is verified and your ship is fully charged.' },
          { zh: '出发前记好三件事：白天去学校学习、去乐园游戏，晚上开飞船远征。', en: 'Remember three things: learn at school, play in the park, fly at night.' },
          { zh: '有什么不懂的，随时问你的伙伴小卷。启航吧！', en: 'Ask your buddy Xiao Juan anytime. Set sail!' },
        ],
        text: { zh: '欢迎来到卷星总部！你的小飞船已经准备好了。', en: 'Welcome to HQ! Your little ship is ready.' },
        task: { zh: '和铁砣聊聊，准备启航', en: 'Talk with Tie-Tuo to set sail' },
        rule: 'login',
        reward: 5,
      },
    ],
  },
  {
    id: 'ch1',
    no: '第1章',
    title: { zh: '星环学校', en: 'Ring School' },
    unlockStars: 0,
    nodes: [
      {
        id: 'c1-1',
        chapterId: 'ch1',
        title: { zh: '拜访星校长', en: 'Meet Principal A' },
        npc: '阿光',
        lines: [
          { zh: '欢迎你来到星环学校！我是这里的校长，阿光。', en: 'Welcome to Ring School! I am Principal A-Guang.' },
          { zh: '看到黑板上暗下来的星光了吗？那是乌乌怪晚上来偷走的。', en: 'See the dim star-light on the blackboard? Gloom Gremlins stole it at night.' },
          { zh: '要把它点亮，只有一个办法——认认真真上一堂课。', en: 'There is only one way to light it again — take a lesson seriously.' },
          { zh: '从这里选好你的年级，然后点语文、数学或英语的课程。', en: 'Pick your grade here, then choose Chinese, Math or English.' },
          { zh: '每节课有四个步骤：看课文、学课文、记一记、去练习。学完就亮一颗星！', en: 'Every lesson has four steps: Read, Learn, Remember, Practice. Finish one and a star lights up!' },
        ],
        text: { zh: '学校的光变暗了……乌乌怪夜里来过。用学习点亮课堂吧！', en: 'The school light is dim… Gloom Gremlins came at night. Light it up by learning!' },
        task: { zh: '和星校长阿光聊聊，了解学校', en: 'Talk with Principal A-Guang about school' },
        rule: 'visitSchool',
        reward: 5,
      },
      {
        id: 'c1-2',
        chapterId: 'ch1',
        title: { zh: '点亮第一课', en: 'Light Your First Lesson' },
        npc: '阿光',
        text: { zh: '上完一节课，星光就会回到黑板上。', en: 'Finish one lesson and star-light returns.' },
        task: { zh: '完成任意一节课的任意步骤', en: 'Complete any step of a lesson' },
        rule: 'lesson',
        reward: 8,
      },
    ],
  },
  {
    id: 'ch2',
    no: '第2章',
    title: { zh: '空中乐园的勇气试炼', en: 'Sky Park Trial' },
    unlockStars: 1,
    nodes: [
      {
        id: 'c2-1',
        chapterId: 'ch2',
        title: { zh: '去乐园找回笑声', en: 'Find the Laughter' },
        npc: '泡泡',
        lines: [
          { zh: '欢迎来空中乐园！我是泡泡，这里装着卷星所有的笑声。', en: 'Welcome to Sky Park! I am Pao-Pao, keeper of all laughter on Juan Star.' },
          { zh: '可是乌乌怪偷走了笑声，现在乐园的灯都点不亮了。', en: 'But Gloom Gremlins stole it, and now the park lights are out.' },
          { zh: '玩一局小游戏就能找回一点勇气之光，让乐园重新亮起来！', en: 'Play a game and courage-light returns to re-light the park!' },
        ],
        text: { zh: '乐园好久没有欢笑声了，来玩一局吧，勇气之光会回来的！', en: 'The park misses laughter. Play a game and courage will return!' },
        task: { zh: '和乐园主泡泡聊聊', en: 'Talk with Park Master Pao-Pao' },
        rule: 'visitLobby',
        reward: 5,
      },
      {
        id: 'c2-2',
        chapterId: 'ch2',
        title: { zh: '一局勇气的游戏', en: 'A Game of Courage' },
        npc: '泡泡',
        text: { zh: '漂亮的通关！看，乐园的灯又亮起一盏。', en: 'Nice job! Another light just lit up in the park.' },
        task: { zh: '玩一局乐园小游戏', en: 'Play one park game' },
        rule: 'game',
        reward: 8,
      },
    ],
  },
  {
    id: 'ch3',
    no: '第3章',
    title: { zh: '补给站与卷星币', en: 'Supply Station & Coins' },
    unlockStars: 2,
    nodes: [
      {
        id: 'c3-1',
        chapterId: 'ch3',
        title: { zh: '铛铛的补给站', en: 'Dangdang’s Store' },
        npc: '铛铛',
        lines: [
          { zh: '欢迎光临补给站！我是铛铛，卷星的好东西都从我这儿出发。', en: 'Welcome to the Supply Station! I am Dang-Dang, everything good starts here.' },
          { zh: '用卷星币可以兑换装扮、游戏道具，还有抽卡的星尘。', en: 'With coins you can get outfits, game items and stardust for card draws.' },
          { zh: '小提示：完成剧情和学习任务会奖励卷星币，别乱花哦！', en: 'Tip: story and lesson tasks reward coins — spend them wisely!' },
        ],
        text: { zh: '欢迎光临！铁砣给你发了卷星币，来看看能换点什么。', en: 'Welcome! Chief Tie-Tuo gave you coins. Take a look around.' },
        task: { zh: '和补给站老板铛铛聊聊', en: 'Talk with store owner Dang-Dang' },
        rule: 'visitStore',
        reward: 5,
      },
    ],
  },
  {
    id: 'ch4',
    no: '第4章',
    title: { zh: '星核档案库', en: 'Star Archive' },
    unlockStars: 3,
    nodes: [
      {
        id: 'c4-1',
        chapterId: 'ch4',
        title: { zh: '初访星核档案库', en: 'First Visit the Archive' },
        npc: '晶晶',
        lines: [
          { zh: '欢迎来到星核档案库，我是档案员晶晶。', en: 'Welcome to the Star Archive. I am Jing-Jing the archivist.' },
          { zh: '卷星的星光，藏在一个个被记住的故事里。', en: 'Juan Star’s light lives in stories that are remembered.' },
          { zh: '可乌乌怪把故事卡片偷走了……它们散落在卷星各处。', en: 'But Gloom Gremlins stole the story cards… they’re scattered across Juan Star.' },
          { zh: '如果你想帮忙，就收集这些卡片，把它们一格格拼回档案库吧。', en: 'If you want to help, collect the cards and place them back into the archive.' },
        ],
        text: { zh: '档案库的卡片散落了，去晶晶那儿了解怎么收集吧。', en: 'The archive cards are scattered. Ask Jing-Jing how to collect them.' },
        task: { zh: '找档案管理员晶晶聊聊', en: 'Talk with archivist Jing-Jing' },
        rule: 'visitLibrary',
        reward: 6,
      },
    ],
  },
  {
    id: 'ch5',
    no: '第5章',
    title: { zh: '夜幕远征', en: 'Night Expedition' },
    unlockStars: 4,
    nodes: [
      {
        id: 'c5-1',
        chapterId: 'ch5',
        title: { zh: '收集远征战利品', en: 'Collect Expedition Loot' },
        npc: '铁砣',
        text: { zh: '远征队带回战利品啦！回到首页，点卷星就能收取。', en: 'The fleet is back with loot! Go to home and tap Juan Star to collect.' },
        task: { zh: '回首页点击卷星，收集远征战利品', en: 'Back home, tap Juan Star to collect expedition loot' },
        rule: 'collectLoot',
        reward: 6,
      },
    ],
  },
  {
    id: 'ch6',
    no: '第6章',
    title: { zh: '认识小卷', en: 'Meet Xiao Juan' },
    unlockStars: 5,
    nodes: [
      {
        id: 'c6-1',
        chapterId: 'ch6',
        title: { zh: '小卷的自我介绍', en: 'Xiao Juan’s Intro' },
        npc: '小卷',
        lines: [
          { zh: '你好呀，我是你的语音助手小卷！', en: 'Hi! I’m your voice assistant Xiao Juan!' },
          { zh: '你可以问我：这个字怎么读、给我讲个成语故事、帮我出几道口算题。', en: 'Ask me: how to read a word, tell a fable, or make some math drills.' },
          { zh: '点右下角的小卷，或喊一句「小卷 小卷」，我就能随时帮你啦！', en: 'Tap the little Xiao Juan, or say “Xiao Juan” to call me anytime!' },
        ],
        text: { zh: '小卷想介绍自己给你认识。', en: 'Xiao Juan wants to introduce herself.' },
        task: { zh: '认识小卷，了解她的功能', en: 'Meet Xiao Juan and learn what she can do' },
        rule: 'visitBuddy',
        reward: 8,
      },
    ],
  },
];

/** 剧情节点 → 卷星上的解锁贴图目标（用于“解除封印”动画）
 *  '/map' 学校建筑 · '/lobby' 空中乐园 · '/store' 补给站 · '/profile' 总部
 *  'core' = 卷星中心（生长/点灯通用反馈，用于非建筑类节点） */
export const STORY_UNLOCK_TARGET: Record<string, string> = {
  p1: '/profile',
  'c1-1': '/map',
  'c1-2': 'core',
  'c2-1': '/lobby',
  'c2-2': 'core',
  'c3-1': '/store',
  'c4-1': '/profile',   // 星核档案库 → 总部点亮
  'c5-1': '/profile',   // 夜幕远征 → 总部点亮
  'c6-1': 'core',       // 小卷悄悄话 → 卷星中心点灯
};

export function unlockTargetOf(nodeId: string): string {
  return STORY_UNLOCK_TARGET[nodeId] ?? 'core';
}

/** 展开为有序节点列表（用于顺序解锁：只可推进到"第一个未完成"节点） */
export function allNodes(): StoryNode[] {
  const list: StoryNode[] = [];
  for (const ch of STORY) for (const n of ch.nodes) list.push(n);
  return list;
}

export function chapterById(id: string): StoryChapter | undefined {
  return STORY.find((c) => c.id === id);
}
