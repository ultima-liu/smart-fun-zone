import type { Grade } from '../types';
import { MATH_UPPER_UNITS, type MathUnit } from './mathUpperCurriculum';

/**
 * 课本注册表：学段 → 年级 → 学科 → 上/下册 的全集。
 * 学校书架页直接展开整棵层次；`available` 的册别可点击进入课本目录。
 * 已开课：人教版数学一年级上册（MATH_UPPER_UNITS）、语文一年级上册（独立目录页）。
 * 后续新增课本：在 AVAILABILITY 里注册并补充目录数据即可，书架自动点亮。
 */

export type Volume = 1 | 2; // 1 = 上册，2 = 下册

/** 有课本教材的学科（思维/科学/生活是技能课，不设上下册） */
export const TEXTBOOK_SUBJECTS: { id: string; zh: string; en: string; icon: string; color: string }[] = [
  { id: 'math', zh: '数学', en: 'Math', icon: '🔢', color: '#FFB74D' },
  { id: 'chinese', zh: '语文', en: 'Chinese', icon: '📖', color: '#EF5350' },
  { id: 'english', zh: '英语', en: 'English', icon: '🔤', color: '#4FC3F7' },
];

export type TextbookInfo = {
  subject: string;
  grade: Grade;
  vol: Volume;
  /** 是否已开课（可进入目录） */
  available: boolean;
  /** 已开课册别的目录入口路由；未开课为空 */
  route: string;
  /** 课本目录单元（通用目录页渲染用）；未开课或走独立页面的册别为空数组 */
  units: MathUnit[];
  /** 教材版本说明 */
  edition: string;
};

const BASE_EDITION = '人民教育出版社 · 义务教育教科书';

/** 册别可用性注册表：key = `${subject}/${grade}/${vol}` */
const AVAILABILITY: Record<string, string> = {
  'math/g1/1': '/textbook/math/g1/1',
  'chinese/g1/1': '/subject/chinese',
  'english/g3/1': '/subject/english',
};

export function textbookRoute(subject: string, grade: Grade, vol: Volume) {
  return `/textbook/${subject}/${grade}/${vol}`;
}

export function getTextbook(subject: string, grade: Grade, vol: Volume): TextbookInfo {
  const route = AVAILABILITY[`${subject}/${grade}/${vol}`] ?? '';
  return {
    subject,
    grade,
    vol,
    available: route !== '',
    route,
    units: route === textbookRoute('math', 'g1', 1) ? MATH_UPPER_UNITS : [],
    edition: subject === 'english' && grade === 'g3' && vol === 1 ? '人民教育出版社 · PEP英语 · 2022年版课标修订' : BASE_EDITION,
  };
}

export function volLabel(vol: Volume, lang: 'zh' | 'en' = 'zh') {
  return lang === 'zh' ? (vol === 1 ? '上册' : '下册') : (vol === 1 ? 'Vol.1' : 'Vol.2');
}

/** 找到第一本已开课的课本（未开课册别的引导入口用） */
export function firstAvailableTextbook(): { subject: string; grade: Grade; vol: Volume } | undefined {
  return { subject: 'math', grade: 'g1', vol: 1 };
}
