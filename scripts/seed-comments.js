/**
 * Seed: attaches synthetic `comment` text to a random sample of 60–100
 * existing sentiment_entries. Each comment is matched to that entry's
 * score bucket (low 1–2 / mid 3 / high 4–5) and its module, so the
 * verbatim reads consistently with the rating. Demographics are left
 * implicit — comments are written to not contradict any role/location.
 *
 * Uses the Admin SDK (sentiment_entries has `allow update: if false`).
 * Only entries that lack a comment and have a module are eligible.
 *
 * Run from the project root:
 *   SERVICE_ACCOUNT=/path/to/key.json node scripts/seed-comments.js
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

// ── Comment pools — keyed by module, then score bucket ───────────────────────
const COMMENTS = {
  Demand: {
    low: [
      'Forecast accuracy has been off and overrides take too many clicks.',
      'Demand planning is slow to pick up recent shifts in the numbers.',
      'Spent most of today reworking the demand plan by hand.',
      "The forecast just doesn't reflect what we're seeing in the market.",
      'Demand changes take far too long to flow through.',
    ],
    mid: [
      'Demand planning is workable today — nothing remarkable.',
      "Forecast is roughly where I'd expect, no surprises.",
      'Demand workflow is fine, could be a little faster.',
      'An average day in demand planning.',
    ],
    high: [
      'Forecast overrides were quick and the plan looks solid.',
      'Demand planning has been smooth and dependable this week.',
      'The demand workflow really clicked today.',
      "Forecast lined up well with what we're seeing — easy day.",
    ],
  },
  ESP: {
    low: [
      'ESP exceptions are overwhelming — too much noise to act on.',
      'Supply planning runs are slow and hard to trust.',
      "Lead times aren't updating, so the plan is always a step behind.",
      "Too much time chasing ESP exceptions that don't matter.",
      'The supply plan needed heavy manual cleanup again today.',
    ],
    mid: [
      'ESP is functional but the exception load is on the heavy side.',
      'Supply planning is steady — no major issues today.',
      'ESP did its job, nothing stood out either way.',
      'Replenishment is okay, a few exceptions to work through.',
    ],
    high: [
      'Supply planning ran clean today — exceptions were manageable.',
      'ESP exceptions were clear and quick to clear.',
      'The supply plan came together with little rework.',
      'Replenishment looked solid end to end.',
    ],
  },
  MEIO: {
    low: [
      "Safety stock recommendations don't match what we actually need.",
      'MEIO feels like a black box — hard to trust the numbers.',
      'Inventory optimization outputs are tough to act on.',
      'The stocking levels MEIO suggested were off again.',
    ],
    mid: [
      'MEIO is doing its job — results are about average.',
      'Inventory views are adequate for what I needed today.',
      'Safety stock numbers look reasonable, nothing notable.',
      'MEIO is steady, no real complaints today.',
    ],
    high: [
      'Safety stock recommendations were spot on today.',
      'MEIO results lined up well with what I expected.',
      'Inventory optimization made my stocking decisions easy.',
      'The MEIO output was clear and I trusted it.',
    ],
  },
  Analytics: {
    low: [
      'Reports are slow to load and hard to filter.',
      'Cannot get the analytics view I need without exporting to Excel.',
      "The dashboards don't show the cut of data I actually need.",
      'Spent too long wrangling reports today.',
    ],
    mid: [
      'Analytics covers the basics fine.',
      'Dashboards work — could be faster to load.',
      "Reporting was adequate for today's needs.",
      'Analytics is fine, nothing stood out.',
    ],
    high: [
      'The dashboards gave me exactly what I needed, fast.',
      'Analytics has been excellent — clear and quick.',
      'Found the insight I needed in seconds today.',
      'Reporting was smooth and the views were spot on.',
    ],
  },
  Other: {
    low: [
      'The tool has been sluggish for routine tasks this week.',
      'Too many manual steps for things that should be simple.',
      'Navigation is clunky and slows me down.',
      'Logged out mid-task again — frustrating.',
    ],
    mid: [
      'An average day — the tools worked, nothing notable.',
      'Things are functional, no real complaints or praise.',
      'Workable day overall.',
      'No major friction today, no highlights either.',
    ],
    high: [
      'Smooth day overall — the tools just worked.',
      'Good experience today, very little friction.',
      'Everything I needed was quick to get to.',
      'Solid day — the platform stayed out of my way.',
    ],
  },
};

function scoreBucket(emoji) {
  if (emoji <= 2) return 'low';
  if (emoji === 3) return 'mid';
  return 'high';
}

function pickComment(emoji, module) {
  const byBucket = COMMENTS[module] || COMMENTS.Other;
  const pool = byBucket[scoreBucket(emoji)];
  return pool[Math.floor(Math.random() * pool.length)];
}

async function seed() {
  const snap = await db.collection('sentiment_entries').get();

  const eligible = snap.docs.filter((d) => {
    const e = d.data();
    return !e.comment && e.module && e.emoji;
  });

  console.log(`Total entries: ${snap.size}. Eligible (no comment, has module): ${eligible.length}.`);

  // Shuffle eligible entries
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }

  const target = 60 + Math.floor(Math.random() * 41); // 60–100
  const chosen = eligible.slice(0, target);

  const batch = db.batch();
  const tally = {};

  for (const d of chosen) {
    const { emoji, module } = d.data();
    const comment = pickComment(emoji, module);
    batch.update(d.ref, { comment });
    const key = `${module}/${scoreBucket(emoji)}`;
    tally[key] = (tally[key] || 0) + 1;
  }

  await batch.commit();

  console.log(`\nDone — added ${chosen.length} comments.`);
  console.log('Breakdown (module / sentiment):');
  for (const [key, count] of Object.entries(tally).sort()) {
    console.log(`  ${key.padEnd(20)} ${count}`);
  }
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
