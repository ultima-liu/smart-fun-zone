import { getEnglishG3Lesson } from './englishGrade3Upper';

type Discovery = { question: string; prompts: readonly [string, string]; image: 'first' | 'last' };
const D = (question: string, first: string, second: string, image: Discovery['image'] = 'first'): Discovery => ({ question, prompts: [first, second], image });

/** Questions belong to the lesson's visible material, rather than repeating the unit launch in every lesson. */
export const ENGLISH_DISCOVERY: Readonly<Record<string, Discovery>> = {
  'friends-opening': D('How do we make friends?', 'Are the children friends?', 'What do they do together?'),
  'friends-a': D('How do Mike and Wu Binbin greet each other?', 'How do they tell each other their names?', 'How do they reply to “Nice to meet you”?'),
  'friends-letters': D('Where are Aa, Bb, Cc and Dd in these words?', 'Which words start with a, b or c?', 'Can you find d at the end of a word?'),
  'friends-b': D('How can Sarah help Chen Jie?', 'What happens to the crayons?', 'How can the two friends share?'),
  'friends-read': D('What friendly actions can you find on this poster?', 'Which picture shows listening?', 'Which picture shows helping or sharing?'),
  'friends-project': D('What can we put in a friendship mind map?', 'What goes in the middle of the map?', 'Which actions can go around it?', 'last'),
  'friends-story': D('How do Zoom and Zip become friends?', 'How do they first greet each other?', 'What do they do together in the story?'),

  'families-opening': D('What makes a family?', 'Who can you see in these families?', 'How are the families different?'),
  'families-a': D('How does Chen Jie introduce her family to Sarah?', 'Who does Sarah meet?', 'How can Chen Jie introduce her grandparents?'),
  'families-letters': D('Can you find Ee, Ff, Gg and Hh in these words?', 'Which letters start egg and fish?', 'Where is g in girl and pig?'),
  'families-b': D('Who are the people in Sarah’s family photo?', 'Who is Sarah’s cousin?', 'Which person does Mike point to?'),
  'families-read': D('What do the big and small families have in common?', 'How many people are in each picture?', 'How do the words show love in both families?'),
  'families-project': D('How can a family tree introduce our family?', 'What can we put on the family tree?', 'How can we introduce one family member?', 'last'),
  'families-story': D('What do the two family poems tell us?', 'Who do the children play with?', 'How do both children feel about their families?'),

  'animals-opening': D('How are animals different?', 'Whose hands can you see?', 'Which animals do you recognise?'),
  'animals-a': D('What pets do Mike and his friends talk about?', 'Which pet can you see at Mike’s home?', 'How can they ask about a friend’s pet?'),
  'animals-letters': D('What do Ii, Jj, Kk and Ll look like in words?', 'Which letters start ill and job?', 'Which words start with k or l?'),
  'animals-b': D('What animals can the children see at the zoo?', 'Which animal is close to them?', 'How can they ask about an animal farther away?'),
  'animals-read': D('What clues help us describe the animals?', 'Which animal does the text call big or tall?', 'Which animal does the text call fast?'),
  'animals-project': D('How can we make an animal picture book?', 'Which group of animals can we choose?', 'How can we introduce an animal in the book?', 'last'),
  'animals-story': D('What makes the little whale special?', 'Which other animals can you find in the story?', 'What can the whale do besides being big?'),

  'plants-opening': D('How do plants and people help each other?', 'What plants can you see?', 'What do people get from plants?'),
  'plants-a': D('What fruit do the children talk about on the farm?', 'What fruit can you find in the picture?', 'How do they ask about fruit they like?'),
  'plants-letters': D('How do Mm, Nn, Oo and Pp appear in these words?', 'Which letters start map and new?', 'Where are o and p in orange, fox, pen and cup?'),
  'plants-b': D('How can the children help the school garden?', 'Which plants need help?', 'What can the children do for them?'),
  'plants-read': D('What do plants need, and what can they give us?', 'Which words tell us what plants need?', 'Which pictures show things plants give us?'),
  'plants-project': D('What do we need to make a paper garden?', 'Which cards show what the trees need?', 'How can we use the cards to introduce our garden?', 'last'),
  'plants-story': D('How does the family help the apple tree grow?', 'What changes as the apple tree grows?', 'What does the tree give the family later?'),

  'colours-opening': D('Why are colours important?', 'What colours can you find around the children?', 'Where might colours give us a message?'),
  'colours-a': D('What happens when the children mix colours?', 'What colours do they start with?', 'What new colour can they make?'),
  'colours-letters': D('Where are Qq, Rr, Ss, Tt and Uu in these words?', 'Which letters are together in quiet?', 'Can you find s or t at the end of a word?'),
  'colours-b': D('How do Chen Jie and Sarah choose colours for a picture?', 'What colours does Sarah like?', 'What colours do they choose for flowers and birds?'),
  'colours-read': D('What messages do the coloured signs give us?', 'Which colour says “Go” in this scene?', 'Which sign asks us to be careful?'),
  'colours-project': D('How can pictures and colours make a flip book?', 'How are the pictures grouped by colour?', 'How can we describe a coloured object?', 'last'),
  'colours-story': D('How do the sunflower’s colours change as it grows?', 'What colours can you find at different stages?', 'What happens when the bees come?'),

  'numbers-opening': D('Why are numbers important?', 'Where can you find numbers in the picture?', 'What could these numbers tell us?'),
  'numbers-a': D('How do Sam and Xinxin talk about their ages?', 'Who are the children meeting?', 'How can they ask “How old are you”?'),
  'numbers-letters': D('Where can you find Vv, Ww, Xx, Yy and Zz?', 'Which letters start van, we and yellow?', 'Where is x in box and six?'),
  'numbers-b': D('How do numbers help Binbin and Sarah go shopping?', 'How many fruits do they plan to buy?', 'What numbers tell us how much money they have?'),
  'numbers-read': D('What do the numbers mean in this birthday story?', 'Which number tells us the time?', 'Which numbers tell us how many fruits there are?'),
  'numbers-project': D('What can a birthday card tell a friend?', 'What information can you find on the card?', 'What can we say when giving a birthday card?', 'last'),
  'numbers-story': D('How can the same number have different forms?', 'Which cards show the number six?', 'What looks different about the number symbols?'),

  'guest-observe': D('How do the guests greet the family when they arrive?', 'How are the guests introduced?', 'How do they respond to a gift?'),
  'guest-act': D('How can we play politely at a friend’s home?', 'What toy animals do the children talk about?', 'Why might they need to lower their voices?'),
};

export function getEnglishDiscovery(lessonId: string) {
  const lesson = getEnglishG3Lesson(lessonId), discovery = ENGLISH_DISCOVERY[lessonId];
  if (!lesson || !discovery) throw new Error(`Missing discovery activity: ${lessonId}`);
  return { question: discovery.question, prompts: discovery.prompts, page: discovery.image === 'last' ? lesson.pageEnd : lesson.pageStart };
}
