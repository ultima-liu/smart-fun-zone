import * as THREE from 'three';
import type { PlaceId } from './places';

// Each facility has its own surface response as well as its own colour family.
const SURFACES: Record<PlaceId, THREE.MeshPhysicalMaterialParameters> = {
  school: {},
  archive: {},
  hq: {},
  dock: { roughness: 0.68, metalness: 0.82, clearcoat: 0 },
  supply: { roughness: 0.38, metalness: 0.67, clearcoat: 0.25 },
  park: { roughness: 0.28, metalness: 0.65, clearcoat: 0.5, clearcoatRoughness: 0.35 },
};
const COLOURS: Record<PlaceId, Record<string, string>> = {
  school: {},
  archive: {},
  hq: {},
  dock: {
    cream: '#b3c4d0',
    paper: '#d3e0e5',
    navy: '#7c96a8',
    dark: '#8ba3b3',
    blue: '#ffb642',
    mint: '#4de6b3',
    gold: '#edb43d',
  },
  supply: {
    cream: '#9eb8c9',
    paper: '#d5e8f0',
    navy: '#7593a9',
    dark: '#8ca7b8',
    coral: '#df613b',
    blue: '#4cd9ff',
    mint: '#5aeadc',
  },
  park: {
    cream: '#7e49ac',
    paper: '#ddaafa',
    navy: '#907baa',
    dark: '#a18eb7',
    blue: '#40ceff',
    water: '#8c42c4',
    pink: '#ff47ba',
    mint: '#66ffc9',
    gold: '#ffe66b',
    coral: '#ff9760',
  },
};

/** Fine neutral panels multiply each facility's original tint; one map per facility. */
export function panelTexture(place: PlaceId) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#eeeeee';
  ctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y++) {
    const value = 228 + Math.sin(y * 2.7) * 5;
    ctx.fillStyle = `rgb(${value},${value},${value})`;
    ctx.fillRect(0, y, 512, 1);
  }
  ctx.strokeStyle = '#a3a3a3';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(12, 12, 488, 488);
  ctx.strokeStyle = '#fafafa';
  ctx.lineWidth = 1;
  ctx.strokeRect(15, 15, 482, 482);
  for (const x of [32, 480])
    for (const y of [32, 480]) {
      ctx.fillStyle = '#8c8c8c';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e4e4e4';
      ctx.fillRect(x - 3, y - 1, 6, 1);
    }
  if (place === 'supply' || place === 'dock') {
    ctx.strokeStyle = '#b5b5b5';
    ctx.strokeRect(62, 62, 388, 388);
    ctx.fillStyle = '#929292';
    ctx.fillRect(89, 100, 132, 214);
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = '#dbdbdb';
      ctx.fillRect(94, 106 + i * 14, 122, 8);
      ctx.fillStyle = '#a9a9a9';
      ctx.fillRect(94, 114 + i * 14, 122, 2);
    }
    ctx.strokeStyle = '#969696';
    ctx.strokeRect(260, 100, 151, 214);
    ctx.fillStyle = '#d8d8d8';
    ctx.fillRect(267, 107, 137, 200);
    ctx.strokeStyle = '#ababab';
    ctx.strokeRect(300, 190, 71, 62);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = '#a0a0a0';
      ctx.fillRect(92 + i * 29, 355, 19, 3);
    }
    ctx.fillStyle = '#929292';
    ctx.fillRect(282, 372, 98, 2);
    ctx.fillRect(282, 380, 65, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function facilitySurface(
  place: PlaceId,
  ink: string,
  glow: boolean,
  texture: THREE.Texture,
): THREE.MeshPhysicalMaterialParameters {
  const color = COLOURS[place][ink];
  if (glow)
    return {
      // LEDs emit their own colour rather than adding a white reflection on top of it.
      color: '#000000',
      ...(color ? { emissive: color } : {}),
      emissiveIntensity: 1.45,
      metalness: 0,
      roughness: 1,
      clearcoat: 0,
    };
  const glass = ink === 'blue' || ink === 'water';
  if (glass)
    return {
      ...(color ? { color } : {}),
      roughness: 0.26,
      metalness: 0.1,
      clearcoat: 0.28,
      clearcoatRoughness: 0.42,
      specularIntensity: 0.42,
      envMapIntensity: 0.24,
      transmission: 0.3,
      thickness: 0.2,
      transparent: true,
      opacity: 0.86,
      emissive: color ?? '#218bba',
      emissiveIntensity: 0.2,
    };
  return {
    ...SURFACES[place],
    ...(place === 'archive' && ink === 'wood' ? { roughness: 0.62, metalness: 0.06 } : {}),
    ...(place === 'supply' && (ink === 'dark' || ink === 'navy')
      ? { metalness: 0.72, roughness: 0.4, clearcoat: 0.12 }
      : {}),
    ...(color ? { color } : {}),
    ...(['cream', 'dark', 'navy'].includes(ink)
      ? { map: texture, bumpMap: texture, bumpScale: place === 'dock' ? 0.0025 : 0.0012 }
      : {}),
  };
}
