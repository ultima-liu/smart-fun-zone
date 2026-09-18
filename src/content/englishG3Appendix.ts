/** 对应教材附录 P78–82：歌曲歌词与 Letters and sounds 歌谣文本。节奏/纯音位仍需原版 MP3。 */
export const ENGLISH_G3_SONGS: Record<string, string[]> = {
  friends: ['Nice to meet you. Nice to meet you.', 'Nice to meet you, my new friend.', 'I am happy. Smile and say “Hi!”', 'Nice to meet you, my new friend.', 'Nice to meet you. Nice to meet you.', 'Nice to meet you, my new friend.', 'Shake my hand. Let’s play a game now.', 'Nice to meet you, my new friend.'],
  families: ['This is my mother. This is my father.', 'Where am I? Where am I?', 'I am with my sister. I am with my brother.', 'My family and I. My family and I.', 'This is my grandma. This is my grandpa.', 'Where am I? Where am I?', 'I am with my aunt. I am with my uncle.', 'My family and I. My family and I.'],
  animals: ['A dog says “woof”. A cat says “meow”.', 'I watch them run to the top of the hill,', 'And then run down again.', 'A lion says “roar”. A tiger says “growl”.', 'I watch them run to the top of the hill,', 'And then run down again.'],
  plants: ['I can water my plants.', 'I can give them sun.', 'I can help them grow.', 'I help them grow alright!', 'Plants can give me air.', 'Plants can give me food.', 'Plants can help me grow, grow, grow.', 'They help me grow alright!', 'We can help each other.', 'We can help so much.', 'We can grow together.', 'Together we grow up right!'],
  colours: ['Red and orange and yellow and green,', 'Purple and then I see blue.', 'I can see a rainbow, see a rainbow.', 'Can you see one too?', 'Red and yellow and then I see green.', 'They can mean stop, wait and go.', 'Colours from the rainbow, from the rainbow.', 'What can they show?'],
  numbers: ['How old are you, my friend?', 'I can count up from one to ten.', 'How old are you, my friend?', 'I can count back again.', 'How can numbers help us out?', 'We can sort and solve and count.', 'How can numbers help us out?', 'We can help each other out!'],
};

export const ENGLISH_G3_FINGER_FAMILY: string[] = [
  'Daddy Finger, Daddy Finger, where are you? This is my daddy. How do you do?',
  'Mummy Finger, Mummy Finger, where are you? This is my mummy. How do you do?',
  'Grandpa Finger, Grandpa Finger, where are you? This is my grandpa. How do you do?',
  'Grandma Finger, Grandma Finger, where are you? This is my grandma. How do you do?',
];

export const ENGLISH_G3_PHONICS_CHANTS: Record<string, { alphabet: string[]; examples: string[] }> = {
  friends: { alphabet: ['A, A, A. Show me an A!', 'B, B, B. Show me a B!', 'C, C, C. Show me a C!', 'D, D, D. Show me a D!', 'After me. A, B, C, D!'], examples: ['A is for /æ/. /æ/, /æ/, apple; bag. I see an apple in a bag.', 'B is for /b/. /b/, /b/, bed; Bob. I see Bob in the bed.', 'C is for /k/. /k/, /k/, cat; can. I see a cat and a can.', 'D is for /d/. /d/, /d/, dog; sad. The dog is sad.'] },
  families: { alphabet: ['E, E, E. Show me an E!', 'F, F, F. Show me an F!', 'G, G, G. Show me a G!', 'H, H, H. Show me an H!', 'Say E, F, G and H!'], examples: ['E is for /e/. /e/, /e/, egg; nest. I see an egg in the nest.', 'F is for /f/. /f/, /f/, fish; beef. I see fish and beef.', 'G is for /ɡ/. /ɡ/, /ɡ/, girl; pig. The girl has a pig.', 'H is for /h/. /h/, /h/, hot; hat. He is hot in the hat.'] },
  animals: { alphabet: ['I, I, I. Show me an I!', 'J, J, J. Show me a J!', 'K, K, K. Show me a K!', 'L, L, L. Show me an L!', 'Say it well. I, J, K and L!'], examples: ['I is for /ɪ/. /ɪ/, /ɪ/, ill; kid. The kid is ill.', 'J is for /dʒ/. /dʒ/, /dʒ/, job; jet. His job is to fly a jet.', 'K is for /k/. /k/, /k/, Kim; kite. Kim has a kite.', 'L is for /l/. /l/, /l/, leg; lion. The lion has four legs.'] },
  plants: { alphabet: ['M, M, M. Show me an M!', 'N, N, N. Show me an N!', 'O, O, O. Show me an O!', 'P, P, P. Show me a P!', 'Say it with me. M, N, O, P!'], examples: ['M is for /m/. /m/, /m/, map; mum. Mum has a map.', 'N is for /n/. /n/, /n/, new; fan. The fan is new.', 'O is for /ɒ/. /ɒ/, /ɒ/, orange; fox. The fox is orange.', 'P is for /p/. /p/, /p/, pen; cup. I see a pen and a cup.'] },
  colours: { alphabet: ['Q, Q, Q. Show me a Q!', 'R, R, R. Show me an R!', 'S, S, S. Show me an S!', 'T, T, T. Show me a T!', 'U, U, U. Show me a U!', 'That sounds good. Q, R, S, T, U!'], examples: ['Q goes with u. /kw/, /kw/, quiet; queen. The queen is quiet.', 'R is for /r/. /r/, /r/, red; ruler. The ruler is red.', 'S is for /s/. /s/, /s/, see; bus. I see a bus.', 'T is for /t/. /t/, /t/, Ted; sit. Sit down, Ted!', 'U is for /ʌ/. /ʌ/, /ʌ/, up; run. Get up and run!'] },
  numbers: { alphabet: ['V, V, V. Show me a V!', 'W, W, W. Show me a W!', 'X, X, X. Show me an X!', 'Y, Y, Y. Show me a Y!', 'Z, Z, Z. Show me a Z!', 'Chant with me. V, W, X, Y, Z!'], examples: ['V is for /v/. /v/, /v/, van; vet. It’s the vet’s van.', 'W is for /w/. /w/, /w/, we; win. We win again!', 'X is for /ks/. /ks/, /ks/, box; six. Number six is on the box.', 'Y is for /j/. /j/, /j/, yellow; yo-yo. It’s a yellow yo-yo.', 'Z is for /z/. /z/, /z/, Zip; quiz. Zip has a quiz.'] },
};
