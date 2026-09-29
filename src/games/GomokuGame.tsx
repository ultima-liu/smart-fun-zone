import { useEffect, useMemo, useRef, useState } from 'react';
import './gomoku.css';

const BOARD_SIZE = 15;
const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
const DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]] as const;

type Stone = 0 | 1 | 2;
type Difficulty = 'easy' | 'normal' | 'hard';
type Result = 'win' | 'lose' | 'draw';

interface GomokuGameProps {
  lang: 'zh' | 'en';
  playerName: string;
  onComplete: (result: Result, durationSec: number, difficulty: Difficulty) => void;
}

const difficultyText: Record<Difficulty, { zh: string; en: string }> = {
  easy: { zh: '轻松', en: 'Breeze' },
  normal: { zh: '认真', en: 'Focus' },
  hard: { zh: '高手', en: 'Master' },
};

const xy = (index: number) => [index % BOARD_SIZE, Math.floor(index / BOARD_SIZE)] as const;
const at = (x: number, y: number) => y * BOARD_SIZE + x;
const inside = (x: number, y: number) => x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;

export function findWinningLine(board: Stone[], index: number): number[] {
  const stone = board[index];
  if (!stone) return [];
  const [x, y] = xy(index);
  for (const [dx, dy] of DIRECTIONS) {
    const line = [index];
    for (let step = 1; inside(x + dx * step, y + dy * step); step++) {
      const next = at(x + dx * step, y + dy * step);
      if (board[next] !== stone) break;
      line.push(next);
    }
    for (let step = 1; inside(x - dx * step, y - dy * step); step++) {
      const next = at(x - dx * step, y - dy * step);
      if (board[next] !== stone) break;
      line.unshift(next);
    }
    if (line.length >= 5) return line;
  }
  return [];
}

function linePotential(board: Stone[], index: number, stone: 1 | 2): number {
  const [x, y] = xy(index);
  let total = 0;
  for (const [dx, dy] of DIRECTIONS) {
    let count = 1;
    let open = 0;
    for (const sign of [-1, 1] as const) {
      let step = 1;
      while (inside(x + dx * step * sign, y + dy * step * sign)) {
        const value = board[at(x + dx * step * sign, y + dy * step * sign)];
        if (value === stone) {
          count++;
          step++;
          continue;
        }
        if (value === 0) open++;
        break;
      }
    }
    if (count >= 5) total += 1_000_000;
    else if (count === 4 && open === 2) total += 120_000;
    else if (count === 4 && open === 1) total += 26_000;
    else if (count === 3 && open === 2) total += 9_000;
    else if (count === 3 && open === 1) total += 1_600;
    else if (count === 2 && open === 2) total += 520;
    else if (count === 2 && open === 1) total += 90;
    else total += 8 + open * 2;
  }
  return total;
}

function nearbyCandidates(board: Stone[], radius: number): number[] {
  if (board.every((value) => value === 0)) return [at(7, 7)];
  const candidates = new Set<number>();
  board.forEach((stone, index) => {
    if (!stone) return;
    const [x, y] = xy(index);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (!inside(x + dx, y + dy)) continue;
        const candidate = at(x + dx, y + dy);
        if (board[candidate] === 0) candidates.add(candidate);
      }
    }
  });
  return [...candidates];
}

export function chooseComputerMove(board: Stone[], difficulty: Difficulty): number {
  const radius = difficulty === 'easy' ? 1 : 2;
  const ranked = nearbyCandidates(board, radius).map((index) => {
    const attackBoard = [...board];
    attackBoard[index] = 2;
    const attack = linePotential(attackBoard, index, 2);
    const defendBoard = [...board];
    defendBoard[index] = 1;
    const defend = linePotential(defendBoard, index, 1);
    const [x, y] = xy(index);
    const center = 14 - Math.abs(7 - x) - Math.abs(7 - y);
    const noise = difficulty === 'hard' ? 0 : Math.random() * (difficulty === 'easy' ? 460 : 55);
    return { index, score: attack * 1.08 + defend + center * 3 + noise };
  }).sort((a, b) => b.score - a.score);

  if (!ranked.length) return board.findIndex((value) => value === 0);
  const pool = difficulty === 'easy' ? Math.min(6, ranked.length) : difficulty === 'normal' ? Math.min(2, ranked.length) : 1;
  return ranked[Math.floor(Math.random() * pool)].index;
}

export default function GomokuGame({ lang, playerName, onComplete }: GomokuGameProps) {
  const [board, setBoard] = useState<Stone[]>(() => Array(CELL_COUNT).fill(0));
  const [moves, setMoves] = useState<number[]>([]);
  const [turn, setTurn] = useState<'player' | 'computer'>('player');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [result, setResult] = useState<Result | null>(null);
  const [winningLine, setWinningLine] = useState<number[]>([]);
  const [score, setScore] = useState({ player: 0, computer: 0 });
  const startedAt = useRef(Date.now());

  const isZh = lang === 'zh';
  const moveNumber = Math.ceil(moves.length / 2);
  const winningSet = useMemo(() => new Set(winningLine), [winningLine]);
  const latest = moves[moves.length - 1];

  const finish = (nextResult: Result, line: number[]) => {
    setResult(nextResult);
    setWinningLine(line);
    setTurn('player');
    if (nextResult === 'win') setScore((current) => ({ ...current, player: current.player + 1 }));
    if (nextResult === 'lose') setScore((current) => ({ ...current, computer: current.computer + 1 }));
    onComplete(nextResult, Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)), difficulty);
  };

  const startNewGame = (nextDifficulty: Difficulty = difficulty) => {
    setBoard(Array(CELL_COUNT).fill(0));
    setMoves([]);
    setTurn('player');
    setResult(null);
    setWinningLine([]);
    setDifficulty(nextDifficulty);
    startedAt.current = Date.now();
  };

  const placePlayerStone = (index: number) => {
    if (turn !== 'player' || result || board[index] !== 0) return;
    const next = [...board];
    next[index] = 1;
    const nextMoves = [...moves, index];
    const line = findWinningLine(next, index);
    setBoard(next);
    setMoves(nextMoves);
    if (line.length) {
      finish('win', line);
    } else if (nextMoves.length === CELL_COUNT) {
      finish('draw', []);
    } else {
      setTurn('computer');
    }
  };

  useEffect(() => {
    if (turn !== 'computer' || result) return;
    const timer = window.setTimeout(() => {
      const index = chooseComputerMove(board, difficulty);
      if (index < 0) {
        finish('draw', []);
        return;
      }
      const next = [...board];
      next[index] = 2;
      const nextMoves = [...moves, index];
      const line = findWinningLine(next, index);
      setBoard(next);
      setMoves(nextMoves);
      if (line.length) finish('lose', line);
      else if (nextMoves.length === CELL_COUNT) finish('draw', []);
      else setTurn('player');
    }, difficulty === 'hard' ? 520 : 380);
    return () => window.clearTimeout(timer);
  }, [turn, result, board, moves, difficulty]);

  const undo = () => {
    if (turn === 'computer' || moves.length === 0) return;
    const removeCount = result && moves.length % 2 === 1 ? 1 : Math.min(2, moves.length);
    const kept = moves.slice(0, -removeCount);
    const next: Stone[] = Array(CELL_COUNT).fill(0);
    kept.forEach((index, moveIndex) => { next[index] = moveIndex % 2 === 0 ? 1 : 2; });
    setBoard(next);
    setMoves(kept);
    setResult(null);
    setWinningLine([]);
    setTurn('player');
  };

  const statusTitle = result === 'win'
    ? (isZh ? '五子连珠，你赢了！' : 'Five in a row — you win!')
    : result === 'lose'
      ? (isZh ? '泡泡棋士赢下这局' : 'Pao-Pao wins this round')
      : result === 'draw'
        ? (isZh ? '星盘落满，平局' : 'The board is full — draw')
        : turn === 'computer'
          ? (isZh ? '泡泡棋士正在思考…' : 'Pao-Pao is thinking…')
          : (isZh ? `${playerName}，轮到你落子` : `${playerName}, your move`);

  return (
    <section className="gomoku-observatory" aria-labelledby="gomoku-title">
      <header className="gomoku-heading">
        <div className="gomoku-title-seal" aria-hidden="true"><i /><b>五</b><i /></div>
        <div>
          <span>{isZh ? '云上棋局 · 今日开放' : 'CLOUD BOARD · NOW OPEN'}</span>
          <h2 id="gomoku-title">{isZh ? '星河五子棋' : 'Starlight Gomoku'}</h2>
          <p>{isZh ? '执黑先行，横、竖或斜线率先连成五子即可获胜。' : 'You play black. Connect five stones horizontally, vertically, or diagonally to win.'}</p>
        </div>
        <div className="gomoku-match-score" aria-label={isZh ? '本次比分' : 'Session score'}>
          <span><i className="mini-stone black" />{isZh ? '你' : 'You'} <b>{score.player}</b></span>
          <em>:</em>
          <span><i className="mini-stone white" />{isZh ? '泡泡' : 'Pao-Pao'} <b>{score.computer}</b></span>
        </div>
      </header>

      <div className="gomoku-table">
        <div className="gomoku-board-wrap">
          <div className="gomoku-board-glow" aria-hidden="true" />
          <div className="gomoku-board" role="grid" aria-label={isZh ? '十五路五子棋棋盘' : '15 by 15 Gomoku board'}>
            <div className="gomoku-grid-lines" aria-hidden="true" />
            <div className="gomoku-star-points" aria-hidden="true">
              {[['23.333%', '23.333%'], ['50%', '23.333%'], ['76.667%', '23.333%'], ['23.333%', '50%'], ['50%', '50%'], ['76.667%', '50%'], ['23.333%', '76.667%'], ['50%', '76.667%'], ['76.667%', '76.667%']].map(([left, top]) => (
                <i key={`${left}-${top}`} style={{ left, top }} />
              ))}
            </div>
            <div className="gomoku-cells">
              {board.map((stone, index) => {
                const [x, y] = xy(index);
                const label = isZh
                  ? `第 ${y + 1} 行，第 ${x + 1} 列，${stone === 1 ? '黑子' : stone === 2 ? '白子' : '空位'}`
                  : `Row ${y + 1}, column ${x + 1}, ${stone === 1 ? 'black stone' : stone === 2 ? 'white stone' : 'empty'}`;
                return (
                  <button
                    type="button"
                    role="gridcell"
                    key={index}
                    className={`gomoku-cell ${stone === 1 ? 'black' : stone === 2 ? 'white' : ''} ${latest === index ? 'latest' : ''} ${winningSet.has(index) ? 'winning' : ''}`}
                    aria-label={label}
                    aria-disabled={stone !== 0 || turn !== 'player' || !!result}
                    onClick={() => placePlayerStone(index)}
                  >
                    {stone !== 0 && <span aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            {result && (
              <div className={`gomoku-result-ribbon ${result}`} aria-hidden="true">
                <span>{result === 'win' ? (isZh ? '连珠' : 'VICTORY') : result === 'lose' ? (isZh ? '再战' : 'REMATCH') : (isZh ? '和棋' : 'DRAW')}</span>
              </div>
            )}
          </div>
        </div>

        <aside className="gomoku-console">
          <div className={`gomoku-turn-card ${turn} ${result ? `result-${result}` : ''}`} aria-live="polite">
            <span className="gomoku-turn-orbit" aria-hidden="true"><i /><i /><i /></span>
            <small>{result ? (isZh ? '本局结果' : 'ROUND RESULT') : (isZh ? `第 ${moveNumber || 1} 回合` : `ROUND ${moveNumber || 1}`)}</small>
            <strong>{statusTitle}</strong>
            <p>{result === 'win'
              ? (isZh ? '漂亮的星河连线！要不要再下一局？' : 'A beautiful line across the stars. Play again?')
              : result === 'lose'
                ? (isZh ? '差一点！观察交叉位置，再试一次。' : 'So close! Watch the crossing lines and try again.')
                : result === 'draw'
                  ? (isZh ? '势均力敌，你们一起点亮了整张星盘。' : 'Perfectly matched — you lit the whole board together.')
                  : turn === 'computer'
                    ? (isZh ? '白子落下前，棋盘暂时锁定。' : 'The board waits while the white stone moves.')
                    : (isZh ? '轻点交叉点落下黑子。' : 'Tap an intersection to place a black stone.')}</p>
          </div>

          <div className="gomoku-difficulty">
            <span>{isZh ? '对手状态' : 'OPPONENT LEVEL'}</span>
            <div role="group" aria-label={isZh ? '选择难度' : 'Choose difficulty'}>
              {(Object.keys(difficultyText) as Difficulty[]).map((item) => (
                <button
                  type="button"
                  key={item}
                  className={difficulty === item ? 'active' : ''}
                  aria-pressed={difficulty === item}
                  onClick={() => startNewGame(item)}
                >
                  <i aria-hidden="true" />{difficultyText[item][lang]}
                </button>
              ))}
            </div>
            <small>{isZh ? '切换难度会开启新棋局' : 'Changing level starts a new round'}</small>
          </div>

          <div className="gomoku-actions">
            <button type="button" className="gomoku-primary" onClick={() => startNewGame()}>
              <span aria-hidden="true">↻</span>{result ? (isZh ? '再来一局' : 'Play again') : (isZh ? '重新开局' : 'New round')}
            </button>
            <button type="button" onClick={undo} disabled={turn === 'computer' || moves.length === 0}>
              <span aria-hidden="true">↶</span>{isZh ? '悔一回合' : 'Undo turn'}
            </button>
          </div>

          <div className="gomoku-rule-note">
            <span aria-hidden="true">05</span>
            <p>{isZh ? '黑棋先手 · 五子相连 · 不设禁手' : 'Black moves first · Five in a row · No forbidden moves'}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
