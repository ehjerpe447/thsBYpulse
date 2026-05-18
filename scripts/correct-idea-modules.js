/**
 * One-off correction: overrides the module tag on specific ideas whose
 * title-keyword heuristic (backfill-idea-modules.js) needed a manual fix.
 *
 * Uses the Admin SDK.
 *
 * Run from the project root:
 *   SERVICE_ACCOUNT=/path/to/key.json node scripts/correct-idea-modules.js
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

// Title substring (lowercased) → corrected module.
const CORRECTIONS = [
  { match: 'supercession in demand planning',          module: 'Demand' },
  { match: 'transition management on the supply side', module: 'ESP' },
];

async function correct() {
  const snap = await db.collection('feature_requests').get();
  const batch = db.batch();
  let applied = 0;

  for (const d of snap.docs) {
    const title = (d.data().title || '').toLowerCase();
    const fix = CORRECTIONS.find((c) => title.includes(c.match));
    if (fix) {
      batch.update(d.ref, { module: fix.module });
      console.log(`  ${fix.module.padEnd(10)} ← ${d.data().title}`);
      applied++;
    }
  }

  if (applied === 0) {
    console.log('No matching ideas found — nothing to correct.');
    process.exit(0);
  }

  await batch.commit();
  console.log(`\nDone — corrected ${applied} idea(s).`);
  process.exit(0);
}

correct().catch((err) => {
  console.error('Correction failed:', err);
  process.exit(1);
});
