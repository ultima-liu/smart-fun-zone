import { preserveImageArt } from './imageArt';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Ink, Model, Workshop } from './models';

/** A floating handheld console with the recognisable cyan-left / red-right silhouette. */
export function createGameConsole(w: Workshop): Model {
  const root = new THREE.Group();
  const console = new THREE.Group();
  console.userData.keep = true;
  console.position.y = 1.02;
  console.rotation.z = -0.08;
  root.add(console);
  const surface = (ink: Ink, color: string, roughness: number, metalness = 0.08) => {
    const material = w.material(ink) as THREE.MeshPhysicalMaterial;
    material.color.set(color);
    material.map = material.bumpMap = null;
    material.roughness = roughness;
    material.metalness = metalness;
    material.transmission = 0;
    material.transparent = false;
    material.opacity = 1;
    material.clearcoat = 0.28;
    material.clearcoatRoughness = 0.3;
    material.envMapIntensity = 0.55;
    return material;
  };
  surface('navy', '#242e3b', 0.48, 0.24);
  surface('ink', '#121a23', 0.58);
  surface('cream', '#66798b', 0.35, 0.65);
  surface('paper', '#cbdde7', 0.4, 0.38);
  surface('blue', '#20bce6', 0.4);
  surface('coral', '#f14b4f', 0.4);
  surface('mint', '#65e99f', 0.45);
  const box = (
    ink: Ink,
    width: number,
    height: number,
    depth: number,
    radius: number,
    x = 0,
    y = 0,
    z = 0,
  ) =>
    w.mesh(
      console,
      w.geometry(
        `console-box:${width}:${height}:${depth}:${radius}`,
        () => new RoundedBoxGeometry(width, height, depth, 6, radius),
      ),
      ink,
      x,
      y,
      z,
    );
  const button = (ink: Ink, radius: number, x: number, y: number, z = 0.153, height = 0.025) => {
    const mesh = w.cylinder(console, ink, radius, height, x, y, z, radius, 32);
    mesh.rotation.x = Math.PI / 2;
    return mesh;
  };
  // Rounded solid housing, recessed screen bezel and separate controller rails.
  box('navy', 1.74, 1.08, 0.17, 0.06);
  box('ink', 1.65, 1.005, 0.025, 0.035, 0, 0, 0.09);
  for (const side of [-1, 1]) {
    box('cream', 0.024, 0.92, 0.18, 0.009, side * 0.875);
    box(side < 0 ? 'blue' : 'coral', 0.33, 1.08, 0.205, 0.09, side * 1.055);
    box('ink', 0.225, 0.054, 0.115, 0.02, side * 1.052, 0.52, -0.019);
    box('navy', 0.23, 0.022, 0.052, 0.01, side * 1.053, 0.49, 0.036);
    // Small rear screws keep the reverse view as a finished object.
    for (const y of [-0.43, 0.43]) button('cream', 0.012, side * 1.055, y, -0.11, 0.006);
  }
  const joystick = (x: number, y: number) => {
    button('navy', 0.1, x, y, 0.118, 0.017);
    button('ink', 0.068, x, y, 0.163, 0.074);
    const cap = button('cream', 0.066, x, y, 0.205, 0.01);
    cap.material = w.material('ink');
    const rim = w.ring(console, 'navy', 0.052, 0.006, x, y, 0.213);
    rim.userData.keep = false;
  };
  joystick(-1.055, 0.265);
  joystick(1.055, -0.16);
  // Four directional buttons on the left, four action buttons on the right.
  for (const [cx, cy] of [
    [-1.055, -0.12],
    [1.055, 0.26],
  ]) {
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      button('ink', 0.031, cx + Math.cos(angle) * 0.075, cy + Math.sin(angle) * 0.075);
      button(
        'paper',
        0.009,
        cx + Math.cos(angle) * 0.075,
        cy + Math.sin(angle) * 0.075,
        0.169,
        0.002,
      );
    }
  }
  box('ink', 0.044, 0.01, 0.012, 0.004, -0.965, 0.421, 0.117);
  box('ink', 0.044, 0.01, 0.012, 0.004, 0.965, 0.421, 0.117);
  box('ink', 0.01, 0.044, 0.012, 0.004, 0.965, 0.421, 0.117);
  box('ink', 0.045, 0.045, 0.013, 0.009, -1.052, -0.392, 0.111);
  button('ink', 0.032, 1.052, -0.392, 0.113, 0.013);
  button('paper', 0.016, 1.052, -0.392, 0.122, 0.002);
  // Screen artwork is generated separately; an unlit display preserves its fine detail.
  const screenTexture = w.loadTexture(
    `${import.meta.env.BASE_URL}assets/juan-world/park-game-screen-v1.webp`,
    () => {
      screen.needsUpdate = true;
    },
    '#4badd9',
  );
  const screen = new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false });
  preserveImageArt(screen);
  w.effects.add(screen);
  const display = w.mesh(
    console,
    w.geometry('console-display', () => new THREE.PlaneGeometry(1.49, 0.839)),
    'paper',
    0,
    0,
    0.108,
  );
  display.material = screen;
  display.castShadow = display.receiveShadow = false;
  display.userData.keep = true;
  const glass = new THREE.Mesh(
    w.geometry('console-touch-glass', () => new THREE.PlaneGeometry(1.49, 0.839)),
    w.glass('#b7d5e4').clone(),
  );
  const touchGlass = glass.material as THREE.MeshPhysicalMaterial;
  touchGlass.opacity = 0.04;
  touchGlass.transmission = 0.25;
  touchGlass.roughness = 0.08;
  w.effects.add(touchGlass);
  glass.position.z = 0.111;
  glass.userData.keep = true;
  glass.castShadow = glass.receiveShadow = false;
  console.add(glass);
  // An unobtrusive top highlight suggests glass without washing out the game image.
  box('cream', 1.44, 0.007, 0.005, 0.002, 0, 0.433, 0.107);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++)
      box('ink', 0.006, 0.046, 0.006, 0.002, side * (0.72 + i * 0.02), -0.466, 0.105);
  }
  for (let i = 0; i < 9; i++)
    box('ink', 0.046, 0.008, 0.012, 0.003, -0.36 + i * 0.09, 0.534, -0.01);
  box('ink', 0.105, 0.008, 0.044, 0.004, 0, -0.539, -0.007);
  box('cream', 0.35, 0.78, 0.009, 0.014, 0.575, -0.04, -0.093);
  box('navy', 0.331, 0.76, 0.015, 0.01, 0.575, -0.04, -0.102);
  for (let i = 0; i < 18; i++)
    box('ink', 0.004, 0.13, 0.005, 0.001, -0.51 + i * 0.018, 0.19, -0.09);
  box('cream', 0.14, 0.015, 0.007, 0.003, -0.2, -0.497, -0.091);
  for (let i = 0; i < 5; i++)
    box('gold', 0.008, 0.012, 0.004, 0.001, -0.24 + i * 0.02, -0.497, -0.096);
  for (const x of [-0.78, 0.78])
    for (const y of [-0.445, 0.445]) button('cream', 0.012, x, y, -0.095, 0.006);
  w.finish(console);
  w.finish(root);
  return {
    root,
    anchor: new THREE.Vector3(-1.02, 0.48, 0.2),
    animate(time, hover) {
      root.position.y = root.userData.baseY + Math.sin(time * 0.42) * 0.045;
      console.rotation.z = -0.08 + Math.sin(time * 0.35) * 0.018;
      console.position.z = hover * 0.055;
    },
  };
}
