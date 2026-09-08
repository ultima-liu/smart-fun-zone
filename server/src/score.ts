/* 跟读评测评分：可插拔。
   - 当前实现：字符级编辑距离 + 声调归一化，给出 0-100 分与准确率。
   - 生产可替换为 ASR（讯飞/火山）+ 对齐打分，接口保持 scoreText(target, transcript)。 */

function stripToneMarks(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalize(s: string): string {
  return stripToneMarks(s)
    .replace(/\s+/g, '')
    .replace(/[，。！？、；：""''“”‘’…—·,.!?;:'"-]/g, '')
    .toLowerCase();
}

/** Levenshtein 距离 */
function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[n];
}

export interface ScoreResult {
  score: number;
  accuracy: number;
}

export function scoreText(target: string, transcript: string): ScoreResult {
  const t = normalize(target);
  const r = normalize(transcript);
  if (!t) return { score: 0, accuracy: 0 };
  if (!r) return { score: 0, accuracy: 0 };
  const dist = editDistance(t, r);
  const accuracy = Math.max(0, 1 - dist / t.length);
  // 得分：以准确率为基础，长度偏差再微调，满分 100
  const score = Math.round(Math.min(1, accuracy * 1.05) * 100);
  return { score, accuracy: Math.round(accuracy * 100) / 100 };
}
