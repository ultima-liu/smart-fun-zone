import { describe, expect, it } from 'vitest';
import { npcMeta } from '../content/npc';
import { voiceForProfile } from '../volcTts';

describe('NPC voice routing', () => {
  it('keeps the school principal on male metadata', () => {
    expect(npcMeta('阿光').gender?.zh).toBe('男');
    expect(npcMeta('星校长阿光').gender?.zh).toBe('男');
    expect(npcMeta('阿光').voicePitch).toBe(-8);
  });

  it('never falls back to a female speaker for male profiles', () => {
    expect(voiceForProfile('male-child', 'zh')).toContain('zh_male_');
    expect(voiceForProfile('male-adult', 'zh')).toContain('zh_male_');
    expect(voiceForProfile('male-adult', 'en')).toContain('en_male_');
  });

  it('keeps the school entrance greeting separate from the following story', () => {
    expect(npcMeta('阿光').voicePitch).toBeLessThan(0);
  });
});
