import { useState } from 'react';
import { mathKnowledgeLineActivity, mathKnowledgeLineState } from '../content/mathKnowledgeLine';
import { playSfx } from '../speech';

export function MathKnowledgeLine({
  lessonId,
  values,
  selected,
  done,
  onSelect,
  onDone,
}: {
  lessonId: string;
  values: number[];
  selected: number[];
  done: boolean;
  onSelect: (values: number[]) => void;
  onDone: () => void;
}) {
  const activity = mathKnowledgeLineActivity(lessonId, values);
  const { fullPath, taskIndex, task, path } = mathKnowledgeLineState(activity, selected, done);
  const current = path[path.length - 1];
  const unit = lessonId === 'zero' ? '米刻度' : '地砖';
  const between = lessonId === 'between-positions';
  const steps = Math.max(0, path.length - 1);
  const [message, setMessage] = useState('');
  const pick = (value: number) => {
    if (done || value === current) return;
    if (value !== task.path[path.length]) {
      setMessage(
        !path.length
          ? '先找一找任务里说的起点。'
          : between
            ? '看看哪些人在两端之间，按从左到右的顺序点。'
            : activity.scene === 'queue'
              ? '从说好的那一边数，点紧挨着的下一位。'
              : '一次只走一格，点紧挨着的下一格。',
      );
      playSfx('wrong');
      return;
    }
    setMessage('');
    const next = [...selected, value];
    onSelect(next);
    playSfx('tap');
    if (next.length === fullPath.length) onDone();
  };
  return (
    <div className="mt-knowledge-model mt-knowledge-line-activity">
      <b>{activity.title}</b>
      {!done && (
        <p className="mt-knowledge-line-prompt" data-line-instruction>
          {task.instruction}
        </p>
      )}
      {activity.tasks.length > 1 && (
        <div className="mt-knowledge-line-rounds" aria-label="操作进度">
          {activity.tasks.map((item, i) => (
            <span
              key={item.instruction}
              className={done || i < taskIndex ? 'complete' : i === taskIndex ? 'active' : ''}
            >
              {done || i < taskIndex ? '✓' : i + 1}{' '}
              {between
                ? i === 0
                  ? '标两端'
                  : '数中间'
                : activity.scene === 'queue'
                  ? i === 0
                    ? '从左数'
                    : '从右数'
                  : i === 0
                    ? `${done || taskIndex > 0 ? '到 10：2 步' : '走到 10'}`
                    : `${done ? '到 20：8 步' : '走到 20'}`}
            </span>
          ))}
        </div>
      )}
      <div
        className={`mt-knowledge-route ${activity.scene}`}
        role="group"
        aria-label={activity.scene === 'queue' ? '小朋友队伍' : '一步一格的路线'}
      >
        {activity.values.map((value) => {
          const endpoint = between && taskIndex === 1 && (value === 3 || value === 7);
          const reached = path.includes(value);
          return (
            <button
              type="button"
              key={value}
              aria-label={`${activity.scene === 'queue' ? '小朋友' : unit} ${value}`}
              aria-pressed={reached}
              disabled={done || value === current || endpoint}
              className={`${reached ? 'reached' : ''} ${current === value ? 'current' : ''} ${endpoint ? 'excluded' : ''}`}
              onClick={() => pick(value)}
            >
              <span className="mt-knowledge-route-marker" aria-hidden="true">
                {endpoint
                  ? '×'
                  : current === value && activity.scene === 'walk'
                    ? '🐻'
                    : activity.scene === 'queue'
                      ? '🧒'
                      : reached
                        ? '✓'
                        : ''}
              </span>
              <strong>{value}</strong>
              <small>
                {endpoint
                  ? '两端'
                  : activity.scene === 'queue'
                    ? '号'
                    : lessonId === 'zero'
                      ? '米'
                      : '号地砖'}
              </small>
            </button>
          );
        })}
      </div>
      {lessonId === 'six-to-nine' && (
        <div className="mt-knowledge-line-beads" aria-label={`${current ?? 5} 颗珠子`}>
          {Array.from({ length: current ?? 5 }, (_, i) => (
            <i key={i} className={i >= 5 ? 'added' : ''}>
              ●
            </i>
          ))}
        </div>
      )}
      <div className="mt-knowledge-route-status" role="status">
        {message ||
          (done
            ? `✓ ${task.feedback}`
            : !path.length
              ? taskIndex
                ? `${activity.tasks[taskIndex - 1].feedback} ${between ? '开始数中间的人吧。' : '现在按上面的新任务继续。'}`
                : '先点起点，点过的位置会亮起来。'
              : between
                ? taskIndex === 0
                  ? '起点已标好，再点另一端。'
                  : `已点亮中间 ${path.length} 人，继续往右数。`
                : activity.scene === 'queue'
                  ? `已数 ${path.length} 位，继续点紧挨着的下一位。`
                  : `小熊走到 ${current}，已走 ${steps} 步。`)}
      </div>
    </div>
  );
}
