import { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import './screen-writing.css';

export default function ScreenHanziWriting({ char, onPass }: { char: string; onPass: (supported: boolean) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const writer = useRef<HanziWriter | null>(null);
  const callback = useRef(onPass); callback.current = onPass;
  const helped = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('按笔顺在田字格里写，写对一笔就保留一笔。');
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let active = true;
    const controller = new AbortController();
    element.innerHTML = ''; helped.current = false; setCount(0);
    setMessage('按笔顺在田字格里写，写对一笔就保留一笔。');
    const quiz = HanziWriter.create(element, char, {
      width: 300, height: 300, padding: 20, showOutline: false, showCharacter: false, strokeColor: '#315ba5', leniency: 1, averageDistanceThreshold: 160,
      charDataLoader: (character, onLoad, onError) => {
        fetch(`/assets/chinese-textbook/strokes/${encodeURIComponent(character)}.json`, { signal: controller.signal })
          .then(response => { if (!response.ok) throw new Error('missing'); return response.json(); })
          .then(data => { if (active) onLoad(data); })
          .catch(error => { if (active) { setMessage('笔画模板暂时不可用，请重试。尚未记录完成。'); onError(error); } });
      },
    }); writer.current = quiz;
    quiz.quiz({ showHintAfterMisses: false,
      onMistake: () => { if (active) { helped.current = true; setMessage('这一笔再试试：注意起笔、方向和笔顺。'); } },
      onCorrectStroke: () => { if (active) { setCount(value => value + 1); setMessage('这一笔写对了，继续下一笔。'); } },
      onComplete: () => { if (active) { setMessage('✓ 自动检查通过：全部笔画按顺序写完。'); callback.current(helped.current); } },
    });
    return () => { active = false; controller.abort(); quiz.cancelQuiz(); quiz.pauseAnimation(); element.replaceChildren(); writer.current = null; };
  }, [char, attempt]);
  return <div className="screen-hanzi-writing" aria-label={`屏幕书写 ${char}`}>
    <div className="screen-hanzi-pad" ref={host} role="img" aria-label={`${char} 田字格书写区`} />
    <div className="screen-writing-actions"><button type="button" onClick={() => { helped.current = true; writer.current?.showOutline(); }}>看看描写提示</button><button type="button" onClick={() => setAttempt(value => value + 1)}>清空，重新写</button></div>
    <p role="status">{message}</p><small>已写对 {count} 笔 · 全部笔画写对后自动记完成。</small>
  </div>;
}
