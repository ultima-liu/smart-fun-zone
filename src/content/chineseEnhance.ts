import type { LessonContent } from './skills';
import { CH3A } from './contents/ch3a';
import { CH3B } from './contents/ch3b';
import { CH4B } from './contents/ch4b';
import { CH6A } from './contents/ch6a';
import { CH6B } from './contents/ch6b';
import { CHP3A } from './contents/chp3a';
import { CHP3B } from './contents/chp3b';
import { CHP4B } from './contents/chp4b';
import { CHP6A } from './contents/chp6a';
import { CHP6B } from './contents/chp6b';

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
  CH3A,
  CH3B,
  CH4B,
  CH6A,
  CH6B,
  CHP3A,
  CHP3B,
  CHP4B,
  CHP6A,
  CHP6B,
);
