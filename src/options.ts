/** 选择题选项的字母编号：显示为按钮上的 A/B/C 徽标（data-key），播报读字母名 */

/** 第 index 个选项的字母编号（0 → A） */
export const optionKey = (index: number): string => String.fromCharCode(65 + index);

/** 播报用：把选项列表拼成"A是××，B是yy"（optionKey 的字母由 zhSpeakNormalize 读成字母名） */
export const optionKeysText = (options: string[]): string =>
  options.map((option, index) => `${optionKey(index)}是${option}`).join('，');

/** 播报用：题干 + 选项整句（题干末尾句号去重，避免"……词。。选项有"） */
export const promptWithOptions = (prompt: string, options: string[]): string =>
  `${prompt.replace(/[。.]+$/, '')}。选项有：${optionKeysText(options)}。`;
