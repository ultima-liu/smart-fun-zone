import * as THREE from 'three';
import type { Ink, Workshop } from './models';

/** Continuous hull profiles, curved structural ribs and solid swept wings. */
export function spindle(
  w: Workshop,
  parent: THREE.Object3D,
  ink: Ink,
  profile: [number, number][],
  x = 0,
  y = 0,
  z = 0,
) {
  return w.mesh(
    parent,
    w.geometry(
      `lathe:${JSON.stringify(profile)}`,
      () =>
        new THREE.LatheGeometry(
          profile.map(([r, h]) => new THREE.Vector2(r, h)),
          40,
        ),
    ),
    ink,
    x,
    y,
    z,
  );
}

export function tube(
  w: Workshop,
  parent: THREE.Object3D,
  ink: Ink,
  points: [number, number, number][],
  radius = 0.025,
  glow = false,
) {
  return w.mesh(
    parent,
    w.geometry(
      `curve:${radius}:${JSON.stringify(points)}`,
      () =>
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
          28,
          radius,
          6,
          false,
        ),
    ),
    ink,
    0,
    0,
    0,
    glow,
  );
}

/** Both sides and perimeter are closed geometry; curved roofs are not flat billboards. */
export function wingPoint(
  sign: number,
  width: number,
  depth: number,
  rise: number,
  base: number,
  u: number,
  v: number,
): [number, number, number] {
  return [
    sign * u * width * (0.86 + 0.14 * Math.sin(v * Math.PI)),
    base + rise * Math.pow(u, 0.7) + Math.sin(u * Math.PI) * 0.12 + Math.sin(v * Math.PI) * 0.07,
    (v - 0.5) * depth * (1 - 0.55 * u) + Math.sin(u * Math.PI) * 0.08,
  ];
}

export function wing(
  w: Workshop,
  parent: THREE.Object3D,
  ink: Ink,
  sign: number,
  width: number,
  depth: number,
  rise: number,
  base: number,
  thickness = 0.035,
) {
  const geometry = w.geometry(`wing:${sign}:${width}:${depth}:${rise}:${base}:${thickness}`, () => {
    const columns = 16,
      rows = 10,
      sideSize = (columns + 1) * (rows + 1);
    const positions: number[] = [],
      uv: number[] = [],
      indices: number[] = [];
    for (let side = 0; side < 2; side++)
      for (let i = 0; i <= columns; i++)
        for (let j = 0; j <= rows; j++) {
          const u = i / columns,
            v = j / rows;
          const point = wingPoint(sign, width, depth, rise, base, u, v);
          positions.push(point[0], point[1] - side * thickness, point[2]);
          uv.push(u, v);
        }
    for (let side = 0; side < 2; side++)
      for (let i = 0; i < columns; i++)
        for (let j = 0; j < rows; j++) {
          const a = side * sideSize + i * (rows + 1) + j,
            b = a + rows + 1;
          if (sign > 0 !== Boolean(side)) indices.push(a, a + 1, b, b, a + 1, b + 1);
          else indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
    const edge = (a: number, b: number) => {
      if (sign > 0) indices.push(a, b, a + sideSize, b, b + sideSize, a + sideSize);
      else indices.push(a, a + sideSize, b, b, a + sideSize, b + sideSize);
    };
    for (let i = 0; i < columns; i++) {
      edge(i * (rows + 1), (i + 1) * (rows + 1));
      edge((i + 1) * (rows + 1) + rows, i * (rows + 1) + rows);
    }
    for (let j = 0; j < rows; j++) {
      edge(j + 1, j);
      edge(columns * (rows + 1) + j, columns * (rows + 1) + j + 1);
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    result.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    result.setIndex(indices);
    result.computeVertexNormals();
    return result;
  });
  return w.mesh(parent, geometry, ink);
}

/** Swept architectural volumes; sections are [height, width radius, depth radius, x, z]. */
export function volume(
  w: Workshop,
  parent: THREE.Object3D,
  ink: Ink,
  sections: [number, number, number, number, number][],
) {
  const geometry = w.geometry(`volume:${JSON.stringify(sections)}`, () => {
    const positions: number[] = [],
      uv: number[] = [],
      indices: number[] = [],
      sides = 32;
    sections.forEach(([height, rx, rz, x, z], row) => {
      for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        positions.push(x + Math.cos(angle) * rx, height, z + Math.sin(angle) * rz);
        uv.push(i / sides, row / (sections.length - 1));
        if (row && i < sides) {
          const a = (row - 1) * (sides + 1) + i,
            b = row * (sides + 1) + i;
          indices.push(a, b, a + 1, a + 1, b, b + 1);
        }
      }
    });
    for (const row of [0, sections.length - 1]) {
      const [height, , , x, z] = sections[row],
        center = positions.length / 3;
      positions.push(x, height, z);
      uv.push(0.5, 0.5);
      // Duplicate cap edges so flat end plates do not inherit rounded side normals.
      const edge = positions.length / 3;
      for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        positions.push(
          x + Math.cos(angle) * sections[row][1],
          height,
          z + Math.sin(angle) * sections[row][2],
        );
        uv.push((Math.cos(angle) + 1) / 2, (Math.sin(angle) + 1) / 2);
      }
      for (let i = 0; i < sides; i++) {
        const a = edge + i;
        if (row) indices.push(center, a + 1, a);
        else indices.push(center, a, a + 1);
      }
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    result.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    result.setIndex(indices);
    result.computeVertexNormals();
    return result;
  });
  return w.mesh(parent, geometry, ink);
}

/** A broad, solid horseshoe shell, with real depth and closed cut edges. */
export function bayShell(
  w: Workshop,
  parent: THREE.Object3D,
  ink: Ink,
  radius: number,
  width: number,
  depth: number,
  start: number,
  span: number,
) {
  const geometry = w.geometry(`bay:${radius}:${width}:${depth}:${start}:${span}`, () => {
    const shape = new THREE.Shape(),
      end = start + span,
      inner = radius - width;
    shape.moveTo(Math.cos(start) * radius, Math.sin(start) * radius);
    shape.absarc(0, 0, radius, start, end, false);
    shape.lineTo(Math.cos(end) * inner, Math.sin(end) * inner);
    shape.absarc(0, 0, inner, end, start, true);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSize: 0.018,
      bevelThickness: 0.018,
      bevelSegments: 2,
      curveSegments: 28,
    }).translate(0, 0, -depth / 2);
  });
  return w.mesh(parent, geometry, ink);
}
