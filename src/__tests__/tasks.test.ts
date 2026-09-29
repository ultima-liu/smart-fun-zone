import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { activeLessons } from '../activeCourses';
import { acceptedMissions, deliveredMission, ensureDailyReview, initializeTaskSystem, MISSION_ACTIVITIES, pauseMission, settleCourseTask } from '../taskSystem';
import { useStore } from '../store';
import { scheduleReview } from '../reviewPlan';
import { emptyChildTaskState } from '../taskTypes';

describe('七类主动推送任务系统', () => {
  const original = useStore.getState();

  beforeEach(() => {
    localStorage.clear();
    useStore.setState({
      profiles: [{ id: 'taskKid', name: '小星', avatar: '🐰', ageBand: 'g1', createdAt: 1 }],
      activeChildId: 'taskKid', mastery: {}, pointLog: {}, points: { taskKid: 0 }, taskStates: {}, customTasks: {},
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

  it('课程任务只结算一次，并写入可同步的完成事实', () => {
    initializeTaskSystem('taskKid');
    const lesson = activeLessons('taskKid', useStore.getState().mastery).find((item) => item.subject === 'math')!;
    useStore.getState().addSkillResult('taskKid', `math-lab-${lesson.id}`, 2);

    expect(settleCourseTask('taskKid', 'math', lesson.id, '2 星')).toBe(true);
    expect(settleCourseTask('taskKid', 'math', lesson.id, '2 星')).toBe(false);
    expect(useStore.getState().points.taskKid).toBe(8);
    expect(useStore.getState().taskStates.taskKid.completed[`course:math:${lesson.id}`]).toMatchObject({ reward: 8, result: '2 星' });
  });

  it('家长任务优先于课程并直接推送到首页', () => {
    initializeTaskSystem('taskKid');
    useStore.setState({ customTasks: { taskKid: [{ id: 'home-1', text: '自己整理书包', repeat: 'daily', judge: 'parent', points: 6, createdAt: 1, doneDays: [], pendingDays: [] }] } });
    const mission = deliveredMission('taskKid', new Date('2026-09-29T10:00:00'));
    expect(mission).toMatchObject({ category: 'parent', title: '自己整理书包', reward: 6 });
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

  it('新设备拉取云端任务状态时保留暂停位置和完成事实', () => {
    const remote = { ...emptyChildTaskState(10), initializedAt: 5, updatedAt: 10, preferredSubject: 'chinese' as const, pausedTaskId: 'explore:chinese-signs', completed: { 'course:chinese:china': { completedAt: 9, reward: 8 } } };
    useStore.getState().applyCloudTaskState('remoteKid', remote);
    expect(useStore.getState().taskStates.remoteKid).toMatchObject({ preferredSubject: 'chinese', pausedTaskId: 'explore:chinese-signs' });
    expect(useStore.getState().taskStates.remoteKid.completed['course:chinese:china']).toBeTruthy();
  });
});
