export type Lang = 'zh' | 'en';

/**
 * 年级（小学 1–6 年级，真实教材课程）
 */
export type Grade = 'g1' | 'g2' | 'g3' | 'g4' | 'g5' | 'g6';

/** 学科 */
export type SubjectId = 'math' | 'chinese' | 'english' | 'thinking' | 'science' | 'life';

export interface SubjectInfo {
  id: SubjectId;
  icon: string;
  name: { zh: string; en: string };
  color: string;
}

/** 学科：数学 / 语文 / 英语 / 思维 / 科学 / 生活 */
export const SUBJECTS: SubjectInfo[] = [
  { id: 'math', icon: '🔢', name: { zh: '数学', en: 'Math' }, color: '#FFB74D' },
  { id: 'chinese', icon: '📖', name: { zh: '语文', en: 'Chinese' }, color: '#EF5350' },
  { id: 'english', icon: '🔤', name: { zh: '英语', en: 'English' }, color: '#4FC3F7' },
  { id: 'thinking', icon: '🧠', name: { zh: '思维', en: 'Thinking' }, color: '#BA68C8' },
  { id: 'science', icon: '🔬', name: { zh: '科学', en: 'Science' }, color: '#81C784' },
  { id: 'life', icon: '🚦', name: { zh: '生活', en: 'Life' }, color: '#FF8A65' },
];

/** 年级：一至六年级（真实课程） */
export const GRADES: { id: Grade; name: { zh: string; en: string }; label: { zh: string; en: string } }[] = [
  { id: 'g1', name: { zh: '一年级', en: 'Grade 1' }, label: { zh: '一年级 · 6–7 岁', en: 'Grade 1' } },
  { id: 'g2', name: { zh: '二年级', en: 'Grade 2' }, label: { zh: '二年级 · 7–8 岁', en: 'Grade 2' } },
  { id: 'g3', name: { zh: '三年级', en: 'Grade 3' }, label: { zh: '三年级 · 8–9 岁', en: 'Grade 3' } },
  { id: 'g4', name: { zh: '四年级', en: 'Grade 4' }, label: { zh: '四年级 · 9–10 岁', en: 'Grade 4' } },
  { id: 'g5', name: { zh: '五年级', en: 'Grade 5' }, label: { zh: '五年级 · 10–11 岁', en: 'Grade 5' } },
  { id: 'g6', name: { zh: '六年级', en: 'Grade 6' }, label: { zh: '六年级 · 11–12 岁', en: 'Grade 6' } },
];

/** 年级显示（兼容旧存档数据兜底） */
export function gradeLabel(grade: Grade | string, lang: Lang): string {
  return GRADES.find((g) => g.id === grade)?.label[lang] ?? (lang === 'zh' ? '一年级' : 'Grade 1');
}

export const AVATARS = ['🦊', '🐼', '🐰', '🦁', '🐸', '🐙', '🦄', '🐯'];

export interface ChildProfile {
  id: string;
  name: string;
  avatar: string;
  /** 年级（存档字段名保持 ageBand 以兼容旧数据） */
  ageBand: Grade;
  createdAt: number;
}

export interface GameRecord {
  id: string;
  childId: string;
  gameId: string;
  level: number;
  stars: number;
  correct: number;
  total: number;
  durationSec: number;
  playedAt: number;
}

export interface GameResult {
  correct: number;
  total: number;
  stars: number;
  durationSec: number;
}

export interface GameProps {
  child: ChildProfile;
  level: number;
  onFinish: (r: GameResult) => void;
}
