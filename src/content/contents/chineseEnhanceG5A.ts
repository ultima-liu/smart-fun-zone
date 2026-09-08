import type { ChineseEnhance } from '../chineseEnhance';
import { CHG5E_A_P1 } from './chineseEnhanceG5A_p1';
import { CHG5E_A_P2 } from './chineseEnhanceG5A_p2';

/* 语文五年级上册 图文分步教学增强：U1-4 + U5-8 分片合并 */
export const CHG5E_A: Record<string, ChineseEnhance> = {
  ...CHG5E_A_P1,
  ...CHG5E_A_P2,
};
