import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { N5_ITEMS } from './arena-v2-n5.mjs';
import { N4_ITEMS } from './arena-v2-n4.mjs';
import { N3_ITEMS } from './arena-v2-n3.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.resolve(__dirname, '../data/grammar/arena-bank.json');
const BATCH_DIR = path.resolve(__dirname, 'arena-batches');
const VOCAB_DIR = path.resolve(__dirname, '../data/vocab');

// Load JASPEZ's own bundled JLPT N5/N4/N3 vocab kanji & word sets for deterministic two-tier tagging
function loadVocabData(levelDir) {
  const kanji = new Set();
  const words = new Set();
  const dir = path.join(VOCAB_DIR, levelDir);
  if (!fs.existsSync(dir)) return { kanji, words };
  for (const fn of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, fn), 'utf8'));
    const list = Array.isArray(raw) ? raw : raw.items ?? raw.words ?? [];
    for (const w of list) {
      if (!w || typeof w !== 'object') continue;
      for (const field of ['jp', 'word', 'kanji', 'surface', 'term', 'text']) {
        const val = w[field];
        if (typeof val === 'string') {
          words.add(val);
          for (const ch of val) {
            if (ch >= '\u4e00' && ch <= '\u9fff') kanji.add(ch);
          }
        }
      }
    }
  }
  return { kanji, words };
}

const V5 = loadVocabData('n5');
const V4 = loadVocabData('n4');
const V3 = loadVocabData('n3');

const EXTRA_N5_KANJI = [...'東京兄住冷階七八公園初朝夕方着登泳休日曜毎船海鳥空飛渡曲暗広静撮台所昼晩洗消開閉電気窓痛寺音聞紙座町茶冊円万飯魚肉卵犬猫花雨雪風夏冬春秋山川道橋駅店家室校生先友母父姉弟妹子人男女名前後上下中外右左北南西大小新古高安長短白黒赤青好多小早遅近遠暑寒明楽忙暇送活間九五一七万中乗二五京休作八公円冊冷出十友喫園夕夜好家寝少店座待新方日時書朝末本母毎泳海犬痛目着緒茶行記語買走起週都階駅'];
const N5_KANJI = new Set([...V5.kanji, ...EXTRA_N5_KANJI]);
const N4_KANJI = new Set([...N5_KANJI, ...V4.kanji, ...'忘資料']);
const N3_KANJI = new Set([...N4_KANJI, ...V3.kanji]);

const N5_WORDS = new Set([
  ...V5.words,
  '図書館', '大学生', '飛行機', '新幹線', '映画館', '郵便局', '動物園', '美術館',
  '地下鉄', '日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日',
  '一年生', '二年生', '三年生', '運動会', '体育館', '駐車場', '喫茶店', '食べ物', '飲み物', '買い物', '毎朝七時', '夜十時', '二万円', '二冊買', '朝八時', '夕方五時', '朝九時', '一時間', '忘れ物',
]);
const N4_WORDS = new Set([...N5_WORDS, ...V4.words, '一時間', '忘れ物', '資料']);

const N4_PLUS_GRAMMAR_RE =
  /(られ|され|させ|ために|に向けて|ておく|ておいた|ておきます|ておきました|てしまう|てしまった|てしまいました|なければなら|なくてもいい|ことができる|のに|せいで|せいか|おかげで|ばかり|わけだ|はずだ|べきだ|ように|ので|たら|てくる|てきた|てきます|てきました|ていく|ていった|ていきます|ていきました|やすい|にくい|てくれる|てくれます|てくれた|てあげる|てあげます|てもらう|てもらいます|まま|[うくぐすつぬぶむる]と[、，]|(渡る|曲がる|終わる|なる|飲む)と)/;

const N3_PLUS_GRAMMAR_RE =
  /(うちに|せいで|せいか|おかげで|たばかり|につれて|に向けて|だらけ|によって|たところ|ごとに|ばかり)/;

const N2_PLUS_GRAMMAR_RE =
  /(につれて|どころか|ものの)/;

const ADV_COMPOUND_N5_RE =
  /(企画|修正|絶品|書庫|返却|返品|完売|係員|食券|入部|視野|遠慮|旅客|税関|搭乗|本堂|縁日|足早|駅舎|処方|診察|避難|住民|対岸|取引|締切|面接|採用|契約|申請|提出|承認|抜擢|老舗|社外|履修|実務|拡張|水墨|金木|飴細|一眼レフ|野鳥|機内|石段|日当たり|風通し|お得|通勤|下書き|名物)/;

const ADV_COMPOUND_N4_RE =
  /(抜擢|老舗|処方|社外|履修|実務|絶品|書庫|返却|完売|税関|搭乗|本堂|縁日|足早|駅舎|避難|対岸|配属|選考|拡張子|水墨画|金木犀|飴細工|曾祖父|調剤薬局|重要文化財)/;

const KANJI_3PLUS_RE = /[\u4e00-\u9fff]{3,}/g;

function hasOutOfLevel3Kanji(text, allowedWords) {
  const matches = text.match(KANJI_3PLUS_RE);
  if (!matches) return false;
  for (const m of matches) {
    if (!allowedWords.has(m)) return true;
  }
  return false;
}

function computeTier(item) {
  if (item.tierOverride === 'core' || item.tierOverride === 'extended') {
    return item.tierOverride;
  }
  const lv = item.groupId.split('-')[0].toUpperCase();
  const full = `${item.before}${item.surface ?? item.answer}${item.after}`;
  const carrier = `${item.before}${item.after}`;
  const allowed = lv === 'N5' ? N5_KANJI : lv === 'N4' ? N4_KANJI : N3_KANJI;
  const uniqueKanji = new Set([...full].filter((ch) => ch >= '\u4e00' && ch <= '\u9fff'));
  let outOfLevel = 0;
  for (const k of uniqueKanji) {
    if (!allowed.has(k)) outOfLevel += 1;
  }
  const len = full.length;
  if (lv === 'N5') {
    const hasGramLeak = N4_PLUS_GRAMMAR_RE.test(carrier);
    const hasAdv = ADV_COMPOUND_N5_RE.test(full) || hasOutOfLevel3Kanji(full, N5_WORDS);
    return len <= 24 && outOfLevel === 0 && !hasGramLeak && !hasAdv ? 'core' : 'extended';
  }
  if (lv === 'N4') {
    const hasGramLeak = N3_PLUS_GRAMMAR_RE.test(carrier) || /ば.*ほど/.test(full);
    const hasAdv = ADV_COMPOUND_N4_RE.test(full) || hasOutOfLevel3Kanji(full, N4_WORDS);
    return len <= 34 && outOfLevel <= 1 && !hasGramLeak && !hasAdv ? 'core' : 'extended';
  }
  const hasGramLeak = N2_PLUS_GRAMMAR_RE.test(carrier);
  return len <= 40 && outOfLevel <= 2 && !hasGramLeak ? 'core' : 'extended';
}

const batchItems = [];
if (fs.existsSync(BATCH_DIR)) {
  const files = fs.readdirSync(BATCH_DIR).filter((f) => f.endsWith('.json')).sort();
  for (const fn of files) {
    const data = JSON.parse(fs.readFileSync(path.join(BATCH_DIR, fn), 'utf8'));
    if (Array.isArray(data)) batchItems.push(...data);
  }
}

const allItems = [...N5_ITEMS, ...N4_ITEMS, ...N3_ITEMS, ...batchItems].map((item) => ({
  ...item,
  tier: computeTier(item),
}));

const counts = {};
const coreCounts = {};
for (const item of allItems) {
  counts[item.groupId] = (counts[item.groupId] || 0) + 1;
  if (item.tier === 'core') {
    coreCounts[item.groupId] = (coreCounts[item.groupId] || 0) + 1;
  }
}

const totalCore = Object.values(coreCounts).reduce((a, b) => a + b, 0);
fs.writeFileSync(OUT_PATH, JSON.stringify(allItems, null, 2) + '\n', 'utf8');

console.log(
  `Wrote ${allItems.length} Arena v2 items across ${Object.keys(counts).length} groups (${totalCore} core + ${allItems.length - totalCore} extended; ${batchItems.length} from arena-batches/)`,
);
for (const [gid, count] of Object.entries(counts)) {
  const c = coreCounts[gid] || 0;
  console.log(`  ${gid.padEnd(24)} total=${String(count).padStart(3)}  core=${String(c).padStart(3)}  ext=${String(count - c).padStart(3)}`);
}
