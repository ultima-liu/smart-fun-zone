import { getChineseTextbookLesson } from './content/chineseTextbookCurriculum';
import { getChineseTeaching } from './content/chineseTeaching';
import { getChineseTextbookStudy } from './content/chineseTextbookStudy';
import { CHINESE_PINYIN_STUDY } from './content/chinesePinyinStudy';
import { CHINESE_SKILL_LABELS, latestSkillEvidence, latestChineseTaskEvidence, readChineseEvidence, type ChineseSkill, type ChineseEvidence } from './chineseLearning';
export type ChineseReviewTask = {
  kind: 'recognition' | 'listen' | 'production' | 'oral' | 'writing' | 'transfer';
  skill: ChineseSkill; title: string; variant: number;
};
export function chineseReviewBank(lessonId: string): Omit<ChineseReviewTask, 'variant'>[] {
  const lesson = getChineseTextbookLesson(lessonId);
  if (!lesson) return [];
  const teaching = getChineseTeaching(lessonId);
  const study = getChineseTextbookStudy(lessonId);
  const bank: Omit<ChineseReviewTask, 'variant'>[] = [];
  if (study?.recognize?.length || CHINESE_PINYIN_STUDY[lessonId]?.recognize?.length) bank.push({ kind: 'recognition', skill: 'recognition', title: '收起拼音，换词语认字' });
  if (lesson.kind === 'pinyin') bank.push({ kind: 'listen', skill: 'pinyin', title: '换音节，听辨易混的声音' }, { kind: 'production', skill: 'pinyin', title: '先自己拼读，再比较示范' });
  if (teaching.transfer) bank.push({ kind: 'transfer', skill: 'reading', title: '收起课文，重新配对或排序' });
  if (study?.writing?.length) bank.push({ kind: 'writing', skill: 'writing', title: '换一个字，屏幕逐笔写' });
  bank.push({ kind: 'oral', skill: 'expression', title: '用自己的内容回答题目' });
  if (lesson.kind === 'garden' || lesson.kind === 'orientation') bank.push({ kind: 'oral', skill: 'listening', title: '听清新伙伴的信息，再接话' });
  if (teaching.reading && !teaching.transfer) bank.push({ kind: 'oral', skill: 'reading', title: '用自己的话讲一处阅读发现' });
  return bank;
}
/** 同一细项取最近一次，不让另一道答对题掩盖仍需提示的细项。听辨和实际拼读各自取证。 */
export function chineseReviewEvidence(rows: ChineseEvidence[], task: Omit<ChineseReviewTask, 'variant'>) {
  let candidates = rows.filter((row) => row.skill === task.skill);
  if (task.kind === 'listen') candidates = candidates.filter((row) => /^(listen:|offline-listen:)/.test(row.taskId));
  if (task.kind === 'production') candidates = candidates.filter((row) => row.taskId.startsWith('production:'));
  const checked = latestChineseTaskEvidence(candidates).filter((row) => row.source !== 'self' && row.level !== 'practiced');
  if (!checked.length) return latestSkillEvidence(candidates, task.skill);
  return checked.sort((a, b) => Number(a.level === 'independent') - Number(b.level === 'independent') || a.at - b.at)[0];
}
export function chineseReviewInterval(row?: ChineseEvidence): number {
  if (!row || row.level === 'practiced' || row.source === 'self') return 1;
  return row.level === 'supported' ? 3 : 7;
}
/** 先取需要帮助的能力；同一能力轮换任务和材料，已独立完成的项目隔段时间再检查。 */
export function selectChineseReview(childId: string, lessonId: string, variant = 0, now = Date.now()): ChineseReviewTask | undefined {
  const rows = readChineseEvidence(childId, lessonId);
  const bank = chineseReviewBank(lessonId);
  const ranked = bank.map((task, index) => {
    const row = chineseReviewEvidence(rows, task);
    const due = (row?.at ?? 0) + chineseReviewInterval(row) * 86_400_000 <= now;
    const weakness = !row || row.source === 'self' || row.level === 'practiced' ? 0 : row.level === 'supported' ? 1 : 2;
    return { task, due, weakness, at: row?.at ?? 0, order: (index - variant % Math.max(bank.length, 1) + bank.length) % Math.max(bank.length, 1) };
  }).sort((a, b) => Number(b.due) - Number(a.due) || a.weakness - b.weakness || a.at - b.at || a.order - b.order);
  return ranked[0] ? { ...ranked[0].task, variant } : undefined;
}
/** 只在家长选定的复习日内排序，不增加额外每日任务。 */
export function chineseReviewPriority(childId: string, lessonId: string, now: number): number {
  const rows = readChineseEvidence(childId, lessonId);
  const bank = chineseReviewBank(lessonId);
  return bank.reduce((priority, task) => {
    const row = chineseReviewEvidence(rows, task);
    if (row && row.at + chineseReviewInterval(row) * 86_400_000 > now) return priority;
    return Math.max(priority, !row || row.source === 'self' || row.level === 'practiced' ? 3 : row.level === 'supported' ? 2 : 1);
  }, 0);
}
export const chineseReviewFocus = (task: ChineseReviewTask) => `${CHINESE_SKILL_LABELS[task.skill]}：${task.title}`;
