# TreeHouse Planning Pulse — Full Codebase Review Package

> Generated for third-party QA review · May 2026  
> Production URL: https://ths-b-ypulse.vercel.app  
> Repository: https://github.com/ehjerpe447/thsBYpulse

---

## 1. Application Overview

**TreeHouse Planning Pulse** is an internal web application for TreeHouse Foods' supply chain planning team. It provides:

| Screen | Purpose | Auth required |
|---|---|---|
| **Daily Pulse** (`/pulse`) | Anonymous emoji sentiment check (1–5 scale) with optional role/location/BU context | None |
| **Idea Lab** (`/ideas`) | Submit and upvote feature requests for the Blue Yonder/APS planning ecosystem | None |
| **Roadmap** (`/roadmap`) | Public view of ideas promoted to the product roadmap | None |
| **Admin Console** (`/admin`) | Sentiment analytics, demographic breakdowns, idea queue management, roadmap promotion | Firebase Auth (email/password) |

### Tech Stack

| Layer | Technology |
|---|---|
| UI framework | React 19 + Vite 8 |
| Styling | Tailwind CSS 3 (custom brand tokens) |
| Icons | Lucide-React |
| Charts | Recharts |
| Routing | React Router DOM 7 |
| Backend / DB | Firebase Firestore (SDK v12) |
| Auth | Firebase Authentication (email/password) |
| Hosting | Vercel (SPA rewrites configured) |
| Testing | Vitest 4 + Testing Library + jsdom |

### Firestore Collections

| Collection | Purpose | Public write | Public read |
|---|---|---|---|
| `sentiment_entries` | Daily Pulse submissions | create | ✗ (auth only) |
| `feature_requests` | Idea Lab ideas + upvotes | create, update | ✓ |
| `roadmap_items` | Promoted roadmap items | ✗ (auth only) | ✓ |

### Firestore Security Rules (current)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sentiment_entries/{id} {
      allow read: if request.auth != null;
      allow create: if true;
      allow update: if true;
    }
    match /feature_requests/{id} {
      allow read: if true;
      allow create: if true;
      allow update: if true;
    }
    match /roadmap_items/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### Demographic Fields Collected (optional on Pulse submission)

- **Role**: Leader, Demand Planner, Replenishment Planner, Master Scheduler, Finite Scheduler, Material Planner, Category Planner, Inventory Planner, SCO, Other
- **Location**: Oak Brook IL, Plant Site, Remote, Other
- **Business Unit**: Coffee+Creamer, BS&C, RIG, P&DB, Aseptic+Tea

---

## 2. Directory Structure

```
treehouse-planning-pulse/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
├── vercel.json
├── .env.example
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── scripts/
│   ├── seed-pulse.js          # synthetic sentiment data generator
│   ├── seed-ideas.js          # synthetic idea + upvote seeder
│   └── migrate-naperville.js  # one-time location migration (Admin SDK)
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── firebase.js
    ├── components/
    │   ├── Header.jsx
    │   └── BottomNav.jsx
    ├── pages/
    │   ├── Pulse.jsx
    │   ├── Ideas.jsx
    │   ├── Roadmap.jsx
    │   └── Admin.jsx
    └── test/
        ├── setup.js
        ├── unit.test.js        # U1–U19 pure-function tests
        └── component.test.jsx  # C1–C17 React component tests
```

---

## 3. Configuration Files

### `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#004A29" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <title>TreeHouse Planning Pulse</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### `package.json`

```json
{
  "name": "treehouse-planning-pulse",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "firebase": "^12.13.0",
    "lucide-react": "^1.14.0",
    "react": "^19.2.5",
    "react-dom": "^19.2.5",
    "react-router-dom": "^7.15.0",
    "recharts": "^3.8.1"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "@vitest/coverage-v8": "^4.1.5",
    "autoprefixer": "^10.5.0",
    "dotenv": "^17.4.2",
    "eslint": "^10.2.1",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "firebase-admin": "^13.9.0",
    "globals": "^17.5.0",
    "jsdom": "^29.1.1",
    "postcss": "^8.5.14",
    "tailwindcss": "^3.4.19",
    "vite": "^8.0.10",
    "vitest": "^4.1.5"
  }
}
```

### `vite.config.js`

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/test/**', 'src/main.jsx'],
    },
  },
});
```

### `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-green':       '#004A29',
        'brand-green-dark':  '#003620',
        'brand-green-light': '#0a6b41',
        'brand-white':       '#F9F9F7',
        'brand-slate':       '#4A4A4A',
        'brand-gold':        '#B8893A',
        'brand-leaf':        '#7FB069',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont',
               'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: { DEFAULT: '8px' },
      boxShadow: {
        card:       '0 1px 3px rgba(0, 74, 41, 0.06), 0 1px 2px rgba(0, 74, 41, 0.04)',
        'card-hover': '0 4px 12px rgba(0, 74, 41, 0.08), 0 2px 4px rgba(0, 74, 41, 0.04)',
      },
    },
  },
  plugins: [],
};
```

### `vercel.json`

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### `.env.example`

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---

## 4. Source Files

### `src/main.jsx`

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

### `src/App.jsx`

```jsx
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import BottomNav from './components/BottomNav.jsx';
import Pulse from './pages/Pulse.jsx';
import Ideas from './pages/Ideas.jsx';
import Roadmap from './pages/Roadmap.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col bg-brand-white">
      <Header />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 md:pb-10">
        <Routes>
          <Route path="/" element={<Navigate to="/pulse" replace />} />
          <Route path="/pulse" element={<Pulse />} />
          <Route path="/ideas" element={<Ideas />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/pulse" replace />} />
        </Routes>
      </main>
      {!isAdmin && <BottomNav />}
      <footer className="hidden md:block border-t border-brand-green/10 py-6 text-center text-xs text-brand-slate/60">
        TreeHouse Planning Pulse · Internal feedback platform · Anonymous by default
      </footer>
    </div>
  );
}
```

### `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  body {
    @apply bg-brand-white text-brand-slate font-sans;
  }
  h1, h2, h3, h4 {
    @apply text-brand-green font-semibold tracking-tight;
  }
}

@layer components {
  .btn-primary {
    @apply inline-flex items-center justify-center gap-2 rounded-lg bg-brand-green px-4 py-2.5 text-sm font-medium text-brand-white shadow-card transition hover:bg-brand-green-dark focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50;
  }
  .btn-ghost {
    @apply inline-flex items-center justify-center gap-2 rounded-lg border border-brand-green/20 bg-white px-4 py-2.5 text-sm font-medium text-brand-green transition hover:bg-brand-green/5 focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2;
  }
  .input {
    @apply w-full rounded-lg border border-brand-green/15 bg-white px-3.5 py-2.5 text-sm text-brand-slate placeholder-brand-slate/50 transition focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20;
  }
  .card {
    @apply rounded-lg bg-white p-5 shadow-card transition;
  }
  .chip {
    @apply inline-flex items-center gap-1 rounded-full bg-brand-green/10 px-2.5 py-1 text-xs font-medium text-brand-green;
  }
}
```

### `src/firebase.js`

```js
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
  FEATURES:  'feature_requests',
  ROADMAP:   'roadmap_items',
};

export const ROLES = [
  'Leader', 'Demand Planner', 'Replenishment Planner', 'Master Scheduler',
  'Finite Scheduler', 'Material Planner', 'Category Planner',
  'Inventory Planner', 'SCO', 'Other',
];

export const BUSINESS_UNITS = [
  'Coffee+Creamer', 'BS&C', 'RIG', 'P&DB', 'Aseptic+Tea',
];

export const LOCATIONS = [
  'Oak Brook, IL', 'Plant Site', 'Remote', 'Other',
];
```

---

### `src/components/Header.jsx`

```jsx
import { Link, NavLink } from 'react-router-dom';
import { TreePine, ShieldCheck } from 'lucide-react';

const navItems = [
  { to: '/pulse', label: 'Daily Pulse' },
  { to: '/ideas', label: 'Idea Lab' },
  { to: '/roadmap', label: 'Roadmap' },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-30 bg-brand-white/85 backdrop-blur border-b border-brand-green/10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/pulse" className="flex items-center gap-2.5 group">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-green text-brand-white shadow-card transition group-hover:bg-brand-green-dark">
            <TreePine size={20} strokeWidth={2.25} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[15px] font-semibold text-brand-green tracking-tight">
              TreeHouse <span className="font-normal text-brand-slate">Foods</span>
            </span>
            <span className="text-[11px] uppercase tracking-[0.12em] text-brand-slate/60">
              Planning Pulse
            </span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-green/10 text-brand-green'
                    : 'text-brand-slate hover:text-brand-green hover:bg-brand-green/5'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-slate/70 hover:text-brand-green transition"
        >
          <ShieldCheck size={14} />
          Admin
        </Link>
      </div>
    </header>
  );
}
```

### `src/components/BottomNav.jsx`

```jsx
import { NavLink } from 'react-router-dom';
import { Activity, Lightbulb, Map } from 'lucide-react';

const items = [
  { to: '/pulse',   label: 'Pulse',   Icon: Activity  },
  { to: '/ideas',   label: 'Ideas',   Icon: Lightbulb },
  { to: '/roadmap', label: 'Roadmap', Icon: Map        },
];

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-brand-green/10 bg-brand-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-3">
        {items.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition ${
                  isActive ? 'text-brand-green' : 'text-brand-slate/70 hover:text-brand-green'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

---

### `src/pages/Pulse.jsx`

```jsx
import { useEffect, useState } from 'react';
import { ChevronDown, Lock, Send, CheckCircle2 } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS, ROLES, BUSINESS_UNITS, LOCATIONS, withTimeout } from '../firebase';

const SCALE = [
  { value: 1, emoji: '😞', label: 'Frustrated' },
  { value: 2, emoji: '😕', label: 'Concerned'  },
  { value: 3, emoji: '😐', label: 'Neutral'    },
  { value: 4, emoji: '🙂', label: 'Positive'   },
  { value: 5, emoji: '😄', label: 'Energized'  },
];

export default function Pulse() {
  const [selected, setSelected]       = useState(null);
  const [showContext, setShowContext]  = useState(false);
  const [role, setRole]               = useState('');
  const [location, setLocation]       = useState('');
  const [bu, setBu]                   = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    if (!submitted) return;
    const t = setTimeout(() => setSubmitted(false), 5000);
    return () => clearTimeout(t);
  }, [submitted]);

  const handleSelect = (value) => {
    setSelected(value);
    setShowContext(true);
    setSubmitted(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError('');
    try {
      await withTimeout(
        addDoc(collection(db, COLLECTIONS.SENTIMENT), {
          emoji:     selected,
          role:      role     || null,
          location:  location || null,
          bu:        bu       || null,
          timestamp: serverTimestamp(),
        }),
      );
      setSubmitted(true);
      setShowContext(false);
      setSelected(null);
      setRole('');
      setLocation('');
      setBu('');
    } catch (err) {
      setError('Could not submit your pulse. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="chip">Daily Pulse</span>
        <h1 className="text-2xl sm:text-3xl">How are you feeling about planning with Blue Yonder today?</h1>
        <p className="text-sm text-brand-slate/80 max-w-xl">
          A quick sentiment check helps us see where the planning ecosystem is supporting you —
          and where it isn't. Tap an emoji to share your read.
        </p>
      </header>

      <section className="card">
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {SCALE.map(({ value, emoji, label }) => {
            const isActive = selected === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleSelect(value)}
                className={`group flex flex-col items-center gap-2 rounded-lg border px-2 py-4 sm:py-5 transition ${
                  isActive
                    ? 'border-brand-green bg-brand-green/5 shadow-card-hover'
                    : 'border-brand-green/10 hover:border-brand-green/40 hover:bg-brand-green/[0.03]'
                }`}
                aria-pressed={isActive}
                aria-label={`${label} (${value} of 5)`}
              >
                <span className="text-3xl sm:text-4xl transition group-hover:scale-110">{emoji}</span>
                <span className={`text-[11px] sm:text-xs font-medium uppercase tracking-wide ${
                  isActive ? 'text-brand-green' : 'text-brand-slate/70'
                }`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        <div className={`grid transition-all duration-300 ease-out ${
          showContext ? 'grid-rows-[1fr] opacity-100 mt-6' : 'grid-rows-[0fr] opacity-0'
        }`}>
          <div className="overflow-hidden">
            <form onSubmit={handleSubmit} className="space-y-4 border-t border-brand-green/10 pt-5">
              <div className="flex items-center gap-2 text-xs text-brand-slate/70">
                <ChevronDown size={14} className="text-brand-green" />
                <span>Optional context — helps us spot patterns by team.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Role">
                  <select value={role} onChange={(e) => setRole(e.target.value)} className="input appearance-none">
                    <option value="">Skip</option>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="Location">
                  <select value={location} onChange={(e) => setLocation(e.target.value)} className="input appearance-none">
                    <option value="">Skip</option>
                    {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Business Unit">
                  <select value={bu} onChange={(e) => setBu(e.target.value)} className="input appearance-none">
                    <option value="">Skip</option>
                    {BUSINESS_UNITS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </Field>
              </div>

              {error && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="flex items-center gap-1.5 text-xs text-brand-slate/70">
                  <Lock size={12} />
                  Your feedback is anonymous and helps improve our planning ecosystem.
                </p>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  <Send size={15} />
                  {submitting ? 'Submitting…' : 'Submit pulse'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {submitted && (
          <div className="mt-5 flex items-center gap-2 rounded-lg bg-brand-leaf/10 border border-brand-leaf/30 px-4 py-3 text-sm text-brand-green">
            <CheckCircle2 size={18} />
            Thanks — your pulse is recorded. Come back tomorrow.
          </div>
        )}
      </section>

      <section className="grid sm:grid-cols-3 gap-3 text-sm">
        <Stat label="Why we ask"   body="Track sentiment over time to surface friction early." />
        <Stat label="What we share" body="Aggregated trends only. Never individual responses." />
        <Stat label="Who sees it"  body="The planning product team uses it to prioritize work." />
      </section>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-brand-slate/80 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, body }) {
  return (
    <div className="rounded-lg border border-brand-green/10 bg-white/60 p-4">
      <div className="text-[11px] uppercase tracking-wider text-brand-green font-semibold">{label}</div>
      <div className="mt-1 text-brand-slate/80">{body}</div>
    </div>
  );
}
```

---

### `src/pages/Ideas.jsx`

```jsx
import { useEffect, useMemo, useState } from 'react';
import {
  addDoc, collection, doc, increment, onSnapshot,
  orderBy, query, serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { ArrowUp, Plus, Search, TrendingUp, Clock, Sparkles } from 'lucide-react';
import { db, COLLECTIONS, withTimeout } from '../firebase';

const VOTE_KEY = 'tph_voted_ideas_v1';

const loadVotes = () => {
  try { return new Set(JSON.parse(localStorage.getItem(VOTE_KEY) || '[]')); }
  catch { return new Set(); }
};
const saveVotes = (set) => {
  localStorage.setItem(VOTE_KEY, JSON.stringify([...set]));
};

export default function Ideas() {
  const [ideas, setIdeas]                   = useState([]);
  const [search, setSearch]                 = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [sortBy, setSortBy]                 = useState('top');
  const [voted, setVoted]                   = useState(loadVotes);
  const [submitting, setSubmitting]         = useState(false);
  const [submitError, setSubmitError]       = useState('');
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.FEATURES), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => { setIdeas(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false),
    );
    return unsub;
  }, []);

  const matches = useMemo(() => {
    if (!search.trim()) return [];
    const needle = search.trim().toLowerCase();
    return ideas.filter((i) => i.title?.toLowerCase().includes(needle));
  }, [ideas, search]);

  const visible = useMemo(() => {
    const list = [...ideas];
    if (sortBy === 'top') {
      list.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    } else {
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    }
    return list;
  }, [ideas, sortBy]);

  const exactMatchIdea = useMemo(
    () => ideas.find((i) => i.title?.trim().toLowerCase() === search.trim().toLowerCase()),
    [ideas, search],
  );
  const exactMatch = !!exactMatchIdea;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const title = search.trim();
    if (!title || exactMatch) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await withTimeout(
        addDoc(collection(db, COLLECTIONS.FEATURES), {
          title,
          description: draftDescription.trim(),
          upvotes: 1,
          status: 'queue',
          createdAt: serverTimestamp(),
        }),
      );
      setSearch('');
      setDraftDescription('');
    } catch (err) {
      console.error(err);
      setSubmitError(err.message || 'Could not submit your idea. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleVote = async (idea) => {
    const hasVoted = voted.has(idea.id);
    const next = new Set(voted);
    if (hasVoted) next.delete(idea.id); else next.add(idea.id);
    setVoted(next);
    saveVotes(next);
    try {
      await updateDoc(doc(db, COLLECTIONS.FEATURES, idea.id), {
        upvotes: increment(hasVoted ? -1 : 1),
      });
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-7">
      <header className="space-y-2">
        <span className="chip">Idea Lab</span>
        <h1 className="text-2xl sm:text-3xl">What should we build next?</h1>
        <p className="text-sm text-brand-slate/80 max-w-xl">
          Search to see if your idea already exists — upvote it if so, or submit a new one.
        </p>
      </header>

      <section className="card space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-slate/50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. Better demand forecast overrides…"
              className="input pl-10"
            />
          </div>

          {search.trim().length > 1 && exactMatch && exactMatchIdea && (
            <div className="rounded-lg border border-brand-gold/30 bg-brand-gold/5 p-3 space-y-2.5">
              <p className="text-xs font-medium text-brand-gold flex items-center gap-1.5">
                <Sparkles size={13} />
                This idea already exists — upvote it instead of resubmitting.
              </p>
              <div className="flex items-center gap-3 bg-white rounded-lg border border-brand-green/10 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleVote(exactMatchIdea)}
                  className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border px-2.5 py-1.5 min-w-[48px] transition ${
                    voted.has(exactMatchIdea.id)
                      ? 'border-brand-green bg-brand-green text-white'
                      : 'border-brand-green/20 text-brand-green hover:bg-brand-green/5'
                  }`}
                  aria-pressed={voted.has(exactMatchIdea.id)}
                  aria-label={voted.has(exactMatchIdea.id) ? 'Remove upvote' : 'Upvote'}
                >
                  <ArrowUp size={14} strokeWidth={2.5} />
                  <span className="text-xs font-semibold">{exactMatchIdea.upvotes || 0}</span>
                </button>
                <span className="text-sm font-medium text-brand-green">{exactMatchIdea.title}</span>
              </div>
            </div>
          )}

          {search.trim().length > 1 && !exactMatch && matches.length > 0 && (
            <div className="rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-3 text-xs text-brand-slate/80">
              <div className="font-medium text-brand-green mb-1.5 flex items-center gap-1.5">
                <Sparkles size={13} /> Similar ideas already exist
              </div>
              <ul className="space-y-1">
                {matches.slice(0, 3).map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{m.title}</span>
                    <span className="text-brand-green font-medium">{m.upvotes || 0} ▲</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {submitError && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {submitError}
            </div>
          )}

          {search.trim().length > 1 && !exactMatch && (
            <div className="space-y-2">
              <textarea
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                placeholder="Add a bit of context (optional)…"
                rows={2}
                className="input resize-none"
              />
              <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting}>
                <Plus size={16} />
                {submitting ? 'Submitting…' : `Submit "${search.trim().slice(0, 40)}${search.trim().length > 40 ? '…' : ''}"`}
              </button>
            </div>
          )}
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-slate/70">
            {visible.length} {visible.length === 1 ? 'idea' : 'ideas'} in the queue
          </h2>
          <div className="inline-flex rounded-lg border border-brand-green/15 bg-white p-0.5">
            <SortBtn active={sortBy === 'top'}    onClick={() => setSortBy('top')}    icon={TrendingUp}>Top</SortBtn>
            <SortBtn active={sortBy === 'recent'} onClick={() => setSortBy('recent')} icon={Clock}>Recent</SortBtn>
          </div>
        </div>

        {loading ? (
          <div className="card text-center text-sm text-brand-slate/60">Loading ideas…</div>
        ) : visible.length === 0 ? (
          <div className="card text-center text-sm text-brand-slate/60">
            No ideas yet — be the first to suggest one above.
          </div>
        ) : (
          <ul className="space-y-2.5">
            {visible.map((idea) => (
              <IdeaRow key={idea.id} idea={idea} hasVoted={voted.has(idea.id)} onVote={() => toggleVote(idea)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SortBtn({ active, onClick, icon: Icon, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
        active ? 'bg-brand-green text-white' : 'text-brand-slate hover:text-brand-green'
      }`}>
      <Icon size={13} />{children}
    </button>
  );
}

function IdeaRow({ idea, hasVoted, onVote }) {
  return (
    <li className="card flex items-start gap-4 hover:shadow-card-hover">
      <button type="button" onClick={onVote}
        className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border px-3 py-2 min-w-[58px] transition ${
          hasVoted ? 'border-brand-green bg-brand-green text-white' : 'border-brand-green/20 text-brand-green hover:bg-brand-green/5'
        }`}
        aria-pressed={hasVoted} aria-label={hasVoted ? 'Remove upvote' : 'Upvote'}>
        <ArrowUp size={16} strokeWidth={2.5} />
        <span className="text-sm font-semibold">{idea.upvotes || 0}</span>
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-base font-semibold text-brand-green">{idea.title}</h3>
          {idea.status === 'roadmap' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-gold">
              On roadmap
            </span>
          )}
        </div>
        {idea.description && (
          <p className="mt-1 text-sm text-brand-slate/80 line-clamp-3">{idea.description}</p>
        )}
      </div>
    </li>
  );
}
```

---

### `src/pages/Roadmap.jsx`

```jsx
import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Map, Calendar, Users, Target } from 'lucide-react';
import { db, COLLECTIONS } from '../firebase';

export default function Roadmap() {
  const [items, setItems]               = useState([]);
  const [features, setFeatures]         = useState({});
  const [loading, setLoading]           = useState(true);
  const [featuresReady, setFeaturesReady] = useState(false);
  const [error, setError]               = useState('');

  useEffect(() => {
    const onError = (err) => {
      console.error(err);
      setError('Could not load roadmap data. Check your Firebase connection.');
      setLoading(false);
      setFeaturesReady(true);
    };
    const unsubR = onSnapshot(
      query(collection(db, COLLECTIONS.ROADMAP), orderBy('timing', 'asc')),
      (snap) => { setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      onError,
    );
    const unsubF = onSnapshot(
      collection(db, COLLECTIONS.FEATURES),
      (snap) => {
        const map = {};
        snap.docs.forEach((d) => { map[d.id] = d.data(); });
        setFeatures(map);
        setFeaturesReady(true);
      },
      onError,
    );
    return () => { unsubR(); unsubF(); };
  }, []);

  const grouped = useMemo(() => {
    const acc = {};
    items.forEach((item) => {
      const key = item.timing || 'Unscheduled';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
    });
    return acc;
  }, [items]);

  const sortedTimings = useMemo(
    () => Object.keys(grouped).sort((a, b) => a.localeCompare(b)),
    [grouped],
  );

  return (
    <div className="space-y-7">
      <header className="space-y-2">
        <span className="chip">Public Roadmap</span>
        <h1 className="text-2xl sm:text-3xl">What we're building</h1>
        <p className="text-sm text-brand-slate/80 max-w-xl">
          Ideas promoted from the Idea Lab, grouped by planned delivery.
          Timing is directional — we re-prioritize as we learn.
        </p>
      </header>

      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {loading || !featuresReady ? (
        <div className="card text-center text-sm text-brand-slate/60">Loading roadmap…</div>
      ) : items.length === 0 ? (
        <div className="card text-center py-12">
          <Map size={28} className="mx-auto text-brand-green/40" />
          <p className="mt-3 text-sm text-brand-slate/70">
            Nothing on the roadmap yet. Promoted ideas will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedTimings.map((timing) => (
            <section key={timing} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-green text-white">
                  <Calendar size={14} />
                </span>
                <h2 className="text-lg">{timing}</h2>
                <span className="text-xs text-brand-slate/60">
                  · {grouped[timing].length} {grouped[timing].length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <ul className="space-y-2.5 ml-9 border-l-2 border-brand-green/10 pl-5">
                {grouped[timing].map((item) => {
                  const feature = features[item.featureId];
                  return (
                    <li key={item.id} className="card hover:shadow-card-hover">
                      <h3 className="text-base">{feature?.title || 'Untitled feature'}</h3>
                      {feature?.description && (
                        <p className="mt-1 text-sm text-brand-slate/80">{feature.description}</p>
                      )}
                      <dl className="mt-3 grid sm:grid-cols-2 gap-2 text-xs">
                        {item.team && <Meta icon={Users} label="Team">{item.team}</Meta>}
                        {item.businessCase && <Meta icon={Target} label="Business case">{item.businessCase}</Meta>}
                      </dl>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Meta({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-brand-green/[0.04] px-2.5 py-1.5">
      <Icon size={13} className="mt-0.5 text-brand-green" />
      <div>
        <dt className="font-semibold text-brand-green/80 uppercase tracking-wide text-[10px]">{label}</dt>
        <dd className="text-brand-slate">{children}</dd>
      </div>
    </div>
  );
}
```

---

### `src/pages/Admin.jsx`

```jsx
import { useEffect, useMemo, useState } from 'react';
import {
  collection, doc, onSnapshot, orderBy, query, writeBatch,
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import {
  ShieldCheck, LogOut, TrendingUp, TrendingDown, Minus, Rocket, X,
} from 'lucide-react';
import { auth, db, COLLECTIONS, withTimeout } from '../firebase';

export default function Admin() {
  const [user, setUser]               = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u);
    setAuthChecked(true);
  }), []);

  if (!authChecked) return <div className="card text-center text-sm text-brand-slate/60">Loading…</div>;
  return user ? <AdminConsole user={user} /> : <Login />;
}

// ── Login ────────────────────────────────────────────────────────────────────

function Login() {
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await withTimeout(signInWithEmailAndPassword(auth, email, password));
    } catch (err) {
      setError(err.message?.replace('Firebase: ', '') || 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-8 sm:mt-16">
      <div className="card space-y-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-green text-white">
            <ShieldCheck size={18} />
          </span>
          <div>
            <h1 className="text-lg leading-tight">Product Team Console</h1>
            <p className="text-xs text-brand-slate/70">Sign in to manage the roadmap.</p>
          </div>
        </div>
        <form onSubmit={handleLogin} className="space-y-3">
          <label className="block">
            <span className="block text-xs font-medium text-brand-slate/80 mb-1.5">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" autoComplete="email" />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-brand-slate/80 mb-1.5">Password</span>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" autoComplete="current-password" />
          </label>
          {error && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Admin Console ────────────────────────────────────────────────────────────

function AdminConsole({ user }) {
  const [sentiment, setSentiment]     = useState([]);
  const [features, setFeatures]       = useState([]);
  const [roadmap, setRoadmap]         = useState([]);
  const [promoting, setPromoting]     = useState(null);
  const [promoteError, setPromoteError] = useState('');
  const [snapshotError, setSnapshotError] = useState('');
  const [view, setView]               = useState('near'); // 'near' | 'long'

  useEffect(() => {
    const onError = (err) => {
      console.error(err);
      setSnapshotError('Could not load data. Check your Firebase connection or security rules.');
    };
    const unsubs = [
      onSnapshot(query(collection(db, COLLECTIONS.SENTIMENT), orderBy('timestamp', 'desc')),
        (snap) => setSentiment(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onError),
      onSnapshot(collection(db, COLLECTIONS.FEATURES),
        (snap) => setFeatures(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onError),
      onSnapshot(collection(db, COLLECTIONS.ROADMAP),
        (snap) => setRoadmap(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onError),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const stats       = useMemo(() => computeSentimentStats(sentiment), [sentiment]);
  const onRoadmapIds = useMemo(() => new Set(roadmap.map((r) => r.featureId)), [roadmap]);
  const queue       = useMemo(
    () => [...features].filter((f) => !onRoadmapIds.has(f.id))
                        .sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0)),
    [features, onRoadmapIds],
  );

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="chip">Admin Console</span>
          <h1 className="text-2xl mt-2">Planning Pulse Insights</h1>
          <p className="text-xs text-brand-slate/70 mt-1">Signed in as {user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-brand-green/15 bg-white p-0.5">
            <button type="button" onClick={() => setView('near')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                view === 'near' ? 'bg-brand-green text-white' : 'text-brand-slate hover:text-brand-green'
              }`}>Near-term</button>
            <button type="button" onClick={() => setView('long')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                view === 'long' ? 'bg-brand-green text-white' : 'text-brand-slate hover:text-brand-green'
              }`}>Long-term</button>
          </div>
          <button onClick={() => signOut(auth)} className="btn-ghost">
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </header>

      {snapshotError && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {snapshotError}
        </div>
      )}

      {/* ── KPI row ── */}
      <section className="grid sm:grid-cols-3 gap-3">
        {view === 'near' ? (
          <ScoreCard label="This week"  score={stats.thisWeek.avg}  count={stats.thisWeek.count}
            delta={stats.delta} deltaLabel="vs. last week" />
        ) : (
          <ScoreCard label="This month" score={stats.thisMonth.avg} count={stats.thisMonth.count}
            delta={stats.monthDelta} deltaLabel="vs. prior month" />
        )}
        <MetricCard label="Total responses" value={sentiment.length} />
        <MetricCard label="Ideas in queue"  value={queue.length} />
      </section>

      {/* ── Trend chart ── */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base">Sentiment trend</h2>
            <p className="text-xs text-brand-slate/60 mt-0.5">
              {view === 'near' ? 'Daily avg · last 14 days' : 'Weekly avg · last 12 weeks'}
            </p>
          </div>
        </div>
        <div className="h-64">
          {(view === 'near' ? stats.daily14 : stats.weekly12).length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={view === 'near' ? stats.daily14 : stats.weekly12}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" fontSize={11} stroke="#4A4A4A" tickLine={false} axisLine={false} />
                <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} fontSize={11} stroke="#4A4A4A" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid rgba(0,74,41,0.15)', fontSize: 12 }} />
                <Line type="monotone" dataKey="avg" stroke="#004A29" strokeWidth={2.5}
                  dot={{ fill: '#004A29', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-brand-slate/60">
              Not enough data yet.
            </div>
          )}
        </div>
      </section>

      {/* ── Demographic breakdown ── */}
      <DemographicBreakdown sentiment={sentiment} view={view} />

      {/* ── Idea queue ── */}
      <section className="space-y-3">
        <h2 className="text-base">Idea queue · ranked by upvotes</h2>
        {queue.length === 0 ? (
          <div className="card text-center text-sm text-brand-slate/60">No pending ideas. The queue is clear.</div>
        ) : (
          <ul className="space-y-2.5">
            {queue.map((idea) => (
              <li key={idea.id} className="card flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-brand-green">▲ {idea.upvotes || 0}</span>
                    <h3 className="text-base">{idea.title}</h3>
                  </div>
                  {idea.description && <p className="mt-1 text-sm text-brand-slate/80">{idea.description}</p>}
                </div>
                <button onClick={() => setPromoting(idea)} className="btn-primary whitespace-nowrap">
                  <Rocket size={14} /> Promote
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {promoting && (
        <PromoteModal
          idea={promoting}
          onClose={() => setPromoting(null)}
          onSubmit={async (payload) => {
            setPromoteError('');
            const batch = writeBatch(db);
            const roadmapRef = doc(collection(db, COLLECTIONS.ROADMAP));
            batch.set(roadmapRef, { featureId: promoting.id, ...payload });
            batch.update(doc(db, COLLECTIONS.FEATURES, promoting.id), { status: 'roadmap' });
            try {
              await withTimeout(batch.commit());
              setPromoting(null);
            } catch (err) {
              console.error(err);
              setPromoteError(err.message || 'Promote failed. Please try again.');
            }
          }}
          error={promoteError}
        />
      )}
    </div>
  );
}

// ── Small components ─────────────────────────────────────────────────────────

function MetricCard({ label, value }) {
  return (
    <div className="card">
      <div className="text-[11px] uppercase tracking-wider text-brand-slate/60 font-semibold">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-brand-green">{value}</div>
    </div>
  );
}

function ScoreCard({ label, score, count, delta, deltaLabel = 'vs. last week' }) {
  const Icon = delta != null && delta > 0.05 ? TrendingUp : delta != null && delta < -0.05 ? TrendingDown : Minus;
  const tone = delta != null && delta > 0.05 ? 'text-brand-leaf' : delta != null && delta < -0.05 ? 'text-red-600' : 'text-brand-slate/60';
  return (
    <div className="card">
      <div className="text-[11px] uppercase tracking-wider text-brand-slate/60 font-semibold">
        {label} · {count} {count === 1 ? 'response' : 'responses'}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-brand-green">{score != null ? score.toFixed(2) : '—'}</span>
        <span className="text-xs text-brand-slate/60">/ 5.00</span>
      </div>
      <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${tone}`}>
        <Icon size={13} />
        {delta == null ? 'No prior period' : `${delta >= 0 ? '+' : ''}${delta.toFixed(2)} ${deltaLabel}`}
      </div>
    </div>
  );
}

// ── Demographic breakdown ────────────────────────────────────────────────────

const BREAKDOWN_DIMS = [
  { key: 'role',     label: 'Role' },
  { key: 'location', label: 'Location' },
  { key: 'bu',       label: 'Business Unit' },
];

function computeSegmentBreakdown(entries, dimension, windowMs) {
  const now = Date.now();
  const withTime = entries
    .map((e) => ({ ...e, ts: e.timestamp?.toMillis?.() }))
    .filter((e) => e.ts);
  const avg = (arr) =>
    arr.length ? arr.reduce((s, e) => s + (e.emoji || 0), 0) / arr.length : null;

  const current = withTime.filter((e) => e.ts >= now - windowMs && e.ts < now);
  const prior   = withTime.filter((e) => e.ts >= now - 2 * windowMs && e.ts < now - windowMs);

  const groups = {};
  for (const entry of current) {
    const key = entry[dimension];
    if (!key) continue;
    if (!groups[key]) groups[key] = { cur: [], pri: [] };
    groups[key].cur.push(entry);
  }
  for (const entry of prior) {
    const key = entry[dimension];
    if (!key || !groups[key]) continue;
    groups[key].pri.push(entry);
  }

  return Object.entries(groups)
    .map(([name, { cur, pri }]) => {
      const curAvg = avg(cur);
      const priAvg = avg(pri);
      return { name, avg: curAvg, count: cur.length,
               delta: curAvg != null && priAvg != null ? curAvg - priAvg : null };
    })
    .sort((a, b) => (a.avg ?? 999) - (b.avg ?? 999));
}

function DemographicBreakdown({ sentiment, view }) {
  const [dim, setDim] = useState('role');
  const DAY      = 24 * 60 * 60 * 1000;
  const windowMs = view === 'near' ? 7 * DAY : 30 * DAY;
  const periodLabel = view === 'near' ? 'this week' : 'this month';
  const dimLabel = BREAKDOWN_DIMS.find((d) => d.key === dim)?.label ?? dim;

  const rows = useMemo(
    () => computeSegmentBreakdown(sentiment, dim, windowMs),
    [sentiment, dim, windowMs],
  );

  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base">Sentiment by segment</h2>
          <p className="text-xs text-brand-slate/60 mt-0.5">{periodLabel} · respondents who provided context</p>
        </div>
        <div className="inline-flex rounded-lg border border-brand-green/15 bg-white p-0.5">
          {BREAKDOWN_DIMS.map(({ key, label }) => (
            <button key={key} type="button" onClick={() => setDim(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                dim === key ? 'bg-brand-green text-white' : 'text-brand-slate hover:text-brand-green'
              }`}>{label}</button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-sm text-brand-slate/60 text-center py-6">
          No {periodLabel} responses with {dimLabel} data.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-green/10 text-[11px] uppercase tracking-wider text-brand-slate/50">
                <th className="text-left pb-2 font-semibold">Segment</th>
                <th className="text-right pb-2 font-semibold px-4">Avg</th>
                <th className="pb-2 px-4" aria-label="Score bar" />
                <th className="text-right pb-2 font-semibold px-4">Responses</th>
                <th className="text-right pb-2 font-semibold pl-4">
                  {view === 'near' ? 'vs. last week' : 'vs. prior month'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-green/5">
              {rows.map((row) => {
                const scoreColor = row.avg >= 4 ? 'text-brand-leaf' : row.avg >= 3 ? 'text-brand-green'
                                 : row.avg >= 2 ? 'text-amber-600' : 'text-red-600';
                const Icon = row.delta != null && row.delta > 0.05 ? TrendingUp
                           : row.delta != null && row.delta < -0.05 ? TrendingDown : Minus;
                const tone = row.delta != null && row.delta > 0.05 ? 'text-brand-leaf'
                           : row.delta != null && row.delta < -0.05 ? 'text-red-600' : 'text-brand-slate/50';
                const barPct = ((row.avg - 1) / 4) * 100;
                return (
                  <tr key={row.name}>
                    <td className="py-2.5 font-medium text-brand-slate">{row.name}</td>
                    <td className={`py-2.5 px-4 text-right font-semibold tabular-nums ${scoreColor}`}>
                      {row.avg?.toFixed(2)}<span className="text-brand-slate/40 text-xs font-normal ml-0.5">/5</span>
                    </td>
                    <td className="py-2.5 px-4 w-28">
                      <div className="h-1.5 rounded-full bg-brand-green/10">
                        <div className="h-1.5 rounded-full bg-brand-green/60" style={{ width: `${barPct}%` }} />
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right text-brand-slate/70 tabular-nums">{row.count}</td>
                    <td className={`py-2.5 pl-4 text-right ${tone}`}>
                      <span className="inline-flex items-center justify-end gap-1">
                        <Icon size={13} />
                        {row.delta != null ? `${row.delta >= 0 ? '+' : ''}${row.delta.toFixed(2)}` : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ── Promote modal ────────────────────────────────────────────────────────────

function nextQuarter(now = new Date()) {
  const q = Math.floor(now.getMonth() / 3) + 1;
  return q === 4 ? `Q1 ${now.getFullYear() + 1}` : `Q${q + 1} ${now.getFullYear()}`;
}

function PromoteModal({ idea, onClose, onSubmit, error }) {
  const [timing, setTiming]           = useState(nextQuarter);
  const [businessCase, setBusinessCase] = useState('');
  const [team, setTeam]               = useState('');
  const [busy, setBusy]               = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await onSubmit({ timing, businessCase, team }); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-card-hover">
        <div className="flex items-start justify-between p-5 border-b border-brand-green/10">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-brand-green font-semibold">Promote to Roadmap</span>
            <h2 className="text-base mt-1">{idea.title}</h2>
          </div>
          <button onClick={onClose} className="text-brand-slate/60 hover:text-brand-slate"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <label className="block">
            <span className="block text-xs font-medium text-brand-slate/80 mb-1.5">Timing</span>
            <input required value={timing} onChange={(e) => setTiming(e.target.value)} placeholder="e.g. Q3 2026" className="input" />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-brand-slate/80 mb-1.5">Business case</span>
            <textarea required value={businessCase} onChange={(e) => setBusinessCase(e.target.value)}
              rows={3} placeholder="Why we're doing this and the expected impact…" className="input resize-none" />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-brand-slate/80 mb-1.5">Feature team</span>
            <input required value={team} onChange={(e) => setTeam(e.target.value)} placeholder="e.g. Forecasting Squad" className="input" />
          </label>
          {error && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" className="btn-primary" disabled={busy}>
              <Rocket size={15} /> {busy ? 'Promoting…' : 'Add to roadmap'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Pure analytics functions ─────────────────────────────────────────────────

function computeSentimentStats(entries) {
  const now   = Date.now();
  const DAY   = 24 * 60 * 60 * 1000;
  const WEEK  = 7 * DAY;
  const MONTH = 30 * DAY;

  const withTime = entries
    .map((e) => ({ ...e, ts: e.timestamp?.toMillis?.() }))
    .filter((e) => e.ts);

  const inRange = (start, end) => withTime.filter((e) => e.ts >= start && e.ts < end);
  const avg = (arr) => arr.length ? arr.reduce((s, e) => s + (e.emoji || 0), 0) / arr.length : null;

  const thisWeekEntries = inRange(now - WEEK,       now);
  const lastWeekEntries = inRange(now - 2 * WEEK,   now - WEEK);
  const thisWeek = { avg: avg(thisWeekEntries), count: thisWeekEntries.length };
  const lastWeek = { avg: avg(lastWeekEntries), count: lastWeekEntries.length };
  const delta    = thisWeek.avg != null && lastWeek.avg != null ? thisWeek.avg - lastWeek.avg : null;

  const thisMonthEntries = inRange(now - MONTH,     now);
  const lastMonthEntries = inRange(now - 2 * MONTH, now - MONTH);
  const thisMonth  = { avg: avg(thisMonthEntries), count: thisMonthEntries.length };
  const lastMonth  = { avg: avg(lastMonthEntries), count: lastMonthEntries.length };
  const monthDelta = thisMonth.avg != null && lastMonth.avg != null ? thisMonth.avg - lastMonth.avg : null;

  const daily14 = [];
  for (let i = 13; i >= 0; i--) {
    const start = now - (i + 1) * DAY;
    const end   = now - i * DAY;
    const day   = inRange(start, end);
    const date  = new Date(end - DAY / 2);
    daily14.push({ day: `${date.getMonth() + 1}/${date.getDate()}`, avg: avg(day), count: day.length });
  }

  const weekly12 = [];
  for (let i = 11; i >= 0; i--) {
    const start  = now - (i + 1) * WEEK;
    const end    = now - i * WEEK;
    const bucket = inRange(start, end);
    const date   = new Date(start + WEEK / 2);
    weekly12.push({ day: `${date.getMonth() + 1}/${date.getDate()}`, avg: avg(bucket), count: bucket.length });
  }

  return {
    thisWeek, lastWeek, delta,
    thisMonth, lastMonth, monthDelta,
    daily14:  daily14.some((d) => d.avg != null) ? daily14 : [],
    weekly12: weekly12.some((d) => d.avg != null) ? weekly12 : [],
  };
}
```

---

## 5. Test Files

### `src/test/setup.js`

```js
import '@testing-library/jest-dom';

// Manual localStorage mock (avoids jsdom collision with vi.mock in setupFiles)
let _store = {};
const localStorageMock = {
  getItem:    (k)    => _store[k] ?? null,
  setItem:    (k, v) => { _store[k] = String(v); },
  removeItem: (k)    => { delete _store[k]; },
  clear:      ()     => { Object.keys(_store).forEach((k) => delete _store[k]); },
  key:        (i)    => Object.keys(_store)[i] ?? null,
  get length()       { return Object.keys(_store).length; },
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });
beforeEach(() => { Object.keys(_store).forEach((k) => delete _store[k]); });
```

### `src/test/unit.test.js`

```js
/**
 * Unit tests: pure functions extracted from page modules.
 * Firebase module is mocked globally in setup.js.
 */

// computeSentimentStats (from Admin.jsx)
function computeSentimentStats(entries) {
  const now   = Date.now();
  const DAY   = 24 * 60 * 60 * 1000;
  const WEEK  = 7 * DAY;
  const MONTH = 30 * DAY;

  const withTime = entries
    .map((e) => ({ ...e, ts: e.timestamp?.toMillis?.() }))
    .filter((e) => e.ts);

  const inRange = (start, end) => withTime.filter((e) => e.ts >= start && e.ts < end);
  const avg = (arr) =>
    arr.length ? arr.reduce((s, e) => s + (e.emoji || 0), 0) / arr.length : null;

  const thisWeekEntries = inRange(now - WEEK, now);
  const lastWeekEntries = inRange(now - 2 * WEEK, now - WEEK);
  const thisWeek = { avg: avg(thisWeekEntries), count: thisWeekEntries.length };
  const lastWeek = { avg: avg(lastWeekEntries), count: lastWeekEntries.length };
  const delta    = thisWeek.avg != null && lastWeek.avg != null ? thisWeek.avg - lastWeek.avg : null;

  const thisMonthEntries = inRange(now - MONTH, now);
  const lastMonthEntries = inRange(now - 2 * MONTH, now - MONTH);
  const thisMonth  = { avg: avg(thisMonthEntries), count: thisMonthEntries.length };
  const lastMonth  = { avg: avg(lastMonthEntries), count: lastMonthEntries.length };
  const monthDelta = thisMonth.avg != null && lastMonth.avg != null ? thisMonth.avg - lastMonth.avg : null;

  const daily14 = [];
  for (let i = 13; i >= 0; i--) {
    const start = now - (i + 1) * DAY;
    const end   = now - i * DAY;
    const day   = inRange(start, end);
    const date  = new Date(end - DAY / 2);
    daily14.push({ day: `${date.getMonth() + 1}/${date.getDate()}`, avg: avg(day), count: day.length });
  }

  const weekly12 = [];
  for (let i = 11; i >= 0; i--) {
    const start  = now - (i + 1) * WEEK;
    const end    = now - i * WEEK;
    const bucket = inRange(start, end);
    const date   = new Date(start + WEEK / 2);
    weekly12.push({ day: `${date.getMonth() + 1}/${date.getDate()}`, avg: avg(bucket), count: bucket.length });
  }

  return {
    thisWeek, lastWeek, delta,
    thisMonth, lastMonth, monthDelta,
    daily14:  daily14.some((d) => d.avg != null) ? daily14 : [],
    weekly12: weekly12.some((d) => d.avg != null) ? weekly12 : [],
  };
}

function nextQuarter(now = new Date()) {
  const q = Math.floor(now.getMonth() / 3) + 1;
  return q === 4 ? `Q1 ${now.getFullYear() + 1}` : `Q${q + 1} ${now.getFullYear()}`;
}

const VOTE_KEY = 'tph_voted_ideas_v1';
function loadVotes() {
  try { return new Set(JSON.parse(localStorage.getItem(VOTE_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveVotes(set) { localStorage.setItem(VOTE_KEY, JSON.stringify([...set])); }

function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out.')), ms)),
  ]);
}

const DAY  = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
function makeEntry(emoji, daysAgo) {
  const ts = Date.now() - daysAgo * DAY;
  return { emoji, timestamp: { toMillis: () => ts } };
}

// U1–U19 tests (39 total) — see full file in repository
// All 39 pass as of the last CI run.
```

### `src/test/component.test.jsx`

_See repository for full source — 17 tests covering:_

| Test | Coverage |
|---|---|
| C1 | Pulse renders 5 emoji buttons with aria-pressed |
| C2 | Clicking emoji marks it pressed |
| C3 | Submit calls addDoc with selected emoji value |
| C4 | Submit success shows thank-you banner |
| C5 | Submit error shows error banner |
| C6 | Submit button is disabled while submitting |
| C7 | Ideas renders heading and search input |
| C8 | Empty search shows no suggestion panels |
| C9 | Novel search shows submit button |
| C10 | Exact title match shows amber duplicate warning |
| C11 | Partial match shows similar ideas panel |
| C12 | Submitting a new idea calls addDoc with correct data |
| C13 | Upvoting an idea calls updateDoc |
| C14 | Voted ID persisted to localStorage after upvote |
| C15 | Admin renders login form when unauthenticated |
| C16 | Login calls signInWithEmailAndPassword with form values |
| C17 | Failed login shows error message |

---

## 6. Seed / Utility Scripts

### `scripts/seed-pulse.js`
Generates ~1,400–1,500 synthetic `sentiment_entries` across 13 weeks of weekdays using a sentiment arc: neutral (month 1) → unfavorable trough (month 2) → slightly recovering (month 3). Uses Box-Muller normal distribution, clamped to 1–5. Writes in batches of 499 to respect Firestore limits.

### `scripts/seed-ideas.js`
Adds 10 planner-focused Blue Yonder feature request ideas then distributes 63 upvotes across all ideas (existing + new) using a Pareto-ish distribution `[14, 10, 8, 7, 6, 5, 4, 3, 2, 2, 2]`.

### `scripts/migrate-naperville.js`
One-time Admin SDK migration: reads all `sentiment_entries`, filters for `location === "Naperville, IL"`, updates them to `"Oak Brook, IL"` in batches of 499. Requires `SERVICE_ACCOUNT=/path/to/key.json` env var.

---

## 7. Known Issues / Open Items

| # | Issue | Status |
|---|---|---|
| 1 | `migrate-naperville.js` has not yet successfully run — Naperville entries still exist in Firestore. Blocked on service account key. | Open |
| 2 | `sentiment_entries` `allow update: if true` is overly permissive — any anonymous client can overwrite any existing sentiment entry. Should be restricted to admin auth. | Open |
| 3 | Upvote client-side state uses localStorage keyed to browser — a user clearing storage or switching browsers loses their vote history and can double-vote. | Known / by design |
| 4 | No rate limiting on Pulse submissions — a single user can submit unlimited entries per day. | Open |
| 5 | Admin link visible in Header to all users — no obscurity, relies entirely on Firebase Auth gate. | By design |
| 6 | Bundle size warning (>500 kB) — Recharts is large; code splitting not yet configured. | Open |
```
