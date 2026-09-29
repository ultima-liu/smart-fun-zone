/**
 * 角色美术资源的唯一入口。
 *
 * 角色立绘为独立 WebP，不使用合图或运行时裁切。页面不要直接拼接资源路径，
 * 统一通过这里按角色/卡牌 id 获取，便于图鉴、剧情、主页与后续换装复用。
 * 小卷例外：直接复用全局学习助手的 Mascot SVG，不在此维护副本。
 */
export const CHARACTER_PORTRAITS = {
  'npc-a-guang': '/assets/npc-a-guang-v3.webp',
  'npc-tie-tuo': '/assets/npc-tie-tuo-v3.webp',
  'npc-dang-dang': '/assets/npc-dang-dang-v3.webp',
  'npc-pao-pao': '/assets/npc-pao-pao-v3.webp',
  'brook-captain': '/assets/cards/brook-team/brook-captain.webp',
  'brook-xing-shan': '/assets/cards/brook-team/xing-shan-scout.webp',
  'brook-yan-dun': '/assets/cards/brook-team/yan-dun-guardian.webp',
  'brook-lu-mi': '/assets/cards/brook-team/lu-mi-medic.webp',
  'bruco-red-hero': '/assets/cards/bruco-team/bruco-red-hero.webp',
  'bruco-lulu': '/assets/cards/bruco-team/bruco-lulu.webp',
  'bruco-coco': '/assets/cards/bruco-team/bruco-coco.webp',
  'bruco-purple-flight': '/assets/cards/bruco-team/bruco-purple-flight.webp',
  'bruco-bronze-guard': '/assets/cards/bruco-team/bruco-bronze-guard.webp',
  'bruco-blue-glider': '/assets/cards/bruco-team/bruco-blue-glider.webp',
  'bruco-red-04': '/assets/cards/bruco-team/bruco-red-04.webp',
  'bruco-green-03': '/assets/cards/bruco-team/bruco-green-03.webp',
  'bruco-blue-05': '/assets/cards/bruco-team/bruco-blue-05.webp',
  'bruco-orange-sprinter': '/assets/cards/bruco-team/bruco-orange-sprinter.webp',
  'bruco-purple-skater': '/assets/cards/bruco-team/bruco-purple-skater.webp',
  'paw-ryder': '/assets/cards/paw-patrol/ryder.webp',
  'paw-chase': '/assets/cards/paw-patrol/chase.webp',
  'paw-marshall': '/assets/cards/paw-patrol/marshall.webp',
  'paw-rubble': '/assets/cards/paw-patrol/rubble.webp',
  'paw-skye': '/assets/cards/paw-patrol/skye.webp',
  'paw-rocky': '/assets/cards/paw-patrol/rocky.webp',
  'paw-zuma': '/assets/cards/paw-patrol/zuma.webp',
} as const;

/** 场景/对话使用中文 NPC 名称，集中在此映射到图鉴卡角色 id。 */
export const NPC_CHARACTER_IDS: Record<string, CharacterPortraitId> = {
  阿光: 'npc-a-guang',
  铁砣: 'npc-tie-tuo',
  铛铛: 'npc-dang-dang',
  泡泡: 'npc-pao-pao',
};

export type CharacterPortraitId = keyof typeof CHARACTER_PORTRAITS;

export function characterPortrait(id: string): string | undefined {
  return CHARACTER_PORTRAITS[id as CharacterPortraitId];
}

export function npcPortrait(npcName: string): string | undefined {
  const id = NPC_CHARACTER_IDS[npcName];
  return id ? CHARACTER_PORTRAITS[id] : undefined;
}
