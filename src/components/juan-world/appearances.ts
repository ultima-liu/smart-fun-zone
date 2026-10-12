export const WORLD_APPEARANCES = [
  {
    id: 'rock',
    name: { zh: '岩态', en: 'Rock' },
    detail: { zh: '地层陨坑 · 岩屑星环', en: 'Cratered strata · Debris rings' },
    accent: '#ab86f2',
    poster: 'scene-poster.png',
  },
  {
    id: 'gas',
    name: { zh: '气态', en: 'Gas' },
    detail: { zh: '铜橙云带 · 旋涡风暴', en: 'Copper clouds · Cyclonic storms' },
    accent: '#da955e',
    poster: 'scene-gas.png',
  },
  {
    id: 'ice',
    name: { zh: '冰态', en: 'Ice' },
    detail: { zh: '冰川裂隙 · 碎冰星环', en: 'Glacial crevasses · Ice rings' },
    accent: '#87d8e9',
    poster: 'scene-ice.png',
  },
  {
    id: 'star',
    name: { zh: '恒星', en: 'Star' },
    detail: { zh: '颗粒光球 · 等离子星环', en: 'Granular photosphere · Plasma rings' },
    accent: '#f5b15e',
    poster: 'scene-star.png',
  },
] as const;
export type WorldAppearance = (typeof WORLD_APPEARANCES)[number]['id'];
export function readAppearance(childId: string): WorldAppearance {
  try {
    const stored = localStorage.getItem(`sfz-world-appearance-v1:${childId}`);
    return WORLD_APPEARANCES.find((item) => item.id === stored)?.id ?? 'rock';
  } catch {
    return 'rock';
  }
}
export function rememberAppearance(childId: string, appearance: WorldAppearance) {
  try {
    localStorage.setItem(`sfz-world-appearance-v1:${childId}`, appearance);
  } catch {
    // A blocked preference store does not prevent changing the current scene.
  }
}
