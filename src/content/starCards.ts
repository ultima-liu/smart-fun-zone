/**
 * 星核档案库 · 卡牌数据与抽卡规则
 * 收录卷星各套系的收藏卡
 */

export type CardRarity = 'R' | 'SR' | 'SSR' | 'SP';
export type CardSetId = 'npc' | 'brook' | 'bruco' | 'monster' | 'ship' | 'mystery' | 'outfit' | 'badge' | 'game' | 'hanzi';

export interface HanziTeaching {
  /** 对应的语文课；完成该课时作为学习奖励直接点亮。 */
  lessonId: string;
  character: string;
  pinyin: string;
  radical: { zh: string; en: string };
  strokes: number;
  structure: { zh: string; en: string };
  meaning: { zh: string; en: string };
  words: { word: string; pinyin: string; meaning: { zh: string; en: string } }[];
  writingTip: { zh: string; en: string };
}

export interface StarCard {
  id: string;
  setId: CardSetId;
  rarity: CardRarity;
  no: number;
  name: { zh: string; en: string };
  quote: { zh: string; en: string };
  desc: { zh: string; en: string };
  /** 立绘主题：人物 / 物品 / 场景 */
  role: 'figure' | 'item' | 'scene' | 'hanzi';
  /** 配色：主色 / 辅色 / 高光 */
  palette: [string, string, string];
  /** 汉字卡专用教学信息。 */
  hanzi?: HanziTeaching;
}

export interface CardSet {
  id: CardSetId;
  icon: string;
  name: { zh: string; en: string };
  color: string;
  rewardBeans: number;
}

export const CARD_SETS: CardSet[] = [
  { id: 'npc', icon: '👤', name: { zh: '卷星人', en: 'NPC' }, color: '#8b7bf0', rewardBeans: 500 },
  { id: 'brook', icon: '✦', name: { zh: '星航协作队', en: 'Starlight Crew' }, color: '#42a5ff', rewardBeans: 500 },
  { id: 'bruco', icon: '🤖', name: { zh: '布鲁克战队', en: 'Bruco Team' }, color: '#ed4c58', rewardBeans: 300 },
  { id: 'monster', icon: '👾', name: { zh: '乌乌怪', en: 'Gloom Gremlins' }, color: '#ff73b8', rewardBeans: 500 },
  { id: 'ship', icon: '🚀', name: { zh: '舰船', en: 'Ships' }, color: '#4aa3ff', rewardBeans: 500 },
  { id: 'mystery', icon: '🔮', name: { zh: '神秘·剧情物品', en: 'Mystery' }, color: '#f6c24a', rewardBeans: 500 },
  { id: 'outfit', icon: '👗', name: { zh: '装扮', en: 'Outfits' }, color: '#20c4a5', rewardBeans: 500 },
  { id: 'badge', icon: '🎖️', name: { zh: '徽章', en: 'Badges' }, color: '#ff9d3c', rewardBeans: 500 },
  { id: 'game', icon: '🎮', name: { zh: '游戏', en: 'Games' }, color: '#3bd89e', rewardBeans: 500 },
  { id: 'hanzi', icon: '字', name: { zh: '汉字', en: 'Chinese Characters' }, color: '#e45c48', rewardBeans: 300 },
];

export const STAR_CARDS: StarCard[] = [
  /* —— 卷星人（NPC）—— */
  {
    id: 'npc-a-guang', setId: 'npc', rarity: 'SP', no: 1,
    name: { zh: '星校长·阿光', en: 'Principal A-Guang' },
    quote: { zh: '认真，是点亮星光最强的能量。', en: 'Earnestness is the strongest energy to light up a star.' },
    desc: { zh: '温和博学的校长。曾是星际航行者，收集各星球的“知识星光”后创办卷星小学，把毕生所学教给孩子，坚信每个孩子都能发光。', en: 'A gentle, learned principal. Once a star-faring explorer who gathered “knowledge starlight” across the galaxy, he founded the school, sure every child can shine.' },
    role: 'figure', palette: ['#f6cd72', '#ffe9b8', '#fffef6'],
  },
  {
    id: 'npc-tie-tuo', setId: 'npc', rarity: 'SSR', no: 2,
    name: { zh: '总指挥官·铁砣', en: 'Commander Tie-Tuo' },
    quote: { zh: '卷星的秩序，就靠大家自觉啦。', en: 'Order in Juan Star relies on everyone.' },
    desc: { zh: '严肃可靠的总指挥官，退役舰长。曾抵御乌乌怪入侵立下大功，如今坐镇总部掌管远征与勋章档案，夜里常悄悄为孩子们的勋章擦拭灰尘。', en: 'A stoic, dependable commander and retired fleet captain. Famed for defending Juan Star, he now guards HQ and the badge archives, quietly polishing kids’ badges late at night.' },
    role: 'figure', palette: ['#5b4ad0', '#3a4a8f', '#dfe6ff'],
  },
  {
    id: 'npc-dang-dang', setId: 'npc', rarity: 'SR', no: 3,
    name: { zh: '补给站老板·铛铛', en: 'Shopkeeper Dang-Dang' },
    quote: { zh: '今天补给站新到了好东西哦！', en: 'New goods just arrived today!' },
    desc: { zh: '精明热情的补给站老板。早年是跑遍各大星港的星际商人，被孩子的笑容打动而留在卷星开店，嘴上总说不送、心里最软，进货永远先想孩子喜欢什么。', en: 'A smart, warm supply-station owner. A wandering space merchant, she settled on Juan Star after being moved by kids’ smiles—soft-hearted, always stocking what children love first.' },
    role: 'figure', palette: ['#43c6ff', '#a8e6ff', '#eaffff'],
  },
  {
    id: 'npc-pao-pao', setId: 'npc', rarity: 'SR', no: 4,
    name: { zh: '乐园主·泡泡', en: 'Park Master Pao-Pao' },
    quote: { zh: '笑一笑，乐园的灯就会亮一盏！', en: 'Smile and another light in the park lights up!' },
    desc: { zh: '活泼开朗的乐园主，卷星最会玩的孩子王。她把废弃的星尘矿场改造成欢乐乐园，笑声有魔力，能让乐园的灯一盏盏亮起来。', en: 'A bubbly, playful park master—the most fun-loving kid on Juan Star. She turned a derelict stardust mine into a joyful park; her laughter is magic, lighting lamps one by one.' },
    role: 'figure', palette: ['#ff9ac2', '#ffd1e3', '#fff0f6'],
  },
  {
    id: 'npc-xiao-juan', setId: 'npc', rarity: 'R', no: 5,
    name: { zh: '守护星灵·小卷', en: 'Guardian Star Spirit Xiao Juan' },
    quote: { zh: '跟着任务条走，一步一步来！', en: 'Follow the quest bar, step by step!' },
    desc: { zh: '由卷星星核科技唤醒的学习助手机器人。小卷没有性别与人类年龄，拥有会眨眼的星光屏幕、感应天线和轻型悬浮外壳；专门引导初来卷星的小宇航员，总把“一步一步来”挂在嘴边。', en: 'A learning-assistant robot awakened by Juan Star core technology. Xiao Juan has no gender or human age, with a blinking starlight display, sensor antenna and lightweight hovering shell; guiding new astronauts one step at a time.' },
    role: 'figure', palette: ['#3bd89e', '#aef0d8', '#effff8'],
  },
  {
    id: 'npc-jing-jing', setId: 'npc', rarity: 'SR', no: 6,
    name: { zh: '档案员·晶晶', en: 'Archivist Jing-Jing' },
    quote: { zh: '每一张卡，都是一次努力留下的星光记录。', en: 'Every card preserves a shining record of your effort.' },
    desc: { zh: '细心安静的晶簇精灵，由星核档案库最早的一枚星核碎片凝成。晶晶以悬浮的棱镜档案核、书页光环与星卡碎片示人，收藏并守护孩子在卷星留下的每一次成长闪光。', en: 'A careful, quiet crystal-cluster spirit formed from the Archive Vault’s first star-core fragment. With a prism archive core, page halo and card shards, Jing-Jing preserves every glimmer of growth left on Juan Star.' },
    role: 'figure', palette: ['#b99af6', '#e9e0ff', '#f9e48b'],
  },
  /* —— 星航协作队（原创角色套系）—— */
  {
    id: 'brook-captain', setId: 'brook', rarity: 'SP', no: 1,
    name: { zh: '星航·队长', en: 'Star Captain' },
    quote: { zh: '先看清方向，再一起出发！', en: 'Find the direction, then set off together!' },
    desc: { zh: '星航协作队的队长，也是最擅长把复杂任务画成清晰路线的人。他的星盘会把散落的线索连成航线；遇到分歧时，他总会先听完每位队员的想法，再下达出发指令。', en: 'Captain of the Starlight Crew and a master at turning a difficult mission into a clear route. His star compass joins scattered clues into a course; he listens to every teammate before giving the launch call.' },
    role: 'figure', palette: ['#306fc9', '#7fbfff', '#ffe49a'],
  },
  {
    id: 'brook-xing-shan', setId: 'brook', rarity: 'SSR', no: 2,
    name: { zh: '星闪·信号侦察员', en: 'Xing-Shan · Signal Scout' },
    quote: { zh: '听，星光正在告诉我们答案。', en: 'Listen—the starlight is giving us a clue.' },
    desc: { zh: '行动最快的信号侦察员。星闪能把远处微弱的星光讯号织成可读的星图，也会用光杖为同伴标出安全路径。她相信观察不是匆匆看一眼，而是发现别人还没发现的细节。', en: 'The team’s quickest signal scout. Xing-Shan turns faint starlight messages into readable maps and marks safe paths with her light baton. To her, observing means noticing the detail everyone else missed.' },
    role: 'figure', palette: ['#f17d5e', '#ffc180', '#fff3cf'],
  },
  {
    id: 'brook-yan-dun', setId: 'brook', rarity: 'SR', no: 3,
    name: { zh: '岩盾·守护工程师', en: 'Yan-Dun · Guardian Engineer' },
    quote: { zh: '把大家守在身后，也把难题修好。', en: 'I protect the team—and fix the hard part.' },
    desc: { zh: '负责修复、守护与装备检查的工程师。岩盾的折叠护盾既能挡住风暴，也能变成临时工作台；他会逐项确认工具是否安全，直到每一位队友都能放心向前。', en: 'The engineer in charge of repairs, protection and gear checks. Yan-Dun’s folding shield blocks a storm or becomes a workbench; he checks every tool so each teammate can move ahead with confidence.' },
    role: 'figure', palette: ['#168b7a', '#84e0c5', '#e9fff8'],
  },
  {
    id: 'brook-lu-mi', setId: 'brook', rarity: 'SSR', no: 4,
    name: { zh: '露米·晶光医师', en: 'Lu-Mi · Crystal Medic' },
    quote: { zh: '慢一点也没关系，先照顾好自己。', en: 'It is okay to slow down—care for yourself first.' },
    desc: { zh: '携带晶光药瓶与守护浮游机的医师。露米会用柔和的光核安抚受惊的星兽，也会提醒队员休息、补水和整理心情。她认为真正的勇敢，包含向同伴说“我需要帮忙”。', en: 'A medic with a crystal-light vial and guardian drones. Lu-Mi calms frightened star creatures with gentle core light and reminds teammates to rest, drink water and reset. To her, true courage includes saying, “I need help.”' },
    role: 'figure', palette: ['#55c7be', '#b7f3ea', '#f3fffd'],
  },
  /* —— 布鲁可战队（基于用户提供角色素材的独立卡牌套系）—— */
  {
    id: 'bruco-red-hero', setId: 'bruco', rarity: 'SSR', no: 1,
    name: { zh: '布布·赤红闪电', en: 'Bubu · Crimson Lightning' },
    quote: { zh: '红色星徽，准备出击！', en: 'Red star badge—ready to roll!' },
    desc: { zh: '布布与鲁鲁、可可组成布鲁可战队，肩负守护源星石的任务。需要突破时，布布会借助创新力晶块切换为“赤红闪电”形态；红色装甲与胸前星徽，是他冲在最前方的识别标志。', en: 'Bubu forms the Bruco Team with Lulu and Coco to protect the Source Star Stone. When a breakthrough is needed, he shifts into Crimson Lightning with an innovation crystal; his red armor and chest star mark the vanguard.' },
    role: 'figure', palette: ['#ed4c58', '#ff9694', '#dffaff'],
  },
  {
    id: 'bruco-lulu', setId: 'bruco', rarity: 'SSR', no: 2,
    name: { zh: '鲁鲁·冰蓝战锤', en: 'Lulu · Ice-Blue Hammer' },
    quote: { zh: '障碍清除，大家跟上！', en: 'Obstacle cleared—keep up!' },
    desc: { zh: '鲁鲁擅长工程、清障和大型装备协作。守护源星石的行动中，他能变身为“冰蓝战锤”，把难走的路变成队友可以安心通过的通道。', en: 'Lulu excels at engineering, clearance and heavy-equipment teamwork. In the Source Star Stone mission, he transforms into the Ice-Blue Hammer to make a safe way through for the team.' },
    role: 'figure', palette: ['#237fd4', '#81d8ff', '#efffff'],
  },
  {
    id: 'bruco-coco', setId: 'bruco', rarity: 'SSR', no: 3,
    name: { zh: '可可·光辉之翼', en: 'Coco · Radiant Wings' },
    quote: { zh: '天空、陆地、海面，都有救援的路！', en: 'Sky, land or sea—there is always a rescue route!' },
    desc: { zh: '可可负责多用途海陆空救援，与队友一同守护源星石。她变身为“光辉之翼”后，以轻盈的机动与准确的判断，为每次救援打开新的路线。', en: 'Coco handles multi-purpose rescue across sea, land and air while helping guard the Source Star Stone. As Radiant Wings, she opens a new route for every rescue with agile movement and sound judgment.' },
    role: 'figure', palette: ['#f0c525', '#ffe688', '#fffdf1'],
  },
  {
    id: 'bruco-purple-flight', setId: 'bruco', rarity: 'SR', no: 4,
    name: { zh: '葡萄队长', en: 'Captain Putao' },
    quote: { zh: '创新力晶块的潜力，要靠你们自己发现！', en: 'The Innovation Crystal’s potential is yours to discover!' },
    desc: { zh: '葡萄队长是布鲁可战队训练与任务中的引导者。在危客对决篇中，他向队员讲解创新力晶块仍有待开发的潜力，鼓励大家在训练和实战中找到自己的方法。', en: 'Captain Putao guides the Bruco Team through training and missions. In the Wike Showdown arc, he explains that the Innovation Crystal still has untapped potential and encourages the team to discover their own methods through practice.' },
    role: 'figure', palette: ['#6f3fd1', '#c08cff', '#fff1c8'],
  },
  {
    id: 'bruco-bronze-guard', setId: 'bruco', rarity: 'SR', no: 5,
    name: { zh: '闷闷蛋', en: 'Mumundan' },
    quote: { zh: '危客军团，出发！', en: 'Wike Corps, move out!' },
    desc: { zh: '闷闷蛋是危客军团的团长，带领危客成员与布鲁可战队争夺源星石。厚重的装甲、炮口和角状头盔体现了他正面压制与指挥作战的风格。', en: 'Mumundan is the leader of the Wike Corps, directing its attempts to seize the Source Star Stone from the Bruco Team. His heavy armor, cannon and horned helmet reflect a front-line command style.' },
    role: 'figure', palette: ['#a77942', '#e4bd75', '#fff0c8'],
  },
  {
    id: 'bruco-blue-glider', setId: 'bruco', rarity: 'R', no: 6,
    name: { zh: '吐司蛋', en: 'Toast Egg' },
    quote: { zh: '滑行突袭，瑟丝蛋，跟上！', en: 'Gliding strike—Silk Egg, follow me!' },
    desc: { zh: '吐司蛋是危客军团中的高速行动角色，擅长利用滑行装置接近目标。公开剧情中，他曾与瑟丝蛋合作对付布鲁可战队；冰蓝光翼和贴地滑行是这张卡的识别特征。', en: 'Toast Egg is a fast-moving member of the Wike Corps who closes in with a gliding rig. In the published story, he works with Silk Egg against the Bruco Team; icy fins and low gliding define this card.' },
    role: 'figure', palette: ['#1855b6', '#6ddcff', '#edffff'],
  },
  {
    id: 'bruco-red-04', setId: 'bruco', rarity: 'SR', no: 7,
    name: { zh: '瑟丝蛋', en: 'Silk Egg' },
    quote: { zh: '丝线锁定，吐司蛋，开始行动！', en: 'Thread locked—Toast Egg, begin!' },
    desc: { zh: '瑟丝蛋是危客军团的行动成员，常与吐司蛋协同制造麻烦。公开剧情中，吐司蛋与瑟丝蛋曾合作挑战布鲁可；胸前“4”号标记和炮口结构保留为视觉识别点。', en: 'Silk Egg is an operative of the Wike Corps who often works with Toast Egg. In the published story, the pair cooperate against the Bruco Team; the visible “4” mark and cannon remain this card’s identifiers.' },
    role: 'figure', palette: ['#d64640', '#fb9588', '#fff0da'],
  },
  {
    id: 'bruco-green-03', setId: 'bruco', rarity: 'SR', no: 8,
    name: { zh: '温斯蛋', en: 'Wensi Egg' },
    quote: { zh: '旋叶启动，危客军团继续推进！', en: 'Rotor online—the Wike Corps advances!' },
    desc: { zh: '温斯蛋是危客军团成员，使用绿色旋叶装备执行推进与清障任务。卡面保留其头部“3”号标记和前置旋叶；在团队行动中，他代表危客军团的机械作业力量。', en: 'Wensi Egg is a Wike Corps member who uses green rotor equipment for advance and clearance missions. The “3” head mark and forward rotor are preserved; he represents the corps’ mechanical field strength.' },
    role: 'figure', palette: ['#22a96d', '#91e6aa', '#eaffee'],
  },
  {
    id: 'bruco-blue-05', setId: 'bruco', rarity: 'R', no: 9,
    name: { zh: '福来蛋', en: 'Fulai Egg' },
    quote: { zh: '计划准备好了吗？这次一定成功！', en: 'Is the plan ready? This time we will succeed!' },
    desc: { zh: '福来蛋参与危客军团的行动，并与闷闷蛋共同谋划对付布鲁可战队。蓝色圆形机体、胸前“5”号标记与观测镜结构完整保留，体现其侦察和支援定位。', en: 'Fulai Egg takes part in Wike Corps operations and plots with Mumundan against the Bruco Team. The blue round body, “5” chest mark and scope are preserved to express a scout-and-support role.' },
    role: 'figure', palette: ['#27aee1', '#90e8fa', '#effdff'],
  },
  {
    id: 'bruco-orange-sprinter', setId: 'bruco', rarity: 'R', no: 10,
    name: { zh: '萨特蛋', en: 'Sate Egg' },
    quote: { zh: '闪电突进，别让布鲁可跑掉！', en: 'Lightning rush—don’t let the Bruco Team escape!' },
    desc: { zh: '萨特蛋是危客军团的快速突击成员。橙色装甲、闪电头饰和前冲姿态表现了他的速度型战斗风格；在危客对决中，他与其他成员共同执行阻截布鲁可的任务。', en: 'Sate Egg is a rapid-assault member of the Wike Corps. Orange armor, a lightning crest and a forward rush express his speed-focused style as he joins the corps’ attempts to intercept the Bruco Team.' },
    role: 'figure', palette: ['#d9791b', '#ffca4b', '#fff3c9'],
  },
  {
    id: 'bruco-purple-skater', setId: 'bruco', rarity: 'R', no: 11,
    name: { zh: '森森蛋', en: 'Sensen Egg' },
    quote: { zh: '升级完成，轮到我来追上你们了！', en: 'Upgrade complete—it is my turn to catch you!' },
    desc: { zh: '森森蛋是危客军团中经过强化升级的机器人。公开剧情以“机器人森森蛋强化升级，布鲁可危险了”为线索，突出他的升级形态和追击威胁；紫粉护具与轮滑装置保留为卡面特色。', en: 'Sensen Egg is an upgraded robot in the Wike Corps. Published episode material highlights his reinforced upgrade as a danger to the Bruco Team; violet-pink gear and skates remain this card’s signature.' },
    role: 'figure', palette: ['#bd4bd8', '#ef99ff', '#ffe0ff'],
  },
  /* —— 乌乌怪（怪物）—— */
  {
    id: 'mon-mist', setId: 'monster', rarity: 'R', no: 1,
    name: { zh: '迷雾乌', en: 'Misty Gloom' },
    quote: { zh: '看不清吧？看不清就别写了～', en: 'Can’t see it? Then don’t bother~' },
    desc: { zh: '一团紫灰色的雾，像融化了一半的棉花糖，边缘滴着灰色水珠。在校舍与课本间吐雾，专让人读题晃神、漏看要求。弱点是大声朗读并圈出关键词——雾气一散，它便缩成一滴水。', en: 'A violet-grey fog puff like a half-melted marshmallow, dripping grey droplets. It belches fog over books so kids misread. Weak to reading aloud and circling key words.' },
    role: 'figure', palette: ['#8f86c9', '#c9c4ee', '#f2f0ff'],
  },
  {
    id: 'mon-dawdle', setId: 'monster', rarity: 'R', no: 2,
    name: { zh: '拖延乌', en: 'Dawdle Gloom' },
    quote: { zh: '再玩一会儿嘛，作业明天也来得及～', en: 'One more minute—homework can wait~' },
    desc: { zh: '灰毛树懒与抱枕的混合体，背着一只被按停的大闹钟，肚皮上浮着“待会儿”三个字，常年闭眼打呼。它把“马上做”拖成“等会儿做”。弱点：立刻开始，先做五分钟——闹钟一响，它就被弹飞。', en: 'Half sloth, half cushion, hauling a stopped clock with “later” on its belly. It turns “now” into “later.” Weak to simply starting—five minutes and its clock flings it away.' },
    role: 'figure', palette: ['#9aa0b0', '#cfd5e2', '#f4f6fb'],
  },
  {
    id: 'mon-sloppy', setId: 'monster', rarity: 'SR', no: 3,
    name: { zh: '马虎乌', en: 'Sloppy Gloom' },
    quote: { zh: '差不多就行啦，谁在乎那一个零～', en: 'Close enough—who cares about one little zero~' },
    desc: { zh: '三只眼各看一个方向，身上贴满写错的答案、橡皮屑与撕角草稿纸，尾巴歪成问号。它制造看错、抄错、漏题，是错题本的主要来源。弱点：逐字检查并复算——三只眼一对上，它就被自己缠住打结。', en: 'Three eyes looking three ways, plastered with wrong answers and eraser crumbs, tail curled into a question mark. It causes misreads and dropped questions. Weak to careful checking—its eyes align and it ties itself in knots.' },
    role: 'figure', palette: ['#e0938f', '#f6c9c2', '#fff3f1'],
  },
  {
    id: 'mon-fidget', setId: 'monster', rarity: 'SSR', no: 4,
    name: { zh: '分心乌', en: 'Fidget Gloom' },
    quote: { zh: '看这里看这里！这个更好玩！', en: 'Look here! This is way more fun!' },
    desc: { zh: '圆滚滚像弹跳球，浑身伸出无数小手小脚，攥着陀螺、泡泡水与小喇叭，头顶彩色风车疯狂旋转。它在写作业时钻进耳朵拽走注意力。弱点：专注计时并收好玩具——风车一停，手脚全部定住。', en: 'A bouncy ball of a body with countless little limbs clutching tops, bubbles and toy horns, a rainbow pinwheel spinning madly. Weak to focused timing and tidying toys—pinwheel stops, limbs freeze.' },
    role: 'figure', palette: ['#f2b158', '#ffe0a8', '#fff8ec'],
  },
  {
    id: 'mon-quitter', setId: 'monster', rarity: 'SP', no: 5,
    name: { zh: '乌乌王', en: 'Quitter Gloom King' },
    quote: { zh: '这么难，你肯定做不到的。', en: 'Too hard. You will never make it.' },
    desc: { zh: '巨大的黑色毛绒怪，顶着歪掉的破王冠，身体由无数小乌乌怪拼成，缝线透出幽紫光；胸口一道碎裂的星形旧伤，是当年被铁砣击中留下的。它只在孩子受挫时低语“放弃吧”。弱点：坚持与求助——星伤越亮，王冠终会落地。', en: 'A huge black plush king in a crooked crown, stitched from lesser gremlins with violet light in the seams, a cracked star scar from Tie-Tuo’s blow on its chest. Weak to persistence and asking for help.' },
    role: 'figure', palette: ['#4a3f7a', '#2a2350', '#b9a8ff'],
  },
  /* —— 汉字（教学卡）—— */
  {
    id: 'hanzi-liu', setId: 'hanzi', rarity: 'R', no: 1,
    name: { zh: '刘', en: '刘 · liú' },
    quote: { zh: '读作 liú，常用作姓氏。', en: 'Pronounced liú; commonly used as a family name.' },
    desc: { zh: '“刘”是左右结构，左边是“文”，右边是立刀旁“刂”。', en: '刘 has a left-right structure: 文 on the left and the knife radical 刂 on the right.' },
    role: 'hanzi', palette: ['#e85d4a', '#f7b267', '#fff4d6'],
    hanzi: {
      lessonId: 'chinese-g1-a-1-1', character: '刘', pinyin: 'liú', radical: { zh: '刂（立刀旁）', en: '刂 (knife)' }, strokes: 6,
      structure: { zh: '左右结构', en: 'left-right' }, meaning: { zh: '常用作姓氏，如“刘老师”。', en: 'A common family name, as in “Teacher Liu”.' },
      words: [
        { word: '姓刘', pinyin: 'xìng liú', meaning: { zh: '姓氏是刘', en: 'family name Liu' } },
        { word: '刘海', pinyin: 'liú hǎi', meaning: { zh: '额前垂下的头发', en: 'bangs / fringe' } },
      ],
      writingTip: { zh: '左宽右窄；立刀旁的短竖在前，竖钩在后。', en: 'Keep the left wider; write the short vertical before the vertical hook.' },
    },
  },
  {
    id: 'hanzi-yi', setId: 'hanzi', rarity: 'R', no: 2,
    name: { zh: '翊', en: '翊 · yì' },
    quote: { zh: '读作 yì，有帮助、辅佐的意思。', en: 'Pronounced yì; it means to help or assist.' },
    desc: { zh: '“翊”由“立”和“羽”组成，是一个常见于名字中的美好用字。', en: '翊 combines 立 and 羽 and is often used in names with an auspicious meaning.' },
    role: 'hanzi', palette: ['#6d70d8', '#9aa7ff', '#eef0ff'],
    hanzi: {
      lessonId: 'chinese-g1-a-1-1', character: '翊', pinyin: 'yì', radical: { zh: '羽（羽字旁）', en: '羽 (feather)' }, strokes: 11,
      structure: { zh: '左右结构', en: 'left-right' }, meaning: { zh: '帮助、辅佐；也让人联想到展翅飞翔。', en: 'To help or assist; it can also evoke spreading wings.' },
      words: [
        { word: '翊赞', pinyin: 'yì zàn', meaning: { zh: '帮助、辅佐', en: 'to assist' } },
        { word: '翊卫', pinyin: 'yì wèi', meaning: { zh: '辅佐并护卫', en: 'to assist and guard' } },
      ],
      writingTip: { zh: '左边“立”写窄，右边“羽”写舒展，两边要靠拢。', en: 'Write 立 narrowly and let 羽 open out, while keeping both sides close.' },
    },
  },
  {
    id: 'hanzi-ming', setId: 'hanzi', rarity: 'R', no: 3,
    name: { zh: '鸣', en: '鸣 · míng' },
    quote: { zh: '读作 míng，表示鸟兽叫或发出声音。', en: 'Pronounced míng; it means an animal call or making a sound.' },
    desc: { zh: '“鸣”由“口”和“鸟”组成：鸟张开口发出声音，就是“鸣”。', en: '鸣 combines 口 and 鸟: a bird opens its mouth and makes a sound.' },
    role: 'hanzi', palette: ['#18a999', '#62d2c3', '#e8fff6'],
    hanzi: {
      lessonId: 'chinese-g1-a-1-1', character: '鸣', pinyin: 'míng', radical: { zh: '鸟（鸟字旁）', en: '鸟 (bird)' }, strokes: 8,
      structure: { zh: '左右结构', en: 'left-right' }, meaning: { zh: '鸟兽叫，也可以表示发出声响。', en: 'An animal call, or to make a sound.' },
      words: [
        { word: '鸟鸣', pinyin: 'niǎo míng', meaning: { zh: '鸟儿的叫声', en: 'birdsong' } },
        { word: '鸣叫', pinyin: 'míng jiào', meaning: { zh: '鸟兽发出叫声', en: 'to call or cry' } },
      ],
      writingTip: { zh: '左边“口”小而靠上，右边“鸟”写得稍宽、站稳。', en: 'Keep 口 small and high; make 鸟 slightly wider and balanced.' },
    },
  },
];

/** 稀有度抽卡权重 */
export const RARITY_WEIGHTS: Record<CardRarity, number> = {
  R: 55,
  SR: 30,
  SSR: 12,
  SP: 3,
};

export const RARITY_ORDER: CardRarity[] = ['SP', 'SSR', 'SR', 'R'];

/** 单抽 / 十连花费 */
export const DRAW_COST = { single: 100, ten: 900 };

export function cardById(id: string): StarCard | undefined {
  return STAR_CARDS.find((c) => c.id === id);
}

export function cardsBySet(setId: CardSetId): StarCard[] {
  return STAR_CARDS.filter((c) => c.setId === setId).sort((a, b) => a.no - b.no);
}

/** 一节语文课完成时可授予的汉字图鉴卡。 */
export function hanziCardsForLesson(lessonId: string): StarCard[] {
  return STAR_CARDS.filter((card) => card.setId === 'hanzi' && card.hanzi?.lessonId === lessonId);
}

export function setProgress(owned: string[], setId: CardSetId): { total: number; have: number } {
  const ids = cardsBySet(setId).map((c) => c.id);
  return { total: ids.length, have: ids.filter((id) => owned.includes(id)).length };
}

export function allSetIdsOf(owned: string[]): CardSetId[] {
  return [...new Set(owned.map((id) => cardById(id)?.setId).filter(Boolean))] as CardSetId[];
}

export interface DrawResult {
  ids: string[];
  /** 本次抽到的新卡 */
  newCards: string[];
  /** 重复卡数量（只展示，不兑换额外货币） */
  duplicateCount: number;
}

/** 抽卡：count 张，可选指定套系；返回结果（自动处理重复卡） */
export function drawCards(count: number, owned: string[], setId?: CardSetId): DrawResult {
  const pool = setId ? STAR_CARDS.filter((c) => c.setId === setId) : STAR_CARDS;
  if (pool.length === 0) return { ids: [], newCards: [], duplicateCount: 0 };
  const totalWeight = pool.reduce((sum, c) => sum + RARITY_WEIGHTS[c.rarity], 0);
  const ids: string[] = [];
  let duplicateCount = 0;
  const ownSet = new Set(owned);

  for (let i = 0; i < count; i++) {
    let roll = Math.random() * totalWeight;
    let picked = pool[0];
    for (const c of pool) {
      roll -= RARITY_WEIGHTS[c.rarity];
      if (roll <= 0) { picked = c; break; }
    }
    ids.push(picked.id);
    if (ownSet.has(picked.id)) {
      duplicateCount += 1;
    } else {
      ownSet.add(picked.id);
    }
  }

  const newCards = ids.filter((id) => owned.includes(id) === false);
  return { ids, newCards, duplicateCount };
}
