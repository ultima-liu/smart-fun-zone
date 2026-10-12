import type { EnglishQuiz } from './englishGrade3Upper';

export type EnglishOriginalActivity = { lessonId: string; kind: 'meaning' | 'sound' | 'open'; prompt: string; quiz?: EnglishQuiz; criteria?: string[] };
const quiz = (question: string, options: string[], answer: string, explain: string): EnglishQuiz => ({ question, options, answer, explain });
const SONG_CHECKS: Record<string, EnglishQuiz> = {
  friends: quiz('歌曲中的朋友见面后一起做什么？', ['握手并玩游戏', '只挥手告别', '询问年龄'], '握手并玩游戏', 'Shake my hand 和 Let’s play a game 把见面问候与共同活动连起来。'),
  families: quiz('歌曲里的孩子和哪些人一起？', ['家里的亲人', '新来的同学', '商店里的顾客'], '家里的亲人', '歌曲反复用 I am with … 描述与家人一起。'),
  plants: quiz('歌曲里植物给人的是什么？', ['空气和食物', '阳光和浇水', '水果和彩笔'], '空气和食物', 'Plants can give me air / food；浇水和提供阳光是照料植物的方向。'),
  colours: quiz('歌曲中 stop、wait、go 说明颜色还能做什么？', ['传递行动提示', '表示物品价格', '表示家庭人数'], '传递行动提示', '歌曲把颜色与行动信息联系起来；现实行动还要看具体标志。'),
  numbers: quiz('歌声里的 count up 和 count back 指什么？', ['顺数和倒数', '只问年龄', '只报价格'], '顺数和倒数', '从 one 到 ten 与倒回来是不同的计数方向。'),
};

export function englishOriginalActivity(clipKey: string): EnglishOriginalActivity | undefined {
  const unitId = clipKey.split('-')[0];
  if (clipKey.endsWith('-opening-song') && SONG_CHECKS[unitId]) return { lessonId: `${unitId}-opening`, kind: 'meaning', prompt: '先听原声，再回答歌曲里的信息。', quiz: SONG_CHECKS[unitId] };
  if (clipKey === 'families-a-finger-song') return { lessonId: 'families-a', kind: 'meaning', prompt: '听手指歌中的问候。', quiz: quiz('歌里 Where are you? 后，用什么方式介绍角色？', ['This is my …', 'I like …', 'How many …'], 'This is my …', '歌里的 This is my daddy / mummy … 用来介绍家人。') };
  if (clipKey === 'friends-b-chant') return { lessonId: 'friends-b', kind: 'meaning', prompt: '听歌谣，把友好行动找出来。', quiz: quiz('歌谣里的好朋友怎样对待别人？', ['倾听、微笑、帮助和分享', '只问姓名，不再相处', '只一起玩，不倾听'], '倾听、微笑、帮助和分享', 'listen、smile、help、share 是歌谣中的行动。') };
  if (clipKey === 'families-b-chant') return { lessonId: 'families-b', kind: 'open', prompt: '听家人歌谣，说出你听到的两种成员称呼。', criteria: ['确实说出了录音里的两种成员称呼', '与教材参考原声的实际内容对应', '尝试跟上歌谣中的停顿与节奏'] };
  if (clipKey.endsWith('-letters-sounds')) return { lessonId: `${unitId}-letters`, kind: 'sound', prompt: '跟听原声中的一组字母与例词，指出声音出现的位置，再读一组例词。', criteria: ['在原声中辨认字母名与词中声音', '指出声音在词首、词中或词尾的位置', '实际录音中的例词读音与教材对应'] };
  if (clipKey.endsWith('-project-listening')) return { lessonId: `${unitId}-project`, kind: 'open', prompt: '听项目原声，把确实听到的人物、关系、颜色或数量说清楚；没听清可以重听。', criteria: ['说出原声中确实听到的一条信息', '提交内容与参考原声对应，未依据图片猜答案', '区分人物与关系、数量与年龄或物品与颜色'] };
  if (clipKey.startsWith('revision-')) return { lessonId: clipKey.includes('guest-act') ? 'guest-act' : 'guest-observe', kind: 'open', prompt: '听做客原声，说出一组前后能够接上的表达，并与同伴演一遍。', criteria: ['听到两句前后能够接上的表达', '与教材参考原声的实际内容对应', '按做客场景的顺序接话'] };
  return undefined;
}
