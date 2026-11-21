import { lessons, manifests } from "@/data/registry";
import type { LevelId } from "@/data/types";
import { attemptStats } from "@/lib/proficiency";

export function wordKey(level: LevelId, topicId: string, index: number) {
  return `${level}:${topicId}:${index}`;
}

export function topicCompletion(level: LevelId, topicId: string, learned: ReadonlySet<string>) {
  const words = lessons[level][topicId]?.words ?? [];
  if (words.length === 0) return 0;
  const done = words.filter((_, index) => learned.has(wordKey(level, topicId, index))).length;
  return done / words.length;
}

export function levelCompletion(level: LevelId, learned: ReadonlySet<string>) {
  let total = 0;
  let done = 0;
  for (const topic of manifests[level].topics) {
    const words = lessons[level][topic.id]?.words ?? [];
    total += words.length;
    done += words.filter((_, index) => learned.has(wordKey(level, topic.id, index))).length;
  }
  return { total, done, percent: total === 0 ? 0 : done / total };
}

export function levelSummary(
  level: LevelId,
  learned: ReadonlySet<string>,
  attempts: Readonly<Record<string, number[]>>,
) {
  const proficiencyCounts = [0, 0, 0, 0];
  let total = 0;
  let learnedCount = 0;
  for (const topic of manifests[level].topics) {
    const words = lessons[level][topic.id]?.words ?? [];
    total += words.length;
    words.forEach((_, index) => {
      const key = wordKey(level, topic.id, index);
      if (learned.has(key)) learnedCount += 1;
      proficiencyCounts[attemptStats(attempts[key]).level] += 1;
    });
  }
  return {
    lessons: manifests[level].topics.length,
    total,
    learnedCount,
    percent: total === 0 ? 0 : learnedCount / total,
    proficiencyCounts,
  };
}

export function isLevelId(value: string): value is LevelId {
  return value === "N5" || value === "N4" || value === "N3" || value === "N2" || value === "N1";
}
