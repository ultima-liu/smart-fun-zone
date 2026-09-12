/** NPC 元数据：虚拟形象（emoji 头像）+ 无剧情时的固定闲聊语料 + 人物档案 */

export interface NpcMeta {
  icon: string;
  name: { zh: string; en: string };
  chitchat: { zh: string; en: string }[];
  /* —— 人物细化档案 —— */
  gender?: { zh: string; en: string };
  age?: number;
  personality?: { zh: string; en: string };
  role?: { zh: string; en: string };
  backstory?: { zh: string; en: string };
}

export const NPCS: Record<string, NpcMeta> = {
  阿光: {
    icon: '🦉',
    name: { zh: '星校长阿光', en: 'Principal A-Guang' },
    gender: { zh: '男', en: 'Male' },
    age: 48,
    personality: {
      zh: '温和博学、慈祥爱鼓励，有点爱唠叨，坚信每个孩子都能发光。',
      en: 'Gentle, learned and encouraging. A little chatty, and sure every child can shine.',
    },
    role: {
      zh: '卷星星际小学校长 · 课程管理员（学校技能向导）',
      en: 'Principal of Juan Star Interstellar Primary · course keeper & school guide',
    },
    backstory: {
      zh: '年轻时是一名星际航行者，走遍各星球收集“知识星光”。退休后把毕生所学带回卷星，创办了这所面向孩子们的小学。他常说：“认真，是点亮星光最强的能量。”',
      en: 'A former star-faring explorer who gathered “knowledge starlight” across the galaxy. After retiring he founded the school, often saying: “Earnestness is the strongest energy to light up a star.”',
    },
    chitchat: [
      { zh: '今天也要把知识装进小脑袋里哦！', en: 'Fill your head with knowledge today!' },
      { zh: '星光会因为你认真上课而更亮哦。', en: 'Star-light shines brighter when you study well.' },
      { zh: '乌乌怪最怕认真的人，加油！', en: 'Gloom Gremlins fear hard workers. Go!' },
      { zh: '错题不可怕，多看几遍就记住了。', en: 'Mistakes are fine—review and you will remember.' },
    ],
  },
  泡泡: {
    icon: '🎈',
    name: { zh: '乐园主泡泡', en: 'Park Master Pao-Pao' },
    gender: { zh: '女', en: 'Female' },
    age: 16,
    personality: {
      zh: '活泼开朗、爱笑爱玩，好胜心强、偶尔撒娇，是卷星最会玩的孩子王。',
      en: 'Bubbly, playful and cheerful—a little competitive, sometimes pouty. The most fun-loving kid on Juan Star.',
    },
    role: {
      zh: '卷星乐园管理员 · 游戏向导（休闲区入口）',
      en: 'Park keeper & game guide for Juan Star Park',
    },
    backstory: {
      zh: '把一座废弃的星尘矿场改造成了欢乐乐园。她的笑声有魔力，能让乐园的灯一盏盏亮起来——这也是“笑一笑，灯就亮了”的由来。',
      en: 'She turned a derelict stardust mine into a joyful park. Her laughter is magic—every giggle lights another lamp in the park.',
    },
    chitchat: [
      { zh: '笑一笑，乐园的灯就会亮一盏！', en: 'Smile and another light in the park lights up!' },
      { zh: '玩也要玩得认真，才叫勇气哦。', en: 'Play with heart—that is real courage.' },
      { zh: '要不要再来一局？嘻嘻。', en: 'One more round? Hee hee.' },
      { zh: '你的笑声是乐园最好的星星！', en: 'Your laughter is the park\u2019s best star!' },
    ],
  },
  铛铛: {
    icon: '🧺',
    name: { zh: '补给站老板铛铛', en: 'Shop Owner Dang-Dang' },
    gender: { zh: '女', en: 'Female' },
    age: 35,
    personality: {
      zh: '精明热情、爱分享、会算账，嘴上总说不送、心里却最软。',
      en: 'Smart, warm and generous with advice; loves doing the math. Says never free, but has the softest heart.',
    },
    role: {
      zh: '补给站老板 · 装扮/徽章/道具/奖励兑换管理员（商店入口）',
      en: 'Supply-station owner in charge of outfits, badges, items & reward redemption',
    },
    backstory: {
      zh: '早年是跑遍各大星港的星际商人，倒腾“星际好物”为生。被小朋友们的笑容打动后留在卷星开起补给站，进货时永远先想着孩子们喜欢什么。',
      en: 'A wandering space merchant trading “galactic goods.” Moved by kids’ smiles, she settled on Juan Star to run the shop—always stocking what children love first.',
    },
    chitchat: [
      { zh: '今天补给站新到了好东西哦！', en: 'New goods just arrived today!' },
      { zh: '卷星币要花在喜欢的东西上～', en: 'Spend coins on what you love~' },
      { zh: '听说完成任务会有神秘奖励。', en: 'I heard quests give mystery rewards.' },
      { zh: '想换装扮吗？我帮你留个位置！', en: 'Want an outfit? I will save you one!' },
    ],
  },
  铁砣: {
    icon: '🛠️',
    name: { zh: '总指挥官铁砣', en: 'Commander Tie-Tuo' },
    gender: { zh: '男', en: 'Male' },
    age: 45,
    personality: {
      zh: '严肃可靠、纪律严明，外冷内热、爱护孩子，常在无人时偷偷关心。',
      en: 'Stoic, disciplined and dependable—cool outside, warm inside; quietly looks after everyone.',
    },
    role: {
      zh: '卷星总指挥官 · 远征/飞船/勋章档案管理员（总部入口）',
      en: 'Commander of Juan Star, overseeing expeditions, the ship & badge archives',
    },
    backstory: {
      zh: '卷星防卫军退役舰长，曾在抵御乌乌怪入侵时立下大功，如今坐镇总部，负责孩子的成长档案与远征安全。夜里常悄悄为孩子们的勋章擦拭灰尘。',
      en: 'A retired defensive-fleet captain famed for defending Juan Star. Now he guards HQ, keeping kids’ growth records and expedition safety—and polishing their badges late at night.',
    },
    chitchat: [
      { zh: '卷星的秩序，就靠大家自觉啦。', en: 'Order in Juan Star relies on everyone.' },
      { zh: '你的勋章越来越多了，我记着呢。', en: 'I am tracking your growing badges.' },
      { zh: '远征之前记得检查飞船哦。', en: 'Check your ship before expeditions.' },
      { zh: '总部永远为你开放。', en: 'HQ is always open for you.' },
    ],
  },
  小卷: {
    icon: '⭐',
    name: { zh: '小卷', en: 'Xiao Juan' },
    personality: {
      zh: '天真好奇、乐观开朗，最爱问“为什么”，像一颗会发光的问号。',
      en: 'Curious, bright and upbeat; always asking “why?” like a glowing question mark.',
    },
    role: {
      zh: '新手向导 · 卷星守护星灵（任务与成长跟随）',
      en: 'Newcomer guide & guardian star-spirit of Juan Star (quest & growth companion)',
    },
    backstory: {
      zh: '由卷星上空一枚星核苏醒而成的星灵，专门引导初来卷星的小宇航员。小卷不属于任何性别或人类年龄，而是以星光、彗尾与好奇心为形；总把“一步一步来”挂在嘴边。',
      en: 'A star-spirit awakened from a star core above Juan Star, guiding newly arrived young astronauts. Xiao Juan has no gender or human age, taking the form of starlight, comet tails and curiosity; always saying “one step at a time.”',
    },
    chitchat: [
      { zh: '跟着任务条走，一步一步来！', en: 'Follow the quest bar, step by step!' },
      { zh: '有事随时找我聊天呀。', en: 'You can chat with me anytime.' },
      { zh: '卷星今天也因为你亮了一点！', en: 'Juan Star is a little brighter thanks to you!' },
      { zh: '我不会迷路的，你也不会！', en: 'I never get lost—neither will you!' },
    ],
  },
  晶晶: {
    icon: '🔮',
    name: { zh: '档案员晶晶', en: 'Archivist Jing-Jing' },
    personality: {
      zh: '细心安静、记忆力惊人，喜欢把每一次努力都好好收进档案。',
      en: 'Careful, quiet and remarkably observant, delighting in preserving every effort in the archive.',
    },
    role: {
      zh: '星核档案库档案员 · 图鉴与收藏向导',
      en: 'Archivist of the Star Archive · card collection guide',
    },
    backstory: {
      zh: '由档案库最早的一枚星核碎片凝成的晶簇精灵。晶晶会把孩子在卷星留下的成长闪光收进档案，也会指引大家找回散落的图鉴卡。',
      en: 'A crystal spirit formed from one of the archive’s earliest star-core shards. Jing-Jing stores every glimmer of a child’s growth and helps recover scattered collection cards.',
    },
    chitchat: [
      { zh: '每一张卡，都是一次努力留下的星光记录。', en: 'Every card records a glimmer from a moment of effort.' },
      { zh: '图鉴卡散落在卷星各处，慢慢收集就好。', en: 'Archive cards are scattered across Juan Star—collect them at your own pace.' },
      { zh: '重复的卡片也会变成星尘，继续前进吧。', en: 'Duplicate cards become stardust. Keep going!' },
      { zh: '我已经把你新得到的星光好好归档啦。', en: 'I have carefully filed your newest starlight.' },
    ],
  },
};

export function npcMeta(name: string): NpcMeta {
  return NPCS[name] ?? { icon: '⭐', name: { zh: name, en: name }, chitchat: [] };
}
