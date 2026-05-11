/**
 * One-time migration: reassign location "Naperville, IL" → "Oak Brook, IL"
 * in the sentiment_entries collection.
 *
 * Run from the project root:
 *   node scripts/migrate-naperville.js
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { config } from 'dotenv';

config();

const firebaseConfig = {
  apiKey:            process.env.VITE_FIREBASE_API_KEY,
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.VITE_FIREBASE_APP_ID,
};

if (!process.env.VITE_FIREBASE_PROJECT_ID) {
  console.error('ERROR: VITE_FIREBASE_PROJECT_ID not set. Check your .env file.');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

async function migrate() {
  const snap = await getDocs(
    query(
      collection(db, 'sentiment_entries'),
      where('location', '==', 'Naperville, IL'),
    ),
  );

  if (snap.empty) {
    console.log('No Naperville, IL entries found — nothing to migrate.');
    process.exit(0);
  }

  console.log(`Found ${snap.size} entries to migrate…`);

  // Firestore batch limit: 500 ops
  let batch = writeBatch(db);
  let count = 0;

  for (const d of snap.docs) {
    batch.update(doc(db, 'sentiment_entries', d.id), { location: 'Oak Brook, IL' });
    count++;
    if (count % 499 === 0) {
      await batch.commit();
      console.log(`  … committed batch, ${count} updated so far`);
      batch = writeBatch(db);
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
