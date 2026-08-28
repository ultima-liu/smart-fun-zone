import { describe, it, expect } from 'vitest';
import numberFarm from '../games/levels/numberFarm.json';
import memoryMatch from '../games/levels/memoryMatch.json';
import oddOneOut from '../games/levels/oddOneOut.json';
import applePick from '../games/levels/applePick.json';
import shapeCastle from '../games/levels/shapeCastle.json';
import pinyinFishing from '../games/levels/pinyinFishing.json';
import hanziPuzzle from '../games/levels/hanziPuzzle.json';
import englishZoo from '../games/levels/englishZoo.json';
import patternTrain from '../games/levels/patternTrain.json';
import trashSort from '../games/levels/trashSort.json';
import animalHunt from '../games/levels/animalHunt.json';
import trafficLight from '../games/levels/trafficLight.json';

const packs = [
  numberFarm,
  memoryMatch,
  oddOneOut,
  applePick,
  shapeCastle,
  pinyinFishing,
  hanziPuzzle,
  englishZoo,
  patternTrain,
  trashSort,
  animalHunt,
  trafficLight,
] as { gameId: string; levels: Record<string, unknown>[] }[];

describe('关卡包', () => {
  it('12 个游戏都有关卡包且 gameId 唯一', () => {
    const ids = packs.map((p) => p.gameId);
    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(12);
  });

  it('每个包至少 3 关，关卡编号连续从 1 开始，题量为正', () => {
    for (const p of packs) {
      expect(p.levels.length, `${p.gameId} 关卡数`).toBeGreaterThanOrEqual(3);
      p.levels.forEach((lv, i) => {
        expect(lv.level, `${p.gameId} 关卡编号`).toBe(i + 1);
        const qc = lv.questionCount;
        if (qc !== undefined) {
          expect(qc as number, `${p.gameId} 题量`).toBeGreaterThan(0);
        }
      });
    }
  });

  it('记忆翻牌卡片数为偶数（成对）', () => {
    for (const lv of memoryMatch.levels) {
      expect((lv.cols * lv.rows) % 2).toBe(0);
    }
  });

  it('火眼金睛异类数量不超过格子数', () => {
    for (const lv of oddOneOut.levels) {
      expect(lv.oddCount).toBeLessThan(lv.cols * lv.rows);
    }
  });
});
