import * as THREE from 'three';

export type TissueSurface = (
  name: string,
  rows: number,
  columns: number,
  part: number,
  point: (u: number, v: number) => THREE.Vector3,
  tint: (u: number, v: number) => THREE.Color,
  patch?: number,
  thickness?: number,
  seam?: boolean,
) => THREE.Mesh;
const TAU = Math.PI * 2;
const cyan = new THREE.Color('#b0f2f5'),
  pink = new THREE.Color('#f6addd');
const blue = new THREE.Color('#93d1f3'),
  peach = new THREE.Color('#ffc080');
const fade = (v: number) => v * v * (3 - 2 * v);
/** Irregular anatomical folds, continuous lips and independently swept oral arms. */
export function sculptJellyfish(surface: TissueSurface) {
  surface(
    'bell-v2',
    48,
    160,
    0,
    (u, v) => {
      const a = u * TAU,
        theta = (v * Math.PI) / 2;
      const lobe = Math.sin(a * 5 + 0.4) * 0.012 + Math.cos(a * 3 - 0.7) * 0.016;
      const edge = fade(Math.max(0, (v - 0.65) / 0.35));
      const radial = a * 28 + Math.sin(a * 3) * 0.8 + Math.sin(a * 7) * 0.3;
      const r = Math.sin(theta) * (1.06 + lobe) + Math.sin(radial) * 0.008 * edge;
      return new THREE.Vector3(
        r * Math.cos(a),
        0.67 + Math.cos(theta) * 0.54 + lobe * Math.sin(theta) + Math.sin(radial) * 0.016 * edge,
        r * Math.sin(a) * 0.9,
      );
    },
    (_u, v) => cyan.clone().lerp(blue, v * 0.12),
    undefined,
    0.018,
    true,
  );

  surface(
    'gill-veil-v2',
    24,
    192,
    1,
    (u, v) => {
      const a = u * TAU,
        phase = a * 28 + Math.sin(a * 3) * 0.8 + v * 0.4;
      const pleat = Math.sin(phase) * 0.019 * Math.sin(v * Math.PI);
      const r = 0.27 + v * 0.76 + pleat;
      return new THREE.Vector3(r * Math.cos(a), 0.9 - 0.3 * v + pleat * 0.9, r * Math.sin(a) * 0.9);
    },
    (_u, v) =>
      cyan
        .clone()
        .lerp(blue, 0.12)
        .lerp(pink, v * 0.09),
    undefined,
    0.009,
    true,
  );

  // One continuous, folded bell lip replaces the pair of rigid-looking coloured hoops.
  surface(
    'living-lip-v2',
    18,
    320,
    5,
    (u, v) => {
      const a = u * TAU,
        phase = a * 28 + 0.8 * Math.sin(a * 3) + 0.3 * Math.sin(a * 7);
      const pleat = Math.sin(phase + v * 0.55) * 0.024 + Math.sin(a * 57 - v * 4) * 0.007;
      const r = 1.027 + Math.sin(v * Math.PI) * 0.026 + pleat * Math.sin(v * Math.PI) * 1.1;
      return new THREE.Vector3(
        r * Math.cos(a),
        0.695 - v * 0.14 + pleat * (0.35 + v * 0.65),
        r * Math.sin(a) * 0.9,
      );
    },
    (_u, v) => pink.clone().lerp(cyan, Math.sin(v * Math.PI) * 0.5),
    undefined,
    0.008,
    true,
  );

  // Four rounded, folded gastric lobes establish a warm living core inside the bell.
  let glow!: THREE.Mesh;
  for (let lobe = 0; lobe < 4; lobe++) {
    const a = (lobe * TAU) / 4 + 0.35;
    const mesh = surface(
      `gastric-lobe-v2-${lobe}`,
      40,
      24,
      4,
      (u, v) => {
        const phi = u * TAU,
          taper = Math.sin(v * Math.PI) ** 0.7;
        const radius = (0.055 + 0.014 * Math.sin(phi * 5 + v * 14)) * taper;
        const reach = 0.12 + v * 0.18;
        return new THREE.Vector3(
          Math.cos(a) * reach + Math.cos(phi) * radius,
          1.08 - v * 0.88 + Math.cos(phi * 3 + v * 9) * 0.012 * taper,
          Math.sin(a) * reach + Math.sin(phi) * radius,
        );
      },
      (_u, v) => peach.clone().lerp(pink, 0.22 + v * 0.1),
      lobe * 0.21,
      0,
      true,
    );
    if (lobe === 0) glow = mesh;
  }

  // Broad, thin oral tissues follow six individual splines rather than one repeated helix.
  for (let arm = 0; arm < 6; arm++) {
    const a = (arm * TAU) / 6 + 0.18,
      seed = arm * 1.71;
    const length = 1.78 + Math.sin(seed) * 0.15;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(a) * 0.16, 0.79, Math.sin(a) * 0.16),
      new THREE.Vector3(Math.cos(a + 0.1) * 0.22, 0.41, Math.sin(a + 0.1) * 0.22),
      new THREE.Vector3(Math.cos(a - 0.12) * 0.36, 0.0, Math.sin(a - 0.12) * 0.36),
      new THREE.Vector3(Math.cos(a + 0.15) * 0.42, -0.38, Math.sin(a + 0.15) * 0.42),
      new THREE.Vector3(Math.cos(a + 0.3) * 0.54, 0.79 - length + 0.23, Math.sin(a + 0.3) * 0.54),
      new THREE.Vector3(Math.cos(a + 0.45) * 0.46, 0.79 - length, Math.sin(a + 0.45) * 0.46),
    ]);
    surface(
      `oral-tissue-v2-${arm}`,
      160,
      24,
      2,
      (u, v) => {
        const p = curve.getPoint(v),
          s = u * 2 - 1;
        const fan = Math.sin(v * Math.PI) ** 0.7;
        const tip = Math.exp(-Math.pow((v - 0.92) / 0.06, 2)) * 0.07;
        const taper = v < 0.97 ? 1 : Math.sqrt(Math.max(0, 1 - ((v - 0.97) / 0.03) ** 2));
        const width = (0.032 + 0.125 * fan + tip) * taper;
        const phase = v * (44 + arm * 1.4) + seed + 0.9 * Math.sin(v * 13 + seed);
        const fringe = (Math.sin(phase) + Math.sin(phase * 1.63 + 0.4) * 0.24) * Math.abs(s) ** 3;
        const turn = a + 0.65 + Math.sin(v * 5 + seed) * 0.22 + v * 0.35;
        const cross = s * width * (1 + fringe * 0.22);
        const curl = Math.sin(s * Math.PI * 0.7) * width * 0.28 + fringe * width * 0.24;
        p.x += Math.cos(turn) * cross + Math.sin(turn) * curl;
        p.z += Math.sin(turn) * cross - Math.cos(turn) * curl;
        p.y += fringe * width * 0.18;
        return p;
      },
      (u, v) =>
        cyan
          .clone()
          .lerp(arm % 3 === 0 ? peach : pink, (1 - v) * 0.38 + Math.abs(u * 2 - 1) ** 2 * 0.25)
          .lerp(blue, v * 0.1),
      arm * 0.163,
      0.008,
    );
  }

  // Transported tube frames keep the thin trailing filaments round from every longitude.
  for (let strand = 0; strand < 22; strand++) {
    const a = (strand * TAU) / 22 + Math.sin(strand * 7.3) * 0.035;
    const length = 1.75 + Math.sin(strand * 4.3) * 0.27;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(a) * 1.035, 0.57, Math.sin(a) * 0.93),
      new THREE.Vector3(Math.cos(a + 0.04) * 0.88, 0.2, Math.sin(a + 0.04) * 0.79),
      new THREE.Vector3(Math.cos(a + 0.13) * 0.7, -0.4, Math.sin(a + 0.13) * 0.63),
      new THREE.Vector3(Math.cos(a + 0.23) * 0.79, 0.57 - length + 0.24, Math.sin(a + 0.23) * 0.73),
      new THREE.Vector3(Math.cos(a + 0.3) * 1.08, 0.57 - length, Math.sin(a + 0.3) * 0.92),
    ]);
    const frames = curve.computeFrenetFrames(96, false);
    surface(
      `filament-v2-${strand}`,
      96,
      6,
      3,
      (u, v) => {
        const row = Math.round(v * 96),
          phi = u * TAU,
          radius = 0.0056 * (1 - v * 0.35);
        return curve
          .getPointAt(v)
          .addScaledVector(frames.normals[row], Math.cos(phi) * radius)
          .addScaledVector(frames.binormals[row], Math.sin(phi) * radius);
      },
      (_u, v) =>
        (strand % 4 === 0 ? peach : strand % 3 === 0 ? pink : cyan).clone().lerp(blue, v * 0.15),
      undefined,
      0,
      true,
    );
  }
  return glow;
}
