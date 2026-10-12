import * as THREE from 'three';
import { refineModel, refineSurface } from './surfaceDetail';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { PlaceId, WorldPoint } from './places';
import { facilitySurface, panelTexture } from './facilityMaterials';
import { createHeadquarters } from './headquarters';
import { createSchoolBook } from './schoolBook';
import { createArchiveCards } from './archiveCards';
import { createRadarMail } from './radarMail';
import { createGameConsole } from './gameConsole';
import { hologram, particles, chargeStream, inductionArcs, enginePlume } from './facilityEffects';
import { spindle, tube, wing, volume, bayShell } from './forms';

const PALETTE = {
  soil: '#293149',
  rock: '#627b92',
  grass: '#283e50',
  leaf: '#176375',
  pine: '#24475a',
  cream: '#8094a9',
  paper: '#c6d9e9',
  gold: '#d59a38',
  coral: '#bf5037',
  plum: '#332d5a',
  violet: '#6960b5',
  navy: '#7891a5',
  blue: '#188bbc',
  water: '#09516d',
  wood: '#9292a3',
  white: '#cad5df',
  ink: '#6d8ca2',
  dark: '#71889b',
  mint: '#1dafa8',
  pink: '#b040aa',
};
export type Ink = keyof typeof PALETTE;
export type Model = {
  root: THREE.Group;
  anchor: THREE.Vector3;
  animate: (time: number, hover: number, active: boolean) => void;
};

/** 原创科幻设施工坊：金属装甲、玻璃和自发光材料，复用几何，并按材质合并静态部件。 */
export class Workshop {
  geometries = new Map<string, THREE.BufferGeometry>();
  materials = new Map<string, THREE.MeshStandardMaterial>();
  textures = new Set<THREE.Texture>();
  effects = new Set<THREE.Material>();
  pendingAssets = 0;
  assetLoads: Promise<void>[] = [];
  onAssetLoad?: () => void;
  private disposed = false;
  facility: PlaceId | null = null;
  private panels = new Map<PlaceId, THREE.Texture>();
  merged: THREE.BufferGeometry[] = [];
  material(color: Ink, glow = false) {
    const key = `${this.facility ?? 'service'}:${color}:${glow}`;
    let value = this.materials.get(key);
    if (!value) {
      const glass = !glow && (color === 'blue' || color === 'water');
      let surface: THREE.MeshPhysicalMaterialParameters = {};
      if (this.facility && !['school', 'hq', 'archive'].includes(this.facility)) {
        let texture = this.panels.get(this.facility);
        if (!texture) {
          texture = panelTexture(this.facility);
          this.panels.set(this.facility, texture);
          this.textures.add(texture);
        }
        surface = facilitySurface(this.facility, color, glow, texture);
      }
      value = new THREE.MeshPhysicalMaterial({
        color: glow ? '#000000' : PALETTE[color],
        roughness: glow ? 1 : glass ? 0.26 : 0.48,
        metalness: glow ? 0 : glass ? 0.15 : color === 'paper' || color === 'white' ? 0.58 : 0.82,
        clearcoat: glow ? 0 : glass ? 0.28 : 0.08,
        clearcoatRoughness: 0.42,
        envMapIntensity: 0.4,
        transmission: glass ? 0.22 : 0,
        thickness: glass ? 0.12 : 0,
        transparent: glass,
        opacity: glass ? 0.82 : 1,
        emissive: glow ? PALETTE[color] : '#000000',
        emissiveIntensity: glow ? 1.45 : 0,
        ...surface,
      });
      value.userData.facilitySurface = { place: this.facility, ink: color, glow };
      this.materials.set(key, value);
    }
    return value;
  }
  /** A neutral image is always available; arrival also wakes a frozen scene. */
  loadTexture(url: string, ready: (texture: THREE.Texture) => void, fallbackColor = '#ffffff') {
    this.pendingAssets++;
    let complete!: () => void;
    this.assetLoads.push(
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
    );
    const finish = () => {
      this.pendingAssets--;
      complete();
      if (!this.disposed) this.onAssetLoad?.();
    };
    const texture: THREE.Texture<HTMLImageElement | HTMLCanvasElement> =
      new THREE.TextureLoader().load(
        url,
        (loaded) => {
          if (this.disposed) loaded.dispose();
          else {
            // Clones share the image source (e.g. book cover/spine). Release every
            // placeholder allocation before uploading an image with new dimensions.
            this.textures.forEach((shared) => {
              if (shared.source === loaded.source) {
                shared.dispose();
                shared.needsUpdate = true;
              }
            });
            ready(loaded);
          }
          finish();
        },
        undefined,
        finish,
      );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const fallback = document.createElement('canvas');
    fallback.width = fallback.height = 1;
    const ctx = fallback.getContext('2d')!;
    ctx.fillStyle = fallbackColor;
    ctx.fillRect(0, 0, 1, 1);
    texture.image = fallback;
    texture.needsUpdate = true;
    this.textures.add(texture);
    return texture;
  }
  glass(tint = '#a6cfda') {
    const key = `glass:${this.facility ?? 'service'}:${tint}`;
    let material = this.materials.get(key);
    if (!material) {
      material = new THREE.MeshPhysicalMaterial({
        color: tint,
        roughness: 0.12,
        metalness: 0.02,
        transmission: 0.75,
        thickness: 0.04,
        ior: 1.45,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        side: THREE.DoubleSide,
        clearcoat: 0.2,
        specularIntensity: 0.28,
        envMapIntensity: 0.3,
      });
      material.userData.facilitySurface = { place: this.facility, ink: 'glass' };
      this.materials.set(key, material);
    }
    return material;
  }
  glazed(mesh: THREE.Mesh, tint?: string) {
    mesh.material = this.glass(tint);
    mesh.castShadow = mesh.receiveShadow = false;
    mesh.userData.keep = true;
    return mesh;
  }
  geometry(key: string, create: () => THREE.BufferGeometry) {
    let geometry = this.geometries.get(key);
    if (!geometry) {
      geometry = create();
      this.geometries.set(key, geometry);
    }
    return geometry;
  }
  mesh(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    color: Ink,
    x = 0,
    y = 0,
    z = 0,
    glow = false,
  ) {
    const mesh = new THREE.Mesh<THREE.BufferGeometry, THREE.Material>(
      geometry,
      this.material(color, glow),
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  box(
    parent: THREE.Object3D,
    color: Ink,
    width: number,
    height: number,
    depth: number,
    x = 0,
    y = 0,
    z = 0,
  ) {
    const radius = Math.min(width, height, depth, 0.2) * 0.06;
    return this.mesh(
      parent,
      this.geometry(
        `b:${width}:${height}:${depth}`,
        () => new RoundedBoxGeometry(width, height, depth, 2, radius),
      ),
      color,
      x,
      y,
      z,
    );
  }
  ball(parent: THREE.Object3D, color: Ink, radius: number, x = 0, y = 0, z = 0, glow = false) {
    return this.mesh(
      parent,
      this.geometry(`s:${radius}`, () => new THREE.SphereGeometry(radius, 28, 20)),
      color,
      x,
      y,
      z,
      glow,
    );
  }
  cylinder(
    parent: THREE.Object3D,
    color: Ink,
    radius: number,
    height: number,
    x = 0,
    y = 0,
    z = 0,
    top = radius,
    segments = 24,
  ) {
    return this.mesh(
      parent,
      this.geometry(
        `c:${radius}:${height}:${top}:${segments}`,
        () => new THREE.CylinderGeometry(top, radius, height, segments),
      ),
      color,
      x,
      y,
      z,
    );
  }
  ring(parent: THREE.Object3D, color: Ink, radius: number, tube: number, x = 0, y = 0, z = 0) {
    return this.mesh(
      parent,
      this.geometry(`r:${radius}:${tube}`, () => new THREE.TorusGeometry(radius, tube, 8, 96)),
      color,
      x,
      y,
      z,
    );
  }
  beam(parent: THREE.Object3D, color: Ink, a: THREE.Vector3, b: THREE.Vector3, radius = 0.025) {
    const mesh = this.cylinder(parent, color, radius, a.distanceTo(b));
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return mesh;
  }
  /** 每座建筑保留可动关节，其余几何按共享材质合并，减少 draw calls。 */
  finish(root: THREE.Group) {
    root.updateMatrixWorld(true);
    const groups = new Map<
      THREE.Material,
      { mesh: THREE.Mesh; geometry: THREE.BufferGeometry }[]
    >();
    const inverse = root.matrixWorld.clone().invert();
    root.traverse((node) => {
      if (!(node instanceof THREE.Mesh) || Array.isArray(node.material)) return;
      let current: THREE.Object3D | null = node;
      while (current && current !== root) {
        if (current.userData.keep) return;
        current = current.parent;
      }
      const geometry = (
        node.geometry.index ? node.geometry.toNonIndexed() : node.geometry.clone()
      ).applyMatrix4(inverse.clone().multiply(node.matrixWorld));
      const items = groups.get(node.material) ?? [];
      items.push({ mesh: node, geometry });
      groups.set(node.material, items);
    });
    groups.forEach((items, material) => {
      const geometry = mergeGeometries(
        items.map((item) => item.geometry),
        false,
      );
      items.forEach((item) => {
        if (geometry) item.mesh.removeFromParent();
        item.geometry.dispose();
      });
      if (geometry) {
        this.merged.push(geometry);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = mesh.receiveShadow = true;
        root.add(mesh);
      }
    });
  }
  dispose() {
    this.disposed = true;
    this.onAssetLoad = undefined;
    this.geometries.forEach((geometry) => geometry.dispose());
    this.merged.forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
    this.textures.forEach((texture) => texture.dispose());
    this.effects.forEach((material) => material.dispose());
  }
}
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
function moving(parent: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.keep = true;
  parent.add(group);
  return group;
}
function star(w: Workshop, parent: THREE.Object3D, size: number, x: number, y: number, z: number) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 ? size * 0.45 : size;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(px, py);
    else shape.lineTo(px, py);
  }
  shape.closePath();
  const geometry = w.geometry(
    `star:${size}`,
    () =>
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.045,
        bevelEnabled: true,
        bevelSegments: 1,
        steps: 1,
        bevelSize: 0.018,
        bevelThickness: 0.012,
      }),
  );
  return w.mesh(parent, geometry, 'gold', x, y, z, true);
}
function smallShip(w: Workshop, parent: THREE.Object3D, color: Ink = 'cream') {
  const hull = spindle(w, parent, color, [
    [0, -0.54],
    [0.075, -0.52],
    [0.13, -0.3],
    [0.14, 0.08],
    [0.09, 0.4],
    [0, 0.62],
  ]);
  hull.rotation.x = Math.PI / 2;
  w.ball(parent, 'blue', 0.145, 0, 0.105, 0.16).scale.set(0.8, 0.5, 1.7);
  for (const sign of [-1, 1]) {
    const fin = wing(w, parent, 'navy', sign, 0.46, 0.42, 0.025, -0.01);
    fin.position.z = -0.18;
    tube(
      w,
      parent,
      'cream',
      [
        [sign * 0.08, 0.035, -0.35],
        [sign * 0.26, 0.045, -0.31],
        [sign * 0.43, 0.06, -0.25],
      ],
      0.012,
    );
    const engine = spindle(
      w,
      parent,
      'dark',
      [
        [0, -0.13],
        [0.065, -0.11],
        [0.075, 0.08],
        [0.05, 0.12],
        [0, 0.12],
      ],
      sign * 0.13,
      0,
      -0.4,
    );
    engine.rotation.x = Math.PI / 2;
    const drive = w.cylinder(parent, 'blue', 0.042, 0.025, sign * 0.13, 0, -0.535);
    drive.rotation.x = Math.PI / 2;
    drive.material = w.material('blue', true);
  }
}

function harbor(w: Workshop): Model {
  const root = new THREE.Group();
  const shell = w.glazed(
    bayShell(w, root, 'cream', 0.971, 0.012, 0.96, -Math.PI * 0.1, Math.PI * 1.2),
  );
  shell.position.y = 0.25;
  const shellGlass = (shell.material as THREE.MeshPhysicalMaterial).clone();
  shellGlass.thickness = 0.008;
  shellGlass.opacity = 0.07;
  shellGlass.color.set('#f4cd69');
  shellGlass.emissive.set('#e9b13f');
  shell.material = shellGlass;

  w.glazed(
    volume(w, root, 'cream', [
      [-0.5, 0.7, 0.6, 0, 0.1],
      [-0.4, 0.75, 0.64, 0, 0.1],
      [-0.36, 0.7, 0.6, 0, 0.1],
    ]),
  );
  for (const x of [-0.73, 0.73]) {
    const clamp = volume(w, root, 'navy', [
      [-0.43, 0.08, 0.57, x, 0],
      [-0.29, 0.1, 0.6, x, 0],
      [-0.23, 0.08, 0.54, x, 0],
    ]);
    clamp.rotation.z = x > 0 ? -0.08 : 0.08;
    for (const z of [-0.35, 0, 0.35])
      w.box(root, 'gold', 0.1, 0.025, 0.12, x, -0.22, z).rotation.y = -0.45;
    for (const z of [-0.44, -0.22, 0.22, 0.44]) {
      w.cylinder(root, 'paper', 0.017, 0.012, x, -0.212, z, 0.017, 12);
      w.box(root, 'navy', 0.021, 0.003, 0.003, x, -0.204, z);
    }
    for (let i = 0; i < 7; i++)
      w.box(root, 'dark', 0.035, 0.014, 0.055, x, -0.288 + i * 0.02, 0.595);
  }
  const vessel = createCargo(w, true);
  const ship = vessel.root;
  ship.userData.point = 'dock';
  ship.userData.keep = true;
  ship.scale.setScalar(0.46);
  ship.rotation.y = -Math.PI / 2;
  ship.position.set(0, -0.03, 0.1);
  ship.userData.baseY = -0.03;
  root.add(ship);
  const crane = moving(root);
  crane.position.set(0.66, 0.83, -0.15);
  w.ball(crane, 'dark', 0.14);
  w.beam(crane, 'cream', v(0, 0, 0), v(-0.29, -0.06, 0), 0.09);
  w.ball(crane, 'gold', 0.11, -0.29, -0.06);
  for (const z of [-0.095, 0.095]) {
    const bearing = w.cylinder(crane, 'paper', 0.063, 0.018, -0.29, -0.06, z);
    bearing.rotation.x = Math.PI / 2;
    const shaft = w.cylinder(crane, 'navy', 0.025, 0.021, -0.29, -0.06, z * 1.12);
    shaft.rotation.x = Math.PI / 2;
  }
  w.beam(crane, 'dark', v(-0.29, -0.06, 0), v(-0.46, -0.3, 0), 0.065);
  w.cylinder(crane, 'gold', 0.055, 0.12, -0.46, -0.35);
  const welding = particles(crane, 'weld', v(-0.46, -0.43, 0));
  const arc = w.ball(crane, 'paper', 0.025, -0.46, -0.43);
  arc.material = new THREE.MeshBasicMaterial({ color: '#83c7e2', toneMapped: false });
  tube(
    w,
    root,
    'dark',
    [
      [-0.73, -0.25, 0.4],
      [-0.64, -0.05, 0.35],
      [-0.32, -0.02, 0.2],
    ],
    0.035,
  );
  const charging = chargeStream(root, v(-0.71, -0.21, 0.4), v(-0.32, -0.02, 0.2));
  const sources = [
    v(-0.68, 0.936, -0.18),
    v(0.68, 0.936, -0.18),
    v(-0.963, 0.3, 0.24),
    v(0.963, 0.3, 0.24),
  ];
  const receivers = [
    v(-0.12, 0.13, -0.37),
    v(-0.12, 0.13, 0.37),
    v(0.65, 0.23, -0.22),
    v(0.65, 0.23, 0.22),
  ];
  const targets = receivers.map((point) => point.clone());
  sources.forEach((point) => w.ball(root, 'mint', 0.035, point.x, point.y, point.z, true));
  receivers.forEach((point) => w.ball(ship, 'mint', 0.055, point.x, point.y, point.z, true));
  const induction = inductionArcs(root, sources, targets);

  const lights: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const light = w.box(root, 'mint', 0.06, 0.025, 0.07, -0.74 + i * 0.075, -0.17, 0.48);
    light.material = w.material('mint', true);
    light.userData.keep = true;
    lights.push(light);
  }
  w.finish(root);
  return {
    root,
    anchor: v(0, -0.49, 0.72),
    animate: (time, hover) => {
      root.position.y = root.userData.baseY + Math.sin(time * 0.35) * 0.06;
      vessel.animate(time, 0, false);
      crane.rotation.y = Math.sin(time * 0.45) * 0.08 + hover * 0.16;
      welding(time, 0.8 + hover * 0.5);
      charging(time);
      ship.updateMatrix();
      targets.forEach((target, i) => target.copy(receivers[i]).applyMatrix4(ship.matrix));
      induction(time);
      const phase = time % 5;
      const pulse = phase > 3.1 && phase < 4.8 ? Math.sin(((phase - 3.1) / 1.7) * Math.PI) ** 2 : 0;
      shellGlass.emissiveIntensity = pulse * 0.55;
      shellGlass.opacity = 0.07 + pulse * 0.06;

      arc.visible = time > 0 && Math.sin(time * 1.8) > 0.3;
      arc.scale.setScalar(0.8 + Math.sin(time * 27) * 0.25);
      lights.forEach((light, i) => (light.scale.y = 0.7 + 0.3 * Math.sin(time * 2 - i * 0.9)));
    },
  };
}

function trader(w: Workshop): Model {
  const root = new THREE.Group();
  const habitat = moving(root);
  habitat.rotation.x = 0.25;
  w.mesh(
    habitat,
    w.geometry('supply-habitat', () => new THREE.TorusGeometry(0.91, 0.15, 12, 80)),
    'cream',
  );
  w.mesh(
    habitat,
    w.geometry('supply-observation-belt', () => new THREE.TorusGeometry(0.925, 0.078, 8, 80)),
    'blue',
    0,
    0,
    0.105,
  );
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    bayShell(
      w,
      habitat,
      i % 2 ? 'navy' : 'paper',
      1.075,
      0.12,
      0.24,
      angle + 0.09,
      0.48,
    ).position.z = 0.1;
    const a = angle + 0.33;
    w.ball(habitat, 'mint', 0.025, Math.cos(a) * 1.025, Math.sin(a) * 1.025, 0.245, true);
  }
  // Window mullions are real slender frame pieces, not another decorative orbit.
  for (let i = 0; i < 64; i++) {
    const a = (i * Math.PI) / 32;
    const mullion = w.box(
      habitat,
      'paper',
      0.009,
      0.105,
      0.017,
      Math.cos(a) * 0.925,
      Math.sin(a) * 0.925,
      0.18,
    );
    mullion.rotation.z = a - Math.PI / 2;
  }
  const hub = w.cylinder(root, 'navy', 0.2, 0.55, 0, 0, 0);
  hub.rotation.x = Math.PI / 2;
  const rotor = moving(root);
  rotor.position.z = 0.33;
  for (let i = 0; i < 6; i++)
    bayShell(w, rotor, 'dark', 0.33, 0.11, 0.07, (i * Math.PI) / 3 + 0.08, 0.7);
  w.ball(root, 'blue', 0.17, 0, 0, 0.36).scale.z = 0.4;

  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    w.beam(
      habitat,
      'dark',
      v(Math.cos(a) * 0.19, Math.sin(a) * 0.19, 0),
      v(Math.cos(a) * 0.82, Math.sin(a) * 0.82, 0),
      0.05,
    );
    const port = spindle(
      w,
      habitat,
      'dark',
      [
        [0, -0.16],
        [0.11, -0.16],
        [0.15, -0.09],
        [0.14, 0.12],
        [0, 0.2],
      ],
      Math.cos(a) * 1.03,
      Math.sin(a) * 1.03,
    );
    port.rotation.z = a - Math.PI / 2;
    w.ball(habitat, 'mint', 0.045, Math.cos(a) * 1.18, Math.sin(a) * 1.18, 0, true);
  }
  const solar = new THREE.MeshStandardMaterial({
    color: '#173962',
    metalness: 0.62,
    roughness: 0.35,
    emissive: '#16698b',
    emissiveIntensity: 0.25,
  });
  const cellCanvas = document.createElement('canvas');
  cellCanvas.width = cellCanvas.height = 256;
  const cell = cellCanvas.getContext('2d')!;
  cell.fillStyle = '#a8bbca';
  cell.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    cell.fillStyle = '#455b77';
    cell.fillRect(0, y, 256, 2);
    for (let x = 12; x < 256; x += 38) {
      cell.fillStyle = '#dae0e5';
      cell.fillRect(x, y + 3, 1, 27);
    }
  }
  const cells = new THREE.CanvasTexture(cellCanvas);
  cells.colorSpace = THREE.SRGBColorSpace;
  solar.map = cells;
  w.textures.add(cells);
  w.effects.add(solar);
  refineSurface(solar, 'metal');
  for (const side of [-1, 1]) {
    const panel = new THREE.Group();
    panel.position.set(side * 1.24, 0, -0.14);
    root.add(panel);
    w.box(panel, 'navy', 0.32, 0.72, 0.035);
    for (const x of [-0.095, 0, 0.095])
      for (const y of [-0.25, -0.125, 0, 0.125, 0.25])
        w.box(panel, 'blue', 0.072, 0.105, 0.018, x, y, 0.025).material = solar;
  }
  const sign = moving(root);
  sign.position.set(0, 0, 0.5);
  const projection = hologram('#7ee4e8', 0.25);
  star(w, sign, 0.12, 0, 0, 0).material = projection.material;
  w.finish(habitat);
  w.finish(root);
  return {
    root,
    anchor: v(1.12, -0.22, 0.16),
    animate: (time, hover) => {
      root.position.y = root.userData.baseY + Math.sin(time * 0.35) * 0.045;
      habitat.rotation.z = time * 0.22;
      rotor.rotation.z = -time * 0.48;
      projection.update(time);
      sign.rotation.z = Math.sin(time * 0.4) * 0.05;
      sign.position.z = 0.5 + hover * 0.04;
    },
  };
}

export function createPlace(w: Workshop, id: PlaceId): Model {
  const build = {
    school: createSchoolBook,
    hq: createHeadquarters,
    archive: createArchiveCards,
    dock: harbor,
    supply: trader,
    park: createGameConsole,
  };
  w.facility = id;
  try {
    const model = build[id](w);
    refineModel(model.root, id);
    model.root.userData.point = id;
    return model;
  } finally {
    w.facility = null;
  }
}

export function createMail(
  w: Workshop,
): Model & { courier: THREE.Group; envelope: THREE.Group; glow: THREE.Mesh } {
  const root = new THREE.Group();
  const envelope = moving(root);
  envelope.position.set(0, 0.12, 0.32);
  w.box(envelope, 'paper', 0.43, 0.29, 0.04);
  const flap = new THREE.Shape();
  flap.moveTo(-0.2, 0.13);
  flap.lineTo(0.2, 0.13);
  flap.lineTo(0, -0.025);
  flap.closePath();
  w.mesh(
    envelope,
    w.geometry(
      'mail-flap',
      () => new THREE.ExtrudeGeometry(flap, { depth: 0.012, bevelEnabled: false }),
    ),
    'cream',
    0,
    0,
    0.025,
  );
  star(w, envelope, 0.046, 0, -0.04, 0.06);
  const courier = moving(root);
  smallShip(w, courier, 'coral');
  courier.scale.setScalar(0.6);
  courier.visible = false;
  const model = createRadarMail(w, courier, envelope);
  refineModel(model.root, 'mail');
  return model;
}

export function createCargo(w: Workshop, repair = false): Model & { hatch: THREE.Group } {
  const root = new THREE.Group();
  // Long armoured expedition flagship: tapered prow, continuous keel and separate engine nacelles.
  const hull = volume(w, root, 'navy', [
    [-1.7, 0.15, 0.27, 0, 0],
    [-1.4, 0.23, 0.38, 0, 0],
    [-0.4, 0.27, 0.42, 0, 0],
    [0.85, 0.19, 0.3, -0.015, 0],
    [1.65, 0.065, 0.12, -0.035, 0],
    [1.86, 0.012, 0.025, -0.035, 0],
  ]);
  hull.rotation.z = -Math.PI / 2;
  for (const side of [-1, 1]) {
    const armor = volume(w, root, 'cream', [
      [-1.55, 0.095, 0.13, -0.09, side * 0.3],
      [-1.1, 0.13, 0.18, -0.11, side * 0.32],
      [0.25, 0.13, 0.14, -0.08, side * 0.32],
      [1.38, 0.045, 0.065, -0.06, side * 0.17],
      [1.76, 0.01, 0.018, -0.055, side * 0.08],
    ]);
    armor.rotation.z = -Math.PI / 2;
    const fin = wing(w, root, 'dark', side, 0.54, 0.74, 0.05, 0.055, 0.075);
    fin.rotation.y = Math.PI / 2;
    fin.position.x = -1.05;
    const nacelle = spindle(
      w,
      root,
      'dark',
      [
        [0, -0.34],
        [0.13, -0.32],
        [0.17, -0.16],
        [0.14, 0.27],
        [0, 0.39],
      ],
      -1.35,
      -0.015,
      side * 0.49,
    );
    nacelle.rotation.z = -Math.PI / 2;
    const drive = w.cylinder(root, 'blue', 0.115, 0.035, -1.69, -0.015, side * 0.49);
    drive.rotation.z = Math.PI / 2;
    drive.material = w.material('blue', true);
    for (const x of [-1.57, -1.42, -1.27]) {
      const collar = w.ring(root, 'paper', 0.15, 0.008, x, -0.015, side * 0.49);
      collar.rotation.y = Math.PI / 2;
    }
    for (let i = 0; i < 6; i++) {
      w.box(root, 'navy', 0.022, 0.009, 0.095, -0.97 + i * 0.07, 0.227, side * 0.31);
    }
    for (const x of [0.35, 0.83]) {
      w.cylinder(root, 'dark', 0.11, 0.085, x, 0.21, side * 0.25, 0.09, 16);
      for (const offset of [-0.04, 0.04])
        w.beam(
          root,
          'paper',
          v(x, 0.26, side * 0.25 + offset),
          v(x + 0.32, 0.26, side * 0.25 + offset),
          0.02,
        );
    }
    for (const x of [-1.05, -0.78, -0.51])
      w.box(root, 'gold', 0.075, 0.025, 0.16, x, 0.18, side * 0.36).rotation.y = side * -0.2;
  }
  // Raised command island and long dorsal armour make the silhouette read as a capital ship.
  volume(w, root, 'dark', [
    [0.16, 0.86, 0.23, -0.42, 0],
    [0.3, 0.73, 0.2, -0.49, 0],
    [0.39, 0.42, 0.15, -0.57, 0],
  ]);
  volume(w, root, 'cream', [
    [0.34, 0.28, 0.18, -0.66, 0],
    [0.54, 0.23, 0.16, -0.72, 0],
    [0.64, 0.34, 0.22, -0.64, 0],
    [0.7, 0.25, 0.18, -0.71, 0],
  ]);
  w.ball(root, 'blue', 0.2, -0.48, 0.62, 0.12).scale.set(1.5, 0.3, 0.45);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const window = w.box(
        root,
        'blue',
        0.055,
        0.022,
        0.009,
        -0.88 + i * 0.067,
        0.47,
        side * 0.162,
      );
      window.castShadow = false;
    }
    for (let i = 0; i < 5; i++) {
      w.box(root, 'paper', 0.11, 0.008, 0.008, -0.12 + i * 0.16, 0.194, side * 0.365);
      w.cylinder(root, 'navy', 0.009, 0.009, -0.09 + i * 0.16, 0.2, side * 0.365, 0.009, 8);
    }
  }
  for (const z of [-0.09, 0.09]) w.beam(root, 'paper', v(-0.87, 0.69, z), v(-0.96, 0.9, z), 0.018);
  // Split forward armour and recessed cyan power cells give the prow a sharper silhouette.
  for (const side of [-1, 1]) {
    const blade = volume(w, root, 'paper', [
      [0.35, 0.07, 0.065, -0.09, side * 0.23],
      [1.15, 0.08, 0.075, -0.09, side * 0.19],
      [1.9, 0.025, 0.04, -0.075, side * 0.095],
      [2.1, 0.005, 0.008, -0.075, side * 0.055],
    ]);
    blade.rotation.z = -Math.PI / 2;
    const power = w.ball(root, 'blue', 0.075, -0.12, 0.13, side * 0.37, true);
    power.scale.set(3, 0.4, 0.45);
  }
  const reactor = w.cylinder(root, 'blue', 0.12, 0.08, -1.64, 0.05, 0);
  reactor.rotation.z = Math.PI / 2;
  reactor.material = w.material('blue', true);
  // The bay faces the viewer after reversing the expedition ship's direction.
  w.box(root, 'navy', 0.9, 0.28, 0.035, -0.48, -0.015, -0.43);
  for (const x of [-0.68, -0.39]) w.box(root, 'gold', 0.2, 0.15, 0.1, x, -0.07, -0.43);
  const hatch = moving(root);
  hatch.position.set(-0.48, 0.13, -0.48);
  w.box(hatch, 'cream', 0.94, 0.3, 0.045, 0, -0.15);
  w.box(hatch, 'navy', 0.78, 0.11, 0.02, 0, -0.16, -0.035);
  for (const x of [-0.35, 0.35]) w.box(hatch, 'gold', 0.035, 0.19, 0.02, x, -0.15, -0.035);
  const exhausts = [-0.49, 0.49].map((z) => particles(root, 'exhaust', v(-1.73, -0.015, z)));
  const plumes = repair
    ? []
    : [
        enginePlume(root, v(-1.74, -0.015, -0.49)),
        enginePlume(root, v(-1.74, -0.015, 0.49)),
        enginePlume(root, v(-1.69, 0.05, 0)),
      ];

  w.finish(root);
  root.userData.point = 'loot';
  refineModel(root, 'ship');
  return {
    root,
    hatch,
    anchor: v(-0.7, -0.3, -0.35),
    animate: (time, hover, active) => {
      root.position.y = root.userData.baseY + Math.sin(time * 0.6 + 2) * 0.035;
      hatch.rotation.x = repair ? 0 : (active ? 0.38 : 0.05) + hover * 0.55;
      exhausts.forEach((exhaust) => exhaust(time, repair ? 0 : 0.6 + hover * 0.2));
      plumes.forEach((plume) => plume(time));
    },
  };
}

export function placeOnSphere(model: Model, position: THREE.Vector3) {
  const up = position.clone().normalize();
  // Face down the local meridian so each facade is visible from its own longitude.
  const forward = v(up.x, 0, up.z)
    .addScaledVector(up, -(1 - up.y * up.y))
    .normalize();
  const right = up.clone().cross(forward).normalize();
  model.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, forward));
  model.root.position.copy(up.multiplyScalar(3.075));
}
export function makeReward(w: Workshop, parent: THREE.Object3D) {
  const root = moving(parent);
  root.position.set(-1.15, 0.5, 0.68);
  root.userData.point = 'reward';
  const gem = star(w, root, 0.13, 0, 0, 0);
  const orbit = w.ring(root, 'gold', 0.22, 0.008);
  orbit.rotation.x = 1.1;
  return { root, gem };
}
export function makeDrift(w: Workshop) {
  const root = new THREE.Group();
  root.userData.point = 'drift';
  w.cylinder(root, 'mint', 0.095, 0.3);
  w.cylinder(root, 'gold', 0.065, 0.06, 0, 0.18);
  w.box(root, 'paper', 0.1, 0.17, 0.02, 0, 0, 0.075);
  root.rotation.z = -0.25;
  w.finish(root);
  refineModel(root, 'drift');
  return root;
}
export function pointOf(object: THREE.Object3D): WorldPoint | undefined {
  let node: THREE.Object3D | null = object;
  while (node) {
    if (node.userData.point) return node.userData.point as WorldPoint;
    node = node.parent;
  }
  return undefined;
}
