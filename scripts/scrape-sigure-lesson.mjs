/**
 * Pull one sigure.tw vocab lesson into data/vocab/<level>/NN.json.
 * Usage: node scripts/scrape-sigure-lesson.mjs n4 02
 *        node scripts/scrape-sigure-lesson.mjs 02
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2).filter((arg) => arg !== "--dry");
const levelArg = /^n[1-5]$/i.test(args[0] ?? "") ? args[0].toLowerCase() : "n5";
const lessonArg = /^n[1-5]$/i.test(args[0] ?? "") ? args[1] : args[0];
const lessonNumber = String(lessonArg ?? "02").padStart(2, "0");
const level = levelArg.toUpperCase();
const url = `https://www.sigure.tw/learn-japanese/vocabulary/${levelArg}/${lessonNumber}`;

const HEADER_FIELDS = {
  詞性: "verbType",
  詞類: "verbType",
  日文: "word",
  "假名／拼音": "reading",
  假名: "reading",
  重音: "accent",
  中文: "meaning",
};

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function visibleText(html, { keepBreaks = false } = {}) {
  const withoutRubies = html
    .replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/gi, "")
    .replace(/<rp\b[^>]*>[\s\S]*?<\/rp>/gi, "")
    .replace(/<button\b[^>]*>[\s\S]*?<\/button>/gi, "");
  const withBreaks = keepBreaks
    ? withoutRubies
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|li|h2|h3|tr)>/gi, "\n")
        .replace(/<li\b[^>]*>/gi, "\n- ")
    : withoutRubies;
  const text = decodeEntities(withBreaks.replace(/<[^>]+>/g, keepBreaks ? "" : " ")).replace(/\r\n/g, "\n");
  if (!keepBreaks) return text.replace(/\s+/g, " ").trim();
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function matchOne(html, pattern) {
  const match = html.match(pattern);
  if (!match) return "";
  return match[1] ?? match[0];
}

function japaneseTokens(html) {
  const stripped = html
    .replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/gi, "")
    .replace(/<rp\b[^>]*>[\s\S]*?<\/rp>/gi, "");
  const tokens = new Set();
  for (const match of stripped.matchAll(/<span\b[^>]*lang="ja"[^>]*>([\s\S]*?)<\/span>/gi)) {
    const token = visibleText(match[1]).replace(/\s+/g, "");
    if (token) tokens.add(token);
  }
  for (const match of stripped.matchAll(/「([^」]+)」/g)) {
    const token = decodeEntities(match[1]).replace(/\s+/g, "");
    if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(token)) tokens.add(token);
  }
  return [...tokens];
}

function remainderIsInflection(extra) {
  return extra.length > 0 && extra.length <= 6 && /^[\u3040-\u309f]+$/.test(extra);
}

function tokenMatchesWord(token, word) {
  if (!token || !word) return false;
  if (token === word) return true;
  if (token.startsWith(word) && remainderIsInflection(token.slice(word.length))) return true;
  if (word.startsWith(token) && remainderIsInflection(word.slice(token.length))) return true;
  return false;
}

const GENERIC_HEADINGS = new Set(["注意要點", "注意重音", "要點", "補充", "備考", "注意", "補充說明"]);

function isGenericHeading(text) {
  return GENERIC_HEADINGS.has(text.replace(/\s+/g, ""));
}

function blocksFromHtml(fragment, { generic = false } = {}) {
  if (/<h3\b/i.test(fragment)) {
    return fragment.split(/(?=<h3\b)/i).filter((part) => part.trim());
  }
  if (generic && /<li\b/i.test(fragment)) {
    const items = [...fragment.matchAll(/<li\b[^>]*>[\s\S]*?<\/li>/gi)].map((match) => match[0]);
    const rest = fragment.replace(/<(ul|ol)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
    if (visibleText(rest, { keepBreaks: true })) items.push(rest);
    return items;
  }
  return fragment.trim() ? [fragment] : [];
}

function noteSections(extraHtml) {
  const sections = [];
  for (const part of extraHtml.split(/(?=<h2\b)/i)) {
    if (!part.trim()) continue;
    let pieces;
    if (!/<h2\b/i.test(part)) {
      pieces = blocksFromHtml(part, { generic: true });
    } else {
      const heading = visibleText(matchOne(part, /<h2[^>]*>([\s\S]*?)<\/h2>/i));
      const generic = isGenericHeading(heading);
      const body = generic ? part.replace(/<h2[^>]*>[\s\S]*?<\/h2>/i, "") : part;
      pieces = blocksFromHtml(body, { generic });
    }
    for (const piece of pieces) {
      let text = visibleText(piece, { keepBreaks: true });
      if (/^<li\b/i.test(piece.trim())) text = text.replace(/^- /, "");
      if (!text) continue;
      sections.push({ text, tokens: japaneseTokens(piece) });
    }
  }
  return sections;
}

function notesForWord(word, sections) {
  const seen = new Set();
  const matches = [];
  for (const section of sections) {
    if (!section.tokens.some((token) => tokenMatchesWord(token, word))) continue;
    if (seen.has(section.text)) continue;
    seen.add(section.text);
    matches.push(section.text);
  }
  if (matches.length === 0) return null;
  return matches.join("\n\n");
}

function parseLesson(html) {
  const title = visibleText(matchOne(html, /<h1 class="article__title">([\s\S]*?)<\/h1>/i));
  const table = matchOne(
    html,
    /<table\b[^>]*>(?:(?!<\/table>)[\s\S])*?<th\b[^>]*>\s*日文\s*<\/th>[\s\S]*?<\/table>/i,
  );
  if (!table) throw new Error("Vocab table not found");

  const headers = [...table.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map((match) =>
    visibleText(match[1]),
  );
  const body = matchOne(table, /<tbody>([\s\S]*?)<\/tbody>/i);
  const words = [...body.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)].map((row) => {
    const cells = [...row[0].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) =>
      visibleText(cell[1]),
    );
    const entry = {};
    headers.forEach((header, index) => {
      if (header === "發音") return;
      const field = HEADER_FIELDS[header];
      if (!field) {
        console.warn(`Unmapped column "${header}" in lesson ${lessonNumber}`);
        return;
      }
      entry[field] = cells[index] || null;
    });
    entry.extraInfo = null;
    return entry;
  });

  const tableEnd = html.indexOf(table) + table.length;
  const relatedAt = html.indexOf('<section class="article__related-resources"', tableEnd);
  const footerAt = html.indexOf('<footer class="article__footer"', tableEnd);
  const extraEnd = [relatedAt, footerAt].filter((index) => index >= 0).sort((a, b) => a - b)[0] ?? html.length;
  const extraHtml = html.slice(tableEnd, extraEnd);
  const sections = noteSections(extraHtml);

  for (const entry of words) {
    entry.extraInfo = notesForWord(entry.word, sections);
  }

  return {
    level,
    lesson: Number(lessonNumber),
    title,
    words,
  };
}

const response = await fetch(url);
if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
const lesson = parseLesson(await response.text());

const withNotes = lesson.words.filter((word) => word.extraInfo);
const dryRun = process.argv.includes("--dry");
if (dryRun) {
  console.log(`${lesson.title}: ${lesson.words.length} words, ${withNotes.length} with extraInfo`);
  for (const word of withNotes.slice(0, 8)) {
    console.log(`- ${word.word}: ${word.extraInfo.slice(0, 80).replace(/\n/g, " ")}`);
  }
} else {
  const outDir = path.resolve(`data/vocab/${levelArg}`);
  const outFile = path.join(outDir, `${lessonNumber}.json`);
  await mkdir(outDir, { recursive: true });
  await writeFile(outFile, `${JSON.stringify(lesson, null, 2)}\n`, "utf8");
  console.log(`${lesson.title}: ${lesson.words.length} words, ${withNotes.length} with extraInfo -> ${outFile}`);
}
