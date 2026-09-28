/**
 * 数学教材课的学习流程快照。
 *
 * 旧版只有“动手环节是否完成”的布尔值。升级后每课有多个必做任务，故迁移时
 * 保留已到达的学习入口，但绝不把旧布尔值当作新增教材任务的完成证据。
 */
export const MATH_FLOW_CONTENT_VERSION = 4;

export type MathFlowSnapshot = {
  contentVersion: typeof MATH_FLOW_CONTENT_VERSION;
  phase: number;
  unlocked: number;
  actionDone: boolean;
  knowledgeDone: boolean;
  /** 标识曾从旧流程导入，页面可展示“新增教材任务待完成”。 */
  migratedFrom?: 2 | 3;
  legacyActionDone?: boolean;
};

type LegacyFlowSnapshot = {
  phase?: unknown;
  unlocked?: unknown;
  actionDone?: unknown;
  knowledgeDone?: unknown;
  contentVersion?: unknown;
  migratedFrom?: unknown;
  legacyActionDone?: unknown;
};

const clampPhase = (value: unknown) => {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(4, Math.floor(number)));
};

const parse = (raw: string | null): LegacyFlowSnapshot | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as LegacyFlowSnapshot : null;
  } catch {
    return null;
  }
};

export const emptyMathFlowSnapshot = (): MathFlowSnapshot => ({
  contentVersion: MATH_FLOW_CONTENT_VERSION,
  phase: 0,
  unlocked: 0,
  actionDone: false,
  knowledgeDone: false,
});

const normalizeCurrent = (value: LegacyFlowSnapshot): MathFlowSnapshot => ({
  contentVersion: MATH_FLOW_CONTENT_VERSION,
  phase: clampPhase(value.phase),
  unlocked: clampPhase(value.unlocked),
  actionDone: !!value.actionDone,
  knowledgeDone: !!value.knowledgeDone || clampPhase(value.phase) >= 3,
  ...(value.migratedFrom === 2 || value.migratedFrom === 3 ? { migratedFrom: value.migratedFrom, legacyActionDone: !!value.legacyActionDone } : {}),
});

/**
 * 优先读取当前版本。没有当前记录时，导入 v3、再导入 v2。
 * 迁移的旧流程只保留“已经开始学习”的位置；新增的多任务动手环节一律重新验收。
 */
export function migrateMathFlowSnapshot(currentRaw: string | null, v3Raw: string | null, v2Raw: string | null): MathFlowSnapshot {
  const current = parse(currentRaw);
  if (current?.contentVersion === MATH_FLOW_CONTENT_VERSION) return normalizeCurrent(current);

  const legacy = parse(v3Raw) ?? parse(v2Raw);
  if (!legacy) return emptyMathFlowSnapshot();
  const from: 2 | 3 = parse(v3Raw) ? 3 : 2;
  const hadStarted = clampPhase(legacy.phase) > 0 || clampPhase(legacy.unlocked) > 0 || !!legacy.actionDone || !!legacy.knowledgeDone;
  return {
    contentVersion: MATH_FLOW_CONTENT_VERSION,
    phase: hadStarted ? 1 : 0,
    unlocked: hadStarted ? 1 : 0,
    actionDone: false,
    knowledgeDone: false,
    migratedFrom: from,
    legacyActionDone: !!legacy.actionDone,
  };
}
