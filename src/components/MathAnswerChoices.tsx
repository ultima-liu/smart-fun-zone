import type { HTMLAttributes } from 'react';
import '../math-teaching.css';

type Props = HTMLAttributes<HTMLDivElement> & { options: readonly (string | number)[] };

/** 答案按文字长度排版，不让单个符号和短词铺满整列。 */
export function mathChoiceSize(options: readonly (string | number)[]) {
  const labels = options.map(option => String(option).replace(/\s+/g, ''));
  if (labels.length && labels.every(label => /^\d{1,3}$/u.test(label) || /^[＋+－\-×÷=＝＜＞<>○□△◇●■.]$/u.test(label))) return 'symbols';
  return labels.every(label => label.length <= 10) ? 'short' : 'text';
}

export default function MathAnswerChoices({ options, className = '', children, ...props }: Props) {
  return <div role="group" aria-label="选择答案" {...props} className={`mt-answer-row math-answer-choices ${className}`} data-choice-size={mathChoiceSize(options)}>{children}</div>;
}
