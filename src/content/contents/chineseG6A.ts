import type { LessonContent } from '../skills';
import { CHINESE_G6A_P1 } from './chineseG6A_p1';
import { CHINESE_G6A_P2 } from './chineseG6A_p2';

/* 语文六年级上册（2022课标修订版）内容：U1-4 + U5-8 分片合并 */
export const CHINESE_G6A: Record<string, LessonContent> = {
  ...CHINESE_G6A_P1,
  ...CHINESE_G6A_P2,
};
