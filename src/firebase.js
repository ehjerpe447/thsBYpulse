import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            ?? 'placeholder-api-key',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        ?? 'placeholder.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? 'placeholder-project',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     ?? 'placeholder.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             ?? '1:000000000000:web:placeholder',
};

export const withTimeout = (promise, ms = 10000) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Request timed out. Check your Firebase configuration.')),
        ms,
      ),
    ),
  ]);

if (import.meta.env.DEV && !import.meta.env.VITE_FIREBASE_PROJECT_ID) {
  console.warn(
    '[firebase] VITE_FIREBASE_PROJECT_ID is not set. Copy .env.example → .env and fill in your Firebase config.',
  );
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const COLLECTIONS = {
  SENTIMENT: 'sentiment_entries',
  FEATURES: 'feature_requests',
  ROADMAP: 'roadmap_items',
};

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

export const BUSINESS_UNITS = [
  'Coffee+Creamer',
  'BS&C',
  'RIG',
  'P&DB',
  'Aseptic+Tea',
];

export const LOCATIONS = [
  'Oak Brook, IL',
  'Naperville, IL',
  'Plant Site',
  'Remote',
  'Other',
];
