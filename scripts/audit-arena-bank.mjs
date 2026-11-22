/**
 * Automated Build-Time Psychometric & Linguistic QA Gate for data/grammar/arena-bank.json (v2)
 * Usage: node scripts/audit-arena-bank.mjs
 * Exits with code 1 on any Hard Error; logs Soft Warnings without failing.
 */
import fs from "node:fs";
import path from "node:path";

const GROUP_META = {
  "n5-particles": { keys: ["は", "が", "に", "で", "を"] },
  "n5-movement": { keys: ["を", "に", "で"] },
  "n5-nominal-particles": { keys: ["への", "での", "からの"] },
  "n4-conditionals": { keys: ["と", "ば", "たら", "なら"], reqChoices: true },
  "n4-aux-state": { keys: ["ておく", "てある", "ている", "てしまう"] },
  "n4-aux-dir": { keys: ["てみる", "ていく", "てくる", "てしまう"] },
  "n4-appearance-simile": { keys: ["そうだ[様態]", "ようだ", "みたいだ"], reqChoices: true },
  "n4-hearsay-inference": { keys: ["そうだ[伝聞]", "らしい", "ようだ"] },
  "n3-purpose": { keys: ["ために", "ように"] },
  "n3-decisions-rules": { keys: ["ことにする", "ことにしている", "ことになる", "ことになっている"] },
  "n3-cause-effect": { keys: ["おかげで", "せいで", "せいか", "ばかりに"] },
  "n3-concession": { keys: ["のに", "くせに", "わりに", "といっても"] },
  "n3-time-span": { keys: ["うちに", "あいだに", "あいだ"] },
  "n3-moment-final": { keys: ["たばかり", "たところ", "ているところ", "辞書形＋ところ"], reqChoices: true },
  "n3-moment-clause": { keys: ["たとたんに", "たところに", "たばかりに", "たせいで"] },
};

const bankPath = path.resolve("data/grammar/arena-bank.json");
const items = JSON.parse(fs.readFileSync(bankPath, "utf8"));

const hardErrors = [];
const softWarnings = [];

const seenIds = new Set();
const byGroup = new Map();

for (let i = 0; i < items.length; i += 1) {
  const it = items[i];
  const loc = `[#${i} ${it?.id ?? "NO_ID"}]`;

  // 1. Unique immutable ID
  if (!it?.id || !/^[a-z0-9-]+$/.test(it.id)) {
    hardErrors.push(`${loc} Invalid or missing id`);
  } else if (seenIds.has(it.id)) {
    hardErrors.push(`${loc} Duplicate id: ${it.id}`);
  } else {
    seenIds.add(it.id);
  }

  // 2. Valid group & choice wiring
  const meta = GROUP_META[it.groupId];
  if (!meta) {
    hardErrors.push(`${loc} Unknown groupId: ${it.groupId}`);
    continue;
  }
  if (!meta.keys.includes(it.grammarKey)) {
    hardErrors.push(`${loc} Invalid grammarKey '${it.grammarKey}' for ${it.groupId}`);
  }
  if (meta.reqChoices && (!Array.isArray(it.choices) || it.choices.length < 2)) {
    hardErrors.push(`${loc} Group ${it.groupId} requires per-question choices[]`);
  }
  if (Array.isArray(it.choices)) {
    if (!it.choices.includes(it.answer)) {
      hardErrors.push(`${loc} answer '${it.answer}' not found in choices ${JSON.stringify(it.choices)}`);
    }
    if (new Set(it.choices).size !== it.choices.length) {
      hardErrors.push(`${loc} Duplicate entries in choices ${JSON.stringify(it.choices)}`);
    }
  } else if (!meta.keys.includes(it.answer) && !it.answer) {
    hardErrors.push(`${loc} Missing answer`);
  }

  // 3. Reading & surface integrity
  const fullJa = `${it.before}${it.surface ?? it.answer}${it.after}`;
  const rd = it.reading ?? "";
  if (!rd) {
    hardErrors.push(`${loc} Missing reading`);
  }
  if (/[\u4e00-\u9faf々]/.test(rd)) {
    hardErrors.push(`${loc} Kanji leaked into reading: ${rd}`);
  }
  const jpPunct = (fullJa.match(/[。、！？]/g) ?? []).join("");
  const rdPunct = (rd.match(/[。、！？]/g) ?? []).join("");
  if (jpPunct !== rdPunct) {
    hardErrors.push(`${loc} Punctuation mismatch: jp='${jpPunct}' vs rd='${rdPunct}' in '${fullJa}'`);
  }
  const jpKata = (fullJa.match(/[\u30a1-\u30fc]{2,}/g) ?? []).join("|");
  const rdKata = (rd.match(/[\u30a1-\u30fc]{2,}/g) ?? []).join("|");
  if (jpKata !== rdKata) {
    hardErrors.push(`${loc} Katakana mismatch: jp='${jpKata}' vs rd='${rdKata}' in '${fullJa}'`);
  }
  // 3b. Kana-skeleton alignment (convert kanji/numeral runs to hiragana wildcards & match against reading)
  const skelPattern = fullJa
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/[\u4e00-\u9faf々ヶヵ0-9０-９]+/g, "[\u3041-\u3096ー]+");
  if (!new RegExp(`^${skelPattern}$`).test(rd)) {
    hardErrors.push(`${loc} Kana-skeleton mismatch: jp='${fullJa}' vs rd='${rd}'`);
  }
  // 3c. Boundary-duplication check (before suffix == answer prefix, or answer suffix == after prefix, len >= 2)
  const inserted = it.surface ?? it.answer ?? "";
  for (let len = 2; len <= Math.min(it.before.length, inserted.length); len += 1) {
    const seg = it.before.slice(-len);
    if (inserted.startsWith(seg)) {
      hardErrors.push(`${loc} Boundary duplication (before/answer '${seg}'): '${fullJa}'`);
      break;
    }
  }
  for (let len = 2; len <= Math.min(inserted.length, it.after.length); len += 1) {
    const seg = inserted.slice(-len);
    if (it.after.startsWith(seg)) {
      hardErrors.push(`${loc} Boundary duplication (answer/after '${seg}'): '${fullJa}'`);
      break;
    }
  }

  // 8. Linguistic & zh lint
  if (/^(弟は|姉は|友人は|先輩は)/.test(fullJa) && /(頭が痛い|目が疲れた|寒気が|ぼんやり|取りたい|気がする)/.test(fullJa)) {
    hardErrors.push(`${loc} 3rd-person internal sensation/desire violation: ${fullJa}`);
  }
  if (/^(弟は|姉は|友人は|先輩は)/.test(it.before) && /我/.test(it.zh)) {
    hardErrors.push(`${loc} 3rd-person Japanese paired with 1st-person '我' in zh: ${it.zh}`);
  }
  if (/先[^。！？]{0,12}先/.test(it.zh)) {
    hardErrors.push(`${loc} Duplicated '先' in zh: ${it.zh}`);
  }
  if (/あそこに、[^。]+に/.test(fullJa)) {
    hardErrors.push(`${loc} Double-locative あそこに…に: ${fullJa}`);
  }
  if (/んて(おく|みる|しまう|いく|くる)/.test(fullJa)) {
    hardErrors.push(`${loc} Unvoiced んて error: ${fullJa}`);
  }

  const list = byGroup.get(it.groupId) ?? [];
  list.push(it);
  byGroup.set(it.groupId, list);
}

// Per-group psychometric & clone checks
function trigramSet(str) {
  const clean = str.replace(/[。、！？\s]/g, "");
  const s = new Set();
  for (let i = 0; i <= clean.length - 3; i += 1) s.add(clean.slice(i, i + 3));
  return s;
}
function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / (a.size + b.size - inter);
}

for (const [gid, meta] of Object.entries(GROUP_META)) {
  const list = byGroup.get(gid) ?? [];
  if (list.length === 0) {
    hardErrors.push(`[${gid}] Group has 0 items`);
    continue;
  }

  // 4. Class balance: max / min <= 2.0
  const counts = {};
  for (const k of meta.keys) counts[k] = 0;
  for (const it of list) counts[it.grammarKey] = (counts[it.grammarKey] ?? 0) + 1;
  const vals = Object.values(counts);
  const minC = Math.min(...vals);
  const maxC = Math.max(...vals);
  if (minC === 0 || maxC / minC > 2.0) {
    hardErrors.push(`[${gid}] Class imbalance (max/min > 2.0): ${JSON.stringify(counts)}`);
  }

  // 5. Near-duplicate clones (>0.80 trigram Jaccard within same group)
  const sets = list.map((it) => trigramSet(`${it.before}${it.surface ?? it.answer}${it.after}`));
  for (let a = 0; a < list.length; a += 1) {
    for (let b = a + 1; b < list.length; b += 1) {
      const sim = jaccard(sets[a], sets[b]);
      if (sim > 0.80) {
        hardErrors.push(`[${gid}] Near-duplicate clone (${(sim * 100).toFixed(0)}%): ${list[a].id} vs ${list[b].id}`);
      }
    }
  }

  // 6. Structural & morphological giveaway check (>0.80 correlation with >=5 matches)
  const features = [
    ["after_comma", (it) => it.after.startsWith("、")],
    ["after_period", (it) => it.after === "。"],
    ["before_ta", (it) => /[ただ]$/.test(it.before)],
    ["before_re", (it) => /れ$/.test(it.before)],
    ["before_nai", (it) => /ない$/.test(it.before)],
    ["before_teiru", (it) => /ている$/.test(it.before)],
    ["before_no", (it) => /の$/.test(it.before)],
    ["before_na", (it) => /な$/.test(it.before)],
  ];
  for (const [fname, fn] of features) {
    const matched = list.filter(fn);
    if (matched.length < 5) continue;
    const dist = {};
    for (const it of matched) dist[it.grammarKey] = (dist[it.grammarKey] ?? 0) + 1;
    const [topKey, topCnt] = Object.entries(dist).sort((x, y) => y[1] - x[1])[0];
    const ratio = topCnt / matched.length;
    if (ratio > 0.80) {
      const msg = `[${gid}] Feature '${fname}' correlates ${(ratio * 100).toFixed(0)}% (${topCnt}/${matched.length}) with '${topKey}'`;
      if (gid === "n3-time-span" && fname === "before_nai" && topKey === "うちに") {
        softWarnings.push(msg + " (exempted intentional grammar rule)");
      } else {
        hardErrors.push(msg);
      }
    }
  }

  // 7. altAnswers ceiling <= 20%
  const altCount = list.filter((it) => it.altAnswers && Object.keys(it.altAnswers).length > 0).length;
  if (altCount / list.length > 0.20) {
    hardErrors.push(`[${gid}] altAnswers ratio ${(altCount / list.length * 100).toFixed(0)}% exceeds 20% cap`);
  }
}

console.log(`Audited ${items.length} Arena v2 items across ${byGroup.size}/15 groups.`);
if (softWarnings.length > 0) {
  console.log(`\nSOFT WARNINGS (${softWarnings.length}):`);
  for (const w of softWarnings) console.log("  WARN:", w);
}
if (hardErrors.length > 0) {
  console.error(`\nHARD ERRORS (${hardErrors.length}):`);
  for (const e of hardErrors.slice(0, 40)) console.error("  ERR:", e);
  process.exit(1);
}
console.log("PASS: 0 Hard Errors — Arena v2 bank cleared all psychometric & linguistic QA gates!");
