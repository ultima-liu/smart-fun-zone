import type { ChineseEnhance } from '../chineseEnhance';
import { CHG5E_B_P1 } from './chineseEnhanceG5B_p1';
import { CHG5E_B_P2 } from './chineseEnhanceG5B_p2';

/* 语文五年级下册 图文分步教学增强：U1-4 + U5-8 分片合并 */
export const CHG5E_B: Record<string, ChineseEnhance> = {
  ...CHG5E_B_P1,
  ...CHG5E_B_P2,
};
