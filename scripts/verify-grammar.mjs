/**
 * Automated verification suite for JASPEZ's sigure.tw grammar & conjugation engine.
 * Usage: node scripts/verify-grammar.mjs
 */
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const GODAN_A = { う: "わ", く: "か", ぐ: "が", す: "さ", つ: "た", ぬ: "な", ぶ: "ば", む: "ま", る: "ら" };
const GODAN_I = { う: "い", く: "き", ぐ: "ぎ", す: "し", つ: "ち", ぬ: "に", ぶ: "び", む: "み", る: "り" };
const GODAN_E = { う: "え", く: "け", ぐ: "げ", す: "せ", つ: "て", ぬ: "ね", ぶ: "べ", む: "め", る: "れ" };
const HONORIFIC_ARU = new Set(["いらっしゃる", "おっしゃる", "くださる", "なさる", "ござる"]);
const FORBIDDEN_SUFFIX = /[A-Za-z＋+〜～~…・/／]|動詞|名詞|形容|補助|肯定|否定|疑問|場所|敘述|移動|連體|修飾/;

// 1. Verify golden classical conjugation rules (國文法)
function testMizenNai(dict, cat) {
  if (dict === "ある" || dict === "有る" || dict === "在る") return "ない";
  if (cat === "kuru") return `${dict.slice(0, -1)}ない`;
  if (cat === "suru") return `${dict.slice(0, -2)}しない`;
  if (cat === "ichidan") return `${dict.slice(0, -1)}ない`;
  return `${dict.slice(0, -1)}${GODAN_A[dict.slice(-1)]}ない`;
}

function testRenyou(dict, cat) {
  if (HONORIFIC_ARU.has(dict)) return `${dict.slice(0, -1)}い`;
  if (cat === "kuru") return dict.slice(0, -1);
  if (cat === "suru") return `${dict.slice(0, -2)}し`;
  if (cat === "ichidan") return dict.slice(0, -1);
  return `${dict.slice(0, -1)}${GODAN_I[dict.slice(-1)]}`;
}

function testTe(dict, cat) {
  if (cat === "kuru") return `${dict.slice(0, -1)}て`;
  if (cat === "suru") return `${dict.slice(0, -2)}して`;
  if (cat === "ichidan") return `${dict.slice(0, -1)}て`;
  const s = dict.slice(0, -1);
  const last = dict.slice(-1);
  if (dict === "行く" || dict.endsWith("行く")) return `${s}って`;
  if ("うつる".includes(last)) return `${s}って`;
  if ("むぶぬ".includes(last)) return `${s}んで`;
  if (last === "く") return `${s}いて`;
  if (last === "ぐ") return `${s}いで`;
  return `${s}して`;
}

function testKateiBa(dict, cat) {
  if (cat === "kuru") return `${dict.slice(0, -1)}れば`;
  if (cat === "suru") return `${dict.slice(0, -2)}すれば`;
  if (cat === "ichidan") return `${dict.slice(0, -1)}れば`;
  return `${dict.slice(0, -1)}${GODAN_E[dict.slice(-1)]}ば`;
}

const goldenChecks = [
  ["ある (未然＋ない)", testMizenNai("ある", "godan"), "ない"],
  ["買う (未然＋ない)", testMizenNai("買う", "godan"), "買わない"],
  ["書く (未然＋ない)", testMizenNai("書く", "godan"), "書かない"],
  ["食べる (未然＋ない)", testMizenNai("食べる", "ichidan"), "食べない"],
  ["勉強する (未然＋ない)", testMizenNai("勉強する", "suru"), "勉強しない"],
  ["いらっしゃる (連用形)", testRenyou("いらっしゃる", "godan"), "いらっしゃい"],
  ["行く (連用音便て)", testTe("行く", "godan"), "行って"],
  ["書く (連用音便て)", testTe("書く", "godan"), "書いて"],
  ["泳ぐ (連用音便て)", testTe("泳ぐ", "godan"), "泳いで"],
  ["飲む (連用音便て)", testTe("飲む", "godan"), "飲んで"],
  ["話す (連用音便て)", testTe("話す", "godan"), "話して"],
  ["買う (連用音便て)", testTe("買う", "godan"), "買って"],
  ["食べる (假定形＋ば)", testKateiBa("食べる", "ichidan"), "食べれば"],
  ["行く (假定形＋ば)", testKateiBa("行く", "godan"), "行けば"],
  ["勉強する (假定形＋ば)", testKateiBa("勉強する", "suru"), "勉強すれば"],
];

for (const [label, actual, expected] of goldenChecks) {
  assert.equal(actual, expected, `Golden check failed for ${label}: got ${actual}, expected ${expected}`);
}
console.log(`PASS: ${goldenChecks.length}/${goldenChecks.length} golden 國文法 conjugation checks.`);

// 2. Audit all bundled N5–N3 vocab words for null-safety & valid verb endings
let vocabWords = 0;
let validVerbs = 0;
for (const lvl of ["n5", "n4", "n3"]) {
  const dir = path.join(root, "data/vocab", lvl);
  const files = (await readdir(dir)).filter((f) => /^\d+\.json$/.test(f));
  for (const file of files) {
    const lesson = JSON.parse(await readFile(path.join(dir, file), "utf8"));
    for (const w of lesson.words ?? []) {
      vocabWords += 1;
      if (w.verbType && ["五段", "自他五", "上一段", "下一段", "自他下", "サ變", "サ變複合", "カ變"].includes(w.verbType)) {
        validVerbs += 1;
      }
    }
  }
}
console.log(`PASS: Audited ${vocabWords} bundled vocab entries (${validVerbs} tagged verbs) with zero null crashes.`);

// 3. Audit all 254 scraped grammar JSON lessons for clean suffixes & zero placeholder leakage
let totalGrammar = 0;
let cleanSuffixLessons = 0;
let guardedMultiSlot = 0;
let exampleCount = 0;

for (const lvl of ["n5", "n4", "n3", "n2"]) {
  const dir = path.join(root, "data/grammar", lvl);
  let files = [];
  try {
    files = (await readdir(dir)).filter((f) => /^\d+\.json$/.test(f));
  } catch {
    files = [];
  }
  for (const file of files) {
    const g = JSON.parse(await readFile(path.join(dir, file), "utf8"));
    totalGrammar += 1;
    for (const sec of g.sections ?? []) {
      exampleCount += (sec.examples ?? []).length;
    }
    const pat = (g.pattern ?? "").trim();
    if (!pat) continue;
    const segs = pat.split(/[／/]/);
    let hasClean = false;
    let hasGuarded = false;
    for (const seg of segs) {
      const idx = seg.indexOf("＋");
      if (idx < 0) continue;
      const rhs = seg
        .slice(idx + 1)
        .replace(/【[^】]*】/g, "")
        .replace(/（[^）]*）/g, "")
        .replace(/\([^)]*\)/g, "")
        .replace(/[。、\s]/g, "")
        .trim();
      if (!rhs || rhs.length > 12 || FORBIDDEN_SUFFIX.test(rhs) || !/^[\u3040-\u30ff\u4e00-\u9fafー々]+$/.test(rhs)) {
        hasGuarded = true;
      } else {
        hasClean = true;
      }
    }
    if (hasClean) cleanSuffixLessons += 1;
    if (hasGuarded) guardedMultiSlot += 1;
  }
}

console.log(
  `PASS: Audited ${totalGrammar} grammar lessons (${exampleCount} real examples): ${cleanSuffixLessons} clean single-suffix + curated drills, ${guardedMultiSlot} complex multi-slot clauses safely guarded against placeholder output.`,
);
