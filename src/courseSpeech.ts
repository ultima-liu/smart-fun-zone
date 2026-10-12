/** Letter pronunciation is a property of the course, not the interface language. */
export type CourseSpeechSubject = 'chinese' | 'english';
export type SpeechSynthesisOptions = { pronunciation?: string[]; context?: string[] };
export function currentSpeechSubject(): CourseSpeechSubject | undefined {
  const route = window.location.hash;
  if (/\/(chinese-course|chinese-review|chinese-practice|subject\/chinese)(?:\/|\?|$)/.test(route)) return 'chinese';
  if (/\/(english-course|english-review|english-practice|english-textbook|subject\/english)(?:\/|\?|$)/.test(route)) return 'english';
  return undefined;
}
const initialNames: Record<string, string> = {
  b:'bo',p:'po',m:'mo',f:'fo',d:'de',t:'te',n:'ne',l:'le',g:'ge',k:'ke',h:'he',
  j:'ji',q:'qi',x:'xi',zh:'zhi',ch:'chi',sh:'shi',r:'ri',z:'zi',c:'ci',s:'si',y:'yi',w:'wu',
};
const finals: Record<string, string> = { i:'yi',u:'wu',v:'yu',ui:'wei',iu:'you',ie:'ye',ve:'yue',in:'yin',un:'wen',vn:'yun',ing:'ying' };
const marks: Record<string, number> = { '\u0304':1,'\u0301':2,'\u030c':3,'\u0300':4 };
/** Preserve ü independently of its tone; syllables retain their original tone. */
export function pinyinPronunciation(value: string): string | null {
  const decomposed = value.toLowerCase().normalize('NFD');
  const tone = [...decomposed].map(char => marks[char]).find(Boolean) ?? 1;
  let base = decomposed.replace(/u\u0308/g, 'v').replace(/[\u0300-\u036f]/g, '');
  if (initialNames[base]) base = initialNames[base];
  else if (finals[base]) base = finals[base];
  if (!/^(?:(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?(?:a|o|e|i|u|v|ai|ei|ao|ou|an|en|in|un|vn|ang|eng|ing|ong|ia|ie|ua|uo|ue|ve|iao|iou|iu|uai|uei|ui|ian|uan|van|iang|uang|iong)|er)$/.test(base)) return null;
  return `${base}${tone}`;
}
const letterNames: Record<string,string> = {
  a:'ay',b:'bee',c:'see',d:'dee',e:'ee',f:'eff',g:'gee',h:'aitch',i:'eye',j:'jay',k:'kay',l:'ell',m:'em',
  n:'en',o:'oh',p:'pee',q:'cue',r:'ar',s:'ess',t:'tee',u:'you',v:'vee',w:'double you',x:'ex',y:'why',z:'zee',
};
/** One multilingual utterance; pronunciation dictionaries never match inside another English word. */
export function courseSpeechRequest(text: string, _lang: 'zh' | 'en', subject: CourseSpeechSubject) {
  const pronunciation: string[] = [];
  const seen = new Map<string,string>();
  const marker = (key: string, reading: string) => {
    if (!seen.has(key)) {
      // Each marker is unique and contains no letters; no greedy i→... replacement inside xi/ice.
      let index = seen.size + 1;
      let name = `读音${index}号`;
      while (source.includes(name) || [...seen.values()].includes(name)) name = `读音${++index}号`;
      seen.set(key,name); pronunciation.push(`${name}/${reading}`);
    }
    return seen.get(key)!;
  };
  const source = text.normalize('NFC');
  const prepared = source.replace(/[a-züāáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜ]+(?:['’][a-z]+)?/gi, (token: string, offset: number) => {
    if (subject === 'chinese') {
      const phoneme = pinyinPronunciation(token);
      if (phoneme) return marker(token, `(${phoneme})`);
      // Unrecognised abbreviations still use pinyin letter readings, never English alphabet names.
      const sounds = [...token].map(pinyinPronunciation);
      return sounds.every(Boolean) ? marker(token, sounds.map(sound => `(${sound})`).join('')) : token;
    }
    if (token.length !== 1 || !letterNames[token.toLowerCase()]) return token;
    // The article in "a cat" is a word. A quoted/labelled/standalone a is a letter.
    const before = source.slice(0,offset), after = source.slice(offset + token.length);
    if (token.toLowerCase() === 'a' && /^\s+[a-z]{2,}\b/i.test(after) && !/(?:字母|letter\s*)[“"'‘]?\s*$/i.test(before)) return token;
    return marker(token, letterNames[token.toLowerCase()]);
  });
  const mixed = /[\u4e00-\u9fff]/.test(source);
  return {
    text: prepared, lang: subject === 'chinese' || mixed ? 'zh' as const : 'en' as const,
    options: {
      pronunciation,
      context: [subject === 'chinese'
        ? '这是语文拼音课程。字母、韵母和音节按汉语拼音朗读，保留声调；声母名称使用呼读音。整句自然连贯，不在字母前后额外停顿。'
        : '这是英语课程。独立字母按英文字母名称读，英语单词与句子正常读。中文说明和英文内容用同一音色自然连贯朗读，不在语言切换处额外停顿。'],
    } satisfies SpeechSynthesisOptions,
  };
}
