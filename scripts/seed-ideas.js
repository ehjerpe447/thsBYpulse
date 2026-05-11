/**
 * Seed script: adds 10 planner-focused ideas and distributes 63 upvotes
 * across all ideas in the Idea Lab (existing + new).
 *
 * Run from the project root:
 *   node scripts/seed-ideas.js
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  writeBatch,
  serverTimestamp,
  Timestamp,
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

// ── 10 new ideas ──────────────────────────────────────────────────────────────
const NEW_IDEAS = [
  {
    title: 'One-click forecast override approvals',
    description: 'Allow demand planners to submit overrides for manager approval directly in Blue Yonder, with full audit trail — no more spreadsheet hand-offs.',
  },
  {
    title: 'Real-time supplier lead time integration',
    description: 'Automatically pull confirmed lead times from supplier portals into Blue Yonder so net requirements reflect actual availability, not static parameters.',
  },
  {
    title: 'Scenario planning and what-if simulation',
    description: 'Build and compare multiple supply/demand scenarios side-by-side before committing to a plan — essential for S&OP and disruption response.',
  },
  {
    title: 'Automated PO generation from net requirements',
    description: 'Convert approved MRP recommendations into draft purchase orders with one click, reducing manual re-keying and buyer workload.',
  },
  {
    title: 'Slow-mover and obsolescence early warnings',
    description: 'Proactive alerts when SKUs are trending toward slow-mover status so planners can act before excess inventory accumulates.',
  },
  {
    title: 'Collaborative S&OP workbench',
    description: 'A shared space where finance, commercial, and supply teams can view, annotate, and agree on the consensus plan without leaving Blue Yonder.',
  },
  {
    title: 'Multi-echelon safety stock optimization',
    description: 'Calculate safety stock across the full network — DC, plant, and raw material — accounting for service level trade-offs at each node.',
  },
  {
    title: 'POS and downstream demand signal integration',
    description: 'Incorporate point-of-sale and customer ship-from-stock data into the demand model to improve short-horizon forecast accuracy.',
  },
  {
    title: 'Exception prioritization and noise filtering',
    description: 'Intelligent ranking of MRP exceptions by financial impact so planners tackle the most critical messages first and tune out low-value noise.',
  },
  {
    title: 'Constraint-based finite scheduling visualization',
    description: 'A Gantt-style view of production schedules that shows capacity constraints and allows drag-and-drop rescheduling within Blue Yonder.',
  },
];

// ── Upvote distribution (63 total, Pareto-ish) ───────────────────────────────
// Assigned in descending order to ideas sorted by rank after seeding.
const UPVOTE_DISTRIBUTION = [14, 10, 8, 7, 6, 5, 4, 3, 2, 2, 2];
// 14+10+8+7+6+5+4+3+2+2+2 = 63 ✓

// Spread submitted-at timestamps across the past 6 weeks (weekdays only)
function randomPastDate(maxDaysAgo = 42) {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  let date;
  do {
    const daysAgo = 1 + Math.floor(Math.random() * (maxDaysAgo - 1));
    date = new Date(now - daysAgo * DAY);
  } while (date.getDay() === 0 || date.getDay() === 6); // skip weekends
  date.setHours(8 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60), 0, 0);
  return Timestamp.fromDate(date);
}

async function seed() {
  // ── Step 1: fetch existing ideas ─────────────────────────────────────────
  const snap = await getDocs(collection(db, 'feature_requests'));
  const existing = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  console.log(`Found ${existing.length} existing idea(s).`);

  // ── Step 2: add new ideas ─────────────────────────────────────────────────
  let batch = writeBatch(db);
  const newRefs = [];

  NEW_IDEAS.forEach((idea) => {
    const ref = doc(collection(db, 'feature_requests'));
    newRefs.push({ id: ref.id, ...idea });
    batch.set(ref, {
      ...idea,
      upvotes:   1,
      status:    'queue',
      createdAt: randomPastDate(),
    });
  });

  await batch.commit();
  console.log(`Added ${NEW_IDEAS.length} new ideas.`);

  // ── Step 3: distribute 63 upvotes ─────────────────────────────────────────
  // All ideas: existing first, then new — shuffle so allocation isn't biased
  // by submission order. Then assign upvote_distribution[rank] to each.
  const allIdeas = [...existing, ...newRefs];

  // Shuffle
  for (let i = allIdeas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allIdeas[i], allIdeas[j]] = [allIdeas[j], allIdeas[i]];
  }

  // Assign upvotes — use distribution for ranked slots, remainder get 1
  batch = writeBatch(db);
  allIdeas.forEach((idea, rank) => {
    const bonus = UPVOTE_DISTRIBUTION[rank] ?? 1;
    const currentUpvotes = idea.upvotes ?? 1;
    batch.update(doc(db, 'feature_requests', idea.id), {
      upvotes: currentUpvotes + bonus,
    });
    console.log(`  "${idea.title?.slice(0, 50)}" → +${bonus} upvotes`);
  });

  await batch.commit();
  console.log(`\nDone — distributed 63 upvotes across ${allIdeas.length} ideas.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
