/**
 * Seed: synthetic Daily Pulse entries for 2026-05-13 … 2026-05-18 (weekdays
 * only — May 13, 14, 15, 18). Sentiment is keyed to module:
 *
 *   ESP       — generally negative   (mean ~2.1)
 *   MEIO      — generally neutral    (mean ~3.0)
 *   Demand    — slightly favorable   (mean ~3.5)
 *   Analytics — very favorable       (mean ~4.5)
 *
 * 20–25 entries per day. Scores are normally distributed (Box-Muller),
 * clamped and rounded to the 1–5 scale.
 *
 * Uses the Admin SDK.
 *
 * Run from the project root:
 *   SERVICE_ACCOUNT=/path/to/key.json node scripts/seed-pulse-may.js
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
const { Timestamp } = admin.firestore;

// ── Module sentiment profiles ────────────────────────────────────────────────
const MODULE_SENTIMENT = {
  Demand:    { mean: 3.5, std: 0.80, weight: 0.30 },
  ESP:       { mean: 2.1, std: 0.85, weight: 0.28 },
  MEIO:      { mean: 3.0, std: 0.85, weight: 0.20 },
  Analytics: { mean: 4.5, std: 0.70, weight: 0.22 },
};

// ── Reference data ───────────────────────────────────────────────────────────
const ROLES = [
  'Leader', 'Demand Planner', 'Replenishment Planner', 'Master Scheduler',
  'Finite Scheduler', 'Material Planner', 'Category Planner',
  'Inventory Planner', 'SCO', 'Other',
];
const LOCATIONS = ['Oak Brook, IL', 'Plant Site', 'Remote', 'Other'];
const BUS       = ['Coffee+Creamer', 'BS&C', 'RIG', 'P&DB', 'Aseptic+Tea'];

// ── Helpers ──────────────────────────────────────────────────────────────────

// Box-Muller normal sample, clamped and rounded to 1–5.
function gaussianScore(mean, std) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.min(5, Math.max(1, Math.round(mean + n * std)));
}

function pickModule() {
  const r = Math.random();
  let acc = 0;
  for (const [name, cfg] of Object.entries(MODULE_SENTIMENT)) {
    acc += cfg.weight;
    if (r < acc) return name;
  }
  return 'Demand';
}

// Returns a random array element, or null `skipChance` of the time.
function pick(arr, skipChance = 0.28) {
  if (Math.random() < skipChance) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

// Weekdays in 2026-05-13 … 2026-05-18 (month is 0-indexed: 4 = May).
function targetDays() {
  const days = [];
  for (let d = new Date(2026, 4, 13); d <= new Date(2026, 4, 18); d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(d));
  }
  return days;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  const days = targetDays();
  console.log(`Seeding ${days.length} weekday(s): ${days.map((d) => `${d.getMonth() + 1}/${d.getDate()}`).join(', ')}`);

  let batch = db.batch();
  let total = 0;
  const tally = {}; // module → { count, sum }

  for (const day of days) {
    const count = 20 + Math.floor(Math.random() * 6); // 20–25
    for (let i = 0; i < count; i++) {
      const moduleName = pickModule();
      const cfg        = MODULE_SENTIMENT[moduleName];
      const emoji      = gaussianScore(cfg.mean, cfg.std);

      const ts = new Date(day);
      ts.setHours(
        7 + Math.floor(Math.random() * 10),  // 7am–4pm
        Math.floor(Math.random() * 60),
        Math.floor(Math.random() * 60),
        0,
      );

      batch.set(db.collection('sentiment_entries').doc(), {
        emoji,
        module:    moduleName,
        role:      pick(ROLES),
        location:  pick(LOCATIONS),
        bu:        pick(BUS),
        timestamp: Timestamp.fromDate(ts),
      });

      tally[moduleName] = tally[moduleName] || { count: 0, sum: 0 };
      tally[moduleName].count++;
      tally[moduleName].sum += emoji;
      total++;
    }
  }

  await batch.commit();

  console.log(`\nDone — seeded ${total} entries across ${days.length} weekdays.`);
  console.log('Module breakdown (count · avg sentiment):');
  for (const [name, { count, sum }] of Object.entries(tally)) {
    console.log(`  ${name.padEnd(10)} ${String(count).padStart(3)} · ${(sum / count).toFixed(2)}`);
  }
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
