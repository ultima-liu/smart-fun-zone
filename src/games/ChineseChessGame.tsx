import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { sfx } from '../sfx';
import './chinese-chess.css';

type Side = 'red' | 'black';
type PieceKind = 'general' | 'advisor' | 'elephant' | 'horse' | 'rook' | 'cannon' | 'soldier';
type Difficulty = 'easy' | 'normal' | 'hard';
type Result = 'win' | 'lose' | 'draw';

interface Piece {
  id: string;
  side: Side;
  kind: PieceKind;
}

interface Move {
  from: number;
  to: number;
  piece: Piece;
  captured: Piece | null;
}

interface ChineseChessGameProps {
  headerAction?: ReactNode;
  lang: 'zh' | 'en';
  playerName: string;
  onComplete: (result: Result, durationSec: number, difficulty: Difficulty) => void;
}

type Board = Array<Piece | null>;

const FILES = 9;
const RANKS = 10;
const opponent = (side: Side): Side => side === 'red' ? 'black' : 'red';
const pos = (x: number, y: number) => y * FILES + x;
const xy = (index: number) => [index % FILES, Math.floor(index / FILES)] as const;
const inside = (x: number, y: number) => x >= 0 && x < FILES && y >= 0 && y < RANKS;
const inPalace = (x: number, y: number, side: Side) => x >= 3 && x <= 5 && (side === 'red' ? y >= 7 && y <= 9 : y >= 0 && y <= 2);

const GLYPH: Record<Side, Record<PieceKind, string>> = {
  red: { general: '帅', advisor: '仕', elephant: '相', horse: '马', rook: '车', cannon: '炮', soldier: '兵' },
  black: { general: '将', advisor: '士', elephant: '象', horse: '馬', rook: '車', cannon: '砲', soldier: '卒' },
};

const PIECE_NAME: Record<PieceKind, { zh: string; en: string }> = {
  general: { zh: '将帅', en: 'general' }, advisor: { zh: '士', en: 'advisor' }, elephant: { zh: '象', en: 'elephant' },
  horse: { zh: '马', en: 'horse' }, rook: { zh: '车', en: 'rook' }, cannon: { zh: '炮', en: 'cannon' }, soldier: { zh: '兵卒', en: 'soldier' },
};

const VALUE: Record<PieceKind, number> = { general: 100_000, rook: 900, cannon: 470, horse: 420, elephant: 210, advisor: 210, soldier: 110 };

const difficultyText: Record<Difficulty, { zh: string; en: string }> = {
  easy: { zh: '入门', en: 'Starter' }, normal: { zh: '棋手', en: 'Player' }, hard: { zh: '大师', en: 'Master' },
};

function makePiece(side: Side, kind: PieceKind, suffix: string): Piece {
  return { id: `${side}-${kind}-${suffix}`, side, kind };
}

export function createChineseChessBoard(): Board {
  const board: Board = Array(FILES * RANKS).fill(null);
  const back: PieceKind[] = ['rook', 'horse', 'elephant', 'advisor', 'general', 'advisor', 'elephant', 'horse', 'rook'];
  back.forEach((kind, x) => {
    board[pos(x, 0)] = makePiece('black', kind, String(x));
    board[pos(x, 9)] = makePiece('red', kind, String(x));
  });
  board[pos(1, 2)] = makePiece('black', 'cannon', 'left');
  board[pos(7, 2)] = makePiece('black', 'cannon', 'right');
  board[pos(1, 7)] = makePiece('red', 'cannon', 'left');
  board[pos(7, 7)] = makePiece('red', 'cannon', 'right');
  [0, 2, 4, 6, 8].forEach((x, index) => {
    board[pos(x, 3)] = makePiece('black', 'soldier', String(index));
    board[pos(x, 6)] = makePiece('red', 'soldier', String(index));
  });
  return board;
}

function applyMove(board: Board, from: number, to: number): Board {
  const next = [...board];
  next[to] = next[from];
  next[from] = null;
  return next;
}

function pseudoMoves(board: Board, from: number): number[] {
  const piece = board[from];
  if (!piece) return [];
  const [x, y] = xy(from);
  const moves: number[] = [];
  const add = (nx: number, ny: number) => {
    if (!inside(nx, ny)) return;
    const target = board[pos(nx, ny)];
    if (!target || target.side !== piece.side) moves.push(pos(nx, ny));
  };

  if (piece.kind === 'general') {
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
      const nx = x + dx; const ny = y + dy;
      if (inPalace(nx, ny, piece.side)) add(nx, ny);
    });
    for (const dy of [-1, 1]) {
      for (let ny = y + dy; inside(x, ny); ny += dy) {
        const target = board[pos(x, ny)];
        if (!target) continue;
        if (target.side !== piece.side && target.kind === 'general') moves.push(pos(x, ny));
        break;
      }
    }
  }

  if (piece.kind === 'advisor') {
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dx, dy]) => {
      const nx = x + dx; const ny = y + dy;
      if (inPalace(nx, ny, piece.side)) add(nx, ny);
    });
  }

  if (piece.kind === 'elephant') {
    [[2, 2], [2, -2], [-2, 2], [-2, -2]].forEach(([dx, dy]) => {
      const nx = x + dx; const ny = y + dy;
      const staysHome = piece.side === 'red' ? ny >= 5 : ny <= 4;
      if (inside(nx, ny) && staysHome && !board[pos(x + dx / 2, y + dy / 2)]) add(nx, ny);
    });
  }

  if (piece.kind === 'horse') {
    const jumps = [
      [2, 1, 1, 0], [2, -1, 1, 0], [-2, 1, -1, 0], [-2, -1, -1, 0],
      [1, 2, 0, 1], [-1, 2, 0, 1], [1, -2, 0, -1], [-1, -2, 0, -1],
    ];
    jumps.forEach(([dx, dy, legX, legY]) => {
      if (!board[pos(x + legX, y + legY)]) add(x + dx, y + dy);
    });
  }

  if (piece.kind === 'rook' || piece.kind === 'cannon') {
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
      let screened = false;
      for (let step = 1; inside(x + dx * step, y + dy * step); step++) {
        const targetIndex = pos(x + dx * step, y + dy * step);
        const target = board[targetIndex];
        if (piece.kind === 'rook') {
          if (!target) moves.push(targetIndex);
          else {
            if (target.side !== piece.side) moves.push(targetIndex);
            break;
          }
        } else if (!screened) {
          if (!target) moves.push(targetIndex);
          else screened = true;
        } else if (target) {
          if (target.side !== piece.side) moves.push(targetIndex);
          break;
        }
      }
    });
  }

  if (piece.kind === 'soldier') {
    const forward = piece.side === 'red' ? -1 : 1;
    add(x, y + forward);
    const crossedRiver = piece.side === 'red' ? y <= 4 : y >= 5;
    if (crossedRiver) { add(x - 1, y); add(x + 1, y); }
  }

  return moves;
}

export function isChineseChessCheck(board: Board, side: Side): boolean {
  const general = board.findIndex((piece) => piece?.side === side && piece.kind === 'general');
  if (general < 0) return true;
  return board.some((piece, index) => piece?.side === opponent(side) && pseudoMoves(board, index).includes(general));
}

export function legalChineseChessMoves(board: Board, side: Side): Move[] {
  const moves: Move[] = [];
  board.forEach((piece, from) => {
    if (piece?.side !== side) return;
    pseudoMoves(board, from).forEach((to) => {
      const next = applyMove(board, from, to);
      if (!isChineseChessCheck(next, side)) moves.push({ from, to, piece, captured: board[to] });
    });
  });
  return moves;
}

function boardScore(board: Board): number {
  return board.reduce((score, piece, index) => {
    if (!piece) return score;
    const [, y] = xy(index);
    const advancement = piece.kind === 'soldier' ? (piece.side === 'black' ? y : 9 - y) * 7 : 0;
    const value = VALUE[piece.kind] + advancement;
    return score + (piece.side === 'black' ? value : -value);
  }, 0);
}

function chooseComputerMove(board: Board, difficulty: Difficulty): Move | null {
  const moves = legalChineseChessMoves(board, 'black');
  if (!moves.length) return null;
  const winning = moves.find((move) => move.captured?.kind === 'general');
  if (winning) return winning;

  const ranked = moves.map((move) => {
    const next = applyMove(board, move.from, move.to);
    const [x, y] = xy(move.to);
    let score = boardScore(next) + (move.captured ? VALUE[move.captured.kind] * 2.8 : 0) + (4 - Math.abs(4 - x)) * 5 + y * 1.5;
    if (isChineseChessCheck(next, 'red')) score += 95;
    return { move, next, score };
  }).sort((a, b) => b.score - a.score);

  if (difficulty === 'hard') {
    ranked.slice(0, 12).forEach((candidate) => {
      const replies = legalChineseChessMoves(candidate.next, 'red');
      if (!replies.length) { candidate.score = 10_000_000; return; }
      const worstReply = Math.min(...replies.map((reply) => boardScore(applyMove(candidate.next, reply.from, reply.to))));
      candidate.score = candidate.score * .35 + worstReply * .65;
    });
    ranked.sort((a, b) => b.score - a.score);
    return ranked[0].move;
  }

  const pool = difficulty === 'easy' ? Math.min(10, ranked.length) : Math.min(3, ranked.length);
  return ranked[Math.floor(Math.random() * pool)].move;
}

export default function ChineseChessGame({ lang, playerName, onComplete, headerAction }: ChineseChessGameProps) {
  const [board, setBoard] = useState<Board>(() => createChineseChessBoard());
  const [history, setHistory] = useState<Board[]>(() => [createChineseChessBoard()]);
  const [moves, setMoves] = useState<Move[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [turn, setTurn] = useState<Side>('red');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [result, setResult] = useState<Result | null>(null);
  const [score, setScore] = useState({ player: 0, computer: 0 });
  const startedAt = useRef(Date.now());
  const sound = useStore((s) => s.sound);
  const isZh = lang === 'zh';
  const lastMove = moves[moves.length - 1];
  const redInCheck = useMemo(() => isChineseChessCheck(board, 'red'), [board]);
  const blackInCheck = useMemo(() => isChineseChessCheck(board, 'black'), [board]);
  const selectedMoves = useMemo(() => selected === null ? [] : legalChineseChessMoves(board, 'red').filter((move) => move.from === selected), [board, selected]);
  const targetMap = useMemo(() => new Map(selectedMoves.map((move) => [move.to, move])), [selectedMoves]);
  const captured = useMemo(() => moves.flatMap((move) => move.captured ? [move.captured] : []), [moves]);

  // 楚河汉界背景音乐：随游戏挂载/卸载启停，也跟随全局声音开关
  useEffect(() => {
    if (!sound) return;
    sfx.xiangqiBgmStart();
    return () => sfx.xiangqiBgmStop();
  }, [sound]);

  const finish = (nextResult: Result) => {
    setResult(nextResult);
    setTurn('red');
    setSelected(null);
    if (nextResult === 'win') { setScore((current) => ({ ...current, player: current.player + 1 })); sfx.gameWin(); }
    if (nextResult === 'lose') { setScore((current) => ({ ...current, computer: current.computer + 1 })); sfx.gameLose(); }
    if (nextResult === 'draw') sfx.gameDraw();
    onComplete(nextResult, Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)), difficulty);
  };

  const startNewGame = (nextDifficulty: Difficulty = difficulty) => {
    const initial = createChineseChessBoard();
    setBoard(initial);
    setHistory([initial]);
    setMoves([]);
    setSelected(null);
    setTurn('red');
    setDifficulty(nextDifficulty);
    setResult(null);
    startedAt.current = Date.now();
  };

  const movePlayer = (move: Move) => {
    const next = applyMove(board, move.from, move.to);
    const nextMove = { ...move, captured: board[move.to] };
    const nextMoves = [...moves, nextMove];
    if (move.captured) sfx.xqCapture();
    else sfx.xqMove();
    setBoard(next);
    setHistory((current) => [...current, next]);
    setMoves(nextMoves);
    setSelected(null);
    if (move.captured?.kind === 'general' || legalChineseChessMoves(next, 'black').length === 0) finish('win');
    else if (nextMoves.length >= 160) finish('draw');
    else {
      if (isChineseChessCheck(next, 'black')) sfx.xqCheck();
      setTurn('black');
    }
  };

  const handleCell = (index: number) => {
    if (turn !== 'red' || result) return;
    const piece = board[index];
    if (piece?.side === 'red') {
      setSelected(index === selected ? null : index);
      sfx.xqSelect();
      return;
    }
    const move = targetMap.get(index);
    if (move) movePlayer(move);
    else setSelected(null);
  };

  useEffect(() => {
    if (turn !== 'black' || result) return;
    const timer = window.setTimeout(() => {
      const move = chooseComputerMove(board, difficulty);
      if (!move) { finish('win'); return; }
      const next = applyMove(board, move.from, move.to);
      const nextMove = { ...move, captured: board[move.to] };
      const nextMoves = [...moves, nextMove];
      if (move.captured) sfx.xqCapture();
      else sfx.xqMove();
      setBoard(next);
      setHistory((current) => [...current, next]);
      setMoves(nextMoves);
      if (move.captured?.kind === 'general' || legalChineseChessMoves(next, 'red').length === 0) finish('lose');
      else if (nextMoves.length >= 160) finish('draw');
      else {
        if (isChineseChessCheck(next, 'red')) sfx.xqCheck();
        setTurn('red');
      }
    }, difficulty === 'hard' ? 620 : 430);
    return () => window.clearTimeout(timer);
  }, [turn, result, board, moves, difficulty]);

  const undo = () => {
    if (turn === 'black' || moves.length === 0) return;
    sfx.undoSweep();
    const removeCount = moves.length % 2 === 1 ? 1 : Math.min(2, moves.length);
    const nextHistory = history.slice(0, -removeCount);
    setBoard(nextHistory[nextHistory.length - 1]);
    setHistory(nextHistory);
    setMoves((current) => current.slice(0, -removeCount));
    setResult(null);
    setSelected(null);
    setTurn('red');
  };

  const statusTitle = result === 'win'
    ? (isZh ? '将军！你赢下了这盘棋' : 'Checkmate — you win!')
    : result === 'lose'
      ? (isZh ? '泡泡棋手赢下了这盘棋' : 'Pao-Pao wins this match')
      : result === 'draw'
        ? (isZh ? '鏖战八十回合，和棋' : 'Eighty rounds — draw')
        : turn === 'black'
          ? (isZh ? '泡泡棋手正在运筹…' : 'Pao-Pao is planning…')
          : redInCheck
            ? (isZh ? `${playerName}，小心！你被将军了` : `${playerName}, you are in check!`)
            : (isZh ? `${playerName}，轮到红方行棋` : `${playerName}, red to move`);

  return (
    <section className="xiangqi-pavilion" aria-labelledby="xiangqi-title">
      <header className="xiangqi-heading">
        {headerAction ?? (<div className="xiangqi-title-seal classic-art" aria-hidden="true" />)}
        <div>
          <span>{isZh ? '云端对弈 · 楚河汉界' : 'CLOUD MATCH · RIVER BATTLE'}</span>
          <h2 id="xiangqi-title">{isZh ? '云台中国象棋' : 'Cloud Xiangqi'}</h2>
          <p>{isZh ? '你执红先行。点击棋子查看落点，擒获对方将帅或将死获胜。' : 'You play red first. Select a piece, then choose a legal destination.'}</p>
        </div>
        <div className="xiangqi-match-score" aria-label={isZh ? '本次比分' : 'Session score'}>
          <span><i className="red">帅</i>{isZh ? '你' : 'You'} <b>{score.player}</b></span><em>:</em><span><i>将</i>{isZh ? '泡泡' : 'Pao-Pao'} <b>{score.computer}</b></span>
        </div>
      </header>

      <div className="xiangqi-table">
        <div className="xiangqi-board-wrap">
          <div className="xiangqi-board-glow" aria-hidden="true" />
          <div className="xiangqi-board" role="grid" aria-label={isZh ? '中国象棋棋盘' : 'Xiangqi board'}>
            <svg className="xiangqi-lines" viewBox="0 0 800 900" aria-hidden="true">
              <rect x="0" y="0" width="800" height="900" />
              {Array.from({ length: 10 }, (_, y) => <line key={`h-${y}`} x1="0" y1={y * 100} x2="800" y2={y * 100} />)}
              <line x1="0" y1="0" x2="0" y2="900" /><line x1="800" y1="0" x2="800" y2="900" />
              {Array.from({ length: 7 }, (_, index) => (index + 1) * 100).flatMap((x) => [<line key={`vt-${x}`} x1={x} y1="0" x2={x} y2="400" />, <line key={`vb-${x}`} x1={x} y1="500" x2={x} y2="900" />])}
              <line x1="300" y1="0" x2="500" y2="200" /><line x1="500" y1="0" x2="300" y2="200" />
              <line x1="300" y1="700" x2="500" y2="900" /><line x1="500" y1="700" x2="300" y2="900" />
              <text x="205" y="467">楚 河</text><text x="595" y="467">汉 界</text>
            </svg>
            <div className="xiangqi-cells">
              {board.map((piece, index) => {
                const [x, y] = xy(index);
                const move = targetMap.get(index);
                const isLast = lastMove?.from === index || lastMove?.to === index;
                const label = piece
                  ? `${isZh ? (piece.side === 'red' ? '红方' : '黑方') : piece.side} ${PIECE_NAME[piece.kind][lang]}，${isZh ? `第 ${y + 1} 行第 ${x + 1} 路` : `row ${y + 1}, file ${x + 1}`}`
                  : (isZh ? `第 ${y + 1} 行第 ${x + 1} 路，空位` : `row ${y + 1}, file ${x + 1}, empty`);
                return (
                  <button
                    type="button"
                    role="gridcell"
                    key={index}
                    className={`xiangqi-cell ${piece?.side ?? ''} ${selected === index ? 'selected' : ''} ${move ? 'target' : ''} ${move?.captured ? 'capture' : ''} ${isLast ? 'last' : ''}`}
                    style={{ left: `${5 + x * 11.25}%`, top: `${5 + y * 10}%` }}
                    aria-label={label}
                    aria-selected={selected === index}
                    aria-disabled={turn !== 'red' || !!result}
                    onClick={() => handleCell(index)}
                  >
                    {piece && <span aria-hidden="true">{GLYPH[piece.side][piece.kind]}</span>}
                  </button>
                );
              })}
            </div>
            {result && <div className={`xiangqi-result-ribbon ${result}`} aria-hidden="true"><span>{result === 'win' ? (isZh ? '得胜' : 'VICTORY') : result === 'lose' ? (isZh ? '再战' : 'REMATCH') : (isZh ? '和棋' : 'DRAW')}</span></div>}
          </div>
        </div>

        <aside className="xiangqi-console">
          <div className={`xiangqi-turn-card ${turn} ${result ? `result-${result}` : ''}`} aria-live="polite">
            <span>{result ? (isZh ? '本局结果' : 'MATCH RESULT') : (isZh ? `第 ${Math.floor(moves.length / 2) + 1} 回合` : `ROUND ${Math.floor(moves.length / 2) + 1}`)}</span>
            <strong>{statusTitle}</strong>
            <p>{result ? (isZh ? '复盘一下刚才的攻守，再来一盘吧。' : 'Review the battle, then try another match.') : turn === 'black' ? (isZh ? '黑方落子前，棋盘暂时锁定。' : 'The board waits while black moves.') : selected !== null ? (isZh ? `已选中${GLYPH.red[board[selected]!.kind]}，发光圆点是可走位置。` : 'Piece selected. Glowing points are legal moves.') : (isZh ? '先选一枚红棋，再选择发光落点。' : 'Select a red piece, then a glowing destination.')}</p>
            {(redInCheck || blackInCheck) && !result && <b className="xiangqi-check">{isZh ? `将军 · ${redInCheck ? '红方应将' : '黑方应将'}` : `CHECK · ${redInCheck ? 'RED' : 'BLACK'}`}</b>}
          </div>

          <div className="xiangqi-captured" aria-label={isZh ? '已被吃掉的棋子' : 'Captured pieces'}>
            <span>{isZh ? '战局记录' : 'CAPTURED'}</span>
            <div>{captured.length ? captured.map((piece, index) => <i className={piece.side} key={`${piece.id}-${index}`}>{GLYPH[piece.side][piece.kind]}</i>) : <small>{isZh ? '尚未吃子' : 'No captures yet'}</small>}</div>
          </div>

          <div className="xiangqi-difficulty">
            <span>{isZh ? '电脑棋力' : 'OPPONENT LEVEL'}</span>
            <div role="group" aria-label={isZh ? '选择象棋难度' : 'Choose Xiangqi difficulty'}>
              {(Object.keys(difficultyText) as Difficulty[]).map((item) => <button type="button" key={item} className={difficulty === item ? 'active' : ''} aria-pressed={difficulty === item} onClick={() => startNewGame(item)}><i />{difficultyText[item][lang]}</button>)}
            </div>
            <small>{isZh ? '切换棋力会开启新棋局' : 'Changing level starts a new match'}</small>
          </div>

          <div className="xiangqi-actions">
            <button type="button" className="xiangqi-primary" onClick={() => startNewGame()}><span aria-hidden="true">↻</span>{result ? (isZh ? '再来一盘' : 'Play again') : (isZh ? '重新开局' : 'New match')}</button>
            <button type="button" disabled={turn === 'black' || moves.length === 0} onClick={undo}><span aria-hidden="true">↶</span>{isZh ? '悔一回合' : 'Undo turn'}</button>
          </div>

          <div className="xiangqi-rule-note"><span aria-hidden="true">将</span><p>{isZh ? '红方先行 · 马走日 · 象走田 · 炮翻山' : 'Red first · Horse in L · Elephant diagonal · Cannon jumps to capture'}</p></div>
        </aside>
      </div>
    </section>
  );
}
