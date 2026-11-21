/**
 * Pull sigure.tw grammar lessons into data/grammar/<level>/NN.json.
 * Usage:
 *   node scripts/scrape-sigure-grammar.mjs n4 11
 *   node scripts/scrape-sigure-grammar.mjs n4 11 --dry
 *   node scripts/scrape-sigure-grammar.mjs --all
 */
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RANGES = {
  n5: [0, 50],
  n4: [1, 53],
  n3: [1, 140],
  n2: [1, 10],
  n1: [1, 0],
};

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const all = args.includes("--all");
const positional = args.filter((arg) => arg !== "--dry" && arg !== "--all");

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&hellip;/g, "…")
    .replace(/&rarr;/g, "→")
    .replace(/&larr;/g, "←")
    .replace(/&times;/g, "×")
    .replace(/&shy;/g, "")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&middot;/g, "·")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

function toDisplay(html) {
  return stripTags(html.replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/gi, "").replace(/<rp\b[^>]*>[\s\S]*?<\/rp>/gi, ""));
}

function toReading(html) {
  const withReadings = html.replace(/<ruby\b[^>]*>([\s\S]*?)<\/ruby>/gi, (_, inner) => {
    const readings = [...inner.matchAll(/<rt\b[^>]*>([\s\S]*?)<\/rt>/gi)].map((match) => stripTags(match[1]));
    if (readings.length > 0) return readings.join("");
    return stripTags(inner);
  });
  return stripTags(withReadings);
}

function linesFromHtml(html) {
  const text = decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/gi, "")
      .replace(/<rp\b[^>]*>[\s\S]*?<\/rp>/gi, "")
      .replace(/<[^>]+>/g, ""),
  );
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);
}

function innerDiv(html, className) {
  const open = html.search(new RegExp(`<div class="${className}"`, "i"));
  if (open < 0) return "";
  const start = html.indexOf(">", open) + 1;
  const tag = /<div\b|<\/div>/gi;
  tag.lastIndex = start;
  let depth = 1;
  let match = tag.exec(html);
  while (match) {
    depth += match[0].toLowerCase().startsWith("</") ? -1 : 1;
    if (depth === 0) return html.slice(start, match.index);
    match = tag.exec(html);
  }
  return "";
}

function extractSpan(html, className) {
  const open = html.search(new RegExp(`<span class="${className}">`, "i"));
  if (open < 0) return "";
  const start = html.indexOf(">", open) + 1;
  const tag = /<\/?span\b[^>]*>/gi;
  tag.lastIndex = start;
  let depth = 1;
  let match = tag.exec(html);
  while (match) {
    depth += match[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return html.slice(start, match.index);
    match = tag.exec(html);
  }
  return "";
}

function removeSpan(html, className) {
  const pattern = new RegExp(`<span class="${className}">`, "i");
  let next = html;
  let guard = 0;
  while (pattern.test(next) && guard < 20) {
    const open = next.search(pattern);
    const start = next.indexOf(">", open) + 1;
    const tag = /<\/?span\b[^>]*>/gi;
    tag.lastIndex = start;
    let depth = 1;
    let match = tag.exec(next);
    let end = next.length;
    while (match) {
      depth += match[0].startsWith("</") ? -1 : 1;
      if (depth === 0) {
        end = match.index + match[0].length;
        break;
      }
      match = tag.exec(next);
    }
    next = `${next.slice(0, open)} ${next.slice(end)}`;
    guard += 1;
  }
  return next;
}

function articleSlice(html) {
  const start = html.search(/<section class="article__content/);
  if (start < 0) return "";
  const end = html.indexOf("</section>", start);
  return end > start ? html.slice(start, end) : "";
}

function parseExampleItem(itemHtml) {
  const translationHtml = extractSpan(itemHtml, "trans");
  const label = stripTags(extractSpan(itemHtml, "keyword-gray"));
  const aside = [...itemHtml.matchAll(/<span class="gray">([\s\S]*?)<\/span>/gi)].map((match) => stripTags(match[1]));
  const japaneseHtml = removeSpan(removeSpan(itemHtml, "trans"), "keyword-gray")
    .replace(/<span class="gray">[\s\S]*?<\/span>/gi, "")
    .replace(/<button\b[\s\S]*?<\/button>/gi, "");
  const ja = toDisplay(japaneseHtml).replace(/^※\s*/, "");
  const reading = toReading(japaneseHtml).replace(/^※\s*/, "");
  if (!ja && !translationHtml) return null;
  const example = {};
  if (ja) example.ja = ja;
  if (reading && reading !== ja) example.reading = reading;
  if (translationHtml) example.zh = stripTags(translationHtml);
  if (label) example.label = label;
  if (aside.length > 0) example.note = aside.join(" ");
  return example.ja || example.zh ? example : null;
}

function parseChunk(chunk) {
  const section = { heading: "", notes: [], examples: [] };
  const heading = chunk.match(/^[\s\S]*?<h[23][^>]*>([\s\S]*?)<\/h[23]>/i);
  section.heading = heading ? stripTags(heading[1]) : "";
  const body = heading ? chunk.slice(heading.index + heading[0].length) : chunk;

  const block = innerDiv(body, "block");
  if (block) {
    const grammar = innerDiv(block, "grammar");
    const formulaLines = linesFromHtml(block.split(/<div class="grammar"/i)[0]);
    const patternLine = formulaLines.find((line) => line.startsWith("文法"));
    if (patternLine) section.pattern = patternLine.replace(/^文法[：:]\s*/, "");
    if (grammar) {
      section.connection = linesFromHtml(grammar)
        .map((line) => line.replace(/^詳細接續[：:；;]\s*/, ""))
        .filter(Boolean);
    }
    const explanation = linesFromHtml(block.replace(/<div class="grammar">[\s\S]*?<\/div>/i, "")).filter(
      (line) => !line.startsWith("文法") && !line.startsWith("詳細接續"),
    );
    section.notes.push(...explanation);
  }
  const withoutLists = body.replace(/<(ol|ul)\b[\s\S]*?<\/\1>/gi, "");
  section.notes.push(
    ...[...withoutLists.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((match) => stripTags(match[1]))
      .filter((text) => text && !text.startsWith("文法：")),
  );
  for (const supplement of withoutLists.matchAll(/<div class="hosoku">([\s\S]*?)<\/div>/gi)) {
    const text = linesFromHtml(supplement[1]).join("\n");
    if (text) section.notes.push(text.replace(/^補充\s*/, "補充 "));
  }

  for (const list of body.matchAll(/<(ol|ul)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    for (const item of list[2].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
      const example = parseExampleItem(item[1]);
      if (!example) continue;
      if (!example.ja && example.zh) {
        section.notes.push(example.zh);
        continue;
      }
      section.examples.push(example);
    }
  }

  if (!section.pattern) delete section.pattern;
  if (!section.connection?.length) delete section.connection;
  if (section.notes.length === 0) delete section.notes;
  if (section.examples.length === 0) delete section.examples;
  return section;
}

export function parseGrammarPage(html, { level, lesson, url }) {
  const titleMatch = html.match(/<h1[^>]*class="[^"]*article__title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch ? stripTags(titleMatch[1]) : `${level.toUpperCase()}文法${lesson}`;
  const pointMatch = title.match(/[「『]([^」』]+)[」』]\s*(.*)$/);
  const published = html.match(/<time[^>]*datetime="([^"]+)"/i)?.[1]?.slice(0, 10) ?? null;
  const content = articleSlice(html).replace(/<nav\b[\s\S]*?<\/nav>/gi, "");
  const parts = content.split(/(?=<h[23]\b)/i).filter((part) => /<h[23]\b/i.test(part));
  const sections = parts.map(parseChunk).filter((section) => section.heading);
  const main = sections.find((section) => section.pattern) ?? sections[0];

  return {
    level: level.toUpperCase(),
    lesson: Number(lesson),
    id: lesson,
    title,
    point: pointMatch?.[1] ?? "",
    gloss: pointMatch?.[2]?.trim() ?? "",
    url,
    source: "https://www.sigure.tw",
    published,
    pattern: main?.pattern ?? "",
    connection: main?.connection ?? [],
    sections,
  };
}

function lessonIds(level) {
  const [start, end] = RANGES[level];
  const ids = [];
  for (let number = start; number <= end; number += 1) ids.push(String(number).padStart(2, "0"));
  return ids;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchLesson(level, lesson) {
  const url = `https://www.sigure.tw/learn-japanese/grammar/${level}/${lesson}`;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await fetch(url, {
      headers: { "user-agent": "JASPEZ/1.0 (personal study import)" },
    });
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after"));
      await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 4000 * (attempt + 1));
      continue;
    }
    if (!response.ok) throw new Error(`${url} -> ${response.status}`);
    return parseGrammarPage(await response.text(), { level, lesson, url });
  }
  throw new Error(`${url} -> 429`);
}

async function saveLesson(parsed, level) {
  const outDir = path.resolve("data/grammar", level);
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, `${parsed.id}.json`);
  await writeFile(outFile, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  return outFile;
}

async function mapPool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

async function scrapeOne(level, lesson) {
  const parsed = await fetchLesson(level, lesson);
  if (dry) {
    console.log(JSON.stringify(parsed, null, 2));
    return parsed;
  }
  const outFile = await saveLesson(parsed, level);
  console.log(`${parsed.title} -> ${outFile}`);
  return parsed;
}

async function scrapeAll() {
  const jobs = [];
  for (const level of Object.keys(RANGES)) {
    for (const lesson of lessonIds(level)) jobs.push({ level, lesson });
  }
  const failures = [];
  const catalog = {};
  const parsedLessons = await mapPool(jobs, 1, async ({ level, lesson }) => {
    const existing = path.resolve("data/grammar", level, `${lesson}.json`);
    try {
      await access(existing);
      const saved = JSON.parse(await readFile(existing, "utf8"));
      console.log(`skip ${level}/${lesson}`);
      return saved;
    } catch {
      // not downloaded yet
    }
    try {
      await wait(700);
      const parsed = await fetchLesson(level, lesson);
      if (!dry) await saveLesson(parsed, level);
      console.log(`ok ${level}/${lesson} ${parsed.title}`);
      return parsed;
    } catch (error) {
      failures.push(`${level}/${lesson}: ${error.message}`);
      console.error(`fail ${level}/${lesson}: ${error.message}`);
      return null;
    }
  });

  for (const level of Object.keys(RANGES)) {
    const lessons = parsedLessons.filter((item) => item && item.level === level.toUpperCase());
    catalog[level.toUpperCase()] = {
      count: lessons.length,
      lessons: lessons.map((item) => ({
        id: item.id,
        title: item.title,
        point: item.point,
        gloss: item.gloss,
        pattern: item.pattern,
        url: item.url,
        sections: item.sections.map((section) => section.heading),
        exampleCount: item.sections.reduce((sum, section) => sum + (section.examples?.length ?? 0), 0),
      })),
    };
  }
  catalog.N1 = {
    count: 0,
    note: "時雨の町 N1上級文法 page says 尚無內容. No lesson URLs are published.",
    lessons: [],
  };

  if (!dry) {
    const index = {
      source: "https://www.sigure.tw/learn-japanese/grammar",
      fetchedAt: new Date().toISOString().slice(0, 10),
      levels: catalog,
    };
    await mkdir(path.resolve("data/grammar"), { recursive: true });
    await writeFile(path.resolve("data/grammar/index.json"), `${JSON.stringify(index, null, 2)}\n`, "utf8");
  }
  console.log(`done ${parsedLessons.filter(Boolean).length}/${jobs.length}`);
  if (failures.length > 0) console.log(failures.join("\n"));
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  if (all) {
    await scrapeAll();
  } else {
    const level = /^n[1-5]$/i.test(positional[0] ?? "") ? positional[0].toLowerCase() : "n4";
    const lesson = String((/^n[1-5]$/i.test(positional[0] ?? "") ? positional[1] : positional[0]) ?? "11").padStart(2, "0");
    await scrapeOne(level, lesson);
  }
}
