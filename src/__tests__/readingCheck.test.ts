import { expect, it } from 'vitest';
import { matchReading } from '../readingCheck';

it('跟读核对忽略大小写标点，并兼容常见缩写及数字转写', () => {
  expect(matchReading("I'm seven years old.", 'I am 7 years old!', 'en-US').pass).toBe(true);
  expect(matchReading('Hello, Amy!', 'hello amy', 'en-US').pass).toBe(true);
  expect(matchReading('一二三。', '123', 'zh-CN').pass).toBe(true);
});
it('错误词、漏读、乱序及混入大量无关内容不能通过', () => {
  for (const said of ['can', 'scat', 'cat cat cat cat', '', '我已经读过了']) expect(matchReading('cat', said, 'en-US').pass).toBe(false);
  expect(matchReading('I like cats.', 'cats like I', 'en-US').pass).toBe(false);
  expect(matchReading('I like cats.', 'I like', 'en-US')).toMatchObject({ pass: false, missing: ['cats'] });
  expect(matchReading('天对地，雨对风。', '天对地', 'zh-CN').pass).toBe(false);
});
it('空目标、超长识别结果不能被视作完成', () => {
  expect(matchReading('', 'hello', 'en-US').pass).toBe(false);
  expect(matchReading('cat', 'cat '.repeat(1600), 'en-US').pass).toBe(false);
});
