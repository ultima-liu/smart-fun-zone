import type { LessonContent } from './skills';
import { CH4B } from './contents/ch4b';
import { CH6A } from './contents/ch6a';
import { CH6B } from './contents/ch6b';
import { CHP4B } from './contents/chp4b';
import { CHP6A } from './contents/chp6a';
import { CHP6B } from './contents/chp6b';
import { CHG1E } from './contents/chineseEnhanceG1a';
import { CHG2E } from './contents/chineseEnhanceG2';
import { CHG2E_REST } from './contents/chineseEnhanceG2_rest';
import { CHG2E_B } from './contents/chineseEnhanceG2B';
import { CHG3E_A } from './contents/chineseEnhanceG3A';
import { CHG3E_B } from './contents/chineseEnhanceG3B';
import { CHG4E_A } from './contents/chineseEnhanceG4A';
import { CHG5E_A } from './contents/chineseEnhanceG5A';
import { CHG5E_B } from './contents/chineseEnhanceG5B';
import { CHG6E_A } from './contents/chineseEnhanceG6A';

/** 语文课内容增强（情境导入/学课文分节讲解/中心句/要点/梯度练习），按 lesson id */
export type ChineseEnhance = Pick<LessonContent, 'example' | 'steps' | 'rhyme' | 'points' | 'practice' | 'quiz'>;

/** 字段级合并：教学分片（example/steps/rhyme）与要点练习分片（points/practice）按课合并，
    避免整体 spread 覆盖同 key 对象导致字段丢失 */
function mergeEnhance(...maps: Record<string, Partial<ChineseEnhance>>[]): Record<string, ChineseEnhance> {
  const out: Record<string, ChineseEnhance> = {};
  for (const map of maps) {
    for (const [id, v] of Object.entries(map)) {
      out[id] = { ...out[id], ...v };
    }
  }
  return out;
}

export const CHINESE_ENHANCE: Record<string, ChineseEnhance> = mergeEnhance(
  CH4B,
  CH6A,
  CH6B,
  CHP4B,
  CHP6A,
  CHP6B,
  CHG1E,
  CHG2E,
  CHG2E_REST,
  CHG2E_B,
  CHG3E_A,
  CHG3E_B,
  CHG4E_A,
  CHG5E_A,
  CHG5E_B,
  CHG6E_A,
);
