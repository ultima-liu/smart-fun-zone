import type { ChineseEnhance } from '../chineseEnhance';
import { CHG4E_A_P1 } from './chineseEnhanceG4A_p1';
import { CHG4E_A_P2 } from './chineseEnhanceG4A_p2';

/* 语文四年级上册 图文分步教学增强：U1-4 + U5-8 分片合并 */
export const CHG4E_A: Record<string, ChineseEnhance> = {
  ...CHG4E_A_P1,
  ...CHG4E_A_P2,
};
