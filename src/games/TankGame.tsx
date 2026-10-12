import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from '../store';
import BackButton from '../components/BackButton';
import {
  createTankGame,
  defaultConstruction,
  drainTankSounds,
  nextTankStage,
  stepTankGame,
  validConstruction,
  type Direction,
  type TankInput,
  type TankState,
} from './tankEngine';
import { loadTankArtwork, TankPainter } from './tankArtwork';
import { preloadTankAudio, TankAudio } from './tankAudio';
import './tank.css';

export interface TankOutcome {
  result: 'win' | 'lose';
  players: 1 | 2;
  durationSec: number;
  stage: number;
  score: number;
}
interface Props {
  lang: 'zh' | 'en';
  playerName: string;
  headerAction?: ReactNode;
  onComplete: (outcome: TankOutcome) => void;
}
const TILE_NAMES = ['空地', '砖墙', '钢墙', '水域', '草丛', '冰面'];
const TILE_EN = ['Ground', 'Brick', 'Steel', 'Water', 'Forest', 'Ice'];
const TILE_ART = ['floor', 'brick', 'steel', 'water', 'forest', 'ice'];
const POWERS = [
  [
    'star',
    '星星',
    'Star',
    '炮弹加速 → 双发 → 击穿钢墙',
    'Faster shells → two shells → steel piercing',
  ],
  ['helmet', '头盔', 'Helmet', '约 10 秒护盾', 'A shield for about 10 seconds'],
  ['grenade', '手雷', 'Grenade', '清除场上已出现的敌军', 'Clear active enemy tanks'],
  ['clock', '时钟', 'Clock', '约 10 秒冻结敌军', 'Freeze enemy tanks for about 10 seconds'],
  ['shovel', '铁锹', 'Shovel', '基地钢墙保护约 20 秒', 'Fortify the base for about 20 seconds'],
  ['tank', '坦克', 'Tank', '增加一条生命', 'Gain an extra life'],
];
function loadConstruction() {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('sky-tank-construction-v1') ?? 'null');
    if (validConstruction(value)) return value;
  } catch {
    /* use original first stage */
  }
  return defaultConstruction();
}
function inputs(keys: Set<string>, touch: Map<number, string>, count: number): TankInput[] {
  const all = [...keys, ...touch.values()];
  return Array.from({ length: count }, (_, p) => {
    let direction: Direction | undefined;
    let fire = false;
    for (const key of all) {
      const mapping =
        p === 0 ? ['w', 'd', 's', 'a'] : ['arrowup', 'arrowright', 'arrowdown', 'arrowleft'];
      const dir = mapping.indexOf(key);
      if (dir >= 0) direction = dir as Direction;
      if (count === 1 && key.startsWith('arrow'))
        direction = ['arrowup', 'arrowright', 'arrowdown', 'arrowleft'].indexOf(key) as Direction;
      if (
        key === `p${p}f` ||
        (p === 0 && ['j', 'k', ' '].includes(key)) ||
        (p === 1 && ['enter', 'shift'].includes(key))
      )
        fire = true;
      if (key.startsWith(`p${p}d`)) direction = Number(key.slice(3)) as Direction;
    }
    return { direction, fire };
  });
}
export default function TankGame({ lang, playerName, headerAction, onComplete }: Props) {
  const zh = lang === 'zh';
  const sound = useStore((s) => s.sound),
    toggleSound = useStore((s) => s.toggleSound);
  const [players, setPlayers] = useState<1 | 2>(1),
    [stage, setStage] = useState(1);
  const [ready, setReady] = useState(true),
    [paused, setPaused] = useState(false),
    [editing, setEditing] = useState(false);
  const [custom, setCustom] = useState(false),
    [map, setMap] = useState(loadConstruction),
    [brush, setBrush] = useState(1);
  const [, update] = useState(0);
  const [best, setBest] = useState(() => {
    try {
      return Number(localStorage.getItem('sky-tank-best-v1')) || 0;
    } catch {
      return 0;
    }
  });
  const state = useRef<TankState>(createTankGame({ seed: 1985 })),
    canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLElement>(null),
    painter = useRef<TankPainter | null>(null),
    audio = useRef<TankAudio | null>(null);
  const keys = useRef(new Set<string>()),
    touches = useRef(new Map<number, string>()),
    painting = useRef(false);
  const mode = useRef({ ready, paused, editing }),
    callback = useRef(onComplete),
    recorded = useRef(false),
    terminal = useRef('');
  mode.current = { ready, paused, editing };
  callback.current = onComplete;
  const clearInput = useCallback(() => {
    keys.current.clear();
    touches.current.clear();
  }, []);
  const refresh = useCallback(() => update((n) => n + 1), []);
  const pause = useCallback(() => {
    if (mode.current.ready || mode.current.editing || state.current.status !== 'playing') return;
    clearInput();
    const value = !mode.current.paused;
    mode.current.paused = value;
    setPaused(value);
    audio.current?.stop();
    if (value) audio.current?.events(['pause']);
  }, [clearInput]);
  useEffect(() => {
    const player = new TankAudio();
    audio.current = player;
    preloadTankAudio();
    let disposed = false;
    void loadTankArtwork().then((images) => {
      if (!disposed) painter.current = new TankPainter(images);
    });
    return () => {
      disposed = true;
      player.dispose();
      audio.current = null;
    };
  }, []);
  useEffect(() => {
    audio.current?.enable(sound);
  }, [sound]);
  useEffect(() => {
    let frame = 0,
      previous = 0,
      publish = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const loop = (time: number) => {
      const s = state.current,
        dt = previous ? Math.min(0.05, (time - previous) / 1000) : 0;
      previous = time;
      if (!mode.current.ready && !mode.current.paused && !mode.current.editing) {
        stepTankGame(s, inputs(keys.current, touches.current, s.players.length), dt);
        audio.current?.events(drainTankSounds(s));
        audio.current?.movement(
          s.status === 'playing' && s.intro <= 0,
          s.tanks.some((t) => t.player >= 0 && t.moving),
        );
        if (
          (s.status === 'over' || s.status === 'clear') &&
          terminal.current !== `${s.loop}-${s.stage}-${s.status}`
        ) {
          terminal.current = `${s.loop}-${s.stage}-${s.status}`;
          const score = Math.max(...s.players.map((p) => p.score));
          const previousBest = (() => {
            try {
              return Number(localStorage.getItem('sky-tank-best-v1')) || 0;
            } catch {
              return 0;
            }
          })();
          if (score > previousBest) {
            setBest(score);
            try {
              localStorage.setItem('sky-tank-best-v1', String(score));
            } catch {
              /* storage unavailable */
            }
          }
        }
        if (
          !recorded.current &&
          (s.status === 'over' || (s.status === 'clear' && s.stage === 35 && !s.custom))
        ) {
          recorded.current = true;
          const score = Math.max(...s.players.map((p) => p.score));
          callback.current({
            result: s.status === 'clear' ? 'win' : 'lose',
            players: s.players.length as 1 | 2,
            durationSec: Math.max(1, Math.round(s.time)),
            stage: s.stage,
            score,
          });
        }
      }
      if (canvas.current) painter.current?.draw(canvas.current, s, reduced);
      if (time - publish > 90) {
        publish = time;
        refresh();
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [refresh]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).matches('input,select,textarea') ||
        mode.current.ready ||
        mode.current.editing
      )
        return;
      const key = e.key.toLowerCase();
      if (key === 'p' || key === 'escape') {
        e.preventDefault();
        if (!e.repeat) pause();
        return;
      }
      if (
        [
          'w',
          'a',
          's',
          'd',
          'j',
          'k',
          ' ',
          'arrowup',
          'arrowright',
          'arrowdown',
          'arrowleft',
          'enter',
          'shift',
        ].includes(key) &&
        !mode.current.paused &&
        state.current.status === 'playing'
      ) {
        e.preventDefault();
        if (!e.repeat) {
          keys.current.delete(key);
          keys.current.add(key);
        }
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => {
      clearInput();
      if (!mode.current.ready && !mode.current.paused && state.current.status === 'playing') {
        mode.current.paused = true;
        setPaused(true);
      }
      audio.current?.stop();
    };
    const hidden = () => {
      if (document.hidden) blur();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', hidden);
      clearInput();
    };
  }, [clearInput, pause]);
  const start = () => {
    audio.current?.stop();
    audio.current?.enable(sound);
    clearInput();
    recorded.current = false;
    terminal.current = '';
    state.current = createTankGame({
      players,
      stage: custom ? 1 : stage,
      custom: custom ? map : undefined,
    });
    mode.current = { ready: false, paused: false, editing: false };
    setReady(false);
    setPaused(false);
    setEditing(false);
    refresh();
    root.current?.focus({ preventScroll: true });
  };
  const next = () => {
    audio.current?.stop();
    clearInput();
    nextTankStage(state.current);
    terminal.current = '';
    refresh();
  };
  const menu = () => {
    audio.current?.stop();
    clearInput();
    state.current = createTankGame({
      players,
      stage: custom ? 1 : stage,
      custom: custom ? map : undefined,
      seed: 1985,
    });
    mode.current.ready = true;
    setReady(true);
    setPaused(false);
    refresh();
  };
  const paint = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!painting.current) return;
    const r = e.currentTarget.getBoundingClientRect(),
      x = Math.floor(((e.clientX - r.left) / r.width) * 13),
      y = Math.floor(((e.clientY - r.top) / r.height) * 13);
    if (
      x < 0 ||
      x > 12 ||
      y < 0 ||
      y > 12 ||
      (y === 0 && [0, 6, 12].includes(x)) ||
      (y === 12 && [4, 6, 8].includes(x))
    )
      return;
    setMap((old) => {
      const next = [...old];
      next[y * 13 + x] = brush;
      return next;
    });
  };
  const control = (p: number, value: string, label: string, className: string, mark: string) => (
    <button
      type="button"
      className={`tank-control ${className}`}
      aria-label={label}
      disabled={ready || paused || state.current.status !== 'playing' || state.current.intro > 0}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        touches.current.set(e.pointerId, `p${p}${value}`);
      }}
      onPointerUp={(e) => touches.current.delete(e.pointerId)}
      onPointerCancel={(e) => touches.current.delete(e.pointerId)}
      onLostPointerCapture={(e) => touches.current.delete(e.pointerId)}
    >
      {mark}
    </button>
  );
  const s = state.current,
    remaining = 20 - s.defeated;
  return (
    <section
      className="tank-game"
      ref={root}
      tabIndex={-1}
      aria-label={zh ? '坦克大战游戏' : 'Battle City game'}
    >
      <header className="tank-header">
        {headerAction}
        <div>
          <span>BATTLE CITY · 1985</span>
          <h2>{zh ? '坦克大战' : 'Battle City'}</h2>
          <p>
            {zh
              ? '守住最后的堡垒。与你的队友，再战一关。'
              : 'Defend the eagle. One more stage, together.'}
          </p>
        </div>
        <button
          type="button"
          className="tank-small-button"
          aria-pressed={sound}
          onClick={toggleSound}
        >
          {zh ? (sound ? '音效开启' : '音效关闭') : sound ? 'Sound on' : 'Sound off'}
        </button>
      </header>
      <div className="tank-toolbar">
        <span className="tank-mission-label">
          {custom ? 'CONSTRUCTION' : 'CLASSIC CAMPAIGN'}
          <b>
            {zh
              ? `第 ${String(s.stage).padStart(2, '0')} 关`
              : `STAGE ${String(s.stage).padStart(2, '0')}`}
          </b>
          {s.loop > 1 && <em>{zh ? `${s.loop} 周目` : `Loop ${s.loop}`}</em>}
        </span>
        <span className="tank-best">
          HI-SCORE{' '}
          <b>{String(Math.max(best, ...s.players.map((p) => p.score))).padStart(6, '0')}</b>
        </span>
        {!ready && (
          <button
            type="button"
            className="tank-small-button"
            disabled={s.status !== 'playing'}
            onClick={pause}
          >
            {zh ? (paused ? '继续战斗' : '暂停') : paused ? 'Resume' : 'Pause'}
          </button>
        )}
      </div>
      <div className="tank-command-layout">
        <div className="tank-field-column">
          <div className="tank-field-shell">
            <div
              className="tank-field"
              data-status={s.status}
              data-intro={s.intro > 0}
              data-player-x={Math.round(s.tanks.find((t) => t.player === 0)?.x ?? -1)}
              data-player-y={Math.round(s.tanks.find((t) => t.player === 0)?.y ?? -1)}
              data-spawned={s.spawned}
              data-defeated={s.defeated}
            >
              <canvas
                width={832}
                height={832}
                ref={canvas}
                aria-label={
                  zh ? '坦克战场，基地位于底部中央' : 'Battlefield, eagle base at bottom centre'
                }
              />
              {editing ? (
                <div
                  className="tank-editor"
                  role="grid"
                  aria-label={zh ? '自定义战场' : 'Custom battlefield'}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    painting.current = true;
                    paint(e);
                  }}
                  onPointerMove={paint}
                  onPointerUp={() => {
                    painting.current = false;
                  }}
                  onPointerCancel={() => {
                    painting.current = false;
                  }}
                >
                  {map.map((type, i) => {
                    const spawn = [0, 6, 12].includes(i)
                      ? 'E'
                      : i === 160
                        ? '1P'
                        : i === 164
                          ? '2P'
                          : i === 162
                            ? '★'
                            : '';
                    return (
                      <button
                        key={i}
                        role="gridcell"
                        type="button"
                        aria-label={`${zh ? '地块' : 'Tile'} ${i + 1}: ${zh ? TILE_NAMES[type] : TILE_EN[type]}`}
                        style={{
                          backgroundImage: `url(/assets/games/tank/${i === 162 ? 'base' : TILE_ART[type]}-v1.webp)`,
                        }}
                        onClick={() => {
                          if (!spawn) setMap((old) => old.map((v, j) => (j === i ? brush : v)));
                        }}
                      >
                        {spawn}
                      </button>
                    );
                  })}
                </div>
              ) : (
                (ready || paused || s.status !== 'playing') && (
                  <div className="tank-overlay">
                    <div className="tank-overlay-panel">
                      <span className="tank-overlay-kicker">
                        {ready
                          ? 'DEFEND THE EAGLE'
                          : paused
                            ? 'TAKE A BREATH'
                            : s.status === 'clear'
                              ? 'STAGE CLEAR'
                              : 'GAME OVER'}
                      </span>
                      <img
                        src={`/assets/games/tank/${s.status === 'over' ? 'base-dead' : 'player'}-v1.webp`}
                        alt=""
                      />
                      <h3>
                        {ready
                          ? zh
                            ? '基地，交给你守护'
                            : 'The eagle is counting on you'
                          : paused
                            ? zh
                              ? '战斗暂停'
                              : 'Battle paused'
                            : s.status === 'clear'
                              ? zh
                                ? '堡垒守住了！'
                                : 'Base defended!'
                              : s.reason === 'base'
                                ? zh
                                  ? '基地被摧毁'
                                  : 'The eagle has fallen'
                                : zh
                                  ? '坦克已耗尽'
                                  : 'No tanks remaining'}
                      </h3>
                      <p>
                        {ready
                          ? zh
                            ? `经典 35 关 · ${players === 1 ? '单人轻松节奏，敌军更少更慢' : '双人合作，经典节奏'} · 原版音效`
                            : `35 classic stages · ${players === 1 ? 'Relaxed solo, fewer and slower enemies' : 'Classic co-op pace'} · Original FC sound`
                          : paused
                            ? zh
                              ? '按 P / Esc 或点击继续，回到战场。'
                              : 'Press P / Esc or resume the battle.'
                            : s.status === 'clear'
                              ? zh
                                ? `消灭 20 辆敌军 · 得分 ${s.players.map((p) => p.score).join(' / ')}`
                                : `20 enemies defeated · Score ${s.players.map((p) => p.score).join(' / ')}`
                              : zh
                                ? '砖墙会被打穿。别忘了回头保护基地。'
                                : 'Brick walls can break. Keep an eye on the eagle.'}
                      </p>
                      {ready && (
                        <>
                          <div className="tank-mode-pills">
                            <button
                              type="button"
                              aria-pressed={players === 1}
                              onClick={() => setPlayers(1)}
                            >
                              {zh ? '单人作战' : '1 PLAYER'}
                            </button>
                            <button
                              type="button"
                              aria-pressed={players === 2}
                              onClick={() => setPlayers(2)}
                            >
                              {zh ? '双人合作' : '2 PLAYERS'}
                            </button>
                          </div>
                          <label className="tank-stage-select">
                            {zh ? '战场选择' : 'Battlefield'}
                            <select
                              aria-label={zh ? '选择关卡' : 'Select stage'}
                              value={custom ? 'custom' : stage}
                              onChange={(e) => {
                                if (e.target.value === 'custom') {
                                  setCustom(true);
                                  state.current = createTankGame({
                                    players,
                                    custom: map,
                                    seed: 1985,
                                  });
                                } else {
                                  setCustom(false);
                                  setStage(Number(e.target.value));
                                  state.current = createTankGame({
                                    stage: Number(e.target.value),
                                    seed: 1985,
                                  });
                                }
                              }}
                            >
                              {Array.from({ length: 35 }, (_, i) => (
                                <option value={i + 1} key={i}>
                                  {zh ? `经典 · 第 ${i + 1} 关` : `Classic · Stage ${i + 1}`}
                                </option>
                              ))}
                              <option value="custom">
                                {zh ? '我的自定义战场' : 'My custom battlefield'}
                              </option>
                            </select>
                          </label>
                        </>
                      )}
                      {s.status === 'clear' && !ready && (
                        <div className="tank-kill-tally">
                          {s.players.map((p, i) => (
                            <span key={i}>
                              {i + 1}P ·{' '}
                              {p.kills.map((count, type) => (
                                <b key={type}>
                                  <img
                                    src={`/assets/games/tank/${['basic', 'fast', 'power', 'armor'][type]}-v1.webp`}
                                    alt=""
                                  />
                                  {count}
                                </b>
                              ))}
                            </span>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        className="tank-primary"
                        onClick={
                          ready ? start : paused ? pause : s.status === 'clear' ? next : start
                        }
                      >
                        {ready
                          ? zh
                            ? '开始守护'
                            : 'Start battle'
                          : paused
                            ? zh
                              ? '继续战斗'
                              : 'Resume'
                            : s.status === 'clear'
                              ? zh
                                ? s.stage === 35
                                  ? '进入下一周目'
                                  : '下一关'
                                : 'Next stage'
                              : zh
                                ? '再战一次'
                                : 'Try again'}
                      </button>
                      {!ready && !paused && (
                        <BackButton onClick={menu} label={zh ? '返回作战准备' : 'Back to briefing'} />
                      )}
                    </div>
                  </div>
                )
              )}
              {!ready && !paused && s.status === 'playing' && s.intro > 0 && (
                <div className="tank-stage-banner">
                  <span>{custom ? 'CONSTRUCTION' : 'BATTLE CITY'}</span>
                  <strong>STAGE {String(s.stage).padStart(2, '0')}</strong>
                  <p>{zh ? '敌军即将进入战场' : 'Enemy tanks incoming'}</p>
                </div>
              )}
              {s.freeze > 0 && !ready && (
                <span className="tank-freeze-badge">❄ {Math.ceil(s.freeze)}s</span>
              )}
            </div>
            <div className="tank-field-caption">
              <span>✦ {zh ? '鹰徽基地 · 不可失守' : 'EAGLE BASE · PROTECT IT'}</span>
              {ready && !editing ? (
                <button
                  type="button"
                  className="tank-construction-link"
                  onClick={() => {
                    setEditing(true);
                    mode.current.editing = true;
                  }}
                >
                  {zh ? '设计我的战场 →' : 'Build my battlefield →'}
                </button>
              ) : (
                <span>13 × 13</span>
              )}
            </div>
          </div>
          {editing ? (
            <div className="tank-editor-tools">
              <div className="tank-brushes">
                {TILE_NAMES.map((name, i) => (
                  <button
                    type="button"
                    key={i}
                    aria-pressed={brush === i}
                    onClick={() => setBrush(i)}
                  >
                    <img src={`/assets/games/tank/${TILE_ART[i]}-v1.webp`} alt="" />
                    {zh ? name : TILE_EN[i]}
                  </button>
                ))}
              </div>
              <p>
                {zh
                  ? '点按或拖动绘制。敌军入口、出生点和基地会自动保留。'
                  : 'Tap or drag to paint. Entrances, spawns and the eagle are reserved.'}
              </p>
              <div>
                <button
                  type="button"
                  className="tank-small-button"
                  onClick={() => setMap(defaultConstruction())}
                >
                  {zh ? '恢复默认' : 'Reset map'}
                </button>
                <button
                  type="button"
                  className="tank-primary"
                  onClick={() => {
                    try {
                      localStorage.setItem('sky-tank-construction-v1', JSON.stringify(map));
                    } catch {
                      /* playable in memory */
                    }
                    setCustom(true);
                    setEditing(false);
                    mode.current.editing = false;
                    state.current = createTankGame({ custom: map, seed: 1985 });
                  }}
                >
                  {zh ? '保存并使用战场' : 'Save & use battlefield'}
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`tank-controls-row ${s.players.length === 2 && !ready ? 'tank-two-controls' : ''}`}
            >
              {Array.from({ length: ready ? players : s.players.length }, (_, p) => (
                <div className={`tank-controller tank-controller-${p}`} key={p}>
                  <span>
                    {p + 1}P ·{' '}
                    {zh ? (p === 0 ? playerName : '队友') : p === 0 ? playerName : 'ALLY'}
                  </span>
                  <div className="tank-controller-body">
                    <div className="tank-dpad">
                      {control(p, 'd0', `${p + 1}P ${zh ? '向上' : 'Up'}`, 'up', '↑')}
                      {control(p, 'd3', `${p + 1}P ${zh ? '向左' : 'Left'}`, 'left', '←')}
                      <i />
                      {control(p, 'd1', `${p + 1}P ${zh ? '向右' : 'Right'}`, 'right', '→')}
                      {control(p, 'd2', `${p + 1}P ${zh ? '向下' : 'Down'}`, 'down', '↓')}
                    </div>
                    <div className="tank-fire-controls">
                      {control(p, 'f', `${p + 1}P ${zh ? '开炮 A' : 'Fire A'}`, 'fire', 'A')}
                      {control(
                        p,
                        'f',
                        `${p + 1}P ${zh ? '开炮 B' : 'Fire B'}`,
                        'fire secondary',
                        'B',
                      )}
                      <small>{zh ? '按住连续开炮' : 'HOLD TO FIRE'}</small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <aside className="tank-sidebar">
          <div className="tank-enemy-panel">
            <span className="tank-section-label">{zh ? '敌军情报' : 'ENEMY INTEL'}</span>
            <h3>
              <b>{String(remaining).padStart(2, '0')}</b>
              <small>{zh ? '辆待清除' : 'REMAINING'}</small>
            </h3>
            <div
              className="tank-enemy-grid"
              aria-label={
                zh
                  ? `未出动敌军 ${20 - s.spawned} 辆`
                  : `${20 - s.spawned} enemies not yet deployed`
              }
            >
              {s.roster.map((kind, i) => (
                <img
                  key={i}
                  className={i < s.spawned ? 'defeated' : ''}
                  src={`/assets/games/tank/${['basic', 'fast', 'power', 'armor'][kind]}-v1.webp`}
                  alt=""
                />
              ))}
            </div>
            <p>
              {zh
                ? `未出动 ${20 - s.spawned} 辆 · 闪烁的敌车藏着道具。`
                : `${20 - s.spawned} not deployed · Flashing tanks carry power-ups.`}
            </p>
          </div>
          <div className="tank-player-panels">
            {s.players.map((p, i) => (
              <div className={`tank-player-panel player-${i}`} key={i}>
                <img src={`/assets/games/tank/${i ? 'ally' : 'player'}-v1.webp`} alt="" />
                <div>
                  <span>
                    {i + 1}P · {zh ? (i ? '队友' : playerName) : i ? 'ALLY' : playerName}
                  </span>
                  <b>{String(p.score).padStart(6, '0')}</b>
                  <small>
                    {zh ? '生命' : 'LIVES'} × {p.lives}{' '}
                    <em>
                      {'★'.repeat(p.grade)}
                      {'☆'.repeat(3 - p.grade)}
                    </em>
                  </small>
                </div>
              </div>
            ))}
          </div>
          <div className={`tank-base-panel ${s.baseAlive ? '' : 'destroyed'}`}>
            <img src="/assets/games/tank/base-v1.webp" alt="" />
            <span>
              {zh ? '鹰徽基地' : 'EAGLE BASE'}
              <b>
                {s.baseAlive
                  ? s.fortify > 0
                    ? zh
                      ? `钢墙保护 ${Math.ceil(s.fortify)}s`
                      : `FORTIFIED ${Math.ceil(s.fortify)}s`
                    : zh
                      ? '守护中'
                      : 'DEFENDING'
                  : zh
                    ? '已被摧毁'
                    : 'DESTROYED'}
              </b>
            </span>
            <i />
          </div>
          <details className="tank-manual" open={ready}>
            <summary>{zh ? '作战手册' : 'FIELD MANUAL'}</summary>
            <p>
              {zh
                ? '1P：WASD 移动，J / K / 空格开炮。单人也可用方向键。2P：方向键移动，Enter / Shift 开炮。P / Esc 暂停。'
                : '1P: WASD + J / K / Space. Solo also supports arrows. 2P: arrows + Enter / Shift. P / Esc pauses.'}
            </p>
            <p>
              {zh
                ? '双方共守一个基地。友军炮弹会使队友短暂熄火，也会摧毁基地；砖墙能击碎，钢墙需要三颗星。草丛遮挡、冰面会滑行。'
                : 'Share one base. Friendly shells stun allies and can destroy the eagle. Three stars pierce steel. Forest conceals; ice slides.'}
            </p>
            <div className="tank-power-guide">
              {POWERS.map(([art, name, en, desc, enDesc]) => (
                <div key={art}>
                  <img src={`/assets/games/tank/${art}-v1.webp`} alt="" />
                  <span>
                    <b>{zh ? name : en}</b>
                    <small>{zh ? desc : enDesc}</small>
                  </span>
                </div>
              ))}
            </div>
          </details>
        </aside>
      </div>
    </section>
  );
}
