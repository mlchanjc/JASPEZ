import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const levels = ["n5", "n4", "n3", "n2", "n1"];

const imports = [];
const manifestEntries = [];
const lessonEntries = [];

for (const level of levels) {
  const dir = path.join(root, "data", "vocab", level);
  await mkdir(dir, { recursive: true });
  const upper = level.toUpperCase();
  let files = [];
  try {
    files = (await readdir(dir)).filter((name) => /^\d+\.json$/.test(name));
  } catch {
    files = [];
  }
  files.sort((a, b) => Number(a.slice(0, -5)) - Number(b.slice(0, -5)));
  const topics = [];
  const lessonLines = [];
  for (const file of files) {
    const id = file.slice(0, -5).padStart(2, "0");
    const lesson = JSON.parse(await readFile(path.join(dir, file), "utf8"));
    topics.push({ id, title: lesson.title, wordCount: lesson.words.length });
    const alias = `${level}_${id}`;
    imports.push(`import ${alias} from "../../data/vocab/${level}/${file}";`);
    lessonLines.push(`    "${id}": ${alias} as LessonFile,`);
  }
  const manifest = { level: upper, topics };
  await writeFile(path.join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const manifestAlias = `${level}Manifest`;
  imports.push(`import ${manifestAlias} from "../../data/vocab/${level}/manifest.json";`);
  manifestEntries.push(`  ${upper}: ${manifestAlias} as LevelManifest,`);
  lessonEntries.push(`  ${upper}: {\n${lessonLines.join("\n")}\n  },`);
}

const source = `import type { LessonFile, LevelId, LevelManifest } from "./types";

${imports.join("\n")}

export const LEVELS: LevelId[] = ["N5", "N4", "N3", "N2", "N1"];

export const manifests: Record<LevelId, LevelManifest> = {
${manifestEntries.join("\n")}
};

export const lessons: Record<LevelId, Record<string, LessonFile>> = {
${lessonEntries.join("\n")}
};
`;

await mkdir(path.join(root, "src", "data"), { recursive: true });
await writeFile(path.join(root, "src", "data", "registry.ts"), source, "utf8");
console.log(`registry topics ${imports.length}`);
