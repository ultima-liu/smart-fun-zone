import type { StarCard } from './starCards';

type Text = { zh: string; en: string };
export interface JourneyLore {
  title: Text;
  faction: 'pilgrim' | 'divine' | 'demon';
  artifact: Text;
  chapter: number;
  design: Text;
}

export const JOURNEY_FACTIONS: Record<JourneyLore['faction'], Text> = {
  pilgrim: { zh: '取经众', en: 'Pilgrims' },
  divine: { zh: '仙佛', en: 'Divine' },
  demon: { zh: '妖魔', en: 'Demons' },
};

/** 文案为依据小说编写的角色介绍；quote 为原创题句，不冒充原著引文。 */
export const JOURNEY_CARDS: StarCard[] = [
  {
    id: 'journey-wukong', setId: 'journey', no: 1, rarity: 'SP', role: 'figure',
    name: { zh: '孙悟空', en: 'Sun Wukong' },
    quote: { zh: '一棒破重云，千山护西行。', en: 'A staff parts the clouds; a guardian crosses a thousand peaks.' },
    desc: { zh: '花果山的石猴，曾自号齐天大圣。拜师学得变化与筋斗云，后来护送唐僧西行。他勇敢机敏，也在取经路上学习克制与担当。', en: 'A stone-born monkey from Flower Fruit Mountain, once the Great Sage Equal to Heaven. His transformations and cloud leaps help protect Sanzang; the pilgrimage teaches him restraint and responsibility.' },
    palette: ['#b18a43', '#491f20', '#eed5a0'],
    journey: { title: { zh: '齐天大圣', en: 'The Great Sage' }, faction: 'pilgrim', artifact: { zh: '如意金箍棒', en: 'Gold-banded staff' }, chapter: 14, design: { zh: '猿面金睛、紧箍、金甲与朱红战衣；以花果山云岩衬托不屈的姿态。', en: 'A monkey face, golden eyes, circlet and gold armor with red cloth, framed by mountain clouds.' } },
  },
  {
    id: 'journey-tangseng', setId: 'journey', no: 2, rarity: 'SSR', role: 'figure',
    name: { zh: '唐三藏', en: 'Tang Sanzang' },
    quote: { zh: '心向灵山，步步皆修行。', en: 'Toward the sacred mountain, every step is practice.' },
    desc: { zh: '从东土大唐出发的取经僧人。他心怀慈悲，认定目标便坚持前行；虽然也会被妖魔的伪装迷惑，仍在弟子的守护下走过重重磨难。', en: 'A compassionate monk traveling from Tang China to obtain sacred scriptures. Though disguises can deceive him, his resolve and his disciples carry him through many trials.' },
    palette: ['#b3513e', '#54412c', '#efd9a5'],
    journey: { title: { zh: '东土圣僧', en: 'The Pilgrim Monk' }, faction: 'pilgrim', artifact: { zh: '九环锡杖 · 锦襕袈裟', en: 'Nine-ring staff · Brocade kasaya' }, chapter: 12, design: { zh: '五叶佛冠、锦襕袈裟与九环锡杖；以荒山古道表现凡人的坚定。', en: 'A Buddhist crown, brocade kasaya and nine-ring staff on a rugged pilgrimage road.' } },
  },
  {
    id: 'journey-bajie', setId: 'journey', no: 3, rarity: 'SR', role: 'figure',
    name: { zh: '猪八戒', en: 'Zhu Bajie' },
    quote: { zh: '肩挑行囊，钉耙也能护道。', en: 'A pack on his shoulder, a rake ready to defend the road.' },
    desc: { zh: '法名悟能，原为天蓬元帅，后来错投猪胎。他贪吃、爱抱怨，却有力气与本领；遇到险境时，也会挥起九齿钉耙与师兄并肩作战。', en: 'Once Marshal Tianpeng, Wuneng was reborn with a pig form. Fond of food and complaints, he nevertheless has the strength and skill to fight beside his companions.' },
    palette: ['#646c7b', '#312e32', '#c7ab73'],
    journey: { title: { zh: '天蓬旧将', en: 'Former Heavenly Marshal' }, faction: 'pilgrim', artifact: { zh: '九齿钉耙', en: 'Nine-toothed rake' }, chapter: 19, design: { zh: '长嘴大耳、壮硕体态与粗布行装；让幽默来自神态，而非幼态比例。', en: 'A long snout, large ears, sturdy build and coarse robes; humor comes from expression.' } },
  },
  {
    id: 'journey-shaseng', setId: 'journey', no: 4, rarity: 'SR', role: 'figure',
    name: { zh: '沙悟净', en: 'Sha Wujing' },
    quote: { zh: '流沙洗旧尘，一心守归途。', en: 'Flowing sands wash the past; a steady heart guards the way.' },
    desc: { zh: '原是卷帘大将，被贬后住在流沙河。经观音点化加入取经队伍，成为沉稳可靠的同伴；他护着师父、行李和伙伴，把承诺落实在每一步里。', en: 'The former Curtain-Lifting General lived in the Flowing Sand River after his exile. Guided by Guanyin, he becomes a steadfast pilgrim who protects his master, supplies and companions.' },
    palette: ['#477970', '#263a3b', '#d1b783'],
    journey: { title: { zh: '流沙行者', en: 'Pilgrim of the Sands' }, faction: 'pilgrim', artifact: { zh: '降妖宝杖', en: 'Demon-subduing staff' }, chapter: 22, design: { zh: '靛青面、赤发、九枚骷髅念珠；宝杖采用杖形，流沙河雾气强化沉静感。', en: 'An indigo face, red hair and nine symbolic skull beads; a straight staff and river mist.' } },
  },
  {
    id: 'journey-bailong', setId: 'journey', no: 5, rarity: 'R', role: 'figure',
    name: { zh: '白龙马', en: 'White Dragon Horse' },
    quote: { zh: '龙隐白马身，万里不辞行。', en: 'A dragon in a white horse, faithful across a thousand miles.' },
    desc: { zh: '西海龙王之子，在鹰愁涧与取经人相遇。经观音安排化为白马，驮着唐僧走过长长的西行路；安静的陪伴，也是取经不可缺少的力量。', en: 'A son of the Dragon King of the Western Sea, he meets the pilgrims at Eagle Sorrow Stream. He becomes a white horse to carry Sanzang, offering quiet but indispensable service.' },
    palette: ['#749b9a', '#233d43', '#e6e7d4'],
    journey: { title: { zh: '西海龙子', en: 'Prince of the Western Sea' }, faction: 'pilgrim', artifact: { zh: '白马化身', en: 'White horse form' }, chapter: 15, design: { zh: '白马为主体，银鬃与古朴鞍具；云中龙影提示其龙族身世，是本套原创意象。', en: 'A white horse with a silver mane and simple saddle; an original cloud-dragon motif recalls his origins.' } },
  },
  {
    id: 'journey-guanyin', setId: 'journey', no: 6, rarity: 'SP', role: 'figure',
    name: { zh: '观音菩萨', en: 'Guanyin' },
    quote: { zh: '一枝杨柳，慈悲照千山。', en: 'A willow sprig, compassion across a thousand mountains.' },
    desc: { zh: '居于南海的菩萨，奉如来之命寻找取经人，点化悟空等成为唐僧的弟子。她以智慧和慈悲指引西行，也在艰难关头为师徒解困。', en: 'The bodhisattva of the Southern Sea finds the scripture pilgrim and guides his disciples. Her compassion and wisdom help them overcome difficult trials.' },
    palette: ['#698e86', '#253e3b', '#e9dcb8'],
    journey: { title: { zh: '南海慈航', en: 'Compassion of the Southern Sea' }, faction: 'divine', artifact: { zh: '净瓶 · 杨柳枝', en: 'Pure-water vase · Willow' }, chapter: 8, design: { zh: '素罗袍、盘龙髻与净瓶杨柳；莲台、紫竹和柔和金光共同构成庄严感。', en: 'Ivory robes, coiled hair, a vase and willow, with lotus, bamboo and a soft sacred halo.' } },
  },
  {
    id: 'journey-niumowang', setId: 'journey', no: 7, rarity: 'SSR', role: 'figure',
    name: { zh: '牛魔王', en: 'Bull Demon King' },
    quote: { zh: '铁角擎云，群山听风雷。', en: 'Iron horns reach the clouds; mountains echo with thunder.' },
    desc: { zh: '自号平天大圣，力大无穷，曾与孙悟空结义。他是铁扇公主的丈夫、红孩儿的父亲；火焰山借扇一事中，与悟空斗力又斗变化。', en: 'The powerful Great Sage Who Pacifies Heaven once swore brotherhood with Wukong. Husband of Princess Iron Fan and father of Red Boy, he battles Wukong over the magical fan.' },
    palette: ['#8c7961', '#302c2c', '#d5bc86'],
    journey: { title: { zh: '平天大圣', en: 'Sage Who Pacifies Heaven' }, faction: 'demon', artifact: { zh: '混铁棍', en: 'Iron cudgel' }, chapter: 60, design: { zh: '依大白牛原身重塑白色牛首与铁角；重甲和火山烟云属于本套原创设计。', en: 'A white bull head and iron horns echo his great white bull form; armor and volcanic mist are original.' } },
  },
  {
    id: 'journey-tieshan', setId: 'journey', no: 8, rarity: 'SSR', role: 'figure',
    name: { zh: '铁扇公主', en: 'Princess Iron Fan' },
    quote: { zh: '一扇起风，山火亦低眉。', en: 'One sweep of her fan bends the mountain flames.' },
    desc: { zh: '又称罗刹女，居于翠云山芭蕉洞。她的芭蕉扇能够熄灭火焰山之火；因儿子红孩儿被观音收服，与前来借扇的孙悟空发生争执。', en: 'Also called the Rakshasa Woman, she lives in Plantain Cave on Emerald Cloud Mountain. Her fan can extinguish the mountain fire, but her son’s defeat makes her resist Wukong’s request.' },
    palette: ['#628d75', '#313b35', '#dac18f'],
    journey: { title: { zh: '翠云罗刹', en: 'Rakshasa of Emerald Cloud' }, faction: 'demon', artifact: { zh: '芭蕉扇', en: 'Plantain fan' }, chapter: 59, design: { zh: '高髻、青玉长袍与叶脉芭蕉扇；风纹衣缘和铜金装饰突出冷峻气质。', en: 'Coiled hair, jade robes and a veined plantain fan, with wind-pattern embroidery and bronze gold.' } },
  },
  {
    id: 'journey-baigujing', setId: 'journey', no: 9, rarity: 'SR', role: 'figure',
    name: { zh: '白骨精', en: 'White Bone Spirit' },
    quote: { zh: '幻相藏白骨，明心辨真容。', en: 'Illusion hides white bones; clarity reveals the truth.' },
    desc: { zh: '白虎岭上的妖精，曾先后变作女子、老妇和老翁接近唐僧。悟空看破她的伪装，却一度遭到师父误解；这个故事提醒人们不要只凭外表判断。', en: 'A spirit of White Tiger Ridge disguises herself as a young woman, an old woman and an old man. Wukong sees through the illusions but is misunderstood by his master.' },
    palette: ['#a598b2', '#3b3746', '#dedbcf'],
    journey: { title: { zh: '白虎岭幻影', en: 'Illusion of White Tiger Ridge' }, faction: 'demon', artifact: { zh: '三变化身', en: 'Three disguises' }, chapter: 27, design: { zh: '以提篮女子化身为主，苍白衣衫与雾中骨影暗示真身；不增加原著没有的专属法器。', en: 'Her basket-carrying woman disguise leads the design, with an atmospheric bone shadow and no invented weapon.' } },
  },
  {
    id: 'journey-honghaier', setId: 'journey', no: 10, rarity: 'SSR', role: 'figure',
    name: { zh: '红孩儿', en: 'Red Boy' },
    quote: { zh: '火云映赤衣，三昧试真心。', en: 'Fire clouds light his red robes; samadhi tests the heart.' },
    desc: { zh: '号圣婴大王，住在火云洞，是牛魔王与铁扇公主的儿子。他年纪虽小，却能使三昧真火，曾令悟空陷入苦战，后来被观音收为善财童子。', en: 'The young Sage Infant King of Fire Cloud Cave is the son of the Bull Demon King and Princess Iron Fan. His samadhi fire challenges Wukong before Guanyin takes him as an attendant.' },
    palette: ['#bb5138', '#492727', '#ecc283'],
    journey: { title: { zh: '圣婴大王', en: 'The Sage Infant King' }, faction: 'demon', artifact: { zh: '火尖枪 · 三昧真火', en: 'Fire-tipped spear · Samadhi fire' }, chapter: 40, design: { zh: '保留孩童面貌与火尖枪，朱红衣甲和三重火焰光轮为原创服装及构图。', en: 'A youthful face and fire-tipped spear, with original red attire and three arcs of flame.' } },
  },
];
