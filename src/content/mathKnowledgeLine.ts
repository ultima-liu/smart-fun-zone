/** 数线知识桥：每个任务明确起点、动作与完成条件。 */
export type MathKnowledgeLineTask = { instruction: string; path: number[]; feedback: string };
export type MathKnowledgeLineActivity = {
  title: string;
  scene: 'walk' | 'queue';
  values: number[];
  tasks: MathKnowledgeLineTask[];
};

export function mathKnowledgeLineActivity(
  lessonId: string,
  values: number[],
): MathKnowledgeLineActivity {
  if (lessonId === 'order-twenty')
    return {
      title: '帮小熊比较两条路',
      scene: 'walk',
      values: Array.from({ length: 11 }, (_, i) => 10 + i),
      tasks: [
        {
          instruction: '小熊在 12 号地砖。先点 12，再一格一格往左点到 10，数一数走了几步。',
          path: [12, 11, 10],
          feedback: '12 到 10 走了 2 步。',
        },
        {
          instruction: '小熊回到 12。先点 12，再一格一格往右点到 20，比较两条路。',
          path: [12, 13, 14, 15, 16, 17, 18, 19, 20],
          feedback: '12 到 20 走了 8 步；到 10 只要 2 步，所以 10 更近。',
        },
      ],
    };
  if (lessonId === 'ordinal')
    return {
      title: '换一边数，找同一个小朋友',
      scene: 'queue',
      values,
      tasks: [
        {
          instruction: '从左边开始，一个一个点小朋友，点到第 2 位就停。',
          path: [1, 2],
          feedback: '从左数第 2 位的小朋友找到了。',
        },
        {
          instruction: '现在换到右边，一个一个往左点，点到第 4 位。看看是不是刚才的小朋友。',
          path: [5, 4, 3, 2],
          feedback: '是同一个小朋友！从左数第 2 位，从右数第 4 位，队伍还是 5 人。',
        },
      ],
    };
  if (lessonId === 'between-positions')
    return {
      title: '只数两端之间的小朋友',
      scene: 'queue',
      values,
      tasks: [
        {
          instruction: '先点 3 号，再点 7 号，标出队伍的两端。两端不算在“之间”。',
          path: [3, 7],
          feedback: '两端已经标好，接下来只数中间的人。',
        },
        {
          instruction: '从左往右点 3 号和 7 号之间的小朋友。不要点两端。',
          path: [4, 5, 6],
          feedback: '中间是 4、5、6 号，共 3 人；两端的 3 号和 7 号不算。',
        },
      ],
    };
  const task: MathKnowledgeLineTask =
    lessonId === 'zero'
      ? {
          instruction: '先点 0 米起跑线，再一格一格往右点到 4 米，看看从哪里出发。',
          path: [0, 1, 2, 3, 4],
          feedback: '从 0 米出发走了 4 步。0 标出了起点，赛道还在。',
        }
      : lessonId === 'six-to-nine'
        ? {
            instruction: '先点 5，记住已有 5 颗珠。每往右点一格就添 1 颗，添到 8 颗就停。',
            path: [5, 6, 7, 8],
            feedback: '从 5 接着数 6、7、8，添了 3 颗就是 8 颗。',
          }
        : lessonId === 'compare-order-nine'
          ? {
              instruction: '先点 6，再一格一格往右点到 9。每往右一格，表示的数量就多 1。',
              path: [6, 7, 8, 9],
              feedback: '6、7、8、9 依次多 1；9 比 6 多 3，和字写得大不大无关。',
            }
          : lessonId === 'review-numbers'
            ? {
                instruction: '先点 15，再一格一格往右点到 18，数一数 18 比 15 大多少。',
                path: [15, 16, 17, 18],
                feedback: '从 15 到 18 走了 3 步，所以 18 比 15 大 3。',
              }
            : {
                instruction: `先点 ${values[0]}，再按从小到大的顺序点到 ${values[values.length - 1]}。`,
                path: values,
                feedback: '从起点按顺序走到了终点。',
              };
  return {
    title:
      lessonId === 'zero'
        ? '从起跑线出发'
        : lessonId === 'six-to-nine'
          ? '接着添珠子'
          : '一步一步比较数量',
    scene: 'walk',
    values,
    tasks: [task],
  };
}

export function mathKnowledgeLineState(
  activity: MathKnowledgeLineActivity,
  selected: number[],
  done: boolean,
) {
  const fullPath = activity.tasks.flatMap((task) => task.path);
  const history = done ? fullPath : selected;
  let taskIndex = 0,
    offset = 0;
  while (
    taskIndex < activity.tasks.length - 1 &&
    history.length >= offset + activity.tasks[taskIndex].path.length
  ) {
    offset += activity.tasks[taskIndex].path.length;
    taskIndex++;
  }
  return { fullPath, taskIndex, task: activity.tasks[taskIndex], path: history.slice(offset) };
}
