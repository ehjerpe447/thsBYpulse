/**
 * One-time migration: reassign location "Naperville, IL" → "Oak Brook, IL"
 * in the sentiment_entries collection.
 *
 * Requires a Firebase service account key (bypasses security rules).
 *
 * Run from the project root:
 *   SERVICE_ACCOUNT=/path/to/key.json node scripts/migrate-naperville.js
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const path = process.env.SERVICE_ACCOUNT;
if (!path) {
  console.error('ERROR: Set SERVICE_ACCOUNT=/path/to/service-account.json');
  process.exit(1);
}

const serviceAccount = require(path);
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function migrate() {
  const snap = await db.collection('sentiment_entries').get();
  const toMigrate = snap.docs.filter((d) => d.data().location === 'Naperville, IL');

  console.log(`Total entries: ${snap.size}. Naperville entries to migrate: ${toMigrate.length}.`);

  if (toMigrate.length === 0) {
    console.log('Nothing to migrate.');
    process.exit(0);
  }

  let batch = db.batch();
  let count = 0;

  for (const d of toMigrate) {
    batch.update(d.ref, { location: 'Oak Brook, IL' });
    count++;
    if (count % 499 === 0) {
      await batch.commit();
      console.log(`  … committed batch, ${count} updated so far`);
      batch = db.batch();
    }
  }

  if (count % 499 !== 0) await batch.commit();

  console.log(`Done — migrated ${count} entries from Naperville, IL → Oak Brook, IL.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
