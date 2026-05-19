/**
 * Backfill: assigns a `module` tag to feature_requests that lack one,
 * inferred from the idea title. Ideas that don't map cleanly to a single
 * module fall back to "Other" (e.g. cross-functional S&OP work).
 *
 * Uses the Admin SDK. Only ideas without a module are touched.
 *
 * Run from the project root:
 *   SERVICE_ACCOUNT=/path/to/key.json node scripts/backfill-idea-modules.js
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

// Title keyword → module. Order matters; first match wins.
function moduleForTitle(title) {
  const t = (title || '').toLowerCase();
  if (/safety stock|multi-echelon|multi echelon|obsolesc|slow.?mover|inventory/.test(t)) return 'MEIO';
  if (/forecast|demand signal|\bpos\b|consensus|downstream/.test(t)) return 'Demand';
  if (/supplier|lead time|purchase|\bpo\b|replenish|\bmrp\b|exception|net requirement/.test(t)) return 'ESP';
  if (/dashboard|report|analytic|\bkpi\b|metric|insight/.test(t)) return 'Analytics';
  return 'Other';
}

async function backfill() {
  const snap = await db.collection('feature_requests').get();
  const toTag = snap.docs.filter((d) => !d.data().module);

  console.log(`Total ideas: ${snap.size}. Missing a module: ${toTag.length}.`);

  if (toTag.length === 0) {
    console.log('Nothing to backfill.');
    process.exit(0);
  }

  let batch = db.batch();
  let batched = 0;
  const tally = {};

  for (const d of toTag) {
    const title = d.data().title || '(untitled)';
    const m = moduleForTitle(title);
    tally[m] = (tally[m] || 0) + 1;
    batch.update(d.ref, { module: m });
    console.log(`  ${m.padEnd(10)} ← ${title}`);
    batched++;
    // Firestore caps a batch at 500 ops — flush and start fresh at 499.
    if (batched % 499 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  if (batched % 499 !== 0) await batch.commit();

  console.log(`\nDone — tagged ${toTag.length} ideas.`);
  console.log('Distribution:', tally);
  process.exit(0);
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
