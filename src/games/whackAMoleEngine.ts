export type MoleDifficulty = 'easy' | 'normal' | 'hard';
export type MoleKind = 'mole' | 'gold' | 'rabbit';
export const ROUND_MS = 60_000;
export const MOLE_LEVELS = {
  easy: { zh: '轻松', en: 'Easy', interval: 850, lifetime: 1500, max: 2, target: 200 },
  normal: { zh: '认真', en: 'Normal', interval: 660, lifetime: 1150, max: 3, target: 350 },
  hard: { zh: '高手', en: 'Hard', interval: 480, lifetime: 850, max: 4, target: 500 },
};

export interface MoleHole {
  kind: MoleKind | null;
  expires: number;
  feedback: string | null;
  feedbackUntil: number;
}

export function createMoleRound(difficulty: MoleDifficulty) {
  return {
    difficulty, elapsed: 0, nextSpawn: 0, score: 0, combo: 0, maxCombo: 0,
    hits: 0, attempts: 0, missed: 0, rabbitHits: 0, over: false,
    holes: Array.from({ length: 9 }, (): MoleHole => ({ kind: null, expires: 0, feedback: null, feedbackUntil: 0 })),
  };
}
export type MoleRound = ReturnType<typeof createMoleRound>;
export const moleMultiplier = (combo: number) => Math.min(3, 1 + Math.floor(combo / 5));

/** Advance only active play time. Pausing never calls this function. */
export function advanceMoleRound(round: MoleRound, delta: number, random = Math.random) {
  if (round.over) return;
  round.elapsed = Math.min(ROUND_MS, round.elapsed + Math.max(0, delta));
  if (round.elapsed >= ROUND_MS) {
    round.over = true;
    round.holes.forEach((hole) => { hole.kind = null; hole.feedback = null; });
    return;
  }
  round.holes.forEach((hole) => {
    if (hole.feedbackUntil <= round.elapsed) hole.feedback = null;
    if (hole.kind && hole.expires <= round.elapsed) {
      if (hole.kind !== 'rabbit') { round.missed++; round.combo = 0; }
      hole.kind = null;
    }
  });
  const level = MOLE_LEVELS[round.difficulty];
  if (round.elapsed < round.nextSpawn) return;
  const firstVisitor = round.nextSpawn === 0;
  round.nextSpawn = round.elapsed + level.interval;
  const empty = round.holes.filter((hole) => !hole.kind && !hole.feedback);
  if (!empty.length || round.holes.filter((hole) => hole.kind).length >= level.max) return;
  const hole = empty[Math.min(empty.length - 1, Math.floor(random() * empty.length))];
  // The first visitor is always a mole, so the opening is easy to understand.
  const chance = firstVisitor ? 0.5 : random();
  hole.kind = chance < 0.18 ? 'rabbit' : chance > 0.85 ? 'gold' : 'mole';
  hole.expires = round.elapsed + level.lifetime;
}

export function hitMoleHole(round: MoleRound, index: number): MoleKind | 'empty' | null {
  if (round.over || round.elapsed >= ROUND_MS) return null;
  const hole = round.holes[index];
  if (!hole || hole.feedback) return null;
  // An input arriving between timer ticks must not hit an expired visitor.
  if (hole.kind && hole.expires <= round.elapsed) hole.kind = null;
  const kind = hole.kind;
  round.attempts++;
  if (!kind || kind === 'rabbit') {
    round.combo = 0;
    if (kind === 'rabbit') { round.rabbitHits++; round.score = Math.max(0, round.score - 20); }
    hole.feedback = kind === 'rabbit' ? '−20' : '·';
  } else {
    round.hits++;
    round.combo++;
    round.maxCombo = Math.max(round.maxCombo, round.combo);
    const points = (kind === 'gold' ? 30 : 10) * moleMultiplier(round.combo);
    round.score += points;
    hole.feedback = `+${points}`;
  }
  hole.kind = null;
  hole.feedbackUntil = round.elapsed + 430;
  return kind ?? 'empty';
}
