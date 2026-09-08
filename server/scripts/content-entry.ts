import { SKILLS } from '../../src/content/skills';
import { LESSON_CONTENTS } from '../../src/content/lessonContents';
import { CHINESE_ENHANCE } from '../../src/content/chineseEnhance';

/** 内容包 v1：课程表 + 课文/生字/要点 + 语文图文分步教学增强（服务端种子源） */
const pack = {
  format: 'sfz-content-pack',
  curriculum: SKILLS,
  contents: LESSON_CONTENTS,
  enhance: CHINESE_ENHANCE,
};

console.log(JSON.stringify(pack));
