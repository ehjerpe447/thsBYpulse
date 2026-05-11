/**
 * Seed script: populates ~3 months of synthetic Daily Pulse data.
 *
 * Sentiment arc:
 *   Month 1 (oldest) — neutral, mean ≈ 3.0, gradually softening
 *   Month 2          — unfavorable trough, mean ≈ 2.0–2.3
 *   Month 3 (recent) — recovering, mean ≈ 3.4 by the end
 *
 * Run from the project root:
 *   node scripts/seed-pulse.js
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { config } from 'dotenv';

config(); // load .env

const firebaseConfig = {
  apiKey:            process.env.VITE_FIREBASE_API_KEY,
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.VITE_FIREBASE_APP_ID,
};

if (!process.env.VITE_FIREBASE_PROJECT_ID) {
  console.error('ERROR: VITE_FIREBASE_PROJECT_ID is not set. Copy .env.example → .env and fill in your config.');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── Sentiment arc ─────────────────────────────────────────────────────────────
// progress: 0 = three months ago, 1 = today
function targetMean(progress) {
  if (progress < 0.33) {
    // Month 1: neutral (3.0) declining toward 2.5
    return 3.0 - (progress / 0.33) * 0.5;
  } else if (progress < 0.67) {
    // Month 2: trough bottoming out at 2.0
    const p = (progress - 0.33) / 0.34;
    return 2.5 - p * 0.5;
  } else {
    // Month 3: recovering to slightly favorable (3.4)
    const p = (progress - 0.67) / 0.33;
    return 2.0 + p * 1.4;
  }
}

// Box-Muller normal sample, clamped and rounded to 1-5
function sentimentScore(mean, std = 0.85) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.min(5, Math.max(1, Math.round(mean + n * std)));
}

function isWeekday(date) {
  const d = date.getDay();
  return d !== 0 && d !== 6;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Reference data ────────────────────────────────────────────────────────────
const ROLES = [
  'Leader', 'Demand Planner', 'Replenishment Planner', 'Master Scheduler',
  'Finite Scheduler', 'Material Planner', 'Category Planner',
  'Inventory Planner', 'SCO', 'Other', null, null, // null = skipped
];
const LOCATIONS = [
  'Oak Brook, IL', 'Naperville, IL', 'Plant Site', 'Remote', 'Other', null,
];
const BUS = [
  'Coffee+Creamer', 'BS&C', 'RIG', 'P&DB', 'Aseptic+Tea', null,
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - 3);
  start.setHours(0, 0, 0, 0);

  // Collect every weekday in the window
  const weekdays = [];
  for (const cursor = new Date(start); cursor < now; cursor.setDate(cursor.getDate() + 1)) {
    if (isWeekday(cursor)) weekdays.push(new Date(cursor));
  }

  console.log(`Generating entries for ${weekdays.length} weekdays…`);

  let batch     = writeBatch(db);
  let batchSize = 0;
  let total     = 0;

  for (let i = 0; i < weekdays.length; i++) {
    const day      = weekdays[i];
    const progress = i / (weekdays.length - 1);
    const mean     = targetMean(progress);
    const count    = 20 + Math.floor(Math.random() * 6); // 20–25

    for (let j = 0; j < count; j++) {
      const ts = new Date(day);
      ts.setHours(7 + Math.floor(Math.random() * 10)); // 7 am–4 pm
      ts.setMinutes(Math.floor(Math.random() * 60));
      ts.setSeconds(Math.floor(Math.random() * 60));

      batch.set(doc(collection(db, 'sentiment_entries')), {
        emoji:     sentimentScore(mean),
        role:      pick(ROLES),
        location:  pick(LOCATIONS),
        bu:        pick(BUS),
        timestamp: Timestamp.fromDate(ts),
      });

      batchSize++;
      total++;

      // Firestore batch limit is 500 operations
      if (batchSize === 499) {
        await batch.commit();
        console.log(`  … committed batch, ${total} entries so far`);
        batch     = writeBatch(db);
        batchSize = 0;
      }
    }
  }

  if (batchSize > 0) {
    await batch.commit();
  }

  console.log(`\nDone — seeded ${total} pulse entries across ${weekdays.length} weekdays.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
