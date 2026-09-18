import { describe, it, expect } from 'vitest';
import { zhSpeakNormalize } from '../speech';

describe('拼音朗读归一化', () => {
  it('单韵母/声母读成汉字音，不再按英文读', () => {
    expect(zhSpeakNormalize('a o e b p m f')).toBe('啊 喔 鹅 玻 坡 摸 佛');
    expect(zhSpeakNormalize('zh ch sh r')).toBe('知 吃 诗 日');
  });
  it('四声示范行保留带调字母、逗号分隔，交给引擎读纯韵母四声（不读成"妈"等整音节）', () => {
    expect(zhSpeakNormalize('ā á ǎ à ō ó ǒ ò ē é ě è')).toBe('ā，á，ǎ，à ō，ó，ǒ，ò ē，é，ě，è');
    expect(zhSpeakNormalize('ī í ǐ ì ǖ ǘ ǚ ǜ')).toBe('ī，í，ǐ，ì ǖ，ǘ，ǚ，ǜ');
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
