export const PROFICIENCY_LEVELS = ["未記", "初識", "熟悉", "記住"] as const;

export const PROFICIENCY_MAX = PROFICIENCY_LEVELS.length - 1;

export const ATTEMPT_WINDOW = 8;

const LEVEL_SEEDS: number[][] = [
  [],
  [1, 0, 1, 0],
  [1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1],
];

export function clampProficiency(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(PROFICIENCY_MAX, Math.round(value)));
}

export function proficiencyLabel(value: number) {
  return PROFICIENCY_LEVELS[clampProficiency(value)];
}

export function levelFromAttempts(attempts: readonly number[]) {
  const total = attempts.length;
  if (total < 2) return 0;
  const correct = attempts.reduce((sum, item) => sum + (item ? 1 : 0), 0);
  const rate = correct / total;
  if (total >= 5 && rate >= 0.8) return 3;
  if (total >= 3 && rate >= 0.6) return 2;
  if (rate >= 0.4) return 1;
  return 0;
}

export function attemptStats(attempts: readonly number[] | undefined) {
  const history = attempts ?? [];
  const total = history.length;
  const correct = history.reduce((sum, item) => sum + (item ? 1 : 0), 0);
  return { correct, total, level: levelFromAttempts(history) };
}

export function seedAttempts(level: number) {
  return [...(LEVEL_SEEDS[clampProficiency(level)] ?? [])];
}

export function pushAttempt(attempts: readonly number[] | undefined, correct: boolean) {
  const next = [...(attempts ?? []), correct ? 1 : 0];
  return next.slice(-ATTEMPT_WINDOW);
}
