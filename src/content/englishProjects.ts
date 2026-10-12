export type EnglishProjectRow = { item: string; detail: string };
export type EnglishProjectDraft = { name: string; age: string; time: string; greeting: string; rows: EnglishProjectRow[]; paper: boolean; presented: boolean };
export const emptyEnglishProject = (): EnglishProjectDraft => ({ name: '', age: '', time: '', greeting: 'Happy birthday!', rows: [], paper: false, presented: false });
export const ENGLISH_PROJECT_CHOICES: Record<string, string[]> = {
  friends: ['Smile', 'Listen', 'Help', 'Share', 'Play together'],
  families: ['mother', 'father', 'grandmother', 'grandfather', 'sister', 'brother', 'cousin', 'aunt', 'uncle'],
  animals: ['cat', 'dog', 'rabbit', 'panda', 'lion', 'elephant', 'giraffe'],
  plants: ['water', 'sun', 'air', 'apples', 'grapes', 'water the flowers', 'plant trees'],
  colours: ['banana', 'apple', 'flowers', 'grass', 'cat'],
};
export const ENGLISH_PROJECT_DETAILS: Record<string, string[]> = {
  friends: ['I show friendliness.', 'I hear my friend.', 'I help my friend.', 'We use it together.', 'We play together.'],
  families: ['长辈', '同辈'], animals: ['Pets', 'Wild animals'], plants: ['Plants need', 'Plants give us', 'We can'],
  colours: ['red', 'yellow', 'blue', 'green', 'pink', 'purple', 'white', 'black'],
};
const FRIEND_REASONS: Record<string, string> = { Smile: 'I show friendliness.', Listen: 'I hear my friend.', Help: 'I help my friend.', Share: 'We use it together.', 'Play together': 'We play together.' };
const PETS = ['cat', 'dog', 'rabbit'];
export const ANIMAL_FEATURES: Record<string, string> = { cat: 'small', dog: 'cute', rabbit: 'small', panda: 'big', lion: 'fast', elephant: 'big', giraffe: 'tall' };

/** 检查作品的信息与关系；口语表现由独立的观察记录判断。 */
export function validateEnglishProject(unitId: string, draft: EnglishProjectDraft): string[] {
  if (unitId === 'numbers') {
    return [!draft.name.trim() && '写上收卡人或虚构名字', (!/^\d+$/.test(draft.age) || Number(draft.age) < 1 || Number(draft.age) > 99) && '年龄填 1–99 的整数', !/^(?:[1-9]|1[0-2])(?::[0-5]\d)?\s*(?:a\.m\.|p\.m\.)$/i.test(draft.time.trim()) && '聚会时间如 6 p.m. 或 6:30 p.m.', draft.greeting !== 'Happy birthday!' && '补上生日祝福'].filter((value): value is string => typeof value === 'string');
  }
  const errors: string[] = [];
  const min = unitId === 'friends' || unitId === 'plants' ? 3 : 2;
  if (draft.rows.length < min) errors.push(`作品至少有 ${min} 个不同内容`);
  if (new Set(draft.rows.map((row) => row.item)).size !== draft.rows.length) errors.push('换掉重复内容');
  if (draft.rows.some((row) => !ENGLISH_PROJECT_CHOICES[unitId]?.includes(row.item) || !ENGLISH_PROJECT_DETAILS[unitId]?.includes(row.detail))) errors.push('给每个内容选择合适的信息');
  if (unitId === 'friends' && draft.rows.some((row) => FRIEND_REASONS[row.item] !== row.detail)) errors.push('把行动与它帮助朋友的理由连起来');
  if (unitId === 'families') {
    if (!draft.name.trim()) errors.push('写上我或故事主角的名字');
    if (draft.rows.some((row) => (['sister', 'brother', 'cousin'].includes(row.item) ? '同辈' : '长辈') !== row.detail)) errors.push('按人物与主角的关系放到对应分支');
  }
  if (unitId === 'animals' && draft.rows.some((row) => (PETS.includes(row.item) ? 'Pets' : 'Wild animals') !== row.detail)) errors.push('本册情境按宠物／野生动物分类');
  if (unitId === 'plants') {
    const group = (item: string) => ['air', 'water', 'sun'].includes(item) ? 'Plants need' : ['apples', 'grapes'].includes(item) ? 'Plants give us' : 'We can';
    if (draft.rows.some((row) => group(row.item) !== row.detail)) errors.push('区分植物需要、植物给予、人的行动');
    if (!['Plants need', 'Plants give us', 'We can'].every((group) => draft.rows.some((row) => row.detail === group))) errors.push('花园要包含需要、给予和照料三条关系');
  }
  return errors;
}

export function englishProjectSentence(unitId: string, row: EnglishProjectRow): string {
  if (unitId === 'friends') return `${row.item}. ${row.detail}`;
  if (unitId === 'families') return `This is my ${row.item}.`;
  if (unitId === 'animals') return `It is ${row.item === 'elephant' ? 'an' : 'a'} ${row.item}. It is ${ANIMAL_FEATURES[row.item]}.`;
  if (unitId === 'plants') return `${row.detail} ${row.item}.`;
  return `${row.item === 'flowers' ? 'The flowers are' : row.item === 'grass' ? 'The grass is' : `The ${row.item} is`} ${row.detail}.`;
}
