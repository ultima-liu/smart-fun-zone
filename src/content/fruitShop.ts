export type FruitKind = 'apple' | 'orange' | 'pear' | 'grape';

export const FRUIT_META: Record<FruitKind, { emoji: string; name: string; color: string }> = {
  apple: { emoji: '🍎', name: '苹果', color: '#e75d57' },
  orange: { emoji: '🍊', name: '橙子', color: '#f39a38' },
  pear: { emoji: '🍐', name: '梨', color: '#9cc55a' },
  grape: { emoji: '🍇', name: '葡萄', color: '#8b68c7' },
};

const GUESTS = [
  { emoji: '🐰', name: '兔兔' },
  { emoji: '🐼', name: '熊猫' },
  { emoji: '🦊', name: '狐狸' },
  { emoji: '🐻', name: '小熊' },
  { emoji: '🐸', name: '青蛙' },
];

export type FruitShopLevel = 1 | 2 | 3;
export type FruitShopAbility = 'counting' | 'make-up' | 'compare' | 'decompose' | 'addition' | 'subtraction' | 'make-ten';

export type FruitShopAllocationRound = {
  id: string;
  kind: 'serve' | 'topup' | 'split';
  fruit: FruitKind;
  guests: Array<{ emoji: string; name: string }>;
  targets: number[];
  initial: number[];
  ability: 'counting' | 'make-up' | 'decompose';
  prompt: string;
};

export type FruitShopCompareRound = {
  id: string;
  kind: 'compare';
  fruit: FruitKind;
  guests: Array<{ emoji: string; name: string }>;
  amounts: [number, number];
  ask: 'more' | 'less';
  answer: 0 | 1;
  ability: 'compare';
  prompt: string;
};

export type FruitShopCalculationRound = {
  id: string;
  kind: 'addition' | 'subtraction' | 'make-ten';
  fruit: FruitKind;
  guests: Array<{ emoji: string; name: string }>;
  first: number;
  second: number;
  answer: number;
  options: number[];
  ability: 'addition' | 'subtraction' | 'make-ten';
  prompt: string;
};

export type FruitShopRound = FruitShopAllocationRound | FruitShopCompareRound | FruitShopCalculationRound;

/** 每课只映射一个最适合迁移到水果店的核心能力，避免一次推荐塞入过多目标。 */
export const FRUIT_SHOP_LESSON_ABILITIES: Record<string, FruitShopAbility> = {
  numbers: 'counting',
  compare: 'compare', 'compare-order-nine': 'compare',
  compose: 'decompose', 'compose-six-nine': 'decompose',
  'add-within-5': 'addition', 'solve-total-within-7': 'addition', 'solve-total': 'addition',
  'subtract-within-5': 'subtraction', 'solve-remain-within-7': 'subtraction',
  ten: 'make-ten',
  'plus-nine': 'make-ten', 'plus-eight-seven-six': 'make-ten', 'plus-eight-nine-strategies': 'make-ten',
};

/** 专属订单遵守本课数量范围，不能因为切换难度提前使用后续课程的数。 */
const FRUIT_SHOP_LESSON_MAX: Record<string, number> = {
  numbers: 5, compare: 5, compose: 5,
  'add-within-5': 5, 'subtract-within-5': 5,
  'compare-order-nine': 9, 'compose-six-nine': 9,
  'solve-total-within-7': 7, 'solve-remain-within-7': 7,
  ten: 10, 'plus-nine': 20, 'plus-eight-seven-six': 20, 'plus-eight-nine-strategies': 20,
  'solve-total': 20,
};

export function fruitShopAbilityForLesson(lessonId: string | null | undefined): FruitShopAbility | undefined {
  return lessonId ? FRUIT_SHOP_LESSON_ABILITIES[lessonId] : undefined;
}

export function fruitShopMaxForLesson(lessonId: string | null | undefined): number | undefined {
  return lessonId ? FRUIT_SHOP_LESSON_MAX[lessonId] : undefined;
}

export function unlockedFruitShopAbilities(completedLessonIds: string[]): FruitShopAbility[] {
  const abilities = new Set<FruitShopAbility>(['counting']);
  completedLessonIds.forEach((lessonId) => {
    const ability = fruitShopAbilityForLesson(lessonId);
    if (ability) abilities.add(ability);
  });
  return [...abilities];
}

function int(random: () => number, min: number, max: number) {
  return min + Math.floor(random() * (max - min + 1));
}

function pick<T>(random: () => number, values: T[]): T {
  return values[Math.floor(random() * values.length)] ?? values[0];
}

/** 同一课程/复习节点使用同一随机序列，避免每次进入时订单无故改变。 */
export function createFruitShopRandom(seed: string): () => number {
  let state = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16_777_619);
  }
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function twoGuests(random: () => number) {
  const first = int(random, 0, GUESTS.length - 1);
  const second = (first + int(random, 1, GUESTS.length - 1)) % GUESTS.length;
  return [GUESTS[first], GUESTS[second]];
}

function compareRound(random: () => number, id: string, max: number): FruitShopCompareRound {
  const [left, right] = twoGuests(random);
  const a = int(random, 2, Math.max(3, max - 1));
  let b = int(random, 1, max);
  if (a === b) b = b === max ? b - 1 : b + 1;
  const ask = random() > .5 ? 'less' : 'more';
  const answer = (ask === 'more' ? (a > b ? 0 : 1) : (a < b ? 0 : 1)) as 0 | 1;
  return {
    id,
    kind: 'compare',
    fruit: pick(random, Object.keys(FRUIT_META) as FruitKind[]),
    guests: [left, right],
    amounts: [a, b],
    ask,
    answer,
    ability: 'compare',
    prompt: `${left.name}和${right.name}都装好了水果，谁的${ask === 'more' ? '更多' : '更少'}？`,
  };
}

function numberOptions(random: () => number, answer: number, max = 10) {
  const candidates = [answer, Math.max(0, answer - 1), Math.min(max, answer + 1), Math.min(max, answer + 2)];
  const unique = [...new Set(candidates)];
  for (let candidate = 0; unique.length < 3 && candidate <= max; candidate += 1) {
    if (!unique.includes(candidate)) unique.push(candidate);
  }
  return unique.slice(0, 3).sort(() => random() - .5);
}

function calculationRound(random: () => number, id: string, ability: 'addition' | 'subtraction' | 'make-ten', level: FruitShopLevel, quantityMax?: number): FruitShopCalculationRound {
  const guest = GUESTS[int(random, 0, GUESTS.length - 1)];
  const fruit = pick(random, Object.keys(FRUIT_META) as FruitKind[]);
  if (ability === 'make-ten') {
    const first = int(random, 6, 9);
    const answer = 10 - first;
    return {
      id, kind: 'make-ten', fruit, guests: [guest], first, second: 10, answer,
      options: numberOptions(random, answer, 10), ability,
      prompt: `一盒能装 10 个${FRUIT_META[fruit].name}，已经装了 ${first} 个，还差几个能装满？`,
    };
  }
  if (ability === 'subtraction') {
    const max = quantityMax ?? (level === 1 ? 5 : 10);
    const first = int(random, 2, max);
    const second = int(random, 1, first - 1);
    const answer = first - second;
    return {
      id, kind: 'subtraction', fruit, guests: [guest], first, second, answer,
      options: numberOptions(random, answer, max), ability,
      prompt: `${guest.name}原来有 ${first} 个${FRUIT_META[fruit].name}，吃掉 ${second} 个，还剩几个？`,
    };
  }
  const max = quantityMax ?? (level === 1 ? 5 : level === 2 ? 10 : 12);
  const first = int(random, 1, Math.max(2, Math.floor(max / 2)));
  const second = int(random, 1, Math.max(1, max - first));
  const answer = first + second;
  return {
    id, kind: 'addition', fruit, guests: [guest], first, second, answer,
    options: numberOptions(random, answer, max), ability,
    prompt: `${guest.name}要 ${first} 个${FRUIT_META[fruit].name}，又加了 ${second} 个，一共要几个？`,
  };
}

function abilityRound(random: () => number, id: string, ability: FruitShopAbility, level: FruitShopLevel, quantityMax?: number): FruitShopRound {
  const fruits = Object.keys(FRUIT_META) as FruitKind[];
  if (ability === 'compare') return compareRound(random, id, quantityMax ?? (level === 1 ? 5 : 10));
  if (ability === 'addition' || ability === 'subtraction' || ability === 'make-ten') return calculationRound(random, id, ability, level, quantityMax);
  if (ability === 'decompose') {
    const [left, right] = twoGuests(random);
    const total = int(random, 2, quantityMax ?? (level === 1 ? 5 : 10));
    const leftTarget = int(random, 1, total - 1);
    const targets: [number, number] = [leftTarget, total - leftTarget];
    const fruit = pick(random, fruits);
    return {
      id, kind: 'split', fruit, guests: [left, right], targets, initial: [0, 0], ability,
      prompt: `把 ${targets[0] + targets[1]} 个${FRUIT_META[fruit].name}分给两位客人：${left.name}要 ${targets[0]} 个，${right.name}要 ${targets[1]} 个。`,
    };
  }
  const guest = GUESTS[int(random, 0, GUESTS.length - 1)];
  const fruit = pick(random, fruits);
  const max = quantityMax ?? (level === 1 ? 5 : level === 2 ? 10 : 20);
  const target = int(random, ability === 'counting' ? 1 : 4, max);
  const initial = ability === 'make-up' ? int(random, 1, Math.max(1, target - 1)) : 0;
  return {
    id, kind: ability === 'make-up' ? 'topup' : 'serve', fruit, guests: [guest], targets: [target], initial: [initial], ability,
    prompt: ability === 'make-up'
      ? `${guest.name}想要 ${target} 个${FRUIT_META[fruit].name}，篮子里已经有 ${initial} 个，还要放几个？`
      : `请给${guest.name}装 ${target} 个${FRUIT_META[fruit].name}。`,
  };
}

/** 生成一轮三单任务。random 可注入，便于验证所有数量边界。 */
export function buildFruitShopSession(
  level: FruitShopLevel,
  random: () => number = Math.random,
  focusAbility?: FruitShopAbility,
  unlockedAbilities?: FruitShopAbility[],
  quantityMax?: number,
): FruitShopRound[] {
  // 从课程或课程复习进入时，三张订单都服务于本课目标，不混入其他课程能力。
  if (focusAbility) {
    return Array.from({ length: 3 }, (_, index) => abilityRound(random, `lesson-${focusAbility}-${index}`, focusAbility, level, quantityMax));
  }
  if (unlockedAbilities) {
    const pool = unlockedAbilities.length ? unlockedAbilities : ['counting' as const];
    const shuffled = [...pool].sort(() => random() - .5);
    const sessionAbilities: FruitShopAbility[] = [];
    shuffled.forEach((ability) => {
      if (sessionAbilities.length < 3 && !sessionAbilities.includes(ability)) sessionAbilities.push(ability);
    });
    while (sessionAbilities.length < 3) sessionAbilities.push(pick(random, pool));
    return sessionAbilities.map((ability, index) => abilityRound(random, `course-${ability}-${index}`, ability, level));
  }
  const fruits = Object.keys(FRUIT_META) as FruitKind[];
  if (level === 1) {
    return Array.from({ length: 3 }, (_, index) => {
      const guest = GUESTS[(int(random, 0, GUESTS.length - 1) + index) % GUESTS.length];
      const target = int(random, 1, 5);
      const fruit = pick(random, fruits);
      return {
        id: `l1-${index}`,
        kind: 'serve' as const,
        fruit,
        guests: [guest],
        targets: [target],
        initial: [0],
        ability: 'counting' as const,
        prompt: `请给${guest.name}装 ${target} 个${FRUIT_META[fruit].name}。`,
      };
    });
  }

  const guest = GUESTS[int(random, 0, GUESTS.length - 1)];
  const fruit = pick(random, fruits);
  const target = int(random, level === 2 ? 5 : 7, 10);
  const initial = int(random, 1, Math.max(1, target - 2));
  const first: FruitShopAllocationRound = {
    id: `l${level}-topup`, kind: 'topup', fruit, guests: [guest], targets: [target], initial: [initial], ability: 'make-up',
    prompt: `${guest.name}想要 ${target} 个${FRUIT_META[fruit].name}，篮子里已经有 ${initial} 个，还要放几个？`,
  };
  const comparison = compareRound(random, `l${level}-compare`, level === 2 ? 8 : 10);
  if (level === 2) {
    const finalGuest = GUESTS[(GUESTS.indexOf(guest) + 2) % GUESTS.length];
    const finalTarget = int(random, 4, 10);
    const finalFruit = pick(random, fruits);
    return [first, comparison, {
      id: 'l2-serve', kind: 'serve', fruit: finalFruit, guests: [finalGuest], targets: [finalTarget], initial: [0], ability: 'counting',
      prompt: `最后，请给${finalGuest.name}装 ${finalTarget} 个${FRUIT_META[finalFruit].name}。`,
    }];
  }

  const [left, right] = twoGuests(random);
  const leftTarget = int(random, 2, 5);
  const rightTarget = int(random, 2, 5);
  const splitFruit = pick(random, fruits);
  const split: FruitShopAllocationRound = {
    id: 'l3-split', kind: 'split', fruit: splitFruit, guests: [left, right], targets: [leftTarget, rightTarget], initial: [0, 0], ability: 'decompose',
    prompt: `把 ${leftTarget + rightTarget} 个${FRUIT_META[splitFruit].name}分给两位客人：${left.name}要 ${leftTarget} 个，${right.name}要 ${rightTarget} 个。`,
  };
  return [first, split, comparison];
}

export function adaptFruitShopLevel(
  current: FruitShopLevel,
  assistedRoundStreak: number,
  independentRoundStreak: number,
): FruitShopLevel {
  if (assistedRoundStreak >= 2) return Math.max(1, current - 1) as FruitShopLevel;
  if (independentRoundStreak >= 3) return Math.min(3, current + 1) as FruitShopLevel;
  return current;
}

export const FRUIT_SHOP_ABILITY_LABELS = {
  counting: '点数与一一对应',
  'make-up': '补齐数量',
  compare: '比较多少',
  decompose: '数量分解',
  addition: '把两部分合起来',
  subtraction: '拿走后还剩多少',
  'make-ten': '凑十',
} as const;
