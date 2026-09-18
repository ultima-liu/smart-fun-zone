/** PEP（2022 版修订）英语三年级上册。页码为教材印刷页；原声听力待配套 MP3。 */
export type EnglishTurn = { speaker: string; text: string };
export type EnglishQuiz = { question: string; options: string[]; answer: string; explain: string };
export type EnglishPhonics = { letter: string; sound: string; words: [string, string] };
export type EnglishPartABlock = { id: 'talk' | 'practice' | 'learn' | 'activity'; title: string; page: number; goal: string; turns?: EnglishTurn[]; lines?: string[]; words?: string[] };
export type EnglishUnit = {
  id: string; title: string; question: string; color: string; start: number;
  opening: { look: string[]; chant: string[]; song: string; songLines: string[]; check: EnglishQuiz };
  a: { prompt: string; blocks: EnglishPartABlock[]; check: EnglishQuiz };
  letters: { items: EnglishPhonics[]; decode: string[]; check: EnglishQuiz };
  b: { prompt: string; blocks: EnglishPartABlock[]; check: EnglishQuiz };
  read: { lines: string[]; words: string[]; task: string; check: EnglishQuiz };
  project: { title: string; listenTask: string; steps: string[]; sentence: string; selfCheck: string[]; check: EnglishQuiz };
  story: { lines: string[]; check: EnglishQuiz };
};
export type EnglishSection = 'opening' | 'a' | 'letters' | 'b' | 'read' | 'project' | 'story';
export type EnglishLesson = { id: string; unitId: string; section: EnglishSection; title: string; subtitle: string; page: string; pageStart: number; pageEnd: number; check: EnglishQuiz };
const Q = (question: string, options: string[], answer: string, explain: string): EnglishQuiz => ({ question, options, answer, explain });
const T = (speaker: string, text: string): EnglishTurn => ({ speaker, text });

export const ENGLISH_G3_UPPER_UNITS: EnglishUnit[] = [
  {
    id: 'friends', title: 'Making friends', question: 'How do we make friends?', color: '#35a8d9', start: 2,
    opening: { look: ['Are they friends?', 'What makes you a good friend?'], chant: ['Hello! Hello!', "What’s your name?", 'Nice to meet you.', "Let’s play a game!"], song: 'Nice to meet you!', songLines: ['Nice to meet you, my new friend.', 'I am happy. Smile and say “Hi!”', 'Shake my hand. Let’s play a game now.'], check: Q('第一次见到新同学，哪句话适合友好地打招呼？', ['Nice to meet you.', 'Goodbye forever.', 'I do not listen.'], 'Nice to meet you.', '友好问候是结交朋友的第一步。') },
    a: { prompt: 'How do we greet friends?', blocks: [
      { id: 'talk', title: 'Let’s talk', page: 4, goal: '听懂初次见面的问候，并按人物顺序点读。', turns: [T('Mike', "Hello! I’m Mike Black."), T('Wu Binbin', 'Hi! My name is Wu Binbin.'), T('Mike', 'Nice to meet you.'), T('Wu Binbin', 'Nice to meet you too.')] },
      { id: 'practice', title: 'Role-play', page: 4, goal: '换名字进行两人角色扮演。', turns: [T('Sarah', 'Hello! My name is Sarah.'), T('John', "Hi! I’m John.")] },
      { id: 'learn', title: 'Let’s learn', page: 5, goal: '在人物图中学习身体部位词，并用完整句介绍自己。', turns: [T('Mike', 'Hello! My name is Mike Black.'), T('Sarah', "Hi! I’m Sarah Miller.")], words: ['ear', 'eye', 'mouth', 'hand', 'arm'] },
      { id: 'activity', title: 'Listen and do', page: 5, goal: '听指令，指出或做出对应动作。', lines: ['Wave your hand. Hello!', 'Look into my eyes. Hi!', 'Point to your ear. Listen!', 'Point to your mouth. Smile!', 'Wave your arm. Bye!'] },
    ], check: Q('Mike 说 “Nice to meet you.”，Binbin 最合适怎样回应？', ['Nice to meet you too.', 'Oh no!', 'How many apples?'], 'Nice to meet you too.', 'too 表示“我也一样”，用于回应问候。') },
    letters: { items: [{ letter: 'A', sound: '/æ/', words: ['apple', 'bag'] }, { letter: 'B', sound: '/b/', words: ['bed', 'Bob'] }, { letter: 'C', sound: '/k/', words: ['cat', 'can'] }, { letter: 'D', sound: '/d/', words: ['dog', 'sad'] }], decode: ['bad', 'cab', 'dad'], check: Q('cat 的第一个字母和教材中哪个字母的常见起首音对应？', ['Cc', 'Aa', 'Dd'], 'Cc', 'cat 的首字母是 c；字母名与词中的起首音要分开学。') },
    b: { prompt: 'How can we be a good friend?', blocks: [
      { id: 'talk', title: 'Let’s talk', page: 7, goal: '观察彩笔掉落与分享的完整情境，按人物顺序听读。', turns: [T('Chen Jie', 'Oh no!'), T('Sarah', "It’s OK, Chen Jie. We can share."), T('Chen Jie', 'Thanks, Sarah.'), T('Chen Jie', 'Hey, Sarah! We can share.'), T('Sarah', 'Thank you, Chen Jie.')] },
      { id: 'practice', title: 'Look and match', page: 7, goal: '观察三组情境，把前后能够自然回应的表达连起来。', lines: ['We can share.', 'Thank you.', 'Nice to meet you.', 'Nice to meet you too.', 'Oh no!', "It’s OK."] },
      { id: 'learn', title: 'Let’s learn', page: 8, goal: '结合四幅友好行为图，学习用完整句描述行动。', lines: ['I smile.', 'I listen.', 'I help.', 'I share.'] },
      { id: 'activity', title: 'Listen and chant', page: 8, goal: '在完整歌谣中判断怎样成为好朋友。', lines: ['Am I a good friend? Yes, I am!', 'I listen and say “Hi!” I smile too.', 'Am I a good friend? Yes, I am!', 'I help and share. I play fair too.'] },
    ], check: Q('朋友忘记带彩笔，你愿意借给她，哪句话最贴近教材情境？', ['We can share.', 'It is a tiger.', 'I am five.'], 'We can share.', 'share 是与朋友分享，不是拿走对方物品。') },
    read: { lines: ['I say “Hi!”', 'I listen.', 'I share.', 'I help.', 'I am nice to my friends.'], words: ['arm', 'ear', 'eye', 'hand', 'mouth', 'help', 'listen', 'say', 'share', 'smile'], task: '圈出海报中能表示友好行为的词，并想想自己做过哪一件。', check: Q('海报写 “I listen.”，朋友说话时我应怎样做？', ['认真听', '打断朋友', '自己一直说'], '认真听', 'listen 不只是听到声音，还要给朋友说话的机会。') },
    project: { title: 'Make a mind map of making friends', listenTask: 'P10：听 John 怎样在学校交朋友并圈选；需要教材原版 MP3。', steps: ['观察朋友可以做什么：Listen / Smile / Play together。', '把 Say “Hi” / Say “Bye” / Smile / Listen / Help / Share 写进朋友思维导图。', '在导图补一个自己的行动，并说给同伴听。'], sentence: 'Friends listen. Friends help and share.', selfCheck: ['I can greet people and show friendliness.', 'I can say the names of body parts.', 'I can say different ways to be a good friend.', 'I can read, write and say Aa, Bb, Cc and Dd.'], check: Q('朋友思维导图的中心最好写什么？', ['What do friends do?', 'How many yuan?', 'The zoo is big.'], 'What do friends do?', '把帮助交朋友的行动围绕同一个中心主题整理。') },
    story: { lines: ["Hi! I’m Zip.", 'Hi! My name is Zoom.', 'Nice to meet you.', 'Nice to meet you too.', 'Zoom is nice.', 'We share food.', 'We play together.', 'We listen with care and help each other.', 'Hold my hand.', 'We are good friends now.'], check: Q('Zoom 和 Zip 从刚认识到变成好朋友，中间做了什么？', ['分享、一起玩、认真听并帮助', '只记住名字', '名字说完就分开了'], '分享、一起玩、认真听并帮助', '故事把单元中的友好行动连成了一段关系。') },
  },
  {
    id: 'families', title: 'Different families', question: 'What makes a family?', color: '#73b96d', start: 14,
    opening: { look: ['Why are the people together?', 'How are families different?'], chant: ['We are a family,', 'A happy family,', 'My father, my mother,', 'My sister and me!'], song: 'My family', songLines: ['This is my mother. This is my father.', 'I am with my sister. I am with my brother.', 'This is my grandma. This is my grandpa.', 'I am with my aunt. I am with my uncle.'], check: Q('家里人数不同，能不能只用人数判断家人是否相爱？', ['不能', '能，人数越多越爱', '只看家里颜色'], '不能', '教材同时呈现不同大小的家庭，都相互关爱。') },
    a: { prompt: 'Who lives with you?', blocks: [
      { id: 'talk', title: 'Let’s talk', page: 16, goal: '跟随两个家庭场景，学习介绍朋友和家人。', turns: [T('Chen Jie', 'Mum! Dad! This is my friend, Sarah Miller.'), T('Parents', 'Hi, Sarah.'), T('Chen Jie', 'This is my grandma. This is my grandpa.'), T('Grandparents', 'Nice to meet you.')] },
      { id: 'practice', title: 'Listen, sing and play', page: 16, goal: '配合手指角色演唱 Finger family。', lines: ['Daddy Finger, Daddy Finger, where are you?', 'This is my daddy. How do you do?', 'Mummy Finger, Mummy Finger, where are you?', 'This is my mummy. How do you do?', 'Grandpa Finger, Grandpa Finger, where are you?', 'This is my grandpa. How do you do?', 'Grandma Finger, Grandma Finger, where are you?', 'This is my grandma. How do you do?'] },
      { id: 'learn', title: 'Let’s learn', page: 17, goal: '在家庭合照中辨认成员称呼。', turns: [T('Chen Jie', "Hi, I’m Chen Jie. Look! This is my family. This is my ...")], words: ['grandmother (grandma)', 'mother (mum)', 'father (dad)', 'grandfather (grandpa)', 'me', 'sister'] },
      { id: 'activity', title: 'Listen and chant', page: 17, goal: '用歌谣复习家庭成员和问候。', lines: ['This is my mum. Hello, hello, hello!', 'This is my dad. Hi, hi, hi!', 'This is my sister. How are you?', 'This is my grandma. Nice to meet you.', 'This is my grandpa. How do you do?'] },
    ], check: Q('向 Sarah 介绍自己的奶奶，可以说什么？', ['This is my grandma.', 'I like green.', 'How many lions?'], 'This is my grandma.', 'This is ... 用来把身边的人介绍给别人。') },
    letters: { items: [{ letter: 'E', sound: '/e/', words: ['egg', 'nest'] }, { letter: 'F', sound: '/f/', words: ['fish', 'beef'] }, { letter: 'G', sound: '/ɡ/', words: ['girl', 'pig'] }, { letter: 'H', sound: '/h/', words: ['hot', 'hat'] }], decode: ['fed', 'gab', 'had'], check: Q('fish 开头的字母在本课是哪一个？', ['Ff', 'Ee', 'Hh'], 'Ff', '先看词形定位字母，再听原版录音比较词中的声音。') },
    b: { prompt: 'How are families different?', blocks: [
      { id: 'talk', title: 'Let’s talk', page: 19, goal: '在家庭照片中辨认 cousin 和 brother，并区分 this 与 that。', turns: [T('Mike', 'Sarah, you have a big family. Is this your sister?'), T('Sarah', "No, it’s my cousin."), T('Mike', 'Is that your brother?'), T('Sarah', 'Yes, it is.')] },
      { id: 'practice', title: 'Ask and answer', page: 19, goal: '指着照片互问人物关系并作真实回答。', turns: [T('Child A', 'Is this your brother?'), T('Child B', "No, it’s my cousin.")] },
      { id: 'learn', title: 'Let’s learn', page: 20, goal: '学习大家庭成员称呼，并用 I have ... 介绍家庭。', lines: ['My family is big. I have a brother, a baby sister, a cousin ...'], words: ['uncle', 'aunt', 'cousin', 'baby sister', 'brother'] },
      { id: 'activity', title: 'Listen and chant', page: 20, goal: '用完整歌谣复习家庭成员。', lines: ['I have an uncle.', 'I have an aunt.', 'I have two cousins too.', 'I have a brother,', 'And a baby sister.', 'They can play with me.'] },
    ], check: Q('Mike 指远处的人问 “Is that your brother?”，Sarah 说是，怎样回答？', ['Yes, it is.', 'No, I do not like apples.', 'It is green.'], 'Yes, it is.', 'that 常指较远处的人或物；Yes, it is 回应是或不是。') },
    read: { lines: ['This is my mum. And this is my dad.', 'This is my family.', 'This family is small. They love each other.', 'This family is big. They love each other too.'], words: ['aunt', 'baby sister', 'brother', 'cousin', 'father', 'grandfather', 'grandmother', 'mother', 'sister', 'uncle'], task: '比较大小家庭两幅图：先找成员，再说共同点。', check: Q('两幅家庭图有什么相同的意思？', ['They love each other.', 'Everyone has a cousin.', 'All families are the same size.'], 'They love each other.', '人数与成员关系不同，但都可以相互关爱。') },
    project: { title: 'Make a family tree', listenTask: 'P22：听 Li Na 的家庭并找对应图；需要教材原版 MP3。', steps: ['在空白树图把 grandfather / grandmother 等成员放到对应位置。', '绘制或选择自己的家庭树；可以只填愿意分享的成员。', '用 This is my ... 向同伴介绍一位家人。'], sentence: 'This is my family tree. This is my ...', selfCheck: ['I can introduce my family to others.', 'I can name different family members.', 'I can say how families are different.', 'I can read, write and say Ee, Ff, Gg and Hh.'], check: Q('家庭树里的 cousin 与自己是什么关系？', ['堂（表）兄弟姐妹', '一定是妈妈', '一定是爸爸'], '堂（表）兄弟姐妹', '家庭树帮助理清关系，不要求所有家庭形状相同。') },
    story: { lines: ['This is my family.', 'I play with my brother.', 'We share.', 'We listen with care.', 'I have a small family.', 'I love my small family.', 'This is my family.', 'I play with my brothers.', 'I share with my sisters.', 'I talk with my cousins.', 'We listen with care.', 'I have a big family.', 'I love my big family.'], check: Q('两张 Family Poems 的共同结尾是什么？', ['都爱自己的家', '都只有一个兄弟', '都一样大'], '都爱自己的家', '短诗让我们看到不同家庭里的共同情感。') },
  },
  {
    id: 'animals', title: 'Our animal friends', question: 'How are animals different?', color: '#e8a844', start: 26,
    opening: { look: ['Whose hands are these?', 'What animals do you know?'], chant: ['So many animals,', 'Big, tall and small.', 'Pets and wild animals,', 'We love them all.'], song: 'Animal song', songLines: ['A dog says “woof”. A cat says “meow”.', 'A lion says “roar”. A tiger says “growl”.', 'I watch them run to the top of the hill, and then run down again.'], check: Q('同样是动物，家养宠物和野生动物可以完全一样对待吗？', ['不能，要尊重不同生活环境', '可以都带回家', '只看大小'], '不能，要尊重不同生活环境', '认识动物也要认识它们生活的地方。') },
    a: { prompt: 'What pets do you know?', blocks: [
      { id: 'talk', title: 'Let’s talk', page: 28, goal: '在到朋友家做客的情境中询问宠物。', turns: [T('Children', 'Good morning, Mike!'), T('Mike', 'Good morning! Come in.'), T('Children', 'I like your dog.'), T('Mike', 'Thanks. Do you have a pet?'), T('Wu Binbin', "No, I don’t."), T('Sarah', 'Yes, I do. I have a cat.')] },
      { id: 'practice', title: 'Do a survey', page: 28, goal: '调查同伴是否有宠物，并如实记录。', lines: ['Do you have a pet?', 'Yes, I do. I have a dog.', "No, I don’t."] },
      { id: 'learn', title: 'Let’s learn', page: 29, goal: '在宠物店场景中学习五种宠物名称。', lines: ['I like fish.', 'I like cats.', 'I like birds.', 'I like rabbits.', 'I like my dog.'], words: ['fish', 'cat', 'bird', 'rabbit', 'dog'] },
      { id: 'activity', title: 'Listen and do', page: 29, goal: '听动物指令并模仿动作。', lines: ['Run, run, run like a dog.', 'Sleep, sleep, sleep like a cat.', 'Sing, sing, sing like a bird.', 'Hop, hop, hop like a rabbit.', 'Swim, swim, swim like a fish.'] },
    ], check: Q('同学问 “Do you have a pet?”，你没有宠物，怎样回答？', ["No, I don’t.", 'Yes, I have a tiger.', 'It is six.'], "No, I don’t.", '宠物调查允许真实回答“没有”，不是每个人都必须有宠物。') },
    letters: { items: [{ letter: 'I', sound: '/ɪ/', words: ['ill', 'kid'] }, { letter: 'J', sound: '/dʒ/', words: ['job', 'jet'] }, { letter: 'K', sound: '/k/', words: ['Kim', 'kite'] }, { letter: 'L', sound: '/l/', words: ['leg', 'lion'] }], decode: ['big', 'dig', 'Jim', 'lab', 'led'], check: Q('lion 的第一个字母是什么？', ['Ll', 'Ii', 'Kk'], 'Ll', '先看首字母，听完整单词示范；纯音位需原版录音。') },
    b: { prompt: 'What wild animals do you know?', blocks: [
      { id: 'talk', title: 'Let’s talk', page: 31, goal: '在动物园情境中用 this / that 询问近处和远处的动物。', turns: [T('Miss White', "Let’s go to the zoo!"), T('Children', 'Great!'), T('Mike', "Look! What’s this?"), T('Chen Jie', "It’s a fox."), T('John', "Miss White, what’s that?"), T('Miss White', "It’s a red panda."), T('John', "It’s cute!")] },
      { id: 'practice', title: 'Play with hand shadows', page: 31, goal: '用手影创造动物，再和同伴问答。', turns: [T('Child A', "What’s that?"), T('Child B', "It’s a fox.")] },
      { id: 'learn', title: 'Let’s learn', page: 32, goal: '结合动物图片，用 It’s a ... 说出五种野生动物。', lines: ["It’s a panda.", "It’s a monkey.", "It’s a tiger.", "It’s an elephant.", "It’s a lion."] },
      { id: 'activity', title: 'Listen and chant', page: 32, goal: '在问答歌谣中快速辨认野生动物。', lines: ["What’s this? It’s an elephant.", "What’s this? It’s a monkey.", "What’s this? It’s a panda.", "What’s this? It’s a lion!", "What’s this? It’s a tiger!", 'Run!'] },
    ], check: Q('看到远处的小熊猫，问老师“那是什么”，应说？', ["What’s that?", "What’s this?", 'How old are you?'], "What’s that?", 'that 表示较远的位置，this 常表示较近。') },
    read: { lines: ['The giraffe is tall! (6 m)', 'The lion is fast! (60 km/h)', 'The elephant is big! (3 m, 6 t)', 'The fish is small! (8 cm)'], words: ['bird', 'lion', 'cat', 'monkey', 'dog', 'panda', 'elephant', 'rabbit', 'fish', 'tiger', 'giraffe'], task: '观察图片与数量信息，再按 big / small / tall / fast 分组。', check: Q('教材用 60 km/h 描述狮子，强调它的什么特点？', ['fast', 'small', 'purple'], 'fast', '大小、高矮、速度是不同的比较线索。') },
    project: { title: 'Make an animal picture book', listenTask: 'P34：听孩子喜欢哪些动物并圈出；需要教材原版 MP3。', steps: ['按宠物/野生或 big/small/tall/fast 选择一个清楚的分组标准。', '给每页选一只动物并写上名称、特点。', '向同伴说 This is my book. This is a ... It’s ...'], sentence: 'This is my book. This is a monkey. It’s cute.', selfCheck: ['I can tell others about my pets.', 'I can talk about wild animals.', 'I can group different animals.', 'I can read, write and say Ii, Jj, Kk and Ll.'], check: Q('动物图册一页放狮子，一页放老虎，分组标题哪一个更合适？', ['Wild animals', 'Family members', 'Fruit trees'], 'Wild animals', '分类需要先说明标准。') },
    story: { lines: ['Mum, what makes us great?', 'We are big.', 'Elephants are big too.', 'We are fast.', 'Fish are fast too.', 'We eat a lot.', 'Pandas eat a lot too.', 'I know! We sing!', 'Yes! We can sing nice songs.'], check: Q('小鲸鱼为什么最后觉得自己的歌很特别？', ['有些特点和别的动物相同，但歌声有自己的特点', '因为体型一定最大', '因为它不认识鱼'], '有些特点和别的动物相同，但歌声有自己的特点', '比较动物时不必只找“谁第一”，还要发现各自特点。') },
  },
  {
    id: 'plants', title: 'Plants around us', question: 'How do plants and people help each other?', color: '#62ba60', start: 38,
    opening: { look: ['What plants do you see?', 'What fruit do you like?'], chant: ['I see an apple.', 'I see grapes.', 'I like fruit.', "Let’s eat!", 'I have a garden.', 'I have water.', 'I like apples.', "Let’s grow a tree!"], song: 'Plants and us', songLines: ['I can water my plants. I can give them sun.', 'Plants can give me air. Plants can give me food.', 'We can help each other. Together we grow up right!'], check: Q('一棵果树和我们可以有什么双向联系？', ['我们照料它，它也给我们果实等', '只有我们需要它', '只靠果树自己说话'], '我们照料它，它也给我们果实等', '单元大问题不是只问水果名字，还问人与植物的联系。') },
    a: { prompt: 'What do we get from plants?', blocks: [
      { id: 'talk', title: 'Let’s talk', page: 40, goal: '在果园和农场情境中询问水果喜好。', turns: [T('Miss White', 'Mike, do you like apples?'), T('Mike', 'Yes, I do. And you?'), T('Miss White', "No, I don’t. I like bananas."), T('Miss White', 'Do you like the farm?'), T('Children', 'Yes, Miss White.'), T('Mike', 'I like the fresh air.')] },
      { id: 'practice', title: 'Ask and answer', page: 40, goal: '两人互问是否喜欢一种水果。', turns: [T('Child A', 'Do you like apples?'), T('Child B', 'Yes, I do.')] },
      { id: 'learn', title: 'Let’s learn', page: 41, goal: '在真实水果情境中学习四种水果名称。', turns: [T('Child A', 'Do you like apples?'), T('Child B', "No, I don’t. I like bananas.")], words: ['bananas', 'oranges', 'apples', 'grapes'] },
      { id: 'activity', title: 'Listen and chant', page: 41, goal: '在歌谣中比较水果特点和植物带来的事物。', lines: ['Grapes are small. Bananas are long.', 'Apples and oranges make you strong.', 'Trees grow and give us things:', 'Fresh air, flowers and leaves in spring.'] },
    ], check: Q('你喜欢葡萄但不喜欢苹果，别人问 “Do you like apples?”，怎样回答？', ["No, I don’t. I like grapes.", 'Yes, I do. I like apples.', 'How many grapes?'], "No, I don’t. I like grapes.", '礼貌地说明自己的真实喜好。') },
    letters: { items: [{ letter: 'M', sound: '/m/', words: ['map', 'mum'] }, { letter: 'N', sound: '/n/', words: ['new', 'fan'] }, { letter: 'O', sound: '/ɒ/', words: ['orange', 'fox'] }, { letter: 'P', sound: '/p/', words: ['pen', 'cup'] }], decode: ['nod', 'hop', 'men', 'nap', 'pig'], check: Q('map 的第一个字母是哪一个？', ['Mm', 'Pp', 'Nn'], 'Mm', 'm 与 p 看起来都有竖线，辨音还需要听对应录音。') },
    b: { prompt: 'How can we help plants?', blocks: [
      { id: 'talk', title: 'Let’s talk', page: 43, goal: '在校园花园情境中提出具体的护绿行动。', turns: [T('Miss White', 'The school gardens need help.'), T('Chen Jie', 'We can water the flowers.'), T('Sarah', 'We can water the grass.'), T('Miss White', 'Nice. And?'), T('Wu Binbin', 'We can plant new trees.')] },
      { id: 'practice', title: 'Look and talk', page: 43, goal: '观察图片，用 How can we help? 和 We can ... 讨论办法。', turns: [T('Child A', 'How can we help?'), T('Child B', 'We can plant trees.')] },
      { id: 'learn', title: 'Let’s learn', page: 44, goal: '认识植物生长需要的条件和校园里的植物。', lines: ['Plants need air, water and sun.'], words: ['sun', 'air', 'water', 'trees', 'flowers', 'grass'] },
      { id: 'activity', title: 'Listen and chant', page: 44, goal: '用歌谣区分植物需要的条件和人能做的行动。', lines: ['Air, water and sun.', 'These can all help plants grow.', 'Plant, water, cut and turn.', 'These are some things I know.'] },
    ], check: Q('学校花园干燥，最直接怎样帮花朵？', ['We can water the flowers.', 'We can count lions.', 'We can colour the sky.'], 'We can water the flowers.', '说行动时还要让行动与植物需要相对应。') },
    read: { lines: ['Plants can give us many things. We need plants.', 'Plants need air, water and sun. Can we help them?', 'Flowers need air, water and sun.', 'We can help them.'], words: ['apples', 'bananas', 'grapes', 'oranges', 'air', 'sun', 'water', 'flowers', 'grass', 'tree'], task: '对照果树图：找出树需要的条件和树给我们的东西。', check: Q('植物生长要什么？', ['air, water and sun', 'only red paint', 'only a toy car'], 'air, water and sun', '这些是植物生长的基本条件，不等于每次浇水越多越好。') },
    project: { title: 'Make a paper garden', listenTask: 'P46：听 Binbin、John、Chen Jie、Sarah 喜欢什么水果并连线；需要教材原版 MP3。', steps: ['讨论 fruit trees need 什么，以及人们 can help 它们做什么。', '制作水果、空气、阳光、水和行动卡片，放进自己的纸上花园。', '对同伴介绍：The apple trees need air, water and sun. We can help them.'], sentence: 'This is my garden. The apple trees need air, water and sun.', selfCheck: ['I can ask about fruit and say the fruit I like.', 'I can name some plants and talk about how they grow.', 'I can say how we help plants and plants help us.', 'I can read, write and say Mm, Nn, Oo and Pp.'], check: Q('纸上花园把“阳光”放在哪一类？', ['植物需要的条件', '水果名称', '家庭成员'], '植物需要的条件', '花园图要区分植物需要什么、给我们什么和我们做什么。') },
    story: { lines: ['I am an apple tree.', 'My new family help me.', 'I need air, water and sun.', 'My family water me.', 'It is cold. They help me.', 'My family like me.', 'I am big now. I give apples to my family.', 'We are all happy!'], check: Q('苹果树从小到大怎样与家人相互帮助？', ['家人照料树，树长大给苹果', '树只要彩纸', '家人不照料树'], '家人照料树，树长大给苹果', '故事用苹果树视角串联照料、生长与收获。') },
  },
  {
    id: 'colours', title: 'The colourful world', question: 'Why are colours important?', color: '#bc81da', start: 50,
    opening: { look: ['What colours do you see?', 'What colours do you like?'], chant: ['The sun is orange.', 'Grass is green.', 'What about the sky and sea?', 'Roses are red.', 'Snow is white.', 'Please, please tell me why!'], song: 'Colour song', songLines: ['Red and orange and yellow and green,', 'Purple and then I see blue.', 'I can see a rainbow. Can you see one too?', 'They can mean stop, wait and go.'], check: Q('颜色在生活中除了好看，还能做什么？', ['传递信息与提醒', '代替所有数字', '让物体不需要名字'], '传递信息与提醒', '本单元后面用信号颜色理解安全和再次使用。') },
    a: { prompt: 'What colours do you see?', blocks: [
      { id: 'talk', title: 'Let’s talk', page: 52, goal: '在绘画活动中询问颜色并观察混色。', turns: [T('John', 'What colour is it?'), T('Chen Jie', "It’s orange."), T('Sarah', 'What colour is it?'), T('Wu Binbin', "It’s green."), T('Sarah', 'Look! Red and blue make purple.'), T('Wu Binbin', 'Wow!')] },
      { id: 'practice', title: 'Guess and check', page: 52, goal: '先猜颜色，再用混色验证。', turns: [T('Child A', 'What colour is it?'), T('Child B', "It’s green."), T('Child A', 'Wow! Blue and yellow make green.')] },
      { id: 'learn', title: 'Let’s learn', page: 53, goal: '把颜色词与真实事物短语对应。', lines: ['a brown bear', 'a yellow duck', 'a purple flower', 'green grass', 'blue sea'], words: ['brown', 'yellow', 'purple', 'green', 'blue'] },
      { id: 'activity', title: 'Listen and chant', page: 53, goal: '在完整语句中发现生活里的颜色。', lines: ['I see colours here and there.', 'Purple flowers, green grass and blue sea.', 'I see colours here and there.', 'A big brown bear. What else can you see?'] },
    ], check: Q('红色和蓝色颜料混合的示例，书上得到什么颜色？', ['purple', 'green', 'black'], 'purple', '书里的混色示例可用真实颜色板观察，而不是只背词。') },
    letters: { items: [{ letter: 'Q', sound: '/kw/', words: ['quiet', 'queen'] }, { letter: 'R', sound: '/r/', words: ['red', 'ruler'] }, { letter: 'S', sound: '/s/', words: ['see', 'bus'] }, { letter: 'T', sound: '/t/', words: ['Ted', 'sit'] }, { letter: 'U', sound: '/ʌ/', words: ['up', 'run'] }], decode: ['cut', 'quit', 'rot', 'set', 'tap', 'tub'], check: Q('quiet 开头常出现哪两个字母一起？', ['qu', 'qr', 'uq'], 'qu', '教材把 Qq 与 u 的组合放在一起学习，不能只把 q 当一个孤立声音。') },
    b: { prompt: 'How do colours help us?', blocks: [
      { id: 'talk', title: 'Let’s talk', page: 55, goal: '询问颜色喜好，并把喜欢的颜色用于共同绘画。', turns: [T('Chen Jie', 'What colours do you like?'), T('Sarah', 'I like red and pink.'), T('Chen Jie', "OK. Let’s draw some red and pink flowers."), T('Chen Jie', 'And the birds?'), T('Sarah', "Let’s draw some purple and brown birds.")] },
      { id: 'practice', title: 'Colour and say', page: 55, goal: '给图画配色，再用完整句说出自己的颜色喜好。', turns: [T('Child A', 'What colours do you like?'), T('Child B', 'I like green and yellow.')] },
      { id: 'learn', title: 'Let’s learn', page: 56, goal: '结合色块学习五个颜色词。', words: ['pink', 'orange', 'red', 'white', 'black'] },
      { id: 'activity', title: 'Listen and do', page: 56, goal: '听颜色指令并完成对应身体动作。', lines: ['Black, black, sit down.', 'White, white, turn around.', 'Pink and red, touch the ground.', 'Orange and red, jump up and down.'] },
    ], check: Q('Sarah 喜欢红色和粉色，邀请一起画花，应先问什么？', ['What colours do you like?', 'How old are you?', 'Do you have a pet?'], 'What colours do you like?', '问喜好时用 colours，因为可能喜欢不止一种。') },
    read: { lines: ['It’s red. Red can say “No!”', 'It’s green. Green can say “Go!”', 'It’s blue. Blue can say “Use again!”', 'It’s yellow. Yellow can say “Be careful!”'], words: ['black', 'blue', 'brown', 'green', 'orange', 'pink', 'purple', 'red', 'white', 'yellow'], task: '把红、绿、蓝、黄四种颜色与教材中的提示意义配对，再动手观察混色。', check: Q('教材里黄色提示牌表达什么？', ['Be careful!', 'Go!', 'Use again!'], 'Be careful!', '颜色的意义取决于具体标志和场景，不能脱离情境。') },
    project: { title: 'Make a colour flip book', listenTask: 'P58：听孩子说出哪些颜色并圈选；需要教材原版 MP3。', steps: ['给物品添加真实颜色标签，先问 What colour is it?', '选择自己喜欢的颜色，制作能翻动的颜色小书。', '分享时说 I like yellow, red and blue. Bananas are yellow.'], sentence: 'This is my book. I like yellow, red and blue.', selfCheck: ['I can tell others about the colours I see and like.', 'I can tell the colour of things.', 'I can talk about what colours mean.', 'I can read, write and say Qq, Rr, Ss, Tt and Uu.'], check: Q('颜色翻页小书中给香蕉贴什么颜色标签最符合教材例子？', ['yellow', 'purple', 'black'], 'yellow', '物品与颜色对应之后再说完整句。') },
    story: { lines: ['I am a sunflower. I am tall and green.', 'Then I am green and yellow.', 'Now I am a big yellow flower. Bees come.', 'They are yellow and black. I give them food.', 'Now it is cold. I am green and brown.', 'I am gone. But my children grow.'], check: Q('向日葵故事里的颜色变化主要和什么一起发生？', ['生长与季节变化', '一天换十次名字', '朋友拿走颜色卡'], '生长与季节变化', '颜色也能帮助观察植物生命周期。') },
  },
  {
    id: 'numbers', title: 'Useful numbers', question: 'Why are numbers important?', color: '#ee925f', start: 62,
    opening: { look: ['What numbers do you see?', 'Where do you see numbers?'], chant: ['One boy, two boys,', 'Three boys, four!', 'Five boys, six boys,', 'Seven boys, more!'], song: 'Numbers', songLines: ['How old are you, my friend?', 'I can count up from one to ten.', 'I can count back again.', 'We can sort and solve and count.'], check: Q('生日卡上的 6 和价格牌上的 6，一定表示同一件事吗？', ['不一定，要看旁边的情境', '一定都表示年龄', '一定都表示水果'], '不一定，要看旁边的情境', '数字在年龄、数量、时间和价格里有不同用途。') },
    a: { prompt: 'When do we use numbers?', blocks: [
      { id: 'talk', title: 'Let’s talk', page: 64, goal: '在介绍兄弟姐妹的情境中询问年龄。', turns: [T('Sarah', 'Binbin, this is my brother, Sam.'), T('Wu Binbin', 'Hi, Sam! This is my sister, Xinxin.'), T('Sam', 'Hello, Xinxin!'), T('Xinxin', 'Hi, Sam!'), T('Wu Binbin', 'How old are you?'), T('Sam', "I’m five years old."), T('Xinxin', 'Me too.')] },
      { id: 'practice', title: 'Choose and role-play', page: 64, goal: '选择人物卡，替换姓名和年龄进行表演。', turns: [T('Child A', 'Hello, Xiaoli! How old are you?'), T('Xiaoli', "I’m five years old.")] },
      { id: 'learn', title: 'Let’s learn', page: 65, goal: '在数校园物体的情境中学习 one 到 five。', lines: ['One, two, three, four, five.'], words: ['one', 'two', 'three', 'four', 'five'] },
      { id: 'activity', title: 'Listen and chant', page: 65, goal: '边跳绳边顺数、倒数，建立数词顺序。', lines: ['Jump! Jump! Jump! One, two, three!', 'Jump! Jump! Jump! Three, two, one!', 'Four and five! Four and five!', 'Jump up high! Jump up high!', 'Five! Four! Three, two, one!', "Jump! Jump! It’s such fun!"] },
    ], check: Q('向新朋友问年龄，哪一句才问“几岁”？', ['How old are you?', 'How many apples?', 'What colour is it?'], 'How old are you?', 'How old 问年龄，不要把它和 How many 问数量混淆。') },
    letters: { items: [{ letter: 'V', sound: '/v/', words: ['van', 'vet'] }, { letter: 'W', sound: '/w/', words: ['we', 'win'] }, { letter: 'X', sound: '/ks/', words: ['box', 'six'] }, { letter: 'Y', sound: '/j/', words: ['yellow', 'yo-yo'] }, { letter: 'Z', sound: '/z/', words: ['Zip', 'quiz'] }], decode: ['wet', 'vat', 'won', 'yes', 'yum', 'zig'], check: Q('six 里的 x 在字母的哪一处？', ['词尾', '词首', '中间必须只有 x'], '词尾', '教材本课还要“听一听末尾音”，不能只学首字母。') },
    b: { prompt: 'How useful are numbers?', blocks: [
      { id: 'talk', title: 'Let’s talk', page: 67, goal: '在购物准备情境中询问水果数量并核对钱数。', turns: [T('Wu Binbin', 'How many apples?'), T('Sarah', 'Two.'), T('Wu Binbin', 'How many bananas?'), T('Sarah', 'Three. And one orange.'), T('Wu Binbin', 'OK.'), T('Wu Binbin', 'I have ten yuan.'), T('Sarah', 'I have six yuan.'), T('Wu Binbin', "Great! Let’s go to the shop!")] },
      { id: 'practice', title: 'Count and say', page: 67, goal: '观察图片数一数，再用 How many ...? 回答数量。', turns: [T('Child A', 'How many lions?'), T('Child B', 'Two.')] },
      { id: 'learn', title: 'Let’s learn', page: 68, goal: '在付款情境中学习 six 到 ten。', turns: [T('Shopkeeper', "That’s ten yuan, please."), T('Child', 'Here you are.')], words: ['six', 'seven', 'eight', 'nine', 'ten'] },
      { id: 'activity', title: 'Listen and chant', page: 68, goal: '把身体部位数量与人物、蜘蛛和蜜蜂对应起来。', lines: ['One head, two legs, ten toes.', 'I am a child.', 'One head, eight eyes, eight legs.', 'I am a spider.', 'One head, four wings, six legs.', 'I am a bee.'] },
    ], check: Q('“How many apples?” 问的是哪一种数？', ['苹果的数量', '年龄', '整点时间'], '苹果的数量', 'many 要和可数的物品连在一起。') },
    read: { lines: ["It’s seven o’clock. Hurry!", 'One orange, two apples and three bananas.', 'Happy birthday!', "Dogs don’t eat cake, Sam!", "Three cuts. Let’s eat!", 'Oh, one more cut for the dog.'], words: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'], task: '先圈出故事里的数字，再把 1～10 分成 odd / even 两组。', check: Q('“It’s seven o’clock.” 里的 seven 表示什么？', ['时间', '七个苹果', '七岁'], '时间', '数字必须连同场景和单位一起读。') },
    project: { title: 'Make a birthday card', listenTask: 'P70：只听音判断人数和 Matt 年龄；需要教材原版 MP3。', steps: ['阅读生日卡，找年龄、聚会时间和卡上的数字。', '制作自己的电子生日卡：填写时间、对象和祝福。', '把卡给朋友，练习 Happy birthday! / Thanks!'], sentence: 'Happy birthday! — Thanks!', selfCheck: ['I can ask about age and number.', 'I can count things with the numbers 1 to 10.', 'I can use the numbers 1 to 10 in different places.', 'I can read, write and say Vv, Ww, Xx, Yy and Zz.'], check: Q('生日卡里写 “6 p.m.”，这个 6 表示？', ['聚会时间', '蛋糕数量', '收件人的名字'], '聚会时间', '卡片上的数字要和附近的信息一起理解。') },
    story: { lines: ['How many cards? Six.', "What’s this? Six.", 'Right.', "What’s this? Hmm, six?", "You’re right again.", "What’s this? It’s six in Chinese.", 'What about this?', "I don’t know.", 'This is six too. It’s a Jiaguwen number.', 'Jiaguwen is over 3,000 years old!', 'Wow!'], check: Q('故事里的“六”用了几种不同的表示方式？', ['阿拉伯数字、英文、罗马数字、汉字和甲骨文等', '只有英语单词', '只有颜色'], '阿拉伯数字、英文、罗马数字、汉字和甲骨文等', '同一个数量可以用不同文化的符号表示。') },
  },
];

const SECTION_META: { key: EnglishSection; offset: number; span: number; title: string; subtitle: string }[] = [
  { key: 'opening', offset: 0, span: 2, title: '主题与问题', subtitle: '看图、歌谣与单元大问题' },
  { key: 'a', offset: 2, span: 2, title: 'Part A · 听说与词汇', subtitle: '对话、角色扮演、动作词' },
  { key: 'letters', offset: 4, span: 1, title: 'Letters and sounds', subtitle: '字母、词形、辨音与书写' },
  { key: 'b', offset: 5, span: 2, title: 'Part B · 应用表达', subtitle: '新情境对话与歌谣' },
  { key: 'read', offset: 7, span: 1, title: 'Start to read', subtitle: '短文、海报与读后任务' },
  { key: 'project', offset: 8, span: 2, title: 'Part C · 项目活动', subtitle: '制作、分享与单元自评' },
  { key: 'story', offset: 10, span: 2, title: 'Reading time', subtitle: '完整故事与意义讨论' },
];
export const ENGLISH_G3_UPPER_LESSONS: EnglishLesson[] = ENGLISH_G3_UPPER_UNITS.flatMap((unit) => SECTION_META.map((section) => {
  const first = unit.start + section.offset;
  const last = first + section.span - 1;
  const data = unit[section.key];
  return { id: `${unit.id}-${section.key}`, unitId: unit.id, section: section.key, title: `${unit.title} · ${section.title}`, subtitle: section.subtitle, page: first === last ? `P${first}` : `P${first}–${last}`, pageStart: first, pageEnd: last, check: data.check };
}));

export const ENGLISH_G3_UPPER_REVISION = {
  title: 'Being a good guest', start: 74,
  pages: [
    { id: 'guest-observe', title: '礼貌到访 · 听读观察', pageStart: 74, pageEnd: 75, lines: ['Mum! Dad! This is Wu Binbin. And this is Mike Black.', 'Hi, Binbin! Hello, Mike! Nice to meet you.', 'Nice to meet you too.', 'This is for you.', 'Thank you.', 'Be nice, please.', 'We can help.', 'Do you like bananas, Binbin?', 'Yes, I do. Thanks.'], check: Q('主人给你一件礼物，教材对话里最自然的回应是？', ['Thank you.', "What’s that?", 'I am five.'], 'Thank you.', '不同单元的表达在真实做客情境里连起来用。') },
    { id: 'guest-act', title: '礼貌到访 · 表演与清单', pageStart: 76, pageEnd: 77, lines: ["Let’s play together!", "What’s this?", "It’s a bear.", 'Is that a tiger?', "No, it’s a lion.", 'Wow! We have a zoo!', 'Shh…', 'Knock! Knock! Say “Hello!”', 'Say “Thank you!”', 'Care and share.', 'Say “Goodbye!”'], check: Q('陈杰在一起玩的时候说 “Shh…”，最可能在提醒什么？', ['放低声音，不打扰别人', '把音乐开得更响', '马上数到十'], '放低声音，不打扰别人', '做客时友好、分享，也要留意环境和他人。') },
  ],
};

export const ENGLISH_G3_ALL_LESSONS: EnglishLesson[] = [
  ...ENGLISH_G3_UPPER_LESSONS,
  ...ENGLISH_G3_UPPER_REVISION.pages.map((page) => ({ id: page.id, unitId: 'revision', section: 'read' as const, title: page.title, subtitle: '跨单元综合复习', page: `P${page.pageStart}–${page.pageEnd}`, pageStart: page.pageStart, pageEnd: page.pageEnd, check: page.check })),
];
export function getEnglishG3Lesson(id: string) { return ENGLISH_G3_ALL_LESSONS.find((lesson) => lesson.id === id); }
export function getEnglishG3Unit(id: string) { return ENGLISH_G3_UPPER_UNITS.find((unit) => unit.id === id); }
