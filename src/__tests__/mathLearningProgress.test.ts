import { describe, expect, it } from 'vitest';
import { MATH_FLOW_CONTENT_VERSION, migrateMathFlowSnapshot } from '../content/mathLearningProgress';

describe('数学教材课进度迁移', () => {
  it('优先保留当前版本的精确流程', () => {
    const result = migrateMathFlowSnapshot(JSON.stringify({ contentVersion: MATH_FLOW_CONTENT_VERSION, phase: 2, unlocked: 3, actionDone: true, knowledgeDone: false }), null, null);
    expect(result).toMatchObject({ contentVersion: MATH_FLOW_CONTENT_VERSION, phase: 2, unlocked: 3, actionDone: true, knowledgeDone: false });
  });

  it('将旧单任务记录导入到动手入口，但不越过新增教材任务', () => {
    const result = migrateMathFlowSnapshot(null, null, JSON.stringify({ phase: 4, unlocked: 4, actionDone: true, knowledgeDone: true }));
    expect(result).toMatchObject({ phase: 1, unlocked: 1, actionDone: false, knowledgeDone: false, migratedFrom: 2, legacyActionDone: true });
  });

  it('迁移无效或空记录时从先猜开始', () => {
    expect(migrateMathFlowSnapshot(null, '{not json', null)).toMatchObject({ phase: 0, unlocked: 0, actionDone: false });
  });
});
