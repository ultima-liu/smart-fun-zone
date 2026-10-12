import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { useStore } from '../store';
import {
  advanceRoad,
  createRoadState,
  nextRoadCourse,
  ROAD_COURSES,
  type RoadInput,
  type RoadMode,
} from './roadFighterEngine';
import { drawRoad, ROAD_HEIGHT, ROAD_WIDTH } from './roadFighterArtwork';
import { preloadRoadAudio, RoadAudio } from './roadFighterAudio';
import { loadRoadArtwork } from './roadFighterSprites';
import './road-fighter.css';

export interface RoadFighterOutcome {
  result: 'win' | 'lose';
  mode: RoadMode;
  stage: number;
  score: number;
  durationSec: number;
}
interface Props {
  lang: 'zh' | 'en';
  playerName: string;
  headerAction?: ReactNode;
  onComplete: (outcome: RoadFighterOutcome) => void;
}
type Phase = 'ready' | 'playing' | 'paused' | 'clear' | 'won' | 'over';
type Control = 'left' | 'right' | 'low' | 'high';
const CONTROLS: Record<string, Control> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  KeyZ: 'low',
  KeyJ: 'low',
  KeyX: 'high',
  KeyK: 'high',
  Space: 'high',
};
const MESSAGES = {
  fuel: ['补给成功 · 燃油 +7', 'REFUEL · +7 FUEL'],
  crash: ['撞车了 · 燃油 −5', 'CRASH · −5 FUEL'],
  skid: ['打滑！反打方向救车', 'SKID! COUNTERSTEER'],
  saved: ['漂亮的救车！', 'NICE RECOVERY!'],
  empty: ['燃油耗尽 · 滑行寻找补给', 'EMPTY · COAST TO FUEL'],
  clean: ['无碰撞奖励 · +1000', 'CLEAN RUN · +1000'],
} as const;

export default function RoadFighterGame({ lang, playerName, headerAction, onComplete }: Props) {
  const zh = lang === 'zh',
    sound = useStore((s) => s.sound),
    toggleSound = useStore((s) => s.toggleSound);
  const [mode, setMode] = useState<RoadMode>('A');
  const [initial] = useState(() => createRoadState('A', Math.floor(Math.random() * 4294967296)));
  const state = useRef(initial),
    canvas = useRef<HTMLCanvasElement>(null);
  const [audio] = useState(() => new RoadAudio());
  const [phase, setPhase] = useState<Phase>('ready'),
    phaseRef = useRef<Phase>('ready');
  const keys = useRef(new Set<string>()),
    pointers = useRef(new Map<number, Control>());
  const completed = useRef(false),
    completion = useRef(onComplete),
    soundRef = useRef(sound),
    best = useRef(0);
  completion.current = onComplete;
  soundRef.current = sound;
  const snapshot = useCallback(() => {
    const s = state.current;
    return {
      score: Math.floor(s.score),
      speed: Math.round(s.speed),
      fuel: Math.ceil(s.fuel),
      distance: Math.floor(s.distance),
      course: s.course,
      overtakes: s.overtakes,
      collected: s.collected,
      crashes: s.crashes,
      spin: s.spin > 0,
      x: Math.round(s.x),
      elapsed: s.elapsed,
      message: s.messageTime > 0 ? s.message : '',
      empty: s.empty,
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
      if (next !== 'playing') audio.stop();
    },
    [audio, clearInput],
  );
  const draw = useCallback(() => {
    const element = canvas.current,
      c = element?.getContext('2d');
    if (!element || !c) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (element.width !== ROAD_WIDTH * ratio || element.height !== ROAD_HEIGHT * ratio) {
      element.width = ROAD_WIDTH * ratio;
      element.height = ROAD_HEIGHT * ratio;
    }
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawRoad(c, state.current, window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);
  const publish = useCallback(() => {
    const s = state.current,
      events = s.events.splice(0);
    if (s.status !== 'racing') transition(s.status);
    events.forEach((event) =>
      audio.effect(event === 'clear' && s.status === 'won' ? 'goal' : event, soundRef.current),
    );
    best.current = Math.max(best.current, Math.floor(s.score));
    setView(snapshot());
    draw();
    if ((s.status === 'won' || s.status === 'over') && !completed.current) {
      completed.current = true;
      completion.current({
        result: s.status === 'won' ? 'win' : 'lose',
        mode: s.mode,
        stage: s.course + 1,
        score: Math.floor(s.score),
        durationSec: Math.max(1, Math.round(s.elapsed)),
      });
    }
  }, [audio, draw, snapshot, transition]);
  useEffect(() => {
    let active = true;
    preloadRoadAudio();
    void loadRoadArtwork().then(() => {
      if (active) draw();
    });
    return () => {
      active = false;
    };
  }, [draw]);
  const focus = () => canvas.current?.focus({ preventScroll: true });
  const start = () => {
    transition('playing');
    audio.start(soundRef.current, true);
    focus();
  };
  const reset = (nextMode = mode) => {
    state.current = createRoadState(nextMode, Math.floor(Math.random() * 4294967296));
    completed.current = false;
    setMode(nextMode);
    transition('ready');
    setView(snapshot());
    draw();
  };
  const pause = useCallback(() => {
    if (phaseRef.current === 'playing') transition('paused');
    else if (phaseRef.current === 'paused') {
      transition('playing');
      audio.start(soundRef.current);
      canvas.current?.focus({ preventScroll: true });
    }
  }, [audio, transition]);
  const next = () => {
    if (nextRoadCourse(state.current)) {
      transition('playing');
      setView(snapshot());
      draw();
      audio.start(soundRef.current, true);
      focus();
    }
  };
  useEffect(() => {
    draw();
    if (phase !== 'playing') return;
    let frame = 0,
      last = performance.now(),
      lastPublish = last;
    const tick = (now: number) => {
      if (phaseRef.current !== 'playing') return;
      const active = new Set(
        [...keys.current].map((code) => CONTROLS[code]).concat([...pointers.current.values()]),
      );
      const input: RoadInput = {
        steer: Number(active.has('right')) - Number(active.has('left')),
        throttle: active.has('high') ? 2 : active.has('low') ? 1 : 0,
      };
      advanceRoad(state.current, Math.min(0.1, Math.max(0, (now - last) / 1000)), input);
      last = now;
      audio.update(state.current.speed, state.current.spin > 0, state.current.crashTime > 0, state.current.fuel);
      if (
        now - lastPublish >= 80 ||
        state.current.events.length ||
        state.current.status !== 'racing'
      ) {
        publish();
        lastPublish = now;
      } else if (
        state.current.speed > 0 ||
        state.current.spin > 0 ||
        state.current.crashTime > 0 ||
        state.current.cameo > 0
      )
        draw();
      if (phaseRef.current === 'playing') frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [audio, draw, phase, publish]);
  useEffect(() => {
    const keyup = (e: KeyboardEvent) => keys.current.delete(e.code);
    const blur = () => {
      clearInput();
      audio.stop();
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
      audio.dispose();
    };
  }, [audio, clearInput, transition]);
  useEffect(() => {
    if (phase === 'playing') audio.start(sound);
    else if (!sound) audio.stop();
  }, [audio, phase, sound]);
  const press = (e: PointerEvent<HTMLButtonElement>, control: Control) => {
    e.preventDefault();
    if (phaseRef.current !== 'playing') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    focus();
    pointers.current.set(e.pointerId, control);
  };
  const release = (e: PointerEvent<HTMLButtonElement>) => pointers.current.delete(e.pointerId);
  const controlButton = (control: Control, title: string, mark: string, label: string) => (
    <button
      type="button"
      className={'rf-control rf-control-' + control}
      disabled={phase !== 'playing'}
      aria-label={title}
      onPointerDown={(e) => press(e, control)}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onKeyDown={(e) => {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          if (phaseRef.current === 'playing')
            pointers.current.set(-(['left', 'right', 'low', 'high'].indexOf(control) + 1), control);
        }
      }}
      onKeyUp={() =>
        pointers.current.delete(-(['left', 'right', 'low', 'high'].indexOf(control) + 1))
      }
      onBlur={() =>
        pointers.current.delete(-(['left', 'right', 'low', 'high'].indexOf(control) + 1))
      }
    >
      <b>{mark}</b>
      <small>{label}</small>
    </button>
  );
  const course = ROAD_COURSES[view.course],
    progress = (view.distance / course.length) * 100;
  const title =
    phase === 'ready'
      ? zh
        ? '点燃你的童年'
        : 'READY TO RACE'
      : phase === 'paused'
        ? zh
          ? '赛车正在休息'
          : 'RACE PAUSED'
        : phase === 'clear'
          ? zh
            ? '冲过终点！'
            : 'COURSE CLEAR!'
          : phase === 'won'
            ? zh
              ? '四段赛道全部征服！'
              : 'ALL COURSES CLEAR!'
            : zh
              ? '这趟旅程结束了'
              : 'GAME OVER';
  const message = MESSAGES[view.message as keyof typeof MESSAGES];
  return (
    <section className="rf-game" aria-label={zh ? '火箭车游戏' : 'Road Fighter game'}>
      <header className="rf-header">
        {headerAction}
        <div className="rf-heading">
          <span>ROAD FIGHTER / FC CLASSICS</span>
          <h2>
            {zh ? '火箭车' : 'Road Fighter'} <i>1985</i>
          </h2>
          <p>
            {zh
              ? `${playerName}，握紧方向，追上那阵风。`
              : `${playerName}, take the wheel and chase the wind.`}
          </p>
        </div>
        <button type="button" className="rf-sound" onClick={toggleSound} aria-pressed={sound}>
          {zh ? `声音${sound ? '开启' : '关闭'}` : `Sound ${sound ? 'on' : 'off'}`}
        </button>
      </header>
      <div className="rf-layout">
        <div className="rf-cabinet">
          <div className="rf-bezel">
            <span>
              <i /> ARCADE ROAD SERIES
            </span>
            <b>NO. 01 — RF</b>
          </div>
          <div className="rf-screen">
            <canvas
              ref={canvas}
              width={ROAD_WIDTH}
              height={ROAD_HEIGHT}
              tabIndex={0}
              aria-label={
                zh
                  ? '火箭车赛道，左右或 A D 转向，Z 低速，X 或空格高速，P 暂停'
                  : 'Race track: arrows or A D steer, Z low gear, X or Space high gear, P pause'
              }
              data-phase={phase}
              data-course={view.course + 1}
              data-distance={view.distance}
              data-player-x={view.x}
              data-spin={String(view.spin)}
              data-elapsed={view.elapsed}
              onBlur={clearInput}
              onKeyDown={(e) => {
                if (e.code === 'KeyP' || e.code === 'Escape') {
                  e.preventDefault();
                  if (!e.repeat) pause();
                  return;
                }
                if (e.code === 'Enter') {
                  e.preventDefault();
                  if (e.repeat) return;
                  if (phaseRef.current === 'ready') start();
                  else if (phaseRef.current === 'clear') next();
                  else if (phaseRef.current === 'paused') pause();
                  return;
                }
                if (!CONTROLS[e.code]) return;
                e.preventDefault();
                if (phaseRef.current === 'playing') keys.current.add(e.code);
              }}
            />
            <div className="rf-track-label" aria-hidden="true">
              <span>COURSE 0{view.course + 1}</span>
              <b>{course[zh ? 'zh' : 'en']}</b>
            </div>
            {phase === 'playing' && message && (
              <div
                className={
                  'rf-message ' +
                  (view.message === 'crash' || view.message === 'empty' ? 'warn' : '')
                }
                role="status"
              >
                {message[zh ? 0 : 1]}
              </div>
            )}
            {phase !== 'playing' && (
              <div className={'rf-overlay rf-overlay-' + phase}>
                <span className="rf-overlay-kicker">
                  {phase === 'ready'
                    ? 'THE ROAD IS CALLING'
                    : phase === 'won'
                      ? 'A JOURNEY TO REMEMBER'
                      : `COURSE 0${view.course + 1} / 04`}
                </span>
                <h3>{title}</h3>
                {phase === 'ready' ? (
                  <p>
                    {zh
                      ? '一辆红色跑车，四段经典公路。\n在燃油耗尽前，奔向终点。'
                      : 'One red car. Four classic roads.\nReach the finish before your fuel runs out.'}
                  </p>
                ) : phase === 'paused' ? (
                  <p>{zh ? '准备好后，继续驰骋。' : 'Take a breath. The road will wait.'}</p>
                ) : phase === 'clear' ? (
                  <p>
                    {zh
                      ? '剩余燃油已换成奖励分数，\n下一段赛道加满油再出发。'
                      : 'Remaining fuel added to your score.\nYour tank is full for the next course.'}
                  </p>
                ) : (
                  <p>
                    {zh
                      ? `本次得分 ${view.score.toLocaleString()} · 超车 ${view.overtakes} 次`
                      : `${view.score.toLocaleString()} points · ${view.overtakes} overtakes`}
                  </p>
                )}
                <button
                  type="button"
                  onClick={
                    phase === 'ready'
                      ? start
                      : phase === 'paused'
                        ? pause
                        : phase === 'clear'
                          ? next
                          : () => reset()
                  }
                >
                  {phase === 'ready'
                    ? zh
                      ? '开始比赛'
                      : 'Start race'
                    : phase === 'paused'
                      ? zh
                        ? '继续比赛'
                        : 'Resume race'
                      : phase === 'clear'
                        ? zh
                          ? '下一段赛道'
                          : 'Next course'
                        : zh
                          ? '再来一局'
                          : 'Race again'}{' '}
                  <span>→</span>
                </button>
                {phase === 'ready' && (
                  <div className="rf-start-hint">
                    <span>
                      <b>Z / B</b>
                      {zh ? '低速 196' : 'LOW 196'}
                    </span>
                    <span>
                      <b>X / A</b>
                      {zh ? '高速 400' : 'HIGH 400'}
                    </span>
                  </div>
                )}
                {phase === 'won' && mode === 'A' && (
                  <button type="button" className="rf-next-tour" onClick={() => reset('B')}>
                    {zh ? '挑战 GAME B' : 'Challenge GAME B'}
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="rf-controller" aria-label={zh ? '触屏赛车手柄' : 'Touch race controller'}>
            <div className="rf-steering">
              {controlButton('left', zh ? '向左转向' : 'Steer left', '◀', zh ? '左' : 'LEFT')}
              {controlButton('right', zh ? '向右转向' : 'Steer right', '▶', zh ? '右' : 'RIGHT')}
            </div>
            <button
              type="button"
              className="rf-pause"
              aria-label={phase === 'paused' ? (zh ? '继续' : 'Resume') : zh ? '暂停' : 'Pause'}
              disabled={phase !== 'playing' && phase !== 'paused'}
              onClick={pause}
            >
              {phase === 'paused' ? (zh ? '继续' : 'RESUME') : zh ? '暂停' : 'PAUSE'}
              <small>START</small>
            </button>
            <div className="rf-gears">
              {controlButton('low', zh ? 'B 低速油门' : 'B low gear', 'B', '196')}
              {controlButton('high', zh ? 'A 高速油门' : 'A high gear', 'A', '400')}
            </div>
          </div>
        </div>
        <aside className="rf-dashboard">
          <div className="rf-speedometer">
            <span>{zh ? '实时车速' : 'SPEED'}</span>
            <svg viewBox="0 0 220 130" aria-hidden="true">
              <path
                d="M 27 110 A 83 83 0 0 1 193 110"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="rf-dial-track"
              />
              <path
                d="M 27 110 A 83 83 0 0 1 193 110"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="rf-dial-fill"
                pathLength="100"
                strokeDasharray={`${view.speed / 4} 100`}
              />
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
                const a = Math.PI + (i * Math.PI) / 8;
                return (
                  <line
                    key={i}
                    x1={110 + Math.cos(a) * 69}
                    y1={110 + Math.sin(a) * 69}
                    x2={110 + Math.cos(a) * 61}
                    y2={110 + Math.sin(a) * 61}
                    stroke="currentColor"
                    strokeWidth="2"
                    className="rf-dial-tick"
                  />
                );
              })}
              <text x="29" y="127">
                0
              </text>
              <text x="103" y="17">
                200
              </text>
              <text x="175" y="127">
                400
              </text>
            </svg>
            <div className="rf-speed">
              <b data-testid="rf-speed">{String(view.speed).padStart(3, '0')}</b>
              <small>km/h</small>
            </div>
          </div>
          <div className={'rf-fuel ' + (view.fuel < 20 ? 'rf-fuel-low' : '')}>
            <div>
              <span>
                <img
                  className="rf-fuel-icon"
                  src="/assets/games/road-fighter/fuel-can-v1.webp"
                  alt=""
                  aria-hidden="true"
                />
                {zh ? '燃油' : 'FUEL'}
              </span>
              <b data-testid="rf-fuel">
                {view.fuel}
                <small>/ 100</small>
              </b>
            </div>
            <div
              className="rf-fuel-bars"
              role="meter"
              aria-label={zh ? '剩余燃油' : 'Fuel remaining'}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={view.fuel}
            >
              {Array.from({ length: 20 }, (_, i) => (
                <i key={i} className={view.fuel > i * 5 ? 'lit' : ''} />
              ))}
            </div>
            <small>{zh ? '碰到彩色补给车 +7' : 'Touch a rainbow car for +7'}</small>
          </div>
          <div className="rf-score">
            <span>{zh ? '本次得分' : 'SCORE'}</span>
            <b data-testid="rf-score">{String(view.score).padStart(6, '0')}</b>
            <small>BEST {String(best.current).padStart(6, '0')}</small>
          </div>
          <div className="rf-route">
            <div>
              <span>{zh ? '公路旅行' : 'THE JOURNEY'}</span>
              <b>
                0{view.course + 1}
                <small> / 04</small>
              </b>
            </div>
            <ol>
              {ROAD_COURSES.map((item, i) => (
                <li
                  key={item.en}
                  className={i < view.course || phase === 'won' ? 'done' : ''}
                  aria-current={i === view.course ? 'step' : undefined}
                >
                  <i>{i < view.course || phase === 'won' ? '✓' : String(i + 1).padStart(2, '0')}</i>
                  <span>{item[zh ? 'zh' : 'en']}</span>
                </li>
              ))}
            </ol>
            <div
              className="rf-progress"
              role="progressbar"
              aria-label={zh ? '赛道进度' : 'Course progress'}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.floor(progress)}
            >
              <i style={{ width: `${progress}%` }} />
            </div>
            <small>
              {(view.distance / 1000).toFixed(1)} / {(course.length / 1000).toFixed(1)} km
            </small>
          </div>
          <fieldset
            className="rf-modes"
            disabled={phase !== 'ready' && phase !== 'over' && phase !== 'won'}
          >
            <legend>{zh ? '比赛模式' : 'RACE MODE'}</legend>
            {(['A', 'B'] as const).map((m) => (
              <button type="button" key={m} aria-pressed={mode === m} onClick={() => reset(m)}>
                GAME {m}
                <small>
                  {m === 'A' ? (zh ? '经典车流' : 'CLASSIC') : zh ? '密集车流' : 'EXPERT'}
                </small>
              </button>
            ))}
          </fieldset>
          <div className="rf-run-stats">
            <span>
              {zh ? '超车' : 'PASSED'}
              <b>{view.overtakes}</b>
            </span>
            <span>
              {zh ? '补给' : 'REFUEL'}
              <b>{view.collected}</b>
            </span>
            <span>
              {zh ? '撞车' : 'CRASH'}
              <b>{view.crashes}</b>
            </span>
          </div>
          <button type="button" className="rf-reset" onClick={() => reset()}>
            {zh ? '重新比赛' : 'Restart race'} <span>↻</span>
          </button>
        </aside>
      </div>
      <div className="rf-guide">
        <div>
          <b>{zh ? '像小时候那样玩' : 'THE CLASSIC CONTROLS'}</b>
          <p>
            {zh
              ? '← → / A D 转向 · Z / J 低速 · X / K / 空格高速 · P 暂停。按住油门加速，松开滑行；Pad 可同时按住方向和油门。'
              : '← → / A D steer · Z / J low gear · X / K / Space high gear · P pause. Hold the throttle to accelerate; release to coast. Pad supports simultaneous steering and throttle.'}
          </p>
        </div>
        <div>
          <b>{zh ? '记住这几位老朋友' : 'KNOW YOUR TRAFFIC'}</b>
          <p>
            {zh
              ? '黄车直行，红车切线，蓝车追逼；卡车撞上会爆车，油污会打滑。打滑时朝漂移的反方向转向，救回赛车；撞护栏扣 5 格燃油。'
              : 'Yellow cruises, red cuts in, blue pursues. Trucks crash your car; oil causes skids. Countersteer against the drift to recover. Crashes cost 5 fuel.'}
          </p>
        </div>
      </div>
      <span className="rf-sr-status" role="status">
        {phase !== 'playing' ? title : ''}
      </span>
    </section>
  );
}
