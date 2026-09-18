/**
 * 词卡自绘图集的定位。每张 PNG 是 4×4 的透明绘本插画图集；以背景定位取出单个词图，
 * 避免继续把早期简笔 SVG 当作正式的词卡素材。
 */
export type WordPictureArt = { src: string; column: number; row: number };
const art = (sheet: string, column: number, row: number): WordPictureArt => ({ src: `/assets/english-textbook/word-art/${sheet}-sheet-v1.webp`, column, row });

const ART: Record<string, WordPictureArt> = {
  apple: art('nature', 0, 0), apples: art('nature', 2, 2), orange: art('nature', 1, 0), oranges: art('nature', 3, 2), banana: art('nature', 2, 0), bananas: art('nature', 0, 3), grapes: art('nature', 3, 0),
  water: art('nature', 0, 1), sun: art('nature', 1, 1), air: art('nature', 2, 1), tree: art('nature', 3, 1), trees: art('nature', 3, 1), grass: art('nature', 0, 2), flowers: art('nature', 1, 2),
  mother: art('family', 0, 0), father: art('family', 1, 0), brother: art('family', 2, 0), sister: art('family', 3, 0), grandmother: art('family', 0, 1), grandfather: art('family', 1, 1), aunt: art('family', 2, 1), uncle: art('family', 3, 1), cousin: art('family', 0, 2), 'baby-sister': art('family', 1, 2), me: art('family', 2, 2), share: art('family', 3, 2), help: art('family', 0, 3), listen: art('family', 1, 3), say: art('family', 2, 3), smile: art('family', 3, 3),
  bird: art('animals', 0, 0), cat: art('animals', 1, 0), dog: art('animals', 2, 0), fish: art('animals', 3, 0), rabbit: art('animals', 0, 1), monkey: art('animals', 1, 1), tiger: art('animals', 2, 1), lion: art('animals', 3, 1), elephant: art('animals', 0, 2), giraffe: art('animals', 1, 2), panda: art('animals', 2, 2),
  one: art('numbers', 0, 0), two: art('numbers', 1, 0), three: art('numbers', 2, 0), four: art('numbers', 3, 0), five: art('numbers', 0, 1), six: art('numbers', 1, 1), seven: art('numbers', 2, 1), eight: art('numbers', 3, 1), nine: art('numbers', 0, 2), ten: art('numbers', 1, 2),
  red: art('colours', 0, 0), yellow: art('colours', 1, 0), blue: art('colours', 2, 0), green: art('colours', 3, 0), purple: art('colours', 0, 1), pink: art('colours', 1, 1), brown: art('colours', 2, 1), black: art('colours', 3, 1), white: art('colours', 0, 2),
  ear: art('body', 0, 0), eye: art('body', 1, 0), mouth: art('body', 2, 0), arm: art('body', 3, 0), hand: art('body', 0, 1),
};

const slugOf = (word: string) => word.toLowerCase().replace(/\(.*?\)/g, '').trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function wordPictureArt(word: string): WordPictureArt | null {
  return ART[slugOf(word)] ?? null;
}

/** 正式图集未覆盖的意外词才回落旧素材，保证词卡永远可读。 */
export function wordPictureSrc(word: string): string | null {
  const slug = slugOf(word);
  return slug ? `/assets/english-textbook/words/${slug}.svg` : null;
}
