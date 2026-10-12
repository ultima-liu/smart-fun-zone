import { expect, type Page } from '@playwright/test';
import { mathCoreQuestions, mathQuestions, mathReviewQuestions, type MathQuestion } from '../src/content/mathTeaching';
import { mathArenaQuestions } from '../src/content/mathArenaQuestions';

export async function answerMathQuestion(page: Page, question: MathQuestion, context = 'lesson') {
  const region = page.locator(`.math-assessment.context-${context}`).first();
  await expect(region.getByRole('heading', { name: question.prompt, exact: true })).toBeVisible();
  if (question.kind === 'choice') await region.getByRole('button', { name: question.answer, exact: true }).click();
  else {
    await region.getByLabel(question.kind === 'expression' ? '完整算式' : '独立答案', { exact: true }).fill(question.answer);
    await region.getByRole('button', { name: '检查我的答案', exact: true }).click();
  }
  const next = region.getByRole('button', { name: /下一题|完成这组练习/ });
  const automatic = region.getByText('✓ 本组完成，正在记录结果…', { exact: true });
  await expect(next.or(automatic).first()).toBeVisible();
  if (await automatic.isVisible()) await expect(automatic).toBeHidden();
  else await next.click();
}

export async function finishMathAssessment(page: Page, childId: string, lessonId: string, context = 'lesson', brief = false) {
  const key = `sfz-math-assessment-v1:${childId}:${lessonId}:${context}`;
  await expect(page.locator(`.math-assessment.context-${context}`).first()).toBeVisible();
  await expect.poll(() => page.evaluate((storageKey) => Number.isInteger(JSON.parse(localStorage.getItem(storageKey) ?? '{}').variant), key)).toBe(true);
  const saved = await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey) ?? '{}') as { variant: number; index: number; replacement: number; bank?: string }, key);
  let questions = context === 'review' ? mathReviewQuestions(lessonId, saved.variant) : context === 'lesson' && saved.bank === 'arena-v1' ? mathArenaQuestions(lessonId, saved.variant) : mathQuestions(lessonId, saved.variant);
  if (context === 'checkpoint') questions = mathCoreQuestions(questions).slice(0, 2);
  else if (brief) questions = mathCoreQuestions(questions);
  const objectives = [];
  for (let index = saved.index; index < questions.length; index++) {
    const original = questions[index];
    const question = index === saved.index && saved.replacement ? (original.id.includes(':arena:') ? mathArenaQuestions : mathQuestions)(original.lessonId, saved.variant + saved.replacement * 7).find((item) => item.objective === original.objective)! : original;
    objectives.push(original.objective);
    await answerMathQuestion(page, question, context);
  }
  return objectives;
}
