/** 排序题使用稳定洗牌，避免待选卡片直接排成答案或整组倒序。 */
export function orderingOptions<T>(answer: readonly T[], seed: string, previous: readonly T[] = []): T[] {
  let state = 2166136261;
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  const result = [...answer];
  for (let i = result.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  const same = (a: readonly T[], b: readonly T[]) => a.length === b.length && a.every((item, i) => item === b[i]);
  const forbidden = (items: readonly T[]) => same(items, answer) || (answer.length > 2 && same(items, [...answer].reverse()));
  if (!forbidden(result) && !same(result, previous)) return result;
  // 不靠反复抽随机数；有多个有效排列时重排也避开上一轮。
  let fallback = forbidden(result) ? null : result;
  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      const candidate = [...result];
      [candidate[i], candidate[j]] = [candidate[j], candidate[i]];
      if (forbidden(candidate)) continue;
      fallback ??= candidate;
      if (!same(candidate, previous)) return candidate;
    }
  }
  // 两张不同卡片只有一个有效错序；空数组、单项或全相同材料无法打乱。
  return fallback ?? result;
}
