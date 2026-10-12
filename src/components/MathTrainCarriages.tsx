const numbers = Array.from({ length: 11 }, (_, index) => index + 10);

/** 同一段等距车厢同时表达相邻数和数之间的距离。编号表示车厢号，不是数量。 */
export default function MathTrainCarriages({ reached = 0, marked, onChoose }: {
  reached?: number; marked?: number; onChoose?: (number: number) => void;
}) {
  return <div className="mt-train-row" role="group" aria-label="10号到20号车厢，每两节相邻车厢之间的距离相同">
    {numbers.map((number, index) => {
      const className = `mt-train-carriage ${index < reached ? 'visited' : ''} ${number === marked ? 'marked' : ''} ${number === 10 || number === 20 ? 'endpoint' : ''}`;
      const content = <>{index < reached && <span className="mt-train-checked" aria-hidden="true">✓</span>}{number === marked && <span className="mt-train-bear" aria-hidden="true">🐻</span>}<span className="mt-train-windows" aria-hidden="true"><i /><i /></span><b>{number}</b><small>号车厢</small><span className="mt-train-wheels" aria-hidden="true"><i /><i /></span></>;
      return onChoose
        ? <button key={number} type="button" className={className} aria-label={`${number}号车厢`} aria-pressed={index < reached} disabled={index < reached} onClick={() => onChoose(number)}>{content}</button>
        : <div key={number} className={className} aria-label={`${number}号车厢${number === marked ? '，小熊在这里' : ''}`}>{content}</div>;
    })}
  </div>;
}
