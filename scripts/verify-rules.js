/**
 * Verifies the published Firestore security rules. Uses the client SDK
 * (subject to the rules, exactly like the app) to confirm that
 * legitimate, app-shaped writes are accepted and malformed writes are
 * rejected. The documents created by the accepted cases are cleaned up
 * afterward with the Admin SDK.
 *
 * Run from the project root:
 *   SERVICE_ACCOUNT=/path/to/key.json node scripts/verify-rules.js
 */

import { config } from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { createRequire } from 'module';

config();
const require = createRequire(import.meta.url);

const firebaseConfig = {
  apiKey:            process.env.VITE_FIREBASE_API_KEY,
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  console.error('ERROR: VITE_FIREBASE_* not set. Check your .env file.');
  process.exit(1);
}
if (!process.env.SERVICE_ACCOUNT) {
  console.error('ERROR: Set SERVICE_ACCOUNT=/path/to/service-account.json (for cleanup).');
  process.exit(1);
}

const db = getFirestore(initializeApp(firebaseConfig));

const created = [];
let pass = 0;
let fail = 0;

async function expectAccept(label, coll, data) {
  try {
    const ref = await addDoc(collection(db, coll), data);
    created.push({ coll, id: ref.id });
    console.log(`  PASS  accept  ${label}`);
    pass++;
  } catch (e) {
    console.log(`  FAIL  accept  ${label} — rejected: ${e.code || e.message}`);
    fail++;
  }
}

async function expectReject(label, coll, data) {
  try {
    const ref = await addDoc(collection(db, coll), data);
    created.push({ coll, id: ref.id }); // track so cleanup still removes it
    console.log(`  FAIL  reject  ${label} — was accepted`);
    fail++;
  } catch (e) {
    if (String(e.code || '').includes('permission-denied')) {
      console.log(`  PASS  reject  ${label}`);
      pass++;
    } else {
      console.log(`  FAIL  reject  ${label} — unexpected error: ${e.code || e.message}`);
      fail++;
    }
  }
}

const validPulse = () => ({
  emoji: 4, module: 'Demand', role: null, location: null, bu: null,
  comment: 'rules verification — safe to delete', timestamp: serverTimestamp(),
});
const validIdea = () => ({
  title: 'Rules verification idea — safe to delete', description: '',
  module: null, upvotes: 1, status: 'under_review', createdAt: serverTimestamp(),
});

async function run() {
  console.log(`Verifying Firestore rules against project "${firebaseConfig.projectId}"\n`);

  // Legitimate, app-shaped writes — must be ACCEPTED.
  await expectAccept('valid Daily Pulse submission', 'sentiment_entries', validPulse());
  await expectAccept('valid Idea submission', 'feature_requests', validIdea());

  // Malformed writes — must be REJECTED.
  await expectReject('pulse with emoji out of range (9)', 'sentiment_entries',
    { ...validPulse(), emoji: 9 });
  await expectReject('pulse with a 600-char comment', 'sentiment_entries',
    { ...validPulse(), comment: 'x'.repeat(600) });
  await expectReject('pulse with an unexpected extra field', 'sentiment_entries',
    { ...validPulse(), injected: true });
  await expectReject('idea created with inflated upvotes', 'feature_requests',
    { ...validIdea(), upvotes: 9999 });
  await expectReject('idea created already marked shipped', 'feature_requests',
    { ...validIdea(), status: 'shipped' });
  await expectReject('idea with a 300-char title', 'feature_requests',
    { ...validIdea(), title: 'x'.repeat(300) });

  // Clean up every document that was actually created.
  if (created.length) {
    const admin = require('firebase-admin');
    admin.initializeApp({
      credential: admin.credential.cert(require(process.env.SERVICE_ACCOUNT)),
    });
    const adminDb = admin.firestore();
    for (const { coll, id } of created) {
      await adminDb.collection(coll).doc(id).delete();
    }
    console.log(`\nCleaned up ${created.length} test document(s).`);
  }

  console.log(`\n${pass} passed, ${fail} failed.`);
  process.exit(fail ? 1 : 0);
}

run().catch((err) => {
  console.error('Verification crashed:', err);
  process.exit(1);
});
