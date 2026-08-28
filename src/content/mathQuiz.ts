import type { Quiz } from './skills';
import { QUIZ1 } from './contents/mathQuiz1';
import { QUIZ2 } from './contents/mathQuiz2';
import { QUIZ3 } from './contents/mathQuiz3';
import { QUIZ4 } from './contents/mathQuiz4';
import { QUIZ5 } from './contents/mathQuiz5';
import { QUIZ6 } from './contents/mathQuiz6';

/** 数学「想一想」即时检测题（按 lesson id） */
export const MATH_QUIZ: Record<string, Quiz> = {
  ...QUIZ1,
  ...QUIZ2,
  ...QUIZ3,
  ...QUIZ4,
  ...QUIZ5,
  ...QUIZ6,
};
