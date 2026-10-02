import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { sfx } from '../sfx';
import './sokoban.css';

export interface SokobanOutcome {
  level: number; // 1-12 全局关号
  moves: number;
  pushes: number;
  durationSec: number;
}

interface SokobanGameProps {
  headerAction?: ReactNode;
  lang: 'zh' | 'en';
  playerName: string;
  onComplete: (outcome: SokobanOutcome) => void;
}

type Phase = 'ready' | 'playing' | 'paused' | 'over';

/** 关卡字串：# 墙 · - 地板 · . 星光托盘 · @ 小星使 · $ 星箱 · * 已就位的星箱 */
interface SkLevel {
  rows: string[];
  minPushes: number;
}

const LEVELS: SkLevel[] = [
  { rows: ['########', '#------#', '#--##-.#', '#--##--#', '#--$---#', '#@-----#', '########'], minPushes: 5 },
  { rows: ['#######', '#----@#', '#-$---#', '#---.-#', '#-----#', '#-----#', '#######'], minPushes: 3 },
  { rows: ['#######', '#-----#', '#-##.-#', '#-##--#', '#--$--#', '#--@--#', '#######'], minPushes: 3 },
  { rows: ['########', '#-----@#', '#------#', '#----$-#', '#------#', '#-----.#', '########'], minPushes: 3 },
  { rows: ['########', '#------#', '#-#----#', '#-----$#', '#--.#--#', '#--$--.#', '#.--$-@#', '########'], minPushes: 6 },
  { rows: ['#########', '#-------#', '#-----.-#', '#--##$-$#', '#--##---#', '#--.-$-.#', '#@------#', '#########'], minPushes: 6 },
  { rows: ['#########', '#-------#', '#@#$--#-#', '#-----.-#', '#---#---#', '#-$$----#', '#.----.-#', '#########'], minPushes: 10 },
  { rows: ['#########', '#-----@-#', '#$#--.#-#', '#.-$----#', '#---#---#', '#-------#', '#-.--$--#', '#########'], minPushes: 7 },
  { rows: ['##########', '#-$----..#', '#-#@--#--#', '#---$----#', '#---#----#', '#.-$-$---#', '#.#---#--#', '#--------#', '##########'], minPushes: 18 },
  { rows: ['##########', '#--$-.---#', '#.#---#--#', '#--------#', '#--@#----#', '#.-$-$---#', '#-#-$-#.-#', '#--------#', '##########'], minPushes: 14 },
  { rows: ['#########', '#---.---#', '#-#-$-#-#', '#.------#', '#---#--.#', '#--$-$--#', '#$#---#.#', '#----@--#', '#########'], minPushes: 14 },
  { rows: ['##########', '#.-------#', '#-#---#--#', '#$----$@-#', '#---#----#', '#.--$----#', '#.#-$-#--#', '#-.------#', '##########'], minPushes: 16 },
];

const PACKS: Array<{ id: 'easy' | 'normal' | 'hard'; zh: string; en: string; from: number }> = [
  { id: 'easy', zh: '轻松', en: 'Breeze', from: 0 },
  { id: 'normal', zh: '认真', en: 'Focus', from: 4 },
  { id: 'hard', zh: '高手', en: 'Master', from: 8 },
];

const LEVEL_NAMES = ['星光初运', '云巷直送', '回转货道', '长桥运箱', '三箱归位', '中枢货站', '窄巷穿行', '绕柱送件', '星阵迷仓', '四箱连运', '高塔卸货', '总仓大考'];

interface Box {
  id: number;
  x: number;
  y: number;
}

interface Engine {
  levelIdx: number; // LEVELS 下标
  w: number;
  h: number;
  wall: boolean[];
  goal: boolean[];
  goalCount: number;
  player: { x: number; y: number };
  facing: 'up' | 'down' | 'left' | 'right';
  boxes: Box[];
  moves: number;
  pushes: number;
  history: Array<{ dx: number; dy: number; boxId: number | null }>;
  over: boolean;
  started: boolean;
  activeMs: number;
  warned: Set<number>; // 已提示过死锁的星箱
}

interface Snapshot {
  levelIdx: number;
  player: { x: number; y: number };
  facing: Engine['facing'];
  boxes: Array<{ id: number; x: number; y: number; done: boolean }>;
  moves: number;
  pushes: number;
  over: boolean;
  done: number;
}

function parseLevel(idx: number): Engine {
  const rows = LEVELS[idx].rows;
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const wall = new Array<boolean>(w * h).fill(false);
  const goal = new Array<boolean>(w * h).fill(false);
  const boxes: Box[] = [];
  let player = { x: 1, y: 1 };
  let goalCount = 0;
  let boxId = 0;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c === '#') wall[y * w + x] = true;
      if (c === '.' || c === '*' || c === '+') {
        goal[y * w + x] = true;
        goalCount += 1;
      }
      if (c === '$' || c === '*') boxes.push({ id: boxId++, x, y });
      if (c === '@' || c === '+') player = { x, y };
    }
  });
  return {
    levelIdx: idx,
    w,
    h,
    wall,
    goal,
    goalCount,
    player,
    facing: 'down',
    boxes,
    moves: 0,
    pushes: 0,
    history: [],
    over: false,
    started: false,
    activeMs: 0,
    warned: new Set(),
  };
}

function boxAt(e: Engine, x: number, y: number): Box | undefined {
  return e.boxes.find((b) => b.x === x && b.y === y);
}

function buildSnapshot(e: Engine): Snapshot {
  return {
    levelIdx: e.levelIdx,
    player: { ...e.player },
    facing: e.facing,
    boxes: e.boxes.map((b) => ({ ...b, done: e.goal[b.y * e.w + b.x] })),
    moves: e.moves,
    pushes: e.pushes,
    over: e.over,
    done: e.boxes.filter((b) => e.goal[b.y * e.w + b.x]).length,
  };
}

/** 星箱是否卡进死角（两个互相垂直的方向都有墙，且该格不是托盘） */
function inCornerDeadlock(e: Engine, box: Box): boolean {
  if (e.goal[box.y * e.w + box.x]) return false;
  const wallAt = (x: number, y: number) => x < 0 || x >= e.w || y < 0 || y >= e.h || e.wall[y * e.w + x];
  const up = wallAt(box.x, box.y - 1);
  const down = wallAt(box.x, box.y + 1);
  const left = wallAt(box.x - 1, box.y);
  const right = wallAt(box.x + 1, box.y);
  return (up || down) && (left || right);
}

const fmtClock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function SokobanGame({ lang, playerName, onComplete, headerAction }: SokobanGameProps) {
  const isZh = lang === 'zh';
  const sound = useStore((s) => s.sound);
  const [phase, setPhase] = useState<Phase>('ready');
  const [snap, setSnap] = useState<Snapshot>(() => buildSnapshot(parseLevel(0)));
  const [elapsed, setElapsed] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [bump, setBump] = useState(false);
  const [lastResult, setLastResult] = useState<{ levelIdx: number; moves: number; pushes: number; sec: number; record: boolean } | null>(null);
  const [bests, setBests] = useState<Record<number, number>>({});
  const engRef = useRef<Engine>(parseLevel(0));
  const phaseRef = useRef<Phase>('ready');
  const bumpTimer = useRef(0);
  phaseRef.current = phase;

  const eng = engRef.current;
  const level = eng.levelIdx;
  const levelNo = level + 1;
  const pack = PACKS.find((p) => level >= p.from && level < p.from + 4) ?? PACKS[0];
  const bestMoves = bests[level];

  const publish = useCallback(() => setSnap(buildSnapshot(engRef.current)), []);

  const finish = useCallback(() => {
    const cur = engRef.current;
    cur.over = true;
    const sec = Math.max(1, Math.round(cur.activeMs / 1000));
    const record = bests[cur.levelIdx] == null || cur.moves < bests[cur.levelIdx];
    if (record) setBests((prev) => ({ ...prev, [cur.levelIdx]: cur.moves }));
    setLastResult({ levelIdx: cur.levelIdx, moves: cur.moves, pushes: cur.pushes, sec, record });
    phaseRef.current = 'over';
    setPhase('over');
    sfx.skbWin();
    onComplete({ level: cur.levelIdx + 1, moves: cur.moves, pushes: cur.pushes, durationSec: sec });
    publish();
  }, [bests, onComplete, publish]);

  const tryMove = useCallback(
    (dx: number, dy: number) => {
      const cur = engRef.current;
      if (phaseRef.current !== 'playing' || cur.over) return;
      const facing: Engine['facing'] = dy < 0 ? 'up' : dy > 0 ? 'down' : dx < 0 ? 'left' : 'right';
      cur.facing = facing;
      const nx = cur.player.x + dx;
      const ny = cur.player.y + dy;
      if (cur.wall[ny * cur.w + nx]) {
        sfx.skbBlocked();
        setBump(true);
        window.clearTimeout(bumpTimer.current);
        bumpTimer.current = window.setTimeout(() => setBump(false), 260);
        publish();
        return;
      }
      const box = boxAt(cur, nx, ny);
      cur.started = true;
      if (box) {
        const bx = nx + dx;
        const by = ny + dy;
        if (cur.wall[by * cur.w + bx] || boxAt(cur, bx, by)) {
          sfx.skbBlocked();
          setBump(true);
          window.clearTimeout(bumpTimer.current);
          bumpTimer.current = window.setTimeout(() => setBump(false), 260);
          publish();
          return;
        }
        const wasDone = cur.goal[box.y * cur.w + box.x];
        box.x = bx;
        box.y = by;
        cur.player = { x: nx, y: ny };
        cur.moves += 1;
        cur.pushes += 1;
        cur.history.push({ dx, dy, boxId: box.id });
        sfx.skbPush();
        if (!wasDone && cur.goal[by * cur.w + bx]) sfx.skbGoal();
        if (inCornerDeadlock(cur, box) && !cur.warned.has(box.id)) {
          cur.warned.add(box.id);
          setToast(isZh ? '这只星箱卡进死角啦，点「撤销一步」回去吧' : 'That crate is stuck in a corner — undo and retry');
        }
        if (cur.boxes.every((b) => cur.goal[b.y * cur.w + b.x])) {
          finish();
          return;
        }
      } else {
        cur.player = { x: nx, y: ny };
        cur.moves += 1;
        cur.history.push({ dx, dy, boxId: null });
        sfx.skbStep();
      }
      publish();
    },
    [finish, isZh, publish],
  );

  const undo = useCallback(() => {
    const cur = engRef.current;
    if (phaseRef.current !== 'playing' || cur.over || !cur.history.length) return;
    const step = cur.history.pop()!;
    if (step.boxId != null) {
      const box = cur.boxes.find((b) => b.id === step.boxId)!;
      box.x -= step.dx;
      box.y -= step.dy;
      cur.pushes -= 1;
    }
    cur.player = { x: cur.player.x - step.dx, y: cur.player.y - step.dy };
    cur.moves -= 1;
    sfx.skbUndo();
    publish();
  }, [publish]);

  const startLevel = useCallback(
    (idx: number, autoplay = true) => {
      window.clearTimeout(bumpTimer.current);
      engRef.current = parseLevel(idx);
      setLastResult(null);
      setToast(null);
      setElapsed(0);
      setBump(false);
      if (autoplay) {
        phaseRef.current = 'playing';
        setPhase('playing');
      }
      publish();
    },
    [publish],
  );

  const togglePause = useCallback(() => {
    if (phaseRef.current === 'playing') {
      phaseRef.current = 'paused';
      setPhase('paused');
    } else if (phaseRef.current === 'paused') {
      phaseRef.current = 'playing';
      setPhase('playing');
    }
  }, []);

  // 计时：首步后每 250ms 累加，暂停冻结
  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = window.setInterval(() => {
      const cur = engRef.current;
      if (cur.started && !cur.over) {
        cur.activeMs += 250;
        setElapsed(cur.activeMs);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [phase]);

  // 键盘：方向键/WASD 移动，Z/退格撤销，R 重开，P/Esc 暂停
  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
    };
    const onKeyDown = (ev: KeyboardEvent) => {
      if (isTyping(ev.target)) return;
      const ph = phaseRef.current;
      if (ph === 'ready' || ph === 'over') {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          startLevel(engRef.current.levelIdx);
        }
        return;
      }
      if (ev.key === 'p' || ev.key === 'P' || ev.key === 'Escape') {
        ev.preventDefault();
        togglePause();
        return;
      }
      if (ph !== 'playing') return;
      switch (ev.key) {
        case 'ArrowUp': case 'w': case 'W': ev.preventDefault(); tryMove(0, -1); break;
        case 'ArrowDown': case 's': case 'S': ev.preventDefault(); tryMove(0, 1); break;
        case 'ArrowLeft': case 'a': case 'A': ev.preventDefault(); tryMove(-1, 0); break;
        case 'ArrowRight': case 'd': case 'D': ev.preventDefault(); tryMove(1, 0); break;
        case 'z': case 'Z': case 'Backspace': ev.preventDefault(); undo(); break;
        case 'r': case 'R': ev.preventDefault(); startLevel(engRef.current.levelIdx); break;
        default: break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [startLevel, togglePause, tryMove, undo]);

  // 棋盘滑动手势（触屏）
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const onBoardPointerDown = (ev: React.PointerEvent) => {
    swipeRef.current = { x: ev.clientX, y: ev.clientY };
  };
  const onBoardPointerUp = (ev: React.PointerEvent) => {
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start || phaseRef.current !== 'playing') return;
    const dx = ev.clientX - start.x;
    const dy = ev.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) tryMove(dx > 0 ? 1 : -1, 0);
    else tryMove(0, dy > 0 ? 1 : -1);
  };

  // 切到后台自动暂停
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && phaseRef.current === 'playing') togglePause();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [togglePause]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(
    () => () => {
      window.clearTimeout(bumpTimer.current);
    },
    [],
  );

  // 「星仓夜航」背景音乐：随游戏挂载/卸载启停，跟随全局声音开关
  useEffect(() => {
    if (!sound) return;
    sfx.sokobanBgmStart();
    return () => sfx.sokobanBgmStop();
  }, [sound]);

  const cells: Array<'wall' | 'floor' | 'goal' | 'void'> = [];
  for (let y = 0; y < eng.h; y++) {
    for (let x = 0; x < eng.w; x++) {
      if (eng.wall[y * eng.w + x]) cells.push('wall');
      else if (eng.goal[y * eng.w + x]) cells.push('goal');
      else cells.push('floor');
    }
  }

  const levelLabel = LEVEL_NAMES[level] ?? `第${levelNo}关`;
  const minPushes = LEVELS[level].minPushes;
  const phaseLabel =
    phase === 'playing' ? (isZh ? '进行中' : 'RUNNING') : phase === 'paused' ? (isZh ? '暂停' : 'PAUSED') : phase === 'over' ? (isZh ? '已完成' : 'ENDED') : isZh ? '待开始' : 'READY';
  const hint = phase === 'playing'
    ? (isZh ? `把 ${eng.goalCount} 只星箱推上发光的托盘就过关。卡住了就撤销或重开。` : `Push every crate onto a glowing pad. Undo or restart any time.`)
    : phase === 'paused'
      ? (isZh ? '休息一下，点「继续」再回来运箱。' : 'Take a break, press resume to keep pushing.')
      : phase === 'over'
        ? (isZh ? `${eng.goalCount} 只星箱全部就位，仓库理得真整齐！` : `All crates in place — the warehouse is spotless!`)
        : (isZh ? `用方向键或方向盘移动小星使，把星箱推上托盘。` : `Move the courier with arrows and push crates onto the pads.`);

  return (
    <section className="sk-warehouse" aria-labelledby="sk-title">
      <header className="sk-heading">
        {headerAction ?? (<div className="sk-title-seal classic-art" aria-hidden="true" />)}
        <div>
          <span>{isZh ? '益智 · 星云货仓' : 'PUZZLE · STAR CRATES'}</span>
          <h2 id="sk-title">{isZh ? '星仓推箱' : 'Star Crate Push'}</h2>
          <p>{isZh ? '夜间货仓里摆着几只星箱：推动它们卡进发光的星光托盘，全部就位就通关！' : 'Push every glowing crate onto its star pad to clear the night warehouse!'}</p>
        </div>
        <div className="sk-session" aria-label={isZh ? '本关会话最佳步数' : 'Session best moves'}>
          <span>{isZh ? `${levelLabel} 最佳` : `${levelLabel} best`} <b>{bestMoves != null ? bestMoves : '--'}</b></span>
          <span>{isZh ? '最少推动' : 'Min pushes'} <b>{minPushes > 0 ? minPushes : '—'}</b></span>
        </div>
      </header>

      <div className="sk-table">
        <div className="sk-stage">
          <div className="sk-board-wrap">
            <div
              className={`sk-board${bump ? ' bump' : ''}`}
              role="group"
              aria-label={isZh
                ? `星仓推箱棋盘，第${levelNo}关 ${levelLabel}，${eng.w} 列 ${eng.h} 行，托盘上的星箱 ${snap.done}/${eng.goalCount}，已走 ${snap.moves} 步`
                : `Star Crate Push board, level ${levelNo}, ${eng.w} by ${eng.h}, ${snap.done}/${eng.goalCount} crates placed, ${snap.moves} moves`}
              style={{ '--w': eng.w, '--h': eng.h } as React.CSSProperties}
              onPointerDown={onBoardPointerDown}
              onPointerUp={onBoardPointerUp}
            >
              <div className="sk-grid" aria-hidden="true">
                {cells.map((c, i) => (
                  <span key={i} className={`sk-cell ${c}`} />
                ))}
              </div>
              <div className="sk-pieces" aria-hidden="true">
                {snap.boxes.map((b) => (
                  <span
                    key={b.id}
                    className={`sk-box${b.done ? ' done' : ''}`}
                    style={{ '--gx': b.x, '--gy': b.y } as React.CSSProperties}
                  />
                ))}
                <span
                  className={`sk-hero face-${snap.facing}`}
                  style={{ '--gx': snap.player.x, '--gy': snap.player.y } as React.CSSProperties}
                />
              </div>

              {phase === 'ready' && (
                <div className="sk-overlay">
                  <b>{isZh ? `第${levelNo}关 · ${levelLabel}` : `Level ${levelNo}`}</b>
                  <p>{isZh
                    ? `${playerName}，把 ${eng.goalCount} 只星箱推上发光托盘。箱子只能推不能拉，一步一步想清楚哦。`
                    : `${playerName}, push ${eng.goalCount} crates onto the pads. Crates only push — plan each step!`}</p>
                  <button type="button" className="sk-overlay-btn" onClick={() => startLevel(level)}>
                    <span aria-hidden="true">📦</span>{isZh ? '开始游戏' : 'Start'}
                  </button>
                  <small>{isZh ? '键盘：方向键/WASD 移动 · Z 撤销 · R 重开 · P 暂停' : 'Keys: arrows/WASD move · Z undo · R restart · P pause'}</small>
                </div>
              )}
              {phase === 'paused' && (
                <div className="sk-overlay dim">
                  <b>{isZh ? '暂停中' : 'Paused'}</b>
                  <div className="sk-overlay-row">
                    <button type="button" className="sk-overlay-btn" onClick={togglePause}>{isZh ? '继续 (P)' : 'Resume'}</button>
                    <button type="button" className="sk-overlay-btn ghost" onClick={() => startLevel(level)}>{isZh ? '重开本关' : 'Restart'}</button>
                  </div>
                </div>
              )}
              {phase === 'over' && lastResult && (
                <div className="sk-overlay over">
                  <b>{isZh ? '本关完成！' : 'Level clear!'}</b>
                  {lastResult.record && <em className="sk-record">{isZh ? '★ 步数新纪录！' : '★ New best moves!'}</em>}
                  <div className="sk-final">
                    <span>{isZh ? '步数' : 'Moves'}<b>{lastResult.moves}</b></span>
                    <span>{isZh ? '推动' : 'Pushes'}<b>{lastResult.pushes}</b></span>
                    <span>{isZh ? '用时' : 'Time'}<b>{fmtClock(lastResult.sec * 1000)}</b></span>
                  </div>
                  <div className="sk-overlay-row">
                    {level < LEVELS.length - 1 && (
                      <button type="button" className="sk-overlay-btn" onClick={() => startLevel(level + 1)}>
                        <span aria-hidden="true">→</span>{isZh ? `下一关（第${level + 2}关）` : 'Next level'}
                      </button>
                    )}
                    <button type="button" className={level < LEVELS.length - 1 ? 'sk-overlay-btn ghost' : 'sk-overlay-btn'} onClick={() => startLevel(level)}>
                      <span aria-hidden="true">↻</span>{isZh ? '再玩一次' : 'Replay'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {toast && <div className="sk-toast" role="status">{toast}</div>}
          </div>

          {/* 触屏方向盘 + 撤销 */}
          <div className="sk-touchbar" aria-label={isZh ? '运箱操作' : 'Push controls'}>
            <div className="sk-dpad" role="group" aria-label={isZh ? '方向键盘' : 'Direction pad'}>
              <span className="pad-up">
                <button type="button" aria-label={isZh ? '向上移动' : 'Move up'} onClick={() => tryMove(0, -1)}>▲</button>
              </span>
              <span className="pad-left">
                <button type="button" aria-label={isZh ? '向左移动' : 'Move left'} onClick={() => tryMove(-1, 0)}>◀</button>
              </span>
              <span className="pad-down">
                <button type="button" aria-label={isZh ? '向下移动' : 'Move down'} onClick={() => tryMove(0, 1)}>▼</button>
              </span>
              <span className="pad-right">
                <button type="button" aria-label={isZh ? '向右移动' : 'Move right'} onClick={() => tryMove(1, 0)}>▶</button>
              </span>
              <i className="pad-core" aria-hidden="true">✦</i>
            </div>
            <button
              type="button"
              className="sk-undo-btn"
              onClick={undo}
              disabled={phase !== 'playing' || snap.moves === 0}
              aria-label={isZh ? '撤销一步' : 'Undo one step'}
            >
              <span aria-hidden="true">↶</span>{isZh ? '撤销一步' : 'Undo'}
            </button>
          </div>
        </div>

        <aside className="sk-console">
          <div className="sk-status-box" aria-live="polite">
            <small>{isZh ? `第${levelNo}关 · ${phaseLabel}` : `LEVEL ${levelNo} · ${phaseLabel}`}</small>
            <div className="sk-goal-row">
              <span>{isZh ? '就位星箱' : 'Crates placed'}</span>
              <b>{snap.done}<i>/{eng.goalCount}</i></b>
            </div>
            <div className="sk-stats" aria-label={isZh ? '本局数据' : 'Round stats'}>
              <span>{isZh ? '用时' : 'Time'} <b>{fmtClock(elapsed)}</b></span>
              <span>{isZh ? '步数' : 'Moves'} <b>{snap.moves}</b></span>
              <span>{isZh ? '推动' : 'Pushes'} <b>{snap.pushes}</b></span>
            </div>
            <div className="sk-progress" aria-hidden="true">
              <i style={{ width: `${eng.goalCount ? (snap.done / eng.goalCount) * 100 : 0}%` }} />
              <small>{isZh ? `再就位 ${Math.max(0, eng.goalCount - snap.done)} 只星箱获胜` : `${Math.max(0, eng.goalCount - snap.done)} crates to go`}</small>
            </div>
            <p>{hint}</p>
          </div>

          <div className="sk-difficulty">
            <span>{isZh ? '难度分档' : 'DIFFICULTY'}</span>
            <div role="group" aria-label={isZh ? '选择难度' : 'Choose difficulty'}>
              {PACKS.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className={pack.id === p.id ? 'active' : ''}
                  aria-pressed={pack.id === p.id}
                  aria-label={isZh ? `${p.zh}：第${p.from + 1}-${p.from + 4}关` : `${p.en}: levels ${p.from + 1}-${p.from + 4}`}
                  onClick={() => startLevel(p.from)}
                >
                  <i aria-hidden="true" />{isZh ? p.zh : p.en}
                </button>
              ))}
            </div>
            <span className="sk-level-label">{isZh ? '选择关卡' : 'LEVELS'}</span>
            <div className="sk-level-chips" role="group" aria-label={isZh ? '选择关卡' : 'Choose level'}>
              {[0, 1, 2, 3].map((offset) => {
                const idx = pack.from + offset;
                return (
                  <button
                    type="button"
                    key={idx}
                    className={level === idx ? 'active' : ''}
                    aria-pressed={level === idx}
                    aria-label={isZh ? `第${idx + 1}关 ${LEVEL_NAMES[idx]}` : `Level ${idx + 1}`}
                    onClick={() => startLevel(idx)}
                  >
                    <b>{idx + 1}</b>
                    {bests[idx] != null && <i aria-hidden="true">★</i>}
                  </button>
                );
              })}
            </div>
            <small>{isZh ? '轻松 1-4 关 · 认真 5-8 关 · 高手 9-12 关；随时换关都会重开本关' : 'Levels 1-4 breeze · 5-8 focus · 9-12 master'}</small>
          </div>

          <div className="sk-actions">
            {(phase === 'playing' || phase === 'paused') && (
              <button type="button" onClick={togglePause}>
                <span aria-hidden="true">{phase === 'playing' ? '⏸' : '▶'}</span>
                {phase === 'playing' ? (isZh ? '暂停 (P)' : 'Pause') : (isZh ? '继续 (P)' : 'Resume')}
              </button>
            )}
            <button type="button" onClick={undo} disabled={phase !== 'playing' || snap.moves === 0}>
              <span aria-hidden="true">↶</span>{isZh ? '撤销一步' : 'Undo'}
            </button>
            <button type="button" className="sk-primary" onClick={() => startLevel(level)}>
              <span aria-hidden="true">↻</span>
              {phase === 'ready' ? (isZh ? '开始游戏' : 'Start') : phase === 'over' ? (isZh ? '再玩一次' : 'Replay') : (isZh ? '重开本关' : 'Restart')}
            </button>
          </div>

          <div className="sk-rule-note">
            <span aria-hidden="true">📦{eng.goalCount}</span>
            <p>{isZh ? '星箱只能推不能拉 · 撞墙会咚一声 · 卡进死角可以撤销 · 全部就位即通关' : 'Crates only push · corners can trap a crate · undo any time · place all to win'}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
