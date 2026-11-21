import { ALL_GRAMMAR_LESSONS, grammarLessonKey, grammarLessonsByLevel } from "@/data/grammarRegistry";
import type { GrammarBlock, GrammarExample, GrammarLesson, LevelId } from "@/data/types";
import { attemptStats } from "@/lib/proficiency";

export function grammarByLevel(level: LevelId | "ALL"): GrammarLesson[] {
  if (level === "ALL") return ALL_GRAMMAR_LESSONS;
  return grammarLessonsByLevel[level];
}

function collectBlockExamples(blocks: readonly GrammarBlock[] | undefined, out: GrammarExample[]) {
  if (!Array.isArray(blocks)) return;
  for (const block of blocks) {
    if (!block) continue;
    if (block.type === "examples" && Array.isArray(block.items)) {
      for (const ex of block.items) {
        if (!ex || typeof ex.ja !== "string") continue;
        const ja = ex.ja.trim();
        const zh = (ex.zh ?? "").trim();
        // Filter out non-Japanese duplicate fragment rows (e.g., ja === zh)
        if (!ja || !/[\u3040-\u30ff]/.test(ja) || (zh && ja === zh)) continue;
        out.push(ex);
      }
    } else if (block.type === "callout" && Array.isArray(block.blocks)) {
      collectBlockExamples(block.blocks, out);
    }
  }
}

export function lessonExamples(lesson: GrammarLesson): GrammarExample[] {
  const list: GrammarExample[] = [];
  for (const sec of lesson.sections ?? []) {
    if (Array.isArray(sec.blocks)) {
      collectBlockExamples(sec.blocks, list);
    }
    if (Array.isArray(sec.examples)) {
      for (const ex of sec.examples) {
        if (ex && typeof ex.ja === "string" && /[\u3040-\u30ff]/.test(ex.ja)) {
          list.push(ex);
        }
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
