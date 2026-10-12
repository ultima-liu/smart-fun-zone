import { describe, expect, it } from 'vitest';
import { normalizeSpokenText } from '../components/VoiceField';

describe('数学口述输入的有限读数转换', () => {
  it('保留二和两的数量，并正确转换十几与二十', () => {
    expect(normalizeSpokenText('九加四等于十三。', 'math')).toBe('9＋4＝13');
    expect(normalizeSpokenText('八加九等于十七', 'math')).toBe('8＋9＝17');
    expect(normalizeSpokenText('二加两等于四', 'math')).toBe('2＋2＝4');
    expect(normalizeSpokenText('二十减十等于十', 'math')).toBe('20－10＝10');
    expect(normalizeSpokenText('８ 加 ９ 等于 １７', 'math')).toBe('8＋9＝17');
  });
  it('自由理由按文字保留，不作算式或数学正确性推断', () => {
    expect(normalizeSpokenText('我先给九凑十。', 'text')).toBe('我先给九凑十');
    expect(normalizeSpokenText('一百加三', 'math')).toContain('百');
  });
});
