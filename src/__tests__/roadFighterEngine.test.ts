import { describe, expect, it } from 'vitest';
import {
  advanceRoad,
  createRoadState,
  nextRoadCourse,
  roadAt,
  roadEntityX,
  ROAD_COURSES,
  type RoadEntity,
  type RoadKind,
  type RoadState,
} from '../games/roadFighterEngine';
const input = { steer: 0, throttle: 2 as const };
const emptyRoad = () => {
  const s = createRoadState();
  s.entities = [];
  return s;
};
function obstacle(s: RoadState, kind: RoadKind, lane = 0): RoadEntity {
  return {
    id: 1,
    kind,
    z: s.distance,
    lane,
    origin: lane,
    speed: 0,
    variant: 0,
    changed: false,
    passed: false,
    active: true,
  };
}

describe('火箭车经典驾驶规则', () => {
  it('四段赛道以真实时间步连续跑完，补给车可追及，燃油经济支持完整旅程', () => {
    const s = createRoadState('A', 1985);
    // Isolate the resource budget from collision AI: steer to real moving fuel cars.
    for (let course = 0; course < 4; course++) {
      s.entities = s.entities.filter((e) => e.kind === 'fuel');
      while (s.status === 'racing' && s.elapsed < 400) {
        const fuel = s.entities
          .filter((e) => e.active && e.z > s.distance - 8 && e.z < s.distance + 230)
          .sort((a, b) => a.z - b.z)[0];
        const target = fuel ? roadEntityX(s, fuel) : roadAt(course, s.distance).center;
        advanceRoad(s, 0.05, {
          steer: Math.abs(target - s.x) > 3 ? Math.sign(target - s.x) : 0,
          throttle: s.speed < 190 ? 1 : 2,
        });
      }
      expect(s.status).toBe(course === 3 ? 'won' : 'clear');
      if (course < 3) expect(nextRoadCourse(s)).toBe(true);
    }
    expect(s.elapsed).toBeLessThan(300);
    expect(s.collected).toBeGreaterThan(12);
    expect(s.crashes).toBe(0);
  });
  it('同种子车流可复现，四种场景、六种实体与 GAME B 密集车流', () => {
    const a = createRoadState('A', 1985),
      b = createRoadState('B', 1985);
    expect(a).toEqual(createRoadState('A', 1985));
    expect(ROAD_COURSES).toHaveLength(4);
    expect(new Set(a.entities.map((e) => e.kind))).toEqual(
      new Set(['yellow', 'red', 'blue', 'truck', 'fuel', 'oil']),
    );
    expect(b.entities.length).toBeGreaterThan(a.entities.length);
    for (const [s, spacing] of [
      [a, 128],
      [b, 98],
    ] as const) {
      const traffic = s.entities.filter((e) => e.kind !== 'fuel' && e.kind !== 'oil');
      for (let i = 1; i < traffic.length; i++)
        expect(traffic[i].z - traffic[i - 1].z).toBeGreaterThanOrEqual(spacing);
    }
    expect(a.fuel).toBe(100);
    expect(a.entities.filter((e) => e.kind === 'fuel').every((e) => e.speed > 0)).toBe(true);
  });
  it('B 档更快起步至 196，A 档封顶 400，松手滑行，低档也能减速', () => {
    const low = emptyRoad(),
      high = emptyRoad();
    advanceRoad(low, 0.5, { steer: 0, throttle: 1 });
    advanceRoad(high, 0.5, input);
    expect(low.speed).toBeGreaterThan(high.speed);
    advanceRoad(low, 2, { steer: 0, throttle: 1 });
    advanceRoad(high, 2, input);
    expect(low.speed).toBe(196);
    expect(high.speed).toBe(400);
    advanceRoad(high, 0.5, { steer: 0, throttle: 0 });
    expect(high.speed).toBeCloseTo(357.5);
    advanceRoad(high, 1, { steer: 0, throttle: 1 });
    expect(high.speed).toBe(196);
  });
  it('按住方向平滑转向；碰护栏爆车、扣 5 油、重置速度并带保护复位', () => {
    const s = emptyRoad();
    advanceRoad(s, 0.3, { steer: 1, throttle: 1 });
    expect(s.x).toBeGreaterThan(270);
    const fuel = s.fuel;
    s.x = roadAt(0, s.distance).right;
    advanceRoad(s, 1 / 120, input);
    expect(s.crashes).toBe(1);
    expect(s.speed).toBe(0);
    expect(s.fuel).toBeCloseTo(fuel - 5, 1);
    advanceRoad(s, 0.91, input);
    expect(s.crashTime).toBe(0);
    expect(s.invulnerable).toBeGreaterThan(1.5);
    expect(s.x).toBeCloseTo(roadAt(0, s.distance).center, 1);
  });
  it('碰黄红蓝车和油污会打滑，反打缩短打滑且不额外扣油', () => {
    for (const kind of ['yellow', 'red', 'blue', 'oil'] as const) {
      const s = emptyRoad();
      s.entities = [obstacle(s, kind)];
      s.x = roadEntityX(s, s.entities[0]);
      s.speed = 300;
      advanceRoad(s, 1 / 120, input);
      expect(s.spin).toBeGreaterThan(1);
      expect(s.crashes).toBe(0);
      const spin = s.spin,
        fuel = s.fuel;
      advanceRoad(s, 0.34, { steer: -s.spinDirection, throttle: 1 });
      expect(s.spin).toBe(0);
      expect(s.events).toContain('saved');
      expect(s.fuel).toBeGreaterThan(fuel - 1);
      expect(spin).toBeGreaterThan(1);
    }
  });
  it('向漂移方向转向不能触发救车，卡车碰撞直接爆车', () => {
    const s = emptyRoad();
    s.entities = [obstacle(s, 'oil')];
    advanceRoad(s, 1 / 120, input);
    advanceRoad(s, 0.2, { steer: s.spinDirection, throttle: 1 });
    expect(s.spin).toBeGreaterThan(0.9);
    expect(s.events).not.toContain('saved');
    const truck = emptyRoad();
    truck.entities = [obstacle(truck, 'truck')];
    advanceRoad(truck, 1 / 120, input);
    expect(truck.crashes).toBe(1);
    expect(truck.crashTime).toBeGreaterThan(0.8);
    expect(truck.fuel).toBeCloseTo(95, 1);
  });
  it('彩色补给车只收集一次，+7 油 +1000 分，油量上限 100', () => {
    const s = emptyRoad();
    s.fuel = 40;
    s.entities = [obstacle(s, 'fuel')];
    advanceRoad(s, 1 / 120, input);
    expect(s.fuel).toBeCloseTo(47, 1);
    expect(s.collected).toBe(1);
    expect(s.score).toBeGreaterThanOrEqual(1000);
    advanceRoad(s, 0.1, input);
    expect(s.collected).toBe(1);
    expect(s.entities[0].active).toBe(false);
    const full = emptyRoad();
    full.entities = [obstacle(full, 'fuel')];
    advanceRoad(full, 1 / 120, input);
    expect(full.fuel).toBe(100);
  });
  it('快敌车追上同车道补给车时保持间距，补给车持续前进且仍可安全收集', () => {
    const s = emptyRoad();
    s.fuel = 40;
    const fuel = { ...obstacle(s, 'fuel'), id: 10, z: 180, speed: 96 },
      enemy = { ...obstacle(s, 'yellow'), id: 11, z: 130, speed: 173 };
    // Deliberately put the follower first to cover array-order dependence.
    s.entities = [enemy, fuel];
    for (let i = 0; i < 80; i++) {
      advanceRoad(s, 0.05, { steer: 0, throttle: 0 });
      expect(fuel.z - enemy.z).toBeGreaterThanOrEqual(34 - 1e-6);
    }
    expect(fuel.z).toBeCloseTo(180 + (96 / 3.6) * 4, 6);
    expect(enemy.speed).toBe(173);
    s.distance = fuel.z;
    s.x = roadEntityX(s, fuel);
    advanceRoad(s, 1 / 120, input);
    expect(s.collected).toBe(1);
    expect(s.spin).toBe(0);
    expect(s.crashes).toBe(0);
    const previous = enemy.z;
    advanceRoad(s, 0.1, { steer: 0, throttle: 0 });
    expect(enemy.z - previous).toBeCloseTo((173 / 3.6) * 0.1, 6);
  });
  it('红蓝车不能横切进并排补给车，邻道车辆仍能正常通过', () => {
    for (const kind of ['red', 'blue'] as const) {
      const s = emptyRoad();
      const fuel = { ...obstacle(s, 'fuel'), id: 10, z: 60, speed: 96 },
        enemy = {
          ...obstacle(s, kind, 0.42),
          id: 11,
          z: 60,
          speed: 96,
          variant: 1,
        };
      s.entities = [enemy, fuel];
      for (let i = 0; i < 30; i++) {
        advanceRoad(s, 0.05, { steer: 0, throttle: 0 });
        expect(Math.abs(roadEntityX(s, enemy) - roadEntityX(s, fuel))).toBeGreaterThanOrEqual(44);
      }
      expect(enemy.lane).toBeLessThan(0.42);
      expect(enemy.z).toBeCloseTo(fuel.z, 6);
    }
    const s = emptyRoad();
    const fuel = { ...obstacle(s, 'fuel', -0.5), id: 10, z: 140, speed: 96 },
      enemy = { ...obstacle(s, 'yellow', 0.5), id: 11, z: 100, speed: 173 };
    s.entities = [enemy, fuel];
    advanceRoad(s, 3, { steer: 0, throttle: 0 });
    expect(enemy.z).toBeGreaterThan(fuel.z);
    expect(enemy.z).toBeCloseTo(100 + (173 / 3.6) * 3, 6);
  });
  it('四段弯道与两档车流在连续行驶中不会把敌车压到补给车上', () => {
    for (const mode of ['A', 'B'] as const) {
      for (const seed of [1985, 42, 2026]) {
        const s = createRoadState(mode, seed);
        for (let course = 0; course < 4; course++) {
          s.fuel = 10000;
          s.invulnerable = 10000;
          while (s.status === 'racing') {
            s.x = roadAt(course, s.distance).center;
            advanceRoad(s, 0.1, input);
            const visible = s.entities.filter(
              (e) => e.active && e.z > s.distance - 70 && e.z < s.distance + 250,
            );
            for (const fuel of visible.filter((e) => e.kind === 'fuel')) {
              for (const enemy of visible.filter((e) => e.kind !== 'fuel' && e.kind !== 'oil')) {
                const longitudinal = Math.abs(fuel.z - enemy.z),
                  lateral = Math.abs(roadEntityX(s, fuel) - roadEntityX(s, enemy));
                expect(longitudinal >= 34 - 1e-6 || lateral >= 44 - 1e-6).toBe(true);
              }
            }
          }
          if (course < 3) expect(nextRoadCourse(s)).toBe(true);
        }
      }
    }
  });
  it('燃油耗尽仍滑行，能最后补给续命；停下后才结束', () => {
    const s = emptyRoad();
    s.fuel = 0.001;
    s.speed = 300;
    advanceRoad(s, 0.02, input);
    expect(s.empty).toBe(true);
    expect(s.status).toBe('racing');
    expect(s.speed).toBeGreaterThan(0);
    s.entities = [obstacle(s, 'fuel')];
    s.x = roadEntityX(s, s.entities[0]);
    advanceRoad(s, 0.02, input);
    expect(s.empty).toBe(false);
    expect(s.fuel).toBeGreaterThan(6);
    s.fuel = 0;
    advanceRoad(s, 4, input);
    expect(s.speed).toBe(0);
    expect(s.status).toBe('over');
  });
  it('侧向碰撞判定不会伤及邻车，超车奖励只计算一次', () => {
    const s = emptyRoad();
    const e = obstacle(s, 'yellow', 0.75);
    s.entities = [e];
    s.speed = 400;
    advanceRoad(s, 0.4, input);
    expect(s.spin).toBe(0);
    expect(s.overtakes).toBe(1);
    advanceRoad(s, 0.4, input);
    expect(s.overtakes).toBe(1);
  });
  it('红车只切线一次、蓝车动态追逼、黄车保持车道', () => {
    const s = emptyRoad();
    s.x = 290;
    const red = { ...obstacle(s, 'red', -0.7), z: 80 },
      blue = { ...obstacle(s, 'blue', -0.7), z: 100, variant: 1 },
      yellow = { ...obstacle(s, 'yellow', -0.7), z: 110 };
    s.entities = [red, blue, yellow];
    advanceRoad(s, 0.3, input);
    const target = red.origin;
    expect(red.changed).toBe(true);
    expect(red.lane).toBeGreaterThan(-0.7);
    expect(blue.lane).toBeGreaterThan(-0.7);
    expect(yellow.lane).toBe(-0.7);
    s.x = 190;
    advanceRoad(s, 0.1, input);
    expect(red.origin).toBe(target);
  });
  it('四关结算、剩余油奖励、换关加满油且保留累计成绩与时长', () => {
    const s = emptyRoad();
    for (let course = 0; course < 4; course++) {
      s.entities = [];
      s.distance = ROAD_COURSES[course].length - 1;
      s.speed = 400;
      s.x = roadAt(course, s.distance).center;
      const before = s.score;
      advanceRoad(s, 0.02, input);
      expect(s.status).toBe(course === 3 ? 'won' : 'clear');
      expect(s.score).toBeGreaterThan(before);
      const elapsed = s.elapsed,
        score = s.score;
      advanceRoad(s, 10, input);
      expect(s.elapsed).toBe(elapsed);
      expect(s.score).toBe(score);
      if (course < 3) {
        expect(nextRoadCourse(s)).toBe(true);
        expect(s.course).toBe(course + 1);
        expect(s.fuel).toBe(100);
        expect(s.speed).toBe(0);
        expect(s.elapsed).toBe(elapsed);
      }
    }
    expect(nextRoadCourse(s)).toBe(false);
  });
  it('窄桥和弯道始终留在画面内，保护期不能穿越护栏', () => {
    for (let course = 0; course < 4; course++)
      for (let z = 0; z < ROAD_COURSES[course].length; z += 50) {
        const road = roadAt(course, z);
        expect(road.left).toBeGreaterThan(35);
        expect(road.right).toBeLessThan(445);
      }
    const s = emptyRoad();
    s.invulnerable = 10;
    s.x = 500;
    advanceRoad(s, 0.01, input);
    expect(s.x).toBeLessThan(roadAt(0, s.distance).right);
    expect(s.crashes).toBe(0);
  });
  it('低帧率和细分帧结果一致，不会穿过卡车；非有限时长安全忽略', () => {
    const a = emptyRoad(),
      b = emptyRoad();
    for (const s of [a, b]) {
      s.speed = 400;
      s.entities = [{ ...obstacle(s, 'truck'), z: 30 }];
    }
    advanceRoad(a, 0.5, input);
    for (let i = 0; i < 60; i++) advanceRoad(b, 1 / 120, input);
    expect(a.crashes).toBe(1);
    expect(a.crashes).toBe(b.crashes);
    expect(a.fuel).toBeCloseTo(b.fuel, 5);
    const elapsed = a.elapsed;
    advanceRoad(a, Infinity, input);
    advanceRoad(a, -1, input);
    expect(a.elapsed).toBe(elapsed);
  });
});
