import type { TeachStep } from './skills';
import { STEPS1 } from './contents/mathSteps1';
import { STEPS2 } from './contents/mathSteps2';
import { STEPS3 } from './contents/mathSteps3';
import { STEPS4 } from './contents/mathSteps4';
import { STEPS5 } from './contents/mathSteps5';
import { STEPS6 } from './contents/mathSteps6';

/** 数学「看演示」分步讲解（按 lesson id，每课一节式教材，深入讲透） */
export const MATH_STEPS: Record<string, TeachStep[]> = {
  ...STEPS1,
  ...STEPS2,
  ...STEPS3,
  ...STEPS4,
  ...STEPS5,
  ...STEPS6,
};
