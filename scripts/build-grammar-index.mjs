import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const levels = ["n5", "n4", "n3", "n2", "n1"];

const imports = [];
const levelEntries = [];
let totalLessons = 0;

for (const level of levels) {
  const dir = path.join(root, "data", "grammar", level);
  const upper = level.toUpperCase();
  let files = [];
  try {
    files = (await readdir(dir)).filter((name) => /^\d+\.json$/.test(name));
  } catch {
    files = [];
  }
  files.sort((a, b) => Number(a.slice(0, -5)) - Number(b.slice(0, -5)));

  const lessonLines = [];
  for (const file of files) {
    const raw = JSON.parse(await readFile(path.join(dir, file), "utf8"));
    const id = String(raw.id ?? file.slice(0, -5)).padStart(2, "0");
    const alias = `g_${level}_${id}`;
    imports.push(`import ${alias} from "../../data/grammar/${level}/${file}";`);
    lessonLines.push(`    ${alias} as GrammarLesson,`);
    totalLessons += 1;
  }

  levelEntries.push(`  ${upper}: [\n${lessonLines.join("\n")}\n  ],`);
}

const source = `import type { LevelId, GrammarLesson } from "./types";

${imports.join("\n")}

export const grammarLessonsByLevel: Record<LevelId, GrammarLesson[]> = {
${levelEntries.join("\n")}
};

export const ALL_GRAMMAR_LESSONS: GrammarLesson[] = [
  ...grammarLessonsByLevel.N5,
  ...grammarLessonsByLevel.N4,
  ...grammarLessonsByLevel.N3,
  ...grammarLessonsByLevel.N2,
  ...grammarLessonsByLevel.N1,
];

export function grammarLessonKey(level: LevelId, id: string) {
  return \`\${level}:\${id}\`;
}

export function findGrammarLesson(level: LevelId, id: string): GrammarLesson | undefined {
  return grammarLessonsByLevel[level].find((item) => item.id === id);
}
`;

await mkdir(path.join(root, "src", "data"), { recursive: true });
await writeFile(path.join(root, "src", "data", "grammarRegistry.ts"), source, "utf8");
console.log(`Generated src/data/grammarRegistry.ts with ${totalLessons} grammar lessons.`);
