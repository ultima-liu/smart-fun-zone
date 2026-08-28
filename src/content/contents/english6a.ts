import type { LessonContent } from '../skills';
/** 六年级上册 · PEP 人教版（三年级起点）课文内容 */
export const E6A: Record<string, LessonContent> = {
  /* ================= Unit 1 How can I get there? ================= */
  'english-g6-a-1-1': {
    text: 'Wu Yifan: Robin, where is the science museum?\nRobin: It\'s near the library.\nWu Yifan: I see. How can I get there?\nRobin: Turn left at the bookstore. Then turn right at the hospital.\nWu Yifan: OK. Let\'s go!',
    translation: "Wu Yifan：Robin，科学博物馆在哪里？\nRobin：它在图书馆附近。\nWu Yifan：我明白了。我怎样才能到那儿？\nRobin：在书店向左转，然后在医院向右转。\nWu Yifan：好的。我们走吧！",
    words: ['where', 'science', 'museum', 'near', 'library', 'turn', 'left'],
    points: [
      '重点句型：Where is the science museum?（科学博物馆在哪里？）答语：It\'s near the library.',
      '重点句型：How can I get there?（我怎样到那儿？）答语：Turn left at the bookstore.',
      '方位介词 near 表示"在……附近"，turn left 向左转、turn right 向右转',
    ],
  },
  'english-g6-a-1-2': {
    text: 'science museum post office bookstore cinema hospital\nWhere is the museum shop? It\'s near the door.',
    translation: "科学博物馆 邮局 书店 电影院 医院\n博物馆商店在哪里？它在门附近。",
    words: ['museum', 'post', 'office', 'bookstore', 'cinema', 'hospital'],
    points: [
      '重点句型：Where is the museum shop?（博物馆商店在哪里？）答语：It\'s near the door.',
      '地点词汇：science museum 科学博物馆、post office 邮局、bookstore 书店、cinema 电影院、hospital 医院',
      '问路句型 Where is ...? 后接单数地点名词',
    ],
  },
  'english-g6-a-1-3': {
    text: 'Mike: How can I get to the Fuxing Hospital?\nRobin: Take the No.57 bus over there.\nMike: Can I go by bike?\nRobin: Hmm... The hospital is far. Take the bus.\nMike: OK. Thank you!',
    translation: "Mike：我怎样才能到复兴医院？\nRobin：乘那边那辆57路公交车。\nMike：我能骑自行车去吗？\nRobin：嗯……医院很远。坐公交车吧。\nMike：好的。谢谢你！",
    words: ['get', 'hospital', 'take', 'bus', 'bike', 'far', 'there'],
    points: [
      '重点句型：How can I get to the Fuxing Hospital?（我怎样到复兴医院？）答语：Take the No.57 bus over there.',
      'get to + 地点 表示"到达某地"',
      'by bike 骑自行车；take the bus 乘公交车',
    ],
  },
  'english-g6-a-1-4': {
    text: 'turn left turn right go straight near next to\nHow can I get to the nature park? Turn left at the school.',
    translation: "向左转 向右转 直走 在……附近 紧挨着\n我怎样才能到自然公园？在学校向左转。",
    words: ['turn', 'left', 'right', 'straight', 'near', 'next'],
    points: [
      '重点句型：How can I get to the nature park?（我怎样到自然公园？）答语：Turn left at the school.',
      '指路短语：turn left 向左转、turn right 向右转、go straight 直走',
      '方位介词：near 在……附近、next to 紧挨着',
    ],
  },
  'english-g6-a-1-5': {
    text: 'Wu Yifan and Robin are going to the Italian restaurant. They don\'t know the way, but Robin has GPS. It can help them find the way. They turn left and go straight, then turn right at the bookstore. At last they arrive at the restaurant. But the restaurant is behind them!',
    translation: "吴一凡和Robin要去意大利餐厅。他们不认识路，但Robin有GPS导航，它能帮他们找到路。他们向左转然后直走，在书店向右转，最后到达了餐厅。可是餐厅在他们身后！",
    words: ['way', 'restaurant', 'turn', 'straight', 'arrive', 'find'],
    points: [
      '阅读短文，理解 Robin 用 GPS 为吴一凡指路的过程',
      '复习指路句型：turn left、go straight、turn right at the bookstore',
      '重点词汇：at last 最后、behind 在……后面',
    ],
  },
  'english-g6-a-1-6': {
    text: 'Zoom: Where is the science museum? I want to see the robots.\nZip: I don\'t know. Let\'s ask the man.\nZoom: Excuse me. How can I get to the science museum?\nMan: Turn left at the bookstore, then go straight. The museum is next to the hospital.\nZoom & Zip: Thank you!\nZip: Look! Here it is. The museum is next to the hospital.\nZoom: Great! Let\'s go and see the robots.',
    translation: "Zoom：科学博物馆在哪里？我想去看机器人。\nZip：我不知道。我们去问问那位男士吧。\nZoom：打扰一下，我怎样才能到科学博物馆？\n男士：在书店向左转，然后直走。博物馆就在医院旁边。\nZoom和Zip：谢谢！\nZip：看！就是这里。博物馆就在医院旁边。\nZoom：太棒了！我们去看机器人吧。",
    words: ['museum', 'robot', 'ask', 'excuse', 'next', 'hospital'],
    points: [
      '复习问路与指路句型：How can I get to ...? 答语：Turn left / Go straight / next to',
      '学习礼貌用语：Excuse me.（打扰一下。）Thank you.（谢谢。）',
    ],
  },

  /* ================= Unit 2 Ways to go to school ================= */
  'english-g6-a-2-1': {
    text: 'Mrs Smith: Good morning, children!\nAmy & Mike: Good morning, Mrs Smith!\nMrs Smith: How do you come to school?\nAmy: Usually I come on foot.\nMike: I often come by bike.\nAmy: Sometimes I come by bus.',
    translation: "Mrs Smith：早上好，孩子们！\nAmy和Mike：早上好，Smith太太！\nMrs Smith：你们怎么来上学？\nAmy：我通常步行来。\nMike：我经常骑自行车来。\nAmy：有时我坐公交车来。",
    words: ['come', 'school', 'usually', 'often', 'foot', 'bike', 'sometimes'],
    points: [
      '重点句型：How do you come to school?（你怎样来上学？）答语：Usually I come on foot.',
      '频度副词：usually 通常、often 经常、sometimes 有时，放在主语之后、动词之前',
      'on foot 步行、by bike 骑自行车',
    ],
  },
  'english-g6-a-2-2': {
    text: 'by plane by ship by subway by train by taxi on foot\nHow do you come to school? I come by subway.',
    translation: "乘飞机 乘船 乘地铁 乘火车 乘出租车 步行\n你怎样来上学？我乘地铁来。",
    words: ['plane', 'ship', 'subway', 'train', 'taxi', 'foot'],
    points: [
      '重点句型：How do you come to school? 答语：I come by subway.',
      '交通方式短语：by plane 乘飞机、by ship 乘船、by subway 乘地铁、by train 乘火车、by taxi 乘出租车、on foot 步行',
      'by + 交通工具 表示"乘……"，但"步行"用 on foot',
    ],
  },
  'english-g6-a-2-3': {
    text: 'Wu Yifan: Look! The park is over there! Let\'s go!\nMrs Smith: Please wait! It\'s red now. We must stop and wait.\nWu Yifan: OK. I must pay attention to the traffic lights.\nMrs Smith: Yes. Don\'t go at the red light!\nWu Yifan: Now the light is green. Let\'s go!',
    translation: "Wu Yifan：看！公园就在那边！我们走吧！\nMrs Smith：请等一下！现在是红灯。我们必须停下来等待。\nWu Yifan：好的。我必须注意交通信号灯。\nMrs Smith：是的。红灯时不要走！\nWu Yifan：现在绿灯亮了。我们走吧！",
    words: ['wait', 'red', 'light', 'stop', 'must', 'pay', 'attention'],
    points: [
      '重点句型：Don\'t go at the red light!（红灯时不要走！）',
      '重点句型：I must pay attention to the traffic lights.（我必须注意交通信号灯。）',
      'must 是情态动词，表示"必须"，后面接动词原形',
    ],
  },
  'english-g6-a-2-4': {
    text: 'slow down stop wait go\nSlow down and stop at a yellow light. Stop and wait at a red light. Go at a green light.',
    translation: "减速 停下 等待 前进\n黄灯时减速并停下。红灯时停下来等待。绿灯时通行。",
    words: ['slow', 'down', 'stop', 'wait', 'go', 'light'],
    points: [
      '重点句型：Slow down and stop at a yellow light.（黄灯时减速停下。）',
      '交通规则：红灯停、黄灯减速停、绿灯行',
      'at a yellow light / at a red light / at a green light 表示"在……灯时"',
    ],
  },
  'english-g6-a-2-5': {
    text: 'In China, people drive on the right side of the road. We must look left before we cross the road. At a red light, we must stop and wait. At a green light, we can go. We must pay attention to the traffic lights. Safety first!',
    translation: "在中国，人们靠路的右侧行驶。过马路之前，我们必须先看左边。红灯时，我们必须停下来等待。绿灯时，我们可以通行。我们必须注意交通信号灯。安全第一！",
    words: ['drive', 'road', 'cross', 'right', 'left', 'safety', 'traffic'],
    points: [
      '阅读短文，了解中国的交通规则：靠右行驶、过马路先看左边',
      '重点句型：We must stop and wait at a red light.',
      'Safety first!（安全第一！）',
    ],
  },
  'english-g6-a-2-6': {
    text: 'It\'s 7:30 in the morning. Zoom and Zip go to school on foot. At a crossing, the light is red. "Wait! We must stop and wait," says Zip. Soon the light turns green and they cross the street. "Pay attention to the traffic lights," says Zip. "I will," says Zoom. They get to school on time.',
    translation: "早上七点半，Zoom和Zip步行去上学。在一个十字路口，红灯亮了。“等等！我们必须停下来等待。”Zip说。很快绿灯亮了，他们穿过马路。“要注意交通信号灯。”Zip说。“我会的。”Zoom说。他们准时到达了学校。",
    words: ['morning', 'foot', 'crossing', 'red', 'green', 'cross', 'street', 'time'],
    points: [
      '复习交通规则句型：Stop and wait at a red light. Pay attention to the traffic lights.',
      'on time 准时、cross the street 过马路',
    ],
  },

  /* ================= Unit 3 My weekend plan ================= */
  'english-g6-a-3-1': {
    text: 'Sarah: What are you going to do tomorrow?\nMike: I\'m going to have an art lesson.\nSarah: What are you going to do in your lesson?\nMike: I\'m going to draw some pictures.\nSarah: Sounds great! Have a good time!\nMike: Thanks. You too!',
    translation: "Sarah：你明天打算做什么？\nMike：我打算上一节美术课。\nSarah：你打算在课上做什么？\nMike：我打算画一些画。\nSarah：听起来很棒！玩得开心！\nMike：谢谢。你也是！",
    words: ['going', 'tomorrow', 'art', 'lesson', 'draw', 'pictures'],
    points: [
      '重点句型：What are you going to do tomorrow?（你明天打算做什么？）答语：I\'m going to have an art lesson.',
      'be going to + 动词原形 表示"打算、将要做某事"',
      'Have a good time!（玩得开心！）',
    ],
  },
  'english-g6-a-3-2': {
    text: 'visit my grandparents go to the supermarket see a film take a trip go for a picnic\nWhat are you going to do? I\'m going to visit my grandparents.',
    translation: "看望我的祖父母 去超市 看电影 去旅行 去野餐\n你打算做什么？我打算去看望我的祖父母。",
    words: ['visit', 'grandparents', 'supermarket', 'film', 'trip', 'picnic'],
    points: [
      '重点句型：What are you going to do? 答语：I\'m going to visit my grandparents.',
      '动词短语：visit my grandparents 看望祖父母、go to the supermarket 去超市、see a film 看电影、take a trip 去旅行、go for a picnic 去野餐',
    ],
  },
  'english-g6-a-3-3': {
    text: 'John: Where are you going?\nAmy: I\'m going to the cinema.\nJohn: What are you going to do there?\nAmy: I\'m going to see a film.\nJohn: When are you going?\nAmy: Next weekend.\nJohn: Have a good time!\nAmy: Thanks!',
    translation: "John：你打算去哪里？\nAmy：我打算去电影院。\nJohn：你打算在那里做什么？\nAmy：我打算看一场电影。\nJohn：你打算什么时候去？\nAmy：下个周末。\nJohn：玩得开心！\nAmy：谢谢！",
    words: ['where', 'going', 'cinema', 'film', 'when', 'next', 'weekend'],
    points: [
      '重点句型：Where are you going?（你打算去哪里？）答语：I\'m going to the cinema.',
      '重点句型：When are you going?（你打算什么时候去？）答语：Next weekend.',
      'Where 问地点，When 问时间',
    ],
  },
  'english-g6-a-3-4': {
    text: 'dictionary comic book word book postcard\nI\'m going to buy a dictionary.',
    translation: "词典 漫画书 单词书 明信片\n我打算买一本词典。",
    words: ['dictionary', 'comic', 'book', 'word', 'postcard'],
    points: [
      '重点句型：I\'m going to buy a dictionary.（我打算买一本词典。）',
      '词汇：dictionary 词典、comic book 漫画书、word book 单词书、postcard 明信片',
      'buy 买，后面接要买的东西',
    ],
  },
  'english-g6-a-3-5': {
    text: 'Tomorrow is Saturday. I\'m going to do my homework in the morning. In the afternoon, I\'m going to visit my grandparents with my parents. We are going to have a big dinner together. On Sunday, I\'m going to see a film with my friends. What a nice weekend!',
    translation: "明天是星期六。上午我打算做作业。下午，我打算和爸爸妈妈一起去看望祖父母。我们将一起吃一顿丰盛的晚餐。星期天，我打算和朋友们去看电影。多么美好的周末啊！",
    words: ['saturday', 'homework', 'morning', 'afternoon', 'parents', 'dinner', 'weekend'],
    points: [
      '阅读短文，理解用 be going to 描述周末计划',
      '时间表达：in the morning / in the afternoon / on Sunday',
      'What a nice weekend!（多么美好的周末！）',
    ],
  },
  'english-g6-a-3-6': {
    text: 'Zip: What are you going to do tomorrow?\nZoom: I\'m going to visit my grandparents.\nZip: I\'m going to see a film with Amy.\nZoom: What about Sunday?\nZip: I\'m going to take a trip with my family.\nZoom: Sounds great!\nZip: Would you like to come?\nZoom: Yes, I\'d love to! We are going to have a good time.',
    translation: "Zip：你明天打算做什么？\nZoom：我打算去看望我的祖父母。\nZip：我打算和Amy一起看电影。\nZoom：星期天呢？\nZip：我打算和家人去旅行。\nZoom：听起来很棒！\nZip：你愿意一起来吗？\nZoom：是的，我很乐意！我们会玩得很开心的。",
    words: ['tomorrow', 'visit', 'grandparents', 'film', 'trip', 'family'],
    points: [
      '复习 be going to 句型谈论周末计划',
      'Would you like to come?（你愿意来吗？）答语：Yes, I\'d love to.',
    ],
  },

  /* ================= Unit 4 I have a pen pal ================= */
  'english-g6-a-4-1': {
    text: 'Oliver: What are Peter\'s hobbies?\nZhang Peng: He likes reading stories. He lives on a farm.\nOliver: That\'s interesting!\nZhang Peng: He also likes singing and dancing.\nOliver: Really? Me too!',
    translation: "Oliver：Peter的爱好是什么？\nZhang Peng：他喜欢读故事。他住在农场里。\nOliver：那真有趣！\nZhang Peng：他还喜欢唱歌和跳舞。\nOliver：真的吗？我也是！",
    words: ['hobbies', 'likes', 'reading', 'stories', 'singing', 'dancing'],
    points: [
      '重点句型：What are Peter\'s hobbies?（彼得的爱好是什么？）答语：He likes reading stories.',
      'like + 动词-ing 表示"喜欢做某事"：likes reading、likes singing',
      'hobby 爱好，复数形式是 hobbies',
    ],
  },
  'english-g6-a-4-2': {
    text: 'dancing singing reading stories playing football doing kung fu\nWhat are your hobbies? I like singing and dancing.',
    translation: "跳舞 唱歌 读故事 踢足球 练武术\n你的爱好是什么？我喜欢唱歌和跳舞。",
    words: ['dancing', 'singing', 'reading', 'stories', 'playing', 'football', 'kung fu'],
    points: [
      '重点句型：What are your hobbies?（你的爱好是什么？）答语：I like singing and dancing.',
      '动词-ing 短语：dancing 跳舞、singing 唱歌、reading stories 读故事、playing football 踢足球、doing kung fu 练武术',
    ],
  },
  'english-g6-a-4-3': {
    text: 'Chen Jie: Hey, Yifan. What are you doing?\nWu Yifan: I\'m writing an email to my new pen pal in Australia.\nChen Jie: Does he live in Sydney?\nWu Yifan: Yes, he does.\nChen Jie: Does he like doing word puzzles?\nWu Yifan: Yes, he does.\nChen Jie: Great! I want to be his pen pal, too.',
    translation: "Chen Jie：嘿，一凡。你在做什么？\nWu Yifan：我正在给在澳大利亚的新笔友写电子邮件。\nChen Jie：他住在悉尼吗？\nWu Yifan：是的，他住在悉尼。\nChen Jie：他喜欢猜字谜吗？\nWu Yifan：是的，他喜欢。\nChen Jie：太好了！我也想当他的笔友。",
    words: ['pen', 'pal', 'email', 'australia', 'live', 'sydney', 'puzzles'],
    points: [
      '重点句型：Does he live in Sydney? Yes, he does. / No, he doesn\'t.',
      'Does 开头的疑问句中，主语是第三人称单数用 does，后面的动词用原形',
      'do word puzzles 猜字谜、pen pal 笔友',
    ],
  },
  'english-g6-a-4-4': {
    text: 'cooking going hiking watching TV playing the piano\nDoes she like going hiking? Yes, she does.',
    translation: "做饭 去远足 看电视 弹钢琴\n她喜欢去远足吗？是的，她喜欢。",
    words: ['cooking', 'hiking', 'watching', 'playing', 'piano'],
    points: [
      '重点句型：Does she like going hiking? Yes, she does. / No, she doesn\'t.',
      '动词-ing 短语：cooking 做饭、going hiking 去远足、watching TV 看电视、playing the piano 弹钢琴',
      'play 后接乐器要加 the：play the piano',
    ],
  },
  'english-g6-a-4-5': {
    text: 'I have a new pen pal. Her name is Lily. She is from Canada. She likes singing and playing the piano. She also likes going hiking. I\'m going to write an email to her this evening.',
    translation: "我有一个新笔友。她叫Lily。她来自加拿大。她喜欢唱歌和弹钢琴。她还喜欢去远足。我打算今天晚上给她写一封电子邮件。",
    words: ['pen', 'pal', 'name', 'canada', 'singing', 'piano', 'email'],
    points: [
      '阅读短文，了解介绍笔友的表达：Her name is Lily. She is from Canada.',
      'like + 动词-ing 表示爱好：likes singing、likes going hiking',
      'be from 表示"来自……"',
    ],
  },
  'english-g6-a-4-6': {
    text: 'Dear Amy, I\'m your new pen pal. My name is Sam. I live in London. I like reading stories and playing football. I also like doing kung fu. What are your hobbies? Please write to me soon. Yours, Sam',
    translation: "亲爱的Amy：我是你的新笔友。我叫Sam。我住在伦敦。我喜欢读故事和踢足球。我还喜欢练武术。你的爱好是什么？请尽快给我写信。你的朋友 Sam",
    words: ['dear', 'pen', 'pal', 'live', 'reading', 'football', 'soon'],
    points: [
      '学习英文书信格式：开头 Dear ...，结尾 Yours, ...',
      '复习介绍爱好句型：I like reading stories and playing football.',
    ],
  },

  /* ================= Unit 5 What does he do? ================= */
  'english-g6-a-5-1': {
    text: 'Oliver: What does your mother do?\nSarah: She is a head teacher.\nOliver: What does your father do?\nSarah: He\'s a businessman.\nOliver: Cool! I want to be a businessman, too.',
    translation: "Oliver：你妈妈是做什么工作的？\nSarah：她是一名校长。\nOliver：你爸爸是做什么工作的？\nSarah：他是一名商人。\nOliver：真酷！我也想成为一名商人。",
    words: ['mother', 'teacher', 'father', 'businessman', 'do'],
    points: [
      '重点句型：What does your mother do?（你妈妈是做什么的？）答语：She is a head teacher.',
      '询问职业用 What does ... do?，答语用 He/She is + 职业名词',
      'head teacher 校长、businessman 商人',
    ],
  },
  'english-g6-a-5-2': {
    text: 'factory worker postman businessman police officer\nWhat does he do? He\'s a factory worker.',
    translation: "工厂工人 邮递员 商人 警察\n他是做什么工作的？他是一名工厂工人。",
    words: ['factory', 'worker', 'postman', 'businessman', 'police', 'officer'],
    points: [
      '重点句型：What does he do? 答语：He\'s a factory worker.',
      '职业词汇：factory worker 工厂工人、postman 邮递员、businessman 商人、police officer 警察',
    ],
  },
  'english-g6-a-5-3': {
    text: 'Mike: My uncle is a fisherman.\nXiao Yu: Where does he work?\nMike: He works at sea.\nXiao Yu: How does he go to work?\nMike: He goes to work by bike.\nXiao Yu: That\'s interesting!',
    translation: "Mike：我叔叔是一名渔民。\nXiao Yu：他在哪里工作？\nMike：他在海上工作。\nXiao Yu：他怎么去上班？\nMike：他骑自行车去上班。\nXiao Yu：那真有趣！",
    words: ['uncle', 'fisherman', 'work', 'sea', 'bike', 'interesting'],
    points: [
      '重点句型：Where does he work?（他在哪里工作？）答语：He works at sea.',
      '重点句型：How does he go to work?（他怎么去上班？）答语：He goes to work by bike.',
      '第三人称单数动词加 s：works、goes',
    ],
  },
  'english-g6-a-5-4': {
    text: 'fisherman scientist pilot coach\nWhat does she do? She\'s a scientist.',
    translation: "渔民 科学家 飞行员 教练\n她是做什么工作的？她是一名科学家。",
    words: ['fisherman', 'scientist', 'pilot', 'coach', 'work', 'do'],
    points: [
      '重点句型：What does she do? 答语：She\'s a scientist.',
      '职业词汇：fisherman 渔民、scientist 科学家、pilot 飞行员、coach 教练',
    ],
  },
  'english-g6-a-5-5': {
    text: 'Hu Bin likes sports. He is good at basketball and football. He often goes running after school. He wants to work in a gym. He can be a coach or a PE teacher. If you like sports, you can be a coach, too.',
    translation: "胡斌喜欢运动。他擅长篮球和足球。放学后他经常去跑步。他想在体育馆工作。他可以成为一名教练或体育老师。如果你喜欢运动，你也可以成为一名教练。",
    words: ['sports', 'basketball', 'football', 'running', 'gym', 'coach', 'teacher'],
    points: [
      '阅读短文，了解职业与爱好的联系：He is good at sports. He can be a coach.',
      'be good at 表示"擅长……"，后面接名词或动词-ing',
      'want to be 想成为……',
    ],
  },
  'english-g6-a-5-6': {
    text: 'Zip: What do you want to be?\nZoom: I want to be a pilot. I want to fly a plane in the sky.\nZip: Great! I want to be a scientist.\nZoom: But I\'m afraid of flying. Hmm...\nZip: Don\'t worry. You are good at sports. You can be a coach.\nZoom: Good idea! I want to be a PE teacher, too.\nZip: Haha! Let\'s work hard together.',
    translation: "Zip：你想成为什么？\nZoom：我想成为一名飞行员。我想在天空中开飞机。\nZip：太棒了！我想成为一名科学家。\nZoom：但是我害怕飞行。嗯……\nZip：别担心。你擅长运动。你可以成为一名教练。\nZoom：好主意！我也想成为一名体育老师。\nZip：哈哈！我们一起努力吧。",
    words: ['want', 'pilot', 'fly', 'plane', 'scientist', 'coach', 'teacher'],
    points: [
      '复习句型：What do you want to be? I want to be a pilot.',
      'want to be + 职业 表示"想成为……"',
      'be afraid of 表示"害怕……"',
    ],
  },

  /* ================= Unit 6 How do you feel? ================= */
  'english-g6-a-6-1': {
    text: 'Sam: What\'s this cartoon about?\nSarah: It\'s about a cat. The cat is a police officer.\nSam: Cool! What does the cat do?\nSarah: He chases the mice. The mice are afraid of him.\nSam: Why?\nSarah: Because the mice are bad. They hurt people. The cat is angry with them.',
    translation: "Sam：这部动画片是关于什么的？\nSarah：是关于一只猫的。那只猫是一名警察。\nSam：真酷！那只猫做什么？\nSarah：他追赶老鼠。老鼠们害怕他。\nSam：为什么？\nSarah：因为老鼠们很坏，它们伤害人。猫生它们的气。",
    words: ['cartoon', 'cat', 'police', 'chases', 'mice', 'afraid', 'angry'],
    points: [
      '重点句型：The cat is angry with them.（猫生他们的气。）',
      'be angry with ... 生……的气；be afraid of ... 害怕……',
      'mouse 老鼠，复数形式是 mice',
    ],
  },
  'english-g6-a-6-2': {
    text: 'angry afraid sad worried happy\nHow does he feel? He\'s angry.',
    translation: "生气的 害怕的 难过的 担心的 高兴的\n他感觉怎么样？他很生气。",
    words: ['angry', 'afraid', 'sad', 'worried', 'happy'],
    points: [
      '重点句型：How does he feel?（他感觉怎么样？）答语：He\'s angry.',
      '情绪词汇：angry 生气的、afraid 害怕的、sad 难过的、worried 担心的、happy 高兴的',
    ],
  },
  'english-g6-a-6-3': {
    text: 'Sarah: What\'s wrong, Sam?\nSam: My father is ill.\nSarah: Oh, no! Don\'t be sad. He should see a doctor.\nSam: OK. I\'ll go with him.\nSarah: And you should do more exercise. It\'s good for you.\nSam: Yes, I will. Thank you, Sarah.',
    translation: "Sarah：怎么了，Sam？\nSam：我爸爸生病了。\nSarah：哦，不！别难过。他应该去看医生。\nSam：好的。我会陪他去。\nSarah：而且你应该多锻炼，这对你有好处。\nSam：好的，我会的。谢谢你，Sarah。",
    words: ['wrong', 'ill', 'sad', 'doctor', 'exercise', 'should'],
    points: [
      '重点句型：What\'s wrong?（怎么了？）用来询问对方状况',
      '重点句型：He should see a doctor.（他应该去看医生。）should 后面接动词原形',
      'You should do more exercise.（你应该多锻炼。）',
    ],
  },
  'english-g6-a-6-4': {
    text: 'see a doctor do more exercise wear warm clothes take a deep breath count to ten\nYou should take a deep breath and count to ten.',
    translation: "看医生 多锻炼 穿暖和的衣服 深呼吸 数到十\n你应该深呼吸并数到十。",
    words: ['doctor', 'exercise', 'wear', 'warm', 'clothes', 'breath', 'count'],
    points: [
      '重点句型：You should take a deep breath.（你应该深呼吸。）',
      '建议短语：see a doctor 看医生、do more exercise 多锻炼、wear warm clothes 穿暖和的衣服、take a deep breath 深呼吸、count to ten 数到十',
      'should 表示"应该"，用于给别人提建议',
    ],
  },
  'english-g6-a-6-5': {
    text: 'It is a sunny morning. Robin is going to sit on the grass. A little ant says, "Please don\'t sit on me. I can help you one day." The next day, Robin is stuck in the mud. The ant and his friends pull him out. Everyone is happy!',
    translation: "这是一个阳光明媚的早晨。Robin正要在草地上坐下。一只小蚂蚁说：“请不要坐在我身上。有一天我能帮你。”第二天，Robin陷在泥里了。蚂蚁和他的朋友们把他拉了出来。大家都很高兴！",
    words: ['sunny', 'grass', 'ant', 'mud', 'pull', 'happy'],
    points: [
      '阅读短文《Robin and the Ant》，理解帮助别人也会得到帮助',
      '复习情绪词：worried 担心的、happy 高兴的',
      'Don\'t worry.（别担心。）',
    ],
  },
  'english-g6-a-6-6': {
    text: 'Zip: I\'m so happy today! I got a new football.\nZoom: Great! Let\'s play together.\nZoom: Oh no! My football is lost. I\'m sad.\nZip: Don\'t be sad. Let\'s look for it.\nZip: Look! Here it is, under the chair.\nZoom: Hooray! I\'m happy again.\nZip: Don\'t worry. Friends help each other.',
    translation: "Zip：我今天太开心了！我得到了一个新足球。\nZoom：太好了！我们一起玩吧。\nZoom：哦，不！我的足球丢了。我很难过。\nZip：别难过。我们去找找它。\nZip：看！它在这里，在椅子下面。\nZoom：好哇！我又开心了。\nZip：别担心。朋友之间要互相帮助。",
    words: ['happy', 'football', 'lost', 'sad', 'look', 'chair', 'friends'],
    points: [
      '复习情绪句型：I\'m happy. / I\'m sad. / Don\'t be sad.',
      'Don\'t worry. 别担心；look for 寻找',
      'Friends help each other.（朋友互相帮助。）',
    ],
  },
};
