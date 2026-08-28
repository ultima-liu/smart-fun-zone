// 生成英文单词 IPA 音标词典（CMU 发音词典 + ARPABET→IPA 转换）
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const cmu = require('cmu-pronouncing-dictionary').dictionary;

const CONSONANTS = { B:'b', CH:'tʃ', D:'d', DH:'ð', F:'f', G:'ɡ', HH:'h', JH:'dʒ', K:'k', L:'l', M:'m', N:'n', NG:'ŋ', P:'p', R:'r', S:'s', SH:'ʃ', T:'t', TH:'θ', V:'v', W:'w', Y:'j', Z:'z', ZH:'ʒ' };
const VOWELS = { AA:'ɑ', AE:'æ', AO:'ɔ', AW:'aʊ', AY:'aɪ', EH:'ɛ', ER:'ɚ', EY:'eɪ', IH:'ɪ', IY:'i', OW:'oʊ', OY:'ɔɪ', UH:'ʊ', UW:'u' };

// 词典外的固定词（缩写等）
const OVERRIDES = {
  'pe': 'ˌpiːˈiː',
  'pe class': 'ˌpiːˈiː klæs',
};

function arpabetToIpa(arpabet) {
  const phones = arpabet.trim().split(/\s+/);
  let out = '';
  let sylStart = 0; // 当前音节在 out 中的起点
  for (const ph of phones) {
    const m = ph.match(/([012])$/);
    const base = m ? ph.slice(0, -1) : ph;
    const s = m ? m[1] : '';
    let ipa = VOWELS[base] ?? CONSONANTS[base] ?? base;
    if (base === 'AH') ipa = s === '1' ? 'ʌ' : 'ə';
    if (VOWELS[base] || base === 'AH') {
      // 元音：若带重音，重音号应加在本音节开头（sylStart 处）
      if (s === '1' || s === '2') {
        const mark = s === '1' ? 'ˈ' : 'ˌ';
        out = out.slice(0, sylStart) + mark + out.slice(sylStart);
        sylStart += 1;
      }
      out += ipa;
      sylStart = out.length; // 下一个音节从这里开始
    } else {
      out += ipa; // 辅音属于当前音节
    }
  }
  return out;
}

// 1) 收集全部英语课时 words
const dir = path.resolve('src', 'content', 'contents');
const words = new Set();
for (const f of fs.readdirSync(dir).filter((x) => /^english/.test(x) && x.endsWith('.ts'))) {
  const src = fs.readFileSync(path.join(dir, f), 'utf-8');
  const re = /words:\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const list = m[1].match(/['"]([^'"]*)['"]/g) ?? [];
    list.forEach((w) => {
      const raw = w.replace(/^['"]|['"]$/g, '').trim().toLowerCase();
      if (/^[a-z]+([ -][a-z]+)*$/.test(raw)) words.add(raw);
    });
  }
}

// 2) 查 CMU 转 IPA
function lookup(word) {
  if (OVERRIDES[word]) return OVERRIDES[word];
  const hit = cmu[word.toLowerCase()];
  if (hit) return arpabetToIpa(hit);
  // 短语/连字符：逐部分查
  const parts = word.split(/[ -]+/);
  if (parts.length > 1) {
    const mapped = parts.map((p) => lookup(p));
    if (mapped.every(Boolean)) return mapped.join(' ');
  }
  // 常见屈折回退：carrots→carrot
  for (const stem of [word.replace(/es$/, ''), word.replace(/s$/, ''), word.replace(/ing$/, '')]) {
    if (stem !== word && cmu[stem.toLowerCase()]) return arpabetToIpa(cmu[stem.toLowerCase()]);
  }
  // 复合词拆分：schoolbag → school+bag
  for (let i = 2; i < word.length - 1; i++) {
    const a = cmu[word.slice(0, i).toLowerCase()];
    const b = cmu[word.slice(i).toLowerCase()];
    if (a && b) return arpabetToIpa(a) + arpabetToIpa(b);
  }
  // 缩略：couldn → couldn't
  if (cmu[word + "'t"]) return arpabetToIpa(cmu[word + "'t"]);
  return '';
}

const out = {};
let missing = 0;
for (const w of words) {
  const ipa = lookup(w);
  if (ipa) out[w] = ipa;
  else missing++;
}
console.log('words:', words.size, 'with ipa:', Object.keys(out).length, 'missing:', missing);
console.log('missing sample:', [...words].filter((w) => !out[w]).slice(0, 15).join(', '));

const lines = ['// AUTO-GENERATED 英文词汇 → IPA 音标（CMU 词典，勿手改）',
  'export const ENGLISH_IPA: Record<string, string> = {'];
for (const [w, ipa] of Object.entries(out)) lines.push(`  '${w}': '${ipa}',`);
lines.push('};');
fs.writeFileSync(path.resolve('src', 'content', 'englishIpa.ts'), lines.join('\n') + '\n', 'utf-8');
console.log('written src/content/englishIpa.ts');
