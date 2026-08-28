import { describe, it, expect } from 'vitest';
import { DICT } from '../i18n';

describe('i18n 字典', () => {
  const keys = Object.keys(DICT);

  it('所有 key 都有中英文', () => {
    for (const key of keys) {
      const entry = DICT[key];
      expect(entry, `key "${key}" 缺少 zh`).toHaveProperty('zh');
      expect(entry, `key "${key}" 缺少 en`).toHaveProperty('en');
      expect(entry.zh.length, `key "${key}" 中文为空`).toBeGreaterThan(0);
      expect(entry.en.length, `key "${key}" 英文为空`).toBeGreaterThan(0);
    }
  });

  it('key 数量不少于 60（覆盖主要界面文案）', () => {
    expect(keys.length).toBeGreaterThanOrEqual(60);
  });

  it('占位符 {} 在双语中一致', () => {
    for (const key of keys) {
      const zhVars = DICT[key].zh.match(/\{[a-zA-Z]+\}/g) ?? [];
      const enVars = DICT[key].en.match(/\{[a-zA-Z]+\}/g) ?? [];
      expect(zhVars.sort(), `key "${key}" 占位符不一致`).toEqual(enVars.sort());
    }
  });
});
