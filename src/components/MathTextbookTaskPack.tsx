import { createContext, useContext, useEffect, useState } from 'react';
import { useStore } from '../store';
import { speakOnce } from '../speech';
import { MATH_LESSON_TASKS } from '../content/mathUpperCurriculum';
import { SolidShapeGlyph, type SolidShapeKind } from './SolidShapeGlyph';
import VoiceField from './VoiceField';

type TaskPackProps = {
  lessonId: string;
  onDone: () => void;
  onCoach: (text: string) => void;
};

/** 教材任务的中文序号，与任务牌、分区标题和任务包的编号保持同一格式。 */
export const ACTION_TASK_NUMERALS = ['一', '二', '三', '四', '五'];

/** 教材任务二（“做一做”/专属学具任务）的标题，任务牌、分区标题和讲解词共用这一份。 */
export const textbookTaskTitle = (lessonId: string): string =>
  MATH_LESSON_TASKS[lessonId]?.tasks[1]?.title ?? '完成“做一做”任务卡';

/** 动手试里的一个教材任务分区：带编号的标题栏让每个任务的边界一目了然。 */
export function ActionStation({ index, title, brief, children }: { index: number; title: string; brief?: string; children: React.ReactNode }) {
  return (
    <section className="mt-action-station" aria-label={`教材任务${ACTION_TASK_NUMERALS[index]}：${title}`}>
      <header><i aria-hidden="true">{index + 1}</i><b>教材任务{ACTION_TASK_NUMERALS[index]}：</b><span>{title}</span></header>
      {brief && <p className="mt-action-station-brief">{brief}</p>}
      {children}
    </section>
  );
}

type TaskSnapshot = Record<string, unknown>;
type TaskProgressContextValue = {
  snapshot: TaskSnapshot;
  setTask: <T,>(taskId: string, value: T | ((previous: T) => T)) => void;
};

const TaskProgressContext = createContext<TaskProgressContextValue | null>(null);

const readTaskSnapshot = (storageKey: string): TaskSnapshot => {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
    return value && typeof value === 'object' ? value as TaskSnapshot : {};
  } catch { return {}; }
};

/**
 * 每课共享一个任务过程快照。第一任务站、教材练习和专属学具写入同一份记录，
 * 因而离开再进入时不会只恢复其中一半操作。
 */
export function MathLessonTaskProgressProvider({ lessonId, children }: { lessonId: string; children: React.ReactNode }) {
  const activeChildId = useStore((state) => state.activeChildId);
  const storageKey = `sfz-math-task-v1:${activeChildId ?? 'guest'}:${lessonId}`;
  return <TaskProgressStorage key={storageKey} storageKey={storageKey}>{children}</TaskProgressStorage>;
}

function TaskProgressStorage({ storageKey, children }: { storageKey: string; children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<TaskSnapshot>(() => readTaskSnapshot(storageKey));
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(snapshot)); } catch { /* 私密模式下仍可正常上课 */ }
  }, [snapshot, storageKey]);
  const setTask: TaskProgressContextValue['setTask'] = (taskId, value) => {
    setSnapshot((current) => {
      const previous = current[taskId];
      const next = typeof value === 'function'
        ? (value as (prior: unknown) => unknown)(previous)
        : value;
      return { ...current, [taskId]: next };
    });
  };
  return <TaskProgressContext.Provider value={{ snapshot, setTask }}>{children}</TaskProgressContext.Provider>;
}

export function useMathLessonTaskProgress<T>(taskId: string, initial: T): [T, (value: T | ((previous: T) => T)) => void] {
  const context = useContext(TaskProgressContext);
  if (!context) throw new Error('教材任务必须在 TaskProgressProvider 中使用');
  const value = (context.snapshot[taskId] as T | undefined) ?? initial;
  // 第一次函数式更新时，存储里还没有该任务键；必须把 initial 作为前值，
  // 不能把 undefined 交给 `value + 1`、数组展开或对象展开。
  const setValue = (next: T | ((previous: T) => T)) => context.setTask<T>(taskId, (previous) => {
    const base = (previous as T | undefined) ?? initial;
    return typeof next === 'function' ? (next as (prior: T) => T)(base) : next;
  });
  return [value, setValue];
}

const usePersistedTask = useMathLessonTaskProgress;

type Problem = { whole: number; changed: number; operator: '+' | '-'; answer: number; wholeLabel: string; changedLabel: string; distractor: string };
type CheckStep = { prompt: string; options: string[]; answer: string; coach: string };
type EquationStep = { scene: string; equation: string; options: string[]; answer: string; coach: string };

/**
 * 完成不是把题目收走。连续任务结束后保留题干、关键材料和孩子答对的答案，
 * 既能回看刚才解决了什么，也让重新进入课程时不会只看到一句“已完成”。
 */
function CompletedTaskReview({
  kicker,
  title,
  records,
  summary,
  className = '',
}: {
  kicker: string;
  title: string;
  records: Array<{ prompt: string; answer: string; visual?: string }>;
  summary: string;
  className?: string;
}) {
  return <section className={`mt-textbook-task mt-completed-task-review ${className}`} aria-label={title}>
    <header><small>{kicker}</small><h3>✓ {title}</h3></header>
    <p className="mt-completed-task-intro">题目和你的作答保留在这里，可以回看、讲给同伴听，或重新核对。</p>
    <div className="mt-completed-task-records">{records.map((record, index) => <article key={`${record.prompt}-${index}`}>
      <b>任务 {index + 1}</b><h4>{record.prompt}</h4>
      {record.visual && <div className="mt-completed-task-visual">{record.visual}</div>}
      <p>✓ 我的答案：<strong>{record.answer}</strong></p>
    </article>)}</div>
    <p className="mt-feedback good">{summary}</p>
  </section>;
}

const PLACE_VALUE_TARGETS: Record<string, { tens: number; ones: number; page: string; label: string }> = {
  'ten-again': { tens: 1, ones: 0, page: 'P73-P75', label: '把 10 支铅笔收进 1 个笔筒' },
  'eleven-twenty': { tens: 1, ones: 5, page: 'P76-P77', label: '摆出 1 筒和 5 支铅笔，也就是 15' },
  'simple-addsub-twenty': { tens: 1, ones: 3, page: 'P81', label: '摆出 13：1 筒和 3 支铅笔' },
  'unit4-review': { tens: 1, ones: 8, page: 'P85-P87', label: '摆出 18：1 筒和 8 支铅笔' },
};

const MAKE_TEN_TARGETS: Record<string, { first: number; second: number; page: string; label: string }> = {
  'plus-nine': { first: 9, second: 4, page: 'P88-P90', label: '从 4 个里取 1 个给 9，先凑成 10' },
  'plus-eight-seven-six': { first: 8, second: 5, page: 'P91', label: '从 5 个里取 2 个给 8，先凑成 10' },
  'plus-eight-nine-strategies': { first: 8, second: 9, page: 'P92', label: '从 9 个里取 2 个给 8，先凑成 10' },
  'unit5-review': { first: 7, second: 8, page: 'P99-P102', label: '从 8 个里取 3 个给 7，先凑成 10' },
};

const PROBLEMS: Record<string, Problem> = {
  'solve-total-within-7': { whole: 4, changed: 2, operator: '+', answer: 6, wholeLabel: '左边 4 只', changedLabel: '右边 2 只', distractor: '树上 5 只' },
  'solve-remain-within-7': { whole: 7, changed: 2, operator: '-', answer: 5, wholeLabel: '一共 7 只', changedLabel: '跳走 2 只', distractor: '树旁 4 朵花' },
  'select-info-eight-nine': { whole: 9, changed: 3, operator: '-', answer: 6, wholeLabel: '一共有 9 只鹿', changedLabel: '跑走 3 只鹿', distractor: '树根处有 6 朵蘑菇' },
  'solve-total': { whole: 5, changed: 10, operator: '+', answer: 15, wholeLabel: '男生 5 人', changedLabel: '女生 10 人', distractor: '前排 7 人' },
  'find-original': { whole: 6, changed: 5, operator: '+', answer: 11, wholeLabel: '领走 6 个', changedLabel: '剩下 5 个', distractor: '旁边有 3 个篮子' },
  'review-relations': { whole: 12, changed: 5, operator: '-', answer: 7, wholeLabel: '原来 12 个', changedLabel: '走了 5 个', distractor: '桌上有 3 支笔' },
  'review-application': { whole: 8, changed: 5, operator: '+', answer: 13, wholeLabel: '吃掉 8 条鱼', changedLabel: '还剩 5 条鱼', distractor: '水里有 2 片叶子' },
};

const PROBLEM_EXTENSIONS: Record<string, CheckStep[]> = {
  'solve-total-within-7': [
    { prompt: '花坛左边有 3 朵、右边有 4 朵。问题“共有几朵”要圈哪两条信息？', options: ['左边 3 朵和右边 4 朵', '树上 5 只鸟和右边 4 朵', '只圈左边 3 朵'], answer: '左边 3 朵和右边 4 朵', coach: '求总数要找两个部分。' },
    { prompt: '3 朵和 4 朵一共有几朵？', options: ['3＋4＝7', '7－3＝4', '4－3＝1'], answer: '3＋4＝7', coach: '用加法把两个部分合起来。' },
  ],
  'solve-remain-within-7': [
    { prompt: '树上原有 6 只鸟，飞走 2 只。“还剩”要用哪两条信息？', options: ['原有 6 只和飞走 2 只', '树旁 4 朵花和飞走 2 只', '只看树旁花'], answer: '原有 6 只和飞走 2 只', coach: '求剩余要找整体和去掉的部分。' },
    { prompt: '6－2＝4，怎样检查？', options: ['4＋2＝6', '6＋2＝4', '4－2＝6'], answer: '4＋2＝6', coach: '剩下的和飞走的合起来，应回到原来数量。' },
  ],
  'select-info-eight-nine': [
    { prompt: '图中有 9 只鹿、跑走 3 只、树根处有 6 朵蘑菇。求还剩几只鹿，哪条信息不用选？', options: ['6 朵蘑菇', '9 只鹿', '跑走 3 只鹿'], answer: '6 朵蘑菇', coach: '蘑菇的数量不影响“还剩几只鹿”。' },
    { prompt: '图中还有 8 只天鹅和 6 朵蘑菇，天鹅比蘑菇多多少？', options: ['8－6＝2', '8＋6＝14', '6－2＝4'], answer: '8－6＝2', coach: '比较“多多少”用较多的 8 减较少的 6。' },
  ],
  'solve-total': [
    { prompt: '同一队列的前排有 7 人、后排有 8 人，求一共有多少人要选哪两部分？', options: ['前排 7 人和后排 8 人', '只选前排 7 人', '只数举红花的人'], answer: '前排 7 人和后排 8 人', coach: '同一群人按前后分组，仍把两个部分合起来。' },
    { prompt: '7＋8＝？', options: ['14', '15', '16'], answer: '15', coach: '男生女生、前后排是同一群人的两种分法，都得到 15。' },
  ],
  'find-original': [
    { prompt: '草莓吃了 8 个，还剩 5 个，求原来有多少，选哪两个部分？', options: ['吃了 8 和剩 5', '只看剩 5', '篮子 2 个'], answer: '吃了 8 和剩 5', coach: '原来整体由吃掉和剩下两部分组成。' },
    { prompt: '8＋5＝？', options: ['12', '13', '14'], answer: '13', coach: '把两部分合起来就回到原来数量。' },
  ],
  'review-relations': [
    { prompt: '12 本书借走 5 本，还剩多少本？', options: ['12－5＝7', '12＋5＝17', '7－5＝2'], answer: '12－5＝7', coach: '从原来总数中去掉借走的部分。' },
    { prompt: '吃掉 6 个、还剩 7 个，求原来有多少要用？', options: ['6＋7＝13', '7－6＝1', '13－7＝6'], answer: '6＋7＝13', coach: '求原来，把已经吃掉和剩下的两部分合起来。' },
  ],
  'review-application': [
    { prompt: '数表里从 8 向右走 2 格，出口数字是？', options: ['9', '10', '11'], answer: '10', coach: '每向右一格加 1。' },
    { prompt: '加法表中哪道算式的得数是 10？', options: ['6＋4', '6＋3', '5＋4'], answer: '6＋4', coach: '两个加数合起来正好是 10。' },
    { prompt: '看图自编题前，首先要做什么？', options: ['确认图中的数量和关系', '只挑最大的数', '随意写一个算式'], answer: '确认图中的数量和关系', coach: '先读清信息，问题和算式才有依据。' },
  ],
};

const UNIT34_PRACTICE: Record<string, CheckStep[]> = {
  'solid-shapes': [
    { prompt: '“我说你拿”：请找出能滚动但不能向各个方向滚的图形。', options: ['圆柱', '球', '正方体'], answer: '圆柱', coach: '圆柱有曲面会滚，也有平面能停住。' },
    { prompt: '“我说你猜”：骰子最接近哪种立体图形？', options: ['正方体', '长方体', '球'], answer: '正方体', coach: '骰子的六个面一样大。' },
  ],
  'order-twenty': [
    { prompt: '14 的前一个和后一个数是？', options: ['13 和 15', '12 和 16', '14 和 15'], answer: '13 和 15', coach: '数线相邻的两个数各差 1。' },
    { prompt: '1 个十和 4 个一写作？', options: ['14', '41', '104'], answer: '14', coach: '十位写 1，个位写 4。' },
  ],
  'between-positions': [
    { prompt: '第 6 人和第 10 人之间有几人？', options: ['3 人', '4 人', '5 人'], answer: '3 人', coach: '只数第 7、8、9 人，两端不计入。' },
    { prompt: '画间隔问题时，先标出什么？', options: ['两个端点位置', '所有人的颜色', '最大的数字'], answer: '两个端点位置', coach: '先定两端，再数中间对象。' },
  ],
  'solid-building': [
    { prompt: '搭高塔前，哪种积木更适合做稳定底座？', options: ['平放的长方体', '球', '竖着滚动的圆柱'], answer: '平放的长方体', coach: '平面朝下、支撑宽的底座更稳定。' },
    { prompt: '所有积木都用上后，怎样检查搭法？', options: ['轻推并观察是否稳定', '只看颜色', '立刻拆掉'], answer: '轻推并观察是否稳定', coach: '轻推能检验底座和连接是否稳。' },
  ],
  'solid-compose': [
    { prompt: '4 个小正方体排成一行，能拼成什么？', options: ['长方体', '球', '圆柱'], answer: '长方体', coach: '小正方体贴紧排成一行，组成一个长方体。' },
    { prompt: '把同一拼法转一转，为什么仍只算一种？', options: ['连接关系没有变', '方块变多了', '颜色变了'], answer: '连接关系没有变', coach: '转动不会改变小方块之间怎样连接。' },
  ],
  'ten-again': [
    { prompt: '10 里面的 1 和 0 分别表示什么？', options: ['1 个十和 0 个一', '1 个一和 0 个十', '10 个十'], answer: '1 个十和 0 个一', coach: '十位的 1 表示一捆十根，个位没有散棒。' },
    { prompt: '圈出 10 个后还有 3 个，合起来写作？', options: ['13', '103', '31'], answer: '13', coach: '1 个十和 3 个一是 13。' },
  ],
  'eleven-twenty': [
    { prompt: '1 个十和 8 个一是？', options: ['18', '81', '108'], answer: '18', coach: '十位写 1，个位写 8。' },
    { prompt: '20 由什么组成？', options: ['2 个十', '2 个一', '1 个十和 10 个一'], answer: '2 个十', coach: '20 有两捆十根小棒。' },
  ],
  'simple-addsub-twenty': [
    { prompt: '13－10＝？', options: ['3', '10', '13'], answer: '3', coach: '去掉 1 个十，留下 3 个一。' },
    { prompt: '12＋3＝？', options: ['14', '15', '16'], answer: '15', coach: '12 是 1 个十和 2 个一，再添 3 个一是 15。' },
  ],
  'unit4-review': [
    { prompt: '先估后数：一捆十根和 6 根散棒一共有？', options: ['6', '10', '16'], answer: '16', coach: '先看 1 个十，再接着数 6 个一。' },
    { prompt: '得数是偶数的算式是？', options: ['7＋2', '8＋2', '9＋2'], answer: '8＋2', coach: '8＋2＝10，能两两配对的数是偶数。' },
  ],
};

const UNIT5_PRACTICE: Record<string, CheckStep[]> = {
  'plus-nine': [
    { prompt: '9＋6：从 6 里先拿几给 9 凑十？', options: ['1', '2', '3'], answer: '1', coach: '9 还差 1，先凑成 10。' },
    { prompt: '9＋6＝10＋？＝？', options: ['5，15', '6，16', '4，14'], answer: '5，15', coach: '剩下 5，10 加 5 得 15。' },
  ],
  'plus-eight-seven-six': [
    { prompt: '7＋6：先从 6 里分几给 7？', options: ['2', '3', '4'], answer: '3', coach: '7 还差 3 凑成 10。' },
    { prompt: '6＋8＝？', options: ['13', '14', '15'], answer: '14', coach: '8 先凑十，再加剩下的 4。' },
  ],
  'plus-eight-nine-strategies': [
    { prompt: '8＋9 选择“给 9 凑十”时，从 8 里拿？', options: ['1', '2', '3'], answer: '1', coach: '9 只差 1；余下 7。' },
    { prompt: '两条凑十路线的结果都是？', options: ['16', '17', '18'], answer: '17', coach: '拆分不同，总数不变。' },
  ],
  'plus-five-four-three-two': [
    { prompt: '5＋8 交换后变成？', options: ['8＋5', '8－5', '5＋5'], answer: '8＋5', coach: '交换两个加数，和不变。' },
    { prompt: '体育器材表：一班 7 个、二班 6 个，一共？', options: ['12', '13', '14'], answer: '13', coach: '把两班数量合起来。' },
  ],
  'addition-table': [
    { prompt: '加法表中和是 14 的算式是？', options: ['8＋6', '8＋5', '9＋4'], answer: '8＋6', coach: '按得数找算式卡。' },
    { prompt: '一列中第一个加数加 1，和通常？', options: ['加 1', '减 1', '不变'], answer: '加 1', coach: '另一个加数不变时，和也跟着加 1。' },
  ],
  'unit5-review': [
    { prompt: '7＋8，用凑十法先算？', options: ['7＋3＝10', '7＋1＝8', '8＋8＝16'], answer: '7＋3＝10', coach: '从 8 分出 3 给 7。' },
    { prompt: '领走 6 个、剩 7 个，原来有？', options: ['1', '12', '13'], answer: '13', coach: '求原来整体，把领走和剩下合起来。' },
  ],
};

const UNIT6_PRACTICE: Record<string, CheckStep[]> = {
  'review-numbers': [
    { prompt: '数表路径：从 8 向右走 2 格到？', options: ['9', '10', '11'], answer: '10', coach: '每向右一格加 1。' },
    { prompt: '18 由什么组成？', options: ['1 个十和 8 个一', '8 个十和 1 个一', '18 个十'], answer: '1 个十和 8 个一', coach: '先看十位，再看个位。' },
  ],
  'review-shapes': [
    { prompt: '4 个小正方体拼成长方体，必须满足什么？', options: ['方块彼此贴紧', '散开放着', '只看颜色'], answer: '方块彼此贴紧', coach: '拼搭要有相连的面。' },
    { prompt: '拼 2×2×2 大正方体至少需要？', options: ['4', '6', '8'], answer: '8', coach: '每层 4 个，共两层。' },
  ],
  'review-application': [
    { prompt: '加法表中 6＋4 的和是？', options: ['9', '10', '11'], answer: '10', coach: '找到 6 和 4 相交的位置。' },
    { prompt: '开放提问前，先要做什么？', options: ['看清图中信息和数量关系', '随便写数字', '只选最大数'], answer: '看清图中信息和数量关系', coach: '问题必须建立在图中已有信息上。' },
  ],
};

const GENERIC_CHECKS: Record<string, { prompt: string; options: string[]; answer: string }> = {
  campus: { prompt: '数校园里的楼层时，第一步应该做什么？', options: ['确定要数的教学楼和起点', '只数最高的窗户', '从中间随便开始'], answer: '确定要数的教学楼和起点' },
  numbers: { prompt: '4 个物体、4 个点子和数字 4 共同表示什么？', options: ['同一个数量', '三种不同数量', '物体的颜色'], answer: '同一个数量' },
  compare: { prompt: '3 只小猴和 3 个桃子一一配对后都没有剩余，说明什么？', options: ['同样多', '小猴更多', '桃子更多'], answer: '同样多' },
  ordinal: { prompt: '说“第 2 个”以前，必须先说清什么？', options: ['从哪边开始数', '谁最高', '一共有几种颜色'], answer: '从哪边开始数' },
  compose: { prompt: '5 分成 2 和 3 后，把两部分合起来是多少？', options: ['5', '4', '6'], answer: '5' },
  playground: { prompt: '双脚跳进○、单脚跳进△。下一个图形规则应先看什么？', options: ['前一个图形和动作规则', '谁跳得最高', '颜色最深的图形'], answer: '前一个图形和动作规则' },
  'classroom-discover': { prompt: '要让同学找到你的座位，描述位置时还要说什么？', options: ['参照物和方向', '只说颜色', '只说“在那里”'], answer: '参照物和方向' },
  'classroom-games': { prompt: '“摸左耳”时，最先要听清什么？', options: ['动作对象和方向', '谁声音最大', '动作做多快'], answer: '动作对象和方向' },
  'learning-readiness': { prompt: '8:30 在上课提示中表示什么？', options: ['时间', '人数', '页码'], answer: '时间' },
  'add-within-5': { prompt: '3 个和 2 个合起来，应该用哪个算式表示？', options: ['3＋2＝5', '5－3＝2', '3－2＝1'], answer: '3＋2＝5' },
  'subtract-within-5': { prompt: '5 个苹果吃掉 2 个，应该用哪个算式表示？', options: ['5－2＝3', '5＋2＝7', '2－5＝3'], answer: '5－2＝3' },
  zero: { prompt: '5－5 的结果为什么是 0？', options: ['全部拿走后一个也没有', '因为 5 不能减', '因为数字变小了'], answer: '全部拿走后一个也没有' },
  'unit1-review': { prompt: '2 和 3 组成 5，哪道减法可以检查？', options: ['5－2＝3', '2－3＝5', '5＋2＝3'], answer: '5－2＝3' },
  'six-to-nine': { prompt: '5 再添 3 是几？', options: ['8', '7', '9'], answer: '8' },
  'compare-order-nine': { prompt: '从左数第 7 个说的是？', options: ['位置', '总数', '颜色'], answer: '位置' },
  'compose-six-nine': { prompt: '把 8 分成两组，已找到 1 和 7、2 和 6，下一组可以是？', options: ['3 和 5', '1 和 8', '4 和 5'], answer: '3 和 5' },
  'addsub-six-seven': { prompt: '2 和 5 组成 7，求另一部分应列？', options: ['7－2＝5', '2＋7＝5', '5－7＝2'], answer: '7－2＝5' },
  'addsub-eight-nine': { prompt: '9 可以分成 4 和几？', options: ['5', '4', '6'], answer: '5' },
  ten: { prompt: '10 可以分成 6 和几？', options: ['4', '3', '5'], answer: '4' },
  'addsub-ten': { prompt: '10－7 可以想成哪两个数组成 10？', options: ['7 和 3', '7 和 2', '7 和 4'], answer: '7 和 3' },
  'continuous-add-sub': { prompt: '5＋2＋1 中，第一步得到几？', options: ['7', '6', '8'], answer: '7' },
  'mixed-add-sub': { prompt: '4＋3－2 中，要先做哪一步？', options: ['4＋3', '3－2', '4－2'], answer: '4＋3' },
  'unit2-review': { prompt: '8－3＝5，怎样检查？', options: ['3＋5＝8', '8＋3＝5', '5－3＝8'], answer: '3＋5＝8' },
  'solid-shapes': { prompt: '哪种图形能向四面八方滚动？', options: ['球', '长方体', '正方体'], answer: '球' },
  'solid-building': { prompt: '搭高塔时，底座优先选择什么？', options: ['平平且支撑宽的积木', '圆圆的球', '最小的积木'], answer: '平平且支撑宽的积木' },
  'order-twenty': { prompt: '14 的后一个数是？', options: ['15', '13', '16'], answer: '15' },
  'between-positions': { prompt: '第 4 人和第 8 人之间有几人？', options: ['3 人', '4 人', '5 人'], answer: '3 人' },
  'plus-five-four-three-two': { prompt: '5＋8 可以先看成哪道熟悉的算式？', options: ['8＋5', '8－5', '5＋5'], answer: '8＋5' },
  'addition-table': { prompt: '哪道算式的和是 13？', options: ['8＋5', '8＋4', '9＋5'], answer: '8＋5' },
  'review-numbers': { prompt: '18 由什么组成？', options: ['1 个十和 8 个一', '8 个十和 1 个一', '18 个十'], answer: '1 个十和 8 个一' },
  'review-shapes': { prompt: '圆柱横放和竖放，图形类别会变吗？', options: ['不会，仍是圆柱', '会变成球', '会变成长方体'], answer: '不会，仍是圆柱' },
};

const UNIT1_EQUATION_STEPS: Record<string, EquationStep[]> = {
  'add-within-5': [
    { scene: '果果有 3 个苹果，又摘 1 个，和花花同样多。', equation: '3 ＋ 1 ＝ ?', options: ['3＋1＝4', '3－1＝2', '4－1＝3'], answer: '3＋1＝4', coach: '“又摘”表示数量合起来，用加法。' },
    { scene: '先有 3 只小鸟，又飞来 2 只。', equation: '3 ＋ 2 ＝ ?', options: ['3＋2＝5', '3＋2＝4', '5－2＝3'], answer: '3＋2＝5', coach: '从 3 接着数 4、5，也可以想 3 和 2 合成 5。' },
    { scene: '用 2 个和 2 个方块摆一摆。', equation: '2 ＋ 2 ＝ ?', options: ['2＋2＝4', '2＋2＝3', '4－2＝1'], answer: '2＋2＝4', coach: '两部分合起来就是整体。' },
  ],
  'subtract-within-5': [
    { scene: '果果有 4 根，吃掉 1 根后和花花同样多。', equation: '4 － 1 ＝ ?', options: ['4－1＝3', '4＋1＝5', '3－1＝2'], answer: '4－1＝3', coach: '“吃掉”表示从原来数量里去掉一部分。' },
    { scene: '5 只小鸟飞走 3 只。', equation: '5 － 3 ＝ ?', options: ['5－3＝2', '5－3＝3', '5＋3＝8'], answer: '5－3＝2', coach: '从 5 倒着数 5、4、3，剩下 2；也可用 2 和 3 组成 5。' },
    { scene: '4 个圆片拿走 2 个，请画一画再填。', equation: '4 － 2 ＝ ?', options: ['4－2＝2', '4－2＝3', '2＋2＝5'], answer: '4－2＝2', coach: '画掉两个后，数留下的圆片。' },
  ],
  'unit1-review': [
    { scene: '遮住了排队中的一个位置：从左数第 4 个前面有几人？', equation: '第 4 个前面有？人', options: ['3 人', '4 人', '5 人'], answer: '3 人', coach: '第 1 个就在最前面，所以第 4 个前面有 3 人。' },
    { scene: '把 5 分成两部分，已知一部分是 2。', equation: '5 可以分成 2 和 ?', options: ['3', '2', '4'], answer: '3', coach: '2 和 3 合起来正好是 5。' },
    { scene: '两组图一个对一个配完，左边还多出 1 个。', equation: '应该填什么符号？', options: ['＞', '＜', '＝'], answer: '＞', coach: '有剩余的一边更多；大口朝向更多的一边。' },
    { scene: '看算式讲故事：1 个和 4 个合起来。', equation: '1 ＋ 4 ＝ ?', options: ['1＋4＝5', '1－4＝3', '5－4＝2'], answer: '1＋4＝5', coach: '讲故事时要让“合起来”对应加法。' },
    { scene: '看数量变化：原来有 5 个，拿走 2 个。', equation: '5 － 2 ＝ ?', options: ['5－2＝3', '5＋2＝7', '3－2＝1'], answer: '5－2＝3', coach: '“拿走”用减法；剩下的 3 和拿走的 2 合起来又是 5。' },
    { scene: '果果又摘 2 个，花花又摘 1 个后同样多。', equation: '数量变化后要先做什么？', options: ['画出前后数量再列式', '只看谁的名字长', '立刻猜一个数'], answer: '画出前后数量再列式', coach: '画图能让数量变化看得清楚。' },
    { scene: '0、1、2、3、4、5 排在一起。', equation: '5－5＝?', options: ['0', '5', '10'], answer: '0', coach: '相同数相减，全部拿走后一个也没有。' },
  ],
};

/** 第二单元练习页：每课保留数写、补式、规律或表达的连续题，而不再折叠成一题。 */
const UNIT2_PRACTICE: Record<string, CheckStep[]> = {
  'six-to-nine': [
    { prompt: '●●●●●●● 应该写成哪个数字？', options: ['6', '7', '8'], answer: '7', coach: '逐个点数，7 个就用数字 7 表示。' },
    { prompt: '从 6 接着数两个数，最后是？', options: ['7', '8', '9'], answer: '8', coach: '6、7、8，按顺序接着数。' },
  ],
  'compare-order-nine': [
    { prompt: '8 ○ 9，应填？', options: ['＜', '＞', '＝'], answer: '＜', coach: '数线右边的 9 比 8 大。' },
    { prompt: '从右数第 2 个，先要做什么？', options: ['确定右边为起点', '只数总数', '看颜色'], answer: '确定右边为起点', coach: '第几个必须先说明方向。' },
  ],
  'compose-six-nine': [
    { prompt: '6 可以分成 1 和几？', options: ['4', '5', '6'], answer: '5', coach: '1 和 5 合起来是 6。' },
    { prompt: '8 的分法中，3 的另一部分是？', options: ['4', '5', '6'], answer: '5', coach: '按顺序找另一部分，3 和 5 组成 8。' },
  ],
  'addsub-six-seven': [
    { prompt: '6 的两部分是 4 和 2，一道减法是？', options: ['6－4＝2', '4－2＝6', '6＋4＝2'], answer: '6－4＝2', coach: '整体减去一个部分，得到另一个部分。' },
    { prompt: '3＋3＝6 对应的减法是？', options: ['6－3＝3', '3－3＝6', '6－6＝3'], answer: '6－3＝3', coach: '两部分相同时，两道减法写法相同。' },
  ],
  'addsub-eight-nine': [
    { prompt: '9 的两部分是 4 和 5，补全：9－4＝？', options: ['4', '5', '9'], answer: '5', coach: '整体 9 去掉 4，剩下 5。' },
    { prompt: '哪两个数能组成 8？', options: ['3 和 5', '3 和 4', '2 和 5'], answer: '3 和 5', coach: '3 和 5 合起来正好是 8。' },
  ],
  ten: [
    { prompt: '10 可以分成 7 和几？', options: ['2', '3', '4'], answer: '3', coach: '7 和 3 合起来是 10。' },
    { prompt: '“我出 8，你出几”才能凑成 10？', options: ['1', '2', '3'], answer: '2', coach: '10 少 8 还差 2。' },
  ],
  'addsub-ten': [
    { prompt: '火箭倒数：10、9、8、？', options: ['6', '7', '9'], answer: '7', coach: '每次少 1，接着是 7。' },
    { prompt: '10－6＝？', options: ['3', '4', '5'], answer: '4', coach: '6 和 4 组成 10。' },
  ],
  'continuous-add-sub': [
    { prompt: '5＋2＋1，先算 5＋2 得？', options: ['6', '7', '8'], answer: '7', coach: '连续变化要保留中间结果 7。' },
    { prompt: '8－2－3 的结果是？', options: ['2', '3', '4'], answer: '3', coach: '8－2＝6，再减 3 得 3。' },
  ],
  'mixed-add-sub': [
    { prompt: '4＋3－2，按发生顺序先算？', options: ['4＋3', '3－2', '4－2'], answer: '4＋3', coach: '先来的数量先合起来，再去掉。' },
    { prompt: '数阵中 4 和几合成 10？', options: ['5', '6', '7'], answer: '6', coach: '10 少 4 还差 6。' },
  ],
  'unit2-review': [
    { prompt: '把 6、7、8、9、10 接着排，9 后面是？', options: ['8', '10', '11'], answer: '10', coach: '按数序，9 后面是 10。' },
    { prompt: '看图数量先增加 2 又减少 1，应写？', options: ['＋2－1', '－2＋1', '＋1＋2'], answer: '＋2－1', coach: '按事情发生顺序记录符号。' },
    { prompt: '10 以内算式卡按什么整理能发现规律？', options: ['按加数或得数顺序', '按颜色深浅', '随意堆放'], answer: '按加数或得数顺序', coach: '有顺序地整理，才容易看见规律。' },
  ],
};

/** 数学游戏不是一个按钮就结束：每节保留教材中彼此不同的观察/操作任务。 */
const GAME_MISSIONS: Record<string, CheckStep[]> = {
  campus: [
    { prompt: '校园里除了楼层，还可以用什么数学信息描述国旗？', options: ['5 颗五角星', '旗杆很高', '颜色很好看'], answer: '5 颗五角星', coach: '数量、形状和位置都可以成为数学观察。' },
    { prompt: '教学楼的窗户最接近什么图形？', options: ['长方形', '圆形', '三角形'], answer: '长方形', coach: '观察窗户的四条边和四个角。' },
    { prompt: '要说“教室在第 2 层”，还需要先确定什么？', options: ['从哪一层开始数', '窗户的颜色', '树有多高'], answer: '从哪一层开始数', coach: '位置要有起点；这里从底层入口开始数。' },
  ],
  playground: [
    { prompt: '“桃花朵朵开，3 人抱成团”时，一组应有几人？', options: ['2 人', '3 人', '4 人'], answer: '3 人', coach: '听清口令中的数量，再和同伴组成一组。' },
    { prompt: '规则说“双脚跳进○、单脚跳进△”，看到△时应该怎样跳？', options: ['单脚跳', '双脚跳', '停在原地'], answer: '单脚跳', coach: '图形和动作要一一对应。' },
    { prompt: '网里有 4 条鱼，点数时怎样才不会数重？', options: ['按顺序一条一条数', '只看最大的鱼', '从中间随便数'], answer: '按顺序一条一条数', coach: '确定起点，按同一方向逐个点数。' },
    { prompt: '比较两位同学的身高，应该比较什么？', options: ['谁站得更高', '谁衣服颜色更深', '谁离画面更近'], answer: '谁站得更高', coach: '比较身高要看从脚到头顶的高低。' },
    { prompt: '男生和女生一个对一个站好，男生多 1 人，说明什么？', options: ['男生人数更多', '女生人数更多', '两边同样多'], answer: '男生人数更多', coach: '配对后有剩余的一边数量更多。' },
  ],
  'classroom-discover': [
    { prompt: '一年级一共有几个班？', options: ['5 个', '6 个', '7 个'], answer: '6 个', coach: '从一（1）班按顺序数到一（6）班。' },
    { prompt: '说“书包在课桌左边”时，课桌是什么？', options: ['参照物', '数量', '颜色'], answer: '参照物', coach: '位置总是相对某个物体说的。' },
    { prompt: '从教学楼位置图找到一（3）班，数字 3 表示什么？', options: ['班级编号', '3 层楼', '3 个窗户'], answer: '班级编号', coach: '同样是数字，要结合情境理解它表示什么。' },
    { prompt: '介绍自己的座位，哪句话更清楚？', options: ['我在那边', '我在第 2 组，靠窗同学的右边', '我的座位很好'], answer: '我在第 2 组，靠窗同学的右边', coach: '说清参照物和方向，别人才能找到位置。' },
    { prompt: '自我介绍里“我家有 4 口人”中的 4 表示什么？', options: ['家庭人数', '座位位置', '班级编号'], answer: '家庭人数', coach: '先说明数的对象，别人才能明白数量。' },
  ],
  'classroom-games': [
    { prompt: '老师说“摸左耳”时，先要听清哪两件事？', options: ['动作和方向', '声音大小', '同学衣服'], answer: '动作和方向', coach: '“摸”是动作，“左”是方向。' },
    { prompt: '从左边数第 3 个同学，数字 3 表示什么？', options: ['位置', '总人数', '颜色'], answer: '位置', coach: '“第几个”说的是位置，不是总数。' },
    { prompt: '椅子和同学一个对一个配后，有同学没有椅子，说明什么？', options: ['椅子少了', '椅子多了', '刚好一样多'], answer: '椅子少了', coach: '没有配到的一边数量更多。' },
    { prompt: '3 个黄色三角形和 1 个红色三角形合起来有几个？', options: ['3 个', '4 个', '5 个'], answer: '4 个', coach: '把两部分合起来再数。' },
    { prompt: '用 2 个圆柱做小车车轮，数字 2 表示什么？', options: ['车轮数量', '车的颜色', '车的速度'], answer: '车轮数量', coach: '圆柱可以表示生活里的车轮。' },
  ],
  'learning-readiness': [
    { prompt: '8:30 在课程表或钟表上表示什么？', options: ['时间', '人数', '页码'], answer: '时间', coach: '冒号把小时和分钟分开。' },
    { prompt: '课堂上想发言，应该怎样做？', options: ['举右手，等老师允许', '直接大声喊', '离开座位'], answer: '举右手，等老师允许', coach: '先举手能让大家都听得清楚。' },
    { prompt: '把笔袋放在书本右边，必须先找到什么？', options: ['书本这个参照物', '笔袋颜色', '桌子高度'], answer: '书本这个参照物', coach: '位置指令先找参照物，再看方向。' },
    { prompt: '说“我喜欢校园的花坛，因为有 6 朵花”，是在发现什么？', options: ['生活中的数学数量', '花的名字', '上课时间'], answer: '生活中的数学数量', coach: '把看到的物体和数量联系起来，就是在校园里发现数学。' },
  ],
  numbers: [
    { prompt: '主题图里有 5 个物体，要选哪个数字表示它？', options: ['4', '5', '6'], answer: '5', coach: '实物有几个，就用几表示。' },
    { prompt: '●●●● 应该和哪个数字连起来？', options: ['3', '4', '5'], answer: '4', coach: '点子的个数和数字 4 表示同一个数量。' },
    { prompt: '除了点子图，哪一种也能表示数量 5？', options: ['5 个方块', '4 个方块', '数字 6'], answer: '5 个方块', coach: '实物、点子、方块和数字可以表示同一个数量。' },
    { prompt: '计数器上拨出 3 颗珠，应该配哪个数字？', options: ['2', '3', '4'], answer: '3', coach: '珠子的数量和数字要一一对应。' },
    { prompt: '写数字前先看笔顺示范，主要是为了什么？', options: ['按正确笔画书写', '把数字涂成喜欢的颜色', '让数字变大'], answer: '按正确笔画书写', coach: '数字也要按笔顺写，才能清楚又规范。' },
  ],
  compare: [
    { prompt: '两组物体比多少，最可靠的办法是什么？', options: ['一个对一个配对', '看哪边图画得大', '只数其中一边'], answer: '一个对一个配对', coach: '一一对应后，看哪边有剩余。' },
    { prompt: '3 个松果和 4 只松鼠，哪个符号正确？', options: ['3＜4', '3＞4', '3＝4'], answer: '3＜4', coach: '大口朝向大数，尖尖朝向小数。' },
    { prompt: '两边配对后都没有剩余，应该填什么？', options: ['＝', '＞', '＜'], answer: '＝', coach: '没有剩余表示同样多，使用等号。' },
    { prompt: '两边数量不同，＞或＜的大口应朝向哪里？', options: ['数量多的一边', '数量少的一边', '颜色深的一边'], answer: '数量多的一边', coach: '大口朝大数，尖尖朝小数。' },
    { prompt: '两人各摸一张卡片比大小，怎样才算公平？', options: ['两人有同样的机会和规则', '谁先看到答案谁赢', '只给一人更大的数'], answer: '两人有同样的机会和规则', coach: '公平游戏要让每个人遵守同样规则。' },
    { prompt: '“我的桃比你的多”一定对吗？', options: ['不一定，要先数或配对', '一定对', '只看桃子大小就知道'], answer: '不一定，要先数或配对', coach: '比较数量需要证据，不能只凭一句话。' },
  ],
  ordinal: [
    { prompt: '“一共有 5 人”里的 5 表示什么？', options: ['总人数', '一个位置', '第 5 个颜色'], answer: '总人数', coach: '“几个”表示总数。' },
    { prompt: '从左边数第 4 个，数字 4 表示什么？', options: ['位置', '总人数', '颜色'], answer: '位置', coach: '“第几个”表示规定方向下的位置。' },
    { prompt: '第 2 个人前面有几人？', options: ['1 人', '2 人', '3 人'], answer: '1 人', coach: '从起点数，第 1 人就在第 2 人前面。' },
    { prompt: '从右边数时，原来的位置会不会变化？', options: ['会，要重新确定第 1 个', '不会，永远一样', '只看衣服颜色'], answer: '会，要重新确定第 1 个', coach: '方向换了，起点和每个人的第几都会改变。' },
    { prompt: '遮住排队中的两个位置，先要知道什么才能补出来？', options: ['数的方向和完整顺序', '谁最高', '队伍颜色'], answer: '数的方向和完整顺序', coach: '先定起点，再按顺序补位置。' },
  ],
  compose: [
    { prompt: '5 可以分成 1 和几？', options: ['4', '3', '5'], answer: '4', coach: '1 和 4 合起来正好是 5。' },
    { prompt: '5 可以分成 2 和几？', options: ['3', '2', '4'], answer: '3', coach: '2 和 3 合起来正好是 5。' },
    { prompt: '两个鸟窝各有几只鸟时，5 只鸟能同样多？', options: ['2 和 3', '1 和 4', '不能同样多'], answer: '不能同样多', coach: '5 是单数，分成两份时不能两边一样多。' },
    { prompt: '已知 5 分成 1 和 4，反过来怎样说？', options: ['1 和 4 组成 5', '1 减 4 等于 5', '5 比 4 小'], answer: '1 和 4 组成 5', coach: '分与合可以正着说，也可以反过来说。' },
    { prompt: '找 5 的全部分法时，怎样避免漏掉？', options: ['按一边从 1 依次增加记录', '想到哪组写哪组', '只写一种'], answer: '按一边从 1 依次增加记录', coach: '有顺序地记录，才能检查有没有遗漏。' },
  ],
};

const GAME_SCENES: Record<string, { page: string; title: string; icon: string; trail: string[] }> = {
  campus: { page: 'P2-P3', title: '校园数学探索卡', icon: '🏫', trail: ['国旗数量', '窗户形状', '楼层位置'] },
  playground: { page: 'P4-P5', title: '操场规则挑战卡', icon: '🛝', trail: ['抱团人数', '跳格规则', '鱼和身高'] },
  'classroom-discover': { page: 'P6-P7', title: '教室定位探索卡', icon: '🪑', trail: ['班级编号', '参照物', '我的座位'] },
  'classroom-games': { page: 'P8-P9', title: '课堂游戏任务卡', icon: '🎲', trail: ['方向动作', '第几个', '配对与拼合'] },
  'learning-readiness': { page: 'P10-P11', title: '课前准备任务卡', icon: '🎒', trail: ['上课时间', '举手规则', '物品位置'] },
};

export function useMathTaskCompletion(complete: boolean, onDone: () => void, onCoach: (text: string) => void, success: string) {
  useEffect(() => {
    if (!complete) return;
    onCoach(success);
    onDone();
  }, [complete, onCoach, onDone, success]);
}

const useCompletion = useMathTaskCompletion;

function PlaceValueTask({ config, onDone, onCoach }: { config: { tens: number; ones: number; page: string; label: string }; onDone: () => void; onCoach: (text: string) => void }) {
  const [progress, setProgress] = usePersistedTask('place-value', { counted: 0, bundled: false, ones: 0 });
  const { counted, bundled, ones } = progress;
  const complete = bundled && ones === config.ones;
  useCompletion(complete, onDone, onCoach, `教材任务完成：${config.label}。`);
  const clickStick = (index: number) => {
    if (bundled) return;
    if (index !== counted) { onCoach('从最左边还没有数的小棒开始，一根一根数到 10。'); return; }
    setProgress((value) => ({ ...value, counted: value.counted + 1 }));
    onCoach(index === 9 ? '10 根都数到了。现在点击“捆成 1 个十”。' : `这是第 ${index + 1} 根，还要数 ${9 - index} 根。`);
  };
  return <section className="mt-textbook-task mt-place-task mt-theme-scene mt-stationery-scene">
    <header><small>教材 {config.page} · 文具整理站：十和一</small><h3>{config.label}</h3></header>
    <div className="mt-stationery-tray" aria-label="十支铅笔整理成一筒"><span>✏️ ✏️ ✏️ ✏️ ✏️</span><b>10 支铅笔 → 1 个笔筒</b><span>✏️ ✏️ ✏️ ✏️ ✏️</span></div>
    {!bundled ? <><div className="mt-stick-row">{Array.from({ length: 10 }, (_, index) => <button key={index} className={index < counted ? 'counted' : index === counted ? 'next' : ''} onClick={() => clickStick(index)} aria-label={`第 ${index + 1} 根小棒`}>│<em>{index < counted ? index + 1 : ''}</em></button>)}</div><button className="mt-task-main" disabled={counted !== 10} onClick={() => { setProgress((value) => ({ ...value, bundled: true })); onCoach(config.ones ? `已经有 1 个十，再点 ${config.ones} 个一。` : '1 个十已经捆好。'); }}>捆成 1 个十</button></> : <><div className="mt-place-board"><article><small>十位</small><b>{config.tens}</b><span className="mt-bundled-sticks">╟╫╢</span></article><article><small>个位</small><b>{ones}</b><div className="mt-ones-row">{Array.from({ length: config.ones }, (_, index) => <button key={index} className={index < ones ? 'on' : index === ones ? 'next' : ''} onClick={() => { if (index !== ones) { onCoach('从第一个还没有摆的“一”开始。'); return; } setProgress((value) => ({ ...value, ones: value.ones + 1 })); }}>{index < ones ? '●' : '○'}</button>)}</div></article></div><p className="mt-task-equation">{config.tens} 个十和 {ones} 个一 {complete ? '摆好了' : '正在摆'}</p></>}
  </section>;
}

function TeenWritingBoard({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const numbers = [11, 13, 16, 18, 20]; const [written, setWritten] = usePersistedTask<Record<number, string>>('teen-writing-board', {}); const [twenty, setTwenty] = usePersistedTask('teen-twenty-composition', '');
  const complete = numbers.every((number) => written[number] === String(number)) && twenty === '2个十';
  useCompletion(complete, onDone, onCoach, '11、13、16、18、20 的读写和 20 的两个十都记录好了。');
  return <section className="mt-textbook-task mt-card-organizer mt-theme-scene mt-stationery-scene" aria-label="11到20读写板"><header><small>教材 P76-P77 · 文具整理站：读一读、写一写</small><h3>看清笔筒里的十和桌上的一，写出十几和 20</h3></header><div className="mt-stationery-tray"><span>🖊️🖊️🖊️🖊️🖊️</span><b>1 筒 + 几支 = 十几</b><span>🖊️🖊️🖊️🖊️🖊️</span></div><div className="mt-card-sort-grid">{numbers.map((number) => <article key={number} className={written[number] === String(number) ? 'done' : ''}><b>{number === 20 ? '2 个十' : `1 个十和 ${number - 10} 个一`}</b><label>写作<input aria-label={`写数字 ${number}`} inputMode="numeric" maxLength={2} value={written[number] ?? ''} onChange={(event) => setWritten((values) => ({ ...values, [number]: event.target.value.replace(/[^0-9]/g, '').slice(0, 2) }))} /></label></article>)}<article className={twenty === '2个十' ? 'done' : ''}><b>20 由什么组成？</b>{['2个十', '2个一', '1个十和10个一'].map((answer) => <button key={answer} className={twenty === answer ? (answer === '2个十' ? 'is-correct' : 'is-wrong') : ''} onClick={() => { setTwenty(answer); onCoach(answer === '2个十' ? '20 是两个装满十支笔的笔筒。' : '20 里有两个完整的十。'); }}>{answer}</button>)}</article></div><p className="mt-task-equation">{complete ? '✓ 十几由 1 个十和几个一组成，20 是 2 个十。' : '每个数都要写下来，再判断 20 的组成。'}</p></section>;
}

function MakeTenTask({ config, onDone, onCoach }: { config: { first: number; second: number; page: string; label: string }; onDone: () => void; onCoach: (text: string) => void }) {
  const needed = 10 - config.first;
  const [moved, setMoved] = usePersistedTask('make-ten', 0);
  const complete = moved === needed;
  useCompletion(complete, onDone, onCoach, `教材任务完成：${config.first} 先凑成 10，余下 ${config.second - needed} 个，结果是 ${config.first + config.second}。`);
  return <section className="mt-textbook-task mt-make-ten-task mt-theme-scene mt-ten-storage-scene">
    <header><small>教材 {config.page} · 十格收纳实验室</small><h3>{config.label}</h3></header>
    <div className="mt-ten-storage-note"><span>第一盒：{config.first} 个圆片</span><b>拿 {needed} 个圆片填满十格盒</b><span>第二盒：{config.second} 个圆片</span></div>
    <div className="mt-make-ten-stage"><article><small>十格收纳盒</small><div className="mt-ten-target" aria-label={`十格盒已有 ${config.first + moved} 个圆片`}>{Array.from({ length: 10 }, (_, index) => <i key={index} className={index < config.first + moved ? 'filled' : ''}>{index < config.first + moved ? '●' : ''}</i>)}</div><b>{config.first} ＋ {moved} {complete ? '＝ 10' : ''}</b></article><span className="mt-transfer">← 移进十格盒</span><article><small>备用盒 · {config.second}</small><div className="mt-chip-row">{Array.from({ length: config.second }, (_, index) => <button key={index} className={index < moved ? 'moved' : index === moved ? 'next' : ''} disabled={index < moved || moved >= needed} onClick={() => { if (index !== moved) { onCoach(`先从第 ${moved + 1} 个还没有移动的圆片开始。`); return; } setMoved((value) => value + 1); }}>{index < moved ? '→' : '●'}</button>)}</div><b>还留在备用盒：{config.second - moved} 个</b></article></div>
    <p className="mt-task-equation">{config.first}＋{config.second}＝10＋{config.second - needed}＝{config.first + config.second}</p>
  </section>;
}

/** P92：8＋9 两条凑十路径都要亲自选择和比较，不能只给出其中一种。 */
function MakeTenStrategyTask({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const [used, setUsed] = usePersistedTask<string[]>('make-ten-8-plus-9-strategies', []);
  const methods = [
    { id: 'make-eight', label: '从 9 里移 2 个给 8', equation: '8＋9＝10＋7＝17' },
    { id: 'make-nine', label: '从 8 里移 1 个给 9', equation: '8＋9＝7＋10＝17' },
  ];
  const complete = methods.every((method) => used.includes(method.id));
  useCompletion(complete, onDone, onCoach, '两条凑十路线都验证完成：拆分不同，8＋9 的结果都是 17。');
  return <section className="mt-textbook-task mt-make-ten-task mt-theme-scene mt-ten-storage-scene" aria-label="8加9两种凑十方法">
    <header><small>教材 P92 · 十格收纳实验室</small><h3>分别给 8 和 9 凑十，再比较结果</h3></header>
    <div className="mt-strategy-routes">{methods.map((method) => <article key={method.id} className={used.includes(method.id) ? 'done' : ''}><b>{method.label}</b><div className="mt-route-boxes"><span>{method.id === 'make-eight' ? '8 格 + 2 格' : '9 格 + 1 格'}</span><strong>→ 10 格</strong><span>{method.id === 'make-eight' ? '还剩 7 格' : '还剩 7 格'}</span></div><button className={used.includes(method.id) ? 'is-correct' : ''} onClick={() => {
      setUsed((values) => values.includes(method.id) ? values : [...values, method.id]);
      onCoach(`${method.equation}。${complete ? '两种方法的结果相同。' : '再试另一种凑十路线。'}`);
    }}>{used.includes(method.id) ? `✓ ${method.equation}` : '沿这条路线收纳'}</button></article>)}</div>
    <p className="mt-task-equation">{complete ? '✓ 两种拆分都得到 17；可以选择自己更容易说清的一种。' : '每次点击一条路线，观察先凑成哪个 10。'}</p>
  </section>;
}

/** P100：在表格中填出进位加法，不把“加法表规律”降成一条三选一。 */
function AdditionTableExplorer({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  // 原页三角表中绿色格已给出，白格需要补全；保留每个空格而不是抽五题代替整张表。
  const blanks = [
    '5＋7', '4＋8', '3＋9',
    '6＋7', '5＋8', '4＋9',
    '6＋8', '5＋9', '6＋9', '7＋9',
  ];
  const rows = [
    ['9＋1', '8＋2', '7＋3', '6＋4', '5＋5', '4＋6', '3＋7', '2＋8', '1＋9'],
    ['9＋2', '8＋3', '7＋4', '6＋5', '5＋6', '4＋7', '3＋8', '2＋9'],
    ['9＋3', '8＋4', '7＋5', '6＋6', '5＋7', '4＋8', '3＋9'],
    ['9＋4', '8＋5', '7＋6', '6＋7', '5＋8', '4＋9'],
    ['9＋5', '8＋6', '7＋7', '6＋8', '5＋9'],
    ['9＋6', '8＋7', '7＋8', '6＋9'],
    ['9＋7', '8＋8', '7＋9'],
    ['9＋8', '8＋9'],
    ['9＋9'],
  ];
  const [filled, setFilled] = usePersistedTask<Record<string, string>>('addition-table-explorer', {});
  const normalize = (value: string) => value.replace(/\s/g, '').replace(/\+/g, '＋');
  const isCorrect = (equation: string) => normalize(filled[equation] ?? '') === equation.split('＋')[1];
  const complete = blanks.every(isCorrect);
  useCompletion(complete, onDone, onCoach, '进位加法三角表的 10 个空格都填好了：每一列向下，第二个加数加 1；每一行向右，第一个加数减 1。');
  return <section className="mt-textbook-task mt-card-organizer" aria-label="进位加法表">
    <header><small>教材 P100 · 制卡、整理、填表和找规律</small><h3>按原页三角排列，把余下的 10 道进位加法填进白格</h3></header>
    <div className="mt-addition-triangle" role="grid" aria-label="20以内进位加法三角表">{rows.map((row, rowIndex) => <div key={rowIndex} role="row">{row.map((equation) => {
      const blank = blanks.includes(equation);
      const value = filled[equation] ?? '';
      return <span key={equation} role="gridcell" className={blank ? (isCorrect(equation) ? 'done' : 'blank') : 'given'}>{blank ? <label>{equation.split('＋')[0]}＋<input aria-label={`填写 ${equation}`} value={value} maxLength={1} onChange={(event) => { const next = event.target.value.replace(/[^0-9]/g, ''); setFilled((current) => ({ ...current, [equation]: next })); if (next === equation.split('＋')[1]) onCoach(`${equation} 填对了，继续按三角表的行列规律填写。`); }} /> </label> : equation}</span>;
    })}</div>)}</div>
    <p className="mt-task-equation">{complete ? '✓ 10 个空格都补全了：同一斜行的两个加数一增一减；按列或按行都能发现规律。' : `已填对 ${blanks.filter(isCorrect).length} / 10 格；白格要填出缺少的第二个加数。`}</p>
  </section>;
}

/** P100：原页还要求看图列式、回顾凑十、任意指算和说出表格行列规律。 */
function AdditionTableReview({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const equations = ['9＋1', '8＋2', '7＋3', '6＋4', '5＋5', '9＋4', '8＋5', '7＋6', '6＋7', '5＋8', '9＋8', '8＋9', '9＋9'];
  const [record, setRecord] = usePersistedTask('addition-table-review', { selected: '', result: '', split: '', rest: '', pictureEquation: '', firstColumn: '', firstRow: '' });
  const selectedTotal = record.selected ? record.selected.split('＋').map(Number).reduce((sum, value) => sum + value, 0) : 0;
  const quickDone = Boolean(record.selected) && record.result === String(selectedTotal);
  const makeTenDone = record.split === '2' && record.rest === '7';
  const pictureDone = record.pictureEquation.replace(/\s/g, '').replace(/\+/g, '＋').replace(/=/g, '＝') === '6＋5＝11';
  const patternDone = record.firstColumn.trim().length >= 8 && record.firstRow.trim().length >= 8;
  const complete = quickDone && makeTenDone && pictureDone && patternDone;
  useCompletion(complete, onDone, onCoach, 'P100 的凑十回顾、看图列式、任意指算和行列规律都记录好了；三角表不再只完成一部分。');
  return <section className="mt-textbook-task mt-card-organizer" aria-label="进位加法表观察记录">
    <header><small>教材 P100 · 用整理好的算式卡回顾、指算和发现规律</small><h3>把原页的四项整理任务逐项留下证据</h3></header>
    <div className="mt-card-sort-grid">
      <article className={makeTenDone ? 'done' : ''}><b>① 回顾 8＋9 的凑十法</b><p className="mt-task-equation">8＋9＝8＋<input aria-label="8加9拆出的数" inputMode="numeric" maxLength={1} value={record.split} onChange={(event) => setRecord((current) => ({ ...current, split: event.target.value.replace(/[^0-9]/g, '') }))} />＋<input aria-label="8加9剩余的数" inputMode="numeric" maxLength={1} value={record.rest} onChange={(event) => setRecord((current) => ({ ...current, rest: event.target.value.replace(/[^0-9]/g, '') }))} />＝17</p><small>从 9 中拿出多少给 8 凑成 10？还剩多少？</small></article>
      <article className={pictureDone ? 'done' : ''}><b>② 看图列式：领走 6 个，剩下 5 个</b><p>领走：●●●●●●  剩下：●●●●●</p><label>原来一共有多少个？<input aria-label="6加5看图列式" value={record.pictureEquation} placeholder="6＋5＝11" onChange={(event) => setRecord((current) => ({ ...current, pictureEquation: event.target.value }))} /></label></article>
      <article className={quickDone ? 'done' : ''}><b>③ 任意指一个算式，快速说出得数</b><div>{equations.map((equation) => <button key={equation} className={record.selected === equation ? 'chosen' : ''} onClick={() => setRecord((current) => ({ ...current, selected: equation, result: '' }))}>{equation}</button>)}</div>{record.selected && <label>{record.selected}＝<input aria-label={`计算 ${record.selected}`} inputMode="numeric" maxLength={2} value={record.result} onChange={(event) => setRecord((current) => ({ ...current, result: event.target.value.replace(/[^0-9]/g, '') }))} /></label>}</article>
      <article className={patternDone ? 'done' : ''}><b>④ 计算第一列和第一行，说说发现</b><label>第一列（9＋1、9＋2……）<VoiceField multiline ariaLabel="第一列规律" maxLength={60} value={record.firstColumn} placeholder="例如：第二个加数每次加 1，得数也每次加 1。" onChange={(firstColumn) => setRecord((current) => ({ ...current, firstColumn }))} /></label><label>第一行（9＋1、8＋2……）<VoiceField multiline ariaLabel="第一行规律" maxLength={60} value={record.firstRow} placeholder="例如：第一个加数每次减 1，第二个加数每次加 1，和不变。" onChange={(firstRow) => setRecord((current) => ({ ...current, firstRow }))} /></label></article>
    </div>
    <p className={complete ? 'mt-feedback good' : 'mt-task-equation'}>{complete ? '✓ 四项原页整理任务都完成了，过程已保存。' : '不要只填表：还要回顾凑十、看图列式、指算并写下观察。'}</p>
  </section>;
}

/** P64：把 10 以内加减法卡按运算和结果整理，保留制作、归类和找规律。 */
function Unit2CardOrganizer({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const cards = [
    { id: 'add-six', text: '4＋2＝6', group: '加法' }, { id: 'add-ten', text: '7＋3＝10', group: '加法' },
    { id: 'sub-six', text: '9－3＝6', group: '减法' }, { id: 'sub-zero', text: '8－8＝0', group: '减法' },
  ];
  const [sorted, setSorted] = usePersistedTask<Record<string, string>>('unit2-card-organizer', {});
  const complete = cards.every((card) => sorted[card.id] === card.group);
  useCompletion(complete, onDone, onCoach, '算式卡已按加法和减法整理；可以继续按得数观察 0、6、10 的规律。');
  return <section className="mt-textbook-task mt-card-organizer" aria-label="十以内加减法算式卡整理">
    <header><small>教材 P64 · 制作并整理算式卡</small><h3>按运算符把算式卡放入正确一列</h3></header>
    <div className="mt-card-sort-grid">{cards.map((card) => <article key={card.id} className={sorted[card.id] === card.group ? 'done' : ''}><b>{card.text}</b><div>{['加法', '减法'].map((group) => <button key={group} className={sorted[card.id] === group ? (group === card.group ? 'is-correct' : 'is-wrong') : ''} onClick={() => {
      setSorted((values) => ({ ...values, [card.id]: group }));
      onCoach(group === card.group ? `${card.text} 是${group}算式。` : '先看算式中间的运算符，再重新归类。');
    }}>{group}</button>)}</div></article>)}</div>
    <p className="mt-task-equation">{complete ? '✓ 加法把部分合起来，减法从整体去掉一部分；同类算式可以再按得数整理。' : '先按＋、－归类，再观察每张卡的得数。'}</p>
  </section>;
}

/** P59：按发生顺序摆出两次增加，必须保留 5→7→8 的中间结果。 */
function ContinuousChangeBoard({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const stages = [5, 7, 8];
  const [stage, setStage] = usePersistedTask('continuous-change-board', 0);
  const complete = stage === stages.length - 1;
  useCompletion(complete, onDone, onCoach, '两次变化都摆出来了：5＋2＋1＝8，中间的 7 不能省略。');
  return <section className="mt-textbook-task mt-card-organizer" aria-label="连加连续变化板">
    <header><small>教材 P59 · 按事情发生顺序摆一摆</small><h3>原来 5 只，先来 2 只，又来 1 只</h3></header>
    <div className="mt-card-sort-grid"><article className={stage >= 0 ? 'done' : ''}><b>原来</b><p className="mt-task-equation">●●●●● = 5</p></article><article className={stage >= 1 ? 'done' : ''}><b>第一次：来 2 只</b><button disabled={stage !== 0} onClick={() => { setStage(1); onCoach('先合并 2 只，现在有 7 只；还会再发生一次变化。'); }}>{stage >= 1 ? '●●●●●●● = 7 ✓' : '把 2 只放进来'}</button></article><article className={stage >= 2 ? 'done' : ''}><b>第二次：再来 1 只</b><button disabled={stage !== 1} onClick={() => { setStage(2); onCoach('再来 1 只，7 变成 8；算式是 5＋2＋1＝8。'); }}>{stage >= 2 ? '●●●●●●●● = 8 ✓' : '再放 1 只'}</button></article></div>
    <p className="mt-task-equation">{complete ? '✓ 5 → 7 → 8；连加按事情发生顺序从左到右算。' : '先完成第一次变化，再完成第二次变化。'}</p>
  </section>;
}

function ContinuousSubtractionBoard({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const [stage, setStage] = usePersistedTask<number>('continuous-subtraction-board', 0);
  const complete = stage === 2;
  useCompletion(complete, onDone, onCoach, '两次飞走都按顺序记录：8→6→3，不能跳过中间的 6。');
  return <section className="mt-textbook-task mt-card-organizer" aria-label="连减连续变化板"><header><small>教材 P59-P62 · 连续两次减少</small><h3>原来 8 只，先飞走 2 只，又飞走 3 只</h3></header><div className="mt-card-sort-grid"><article className="done"><b>原来</b><p className="mt-task-equation">●●●●●●●● = 8</p></article><article className={stage >= 1 ? 'done' : ''}><b>第一次飞走 2 只</b><button disabled={stage !== 0} onClick={() => { setStage(1); onCoach('8 去掉 2，先剩 6；还会再飞走一次。'); }}>{stage >= 1 ? '●●●●●● = 6 ✓' : '让 2 只飞走'}</button></article><article className={stage >= 2 ? 'done' : ''}><b>第二次飞走 3 只</b><button disabled={stage !== 1} onClick={() => { setStage(2); onCoach('6 再去掉 3，剩 3；算式是 8－2－3＝3。'); }}>{stage >= 2 ? '●●● = 3 ✓' : '再让 3 只飞走'}</button></article></div><p className="mt-task-equation">{complete ? '✓ 8 → 6 → 3；连减按发生顺序从左到右算。' : '先处理第一次飞走，再处理第二次飞走。'}</p></section>;
}

function ContinuousAddSubTaskPack({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const [addDone, setAddDone] = usePersistedTask('continuous-add-done', false); const [subDone, setSubDone] = usePersistedTask('continuous-sub-done', false);
  useCompletion(addDone && subDone, onDone, onCoach, '连加和连减两条变化路线都完成了。');
  return <><ContinuousChangeBoard onDone={() => setAddDone(true)} onCoach={onCoach} /><ContinuousSubtractionBoard onDone={() => setSubDone(true)} onCoach={onCoach} /></>;
}

/** P44：由同一幅部分整体图找全两加两减，保留一图四式的完整结构。 */
function EquationFamilyBoard({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const correct = ['5＋1＝6', '1＋5＝6', '6－5＝1', '6－1＝5'];
  const [picked, setPicked] = usePersistedTask<string[]>('equation-family-board', []);
  const [special, setSpecial] = usePersistedTask<Record<string, string>>('six-seven-special-cards', {});
  const specialDone = special.same === '6－3＝3' && special.cover === '7－2＝5';
  const complete = correct.every((equation) => picked.includes(equation)) && specialDone;
  useCompletion(complete, onDone, onCoach, '同一图四式、相同部分和遮挡求另一部分都完成了。');
  return <section className="mt-textbook-task mt-card-organizer" aria-label="一图四式关系板">
    <header><small>教材 P44 · 一图四式</small><h3>5 个和 1 个合成 6，找全四道算式</h3></header>
    <div className="mt-card-sort-grid"><article><b>部分：5、1；整体：6</b><div>{[...correct, '5－1＝4', '6＋1＝7'].map((equation) => {
      const selected = picked.includes(equation);
      const right = correct.includes(equation);
      return <button key={equation} className={selected ? (right ? 'is-correct' : 'is-wrong') : ''} aria-pressed={selected} onClick={() => {
        setPicked((values) => values.includes(equation) ? values.filter((value) => value !== equation) : [...values, equation]);
        onCoach(right ? `${equation} 使用了这幅图中的整体和两个部分。` : '这道算式没有正确表达 5、1 和整体 6 的关系。');
      }}>{equation}</button>;
    })}</div></article></div>
    <div className="mt-card-sort-grid"><article className={special.same === '6－3＝3' ? 'done' : ''}><b>3 和 3 组成 6：两部分相同，遮住一部分后怎么说？</b><div>{['6－3＝3', '6－3＝2', '3＋6＝9'].map((answer) => <button key={answer} className={special.same === answer ? (answer === '6－3＝3' ? 'is-correct' : 'is-wrong') : ''} onClick={() => { setSpecial((values) => ({ ...values, same: answer })); onCoach(answer === '6－3＝3' ? '两个部分都是 3，6 去掉一个 3 还剩 3。' : '先看整体是 6，两个相同部分都是 3。'); }}>{answer}</button>)}</div></article><article className={special.cover === '7－2＝5' ? 'done' : ''}><b>7 个圆片遮住 2 个，剩下几个？</b><div>{['7－2＝5', '7＋2＝9', '5－2＝3'].map((answer) => <button key={answer} className={special.cover === answer ? (answer === '7－2＝5' ? 'is-correct' : 'is-wrong') : ''} onClick={() => { setSpecial((values) => ({ ...values, cover: answer })); onCoach(answer === '7－2＝5' ? '整体 7 去掉遮住的 2，剩 5。' : '遮住表示从整体中去掉一部分。'); }}>{answer}</button>)}</div></article></div>
    <p className="mt-task-equation">{complete ? '✓ 两道加法、两道减法、相同部分和遮挡求差都整理对了。' : `已找到 ${picked.filter((equation) => correct.includes(equation)).length} / 4 道四式；再完成两张练习卡。`}</p>
  </section>;
}

/** P39-P43：有序记录 8 的全部分法，保留左右互换和中间的 4、4。 */
function SplitComposeBoard({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const pairs = ['0 和 8', '1 和 7', '2 和 6', '3 和 5', '4 和 4'];
  const [recorded, setRecorded] = usePersistedTask<string[]>('split-compose-eight', []);
  const complete = pairs.every((pair) => recorded.includes(pair));
  useCompletion(complete, onDone, onCoach, '8 的五组不同分法已经按顺序记录；交换左右不再重复记录。');
  return <section className="mt-textbook-task mt-card-organizer" aria-label="八的分与合记录板">
    <header><small>教材 P39-P43 · 分一分并有序记录</small><h3>把 8 分成两部分，按左边从 0 到 4 记录</h3></header>
    <div className="mt-card-sort-grid">{pairs.map((pair, index) => <article key={pair} className={recorded.includes(pair) ? 'done' : ''}><b>8 = {pair}</b><button disabled={recorded.includes(pair) || index > recorded.length} onClick={() => {
      if (index !== recorded.length) { onCoach('按左边从小到大的顺序记录，这样不会漏。'); return; }
      setRecorded((values) => [...values, pair]);
      onCoach(index === pairs.length - 1 ? '4 和 4 是中间分法，8 的不同分法记录完整了。' : `已记录 ${pair}，继续找下一组。`);
    }}>{recorded.includes(pair) ? '✓ 已记录' : '摆一摆并记录'}</button></article>)}</div>
    <p className="mt-task-equation">{complete ? '✓ 交换左右的分法表示同一组数量；共有 5 组不同分法。' : `已记录 ${recorded.length} / ${pairs.length} 组。`}</p>
  </section>;
}

/** P42-P43：数序、规律、车厢位置和不同总数的分合卡不能只用一道选择题带过。 */
function NumberPracticeSixToNineBoard({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const [sequence, setSequence] = usePersistedTask<Record<number, string>>('six-to-nine-number-sequence', {});
  const [pattern, setPattern] = usePersistedTask('six-to-nine-shape-pattern', '');
  const [carriage, setCarriage] = usePersistedTask<number | null>('six-to-nine-carriage-ordinal', null);
  const [partners, setPartners] = usePersistedTask<Record<number, number>>('six-to-nine-compose-cards', {});
  const sequenceDone = [3, 6, 9].every((number) => sequence[number] === String(number));
  const partnersDone = partners[6] === 1 && partners[7] === 3 && partners[9] === 4;
  const complete = sequenceDone && pattern === '○' && carriage === 4 && partnersDone;
  useCompletion(complete, onDone, onCoach, '0～9 数序、图形规律、车厢第几和 6、7、9 的分合卡都完成了。');
  const cardRows = [{ whole: 6, left: 5, answer: 1 }, { whole: 7, left: 4, answer: 3 }, { whole: 9, left: 5, answer: 4 }];
  return <section className="mt-textbook-task mt-card-organizer" aria-label="0到9数序规律和分合练习板">
    <header><small>教材 P42-P43 · 数序、规律、车厢和分合</small><h3>补数序、接规律、从左找车厢，再给分合卡配伙伴</h3></header>
    <div className="mt-card-sort-grid">
      <article className={sequenceDone ? 'done' : ''}><b>0　1　2　□　4　5　□　7　8　□</b><div>{[3, 6, 9].map((number) => <label key={number}>第 {number + 1} 格<input aria-label={`数序空格 ${number}`} inputMode="numeric" maxLength={1} value={sequence[number] ?? ''} onChange={(event) => setSequence((values) => ({ ...values, [number]: event.target.value.replace(/[^0-9]/g, '').slice(0, 1) }))} /></label>)}</div></article>
      <article className={pattern === '○' ? 'done' : ''}><b>△　○　△　○　△　？</b><div>{['△', '○', '□'].map((shape) => <button key={shape} className={pattern === shape ? (shape === '○' ? 'is-correct' : 'is-wrong') : ''} onClick={() => { setPattern(shape); onCoach(shape === '○' ? '图形按“△、○”重复，下一格是 ○。' : '先看前面两个图形怎样轮流重复。'); }}>{shape}</button>)}</div></article>
      <article className={carriage === 4 ? 'done' : ''}><b>从左数第 5 节车厢</b><div>{Array.from({ length: 8 }, (_, index) => <button key={index} aria-label={`车厢位置 ${index + 1}`} className={carriage === index ? (index === 4 ? 'is-correct' : 'is-wrong') : ''} onClick={() => { setCarriage(index); onCoach(index === 4 ? '从左第 5 节车厢找到了；第几表示位置。' : '从左边的第 1 节开始，一个一个数到第 5 节。'); }}>{carriage === index ? '★' : '🚃'}</button>)}</div></article>
      {cardRows.map((row) => <article key={row.whole} className={partners[row.whole] === row.answer ? 'done' : ''}><b>{row.left} 和 ？组成 {row.whole}</b><div>{[row.answer - 1, row.answer, row.answer + 1].map((choice) => <button key={choice} className={partners[row.whole] === choice ? (choice === row.answer ? 'is-correct' : 'is-wrong') : ''} onClick={() => { setPartners((values) => ({ ...values, [row.whole]: choice })); onCoach(choice === row.answer ? `${row.left} 和 ${choice} 组成 ${row.whole}。` : `把 ${row.left} 和 ${choice} 合起来，再核对是否是 ${row.whole}。`); }}>{choice}</button>)}</div></article>)}
    </div>
    <p className="mt-task-equation">{complete ? '✓ 数序、规律、从左第 5 节车厢和三张分合卡都正确。' : '每类任务都要留下自己的操作记录；选错后可以改正。'}</p>
  </section>;
}

function ComposeSixNineTaskPack({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const [splitDone, setSplitDone] = usePersistedTask('compose-six-nine-split-done', false);
  const [practiceDone, setPracticeDone] = usePersistedTask('compose-six-nine-practice-done', false);
  useCompletion(splitDone && practiceDone, onDone, onCoach, '6～9 的分合、数序、规律和位置练习都已完成。');
  return <><SplitComposeBoard onDone={() => setSplitDone(true)} onCoach={onCoach} /><NumberPracticeSixToNineBoard onDone={() => setPracticeDone(true)} onCoach={onCoach} /></>;
}

/** P34-P36：把数量、点子、数字和书写放在同一张可检查的记录表中。 */
function SixToNineRepresentationBoard({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const numbers = [6, 7, 8, 9];
  const [matched, setMatched] = usePersistedTask<Record<number, number>>('six-to-nine-representations', {});
  const [written, setWritten] = usePersistedTask<Record<number, string>>('six-to-nine-writing', {});
  const complete = numbers.every((number) => matched[number] === number && written[number]?.trim() === String(number));
  useCompletion(complete, onDone, onCoach, '6～9 的实物、点子、数字和写法都一一对应完成了。');
  return <section className="mt-textbook-task mt-card-organizer" aria-label="6到9数形书写对应板">
    <header><small>教材 P34-P36 · 数一数、连一连、写一写</small><h3>逐个点数，再把每组和数字、书写记录对应起来</h3></header>
    <div className="mt-card-sort-grid">{numbers.map((number) => {
      const picked = matched[number];
      const correct = picked === number;
      return <article key={number} className={correct && written[number]?.trim() === String(number) ? 'done' : ''}>
        <b>{'●'.repeat(number)} 共计？个</b>
        <div>{numbers.map((choice) => <button key={choice} aria-pressed={picked === choice} className={picked === choice ? (choice === number ? 'is-correct' : 'is-wrong') : ''} onClick={() => {
          setMatched((values) => ({ ...values, [number]: choice }));
          onCoach(choice === number ? `点子有 ${number} 个，对应数字 ${number}。` : '按从左到右、从上到下的顺序再点一遍，不跳数也不重复。');
        }}>{choice}</button>)}</div>
        <label>描红后写数字 {number}<input aria-label={`写数字 ${number}`} inputMode="numeric" maxLength={1} value={written[number] ?? ''} onChange={(event) => setWritten((values) => ({ ...values, [number]: event.target.value.replace(/[^0-9]/g, '').slice(0, 1) }))} /></label>
      </article>;
    })}</div>
    <p className="mt-task-equation">{complete ? '✓ 6、7、8、9 都能用点子和数字表示，并已完成独立书写。' : '每一行先点数并选数字，再在格内写下这个数字。'}</p>
  </section>;
}

/** P37-P38：比较和序数都必须先做出可见的方向/位置选择。 */
function CompareOrderNineBoard({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const comparisons = [
    { id: 'six-eight', left: 6, right: 8, answer: '＜' },
    { id: 'nine-seven', left: 9, right: 7, answer: '＞' },
    { id: 'eight-eight', left: 8, right: 8, answer: '＝' },
  ];
  const ordinals = [
    { id: 'from-right-sixth', prompt: '从右数第 6 条鱼', direction: '从右边开始', target: 3 },
    { id: 'from-left-seventh', prompt: '从左数第 7 只海马', direction: '从左边开始', target: 6 },
  ];
  const [relations, setRelations] = usePersistedTask<Record<string, string>>('six-to-nine-comparisons', {});
  const [positions, setPositions] = usePersistedTask<Record<string, { direction?: string; target?: number }>>('six-to-nine-ordinals', {});
  const comparisonsDone = comparisons.every((item) => relations[item.id] === item.answer);
  const ordinalsDone = ordinals.every((item) => positions[item.id]?.direction === item.direction && positions[item.id]?.target === item.target);
  const complete = comparisonsDone && ordinalsDone;
  useCompletion(complete, onDone, onCoach, '比较和第几都完成了：先看数量关系，序数题先定方向再找位置。');
  return <section className="mt-textbook-task mt-card-organizer" aria-label="6到9比较和序数操作板">
    <header><small>教材 P37-P38 · 比一比、找第几</small><h3>先用数量填符号；序数题先确定起点，再点出目标</h3></header>
    <div className="mt-card-sort-grid">{comparisons.map((item) => <article key={item.id} className={relations[item.id] === item.answer ? 'done' : ''}>
      <b>{'●'.repeat(item.left)} ? {'●'.repeat(item.right)}</b><div>{['＞', '＜', '＝'].map((symbol) => <button key={symbol} className={relations[item.id] === symbol ? (symbol === item.answer ? 'is-correct' : 'is-wrong') : ''} onClick={() => {
        setRelations((values) => ({ ...values, [item.id]: symbol }));
        onCoach(symbol === item.answer ? `${item.left}${symbol}${item.right}；数多的一边对应大数。` : '先一一对应或直接点数，再让大口朝向数量多的一边。');
      }}>{symbol}</button>)}</div></article>)}
      {ordinals.map((item) => {
        const current = positions[item.id] ?? {};
        const correct = current.direction === item.direction && current.target === item.target;
        return <article key={item.id} className={correct ? 'done' : ''}><b>{item.prompt}</b><div>{['从左边开始', '从右边开始'].map((direction) => <button key={direction} className={current.direction === direction ? (direction === item.direction ? 'is-correct' : 'is-wrong') : ''} onClick={() => {
          setPositions((values) => ({ ...values, [item.id]: { ...values[item.id], direction } }));
          onCoach(direction === item.direction ? '方向确定了；现在从这个起点一个一个数。' : '题目已经说明从哪边数，先把第 1 个放在正确一端。');
        }}>{direction}</button>)}</div><div>{Array.from({ length: 9 }, (_, index) => <button key={index} aria-label={`${item.prompt}位置 ${index + 1}`} className={current.target === index ? (index === item.target && current.direction === item.direction ? 'is-correct' : 'is-wrong') : ''} onClick={() => {
          setPositions((values) => ({ ...values, [item.id]: { ...values[item.id], target: index } }));
          onCoach(index === item.target && current.direction === item.direction ? '位置找对了；“第几”表示位置，不是总数。' : '从已经确定的起点逐个数到指定的第几，注意不要把总数当成位置。');
        }}>{current.target === index ? '★' : '🐟'}</button>)}</div></article>;
      })}</div>
    <p className="mt-task-equation">{complete ? '✓ 6＜8、9＞7、8＝8；从右第 6 个和从左第 7 个都已标出。' : '三个比较和两个位置都要完成；选错后可重新操作。'}</p>
  </section>;
}

function CompareWithinFiveBoard({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const [paired, setPaired] = usePersistedTask<number>('compare-within-five-pairs', 0); const [relations, setRelations] = usePersistedTask<Record<string, string>>('compare-within-five-relations', {});
  const complete = paired === 3 && relations.more === '4＞3' && relations.same === '3＝3';
  useCompletion(complete, onDone, onCoach, '一一配对、多少和同样多都验证完成。');
  return <section className="mt-textbook-task mt-card-organizer mt-theme-scene mt-monkey-peach-scene" aria-label="5以内一一对应比较板"><header><small>教材 P17-P18 · 小猴分桃</small><h3>给每只小猴分 1 个桃子，观察谁有剩余</h3></header><div className="mt-card-sort-grid"><article className={paired === 3 ? 'done' : ''}><div className="mt-scene-pairing"><span>🐒 🐒 🐒</span><i>{Array.from({ length: paired }, (_, index) => <b key={index}>↔</b>)}</i><span>{Array.from({ length: 4 }, (_, index) => <b key={index} className={index < paired ? 'given' : ''}>🍑</b>)}</span></div><button disabled={paired === 3} onClick={() => { setPaired((value) => value + 1); onCoach(paired === 2 ? '三只小猴都分到桃子，盘里还剩一个桃子，所以桃子更多。' : '点下一对，把一只小猴和一个桃子连起来。'); }}>{paired === 3 ? '✓ 三对分好了，剩 1 个桃子' : `给第 ${paired + 1} 只小猴分桃`}</button></article>{[{ id: 'more', text: '4 个桃子和 3 只小猴', answer: '4＞3' }, { id: 'same', text: '3 个圆片和 3 个方块', answer: '3＝3' }].map((row) => <article key={row.id} className={relations[row.id] === row.answer ? 'done' : ''}><b>{row.text}</b><div>{['4＞3', '3＜4', '3＝3', '3＞3'].map((answer) => <button key={answer} className={relations[row.id] === answer ? (answer === row.answer ? 'is-correct' : 'is-wrong') : ''} onClick={() => { setRelations((values) => ({ ...values, [row.id]: answer })); onCoach(answer === row.answer ? '数量关系正确。' : '先看配完是否有剩余，再选择大口方向或等号。'); }}>{answer}</button>)}</div></article>)}</div><p className="mt-task-equation">{complete ? '✓ 配完有剩余的一边更多；配完都没有剩余就是同样多。' : '先完成三对分桃，再填写两道关系。'}</p></section>;
}

function OrdinalWithinFiveBoard({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const [state, setState] = usePersistedTask<{ direction: string; target: number | null; rightTarget: number | null }>('ordinal-within-five-board', { direction: '', target: null, rightTarget: null });
  const complete = state.direction === '从左边开始' && state.target === 3 && state.rightTarget === 3;
  useCompletion(complete, onDone, onCoach, '从左第 4 个和从右第 2 个都找对了，方向会改变位置。');
  return <section className="mt-textbook-task mt-card-organizer mt-theme-scene mt-train-scene" aria-label="5以内序数方向板"><header><small>教材 P19 · 火车队列找第几</small><h3>火车开来后，先定方向，再给指定小朋友亮星</h3></header><div className="mt-card-sort-grid"><article className={state.direction === '从左边开始' && state.target === 3 ? 'done' : ''}><b>🚆 从左数第 4 个</b><div>{['从左边开始', '从右边开始'].map((direction) => <button key={direction} className={state.direction === direction ? (direction === '从左边开始' ? 'is-correct' : 'is-wrong') : ''} onClick={() => setState((value) => ({ ...value, direction }))}>{direction}</button>)}</div><div className="mt-scene-queue">{[1, 2, 3, 4, 5].map((value) => <button key={value} aria-label={`从左位置 ${value}`} className={state.target === value - 1 ? (value === 4 && state.direction === '从左边开始' ? 'is-correct' : 'is-wrong') : ''} onClick={() => setState((current) => ({ ...current, target: value - 1 }))}>{state.target === value - 1 ? '⭐' : '🧒'}</button>)}</div></article><article className={state.rightTarget === 3 ? 'done' : ''}><b>🚆 从右数第 2 个</b><div className="mt-scene-queue">{[1, 2, 3, 4, 5].map((value) => <button key={value} aria-label={`从右位置 ${value}`} className={state.rightTarget === value - 1 ? (value === 4 ? 'is-correct' : 'is-wrong') : ''} onClick={() => setState((current) => ({ ...current, rightTarget: value - 1 }))}>{state.rightTarget === value - 1 ? '⭐' : '🧒'}</button>)}</div></article></div><p className="mt-task-equation">{complete ? '✓ 火车方向变了，第几个的位置也会变。' : '两个任务都要先从指定一边开始数。'}</p></section>;
}

function ComposeWithinFiveBoard({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const pairs = ['0 和 5', '1 和 4', '2 和 3']; const [recorded, setRecorded] = usePersistedTask<string[]>('compose-within-five-board', []); const complete = pairs.every((pair) => recorded.includes(pair));
  useCompletion(complete, onDone, onCoach, '5 的不同分法已按顺序记录，交换左右不重复。');
  return <section className="mt-textbook-task mt-card-organizer mt-theme-scene mt-corn-basket-scene" aria-label="5的分与合记录板"><header><small>教材 P20-P21 · 玉米分篮</small><h3>把 5 根玉米依次分进两个篮子，并记录分法</h3></header><div className="mt-card-sort-grid">{pairs.map((pair, index) => { const [left, right] = pair.split(' 和 ').map(Number); return <article key={pair} className={recorded.includes(pair) ? 'done' : ''}><div className="mt-scene-baskets"><span>{Array.from({ length: left }, (_, i) => <i key={i}>🌽</i>)}</span><b>🧺　🧺</b><span>{Array.from({ length: right }, (_, i) => <i key={i}>🌽</i>)}</span></div><strong>5 = {pair}</strong><button disabled={recorded.includes(pair) || index > recorded.length} onClick={() => { if (index !== recorded.length) { onCoach('按左边从小到大记录，才不会漏。'); return; } setRecorded((values) => [...values, pair]); onCoach(`两只篮子里是 ${pair}，合起来仍是 5。`); }}>{recorded.includes(pair) ? '✓ 已摆好并记录' : '把玉米分进两篮'}</button></article>; })}</div><p className="mt-task-equation">{complete ? '✓ 5 有三组不同分法；左右交换仍是同一组。' : '依次把每一种玉米分法摆出来。'}</p></section>;
}

/** P50-P53：由 5 和 3、整体 8 写出两加两减，再迁移到 9。 */
function EquationFamilyEightNineBoard({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const correct = ['5＋3＝8', '3＋5＝8', '8－5＝3', '8－3＝5'];
  const [picked, setPicked] = usePersistedTask<string[]>('equation-family-eight-nine', []);
  const [special, setSpecial] = usePersistedTask<Record<string, string>>('eight-nine-special-cards', {});
  const specialDone = special.equal === '8－4＝4' && special.missing === '9－4＝5';
  const complete = correct.every((equation) => picked.includes(equation)) && specialDone;
  useCompletion(complete, onDone, onCoach, '8 的一图四式、相同部分和 9 的遮挡缺数都完成了。');
  return <section className="mt-textbook-task mt-card-organizer" aria-label="八和九一图四式关系板">
    <header><small>教材 P50-P53 · 8、9 的加减法</small><h3>部分 5、3 合成 8，找全四道相关算式</h3></header>
    <div className="mt-card-sort-grid"><article><b>部分：5、3；整体：8</b><div>{[...correct, '8＋5＝13', '5－3＝2'].map((equation) => {
      const chosen = picked.includes(equation); const right = correct.includes(equation);
      return <button key={equation} className={chosen ? (right ? 'is-correct' : 'is-wrong') : ''} onClick={() => {
        setPicked((values) => values.includes(equation) ? values.filter((value) => value !== equation) : [...values, equation]);
        onCoach(right ? `${equation} 是同一幅部分整体图的一道算式。` : '先检查算式是否只使用了 5、3 和整体 8。');
      }}>{equation}</button>;
    })}</div></article></div>
    <div className="mt-card-sort-grid"><article className={special.equal === '8－4＝4' ? 'done' : ''}><b>4 和 4 组成 8：拿走一边后还剩？</b><div>{['8－4＝4', '8－4＝3', '4＋8＝12'].map((answer) => <button key={answer} className={special.equal === answer ? (answer === '8－4＝4' ? 'is-correct' : 'is-wrong') : ''} onClick={() => { setSpecial((values) => ({ ...values, equal: answer })); onCoach(answer === '8－4＝4' ? '两部分同样多，8 去掉 4 仍是 4。' : '先把 8 分成相同的两部分再检查。'); }}>{answer}</button>)}</div></article><article className={special.missing === '9－4＝5' ? 'done' : ''}><b>9 个里遮住 4 个，写出剩下的关系</b><div>{['9－4＝5', '9＋4＝13', '5－4＝1'].map((answer) => <button key={answer} className={special.missing === answer ? (answer === '9－4＝5' ? 'is-correct' : 'is-wrong') : ''} onClick={() => { setSpecial((values) => ({ ...values, missing: answer })); onCoach(answer === '9－4＝5' ? '遮住 4 个后，剩下 5 个；也能用 4 和 5 组成 9 检查。' : '遮住表示减去，先找到整体 9。'); }}>{answer}</button>)}</div></article></div>
    <p className="mt-task-equation">{complete ? '✓ 8 的四式、4＋4 和 9－4＝5 都验证完成。' : `已找到 ${picked.filter((equation) => correct.includes(equation)).length} / 4 道四式；再完成两张练习卡。`}</p>
  </section>;
}

/** P51：把复杂图的有效信息和无关信息分开，形成选信息的可见证据。 */
function InformationFilterBoard({ onCoach }: { onCoach: (text: string) => void }) {
  const cards = [
    { id: 'total', text: '一共有 9 只鹿', useful: true }, { id: 'left', text: '跑走 3 只鹿', useful: true },
    { id: 'mushrooms', text: '树根处有 6 朵蘑菇', useful: false }, { id: 'swans', text: '有 8 只天鹅', useful: false },
  ];
  const [sorted, setSorted] = usePersistedTask<Record<string, string>>('information-filter-board', {});
  const complete = cards.every((card) => sorted[card.id] === (card.useful ? '有用信息' : '无关信息'));
  return <section className="mt-textbook-task mt-card-organizer" aria-label="复杂图信息筛选板">
    <header><small>教材 P51 · 选择有用信息</small><h3>问题问“还剩几只鹿”，把图中信息分开</h3></header>
    <div className="mt-card-sort-grid">{cards.map((card) => <article key={card.id} className={sorted[card.id] === (card.useful ? '有用信息' : '无关信息') ? 'done' : ''}><b>{card.text}</b><div>{['有用信息', '无关信息'].map((group) => <button key={group} className={sorted[card.id] === group ? (group === (card.useful ? '有用信息' : '无关信息') ? 'is-correct' : 'is-wrong') : ''} onClick={() => {
      setSorted((values) => ({ ...values, [card.id]: group }));
      onCoach(group === (card.useful ? '有用信息' : '无关信息') ? '分类正确；继续看它是否影响鹿的数量。' : '问题只问鹿，先保留整体和跑走的鹿。');
    }}>{group}</button>)}</div></article>)}</div>
    <p className="mt-task-equation">{complete ? '✓ 鹿的信息已筛对，无关信息没有干扰列式。' : '每条信息都要判断是否影响“还剩几只鹿”。'}</p>
  </section>;
}

/** P54-P55：用十格框的补数游戏记录 10 的组成，而不是只背出“9 添 1”。 */
function TenPartnerBoard({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const rounds = [1, 2, 3, 4, 5];
  const [answers, setAnswers] = usePersistedTask<Record<number, number>>('ten-partner-board', {});
  const complete = rounds.every((left) => answers[left] === 10 - left);
  useCompletion(complete, onDone, onCoach, '已经用补数游戏记录 10 的五组不同组成；交换左右仍表示同一组。');
  return <section className="mt-textbook-task mt-card-organizer" aria-label="十的分与合补数板">
    <header><small>教材 P54-P55 · 十格框与补数游戏</small><h3>我出一个数，你从 0～10 中找出能凑成 10 的伙伴</h3></header>
    <div className="mt-card-sort-grid">{rounds.map((left) => {
      const correct = 10 - left;
      const selected = answers[left];
      return <article key={left} className={selected === correct ? 'done' : ''}><b>{left} ＋ ？＝ 10</b><div>{Array.from({ length: 11 }, (_, value) => <button key={value} aria-pressed={selected === value} className={selected === value ? (value === correct ? 'is-correct' : 'is-wrong') : ''} onClick={() => {
        setAnswers((current) => ({ ...current, [left]: value }));
        onCoach(value === correct ? `${left} 和 ${value} 合起来是 10。` : `先把 ${left} 放进十格框，数一数还空几格。`);
      }}>{value}</button>)}</div></article>;
    })}</div>
    <p className="mt-task-equation">{complete ? '✓ 1 和 9、2 和 8、3 和 7、4 和 6、5 和 5 都组成 10。' : '每一行都要在十格框中补满 10；选错可重新摆。'}</p>
  </section>;
}

function TenWritingAndCompareBoard({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const [written, setWritten] = usePersistedTask('ten-writing', '');
  const [relation, setRelation] = usePersistedTask('ten-compare-nine', '');
  const complete = written === '10' && relation === '10＞9';
  useCompletion(complete, onDone, onCoach, '10 的写法和与 9 的大小关系都记录好了。');
  return <section className="mt-textbook-task mt-card-organizer" aria-label="10的书写和比较板"><header><small>教材 P54-P55 · 写一写、比一比</small><h3>写出 10，再用数序判断 10 和 9 的关系</h3></header><div className="mt-card-sort-grid"><article className={written === '10' ? 'done' : ''}><b>先写 1，再写 0</b><label>独立写 10<input aria-label="写数字10" inputMode="numeric" maxLength={2} value={written} onChange={(event) => setWritten(event.target.value.replace(/[^0-9]/g, '').slice(0, 2))} /></label></article><article className={relation === '10＞9' ? 'done' : ''}><b>9 的后一个数是 10</b><div>{['10＞9', '10＜9', '10＝9'].map((item) => <button key={item} className={relation === item ? (item === '10＞9' ? 'is-correct' : 'is-wrong') : ''} onClick={() => { setRelation(item); onCoach(item === '10＞9' ? '10 在 9 后面，所以 10 大于 9。' : '在数序中越靠后数越大。'); }}>{item}</button>)}</div></article></div><p className="mt-task-equation">{complete ? '✓ 10 写作“1 和 0”，并且 10＞9。' : '写完后再用数序比较。'}</p></section>;
}

function TenRecognitionTaskPack({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const [partnersDone, setPartnersDone] = usePersistedTask('ten-partners-done', false);
  const [writingDone, setWritingDone] = usePersistedTask('ten-writing-done', false);
  useCompletion(partnersDone && writingDone, onDone, onCoach, '10 的组成、书写和比较都完成了。');
  return <><TenPartnerBoard onDone={() => setPartnersDone(true)} onCoach={onCoach} /><TenWritingAndCompareBoard onDone={() => setWritingDone(true)} onCoach={onCoach} /></>;
}

/** P56-P58：从十的组成整理加减算式，并保留倒数和互相检查。 */
function TenEquationWorkbench({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const equationCards = [
    { id: 'one-nine', text: '1＋9＝10', correct: true }, { id: 'nine-one', text: '9＋1＝10', correct: true },
    { id: 'ten-one', text: '10－1＝9', correct: true }, { id: 'ten-nine', text: '10－9＝1', correct: true },
    { id: 'wrong', text: '10－1＝8', correct: false },
  ];
  const correctIds = equationCards.filter((card) => card.correct).map((card) => card.id);
  const [chosen, setChosen] = usePersistedTask<string[]>('ten-equation-workbench', []);
  const [countdown, setCountdown] = usePersistedTask<number>('ten-rocket-countdown', 10);
  const [stories, setStories] = usePersistedTask<Record<string, string>>('ten-equation-stories', {});
  const equationsComplete = correctIds.every((id) => chosen.includes(id)) && chosen.every((id) => correctIds.includes(id));
  const storiesDone = ['add', 'sub'].every((id) => (stories[id] ?? '').trim().length >= 4);
  const complete = equationsComplete && countdown === 0 && storiesDone;
  useCompletion(complete, onDone, onCoach, '十的两加两减、倒数和两道数量故事都完成了。');
  return <section className="mt-textbook-task mt-card-organizer" aria-label="十的加减法工作台">
    <header><small>教材 P56-P58 · 算式组与火箭倒数</small><h3>圈出同一组“1、9、10”的四道算式，再按每次少 1 倒数</h3></header>
    <div className="mt-card-sort-grid"><article><b>一组相关算式</b><div>{equationCards.map((card) => {
      const active = chosen.includes(card.id);
      return <button key={card.id} aria-pressed={active} className={active ? (card.correct ? 'is-correct' : 'is-wrong') : ''} onClick={() => {
        setChosen((current) => current.includes(card.id) ? current.filter((id) => id !== card.id) : [...current, card.id]);
        onCoach(card.correct ? `${card.text} 使用了 1、9 和整体 10。` : '这道算式的得数不对；请用 1 和 9 组成 10 检查。');
      }}>{card.text}</button>;
    })}</div></article><article className={countdown === 0 ? 'done' : ''}><b>火箭倒数：{countdown}</b><button disabled={countdown === 0} onClick={() => {
      setCountdown((value) => value - 1);
      onCoach(countdown === 1 ? '倒数到 0；每一步都比前一个数少 1。' : `从 ${countdown} 倒数，下一次是 ${countdown - 1}。`);
    }}>{countdown === 0 ? '✓ 已倒数到 0' : `发射前数 ${countdown - 1}`}</button></article></div>
    <div className="mt-card-sort-grid">{[{ id: 'add', title: '给 7＋3＝10 讲一个数量故事' }, { id: 'sub', title: '给 10－4＝6 讲一个数量故事' }].map((story) => <article key={story.id} className={(stories[story.id] ?? '').trim().length >= 4 ? 'done' : ''}><label>{story.title}<VoiceField ariaLabel={story.title} value={stories[story.id] ?? ''} placeholder="说出来，例如：7 只鸟又来了 3 只" onChange={(next) => setStories((values) => ({ ...values, [story.id]: next }))} /></label></article>)}</div>
    <p className="mt-task-equation">{complete ? '✓ 加减关系、倒数和两道数量故事都完成了。' : `已圈 ${chosen.filter((id) => correctIds.includes(id)).length} / 4 道正确算式；倒数到 ${countdown}，再讲两道故事。`}</p>
  </section>;
}

/** P60：先上车再下车，必须保留中间人数和符号顺序。 */
function MixedChangeBoard({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const [stage, setStage] = usePersistedTask<number>('mixed-change-board', 0);
  const complete = stage === 2;
  useCompletion(complete, onDone, onCoach, '4→7→5 的增加和减少都按事情发生顺序记录完成。');
  const advance = () => {
    setStage((value) => value + 1);
    onCoach(stage === 0 ? '先上来 3 人，4 变成 7；现在才处理下车。' : '再下去 2 人，7 变成 5；算式是 4＋3－2＝5。');
  };
  return <section className="mt-textbook-task mt-card-organizer" aria-label="加减混合变化板">
    <header><small>教材 P60 · 加减混合</small><h3>车上原有 4 人，先上来 3 人，又下去 2 人</h3></header>
    <div className="mt-card-sort-grid"><article className="done"><b>原来</b><p className="mt-task-equation">●●●● = 4</p></article><article className={stage >= 1 ? 'done' : ''}><b>先上来 3 人</b><button disabled={stage !== 0} onClick={advance}>{stage >= 1 ? '●●●●●●● = 7 ✓' : '把 3 人上车'}</button></article><article className={stage >= 2 ? 'done' : ''}><b>又下去 2 人</b><button disabled={stage !== 1} onClick={advance}>{stage >= 2 ? '●●●●● = 5 ✓' : '让 2 人下车'}</button></article></div>
    <p className="mt-task-equation">{complete ? '✓ 4＋3－2＝5；先增加，再减少，不能跳过中间的 7。' : '按故事发生顺序操作，先完成当前一步。'}</p>
  </section>;
}

function MixedReverseChangeBoard({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const [stage, setStage] = usePersistedTask<number>('mixed-reverse-change-board', 0); const complete = stage === 2;
  useCompletion(complete, onDone, onCoach, '先走后来的路线也完成了：7→5→8。');
  return <section className="mt-textbook-task mt-card-organizer" aria-label="先减后加变化板"><header><small>教材 P60-P62 · 先走后来的变化</small><h3>车上原有 7 人，先下去 2 人，又上来 3 人</h3></header><div className="mt-card-sort-grid"><article className="done"><b>原来</b><p className="mt-task-equation">●●●●●●● = 7</p></article><article className={stage >= 1 ? 'done' : ''}><b>先下去 2 人</b><button disabled={stage !== 0} onClick={() => { setStage(1); onCoach('先下去 2 人，7 变成 5。'); }}>{stage >= 1 ? '●●●●● = 5 ✓' : '让 2 人下车'}</button></article><article className={stage >= 2 ? 'done' : ''}><b>又上来 3 人</b><button disabled={stage !== 1} onClick={() => { setStage(2); onCoach('5 再来 3 人，变成 8；算式是 7－2＋3＝8。'); }}>{stage >= 2 ? '●●●●●●●● = 8 ✓' : '让 3 人上车'}</button></article></div><p className="mt-task-equation">{complete ? '✓ 7－2＋3＝8；先减后加也要保留中间的 5。' : '按故事顺序操作，不能先把 3 人加进去。'}</p></section>;
}

function MixedAddSubTaskPack({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const [forwardDone, setForwardDone] = usePersistedTask('mixed-forward-done', false); const [reverseDone, setReverseDone] = usePersistedTask('mixed-reverse-done', false);
  useCompletion(forwardDone && reverseDone, onDone, onCoach, '先加后减、先减后加两条混合变化路线都完成了。');
  return <><MixedChangeBoard onDone={() => setForwardDone(true)} onCoach={onCoach} /><MixedReverseChangeBoard onDone={() => setReverseDone(true)} onCoach={onCoach} /></>;
}

/** P61-P66：整理连算、数序和看图提问，避免复习课只剩算式卡分类。 */
function Unit2ReviewWorkbench({ onCoach }: { onCoach: (text: string) => void }) {
  const equations = [
    { id: 'add', text: '5＋2＋1＝8', kind: '连加' }, { id: 'sub', text: '8－2－3＝3', kind: '连减' },
    { id: 'mixed', text: '4＋3－2＝5', kind: '加减混合' }, { id: 'mixed-two', text: '7－5＋2＝4', kind: '加减混合' },
  ];
  const [sorted, setSorted] = usePersistedTask<Record<string, string>>('unit2-review-equations', {});
  const [question, setQuestion] = usePersistedTask('unit2-review-question', '');
  const [answer, setAnswer] = usePersistedTask('unit2-review-answer', '');
  const completeSort = equations.every((equation) => sorted[equation.id] === equation.kind);
  const completeQuestion = question.trim().length >= 4 && answer === '6';
  return <section className="mt-textbook-task mt-card-organizer" aria-label="第二单元整理复习工作台">
    <header><small>教材 P61-P66 · 整理、连算与提出问题</small><h3>把三类连算归类，再用“4 只和 2 只”提出一个一共的问题</h3></header>
    <div className="mt-card-sort-grid">{equations.map((equation) => <article key={equation.id} className={sorted[equation.id] === equation.kind ? 'done' : ''}><b>{equation.text}</b><div>{['连加', '连减', '加减混合'].map((kind) => <button key={kind} className={sorted[equation.id] === kind ? (kind === equation.kind ? 'is-correct' : 'is-wrong') : ''} onClick={() => {
      setSorted((current) => ({ ...current, [equation.id]: kind }));
      onCoach(kind === equation.kind ? `${equation.text} 是${kind}。` : '先看算式中的运算符和事情发生的顺序。');
    }}>{kind}</button>)}</div></article>)}</div>
    <label>我的问题（图中左边 4 只、右边 2 只）<VoiceField multiline maxLength={50} ariaLabel="我的问题" value={question} placeholder="说出来，例如：一共有几只？" onChange={setQuestion} /></label>
    <label>我的答案<input inputMode="numeric" value={answer} onChange={(event) => setAnswer(event.target.value.replace(/[^0-9]/g, ''))} /></label>
    <p className={completeSort && completeQuestion ? 'mt-feedback good' : 'mt-task-equation'}>{completeSort && completeQuestion ? '✓ 已整理三类连算，并提出并解答了 4＋2＝6 的问题。' : '每张连算卡都要分类；再写一个有“4 和 2”的数学问题并填写答案。'}</p>
  </section>;
}

function Unit2KnowledgeMap({ onCoach }: { onCoach: (text: string) => void }) {
  const links = [{ id: 'order-compare', text: '数序 → 比大小', note: '先知道前后数，才能判断谁大谁小。' }, { id: 'compose-addsub', text: '分与合 → 加减法', note: '两个部分能合成整体，也能从整体求部分。' }, { id: 'change-check', text: '数量变化 → 检查算式', note: '把结果带回变化过程，检查是否合理。' }];
  const [linked, setLinked] = usePersistedTask<string[]>('unit2-knowledge-map', []); const complete = links.every((link) => linked.includes(link.id));
  return <section className="mt-textbook-task mt-card-organizer" aria-label="第二单元知识图"><header><small>教材 P63-P66 · 串联知识</small><h3>亲手连通数、分合、加减和检查的关系</h3></header><div className="mt-card-sort-grid">{links.map((link) => <article key={link.id} className={linked.includes(link.id) ? 'done' : ''}><b>{link.text}</b><p>{linked.includes(link.id) ? link.note : '想一想这两个知识怎样互相帮助。'}</p><button onClick={() => { setLinked((values) => values.includes(link.id) ? values : [...values, link.id]); onCoach(link.note); }}>{linked.includes(link.id) ? '✓ 已连通' : '连通知识关系'}</button></article>)}</div><p className="mt-task-equation">{complete ? '✓ 三条知识关系都连通了。' : '每一条都要能说清为什么。'}</p></section>;
}

/** P63-P66：复习页的各工作台必须全部完成，不能由第一项算式卡提前放行。 */
function Unit2ReviewCompletionGate({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const [cards] = usePersistedTask<Record<string, string>>('unit2-card-organizer', {});
  const [links] = usePersistedTask<string[]>('unit2-knowledge-map', []);
  const [equations] = usePersistedTask<Record<string, string>>('unit2-review-equations', {});
  const [question] = usePersistedTask('unit2-review-question', '');
  const [answer] = usePersistedTask('unit2-review-answer', '');
  const [labIndex] = usePersistedTask('unit2-card-lab:unit2-review', 0);
  const cardsDone = cards['add-six'] === '加法' && cards['add-ten'] === '加法' && cards['sub-six'] === '减法' && cards['sub-zero'] === '减法';
  const linksDone = ['order-compare', 'compose-addsub', 'change-check'].every((id) => links.includes(id));
  const equationsDone = equations.add === '连加' && equations.sub === '连减' && equations.mixed === '加减混合' && equations['mixed-two'] === '加减混合';
  const questionDone = question.trim().length >= 4 && answer === '6';
  const labDone = labIndex >= 2;
  const complete = cardsDone && linksDone && equationsDone && questionDone && labDone;
  useCompletion(complete, onDone, onCoach, 'P63-P66 的算式卡、知识图、连算、编题和数卡实验全部完成，第二单元复习才真正结束。');
  return <p className={complete ? 'mt-feedback good' : 'mt-task-equation'} aria-label="第二单元复习完成门槛">{complete ? '✓ P63-P66 全部工作台都完成，复习课通过。' : `复习进度：算式卡 ${cardsDone ? '✓' : '○'}　知识图 ${linksDone ? '✓' : '○'}　连算与编题 ${equationsDone && questionDone ? '✓' : '○'}　数卡实验 ${labDone ? '✓' : '○'}`}</p>;
}

/** P67-P69：由生活物品的滚动、平面和形状特征完成分类，不能只按图标名称作答。 */
function SolidFeatureLab({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const cards: { id: string; item: string; kind: SolidShapeKind; experiment: string; feature: string }[] = [
    { id: 'ball', item: '球', kind: 'ball', experiment: '在平地上能向各个方向滚动', feature: '能向各个方向滚动' },
    { id: 'cylinder', item: '圆柱', kind: 'cylinder', experiment: '横放会滚，竖放能稳稳站住', feature: '有平面也有曲面' },
    { id: 'cube', item: '正方体', kind: 'cube', experiment: '翻到哪一面，面都一样大', feature: '六个面一样大' },
    { id: 'box', item: '长方体', kind: 'cuboid', experiment: '平放后能稳稳托住上面的积木', feature: '适合作稳定底座' },
  ];
  const features = ['能向各个方向滚动', '有平面也有曲面', '六个面一样大', '适合作稳定底座'];
  const [sorted, setSorted] = usePersistedTask<Record<string, string>>('solid-feature-lab', {});
  const [tested, setTested] = usePersistedTask<string[]>('solid-feature-tests', []);
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const complete = cards.every((card) => tested.includes(card.id) && sorted[card.id] === card.feature);
  useCompletion(complete, onDone, onCoach, '四种立体图形的形状、滚动和稳定特点都已通过实物特征区分。');
  // 测试动画时长与下方各 mt-demo-* keyframes 保持一致：动画演完才算“观察到”。
  const runTest = (card: typeof cards[number]) => {
    if (activeTest) return;
    setActiveTest(card.id);
    onCoach(`${card.item}开始测试，仔细观察它怎样运动。`);
    window.setTimeout(() => {
      setTested((items) => items.includes(card.id) ? items : [...items, card.id]);
      setActiveTest(null);
      speakOnce(`观察到：${card.experiment}`, 'zh', 0.92);
      onCoach(`观察到：${card.experiment}。`);
    }, 1500);
  };
  return <section className="mt-textbook-task mt-card-organizer mt-theme-scene mt-block-lab-scene" aria-label="立体图形特征实验台">
    <header><small>教材 P67-P69 · 积木城建工坊：器材检测站</small><h3>先测试每件器材，观察它的运动，再记录真正的特点</h3></header>
    <div className="mt-block-tool-shelf" aria-label="待检测积木">{cards.map((card) => <span key={card.id} className={tested.includes(card.id) ? 'tested' : ''}><SolidShapeGlyph kind={card.kind} size={30} /><small>{card.item}</small></span>)}</div>
    <div className="mt-card-sort-grid">{cards.map((card) => <article key={card.id} className={tested.includes(card.id) && sorted[card.id] === card.feature ? 'done' : ''}><b className="mt-block-title"><SolidShapeGlyph kind={card.kind} size={30} />{card.item}</b><div className={`mt-block-test-stage ${card.id} ${activeTest === card.id ? 'running' : ''} ${tested.includes(card.id) ? 'complete' : ''}`} aria-label={`${card.item}测试动画`}><div className="mt-block-test-arena"><SolidShapeGlyph kind={card.kind} className="mt-block-test-solid" />{card.id === 'box' && <SolidShapeGlyph kind="cube" className="mt-block-test-load" />}{card.id === 'cylinder' && <svg className="mt-cyl-wheel" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#8fdcb4" stroke="#2e7a55" strokeWidth="3" /><g className="mt-cyl-wheel-mark"><line x1="20" y1="20" x2="20" y2="5" stroke="#2e7a55" strokeWidth="2.6" strokeLinecap="round" /><circle cx="20" cy="11" r="2.4" fill="#1f6b47" /></g></svg>}</div><small>{activeTest === card.id ? '测试中，仔细观察…' : tested.includes(card.id) ? '✓ 已观察到结果，可再测一次' : '点“测试”开始观察'}</small></div><p className="mt-block-experiment">{tested.includes(card.id) ? `观察到：${card.experiment}` : activeTest === card.id ? '正在观察它的运动…' : '先做一次器材测试，再看观察到什么。'}</p><button className="mt-block-test-button" disabled={Boolean(activeTest)} onClick={() => runTest(card)}>{activeTest === card.id ? '测试进行中…' : tested.includes(card.id) ? '再测一次' : `测试${card.item}`}</button><div>{features.map((feature) => <button key={feature} disabled={!tested.includes(card.id)} className={sorted[card.id] === feature ? (feature === card.feature ? 'is-correct' : 'is-wrong') : ''} onClick={() => {
      setSorted((current) => ({ ...current, [card.id]: feature }));
      onCoach(feature === card.feature ? `${card.item}：${feature}。` : `请观察 ${card.item} 有没有平面、曲面，以及能否稳定放置。`);
    }}>{feature}</button>)}</div></article>)}</div>
    <p className="mt-task-equation">{complete ? '✓ 器材检测完成：球最容易各向滚动；圆柱可滚也可立；方体和长方体都有稳定平面。' : `已测试 ${tested.length} / 4 件器材；测试后再记录特点。`}</p>
  </section>;
}

/** P78-P80：在数轴上按顺序走数、找相邻数并比较远近。 */
function TwentyNumberRail({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const path = Array.from({ length: 11 }, (_, index) => 10 + index);
  const [index, setIndex] = usePersistedTask<number>('twenty-number-rail', 0);
  const [near, setNear] = usePersistedTask<string>('twenty-number-near', '');
  const [nearEighteen, setNearEighteen] = usePersistedTask<string>('twenty-number-near-eighteen', '');
  const complete = index === path.length && near === '10' && nearEighteen === '20';
  useCompletion(complete, onDone, onCoach, '已从 10 走到 20，并用数轴距离判断 12 更接近 10、18 更接近 20。');
  return <section className="mt-textbook-task mt-card-organizer mt-theme-scene mt-reading-rail-scene" aria-label="二十以内数轴轨道">
    <header><small>教材 P78-P80 · 阅读书页轨道</small><h3>从第 10 页依次翻到第 20 页，再比较离哪本书更近</h3></header>
    <div className="mt-reading-rail-sign"><span>📖 第 10 页</span><b>每翻一页，页码加 1</b><span>第 20 页 📘</span></div>
    <div className="mt-card-sort-grid"><article className={index === path.length ? 'done' : ''}><b>数轴轨道</b><div>{path.map((value) => <button key={value} disabled={index === path.length || value !== path[index]} className={value < 10 + index ? 'is-correct' : value === path[index] ? 'chosen' : ''} onClick={() => {
      setIndex((current) => current + 1);
      onCoach(value === 20 ? '走到 20；每向右一格增加 1。' : `现在是 ${value}，右边相邻数是 ${value + 1}。`);
    }}>{value}</button>)}</div></article><article className={near === '10' ? 'done' : ''}><b>12 距离谁更近？</b><div>{['10', '20'].map((value) => <button key={value} className={near === value ? (value === '10' ? 'is-correct' : 'is-wrong') : ''} onClick={() => { setNear(value); onCoach(value === '10' ? '12 到 10 相差 2，到 20 相差 8，所以更接近 10。' : '在数轴上数距离：12 到 20 比到 10 更远。'); }}>{value}</button>)}</div></article><article className={nearEighteen === '20' ? 'done' : ''}><b>18 距离谁更近？</b><div>{['10', '20'].map((value) => <button key={value} className={nearEighteen === value ? (value === '20' ? 'is-correct' : 'is-wrong') : ''} onClick={() => { setNearEighteen(value); onCoach(value === '20' ? '18 到 20 相差 2，到 10 相差 8，所以更接近 20。' : '在数轴上数距离：18 到 10 比到 20 更远。'); }}>{value}</button>)}</div></article></div>
    <p className="mt-task-equation">{complete ? '✓ 10～20 相邻每次差 1；12 更接近 10，18 更接近 20。' : `已走 ${index} / 11 格；还要完成两道距离比较。`}</p>
  </section>;
}

/** P81：把一个十和几个一放进算式，区分十加几、十几减几和十几减十。 */
function TenOnesEquationBoard({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const rows = [
    { id: 'add', prompt: '1 个十和 3 个一合起来', answer: '10＋3＝13' },
    { id: 'take-ones', prompt: '13 去掉 3 个一', answer: '13－3＝10' },
    { id: 'take-ten', prompt: '13 去掉 1 个十', answer: '13－10＝3' },
  ];
  const options = ['10＋3＝13', '13－3＝10', '13－10＝3', '10＋3＝10'];
  const [selected, setSelected] = usePersistedTask<Record<string, string>>('ten-ones-equation-board', {});
  const complete = rows.every((row) => selected[row.id] === row.answer);
  useCompletion(complete, onDone, onCoach, '一个十和三个一的三道相关算式都已用数位关系解释清楚。');
  return <section className="mt-textbook-task mt-card-organizer mt-theme-scene mt-stationery-scene" aria-label="十几加减数位算式板">
    <header><small>教材 P81 · 笔筒里的十和桌上的一</small><h3>用“1 筒和 3 支铅笔”给每个变化配上算式</h3></header>
    <div className="mt-stationery-tray"><span>🖊️ × 10</span><b>1 筒 + 3 支 = 13 支</b><span>🖊️🖊️🖊️</span></div>
    <div className="mt-card-sort-grid">{rows.map((row) => <article key={row.id} className={selected[row.id] === row.answer ? 'done' : ''}><b>{row.prompt}</b><div>{options.map((option) => <button key={option} className={selected[row.id] === option ? (option === row.answer ? 'is-correct' : 'is-wrong') : ''} onClick={() => { setSelected((current) => ({ ...current, [row.id]: option })); onCoach(option === row.answer ? `${option} 保留了十和一的数量关系。` : '先看拿走的是几个一、一个十，还是把十和一合起来。'); }}>{option}</button>)}</div></article>)}</div>
    <p className="mt-task-equation">{complete ? '✓ 10＋3＝13，13－3＝10，13－10＝3；十和一的位置没有混淆。' : '每一行都要用十和一的变化检查算式。'}</p>
  </section>;
}

/** P82：把端点放到第 10 与第 15，再逐个标出中间四人。 */
function BetweenPeopleBoard({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const middle = [11, 12, 13, 14];
  const [marked, setMarked] = usePersistedTask<number[]>('between-people-board', []);
  const complete = middle.every((person) => marked.includes(person));
  useCompletion(complete, onDone, onCoach, '第 10 与第 15 之间的第 11、12、13、14 人已逐个标出，共 4 人。');
  return <section className="mt-textbook-task mt-card-organizer mt-theme-scene mt-reading-queue-scene" aria-label="两人之间位置板">
    <header><small>教材 P82 · 阅读队列中的间隔</small><h3>第 10 位和第 15 位在读书，只标出两人之间的读者</h3></header>
    <div className="mt-card-sort-grid"><article><div className="mt-reading-queue">{[10, ...middle, 15].map((person) => <button key={person} disabled={person !== 10 && person !== 15 && person !== middle[marked.length]} className={person === 10 || person === 15 ? 'chosen' : marked.includes(person) ? 'is-correct' : ''} onClick={() => {
      if (person === 10 || person === 15) { onCoach('第 10 和第 15 是端点，不计入“之间”的人数。'); return; }
      setMarked((current) => [...current, person]);
      onCoach(person === 14 ? '中间的 11、12、13、14 都标好了，共 4 人。' : `第 ${person} 人在中间，继续标下一个。`);
    }}>{person === 10 || person === 15 ? `📖 端点 ${person}` : `🧒 第 ${person} 人${marked.includes(person) ? ' ✓' : ''}`}</button>)}</div></article></div>
    <p className="mt-task-equation">{complete ? '✓ 15－10－1＝4；两端不算在“之间”。' : `已标 ${marked.length} / 4 个中间位置。`}</p>
  </section>;
}

/** P85-P87：在十位个位、数序和比较之间来回转换，作为第四单元复习证据。 */
function Unit4ReviewWorkbench({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const [state, setState] = usePersistedTask<Record<string, string>>('unit4-review-workbench', {});
  const write = (key: string, value: string) => setState((current) => ({ ...current, [key]: value.replace(/\s/g, '').replace(/\+/g, '＋').replace(/=/g, '＝') }));
  const pairs = [['17', '1', '7'], ['15', '1', '5'], ['18', '1', '8'], ['20', '2', '0']];
  const placeDone = pairs.every(([number, tens, ones]) => state[`${number}-tens`] === tens && state[`${number}-ones`] === ones);
  const unknowns = [['7＋□＝10', '3'], ['10＋□＝12', '2'], ['11＋□＝13', '2']];
  const colorEquations = [['0＋8', '8'], ['10－2', '8'], ['3＋5', '8'], ['12＋1', '13'], ['13＋0', '13'], ['11＋2', '13'], ['14－1', '13'], ['15－1', '14'], ['10＋4', '14'], ['14＋0', '14']];
  const colorDone = colorEquations.every(([equation, answer]) => state[`color-${equation}`] === answer);
  const complete = state.map === '13' && placeDone && state.stops === '6' && state.path === '桃子' && unknowns.every(([equation, answer]) => state[equation] === answer) && colorDone && state.oddEven === '偶数' && (state.reflection ?? '').trim().length >= 6;
  useCompletion(complete, onDone, onCoach, 'P85-P87 的知识图、十位个位、数序游戏、计算涂色、单双数和反思都已保存。');
  return <section className="mt-textbook-task mt-card-organizer" aria-label="第四单元教材复习单">
    <header><small>教材 P85-P87 · 整理、练一练、数学游戏</small><h3>完成知识图、数位练习、数序游戏和单双数发现</h3></header><div className="mt-card-sort-grid">
      <article className={state.map === '13' ? 'done' : ''}><b>① P85 知识图：1 个十和 3 个一是多少？</b><input aria-label="P85知识图数" inputMode="numeric" value={state.map ?? ''} onChange={(event) => write('map', event.target.value.replace(/[^0-9]/g, ''))} /></article>
      <article className={placeDone ? 'done' : ''}><b>② P86 画一画：填写十位和个位</b>{pairs.map(([number]) => <label key={number}>{number}：十位<input aria-label={`${number}的十位`} inputMode="numeric" maxLength={1} value={state[`${number}-tens`] ?? ''} onChange={(event) => write(`${number}-tens`, event.target.value)} /> 个位<input aria-label={`${number}的个位`} inputMode="numeric" maxLength={1} value={state[`${number}-ones`] ?? ''} onChange={(event) => write(`${number}-ones`, event.target.value)} /></label>)}</article>
      <article className={state.stops === '7' && state.path === '桃子' ? 'done' : ''}><b>③ 数序：云台路到动物园中间停几站？按得数每次加 1 走到什么水果？</b><label>中间站数<input aria-label="P86中间站数" inputMode="numeric" value={state.stops ?? ''} onChange={(event) => write('stops', event.target.value.replace(/[^0-9]/g, ''))} /></label><label>水果<VoiceField ariaLabel="P86水果路径" value={state.path ?? ''} placeholder="说出水果的名字" onChange={(next) => write('path', next)} /></label></article>
      <article className={unknowns.every(([equation, answer]) => state[equation] === answer) ? 'done' : ''}><b>④ 填未知数</b>{unknowns.map(([equation]) => <label key={equation}>{equation}<input aria-label={`P86 ${equation}`} inputMode="numeric" maxLength={1} value={state[equation] ?? ''} onChange={(event) => write(equation, event.target.value.replace(/[^0-9]/g, ''))} /></label>)}</article>
      <article className={colorDone ? 'done' : ''}><b>⑤ P87 涂色游戏：给得数 8、13、14 的算式标出得数</b>{colorEquations.map(([equation]) => <label key={equation}>{equation}＝<input aria-label={`P87得数 ${equation}`} inputMode="numeric" maxLength={2} value={state[`color-${equation}`] ?? ''} onChange={(event) => write(`color-${equation}`, event.target.value.replace(/[^0-9]/g, ''))} /></label>)}</article>
      <article className={state.oddEven === '偶数' && (state.reflection ?? '').trim().length >= 6 ? 'done' : ''}><b>⑥ 玉米横截面上的颗粒一般是什么数？写下本单元收获</b><VoiceField ariaLabel="P87单双数" value={state.oddEven ?? ''} placeholder="说出来：奇数还是偶数" onChange={(next) => write('oddEven', next)} /><VoiceField multiline ariaLabel="第四单元成长档案" value={state.reflection ?? ''} placeholder="说出本单元的收获" onChange={(next) => write('reflection', next)} /></article>
    </div><p className={complete ? 'mt-feedback good' : 'mt-task-equation'}>{complete ? '✓ P85-P87 的教材任务都完成并保存了。' : '知识图、数位、数序、未知数、涂色和反思都要完成。'}</p>
  </section>;
}

/** P93-P95：移动两部分的位置，实际验证加数交换而总数不变。 */
function AddendExchangeBoard({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const [moved, setMoved] = usePersistedTask<string[]>('addend-exchange-board', []);
  const tasks = [
    { id: 'five-eight', left: '5＋8＝13', right: '8＋5＝13' },
    { id: 'four-nine', left: '4＋9＝13', right: '9＋4＝13' },
  ];
  const complete = tasks.every((task) => moved.includes(task.id));
  useCompletion(complete, onDone, onCoach, '两组加数都交换过位置；两部分没有改变，所以和仍是 13。');
  return <section className="mt-textbook-task mt-card-organizer mt-theme-scene mt-exchange-lab-scene" aria-label="加数交换操作板">
    <header><small>教材 P93-P95 · 交换收纳盒</small><h3>把两组圆片调换左右，观察总数是否改变</h3></header>
    <div className="mt-card-sort-grid">{tasks.map((task) => {
      const [first, second] = task.left.split('＝')[0].split('＋').map(Number);
      const swapped = moved.includes(task.id);
      const left = swapped ? second : first;
      const right = swapped ? first : second;
      return <article key={task.id} className={swapped ? 'done' : ''}><b>{swapped ? task.right : task.left}</b><div className="mt-exchange-boxes" aria-label={`左盒 ${left} 个圆片，右盒 ${right} 个圆片`}><span>{Array.from({ length: left }, () => '●').join(' ')}</span><i>⇄</i><span>{Array.from({ length: right }, () => '●').join(' ')}</span></div><small>左盒 {left} 个 ＋ 右盒 {right} 个 ＝ 13 个</small><button disabled={swapped} onClick={() => {
      setMoved((current) => [...current, task.id]);
      onCoach(`${task.left} 交换成 ${task.right}；只是位置换了，数量和结果都没变。`);
    }}>{swapped ? '✓ 已交换并比较' : '交换左右两部分'}</button></article>})}</div>
    <p className="mt-task-equation">{complete ? '✓ 5＋8＝8＋5，4＋9＝9＋4；交换加数，和不变。' : '每一组都要亲自交换一次，再比较总数。'}</p>
  </section>;
}

/** P99-P102：复习中比较凑十路线、相关算式和“求原来”的数量关系。 */
function Unit5ReviewWorkbench({ onCoach }: { onCoach: (text: string) => void }) {
  const [state, setState] = usePersistedTask('unit5-review-workbench', { strategy: '', family: '', original: '' });
  const complete = state.strategy === '8＋5＝10＋3＝13' && state.family === '13－8＝5' && state.original === '6＋5＝11';
  const choose = (key: 'strategy' | 'family' | 'original', value: string, answer: string, coach: string) => {
    setState((current) => ({ ...current, [key]: value }));
    onCoach(value === answer ? coach : '把数量带回凑十或部分整体图检查，不要只看数字大小。');
  };
  return <section className="mt-textbook-task mt-card-organizer mt-theme-scene mt-ten-storage-scene" aria-label="第五单元整理复习工作台">
    <header><small>教材 P99-P102 · 十格收纳复习台</small><h3>完成一条凑十路线、一组相关算式和一个“求原来”问题</h3></header>
    <div className="mt-ten-storage-note"><span>8 个先入盒</span><b>从 5 个中移 2 个，十格满</b><span>剩 3 个，合起来 13 个</span></div>
    <div className="mt-card-sort-grid"><article className={state.strategy === '8＋5＝10＋3＝13' ? 'done' : ''}><b>8＋5 怎样先凑十？</b><div>{['8＋5＝10＋3＝13', '8＋5＝10＋5＝15', '8＋5＝8＋3＝11'].map((value) => <button key={value} className={state.strategy === value ? (value === '8＋5＝10＋3＝13' ? 'is-correct' : 'is-wrong') : ''} onClick={() => choose('strategy', value, '8＋5＝10＋3＝13', '从 5 中拿 2 给 8，留下 3，得到 10＋3。')}>{value}</button>)}</div></article><article className={state.family === '13－8＝5' ? 'done' : ''}><b>8＋5＝13 的相关减法</b><div>{['13－8＝5', '8－5＝13', '13＋8＝5'].map((value) => <button key={value} className={state.family === value ? (value === '13－8＝5' ? 'is-correct' : 'is-wrong') : ''} onClick={() => choose('family', value, '13－8＝5', '整体 13 去掉部分 8，得到另一个部分 5。')}>{value}</button>)}</div></article><article className={state.original === '6＋5＝11' ? 'done' : ''}><b>领走 6 个，还剩 5 个，原来有多少？</b><div>{['6＋5＝11', '6－5＝1', '11－6＝5'].map((value) => <button key={value} className={state.original === value ? (value === '6＋5＝11' ? 'is-correct' : 'is-wrong') : ''} onClick={() => choose('original', value, '6＋5＝11', '求原来要把领走和剩下的两个部分合起来。')}>{value}</button>)}</div></article></div>
    <p className={complete ? 'mt-feedback good' : 'mt-task-equation'}>{complete ? '✓ 会凑十、会写相关减法，也能根据数量关系求原来。' : '三项都要通过数量关系完成；错误选择可修改。'}</p>
  </section>;
}

/** P101-P102：逐项保留原页练一练，不能用复习讲解或三题选择代替。 */
function Unit5TextbookWorksheet({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const calculations = [['3＋9', '12'], ['6＋7', '13'], ['5＋8', '13'], ['2＋9', '11'], ['3＋7', '10'], ['7＋5', '12'], ['10＋4', '14'], ['8－3', '5'], ['6＋6', '12'], ['7＋7', '14'], ['8＋8', '16'], ['9＋9', '18']];
  const unknowns = [['7＋□＝16', '9'], ['9＋□＝12', '3'], ['□＋3＝11', '8'], ['6＋□＝13', '7'], ['8＋□＝15', '7'], ['□＋4＝14', '10']];
  const [answers, setAnswers] = usePersistedTask<Record<string, string>>('unit5-textbook-worksheet', {});
  const set = (key: string, value: string) => setAnswers((current) => ({ ...current, [key]: value.replace(/\s/g, '').replace(/\+/g, '＋').replace(/=/g, '＝') }));
  const all = (items: string[][]) => items.every(([key, answer]) => answers[key] === answer);
  const calculationDone = all(calculations);
  const compareDone = answers.compare === '4＋9';
  const groupDone = ['6＋7', '7＋6', '8＋5', '8＋3', '9＋2', '10＋1'].every((value) => answers[`group-${value}`] === value);
  const blocksDone = answers.blocks === '7＋9＝16';
  const signsDone = ['＋', '－', '＋', '－'].every((value, index) => answers[`sign-${index}`] === value);
  const dumplingDone = answers.dumplings === '8＋5＝13';
  const unknownDone = all(unknowns);
  const thinkingDone = answers.thinking === '14';
  const complete = calculationDone && compareDone && groupDone && blocksDone && signsDone && dumplingDone && unknownDone && thinkingDone;
  useCompletion(complete, onDone, onCoach, 'P101-P102 的口算、比较、同和算式组、积木、符号、饺子、未知数和排队思考题都完成并保存了。');
  return <section className="mt-textbook-task mt-card-organizer" aria-label="第五单元教材练习单">
    <header><small>教材 P101-P102 · 练一练与思考题</small><h3>逐项完成原页练习，不把整页缩成几道选择题</h3></header>
    <div className="mt-card-sort-grid">
      <article className={calculationDone ? 'done' : ''}><b>① 口算</b><div className="mt-p22-inputs">{calculations.map(([equation]) => <label key={equation}>{equation}＝<input aria-label={`P101口算 ${equation}`} inputMode="numeric" maxLength={2} value={answers[equation] ?? ''} onChange={(event) => set(equation, event.target.value.replace(/[^0-9]/g, ''))} /></label>)}</div></article>
      <article className={compareDone ? 'done' : ''}><b>② 比一比：4＋9 和 6＋5，谁的得数大？</b><VoiceField math ariaLabel="P101比较得数大" value={answers.compare ?? ''} placeholder="说算式，如 4＋9" onChange={(next) => set('compare', next)} /></article>
      <article className={groupDone ? 'done' : ''}><b>③ 写出同得数的算式组</b><small>5＋8＝13：6＋7、7＋6、8＋5；7＋4＝11：8＋3、9＋2、10＋1。</small>{['6＋7', '7＋6', '8＋5', '8＋3', '9＋2', '10＋1'].map((value) => <VoiceField key={value} math ariaLabel={`填写同和算式 ${value}`} value={answers[`group-${value}`] ?? ''} placeholder="说算式" onChange={(next) => set(`group-${value}`, next)} />)}</article>
      <article className={blocksDone ? 'done' : ''}><b>④ 积木：7 块和 9 块一共多少？</b><VoiceField math ariaLabel="P101积木列式" value={answers.blocks ?? ''} placeholder="说算式，如 7＋9＝16" onChange={(next) => set('blocks', next)} /></article>
      <article className={signsDone ? 'done' : ''}><b>⑤ 填 ＋ 或 －</b>{[['8○5＝13', '＋'], ['10○5＝5', '－'], ['9○6＝15', '＋'], ['16○10＝6', '－']].map(([equation], index) => <label key={equation}>{equation}<input aria-label={`P101运算符 ${index + 1}`} maxLength={1} value={answers[`sign-${index}`] ?? ''} onChange={(event) => set(`sign-${index}`, event.target.value)} /></label>)}</article>
      <article className={dumplingDone ? 'done' : ''}><b>⑥ 吃了 8 个饺子，还剩 5 个，原来多少？</b><VoiceField math ariaLabel="P102饺子列式" value={answers.dumplings ?? ''} placeholder="说算式，如 8＋5＝13" onChange={(next) => set('dumplings', next)} /></article>
      <article className={unknownDone ? 'done' : ''}><b>⑦ 填未知加数</b>{unknowns.map(([equation]) => <label key={equation}>{equation}<input aria-label={`P102未知数 ${equation}`} inputMode="numeric" maxLength={2} value={answers[equation] ?? ''} onChange={(event) => set(equation, event.target.value.replace(/[^0-9]/g, ''))} /></label>)}</article>
      <article className={thinkingDone ? 'done' : ''}><b>⑧ 思考：前面 9 人、后面 5 人，一共有多少人？</b><input aria-label="P102排队答案" inputMode="numeric" maxLength={2} value={answers.thinking ?? ''} onChange={(event) => set('thinking', event.target.value.replace(/[^0-9]/g, ''))} /></article>
    </div><p className={complete ? 'mt-feedback good' : 'mt-task-equation'}>{complete ? '✓ P101-P102 的 8 组教材任务都完成并保存了。' : '每一组都需要留下自己的计算或列式；完成其中一组不代表整页完成。'}</p>
  </section>;
}

/** P103-P104：把数、数位、分合、凑十和运算方法实际连成知识图。 */
function WholeBookKnowledgeMap({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const links = [
    { id: 'number-ranges', left: '20 以内的数', right: '0～9 和 10～20' }, { id: 'place-value', left: '十位和个位', right: '12 是 1 个十和 2 个一' },
    { id: 'calculation', left: '20 以内的加、减法', right: '不进位和进位' }, { id: 'giraffes', left: '2 只和 4 只长颈鹿', right: '2＋4＝6' },
  ];
  const [connected, setConnected] = usePersistedTask<string[]>('whole-book-knowledge-map', []);
  const [question, setQuestion] = usePersistedTask('whole-book-knowledge-question', '');
  const [equation, setEquation] = usePersistedTask('whole-book-knowledge-equation', '');
  const [answer, setAnswer] = usePersistedTask('whole-book-knowledge-answer', '');
  const complete = links.every((link) => connected.includes(link.id)) && question.trim().length >= 4 && equation === '2＋4＝6' && answer === '6';
  useCompletion(complete, onDone, onCoach, '数的范围、数位、两类加减和长颈鹿问题都已整理进知识图。');
  return <section className="mt-textbook-task mt-card-organizer mt-theme-scene mt-archive-scene" aria-label="全册数与运算知识图">
    <header><small>教材 P103-P104 · 数学探险档案馆：知识总图</small><h3>整理数与运算知识，并根据两组长颈鹿提出问题</h3></header>
    <div className="mt-archive-shelf"><span>🔢 数的档案</span><span>🧮 运算的档案</span><span>🦒 问题的档案</span></div>
    <div className="mt-card-sort-grid">{links.map((link) => <article key={link.id} className={connected.includes(link.id) ? 'done' : ''}><b>{link.left} → {link.right}</b><button disabled={connected.includes(link.id)} onClick={() => {
      setConnected((current) => [...current, link.id]);
      onCoach(`${link.left} 和 ${link.right} 已连上；回到题目时可以用这条关系选择方法。`);
    }}>{connected.includes(link.id) ? '✓ 已连线' : '连上这条关系'}</button></article>)}</div>
    <label>我还能提出的问题<VoiceField multiline maxLength={50} ariaLabel="我还能提出的问题" value={question} placeholder="说出来，例如：两组长颈鹿一共有几只？" onChange={(next) => { setQuestion(next); onCoach('问题要包含图中的数量关系，才能列式解答。'); }} /></label>
    <div className="mt-answer-row">{['2＋4＝6', '6－2＝4', '2＋4＝5'].map((value) => <button key={value} className={equation === value ? (value === '2＋4＝6' ? 'is-correct' : 'is-wrong') : ''} onClick={() => { setEquation(value); onCoach(value === '2＋4＝6' ? '两组长颈鹿合起来，用加法得到 6。' : '问题问一共，要把 2 和 4 合起来。'); }}>{value}</button>)}</div><label>我的答案<input aria-label="长颈鹿问题答案" inputMode="numeric" maxLength={1} value={answer} onChange={(event) => setAnswer(event.target.value.replace(/[^0-9]/g, '').slice(0, 1))} /></label>
    <p className="mt-task-equation">{complete ? '✓ 数的范围、数位、两类加减和 2＋4＝6 都已整理，并提出、列式和解答了问题。' : '每一条关系都要连接；再根据两组长颈鹿写问题、列式并作答。'}</p>
  </section>;
}

/** P106：按数序走数表路径，保留入口、方向、前后数和出口的过程。 */
function NumberPathGrid({ onCoach }: { onCoach: (text: string) => void }) {
  const path = [8, 9, 10, 11, 12];
  const [index, setIndex] = usePersistedTask('number-path-grid', 0);
  const complete = index === path.length;
  const expected = path[index];
  return <section className="mt-textbook-task mt-card-organizer mt-theme-scene mt-archive-scene" aria-label="数表路径">
    <header><small>教材 P106 · 数表探险走廊</small><h3>从 8 开始，每次向右走一格</h3></header>
    <div className="mt-archive-shelf"><span>🚪 入口：8</span><b>每走一格 +1</b><span>🏁 出口：12</span></div>
    <div className="mt-card-sort-grid"><article className={complete ? 'done' : ''}><b>入口 8 → 出口 12</b><div>{[8, 9, 10, 11, 12].map((value) => <button key={value} disabled={index >= path.length || value < expected} className={value < index + 8 ? 'is-correct' : value === expected ? 'chosen' : ''} onClick={() => {
      if (value !== expected) { onCoach('沿着数表向右时，每走一格只增加 1。'); return; }
      setIndex((current) => current + 1);
      onCoach(value === 12 ? '到出口了：8、9、10、11、12 每一步都加 1。' : `现在在 ${value}，下一格是 ${value + 1}。`);
    }}>{value}</button>)}</div></article></div>
    <p className="mt-task-equation">{complete ? '✓ 已走到出口；10 的左边是 9，右边是 11。' : `已走 ${index} / ${path.length} 格；下一格是 ${expected ?? 12}。`}</p>
  </section>;
}

/** P107：在加法表中涂出得数为 10 的格子，利用同和算式发现互补关系。 */
function TenSumColorGrid({ onCoach }: { onCoach: (text: string) => void }) {
  const cards = [
    { id: 'one-nine', text: '1＋9', total: 10 }, { id: 'two-eight', text: '2＋8', total: 10 },
    { id: 'three-seven', text: '3＋7', total: 10 }, { id: 'four-six', text: '4＋6', total: 10 },
    { id: 'five-five', text: '5＋5', total: 10 }, { id: 'six-five', text: '6＋5', total: 11 },
  ];
  const [colored, setColored] = usePersistedTask<string[]>('ten-sum-color-grid', []);
  const targets = cards.filter((card) => card.total === 10).map((card) => card.id);
  const complete = targets.every((id) => colored.includes(id)) && colored.every((id) => targets.includes(id));
  return <section className="mt-textbook-task mt-card-organizer mt-theme-scene mt-archive-scene" aria-label="得数十涂色加法表">
    <header><small>教材 P107 · 凑十印章墙</small><h3>点击给得数正好是 10 的格子盖章</h3></header>
    <div className="mt-archive-shelf"><span>🎯 目标：10</span><b>只有正好凑十才能盖章</b><span>已盖 {colored.length} 枚</span></div>
    <div className="mt-card-sort-grid">{cards.map((card) => {
      const active = colored.includes(card.id);
      return <article key={card.id} className={active && card.total === 10 ? 'done' : ''}><button className={active ? (card.total === 10 ? 'is-correct' : 'is-wrong') : ''} aria-pressed={active} onClick={() => {
        setColored((values) => values.includes(card.id) ? values.filter((id) => id !== card.id) : [...values, card.id]);
        onCoach(card.total === 10 ? `${card.text} 的和是 10，可以涂色。` : `${card.text} 的和是 11，不应涂在得数 10 的一组。`);
      }}>{active ? '■' : '□'} {card.text}</button></article>;
    })}</div>
    <p className="mt-task-equation">{complete ? '✓ 每一对加数合起来都是 10；一个加数加 1，另一个就减 1。' : `已涂 ${colored.length} 格；只涂得数是 10 的算式。`}</p>
  </section>;
}

/** P110：猴群、印章、不等式与思考题都来自同一页，不能折叠为一题替代。 */
function QuestionComposer({ onCoach }: { onCoach: (text: string) => void }) {
  const [state, setState] = usePersistedTask('question-composer', {
    monkeyQuestions: ['', ''], monkeyEquations: ['', ''], stampBoxes: [] as number[], stampQuestion: '', stampAnswer: '', inequalities: ['', '', ''], reading: '',
  });
  const monkeyDone = state.monkeyQuestions.every((value) => value.trim().length >= 4) && state.monkeyEquations.every((value) => value.trim().length >= 3);
  const stampCounts = [4, 8, 4];
  const stampTotal = state.stampBoxes.reduce((sum, index) => sum + stampCounts[index], 0);
  const stampDone = state.stampBoxes.length === 2 && state.stampQuestion.trim().length >= 4 && state.stampAnswer === String(stampTotal);
  const inequalityDone = (() => {
    if (state.inequalities.some((value) => value.trim() === '')) return false;
    const [first, second, third] = state.inequalities.map(Number);
    return Number.isInteger(first) && first >= 0 && first <= 5 && Number.isInteger(second) && second >= 0 && second <= 7 && Number.isInteger(third) && third >= 0 && third <= 5;
  })();
  const complete = monkeyDone && stampDone && inequalityDone && state.reading === '小明';
  const write = (key: 'monkeyQuestions' | 'monkeyEquations' | 'inequalities', index: number, value: string) => setState((current) => ({ ...current, [key]: current[key].map((item, itemIndex) => itemIndex === index ? value : item) }));
  return <section className="mt-textbook-task mt-open-observation mt-theme-scene mt-archive-scene" aria-label="P110综合问题工作台">
    <header><small>教材 P110 · 看图提问、印章选择、填数与思考</small><h3>把这一页的四类综合任务都留下自己的过程</h3></header>
    <div className="mt-card-sort-grid"><article className={monkeyDone ? 'done' : ''}><b>① 猴群图：提出两道不同的数学问题并列式</b><small>可以按左、右两棵树或树上、树下观察；先数清，再写问题和算式。</small>{[0, 1].map((index) => <label key={index}>第 {index + 1} 题<VoiceField multiline ariaLabel={`猴群问题第 ${index + 1} 题`} maxLength={50} value={state.monkeyQuestions[index]} placeholder="说出来，例如：左边和右边一共有几只猴子？" onChange={(next) => write('monkeyQuestions', index, next)} /><VoiceField math ariaLabel={`猴群算式第 ${index + 1} 题`} value={state.monkeyEquations[index]} placeholder="说算式，如 8＋8＝16" onChange={(next) => write('monkeyEquations', index, next)} /></label>)}</article>
    <article className={stampDone ? 'done' : ''}><b>② 三盒小印章中买两盒：可能买多少枚？</b><small>先选择恰好两盒；图中三盒分别有 4、8、4 枚。</small><div>{stampCounts.map((count, index) => <button key={index} className={state.stampBoxes.includes(index) ? 'chosen' : ''} onClick={() => setState((current) => {
      const selected = current.stampBoxes.includes(index) ? current.stampBoxes.filter((value) => value !== index) : current.stampBoxes.length < 2 ? [...current.stampBoxes, index] : current.stampBoxes;
      return { ...current, stampBoxes: selected, stampAnswer: '' };
    })}>第 {index + 1} 盒：{count} 枚</button>)}</div><label>我提出的问题<VoiceField ariaLabel="印章选择问题" value={state.stampQuestion} placeholder="说出你的问题" onChange={(next) => setState((current) => ({ ...current, stampQuestion: next }))} /></label><label>可能买了多少枚<input aria-label="印章选择答案" inputMode="numeric" value={state.stampAnswer} onChange={(event) => setState((current) => ({ ...current, stampAnswer: event.target.value.replace(/[^0-9]/g, '') }))} /></label></article>
    <article className={inequalityDone ? 'done' : ''}><b>③ 在方框里填一个合适的数</b><div className="mt-p22-inputs"><label>9＋<input aria-label="9加几小于15" inputMode="numeric" maxLength={1} value={state.inequalities[0]} onChange={(event) => write('inequalities', 0, event.target.value.replace(/[^0-9]/g, ''))} />＜15</label><label>18－<input aria-label="18减几大于10" inputMode="numeric" maxLength={1} value={state.inequalities[1]} onChange={(event) => write('inequalities', 1, event.target.value.replace(/[^0-9]/g, ''))} />＞10</label><label>13＋<input aria-label="13加几小于19" inputMode="numeric" maxLength={1} value={state.inequalities[2]} onChange={(event) => write('inequalities', 2, event.target.value.replace(/[^0-9]/g, ''))} />＜19</label></div><small>每题可以有不止一种填法；填一个满足不等式的数。</small></article>
    <article className={state.reading === '小明' ? 'done' : ''}><b>④ 小明和小华读同一本书：小明读 8 页，小华读 9 页，谁剩下的多？</b><div>{['小明', '小华'].map((name) => <button key={name} className={state.reading === name ? (name === '小明' ? 'is-correct' : 'is-wrong') : ''} onClick={() => { setState((current) => ({ ...current, reading: name })); onCoach(name === '小明' ? '同一本书，读得少的人剩得多；8 比 9 少，所以小明剩得多。' : '两人读同一本书，要比较谁读得少。'); }}>{name}</button>)}</div></article></div>
    <p className={complete ? 'mt-feedback good' : 'mt-task-equation'}>{complete ? '✓ 猴群两题、印章两盒、不等式和读书思考题都完成了。' : '四个区域都要留下可检查的过程；猴群题可以有不同的正确提问。'}</p>
  </section>;
}

/** P108：两层各 4 块拼成 2×2×2 大正方体，留下每一块的拼搭过程。 */
function SolidReviewBuilder({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const cells = Array.from({ length: 8 }, (_, index) => `cube-${index}`);
  const [placed, setPlaced] = usePersistedTask<string[]>('solid-review-builder', []);
  const complete = placed.length === cells.length;
  useCompletion(complete, onDone, onCoach, '两层各 4 块小正方体已经拼好，共用 8 块组成一个大正方体。');
  return <section className="mt-textbook-task mt-solid-task mt-theme-scene mt-archive-scene" aria-label="二乘二乘二正方体拼搭">
    <header><small>教材 P108 · 立体档案复原台</small><h3>先拼满第一层，再拼满第二层</h3></header>
    <div className="mt-solid-grid compose">{cells.map((cell, index) => <button key={cell} className={placed.includes(cell) ? 'cube' : index === placed.length ? 'target' : ''} disabled={index > placed.length} aria-label={`第 ${index < 4 ? '一' : '二'} 层第 ${index % 4 + 1} 块`} onClick={() => {
      if (index !== placed.length) { onCoach('先把当前层从左到右放满，再放上一层。'); return; }
      setPlaced((values) => [...values, cell]);
      onCoach(index === 7 ? '两层都放满了：4 加 4 是 8。' : `已放第 ${index + 1} 块，继续拼${index < 3 ? '第一层' : '第二层'}。`);
    }}>{placed.includes(cell) ? '■' : '□'}</button>)}</div>
    <p className="mt-task-equation">已拼 {placed.length} / 8 块 {complete ? '· 2×2×2 大正方体完成' : ''}</p>
  </section>;
}

/** P109：把“还剩”和“求原来”放在同一关系板上比较，并用反向算式检查。 */
function RelationChainBoard({ onCoach }: { onCoach: (text: string) => void }) {
  const [state, setState] = usePersistedTask('relation-chain-board', { remain: '', original: '', check: '' });
  const complete = state.remain === '12－5＝7' && state.original === '6＋7＝13' && state.check === '7＋5＝12';
  const choose = (key: 'remain' | 'original' | 'check', value: string, answer: string, coach: string) => {
    setState((current) => ({ ...current, [key]: value }));
    onCoach(value === answer ? coach : '先看问题问的是剩下、原来，还是要检查已经算出的结果。');
  };
  return <section className="mt-textbook-task mt-card-organizer mt-theme-scene mt-archive-scene" aria-label="数量关系算式链">
    <header><small>教材 P109 · 关系档案核验台</small><h3>同样是加减法，先辨认问题结构</h3></header>
    <div className="mt-card-sort-grid">
      <article className={state.remain === '12－5＝7' ? 'done' : ''}><b>原有 12 本，借走 5 本，还剩？</b><div>{['12－5＝7', '12＋5＝17'].map((value) => <button key={value} className={state.remain === value ? (value === '12－5＝7' ? 'is-correct' : 'is-wrong') : ''} onClick={() => choose('remain', value, '12－5＝7', '从原来总数中去掉借走的部分。')}>{value}</button>)}</div></article>
      <article className={state.original === '6＋7＝13' ? 'done' : ''}><b>吃掉 6 个，还剩 7 个，原来？</b><div>{['6＋7＝13', '7－6＝1'].map((value) => <button key={value} className={state.original === value ? (value === '6＋7＝13' ? 'is-correct' : 'is-wrong') : ''} onClick={() => choose('original', value, '6＋7＝13', '原来由吃掉和剩下两个部分合成。')}>{value}</button>)}</div></article>
      <article className={state.check === '7＋5＝12' ? 'done' : ''}><b>怎样检查 12－5＝7？</b><div>{['7＋5＝12', '12＋5＝7'].map((value) => <button key={value} className={state.check === value ? (value === '7＋5＝12' ? 'is-correct' : 'is-wrong') : ''} onClick={() => choose('check', value, '7＋5＝12', '剩下的和借走的合起来，应回到原来数量。')}>{value}</button>)}</div></article>
    </div>
    <p className="mt-task-equation">{complete ? '✓ 已完成剩余、原来与反向检查三种数量关系。' : '每一栏先读问题，再选能表示数量关系的算式。'}</p>
  </section>;
}

/**
 * 斜投影小正方体：前面 100×100，深度往右上偏 28，三个面按「右→上→前」绘制；
 * 多块拼合时按位置平移 100 即面贴面相接，后画的块正确遮挡先画块的拼接缝。
 * empty/target/placed/ghost 四种状态只换面的配色（见 math-textbook-lab.css）。
 */
export function IsoBlock({ state }: { state: 'empty' | 'target' | 'placed' | 'ghost' }) {
  return <svg viewBox="0 0 128 128" className={`mt-iso-block is-${state}`} aria-hidden="true">
    <polygon className="mt-iso-right" points="100,28 128,0 128,100 100,128" />
    <polygon className="mt-iso-top" points="0,28 28,0 128,0 100,28" />
    <polygon className="mt-iso-front" points="0,28 100,28 100,128 0,128" />
  </svg>;
}

/** 把若干小正方体按 100px 栅格位置合成一幅图；数组顺序=绘制顺序（先下后上、先左后右）。 */
export function OblComposition({ positions, scale = 1, state = 'placed', className }: { positions: Array<{ x: number; y: number }>; scale?: number; state?: 'placed' | 'target' | 'empty'; className?: string }) {
  const minX = Math.min(...positions.map((p) => p.x));
  const minY = Math.min(...positions.map((p) => p.y));
  const width = Math.max(...positions.map((p) => p.x)) + 128 - minX;
  const height = Math.max(...positions.map((p) => p.y)) + 128 - minY;
  return <span className={className} aria-hidden="true" style={{ position: 'relative', display: 'block', width: width * scale, height: height * scale }}>
    {positions.map((p, index) => <i key={index} className="mt-ob-cube" style={{ left: (p.x - minX) * scale, top: (p.y - minY) * scale, width: 128 * scale, height: 128 * scale }}><IsoBlock state={state} /></i>)}
  </span>;
}

function SolidBuildTask({ compose, onDone, onCoach }: { compose: boolean; onDone: () => void; onCoach: (text: string) => void }) {
  const target = compose ? ['0-1', '1-1', '2-1', '3-1'] : ['0-2', '1-2', '1-1', '2-2'];
  const [placed, setPlaced] = usePersistedTask<string[]>(compose ? 'solid-compose' : 'solid-building', []);
  const [rotation, setRotation] = usePersistedTask<string>(compose ? 'solid-compose-rotation' : 'solid-building-rotation', '');
  const [stability, setStability] = usePersistedTask<string>('solid-building-stability', '');
  const built = target.every((cell) => placed.includes(cell));
  const complete = built && (compose ? rotation === '相同拼法' : stability === '稳稳的');
  useCompletion(complete, onDone, onCoach, compose ? '4 个小正方体已经拼成长方体，转动它也不会改变连接方式。' : '底座平稳、上面有支撑，积木都搭好了。');
  // 拼搭位按斜投影真实铺排：相邻位 x 相差 100（面贴面），上一层 y 相差 100（叠在正上方）；
  // 绘制顺序=遮挡顺序：先下层后上层、同层从左到右。格位沿用旧持久化键。
  const slots = compose
    ? [0, 1, 2, 3].map((col) => ({ cell: `${col}-1`, x: col * 100, y: 0, label: `第 ${col + 1} 块的位置` }))
    : [
      ...[0, 1, 2].map((col) => ({ cell: `${col}-2`, x: col * 100, y: 100, label: `底座第 ${col + 1} 块` })),
      { cell: '0-1', x: 0, y: 0, label: '第二层左边' },
      { cell: '1-1', x: 100, y: 0, label: '第二层中间' },
      { cell: '2-1', x: 200, y: 0, label: '第二层右边' },
    ];
  const spanW = compose ? 428 : 328;
  const spanH = compose ? 128 : 228;
  const place = (cell: string) => {
    if (placed.includes(cell)) return;
    if (!compose && (cell === '0-1' || cell === '2-1')) { onCoach('塔顶要放在底座正中间，上面的重量才压得稳。'); return; }
    if (!compose && cell === '1-1' && !placed.includes('1-2')) { onCoach('先搭底座：底座放稳了，上面的积木才放得上。'); return; }
    if (!target.includes(cell)) { onCoach('先观察目标：小方块要和已有方块贴在一起，底座要平稳。'); return; }
    setPlaced((cells) => [...cells, cell]);
    onCoach(`放好了第 ${placed.length + 1} 块，再找一个和它相连的位置。`);
  };
  return <section className={`mt-textbook-task mt-solid-task mt-theme-scene ${compose ? 'mt-block-blueprint-scene' : 'mt-block-tower-scene'}`} aria-label={compose ? '四块积木拼长方体' : '积木稳定高塔'}>
    <header><small>教材 {compose ? 'P71-P72 · 积木城建工坊：蓝图拼装' : 'P69-P70 · 积木城建工坊：稳定高塔'}</small><h3>{compose ? '按蓝图用 4 个相同小正方体拼成长方体' : '所有积木都用上，搭出能通过轻推测试的稳定高塔'}</h3></header>
    <div className="mt-block-inventory"><span className="mt-iso-mini"><IsoBlock state="placed" /></span><span className="mt-iso-mini"><IsoBlock state="placed" /></span><span className="mt-iso-mini"><IsoBlock state="placed" /></span><span className="mt-iso-mini"><IsoBlock state="placed" /></span><b>{compose ? '蓝图：横向连成一体' : '原则：底座平稳、逐层支撑'}</b></div>
    <div className="mt-solid-iso-wrap">
      <div className={`mt-solid-iso-grid ${compose ? 'compose' : ''}`} style={{ width: spanW, height: spanH }}>{slots.map(({ cell, x, y, label }) => {
        const isPlaced = placed.includes(cell);
        const isTarget = target.includes(cell);
        const state = isPlaced ? 'placed' : isTarget ? 'target' : built ? 'ghost' : 'empty';
        return <button key={cell} className={isPlaced ? 'cube' : isTarget ? 'target' : ''} style={{ left: x, top: y }} disabled={!isTarget && !isPlaced && built} onClick={() => place(cell)} aria-label={label}><IsoBlock state={state} /></button>;
      })}</div>
      <div className="mt-solid-ground" aria-hidden="true" style={{ width: spanW }} />
    </div>
    {!compose && <div className="mt-answer-row mt-stability-check"><b>塔搭好后，轻轻推一下会怎样？</b>{['稳稳的', '会倒下'].map((answer) => <button key={answer} disabled={!built} className={stability === answer ? (answer === '稳稳的' ? 'is-correct' : 'is-wrong') : ''} onClick={() => { setStability(answer); onCoach(answer === '稳稳的' ? '底座平稳、上面有支撑，轻推也能保持住。' : '再观察底座是否平放、上层是否被支撑住。'); }}>{answer}</button>)}</div>}
    {compose && <div className="mt-answer-row"><b>把这条长方体转一转，还是同一种拼法吗？</b>{['相同拼法', '不同拼法'].map((answer) => <button key={answer} disabled={!built} className={rotation === answer ? (answer === '相同拼法' ? 'is-correct' : 'is-wrong') : ''} onClick={() => { setRotation(answer); onCoach(answer === '相同拼法' ? '转动没有改变方块之间的连接关系，所以仍是同一种拼法。' : '旋转只改变观看方向，不会增加或减少方块连接。'); }}>{answer}</button>)}</div>}
    <p className="mt-task-equation">已放 {placed.length} / 4 个小正方体 {complete ? (compose ? '· 长方体拼搭完成' : '· 稳定高塔拼搭完成') : compose && built ? '· 再判断旋转后的拼法' : ''}</p>
  </section>;
}

/** P70-P72：按「全部材料拼搭 → 做一做 → 练一练」的教材节奏组织成三站任务。 */
function SolidTextbookPracticeBoard({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const [state, setState] = usePersistedTask('solid-textbook-practice', { materials: [] as string[], base: '', top: '', formChoices: [] as string[], rotation: '', matches: {} as Record<string, string>, counts: ['', '', '', ''], next: '', reflection: '' });
  const materials = ['1 个正方体', '5 个长方体', '1 个球', '1 个圆柱'];
  const materialShapes: Record<string, SolidShapeKind> = { '1 个正方体': 'cube', '5 个长方体': 'cuboid', '1 个球': 'ball', '1 个圆柱': 'cylinder' };
  const formChoices = ['4 个排成一行', '2 个一排，叠两层'];
  const objects = [{ item: '胶棒', shape: '圆柱' }, { item: '魔方', shape: '正方体' }, { item: '玻璃球', shape: '球' }, { item: '文具盒', shape: '长方体' }, { item: '茶叶盒', shape: '长方体' }];
  const shapeNames = ['长方体', '正方体', '球', '圆柱'];
  // 组合图三座塔自上而下的图形；合计恰好是长方体 5、正方体 2、球 2、圆柱 2。
  const countTowers: SolidShapeKind[][] = [['ball', 'cube', 'cuboid', 'cuboid'], ['ball', 'cylinder', 'cuboid', 'cuboid'], ['cylinder', 'cuboid', 'cube']];
  const patternRow: SolidShapeKind[] = ['cylinder', 'cube', 'ball', 'cylinder', 'cube', 'ball'];
  const selectedForms = state.formChoices ?? [];
  const chosenMaterials = state.materials ?? [];
  const matches = state.matches ?? {};
  const chooseMaterial = (value: string) => setState((current) => ({ ...current, materials: (current.materials ?? []).includes(value) ? (current.materials ?? []).filter((item) => item !== value) : [...(current.materials ?? []), value] }));
  const chooseForm = (value: string) => setState((current) => {
    const currentForms = current.formChoices ?? [];
    if (currentForms.includes(value)) return { ...current, formChoices: currentForms.filter((item) => item !== value) };
    return currentForms.length === 2 ? current : { ...current, formChoices: [...currentForms, value] };
  });
  const allMaterials = materials.every((item) => chosenMaterials.includes(item));
  const chosenMaterialCount = materials.filter((item) => chosenMaterials.includes(item)).length;
  const towerDone = allMaterials && state.base === '长方体' && state.top === '球';
  const formsDone = formChoices.every((item) => selectedForms.includes(item)) && state.rotation === '同一种拼法';
  const matchesDone = objects.every(({ item, shape }) => matches[item] === shape);
  const countsDone = ['5', '2', '2', '2'].every((value, index) => state.counts[index] === value);
  const patternDone = state.next === '圆柱、正方体、球';
  const practiceDone = matchesDone && countsDone && patternDone;
  const completedStations = [towerDone, formsDone, practiceDone].filter(Boolean).length;
  const complete = towerDone && formsDone && practiceDone;
  useCompletion(complete, onDone, onCoach, 'P70-P72 的全部材料拼搭、做一做和练一练都完成并保存了。');
  const chooseAnswer = (key: 'base' | 'top', value: string, answer: string, coach: string) => {
    setState((current) => ({ ...current, [key]: value }));
    onCoach(value === answer ? coach : '再看一看：要让积木稳，能滚动的图形不能放在最下面。');
  };
  return <section className="mt-textbook-task mt-solid-journey mt-theme-scene" aria-label="立体图形教材拼搭与练习板">
    <header><small>教材 P70-P72 · 全部材料拼搭、做一做、练一练</small><h3>立体探索闯关卡</h3><p>从搭得稳，到拼得不一样，再用观察完成练习。</p></header>
    <div className="mt-solid-journey-progress" aria-label={`已完成 ${completedStations} 个任务站`}><span className={towerDone ? 'done' : ''}>1 全部材料拼搭</span><i aria-hidden="true" /><span className={formsDone ? 'done' : ''}>2 做一做</span><i aria-hidden="true" /><span className={practiceDone ? 'done' : ''}>3 练一练</span></div>
    <section className={`mt-solid-station ${towerDone ? 'done' : ''}`} aria-label="P70全部材料拼搭">
      <div className="mt-solid-station-title"><i>1</i><div><small>P70 · 全部材料拼搭</small><h4>把材料全带上，搭一座又稳又高的塔</h4></div><b>{towerDone ? '✓ 完成' : `${chosenMaterialCount}/4`}</b></div>
      <div className="mt-solid-tower-preview" role="img" aria-label="稳定积木塔：长方体作底座，球在顶端"><SolidShapeGlyph kind="cuboid" size={76} /><SolidShapeGlyph kind="cube" size={46} /><SolidShapeGlyph kind="cylinder" size={46} /><SolidShapeGlyph kind="ball" size={45} /></div>
      <div className="mt-solid-subtask"><b>先从材料架取走所有材料</b><div className="mt-material-tray">{materials.map((item) => <button key={item} aria-label={item} className={chosenMaterials.includes(item) ? 'chosen' : ''} onClick={() => chooseMaterial(item)}><span><SolidShapeGlyph kind={materialShapes[item]} size={26} /></span>{item}</button>)}</div></div>
      <div className="mt-solid-choice-grid"><div><b>哪种图形平放在最下面最稳？</b><div>{['长方体', '球', '圆柱'].map((item) => <button key={item} aria-label={`底座选${item}`} className={state.base === item ? (item === '长方体' ? 'is-correct' : 'is-wrong') : ''} onClick={() => chooseAnswer('base', item, '长方体', '长方体有平平的面，适合做宽稳的底座。')}>{item}</button>)}</div></div><div><b>哪种图形可以放在最高处？</b><div>{['球', '长方体', '圆柱'].map((item) => <button key={item} aria-label={`顶端选${item}`} className={state.top === item ? (item === '球' ? 'is-correct' : 'is-wrong') : ''} onClick={() => chooseAnswer('top', item, '球', '球放在已有支撑的顶端，材料全都用上了。')}>{item}</button>)}</div></div></div>
    </section>
    <section className={`mt-solid-station ${formsDone ? 'done' : ''}`} aria-label="P71做一做">
      <div className="mt-solid-station-title"><i>2</i><div><small>P71 · 做一做</small><h4>用 4 个相同小正方体，找出两种长方体拼法</h4></div><b>{formsDone ? '✓ 完成' : `${selectedForms.length}/2`}</b></div>
      <div className="mt-form-gallery"><button aria-label={formChoices[0]} className={selectedForms.includes(formChoices[0]) ? 'chosen' : ''} aria-pressed={selectedForms.includes(formChoices[0])} onClick={() => chooseForm(formChoices[0])}><OblComposition scale={0.28} positions={[{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 0 }, { x: 300, y: 0 }]} /><b>4 个排成一行</b><small>点选一种拼法</small></button><button aria-label={formChoices[1]} className={selectedForms.includes(formChoices[1]) ? 'chosen' : ''} aria-pressed={selectedForms.includes(formChoices[1])} onClick={() => chooseForm(formChoices[1])}><OblComposition scale={0.28} positions={[{ x: 0, y: 100 }, { x: 100, y: 100 }, { x: 0, y: 0 }, { x: 100, y: 0 }]} /><b>2 个一排，叠两层</b><small>点选另一种拼法</small></button></div>
      <div className="mt-solid-rotation"><b>把同一座拼好的长方体转一转，它算几种拼法？</b>{['同一种拼法', '两种拼法'].map((item) => <button key={item} disabled={selectedForms.length !== 2} className={state.rotation === item ? (item === '同一种拼法' ? 'is-correct' : 'is-wrong') : ''} onClick={() => { setState((current) => ({ ...current, rotation: item })); onCoach(item === '同一种拼法' ? '转动只改变看的方向，方块之间的连接没有变。' : '再看看：每块小正方体仍和原来的邻居贴在一起。'); }}>{item}</button>)}</div>
    </section>
    <section className={`mt-solid-station ${practiceDone ? 'done' : ''}`} aria-label="P72练一练">
      <div className="mt-solid-station-title"><i>3</i><div><small>P72 · 练一练</small><h4>辨认、数一数，再找出图形的规律</h4></div><b>{practiceDone ? '✓ 完成' : `${[matchesDone, countsDone, patternDone].filter(Boolean).length}/3`}</b></div>
      <div className="mt-solid-practice-grid"><div className={matchesDone ? 'done' : ''}><b>① 实物像哪个立体图形？</b><div className="mt-solid-matching">{objects.map(({ item, shape }) => <div key={item}><span>{item}</span><div>{shapeNames.map((name) => <button key={name} aria-label={`${item}是${name}`} className={matches[item] === name ? (name === shape ? 'is-correct' : 'is-wrong') : ''} onClick={() => { setState((current) => ({ ...current, matches: { ...(current.matches ?? {}), [item]: name } })); onCoach(name === shape ? `${item}最接近${shape}。` : '再观察这个物体的面和能不能滚动。'); }}>{name}</button>)}</div></div>)}</div></div><div className={countsDone ? 'done' : ''}><b>② 数一数组合图</b><div className="mt-solid-count-art" role="img" aria-label="P72 组合图：三座积木塔">{countTowers.map((tower, towerIndex) => <span key={towerIndex}>{tower.map((kind, kindIndex) => <SolidShapeGlyph key={kindIndex} kind={kind} size={34} />)}</span>)}</div><div className="mt-count-check">{shapeNames.map((name, index) => <label key={name}>{name}<input aria-label={`P72计数 ${name}`} inputMode="numeric" value={state.counts[index]} onChange={(event) => setState((current) => ({ ...current, counts: current.counts.map((item, itemIndex) => itemIndex === index ? event.target.value.replace(/[^0-9]/g, '') : item) }))} />{state.counts[index] && <i className={state.counts[index] === ['5', '2', '2', '2'][index] ? 'right' : 'wrong'}>{state.counts[index] === ['5', '2', '2', '2'][index] ? '✓' : '再数数'}</i>}</label>)}</div></div><div className={patternDone ? 'done' : ''}><b>③ 规律接着摆</b><div className="mt-pattern-track" role="img" aria-label="圆柱、正方体、球重复排列">{patternRow.map((kind, index) => <SolidShapeGlyph key={index} kind={kind} size={31} />)}<strong>？</strong></div><p>下一组应该是：</p>{['圆柱、正方体、球', '球、圆柱、正方体', '正方体、球、圆柱'].map((item) => <button key={item} className={state.next === item ? (item === '圆柱、正方体、球' ? 'is-correct' : 'is-wrong') : ''} onClick={() => { setState((current) => ({ ...current, next: item })); onCoach(item === '圆柱、正方体、球' ? '找到了每三个图形重复一次的规律。' : '从最左边开始，每三个图形是一组，按顺序再读一次。'); }}>{item}</button>)}</div></div>
      <label className="mt-solid-reflection">我发现<VoiceField multiline ariaLabel="第三单元成长档案" value={state.reflection} placeholder="说出你的发现，如：我会用小正方体拼出不同的长方体……" onChange={(next) => setState((current) => ({ ...current, reflection: next }))} /></label>
    </section>
    <p className={complete ? 'mt-feedback good' : 'mt-task-equation'}>{complete ? '✓ P70-P72 的教材拼搭与练习全部完成。' : `已完成 ${completedStations}/3 个任务站，继续把每一步做完整。`}</p>
  </section>;
}

function ProblemSolvingTask({ problem, onDone, onCoach }: { problem: Problem; onDone: () => void; onCoach: (text: string) => void }) {
  const [progress, setProgress] = usePersistedTask('problem-solving', { selected: [] as string[], operator: '' as '' | '+' | '-', answer: null as number | null });
  const { selected, operator, answer } = progress;
  const wanted = [problem.wholeLabel, problem.changedLabel];
  const infoDone = wanted.every((item) => selected.includes(item));
  const complete = infoDone && operator === problem.operator && answer === problem.answer;
  useCompletion(complete, onDone, onCoach, `教材任务完成：${problem.whole} ${problem.operator} ${problem.changed} ＝ ${problem.answer}，并已带回情境检查。`);
  const chooseInfo = (value: string) => {
    if (!wanted.includes(value)) { onCoach('这条信息和当前问题无关，先圈整体和发生变化的部分。'); return; }
    setProgress((values) => values.selected.includes(value) ? values : { ...values, selected: [...values.selected, value] });
    onCoach(value === problem.wholeLabel ? '找到了整体信息，再找变化的部分。' : '找到了变化信息，接着选择运算符。');
  };
  return <section className="mt-textbook-task mt-problem-task">
    <header><small>阅读理解 → 分析解答 → 回顾反思</small><h3>圈出有用信息，再完成关系图和算式</h3></header>
    <div className="mt-problem-steps"><article><b>① 圈信息</b><div>{[problem.wholeLabel, problem.changedLabel, problem.distractor].map((value) => <button key={value} className={selected.includes(value) ? 'chosen' : ''} onClick={() => chooseInfo(value)}>{value}</button>)}</div></article><article><b>② 选关系</b><div><button className={operator === '+' ? 'chosen' : ''} disabled={!infoDone} onClick={() => { setProgress((value) => ({ ...value, operator: '+' })); onCoach('+ 表示两部分合起来。'); }}>部分 ＋ 部分 ＝ 整体</button><button className={operator === '-' ? 'chosen' : ''} disabled={!infoDone} onClick={() => { setProgress((value) => ({ ...value, operator: '-' })); onCoach('− 表示从整体去掉一部分。'); }}>整体 − 部分 ＝ 剩余</button></div></article><article><b>③ 列式并检查</b><div className="mt-answer-row">{[problem.answer - 1, problem.answer, problem.answer + 1].map((value) => <button key={value} disabled={operator !== problem.operator} className={answer === value ? (value === problem.answer ? 'is-correct' : 'is-wrong') : ''} onClick={() => { setProgress((state) => ({ ...state, answer: value })); if (value !== problem.answer) onCoach('把算式带回题目，再数一数整体和部分。'); }}>{problem.whole} {operator || '□'} {problem.changed} ＝ {value}</button>)}</div></article></div>
  </section>;
}

function ProblemExtensionTask({ lessonId, onCoach }: { lessonId: string; onCoach: (text: string) => void }) {
  const steps = PROBLEM_EXTENSIONS[lessonId];
  const [index, setIndex] = usePersistedTask(`problem-extension:${lessonId}`, 0);
  const [wrong, setWrong] = usePersistedTask<string | null>(`problem-extension-wrong:${lessonId}`, null);
  const complete = index === steps.length;
  const step = steps[Math.min(index, steps.length - 1)];
  if (complete) return <CompletedTaskReview kicker="教材变式问题 · 复查" title="第二个情境和检查都完成了" records={steps.map((item) => ({ prompt: item.prompt, answer: item.answer }))} summary="你已在新情境中选择信息、列式并检查答案。" />;
  return <section className="mt-textbook-task mt-generic-task"><header><small>教材变式问题 {index + 1}/{steps.length}</small><h3>{step.prompt}</h3></header><div className="mt-answer-row">{step.options.map((option) => <button key={option} className={wrong === option ? 'is-wrong' : ''} onClick={() => { if (option !== step.answer) { setWrong(option); onCoach('回到问题，先区分要解决的对象、整体和变化。'); return; } setWrong(null); setIndex((value) => value + 1); onCoach(step.coach); }}>{option}</button>)}</div></section>;
}

function GenericCheckTask({ config, onDone, onCoach }: { config: { prompt: string; options: string[]; answer: string }; onDone: () => void; onCoach: (text: string) => void }) {
  const [picked, setPicked] = usePersistedTask<string | null>('generic-check', null);
  const complete = picked === config.answer;
  useCompletion(complete, onDone, onCoach, '教材练习完成：你已经用另一种题目验证了刚才的操作。');
  return <section className="mt-textbook-task mt-generic-task"><header><small>做一做</small><h3>{config.prompt}</h3></header><div className="mt-answer-row">{config.options.map((option) => <button key={option} className={picked === option ? (option === config.answer ? 'is-correct' : 'is-wrong') : ''} onClick={() => { setPicked(option); if (option !== config.answer) onCoach('回到刚才的学具和图示，再看一看数量或位置关系。'); }}>{option}</button>)}</div>{picked && picked !== config.answer && <p className="mt-feedback try">先回到学具或图示核对，再选一次。</p>}</section>;
}

function MissionSequenceTask({ missions, onDone, onCoach, scene }: { missions: CheckStep[]; onDone: () => void; onCoach: (text: string) => void; scene?: { page: string; title: string; icon: string; trail: string[] } }) {
  const [index, setIndex] = usePersistedTask('mission-index', 0);
  const [wrong, setWrong] = usePersistedTask<string | null>('mission-wrong', null);
  const complete = index === missions.length;
  const mission = missions[Math.min(index, missions.length - 1)];
  useCompletion(complete, onDone, onCoach, `教材任务完成：已完成 ${missions.length} 项不同的观察和操作任务。`);
  if (complete) return <CompletedTaskReview kicker={scene ? `教材 ${scene.page} · ${scene.title}` : '连续做一做'} title={`${missions.length} 项教材任务全部完成`} records={missions.map((item) => ({ prompt: item.prompt, answer: item.answer }))} summary="你已经把数量、形状、位置或规则都用到了。" className={scene ? 'mt-game-scene' : ''} />;
  return <section className={`mt-textbook-task mt-generic-task ${scene ? 'mt-game-scene' : ''}`}>
    <header><small>{scene ? `教材 ${scene.page} · ${scene.title}` : `连续做一做 ${index + 1}/${missions.length}`}</small><h3>{mission.prompt}</h3></header>
    {scene && <div className="mt-game-trail"><span>{scene.icon}</span>{scene.trail.map((item, itemIndex) => <b key={item} className={itemIndex <= index ? 'active' : ''}>{itemIndex < index ? '✓ ' : itemIndex === index ? '→ ' : '○ '}{item}</b>)}</div>}
    <div className="mt-answer-row">{mission.options.map((option) => <button key={option} className={wrong === option ? 'is-wrong' : ''} onClick={() => { if (option !== mission.answer) { setWrong(option); onCoach('再回到题目里的图、物或规则核对一次。'); return; } setWrong(null); onCoach(mission.coach); setIndex((value) => value + 1); }}>{option}</button>)}</div>
    {wrong && <p className="mt-feedback try">这一步还不对：{mission.coach}</p>}
  </section>;
}

/** P4-P5：操场规则必须在场景里逐步执行，不能只读出规则名称。 */
function PlaygroundExplorationBoard({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const [state, setState] = usePersistedTask('playground-exploration', { group: 0, jumps: 0, fish: 0, paired: 0 });
  const complete = state.group === 3 && state.jumps === 4 && state.fish === 4 && state.paired === 4;
  useCompletion(complete, onDone, onCoach, '操场探险完成：3 人抱团、按图形跳格、顺序数鱼，并用一一对应比较人数。');
  const advance = (key: keyof typeof state, target: number, message: string) => { setState((current) => ({ ...current, [key]: Math.min(target, current[key] + 1) })); onCoach(message); };
  return <section className="mt-textbook-task mt-game-scene mt-playground-board" aria-label="操场数学探索板">
    <header><small>教材 P4-P5 · 操场数学探索</small><h3>按规则抱团、跳格、数鱼，再把同学和椅子配对</h3></header>
    <div className="mt-playground-grid">
      <article><b>① 3 人抱成团</b><div className="mt-playground-people">{Array.from({ length: 3 }, (_, index) => <button key={index} disabled={index < state.group} className={index < state.group ? 'is-correct' : index === state.group ? 'next' : ''} onClick={() => { if (index !== state.group) return; advance('group', 3, '又有一位同学加入，凑到 3 人就是一组。'); }}>{index < state.group ? '🧒' : '○'}</button>)}</div><small>{state.group === 3 ? '✓ 正好 3 人' : `已抱团 ${state.group} / 3 人`}</small></article>
      <article><b>② 按图形跳格</b><div className="mt-jump-track">{['○', '△', '○', '△'].map((shape, index) => <button key={index} disabled={index < state.jumps} className={index < state.jumps ? 'is-correct' : index === state.jumps ? 'next' : ''} onClick={() => { if (index !== state.jumps) return; advance('jumps', 4, `${shape} 要${shape === '○' ? '双脚' : '单脚'}跳，继续下一格。`); }}>{shape}</button>)}</div><small>{state.jumps === 4 ? '✓ ○双脚、△单脚都走对了' : `已跳 ${state.jumps} / 4 格`}</small></article>
      <article><b>③ 从左到右数鱼</b><div className="mt-fish-count">{Array.from({ length: 4 }, (_, index) => <button key={index} disabled={index < state.fish} className={index < state.fish ? 'is-correct' : index === state.fish ? 'next' : ''} onClick={() => { if (index !== state.fish) return; advance('fish', 4, `这是第 ${index + 1} 条鱼，按顺序不会数重。`); }}>{index < state.fish ? `🐟${index + 1}` : '🐟'}</button>)}</div><small>{state.fish === 4 ? '✓ 一共有 4 条鱼' : `已数 ${state.fish} / 4 条`}</small></article>
      <article><b>④ 一人配一把椅子</b><div className="mt-pairing">{Array.from({ length: 4 }, (_, index) => <button key={index} disabled={index < state.paired} className={index < state.paired ? 'is-correct' : index === state.paired ? 'next' : ''} onClick={() => { if (index !== state.paired) return; advance('paired', 4, index === 3 ? '4 位同学都配到了椅子，两边同样多。' : '配好一位同学和一把椅子，继续一一对应。'); }}>{index < state.paired ? '🧒↔️🪑' : '🧒　🪑'}</button>)}</div><small>{state.paired === 4 ? '✓ 4 对，数量同样多' : `已配 ${state.paired} / 4 对`}</small></article>
    </div>
    <p className={complete ? 'mt-feedback good' : 'mt-task-equation'}>{complete ? '✓ 规则、顺序和一一对应都在操场上亲手验证了。' : '每一站都要按顺序完成，才能得到操场探险印章。'}</p>
  </section>;
}

const CLASSROOM_ROUTE_CONFIG: Record<string, { page: string; title: string; icon: string; steps: CheckStep[] }> = {
  'classroom-discover': { page: 'P6-P7', title: '教室定位指挥台', icon: '🪑', steps: [
    { prompt: '从一（1）班开始依次点亮班牌，最后要到一（6）班。', options: ['一（4）班', '一（5）班', '一（6）班'], answer: '一（6）班', coach: '第 6 块班牌点亮了：一年级有 6 个班。' },
    { prompt: '先点“课桌”，再点它左边的书包，完成位置描述。', options: ['课桌 → 左边书包', '书包 → 左边课桌', '窗户 → 右边书包'], answer: '课桌 → 左边书包', coach: '课桌是参照物，书包在它左边。' },
    { prompt: '把座位定位卡放到“第 2 组、靠窗同学右边”。', options: ['第 2 组、靠窗同学右边', '第 2 组、靠窗同学左边', '第 3 组、中间'], answer: '第 2 组、靠窗同学右边', coach: '参照物、组别和方向都说清了。' },
  ] },
  'classroom-games': { page: 'P8-P9', title: '课堂游戏指挥台', icon: '🎲', steps: [
    { prompt: '听到“摸左耳”，把动作牌放到正确位置。', options: ['摸左耳', '摸右耳', '拍两下手'], answer: '摸左耳', coach: '动作是“摸”，方向是“左”，完成得很准确。' },
    { prompt: '从左边开始，点亮第 3 个同学的位置。', options: ['第 2 个', '第 3 个', '第 4 个'], answer: '第 3 个', coach: '第 3 个说的是位置，不是总人数。' },
    { prompt: '把 3 个黄三角和 1 个红三角放入同一托盘。', options: ['3＋1＝4', '3＋1＝3', '3＋1＝5'], answer: '3＋1＝4', coach: '两部分合起来是 4 个三角形。' },
  ] },
  'learning-readiness': { page: 'P10-P11', title: '课前准备指挥台', icon: '🎒', steps: [
    { prompt: '把“8:30”送到正确的信息牌上。', options: ['上课时间', '班级人数', '课本页码'], answer: '上课时间', coach: '8:30 表示上课时间。' },
    { prompt: '课堂想发言，把动作卡放到正确流程。', options: ['举右手，等老师允许', '直接大声喊', '离开座位'], answer: '举右手，等老师允许', coach: '先举手，大家才能有序交流。' },
    { prompt: '以书本为参照，把笔袋放到右边。', options: ['书本右边', '书本左边', '书本下面'], answer: '书本右边', coach: '先找到书本，再判断右边的位置。' },
  ] },
};

function ClassroomRouteBoard({ lessonId, onDone, onCoach }: { lessonId: string; onDone: () => void; onCoach: (text: string) => void }) {
  const config = CLASSROOM_ROUTE_CONFIG[lessonId];
  const [index, setIndex] = usePersistedTask(`classroom-route:${lessonId}`, 0);
  const [wrong, setWrong] = usePersistedTask<string | null>(`classroom-route-wrong:${lessonId}`, null);
  const complete = index === config.steps.length;
  useCompletion(complete, onDone, onCoach, `${config.title}的三项场景操作都完成了。`);
  if (complete) return <CompletedTaskReview kicker={`教材 ${config.page} · ${config.title}`} title="三项教室任务全部完成" records={config.steps.map((item) => ({ prompt: item.prompt, answer: item.answer }))} summary="定位、规则和数量关系都已记录。" className="mt-game-scene mt-classroom-route" />;
  const step = config.steps[index];
  return <section className="mt-textbook-task mt-game-scene mt-classroom-route" aria-label={config.title}><header><small>教材 {config.page} · {config.title} {index + 1}/3</small><h3>{step.prompt}</h3></header><div className="mt-route-console"><span>{config.icon}</span>{config.steps.map((item, itemIndex) => <b key={item.prompt} className={itemIndex < index ? 'done' : itemIndex === index ? 'active' : ''}>{itemIndex < index ? '✓' : itemIndex === index ? '→' : '○'} 场景 {itemIndex + 1}</b>)}</div><div className="mt-answer-row">{step.options.map((option) => <button key={option} className={wrong === option ? 'is-wrong' : ''} onClick={() => { if (option !== step.answer) { setWrong(option); onCoach('回到场景，先确认对象、参照物、方向或数量关系。'); return; } setWrong(null); setIndex((value) => value + 1); onCoach(step.coach); }}>{option}</button>)}</div>{wrong && <p className="mt-feedback try">这一步还不对：{step.coach}</p>}</section>;
}

/** 数学游戏的开放观察保留为儿童自己的记录，而不是预设选项的替身。 */
function OpenObservationTask({ lessonId, onCoach }: { lessonId: string; onCoach: (text: string) => void }) {
  const prompts: Record<string, string> = {
    campus: '再找一处校园里的数学：可以写数量、形状或位置。',
    'learning-readiness': '写下你喜欢的校园地方，以及你发现的一个数学信息。',
  };
  const [note, setNote] = usePersistedTask(`open-observation:${lessonId}`, '');
  const [saved, setSaved] = usePersistedTask(`open-observation-saved:${lessonId}`, false);
  return <section className="mt-textbook-task mt-open-observation" aria-label="开放数学观察记录">
    <header><small>教材开放任务 · 观察并表达</small><h3>{prompts[lessonId]}</h3></header>
    <label>我的发现<VoiceField multiline maxLength={80} ariaLabel="我的发现" value={note} placeholder="说出来，例如：花坛里有 6 朵花。" onChange={(next) => { setNote(next); setSaved(false); }} /></label>
    <div><span>{note.trim().length}/80</span><button disabled={!note.trim()} onClick={() => { setSaved(true); onCoach('你的数学发现已经保存。下次还可以补充或修改。'); }}>{saved ? '✓ 已保存，可修改' : '保存我的发现'}</button></div>
    {saved && <p className="mt-feedback good">已记录：{note}</p>}
  </section>;
}

/** P6-P7：自我介绍的数量、来源和偏好由儿童自己填写并保存。 */
function ClassroomIntroductionTask({ onCoach }: { onCoach: (text: string) => void }) {
  const [intro, setIntro] = usePersistedTask('classroom-introduction', { family: '', kindergarten: '', favorite: '' });
  const [saved, setSaved] = usePersistedTask('classroom-introduction-saved', false);
  const ready = Object.values(intro).every((value) => value.trim());
  return <section className="mt-textbook-task mt-open-observation" aria-label="我的数学自我介绍">
    <header><small>教材 P6-P7 · 自我介绍</small><h3>用数量、来源和喜好介绍自己</h3></header>
    <div className="mt-intro-fields"><label>我家有几口人<input inputMode="numeric" value={intro.family} placeholder="例如：4" onChange={(event) => { setIntro((value) => ({ ...value, family: event.target.value })); setSaved(false); }} /></label><label>我原来在哪所幼儿园<VoiceField ariaLabel="我原来在哪所幼儿园" value={intro.kindergarten} placeholder="说出来，例如：阳光幼儿园" onChange={(next) => { setIntro((value) => ({ ...value, kindergarten: next })); setSaved(false); }} /></label><label>我喜欢什么<VoiceField ariaLabel="我喜欢什么" value={intro.favorite} placeholder="说出来，例如：画画" onChange={(next) => { setIntro((value) => ({ ...value, favorite: next })); setSaved(false); }} /></label></div>
    <div><span>请把三项都填好</span><button disabled={!ready} onClick={() => { setSaved(true); onCoach(`已保存：我家有 ${intro.family} 口人，来自${intro.kindergarten}，喜欢${intro.favorite}。`); }}>{saved ? '✓ 已保存，可修改' : '保存自我介绍'}</button></div>
  </section>;
}

/** P16 连线板：连线画在操作面上，不能只用“先点左边、再点右边”替代纸面连线。 */
function NumberLineMatch({ kind, links, selected, onSelect, onLink, onCoach }: { kind: 'number-object' | 'dot-number'; links: Record<number, number>; selected: number | null; onSelect: (value: number) => void; onLink: (value: number) => void; onCoach: (text: string) => void }) {
  const leftOrder = kind === 'number-object' ? [1, 2, 3, 4, 5] : [4, 1, 5, 2, 3];
  const rightOrder = kind === 'number-object' ? [3, 1, 5, 2, 4] : [2, 5, 1, 4, 3];
  const objectByCount: Record<number, { label: string; symbol: string }> = { 1: { label: '小羊', symbol: '🐐' }, 2: { label: '蜜蜂', symbol: '🐝' }, 3: { label: '小鸟', symbol: '🐤' }, 4: { label: '熊猫', symbol: '🐼' }, 5: { label: '公鸡', symbol: '🐓' } };
  const complete = leftOrder.every((value) => links[value] === value);
  const chooseTarget = (target: number) => {
    if (selected === null) { onCoach(kind === 'number-object' ? '先点左边的数字，再点右边同样多的物体。' : '先点左边的点子，再点右边相同的数字。'); return; }
    if (selected !== target) { onCoach('两边数量还不一样，先一个一个数清楚再连线。'); return; }
    onLink(target);
    onCoach(`${target} 和同样多的一组已经连好了。`);
  };
  const label = kind === 'number-object' ? '数字和实物连线' : '点子和数字连线';
  return <div className={`mt-number-line-match ${kind}`} role="group" aria-label={label}>
    <svg className="mt-number-line-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{leftOrder.filter((value) => links[value] === value).map((value) => <line key={value} data-from={value} x1="28" y1={10 + leftOrder.indexOf(value) * 20} x2="72" y2={10 + rightOrder.indexOf(value) * 20} />)}</svg>
    <div className="mt-number-line-column left">{leftOrder.map((value) => <button key={value} type="button" aria-pressed={selected === value} className={`${selected === value ? 'selected' : ''} ${links[value] === value ? 'linked' : ''}`} onClick={() => onSelect(value)} aria-label={kind === 'number-object' ? `数字 ${value}` : `${value} 个点子`}>{kind === 'number-object' ? value : '●'.repeat(value)}</button>)}</div>
    <div className="mt-number-line-column right">{rightOrder.map((value) => <button key={value} type="button" className={links[value] === value ? 'linked' : ''} onClick={() => chooseTarget(value)} aria-label={kind === 'number-object' ? `${value} 个${objectByCount[value].label}` : `数字 ${value}`}>{kind === 'number-object' ? Array.from({ length: value }, (_, index) => <span key={index}>{objectByCount[value].symbol}</span>) : value}</button>)}</div>
    <small>{complete ? '✓ 五条线都连好了' : kind === 'number-object' ? '先点数字，再点同样多的物体；连对后会出现一条线。' : '先点点子，再点相同的数字；连对后会出现一条线。'}</small>
  </div>;
}

/** P16：保留圈和两类连线，并用数序题替换无法核验的自由表达。 */
type NumberMarkingState = {
  circled: string;
  selectedObjectNumber?: number | null;
  objectLinks?: Record<number, number>;
  selectedDotNumber?: number | null;
  dotLinks?: Record<number, number>;
  sequence?: number[];
  /** v1 记录的兼容字段。 */
  linked?: Record<number, number>;
};

function NumbersMarkingPractice({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const groups = [
    { id: 'peas', label: '豌豆', count: 5, symbol: '🫛' },
    { id: 'eggplant', label: '茄子', count: 3, symbol: '🍆' },
    { id: 'tomato', label: '番茄', count: 2, symbol: '🍅' },
    { id: 'pepper', label: '青椒', count: 4, symbol: '🫑' },
  ];
  const [state, setState] = usePersistedTask<NumberMarkingState>('numbers-marking-practice', {
    circled: '', selectedObjectNumber: null as number | null, objectLinks: {} as Record<number, number>, selectedDotNumber: null as number | null, dotLinks: {} as Record<number, number>, sequence: [] as number[],
  });
  // 兼容旧版“selectedNumber / linked / written”练习记录：旧的第一组连线可继续保留，
  // 新增的点子连线和数序从空白开始，不让旧快照造成运行时空值。
  const objectLinks = state.objectLinks ?? state.linked ?? {};
  const dotLinks = state.dotLinks ?? {};
  const sequence = state.sequence ?? [];
  const objectLinksDone = [1, 2, 3, 4, 5].every((number) => objectLinks[number] === number);
  const dotLinksDone = [1, 2, 3, 4, 5].every((number) => dotLinks[number] === number);
  const sequenceDone = sequence.join(',') === '1,2,3,4,5';
  const complete = state.circled === 'peas' && objectLinksDone && dotLinksDone && sequenceDone;
  useCompletion(complete, onDone, onCoach, '教材 P16 的圈一圈、两组连线和数序题都完成了：同一个数能用实物、点子和数字表示。');
  const selectGroup = (id: string) => {
    setState((current) => ({ ...current, circled: id }));
    if (id === 'peas') onCoach('圈得对：这一组正好有 5 个。');
    else onCoach('先一个一个数，再找正好有 5 个的那一组。');
  };
  const addSequence = (number: number) => {
    const expected = sequence.length + 1;
    if (number !== expected) { onCoach(`先从 1 开始，接下来应该排数字 ${expected}。`); return; }
    setState((current) => ({ ...current, sequence: [...(current.sequence ?? []), number] }));
    onCoach(number === 5 ? '1、2、3、4、5 已按顺序排好。' : `数字 ${number} 排好了，接着找下一个数。`);
  };
  return <section className="mt-textbook-task mt-numbers-marking" aria-label="1到5圈和连线练习">
    <header><small>教材 P16 · 圈一圈、连一连、排一排</small><h3>用手完成 1～5 的四种数量表示练习</h3></header>
    <div className="mt-marking-grid">
      <article><b>① 圈出正好 5 个的一组</b><div className="mt-number-groups">{groups.map((group) => <button key={group.id} className={state.circled === group.id ? (group.count === 5 ? 'chosen' : 'is-wrong') : ''} onClick={() => selectGroup(group.id)} aria-label={`${group.label}，${group.count} 个`}>{Array.from({ length: group.count }, (_, index) => <span key={index}>{group.symbol}</span>)}</button>)}</div><small>{state.circled === 'peas' ? '✓ 已圈出 5 个' : '点击一组，把正好 5 个的圈出来'}</small></article>
      <article><b>② 连一连：数字和同样多的物体</b><NumberLineMatch kind="number-object" links={objectLinks} selected={state.selectedObjectNumber ?? null} onSelect={(value) => setState((current) => ({ ...current, selectedObjectNumber: value }))} onLink={(value) => setState((current) => ({ ...current, objectLinks: { ...(current.objectLinks ?? current.linked ?? {}), [value]: value }, selectedObjectNumber: null }))} onCoach={onCoach} /></article>
      <article><b>③ 连一连：点子和同样大的数字</b><NumberLineMatch kind="dot-number" links={dotLinks} selected={state.selectedDotNumber ?? null} onSelect={(value) => setState((current) => ({ ...current, selectedDotNumber: value }))} onLink={(value) => setState((current) => ({ ...current, dotLinks: { ...(current.dotLinks ?? {}), [value]: value }, selectedDotNumber: null }))} onCoach={onCoach} /></article>
      <article><b>④ 按从小到大的顺序排数字</b><div className="mt-number-order-answer" aria-label="1到5数序答案">{[1, 2, 3, 4, 5].map((number) => <span key={number} className={sequence.includes(number) ? 'done' : ''}>{sequence.includes(number) ? number : '？'}</span>)}</div><div className="mt-number-order-options">{[3, 5, 1, 4, 2].map((number) => <button key={number} disabled={sequence.includes(number)} onClick={() => addSequence(number)}>{number}</button>)}</div><small>{sequenceDone ? '✓ 1、2、3、4、5 已按从小到大排好' : '从 1 开始，一个一个接着排'}</small></article>
    </div>
  </section>;
}

/** P24-P25：先保留例题 3＋1，再完成“试一试”3＋2；两种合并都必须逐个移动。 */
function AdditionWithinFivePractice({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const steps = [
    { incoming: 1, label: '教材 P24 · 气球合并', object: '气球', icon: '●' },
    { incoming: 2, label: '教材 P25 · 试一试', object: '花朵', icon: '○' },
  ];
  const [state, setState] = usePersistedTask('addition-within-five-practice', { step: 0, moved: 0 });
  const complete = state.step === steps.length;
  useCompletion(complete, onDone, onCoach, '加法例题和试一试都完成了：3＋1＝4，3＋2＝5；每次都是把新来的数量逐个合进原来的 3 个。');
  if (complete) return <CompletedTaskReview kicker="教材 P24-P25 · 例题和试一试" title="两次合并都完成了" records={steps.map((item) => ({ prompt: `把新来的 ${item.incoming} 个${item.object}逐个合进原来的 3 个`, answer: `3＋${item.incoming}＝${3 + item.incoming}`, visual: `●●● ＋ ${item.icon.repeat(item.incoming)} ＝ ${3 + item.incoming}` }))} summary="3＋1＝4，3＋2＝5；“又来”表示把两部分合起来。" className="mt-addition-practice" />;
  const current = steps[state.step];
  const total = 3 + state.moved;
  const stepDone = state.moved === current.incoming;
  return <section className="mt-textbook-task mt-addition-practice" aria-label="5以内加法合并练习">
    <header><small>{current.label} {state.step + 1}/{steps.length}</small><h3>把新来的 {current.incoming} 个{current.object}逐个合进原来的 3 个</h3></header>
    <div className="mt-addition-stage"><article><small>原来有 3 个</small><div>{Array.from({ length: 3 }, (_, index) => <span key={index}>●</span>)}{Array.from({ length: state.moved }, (_, index) => <span key={`moved-${index}`} className="moved">{current.icon}</span>)}</div><b>{total} 个</b></article><aside>← 点击右边新来的{current.object}</aside><article><small>又来了 {current.incoming} 个</small><div>{Array.from({ length: current.incoming }, (_, index) => <button key={index} disabled={index < state.moved} className={index < state.moved ? 'moved' : index === state.moved ? 'next' : ''} onClick={() => { if (index !== state.moved) { onCoach('从第一个还没有合并的物体开始，一个一个移进整体。'); return; } const next = state.moved + 1; setState((value) => ({ ...value, moved: next })); onCoach(next === current.incoming ? `${current.incoming} 个都合进来了：3＋${current.incoming}＝${3 + current.incoming}。` : `已经合进 ${next} 个，还要继续。`); }}>{index < state.moved ? '→' : current.icon}</button>)}</div><b>还没合并 {current.incoming - state.moved} 个</b></article></div>
    <p className="mt-task-equation">3 ＋ {state.moved} ＝ {total}{stepDone ? ` · 所以 3＋${current.incoming}＝${3 + current.incoming}` : ''}</p>
    {stepDone && <button className="mt-task-main" onClick={() => setState((value) => ({ step: value.step + 1, moved: 0 }))}>{state.step === steps.length - 1 ? '完成加法练习' : '继续试一试 →'}</button>}
  </section>;
}

/** P26-P27：每次“拿走”都要逐个移出整体，再读出剩余数量和算式。 */
function SubtractionWithinFivePractice({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const steps = [{ total: 4, take: 1, icon: '🍎' }, { total: 5, take: 3, icon: '🐦' }, { total: 4, take: 2, icon: '●' }];
  const [state, setState] = usePersistedTask('subtraction-within-five-practice', { step: 0, removed: 0 });
  const complete = state.step === steps.length;
  useCompletion(complete, onDone, onCoach, '减法练习完成：从整体里逐个拿走一部分，剩下的数量就是减法的结果。');
  if (complete) return <CompletedTaskReview kicker="教材 P26-P27 · 减法操作" title="三次“拿走”都完成了" records={steps.map((item) => ({ prompt: `从 ${item.total} 个里逐个拿走 ${item.take} 个`, answer: `${item.total}－${item.take}＝${item.total - item.take}`, visual: `${item.icon.repeat(item.total)} → 还剩 ${item.total - item.take} 个` }))} summary="4－1＝3、5－3＝2、4－2＝2；每次都从整体中拿走一部分。" className="mt-addition-practice" />;
  const current = steps[state.step];
  const remaining = current.total - state.removed;
  const stepDone = state.removed === current.take;
  return <section className="mt-textbook-task mt-addition-practice" aria-label="5以内减法操作练习">
    <header><small>教材 P26-P27 · 拿走、画一画、列减法 {state.step + 1}/3</small><h3>从 {current.total} 个里逐个拿走 {current.take} 个</h3></header>
    <div className="mt-addition-stage"><article><small>整体</small><div>{Array.from({ length: current.total }, (_, index) => <span key={index} className={index >= remaining ? 'moved' : ''}>{current.icon}</span>)}</div><b>还剩 {remaining} 个</b></article><aside>点击右边的物体，把它们拿走 →</aside><article><small>要拿走 {current.take} 个</small><div>{Array.from({ length: current.take }, (_, index) => <button key={index} disabled={index < state.removed} className={index < state.removed ? 'moved' : index === state.removed ? 'next' : ''} onClick={() => { if (index !== state.removed) { onCoach('从第一个还没有拿走的物体开始，一个一个移走。'); return; } setState((value) => ({ ...value, removed: value.removed + 1 })); onCoach(index + 1 === current.take ? `拿走 ${current.take} 个后，还剩 ${current.total - current.take} 个。` : `已经拿走 ${index + 1} 个。`); }}>{index < state.removed ? '→' : current.icon}</button>)}</div><b>已拿走 {state.removed} 个</b></article></div>
    <p className="mt-task-equation">{current.total} － {state.removed} ＝ {remaining}</p>
    {stepDone && <button className="mt-task-main" onClick={() => setState((value) => ({ step: value.step + 1, removed: 0 }))}>{state.step === steps.length - 1 ? '完成减法练习' : '下一道减法 →'}</button>}
  </section>;
}

function ZeroPatternTask({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const rules = [
    { equation: '0＋4', answer: '4', note: '0 和一个数合起来，还是这个数。' },
    { equation: '4＋0', answer: '4', note: '把 0 放在后面，结果也不变。' },
    { equation: '4－0', answer: '4', note: '没有拿走，原来有几个还剩几个。' },
    { equation: '4－4', answer: '0', note: '全部拿走后，一个也没有。' },
  ];
  const [remaining, setRemaining] = usePersistedTask('zero-change-remaining', 2);
  const [index, setIndex] = usePersistedTask('zero-pattern-index', 0);
  const current = rules[Math.min(index, rules.length - 1)];
  const complete = index === rules.length;
  useCompletion(complete, onDone, onCoach, '规律表完成：加 0、减 0 和相同数相减的结果都能用情境解释。');
  if (complete) return <CompletedTaskReview kicker="教材 P30 · 0 的规律表" title="2→1→0 和 4 条规律都验证了" records={[{ prompt: '把 2 个圆片一个一个拿走', answer: '2－2＝0', visual: '●● → 0 个' }, ...rules.map((rule) => ({ prompt: `${rule.equation}＝？`, answer: rule.answer }))]} summary="0 可以表示一个也没有；它参与加减时要回到“有没有拿来、有没有拿走”的情境。" />;
  if (remaining > 0) return <section className="mt-textbook-task mt-addition-practice" aria-label="0的动态变化练习"><header><small>教材 P30 · 先体验 0</small><h3>把 2 个圆片一个一个拿走</h3></header><div className="mt-addition-stage"><article><small>盘子里</small><div>{Array.from({ length: 2 }, (_, item) => <span key={item} className={item >= remaining ? 'moved' : ''}>●</span>)}</div><b>还剩 {remaining} 个</b></article><aside>点击右边圆片拿走 →</aside><article><small>拿走</small><div>{[0, 1].map((item) => <button key={item} disabled={item < 2 - remaining} className={item < 2 - remaining ? 'moved' : item === 2 - remaining ? 'next' : ''} onClick={() => { if (item !== 2 - remaining) { onCoach('从第一个还没有拿走的圆片开始。'); return; } setRemaining((value) => value - 1); onCoach(remaining === 1 ? '一个也没有了，这就是 0。' : '还剩 1 个，再拿走一个看看。'); }}>{item < 2 - remaining ? '→' : '●'}</button>)}</div></article></div><p className="mt-task-equation">2－{2 - remaining}＝{remaining}</p></section>;
  const options = current.answer === '0' ? ['0', '4', '8'] : ['0', '4', '5'];
  return <section className="mt-textbook-task mt-generic-task">
    <header><small>0 的规律表 {index + 1}/4</small><h3>{current.equation}＝？</h3></header>
    <div className="mt-answer-row">{options.map((option) => <button key={option} onClick={() => { if (option !== current.answer) { onCoach('把算式放回“物体有没有增加或拿走”的情境，再看一次。'); return; } onCoach(current.note); setIndex((value) => value + 1); }}>{option}</button>)}</div>
    <p className="mt-task-equation">{current.note}</p>
  </section>;
}

/** P24-P33：例题、做一做和看算式讲故事均按步骤保留，而非压成一个判断题。 */
function EquationSequenceTask({ lessonId, steps, onDone, onCoach }: { lessonId: string; steps: EquationStep[]; onDone: () => void; onCoach: (text: string) => void }) {
  const [index, setIndex] = usePersistedTask(`equation-sequence:${lessonId}`, 0);
  const [wrong, setWrong] = usePersistedTask<string | null>(`equation-wrong:${lessonId}`, null);
  const complete = index === steps.length;
  const current = steps[Math.min(index, steps.length - 1)];
  useCompletion(complete, onDone, onCoach, '教材例题、做一做和基本练习都完成了。');
  if (complete) return <CompletedTaskReview kicker="例题与做一做" title={`${steps.length} 个加减动作已完成`} records={steps.map((item) => ({ prompt: item.scene, answer: item.answer, visual: item.equation }))} summary="你已经用情境、学具和算式核对了加减关系。" />;
  return <section className="mt-textbook-task mt-generic-task">
    <header><small>例题与做一做 {index + 1}/{steps.length}</small><h3>{current.scene}</h3></header>
    <p className="mt-task-equation">{current.equation}</p>
    <div className="mt-answer-row">{current.options.map((option) => <button key={option} className={wrong === option ? 'is-wrong' : ''} onClick={() => {
      if (option !== current.answer) { setWrong(option); onCoach('先回到题目情境，摆一摆、画一画或按顺序数一数。'); return; }
      setWrong(null); onCoach(current.coach); setIndex((value) => value + 1);
    }}>{option}</button>)}</div>
    {wrong && <p className="mt-feedback try">这一步先不对：{current.coach}</p>}
  </section>;
}

/** P31-P33：把算式卡拖到加法/减法及得数规律列，保留“制作—整理—发现”的过程。 */
function Unit1CardOrganizer({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const cards = [
    { id: 'add-1', text: '1＋4＝5', group: '加法', result: 5 },
    { id: 'add-2', text: '2＋3＝5', group: '加法', result: 5 },
    { id: 'sub-1', text: '5－2＝3', group: '减法', result: 3 },
    { id: 'sub-2', text: '5－5＝0', group: '减法', result: 0 },
  ];
  const [sorted, setSorted] = usePersistedTask<Record<string, string>>('unit1-card-organizer', {});
  const complete = cards.every((card) => sorted[card.id] === card.group);
  useCompletion(complete, onDone, onCoach, '算式卡整理完成：加法按第二个加数增加，减法按减去的数增加，可以发现得数变化规律。');
  return <section className="mt-textbook-task mt-card-organizer">
    <header><small>制作并整理算式卡</small><h3>把 5 以内加减法卡分到正确一列</h3></header>
    <div className="mt-card-sort-grid">{cards.map((card) => <article key={card.id} className={sorted[card.id] ? 'done' : ''}><b>{card.text}</b><div>{['加法', '减法'].map((group) => <button key={group} className={sorted[card.id] === group ? 'chosen' : ''} onClick={() => {
      if (group !== card.group) { onCoach('先看算式中间的运算符：＋放加法列，－放减法列。'); return; }
      setSorted((values) => ({ ...values, [card.id]: group }));
      onCoach(`${card.text} 是${group}算式；再整理下一张卡。`);
    }}>{group}</button>)}</div></article>)}</div>
    <p className="mt-task-equation">{complete ? '✓ 加法、减法和得数 0～5 的规律都可以继续说一说。' : '先按运算符整理，再观察每行算式的得数。'}</p>
  </section>;
}

/** P33 成长档案：记录真实的自我判断，不把“点亮”当作答对一道题。 */
function Unit1ReflectionPortfolio({ onCoach }: { onCoach: (text: string) => void }) {
  const items = ['我会用 0～5 表示数量', '我会比较同样多、多和少', '我会说分与合', '我会用加减法讲数量故事'];
  const [selected, setSelected] = usePersistedTask<string[]>('unit1-reflection', []);
  return <section className="mt-textbook-task mt-card-organizer" aria-label="第一单元成长小档案">
    <header><small>教材 P33 · 成长小档案</small><h3>回看自己已经会用的方法</h3></header>
    <div className="mt-card-sort-grid">{items.map((item) => {
      const done = selected.includes(item);
      return <article key={item} className={done ? 'done' : ''}><b>{item}</b><button className={done ? 'chosen' : ''} onClick={() => {
        setSelected((values) => values.includes(item) ? values.filter((value) => value !== item) : [...values, item]);
        onCoach(done ? '已取消这一项标记；想一想还需要练什么。' : '已记录这项收获；不会的内容可以在复习时再练。');
      }}>{done ? '✓ 我会了' : '记录我的情况'}</button></article>;
    })}</div>
    <p className="mt-task-equation">这份档案只属于你：可以随时修改，不计入答题对错或课程星级。</p>
  </section>;
}

/** P111：全册成长档案独立保存，记录儿童的自我判断，不与答题正确率混在一起。 */
function WholeBookReflectionPortfolio({ onCoach }: { onCoach: (text: string) => void }) {
  const items = ['喜欢学习数学', '喜欢发现并提出生活中的数学问题', '不怕数学学习中的困难', '能尝试独自解决问题', '能发现自己哪里没听懂并及时向他人请教', '能检查自己做错的题目并改正', '敢于把自己的想法讲给大家听', '会倾听别人的发言', '能和同伴合作完成学习任务'];
  type ReflectionState = { ratings: Record<string, number>; reflection: string };
  const [saved, setSaved] = usePersistedTask<ReflectionState | string[]>('whole-book-reflection', { ratings: {}, reflection: '' });
  const state: ReflectionState = Array.isArray(saved) ? { ratings: Object.fromEntries(saved.map((item) => [item, 1])), reflection: '' } : saved;
  const update = (next: (current: ReflectionState) => ReflectionState) => setSaved((current) => next(Array.isArray(current) ? { ratings: Object.fromEntries(current.map((item) => [item, 1])), reflection: '' } : current));
  return <section className="mt-textbook-task mt-card-organizer mt-theme-scene mt-archive-scene" aria-label="全册成长档案">
    <header><small>教材 P111 · 数学探险成长档案</small><h3>给九项学习表现各涂 0～3 朵小红花</h3></header>
    <div className="mt-archive-shelf"><span>📒 我的探险记录</span><b>可诚实修改，不按对错评分</b><span>🌟 我的下一步</span></div>
    <div className="mt-card-sort-grid">{items.map((item) => {
      const rating = state.ratings[item] ?? 0;
      return <article key={item} className={rating > 0 ? 'done' : ''}><b>{item}</b><div>{[1, 2, 3].map((count) => <button key={count} aria-label={`${item} 第 ${count} 朵小红花`} className={count <= rating ? 'chosen' : ''} aria-pressed={count <= rating} onClick={() => {
        const nextRating = rating === count ? 0 : count;
        update((current) => ({ ...current, ratings: { ...current.ratings, [item]: nextRating } }));
        onCoach(nextRating ? `已为“${item}”涂 ${nextRating} 朵小红花。` : '已清除这项小红花；可以继续练习后再评价。');
      }}>{count <= rating ? '✿' : '✧'}</button>)}</div><small>{rating ? `已涂 ${rating} / 3 朵` : '还未涂花'}</small></article>;
    })}</div>
    <label>我觉得自己还应在哪些方面更努力些？<VoiceField multiline maxLength={120} value={state.reflection} placeholder="说出你的打算" onChange={(next) => update((current) => ({ ...current, reflection: next }))} /></label>
    <p className="mt-task-equation">这是自我评价，不计作对错；小红花和文字都可随时修改，也可以选择一项继续练习。</p>
  </section>;
}

/** P16、P22-P23：保留圈一圈、涂一涂、连一连的动作，而非再次改写成单选。 */
function Unit1MarkingPractice({ onCoach }: { onCoach: (text: string) => void }) {
  const [state, setState] = usePersistedTask('unit1-marking-practice', { circled: [] as number[], colored: [] as number[], linked: false });
  const toggle = (field: 'circled' | 'colored', value: number) => setState((current) => ({ ...current, [field]: current[field].includes(value) ? current[field].filter((item) => item !== value) : [...current[field], value] }));
  const circleDone = state.circled.length === 4;
  const colorDone = state.colored.includes(4);
  return <section className="mt-textbook-task mt-card-organizer" aria-label="第一单元圈选涂色连线练习">
    <header><small>教材 P16、P22-P23 · 圈、涂、连</small><h3>动手留下数量和位置的证据</h3></header>
    <div className="mt-marking-grid"><article><b>① 圈出 4 个点子</b><div>{[1, 2, 3, 4, 5].map((value) => <button key={value} className={state.circled.includes(value) ? 'chosen' : ''} aria-pressed={state.circled.includes(value)} onClick={() => toggle('circled', value)}>●</button>)}</div><small>{circleDone ? '✓ 正好圈了 4 个' : `已圈 ${state.circled.length} 个`}</small></article><article><b>② 从左边给第 4 个涂色</b><div>{[1, 2, 3, 4, 5].map((value) => <button key={value} className={state.colored.includes(value) ? 'chosen' : ''} aria-pressed={state.colored.includes(value)} onClick={() => toggle('colored', value)}>{value}</button>)}</div><small>{colorDone ? '✓ 第 4 个已涂色' : '点第 4 个数字'}</small></article><article><b>③ 连一连：2 个点子和数字 2</b><button className={state.linked ? 'chosen' : ''} onClick={() => { setState((current) => ({ ...current, linked: true })); onCoach('2 个点子和数字 2 表示同一个数量。'); }}>{state.linked ? '●● ── 2 ✓' : '●●　　 2'}</button><small>{state.linked ? '✓ 已连线' : '点击完成连线'}</small></article></div>
    <p className="mt-task-equation">圈、涂和连都可修改；先用动作表示，再说出理由。</p>
  </section>;
}

/** P22：遮挡序数、分合填空和看图比较都要由儿童自己填写，不能只在闯关里选答案。 */
function Unit1P22Worksheet({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const [state, setState] = usePersistedTask('unit1-p22-worksheet', { ordinal: ['', '', ''], splits: ['', '', '', '', ''], animals: ['', '', '', ''], relations: ['', ''] });
  const ordinalDone = state.ordinal.join(',') === '3,4,2';
  const splitsDone = state.splits.join(',') === '3,2,3,4,1';
  const animalsDone = state.animals.join(',') === '3,2,3,4';
  const relationsDone = state.relations.join(',') === '＞,＜';
  const complete = ordinalDone && splitsDone && animalsDone && relationsDone;
  useCompletion(complete, onDone, onCoach, '教材 P22 的遮挡序数、分合填空和看图比较都完成了。');
  const write = (field: 'ordinal' | 'splits' | 'animals', index: number, value: string) => setState((current) => ({ ...current, [field]: current[field].map((item, itemIndex) => itemIndex === index ? value.replace(/[^0-5]/g, '') : item) }));
  const chooseRelation = (index: number, relation: string) => { setState((current) => ({ ...current, relations: current.relations.map((item, itemIndex) => itemIndex === index ? relation : item) })); onCoach(relation === (index === 0 ? '＞' : '＜') ? '先数两组，再比较多少，符号方向正确。' : '再数一数两组数量，大口要朝向数量多的一边。'); };
  return <section className="mt-textbook-task mt-p22-worksheet" aria-label="第一单元P22练一练">
    <header><small>教材 P22 · 遮一遮、填一填、数一数比一比</small><h3>把看见的数量和位置亲手写下来</h3></header>
    <div className="mt-marking-grid">
      <article><b>① 雪人遮住了第几个到第几个？一共遮住几个？</b><div className="mt-p22-inputs"><label>第<input aria-label="遮住的第一个雪人" inputMode="numeric" maxLength={1} value={state.ordinal[0]} onChange={(event) => write('ordinal', 0, event.target.value)} /></label><label>和第<input aria-label="遮住的第二个雪人" inputMode="numeric" maxLength={1} value={state.ordinal[1]} onChange={(event) => write('ordinal', 1, event.target.value)} /></label><label>遮住<input aria-label="遮住几个雪人" inputMode="numeric" maxLength={1} value={state.ordinal[2]} onChange={(event) => write('ordinal', 2, event.target.value)} />个</label></div><small>{ordinalDone ? '✓ 第 3 个和第 4 个，共遮住 2 个' : '从左数，先找已标出的第 1、2、5 个'}</small></article>
      <article><b>② 填一填：5 分成 2 和□；4 分成□和 2；□ 分成 1 和 2；5 分成 1 和□；4 分成 3 和□</b><div className="mt-p22-inputs">{state.splits.map((value, index) => <input key={index} aria-label={`分合填空第 ${index + 1} 格`} inputMode="numeric" maxLength={1} value={value} onChange={(event) => write('splits', index, event.target.value)} />)}</div><small>{splitsDone ? '✓ 五组分合都填对了' : '想一想：两个部分合起来要和整体一样多'}</small></article>
      <article><b>③ 数一数：🐘 和 🦒；🦓 和 🦘</b><div className="mt-p22-animals"><label>🐘🐘🐘 <input aria-label="大象数量" inputMode="numeric" maxLength={1} value={state.animals[0]} onChange={(event) => write('animals', 0, event.target.value)} /></label><label>🦒🦒 <input aria-label="长颈鹿数量" inputMode="numeric" maxLength={1} value={state.animals[1]} onChange={(event) => write('animals', 1, event.target.value)} /></label><label>🦓🦓🦓 <input aria-label="斑马数量" inputMode="numeric" maxLength={1} value={state.animals[2]} onChange={(event) => write('animals', 2, event.target.value)} /></label><label>🦘🦘🦘🦘 <input aria-label="袋鼠数量" inputMode="numeric" maxLength={1} value={state.animals[3]} onChange={(event) => write('animals', 3, event.target.value)} /></label></div><small>{animalsDone ? '✓ 四组动物都数对了' : '按从左到右的顺序一个一个数'}</small></article>
      <article><b>④ 在数量中间填＞或＜</b><div className="mt-p22-relations"><span>3　□　2</span>{['＞', '＜'].map((relation) => <button key={`first-${relation}`} className={state.relations[0] === relation ? (relation === '＞' ? 'chosen' : 'is-wrong') : ''} onClick={() => chooseRelation(0, relation)}>{relation}</button>)}<span>3　□　4</span>{['＞', '＜'].map((relation) => <button key={`second-${relation}`} className={state.relations[1] === relation ? (relation === '＜' ? 'chosen' : 'is-wrong') : ''} onClick={() => chooseRelation(1, relation)}>{relation}</button>)}</div><small>{relationsDone ? '✓ 大小关系都填对了' : '先数数量，再决定符号朝向'}</small></article>
    </div>
  </section>;
}

/** P31-P33：把第一单元知识实际连成网，而非只阅读“知识图”说明。 */
function Unit1KnowledgeMap({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const links = [
    { id: 'number-compare', from: '数一数', to: '比一比', note: '先数清数量，才能比较多、少和同样多。' },
    { id: 'compose-addsub', from: '分与合', to: '加减法', note: '两个部分合成整体，也能从整体求一个部分。' },
    { id: 'addsub-check', from: '加减法', to: '检查答案', note: '加法和减法可以互相检查，把结果带回情境。' },
  ];
  const [linked, setLinked] = usePersistedTask<string[]>('unit1-knowledge-map', []);
  const complete = links.every((link) => linked.includes(link.id));
  useCompletion(complete, onDone, onCoach, '第一单元知识图连好了：数、比较、分合和加减法能互相帮助。');
  return <section className="mt-textbook-task mt-card-organizer" aria-label="第一单元知识图">
    <header><small>教材 P31-P33 · 整理知识</small><h3>点击连通每一条有依据的数学关系</h3></header>
    <div className="mt-card-sort-grid">{links.map((link) => {
      const done = linked.includes(link.id);
      return <article key={link.id} className={done ? 'done' : ''}><b>{link.from}　→　{link.to}</b><p>{done ? link.note : '想一想它们怎样互相帮助。'}</p><button className={done ? 'chosen' : ''} onClick={() => { setLinked((current) => current.includes(link.id) ? current : [...current, link.id]); onCoach(link.note); }}>{done ? '✓ 已连通' : '连通这两个知识点'}</button></article>;
    })}</div>
    <p className="mt-task-equation">{complete ? '✓ 三条关系都连通了；再用算式卡和综合练习检查它们。' : '每一条都要能说清“为什么”。'}</p>
  </section>;
}

function Unit1ReviewTaskPack({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const [equationIndex] = usePersistedTask('equation-sequence:unit1-review', 0);
  const [sorted] = usePersistedTask<Record<string, string>>('unit1-card-organizer', {});
  const [worksheetDone, setWorksheetDone] = usePersistedTask('unit1-p22-worksheet-done', false);
  const [mapDone, setMapDone] = usePersistedTask('unit1-knowledge-map-done', false);
  const cardsDone = ['add-1', 'add-2', 'sub-1', 'sub-2'].every((id) => !!sorted[id]);
  const complete = equationIndex === UNIT1_EQUATION_STEPS['unit1-review'].length && cardsDone && worksheetDone && mapDone;
  useCompletion(complete, onDone, onCoach, '整理、练习和算式卡都完成了，可以回顾第一单元的收获。');
  return <><Unit1KnowledgeMap onDone={() => setMapDone(true)} onCoach={onCoach} /><EquationSequenceTask lessonId="unit1-review" steps={UNIT1_EQUATION_STEPS['unit1-review']} onDone={() => undefined} onCoach={onCoach} /><Unit1MarkingPractice onCoach={onCoach} /><Unit1P22Worksheet onDone={() => setWorksheetDone(true)} onCoach={onCoach} /><Unit1CardOrganizer onDone={() => undefined} onCoach={onCoach} /><Unit1ReflectionPortfolio onCoach={onCoach} /></>;
}

/** 第二个教材任务站：按课型用专属学具补齐原来“一个 activity 就结束”的缺口。 */
export default function MathTextbookTaskPack({ lessonId, onDone, onCoach }: TaskPackProps) {
  const parentProgress = useContext(TaskProgressContext);
  const content = <TaskPackContent lessonId={lessonId} onDone={onDone} onCoach={onCoach} />;
  const station = <ActionStation index={1} title={textbookTaskTitle(lessonId)}>{content}</ActionStation>;
  if (parentProgress) return station;
  return <MathLessonTaskProgressProvider lessonId={lessonId}>{station}</MathLessonTaskProgressProvider>;
}

const UNIT2_CARD_LABS: Record<string, { page: string; title: string; cards: Array<{ prompt: string; options: string[]; answer: string; visual: string }> }> = {
  'six-to-nine': { page: 'P34-P36', title: '6～9 数卡实验桌', cards: [{ prompt: '点子卡 ●●●●●●● 写作几？', options: ['6', '7', '8'], answer: '7', visual: '● ● ● ● ● ● ●' }, { prompt: '6 后面连续翻两张数卡，最后是哪张？', options: ['7', '8', '9'], answer: '8', visual: '6 → 7 → 8' }] },
  'compare-order-nine': { page: 'P37-P38', title: '比较与方向实验桌', cards: [{ prompt: '把 8 和 9 放到数线，8 应在 9 的哪边？', options: ['左边，所以 8＜9', '右边，所以 8＞9', '同一格'], answer: '左边，所以 8＜9', visual: '8　←　9' }, { prompt: '从右数第 2 个，先把哪边设为起点？', options: ['右边', '左边', '中间'], answer: '右边', visual: '左　○ ○ ○ ○　右起点' }] },
  'compose-six-nine': { page: 'P39-P43', title: '分合数卡实验桌', cards: [{ prompt: '把 6 的数卡拆成 1 和几？', options: ['4', '5', '6'], answer: '5', visual: '1 ＋ □ ＝ 6' }, { prompt: '8 的数卡已有 3，另一张要放几？', options: ['4', '5', '6'], answer: '5', visual: '3 ＋ □ ＝ 8' }] },
  'addsub-six-seven': { page: 'P44-P49', title: '一图四式实验桌', cards: [{ prompt: '整体卡 6，部分卡 4 和 2，翻出减法卡。', options: ['6－4＝2', '4－2＝6', '6＋4＝2'], answer: '6－4＝2', visual: '4　＋　2　＝　6' }, { prompt: '两部分同为 3，翻出对应减法卡。', options: ['6－3＝3', '3－3＝6', '6－6＝3'], answer: '6－3＝3', visual: '3　＋　3　＝　6' }] },
  'addsub-eight-nine': { page: 'P50-P53', title: '8、9 关系实验桌', cards: [{ prompt: '整体卡 9 去掉部分卡 4，留下哪张卡？', options: ['4', '5', '9'], answer: '5', visual: '9　－　4　＝　□' }, { prompt: '把哪两张部分卡合成整体 8？', options: ['3 和 5', '3 和 4', '2 和 5'], answer: '3 和 5', visual: '□　＋　□　＝　8' }] },
  ten: { page: 'P54-P58', title: '十格伙伴实验桌', cards: [{ prompt: '十格已有 7 个圆片，还需几颗填满？', options: ['2', '3', '4'], answer: '3', visual: '● ● ● ● ● ● ● □ □ □' }, { prompt: '我出 8，你出几，才能凑成 10？', options: ['1', '2', '3'], answer: '2', visual: '8　＋　□　＝　10' }] },
  'continuous-add-sub': { page: 'P59', title: '连续变化实验桌', cards: [{ prompt: '先摆 5，再来 2，第一张中间结果卡是？', options: ['6', '7', '8'], answer: '7', visual: '5　→　7　→　8' }, { prompt: '8 先拿走 2，再拿走 3，最后留下？', options: ['2', '3', '4'], answer: '3', visual: '8　→　6　→　3' }] },
  'mixed-add-sub': { page: 'P60-P62', title: '加减混合实验桌', cards: [{ prompt: '上来 3 人、下去 2 人，应先翻哪张变化卡？', options: ['4＋3', '3－2', '4－2'], answer: '4＋3', visual: '4　→　7　→　5' }, { prompt: '数阵里 4 还差几才能凑成 10？', options: ['5', '6', '7'], answer: '6', visual: '4　＋　□　＝　10' }] },
  'unit2-review': { page: 'P63-P66', title: '第二单元整理实验桌', cards: [{ prompt: '数卡 6、7、8、9 后面应接哪张？', options: ['8', '10', '11'], answer: '10', visual: '6　7　8　9　□' }, { prompt: '数量先增加 2 又减少 1，变化记录应是？', options: ['＋2－1', '－2＋1', '＋1＋2'], answer: '＋2－1', visual: '原来　→　变多　→　变少' }] },
};

function Unit2CardLab({ lessonId, onCoach }: { lessonId: string; onCoach: (text: string) => void }) {
  const lab = UNIT2_CARD_LABS[lessonId]; const [index, setIndex] = usePersistedTask(`unit2-card-lab:${lessonId}`, 0); const [wrong, setWrong] = usePersistedTask<string | null>(`unit2-card-lab-wrong:${lessonId}`, null);
  if (!lab) return null; const complete = index === lab.cards.length; const card = lab.cards[Math.min(index, lab.cards.length - 1)];
  if (complete) return <CompletedTaskReview kicker={`教材 ${lab.page} · 十格实验与运算工坊`} title="数卡实验记录完成" records={lab.cards.map((item) => ({ prompt: item.prompt, answer: item.answer, visual: item.visual }))} summary="两张数卡都已亲手验证。" className="mt-unit2-card-lab" />;
  return <section className="mt-textbook-task mt-unit2-card-lab" aria-label={lab.title}><header><small>教材 {lab.page} · 十格实验与运算工坊</small><h3>{card.prompt}</h3></header><div className="mt-card-lab-visual">{card.visual}</div><div className="mt-answer-row">{card.options.map((option) => <button key={option} className={wrong === option ? 'is-wrong' : ''} onClick={() => { if (option !== card.answer) { setWrong(option); onCoach('把数卡、点子或数线重新摆好，再看关系。'); return; } setWrong(null); setIndex((value) => value + 1); onCoach(`数卡记录正确：${card.answer}。`); }}>{option}</button>)}</div><p className="mt-task-equation">正在验证第 {index + 1} / {lab.cards.length} 张数卡。</p></section>;
}

/** P34-P43：主操作和数卡实验是同一课的两个教材任务，必须共同完成。 */
function Unit2DualTaskPack({ lessonId, MainTask, onDone, onCoach }: { lessonId: 'six-to-nine' | 'compare-order-nine' | 'compose-six-nine' | 'addsub-six-seven' | 'addsub-eight-nine' | 'ten' | 'continuous-add-sub' | 'mixed-add-sub'; MainTask: React.ComponentType<{ onDone: () => void; onCoach: (text: string) => void }>; onDone: () => void; onCoach: (text: string) => void }) {
  const [mainDone, setMainDone] = usePersistedTask(`unit2-main-done:${lessonId}`, false);
  const [labIndex] = usePersistedTask(`unit2-card-lab:${lessonId}`, 0);
  const labDone = labIndex >= (UNIT2_CARD_LABS[lessonId]?.cards.length ?? 0);
  const complete = mainDone && labDone;
  useCompletion(complete, onDone, onCoach, '主操作和两张数卡实验都完成了，才能结束这一课。');
  return <><MainTask onDone={() => setMainDone(true)} onCoach={onCoach} /><Unit2CardLab lessonId={lessonId} onCoach={onCoach} /></>;
}

function AddSubTenDualTaskPack({ onDone, onCoach }: { onDone: () => void; onCoach: (text: string) => void }) {
  const [mainDone, setMainDone] = usePersistedTask('unit2-main-done:addsub-ten', false);
  const [labIndex] = usePersistedTask('unit2-card-lab:ten', 0);
  const complete = mainDone && labIndex >= UNIT2_CARD_LABS.ten.cards.length;
  useCompletion(complete, onDone, onCoach, '10 的加减关系、倒数和十格数卡实验全部完成。');
  return <><TenEquationWorkbench onDone={() => setMainDone(true)} onCoach={onCoach} /><Unit2CardLab lessonId="ten" onCoach={onCoach} /></>;
}

function TaskPackContent({ lessonId, onDone, onCoach }: TaskPackProps) {
  // 第三、四单元的专属教材操作优先于位值/练习的通用分支，避免再次被遮蔽。
  if (lessonId === 'review-numbers') return <><WholeBookKnowledgeMap onDone={onDone} onCoach={onCoach} /><MissionSequenceTask missions={UNIT6_PRACTICE[lessonId]} onDone={() => undefined} onCoach={onCoach} /></>;
  if (lessonId === 'solid-shapes') return <><SolidFeatureLab onDone={onDone} onCoach={onCoach} /><MissionSequenceTask missions={UNIT34_PRACTICE[lessonId]} onDone={() => undefined} onCoach={onCoach} /></>;
  if (lessonId === 'order-twenty') return <><TwentyNumberRail onDone={onDone} onCoach={onCoach} /><MissionSequenceTask missions={UNIT34_PRACTICE[lessonId]} onDone={() => undefined} onCoach={onCoach} /></>;
  if (lessonId === 'simple-addsub-twenty') return <><TenOnesEquationBoard onDone={onDone} onCoach={onCoach} /><MissionSequenceTask missions={UNIT34_PRACTICE[lessonId]} onDone={() => undefined} onCoach={onCoach} /></>;
  if (lessonId === 'between-positions') return <><BetweenPeopleBoard onDone={onDone} onCoach={onCoach} /><MissionSequenceTask missions={UNIT34_PRACTICE[lessonId]} onDone={() => undefined} onCoach={onCoach} /></>;
  if (lessonId === 'unit4-review') return <><PlaceValueTask config={PLACE_VALUE_TARGETS['unit4-review']} onDone={() => undefined} onCoach={onCoach} /><Unit4ReviewWorkbench onDone={onDone} onCoach={onCoach} /><MissionSequenceTask missions={UNIT34_PRACTICE[lessonId]} onDone={() => undefined} onCoach={onCoach} /></>;
  if (lessonId === 'eleven-twenty') return <><PlaceValueTask config={PLACE_VALUE_TARGETS['eleven-twenty']} onDone={onDone} onCoach={onCoach} /><TeenWritingBoard onDone={() => undefined} onCoach={onCoach} /><MissionSequenceTask missions={UNIT34_PRACTICE[lessonId]} onDone={() => undefined} onCoach={onCoach} /></>;
  const place = PLACE_VALUE_TARGETS[lessonId];
  if (place) return <><PlaceValueTask key={lessonId} config={place} onDone={onDone} onCoach={onCoach} />{UNIT34_PRACTICE[lessonId] && <MissionSequenceTask missions={UNIT34_PRACTICE[lessonId]} onDone={() => undefined} onCoach={onCoach} />}</>;
  if (lessonId === 'plus-five-four-three-two') return <><AddendExchangeBoard onDone={onDone} onCoach={onCoach} /><MissionSequenceTask missions={UNIT5_PRACTICE[lessonId]} onDone={() => undefined} onCoach={onCoach} /></>;
  if (lessonId === 'unit5-review') return <><MakeTenTask config={MAKE_TEN_TARGETS['unit5-review']} onDone={() => undefined} onCoach={onCoach} /><Unit5ReviewWorkbench onCoach={onCoach} /><Unit5TextbookWorksheet onDone={onDone} onCoach={onCoach} /><MissionSequenceTask missions={UNIT5_PRACTICE[lessonId]} onDone={() => undefined} onCoach={onCoach} /></>;
  const ten = MAKE_TEN_TARGETS[lessonId];
  if (lessonId === 'plus-eight-nine-strategies') return <><MakeTenStrategyTask onDone={onDone} onCoach={onCoach} /><MissionSequenceTask missions={UNIT5_PRACTICE[lessonId]} onDone={() => undefined} onCoach={onCoach} /></>;
  if (lessonId === 'addition-table') return <><AdditionTableExplorer onDone={() => undefined} onCoach={onCoach} /><AdditionTableReview onDone={onDone} onCoach={onCoach} /><MissionSequenceTask missions={UNIT5_PRACTICE[lessonId]} onDone={() => undefined} onCoach={onCoach} /></>;
  if (ten) return <><MakeTenTask key={lessonId} config={ten} onDone={onDone} onCoach={onCoach} />{UNIT5_PRACTICE[lessonId] && <MissionSequenceTask missions={UNIT5_PRACTICE[lessonId]} onDone={() => undefined} onCoach={onCoach} />}</>;
  if (lessonId === 'solid-building') return <><SolidBuildTask key={lessonId} compose={false} onDone={onDone} onCoach={onCoach} /><MissionSequenceTask missions={UNIT34_PRACTICE[lessonId]} onDone={() => undefined} onCoach={onCoach} /></>;
  if (lessonId === 'solid-compose') return <><SolidBuildTask key={lessonId} compose onDone={() => undefined} onCoach={onCoach} /><SolidTextbookPracticeBoard onDone={onDone} onCoach={onCoach} /><MissionSequenceTask missions={UNIT34_PRACTICE[lessonId]} onDone={() => undefined} onCoach={onCoach} /></>;
  if (lessonId === 'review-shapes') return <><SolidReviewBuilder onDone={onDone} onCoach={onCoach} /><MissionSequenceTask missions={UNIT6_PRACTICE[lessonId]} onDone={() => undefined} onCoach={onCoach} /></>;
  const problem = PROBLEMS[lessonId];
  if (problem) return <><ProblemSolvingTask key={lessonId} problem={problem} onDone={onDone} onCoach={onCoach} />{PROBLEM_EXTENSIONS[lessonId] && <ProblemExtensionTask lessonId={lessonId} onCoach={onCoach} />}{lessonId === 'select-info-eight-nine' && <InformationFilterBoard onCoach={onCoach} />}{lessonId === 'review-relations' && <RelationChainBoard onCoach={onCoach} />}{lessonId === 'review-application' && <><NumberPathGrid onCoach={onCoach} /><TenSumColorGrid onCoach={onCoach} /><QuestionComposer onCoach={onCoach} /><WholeBookReflectionPortfolio onCoach={onCoach} /></>}</>;
  // 第二单元已有教材专属操作时，不能先落入旧的 GAME_MISSIONS 通用任务壳。
  const unit2Practice = UNIT2_PRACTICE[lessonId];
  if (lessonId === 'six-to-nine') return <Unit2DualTaskPack lessonId="six-to-nine" MainTask={SixToNineRepresentationBoard} onDone={onDone} onCoach={onCoach} />;
  if (lessonId === 'compare-order-nine') return <Unit2DualTaskPack lessonId="compare-order-nine" MainTask={CompareOrderNineBoard} onDone={onDone} onCoach={onCoach} />;
  if (lessonId === 'ten') return <Unit2DualTaskPack lessonId="ten" MainTask={TenRecognitionTaskPack} onDone={onDone} onCoach={onCoach} />;
  if (lessonId === 'addsub-ten') return <AddSubTenDualTaskPack onDone={onDone} onCoach={onCoach} />;
  if (lessonId === 'compose-six-nine') return <Unit2DualTaskPack lessonId="compose-six-nine" MainTask={ComposeSixNineTaskPack} onDone={onDone} onCoach={onCoach} />;
  if (lessonId === 'addsub-eight-nine') return <Unit2DualTaskPack lessonId="addsub-eight-nine" MainTask={EquationFamilyEightNineBoard} onDone={onDone} onCoach={onCoach} />;
  if (lessonId === 'addsub-six-seven') return <Unit2DualTaskPack lessonId="addsub-six-seven" MainTask={EquationFamilyBoard} onDone={onDone} onCoach={onCoach} />;
  if (lessonId === 'continuous-add-sub') return <Unit2DualTaskPack lessonId="continuous-add-sub" MainTask={ContinuousAddSubTaskPack} onDone={onDone} onCoach={onCoach} />;
  if (lessonId === 'mixed-add-sub') return <Unit2DualTaskPack lessonId="mixed-add-sub" MainTask={MixedAddSubTaskPack} onDone={onDone} onCoach={onCoach} />;
  if (lessonId === 'unit2-review') return <><Unit2CardOrganizer onDone={() => undefined} onCoach={onCoach} /><Unit2KnowledgeMap onCoach={onCoach} /><Unit2ReviewWorkbench onCoach={onCoach} /><Unit2CardLab lessonId={lessonId} onCoach={onCoach} /><Unit2ReviewCompletionGate onDone={onDone} onCoach={onCoach} /></>;
  if (lessonId === 'numbers') return <NumbersMarkingPractice onDone={onDone} onCoach={onCoach} />;
  if (lessonId === 'compare') return <CompareWithinFiveBoard onDone={onDone} onCoach={onCoach} />;
  if (lessonId === 'ordinal') return <OrdinalWithinFiveBoard onDone={onDone} onCoach={onCoach} />;
  if (lessonId === 'compose') return <ComposeWithinFiveBoard onDone={onDone} onCoach={onCoach} />;
  if (lessonId === 'add-within-5') return <AdditionWithinFivePractice onDone={onDone} onCoach={onCoach} />;
  if (lessonId === 'subtract-within-5') return <SubtractionWithinFivePractice onDone={onDone} onCoach={onCoach} />;
  if (lessonId === 'playground') return <PlaygroundExplorationBoard onDone={onDone} onCoach={onCoach} />;
  if (CLASSROOM_ROUTE_CONFIG[lessonId]) return <><ClassroomRouteBoard lessonId={lessonId} onDone={onDone} onCoach={onCoach} />{lessonId === 'classroom-discover' && <ClassroomIntroductionTask onCoach={onCoach} />}{lessonId === 'learning-readiness' && <OpenObservationTask lessonId={lessonId} onCoach={onCoach} />}</>;
  const missions = GAME_MISSIONS[lessonId];
  if (missions) return <>{<MissionSequenceTask key={lessonId} missions={missions} scene={GAME_SCENES[lessonId]} onDone={onDone} onCoach={onCoach} />}{(lessonId === 'campus' || lessonId === 'learning-readiness') && <OpenObservationTask lessonId={lessonId} onCoach={onCoach} />}{lessonId === 'classroom-discover' && <ClassroomIntroductionTask onCoach={onCoach} />}</>;
  if (lessonId === 'zero') return <ZeroPatternTask key={lessonId} onDone={onDone} onCoach={onCoach} />;
  if (lessonId === 'unit1-review') return <Unit1ReviewTaskPack onDone={onDone} onCoach={onCoach} />;
  const equations = UNIT1_EQUATION_STEPS[lessonId];
  if (equations) return <EquationSequenceTask key={lessonId} lessonId={lessonId} steps={equations} onDone={onDone} onCoach={onCoach} />;
  if (unit2Practice) return <MissionSequenceTask key={lessonId} missions={unit2Practice} onDone={onDone} onCoach={onCoach} />;
  const unit34Practice = UNIT34_PRACTICE[lessonId];
  if (unit34Practice) return <MissionSequenceTask key={lessonId} missions={unit34Practice} onDone={onDone} onCoach={onCoach} />;
  const unit5Practice = UNIT5_PRACTICE[lessonId];
  if (unit5Practice) return <MissionSequenceTask key={lessonId} missions={unit5Practice} onDone={onDone} onCoach={onCoach} />;
  const unit6Practice = UNIT6_PRACTICE[lessonId];
  if (unit6Practice) return <MissionSequenceTask key={lessonId} missions={unit6Practice} onDone={onDone} onCoach={onCoach} />;
  const check = GENERIC_CHECKS[lessonId] ?? { prompt: '回看操作：哪种说法能正确解释刚才的数学关系？', options: ['先看数量和关系，再说结论', '只看颜色', '随便猜一个数'], answer: '先看数量和关系，再说结论' };
  return <GenericCheckTask key={lessonId} config={check} onDone={onDone} onCoach={onCoach} />;
}
