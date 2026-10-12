/** FC Road Fighter mechanics. World distance is metres; lateral position is logical pixels. */
export type RoadMode = 'A' | 'B';
export type RoadKind = 'yellow' | 'red' | 'blue' | 'truck' | 'fuel' | 'oil';
export type RoadStatus = 'racing' | 'clear' | 'won' | 'over';
export interface RoadInput {
  steer: number;
  throttle: 0 | 1 | 2;
}
export interface RoadEntity {
  id: number;
  kind: RoadKind;
  z: number;
  lane: number;
  origin: number;
  speed: number;
  variant: number;
  changed: boolean;
  passed: boolean;
  active: boolean;
}
export const ROAD_COURSES = [
  { zh: '翠野公路', en: 'Green Country', length: 6000, width: 292, accent: '#b4db7a' },
  { zh: '跨海长桥', en: 'Ocean Bridge', length: 6800, width: 218, accent: '#68d9e9' },
  { zh: '蔚蓝海岸', en: 'Blue Coast', length: 7200, width: 264, accent: '#ffd08a' },
  { zh: '山林弯道', en: 'Alpine Forest', length: 7800, width: 238, accent: '#9cbddd' },
] as const;
export interface RoadState {
  mode: RoadMode;
  course: number;
  status: RoadStatus;
  distance: number;
  elapsed: number;
  x: number;
  speed: number;
  fuel: number;
  score: number;
  crashes: number;
  overtakes: number;
  collected: number;
  spin: number;
  spinDirection: number;
  crashTime: number;
  invulnerable: number;
  empty: boolean;
  entities: RoadEntity[];
  events: string[];
  seed: number;
  clean: boolean;
  cameo: number;
  cameoGiven: boolean;
  message: string;
  messageTime: number;
}
export function roadAt(course: number, distance: number) {
  const width = ROAD_COURSES[course].width;
  const curve = course === 0 ? 10 : course === 1 ? 5 : course === 2 ? 23 : 32;
  const center = 240 + Math.sin(distance / 380) * curve + Math.sin(distance / 157) * curve * 0.25;
  const pinch = course < 2 ? 0 : (Math.sin(distance / 480) + 1) * 9;
  return {
    center,
    width: width - pinch,
    left: center - (width - pinch) / 2,
    right: center + (width - pinch) / 2,
  };
}
function random(s: RoadState) {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
// World metres / canvas pixels: includes the fuel badge, truck body and a visible gap.
const VEHICLE_GAP = 34;
const VEHICLE_LATERAL_GAP = 44;
function populate(s: RoadState) {
  s.entities = [];
  const length = ROAD_COURSES[s.course].length;
  let id = 0;
  // Distance-based supplies remain obtainable regardless of the chosen gear.
  for (let z = 420; z < length - 180; z += 540) {
    const lane = (random(s) - 0.5) * 0.95;
    s.entities.push({
      id: id++,
      kind: 'fuel',
      z,
      lane,
      origin: lane,
      speed: 96,
      variant: 0,
      changed: false,
      passed: false,
      active: true,
    });
  }
  for (let z = 200; z < length + 200; z += s.mode === 'A' ? 128 : 98) {
    const roll = random(s);
    const kind: RoadKind =
      roll < 0.48 ? 'yellow' : roll < 0.68 ? 'red' : roll < 0.89 ? 'blue' : 'truck';
    const lane = (random(s) - 0.5) * 1.5;
    // Leave a clear approach to the fuel car; never fill the entire road with a row of cars.
    if (s.entities.some((e) => e.kind === 'fuel' && Math.abs(e.z - z) < VEHICLE_GAP)) continue;
    s.entities.push({
      id: id++,
      kind,
      z,
      lane,
      origin: lane,
      speed: kind === 'truck' ? 100 : 125 + random(s) * 48,
      variant: Math.floor(random(s) * 3),
      changed: false,
      passed: false,
      active: true,
    });
  }
  for (let z = 900; z < length - 250; z += s.mode === 'A' ? 810 : 570) {
    const lane = (random(s) - 0.5) * 1.35;
    s.entities.push({
      id: id++,
      kind: 'oil',
      z,
      lane,
      origin: lane,
      speed: 0,
      variant: 0,
      changed: false,
      passed: false,
      active: true,
    });
  }
}
export function createRoadState(mode: RoadMode = 'A', seed = 1985): RoadState {
  const s: RoadState = {
    mode,
    course: 0,
    status: 'racing',
    distance: 0,
    elapsed: 0,
    x: 240,
    speed: 0,
    fuel: 100,
    score: 0,
    crashes: 0,
    overtakes: 0,
    collected: 0,
    spin: 0,
    spinDirection: 0,
    crashTime: 0,
    invulnerable: 0,
    empty: false,
    entities: [],
    events: [],
    seed: seed >>> 0,
    clean: true,
    cameo: 0,
    cameoGiven: false,
    message: '',
    messageTime: 0,
  };
  populate(s);
  return s;
}
export function roadEntityX(s: RoadState, e: RoadEntity) {
  const road = roadAt(s.course, e.z);
  return road.center + e.lane * (road.width / 2 - (e.kind === 'truck' ? 27 : 22));
}
function announce(s: RoadState, message: string, event: string) {
  s.message = message;
  s.messageTime = 1.8;
  s.events.push(event);
}
function crash(s: RoadState) {
  if (s.crashTime > 0 || s.invulnerable > 0) return;
  s.crashes++;
  s.clean = false;
  s.crashTime = 0.9;
  s.spin = 0;
  s.speed = 0;
  s.fuel = Math.max(0, s.fuel - 5);
  announce(s, 'crash', 'crash');
}
function skid(s: RoadState, direction: number) {
  if (s.spin > 0 || s.invulnerable > 0) return;
  s.spin = 1.1;
  s.spinDirection = direction || 1;
  s.speed *= 0.7;
  announce(s, 'skid', 'skid');
}
function advanceTraffic(s: RoadState, dt: number) {
  // Include a little beyond the moving horizon so a car cannot drive into a frozen leader.
  const traffic = s.entities.filter(
    (e) => e.active && e.kind !== 'oil' && e.z <= s.distance + 360 && e.z >= s.distance - 80,
  );
  for (const e of traffic) {
    if (e.z <= s.distance + 320) e.z += (e.speed / 3.6) * dt;
  }
  // Leaders move first. Keep the desired speed; a blocked follower resumes it when clear.
  traffic.sort(
    (a, b) => b.z - a.z || Number(b.kind === 'fuel') - Number(a.kind === 'fuel') || a.id - b.id,
  );
  for (let i = 0; i < traffic.length; i++) {
    const e = traffic[i];
    if (e.z > s.distance + 320) continue;
    const ahead = e.z - s.distance,
      previousLane = e.lane;
    if (e.kind === 'red' && ahead < 100 && !e.changed) {
      e.changed = true;
      const road = roadAt(s.course, e.z);
      e.origin = Math.max(-0.8, Math.min(0.8, (s.x - road.center) / (road.width / 2 - 22)));
    }
    if (e.kind === 'red' && e.changed)
      e.lane += Math.sign(e.origin - e.lane) * Math.min(Math.abs(e.origin - e.lane), dt * 0.34);
    if (e.kind === 'blue' && ahead < 140 && ahead > -25) {
      const road = roadAt(s.course, e.z);
      const target =
        e.variant === 0
          ? Math.sin(s.elapsed * 1.8 + e.id) * 0.7
          : e.variant === 1
            ? Math.max(-0.78, Math.min(0.78, (s.x - road.center) / (road.width / 2 - 22)))
            : Math.sin(s.elapsed * 2.3 + e.id) * 0.58;
      e.lane +=
        Math.sign(target - e.lane) *
        Math.min(Math.abs(target - e.lane), dt * (s.mode === 'B' ? 0.58 : 0.42));
    }
    if (
      e.lane !== previousLane &&
      traffic.some(
        (other) =>
          other !== e &&
          Math.abs(other.z - e.z) < VEHICLE_GAP &&
          Math.abs(roadEntityX(s, other) - roadEntityX(s, e)) < VEHICLE_LATERAL_GAP,
      )
    )
      e.lane = previousLane;
    for (let j = 0; j < i; j++) {
      const leader = traffic[j];
      if (
        e.z > leader.z - VEHICLE_GAP &&
        Math.abs(roadEntityX(s, leader) - roadEntityX(s, e)) < VEHICLE_LATERAL_GAP
      )
        e.z = leader.z - VEHICLE_GAP;
    }
  }
}
function step(s: RoadState, dt: number, input: RoadInput) {
  s.elapsed += dt;
  s.messageTime = Math.max(0, s.messageTime - dt);
  s.cameo = Math.max(0, s.cameo - dt);
  s.invulnerable = Math.max(0, s.invulnerable - dt);
  if (s.crashTime > 0) {
    s.crashTime = Math.max(0, s.crashTime - dt);
    if (!s.crashTime) {
      s.x = roadAt(s.course, s.distance).center;
      s.invulnerable = 1.6;
    }
  } else {
    const target = s.fuel <= 0 ? 0 : input.throttle === 2 ? 400 : input.throttle === 1 ? 196 : 0;
    const rate =
      s.speed < target
        ? input.throttle === 1
          ? 290
          : 230
        : s.fuel <= 0
          ? 95
          : input.throttle === 1
            ? 220
            : 85;
    s.speed += Math.sign(target - s.speed) * Math.min(Math.abs(target - s.speed), rate * dt);
    if (s.spin > 0) {
      const counter = input.steer * s.spinDirection < 0;
      s.x += s.spinDirection * (counter ? 35 : 132) * dt;
      s.spin = Math.max(0, s.spin - dt * (counter ? 3.3 : 0.7));
      if (!s.spin && counter) {
        s.invulnerable = 0.55;
        announce(s, 'saved', 'saved');
      }
    } else {
      s.x += Math.max(-1, Math.min(1, input.steer)) * (112 + s.speed * 0.18) * dt;
    }
    const travelled = (s.speed / 3.6) * dt;
    s.distance += travelled;
    s.score += travelled * 0.32;
    const road = roadAt(s.course, s.distance);
    if (s.x < road.left + 15 || s.x > road.right - 15) {
      // Respawn immunity must not permit driving outside the playable road.
      if (s.invulnerable <= 0) crash(s);
      s.x = Math.max(road.left + 16, Math.min(road.right - 16, s.x));
    }
  }
  s.fuel = Math.max(0, s.fuel - dt * (0.9 + (s.speed / 400) * 0.75));
  if (s.fuel <= 0 && !s.empty) {
    s.empty = true;
    announce(s, 'empty', 'empty');
  }
  advanceTraffic(s, dt);
  // Resolve traffic separation before collecting fuel or hitting an enemy.
  for (const e of s.entities) {
    if (!e.active || e.z > s.distance + 320) continue;
    const ahead = e.z - s.distance;
    const lateral = s.x - roadEntityX(s, e);
    if (
      Math.abs(ahead) < (e.kind === 'truck' ? 18 : 11) &&
      Math.abs(lateral) < (e.kind === 'truck' ? 30 : e.kind === 'oil' ? 22 : 24) &&
      !s.crashTime
    ) {
      if (e.kind === 'fuel') {
        e.active = false;
        s.fuel = Math.min(100, s.fuel + 7);
        s.empty = false;
        s.score += 1000;
        s.collected++;
        announce(s, 'fuel', 'fuel');
      } else if (s.invulnerable <= 0 && s.spin <= 0) {
        e.active = false;
        if (e.kind === 'truck') crash(s);
        else skid(s, Math.sign(lateral) || (e.id % 2 ? 1 : -1));
      }
    }
    if (ahead < -22 && !e.passed) {
      e.passed = true;
      if (e.kind !== 'fuel' && e.kind !== 'oil' && e.active) {
        s.overtakes++;
        s.score += 50;
      }
    }
    if (ahead < -80) e.active = false;
  }
  // An original park flying hero salutes an uninterrupted run, echoing the FC cameo.
  if (
    s.clean &&
    s.course !== 1 &&
    !s.cameoGiven &&
    s.distance > ROAD_COURSES[s.course].length * 0.58
  ) {
    s.cameoGiven = true;
    s.cameo = 4;
    s.score += 1000;
    announce(s, 'clean', 'clean');
  }
  if (s.distance >= ROAD_COURSES[s.course].length) {
    s.distance = ROAD_COURSES[s.course].length;
    s.score += Math.floor(s.fuel) * 100;
    s.status = s.course === 3 ? 'won' : 'clear';
    s.events.push('clear');
  } else if (s.fuel <= 0 && s.speed <= 0 && !s.crashTime) {
    s.status = 'over';
    s.events.push('over');
  }
}
/** Substeps keep collision detection stable at low frame rates and in deterministic tests. */
export function advanceRoad(s: RoadState, seconds: number, input: RoadInput) {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  let remaining = seconds;
  while (remaining > 0.000001 && s.status === 'racing') {
    const dt = Math.min(1 / 120, remaining);
    step(s, dt, input);
    remaining -= dt;
  }
}
export function nextRoadCourse(s: RoadState) {
  if (s.status !== 'clear') return false;
  s.course++;
  s.status = 'racing';
  s.distance = 0;
  s.speed = 0;
  s.fuel = 100;
  s.x = 240;
  s.spin = 0;
  s.crashTime = 0;
  s.invulnerable = 0;
  s.empty = false;
  s.clean = true;
  s.cameo = 0;
  s.cameoGiven = false;
  s.messageTime = 0;
  s.events = [];
  populate(s);
  return true;
}
