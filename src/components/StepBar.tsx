const PLANETS = ['🪐', '🌍', '🌙', '⭐'];

interface StepBarProps {
  current: number;
  labels: string[];
  /** 点击跳转 */
  onStepClick?: (i: number) => void;
  /** 从该索引起锁定（顺序推进式）：未解锁步骤灰锁不可点 */
  lockedFrom?: number;
}

/** 学习步骤条（线式节点）：圆点 + 连接线 + 状态流光，比按钮切换更高级 */
export function StepBar({ current, labels, onStepClick, lockedFrom }: StepBarProps) {
  return (
    <div className="step-bar steps" role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={labels.length}>
      {labels.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const locked = lockedFrom !== undefined && i >= lockedFrom;
        return (
          <button
            key={i}
            className={`step-node ${done ? 'done' : ''} ${active ? 'active' : ''} ${locked ? 'locked' : ''} ${!locked && onStepClick ? 'clickable' : ''}`}
            onClick={() => {
              if (!locked) onStepClick?.(i);
            }}
            disabled={locked}
            aria-current={active ? 'step' : undefined}
          >
            <span className="step-dot">{locked ? '🔒' : done ? '✓' : PLANETS[i]}</span>
            <span className="step-node-label">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
