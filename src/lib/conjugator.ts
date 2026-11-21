import { grammarLessonsByLevel } from "@/data/grammarRegistry";
import { lessons, manifests } from "@/data/registry";
import type {
  ClassicalForm,
  ExampleClozeQuestion,
  LevelId,
  PatternDrillQuestion,
  GrammarLesson,
  WordPos,
} from "@/data/types";
import { lessonExamples } from "@/lib/grammar";

type VerbCategory = "godan" | "ichidan" | "suru" | "kuru";

export type LexiconWord = {
  id: string;
  level: LevelId;
  pos: WordPos;
  posLabel: string;
  dict: string;
  rt: string;
  meaning: string;
  verbCategory?: VerbCategory;
};

const GODAN_A: Record<string, string> = {
  う: "わ",
  く: "か",
  ぐ: "が",
  す: "さ",
  つ: "た",
  ぬ: "な",
  ぶ: "ば",
  む: "ま",
  る: "ら",
};

const GODAN_I: Record<string, string> = {
  う: "い",
  く: "き",
  ぐ: "ぎ",
  す: "し",
  つ: "ち",
  ぬ: "に",
  ぶ: "び",
  む: "み",
  る: "り",
};

const GODAN_E: Record<string, string> = {
  う: "え",
  く: "け",
  ぐ: "げ",
  す: "せ",
  つ: "て",
  ぬ: "ね",
  ぶ: "べ",
  む: "め",
  る: "れ",
};

const HONORIFIC_ARU_VERBS = new Set(["いらっしゃる", "おっしゃる", "くださる", "なさる", "ござる"]);
const ACTIVE_LEVELS: LevelId[] = ["N5", "N4", "N3"];

function classifyVerb(verbType: string): { category: VerbCategory; label: string } | null {
  if (verbType === "五段" || verbType === "自他五") return { category: "godan", label: "V（五段動詞）" };
  if (verbType === "上一段") return { category: "ichidan", label: "V（上一段動詞）" };
  if (verbType === "下一段" || verbType === "自他下") return { category: "ichidan", label: "V（下一段動詞）" };
  if (verbType === "サ變" || verbType === "サ變複合") return { category: "suru", label: "V（サ變動詞）" };
  if (verbType === "カ變") return { category: "kuru", label: "V（カ變動詞）" };
  return null;
}

/** Null-safe primary token cleaner (prevents TypeError on null reading/word/meaning). */
function cleanPrimary(raw: string | null | undefined): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.split(/[;；/／、,，(（]/)[0]?.trim() ?? trimmed;
}

function isJapaneseWord(str: string): boolean {
  return str.length > 0 && /^[\u3040-\u30ff\u4e00-\u9fafー々]+$/.test(str);
}

let cachedLexicon: LexiconWord[] | null = null;

/**
 * Extracts N (名詞), Na (形容動詞), A (形容詞), and V (五段/一段/カ變/サ變)
 * directly from the bundled bundled dataset N5–N3 vocab JSON files.
 */
export function getLexicon(): LexiconWord[] {
  if (cachedLexicon) return cachedLexicon;
  const seen = new Set<string>();
  const list: LexiconWord[] = [];

  for (const level of ACTIVE_LEVELS) {
    for (const topic of manifests[level].topics) {
      const lesson = lessons[level][topic.id];
      if (!lesson || !Array.isArray(lesson.words)) continue;

      const title = topic.title ?? "";
      const isAdjLesson = title.includes("（形容詞）");
      const isNaLesson = title.includes("（形容動詞）");
      const isNounLesson = title.includes("（名詞）");

      lesson.words.forEach((w, idx) => {
        if (!w || typeof w.word !== "string") return;
        let dict = cleanPrimary(w.word);
        let rt = cleanPrimary(w.reading);
        if (!dict || !isJapaneseWord(dict)) return;

        const rawMeaning = typeof w.meaning === "string" ? w.meaning : "";
        const meaning = rawMeaning.split("／")[0]?.trim() ?? rawMeaning;
        const safeRt = isJapaneseWord(rt) ? rt : dict;

        // 1. Verbs
        if (typeof w.verbType === "string" && w.verbType.length > 0) {
          const vInfo = classifyVerb(w.verbType);
          if (!vInfo) return;
          if (vInfo.category === "suru") {
            if (!dict.endsWith("する")) dict = `${dict}する`;
            rt = safeRt.endsWith("する") ? safeRt : `${safeRt}する`;
          } else if (vInfo.category === "ichidan") {
            if (!dict.endsWith("る")) return;
          } else if (vInfo.category === "godan") {
            if (!GODAN_A[dict.slice(-1)]) return;
          } else if (vInfo.category === "kuru") {
            if (!dict.endsWith("来る") && !dict.endsWith("くる")) return;
          }
          const key = `${level}:V:${dict}`;
          if (seen.has(key)) return;
          seen.add(key);
          list.push({
            id: `${level}:${topic.id}:${idx}`,
            level,
            pos: "V",
            posLabel: vInfo.label,
            dict,
            rt: isJapaneseWord(rt) ? rt : dict,
            meaning,
            verbCategory: vInfo.category,
          });
          return;
        }

        // 2. I-Adjectives (A)
        if (isAdjLesson && dict.endsWith("い")) {
          const key = `${level}:A:${dict}`;
          if (seen.has(key)) return;
          seen.add(key);
          list.push({
            id: `${level}:${topic.id}:${idx}`,
            level,
            pos: "A",
            posLabel: "A（い形容詞）",
            dict,
            rt: safeRt,
            meaning,
          });
          return;
        }

        // 3. Na-Adjectives (Na)
        if (isNaLesson) {
          const stem = dict.replace(/[だな]$/, "");
          if (!stem || stem === "同じ") return;
          const key = `${level}:Na:${stem}`;
          if (seen.has(key)) return;
          seen.add(key);
          list.push({
            id: `${level}:${topic.id}:${idx}`,
            level,
            pos: "Na",
            posLabel: "Na（形容動詞）",
            dict: stem,
            rt: safeRt.replace(/[だな]$/, "") || stem,
            meaning,
          });
          return;
        }

        // 4. Nouns (N)
        if (isNounLesson && dict.length <= 6) {
          const key = `${level}:N:${dict}`;
          if (seen.has(key)) return;
          seen.add(key);
          list.push({
            id: `${level}:${topic.id}:${idx}`,
            level,
            pos: "N",
            posLabel: "N（名詞）",
            dict,
            rt: safeRt,
            meaning,
          });
        }
      });
    }
  }

  cachedLexicon = list;
  return list;
}

function uniqueChoices(answer: string, candidates: string[]): string[] {
  const set = new Set<string>([answer]);
  for (const item of candidates) {
    if (item && item !== answer && !set.has(item)) set.add(item);
    if (set.size === 4) break;
  }
  const arr = Array.from(set);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ==================================================
// LOW-LEVEL CLASSICAL INFLECTIONS (國文法六大活用)
// ==================================================
function isIiAdjective(word: LexiconWord) {
  return word.dict === "いい" || word.dict === "良い" || word.rt === "いい";
}

function adjStem(word: LexiconWord) {
  if (isIiAdjective(word)) return "よ";
  return word.dict.slice(0, -1);
}

function isAruVerb(word: LexiconWord) {
  return word.dict === "ある" || word.dict === "有る" || word.dict === "在る";
}

function isHonorificAru(word: LexiconWord) {
  return HONORIFIC_ARU_VERBS.has(word.dict) || HONORIFIC_ARU_VERBS.has(word.rt);
}

function verbMizenNai(word: LexiconWord): { form: string; rule: string; wrongs: string[] } {
  if (isAruVerb(word)) {
    return {
      form: "ない",
      rule: "「ある」的否定是特殊例外：直接變成形容詞「ない」（不可說「あらない」）。",
      wrongs: ["あらない", "ありない", "あれない"],
    };
  }
  const m = verbMizen(word);
  return {
    form: `${m.stem}ない`,
    rule: `${m.rule} 再接助動詞「ない」。`,
    wrongs: m.wrongStems.map((x) => `${x}ない`),
  };
}

function verbMizen(word: LexiconWord): { stem: string; rule: string; wrongStems: string[] } {
  const { dict, verbCategory } = word;
  if (verbCategory === "kuru") {
    const s = dict.slice(0, -1);
    return { stem: s, rule: "カ變動詞「来る」的未然形讀作「こ（来）」。", wrongStems: [`${s}ら`, `${s}わ`, `${s}い`] };
  }
  if (verbCategory === "suru") {
    const s = dict.slice(0, -2);
    return { stem: `${s}し`, rule: "サ變動詞「〜する」接「ない」時未然形為「〜し」。", wrongStems: [`${s}さ`, `${s}す`, `${s}せ`] };
  }
  if (verbCategory === "ichidan") {
    const s = dict.slice(0, -1);
    return { stem: s, rule: "一段動詞未然形直接去掉字尾「る」。", wrongStems: [`${s}ら`, `${s}わ`, `${s}い`] };
  }
  const s = dict.slice(0, -1);
  const last = dict.slice(-1);
  const a = GODAN_A[last] ?? "わ";
  const rule =
    last === "う"
      ? "五段動詞字尾「う」變未然形改為「わ」（而非「あ」）。"
      : `五段動詞將字尾「${last}」改為あ段「${a}」（未然形）。`;
  const wrongStems =
    last === "う"
      ? [`${s}あ`, `${s}い`, `${s}ら`]
      : [`${s}${GODAN_I[last] ?? "い"}`, `${s}${GODAN_E[last] ?? "え"}`, s];
  return { stem: `${s}${a}`, rule, wrongStems };
}

function verbRenyou(word: LexiconWord): { stem: string; rule: string; wrongStems: string[] } {
  const { dict, verbCategory } = word;
  if (isHonorificAru(word)) {
    const s = dict.slice(0, -1);
    return {
      stem: `${s}い`,
      rule: `敬語五段動詞「${dict}」是例外：連用形變為「${s}い」（非「${s}り」）。`,
      wrongStems: [`${s}り`, `${s}ら`, `${s}れ`],
    };
  }
  if (verbCategory === "kuru") {
    const s = dict.slice(0, -1);
    return { stem: s, rule: "カ變動詞「来る」的連用形讀作「き（来）」。", wrongStems: [`${s}り`, `${s}い`, `${s}れ`] };
  }
  if (verbCategory === "suru") {
    const s = dict.slice(0, -2);
    return { stem: `${s}し`, rule: "サ變動詞「〜する」的連用形為「〜し」。", wrongStems: [`${s}す`, `${s}せ`, `${s}さ`] };
  }
  if (verbCategory === "ichidan") {
    const s = dict.slice(0, -1);
    return { stem: s, rule: "一段動詞連用形直接去掉字尾「る」。", wrongStems: [`${s}り`, `${s}れ`, `${s}ら`] };
  }
  const s = dict.slice(0, -1);
  const last = dict.slice(-1);
  const i = GODAN_I[last] ?? "い";
  return {
    stem: `${s}${i}`,
    rule: `五段動詞將字尾「${last}」改為い段「${i}」（連用形）。`,
    wrongStems: [`${s}${GODAN_A[last] ?? "わ"}`, `${s}${GODAN_E[last] ?? "え"}`, s],
  };
}

function verbTeOrTa(word: LexiconWord, mode: "te" | "ta"): { form: string; rule: string; wrongs: string[] } {
  const { dict, rt, verbCategory } = word;
  const t = mode === "te" ? "て" : "た";
  const d = mode === "te" ? "で" : "だ";

  if (verbCategory === "kuru") {
    const s = dict.slice(0, -1);
    return {
      form: `${s}${t}`,
      rule: `カ變動詞「来る」連用形＋「${t}」讀作「き${t}」。`,
      wrongs: [`${s}っ${t}`, `${s}い${t}`, `${s}ん${d}`],
    };
  }
  if (verbCategory === "suru") {
    const s = dict.slice(0, -2);
    return {
      form: `${s}し${t}`,
      rule: `サ變動詞連用形「し」＋「${t}」為「〜し${t}」。`,
      wrongs: [`${s}すっ${t}`, `${s}す${t}`, `${s}しん${d}`],
    };
  }
  if (verbCategory === "ichidan") {
    const s = dict.slice(0, -1);
    return {
      form: `${s}${t}`,
      rule: `一段動詞連用形（去る）直接接「${t}」。`,
      wrongs: [`${s}っ${t}`, `${s}ん${d}`, `${s}い${t}`],
    };
  }

  const s = dict.slice(0, -1);
  const last = dict.slice(-1);
  const isIku = dict === "行く" || rt === "いく" || dict.endsWith("行く");
  if (isIku) {
    return {
      form: `${s}っ${t}`,
      rule: `「行く」是五段音便例外：連用形＋「${t}」發生促音便變為「っ${t}」。`,
      wrongs: [`${s}い${t}`, `${s}ん${d}`, `${s}し${t}`],
    };
  }
  if (last === "う" || last === "つ" || last === "る") {
    return {
      form: `${s}っ${t}`,
      rule: `五段字尾「う・つ・る」接「${t}」發生促音便，變為「っ${t}」。`,
      wrongs: [`${s}い${t}`, `${s}ん${d}`, `${s}${t}`],
    };
  }
  if (last === "む" || last === "ぶ" || last === "ぬ") {
    return {
      form: `${s}ん${d}`,
      rule: `五段字尾「む・ぶ・ぬ」接「${t}」發生撥音便，變為「ん${d}」。`,
      wrongs: [`${s}っ${t}`, `${s}い${t}`, `${s}${t}`],
    };
  }
  if (last === "く") {
    return {
      form: `${s}い${t}`,
      rule: `五段字尾「く」接「${t}」發生い音便，變為「い${t}」。`,
      wrongs: [`${s}っ${t}`, `${s}い${d}`, `${s}し${t}`],
    };
  }
  if (last === "ぐ") {
    return {
      form: `${s}い${d}`,
      rule: `五段字尾「ぐ」接「${t}」發生濁音い音便，變為「い${d}」。`,
      wrongs: [`${s}い${t}`, `${s}っ${t}`, `${s}ん${d}`],
    };
  }
  return {
    form: `${s}し${t}`,
    rule: `五段字尾「す」以連用形「し」直接接「${t}」。`,
    wrongs: [`${s}っ${t}`, `${s}い${t}`, `${s}ん${d}`],
  };
}

function verbKatei(word: LexiconWord): { stem: string; rule: string; wrongStems: string[] } {
  const { dict, verbCategory } = word;
  if (verbCategory === "kuru") {
    const s = dict.slice(0, -1);
    return { stem: `${s}れ`, rule: "カ變動詞「来る」的假定形為「くれ（来れ）」。", wrongStems: [`${s}られ`, `${s}え`, s] };
  }
  if (verbCategory === "suru") {
    const s = dict.slice(0, -2);
    return { stem: `${s}すれ`, rule: "サ變動詞「〜する」的假定形為「〜すれ」。", wrongStems: [`${s}しれ`, `${s}せ`, `${s}され`] };
  }
  if (verbCategory === "ichidan") {
    const s = dict.slice(0, -1);
    return { stem: `${s}れ`, rule: "一段動詞將字尾「る」改為「れ」（假定形）。", wrongStems: [`${s}られ`, `${s}え`, `${s}けれ`] };
  }
  const s = dict.slice(0, -1);
  const last = dict.slice(-1);
  const e = GODAN_E[last] ?? "え";
  return {
    stem: `${s}${e}`,
    rule: `五段動詞將字尾「${last}」改為え段「${e}」（假定形）。`,
    wrongStems: [`${s}${GODAN_A[last] ?? "わ"}`, `${s}${GODAN_I[last] ?? "い"}`, `${s}${e}れ`],
  };
}

function verbMeirei(word: LexiconWord): { form: string; rule: string; wrongs: string[] } {
  const { dict, verbCategory } = word;
  if (isHonorificAru(word)) {
    const s = dict.slice(0, -1);
    return {
      form: `${s}い`,
      rule: `敬語五段動詞「${dict}」的命令形是例外，變為「${s}い」。`,
      wrongs: [`${s}れ`, `${s}ろ`, `${s}り`],
    };
  }
  if (verbCategory === "kuru") {
    const s = dict.slice(0, -1);
    return { form: `${s}い`, rule: "カ變動詞「来る」的命令形讀作「こい（来い）」。", wrongs: [`${s}ろ`, `${s}れ`, `${s}よ`] };
  }
  if (verbCategory === "suru") {
    const s = dict.slice(0, -2);
    return { form: `${s}しろ`, rule: "サ變動詞「〜する」的口語命令形為「〜しろ」。", wrongs: [`${s}すれ`, `${s}せ`, `${s}しれ`] };
  }
  if (verbCategory === "ichidan") {
    const s = dict.slice(0, -1);
    return { form: `${s}ろ`, rule: "一段動詞命令形將字尾「る」改為「ろ」。", wrongs: [`${s}れ`, `${s}え`, `${s}て`] };
  }
  const s = dict.slice(0, -1);
  const last = dict.slice(-1);
  const e = GODAN_E[last] ?? "え";
  return {
    form: `${s}${e}`,
    rule: `五段動詞命令形將字尾「${last}」改為え段「${e}」。`,
    wrongs: [`${s}${e}ろ`, `${s}${GODAN_A[last] ?? "わ"}`, `${s}${GODAN_I[last] ?? "い"}`],
  };
}

// ==================================================
// UNIVERSAL grammar PATTERN PARSER & VERIFIED GUARD
// ==================================================
type ParsedClause = {
  pos: WordPos;
  mode:
    | "plain"
    | "n_no"
    | "n_ni"
    | "n_da"
    | "n_de"
    | "n_dearu"
    | "n_nara"
    | "n_dattara"
    | "na_na"
    | "na_ni"
    | "na_da"
    | "na_de"
    | "na_dearu"
    | "na_nara"
    | "na_dattara"
    | "a_ku"
    | "a_kute"
    | "a_katta"
    | "a_katei"
    | "a_sa"
    | "v_mizen"
    | "v_mizen_nai"
    | "v_renyou"
    | "v_te"
    | "v_ta"
    | "v_katei"
    | "v_meirei";
  suffix: string;
  label: string;
};

const FORBIDDEN_SUFFIX_RE = /[A-Za-z＋+〜～~…・/／]|動詞|名詞|形容|補助|肯定|否定|疑問|場所|敘述|移動|連體|修飾/;

/**
 * Strictly cleans a single-slot Japanese suffix.
 * Returns "" if the suffix contains multi-slot placeholders (e.g. N＋から＋N＋にかけて)
 * or non-Japanese meta-labels so broken drills are NEVER generated.
 */
function cleanVerifiedSuffix(raw: string): string {
  const stripped = raw
    .replace(/【[^】]*】/g, "")
    .replace(/（[^）]*）/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[。、\s]/g, "")
    .trim();
  if (!stripped || stripped.length > 12) return "";
  if (FORBIDDEN_SUFFIX_RE.test(stripped)) return "";
  if (!/^[\u3040-\u30ff\u4e00-\u9fafー々]+$/.test(stripped)) return "";
  return stripped;
}

export function parseLessonClauses(lesson: GrammarLesson): ParsedClause[] {
  const key = `${lesson.level}:${lesson.id}`;
  const pat = (lesson.pattern ?? "").trim();
  const connText = (lesson.connection ?? []).join(" ");

  // 1. Curated high-precision rules (including V+て compound patterns & core N5/N4 lessons)
  if (key === "N5:02") return [{ pos: "N", mode: "n_de", suffix: "", label: "名詞中止形（N＋で）" }];
  if (key === "N5:08") return [{ pos: "A", mode: "a_kute", suffix: "", label: "形容詞中止形（A連用形く＋て）" }];
  if (key === "N5:13") return [{ pos: "Na", mode: "na_de", suffix: "", label: "形容動詞中止形（Na＋で）" }];
  if (key === "N5:35") return [{ pos: "V", mode: "v_te", suffix: "ください", label: "V（連用形音便）＋てください" }];
  if (key === "N5:37") return [{ pos: "V", mode: "v_te", suffix: "いる", label: "V（連用形音便）＋ている" }];
  if (key === "N5:38") return [{ pos: "V", mode: "v_te", suffix: "から", label: "V（連用形音便）＋てから" }];
  if (key === "N4:05") {
    return [
      { pos: "N", mode: "n_ni", suffix: "なる", label: "N＋に＋なる" },
      { pos: "Na", mode: "na_ni", suffix: "なる", label: "Na＋に＋なる" },
      { pos: "A", mode: "a_ku", suffix: "なる", label: "A（連用形く）＋なる" },
    ];
  }
  if (key === "N4:06") {
    return [
      { pos: "A", mode: "a_sa", suffix: "さ", label: "A去い＋さ（名詞化）" },
      { pos: "Na", mode: "plain", suffix: "さ", label: "Na語幹＋さ（名詞化）" },
    ];
  }
  if (key === "N4:10") {
    return [
      { pos: "N", mode: "n_da", suffix: "と", label: "N＋だ＋と" },
      { pos: "Na", mode: "na_da", suffix: "と", label: "Na＋だ＋と" },
      { pos: "A", mode: "plain", suffix: "と", label: "A（終止形）＋と" },
      { pos: "V", mode: "plain", suffix: "と", label: "V（終止形）＋と" },
    ];
  }
  if (key === "N4:11") {
    return [
      { pos: "N", mode: "n_nara", suffix: "", label: "N＋なら（ば）／であれば" },
      { pos: "Na", mode: "na_nara", suffix: "", label: "Na＋なら（ば）／であれば" },
      { pos: "A", mode: "a_katei", suffix: "ば", label: "A（假定形けれ）＋ば" },
      { pos: "V", mode: "v_katei", suffix: "ば", label: "V（假定形）＋ば" },
    ];
  }
  if (key === "N4:12") {
    return [
      { pos: "N", mode: "n_dattara", suffix: "", label: "N＋だったら" },
      { pos: "Na", mode: "na_dattara", suffix: "", label: "Na＋だったら" },
      { pos: "A", mode: "a_katta", suffix: "ら", label: "A（連用形かっ）＋たら" },
      { pos: "V", mode: "v_ta", suffix: "ら", label: "V（連用形音便）＋たら" },
    ];
  }
  if (key === "N4:13") {
    return [
      { pos: "N", mode: "plain", suffix: "なら", label: "N＋なら" },
      { pos: "Na", mode: "plain", suffix: "なら", label: "Na＋なら" },
      { pos: "A", mode: "plain", suffix: "なら", label: "A（終止形）＋なら" },
      { pos: "V", mode: "plain", suffix: "なら", label: "V（終止形）＋なら" },
    ];
  }
  if (key === "N4:16") return [{ pos: "V", mode: "v_te", suffix: "いく", label: "V（連用形音便）＋ていく" }];
  if (key === "N4:17") return [{ pos: "V", mode: "v_te", suffix: "くる", label: "V（連用形音便）＋てくる" }];
  if (key === "N4:18") return [{ pos: "V", mode: "v_te", suffix: "みる", label: "V（連用形音便）＋てみる" }];
  if (key === "N4:19") return [{ pos: "V", mode: "v_te", suffix: "しまう", label: "V（連用形音便）＋てしまう" }];
  if (key === "N4:20") return [{ pos: "V", mode: "v_te", suffix: "おく", label: "V（連用形音便）＋ておく" }];
  if (key === "N4:45") return [{ pos: "V", mode: "v_te", suffix: "はいけない", label: "V（連用形音便）＋てはいけない" }];
  if (key === "N3:100") return [{ pos: "N", mode: "plain", suffix: "はもちろん", label: "N＋はもちろん" }];
  if (key === "N3:140") {
    return [
      { pos: "V", mode: "plain", suffix: "んですが", label: "V（連體形）＋んですが" },
      { pos: "A", mode: "plain", suffix: "んですが", label: "A（連體形）＋んですが" },
      { pos: "N", mode: "na_na", suffix: "んですが", label: "N＋な＋んですが" },
      { pos: "Na", mode: "na_na", suffix: "んですが", label: "Na（連體形な）＋んですが" },
    ];
  }

  if (!pat) return [];

  // 2. Strict generic parser for verified single-suffix patterns
  const clauses: ParsedClause[] = [];
  const rawSegments = pat.split(/[／/]/);

  for (const seg of rawSegments) {
    const plusIdx = seg.indexOf("＋");
    if (plusIdx < 0) continue;
    const lhs = seg.slice(0, plusIdx).trim();
    const rhsRaw = seg.slice(plusIdx + 1).trim();
    const suffix = cleanVerifiedSuffix(rhsRaw);
    if (!suffix) continue;

    // Skip LHS that starts with non-POS discourse markers like "疑問詞" or "たとえ"
    if (/疑問詞|たとえ|お（ご）/.test(lhs)) continue;

    const lhsParts = lhs.split(/[・、]/).map((s) => s.trim()).filter(Boolean);
    for (const part of lhsParts) {
      if (part.startsWith("Na") || part.includes("形容動詞")) {
        if (part.includes("な") || connText.includes("形容動詞連體形")) {
          clauses.push({ pos: "Na", mode: "na_na", suffix, label: `Na（連體形な）＋${suffix}` });
        } else if (part.includes("に")) {
          clauses.push({ pos: "Na", mode: "na_ni", suffix, label: `Na＋に＋${suffix}` });
        } else if (part.includes("である")) {
          clauses.push({ pos: "Na", mode: "na_dearu", suffix, label: `Na＋である＋${suffix}` });
        } else if (part.includes("だ")) {
          clauses.push({ pos: "Na", mode: "na_da", suffix, label: `Na＋だ＋${suffix}` });
        } else {
          clauses.push({ pos: "Na", mode: "plain", suffix, label: `Na＋${suffix}` });
        }
        continue;
      }

      if (/^N(?![a-z])/.test(part) || part.includes("名詞")) {
        if (part.includes("の")) {
          clauses.push({ pos: "N", mode: "n_no", suffix, label: `N＋の＋${suffix}` });
        } else if (part.includes("に")) {
          clauses.push({ pos: "N", mode: "n_ni", suffix, label: `N＋に＋${suffix}` });
        } else if (part.includes("である")) {
          clauses.push({ pos: "N", mode: "n_dearu", suffix, label: `N＋である＋${suffix}` });
        } else if (part.includes("だ")) {
          clauses.push({ pos: "N", mode: "n_da", suffix, label: `N＋だ＋${suffix}` });
        } else {
          clauses.push({ pos: "N", mode: "plain", suffix, label: `N＋${suffix}` });
        }
        continue;
      }

      if (/^A(?![a-z])/.test(part) || part.includes("形容詞")) {
        if (part.includes("假定") || connText.includes("形容詞假定形")) {
          clauses.push({ pos: "A", mode: "a_katei", suffix, label: `A（假定形）＋${suffix}` });
        } else if (part.includes("かっ")) {
          clauses.push({ pos: "A", mode: "a_katta", suffix, label: `A（過去形かっ）＋${suffix}` });
        } else if (part.includes("く") || part.includes("連用")) {
          clauses.push({ pos: "A", mode: "a_ku", suffix, label: `A（連用形く）＋${suffix}` });
        } else {
          clauses.push({ pos: "A", mode: "plain", suffix, label: `A（連體形）＋${suffix}` });
        }
        continue;
      }

      if (/^V(?![a-z])/.test(part) || part.includes("動詞")) {
        if (part.includes("假定") || connText.includes("動詞假定形")) {
          clauses.push({ pos: "V", mode: "v_katei", suffix, label: `V（假定形）＋${suffix}` });
        } else if (part.includes("ない")) {
          clauses.push({ pos: "V", mode: "v_mizen_nai", suffix, label: `V（未然形＋ない）＋${suffix}` });
        } else if (part.includes("未然") || connText.includes("動詞未然形")) {
          clauses.push({ pos: "V", mode: "v_mizen", suffix, label: `V（未然形）＋${suffix}` });
        } else if (part.includes("て") || part.includes("テ")) {
          clauses.push({ pos: "V", mode: "v_te", suffix, label: `V（連用形音便て）＋${suffix}` });
        } else if (part.includes("た") || part.includes("タ")) {
          clauses.push({ pos: "V", mode: "v_ta", suffix, label: `V（連用形音便た）＋${suffix}` });
        } else if (part.includes("連用") || connText.includes("動詞連用形")) {
          clauses.push({ pos: "V", mode: "v_renyou", suffix, label: `V（連用形）＋${suffix}` });
        } else {
          clauses.push({ pos: "V", mode: "plain", suffix, label: `V（連體形）＋${suffix}` });
        }
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return clauses.filter((c) => {
    const k = `${c.pos}:${c.mode}:${c.suffix}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function applyClause(
  clause: ParsedClause,
  word: LexiconWord,
): { answer: string; accepted: string[]; choices: string[]; rule: string } {
  const d = word.dict;
  const suf = clause.suffix;

  switch (clause.mode) {
    case "n_no": {
      const ans = `${d}の${suf}`;
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, [`${d}な${suf}`, `${d}${suf}`, `${d}だ${suf}`]),
        rule: `名詞（N）接「${suf}」時中間須加「の」。`,
      };
    }
    case "n_ni":
    case "na_ni": {
      const ans = `${d}に${suf}`;
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, [`${d}く${suf}`, `${d}の${suf}`, `${d}な${suf}`]),
        rule: `${word.posLabel}接「${suf}」時使用「に」→「${ans}」。`,
      };
    }
    case "n_da":
    case "na_da": {
      const ans = `${d}だ${suf}`;
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, [`${d}${suf}`, `${d}な${suf}`, `${d}の${suf}`]),
        rule: `${word.posLabel}以斷定助動詞「だ」接續「${suf}」。`,
      };
    }
    case "n_de":
    case "na_de": {
      const ans = `${d}で${suf}`;
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, [`${d}て${suf}`, `${d}くて${suf}`, `${d}な${suf}`]),
        rule: `${word.posLabel}中止形直接接「で」。`,
      };
    }
    case "n_dearu":
    case "na_dearu": {
      const ans = `${d}である${suf}`;
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, [`${d}だ${suf}`, `${d}の${suf}`, `${d}な${suf}`]),
        rule: `${word.posLabel}接「である」再接續「${suf}」。`,
      };
    }
    case "n_nara":
    case "na_nara": {
      const ans = `${d}ならば`;
      return {
        answer: ans,
        accepted: [`${d}ならば`, `${d}なら`, `${d}であれば`],
        choices: uniqueChoices(ans, [`${d}ば`, `${d}ければ`, `${d}なば`]),
        rule: `${word.posLabel}表「ば」假定條件時，使用「${d}なら（ば）」或「${d}であれば」。`,
      };
    }
    case "n_dattara":
    case "na_dattara": {
      const ans = `${d}だったら`;
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, [`${d}たら`, `${d}かったら`, `${d}なったら`]),
        rule: `${word.posLabel}接「たら」時變為過去形「だった」＋「ら」→「${ans}」。`,
      };
    }
    case "na_na": {
      const ans = `${d}な${suf}`;
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, [`${d}の${suf}`, `${d}${suf}`, `${d}だ${suf}`]),
        rule: `${word.posLabel}接「${suf}」時中間加「な」。`,
      };
    }
    case "a_ku": {
      const s = adjStem(word);
      const ans = `${s}く${suf}`;
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, [`${d}${suf}`, `${s}に${suf}`, `${s}け${suf}`]),
        rule: isIiAdjective(word)
          ? `「いい／良い」的連用形為「よく」→「${ans}」。`
          : `形容詞（A）去「い」改為連用形「く」＋「${suf}」。`,
      };
    }
    case "a_kute": {
      const s = adjStem(word);
      const ans = `${s}くて`;
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, [`${d}て`, `${s}で`, `${s}くで`]),
        rule: isIiAdjective(word)
          ? "「いい／良い」連用形為「よく」，中止形為「よくて」。"
          : "形容詞（A）去「い」改為連用形「く」＋「て」。",
      };
    }
    case "a_katta": {
      const s = adjStem(word);
      const ans = `${s}かった${suf}`;
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, [`${d}た${suf}`, `${s}くた${suf}`, `${s}けった${suf}`]),
        rule: `形容詞（A）去「い」改為「かった」＋「${suf}」。`,
      };
    }
    case "a_katei": {
      const s = adjStem(word);
      const ans = `${s}けれ${suf}`;
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, [`${d}${suf}`, `${s}くれ${suf}`, `${s}かれ${suf}`]),
        rule: isIiAdjective(word)
          ? `「いい／良い」假定形為「よけれ」＋「${suf}」。`
          : `形容詞（A）去「い」改為假定形「けれ」＋「${suf}」。`,
      };
    }
    case "a_sa": {
      const s = adjStem(word);
      const ans = `${s}さ`;
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, [`${d}さ`, `${s}くさ`, `${s}けさ`]),
        rule: `形容詞（A）去「い」直接加「さ」構成抽象名詞。`,
      };
    }
    case "v_mizen_nai": {
      const mn = verbMizenNai(word);
      const ans = `${mn.form}${suf}`;
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, mn.wrongs.map((x) => `${x}${suf}`)),
        rule: `${mn.rule} 後面接續「${suf}」。`,
      };
    }
    case "v_mizen": {
      if (suf === "ない") {
        const mn = verbMizenNai(word);
        return { answer: mn.form, accepted: [mn.form], choices: uniqueChoices(mn.form, mn.wrongs), rule: mn.rule };
      }
      const m = verbMizen(word);
      const ans = `${m.stem}${suf}`;
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, m.wrongStems.map((x) => `${x}${suf}`)),
        rule: `${m.rule} 後面接續「${suf}」。`,
      };
    }
    case "v_renyou": {
      const r = verbRenyou(word);
      const ans = `${r.stem}${suf}`;
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, r.wrongStems.map((x) => `${x}${suf}`)),
        rule: `${r.rule} 後面接續「${suf}」。`,
      };
    }
    case "v_te": {
      const te = verbTeOrTa(word, "te");
      const ans = `${te.form}${suf}`;
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, te.wrongs.map((x) => `${x}${suf}`)),
        rule: `${te.rule} 後面接續「${suf}」。`,
      };
    }
    case "v_ta": {
      const ta = verbTeOrTa(word, "ta");
      const ans = `${ta.form}${suf}`;
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, ta.wrongs.map((x) => `${x}${suf}`)),
        rule: `${ta.rule} 後面接續「${suf}」。`,
      };
    }
    case "v_katei": {
      const k = verbKatei(word);
      const ans = `${k.stem}${suf}`;
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, k.wrongStems.map((x) => `${x}${suf}`)),
        rule: `${k.rule} 後面接續「${suf}」。`,
      };
    }
    case "v_meirei": {
      const m = verbMeirei(word);
      return { answer: m.form, accepted: [m.form], choices: uniqueChoices(m.form, m.wrongs), rule: m.rule };
    }
    case "plain":
    default: {
      const ans = `${d}${suf}`;
      const wrongs =
        word.pos === "V"
          ? [`${verbRenyou(word).stem}${suf}`, `${verbMizen(word).stem}${suf}`, `${d}の${suf}`]
          : word.pos === "Na"
            ? [`${d}な${suf}`, `${d}の${suf}`, `${d}だ${suf}`]
            : [`${d}の${suf}`, `${d}な${suf}`, `${d}だ${suf}`];
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, wrongs),
        rule: `${word.posLabel}直接接續「${suf}」。`,
      };
    }
  }
}

export function lexiconCount(level: LevelId | "ALL", allowedPos: WordPos[] = ["N", "Na", "A", "V"]): number {
  const posSet = new Set(allowedPos);
  return getLexicon().filter((w) => posSet.has(w.pos) && (level === "ALL" || w.level === level)).length;
}

export function lessonAllowedPos(lesson: GrammarLesson): WordPos[] {
  const clauses = parseLessonClauses(lesson);
  return Array.from(new Set(clauses.map((c) => c.pos)));
}

export function generateLessonPatternDrill(
  lesson: GrammarLesson,
  recentIds: readonly string[] = [],
): PatternDrillQuestion | null {
  const clauses = parseLessonClauses(lesson);
  if (clauses.length === 0) return null;

  const clause = clauses[Math.floor(Math.random() * clauses.length)];
  const all = getLexicon();
  let pool = all.filter(
    (w) => w.pos === clause.pos && (lesson.level === "N2" || lesson.level === "N1" ? true : w.level === lesson.level),
  );
  if (pool.length === 0) {
    pool = all.filter((w) => w.pos === clause.pos);
  }
  if (pool.length === 0) return null;

  const recentSet = new Set(recentIds.slice(-18));
  const fresh = pool.filter((w) => !recentSet.has(w.id));
  const source = fresh.length > 0 ? fresh : pool;
  const word = source[Math.floor(Math.random() * source.length)];
  const built = applyClause(clause, word);

  return {
    id: word.id,
    level: word.level,
    pos: word.pos,
    posLabel: word.posLabel,
    dict: word.dict,
    rt: word.rt,
    meaning: word.meaning,
    promptLabel: clause.label,
    ...built,
  };
}

// ==================================================
// BOUNDARY-SAFE REAL EXAMPLE CLOZE GENERATOR
// ==================================================
function candidateTargets(lesson: GrammarLesson): string[] {
  const raw = `${lesson.point ?? ""}／${lesson.gloss ?? ""}`;
  const parts = raw
    .split(/[／/・、,，]/)
    .map((s) =>
      s
        .replace(/[〜～~「」『』（）()【】]/g, "")
        .replace(/^(N|Na|A|V)[のになだ]?/, "")
        .trim(),
    )
    .filter((s) => s.length >= 1 && /^[\u3040-\u30ff\u4e00-\u9fafー]+$/.test(s));
  return Array.from(new Set(parts)).sort((a, b) => b.length - a.length);
}

/**
 * Avoids false matches for 1-character particles (like ば/と/に) inside unrelated words
 * by requiring 1-char targets to sit before punctuation/space or after a valid boundary.
 */
function findSafeTargetIndex(sentence: string, target: string): number {
  if (target.length >= 2) {
    return sentence.indexOf(target);
  }
  const re = new RegExp(`${target}(?=[、。！？\\s]|$)`, "g");
  const match = re.exec(sentence);
  return match ? match.index : -1;
}

export function generateLessonCloze(
  lesson: GrammarLesson,
  exampleIndex: number,
): ExampleClozeQuestion | null {
  const examples = lessonExamples(lesson);
  if (examples.length === 0) return null;

  const targets = candidateTargets(lesson);
  const ex = examples[exampleIndex % examples.length];
  const fullJa = ex.ja.trim();
  const reading = (ex.reading ?? "").trim();
  const zh = (ex.zh ?? "").trim();

  let matched = "";
  let matchPos = -1;
  for (const t of targets) {
    const idx = findSafeTargetIndex(fullJa, t);
    if (idx >= 0) {
      matched = t;
      matchPos = idx;
      break;
    }
  }
  if (!matched || matchPos < 0) return null;

  const siblings = grammarLessonsByLevel[lesson.level]
    .filter((other) => other.id !== lesson.id)
    .flatMap((other) => candidateTargets(other))
    .filter((cand) => cand !== matched && cand.length >= Math.min(2, matched.length) && cand.length <= 8);

  const shuffledSiblings = [...new Set(siblings)];
  for (let i = shuffledSiblings.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledSiblings[i], shuffledSiblings[j]] = [shuffledSiblings[j], shuffledSiblings[i]];
  }

  return {
    before: fullJa.slice(0, matchPos),
    after: fullJa.slice(matchPos + matched.length),
    answer: matched,
    fullJa,
    reading,
    zh,
    choices: uniqueChoices(matched, shuffledSiblings.slice(0, 8)),
  };
}

// ==================================================
// CLASSICAL 6-FORM VERB DRILL (六大活用形特訓)
// ==================================================
export function generateClassicalVerbDrill(
  form: ClassicalForm,
  levelFilter: LevelId | "ALL",
  recentIds: readonly string[] = [],
): PatternDrillQuestion | null {
  const pool = getLexicon().filter((w) => w.pos === "V" && (levelFilter === "ALL" || w.level === levelFilter));
  if (pool.length === 0) return null;

  const recentSet = new Set(recentIds.slice(-18));
  const fresh = pool.filter((w) => !recentSet.has(w.id));
  const source = fresh.length > 0 ? fresh : pool;
  const word = source[Math.floor(Math.random() * source.length)];

  if (form === "mizen_nai") {
    const res = verbMizenNai(word);
    return {
      id: word.id,
      level: word.level,
      pos: "V",
      posLabel: word.posLabel,
      dict: word.dict,
      rt: word.rt,
      meaning: word.meaning,
      promptLabel: "未然形 ＋ ない（否定）",
      answer: res.form,
      accepted: [res.form],
      choices: uniqueChoices(res.form, res.wrongs),
      rule: res.rule,
    };
  }
  if (form === "renyou_tai") {
    const res = verbRenyou(word);
    const ans = `${res.stem}たい`;
    return {
      id: word.id,
      level: word.level,
      pos: "V",
      posLabel: word.posLabel,
      dict: word.dict,
      rt: word.rt,
      meaning: word.meaning,
      promptLabel: "連用形 ＋ たい（願望）",
      answer: ans,
      accepted: [ans],
      choices: uniqueChoices(ans, res.wrongStems.map((x) => `${x}たい`)),
      rule: `${res.rule} 接續助動詞「たい」。`,
    };
  }
  if (form === "renyou_te" || form === "renyou_ta") {
    const mode = form === "renyou_te" ? "te" : "ta";
    const res = verbTeOrTa(word, mode);
    return {
      id: word.id,
      level: word.level,
      pos: "V",
      posLabel: word.posLabel,
      dict: word.dict,
      rt: word.rt,
      meaning: word.meaning,
      promptLabel: mode === "te" ? "連用形（音便）＋ て" : "連用形（音便）＋ た",
      answer: res.form,
      accepted: [res.form],
      choices: uniqueChoices(res.form, res.wrongs),
      rule: res.rule,
    };
  }
  if (form === "katei_ba") {
    const res = verbKatei(word);
    const ans = `${res.stem}ば`;
    return {
      id: word.id,
      level: word.level,
      pos: "V",
      posLabel: word.posLabel,
      dict: word.dict,
      rt: word.rt,
      meaning: word.meaning,
      promptLabel: "假定形 ＋ ば（條件）",
      answer: ans,
      accepted: [ans],
      choices: uniqueChoices(ans, res.wrongStems.map((x) => `${x}ば`)),
      rule: `${res.rule} 接續助詞「ば」。`,
    };
  }
  const res = verbMeirei(word);
  return {
    id: word.id,
    level: word.level,
    pos: "V",
    posLabel: word.posLabel,
    dict: word.dict,
    rt: word.rt,
    meaning: word.meaning,
    promptLabel: "命令形",
    answer: res.form,
    accepted: [res.form],
    choices: uniqueChoices(res.form, res.wrongs),
    rule: res.rule,
  };
}
