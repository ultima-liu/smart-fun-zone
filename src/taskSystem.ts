import { activeLessons, type ActiveLesson, type ActiveSubject } from './activeCourses';
import { CHINESE_TEXTBOOK_LESSONS } from './content/chineseTextbookCurriculum';
import { ENGLISH_G3_ALL_LESSONS, ENGLISH_G3_UPPER_UNITS } from './content/englishGrade3Upper';
import { MATH_UPPER_UNITS } from './content/mathUpperCurriculum';
import { localDayKey } from './dailyCheckin';
import { customTaskDueToday, type CustomTask } from './points';
import { reviewCandidates } from './reviewPlan';
import { useStore } from './store';
import { effectiveCourseSchedule } from './weeklyStudyPlan';
import { emptyChildTaskState, type ChildTaskState, type CourseMailProgress, type DailyReviewAssignment, type TaskCategory } from './taskTypes';

export type MissionQuestion = { prompt: string; options: string[]; answer: number; explain: string };

export type Mission = {
  id: string;
  category: TaskCategory;
  categoryLabel: string;
  title: string;
  brief: string;
  actionLabel: string;
  icon: string;
  reward: number;
  route: string;
  subject?: ActiveSubject;
  questions?: MissionQuestion[];
  passCount?: number;
  kind?: 'core' | 'visitor';
  enabled?: boolean;
  mailDate?: string;
  scheduleId?: string;
};

export type CourseMailStatus = 'not-started' | 'unfinished' | 'completed';
export type CourseMailRecord = {
  mailId: string;
  date: string;
  subject: ActiveSubject;
  lessonId: string;
  reward: number;
  mission: Mission;
  status: CourseMailStatus;
  rewardClaimed: boolean;
  startedAt?: number;
  completedAt?: number;
  claimedAt?: number;
};

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  course: '课程任务', chapter: '章节任务', review: '每日复习', challenge: '专项挑战',
  exploration: '探索支线', event: '主题活动', parent: '家长任务',
};
const SUBJECT_META: Record<ActiveSubject, { label: string; icon: string }> = {
  math: { label: '数学', icon: '📐' }, chinese: { label: '语文', icon: '📖' }, english: { label: '英语', icon: '🔤' },
};
const Q = (prompt: string, options: string[], answer: number, explain: string): MissionQuestion => ({ prompt, options, answer, explain });

export function effectiveMission(task: Mission): Mission {
  const override = useStore.getState().taskOverrides[`category:${task.category}`];
  return override ? { ...task, reward: override.reward ?? task.reward, enabled: override.enabled ?? true } : task;
}

export const MISSION_ACTIVITIES: Mission[] = [
  {
    id: 'challenge:math:within-five', category: 'challenge', categoryLabel: CATEGORY_LABELS.challenge,
    title: '五以内加减小擂台', brief: '6 道题，第一次作答答对 5 道就挑战成功。', actionLabel: '接受挑战', icon: '🧮', reward: 15,
    route: '/task/challenge:math:within-five', subject: 'math', kind: 'visitor', passCount: 5,
    questions: [Q('1 + 2 = ?', ['2', '3', '4'], 1, '1 和 2 合起来是 3。'), Q('4 - 1 = ?', ['3', '4', '5'], 0, '从 4 里拿走 1，还剩 3。'), Q('2 + 3 = ?', ['4', '5', '6'], 1, '2 和 3 合起来是 5。'), Q('5 - 2 = ?', ['2', '3', '4'], 1, '从 5 里拿走 2，还剩 3。'), Q('3 + 1 = ?', ['3', '4', '5'], 1, '3 后面再数 1 个是 4。'), Q('4 - 2 = ?', ['1', '2', '3'], 1, '4 分成 2 和 2。')],
  },
  {
    id: 'challenge:chinese:first-characters', category: 'challenge', categoryLabel: CATEGORY_LABELS.challenge,
    title: '天地人认字挑战', brief: '认出“天、地、人、你、我、他”，第一次作答答对 5 道。', actionLabel: '接受挑战', icon: '🀄', reward: 15,
    route: '/task/challenge:chinese:first-characters', subject: 'chinese', kind: 'visitor', passCount: 5,
    questions: [Q('“天空”的“天”是哪一个？', ['天', '大', '夫'], 0, '头顶上的是天空。'), Q('“土地”的“地”是哪一个？', ['也', '地', '他'], 1, '“地”左边有提土旁。'), Q('“人民”的“人”是哪一个？', ['入', '八', '人'], 2, '“人”字一撇一捺。'), Q('指对方时说哪个字？', ['你', '我', '他'], 0, '面对对方时说“你”。'), Q('指自己时说哪个字？', ['你', '我', '他'], 1, '指自己时说“我”。'), Q('指另一位男生时说哪个字？', ['你', '我', '他'], 2, '说到另一位男生可用“他”。')],
  },
  {
    id: 'challenge:english:greetings', category: 'challenge', categoryLabel: CATEGORY_LABELS.challenge,
    title: 'Hello! 问候挑战', brief: '在 6 个见面情境里选合适的话，第一次答对 5 道。', actionLabel: '接受挑战', icon: '💬', reward: 15,
    route: '/task/challenge:english:greetings', subject: 'english', kind: 'visitor', passCount: 5,
    questions: [Q('早上见到老师，你说：', ['Good morning!', 'Good night!', 'Goodbye!'], 0, '早上问候用 Good morning!'), Q('第一次见面，你说：', ['Nice to meet you.', 'Thank you.', 'I am sorry.'], 0, '初次见面可以说 Nice to meet you.'), Q('朋友说 Hello，你回应：', ['Hello!', 'Goodbye!', 'No.'], 0, '别人问候时也要回应问候。'), Q('放学离开，你说：', ['Goodbye!', 'Good morning!', 'Hello!'], 0, '离开时说 Goodbye!'), Q('别人问 How are you?，你说：', ['I am fine, thank you.', 'My name is Tom.', 'Good night.'], 0, 'How are you? 是在问你怎么样。'), Q('睡前和家人说：', ['Good night!', 'Good afternoon!', 'Nice to meet you.'], 0, '睡前道晚安用 Good night!')],
  },
  {
    id: 'explore:fruit-orders', category: 'exploration', categoryLabel: CATEGORY_LABELS.exploration,
    title: '水果摊三张订单', brief: '帮兔兔配齐苹果、梨和橙子，读懂数量再出货。', actionLabel: '去帮忙', icon: '🍎', reward: 10,
    route: '/task/explore:fruit-orders', subject: 'math', kind: 'visitor', passCount: 3,
    questions: [Q('第一张订单要 2 个苹果，选哪一篮？', ['🍎', '🍎🍎', '🍎🍎🍎'], 1, '两个苹果要一个一个数。'), Q('第二张订单要 3 个梨，选哪一篮？', ['🍐🍐🍐', '🍐🍐', '🍐🍐🍐🍐'], 0, '三个梨正好配齐。'), Q('第三张订单要 5 个橙子，选哪一篮？', ['🍊🍊🍊🍊', '🍊🍊🍊🍊🍊', '🍊🍊🍊🍊🍊🍊'], 1, '五个橙子正好配齐。')],
  },
  {
    id: 'explore:picnic', category: 'exploration', categoryLabel: CATEGORY_LABELS.exploration,
    title: '公园野餐准备', brief: '按人数准备杯子、水果和坐垫，数量要正好。', actionLabel: '去准备', icon: '🧺', reward: 10,
    route: '/task/explore:picnic', subject: 'math', kind: 'visitor', passCount: 3,
    questions: [Q('有 4 位朋友，每人一个杯子，要准备几个？', ['3 个', '4 个', '5 个'], 1, '一人一个，4 人需要 4 个。'), Q('篮子里有 2 个苹果，又放入 3 个，一共有？', ['4 个', '5 个', '6 个'], 1, '2 加 3 等于 5。'), Q('有 5 张坐垫，来了 4 位朋友，会剩几张？', ['1 张', '2 张', '3 张'], 0, '5 减 4 等于 1。')],
  },
  {
    id: 'explore:repair-shop', category: 'exploration', categoryLabel: CATEGORY_LABELS.exploration,
    title: '维修铺找零件', brief: '根据能不能滚、有没有平面，找到正确的立体图形零件。', actionLabel: '去维修', icon: '🧰', reward: 10,
    route: '/task/explore:repair-shop', subject: 'math', kind: 'visitor', passCount: 3,
    questions: [Q('车轮需要能顺畅滚动，选哪种零件？', ['球', '正方体', '长方体'], 0, '球有曲面，可以向不同方向滚动。'), Q('要垒一个稳定底座，选哪种？', ['球', '正方体', '圆柱侧放'], 1, '正方体有平平的面，放得稳。'), Q('罐子一样，上下有两个圆形平面的是？', ['圆柱', '球', '长方体'], 0, '圆柱上下是圆形平面，侧面是曲面。')],
  },
  {
    id: 'explore:chinese-signs', category: 'exploration', categoryLabel: CATEGORY_LABELS.exploration,
    title: '校园路牌调查', brief: '把三个地点和正确的中文路牌配起来。', actionLabel: '去调查', icon: '🪧', reward: 10,
    route: '/task/explore:chinese-signs', subject: 'chinese', kind: 'visitor', passCount: 3,
    questions: [Q('借书的地方是哪块路牌？', ['图书馆', '操场', '食堂'], 0, '图书馆里可以借书。'), Q('跑步做操的地方是哪块路牌？', ['食堂', '操场', '校门'], 1, '操场是运动的地方。'), Q('吃午饭的地方是哪块路牌？', ['食堂', '教室', '图书馆'], 0, '食堂是吃饭的地方。')],
  },
  {
    id: 'explore:english-guests', category: 'exploration', categoryLabel: CATEGORY_LABELS.exploration,
    title: '公园里的外国朋友', brief: '用学过的英语完成三次礼貌问候。', actionLabel: '去认识', icon: '🌳', reward: 10,
    route: '/task/explore:english-guests', subject: 'english', kind: 'visitor', passCount: 3,
    questions: [Q('朋友说 Hello! 你回应：', ['Hello!', 'Goodbye!', 'No!'], 0, '先回应对方的问候。'), Q('想告诉对方自己的名字：', ['My name is Juanjuan.', 'Good night.', 'Thank you.'], 0, 'My name is… 用来介绍名字。'), Q('准备离开时说：', ['Goodbye!', 'Good morning!', 'Hello!'], 0, '离开时礼貌告别。')],
  },
  {
    id: 'event:autumn-discovery:2026', category: 'event', categoryLabel: CATEGORY_LABELS.event,
    title: '秋日发现行动', brief: '观察叶子、数果实、说出一个秋天的发现。', actionLabel: '参加活动', icon: '🍂', reward: 18,
    route: '/task/event:autumn-discovery:2026', kind: 'visitor', passCount: 3,
    questions: [Q('哪一种最像秋天常见的颜色？', ['金黄色', '透明色', '霓虹紫'], 0, '秋天的叶子常变成黄色或红色。'), Q('篮子里有 2 个苹果，又放进 1 个，一共有？', ['2', '3', '4'], 1, '2 加 1 等于 3。'), Q('选一句完整的观察记录：', ['叶子变黄了。', '黄色。', '看。'], 0, '完整句子说清了谁发生了什么变化。')],
  },
];

function courseTask(lesson: ActiveLesson): Mission {
  const meta = SUBJECT_META[lesson.subject];
  return effectiveMission({ id: `course:${lesson.subject}:${lesson.id}`, category: 'course', categoryLabel: CATEGORY_LABELS.course, title: `${meta.label} · ${lesson.title}`, brief: '完成这节课的学习步骤和最后练习。', actionLabel: lesson.stars > 0 ? '再学一遍' : '开始上课', icon: meta.icon, reward: 8, route: lesson.route, subject: lesson.subject, kind: 'core' });
}

type Chapter = { id: string; title: string; subject: ActiveSubject; lessonIds: string[] };
export function chapters(): Chapter[] {
  const math = MATH_UPPER_UNITS.map((unit, index) => ({ id: `math:${unit.no || index + 1}`, title: `数学 · ${unit.title}`, subject: 'math' as const, lessonIds: unit.lessons.map((lesson) => lesson.id) }));
  const chineseGroups = new Map<string, string[]>();
  for (const lesson of CHINESE_TEXTBOOK_LESSONS) chineseGroups.set(lesson.unit, [...(chineseGroups.get(lesson.unit) ?? []), lesson.id]);
  const chinese = [...chineseGroups].map(([unit, lessonIds], index) => ({ id: `chinese:${index + 1}`, title: `语文 · ${unit}`, subject: 'chinese' as const, lessonIds }));
  const english = ENGLISH_G3_UPPER_UNITS.map((unit) => ({ id: `english:${unit.id}`, title: `英语 · ${unit.title}`, subject: 'english' as const, lessonIds: ENGLISH_G3_ALL_LESSONS.filter((lesson) => lesson.unitId === unit.id).map((lesson) => lesson.id) }));
  const revision = ENGLISH_G3_ALL_LESSONS.filter((lesson) => lesson.unitId === 'revision').map((lesson) => lesson.id);
  if (revision.length) english.push({ id: 'english:revision', title: '英语 · 综合复习', subject: 'english', lessonIds: revision });
  return [...math, ...chinese, ...english];
}

export function chapterMission(chapter: Chapter): Mission {
  return effectiveMission({ id: `chapter:${chapter.id}`, category: 'chapter', categoryLabel: CATEGORY_LABELS.chapter, title: chapter.title, brief: `完成本章 ${chapter.lessonIds.length} 节课程。`, actionLabel: '继续本章', icon: '🏆', reward: 30, route: `/subject/${chapter.subject}`, subject: chapter.subject, kind: 'core' });
}

function taskState(childId: string): ChildTaskState { return useStore.getState().taskStates[childId] ?? emptyChildTaskState(); }
function isComplete(childId: string, taskId: string) { return Boolean(taskState(childId).completed[taskId] || useStore.getState().pointLog[childId]?.some((entry) => entry.id === `mission:${taskId}`)); }

export function initializeTaskSystem(childId: string) {
  const store = useStore.getState();
  const current = store.taskStates[childId] ?? emptyChildTaskState();
  const now = Date.now();
  const completed = { ...current.completed };
  const lessonCompletedAt = { ...(current.lessonCompletedAt ?? {}) };
  for (const lesson of activeLessons(childId, store.mastery)) if (lesson.stars > 0) {
    completed[`course:${lesson.subject}:${lesson.id}`] = { completedAt: now, reward: 0, legacy: true };
    lessonCompletedAt[`${lesson.subject}:${lesson.id}`] ??= now;
  }
  for (const chapter of chapters()) if (chapter.lessonIds.every((id) => completed[`course:${chapter.subject}:${id}`])) completed[`chapter:${chapter.id}`] = { completedAt: now, reward: 0, legacy: true };
  const needsRepair = !current.initializedAt
    || Object.keys(lessonCompletedAt).length !== Object.keys(current.lessonCompletedAt ?? {}).length
    || !current.courseMails;
  if (needsRepair) store.patchTaskState(childId, { initializedAt: current.initializedAt || now, completed, lessonCompletedAt, courseMails: current.courseMails ?? {} });
}

export function settleCourseTask(childId: string, subject: ActiveSubject, lessonId: string, result?: string) {
  initializeTaskSystem(childId);
  const store = useStore.getState();
  const lesson = activeLessons(childId, store.mastery).find((item) => item.subject === subject && item.id === lessonId);
  if (!lesson) return false;
  const state = taskState(childId);
  const now = Date.now();
  const lessonKey = `${subject}:${lessonId}`;
  const lessonCompletedAt = { ...(state.lessonCompletedAt ?? {}), [lessonKey]: state.lessonCompletedAt?.[lessonKey] ?? now };
  const courseMails = { ...(state.courseMails ?? {}) };
  let won = false;
  for (const [mailId, progress] of Object.entries(courseMails)) {
    if (progress.subject !== subject || progress.lessonId !== lessonId) continue;
    if (!progress.completedAt) {
      courseMails[mailId] = { ...progress, completedAt: now, result };
      won = true;
    }
  }
  useStore.getState().patchTaskState(childId, { lessonCompletedAt, courseMails });
  const chapter = chapters().find((item) => item.subject === subject && item.lessonIds.includes(lessonId));
  if (chapter) {
    const allDone = chapter.lessonIds.every((id) => lessonCompletedAt[`${subject}:${id}`]);
    if (allDone) { const chapterTask = chapterMission(chapter); if (chapterTask.enabled !== false) useStore.getState().completeMission(childId, chapterTask.id, chapterTask.title, chapterTask.reward, `${chapter.lessonIds.length}/${chapter.lessonIds.length}`); }
  }
  return won;
}

export function ensureDailyReview(childId: string, now = Date.now()): DailyReviewAssignment | undefined {
  const day = localDayKey(new Date(now));
  const state = taskState(childId);
  const store = useStore.getState();
  const profile = store.profiles.find((item) => item.id === childId);
  if (!profile) return undefined;
  const candidates = reviewCandidates(childId, profile.ageBand, store.courseSchedule, new Date(now));
  if (state.dailyReview?.day === day) {
    if (isComplete(childId, state.dailyReview.taskId)
      || candidates.some((item) => item.entry.id === state.dailyReview?.entryId && item.reviewDay === state.dailyReview?.reviewDay)) return state.dailyReview;
  }
  const due = candidates[0];
  if (!due) {
    if (state.dailyReview?.day === day) useStore.getState().patchTaskState(childId, { dailyReview: undefined });
    return undefined;
  }
  const reviewDay = due.reviewDay;
  const assignment: DailyReviewAssignment = { day, taskId: `review:${day}:${due.entry.id}:${reviewDay}`, entryId: due.entry.id, reviewDay, title: due.entry.title, focus: due.entry.focus, route: due.entry.route };
  useStore.getState().patchTaskState(childId, { dailyReview: assignment });
  return assignment;
}

export function completeDailyReview(childId: string, entryId: string, reviewDay: number) {
  const assignment = ensureDailyReview(childId);
  if (!assignment || assignment.day !== localDayKey() || assignment.entryId !== entryId || assignment.reviewDay !== reviewDay) return false;
  const mission = reviewMission(assignment);
  if (mission.enabled === false) return false;
  return useStore.getState().completeMission(childId, assignment.taskId, mission.title, mission.reward, reviewDay === 0 ? '当天巩固' : '课程表复习');
}

export function completeActivityMission(childId: string, taskId: string, correct: number, total: number) {
  const raw = MISSION_ACTIVITIES.find((item) => item.id === taskId);
  const task = raw ? effectiveMission(raw) : undefined;
  if (!task || task.enabled === false || correct < (task.passCount ?? total)) return false;
  return useStore.getState().completeMission(childId, task.id, task.title, task.reward, `${correct}/${total}`);
}

export function markMissionSeen(childId: string, task: Mission) {
  if (task.kind !== 'visitor') return;
  const day = localDayKey(); const state = taskState(childId); const shown = state.visitorDay === day ? state.visitorShown : [];
  if (!shown.includes(task.id)) useStore.getState().patchTaskState(childId, { visitorDay: day, visitorShown: [...shown, task.id].slice(-2) });
}
export function dismissMission(childId: string, taskId: string) { const state = taskState(childId); useStore.getState().patchTaskState(childId, { pausedTaskId: undefined, dismissedOn: { ...state.dismissedOn, [taskId]: localDayKey() } }); }
export function pauseMission(childId: string, taskId: string) { useStore.getState().patchTaskState(childId, { pausedTaskId: taskId }); }
export function setPreferredSubject(childId: string, subject: ActiveSubject) { useStore.getState().patchTaskState(childId, { preferredSubject: subject, pausedTaskId: undefined }); }
export function quietVisitors(childId: string) { useStore.getState().patchTaskState(childId, { quietUntil: Date.now() + 30 * 60_000 }); }
export function clearLastCompletion(childId: string) { useStore.getState().patchTaskState(childId, { lastCompletion: undefined }); }

function scheduledCourseMission(childId: string, mailId: string, progress: CourseMailProgress): Mission | undefined {
  if (!progress.date || !progress.subject || !progress.lessonId || progress.reward === undefined) return undefined;
  const lesson = activeLessons(childId, useStore.getState().mastery).find((item) => item.subject === progress.subject && item.id === progress.lessonId);
  if (!lesson) return undefined;
  const meta = SUBJECT_META[progress.subject];
  return {
    id: `course-mail:${mailId}`, category: 'course', categoryLabel: CATEGORY_LABELS.course,
    title: `${meta.label} · ${lesson.title}`, brief: '完成这节课的学习步骤和最后练习。',
    actionLabel: '开始上课', icon: meta.icon, reward: progress.reward, route: lesson.route,
    subject: progress.subject, kind: 'core', mailDate: progress.date, scheduleId: mailId,
  };
}

export function ensureCourseMails(childId: string, now = new Date()) {
  initializeTaskSystem(childId);
  const store = useStore.getState();
  const profile = store.profiles.find((item) => item.id === childId);
  const weekday = now.getDay() || 7;
  if (!profile) return;
  const schedule = effectiveCourseSchedule(store.courseSchedule).find((entry) => entry.grade === profile.ageBand && entry.weekday === weekday);
  const override = store.taskOverrides['category:course'];
  if (!schedule || override?.enabled === false) return;
  const state = taskState(childId);
  const day = localDayKey(now);
  const courseMails = { ...(state.courseMails ?? {}) };
  const assignedLessons = new Set(Object.values(courseMails).flatMap((progress) => progress.subject && progress.lessonId ? [`${progress.subject}:${progress.lessonId}`] : []));
  const lessons = activeLessons(childId, store.mastery);
  const reward = override?.reward ?? 8;
  let changed = false;
  for (const subject of schedule.subjects) {
    if (Object.values(courseMails).some((progress) => progress.date === day && progress.subject === subject)) continue;
    const lesson = lessons.find((item) => item.subject === subject
      && !state.lessonCompletedAt?.[`${subject}:${item.id}`]
      && !assignedLessons.has(`${subject}:${item.id}`));
    if (!lesson) continue;
    const mailId = `${day}:${subject}:${lesson.id}`;
    courseMails[mailId] = { date: day, subject, lessonId: lesson.id, reward };
    assignedLessons.add(`${subject}:${lesson.id}`);
    changed = true;
  }
  if (changed) useStore.getState().patchTaskState(childId, { courseMails });
}

export function courseMailRecords(childId: string, now = new Date()): CourseMailRecord[] {
  const state = taskState(childId);
  const day = localDayKey(now);
  return Object.entries(state.courseMails ?? {})
    .filter(([, progress]) => Boolean(progress.date && progress.date <= day))
    .sort((a, b) => (a[1].date ?? '').localeCompare(b[1].date ?? '') || a[0].localeCompare(b[0]))
    .flatMap(([mailId, progress]) => {
      const mission = scheduledCourseMission(childId, mailId, progress);
      if (!mission) return [];
      const date = progress.date!;
      const subject = progress.subject!;
      const lessonId = progress.lessonId!;
      const reward = progress.reward!;
      const completedAt = progress.completedAt ?? state.lessonCompletedAt?.[`${subject}:${lessonId}`];
      const status: CourseMailStatus = completedAt ? 'completed' : progress.startedAt || date < day ? 'unfinished' : 'not-started';
      return [{ mailId, date, subject, lessonId, reward, mission: { ...mission, actionLabel: status === 'not-started' ? '开始上课' : status === 'unfinished' ? '继续上课' : '查看课程' }, status, rewardClaimed: Boolean(progress.claimedAt), startedAt: progress.startedAt, completedAt, claimedAt: progress.claimedAt }];
    });
}

export function courseMailBuckets(childId: string, now = new Date()) {
  const day = localDayKey(now);
  const records = courseMailRecords(childId, now);
  return {
    current: records.filter((item) => item.date === day && !item.rewardClaimed),
    unfinished: records.filter((item) => item.date < day && !item.rewardClaimed),
    completed: records.filter((item) => item.rewardClaimed).sort((a, b) => (b.claimedAt ?? 0) - (a.claimedAt ?? 0)),
  };
}

export function startCourseMail(childId: string, scheduleId: string) {
  const state = taskState(childId);
  const current = state.courseMails?.[scheduleId] ?? {};
  if (current.startedAt || current.completedAt) return;
  useStore.getState().patchTaskState(childId, { courseMails: { ...(state.courseMails ?? {}), [scheduleId]: { ...current, startedAt: Date.now() } } });
}

export function claimCourseMailReward(childId: string, scheduleId: string): boolean {
  const record = courseMailRecords(childId).find((item) => item.mailId === scheduleId);
  if (!record || record.status !== 'completed' || record.rewardClaimed) return false;
  const now = Date.now();
  useStore.getState().applyPoints(childId, record.reward, `课程邮件·${record.mission.title}`, `course-mail-reward:${scheduleId}`);
  const state = taskState(childId);
  const current = state.courseMails?.[scheduleId] ?? {};
  useStore.getState().patchTaskState(childId, {
    courseMails: { ...(state.courseMails ?? {}), [scheduleId]: { ...current, completedAt: current.completedAt ?? record.completedAt ?? now, claimedAt: now } },
  });
  return true;
}

export function missionById(childId: string, taskId: string): Mission | undefined {
  const store = useStore.getState();
  if (taskId.startsWith('course-mail:')) {
    const mailId = taskId.slice('course-mail:'.length);
    const progress = store.taskStates[childId]?.courseMails?.[mailId];
    if (progress) return scheduledCourseMission(childId, mailId, progress);
  }
  const review = store.taskStates[childId]?.dailyReview;
  if (review?.taskId === taskId) return reviewMission(review);
  const lesson = activeLessons(childId, store.mastery).find((item) => `course:${item.subject}:${item.id}` === taskId);
  if (lesson) return courseTask(lesson);
  const chapter = chapters().find((item) => `chapter:${item.id}` === taskId);
  if (chapter) return chapterMission(chapter);
  const activity = MISSION_ACTIVITIES.find((item) => item.id === taskId);
  return activity ? effectiveMission(activity) : undefined;
}

function reviewMission(assignment: DailyReviewAssignment): Mission { return effectiveMission({ id: assignment.taskId, category: 'review', categoryLabel: CATEGORY_LABELS.review, title: `${assignment.reviewDay === 0 ? '短巩固' : '复习'} · ${assignment.title}`, brief: assignment.focus, actionLabel: '开始复习', icon: '🧠', reward: 8, route: `/review?entry=${encodeURIComponent(assignment.entryId)}&day=${assignment.reviewDay}`, kind: 'core' }); }
function parentMission(task: CustomTask): Mission { return { id: `parent:${task.id}:${localDayKey()}`, category: 'parent', categoryLabel: CATEGORY_LABELS.parent, title: task.text, brief: task.judge === 'parent' ? '做完后告诉家长，确认后领取奖励。' : '完成后可以直接领取奖励。', actionLabel: '我完成了', icon: '🤝', reward: task.points, route: '/', kind: 'core' }; }
function eventAvailable(task: Mission, now: Date) { if (task.category !== 'event') return true; const key = localDayKey(now); return key >= '2026-10-01' && key <= '2026-10-07'; }

export function deliveredMission(childId: string, now = new Date()): Mission | undefined {
  initializeTaskSystem(childId);
  ensureCourseMails(childId, now);
  const store = useStore.getState(); const state = taskState(childId); const day = localDayKey(now);
  const scheduled = courseMailBuckets(childId, now).current[0];
  if (scheduled) return scheduled.mission;
  if (state.pausedTaskId && state.dismissedOn[state.pausedTaskId] !== day && !isComplete(childId, state.pausedTaskId)) { const paused = missionById(childId, state.pausedTaskId); if (paused) return { ...paused, actionLabel: '继续完成' }; }
  const parent = (store.customTasks[childId] ?? []).find((task) => customTaskDueToday(task, now) && !task.doneDays.includes(day) && !task.pendingDays.includes(day) && state.dismissedOn[`parent:${task.id}:${day}`] !== day);
  if (parent) return parentMission(parent);
  const review = state.dailyReview?.day === day ? state.dailyReview : undefined;
  if (review && !isComplete(childId, review.taskId) && state.dismissedOn[review.taskId] !== day) return reviewMission(review);
  const learnedLessonKeys = Object.keys(state.lessonCompletedAt ?? {});
  const preferred = state.preferredSubject ?? learnedLessonKeys[learnedLessonKeys.length - 1]?.split(':')[0] as ActiveSubject | undefined;
  const completedCourses = preferred ? Object.keys(state.lessonCompletedAt ?? {}).filter((id) => id.startsWith(`${preferred}:`)).length : 0;
  const shown = state.visitorDay === day ? state.visitorShown : [];
  if (completedCourses > 0 && (state.quietUntil ?? 0) < now.getTime() && shown.length < 2) {
    const rawVisitor = MISSION_ACTIVITIES.find((task) => (task.subject === preferred || task.category === 'event') && eventAvailable(task, now) && !isComplete(childId, task.id) && state.dismissedOn[task.id] !== day && effectiveMission(task).enabled !== false);
    if (rawVisitor) return effectiveMission(rawVisitor);
  }
  return undefined;
}

export function acceptedMissions(childId: string): Mission[] { const state = taskState(childId); return state.pausedTaskId ? [missionById(childId, state.pausedTaskId)].filter((task): task is Mission => Boolean(task)) : []; }
export function recentMissionCompletions(childId: string) { const state = taskState(childId); return Object.entries(state.completed).sort((a, b) => b[1].completedAt - a[1].completedAt).slice(0, 30).map(([taskId, completion]) => ({ taskId, completion, mission: missionById(childId, taskId) })); }
