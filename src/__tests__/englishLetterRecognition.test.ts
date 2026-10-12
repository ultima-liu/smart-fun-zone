import { expect, it } from 'vitest';
import { ENGLISH_G3_UPPER_UNITS } from '../content/englishGrade3Upper';
import { englishLetterNarration, englishLetterWord } from '../content/englishLetterRecognition';
import { courseSpeechRequest } from '../courseSpeech';

it('六单元全部 52 个字母例词都有中文释义，抽象词和人名不配误导图片',()=>{
  const words=ENGLISH_G3_UPPER_UNITS.flatMap(unit=>unit.letters.items.flatMap(item=>item.words));
  expect(words).toHaveLength(52);
  for(const word of words) expect(englishLetterWord(word).meaning,word).toMatch(/[\u4e00-\u9fff]/);
  expect(englishLetterWord('orange')).toMatchObject({meaning:'橙子',picture:'orange'});
  expect(englishLetterWord('can')).toEqual({meaning:'罐头盒',picture:null});
  for(const word of ['we','new','Bob','Kim','Ted','Zip']) expect(englishLetterWord(word).picture,word).toBeNull();
});

it('字母名先于例词，例词和中文意思用同一整句连续播报',()=>{
  const request=courseSpeechRequest(englishLetterNarration({letter:'A',words:['apple','bag']}),'zh','english');
  expect(request.text).toBe('字母名。Letter 读音1号。例词。apple。苹果。bag。书包。');
  expect(request.options.pronunciation).toEqual(['读音1号/ay']);
  expect(request.lang).toBe('zh');
});
