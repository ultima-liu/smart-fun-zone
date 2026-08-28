import { RHYMES1 } from './contents/mathRhymes1';
import { RHYMES2 } from './contents/mathRhymes2';
import { RHYMES3 } from './contents/mathRhymes3';
import { RHYMES4 } from './contents/mathRhymes4';
import { RHYMES5 } from './contents/mathRhymes5';
import { RHYMES6 } from './contents/mathRhymes6';

/** 数学「记要点」：每课口诀/儿歌（朗朗上口，帮助记忆） */
export const MATH_RHYMES: Record<string, string> = {
  ...RHYMES1,
  ...RHYMES2,
  ...RHYMES3,
  ...RHYMES4,
  ...RHYMES5,
  ...RHYMES6,
};
