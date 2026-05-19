import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Required env vars — fail fast with a clear error if any are missing
// rather than letting the Firebase SDK emit a cryptic auth/init error later.
const REQUIRED_ENV = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const missing = REQUIRED_ENV.filter((k) => !import.meta.env[k]);

if (missing.length > 0) {
  const detail = missing.join(', ');
  if (import.meta.env.PROD) {
    // Production: fail loudly. A broken deploy should not appear to "work".
    throw new Error(
      `[firebase] Missing required env vars: ${detail}. ` +
        `Configure them in your hosting provider (Vercel → Settings → Environment Variables).`,
    );
  } else {
    // Dev: warn so the dev server keeps running and the message is visible.
    console.warn(
      `[firebase] Missing env vars: ${detail}. ` +
        `Copy .env.example → .env and fill in your Firebase config.`,
    );
  }
}

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

export const withTimeout = (promise, ms = 10000) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error('Request timed out. Check your Firebase configuration.')),
      ms,
    );
  });
  // Clear the timer once the race settles — on resolve or reject — so a
  // completed request never leaves a pending timer in the event loop.
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const COLLECTIONS = {
  SENTIMENT: 'sentiment_entries',
  FEATURES: 'feature_requests',
  ROADMAP: 'roadmap_items',
};

// Blue Yonder modules — shown on the Pulse "Recommended context" tier.
export const MODULES = [
  'Demand',
  'ESP',
  'MEIO',
  'Analytics',
  'Other',
];

export const ROLES = [
  'Leader',
  'Demand Planner',
  'Replenishment Planner',
  'Master Scheduler',
  'Finite Scheduler',
  'Material Planner',
  'Category Planner',
  'Inventory Planner',
  'SCO',
  'Other',
];

// Stored on entries as the `bu` field; displayed in the UI as "Growth Unit".
export const BUSINESS_UNITS = [
  'Coffee+Creamer',
  'BS&C',
  'RIG',
  'P&DB',
  'Aseptic+Tea',
];

export const LOCATIONS = [
  'Oak Brook, IL',
  'Plant Site',
  'Remote',
  'Other',
];

// Addressable planner headcount — the denominator for the Admin
// participation metric. Update this when the planning org changes size.
export const TEAM_SIZE = 80;

// Idea lifecycle states, in lifecycle order. `badge` holds the Tailwind
// classes for the status chip shown on idea cards.
export const IDEA_STATUSES = [
  { value: 'under_review', label: 'Under Review', badge: 'bg-brand-slate/10 text-brand-slate' },
  { value: 'planned',      label: 'Planned',      badge: 'bg-brand-gold/15 text-brand-gold' },
  { value: 'in_progress',  label: 'In Progress',  badge: 'bg-blue-100 text-blue-700' },
  { value: 'shipped',      label: 'Shipped',      badge: 'bg-brand-leaf/25 text-brand-green' },
  { value: 'declined',     label: 'Declined',     badge: 'bg-red-100 text-red-700' },
];
