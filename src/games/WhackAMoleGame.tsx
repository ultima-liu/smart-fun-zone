import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from '../store';
import { sfx } from '../sfx';
import MoleArtwork from './MoleArtwork';
import { advanceMoleRound, createMoleRound, hitMoleHole, MOLE_LEVELS, moleMultiplier, ROUND_MS, type MoleDifficulty, type MoleRound } from './whackAMoleEngine';
import './whack-a-mole.css';

type Phase = 'ready' | 'countdown' | 'playing' | 'paused' | 'over';
export interface WhackAMoleOutcome { difficulty: MoleDifficulty; durationSec: number; reachedTarget: boolean }
interface Props { lang: 'zh' | 'en'; playerName: string; headerAction?: ReactNode; onComplete: (outcome: WhackAMoleOutcome) => void }
const snapshot = (round: MoleRound) => ({ ...round, holes: round.holes.map((hole) => ({ ...hole })) });

export default function WhackAMoleGame({ lang, playerName, headerAction, onComplete }: Props) {
  const zh = lang === 'zh';
  const sound = useStore((s) => s.sound);
  const toggleSound = useStore((s) => s.toggleSound);
  const [difficulty, setDifficulty] = useState<MoleDifficulty>('easy');
  const [phase, setPhase] = useState<Phase>('ready');
  const [view, setView] = useState(() => createMoleRound('easy'));
  const [countdown, setCountdown] = useState(3);
  const [bests, setBests] = useState<Partial<Record<MoleDifficulty, number>>>({});
  const roundRef = useRef(createMoleRound('easy'));
  const phaseRef = useRef<Phase>('ready');
  const pausedFrom = useRef<'playing' | 'countdown'>('playing');
  const countdownLeft = useRef(3000);
  const boardRef = useRef<HTMLDivElement>(null);
  const level = MOLE_LEVELS[difficulty];
  const left = Math.ceil((ROUND_MS - view.elapsed) / 1000);
  const accuracy = view.attempts ? Math.round(view.hits / view.attempts * 100) : 0;

  const changePhase = useCallback((next: Phase) => { phaseRef.current = next; setPhase(next); }, []);
  const finish = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const round = roundRef.current;
    changePhase('over');
    setBests((prev) => ({ ...prev, [round.difficulty]: Math.max(prev[round.difficulty] ?? 0, round.score) }));
    sfx.memWin();
    onComplete({ difficulty: round.difficulty, durationSec: ROUND_MS / 1000, reachedTarget: round.score >= MOLE_LEVELS[round.difficulty].target });
  }, [changePhase, onComplete]);

  const start = () => {
    roundRef.current = createMoleRound(difficulty);
    setView(snapshot(roundRef.current));
    countdownLeft.current = 3000;
    setCountdown(3);
    changePhase('countdown');
    boardRef.current?.focus({ preventScroll: true });
    sfx.click();
  };
  const pause = useCallback(() => {
    if (phaseRef.current === 'paused') {
      changePhase(pausedFrom.current);
      boardRef.current?.focus({ preventScroll: true });
    } else if (phaseRef.current === 'playing' || phaseRef.current === 'countdown') {
      pausedFrom.current = phaseRef.current;
      changePhase('paused');
    }
  }, [changePhase]);

  useEffect(() => {
    if (phase !== 'playing' && phase !== 'countdown') return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = now - last;
      last = now;
      if (phaseRef.current === 'countdown') {
        countdownLeft.current = Math.max(0, countdownLeft.current - delta);
        setCountdown(Math.max(1, Math.ceil(countdownLeft.current / 1000)));
        if (countdownLeft.current === 0) changePhase('playing');
      } else if (phaseRef.current === 'playing') {
        advanceMoleRound(roundRef.current, delta);
        setView(snapshot(roundRef.current));
        if (roundRef.current.over) finish();
      }
    }, 40);
    return () => window.clearInterval(timer);
  }, [phase, changePhase, finish]);

  useEffect(() => {
    const onHidden = () => {
      if (document.hidden && (phaseRef.current === 'playing' || phaseRef.current === 'countdown')) pause();
    };
    const onBlur = () => {
      if (phaseRef.current === 'playing' || phaseRef.current === 'countdown') pause();
    };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('blur', onBlur);
    return () => { document.removeEventListener('visibilitychange', onHidden); window.removeEventListener('blur', onBlur); };
  }, [pause]);

  const hit = (index: number) => {
    if (phaseRef.current !== 'playing') return;
    const result = hitMoleHole(roundRef.current, index);
    if (result === null) return;
    if (result === 'mole' || result === 'gold') sfx.lkMatch(Math.min(5, roundRef.current.combo));
    else sfx.memMiss();
    setView(snapshot(roundRef.current));
  };
  const visitorName = (kind: string | null) => kind === 'rabbit' ? (zh ? '小兔子，别打我' : 'Rabbit, do not hit') : kind === 'gold' ? (zh ? '金色地鼠' : 'Golden mole') : kind === 'mole' ? (zh ? '小地鼠' : 'Mole') : (zh ? '空地洞' : 'Empty hole');

  return (
    <section className="wm-game" aria-labelledby="wm-title" onKeyDown={(event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      if (event.key.toLowerCase() === 'p' || event.key === 'Escape') { event.preventDefault(); pause(); }
      if (/^[1-9]$/.test(event.key) && phaseRef.current === 'playing') { event.preventDefault(); hit(Number(event.key) - 1); }
    }}>
      <header className="wm-heading">
        {headerAction}
        <div className="wm-title-copy"><span>LITTLE GARDEN · {zh ? '敏捷游乐场' : 'REFLEX ARCADE'}</span><h2 id="wm-title">{zh ? '花园打地鼠' : 'Mole Meadow'}</h2><p>{zh ? '小地鼠探头啦，把快乐敲进春天里。' : 'Little visitors, big smiles. Let the meadow play begin.'}</p></div>
        <div className="wm-best"><span>{zh ? '本次访问最佳' : 'SESSION BEST'}</span><b>{bests[difficulty] ?? '—'}<small> {zh ? '分' : 'pts'}</small></b></div>
      </header>

      <div className="wm-toolbar">
        <div className="wm-levels" role="group" aria-label={zh ? '打地鼠难度' : 'Mole difficulty'}>
          {(Object.keys(MOLE_LEVELS) as MoleDifficulty[]).map((item) => <button key={item} type="button" aria-pressed={difficulty === item} disabled={phase !== 'ready' && phase !== 'over'} onClick={() => {
            setDifficulty(item); roundRef.current = createMoleRound(item); setView(snapshot(roundRef.current)); changePhase('ready');
          }}>{MOLE_LEVELS[item][lang]}</button>)}
        </div>
        <div className="wm-tools">
          <button type="button" onClick={toggleSound} aria-pressed={sound} aria-label={zh ? (sound ? '关闭游戏声音' : '开启游戏声音') : (sound ? 'Mute game' : 'Unmute game')}>{sound ? '♫' : '♪'} <span>{zh ? (sound ? '声音开' : '声音关') : (sound ? 'Sound on' : 'Sound off')}</span></button>
          {(phase === 'playing' || phase === 'countdown' || phase === 'paused') && <button type="button" onClick={pause}>{phase === 'paused' ? (zh ? '继续' : 'Resume') : (zh ? '暂停' : 'Pause')}</button>}
        </div>
      </div>

      <div className="wm-layout">
        <div className="wm-stage">
          <div className="wm-scoreboard">
            <div><span>{zh ? '本局得分' : 'SCORE'}</span><b data-testid="mole-score">{view.score.toString().padStart(3, '0')}</b></div>
            <div className={`wm-combo ${view.combo >= 5 ? 'hot' : ''}`}><span>{zh ? '连续命中' : 'COMBO'}</span><b>×{view.combo}<small>{view.combo >= 5 ? ` · ${moleMultiplier(view.combo)}×` : ''}</small></b></div>
            <div className={left <= 10 ? 'wm-time urgent' : 'wm-time'}><span>{zh ? '剩余时间' : 'TIME LEFT'}</span><b data-testid="mole-time">{left}<small>s</small></b></div>
          </div>
          <div className="wm-timeline" role="progressbar" aria-label={zh ? '剩余游戏时间' : 'Time remaining'} aria-valuemin={0} aria-valuemax={60} aria-valuenow={left}><i style={{ width: `${left / 60 * 100}%` }} /></div>

          <div ref={boardRef} tabIndex={0} className={`wm-meadow ${phase === 'paused' ? 'is-paused' : ''}`} role="group" aria-label={zh ? '打地鼠九宫格，数字键 1 到 9 对应地洞' : 'Nine mole holes, number keys 1 to 9'}>
            <div className="wm-scenery" aria-hidden="true"><i className="wm-sun" /><i className="wm-cloud one" /><i className="wm-cloud two" /><span className="wm-garden-sign">{zh ? '春日小花园' : 'THE LITTLE GARDEN'}</span><i className="wm-hill one" /><i className="wm-hill two" /></div>
            <div className="wm-holes">
              {view.holes.map((hole, index) => {
                const preview = phase === 'ready' ? (index === 0 ? 'mole' : index === 4 ? 'gold' : index === 8 ? 'rabbit' : null) : null;
                const kind = hole.kind ?? preview;
                return <button key={index} type="button" className={`wm-hole ${kind ? `up ${kind}` : ''} ${hole.feedback ? 'whacked' : ''}`} disabled={phase !== 'playing'} aria-label={`${zh ? '地洞' : 'Hole'} ${index + 1}，${visitorName(hole.kind)}`} data-kind={hole.kind ?? 'empty'} onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  event.preventDefault(); hit(index); boardRef.current?.focus({ preventScroll: true });
                }} onClick={(event) => { if (event.detail === 0) hit(index); }}>
                  <span className="wm-hole-shadow" />
                  <span className="wm-burrow"><span className="wm-visitor"><MoleArtwork kind={kind ?? 'mole'} happy={!!hole.feedback} /></span></span>
                  <span className="wm-rim" /><span className="wm-hole-key" aria-hidden="true">{index + 1}</span>
                  {hole.feedback && <><span className="wm-mallet" key={`hammer-${hole.feedbackUntil}`} aria-hidden="true" /><span key={hole.feedbackUntil} className={`wm-hit ${hole.feedback.startsWith('−') ? 'oops' : ''}`} aria-hidden="true">{hole.feedback}<i>{hole.feedback.startsWith('+') ? '✦' : ''}</i></span></>}
                </button>;
              })}
            </div>
            <div className="wm-flowers" aria-hidden="true"><span>✿</span><span>✿</span><span>✿</span><span>✿</span><span>✿</span></div>

            {phase !== 'playing' && <div className={`wm-overlay ${phase === 'countdown' ? 'counting' : ''}`}>
              {phase === 'countdown' ? <div className="wm-count"><b key={countdown}>{countdown}</b><p>{zh ? '小锤子准备好，地鼠要来啦！' : 'Get ready, here come the moles!'}</p></div> : <div className="wm-overlay-card">
                <span className="wm-card-eyebrow">{phase === 'over' ? 'NICE PLAY!' : 'HELLO, LITTLE GARDENER'}</span>
                <div className="wm-card-mascot"><MoleArtwork kind={phase === 'over' && view.score >= level.target ? 'gold' : 'mole'} happy /></div>
                <h3>{phase === 'ready' ? (zh ? '来敲一场春日快乐' : 'A little meadow magic') : phase === 'paused' ? (zh ? '花园休息一下' : 'A meadow break') : (zh ? (view.score >= level.target ? '花园小高手！' : '快乐收获完成！') : (view.score >= level.target ? 'Meadow master!' : 'A lovely harvest!'))}</h3>
                {phase === 'ready' && <p>{zh ? `${playerName}，60 秒内敲中地鼠收集分数。金色地鼠有惊喜，小兔子要温柔放过哦！` : `${playerName}, tap moles for 60 seconds. Golden moles bring a bonus; let the little rabbits hop away!`}</p>}
                {phase === 'paused' && <p>{zh ? '时间和小动物都等着你，准备好再继续。' : 'The timer and visitors are waiting. Resume when you are ready.'}</p>}
                {phase === 'over' && <><div className="wm-final-score">{view.score}<small>{zh ? '分' : 'pts'}</small></div><div className="wm-results"><span>{zh ? '命中' : 'Hits'}<b>{view.hits}</b></span><span>{zh ? '准确率' : 'Accuracy'}<b>{accuracy}%</b></span><span>{zh ? '最高连击' : 'Best combo'}<b>{view.maxCombo}</b></span></div></>}
                <button type="button" className="wm-primary" onClick={phase === 'paused' ? pause : start}>{phase === 'ready' ? (zh ? '开始打地鼠' : 'Start playing') : phase === 'paused' ? (zh ? '继续游戏' : 'Resume game') : (zh ? '再来一局' : 'Play again')}<span aria-hidden="true">→</span></button>
                {phase === 'paused' && <button type="button" className="wm-restart" onClick={start}>{zh ? '重新开局' : 'Restart round'}</button>}
                <small className="wm-overlay-tip">{zh ? '点按地洞 · 数字键 1–9 · P / Esc 暂停' : 'Tap holes · Keys 1–9 · P / Esc to pause'}</small>
              </div>}
            </div>}
          </div>
          <div className="wm-stage-caption"><span aria-hidden="true">✿</span>{zh ? '眼疾手快，也要记得照顾小兔子。' : 'Quick hands, kind hearts. Look out for the rabbits.'}<span>01 — 09</span></div>
        </div>

        <aside className="wm-guide">
          <div className="wm-guide-heading"><span>FIELD NOTES</span><h3>{zh ? '花园游玩手册' : 'Meadow field guide'}</h3></div>
          <div className="wm-legend">
            {(['mole', 'gold', 'rabbit'] as const).map((kind) => <div key={kind} className={`wm-legend-row ${kind}`}><div><MoleArtwork kind={kind} /></div><p><b>{kind === 'mole' ? (zh ? '小地鼠' : 'Little mole') : kind === 'gold' ? (zh ? '金色地鼠' : 'Golden mole') : (zh ? '小兔子' : 'Little rabbit')}</b><span>{kind === 'rabbit' ? (zh ? '别敲！误敲 −20 分' : 'Let it hop! Hit: −20') : kind === 'gold' ? (zh ? '闪亮奖励 +30 分' : 'Golden bonus +30') : (zh ? '轻轻一敲 +10 分' : 'A quick tap +10')}</span></p></div>)}
          </div>
          <div className="wm-combo-note"><span aria-hidden="true">✦</span><div><b>{zh ? '连击让快乐翻倍' : 'Keep the combo growing'}</b><p>{zh ? '连续命中 5 次得 2 倍分，10 次得 3 倍分。漏掉地鼠、敲空或误敲兔子会中断连击。' : '5 hits earn 2× points; 10 earn 3×. Missed moles, empty taps and rabbit hits break your combo.'}</p></div></div>
          <div className="wm-goal"><span>{zh ? '本局小目标' : 'YOUR LITTLE GOAL'}</span><b>{level.target}<small>{zh ? '分' : 'pts'}</small><i aria-hidden="true">⚑</i></b><div><i style={{ width: `${Math.min(100, view.score / level.target * 100)}%` }} /></div><p>{view.score >= level.target ? (zh ? '目标达成！继续收集快乐吧。' : 'Goal reached! Keep the joy growing.') : (zh ? '尽力就好，每次命中都是进步。' : 'Every little hit is a step forward.')}</p></div>
          <div className="wm-session-stats"><span>{zh ? '命中地鼠' : 'Moles hit'}<b>{view.hits}</b></span><span>{zh ? '漏掉地鼠' : 'Moles missed'}<b>{view.missed}</b></span><span>{zh ? '误敲兔子' : 'Rabbit hits'}<b>{view.rabbitHits}</b></span></div>
          <p className="wm-key-note">{zh ? 'Web：鼠标或数字键 1–9\nPad：直接点按地洞，单指多指都可以' : 'Web: mouse or keys 1–9\nPad: tap the holes with one or more fingers'}</p>
        </aside>
      </div>
    </section>
  );
}
