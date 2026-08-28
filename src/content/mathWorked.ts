import type { WorkedExample } from './skills';
import { WORKED1 } from './contents/mathWorked1';
import { WORKED2 } from './contents/mathWorked2';
import { WORKED3 } from './contents/mathWorked3';
import { WORKED4 } from './contents/mathWorked4';
import { WORKED5 } from './contents/mathWorked5';
import { WORKED6 } from './contents/mathWorked6';

/** 数学「看例题」：例题详解（每课 2~3 道，逐步讲解） */
export const MATH_WORKED: Record<string, WorkedExample[]> = {
  ...WORKED1,
  ...WORKED2,
  ...WORKED3,
  ...WORKED4,
  ...WORKED5,
  ...WORKED6,
};
