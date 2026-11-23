/**
 * Automated Build-Time Psychometric & Linguistic QA Gate for data/grammar/arena-bank.json (v2)
 * Usage: node scripts/audit-arena-bank.mjs
 * Exits with code 1 on any Hard Error; logs Soft Warnings without failing.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  "n4-giving-receiving": { keys: ["てあげる", "てくれる", "てもらう"], reqChoices: true },
  "n4-voice": { keys: ["受身", "使役", "使役受身"], reqChoices: true },
  "n3-wake": { keys: ["わけだ", "わけではない", "わけがない", "わけにはいかない"] },
  "n3-certainty": { keys: ["はずだ", "べきだ", "にちがいない", "かもしれない"], reqChoices: true },
  "n3-recurring": { keys: ["たびに", "ごとに", "おきに"], reqChoices: true },
  "n3-limits": { keys: ["だけ", "しか", "ばかり"] },
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

  // 7b. Orphaned distractorNotes / altAnswers keys & schema contract uniformity
  let withChoices = 0;
  let withoutChoices = 0;
  for (const it of list) {
    const hasCh = Array.isArray(it.choices) && it.choices.length > 0;
    if (hasCh) withChoices += 1;
    else withoutChoices += 1;
    const validOpts = new Set(hasCh ? it.choices : meta.keys);
    for (const k of Object.keys(it.distractorNotes ?? {})) {
      if (!validOpts.has(k) || k === it.answer) {
        hardErrors.push(`[${gid} ${it.id}] Orphaned/invalid distractorNotes key '${k}'`);
      }
      if (it.altAnswers && k in it.altAnswers) {
        hardErrors.push(`[${gid} ${it.id}] Key '${k}' appears in both altAnswers and distractorNotes`);
      }
    }
    for (const k of Object.keys(it.altAnswers ?? {})) {
      if (!validOpts.has(k) || k === it.answer) {
        hardErrors.push(`[${gid} ${it.id}] Orphaned/invalid altAnswers key '${k}'`);
      }
    }
  }
  if (withChoices > 0 && withoutChoices > 0) {
    hardErrors.push(`[${gid}] Mixed choices contract: ${withChoices} with choices vs ${withoutChoices} without choices`);
  }

  // 7c. Canonical choice pattern check (prevent cross-group distractor leaks)
  const CANONICAL_CHOICE_RE = {
    'n3-certainty': /(はずだ|はずでした|はずです|べきだ|べきです|にちがいない|にちがいありません|かもしれない|かもしれません)$/,
    'n3-moment-clause': /(たとたんに|だとたんに|たところに|だところに|たばかりに|だばかりに|たせいで|だせいで)$/,
    'n3-recurring': /(たびに|ごとに|おきに)$/,
    'n3-moment-final': /(たばかり|だばかり|たところ|だところ|ているところ|でいるところ|ところ)$/,
    'n4-appearance-simile': /(そう(だ|です|な|に|で|だった)?|よう(だ|です|な|に|で|だった)?|みたい(だ|です|な|に|で|だった)?)$/,
    'n4-hearsay-inference': /(そう(だ|です|だった|な|に)?|らし(い|いです|かった|く|くて)|よう(だ|です|だった|な|に)?)$/,
  };
  if (CANONICAL_CHOICE_RE[gid]) {
    const re = CANONICAL_CHOICE_RE[gid];
    for (const it of list) {
      for (const ch of (it.choices ?? [])) {
        if (!re.test(ch)) {
          hardErrors.push(`[${gid} ${it.id}] Cross-group leaked choice '${ch}'`);
        }
      }
    }
  }

  // 7d. Morphology gates (reject invalid べきだ, bare noun+はずだ / ようで)
  for (const it of list) {
    for (const ch of (it.choices ?? [])) {
      if (/べき(だ|です)$/.test(ch)) {
        if (/(ない|た|だ|い|な)べき(だ|です)$/.test(ch) || !/[うくぐすつぬぶむる]べき(だ|です)$/.test(ch)) {
          hardErrors.push(`[${gid} ${it.id}] Invalid べきだ morphology '${ch}'`);
        }
      }
      if (/[\u4e00-\u9fff\u30a0-\u30ff]はず(だ|です)$/.test(ch)) {
        hardErrors.push(`[${gid} ${it.id}] Bare noun/katakana + はずだ without の/な '${ch}'`);
      }
      if (gid === 'n4-appearance-simile' && /[\u4e00-\u9fff\u30a0-\u30ff]よう(だ|で|な)$/.test(ch)) {
        hardErrors.push(`[${gid} ${it.id}] Bare noun + ようだ/で/な without の '${ch}'`);
      }
      if (gid === 'n4-appearance-simile' && it.grammarKey === 'みたいだ' && ch.endsWith('ようだ') && !ch.endsWith('のようだ') && !ch.endsWith('なようだ') && !/[ただいうくぐすつぬぶむる]ようだ$/.test(ch)) {
        hardErrors.push(`[${gid} ${it.id}] Bare noun + ようだ without の '${ch}'`);
      }
      if (/[\u4e00-\u9fff\u30a0-\u30ff]ようで$/.test(ch)) {
        hardErrors.push(`[${gid} ${it.id}] Bare noun/katakana + ようで without の '${ch}'`);
      }
    }
  }

  // 7e. n3-limits case-particle alignment before しか
  if (gid === 'n3-limits') {
    for (const it of list) {
      if (it.grammarKey === 'しか' && /(で|に|から)しか/.test(it.reading)) {
        const m = it.reading.match(/(で|に|から)しか/);
        if (m && !it.before.endsWith(m[1])) {
          hardErrors.push(`[${gid} ${it.id}] Missing case particle '${m[1]}' before しか in before='${it.before}'`);
        }
      }
    }
  }

  // 7. altAnswers ceiling <= 20%
  const altCount = list.filter((it) => it.altAnswers && Object.keys(it.altAnswers).length > 0).length;
  if (altCount / list.length > 0.20) {
    hardErrors.push(`[${gid}] altAnswers ratio ${(altCount / list.length * 100).toFixed(0)}% exceeds 20% cap`);
  }
}

// 7b. Syntax, collocation & data-corruption lint gates
for (const item of items) {
  const full = `${item.before}${item.surface ?? item.answer}${item.after}`;
  if (/(子供|子ども|テスト前|学生|大人|初心者|素人)なくせに/.test(full)) {
    hardErrors.push(`[${item.groupId} ${item.id}] Ungrammatical 名詞+なくせに in '${full}' (must use のくせに)`);
  }
  if (/きっと.*かもしれない/.test(full)) {
    hardErrors.push(`[${item.groupId} ${item.id}] Adverb-modality clash きっと〜かもしれない in '${full}'`);
  }
  if (/Wait fix|TODO|FIXME/i.test(`${item.zh || ""} ${item.tip || ""} ${item.reading || ""}`)) {
    hardErrors.push(`[${item.groupId} ${item.id}] Corrupted placeholder text detected in metadata`);
  }
}

// 8. Two-tier level-fit guardrails (verify every group & key has healthy core pool, and core items obey ceilings)
const VOCAB_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/vocab');
function loadKanjiSet(lvDir) {
  const s = new Set();
  const d = path.join(VOCAB_DIR, lvDir);
  if (!fs.existsSync(d)) return s;
  for (const fn of fs.readdirSync(d).filter((f) => f.endsWith('.json'))) {
    const raw = JSON.parse(fs.readFileSync(path.join(d, fn), 'utf8'));
    const arr = Array.isArray(raw) ? raw : raw.items ?? raw.words ?? [];
    for (const w of arr) {
      if (!w || typeof w !== 'object') continue;
      for (const f of ['jp', 'word', 'kanji', 'surface', 'term', 'text']) {
        if (typeof w[f] === 'string') {
          for (const ch of w[f]) if (ch >= '\u4e00' && ch <= '\u9fff') s.add(ch);
        }
      }
    }
  }
  return s;
}
const EXTRA_N5_KANJI = [...'東京兄住冷階七八公園初朝夕方着登泳休日曜毎船海鳥空飛渡曲暗広静撮台所昼晩洗消開閉電気窓痛寺音聞紙座町茶冊円万飯魚肉卵犬猫花雨雪風夏冬春秋山川道橋駅店家室校生先友母父姉弟妹子人男女名前後上下中外右左北南西大小新古高安長短白黒赤青好多小早遅近遠暑寒明楽忙暇送活間九五一七万中乗二五京休作八公円冊冷出十友喫園夕夜好家寝少店座待新方日時書朝末本母毎泳海犬痛目着緒茶行記語買走起週都階駅'];
const VK_N5 = new Set([...loadKanjiSet('n5'), ...EXTRA_N5_KANJI]);
const VK_N4 = new Set([...VK_N5, ...loadKanjiSet('n4'), ...'忘資料']);
const VK_N3 = new Set([...VK_N4, ...loadKanjiSet('n3')]);
const N4_LEAK_RE = /(られ|され|させ|ために|に向けて|ておく|ておいた|ておきます|ておきました|てしまう|てしまった|てしまいました|なければなら|なくてもいい|ことができる|のに|せいで|せいか|おかげで|ばかり|わけだ|はずだ|べきだ|ように|ので|たら|てくる|てきた|てきます|てきました|ていく|ていった|ていきます|ていきました|やすい|にくい|てくれる|てくれます|てくれた|てあげる|てあげます|てもらう|てもらいます|まま|[うくぐすつぬぶむる]と[、，]|(渡る|曲がる|終わる|なる|飲む)と)/;
const N3_LEAK_RE = /(うちに|せいで|せいか|おかげで|たばかり|につれて|に向けて|だらけ|によって|たところ|ごとに|ばかり)/;
const N2_LEAK_RE = /(につれて|どころか|ものの)/;

for (const [gid, list] of byGroup.entries()) {
  const meta = GROUP_META[gid];
  const lv = gid.split('-')[0].toUpperCase();
  const allowed = lv === 'N5' ? VK_N5 : lv === 'N4' ? VK_N4 : VK_N3;
  const maxLen = lv === 'N5' ? 24 : lv === 'N4' ? 34 : 40;
  const maxOut = lv === 'N5' ? 0 : lv === 'N4' ? 1 : 2;
  const coreByKey = Object.fromEntries(meta.keys.map((k) => [k, 0]));
  for (const it of list) {
    if (it.tier !== 'core' && it.tier !== 'extended') {
      hardErrors.push(`[${gid} ${it.id}] Missing/invalid tier '${it.tier}'`);
      continue;
    }
    if (it.tier === 'core') {
      coreByKey[it.grammarKey] = (coreByKey[it.grammarKey] ?? 0) + 1;
      const full = `${it.before}${it.surface ?? it.answer}${it.after}`;
      const uniqK = new Set([...full].filter((ch) => ch >= '\u4e00' && ch <= '\u9fff'));
      let outK = 0;
      for (const k of uniqK) if (!allowed.has(k)) outK += 1;
      if (full.length > maxLen) hardErrors.push(`[${gid} ${it.id}] Core item exceeds ${maxLen} chars (${full.length})`);
      if (outK > maxOut) hardErrors.push(`[${gid} ${it.id}] Core item has ${outK} out-of-level kanji (max ${maxOut})`);
      if (!it.tierOverride) {
        const carrier = `${it.before}${it.after}`;
        if (lv === 'N5' && N4_LEAK_RE.test(carrier)) {
          hardErrors.push(`[${gid} ${it.id}] Core N5 item embeds N4+ grammar`);
        }
        if (lv === 'N4' && (N3_LEAK_RE.test(carrier) || /ば.*ほど/.test(full))) {
          hardErrors.push(`[${gid} ${it.id}] Core N4 item embeds N3+ grammar`);
        }
        if (lv === 'N3' && N2_LEAK_RE.test(carrier)) {
          hardErrors.push(`[${gid} ${it.id}] Core N3 item embeds N2+ grammar`);
        }
      }
    }
  }
  const minCoreKey = Math.min(...Object.values(coreByKey));
  if (minCoreKey < 5) {
    hardErrors.push(`[${gid}] Thin core pool (min key=${minCoreKey} < 5): ${JSON.stringify(coreByKey)}`);
  }
}

console.log(`Audited ${items.length} Arena v2 items across ${byGroup.size}/21 groups.`);
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
