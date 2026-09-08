import { describe, it, expect } from 'vitest';
import { zhSpeakNormalize } from '../speech';

describe('拼音朗读归一化', () => {
  it('单韵母/声母读成汉字音，不再按英文读', () => {
    expect(zhSpeakNormalize('a o e b p m f')).toBe('啊 喔 鹅 玻 坡 摸 佛');
    expect(zhSpeakNormalize('zh ch sh r')).toBe('知 吃 诗 日');
  });
  it('带调字母读成对应的四声示范汉字', () => {
    expect(zhSpeakNormalize('ā á ǎ à ō ó ǒ ò ē é ě è')).toBe('妈 麻 马 骂 摸 魔 抹 墨 哥 格 葛 个');
    expect(zhSpeakNormalize('ī í ǐ ì ǖ ǘ ǚ ǜ')).toBe('衣 姨 以 意 迂 鱼 雨 玉');
  });
  it('音节/复韵母读成对应汉字', () => {
    expect(zhSpeakNormalize('bà 爸 mā 妈')).toBe('爸 爸 妈 妈');
    expect(zhSpeakNormalize('ai ei ui bái xī')).toBe('哀 诶 威 白 西');
  });
  it('拼读等场景的孤立带调字母只读字母名，不读示范字', () => {
    expect(zhSpeakNormalize('b—à→bà 爸 mā 妈')).toBe('玻—啊→爸 爸 妈 妈');
  });
  it('纯汉字内容不受影响', () => {
    expect(zhSpeakNormalize('天气凉了，树叶黄了。')).toBe('天气凉了，树叶黄了。');
  });
});
