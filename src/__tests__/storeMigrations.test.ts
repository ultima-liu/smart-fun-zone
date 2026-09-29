import { describe, expect, it } from 'vitest';
import { migrateAppState } from '../storeMigrations';

describe('本地存档迁移', () => {
  it('移除旧徽章商品与旧装备槽，同时保留其他物品', () => {
    const migrated = migrateAppState({
      ownedItems: { c1: ['b-old', 'i-shield'] },
      equipped: { c1: { badge: 'b-old', item: 'i-shield' } },
      storeOverrides: { 'b-old': { id: 'b-old' }, 'i-shield': { id: 'i-shield' } },
    }, 1);
    expect(migrated.ownedItems.c1).toEqual(['i-shield']);
    expect(migrated.equipped.c1).toEqual({ item: 'i-shield' });
    expect(migrated.storeOverrides).toHaveProperty('i-shield');
    expect(migrated.storeOverrides).not.toHaveProperty('b-old');
  });

  it('把旧任务完成状态转换成按日记录', () => {
    const migrated = migrateAppState({
      customTasks: { c1: [{ id: 't1', text: '整理书包', done: true, doneAt: Date.now() }] },
    }, 3);
    expect(migrated.customTasks.c1[0].doneDays).toHaveLength(1);
    expect(migrated.customTasks.c1[0].pendingDays).toEqual([]);
  });

  it('为旧存档补上新版任务状态容器', () => {
    const migrated = migrateAppState({ profiles: [] }, 5);
    expect(migrated.taskStates).toEqual({});
  });
});
