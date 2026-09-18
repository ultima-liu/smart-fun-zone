import { useEffect, useState } from 'react';
import { speakOnce, playSfx } from '../speech';
import { MATH_KNOWLEDGE_EXTENSION, type MathBridgeModel } from '../content/mathKnowledgeExtension';
import { ALL_MATH_LESSONS } from '../content/mathUpperCurriculum';

function Model({ model, lessonId, done, onDone }: { model: MathBridgeModel; lessonId: string; done: boolean; onDone: () => void }) {
  const [tapped, setTapped] = useState(0);
  if (model.kind === 'ten') {
    const needed = Math.min(model.add, 10 - model.filled);
    return <div className="mt-knowledge-model">
      <b>十格板 · 先看还差几格</b>
      <p>已有 {model.filled} 个，请点亮 {needed} 个空格，看看怎样凑成 10。</p>
      <div className="mt-knowledge-ten" role="group" aria-label="凑十操作">
        {Array.from({ length: 10 }, (_, index) => <button key={index} type="button" className={index < model.filled ? 'filled' : index < model.filled + tapped ? 'added' : ''} disabled={index < model.filled || index >= model.filled + needed || done} aria-label={`第 ${index + 1} 格`} onClick={() => { const next = tapped + 1; setTapped(next); playSfx('tap'); if (next === needed) onDone(); }}>{index < model.filled ? '●' : index < model.filled + tapped ? '★' : ''}</button>)}
      </div>
      <strong>{done ? `${model.filled}＋${needed}＝10${model.leftover ? `，余下 ${model.leftover} 个：10＋${model.leftover}＝${10 + model.leftover}` : ''}` : `还差 ${needed - tapped} 格`}</strong>
    </div>;
  }
  if (model.kind === 'place') {
    const firstBundle = lessonId === 'ten-again';
    return <div className="mt-knowledge-model">
      <b>数位小棒 · 十个一换一个十</b>
      {firstBundle && !done ? <><p>逐根点数，数到 10 后一起捆成一捆。</p><div className="mt-knowledge-sticks" role="group" aria-label="数十根小棒">{Array.from({ length: 10 }, (_, index) => <button type="button" key={index} className={index < tapped ? 'counted' : ''} disabled={index !== tapped} aria-label={`第 ${index + 1} 根小棒`} onClick={() => { const next = tapped + 1; setTapped(next); playSfx('tap'); if (next === 10) onDone(); }}>│</button>)}</div><strong>已数 {tapped} 根，还差 {10 - tapped} 根</strong></> : <div className="mt-knowledge-place"><div><span>十位</span><strong>{model.tens}</strong><small>{Array.from({ length: model.tens }, (_, i) => <i key={i} aria-label="一捆十根小棒">▥</i>)}</small></div><div><span>个位</span><strong>{model.ones}</strong><small>{Array.from({ length: model.ones }, (_, i) => <i key={i} aria-label="一根小棒">│</i>)}</small></div></div>}
      <p>一捆仍有 10 根；如果右边的个位是 0，就表示没有零散的小棒。</p>
    </div>;
  }
  if (model.kind === 'count') return <div className="mt-knowledge-model"><b>一个实物对应一个数词</b><div className="mt-knowledge-count">{Array.from({ length: model.total }, (_, index) => <span key={index}><i>●</i><strong>{index + 1}</strong></span>)}</div><p>点的大小、颜色变化，个数不变；最后一个数词表示这一组的总数。</p></div>;
  if (model.kind === 'pair') return <div className="mt-knowledge-model"><b>一一配对，看哪边有剩余</b><div className="mt-knowledge-pair"><div>{Array.from({ length: model.left }, (_, i) => <span key={i}>●</span>)}</div><div>{Array.from({ length: model.right }, (_, i) => <span key={i} className={i >= model.left ? 'extra' : ''}>●</span>)}</div></div><p>先配对，再看剩下；不要只靠两排的长短猜。</p></div>;
  if (model.kind === 'whole') return <div className="mt-knowledge-model"><b>整体与两个部分</b><div className="mt-knowledge-whole"><strong>{model.left + model.right}<small>整体</small></strong><span>＝</span><strong>{model.left}<small>第一部分</small></strong><span>＋</span><strong>{model.right}<small>第二部分</small></strong></div><p>问题问哪一部分？先画清关系，再决定怎样算。</p></div>;
  if (model.kind === 'line') return <div className="mt-knowledge-model"><b>数线 · 先定起点，再看间隔</b><div className="mt-knowledge-line">{model.values.map((value) => <span key={value}>{value}</span>)}</div><p>从左到右观察数序；问“第几”“之间”时要先确定起点和两端。</p></div>;
  if (model.kind === 'shape') return <div className="mt-knowledge-model"><b>同一种形状，换个朝向试一试</b><div className="mt-knowledge-shapes"><span className="box">平面支撑</span><span className="cylinder">竖放稳</span><span className="ball">曲面会滚</span></div><p>观察接触的面和支撑范围，而不是只看颜色。</p></div>;
  return <div className="mt-knowledge-model"><b>按步骤把想法说清</b><div className="mt-knowledge-steps">{model.labels.map((label, index) => <span key={label}><i>{index + 1}</i>{label}</span>)}</div><p>每一步都回到题目和操作中检查。</p></div>;
}

/** 一课一桥：图示化解释 + 新情境迁移。书写能力不参与数学理解判断。 */
export function MathKnowledgeBridge({ lessonId, onComplete, complete }: { lessonId: string; onComplete: () => void; complete: boolean }) {
  const card = MATH_KNOWLEDGE_EXTENSION[lessonId];
  const [modelDone, setModelDone] = useState(complete || card?.model.kind !== 'ten' && !(card?.model.kind === 'place' && lessonId === 'ten-again'));
  const [pick, setPick] = useState<string | null>(complete ? card?.answer ?? null : null);
  const [attempts, setAttempts] = useState(0);
  useEffect(() => { if (!complete && modelDone && pick === card?.answer) onComplete(); }, [card?.answer, complete, modelDone, onComplete, pick]);
  if (!card) return null;
  const right = pick === card.answer;
  return <section className="mt-knowledge" aria-label="本课知识延伸">
    <div className="mt-knowledge-head"><span>知识延伸 · {card.domain}</span><h4>{card.title}</h4>{card.from && <small>从《{ALL_MATH_LESSONS.find((lesson) => lesson.id === card.from)?.title ?? card.from}》学到的方法继续往前走</small>}</div>
    <div className="mt-knowledge-grid">
      <div className="mt-knowledge-story"><b>聪聪老师讲方法</b><p>{card.insight}</p><p className="mt-knowledge-example">例如：{card.example}</p><button type="button" onClick={() => speakOnce(`${card.title}。${card.insight}。例如，${card.example}。记住，${card.mnemonic}`, 'zh', .9)}>🔊 听讲解</button><div className="mt-knowledge-mnemonic">记住它：{card.mnemonic}</div></div>
      <Model model={card.model} lessonId={lessonId} done={modelDone} onDone={() => setModelDone(true)} />
    </div>
    <div className="mt-knowledge-transfer"><b>换一个情境试一试</b><p>{card.question}</p><div className="mt-knowledge-options">{card.options.map((option) => <button type="button" key={option} className={pick === option ? right ? 'correct' : 'wrong' : ''} disabled={right} onClick={() => { setPick(option); setAttempts((n) => n + 1); playSfx(option === card.answer ? 'correct' : 'wrong'); }}>{option}</button>)}</div>{pick && <p className={right ? 'good' : 'try'} role="status">{right ? card.feedback : attempts > 1 ? '还没答对。回看左边的方法和图，再想想。' : '再看一遍方法和图，试着解释自己的选择。'}</p>}{right && !modelDone && <p className="try">迁移题答对了，再完成右边的操作验证。</p>}{complete && <strong className="mt-knowledge-finished">✓ 方法能用到新问题了</strong>}</div>
  </section>;
}
