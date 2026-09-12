/**
 * 角色美术资源的唯一入口。
 *
 * NPC 写实立绘为独立透明 PNG，不使用合图或运行时裁切。页面不要直接拼接资源路径，
 * 统一通过这里按角色/卡牌 id 获取，便于图鉴、剧情、主页与后续换装复用。
 * 小卷例外：直接复用全局学习助手的 Mascot SVG，不在此维护副本。
 */
export const CHARACTER_PORTRAITS = {
  'npc-a-guang': '/assets/npc-a-guang-v3.png',
  'npc-tie-tuo': '/assets/npc-tie-tuo-v3.png',
  'npc-dang-dang': '/assets/npc-dang-dang-v3.png',
  'npc-pao-pao': '/assets/npc-pao-pao-v3.png',
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
