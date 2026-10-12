import { describe, expect, it } from 'vitest';
import { advanceBomber, bomberBlastCells, bomberIndex as at, bomberNeighbor, BOMBER_BONUS_LIMIT, BOMBER_COLS, BOMBER_STAGE_ROSTERS, bomberPlayerInDanger, BOMBER_FIRE, BOMBER_FUSE, BOMBER_LEVELS, BOMBER_ROWS, BOMBER_STAGES, BOMBER_STAGE_POWERS, BOMBER_START, continueBomberRun, createBomberState, moveBomberPlayer, nextBomberStage, plantBomberBomb, retryBomberStage, triggerBomberRemote, type BomberEnemyKind, type BomberPower, type BomberState } from '../games/bomberEngine';
import { bomberCameraX, bomberTimeLeft, BOMBER_WIDTH } from '../games/bomberArtwork';
const arena = () => {
  const state = createBomberState('normal', 123);
  state.terrain = state.terrain.map((cell) => cell === 'crate' ? 'floor' : cell);
  state.enemies = []; state.hiddenPowers = {}; state.invulnerableUntil = 0;
  return state;
};
const putPlayer = (state: BomberState, index: number) => { state.player.at = index; state.player.from = index; state.moveReadyAt = state.elapsed; };
const monster = (state: BomberState, index: number, kind: BomberEnemyKind = 'balloon', nextMove = 99999) => ({ id: ++state.enemySerial, at: index, from: index, movedAt: state.elapsed, direction: 'left' as const, kind, nextMove, invulnerableUntil: 0 });
const bomb = (index: number, id = 1, explodeAt = 40, range = 2) => ({ id, at: index, range, explodeAt, remote: false });
const clearStage = (state: BomberState) => { state.enemies = []; state.fire = {}; state.bombs = []; state.terrain[state.exit] = 'floor'; putPlayer(state, state.exit); advanceBomber(state, 1); };

describe('FC 风格炸弹人', () => {
  it('31×13 卷轴迷宫，初始一弹一火，每关一件道具与随机暗门', () => {
    const state = createBomberState('normal', 123);
    expect(state).toEqual(createBomberState('normal', 123));
    expect(state.terrain).toHaveLength(403);
    expect([state.range, state.capacity]).toEqual([1, 1]);
    expect(state.enemies).toHaveLength(6);
    for (const index of [at(1, 1), at(2, 1), at(1, 2), at(1, 3)]) expect(state.terrain[index]).toBe('floor');
    expect(state.terrain[at(2, 2)]).toBe('stone');
    expect(state.terrain[state.exit]).toBe('crate');
    expect(state.hiddenPowers).toEqual({ [at(3, 1)]: 'range' });
    expect(state.exit).not.toBe(state.powerAt);
    expect(state.enemies.every((enemy) => state.terrain[enemy.at] === 'floor' && enemy.at !== BOMBER_START)).toBe(true);
  });
  it('三档难度：经典六敌三命，高难八敌两命', () => {
    for (const difficulty of ['easy', 'normal', 'hard'] as const) {
      const state = createBomberState(difficulty);
      expect(state.lives).toBe(BOMBER_LEVELS[difficulty].lives);
      expect(state.enemies.length).toBe(difficulty === 'hard' ? 8 : 6);
      expect(BOMBER_LEVELS[difficulty].limit).toBe(Math.round(400 * 64 / 60 * 1000));
      expect(bomberTimeLeft(state)).toBe(400);
    }
  });
  it('邻格不跨行越界，石墙、软砖与步距限制生效', () => {
    expect(bomberNeighbor(30, 'right')).toBeNull(); expect(bomberNeighbor(0, 'up')).toBeNull();
    const state = createBomberState('normal');
    expect(moveBomberPlayer(state, 'up')).toBe(false);
    expect(moveBomberPlayer(state, 'right')).toBe(true);
    expect(moveBomberPlayer(state, 'right')).toBe(false);
    advanceBomber(state, state.speed);
    expect(moveBomberPlayer(state, 'down')).toBe(false);
    expect(moveBomberPlayer(state, 'right')).toBe(false);
  });
  it('容量与同格限制，能离开脚下炸弹但不能走回来', () => {
    const state = arena(); expect(plantBomberBomb(state)).toBe(true); state.capacity = 2;
    expect(plantBomberBomb(state)).toBe(false); expect(moveBomberPlayer(state, 'right')).toBe(true);
    advanceBomber(state, state.speed); expect(moveBomberPlayer(state, 'left')).toBe(false);
    expect(plantBomberBomb(state)).toBe(true); putPlayer(state, at(3, 1)); expect(plantBomberBomb(state)).toBe(false);
  });
  it('引线约 2.67 秒，爆风 560 毫秒', () => {
    const state = arena(); putPlayer(state, at(1, 3)); state.bombs = [bomb(at(2, 1), 1, BOMBER_FUSE)];
    advanceBomber(state, BOMBER_FUSE - 1); expect(state.bombs).toHaveLength(1);
    advanceBomber(state, 1); expect(state.bombs).toHaveLength(0); expect(state.fire[at(2, 1)]).toBe(BOMBER_FUSE + BOMBER_FIRE);
    advanceBomber(state, BOMBER_FIRE); expect(state.fire).toEqual({});
  });
  it('十字爆风遇石墙与第一块软砖停止', () => {
    const state = arena(); state.terrain[at(4, 1)] = 'crate';
    const cells = bomberBlastCells(state, at(2, 1), 8);
    expect(cells).toEqual(expect.arrayContaining([at(1, 1), at(2, 1), at(3, 1), at(4, 1)]));
    expect(cells).not.toContain(at(5, 1)); expect(cells).not.toContain(at(2, 2)); expect(cells).not.toContain(at(0, 1));
  });
  it('连锁提前引爆遥控弹，远处炸弹保留', () => {
    const state = arena(); putPlayer(state, at(1, 5));
    state.bombs = [bomb(at(1, 1), 1, 40, 3), { ...bomb(at(3, 1), 2, Infinity, 3), remote: true }, bomb(at(29, 11), 3, 2000)];
    advanceBomber(state, 40); expect(state.bombs.map((item) => item.id)).toEqual([3]);
    expect(state.fire[at(6, 1)]).toBeGreaterThan(state.elapsed); expect(state.events.filter((event) => event === 'blast')).toHaveLength(1);
  });
  it('同一轮连锁不会穿透刚炸开的砖', () => {
    const state = arena(); putPlayer(state, at(1, 5)); state.terrain[at(4, 1)] = 'crate';
    state.bombs = [bomb(at(1, 1), 1, 40, 5), bomb(at(3, 1), 2, 2000, 5)];
    advanceBomber(state, 40); expect(state.terrain[at(4, 1)]).toBe('floor'); expect(state.fire[at(5, 1)]).toBeUndefined(); expect(state.score).toBe(0);
  });
  it('新露出的道具不被本轮爆炸烧毁，后续被炸会放出援兵', () => {
    const state = arena(); putPlayer(state, at(1, 5)); state.terrain[at(4, 1)] = 'crate'; state.hiddenPowers[at(4, 1)] = 'remote';
    state.bombs = [bomb(at(2, 1))]; advanceBomber(state, 40);
    expect(state.powers[at(4, 1)]).toBe('remote'); expect(state.enemies).toHaveLength(0);
    advanceBomber(state, BOMBER_FIRE); state.bombs = [bomb(at(3, 1), 2, state.elapsed + 40)]; advanceBomber(state, 40);
    expect(state.powers[at(4, 1)]).toBeUndefined(); expect(state.enemies).toHaveLength(4); expect(state.events).toContain('warning');
  });
  it.each(['range', 'capacity', 'speed', 'remote', 'wallPass', 'bombPass', 'firePass', 'invincible'] as BomberPower[])('拾取 %s 生效且不重复计分', (power) => {
    const state = arena(); state.powers[at(2, 1)] = power; moveBomberPlayer(state, 'right');
    expect(state.score).toBe(1000); expect(state.stagePowerCollected).toBe(true); expect(state.powers[at(2, 1)]).toBeUndefined();
    if (power === 'range') expect(state.range).toBe(2);
    else if (power === 'capacity') expect(state.capacity).toBe(2);
    else if (power === 'speed') expect(state.speed).toBe(135);
    else if (power === 'invincible') expect(state.invincibleUntil).toBe(34000);
    else expect(state[power]).toBe(true);
    advanceBomber(state, 40); expect(state.score).toBe(1000);
  });
  it('火力、容量与速度都有上限', () => {
    const state = arena(); state.range = 5; state.capacity = 10; state.speed = 100;
    for (const power of ['range', 'capacity', 'speed'] as BomberPower[]) { putPlayer(state, BOMBER_START); state.powers[at(2, 1)] = power; moveBomberPlayer(state, 'right'); }
    expect([state.range, state.capacity, state.speed]).toEqual([5, 10, 100]);
  });
  it('遥控弹不随计时爆炸，X 引爆最早一颗，普通炸弹照常计时', () => {
    const state = arena(); state.remote = true; state.capacity = 3; plantBomberBomb(state);
    putPlayer(state, at(3, 1)); plantBomberBomb(state); putPlayer(state, at(1, 5));
    advanceBomber(state, 6000); expect(state.bombs).toHaveLength(2);
    expect(triggerBomberRemote(state)).toBe(true); advanceBomber(state, 1);
    expect(state.bombs).toHaveLength(1); expect(state.bombs[0].at).toBe(at(3, 1));
    state.remote = false; expect(triggerBomberRemote(state)).toBe(false);
    plantBomberBomb(state); advanceBomber(state, BOMBER_FUSE);
    expect(state.status).toBe('retry'); expect(state.bombs).toHaveLength(1);
  });
  it('穿砖不能穿石墙，砖内不能放弹，穿弹可通过炸弹', () => {
    const state = arena(); state.wallPass = true; state.terrain[at(2, 1)] = 'crate';
    expect(moveBomberPlayer(state, 'right')).toBe(true); expect(plantBomberBomb(state)).toBe(false);
    advanceBomber(state, state.speed); expect(moveBomberPlayer(state, 'down')).toBe(false);
    state.terrain[at(2, 1)] = 'floor'; plantBomberBomb(state); advanceBomber(state, state.speed); moveBomberPlayer(state, 'left'); advanceBomber(state, state.speed);
    expect(moveBomberPlayer(state, 'right')).toBe(false); state.bombPass = true; expect(moveBomberPlayer(state, 'right')).toBe(true);
  });
  it('防火衣抵挡爆风但不抵挡怪物；无敌星同时抵挡两者且到期失效', () => {
    const state = arena(); state.firePass = true; state.fire[BOMBER_START] = 9999; advanceBomber(state, 40);
    expect(state.lives).toBe(3); state.enemies = [monster(state, BOMBER_START)]; state.fire = {}; state.invincibleUntil = state.elapsed + 100;
    advanceBomber(state, 80); expect(state.status).toBe('playing'); advanceBomber(state, 20); expect(state.status).toBe('retry'); expect(state.lives).toBe(2);
  });
  it('死亡冻结本关，重试保留基础升级、失去特殊能力并重置地图和计时', () => {
    const state = createBomberState('normal', 123), terrain = [...state.terrain];
    state.range = 4; state.capacity = 3; state.speed = 100; state.remote = true; state.wallPass = true; state.bombPass = true; state.firePass = true;
    state.elapsed = 2000; state.firePass = false; state.fire[BOMBER_START] = 9999; advanceBomber(state, 40);
    expect(state.status).toBe('retry'); expect(state.lives).toBe(2);
    const elapsed = state.elapsed; advanceBomber(state, 5000); expect(state.elapsed).toBe(elapsed);
    expect(moveBomberPlayer(state, 'right')).toBe(false); expect(plantBomberBomb(state)).toBe(false);
    expect(retryBomberStage(state)).toBe(true); expect(state.terrain).toEqual(terrain);
    expect([state.range, state.capacity, state.speed]).toEqual([4, 3, 100]);
    expect([state.remote, state.wallPass, state.bombPass, state.firePass]).toEqual([false, false, false, false]);
    expect(state.stageStartedAt).toBe(elapsed); expect(state.player.at).toBe(BOMBER_START); expect(state.enemies).toHaveLength(6);
  });
  it('本关基础道具重试不重复刷，特殊道具死亡后可重新找到', () => {
    const state = createBomberState('normal', 123); state.stagePowerCollected = true; state.elapsed = 2000; state.fire[BOMBER_START] = 9999;
    advanceBomber(state, 40); retryBomberStage(state); expect(state.hiddenPowers).toEqual({});
    state.stage = 3; state.status = 'clear'; state.stage = 2; nextBomberStage(state);
    expect(state.hiddenPowers[state.powerAt]).toBe('remote');
    state.stagePowerCollected = true; state.remote = true; state.elapsed += 2000; state.fire[BOMBER_START] = state.elapsed + 1000;
    advanceBomber(state, 40); retryBomberStage(state); expect(state.hiddenPowers[state.powerAt]).toBe('remote');
  });
  it('生命耗尽只失败一次，可续关保留基础装备，累计时长重新开始', () => {
    const state = arena(); state.lives = 1; state.range = 3; state.fire[BOMBER_START] = 9999; advanceBomber(state, 40);
    const elapsed = state.elapsed; advanceBomber(state, 9999); expect(state.elapsed).toBe(elapsed); expect(state.events.filter((event) => event === 'lose')).toHaveLength(1);
    expect(continueBomberRun(state)).toBe(true); expect(state.status).toBe('playing'); expect(state.range).toBe(3); expect(state.lives).toBe(3); expect(state.elapsed).toBe(0);
    expect(continueBomberRun(state)).toBe(false);
  });
  it('炸到已露出的出口放出四名援兵，新露出的出口本轮不处罚', () => {
    const state = arena(); state.exit = at(5, 1); state.terrain[state.exit] = 'crate'; putPlayer(state, at(1, 5));
    state.bombs = [bomb(at(3, 1))]; advanceBomber(state, 40); expect(state.enemies).toHaveLength(0);
    advanceBomber(state, BOMBER_FIRE); state.bombs = [bomb(at(3, 1), 2, state.elapsed + 40)]; advanceBomber(state, 40);
    expect(state.enemies).toHaveLength(4); expect(state.enemies.every((item) => item.invulnerableUntil > state.elapsed)).toBe(true);
    clearStage(state); expect(state.status).toBe('clear');
  });
  it('出口要求清敌，火力和装备跨关保留', () => {
    const state = arena(); state.enemies = [monster(state, at(29, 11))]; putPlayer(state, state.exit);
    advanceBomber(state, 40); expect(state.status).toBe('playing'); expect(nextBomberStage(state)).toBe(false);
    state.range = 4; state.capacity = 3; state.remote = true; clearStage(state); expect(state.status).toBe('clear');
    const elapsed = state.elapsed; advanceBomber(state, 9999); expect(state.elapsed).toBe(elapsed);
    expect(nextBomberStage(state)).toBe(true); expect([state.stage, state.range, state.capacity, state.remote]).toEqual([2, 4, 3, true]);
  });
  it('时间到零触发一次旋风追击，不直接判负，不无限刷兵', () => {
    const state = arena(); state.elapsed = BOMBER_LEVELS.normal.limit - 1; state.invincibleUntil = state.elapsed + 9999;
    advanceBomber(state, 1); expect(state.overtime).toBe(true); expect(state.status).toBe('playing'); expect(state.enemies).toHaveLength(10);
    advanceBomber(state, 40); expect(state.enemies).toHaveLength(10); expect(state.events.filter((event) => event === 'warning')).toHaveLength(1);
  });
  it('旧时限不触发追兵，重试和下一关恢复完整延长时间', () => {
    const state = arena();
    advanceBomber(state, Math.round(200 * 64 / 60 * 1000));
    expect(state.overtime).toBe(false);
    expect(state.enemies).toHaveLength(0);
    expect(bomberTimeLeft(state)).toBe(200);
    state.status = 'retry';
    retryBomberStage(state);
    expect(bomberTimeLeft(state)).toBe(400);
    clearStage(state);
    nextBomberStage(state);
    expect(bomberTimeLeft(state)).toBe(400);
  });
  it('每五关进入 60 刻奖励关，免疫怪物和爆风，结束后去下一关', () => {
    const state = arena(); state.stage = 5; clearStage(state); nextBomberStage(state);
    expect(state.bonus).toBe(true); expect(state.stage).toBe(5); expect(state.hiddenPowers).toEqual({}); expect(state.exit).toBe(-1);
    state.fire[BOMBER_START] = 9999; state.enemies = [monster(state, BOMBER_START)]; advanceBomber(state, 2000);
    expect(state.lives).toBe(4); expect(state.status).toBe('playing');
    advanceBomber(state, 30000);
    expect(state.status).toBe('playing'); // 原来的 32 秒时限仍可继续玩。
    expect(bomberTimeLeft(state)).toBe(30);
    advanceBomber(state, BOMBER_BONUS_LIMIT - 32000 - 1);
    expect(state.status).toBe('playing');
    advanceBomber(state, 1); expect(state.status).toBe('clear');
    nextBomberStage(state); expect(state.bonus).toBe(false); expect(state.stage).toBe(6);
  });
  it('奖励关怪物炸完继续补充，积分可累计', () => {
    const state = arena(); state.bonus = true; state.enemies = [monster(state, at(9, 1))]; state.fire[at(9, 1)] = 9999;
    advanceBomber(state, 40); expect(state.score).toBe(100); expect(state.enemies).toHaveLength(10);
  });
  it('怪物不预知炸弹引线，胶冻怪能穿砖', () => {
    const state = arena(); putPlayer(state, at(1, 5));
    state.enemies = [monster(state, at(3, 1), 'balloon', 40)]; state.bombs = [bomb(at(1, 1), 1, 500, 4)]; advanceBomber(state, 40); expect(state.enemies[0].at).toBe(at(2, 1));
    state.enemies = [monster(state, at(3, 1), 'hunter', state.elapsed + 40)]; state.terrain[at(3, 2)] = 'crate'; state.terrain[at(4, 1)] = 'crate'; advanceBomber(state, 40); expect(state.enemies[0].at).toBe(at(2, 1));
    state.bombs = []; state.terrain[at(2, 1)] = 'crate'; state.enemies = [monster(state, at(3, 1), 'ghost', state.elapsed + 40)]; advanceBomber(state, 40); expect(state.terrain[state.enemies[0].at]).toBe('crate');
  });
  it('第 50 关胜利，五十关各有一件原版道具，整体可通', () => {
    const state = createBomberState('hard', 56);
    for (let stage = 1; stage <= BOMBER_STAGES; stage++) {
      expect(state.stage).toBe(stage); expect(Object.values(state.hiddenPowers)).toEqual([BOMBER_STAGE_POWERS[stage - 1]]);
      const seen = new Set([BOMBER_START]), queue = [BOMBER_START];
      for (let head = 0; head < queue.length; head++) for (const direction of ['up', 'down', 'left', 'right'] as const) {
        const next = bomberNeighbor(queue[head], direction); if (next !== null && state.terrain[next] !== 'stone' && !seen.has(next)) { seen.add(next); queue.push(next); }
      }
      expect(seen.has(state.exit)).toBe(true); expect(seen.has(state.powerAt)).toBe(true); expect(state.enemies.every((item) => seen.has(item.at))).toBe(true);
      clearStage(state);
      if (stage < BOMBER_STAGES) { nextBomberStage(state); if (state.bonus) { advanceBomber(state, BOMBER_BONUS_LIMIT); nextBomberStage(state); } }
    }
    expect(state.status).toBe('win'); expect(nextBomberStage(state)).toBe(false);
  });
  it('原版关表、升级上限、奖励关怪物进阶与过关加命', () => {
    expect(BOMBER_STAGE_POWERS).toHaveLength(50);
    expect(BOMBER_STAGE_POWERS.slice(0, 10)).toEqual(['range','capacity','remote','speed','capacity','capacity','range','remote','bombPass','wallPass']);
    expect(BOMBER_STAGE_ROSTERS[49]).toEqual(['ghost','ghost','wraith','tiger','tiger','tiger','tiger','tiger','spinner','spinner']);
    const state = arena(); state.stage = 10; clearStage(state); expect(state.lives).toBe(4);
    nextBomberStage(state); expect(state.enemies).toHaveLength(10); expect(state.enemies.every(e => e.kind === 'scout')).toBe(true);
  });
  it('超时替换原有怪物，援兵按当前关原版道具类型配置', () => {
    const state = arena(); state.enemies = [monster(state, at(29, 11), 'balloon')];
    state.elapsed = BOMBER_LEVELS.normal.limit - 1; advanceBomber(state, 1);
    expect(state.enemies).toHaveLength(10); expect(state.enemies.every(e => e.kind === 'spinner')).toBe(true);
    const alarm = arena(); alarm.exit = at(5,1); putPlayer(alarm, at(1,5)); alarm.bombs = [bomb(at(3,1))];
    advanceBomber(alarm,40); expect(alarm.enemies.every(e => e.kind === 'scout')).toBe(true);
  });
  it('碰撞跟随显示中的角色位置，进入目标格时不会提前受伤', () => {
    const state = arena(); state.enemies = [monster(state, at(2,1))];
    expect(moveBomberPlayer(state,'right')).toBe(true); expect(state.status).toBe('playing');
    advanceBomber(state,40); expect(state.status).toBe('playing');
    advanceBomber(state,40); expect(state.status).toBe('retry');
  });
  it('怪物移动按画面位置接触，不因逻辑目标格提前杀人', () => {
    const state = arena(); state.enemies = [monster(state, at(2,1),'balloon',40)];
    advanceBomber(state,40); expect(state.enemies[0].at).toBe(BOMBER_START); expect(state.status).toBe('playing');
    advanceBomber(state,40); expect(state.status).toBe('playing'); advanceBomber(state,40); expect(state.status).toBe('retry');
  });
  it('火焰边缘留有余量，最后 120ms 淡出尾光完全无伤害', () => {
    const state = arena(); putPlayer(state,at(2,1)); state.player.from = BOMBER_START; state.player.movedAt = 0;
    state.elapsed = 40; state.fire[at(2,1)] = 1000; expect(bomberPlayerInDanger(state)).toBe(false);
    state.elapsed = 80; expect(bomberPlayerInDanger(state)).toBe(true);
    state.elapsed = 880; expect(bomberPlayerInDanger(state)).toBe(false); advanceBomber(state,200); expect(state.status).toBe('playing');
  });
  it('烧死、保护中的怪物与已经消失的火焰不留下幽灵碰撞', () => {
    const state = arena(); state.enemies = [{...monster(state,BOMBER_START),invulnerableUntil:500}];
    advanceBomber(state,40); expect(state.status).toBe('playing');
    state.enemies[0].invulnerableUntil = 0; state.fire[BOMBER_START] = state.elapsed + 1000;
    state.firePass = true; advanceBomber(state,40); expect(state.enemies).toHaveLength(0); expect(state.status).toBe('playing');
    state.firePass = false; state.fire[BOMBER_START] = state.elapsed; advanceBomber(state,40); expect(state.status).toBe('playing');
  });
  it('镜头跟随并限制在世界边缘，长地图保持画面内坐标', () => {
    expect(bomberCameraX(90)).toBe(0); expect(bomberCameraX(1000)).toBe(1000 - BOMBER_WIDTH / 2);
    expect(bomberCameraX(9999)).toBe(BOMBER_COLS * 60 - BOMBER_WIDTH);
    expect(BOMBER_ROWS).toBe(13);
  });
});
