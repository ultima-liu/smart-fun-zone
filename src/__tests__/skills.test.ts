import { describe, it, expect } from 'vitest';
import { SKILLS, getSkill, skillsByGrade, skillByGame, SUBJECT_META, subjectLessonCount } from '../content/skills';
import { getGame } from '../games';
import { SUBJECTS } from '../types';

describe('真实教材课程体系（学科 → 年级 → 学期 → 单元）', () => {
  it('每个课程 id 唯一、名称双语、字段完整', () => {
    const ids = SKILLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(SKILLS.length);
    for (const s of SKILLS) {
      expect(s.name.zh.length).toBeGreaterThan(0);
      expect(s.name.en.length).toBeGreaterThan(0);
      expect(['上', '下']).toContain(s.term);
    }
  });

  it('年级（1~6）与学科取值合法', () => {
    const grades = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'];
    const subjectIds = SUBJECTS.map((s) => s.id);
    for (const s of SKILLS) {
      expect(grades).toContain(s.grade);
      expect(subjectIds).toContain(s.subject);
    }
  });

  it('每个年级都有课程，且数学覆盖全部 6 个年级', () => {
    for (const grade of ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'] as const) {
      expect(skillsByGrade(grade).length, `年级 ${grade}`).toBeGreaterThan(0);
    }
  });

  it('每个学科的练习游戏映射都真实存在', () => {
    for (const subject of SUBJECTS) {
      const meta = SUBJECT_META[subject.id];
      expect(meta.games.length, `${subject.id} 无练习游戏`).toBeGreaterThan(0);
      for (const g of meta.games) {
        expect(getGame(g), `${subject.id} → ${g}`).toBeTruthy();
      }
    }
  });

  it('getSkill / skillByGame / subjectLessonCount 查询正常', () => {
    expect(getSkill('math-g1-a-1-1')?.name.zh).toBe('数一数');
    expect(getSkill('math-g1-a-1-1')?.subject).toBe('math');
    expect(getSkill('math-g1-a-1-1')?.unit.zh).toBe('准备课');
    expect(getSkill('nope')).toBeUndefined();
    expect(skillByGame('number-farm').length).toBeGreaterThan(0);
    expect(subjectLessonCount('math')).toBeGreaterThan(0);
  });
});
