export type PinyinTrial = { target: string; choices: string[]; prompt: string };
const T = (target: string, choices: string[], prompt = '听录音，选出你听到的音节。'): PinyinTrial => ({ target, choices, prompt });
export const CHINESE_PINYIN_TRIALS: Record<string, PinyinTrial[]> = {
  'pinyin-a-o-e': [T('á', ['ā', 'á', 'à']), T('è', ['è', 'é', 'ě'])],
  'pinyin-i-u-v': [T('ǔ', ['ǔ', 'ù', 'ǚ']), T('ǘ', ['ú', 'ǘ', 'ǜ'])],
  'pinyin-b-p-m-f': [T('pá', ['bá', 'pá', 'má']), T('fù', ['fǔ', 'fù', 'pù'])],
  'pinyin-d-t-n-l': [T('tǎ', ['dǎ', 'tǎ', 'tá']), T('nǐ', ['nǐ', 'lǐ', 'ní'])],
  'pinyin-g-k-h': [T('kǔ', ['gǔ', 'kǔ', 'hǔ']), T('huǒ', ['huǒ', 'hǒu', 'guǒ'])],
  'pinyin-j-q-x': [T('xià', ['xià', 'jià', 'qià']), T('qǔ', ['qù', 'qǔ', 'xǔ'])],
  'pinyin-z-c-s': [T('cā', ['zā', 'cā', 'sā']), T('sì', ['sì', 'sǐ', 'cì'])],
  'pinyin-zh-ch-sh-r': [T('chǎ', ['cǎ', 'chǎ', 'shǎ']), T('rè', ['rè', 'lè', 'shè'])],
  'pinyin-y-w': [T('yǔ', ['wǔ', 'yǔ', 'yù']), T('wá', ['yá', 'wá', 'wà'])],
  'pinyin-ai-ei-ui': [T('dài', ['dài', 'dèi', 'duì']), T('huí', ['hái', 'huí', 'huì'])],
  'pinyin-ao-ou-iu': [T('tóu', ['táo', 'tóu', 'tòu']), T('niú', ['niú', 'niǔ', 'liú'])],
  'pinyin-ie-ve-er': [T('xuě', ['xiě', 'xuě', 'xuè']), T('ěr', ['ér', 'ěr', 'è'])],
  'pinyin-an-en-in-un-vn': [T('mín', ['mín', 'míng', 'mǐn']), T('yún', ['yún', 'yóng', 'yùn'])],
  'pinyin-ang-eng-ing-ong': [T('fēng', ['fēn', 'fēng', 'fèng']), T('tóng', ['tóng', 'téng', 'tǒng'])],
};

// 迁移与延时复习材料不重复教材实验室的原题。
CHINESE_PINYIN_TRIALS['pinyin-a-o-e'].push(T('à', ["à", "á", "ǎ"]), T('ā', ["ā", "á", "ǎ"]));
CHINESE_PINYIN_TRIALS['pinyin-i-u-v'].push(T('í', ["í", "ì", "ǐ"]), T('ù', ["ú", "ù", "ǜ"]));
CHINESE_PINYIN_TRIALS['pinyin-b-p-m-f'].push(T('mǐ', ["mǐ", "mì", "bǐ"]), T('bà', ["bà", "pà", "bǎ"]));
CHINESE_PINYIN_TRIALS['pinyin-d-t-n-l'].push(T('lì', ["lì", "nì", "lí"]), T('tú', ["dú", "tú", "tǔ"]));
CHINESE_PINYIN_TRIALS['pinyin-g-k-h'].push(T('gé', ["gé", "ké", "gè"]), T('kuā', ["kuā", "guā", "huā"]));
CHINESE_PINYIN_TRIALS['pinyin-j-q-x'].push(T('jiā', ["jiā", "qiā", "xiā"]), T('xù', ["xù", "qù", "xǔ"]));
CHINESE_PINYIN_TRIALS['pinyin-z-c-s'].push(T('zá', ["zá", "cá", "zǎ"]), T('sū', ["sū", "zū", "sù"]));
CHINESE_PINYIN_TRIALS['pinyin-zh-ch-sh-r'].push(T('zhù', ["zù", "zhù", "chù"]), T('shí', ["sí", "shí", "shì"]));
CHINESE_PINYIN_TRIALS['pinyin-y-w'].push(T('yā', ["yā", "wā", "yá"]), T('wǒ', ["wǒ", "wò", "huǒ"]));
CHINESE_PINYIN_TRIALS['pinyin-ai-ei-ui'].push(T('tài', ["tài", "dài", "tuì"]), T('měi', ["měi", "méi", "mèi"]));
CHINESE_PINYIN_TRIALS['pinyin-ao-ou-iu'].push(T('liù', ["liù", "lòu", "liú"]), T('hǎo', ["hǎo", "hǒu", "hào"]));
CHINESE_PINYIN_TRIALS['pinyin-ie-ve-er'].push(T('bié', ["bié", "biě", "bèi"]), T('ér', ["ér", "ěr", "è"]));
CHINESE_PINYIN_TRIALS['pinyin-an-en-in-un-vn'].push(T('mén', ["mén", "méng", "mèn"]), T('jūn', ["jūn", "jǔn", "jǖn"]));
CHINESE_PINYIN_TRIALS['pinyin-ang-eng-ing-ong'].push(T('míng', ["mín", "míng", "mǐng"]), T('hóng', ["hóng", "hén", "hǒng"]));
