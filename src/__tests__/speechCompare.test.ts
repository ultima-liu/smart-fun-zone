import { describe, expect, it } from 'vitest';
import { compareText, compareTime, estimateSec, judge, judgeTime, lcsLen, normalizeText } from '../speechCompare';

describe('normalizeText', () => {
  it('去掉标点与空白', () => {
    expect(normalizeText('春 天来了，真美！')).toBe('春天来了真美');
  });
});

describe('lcsLen', () => {
  it('完全一致', () => {
    expect(lcsLen('春天来了', '春天来了')).toBe(4);
  });
  it('部分匹配', () => {
    expect(lcsLen('春天来了', '春来天')).toBe(2); // 春、来
  });
  it('空串', () => {
    expect(lcsLen('', 'abc')).toBe(0);
    expect(lcsLen('abc', '')).toBe(0);
  });
});

describe('compareText', () => {
  it('全对 100 分', () => {
    const r = compareText('春天来了，真美！', '春天来了真美');
    expect(r).toEqual({ kind: 'text', score: 100, matched: 6, total: 6 });
  });
  it('读错一半约 50 分', () => {
    const r = compareText('小兔子乖乖', '小兔子快开');
    expect(r.score).toBeGreaterThanOrEqual(40);
    expect(r.score).toBeLessThanOrEqual(60);
  });
  it('完全没读对 0 分', () => {
    const r = compareText('小小竹排', '大大木筏');
    expect(r.score).toBe(0);
  });
});

describe('judge', () => {
  it('星级分档', () => {
    expect(judge(95).stars).toBe(3);
    expect(judge(80).stars).toBe(2);
    expect(judge(60).stars).toBe(1);
    expect(judge(20).stars).toBe(0);
  });
  it('key 有评语文案', () => {
    const keys = ['judgeGreat', 'judgeGood', 'judgeOk', 'judgeTry'];
    expect(keys).toContain(judge(100).key);
  });
});

describe('estimateSec', () => {
  it('按汉字数估算', () => {
    expect(estimateSec('春天来了，真美！')).toBeCloseTo(6 * 0.3, 5);
    expect(estimateSec('abc', 0.95)).toBe(0);
  });
});

describe('compareTime / judgeTime', () => {
  it('时长刚好 → 高分且 3 星', () => {
    const ref = estimateSec('春天来了真美', 0.95);
    const r = compareTime(ref, ref, 0.9);
    expect(r.kind).toBe('time');
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(judgeTime(r).stars).toBe(3);
    expect(judgeTime(r).key).toBe('timeGreat');
  });
  it('读太快 → 2 星 timeFast', () => {
    const ref = estimateSec('春天来了真美', 0.95);
    const r = compareTime(ref * 0.4, ref, 0.9);
    expect(judgeTime(r).stars).toBe(2);
    expect(judgeTime(r).key).toBe('timeFast');
  });
  it('没开口 → 0 星 timeSilent', () => {
    const ref = estimateSec('春天来了真美', 0.95);
    const r = compareTime(0, ref, 0.02);
    expect(judgeTime(r).stars).toBe(0);
    expect(judgeTime(r).key).toBe('timeSilent');
  });
});
