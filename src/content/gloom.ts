/** 乌乌怪（Gloom Gremlins）设定数据：外貌 / 定位 / 弱点 / 配色 */

export type GloomRank = 'minion' | 'elite' | 'boss';

export interface GloomMeta {
  id: string;
  name: { zh: string; en: string };
  rank: GloomRank;
  icon: string;
  /** 外貌特点 */
  appearance: { zh: string; en: string };
  /** 角色定位（在玩法中对应什么坏习惯/错误） */
  role: { zh: string; en: string };
  /** 弱点（如何击败） */
  weakness: { zh: string; en: string };
  /** 口头禅 */
  taunt: { zh: string; en: string };
  /** 立绘配色：主色 / 辅色 / 高光 */
  palette: [string, string, string];
}

export const GLOOMS: GloomMeta[] = [
  {
    id: 'gloom-mist',
    name: { zh: '迷雾乌', en: 'Misty Gloom' },
    rank: 'minion',
    icon: '🌫️',
    appearance: {
      zh: '一团紫灰色的雾团，像融化了一半的棉花糖；边缘不断滴下灰色小水珠。两只一大小半睁的困倦眼，嘴角下撇，头顶永远顶着一朵小乌云，走起路来飘忽不定。',
      en: 'A violet-grey puff of fog, like a half-melted marshmallow, dripping grey droplets from its edges. Two sleepy mismatched eyes, a drooping mouth, and a tiny storm cloud stuck above its head.',
    },
    role: {
      zh: '在校舍与课本之间吐雾，专门让人“看不清题目”——读题晃神、漏看要求，是学校里的常见杂兵。',
      en: 'Belches fog around books so kids “cannot read the question”—dazed reading and missed requirements. The common minion of the school.',
    },
    weakness: {
      zh: '大声朗读 + 圈出关键词。把题目读出声、圈住重点，雾气立刻散开；明亮的星光会让它缩成一滴水。',
      en: 'Read aloud and circle key words—reciting the question clears the fog; bright starlight shrinks it to a droplet.',
    },
    taunt: { zh: '看不清吧？看不清就别写了～', en: 'Can’t see it? Then don’t bother~' },
    palette: ['#8f86c9', '#c9c4ee', '#f2f0ff'],
  },
  {
    id: 'gloom-dawdle',
    name: { zh: '拖延乌', en: 'Dawdle Gloom' },
    rank: 'minion',
    icon: '⏳',
    appearance: {
      zh: '灰毛树懒与抱枕的混合体，背着一只被它按停的大闹钟，肚皮上浮着“待会儿”三个字。眼睛常年闭着打呼，四条短腿软趴趴，一碰就往后倒。',
      en: 'Half sloth, half cushion, carrying a stopped alarm clock on its back and the words “later” floating on its belly. Always snoring, with four floppy legs that fall backwards at a touch.',
    },
    role: {
      zh: '出现在任务开始之前，把“马上做”变成“等会儿做”，专门拖慢行动、消磨时间。',
      en: 'Appears right before a task and turns “now” into “later,” slowing every start.',
    },
    weakness: {
      zh: '立刻开始（先做 5 分钟）。只要孩子动手，它背上的闹钟就重新走动，指针一响便把它弹飞。',
      en: 'Just start—five minutes is enough. The moment a kid begins, its clock ticks again and flings it away.',
    },
    taunt: { zh: '再玩一会儿嘛，作业明天也来得及～', en: 'One more minute—homework can wait~' },
    palette: ['#9aa0b0', '#cfd5e2', '#f4f6fb'],
  },
  {
    id: 'gloom-sloppy',
    name: { zh: '马虎乌', en: 'Sloppy Gloom' },
    rank: 'elite',
    icon: '🩹',
    appearance: {
      zh: '长着三只眼睛却各看一个方向，身体贴满写错的答案、橡皮屑和撕掉一角的草稿纸；尾巴歪成问号，末端系着一个打歪的蝴蝶结；两只细长的手总在乱擦乱改。',
      en: 'Three eyes, each looking a different way; its body is plastered with wrong answers, eraser crumbs and torn scratch paper. Its tail curls into a question mark tied with a crooked bow.',
    },
    role: {
      zh: '制造“看错、抄错、漏题、算错”——是错题本的主要来源，也是最会伪装的乌乌怪。',
      en: 'Causes misreads, mis-transcriptions and dropped questions—the main source of the mistake book, and the best disguised gremlin.',
    },
    weakness: {
      zh: '逐字检查 + 复算一遍。认真检查时它的三只眼会同时对上，随即被自己缠住打结。',
      en: 'Check character by character and recompute. When a kid truly checks, its three eyes align and it ties itself in knots.',
    },
    taunt: { zh: '差不多就行啦，谁在乎那一个零～', en: 'Close enough—who cares about one little zero~' },
    palette: ['#e0938f', '#f6c9c2', '#fff3f1'],
  },
  {
    id: 'gloom-fidget',
    name: { zh: '分心乌', en: 'Fidget Gloom' },
    rank: 'elite',
    icon: '🌀',
    appearance: {
      zh: '圆滚滚像一颗弹跳球，浑身伸出无数小手小脚，手里攥着陀螺、泡泡水和小喇叭；头顶一只彩色风车疯狂旋转，转得人眼花，自己却越转越兴奋。',
      en: 'A bouncy round body with countless little hands and feet clutching tops, bubble wands and toy horns. A rainbow pinwheel spins madly on its head, dizzying everyone but itself.',
    },
    role: {
      zh: '在写作业、上课时钻进耳朵，把注意力拽走，让“再玩一下”盖过“先做完”。',
      en: 'Wriggles into ears during class or homework, dragging attention away so “one more play” beats “finish first.”',
    },
    weakness: {
      zh: '专注计时（番茄钟）+ 收好玩具。环境一安静、计时一开始，它的风车停转，所有小手小脚被定住。',
      en: 'Focused timing and tidying toys away—once the room is quiet and the timer starts, its pinwheel stops and every limb freezes.',
    },
    taunt: { zh: '看这里看这里！这个更好玩！', en: 'Look here! This is way more fun!' },
    palette: ['#f2b158', '#ffe0a8', '#fff8ec'],
  },
  {
    id: 'gloom-quitter',
    name: { zh: '乌乌王（放弃乌）', en: 'Quitter Gloom King' },
    rank: 'boss',
    icon: '👑',
    appearance: {
      zh: '巨大的黑色毛绒怪，头顶一顶歪掉的破王冠，身体由无数小乌乌怪挤压拼成，缝线处透出幽紫光；胸口有一道碎裂的星形旧伤——那是当年被铁砣击中留下的痕迹。声音低沉带回声，走近时灯光会变暗。',
      en: 'A huge black plush monster in a crooked, broken crown, its body stitched from countless lesser gremlins with violet light leaking through the seams. A cracked star-shaped scar glows on its chest—the mark of Tie-Tuo’s old blow.',
    },
    role: {
      zh: '最终 BOSS。只在孩子遇到难题、连续答错、累了想哭的时候现身，贴着耳朵说“你不行，放弃吧”。',
      en: 'The final boss. It appears only when a kid meets a hard problem, misses several times, or is tired and tearful—whispering “you can’t, just quit.”',
    },
    weakness: {
      zh: '坚持与求助。连续再试一次、请老师家长帮忙、把错题重做，它胸口的星形伤就越亮；光聚满时王冠落地、身体碎裂，化作星尘。',
      en: 'Persistence and asking for help. Trying again, asking a grown-up, redoing a mistake—each makes its star scar brighter until the crown falls and it shatters into stardust.',
    },
    taunt: { zh: '这么难，你肯定做不到的。', en: 'Too hard. You will never make it.' },
    palette: ['#4a3f7a', '#2a2350', '#b9a8ff'],
  },
];

/** 通用设定说明 */
export const GLOOM_LORE = {
  origin: {
    zh: '乌乌怪由“坏习惯与负面情绪”滋生：分心、拖延、马虎、放弃……它们并不邪恶，只是被养大了。',
    en: 'Gloom Gremlins breed from bad habits and dark moods: distraction, dawdling, carelessness, giving up. They are not evil—just overfed.',
  },
  law: {
    zh: '乌乌怪最怕“认真的星光”。孩子每认真一次，卷星的星光就亮一分，乌乌怪就弱一分。',
    en: 'Gloom Gremlins dread the starlight of earnestness. Every honest effort brightens Juan Star and weakens them.',
  },
  drop: {
    zh: '被击败的乌乌怪会化作星尘与星屑，可用于星尘召唤与飞船升级。',
    en: 'Defeated gremlins turn into card shards and stardust, used for summons and ship upgrades.',
  },
};

export function gloomById(id: string): GloomMeta | undefined {
  return GLOOMS.find((g) => g.id === id);
}
