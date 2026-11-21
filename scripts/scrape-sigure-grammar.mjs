/**
 * Pull one sigure.tw grammar lesson into data/grammar/<level>/NN.json.
 * Usage: node scripts/scrape-sigure-grammar.mjs n4 11
 *        node scripts/scrape-sigure-grammar.mjs n5 08 --dry
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2).filter((arg) => arg !== "--dry");
const levelArg = /^n[1-5]$/i.test(args[0] ?? "") ? args[0].toLowerCase() : "n5";
const lessonArg = /^n[1-5]$/i.test(args[0] ?? "") ? args[1] : args[0];
const lessonNumber = String(lessonArg ?? "08").padStart(2, "0");
const level = levelArg.toUpperCase();
const url = `https://www.sigure.tw/learn-japanese/grammar/${levelArg}/${lessonNumber}`;

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

function stripTags(html) {
  return decodeEntities(
    html
      .replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/gi, "")
      .replace(/<rp\b[^>]*>[\s\S]*?<\/rp>/gi, "")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function parseGrammarPage(html) {
  const titleMatch = html.match(/<h1[^>]*class="[^"]*article__title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch ? stripTags(titleMatch[1]) : `${level}文法${lessonNumber}`;

  const bodyStart = html.indexOf("<article");
  const bodyEnd = html.indexOf("</article>");
  const body = bodyStart >= 0 && bodyEnd > bodyStart ? html.slice(bodyStart, bodyEnd) : html;

  const headings = [...body.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => stripTags(m[1]));
  const formulas = [...body.matchAll(/文法[：:]\s*([^\n<]+)/g)].map((m) => decodeEntities(m[1]).trim());

  const examples = [];
  for (const m of body.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    const clean = stripTags(m[1]);
    if (/[\u3040-\u30ff]/.test(clean) && clean.length >= 6 && clean.length <= 220) {
      examples.push(clean);
    }
  }

  return {
    level,
    lesson: Number(lessonNumber),
    sigureCode: `${level}文法${lessonNumber}`,
    url,
    title,
    formation: formulas[0] ?? "",
    headings,
    rawExamples: examples.slice(0, 20),
  };
}

const response = await fetch(url);
if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
const parsed = parseGrammarPage(await response.text());

if (process.argv.includes("--dry")) {
  console.log(JSON.stringify(parsed, null, 2));
} else {
  const outDir = path.resolve(`data/grammar/${levelArg}`);
  const outFile = path.join(outDir, `${lessonNumber}.json`);
  await mkdir(outDir, { recursive: true });
  await writeFile(outFile, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  console.log(`${parsed.title} -> ${outFile}`);
}
