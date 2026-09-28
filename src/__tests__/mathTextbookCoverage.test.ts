import { describe, expect, it } from 'vitest';
import { ALL_MATH_LESSONS, MATH_LESSON_TASKS, MATH_TEMPLATE_TASK_LESSON_IDS, MATH_UPPER_UNITS } from '../content/mathUpperCurriculum';
import { MATH_G1_UPPER_COVERAGE, MATH_G1_UPPER_TOTAL_PAGES, plannedMathLessonIds } from '../content/mathTextbookCoverage';
import { MATH_G1_UPPER_TASK_LEDGER, MATH_G1_UPPER_TASK_LEDGER_PAGE_COUNT } from '../content/mathTextbookTaskLedger';

describe('数学一年级上册教材覆盖台账', () => {
  it('P1-P111 每页都恰好有一个归属', () => {
    const pageOwners = new Map<number, string[]>();
    MATH_G1_UPPER_COVERAGE.forEach((entry) => entry.pages.forEach((page) => {
      pageOwners.set(page, [...(pageOwners.get(page) ?? []), entry.id]);
    }));

    for (let page = 1; page <= MATH_G1_UPPER_TOTAL_PAGES; page += 1) {
      expect(pageOwners.get(page), `教材 P${page} 未被覆盖或被重复覆盖`).toHaveLength(1);
    }
  });

  it('课程目录页码直接来自覆盖台账，不回退成单元起始页', () => {
    const unitOne = MATH_UPPER_UNITS.find((unit) => unit.no === '一');
    const pageOf = (id: string) => unitOne?.lessons.find((lesson) => lesson.id === id)?.page;
    expect(pageOf('numbers')).toBe('P12–16');
    expect(pageOf('compare')).toBe('P17–18');
    expect(pageOf('ordinal')).toBe('P19');
    expect(pageOf('compose')).toBe('P20–21');
    expect(pageOf('unit1-review')).toBe('P22–23、P28–29、P31–33');
  });

  it('每个台账项目都有可实施的现有或计划课时归属', () => {
    const lessonIds = new Set(ALL_MATH_LESSONS.map((lesson) => lesson.id));
    MATH_G1_UPPER_COVERAGE.forEach((entry) => {
      expect(lessonIds.has(entry.ownerLessonId) || plannedMathLessonIds.has(entry.ownerLessonId), entry.id).toBe(true);
      expect(entry.task.trim().length, entry.id).toBeGreaterThan(10);
    });
  });

  it('47 节课均具备多个必做教材任务和练习组', () => {
    expect(ALL_MATH_LESSONS).toHaveLength(47);
    ALL_MATH_LESSONS.forEach((lesson) => {
      const plan = MATH_LESSON_TASKS[lesson.id];
      expect(plan, lesson.id).toBeDefined();
      expect(plan.tasks.filter((task) => task.required).length, lesson.id).toBeGreaterThanOrEqual(2);
      expect(plan.practiceGroups.length, lesson.id).toBeGreaterThan(0);
    });
  });

  it('所有扩展课均已移除旧通用任务壳，模板审计必须归零', () => {
    expect(MATH_TEMPLATE_TASK_LESSON_IDS).toEqual([]);
  });

  it('第二单元 13 节课均已用显式教材任务替代旧模板任务壳', () => {
    const unitTwoLessons = ['six-to-nine', 'compare-order-nine', 'compose-six-nine', 'addsub-six-seven', 'solve-total-within-7', 'solve-remain-within-7', 'addsub-eight-nine', 'select-info-eight-nine', 'ten', 'addsub-ten', 'continuous-add-sub', 'mixed-add-sub', 'unit2-review'];
    unitTwoLessons.forEach((lessonId) => {
      expect(MATH_TEMPLATE_TASK_LESSON_IDS).not.toContain(lessonId);
      expect(MATH_LESSON_TASKS[lessonId].tasks.every((task) => task.source === 'explicit')).toBe(true);
      expect(MATH_LESSON_TASKS[lessonId].practiceGroups).toHaveLength(2);
    });
  });

  it('第三、四单元 9 节课均已用显式任务绑定图形、数位和间隔操作', () => {
    const unitThreeFourLessons = ['solid-shapes', 'solid-building', 'solid-compose', 'ten-again', 'eleven-twenty', 'order-twenty', 'simple-addsub-twenty', 'between-positions', 'unit4-review'];
    unitThreeFourLessons.forEach((lessonId) => {
      expect(MATH_TEMPLATE_TASK_LESSON_IDS).not.toContain(lessonId);
      expect(MATH_LESSON_TASKS[lessonId].tasks.every((task) => task.source === 'explicit')).toBe(true);
      expect(MATH_LESSON_TASKS[lessonId].practiceGroups).toHaveLength(2);
    });
  });

  it('第五、六单元 12 节课均已用显式任务绑定凑十、应用和全册复习操作', () => {
    const unitFiveSixLessons = ['plus-nine', 'plus-eight-seven-six', 'plus-eight-nine-strategies', 'plus-five-four-three-two', 'solve-total', 'find-original', 'addition-table', 'unit5-review', 'review-numbers', 'review-relations', 'review-shapes', 'review-application'];
    unitFiveSixLessons.forEach((lessonId) => {
      expect(MATH_TEMPLATE_TASK_LESSON_IDS).not.toContain(lessonId);
      expect(MATH_LESSON_TASKS[lessonId].tasks.every((task) => task.source === 'explicit')).toBe(true);
      expect(MATH_LESSON_TASKS[lessonId].practiceGroups).toHaveLength(2);
    });
  });

  it('数学游戏和第一单元 8 节扩展课均已用显式任务绑定观察、操作与复习证据', () => {
    const gameAndUnitOneLessons = ['playground', 'classroom-discover', 'classroom-games', 'learning-readiness', 'add-within-5', 'subtract-within-5', 'zero', 'unit1-review'];
    gameAndUnitOneLessons.forEach((lessonId) => {
      expect(MATH_TEMPLATE_TASK_LESSON_IDS).not.toContain(lessonId);
      expect(MATH_LESSON_TASKS[lessonId].tasks.every((task) => task.source === 'explicit')).toBe(true);
      expect(MATH_LESSON_TASKS[lessonId].practiceGroups).toHaveLength(2);
    });
  });

  it('任务级台账为每个印刷页的每项动作提供稳定编号、课时和验收标识', () => {
    const lessonIds = new Set(ALL_MATH_LESSONS.map((lesson) => lesson.id));
    const ids = new Set(MATH_G1_UPPER_TASK_LEDGER.map((entry) => entry.id));
    expect(ids.size).toBe(MATH_G1_UPPER_TASK_LEDGER.length);
    for (let page = 1; page <= MATH_G1_UPPER_TASK_LEDGER_PAGE_COUNT; page += 1) {
      expect(MATH_G1_UPPER_TASK_LEDGER.some((entry) => entry.page === page), `教材 P${page} 缺少任务级记录`).toBe(true);
    }
    MATH_G1_UPPER_TASK_LEDGER.forEach((entry) => {
      expect(entry.id).toMatch(new RegExp(`^MATH-G1-P${String(entry.page).padStart(3, '0')}-\\d{2}$`));
      expect(lessonIds.has(entry.ownerLessonId), entry.id).toBe(true);
      expect(entry.task.trim().length, entry.id).toBeGreaterThan(4);
      expect(entry.acceptance.trim().length, entry.id).toBeGreaterThan(4);
    });
  });

  it('P103 和 P111 的原页关键产出不能退化为通用知识图或勾选项', () => {
    const page103 = MATH_G1_UPPER_TASK_LEDGER.filter((entry) => entry.page === 103).map((entry) => entry.task).join(' ');
    const page111 = MATH_G1_UPPER_TASK_LEDGER.filter((entry) => entry.page === 111).map((entry) => entry.task).join(' ');
    expect(page103).toContain('2 只和 4 只长颈鹿提出问题');
    expect(page111).toContain('九项学习表现');
    expect(page111).toContain('0～3 朵小红花');
  });

  it('步骤 3 的 P1-P33 已全部实现，且不只停留在“部分实现”状态', () => {
    const firstBatch = MATH_G1_UPPER_TASK_LEDGER.filter((entry) => entry.page >= 1 && entry.page <= 33);
    expect(firstBatch.filter((entry) => entry.status !== 'implemented')).toEqual([]);
    const firstBatchPages = MATH_G1_UPPER_COVERAGE.filter((entry) => entry.pages.every((page) => page <= 33));
    expect(firstBatchPages.filter((entry) => entry.status !== 'implemented')).toEqual([]);
  });

  it('步骤 4 的 P34-P66 页级台账已全部实现', () => {
    const unitTwoPages = MATH_G1_UPPER_COVERAGE.filter((entry) => entry.pages.every((page) => page >= 34 && page <= 66));
    expect(unitTwoPages.filter((entry) => entry.status !== 'implemented')).toEqual([]);
  });

  it('步骤 4 的 P34-P66 任务级台账已全部实现', () => {
    const unitTwoTasks = MATH_G1_UPPER_TASK_LEDGER.filter((entry) => entry.page >= 34 && entry.page <= 66);
    expect(unitTwoTasks.filter((entry) => entry.status !== 'implemented')).toEqual([]);
  });

  it('步骤 5 的 P67-P87 页级与任务级台账已全部实现', () => {
    const pages = MATH_G1_UPPER_COVERAGE.filter((entry) => entry.pages.every((page) => page >= 67 && page <= 87));
    const tasks = MATH_G1_UPPER_TASK_LEDGER.filter((entry) => entry.page >= 67 && entry.page <= 87);
    expect(pages.filter((entry) => entry.status !== 'implemented')).toEqual([]);
    expect(tasks.filter((entry) => entry.status !== 'implemented')).toEqual([]);
  });

  it('步骤 6 的 P88-P102 任务级台账已全部实现', () => {
    const tasks = MATH_G1_UPPER_TASK_LEDGER.filter((entry) => entry.page >= 88 && entry.page <= 102);
    expect(tasks.filter((entry) => entry.status !== 'implemented')).toEqual([]);
  });

  it('步骤 7 的 P103-P111 页级与任务级台账已全部实现', () => {
    const pages = MATH_G1_UPPER_COVERAGE.filter((entry) => entry.pages.every((page) => page >= 103 && page <= 111));
    const tasks = MATH_G1_UPPER_TASK_LEDGER.filter((entry) => entry.page >= 103 && entry.page <= 111);
    expect(pages.filter((entry) => entry.status !== 'implemented')).toEqual([]);
    expect(tasks.filter((entry) => entry.status !== 'implemented')).toEqual([]);
  });

  it('步骤 8 的整册验收不允许遗留 partial、missing 或 planned 项', () => {
    expect(MATH_G1_UPPER_COVERAGE.filter((entry) => entry.status !== 'implemented')).toEqual([]);
    expect(MATH_G1_UPPER_TASK_LEDGER.filter((entry) => entry.status !== 'implemented')).toEqual([]);
  });
});
