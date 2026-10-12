import { wordPictureArt, wordPictureStandalone } from './englishWordPictures';

/** Meanings belong to these textbook examples: orange is the fruit and can is a container in the Cc picture. */
const MEANINGS: Record<string, string> = {
  apple: '苹果', bag: '书包', bed: '床', Bob: '鲍勃（人名）', cat: '猫', can: '罐头盒', dog: '狗', sad: '难过的',
  egg: '鸡蛋', nest: '鸟窝', fish: '鱼', beef: '牛肉', girl: '女孩', pig: '猪', hot: '热的', hat: '帽子',
  ill: '生病的', kid: '孩子', job: '工作', jet: '喷气式飞机', Kim: '金姆（人名）', kite: '风筝', leg: '腿', lion: '狮子',
  map: '地图', mum: '妈妈', new: '新的', fan: '风扇', orange: '橙子', fox: '狐狸', pen: '笔', cup: '杯子',
  quiet: '安静的', queen: '女王', red: '红色', ruler: '尺子', see: '看见', bus: '公共汽车', Ted: '泰德（人名）', sit: '坐', up: '向上', run: '跑',
  van: '厢式车', vet: '兽医', we: '我们', win: '获胜', box: '盒子', six: '六', yellow: '黄色', 'yo-yo': '悠悠球', Zip: '齐普（教材角色）', quiz: '小测验',
};

export function englishLetterWord(word: string): { meaning: string; picture: string | null } {
  const picture = word === 'mum' ? 'mother' : word;
  return { meaning: MEANINGS[word] ?? '', picture: wordPictureArt(picture) || wordPictureStandalone(picture) ? picture : null };
}

/** Labels distinguish the letter name and example words; narration uses one continuous voice. */
export function englishLetterNarration({ letter, words }: { letter: string; words: readonly string[] }): string {
  return `字母名。Letter ${letter}。例词。${words.map(word => `${word}。${englishLetterWord(word).meaning}。`).join('')}`;
}
