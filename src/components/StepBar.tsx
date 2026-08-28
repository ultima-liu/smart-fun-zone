interface StepBarProps {
  current: number;
  labels: string[];
  /** 点击跳转（任意步骤自由切换；练习项始终可进） */
  onStepClick?: (i: number) => void;
}

/** 学习步骤条：看课文 → 听读 → 认生字 → 去练习（分段式，点击切换） */
export function StepBar({ current, labels, onStepClick }: StepBarProps) {
  return (
    <div className="step-bar" role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={labels.length}>
      {labels.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <button
            key={i}
            className={`step-seg ${done ? 'done' : ''} ${active ? 'active' : ''} ${onStepClick ? 'clickable' : ''}`}
            onClick={() => onStepClick?.(i)}
            aria-current={active ? 'step' : undefined}
          >
            {done ? '✓ ' : ''}
            {label}
          </button>
        );
      })}
    </div>
  );
}
