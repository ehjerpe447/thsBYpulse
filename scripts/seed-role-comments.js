/**
 * Seed: places ~12 role-flavored comments on existing sentiment_entries.
 * Unlike seed-comments.js (which is role-agnostic), each comment here is
 * written from a specific planner role's point of view and is matched to
 * an entry with that role, score bucket, and — where possible — module.
 *
 * Uses the Admin SDK. Only entries lacking a comment are eligible.
 *
 * Run from the project root:
 *   SERVICE_ACCOUNT=/path/to/key.json node scripts/seed-role-comments.js
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

// Curated role-flavored comments. Each is matched to an entry with the
// given role + score bucket; module is a preference (relaxed if needed).
const ROLE_COMMENTS = [
  { role: 'Leader',               bucket: 'mid',  module: 'Analytics',
    text: 'As a leader, the dashboards give me the headline numbers, but a clean cross-team rollup still takes extra digging.' },
  { role: 'Leader',               bucket: 'high', module: 'Analytics',
    text: 'Good visibility this week — the analytics rollups had what I needed going into the S&OP review.' },
  { role: 'Demand Planner',       bucket: 'low',  module: 'Demand',
    text: 'As a demand planner, forecast overrides are still too many clicks and the audit trail is thin.' },
  { role: 'Demand Planner',       bucket: 'high', module: 'Demand',
    text: 'Demand planning flowed well today — overrides were quick and the forecast held up.' },
  { role: 'Replenishment Planner', bucket: 'low', module: 'ESP',
    text: 'Replenishment is buried in exceptions again — hard to tell which orders actually need my attention.' },
  { role: 'Master Scheduler',     bucket: 'mid',  module: 'ESP',
    text: 'Scheduling is workable, but reconciling the master schedule against supply still takes a lot of manual effort.' },
  { role: 'Finite Scheduler',     bucket: 'low',  module: 'Other',
    text: 'Finite scheduling changes are slow to reflect — I spent the day rescheduling around constraints by hand.' },
  { role: 'Material Planner',     bucket: 'low',  module: 'ESP',
    text: "As a material planner, the lead times feeding the plan are stale and I'm catching shortages too late." },
  { role: 'Category Planner',     bucket: 'mid',  module: 'Analytics',
    text: "Category planning is fine — I'd just like the analytics cut by category without having to export it." },
  { role: 'Inventory Planner',    bucket: 'low',  module: 'MEIO',
    text: "As an inventory planner, the safety stock recommendations don't reflect our real service-level targets." },
  { role: 'Inventory Planner',    bucket: 'high', module: 'MEIO',
    text: 'Inventory planning was smooth today — the MEIO numbers lined up with our service goals.' },
  { role: 'SCO',                  bucket: 'high', module: 'ESP',
    text: 'From the SCO seat, the supply plan came together cleanly today with minimal firefighting.' },
];

function scoreBucket(emoji) {
  if (emoji <= 2) return 'low';
  if (emoji === 3) return 'mid';
  return 'high';
}

async function seed() {
  const snap = await db.collection('sentiment_entries').get();
  const eligible = snap.docs.filter((d) => {
    const e = d.data();
    return !e.comment && e.role && e.emoji;
  });

  const batch = db.batch();
  const used = new Set();
  const skipped = [];
  let placed = 0;

  for (const rc of ROLE_COMMENTS) {
    const matches = (requireModule) =>
      eligible.find((d) => {
        if (used.has(d.id)) return false;
        const e = d.data();
        if (e.role !== rc.role || scoreBucket(e.emoji) !== rc.bucket) return false;
        return requireModule ? e.module === rc.module : true;
      });

    const match = matches(true) || matches(false);

    if (!match) {
      skipped.push(`${rc.role} / ${rc.bucket}`);
      continue;
    }

    used.add(match.id);
    batch.update(match.ref, { comment: rc.text });
    placed++;
    console.log(`  ${rc.role.padEnd(22)} ${rc.bucket.padEnd(5)} ${(match.data().module || '—').padEnd(10)}`);
  }

  await batch.commit();

  console.log(`\nDone — placed ${placed} role-flavored comment(s).`);
  if (skipped.length) console.log('Skipped (no matching entry):', skipped.join('; '));
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
