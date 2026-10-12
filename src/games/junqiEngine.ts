export type ArmySide = 'red' | 'blue';
export type ArmyDifficulty = 'easy' | 'normal' | 'hard';
export type ArmyKind = 'commander' | 'army' | 'division' | 'brigade' | 'regiment' | 'battalion' | 'company' | 'platoon' | 'engineer' | 'bomb' | 'mine' | 'flag';
export interface ArmyPiece { id: string; side: ArmySide; kind: ArmyKind }
export type ArmyBoard = Array<ArmyPiece | null>;
export interface ArmyMove { from: number; to: number }
export interface ArmyState {
  board: ArmyBoard; turn: ArmySide; moves: number; quiet: number;
  winner: ArmySide | 'draw' | null; last: ArmyMove | null;
  removed: ArmyPiece[]; positions: string[];
}
export const ARMY_PIECES: Record<ArmyKind, { zh: string; en: string; short: string; rank: number; count: number; value: number }> = {
  commander: { zh: '司令', en: 'Commander', short: 'CMD', rank: 9, count: 1, value: 100 },
  army: { zh: '军长', en: 'General', short: 'GEN', rank: 8, count: 1, value: 85 },
  division: { zh: '师长', en: 'Division', short: 'DIV', rank: 7, count: 2, value: 70 },
  brigade: { zh: '旅长', en: 'Brigade', short: 'BRG', rank: 6, count: 2, value: 58 },
  regiment: { zh: '团长', en: 'Regiment', short: 'REG', rank: 5, count: 2, value: 47 },
  battalion: { zh: '营长', en: 'Battalion', short: 'BTN', rank: 4, count: 2, value: 38 },
  company: { zh: '连长', en: 'Company', short: 'CO', rank: 3, count: 3, value: 30 },
  platoon: { zh: '排长', en: 'Platoon', short: 'PLT', rank: 2, count: 3, value: 22 },
  engineer: { zh: '工兵', en: 'Engineer', short: 'ENG', rank: 1, count: 3, value: 42 },
  bomb: { zh: '炸弹', en: 'Bomb', short: 'BOMB', rank: 0, count: 2, value: 55 },
  mine: { zh: '地雷', en: 'Mine', short: 'MINE', rank: 0, count: 3, value: 28 },
  flag: { zh: '军旗', en: 'Flag', short: 'FLAG', rank: 0, count: 1, value: 10_000 },
};
export const ARMY_CAMPS = new Set([11, 13, 17, 21, 23, 36, 38, 42, 46, 48]);
export const ARMY_HQ = new Set([1, 3, 56, 58]);
export const otherArmy = (side: ArmySide): ArmySide => side === 'red' ? 'blue' : 'red';
export const armyX = (index: number) => index % 5;
export const armyY = (index: number) => Math.floor(index / 5);
export const armyPoint = (index: number) => ({ x: 60 + armyX(index) * 90, y: 40 + armyY(index) * 54 + (armyY(index) >= 6 ? 42 : 0) });

export function isArmyRailEdge(a: number, b: number) {
  const x = armyX(a), y = armyY(a), nx = armyX(b), ny = armyY(b);
  if (y === ny && Math.abs(x - nx) === 1) return [1, 5, 6, 10].includes(y);
  if (x !== nx || Math.abs(y - ny) !== 1) return false;
  if ((x === 0 || x === 4) && Math.min(y, ny) >= 1 && Math.max(y, ny) <= 10) return true;
  return x === 2 && Math.min(y, ny) === 5;
}

export function armyRoadNeighbors(index: number): number[] {
  const x = armyX(index), y = armyY(index);
  const result: number[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || nx >= 5 || ny < 0 || ny >= 12) continue;
    const next = ny * 5 + nx;
    if (Math.min(y, ny) === 5 && Math.max(y, ny) === 6 && (dx !== 0 || ![0, 2, 4].includes(x))) continue;
    if (dx && dy && !ARMY_CAMPS.has(index) && !ARMY_CAMPS.has(next)) continue;
    result.push(next);
  }
  return result;
}

const DEFAULT_RED: ArmyKind[] = [
  'platoon', 'company', 'engineer', 'company', 'platoon',
  'battalion', 'engineer', 'battalion',
  'regiment', 'bomb', 'brigade', 'regiment',
  'division', 'commander', 'division',
  'mine', 'army', 'bomb', 'brigade', 'mine',
  'platoon', 'flag', 'engineer', 'mine', 'company',
];
export function createArmyBoard(): ArmyBoard {
  const board: ArmyBoard = Array(60).fill(null);
  const slots = Array.from({ length: 30 }, (_, i) => i + 30).filter((i) => !ARMY_CAMPS.has(i));
  slots.forEach((index, order) => {
    board[index] = { id: `red-${order}`, side: 'red', kind: DEFAULT_RED[order] };
    board[59 - index] = { id: `blue-${order}`, side: 'blue', kind: DEFAULT_RED[order] };
  });
  return board;
}

export function validArmyPlacement(piece: ArmyPiece, index: number) {
  const y = armyY(index);
  if (index < 0 || index >= 60 || ARMY_CAMPS.has(index) || (piece.side === 'red' ? y < 6 : y > 5)) return false;
  if (piece.kind === 'flag') return ARMY_HQ.has(index);
  if (piece.kind === 'mine') return piece.side === 'red' ? y >= 10 : y <= 1;
  if (piece.kind === 'bomb') return piece.side === 'red' ? y !== 6 : y !== 5;
  return true;
}
export function swapArmyPlacement(board: ArmyBoard, from: number, to: number): ArmyBoard | null {
  const a = board[from], b = board[to];
  if (!a || !b || a.side !== b.side || !validArmyPlacement(a, to) || !validArmyPlacement(b, from)) return null;
  const next = [...board]; next[from] = b; next[to] = a;
  return next;
}

export function shuffleArmySide(board: ArmyBoard, side: ArmySide, random = Math.random): ArmyBoard {
  const next = [...board];
  const pieces = board.filter((piece): piece is ArmyPiece => !!piece && piece.side === side);
  const slots = Array.from({ length: 60 }, (_, i) => i).filter((i) => !ARMY_CAMPS.has(i) && (side === 'red' ? i >= 30 : i < 30));
  slots.forEach((i) => { next[i] = null; });
  // Place restrictive pieces first, then fill the remaining stations.
  const ordered = [...pieces].sort((a, b) => {
    const priority = (kind: ArmyKind) => kind === 'flag' ? 0 : kind === 'mine' ? 1 : kind === 'bomb' ? 2 : 3;
    return priority(a.kind) - priority(b.kind);
  });
  for (const piece of ordered) {
    const available = slots.filter((i) => !next[i] && validArmyPlacement(piece, i));
    next[available[Math.min(available.length - 1, Math.floor(random() * available.length))]] = piece;
  }
  return next;
}

export function armyLegalMoves(board: ArmyBoard, from: number): number[] {
  const piece = board[from];
  if (!piece || piece.kind === 'flag' || piece.kind === 'mine' || ARMY_HQ.has(from)) return [];
  const destinations = new Set<number>();
  const add = (to: number) => {
    const target = board[to];
    if (!target || (target.side !== piece.side && !ARMY_CAMPS.has(to))) destinations.add(to);
    return !target;
  };
  armyRoadNeighbors(from).forEach(add);
  if (piece.kind === 'engineer') {
    const visited = new Set([from]), queue = [from];
    for (let head = 0; head < queue.length; head++) {
      const here = queue[head];
      for (const next of armyRoadNeighbors(here)) {
        if (!isArmyRailEdge(here, next) || visited.has(next)) continue;
        visited.add(next);
        if (add(next)) queue.push(next);
      }
    }
  } else {
    for (const direction of [-5, 5, -1, 1]) {
      let here = from;
      while (true) {
        const next = here + direction;
        if (next < 0 || next >= 60 || !isArmyRailEdge(here, next)) break;
        if (!add(next)) break;
        here = next;
      }
    }
  }
  destinations.delete(from);
  return [...destinations];
}

export function armyBattle(attacker: ArmyKind, defender: ArmyKind): 'attacker' | 'defender' | 'both' {
  if (defender === 'flag') return attacker === 'bomb' ? 'both' : 'attacker';
  if (attacker === 'bomb' || defender === 'bomb') return 'both';
  if (defender === 'mine') return attacker === 'engineer' ? 'attacker' : 'defender';
  const delta = ARMY_PIECES[attacker].rank - ARMY_PIECES[defender].rank;
  return delta > 0 ? 'attacker' : delta < 0 ? 'defender' : 'both';
}

export function allArmyMoves(board: ArmyBoard, side: ArmySide): ArmyMove[] {
  return board.flatMap((piece, from) => piece?.side === side ? armyLegalMoves(board, from).map((to) => ({ from, to })) : []);
}
function positionKey(board: ArmyBoard, turn: ArmySide) { return `${turn}|${board.map((p) => p ? `${p.side[0]}:${p.kind}` : '').join(',')}`; }
export function createArmyState(board = createArmyBoard()): ArmyState {
  return { board, turn: 'red', moves: 0, quiet: 0, winner: null, last: null, removed: [], positions: [positionKey(board, 'red')] };
}
export function playArmyMove(state: ArmyState, move: ArmyMove): ArmyState | null {
  const attacker = state.board[move.from], defender = state.board[move.to];
  if (state.winner || !attacker || attacker.side !== state.turn || !armyLegalMoves(state.board, move.from).includes(move.to)) return null;
  const board = [...state.board], removed = [...state.removed];
  board[move.from] = null;
  let winner: ArmyState['winner'] = null;
  if (!defender) board[move.to] = attacker;
  else {
    const result = armyBattle(attacker.kind, defender.kind);
    if (result !== 'attacker') removed.push(attacker);
    if (result !== 'defender') removed.push(defender);
    board[move.to] = result === 'attacker' ? attacker : result === 'defender' ? defender : null;
    if (defender.kind === 'flag') winner = attacker.side;
  }
  const turn = otherArmy(state.turn), quiet = defender ? 0 : state.quiet + 1;
  const key = positionKey(board, turn), positions = [...state.positions, key];
  if (!winner && allArmyMoves(board, turn).length === 0) winner = state.turn;
  if (!winner && (quiet >= 120 || positions.filter((value) => value === key).length >= 3)) winner = 'draw';
  return { board, turn, moves: state.moves + 1, quiet, winner, last: move, removed, positions };
}

function evaluateArmy(board: ArmyBoard, side: ArmySide) {
  let value = 0;
  for (let index = 0; index < board.length; index++) {
    const piece = board[index];
    if (!piece) continue;
    const own = piece.side === side, kind = ARMY_PIECES[piece.kind];
    const advancing = piece.side === 'red' ? 11 - armyY(index) : armyY(index);
    const mobile = piece.kind !== 'flag' && piece.kind !== 'mine';
    const score = kind.value + (mobile ? advancing * 1.6 : 0) + (ARMY_CAMPS.has(index) ? 7 : 0) - (mobile && ARMY_HQ.has(index) ? 12 : 0);
    value += own ? score : -score;
  }
  return value;
}
export function chooseArmyMove(state: ArmyState, difficulty: ArmyDifficulty, random = Math.random): ArmyMove | null {
  const moves = allArmyMoves(state.board, state.turn), side = state.turn;
  if (!moves.length || state.winner) return null;
  const scored = moves.map((move) => {
    const next = playArmyMove(state, move)!;
    let score = next.winner === side ? 100_000 : next.winner === 'draw' ? 0 : evaluateArmy(next.board, side);
    if (difficulty === 'hard' && !next.winner) {
      // Limit only the opponent's candidate replies, prioritizing captures.
      const replies = allArmyMoves(next.board, next.turn).sort((a, b) => (next.board[b.to] ? 1 : 0) - (next.board[a.to] ? 1 : 0)).slice(0, 40);
      score = Math.min(...replies.map((reply) => {
        const answer = playArmyMove(next, reply)!;
        return answer.winner === next.turn ? -100_000 : answer.winner === 'draw' ? 0 : evaluateArmy(answer.board, side);
      }));
    }
    score += random() * (difficulty === 'easy' ? 100 : difficulty === 'normal' ? 4 : 1);
    return { move, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].move;
}
