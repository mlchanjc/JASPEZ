/**
 * Download every <img> used in data/grammar lesson HTML.
 * Site paths like /data/img/... are saved at data/img/... so the src still matches.
 * Usage: node scripts/download-grammar-images.mjs
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("data/grammar");
const levels = ["n5", "n4", "n3", "n2", "n1"];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uniqueSrcs(html) {
  const srcs = new Set();
  for (const match of html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/gi)) srcs.add(match[1]);
  return [...srcs];
}

function localPath(src) {
  const url = new URL(src, "https://www.sigure.tw");
  if (url.hostname === "www.sigure.tw" || url.hostname === "sigure.tw") {
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    return { url: url.href, file: path.resolve(relative) };
  }
  const name = decodeURIComponent(url.pathname).split("/").filter(Boolean).at(-1) || "image";
  return { url: url.href, file: path.resolve("data/grammar/external", `${url.hostname}-${name}`) };
}

async function download(url, file) {
  await mkdir(path.dirname(file), { recursive: true });
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(url, { headers: { "user-agent": "JASPEZ/1.0 (personal study import)" } });
    if (response.status === 429) {
      await wait(4000 * (attempt + 1));
      continue;
    }
    if (!response.ok) throw new Error(`${url} -> ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 32) throw new Error(`${url} -> empty`);
    await writeFile(file, bytes);
    return bytes.length;
  }
  throw new Error(`${url} -> 429`);
}

const sources = new Map();
for (const level of levels) {
  let files = [];
  try {
    files = (await readdir(path.join(root, level))).filter((name) => name.endsWith(".html"));
  } catch {
    files = [];
  }
  for (const name of files) {
    const html = await readFile(path.join(root, level, name), "utf8");
    for (const src of uniqueSrcs(html)) {
      const target = localPath(src);
      if (!sources.has(target.url)) sources.set(target.url, { ...target, src, lessons: [] });
      sources.get(target.url).lessons.push(`${level}/${name.replace(/\.html$/, "")}`);
    }
  }
}

const saved = [];
const failures = [];
let index = 0;
for (const item of sources.values()) {
  index += 1;
  try {
    await wait(250);
    const size = await download(item.url, item.file);
    saved.push({ src: item.src, file: path.relative(process.cwd(), item.file).replace(/\\/g, "/"), bytes: size, lessons: item.lessons });
    console.log(`ok ${index}/${sources.size} ${item.src}`);
  } catch (error) {
    failures.push({ src: item.src, error: error.message, lessons: item.lessons });
    console.error(`fail ${item.src}: ${error.message}`);
  }
}

await mkdir(root, { recursive: true });
await writeFile(
  path.join(root, "images.json"),
  `${JSON.stringify({ count: saved.length, images: saved, failures }, null, 2)}\n`,
  "utf8",
);
console.log(`done ${saved.length}/${sources.size}`);
