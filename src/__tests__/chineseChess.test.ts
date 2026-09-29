import { describe, expect, it } from 'vitest';
import { createChineseChessBoard, isChineseChessCheck, legalChineseChessMoves } from '../games/ChineseChessGame';

describe('中国象棋规则', () => {
  it('初始局面双方都未被将军，红兵只能向前一步', () => {
    const board = createChineseChessBoard();
    expect(isChineseChessCheck(board, 'red')).toBe(false);
    expect(isChineseChessCheck(board, 'black')).toBe(false);

    const leftSoldierMoves = legalChineseChessMoves(board, 'red').filter((move) => move.from === 6 * 9);
    expect(leftSoldierMoves.map((move) => move.to)).toEqual([5 * 9]);
  });

  it('将帅在同一路无遮挡时双方都处于被将军状态', () => {
    const generalsOnly = createChineseChessBoard().map((piece) => piece?.kind === 'general' ? piece : null);
    expect(isChineseChessCheck(generalsOnly, 'red')).toBe(true);
    expect(isChineseChessCheck(generalsOnly, 'black')).toBe(true);
  });

  it('初始局面生成足够的合法走法且不会走出棋盘', () => {
    const moves = legalChineseChessMoves(createChineseChessBoard(), 'red');
    expect(moves.length).toBeGreaterThan(30);
    expect(moves.every((move) => move.to >= 0 && move.to < 90)).toBe(true);
  });
});
