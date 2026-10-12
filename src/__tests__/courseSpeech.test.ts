import { afterEach, expect, it, vi } from 'vitest';
import { courseSpeechRequest, currentSpeechSubject, pinyinPronunciation } from '../courseSpeech';
import { speakOnce, speakMixedSeq, speakSeq, stopSpeaking } from '../speech';
import { playEnglishNarration, stopEnglishNarration } from '../englishTabNarration';
import { speakVolc } from '../volcTts';
import { useStore } from '../store';
vi.mock('../volcTts', () => ({ speakVolc: vi.fn(), stopVolc: vi.fn(), volcConfigured:vi.fn(), warmTts:vi.fn(), voiceForProfile:vi.fn() }));
afterEach(() => { stopSpeaking(); stopEnglishNarration(); vi.clearAllMocks(); window.location.hash = ''; });
const reading = (value: string, subject: 'chinese' | 'english') => courseSpeechRequest(value, 'zh', subject).options.pronunciation;
it('同一个字母按课程读，ü不丢两点，所有音节声调保持原样', () => {
  expect(pinyinPronunciation('i')).toBe('yi1');
  expect(pinyinPronunciation('u')).toBe('wu1');
  expect(pinyinPronunciation('ü')).toBe('yu1');
  expect(pinyinPronunciation('ǚ')).toBe('yu3');
  expect(pinyinPronunciation('nǚ')).toBe('nv3');
  expect(pinyinPronunciation('lüè')).toBe('lve4');
  expect(pinyinPronunciation('bá')).toBe('ba2');
  expect(pinyinPronunciation('zh')).toBe('zhi1');
  expect(reading('i 的声调写法，ü 和 u 有什么不同？','chinese')).toEqual(['读音1号/(yi1)','读音2号/(yu1)','读音3号/(wu1)']);
  expect(reading('选择字母 i、u、a、c。','english')).toEqual(['读音1号/eye','读音2号/you','读音3号/ay','读音4号/see']);
});
it('声调与两点正交，声明式声调表不会把二三四声读成一声', () => {
  expect(['ā','á','ǎ','à','ō','ó','ǒ','ò','ǖ','ǘ','ǚ','ǜ'].map(pinyinPronunciation)).toEqual(['a1','a2','a3','a4','o1','o2','o3','o4','yu1','yu2','yu3','yu4']);
});
it('英文字母规则不命中单词或冠词，不改变音标与省略号', () => {
  const request = courseSpeechRequest('Letter a. A cat is in a bag. 字母 c，ice，fish，I am here. /æ/ …', 'zh','english');
  expect(request.text).toContain('A cat is in a bag.');
  expect(request.text).toContain('ice，fish');
  expect(request.text).toContain('/æ/ …');
  expect(request.options.pronunciation).toEqual(['读音1号/ay','读音2号/see','读音3号/eye']);
});
it('语文自动朗读、点读和混读统一单次合成，英语混合说明也只合成一次', () => {
  useStore.setState({sound:true,voiceOn:true});
  window.location.hash = '#/chinese-course/pinyin-i-u-v';
  expect(currentSpeechSubject()).toBe('chinese');
  window.location.hash = '#/subject/chinese';expect(currentSpeechSubject()).toBe('chinese');
  window.location.hash = '#/subject/english';expect(currentSpeechSubject()).toBe('english');
  window.location.hash = '#/chinese-course/pinyin-i-u-v';
  speakOnce('ü 和 u 的字形差在哪里？');
  speakMixedSeq('i 加声调时，小点去掉。');
  speakSeq(['b 的形状。']);
  expect(speakVolc).toHaveBeenCalledTimes(3);
  for(const call of vi.mocked(speakVolc).mock.calls) {
    expect(call[1]).toBe('zh'); expect(call[6]?.pronunciation?.length).toBeGreaterThan(0);
    expect(call[0]).not.toMatch(/[iubü]/);
  }
  vi.mocked(speakVolc).mockClear();
  window.location.hash='#/english-course/families-letters';
  playEnglishNarration('选择字母 e。egg，鸡蛋。');
  expect(speakVolc).toHaveBeenCalledTimes(1);
  expect(vi.mocked(speakVolc).mock.calls[0][6]?.pronunciation).toContain('读音1号/ee');
  expect(vi.mocked(speakVolc).mock.calls[0][0]).toContain('egg，鸡蛋');
});
it('显式学科在复习页也有效，纯英语字母保持英语音色', () => {
  useStore.setState({sound:true,voiceOn:true}); window.location.hash='#/review';
  speakOnce('i', 'zh', .8, undefined,'english');
  expect(vi.mocked(speakVolc).mock.calls[0][1]).toBe('en');
  expect(vi.mocked(speakVolc).mock.calls[0][6]?.pronunciation).toEqual(['读音1号/eye']);
});
