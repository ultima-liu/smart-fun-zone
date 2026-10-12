import { expect, it } from 'vitest';
import { ENGLISH_G3_ALL_LESSONS, ENGLISH_G3_UPPER_UNITS } from '../content/englishGrade3Upper';
import { ENGLISH_DISCOVERY, getEnglishDiscovery } from '../content/englishDiscovery';

const pages = import.meta.glob('../../public/assets/english-textbook/pages/*.webp', { eager: true, query: '?url', import: 'default' });

it('全部课时有自己的观察问题，同单元七篇课文不重复单元首页', () => {
  expect(Object.keys(ENGLISH_DISCOVERY).sort()).toEqual(ENGLISH_G3_ALL_LESSONS.map(lesson => lesson.id).sort());
  for (const unit of ENGLISH_G3_UPPER_UNITS) {
    const activities = ENGLISH_G3_ALL_LESSONS.filter(lesson => lesson.unitId === unit.id).map(lesson => getEnglishDiscovery(lesson.id));
    expect(new Set(activities.map(activity => activity.question)).size, unit.id).toBe(7);
    expect(new Set(activities.map(activity => activity.prompts.join('|'))).size, unit.id).toBe(7);
  }
});
it('展示页真实存在且属于本课，项目直接展示制作作品的教材页', () => {
  for (const lesson of ENGLISH_G3_ALL_LESSONS) {
    const activity = getEnglishDiscovery(lesson.id);
    expect(activity.page).toBeGreaterThanOrEqual(lesson.pageStart);
    expect(activity.page).toBeLessThanOrEqual(lesson.pageEnd);
    expect(pages).toHaveProperty(`../../public/assets/english-textbook/pages/p${String(activity.page).padStart(3, '0')}.webp`);
    if (lesson.section === 'project') expect(activity.page).toBe(lesson.pageEnd);
  }
  expect(getEnglishDiscovery('friends-a').question).toContain('Mike and Wu Binbin');
  expect(getEnglishDiscovery('numbers-letters').prompts).toContain('Where is x in box and six?');
  expect(getEnglishDiscovery('plants-project')).toMatchObject({ page: 47, question: 'What do we need to make a paper garden?' });
  expect(getEnglishDiscovery('guest-observe').question).not.toBe(getEnglishDiscovery('guest-act').question);
});
