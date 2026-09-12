/** 一次课程练习的星级：未达 80% 为 1 星，达 80% 为 2 星，全对为 3 星。 */
export function starsForLessonPractice(correct: number, total: number): number {
  if (total <= 0) return 0;
  if (correct >= total) return 3;
  return correct / total >= 0.8 ? 2 : 1;
}

export function isPerfectLessonPractice(correct: number, total: number): boolean {
  return total > 0 && correct >= total;
}
