import type { MathFigure } from './skills';
import { FIG1 } from './contents/mathFig1';
import { FIG2 } from './contents/mathFig2';
import { FIG3 } from './contents/mathFig3';
import { FIG4 } from './contents/mathFig4';
import { FIG5 } from './contents/mathFig5';
import { FIG6 } from './contents/mathFig6';

/** 数学课时配图映射（按 lesson id） */
export const MATH_FIGURES: Record<string, MathFigure> = {
  ...FIG1,
  ...FIG2,
  ...FIG3,
  ...FIG4,
  ...FIG5,
  ...FIG6,
};
