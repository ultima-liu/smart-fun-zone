/** NPC 元数据：虚拟形象（emoji 头像）+ 无剧情时的固定闲聊语料 */

export interface NpcMeta {
  icon: string;
  name: { zh: string; en: string };
  chitchat: { zh: string; en: string }[];
}

export const NPCS: Record<string, NpcMeta> = {
  阿光: {
    icon: '🦉',
    name: { zh: '星校长阿光', en: 'Principal A-Guang' },
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
    chitchat: [
      { zh: '跟着任务条走，一步一步来！', en: 'Follow the quest bar, step by step!' },
      { zh: '有事随时找我聊天呀。', en: 'You can chat with me anytime.' },
      { zh: '卷星今天也因为你亮了一点！', en: 'Juan Star is a little brighter thanks to you!' },
      { zh: '我不会迷路的，你也不会！', en: 'I never get lost—neither will you!' },
    ],
  },
};

export function npcMeta(name: string): NpcMeta {
  return NPCS[name] ?? { icon: '⭐', name: { zh: name, en: name }, chitchat: [] };
}
