import { lessons, manifests } from "@/data/registry";
import type {
  ClassicalForm,
  LevelId,
  PatternDrillQuestion,
  PatternRuleId,
  WordPos,
} from "@/data/types";

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

const ACTIVE_LEVELS: LevelId[] = ["N5", "N4", "N3"];

function classifyVerb(verbType: string): { category: VerbCategory; label: string } | null {
  if (verbType === "五段" || verbType === "自他五") return { category: "godan", label: "V（五段動詞）" };
  if (verbType === "上一段") return { category: "ichidan", label: "V（上一段動詞）" };
  if (verbType === "下一段" || verbType === "自他下") return { category: "ichidan", label: "V（下一段動詞）" };
  if (verbType === "サ變" || verbType === "サ變複合") return { category: "suru", label: "V（サ變動詞）" };
  if (verbType === "カ變") return { category: "kuru", label: "V（カ變動詞）" };
  return null;
}

function cleanPrimary(raw: string): string {
  return raw.split(/[;；/／、,，(（]/)[0]?.trim() ?? raw.trim();
}

function isJapaneseWord(str: string): boolean {
  return /^[\u3040-\u30ff\u4e00-\u9fafー々]+$/.test(str);
}

let cachedLexicon: LexiconWord[] | null = null;

/**
 * Extracts N (名詞), Na (形容動詞), A (形容詞), and V (五段/一段/カ變/サ變)
 * directly from the bundled sigure.tw N5–N3 vocab JSON files.
 */
export function getLexicon(): LexiconWord[] {
  if (cachedLexicon) return cachedLexicon;
  const seen = new Set<string>();
  const list: LexiconWord[] = [];

  for (const level of ACTIVE_LEVELS) {
    for (const topic of manifests[level].topics) {
      const lesson = lessons[level][topic.id];
      if (!lesson) continue;

      const isAdjLesson = topic.title.includes("（形容詞）");
      const isNaLesson = topic.title.includes("（形容動詞）");
      const isNounLesson = topic.title.includes("（名詞）");

      lesson.words.forEach((w, idx) => {
        let dict = cleanPrimary(w.word);
        let rt = cleanPrimary(w.reading);
        if (!dict || !isJapaneseWord(dict)) return;
        const meaning = w.meaning.split("／")[0] ?? w.meaning;
        const safeRt = isJapaneseWord(rt) ? rt : dict;

        // 1. Verbs (tagged by verbType)
        if (w.verbType) {
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
          // Strip trailing だ / な if ever present
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
            rt: safeRt.replace(/[だな]$/, ""),
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
// LOW-LEVEL CLASSICAL INFLECTION HELPERS (國文法)
// ==================================================
function isIiAdjective(word: LexiconWord) {
  return word.dict === "いい" || word.dict === "良い" || word.rt === "いい";
}

function adjStem(word: LexiconWord) {
  if (isIiAdjective(word)) return "よ";
  return word.dict.slice(0, -1);
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
    return { stem: s, rule: "一段動詞（上一段／下一段）未然形直接去字尾「る」。", wrongStems: [`${s}ら`, `${s}わ`, `${s}い`] };
  }
  const s = dict.slice(0, -1);
  const last = dict.slice(-1);
  const a = GODAN_A[last] ?? "わ";
  const rule =
    last === "う"
      ? "五段動詞字尾「う」變未然形時改為「わ」（而非「あ」）。"
      : `五段動詞將字尾「${last}」改為あ段「${a}」（未然形）。`;
  const wrongStems =
    last === "う"
      ? [`${s}あ`, `${s}い`, `${s}ら`]
      : [`${s}${GODAN_I[last] ?? "い"}`, `${s}${GODAN_E[last] ?? "え"}`, s];
  return { stem: `${s}${a}`, rule, wrongStems };
}

function verbRenyou(word: LexiconWord): { stem: string; rule: string; wrongStems: string[] } {
  const { dict, verbCategory } = word;
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
  if (verbCategory === "kuru") {
    const s = dict.slice(0, -1);
    return { form: `${s}い`, rule: "カ變動詞「来る」的命令形讀作「こい（来い）」。", wrongs: [`${s}ろ`, `${s}れ`, `${s}よ`] };
  }
  if (verbCategory === "suru") {
    const s = dict.slice(0, -2);
    return { form: `${s}しろ`, rule: "サ變動詞「〜する」的口語命令形為「〜しろ」（書面為〜せよ）。", wrongs: [`${s}すれ`, `${s}せ`, `${s}しれ`] };
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
// 1. LESSON-SPECIFIC PATTERN MACHINE (依時雨文法規則)
// ==================================================
function buildRuleOutput(
  ruleId: PatternRuleId,
  word: LexiconWord,
): { promptLabel: string; answer: string; accepted: string[]; choices: string[]; rule: string } {
  const d = word.dict;

  // N5文法08「形容詞—中止形」～て～
  if (ruleId === "adj-chushi-te") {
    if (word.pos === "A") {
      const s = adjStem(word);
      const ans = `${s}くて`;
      return {
        promptLabel: "套用 N5文法08「形容詞中止形（〜て）」",
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, [`${d}て`, `${s}で`, `${s}くで`]),
        rule: isIiAdjective(word)
          ? "「いい／良い」的連用形為「よく」，中止形為「よくて」。"
          : "形容詞（A）去「い」改為連用形「く」＋「て」。",
      };
    }
    const ans = `${d}で`;
    return {
      promptLabel: "套用 N5文法08「形容動詞中止形（〜で）」",
      answer: ans,
      accepted: [ans],
      choices: uniqueChoices(ans, [`${d}て`, `${d}くて`, `${d}なて`]),
      rule: "形容動詞（Na）中止形直接接「で」（語幹＋で）。",
    };
  }

  // N4文法11「ば」表假定條件: N・Na＋なら（ば）／N・Na＋であれば／A・V（假定形）＋ば
  if (ruleId === "n4-ba") {
    if (word.pos === "V") {
      const k = verbKatei(word);
      const ans = `${k.stem}ば`;
      return {
        promptLabel: "套用 N4文法11「ば」假定條件（V 假定形＋ば）",
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, k.wrongStems.map((x) => `${x}ば`)),
        rule: `${k.rule} 再加上「ば」即構成假定條件。`,
      };
    }
    if (word.pos === "A") {
      const s = adjStem(word);
      const ans = `${s}ければ`;
      return {
        promptLabel: "套用 N4文法11「ば」假定條件（A 假定形＋ば）",
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, [`${d}ば`, `${s}くれば`, `${s}かれれば`]),
        rule: isIiAdjective(word)
          ? "「いい／良い」假定形為「よけれ」＋「ば」→「よければ」。"
          : "形容詞（A）去「い」改為假定形「けれ」＋「ば」。",
      };
    }
    const ans = `${d}ならば`;
    return {
      promptLabel: "套用 N4文法11「ば」假定條件（N・Na＋ならば／であれば）",
      answer: ans,
      accepted: [`${d}ならば`, `${d}なら`, `${d}であれば`],
      choices: uniqueChoices(ans, [`${d}ば`, `${d}ければ`, `${d}なば`]),
      rule: `${word.posLabel}接「ば」假定條件時，使用「${d}なら（ば）」或「${d}であれば」。`,
    };
  }

  // N4文法12「たら」表假定條件
  if (ruleId === "n4-tara") {
    if (word.pos === "V") {
      const ta = verbTeOrTa(word, "ta");
      const ans = `${ta.form}ら`;
      return {
        promptLabel: "套用 N4文法12「たら」假定條件（V 連用形音便＋たら）",
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, ta.wrongs.map((x) => `${x}ら`)),
        rule: `${ta.rule} 再加「ら」即構成「たら」條件句。`,
      };
    }
    if (word.pos === "A") {
      const s = adjStem(word);
      const ans = `${s}かったら`;
      return {
        promptLabel: "套用 N4文法12「たら」假定條件（A 連用形かっ＋たら）",
        answer: ans,
        accepted: [ans],
        choices: uniqueChoices(ans, [`${d}たら`, `${s}くたら`, `${s}けったら`]),
        rule: "形容詞（A）去「い」＋「かったら」（過去形＋ら）。",
      };
    }
    const ans = `${d}だったら`;
    return {
      promptLabel: "套用 N4文法12「たら」假定條件（N・Na＋だったら）",
      answer: ans,
      accepted: [ans],
      choices: uniqueChoices(ans, [`${d}たら`, `${d}かったら`, `${d}なったら`]),
      rule: `${word.posLabel}接「たら」時，先變過去普通形「だった」再加「ら」→「${d}だったら」。`,
    };
  }

  // N4文法13「なら」表假定條件
  if (ruleId === "n4-nara") {
    const ans = `${d}なら`;
    const wrongs =
      word.pos === "Na"
        ? [`${d}ななら`, `${d}だなら`, `${d}のなら`]
        : word.pos === "N"
          ? [`${d}のなら`, `${d}だなら`, `${d}ければ`]
          : [`${d}のなら`, `${d}だなら`, `${d}ななら`];
    return {
      promptLabel: "套用 N4文法13「なら」假定條件（普通形＋なら）",
      answer: ans,
      accepted: [ans, `${d}ならば`],
      choices: uniqueChoices(ans, wrongs),
      rule: `${word.posLabel}直接以終止形（名詞・形容動詞去だ）接「なら」。`,
    };
  }

  // V（未然形）＋ない
  if (ruleId === "v-mizen-nai") {
    const m = verbMizen(word);
    const ans = `${m.stem}ない`;
    return {
      promptLabel: "套用「V（未然形）＋ない」否定形",
      answer: ans,
      accepted: [ans],
      choices: uniqueChoices(ans, m.wrongStems.map((x) => `${x}ない`)),
      rule: `${m.rule} 再接助動詞「ない」。`,
    };
  }

  // V（連用形）＋たい
  if (ruleId === "v-renyou-tai") {
    const r = verbRenyou(word);
    const ans = `${r.stem}たい`;
    return {
      promptLabel: "套用「V（連用形）＋たい」表願望",
      answer: ans,
      accepted: [ans, `${r.stem}たいです`],
      choices: uniqueChoices(ans, r.wrongStems.map((x) => `${x}たい`)),
      rule: `${r.rule} 再加上助動詞「たい」。`,
    };
  }

  // V（連用形音便）＋てもいい / てはいけない / てしまう / てみる / ておく
  if (
    ruleId === "v-te-mo-ii" ||
    ruleId === "v-te-wa-ikenai" ||
    ruleId === "v-te-shimau" ||
    ruleId === "v-te-miru" ||
    ruleId === "v-te-oku"
  ) {
    const suffixMap: Record<string, { suf: string; label: string }> = {
      "v-te-mo-ii": { suf: "もいい", label: "V（連用形音便）＋てもいい（許可）" },
      "v-te-wa-ikenai": { suf: "はいけない", label: "V（連用形音便）＋てはいけない（禁止）" },
      "v-te-shimau": { suf: "しまう", label: "V（連用形音便）＋てしまう（完了・遺憾）" },
      "v-te-miru": { suf: "みる", label: "V（連用形音便）＋てみる（嘗試）" },
      "v-te-oku": { suf: "おく", label: "V（連用形音便）＋ておく（事前準備）" },
    };
    const meta = suffixMap[ruleId];
    const te = verbTeOrTa(word, "te");
    const ans = `${te.form}${meta.suf}`;
    return {
      promptLabel: `套用「${meta.label}」`,
      answer: ans,
      accepted: [ans],
      choices: uniqueChoices(ans, te.wrongs.map((x) => `${x}${meta.suf}`)),
      rule: `${te.rule} 後面接續「${meta.suf}」。`,
    };
  }

  // V（終止形／連體形）＋ことができる / ことにする
  if (ruleId === "v-koto-ga-dekiru" || ruleId === "n3-koto-ni-suru") {
    const suf = ruleId === "v-koto-ga-dekiru" ? "ことができる" : "ことにする";
    const ans = `${d}${suf}`;
    const r = verbRenyou(word);
    const m = verbMizen(word);
    return {
      promptLabel: `套用「V（連體形）＋${suf}」`,
      answer: ans,
      accepted: [ans],
      choices: uniqueChoices(ans, [`${r.stem}${suf}`, `${m.stem}${suf}`, `${d}の${suf}`]),
      rule: `動詞使用連體形（原形）直接接「${suf}」。`,
    };
  }

  // V（連用形音便）＋たことがある
  if (ruleId === "v-ta-koto-ga-aru") {
    const ta = verbTeOrTa(word, "ta");
    const ans = `${ta.form}ことがある`;
    return {
      promptLabel: "套用「V（連用形音便）＋たことがある」（經驗）",
      answer: ans,
      accepted: [ans],
      choices: uniqueChoices(ans, [
        `${d}ことがある`,
        ...ta.wrongs.slice(0, 2).map((x) => `${x}ことがある`),
      ]),
      rule: `${ta.rule} 後面接「ことがある」表示曾經做過。`,
    };
  }

  // N3: おかげで / せいで / わけではない / うちに (V/A 連體形, Na+な, N+の)
  const n3Meta: Record<string, { suf: string; label: string }> = {
    "n3-okage-de": { suf: "おかげで", label: "おかげで（正面歸因）" },
    "n3-sei-de": { suf: "せいで", label: "せいで（負面歸因）" },
    "n3-wake-dewa-nai": { suf: "わけではない", label: "わけではない（部分否定）" },
    "n3-uchi-ni": { suf: "うちに", label: "うちに（趁著…）" },
  };
  const info = n3Meta[ruleId] ?? n3Meta["n3-okage-de"];
  if (word.pos === "N") {
    const ans = `${d}の${info.suf}`;
    return {
      promptLabel: `套用「N＋の＋${info.label}」`,
      answer: ans,
      accepted: [ans],
      choices: uniqueChoices(ans, [`${d}な${info.suf}`, `${d}${info.suf}`, `${d}だ${info.suf}`]),
      rule: `名詞（N）接「${info.suf}」時中間必須加「の」。`,
    };
  }
  if (word.pos === "Na") {
    const ans = `${d}な${info.suf}`;
    return {
      promptLabel: `套用「Na（連體形な）＋${info.label}」`,
      answer: ans,
      accepted: [ans],
      choices: uniqueChoices(ans, [`${d}の${info.suf}`, `${d}${info.suf}`, `${d}だ${info.suf}`]),
      rule: `形容動詞（Na）以連體形「な」接續「${info.suf}」。`,
    };
  }
  const ans = `${d}${info.suf}`;
  return {
    promptLabel: `套用「${word.pos}（連體形）＋${info.label}」`,
    answer: ans,
    accepted: [ans],
    choices: uniqueChoices(ans, [`${d}の${info.suf}`, `${d}な${info.suf}`, `${d}だ${info.suf}`]),
    rule: `${word.posLabel}直接以連體形接續「${info.suf}」。`,
  };
}

export function lexiconCount(level: LevelId | "ALL", allowedPos: WordPos[] = ["N", "Na", "A", "V"]): number {
  const posSet = new Set(allowedPos);
  return getLexicon().filter((w) => posSet.has(w.pos) && (level === "ALL" || w.level === level)).length;
}

export function generatePatternDrill(
  ruleId: PatternRuleId,
  allowedPos: WordPos[],
  levelFilter: LevelId | "ALL",
  recentIds: readonly string[] = [],
): PatternDrillQuestion | null {
  const posSet = new Set(allowedPos);
  const all = getLexicon();
  let pool = all.filter((w) => posSet.has(w.pos) && (levelFilter === "ALL" || w.level === levelFilter));
  if (pool.length === 0) {
    pool = all.filter((w) => posSet.has(w.pos));
  }
  if (pool.length === 0) return null;

  // Balance POS sampling when multiple POS are allowed (e.g., N4文法11 allows N, Na, A, V)
  const availablePos = allowedPos.filter((p) => pool.some((w) => w.pos === p));
  const chosenPos = availablePos[Math.floor(Math.random() * availablePos.length)];
  const posPool = pool.filter((w) => w.pos === chosenPos);

  const recentSet = new Set(recentIds.slice(-18));
  const fresh = posPool.filter((w) => !recentSet.has(w.id));
  const source = fresh.length > 0 ? fresh : posPool;
  const word = source[Math.floor(Math.random() * source.length)];
  const built = buildRuleOutput(ruleId, word);

  return {
    id: word.id,
    level: word.level,
    pos: word.pos,
    posLabel: word.posLabel,
    dict: word.dict,
    rt: word.rt,
    meaning: word.meaning,
    ...built,
  };
}

// ==================================================
// 2. CLASSICAL 6-FORM VERB DRILL (六大活用形特訓)
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
    const res = verbMizen(word);
    const ans = `${res.stem}ない`;
    return {
      id: word.id,
      level: word.level,
      pos: "V",
      posLabel: word.posLabel,
      dict: word.dict,
      rt: word.rt,
      meaning: word.meaning,
      promptLabel: "未然形 ＋ ない（否定）",
      answer: ans,
      accepted: [ans],
      choices: uniqueChoices(ans, res.wrongStems.map((x) => `${x}ない`)),
      rule: `${res.rule} 接續助動詞「ない」。`,
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
