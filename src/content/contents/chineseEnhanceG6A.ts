import type { ChineseEnhance } from '../chineseEnhance';
import { CHG6E_A_P1 } from './chineseEnhanceG6A_p1';
import { CHG6E_A_P2 } from './chineseEnhanceG6A_p2';

/* 语文六年级上册 图文分步教学增强：U1-4 + U5-8 分片合并 */
export const CHG6E_A: Record<string, ChineseEnhance> = {
  ...CHG6E_A_P1,
  ...CHG6E_A_P2,
};
