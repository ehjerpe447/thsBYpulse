/**
 * One-off migration: maps legacy idea status values to the new lifecycle.
 *   queue   → under_review
 *   roadmap → planned
 * Any idea with a missing or unrecognized status is set to under_review.
 *
 * Uses the Admin SDK.
 *
 * Run from the project root:
 *   SERVICE_ACCOUNT=/path/to/key.json node scripts/migrate-idea-status.js
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

const LEGACY_MAP = { queue: 'under_review', roadmap: 'planned' };
const VALID = ['under_review', 'planned', 'in_progress', 'shipped', 'declined'];

async function migrate() {
  const snap = await db.collection('feature_requests').get();
  const batch = db.batch();
  const tally = {};
  let changed = 0;

  for (const d of snap.docs) {
    const cur = d.data().status;
    let next = null;
    if (LEGACY_MAP[cur]) next = LEGACY_MAP[cur];
    else if (!VALID.includes(cur)) next = 'under_review';

    if (next) {
      batch.update(d.ref, { status: next });
      tally[`${cur ?? '(none)'} → ${next}`] = (tally[`${cur ?? '(none)'} → ${next}`] || 0) + 1;
      changed++;
    }
  }

  console.log(`Total ideas: ${snap.size}. Status values updated: ${changed}.`);

  if (changed === 0) {
    console.log('Nothing to migrate.');
    process.exit(0);
  }

  await batch.commit();
  console.log('Mapping applied:', tally);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
