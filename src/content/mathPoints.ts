import { POINTS1 } from './contents/mathPoints1';
import { POINTS2 } from './contents/mathPoints2';
import { POINTS3 } from './contents/mathPoints3';
import { POINTS4 } from './contents/mathPoints4';
import { POINTS5 } from './contents/mathPoints5';
import { POINTS6 } from './contents/mathPoints6';

/** 数学「记要点」：每课 4~6 条要点（知识含量足） */
export const MATH_POINTS: Record<string, string[]> = {
  ...POINTS1,
  ...POINTS2,
  ...POINTS3,
  ...POINTS4,
  ...POINTS5,
  ...POINTS6,
};
