import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { sfx } from '../sfx';
import './klotski.css';

export interface KlotskiOutcome {
  level: number; // 1-6 布局号
  moves: number;
  durationSec: number;
}

interface KlotskiGameProps {
  headerAction?: ReactNode;
  lang: 'zh' | 'en';
  playerName: string;
  onComplete: (outcome: KlotskiOutcome) => void;
}

type Phase = 'ready' | 'playing' | 'paused' | 'over';
type Kind = 'cao' | 'v' | 'h' | 's';

interface PieceDef {
  kind: Kind;
  x: number;
  y: number;
  label: string;
}

interface Layout {
  zh: string;
  en: string;
  pieces: PieceDef[];
  minMoves: number;
}

const KIND_SIZE: Record<Kind, { w: number; h: number }> = {
  cao: { w: 2, h: 2 },
  v: { w: 1, h: 2 },
  h: { w: 2, h: 1 },
  s: { w: 1, h: 1 },
};

/** 六座星门布阵：从易到难，最后一阵为经典「横刀立马」（最少步数均经 BFS 验证） */
const LAYOUTS: Layout[] = [
  {
    zh: '让开小道', en: 'Clear the Path', minMoves: 3,
    pieces: [
      { kind: 'v', x: 0, y: 0, label: '张飞' }, { kind: 'v', x: 3, y: 0, label: '赵云' },
      { kind: 'cao', x: 1, y: 0, label: '曹操' },
      { kind: 's', x: 1, y: 2, label: '兵一' }, { kind: 's', x: 2, y: 2, label: '兵二' },
      { kind: 's', x: 0, y: 3, label: '兵三' }, { kind: 's', x: 3, y: 3, label: '兵四' },
      { kind: 's', x: 0, y: 4, label: '兵五' }, { kind: 's', x: 3, y: 4, label: '兵六' },
    ],
  },
  {
    zh: '近在眼前', en: 'Within Reach', minMoves: 13,
    pieces: [
      { kind: 'v', x: 0, y: 0, label: '张飞' }, { kind: 'v', x: 3, y: 0, label: '赵云' },
      { kind: 'cao', x: 1, y: 1, label: '曹操' },
      { kind: 'h', x: 1, y: 3, label: '关羽' },
      { kind: 's', x: 0, y: 3, label: '兵一' }, { kind: 's', x: 3, y: 3, label: '兵二' },
      { kind: 's', x: 0, y: 4, label: '兵三' }, { kind: 's', x: 3, y: 4, label: '兵四' },
    ],
  },
  {
    zh: '重兵把守', en: 'Heavy Guard', minMoves: 26,
    pieces: [
      { kind: 's', x: 0, y: 0, label: '兵一' }, { kind: 's', x: 1, y: 0, label: '兵二' },
      { kind: 's', x: 2, y: 0, label: '兵三' }, { kind: 's', x: 3, y: 0, label: '兵四' },
      { kind: 'v', x: 0, y: 1, label: '张飞' }, { kind: 'cao', x: 1, y: 1, label: '曹操' }, { kind: 'v', x: 3, y: 1, label: '赵云' },
      { kind: 'h', x: 1, y: 3, label: '关羽' },
      { kind: 's', x: 0, y: 3, label: '兵五' }, { kind: 's', x: 3, y: 3, label: '兵六' },
      { kind: 's', x: 0, y: 4, label: '兵七' }, { kind: 's', x: 3, y: 4, label: '兵八' },
    ],
  },
  {
    zh: '两翼包抄', en: 'Twin Wings', minMoves: 75,
    pieces: [
      { kind: 's', x: 0, y: 0, label: '兵一' }, { kind: 'cao', x: 1, y: 0, label: '曹操' }, { kind: 's', x: 3, y: 0, label: '兵二' },
      { kind: 'v', x: 0, y: 1, label: '张飞' }, { kind: 'v', x: 3, y: 1, label: '赵云' },
      { kind: 'h', x: 1, y: 2, label: '关羽' },
      { kind: 'v', x: 0, y: 3, label: '马超' }, { kind: 'v', x: 3, y: 3, label: '黄忠' },
      { kind: 's', x: 1, y: 4, label: '兵三' }, { kind: 's', x: 2, y: 4, label: '兵四' },
    ],
  },
  {
    zh: '指挥若定', en: 'Steady Command', minMoves: 79,
    pieces: [
      { kind: 'v', x: 0, y: 0, label: '张飞' }, { kind: 'cao', x: 1, y: 0, label: '曹操' }, { kind: 'v', x: 3, y: 0, label: '赵云' },
      { kind: 's', x: 0, y: 2, label: '兵一' }, { kind: 'h', x: 1, y: 2, label: '关羽' }, { kind: 's', x: 3, y: 2, label: '兵二' },
      { kind: 'v', x: 0, y: 3, label: '马超' }, { kind: 'v', x: 3, y: 3, label: '黄忠' },
      { kind: 's', x: 1, y: 4, label: '兵三' }, { kind: 's', x: 2, y: 4, label: '兵四' },
    ],
  },
  {
    zh: '横刀立马', en: 'Classic Gate', minMoves: 90,
    pieces: [
      { kind: 'v', x: 0, y: 0, label: '张飞' }, { kind: 'cao', x: 1, y: 0, label: '曹操' }, { kind: 'v', x: 3, y: 0, label: '赵云' },
      { kind: 'v', x: 0, y: 2, label: '马超' },
      { kind: 'h', x: 1, y: 2, label: '关羽' },
      { kind: 'v', x: 3, y: 2, label: '黄忠' },
      { kind: 's', x: 1, y: 3, label: '兵一' }, { kind: 's', x: 2, y: 3, label: '兵二' },
      { kind: 's', x: 0, y: 4, label: '兵三' }, { kind: 's', x: 3, y: 4, label: '兵四' },
    ],
  },
];

interface Piece extends PieceDef {
  id: number;
  w: number;
  h: number;
}

interface Engine {
  layoutIdx: number;
  pieces: Piece[];
  grid: number[][]; // 5 行 × 4 列，-1 空
  moves: number;
  history: Array<{ id: number; dx: number; dy: number; newMove: boolean }>;
  lastStep: { id: number; dx: number; dy: number } | null;
  selected: number | null;
  escapingId: number | null;
  over: boolean;
  started: boolean;
  activeMs: number;
}

interface Snapshot {
  layoutIdx: number;
  pieces: Array<Piece & { escape: boolean }>;
  moves: number;
  selected: number | null;
  over: boolean;
}

function parseLayout(idx: number): Engine {
  const pieces: Piece[] = LAYOUTS[idx].pieces.map((p, i) => ({
    ...p,
    id: i,
    w: KIND_SIZE[p.kind].w,
    h: KIND_SIZE[p.kind].h,
  }));
  const grid = Array.from({ length: 5 }, () => Array<number>(4).fill(-1));
  pieces.forEach((p) => {
    for (let dy = 0; dy < p.h; dy++) for (let dx = 0; dx < p.w; dx++) {
      // 布阵数据防线：棋块重叠或出界直接抛错，避免静默渲染成叠块
      if (p.y + dy > 4 || p.x + dx > 3 || grid[p.y + dy][p.x + dx] !== -1) {
        throw new Error(`星门华容第 ${idx + 1} 阵「${LAYOUTS[idx].zh}」布阵非法：${p.label} 越界或与其他棋块重叠`);
      }
      grid[p.y + dy][p.x + dx] = p.id;
    }
  });
  return {
    layoutIdx: idx,
    pieces,
    grid,
    moves: 0,
    history: [],
    lastStep: null,
    selected: pieces.find((p) => p.kind === 'cao')?.id ?? null,
    escapingId: null,
    over: false,
    started: false,
    activeMs: 0,
  };
}

function canMove(e: Engine, id: number, dx: number, dy: number): boolean {
  const p = e.pieces[id];
  const nx = p.x + dx;
  const ny = p.y + dy;
  if (nx < 0 || ny < 0 || nx + p.w > 4 || ny + p.h > 5) return false;
  for (let y = ny; y < ny + p.h; y++) {
    for (let x = nx; x < nx + p.w; x++) {
      const occ = e.grid[y][x];
      if (occ !== -1 && occ !== id) return false;
    }
  }
  return true;
}

function applyMove(e: Engine, id: number, dx: number, dy: number, newMove: boolean) {
  const p = e.pieces[id];
  for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) e.grid[y][x] = -1;
  p.x += dx;
  p.y += dy;
  for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) e.grid[y][x] = id;
  e.history.push({ id, dx, dy, newMove });
  e.lastStep = { id, dx, dy };
  if (newMove) e.moves += 1;
}

function buildSnapshot(e: Engine): Snapshot {
  return {
    layoutIdx: e.layoutIdx,
    pieces: e.pieces.map((p) => ({ ...p, escape: e.escapingId === p.id })),
    moves: e.moves,
    selected: e.selected,
    over: e.over,
  };
}

const fmtClock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function KlotskiGame({ lang, playerName, onComplete, headerAction }: KlotskiGameProps) {
  const isZh = lang === 'zh';
  const sound = useStore((s) => s.sound);
  const [phase, setPhase] = useState<Phase>('ready');
  const [snap, setSnap] = useState<Snapshot>(() => buildSnapshot(parseLayout(0)));
  const [elapsed, setElapsed] = useState(0);
  const [lastResult, setLastResult] = useState<{ layoutIdx: number; moves: number; sec: number; record: boolean } | null>(null);
  const [bests, setBests] = useState<Record<number, number>>({});
  const engRef = useRef<Engine>(parseLayout(0));
  const phaseRef = useRef<Phase>('ready');
  const escapeTimer = useRef(0);
  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  phaseRef.current = phase;

  const eng = engRef.current;
  const layoutIdx = eng.layoutIdx;
  const layout = LAYOUTS[layoutIdx];
  const bestMoves = bests[layoutIdx];
  const cao = snap.pieces.find((p) => p.kind === 'cao');

  const publish = useCallback(() => setSnap(buildSnapshot(engRef.current)), []);

  const finish = useCallback(() => {
    const cur = engRef.current;
    cur.over = true;
    const sec = Math.max(1, Math.round(cur.activeMs / 1000));
    const record = bests[cur.layoutIdx] == null || cur.moves < bests[cur.layoutIdx];
    if (record) setBests((prev) => ({ ...prev, [cur.layoutIdx]: cur.moves }));
    setLastResult({ layoutIdx: cur.layoutIdx, moves: cur.moves, sec, record });
    phaseRef.current = 'over';
    setPhase('over');
    sfx.hrdWin();
    onComplete({ level: cur.layoutIdx + 1, moves: cur.moves, durationSec: sec });
    publish();
  }, [bests, onComplete, publish]);

  const tryMove = useCallback(
    (id: number, dx: number, dy: number) => {
      const cur = engRef.current;
      if (phaseRef.current !== 'playing' || cur.over || cur.escapingId != null) return false;
      if (!canMove(cur, id, dx, dy)) {
        sfx.hrdBlocked();
        return false;
      }
      const newMove = !(cur.lastStep && cur.lastStep.id === id && cur.lastStep.dx === dx && cur.lastStep.dy === dy);
      applyMove(cur, id, dx, dy, newMove);
      cur.started = true;
      cur.selected = id;
      sfx.hrdSlide();
      const caoPiece = cur.pieces.find((p) => p.kind === 'cao')!;
      if (caoPiece.x === 1 && caoPiece.y === 3) {
        // 曹操抵达星门：滑出城外后结算
        cur.escapingId = caoPiece.id;
        publish();
        window.clearTimeout(escapeTimer.current);
        escapeTimer.current = window.setTimeout(finish, 950);
        return true;
      }
      publish();
      return true;
    },
    [finish, publish],
  );

  const select = useCallback(
    (id: number) => {
      const cur = engRef.current;
      if (phaseRef.current !== 'playing' || cur.over || cur.escapingId != null) return;
      if (cur.selected === id) return;
      cur.selected = id;
      sfx.hrdSelect();
      publish();
    },
    [publish],
  );

  const undo = useCallback(() => {
    const cur = engRef.current;
    if (phaseRef.current !== 'playing' || cur.over || cur.escapingId != null || !cur.history.length) return;
    const step = cur.history.pop()!;
    const p = cur.pieces[step.id];
    for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) cur.grid[y][x] = -1;
    p.x -= step.dx;
    p.y -= step.dy;
    for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) cur.grid[y][x] = p.id;
    if (step.newMove) cur.moves -= 1;
    const prev = cur.history[cur.history.length - 1];
    cur.lastStep = prev ? { id: prev.id, dx: prev.dx, dy: prev.dy } : null;
    cur.selected = step.id;
    sfx.hrdUndo();
    publish();
  }, [publish]);

  const startLayout = useCallback(
    (idx: number) => {
      window.clearTimeout(escapeTimer.current);
      engRef.current = parseLayout(idx);
      setLastResult(null);
      setElapsed(0);
      phaseRef.current = 'playing';
      setPhase('playing');
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

  // 键盘：方向键移动选中的棋块，Z/退格撤销，R 重开，P/Esc 暂停
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
          startLayout(engRef.current.layoutIdx);
        }
        return;
      }
      if (ev.key === 'p' || ev.key === 'P' || ev.key === 'Escape') {
        ev.preventDefault();
        togglePause();
        return;
      }
      if (ph !== 'playing') return;
      const cur = engRef.current;
      switch (ev.key) {
        case 'ArrowUp': case 'w': case 'W': ev.preventDefault(); if (cur.selected != null) tryMove(cur.selected, 0, -1); break;
        case 'ArrowDown': case 's': case 'S': ev.preventDefault(); if (cur.selected != null) tryMove(cur.selected, 0, 1); break;
        case 'ArrowLeft': case 'a': case 'A': ev.preventDefault(); if (cur.selected != null) tryMove(cur.selected, -1, 0); break;
        case 'ArrowRight': case 'd': case 'D': ev.preventDefault(); if (cur.selected != null) tryMove(cur.selected, 1, 0); break;
        case 'z': case 'Z': case 'Backspace': ev.preventDefault(); undo(); break;
        case 'r': case 'R': ev.preventDefault(); startLayout(cur.layoutIdx); break;
        default: break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [startLayout, togglePause, tryMove, undo]);

  // 切到后台自动暂停
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && phaseRef.current === 'playing') togglePause();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [togglePause]);

  useEffect(() => () => window.clearTimeout(escapeTimer.current), []);

  // 「华容古道」背景音乐：随游戏挂载/卸载启停，跟随全局声音开关
  useEffect(() => {
    if (!sound) return;
    sfx.klotskiBgmStart();
    return () => sfx.klotskiBgmStop();
  }, [sound]);

  // 指针拖拽：超过阈值按主轴方向滑一格，成功后重新锚定可连拖
  const onPiecePointerDown = (ev: React.PointerEvent, id: number) => {
    if (phaseRef.current !== 'playing') return;
    select(id);
    (ev.currentTarget as HTMLElement).setPointerCapture?.(ev.pointerId);
    dragRef.current = { x: ev.clientX, y: ev.clientY, moved: false };
  };
  const onPiecePointerMove = (ev: React.PointerEvent, id: number) => {
    const drag = dragRef.current;
    if (!drag || phaseRef.current !== 'playing') return;
    const dx = ev.clientX - drag.x;
    const dy = ev.clientY - drag.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) return;
    const moved = Math.abs(dx) > Math.abs(dy)
      ? tryMove(id, dx > 0 ? 1 : -1, 0)
      : tryMove(id, 0, dy > 0 ? 1 : -1);
    if (moved) {
      drag.x = ev.clientX;
      drag.y = ev.clientY;
      drag.moved = true;
    }
  };
  const onPiecePointerUp = () => {
    dragRef.current = null;
  };

  const pieceAria = (p: Snapshot['pieces'][number]) => {
    const size = p.w === 2 && p.h === 2 ? (isZh ? '二乘二' : '2 by 2') : p.w === 1 && p.h === 2 ? (isZh ? '一乘二' : '1 by 2') : p.w === 2 ? (isZh ? '二乘一' : '2 by 1') : (isZh ? '一乘一' : '1 by 1');
    const state = snap.selected === p.id ? (isZh ? '，已选中，用方向键移动' : ', selected, move with arrows') : '';
    return `${p.label}，${size}${state}`;
  };

  const phaseLabel =
    phase === 'playing' ? (isZh ? '进行中' : 'RUNNING') : phase === 'paused' ? (isZh ? '暂停' : 'PAUSED') : phase === 'over' ? (isZh ? '已出逃' : 'ENDED') : isZh ? '待开始' : 'READY';
  const hint = phase === 'playing'
    ? (isZh ? '拖动或用方向键滑动棋块，把金色的曹操移到下方星门，护送他出城！' : 'Slide blocks by dragging or arrows and escort gold Cao Cao to the gate below!')
    : phase === 'paused'
      ? (isZh ? '休息一下，点「继续」再回来破阵。' : 'Take a break, press resume to keep solving.')
      : phase === 'over'
        ? (isZh ? '曹操顺利出城，星门重归平静！' : 'Cao Cao escaped — the star gate rests easy!')
        : (isZh ? '上下左右滑动棋块腾出空位，目标是让曹操从下方星门出城。' : 'Slide pieces to open a path and let Cao Cao escape through the bottom gate.');

  return (
    <section className="hrd-gate" aria-labelledby="hrd-title">
      <header className="hrd-heading">
        {headerAction ?? (<div className="hrd-title-seal classic-art" aria-hidden="true" />)}
        <div>
          <span>{isZh ? '益智 · 星门布阵' : 'PUZZLE · STAR GATE'}</span>
          <h2 id="hrd-title">{isZh ? '星门华容' : 'Star Gate Escape'}</h2>
          <p>{isZh ? '星门城下棋块林立：滑动它们腾出通道，护送曹操从下方星门出城！' : 'Slide the blocks aside and escort Cao Cao out through the star gate!'}</p>
        </div>
        <div className="hrd-session" aria-label={isZh ? '本阵会话最佳步数' : 'Session best moves'}>
          <span>{isZh ? `${layout.zh} 最佳` : `${layout.en} best`} <b>{bestMoves != null ? bestMoves : '--'}</b></span>
          <span>{isZh ? '本阵最少' : 'Min moves'} <b>{layout.minMoves}</b></span>
        </div>
      </header>

      <div className="hrd-table">
        <div className="hrd-stage">
          <div className="hrd-board-wrap">
            <div
              className="hrd-board"
              role="group"
              aria-label={isZh
                ? `星门华容棋盘，第${layoutIdx + 1}阵 ${layout.zh}，已走 ${snap.moves} 步，曹操${cao && cao.y >= 3 ? '已到城门' : '还在城中'}`
                : `Star Gate Escape board, layout ${layoutIdx + 1} ${layout.en}, ${snap.moves} moves`}
            >
              <div className="hrd-field">
                <div className="hrd-gate-mark" aria-hidden="true"><i />星门<i /></div>
                {snap.pieces.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`hrd-piece ${p.kind}${snap.selected === p.id ? ' sel' : ''}${p.escape ? ' escape' : ''}`}
                    style={{ '--x': p.x, '--y': p.y, '--pw': p.w, '--ph': p.h } as React.CSSProperties}
                    aria-label={pieceAria(p)}
                    onFocus={() => select(p.id)}
                    onPointerDown={(ev) => onPiecePointerDown(ev, p.id)}
                    onPointerMove={(ev) => onPiecePointerMove(ev, p.id)}
                    onPointerUp={onPiecePointerUp}
                    onPointerCancel={onPiecePointerUp}
                  >
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>

              {phase === 'ready' && (
                <div className="hrd-overlay">
                  <b>{isZh ? `第${layoutIdx + 1}阵 · ${layout.zh}` : `Layout ${layoutIdx + 1}`}</b>
                  <p>{isZh
                    ? `${playerName}，拖动棋块腾出空位，把最大的曹操移到下方星门。同一棋块连着滑，只算一步哦。`
                    : `${playerName}, slide blocks to open a path for big Cao Cao to the bottom gate.`}</p>
                  <button type="button" className="hrd-overlay-btn" onClick={() => startLayout(layoutIdx)}>
                    <span aria-hidden="true">🏯</span>{isZh ? '开始游戏' : 'Start'}
                  </button>
                  <small>{isZh ? '键盘：点选棋块后方向键滑动 · Z 撤销 · R 重开 · P 暂停' : 'Keys: click a piece then arrows · Z undo · R restart · P pause'}</small>
                </div>
              )}
              {phase === 'paused' && (
                <div className="hrd-overlay dim">
                  <b>{isZh ? '暂停中' : 'Paused'}</b>
                  <div className="hrd-overlay-row">
                    <button type="button" className="hrd-overlay-btn" onClick={togglePause}>{isZh ? '继续 (P)' : 'Resume'}</button>
                    <button type="button" className="hrd-overlay-btn ghost" onClick={() => startLayout(layoutIdx)}>{isZh ? '重开本阵' : 'Restart'}</button>
                  </div>
                </div>
              )}
              {phase === 'over' && lastResult && (
                <div className="hrd-overlay over">
                  <b>{isZh ? '曹操出城啦！' : 'Cao Cao is out!'}</b>
                  {lastResult.record && <em className="hrd-record">{isZh ? '★ 步数新纪录！' : '★ New best moves!'}</em>}
                  <div className="hrd-final">
                    <span>{isZh ? '步数' : 'Moves'}<b>{lastResult.moves}</b></span>
                    <span>{isZh ? '本阵最少' : 'Min'}<b>{LAYOUTS[lastResult.layoutIdx].minMoves}</b></span>
                    <span>{isZh ? '用时' : 'Time'}<b>{fmtClock(lastResult.sec * 1000)}</b></span>
                  </div>
                  <div className="hrd-overlay-row">
                    {layoutIdx < LAYOUTS.length - 1 && (
                      <button type="button" className="hrd-overlay-btn" onClick={() => startLayout(layoutIdx + 1)}>
                        <span aria-hidden="true">→</span>{isZh ? `下一阵（${LAYOUTS[layoutIdx + 1].zh}）` : 'Next layout'}
                      </button>
                    )}
                    <button type="button" className={layoutIdx < LAYOUTS.length - 1 ? 'hrd-overlay-btn ghost' : 'hrd-overlay-btn'} onClick={() => startLayout(layoutIdx)}>
                      <span aria-hidden="true">↻</span>{isZh ? '再破一次' : 'Replay'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 触屏提示条 */}
          <div className="hrd-touchbar" aria-label={isZh ? '布阵操作' : 'Layout controls'}>
            <span className="hrd-drag-hint">{isZh ? '🖐 直接拖动棋块滑动' : '🖐 Drag blocks directly'}</span>
            <button
              type="button"
              className="hrd-undo-btn"
              onClick={undo}
              disabled={phase !== 'playing' || !engRef.current.history.length}
              aria-label={isZh ? '撤销一步' : 'Undo one step'}
            >
              <span aria-hidden="true">↶</span>{isZh ? '撤销一步' : 'Undo'}
            </button>
          </div>
        </div>

        <aside className="hrd-console">
          <div className="hrd-status-box" aria-live="polite">
            <small>{isZh ? `第${layoutIdx + 1}阵 · ${phaseLabel}` : `LAYOUT ${layoutIdx + 1} · ${phaseLabel}`}</small>
            <div className="hrd-move-row">
              <span>{isZh ? '本阵步数' : 'Moves'}</span>
              <b>{snap.moves}</b>
            </div>
            <div className="hrd-stats" aria-label={isZh ? '本局数据' : 'Round stats'}>
              <span>{isZh ? '用时' : 'Time'} <b>{fmtClock(elapsed)}</b></span>
              <span>{isZh ? '本阵最少' : 'Min'} <b>{layout.minMoves}</b></span>
              <span>{isZh ? '最佳' : 'Best'} <b>{bestMoves != null ? bestMoves : '--'}</b></span>
            </div>
            <div className="hrd-progress" aria-hidden="true">
              {cao && <i style={{ top: `${Math.min(100, (cao.y / 3) * 100)}%` }} />}
              <small>{isZh ? (cao && cao.y >= 3 ? '曹操已抵星门！' : `曹操还差 ${Math.max(0, 3 - (cao?.y ?? 0))} 格到星门`) : 'Cao Cao approaches the gate'}</small>
            </div>
            <p>{hint}</p>
          </div>

          <div className="hrd-difficulty">
            <span>{isZh ? '星门布阵' : 'LAYOUTS'}</span>
            <div role="group" aria-label={isZh ? '选择布阵' : 'Choose layout'}>
              {LAYOUTS.map((l, i) => (
                <button
                  type="button"
                  key={l.zh}
                  className={layoutIdx === i ? 'active' : ''}
                  aria-pressed={layoutIdx === i}
                  aria-label={isZh ? `第${i + 1}阵 ${l.zh}，最少 ${l.minMoves} 步` : `Layout ${i + 1} ${l.en}, min ${l.minMoves} moves`}
                  onClick={() => startLayout(i)}
                >
                  <b>{i + 1}</b>{isZh ? l.zh : l.en}
                </button>
              ))}
            </div>
            <small>{isZh ? '第 1 阵最易、第 6 阵最难；换阵都会重开本阵' : 'Layout 1 easiest, 6 hardest; switching restarts'}</small>
          </div>

          <div className="hrd-actions">
            {(phase === 'playing' || phase === 'paused') && (
              <button type="button" onClick={togglePause}>
                <span aria-hidden="true">{phase === 'playing' ? '⏸' : '▶'}</span>
                {phase === 'playing' ? (isZh ? '暂停 (P)' : 'Pause') : (isZh ? '继续 (P)' : 'Resume')}
              </button>
            )}
            <button type="button" onClick={undo} disabled={phase !== 'playing' || !engRef.current.history.length}>
              <span aria-hidden="true">↶</span>{isZh ? '撤销一步' : 'Undo'}
            </button>
            <button type="button" className="hrd-primary" onClick={() => startLayout(layoutIdx)}>
              <span aria-hidden="true">↻</span>
              {phase === 'ready' ? (isZh ? '开始游戏' : 'Start') : phase === 'over' ? (isZh ? '再破一次' : 'Replay') : (isZh ? '重开本阵' : 'Restart')}
            </button>
          </div>

          <div className="hrd-rule-note">
            <span aria-hidden="true">🏯</span>
            <p>{isZh ? '棋块不能跳也不能拐 · 同一块连着同向滑只算一步 · 曹操抵达下方星门即出城' : 'Blocks slide one step at a time · same-block slides count once · Cao Cao exits at the gate'}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
