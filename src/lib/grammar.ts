import { ALL_GRAMMAR_LESSONS, grammarLessonKey, grammarLessonsByLevel } from "@/data/grammarRegistry";
import type { LevelId, SigureGrammarExample, SigureGrammarLesson } from "@/data/types";
import { attemptStats } from "@/lib/proficiency";

export function grammarByLevel(level: LevelId | "ALL"): SigureGrammarLesson[] {
  if (level === "ALL") return ALL_GRAMMAR_LESSONS;
  return grammarLessonsByLevel[level];
}

export function lessonExamples(lesson: SigureGrammarLesson): SigureGrammarExample[] {
  const list: SigureGrammarExample[] = [];
  for (const sec of lesson.sections ?? []) {
    for (const ex of sec.examples ?? []) {
      if (ex && typeof ex.ja === "string" && ex.ja.trim().length > 0) {
        list.push(ex);
      }
    }
  }
  return list;
}

export function grammarLevelSummary(
  level: LevelId,
  grammarLearned: ReadonlySet<string>,
  grammarAttempts: Readonly<Record<string, number[]>>,
) {
  const items = grammarLessonsByLevel[level];
  const proficiencyCounts = [0, 0, 0, 0];
  let learnedCount = 0;

  for (const item of items) {
    const key = grammarLessonKey(item.level, item.id);
    if (grammarLearned.has(key)) learnedCount += 1;
    proficiencyCounts[attemptStats(grammarAttempts[key]).level] += 1;
  }

  return {
    total: items.length,
    learnedCount,
    percent: items.length === 0 ? 0 : learnedCount / items.length,
    proficiencyCounts,
  };
}
