import type { StarCard } from './starCards';

type Localized = { zh: string; en: string };
export interface HuluLore {
  faction: 'brothers' | 'friends' | 'villains';
  ability: Localized;
  lesson: Localized;
}

export const HULU_FACTIONS: Record<HuluLore['faction'], Localized> = {
  brothers: { zh: '七色兄弟', en: 'Seven Brothers' },
  friends: { zh: '山间伙伴', en: 'Mountain Friends' },
  villains: { zh: '妖洞对手', en: 'Cave Villains' },
};

/** 以经典《葫芦兄弟》为人物依据；题句与成长提示为本项目创作。 */
export const HULU_CARDS: StarCard[] = [
  {
    id: 'hulu-1', setId: 'hulu', no: 1, rarity: 'SSR', role: 'figure',
    name: { zh: '大娃', en: 'First Brother' }, palette: ['#c94332', '#ee9670', '#fff0ce'],
    quote: { zh: '有力气，也要想办法。', en: 'Strength works best with a good plan.' },
    desc: { zh: '红葫芦里的大哥，力大无穷，还能让身体变大。他勇敢地冲在前面，想救回爷爷；面对妖精的诡计，光有力气还不够，也需要观察和思考。', en: 'The eldest brother emerges from the red gourd with immense strength and the power to grow. He rushes to rescue Grandpa, but overcoming tricks takes careful thought too.' },
    hulu: { faction: 'brothers', ability: { zh: '力大无穷 · 身体变大', en: 'Super strength · Growing tall' }, lesson: { zh: '遇到困难，先看清楚再行动。', en: 'Look carefully before acting.' } },
  },
  {
    id: 'hulu-2', setId: 'hulu', no: 2, rarity: 'SR', role: 'figure',
    name: { zh: '二娃', en: 'Second Brother' }, palette: ['#db762b', '#f3bc68', '#fff1ce'],
    quote: { zh: '看得仔细，听得认真。', en: 'Watch closely and listen carefully.' },
    desc: { zh: '橙葫芦里的二哥，拥有千里眼和顺风耳，能看见远处的事物，也能听到远方的声音。他用自己的本领寻找爷爷和兄弟的下落，是七兄弟中善于观察的伙伴。', en: 'Born from the orange gourd, he can see and hear across great distances. His keen observation helps him locate Grandpa and his brothers.' },
    hulu: { faction: 'brothers', ability: { zh: '千里眼 · 顺风耳', en: 'Far sight · Keen hearing' }, lesson: { zh: '多观察、多倾听，才能发现线索。', en: 'Careful watching and listening reveal clues.' } },
  },
  {
    id: 'hulu-3', setId: 'hulu', no: 3, rarity: 'SSR', role: 'figure',
    name: { zh: '三娃', en: 'Third Brother' }, palette: ['#b98b23', '#f0d76d', '#fff7d6'],
    quote: { zh: '勇敢向前，也记得互相照应。', en: 'Be brave and look after each other.' },
    desc: { zh: '黄葫芦里的三哥，铜头铁臂、钢筋铁骨，坚硬的石门也挡不住他。他坚强勇敢，敢于迎战蝎子精；但再强大的本领，也需要和兄弟们配合。', en: 'The yellow-gourd brother has an iron-hard body that can break through stone gates. He bravely faces the Scorpion King, yet even great strength benefits from teamwork.' },
    hulu: { faction: 'brothers', ability: { zh: '铜头铁臂 · 钢筋铁骨', en: 'Iron-hard body' }, lesson: { zh: '勇敢和合作一起，才更有力量。', en: 'Courage grows stronger with teamwork.' } },
  },
  {
    id: 'hulu-4', setId: 'hulu', no: 4, rarity: 'SR', role: 'figure',
    name: { zh: '四娃', en: 'Fourth Brother' }, palette: ['#367343', '#9fbd73', '#fff0ce'],
    quote: { zh: '把热情变成守护伙伴的力量。', en: 'Let enthusiasm protect your friends.' },
    desc: { zh: '绿葫芦里的四哥，能够喷火，是七兄弟中的火娃。他热情勇敢，与五娃一同救人、闯妖洞。绿色是他的葫芦和衣服颜色，火焰则是他的本领。', en: 'The green-gourd brother commands fire. Spirited and brave, he joins the Fifth Brother on their rescue. His gourd and clothes are green; flames are his power.' },
    hulu: { faction: 'brothers', ability: { zh: '喷吐火焰', en: 'Breathing fire' }, lesson: { zh: '热心帮忙，也要辨清对方的用意。', en: 'Help others while thinking about their intentions.' } },
  },
  {
    id: 'hulu-5', setId: 'hulu', no: 5, rarity: 'SR', role: 'figure',
    name: { zh: '五娃', en: 'Fifth Brother' }, palette: ['#238e99', '#85c6c3', '#eaf8e7'],
    quote: { zh: '心里有办法，行动更从容。', en: 'A thoughtful plan brings calm.' },
    desc: { zh: '青葫芦里的五哥，能够吸水、吐水，是七兄弟中的水娃。他与四娃相伴行动，一水一火，各有本领。兄弟齐心时，才能让不同的力量发挥作用。', en: 'The cyan-gourd brother can take in and release water. He partners with the fire-wielding Fourth Brother, showing how different strengths can work together.' },
    hulu: { faction: 'brothers', ability: { zh: '吸水 · 吐水', en: 'Taking in · Releasing water' }, lesson: { zh: '每个人的特长，都有派上用场的时候。', en: 'Everyone has a strength that can help.' } },
  },
  {
    id: 'hulu-6', setId: 'hulu', no: 6, rarity: 'SSR', role: 'figure',
    name: { zh: '六娃', en: 'Sixth Brother' }, palette: ['#315ca0', '#93b4dc', '#eef6ea'],
    quote: { zh: '悄悄观察，机灵解围。', en: 'Quiet observation finds a clever way out.' },
    desc: { zh: '蓝葫芦里的六哥，能够隐身，行动机灵。他利用别人看不见自己的本领潜入妖洞，寻找救出伙伴的机会。隐身不是为了捉弄人，而是为了帮助大家。', en: 'The blue-gourd brother can become invisible. He slips into the cave to find a way to rescue his companions, using cleverness to help them.' },
    hulu: { faction: 'brothers', ability: { zh: '隐身术', en: 'Invisibility' }, lesson: { zh: '聪明的办法，要用来帮助别人。', en: 'Use clever ideas to help others.' } },
  },
  {
    id: 'hulu-7', setId: 'hulu', no: 7, rarity: 'SP', role: 'figure',
    name: { zh: '七娃', en: 'Seventh Brother' }, palette: ['#805299', '#c6a0cf', '#fff1d9'],
    quote: { zh: '宝贝在手，兄弟在心。', en: 'A magic gourd in hand, brothers in heart.' },
    desc: { zh: '紫葫芦里的小弟，拥有能吸入东西的宝葫芦。他年纪最小，宝葫芦却有很大的威力。七兄弟各有本领，只有彼此信任、一起行动，才能战胜妖精。', en: 'The youngest brother is born from the purple gourd and carries a powerful magic gourd that draws things inside. Trust and cooperation unite the seven brothers against the villains.' },
    hulu: { faction: 'brothers', ability: { zh: '宝葫芦 · 吸纳万物', en: 'Magic gourd · Drawing things inside' }, lesson: { zh: '珍惜伙伴的信任，一起完成目标。', en: 'Value your friends’ trust and work together.' } },
  },
  {
    id: 'hulu-grandpa', setId: 'hulu', no: 8, rarity: 'R', role: 'figure',
    name: { zh: '爷爷', en: 'Grandpa' }, palette: ['#956241', '#c9a077', '#fff1d8'],
    quote: { zh: '悉心照料，等你们慢慢长大。', en: 'With patient care, you will grow.' },
    desc: { zh: '住在山里的善良老人，救下穿山甲后，种下宝葫芦籽，悉心照料七色葫芦。葫芦兄弟把他叫作爷爷；他对孩子们的关爱，是大家勇敢团结的牵挂。', en: 'A kind mountain farmer who rescues the pangolin, plants the magic seed and tends the seven gourds. The brothers call him Grandpa and cherish his care.' },
    hulu: { faction: 'friends', ability: { zh: '种下葫芦籽 · 养育七兄弟', en: 'Planting the seed · Raising the brothers' }, lesson: { zh: '记得感谢照顾我们的人。', en: 'Thank the people who care for us.' } },
  },
  {
    id: 'hulu-pangolin', setId: 'hulu', no: 9, rarity: 'R', role: 'figure',
    name: { zh: '穿山甲', en: 'Pangolin' }, palette: ['#596d79', '#a4b2b0', '#f6ecd5'],
    quote: { zh: '做错了，就勇敢去补救。', en: 'Own a mistake and help put it right.' },
    desc: { zh: '穿山甲不小心打穿葫芦山，让蛇精和蝎子精逃出封印。他向爷爷说明缘由，并帮忙找到宝葫芦籽，后来又冒险帮助爷爷和葫芦娃。', en: 'The pangolin accidentally opens the sealed mountain and releases the villains. He explains his mistake to Grandpa, helps find the magic seed and risks danger to aid the family.' },
    hulu: { faction: 'friends', ability: { zh: '穿山引路 · 寻找葫芦籽', en: 'Finding paths · Recovering the seed' }, lesson: { zh: '承认错误，努力把事情做好。', en: 'Admit mistakes and work to make things better.' } },
  },
  {
    id: 'hulu-snake', setId: 'hulu', no: 10, rarity: 'SSR', role: 'figure',
    name: { zh: '蛇精', en: 'Snake Queen' }, palette: ['#98792d', '#a4b77b', '#fff1c9'],
    quote: { zh: '妖洞里，藏着我的计谋。', en: 'My schemes await inside the cave.' },
    desc: { zh: '与蝎子精一起逃出葫芦山的妖精，善于施展法术和设下诡计，常借助如意等宝物对付葫芦兄弟。她的故事提醒我们：好听的话，也需要认真分辨。', en: 'Released from the mountain alongside the Scorpion King, she uses magic, tricks and treasures such as her ruyi scepter against the brothers. Her schemes encourage careful judgment.' },
    hulu: { faction: 'villains', ability: { zh: '法术 · 如意 · 计谋', en: 'Magic · Ruyi scepter · Schemes' }, lesson: { zh: '遇到不明来意的邀请，先找可信的人商量。', en: 'Discuss unclear invitations with someone you trust.' } },
  },
  {
    id: 'hulu-scorpion', setId: 'hulu', no: 11, rarity: 'SR', role: 'figure',
    name: { zh: '蝎子精', en: 'Scorpion King' }, palette: ['#8a6935', '#8fa7a1', '#f6e7bf'],
    quote: { zh: '谁敢来闯我的妖洞？', en: 'Who dares enter my cave?' },
    desc: { zh: '与蛇精一同盘踞妖洞的妖精，身形强壮，带着蝎尾，常带领手下阻拦葫芦兄弟。面对他的威吓，兄弟们最终用团结和各自的本领共同迎战。', en: 'A powerful scorpion-tailed villain who shares the cave with the Snake Queen and commands its guards. The brothers face him together with their different powers.' },
    hulu: { faction: 'villains', ability: { zh: '强壮身躯 · 蝎尾', en: 'Powerful body · Scorpion tail' }, lesson: { zh: '遇到危险及时求助，伙伴可以互相支持。', en: 'Ask for help in danger and support one another.' } },
  },
];
