import { ENGLISH_G3_ALL_LESSONS } from './content/englishGrade3Upper';
import { englishReviewMaterial, getEnglishTeaching } from './content/englishTeaching';
import { englishAssessmentEvidence, latestEnglishEvidence, readEnglishEvidence, type EnglishSkill } from './englishLearning';
import { reviewEntries } from './reviewPlan';

export type EnglishRecallItem = { id: string; lessonId: string; text: string; picture?: string; cue: string };
export function englishReviewFocus(childId: string | null, lessonId: string): EnglishSkill {
  const teaching = getEnglishTeaching(lessonId);
  const rows = englishAssessmentEvidence(readEnglishEvidence(childId, lessonId));
  const rank = { 'needs-help': 0, practiced: 1, supported: 2, independent: 3 };
  const relevant = rows.filter((row) => row.skill === 'expression' || row.skill === 'phonics');
  return relevant.sort((a, b) => rank[a.level] - rank[b.level] || a.at - b.at)[0]?.skill ?? (teaching.skill === 'phonics' ? 'phonics' : 'expression');
}

export function englishRecallItems(childId: string | null, lessonId: string, round: number): EnglishRecallItem[] {
  const rows = latestEnglishEvidence(readEnglishEvidence(childId, lessonId));
  const rank = { 'needs-help': 0, practiced: 1, supported: 2, independent: 3 };
  const materials = englishReviewMaterial(lessonId).map((item, index) => ({ ...item, lessonId, order: (index - round % englishReviewMaterial(lessonId).length + englishReviewMaterial(lessonId).length) % englishReviewMaterial(lessonId).length }));
  materials.sort((a, b) => {
    const aRow = rows.find((row) => row.taskId === a.id);
    const bRow = rows.find((row) => row.taskId === b.id);
    return (aRow ? rank[aRow.level] : 1) - (bRow ? rank[bRow.level] : 1) || a.order - b.order;
  });
  const selected: EnglishRecallItem[] = materials.slice(0, 3);
  if (childId) {
    const current = ENGLISH_G3_ALL_LESSONS.find((lesson) => lesson.id === lessonId);
    const learned = reviewEntries(childId).filter((entry) => entry.subject === 'english' && entry.lessonId !== lessonId
      && ENGLISH_G3_ALL_LESSONS.some((lesson) => lesson.id === entry.lessonId && lesson.unitId !== current?.unitId));
    if (learned.length) {
      const previous = learned[round % learned.length];
      const options = englishReviewMaterial(previous.lessonId);
      const extra = options[round % options.length];
      if (extra) selected.push({ ...extra, lessonId: previous.lessonId });
    }
  }
  return selected;
}
