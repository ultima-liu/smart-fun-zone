import { describe, expect, it } from 'vitest';
import { CHINESE_TEXTBOOK_EXTRAS } from '../content/chineseTextbookExtras';
import { CHINESE_PINYIN_STUDY } from '../content/chinesePinyinStudy';
import { CHINESE_PINYIN_GARDENS } from '../content/chinesePinyinGardenStudy';
import { CHINESE_TEXTBOOK_STUDY } from '../content/chineseTextbookStudy';
import { CHINESE_TEXTBOOK_LESSONS } from '../content/chineseTextbookCurriculum';
const text = (id: string) => CHINESE_TEXTBOOK_EXTRAS[id].flatMap(item => item.groups.flatMap(group => group.lines)).join('\n');

describe('教材原页中容易被缩略丢失的内容', () => {
  it('14课拼音和8个园地都有能进入的教材内容，引用本课页且图示资源存在', () => {
    const images = Object.keys(import.meta.glob('/public/assets/chinese-textbook/pages/*.webp'));
    for (const lesson of CHINESE_TEXTBOOK_LESSONS.filter(lesson => lesson.kind === 'pinyin' || lesson.kind === 'garden')) {
      const entries = CHINESE_TEXTBOOK_EXTRAS[lesson.id];
      expect(entries?.length, lesson.id).toBeGreaterThan(0);
      expect(new Set(entries.map(item => item.id)).size, lesson.id).toBe(entries.length);
      const pages = lesson.page.match(/\d+/g)!.map(Number);
      for (const item of entries) {
        expect(item.page).toBeGreaterThanOrEqual(pages[0]);
        expect(item.page).toBeLessThanOrEqual(pages[pages.length - 1]);
        if (item.illustration) expect(images).toContain(`/public/assets/chinese-textbook/pages/p${String(item.page).padStart(3, '0')}.webp`);
      }
    }
  });
  it('保留原页的ü音节、花瓣拼读表与完整拼音总表', () => {
    // These are independent transcriptions of P26/P49/P52/P54/P57, not generated from quiz answers.
    expect(text('pinyin-d-t-n-l')).toContain('ná né nǐ nù nǚ');
    expect(text('pinyin-d-t-n-l')).toContain('lā lè lǐ lù lǘ');
    expect(text('pinyin-ie-ve-er')).toContain('lüè nüè jué quē xué');
    expect(text('pinyin-an-en-in-un-vn')).toContain('wān yàn quān nán jiān zhàn rǎn duǎn');
    expect(text('pinyin-ang-eng-ing-ong')).toContain('rēng héng fēng děng');
    expect(text('pinyin-z-c-s')).toContain('我是小学生。');
    expect(CHINESE_PINYIN_GARDENS['garden-4'].flatMap(item => item.material).join(' ')).toContain('g k h');
    expect(text('garden-4')).toContain('g k h');
    expect(text('garden-4')).toContain('yǎn—yuǎn');
    expect(text('garden-4')).toContain('zuān—zhuān');
    expect(text('garden-4')).toContain('chán—chuán—chuáng');
    expect(text('garden-4')).toContain('题 mù → 题目');
    expect(text('garden-4')).toContain('tián 野 → 田野');
  });
  it('补回园地的积累、笔顺、童谣和共读故事结尾', () => {
    expect(text('garden-1')).toContain('红掌拨清波。');
    expect(text('garden-5')).toContain('寸金难买寸光阴。');
    expect(text('garden-5')).toContain('后来怎么样了？');
    expect(text('garden-6')).toContain('飞在青云端。');
    expect(text('garden-6')).toContain('是谁把花生摘走了呢？');
    expect(text('garden-7')).toContain('月亮还好好地挂在天上呢！');
    expect(text('garden-8')).toContain('初一初二满街走。');
    expect(text('garden-8')).toContain('许多—不许');
    expect(text('sun-moon-bright')).toContain('艹 + 田 → 苗');
  });
  it('背诵材料不再省略原文，雨点儿保留地点信息', () => {
    expect(CHINESE_TEXTBOOK_STUDY.autumn.tasks[0].content?.join('')).toContain('一会儿排成个“人”字，一会儿排成个“一”字。');
    expect(CHINESE_TEXTBOOK_STUDY.jiangnan.tasks[0].content).toContain('鱼戏莲叶间。');
    expect(CHINESE_TEXTBOOK_STUDY['raising-flag'].tasks[0].content).toContain('迎风飘扬，多么美丽。');
    expect(CHINESE_TEXTBOOK_LESSONS.find(lesson => lesson.id === 'raindrops')?.sourceLines[1]).toMatch(/^半空中，/);
    expect(CHINESE_PINYIN_STUDY['pinyin-z-c-s'].letters[1].shape).toContain('向右开口');
  });
});
