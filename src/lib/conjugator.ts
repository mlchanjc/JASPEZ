import { lessons, manifests } from "@/data/registry";
import type { ConjugationForm, ConjugationQuestion, LevelId } from "@/data/types";

type VerbCategory = "godan" | "ichidan" | "suru" | "kuru";

type ParsedVerb = {
  id: string;
  level: LevelId;
  dict: string;
  rt: string;
  meaning: string;
  category: VerbCategory;
  groupLabel: string;
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

function classifyVerb(verbType: string): { category: VerbCategory; groupLabel: string } | null {
  if (verbType === "五段" || verbType === "自他五") {
    return { category: "godan", groupLabel: "一類動詞（五段）" };
  }
  if (verbType === "下一段" || verbType === "上一段" || verbType === "自他下") {
    return { category: "ichidan", groupLabel: "二類動詞（一段）" };
  }
  if (verbType === "サ變" || verbType === "サ變複合") {
    return { category: "suru", groupLabel: "三類動詞（サ變）" };
  }
  if (verbType === "カ變") {
    return { category: "kuru", groupLabel: "三類動詞（カ變）" };
  }
  return null;
}

function cleanPrimary(raw: string): string {
  return raw.split(/[;；/／、,，(（]/)[0]?.trim() ?? raw.trim();
}

function isKanaOrKanji(str: string): boolean {
  return /^[\u3040-\u30ff\u4e00-\u9fafー々]+$/.test(str);
}

let cachedVerbs: ParsedVerb[] | null = null;

export function getAllDrillVerbs(): ParsedVerb[] {
  if (cachedVerbs) return cachedVerbs;
  const seen = new Set<string>();
  const list: ParsedVerb[] = [];

  for (const level of ACTIVE_LEVELS) {
    for (const topic of manifests[level].topics) {
      const lesson = lessons[level][topic.id];
      if (!lesson) continue;
      lesson.words.forEach((w, idx) => {
        if (!w.verbType) return;
        const info = classifyVerb(w.verbType);
        if (!info) return;

        let dict = cleanPrimary(w.word);
        let rt = cleanPrimary(w.reading);
        if (!dict || !isKanaOrKanji(dict)) return;

        if (info.category === "suru") {
          if (!dict.endsWith("する")) dict = `${dict}する`;
          if (rt && !rt.endsWith("する") && isKanaOrKanji(rt)) rt = `${rt}する`;
          else if (!isKanaOrKanji(rt)) rt = dict;
        } else if (info.category === "ichidan") {
          if (!dict.endsWith("る")) return;
        } else if (info.category === "godan") {
          const last = dict.slice(-1);
          if (!GODAN_A[last]) return;
        } else if (info.category === "kuru") {
          if (!dict.endsWith("来る") && !dict.endsWith("くる")) return;
        }

        const dedupeKey = `${level}:${dict}`;
        if (seen.has(dedupeKey)) return;
        seen.add(dedupeKey);

        list.push({
          id: `${level}:${topic.id}:${idx}`,
          level,
          dict,
          rt: isKanaOrKanji(rt) ? rt : dict,
          meaning: w.meaning.split("／")[0] ?? w.meaning,
          category: info.category,
          groupLabel: info.groupLabel,
        });
      });
    }
  }

  cachedVerbs = list;
  return list;
}

function uniqueChoices(answer: string, candidates: string[]): string[] {
  const set = new Set<string>([answer]);
  for (const item of candidates) {
    if (item && item !== answer && !set.has(item)) set.add(item);
    if (set.size === 4) break;
  }
  const arr = Array.from(set);
  // Deterministic-free Fisher-Yates shuffle
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function conjugateVerb(verb: ParsedVerb, form: ConjugationForm): { answer: string; choices: string[]; rule: string } {
  const { dict, rt, category } = verb;

  if (category === "kuru") {
    const stem = dict.slice(0, -1); // 来 or く
    if (form === "te") {
      return {
        answer: `${stem}て`,
        choices: uniqueChoices(`${stem}て`, [`${stem}って`, `${stem}いて`, `${stem}んで`]),
        rule: "不規則動詞「来る（くる）」的て形讀作「きて（来て）」。",
      };
    }
    if (form === "nai") {
      return {
        answer: `${stem}ない`,
        choices: uniqueChoices(`${stem}ない`, [`${stem}らない`, `${stem}わない`, `${stem}いない`]),
        rule: "不規則動詞「来る（くる）」的ない形讀作「こない（来ない）」。",
      };
    }
    if (form === "potential") {
      return {
        answer: `${stem}られる`,
        choices: uniqueChoices(`${stem}られる`, [`${stem}れる`, `${stem}える`, `${stem}ける`]),
        rule: "不規則動詞「来る（くる）」的標準可能形讀作「こられる（来られる）」。",
      };
    }
    return {
      answer: `${stem}た`,
      choices: uniqueChoices(`${stem}た`, [`${stem}った`, `${stem}いた`, `${stem}んだ`]),
      rule: "不規則動詞「来る（くる）」的た形讀作「きた（来た）」。",
    };
  }

  if (category === "suru") {
    const stem = dict.slice(0, -2);
    if (form === "te") {
      return {
        answer: `${stem}して`,
        choices: uniqueChoices(`${stem}して`, [`${stem}すって`, `${stem}すて`, `${stem}しんで`]),
        rule: "サ變動詞「〜する」的て形一律變為「〜して」。",
      };
    }
    if (form === "nai") {
      return {
        answer: `${stem}しない`,
        choices: uniqueChoices(`${stem}しない`, [`${stem}さない`, `${stem}すない`, `${stem}すらない`]),
        rule: "サ變動詞「〜する」的ない形一律變為「〜しない」。",
      };
    }
    if (form === "potential") {
      return {
        answer: `${stem}できる`,
        choices: uniqueChoices(`${stem}できる`, [`${stem}される`, [`${stem}すれる`][0], `${stem}しられる`]),
        rule: "サ變動詞「〜する」的可能形為「〜できる」。",
      };
    }
    return {
      answer: `${stem}した`,
      choices: uniqueChoices(`${stem}した`, [`${stem}すった`, `${stem}すた`, `${stem}しんだ`]),
      rule: "サ變動詞「〜する」的た形一律變為「〜した」。",
    };
  }

  if (category === "ichidan") {
    const stem = dict.slice(0, -1);
    if (form === "te") {
      return {
        answer: `${stem}て`,
        choices: uniqueChoices(`${stem}て`, [`${stem}って`, `${stem}んで`, `${stem}いて`]),
        rule: "二類（一段）動詞直接去掉字尾「る」，加上「て」。",
      };
    }
    if (form === "nai") {
      return {
        answer: `${stem}ない`,
        choices: uniqueChoices(`${stem}ない`, [`${stem}らない`, `${stem}わない`, `${stem}いない`]),
        rule: "二類（一段）動詞直接去掉字尾「る」，加上「ない」。",
      };
    }
    if (form === "potential") {
      return {
        answer: `${stem}られる`,
        choices: uniqueChoices(`${stem}られる`, [`${stem}える`, `${stem}ける`, `${stem}れるる`]),
        rule: "二類（一段）動詞去掉字尾「る」，加上「られる」。",
      };
    }
    return {
      answer: `${stem}た`,
      choices: uniqueChoices(`${stem}た`, [`${stem}った`, `${stem}んだ`, `${stem}いた`]),
      rule: "二類（一段）動詞直接去掉字尾「る」，加上「た」。",
    };
  }

  // Godan verb rules
  const stem = dict.slice(0, -1);
  const last = dict.slice(-1);
  const isIku = dict === "行く" || rt === "いく" || dict.endsWith("行く");

  if (form === "te" || form === "ta") {
    const suffixT = form === "te" ? "て" : "た";
    const suffixD = form === "te" ? "で" : "だ";

    if (isIku) {
      const ans = `${stem}っ${suffixT}`;
      return {
        answer: ans,
        choices: uniqueChoices(ans, [`${stem}い${suffixT}`, `${stem}ん${suffixD}`, `${stem}し${suffixT}`]),
        rule: `「行く」是五段動詞唯一例外：字尾「く」不變成「い${suffixT}」，而是促音便「っ${suffixT}」。`,
      };
    }
    if (last === "う" || last === "つ" || last === "る") {
      const ans = `${stem}っ${suffixT}`;
      return {
        answer: ans,
        choices: uniqueChoices(ans, [`${stem}い${suffixT}`, `${stem}ん${suffixD}`, `${stem}${suffixT}`]),
        rule: `五段字尾「う・つ・る」發生促音便，變為「っ${suffixT}」。`,
      };
    }
    if (last === "む" || last === "ぶ" || last === "ぬ") {
      const ans = `${stem}ん${suffixD}`;
      return {
        answer: ans,
        choices: uniqueChoices(ans, [`${stem}っ${suffixT}`, `${stem}い${suffixT}`, `${stem}${suffixT}`]),
        rule: `五段字尾「む・ぶ・ぬ」發生撥音便，變為「ん${suffixD}」。`,
      };
    }
    if (last === "く") {
      const ans = `${stem}い${suffixT}`;
      return {
        answer: ans,
        choices: uniqueChoices(ans, [`${stem}っ${suffixT}`, `${stem}い${suffixD}`, `${stem}し${suffixT}`]),
        rule: `五段字尾「く」發生い音便，變為「い${suffixT}」。`,
      };
    }
    if (last === "ぐ") {
      const ans = `${stem}い${suffixD}`;
      return {
        answer: ans,
        choices: uniqueChoices(ans, [`${stem}い${suffixT}`, `${stem}っ${suffixT}`, `${stem}ん${suffixD}`]),
        rule: `五段字尾「ぐ」發生濁音い音便，變為「い${suffixD}」。`,
      };
    }
    // す
    const ans = `${stem}し${suffixT}`;
    return {
      answer: ans,
      choices: uniqueChoices(ans, [`${stem}っ${suffixT}`, `${stem}い${suffixT}`, `${stem}ん${suffixD}`]),
      rule: `五段字尾「す」直接變為「し${suffixT}」。`,
    };
  }

  if (form === "nai") {
    const aKana = GODAN_A[last] ?? "わ";
    const ans = `${stem}${aKana}ない`;
    const distractors =
      last === "う"
        ? [`${stem}あない`, `${stem}いない`, `${stem}らない`]
        : [`${stem}ない`, `${stem}わない`, `${stem}${GODAN_E[last] ?? "え"}ない`];
    return {
      answer: ans,
      choices: uniqueChoices(ans, distractors),
      rule:
        last === "う"
          ? "五段字尾「う」變否定形時改為「わ」（而非「あ」）＋「ない」。"
          : `五段動詞將字尾「${last}」改為あ段「${aKana}」＋「ない」。`,
    };
  }

  // Potential
  const eKana = GODAN_E[last] ?? "え";
  const ans = `${stem}${eKana}る`;
  return {
    answer: ans,
    choices: uniqueChoices(ans, [`${stem}${GODAN_A[last] ?? "わ"}れる`, `${stem}られる`, `${dict}れる`]),
    rule: `五段動詞將字尾「${last}」改為え段「${eKana}」＋「る」。`,
  };
}

export function verbCountForLevel(level: LevelId | "ALL"): number {
  const all = getAllDrillVerbs();
  return level === "ALL" ? all.length : all.filter((v) => v.level === level).length;
}

export function generateConjugationQuestion(
  form: ConjugationForm,
  level: LevelId | "ALL",
  recentIds: readonly string[] = [],
): ConjugationQuestion | null {
  const all = getAllDrillVerbs();
  const pool = level === "ALL" ? all : all.filter((v) => v.level === level);
  if (pool.length === 0) return null;

  const recentSet = new Set(recentIds.slice(-15));
  const fresh = pool.filter((v) => !recentSet.has(v.id));
  const source = fresh.length > 0 ? fresh : pool;
  const picked = source[Math.floor(Math.random() * source.length)];
  const result = conjugateVerb(picked, form);

  return {
    id: picked.id,
    level: picked.level,
    dict: picked.dict,
    rt: picked.rt,
    group: picked.groupLabel,
    meaning: picked.meaning,
    form,
    answer: result.answer,
    choices: result.choices,
    rule: result.rule,
  };
}
