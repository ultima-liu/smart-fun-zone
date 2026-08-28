import type { Quiz } from './skills';
import { PRACTICE1 } from './contents/mathPractice1';
import { PRACTICE2 } from './contents/mathPractice2';
import { PRACTICE3 } from './contents/mathPractice3';
import { PRACTICE4 } from './contents/mathPractice4';
import { PRACTICE5 } from './contents/mathPractice5';
import { PRACTICE6 } from './contents/mathPractice6';

/** 数学「去练习」专属题库（按 lesson id，逐课精心设计，与 quiz 不重复） */
export const MATH_PRACTICE_BANK: Record<string, Quiz[]> = {
  ...PRACTICE1,
  ...PRACTICE2,
  ...PRACTICE3,
  ...PRACTICE4,
  ...PRACTICE5,
  ...PRACTICE6,
};
