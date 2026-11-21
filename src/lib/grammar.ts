import { GRAMMAR_POINTS } from "@/data/grammar";
import type { GrammarVariant, LevelId } from "@/data/types";
import { attemptStats } from "@/lib/proficiency";

function normalizeGrammar(value: string) {
  return value.normalize("NFKC").trim().toLowerCase().replace(/[\s・･？?。、]/g, "");
}

export function isCorrectGrammarAnswer(variant: GrammarVariant, input: string) {
  const normalized = normalizeGrammar(input);
  if (!normalized) return false;
  return variant.accepted.some((item) => normalizeGrammar(item) === normalized);
}

export function grammarByLevel(level: LevelId | "ALL") {
  if (level === "ALL") return GRAMMAR_POINTS;
  return GRAMMAR_POINTS.filter((item) => item.level === level);
}

export function grammarLevelSummary(
  level: LevelId,
  grammarLearned: ReadonlySet<string>,
  grammarAttempts: Readonly<Record<string, number[]>>,
) {
  const items = GRAMMAR_POINTS.filter((item) => item.level === level);
  const proficiencyCounts = [0, 0, 0, 0];
  let learnedCount = 0;

  for (const item of items) {
    if (grammarLearned.has(item.id)) learnedCount += 1;
    proficiencyCounts[attemptStats(grammarAttempts[item.id]).level] += 1;
  }

  return {
    total: items.length,
    learnedCount,
    percent: items.length === 0 ? 0 : learnedCount / items.length,
    proficiencyCounts,
  };
}
