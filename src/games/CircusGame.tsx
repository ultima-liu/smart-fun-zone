import { useCallback, useEffect, useRef, useState, type ReactNode, type PointerEvent } from 'react';
import { useStore } from '../store';
import {
  advanceCircus,
  CIRCUS_ACTS,
  circusBonus,
  circusCamera,
  createCircusState,
  jumpCircus,
  nextCircusAct,
  retryCircus,
  type CircusMode,
} from './circusEngine';
import { CIRCUS_HEIGHT, CIRCUS_WIDTH, drawCircus } from './circusArtwork';
import { CircusAudio } from './circusAudio';
import { loadCircusLion } from './circusLionSprites';
import './circus.css';
export interface CircusOutcome {
  result: 'win' | 'lose';
  mode: CircusMode;
  stage: number;
  score: number;
  durationSec: number;
}
interface Props {
  lang: 'zh' | 'en';
  playerName: string;
  headerAction?: ReactNode;
  onComplete: (outcome: CircusOutcome) => void;
}
type Phase = 'ready' | 'playing' | 'paused' | 'hit' | 'clear' | 'over';
const LEFT = ['ArrowLeft', 'KeyA'],
  RIGHT = ['ArrowRight', 'KeyD'];
const KEYS = [...LEFT, ...RIGHT, 'Space', 'KeyJ', 'KeyK', 'ArrowUp', 'KeyP', 'Escape', 'Enter'];
export default function CircusGame({ lang, playerName, headerAction, onComplete }: Props) {
  const zh = lang === 'zh',
    sound = useStore((s) => s.sound),
    toggleSound = useStore((s) => s.toggleSound);
  const [mode, setMode] = useState<CircusMode>('A'),
    [startingAct, setStartingAct] = useState(1);
  const [initial] = useState(() => createCircusState());
  const state = useRef(initial),
    canvas = useRef<HTMLCanvasElement>(null),
    audio = useRef(new CircusAudio());
  const [phase, setPhase] = useState<Phase>('ready'),
    phaseRef = useRef<Phase>('ready');
  const keys = useRef(new Set<string>()),
    pointers = useRef(new Map<number, number>());
  const completion = useRef(onComplete),
    completed = useRef(false),
    best = useRef(20000);
  const soundRef = useRef(sound);
  completion.current = onComplete;
  soundRef.current = sound;
  const snapshot = useCallback(() => {
    const s = state.current;
    return {
      score: s.score,
      lives: s.lives,
      stage: s.stage,
      round: s.round,
      bonus: circusBonus(s),
      x: Math.round(s.x),
      y: Math.round(s.y),
      camera: Math.round(circusCamera(s)),
      support: s.support,
      grounded: s.grounded,
      elapsed: s.elapsed,
    };
  }, []);
  const [view, setView] = useState(snapshot);
  const clearInput = useCallback(() => {
    keys.current.clear();
    pointers.current.clear();
  }, []);
  const transition = useCallback(
    (next: Phase) => {
      phaseRef.current = next;
      setPhase(next);
      clearInput();
      if (next !== 'playing') audio.current.stop();
    },
    [clearInput],
  );
  const draw = useCallback(() => {
    const c = canvas.current?.getContext('2d');
    if (!c) return;
    drawCircus(
      c,
      state.current,
      best.current,
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
  }, []);
  const publish = useCallback(() => {
    const s = state.current;
    const events = s.events.splice(0);
    if (s.status !== 'playing') transition(s.status);
    for (const event of events) audio.current.effect(event, soundRef.current);
    best.current = Math.max(best.current, s.score);
    setView(snapshot());
    draw();
    if (s.status === 'over' && !completed.current) {
      completed.current = true;
      completion.current({
        result: s.cleared >= 5 ? 'win' : 'lose',
        mode: s.mode,
        stage: s.round * 5 + s.stage,
        score: s.score,
        durationSec: Math.max(1, Math.round(s.elapsed)),
      });
    }
  }, [draw, snapshot, transition]);
  const focus = () => canvas.current?.focus({ preventScroll: true });
  const start = () => {
    transition('playing');
    audio.current.start(state.current.stage, soundRef.current);
    focus();
  };
  const reset = (nextMode = mode, act = startingAct) => {
    audio.current.stop();
    state.current = createCircusState(nextMode, act);
    completed.current = false;
    setMode(nextMode);
    setStartingAct(act);
    transition('ready');
    publish();
  };
  const pause = useCallback(() => {
    if (phaseRef.current === 'playing') transition('paused');
    else if (phaseRef.current === 'paused') {
      transition('playing');
      audio.current.start(state.current.stage, soundRef.current);
      canvas.current?.focus({ preventScroll: true });
    }
  }, [transition]);
  const jump = useCallback(
    (high: boolean) => {
      if (phaseRef.current !== 'playing') return;
      jumpCircus(state.current, high);
      publish();
    },
    [publish],
  );
  const continueAct = () => {
    if (phaseRef.current === 'hit') retryCircus(state.current);
    else if (phaseRef.current === 'clear') nextCircusAct(state.current);
    transition('playing');
    publish();
    audio.current.start(state.current.stage, soundRef.current);
    focus();
  };
  useEffect(() => {
    let cancelled = false;
    void loadCircusLion().then(() => {
      if (!cancelled) draw();
    });
    return () => {
      cancelled = true;
    };
  }, [draw]);
  useEffect(() => {
    draw();
    if (phase !== 'playing') return;
    let frame = 0,
      previous = performance.now(),
      lastPublish = previous;
    const tick = (now: number) => {
      if (phaseRef.current !== 'playing') return;
      const dt = Math.min(0.1, Math.max(0, (now - previous) / 1000));
      previous = now;
      const touches = [...pointers.current.values()],
        touch = touches[touches.length - 1];
      const left = LEFT.some((key) => keys.current.has(key)),
        right = RIGHT.some((key) => keys.current.has(key));
      const direction = (touch ?? Number(right) - Number(left)) as -1 | 0 | 1;
      advanceCircus(state.current, dt, direction);
      if (
        now - lastPublish > 80 ||
        state.current.events.length ||
        state.current.status !== 'playing'
      ) {
        publish();
        lastPublish = now;
      } else draw();
      if (phaseRef.current === 'playing') frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, draw, publish]);
  useEffect(() => {
    const keyup = (e: KeyboardEvent) => keys.current.delete(e.code);
    const blur = () => {
      clearInput();
      audio.current.stop();
      if (phaseRef.current === 'playing') transition('paused');
    };
    const visibility = () => {
      if (document.hidden) blur();
    };
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', visibility);
      clearInput();
      audio.current.dispose();
    };
  }, [clearInput, transition]);
  useEffect(() => {
    if (sound && phase === 'playing') audio.current.start(state.current.stage, true);
    else if (!sound || phase === 'ready' || phase === 'paused') audio.current.stop();
    else audio.current.stopMusic();
  }, [sound, phase]);
  const press = (e: PointerEvent<HTMLButtonElement>, direction?: number, high?: boolean) => {
    e.preventDefault();
    if (phaseRef.current !== 'playing') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    focus();
    if (direction !== undefined) pointers.current.set(e.pointerId, direction);
    else jump(!!high);
  };
  const release = (e: PointerEvent<HTMLButtonElement>) => pointers.current.delete(e.pointerId);
  const act = CIRCUS_ACTS[view.stage - 1];
  const overlayTitle =
    phase === 'ready'
      ? zh
        ? '好戏，开场'
        : 'Showtime!'
      : phase === 'paused'
        ? zh
          ? '中场休息'
          : 'Intermission'
        : phase === 'clear'
          ? zh
            ? '精彩演出！'
            : 'Bravo!'
          : phase === 'hit'
            ? zh
              ? '再试一次'
              : 'Try again'
            : zh
              ? '演出谢幕'
              : 'Final curtain';
  return (
    <section className="cc-game" aria-label={zh ? '马戏团游戏' : 'Circus Charlie game'}>
      <header className="cc-header">
        {headerAction}
        <div>
          <span>{zh ? '星光大剧场 · 五场经典表演' : 'THE GRAND CIRCUS · FIVE CLASSIC ACTS'}</span>
          <h2>{zh ? '马戏团' : 'Circus Charlie'}</h2>
          <p>
            {zh
              ? `${playerName}，大幕拉开，轮到你登场了。`
              : `${playerName}, the spotlight is yours.`}
          </p>
        </div>
        <button type="button" className="cc-sound" onClick={toggleSound} aria-pressed={sound}>
          {sound ? (zh ? '声音：开' : 'Sound on') : zh ? '声音：关' : 'Sound off'}
        </button>
      </header>
      <div className="cc-layout">
        <div className="cc-console">
          <div className="cc-bezel">
            <span>{zh ? '星光马戏团' : 'THE GRAND CIRCUS'}</span>
            <i>●</i>
            <span>{zh ? '舞台就绪' : 'LIVE ON STAGE'}</span>
          </div>
          <div className="cc-screen">
            <canvas
              ref={canvas}
              width={CIRCUS_WIDTH}
              height={CIRCUS_HEIGHT}
              tabIndex={0}
              aria-label={
                zh
                  ? '马戏团舞台，左右移动，空格或 J 小跳，K 大跳，P 暂停'
                  : 'Circus stage: arrows to move, Space or J to jump, K for high jump, P to pause'
              }
              data-phase={phase}
              data-stage={view.stage}
              data-round={view.round}
              data-player-x={view.x}
              data-player-y={view.y}
              data-camera-x={view.camera}
              data-support={view.support ?? 'none'}
              data-grounded={String(view.grounded)}
              onBlur={clearInput}
              onKeyDown={(e) => {
                if (!KEYS.includes(e.code)) return;
                e.preventDefault();
                if (e.repeat) return;
                if (e.code === 'KeyP' || e.code === 'Escape') {
                  pause();
                  return;
                }
                if (e.code === 'Enter') {
                  if (phaseRef.current === 'ready') start();
                  else if (phaseRef.current === 'hit' || phaseRef.current === 'clear')
                    continueAct();
                  return;
                }
                if (phaseRef.current !== 'playing') return;
                keys.current.add(e.code);
                if (['Space', 'KeyJ', 'KeyK', 'ArrowUp'].includes(e.code)) jump(e.code === 'KeyK');
              }}
            />
            {phase !== 'playing' && (
              <div className={'cc-overlay cc-overlay-' + phase}>
                <span className="cc-overlay-mark">
                  {phase === 'ready'
                    ? zh
                      ? '掌声准备好了吗'
                      : 'A LITTLE WONDER AWAITS'
                    : `STAGE ${String(view.round * 5 + view.stage).padStart(2, '0')}`}
                </span>
                <strong>{overlayTitle}</strong>
                <p>
                  {phase === 'ready'
                    ? zh
                      ? '五场经典表演 · 三条生命'
                      : 'Five classic acts · Three lives'
                    : phase === 'paused'
                      ? zh
                        ? '舞台等你回来'
                        : 'The show will wait'
                      : phase === 'clear'
                        ? zh
                          ? '漂亮！剩余 BONUS 已计入分数'
                          : 'Bravo! Remaining BONUS added to your score'
                        : phase === 'hit'
                          ? zh
                            ? `还有 ${view.lives} 条生命，再试一次`
                            : `${view.lives} lives left. Try again`
                          : zh
                            ? `本次得分 ${view.score}`
                            : `Your score: ${view.score}`}
                </p>
                {phase === 'ready' ? (
                  <button type="button" aria-label={zh ? '开始表演' : 'Start show'} onClick={start}>
                    {zh ? '开始表演' : 'Start show'} <span>▶</span>
                  </button>
                ) : phase === 'paused' ? (
                  <button
                    type="button"
                    aria-label={zh ? '继续表演' : 'Resume show'}
                    onClick={pause}
                  >
                    {zh ? '继续表演' : 'Resume show'} <span>▶</span>
                  </button>
                ) : phase === 'hit' || phase === 'clear' ? (
                  <button type="button" onClick={continueAct}>
                    {phase === 'hit'
                      ? zh
                        ? '重试本关'
                        : 'Retry act'
                      : zh
                        ? '下一场表演'
                        : 'Next act'}{' '}
                    <span>▶</span>
                  </button>
                ) : (
                  <button type="button" onClick={() => reset()}>
                    {zh ? '再来一局' : 'Play again'} <span>▶</span>
                  </button>
                )}
                {phase === 'ready' && (
                  <small>
                    GAME {mode} · {act[zh ? 'zh' : 'en']}
                  </small>
                )}
              </div>
            )}
          </div>
          <div className="cc-controller" aria-label={zh ? '触屏游戏手柄' : 'Touch controller'}>
            <div className="cc-dpad">
              {([-1, 1] as const).map((dir) => (
                <button
                  type="button"
                  key={dir}
                  disabled={phase !== 'playing'}
                  aria-label={
                    zh ? (dir < 0 ? '向左移动' : '向右移动') : dir < 0 ? 'Move left' : 'Move right'
                  }
                  onPointerDown={(e) => press(e, dir)}
                  onPointerUp={release}
                  onPointerCancel={release}
                  onLostPointerCapture={release}
                  onKeyDown={(e) => {
                    if (e.code === 'Space' || e.code === 'Enter') {
                      e.preventDefault();
                      pointers.current.set(-dir - 10, dir);
                    }
                  }}
                  onKeyUp={() => pointers.current.delete(-dir - 10)}
                  onBlur={() => pointers.current.delete(-dir - 10)}
                >
                  {dir < 0 ? '◀' : '▶'}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="cc-pause"
              aria-label={phase === 'paused' ? (zh ? '继续' : 'Resume') : zh ? '暂停' : 'Pause'}
              disabled={phase !== 'playing' && phase !== 'paused'}
              onClick={pause}
            >
              {phase === 'paused' ? (zh ? '继续' : 'Resume') : zh ? '暂停' : 'Pause'}
              <small>P / ESC</small>
            </button>
            <div className="cc-action-buttons">
              {([true, false] as const).map((high) => (
                <button
                  type="button"
                  key={String(high)}
                  disabled={phase !== 'playing'}
                  aria-label={
                    zh
                      ? high
                        ? 'B 大跳 / 松手'
                        : 'A 小跳 / 松手'
                      : high
                        ? 'B High jump / Release'
                        : 'A Jump / Release'
                  }
                  onPointerDown={(e) => press(e, undefined, high)}
                  onPointerUp={release}
                  onPointerCancel={release}
                  onClick={(e) => {
                    if (e.detail === 0) jump(high);
                  }}
                >
                  <b>{high ? 'B' : 'A'}</b>
                  <small>{zh ? (high ? '大跳' : '小跳') : high ? 'HIGH' : 'JUMP'}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
        <aside className="cc-aside">
          <div className="cc-act-current">
            <span>
              {zh ? '正在上演' : 'ON STAGE'} ·{' '}
              {String(view.round * 5 + view.stage).padStart(2, '0')}
            </span>
            <h3>{act[zh ? 'zh' : 'en']}</h3>
            <p>{act[zh ? 'hintZh' : 'hintEn']}</p>
          </div>
          <div className="cc-stats">
            <div>
              <span>{zh ? '得分' : 'SCORE'}</span>
              <b data-testid="cc-score">{String(view.score).padStart(6, '0')}</b>
            </div>
            <div>
              <span>{zh ? '生命' : 'LIVES'}</span>
              <b data-testid="cc-lives">{view.lives}</b>
            </div>
            <div>
              <span>BONUS</span>
              <b data-testid="cc-bonus">{view.bonus}</b>
            </div>
            <div>
              <span>{zh ? '剩余路程' : 'DISTANCE'}</span>
              <b>{Math.max(0, Math.ceil((state.current.end - view.x) / 20))}m</b>
            </div>
          </div>
          <fieldset className="cc-mode" disabled={phase !== 'ready' && phase !== 'over'}>
            <legend>{zh ? '选择模式' : 'Game mode'}</legend>
            {(['A', 'B'] as const).map((m) => (
              <button type="button" key={m} aria-pressed={mode === m} onClick={() => reset(m)}>
                <b>GAME {m}</b>
                <small>{m === 'A' ? (zh ? '经典' : 'Classic') : zh ? '高难度' : 'Harder'}</small>
              </button>
            ))}
          </fieldset>
          <label className="cc-select">
            {zh ? '起始节目' : 'Starting act'}
            <select
              value={startingAct}
              disabled={phase !== 'ready' && phase !== 'over'}
              onChange={(e) => reset(mode, Number(e.target.value))}
            >
              {CIRCUS_ACTS.map((item, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}. {item[zh ? 'zh' : 'en']}
                </option>
              ))}
            </select>
          </label>
          <ol className="cc-act-list">
            {CIRCUS_ACTS.map((item, i) => (
              <li key={i} aria-current={view.stage === i + 1 ? 'step' : undefined}>
                <span>0{i + 1}</span>
                <b>{item[zh ? 'zh' : 'en']}</b>
                {view.stage === i + 1 && <i>▶</i>}
              </li>
            ))}
          </ol>
          <button type="button" className="cc-reset" onClick={() => reset()}>
            {zh ? '重新开始' : 'Restart'}
          </button>
        </aside>
      </div>
      <p className="cc-guide">
        {zh
          ? '← → / A D 移动 · 空格 / J 小跳 · K 大跳 · P 暂停 · Enter 开始 / 下一关。Pad 可同时按住方向和跳跃。五关后循环加难，每 20,000 分奖励一条生命。'
          : 'Arrows / A D move · Space / J jump · K high jump · P pause · Enter start / next act. On Pad, hold a direction while tapping jump. Five acts loop with increasing difficulty. Extra life every 20,000 points.'}
      </p>
      <span className="cc-status" role="status">
        {phase !== 'playing' ? overlayTitle : ''}
      </span>
    </section>
  );
}
