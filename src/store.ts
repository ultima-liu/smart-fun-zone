import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChildProfile, GameRecord, Lang, Theme } from './types';
import { localDayKey } from './dailyCheckin';
import { applyEntry, type PointEntry, type WalletSnapshot, type CustomTask, customTaskDueToday } from './points';
import { drawLoot, pendingPacks, type LootDrop } from './content/expedition';
import { shipBoost } from './content/shipyard';
import { drawCards as drawStarCards, STAR_CARDS, type CardSetId, type DrawResult } from './content/starCards';
import { nextDailyCheckin, type CheckinReward, type DailyCheckinState } from './dailyCheckin';
import { migrateAppState } from './storeMigrations';
import { emptyChildTaskState, type ChildTaskState, type CourseScheduleEntry } from './taskTypes';

/** 新孩子初始积分（用于体验装扮/兑换） */
export const INITIAL_POINTS = 200;

export interface MasteryState {
  stars: number;
  gold: boolean;
  updatedAt: number;
}

export interface WrongItem {
  uid: string;
  lessonId: string;
  lessonName: string;
  /** 旧记录只有 kind；新数学错题用 question 保存可再次作答的题干。 */
  question?: string;
  kind: string;
  /** 孩子当时选的错误答案。 */
  answer: string;
  /** 可选的诊断信息：旧错题没有这些字段时仍可正常展示。 */
  objective?: string;
  diagnosis?: string;
  remedy?: string;
  options?: string[];
  correctAnswer?: string;
  time: number;
}

export interface AppState {
  lang: Lang;
  /** 主题：深色/浅色（浅色=童趣糖果风） */
  theme: Theme;
  setTheme: (t: Theme) => void;
  sound: boolean;
  voiceOn: boolean;
  profiles: ChildProfile[];
  activeChildId: string | null;
  records: GameRecord[];
  /** 知识点掌握度：childId → skillId → 状态 */
  mastery: Record<string, Record<string, MasteryState>>;
  /** 课程学习进度：skillId → 已完成步骤数（0-3，第 4 步=练习由 mastery 体现） */
  lessonProgress: Record<string, number>;
  /** 每日签到：childId → 最近签到日、连续天数、累计天数 */
  dailyCheckin: Record<string, DailyCheckinState>;
  /** 字卡袋：childId → 已收集汉字 */
  charBag: Record<string, string[]>;
  /** 错题本：childId → 错题记录（自动同步到云端） */
  wrongs: Record<string, WrongItem[]>;
  /** 积分余额：childId → 当前积分 */
  points: Record<string, number>;
  /** 积分流水：childId → 明细（最近 600 条；id 幂等） */
  pointLog: Record<string, PointEntry[]>;
  /** 家长部署的自定义任务（全局，按 childId 归属） */
  customTasks: Record<string, CustomTask[]>;
  /** 管理端配置：商品覆盖（改价/改名/上下架/新增） */
  storeOverrides: Record<string, import('./points').StoreItem>;
  /** 管理端配置：任务分值/开关 */
  taskOverrides: Record<string, { reward?: number; enabled?: boolean }>;
  /** 管理端课程表：按年级配置周一至周五每天的学科。 */
  courseSchedule: CourseScheduleEntry[];
  /** 新任务系统：每个孩子的完成事实、推送位置与首页偏好。 */
  taskStates: Record<string, ChildTaskState>;
  patchStoreItem: (id: string, patch: Partial<import('./points').StoreItem>) => void;
  removeStoreItem: (id: string) => void;
  patchTask: (id: string, patch: { reward?: number; enabled?: boolean }) => void;
  setCourseSchedule: (entries: CourseScheduleEntry[]) => void;
  /** 合并远程配置（服务端为全局唯一权威，替换本地覆盖） */
  applyRemoteConfig: (storeOverrides: Record<string, import('./points').StoreItem>, taskOverrides: Record<string, { reward?: number; enabled?: boolean }>, courseSchedule: CourseScheduleEntry[]) => void;
  /** 已兑换的虚拟商品 id：childId → StoreItem.id[] */
  ownedItems: Record<string, string[]>;
  /** 当前装配（装扮/徽章各一件）：childId → Equipped */
  equipped: Record<string, import('./points').Equipped>;
  /** 虚拟人物配色（换肤）：childId → colorway key */
  avatarColor: Record<string, string>;
  setAvatarColor: (childId: string, color: string) => void;
  avatarHair: Record<string, string>;
  setAvatarHair: (childId: string, hair: string) => void;
  /** 装配/卸下某商品（仅 owned 内） */
  equipItem: (childId: string, itemId: string) => void;
  unequipItem: (childId: string, itemId: string) => void;
  /** 兑换一个虚拟商品（余额足够才扣分，不重复购买） */
  redeemItem: (childId: string, itemId: string, cost: number) => boolean;
  /** 兑换奖励类商品（即时扣分到账、可重复购买；时长券直接加当日游戏时长） */
  buyReward: (childId: string, item: { id: string; name: string; cost: number }) => boolean;
  /** 记录一笔积分变动（自动来源传 sourceId 幂等；消费 amount 为负且不重复） */
  applyPoints: (childId: string, amount: number, reason: string, sourceId?: string) => void;
  /** 家长部署自定义任务（周期/判定/奖励） */
  addCustomTask: (childId: string, task: Omit<CustomTask, 'id' | 'createdAt' | 'doneDays' | 'pendingDays'>) => void;
  removeCustomTask: (childId: string, taskId: string) => void;
  /** 孩子点「已完成」：auto 立即发放；parent 进入待审核。返回结果供界面提示 */
  childCompleteTask: (childId: string, taskId: string) => 'granted' | 'pending' | 'already' | 'missing';
  /** 家长审核确认待审核的完成记录 → 发放奖励 */
  confirmCustomTask: (childId: string, taskId: string, day: string) => void;
  parentPin: string;
  dailyLimitMin: number;
  /** 当日加成时长（来自已审批时长券）：childId → { day: 'YYYY-MM-DD', min: n } */
  bonusMin: Record<string, { day: string; min: number }>;
  setLang: (l: Lang) => void;
  toggleSound: () => void;
  setVoiceOn: (v: boolean) => void;
  addProfile: (p: ChildProfile) => void;
  removeProfile: (id: string) => void;
  setActiveChild: (id: string | null) => void;
  addRecord: (r: GameRecord) => void;
  /** 记录一次课程练习星级；同一课保留历史最高星级，3 星转金色 */
  addSkillResult: (childId: string, skillId: string, stars: number) => void;
  /** 完成一个学习步骤（看课文/听读/认生字），封顶 3 */
  completeLessonStep: (skillId: string) => void;
  /** 主动领取今日签到奖励；同一天重复领取返回 null。 */
  claimDailyCheckin: (childId: string) => (CheckinReward & { streak: number; total: number }) | null;
  /** 把本课生字收进字卡袋（去重） */
  collectChars: (childId: string, chars: string[]) => void;
  /** 记录一条错题（去重，保留最近 200 条） */
  addWrong: (childId: string, w: WrongItem) => void;
  /** 移除一条错题 */
  removeWrong: (childId: string, uid: string) => void;
  /** 云端同步：合并拉取到的进度（按 updatedAt 取新） */
  applyCloudProgress: (childId: string, map: Record<string, { stars?: number; stepIdx?: number; updatedAt?: number }>) => void;
  applyCloudPoints: (childId: string, entries: { id: string; amount: number; reason?: string; time?: number }[], items?: string[], wallet?: WalletSnapshot) => void;
  patchTaskState: (childId: string, patch: Partial<ChildTaskState>) => void;
  completeMission: (childId: string, taskId: string, title: string, reward: number, result?: string) => boolean;
  applyCloudTaskState: (childId: string, remote: ChildTaskState) => void;
  setParentPin: (pin: string) => void;
  setDailyLimit: (min: number) => void;
  /** 学习助手「小卷」 */
  buddyOpen: boolean;
  buddyWakeOn: boolean;
  openBuddy: (open: boolean) => void;
  toggleBuddy: () => void;
  setBuddyWake: (on: boolean) => void;
  /** 常驻远征：上次收取远征战利品的时间戳（childId）；undefined 视为刚开启远征 */
  expeditionLastAt: Record<string, number>;
  /** 远征战利品材料：星屑（飞船升级）（childId） */
  materials: Record<string, { stardust: number }>;
  /** 收取远征战利品：按时间累积的补给包数入账，返回本次掉落；无可收取返回 null */
  collectExpedition: (childId: string) => LootDrop | null;
  /** 飞船等级（船坞），1 起 */
  shipLevel: Record<string, number>;
  /** 飞船升级：消耗星屑+卷星币 → 升 1 级 */
  upgradeShip: (childId: string, stardustCost: number, beansCost: number) => boolean;
  /** 已解锁的图鉴卡 id：childId → cardId[] */
  archivedCards: Record<string, string[]>;
  /** 已领取的套系集齐奖励：childId → setId[] */
  cardRewardClaimed: Record<string, string[]>;
  /** 抽卡：消耗卷星币，返回本次抽卡结果 */
  drawCards: (childId: string, count: number, setId?: CardSetId) => DrawResult;
  /** 领取套系集齐奖励：返回是否成功 */
  claimCardReward: (childId: string, setId: CardSetId) => boolean;
  /** 剧情等固定来源授予一张图鉴卡（幂等，不消耗卷星币） */
  grantArchiveCard: (childId: string, cardId: string) => void;
  /** 首页展示徽章（最多 3 枚，从已点亮的徽章中自选） */
  showBadges: Record<string, string[]>;
  /** 新版剧情授勋记录：childId → badgeId[] */
  badges: Record<string, string[]>;
  grantBadge: (childId: string, badgeId: string) => void;
  /** 设置首页展示徽章（自动限 3 枚） */
  setShowBadges: (childId: string, ids: string[]) => void;
  clearAll: () => void;
}

/** 计算任务奖励的状态补丁：卷星币（幂等 sourceId）+ 可选物品。已发放过返回 null */
function grantTaskRewardPatch(s: AppState, childId: string, task: CustomTask, day: string): Partial<AppState> | null {
  const sourceId = `custom-task:${task.id}:${day}`;
  const childLog = s.pointLog[childId] ?? [];
  if (childLog.some((e) => e.id === sourceId && e.amount > 0)) return null;
  let points = s.points;
  let log = childLog;
  if (task.points > 0) {
    const r = applyEntry(points, log, { id: sourceId, time: Date.now(), amount: task.points, reason: `任务·${task.text}`, childId });
    points = r.points;
    log = r.log;
  }
  let owned = s.ownedItems[childId] ?? [];
  if (task.itemId && !owned.includes(task.itemId)) owned = [...owned, task.itemId];
  return { points, pointLog: { ...s.pointLog, [childId]: log }, ownedItems: { ...s.ownedItems, [childId]: owned } };
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      lang: 'zh',
      theme: 'dark',
      sound: true,
      voiceOn: true,
      profiles: [],
      activeChildId: null,
      records: [],
      mastery: {},
      lessonProgress: {},
      dailyCheckin: {},
      charBag: {},
      wrongs: {},
      points: {},
      pointLog: {},
      customTasks: {},
      ownedItems: {},
      equipped: {},
      avatarColor: {},
      avatarHair: {},
      storeOverrides: {},
      taskOverrides: {},
      courseSchedule: [],
      taskStates: {},
      bonusMin: {},
      parentPin: '1234',
      dailyLimitMin: 0,
      buddyOpen: false,
      buddyWakeOn: false,
      expeditionLastAt: {},
      materials: {},
      shipLevel: {},
      archivedCards: {},
      cardRewardClaimed: {},
      showBadges: {},
      badges: {},
      grantBadge: (childId, badgeId) => set((s) => {
        const current = s.badges[childId] ?? [];
        if (current.includes(badgeId)) return {};
        return { badges: { ...s.badges, [childId]: [...current, badgeId] } };
      }),
      openBuddy: (open) => set({ buddyOpen: open }),
      toggleBuddy: () => set((s) => ({ buddyOpen: !s.buddyOpen })),
      setBuddyWake: (on) => set({ buddyWakeOn: on }),
      collectExpedition: (childId) => {
        const now = Date.now();
        let result: LootDrop | null = null;
        set((s) => {
          const last = s.expeditionLastAt[childId];
          const packs =
            last === undefined
              ? 1 // 首次触发：送 1 个初始补给包，让远征马上有反馈
              : pendingPacks(last, now);
          if (packs <= 0) return {};
          const base = drawLoot(packs);
          // 船坞等级加成：提升每次的卷星币/星屑产出
          const boost = shipBoost(s.shipLevel[childId] ?? 1);
          const beansEach = Math.round((base.beans / packs) * boost);
          const stardustTotal = Math.round(base.stardust * boost);
          // 卷星币入账（积分流水，sourceId 幂等：每个周期一次，防重复）
          let points = s.points;
          let pointLog = s.pointLog;
          for (let i = 0; i < packs; i++) {
            const entry: PointEntry = {
              id: `expedition:${childId}:${now}:${i}`,
              time: now,
              amount: beansEach,
              reason: '远征战利品·卷星币',
              childId,
            };
            const r = applyEntry(points, pointLog[childId] ?? [], entry);
            points = r.points;
            pointLog = { ...pointLog, [childId]: r.log };
          }
          // 材料入账：仅星屑（飞船升级）
          const prevMat = s.materials[childId] ?? { stardust: 0 };
          const nextMat = {
            stardust: prevMat.stardust + stardustTotal,
          };
          // 随机装扮：加入已拥有列表（免费获得）
          const owned = new Set(s.ownedItems[childId] ?? []);
          for (const oid of base.outfits) owned.add(oid);
          result = { ...base, beans: beansEach * packs, stardust: stardustTotal };
          return {
            points,
            pointLog,
            materials: { ...s.materials, [childId]: nextMat },
            ownedItems: { ...s.ownedItems, [childId]: [...owned] },
            expeditionLastAt: { ...s.expeditionLastAt, [childId]: now },
          };
        });
        return result || null;
      },
      upgradeShip: (childId, stardustCost, beansCost) => {
        if (stardustCost < 0 || beansCost < 0) return false;
        let did = false;
        set((st) => {
          const mat = st.materials[childId] ?? { stardust: 0 };
          const balance = st.points[childId] ?? 0;
          if (mat.stardust < stardustCost || balance < beansCost) return {};
          const cur = st.shipLevel[childId] ?? 1;
          const entry: PointEntry = {
            id: `ship:${childId}:${Date.now()}`,
            time: Date.now(),
            amount: -beansCost,
            reason: `飞船升级·Lv.${cur + 1}`,
            childId,
          };
          const r = applyEntry(st.points, st.pointLog[childId] ?? [], entry);
          did = true;
          return {
            materials: { ...st.materials, [childId]: { stardust: Math.max(0, mat.stardust - stardustCost) } },
            shipLevel: { ...st.shipLevel, [childId]: cur + 1 },
            points: r.points,
            pointLog: { ...st.pointLog, [childId]: r.log },
          };
        });
        return did;
      },
      drawCards: (childId, count, setId) => {
        let result: DrawResult = { ids: [], newCards: [], duplicateCount: 0 };
        set((st) => {
          const balance = st.points[childId] ?? 0;
          const cost = count === 10 ? 900 : count * 100;
          if (balance < cost) return {};
          const owned = st.archivedCards[childId] ?? [];
          result = drawStarCards(count, owned, setId);
          const nextOwned = [...new Set([...owned, ...result.ids])];
          const points = applyEntry(st.points, st.pointLog[childId] ?? [], {
            id: `card-draw:${childId}:${Date.now()}:${count}`,
            time: Date.now(), amount: -cost, reason: `图鉴召唤 ×${count}`, childId,
          });
          return {
            points: points.points,
            pointLog: { ...st.pointLog, [childId]: points.log },
            archivedCards: { ...st.archivedCards, [childId]: nextOwned },
          };
        });
        return result;
      },
      claimCardReward: (childId, setId) => {
        let ok = false;
        set((st) => {
          const owned = st.archivedCards[childId] ?? [];
          const claimed = st.cardRewardClaimed[childId] ?? [];
          if (claimed.includes(setId)) return {};
          const setCards = STAR_CARDS.filter((c) => c.setId === setId);
          if (setCards.length === 0) return {};
          const haveAll = setCards.every((c) => owned.includes(c.id));
          if (!haveAll) return {};
          const rewardBeans = setCards[0]?.setId ? 500 : 0;
          const r = applyEntry(st.points, st.pointLog[childId] ?? [], {
            id: `card-set:${setId}:${Date.now()}`,
            time: Date.now(),
            amount: rewardBeans,
            reason: '图鉴套系集齐奖励',
            childId,
          });
          ok = true;
          return {
            points: r.points,
            pointLog: { ...st.pointLog, [childId]: r.log },
            cardRewardClaimed: { ...st.cardRewardClaimed, [childId]: [...claimed, setId] },
          };
        });
        return ok;
      },
      grantArchiveCard: (childId, cardId) =>
        set((s) => {
          if (!STAR_CARDS.some((card) => card.id === cardId)) return {};
          const owned = s.archivedCards[childId] ?? [];
          if (owned.includes(cardId)) return {};
          return { archivedCards: { ...s.archivedCards, [childId]: [...owned, cardId] } };
        }),
      setShowBadges: (childId, ids) =>
        set((st) => {
          // 去重 + 限 3 枚（保留用户点选顺序）
          const seen: string[] = [];
          for (const id of ids) if (!seen.includes(id) && seen.length < 3) seen.push(id);
          return { showBadges: { ...st.showBadges, [childId]: seen } };
        }),
      redeemItem: (childId, itemId, cost) => {
        let ok = false;
        useStore.setState((s) => {
          const bal = s.points[childId] ?? 0;
          const owned = s.ownedItems[childId] ?? [];
          if (owned.includes(itemId) || bal < cost) return {};
          const r = applyEntry(s.points, s.pointLog[childId] ?? [], {
            id: `buy:${itemId}:${Date.now()}`,
            time: Date.now(),
            amount: -cost,
            reason: `兑换商品 ${itemId}`,
            childId,
          });
          ok = true;
          return { points: r.points, pointLog: { ...s.pointLog, [childId]: r.log }, ownedItems: { ...s.ownedItems, [childId]: [...owned, itemId] } };
        });
        return ok;
      },
      buyReward: (childId, item) => {
        let ok = false;
        useStore.setState((s) => {
          const bal = s.points[childId] ?? 0;
          if (bal < item.cost) return {};
          const r = applyEntry(s.points, s.pointLog[childId] ?? [], {
            id: `buy:reward:${item.id}:${Date.now()}`,
            time: Date.now(),
            amount: -item.cost,
            reason: `奖励·${item.name}`,
            childId,
          });
          ok = true;
          // 时长券：rw-game*（+15 分钟）/ rw-video*（+10 分钟）直接加当日游戏时长
          let bonus = s.bonusMin[childId];
          if (item.id.startsWith('rw-game') || item.id.startsWith('rw-video')) {
            const today = new Date().toDateString();
            const addMin = item.id.startsWith('rw-video') ? 10 : 15;
            bonus = bonus && bonus.day === today ? { day: today, min: bonus.min + addMin } : { day: today, min: addMin };
            return { points: r.points, pointLog: { ...s.pointLog, [childId]: r.log }, bonusMin: { ...s.bonusMin, [childId]: bonus } };
          }
          return { points: r.points, pointLog: { ...s.pointLog, [childId]: r.log } };
        });
        return ok;
      },
      equipItem: (childId, itemId) =>
        set((s) => {
          const owned = s.ownedItems[childId] ?? [];
          if (!owned.includes(itemId)) return {};
          const kindOf = (id: string): 'outfit' | 'badge' => (id.startsWith('b-') ? 'badge' : 'outfit');
          const cur = s.equipped[childId] ?? {};
          const key = kindOf(itemId);
          return { equipped: { ...s.equipped, [childId]: { ...cur, [key]: itemId } } };
        }),
      unequipItem: (childId, itemId) =>
        set((s) => {
          const cur = { ...(s.equipped[childId] ?? {}) };
          const kindOf = (id: string): 'outfit' | 'badge' => (id.startsWith('b-') ? 'badge' : 'outfit');
          if (cur[kindOf(itemId)] === itemId) delete cur[kindOf(itemId)];
          return { equipped: { ...s.equipped, [childId]: cur } };
        }),
      patchStoreItem: (id, patch) =>
        set((s) => ({ storeOverrides: { ...s.storeOverrides, [id]: { ...(s.storeOverrides[id] ?? {}), id, ...patch } } })),
      setAvatarColor: (childId, color) => set((s) => ({ avatarColor: { ...s.avatarColor, [childId]: color } })),
      setAvatarHair: (childId, hair) => set((s) => ({ avatarHair: { ...s.avatarHair, [childId]: hair } })),
      removeStoreItem: (id) =>
        set((s) => {
          const next = { ...s.storeOverrides };
          // 直接下架（保留已购逻辑安全）：on:false
          next[id] = { ...(next[id] ?? { id }), id, on: false };
          return { storeOverrides: next };
        }),
      patchTask: (id, patch) =>
        set((s) => ({ taskOverrides: { ...s.taskOverrides, [id]: { ...(s.taskOverrides[id] ?? {}), ...patch } } })),
      setCourseSchedule: (courseSchedule) => set({ courseSchedule }),
      patchTaskState: (childId, patch) =>
        set((s) => {
          const current = s.taskStates[childId] ?? emptyChildTaskState();
          return {
            taskStates: {
              ...s.taskStates,
              [childId]: { ...current, ...patch, updatedAt: Date.now() },
            },
          };
        }),
      completeMission: (childId, taskId, title, reward, result) => {
        let completed = false;
        set((s) => {
          const current = s.taskStates[childId] ?? emptyChildTaskState();
          if (current.completed[taskId]) return {};
          const now = Date.now();
          const applied = applyEntry(s.points, s.pointLog[childId] ?? [], {
            id: `mission:${taskId}`,
            time: now,
            amount: reward,
            reason: `任务·${title}`,
            childId,
          });
          completed = true;
          return {
            points: applied.points,
            pointLog: { ...s.pointLog, [childId]: applied.log },
            taskStates: {
              ...s.taskStates,
              [childId]: {
                ...current,
                updatedAt: now,
                completed: { ...current.completed, [taskId]: { completedAt: now, reward, result } },
                pausedTaskId: current.pausedTaskId === taskId ? undefined : current.pausedTaskId,
                lastCompletion: { taskId, title, reward, at: now },
              },
            },
          };
        });
        return completed;
      },
      applyCloudTaskState: (childId, remote) =>
        set((s) => {
          const local = s.taskStates[childId];
          if (!local) return { taskStates: { ...s.taskStates, [childId]: remote } };
          const completed = { ...local.completed };
          for (const [taskId, fact] of Object.entries(remote.completed ?? {})) {
            const own = completed[taskId];
            if (!own || fact.completedAt > own.completedAt) completed[taskId] = fact;
          }
          const lessonCompletedAt = { ...(local.lessonCompletedAt ?? {}) };
          for (const [lessonKey, completedAt] of Object.entries(remote.lessonCompletedAt ?? {})) {
            lessonCompletedAt[lessonKey] = Math.max(lessonCompletedAt[lessonKey] ?? 0, completedAt);
          }
          const courseMails = { ...(local.courseMails ?? {}) };
          for (const [scheduleId, progress] of Object.entries(remote.courseMails ?? {})) {
            const own = courseMails[scheduleId] ?? {};
            const metadata = own.date && own.subject && own.lessonId && own.reward !== undefined ? own : progress;
            courseMails[scheduleId] = {
              date: metadata.date,
              subject: metadata.subject,
              lessonId: metadata.lessonId,
              reward: metadata.reward,
              startedAt: Math.max(own.startedAt ?? 0, progress.startedAt ?? 0) || undefined,
              completedAt: Math.max(own.completedAt ?? 0, progress.completedAt ?? 0) || undefined,
              claimedAt: Math.max(own.claimedAt ?? 0, progress.claimedAt ?? 0) || undefined,
              result: (progress.completedAt ?? 0) > (own.completedAt ?? 0) ? progress.result : own.result,
            };
          }
          const newest = remote.updatedAt > local.updatedAt ? remote : local;
          return { taskStates: { ...s.taskStates, [childId]: { ...newest, completed, lessonCompletedAt, courseMails } } };
        }),
      applyRemoteConfig: (storeOverrides, taskOverrides, courseSchedule) => set({ storeOverrides, taskOverrides, courseSchedule }),
      applyPoints: (childId, amount, reason, sourceId) =>
        set((s) => {
                    const id = sourceId && amount > 0 ? sourceId : sourceId ?? `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const entry: PointEntry = {
            id,
            time: Date.now(),
            amount,
            reason,
            childId,
          };
          const r = applyEntry(s.points, s.pointLog[childId] ?? [], entry);
          return { points: r.points, pointLog: { ...s.pointLog, [childId]: r.log } };
        }),
      addCustomTask: (childId, task) =>
        set((s) => {
          const full: CustomTask = {
            ...task,
            id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            createdAt: Date.now(),
            doneDays: [],
            pendingDays: [],
          };
          return { customTasks: { ...s.customTasks, [childId]: [...(s.customTasks[childId] ?? []), full] } };
        }),
      removeCustomTask: (childId, taskId) =>
        set((s) => ({ customTasks: { ...s.customTasks, [childId]: (s.customTasks[childId] ?? []).filter((t) => t.id !== taskId) } })),
      childCompleteTask: (childId, taskId) => {
        let verdict: 'granted' | 'pending' | 'already' | 'missing' = 'missing';
        set((s) => {
          const list = s.customTasks[childId] ?? [];
          const task = list.find((t) => t.id === taskId);
          if (!task) return {};
          const day = localDayKey();
          if (!customTaskDueToday(task) || task.doneDays.includes(day)) {
            verdict = 'already';
            return {};
          }
          if (task.judge === 'parent') {
            if (task.pendingDays.includes(day)) {
              verdict = 'already';
              return {};
            }
            verdict = 'pending';
            const nextList = list.map((t) => (t.id === taskId ? { ...t, pendingDays: [...t.pendingDays, day] } : t));
            return { customTasks: { ...s.customTasks, [childId]: nextList } };
          }
          verdict = 'granted';
          const reward = grantTaskRewardPatch(s, childId, task, day);
          const nextList = list.map((t) => (t.id === taskId ? { ...t, doneDays: [...t.doneDays, day] } : t));
          return { ...reward, customTasks: { ...s.customTasks, [childId]: nextList } };
        });
        return verdict;
      },
      confirmCustomTask: (childId, taskId, day) =>
        set((s) => {
          const list = s.customTasks[childId] ?? [];
          const task = list.find((t) => t.id === taskId);
          if (!task || !task.pendingDays.includes(day) || task.doneDays.includes(day)) return {};
          const reward = grantTaskRewardPatch(s, childId, task, day);
          const nextList = list.map((t) => (t.id === taskId ? { ...t, pendingDays: t.pendingDays.filter((d) => d !== day), doneDays: [...t.doneDays, day] } : t));
          return { ...reward, customTasks: { ...s.customTasks, [childId]: nextList } };
        }),
      setLang: (lang) => set({ lang }),
      setTheme: (theme) => set({ theme }),
      toggleSound: () => set((s) => ({ sound: !s.sound })),
      setVoiceOn: (voiceOn) => set({ voiceOn }),
      addProfile: (p) =>
        set((s) => ({ profiles: [...s.profiles, p], points: { ...s.points, [p.id]: INITIAL_POINTS } })),
      removeProfile: (id) =>
        set((s) => ({
          profiles: s.profiles.filter((p) => p.id !== id),
          records: s.records.filter((r) => r.childId !== id),
          mastery: (() => { const m = { ...s.mastery }; delete m[id]; return m; })(),
          points: (() => { const p = { ...s.points }; delete p[id]; return p; })(),
          pointLog: (() => { const p = { ...s.pointLog }; delete p[id]; return p; })(),
          dailyCheckin: (() => { const d = { ...s.dailyCheckin }; delete d[id]; return d; })(),
          charBag: (() => { const c = { ...s.charBag }; delete c[id]; return c; })(),
          wrongs: (() => { const w = { ...s.wrongs }; delete w[id]; return w; })(),
          customTasks: (() => { const t = { ...s.customTasks }; delete t[id]; return t; })(),
          taskStates: (() => { const t = { ...s.taskStates }; delete t[id]; return t; })(),
          ownedItems: (() => { const o = { ...s.ownedItems }; delete o[id]; return o; })(),
          equipped: (() => { const e = { ...s.equipped }; delete e[id]; return e; })(),
          avatarColor: (() => { const a = { ...s.avatarColor }; delete a[id]; return a; })(),
          avatarHair: (() => { const h = { ...s.avatarHair }; delete h[id]; return h; })(),
          expeditionLastAt: (() => { const e = { ...s.expeditionLastAt }; delete e[id]; return e; })(),
          materials: (() => { const m = { ...s.materials }; delete m[id]; return m; })(),
          shipLevel: (() => { const sh = { ...s.shipLevel }; delete sh[id]; return sh; })(),
          archivedCards: (() => { const a = { ...s.archivedCards }; delete a[id]; return a; })(),
          cardRewardClaimed: (() => { const c = { ...s.cardRewardClaimed }; delete c[id]; return c; })(),
          showBadges: (() => { const b = { ...s.showBadges }; delete b[id]; return b; })(),
          activeChildId: s.activeChildId === id ? null : s.activeChildId,
        })),
      setActiveChild: (activeChildId) => set({ activeChildId }),
      addRecord: (r) => set((s) => ({ records: [...s.records, r] })),
      addSkillResult: (childId, skillId, resultStars) =>
        set((s) => {
          const childMap = { ...(s.mastery[childId] ?? {}) };
          const prev = childMap[skillId] ?? { stars: 0, gold: false, updatedAt: 0 };
          const stars = Math.max(prev.stars, Math.max(0, Math.min(3, Math.floor(resultStars))));
          const gold = stars >= 3;
          childMap[skillId] = { stars, gold, updatedAt: Date.now() };
          let pts = s.points;
          let log = s.pointLog[childId] ?? [];
          if (gold && !prev.gold) {
            const r = applyEntry(pts, log, { id: `gold:${skillId}`, time: Date.now(), amount: 5, reason: '单课满星奖励', childId });
            pts = r.points; log = r.log;
          }
          return { mastery: { ...s.mastery, [childId]: childMap }, points: pts, pointLog: { ...s.pointLog, [childId]: log } };
        }),
      completeLessonStep: (skillId) =>
        set((s) => {
          const cur = s.lessonProgress[skillId] ?? 0;
          const next = Math.min(3, cur + 1);
          const stepPoints = cur >= 3 ? {} : (() => {
            const cid = s.activeChildId;
            if (!cid) return {};
            const r = applyEntry(s.points, s.pointLog[cid] ?? [], {
              id: `step:${skillId}:${next}`, time: Date.now(), amount: 2, reason: '完成学习步骤', childId: cid,
            });
            return { points: r.points, pointLog: { ...s.pointLog, [cid]: r.log } };
          })();
          return { lessonProgress: { ...s.lessonProgress, [skillId]: next }, ...stepPoints };
        }),
      claimDailyCheckin: (childId) => {
        let result: (CheckinReward & { streak: number; total: number }) | null = null;
        set((s) => {
          const next = nextDailyCheckin(s.dailyCheckin[childId]);
          if (!next) return {};
          const entry = {
            id: `checkin:${childId}:${next.state.lastDate}`,
            time: Date.now(),
            amount: next.reward.beans,
            reason: `每日签到·连续 ${next.state.streak} 天`,
            childId,
          };
          const points = applyEntry(s.points, s.pointLog[childId] ?? [], entry);
          const mat = s.materials[childId] ?? { stardust: 0 };
          result = { ...next.reward, streak: next.state.streak, total: next.state.total };
          return {
            dailyCheckin: { ...s.dailyCheckin, [childId]: next.state },
            points: points.points,
            pointLog: { ...s.pointLog, [childId]: points.log },
            materials: next.reward.stardust > 0
              ? { ...s.materials, [childId]: { stardust: mat.stardust + next.reward.stardust } }
              : s.materials,
          };
        });
        return result;
      },
      collectChars: (childId, chars) =>
        set((s) => {
          const bag = new Set(s.charBag[childId] ?? []);
          const fresh = chars.filter((c) => !bag.has(c));
          fresh.forEach((c) => bag.add(c));
          let pts = s.points;
          let log = s.pointLog[childId] ?? [];
          for (const c of fresh) {
            const r = applyEntry(pts, log, { id: `char:${c}`, time: Date.now(), amount: 1, reason: `收集字卡「${c}」`, childId });
            pts = r.points; log = r.log;
          }
          return { charBag: { ...s.charBag, [childId]: [...bag] }, points: pts, pointLog: { ...s.pointLog, [childId]: log } };
        }),
      /** 云端同步：合并拉取到的进度（按 updatedAt 取新） */
      applyCloudProgress: (childId, map) =>
        set((s) => {
          const childMap = { ...(s.mastery[childId] ?? {}) };
          const steps = { ...s.lessonProgress };
          for (const [skillId, p] of Object.entries(map)) {
            const prev = childMap[skillId] ?? { stars: 0, gold: false, updatedAt: 0 };
            if ((p.updatedAt ?? 0) > prev.updatedAt) {
              childMap[skillId] = { stars: p.stars ?? prev.stars, gold: (p.stars ?? 0) >= 3, updatedAt: p.updatedAt ?? 0 };
            }
            if (p.stepIdx !== undefined) steps[skillId] = Math.max(steps[skillId] ?? 0, p.stepIdx);
          }
          return { mastery: { ...s.mastery, [childId]: childMap }, lessonProgress: steps };
        }),
      /** 云端同步：合并拉取到的积分流水与已购商品（幂等） */
      applyCloudPoints: (childId, entries, items, wallet) =>
        set((s) => {
          const existing = s.pointLog[childId] ?? [];
          const merged = new Map(existing.map((entry) => [entry.id, entry]));
          let incomingAmount = 0;
          for (const e of entries ?? []) {
            const id = String(e.id);
            if (merged.has(id)) continue;
            incomingAmount += e.amount;
            merged.set(id, { id, time: e.time ?? Date.now(), amount: e.amount, reason: e.reason ?? '', childId });
          }
          // Recent ledger rows are for display; they cannot reconstruct the whole wallet.
          const syncedIds = wallet ? new Set(wallet.sourceIds) : null;
          const pendingAmount = syncedIds
            ? existing.reduce((sum, entry) => sum + (syncedIds.has(entry.id) ? 0 : entry.amount), 0)
            : 0;
          const balance = wallet
            ? wallet.balance + pendingAmount
            : (s.points[childId] ?? 0) + incomingAmount;
          const log = [...merged.values()].sort((a, b) => b.time - a.time).slice(0, 600);
          let owned = s.ownedItems[childId] ?? [];
          for (const it of items ?? []) if (!owned.includes(it)) owned = [...owned, it];
          return { points: { ...s.points, [childId]: Math.max(0, balance) }, pointLog: { ...s.pointLog, [childId]: log }, ownedItems: { ...s.ownedItems, [childId]: owned } };
        }),
      addWrong: (childId, w) =>
        set((s) => {
          const list = s.wrongs[childId] ?? [];
          const dup = list.some((x) => x.lessonId === w.lessonId && x.answer === w.answer && x.kind === w.kind);
          if (dup) return {};
          const next = [w, ...list].slice(0, 200);
          return { wrongs: { ...s.wrongs, [childId]: next } };
        }),
      removeWrong: (childId, uid) =>
        set((s) => ({ wrongs: { ...s.wrongs, [childId]: (s.wrongs[childId] ?? []).filter((x) => x.uid !== uid) } })),
      setParentPin: (parentPin) => set({ parentPin }),
      setDailyLimit: (dailyLimitMin) => set({ dailyLimitMin }),
      clearAll: () => set({ profiles: [], records: [], activeChildId: null, mastery: {}, lessonProgress: {}, dailyCheckin: {}, charBag: {}, wrongs: {}, points: {}, pointLog: {}, customTasks: {}, taskStates: {}, ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {}, storeOverrides: {}, taskOverrides: {}, courseSchedule: [], expeditionLastAt: {}, materials: {}, shipLevel: {}, archivedCards: {}, cardRewardClaimed: {}, showBadges: {}, badges: {} }),
    }),
    {
      name: 'smart-fun-zone',
      // v8：课程表改为周一至周五的学科安排，具体课时由系统按进度生成。
      version: 8,
      migrate: migrateAppState,
      // 面板开合状态不持久化（避免刷新后自动弹出）；其余（含唤醒偏好）照常保存
      partialize: (s) => {
        const p = { ...s } as Partial<AppState>;
        delete (p as { buddyOpen?: boolean }).buddyOpen;
        return p;
      },
    },
  ),
);

export function childRecords(records: GameRecord[], childId: string): GameRecord[] {
  return records.filter((r) => r.childId === childId);
}

export function todayPlaySec(records: GameRecord[], childId: string): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return childRecords(records, childId)
    .filter((r) => r.playedAt >= start.getTime())
    .reduce((sum, r) => sum + r.durationSec, 0);
}

/* ---------- 成长系统辅助 ---------- */

export function todayRecords(records: GameRecord[], childId: string): GameRecord[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return childRecords(records, childId).filter((r) => r.playedAt >= start.getTime());
}

export function streakDays(records: GameRecord[], childId: string): number {
  const days = new Set(
    childRecords(records, childId).map((r) => new Date(r.playedAt).toDateString()),
  );
  let streak = 0;
  const d = new Date();
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export interface GardenStage {
  stage: number;
  g: string;
  labelKey: string;
}

export function gardenStage(totalStars: number): GardenStage {
  // 卷豆花园：种下卷星币 → 发芽 → 开花 → 结豆 → 长成小卷星
  if (totalStars >= 60) return { stage: 5, g: '🪐', labelKey: 'gardenPlanet' };
  if (totalStars >= 30) return { stage: 4, g: '🌰', labelKey: 'gardenBean' };
  if (totalStars >= 16) return { stage: 3, g: '🌸', labelKey: 'gardenFlower' };
  if (totalStars >= 6) return { stage: 2, g: '🌿', labelKey: 'gardenSprout' };
  return { stage: 1, g: '🌱', labelKey: 'gardenSeed' };
}

/* ---------- 知识点掌握度辅助 ---------- */

export function skillState(
  mastery: Record<string, Record<string, MasteryState>>,
  childId: string,
  skillId: string,
): MasteryState {
  return mastery[childId]?.[skillId] ?? { stars: 0, gold: false, updatedAt: 0 };
}

export function litSkillCount(
  mastery: Record<string, Record<string, MasteryState>>,
  childId: string,
): number {
  return Object.values(mastery[childId] ?? {}).filter((m) => m.stars >= 1).length;
}

export function goldSkillCount(
  mastery: Record<string, Record<string, MasteryState>>,
  childId: string,
): number {
  return Object.values(mastery[childId] ?? {}).filter((m) => m.gold).length;
}

/* ---------- 积分系统辅助 ---------- */

export function childPoints(points: Record<string, number>, childId: string): number {
  return points[childId] ?? 0;
}

export function childPointLog(
  pointLog: Record<string, import('./points').PointEntry[]>,
  childId: string,
): import('./points').PointEntry[] {
  return pointLog[childId] ?? [];
}
