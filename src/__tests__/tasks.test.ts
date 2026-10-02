import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { activeLessons } from '../activeCourses';
import { CHINESE_TEXTBOOK_LESSONS } from '../content/chineseTextbookCurriculum';
import { ENGLISH_G3_ALL_LESSONS } from '../content/englishGrade3Upper';
import { EXTENDED_MATH_LESSONS } from '../content/mathUpperCurriculum';
import {
  acceptedMissions, claimCourseMailReward, completeDailyReview, courseMailBuckets, deliveredMission, ensureDailyReview,
  ensureCourseMails, initializeTaskSystem, MISSION_ACTIVITIES, pauseMission, settleCourseTask, startCourseMail,
} from '../taskSystem';
import { useStore } from '../store';
import { completeReviewDay, dueReviewDays, reviewCandidates, reviewEntries, scheduleReview } from '../reviewPlan';
import { emptyChildTaskState } from '../taskTypes';
import { effectiveCourseSchedule, weeklyStudySchedule } from '../weeklyStudyPlan';

describe('七类主动推送任务系统', () => {
  const original = useStore.getState();

  beforeEach(() => {
    localStorage.clear();
    useStore.setState({
      profiles: [{ id: 'taskKid', name: '小星', avatar: '🐰', ageBand: 'g1', createdAt: 1 }],
      activeChildId: 'taskKid', mastery: {}, pointLog: {}, points: { taskKid: 0 }, taskStates: {}, customTasks: {}, courseSchedule: [], taskOverrides: {},
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    useStore.setState(original, true);
  });

  it('只提供专项挑战、探索支线和主题活动内容，不再出现每日/每周清单', () => {
    expect(MISSION_ACTIVITIES.filter((task) => task.category === 'challenge')).toHaveLength(3);
    expect(MISSION_ACTIVITIES.filter((task) => task.category === 'exploration')).toHaveLength(5);
    expect(MISSION_ACTIVITIES.filter((task) => task.category === 'event')).toHaveLength(1);
    expect(MISSION_ACTIVITIES.some((task) => (task.category as string) === 'weekly')).toBe(false);
  });

  it('课程邮件按课程表进入当天来信，完成后等待主动领奖', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-29T10:00:00'));
    initializeTaskSystem('taskKid');
    const lesson = activeLessons('taskKid', useStore.getState().mastery).find((item) => item.subject === 'math')!;
    useStore.setState({ courseSchedule: [{ id: 'g1:weekday:2', grade: 'g1', weekday: 2, subjects: ['math'] }] });
    ensureCourseMails('taskKid');
    const mailId = courseMailBuckets('taskKid').current[0].mailId;

    expect(courseMailBuckets('taskKid').current[0]).toMatchObject({ status: 'not-started', rewardClaimed: false });
    startCourseMail('taskKid', mailId);
    expect(courseMailBuckets('taskKid').current[0].status).toBe('unfinished');
    useStore.getState().addSkillResult('taskKid', `math-lab-${lesson.id}`, 2);

    expect(settleCourseTask('taskKid', 'math', lesson.id, '2 星')).toBe(true);
    expect(settleCourseTask('taskKid', 'math', lesson.id, '2 星')).toBe(false);
    useStore.setState({ taskOverrides: { 'category:course': { reward: 99 } } });
    expect(useStore.getState().points.taskKid).toBe(0);
    expect(courseMailBuckets('taskKid').current[0]).toMatchObject({ status: 'completed', rewardClaimed: false });

    expect(claimCourseMailReward('taskKid', mailId)).toBe(true);
    expect(claimCourseMailReward('taskKid', mailId)).toBe(false);
    expect(useStore.getState().points.taskKid).toBe(8);
    expect(courseMailBuckets('taskKid')).toMatchObject({ current: [], unfinished: [], completed: [{ rewardClaimed: true }] });
  });

  it('跨日未解决的课程邮件进入未完成分类', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-29T10:00:00'));
    initializeTaskSystem('taskKid');
    const lesson = activeLessons('taskKid', {}).find((item) => item.subject === 'math')!;
    const state = useStore.getState().taskStates.taskKid;
    useStore.getState().patchTaskState('taskKid', { courseMails: {
      ...state.courseMails,
      [`2026-09-28:math:${lesson.id}`]: { date: '2026-09-28', subject: 'math', lessonId: lesson.id, reward: 8 },
    } });
    expect(courseMailBuckets('taskKid')).toMatchObject({ current: [], unfinished: [{ status: 'unfinished' }], completed: [] });
  });

  it('同一天按课程表中的数学、语文、英语各生成一封邮件，并按孩子年级读取课程表', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-29T10:00:00'));
    initializeTaskSystem('taskKid');
    const math = activeLessons('taskKid', {}).find((item) => item.subject === 'math')!;
    const chinese = activeLessons('taskKid', {}).find((item) => item.subject === 'chinese')!;
    const english = activeLessons('taskKid', {}).find((item) => item.subject === 'english')!;
    useStore.setState({ courseSchedule: [
      { id: 'g1:weekday:2', grade: 'g1', weekday: 2, subjects: ['math', 'chinese', 'english'] },
      { id: 'g3:weekday:2', grade: 'g3', weekday: 2, subjects: ['english'] },
    ] });
    ensureCourseMails('taskKid');
    expect(courseMailBuckets('taskKid').current.map((item) => item.mission.title).sort()).toEqual([`数学 · ${math.title}`, `语文 · ${chinese.title}`, `英语 · ${english.title}`].sort());
  });

  it('当天课程邮件由周课程表决定，并自动选择该学科第一节未开始课程', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-29T10:00:00'));
    initializeTaskSystem('taskKid');
    const lesson = activeLessons('taskKid', {}).find((item) => item.subject === 'chinese')!;
    useStore.setState({
      courseSchedule: [{ id: 'g1:weekday:2', grade: 'g1', weekday: 2, subjects: ['chinese'] }],
      taskOverrides: { 'category:course': { reward: 12 } },
    });
    const mission = deliveredMission('taskKid', new Date('2026-09-29T10:00:00'));
    expect(mission).toMatchObject({ category: 'course', title: `语文 · ${lesson.title}`, reward: 12, mailDate: '2026-09-29' });
  });

  it('后续上课日为同一学科选择下一节从未发信的课程', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-29T10:00:00'));
    initializeTaskSystem('taskKid');
    const [first, second] = activeLessons('taskKid', {}).filter((item) => item.subject === 'math').slice(0, 2);
    useStore.setState({ courseSchedule: [
      { id: 'g1:weekday:2', grade: 'g1', weekday: 2, subjects: ['math'] },
      { id: 'g1:weekday:3', grade: 'g1', weekday: 3, subjects: ['math'] },
    ] });
    ensureCourseMails('taskKid', new Date('2026-09-29T10:00:00'));
    ensureCourseMails('taskKid', new Date('2026-09-30T10:00:00'));
    expect(courseMailBuckets('taskKid', new Date('2026-09-30T10:00:00')).current[0]).toMatchObject({ lessonId: second.id });
    expect(courseMailBuckets('taskKid', new Date('2026-09-30T10:00:00')).unfinished[0]).toMatchObject({ lessonId: first.id });
  });

  it('未安排的周末不生成课程邮件，已提前完成的课程会被跳过', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-29T10:00:00'));
    initializeTaskSystem('taskKid');
    const [first, second] = activeLessons('taskKid', {}).filter((item) => item.subject === 'math').slice(0, 2);
    const state = useStore.getState().taskStates.taskKid;
    useStore.getState().patchTaskState('taskKid', { lessonCompletedAt: { ...state.lessonCompletedAt, [`math:${first.id}`]: Date.now() } });
    useStore.setState({ courseSchedule: [{ id: 'g1:weekday:2', grade: 'g1', weekday: 2, subjects: ['math'] }] });
    ensureCourseMails('taskKid', new Date('2026-09-29T10:00:00'));
    expect(courseMailBuckets('taskKid').current[0]).toMatchObject({ lessonId: second.id });
    ensureCourseMails('taskKid', new Date('2026-10-03T10:00:00'));
    expect(Object.values(useStore.getState().taskStates.taskKid.courseMails).filter((mail) => mail.date === '2026-10-03')).toHaveLength(0);
  });

  it('周末也可单独安排新课，复习勾选不会误生成课程邮件', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-04T10:00:00'));
    useStore.setState({ courseSchedule: [{ id: 'g1:weekday:7', grade: 'g1', weekday: 7, subjects: ['english'], reviews: ['math'] }] });
    ensureCourseMails('taskKid');
    expect(courseMailBuckets('taskKid').current.map((mail) => mail.subject)).toEqual(['english']);
  });

  it('同一天固定同一条到期复习，不因刷新换题', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-29T10:00:00'));
    scheduleReview('taskKid', { subject: 'math', lessonId: 'numbers', title: '1～5 的认识', focus: '数和数量对应', route: '/math-course/numbers' });
    const first = ensureDailyReview('taskKid');
    scheduleReview('taskKid', { subject: 'chinese', lessonId: 'china', title: '我是中国人', focus: '朗读和识字', route: '/chinese-course/china' });
    expect(ensureDailyReview('taskKid')).toEqual(first);
    pauseMission('taskKid', first!.taskId);
    expect(acceptedMissions('taskKid')[0]).toMatchObject({ id: first!.taskId, category: 'review' });
  });

  it('默认新课与双科复习交替、周日休息，空配置才使用模板', () => {
    expect(weeklyStudySchedule('g1').map((item) => [item.weekday, item.subjects, item.reviews])).toEqual([
      [1, ['chinese'], []], [2, [], ['chinese', 'english']], [3, ['math'], []],
      [4, [], ['chinese', 'math']], [5, ['english'], []], [6, [], ['math', 'english']], [7, [], []],
    ]);
    expect(effectiveCourseSchedule([]).filter((item) => item.grade === 'g1')).toEqual(weeklyStudySchedule('g1'));
    const custom = [{ id: 'g1:weekday:3', grade: 'g1' as const, weekday: 3 as const, subjects: ['math' as const] }];
    expect(effectiveCourseSchedule(custom)).toBe(custom);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-28T10:00:00'));
    ensureCourseMails('taskKid');
    expect(courseMailBuckets('taskKid').current.map((mail) => mail.subject)).toEqual(['chinese']);
    ensureCourseMails('taskKid', new Date('2026-09-29T10:00:00'));
    expect(courseMailBuckets('taskKid', new Date('2026-09-29T10:00:00')).current).toEqual([]);
    ensureCourseMails('taskKid', new Date('2026-09-30T10:00:00'));
    expect(courseMailBuckets('taskKid', new Date('2026-09-30T10:00:00')).current.map((mail) => mail.subject)).toEqual(['math']);
  });

  it('只升级上一版完整默认模板，保留家长自己调整过的课表', () => {
    const old = [
      [1, ['chinese'], []], [2, ['math'], ['english']], [3, [], ['chinese']],
      [4, [], ['math']], [5, ['english'], ['chinese']], [6, [], ['math']], [7, [], ['english']],
    ].map(([weekday, subjects, reviews]) => ({
      id: `g1:weekday:${weekday}`, grade: 'g1' as const,
      weekday: weekday as 1 | 2 | 3 | 4 | 5 | 6 | 7,
      subjects: subjects as Array<'chinese' | 'math' | 'english'>,
      reviews: reviews as Array<'chinese' | 'math' | 'english'>,
    }));
    expect(effectiveCourseSchedule(old)).toEqual(weeklyStudySchedule('g1'));
    const custom = old.map((row) => row.weekday === 2 ? { ...row, reviews: [] } : row);
    expect(effectiveCourseSchedule(custom)).toBe(custom);
  });

  it('D0 当天单独巩固；后续只按自选的学科复习日出现', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-02T22:00:00'));
    scheduleReview('taskKid', { subject: 'english', lessonId: 'hello', title: 'Hello', focus: '问候', route: '/english-course/hello' });
    const entry = reviewEntries('taskKid')[0];
    expect(dueReviewDays(entry, new Date('2026-10-02T22:01:00').getTime())).toEqual([0]);
    completeReviewDay('taskKid', entry.id, 0);
    const custom = [
      { id: 'g1:weekday:7', grade: 'g1' as const, weekday: 7 as const, subjects: [], reviews: ['chinese' as const] },
      { id: 'g1:weekday:2', grade: 'g1' as const, weekday: 2 as const, subjects: [], reviews: ['english' as const] },
    ];
    expect(reviewCandidates('taskKid', 'g1', custom, new Date('2026-10-04T08:00:00'))).toEqual([]);
    expect(reviewCandidates('taskKid', 'g1', custom, new Date('2026-10-06T08:00:00'))).toMatchObject([{ entry: { id: 'english:hello' }, reviewDay: -1 }]);
    completeReviewDay('taskKid', entry.id, -1, new Date('2026-10-06T08:00:00'));
    expect(reviewCandidates('taskKid', 'g1', custom, new Date('2026-10-06T20:00:00'))).toEqual([]);
    expect(reviewCandidates('taskKid', 'g1', custom, new Date('2026-10-13T08:00:00'))).toMatchObject([{ entry: { id: 'english:hello' }, reviewDay: -1 }]);
    vi.setSystemTime(new Date('2026-10-07T10:00:00'));
    scheduleReview('taskKid', { subject: 'english', lessonId: 'hello', title: 'Hello', focus: '问候', route: '/english-course/hello' });
    expect(reviewEntries('taskKid')[0]).toMatchObject({ learnedAt: entry.learnedAt, completedDays: [0], reviewedOn: ['2026-10-06'] });
  });

  it('同一复习日按学科各选一节旧课，空选项和空日期不会回退到模板', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-28T10:00:00'));
    scheduleReview('taskKid', { subject: 'chinese', lessonId: 'a', title: '语文 A', focus: '识字', route: '/chinese-course/a' });
    scheduleReview('taskKid', { subject: 'chinese', lessonId: 'b', title: '语文 B', focus: '朗读', route: '/chinese-course/b' });
    scheduleReview('taskKid', { subject: 'math', lessonId: 'c', title: '数学 C', focus: '数数', route: '/math-course/c' });
    const schedule = [
      { id: 'g1:weekday:1', grade: 'g1' as const, weekday: 1 as const, subjects: [], reviews: [] },
      { id: 'g1:weekday:2', grade: 'g1' as const, weekday: 2 as const, subjects: [], reviews: ['chinese' as const, 'math' as const] },
    ];
    expect(reviewCandidates('taskKid', 'g1', schedule, new Date('2026-09-30T10:00:00'))).toEqual([]);
    expect(reviewCandidates('taskKid', 'g1', schedule, new Date('2026-09-29T10:00:00')).map((item) => [item.entry.id, item.reviewDay])).toEqual([
      ['chinese:a', -1], ['math:c', -1],
    ]);
    completeReviewDay('taskKid', 'chinese:a', -1, new Date('2026-09-29T11:00:00'));
    expect(reviewCandidates('taskKid', 'g1', schedule, new Date('2026-09-29T12:00:00')).map((item) => item.entry.id)).toEqual(['math:c']);
    expect(reviewCandidates('taskKid', 'g1', schedule, new Date('2026-10-06T10:00:00')).map((item) => item.entry.id)).toContain('chinese:b');
  });

  it('课程表改变后撤销未完成的旧复习指派，已领取的当日奖励不重开', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-29T10:00:00'));
    scheduleReview('taskKid', { subject: 'english', lessonId: 'a', title: '英语 A', focus: '表达', route: '/english-course/a' });
    completeReviewDay('taskKid', 'english:a', 0);
    vi.setSystemTime(new Date('2026-10-06T10:00:00'));
    const assigned = ensureDailyReview('taskKid')!;
    expect(assigned).toMatchObject({ entryId: 'english:a', reviewDay: -1 });
    useStore.setState({ courseSchedule: [{ id: 'g1:weekday:2', grade: 'g1', weekday: 2, subjects: [], reviews: [] }] });
    expect(ensureDailyReview('taskKid')).toBeUndefined();
    expect(completeDailyReview('taskKid', 'english:a', -1)).toBe(false);
    useStore.setState({ courseSchedule: [{ id: 'g1:weekday:2', grade: 'g1', weekday: 2, subjects: [], reviews: ['english'] }] });
    expect(completeDailyReview('taskKid', 'english:a', -1)).toBe(true);
    useStore.setState({ courseSchedule: [{ id: 'g1:weekday:2', grade: 'g1', weekday: 2, subjects: [], reviews: [] }] });
    expect(ensureDailyReview('taskKid')?.taskId).toBe(assigned.taskId);
    expect(useStore.getState().points.taskKid).toBe(8);
  });

  it('一日只有指定复习任务可领奖，完成另一节复习不产生第二份奖励', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-28T10:00:00'));
    scheduleReview('taskKid', { subject: 'chinese', lessonId: 'a', title: '语文 A', focus: '识字', route: '/chinese-course/a' });
    scheduleReview('taskKid', { subject: 'math', lessonId: 'b', title: '数学 B', focus: '数数', route: '/math-course/b' });
    const target = ensureDailyReview('taskKid')!;
    expect(completeDailyReview('taskKid', target.entryId === 'chinese:a' ? 'math:b' : 'chinese:a', 0)).toBe(false);
    expect(useStore.getState().points.taskKid).toBe(0);
    expect(completeDailyReview('taskKid', target.entryId, 0)).toBe(true);
    expect(completeDailyReview('taskKid', target.entryId, 0)).toBe(false);
    expect(useStore.getState().points.taskKid).toBe(8);
  });

  it('当前语文、英语和拓展数学课都有可独立完成的复习小检验', () => {
    expect(CHINESE_TEXTBOOK_LESSONS.every((lesson) => lesson.questions.length > 0
      && lesson.questions[0].answer >= 0 && lesson.questions[0].answer < lesson.questions[0].options.length)).toBe(true);
    expect(ENGLISH_G3_ALL_LESSONS.every((lesson) => lesson.check.options.includes(lesson.check.answer))).toBe(true);
    expect(EXTENDED_MATH_LESSONS.every((lesson) => Boolean(lesson.checkpoint))).toBe(true);
  });

  it('新设备拉取云端任务状态时保留暂停位置和完成事实', () => {
    useStore.setState({ taskStates: { remoteKid: { ...emptyChildTaskState(5), initializedAt: 5, courseMails: { mail: { startedAt: 5 } } } } });
    const remote = { ...emptyChildTaskState(10), initializedAt: 5, updatedAt: 10, preferredSubject: 'chinese' as const, pausedTaskId: 'explore:chinese-signs', completed: { 'course:chinese:china': { completedAt: 9, reward: 8 } }, courseMails: { mail: { date: '2026-09-29', subject: 'chinese' as const, lessonId: 'china', reward: 8 } } };
    useStore.getState().applyCloudTaskState('remoteKid', remote);
    expect(useStore.getState().taskStates.remoteKid).toMatchObject({ preferredSubject: 'chinese', pausedTaskId: 'explore:chinese-signs' });
    expect(useStore.getState().taskStates.remoteKid.completed['course:chinese:china']).toBeTruthy();
    expect(useStore.getState().taskStates.remoteKid.courseMails.mail).toMatchObject({ date: '2026-09-29', subject: 'chinese', lessonId: 'china', reward: 8, startedAt: 5 });
  });
});
