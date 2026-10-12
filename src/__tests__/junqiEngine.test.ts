import { describe, expect, it } from 'vitest';
import { ARMY_CAMPS, ARMY_PIECES, allArmyMoves, armyBattle, armyLegalMoves, armyRoadNeighbors, chooseArmyMove, createArmyBoard, createArmyState, playArmyMove, shuffleArmySide, swapArmyPlacement, validArmyPlacement, type ArmyBoard, type ArmyDifficulty, type ArmyKind, type ArmyPiece, type ArmySide } from '../games/junqiEngine';

const piece = (kind: ArmyKind, side: ArmySide = 'red'): ArmyPiece => ({ kind, side, id: `${side}-${kind}` });
const emptyBoard = (): ArmyBoard => Array(60).fill(null);
const flaggedBoard = () => { const board = emptyBoard(); board[56] = piece('flag'); board[3] = piece('flag', 'blue'); return board; };

describe('星阵军棋规则', () => {
  it('棋盘两方各 25 枚，数量和初始布局合法，十座行营为空', () => {
    const board = createArmyBoard();
    expect(board).toHaveLength(60);
    for (const side of ['red', 'blue'] as const) {
      expect(board.filter((p) => p?.side === side)).toHaveLength(25);
      for (const [kind, meta] of Object.entries(ARMY_PIECES)) expect(board.filter((p) => p?.side === side && p.kind === kind)).toHaveLength(meta.count);
    }
    board.forEach((p, i) => { if (p) expect(validArmyPlacement(p, i)).toBe(true); });
    ARMY_CAMPS.forEach((index) => expect(board[index]).toBeNull());
  });

  it('换阵保持数量、阵营和布阵限制，双子交换拒绝非法布局', () => {
    let board = createArmyBoard();
    for (let i = 0; i < 20; i++) {
      board = shuffleArmySide(board, i % 2 ? 'blue' : 'red');
      expect(board.filter(Boolean)).toHaveLength(50);
      board.forEach((p, index) => { if (p) expect(validArmyPlacement(p, index)).toBe(true); });
    }
    board = createArmyBoard();
    expect(swapArmyPlacement(board, 56, 30)).toBeNull(); // Flag outside HQ
    expect(swapArmyPlacement(board, 50, 30)).toBeNull(); // Mine in front
    expect(swapArmyPlacement(board, 41, 30)).toBeNull(); // Bomb in front
    expect(swapArmyPlacement(board, 30, 29)).toBeNull(); // Opposing side
    expect(swapArmyPlacement(board, 30, 31)?.[30]?.kind).toBe('company');
  });

  it('公路只走一格，行营有斜线，山界只能经三个桥位跨越', () => {
    expect(armyRoadNeighbors(5)).toContain(11);
    expect(armyRoadNeighbors(0)).not.toContain(6);
    expect(armyRoadNeighbors(26)).not.toContain(31);
    expect(armyRoadNeighbors(25)).toContain(30);
    expect(armyRoadNeighbors(27)).toContain(32);
    expect(armyRoadNeighbors(29)).toContain(34);
    const board = emptyBoard(); board[12] = piece('commander');
    expect(armyLegalMoves(board, 12)).not.toContain(2);
    expect(armyLegalMoves(board, 12)).toContain(11);
  });

  it('普通棋子铁路直走，工兵可在畅通铁路转弯', () => {
    const board = emptyBoard(); board[5] = piece('commander');
    expect(armyLegalMoves(board, 5)).toContain(50);
    expect(armyLegalMoves(board, 5)).toContain(9);
    expect(armyLegalMoves(board, 5)).not.toContain(54);
    board[5] = piece('engineer');
    expect(armyLegalMoves(board, 5)).toContain(54);
    expect(armyLegalMoves(board, 5)).not.toContain(56);
  });

  it('铁路不能穿越棋子，友军不可吃，行营内敌子不可攻击', () => {
    const board = emptyBoard(); board[5] = piece('commander'); board[15] = piece('company');
    expect(armyLegalMoves(board, 5)).toContain(10);
    expect(armyLegalMoves(board, 5)).not.toContain(15);
    expect(armyLegalMoves(board, 5)).not.toContain(20);
    board[15] = piece('company', 'blue');
    expect(armyLegalMoves(board, 5)).toContain(15);
    expect(armyLegalMoves(board, 5)).not.toContain(20);
    board[11] = piece('company', 'blue');
    expect(armyLegalMoves(board, 5)).not.toContain(11);
    board[11] = null;
    expect(armyLegalMoves(board, 5)).toContain(11);
  });

  it('旗、雷、进入大本营的普通棋子都固定不动', () => {
    const board = emptyBoard(); board[56] = piece('commander'); board[50] = piece('mine'); board[3] = piece('flag', 'blue');
    expect(armyLegalMoves(board, 56)).toEqual([]);
    expect(armyLegalMoves(board, 50)).toEqual([]);
    expect(armyLegalMoves(board, 3)).toEqual([]);
  });

  it.each([
    ['commander', 'army', 'attacker'], ['platoon', 'division', 'defender'], ['regiment', 'regiment', 'both'],
    ['engineer', 'mine', 'attacker'], ['commander', 'mine', 'defender'], ['bomb', 'mine', 'both'],
    ['bomb', 'commander', 'both'], ['company', 'bomb', 'both'], ['engineer', 'flag', 'attacker'], ['bomb', 'flag', 'both'],
  ] as const)('交战 %s 对 %s：%s', (attacker, defender, result) => { expect(armyBattle(attacker, defender)).toBe(result); });

  it('夺旗立即获胜，炸弹夺旗也结算胜利且双方移除', () => {
    for (const kind of ['commander', 'bomb'] as const) {
      const board = flaggedBoard(); board[2] = piece(kind);
      const state = createArmyState(board), next = playArmyMove(state, { from: 2, to: 3 })!;
      expect(next.winner).toBe('red');
      expect(next.removed.some((p) => p.kind === 'flag')).toBe(true);
      expect(next.board[3]?.kind ?? null).toBe(kind === 'bomb' ? null : 'commander');
      expect(playArmyMove(next, { from: 3, to: 2 })).toBeNull();
      expect(state.board[2]?.kind).toBe(kind); // No mutation of undo snapshot
    }
  });

  it('非法移动不改变棋局；敌方无子可走时结束', () => {
    const board = flaggedBoard(); board[30] = piece('platoon'); board[0] = piece('mine', 'blue');
    const state = createArmyState(board);
    expect(playArmyMove(state, { from: 3, to: 2 })).toBeNull();
    expect(playArmyMove(state, { from: 30, to: 24 })).toBeNull();
    expect(playArmyMove(state, { from: 30, to: 35 })?.winner).toBe('red');
  });

  it('三次同局面同方行棋判和，120 步无交战也判和', () => {
    const board = flaggedBoard(); board[30] = piece('platoon'); board[29] = piece('platoon', 'blue');
    let state = createArmyState(board);
    for (let cycle = 0; cycle < 2; cycle++) for (const [from, to] of [[30, 35], [29, 24], [35, 30], [24, 29]]) state = playArmyMove(state, { from, to })!;
    expect(state.winner).toBe('draw');
    const quietState = { ...createArmyState(board), quiet: 119 };
    expect(playArmyMove(quietState, { from: 30, to: 35 })?.winner).toBe('draw');
  });

  it.each(['easy', 'normal', 'hard'] as ArmyDifficulty[])('%s 电脑只走合法棋，并优先完成直接夺旗', (difficulty) => {
    const initial = createArmyState();
    const action = chooseArmyMove(initial, difficulty, () => .5)!;
    expect(allArmyMoves(initial.board, 'red')).toContainEqual(action);
    const board = flaggedBoard(); board[2] = piece('commander'); board[29] = piece('platoon', 'blue');
    expect(chooseArmyMove(createArmyState(board), difficulty, () => .5)).toEqual({ from: 2, to: 3 });
  });
});
