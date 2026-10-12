import { preserveImageArt } from './imageArt';
import * as THREE from 'three';
import type { Model, Workshop } from './models';

/** ImageGen preserves the supplied tower, orange cabins and floating metal garden. */
export function createHeadquarters(w: Workshop): Model {
  const root = new THREE.Group();
  let alphaPixels: Uint8ClampedArray | undefined;
  const maskWidth = 256,
    maskHeight = Math.round((maskWidth * 1482) / 1062);
  const texture = w.loadTexture(
    `${import.meta.env.BASE_URL}assets/juan-world/hq-floating-citadel-v2.webp`,
    (loaded) => {
      const mask = document.createElement('canvas');
      mask.width = maskWidth;
      mask.height = maskHeight;
      const context = mask.getContext('2d', { willReadFrequently: true })!;
      context.drawImage(loaded.image as HTMLImageElement, 0, 0, maskWidth, maskHeight);
      alphaPixels = context.getImageData(0, 0, maskWidth, maskHeight).data;
      image.visible = true;
    },
  );
  // Keep the illustration's original colour and baked light in all four planet themes.
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color: '#ffffff',
    transparent: true,
    alphaTest: 0.08,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  preserveImageArt(material);
  w.effects.add(material);
  const image = new THREE.Mesh(
    w.geometry('hq:reference-panel-v2', () => new THREE.PlaneGeometry((3.25 * 1062) / 1482, 3.25)),
    material,
  );
  image.position.y = 0.4;
  image.visible = false;
  image.userData.keep = true;
  root.add(image);
  // Transparent sky around the cutout must not intercept clicks on the planet or facilities.
  const planeRaycast = image.raycast.bind(image);
  image.raycast = (raycaster, intersections) => {
    const candidates: THREE.Intersection[] = [];
    planeRaycast(raycaster, candidates);
    for (const hit of candidates) {
      if (!image.visible || !alphaPixels || !hit.uv) continue;
      const x = Math.min(maskWidth - 1, Math.max(0, Math.floor(hit.uv.x * maskWidth))),
        y = Math.min(maskHeight - 1, Math.max(0, Math.floor((1 - hit.uv.y) * maskHeight)));
      if (alphaPixels[(y * maskWidth + x) * 4 + 3] >= 21) intersections.push(hit);
    }
  };
  return {
    root,
    anchor: new THREE.Vector3(0, -1.05, 0.08),
    animate: (time, hover) => {
      root.position.y = (root.userData.baseY ?? 0) + Math.sin(time * 0.45) * 0.018 + hover * 0.025;
    },
  };
}
