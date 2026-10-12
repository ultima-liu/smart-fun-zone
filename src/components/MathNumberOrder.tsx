import { useMemo, useState } from 'react';
import { orderingOptions } from '../orderingOptions';
import { playSfx } from '../speech';
import PracticeAgain from './PracticeAgain';

/** 数字卡需要真正找顺序，避免随机结果恰好按正序或倒序排好。 */
export function mathNumberOrderChoices(values: readonly number[], seed: string) {
  return orderingOptions(values, seed);
}

/** 原完成快照保留，重做在本地重新排；做完保留结果，点击重做才清空。 */
export default function MathNumberOrder({ values, progress, onProgress, seed, onCoach }: {
  values: readonly number[]; progress: number; onProgress: (step: number) => void; seed: string; onCoach: (text: string) => void;
}) {
  const [draft, setDraft] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const choices = useMemo(() => mathNumberOrderChoices(values, `${seed}:${round}`), [round, seed, values]);
  const complete = progress >= values.length;
  const step = draft ?? progress;
  const restart = () => {
    let nextRound = round + 1;
    while (mathNumberOrderChoices(values, `${seed}:${nextRound}`).every((value, i) => value === choices[i]) && nextRound < round + 20) nextRound++;
    setRound(nextRound); setDraft(0);
  };
  return <div className="mt-curriculum-tool mt-number-order-tool" aria-label="数字顺序练习">
    <PracticeAgain complete={complete} onRestart={restart} />
    <div className="mt-order-target" aria-label="已经排好的数字">{values.map((value, index) => <span key={value} className={index < step ? 'done' : index === step ? 'next' : ''}>{index < step ? value : '?'}</span>)}</div>
    <div className="mt-tool-options" role="group" aria-label="数字卡片" data-math-narration-options="skip">{choices.map(value => <button type="button" key={value} disabled={values.indexOf(value) < step} onClick={() => {
      if (value !== values[step]) { playSfx('tap'); onCoach('看看已经排好的数字，找下一个相邻数。'); return; }
      const next = step + 1;
      if (complete) setDraft(next); else onProgress(next);
      playSfx(next === values.length ? 'correct' : 'pop');
      onCoach(next === values.length ? '数字都按顺序排好了！' : '放对了，接着找下一个数。');
    }}>{value}</button>)}</div>
    <p role="status">{step === values.length ? '✓ 顺序完成，可以再做一次' : `已排 ${step} / ${values.length} 个数字`}</p>
  </div>;
}
