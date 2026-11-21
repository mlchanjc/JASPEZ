/**
 * Generates src/data/grammarImages.ts with static require() calls and exact PNG/JPEG dimensions
 * from data/grammar/images.json so React Native / Expo bundles every lesson image offline
 * at its true aspect ratio.
 * Usage: node scripts/build-grammar-images.mjs
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const imagesJsonPath = path.join(root, "data", "grammar", "images.json");
const raw = JSON.parse(await readFile(imagesJsonPath, "utf8"));

function readImageDimensions(buf) {
  // PNG: signature 89 50 4E 47, IHDR width at offset 16 (4 bytes BE), height at 20 (4 bytes BE)
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    if (w > 0 && h > 0) return { width: w, height: h };
  }
  // JPEG fallback
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) break;
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7)) {
        const h = buf.readUInt16BE(i + 5);
        const w = buf.readUInt16BE(i + 7);
        if (w > 0 && h > 0) return { width: w, height: h };
      }
      i += 2 + len;
    }
  }
  return { width: 16, height: 9 };
}

function normalizeKey(src) {
  return String(src ?? "")
    .replace(/^https?:\/\/[^/]+/i, "")
    .trim();
}

const entries = [];
const seen = new Set();

for (const item of raw.images ?? []) {
  const relFile = String(item.file ?? "").replace(/\\/g, "/");
  if (!relFile) continue;
  const fullPath = path.join(root, relFile);
  let dims = { width: 16, height: 9 };
  try {
    const buf = await readFile(fullPath);
    dims = readImageDimensions(buf);
  } catch {
    continue;
  }

  const key = normalizeKey(item.src);
  if (!key || seen.has(key)) continue;
  seen.add(key);

  const reqPath = `../../${relFile}`;
  entries.push(
    `  ${JSON.stringify(key)}: { source: require(${JSON.stringify(reqPath)}), width: ${dims.width}, height: ${dims.height} },`,
  );
}

const out = `import type { ImageSourcePropType } from "react-native";

export type BundledImage = {
  source: ImageSourcePropType;
  width: number;
  height: number;
};

const GRAMMAR_IMAGES: Record<string, BundledImage> = {
${entries.join("\n")}
};

export function resolveGrammarImage(src: string | undefined): BundledImage | null {
  if (!src) return null;
  const key = src.replace(/^https?:\\/\\/[^/]+/i, "").trim();
  return GRAMMAR_IMAGES[key] ?? GRAMMAR_IMAGES[src.trim()] ?? null;
}
`;

await mkdir(path.join(root, "src", "data"), { recursive: true });
await writeFile(path.join(root, "src", "data", "grammarImages.ts"), out, "utf8");
console.log(`Generated src/data/grammarImages.ts with ${entries.length} bundled images.`);
