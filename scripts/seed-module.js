/**
 * Backfill: assigns a synthetic `module` value to historical
 * sentiment_entries that predate the Module field.
 *
 * Only entries with NO `module` key are touched. Submissions from the
 * current Pulse form always write the key (a string or null), so a real
 * user who skipped the Module dropdown is left untouched.
 *
 * Requires a Firebase service account key (bypasses security rules —
 * sentiment_entries has `allow update: if false`).
 *
 * Run from the project root:
 *   SERVICE_ACCOUNT=/path/to/key.json node scripts/seed-module.js
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const keyPath = process.env.SERVICE_ACCOUNT;
if (!keyPath) {
  console.error('ERROR: Set SERVICE_ACCOUNT=/path/to/service-account.json');
  process.exit(1);
}

const serviceAccount = require(keyPath);
const admin = require('firebase-admin');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// Weighted distribution — a flat 20%-each split looks inert in the
// dashboard, so this gives a realistic-looking spread. Still random.
const MODULE_WEIGHTS = [
  ['Demand',    0.35],
  ['ESP',       0.25],
  ['MEIO',      0.15],
  ['Analytics', 0.15],
  ['Other',     0.10],
];

function randomModule() {
  const r = Math.random();
  let acc = 0;
  for (const [name, weight] of MODULE_WEIGHTS) {
    acc += weight;
    if (r < acc) return name;
  }
  return MODULE_WEIGHTS[MODULE_WEIGHTS.length - 1][0];
}

async function seed() {
  const snap = await db.collection('sentiment_entries').get();
  const toBackfill = snap.docs.filter((d) => !('module' in d.data()));

  console.log(`Total entries: ${snap.size}. Missing module: ${toBackfill.length}.`);

  if (toBackfill.length === 0) {
    console.log('Nothing to backfill.');
    process.exit(0);
  }

  let batch = db.batch();
  let count = 0;
  const tally = {};

  for (const d of toBackfill) {
    const m = randomModule();
    tally[m] = (tally[m] || 0) + 1;
    batch.update(d.ref, { module: m });
    count++;
    if (count % 499 === 0) {
      await batch.commit();
      console.log(`  … committed batch, ${count} updated so far`);
      batch = db.batch();
    }
  }

  if (count % 499 !== 0) await batch.commit();

  console.log(`Done — backfilled ${count} entries.`);
  console.log('Distribution:', tally);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
