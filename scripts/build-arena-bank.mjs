import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { N5_ITEMS } from './arena-v2-n5.mjs';
import { N4_ITEMS } from './arena-v2-n4.mjs';
import { N3_ITEMS } from './arena-v2-n3.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.resolve(__dirname, '../data/grammar/arena-bank.json');
const BATCH_DIR = path.resolve(__dirname, 'arena-batches');

const batchItems = [];
if (fs.existsSync(BATCH_DIR)) {
  const files = fs.readdirSync(BATCH_DIR).filter((f) => f.endsWith('.json')).sort();
  for (const fn of files) {
    const data = JSON.parse(fs.readFileSync(path.join(BATCH_DIR, fn), 'utf8'));
    if (Array.isArray(data)) batchItems.push(...data);
  }
}

const allItems = [...N5_ITEMS, ...N4_ITEMS, ...N3_ITEMS, ...batchItems];

const counts = {};
for (const item of allItems) {
  counts[item.groupId] = (counts[item.groupId] || 0) + 1;
}

fs.writeFileSync(OUT_PATH, JSON.stringify(allItems, null, 2) + '\n', 'utf8');

console.log(`Wrote ${allItems.length} Arena v2 items across ${Object.keys(counts).length} groups (${batchItems.length} from arena-batches/)`);
for (const [gid, count] of Object.entries(counts)) {
  console.log(`  ${gid.padEnd(24)} ${count}`);
}
