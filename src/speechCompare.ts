/* =====================================================================
   跟读对比：本地轻量打分（无需服务器、无需模型）
   1) 文本对比：有语音识别结果时，逐字 LCS 相似度打分
   2) 时长对比：无识别结果时，用"开口朗读时长 vs 原句参考时长"打分
   ===================================================================== */

export interface TextCompareResult {
  kind: 'text';
  /** 0-100 相似度 */
  score: number;
  /** 读对（LCS 匹配）的字数 */
  matched: number;
  /** 原句总字数 */
  total: number;
}

export interface TimeCompareResult {
  kind: 'time';
  /** 0-100 时长匹配度 */
  score: number;
  /** 孩子实际开口秒数 */
  voiceSec: number;
  /** 原句参考秒数 */
  refSec: number;
  /** 开口时间占录音总时长比例（0-1） */
  voiceRatio: number;
}

export type CompareResult = TextCompareResult | TimeCompareResult;

/** 去掉标点/空白，只留正文（用于对比） */
export function normalizeText(s: string): string {
  return s.replace(/[\s\u3000，。！？；、,.!?;:：""''‘’“”（）()《》〈〉<>…—·\-~～\n\r\t]/g, '');
}

/** 最长公共子序列长度（短句 O(n*m) 足够） */
export function lcsLen(a: string, b: string): number {
  const n = a.length;
  const m = b.length;
  if (n === 0 || m === 0) return 0;
  const dp: number[] = new Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    let prev = 0; // dp[i-1][j-1]
    for (let j = 1; j <= m; j++) {
      const tmp = dp[j]; // dp[i-1][j]
      if (a[i - 1] === b[j - 1]) dp[j] = prev + 1;
      else dp[j] = Math.max(dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[m];
}

/** 对比原句与孩子读出的文字（需语音识别结果） */
export function compareText(target: string, said: string): TextCompareResult {
  const a = normalizeText(target);
  const b = normalizeText(said);
  if (!a) return { kind: 'text', score: 0, matched: 0, total: 0 };
  const matched = lcsLen(a, b);
  const total = a.length;
  return { kind: 'text', score: Math.round((matched / total) * 100), matched, total };
}

/** 估算原句朗读时长（秒）：按汉字数 × 单字时长，rate 越小越慢 */
export function estimateSec(s: string, rate = 0.95): number {
  const han = s.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  return han * 0.3 * (0.95 / rate);
}

/** 时长对比：开口时长 vs 原句参考时长 */
export function compareTime(voiceSec: number, refSec: number, voiceRatio: number): TimeCompareResult {
  const ratio = refSec > 0 ? voiceSec / refSec : 1;
  const score = Math.max(0, Math.min(100, Math.round((1 - Math.abs(1 - ratio)) * 100)));
  return { kind: 'time', score, voiceSec, refSec, voiceRatio };
}

export type JudgeKey = 'judgeGreat' | 'judgeGood' | 'judgeOk' | 'judgeTry';

/** 文本得分 → 星级 + 评语 key */
export function judge(score: number): { stars: number; key: JudgeKey } {
  if (score >= 90) return { stars: 3, key: 'judgeGreat' };
  if (score >= 70) return { stars: 2, key: 'judgeGood' };
  if (score >= 50) return { stars: 1, key: 'judgeOk' };
  return { stars: 0, key: 'judgeTry' };
}

export type TimeJudgeKey = 'timeGreat' | 'timeFast' | 'timeSlow' | 'timeSilent';

/** 时长结果 → 星级 + 评语 key */
export function judgeTime(r: TimeCompareResult): { stars: number; key: TimeJudgeKey } {
  if (r.voiceRatio < 0.15) return { stars: 0, key: 'timeSilent' };
  const ratio = r.refSec > 0 ? r.voiceSec / r.refSec : 1;
  if (ratio >= 0.6 && ratio <= 1.4) return { stars: 3, key: 'timeGreat' };
  if (ratio < 0.6) return { stars: 2, key: 'timeFast' };
  if (ratio <= 2.2) return { stars: 2, key: 'timeSlow' };
  return { stars: 1, key: 'timeSlow' };
}
