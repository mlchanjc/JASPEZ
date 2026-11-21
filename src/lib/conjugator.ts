import { grammarLessonsByLevel } from "@/data/grammarRegistry";
import { lessons, manifests } from "@/data/registry";
import type {
  ClassicalForm,
  ExampleClozeQuestion,
  GrammarLesson,
  LevelId,
  PatternDrillQuestion,
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

const GODAN_O: Record<string, string> = {
  う: "お",
  く: "こ",
  ぐ: "ご",
  す: "そ",
  つ: "と",
  ぬ: "の",
  ぶ: "ぼ",
  む: "も",
  る: "ろ",
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
// CLASSICAL INFLECTION HELPERS (國文法六大活用)
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
  if (word.verbCategory === "kuru") {
    const s = word.dict.slice(0, -1);
    return {
      form: `${s}ず`,
      rule: "カ變動詞「来る」接「ず」用未然形，讀作「こず（来ず）」（非きず）。",
      wrongs: [`${s}らず`, `${s}れず`, `${s}るず`],
    };
  }
  if (isAruVerb(word)) {
    return {
      form: "ない",
      rule: "「ある」的否定是特殊例外：直接變成「ない」（不可說「あらない」）。",
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

function verbMizenZu(word: LexiconWord): { form: string; rule: string; wrongs: string[] } {
  if (word.verbCategory === "suru") {
    const s = word.dict.slice(0, -2);
    return {
      form: `${s}せず`,
      rule: "サ變動詞接「ず」時為特殊未然形「せ」＋「ず」→「〜せず」（非〜しず）。",
      wrongs: [`${s}しず`, `${s}すず`, `${s}さず`],
    };
  }
  if (isAruVerb(word)) {
    return {
      form: "あらず",
      rule: "「ある」接古語否定助動詞「ず」時用未然形「あら」＋「ず」。",
      wrongs: ["ありず", "あれず", "なず"],
    };
  }
  const m = verbMizen(word);
  return {
    form: `${m.stem}ず`,
    rule: `${m.rule} 接否定助動詞「ず」。`,
    wrongs: m.wrongStems.map((x) => `${x}ず`),
  };
}

function verbVolitional(word: LexiconWord): { form: string; rule: string; wrongs: string[] } {
  const { dict, verbCategory } = word;
  if (verbCategory === "kuru") {
    const s = dict.slice(0, -1);
    return {
      form: `${s}よう`,
      rule: "カ變動詞「来る」的意向形（未然形＋よう）讀作「こよう（来よう）」。",
      wrongs: [`${s}ろう`, `${s}う`, `${s}ようう`],
    };
  }
  if (verbCategory === "suru") {
    const s = dict.slice(0, -2);
    return {
      form: `${s}しよう`,
      rule: "サ變動詞「〜する」的意向形為「〜しよう」。",
      wrongs: [`${s}すろう`, `${s}そう`, `${s}せよう`],
    };
  }
  if (verbCategory === "ichidan") {
    const s = dict.slice(0, -1);
    return {
      form: `${s}よう`,
      rule: "一段動詞去字尾「る」＋「よう」（意向形）。",
      wrongs: [`${s}ろう`, `${s}おう`, `${s}う`],
    };
  }
  const s = dict.slice(0, -1);
  const last = dict.slice(-1);
  const o = GODAN_O[last] ?? "お";
  return {
    form: `${s}${o}う`,
    rule: `五段動詞將字尾「${last}」改為お段「${o}」＋「う」（意向形）。`,
    wrongs: [`${s}${GODAN_A[last] ?? "わ"}う`, `${s}${GODAN_E[last] ?? "え"}う`, `${s}よう`],
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
// STRICT WHITELIST PATTERN PARSER (ZERO WRONG ANSWERS)
// ==================================================
type ClauseMode =
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
  | "a_kuaru"
  | "a_katta"
  | "a_katei"
  | "a_sa"
  | "v_koto"
  | "v_mizen"
  | "v_mizen_nai"
  | "v_mizen_zu"
  | "v_volitional"
  | "v_renyou"
  | "v_te"
  | "v_teiru"
  | "v_ta"
  | "v_katei"
  | "v_meirei";

type ParsedClause = {
  pos: WordPos;
  mode: ClauseMode;
  suffix: string;
  label: string;
};

const FORBIDDEN_SUFFIX_RE = /[A-Za-z＋+〜～~…・/／]|動詞|名詞|形容|補助|肯定|否定|疑問|場所|敘述|移動|連體|修飾|後句|句子/;

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

/**
 * Strictly parses a single LHS token into { pos, mode } using an exact whitelist.
 * Returns null if the token is unrecognized or semantically restricted (e.g. 時間名詞, 數量詞, A語幹),
 * so the Pattern Machine NEVER guesses `plain` and NEVER produces a grammatically wrong answer.
 */
function parseStrictLhsToken(rawPart: string, suffix: string): { pos: WordPos; mode: ClauseMode; label: string } | null {
  // Normalize full-width letters/spaces (e.g., Ｎ -> N, Ｖ -> V, "Na な" -> "Naな")
  const p = rawPart.normalize("NFKC").replace(/\s+/g, "").trim();
  if (!p) return null;

  // Reject semantically restricted or non-POS labels
  if (/時間名詞|數量詞|副詞|疑問|句子|普通體|たとえ|お\(ご\)|場所|語幹/.test(p) && !/^Na\(語幹\)$/.test(p)) {
    return null;
  }

  // --- Na (形容動詞) ---
  if (p === "Na" || p === "Na(語幹)") {
    return { pos: "Na", mode: "plain", label: `Na＋${suffix}` };
  }
  if (p === "Naな") return { pos: "Na", mode: "na_na", label: `Na（連體形な）＋${suffix}` };
  if (p === "Naに") return { pos: "Na", mode: "na_ni", label: `Na＋に＋${suffix}` };
  if (p === "Naだ") return { pos: "Na", mode: "na_da", label: `Na＋だ＋${suffix}` };
  if (p === "Naで") return { pos: "Na", mode: "na_de", label: `Na＋で＋${suffix}` };
  if (p === "Naである") return { pos: "Na", mode: "na_dearu", label: `Na＋である＋${suffix}` };

  // --- N (名詞) ---
  if (p === "N" || p === "名詞") return { pos: "N", mode: "plain", label: `N＋${suffix}` };
  if (p === "Nの") return { pos: "N", mode: "n_no", label: `N＋の＋${suffix}` };
  if (p === "Nな") return { pos: "N", mode: "na_na", label: `N＋な＋${suffix}` };
  if (p === "Nに") return { pos: "N", mode: "n_ni", label: `N＋に＋${suffix}` };
  if (p === "Nだ") return { pos: "N", mode: "n_da", label: `N＋だ＋${suffix}` };
  if (p === "Nで") return { pos: "N", mode: "n_de", label: `N＋で＋${suffix}` };
  if (p === "Nである") return { pos: "N", mode: "n_dearu", label: `N＋である＋${suffix}` };

  // --- A (い形容詞) ---
  if (p === "A" || p === "A(連體形)" || p === "A(終止形)") {
    return { pos: "A", mode: "plain", label: `A（連體形）＋${suffix}` };
  }
  if (p === "Aく") return { pos: "A", mode: "a_ku", label: `A（連用形く）＋${suffix}` };
  if (p === "Aて" || p === "Aくて") return { pos: "A", mode: "a_kute", label: `A（連用形くて）＋${suffix}` };
  if (p === "Aくある") return { pos: "A", mode: "a_kuaru", label: `A（連用形くある）＋${suffix}` };
  if (p === "Aかっ") return { pos: "A", mode: "a_katta", label: `A（連用形かっ）＋${suffix}` };
  if (p === "A(假定形)") return { pos: "A", mode: "a_katei", label: `A（假定形けれ）＋${suffix}` };

  // --- V (動詞) ---
  if (p === "V" || p === "Vる" || p === "V(連體形)" || p === "V(終止形)" || p === "V(原形)" || p === "V(辭書形)") {
    return { pos: "V", mode: "plain", label: `V（連體形）＋${suffix}` };
  }
  if (p === "Vこと") return { pos: "V", mode: "v_koto", label: `V（連體形）＋こと＋${suffix}` };
  if (p === "V(連用形)" || p === "動詞連用形") {
    return { pos: "V", mode: "v_renyou", label: `V（連用形）＋${suffix}` };
  }
  if (p === "V(未然形)" || p === "動詞未然形") {
    return { pos: "V", mode: "v_mizen", label: `V（未然形）＋${suffix}` };
  }
  if (p === "Vない" || p === "Vーない") {
    return { pos: "V", mode: "v_mizen_nai", label: `V（未然形＋ない）＋${suffix}` };
  }
  if (p === "Vて" || p === "Vーて" || p === "V(テ形)") {
    return { pos: "V", mode: "v_te", label: `V（連用形音便て）＋${suffix}` };
  }
  if (p === "Vている") {
    return { pos: "V", mode: "v_teiru", label: `V（連用形音便＋ている）＋${suffix}` };
  }
  if (p === "Vた" || p === "Vーた" || p === "V(タ形)") {
    return { pos: "V", mode: "v_ta", label: `V（連用形音便た）＋${suffix}` };
  }
  if (p === "V(假定形)") {
    return { pos: "V", mode: "v_katei", label: `V（假定形）＋${suffix}` };
  }
  if (p === "V(意向形)") {
    return { pos: "V", mode: "v_volitional", label: `V（意向形）＋${suffix}` };
  }

  return null;
}

export function parseLessonClauses(lesson: GrammarLesson): ParsedClause[] {
  const key = `${lesson.level}:${lesson.id}`;
  const pat = (lesson.pattern ?? "").trim();

  // 1. Curated high-precision rules (exact Japanese professor verification)
  if (key === "N5:02") return [{ pos: "N", mode: "n_de", suffix: "", label: "名詞中止形（N＋で）" }];
  if (key === "N5:08") return [{ pos: "A", mode: "a_kute", suffix: "", label: "形容詞中止形（A連用形く＋て）" }];
  if (key === "N5:13") return [{ pos: "Na", mode: "na_de", suffix: "", label: "形容動詞中止形（Na＋で）" }];
  if (key === "N5:35") return [{ pos: "V", mode: "v_te", suffix: "ください", label: "V（連用形音便）＋てください" }];
  if (key === "N5:36" || key === "N4:46") {
    return [
      { pos: "N", mode: "n_de", suffix: "も", label: "N＋でも" },
      { pos: "Na", mode: "na_de", suffix: "も", label: "Na＋でも" },
      { pos: "A", mode: "a_kute", suffix: "も", label: "A（連用形くて）＋も" },
      { pos: "V", mode: "v_te", suffix: "も", label: "V（連用形音便て）＋も" },
    ];
  }
  if (key === "N5:37") return [{ pos: "V", mode: "v_te", suffix: "いる", label: "V（連用形音便）＋ている" }];
  if (key === "N5:38") return [{ pos: "V", mode: "v_te", suffix: "から", label: "V（連用形音便）＋てから" }];
  if (key === "N4:01") {
    return [
      { pos: "N", mode: "n_ni", suffix: "する", label: "N＋にする（決定）" },
      { pos: "V", mode: "v_koto", suffix: "にする", label: "V（連體形）＋ことにする（決定）" },
    ];
  }
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
  if (key === "N4:21") return [{ pos: "V", mode: "v_mizen_zu", suffix: "", label: "V（未然形）＋ず（サ變為せず）" }];
  if (key === "N4:31") return [{ pos: "V", mode: "v_volitional", suffix: "", label: "V（意向形：う／よう）" }];
  if (key === "N4:45") return [{ pos: "V", mode: "v_te", suffix: "はいけない", label: "V（連用形音便）＋てはいけない" }];
  if (key === "N3:100") return [{ pos: "N", mode: "plain", suffix: "はもちろん", label: "N＋はもちろん" }];
  if (key === "N3:104") return [{ pos: "V", mode: "plain", suffix: "べき", label: "V（連體形）＋べき" }];
  if (key === "N3:125") {
    return [
      { pos: "N", mode: "plain", suffix: "ならよかった", label: "N＋なら（ば）よかった" },
      { pos: "Na", mode: "plain", suffix: "ならよかった", label: "Na＋なら（ば）よかった" },
      { pos: "A", mode: "a_katei", suffix: "ばよかった", label: "A（假定形けれ）＋ばよかった" },
      { pos: "V", mode: "v_katei", suffix: "ばよかった", label: "V（假定形）＋ばよかった" },
    ];
  }
  if (key === "N3:140") {
    return [
      { pos: "V", mode: "plain", suffix: "んですが", label: "V（連體形）＋んですが" },
      { pos: "A", mode: "plain", suffix: "んですが", label: "A（連體形）＋んですが" },
      { pos: "N", mode: "na_na", suffix: "んですが", label: "N＋な＋んですが" },
      { pos: "Na", mode: "na_na", suffix: "んですが", label: "Na（連體形な）＋んですが" },
    ];
  }
  if (key === "N5:23") return [{ pos: "V", mode: "v_te", suffix: "", label: "V（連用形音便て・中止形）" }];
  if (key === "N3:07") return [{ pos: "V", mode: "v_renyou", suffix: "かけ", label: "V（連用形）＋かけ" }];
  if (key === "N3:08") return [{ pos: "V", mode: "v_renyou", suffix: "がち", label: "V（連用形）＋がち" }];
  if (key === "N3:28") {
    return [
      { pos: "N", mode: "n_no", suffix: "際に", label: "N＋の＋際に" },
      { pos: "V", mode: "plain", suffix: "際に", label: "V（連體形）＋際に" },
    ];
  }
  if (key === "N3:93") return [{ pos: "N", mode: "n_no", suffix: "うえで", label: "N＋のうえで" }];
  if (key === "N3:15") {
    return [
      { pos: "N", mode: "plain", suffix: "ぎみ", label: "N＋ぎみ" },
      { pos: "V", mode: "v_renyou", suffix: "ぎみ", label: "V（連用形）＋ぎみ" },
    ];
  }
  if (key === "N3:42") {
    return [
      { pos: "N", mode: "n_da", suffix: "ったっけ", label: "N＋だったっけ" },
      { pos: "Na", mode: "na_da", suffix: "ったっけ", label: "Na＋だったっけ" },
      { pos: "A", mode: "a_katta", suffix: "っけ", label: "A（連用形かっ）＋たっけ" },
      { pos: "V", mode: "v_ta", suffix: "っけ", label: "V（連用形音便た）＋っけ" },
    ];
  }
  if (key === "N3:44") return [{ pos: "V", mode: "v_renyou", suffix: "っぱなし", label: "V（連用形）＋っぱなし" }];
  if (key === "N3:45") return [{ pos: "N", mode: "plain", suffix: "っぽい", label: "N＋っぽい" }];
  if (key === "N3:48") return [{ pos: "V", mode: "v_te", suffix: "からでないと", label: "V（連用形音便て）＋からでないと" }];
  if (key === "N3:49") return [{ pos: "V", mode: "v_te", suffix: "くれ", label: "V（連用形音便て）＋くれ" }];
  if (key === "N3:50") return [{ pos: "V", mode: "v_te", suffix: "ごらん", label: "V（連用形音便て）＋ごらん" }];
  if (key === "N3:57") {
    return [
      { pos: "N", mode: "n_de", suffix: "よかった", label: "N＋でよかった" },
      { pos: "Na", mode: "na_de", suffix: "よかった", label: "Na＋でよかった" },
      { pos: "A", mode: "a_kute", suffix: "よかった", label: "A（連用形くて）＋よかった" },
      { pos: "V", mode: "v_te", suffix: "よかった", label: "V（連用形音便て）＋よかった" },
    ];
  }
  if (key === "N3:74") return [{ pos: "V", mode: "v_mizen_nai", suffix: "でおく", label: "V（未然形＋ない）＋でおく" }];
  if (key === "N3:75") {
    return [
      { pos: "N", mode: "n_de", suffix: "ないと", label: "N＋でないと" },
      { pos: "Na", mode: "na_de", suffix: "ないと", label: "Na＋でないと" },
      { pos: "A", mode: "a_ku", suffix: "ないと", label: "A（連用形く）＋ないと" },
      { pos: "V", mode: "v_mizen_nai", suffix: "と", label: "V（未然形＋ない）＋と" },
    ];
  }
  if (key === "N3:121") return [{ pos: "V", mode: "v_renyou", suffix: "ようがない", label: "V（連用形）＋ようがない" }];
  if (key === "N3:137") {
    return [
      { pos: "N", mode: "na_na", suffix: "んじゃない", label: "N＋なんじゃない" },
      { pos: "Na", mode: "na_na", suffix: "んじゃない", label: "Na＋なんじゃない" },
      { pos: "A", mode: "plain", suffix: "んじゃない", label: "A（連體形）＋んじゃない" },
      { pos: "V", mode: "plain", suffix: "んじゃない", label: "V（連體形）＋んじゃない" },
    ];
  }
  // Semantically restricted / multi-slot / causative patterns: rely on real-example Cloze & Study Notes
  if (
    key === "N4:02" ||
    key === "N4:08" ||
    key === "N3:30" ||
    key === "N3:31" ||
    key === "N3:32" ||
    key === "N3:36" ||
    key === "N3:52" ||
    key === "N3:54" ||
    key === "N3:72" ||
    key === "N3:112" ||
    key === "N2:06"
  ) {
    return [];
  }

  if (!pat) return [];

  // 2. Strict whitelist parser for remaining single-suffix patterns
  const clauses: ParsedClause[] = [];
  const rawSegments = pat.split(/[／/]/);

  let pendingLhs: string[] = [];
  for (const seg of rawSegments) {
    const plusIdx = seg.indexOf("＋");
    if (plusIdx < 0) {
      // Carry forward LHS-only slash tokens (e.g. "Nの" in "Nの／Vている＋最中（に）")
      const norm = seg.normalize("NFKC").trim();
      if (/^(N|Na|A|V|名詞|動詞)/.test(norm)) {
        pendingLhs.push(seg.trim());
      }
      continue;
    }
    const lhsAll = [...pendingLhs, seg.slice(0, plusIdx).trim()].filter(Boolean);
    pendingLhs = [];
    const rhsRaw = seg.slice(plusIdx + 1).trim();
    const suffix = cleanVerifiedSuffix(rhsRaw);
    if (!suffix) continue;

    const lhsJoined = lhsAll.join("・");
    const sharedKatei = /（假定形）|\(假定形\)/.test(lhsJoined);

    const lhsParts = lhsJoined.split(/[・、]/).map((s) => s.trim()).filter(Boolean);
    for (const part of lhsParts) {
      const normalizedPart =
        sharedKatei && part.normalize("NFKC") === "A" ? "A(假定形)" : part;
      const parsed = parseStrictLhsToken(normalizedPart, suffix);
      if (parsed) {
        clauses.push({ pos: parsed.pos, mode: parsed.mode, suffix, label: parsed.label });
      }
    }
  }

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
      const extraAccepted = suf === "ったっけ" ? [`${d}だっけ`] : [];
      return {
        answer: ans,
        accepted: [ans, ...extraAccepted],
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
        rule: `${word.posLabel}以「で」接續${suf ? `「${suf}」` : "（中止形）"}。`,
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
      const ans = `${s}くて${suf}`;
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, [`${d}て${suf}`, `${s}で${suf}`, `${s}くで${suf}`]),
        rule: isIiAdjective(word)
          ? `「いい／良い」連用形為「よく」→「${ans}」。`
          : `形容詞（A）去「い」改為連用形「く」＋「て${suf}」。`,
      };
    }
    case "a_kuaru": {
      const s = adjStem(word);
      const ans = `${s}くある${suf}`;
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, [`${d}${suf}`, `${s}く${suf}`, `${s}くである${suf}`]),
        rule: `形容詞（A）改連用形「く」＋「ある」再接「${suf}」。`,
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
    case "v_koto": {
      const ans = `${d}こと${suf}`;
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, [`${d}${suf}`, `${verbRenyou(word).stem}こと${suf}`, `${d}の${suf}`]),
        rule: `動詞連體形（原形）須先名詞化加「こと」，再接「${suf}」→「${ans}」。`,
      };
    }
    case "v_mizen_nai": {
      const mn = verbMizenNai(word);
      const ans = `${mn.form}${suf}`;
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, mn.wrongs.map((x) => `${x}${suf}`)),
        rule: `${mn.rule}${suf ? ` 後面接續「${suf}」。` : ""}`,
      };
    }
    case "v_mizen_zu": {
      const mz = verbMizenZu(word);
      return {
        answer: mz.form,
        accepted: [mz.form],
        choices: uniqueChoices(mz.form, mz.wrongs),
        rule: mz.rule,
      };
    }
    case "v_volitional": {
      const vol = verbVolitional(word);
      const ans = `${vol.form}${suf}`;
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, vol.wrongs.map((x) => `${x}${suf}`)),
        rule: `${vol.rule}${suf ? ` 後面接續「${suf}」。` : ""}`,
      };
    }
    case "v_mizen": {
      if (suf === "ない") {
        const mn = verbMizenNai(word);
        return { answer: mn.form, accepted: [mn.form], choices: uniqueChoices(mn.form, mn.wrongs), rule: mn.rule };
      }
      if (suf === "ず") {
        const mz = verbMizenZu(word);
        return { answer: mz.form, accepted: [mz.form], choices: uniqueChoices(mz.form, mz.wrongs), rule: mz.rule };
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
    case "v_teiru": {
      const te = verbTeOrTa(word, "te");
      const ans = `${te.form}いる${suf}`;
      return {
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, [`${d}${suf}`, ...te.wrongs.slice(0, 2).map((x) => `${x}いる${suf}`)]),
        rule: `${te.rule} 接「いる」表持續中，再接「${suf}」。`,
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
