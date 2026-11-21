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
const refresh = args.includes("--refresh");
const positional = args.filter((arg) => !arg.startsWith("--"));

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

const VOID_TAGS = new Set(["br", "img", "hr", "wbr", "source", "input", "meta", "link"]);
const SKIP_TAGS = new Set(["button", "script", "style", "svg", "nav"]);

function attr(tag, name) {
  return decodeEntities(tag.match(new RegExp(`\\b${name}="([^"]*)"`, "i"))?.[1] ?? "");
}

function classList(tag) {
  return attr(tag, "class").split(/\s+/).filter(Boolean);
}

function hasClass(tag, name) {
  return classList(tag).includes(name);
}

function matchingClose(html, openIndex, name) {
  const token = new RegExp(`</?${name}\\b[^>]*>`, "gi");
  token.lastIndex = openIndex + 1;
  let depth = 1;
  let match = token.exec(html);
  while (match) {
    if (match[0].startsWith("</")) depth -= 1;
    else if (!match[0].endsWith("/>")) depth += 1;
    if (depth === 0) return match.index;
    match = token.exec(html);
  }
  return html.length;
}

function elementEnd(html, closeIndex) {
  const end = html.indexOf(">", closeIndex);
  return end < 0 ? html.length : end + 1;
}

function topElements(html, tagName) {
  const elements = [];
  const opener = new RegExp(`<${tagName}\\b[^>]*>`, "gi");
  let match = opener.exec(html);
  while (match) {
    const close = matchingClose(html, match.index, tagName);
    const end = elementEnd(html, close);
    elements.push({ open: match[0], inner: html.slice(match.index + match[0].length, close), start: match.index, end });
    opener.lastIndex = end;
    match = opener.exec(html);
  }
  return elements;
}

function elementByClass(html, tagName, className) {
  const opener = new RegExp(`<${tagName}\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`, "i");
  const match = opener.exec(html);
  if (!match) return "";
  const close = matchingClose(html, match.index, tagName);
  return html.slice(match.index, elementEnd(html, close));
}

function articleSlice(html) {
  const content = elementByClass(html, "section", "article__content");
  return content.replace(/^<section\b[^>]*>/i, "").replace(/<\/section>\s*$/i, "");
}

function articleHtml(html) {
  const header = elementByClass(html, "header", "article__header");
  const content = elementByClass(html, "section", "article__content");
  return [header, content].filter(Boolean).join("\n");
}

function plainText(html) {
  return linesFromHtml(
    html
      .replace(/<i\b[^>]*fa-angle-double-right[^>]*>\s*<\/i>/gi, "→")
      .replace(/<i\b[^>]*fa-angle-double-left[^>]*>\s*<\/i>/gi, "←")
      .replace(/<button\b[\s\S]*?<\/button>/gi, ""),
  ).join("\n");
}

function stripClassSpans(html, className) {
  const spans = topElements(html, "span").filter((span) => hasClass(span.open, className));
  let next = html;
  for (const span of spans.sort((left, right) => right.start - left.start)) {
    next = `${next.slice(0, span.start)}${next.slice(span.end)}`;
  }
  return next;
}

function sentenceFrom(html) {
  const translation = topElements(html, "span").find((span) => hasClass(span.open, "trans"));
  const cleaned = stripClassSpans(html, "trans");
  const ja = toDisplay(cleaned).replace(/^※\s*/, "");
  const reading = toReading(cleaned).replace(/^※\s*/, "");
  if (!ja && !translation) return null;
  const sentence = {};
  if (ja) sentence.ja = ja;
  if (reading && reading !== ja) sentence.reading = reading;
  if (translation) sentence.zh = plainText(translation.inner);
  return sentence;
}

function parseListItem(itemHtml) {
  const spans = topElements(itemHtml, "span");
  const japanese = spans.filter((span) => /\blang="ja"/i.test(span.open));
  const translations = spans.filter((span) => hasClass(span.open, "trans"));
  const asides = spans.filter((span) => hasClass(span.open, "gray"));
  const labels = spans.filter((span) => classList(span.open).some((name) => name.startsWith("keyword-")));
  if (japanese.length === 0) {
    const text = plainText(itemHtml);
    return text ? [{ type: "note", text }] : [];
  }
  return japanese.map((span, index) => {
    const before = itemHtml.slice(index === 0 ? 0 : japanese[index - 1].end, span.start);
    const after = itemHtml.slice(span.end, japanese[index + 1]?.start ?? itemHtml.length);
    const example = sentenceFrom(span.inner) ?? { ja: "" };
    if (/fa-xmark/i.test(before)) example.status = "incorrect";
    else if (/fa-circle/i.test(before)) example.status = "correct";
    const translation = translations.find((item) => item.start >= span.end && item.start < (japanese[index + 1]?.start ?? Infinity));
    const chosen = translation ?? (translations.length === 1 ? translations[0] : null);
    if (chosen) example.zh = plainText(chosen.inner);
    const note = (asides.length === 1 ? asides : asides.filter((item) => item.start >= span.end && item.start < (japanese[index + 1]?.start ?? Infinity)))
      .map((item) => plainText(item.inner))
      .filter(Boolean);
    const label = labels
      .filter((item) => item.start >= span.start && item.start < (japanese[index + 1]?.start ?? Infinity))
      .map((item) => plainText(item.inner))
      .filter(Boolean);
    if (note.length > 0) example.note = note.join(" ");
    if (label.length > 0) example.label = label.join(" ");
    if (!example.ja && after) example.ja = plainText(after);
    return example.ja || example.zh ? example : null;
  }).filter(Boolean).map((example) => ({ type: "example", ...example }));
}

function parseTable(inner, open) {
  const caption = topElements(inner, "caption")[0];
  const rows = topElements(inner, "tr").map((row) =>
    [...topElements(row.inner, "th"), ...topElements(row.inner, "td")]
      .sort((left, right) => left.start - right.start)
      .map((cell) => {
        const sentence = sentenceFrom(cell.inner);
        const entry = sentence?.ja
          ? { text: sentence.ja, ...(sentence.reading ? { reading: sentence.reading } : {}), ...(sentence.zh ? { zh: sentence.zh } : {}) }
          : { text: plainText(cell.inner).replace(/\n/g, " ") };
        const colspan = Number(attr(cell.open, "colspan"));
        const rowspan = Number(attr(cell.open, "rowspan"));
        if (colspan > 1) entry.colspan = colspan;
        if (rowspan > 1) entry.rowspan = rowspan;
        if (cell.open.toLowerCase().startsWith("<th") || /<thead\b/i.test(open)) entry.header = true;
        return entry;
      }),
  ).filter((row) => row.length > 0);
  const table = { type: "table", rows };
  const captionText = caption ? plainText(caption.inner) : "";
  if (captionText) table.caption = captionText;
  return table.rows.length > 0 ? [table] : [];
}

function parsePatternBlock(inner) {
  const grammar = topElements(inner, "div").find((item) => hasClass(item.open, "grammar"));
  const withoutGrammar = grammar ? `${inner.slice(0, grammar.start)}${inner.slice(grammar.end)}` : inner;
  const formula = plainText(withoutGrammar).split("\n").map((line) => line.trim()).filter(Boolean);
  const patternLine = formula.find((line) => line.startsWith("文法"));
  const connection = grammar
    ? plainText(grammar.inner)
        .split("\n")
        .map((line) => line.replace(/^詳細接續[：:；;]\s*/, "").trim())
        .filter(Boolean)
    : [];
  const blocks = [];
  if (patternLine || connection.length > 0) {
    const pattern = { type: "pattern", pattern: patternLine?.replace(/^文法[：:]\s*/, "") ?? "" };
    if (connection.length > 0) pattern.connection = connection;
    blocks.push(pattern);
  }
  const explanation = formula.filter((line) => !line.startsWith("文法") && !line.startsWith("詳細接續")).join("\n");
  if (explanation) blocks.push({ type: "note", text: explanation });
  return blocks;
}

function parseChildren(html) {
  const blocks = [];
  let index = 0;
  while (index < html.length) {
    const next = html.indexOf("<", index);
    if (next < 0) {
      const text = plainText(html.slice(index));
      if (text) blocks.push({ type: "note", text });
      break;
    }
    if (next > index) {
      const text = plainText(html.slice(index, next));
      if (text) blocks.push({ type: "note", text });
    }
    const token = html.slice(next).match(/^<\/?([a-zA-Z][\w:-]*)\b[^>]*>/);
    if (!token) {
      index = next + 1;
      continue;
    }
    const name = token[1].toLowerCase();
    if (token[0].startsWith("</")) {
      index = next + token[0].length;
      continue;
    }
    if (VOID_TAGS.has(name) || token[0].endsWith("/>")) {
      if (name === "img") {
        const src = attr(token[0], "src");
        const alt = attr(token[0], "alt");
        if (src || alt) {
          blocks.push({
            type: "image",
            alt,
            src: src.startsWith("http") || !src ? src : new URL(src, "https://www.sigure.tw").href,
          });
        }
      }
      index = next + token[0].length;
      continue;
    }
    const close = matchingClose(html, next, name);
    const inner = html.slice(next + token[0].length, close);
    blocks.push(...parseElement(name, token[0], inner));
    index = elementEnd(html, close);
  }
  return mergeNotes(blocks);
}

function mergeNotes(blocks) {
  const merged = [];
  for (const block of blocks) {
    const previous = merged.at(-1);
    if (block.type === "note" && previous?.type === "note") previous.text = `${previous.text}\n${block.text}`;
    else merged.push(block);
  }
  return merged.filter((block) => block.type !== "note" || block.text.trim());
}

function parseElement(name, open, inner) {
  if (SKIP_TAGS.has(name)) return [];
  if (name === "br") return [];
  if (/^h[2-6]$/.test(name)) return [{ type: "heading", text: plainText(inner) }];
  if (name === "table") return parseTable(inner, open);
  if (name === "ol" || name === "ul") {
    const items = topElements(inner, "li").flatMap((item) => parseListItem(item.inner));
    const examples = items.filter((item) => item.type === "example");
    const notes = items.filter((item) => item.type === "note");
    return [
      ...notes,
      ...(examples.length > 0 ? [{ type: "examples", items: examples.map(({ type, ...example }) => example) }] : []),
    ];
  }
  if (name === "div") {
    if (hasClass(open, "grammar")) return [];
    if (hasClass(open, "block")) return parsePatternBlock(inner);
    if (hasClass(open, "url")) {
      const link = topElements(inner, "a")[0];
      const text = plainText(link?.inner ?? inner);
      const href = link ? attr(link.open, "href") : "";
      return text || href ? [{ type: "link", text, href: href.startsWith("http") || !href ? href : new URL(href, "https://www.sigure.tw").href }] : [];
    }
    const kind = classList(open).find((item) => ["note", "point", "warning", "hosoku"].includes(item));
    if (kind) {
      const children = parseChildren(inner);
      const text = children.filter((block) => block.type === "note").map((block) => block.text).join("\n");
      const nested = children.filter((block) => block.type !== "note");
      const callout = { type: "callout", kind, text };
      if (nested.length > 0) callout.blocks = nested;
      return text || nested.length > 0 ? [callout] : [];
    }
    return parseChildren(inner);
  }
  if (name === "p" || name === "blockquote" || name === "figcaption" || name === "li") {
    const children = parseChildren(inner);
    if (children.some((block) => block.type !== "note")) return children;
    const text = plainText(inner);
    return text ? [{ type: "note", text }] : [];
  }
  return parseChildren(inner);
}

function parseChunk(chunk) {
  const heading = chunk.match(/^[\s\S]*?<h([2-4])\b[^>]*>([\s\S]*?)<\/h\1>/i);
  const body = heading ? chunk.slice(heading.index + heading[0].length) : chunk;
  const blocks = parseChildren(body);
  const section = { heading: heading ? stripTags(heading[2]) : "", level: heading ? Number(heading[1]) : 2, blocks };
  if (!section.heading) delete section.heading;
  return section;
}

function firstPattern(sections) {
  for (const section of sections) {
    for (const block of section.blocks ?? []) {
      if (block.type === "pattern" && block.pattern) return block;
    }
  }
  return null;
}

export function parseGrammarPage(html, { level, lesson, url }) {
  const titleMatch = html.match(/<h1[^>]*class="[^"]*article__title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch ? stripTags(titleMatch[1]) : `${level.toUpperCase()}文法${lesson}`;
  const pointMatch = title.match(/[「『]([^」』]+)[」』]\s*(.*)$/);
  const published = html.match(/<time[^>]*datetime="([^"]+)"/i)?.[1]?.slice(0, 10) ?? null;
  const content = articleSlice(html).replace(/<nav\b[\s\S]*?<\/nav>/gi, "");
  const parts = content.split(/(?=<h[2-4]\b)/i).filter((part) => part.trim());
  const sections = parts.map(parseChunk).filter((section) => section.heading || section.blocks.length > 0);
  const pattern = firstPattern(sections);

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
    pattern: pattern?.pattern ?? "",
    connection: pattern?.connection ?? [],
    sections,
  };
}

function countExamples(blocks = []) {
  return blocks.reduce((sum, block) => {
    const nested = countExamples(block.blocks ?? block.items?.flatMap((item) => item.blocks ?? []) ?? []);
    return sum + nested + (block.type === "examples" ? block.items.length : 0);
  }, 0);
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
    const page = await response.text();
    return {
      parsed: parseGrammarPage(page, { level, lesson, url }),
      html: articleHtml(page),
    };
  }
  throw new Error(`${url} -> 429`);
}

async function saveLesson(parsed, html, level) {
  const outDir = path.resolve("data/grammar", level);
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, `${parsed.id}.json`);
  await writeFile(outFile, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  if (html) await writeFile(path.join(outDir, `${parsed.id}.html`), `${html}\n`, "utf8");
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
  const { parsed, html } = await fetchLesson(level, lesson);
  if (dry) {
    console.log(JSON.stringify(parsed, null, 2));
    console.log(`html ${html.length} chars`);
    return parsed;
  }
  const outFile = await saveLesson(parsed, html, level);
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
    if (!refresh) {
      try {
        await access(existing);
        const saved = JSON.parse(await readFile(existing, "utf8"));
        console.log(`skip ${level}/${lesson}`);
        return saved;
      } catch {
        // not downloaded yet
      }
    }
    try {
      await wait(700);
      const { parsed, html } = await fetchLesson(level, lesson);
      if (!dry) await saveLesson(parsed, html, level);
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
        exampleCount: item.sections.reduce((sum, section) => sum + countExamples(section.blocks), 0),
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
