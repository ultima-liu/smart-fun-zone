import './practice-again.css';

export default function PracticeAgain({ complete, onRestart }: { complete: boolean; onRestart: () => void }) {
  if (!complete) return null;
  return <div className="practice-again"><span>✓ 已完成 · 可以重复练习</span><button type="button" data-practice-restart onClick={onRestart}>再做一次</button></div>;
}
