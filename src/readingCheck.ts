/** Matches actual recognition against the reading target; this is content matching, never a pronunciation score. */
export type ReadingMatch = { pass: boolean; coverage: number; precision: number; missing: string[] };
function tokens(text: string, language: 'en-US' | 'zh-CN'): string[] {
  const normalized = text.normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'");
  if (language === 'zh-CN') return Array.from(normalized.replace(/[\s\p{P}\p{S}]/gu, '').replace(/[0-9]/g, digit => '零一二三四五六七八九'[Number(digit)]));
  const expanded = normalized.replace(/\bi'm\b/g, 'i am').replace(/\bthat's\b/g, 'that is').replace(/\bit's\b/g, 'it is')
    .replace(/\bwhat's\b/g, 'what is').replace(/\bwho's\b/g, 'who is').replace(/\blet's\b/g, 'let us')
    .replace(/\bcan't\b/g, 'cannot').replace(/\b([a-z]+)n't\b/g, '$1 not').replace(/\b([a-z]+)'re\b/g, '$1 are')
    .replace(/\b([a-z]+)'ve\b/g, '$1 have').replace(/\b([a-z]+)'ll\b/g, '$1 will');
  const numerals = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
  return (expanded.match(/[a-z]+(?:'[a-z]+)?|\d+/g) ?? []).map(token => /^\d+$/.test(token) && Number(token) <= 20 ? numerals[Number(token)] : token);
}
export function matchReading(target: string, said: string, language: 'en-US' | 'zh-CN'): ReadingMatch {
  const expected = tokens(target, language), actual = tokens(said, language);
  if (!expected.length || !actual.length || expected.length > 1000 || actual.length > 1500) return { pass: false, coverage: 0, precision: 0, missing: expected.slice(0, 6) };
  const table = Array.from({ length: expected.length + 1 }, () => new Uint16Array(actual.length + 1));
  for (let i = 1; i <= expected.length; i++) for (let j = 1; j <= actual.length; j++) table[i][j] = expected[i - 1] === actual[j - 1] ? table[i - 1][j - 1] + 1 : Math.max(table[i - 1][j], table[i][j - 1]);
  const matched = table[expected.length][actual.length];
  const missing: string[] = []; let i = expected.length, j = actual.length;
  while (i > 0) {
    if (j > 0 && expected[i - 1] === actual[j - 1]) { i--; j--; }
    else if (j > 0 && table[i][j - 1] > table[i - 1][j]) j--;
    else { missing.unshift(expected[--i]); }
  }
  const coverage = matched / expected.length, precision = matched / actual.length;
  return { pass: coverage >= 0.85 && precision >= 0.85, coverage, precision, missing: missing.slice(0, 6) };
}
