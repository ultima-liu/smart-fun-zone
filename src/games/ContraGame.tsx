import { useCallback, useEffect, useRef, useState, type ReactNode, type PointerEvent } from 'react';
import { useStore } from '../store';
import {
  advanceContra,
  CONTRA_H,
  CONTRA_W,
  CONTRA_STAGES,
  contraBossHP,
  contraBasePhase,
  enterContraBaseDoor,
  createContraState,
  nextContraStage,
  type ContraInput,
} from './contraEngine';
import { drawContra, loadContraArtwork } from './contraArtwork';
import { ContraAudio } from './contraAudio';
import './contra.css';

export interface ContraOutcome {
  result: 'win' | 'lose';
  players: 1 | 2;
  startingStage: number;
  stage: number;
  score: number;
  durationSec: number;
}
interface Props {
  lang: 'zh' | 'en';
  playerName: string;
  headerAction?: ReactNode;
  onComplete: (outcome: ContraOutcome) => void;
}
type Phase = 'ready' | 'playing' | 'paused' | 'clear' | 'over' | 'win';
type Action = keyof ContraInput;
const ACTIONS: Action[] = ['left', 'right', 'up', 'down', 'fire', 'jump'];
const BINDINGS: Record<Action, string[]> = {
  left: ['KeyA'],
  right: ['KeyD'],
  up: ['KeyW'],
  down: ['KeyS'],
  fire: ['KeyJ', 'KeyZ', 'Space'],
  jump: ['KeyK', 'KeyX'],
};
const ARROWS: Record<Action, string[]> = {
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  fire: ['Enter'],
  jump: ['ShiftRight'],
};
const LABELS = {
  left: '向左',
  right: '向右',
  up: '向上瞄准',
  down: '俯卧 / 潜水',
  fire: '射击',
  jump: '跳跃',
};
const SYMBOLS = { left: '←', right: '→', up: '↑', down: '↓', fire: 'B', jump: 'A' };
export default function ContraGame({ lang, playerName, headerAction, onComplete }: Props) {
  const zh = lang === 'zh',
    sound = useStore((s) => s.sound),
    toggleSound = useStore((s) => s.toggleSound);
  const [count, setCount] = useState<1 | 2>(1),
    [startingStage, setStartingStage] = useState(1);
  const state = useRef(createContraState()),
    canvas = useRef<HTMLCanvasElement>(null),
    audio = useRef(new ContraAudio());
  const [phase, setPhase] = useState<Phase>('ready'),
    phaseRef = useRef<Phase>('ready');
  const keys = useRef(new Set<string>()),
    pointers = useRef(new Map<number, { player: number; action: Action }>());
  const completion = useRef(onComplete),
    completed = useRef(false),
    soundRef = useRef(sound);
  completion.current = onComplete;
  soundRef.current = sound;
  const snapshot = useCallback(() => {
    const s = state.current;
    return {
      stage: s.stage,
      startingStage: s.startingStage,
      players: s.players.map((p) => ({
        id: p.id,
        x: Math.round(p.x),
        y: Math.round(p.y),
        lives: p.lives,
        score: p.score,
        weapon: p.weapon,
        rapid: p.rapid,
        shield: Math.ceil(p.shield),
        prone: p.prone,
        swimming: p.swimming,
        diving: p.diving,
        grounded: p.grounded,
      })),
      boss: s.boss.active,
      hp: contraBossHP(s),
      basePhase: contraBasePhase(s),
      coreHP: s.roomCores.reduce((sum, core) => sum + core.hp, 0),
      coreRemaining: s.roomCores.filter((core) => core.hp > 0).length,
      door: Math.round(s.door * 100),
      room: s.room,
      rooms: s.rooms,
      elapsed: Math.round(s.elapsed),
      cameraX: Math.round(s.cameraX),
      cameraY: Math.round(s.cameraY),
      bullets: s.bullets.length,
    };
  }, []);
  const [view, setView] = useState(snapshot),
    [artCount, setArtCount] = useState(0);
  const clearInput = useCallback(() => {
    keys.current.clear();
    pointers.current.clear();
  }, []);
  const draw = useCallback(() => {
    const context = canvas.current?.getContext('2d');
    if (context)
      drawContra(
        context,
        state.current,
        window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        zh,
      );
  }, [zh]);
  const transition = useCallback(
    (next: Phase) => {
      phaseRef.current = next;
      setPhase(next);
      clearInput();
      if (next !== 'playing') audio.current.stop();
    },
    [clearInput],
  );
  const publish = useCallback(() => {
    const s = state.current;
    if (s.status !== 'playing' && phaseRef.current === 'playing') {
      transition(s.status);
      if (s.status === 'clear') void audio.current.jingle('clear', soundRef.current);
      if (s.status === 'win') void audio.current.jingle('ending', soundRef.current);
      if (s.status === 'over') void audio.current.jingle('over', soundRef.current);
    }
    const events = new Set(s.events.splice(0));
    for (const event of events) audio.current.effect(event, soundRef.current);
    setView(snapshot());
    draw();
    if ((s.status === 'over' || s.status === 'win') && !completed.current) {
      completed.current = true;
      completion.current({
        result: s.status === 'win' ? 'win' : 'lose',
        players: s.count,
        startingStage: s.startingStage,
        stage: s.stage,
        score: s.players.reduce((total, p) => total + p.score, 0),
        durationSec: Math.max(1, Math.round(s.elapsed)),
      });
    }
  }, [draw, snapshot, transition]);
  const focus = () => canvas.current?.focus({ preventScroll: true });
  const reset = (players = count, stage = startingStage) => {
    audio.current.stop();
    state.current = createContraState(players, stage);
    completed.current = false;
    setCount(players);
    setStartingStage(stage);
    transition('ready');
    setView(snapshot());
    draw();
  };
  const start = () => {
    transition('playing');
    void audio.current.start(state.current.stage, soundRef.current, state.current.boss.active);
    focus();
  };
  const pause = useCallback(() => {
    if (phaseRef.current === 'playing') transition('paused');
    else if (phaseRef.current === 'paused') {
      transition('playing');
      void audio.current.start(state.current.stage, soundRef.current, state.current.boss.active);
      canvas.current?.focus({ preventScroll: true });
    }
  }, [transition]);
  const next = () => {
    nextContraStage(state.current);
    setStartingStage(state.current.startingStage);
    transition('playing');
    publish();
    void audio.current.start(state.current.stage, soundRef.current);
    focus();
  };
  const readInput = useCallback(
    () =>
      state.current.players.map((p) => {
        const input: ContraInput = {};
        for (const action of ACTIONS) {
          const codes =
            p.id === 0
              ? [
                  ...BINDINGS[action],
                  ...(state.current.count === 1 && !['fire', 'jump'].includes(action)
                    ? ARROWS[action]
                    : []),
                ]
              : ARROWS[action];
          input[action] =
            codes.some((code) => keys.current.has(code)) ||
            [...pointers.current.values()].some((v) => v.player === p.id && v.action === action);
        }
        return input;
      }),
    [],
  );
  useEffect(() => {
    let cancelled = false;
    void loadContraArtwork().then((total) => {
      if (!cancelled) {
        setArtCount(total);
        draw();
      }
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
      advanceContra(state.current, Math.min(0.1, (now - previous) / 1000), readInput());
      previous = now;
      if (now - lastPublish >= 80 || state.current.status !== 'playing') {
        publish();
        lastPublish = now;
      } else {
        for (const event of new Set(state.current.events.splice(0)))
          audio.current.effect(event, soundRef.current);
        draw();
      }
      if (phaseRef.current === 'playing') frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, draw, publish, readInput]);
  useEffect(() => {
    if (!sound) audio.current.stop();
    else if (phase === 'playing') void audio.current.start(view.stage, true, view.boss);
  }, [sound, phase, view.stage, view.boss]);
  useEffect(() => {
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const blur = () => {
      clearInput();
      audio.current.stop();
      if (phaseRef.current === 'playing') transition('paused');
    };
    const hidden = () => {
      if (document.hidden) blur();
    };
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', hidden);
      clearInput();
      audio.current.dispose();
    };
  }, [clearInput, transition]);
  const press = (e: PointerEvent<HTMLButtonElement>, player: number, action: Action) => {
    e.preventDefault();
    if (phaseRef.current !== 'playing') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { player, action });
    focus();
  };
  const release = (e: PointerEvent<HTMLButtonElement>) => {
    pointers.current.delete(e.pointerId);
  };
  const stage = CONTRA_STAGES[view.stage - 1],
    isBase = stage.kind === 'base',
    active = phase !== 'ready' && phase !== 'over' && phase !== 'win';
  const title =
    phase === 'ready'
      ? zh
        ? '并肩，突破重围'
        : 'Break through. Together.'
      : phase === 'paused'
        ? zh
          ? '战斗已暂停'
          : 'Mission paused'
        : phase === 'clear'
          ? zh
            ? '区域突破'
            : 'Area secured'
          : phase === 'win'
            ? zh
              ? '任务完成！'
              : 'Mission complete!'
            : zh
              ? '行动结束'
              : 'Game over';
  return (
    <section className="contra-game" aria-label={zh ? '魂斗罗一代' : 'Contra I'}>
      <header className="contra-header">
        <div className="contra-heading">
          {headerAction}
          <div>
            <span className="contra-kicker">CONTRA · OPERATION 01</span>
            <h2>{zh ? '魂斗罗 · 一代' : 'Contra · I'}</h2>
          </div>
        </div>
        <div className="contra-toolbar">
          <button
            onClick={toggleSound}
            aria-label={zh ? (sound ? '声音开启' : '声音关闭') : sound ? 'Sound on' : 'Sound off'}
          >
            {sound ? '♫' : '♪'}{' '}
            <span>{zh ? (sound ? '声音开' : '声音关') : sound ? 'Sound on' : 'Sound off'}</span>
          </button>
          <button onClick={pause} disabled={phase !== 'playing' && phase !== 'paused'}>
            {zh
              ? phase === 'paused'
                ? '继续战斗'
                : '暂停'
              : phase === 'paused'
                ? 'Resume'
                : 'Pause'}
          </button>
          <button onClick={() => reset()}>{zh ? '重新开始' : 'Restart'}</button>
        </div>
      </header>
      <div className="contra-layout">
        <div className="contra-main">
          <div className="contra-status">
            <div>
              <span className="contra-dot" />{' '}
              <strong>{String(view.stage).padStart(2, '0')} / 08</strong>
              <span>{zh ? stage.zh : stage.en}</span>
            </div>
            <span>
              {view.boss
                ? zh
                  ? '关底战斗'
                  : 'BOSS'
                : isBase
                  ? `ROOM ${Math.min(view.room, view.rooms)} / ${view.rooms}`
                  : `${String(Math.floor(view.elapsed / 60)).padStart(2, '0')}:${String(view.elapsed % 60).padStart(2, '0')}`}
            </span>
          </div>
          <div className="contra-stage">
            <canvas
              ref={canvas}
              width={CONTRA_W * 3}
              height={CONTRA_H * 3}
              tabIndex={0}
              aria-label={
                zh
                  ? '魂斗罗战场，方向键移动，J射击，K跳跃'
                  : 'Contra battlefield. Move with arrows, J fires, K jumps.'
              }
              data-phase={phase}
              data-stage={view.stage}
              data-player-x={view.players[0].x}
              data-player-y={view.players[0].y}
              data-prone={view.players[0].prone}
              data-swimming={view.players[0].swimming}
              data-diving={view.players[0].diving}
              data-grounded={view.players[0].grounded}
              data-camera-x={view.cameraX}
              data-camera-y={view.cameraY}
              data-bullets={view.bullets}
              data-art-loaded={artCount}
              data-room={view.room}
              data-base-phase={isBase ? view.basePhase : undefined}
              data-core-hp={isBase ? view.coreHP : undefined}
              data-door={isBase ? view.door : undefined}
              data-p2-x={view.players[1]?.x}
              data-p2-y={view.players[1]?.y}
              data-boss-hp={view.hp}
              onKeyDown={(e) => {
                if (e.code === 'KeyP' || e.code === 'Escape') {
                  e.preventDefault();
                  if (!e.repeat) pause();
                  return;
                }
                if (e.code === 'Enter' && phaseRef.current !== 'playing') {
                  e.preventDefault();
                  if (!e.repeat) {
                    if (phaseRef.current === 'ready') start();
                    else if (phaseRef.current === 'paused') pause();
                    else if (phaseRef.current === 'clear') next();
                  }
                  return;
                }
                if (
                  Object.values(BINDINGS).flat().includes(e.code) ||
                  Object.values(ARROWS).flat().includes(e.code)
                ) {
                  e.preventDefault();
                  keys.current.add(e.code);
                }
              }}
              onPointerDown={focus}
            />
            {phase !== 'playing' && (
              <div className={`contra-overlay ${phase === 'ready' ? 'intro' : ''}`}>
                <div className="contra-overlay-card">
                  <span className="contra-kicker">
                    {phase === 'ready'
                      ? 'RUN · JUMP · FIRE'
                      : phase === 'clear' || phase === 'win'
                        ? 'MISSION REPORT'
                        : 'TACTICAL BREAK'}
                  </span>
                  <h3>{title}</h3>
                  <p>
                    {phase === 'ready'
                      ? zh
                        ? isBase
                          ? '面向大门射击红色机关，按 ↓ 俯卧避弹。大门打开后按 ↑，或点击前进。'
                          : '八个经典战区，全新战士与场景。准备好，出发。'
                        : isBase
                          ? 'Shoot the red door core. Hold ↓ to dodge bullets. Once the door opens, press ↑ or Advance.'
                          : 'Eight classic zones. A new world. Get ready.'
                      : phase === 'paused'
                        ? zh
                          ? '休息一下，准备好再继续。'
                          : 'Take a breath. Resume when ready.'
                        : phase === 'clear'
                          ? zh
                            ? '带上现有火力，前往下一个战区。'
                            : 'Carry your firepower into the next zone.'
                          : `${zh ? '本局得分' : 'Score'} ${view.players.reduce((n, p) => n + p.score, 0).toLocaleString()}`}
                  </p>
                  {phase === 'ready' && (
                    <div className="contra-mode" aria-label={zh ? '选择人数' : 'Players'}>
                      <button aria-pressed={count === 1} onClick={() => reset(1)}>
                        {zh ? '单人行动' : 'Solo mission'}
                      </button>
                      <button aria-pressed={count === 2} onClick={() => reset(2)}>
                        {zh ? '双人并肩' : 'Co-op mission'}
                      </button>
                    </div>
                  )}
                  <button
                    className="contra-primary"
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
                        ? '开始行动'
                        : 'Start mission'
                      : phase === 'paused'
                        ? zh
                          ? '继续战斗'
                          : 'Resume mission'
                        : phase === 'clear'
                          ? zh
                            ? '进入下一关'
                            : 'Next stage'
                          : zh
                            ? '再来一局'
                            : 'New mission'}{' '}
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          {isBase && !view.boss && (
            <div className="contra-base-objective" data-state={view.basePhase}>
              <div>
                <strong>
                  {zh ? `房间 ${view.room} / ${view.rooms}` : `Room ${view.room} / ${view.rooms}`}
                </strong>
                <p role="status">
                  {view.basePhase === 'combat'
                    ? zh
                      ? `射击红色机关（剩余 ${view.coreHP}）· 按住 ↓ 俯卧避弹`
                      : `Shoot the red core (${view.coreHP} remaining). Hold ↓ to dodge.`
                    : view.basePhase === 'opening'
                      ? zh
                        ? '机关已破坏，电网已关闭，大门正在打开。'
                        : 'Core destroyed. Fence off. Door opening.'
                      : view.basePhase === 'open'
                        ? zh
                          ? '通道已打开，按 ↑ 或点击前进。'
                          : 'Door open. Press ↑ or Advance.'
                        : zh
                          ? '正在进入下一间…'
                          : 'Entering the next room…'}
                </p>
              </div>
              <button
                disabled={phase !== 'playing' || view.basePhase !== 'open'}
                onClick={() => {
                  if (enterContraBaseDoor(state.current)) publish();
                  focus();
                }}
              >
                {zh ? '前进 · 下一间' : 'Advance · Next room'} <span aria-hidden="true">↑</span>
              </button>
            </div>
          )}
          <div className="contra-player-bar">
            {view.players.map((p) => (
              <div key={p.id} className={`contra-player p${p.id}`}>
                <span>
                  {p.id === 0 ? playerName : zh ? '队友' : 'Partner'} <small>{p.id + 1}P</small>
                </span>
                <div>
                  <b
                    aria-label={`${p.id + 1}P ${zh ? '生命' : 'lives'}`}
                    data-testid={`contra-lives-${p.id}`}
                  >
                    {'♥'.repeat(p.lives)}
                    {p.lives === 0 ? (zh ? '已退场' : 'OUT') : ''}
                  </b>
                  <strong>{String(p.score).padStart(6, '0')}</strong>
                  <em>
                    {p.weapon}
                    {p.rapid ? ' + R' : ''}
                    {p.shield ? ` · B ${p.shield}s` : ''}
                  </em>
                </div>
              </div>
            ))}
          </div>
          <div className={`contra-controllers ${count === 2 ? 'coop' : ''}`}>
            {view.players.map((p) => (
              <div className={`contra-controller p${p.id}`} key={p.id}>
                <span className="contra-control-label">{p.id + 1}P</span>
                <div className="contra-dpad">
                  {(['up', 'left', 'right', 'down'] as Action[]).map((action) => (
                    <button
                      className={action}
                      key={action}
                      aria-label={`${p.id + 1}P ${zh ? (isBase && action === 'up' ? '前进' : LABELS[action]) : action}`}
                      disabled={phase !== 'playing'}
                      onPointerDown={(e) => press(e, p.id, action)}
                      onPointerUp={release}
                      onPointerCancel={release}
                      onLostPointerCapture={release}
                      onKeyDown={(e) => {
                        if (e.code === 'Space' || e.code === 'Enter') {
                          e.preventDefault();
                          pointers.current.set(-1 - p.id * 10 - ACTIONS.indexOf(action), {
                            player: p.id,
                            action,
                          });
                        }
                      }}
                      onKeyUp={() =>
                        pointers.current.delete(-1 - p.id * 10 - ACTIONS.indexOf(action))
                      }
                      onBlur={() =>
                        pointers.current.delete(-1 - p.id * 10 - ACTIONS.indexOf(action))
                      }
                    >
                      {SYMBOLS[action]}
                    </button>
                  ))}
                </div>
                <div className="contra-action-keys">
                  {(['fire', 'jump'] as Action[]).map((action) => (
                    <button
                      className={action}
                      key={action}
                      aria-label={`${p.id + 1}P ${zh ? LABELS[action] : action}`}
                      disabled={phase !== 'playing'}
                      onPointerDown={(e) => press(e, p.id, action)}
                      onPointerUp={release}
                      onPointerCancel={release}
                      onLostPointerCapture={release}
                      onKeyDown={(e) => {
                        if (e.code === 'Space' || e.code === 'Enter') {
                          e.preventDefault();
                          pointers.current.set(-1 - p.id * 10 - ACTIONS.indexOf(action), {
                            player: p.id,
                            action,
                          });
                        }
                      }}
                      onKeyUp={() =>
                        pointers.current.delete(-1 - p.id * 10 - ACTIONS.indexOf(action))
                      }
                      onBlur={() =>
                        pointers.current.delete(-1 - p.id * 10 - ACTIONS.indexOf(action))
                      }
                    >
                      <b>{SYMBOLS[action]}</b>
                      <span>{zh ? LABELS[action] : action}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="contra-key-hint">
            {zh
              ? count === 1
                ? '方向键 / WASD 移动与瞄准 · J 射击 · K 跳跃 · P 暂停'
                : '1P WASD + J/K · 2P 方向键 + Enter 射击 / 右 Shift 跳跃'
              : count === 1
                ? 'Arrows / WASD · J fire · K jump · P pause'
                : '1P WASD + J/K · 2P Arrows + Enter / Right Shift'}
          </p>
        </div>
        <aside className="contra-sidebar">
          <div className="contra-mission-title">
            <span className="contra-kicker">OPERATION MAP</span>
            <h3>{zh ? '八区远征' : 'Eight-zone campaign'}</h3>
            <p>{zh ? '摧毁核心，向前推进。' : 'Destroy the cores. Keep moving.'}</p>
          </div>
          <div className="contra-stage-list" aria-label={zh ? '选择起始关卡' : 'Starting stage'}>
            {CONTRA_STAGES.map((act, i) => (
              <button
                key={act.en}
                disabled={active}
                aria-pressed={view.stage === i + 1}
                onClick={() => reset(count, i + 1)}
              >
                <span>{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{zh ? act.zh : act.en}</strong>
                  <small>
                    {act.kind === 'base'
                      ? zh
                        ? '纵深突进'
                        : 'Into the base'
                      : act.kind === 'vertical'
                        ? zh
                          ? '纵向攀登'
                          : 'Vertical ascent'
                        : zh
                          ? '横向突破'
                          : 'Run and gun'}
                  </small>
                </div>
                <i aria-hidden="true">
                  {i + 1 < view.stage && i + 1 >= view.startingStage
                    ? '✓'
                    : view.stage === i + 1
                      ? '●'
                      : '·'}
                </i>
              </button>
            ))}
          </div>
          <div className="contra-field-note">
            <span>{zh ? '战地提示' : 'FIELD NOTES'}</span>
            <p>
              {isBase
                ? zh
                  ? '左右移动对准红色机关，按住 ↓ + 射击可安全攻破。电网自动关闭、大门打开后，按 ↑ 或点击前进。'
                  : 'Align with the red core and hold down + fire. The fence turns off and the door opens. Press ↑ or Advance to enter.'
                : stage.kind === 'vertical'
                  ? zh
                    ? '交替跳上岩台，向上开火。下 + 跳跃可穿过上层平台；别落到镜头下方。'
                    : 'Climb ledges and aim upward. Down + jump drops through a ledge. Stay above the camera.'
                  : view.stage === 1
                    ? zh
                      ? '水中按 ↓ 潜水避弹，松开浮出，靠岸按跳跃上岸。桥会分段爆破；下 + 跳跃可落入河道。'
                      : 'Hold ↓ in water to dive and avoid fire; release to surface. Jump to clear the bank. Bridges collapse in sections.'
                    : zh
                      ? '跳跃翻滚，八向瞄准。击落飞行补给收集武器；闪光核心就是 Boss 的弱点。'
                      : 'Somersault and aim in eight directions. Shoot supply pods. Glowing cores are boss weak points.'}
            </p>
            <div className="contra-weapon-guide">
              <b>M</b>
              <span>{zh ? '机枪' : 'Machine'}</span>
              <b>S</b>
              <span>{zh ? '散弹' : 'Spread'}</span>
              <b>F</b>
              <span>{zh ? '火焰' : 'Flame'}</span>
              <b>L</b>
              <span>{zh ? '激光' : 'Laser'}</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
