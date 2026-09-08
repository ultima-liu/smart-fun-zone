import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChildProfile, GameRecord, Lang } from './types';
import { applyEntry, type PointEntry, type CustomTask, type RewardRequest } from './points';
import { drawLoot, pendingPacks, type LootDrop } from './content/expedition';
import { shipBoost } from './content/shipyard';

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
  kind: string;
  answer: string;
  time: number;
}

export interface AppState {
  lang: Lang;
  sound: boolean;
  musicOn: boolean;
  voiceOn: boolean;
  /** 家长设置：演示页可跳过（默认强制先看） */
  lessonSkipOn: boolean;
  profiles: ChildProfile[];
  activeChildId: string | null;
  records: GameRecord[];
  /** 知识点掌握度：childId → skillId → 状态 */
  mastery: Record<string, Record<string, MasteryState>>;
  /** 课程学习进度：skillId → 已完成步骤数（0-3，第 4 步=练习由 mastery 体现） */
  lessonProgress: Record<string, number>;
  /** 字卡袋：childId → 已收集汉字 */
  charBag: Record<string, string[]>;
  /** 剧情进度：childId → 已完成剧情节点 id（顺序解锁，见 content/story.ts） */
  storyDone: Record<string, string[]>;
  /** 待演示的解锁目标（完成剧情后写入；首页挂载时消费并播放卷星解封动画） */
  storyPulse: string | null;
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
  patchStoreItem: (id: string, patch: Partial<import('./points').StoreItem>) => void;
  removeStoreItem: (id: string) => void;
  patchTask: (id: string, patch: { reward?: number; enabled?: boolean }) => void;
  /** 合并远程配置（服务端为全局唯一权威，替换本地覆盖） */
  applyRemoteConfig: (storeOverrides: Record<string, import('./points').StoreItem>, taskOverrides: Record<string, { reward?: number; enabled?: boolean }>) => void;
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
  /** 数字奖励/家长奖励兑换请求：childId → RewardRequest[]（孩子提交，家长审批） */
  rewardRequests: Record<string, RewardRequest[]>;
  /** 孩子提交一个奖励兑换请求（挂起不扣分，等家长审批） */
  requestReward: (childId: string, req: Omit<RewardRequest, 'id' | 'childId' | 'createdAt' | 'status'>) => boolean;
  /** 家长批准请求 → 扣分并发放奖励（记入流水） */
  approveReward: (childId: string, requestId: string) => boolean;
  /** 家长拒绝请求（不扣分） */
  declineReward: (childId: string, requestId: string) => void;
  /** 记录一笔积分变动（自动来源传 sourceId 幂等；消费 amount 为负且不重复） */
  applyPoints: (childId: string, amount: number, reason: string, sourceId?: string) => void;
  /** 家长部署自定义任务 */
  addCustomTask: (childId: string, text: string, points: number) => void;
  removeCustomTask: (childId: string, taskId: string) => void;
  /** 家长手动确认任务完成 → 给孩子加分 */
  confirmCustomTask: (childId: string, taskId: string) => void;
  parentPin: string;
  dailyLimitMin: number;
  /** 当日加成时长（来自已审批时长券）：childId → { day: 'YYYY-MM-DD', min: n } */
  bonusMin: Record<string, { day: string; min: number }>;
  setLang: (l: Lang) => void;
  toggleSound: () => void;
  setMusicOn: (v: boolean) => void;
  setVoiceOn: (v: boolean) => void;
  setLessonSkipOn: (v: boolean) => void;
  addProfile: (p: ChildProfile) => void;
  removeProfile: (id: string) => void;
  setActiveChild: (id: string | null) => void;
  addRecord: (r: GameRecord) => void;
  /** 知识点练习达标（正确率≥80%）：+1 星，满 3 星转金色 */
  addSkillResult: (childId: string, skillId: string) => void;
  /** 完成一个学习步骤（看课文/听读/认生字），封顶 3 */
  completeLessonStep: (skillId: string) => void;
  /** 标记剧情节点完成（幂等；完成奖励由调用方通过 applyPoints 发放） */
  completeStoryNode: (childId: string, nodeId: string) => void;
  /** 重置剧情进度（回到序章起点，从第一章对话开始重玩） */
  resetStory: (childId: string) => void;
  /** 写入/清除待演示解锁目标 */
  setStoryPulse: (target: string | null) => void;
  /** 把本课生字收进字卡袋（去重） */
  collectChars: (childId: string, chars: string[]) => void;
  /** 记录一条错题（去重，保留最近 200 条） */
  addWrong: (childId: string, w: WrongItem) => void;
  /** 移除一条错题 */
  removeWrong: (childId: string, uid: string) => void;
  /** 云端同步：合并拉取到的进度（按 updatedAt 取新） */
  applyCloudProgress: (childId: string, map: Record<string, { stars?: number; stepIdx?: number; updatedAt?: number }>) => void;
  applyCloudPoints: (childId: string, entries: { id: string; amount: number; reason?: string; time?: number }[], items?: string[]) => void;
  applyCloudRewards: (childId: string, rewards: Omit<RewardRequest, 'childId'>[]) => void;
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
  /** 远征战利品材料：星屑(飞船升级) 与 星际图鉴卡碎片（childId） */
  materials: Record<string, { stardust: number; cardShard: number }>;
  /** 收取远征战利品：按时间累积的补给包数入账，返回本次掉落；无可收取返回 null */
  collectExpedition: (childId: string) => LootDrop | null;
  /** 飞船等级（船坞），1 起 */
  shipLevel: Record<string, number>;
  /** 已合成的星际图鉴卡 id 列表 */
  archivedCards: Record<string, string[]>;
  /** 飞船升级：消耗星屑+卷星币 → 升 1 级 */
  upgradeShip: (childId: string, stardustCost: number, beansCost: number) => boolean;
  /** 合成一张星际图鉴卡：消耗图鉴碎片 */
  craftCard: (childId: string, cardId: string, shardCost: number) => boolean;
  clearAll: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      lang: 'zh',
      sound: true,
      musicOn: true,
      voiceOn: true,
      lessonSkipOn: false,
      profiles: [],
      activeChildId: null,
      records: [],
      mastery: {},
      lessonProgress: {},
      charBag: {},
      storyDone: {},
      storyPulse: null,
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
      rewardRequests: {},
      bonusMin: {},
      parentPin: '1234',
      dailyLimitMin: 0,
      buddyOpen: false,
      buddyWakeOn: false,
      expeditionLastAt: {},
      materials: {},
      shipLevel: {},
      archivedCards: {},
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
          // 材料入账：星屑(飞船升级) + 图鉴卡碎片
          const prevMat = s.materials[childId] ?? { stardust: 0, cardShard: 0 };
          const nextMat = {
            stardust: prevMat.stardust + stardustTotal,
            cardShard: prevMat.cardShard + base.cardShard,
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
          const mat = st.materials[childId] ?? { stardust: 0, cardShard: 0 };
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
            materials: { ...st.materials, [childId]: { ...mat, stardust: Math.max(0, mat.stardust - stardustCost) } },
            shipLevel: { ...st.shipLevel, [childId]: cur + 1 },
            points: r.points,
            pointLog: { ...st.pointLog, [childId]: r.log },
          };
        });
        return did;
      },
      craftCard: (childId, cardId, shardCost) => {
        const s = useStore.getState();
        const owned = s.archivedCards[childId] ?? [];
        if (owned.includes(cardId)) return true; // 已合成视为成功
        const mat = s.materials[childId] ?? { stardust: 0, cardShard: 0 };
        if (mat.cardShard < shardCost) return false;
        set((st) => ({
          materials: { ...st.materials, [childId]: { ...st.materials[childId], cardShard: Math.max(0, (st.materials[childId]?.cardShard ?? 0) - shardCost) } },
          archivedCards: { ...st.archivedCards, [childId]: [...(st.archivedCards[childId] ?? []), cardId] },
        }));
        return true;
      },
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
      applyRemoteConfig: (storeOverrides, taskOverrides) => set({ storeOverrides, taskOverrides }),
      requestReward: (childId, req) => {
        let ok = false;
        useStore.setState((s) => {
          const pending = s.rewardRequests[childId] ?? [];
          if (pending.some((x) => x.itemId === req.itemId && x.status === 'pending')) return {};
          const full: RewardRequest = {
            id: `rw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            childId,
            itemId: req.itemId,
            name: req.name,
            icon: req.icon,
            kind: req.kind,
            cost: req.cost,
            createdAt: Date.now(),
            status: 'pending',
          };
          ok = true;
          return { rewardRequests: { ...s.rewardRequests, [childId]: [...pending, full] } };
        });
        return ok;
      },
      approveReward: (childId, requestId) => {
        let ok = false;
        useStore.setState((s) => {
          const list = s.rewardRequests[childId] ?? [];
          const req = list.find((x) => x.id === requestId);
          if (!req || req.status !== 'pending') return {};
          const bal = s.points[childId] ?? 0;
          if (bal < req.cost) return {};
          const r = applyEntry(s.points, s.pointLog[childId] ?? [], {
            id: `buy:${req.kind}:${req.itemId}:${Date.now()}`,
            time: Date.now(),
            amount: -req.cost,
            reason: `奖励·${req.name}`,
            childId,
          });
          const nextList = list.map((x) => (x.id === requestId ? { ...x, status: 'approved' as const, decidedAt: Date.now() } : x));
          ok = true;
          // 时长券：批准后给当日加成时长（游戏/动画各按商品面额 +min）
          const isTime = req.itemId.startsWith('rw-game') || req.itemId.startsWith('rw-video');
          let bonus = s.bonusMin[childId];
          if (isTime && bonus) {
            const today = new Date().toDateString();
            if (bonus.day !== today) bonus = { day: today, min: 0 };
            const addMin = req.itemId.startsWith('rw-video') ? 10 : 15;
            bonus = { day: bonus.day, min: bonus.min + addMin };
          } else if (isTime) {
            const today = new Date().toDateString();
            const addMin = req.itemId.startsWith('rw-video') ? 10 : 15;
            bonus = { day: today, min: addMin };
          }
          return {
            points: r.points,
            pointLog: { ...s.pointLog, [childId]: r.log },
            rewardRequests: { ...s.rewardRequests, [childId]: nextList },
            ...(bonus ? { bonusMin: { ...s.bonusMin, [childId]: bonus } } : {}),
          };
        });
        return ok;
      },
      declineReward: (childId, requestId) =>
        set((s) => {
          const list = s.rewardRequests[childId] ?? [];
          const nextList = list.map((x) => (x.id === requestId ? { ...x, status: 'declined' as const, decidedAt: Date.now() } : x));
          return { rewardRequests: { ...s.rewardRequests, [childId]: nextList } };
        }),
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
      addCustomTask: (childId, text, points) =>
        set((s) => {
          const task: CustomTask = {
            id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            text,
            points: Math.max(1, Math.round(points)),
            done: false,
            createdAt: Date.now(),
          };
          return { customTasks: { ...s.customTasks, [childId]: [...(s.customTasks[childId] ?? []), task] } };
        }),
      removeCustomTask: (childId, taskId) =>
        set((s) => ({ customTasks: { ...s.customTasks, [childId]: (s.customTasks[childId] ?? []).filter((t) => t.id !== taskId) } })),
      confirmCustomTask: (childId, taskId) =>
        set((s) => {
          const list = s.customTasks[childId] ?? [];
          const task = list.find((t) => t.id === taskId);
          if (!task || task.done) return {};
          // 家长手动确认 → 发放积分
                    const entry: PointEntry = {
            id: `task:${task.id}`,
            time: Date.now(),
            amount: task.points,
            reason: `任务·${task.text}`,
            childId,
          };
          const r = applyEntry(s.points, s.pointLog[childId] ?? [], entry);
          const nextList = list.map((t) => (t.id === taskId ? { ...t, done: true, doneAt: Date.now() } : t));
          return { points: r.points, pointLog: { ...s.pointLog, [childId]: r.log }, customTasks: { ...s.customTasks, [childId]: nextList } };
        }),
      setLang: (lang) => set({ lang }),
      toggleSound: () => set((s) => ({ sound: !s.sound })),
      setMusicOn: (musicOn) => set({ musicOn }),
      setVoiceOn: (voiceOn) => set({ voiceOn }),
      setLessonSkipOn: (lessonSkipOn) => set({ lessonSkipOn }),
      addProfile: (p) =>
        set((s) => ({ profiles: [...s.profiles, p], points: { ...s.points, [p.id]: INITIAL_POINTS } })),
      removeProfile: (id) =>
        set((s) => ({
          profiles: s.profiles.filter((p) => p.id !== id),
          records: s.records.filter((r) => r.childId !== id),
          mastery: (() => { const m = { ...s.mastery }; delete m[id]; return m; })(),
          points: (() => { const p = { ...s.points }; delete p[id]; return p; })(),
          pointLog: (() => { const p = { ...s.pointLog }; delete p[id]; return p; })(),
          charBag: (() => { const c = { ...s.charBag }; delete c[id]; return c; })(),
          wrongs: (() => { const w = { ...s.wrongs }; delete w[id]; return w; })(),
          customTasks: (() => { const t = { ...s.customTasks }; delete t[id]; return t; })(),
          ownedItems: (() => { const o = { ...s.ownedItems }; delete o[id]; return o; })(),
          equipped: (() => { const e = { ...s.equipped }; delete e[id]; return e; })(),
          avatarColor: (() => { const a = { ...s.avatarColor }; delete a[id]; return a; })(),
          avatarHair: (() => { const h = { ...s.avatarHair }; delete h[id]; return h; })(),
          storyDone: (() => { const d = { ...s.storyDone }; delete d[id]; return d; })(),
          rewardRequests: (() => { const r = { ...s.rewardRequests }; delete r[id]; return r; })(),
          expeditionLastAt: (() => { const e = { ...s.expeditionLastAt }; delete e[id]; return e; })(),
          materials: (() => { const m = { ...s.materials }; delete m[id]; return m; })(),
          shipLevel: (() => { const sh = { ...s.shipLevel }; delete sh[id]; return sh; })(),
          archivedCards: (() => { const a = { ...s.archivedCards }; delete a[id]; return a; })(),
          activeChildId: s.activeChildId === id ? null : s.activeChildId,
        })),
      setActiveChild: (activeChildId) => set({ activeChildId }),
      addRecord: (r) => set((s) => ({ records: [...s.records, r] })),
      addSkillResult: (childId, skillId) =>
        set((s) => {
          const childMap = { ...(s.mastery[childId] ?? {}) };
          const prev = childMap[skillId] ?? { stars: 0, gold: false, updatedAt: 0 };
          const stars = Math.min(3, prev.stars + 1);
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
      completeStoryNode: (childId, nodeId) =>
        set((s) => {
          const cur = s.storyDone[childId] ?? [];
          if (cur.includes(nodeId)) return {};
          return { storyDone: { ...s.storyDone, [childId]: [...cur, nodeId] } };
        }),
      resetStory: (childId) =>
        set((s) => ({ storyDone: { ...s.storyDone, [childId]: [] } })),
      setStoryPulse: (target) => set({ storyPulse: target }),
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
      applyCloudPoints: (childId, entries, items) =>
        set((s) => {
          let log = s.pointLog[childId] ?? [];
          for (const e of entries ?? []) {
            const id = String(e.id);
            if (log.some((x) => x.id === id)) continue;
            log = [{ id, time: e.time ?? Date.now(), amount: e.amount, reason: e.reason ?? '', childId }, ...log].slice(0, 600);
          }
          const balance = log.reduce((sum, x) => sum + x.amount, 0);
          let owned = s.ownedItems[childId] ?? [];
          for (const it of items ?? []) if (!owned.includes(it)) owned = [...owned, it];
          return { points: { ...s.points, [childId]: Math.max(0, balance) }, pointLog: { ...s.pointLog, [childId]: log }, ownedItems: { ...s.ownedItems, [childId]: owned } };
        }),
      applyCloudRewards: (childId, rewards) =>
        set((s) => {
          const mine = s.rewardRequests[childId] ?? [];
          const byId = new Map(mine.map((r) => [r.id, r]));
          const incoming = (rewards ?? []).map((r) => ({ ...r, childId }) as RewardRequest);
          for (const rw of incoming) {
            const prev = byId.get(rw.id);
            // 云端状态更新（pending→approved/declined）；本地已有且更新则跳过
            if (prev) {
              if (prev.status === 'pending' && rw.status !== 'pending') byId.set(rw.id, rw);
              continue;
            }
            byId.set(rw.id, rw);
          }
          const merged = [...byId.values()];
          return { rewardRequests: { ...s.rewardRequests, [childId]: merged } };
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
      clearAll: () => set({ profiles: [], records: [], activeChildId: null, mastery: {}, lessonProgress: {}, charBag: {}, storyDone: {}, storyPulse: null, wrongs: {}, points: {}, pointLog: {}, customTasks: {}, ownedItems: {}, equipped: {}, avatarColor: {}, avatarHair: {}, rewardRequests: {}, storeOverrides: {}, taskOverrides: {}, expeditionLastAt: {}, materials: {}, shipLevel: {}, archivedCards: {} }),
    }),
    {
      name: 'smart-fun-zone',
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

export function childTotalStars(records: GameRecord[], childId: string): number {
  return childRecords(records, childId).reduce((sum, r) => sum + r.stars, 0);
}

export function starsForGame(records: GameRecord[], childId: string, gameId: string): number {
  const list = childRecords(records, childId).filter((r) => r.gameId === gameId);
  return list.length === 0 ? 0 : Math.max(...list.map((r) => r.stars));
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

export function todayStars(records: GameRecord[], childId: string): number {
  return todayRecords(records, childId).reduce((s, r) => s + r.stars, 0);
}

export function todayGameKinds(records: GameRecord[], childId: string): number {
  return new Set(todayRecords(records, childId).map((r) => r.gameId)).size;
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
  // 卷豆花园：种下卷卷豆 → 发芽 → 开花 → 结豆 → 长成小卷星
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
